// Módulo Música (Fase 1): elegir carpeta local, escanear archivos de audio con
// music-metadata, cachear la librería y persistir el estado del reproductor.
// También registra el protocolo dvpotro-media:// — en dev el renderer corre en
// http://localhost (Vite) y Chromium bloquea subresources file://, así que el
// <audio> necesita un protocolo propio que sirva los archivos locales.
const fs = require('fs');
const path = require('path');
const { app, dialog, ipcMain, net, protocol } = require('electron');
const { pathToFileURL } = require('url');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.flac', '.ogg', '.wav']);
const MEDIA_SCHEME = 'dvpotro-media';
// Directorios que un scan recursivo jamás debería pisar.
const SKIP_DIRS = new Set(['node_modules', '.git', '$RECYCLE.BIN', 'System Volume Information']);

function getLibraryPath() {
  return path.join(app.getPath('userData'), 'music-library.json');
}

function getStatePath() {
  return path.join(app.getPath('userData'), 'music-state.json');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function collectAudioFiles(dir, accumulator = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_error) {
    return accumulator; // Carpeta ilegible (permisos): se salta, no rompe el scan.
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        collectAudioFiles(fullPath, accumulator);
      }
      continue;
    }

    if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      accumulator.push(fullPath);
    }
  }

  return accumulator;
}

async function scanFolder(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { error: 'La carpeta no existe o no es accesible.' };
  }

  const { parseFile } = require('music-metadata');
  const files = collectAudioFiles(folderPath);
  const tracks = [];

  for (const filePath of files) {
    const fallbackTitle = path.basename(filePath, path.extname(filePath));

    try {
      // duration:true fuerza el cálculo aunque el header no lo declare (WAV/OGG).
      const metadata = await parseFile(filePath, { duration: true, skipCovers: true });
      tracks.push({
        path: filePath,
        title: metadata.common.title?.trim() || fallbackTitle,
        artist: metadata.common.artist?.trim() || 'Artista desconocido',
        album: metadata.common.album?.trim() || '',
        duration: Number.isFinite(metadata.format.duration) ? Math.round(metadata.format.duration) : 0,
        bitrate: Number.isFinite(metadata.format.bitrate) ? Math.round(metadata.format.bitrate) : 0,
      });
    } catch (_error) {
      // Archivo corrupto o tags ilegibles: entra igual con metadata mínima —
      // el <audio> decide en reproducción si realmente puede sonar.
      tracks.push({
        path: filePath,
        title: fallbackTitle,
        artist: 'Artista desconocido',
        album: '',
        duration: 0,
        bitrate: 0,
      });
    }
  }

  tracks.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));

  const library = {
    folderPath,
    tracks,
    scannedAt: new Date().toISOString(),
  };
  writeJson(getLibraryPath(), library);
  return library;
}

async function pickFolder() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Elegir carpeta de música',
  });

  if (canceled || !filePaths?.[0]) {
    return null;
  }

  return filePaths[0];
}

function getLibrary() {
  return readJson(getLibraryPath());
}

async function refreshLibrary() {
  const library = getLibrary();

  if (!library?.folderPath) {
    return { error: 'No hay carpeta configurada para re-escanear.' };
  }

  return scanFolder(library.folderPath);
}

function saveState(state) {
  try {
    writeJson(getStatePath(), { ...(state || {}), savedAt: new Date().toISOString() });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message };
  }
}

function loadState() {
  return readJson(getStatePath());
}

// Llamar ANTES de app.whenReady() — Electron exige registrar privilegios de
// schemes custom antes del ready. stream:true habilita los range requests que
// el <audio> necesita para hacer seek sin descargar el archivo entero.
function registerMusicScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: MEDIA_SCHEME, privileges: { stream: true, supportFetchAPI: true } },
  ]);
}

// Llamar DENTRO de whenReady. Sirve solo archivos con extensión de audio — el
// protocolo no debe convertirse en un file-server genérico del disco.
function registerMusicProtocol() {
  protocol.handle(MEDIA_SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      // dvpotro-media:///C:/ruta/cancion.mp3 → pathname /C:/ruta/cancion.mp3
      const decoded = decodeURIComponent(url.pathname);
      const filePath = path.normalize(
        process.platform === 'win32' && decoded.startsWith('/') ? decoded.slice(1) : decoded,
      );

      if (!AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase()) || !fs.existsSync(filePath)) {
        return new Response('Not found', { status: 404 });
      }

      return net.fetch(pathToFileURL(filePath).toString(), {
        headers: request.headers, // Propaga Range para el seek del <audio>.
      });
    } catch (_error) {
      return new Response('Bad request', { status: 400 });
    }
  });
}

function registerMusicHandlers() {
  ipcMain.handle('music:pick-folder', async () => pickFolder());
  ipcMain.handle('music:scan-folder', async (_event, folderPath) => scanFolder(folderPath));
  ipcMain.handle('music:get-library', async () => getLibrary());
  ipcMain.handle('music:refresh', async () => refreshLibrary());
  ipcMain.handle('music:save-state', async (_event, state) => saveState(state));
  ipcMain.handle('music:load-state', async () => loadState());
}

module.exports = {
  getLibrary,
  loadState,
  registerMusicHandlers,
  registerMusicProtocol,
  registerMusicScheme,
  saveState,
  scanFolder,
};
