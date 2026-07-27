import { useCallback, useEffect, useState } from 'react';

// El historial lo escribe el context al cruzar el umbral de scrobble; este hook
// solo lee. `refresh` existe porque la vista puede quedar abierta mientras suena
// una pista que termina de registrarse.
function useHistory() {
  const [entries, setEntries] = useState([]);

  const refresh = useCallback(async () => {
    const bridge = window.scraperApp?.history;
    if (!bridge) return;

    try {
      const data = await bridge.list();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch (_error) {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    const bridge = window.scraperApp?.history;
    if (!bridge) return;

    try {
      await bridge.clear();
      setEntries([]);
    } catch (_error) {
      // El disco falló: refresh() vuelve a mostrar lo que realmente quedó.
      refresh();
    }
  }, [refresh]);

  return { entries, refresh, clear };
}

export default useHistory;
