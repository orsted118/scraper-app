// Log de uso de los backends LLM en JSONL (una línea JSON por llamada).
// Formato de append-only para que escribir sea barato y leer sea tolerante:
// una línea corrupta no invalida el archivo entero.
//
// Nunca bloquea al que llama: logUsage() es fire-and-forget y se traga sus
// propios errores. Que falle el disco no puede tumbar una respuesta del modelo.
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILE_NAME = 'llm-usage.jsonl';
// Por encima de esto se rota. 10MB son ~60k llamadas: sobra para meses de uso.
const MAX_BYTES = 10 * 1024 * 1024;

let cachedLogPath = null;

// El log vive en userData cuando corre dentro de Electron. Desde Node pelado
// (scripts/llm-doctor.cjs) `require('electron')` devuelve la ruta al binario en
// vez del módulo, así que no hay app.getPath: ahí cae a un directorio propio en
// el home y no ensucia el log de la app.
function getLogPath() {
  if (cachedLogPath) return cachedLogPath;

  try {
    const electron = require('electron');
    if (typeof electron?.app?.getPath === 'function') {
      cachedLogPath = path.join(electron.app.getPath('userData'), FILE_NAME);
      return cachedLogPath;
    }
  } catch (_error) {
    // Sin Electron disponible: se usa el fallback de abajo.
  }

  cachedLogPath = path.join(os.homedir(), '.dvpotro-cli', FILE_NAME);
  return cachedLogPath;
}

function getRotatedPath() {
  return `${getLogPath()}.1`;
}

async function rotateIfNeeded() {
  const logPath = getLogPath();

  let stats;
  try {
    stats = await fs.promises.stat(logPath);
  } catch (_error) {
    return; // No existe todavía: nada que rotar.
  }

  if (stats.size < MAX_BYTES) return;

  const rotated = getRotatedPath();
  // Solo se guardan dos generaciones: el .1 anterior se pisa.
  await fs.promises.rm(rotated, { force: true });
  await fs.promises.rename(logPath, rotated);
}

// Las escrituras se encadenan: dos llamadas concurrentes podrían disparar la
// rotación a la vez y perder líneas entre el stat y el rename.
let writeChain = Promise.resolve();

function logUsage(entry) {
  const line = {
    ts: entry?.ts || new Date().toISOString(),
    handler: entry?.handler || 'unknown',
    task: entry?.task || 'unknown',
    backend: entry?.backend || null,
    keyEnvVar: entry?.keyEnvVar || null,
    keyIndex: entry?.keyIndex ?? null,
    success: Boolean(entry?.success),
    latencyMs: Number.isFinite(entry?.latencyMs) ? entry.latencyMs : null,
  };

  if (entry?.error) line.error = String(entry.error).slice(0, 400);
  if (entry?.model) line.model = entry.model;
  if (Number.isFinite(entry?.promptTokens)) line.promptTokens = entry.promptTokens;
  if (Number.isFinite(entry?.responseChars)) line.responseChars = entry.responseChars;

  writeChain = writeChain
    .then(async () => {
      await fs.promises.mkdir(path.dirname(getLogPath()), { recursive: true });
      await rotateIfNeeded();
      await fs.promises.appendFile(getLogPath(), `${JSON.stringify(line)}\n`, 'utf8');
    })
    .catch((error) => {
      console.error('[llm-usage] no se pudo escribir el log:', error?.message || error);
    });

  return line;
}

async function readFileLines(filePath) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return raw.split('\n');
  } catch (_error) {
    return [];
  }
}

async function readRecentUsage({ days = 7 } = {}) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  // El rotado primero: sus líneas son más viejas que las del archivo activo.
  const lines = [...(await readFileLines(getRotatedPath())), ...(await readFileLines(getLogPath()))];
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (_error) {
      continue; // Línea cortada por un cierre a mitad de escritura: se ignora.
    }

    const time = Date.parse(parsed?.ts);
    if (!Number.isFinite(time) || time < cutoff) continue;

    entries.push(parsed);
  }

  entries.sort((left, right) => Date.parse(left.ts) - Date.parse(right.ts));
  return entries;
}

// Percentil por el método del más cercano: con pocas muestras interpolar
// inventa valores que ningún request tuvo.
function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return null;
  const rank = Math.ceil(fraction * sortedValues.length) - 1;
  return sortedValues[Math.min(sortedValues.length - 1, Math.max(0, rank))];
}

function summarize(entries) {
  const total = entries.length;
  const successes = entries.filter((entry) => entry.success);
  // Latencias solo de los éxitos: un timeout de 30s no dice nada de lo que
  // tarda el backend cuando responde, y ensuciaría el P95 para routing.
  const latencies = successes
    .map((entry) => entry.latencyMs)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  const errors = {};
  for (const entry of entries) {
    if (entry.success || !entry.error) continue;
    const key = String(entry.error).slice(0, 120);
    errors[key] = (errors[key] || 0) + 1;
  }

  return {
    count: total,
    successCount: successes.length,
    successRate: total > 0 ? successes.length / total : 0,
    latencyP50: percentile(latencies, 0.5),
    latencyP95: percentile(latencies, 0.95),
    errors,
  };
}

function aggregateUsage(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const byBackendTask = {};
  const byBackend = {};
  const byHandlerTask = {};

  const push = (bucket, key, entry) => {
    if (!bucket[key]) bucket[key] = [];
    bucket[key].push(entry);
  };

  const rawBackendTask = {};
  const rawBackend = {};
  const rawHandlerTask = {};

  for (const entry of list) {
    const backend = entry.backend || 'desconocido';
    const task = entry.task || 'unknown';
    const handler = entry.handler || 'unknown';

    push(rawBackendTask, `${backend}::${task}`, entry);
    push(rawBackend, backend, entry);
    push(rawHandlerTask, `${handler}::${task}`, entry);
  }

  for (const [key, group] of Object.entries(rawBackendTask)) {
    const [backend, task] = key.split('::');
    byBackendTask[key] = { backend, task, ...summarize(group) };
  }

  for (const [backend, group] of Object.entries(rawBackend)) {
    byBackend[backend] = { backend, ...summarize(group) };
  }

  for (const [key, group] of Object.entries(rawHandlerTask)) {
    const [handler, task] = key.split('::');
    byHandlerTask[key] = { handler, task, ...summarize(group) };
  }

  return {
    byBackendTask,
    byBackend,
    byHandlerTask,
    totalEntries: list.length,
    range: {
      from: list.length > 0 ? list[0].ts : null,
      to: list.length > 0 ? list[list.length - 1].ts : null,
    },
  };
}

module.exports = {
  MAX_BYTES,
  aggregateUsage,
  getLogPath,
  getRotatedPath,
  logUsage,
  readRecentUsage,
};
