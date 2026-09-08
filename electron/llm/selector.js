const { CerebrasBackend, ENV_BASE: CEREBRAS_ENV } = require('./backends/cerebras-backend');
const { CloudflareBackend, ENV_BASE: CLOUDFLARE_ENV, isReady: cloudflareReady } = require('./backends/cloudflare-backend');
const { GitHubBackend, ENV_BASE: GITHUB_ENV } = require('./backends/github-backend');
const { MistralBackend, ENV_BASE: MISTRAL_ENV } = require('./backends/mistral-backend');
const { GeminiBackend, ENV_BASE: GEMINI_ENV } = require('./backends/gemini-backend');
const { GroqBackend, ENV_BASE: GROQ_ENV } = require('./backends/groq-backend');
const { OpenRouterBackend, ENV_BASE: OPENROUTER_ENV } = require('./backends/openrouter-backend');
const { ScalewayBackend, ENV_BASE: SCALEWAY_ENV } = require('./backends/scaleway-backend');
const { discoverKeySlots, pickAvailableSlot } = require('./key-pool');

// Orden por disponibilidad medida, no por calidad del modelo: el primero que
// conteste gana.
//
// Cloudflare va primero aunque gemini tenga más keys: su free tier se mide en
// neurons/día (miles de mejoras de nota) contra las 20 requests/día por key de
// gemini, y contestó en ~1s en todas las corridas. Gemini va segundo como pool
// de respaldo grande, pero sus keys se cuelgan seguido cuando están cerca de la
// cuota — ponerlo primero costaba 60s de espera antes de relevar.
//
// mistral y groq son los respaldos rápidos siguientes. openrouter y scaleway
// comparten cuota con otros usuarios y devuelven 429 seguido, así que cierran la
// fila. cerebras y github quedan registrados sin key: se saltean solos hasta que
// alguien vuelva a cargarlas.
const PREFERENCE_ORDER = [
  'cloudflare',
  'gemini',
  'mistral',
  'groq',
  'openrouter',
  'scaleway',
  'cerebras',
  'github',
];

const REGISTRY = {
  gemini: { envBase: GEMINI_ENV, Backend: GeminiBackend },
  cloudflare: { envBase: CLOUDFLARE_ENV, Backend: CloudflareBackend, ready: cloudflareReady },
  mistral: { envBase: MISTRAL_ENV, Backend: MistralBackend },
  groq: { envBase: GROQ_ENV, Backend: GroqBackend },
  openrouter: { envBase: OPENROUTER_ENV, Backend: OpenRouterBackend },
  scaleway: { envBase: SCALEWAY_ENV, Backend: ScalewayBackend },
  cerebras: { envBase: CEREBRAS_ENV, Backend: CerebrasBackend },
  github: { envBase: GITHUB_ENV, Backend: GitHubBackend },
};

// Un backend puede necesitar más que su key (cloudflare también pide el account
// id). Sin esto se ofrecería y cada intento se gastaría en un 404.
function isConfigured(name) {
  const entry = REGISTRY[name];

  if (!entry || discoverKeySlots(entry.envBase).length === 0) {
    return false;
  }

  return entry.ready ? entry.ready() : true;
}

function getPreferenceOrder() {
  const override = String(process.env.LLM_BACKEND || '').trim().toLowerCase();

  if (!override) {
    return PREFERENCE_ORDER;
  }

  if (!REGISTRY[override]) {
    console.warn(`[llm] LLM_BACKEND="${override}" no es un backend conocido; se usa el orden default.`);
    return PREFERENCE_ORDER;
  }

  if (!isConfigured(override)) {
    console.warn(`[llm] LLM_BACKEND="${override}" no tiene key configurada; se usa el orden default.`);
    return PREFERENCE_ORDER;
  }

  // El override manda: se prueba primero y el resto queda de red de seguridad.
  return [override, ...PREFERENCE_ORDER.filter((name) => name !== override)];
}

// Devuelve una instancia lista para .chat(), saltando los proveedores sin key y
// los ya intentados en esta llamada. excludeSlots descarta keys puntuales ya
// quemadas dentro del mismo pool.
// `only` fuerza un backend puntual (el usuario lo eligió a mano en la UI). No
// es lo mismo que LLM_BACKEND: ese reordena y deja al resto de red de
// seguridad, éste limita la búsqueda a uno solo. Si se queda sin keys, la
// llamada falla en vez de mejorar la nota con un modelo que no se pidió.
function pickBackend(taskType, { exclude = new Set(), excludeSlots = new Set(), only = null } = {}) {
  const candidates = only ? [only] : getPreferenceOrder();

  for (const name of candidates) {
    if (exclude.has(name) || !isConfigured(name)) {
      continue;
    }

    const slot = pickAvailableSlot(discoverKeySlots(REGISTRY[name].envBase), excludeSlots);

    if (!slot) {
      continue;
    }

    const backend = new REGISTRY[name].Backend(slot);
    console.log(`[llm] backend: ${name} (${slot.envVar}, modelo ${backend.model}, task ${taskType})`);

    return { name, backend, slot };
  }

  return null;
}

function availableBackends() {
  return PREFERENCE_ORDER.filter(isConfigured);
}

module.exports = { PREFERENCE_ORDER, REGISTRY, availableBackends, getPreferenceOrder, isConfigured, pickBackend };
