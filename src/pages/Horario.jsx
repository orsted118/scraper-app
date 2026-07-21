import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ExternalLink,
  RefreshCw,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASE = [0.23, 1, 0.32, 1];
const SLOT_PX = 40;
const PX_PER_MIN = SLOT_PX / 30;
const GUTTER_PX = 64;
const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function normalizeActivities(entries = []) {
  return Array.isArray(entries) ? entries : [];
}

function toMinutes(time) {
  if (!time || typeof time !== 'string') {
    return null;
  }

  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToHHMM(minutes) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function format12h(time24) {
  if (!time24 || typeof time24 !== 'string') {
    return '--:--';
  }

  const [hoursRaw, minutesRaw] = time24.split(':').map(Number);
  if (!Number.isFinite(hoursRaw) || !Number.isFinite(minutesRaw)) {
    return '--:--';
  }

  const period = hoursRaw >= 12 ? 'PM' : 'AM';
  const hours = hoursRaw % 12 === 0 ? 12 : hoursRaw % 12;
  return `${hours}:${String(minutesRaw).padStart(2, '0')} ${period}`;
}

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

function normDay(dayValue) {
  return String(dayValue || '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function getMateriaSessions(materia) {
  const sessions = Array.isArray(materia?.sesiones) ? materia.sesiones : [];
  const validSessions = sessions.filter(
    (session) =>
      session &&
      Array.isArray(session.dias) &&
      session.dias.length > 0 &&
      typeof session.horaInicio === 'string' &&
      typeof session.horaFin === 'string',
  );

  if (validSessions.length > 0) {
    return validSessions;
  }

  if (Array.isArray(materia?.dias) && materia.dias.length > 0 && materia?.horaInicio && materia?.horaFin) {
    return [
      {
        dias: materia.dias,
        horaInicio: materia.horaInicio,
        horaFin: materia.horaFin,
      },
    ];
  }

  return [];
}

function sessionHasDay(session, day) {
  if (!session || !Array.isArray(session.dias)) {
    return false;
  }

  return session.dias.some((sessionDay) => normDay(sessionDay) === normDay(day));
}

function getMateriaKey(materia) {
  return materia?.numeroClase || `${materia?.codigo || ''}-${materia?.seccion || ''}-${materia?.nombre || ''}`;
}

function getSessionKey(session) {
  return `${session?.horaInicio || ''}-${session?.horaFin || ''}-${(session?.dias || []).map(normDay).join(',')}`;
}

function getItemKey(materia, session) {
  return `${getMateriaKey(materia)}::${getSessionKey(session)}`;
}

// Rango exacto de la data: piso/techo a la hora completa, sin colchón fijo.
function buildTimeRange(materias) {
  const ranges = materias
    .flatMap((materia) =>
      getMateriaSessions(materia).map((session) => ({
        start: toMinutes(session.horaInicio),
        end: toMinutes(session.horaFin),
      })),
    )
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);

  if (ranges.length === 0) {
    return null;
  }

  return {
    start: Math.floor(Math.min(...ranges.map((range) => range.start)) / 60) * 60,
    end: Math.ceil(Math.max(...ranges.map((range) => range.end)) / 60) * 60,
  };
}

function getDaySessions(materias, day) {
  const items = [];

  for (const materia of materias) {
    for (const session of getMateriaSessions(materia)) {
      if (!sessionHasDay(session, day)) {
        continue;
      }

      const start = toMinutes(session.horaInicio);
      const end = toMinutes(session.horaFin);

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        continue;
      }

      items.push({ materia, session, start, end });
    }
  }

  return items;
}

// Reparto lado a lado para solapes (raros, pero el CIA los puede escupir):
// clusters de sesiones que se pisan comparten el ancho de la columna.
function layoutDay(items) {
  const sorted = [...items].sort((left, right) => left.start - right.start || left.end - right.end);
  const clusters = [];
  let current = null;

  for (const item of sorted) {
    if (!current || item.start >= current.maxEnd) {
      current = { items: [], maxEnd: item.end };
      clusters.push(current);
    }
    current.items.push(item);
    current.maxEnd = Math.max(current.maxEnd, item.end);
  }

  for (const cluster of clusters) {
    const columnEnds = [];

    for (const item of cluster.items) {
      let placed = false;

      for (let index = 0; index < columnEnds.length; index += 1) {
        if (columnEnds[index] <= item.start) {
          item.col = index;
          columnEnds[index] = item.end;
          placed = true;
          break;
        }
      }

      if (!placed) {
        item.col = columnEnds.length;
        columnEnds.push(item.end);
      }
    }

    cluster.items.forEach((item) => {
      item.cols = columnEnds.length;
    });
  }

  return sorted;
}

function getOnlineScheduleLabel(materia) {
  const session = getMateriaSessions(materia)[0];

  if (!session) {
    return 'Días no disponibles';
  }

  return `${session.dias.join(', ')} · ${format12h(session.horaInicio)}–${format12h(session.horaFin)}`;
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse border p-4"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <div className="h-4 w-52 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="mt-3 h-3 w-72 rounded" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        ))}
      </div>
      <div
        className="animate-pulse border p-4"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
        }}
      >
        <div className="h-5 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="mt-4 h-60 rounded" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  );
}

function Horario({
  horario = { materias: [], diasConClases: [] },
  loadingHorario,
  errorHorario,
  lastSyncHorario,
  onSyncHorario,
}) {
  const reduced = useReducedMotion();
  const [pendingLinks, setPendingLinks] = useState({});
  const [savingLinks, setSavingLinks] = useState({});
  const [selectedKey, setSelectedKey] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now());
  const panelRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const materias = normalizeActivities(horario?.materias);
  const onlineMaterias = materias.filter((materia) => materia.modalidad === 'en_linea');
  const days = useMemo(() => {
    const providedDays = Array.isArray(horario?.diasConClases) ? horario.diasConClases : [];
    if (providedDays.length > 0) {
      const map = new Map();
      providedDays.forEach((day) => {
        const key = normDay(day);
        if (!map.has(key)) {
          map.set(key, day?.trim?.() || day);
        }
      });
      return [...map.values()];
    }

    const collected = new Map();
    materias.forEach((materia) =>
      getMateriaSessions(materia).forEach((session) =>
        (session.dias || []).forEach((day) => {
          const key = normDay(day);
          if (!collected.has(key)) {
            collected.set(key, day?.trim?.() || day);
          }
        }),
      ),
    );
    return [...collected.values()];
  }, [horario?.diasConClases, materias]);
  const range = useMemo(() => buildTimeRange(materias), [materias]);
  const api = typeof window !== 'undefined' ? window.scraperApp : null;

  const selectedItem = useMemo(() => {
    if (!selectedKey) {
      return null;
    }

    for (const materia of materias) {
      for (const session of getMateriaSessions(materia)) {
        if (getItemKey(materia, session) === selectedKey) {
          return { materia, session };
        }
      }
    }

    return null;
  }, [selectedKey, materias]);

  const nowDate = new Date(nowTick);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const todayKey = DAY_KEYS[nowDate.getDay()];
  const isToday = (day) => normDay(day) === todayKey;
  const showNowLine =
    Boolean(range) &&
    days.some(isToday) &&
    nowMinutes >= range.start &&
    nowMinutes <= range.end;

  const gridHeight = range ? (range.end - range.start) * PX_PER_MIN : 0;
  const yOf = (minutes) => (minutes - (range?.start || 0)) * PX_PER_MIN;
  const hourMarks = useMemo(() => {
    if (!range) {
      return [];
    }

    const marks = [];
    for (let minutes = range.start; minutes <= range.end; minutes += 60) {
      marks.push(minutes);
    }
    return marks;
  }, [range]);

  const handleJoin = (url) => {
    if (!url) return;
    if (api?.openExternal) {
      api.openExternal(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveLink = async (numeroClase) => {
    const link = (pendingLinks[numeroClase] || '').trim();
    if (!link || !api?.saveHorarioLink) {
      return;
    }

    setSavingLinks((previous) => ({ ...previous, [numeroClase]: true }));

    try {
      const result = await api.saveHorarioLink(numeroClase, link);

      if (result?.success) {
        setPendingLinks((previous) => ({ ...previous, [numeroClase]: '' }));
        if (typeof onSyncHorario === 'function') {
          await onSyncHorario();
        }
      }
    } finally {
      setSavingLinks((previous) => ({ ...previous, [numeroClase]: false }));
    }
  };

  const renderLinkControls = (materia, compact = false) => {
    const isSaving = Boolean(savingLinks[materia.numeroClase]);

    if (materia.meetLink) {
      return (
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleJoin(materia.meetLink)}
            className={`btn-primary inline-flex items-center gap-2 font-semibold ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'}`}
          >
            <ExternalLink className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            {compact ? 'Unirse' : 'Unirse a videollamada'}
          </button>
          {!compact ? (
            <span
              className="max-w-[280px] truncate text-xs"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {materia.meetLink}
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className={`flex gap-2 ${compact ? 'w-full sm:w-auto' : 'w-full max-w-md'}`}>
        <input
          type="text"
          value={pendingLinks[materia.numeroClase] || ''}
          onChange={(event) =>
            setPendingLinks((previous) => ({
              ...previous,
              [materia.numeroClase]: event.target.value,
            }))
          }
          placeholder="Pegar link de Meet/Zoom..."
          className={`field w-full px-3 py-2 text-xs ${compact ? 'sm:w-56' : ''}`}
        />
        <button
          type="button"
          onClick={() => handleSaveLink(materia.numeroClase)}
          disabled={isSaving || !(pendingLinks[materia.numeroClase] || '').trim()}
          className="btn-outline-accent shrink-0 border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent) 55%, transparent)',
            color: 'var(--accent)',
            borderRadius: 'var(--radius-button, 0px)',
          }}
        >
          {isSaving ? '...' : 'Guardar'}
        </button>
      </div>
    );
  };

  const renderBlock = (item, day) => {
    const { materia, session } = item;
    const isOnline = (session?.modalidad || materia.modalidad) === 'en_linea';
    const itemKey = getItemKey(materia, session);
    const isSelected = selectedKey === itemKey;
    const duration = item.end - item.start;
    const baseBorder = isOnline ? 'var(--success-border)' : 'var(--border-normal)';
    const location = session?.ubicacion || materia.ubicacion || (isOnline ? 'Remoto' : 'Sin ubicación');

    return (
      <button
        key={`${day}-${itemKey}`}
        type="button"
        title={`${materia.nombre} · ${format12h(session.horaInicio)}–${format12h(session.horaFin)}`}
        onClick={() => setSelectedKey((current) => (current === itemKey ? '' : itemKey))}
        className="absolute cursor-pointer overflow-hidden text-left"
        style={{
          top: yOf(item.start) + 1,
          height: Math.max(duration * PX_PER_MIN - 3, 22),
          left: `calc(${(item.col / item.cols) * 100}% + 3px)`,
          width: `calc(${100 / item.cols}% - 6px)`,
          background: isOnline
            ? 'var(--success-bg)'
            : 'color-mix(in srgb, var(--text-strong) 4%, transparent)',
          borderWidth: '1px',
          borderStyle: isOnline ? 'dashed' : 'solid',
          borderColor: isSelected ? 'var(--accent)' : baseBorder,
          borderRadius: 'var(--radius-badge, 0px)',
          padding: '4px 7px',
          zIndex: 1,
        }}
        onMouseEnter={(event) => {
          if (!isSelected) {
            event.currentTarget.style.borderColor = 'var(--text-muted)';
          }
        }}
        onMouseLeave={(event) => {
          if (!isSelected) {
            event.currentTarget.style.borderColor = baseBorder;
          }
        }}
      >
        <p
          className={`${duration >= 90 ? 'line-clamp-2' : 'line-clamp-1'} text-xs font-semibold leading-tight`}
          style={{ color: 'var(--text-strong)' }}
        >
          {isOnline ? (
            <Video
              className="mr-1 inline h-2.5 w-2.5 align-[-1px]"
              style={{ color: 'var(--success-text)' }}
            />
          ) : null}
          {materia.nombre}
        </p>
        {duration >= 60 ? (
          <p className="mt-0.5 line-clamp-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {location}
          </p>
        ) : null}
        {duration >= 90 ? (
          <p
            className="mt-0.5 text-[10px]"
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {format12h(session.horaInicio)}–{format12h(session.horaFin)}
          </p>
        ) : null}
      </button>
    );
  };

  const renderGrid = () => (
    <section
      className="border p-5"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      <h4
        className="text-xs font-bold uppercase tracking-[0.2em]"
        style={{ color: 'var(--text-muted)' }}
      >
        Horario semanal
      </h4>

      <div className="mt-4 overflow-x-auto">
        <div style={{ minWidth: GUTTER_PX + days.length * 128 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${GUTTER_PX}px repeat(${days.length}, minmax(128px, 1fr))`,
            }}
          >
            <div
              style={{ position: 'sticky', left: 0, zIndex: 3, background: 'var(--bg-card)' }}
            />
            {days.map((day) => (
              <div
                key={day}
                className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{
                  color: isToday(day) ? 'var(--text-strong)' : 'var(--text-muted)',
                  borderBottom: isToday(day)
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="relative">
            {hourMarks.map((minutes) => (
              <div
                key={minutes}
                className="pointer-events-none absolute"
                style={{
                  top: yOf(minutes),
                  left: GUTTER_PX,
                  right: 0,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              />
            ))}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `${GUTTER_PX}px repeat(${days.length}, minmax(128px, 1fr))`,
              }}
            >
              <div
                className="relative"
                style={{
                  height: gridHeight,
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  background: 'var(--bg-card)',
                }}
              >
                {hourMarks.map((minutes) => (
                  <span
                    key={minutes}
                    className="absolute right-2 text-[10px]"
                    style={{
                      top: yOf(minutes) - 6,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {format12h(minutesToHHMM(minutes))}
                  </span>
                ))}

                {showNowLine ? (
                  <motion.span
                    className="absolute right-1 px-1 text-[9px] font-bold"
                    style={{
                      zIndex: 3,
                      color: 'var(--accent)',
                      background: 'var(--bg-card)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    initial={false}
                    animate={{ top: yOf(nowMinutes) - 6 }}
                    transition={
                      reduced ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 20 }
                    }
                  >
                    {format12h(minutesToHHMM(nowMinutes))}
                  </motion.span>
                ) : null}
              </div>

              {days.map((day) => (
                <div
                  key={day}
                  className="relative"
                  style={{ height: gridHeight, borderLeft: '1px solid var(--border-subtle)' }}
                >
                  {layoutDay(getDaySessions(materias, day)).map((item) => renderBlock(item, day))}
                </div>
              ))}
            </div>

            {showNowLine ? (
              <motion.div
                className="pointer-events-none absolute"
                style={{ left: GUTTER_PX, right: 0, zIndex: 2 }}
                initial={false}
                animate={{ top: yOf(nowMinutes) }}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 20 }
                }
              >
                <div className="relative" style={{ borderTop: '1px solid var(--accent)' }}>
                  <span
                    className="absolute -left-[2px] -top-[3px] h-[5px] w-[5px] rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderOnlineSection = () => (
    <section
      className="border"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      <div
        className="flex items-baseline justify-between border-b px-5 py-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h4 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          En línea
        </h4>
        <span
          className="text-xs"
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {onlineMaterias.length}
        </span>
      </div>

      {onlineMaterias.length === 0 ? (
        <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          No hay materias en línea registradas.
        </p>
      ) : (
        onlineMaterias.map((materia) => (
          <div
            key={getMateriaKey(materia)}
            className="flex flex-wrap items-center gap-3 border-b px-5 py-3 last:border-b-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Video className="h-4 w-4 shrink-0" style={{ color: 'var(--success-text)' }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                {materia.nombre}
              </p>
              <p
                className="mt-0.5 text-[11px]"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {getOnlineScheduleLabel(materia)}
              </p>
            </div>
            {renderLinkControls(materia, true)}
          </div>
        ))
      )}
    </section>
  );

  const renderDetailPanel = () => (
    <AnimatePresence initial={false}>
      {selectedItem ? (
        <motion.div
          key="detalle"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
          style={{ overflow: 'hidden' }}
          onAnimationComplete={(definition) => {
            if (definition?.opacity === 1) {
              panelRef.current?.scrollIntoView({
                behavior: reduced ? 'auto' : 'smooth',
                block: 'nearest',
              });
            }
          }}
        >
          <div
            ref={panelRef}
            className="border p-6"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.24em]"
                style={{ color: 'var(--accent)' }}
              >
                Detalle de clase
              </p>
              <button
                type="button"
                onClick={() => setSelectedKey('')}
                aria-label="Cerrar detalle"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center border"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-normal)',
                  borderRadius: 'var(--radius-badge, 0px)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = 'var(--border-normal)';
                  event.currentTarget.style.color = 'var(--text-strong)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = 'var(--border-subtle)';
                  event.currentTarget.style.color = 'var(--text-normal)';
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <h4
              className="mt-2 text-xl font-extrabold"
              style={{
                color: 'var(--text-strong)',
                fontFamily: 'var(--font-display, sans-serif)',
                letterSpacing: '-0.02em',
                textWrap: 'balance',
              }}
            >
              {selectedItem.materia.nombre}
            </h4>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Horario
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--text-normal)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {(selectedItem.session.dias || []).join(', ')} ·{' '}
                  {format12h(selectedItem.session.horaInicio)}–{format12h(selectedItem.session.horaFin)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Ubicación
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-normal)' }}>
                  {selectedItem.session.ubicacion ||
                    selectedItem.materia.ubicacion ||
                    (selectedItem.materia.modalidad === 'en_linea' ? 'Remoto' : 'Sin ubicación')}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Instructor
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-normal)' }}>
                  {selectedItem.materia.instructor || 'No disponible'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Clase
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--text-normal)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {[selectedItem.materia.codigo, selectedItem.materia.seccion]
                    .filter(Boolean)
                    .join(' · ') || 'Sin código'}
                  {' · '}
                  {selectedItem.materia.modalidad === 'en_linea' ? 'En línea' : 'Presencial'}
                </p>
              </div>
            </div>

            {selectedItem.materia.modalidad === 'en_linea' ? (
              <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                {renderLinkControls(selectedItem.materia)}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  const hasValidSchedule = Boolean(range) && days.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.24em]"
          style={{ color: 'var(--text-muted)' }}
        >
          CIA + iVirtual
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <p
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {formatLastSync(lastSyncHorario)}
          </p>
          <button
            type="button"
            onClick={() => onSyncHorario?.({ clearCacheFirst: true })}
            disabled={loadingHorario}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingHorario ? 'animate-spin' : ''}`} />
            {loadingHorario ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {errorHorario ? (
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
            <p>{errorHorario}</p>
          </div>
        </div>
      ) : null}

      {loadingHorario ? (
        <ScheduleSkeleton />
      ) : materias.length === 0 ? (
        <div
          className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-12 text-center"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <Calendar className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          <p
            className="mt-4 text-sm font-bold"
            style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
          >
            Sin horario sincronizado
          </p>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            Sincroniza para traer tus clases del semestre desde el CIA.
          </p>
          <button
            type="button"
            onClick={() => onSyncHorario?.({ clearCacheFirst: true })}
            disabled={loadingHorario}
            className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar horario
          </button>
        </div>
      ) : !hasValidSchedule ? (
        <div
          className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-12 text-center"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          <p
            className="mt-4 text-sm font-bold"
            style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
          >
            El horario llegó sin días u horas válidos
          </p>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            Sincroniza de nuevo o revisa el horario directamente en el portal CIA.
          </p>
          <button
            type="button"
            onClick={() => onSyncHorario?.({ clearCacheFirst: true })}
            disabled={loadingHorario}
            className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </button>
        </div>
      ) : (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {renderOnlineSection()}
          {renderGrid()}
          {renderDetailPanel()}
        </motion.div>
      )}
    </div>
  );
}

export default Horario;
