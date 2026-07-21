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
```

Node **20+**, npm **10+**.

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
- `src/design-backups/` es referencia visual **PRE-Swiss-Noir** — no importar, es snapshot histórico.

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
