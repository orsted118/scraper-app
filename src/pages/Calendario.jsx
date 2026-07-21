import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatLastSync } from '../utils/formatLastSync';
import { EASE } from '../utils/motion';
import {
  AlertCircle,
  BedDouble,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  MapPin,
  PenLine,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

const DEFAULT_CALENDAR_TYPE = 'Profesional Asociado y Licenciatura';
const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const CATEGORY_ICONS = {
  General: BookOpen,
  Avisos: Bell,
  Académico: GraduationCap,
  Academico: GraduationCap,
  Inscripcion: UserPlus,
  Inscripción: UserPlus,
  Vacaciones: BedDouble,
  Examen: PenLine,
};

function getCategoryIcon(category = 'General') {
  return CATEGORY_ICONS[category] || CalendarDays;
}

function getValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDate(left, right) {
  if (!left || !right) return false;

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isMidnight(date) {
  return date && date.getHours() === 0 && date.getMinutes() === 0;
}

function formatTime(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatEventTime(event) {
  const start = getValidDate(event.inicio);
  const end = getValidDate(event.fin);

  if (!start || isMidnight(start)) {
    return '';
  }

  if (!end || isMidnight(end)) {
    return formatTime(start);
  }

  return `${formatTime(start)}–${formatTime(end)}`;
}

function shortWeekday(date) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
}

function padDay(date) {
  return String(date.getDate()).padStart(2, '0');
}

// Gutter mono: puntual lleva día de semana ("DOM 12 JUL"); rango lleva fecha
// compuesta y vive en su mes de inicio aunque cruce al siguiente.
function formatGutterDate(item) {
  const { start, end, isRange } = item;

  if (!isRange) {
    return `${shortWeekday(start)} ${padDay(start)} ${MONTHS_SHORT[start.getMonth()]}`;
  }

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${padDay(start)} – ${padDay(end)} ${MONTHS_SHORT[start.getMonth()]}`;
  }

  return `${padDay(start)} ${MONTHS_SHORT[start.getMonth()]} – ${padDay(end)} ${MONTHS_SHORT[end.getMonth()]}`;
}

function formatShortRef(date) {
  return `${padDay(date)} ${MONTHS_SHORT[date.getMonth()]}`;
}


function getEventKey(event, index) {
  return `${event.titulo || 'evento'}-${event.inicio || ''}-${index}`;
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
  const [filterCat, setFilterCat] = useState('Todas');
  const [expandedKey, setExpandedKey] = useState('');
  const [pastExpanded, setPastExpanded] = useState(false);
  const [selectedCalendarType, setSelectedCalendarType] = useState(() => {
    try {
      return localStorage.getItem('dvpotro-cal-type') || DEFAULT_CALENDAR_TYPE;
    } catch (_error) {
      return DEFAULT_CALENDAR_TYPE;
    }
  });

  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const todayStart = startOfDay(new Date());

  const calendarTypes = useMemo(() => {
    const remoteTypes = Array.isArray(calendarData?.calendarTypes) ? calendarData.calendarTypes : [];
    return [...new Set([selectedCalendarType, ...remoteTypes, DEFAULT_CALENDAR_TYPE].filter(Boolean))];
  }, [calendarData?.calendarTypes, selectedCalendarType]);

  const categories = useMemo(() => {
    const counts = new Map();
    events.forEach((event) => {
      const category = event.categoria || 'General';
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return [
      { id: 'Todas', count: events.length },
      ...[...counts.entries()].map(([id, count]) => ({ id, count })),
    ];
  }, [events]);

  const enriched = useMemo(() => {
    return events
      .filter((event) => filterCat === 'Todas' || (event.categoria || 'General') === filterCat)
      .map((event, index) => {
        const start = getValidDate(event.inicio);
        const end = getValidDate(event.fin);
        const effectiveEnd = end && !isSameDate(start, end) ? end : null;

        return {
          event,
          key: getEventKey(event, index),
          start,
          end: effectiveEnd || start,
          isRange: Boolean(start && effectiveEnd),
          expandable: Boolean(event.descripcion || event.ubicacion),
        };
      })
      .filter((item) => item.start)
      .sort((left, right) => left.start - right.start);
  }, [events, filterCat]);

  const past = useMemo(
    () => enriched.filter((item) => startOfDay(item.end) < todayStart),
    // todayStart cambia solo con el día; recalcular por render es barato y correcto.
    [enriched], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const future = useMemo(
    () => enriched.filter((item) => startOfDay(item.end) >= todayStart),
    [enriched], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const nextEvent = useMemo(() => {
    const item = future[0];
    if (!item) return null;

    const startDay = startOfDay(item.start);
    const rawDays = Math.round((startDay - todayStart) / DAY_MS);
    return {
      item,
      days: Math.max(0, rawDays),
      enCurso: rawDays < 0,
    };
  }, [future]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

  const futureSections = useMemo(() => {
    const map = new Map();
    future.forEach((item) => {
      const key = monthKey(item.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()];
  }, [future]);

  const pastSections = useMemo(() => {
    const map = new Map();
    past.forEach((item) => {
      const key = monthKey(item.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()];
  }, [past]);

  const monthChips = useMemo(() => {
    if (enriched.length === 0) return [];

    const first = enriched[0].start;
    const last = enriched[enriched.length - 1].start;
    const visibleKeys = new Set([
      ...futureSections.map(([key]) => key),
      ...(pastExpanded ? pastSections.map(([key]) => key) : []),
    ]);
    const chips = [];
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth(), 1);

    while (cursor <= end) {
      const key = monthKey(cursor);
      chips.push({
        key,
        label: MONTHS_SHORT[cursor.getMonth()],
        jumpable: visibleKeys.has(key),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return chips;
  }, [enriched, futureSections, pastSections, pastExpanded]);

  const currentMonthHasEvents = useMemo(() => {
    const now = new Date();
    return enriched.some(
      (item) =>
        item.start.getMonth() === now.getMonth() && item.start.getFullYear() === now.getFullYear(),
    );
  }, [enriched]);

  const showTodayLine = future.length > 0 || past.length > 0;
  const hasEvents = events.length > 0;

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

  const handleCalendarTypeChange = (nextType) => {
    setSelectedCalendarType(nextType);
    try {
      localStorage.setItem('dvpotro-cal-type', nextType);
    } catch (_error) {
      // localStorage puede no estar disponible fuera del renderer.
    }
    onSync?.({ calendarType: nextType, clearCacheFirst: true });
  };

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const renderCategoryMeta = (item) => {
    const category = item.event.categoria || 'General';
    const Icon = getCategoryIcon(category);
    const time = formatEventTime(item.event);
    const durationDays = item.isRange
      ? Math.round((startOfDay(item.end) - startOfDay(item.start)) / DAY_MS) + 1
      : 0;

    return (
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
        <Icon className="h-3 w-3 shrink-0" />
        <span>{category}</span>
        {durationDays > 1 ? (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>· {durationDays} días</span>
        ) : null}
        {time ? (
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            · {time}
          </span>
        ) : null}
      </p>
    );
  };

  const renderEventRow = (item, { muted = false } = {}) => {
    const isExpanded = expandedKey === item.key;

    return (
      <motion.div
        key={item.key}
        layout={reduced ? false : true}
        className="relative border-l"
        style={{
          borderLeftWidth: item.isRange ? '2px' : '1px',
          borderLeftColor: item.isRange ? 'var(--border-normal)' : 'var(--border-subtle)',
        }}
      >
        {!item.isRange ? (
          <span
            className="absolute -left-[3px] top-[21px] h-[5px] w-[5px]"
            style={{ background: muted ? 'var(--text-muted)' : 'var(--text-strong)' }}
          />
        ) : null}

        <button
          type="button"
          onClick={
            item.expandable
              ? () => setExpandedKey((current) => (current === item.key ? '' : item.key))
              : undefined
          }
          className={`grid w-full gap-x-4 gap-y-1 px-4 py-3 text-left sm:grid-cols-[132px_minmax(0,1fr)_auto] ${
            item.expandable ? 'row-hover cursor-pointer' : 'cursor-default'
          }`}
        >
          <span
            className="pt-0.5 text-[11px] font-semibold"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatGutterDate(item)}
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: muted ? 'var(--text-muted)' : 'var(--text-strong)' }}
            >
              {item.event.titulo}
            </p>
            {renderCategoryMeta(item)}
          </div>

          {item.expandable ? (
            <motion.span
              className="hidden self-center sm:block"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          ) : null}
        </button>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="detalle"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
              style={{ overflow: 'hidden' }}
            >
              <div className="space-y-2 px-4 pb-4 sm:pl-[164px]">
                {item.event.descripcion ? (
                  <p className="text-sm leading-6" style={{ color: 'var(--text-normal)' }}>
                    {item.event.descripcion}
                  </p>
                ) : null}
                {item.event.ubicacion ? (
                  <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {item.event.ubicacion}
                  </p>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderMonthSection = ([key, items], { muted = false } = {}) => {
    const [year, month] = key.split('-').map(Number);

    return (
      <section key={key} id={`cal-mes-${key}`} className="scroll-mt-4">
        <div className="flex items-baseline gap-3 pb-2 pt-6">
          <h4
            className="text-base font-extrabold uppercase"
            style={{
              color: muted ? 'var(--text-muted)' : 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '0.06em',
            }}
          >
            {MONTHS_FULL[month]}
          </h4>
          <span
            className="text-xs"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {year}
          </span>
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
          <span
            className="text-xs"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {items.length}
          </span>
        </div>
        <div>{items.map((item) => renderEventRow(item, { muted }))}</div>
      </section>
    );
  };

  const renderTodayLine = () => {
    const now = new Date();
    const label = `Hoy · ${shortWeekday(now)} ${padDay(now)} ${MONTHS_SHORT[now.getMonth()]}`;
    const microcopy = !currentMonthHasEvents
      ? `sin eventos este mes${nextEvent ? ` · próximo: ${formatShortRef(nextEvent.item.start)}` : ''}`
      : '';

    return (
      <motion.div
        id="cal-hoy"
        className="flex scroll-mt-4 items-center gap-3 py-3"
        initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
      >
        <span
          className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {label}
        </span>
        <div className="flex-1 border-t" style={{ borderColor: 'var(--accent)' }} />
        {microcopy ? (
          <span
            className="shrink-0 text-[10px] uppercase tracking-[0.14em]"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {microcopy}
          </span>
        ) : null}
      </motion.div>
    );
  };

  const renderHero = () => {
    if (nextEvent) {
      const { item, days, enCurso } = nextEvent;
      const bigValue = days === 0 ? 'HOY' : String(days);
      const bigLabel = enCurso ? 'En curso' : days === 0 ? 'Comienza' : days === 1 ? 'Día' : 'Días';

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
            <p
              className="text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color: 'var(--accent)' }}
            >
              Próximo evento
            </p>
            <h3
              className="mt-2 text-2xl font-extrabold sm:text-3xl"
              style={{
                color: 'var(--text-strong)',
                fontFamily: 'var(--font-display, sans-serif)',
                letterSpacing: '-0.02em',
                textWrap: 'balance',
              }}
            >
              {item.event.titulo}
            </h3>
            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-normal)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatGutterDate(item)}
              {formatEventTime(item.event) ? ` · ${formatEventTime(item.event)}` : ''}
            </p>
            {renderCategoryMeta(item)}
          </div>

          <div
            className="text-left lg:border-l lg:pl-8 lg:text-right"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p
              className="text-5xl font-extrabold leading-none"
              style={{
                color: days === 0 ? 'var(--accent)' : 'var(--text-strong)',
                fontFamily: 'var(--font-display, sans-serif)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {bigValue}
            </p>
            <p
              className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {bigLabel}
            </p>
          </div>
        </section>
      );
    }

    const first = enriched[0];
    const last = enriched[enriched.length - 1];
    const rangeLabel =
      first && last
        ? `${MONTHS_SHORT[first.start.getMonth()]} ${first.start.getFullYear()} – ${MONTHS_SHORT[last.start.getMonth()]} ${last.start.getFullYear()}`
        : '';

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
          <p
            className="text-[11px] font-bold uppercase tracking-[0.24em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Calendario escolar
          </p>
          <h3
            className="mt-2 text-2xl font-extrabold sm:text-3xl"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '-0.02em',
            }}
          >
            Sin eventos próximos
          </h3>
          {rangeLabel ? (
            <p
              className="mt-2 text-sm"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {rangeLabel}
            </p>
          ) : null}
        </div>

        <div
          className="text-left lg:border-l lg:pl-8 lg:text-right"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p
            className="text-5xl font-extrabold leading-none"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {enriched.length}
          </p>
          <p
            className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Evento{enriched.length === 1 ? '' : 's'}
          </p>
        </div>
      </section>
    );
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
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {renderHero()}

          <div className="flex items-end gap-6 overflow-x-auto border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            {categories.map(({ id, count }) => {
              const isActive = id === filterCat;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFilterCat(id);
                    setExpandedKey('');
                  }}
                  className={`relative shrink-0 pb-3 text-xs font-bold uppercase tracking-[0.18em] ${isActive ? '' : 'tab-hover'}`}
                  style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)' }}
                >
                  {id}
                  <span
                    className="ml-2"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontVariantNumeric: 'tabular-nums',
                      color: isActive ? 'var(--accent)' : 'inherit',
                    }}
                  >
                    {count}
                  </span>
                  {isActive ? (
                    <motion.span
                      layoutId="cal-cat-underline"
                      className="absolute inset-x-0 -bottom-px block h-0.5"
                      style={{ background: 'var(--accent)' }}
                      transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {enriched.length === 0 ? (
            <div
              className="flex min-h-32 flex-col items-center justify-center border border-dashed px-6 py-8 text-center"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card, 0px)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-normal)' }}>
                Sin eventos de esta categoría.
              </p>
              <button
                type="button"
                onClick={() => setFilterCat('Todas')}
                className="link-accent mt-2 text-sm font-medium"
              >
                Ver todas
              </button>
            </div>
          ) : (
            <div>
              {monthChips.length > 1 ? (
                <div className="flex flex-wrap items-center gap-4 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  {monthChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      disabled={!chip.jumpable}
                      title={chip.jumpable ? undefined : 'Sin eventos visibles'}
                      onClick={() => jumpTo(`cal-mes-${chip.key}`)}
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        chip.jumpable ? 'tab-hover cursor-pointer' : 'cursor-default'
                      }`}
                      style={{
                        color: chip.jumpable
                          ? 'var(--text-muted)'
                          : 'color-mix(in srgb, var(--text-muted) 45%, transparent)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  {showTodayLine ? (
                    <button
                      type="button"
                      onClick={() => jumpTo('cal-hoy')}
                      className="text-[11px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      Hoy
                    </button>
                  ) : null}
                </div>
              ) : null}

              {past.length > 0 ? (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setPastExpanded((value) => !value)}
                    className="tab-hover flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <motion.span
                      animate={{ rotate: pastExpanded ? 180 : 0 }}
                      transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
                      className="inline-flex"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.span>
                    {past.length} evento{past.length === 1 ? '' : 's'} pasado{past.length === 1 ? '' : 's'}
                  </button>

                  <AnimatePresence initial={false}>
                    {pastExpanded ? (
                      <motion.div
                        key="pasados"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
                        style={{ overflow: 'hidden' }}
                      >
                        {pastSections.map((section) => renderMonthSection(section, { muted: true }))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              {showTodayLine ? <div className="pt-3">{renderTodayLine()}</div> : null}

              <AnimatePresence initial={false}>
                {futureSections.map((section) => (
                  <motion.div
                    key={section[0]}
                    layout={reduced ? false : true}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.14 } }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    {renderMonthSection(section)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Calendario;
