import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Onboarding from './components/Onboarding';
import TaskPanel from './components/TaskPanel';
import Actividades from './pages/Actividades';
import Horario from './pages/Horario';
import Calificaciones from './pages/Calificaciones';
import Ajustes from './pages/Ajustes';

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
  calificaciones: {
    title: 'Calificaciones',
    description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
    component: Calificaciones,
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
  const [activePage, setActivePage] = useState('activities');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [activities, setActivities] = useState([]);
  const [horario, setHorario] = useState({ materias: [], diasConClases: [] });
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHorario, setLoadingHorario] = useState(false);
  const [loadingCIA, setLoadingCIA] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
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
  const [ciaCargado, setCiaCargado] = useState(false);
  const [studentName, setStudentName] = useState('');

  const initializedRef = useRef(false);
  const nearExpiryRefreshLaunchedRef = useRef(false);

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  const api = typeof window !== 'undefined' ? window.scraperApp : null;

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
    };

    setActivePage(pageAliases[pageId] || pageId);
  };

  const refreshSettings = async () => {
    if (!api?.getSettings) {
      setShowOnboarding(false);
      setSettingsReady(true);
      return;
    }

    try {
      const settings = await api.getSettings();
      const hasUser = Boolean(settings?.user?.trim());
      const hasPassword = Boolean(settings?.hasPassword);
      const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
      setStudentName(formatStudentDisplayName(preferredIdentity));
      setShowOnboarding(!(hasUser || hasPassword));
      setActividadesCargado(false);
      setHorarioCargado(false);
      setCiaCargado(false);
      initializedRef.current = false;
      nearExpiryRefreshLaunchedRef.current = false;
    } catch (_error) {
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
          setError('ScraperApp debe ejecutarse dentro de Electron.');
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
          setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
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
          setErrorHorario('ScraperApp debe ejecutarse dentro de Electron.');
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

  const handleSyncAll = async () => {
    if (!api?.syncAll) {
      return;
    }

    setSyncingAll(true);
    addSyncingModule('activities');
    addSyncingModule('horario');
    addSyncingModule('calificaciones');

    try {
      const result = await api.syncAll();

      if (result?.actividades?.activities) {
        setActivities(result.actividades.activities);
        if (result.actividades?.timestamp) {
          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
        }
      }

      if (result?.horario?.materias) {
        setHorario({
          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
          diasConClases: Array.isArray(result.horario.diasConClases)
            ? result.horario.diasConClases
            : [],
        });
        if (result.horario?.timestamp) {
          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
        }
      }

      if (result?.calificaciones?.materias) {
        setCalificaciones(result.calificaciones.materias);
        if (result.calificaciones?.timestamp) {
          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
        }
      }
    } catch (_error) {
      // Fallo silencioso: cada módulo maneja sus errores individualmente.
    } finally {
      removeSyncingModule('activities');
      removeSyncingModule('horario');
      removeSyncingModule('calificaciones');
      setSyncingAll(false);
    }
  };

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
    if (activePage === 'calificaciones' && !ciaCargado) {
      setCiaCargado(true);
      loadCalificaciones({ silent: true });
    }
  }, [activePage, ciaCargado]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        {!settingsReady ? (
          <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Workspace</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  Cargando configuración inicial...
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Verificando credenciales locales antes de mostrar el contenido.
                </p>
              </div>
            </div>
          </main>
        ) : showOnboarding && activePage === 'activities' ? (
          <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
            <Onboarding onNavigate={handleNavigate} />
          </main>
        ) : (
          <TaskPanel title={pageConfig.title} description={pageConfig.description}>
            <ActivePage
              activities={activities}
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
              loadingCIA={loadingCIA}
              loadingHorario={loadingHorario}
              loading={loading}
              onSettingsSaved={refreshSettings}
              onSync={handleSyncActivities}
              onSyncHorario={({ clearCacheFirst = false } = {}) =>
                loadHorario({ clearCacheFirst })
              }
              onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
              onNavigate={handleNavigate}
              progress={progress}
            />
          </TaskPanel>
        )}
      </div>
    </div>
  );
}

export default App;
