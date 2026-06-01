# Report 059
**Fecha:** 2026-05-28 01:11  
**Agente:** Codex  
**Tipo:** feature

## Contexto Git
**Rama:** master
**Último commit:** 0ec0e20 — feat: calificaciones con parciales, GradeCard rediseñada y fixes de scraper
**Archivos modificados:** 11

## Archivos modificados
- `CONTEXT.md` — archivo creado como parte de la base inicial
- `electron/handlers/cia.js` — archivo actualizado en esta tarea
- `electron/handlers/files.js` — archivo actualizado en esta tarea
- `electron/handlers/horario.js` — archivo actualizado en esta tarea
- `electron/handlers/notifications.js` — archivo actualizado en esta tarea
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `electron/handlers/settings.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `scripts/generate-context.js` — archivo creado como parte de la base inicial
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| CONTEXT.md | 348 | 0 |
| electron/handlers/cia.js | 41 | 9 |
| electron/handlers/files.js | 27 | 6 |
| electron/handlers/horario.js | 44 | 69 |
| electron/handlers/notifications.js | 14 | 1 |
| electron/handlers/scraper.js | 54 | 20 |
| electron/handlers/settings.js | 2 | 2 |
| electron/preload.js | 4 | 1 |
| scripts/generate-context.js | 354 | 0 |
| src/App.jsx | 4 | 4 |
| src/pages/Actividades.jsx | 12 | 9 |

## Resumen
Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `CONTEXT.md`
```diff
diff --git a/CONTEXT.md b/CONTEXT.md
new file mode 100644
index 0000000..b9d8da7
--- /dev/null
+++ b/CONTEXT.md
@@ -0,0 +1,348 @@
+# CONTEXT.md — Migración de chat ScraperApp
+
+Este archivo fue generado automáticamente por `scripts/generate-context.js` para que un agente nuevo pueda retomar ScraperApp sin reconstruir el contexto desde cero.
+
+> Última generación: 2026-05-28T06:19:32.776Z
+
+## 1. Descripción del proyecto
+
+# ScraperApp — Contexto para Agentes IA
+
+ScraperApp es una app de escritorio Windows para estudiantes de ITSON. Centraliza **actividades (iVirtual)**, **horario (CIA + iVirtual)** y **calificaciones (CIA)** en una sola UI.
+
+### Resumen de scrapers
+
+# Documentación de Scrapers
+
+Este documento describe el comportamiento real de los scrapers actuales en ScraperApp.
+
+## 2. Stack tecnológico completo
+
+**Proyecto:** `scraper-app`  
+**Versión:** `0.1.0`  
+**Entry Electron:** `electron/main.js`
+
+### Dependencias runtime
+
+| Paquete | Versión |
+|---|---|
+| `csv-parse` | `^5.5.6` |
+| `dotenv` | `^17.4.2` |
+| `electron-updater` | `^6.8.3` |
+| `lucide-react` | `^1.16.0` |
+| `pdf-parse` | `^1.1.1` |
+| `react` | `^18.3.1` |
+| `react-dom` | `^18.3.1` |
+| `xlsx` | `^0.18.5` |
+
+### Dependencias de desarrollo
+
+| Paquete | Versión |
+|---|---|
+| `@vitejs/plugin-react` | `^4.3.1` |
+| `autoprefixer` | `^10.5.0` |
+| `concurrently` | `^9.2.1` |
+| `electron` | `^42.2.0` |
+| `electron-builder` | `^26.8.1` |
+| `playwright` | `^1.60.0` |
+| `png-to-ico` | `^3.0.1` |
+| `postcss` | `^8.5.14` |
+| `tailwindcss` | `^3.4.10` |
+| `vite` | `^5.4.2` |
+
+## 3. Estado actual del proyecto desde reportes
+
+Reportes leídos: **58**  
+Último reporte: **Report 058 (2026-05-27 22:29, feature)**
+
+### Completado ✅
+
+| Reporte | Fecha | Tipo | Archivos modificados | Resumen |
+|---|---|---|---|---|
+| 005 | 2026-05-15 01:03 | feature | `electron/handlers/files.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 006 | 2026-05-15 01:08 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 007 | 2026-05-15 01:12 | config | `vite.config.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 008 | 2026-05-15 01:39 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 10 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 009 | 2026-05-15 18:42 | feature | `postcss.config.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 010 | 2026-05-15 18:49 | config | `postcss.config.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 011 | 2026-05-15 18:56 | feature | `electron/handlers/settings.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 012 | 2026-05-15 19:04 | feature | `electron/handlers/notifications.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 013 | 2026-05-15 19:08 | feature | `src/index.css` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 014 | 2026-05-15 19:16 | feature | `src/pages/Actividades.jsx` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 015 | 2026-05-15 19:18 | feature | `src/components/ActivityCard.jsx` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 016 | 2026-05-15 19:19 | feature | `src/components/Sidebar.jsx` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 017 | 2026-05-17 22:57 | feature | `electron/handlers/cia.js` — archivo creado como parte de la base inicial<br>`electron/handlers/settings.js` — archivo actuali | Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 018 | 2026-05-17 23:50 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 019 | 2026-05-18 01:40 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 020 | 2026-05-18 01:53 | feature | `package-lock.json` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 021 | 2026-05-18 02:06 | feature | `package-lock.json` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 022 | 2026-05-20 23:11 | feature | `electron/handlers/scraper.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 023 | 2026-05-20 23:48 | feature | `electron/handlers/cia.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 024 | 2026-05-21 00:08 | feature | `src/App.jsx` — archivo actuali | Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 025 | 2026-05-21 00:14 | feature | `electron/handlers/files.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 026 | 2026-05-21 00:47 | feature | `.gitignore` — archivo actuali | Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 027 | 2026-05-21 23:23 | feature | `electron/handlers/horario.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo actuali | Se registraron 6 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 028 | 2026-05-22 00:07 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 030 | 2026-05-22 01:31 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 031 | 2026-05-22 16:32 | feature | `.local-data/horario-cache.json` — archivo creado como parte de la base inicial<br>`electron/handlers/horario.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 032 | 2026-05-22 16:59 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 033 | 2026-05-22 23:37 | refactor | `horario-debug.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 034 | 2026-05-22 23:43 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 035 | 2026-05-22 23:56 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 036 | 2026-05-23 23:53 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 037 | 2026-05-24 00:52 | feature | `horario-debug.html` — archivo creado como parte de la base inicial<br>`reports/report_033.md` — archivo creado como parte de la base inicial<br>`reports/report_034.md` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial<br>`scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial<br>`scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial<br>`src/pages/Horario.jsx` — archivo actuali | Se registraron 9 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 038 | 2026-05-24 00:57 | refactor | `README.md` — archivo creado como parte de la base inicial<br>`agents.me` — archivo creado como parte de la base inicial<br>`horario-debug.html` — archivo creado como parte de la base inicial<br>`reports/report_033.md` — archivo creado como parte de la base inicial<br>`reports/report_034.md` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial<br>`scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial<br>`scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial | Se registraron 10 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 039 | 2026-05-24 01:01 | refactor | `AGENTS.md` — archivo creado como parte de la base inicial<br>`README.md` — archivo creado como parte de la base inicial<br>`horario-debug.html` — archivo creado como parte de la base inicial<br>`reports/report_033.md` — archivo creado como parte de la base inicial<br>`reports/report_034.md` — archivo creado como parte de la base inicial<br>`reports/report_038.md` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html` — archivo creado como parte de la base inicial<br>`scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html` — archivo creado como parte de la base inicial<br>`scripts/debug-horario.js` — archivo creado como parte de la base inicial<br>`scripts/tabla-celdas-real.json` — archivo creado como parte de la base inicial<br>`scripts/tabla-horario-real.html` — archivo creado como parte de la base inicial | Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 040 | 2026-05-24 21:44 | config | `AGENTS.md` — archivo creado como parte de la base inicial<br>`README.md` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo actuali | Se registraron 13 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 041 | 2026-05-24 22:02 | fix | `AGENTS.md` — archivo creado como parte de la base inicial<br>`README.md` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo actuali | Se registraron 14 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 042 | 2026-05-24 22:26 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 043 | 2026-05-24 22:40 | refactor | `electron/handlers/horario.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 044 | 2026-05-24 23:11 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 045 | 2026-05-24 23:49 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 046 | 2026-05-25 00:01 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 047 | 2026-05-25 22:50 | config | `.gitignore` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 048 | 2026-05-25 22:59 | refactor | `generate-report.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 049 | 2026-05-25 23:32 | refactor | `AGENTS.md` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 050 | 2026-05-25 23:47 | feature | `electron/handlers/cia.js` — archivo actuali | Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 051 | 2026-05-26 17:26 | refactor | `generate-report.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 052 | 2026-05-26 17:43 | refactor | `generate-report.js` — archivo actuali | Se registraron 12 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 053 | 2026-05-26 18:00 | refactor | `generate-report.js` — archivo actuali | Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 054 | 2026-05-26 18:22 | refactor | `generate-report.js` — archivo actuali | Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 055 | 2026-05-26 22:52 | refactor | `generate-report.js` — archivo actuali | Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 056 | 2026-05-26 23:44 | refactor | `generate-report.js` — archivo actuali | Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 057 | 2026-05-26 23:55 | refactor | `generate-report.js` — archivo actuali | Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+| 058 | 2026-05-27 22:29 | feature | `electron/handlers/cia.js` — archivo actuali | Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+
+### Pendiente ⚠️
+
+| Reporte | Fecha | Tipo | Archivos modificados | Resumen |
+|---|---|---|---|---|
+| 001 | 2026-05-15 00:07 | feature | `electron/handlers/files.js` — archivo creado como parte de la base inicial<br>`electron/handlers/scraper.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo creado como parte de la base inicial<br>`electron/preload.js` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo creado como parte de la base inicial<br>`package.json` — archivo creado como parte de la base inicial<br>`src/App.jsx` — archivo creado como parte de la base inicial<br>`src/components/ResultsTable.jsx` — archivo creado como parte de la base inicial<br>`src/components/Sidebar.jsx` — archivo creado como parte de la base inicial<br>`src/components/TaskPanel.jsx` — archivo creado como parte de la base inicial<br>`src/main.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Automation.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Files.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Scraper.jsx` — archivo creado como parte de la base inicial<br>`tailwind.config.js` — archivo creado como parte de la base inicial<br>`vite.config.js` — archivo creado como parte de la base inicial | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
+| 002 | 2026-05-15 00:10 | feature | `electron/handlers/files.js` — archivo creado como parte de la base inicial<br>`electron/handlers/scraper.js` — archivo creado como parte de la base inicial<br>`electron/main.js` — archivo creado como parte de la base inicial<br>`electron/preload.js` — archivo creado como parte de la base inicial<br>`generate-report.js` — archivo creado como parte de la base inicial<br>`index.html` — archivo creado como parte de la base inicial<br>`package.json` — archivo creado como parte de la base inicial<br>`reports/report_001.md` — archivo creado como parte de la base inicial<br>`src/App.jsx` — archivo creado como parte de la base inicial<br>`src/components/ResultsTable.jsx` — archivo creado como parte de la base inicial<br>`src/components/Sidebar.jsx` — archivo creado como parte de la base inicial<br>`src/components/TaskPanel.jsx` — archivo creado como parte de la base inicial<br>`src/main.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Automation.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Files.jsx` — archivo creado como parte de la base inicial<br>`src/pages/Scraper.jsx` — archivo creado como parte de la base inicial<br>`tailwind.config.js` — archivo creado como parte de la base inicial<br>`vite.config.js` — archivo creado como parte de la base inicial | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
+| 003 | 2026-05-15 00:20 | refactor | `N/A` — no se detectaron cambios para reportar | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
+| 004 | 2026-05-15 00:57 | feature | `.gitignore` — archivo actuali | Se genero la estructura base de ScraperApp con el shell de Electron, la interfa |
+| 029 | 2026-05-22 00:54 | feature | `electron/handlers/horario.js` — archivo actuali | Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo. |
+
+## 4. Módulos y su estado
+
+| Módulo | Estado | Comentario |
+|---|---|---|
+| Actividades (iVirtual) | ✅ | Clasificación y UI activas, caché estable |
+| Horario (CIA + iVirtual links) | ⚠️ | Funcional, sensible a cambios en frames/HTML CIA |
+| Calificaciones (CIA) | ⚠️ | Funcional por PDF, susceptible a variaciones CIA |
+| Ajustes credenciales | ✅ | Persistencia dev/prod operativa |
+| Reportes v2 | ✅ | Diff por archivo + estadísticas + verificación |
+
+## 5. Bugs conocidos y pendientes
+
+### Pendientes extraídos de reportes
+
+- Report 001: Validar la direccion visual de la UI base antes de profundi
+- Report 002: Validar la direccion visual de la UI base antes de profundi
+- Report 003: Validar la direccion visual de la UI base antes de profundi
+- Report 004: Validar la direccion visual de la UI base antes de profundi
+- Report 029: Output exacto del comando de verificación:
+- Report 029: Comando:
+- Report 029: `node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { console.log('Total materias:', r.materias?.length); r.materias?.forEach(m => console.log(m.nombre.padEnd(40), m.modalidad.padEnd(12), m.meetLink ? '✅ ' + m.meetLink : '❌ sin link')); })"`
+- Report 029: Salida:
+- Report 029: `Total materias: 7`
+- Report 029: `Ingles Universitario A1                  presencial   ❌ sin link`
+- Report 029: `Precálculo                               presencial   ❌ sin link`
+- Report 029: `Sist Operativos y Arq de Comp            en_linea     ✅ https://meet.google.com/yiv-xspu-fpn`
+- Report 029: `Tutoria 2 (INSOF)                        presencial   ❌ sin link`
+- Report 029: `Programacion II c/Lab                    presencial   ❌ sin link`
+- Report 029: `Matematicas Discretas                    en_linea     ✅ https://meet.google.com/guq-ocgc-bsi`
+- Report 029: `Tecnologia y Empresa                     en_linea     ✅ https://meet.google.com/tpt-ofxq-nus`
+- Report 029: Forma de link detectada por materia en línea:
+- Report 029: `Tecnologia y Empresa` → **Forma B** (`mod/url` “Link Videollamada Google Meet”, con extracción en página intermedia).
+- Report 029: `Sist Operativos y Arq de Comp` → **Forma A** (link de Meet directo en HTML/texto del curso).
+- Report 029: `Matematicas Discretas` → **Forma A** (directo) y también disponible por **Forma B** (`mod/url`).
+- Report 029: Integridad del horario semanal:
+- Report 029: Se parseó con matri
+
+### Último reporte
+
+- Report 058: Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## 6. Frases clave activas
+
+- **“Claude, retomamos el módulo de calificaciones CIA — el bloqueo ya se quitó”**
+- **“el CIA se desbloqueó”**
+
+## 7. Estructura de carpetas y archivos principales
+
+Equivalente a `git ls-files | head -100`:
+
+```text
+.gitignore
+AGENTS.md
+README.md
+build/icon.ico
+docs/SCRAPERS.md
+docs/UI.md
+docs/WORKFLOW.md
+electron/handlers/cia.js
+electron/handlers/files.js
+electron/handlers/horario.js
+electron/handlers/notifications.js
+electron/handlers/scraper.js
+electron/handlers/settings.js
+electron/main.js
+electron/preload.js
+generate-report.js
+horario-debug.html
+index.html
+package-lock.json
+package.json
+postcss.config.js
+reports/report_001.md
+reports/report_002.md
+reports/report_003.md
+reports/report_004.md
+reports/report_005.md
+reports/report_006.md
+reports/report_007.md
+reports/report_008.md
+reports/report_009.md
+reports/report_010.md
+reports/report_011.md
+reports/report_012.md
+reports/report_013.md
+reports/report_014.md
+reports/report_015.md
+reports/report_016.md
+reports/report_017.md
+reports/report_018.md
+reports/report_019.md
+reports/report_020.md
+reports/report_021.md
+reports/report_022.md
+reports/report_023.md
+reports/report_024.md
+reports/report_025.md
+reports/report_026.md
+reports/report_027.md
+reports/report_028.md
+reports/report_029.md
+reports/report_030.md
+reports/report_031.md
+reports/report_032.md
+reports/report_033.md
+reports/report_034.md
+reports/report_035.md
+reports/report_036.md
+reports/report_037.md
+reports/report_038.md
+reports/report_039.md
+reports/report_040.md
+reports/report_041.md
+reports/report_042.md
+reports/report_043.md
+reports/report_044.md
+reports/report_045.md
+reports/report_046.md
+reports/report_047.md
+reports/report_048.md
+reports/report_049.md
+reports/report_050.md
+reports/report_051.md
+reports/report_052.md
+reports/report_053.md
+reports/report_054.md
+reports/report_055.md
+reports/report_056.md
+reports/report_057.md
+reports/report_058.md
+scripts/debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
+scripts/debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
+scripts/debug-horario.js
+scripts/generate-icon.js
+scripts/tabla-celdas-real.json
+scripts/tabla-horario-real.html
+src/App.jsx
+src/ThemeContext.jsx
+src/assets/logo-itson.png
+src/components/ActivityCard.jsx
+src/components/ColorPicker.jsx
+src/components/GradeCard.jsx
+src/components/Onboarding.jsx
+src/components/ResultsTable.jsx
+src/components/Sidebar.jsx
+src/components/TaskPanel.jsx
+src/index.css
+src/main.jsx
+src/pages/Actividades.jsx
+src/pages/Ajustes.jsx
+src/pages/Calificaciones.jsx
+```
+
+## 8. Últimos 10 commits
+
+```text
+0ec0e20 feat: calificaciones con parciales, GradeCard rediseñada y fixes de scraper
+6efe3d6 fix: color picker como ventana flotante compacta sin fondo borroso
+03e06a8 feat: color picker premium con selector, deslizadores, ajustes y paletas
+79caf8b feat: tema personalizable con color picker y cuadro de actividad urgente
+aa516f1 feat: superficies secundarias adaptativas por tema
+456716b feat: colores de estado adaptativos por tema
+c6bf3ed feat: sistema de temas visuales con 5 temas predefinidos
+7d28ef4 revert: restaurar diseño v1 desde backup
+5d2bfb2 feat: sync automático en background, TTL extendidos y botón sincronizar todo
+00c18a6 docs: documentación técnica completa para agentes IA
+```
+
+## 9. Variables de entorno requeridas
+
+No se incluyen valores secretos. Solo nombres:
+
+- `IVIRTUAL_USER` — presente en .env local
+- `IVIRTUAL_PASS` — presente en .env local
+- `CIA_USER` — presente en .env local
+- `CIA_PASS` — presente en .env local
+
+## 10. Cómo continuar
+
+### Ruta rápida para el nuevo agente
+
+1. Leer primero `AGENTS.md`, luego `docs/WORKFLOW.md`, luego este `CONTEXT.md`.
+2. Revisar el último reporte en `reports/` para entender el diff y la verificación más recientes.
+3. Ejecutar `git status --short` antes de tocar archivos.
+4. Verificar compilación con:
+
+```bash
+npm run build
+```
+
+5. Para cambios que toquen scrapers, ejecutar el comando de verificación real del módulo afectado y pegar el output en `generate-report.js`.
+6. Antes de generar reporte, actualizar en `generate-report.js`:
+   - `VERIFICATION.buildStatus`
+   - `VERIFICATION.testsRun`
+   - `VERIFICATION.verificationCmd`
+   - `VERIFICATION.verificationOutput`
+7. Ejecutar:
+
+```bash
+node generate-report.js
+```
+
+8. Solo después de revisión/verificación, hacer commit convencional.
+
+### Qué estaba en progreso al migrar
+
+- Último trabajo registrado: Report 058 — Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo..
+- Si el usuario pide continuar calificaciones: revisar `electron/handlers/cia.js`, `src/components/GradeCard.jsx` y `src/pages/Calificaciones.jsx`.
+- Si el usuario pide continuar temas/color picker: revisar `src/components/ColorPicker.jsx`, `src/ThemeContext.jsx`, `src/themes.js` y `src/pages/Ajustes.jsx`.
+
+### Workflow Claude + Codex
+
+- Claude diseña alcance, riesgos y criterios.
+- Codex implementa, verifica con datos reales, actualiza `generate-report.js`, genera reporte y commitea.
+- Usuario pasa el reporte a Claude.
+- Claude revisa y define la siguiente iteración.
+
+### Reglas que NO se deben romper
+
+- No commitear `.env`, `.local-data/`, `release/` ni `src/design-backups/`.
+- No declarar funcionalidad sin evidencia ejecutada.
+- Usar commits convencionales sin `Co-Authored-By` ni atribución de IA.
+- Mantener reportes como fuente de verdad para migraciones entre chats.
```

### `electron/handlers/cia.js`
```diff
diff --git a/electron/handlers/cia.js b/electron/handlers/cia.js
index 78e520f..303428d 100644
--- a/electron/handlers/cia.js
+++ b/electron/handlers/cia.js
@@ -133,17 +133,19 @@ async function loginToCIA(page, user, password) {
   await page.goto(CIA_ENTRY_URL, { waitUntil: 'domcontentloaded' });
   await page.locator('#txtITSONET').fill(user);
   await page.locator('#btnConexionTrayectorias').click();
-  await page.waitForTimeout(1500);
+  await page.getByRole('button', { name: 'Continuar' }).waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS }).catch(() => {});
 
   await page.getByRole('button', { name: 'Continuar' }).click();
-  await page.waitForTimeout(1500);
-
   await page.locator('#userid').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
+
   await page.locator('#userid').fill(user);
   await page.locator('#pwd').fill(password);
   await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
 
-  await page.waitForTimeout(4000);
+  await page.getByRole('link', { name: 'Autoservicio', exact: true })
+    .last()
+    .waitFor({ state: 'visible', timeout: 15_000 })
+    .catch(() => {});
 
   const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();
 
@@ -157,7 +159,13 @@ async function loginToCIA(page, user, password) {
 async function openBoletaPage(page) {
   const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();
   await autoservicioLink.click();
-  await page.waitForTimeout(8000);
+  await page.waitForFunction(
+    () =>
+      Array.from(document.querySelectorAll('iframe')).some(
+        (f) => f.src && f.src.includes('CO_EMPLOYEE_SELF_SERVICE'),
+      ),
+    { timeout: 15_000 },
+  ).catch(() => {});
 
   const navFrame = page.frames().find(
     (frame) =>
@@ -471,8 +479,32 @@ async function scrapeCIAWithPlaywright() {
     const boletaFrame = await openBoletaPage(page);
     await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_INSTITUTION', 'ITSON');
     await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_CAREER', 'LIC');
-    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_STRM', '3147');
-    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_PROG', 'INSOF');
+
+    const latestSemester = await boletaFrame.evaluate(() => {
+      const select = document.getElementById('ITSR_RUN_BOLCAL_STRM');
+      if (!select) return null;
+      const options = Array.from(select.options).filter((o) => o.value && o.value.trim() !== '');
+      return options.length > 0 ? options[options.length - 1].value : null;
+    });
+
+    if (!latestSemester) {
+      throw new Error('No se encontró un semestre disponible en el formulario de boleta.');
+    }
+
+    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_STRM', latestSemester);
+
+    const academicProgram = await boletaFrame.evaluate(() => {
+      const select = document.getElementById('ITSR_RUN_BOLCAL_ACAD_PROG');
+      if (!select) return null;
+      const options = Array.from(select.options).filter((o) => o.value && o.value.trim() !== '');
+      return options.length > 0 ? options[options.length - 1].value : null;
+    });
+
+    if (!academicProgram) {
+      throw new Error('No se encontró un programa académico en el formulario de boleta.');
+    }
+
+    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_PROG', academicProgram);
     await boletaFrame.locator('#ITSRDERIVBOLCAL_PUSH').click();
 
     let reportFrame = null;
@@ -486,7 +518,7 @@ async function scrapeCIAWithPlaywright() {
       }
 
       reportFrame = null;
-      await page.waitForTimeout(5000);
+      await page.waitForTimeout(3000);
     }
 
     if (!reportFrame) {
@@ -495,7 +527,7 @@ async function scrapeCIAWithPlaywright() {
 
     const detLink = reportFrame.locator('a[href*="CDM_WRK_INDEX_BTN"]').first();
     await detLink.click({ force: true });
-    await page.waitForTimeout(5000);
+    await page.waitForTimeout(3000);
 
     const detailFrame = await waitForFrameText(page, /Detalle Informe/i);
     const pdfHref = await detailFrame
```

### `electron/handlers/files.js`
```diff
diff --git a/electron/handlers/files.js b/electron/handlers/files.js
index dc8180d..9aae8cf 100644
--- a/electron/handlers/files.js
+++ b/electron/handlers/files.js
@@ -2,6 +2,12 @@ const fs = require('fs');
 const path = require('path');
 const { app, ipcMain, session, shell } = require('electron');
 
+const SAFE_OPEN_EXTENSIONS = new Set([
+  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
+  '.txt', '.rtf', '.csv', '.png', '.jpg', '.jpeg', '.gif',
+  '.bmp', '.svg', '.webp', '.mp4', '.mp3', '.wav', '.ogg',
+]);
+
 function sanitizeFileName(name) {
   const sanitized = (name || '')
     .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
@@ -70,8 +76,17 @@ function downloadFileWithSession(url, name) {
     };
 
     const handleWillDownload = (_event, item) => {
-      if (item.getURL() !== url) {
-        return;
+      const itemUrl = item.getURL();
+      if (itemUrl !== url) {
+        try {
+          const originalHost = new URL(url).hostname;
+          const itemHost = new URL(itemUrl).hostname;
+          if (originalHost !== itemHost) {
+            return;
+          }
+        } catch (_urlError) {
+          return;
+        }
       }
 
       item.setSavePath(targetPath);
@@ -81,11 +96,17 @@ function downloadFileWithSession(url, name) {
           return;
         }
 
-        const openError = await shell.openPath(targetPath);
+        const ext = path.extname(targetPath).toLowerCase();
 
-        if (openError) {
-          finish({ success: false, error: openError });
-          return;
+        if (SAFE_OPEN_EXTENSIONS.has(ext)) {
+          const openError = await shell.openPath(targetPath);
+
+          if (openError) {
+            finish({ success: false, error: openError });
+            return;
+          }
+        } else {
+          shell.showItemInFolder(targetPath);
         }
 
         finish({ success: true, path: targetPath });
```

### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 964162b..324cba9 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -2093,51 +2093,7 @@ async function findMeetLinkInCourse(page, courseUrl) {
       }
     }
 
-    const forumDiscussions = await page
-      .evaluate(() =>
-        Array.from(document.querySelectorAll('a[href*="/mod/forum/view.php"]'))
-          .map((anchor) => anchor.href)
-          .slice(0, 2),
-      )
-      .catch(() => []);
-
-    for (const forumUrl of forumDiscussions) {
-      if (!consumeResourceBudget()) {
-        break;
-      }
-
-      try {
-        await gotoWithRetry(detailPage, forumUrl, {
-          waitUntil: 'domcontentloaded',
-          timeout: 12_000,
-        });
-
-        const discussions = await detailPage
-          .evaluate(() =>
-            Array.from(document.querySelectorAll('a[href*="/mod/forum/discuss.php"]'))
-              .map((anchor) => anchor.href)
-              .slice(0, 3),
-          )
-          .catch(() => []);
-
-        for (const discussionUrl of discussions) {
-          if (!consumeResourceBudget()) {
-            break;
-          }
-
-          const link = await extractLinkFromPage(detailPage, discussionUrl, {
-            timeout: 10_000,
-            courseOrigin,
-          });
-
-          if (link) {
-            return { link, layer: 'CAPA_7_FORUM_THREADS' };
-          }
-        }
-      } catch (_error) {
-        // Continue with next forum.
-      }
-    }
+    // CAPA_7 removed: duplicate of CAPA_4 forum scan above.
 
     const bookResources = await page
       .evaluate(() =>
@@ -2150,7 +2106,7 @@ async function findMeetLinkInCourse(page, courseUrl) {
             (resource) =>
               /remoto|clase|meet|zoom|teams|enlace|liga|acceso|sesi[oó]n|videollamada/i.test(
                 resource.text,
-              ) || true,
+              ),
           )
           .map((resource) => resource.href)
           .slice(0, 3),
@@ -2418,7 +2374,7 @@ function computeDaysWithClasses(materias) {
   return ordered;
 }
 
-async function scrapeHorario() {
+async function scrapeHorario(controller = {}) {
   const ciaUser = process.env.CIA_USER?.trim();
   const ciaPass = process.env.CIA_PASS?.trim();
 
@@ -2430,6 +2386,7 @@ async function scrapeHorario() {
   const ivirtualPass = process.env.IVIRTUAL_PASS?.trim();
 
   const browser = await chromium.launch({ headless: true });
+  controller.browser = browser;
 
   try {
     const context = await browser.newContext();
@@ -2529,7 +2486,13 @@ async function diagnosticarCIA(page) {
   }
 }
 
+let activeHorarioController = null;
+
 async function getHorarioWithCache() {
+  if (activeHorarioController) {
+    return { error: 'Ya hay un escaneo de horario en progreso. Espera a que termine.' };
+  }
+
   const cached = readHorarioCache();
 
   if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
@@ -2539,33 +2502,45 @@ async function getHorarioWithCache() {
     };
   }
 
-  let timeoutId;
-  const timeoutPromise = new Promise((resolve) => {
-    timeoutId = setTimeout(
-      () =>
-        resolve(
-          buildHorarioError('El escaneo del horario tardó demasiado. Intenta de nuevo.'),
-        ),
-      GLOBAL_TIMEOUT_MS,
-    );
-  });
+  const controller = { cancelled: false, browser: null };
+  activeHorarioController = controller;
 
-  const scrapePromise = Promise.resolve(scrapeHorario()).finally(() => {
-    clearTimeout(timeoutId);
-  });
+  try {
+    let timeoutId;
+    const timeoutPromise = new Promise((resolve) => {
+      timeoutId = setTimeout(
+        async () => {
+          controller.cancelled = true;
+          if (controller.browser) {
+            await controller.browser.close().catch(() => {});
+          }
+          resolve(
+            buildHorarioError('El escaneo del horario tardó demasiado. Intenta de nuevo.'),
+          );
+        },
+        GLOBAL_TIMEOUT_MS,
+      );
+    });
 
-  const result = await Promise.race([scrapePromise, timeoutPromise]);
+    const scrapePromise = Promise.resolve(scrapeHorario(controller)).finally(() => {
+      clearTimeout(timeoutId);
+    });
 
-  if (result?.error) {
-    return result;
-  }
+    const result = await Promise.race([scrapePromise, timeoutPromise]);
 
-  const cachedPayload = writeHorarioCache(result);
+    if (result?.error) {
+      return result;
+    }
 
-  return {
-    ...applyManualLinks(cachedPayload),
-    fromCache: false,
-  };
+    const cachedPayload = writeHorarioCache(result);
+
+    return {
+      ...applyManualLinks(cachedPayload),
+      fromCache: false,
+    };
+  } finally {
+    activeHorarioController = null;
+  }
 }
 
 function registerHorarioHandlers() {
```

### `electron/handlers/notifications.js`
```diff
diff --git a/electron/handlers/notifications.js b/electron/handlers/notifications.js
index b306dec..61eea9a 100644
--- a/electron/handlers/notifications.js
+++ b/electron/handlers/notifications.js
@@ -1,5 +1,12 @@
 const DAY_MS = 24 * 60 * 60 * 1000;
 
+const SPANISH_MONTHS = {
+  enero: 'January', febrero: 'February', marzo: 'March',
+  abril: 'April', mayo: 'May', junio: 'June',
+  julio: 'July', agosto: 'August', septiembre: 'September',
+  octubre: 'October', noviembre: 'November', diciembre: 'December',
+};
+
 function getElectron() {
   return require('electron');
 }
@@ -9,7 +16,13 @@ function parseDueDate(value) {
     return null;
   }
 
-  const parsed = Date.parse(value);
+  let normalized = value.replace(/\s+/g, ' ').trim();
+
+  for (const [es, en] of Object.entries(SPANISH_MONTHS)) {
+    normalized = normalized.replace(new RegExp(es, 'gi'), en);
+  }
+
+  const parsed = Date.parse(normalized);
   return Number.isNaN(parsed) ? null : parsed;
 }
```

### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 096c5bc..6ce8a1d 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -13,7 +13,7 @@ const ACTIVITY_NAVIGATION_TIMEOUT_MS = 20_000;
 const CHUNK_TIMEOUT_MS = 25_000;
 const GLOBAL_SCRAPE_TIMEOUT_MS = 5 * 60 * 1000;
 const CHUNK_SIZE = 3;
-const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);
+const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
 
 function mapSameSite(sameSite) {
   if (sameSite === 'Strict') {
@@ -171,6 +171,7 @@ function withTimeout(taskFactory, timeoutMs, onTimeout) {
             return;
           }
 
+          console.error('[withTimeout] Assignment detail error:', error?.message || error);
           resolve(null);
         },
       );
@@ -248,12 +249,25 @@ function buildScrapeError(message) {
   return { error: message };
 }
 
+const SPANISH_MONTHS = {
+  enero: 'January', febrero: 'February', marzo: 'March',
+  abril: 'April', mayo: 'May', junio: 'June',
+  julio: 'July', agosto: 'August', septiembre: 'September',
+  octubre: 'October', noviembre: 'November', diciembre: 'December',
+};
+
 function parseDueDate(value) {
   if (!value) {
     return null;
   }
 
-  const parsed = Date.parse(value.replace(/\s+/g, ' ').trim());
+  let normalized = value.replace(/\s+/g, ' ').trim();
+
+  for (const [es, en] of Object.entries(SPANISH_MONTHS)) {
+    normalized = normalized.replace(new RegExp(es, 'gi'), en);
+  }
+
+  const parsed = Date.parse(normalized);
   return Number.isNaN(parsed) ? null : new Date(parsed);
 }
 
@@ -305,7 +319,7 @@ async function loginToIVirtual(page, username, password) {
   const currentUrl = page.url();
 
   if (currentUrl.includes('/login/')) {
-    return buildScrapeError('SESSION_EXPIRED');
+    return buildScrapeError('LOGIN_FAILED');
   }
 
   return null;
@@ -646,7 +660,7 @@ async function syncCookiesToElectronSession(playwrightContext) {
   );
 }
 
-async function scrapeIVirtualActivities(event) {
+async function scrapeIVirtualActivities(event, controller = {}) {
   const username = process.env.IVIRTUAL_USER?.trim();
   const password = process.env.IVIRTUAL_PASS?.trim();
 
@@ -666,6 +680,7 @@ async function scrapeIVirtualActivities(event) {
 
   try {
     browser = await chromium.launch({ headless: true });
+    controller.browser = browser;
     const context = await browser.newContext();
     context.setDefaultTimeout(PAGE_TIMEOUT_MS);
     const page = await context.newPage();
@@ -736,6 +751,7 @@ async function scrapeIVirtualActivities(event) {
                       url: assignment.url,
                     };
                   } catch (_error) {
+                    console.error('[scraper] Failed to collect details for:', assignment.url, _error?.message);
                     return null;
                   }
                 },
@@ -800,7 +816,13 @@ async function scrapeIVirtualActivities(event) {
   }
 }
 
+let activeScrapeController = null;
+
 async function getActivitiesWithCache(event) {
+  if (activeScrapeController) {
+    return { error: 'Ya hay un escaneo en progreso. Espera a que termine.' };
+  }
+
   const cached = readActivitiesCache();
 
   if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
@@ -811,24 +833,36 @@ async function getActivitiesWithCache(event) {
     };
   }
 
-  let timeoutId;
-  const timeoutPromise = new Promise((resolve) => {
-    timeoutId = setTimeout(
-      () =>
-        resolve(
-          buildScrapeError(
-            'El escaneo tardó demasiado. iVirtual puede estar lento. Intenta de nuevo.',
-          ),
-        ),
-      GLOBAL_SCRAPE_TIMEOUT_MS,
-    );
-  });
+  const controller = { cancelled: false, browser: null };
+  activeScrapeController = controller;
 
-  const scrapePromise = Promise.resolve(scrapeIVirtualActivities(event)).finally(() => {
-    clearTimeout(timeoutId);
-  });
+  try {
+    let timeoutId;
+    const timeoutPromise = new Promise((resolve) => {
+      timeoutId = setTimeout(
+        async () => {
+          controller.cancelled = true;
+          if (controller.browser) {
+            await controller.browser.close().catch(() => {});
+          }
+          resolve(
+            buildScrapeError(
+              'El escaneo tardó demasiado. iVirtual puede estar lento. Intenta de nuevo.',
+            ),
+          );
+        },
+        GLOBAL_SCRAPE_TIMEOUT_MS,
+      );
+    });
+
+    const scrapePromise = Promise.resolve(scrapeIVirtualActivities(event, controller)).finally(() => {
+      clearTimeout(timeoutId);
+    });
 
-  return Promise.race([scrapePromise, timeoutPromise]);
+    return await Promise.race([scrapePromise, timeoutPromise]);
+  } finally {
+    activeScrapeController = null;
+  }
 }
 
 function registerScraperHandlers() {
```

### `electron/handlers/settings.js`
```diff
diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
index c79cf6c..6b331e2 100644
--- a/electron/handlers/settings.js
+++ b/electron/handlers/settings.js
@@ -43,9 +43,9 @@ function upsertEnvValue(lines, key, value) {
 function saveSettings({ user, password, ciaUser, ciaPassword }) {
   try {
     const normalizedUser = typeof user === 'string' ? user.trim() : '';
-    const normalizedPassword = typeof password === 'string' ? password : '';
+    const normalizedPassword = typeof password === 'string' ? password.trim() : '';
     const normalizedCIAUser = typeof ciaUser === 'string' ? ciaUser.trim() : '';
-    const normalizedCIAPassword = typeof ciaPassword === 'string' ? ciaPassword : '';
+    const normalizedCIAPassword = typeof ciaPassword === 'string' ? ciaPassword.trim() : '';
 
     if (!normalizedUser) {
       return { success: false, error: 'El ID de usuario es requerido.' };
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 5e49875..05a306d 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -12,7 +12,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
   getSettings: () => ipcRenderer.invoke('settings:get'),
   saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
   checkNotifications: (activities) => ipcRenderer.invoke('notifications:check', activities),
-  onProgress: (callback) => ipcRenderer.on('scraper:progress', (_event, data) => callback(data)),
+  onProgress: (callback) => {
+      ipcRenderer.removeAllListeners('scraper:progress');
+      ipcRenderer.on('scraper:progress', (_event, data) => callback(data));
+    },
   removeProgress: () => ipcRenderer.removeAllListeners('scraper:progress'),
   downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
   inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
```

### `scripts/generate-context.js`
```diff
diff --git a/scripts/generate-context.js b/scripts/generate-context.js
new file mode 100644
index 0000000..ef9bfd4
--- /dev/null
+++ b/scripts/generate-context.js
@@ -0,0 +1,354 @@
+const fs = require('fs');
+const path = require('path');
+const { execSync } = require('child_process');
+
+const rootDir = path.resolve(__dirname, '..');
+const contextPath = path.join(rootDir, 'CONTEXT.md');
+const reportsDir = path.join(rootDir, 'reports');
+
+const REQUIRED_ENV_VARS = ['IVIRTUAL_USER', 'IVIRTUAL_PASS', 'CIA_USER', 'CIA_PASS'];
+
+function readFile(relativePath, fallback = '') {
+  const filePath = path.join(rootDir, relativePath);
+
+  try {
+    return fs.readFileSync(filePath, 'utf8');
+  } catch (_error) {
+    return fallback;
+  }
+}
+
+function run(command, fallback = '') {
+  try {
+    return execSync(command, {
+      cwd: rootDir,
+      encoding: 'utf8',
+      stdio: ['ignore', 'pipe', 'pipe'],
+      maxBuffer: 20 * 1024 * 1024,
+    }).trim();
+  } catch (_error) {
+    return fallback;
+  }
+}
+
+function stripMarkdownNoise(value = '') {
+  return value
+    .replace(/\r/g, '')
+    .replace(/[ \t]+\n/g, '\n')
+    .trim();
+}
+
+function extractSection(markdown, heading) {
+  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
+  const pattern = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`, 'mi');
+  const match = markdown.match(pattern);
+  return stripMarkdownNoise(match?.[1] || '');
+}
+
+function takeParagraphs(value, maxParagraphs = 3) {
+  return stripMarkdownNoise(value)
+    .split(/\n{2,}/)
+    .map((item) => item.trim())
+    .filter(Boolean)
+    .slice(0, maxParagraphs)
+    .join('\n\n');
+}
+
+function parsePackageJson() {
+  try {
+    return JSON.parse(readFile('package.json', '{}'));
+  } catch (_error) {
+    return {};
+  }
+}
+
+function formatDependencies(title, dependencies = {}) {
+  const entries = Object.entries(dependencies);
+
+  if (entries.length === 0) {
+    return `### ${title}\n\n_No registradas._`;
+  }
+
+  const rows = entries
+    .sort(([a], [b]) => a.localeCompare(b))
+    .map(([name, version]) => `| \`${name}\` | \`${version}\` |`)
+    .join('\n');
+
+  return `### ${title}\n\n| Paquete | Versión |\n|---|---|\n${rows}`;
+}
+
+function getReportFiles() {
+  if (!fs.existsSync(reportsDir)) {
+    return [];
+  }
+
+  return fs
+    .readdirSync(reportsDir)
+    .filter((file) => /^report_\d+\.md$/i.test(file))
+    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
+}
+
+function extractBlock(markdown, heading) {
+  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
+  const pattern = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`, 'mi');
+  const match = markdown.match(pattern);
+  return stripMarkdownNoise(match?.[1] || '');
+}
+
+function parseReport(fileName) {
+  const markdown = readFile(path.join('reports', fileName));
+  const number = fileName.match(/report_(\d+)\.md/i)?.[1] || '???';
+  const date = markdown.match(/\*\*Fecha:\*\*\s*(.+)/)?.[1]?.trim() || 'sin fecha';
+  const type = markdown.match(/\*\*Tipo:\*\*\s*(.+)/)?.[1]?.trim() || 'sin tipo';
+  const filesBlock = extractBlock(markdown, 'Archivos modificados');
+  const summary = takeParagraphs(extractBlock(markdown, 'Resumen'), 1) || 'Sin resumen disponible.';
+  const pendingBlock = extractBlock(markdown, 'Pendiente para Claude');
+  const modifiedFiles = filesBlock
+    .split('\n')
+    .map((line) => line.trim())
+    .filter((line) => line.startsWith('- '))
+    .map((line) => line.replace(/^- /, '').trim());
+  const pendingItems = pendingBlock
+    .split('\n')
+    .map((line) => line.trim())
+    .filter((line) => line.startsWith('- '))
+    .map((line) => line.replace(/^- /, '').trim())
+    .filter((line) => !/sin pendientes/i.test(line));
+
+  return {
+    number,
+    date,
+    type,
+    modifiedFiles,
+    summary,
+    pendingItems,
+    status: pendingItems.length > 0 ? 'pendiente' : 'completado',
+  };
+}
+
+function formatReportTable(title, reports) {
+  if (reports.length === 0) {
+    return `### ${title}\n\n_No hay reportes en esta categoría._`;
+  }
+
+  const rows = reports
+    .map((report) => {
+      const files = report.modifiedFiles.length > 0
+        ? report.modifiedFiles.map((file) => file.replace(/\|/g, '\\|')).join('<br>')
+        : 'Sin archivos registrados';
+      return `| ${report.number} | ${report.date} | ${report.type} | ${files} | ${report.summary.replace(/\n/g, ' ').replace(/\|/g, '\\|')} |`;
+    })
+    .join('\n');
+
+  return `### ${title}\n\n| Reporte | Fecha | Tipo | Archivos modificados | Resumen |\n|---|---|---|---|---|\n${rows}`;
+}
+
+function extractModuleStatus(workflowMd) {
+  const statusSection = extractSection(workflowMd, 'Estado actual del proyecto (snapshot)');
+  const tableLines = statusSection
+    .split('\n')
+    .filter((line) => line.trim().startsWith('|'));
+
+  return tableLines.length > 0
+    ? tableLines.join('\n')
+    : '_No se encontró tabla de estado en docs/WORKFLOW.md._';
+}
+
+function extractKeyPhrases(workflowMd) {
+  const section = extractSection(workflowMd, 'Frases clave activas (operación)');
+  const phrases = section
+    .split('\n')
+    .map((line) => line.trim())
+    .filter((line) => line.startsWith('- **'));
+
+  return phrases.length > 0 ? phrases.join('\n') : '_No se encontraron frases clave activas._';
+}
+
+function getGitFilesTree() {
+  const files = run('git ls-files', '')
+    .split('\n')
+    .map((line) => line.trim())
+    .filter(Boolean)
+    .slice(0, 100);
+
+  if (files.length === 0) {
+    return '_No se pudo leer `git ls-files`._';
+  }
+
+  return ['```text', ...files, '```'].join('\n');
+}
+
+function getRecentCommits() {
+  const commits = run('git log --oneline -10', '');
+
+  if (!commits) {
+    return '_No se pudo leer el historial de commits._';
+  }
+
+  return ['```text', commits, '```'].join('\n');
+}
+
+function getEnvVariables() {
+  const envText = readFile('.env', '');
+  const presentKeys = new Set(
+    envText
+      .split('\n')
+      .map((line) => line.trim())
+      .filter((line) => line && !line.startsWith('#') && line.includes('='))
+      .map((line) => line.split('=')[0].trim()),
+  );
+
+  return REQUIRED_ENV_VARS
+    .map((key) => `- \`${key}\`${presentKeys.has(key) ? ' — presente en .env local' : ' — requerido'}`)
+    .join('\n');
+}
+
+function getPendingSummary(reports) {
+  const items = reports.flatMap((report) =>
+    report.pendingItems.map((item) => `- Report ${report.number}: ${item}`),
+  );
+
+  if (items.length === 0) {
+    return '- Sin pendientes explícitos en las secciones "Pendiente para Claude" de los reportes.';
+  }
+
+  return [...new Set(items)].join('\n');
+}
+
+function buildContext() {
+  const agentsMd = readFile('AGENTS.md');
+  const scrapersMd = readFile(path.join('docs', 'SCRAPERS.md'));
+  const workflowMd = readFile(path.join('docs', 'WORKFLOW.md'));
+  const packageJson = parsePackageJson();
+  const reports = getReportFiles().map(parseReport);
+  const completedReports = reports.filter((report) => report.status === 'completado');
+  const pendingReports = reports.filter((report) => report.status === 'pendiente');
+  const latestReport = reports.at(-1);
+
+  const projectSummary = [
+    takeParagraphs(agentsMd.split('---')[0], 3),
+    '### Resumen de scrapers',
+    takeParagraphs(scrapersMd, 2),
+  ]
+    .filter(Boolean)
+    .join('\n\n');
+
+  return `# CONTEXT.md — Migración de chat ScraperApp
+
+Este archivo fue generado automáticamente por \`scripts/generate-context.js\` para que un agente nuevo pueda retomar ScraperApp sin reconstruir el contexto desde cero.
+
+> Última generación: ${new Date().toISOString()}
+
+## 1. Descripción del proyecto
+
+${projectSummary}
+
+## 2. Stack tecnológico completo
+
+**Proyecto:** \`${packageJson.name || 'scraper-app'}\`  
+**Versión:** \`${packageJson.version || 'sin versión'}\`  
+**Entry Electron:** \`${packageJson.main || 'electron/main.js'}\`
+
+${formatDependencies('Dependencias runtime', packageJson.dependencies)}
+
+${formatDependencies('Dependencias de desarrollo', packageJson.devDependencies)}
+
+## 3. Estado actual del proyecto desde reportes
+
+Reportes leídos: **${reports.length}**  
+Último reporte: **${latestReport ? `Report ${latestReport.number} (${latestReport.date}, ${latestReport.type})` : 'no disponible'}**
+
+${formatReportTable('Completado ✅', completedReports)}
+
+${formatReportTable('Pendiente ⚠️', pendingReports)}
+
+## 4. Módulos y su estado
+
+${extractModuleStatus(workflowMd)}
+
+## 5. Bugs conocidos y pendientes
+
+### Pendientes extraídos de reportes
+
+${getPendingSummary(reports)}
+
+### Último reporte
+
+${latestReport ? `- Report ${latestReport.number}: ${latestReport.summary}` : '- No hay reportes.'}
+
+## 6. Frases clave activas
+
+${extractKeyPhrases(workflowMd)}
+
+## 7. Estructura de carpetas y archivos principales
+
+Equivalente a \`git ls-files | head -100\`:
+
+${getGitFilesTree()}
+
+## 8. Últimos 10 commits
+
+${getRecentCommits()}
+
+## 9. Variables de entorno requeridas
+
+No se incluyen valores secretos. Solo nombres:
+
+${getEnvVariables()}
+
+## 10. Cómo continuar
+
+### Ruta rápida para el nuevo agente
+
+1. Leer primero \`AGENTS.md\`, luego \`docs/WORKFLOW.md\`, luego este \`CONTEXT.md\`.
+2. Revisar el último reporte en \`reports/\` para entender el diff y la verificación más recientes.
+3. Ejecutar \`git status --short\` antes de tocar archivos.
+4. Verificar compilación con:
+
+\`\`\`bash
+npm run build
+\`\`\`
+
+5. Para cambios que toquen scrapers, ejecutar el comando de verificación real del módulo afectado y pegar el output en \`generate-report.js\`.
+6. Antes de generar reporte, actualizar en \`generate-report.js\`:
+   - \`VERIFICATION.buildStatus\`
+   - \`VERIFICATION.testsRun\`
+   - \`VERIFICATION.verificationCmd\`
+   - \`VERIFICATION.verificationOutput\`
+7. Ejecutar:
+
+\`\`\`bash
+node generate-report.js
+\`\`\`
+
+8. Solo después de revisión/verificación, hacer commit convencional.
+
+### Qué estaba en progreso al migrar
+
+- Último trabajo registrado: ${latestReport ? `Report ${latestReport.number} — ${latestReport.summary}` : 'sin reporte reciente'}.
+- Si el usuario pide continuar calificaciones: revisar \`electron/handlers/cia.js\`, \`src/components/GradeCard.jsx\` y \`src/pages/Calificaciones.jsx\`.
+- Si el usuario pide continuar temas/color picker: revisar \`src/components/ColorPicker.jsx\`, \`src/ThemeContext.jsx\`, \`src/themes.js\` y \`src/pages/Ajustes.jsx\`.
+
+### Workflow Claude + Codex
+
+- Claude diseña alcance, riesgos y criterios.
+- Codex implementa, verifica con datos reales, actualiza \`generate-report.js\`, genera reporte y commitea.
+- Usuario pasa el reporte a Claude.
+- Claude revisa y define la siguiente iteración.
+
+### Reglas que NO se deben romper
+
+- No commitear \`.env\`, \`.local-data/\`, \`release/\` ni \`src/design-backups/\`.
+- No declarar funcionalidad sin evidencia ejecutada.
+- Usar commits convencionales sin \`Co-Authored-By\` ni atribución de IA.
+- Mantener reportes como fuente de verdad para migraciones entre chats.
+`;
+}
+
+function main() {
+  const context = buildContext();
+  fs.writeFileSync(contextPath, context, 'utf8');
+  console.log('✅ CONTEXT.md generado — listo para migrar al nuevo chat');
+}
+
+main();
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 533b190..5ed15c9 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,4 +1,4 @@
-import { useEffect, useRef, useState } from 'react';
+import { useCallback, useEffect, useRef, useState } from 'react';
 import Sidebar from './components/Sidebar';
 import Onboarding from './components/Onboarding';
 import TaskPanel from './components/TaskPanel';
@@ -101,6 +101,8 @@ function App() {
       NO_PASSWORD: 'Falta tu contraseña en la configuración. Ve a Ajustes.',
       SESSION_EXPIRED:
         'Tu sesión de iVirtual expiró o las credenciales son incorrectas. Ve a Ajustes y verifica tu contraseña.',
+      LOGIN_FAILED:
+        'No fue posible iniciar sesión en iVirtual. Verifica tus credenciales en Ajustes.',
       NO_INTERNET: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.',
       CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
       CIA_NO_USER: 'Falta tu usuario del CIA en la configuración. Ve a Ajustes.',
@@ -568,9 +570,7 @@ function App() {
               loading={loading}
               onSettingsSaved={refreshSettings}
               onSync={handleSyncActivities}
-              onSyncHorario={({ clearCacheFirst = false } = {}) =>
-                loadHorario({ clearCacheFirst })
-              }
+              onSyncHorario={loadHorario}
               onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
               onNavigate={handleNavigate}
               progress={progress}
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index fe58e03..409a9e6 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -200,17 +200,20 @@ function Actividades({
     retrasada: activities.filter((item) => item.estado === 'retrasada').length,
     cerrada: activities.filter((item) => item.estado === 'cerrada').length,
   };
-  const tabActivities = activities.filter((item) => item.estado === activeTab);
-  const normalizedQuery = searchQuery.trim().toLowerCase();
-  const filteredActivities = tabActivities.filter((item) => {
-    if (!normalizedQuery) {
-      return true;
+  const filteredActivities = useMemo(() => {
+    const tabActs = activities.filter((item) => item.estado === activeTab);
+    const query = searchQuery.trim().toLowerCase();
+
+    if (!query) {
+      return tabActs;
     }
 
-    return [item.nombre, item.materia].some((field) =>
-      (field || '').toLowerCase().includes(normalizedQuery),
-      );
-  });
+    return tabActs.filter((item) =>
+      [item.nombre, item.materia].some((field) =>
+        (field || '').toLowerCase().includes(query),
+      ),
+    );
+  }, [activities, activeTab, searchQuery]);
   const urgentInfo = useMemo(() => getUrgentActivity(activities), [activities]);
   const sortedActivities = useMemo(() => {
     const items = [...filteredActivities];
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** Comando obligatorio de CIA + npm run build
**Comando de verificación:** node -e "require('dotenv').config(); const c=require('./electron/handlers/cia'); c.clearCIACache(); c.getCalificacionesWithCache().then(r => { r.materias?.forEach(m => console.log(m.nombre, '|', m.codigo, '|', m.profesor, '|', JSON.stringify(m.calificaciones), '|', m.promedio)); console.log('Total:', r.materias?.length); })"
**Output de verificación:**
```
◇ injected env (5) from .env // tip: ⌁ auth for agents [www.vestauth.com]
Precálculo | 1165M |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":6,"sobre":10}] | 6
Ingles Universitario A1 | 1043D |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":7,"sobre":10}] | 7
Sist Operativos y Arq de Comp | 1123C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
Matematicas Discretas | 1178M |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":7,"sobre":10}] | 7
Programacion II c/Lab | 1124C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
Tecnologia y Empresa | 1115C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
Tutoria 2 (INSOF) | 1132T |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":null,"sobre":10}] | null
Total: 7

> scraper-app@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1766 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                      0.41 kB │ gzip:  0.27 kB
dist/assets/logo-itson-GKrD7IS7.png  37.09 kB
dist/assets/index-ByOxmHud.css       28.90 kB │ gzip:  6.24 kB
dist/assets/index-C9dellb7.js        278.47 kB │ gzip: 77.13 kB
✓ built in 9.76s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
