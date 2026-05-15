const navigationItems = [
  { id: 'scraper', label: 'Scraper' },
  { id: 'automation', label: 'Automation' },
  { id: 'files', label: 'Files' },
];

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">ScraperApp</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Desktop Console</h1>
        <p className="mt-2 text-sm text-slate-400">
          Base operativa para scraping, automatización y lectura de archivos locales.
        </p>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const isActive = item.id === activePage;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                isActive
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              <span className="text-xs uppercase tracking-[0.25em]">
                {isActive ? 'Live' : 'Idle'}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
