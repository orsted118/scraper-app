import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  Clock,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  Search,
  StickyNote,
  Wrench,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const EASE = [0.23, 1, 0.32, 1];
const DAY_MS = 24 * 60 * 60 * 1000;

const SOURCE_META = {
  actividades: { label: 'iVirtual', icon: BookOpen },
  horario: { label: 'Horario', icon: Clock },
  calificaciones: { label: 'CIA', icon: GraduationCap },
  calendario: { label: 'Calendario', icon: CalendarDays },
  'itson-news': { label: 'Institucional', icon: Bell },
  notes: { label: 'Notas', icon: StickyNote },
  sistema: { label: 'Sistema', icon: Wrench },
};

const TABS = [
  { id: 'todas', label: 'Todas' },
  { id: 'criticas', label: 'Críticas' },
  { id: 'noleidas', label: 'No leídas' },
  { id: 'calificaciones', label: 'CIA' },
  { id: 'horario', label: 'Horario' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'itson-news', label: 'Institucional' },
  { id: 'actividades', label: 'iVirtual' },
  { id: 'sistema', label: 'Sistema' },
];

const GROUPS = ['Hoy', 'Ayer', 'Esta semana', 'Antes'];

function getSourceMeta(source) {
  return SOURCE_META[source] || SOURCE_META.sistema;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getGroup(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Antes';
  }

  const today = startOfDay(new Date()).getTime();
  const day = startOfDay(date).getTime();
  const diffDays = Math.round((today - day) / DAY_MS);

  if (diffDays <= 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays <= 7) return 'Esta semana';
  return 'Antes';
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'ahora';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  const group = getGroup(timestamp);

  if (group === 'Hoy') return `hace ${diffHours} h`;

  const time = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date);

  if (group === 'Ayer') return `ayer ${time}`;

  const diffDays = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / DAY_MS);

  if (diffDays <= 14) return `hace ${diffDays} días`;

  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

function matchesTab(item, tab) {
  if (tab === 'todas') return true;
  if (tab === 'criticas') return item.priority === 'critica';
  if (tab === 'noleidas') return !item.read;
  return item.source === tab;
}

function Notificaciones({ onNavigate }) {
  const reduced = useReducedMotion();
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('todas');
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refresh = async () => {
    try {
      const response = await api?.notifications?.list?.();
      if (response?.ok) {
        setItems(Array.isArray(response.notifications) ? response.notifications : []);
      }
      const settingsResponse = await api?.notifications?.getSettings?.();
      if (settingsResponse?.ok) {
        setLastSyncAt(settingsResponse.settings?.lastSyncAt ?? null);
      }
    } catch (_error) {
      // Sin bandeja disponible: la UI queda en su empty state.
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();

    api?.notifications?.onNew?.(({ notification }) => {
      if (!notification?.id) return;
      setItems((previous) => [notification, ...previous.filter((item) => item.id !== notification.id)]);
    });

    return () => {
      api?.notifications?.removeNew?.();
    };
    // api es estable durante la vida del renderer.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = items.filter((item) => !item.read).length;

  const counts = useMemo(() => {
    const map = {};
    for (const { id } of TABS) {
      map[id] = items.filter((item) => matchesTab(item, id)).length;
    }
    return map;
  }, [items]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return items
      .filter((item) => matchesTab(item, tab))
      .filter(
        (item) =>
          !normalizedQuery ||
          [item.title, item.body, getSourceMeta(item.source).label]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedQuery)),
      )
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }, [items, tab, normalizedQuery]);

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        items: filtered.filter((item) => getGroup(item.timestamp) === group),
      })).filter((entry) => entry.items.length > 0),
    [filtered],
  );

  const criticalUnread = useMemo(
    () =>
      items
        .filter((item) => item.priority === 'critica' && !item.read)
        .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp)),
    [items],
  );

  const markRead = async (id) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try {
      await api?.notifications?.markRead?.(id);
    } catch (_error) {
      // El estado local ya refleja la intención; el disco se alineará en el próximo refresh.
    }
  };

  const markAllRead = async () => {
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
    try {
      await api?.notifications?.markAllRead?.();
    } catch (_error) {
      // Ídem markRead.
    }
  };

  const openAction = (item) => {
    if (!item.actionUrl) return;

    if (item.actionUrl.startsWith('app://')) {
      onNavigate?.(item.actionUrl.replace('app://', ''));
      return;
    }

    if (api?.openExternal) {
      api.openExternal(item.actionUrl);
      return;
    }

    window.open(item.actionUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = (item) => {
    if (!item.read) {
      markRead(item.id);
    }
    openAction(item);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api?.notices?.sync?.();
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const groupVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : 0.03 } },
  };

  const renderDot = (item) => {
    if (item.read) return null;

    return (
      <button
        type="button"
        aria-label="Marcar como leída"
        title="Marcar como leída"
        onClick={(event) => {
          event.stopPropagation();
          markRead(item.id);
        }}
        className="mt-[5px] h-[7px] w-[7px] shrink-0 cursor-pointer"
        style={{
          background: item.priority === 'critica' ? 'var(--accent)' : 'var(--text-strong)',
          borderRadius: 'var(--radius-badge, 0px)',
        }}
      />
    );
  };

  const renderCard = (item) => {
    const meta = getSourceMeta(item.source);
    const Icon = meta.icon;
    const isCritical = item.priority === 'critica';
    const clickable = Boolean(item.actionUrl) || !item.read;
    // La opacidad de "leída" vive en el target de framer: un style.opacity
    // fijo sería pisado por animate.
    const cardVariants = {
      hidden: { opacity: 0, y: reduced ? 0 : -8 },
      visible: {
        opacity: item.read ? 0.7 : 1,
        y: 0,
        transition: { duration: reduced ? 0 : 0.2, ease: EASE },
      },
    };

    return (
      <motion.article
        key={item.id}
        layout={reduced ? false : true}
        variants={cardVariants}
        onClick={() => handleCardClick(item)}
        role={clickable ? 'button' : undefined}
        className={`border p-4 ${clickable ? 'row-hover cursor-pointer' : ''}`}
        style={{
          borderColor: 'var(--border-subtle)',
          borderLeftWidth: isCritical && !item.read ? '3px' : 'var(--border-width-card, 1px)',
          borderLeftColor: isCritical && !item.read ? 'var(--accent)' : 'var(--border-subtle)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
          transition: 'border-color 0.16s ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.borderColor = 'var(--border-normal)';
          if (isCritical && !item.read) {
            event.currentTarget.style.borderLeftColor = 'var(--accent)';
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.borderColor = 'var(--border-subtle)';
          if (isCritical && !item.read) {
            event.currentTarget.style.borderLeftColor = 'var(--accent)';
          }
        }}
      >
        <p
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
        >
          <Icon className="h-3 w-3 shrink-0" />
          {meta.label}
        </p>

        <div className="mt-1.5 flex items-start gap-2">
          {renderDot(item)}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
              {item.title}
            </h4>
            {item.body ? (
              <p className="mt-1 break-words text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                {item.body}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {item.actionUrl ? <ExternalLink className="h-3 w-3" /> : null}
          </span>
          <span
            className="text-[10px]"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
      </motion.article>
    );
  };

  const renderHero = () => {
    const critical = criticalUnread[0];

    if (critical) {
      return (
        <section
          className="border p-6"
          style={{
            borderColor: 'var(--border)',
            borderLeftWidth: '3px',
            borderLeftColor: 'var(--accent)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--accent)' }}>
              Crítico
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {formatRelativeTime(critical.timestamp)}
              {criticalUnread.length > 1 ? ` · +${criticalUnread.length - 1} más` : ''}
            </p>
          </div>
          <h3
            className="mt-2 text-2xl font-extrabold sm:text-3xl"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            {critical.title}
          </h3>
          {critical.body ? (
            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-normal)' }}>
              {critical.body}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {critical.actionUrl ? (
              <button
                type="button"
                onClick={() => handleCardClick(critical)}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                {critical.actionUrl.startsWith('app://') ? 'Ir a Ajustes' : 'Abrir'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => markRead(critical.id)}
              className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              Marcar leída
            </button>
          </div>
        </section>
      );
    }

    return (
      <section
        className="grid gap-6 border p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
            Notificaciones
          </p>
          <h3
            className="mt-2 text-2xl font-extrabold sm:text-3xl"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '-0.02em',
            }}
          >
            Al día
          </h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sin pendientes críticos. Lo nuevo aparece aquí en cuanto se detecta.
          </p>
        </div>
        <div className="text-left lg:border-l lg:pl-8 lg:text-right" style={{ borderColor: 'var(--border-subtle)' }}>
          <p
            className="text-5xl font-extrabold leading-none"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {items.length}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
            En bandeja
          </p>
        </div>
      </section>
    );
  };

  if (loaded && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
            Notificaciones
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
        {/* Dos productos distintos: primer arranque (onboarding con CTA) vs
            bandeja vacía ya sincronizada (refuerzo "Al día"). */}
        {!lastSyncAt ? (
          <div
            className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-12 text-center"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <Bell className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
            <p
              className="mt-4 text-sm font-bold"
              style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
            >
              Tu bandeja empieza aquí
            </p>
            <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
              Sincroniza una vez y DVPotro empezará a avisarte de cambios en tus materias,
              horario, calificaciones y calendario.
            </p>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </button>
          </div>
        ) : (
          <div
            className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-12 text-center"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <p
              className="text-2xl font-extrabold"
              style={{
                color: 'var(--text-strong)',
                fontFamily: 'var(--font-display, sans-serif)',
                letterSpacing: '-0.02em',
              }}
            >
              Al día
            </p>
            <p
              className="mt-2 text-xs uppercase tracking-[0.18em]"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              última sync {formatRelativeTime(lastSyncAt)}
            </p>
            <p className="mt-3 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
              Cuando algo cambie en tus materias, horario, calificaciones o el calendario, aparecerá aquí.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
          Notificaciones ·{' '}
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            {unreadCount}
          </span>{' '}
          sin leer
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Marcar todo leído
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: reduced ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        {renderHero()}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-5">
            <div className="flex items-end gap-5 overflow-x-auto border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {TABS.map(({ id, label }) => {
                const isActive = id === tab;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative shrink-0 pb-3 text-xs font-bold uppercase tracking-[0.14em] ${isActive ? '' : 'tab-hover'}`}
                    style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)' }}
                  >
                    {label}
                    <span
                      className="ml-1.5"
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
                        color: isActive ? 'var(--accent)' : 'inherit',
                      }}
                    >
                      {counts[id]}
                    </span>
                    {isActive ? (
                      <motion.span
                        layoutId="notif-tab-underline"
                        className="absolute inset-x-0 -bottom-px block h-0.5"
                        style={{ background: 'var(--accent)' }}
                        transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="field relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar notificaciones..."
                className="w-full bg-transparent px-4 py-2.5 pl-10 pr-10 text-sm outline-none"
                style={{ color: 'var(--text-strong)' }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {grouped.length === 0 ? (
              <div
                className="flex min-h-32 flex-col items-center justify-center border border-dashed px-6 py-8 text-center"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-card, 0px)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-normal)' }}>
                  {normalizedQuery ? 'Sin notificaciones que coincidan con la búsqueda.' : 'Sin notificaciones en este filtro.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab('todas');
                    setQuery('');
                  }}
                  className="link-accent mt-2 text-sm font-medium"
                >
                  Ver todas
                </button>
              </div>
            ) : (
              grouped.map(({ group, items: groupItems }) => (
                <motion.section
                  key={group}
                  variants={groupVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-baseline gap-3 pb-2">
                    <h4
                      className="text-base font-extrabold uppercase"
                      style={{
                        color: 'var(--text-strong)',
                        fontFamily: 'var(--font-display, sans-serif)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {group}
                    </h4>
                    <div className="flex-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
                    <span
                      className="text-xs"
                      style={{
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {groupItems.length}
                    </span>
                  </div>
                  <div className="space-y-3">{groupItems.map((item) => renderCard(item))}</div>
                </motion.section>
              ))
            )}
          </div>

          <aside className="self-start lg:sticky lg:top-8">
            <section
              className="border"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card, 0px)',
              }}
            >
              <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                  Canales activos
                </h4>
              </div>
              {Object.entries(SOURCE_META).map(([source, meta]) => {
                const Icon = meta.icon;
                const count = items.filter((item) => item.source === source).length;

                return (
                  <div
                    key={source}
                    className="flex items-center justify-between gap-3 border-b px-5 py-2.5 last:border-b-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-normal)' }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                      {meta.label}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        color: count > 0 ? 'var(--text-strong)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </section>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

export default Notificaciones;
