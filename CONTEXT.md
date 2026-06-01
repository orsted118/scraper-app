# CONTEXT.md — Migración de chat ScraperApp

Este archivo fue generado automáticamente por `scripts/generate-context.js` para que un agente nuevo pueda retomar ScraperApp sin reconstruir el contexto desde cero.

> Última generación: 2026-05-28T06:19:32.776Z

## 1. Descripción del proyecto

# ScraperApp — Contexto para Agentes IA

ScraperApp es una app de escritorio Windows para estudiantes de ITSON. Centraliza **actividades (iVirtual)**, **horario (CIA + iVirtual)** y **calificaciones (CIA)** en una sola UI.

### Resumen de scrapers

# Documentación de Scrapers

Este documento describe el comportamiento real de los scrapers actuales en ScraperApp.

## 2. Stack tecnológico completo

**Proyecto:** `scraper-app`  
**Versión:** `0.1.0`  
**Entry Electron:** `electron/main.js`

### Dependencias runtime

| Paquete | Versión |
|---|---|
| `csv-parse` | `^5.5.6` |
| `dotenv` | `^17.4.2` |
| `electron-updater` | `^6.8.3` |
| `lucide-react` | `^1.16.0` |
| `pdf-parse` | `^1.1.1` |
| `react` | `^18.3.1` |
| `react-dom` | `^18.3.1` |
| `xlsx` | `^0.18.5` |

### Dependencias de desarrollo

| Paquete | Versión |
|---|---|
| `@vitejs/plugin-react` | `^4.3.1` |
| `autoprefixer` | `^10.5.0` |
| `concurrently` | `^9.2.1` |
| `electron` | `^42.2.0` |
| `electron-builder` | `^26.8.1` |
| `playwright` | `^1.60.0` |
| `png-to-ico` | `^3.0.1` |
| `postcss` | `^8.5.14` |
| `tailwindcss` | `^3.4.10` |
| `vite` | `^5.4.2` |

## 3. Estado actual del proyecto desde reportes

Reportes leídos: **58**  
Último reporte: **Report 058 (2026-05-27 22:29, feature)**

### Completado ✅

| Reporte | Fecha | Tipo | Archivos modificados | Resumen |
|---|---|---|---|---|
| 005 | 2026-05-15 01:03 | feature | `electron/handlers/files.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 006 | 2026-05-15 01:08 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 007 | 2026-05-15 01:12 | config | `vite.config.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 008 | 2026-05-15 01:39 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 10 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 009 | 2026-05-15 18:42 | feature | `postcss.config.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 010 | 2026-05-15 18:49 | config | `postcss.config.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 011 | 2026-05-15 18:56 | feature | `electron/handlers/settings.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 012 | 2026-05-15 19:04 | feature | `electron/handlers/notifications.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 013 | 2026-05-15 19:08 | feature | `src/index.css` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 014 | 2026-05-15 19:16 | feature | `src/pages/Actividades.jsx` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 015 | 2026-05-15 19:18 | feature | `src/components/ActivityCard.jsx` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 016 | 2026-05-15 19:19 | feature | `src/components/Sidebar.jsx` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 017 | 2026-05-17 22:57 | feature | `electron/handlers/cia.js` — archivo creado como parte de la base inicial<br>`electron/handlers/settings.js` — archivo actuali | Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 018 | 2026-05-17 23:50 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 019 | 2026-05-18 01:40 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 020 | 2026-05-18 01:53 | feature | `package-lock.json` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 021 | 2026-05-18 02:06 | feature | `package-lock.json` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 022 | 2026-05-20 23:11 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 023 | 2026-05-20 23:48 | feature | `electron/handlers/cia.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 024 | 2026-05-21 00:08 | feature | `src/App.jsx` — archivo actuali | Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 025 | 2026-05-21 00:14 | feature | `electron/handlers/files.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 026 | 2026-05-21 00:47 | feature | `.gitignore` — archivo actuali | Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 027 | 2026-05-21 23:23 | feature | `electron/handlers/horario.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo actuali | Se registraron 6 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 028 | 2026-05-22 00:07 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 030 | 2026-05-22 01:31 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 031 | 2026-05-22 16:32 | feature | `.local-data/horario-cache.json` — archivo creado como parte de la base inicial<br>`electron/handlers/horario.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 032 | 2026-05-22 16:59 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 033 | 2026-05-22 23:37 | refactor | `horario-debug.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 034 | 2026-05-22 23:43 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 035 | 2026-05-22 23:56 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 036 | 2026-05-23 23:53 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 037 | 2026-05-24 00:52 | feature | `horario-debug.html` — archivo creado como parte de la base inicial<br>`reports/report_033.md` — archivo creado como parte de la base inicial<br>`reports/report_034.md` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial<br>`scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial<br>`scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial<br>`src/pages/Horario.jsx` — archivo actuali | Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 038 | 2026-05-24 00:57 | refactor | `README.md` — archivo creado como parte de la base inicial<br>`agents.me` — archivo creado como parte de la base inicial<br>`horario-debug.html` — archivo creado como parte de la base inicial<br>`reports/report_033.md` — archivo creado como parte de la base inicial<br>`reports/report_034.md` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial<br>`scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial<br>`scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial | Se registraron 10 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 039 | 2026-05-24 01:01 | refactor | `AGENTS.md` — archivo creado como parte de la base inicial<br>`README.md` — archivo creado como parte de la base inicial<br>`horario-debug.html` — archivo creado como parte de la base inicial<br>`reports/report_033.md` — archivo creado como parte de la base inicial<br>`reports/report_034.md` — archivo creado como parte de la base inicial<br>`reports/report_038.md` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial<br>`scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial<br>`scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial | Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 040 | 2026-05-24 21:44 | config | `AGENTS.md` — archivo creado como parte de la base inicial<br>`README.md` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo actuali | Se registraron 13 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 041 | 2026-05-24 22:02 | fix | `AGENTS.md` — archivo creado como parte de la base inicial<br>`README.md` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo actuali | Se registraron 14 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 042 | 2026-05-24 22:26 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 043 | 2026-05-24 22:40 | refactor | `electron/handlers/horario.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 044 | 2026-05-24 23:11 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 045 | 2026-05-24 23:49 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 046 | 2026-05-25 00:01 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 047 | 2026-05-25 22:50 | config | `.gitignore` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 048 | 2026-05-25 22:59 | refactor | `generate-report.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 049 | 2026-05-25 23:32 | refactor | `AGENTS.md` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 050 | 2026-05-25 23:47 | feature | `electron/handlers/cia.js` — archivo actuali | Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 051 | 2026-05-26 17:26 | refactor | `generate-report.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 052 | 2026-05-26 17:43 | refactor | `generate-report.js` — archivo actuali | Se registraron 12 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 053 | 2026-05-26 18:00 | refactor | `generate-report.js` — archivo actuali | Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 054 | 2026-05-26 18:22 | refactor | `generate-report.js` — archivo actuali | Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 055 | 2026-05-26 22:52 | refactor | `generate-report.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 056 | 2026-05-26 23:44 | refactor | `generate-report.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 057 | 2026-05-26 23:55 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
| 058 | 2026-05-27 22:29 | feature | `electron/handlers/cia.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |

### Pendiente ⚠️

| Reporte | Fecha | Tipo | Archivos modificados | Resumen |
|---|---|---|---|---|
| 001 | 2026-05-15 00:07 | feature | `electron/handlers/files.js` — archivo creado como parte de la base inicial<br>`electron/handlers/scraper.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo creado como parte de la base inicial<br>`electron/preload.js` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo creado como parte de la base inicial<br>`package.json` — archivo creado como parte de la base inicial<br>`src/App.jsx` — archivo creado como parte de la base inicial<br>`src/components/ResultsTable.jsx` — archivo creado como parte de la base inicial<br>`src/components/Sidebar.jsx` — archivo creado como parte de la base inicial<br>`src/components/TaskPanel.jsx` — archivo creado como parte de la base inicial<br>`src/main.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Automation.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Files.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Scraper.jsx` — archivo creado como parte de la base inicial<br>`tailwind.config.js` — archivo creado como parte de la base inicial<br>`vite.config.js` — archivo creado como parte de la base inicial | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
| 002 | 2026-05-15 00:10 | feature | `electron/handlers/files.js` — archivo creado como parte de la base inicial<br>`electron/handlers/scraper.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo creado como parte de la base inicial<br>`electron/preload.js` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo creado como parte de la base inicial<br>`index.html` — archivo creado como parte de la base inicial<br>`package.json` — archivo creado como parte de la base inicial<br>`reports/report_001.md` — archivo creado como parte de la base inicial<br>`src/App.jsx` — archivo creado como parte de la base inicial<br>`src/components/ResultsTable.jsx` — archivo creado como parte de la base inicial<br>`src/components/Sidebar.jsx` — archivo creado como parte de la base inicial<br>`src/components/TaskPanel.jsx` — archivo creado como parte de la base inicial<br>`src/main.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Automation.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Files.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Scraper.jsx` — archivo creado como parte de la base inicial<br>`tailwind.config.js` — archivo creado como parte de la base inicial<br>`vite.config.js` — archivo creado como parte de la base inicial | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
| 003 | 2026-05-15 00:20 | refactor | `N/A` — no se detectaron cambios para reportar | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
| 004 | 2026-05-15 00:57 | feature | `.gitignore` — archivo actuali | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
| 029 | 2026-05-22 00:54 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |

## 4. Módulos y su estado

| Módulo | Estado | Comentario |
|---|---|---|
| Actividades (iVirtual) | ✅ | Clasificación y UI activas, caché estable |
| Horario (CIA + iVirtual links) | ⚠️ | Funcional, sensible a cambios en frames/HTML CIA |
| Calificaciones (CIA) | ⚠️ | Funcional por PDF, susceptible a variaciones CIA |
| Ajustes credenciales | ✅ | Persistencia dev/prod operativa |
| Reportes v2 | ✅ | Diff por archivo + estadísticas + verificación |

## 5. Bugs conocidos y pendientes

### Pendientes extraídos de reportes

- Report 001: Validar la direccion visual de la UI base antes de profundi
- Report 002: Validar la direccion visual de la UI base antes de profundi
- Report 003: Validar la direccion visual de la UI base antes de profundi
- Report 004: Validar la direccion visual de la UI base antes de profundi
- Report 029: Output exacto del comando de verificación:
- Report 029: Comando:
- Report 029: `node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { console.log('Total materias:', r.materias?.length); r.materias?.forEach(m => console.log(m.nombre.padEnd(40), m.modalidad.padEnd(12), m.meetLink ? '✅ ' + m.meetLink : '❌ sin link')); })"`
- Report 029: Salida:
- Report 029: `Total materias: 7`
- Report 029: `Ingles Universitario A1                  presencial   ❌ sin link`
- Report 029: `Precálculo                               presencial   ❌ sin link`
- Report 029: `Sist Operativos y Arq de Comp            en_linea     ✅ https://meet.google.com/yiv-xspu-fpn`
- Report 029: `Tutoria 2 (INSOF)                        presencial   ❌ sin link`
- Report 029: `Programacion II c/Lab                    presencial   ❌ sin link`
- Report 029: `Matematicas Discretas                    en_linea     ✅ https://meet.google.com/guq-ocgc-bsi`
- Report 029: `Tecnologia y Empresa                     en_linea     ✅ https://meet.google.com/tpt-ofxq-nus`
- Report 029: Forma de link detectada por materia en línea:
- Report 029: `Tecnologia y Empresa` → **Forma B** (`mod/url` “Link Videollamada Google Meet”, con extracción en página intermedia).
- Report 029: `Sist Operativos y Arq de Comp` → **Forma A** (link de Meet directo en HTML/texto del curso).
- Report 029: `Matematicas Discretas` → **Forma A** (directo) y también disponible por **Forma B** (`mod/url`).
- Report 029: Integridad del horario semanal:
- Report 029: Se parseó con matri

### Último reporte

- Report 058: Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## 6. Frases clave activas

- **“Claude, retomamos el módulo de calificaciones CIA — el bloqueo ya se quitó”**
- **“el CIA se desbloqueó”**

## 7. Estructura de carpetas y archivos principales

Equivalente a `git ls-files | head -100`:

```text
.gitignore
AGENTS.md
README.md
build/icon.ico
docs/SCRAPERS.md
docs/UI.md
docs/WORKFLOW.md
electron/handlers/cia.js
electron/handlers/files.js
electron/handlers/horario.js
electron/handlers/notifications.js
electron/handlers/scraper.js
electron/handlers/settings.js
electron/main.js
electron/preload.js
generate-report.js
horario-debug.html
index.html
package-lock.json
package.json
postcss.config.js
reports/report_001.md
reports/report_002.md
reports/report_003.md
reports/report_004.md
reports/report_005.md
reports/report_006.md
reports/report_007.md
reports/report_008.md
reports/report_009.md
reports/report_010.md
reports/report_011.md
reports/report_012.md
reports/report_013.md
reports/report_014.md
reports/report_015.md
reports/report_016.md
reports/report_017.md
reports/report_018.md
reports/report_019.md
reports/report_020.md
reports/report_021.md
reports/report_022.md
reports/report_023.md
reports/report_024.md
reports/report_025.md
reports/report_026.md
reports/report_027.md
reports/report_028.md
reports/report_029.md
reports/report_030.md
reports/report_031.md
reports/report_032.md
reports/report_033.md
reports/report_034.md
reports/report_035.md
reports/report_036.md
reports/report_037.md
reports/report_038.md
reports/report_039.md
reports/report_040.md
reports/report_041.md
reports/report_042.md
reports/report_043.md
reports/report_044.md
reports/report_045.md
reports/report_046.md
reports/report_047.md
reports/report_048.md
reports/report_049.md
reports/report_050.md
reports/report_051.md
reports/report_052.md
reports/report_053.md
reports/report_054.md
reports/report_055.md
reports/report_056.md
reports/report_057.md
reports/report_058.md
scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
scripts/debug-horario.js
scripts/generate-icon.js
scripts/tabla-celdas-real.json
scripts/tabla-horario-real.html
src/App.jsx
src/ThemeContext.jsx
src/assets/logo-itson.png
src/components/ActivityCard.jsx
src/components/ColorPicker.jsx
src/components/GradeCard.jsx
src/components/Onboarding.jsx
src/components/ResultsTable.jsx
src/components/Sidebar.jsx
src/components/TaskPanel.jsx
src/index.css
src/main.jsx
src/pages/Actividades.jsx
src/pages/Ajustes.jsx
src/pages/Calificaciones.jsx
```

## 8. Últimos 10 commits

```text
0ec0e20 feat: calificaciones con parciales, GradeCard rediseñada y fixes de scraper
6efe3d6 fix: color picker como ventana flotante compacta sin fondo borroso
03e06a8 feat: color picker premium con selector, deslizadores, ajustes y paletas
79caf8b feat: tema personalizable con color picker y cuadro de actividad urgente
aa516f1 feat: superficies secundarias adaptativas por tema
456716b feat: colores de estado adaptativos por tema
c6bf3ed feat: sistema de temas visuales con 5 temas predefinidos
7d28ef4 revert: restaurar diseño v1 desde backup
5d2bfb2 feat: sync automático en background, TTL extendidos y botón sincronizar todo
00c18a6 docs: documentación técnica completa para agentes IA
```

## 9. Variables de entorno requeridas

No se incluyen valores secretos. Solo nombres:

- `IVIRTUAL_USER` — presente en .env local
- `IVIRTUAL_PASS` — presente en .env local
- `CIA_USER` — presente en .env local
- `CIA_PASS` — presente en .env local

## 10. Cómo continuar

### Ruta rápida para el nuevo agente

1. Leer primero `AGENTS.md`, luego `docs/WORKFLOW.md`, luego este `CONTEXT.md`.
2. Revisar el último reporte en `reports/` para entender el diff y la verificación más recientes.
3. Ejecutar `git status --short` antes de tocar archivos.
4. Verificar compilación con:

```bash
npm run build
```

5. Para cambios que toquen scrapers, ejecutar el comando de verificación real del módulo afectado y pegar el output en `generate-report.js`.
6. Antes de generar reporte, actualizar en `generate-report.js`:
   - `VERIFICATION.buildStatus`
   - `VERIFICATION.testsRun`
   - `VERIFICATION.verificationCmd`
   - `VERIFICATION.verificationOutput`
7. Ejecutar:

```bash
node generate-report.js
```

8. Solo después de revisión/verificación, hacer commit convencional.

### Qué estaba en progreso al migrar

- Último trabajo registrado: Report 058 — Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo..
- Si el usuario pide continuar calificaciones: revisar `electron/handlers/cia.js`, `src/components/GradeCard.jsx` y `src/pages/Calificaciones.jsx`.
- Si el usuario pide continuar temas/color picker: revisar `src/components/ColorPicker.jsx`, `src/ThemeContext.jsx`, `src/themes.js` y `src/pages/Ajustes.jsx`.

### Workflow Claude + Codex

- Claude diseña alcance, riesgos y criterios.
- Codex implementa, verifica con datos reales, actualiza `generate-report.js`, genera reporte y commitea.
- Usuario pasa el reporte a Claude.
- Claude revisa y define la siguiente iteración.

### Reglas que NO se deben romper

- No commitear `.env`, `.local-data/`, `release/` ni `src/design-backups/`.
- No declarar funcionalidad sin evidencia ejecutada.
- Usar commits convencionales sin `Co-Authored-By` ni atribución de IA.
- Mantener reportes como fuente de verdad para migraciones entre chats.
