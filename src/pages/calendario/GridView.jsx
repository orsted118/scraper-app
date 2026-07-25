import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { EASE } from '../../utils/motion';
import {
  MONTHS_FULL,
  WEEKDAYS_SHORT,
  enrichEvents,
  formatEventTime,
  formatGutterDate,
  fromDateInputValue,
  getCategoryColor,
  getCategoryIcon,
  isSameDate,
  startOfDay,
  toDateInputValue,
} from './utils';

// Alto de cada barra multi-dia y offset del primer carril: el numero del dia
// ocupa la primera linea de la celda y las barras arrancan debajo.
const BAR_HEIGHT = 20;
const LANES_TOP = 30;
const MAX_VISIBLE_PER_DAY = 3;
const SLIDE_DISTANCE = 30;
// Un mes lleno pasa los 40 dias; sin tope el ultimo evento entraria casi un
// segundo despues del primero y la cascada se leeria como lag.
const STAGGER_CAP_MS = 0.3;

function buildMonthWeeks(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // getDay() arranca en domingo; la semana del calendario ITSON arranca en lunes.
  const offset = (first.getDay() + 6) % 7;
  const cursor = new Date(year, month, 1 - offset);
  const weeks = [];

  while (weeks.length === 0 || cursor <= last) {
    const week = [];

    for (let index = 0; index < 7; index += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push(week);
  }

  return weeks;
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function coversDay(item, day) {
  const time = day.getTime();
  return startOfDay(item.start).getTime() <= time && startOfDay(item.end).getTime() >= time;
}

// Reparte las barras de la semana en carriles para que dos rangos solapados no
// se pisen. Greedy: cada barra cae en el primer carril libre.
function layoutWeekBars(items, week) {
  const weekStart = week[0].getTime();
  const weekEnd = week[6].getTime();
  const lanes = [];

  return items
    .filter((item) => item.isRange)
    .filter(
      (item) =>
        startOfDay(item.start).getTime() <= weekEnd && startOfDay(item.end).getTime() >= weekStart,
    )
    .map((item) => {
      const startIndex = week.findIndex((day) => coversDay(item, day));
      const endIndex = week.reduce((last, day, index) => (coversDay(item, day) ? index : last), 0);

      return { item, startIndex, span: endIndex - startIndex + 1 };
    })
    .sort((left, right) => left.startIndex - right.startIndex || right.span - left.span)
    .map((bar) => {
      const laneIndex = lanes.findIndex((lane) => lane <= bar.startIndex);
      const lane = laneIndex >= 0 ? laneIndex : lanes.length;
      lanes[lane] = bar.startIndex + bar.span;

      return { ...bar, lane };
    });
}

function EventBlock({ title, categoria, index, reduced, onClick, style, className = '' }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.span
      className={`relative block overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduced ? 0 : Math.min(index * 0.02, STAGGER_CAP_MS),
        duration: reduced ? 0 : 0.18,
        ease: EASE,
      }}
      style={{
        borderLeft: `3px solid ${getCategoryColor(categoria)}`,
        background: 'var(--bg-tertiary)',
        color: 'var(--text-normal)',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        ...style,
      }}
    >
      {/* El realce de hover es una capa de acento a opacidad baja: framer no
          sabe interpolar color-mix(), pero opacity anima limpio. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--accent)' }}
        animate={{ opacity: hovered && !reduced ? 0.12 : 0 }}
        transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
      />
      <span className="relative block truncate">{title}</span>
    </motion.span>
  );
}

function GridView({ events, todayStart }) {
  const reduced = useReducedMotion();
  const containerRef = useRef(null);
  const [cursorMonth, setCursorMonth] = useState(
    () => new Date(todayStart.getFullYear(), todayStart.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState('');
  const [direction, setDirection] = useState(0);

  const enriched = useMemo(() => enrichEvents(events), [events]);

  const weeks = useMemo(
    () => buildMonthWeeks(cursorMonth.getFullYear(), cursorMonth.getMonth()),
    [cursorMonth],
  );

  const selectedDate = useMemo(() => fromDateInputValue(selectedDay), [selectedDay]);

  const selectedItems = useMemo(
    () => (selectedDate ? enriched.filter((item) => coversDay(item, selectedDate)) : []),
    [selectedDate, enriched],
  );

  useEffect(() => {
    if (!selectedDay) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) {
        return;
      }
      setSelectedDay('');
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [selectedDay]);

  const shiftMonth = (delta) => {
    setDirection(delta);
    setSelectedDay('');
    setCursorMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const goToday = () => {
    setDirection(0);
    setSelectedDay('');
    setCursorMonth(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
  };

  const selectDay = (day, dayItems) => {
    if (dayItems.length === 0) {
      return;
    }

    const key = toDateInputValue(day);
    setSelectedDay((current) => (current === key ? '' : key));
  };

  const getCellBackground = (weekend, selected) => {
    // El seleccionado siempre lleva la mezcla con acento: si usara bg-secondary
    // a secas quedaria indistinguible de un fin de semana sin seleccionar.
    if (selected) return 'color-mix(in srgb, var(--bg-secondary) 100%, var(--accent) 8%)';
    if (weekend) return 'var(--bg-secondary)';
    return 'transparent';
  };

  const renderDayNumber = (day, inMonth, isToday) => {
    const color = isToday
      ? 'var(--accent)'
      : !inMonth
        ? 'color-mix(in srgb, var(--text-muted) 35%, transparent)'
        : isWeekend(day)
          ? 'color-mix(in srgb, var(--text-muted) 60%, transparent)'
          : 'var(--text-muted)';

    return (
      <span
        className="block text-[12px] font-semibold leading-4"
        style={{
          color,
          fontFamily: 'var(--font-mono, monospace)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(day.getDate()).padStart(2, '0')}
      </span>
    );
  };

  const renderWeek = (week, weekIndex, isLastWeek) => {
    const bars = layoutWeekBars(enriched, week);
    const laneCount = bars.reduce((max, bar) => Math.max(max, bar.lane + 1), 0);

    return (
      <div key={weekIndex} className="relative">
        <div className="grid grid-cols-7">
          {week.map((day, dayIndex) => {
            const inMonth = day.getMonth() === cursorMonth.getMonth();
            const isToday = isSameDate(day, todayStart);
            const barsHere = bars.filter((bar) => coversDay(bar.item, day)).length;
            const singles = enriched.filter((item) => !item.isRange && isSameDate(item.start, day));
            const dayItems = enriched.filter((item) => coversDay(item, day));
            const visibleSingles = singles.slice(0, Math.max(0, MAX_VISIBLE_PER_DAY - barsHere));
            const hidden = singles.length - visibleSingles.length;
            const isSelected = selectedDay === toDateInputValue(day);

            return (
              <div
                key={dayIndex}
                onClick={() => selectDay(day, dayItems)}
                className={`relative min-h-[100px] p-2 md:min-h-[150px] ${
                  dayItems.length > 0 ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  borderTop: '3px solid transparent',
                  borderRight: dayIndex === 6 ? 'none' : '1px solid var(--border-subtle)',
                  borderBottom: isLastWeek ? 'none' : '1px solid var(--border-subtle)',
                  background: getCellBackground(isWeekend(day), isSelected),
                }}
              >
                {/* El pulso de hoy anima opacidad sobre una barra solida en vez
                    de un glow: el sistema visual prohibe sombras con blur. */}
                {isToday ? (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute left-0 right-0"
                    style={{ top: -3, height: 3, background: 'var(--accent)' }}
                    animate={reduced ? { opacity: 1 } : { opacity: [1, 0.6, 1] }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                    }
                  />
                ) : null}

                {renderDayNumber(day, inMonth, isToday)}
                <div style={{ height: laneCount * BAR_HEIGHT }} />
                <div className="space-y-[2px]">
                  {visibleSingles.map((item) => (
                    <EventBlock
                      key={item.key}
                      title={item.event.titulo}
                      categoria={item.event.categoria}
                      index={weekIndex * 7 + dayIndex}
                      reduced={reduced}
                    />
                  ))}
                  {hidden > 0 ? (
                    <span
                      className="block text-[10px] font-semibold uppercase tracking-[0.06em]"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      {hidden} más
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Las barras cruzan celdas, así que viven en una capa aparte. La capa no
            intercepta clicks; solo la barra, para poder resaltar en hover y
            abrir el mismo panel que la celda donde arranca. */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
          {bars.map((bar) => (
            <EventBlock
              key={bar.item.key}
              title={bar.item.event.titulo}
              categoria={bar.item.event.categoria}
              index={weekIndex * 7 + bar.startIndex}
              reduced={reduced}
              className="pointer-events-auto cursor-pointer self-start"
              onClick={() =>
                selectDay(
                  week[bar.startIndex],
                  enriched.filter((item) => coversDay(item, week[bar.startIndex])),
                )
              }
              style={{
                gridColumn: `${bar.startIndex + 1} / span ${bar.span}`,
                gridRow: 1,
                marginTop: LANES_TOP + bar.lane * BAR_HEIGHT,
                marginRight: bar.startIndex + bar.span === 7 ? '8px' : '2px',
                marginLeft: '8px',
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const enterX = reduced ? 0 : direction * SLIDE_DISTANCE;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: reduced ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4">
        <div className="flex items-baseline gap-3">
          <h3
            className="text-2xl font-extrabold uppercase"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '-0.02em',
            }}
          >
            {MONTHS_FULL[cursorMonth.getMonth()]}
          </h3>
          <span
            className="text-xs"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {cursorMonth.getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
            className="btn-outline inline-flex h-9 w-9 items-center justify-center"
            whileHover={reduced ? undefined : { x: -2 }}
            transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
          <button
            type="button"
            onClick={goToday}
            className="btn-outline px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
          >
            Hoy
          </button>
          <motion.button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
            className="btn-outline inline-flex h-9 w-9 items-center justify-center"
            whileHover={reduced ? undefined : { x: 2 }}
            transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div
        className="border"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
        }}
      >
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: '2px solid var(--border)' }}
        >
          {WEEKDAYS_SHORT.map((label) => (
            <span
              key={label}
              className="px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {label}
            </span>
          ))}
        </div>

        <div style={{ overflow: 'hidden' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${cursorMonth.getFullYear()}-${cursorMonth.getMonth()}`}
              // Con reduced no hay estado inicial que remontar: el mes entra ya
              // pintado en vez de depender de un frame para volverse visible.
              initial={reduced ? false : { x: enterX, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduced ? { opacity: 1 } : { x: -enterX, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
            >
              {weeks.map((week, index) => renderWeek(week, index, index === weeks.length - 1))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {selectedItems.length > 0 ? (
          <motion.div
            key={selectedDay}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="mt-4 border p-5"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card, 0px)',
              }}
            >
              <p className="flex flex-wrap items-baseline gap-x-2 text-[10px] font-bold uppercase tracking-[0.24em]">
                <span style={{ color: 'var(--accent)' }}>
                  {formatGutterDate({ start: selectedDate, end: selectedDate, isRange: false })}
                </span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  · {selectedItems.length} evento{selectedItems.length === 1 ? '' : 's'}
                </span>
              </p>
              <div className="mt-3 space-y-3">
                {selectedItems.map((item) => {
                  const Icon = getCategoryIcon(item.event.categoria);
                  const time = formatEventTime(item.event);

                  return (
                    <div
                      key={item.key}
                      className="border-l pl-3"
                      style={{ borderLeftWidth: '3px', borderLeftColor: getCategoryColor(item.event.categoria) }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                        {item.event.titulo}
                      </p>
                      <p
                        className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span>{item.event.categoria || 'General'}</span>
                        {item.isRange ? <span>· {formatGutterDate(item)}</span> : null}
                        {time ? (
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                            · {time}
                          </span>
                        ) : null}
                      </p>
                      {item.event.descripcion ? (
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-normal)' }}>
                          {item.event.descripcion}
                        </p>
                      ) : null}
                      {item.event.ubicacion ? (
                        <p
                          className="mt-2 flex items-center gap-2 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {item.event.ubicacion}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default GridView;
