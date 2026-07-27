import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE } from './utils/motion';
import Sidebar from './components/Sidebar';
import BottomPlayerBar from './components/BottomPlayerBar';
import { useMusicPlayer } from './contexts/MusicPlayerContext';
import Onboarding from './components/Onboarding';
import TaskPanel from './components/TaskPanel';
import Actividades from './pages/Actividades';
import Horario from './pages/Horario';
import Calendario from './pages/Calendario';
import Calificaciones from './pages/Calificaciones';
import Notificaciones from './pages/Notificaciones';
import Musica from './pages/Musica';
import Notas from './pages/Notas';
import Ajustes from './pages/Ajustes';
import useAutoSync from './hooks/useAutoSync';
import useMusicShortcuts from './hooks/useMusicShortcuts';
import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';

const pageRegistry = {
  activities: {
    title: 'Actividades',
    description: 'Consulta y clasifica las actividades de iVirtual ITSON por estado.',
    component: Actividades,
  },
  horario: {
    title: 'Horario',
    description: 'Visualiza clases del semestre y enlaces de videollamada para materias en línea.',
    component: Horario,
  },
  calendario: {
    title: 'Calendario Escolar',
    description: 'Consulta fechas académicas oficiales publicadas por ITSON.',
    component: Calendario,
  },
  notifications: {
    title: 'Notificaciones',
    description: 'Bandeja visual de avisos simulados de CIA, iVirtual, horario y calendario.',
    component: Notificaciones,
  },
  calificaciones: {
    title: 'Calificaciones',
    description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
    component: Calificaciones,
  },
  musica: {
    title: 'Música',
    description: 'Reproduce tu música local mientras estudias.',
    component: Musica,
  },
  notas: {
    title: 'Notas',
    description: 'Captura ideas, listas y pendientes al estilo Keep.',
    component: Notas,
  },
  settings: {
    title: 'Ajustes',
    description: 'Revisa el estado de la integración y la configuración local requerida.',
    component: Ajustes,
  },
};

const ACTIVITIES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function App() {
  const reduced = useReducedMotion();
  // Atajos del reproductor a nivel app: la música suena aunque estés en otro módulo.
  useMusicShortcuts();
  const musicPlayer = useMusicPlayer();
  const [activePage, setActivePage] = useState('activities');
  // Deep-link a una nota puntual (desde app://notas?note={id} de un recordatorio).
  const [notasDeepLink, setNotasDeepLink] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [activities, setActivities] = useState([]);
  const [horario, setHorario] = useState({ materias: [], diasConClases: [] });
  const [calendarData, setCalendarData] = useState({ events: [], calendarTypes: [], timestamp: null, error: null });
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHorario, setLoadingHorario] = useState(false);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const [loadingCIA, setLoadingCIA] = useState(false);
  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
  const [syncingModules, setSyncingModules] = useState([]);
  const [error, setError] = useState('');
  const [errorHorario, setErrorHorario] = useState('');
  const [errorCIA, setErrorCIA] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorCIACode, setErrorCIACode] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [lastSyncHorario, setLastSyncHorario] = useState('');
  const [lastSyncCIA, setLastSyncCIA] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
  const [actividadesCargado, setActividadesCargado] = useState(false);
  const [horarioCargado, setHorarioCargado] = useState(false);
  const [calendarCargado, setCalendarCargado] = useState(false);
  const [ciaCargado, setCiaCargado] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [settingsData, setSettingsData] = useState({});

  const initializedRef = useRef(false);
  const nearExpiryRefreshLaunchedRef = useRef(false);

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const hasFinales = calificaciones.some(
    (materia) =>
      Array.isArray(materia.calificaciones) &&
      materia.calificaciones.some(
        (calificacion) =>
          calificacion.parcial === 'Final' && calificacion.calificacion !== null,
      ),
  );
  const proximaEntrega = useMemo(() => {
    const pending = (activities || []).filter(
      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
    );

    if (!pending.length) {
      return null;
    }

    return [...pending].sort((left, right) => {
      if (!left.fechaLimite) return 1;
      if (!right.fechaLimite) return -1;
      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
    })[0];
  }, [activities]);
  const calendarCount = useMemo(() => {
    const now = Date.now();
    const in30 = now + 30 * 24 * 60 * 60 * 1000;

    return (calendarData.events || []).filter((event) => {
      const time = new Date(event.inicio).getTime();
      return Number.isFinite(time) && time >= now && time <= in30;
    }).length;
  }, [calendarData]);

  const addSyncingModule = (moduleId) => {
    setSyncingModules((previous) => {
      if (previous.includes(moduleId)) {
        return previous;
      }
      return [...previous, moduleId];
    });
  };

  const removeSyncingModule = (moduleId) => {
    setSyncingModules((previous) => previous.filter((item) => item !== moduleId));
  };

  const formatStudentDisplayName = (value = '') => {
    const normalized = String(value || '').trim();

    if (!normalized) {
      return '';
    }

    if (/^\d+$/.test(normalized)) {
      return `ID ${normalized}`;
    }

    return normalized;
  };

  const getFriendlyIVirtualError = (message = '') => {
    const errorMap = {
      NO_CREDENTIALS: 'No has configurado tus credenciales de iVirtual. Ve a Ajustes para hacerlo.',
      NO_USER: 'Falta tu ID de usuario en la configuración. Ve a Ajustes.',
      NO_PASSWORD: 'Falta tu contraseña en la configuración. Ve a Ajustes.',
      SESSION_EXPIRED:
        'Tu sesión de iVirtual expiró o las credenciales son incorrectas. Ve a Ajustes y verifica tu contraseña.',
      LOGIN_FAILED:
        'No fue posible iniciar sesión en iVirtual. Verifica tus credenciales en Ajustes.',
      NO_INTERNET: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.',
      CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
      CIA_NO_USER: 'Falta tu usuario del CIA en la configuración. Ve a Ajustes.',
      CIA_NO_PASSWORD: 'Falta tu contraseña del CIA en la configuración. Ve a Ajustes.',
      CIA_SCHEDULE_UNAVAILABLE:
        'El CIA reporta que tu horario no está disponible en este momento. Intenta más tarde o valida acceso directamente en el portal.',
    };

    if (errorMap[message]) {
      return errorMap[message];
    }

    return message?.includes('Timeout')
      ? 'iVirtual tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
      : message || 'Error desconocido.';
  };

  const handleNavigate = (pageId) => {
    const pageAliases = {
      actividades: 'activities',
      horario: 'horario',
      calificaciones: 'calificaciones',
      ajustes: 'settings',
      calendario: 'calendario',
      notifications: 'notifications',
      notificaciones: 'notifications',
      musica: 'musica',
      notas: 'notas',
    };

    // actionUrl puede traer query (ej. 'notas?note=abc' desde un recordatorio):
    // resolver la página por su base y pasar el noteId al deep-link de Notas.
    const [base, qs] = String(pageId).split('?');
    const nextPage = pageAliases[base] || base;

    if (nextPage === 'notas') {
      const noteId = new URLSearchParams(qs || '').get('note');
      // objeto nuevo cada vez: fuerza el efecto aunque sea el mismo noteId.
      setNotasDeepLink(noteId ? { noteId, ts: Date.now() } : null);
    }

    if (nextPage === 'calificaciones' && !hasFinales) {
      setActivePage('activities');
      return;
    }

    setActivePage(nextPage);
  };

  const refreshSettings = async () => {
    if (!api?.getSettings) {
      setShowOnboarding(false);
      setSettingsReady(true);
      return;
    }

    try {
      const settings = await api.getSettings();
      setSettingsData(settings || {});
      const hasUser = Boolean(settings?.user?.trim());
      const hasPassword = Boolean(settings?.hasPassword);
      const preferredIdentity =
        settings?.studentName?.trim() || settings?.ciaUser?.trim() || settings?.user?.trim() || '';
      setStudentName(formatStudentDisplayName(preferredIdentity));
      setShowOnboarding(!(hasUser || hasPassword));
      setActividadesCargado(false);
      setHorarioCargado(false);
      setCalendarCargado(false);
      setCiaCargado(false);
      initializedRef.current = false;
      nearExpiryRefreshLaunchedRef.current = false;
    } catch (_error) {
      setSettingsData({});
      setStudentName('');
      setShowOnboarding(false);
    } finally {
      setSettingsReady(true);
    }
  };

  const loadActivities = async ({ clearCacheFirst = false, silent = false } = {}) => {
    let response;

    if (silent) {
      addSyncingModule('activities');
    } else {
      setLoading(true);
      setError('');
      setErrorCode('');
      setProgress({ current: 0, total: 0, curso: '' });
    }

    try {
      if (!api) {
        if (!silent) {
          setError('DVPotro debe ejecutarse dentro de Electron.');
          setErrorCode('');
          setActivities([]);
        }
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearCache();

        if (cacheResult?.success === false) {
          if (!silent) {
            setError(cacheResult.error || 'No fue posible limpiar el caché local.');
            setErrorCode(cacheResult.error || '');
            setActivities([]);
          }
          return;
        }
      }

      response = await api.runScraper();

      if (response?.error) {
        if (!silent) {
          setErrorCode(response.error);
          setError(getFriendlyIVirtualError(response.error));
          if (!activities.length) {
            setActivities([]);
          }
        }
        return;
      }

      const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
      setActivities(activitiesList);
      setError('');
      setErrorCode('');

      if (!studentName) {
        const inferredName =
          activitiesList.find(
            (item) => item?.nombreAlumno || item?.alumno || item?.estudiante || item?.userName,
          ) || {};
        const candidate =
          inferredName?.nombreAlumno ||
          inferredName?.alumno ||
          inferredName?.estudiante ||
          inferredName?.userName ||
          '';
        if (candidate) {
          setStudentName(formatStudentDisplayName(candidate));
        }
      }

      if (response?.timestamp) {
        setLastSyncAt(new Date(response.timestamp).toISOString());
      }

      if (activitiesList.length > 0 && typeof api.checkNotifications === 'function') {
        await api.checkNotifications(activitiesList);
      }

      if (
        response?.fromCache &&
        response?.timestamp &&
        !clearCacheFirst &&
        !nearExpiryRefreshLaunchedRef.current
      ) {
        const ageMs = Date.now() - response.timestamp;
        const remainingMs = ACTIVITIES_CACHE_TTL_MS - ageMs;

        if (remainingMs > 0 && remainingMs <= ONE_HOUR_MS) {
          nearExpiryRefreshLaunchedRef.current = true;
          loadActivities({ clearCacheFirst: true, silent: true });
        }
      }

      if (!response?.fromCache) {
        nearExpiryRefreshLaunchedRef.current = false;
      }
    } catch (_error) {
      const rawError = response?.error || _error?.message || 'Error desconocido.';
      if (!silent) {
        setErrorCode(rawError);
        setError(getFriendlyIVirtualError(rawError));
        if (!activities.length) {
          setActivities([]);
        }
      }
    } finally {
      if (silent) {
        removeSyncingModule('activities');
      } else {
        setLoading(false);
      }
    }
  };

  const loadCalificaciones = async ({ clearCacheFirst = false, silent = false } = {}) => {
    let response;

    if (silent) {
      addSyncingModule('calificaciones');
    } else {
      setLoadingCIA(true);
      setErrorCIA('');
      setErrorCIACode('');
    }

    try {
      if (!api) {
        if (!silent) {
          setErrorCIA('DVPotro debe ejecutarse dentro de Electron.');
          setErrorCIACode('');
          setCalificaciones([]);
        }
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearCIACache();

        if (cacheResult?.success === false) {
          if (!silent) {
            setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
            setErrorCIACode(cacheResult.error || '');
            setCalificaciones([]);
          }
          return;
        }
      }

      response = await api.runCIA();

      if (response?.error) {
        if (!silent) {
          setErrorCIACode(response.error);
          setErrorCIA(getFriendlyIVirtualError(response.error));
          if (!calificaciones.length) {
            setCalificaciones([]);
          }
        }
        return;
      }

      const materiasList = Array.isArray(response?.materias) ? response.materias : [];
      setCalificaciones(materiasList);
      setErrorCIA('');
      setErrorCIACode('');
      if (response?.timestamp) {
        setLastSyncCIA(new Date(response.timestamp).toISOString());
      }
    } catch (_error) {
      const rawError = response?.error || _error?.message || 'Error desconocido.';
      if (!silent) {
        setErrorCIACode(rawError);
        setErrorCIA(getFriendlyIVirtualError(rawError));
        if (!calificaciones.length) {
          setCalificaciones([]);
        }
      }
    } finally {
      if (silent) {
        removeSyncingModule('calificaciones');
      } else {
        setLoadingCIA(false);
      }
    }
  };

  const loadHorario = async ({ clearCacheFirst = false, silent = false } = {}) => {
    let response;

    if (silent) {
      addSyncingModule('horario');
    } else {
      setLoadingHorario(true);
      setErrorHorario('');
    }

    try {
      if (!api) {
        if (!silent) {
          setErrorHorario('DVPotro debe ejecutarse dentro de Electron.');
          setHorario({ materias: [], diasConClases: [] });
        }
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearHorarioCache();

        if (cacheResult?.success === false) {
          if (!silent) {
            setErrorHorario(
              cacheResult.error || 'No fue posible limpiar el caché local del horario.',
            );
            setHorario({ materias: [], diasConClases: [] });
          }
          return;
        }
      }

      response = await api.runHorario();

      if (response?.error) {
        if (!silent) {
          setErrorHorario(getFriendlyIVirtualError(response.error));
          if (!horario?.materias?.length) {
            setHorario({ materias: [], diasConClases: [] });
          }
        }
        return;
      }

      setHorario({
        materias: Array.isArray(response?.materias) ? response.materias : [],
        diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
      });
      setErrorHorario('');
      if (response?.timestamp) {
        setLastSyncHorario(new Date(response.timestamp).toISOString());
      }
    } catch (_error) {
      const rawError = response?.error || _error?.message || 'Error desconocido.';
      if (!silent) {
        setErrorHorario(getFriendlyIVirtualError(rawError));
        if (!horario?.materias?.length) {
          setHorario({ materias: [], diasConClases: [] });
        }
      }
    } finally {
      if (silent) {
        removeSyncingModule('horario');
      } else {
        setLoadingHorario(false);
      }
    }
  };

  const loadCalendar = async (options = {}) => {
    const normalizedOptions = typeof options === 'string' ? { calendarType: options } : options || {};
    const { clearCacheFirst = false, silent = false } = normalizedOptions;
    const savedCalendarType = (() => {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem('dvpotro-cal-type') : null;
      } catch (_error) {
        return null;
      }
    })();
    const calendarType =
      normalizedOptions.calendarType ||
      calendarData.calendarType ||
      savedCalendarType ||
      'Profesional Asociado y Licenciatura';

    if (silent) {
      addSyncingModule('calendario');
    } else {
      setIsCalendarSyncing(true);
    }

    try {
      if (!api?.runCalendario) {
        if (!silent) {
          setCalendarData({
            events: [],
            calendarTypes: [],
            calendarType,
            timestamp: null,
            error: 'DVPotro debe ejecutarse dentro de Electron.',
          });
        }
        return;
      }

      if (clearCacheFirst && api.clearCalendarioCache) {
        await api.clearCalendarioCache();
      }

      const result = await api.runCalendario({ calendarType });

      if (result?.error) {
        setCalendarData({
          events: [],
          calendarTypes: Array.isArray(calendarData.calendarTypes) ? calendarData.calendarTypes : [],
          calendarType,
          timestamp: null,
          error: result.error,
        });
        return;
      }

      setCalendarData({
        events: Array.isArray(result?.events) ? result.events : [],
        calendarTypes: Array.isArray(result?.calendarTypes) ? result.calendarTypes : [],
        calendarType: result?.calendarType || calendarType,
        timestamp: result?.timestamp || null,
        error: null,
      });
    } catch (error) {
      setCalendarData({
        events: [],
        calendarTypes: Array.isArray(calendarData.calendarTypes) ? calendarData.calendarTypes : [],
        calendarType,
        timestamp: null,
        error: error?.message || 'No fue posible cargar el calendario escolar.',
      });
    } finally {
      if (silent) {
        removeSyncingModule('calendario');
      } else {
        setIsCalendarSyncing(false);
      }
    }
  };

  const handleSyncAll = async () => {
    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;

    if (syncState.status === 'syncing' || !scraperApi) {
      return;
    }

    setSyncState((current) => ({ ...current, status: 'syncing' }));
    addSyncingModule('activities');
    addSyncingModule('horario');
    addSyncingModule('calendario');
    if (hasFinales) {
      addSyncingModule('calificaciones');
    }

    try {
      const calls = [
        { id: 'activities', promise: scraperApi.runScraper?.() },
        { id: 'horario', promise: scraperApi.runHorario?.() },
        { id: 'calendario', promise: scraperApi.runCalendario?.({}) },
      ];

      if (hasFinales) {
        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
      }

      const results = await Promise.allSettled(calls.map((call) => call.promise));
      let hasErrors = false;

      results.forEach((result, index) => {
        const moduleId = calls[index]?.id;

        if (result.status === 'rejected') {
          hasErrors = true;
          return;
        }

        const response = result.value;

        if (response?.error) {
          hasErrors = true;

          if (moduleId === 'activities') {
            setErrorCode(response.error);
            setError(getFriendlyIVirtualError(response.error));
          }

          if (moduleId === 'horario') {
            setErrorHorario(getFriendlyIVirtualError(response.error));
          }

          if (moduleId === 'calendario') {
            setCalendarData({ events: [], calendarTypes: [], timestamp: null, error: response.error });
          }

          if (moduleId === 'calificaciones') {
            setErrorCIACode(response.error);
            setErrorCIA(getFriendlyIVirtualError(response.error));
          }

          return;
        }

        if (moduleId === 'activities') {
          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
          setActivities(activitiesList);
          setError('');
          setErrorCode('');
          if (response?.timestamp) {
            setLastSyncAt(new Date(response.timestamp).toISOString());
          }
        }

        if (moduleId === 'horario') {
          setHorario({
            materias: Array.isArray(response?.materias) ? response.materias : [],
            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
          });
          setErrorHorario('');
          if (response?.timestamp) {
            setLastSyncHorario(new Date(response.timestamp).toISOString());
          }
        }

        if (moduleId === 'calendario') {
          setCalendarData({
            events: Array.isArray(response?.events) ? response.events : [],
            calendarTypes: Array.isArray(response?.calendarTypes) ? response.calendarTypes : [],
            calendarType: response?.calendarType || 'Profesional Asociado y Licenciatura',
            timestamp: response?.timestamp || null,
            error: null,
          });
        }

        if (moduleId === 'calificaciones') {
          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
          setCalificaciones(materiasList);
          setErrorCIA('');
          setErrorCIACode('');
          if (response?.timestamp) {
            setLastSyncCIA(new Date(response.timestamp).toISOString());
          }
        }
      });

      const nextStatus = hasErrors ? 'error' : 'done';
      setSyncState({ status: nextStatus, lastSync: new Date() });
      setTimeout(
        () => setSyncState((current) => ({ ...current, status: 'idle' })),
        hasErrors ? 4000 : 3000,
      );
    } catch (_error) {
      setSyncState((current) => ({ ...current, status: 'error' }));
      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
    } finally {
      removeSyncingModule('activities');
      removeSyncingModule('horario');
      removeSyncingModule('calendario');
      if (hasFinales) {
        removeSyncingModule('calificaciones');
      }
    }
  };

  const hasIVirtualCredentials =
    Boolean(settingsData?.user?.trim()) && Boolean(settingsData?.hasPassword);

  const { refresh: refreshAutoSyncSettings } = useAutoSync({
    syncStatus: syncState.status,
    hasCredentials: hasIVirtualCredentials,
    onTrigger: handleSyncAll,
  });

  useEffect(() => {
    refreshSettings();
  }, [api]);

  useEffect(() => {
    if (!settingsReady || showOnboarding || !api || initializedRef.current) {
      return undefined;
    }

    initializedRef.current = true;

    if (!actividadesCargado) {
      setActividadesCargado(true);
      loadActivities({ silent: true });
    }

    const horarioTimeout = setTimeout(() => {
      if (!horarioCargado) {
        setHorarioCargado(true);
        loadHorario({ silent: true });
      }
    }, 2000);

    const ciaTimeout = setTimeout(() => {
      if (!ciaCargado) {
        setCiaCargado(true);
        loadCalificaciones({ silent: true });
      }
    }, 4000);

    return () => {
      clearTimeout(horarioTimeout);
      clearTimeout(ciaTimeout);
    };
  }, [settingsReady, showOnboarding, api, actividadesCargado, horarioCargado, ciaCargado]);

  useEffect(() => {
    if (activePage === 'horario' && !horarioCargado) {
      setHorarioCargado(true);
      loadHorario({ silent: true });
    }
  }, [activePage, horarioCargado]);

  useEffect(() => {
    if (activePage === 'calendario' && !calendarCargado) {
      setCalendarCargado(true);
      loadCalendar({ silent: true });
    }
  }, [activePage, calendarCargado]);

  useEffect(() => {
    if (activePage === 'calificaciones' && !ciaCargado) {
      setCiaCargado(true);
      loadCalificaciones({ silent: true });
    }
  }, [activePage, ciaCargado]);

  useEffect(() => {
    if (activePage === 'calificaciones' && !hasFinales) {
      setActivePage('activities');
    }
  }, [activePage, hasFinales]);

  useEffect(() => {
    if (!api) return;

    api.onProgress((data) => {
      setProgress({
        current: data?.current || 0,
        total: data?.total || 0,
        curso: data?.curso || '',
      });
    });

    return () => {
      api.removeProgress();
    };
  }, [api]);

  const handleSyncActivities = () => loadActivities({ clearCacheFirst: true });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8"
        // Reserva para la barra fija solo cuando hay algo sonando: sin pista no
        // se dibuja nada y el hueco sería aire muerto al final de cada módulo.
        style={musicPlayer?.currentTrack ? { paddingBottom: 'var(--player-bar-height)' } : undefined}
      >
        <Sidebar
          activePage={activePage}
          activities={activities}
          calendarCount={calendarCount}
          diasConClases={horario?.diasConClases ?? []}
          errorHorario={errorHorario}
          hasFinales={hasFinales}
          horario={horario?.materias ?? []}
          horarioData={horario}
          onSyncAll={handleSyncAll}
          onNavigate={handleNavigate}
          proximaEntrega={proximaEntrega}
          settingsData={settingsData}
          studentName={studentName}
          syncState={syncState}
        />
        {!settingsReady ? (
          <main
            className="flex-1 border p-8"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: 'var(--radius-card, 0px)' }}
          >
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
              <div
                className="border px-8 py-10 text-center"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius-card, 0px)',
                  boxShadow: 'var(--shadow-card, none)',
                }}
              >
                <img
                  src={dvpotroLogo}
                  alt="DVPotro"
                  className="mx-auto h-14 w-14 object-contain"
                  draggable="false"
                />
                <p
                  className="mt-5 text-sm uppercase tracking-[0.25em]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
                >
                  DVPotro
                </p>
                <p
                  className="mt-3 text-lg font-semibold"
                  style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
                >
                  Cargando configuración inicial...
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Verificando credenciales locales antes de mostrar el contenido.
                </p>
              </div>
            </div>
          </main>
        ) : showOnboarding && activePage === 'activities' ? (
          <main
            className="flex-1 border p-8"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: 'var(--radius-card, 0px)' }}
          >
            <Onboarding onNavigate={handleNavigate} />
          </main>
        ) : (
          // Solo el switch entre modulos del pageRegistry se anima: onboarding y
          // el shell de carga son estados puntuales, no navegacion.
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePage}
              className="flex min-w-0 flex-1"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
            >
              <TaskPanel title={pageConfig.title} description={pageConfig.description}>
                <ActivePage
                  activities={activities}
                  calendarData={calendarData}
                  calificaciones={calificaciones}
                  horario={horario}
                  errorCIA={errorCIA}
                  errorCIACode={errorCIACode}
                  errorCode={errorCode}
                  error={error}
                  errorHorario={errorHorario}
                  lastSyncCIA={lastSyncCIA}
                  lastSyncAt={lastSyncAt}
                  lastSyncHorario={lastSyncHorario}
                  isSyncing={isCalendarSyncing}
                  loadingCIA={loadingCIA}
                  loadingHorario={loadingHorario}
                  loading={loading}
                  onSettingsSaved={refreshSettings}
                  onAutoSyncChanged={refreshAutoSyncSettings}
                  onSync={activePage === 'calendario' ? loadCalendar : handleSyncActivities}
                  onSyncHorario={loadHorario}
                  onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
                  onNavigate={handleNavigate}
                  deepLink={activePage === 'notas' ? notasDeepLink : null}
                  progress={progress}
                />
              </TaskPanel>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* La barra vive en el shell y no en Música: el audio es global de la app
          y seguía al scroll cuando colgaba del flow de la página. Se retorna
          null sola si no hay pista, así que el wrapper queda vacío sin ocupar.
          El contenido va centrado al mismo ancho que el resto del layout. */}
      <div className="fixed inset-x-0 bottom-0 z-30" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto max-w-[1500px] px-6">
          <BottomPlayerBar />
        </div>
      </div>
    </div>
  );
}

export default App;

