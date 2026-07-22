const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

function getEnvFilePath() {
  const isDev = !app.isPackaged;
  return isDev
    ? path.resolve(__dirname, '..', '..', '.env')
    : path.join(app.getPath('userData'), '.env');
}

function readEnvLines() {
  const envPath = getEnvFilePath();

  if (!fs.existsSync(envPath)) {
    return [];
  }

  return fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
}

function getSettings() {
  return {
    user: process.env.IVIRTUAL_USER || '',
    hasPassword: Boolean(process.env.IVIRTUAL_PASS),
    ciaUser: process.env.CIA_USER || '',
    hasCIAPassword: Boolean(process.env.CIA_PASS),
    notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
    studentName: process.env.STUDENT_NAME || '',
    appVersion: app.getVersion(),
  };
}

function upsertEnvValue(lines, key, value) {
  const nextLine = `${key}=${value}`;
  const lineIndex = lines.findIndex((line) => line.startsWith(`${key}=`));

  if (lineIndex >= 0) {
    lines[lineIndex] = nextLine;
    return lines;
  }

  return [...lines, nextLine];
}

function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore }) {
  try {
    const normalizedUser = typeof user === 'string' ? user.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password.trim() : '';
    const normalizedCIAUser = typeof ciaUser === 'string' ? ciaUser.trim() : '';
    const normalizedCIAPassword = typeof ciaPassword === 'string' ? ciaPassword.trim() : '';
    const normalizedNotifMinutes = Number(notifMinutesBefore);

    if (!normalizedUser) {
      return { success: false, error: 'El ID de usuario es requerido.' };
    }

    if (!normalizedCIAUser) {
      return { success: false, error: 'El Usuario CIA es requerido.' };
    }

    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
    envLines = upsertEnvValue(envLines, 'IVIRTUAL_USER', normalizedUser);
    envLines = upsertEnvValue(envLines, 'CIA_USER', normalizedCIAUser);

    if (Number.isFinite(normalizedNotifMinutes) && normalizedNotifMinutes > 0) {
      envLines = upsertEnvValue(
        envLines,
        'NOTIF_MINUTES_BEFORE',
        String(Math.round(normalizedNotifMinutes)),
      );
      process.env.NOTIF_MINUTES_BEFORE = String(Math.round(normalizedNotifMinutes));
    }

    if (normalizedPassword.trim()) {
      envLines = upsertEnvValue(envLines, 'IVIRTUAL_PASS', normalizedPassword);
      process.env.IVIRTUAL_PASS = normalizedPassword;
    }

    if (normalizedCIAPassword.trim()) {
      envLines = upsertEnvValue(envLines, 'CIA_PASS', normalizedCIAPassword);
      process.env.CIA_PASS = normalizedCIAPassword;
    }

    const envPath = getEnvFilePath();
    const envContents = `${envLines.join('\n')}\n`;

    fs.writeFileSync(envPath, envContents, 'utf8');
    process.env.IVIRTUAL_USER = normalizedUser;
    process.env.CIA_USER = normalizedCIAUser;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'No fue posible guardar las credenciales.',
    };
  }
}

async function saveStudentName(name) {
  try {
    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';

    if (!normalizedName) {
      return { success: false, error: 'Nombre de estudiante vacío.' };
    }

    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);

    const envPath = getEnvFilePath();
    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
    process.env.STUDENT_NAME = normalizedName;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
    };
  }
}

const CREDENTIAL_ENV_KEYS = ['IVIRTUAL_USER', 'IVIRTUAL_PASS', 'CIA_USER', 'CIA_PASS'];

function clearCredentials() {
  try {
    const envLines = readEnvLines().filter(
      (line) =>
        line.trim().length > 0 &&
        !CREDENTIAL_ENV_KEYS.some((key) => line.startsWith(`${key}=`)),
    );

    fs.writeFileSync(getEnvFilePath(), envLines.length ? `${envLines.join('\n')}\n` : '', 'utf8');

    for (const key of CREDENTIAL_ENV_KEYS) {
      delete process.env[key];
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'No fue posible borrar las credenciales.',
    };
  }
}

// Un test en vuelo por portal: el botón queda disabled en la UI, pero el lock
// protege contra dobles invocaciones desde cualquier origen.
const testsInFlight = new Set();

// Prueba login real contra el portal SIN persistir nada. El password nunca se
// loggea ni se incluye en mensajes de error; si viene vacío se usa el guardado.
async function testConnection({ portal, user, password } = {}) {
  const normalizedPortal = portal === 'cia' ? 'cia' : 'ivirtual';
  const normalizedUser = typeof user === 'string' ? user.trim() : '';
  const savedPassword =
    normalizedPortal === 'cia' ? process.env.CIA_PASS : process.env.IVIRTUAL_PASS;
  const normalizedPassword =
    (typeof password === 'string' && password.trim()) || savedPassword?.trim() || '';

  if (!normalizedUser) {
    return { ok: false, error: 'Falta el usuario.' };
  }

  if (!normalizedPassword) {
    return { ok: false, error: 'No hay contraseña para probar: escribe una o guárdala primero.' };
  }

  if (testsInFlight.has(normalizedPortal)) {
    return { ok: false, error: 'Ya hay una prueba en curso para este portal.' };
  }

  testsInFlight.add(normalizedPortal);
  let browser = null;

  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    if (normalizedPortal === 'cia') {
      // Require perezoso: evita cargar el scraper completo al iniciar la app.
      const { loginToCIA } = require('./cia');
      await loginToCIA(page, normalizedUser, normalizedPassword);
      return { ok: true };
    }

    const { loginToIVirtual } = require('./scraper');
    const loginResult = await loginToIVirtual(page, normalizedUser, normalizedPassword);

    if (loginResult?.error) {
      return { ok: false, error: 'iVirtual rechazó las credenciales.' };
    }

    return { ok: true };
  } catch (error) {
    const message = String(error?.message || '');
    const friendly = message.includes('Credenciales')
      ? 'El CIA rechazó las credenciales.'
      : 'No fue posible conectar con el portal. Verifica tu conexión e intenta de nuevo.';
    return { ok: false, error: friendly };
  } finally {
    testsInFlight.delete(normalizedPortal);
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async () => getSettings());
  ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
  ipcMain.handle('settings:test-connection', async (_event, payload) => testConnection(payload || {}));
  ipcMain.handle('settings:clear-credentials', async () => clearCredentials());

  // La persistencia vive en notification-center: comparte notification-settings.json
  // con lastSyncAt, que el auto-sync necesita para su rate limit.
  const notificationCenter = require('./notification-center');

  ipcMain.handle('settings:get-auto-sync', async () => notificationCenter.getAutoSyncSettings());
  ipcMain.handle('settings:set-auto-sync', async (_event, payload) =>
    notificationCenter.setAutoSyncSettings(payload || {}),
  );
}

module.exports = {
  clearCredentials,
  getEnvFilePath,
  getSettings,
  registerSettingsHandlers,
  saveStudentName,
  saveSettings,
  testConnection,
};
