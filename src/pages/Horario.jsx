import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ExternalLink,
  RefreshCw,
  Video,
} from 'lucide-react';

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
    .replace(/[\u0300-\u036f]/g, '')
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

function buildTimeSlots(materias) {
  const ranges = materias
    .flatMap((materia) =>
      getMateriaSessions(materia).map((session) => ({
        start: toMinutes(session.horaInicio),
        end: toMinutes(session.horaFin),
      })),
    )
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);

  if (ranges.length === 0) {
    return [];
  }

  const minStart = Math.floor(Math.min(...ranges.map((range) => range.start)) / 30) * 30;
  const maxEnd = Math.ceil(Math.max(...ranges.map((range) => range.end)) / 30) * 30;
  const slots = [];

  for (let minutes = minStart; minutes < maxEnd; minutes += 30) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

function findMateriasForSlot(materias, day, slotHora) {
  const slotMinutes = toMinutes(slotHora);
  if (!Number.isFinite(slotMinutes)) {
    return [];
  }

  const matches = [];

  for (const materia of materias) {
    const sessions = getMateriaSessions(materia);

    const matchedSession = sessions.find((session) => {
      const start = toMinutes(session.horaInicio);
      const end = toMinutes(session.horaFin);

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return false;
      }

      return sessionHasDay(session, day) && start <= slotMinutes && end > slotMinutes;
    });

    if (matchedSession) {
      matches.push({
        materia,
        session: matchedSession,
        start: toMinutes(matchedSession.horaInicio),
        end: toMinutes(matchedSession.horaFin),
      });
    }
  }

  if (matches.length === 0) {
    return [];
  }

  matches.sort((left, right) => {
    if (left.start !== right.start) {
      return right.start - left.start;
    }

    const leftDuration = left.end - left.start;
    const rightDuration = right.end - right.start;
    if (leftDuration !== rightDuration) {
      return leftDuration - rightDuration;
    }

    return getMateriaKey(left.materia).localeCompare(getMateriaKey(right.materia));
  });

  return matches.map(({ materia, session }) => ({ materia, session }));
}

function getMateriaKey(materia) {
  return materia?.numeroClase || `${materia?.codigo || ''}-${materia?.seccion || ''}-${materia?.nombre || ''}`;
}

function getSessionKey(session) {
  return `${session?.horaInicio || ''}-${session?.horaFin || ''}-${(session?.dias || []).map(normDay).join(',')}`;
}

function isFirstSlotForMateria(materias, day, slotHora, materiaSlot) {
  if (!materiaSlot?.materia || !materiaSlot?.session || !day) {
    return false;
  }

  const slotMinutes = toMinutes(slotHora);
  if (!Number.isFinite(slotMinutes)) {
    return false;
  }

  const previousSlotMinutes = slotMinutes - 30;
  if (previousSlotMinutes < 0) {
    return true;
  }

  const previousSlot = `${String(Math.floor(previousSlotMinutes / 60)).padStart(2, '0')}:${String(previousSlotMinutes % 60).padStart(2, '0')}`;
  const previousMaterias = findMateriasForSlot(materias, day, previousSlot);

  if (!previousMaterias.length) {
    return true;
  }

  const currentMateriaKey = getMateriaKey(materiaSlot.materia);
  const currentSessionKey = getSessionKey(materiaSlot.session);

  const existsInPreviousSlot = previousMaterias.some((previousMateriaSlot) => {
    const isSameMateria =
      getMateriaKey(previousMateriaSlot.materia) === currentMateriaKey;
    const isSameSession = getSessionKey(previousMateriaSlot.session) === currentSessionKey;
    return isSameMateria && isSameSession;
  });

  return !existsInPreviousSlot;
}

function compactName(name) {
  return (name || '').length > 30 ? `${name.slice(0, 30)}…` : name || 'Materia';
}

const presencialCellToneStyle = {
  background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
  borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
};

const onlineCellToneStyle = {
  background: 'var(--success-bg)',
  borderColor: 'var(--success-border)',
};

function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border p-4"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
          >
            <div className="h-4 w-52 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="mt-3 h-3 w-72 rounded" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        ))}
      </div>
      <div
        className="animate-pulse rounded-2xl border p-4"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
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
  const [pendingLinks, setPendingLinks] = useState({});
  const [savingLinks, setSavingLinks] = useState({});

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
      (materia.dias || []).forEach((day) => {
        const key = normDay(day);
        if (!collected.has(key)) {
          collected.set(key, day?.trim?.() || day);
        }
      }),
    );
    return [...collected.values()];
  }, [horario?.diasConClases, materias]);
  const slots = useMemo(() => buildTimeSlots(materias), [materias]);
  const api = typeof window !== 'undefined' ? window.scraperApp : null;

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

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
              <Calendar className="h-3.5 w-3.5" />
              CIA + iVirtual ITSON
            </div>
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
                Horario
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Consulta tu horario semanal del semestre y los enlaces de videollamada detectados para
                materias en línea.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onSyncHorario?.({ clearCacheFirst: true })}
              disabled={loadingHorario}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              <RefreshCw className={`h-4 w-4 ${loadingHorario ? 'animate-spin' : ''}`} />
              {loadingHorario ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {formatLastSync(lastSyncHorario)}
            </p>
          </div>
        </div>
      </section>

      {errorHorario ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <p>{errorHorario}</p>
          </div>
        </div>
      ) : null}

      {loadingHorario ? (
        <ScheduleSkeleton />
      ) : materias.length === 0 ? (
        <div
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <Calendar className="h-8 w-8 text-slate-600" />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
            No se encontró horario para este semestre.
          </p>
        </div>
      ) : (
        <>
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
          >
            <h4
              className="text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--text-normal)' }}
            >
              Clases en Línea
            </h4>
            <div className="mt-4 space-y-3">
              {onlineMaterias.length === 0 ? (
                <p className="text-sm text-slate-400">No hay materias en línea registradas.</p>
              ) : (
                onlineMaterias.map((materia) => {
                  const canJoin = Boolean(materia.meetLink);
                  const isSaving = Boolean(savingLinks[materia.numeroClase]);

                  return (
                    <article
                      key={materia.numeroClase || `${materia.codigo}-${materia.horaInicio}`}
                      className="rounded-2xl border p-4"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="rounded-xl bg-emerald-500/20 p-2 text-emerald-300">
                            <Video className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                              {materia.nombre}
                            </p>
                            <p className="text-xs text-slate-400">{materia.instructor || 'Instructor no disponible'}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {(materia.dias || []).join(', ') || 'Días no disponibles'} · {format12h(materia.horaInicio)} - {format12h(materia.horaFin)}
                            </p>
                          </div>
                        </div>

                        <div className="w-full space-y-2 xl:w-64">
                          <button
                            type="button"
                            disabled={!canJoin}
                            onClick={() => handleJoin(materia.meetLink)}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              canJoin
                                ? 'bg-itson-blue text-white hover:bg-itson-blue-light'
                                : 'cursor-not-allowed text-slate-500'
                            }`}
                            style={canJoin ? undefined : { background: 'var(--bg-tertiary)' }}
                          >
                            <ExternalLink className="h-4 w-4" />
                            {canJoin ? 'Unirse' : 'Sin enlace'}
                          </button>

                          {!canJoin ? (
                            <div className="flex gap-2">
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
                                className="w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-itson-blue focus:ring-1 focus:ring-itson-blue/30"
                                style={{
                                  borderColor: 'var(--border-normal)',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-strong)',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveLink(materia.numeroClase)}
                                disabled={isSaving || !(pendingLinks[materia.numeroClase] || '').trim()}
                                className="rounded-xl border border-itson-blue/50 px-3 py-2 text-xs font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isSaving ? '...' : 'Guardar'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
          >
            <h4
              className="text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--text-normal)' }}
            >
              Horario semanal
            </h4>
            <div className="mt-4 overflow-x-auto">
              <table
                className="min-w-max border-separate text-xs"
                style={{ borderSpacing: '1px', color: 'var(--text-normal)' }}
              >
                <thead>
                  <tr>
                    <th
                      className="w-16 rounded-lg px-2 py-1.5 text-left text-[10px] text-slate-500"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      Hora
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="min-w-[100px] rounded-lg px-2 py-1.5 text-left text-[11px]"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-normal)' }}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot} className="h-11">
                      <td
                        className="w-16 rounded-lg px-2 py-1 align-top text-[10px] text-slate-500 overflow-hidden"
                        style={{ maxHeight: '44px', background: 'var(--bg-secondary)' }}
                      >
                        {format12h(slot)}
                      </td>
                      {days.map((day) => {
                        const materiaSlots = findMateriasForSlot(materias, day, slot);
                        if (!materiaSlots.length) {
                          return (
                            <td
                              key={`${day}-${slot}`}
                              className="h-11 min-w-[100px] rounded-lg border align-top overflow-hidden"
                              style={{
                                maxHeight: '44px',
                                borderColor: 'var(--border-subtle)',
                                background: 'var(--bg-card)',
                              }}
                            />
                          );
                        }

                        return (
                          <td
                            key={`${day}-${slot}`}
                            className="h-11 min-w-[100px] rounded-lg border p-0.5 align-top overflow-hidden"
                            style={{
                              maxHeight: '44px',
                              borderColor: 'var(--border-subtle)',
                              background: 'var(--bg-card)',
                            }}
                          >
                            <div className="flex h-full flex-col gap-px overflow-hidden">
                              {materiaSlots.map((materiaSlot) => {
                                const { materia, session } = materiaSlot;
                                const isOnline = (session?.modalidad || materia.modalidad) === 'en_linea';
                                const isFirstSlot = isFirstSlotForMateria(materias, day, slot, materiaSlot);
                                const slotToneStyle = isOnline ? onlineCellToneStyle : presencialCellToneStyle;

                                return (
                                  <div
                                    key={`${getMateriaKey(materia)}-${getSessionKey(session)}`}
                                    className={`min-h-0 flex-1 overflow-hidden ${!isFirstSlot ? 'p-0' : ''}`}
                                  >
                                    {isFirstSlot ? (
                                      <div
                                        className="h-full overflow-hidden rounded-lg border px-1.5 py-0.5"
                                        style={slotToneStyle}
                                      >
                                        <p
                                          className="truncate text-[10px] font-semibold leading-tight"
                                          style={{ color: 'var(--text-strong)' }}
                                        >
                                          {compactName(materia.nombre)}
                                        </p>
                                        <p className="truncate text-[9px] leading-tight text-slate-400">
                                          {session?.ubicacion || materia.ubicacion || (isOnline ? 'Remoto' : 'Sin ubicación')}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="h-full rounded-b-lg border border-t-0" style={slotToneStyle} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Horario;
