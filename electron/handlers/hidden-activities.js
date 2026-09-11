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

// `addId` y `removeId` viven fuera de los `ipcMain.handle` para que el servidor
// MCP pueda llamarlas: ahí `ipcMain` es un doble de mentira y lo que quede
// adentro de un closure de handler es inalcanzable.
function addId(id) {
  const normalized = String(id || '').trim();

  if (!normalized) {
    return { ok: false, error: 'La actividad no tiene id: no se puede ocultar.' };
  }

  const ids = readIds();

  if (ids.includes(normalized)) {
    return { ok: true, ids, yaEstaba: true };
  }

  const next = [...ids, normalized];

  return writeIds(next)
    ? { ok: true, ids: next }
    : { ok: false, error: 'No fue posible guardar la actividad oculta.' };
}

function removeId(id) {
  const normalized = String(id || '').trim();
  const ids = readIds();
  const next = ids.filter((entry) => entry !== normalized);

  return writeIds(next)
    ? { ok: true, ids: next, noEstaba: next.length === ids.length }
    : { ok: false, error: 'No fue posible restaurar la actividad.' };
}

function registerHiddenActivitiesHandlers() {
  ipcMain.handle('hidden-activities:get', async () => ({ ok: true, ids: readIds() }));
  ipcMain.handle('hidden-activities:add', async (_event, id) => addId(id));
  ipcMain.handle('hidden-activities:remove', async (_event, id) => removeId(id));
}

module.exports = { addId, readIds, registerHiddenActivitiesHandlers, removeId };
