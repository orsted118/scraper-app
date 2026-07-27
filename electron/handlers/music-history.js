// Historial de escucha. Una entrada por reproducción efectiva — el renderer
// decide cuándo cuenta (umbral de scrobble) y acá solo se persiste.
//
// Lista plana ordenada por playedAt descendente: la más reciente primero, que es
// como la consumen las dos vistas (recientes y más escuchadas).
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

const FILE_NAME = 'music-history.json';
// Techo duro: 500 entradas de ~80 bytes son 40KB, escribible sync sin costo.
// Sin techo el archivo crece para siempre y la lectura al abrir la vista se nota.
const MAX_ENTRIES = 500;

function getFilePath() {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function readEntries() {
  try {
    const filePath = getFilePath();

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed?.entries)) {
      return [];
    }

    return parsed.entries.filter((entry) => entry?.path && entry?.playedAt);
  } catch (error) {
    console.error('[music-history] no se pudo leer el archivo:', error?.message);
    return [];
  }
}

function writeEntries(entries) {
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify({ entries }, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[music-history] no se pudo escribir el archivo:', error?.message);
    return false;
  }
}

function registerMusicHistoryHandlers() {
  ipcMain.handle('music-history:list', async () => ({ entries: readEntries() }));

  ipcMain.handle('music-history:add', async (_event, payload) => {
    const trackPath = String(payload?.path || '').trim();

    if (!trackPath) {
      return { ok: false, error: 'Ruta vacía: no se puede registrar la escucha.' };
    }

    const playedAt = payload?.playedAt || new Date().toISOString();
    // unshift + slice: la nueva entra primera y la más vieja cae del final.
    const entries = [{ path: trackPath, playedAt }, ...readEntries()].slice(0, MAX_ENTRIES);

    // No devuelve la lista: este handler se llama en cada escucha y el payload
    // completo sería puro peso muerto. Las vistas leen con list().
    return writeEntries(entries) ? { ok: true } : { ok: false, error: 'No fue posible registrar la escucha.' };
  });

  ipcMain.handle('music-history:clear', async () =>
    (writeEntries([]) ? { ok: true } : { ok: false, error: 'No fue posible borrar el historial.' }),
  );
}

module.exports = { registerMusicHistoryHandlers };
