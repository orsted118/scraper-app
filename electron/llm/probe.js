// Health check de los backends: pega una request mínima contra cada key del
// .env y reporta cuál responde. Es diagnóstico puro — NO toca los cooldowns del
// key-pool, así que probar no saca keys de producción ni las revive.
const { discoverKeySlots, isCoolingDown } = require('./key-pool');
const { REGISTRY } = require('./selector');
const { logUsage } = require('./usage-log');

// El registro sale del selector en vez de duplicarse: cuando el registro estaba
// copiado acá, agregar un backend y olvidarse de esta copia dejaba al probe
// reportando "todo bien" sobre un proveedor que ni se probaba.

// El prompt más corto que igual ejercita el camino completo (auth, modelo,
// parseo).
//
// maxTokens 64 y no 5: gpt-oss-120b (el modelo de cerebras, que además es el
// primero del orden de preferencia) razona antes de contestar y se come el
// presupuesto en el reasoning. Medido: con 5, 16 y 32 devuelve contenido vacío
// y el backend queda marcado como caído aunque en producción responda perfecto;
// con 64 contesta "OK" gastando 112 tokens. Un health check que miente sobre el
// backend principal es peor que no tenerlo.
const PROBE_MESSAGES = [{ role: 'user', content: 'Reply with just: OK' }];
const PROBE_OPTS = { maxTokens: 64, temperature: 0 };

// Ventana de cache. Suficiente para que abrir Ajustes dos veces seguidas no
// dispare 20 requests, y corta para que "Probar todas" siga siendo útil.
const CACHE_TTL_MS = 30 * 1000;

let cache = { at: 0, results: null };

async function probeSlot(backendName, slot, { skipLog = false } = {}) {
  const entry = REGISTRY[backendName];
  const base = {
    backend: backendName,
    keyEnvVar: slot.envVar,
    keyIndex: slot.index,
    coolingDown: isCoolingDown(slot),
  };

  if (!entry) {
    return { ...base, ok: false, latencyMs: null, error: `Backend desconocido: ${backendName}` };
  }

  if (entry.ready && !entry.ready()) {
    return { ...base, ok: false, latencyMs: null, error: `${backendName}: falta configuración además de la key (revisá el .env).` };
  }

  const startedAt = Date.now();

  try {
    const backend = new entry.Backend(slot);
    const response = await backend.chat(PROBE_MESSAGES, PROBE_OPTS);
    const latencyMs = Date.now() - startedAt;

    if (!skipLog) {
      logUsage({ handler: 'probe', task: 'probe', backend: backendName, keyEnvVar: slot.envVar, keyIndex: slot.index, success: true, latencyMs, model: response?.model });
    }

    return { ...base, ok: true, latencyMs, model: response?.model || entry.Backend.name, sample: String(response?.content || '').slice(0, 40) };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error?.message || String(error);

    if (!skipLog) {
      logUsage({ handler: 'probe', task: 'probe', backend: backendName, keyEnvVar: slot.envVar, keyIndex: slot.index, success: false, latencyMs, error: message });
    }

    return { ...base, ok: false, latencyMs, error: message, transient: Boolean(error?.transient), keyFatal: Boolean(error?.keyFatal) };
  }
}

// Corre `tasks` de a `limit` a la vez. Varios proveedores limitan por segundo:
// disparar 20 requests juntas se auto-inflige 429s y el diagnóstico mentiría.
async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await tasks[index]();
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker));
  return results;
}

function listSlots() {
  const out = [];

  for (const [name, entry] of Object.entries(REGISTRY)) {
    // Un backend puede tener key y aun así estar incompleto (cloudflare sin
    // account id). Se lista igual para que la UI lo muestre, con la razón.
    const missingConfig = entry.ready && !entry.ready();

    for (const slot of discoverKeySlots(entry.envBase)) {
      out.push({ name, slot, missingConfig });
    }
  }

  return out;
}

function getCachedProbe() {
  if (!cache.results || Date.now() - cache.at >= CACHE_TTL_MS) return null;
  return cache.results;
}

async function probeAllBackends({ parallel = 3, force = false, skipLog = false, onProgress = null } = {}) {
  if (!force) {
    const cached = getCachedProbe();
    if (cached) return cached;
  }

  const entries = listSlots();
  let done = 0;

  const tasks = entries.map(({ name, slot }) => async () => {
    const result = await probeSlot(name, slot, { skipLog });
    done += 1;
    if (onProgress) onProgress({ done, total: entries.length, last: result });
    return result;
  });

  const results = await runWithConcurrency(tasks, parallel);

  cache = { at: Date.now(), results };
  return results;
}

// Cuántas keys hay por backend sin gastar una sola request. Sirve para que la
// UI dibuje la lista antes de que termine el probe.
function listConfiguredSlots() {
  return listSlots().map(({ name, slot, missingConfig }) => ({
    backend: name,
    keyEnvVar: slot.envVar,
    keyIndex: slot.index,
    coolingDown: isCoolingDown(slot),
    missingConfig: Boolean(missingConfig),
  }));
}

module.exports = {
  CACHE_TTL_MS,
  getCachedProbe,
  listConfiguredSlots,
  probeAllBackends,
  probeSlot,
};
