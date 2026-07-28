// Módulo Música: varias carpetas locales escaneadas con music-metadata,
// mergeadas en una biblioteca única y vigiladas con chokidar para reflejar
// altas y bajas de archivos sin pedir un re-escaneo manual.
//
// También registra el protocolo dvpotro-media:// — en dev el renderer corre en
// http://localhost (Vite) y Chromium bloquea subresources file://, así que el
// <audio> necesita un protocolo propio que sirva los archivos locales.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { BrowserWindow, app, dialog, ipcMain, net, protocol } = require('electron');
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

// Toda mutación de la biblioteca pasa por acá. Los eventos de chokidar llegan
// cuando quieren y pueden solaparse con un scan manual o un alta de carpeta:
// sin serializar, dos handlers leen el mismo JSON y el segundo pisa al primero.
let writeQueue = Promise.resolve();

function withLock(operation) {
  const result = writeQueue.then(operation, operation);
  // La cola sobrevive a un fallo; si no, un rechazo colgaría todo lo siguiente.
  writeQueue = result.catch(() => {});
  return result;
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

// Lee una pista del disco. Un archivo ilegible entra igual con metadata mínima:
// el <audio> decide en reproducción si realmente puede sonar.
async function readTrack(filePath) {
  const { parseFile } = require('music-metadata');
  const fallbackTitle = path.basename(filePath, path.extname(filePath));

  try {
    // duration:true fuerza el cálculo aunque el header no lo declare (WAV/OGG).
    const metadata = await parseFile(filePath, { duration: true });
    return {
      path: filePath,
      title: metadata.common.title?.trim() || fallbackTitle,
      artist: metadata.common.artist?.trim() || 'Artista desconocido',
      album: metadata.common.album?.trim() || '',
      duration: Number.isFinite(metadata.format.duration) ? Math.round(metadata.format.duration) : 0,
      bitrate: Number.isFinite(metadata.format.bitrate) ? Math.round(metadata.format.bitrate) : 0,
      coverPath: extractCover(metadata.common.picture?.[0]),
    };
  } catch (_error) {
    return {
      path: filePath,
      title: fallbackTitle,
      artist: 'Artista desconocido',
      album: '',
      duration: 0,
      bitrate: 0,
      coverPath: null,
    };
  }
}

function sortTracks(tracks) {
  return tracks.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
}

// Escanea todas las carpetas y las mergea en una sola lista. El dedup es por
// ruta normalizada: si dos carpetas se solapan, el archivo entra una sola vez.
async function scanFolders(folders) {
  const seen = new Set();
  const files = [];

  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      // Disco desmontado o carpeta borrada: se saltea y la carpeta queda en la
      // lista. Al reconectarse sus pistas vuelven solas.
      console.warn(`[music] carpeta inaccesible, se omite del escaneo: ${folder}`);
      continue;
    }

    for (const filePath of collectAudioFiles(folder)) {
      const key = normalizePath(filePath);
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(filePath);
    }
  }

  const tracks = [];
  for (const filePath of files) {
    tracks.push(await readTrack(filePath));
  }

  return sortTracks(tracks);
}

async function rescanAll() {
  const library = readLibrary();
  const tracks = await scanFolders(library.folders);
  return writeLibrary({ ...library, tracks, scannedAt: new Date().toISOString() });
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

// Comparación de rutas: en Windows el casing no distingue y los separadores
// llegan mezclados según quién produjo la ruta (chokidar normaliza a '/').
function normalizePath(value) {
  const normalized = path.normalize(String(value || ''));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

// Lee la biblioteca ya migrada al shape con folders[]. Fase 1 y 2 guardaban una
// sola carpeta en folderPath; convertirlo acá evita que cada consumidor tenga
// que conocer las dos formas.
function readLibrary() {
  const raw = readJson(getLibraryPath()) || {};
  const folders = Array.isArray(raw.folders) ? raw.folders : [];

  if (!raw.folderPath) {
    return { ...raw, folders, tracks: Array.isArray(raw.tracks) ? raw.tracks : [] };
  }

  // Unión y no reemplazo: si por lo que sea coexisten los dos campos, ninguna
  // carpeta se pierde en la migración.
  const merged = [raw.folderPath, ...folders.filter((entry) => normalizePath(entry) !== normalizePath(raw.folderPath))];
  const { folderPath: _legacy, ...rest } = raw;
  const migrated = { ...rest, folders: merged, tracks: Array.isArray(raw.tracks) ? raw.tracks : [] };

  writeJson(getLibraryPath(), migrated);
  console.log('[music] migrado folderPath → folders[]');
  return migrated;
}

function writeLibrary(library) {
  writeJson(getLibraryPath(), library);
  return library;
}

// El renderer sigue leyendo esto tal cual; el shape es el nuevo.
function getLibrary() {
  return readLibrary();
}

function isSubfolderOf(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// Agrega la carpeta y suma sus pistas a las que ya había. No reemplaza nada:
// la biblioteca es la unión de todas las carpetas.
async function addFolder(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { error: 'La carpeta no existe o no es accesible.' };
  }

  const library = readLibrary();
  const normalized = normalizePath(folderPath);

  if (library.folders.some((entry) => normalizePath(entry) === normalized)) {
    return { ...library, added: false, reason: 'duplicate' };
  }

  // Una subcarpeta de otra ya incluida no aporta nada: sus archivos ya entran
  // por el escaneo recursivo del padre.
  if (library.folders.some((entry) => isSubfolderOf(folderPath, entry))) {
    return { ...library, added: false, reason: 'nested' };
  }

  // Si la nueva contiene a otras ya presentes, esas quedan redundantes.
  const folders = [
    ...library.folders.filter((entry) => !isSubfolderOf(entry, folderPath)),
    folderPath,
  ];

  const tracks = await scanFolders(folders);
  const updated = writeLibrary({ ...library, folders, tracks, scannedAt: new Date().toISOString() });
  startWatcher(folderPath);

  return { ...updated, added: true };
}

async function removeFolder(folderPath) {
  const library = readLibrary();
  const normalized = normalizePath(folderPath);

  if (!library.folders.some((entry) => normalizePath(entry) === normalized)) {
    return { ok: false, error: 'La carpeta no está en la biblioteca.' };
  }

  await stopWatcher(folderPath);

  const folders = library.folders.filter((entry) => normalizePath(entry) !== normalized);
  // Las pistas se recalculan escaneando lo que queda en vez de filtrar por
  // prefijo: si otra carpeta también las contenía, tienen que seguir estando.
  const tracks = await scanFolders(folders);

  return {
    ok: true,
    library: writeLibrary({ ...library, folders, tracks, scannedAt: new Date().toISOString() }),
  };
}

// ── Watchers ───────────────────────────────────────────────────────
// Una instancia de chokidar por carpeta. El map es la fuente de verdad de qué
// está vigilado; montar dos veces la misma carpeta sería un doble evento por
// cada archivo.
const watchers = new Map();

function broadcastLibrary(reason, filePath, library) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('music-library:updated', { reason, path: filePath, library });
  }
}

async function handleWatchedAdd(filePath) {
  if (!AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    return;
  }

  const updated = await withLock(async () => {
    const library = readLibrary();
    const key = normalizePath(filePath);

    // Carpetas solapadas pueden reportar el mismo alta dos veces.
    if (library.tracks.some((track) => normalizePath(track.path) === key)) {
      return null;
    }

    const track = await readTrack(filePath);
    return writeLibrary({ ...library, tracks: sortTracks([...library.tracks, track]) });
  });

  if (updated) {
    console.log(`[music] watch add: ${filePath}`);
    broadcastLibrary('add', filePath, updated);
  }
}

async function handleWatchedUnlink(filePath) {
  const updated = await withLock(async () => {
    const library = readLibrary();
    const key = normalizePath(filePath);
    const tracks = library.tracks.filter((track) => normalizePath(track.path) !== key);

    if (tracks.length === library.tracks.length) {
      return null;
    }

    return writeLibrary({ ...library, tracks });
  });

  if (updated) {
    console.log(`[music] watch unlink: ${filePath}`);
    broadcastLibrary('unlink', filePath, updated);
  }
}

function startWatcher(folderPath) {
  if (watchers.has(normalizePath(folderPath)) || !fs.existsSync(folderPath)) {
    return;
  }

  try {
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(folderPath, {
      ignoreInitial: true,
      // Copiar un archivo grande dispara 'add' apenas se crea el inode. Sin
      // esperar a que el tamaño se estabilice, parseFile lee un archivo a medio
      // escribir y la pista entra con metadata basura.
      awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
    });

    watcher.on('add', (filePath) => {
      handleWatchedAdd(filePath).catch((error) =>
        console.error('[music] watch add falló:', error?.message || error));
    });
    watcher.on('unlink', (filePath) => {
      handleWatchedUnlink(filePath).catch((error) =>
        console.error('[music] watch unlink falló:', error?.message || error));
    });
    // Una unidad de red que se cae no puede tumbar la app: el escaneo manual
    // sigue funcionando aunque el watcher muera.
    watcher.on('error', (error) =>
      console.warn(`[music] watcher de ${folderPath} falló:`, error?.message || error));

    watchers.set(normalizePath(folderPath), watcher);
  } catch (error) {
    console.warn(`[music] no se pudo vigilar ${folderPath}:`, error?.message || error);
  }
}

async function stopWatcher(folderPath) {
  const key = normalizePath(folderPath);
  const watcher = watchers.get(key);

  if (!watcher) return;

  watchers.delete(key);

  try {
    await watcher.close();
  } catch (error) {
    console.warn('[music] no se pudo cerrar el watcher:', error?.message || error);
  }
}

function startAllWatchers() {
  for (const folder of readLibrary().folders) {
    startWatcher(folder);
  }
}

async function stopAllWatchers() {
  await Promise.all([...watchers.keys()].map((key) => stopWatcher(key)));
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

// La biblioteca puede tener varias raíces: basta con caer dentro de una.
function isInsideAny(filePath, folders) {
  return (folders || []).some((folder) => isInside(filePath, folder));
}

// Portadas custom de playlists. La ruta se calcula acá en vez de importarla de
// music-playlists porque ese módulo ya importa este: cerrar el ciclo rompería
// la carga.
function getPlaylistCoversDir() {
  return path.join(app.getPath('userData'), 'playlist-covers');
}

// Llamar DENTRO de whenReady. Sirve tres raíces y nada más: audio dentro de la
// carpeta de librería configurada, e imágenes dentro de music-covers y de
// playlist-covers. Sin ese cerco el protocolo es un primitivo de lectura
// arbitraria del disco.
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

      // Las portadas las escribe la propia app dentro de esos directorios, así
      // que alcanza con que el archivo caiga adentro y tenga extensión de
      // imagen; el nombre ya lo controlamos nosotros.
      const isCover =
        isInside(filePath, getCoversDir()) || isInside(filePath, getPlaylistCoversDir());
      const allowed = isCover
        ? COVER_EXTENSIONS.has(extension)
        : isInsideAny(filePath, readLibrary().folders) && AUDIO_EXTENSIONS.has(extension);

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
  // El diálogo NO entra al lock: es modal y puede quedarse abierto de forma
  // indefinida, dejando colgada cualquier otra escritura mientras tanto.
  ipcMain.handle('music:pick-folder', async () => pickFolder());

  // scan-folder suma la carpeta en vez de reemplazarla — el nombre quedó de
  // cuando la biblioteca tenía una sola. add-folder es el alias con el nombre
  // que corresponde.
  ipcMain.handle('music:scan-folder', async (_event, folderPath) => withLock(() => addFolder(folderPath)));
  ipcMain.handle('music:add-folder', async (_event, folderPath) => withLock(() => addFolder(folderPath)));
  ipcMain.handle('music:remove-folder', async (_event, folderPath) => withLock(() => removeFolder(folderPath)));
  ipcMain.handle('music:list-folders', async () => ({ folders: readLibrary().folders }));
  ipcMain.handle('music:get-library', async () => getLibrary());
  ipcMain.handle('music:refresh', async () => withLock(() => rescanAll()));
  ipcMain.handle('music:save-state', async (_event, state) => saveState(state));
  ipcMain.handle('music:load-state', async () => loadState());
}

module.exports = {
  addFolder,
  getLibrary,
  loadState,
  registerMusicHandlers,
  registerMusicProtocol,
  registerMusicScheme,
  removeFolder,
  saveState,
  startAllWatchers,
  stopAllWatchers,
};
