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
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [lastSyncCIA, setLastSyncCIA] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  const api = typeof window !== 'undefined' ? window.scraperApp : null;

  const getFriendlyIVirtualError = (message = '') =>
    message?.includes('Timeout')
      ? 'iVirtual tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
      : message || 'Error desconocido.';

  const loadActivities = async ({ clearCacheFirst = false } = {}) => {
    setLoading(true);
    setError('');
    setProgress({ current: 0, total: 0, curso: '' });
    let response;

    try {
      if (!api) {
        setError('ScraperApp debe ejecutarse dentro de Electron.');
        setActivities([]);
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearCache();

        if (cacheResult?.success === false) {
          setError(cacheResult.error || 'No fue posible limpiar el caché local.');
          setActivities([]);
          return;
        }
      }

      response = await api.runScraper();

      if (response?.error) {
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
      setError(getFriendlyIVirtualError(response?.error || _error?.message || 'Error desconocido.'));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCalificaciones = async ({ clearCacheFirst = false } = {}) => {
    setLoadingCIA(true);
    setErrorCIA('');

    try {
      if (!api) {
        setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
        setCalificaciones([]);
        return;
      }

      if (clearCacheFirst) {
        const cacheResult = await api.clearCIACache();

        if (cacheResult?.success === false) {
          setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
          setCalificaciones([]);
          return;
        }
      }

      const response = await api.runCIA();

      if (response?.error) {
        setErrorCIA(response.error);
        setCalificaciones([]);
        return;
      }

      const materiasList = Array.isArray(response?.materias) ? response.materias : [];
      setCalificaciones(materiasList);
      setLastSyncCIA(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
    } catch (_error) {
      setErrorCIA('No fue posible consultar el CIA. Verifica la conexión y las credenciales locales.');
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
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <TaskPanel title={pageConfig.title} description={pageConfig.description}>
          <ActivePage
            activities={activities}
            calificaciones={calificaciones}
            errorCIA={errorCIA}
            error={error}
            lastSyncCIA={lastSyncCIA}
            lastSyncAt={lastSyncAt}
            loadingCIA={loadingCIA}
            loading={loading}
            onSync={handleSyncActivities}
            onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
            onNavigate={setActivePage}
            progress={progress}
          />
        </TaskPanel>
      </div>
    </div>
  );
}

export default App;
