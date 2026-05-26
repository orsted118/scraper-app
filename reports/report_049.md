# Report 049
**Fecha:** 2026-05-25 23:32  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** 1ff9647 — feat: rediseño visual — sidebar personal, stats compactas, progreso semestre
**Archivos modificados:** 5

## Archivos modificados
- `AGENTS.md` — archivo actualizado en esta tarea
- `docs/SCRAPERS.md` — archivo creado como parte de la base inicial
- `docs/UI.md` — archivo creado como parte de la base inicial
- `docs/WORKFLOW.md` — archivo creado como parte de la base inicial
- `generate-report.js` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| AGENTS.md | 218 | 38 |
| docs/SCRAPERS.md | 175 | 0 |
| docs/UI.md | 125 | 0 |
| docs/WORKFLOW.md | 92 | 0 |
| generate-report.js | 1 | 1 |

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `AGENTS.md`
```diff
diff --git a/AGENTS.md b/AGENTS.md
index 214ca02..34b5114 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -1,60 +1,240 @@
-# ScraperApp — Workflow de trabajo (Codex + Claude)
+# ScraperApp — Contexto para Agentes IA
 
-## Roles
+ScraperApp es una app de escritorio Windows para estudiantes de ITSON. Centraliza **actividades (iVirtual)**, **horario (CIA + iVirtual)** y **calificaciones (CIA)** en una sola UI.
 
-- **Claude**: prompting, revisión funcional y decisiones de arquitectura.
-- **Codex**: implementación de código, validación técnica y reportes.
+---
+
+## ¿Qué es este proyecto?
+
+- **Tipo**: Electron app (desktop) con renderer React.
+- **Objetivo**: evitar que el alumno navegue manualmente entre portales (Moodle iVirtual y PeopleSoft/Banner CIA) para revisar su estado académico.
+- **Fuentes de datos**:
+  - iVirtual: actividades, cursos, adjuntos y enlaces de videollamada.
+  - CIA: horario semanal y boleta/calificaciones.
+
+---
+
+## Stack tecnológico
+
+- **Electron** (main/preload, IPC, shell de escritorio)
+- **React 18 + Vite 5** (renderer)
+- **Tailwind CSS 3** (estilos)
+- **Playwright** (scraping)
+- **dotenv** (credenciales locales)
+- **electron-builder** (paquetes Windows NSIS/portable)
+- **electron-updater** (actualizaciones vía GitHub Releases)
+- **lucide-react** (iconografía)
+
+> Nota técnica actual: el plugin `tailwind-scrollbar` **no está activo** en `tailwind.config.js` (`plugins: []`).
+
+---
+
+## Estructura del proyecto
+
+```text
+scraper-app/
+├─ electron/
+│  ├─ main.js                      # Crea ventana, carga .env, registra handlers IPC y autoUpdater
+│  ├─ preload.js                   # Expone window.scraperApp (bridge seguro)
+│  └─ handlers/
+│     ├─ scraper.js                # Scraper iVirtual (actividades)
+│     ├─ horario.js                # Scraper CIA horario + búsqueda de meet links en iVirtual
+│     ├─ cia.js                    # Scraper CIA calificaciones (PDF boleta)
+│     ├─ settings.js               # settings:get/settings:save (.env dev/prod)
+│     ├─ files.js                  # Descarga de adjuntos via sesión Electron
+│     └─ notifications.js          # Notificaciones nativas de pendientes/retrasadas
+├─ src/
+│  ├─ main.jsx                     # Entry renderer
+│  ├─ App.jsx                      # Orquestación de estado, navegación, carga de módulos
+│  ├─ index.css                    # Base global + gradiente + util line-clamp-3
+│  ├─ assets/
+│  │  └─ logo-itson.png            # Logo institucional
+│  ├─ components/
+│  │  ├─ Sidebar.jsx
+│  │  ├─ TaskPanel.jsx
+│  │  ├─ Onboarding.jsx
+│  │  ├─ ActivityCard.jsx
+│  │  └─ ResultsTable.jsx
+│  ├─ pages/
+│  │  ├─ Actividades.jsx
+│  │  ├─ Horario.jsx
+│  │  ├─ Calificaciones.jsx
+│  │  └─ Ajustes.jsx
+│  └─ design-backups/v1/           # Backup local visual (ignorado por git)
+├─ scripts/
+│  ├─ generate-icon.js             # Convierte PNG a ICO
+│  ├─ debug-horario.js             # Diagnóstico manual de CIA horario
+│  └─ tabla-*.{html,json}          # Artefactos de diagnóstico
+├─ reports/
+│  └─ report_XXX.md                # Reportes incrementales de cambios
+├─ build/
+│  └─ icon.ico                     # Icono para empaquetado
+├─ generate-report.js              # Generador de reportes v2 (diff por archivo)
+├─ package.json
+├─ tailwind.config.js
+├─ vite.config.js
+├─ postcss.config.js
+├─ .gitignore
+└─ README.md
+```
+
+---
+
+## Arquitectura IPC
+
+### Canales registrados en `electron/main.js` + handlers
+
+| Canal IPC | Handler | Input | Output |
+|---|---|---|---|
+| `scraper:run` | `scraper.js` | opcional event sender | `{ activities, timestamp, fromCache }` o `{ error }` |
+| `scraper:clear-cache` | `scraper.js` | — | `{ success: true }` |
+| `cia:run` | `cia.js` | — | `{ materias, timestamp, fromCache }` o `{ error }` |
+| `cia:clear-cache` | `cia.js` | — | `{ success: true }` |
+| `horario:run` | `horario.js` | — | `{ materias, diasConClases, timestamp, fromCache }` o `{ error }` |
+| `horario:clear-cache` | `horario.js` | — | `{ success: true }` |
+| `horario:save-link` | `horario.js` | `{ numeroClase, link }` | `{ success, ... }` |
+| `settings:get` | `settings.js` | — | `{ user, hasPassword, ciaUser, hasCIAPassword }` |
+| `settings:save` | `settings.js` | `{ user, password, ciaUser, ciaPassword }` | `{ success }` o `{ success:false,error }` |
+| `notifications:check` | `notifications.js` | `activities[]` | resumen `{ delayedCount, expiringCount, supported, success }` |
+| `files:download` | `files.js` | `{ url, name }` | `{ success, path? , error? }` |
+| `files:inspect` | `files.js` | payload libre | response base placeholder |
+| `files:parse` | `files.js` | payload libre | response base placeholder |
+| `shell:open-external` | `main.js` | `url` | abre en navegador externo (sin payload rico) |
+
+### Evento renderer
+
+- `scraper:progress` (emitido por `scraper.js`) con `{ current, total, curso }`.
+
+---
+
+## Módulos de scraping
+
+### 1) iVirtual Actividades (`electron/handlers/scraper.js`)
+
+- Login en `https://ivirtual.itson.edu.mx/login/index.php`.
+- Recorre cursos desde `/my/`.
+- Recorre tareas por curso en `mod/assign/index.php?id=<courseId>`.
+- Extrae detalle por actividad en paralelo por chunks.
+- Clasifica estado final:
+  - `pendiente` = no entregada y abierta
+  - `retrasada` = no entregada, vencida y aún abierta
+  - `cerrada` = no entregada y cerrada definitivamente
+  - entregadas: se excluyen del array final
+
+### 2) CIA Horario (`electron/handlers/horario.js`)
+
+- Login CIA en `https://apps9.itson.edu.mx/CIA/index.aspx`.
+- Navega a horario (PeopleSoft/Banner con frames).
+- Construye materias desde vista listado + vista semanal.
+- Agrega `sesiones` por materia para soportar múltiples horarios/días.
+- Para materias `en_linea` busca `meetLink` en iVirtual con capas de búsqueda.
+
+### 3) CIA Calificaciones (`electron/handlers/cia.js`)
+
+- Login CIA con credenciales separadas.
+- Flujo Boleta + Report Manager.
+- Descarga PDF de boleta y parsea texto/posiciones.
+- Construye materias con `clave`, `nombre`, `calificaciones[]`, `promedio`, `estado`.
 
 ---
 
-## Flujo estándar por tarea
+## Credenciales y variables de entorno
 
-1. Recibir instrucción (usuario/Claude).
-2. Identificar archivos impactados.
-3. Implementar cambios mínimos necesarios.
-4. Validar técnicamente:
-   - `npm run build`
-   - pruebas de ejecución relevantes cuando aplique.
-5. Generar reporte obligatorio:
-   - `node generate-report.js`
-6. Entregar evidencia (output real, errores y estado final).
-7. Commit **solo si se solicita** en la tarea.
+Variables usadas:
+
+```env
+IVIRTUAL_USER=
+IVIRTUAL_PASS=
+CIA_USER=
+CIA_PASS=
+```
+
+### Ruta de `.env`
+
+- **Desarrollo**: raíz del repo (`scraper-app/.env`)
+- **Producción (app empaquetada)**: `app.getPath('userData')/.env`
+
+`settings:save` persiste ahí según `app.isPackaged`.
 
 ---
 
-## Reglas operativas
+## Workflow de desarrollo
 
-- No hardcodear credenciales.
-- Variables sensibles solo en `.env`.
-- Mantener consistencia visual con tema ITSON.
-- No borrar reportes previos en `reports/`.
-- Si una funcionalidad depende de scraping, reportar siempre evidencia real de ejecución.
+```bash
+npm install
+npx playwright install chromium
+npm run start      # Vite + Electron
+npm run build      # Build renderer
+npm run dist:dir   # Empaquetado sin instalador
+```
 
 ---
 
-## Convención de commits
+## Sistema de reportes
+
+Archivo: `generate-report.js`
 
-Usar Conventional Commits:
+- Genera `reports/report_XXX.md` incremental.
+- Usa **diff por archivo** (evita `ENOBUFS` de diffs gigantes).
+- Incluye:
+  - contexto git (rama + último commit)
+  - archivos modificados
+  - estadísticas `+/-` por archivo
+  - diffs (con truncado por archivo si excede límite)
+  - sección `Verificación` basada en constante `VERIFICATION`.
 
-- `feat: ...`
-- `fix: ...`
-- `chore: ...`
-- `refactor: ...`
-- `docs: ...`
+### Regla operativa
 
-Si la tarea lo pide, ejecutar:
-1. `node generate-report.js`
-2. `git add .`
-3. `git commit -m "..."`
+Antes de ejecutar `node generate-report.js`, actualizar:
+
+- `VERIFICATION.buildStatus`
+- `VERIFICATION.testsRun`
+- `VERIFICATION.verificationCmd`
+- `VERIFICATION.verificationOutput`
+
+---
+
+## Colores y design tokens
+
+Tokens Tailwind custom (`tailwind.config.js`):
+
+- `itson-blue: #006DB6`
+- `itson-blue-dark: #005a94`
+- `itson-blue-light: #1a7ec4`
+- `itson-gray: #9CA4AF`
+
+Patrones visuales:
+
+- Fondo base: `slate-950` + gradientes radiales azules (`src/index.css`)
+- Card base: `rounded-2xl/3xl border-slate-800 bg-slate-950/60`
+- Botón principal: `bg-itson-blue hover:bg-itson-blue-light`
+- Convención de estado:
+  - `emerald`: OK / pendiente saludable
+  - `orange`: warning/retraso
+  - `red`: error/crítico
+  - `slate`: neutral/cerrado
 
 ---
 
-## Definition of Done (DoD)
+## Reglas para agentes
 
-Una tarea se considera terminada cuando:
+1. Verificar con datos reales antes de declarar “funcional”.
+2. Ejecutar `npm run build` antes de commit.
+3. Actualizar `VERIFICATION` en `generate-report.js` antes de generar reporte.
+4. No hardcodear datos personales del usuario.
+5. No commitear: `.env`, `release/`, `.local-data/`, `src/design-backups/`.
+6. Usar `gotoWithRetry` en scrapers en vez de `page.goto` directo.
+7. Usar `waitUntil: 'domcontentloaded'`, evitar `networkidle`.
+8. Mantener `src/design-backups/v1/` local (no borrar como referencia de UI).
+
+---
 
-- compila (`npm run build`),
-- cumple la solicitud funcional,
-- deja evidencia ejecutable del resultado,
-- y tiene reporte generado en `reports/`.
+## Estado rápido de módulos
 
+| Módulo | Estado | Nota |
+|---|---|---|
+| Actividades iVirtual | ✅ | Clasificación pendiente/retrasada/cerrada + adjuntos |
+| Horario CIA + links | ⚠️ | Funcional, pero dependiente de estabilidad de frames/estructura CIA |
+| Calificaciones CIA | ⚠️ | Funcional por PDF/Report Manager, sensible a cambios de flujo CIA |
+| Ajustes credenciales | ✅ | UI + persistencia `.env` dev/prod |
+| Reportes (`generate-report.js`) | ✅ | v2 con stats + diff por archivo + verificación |
```

### `docs/SCRAPERS.md`
```diff
diff --git a/docs/SCRAPERS.md b/docs/SCRAPERS.md
new file mode 100644
index 0000000..5d3d0cf
--- /dev/null
+++ b/docs/SCRAPERS.md
@@ -0,0 +1,175 @@
+# Documentación de Scrapers
+
+Este documento describe el comportamiento real de los scrapers actuales en ScraperApp.
+
+---
+
+## iVirtual — Actividades (`electron/handlers/scraper.js`)
+
+### URL y flujo principal
+
+1. Login: `https://ivirtual.itson.edu.mx/login/index.php`
+2. Dashboard: `https://ivirtual.itson.edu.mx/my/`
+3. Por curso: `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=<courseId>`
+4. Por actividad: `mod/assign/view.php?id=<activityId>`
+
+### Datos extraídos por actividad
+
+- `id`
+- `nombre`
+- `materia`
+- `estado` (`pendiente`, `retrasada`, `cerrada`)
+- `fechaLimite`
+- `fechaPublicacion` (si existe)
+- `modalidad` (`individual` / `equipo`)
+- `instrucciones`
+- `archivos[]` (`name`, `url`)
+- `rawSubmission`, `rawGrade`, `url`
+
+### Lógica de clasificación
+
+- **Entregada** (submitted): se excluye del resultado.
+- **Cerrada**: no entregada + no acepta más envíos.
+- **Retrasada**: no entregada + fecha vencida + sigue abierta.
+- **Pendiente**: no entregada + no vencida + abierta.
+
+### Caché
+
+- Ruta: `app.getPath('userData')/actividades-cache.json`
+- TTL: `1 hora`
+- Limpieza:
+  - `scraper:clear-cache`
+  - invalidación automática si JSON corrupto/inválido
+  - limpieza al devolver error (`buildScrapeError`)
+
+### Errores y códigos comunes
+
+- `NO_CREDENTIALS`
+- `NO_USER`
+- `NO_PASSWORD`
+- `SESSION_EXPIRED`
+- `NO_INTERNET`
+- mensajes timeout/global timeout (`El escaneo tardó demasiado...`)
+
+### Optimizaciones de rendimiento
+
+- `gotoWithRetry` con reintentos de timeout.
+- Bloqueo de recursos pesados (`image`, `media`, `font`, `stylesheet`).
+- `waitUntil: 'domcontentloaded'` en navegación.
+- Extracción de detalles por chunks (`CHUNK_SIZE = 3`).
+- Timeout por chunk y timeout global total (`5 min`).
+
+---
+
+## CIA — Horario (`electron/handlers/horario.js`)
+
+### URL y flujo base
+
+1. Entrada CIA: `https://apps9.itson.edu.mx/CIA/index.aspx`
+2. Navegación PeopleSoft a horario de clases.
+3. Vista listado para identificadores.
+4. Vista semanal para bloques de horario.
+
+### Parsing horario semanal
+
+- Reconoce estructura PeopleSoft/Banner.
+- Construye materias con:
+  - `codigo`, `nombre`, `seccion`, `numeroClase`
+  - `dias[]`
+  - `horaInicio`, `horaFin`
+  - `modalidad` (`presencial`/`en_linea`)
+  - `ubicacion`, `instructor`
+- Soporta `sesiones[]` para materias con horarios distintos por día.
+
+### Match de videollamadas (materias en línea)
+
+`findMeetLinkInCourse` aplica búsqueda por capas:
+
+1. `CAPA_1_DOM` — links/texto en DOM completo + frames
+2. `CAPA_2_MOD_URL` — recursos `mod/url`
+3. `CAPA_3_MOD_PAGE` — recursos `mod/page`
+4. `CAPA_4_FORUM` — primer hilo de foros
+5. `CAPA_5_INTRO` — intro/descripción del curso
+6. `CAPA_6_MOD_ASSIGN` — instrucciones de tareas
+7. `CAPA_7_FORUM_THREADS` — posts adicionales en foros
+8. `CAPA_8_MOD_BOOK` — recursos tipo libro/capítulos
+9. `CAPA_9_SHORT_URL` — acortadores y resolución
+10. `CAPA_10_QUIZ_LESSON` — quiz/lesson/scorm
+
+Si no encuentra, `meetLink = null`.
+
+### Caché
+
+- Ruta: `app.getPath('userData')/horario-cache.json`
+- TTL: `6 horas`
+- Links manuales:
+  - archivo: `app.getPath('userData')/horario-links-manuales.json`
+  - canal: `horario:save-link`
+  - se combinan al retornar respuesta
+
+### Errores conocidos
+
+- `CIA_SCHEDULE_UNAVAILABLE` (sin acceso al horario en CIA)
+- `NO_INTERNET`
+- errores de frame si CIA cambia estructura/latencia
+
+### Rendimiento
+
+- `gotoWithRetry`
+- `domcontentloaded`
+- bloqueo de recursos pesados
+- timeout global `4 minutos`
+- procesamiento paralelo de links en línea por chunks (`2`)
+
+---
+
+## CIA — Calificaciones (`electron/handlers/cia.js`)
+
+### Flujo actual
+
+1. Login CIA con `CIA_USER` / `CIA_PASS`
+2. Abrir “Boleta de Calificación”
+3. Ejecutar consulta con selects configurados en flujo actual
+4. Abrir Report Manager y ubicar PDF
+5. Descargar PDF
+6. Parsear texto y reconstruir materias/calificaciones
+
+### Campos devueltos
+
+- `clave`
+- `nombre`
+- `profesor` (puede venir vacío)
+- `calificaciones[]` (parciales/final)
+- `promedio`
+- `estado` (`aprobada`, `en_riesgo`, `reprobada`, `sin_calificacion`)
+
+### Caché
+
+- Ruta: `app.getPath('userData')/cia-cache.json`
+- TTL: `30 minutos`
+- invalidación automática si caché corrupto
+
+### Códigos de credenciales
+
+- `CIA_NO_CREDENTIALS`
+- `CIA_NO_USER`
+- `CIA_NO_PASSWORD`
+
+### Estado actual
+
+- ⚠️ Funcional, pero sensible a cambios del flujo CIA/Report Manager.
+- ⚠️ Si el PDF no aparece o cambia layout, el parser puede requerir ajustes.
+
+---
+
+## Patrones comunes entre scrapers
+
+| Patrón | Uso actual |
+|---|---|
+| `gotoWithRetry` | Reintentos por timeout y detección de red |
+| Bloqueo de recursos | `image/media/font/stylesheet` |
+| `waitUntil: 'domcontentloaded'` | Navegación robusta en portales pesados |
+| Caché local por módulo | Actividades/CIA/Horario con TTL independientes |
+| Limpieza de caché en error | Evita reusar datos incompletos/corruptos |
+| Error mapping a UI | App muestra mensajes amigables en renderer |
+
```

### `docs/UI.md`
```diff
diff --git a/docs/UI.md b/docs/UI.md
new file mode 100644
index 0000000..30d6b47
--- /dev/null
+++ b/docs/UI.md
@@ -0,0 +1,125 @@
+# Documentación UI
+
+Esta guía describe cómo está estructurada la interfaz React y cómo extenderla sin romper patrones existentes.
+
+---
+
+## Componentes principales
+
+| Componente | Props clave | Qué hace | Uso |
+|---|---|---|---|
+| `src/App.jsx` | — | Orquesta estado global, cargas, errores, navegación y listeners IPC | Entry container |
+| `src/components/Sidebar.jsx` | `activePage`, `onNavigate`, `userName` | Menú lateral + identidad de alumno + semestre actual | Layout base |
+| `src/components/TaskPanel.jsx` | `title`, `description`, `children` | Wrapper visual de páginas | Layout de contenido |
+| `src/components/Onboarding.jsx` | `onNavigate` | Estado inicial cuando faltan credenciales | Primer uso |
+| `src/components/ActivityCard.jsx` | datos de actividad | Card expandible/colapsable con adjuntos y contexto temporal | `Actividades` |
+| `src/pages/Actividades.jsx` | activities/error/loading/progress/onSync | Dashboard de tareas + tabs + búsqueda + orden | Módulo iVirtual |
+| `src/pages/Horario.jsx` | horario/error/loading/onSyncHorario | Clases en línea + grid semanal con sesiones | Módulo Horario |
+| `src/pages/Calificaciones.jsx` | calificaciones/error/loading/onSyncCIA | Tarjetas de calificaciones + stats | Módulo CIA |
+| `src/pages/Ajustes.jsx` | onSettingsSaved/... | Gestión de credenciales iVirtual/CIA | Configuración |
+| `src/components/ResultsTable.jsx` | `rows`, `loading` | Tabla genérica auxiliar (estado/skeleton) | Reutilizable |
+
+---
+
+## Sistema de páginas y navegación
+
+`src/App.jsx` define `pageRegistry`:
+
+- `activities` → `Actividades`
+- `horario` → `Horario`
+- `calificaciones` → `Calificaciones`
+- `settings` → `Ajustes`
+
+Flujo:
+
+1. `Sidebar` dispara `onNavigate(pageId)`.
+2. `App` cambia `activePage`.
+3. Se renderiza `ActivePage` dentro de `TaskPanel`.
+4. Cargas iniciales lazy por página:
+   - actividades: primera entrada a `activities`
+   - horario: primera entrada a `horario`
+   - calificaciones: primera entrada a `calificaciones`
+
+---
+
+## Convenciones de diseño
+
+- Dark UI base (`slate-950` + capas `slate-900/950`).
+- Bordes: `border-slate-800`.
+- Radios amplios: `rounded-2xl` / `rounded-3xl`.
+- Primario ITSON:
+  - `itson-blue #006DB6`
+  - `itson-blue-dark #005a94`
+  - `itson-blue-light #1a7ec4`
+
+### Convención semántica por color
+
+- `emerald`: éxito/OK
+- `orange`: warning/retraso
+- `red`: error/crítico
+- `slate`: neutral/cerrado
+
+### Estados de badges temporales (`ActivityCard`)
+
+- `critical`: rojo + `animate-pulse`
+- `warning`: naranja
+- `late`: naranja
+- `closed`: slate
+
+---
+
+## ActivityCard — sistema visual por estado/modalidad
+
+| Estado / modalidad | Borde | Color fecha | Badge principal |
+|---|---|---|---|
+| Pendiente individual | `border-l-emerald-500` | verde | sin badge superior |
+| Pendiente en equipo | `border-l-red-500` | rojo | `EN EQUIPO` |
+| Retrasada | `border-l-orange-500` | naranja | `RETRASADA` |
+| Cerrada | `border-l-slate-600` | slate | `CERRADA` |
+
+Notas:
+
+- Instrucciones con clamp (`line-clamp-3`) y toggle `Ver más/Ver menos`.
+- Adjuntos: muestra 3 por default; toggle `+N más` / `Ver menos`.
+- Descarga individual y “Descargar todos” (con guard `window.scraperApp`).
+
+---
+
+## Horario semanal — lógica de renderizado
+
+### Modelo de datos esperado por UI
+
+Cada materia puede traer:
+
+- rango principal `horaInicio` / `horaFin`
+- `dias[]`
+- y opcional `sesiones[]` para horarios distintos por día
+
+### Helpers clave (`src/pages/Horario.jsx`)
+
+- `normDay()` para normalizar comparación de días (acentos/trim/case).
+- `getMateriaSessions(materia)`:
+  - usa `sesiones` si existe
+  - fallback al rango principal
+- `buildTimeSlots(materias)` genera slots de 30 min.
+- `findMateriasForSlot(materias, day, slotHora)`:
+  - devuelve **array** de materias (soporta traslape/simultáneas).
+- `isFirstSlotForMateria(...)`:
+  - determina si mostrar texto o solo continuidad visual.
+
+### Comportamiento visual
+
+- Primer slot de bloque: muestra nombre + ubicación.
+- Slots siguientes: bloque compacto sin texto (continuidad).
+- Si hay dos materias simultáneas en un slot: se renderizan ambas apiladas dentro de la celda.
+
+---
+
+## Reglas de implementación UI
+
+1. No comparar días crudos; usar `normDay()` siempre.
+2. Mantener compatibilidad backward:
+   - UI debe funcionar con materias sin `sesiones`.
+3. En acciones Electron (`openExternal`, `downloadFile`, etc.) validar guard de API preload.
+4. Si un estado/error tiene código de credenciales, ofrecer navegación a Ajustes.
+
```

### `docs/WORKFLOW.md`
```diff
diff --git a/docs/WORKFLOW.md b/docs/WORKFLOW.md
new file mode 100644
index 0000000..a46fd93
--- /dev/null
+++ b/docs/WORKFLOW.md
@@ -0,0 +1,92 @@
+# Workflow Claude + Codex
+
+Este archivo estandariza cómo operar tareas en ScraperApp entre planeación (Claude) e implementación (Codex).
+
+---
+
+## Roles
+
+- **Claude**
+  - define arquitectura, alcance, riesgos y criterios de aceptación
+  - redacta prompts de implementación/verificación
+  - revisa reportes y decide siguiente iteración
+
+- **Codex**
+  - implementa cambios en código
+  - ejecuta verificaciones reales (build, comandos de scraping, smoke tests)
+  - documenta evidencia en `generate-report.js` + `reports/report_XXX.md`
+  - realiza commits convencionales
+
+---
+
+## Flujo por tarea
+
+1. Claude diseña tarea y prompt.
+2. Codex implementa los cambios.
+3. Codex verifica (build + validación funcional real del módulo tocado).
+4. Codex actualiza `VERIFICATION` en `generate-report.js`.
+5. Codex ejecuta `node generate-report.js`.
+6. Codex hace commit.
+7. Usuario comparte reporte/salida a Claude.
+8. Claude audita y define siguiente paso.
+
+---
+
+## Verificación mínima obligatoria
+
+Checklist por tarea:
+
+- [ ] `npm run build` sin errores.
+- [ ] Validación funcional del módulo afectado (si aplica, contra datos reales).
+- [ ] `VERIFICATION` actualizado con comando y output reales.
+- [ ] `node generate-report.js` ejecutado.
+- [ ] Reporte nuevo en `reports/report_XXX.md`.
+
+---
+
+## Formato del reporte v2
+
+`generate-report.js` produce:
+
+1. Header del reporte (fecha/agente/tipo)
+2. Contexto Git (rama, último commit, total archivos)
+3. Archivos modificados
+4. Estadísticas (`+` / `-` por archivo)
+5. Resumen
+6. Cambios de código (diff por archivo, truncado inteligente)
+7. Verificación (build/tests/comando/output)
+8. Pendiente para Claude
+
+---
+
+## Frases clave activas (operación)
+
+- **“Claude, retomamos el módulo de calificaciones CIA — el bloqueo ya se quitó”**
+  - reactivar validaciones reales de CIA y revisar parser/report manager.
+
+- **“el CIA se desbloqueó”**
+  - retomar scraping real de horario/calificaciones con clear cache y corrida fresh.
+
+---
+
+## Estado actual del proyecto (snapshot)
+
+| Módulo | Estado | Comentario |
+|---|---|---|
+| Actividades (iVirtual) | ✅ | Clasificación y UI activas, caché estable |
+| Horario (CIA + iVirtual links) | ⚠️ | Funcional, sensible a cambios en frames/HTML CIA |
+| Calificaciones (CIA) | ⚠️ | Funcional por PDF, susceptible a variaciones CIA |
+| Ajustes credenciales | ✅ | Persistencia dev/prod operativa |
+| Reportes v2 | ✅ | Diff por archivo + estadísticas + verificación |
+
+---
+
+## Reglas de calidad y seguridad
+
+1. No declarar “funciona” sin evidencia ejecutada.
+2. No commitear secretos ni artefactos locales:
+   - `.env`, `release/`, `.local-data/`, `src/design-backups/`
+3. Preferir cambios atómicos y verificables.
+4. Mantener mensajes de commit en conventional commits.
+5. Si un scraper falla por timeout/red, reportar error amigable y limpiar caché.
+
```

### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 3048483..ec2b8a5 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -33,7 +33,7 @@ dist/index.html                        0.41 kB | gzip: 0.28 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
 dist/assets/index-DT2ZME8U.css        22.80 kB | gzip: 5.18 kB
 dist/assets/index-D19o6-wJ.js        215.87 kB | gzip: 63.41 kB
-✓ built in 4.78s
+✓ built in 6.89s
 The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
 };
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** ninguno
**Comando de verificación:** npm run build
**Output de verificación:**
```
> scraper-app@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1762 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.28 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-DT2ZME8U.css        22.80 kB | gzip: 5.18 kB
dist/assets/index-D19o6-wJ.js        215.87 kB | gzip: 63.41 kB
✓ built in 6.89s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
