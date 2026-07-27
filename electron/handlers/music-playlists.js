// Playlists del usuario: listas curadas a mano, distintas de los álbumes que se
// derivan de los tags. Persisten en userData, fuera del caché de la librería,
// porque re-escanear reescribe ese caché y estas tienen que sobrevivirlo.
//
// Las pistas se guardan por ruta absoluta, no por índice ni por objeto: la
// librería se re-escanea y los índices se corren, pero la ruta sigue siendo la
// misma pista. Una ruta que ya no está en la librería se conserva igual — el
// disco externo puede volver a montarse.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, dialog, ipcMain } = require('electron');

const { getLibrary } = require('./music');

const FILE_NAME = 'music-playlists.json';
const COVERS_DIR_NAME = 'playlist-covers';
const COVER_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

function getFilePath() {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function getCoversDir() {
  return path.join(app.getPath('userData'), COVERS_DIR_NAME);
}

function readPlaylists() {
  try {
    const filePath = getFilePath();

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed?.playlists)) {
      return [];
    }

    return parsed.playlists
      .filter((entry) => entry?.id && typeof entry.name === 'string')
      .map((entry) => ({
        ...entry,
        tracks: Array.isArray(entry.tracks) ? entry.tracks.map(String) : [],
        coverPath: entry.coverPath || null,
      }));
  } catch (error) {
    console.error('[music-playlists] no se pudo leer el archivo:', error?.message);
    return [];
  }
}

function writePlaylists(playlists) {
  try {
    fs.writeFileSync(getFilePath(), JSON.stringify({ playlists }, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[music-playlists] no se pudo escribir el archivo:', error?.message);
    return false;
  }
}

// Toda escritura pasa por acá. Sin serializar, dos add-track casi simultáneos
// leen el mismo estado y el segundo pisa al primero: el JSON queda con una sola
// de las dos pistas.
let writeQueue = Promise.resolve();

function withLock(operation) {
  const result = writeQueue.then(operation, operation);
  // La cola sigue viva aunque una operación falle; si no, un rechazo dejaría
  // todas las escrituras siguientes colgadas.
  writeQueue = result.catch(() => {});
  return result;
}

// Muta la playlist pedida y persiste. Devuelve el shape de respuesta común.
function mutate(id, mutator) {
  const playlists = readPlaylists();
  const index = playlists.findIndex((entry) => entry.id === id);

  if (index === -1) {
    return { ok: false, error: 'La playlist no existe.' };
  }

  const updated = mutator({ ...playlists[index] });

  if (!updated) {
    // El mutator decidió que no hay cambio (no-op válido, no error).
    return { ok: true, playlist: playlists[index] };
  }

  updated.updatedAt = new Date().toISOString();
  playlists[index] = updated;

  return writePlaylists(playlists)
    ? { ok: true, playlist: updated }
    : { ok: false, error: 'No fue posible guardar la playlist.' };
}

function getCoverExtension(filename) {
  // Solo el último segmento: "foto.jpg.exe" da "exe" y queda fuera de la lista.
  const extension = path.extname(String(filename || '')).replace('.', '').toLowerCase();
  return COVER_EXTENSIONS.has(extension) ? extension : null;
}

function deleteCoverFiles(playlistId) {
  for (const extension of COVER_EXTENSIONS) {
    const candidate = path.join(getCoversDir(), `${playlistId}.${extension}`);

    try {
      if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
    } catch (error) {
      console.error('[music-playlists] no se pudo borrar la portada:', error?.message);
    }
  }
}

// ── M3U ────────────────────────────────────────────────────────────
// Los M3U que exporta Windows suelen venir en UTF-16LE con BOM; leerlos como
// utf8 devuelve texto intercalado con NUL y ninguna ruta matchea.
function readM3uText(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le').slice(1);
  }

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString('utf8').slice(1);
  }

  return buffer.toString('utf8');
}

function parseM3uPaths(text, m3uPath) {
  const baseDir = path.dirname(m3uPath);

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    // '#' cubre #EXTM3U, #EXTINF y comentarios sueltos de una sola pasada.
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => path.resolve(baseDir, line));
}

function registerMusicPlaylistsHandlers() {
  ipcMain.handle('music-playlists:list', async () => ({ playlists: readPlaylists() }));

  ipcMain.handle('music-playlists:create', async (_event, payload) =>
    withLock(() => {
      const name = String(payload?.name || '').trim();

      if (!name) {
        return { ok: false, error: 'La playlist necesita un nombre.' };
      }

      const now = new Date().toISOString();
      // Nombres duplicados permitidos a propósito: dos listas pueden llamarse
      // igual y significar cosas distintas para el usuario. El id las separa.
      const playlist = {
        id: `pl_${crypto.randomUUID()}`,
        name,
        coverPath: null,
        tracks: [],
        createdAt: now,
        updatedAt: now,
      };

      const playlists = [...readPlaylists(), playlist];
      return writePlaylists(playlists)
        ? { ok: true, playlist }
        : { ok: false, error: 'No fue posible crear la playlist.' };
    }),
  );

  ipcMain.handle('music-playlists:rename', async (_event, payload) =>
    withLock(() => {
      const name = String(payload?.name || '').trim();

      if (!name) {
        return { ok: false, error: 'La playlist necesita un nombre.' };
      }

      return mutate(payload?.id, (playlist) => ({ ...playlist, name }));
    }),
  );

  ipcMain.handle('music-playlists:delete', async (_event, payload) =>
    withLock(() => {
      const id = payload?.id;
      const playlists = readPlaylists();
      const next = playlists.filter((entry) => entry.id !== id);

      if (next.length === playlists.length) {
        return { ok: false, error: 'La playlist no existe.' };
      }

      // La portada custom se borra con la playlist: sin dueño es basura que
      // nadie va a limpiar después.
      deleteCoverFiles(id);

      return writePlaylists(next) ? { ok: true } : { ok: false, error: 'No fue posible eliminar la playlist.' };
    }),
  );

  ipcMain.handle('music-playlists:add-track', async (_event, payload) =>
    withLock(() => {
      const trackPath = String(payload?.trackPath || '').trim();

      if (!trackPath) {
        return { ok: false, error: 'Ruta vacía: no se puede agregar.' };
      }

      return mutate(payload?.playlistId, (playlist) => {
        if (playlist.tracks.includes(trackPath)) {
          return null; // Ya estaba: no-op, no duplicado.
        }

        return { ...playlist, tracks: [...playlist.tracks, trackPath] };
      });
    }),
  );

  ipcMain.handle('music-playlists:remove-track', async (_event, payload) =>
    withLock(() => {
      const trackPath = String(payload?.trackPath || '').trim();

      return mutate(payload?.playlistId, (playlist) => ({
        ...playlist,
        tracks: playlist.tracks.filter((entry) => entry !== trackPath),
      }));
    }),
  );

  ipcMain.handle('music-playlists:reorder', async (_event, payload) =>
    withLock(() => {
      const { fromIndex, toIndex } = payload || {};

      return mutate(payload?.playlistId, (playlist) => {
        const size = playlist.tracks.length;
        const validIndex = (value) => Number.isInteger(value) && value >= 0 && value < size;

        if (!validIndex(fromIndex) || !validIndex(toIndex) || fromIndex === toIndex) {
          return null;
        }

        const tracks = [...playlist.tracks];
        const [moved] = tracks.splice(fromIndex, 1);
        tracks.splice(toIndex, 0, moved);

        return { ...playlist, tracks };
      });
    }),
  );

  ipcMain.handle('music-playlists:set-cover', async (_event, payload) =>
    withLock(() => {
      const extension = getCoverExtension(payload?.filename);

      if (!extension) {
        return { ok: false, error: 'Formato de imagen no soportado.' };
      }

      if (!payload?.imageArrayBuffer) {
        return { ok: false, error: 'No se recibió la imagen.' };
      }

      const playlistId = payload?.playlistId;

      return mutate(playlistId, (playlist) => {
        try {
          fs.mkdirSync(getCoversDir(), { recursive: true });
          // Se borran todas las extensiones antes de escribir: cambiar de jpg a
          // png dejaría el jpg viejo huérfano y ganando en el fallback.
          deleteCoverFiles(playlistId);

          const coverPath = path.join(getCoversDir(), `${playlistId}.${extension}`);
          fs.writeFileSync(coverPath, Buffer.from(payload.imageArrayBuffer));

          return { ...playlist, coverPath };
        } catch (error) {
          console.error('[music-playlists] no se pudo guardar la portada:', error?.message);
          return null;
        }
      });
    }),
  );

  ipcMain.handle('music-playlists:remove-cover', async (_event, payload) =>
    withLock(() => {
      const playlistId = payload?.playlistId;
      deleteCoverFiles(playlistId);
      return mutate(playlistId, (playlist) => ({ ...playlist, coverPath: null }));
    }),
  );

  ipcMain.handle('music-playlists:import-m3u', async (_event, payload) =>
    withLock(() => {
      const filePath = payload?.filePath;

      if (typeof filePath !== 'string' || !fs.existsSync(filePath)) {
        return { ok: false, error: 'El archivo de playlist no existe.' };
      }

      let entries;
      try {
        entries = parseM3uPaths(readM3uText(filePath), filePath);
      } catch (error) {
        return { ok: false, error: `No se pudo leer el M3U: ${error?.message || 'archivo dañado'}` };
      }

      // Índice case-insensitive: Windows no distingue mayúsculas en rutas y un
      // M3U escrito a mano rara vez respeta el casing del disco.
      const libraryTracks = getLibrary()?.tracks || [];
      const byPath = new Map(libraryTracks.map((track) => [track.path.toLowerCase(), track.path]));

      const matched = [];
      let unmatchedCount = 0;

      for (const entry of entries) {
        const hit = byPath.get(entry.toLowerCase());

        if (!hit) {
          unmatchedCount += 1;
          continue;
        }

        if (!matched.includes(hit)) matched.push(hit);
      }

      const now = new Date().toISOString();
      const playlist = {
        id: `pl_${crypto.randomUUID()}`,
        name: path.basename(filePath, path.extname(filePath)) || 'Playlist importada',
        coverPath: null,
        tracks: matched,
        createdAt: now,
        updatedAt: now,
      };

      if (!writePlaylists([...readPlaylists(), playlist])) {
        return { ok: false, error: 'No fue posible guardar la playlist importada.' };
      }

      return { ok: true, playlist, matchedCount: matched.length, unmatchedCount };
    }),
  );

  ipcMain.handle('music-playlists:pick-m3u', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Importar playlist',
      filters: [{ name: 'Playlist', extensions: ['m3u', 'm3u8'] }],
    });

    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('music-playlists:pick-image', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Elegir portada',
      filters: [{ name: 'Imagen', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });

    return canceled ? null : filePaths[0];
  });

  // Devuelve los bytes de una imagen elegida por el usuario. La lista blanca de
  // extensiones es lo que impide que esto sea un primitivo de lectura arbitraria
  // del disco desde el renderer.
  ipcMain.handle('music-playlists:read-image', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !getCoverExtension(filePath) || !fs.existsSync(filePath)) {
      return null;
    }

    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('[music-playlists] no se pudo leer la imagen:', error?.message);
      return null;
    }
  });
}

module.exports = { getCoversDir, registerMusicPlaylistsHandlers };
