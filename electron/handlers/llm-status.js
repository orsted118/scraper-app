// Puente del renderer hacia el diagnóstico de los backends LLM. Solo lectura:
// nada de acá cambia el routing ni toca las keys.
const { ipcMain } = require('electron');
const { REGISTRY, getPreferenceOrder, isConfigured } = require('../llm/selector');
const { discoverKeySlots } = require('../llm/key-pool');
const { listConfiguredSlots, probeAllBackends } = require('../llm/probe');
const { aggregateUsage, getLogPath, readRecentUsage } = require('../llm/usage-log');

// Se deriva del registry en vez de listarse a mano: la copia manual dejaba los
// backends nuevos fuera del filtro y no aparecían en la UI.
const ENV_BASES = Object.fromEntries(
  Object.entries(REGISTRY).map(([name, entry]) => [name, entry.envBase]),
);

// Nombres para mostrar. El id técnico ("cloudflare") no le dice nada al usuario
// y el modelo real vive dentro del backend, así que se nombra el modelo.
const BACKEND_LABELS = {
  cloudflare: 'Llama 3.3 70B',
  gemini: 'Gemini 2.5 Flash',
  mistral: 'Mistral Small',
  groq: 'GPT-OSS 120B',
  openrouter: 'OpenRouter',
  scaleway: 'Scaleway',
  cerebras: 'Cerebras',
  github: 'GitHub Models',
};

// Lista para el selector de modelo de la UI. Sólo lo que se puede usar YA: un
// backend sin key no se ofrece, porque elegirlo daría un error garantizado.
function listSelectableBackends() {
  return getPreferenceOrder()
    .filter(isConfigured)
    .map((name, index) => {
      const slots = discoverKeySlots(ENV_BASES[name] || '');

      return {
        id: name,
        label: BACKEND_LABELS[name] || name,
        // El primero del orden es el que usa "Automático": la UI lo marca para
        // que se entienda qué pasa si no se elige nada.
        isDefault: index === 0,
        keyCount: slots.length,
      };
    });
}

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

  ipcMain.handle('llm:selectable-backends', async () => {
    try {
      return { ok: true, backends: listSelectableBackends() };
    } catch (error) {
      console.error('[llm-status] selectable-backends falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible listar los modelos.' };
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

module.exports = { BACKEND_LABELS, currentOrder, listSelectableBackends, registerLlmStatusHandlers };
