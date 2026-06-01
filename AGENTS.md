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
│     ├─ files.js                  # Descarga de adjuntos via sesión Electron
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
| `files:inspect` | `files.js` | payload libre | response base placeholder |
| `files:parse` | `files.js` | payload libre | response base placeholder |
| `shell:open-external` | `main.js` | `url` | abre en navegador externo (sin payload rico) |

### Evento renderer

- `scraper:progress` (emitido por `scraper.js`) con `{ current, total, curso }`.

---

## Módulos de scraping

### 1) iVirtual Actividades (`electron/handlers/scraper.js`)

- Login en `https://ivirtual.itson.edu.mx/login/index.php`.
- Recorre cursos desde `/my/`.
- Recorre tareas por curso en `mod/assign/index.php?id=<courseId>`.
- Extrae detalle por actividad en paralelo por chunks.
- Clasifica estado final:
  - `pendiente` = no entregada y abierta
  - `retrasada` = no entregada, vencida y aún abierta
  - `cerrada` = no entregada y cerrada definitivamente
  - entregadas: se excluyen del array final

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
| Actividades iVirtual | ✅ | Clasificación pendiente/retrasada/cerrada + adjuntos |
| Horario CIA + links | ⚠️ | Funcional, pero dependiente de estabilidad de frames/estructura CIA |
| Calificaciones CIA | ⚠️ | Funcional por PDF/Report Manager, sensible a cambios de flujo CIA |
| Ajustes credenciales | ✅ | UI + persistencia `.env` dev/prod |
| Reportes (`generate-report.js`) | ✅ | v2 con stats + diff por archivo + verificación |
