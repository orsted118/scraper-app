export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function normalizeDay(value = '') {
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function timeToMinutes(value = '') {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getMateriaSessions(materia = {}) {
  if (Array.isArray(materia.sesiones) && materia.sesiones.length > 0) {
    return materia.sesiones;
  }

  if (Array.isArray(materia.dias) && materia.horaInicio && materia.horaFin) {
    return [
      {
        dias: materia.dias,
        horaInicio: materia.horaInicio,
        horaFin: materia.horaFin,
        ubicacion: materia.ubicacion,
        esEnLinea: materia.modalidad === 'en_linea',
      },
    ];
  }

  return [];
}

function getSessionLocation(materia, session) {
  const meetLink = session?.meetLink || materia?.meetLink || null;
  const rawLocation = session?.ubicacion || materia?.ubicacion || '';
  const isOnline =
    session?.esEnLinea ||
    materia?.modalidad === 'en_linea' ||
    Boolean(meetLink) ||
    /remoto|en l[ií]nea|curso a distancia|internet/i.test(rawLocation);

  return isOnline ? 'En línea' : rawLocation || 'Sin salón';
}

function buildClassCandidate({ materia, session, dayName, daysAhead, nowMinutes, startMinutes }) {
  const result = {
    materia: materia?.nombre || 'Clase sin nombre',
    hora: `${session.horaInicio} – ${session.horaFin}`,
    salon: getSessionLocation(materia, session),
    meetLink: session?.meetLink || materia?.meetLink || null,
    esHoy: daysAhead === 0,
    dia: dayName,
    diasAdelante: daysAhead,
  };

  if (daysAhead === 0) {
    result.minutosRestantes = startMinutes - nowMinutes;
  }

  return result;
}

export function getNextClass(materias = [], diasConClases = [], now = new Date()) {
  if (!Array.isArray(materias) || materias.length === 0) {
    return null;
  }

  const currentDayIndex = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const allowedDays = new Set((Array.isArray(diasConClases) ? diasConClases : []).map(normalizeDay));

  for (let daysAhead = 0; daysAhead < 7; daysAhead += 1) {
    const dayIndex = (currentDayIndex + daysAhead) % 7;
    const dayName = DAY_NAMES[dayIndex];
    const normalizedDay = normalizeDay(dayName);

    if (allowedDays.size > 0 && !allowedDays.has(normalizedDay)) {
      continue;
    }

    const candidates = [];

    materias.forEach((materia) => {
      getMateriaSessions(materia).forEach((session) => {
        const sessionDays = Array.isArray(session?.dias) ? session.dias : [];
        const hasClassThisDay = sessionDays.some((day) => normalizeDay(day) === normalizedDay);
        const startMinutes = timeToMinutes(session?.horaInicio);
        const endMinutes = timeToMinutes(session?.horaFin);

        if (!hasClassThisDay || startMinutes === null || endMinutes === null) {
          return;
        }

        if (daysAhead === 0 && startMinutes <= nowMinutes) {
          return;
        }

        candidates.push({
          startMinutes,
          endMinutes,
          materia,
          session,
          dayName,
          daysAhead,
        });
      });
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
      const next = candidates[0];

      return buildClassCandidate({
        materia: next.materia,
        session: next.session,
        dayName: next.dayName,
        daysAhead: next.daysAhead,
        nowMinutes,
        startMinutes: next.startMinutes,
      });
    }
  }

  return null;
}
