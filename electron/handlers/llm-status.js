// Puente del renderer hacia el diagnóstico de los backends LLM. Solo lectura:
// nada de acá cambia el routing ni toca las keys.
const { ipcMain } = require('electron');
const { getPreferenceOrder } = require('../llm/selector');
const { discoverKeySlots } = require('../llm/key-pool');
const { listConfiguredSlots, probeAllBackends } = require('../llm/probe');
const { aggregateUsage, getLogPath, readRecentUsage } = require('../llm/usage-log');

// Mismo mapeo de nombre → variable base que usa el selector. Se necesita para
// filtrar el orden a los backends que realmente tienen key cargada.
const ENV_BASES = {
  cerebras: 'CEREBRAS_API_KEY',
  github: 'GITHUB_TOKEN',
  mistral: 'MISTRAL_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
};

// availableBackends() del selector filtra sobre PREFERENCE_ORDER y por eso
// ignora el override de LLM_BACKEND. Acá se parte de getPreferenceOrder(), que
// sí lo respeta: la UI tiene que mostrar el orden que de verdad se va a usar.
function currentOrder() {
  const order = getPreferenceOrder().filter((name) => discoverKeySlots(ENV_BASES[name] || '').length > 0);
  const override = String(process.env.LLM_BACKEND || '').trim().toLowerCase();

  return {
    order,
    override: override && ENV_BASES[override] ? override : null,
    slots: listConfiguredSlots(),
  };
}

function registerLlmStatusHandlers() {
  ipcMain.handle('llm:probe-all', async (_event, { force = false } = {}) => {
    try {
      return { ok: true, results: await probeAllBackends({ force }) };
    } catch (error) {
      console.error('[llm-status] probe falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible probar los backends.' };
    }
  });

  // includeProbe apagado por defecto: un solo "Probar todas" mete 23 entradas y
  // sepultaría las llamadas reales en la tabla de uso.
  ipcMain.handle('llm:usage-stats', async (_event, { days = 7, includeProbe = false } = {}) => {
    try {
      const all = await readRecentUsage({ days });
      const entries = includeProbe ? all : all.filter((entry) => entry.task !== 'probe');

      return {
        ok: true,
        stats: aggregateUsage(entries),
        probeEntries: all.length - entries.length,
        logPath: getLogPath(),
        days,
      };
    } catch (error) {
      console.error('[llm-status] usage-stats falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible leer el log de uso.' };
    }
  });

  ipcMain.handle('llm:current-order', async () => {
    try {
      return { ok: true, ...currentOrder() };
    } catch (error) {
      console.error('[llm-status] current-order falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible leer el orden de preferencia.' };
    }
  });
}

module.exports = { currentOrder, registerLlmStatusHandlers };
