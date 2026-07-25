import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, MapPin } from 'lucide-react';
import { EASE } from '../../utils/motion';
import DaysCounter from './DaysCounter';
import {
  DAY_MS,
  MONTHS_FULL,
  MONTHS_SHORT,
  enrichEvents,
  formatEventTime,
  formatGutterDate,
  formatShortRef,
  getCategoryIcon,
  monthKey,
  padDay,
  shortWeekday,
  startOfDay,
} from './utils';

function TimelineView({ events, todayStart }) {
  const reduced = useReducedMotion();
  const [filterCat, setFilterCat] = useState('Todas');
  const [expandedKey, setExpandedKey] = useState('');
  const [pastExpanded, setPastExpanded] = useState(false);

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

  const enriched = useMemo(() => enrichEvents(events, filterCat), [events, filterCat]);

  const past = useMemo(
    () => enriched.filter((item) => startOfDay(item.end) < todayStart),
    [enriched, todayStart],
  );
  const future = useMemo(
    () => enriched.filter((item) => startOfDay(item.end) >= todayStart),
    [enriched, todayStart],
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
  }, [future, todayStart]);

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
            <DaysCounter value={bigValue} label={bigLabel} accent={days === 0} />
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
          <DaysCounter
            value={enriched.length}
            label={`Evento${enriched.length === 1 ? '' : 's'}`}
          />
        </div>
      </section>
    );
  };

  return (
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
  );
}

export default TimelineView;
