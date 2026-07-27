// Módulo Música (Fase 1): elegir carpeta local, escanear archivos de audio con
// music-metadata, cachear la librería y persistir el estado del reproductor.
// También registra el protocolo dvpotro-media:// — en dev el renderer corre en
// http://localhost (Vite) y Chromium bloquea subresources file://, así que el
// <audio> necesita un protocolo propio que sirva los archivos locales.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, dialog, ipcMain, net, protocol } = require('electron');
const { pathToFileURL } = require('url');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.flac', '.ogg', '.wav']);
const COVER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MEDIA_SCHEME = 'dvpotro-media';
// Directorios que un scan recursivo jamás debería pisar.
const SKIP_DIRS = new Set(['node_modules', '.git', '$RECYCLE.BIN', 'System Volume Information']);

// music-metadata reporta el formato de la portada como mime completo o como
// extensión pelada según el contenedor — se aceptan las dos formas.
const COVER_FORMATS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  jpeg: '.jpg',
  jpg: '.jpg',
  'image/png': '.png',
  png: '.png',
  'image/webp': '.webp',
  webp: '.webp',
};

function getLibraryPath() {
  return path.join(app.getPath('userData'), 'music-library.json');
}

function getStatePath() {
  return path.join(app.getPath('userData'), 'music-state.json');
}

function getCoversDir() {
  return path.join(app.getPath('userData'), 'music-covers');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    // ENOENT = primer arranque (archivo aún no existe): no es un error.
    if (error?.code !== 'ENOENT') {
      console.error('[music] Error leyendo librería/estado:', error?.message || error);
    }
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

// Extrae la portada embebida a userData/music-covers/<sha256>.<ext>. El hash
// del contenido es el nombre: dos pistas del mismo álbum escriben el mismo
// archivo una sola vez, y re-escanear no duplica nada.
function extractCover(picture) {
  if (!picture?.data) {
    return null;
  }

  const extension = COVER_FORMATS[String(picture.format || '').toLowerCase()];

  if (!extension) {
    return null;
  }

  try {
    const buffer = Buffer.from(picture.data);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const coverPath = path.join(getCoversDir(), `${hash}${extension}`);

    if (!fs.existsSync(coverPath)) {
      fs.mkdirSync(getCoversDir(), { recursive: true });
      fs.writeFileSync(coverPath, buffer);
    }

    return coverPath;
  } catch (error) {
    // Una portada ilegible no puede tumbar el scan de la pista.
    console.error('[music] No se pudo extraer la portada:', error?.message || error);
    return null;
  }
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
      const metadata = await parseFile(filePath, { duration: true });
      tracks.push({
        path: filePath,
        title: metadata.common.title?.trim() || fallbackTitle,
        artist: metadata.common.artist?.trim() || 'Artista desconocido',
        album: metadata.common.album?.trim() || '',
        duration: Number.isFinite(metadata.format.duration) ? Math.round(metadata.format.duration) : 0,
        bitrate: Number.isFinite(metadata.format.bitrate) ? Math.round(metadata.format.bitrate) : 0,
        coverPath: extractCover(metadata.common.picture?.[0]),
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
        coverPath: null,
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

// Separador anexado para que C:\Music no matchee C:\MusicEvil\.
function isInside(filePath, folder) {
  if (!folder) {
    return false;
  }

  const root = path.normalize(folder + path.sep);
  return process.platform === 'win32'
    ? filePath.toLowerCase().startsWith(root.toLowerCase())
    : filePath.startsWith(root);
}

// Llamar DENTRO de whenReady. Sirve dos raíces y nada más: audio dentro de la
// carpeta de librería configurada, e imágenes dentro de music-covers. Sin ese
// cerco el protocolo es un primitivo de lectura arbitraria del disco.
function registerMusicProtocol() {
  protocol.handle(MEDIA_SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      // dvpotro-media:///C:/ruta/cancion.mp3 → pathname /C:/ruta/cancion.mp3
      const decoded = decodeURIComponent(url.pathname);
      const filePath = path.normalize(
        process.platform === 'win32' && decoded.startsWith('/') ? decoded.slice(1) : decoded,
      );
      const extension = path.extname(filePath).toLowerCase();

      // Las portadas las escribe el propio scan con el sha256 del contenido como
      // nombre, así que basta con que caigan dentro del directorio.
      const allowed = isInside(filePath, getCoversDir())
        ? COVER_EXTENSIONS.has(extension)
        : isInside(filePath, getLibrary()?.folderPath) && AUDIO_EXTENSIONS.has(extension);

      if (!allowed) {
        return new Response('Forbidden', { status: 403 });
      }

      if (!fs.existsSync(filePath)) {
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
