import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'dvpotro-hidden-activities';

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

function writeFallback(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (_error) {
    // storage lleno o bloqueado: la sesión sigue, solo no persiste.
  }
}

function useHiddenActivities() {
  const [hiddenIds, setHiddenIds] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const bridge = window.scraperApp?.hiddenActivities;

      if (!bridge) {
        setHiddenIds(readFallback());
        return;
      }

      const result = await bridge.get();

      if (active && result?.ok) {
        setHiddenIds(result.ids);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const hide = useCallback(async (id) => {
    const normalized = String(id || '').trim();

    if (!normalized) {
      return;
    }

    const bridge = window.scraperApp?.hiddenActivities;

    if (!bridge) {
      setHiddenIds((current) => {
        const next = current.includes(normalized) ? current : [...current, normalized];
        writeFallback(next);
        return next;
      });
      return;
    }

    const result = await bridge.add(normalized);

    if (result?.ok) {
      setHiddenIds(result.ids);
    }
  }, []);

  const unhide = useCallback(async (id) => {
    const normalized = String(id || '').trim();
    const bridge = window.scraperApp?.hiddenActivities;

    if (!bridge) {
      setHiddenIds((current) => {
        const next = current.filter((entry) => entry !== normalized);
        writeFallback(next);
        return next;
      });
      return;
    }

    const result = await bridge.remove(normalized);

    if (result?.ok) {
      setHiddenIds(result.ids);
    }
  }, []);

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const isHidden = useCallback((id) => hiddenSet.has(String(id)), [hiddenSet]);

  return { hiddenIds, hide, unhide, isHidden };
}

export default useHiddenActivities;
