// Contrato común de los backends LLM. Cada proveedor implementa chat() y
// devuelve siempre la misma forma, así el selector puede rotar sin conocerlos.
//
//   chat(messages, opts) -> { content, tokensUsed, model }
//   messages: [{ role: 'system'|'user'|'assistant', content }]
//   opts: { maxTokens, temperature, jsonSchema }
//
// Los errores recuperables (cuota, saturación, rate limit) se lanzan con
// .transient = true para que el selector rote de key o de backend en vez de
// abortar la operación entera.

// Mismo criterio que el orquestador: 413 queda afuera a propósito porque es un
// error estructural de tamaño de request, no una falla transitoria del proveedor.
const TRANSIENT_ERROR_RE =
  /\b(429|503)\b|quota|rate.?limit|tokens? per (minute|day)|overloaded|resource.?exhausted|too many requests|model is saturated|try again later|UNAVAILABLE|timeout|aborted/i;

const REQUEST_TIMEOUT_MS = 90 * 1000;

function isTransientMessage(message) {
  return TRANSIENT_ERROR_RE.test(String(message || ''));
}

// Los proveedores sugieren la espera en el cuerpo del error ("Please retry in
// 54.32s"). Respetarla evita quemar la key reintentando antes de tiempo.
function parseSuggestedRetrySeconds(message) {
  const match = String(message || '').match(
    /retry(?:\s+in|\s+after)?\s+(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?\b/i,
  );

  if (!match) {
    return null;
  }

  const seconds = Math.ceil(parseFloat(match[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function transientError(message, cooldownSeconds = null) {
  const error = new Error(message);
  error.transient = true;
  if (cooldownSeconds !== null) {
    error.cooldownSeconds = cooldownSeconds;
  }
  return error;
}

function classifyError(providerName, status, bodyText) {
  const message = `[${providerName}] HTTP ${status}: ${String(bodyText).slice(0, 400)}`;

  // 401/403 no es culpa del proveedor sino de ESA key (revocada, proyecto
  // bloqueado). El resto del pool puede estar sano, así que se marca la key como
  // muerta y se rota dentro del mismo backend en vez de descartarlo entero.
  if (status === 401 || status === 403) {
    const error = new Error(message);
    error.keyFatal = true;
    return error;
  }

  if (status === 429 || status === 503 || isTransientMessage(bodyText) || isTransientMessage(String(status))) {
    return transientError(message, parseSuggestedRetrySeconds(bodyText));
  }

  return new Error(message);
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    // Un abort por timeout es transitorio: el proveedor puede estar saturado.
    if (error?.name === 'AbortError') {
      throw transientError(`[${options?.providerName || 'llm'}] timeout tras ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Los modelos free-tier a veces envuelven el JSON en ```json ... ```.
function stripCodeFence(text) {
  const trimmed = String(text || '').trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const lines = trimmed.split('\n');
  if (lines[0].startsWith('```')) lines.shift();
  if (lines[lines.length - 1]?.startsWith('```')) lines.pop();

  return lines.join('\n').trim();
}

class LlmBackendBase {
  constructor({ providerName, model, slot }) {
    this.providerName = providerName;
    this.model = model;
    this.slot = slot || null;
  }

  // eslint-disable-next-line no-unused-vars
  async chat(_messages, _opts) {
    throw new Error(`${this.providerName}: chat() no implementado.`);
  }
}

// Cerebras, Mistral, Groq y GitHub Models hablan el mismo dialecto
// (POST /chat/completions con Bearer). Sólo cambian URL, modelo y headers.
class OpenAICompatibleBackend extends LlmBackendBase {
  constructor({ providerName, model, slot, url, extraHeaders = {} }) {
    super({ providerName, model, slot });
    this.url = url;
    this.extraHeaders = extraHeaders;
  }

  buildBody(messages, { maxTokens, temperature, jsonSchema }) {
    const body = {
      model: this.model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    if (jsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    return body;
  }

  async chat(messages, opts = {}) {
    const { maxTokens = 2000, temperature = 0.2, jsonSchema = null } = opts;

    const response = await fetchWithTimeout(this.url, {
      method: 'POST',
      providerName: this.providerName,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.slot.key}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify(this.buildBody(messages, { maxTokens, temperature, jsonSchema })),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw this.classifyHttpError(response.status, errorText);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      // Respuesta vacía sin error HTTP: pasa con modelos saturados. Transitorio
      // para que el selector rote en vez de devolverle basura al usuario.
      throw transientError(`[${this.providerName}] respuesta vacía del modelo.`);
    }

    return {
      content: stripCodeFence(content),
      tokensUsed: data?.usage?.total_tokens || 0,
      model: data?.model || this.model,
    };
  }

  classifyHttpError(status, bodyText) {
    return classifyError(this.providerName, status, bodyText);
  }
}

module.exports = {
  LlmBackendBase,
  OpenAICompatibleBackend,
  classifyError,
  fetchWithTimeout,
  isTransientMessage,
  parseSuggestedRetrySeconds,
  stripCodeFence,
  transientError,
};
