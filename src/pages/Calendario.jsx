import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react';
import { formatLastSync } from '../utils/formatLastSync';
import { EASE } from '../utils/motion';
import ContadorView from './calendario/ContadorView';
import GridView from './calendario/GridView';
import TimelineView from './calendario/TimelineView';
import { DEFAULT_CALENDAR_TYPE, startOfDay } from './calendario/utils';

const VIEW_STORAGE_KEY = 'dvpotro-cal-view';

// El grid mensual se habia quitado porque el dataset ITSON es sparse y dejaba el
// mes casi vacio. Vuelve como vista opcional: la timeline sigue siendo el default.
const VIEWS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'grid', label: 'Grid' },
  { id: 'contador', label: 'Contador' },
];

function readStoredView() {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEWS.some((view) => view.id === stored) ? stored : 'timeline';
  } catch (_error) {
    return 'timeline';
  }
}

function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <div
        className="animate-pulse border p-6"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
        }}
      >
        <div className="h-3 w-36 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="mt-4 h-7 w-3/5 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="mt-3 h-4 w-44 rounded" style={{ background: 'var(--bg-tertiary)' }} />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse border-l py-4 pl-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-4">
              <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-4 w-1/2 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncing = false, onSync }) {
  const reduced = useReducedMotion();
  const [view, setView] = useState(readStoredView);
  const [selectedCalendarType, setSelectedCalendarType] = useState(() => {
    try {
      return localStorage.getItem('dvpotro-cal-type') || DEFAULT_CALENDAR_TYPE;
    } catch (_error) {
      return DEFAULT_CALENDAR_TYPE;
    }
  });

  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const hasEvents = events.length > 0;

  // State (no derivado por render): identidad estable para los memos de las
  // vistas, y un timer lo avanza al cruzar medianoche con la app abierta.
  const [todayStart, setTodayStart] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => {
      setTodayStart(startOfDay(new Date()));
    }, msToMidnight + 100);
    return () => clearTimeout(timer);
  }, [todayStart]);

  const calendarTypes = useMemo(() => {
    const remoteTypes = Array.isArray(calendarData?.calendarTypes) ? calendarData.calendarTypes : [];
    return [...new Set([selectedCalendarType, ...remoteTypes, DEFAULT_CALENDAR_TYPE].filter(Boolean))];
  }, [calendarData?.calendarTypes, selectedCalendarType]);

  useEffect(() => {
    if (calendarData?.calendarType) {
      setSelectedCalendarType((current) =>
        current === calendarData.calendarType ? current : calendarData.calendarType,
      );
    }
  }, [calendarData?.calendarType]);

  const syncCalendar = (options = {}) => {
    onSync?.({ calendarType: selectedCalendarType, ...options });
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    } catch (_error) {
      // localStorage puede no estar disponible fuera del renderer.
    }
  };

  const handleCalendarTypeChange = (nextType) => {
    setSelectedCalendarType(nextType);
    try {
      localStorage.setItem('dvpotro-cal-type', nextType);
    } catch (_error) {
      // localStorage puede no estar disponible fuera del renderer.
    }
    onSync?.({ calendarType: nextType, clearCacheFirst: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.24em]"
          style={{ color: 'var(--text-muted)' }}
        >
          ITSON · Calendario oficial
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <p
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {formatLastSync(calendarData?.timestamp)}
          </p>
          <select
            value={selectedCalendarType}
            onChange={(event) => handleCalendarTypeChange(event.target.value)}
            disabled={isSyncing}
            className="field min-w-[220px] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Nivel académico"
          >
            {calendarTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => syncCalendar({ clearCacheFirst: true })}
            disabled={isSyncing}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {calendarData?.error ? (
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
            <p>{calendarData.error}</p>
          </div>
        </div>
      ) : null}

      {isSyncing ? (
        <CalendarSkeleton />
      ) : !hasEvents ? (
        !calendarData?.error ? (
          <div
            className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-12 text-center"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <CalendarDays className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
            <p
              className="mt-4 text-sm font-bold"
              style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
            >
              Sin calendario sincronizado
            </p>
            <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
              Sincroniza para traer las fechas oficiales del semestre ITSON.
            </p>
            <button
              type="button"
              onClick={() => syncCalendar({ clearCacheFirst: true })}
              className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar calendario
            </button>
          </div>
        ) : null
      ) : (
        <div className="space-y-6">
          <div
            className="flex items-end gap-6 overflow-x-auto border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {VIEWS.map(({ id, label }) => {
              const isActive = id === view;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleViewChange(id)}
                  className={`relative shrink-0 pb-3 text-xs font-bold uppercase tracking-[0.18em] ${isActive ? '' : 'tab-hover'}`}
                  style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)' }}
                >
                  {label}
                  {isActive ? (
                    <motion.span
                      layoutId="cal-view-underline"
                      className="absolute inset-x-0 -bottom-px block h-0.5"
                      style={{ background: 'var(--accent)' }}
                      transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {view === 'grid' ? (
            <GridView
              events={events}
              todayStart={todayStart}
              onSeeAllInTimeline={() => handleViewChange('timeline')}
            />
          ) : null}

          {view === 'contador' ? <ContadorView events={events} todayStart={todayStart} /> : null}

          {view === 'timeline' ? <TimelineView events={events} todayStart={todayStart} /> : null}
        </div>
      )}
    </div>
  );
}

export default Calendario;
