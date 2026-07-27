// Pistas marcadas como favoritas. Se guardan por ruta absoluta en userData,
// fuera del caché de la librería: re-escanear reescribe ese caché y las marcas
// tienen que sobrevivirlo.
//
// Array plano de strings a propósito. Un objeto con timestamp por pista sería
// estructura sin uso hoy; si alguna vez hace falta "favoritos por fecha", se
// agrega el campo entonces.
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

const FILE_NAME = 'music-favorites.json';

function getFilePath() {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function readPaths() {
  try {
    const filePath = getFilePath();

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed?.paths) ? parsed.paths.map(String) : [];
  } catch (error) {
    console.error('[music-favorites] no se pudo leer el archivo:', error?.message);
    return [];
  }
}

function writePaths(paths) {
  try {
    fs.writeFileSync(
      getFilePath(),
      JSON.stringify({ paths, updatedAt: new Date().toISOString() }, null, 2),
      'utf8',
    );
    return true;
  } catch (error) {
    console.error('[music-favorites] no se pudo escribir el archivo:', error?.message);
    return false;
  }
}

function registerMusicFavoritesHandlers() {
  ipcMain.handle('music-favorites:list', async () => ({ paths: readPaths() }));

  ipcMain.handle('music-favorites:add', async (_event, trackPath) => {
    const normalized = String(trackPath || '').trim();

    if (!normalized) {
      return { ok: false, error: 'Ruta vacía: no se puede marcar como favorita.' };
    }

    const paths = readPaths();

    if (paths.includes(normalized)) {
      return { ok: true, paths };
    }

    const next = [...paths, normalized];
    return writePaths(next)
      ? { ok: true, paths: next }
      : { ok: false, error: 'No fue posible guardar el favorito.' };
  });

  ipcMain.handle('music-favorites:remove', async (_event, trackPath) => {
    const normalized = String(trackPath || '').trim();
    const next = readPaths().filter((entry) => entry !== normalized);

    return writePaths(next)
      ? { ok: true, paths: next }
      : { ok: false, error: 'No fue posible quitar el favorito.' };
  });
}

module.exports = { registerMusicFavoritesHandlers };
