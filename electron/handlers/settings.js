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

function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async () => getSettings());
  ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
}

module.exports = {
  getEnvFilePath,
  getSettings,
  registerSettingsHandlers,
  saveStudentName,
  saveSettings,
};
