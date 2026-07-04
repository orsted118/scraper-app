# Reporte — Fix ASCII Bug 1 + Bug 2
**Fecha:** 2026-07-04
**Agente:** Claude Code (Fable 5)
**Repo:** C:\Users\kneko\OneDrive\Documentos\scraper-app
**Rama:** master

## Diagnóstico Bug 1

**¿`imageToAscii` generaba carácter para el 100% de las celdas?** **Sí, confirmado.**
El loop en `asciiConverter.js` empujaba `char: charsetChars[charIndex]` para **toda**
celda, sin ninguna noción de "fondo". Peor: en el cálculo de brillo, los píxeles
transparentes se mezclaban con blanco (`255 * (1 - alpha)`), y las imágenes con
fondo sólido oscuro se mapeaban a caracteres densos → rectángulo lleno.

**Hallazgo crítico adicional (no previsto en la tarea):** los 4 fondos default
(`manos/coyote/gato/pajaro`) **no se generan en runtime desde el `.jpeg`** — se cargan
de JSON pre-horneados (`*.json`) que solo tienen `char` + `brightness`, **sin `isEmpty`**
(verificado: gato tenía 100% de celdas con char denso, esquinas a brillo 18). Por eso
arreglar `imageToAscii` **no bastaba** para las miniaturas default. Hubo que **regenerar
los 4 JSON**. Como no hay decodificador JPEG en Node (solo `pngjs`), el backfill de
`isEmpty` se hizo por **distancia de brillo** sobre los datos ya presentes en el JSON
(el fondo es uniforme en las esquinas), que para imágenes de fondo blanco/negro sólido
es equivalente a la distancia de color del converter.

**`BACKGROUND_TOLERANCE` final: 35.** Barrido sobre las 4 imágenes: tol 35 deja siluetas
sanas (manos 12%, coyote 31%, gato 32%, pájaro 36%); tol 60 borraba las manos (1%).
El mismo valor 35 se usa en el converter (distancia de color RGB) y en el backfill
(distancia de brillo).

## Archivos modificados

> Nota importante: `git diff HEAD` **no es representativo** — el working tree ya tenía
> **58 archivos sin commitear** antes de esta tarea (toda la feature de fondo ASCII estaba
> sin commit; varios de estos archivos son NUEVOS, no están en HEAD). Las líneas de abajo
> son el **cambio lógico de esta tarea**, no el diff contra HEAD.

| Archivo | Líneas + | Líneas - | Cambio principal |
|---------|----------|----------|-----------------|
| `src/utils/asciiConverter.js` | ~53 | 0 | Bug 1: `detectBackgroundColor`, `colorDistance`, acumular RGB/alpha por celda, marcar `isEmpty` |
| `src/utils/asciiRendering.js` | ~14 | ~3 | Bug 1: saltar celdas `isEmpty` en `decorateAsciiArt` y en miniaturas |
| `src/assets/ascii-defaults/manos.json` | regen | regen | Backfill `isEmpty` por brillo (silueta 12%) |
| `src/assets/ascii-defaults/coyote.json` | regen | regen | Backfill `isEmpty` por brillo (silueta 31%) |
| `src/assets/ascii-defaults/gato.json` | regen | regen | Backfill `isEmpty` por brillo (silueta 32%) |
| `src/assets/ascii-defaults/pajaro.json` | regen | regen | Backfill `isEmpty` por brillo (silueta 36%) |
| `src/themes.js` | ~7 | 0 | Doc de las vars translúcidas derivadas |
| `src/ThemeContext.jsx` | ~35 | 0 | Helper `withAlpha` + `--bg-primary-translucent` / `--bg-card-translucent` |
| `src/AsciiBackgroundContext.jsx` | ~22 | 0 | Estado `sidebarCompact` (persistido en localStorage) + setter |
| `src/App.jsx` | ~15 | ~2 | Área de contenido translúcida cuando `backgroundId !== 'none'` |
| `src/components/TaskPanel.jsx` | ~2 | ~2 | Acepta y fusiona `backdropStyle` |
| `src/components/Sidebar.jsx` | ~85 | ~27 | Fondo translúcido + modo compacto (w-16, solo íconos, tooltips) |
| `src/pages/Ajustes.jsx` | ~30 | ~1 | Toggle "Sidebar compacto" en sección Fondo ASCII |

**FIX 2.1 ya estaba implementado:** `getContrastingAsciiColor` ya existía en
`AsciiBackdrop.jsx` y ya se llamaba por frame en el rAF (incluso más robusto que el
propuesto: cae a `--bg`, `--bg-card` y `--ascii-fg`). No se reimplementó.

## Verificación

| Check | Resultado |
|-------|-----------|
| npm run build | **PASS** (7.84s; warning de chunk-size pre-existente, no relacionado) |
| detectBackgroundColor existe | true |
| isEmpty en grid (converter) | true |
| isEmpty en rendering | true |
| sidebarCompact en contexto | true |
| backdropFilter en Sidebar | true |
| bg-card-translucent en themes | true |
| bg-primary-translucent en App | true |

Los 7 checks del script de la tarea → **todos true**.

## Screenshots

Generados con Vite dev server + Playwright (sin Electron ⇒ **sin datos personales reales**
en las capturas). Guardados en `reports/`:

1. `ascii_bug1_thumbnails.png` — Ajustes › Fondo ASCII: las 4 miniaturas.
2. `ascii_bug2_gato_backdrop.png` — Calendario, fondo "gato" 0.15, tema oscuro, sidebar normal.
3. `ascii_bug2_sidebar_compact.png` — igual con "Sidebar compacto" activado.
4. `ascii_bug2_none_baseline.png` — `backgroundId = 'none'` (control).

## Resultado visual Bug 1

Las 4 miniaturas ahora muestran **solo la silueta** de cada imagen (gato, coyote, pájaro,
manos), **sin el rectángulo de fondo relleno**. Confirmado en `ascii_bug1_thumbnails.png`.

## Resultado visual Bug 2

- **Fondo:** la silueta ASCII del gato se ve difuminada a través del área de contenido y
  del sidebar (ambos translúcidos con blur), a intensidad 0.15 — sutil, sin competir con
  el contenido.
- **Sidebar translúcido:** el fondo del sidebar deja pasar el ASCII; texto e íconos siguen
  100% opacos (solo se cambió `background`, nunca `opacity` del contenedor).
- **Auto-contraste:** el color del ASCII se recalcula por frame según la luminancia del tema.
- **Sidebar compacto:** se reduce a w-16, solo íconos centrados con tooltip; se ocultan las
  cards de Sincronización/HOY (no caben) y el footer queda como avatar; un botón de sync
  compacto (solo icono) reemplaza la card. Íconos completamente visibles.
- **Control `none`:** idéntico al diseño original — sidebar completo, contenido opaco, sin
  transparencia. Los estilos translúcidos se aplican SOLO cuando `backgroundId !== 'none'`.

## Pendientes / notas

- **⚠️ Working tree NO limpio (pre-existente, ajeno a esta tarea):** hay **58 archivos**
  con cambios/nuevos sin commitear, incluidos `electron/main.js`, `electron/preload.js` y
  toda la feature de fondo ASCII. Contradice el "working tree limpio" del CONTEXT.md.
  **No se tocó nada de eso.** Conviene que Sonnet decida cómo consolidar/commitear ese
  estado antes de seguir.
- **Regeneración de defaults por brillo, no por color:** los 4 JSON se backfillearon con
  distancia de brillo porque no hay decodificador JPEG en Node. Es equivalente para estas
  imágenes (fondos blanco/negro sólidos). Si en el futuro se agregan defaults con fondo de
  color, habría que regenerarlos desde el `.jpeg` con el converter real (canvas/browser).
  El script one-off usado quedó fuera del repo (scratchpad).
- **Vars translúcidas derivadas en ThemeContext** (no hardcodeadas por tema): cubre el tema
  `custom` automáticamente. Limitación menor: si el usuario cambia el color de fondo del
  tema custom EN VIVO, la var translúcida no se recalcula hasta el próximo montaje (los
  otros temas y el arranque sí quedan correctos).
- **Screenshots sin Electron:** muestran estados vacíos ("debe ejecutarse dentro de
  Electron") porque no hay backend; suficiente para validar lo visual (ASCII, sidebar,
  temas, miniaturas), que es todo client-side.

**NO se hizo commit** (según la instrucción).
