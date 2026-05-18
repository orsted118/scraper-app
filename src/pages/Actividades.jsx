import {
  AlertCircle,
  Globe,
  RefreshCw,
  Search,
  SearchX,
  Zap,
  X,
} from 'lucide-react';
import { useState } from 'react';
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

function StatCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-itson-blue/10 p-3 text-itson-blue">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </article>
  );
}

function Actividades({ activities = [], error, lastSyncAt, loading, onSync, progress }) {
  const [activeTab, setActiveTab] = useState('pendiente');
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
                <Globe className="h-3.5 w-3.5" />
                Portal iVirtual ITSON
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">Extracción real de actividades</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Inicia una sesión contra iVirtual, recorre los cursos inscritos y clasifica actividades
                  en pendientes, retrasadas y cerradas con sus fechas límite, instrucciones y adjuntos.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={onSync}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sincronizando...' : 'Sincronizar'}
              </button>

              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {formatLastSync(lastSyncAt)}
              </p>
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} />
          <StatCard icon={AlertCircle} label="Retrasadas" value={counts.retrasada} />
          <StatCard icon={Zap} label="Cerradas" value={counts.cerrada} />
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <p>{error}</p>
        </div>
      ) : null}

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

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                title={tab.title || tab.label}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-itson-blue text-slate-50'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
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
      ) : filteredActivities.length > 0 ? (
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
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
          <Search className="h-8 w-8 text-slate-600" />
          <p className="mt-4 text-sm text-slate-300">
            {activities.length === 0
              ? 'Aún no se ha ejecutado la extracción de actividades.'
              : 'No hay actividades en esta categoría.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default Actividades;
