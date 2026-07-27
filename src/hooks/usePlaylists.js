import { useCallback, useEffect, useRef, useState } from 'react';

// Sin bridge (dev en navegador sin Electron) las playlists quedan vacías y las
// operaciones no hacen nada. No hay fallback a localStorage como en favoritos:
// con portadas en disco e import de M3U el espejo sería mentira, no respaldo.
function getBridge() {
  return typeof window !== 'undefined' ? window.scraperApp?.playlists : null;
}

function usePlaylists() {
  const [playlists, setPlaylists] = useState([]);
  // Espejo síncrono del state. React difiere los updaters funcionales, así que
  // dentro de una acción no hay forma de leer la lista actual desde setState.
  const playlistsRef = useRef(playlists);
  playlistsRef.current = playlists;

  const commit = useCallback((next) => {
    playlistsRef.current = next;
    setPlaylists(next);
  }, []);

  const refresh = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) return;

    try {
      const data = await bridge.list();
      commit(Array.isArray(data?.playlists) ? data.playlists : []);
    } catch (_error) {
      // Se deja lo que ya estaba: vaciar la vista por un fallo de lectura sería
      // peor que mostrarla desactualizada.
    }
  }, [commit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reemplaza una playlist por la versión que devolvió el backend, o la inserta
  // si el espejo local todavía no la tiene: una recién creada puede no haber
  // llegado al state cuando responde la operación siguiente.
  const replace = useCallback(
    (playlist) => {
      if (!playlist?.id) return;

      const current = playlistsRef.current;
      commit(
        current.some((entry) => entry.id === playlist.id)
          ? current.map((entry) => (entry.id === playlist.id ? playlist : entry))
          : [...current, playlist],
      );
    },
    [commit],
  );

  // ── Operaciones sin optimismo ────────────────────────────────────
  // Crear, renombrar, borrar, portada e import son poco frecuentes y el usuario
  // tolera la latencia. Adelantarse solo agregaría estados intermedios raros.

  const create = useCallback(
    async (name) => {
      const bridge = getBridge();
      if (!bridge) return null;

      const result = await bridge.create(name);
      if (result?.ok && result.playlist) {
        commit([...playlistsRef.current, result.playlist]);
        return result.playlist;
      }

      return null;
    },
    [commit],
  );

  const rename = useCallback(
    async (id, name) => {
      const bridge = getBridge();
      if (!bridge) return;

      const result = await bridge.rename(id, name);
      if (result?.ok) replace(result.playlist);
    },
    [replace],
  );

  const remove = useCallback(
    async (id) => {
      const bridge = getBridge();
      if (!bridge) return;

      const result = await bridge.delete(id);
      if (result?.ok) commit(playlistsRef.current.filter((entry) => entry.id !== id));
    },
    [commit],
  );

  // No recibe la imagen: el diálogo lo abre main, que además la lee y la guarda.
  // Devuelve el resultado para que la vista distinga cancelar de fallar.
  const pickCover = useCallback(
    async (playlistId) => {
      const bridge = getBridge();
      if (!bridge) return { ok: false, canceled: true };

      const result = await bridge.pickCover(playlistId);
      if (result?.ok) replace(result.playlist);
      return result || { ok: false, error: 'No hubo respuesta del proceso principal.' };
    },
    [replace],
  );

  const removeCover = useCallback(
    async (playlistId) => {
      const bridge = getBridge();
      if (!bridge) return;

      const result = await bridge.removeCover(playlistId);
      if (result?.ok) replace(result.playlist);
    },
    [replace],
  );

  const importM3u = useCallback(
    async (filePath) => {
      const bridge = getBridge();
      if (!bridge) return null;

      const result = await bridge.importM3u(filePath);
      if (!result?.ok) return null;

      commit([...playlistsRef.current, result.playlist]);
      return result;
    },
    [commit],
  );

  // ── Operaciones optimistas ───────────────────────────────────────
  // Agregar, quitar y reordenar pistas se hacen mirando la lista: el feedback
  // tiene que ser inmediato o el gesto se siente roto.

  const applyOptimistic = useCallback(
    async (playlistId, mutateTracks, sendToBackend) => {
      const bridge = getBridge();
      const previous = playlistsRef.current;
      const known = previous.some((entry) => entry.id === playlistId);

      // El adelanto visual es un lujo y solo se puede hacer si la playlist ya
      // está en el espejo local. No puede ser condición para mandar la
      // operación: playlistsRef se reescribe en cada render, así que una
      // playlist recién creada puede no estar todavía cuando entra la primera
      // pista — y abortar acá la perdía en silencio.
      if (known) {
        commit(
          previous.map((entry) =>
            entry.id === playlistId ? { ...entry, tracks: mutateTracks(entry.tracks) } : entry,
          ),
        );
      }

      if (!bridge) return;

      try {
        const result = await sendToBackend(bridge);
        if (result?.ok && result.playlist) replace(result.playlist);
        else if (known) commit(previous);
      } catch (_error) {
        if (known) commit(previous);
      }
    },
    [commit, replace],
  );

  const addTrack = useCallback(
    async (playlistId, trackPath) =>
      applyOptimistic(
        playlistId,
        // Idempotente también acá: el backend no duplica y el optimismo tampoco
        // debe hacerlo, o la fila parpadea duplicada hasta que responde.
        (tracks) => (tracks.includes(trackPath) ? tracks : [...tracks, trackPath]),
        (bridge) => bridge.addTrack(playlistId, trackPath),
      ),
    [applyOptimistic],
  );

  const removeTrack = useCallback(
    async (playlistId, trackPath) =>
      applyOptimistic(
        playlistId,
        (tracks) => tracks.filter((entry) => entry !== trackPath),
        (bridge) => bridge.removeTrack(playlistId, trackPath),
      ),
    [applyOptimistic],
  );

  const reorder = useCallback(
    async (playlistId, fromIndex, toIndex) =>
      applyOptimistic(
        playlistId,
        (tracks) => {
          if (fromIndex === toIndex) return tracks;
          if (fromIndex < 0 || fromIndex >= tracks.length) return tracks;
          if (toIndex < 0 || toIndex >= tracks.length) return tracks;

          const next = [...tracks];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return next;
        },
        (bridge) => bridge.reorder(playlistId, fromIndex, toIndex),
      ),
    [applyOptimistic],
  );

  return {
    playlists,
    refresh,
    create,
    rename,
    remove,
    addTrack,
    removeTrack,
    reorder,
    pickCover,
    removeCover,
    importM3u,
  };
}

export default usePlaylists;
