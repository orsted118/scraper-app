import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TaskPanel from './components/TaskPanel';
import Actividades from './pages/Actividades';
import Calificaciones from './pages/Calificaciones';
import Files from './pages/Files';
import Ajustes from './pages/Ajustes';

const pageRegistry = {
  activities: {
    title: 'Actividades',
    description: 'Consulta y clasifica las actividades de iVirtual ITSON por estado.',
    component: Actividades,
  },
  calificaciones: {
    title: 'Calificaciones',
    description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
    component: Calificaciones,
  },
  files: {
    title: 'Archivos',
    description: 'Centraliza los adjuntos encontrados en las actividades de iVirtual.',
    component: Files,
  },
  settings: {
    title: 'Ajustes',
    description: 'Revisa el estado de la integración y la configuración local requerida.',
    component: Ajustes,
  },
};

function App() {
  const [activePage, setActivePage] = useState('activities');
  const [activities, setActivities] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCIA, setLoadingCIA] = useState(false);
  const [error, setError] = useState('');
  const [errorCIA, setErrorCIA] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorCIACode, setErrorCIACode] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [lastSyncCIA, setLastSyncCIA] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  const api = typeof window !== 'undefined' ? window.scraperApp : null;

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
      calificaciones: 'calificaciones',
      archivos: 'files',
      ajustes: 'settings',
    };

    setActivePage(pageAliases[pageId] || pageId);
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

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    if (activePage === 'calificaciones' && calificaciones.length === 0 && !loadingCIA && !lastSyncCIA) {
      loadCalificaciones();
    }
  }, [activePage]);

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
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        <TaskPanel title={pageConfig.title} description={pageConfig.description}>
          <ActivePage
            activities={activities}
            calificaciones={calificaciones}
            errorCIA={errorCIA}
            errorCIACode={errorCIACode}
            errorCode={errorCode}
            error={error}
            lastSyncCIA={lastSyncCIA}
            lastSyncAt={lastSyncAt}
            loadingCIA={loadingCIA}
            loading={loading}
            onSync={handleSyncActivities}
            onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
            onNavigate={handleNavigate}
            progress={progress}
          />
        </TaskPanel>
      </div>
    </div>
  );
}

export default App;
