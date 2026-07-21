// Etiqueta relativa de última sincronización — compartida por las páginas con
// header de sync (Actividades, Horario, Calificaciones, Calendario).
export function formatLastSync(timestamp) {
  if (!timestamp) {
    return 'Última sync: aún no disponible.';
  }

  const syncDate = new Date(timestamp);
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
