# DVPotro — Contexto para Agentes IA

DVPotro es una app de escritorio Windows para estudiantes de ITSON. Centraliza **actividades (iVirtual)**, **horario (CIA + iVirtual)** y **calificaciones (CIA)** en una sola UI.

---

## ¿Qué es este proyecto?

- **Tipo**: Electron app (desktop) con renderer React.
- **Objetivo**: evitar que el alumno navegue manualmente entre portales (Moodle iVirtual y PeopleSoft/Banner CIA) para revisar su estado académico.
- **Fuentes de datos**:
  - iVirtual: actividades, cursos, adjuntos y enlaces de videollamada.
  - CIA: horario semanal y boleta/calificaciones.

---

## Stack tecnológico

- **Electron** (main/preload, IPC, shell de escritorio)
- **React 18 + Vite 5** (renderer)
- **Tailwind CSS 3** (estilos)
- **Playwright** (scraping)
- **dotenv** (credenciales locales)
- **electron-builder** (paquetes Windows NSIS/portable)
- **electron-updater** (actualizaciones vía GitHub Releases)
- **lucide-react** (iconografía)

> Nota técnica actual: el plugin `tailwind-scrollbar` **no está activo** en `tailwind.config.js` (`plugins: []`).

---

## Estructura del proyecto

```text
scraper-app/
├─ electron/
│  ├─ main.js                      # Crea ventana, carga .env, registra handlers IPC y autoUpdater
│  ├─ preload.js                   # Expone window.scraperApp (bridge seguro)
│  └─ handlers/
│     ├─ scraper.js                # Scraper iVirtual (actividades)
│     ├─ horario.js                # Scraper CIA horario + búsqueda de meet links en iVirtual
│     ├─ cia.js                    # Scraper CIA calificaciones (PDF boleta)
│     ├─ settings.js               # settings:get/settings:save (.env dev/prod)
│     ├─ assignment-upload.js      # Entrega de archivos a iVirtual (lee el form, valida y sube)
│     ├─ files.js                  # Descarga de adjuntos via sesión Electron
│     ├─ drive.js                  # Resuelve los Drive de la consigna a un PDF local (anónimo)
│     └─ notifications.js          # Notificaciones nativas de pendientes/retrasadas
├─ src/
│  ├─ main.jsx                     # Entry renderer
│  ├─ App.jsx                      # Orquestación de estado, navegación, carga de módulos
│  ├─ index.css                    # Base global + gradiente + util line-clamp-3
│  ├─ assets/
│  │  ├─ logo-itson.png            # Logo institucional legado
│  │  └─ branding/                 # Assets oficiales DVPotro
│  ├─ components/
│  │  ├─ Sidebar.jsx
│  │  ├─ TaskPanel.jsx
│  │  ├─ Onboarding.jsx
│  │  ├─ ActivityCard.jsx
│  │  └─ ResultsTable.jsx
│  ├─ pages/
│  │  ├─ Actividades.jsx
│  │  ├─ Horario.jsx
│  │  ├─ Calificaciones.jsx
│  │  └─ Ajustes.jsx
│  └─ design-backups/v1/           # Backup local visual (ignorado por git)
├─ mcp/
│  └─ dvpotro-mcp.js               # Servidor MCP sobre las cachés (stdio, sin deps)
├─ scripts/
│  ├─ generate-icon.js             # Convierte PNG a ICO
│  ├─ debug-horario.js             # Diagnóstico manual de CIA horario
│  └─ tabla-*.{html,json}          # Artefactos de diagnóstico
├─ reports/
│  └─ report_XXX.md                # Reportes incrementales de cambios
├─ build/
│  └─ icon.ico                     # Icono para empaquetado
├─ generate-report.js              # Generador de reportes v2 (diff por archivo)
├─ package.json
├─ tailwind.config.js
├─ vite.config.js
├─ postcss.config.js
├─ .gitignore
└─ README.md
```

---

## Arquitectura IPC

### Canales registrados en `electron/main.js` + handlers

| Canal IPC | Handler | Input | Output |
|---|---|---|---|
| `scraper:run` | `scraper.js` | opcional event sender | `{ activities, timestamp, fromCache }` o `{ error }` |
| `scraper:clear-cache` | `scraper.js` | — | `{ success: true }` |
| `cia:run` | `cia.js` | — | `{ materias, timestamp, fromCache }` o `{ error }` |
| `cia:clear-cache` | `cia.js` | — | `{ success: true }` |
| `horario:run` | `horario.js` | — | `{ materias, diasConClases, timestamp, fromCache }` o `{ error }` |
| `horario:clear-cache` | `horario.js` | — | `{ success: true }` |
| `horario:save-link` | `horario.js` | `{ numeroClase, link }` | `{ success, ... }` |
| `settings:get` | `settings.js` | — | `{ user, hasPassword, ciaUser, hasCIAPassword }` |
| `settings:save` | `settings.js` | `{ user, password, ciaUser, ciaPassword }` | `{ success }` o `{ success:false,error }` |
| `notifications:check` | `notifications.js` | `activities[]` | resumen `{ delayedCount, expiringCount, supported, success }` |
| `files:download` | `files.js` | `{ url, name }` | `{ success, path? , error? }` |
| `assignment:upload-info` | `assignment-upload.js` | `url` | `{ success, puedeEntregar, acceptedTypes, maxBytes, maxFiles, archivosEnBorrador, ... }` |
| `assignment:upload-files` | `assignment-upload.js` | `{ url, files[] }` | `{ success, estado, archivos, sePuedeDeshacer }` o `{ error }` |
| `assignment:remove-draft-file` | `assignment-upload.js` | `{ url, fileName }` | `{ success }` o `{ error }` |
| `assignment:remove-submission` | `assignment-upload.js` | `url` | `{ success }` o `{ error }` |
| `assignment:pick-files` | `assignment-upload.js` | — | rutas elegidas en el diálogo nativo |
| `drive:get-cached` | `drive.js` | — | `{ ok, data }` — índice de PDFs de Drive resueltos |
| `drive:resolve` | `drive.js` | `{ urls[], actividadId?, forzar? }` | `{ ok, resueltos, total, data }` |
| `drive:read-text` | `drive.js` | `fileId` | `{ ok, texto, nombre }` o `{ ok:false, error }` |
| `files:inspect` | `files.js` | payload libre | response base placeholder |
| `files:parse` | `files.js` | payload libre | response base placeholder |
| `shell:open-external` | `main.js` | `url` | abre en navegador externo (sin payload rico) |

### Evento renderer

- `scraper:progress` (emitido por `scraper.js`) con `{ current, total, curso }`.
- `drive:progress` (emitido por `drive.js`) con `{ done, total, fileId, nombre, estado }`. Canal propio y no `scraper:progress`: ese payload es `{current, total, curso}` y reusarlo haría que la barra de materias se recargue desde cero después de llegar a 100%.

---

## Módulos de scraping

### 1) iVirtual Actividades (`electron/handlers/scraper.js`)

- Login en `https://ivirtual.itson.edu.mx/login/index.php`.
- Recorre cursos desde `/my/`.
- Recorre tareas por curso en `mod/assign/index.php?id=<courseId>`.
- Extrae detalle por actividad en paralelo por chunks.
- Extrae de la consigna, además del texto plano: `instruccionesMarkdown` (conserva enlaces y tablas), `enlaces[]`, `tablas[]` y `rubrica` (los criterios de calificación, que viven fuera de `#intro`).
- Clasifica sobre la **ventana de entrega**, que es distinta del estado de la propia entrega:
  - `ventana` = `no_abierta` | `abierta` | `cerrada`, resuelta por `resolveSubmissionWindow()` a partir de la fecha de corte, la fecha de apertura y los avisos del portal.
  - `pendiente` = no entregada y la ventana está abierta **o todavía no abre**
  - `retrasada` = no entregada, vencida y la ventana sigue abierta
  - `cerrada` = no entregada y la ventana ya cerró (fecha de corte vencida o aviso explícito)
  - entregadas: se excluyen del array final
- `bloqueo` explica por qué no hay botón de entrega sin cambiar el estado. Hoy solo `sin_equipo` (tarea grupal sin equipo asignado todavía).
- **No usar la columna "Submission" del índice para decidir cierre.** Dice si el alumno entregó, no si el portal acepta entregas: `"No submission"` es la definición de pendiente. Confundirlas enterraba en cerradas las tareas que aún no abrían y las grupales sin equipo.

### 2) CIA Horario (`electron/handlers/horario.js`)

- Login CIA en `https://apps9.itson.edu.mx/CIA/index.aspx`.
- Navega a horario (PeopleSoft/Banner con frames).
- Construye materias desde vista listado + vista semanal.
- Agrega `sesiones` por materia para soportar múltiples horarios/días.
- Para materias `en_linea` busca `meetLink` en iVirtual con capas de búsqueda.

### 3) CIA Calificaciones (`electron/handlers/cia.js`)

- Login CIA con credenciales separadas.
- Flujo Boleta + Report Manager.
- Descarga PDF de boleta y parsea texto/posiciones.
- Construye materias con `clave`, `nombre`, `calificaciones[]`, `promedio`, `estado`.

---

## Servidor MCP — catálogo de tools

`mcp/dvpotro-mcp.js` expone la caché de la app por MCP. **Si la pregunta es sobre datos
académicos, contestala con estas tools en vez de leer los JSON de `userData` a mano.**
Arquitectura y reglas en `CLAUDE.md`.

| Tool | Devuelve | Lee |
|---|---|---|
| `dvpotro_estado` | qué módulos tienen caché y qué tan vieja está — **llamarla primero** | todas |
| `dvpotro_materias` | vista de conjunto del ciclo: profesor, material, tareas por estado, asistencia | material + actividades + attendance + horario |
| `dvpotro_actividades` | listado resumido, filtrable; por defecto solo pendientes y retrasadas | `actividades-cache.json` |
| `dvpotro_actividad` | UNA con consigna en markdown, rúbrica, adjuntos, enlaces y tablas | `actividades-cache.json` |
| `dvpotro_horario` | horario semanal con aula o enlace de videollamada; filtra por día | `horario-cache.json` |
| `dvpotro_material` | recursos por materia y sección; sin filtro devuelve solo conteos | `material.json` |
| `dvpotro_asistencia` | porcentaje, puntos y detalle de sesiones | `attendance.json` |
| `dvpotro_calificaciones` | boleta: parciales, promedio, estado y componentes de laboratorio | `cia-cache.json` |
| `dvpotro_notas` | notas personales tipo Keep | `notes.json` |
| `dvpotro_calendario` | calendario escolar del ITSON en una ventana de días | `calendario-cache.json` |
| `dvpotro_buscar` | un texto a la vez en actividades, material, notas y calendario | varias |
| `dvpotro_notificaciones` | avisos que la app generó | `notifications.json` |
| `dvpotro_novedades` | qué cambió: actividades nuevas, fechas movidas, cambios de aula | `notifications.json` |
| `dvpotro_agenda` | clases + entregas + calendario en un solo eje temporal ordenado | horario + actividades + calendario |
| `dvpotro_perfil` | nombre, matrícula, correo y programa — para portadas | `profile-cache/profile.json` |
| `dvpotro_requisitos` | requisitos ya extraídos de una consigna y la última verificación | `activity-analysis/<id>.json` |
| `dvpotro_prompts` | prompts que la app ya armó por actividad | `prompt-cache.json` |
| `dvpotro_adjuntos` | **baja archivos**: adjuntos e imágenes de la consigna de UNA actividad a disco, con el texto de los .pdf/.docx. ~10-20 s la primera vez, 0 s después | `actividades-cache.json` |
| `dvpotro_material_leer` | **baja y lee**: abre UN recurso de material y devuelve su texto — la presentación del profe, el PDF de la clase, la página del curso. Resuelve Drive o `pluginfile` según el recurso | `material.json` |
| `dvpotro_nota` | UNA nota entera en markdown, sin el recorte a 400 caracteres de `dvpotro_notas` | `notes.json` |
| `dvpotro_nota_crear` | **escribe caché local**: crea una nota de texto o checklist en la app, para que lo hablado en la terminal no muera en el scrollback | `notes.json` |
| `dvpotro_ocultar` | **escribe caché local**: lista, oculta o restaura una actividad. Sin argumentos muestra las ocultas, que era lo único invisible desde el chat | `hidden-activities.json` |
| `dvpotro_sync` | **escribe caché**: sale al portal y la refresca. 40-120 s por módulo | — |
| `dvpotro_entregar` | **ESCRIBE EN EL PORTAL**: la única que manda algo. Sin `archivo` informa qué formatos acepta la actividad, el tope de tamaño, cuántos archivos admite y si la ventana sigue abierta. Con `archivo` valida contra el formulario real; solo sube con `confirmar:true`. Delega en `assignment-upload.js` | `actividades-cache.json` |
| `dvpotro_quitar_archivo` | **ESCRIBE EN EL PORTAL**: saca un archivo de una entrega. Complemento de `dvpotro_entregar`, que con un nombre nuevo SUMA en vez de reemplazar. Solo con `confirmar:true` | `actividades-cache.json` |

Notas de uso:

- `dvpotro_adjuntos` existe porque las URLs de `pluginfile.php` necesitan la cookie de sesión: sin ella devuelven la pantalla de login. Cuando el profesor no escribe consigna en Moodle, la tarea entera está adentro de ese `.docx` —o dibujada en la imagen que pegó en el editor— y esta tool es la única forma de leerla. Guarda en `userData/adjuntos/<idActividad>/`, con un sidecar `.txt` por archivo; las imágenes van a `imagenes/` aparte, numeradas, porque Moodle las nombra `blobid0.png` a todas y se pisarían. Baja todo lo que la actividad liste en `archivos`, que incluye lo que el alumno ya entregó.

- Las listas devuelven resúmenes y el detalle se pide de a uno, a propósito: volcar `actividades-cache.json` entero son ~75.000 tokens.
- `dvpotro_actividades`, `dvpotro_materias`, `dvpotro_buscar` y `dvpotro_agenda` **descuentan las actividades que el alumno ocultó** en la app (`hidden-activities.json`). `dvpotro_actividad` por id igual las resuelve.
- La búsqueda de actividades barre nombre, consigna, **rúbrica**, tablas, enlaces y adjuntos: en iVirtual la consigna suele ser solo un enlace a Drive y los entregables concretos viven en la rúbrica.
- `dvpotro_requisitos` y `dvpotro_prompts` **leen caché, no llaman a ningún modelo**: cuestan cero.
- Toda respuesta trae un encabezado con la frescura del dato. Si dice días, avisarlo antes de responder como si fuera de hoy.

---

## Credenciales y variables de entorno

Variables usadas:

```env
IVIRTUAL_USER=
IVIRTUAL_PASS=
CIA_USER=
CIA_PASS=
```

### Ruta de `.env`

- **Desarrollo**: raíz del repo (`scraper-app/.env`)
- **Producción (app empaquetada)**: `app.getPath('userData')/.env`

`settings:save` persiste ahí según `app.isPackaged`.

---

## Workflow de desarrollo

```bash
npm install
npx playwright install chromium
npm run start      # Vite + Electron
npm run build      # Build renderer
npm run dist:dir   # Empaquetado sin instalador
```

---

## Sistema de reportes

Archivo: `generate-report.js`

- Genera `reports/report_XXX.md` incremental.
- Usa **diff por archivo** (evita `ENOBUFS` de diffs gigantes).
- Incluye:
  - contexto git (rama + último commit)
  - archivos modificados
  - estadísticas `+/-` por archivo
  - diffs (con truncado por archivo si excede límite)
  - sección `Verificación` basada en constante `VERIFICATION`.

### Regla operativa

Antes de ejecutar `node generate-report.js`, actualizar:

- `VERIFICATION.buildStatus`
- `VERIFICATION.testsRun`
- `VERIFICATION.verificationCmd`
- `VERIFICATION.verificationOutput`

---

## Colores y design tokens

Tokens Tailwind custom (`tailwind.config.js`):

- `itson-blue: #006DB6`
- `itson-blue-dark: #005a94`
- `itson-blue-light: #1a7ec4`
- `itson-gray: #9CA4AF`

Patrones visuales:

- Fondo base: `slate-950` + gradientes radiales azules (`src/index.css`)
- Card base: `rounded-2xl/3xl border-slate-800 bg-slate-950/60`
- Botón principal: `bg-itson-blue hover:bg-itson-blue-light`
- Convención de estado:
  - `emerald`: OK / pendiente saludable
  - `orange`: warning/retraso
  - `red`: error/crítico
  - `slate`: neutral/cerrado

---

## Reglas para agentes

1. Verificar con datos reales antes de declarar “funcional”.
2. Ejecutar `npm run build` antes de commit.
3. Actualizar `VERIFICATION` en `generate-report.js` antes de generar reporte.
4. No hardcodear datos personales del usuario.
5. No commitear: `.env`, `release/`, `.local-data/`, `src/design-backups/`.
6. Usar `gotoWithRetry` en scrapers en vez de `page.goto` directo.
7. Usar `waitUntil: 'domcontentloaded'`, evitar `networkidle`.
8. Mantener `src/design-backups/v1/` local (no borrar como referencia de UI).

---

## Estado rápido de módulos

| Módulo | Estado | Nota |
|---|---|---|
| Actividades iVirtual | ✅ | Clasificación por ventana de entrega + adjuntos, enlaces y rúbrica |
| Horario CIA + links | ⚠️ | Funcional, pero dependiente de estabilidad de frames/estructura CIA |
| Calificaciones CIA | ⚠️ | Funcional por PDF/Report Manager, sensible a cambios de flujo CIA |
| Ajustes credenciales | ✅ | UI + persistencia `.env` dev/prod |
| Reportes (`generate-report.js`) | ✅ | v2 con stats + diff por archivo + verificación |
| Servidor MCP (`mcp/dvpotro-mcp.js`) | ✅ | 25 tools. Lectura de caché; `dvpotro_adjuntos` y `dvpotro_material_leer` bajan archivos; `dvpotro_sync` refresca caché (8 módulos); `dvpotro_nota_crear` y `dvpotro_ocultar` escriben caché local; `dvpotro_entregar` y `dvpotro_quitar_archivo` son las únicas que escriben en el PORTAL. Registrado en `.mcp.json` del repo y a nivel usuario |
