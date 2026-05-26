import {
  Archive,
  AlertCircle,
  CheckCircle,
  Clock3,
  Globe,
  RefreshCw,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ActivityCard from '../components/ActivityCard';

const tabs = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'retrasada', label: 'Retrasadas' },
  { id: 'cerrada', label: 'Cerradas', title: 'Actividades que cerraron sin ser entregadas' },
];

function formatLastSync(lastSyncAt) {
  if (!lastSyncAt) {
    return 'Última sync: aún no disponible.';
  }

  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - syncDate.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) {
    return `Última sync: hace ${Math.max(1, diffMinutes)} minuto${diffMinutes === 1 ? '' : 's'}`;
  }

  const isToday = syncDate.toDateString() === now.toDateString();

  if (isToday) {
    return `Última sync: hoy ${new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(syncDate)}`;
  }

  return `Última sync: ${new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(syncDate)}`;
}

function getSemesterProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let start;
  let end;

  if (month >= 1 && month <= 5) {
    start = new Date(year, 0, 13);
    end = new Date(year, 4, 30);
  } else if (month >= 8 && month <= 12) {
    start = new Date(year, 7, 11);
    end = new Date(year, 11, 5);
  } else {
    return null;
  }

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const boundedElapsed = Math.min(total, Math.max(0, elapsed));
  const percent = Math.min(100, Math.max(0, Math.round((boundedElapsed / total) * 100)));
  const weeksTotal = Math.max(1, Math.round(total / (7 * 24 * 60 * 60 * 1000)));
  const weeksElapsed = Math.max(
    0,
    Math.min(weeksTotal, Math.round(boundedElapsed / (7 * 24 * 60 * 60 * 1000))),
  );

  return { percent, weeksElapsed, weeksTotal };
}

function parseSort(fechaLimite) {
  if (!fechaLimite || fechaLimite === 'Sin fecha visible') {
    return null;
  }

  const parsed = Date.parse(fechaLimite);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareText(left = '', right = '') {
  return left.localeCompare(right, 'es', { sensitivity: 'base', numeric: true });
}

function getFriendlyErrorMessage(message = '') {
  return message?.includes('Timeout')
    ? 'iVirtual tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
    : message;
}

const settingsErrorCodes = new Set([
  'NO_CREDENTIALS',
  'NO_USER',
  'NO_PASSWORD',
  'SESSION_EXPIRED',
]);

function StatCard({ icon: Icon, label, value, color = 'itson-blue' }) {
  const colorMap = {
    'itson-blue': {
      iconWrap: 'bg-itson-blue/15 text-itson-blue',
      value: 'text-itson-blue-light',
    },
    orange: {
      iconWrap: 'bg-orange-500/15 text-orange-400',
      value: 'text-orange-300',
    },
    slate: {
      iconWrap: 'bg-slate-800 text-slate-300',
      value: 'text-slate-200',
    },
  };
  const palette = colorMap[color] || colorMap['itson-blue'];

  return (
    <article className="flex h-20 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${palette.iconWrap}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className={`text-3xl font-bold leading-none ${palette.value}`}>{value}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
      </div>
    </article>
  );
}

function TabButton({ tab, isActive, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tab.title || tab.label}
      className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-medium transition ${
        isActive
          ? 'bg-itson-blue text-slate-50'
          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {tab.label}
      <span
        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Actividades({
  activities = [],
  error,
  errorCode,
  lastSyncAt,
  loading,
  onNavigate,
  onSync,
  progress,
}) {
  const [activeTab, setActiveTab] = useState('pendiente');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline-asc');
  const semesterProgress = useMemo(() => getSemesterProgress(), []);
  const friendlyError = getFriendlyErrorMessage(error);
  const counts = {
    pendiente: activities.filter((item) => item.estado === 'pendiente').length,
    retrasada: activities.filter((item) => item.estado === 'retrasada').length,
    cerrada: activities.filter((item) => item.estado === 'cerrada').length,
  };
  const tabActivities = activities.filter((item) => item.estado === activeTab);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredActivities = tabActivities.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    return [item.nombre, item.materia].some((field) =>
      (field || '').toLowerCase().includes(normalizedQuery),
      );
  });
  const sortedActivities = useMemo(() => {
    const items = [...filteredActivities];

    if (sortBy === 'deadline-asc' || sortBy === 'deadline-desc') {
      return items.sort((left, right) => {
        const leftDate = parseSort(left.fechaLimite);
        const rightDate = parseSort(right.fechaLimite);

        if (leftDate === null && rightDate === null) {
          return 0;
        }

        if (leftDate === null) {
          return 1;
        }

        if (rightDate === null) {
          return -1;
        }

        return sortBy === 'deadline-asc' ? leftDate - rightDate : rightDate - leftDate;
      });
    }

    switch (sortBy) {
      case 'name-asc':
        return items.sort((left, right) =>
          compareText(left.nombre || '', right.nombre || '') ||
          compareText(left.materia || '', right.materia || ''),
        );
      case 'subject-asc':
        return items.sort((left, right) =>
          compareText(left.materia || '', right.materia || '') ||
          compareText(left.nombre || '', right.nombre || ''),
        );
      default:
        return items;
    }
  }, [filteredActivities, sortBy]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
  };

  const emptyStateConfig = {
    pendiente: {
      icon: CheckCircle,
      iconClass: 'text-emerald-400',
      title: 'Sin actividades pendientes',
      subtitle: 'No tienes tareas por entregar. ¡Al día!',
    },
    retrasada: {
      icon: CheckCircle,
      iconClass: 'text-emerald-400',
      title: 'Sin actividades retrasadas',
      subtitle: 'No tienes tareas vencidas pendientes de entrega.',
    },
    cerrada: {
      icon: Archive,
      iconClass: 'text-slate-400',
      title: 'Sin actividades cerradas',
      subtitle: 'No hay actividades cerradas sin entregar en este semestre.',
    },
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-itson-blue/10 p-2.5">
                <Globe className="h-5 w-5 text-itson-blue" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Portal iVirtual ITSON</p>
                <p className="text-sm font-medium text-slate-200">Actividades del semestre</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-1 xl:items-end">
              <button
                type="button"
                onClick={onSync}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-4 py-2 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sincronizando...' : 'Sincronizar'}
              </button>

              <p className="text-xs text-slate-500">
                {formatLastSync(lastSyncAt)}
              </p>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} color="itson-blue" />
          <StatCard icon={Clock3} label="Retrasadas" value={counts.retrasada} color="orange" />
          <StatCard icon={Archive} label="Cerradas" value={counts.cerrada} color="slate" />
        </div>

        {semesterProgress ? (
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">Progreso del semestre</p>
              <p className="text-xs font-medium text-slate-300">
                Semana {semesterProgress.weeksElapsed} de {semesterProgress.weeksTotal}
              </p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-itson-blue transition-all"
                style={{ width: `${semesterProgress.percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-[10px] text-slate-500">
              {semesterProgress.percent}% completado
            </p>
          </article>
        ) : null}
      </section>

      {friendlyError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <p>{friendlyError}</p>
          </div>
          {settingsErrorCodes.has(errorCode) && typeof onNavigate === 'function' ? (
            <button
              type="button"
              onClick={() => onNavigate('ajustes')}
              className="mt-4 rounded-xl border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              Ir a Ajustes
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre o materia..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pl-10 pr-11 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
          aria-label="Ordenar actividades"
        >
          <option value="deadline-asc">Fecha límite (más próxima)</option>
          <option value="deadline-desc">Fecha límite (más lejana)</option>
          <option value="name-asc">Nombre A-Z</option>
          <option value="subject-asc">Materia</option>
        </select>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const tabCount = counts[tab.id] || 0;

            return (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={isActive}
                count={tabCount}
                onClick={() => handleTabChange(tab.id)}
              />
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-200">
                Escaneando curso {progress?.current || 0} de {progress?.total || 0}: {progress?.curso || 'iniciando...'}
              </span>
              <span className="text-slate-400">
                {progress?.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-itson-blue transition-all"
                style={{
                  width: `${progress?.total ? ((progress.current || 0) / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </section>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
            >
              <div className="h-5 w-64 rounded bg-slate-800" />
              <div className="mt-4 h-4 w-40 rounded bg-slate-800" />
              <div className="mt-6 h-20 rounded bg-slate-900" />
            </div>
          ))}
        </div>
      ) : sortedActivities.length > 0 ? (
        <div className="space-y-4">
          {sortedActivities.map((activity) => (
            <ActivityCard key={activity.id} {...activity} />
          ))}
        </div>
      ) : normalizedQuery ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
          <SearchX className="h-8 w-8 text-slate-600" />
          <p className="mt-4 text-sm text-slate-300">
            Sin actividades que coincidan con la búsqueda.
          </p>
        </div>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
          {(() => {
            const emptyState = emptyStateConfig[activeTab] || emptyStateConfig.pendiente;
            const EmptyIcon = emptyState.icon;

            return (
              <>
                <EmptyIcon className={`h-8 w-8 ${emptyState.iconClass}`} />
                <p className="mt-4 text-sm font-semibold text-slate-100">{emptyState.title}</p>
                <p className="mt-2 max-w-md text-sm text-slate-400">{emptyState.subtitle}</p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default Actividades;
