import {
  Archive,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Columns3,
  LayoutGrid,
  List,
  Paperclip,
  RefreshCw,
  Search,
  SearchX,
  Table2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import ActivityCard from '../components/ActivityCard';

const EASE = [0.23, 1, 0.32, 1];

const tabs = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'retrasada', label: 'Retrasadas' },
  { id: 'cerrada', label: 'Cerradas', title: 'Actividades que cerraron sin ser entregadas' },
];

const VIEW_MODES = [
  { id: 'cards', Icon: LayoutGrid, label: 'Tarjetas' },
  { id: 'compact', Icon: List, label: 'Lista compacta' },
  { id: 'table', Icon: Table2, label: 'Tabla' },
  { id: 'kanban', Icon: Columns3, label: 'Kanban' },
];

const KANBAN_COLUMNS = [
  { id: 'pendiente', label: 'Pendientes', tone: 'pending' },
  { id: 'retrasada', label: 'Retrasadas', tone: 'retrasada' },
  { id: 'cerrada', label: 'Cerradas', tone: 'cerrada' },
];

const STATUS_ORDER = {
  retrasada: 0,
  pendiente: 1,
  cerrada: 2,
};

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

function StatRow({ label, value, tone = 'pending' }) {
  const toneColors = {
    pending: 'var(--success-text)',
    retrasada: 'var(--retrasada-text)',
    cerrada: 'var(--closed-text)',
  };
  const color = value > 0 ? (toneColors[tone] || toneColors.pending) : 'var(--text-muted)';

  return (
    <div
      className="flex items-baseline justify-between gap-4 border-b py-4 last:border-b-0"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="text-3xl font-extrabold leading-none"
        style={{
          color,
          fontFamily: 'var(--font-display, sans-serif)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
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
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState('pendiente');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline-asc');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('scraper-view-mode') || 'cards';
    } catch (_error) {
      return 'cards';
    }
  });
  const [expandedId, setExpandedId] = useState('');
  const [tableSort, setTableSort] = useState({ col: 'fecha', dir: 'asc' });
  const friendlyError = getFriendlyErrorMessage(error);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const counts = {
    pendiente: activities.filter((item) => item.estado === 'pendiente').length,
    retrasada: activities.filter((item) => item.estado === 'retrasada').length,
    cerrada: activities.filter((item) => item.estado === 'cerrada').length,
  };
  const filteredActivities = useMemo(() => {
    const tabActs = activities.filter((item) => item.estado === activeTab);

    if (!normalizedQuery) {
      return tabActs;
    }

    return tabActs.filter((item) =>
      [item.nombre, item.materia].some((field) =>
        (field || '').toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [activities, activeTab, normalizedQuery]);
  const kanbanActivities = useMemo(() => {
    if (!normalizedQuery) {
      return activities;
    }

    return activities.filter((item) =>
      [item.nombre, item.materia].some((field) =>
        (field || '').toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [activities, normalizedQuery]);
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
  const tableActivities = useMemo(() => {
    const items = [...sortedActivities];
    const direction = tableSort.dir === 'asc' ? 'asc' : 'desc';
    const multiplier = direction === 'asc' ? 1 : -1;

    return items.sort((left, right) => {
      switch (tableSort.col) {
        case 'actividad':
          return multiplier * compareText(left.nombre || '', right.nombre || '');
        case 'materia':
          return multiplier * compareText(left.materia || '', right.materia || '');
        case 'estado':
          return multiplier * ((STATUS_ORDER[left.estado] ?? 99) - (STATUS_ORDER[right.estado] ?? 99));
        case 'fecha':
        default:
          return compareByDeadline(left, right, direction);
      }
    });
  }, [sortedActivities, tableSort]);

  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : 0.035,
        delayChildren: reduced ? 0 : 0.04,
      },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  };

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

  function changeViewMode(newMode) {
    if (newMode === viewMode) return;
    setViewMode(newMode);
    try {
      localStorage.setItem('scraper-view-mode', newMode);
    } catch (_error) {
      // localStorage puede no estar disponible fuera del renderer.
    }
  }

  const handleTableSort = (col) => {
    setTableSort((current) => ({
      col,
      dir: current.col === col && current.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleAttachmentClick = async (attachment) => {
    const url = attachment?.url || attachment?.href;
    const name = getAttachmentLabel(attachment);

    if (!url) {
      return;
    }

    if (window.scraperApp?.downloadFile) {
      await window.scraperApp.downloadFile(url, name);
      return;
    }

    window.scraperApp?.openExternal?.(url);
  };

  const renderStatusBadge = (estado) => {
    const tone = getStatusTone(estado);

    return (
      <span
        className="inline-flex items-center border px-2 py-0.5 text-[11px] font-semibold"
        style={{
          background: tone.background,
          borderColor: tone.border,
          color: tone.color,
          borderRadius: 'var(--radius-badge, 0px)',
        }}
      >
        {tone.label}
      </span>
    );
  };

  const renderEmptyState = () => {
    if (normalizedQuery) {
      return (
        <div
          className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-10 text-center"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <SearchX className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
            Sin actividades que coincidan con la búsqueda.
          </p>
        </div>
      );
    }

    const emptyState = emptyStateConfig[activeTab] || emptyStateConfig.pendiente;
    const EmptyIcon = emptyState.icon;

    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-10 text-center"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
        }}
      >
        <EmptyIcon className="h-8 w-8" style={{ color: emptyState.iconColor }} />
        <p
          className="mt-4 text-sm font-bold"
          style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
        >
          {emptyState.title}
        </p>
        <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
          {emptyState.subtitle}
        </p>
      </div>
    );
  };

  const renderCardsView = () => (
    <motion.div className="space-y-4" variants={listVariants} initial="hidden" animate="visible">
      {sortedActivities.map((activity) => (
        <motion.div
          key={getActivityAnchorId(activity)}
          id={getActivityAnchorId(activity)}
          layout={reduced ? false : true}
          variants={itemVariants}
        >
          <ActivityCard {...activity} />
        </motion.div>
      ))}
    </motion.div>
  );

  const renderCompactView = () => (
    <div
      className="overflow-hidden border"
      style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      {sortedActivities.map((activity) => {
        const anchorId = getActivityAnchorId(activity);
        const isExpanded = expandedId === anchorId;
        const tone = getStatusTone(activity.estado);
        const attachments = getActivityAttachments(activity);
        const instructions = (activity.instrucciones || '').trim();

        return (
          <div
            key={anchorId}
            id={anchorId}
            className="border-b last:border-b-0"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <button
              type="button"
              onClick={() => setExpandedId((current) => (current === anchorId ? '' : anchorId))}
              className="row-hover grid min-h-[44px] w-full grid-cols-[auto_minmax(0,1fr)_minmax(120px,0.45fr)_minmax(120px,auto)] items-center gap-3 px-4 py-2 text-left"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
              <span className="truncate text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
                {activity.nombre}
              </span>
              <span className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                {activity.materia || 'Materia no disponible'}
              </span>
              <span
                className="text-right text-xs"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {activity.fechaLimite || 'Sin fecha visible'}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded ? (
                <motion.div
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="space-y-3 px-8 pb-4 pt-1">
                    {instructions ? (
                      <p
                        className="text-sm leading-6"
                        style={{
                          color: 'var(--text-normal)',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {instructions}
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Sin instrucciones visibles.
                      </p>
                    )}

                    {attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((attachment) => (
                          <button
                            key={`${attachment.url || attachment.href}-${getAttachmentLabel(attachment)}`}
                            type="button"
                            onClick={() => handleAttachmentClick(attachment)}
                            className="hov-accent inline-flex items-center gap-2 border px-3 py-1.5 text-xs"
                            style={{
                              borderColor: 'var(--border-normal)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-normal)',
                              borderRadius: 'var(--radius-badge, 0px)',
                            }}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {getAttachmentLabel(attachment)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  const renderTableView = () => {
    const columns = [
      { id: 'actividad', label: 'Actividad' },
      { id: 'materia', label: 'Materia' },
      { id: 'fecha', label: 'Vence' },
      { id: 'estado', label: 'Estado' },
    ];

    return (
      <div
        className="overflow-hidden border"
        style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead style={{ background: 'var(--bg-secondary)' }}>
            <tr>
              {columns.map((column) => {
                const isActive = tableSort.col === column.id;
                const SortIcon = tableSort.dir === 'asc' ? ChevronUp : ChevronDown;

                return (
                  <th
                    key={column.id}
                    className="border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleTableSort(column.id)}
                      className={`inline-flex items-center gap-1 ${isActive ? '' : 'tab-hover'}`}
                      style={{ color: isActive ? 'var(--accent)' : 'inherit' }}
                    >
                      {column.label}
                      {isActive ? <SortIcon className="h-[13px] w-[13px]" /> : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tableActivities.map((activity, index) => (
              <tr
                key={getActivityAnchorId(activity)}
                id={getActivityAnchorId(activity)}
                className="row-hover"
                style={{ background: index % 2 === 1 ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                <td className="border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-strong)' }}>
                  <span className="line-clamp-1 font-medium">{activity.nombre}</span>
                </td>
                <td className="border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  {activity.materia || 'Materia no disponible'}
                </td>
                <td
                  className="border-b px-4 py-3"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {activity.fechaLimite || 'Sin fecha visible'}
                </td>
                <td className="border-b px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  {renderStatusBadge(activity.estado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderKanbanView = () => (
    <div className="grid gap-3 md:grid-cols-3">
      {KANBAN_COLUMNS.map((column) => {
        const tone = getStatusTone(column.id);
        const columnItems = kanbanActivities
          .filter((activity) => activity.estado === column.id)
          .sort((left, right) => compareByDeadline(left, right, 'asc') || compareText(left.nombre || '', right.nombre || ''));

        return (
          <section
            key={column.id}
            className="min-h-64 border p-3"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: 'var(--text-strong)' }}
              >
                {column.label}
              </h3>
              <span
                className="border px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: tone.background,
                  borderColor: tone.border,
                  color: tone.color,
                  borderRadius: 'var(--radius-badge, 0px)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {columnItems.length}
              </span>
            </div>

            {columnItems.length > 0 ? (
              <div className="space-y-2">
                {columnItems.map((activity) => (
                  <article
                    key={getActivityAnchorId(activity)}
                    id={getActivityAnchorId(activity)}
                    className="border p-3"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-badge, 0px)',
                      ...getKanbanEdge(activity.estado),
                    }}
                  >
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
                      {activity.nombre}
                    </p>
                    <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {activity.materia || 'Materia no disponible'}
                    </p>
                    <p
                      className="mt-2 text-xs"
                      style={{
                        color: tone.color,
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {activity.fechaLimite || 'Sin fecha visible'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p
                className="border border-dashed px-3 py-6 text-center text-xs"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-badge, 0px)',
                }}
              >
                Sin actividades
              </p>
            )}
          </section>
        );
      })}
    </div>
  );

  const renderActiveView = () => {
    switch (viewMode) {
      case 'compact':
        return renderCompactView();
      case 'table':
        return renderTableView();
      case 'kanban':
        return renderKanbanView();
      case 'cards':
      default:
        return renderCardsView();
    }
  };

  const emptyStateConfig = {
    pendiente: {
      icon: CheckCircle,
      iconColor: 'var(--success-text)',
      title: 'Sin actividades pendientes',
      subtitle: 'No tienes tareas por entregar. ¡Al día!',
    },
    retrasada: {
      icon: CheckCircle,
      iconColor: 'var(--success-text)',
      title: 'Sin actividades retrasadas',
      subtitle: 'No tienes tareas vencidas pendientes de entrega.',
    },
    cerrada: {
      icon: Archive,
      iconColor: 'var(--closed-text)',
      title: 'Sin actividades cerradas',
      subtitle: 'No hay actividades cerradas sin entregar en este semestre.',
    },
  };
  const visibleActivityCount = viewMode === 'kanban' ? kanbanActivities.length : sortedActivities.length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article
          className="border p-6"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
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
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.24em]"
                    style={{
                      color: urgentInfo.type === 'urgent' ? 'var(--accent)' : 'var(--retrasada-text)',
                    }}
                  >
                    {urgentInfo.type === 'urgent' ? 'Atención' : 'Retrasada'}
                  </p>

                  <div>
                    <h3
                      className="text-2xl font-extrabold sm:text-3xl"
                      style={{
                        color: 'var(--text-strong)',
                        fontFamily: 'var(--font-display, sans-serif)',
                        letterSpacing: '-0.02em',
                        textWrap: 'balance',
                      }}
                    >
                      {urgentInfo.activity.nombre}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {urgentInfo.activity.materia || 'Materia no disponible'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p
                      className="text-lg font-semibold sm:text-xl"
                      style={{
                        color: urgentInfo.type === 'urgent' ? 'var(--error-text)' : 'var(--retrasada-text)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
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
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                    >
                      Ver actividad
                    </button>
                    <button
                      type="button"
                      onClick={onSync}
                      disabled={loading}
                      className="btn-outline inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="inline-flex h-10 w-10 items-center justify-center border"
                      style={{
                        background: 'var(--success-bg)',
                        borderColor: 'var(--success-border)',
                        color: 'var(--success-text)',
                        borderRadius: 'var(--radius-badge, 0px)',
                      }}
                    >
                      <CheckCircle className="h-6 w-6" />
                    </span>
                    <div>
                      <h3
                        className="text-2xl font-extrabold"
                        style={{
                          color: 'var(--text-strong)',
                          fontFamily: 'var(--font-display, sans-serif)',
                          letterSpacing: '-0.02em',
                        }}
                      >
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
                      className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </button>
                    <p
                      className="text-[10px] uppercase tracking-[0.22em]"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      {formatLastSync(lastSyncAt)}
                    </p>
                  </div>
                </>
              )}

              {urgentInfo ? (
                <p
                  className="text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {formatLastSync(lastSyncAt)}
                </p>
              ) : null}
            </div>
          )}
        </article>

        <div
          className="border px-6 py-2"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <StatRow label="Pendientes" value={counts.pendiente} tone="pending" />
          <StatRow label="Retrasadas" value={counts.retrasada} tone="retrasada" />
          <StatRow label="Cerradas" value={counts.cerrada} tone="cerrada" />
        </div>
      </section>

      {friendlyError ? (
        <div
          className="border px-4 py-4 text-sm"
          style={{
            background: 'var(--error-bg)',
            borderColor: 'var(--error-border)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{friendlyError}</p>
          </div>
          {settingsErrorCodes.has(errorCode) && typeof onNavigate === 'function' ? (
            <button
              type="button"
              onClick={() => onNavigate('ajustes')}
              className="mt-4 border px-4 py-2 text-xs font-semibold"
              style={{
                borderColor: 'var(--error-border)',
                color: 'var(--error-text)',
                borderRadius: 'var(--radius-button, 0px)',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'color-mix(in srgb, var(--error-text) 12%, transparent)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
              }}
            >
              Ir a Ajustes
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px_auto]">
        <div className="field relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre o materia..."
            className="w-full bg-transparent px-4 py-3 pl-10 pr-11 text-sm outline-none"
            style={{ color: 'var(--text-strong)' }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--bg-tertiary)';
                event.currentTarget.style.color = 'var(--text-strong)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="field w-full px-4 py-3 text-sm"
          aria-label="Ordenar actividades"
        >
          <option value="deadline-asc">Fecha límite (más próxima)</option>
          <option value="deadline-desc">Fecha límite (más lejana)</option>
          <option value="name-asc">Nombre A-Z</option>
          <option value="subject-asc">Materia</option>
        </select>

        <div
          className="flex items-center gap-1 border p-1"
          style={{
            borderColor: 'var(--border-normal)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-button, 0px)',
          }}
          aria-label="Cambiar modo de vista"
        >
          {VIEW_MODES.map(({ id, Icon, label }) => {
            const isActive = viewMode === id;

            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={isActive}
                onClick={() => changeViewMode(id)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center border"
                style={{
                  borderColor: isActive ? 'var(--accent)' : 'transparent',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--on-accent)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-badge, 0px)',
                }}
                onMouseEnter={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background = 'var(--bg-tertiary)';
                    event.currentTarget.style.color = 'var(--text-strong)';
                  }
                }}
                onMouseLeave={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background = 'transparent';
                    event.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {viewMode !== 'kanban' ? (
        <div className="flex items-end gap-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                title={tab.title || tab.label}
                className={`relative pb-3 text-xs font-bold uppercase tracking-[0.18em] ${isActive ? '' : 'tab-hover'}`}
                style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)' }}
              >
                {tab.label}
                <span
                  className="ml-2"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                    color: isActive ? 'var(--accent)' : 'inherit',
                  }}
                >
                  {counts[tab.id]}
                </span>
                {isActive ? (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px block h-0.5"
                    style={{ background: 'var(--accent)' }}
                    transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <section
            className="border p-5"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: 'var(--text-strong)' }}>
                Escaneando curso {progress?.current || 0} de {progress?.total || 0}: {progress?.curso || 'iniciando...'}
              </span>
              <span
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {progress?.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  background: 'var(--accent)',
                  width: `${progress?.total ? ((progress.current || 0) / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </section>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card, 0px)',
              }}
            >
              <div className="h-5 w-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="mt-4 h-4 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="mt-6 h-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          key={`${viewMode}-${visibleActivityCount > 0 ? 'data' : 'empty'}`}
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: EASE }}
        >
          {visibleActivityCount > 0 ? renderActiveView() : renderEmptyState()}
        </motion.div>
      )}
    </div>
  );
}

function getStatusTone(estado = 'pendiente') {
  const toneMap = {
    pendiente: {
      dot: 'var(--success-text)',
      background: 'var(--success-bg)',
      border: 'var(--success-border)',
      color: 'var(--success-text)',
      label: 'Pendiente',
    },
    retrasada: {
      dot: 'var(--retrasada-text)',
      background: 'var(--retrasada-bg)',
      border: 'var(--retrasada-border)',
      color: 'var(--retrasada-text)',
      label: 'Retrasada',
    },
    cerrada: {
      dot: 'var(--closed-text)',
      background: 'var(--closed-bg)',
      border: 'var(--closed-border)',
      color: 'var(--closed-text)',
      label: 'Cerrada',
    },
  };

  return toneMap[estado] || toneMap.pendiente;
}

// Mismo lenguaje de borde-estado que ActivityCard, versión mini para kanban.
function getKanbanEdge(estado) {
  if (estado === 'retrasada') {
    return { borderLeftWidth: '3px', borderLeftColor: 'var(--retrasada-text)' };
  }

  if (estado === 'pendiente') {
    return {
      borderLeftWidth: '2px',
      borderLeftColor: 'color-mix(in srgb, var(--text-strong) 40%, transparent)',
    };
  }

  return {};
}

function getActivityAttachments(activity = {}) {
  if (Array.isArray(activity.adjuntos) && activity.adjuntos.length > 0) {
    return activity.adjuntos;
  }

  return Array.isArray(activity.archivos) ? activity.archivos : [];
}

function getAttachmentLabel(attachment = {}) {
  return attachment.name || attachment.nombre || attachment.titulo || 'Adjunto';
}

function compareByDeadline(left, right, direction = 'asc') {
  const leftDate = parseSort(left?.fechaLimite);
  const rightDate = parseSort(right?.fechaLimite);

  if (leftDate === null && rightDate === null) {
    return 0;
  }

  if (leftDate === null) {
    return 1;
  }

  if (rightDate === null) {
    return -1;
  }

  return direction === 'asc' ? leftDate - rightDate : rightDate - leftDate;
}

export default Actividades;
