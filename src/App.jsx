import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TaskPanel from './components/TaskPanel';
import Scraper from './pages/Scraper';
import Automation from './pages/Automation';
import Files from './pages/Files';

const pageRegistry = {
  scraper: {
    title: 'Scraper',
    description: 'Orquesta scraping, clicks y flujos automatizados con Playwright.',
    component: Scraper,
  },
  automation: {
    title: 'Automation',
    description: 'Centraliza ejecuciones guiadas, colas y tareas repetibles.',
    component: Automation,
  },
  files: {
    title: 'Files',
    description: 'Procesa CSV, PDF y XLSX desde el entorno local de la app.',
    component: Files,
  },
};

function App() {
  const [activePage, setActivePage] = useState('scraper');

  const pageConfig = pageRegistry[activePage];
  const ActivePage = pageConfig.component;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-6 py-8">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <TaskPanel title={pageConfig.title} description={pageConfig.description}>
          <ActivePage />
        </TaskPanel>
      </div>
    </div>
  );
}

export default App;
