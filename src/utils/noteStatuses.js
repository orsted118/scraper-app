// Estados de avance de una nota. Ortogonal a NOTE_COLORS (color = categoría,
// status = etapa). Los hex de acá se usan solo para el dot del badge y el
// resaltado del selector; no coinciden con NOTE_COLORS a propósito para que un
// vistazo distinga "categoría" de "avance".
export const NOTE_STATUSES = [
  { id: 'pendiente', label: 'Pendiente', short: 'PENDIENTE', hex: '#94a3b8' },
  { id: 'en-progreso', label: 'En progreso', short: 'EN PROGRESO', hex: '#f59e0b' },
  { id: 'terminada', label: 'Terminada', short: 'TERMINADA', hex: '#10b981' },
  { id: 'idea', label: 'Idea', short: 'IDEA', hex: '#a855f7' },
];

export const DEFAULT_NOTE_STATUS = 'pendiente';

export function noteStatus(statusId) {
  return NOTE_STATUSES.find((s) => s.id === statusId) || NOTE_STATUSES[0];
}
