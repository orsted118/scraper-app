import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  BedDouble,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  PenLine,
  RefreshCw,
  Sun,
  UserPlus,
} from 'lucide-react';

const MONTHS = [
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

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DEFAULT_CALENDAR_TYPE = 'Profesional Asociado y Licenciatura';

const EASE = [0.23, 1, 0.32, 1];

const CATEGORY_COLORS = {
  General: '#006DB6',
  Avisos: '#f97316',
  Académico: '#10b981',
  Academico: '#10b981',
  Inscripcion: '#8b5cf6',
  Inscripción: '#8b5cf6',
  Vacaciones: '#14b8a6',
  Examen: '#ef4444',
};

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

const FALLBACK_COLORS = ['#006DB6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6'];

function hashCode(value = '') {
  return String(value)
    .split('')
    .reduce((hash, char) => {
      const nextHash = (hash << 5) - hash + char.charCodeAt(0);
      return nextHash & nextHash;
    }, 0);
}

function getCategoryColor(category = 'General') {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  return FALLBACK_COLORS[Math.abs(hashCode(category)) % FALLBACK_COLORS.length];
}

function getCategoryIcon(category = 'General') {
  return CATEGORY_ICONS[category] || Sun;
}

function withAlpha(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return 'transparent';
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function getValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
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
    return 'Todo el día';
  }

  if (!end || isMidnight(end)) {
    return formatTime(start);
  }

  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatDateRange(startValue, endValue) {
  const start = getValidDate(startValue);
  const end = getValidDate(endValue);

  if (!start) {
    return 'Fecha por confirmar';
  }

  const sameDay = !end || isSameDate(start, end);
  const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(start);
  const startDay = start.getDate();
  const month = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(start);
  const year = start.getFullYear();

  if (sameDay) {
    return `${weekday} ${startDay} ${month} ${year}`;
  }

  const endWeekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(end);
  const endDay = end.getDate();
  const endMonth = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(end);
  const endYear = end.getFullYear();

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${weekday} ${startDay} – ${endWeekday} ${endDay} ${month} ${year}`;
  }

  return `${weekday} ${startDay} ${month} ${year} – ${endWeekday} ${endDay} ${endMonth} ${endYear}`;
}

function formatSelectedDay(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function generateCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const totalVisibleDays = mondayOffset + lastDay.getDate();
  const weeks = totalVisibleDays <= 35 ? 5 : 6;
  const totalDays = weeks * 7;
  const startDate = new Date(year, month, 1 - mondayOffset);
  const today = new Date();

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDate(date, today),
    };
  });
}

function getEventsForDay(events, date, filterCat = 'Todas') {
  if (!date) return [];

  return events
    .filter((event) => {
      const eventDate = getValidDate(event.inicio);
      const categoryMatch = filterCat === 'Todas' || (event.categoria || 'General') === filterCat;
      return eventDate && categoryMatch && isSameDate(eventDate, date);
    })
    .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
}

function getEventDateForMonth(event) {
  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
  if (direct) return direct;

  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function groupEventsByMonth(events) {
  return events.reduce((groups, event) => {
    const date = getValidDate(event.inicio);
    const key = date ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}` : 'Sin fecha';

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(event);
    return groups;
  }, {});
}

function getNextEvent(events) {
  const now = new Date();
  const upcoming = events
    .map((event) => ({ event, date: getValidDate(event.inicio) }))
    .filter(({ date }) => date && date.getTime() >= now.setHours(0, 0, 0, 0))
    .sort((left, right) => left.date - right.date);

  if (!upcoming.length) return null;

  const { event, date } = upcoming[0];
  const days = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return { event, date, days };
}

function SelectField({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`relative block min-w-[180px] ${className}`.trim()}>
      <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-normal)',
          color: 'var(--text-strong)',
        }}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute bottom-2.5 right-3 h-4 w-4"
        style={{ color: 'var(--text-muted)' }}
      />
    </label>
  );
}

function NextEventCard({ nextEvent, reduceMotion }) {
  if (!nextEvent) {
    return (
      <div
        className="flex min-w-[280px] items-center gap-4 rounded-2xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
      >
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
          style={{ border: '3px solid var(--border-normal)' }}
        >
          <CalendarClock className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
            Próximo evento
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
            Sin eventos próximos
          </p>
        </div>
      </div>
    );
  }

  const { event, date, days } = nextEvent;
  const circumference = 2 * Math.PI * 25;
  const fillFraction = 1 - Math.min(Math.max(days, 0), 30) / 30;
  const dashoffset = circumference * (1 - fillFraction);
  const label = days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `en ${days} días`;

  return (
    <div
      className="flex min-w-[300px] items-center gap-4 rounded-2xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}
    >
      <div className="relative h-[58px] w-[58px] shrink-0">
        <svg width="58" height="58" viewBox="0 0 58 58" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="29" cy="29" r="25" fill="none" strokeWidth="4" style={{ stroke: 'var(--border-normal)' }} />
          <motion.circle
            cx="29"
            cy="29"
            r="25"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ stroke: 'var(--accent)' }}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduceMotion ? dashoffset : circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE, delay: 0.15 }}
          />
        </svg>
        <div
          className="absolute inset-0 grid place-items-center text-[20px] font-bold"
          style={{ color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
        >
          {days === 0 ? '·' : days}
        </div>
      </div>
      <div className="min-w-0">
        <p
          className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: 'var(--text-muted)' }}
        >
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
            animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1], scale: [1, 0.7, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          Próximo evento · {label}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {event.titulo}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <CalendarDays className="h-3 w-3" />
          {formatDateRange(event.inicio, event.fin)} · {formatEventTime(event)}
        </p>
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const category = event.categoria || 'General';
  const color = getCategoryColor(category);
  const Icon = getCategoryIcon(category);
  const hasLocation = event.ubicacion && !/virtual/i.test(event.ubicacion);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: EASE }}
      className="flex items-start gap-3 rounded-2xl border p-4"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-tertiary)' }}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ background: withAlpha(color, 0.15), color }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="line-clamp-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {event.titulo}
        </h5>
        <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock className="h-3 w-3" />
          {formatEventTime(event)}
        </p>
        {event.descripcion ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
            {event.descripcion}
          </p>
        ) : null}
        {hasLocation ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <MapPin className="h-3 w-3" />
            {event.ubicacion}
          </p>
        ) : null}
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
        style={{ background: withAlpha(color, 0.15), color }}
      >
        {category}
      </span>
    </motion.article>
  );
}

function DayCell({ day, dayEvents, isSelected, onSelect, reduceMotion }) {
  const clickable = day.isCurrentMonth && dayEvents.length > 0;

  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 6 },
    show: { opacity: day.isCurrentMonth ? 1 : 0.32, y: 0, transition: { duration: 0.3, ease: EASE } },
  };

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={clickable && !reduceMotion ? { y: -2 } : undefined}
      whileTap={clickable ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.18, ease: EASE }}
      onClick={() => clickable && onSelect(day.date)}
      className="relative flex min-h-[100px] flex-col rounded-2xl border p-2 text-left"
      style={{
        minWidth: 0,
        cursor: clickable ? 'pointer' : 'default',
        borderColor: isSelected ? 'var(--accent)' : 'var(--border-subtle)',
        background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-tertiary)',
        boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
      }}
    >
      <span
        className="inline-grid h-[22px] min-w-[22px] self-start place-items-center rounded-lg px-1.5 text-xs font-semibold"
        style={{
          background: day.isToday ? 'var(--accent)' : 'transparent',
          color: day.isToday ? '#fff' : 'var(--text-normal)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {day.date.getDate()}
      </span>
      <div className="mt-1.5 flex min-w-0 flex-col gap-[3px]">
        {dayEvents.slice(0, 2).map((event, index) => {
          const color = getCategoryColor(event.categoria || 'General');
          const Icon = getCategoryIcon(event.categoria || 'General');
          return (
            <div
              key={`${event.titulo}-${event.inicio}-${index}`}
              className="flex items-center gap-1.5 overflow-hidden rounded-md py-[2px] pl-[5px] pr-1.5 text-[10.5px] font-medium"
              style={{ borderLeft: `2px solid ${color}`, background: withAlpha(color, 0.13), color: 'var(--text-strong)' }}
            >
              <Icon className="h-2.5 w-2.5 shrink-0" style={{ color }} />
              <span className="truncate">{event.titulo}</span>
            </div>
          );
        })}
        {dayEvents.length > 2 ? (
          <span className="pl-[5px] text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            +{dayEvents.length - 2} más
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}

function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncing = false, onSync }) {
  const reduceMotion = useReducedMotion();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [direction, setDirection] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [filterCat, setFilterCat] = useState('Todas');
  const [selectedCalendarType, setSelectedCalendarType] = useState(() => {
    try {
      return localStorage.getItem('dvpotro-cal-type') || DEFAULT_CALENDAR_TYPE;
    } catch (_error) {
      return DEFAULT_CALENDAR_TYPE;
    }
  });

  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
  const calendarTypes = useMemo(() => {
    const remoteTypes = Array.isArray(calendarData?.calendarTypes) ? calendarData.calendarTypes : [];
    return [...new Set([selectedCalendarType, ...remoteTypes, DEFAULT_CALENDAR_TYPE].filter(Boolean))];
  }, [calendarData?.calendarTypes, selectedCalendarType]);
  const categories = useMemo(
    () => ['Todas', ...new Set(events.map((event) => event.categoria || 'General'))],
    [events],
  );
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => filterCat === 'Todas' || (event.categoria || 'General') === filterCat)
      .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
  }, [events, filterCat]);
  const calendarDays = useMemo(() => generateCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
  const selectedDayEvents = useMemo(
    () => getEventsForDay(events, selectedDay, filterCat),
    [events, filterCat, selectedDay],
  );
  const visibleMonthCount = useMemo(() => {
    return events.filter((event) => {
      const date = getEventDateForMonth(event);
      const categoryMatch = filterCat === 'Todas' || (event.categoria || 'General') === filterCat;
      return date && categoryMatch && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  }, [currentMonth, currentYear, events, filterCat]);
  const nextEvent = useMemo(() => getNextEvent(filteredEvents), [filteredEvents]);
  const groupedEvents = groupEventsByMonth(filteredEvents);
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
      // Local storage can be unavailable in restricted contexts.
    }
    onSync?.({ calendarType: nextType, clearCacheFirst: true });
  };

  const goToPreviousMonth = () => {
    setSelectedDay(null);
    setDirection(-1);
    setCurrentMonth((month) => {
      if (month > 0) return month - 1;
      setCurrentYear((year) => year - 1);
      return 11;
    });
  };

  const goToNextMonth = () => {
    setSelectedDay(null);
    setDirection(1);
    setCurrentMonth((month) => {
      if (month < 11) return month + 1;
      setCurrentYear((year) => year + 1);
      return 0;
    });
  };

  const goToToday = () => {
    setSelectedDay(null);
    setDirection(0);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  if (isSyncing) {
    return (
      <div
        className="flex min-h-[420px] items-center justify-center rounded-3xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
            Cargando calendario...
          </p>
        </div>
      </div>
    );
  }

  const slideVariants = {
    enter: (dir) => ({ x: reduceMotion ? 0 : dir > 0 ? 36 : dir < 0 ? -36 : 0, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: reduceMotion ? 0.15 : 0.3, ease: EASE } },
    exit: (dir) => ({
      x: reduceMotion ? 0 : dir > 0 ? -36 : dir < 0 ? 36 : 0,
      opacity: 0,
      transition: { duration: reduceMotion ? 0.1 : 0.2, ease: EASE },
    }),
  };

  const gridContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.014, delayChildren: 0.08 } },
  };

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-[26px] border p-8"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-52 h-[520px] w-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle at center, var(--accent) 0%, transparent 66%)', opacity: 0.16 }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 lg:flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              Calendario escolar · {selectedCalendarType}
            </p>
            <h1
              className="mt-3 text-[clamp(2.4rem,4.6vw,3.7rem)] font-bold leading-[0.92]"
              style={{ color: 'var(--text-strong)', letterSpacing: '-0.035em' }}
            >
              {MONTHS[currentMonth]}{' '}
              <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{currentYear}</span>
            </h1>
            <motion.div
              className="mt-3.5 h-[3px] rounded-full"
              style={{ background: 'var(--accent)' }}
              initial={{ width: reduceMotion ? 72 : 0 }}
              animate={{ width: 72 }}
              transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE, delay: 0.15 }}
            />
            <div className="mt-5 flex items-center gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={goToPreviousMonth}
                className="grid h-9 w-9 place-items-center rounded-xl border"
                style={{ borderColor: 'var(--border-normal)', color: 'var(--text-strong)' }}
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={goToNextMonth}
                className="grid h-9 w-9 place-items-center rounded-xl border"
                style={{ borderColor: 'var(--border-normal)', color: 'var(--text-strong)' }}
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={goToToday}
                className="rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold"
                style={{
                  color: 'var(--accent)',
                  borderColor: 'color-mix(in srgb, var(--accent) 22%, transparent)',
                  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                }}
              >
                Hoy
              </motion.button>
              <span className="ml-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {visibleMonthCount} evento{visibleMonthCount === 1 ? '' : 's'} este mes
              </span>
            </div>
          </div>

          <NextEventCard nextEvent={nextEvent} reduceMotion={reduceMotion} />
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category === filterCat;
            const color = category === 'Todas' ? null : getCategoryColor(category);
            const Icon = category === 'Todas' ? null : getCategoryIcon(category);
            return (
              <motion.button
                key={category}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setFilterCat(category);
                  setSelectedDay(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12.5px] font-medium"
                style={{
                  background: active ? color || 'var(--accent)' : 'transparent',
                  borderColor: active ? 'transparent' : 'var(--border-normal)',
                  color: active ? '#fff' : 'var(--text-muted)',
                }}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {category}
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <SelectField
            label=""
            value={selectedCalendarType}
            onChange={handleCalendarTypeChange}
            className="min-w-[220px]"
          >
            {calendarTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectField>
          <div
            className="relative flex self-end rounded-xl border p-[3px]"
            style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-tertiary)' }}
          >
            <motion.div
              className="absolute top-[3px] h-[30px] w-9 rounded-lg"
              style={{ background: 'var(--accent)' }}
              animate={{ x: viewMode === 'grid' ? 0 : 36 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
            />
            {[
              { id: 'grid', Icon: LayoutGrid, label: 'Grilla' },
              { id: 'list', Icon: List, label: 'Lista' },
            ].map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className="relative z-10 grid h-[30px] w-9 place-items-center rounded-lg transition-colors"
                style={{ color: viewMode === id ? '#fff' : 'var(--text-muted)' }}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {calendarData?.error ? (
        <div
          className="rounded-2xl border px-4 py-4 text-sm"
          style={{ borderColor: 'var(--error-border)', background: 'var(--error-bg)', color: 'var(--error-text)' }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{calendarData.error}</p>
          </div>
        </div>
      ) : null}

      {!calendarData?.error && !hasEvents ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <CalendarDays className="h-9 w-9" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
            Sincroniza para cargar el calendario escolar ITSON.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => syncCalendar({ clearCacheFirst: true })}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Sincronizar ahora
          </motion.button>
        </div>
      ) : null}

      {hasEvents ? (
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE }}
              className="space-y-5"
            >
              <section
                className="overflow-hidden rounded-3xl border p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                <div
                  className="mb-2 grid grid-cols-7 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className="px-2.5 py-1.5">
                      {day}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={`${currentYear}-${currentMonth}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <motion.div className="grid grid-cols-7 gap-1.5" variants={gridContainer} initial="hidden" animate="show">
                      {calendarDays.map((day) => {
                        const dayEvents = day.isCurrentMonth ? getEventsForDay(events, day.date, filterCat) : [];
                        const isSelected = selectedDay && isSameDate(selectedDay, day.date);
                        return (
                          <DayCell
                            key={day.date.toISOString()}
                            day={day}
                            dayEvents={dayEvents}
                            isSelected={isSelected}
                            reduceMotion={reduceMotion}
                            onSelect={(date) =>
                              setSelectedDay((current) => (current && isSameDate(current, date) ? null : date))
                            }
                          />
                        );
                      })}
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </section>

              <AnimatePresence initial={false}>
                {selectedDay && selectedDayEvents.length > 0 ? (
                  <motion.section
                    key={selectedDay.toISOString()}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0.15 : 0.32, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-3xl border p-5"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                    >
                      <h4 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-strong)' }}>
                        {formatSelectedDay(selectedDay)} · {selectedDayEvents.length} evento
                        {selectedDayEvents.length === 1 ? '' : 's'}
                      </h4>
                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        {selectedDayEvents.map((event, index) => (
                          <EventCard key={`${event.titulo}-${event.inicio}-${index}`} event={event} />
                        ))}
                      </div>
                    </div>
                  </motion.section>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE }}
              className="space-y-5"
            >
              {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                <section key={month} className="space-y-3">
                  <h4
                    className="text-[12.5px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {month}
                  </h4>
                  <div className="space-y-3">
                    {monthEvents.map((event, index) => (
                      <EventCard key={`${event.titulo}-${event.inicio}-${index}`} event={event} />
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}
    </div>
  );
}

export { generateCalendarDays, getEventsForDay };
export default Calendario;
