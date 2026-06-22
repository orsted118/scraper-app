# Self-report: Simplificación visual de Notificaciones

## Qué se pidió
Rediseñar la pantalla de Notificaciones (src/pages/Notificaciones.jsx) para reducir ruido visual: eliminar el hero/banner grande de arriba, simplificar el header a una sola fila compacta, limpiar el sidebar quitando la sección de "Acciones rápidas" y el bloque "Estado de la bandeja / Resumen rápido", dejando solo "Canales activos". Mantener filters, search bar y el feed de NotificationCards exactamente como estaban.

## Qué se hizo
- **Header**: se reemplazó el bloque con ícono Bell envuelto en un contenedor con border/background por una fila simple: título "Notificaciones" + contador "X sin leer" + botón "Marcar todo como leído" a la derecha. Sin borde, sin background decorativo, sin ícono.
- **Sidebar**: se eliminó la cabecera "Estado de la bandeja / Resumen rápido" con su ícono Filter, y el sub-contenedor anidado. Quedó solo "Canales activos" como sección única, directa.
- **Imports**: se eliminó Filter y Megaphone de las importaciones de lucide-react (no se usaban después de los cambios).

## Decisiones autónomas
- No se tocaron los NotificationCards, el sistema de filtros, la búsqueda, ni la agrupación por buckets (se pidió explícitamente mantenerlos).
- El botón "Marcar todo como leído" se mantiene siempre visible (no condicional a que haya no-leídos).
- El layout responsive (lg:grid) se conservó intacto.

## Verificación
- `npm run build`: PASS, 1769 módulos, build en 13.74s, sin errores.
- No se requirieron cambios en otros archivos (Sidebar.jsx, App.jsx, etc.).
