# Documentación UI

Esta guía describe cómo está estructurada la interfaz React y cómo extenderla sin romper patrones existentes.

---

## Componentes principales

| Componente | Props clave | Qué hace | Uso |
|---|---|---|---|
| `src/App.jsx` | — | Orquesta estado global, cargas, errores, navegación y listeners IPC | Entry container |
| `src/components/Sidebar.jsx` | `activePage`, `onNavigate`, `userName` | Menú lateral + identidad de alumno + semestre actual | Layout base |
| `src/components/TaskPanel.jsx` | `title`, `description`, `children` | Wrapper visual de páginas | Layout de contenido |
| `src/components/Onboarding.jsx` | `onNavigate` | Estado inicial cuando faltan credenciales | Primer uso |
| `src/components/ActivityCard.jsx` | datos de actividad | Card expandible/colapsable con adjuntos y contexto temporal | `Actividades` |
| `src/pages/Actividades.jsx` | activities/error/loading/progress/onSync | Dashboard de tareas + tabs + búsqueda + orden | Módulo iVirtual |
| `src/pages/Horario.jsx` | horario/error/loading/onSyncHorario | Clases en línea + grid semanal con sesiones | Módulo Horario |
| `src/pages/Calificaciones.jsx` | calificaciones/error/loading/onSyncCIA | Tarjetas de calificaciones + stats | Módulo CIA |
| `src/pages/Ajustes.jsx` | onSettingsSaved/... | Gestión de credenciales iVirtual/CIA | Configuración |
| `src/components/ResultsTable.jsx` | `rows`, `loading` | Tabla genérica auxiliar (estado/skeleton) | Reutilizable |

---

## Sistema de páginas y navegación

`src/App.jsx` define `pageRegistry`:

- `activities` → `Actividades`
- `horario` → `Horario`
- `calificaciones` → `Calificaciones`
- `settings` → `Ajustes`

Flujo:

1. `Sidebar` dispara `onNavigate(pageId)`.
2. `App` cambia `activePage`.
3. Se renderiza `ActivePage` dentro de `TaskPanel`.
4. Cargas iniciales lazy por página:
   - actividades: primera entrada a `activities`
   - horario: primera entrada a `horario`
   - calificaciones: primera entrada a `calificaciones`

---

## Convenciones de diseño

- Dark UI base (`slate-950` + capas `slate-900/950`).
- Bordes: `border-slate-800`.
- Radios amplios: `rounded-2xl` / `rounded-3xl`.
- Primario ITSON:
  - `itson-blue #006DB6`
  - `itson-blue-dark #005a94`
  - `itson-blue-light #1a7ec4`

### Convención semántica por color

- `emerald`: éxito/OK
- `orange`: warning/retraso
- `red`: error/crítico
- `slate`: neutral/cerrado

### Estados de badges temporales (`ActivityCard`)

- `critical`: rojo + `animate-pulse`
- `warning`: naranja
- `late`: naranja
- `closed`: slate

---

## ActivityCard — sistema visual por estado/modalidad

| Estado / modalidad | Borde | Color fecha | Badge principal |
|---|---|---|---|
| Pendiente individual | `border-l-emerald-500` | verde | sin badge superior |
| Pendiente en equipo | `border-l-red-500` | rojo | `EN EQUIPO` |
| Retrasada | `border-l-orange-500` | naranja | `RETRASADA` |
| Cerrada | `border-l-slate-600` | slate | `CERRADA` |

Notas:

- Instrucciones con clamp (`line-clamp-3`) y toggle `Ver más/Ver menos`.
- Adjuntos: muestra 3 por default; toggle `+N más` / `Ver menos`.
- Descarga individual y “Descargar todos” (con guard `window.scraperApp`).

---

## Horario semanal — lógica de renderizado

### Modelo de datos esperado por UI

Cada materia puede traer:

- rango principal `horaInicio` / `horaFin`
- `dias[]`
- y opcional `sesiones[]` para horarios distintos por día

### Helpers clave (`src/pages/Horario.jsx`)

- `normDay()` para normalizar comparación de días (acentos/trim/case).
- `getMateriaSessions(materia)`:
  - usa `sesiones` si existe
  - fallback al rango principal
- `buildTimeSlots(materias)` genera slots de 30 min.
- `findMateriasForSlot(materias, day, slotHora)`:
  - devuelve **array** de materias (soporta traslape/simultáneas).
- `isFirstSlotForMateria(...)`:
  - determina si mostrar texto o solo continuidad visual.

### Comportamiento visual

- Primer slot de bloque: muestra nombre + ubicación.
- Slots siguientes: bloque compacto sin texto (continuidad).
- Si hay dos materias simultáneas en un slot: se renderizan ambas apiladas dentro de la celda.

---

## Reglas de implementación UI

1. No comparar días crudos; usar `normDay()` siempre.
2. Mantener compatibilidad backward:
   - UI debe funcionar con materias sin `sesiones`.
3. En acciones Electron (`openExternal`, `downloadFile`, etc.) validar guard de API preload.
4. Si un estado/error tiene código de credenciales, ofrecer navegación a Ajustes.

