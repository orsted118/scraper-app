import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TaskPanel from './components/TaskPanel';
import Actividades from './pages/Actividades';
import Files from './pages/Files';
import Ajustes from './pages/Ajustes';

const pageRegistry = {
  activities: {
    title: 'Actividades',
    description: 'Consulta y clasifica las actividades de iVirtual ITSON por estado.',
    component: Actividades,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  const api = typeof window !== 'undefined' ? window.scraperApp : null;

  const loadActivities = async ({ clearCacheFirst = false } = {}) => {
    setLoading(true);
    setError('');
    setProgress({ current: 0, total: 0, curso: '' });

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

      const response = await api.runScraper();

      if (response?.error) {
        setError(response.error);
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
      setError('No fue posible consultar iVirtual. Verifica la conexión y las credenciales locales.');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

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
            error={error}
            lastSyncAt={lastSyncAt}
            loading={loading}
            onSync={handleSyncActivities}
            progress={progress}
          />
        </TaskPanel>
      </div>
    </div>
  );
}

export default App;
