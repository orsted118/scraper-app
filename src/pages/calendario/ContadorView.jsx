import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../../utils/motion';
import DaysCounter from './DaysCounter';
import {
  DAY_MS,
  diffInDays,
  enrichEvents,
  formatGutterDate,
  fromDateInputValue,
  startOfDay,
  toDateInputValue,
} from './utils';

const CUSTOM_FALLBACK_DAYS = 7;

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--border-normal)',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--on-accent)' : 'var(--text-normal)',
        borderRadius: 'var(--radius-button, 0px)',
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span
        className="block text-[10px] font-bold uppercase tracking-[0.24em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ContadorView({ events, todayStart }) {
  const reduced = useReducedMotion();

  const enriched = useMemo(() => enrichEvents(events), [events]);

  // Un evento en curso no sirve de destino: su inicio ya quedó atrás y el rango
  // saldría invertido. Solo cuentan los que todavía no empezaron.
  const future = useMemo(
    () => enriched.filter((item) => startOfDay(item.start) >= todayStart),
    [enriched, todayStart],
  );

  const nextItem = future[0] || null;
  const lastItem = enriched[enriched.length - 1] || null;

  const defaultTo = nextItem
    ? startOfDay(nextItem.start)
    : new Date(todayStart.getTime() + CUSTOM_FALLBACK_DAYS * DAY_MS);

  const [from, setFrom] = useState(() => toDateInputValue(todayStart));
  const [to, setTo] = useState(() => toDateInputValue(defaultTo));
  const [destinoKey, setDestinoKey] = useState('');

  const fromDate = fromDateInputValue(from);
  const toDate = fromDateInputValue(to);

  const preset = useMemo(() => {
    if (!fromDate || !toDate || toDateInputValue(todayStart) !== from) {
      return 'custom';
    }
    if (nextItem && to === toDateInputValue(startOfDay(nextItem.start))) {
      return 'next';
    }
    if (lastItem && to === toDateInputValue(startOfDay(lastItem.end))) {
      return 'semester';
    }
    return 'custom';
  }, [from, to, fromDate, toDate, nextItem, lastItem, todayStart]);

  const applyRange = (nextFrom, nextTo, key = '') => {
    setFrom(toDateInputValue(nextFrom));
    setTo(toDateInputValue(nextTo));
    setDestinoKey(key);
  };

  const handleFromChange = (value) => {
    setFrom(value);
    setDestinoKey('');
  };

  const handleToChange = (value) => {
    setTo(value);
    setDestinoKey('');
  };

  const handleDestinoChange = (key) => {
    const item = future.find((candidate) => candidate.key === key);

    if (!item) {
      setDestinoKey('');
      return;
    }

    setTo(toDateInputValue(startOfDay(item.start)));
    setDestinoKey(key);
  };

  const destino = future.find((item) => item.key === destinoKey) || null;
  const isInvalid = Boolean(fromDate && toDate && toDate < fromDate);
  const days = fromDate && toDate && !isInvalid ? diffInDays(fromDate, toDate) : 0;
  const weeks = Math.floor(days / 7);
  const restDays = days % 7;

  const renderOutput = () => {
    if (!fromDate || !toDate) {
      return (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Elige las dos fechas para contar.
        </p>
      );
    }

    if (isInvalid) {
      return (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          El rango termina antes de empezar.
        </p>
      );
    }

    return (
      <>
        <DaysCounter
          value={days}
          label={days === 0 ? 'Mismo día' : days === 1 ? 'Día' : 'Días'}
          accent={days === 0}
          size="xl"
        />
        <p
          className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {weeks} semana{weeks === 1 ? '' : 's'} · {restDays} día{restDays === 1 ? '' : 's'}
        </p>
        <p
          className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {days * 24} horas totales
        </p>
      </>
    );
  };

  return (
    <motion.section
      className="border p-6"
      initial={{ opacity: 0, y: reduced ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-[0.24em]"
        style={{ color: 'var(--accent)' }}
      >
        Contador de días
      </p>

      <div className="mt-6">{renderOutput()}</div>

      <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex flex-wrap gap-2">
          {nextItem ? (
            <Chip
              active={preset === 'next'}
              onClick={() => applyRange(todayStart, startOfDay(nextItem.start), nextItem.key)}
            >
              Hoy → próximo evento
            </Chip>
          ) : null}
          {lastItem ? (
            <Chip
              active={preset === 'semester'}
              onClick={() => applyRange(todayStart, startOfDay(lastItem.end))}
            >
              Hoy → fin del semestre
            </Chip>
          ) : null}
          <Chip
            active={preset === 'custom'}
            onClick={() =>
              applyRange(todayStart, new Date(todayStart.getTime() + CUSTOM_FALLBACK_DAYS * DAY_MS))
            }
          >
            Custom
          </Chip>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,180px))_minmax(0,1fr)]">
          <Field label="Desde">
            <input
              type="date"
              value={from}
              onChange={(event) => handleFromChange(event.target.value)}
              className="field w-full px-3 py-2 text-sm"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
            />
          </Field>

          <Field label="Hasta">
            <input
              type="date"
              value={to}
              onChange={(event) => handleToChange(event.target.value)}
              className="field w-full px-3 py-2 text-sm"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
            />
          </Field>

          <Field label="Elegir evento como destino">
            <select
              value={destinoKey}
              onChange={(event) => handleDestinoChange(event.target.value)}
              disabled={future.length === 0}
              className="field w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Sin evento seleccionado</option>
              {future.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.event.titulo}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {destino ? (
          <p
            className="mt-4 text-sm"
            style={{ color: 'var(--text-normal)' }}
          >
            <span
              className="mr-2 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatGutterDate(destino)}
            </span>
            {destino.event.titulo}
          </p>
        ) : null}
      </div>
    </motion.section>
  );
}

export default ContadorView;
