import logoItson from '../assets/logo-itson.png';
import { Calendar, FolderCog, GraduationCap, ListChecks } from 'lucide-react';

const navigationItems = [
  { id: 'activities', label: 'Actividades', icon: ListChecks },
  { id: 'horario', label: 'Horario', icon: Calendar },
  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
  { id: 'settings', label: 'Ajustes', icon: FolderCog },
];

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside
      className="w-64 rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <img
            src={logoItson}
            alt="ITSON"
            className="h-8 w-auto object-contain mix-blend-screen opacity-90"
          />
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          iVirtual Academic Tracker
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
        </p>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const isActive = item.id === activePage;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                isActive
                  ? ''
                  : 'bg-slate-900 hover:bg-slate-800 hover:text-white'
              }`}
              style={
                isActive
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
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
