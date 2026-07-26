const { CerebrasBackend, ENV_BASE: CEREBRAS_ENV } = require('./backends/cerebras-backend');
const { GitHubBackend, ENV_BASE: GITHUB_ENV } = require('./backends/github-backend');
const { MistralBackend, ENV_BASE: MISTRAL_ENV } = require('./backends/mistral-backend');
const { GeminiBackend, ENV_BASE: GEMINI_ENV } = require('./backends/gemini-backend');
const { GroqBackend, ENV_BASE: GROQ_ENV } = require('./backends/groq-backend');
const { discoverKeySlots, pickAvailableSlot } = require('./key-pool');

// Orden fijo para extraction y verification. Groq va último a propósito: en uso
// real dio cuelgues, TPM restrictivo y respuestas cortadas.
const PREFERENCE_ORDER = ['cerebras', 'github', 'mistral', 'gemini', 'groq'];

const REGISTRY = {
  cerebras: { envBase: CEREBRAS_ENV, Backend: CerebrasBackend },
  github: { envBase: GITHUB_ENV, Backend: GitHubBackend },
  mistral: { envBase: MISTRAL_ENV, Backend: MistralBackend },
  gemini: { envBase: GEMINI_ENV, Backend: GeminiBackend },
  groq: { envBase: GROQ_ENV, Backend: GroqBackend },
};

function getPreferenceOrder() {
  const override = String(process.env.LLM_BACKEND || '').trim().toLowerCase();

  if (!override) {
    return PREFERENCE_ORDER;
  }

  if (!REGISTRY[override]) {
    console.warn(`[llm] LLM_BACKEND="${override}" no es un backend conocido; se usa el orden default.`);
    return PREFERENCE_ORDER;
  }

  if (discoverKeySlots(REGISTRY[override].envBase).length === 0) {
    console.warn(`[llm] LLM_BACKEND="${override}" no tiene key configurada; se usa el orden default.`);
    return PREFERENCE_ORDER;
  }

  // El override manda: se prueba primero y el resto queda de red de seguridad.
  return [override, ...PREFERENCE_ORDER.filter((name) => name !== override)];
}

// Devuelve una instancia lista para .chat(), saltando los proveedores sin key y
// los ya intentados en esta llamada. excludeSlots descarta keys puntuales ya
// quemadas dentro del mismo pool.
function pickBackend(taskType, { exclude = new Set(), excludeSlots = new Set() } = {}) {
  for (const name of getPreferenceOrder()) {
    if (exclude.has(name)) {
      continue;
    }

    const entry = REGISTRY[name];
    const slots = discoverKeySlots(entry.envBase);

    if (slots.length === 0) {
      continue;
    }

    const slot = pickAvailableSlot(slots, excludeSlots);

    if (!slot) {
      continue;
    }

    const backend = new entry.Backend(slot);
    console.log(`[llm] backend: ${name} (${slot.envVar}, modelo ${backend.model}, task ${taskType})`);

    return { name, backend, slot };
  }

  return null;
}

function availableBackends() {
  return PREFERENCE_ORDER.filter((name) => discoverKeySlots(REGISTRY[name].envBase).length > 0);
}

module.exports = { PREFERENCE_ORDER, availableBackends, getPreferenceOrder, pickBackend };
