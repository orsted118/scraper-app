// Pool de claves de repuesto por variable de entorno base. Convención: si la
// base es "GEMINI_API_KEY", las adicionales van en "GEMINI_API_KEY2", "...3", etc.
// Portado del orquestador (src/core/key-pool/key-pool.ts) — misma semántica.

// 20: hay hasta 16 keys de Gemini en .env; con 10 no se leían todas.
const MAX_SLOTS = 20;
const DEFAULT_COOLDOWN_SECONDS = 90;

// Los cooldowns viven por proceso: el main de Electron es de vida larga, así que
// una key quemada sigue marcada entre llamadas sin persistir nada a disco.
const cooldowns = new Map();

// El descubrimiento se cachea porque process.env no cambia una vez cargado .env.
const slotsCache = new Map();

function discoverKeySlots(baseEnvVar) {
  const cached = slotsCache.get(baseEnvVar);
  if (cached) {
    return cached;
  }

  const slots = [];
  const base = process.env[baseEnvVar];

  if (base) {
    slots.push({ index: 1, envVar: baseEnvVar, key: base });
  }

  for (let i = 2; i <= MAX_SLOTS; i += 1) {
    const envVar = `${baseEnvVar}${i}`;
    const value = process.env[envVar];
    if (value) {
      slots.push({ index: i, envVar, key: value });
    }
  }

  slots.sort((left, right) => left.index - right.index);
  slotsCache.set(baseEnvVar, slots);

  return slots;
}

function poolSize(baseEnvVar) {
  return discoverKeySlots(baseEnvVar).length;
}

function cooldownUntil(slot) {
  return cooldowns.get(slot.envVar) || 0;
}

function isCoolingDown(slot) {
  return cooldownUntil(slot) > Date.now();
}

// Prioriza un slot sin cooldown. Si todos están quemados devuelve el que vence
// antes: reintentar el menos malo es mejor que no tener backend.
function pickAvailableSlot(slots, exclude = new Set()) {
  const usable = (slots || []).filter((slot) => !exclude.has(slot.envVar));

  if (usable.length === 0) {
    return null;
  }

  const fresh = usable.find((slot) => !isCoolingDown(slot));

  if (fresh) {
    return fresh;
  }

  return usable.reduce((best, slot) => (cooldownUntil(slot) < cooldownUntil(best) ? slot : best));
}

function markSlotCooldown(slot, seconds = DEFAULT_COOLDOWN_SECONDS) {
  if (!slot?.envVar) {
    return;
  }
  cooldowns.set(slot.envVar, Date.now() + seconds * 1000);
}

function resetKeyPool() {
  cooldowns.clear();
  slotsCache.clear();
}

module.exports = {
  DEFAULT_COOLDOWN_SECONDS,
  discoverKeySlots,
  isCoolingDown,
  markSlotCooldown,
  pickAvailableSlot,
  poolSize,
  resetKeyPool,
};
