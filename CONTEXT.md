# CONTEXT.md — DVPotro

> Archivo de contexto para migrar el proyecto sin perder decisiones, estado ni pendientes.
>
> Generado automáticamente por `scripts/generate-context.js`.

## 1. Descripción del proyecto

**Nombre oficial:** DVPotro (antes ScraperApp)

**Qué hace y para quién:**

- App de escritorio Electron + React para estudiantes ITSON.

- Unifica iVirtual y CIA para revisar actividades, horario, calificaciones, adjuntos y enlaces de videollamada.

- Reduce el salto manual entre portales y la consolidación manual de información académica.

**Resumen del stack:** Electron (shell de escritorio), React + Vite (renderer), Tailwind CSS v3, Playwright, dotenv, electron-builder, electron-updater.



**Lectura rápida desde README.md:** DVPotro es una aplicación de escritorio para estudiantes ITSON que unifica, en una sola interfaz, la información académica que normalmente está separada entre **iVirtual** y **CIA**.

## 2. Stack tecnológico completo

**Nombre:** `dvpotro`  
**Versión:** `0.1.0`  
**Descripción:** DVPotro desktop academic tracker for ITSON portals.  
**Entry principal:** `electron/main.js`

### Dependencias principales

| Paquete | Versión |
| --- | --- |
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
| --- | --- |
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

### Scripts disponibles

| Script | Comando |
| --- | --- |
| `dev` | `vite` |
| `build` | `vite build` |
| `electron` | `electron .` |
| `start` | `concurrently "npm run dev" "npm run electron"` |
| `preview` | `vite preview` |
| `report` | `node generate-report.js` |
| `dist` | `vite build && electron-builder` |
| `dist:dir` | `vite build && electron-builder --dir` |

## 3. Estado actual — historial de reportes

**Reportes procesados:** 70  
**Último reporte:** Report 070 — 2026-06-02 15:15 — refactor

### ✅ Completados

#### Historial compacto (reportes 001–059)

| # | Fecha | Qué se hizo |
|---|---|---|
| 001 | 2026-05-15 00:07 | Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de |
| 002 | 2026-05-15 00:10 | Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de |
| 003 | 2026-05-15 00:20 | Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de |
| 004 | 2026-05-15 00:57 | Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de |
| 005 | 2026-05-15 01:03 | Sin resumen |
| 006 | 2026-05-15 01:08 | Sin resumen |
| 007 | 2026-05-15 01:12 | Sin resumen |
| 008 | 2026-05-15 01:39 | Sin resumen |
| 009 | 2026-05-15 18:42 | Sin resumen |
| 010 | 2026-05-15 18:49 | Sin resumen |
| 011 | 2026-05-15 18:56 | Sin resumen |
| 012 | 2026-05-15 19:04 | Sin resumen |
| 013 | 2026-05-15 19:08 | Sin resumen |
| 014 | 2026-05-15 19:16 | Sin resumen |
| 015 | 2026-05-15 19:18 | Sin resumen |
| 016 | 2026-05-15 19:19 | Sin resumen |
| 017 | 2026-05-17 22:57 | Sin resumen |
| 018 | 2026-05-17 23:50 | Sin resumen |
| 019 | 2026-05-18 01:40 | Sin resumen |
| 020 | 2026-05-18 01:53 | Sin resumen |
| 021 | 2026-05-18 02:06 | Sin resumen |
| 022 | 2026-05-20 23:11 | Sin resumen |
| 023 | 2026-05-20 23:48 | Sin resumen |
| 024 | 2026-05-21 00:08 | Sin resumen |
| 025 | 2026-05-21 00:14 | Sin resumen |
| 026 | 2026-05-21 00:47 | Sin resumen |
| 027 | 2026-05-21 23:23 | Sin resumen |
| 028 | 2026-05-22 00:07 | Sin resumen |
| 029 | 2026-05-22 00:54 | Sin resumen |
| 030 | 2026-05-22 01:31 | Sin resumen |
| 031 | 2026-05-22 16:32 | Sin resumen |
| 032 | 2026-05-22 16:59 | Sin resumen |
| 033 | 2026-05-22 23:37 | Sin resumen |
| 034 | 2026-05-22 23:43 | Sin resumen |
| 035 | 2026-05-22 23:56 | Sin resumen |
| 036 | 2026-05-23 23:53 | Sin resumen |
| 037 | 2026-05-24 00:52 | Sin resumen |
| 038 | 2026-05-24 00:57 | Sin resumen |
| 039 | 2026-05-24 01:01 | Sin resumen |
| 040 | 2026-05-24 21:44 | Sin resumen |
| 041 | 2026-05-24 22:02 | Sin resumen |
| 042 | 2026-05-24 22:26 | Sin resumen |
| 043 | 2026-05-24 22:40 | Sin resumen |
| 044 | 2026-05-24 23:11 | Sin resumen |
| 045 | 2026-05-24 23:49 | Sin resumen |
| 046 | 2026-05-25 00:01 | Sin resumen |
| 047 | 2026-05-25 22:50 | Sin resumen |
| 048 | 2026-05-25 22:59 | Sin resumen |
| 049 | 2026-05-25 23:32 | Sin resumen |
| 050 | 2026-05-25 23:47 | Sin resumen |
| 051 | 2026-05-26 17:26 | Sin resumen |
| 052 | 2026-05-26 17:43 | Sin resumen |
| 053 | 2026-05-26 18:00 | Sin resumen |
| 054 | 2026-05-26 18:22 | Sin resumen |
| 055 | 2026-05-26 22:52 | Sin resumen |
| 056 | 2026-05-26 23:44 | Sin resumen |
| 057 | 2026-05-26 23:55 | Sin resumen |
| 058 | 2026-05-27 22:29 | Sin resumen |
| 059 | 2026-05-28 01:11 | Sin resumen |

#### Reportes recientes (060–070)

| # | Fecha | Archivos clave | Qué se hizo |
|---|---|---|---|
| 060 | 2026-05-28 22:11 | electron/handlers/cia.js, electron/handlers/files.js, electron/handlers/horario.js | Sin resumen |
| 061 | 2026-05-28 22:39 | electron/handlers/cia.js, electron/handlers/files.js, electron/handlers/horario.js | Sin resumen |
| 062 | 2026-05-28 22:48 | electron/handlers/cia.js, electron/handlers/files.js, electron/handlers/horario.js | Sin resumen |
| 063 | 2026-05-28 23:10 | electron/handlers/cia.js, electron/handlers/files.js, electron/handlers/horario.js | Sin resumen |
| 064 | 2026-05-31 17:52 | AGENTS.md, README.md, build/icon-128.png | Sin resumen |
| 065 | 2026-05-31 18:33 | src/App.jsx, src/components/Onboarding.jsx, src/components/Sidebar.jsx | Sin resumen |
| 066 | 2026-05-31 23:05 | electron/handlers/calendario.js, electron/handlers/horario.js, electron/handlers/settings.js | Sin resumen |
| 067 | 2026-06-01 00:39 | electron/handlers/calendario.js, electron/handlers/horario.js, electron/handlers/settings.js | Sin resumen |
| 068 | 2026-06-01 21:13 | electron/handlers/calendario.js, electron/handlers/horario.js, electron/handlers/settings.js | Sin resumen |
| 069 | 2026-06-01 22:43 | electron/handlers/calendario.js, electron/handlers/horario.js, electron/handlers/settings.js | Sin resumen |
| 070 | 2026-06-02 15:15 | src/pages/Calendario.jsx | Sin resumen |

### ⚠️ Pendientes para Claude

- No se detectaron pendientes explícitos en los últimos 10 reportes.

## 4. Módulos y su estado actual

### Tabla base extraída de AGENTS.md

| Módulo | Estado | Nota |
|---|---|---|
| Actividades iVirtual | ✅ | Clasificación pendiente/retrasada/cerrada + adjuntos |
| Horario CIA + links | ⚠️ | Funcional, pero dependiente de estabilidad de frames/estructura CIA |
| Calificaciones CIA | ⚠️ | Funcional por PDF/Report Manager, sensible a cambios de flujo CIA |
| Ajustes credenciales | ✅ | UI + persistencia `.env` dev/prod |
| Reportes (`generate-report.js`) | ✅ | v2 con stats + diff por archivo + verificación |

### Módulos que siempre deben estar en el mapa de contexto

| Módulo | Estado | Nota |
|---|---|---|
| Actividades iVirtual | ✅ | Scraper principal, cards/tabla/kanban y sincronización ya forman parte del flujo diario. |
| Horario CIA | ⚠️ | El módulo existe y funciona, pero sigue siendo sensible a cambios del portal y a las vistas derivadas. |
| Calificaciones CIA | ⚠️ | La vista y el scraper existen; conviene seguir vigilando parsers y representación visual. |
| Calendario Escolar ITSON | ⚠️ | Módulo incorporado; el historial reciente muestra hardening pendiente y widgets visuales en evolución. |
| Ajustes / credenciales | ✅ | Gestión de credenciales y configuración persistida desde UI. |
| Sidebar + Sincronizar todo | ✅ | Navegación lateral, sync global y estado visual ya están integrados. |
| Modos de vista (Actividades) | ✅ | Cards / compact / table / kanban ya están implementados. |
| Widget StackedPhotos (Calendario) | ⚠️ | Existe como placeholder; la tarea siguiente es reemplazarlo por tarjetas dinámicas reales. |
| Notificaciones de clases | ⚠️ | El scheduler base está presente; falta expandir cobertura a otros portales y flujos. |

## 5. Bugs conocidos y tareas pendientes activas

### Estado activo desde los últimos 10 reportes

- No se detectaron pendientes explícitos en los últimos 10 reportes.

### Problemas abiertos detectados en Key Learnings

- No se detectaron aprendizajes abiertos o problemas explícitos en los últimos 10 reportes.

### Tareas pendientes confirmadas

- Header duplicado en módulo Calendario (pre-existente desde 066)
- Tarea 071: StackedEventCards con clasificador por palabras clave (reemplazar picsum por tarjetas dinámicas de calendarData.events)
- Investigar portales ITSON adicionales para notificaciones personalizadas (biblioteca, pagos, servicios escolares, correo, bolsa de trabajo)
- Página de Notificaciones (nav item existe, sin página propia)
- Empaquetado Windows NSIS definitivo

### Comentarios TODO/FIXME

- scripts\generate-context.js:396:    'rg -n "\\b(TODO|FIXME)\\b" src electron scripts docs -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/reports/**"',
- scripts\generate-context.js:655:### Comentarios TODO/FIXME

## 6. Commits recientes

```text
f296629 feat: módulo Calendario ITSON, sidebar redesign, notificaciones de clase, modos de vista y botón sync animado ← estado actual
3b68805 feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
0ec0e20 feat: calificaciones con parciales, GradeCard rediseñada y fixes de scraper
6efe3d6 fix: color picker como ventana flotante compacta sin fondo borroso
03e06a8 feat: color picker premium con selector, deslizadores, ajustes y paletas
79caf8b feat: tema personalizable con color picker y cuadro de actividad urgente
aa516f1 feat: superficies secundarias adaptativas por tema
456716b feat: colores de estado adaptativos por tema
c6bf3ed feat: sistema de temas visuales con 5 temas predefinidos
7d28ef4 revert: restaurar diseño v1 desde backup
```

## 7. Estructura de archivos principales

Salida equivalente a `git ls-files | grep -v "node_modules\|\.png\|\.ico\|\.icns\|report_" | head -80` agrupada por carpeta:

- .gitignore
- AGENTS.md
- CONTEXT.md
- generate-report.js
- horario-debug.html
- index.html
- package-lock.json
- package.json
- postcss.config.js
- README.md
- tailwind.config.js
- vite.config.js
- docs/
  - SCRAPERS.md
  - UI.md
  - WORKFLOW.md
- electron/
  - main.js
  - preload.js
  - handlers/
    - calendario.js
    - cia.js
    - files.js
    - horario.js
    - notifications.js
    - scraper.js
    - settings.js
- scripts/
  - debug-frame-0-http___smartweb1_itson_edu_mx_8400_psp_ITSONPRD_EM.html
  - debug-frame-1-https___apps9_itson_edu_mx_chatmesa_chatmesaayuda_.html
  - debug-horario.js
  - generate-context.js
  - generate-icon.js
  - tabla-celdas-real.json
  - tabla-horario-real.html
- src/
  - App.jsx
  - index.css
  - main.jsx
  - ThemeContext.jsx
  - themes.js
  - components/
    - ActivityCard.jsx
    - ColorPicker.jsx
    - GradeCard.jsx
    - Onboarding.jsx
    - ResultsTable.jsx
    - Sidebar.jsx
    - TaskPanel.jsx
  - pages/
    - Actividades.jsx
    - Ajustes.jsx
    - Calendario.jsx
    - Calificaciones.jsx
    - Horario.jsx
  - utils/
    - horario.js
    - package.json

## 8. Variables de entorno requeridas

| Variable | Uso |
|---|---|
| `IVIRTUAL_USER` | Usuario de iVirtual |
| `IVIRTUAL_PASS` | Contraseña de iVirtual |
| `CIA_USER` | Usuario de CIA |
| `CIA_PASS` | Contraseña de CIA |
| `NOTIF_MINUTES_BEFORE` | Minutos de anticipación para notificaciones |
| `STUDENT_NAME` | Nombre visible del alumno en la UI |

- Dev: raíz del repo (`.env` en `C:\Users\kneko\OneDrive\Documentos\scraper-app`)
- Prod: `app.getPath('userData')/.env`

## 9. Workflow del equipo

```text
WORKFLOW:
Claude (arquitectura + prompts) →
Codex (implementación + reportes) →
David (relay de reportes a Claude para revisión)

FORMATO DE PROMPTS A CODEX:
- Secciones numeradas con rutas exactas de archivos
- Instrucciones atómicas sin ambigüedad
- Comandos de verificación con output esperado
- Siempre terminar con: NO hacer commit todavía

REGLAS OPERATIVAS:
- waitUntil: 'domcontentloaded' siempre en scrapers
- gotoWithRetry en toda navegación Playwright
- npm run build antes de cualquier commit
- node generate-report.js después de cada tarea
```

## 10. Cómo continuar desde aquí

### Para retomar el proyecto

1. Leer este `CONTEXT.md` completo.
2. Verificar que el build funciona: `npm run build`.
3. Revisar el último reporte en `reports/` para saber exactamente en qué punto quedó Codex.
4. El working tree debe estar limpio: `git status`.
5. Último commit verificado: `f296629`.
6. Próxima tarea sugerida: `Tarea 071 StackedEventCards`.

### Frase de reactivación del módulo de calificaciones CIA

```
Claude, retomamos el módulo de calificaciones CIA —
el bloqueo ya se quitó.
```

### Cuenta de prueba ITSON

`00000279009`

### Recordatorio operativo

- Leer reportes antes de asumir estado.
- Confirmar build antes de reportar como funcional.
- Actualizar `generate-report.js` con la verificación real antes de generar un reporte.
- No hacer commit todavía: primero revisar el contexto y el reporte más reciente.
