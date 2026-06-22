Se rediseñó la pantalla de Notificaciones para reducir ruido visual y dejar el feed como protagonista. Eliminé por completo el hero/banner grande de arriba con el degradado, el ícono de campana y las StatTiles, y lo reemplacé por un header compacto de una sola fila con el título Notificaciones, el contador de sin leer y el botón Marcar todo como leído alineado a la derecha.

Las NotificationCard se conservaron sin cambios porque ya tenían una buena jerarquía visual: barra lateral de color, ícono, badge de canal y punto de leído/no leído. También mantuve la barra de búsqueda y los filtros rápidos tal como estaban.

En la columna derecha simplifiqué el panel de resumen: dejé solo el bloque de Canales activos con sus conteos y eliminé por completo la sección de Acciones rápidas, que era texto de relleno y no aportaba valor real a la pantalla.

Verifiqué además que la navegación de Notificaciones ya apunta a su propia página en Sidebar y App, así que no tocó lógica de rutas en esta tarea. El cambio quedó enfocado exclusivamente en la maquetación visual del módulo.

La validación de build pasó correctamente con npm run build.
