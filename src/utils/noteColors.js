// Colores funcionales de nota (curated, fijos): NO son tokens de tema. Aparecen
// solo como border-left 3px — señal de categoría, nunca fondo de card.
export const NOTE_COLORS = [
  { id: 'neutral', hex: '#8A8A8A', label: 'Neutral' },
  { id: 'vermillion', hex: '#FF3D00', label: 'Urgente' },
  { id: 'amber', hex: '#FFA000', label: 'Importante' },
  { id: 'green', hex: '#00C853', label: 'Hecho' },
  { id: 'cyan', hex: '#00B0FF', label: 'Trabajo' },
  { id: 'purple', hex: '#7C4DFF', label: 'Personal' },
];

export function noteColorHex(colorId) {
  return (NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0]).hex;
}
