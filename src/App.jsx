import { useEffect, useState } from 'react';
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

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  const api = typeof window !== 'undefined' ? window.scraperApp : null;

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
      SESSION_EXPIRED: 'Tu sesión de iVirtual expiró o las credenciales son incorrectas. Ve a Ajustes y verifica tu contraseña.',
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
    } catch (_error) {
      setStudentName('');
      setShowOnboarding(false);
    } finally {
      setSettingsReady(true);
    }
  };

  const loadActivities = async ({ clearCacheFirst = false } = {}) => {
    setLoading(true);
    setError('');
    setErrorCode('');
    setProgress({ current: 0, total: 0, curso: '' });
    let response;

    try {
      if (!api) {
        setError('ScraperApp debe ejecutarse dentro de Electron.');
        setErrorCode('');
        setActivities([]);
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearCache();

        if (cacheResult?.success === false) {
          setError(cacheResult.error || 'No fue posible limpiar el caché local.');
          setErrorCode(cacheResult.error || '');
          setActivities([]);
          return;
        }
      }

      response = await api.runScraper();

      if (response?.error) {
        setErrorCode(response.error);
        setError(getFriendlyIVirtualError(response.error));
        setActivities([]);
        return;
      }

      const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
      setActivities(activitiesList);
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
      setLastSyncAt(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
      if (activitiesList.length > 0 && typeof api.checkNotifications === 'function') {
        await api.checkNotifications(activitiesList);
      }
      setProgress({ current: 0, total: 0, curso: '' });
    } catch (_error) {
      const rawError = response?.error || _error?.message || 'Error desconocido.';
      setErrorCode(rawError);
      setError(getFriendlyIVirtualError(rawError));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCalificaciones = async ({ clearCacheFirst = false } = {}) => {
    setLoadingCIA(true);
    setErrorCIA('');
    setErrorCIACode('');
    let response;

    try {
      if (!api) {
        setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
        setErrorCIACode('');
        setCalificaciones([]);
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearCIACache();

        if (cacheResult?.success === false) {
          setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
          setErrorCIACode(cacheResult.error || '');
          setCalificaciones([]);
          return;
        }
      }

      response = await api.runCIA();

      if (response?.error) {
        setErrorCIACode(response.error);
        setErrorCIA(getFriendlyIVirtualError(response.error));
        setCalificaciones([]);
        return;
      }

      const materiasList = Array.isArray(response?.materias) ? response.materias : [];
      setCalificaciones(materiasList);
      setLastSyncCIA(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
    } catch (_error) {
      const rawError = response?.error || _error?.message || 'Error desconocido.';
      setErrorCIACode(rawError);
      setErrorCIA(getFriendlyIVirtualError(rawError));
      setCalificaciones([]);
    } finally {
      setLoadingCIA(false);
    }
  };

  const loadHorario = async ({ clearCacheFirst = false } = {}) => {
    setLoadingHorario(true);
    setErrorHorario('');
    let response;

    try {
      if (!api) {
        setErrorHorario('ScraperApp debe ejecutarse dentro de Electron.');
        setHorario({ materias: [], diasConClases: [] });
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearHorarioCache();

        if (cacheResult?.success === false) {
          setErrorHorario(cacheResult.error || 'No fue posible limpiar el caché local del horario.');
          setHorario({ materias: [], diasConClases: [] });
          return;
        }
      }

      response = await api.runHorario();

      if (response?.error) {
        setErrorHorario(getFriendlyIVirtualError(response.error));
        setHorario({ materias: [], diasConClases: [] });
        return;
      }

      setHorario({
        materias: Array.isArray(response?.materias) ? response.materias : [],
        diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
      });
      setLastSyncHorario(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
    } catch (_error) {
      const rawError = response?.error || _error?.message || 'Error desconocido.';
      setErrorHorario(getFriendlyIVirtualError(rawError));
      setHorario({ materias: [], diasConClases: [] });
    } finally {
      setLoadingHorario(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, [api]);

  useEffect(() => {
    if (
      settingsReady &&
      !showOnboarding &&
      activePage === 'activities' &&
      !actividadesCargado &&
      !loading
    ) {
      setActividadesCargado(true);
      loadActivities();
    }
  }, [activePage, actividadesCargado, loading, settingsReady, showOnboarding]);

  useEffect(() => {
    if (activePage === 'horario' && !horarioCargado && !loadingHorario) {
      setHorarioCargado(true);
      loadHorario();
    }
  }, [activePage, horarioCargado, loadingHorario]);

  useEffect(() => {
    if (activePage === 'calificaciones' && !ciaCargado && !loadingCIA) {
      setCiaCargado(true);
      loadCalificaciones();
    }
  }, [activePage, ciaCargado, loadingCIA]);

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
  }, []);

  const handleSyncActivities = () => loadActivities({ clearCacheFirst: true });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
        <Sidebar activePage={activePage} onNavigate={handleNavigate} userName={studentName} />
        {!settingsReady ? (
          <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Workspace</p>
                <p className="mt-3 text-lg font-semibold text-white">Cargando configuración inicial...</p>
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
              onSyncHorario={({ clearCacheFirst = false } = {}) => loadHorario({ clearCacheFirst })}
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
