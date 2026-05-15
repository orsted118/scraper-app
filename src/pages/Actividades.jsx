import {
  AlertCircle,
  Globe,
  Loader2,
  Play,
  Search,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import ActivityCard from '../components/ActivityCard';

const tabs = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'retrasada', label: 'Retrasadas' },
  { id: 'cerrada', label: 'Cerradas' },
];

function formatLastSync(lastSyncAt) {
  if (!lastSyncAt) {
    return 'Aún no se ha realizado una consulta.';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(lastSyncAt));
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-400">
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

function Actividades({ activities = [], error, lastSyncAt, loading, onRefresh }) {
  const [activeTab, setActiveTab] = useState('pendiente');
  const counts = {
    pendiente: activities.filter((item) => item.estado === 'pendiente').length,
    retrasada: activities.filter((item) => item.estado === 'retrasada').length,
    cerrada: activities.filter((item) => item.estado === 'cerrada').length,
  };
  const filteredActivities = activities.filter((item) => item.estado === activeTab);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
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

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {loading ? 'Consultando iVirtual...' : 'Actualizar actividades'}
            </button>
          </div>

          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-slate-500">
            Última sincronización: {formatLastSync(lastSyncAt)}
          </p>
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

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950'
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
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
