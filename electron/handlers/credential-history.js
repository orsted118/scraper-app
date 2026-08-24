// Historial de credenciales por portal: alimenta el autocompletado del campo
// de usuario en Ajustes.
//
// Vive en el main y no en localStorage por dos razones. Primero, las
// contraseñas se cifran con safeStorage (DPAPI en Windows, ligado a la cuenta
// del sistema operativo); el LevelDB del renderer es texto plano en disco.
// Segundo, la "Zona de riesgo" borra credenciales llamando a clearCredentials
// del main — si el historial viviera del otro lado del puente, ese botón
// dejaría copias atrás y mentiría.
const fs = require('fs');
const path = require('path');
const { app, ipcMain, safeStorage } = require('electron');

const MAX_ENTRIES_PER_PORTAL = 10;
const PORTALS = new Set(['ivirtual', 'cia']);

function getHistoryPath() {
  return path.join(app.getPath('userData'), 'credential-history.json');
}

// Misma cola que el resto de los handlers con estado en disco: un guardado y un
// borrado concurrentes leerían el mismo JSON y el segundo pisaría al primero.
let writeQueue = Promise.resolve();

function withLock(operation) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => {});
  return result;
}

function readHistory() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getHistoryPath(), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error('[credential-history] Error leyendo historial:', error?.message || error);
    }
    return {};
  }
}

// Escritura atómica: un kill a mitad de writeFileSync deja el JSON truncado y
// el próximo readHistory lo descarta entero, perdiendo el historial completo.
function writeHistory(history) {
  const target = getHistoryPath();
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(history, null, 2), 'utf8');
  fs.renameSync(temp, target);
}

function normalizePortal(portal) {
  return PORTALS.has(portal) ? portal : 'ivirtual';
}

function encryptPassword(password) {
  if (!password || !safeStorage.isEncryptionAvailable()) {
    return '';
  }

  return safeStorage.encryptString(password).toString('base64');
}

function decryptPassword(encrypted) {
  if (!encrypted || !safeStorage.isEncryptionAvailable()) {
    return '';
  }

  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch (error) {
    // Cifrado de otra máquina o de otra cuenta de Windows: DPAPI no lo abre.
    console.error('[credential-history] No fue posible descifrar:', error?.message || error);
    return '';
  }
}

// Nunca devuelve contraseñas: el renderer solo necesita saber qué usuarios hay
// y cuáles tienen contraseña guardada para pintar la lista.
function listEntries(portal) {
  const entries = readHistory()[normalizePortal(portal)] || [];

  return entries.map((entry) => ({
    user: entry.user,
    savedAt: entry.savedAt,
    hasPassword: Boolean(entry.password),
  }));
}

function getPassword(portal, user) {
  const normalizedUser = typeof user === 'string' ? user.trim() : '';

  if (!normalizedUser) {
    return '';
  }

  const entries = readHistory()[normalizePortal(portal)] || [];
  const entry = entries.find((item) => item.user === normalizedUser);

  return decryptPassword(entry?.password);
}

function saveEntry({ portal, user, password } = {}) {
  const normalizedPortal = normalizePortal(portal);
  const normalizedUser = typeof user === 'string' ? user.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!normalizedUser) {
    return { success: false, error: 'Usuario vacío.' };
  }

  return withLock(async () => {
    const history = readHistory();
    const entries = history[normalizedPortal] || [];
    const previous = entries.find((item) => item.user === normalizedUser);
    // Un guardado sin contraseña (el usuario solo cambió el ID) no debe borrar
    // la que ya estaba cifrada para ese mismo usuario.
    const encrypted = normalizedPassword
      ? encryptPassword(normalizedPassword)
      : previous?.password || '';

    history[normalizedPortal] = [
      { user: normalizedUser, password: encrypted, savedAt: new Date().toISOString() },
      ...entries.filter((item) => item.user !== normalizedUser),
    ].slice(0, MAX_ENTRIES_PER_PORTAL);

    try {
      writeHistory(history);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'No fue posible guardar el historial.',
      };
    }
  });
}

function clearHistory() {
  return withLock(async () => {
    try {
      fs.rmSync(getHistoryPath(), { force: true });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'No fue posible borrar el historial.',
      };
    }
  });
}

// Las credenciales que ya estaban en .env antes de que existiera el historial
// no aparecerían en el autocompletado hasta el próximo guardado manual. Se
// siembran una vez al arranque para que la lista sirva desde el día uno.
function seedFromEnv() {
  const history = readHistory();
  const seeds = [
    { portal: 'ivirtual', user: process.env.IVIRTUAL_USER, password: process.env.IVIRTUAL_PASS },
    { portal: 'cia', user: process.env.CIA_USER, password: process.env.CIA_PASS },
  ];

  for (const seed of seeds) {
    if (!seed.user || (history[seed.portal] || []).length > 0) {
      continue;
    }

    saveEntry(seed);
  }
}

function registerCredentialHistoryHandlers() {
  ipcMain.handle('credential-history:list', async (_event, portal) => listEntries(portal));
  ipcMain.handle('credential-history:get-password', async (_event, payload) =>
    getPassword(payload?.portal, payload?.user),
  );
  ipcMain.handle('credential-history:save', async (_event, payload) => saveEntry(payload || {}));
  ipcMain.handle('credential-history:clear', async () => clearHistory());

  seedFromEnv();
}

module.exports = {
  clearHistory,
  seedFromEnv,
  getPassword,
  listEntries,
  registerCredentialHistoryHandlers,
  saveEntry,
};
