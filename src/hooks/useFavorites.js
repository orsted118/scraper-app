import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'dvpotro-music-favorites';

// Fuera de Electron (dev en navegador) no hay bridge: localStorage cumple el
// mismo contrato para poder trabajar la UI sin levantar la app completa.
function readFallback() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (_error) {
    return [];
  }
}

function writeFallback(paths) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch (_error) {
    // storage lleno o bloqueado: la sesión sigue, solo no persiste.
  }
}

function useFavorites() {
  const [paths, setPaths] = useState([]);
  // Espejo síncrono del state. React difiere los updaters funcionales, así que
  // dentro de toggle no hay forma de leer la lista actual desde setPaths: lo
  // que se calcule ahí adentro todavía no corrió cuando sigue la ejecución.
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  useEffect(() => {
    let active = true;
    const bridge = window.scraperApp?.favorites;

    if (!bridge) {
      setPaths(readFallback());
      return () => {};
    }

    bridge
      .list()
      .then((data) => {
        if (active) setPaths(data?.paths || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // El Set se deriva una vez por cambio de lista. Reconstruirlo en cada `has()`
  // sería O(n) por fila y con 500 pistas se nota al scrollear.
  const pathSet = useMemo(() => new Set(paths), [paths]);
  const has = useCallback((path) => pathSet.has(path), [pathSet]);

  const toggle = useCallback(async (path) => {
    const normalized = String(path || '').trim();
    if (!normalized) return;

    const bridge = window.scraperApp?.favorites;

    const previous = pathsRef.current;
    const wasFavorite = previous.includes(normalized);
    const next = wasFavorite
      ? previous.filter((entry) => entry !== normalized)
      : [...previous, normalized];

    // Optimista: el corazón cambia en el mismo frame del click. Esperar al IPC
    // deja un hueco de ~200ms que se siente roto.
    pathsRef.current = next;
    setPaths(next);

    if (!bridge) {
      writeFallback(next);
      return;
    }

    try {
      const result = wasFavorite ? await bridge.remove(normalized) : await bridge.add(normalized);
      // Realinear con la fuente de verdad: si otro punto de la app tocó el
      // archivo, gana el disco y no el estado optimista.
      if (result?.paths) {
        pathsRef.current = result.paths;
        setPaths(result.paths);
      } else if (!result?.ok) {
        pathsRef.current = previous;
        setPaths(previous);
      }
    } catch (_error) {
      pathsRef.current = previous;
      setPaths(previous);
    }
  }, []);

  return { has, toggle, paths };
}

export default useFavorites;
