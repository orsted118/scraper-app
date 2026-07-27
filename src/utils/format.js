const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

// Escalones de mayor a menor: se toma el primero que el diff alcanza.
const RELATIVE_STEPS = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

// "hace 3 min", "ayer", "hace 2 meses". numeric:'auto' es lo que convierte
// "hace 1 día" en "ayer".
export function formatRelative(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const elapsed = (Date.now() - date.getTime()) / 1000;

  if (elapsed < 60) {
    return 'recién';
  }

  for (const { unit, seconds } of RELATIVE_STEPS) {
    if (elapsed >= seconds) {
      return RELATIVE_FORMATTER.format(-Math.floor(elapsed / seconds), unit);
    }
  }

  return 'recién';
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—:——';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Para totales de álbum/artista, donde los minutos sueltos no dicen nada.
export function formatTotalDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);

  if (hours === 0) return `${mins} min`;
  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}
