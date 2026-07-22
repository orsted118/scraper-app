import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SETTINGS = { enabled: true, intervalMinutes: 15, lastSyncAt: null };
const INITIAL_DELAY_MS = 2000;
const RATE_LIMIT_MS = 5 * 60 * 1000;
const RESUME_MIN_GAP_MS = 10 * 60 * 1000;

function elapsedSince(iso) {
  if (!iso) return Infinity;

  const time = new Date(iso).getTime();

  if (!Number.isFinite(time)) return Infinity;

  return Date.now() - time;
}

export default function useAutoSync({ syncStatus, hasCredentials, onTrigger }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const guardsRef = useRef({ syncStatus, hasCredentials, onTrigger });
  const inFlightRef = useRef(false);

  useEffect(() => {
    guardsRef.current = { syncStatus, hasCredentials, onTrigger };
  });

  const refresh = useCallback(async () => {
    const api = typeof window !== 'undefined' ? window.scraperApp : null;

    if (!api?.getAutoSyncSettings) {
      setReady(true);
      return DEFAULT_SETTINGS;
    }

    try {
      const stored = await api.getAutoSyncSettings();
      const next = { ...DEFAULT_SETTINGS, ...(stored || {}) };
      setSettings(next);
      return next;
    } catch (error) {
      console.error('[auto-sync] no se pudo leer la configuración:', error?.message);
      return DEFAULT_SETTINGS;
    } finally {
      setReady(true);
    }
  }, []);

  // Relee settings en cada intento: el toggle de Ajustes y lastSyncAt (que lo
  // escribe main tras cada sync exitoso) tienen que pesar en el momento exacto.
  const attempt = useCallback(
    async (reason) => {
      const { syncStatus: status, hasCredentials: credentialsOk, onTrigger: trigger } =
        guardsRef.current;
      const api = typeof window !== 'undefined' ? window.scraperApp : null;

      if (!api || typeof trigger !== 'function') {
        console.log('[auto-sync] skip: no-bridge');
        return;
      }

      if (!credentialsOk) {
        console.log('[auto-sync] skip: no-credentials');
        return;
      }

      if (status === 'syncing' || inFlightRef.current) {
        console.log('[auto-sync] skip: already-syncing');
        return;
      }

      const current = await refresh();

      if (!current.enabled) {
        console.log('[auto-sync] skip: disabled');
        return;
      }

      const elapsed = elapsedSince(current.lastSyncAt);

      if (elapsed < RATE_LIMIT_MS) {
        console.log('[auto-sync] skip: rate-limited');
        return;
      }

      if (reason === 'power-resume' && elapsed < RESUME_MIN_GAP_MS) {
        console.log('[auto-sync] skip: too-soon');
        return;
      }

      console.log(`[auto-sync] triggering: ${reason}`);
      inFlightRef.current = true;

      try {
        await trigger();
      } catch (error) {
        // Silencio en UI a propósito: el error ya viaja a Notificaciones vía processSyncError.
        console.error('[auto-sync] el sync automático falló:', error?.message);
      } finally {
        inFlightRef.current = false;
        refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ready || !settings.enabled) {
      return undefined;
    }

    const timeout = setTimeout(() => attempt('initial'), INITIAL_DELAY_MS);

    return () => clearTimeout(timeout);
    // Solo al quedar lista la config: el kick inicial no se re-dispara si cambia el intervalo.
  }, [ready]);

  useEffect(() => {
    if (!ready || !settings.enabled) {
      return undefined;
    }

    const interval = setInterval(() => attempt('interval'), settings.intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [ready, settings.enabled, settings.intervalMinutes, attempt]);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.scraperApp : null;

    if (!api?.onPowerResume) {
      return undefined;
    }

    const unsubscribe = api.onPowerResume(() => attempt('power-resume'));

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [attempt]);

  return { settings, refresh };
}
