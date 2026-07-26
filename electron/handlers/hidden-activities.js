// Actividades que el usuario decidió no ver. Se guardan por id en userData, no
// en el caché del scraper: re-sincronizar reescribe ese caché y las ocultas
// tienen que sobrevivirlo.
//
// No existe "eliminar" a propósito — la actividad vive en iVirtual y volvería
// en el siguiente scrape. Ocultar es la única semántica honesta.
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

const FILE_NAME = 'hidden-activities.json';

function getFilePath() {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function readIds() {
  try {
    const filePath = getFilePath();

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed?.ids) ? parsed.ids.map(String) : [];
  } catch (error) {
    console.error('[hidden-activities] no se pudo leer el archivo:', error?.message);
    return [];
  }
}

function writeIds(ids) {
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify({ ids }, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[hidden-activities] no se pudo escribir el archivo:', error?.message);
    return false;
  }
}

function registerHiddenActivitiesHandlers() {
  ipcMain.handle('hidden-activities:get', async () => ({ ok: true, ids: readIds() }));

  ipcMain.handle('hidden-activities:add', async (_event, id) => {
    const normalized = String(id || '').trim();

    if (!normalized) {
      return { ok: false, error: 'La actividad no tiene id: no se puede ocultar.' };
    }

    const ids = readIds();

    if (ids.includes(normalized)) {
      return { ok: true, ids };
    }

    const next = [...ids, normalized];
    return writeIds(next)
      ? { ok: true, ids: next }
      : { ok: false, error: 'No fue posible guardar la actividad oculta.' };
  });

  ipcMain.handle('hidden-activities:remove', async (_event, id) => {
    const normalized = String(id || '').trim();
    const next = readIds().filter((entry) => entry !== normalized);

    return writeIds(next)
      ? { ok: true, ids: next }
      : { ok: false, error: 'No fue posible restaurar la actividad.' };
  });
}

module.exports = { registerHiddenActivitiesHandlers };
