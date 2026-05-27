import {
  Archive,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  SearchX,
  Zap,
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

function getActivityAnchorId(activity) {
  const raw = activity?.id || `${activity?.nombre || ''}-${activity?.materia || ''}-${activity?.fechaLimite || ''}`;
  const normalized = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `activity-${normalized || 'item'}`;
}

function parseDeadline(activity) {
  const parsed = parseSort(activity?.fechaLimite);
  return parsed === null ? null : new Date(parsed);
}

function formatDeadline(date) {
  if (!date) {
    return 'Sin fecha visible';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getUrgentActivity(activities) {
  const pendientes = activities
    .filter((activity) => activity.estado === 'pendiente' && activity.fechaLimite !== 'Sin fecha visible')
    .map((activity) => ({ activity, deadline: parseDeadline(activity) }))
    .filter((item) => item.deadline)
    .sort((left, right) => left.deadline - right.deadline);

  if (pendientes.length > 0) {
    return { activity: pendientes[0].activity, type: 'urgent', deadline: pendientes[0].deadline };
  }

  const retrasadas = activities
    .filter((activity) => activity.estado === 'retrasada' && activity.fechaLimite !== 'Sin fecha visible')
    .map((activity) => ({ activity, deadline: parseDeadline(activity) }))
    .filter((item) => item.deadline)
    .sort((left, right) => left.deadline - right.deadline);

  if (retrasadas.length > 0) {
    return { activity: retrasadas[0].activity, type: 'late', deadline: retrasadas[0].deadline };
  }

  return null;
}

function getRemainingLabel(deadline) {
  if (!deadline) {
    return '';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const remainingDays = Math.ceil((deadline.getTime() - Date.now()) / dayMs);

  if (remainingDays <= 0) {
    return 'Vence hoy';
  }

  return `Faltan ${remainingDays} día${remainingDays === 1 ? '' : 's'}`;
}

function getLateLabel(deadline) {
  if (!deadline) {
    return '';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const lateDays = Math.max(1, Math.ceil((Date.now() - deadline.getTime()) / dayMs));
  return `${lateDays} día${lateDays === 1 ? '' : 's'} de retraso`;
}

const settingsErrorCodes = new Set([
  'NO_CREDENTIALS',
  'NO_USER',
  'NO_PASSWORD',
  'SESSION_EXPIRED',
]);

function StatCard({ icon: Icon, label, value, tone = 'pending' }) {
  const toneStyles = {
    pending: {
      background: 'var(--success-bg)',
      color: 'var(--success-text)',
    },
    retrasada: {
      background: 'var(--retrasada-bg)',
      color: 'var(--retrasada-text)',
    },
    cerrada: {
      background: 'var(--closed-bg)',
      color: 'var(--closed-text)',
    },
  };
  const toneStyle = toneStyles[tone] || toneStyles.pending;

  return (
    <article
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-2xl p-3" style={toneStyle}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
        </div>
      </div>
    </article>
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
  const urgentInfo = useMemo(() => getUrgentActivity(activities), [activities]);
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

  const handleOpenUrgentActivity = (info) => {
    if (!info?.activity) {
      return;
    }

    const nextTab = info.type === 'late' ? 'retrasada' : 'pendiente';
    setActiveTab(nextTab);
    setSearchQuery('');

    const anchorId = getActivityAnchorId(info.activity);
    setTimeout(() => {
      const target = document.getElementById(anchorId);
      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.outline = '2px solid var(--accent)';
      target.style.outlineOffset = '4px';

      window.setTimeout(() => {
        target.style.outline = 'none';
      }, 1300);
    }, 120);
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
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article
          className="rounded-2xl border p-6"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-5 w-36 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-8 w-4/5 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-4 w-3/5 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-10 w-52 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          ) : (
            <div className="space-y-4">
              {urgentInfo ? (
                <>
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]"
                    style={
                      urgentInfo.type === 'urgent'
                        ? {
                          borderColor: 'var(--accent)',
                          background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                          color: 'var(--accent)',
                        }
                        : {
                          borderColor: 'var(--retrasada-border)',
                          background: 'var(--retrasada-bg)',
                          color: 'var(--retrasada-text)',
                        }
                    }
                  >
                    {urgentInfo.type === 'urgent' ? 'ATENCIÓN' : 'RETRASADA'}
                  </span>

                  <div>
                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
                      {urgentInfo.activity.nombre}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {urgentInfo.activity.materia || 'Materia no disponible'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p
                      className="text-lg font-semibold"
                      style={{
                        color: urgentInfo.type === 'urgent' ? 'var(--error-text)' : 'var(--retrasada-text)',
                      }}
                    >
                      {formatDeadline(urgentInfo.deadline)}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {urgentInfo.type === 'urgent'
                        ? getRemainingLabel(urgentInfo.deadline)
                        : getLateLabel(urgentInfo.deadline)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenUrgentActivity(urgentInfo)}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-50 transition"
                      style={{ background: 'var(--accent)' }}
                    >
                      Ver actividad
                    </button>
                    <button
                      type="button"
                      onClick={onSync}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        borderColor: 'var(--border-normal)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-normal)',
                      }}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}
                    >
                      <CheckCircle className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
                        Todo al día
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        No tienes actividades pendientes ni retrasadas.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onSync}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ background: 'var(--accent)' }}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </button>
                    <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
                      {formatLastSync(lastSyncAt)}
                    </p>
                  </div>
                </>
              )}

              {urgentInfo ? (
                <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
                  {formatLastSync(lastSyncAt)}
                </p>
              ) : null}
            </div>
          )}
        </article>

        <div className="grid gap-4">
          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} tone="pending" />
          <StatCard icon={AlertCircle} label="Retrasadas" value={counts.retrasada} tone="retrasada" />
          <StatCard icon={Zap} label="Cerradas" value={counts.cerrada} tone="cerrada" />
        </div>
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
            className="w-full rounded-2xl border px-4 py-3 pl-10 pr-11 text-sm outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
            style={{
              borderColor: 'var(--border-normal)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-strong)',
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition"
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--bg-tertiary)';
                event.currentTarget.style.color = 'var(--text-strong)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.color = '';
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
          style={{
            borderColor: 'var(--border-normal)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-strong)',
          }}
          aria-label="Ordenar actividades"
        >
          <option value="deadline-asc">Fecha límite (más próxima)</option>
          <option value="deadline-desc">Fecha límite (más lejana)</option>
          <option value="name-asc">Nombre A-Z</option>
          <option value="subject-asc">Materia</option>
        </select>
      </div>

      <section
        className="rounded-2xl border p-3"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
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
                    : ''
                }`}
                style={
                  isActive
                    ? undefined
                    : {
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-normal)',
                    }
                }
                onMouseEnter={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background = 'var(--bg-tertiary)';
                    event.currentTarget.style.color = 'var(--text-strong)';
                  }
                }}
                onMouseLeave={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background = 'var(--bg-secondary)';
                    event.currentTarget.style.color = 'var(--text-normal)';
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: 'var(--text-strong)' }}>
                Escaneando curso {progress?.current || 0} de {progress?.total || 0}: {progress?.curso || 'iniciando...'}
              </span>
              <span className="text-slate-400">
                {progress?.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
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
              className="animate-pulse rounded-2xl border p-6"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
            >
              <div className="h-5 w-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="mt-4 h-4 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="mt-6 h-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
            </div>
          ))}
        </div>
      ) : sortedActivities.length > 0 ? (
        <div className="space-y-4">
          {sortedActivities.map((activity) => (
            <div key={getActivityAnchorId(activity)} id={getActivityAnchorId(activity)}>
              <ActivityCard {...activity} />
            </div>
          ))}
        </div>
      ) : normalizedQuery ? (
        <div
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <SearchX className="h-8 w-8 text-slate-600" />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
            Sin actividades que coincidan con la búsqueda.
          </p>
        </div>
      ) : (
        <div
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          {(() => {
            const emptyState = emptyStateConfig[activeTab] || emptyStateConfig.pendiente;
            const EmptyIcon = emptyState.icon;

            return (
              <>
                <EmptyIcon className={`h-8 w-8 ${emptyState.iconClass}`} />
                <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {emptyState.title}
                </p>
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
