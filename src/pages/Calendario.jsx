import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
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

function SelectField({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`relative block min-w-[180px] ${className}`.trim()}>
      <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-itson-blue/30"
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

function EventCard({ event, compact = false }) {
  const category = event.categoria || 'General';
  const color = getCategoryColor(category);
  const hasLocation = event.ubicacion && !/virtual/i.test(event.ubicacion);

  return (
    <article
      className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'} transition hover:-translate-y-0.5`}
      style={{
        borderColor: 'var(--border-subtle)',
        borderLeft: `3px solid ${color}`,
        background: 'var(--bg-card)',
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h5 className="line-clamp-2 text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
            {event.titulo}
          </h5>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {compact ? formatEventTime(event) : formatDateRange(event.inicio, event.fin)}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold"
          style={{
            background: `${color}20`,
            borderColor: `${color}55`,
            color,
          }}
        >
          {category}
        </span>
      </div>

      {event.descripcion ? (
        <p className="mt-3 line-clamp-2 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
          {event.descripcion}
        </p>
      ) : null}

      {hasLocation ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <MapPin className="h-3 w-3" />
          {event.ubicacion}
        </p>
      ) : null}
    </article>
  );
}

function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncing = false, onSync }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
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
  const groupedEvents = groupEventsByMonth(filteredEvents);
  const hasEvents = events.length > 0;
  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;

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
    setCurrentMonth((month) => {
      if (month > 0) return month - 1;
      setCurrentYear((year) => year - 1);
      return 11;
    });
  };

  const goToNextMonth = () => {
    setSelectedDay(null);
    setCurrentMonth((month) => {
      if (month < 11) return month + 1;
      setCurrentYear((year) => year + 1);
      return 0;
    });
  };

  if (isSyncing) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
            Cargando calendario...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
              <CalendarDays className="h-3.5 w-3.5" />
              ITSON · {currentYear}
            </div>
            <h3 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
              Calendario Escolar
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              Consulta fechas académicas oficiales publicadas por ITSON.
            </p>
          </div>

          <button
            type="button"
            onClick={() => syncCalendar({ clearCacheFirst: true })}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </section>

      {calendarData?.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <p>{calendarData.error}</p>
          </div>
        </div>
      ) : null}

      {!calendarData?.error && !hasEvents ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <CalendarDays className="h-9 w-9 text-slate-600" />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
            Sincroniza para cargar el calendario escolar ITSON.
          </p>
          <button
            type="button"
            onClick={() => syncCalendar({ clearCacheFirst: true })}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Sincronizar ahora
          </button>
        </div>
      ) : null}

      {hasEvents ? (
        <>
          <section
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="rounded-xl border p-2 transition hover:scale-105"
                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {monthLabel}
                </p>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded-xl border p-2 transition hover:scale-105"
                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <SelectField
                  label="Seleccionar un calendario"
                  value={selectedCalendarType}
                  onChange={handleCalendarTypeChange}
                  className="min-w-[260px]"
                >
                  {calendarTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SelectField>

                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </SelectField>
                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
                  {[
                    { id: 'list', label: 'Lista', Icon: List },
                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
                  ].map(({ id, label, Icon }) => {
                    const active = viewMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setViewMode(id)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
                        style={{
                          background: active ? 'var(--accent)' : 'transparent',
                          color: active ? '#fff' : 'var(--text-muted)',
                        }}
                        title={label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {viewMode === 'grid' ? (
            <>
              <section
                className="rounded-2xl border p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
              >
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const dayEvents = day.isCurrentMonth ? getEventsForDay(events, day.date, filterCat) : [];
                    const isSelected = selectedDay && isSameDate(selectedDay, day.date);
                    const clickable = day.isCurrentMonth && dayEvents.length > 0;

                    return (
                      <button
                        key={day.date.toISOString()}
                        type="button"
                        onClick={() => {
                          if (clickable) setSelectedDay(day.date);
                        }}
                        className="text-left transition hover:-translate-y-0.5"
                        style={{
                          minHeight: 72,
                          padding: '4px 6px',
                          borderRadius: 8,
                          cursor: clickable ? 'pointer' : 'default',
                          border: day.isToday ? '2px solid var(--itson-blue)' : '0.5px solid var(--border)',
                          position: 'relative',
                          opacity: day.isCurrentMonth ? 1 : 0.3,
                          background: isSelected ? 'color-mix(in srgb, var(--itson-blue) 10%, transparent)' : 'var(--bg-secondary)',
                          color: day.isCurrentMonth ? 'var(--text-normal)' : 'var(--text-muted)',
                        }}
                      >
                        <span className="text-xs font-semibold">{day.date.getDate()}</span>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {dayEvents.slice(0, 3).map((event, index) => (
                            <span
                              key={`${event.titulo}-${event.inicio}-${index}`}
                              className="h-2 w-2 rounded-full"
                              style={{ background: getCategoryColor(event.categoria || 'General') }}
                            />
                          ))}
                          {dayEvents.length > 3 ? (
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                              +{dayEvents.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedDay && selectedDayEvents.length > 0 ? (
                <section
                  className="rounded-2xl border p-5"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                >
                  <h4 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-strong)' }}>
                    {formatSelectedDay(selectedDay)} · {selectedDayEvents.length} evento{selectedDayEvents.length === 1 ? '' : 's'}
                  </h4>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {selectedDayEvents.map((event, index) => (
                      <EventCard key={`${event.titulo}-${event.inicio}-${index}`} event={event} compact />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                <section key={month} className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-normal)' }}>
                    {month}
                  </h4>
                  <div className="space-y-3">
                    {monthEvents.map((event, index) => (
                      <EventCard key={`${event.titulo}-${event.inicio}-${index}`} event={event} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export { generateCalendarDays, getEventsForDay };
export default Calendario;
