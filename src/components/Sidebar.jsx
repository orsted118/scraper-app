import logoItson from '../assets/logo-itson.png';
import { Calendar, FolderCog, GraduationCap, ListChecks } from 'lucide-react';

const navigationItems = [
  { id: 'activities', label: 'Actividades', icon: ListChecks },
  { id: 'horario', label: 'Horario', icon: Calendar },
  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
  { id: 'settings', label: 'Ajustes', icon: FolderCog },
];

function getCurrentSemesterLabel() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 1 && month <= 5) {
    return `Enero - Mayo ${year}`;
  }

  if (month >= 8 && month <= 12) {
    return `Agosto - Diciembre ${year}`;
  }

  return `Verano ${year}`;
}

function Sidebar({ activePage, onNavigate, userName }) {
  const displayName = userName?.trim() || 'Estudiante ITSON';
  const semesterLabel = getCurrentSemesterLabel();

  return (
    <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <img
            src={logoItson}
            alt="ITSON"
            className="h-8 w-auto object-contain mix-blend-screen opacity-90"
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-white">{displayName}</p>
        <p className="mt-1 text-xs text-slate-400">{semesterLabel}</p>
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
                  ? 'bg-itson-blue text-slate-50'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  isActive ? 'animate-pulse bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
