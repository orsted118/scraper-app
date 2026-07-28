import { useCallback, useEffect, useState } from 'react';

function getBridge() {
  return typeof window !== 'undefined' ? window.scraperApp?.music : null;
}

// Punto único donde el renderer lee la biblioteca. Además de cargarla al
// arranque, se suscribe a los avisos del watcher: agregar o borrar un archivo en
// cualquier carpeta se refleja sin pedir un re-escaneo.
function useLibrary() {
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const bridge = getBridge();

    if (!bridge?.getLibrary) {
      setLoading(false);
      return () => {};
    }

    bridge
      .getLibrary()
      .then((data) => {
        if (mounted) setLibrary(data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // La suscripción vive aunque el módulo Música no esté montado: el state queda
  // fresco y al volver a la vista ya está, sin re-escanear.
  useEffect(() => {
    const bridge = getBridge();
    if (!bridge?.onLibraryUpdated) return undefined;

    return bridge.onLibraryUpdated((payload) => {
      if (payload?.library) setLibrary(payload.library);
    });
  }, []);

  const addFolder = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge?.pickFolder) return { error: 'Disponible solo dentro de Electron.' };

    // El picker es modal y queda fuera de cualquier lock: main lo abre suelto.
    const folderPath = await bridge.pickFolder();
    if (!folderPath) return { canceled: true };

    const result = await bridge.addFolder(folderPath);
    if (result && !result.error) setLibrary(result);
    return result;
  }, []);

  const removeFolder = useCallback(async (folderPath) => {
    const bridge = getBridge();
    if (!bridge?.removeFolder) return { ok: false };

    const result = await bridge.removeFolder(folderPath);
    if (result?.library) setLibrary(result.library);
    return result;
  }, []);

  const refreshAll = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge?.refresh) return { error: 'Disponible solo dentro de Electron.' };

    const result = await bridge.refresh();
    if (result && !result.error) setLibrary(result);
    return result;
  }, []);

  return {
    library,
    loading,
    folders: library?.folders || [],
    tracks: library?.tracks || [],
    addFolder,
    removeFolder,
    refreshAll,
  };
}

export default useLibrary;
