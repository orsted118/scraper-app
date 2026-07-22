import {
  BedDouble,
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  PenLine,
  UserPlus,
} from 'lucide-react';

export const DEFAULT_CALENDAR_TYPE = 'Profesional Asociado y Licenciatura';
export const DAY_MS = 24 * 60 * 60 * 1000;

export const MONTHS_FULL = [
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

export const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Semana arranca lunes: es la convención del calendario escolar ITSON.
export const WEEKDAYS_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

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

export function getCategoryIcon(category = 'General') {
  return CATEGORY_ICONS[category] || CalendarDays;
}

// El sistema visual del proyecto sostiene un solo acento. Mientras no existan
// tokens de color por categoría, todas comparten acento y la jerarquía la carga
// el icono, no el color. Punto único de cambio si algún día se agregan.
export function getCategoryColor() {
  return 'var(--accent)';
}

export function getValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameDate(left, right) {
  if (!left || !right) return false;

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isMidnight(date) {
  return date && date.getHours() === 0 && date.getMinutes() === 0;
}

export function formatTime(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatEventTime(event) {
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

export function shortWeekday(date) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
}

export function padDay(date) {
  return String(date.getDate()).padStart(2, '0');
}

// Gutter mono: puntual lleva día de semana ("DOM 12 JUL"); rango lleva fecha
// compuesta y vive en su mes de inicio aunque cruce al siguiente.
export function formatGutterDate(item) {
  const { start, end, isRange } = item;

  if (!isRange) {
    return `${shortWeekday(start)} ${padDay(start)} ${MONTHS_SHORT[start.getMonth()]}`;
  }

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${padDay(start)} – ${padDay(end)} ${MONTHS_SHORT[start.getMonth()]}`;
  }

  return `${padDay(start)} ${MONTHS_SHORT[start.getMonth()]} – ${padDay(end)} ${MONTHS_SHORT[end.getMonth()]}`;
}

export function formatShortRef(date) {
  return `${padDay(date)} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function getEventKey(event, index) {
  return `${event.titulo || 'evento'}-${event.inicio || ''}-${index}`;
}

export function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

// Normaliza la lista cruda del scraper: descarta fechas inválidas, colapsa el
// `fin` redundante de los eventos de un solo día y ordena cronológicamente.
export function enrichEvents(events, category = 'Todas') {
  return (Array.isArray(events) ? events : [])
    .filter((event) => category === 'Todas' || (event.categoria || 'General') === category)
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
}

export function diffInDays(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function toDateInputValue(date) {
  if (!date) return '';

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${padDay(date)}`;
}

// `new Date('2026-07-22')` se parsea como UTC y corre un día en husos negativos:
// los inputs date se construyen a mano en hora local.
export function fromDateInputValue(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}
