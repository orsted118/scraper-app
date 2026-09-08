# CLAUDE.md — DVPotro (scraper-app)

@AGENTS.md

---

## Overrides sobre `~/.claude/CLAUDE.md` global

Este proyecto **no sigue** el stack default de mi CLAUDE.md global. Tenerlo presente
antes de escribir código:

- **JavaScript (JSX), no TypeScript.** No inventar `.ts`/`.tsx` ni tipos — mantener `.jsx` y `.js` como está.
- **React 18** (no 19). Sin `use()`, sin Server Components, sin `"use client"`.
- **Tailwind 3** (no 4). Sintaxis clásica `@tailwind base/components/utilities`, no `@import "tailwindcss"`.
- **Sin React Query.** State propio en `App.jsx` + `SidebarContext` / `ThemeContext`.
- **CommonJS en Electron main** (`"type": "commonjs"` en `package.json`). Renderer es ESM via Vite.

Lo que **sí aplica** del global:
- Early returns, `error → loading → empty → data` en componentes con datos.
- Try/catch en async handlers (scrapers, IPC calls) con toast/notificación en el catch.
- No emojis en UI. Iconos vía `lucide-react`.
- No comentarios de "qué" — solo "por qué" no-obvio.

---

## Comandos exactos

```bash
npm install                            # Deps
npx playwright install chromium        # Chromium para Playwright (una vez)
npm start                              # Vite + Electron en paralelo (dev)
npm run dev                            # Solo Vite renderer
npm run electron                       # Solo Electron main
npm run build                          # Build Vite (dist/)
npm run dist                           # Build + electron-builder (NSIS + portable → release/)
npm run dist:dir                       # Build sin empaquetar instalador (dir/)
npm run report                         # Genera reporte incremental en reports/

npm run test:clasificacion             # Estados pendiente/retrasada/cerrada (ventana de entrega)
npm run test:fechas                    # Parseo de fechas ES/EN, main y renderer en sincronía
npm run test:extraccion                # Enlaces, tablas y rúbrica contra un DOM real (Playwright)

npm run test:drive                     # Normalización y clasificación de links de Drive (sin red)
npm run test:drive:red                 # Descarga real contra ids reales, DENTRO de Electron (con red)
npm run test:drive:llm                 # El texto del PDF llegando al prompt y al extractor de requisitos
npm run test:mcp-drive                 # El MCP sirviendo lo resuelto (JSON-RPC contra el server real)
npm run drive:resolve                  # Corre la cola de Drive una vez contra la caché real
```

Node **20+**, npm **10+**.

---

## Servidor MCP (`mcp/dvpotro-mcp.js`)

Expone la caché de la app a Claude Code. Registrado en dos lados: en `.mcp.json` del repo
(para quien lo clone) y a **nivel usuario** en `~/.claude.json`, que es lo que lo hace
cargar desde cualquier carpeta. `REPO` se resuelve con `__dirname`, así que el `cwd` de la
sesión no importa.

**Cuando la pregunta es sobre datos académicos —qué actividades hay, qué vence, horario,
calificaciones, material, asistencia— usar las tools `mcp__dvpotro__*`, no leer los JSON
a mano.** Para eso existe el server: `actividades-cache.json` son ~300 KB (unos 75.000
tokens) y volcarlo entero quema la ventana de contexto. El valor del server es FILTRAR.

### Arquitectura

- **Sin dependencias.** Habla JSON-RPC 2.0 por stdio a mano, delimitado por `\n`. Meter el SDK oficial (ESM) en un proyecto CommonJS costaba más que las ~60 líneas de transporte.
- **Lee los JSON de `userData` directo**, no habla con la app por IPC ni HTTP. Un puerto abierto con la matrícula y las calificaciones del alumno detrás no agrega ningún dato y sí agrega superficie. Por stdio no hace falta que la app esté corriendo.
- **`stdout` está secuestrado** al arrancar: es el canal del protocolo y un solo `console.log` ajeno corrompe la sesión. El `write` real se guarda para `enviar()` y todo lo demás se redirige a stderr. Si agregás código que loguea, ya está cubierto — pero no escribas a stdout a propósito.
- **`readJson` reintenta 3 veces.** El `writeJson` de la app no es atómico; si sincroniza justo mientras leemos agarramos un JSON cortado.
- **`SCHEMA`** declara qué versión de cada caché sabe leer. Si bumpeás `schemaVersion`/`version` en un handler, **actualizá también `SCHEMA`** o el server empieza a avisar que puede faltar información.
- **`DVPOTRO_USER_DATA`** pisa la ruta de `userData` — sirve para probar contra un sandbox sin tocar la instalación real.

### Solo lectura, con dos excepciones acotadas

Las 17 tools de consulta no escriben nada. Las dos que salen a la red cargan los handlers
de Electron en Node pelado con un `electron` de mentira:

- **`dvpotro_sync`** corre el scrape y refresca la caché. Tiene lista blanca de módulos —
  **nunca** se arma un nombre de función con lo que mandó el cliente.
- **`dvpotro_adjuntos`** inicia sesión en iVirtual y baja los adjuntos de una actividad —y
  las imágenes de la consigna, a `imagenes/`— a `userData/adjuntos/<idActividad>/`. Las
  URLs salen de la caché, nunca del cliente: la tool recibe un id de actividad, no una URL.
  Moodle contesta la pantalla de login con **200**, así que se verifica que el cuerpo no
  empiece con HTML antes de guardarlo, o el login se archivaría con extensión `.docx`.
  Las imágenes se numeran al guardarlas: Moodle llama `blobid0.png` a todas las que se
  pegan en el editor, así que sin el índice la segunda pisa a la primera.

Las dos llaman `prepararHandlers()` **antes** de chequear credenciales: esa función es la
que carga el `.env`, y al revés las credenciales siempre parecen faltar.

Regla dura: **la asistencia jamás se marca sola.** `markAttendance` no se referencia en
ningún lado de ese archivo, a propósito. Sincronizar es traer, nunca mandar.

`isPackaged: true` en el `app` falso **no es cosmético**: `settings.js:getEnvFilePath()`
lo consulta, y con `undefined` el scrape de horario termina reescribiendo el `.env` del
repo — el archivo con todas las claves.

### Cómo testearlo

Spawneá el proceso y hablale JSON-RPC (`initialize` → `tools/list` → `tools/call`).
**No hagas `require()` del archivo**: arranca el listener de stdin y cuelga el proceso.

---

## Puntos de dolor específicos del proyecto

### Scraping (Playwright)
- iVirtual (Moodle) y CIA (PeopleSoft) son **portales legacy con DOM frágil**. Cualquier scraper (`electron/handlers/scraper.js`, `horario.js`, `cia.js`) debe:
  - Manejar timeouts explícitos (no confiar en defaults de Playwright).
  - Loggear en consola cuando un selector falla — no morir silencioso.
  - Devolver estructura consistente al renderer aunque falte data (`{ ok: false, error, data: null }`).
- El scraper de horario (`horario.js`) tiene **múltiples capas de búsqueda** para detectar enlaces de videollamada (DOM, recursos Moodle, foros). Preservar todas las capas al modificar.

### IPC + preload bridge
- `electron/preload.js` expone `window.scraperApp` — **nunca** llamar `ipcRenderer` directamente desde React. Toda comunicación main ↔ renderer pasa por `window.scraperApp.*`.
- Handlers en `electron/handlers/` se registran en `electron/main.js`. Agregar handler nuevo = registrar en main + exponer en preload.

### Credenciales
- `.env` local con `IVIRTUAL_USER`, `IVIRTUAL_PASS`, `CIA_USER`, `CIA_PASS`.
- En prod (empaquetado) las credenciales las gestiona `settings.js` desde la UI de Ajustes — no `.env`.
- **Nunca** commitear `.env`, nunca imprimir credenciales en logs.

### Distribución
- appId `mx.itson.dvpotro`, productName `DVPotro`.
- GitHub Releases: `orsted118/Scrap-Its` (repo remoto ≠ nombre local `scraper-app`).
- `electron-updater` chequea auto-updates. Si toco `main.js`, verificar que el flow de updater sigue registrado.

---

## Convenciones del proyecto

### Componentes React (`src/components/`, `src/pages/`)
- Un componente por archivo, `PascalCase.jsx`.
- Estado local → `useState`. Estado compartido cross-page → contextos (`SidebarContext`, `ThemeContext`) o lift a `App.jsx`.
- Loading/error/empty **por página**, no en `App.jsx`.

### Estilos
- **Design system con tokens `var(--*)`** para structural (radius, fonts, shadow, border-width) y color (theme-dependent). Ver "Diseño visual" abajo. Usar SIEMPRE tokens — cero hardcoded, cero `rounded-*`/`shadow-*`/`font-mono` de Tailwind.
- Tailwind 3 utility-first **solo para layout** (flex, grid, spacing, sizing, positioning). NO para radius/shadow/font/color.
- Structural tokens definidos en `:root` de `src/index.css`. Color tokens seteados por `ThemeContext.jsx` por tema.

### Reports (`reports/`)
- `npm run report` genera diff por archivo del cambio actual. Correr **antes** de commits grandes para tener historial de cambios visuales/estructurales.
- No borrar reports viejos; son bitácora del proyecto.

---

## Diseño visual

DVPotro adoptó **Swiss Noir** como sistema visual (post-rediseño Julio 2026). Los principios del md global (`~/.claude/design-preferences.md`) **sí aplican** — tipografía como diseño, alto contraste sin punto medio, geometría honesta con hairlines, un acento único (vermillion `#FF3D00`), restricción deliberada.

Sigue siendo app utilitaria para estudiantes, no landing: priorizar densidad de información sobre statement typographic. Hero display solo donde comunica jerarquía (empty states, section titles, "ahora suena"). Mono tabular en cualquier data tabular (durations, IDs, timestamps).

### Arquitectura de tokens

Structural (invariantes, `:root` global): `--font-display`, `--font-body`, `--font-mono`, `--radius-card`/`--radius-button`/`--radius-badge` (todos `0px`), `--shadow-card` (`none`), `--border-width-card` (`1px`).

Color (por tema, `ThemeContext.jsx`): `--bg*`, `--border*`, `--accent*`, `--text*`, palettes por estado.

### Lenguaje semántico establecido

- `border-left 3px` = estado/categoría (playing track, critical notification, color de note, activity state)
- Línea horizontal `1px var(--accent)` = tiempo (now line en Horario/Calendario)
- `layoutId` shared underline = tab activo
- `.field` select = server-side action con latencia
- Tabs con underline = client-side instant filter
- Dashed border = modalidad alterna (clase online, drop-zone)
- Hairline solid = separador editorial

### Anti-patrones (del md global, aplicados como regla)

Prohibido: `backdrop-filter: blur()` en superficies primarias, gradientes de IA genéricos (purple→blue, pink→orange), pasteles suaves como base, mid-tones lavados (`#e5e5e5` sobre `#f5f5f5`), neumorphism, `border-radius: 12px` por default, emoji como icono estructural (usar SVG Lucide via `lucide-react`), stack `shadow-lg + rounded-lg + border + bg-white`.

### Módulos con design system aplicado

Actividades, Horario, Calendario, Notificaciones, Ajustes, Portal Sistemas (Sidebar credencial + Ajustes Perfil), Música (Fase 1 pausada), Notas (Fases 1+2+fix imágenes), Onboarding, shells de carga en `App.jsx`, GradeCard/Calificaciones.

`ResultsTable.jsx` y `StackedEventCards.jsx` se eliminaron en el pass de auditoría UI (eran código muerto, cero imports).

### Tinta sobre acento

`--on-accent` es la tinta legible sobre cualquier fondo `var(--accent)`: se declara por tema en `themes.js` y se deriva con `pickOnAccent()` cuando el acento lo elige el usuario (tema `custom`). Usar SIEMPRE `var(--on-accent)` en texto/iconos sobre acento — nunca `#fff` hardcodeado, que queda ilegible en los temas de acento claro (rose-gold, cyber, terminal).

---

## Antes de commitear

- Correr manualmente `npm start`, verificar que Vite renderer + Electron main levantan sin errores.
- Si toqué scrapers, probar con credenciales reales que las 3 páginas (Actividades, Horario, Calificaciones) siguen extrayendo data.
- Si toqué `main.js` o preload, verificar que `window.scraperApp.*` sigue existiendo en devtools del renderer.
- Correr `npm run report` si el cambio es significativo — deja bitácora en `reports/`.
