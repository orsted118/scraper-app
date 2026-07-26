const { DEFAULT_COOLDOWN_SECONDS, markSlotCooldown } = require('./key-pool');
const { availableBackends, pickBackend } = require('./selector');

// Tope de proveedores distintos por llamada: sin esto, con las 16 keys de Gemini
// una consigna rota podría encadenar decenas de requests antes de rendirse.
const MAX_BACKENDS_PER_CALL = 3;
// Tope duro de requests, incluyendo los reintentos con otra key del mismo pool.
const MAX_REQUESTS_PER_CALL = 6;
// Una key revocada no se recupera en esta sesión: 24h la saca del juego sin
// borrarla del .env.
const KEY_FATAL_COOLDOWN_SECONDS = 24 * 60 * 60;

async function chat(messages, { task = 'extraction', jsonSchema = null, maxTokens = 2000, temperature = 0.2 } = {}) {
  const tried = new Set();
  const deadSlots = new Set();
  const failures = [];
  let requests = 0;

  while (tried.size < MAX_BACKENDS_PER_CALL && requests < MAX_REQUESTS_PER_CALL) {
    const picked = pickBackend(task, { exclude: tried, excludeSlots: deadSlots });

    if (!picked) {
      break;
    }

    requests += 1;

    try {
      return await picked.backend.chat(messages, { maxTokens, temperature, jsonSchema });
    } catch (error) {
      const message = error?.message || String(error);
      failures.push(`${picked.name}/${picked.slot.envVar}: ${message}`);

      // Key muerta: se descarta esa key y se reintenta el MISMO backend con otra
      // del pool. Sólo si no queda ninguna se pasa al siguiente proveedor.
      if (error?.keyFatal) {
        markSlotCooldown(picked.slot, KEY_FATAL_COOLDOWN_SECONDS);
        deadSlots.add(picked.slot.envVar);
        console.warn(`[llm] ${picked.name}: key ${picked.slot.envVar} rechazada, probando otra del pool.`);
        continue;
      }

      if (!error?.transient) {
        console.error(`[llm] ${picked.name} falló sin posibilidad de reintento:`, message);
        throw error;
      }

      const cooldown = error.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;
      markSlotCooldown(picked.slot, cooldown);
      tried.add(picked.name);
      console.warn(`[llm] ${picked.name} transitorio (${picked.slot.envVar} en cooldown ${cooldown}s): ${message}`);
    }
  }

  const configured = availableBackends();
  const detail = failures.length > 0 ? ` Intentos: ${failures.join(' | ')}` : '';

  if (configured.length === 0) {
    throw new Error(
      'No hay ningún backend LLM configurado. Agrega CEREBRAS_API_KEY, GITHUB_TOKEN, MISTRAL_API_KEY, GEMINI_API_KEY o GROQ_API_KEY al .env.',
    );
  }

  throw new Error(`Todos los backends LLM probados fallaron (${[...tried].join(', ')}).${detail}`);
}

// Igual que chat() pero garantiza JSON parseado. Los modelos free-tier a veces
// pegan texto después del objeto, así que se extrae el primer objeto balanceado.
async function chatJson(messages, opts = {}) {
  const response = await chat(messages, { ...opts, jsonSchema: opts.jsonSchema || true });

  try {
    return { data: JSON.parse(response.content), raw: response };
  } catch (_error) {
    const candidate = extractFirstJsonObject(response.content);

    if (candidate) {
      return { data: JSON.parse(candidate), raw: response };
    }

    throw new Error(`El modelo ${response.model} no devolvió JSON válido: ${response.content.slice(0, 200)}`);
  }
}

// Recorre respetando strings y escapes para no cortar en una llave dentro de
// un texto ("usa {llaves}").
function extractFirstJsonObject(text) {
  const start = String(text || '').indexOf('{');

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      if (inString) escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

module.exports = { availableBackends, chat, chatJson, extractFirstJsonObject };
