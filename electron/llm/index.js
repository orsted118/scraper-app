const { DEFAULT_COOLDOWN_SECONDS, markSlotCooldown } = require('./key-pool');
const { availableBackends, isConfigured, pickBackend } = require('./selector');
const { logUsage } = require('./usage-log');

// Cuántas keys del MISMO proveedor se queman antes de pasar al siguiente. Sin
// este tope, un día en que Gemini está sin cuota gastaría sus 9 keys en 429s y
// nunca llegaría a Cloudflare: el pool grande de un proveedor se comería el
// presupuesto de toda la llamada.
const MAX_KEY_ATTEMPTS_PER_BACKEND = 3;
// Techo de tiempo que un solo proveedor puede consumir antes de que se lo releve,
// aunque le queden keys por probar. El tope por cantidad no alcanza: dos keys de
// gemini colgadas se comían 60s de los 75 antes de llegar a cloudflare, que
// contesta en 1s. Con esto, un proveedor lento cuesta un intento largo, no toda
// la llamada.
const MAX_BACKEND_BUDGET_MS = 35 * 1000;
// Tope duro de requests de la llamada entera, sumando rotaciones de key y de
// proveedor. Con 8 proveedores registrados alcanza para recorrer varios sin
// convertir un mal día en cientos de requests.
const MAX_REQUESTS_PER_CALL = 12;
// Techo de tiempo de pared. Es lo que impide que la UI quede colgada: aunque
// queden proveedores por probar, la llamada corta acá y devuelve un error que
// el handler puede traducir a un mensaje.
const TOTAL_BUDGET_MS = Number(process.env.LLM_TOTAL_BUDGET_MS) || 75 * 1000;
// Una key revocada no se recupera en esta sesión: 24h la saca del juego sin
// borrarla del .env.
const KEY_FATAL_COOLDOWN_SECONDS = 24 * 60 * 60;
// Un proveedor que falla por configuración (modelo retirado, endpoint mal) no se
// arregla reintentando dentro de la misma llamada, pero puede volver si el
// usuario cambia el modelo por env. 10 min lo saca sin enterrarlo.
const BACKEND_FATAL_COOLDOWN_SECONDS = 10 * 60;

// Cada intento se registra en el JSONL, exitoso o no. Va envuelto porque el log
// es diagnóstico: si falla, la llamada al modelo tiene que seguir su curso.
function record(picked, task, handler, extra) {
  try {
    logUsage({
      handler,
      task,
      backend: picked.name,
      keyEnvVar: picked.slot.envVar,
      keyIndex: picked.slot.index,
      ...extra,
    });
  } catch (error) {
    console.error('[llm] no se pudo registrar el uso:', error?.message || error);
  }
}

async function chat(messages, { task = 'extraction', jsonSchema = null, maxTokens = 2000, temperature = 0.2, handler = 'unknown', backend = null } = {}) {
  // Backend elegido a mano en la UI. Se valida acá y no en el selector para que
  // el error diga qué pasó: pedir un backend sin key es distinto de que fallen
  // todos, y la UI muestra copy distinto.
  const forced = backend ? String(backend).trim().toLowerCase() : null;

  if (forced && !isConfigured(forced)) {
    throw new Error(`El backend "${forced}" no está configurado. Elegí otro modelo o agregá su key al .env.`);
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  // Proveedores descartados para esta llamada; keys quemadas para esta llamada.
  // Van separados porque agotar una key no descarta al proveedor: primero se
  // rota dentro de su pool.
  const exhaustedBackends = new Set();
  const burnedSlots = new Set();
  const keyAttempts = new Map();
  const backendElapsed = new Map();
  const failures = [];
  let requests = 0;
  let ranOutOfTime = false;

  while (requests < MAX_REQUESTS_PER_CALL) {
    const remainingMs = deadline - Date.now();

    // Sin tiempo para un intento completo no vale la pena empezarlo: colgaría
    // la UI para devolver el mismo error igual.
    if (remainingMs <= 1000) {
      ranOutOfTime = true;
      break;
    }

    const picked = pickBackend(task, { exclude: exhaustedBackends, excludeSlots: burnedSlots, only: forced });

    if (!picked) {
      break;
    }

    requests += 1;
    const startedAt = Date.now();
    const backendRemainingMs = MAX_BACKEND_BUDGET_MS - (backendElapsed.get(picked.name) || 0);

    try {
      // El intento no puede pasarse ni de lo que le queda al proveedor ni de lo
      // que le queda a la llamada entera.
      const response = await picked.backend.chat(messages, {
        maxTokens,
        temperature,
        jsonSchema,
        timeoutMs: Math.min(remainingMs, backendRemainingMs),
      });

      record(picked, task, handler, {
        success: true,
        latencyMs: Date.now() - startedAt,
        model: response?.model,
        promptTokens: response?.tokensUsed,
        responseChars: response?.content?.length,
      });

      return response;
    } catch (error) {
      const message = error?.message || String(error);
      const latencyMs = Date.now() - startedAt;
      failures.push(`${picked.name}/${picked.slot.envVar}: ${message}`);
      record(picked, task, handler, { success: false, latencyMs, error: message });

      const attempts = (keyAttempts.get(picked.name) || 0) + 1;
      keyAttempts.set(picked.name, attempts);
      const spent = (backendElapsed.get(picked.name) || 0) + latencyMs;
      backendElapsed.set(picked.name, spent);

      // Un error que no es de la key (modelo retirado, endpoint inválido) no se
      // arregla rotando dentro del pool: se descarta el proveedor entero y se
      // sigue con el siguiente. Antes esto abortaba la llamada completa, así que
      // un solo proveedor mal configurado dejaba sin IA a toda la app.
      if (!error?.transient && !error?.keyFatal) {
        markSlotCooldown(picked.slot, BACKEND_FATAL_COOLDOWN_SECONDS);
        exhaustedBackends.add(picked.name);
        console.error(`[llm] ${picked.name} descartado para esta llamada:`, message);
        continue;
      }

      // Key muerta o agotada: se saca esa key y se reintenta el MISMO proveedor
      // con otra de su pool, hasta el tope. Recién ahí se pasa al siguiente.
      const cooldown = error?.keyFatal
        ? KEY_FATAL_COOLDOWN_SECONDS
        : error.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;

      markSlotCooldown(picked.slot, cooldown);
      burnedSlots.add(picked.slot.envVar);

      if (attempts >= MAX_KEY_ATTEMPTS_PER_BACKEND || spent >= MAX_BACKEND_BUDGET_MS) {
        exhaustedBackends.add(picked.name);
        console.warn(`[llm] ${picked.name}: ${attempts} keys quemadas en ${spent}ms, se pasa al siguiente backend.`);
        continue;
      }

      console.warn(`[llm] ${picked.name}: ${picked.slot.envVar} en cooldown ${cooldown}s, probando otra key. (${message})`);
    }
  }

  const configured = availableBackends();

  // Los handlers distinguen estos dos casos por el prefijo del mensaje para
  // elegir el copy que ve el usuario. No cambiar sin actualizarlos.
  if (configured.length === 0) {
    throw new Error(
      'No hay ningún backend LLM configurado. Agrega GEMINI_API_KEY, CLOUDFLARE_API_KEY, MISTRAL_API_KEY, GROQ_API_KEY u OPENROUTER_API_KEY al .env.',
    );
  }

  const detail = failures.length > 0 ? ` Intentos: ${failures.join(' | ')}` : '';
  const reason = ranOutOfTime ? ` Se agotó el presupuesto de ${TOTAL_BUDGET_MS / 1000}s.` : '';

  // Con un backend forzado no hubo failover: decirlo con el nombre evita que el
  // usuario crea que se quedó sin IA cuando sólo se agotó el modelo que eligió.
  if (forced) {
    throw new Error(`El backend "${forced}" no respondió y era el único permitido.${reason}${detail}`);
  }

  throw new Error(`Todos los backends LLM probados fallaron (${[...keyAttempts.keys()].join(', ')}).${reason}${detail}`);
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

module.exports = {
  MAX_KEY_ATTEMPTS_PER_BACKEND,
  MAX_REQUESTS_PER_CALL,
  TOTAL_BUDGET_MS,
  availableBackends,
  chat,
  chatJson,
  extractFirstJsonObject,
};
