import { useCallback, useEffect, useMemo, useState } from 'react';

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

// La lista vive en el módulo y no en cada instancia del hook. Con estado por
// instancia, dos componentes montados a la vez tenían dos listas: marcar un
// favorito desde la cola no se veía en la biblioteca hasta recargar. Esto
// además elimina el espejo en ref — `sharedPaths` ya es síncrono, así que
// toggle puede leerlo sin pelearse con los updaters diferidos de React.
let sharedPaths = [];
const subscribers = new Set();
let loadPromise = null;

function publish(next) {
  sharedPaths = next;
  for (const notify of subscribers) {
    notify(next);
  }
}

// Una sola lectura del disco por sesión, la pida quien la pida.
function loadOnce() {
  if (loadPromise) return loadPromise;

  const bridge = window.scraperApp?.favorites;

  if (!bridge) {
    publish(readFallback());
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = bridge
    .list()
    .then((data) => publish(data?.paths || []))
    .catch(() => {});

  return loadPromise;
}

function useFavorites() {
  const [paths, setPaths] = useState(sharedPaths);

  useEffect(() => {
    subscribers.add(setPaths);
    // Realinear al montar: otra instancia pudo haber cargado o tocado la lista
    // mientras esta todavía no existía.
    setPaths(sharedPaths);
    loadOnce();

    return () => {
      subscribers.delete(setPaths);
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

    const previous = sharedPaths;
    const wasFavorite = previous.includes(normalized);
    const next = wasFavorite
      ? previous.filter((entry) => entry !== normalized)
      : [...previous, normalized];

    // Optimista: el corazón cambia en el mismo frame del click. Esperar al IPC
    // deja un hueco de ~200ms que se siente roto.
    publish(next);

    if (!bridge) {
      writeFallback(next);
      return;
    }

    try {
      const result = wasFavorite ? await bridge.remove(normalized) : await bridge.add(normalized);
      // Realinear con la fuente de verdad: si otro punto de la app tocó el
      // archivo, gana el disco y no el estado optimista.
      if (result?.paths) {
        publish(result.paths);
      } else if (!result?.ok) {
        publish(previous);
      }
    } catch (_error) {
      publish(previous);
    }
  }, []);

  return { has, toggle, paths };
}

export default useFavorites;
