# Report 056
**Fecha:** 2026-05-26 23:44  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** 79caf8b — feat: tema personalizable con color picker y cuadro de actividad urgente
**Archivos modificados:** 3

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/components/ColorPicker.jsx` — archivo creado como parte de la base inicial
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 5 | 5 |
| src/components/ColorPicker.jsx | 1505 | 0 |
| src/pages/Ajustes.jsx | 16 | 34 |

## Resumen
Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index e328d17..4270c96 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -27,14 +27,14 @@ const VERIFICATION = {
 The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
 vite v5.4.21 building for production...
 transforming...
-✓ 1764 modules transformed.
+✓ 1765 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                        0.41 kB | gzip: 0.27 kB
+dist/index.html                        0.41 kB | gzip:  0.27 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-CkhrxtXk.css        23.80 kB | gzip: 5.53 kB
-dist/assets/index-BpSmhJyL.js        236.80 kB | gzip: 67.61 kB
-✓ built in 5.69s`,
+dist/assets/index-DeF-9x-6.css        28.81 kB | gzip:  6.16 kB
+dist/assets/index-DzhmUnI8.js        272.21 kB | gzip: 75.89 kB
+✓ built in 5.93s`,
 };
 
 function ensureReportsDir() {
```

### `src/components/ColorPicker.jsx`
```diff
diff --git a/src/components/ColorPicker.jsx b/src/components/ColorPicker.jsx
new file mode 100644
index 0000000..1550929
--- /dev/null
+++ b/src/components/ColorPicker.jsx
@@ -0,0 +1,1505 @@
+import {
+  ArrowRightLeft,
+  Check,
+  CheckCircle2,
+  Copy,
+  Droplets,
+  Palette,
+  Plus,
+  RefreshCcw,
+  Settings2,
+  SlidersHorizontal,
+  Sparkles,
+  SunMedium,
+  SwatchBook,
+  Trash2,
+  X,
+} from 'lucide-react';
+import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+
+const RECENT_COLORS_KEY = 'scraperapp-recent-colors';
+const PALETTES_KEY = 'scraperapp-palettes';
+const MAX_RECENT_COLORS = 6;
+
+const TAB_CONFIG = [
+  { id: 'selector', label: 'Selector', icon: Palette },
+  { id: 'slider', label: 'Deslizador', icon: SlidersHorizontal },
+  { id: 'settings', label: 'Ajustes', icon: Settings2 },
+  { id: 'palettes', label: 'Paletas', icon: SwatchBook },
+];
+
+const QUICK_PRESETS = [
+  '#EF4444',
+  '#F97316',
+  '#FACC15',
+  '#22C55E',
+  '#06B6D4',
+  '#3B82F6',
+  '#8B5CF6',
+  '#EC4899',
+];
+
+const DEFAULT_PALETTES = [
+  {
+    id: 'itson',
+    name: 'ITSON',
+    description: 'Colores institucionales ITSON',
+    colors: ['#021E4D', '#0056A6', '#2A66B8', '#9CC2EA', '#E8EEF8', '#0A0E1A'],
+  },
+  {
+    id: 'oceano',
+    name: 'Océano Profundo',
+    description: 'Azules tecnológicos',
+    colors: ['#0B132B', '#1C2541', '#3A506B', '#5BC0BE', '#CDEDF6'],
+  },
+  {
+    id: 'atardecer',
+    name: 'Atardecer',
+    description: 'Tonos cálidos de alto contraste',
+    colors: ['#2D1E2F', '#5B2E48', '#E26D5A', '#F2A541', '#F7E3AF'],
+  },
+  {
+    id: 'bosque',
+    name: 'Bosque',
+    description: 'Verdes oscuros equilibrados',
+    colors: ['#0B1F1A', '#124E3A', '#1D7A58', '#4AA96C', '#D9F0DD'],
+  },
+];
+
+function clamp(value, min, max) {
+  return Math.min(max, Math.max(min, value));
+}
+
+function round(value, precision = 0) {
+  const base = 10 ** precision;
+  return Math.round(value * base) / base;
+}
+
+function normalizeHex(input) {
+  if (!input || typeof input !== 'string') {
+    return '#006DB6';
+  }
+
+  const clean = input.trim().replace('#', '');
+
+  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
+    return `#${clean
+      .split('')
+      .map((char) => char + char)
+      .join('')
+      .toUpperCase()}`;
+  }
+
+  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
+    return `#${clean.toUpperCase()}`;
+  }
+
+  return '#006DB6';
+}
+
+function hexToRgb(hex) {
+  const normalized = normalizeHex(hex).replace('#', '');
+  return {
+    r: parseInt(normalized.slice(0, 2), 16),
+    g: parseInt(normalized.slice(2, 4), 16),
+    b: parseInt(normalized.slice(4, 6), 16),
+  };
+}
+
+function rgbToHex(r, g, b) {
+  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
+  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
+}
+
+function rgbToHsv({ r, g, b }) {
+  const red = r / 255;
+  const green = g / 255;
+  const blue = b / 255;
+  const max = Math.max(red, green, blue);
+  const min = Math.min(red, green, blue);
+  const delta = max - min;
+
+  let h = 0;
+
+  if (delta !== 0) {
+    if (max === red) {
+      h = ((green - blue) / delta) % 6;
+    } else if (max === green) {
+      h = (blue - red) / delta + 2;
+    } else {
+      h = (red - green) / delta + 4;
+    }
+  }
+
+  h = Math.round(h * 60);
+  if (h < 0) {
+    h += 360;
+  }
+
+  const s = max === 0 ? 0 : (delta / max) * 100;
+  const v = max * 100;
+
+  return {
+    h: clamp(round(h), 0, 360),
+    s: clamp(round(s, 1), 0, 100),
+    v: clamp(round(v, 1), 0, 100),
+  };
+}
+
+function hsvToRgb({ h, s, v }) {
+  const hue = ((h % 360) + 360) % 360;
+  const sat = clamp(s, 0, 100) / 100;
+  const val = clamp(v, 0, 100) / 100;
+  const c = val * sat;
+  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
+  const m = val - c;
+
+  let redPrime = 0;
+  let greenPrime = 0;
+  let bluePrime = 0;
+
+  if (hue < 60) {
+    redPrime = c;
+    greenPrime = x;
+  } else if (hue < 120) {
+    redPrime = x;
+    greenPrime = c;
+  } else if (hue < 180) {
+    greenPrime = c;
+    bluePrime = x;
+  } else if (hue < 240) {
+    greenPrime = x;
+    bluePrime = c;
+  } else if (hue < 300) {
+    redPrime = x;
+    bluePrime = c;
+  } else {
+    redPrime = c;
+    bluePrime = x;
+  }
+
+  return {
+    r: Math.round((redPrime + m) * 255),
+    g: Math.round((greenPrime + m) * 255),
+    b: Math.round((bluePrime + m) * 255),
+  };
+}
+
+function hsvToHsl({ h, s, v }) {
+  const sat = clamp(s, 0, 100) / 100;
+  const val = clamp(v, 0, 100) / 100;
+  const lightness = val * (1 - sat / 2);
+  const hslSat = lightness === 0 || lightness === 1 ? 0 : (val - lightness) / Math.min(lightness, 1 - lightness);
+
+  return {
+    h: clamp(round(h), 0, 360),
+    s: clamp(round(hslSat * 100, 1), 0, 100),
+    l: clamp(round(lightness * 100, 1), 0, 100),
+  };
+}
+
+function hslToHsv({ h, s, l }) {
+  const sat = clamp(s, 0, 100) / 100;
+  const lightness = clamp(l, 0, 100) / 100;
+  const v = lightness + sat * Math.min(lightness, 1 - lightness);
+  const hsvSat = v === 0 ? 0 : 2 * (1 - lightness / v);
+
+  return {
+    h: clamp(round(h), 0, 360),
+    s: clamp(round(hsvSat * 100, 1), 0, 100),
+    v: clamp(round(v * 100, 1), 0, 100),
+  };
+}
+
+function rgbToCmyk({ r, g, b }) {
+  const red = r / 255;
+  const green = g / 255;
+  const blue = b / 255;
+  const k = 1 - Math.max(red, green, blue);
+
+  if (k === 1) {
+    return { c: 0, m: 0, y: 0, k: 100 };
+  }
+
+  const c = (1 - red - k) / (1 - k);
+  const m = (1 - green - k) / (1 - k);
+  const y = (1 - blue - k) / (1 - k);
+
+  return {
+    c: clamp(Math.round(c * 100), 0, 100),
+    m: clamp(Math.round(m * 100), 0, 100),
+    y: clamp(Math.round(y * 100), 0, 100),
+    k: clamp(Math.round(k * 100), 0, 100),
+  };
+}
+
+function cmykToRgb({ c, m, y, k }) {
+  const cyan = clamp(c, 0, 100) / 100;
+  const magenta = clamp(m, 0, 100) / 100;
+  const yellow = clamp(y, 0, 100) / 100;
+  const key = clamp(k, 0, 100) / 100;
+
+  return {
+    r: Math.round(255 * (1 - cyan) * (1 - key)),
+    g: Math.round(255 * (1 - magenta) * (1 - key)),
+    b: Math.round(255 * (1 - yellow) * (1 - key)),
+  };
+}
+
+function safeParseJSON(value, fallback) {
+  try {
+    return JSON.parse(value);
+  } catch (_error) {
+    return fallback;
+  }
+}
+
+function loadRecentColors() {
+  if (typeof window === 'undefined') {
+    return [];
+  }
+
+  const data = safeParseJSON(localStorage.getItem(RECENT_COLORS_KEY) || '[]', []);
+  return Array.isArray(data)
+    ? data.map(normalizeHex).slice(0, MAX_RECENT_COLORS)
+    : [];
+}
+
+function loadPalettes() {
+  if (typeof window === 'undefined') {
+    return DEFAULT_PALETTES;
+  }
+
+  const data = safeParseJSON(localStorage.getItem(PALETTES_KEY) || '[]', []);
+
+  if (!Array.isArray(data) || data.length === 0) {
+    return DEFAULT_PALETTES;
+  }
+
+  return data.map((palette) => ({
+    ...palette,
+    colors: Array.isArray(palette.colors) ? palette.colors.map(normalizeHex) : [],
+  }));
+}
+
+function saveRecentColors(colors) {
+  if (typeof window === 'undefined') {
+    return;
+  }
+  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors.slice(0, MAX_RECENT_COLORS)));
+}
+
+function savePalettes(palettes) {
+  if (typeof window === 'undefined') {
+    return;
+  }
+  localStorage.setItem(PALETTES_KEY, JSON.stringify(palettes));
+}
+
+function toHsvaFromHex(hex) {
+  return { ...rgbToHsv(hexToRgb(hex)), a: 1 };
+}
+
+function adjustHexWithHsl(hex, callback) {
+  const hsv = rgbToHsv(hexToRgb(hex));
+  const hsl = hsvToHsl(hsv);
+  const updated = callback({ ...hsl });
+  const nextHsv = hslToHsv(updated);
+  const nextRgb = hsvToRgb(nextHsv);
+  return rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
+}
+
+function generateRelatedColors(baseHex) {
+  const normalized = normalizeHex(baseHex);
+  const lighter = adjustHexWithHsl(normalized, (hsl) => ({ ...hsl, l: clamp(hsl.l + 12, 0, 100) }));
+  const darker = adjustHexWithHsl(normalized, (hsl) => ({ ...hsl, l: clamp(hsl.l - 14, 0, 100) }));
+  const satUp = adjustHexWithHsl(normalized, (hsl) => ({ ...hsl, s: clamp(hsl.s + 15, 0, 100) }));
+  const satDown = adjustHexWithHsl(normalized, (hsl) => ({ ...hsl, s: clamp(hsl.s - 15, 0, 100) }));
+  return [darker, satDown, normalized, satUp, lighter];
+}
+
+function buildCssGradient(colors) {
+  return `linear-gradient(90deg, ${colors.join(', ')})`;
+}
+
+function GradientSlider({
+  icon: Icon,
+  label,
+  value,
+  min = 0,
+  max = 100,
+  step = 1,
+  unit = '',
+  gradient,
+  onChange,
+}) {
+  const trackRef = useRef(null);
+  const draggingRef = useRef(false);
+  const percent = ((value - min) / (max - min)) * 100;
+
+  const applyFromClientX = useCallback(
+    (clientX) => {
+      const track = trackRef.current;
+      if (!track) {
+        return;
+      }
+      const rect = track.getBoundingClientRect();
+      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
+      const rawValue = min + ratio * (max - min);
+      const snapped = Math.round(rawValue / step) * step;
+      onChange(clamp(round(snapped, step < 1 ? 2 : 0), min, max));
+    },
+    [max, min, onChange, step],
+  );
+
+  useEffect(() => {
+    const handleMove = (event) => {
+      if (!draggingRef.current) {
+        return;
+      }
+      applyFromClientX(event.clientX);
+    };
+
+    const handleUp = () => {
+      draggingRef.current = false;
+    };
+
+    window.addEventListener('mousemove', handleMove);
+    window.addEventListener('mouseup', handleUp);
+    return () => {
+      window.removeEventListener('mousemove', handleMove);
+      window.removeEventListener('mouseup', handleUp);
+    };
+  }, [applyFromClientX]);
+
+  return (
+    <div className="grid grid-cols-[160px_1fr_96px] items-center gap-4">
+      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+        {Icon ? <Icon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : null}
+        <span>{label}</span>
+      </div>
+
+      <button
+        type="button"
+        ref={trackRef}
+        onMouseDown={(event) => {
+          draggingRef.current = true;
+          applyFromClientX(event.clientX);
+        }}
+        className="relative h-3 w-full cursor-pointer rounded-full border transition hover:brightness-110"
+        style={{
+          borderColor: 'var(--border-normal)',
+          backgroundImage: gradient,
+        }}
+      >
+        <span
+          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 bg-slate-50 shadow-[0_0_0_3px_rgba(0,109,182,0.35)]"
+          style={{
+            left: `calc(${percent}% - 10px)`,
+            borderColor: 'var(--accent)',
+          }}
+        />
+      </button>
+
+      <div
+        className="flex items-center rounded-xl border px-2 py-1.5"
+        style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}
+      >
+        <input
+          type="number"
+          min={min}
+          max={max}
+          step={step}
+          value={round(value, 2)}
+          onChange={(event) => {
+            const next = Number(event.target.value);
+            if (Number.isNaN(next)) {
+              return;
+            }
+            onChange(clamp(next, min, max));
+          }}
+          className="w-full bg-transparent text-right text-sm outline-none"
+          style={{ color: 'var(--text-strong)' }}
+        />
+        {unit ? <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span> : null}
+      </div>
+    </div>
+  );
+}
+
+function ModelInput({ label, values, units = [], onChange }) {
+  return (
+    <div className="space-y-2">
+      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
+        {label}
+      </p>
+      <div
+        className="grid gap-2"
+        style={{ gridTemplateColumns: `repeat(${Math.max(values.length, 1)}, minmax(0, 1fr))` }}
+      >
+        {values.map((item, index) => (
+          <div
+            key={`${label}-${index}`}
+            className="flex items-center rounded-xl border px-2 py-1.5"
+            style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}
+          >
+            <input
+              type={item.type || 'number'}
+              value={item.value}
+              min={item.min}
+              max={item.max}
+              onChange={(event) => onChange(index, event.target.value)}
+              className="w-full bg-transparent text-sm outline-none"
+              style={{ color: 'var(--text-strong)' }}
+            />
+            {units[index] ? <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{units[index]}</span> : null}
+          </div>
+        ))}
+      </div>
+    </div>
+  );
+}
+
+function ActionButton({ icon: Icon, label, onClick }) {
+  return (
+    <button
+      type="button"
+      onClick={onClick}
+      className="rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-itson-blue/60"
+      style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-normal)' }}
+    >
+      <div className="flex items-center gap-2">
+        <Icon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
+        <span className="text-sm font-medium">{label}</span>
+      </div>
+    </button>
+  );
+}
+
+function ColorPicker({ label = 'Color', value = '#006DB6', onChange }) {
+  const [open, setOpen] = useState(false);
+  const [activeTab, setActiveTab] = useState('selector');
+  const [draft, setDraft] = useState(() => toHsvaFromHex(value));
+  const [recentColors, setRecentColors] = useState(() => loadRecentColors());
+  const [palettes, setPalettes] = useState(() => loadPalettes());
+  const [selectedPaletteId, setSelectedPaletteId] = useState(() => loadPalettes()[0]?.id || DEFAULT_PALETTES[0].id);
+  const [hexInput, setHexInput] = useState(() => normalizeHex(value));
+
+  const selectorCanvasRef = useRef(null);
+  const selectorWrapperRef = useRef(null);
+  const hueTrackRef = useRef(null);
+  const selectionPointerRef = useRef(false);
+  const huePointerRef = useRef(false);
+  const initialHexRef = useRef(normalizeHex(value));
+
+  const rgb = useMemo(() => hsvToRgb(draft), [draft]);
+  const currentHex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);
+  const hsl = useMemo(() => hsvToHsl(draft), [draft]);
+  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
+
+  useEffect(() => {
+    if (!open) {
+      const normalized = normalizeHex(value);
+      setDraft(toHsvaFromHex(normalized));
+      setHexInput(normalized);
+    }
+  }, [open, value]);
+
+  useEffect(() => {
+    setHexInput(currentHex);
+  }, [currentHex]);
+
+  useEffect(() => {
+    if (open && typeof onChange === 'function') {
+      onChange(currentHex);
+    }
+  }, [currentHex, onChange, open]);
+
+  useEffect(() => {
+    if (!open) {
+      return undefined;
+    }
+
+    const handleEscape = (event) => {
+      if (event.key === 'Escape') {
+        setOpen(false);
+        if (typeof onChange === 'function') {
+          onChange(initialHexRef.current);
+        }
+      }
+    };
+
+    window.addEventListener('keydown', handleEscape);
+    return () => window.removeEventListener('keydown', handleEscape);
+  }, [onChange, open]);
+
+  const persistRecentColor = useCallback((hex) => {
+    const normalized = normalizeHex(hex);
+    setRecentColors((previous) => {
+      const next = [normalized, ...previous.filter((entry) => entry !== normalized)].slice(0, MAX_RECENT_COLORS);
+      saveRecentColors(next);
+      return next;
+    });
+  }, []);
+
+  const persistPalettes = useCallback((updater) => {
+    setPalettes((previous) => {
+      const next = typeof updater === 'function' ? updater(previous) : updater;
+      savePalettes(next);
+      return next;
+    });
+  }, []);
+
+  const selectedPalette = useMemo(
+    () => palettes.find((palette) => palette.id === selectedPaletteId) || palettes[0],
+    [palettes, selectedPaletteId],
+  );
+
+  useEffect(() => {
+    if (!selectedPalette && palettes[0]) {
+      setSelectedPaletteId(palettes[0].id);
+    }
+  }, [palettes, selectedPalette]);
+
+  const drawSelector = useCallback(() => {
+    const canvas = selectorCanvasRef.current;
+    const wrapper = selectorWrapperRef.current;
+
+    if (!canvas || !wrapper) {
+      return;
+    }
+
+    const dpr = window.devicePixelRatio || 1;
+    const width = Math.max(Math.floor(wrapper.clientWidth), 320);
+    const height = Math.max(Math.floor(wrapper.clientHeight), 240);
+    canvas.width = width * dpr;
+    canvas.height = height * dpr;
+    canvas.style.width = `${width}px`;
+    canvas.style.height = `${height}px`;
+
+    const ctx = canvas.getContext('2d');
+    if (!ctx) {
+      return;
+    }
+    ctx.scale(dpr, dpr);
+    ctx.clearRect(0, 0, width, height);
+
+    ctx.fillStyle = `hsl(${draft.h}, 100%, 50%)`;
+    ctx.fillRect(0, 0, width, height);
+
+    const whiteGradient = ctx.createLinearGradient(0, 0, width, 0);
+    whiteGradient.addColorStop(0, 'rgba(255,255,255,1)');
+    whiteGradient.addColorStop(1, 'rgba(255,255,255,0)');
+    ctx.fillStyle = whiteGradient;
+    ctx.fillRect(0, 0, width, height);
+
+    const blackGradient = ctx.createLinearGradient(0, 0, 0, height);
+    blackGradient.addColorStop(0, 'rgba(0,0,0,0)');
+    blackGradient.addColorStop(1, 'rgba(0,0,0,1)');
+    ctx.fillStyle = blackGradient;
+    ctx.fillRect(0, 0, width, height);
+  }, [draft.h]);
+
+  useEffect(() => {
+    if (open) {
+      drawSelector();
+    }
+  }, [drawSelector, open]);
+
+  const setSaturationValueFromPointer = useCallback((clientX, clientY) => {
+    const wrapper = selectorWrapperRef.current;
+    if (!wrapper) {
+      return;
+    }
+
+    const rect = wrapper.getBoundingClientRect();
+    const x = clamp(clientX - rect.left, 0, rect.width);
+    const y = clamp(clientY - rect.top, 0, rect.height);
+    const saturation = round((x / rect.width) * 100, 1);
+    const valueChannel = round((1 - y / rect.height) * 100, 1);
+
+    setDraft((previous) => ({
+      ...previous,
+      s: saturation,
+      v: valueChannel,
+    }));
+  }, []);
+
+  const setHueFromPointer = useCallback((clientY) => {
+    const track = hueTrackRef.current;
+    if (!track) {
+      return;
+    }
+
+    const rect = track.getBoundingClientRect();
+    const y = clamp(clientY - rect.top, 0, rect.height);
+    const hue = round((y / rect.height) * 360, 1);
+    setDraft((previous) => ({ ...previous, h: hue }));
+  }, []);
+
+  useEffect(() => {
+    const handleMove = (event) => {
+      if (selectionPointerRef.current) {
+        setSaturationValueFromPointer(event.clientX, event.clientY);
+      }
+      if (huePointerRef.current) {
+        setHueFromPointer(event.clientY);
+      }
+    };
+
+    const handleUp = () => {
+      selectionPointerRef.current = false;
+      huePointerRef.current = false;
+    };
+
+    window.addEventListener('mousemove', handleMove);
+    window.addEventListener('mouseup', handleUp);
+    return () => {
+      window.removeEventListener('mousemove', handleMove);
+      window.removeEventListener('mouseup', handleUp);
+    };
+  }, [setHueFromPointer, setSaturationValueFromPointer]);
+
+  const selectorPointer = useMemo(
+    () => ({
+      left: `${draft.s}%`,
+      top: `${100 - draft.v}%`,
+    }),
+    [draft.s, draft.v],
+  );
+
+  const huePointerTop = `${(draft.h / 360) * 100}%`;
+
+  const applyHexInput = useCallback((nextHex) => {
+    const normalized = normalizeHex(nextHex);
+    setDraft((previous) => ({ ...toHsvaFromHex(normalized), a: previous.a }));
+  }, []);
+
+  const openModal = () => {
+    const normalized = normalizeHex(value);
+    initialHexRef.current = normalized;
+    setDraft(toHsvaFromHex(normalized));
+    setHexInput(normalized);
+    setActiveTab('selector');
+    setOpen(true);
+  };
+
+  const handleCancel = () => {
+    setOpen(false);
+    setDraft(toHsvaFromHex(initialHexRef.current));
+    if (typeof onChange === 'function') {
+      onChange(initialHexRef.current);
+    }
+  };
+
+  const handleAccept = () => {
+    persistRecentColor(currentHex);
+    setOpen(false);
+    if (typeof onChange === 'function') {
+      onChange(currentHex);
+    }
+  };
+
+  const handlePaletteCreate = () => {
+    const generated = generateRelatedColors(currentHex);
+    const paletteId = `palette-${Date.now()}`;
+    const newPalette = {
+      id: paletteId,
+      name: `Nueva paleta ${palettes.length + 1}`,
+      description: 'Creada desde selector personalizado',
+      colors: generated,
+    };
+
+    persistPalettes((previous) => [newPalette, ...previous]);
+    setSelectedPaletteId(paletteId);
+  };
+
+  const handlePaletteDuplicate = () => {
+    if (!selectedPalette) {
+      return;
+    }
+
+    const paletteId = `palette-${Date.now()}`;
+    const duplicate = {
+      ...selectedPalette,
+      id: paletteId,
+      name: `${selectedPalette.name} copia`,
+    };
+    persistPalettes((previous) => [duplicate, ...previous]);
+    setSelectedPaletteId(paletteId);
+  };
+
+  const handlePaletteDelete = () => {
+    if (!selectedPalette || palettes.length <= 1) {
+      return;
+    }
+
+    const nextPalettes = palettes.filter((palette) => palette.id !== selectedPalette.id);
+    persistPalettes(nextPalettes);
+    setSelectedPaletteId(nextPalettes[0]?.id || null);
+  };
+
+  const handlePaletteExport = async () => {
+    if (!selectedPalette) {
+      return;
+    }
+
+    const payload = JSON.stringify(selectedPalette, null, 2);
+    try {
+      await navigator.clipboard.writeText(payload);
+    } catch (_error) {
+      // If clipboard fails, silently ignore in desktop context.
+    }
+  };
+
+  const applyQuickAction = (action) => {
+    if (action === 'reset') {
+      setDraft(toHsvaFromHex(initialHexRef.current));
+      return;
+    }
+
+    if (action === 'invert') {
+      const inverted = {
+        r: 255 - rgb.r,
+        g: 255 - rgb.g,
+        b: 255 - rgb.b,
+      };
+      setDraft((previous) => ({ ...rgbToHsv(inverted), a: previous.a }));
+      return;
+    }
+
+    const currentHsl = hsvToHsl(draft);
+    let nextHsl = currentHsl;
+
+    if (action === 'lighter') {
+      nextHsl = { ...currentHsl, l: clamp(currentHsl.l + 10, 0, 100) };
+    }
+    if (action === 'darker') {
+      nextHsl = { ...currentHsl, l: clamp(currentHsl.l - 10, 0, 100) };
+    }
+    if (action === 'saturate') {
+      nextHsl = { ...currentHsl, s: clamp(currentHsl.s + 12, 0, 100) };
+    }
+    if (action === 'desaturate') {
+      nextHsl = { ...currentHsl, s: clamp(currentHsl.s - 12, 0, 100) };
+    }
+
+    setDraft((previous) => ({ ...hslToHsv(nextHsl), a: previous.a }));
+  };
+
+  const hueGradient = 'linear-gradient(90deg, #ff2a2a 0%, #ffd400 18%, #35ff4d 36%, #12d5ff 54%, #2a6dff 72%, #be2bff 90%, #ff2a7f 100%)';
+
+  const saturationGradient = useMemo(() => {
+    const { h } = hsl;
+    return buildCssGradient([
+      `hsl(${h}, 0%, ${hsl.l}%)`,
+      `hsl(${h}, 100%, ${hsl.l}%)`,
+    ]);
+  }, [hsl]);
+
+  const lightnessGradient = useMemo(() => {
+    const { h, s } = hsl;
+    return buildCssGradient([
+      `hsl(${h}, ${s}%, 0%)`,
+      `hsl(${h}, ${s}%, 50%)`,
+      `hsl(${h}, ${s}%, 100%)`,
+    ]);
+  }, [hsl]);
+
+  const alphaGradient = useMemo(() => {
+    const solid = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
+    return `linear-gradient(90deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0), ${solid})`;
+  }, [rgb]);
+
+  return (
+    <>
+      <button
+        type="button"
+        onClick={openModal}
+        className="inline-flex min-w-[220px] items-center gap-3 rounded-2xl border px-3 py-2.5 transition hover:border-itson-blue/60 hover:shadow-[0_0_0_2px_rgba(0,109,182,0.15)]"
+        style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}
+      >
+        <span
+          className="h-7 w-7 rounded-xl border"
+          style={{ borderColor: 'var(--border-subtle)', background: normalizeHex(value) }}
+        />
+        <span className="flex-1 text-left">
+          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
+          <span className="block text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
+            {normalizeHex(value)}
+          </span>
+        </span>
+        <Palette className="h-4 w-4" style={{ color: 'var(--accent)' }} />
+      </button>
+
+      {open ? (
+        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
+          <div
+            className="relative w-full max-w-[1080px] overflow-hidden rounded-[26px] border shadow-[0_28px_120px_rgba(2,6,23,0.75)]"
+            style={{
+              borderColor: 'var(--border-normal)',
+              background:
+                'radial-gradient(circle at top, rgba(0,109,182,0.15), transparent 42%), var(--bg-card)',
+            }}
+          >
+            <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: 'var(--border-subtle)' }}>
+              <div className="flex items-center gap-3">
+                <span className="rounded-2xl border p-2" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+                  <Palette className="h-5 w-5" style={{ color: 'var(--accent)' }} />
+                </span>
+                <div>
+                  <h3 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>
+                    Elegir color
+                  </h3>
+                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
+                    Selector premium personalizado para ScraperApp
+                  </p>
+                </div>
+              </div>
+
+              <button
+                type="button"
+                onClick={handleCancel}
+                className="rounded-2xl border p-2.5 transition hover:border-itson-blue/60 hover:bg-white/5"
+                style={{ borderColor: 'var(--border-normal)' }}
+              >
+                <X className="h-5 w-5" style={{ color: 'var(--text-strong)' }} />
+              </button>
+            </div>
+
+            <div className="border-b px-4 pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
+              <nav className="flex flex-wrap gap-1">
+                {TAB_CONFIG.map(({ id, label: tabLabel, icon: Icon }) => {
+                  const active = activeTab === id;
+                  return (
+                    <button
+                      key={id}
+                      type="button"
+                      onClick={() => setActiveTab(id)}
+                      className="relative flex items-center gap-2 rounded-t-2xl px-4 py-3 text-sm font-medium transition"
+                      style={{
+                        color: active ? 'var(--accent)' : 'var(--text-muted)',
+                        background: active ? 'rgba(0,109,182,0.12)' : 'transparent',
+                      }}
+                    >
+                      <Icon className="h-4 w-4" />
+                      {tabLabel}
+                      {active ? (
+                        <span
+                          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
+                          style={{ background: 'var(--accent)' }}
+                        />
+                      ) : null}
+                    </button>
+                  );
+                })}
+              </nav>
+            </div>
+
+            <div className="max-h-[74vh] overflow-y-auto p-5">
+              {activeTab === 'selector' ? (
+                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
+                  <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                    <div className="grid gap-3 lg:grid-cols-[1fr_46px]">
+                      <div
+                        ref={selectorWrapperRef}
+                        className="relative h-[320px] overflow-hidden rounded-2xl border"
+                        style={{ borderColor: 'var(--border-normal)' }}
+                        onMouseDown={(event) => {
+                          selectionPointerRef.current = true;
+                          setSaturationValueFromPointer(event.clientX, event.clientY);
+                        }}
+                      >
+                        <canvas ref={selectorCanvasRef} className="h-full w-full" />
+                        <span
+                          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(15,23,42,0.9)]"
+                          style={{
+                            left: selectorPointer.left,
+                            top: selectorPointer.top,
+                          }}
+                        />
+                      </div>
+
+                      <button
+                        type="button"
+                        ref={hueTrackRef}
+                        onMouseDown={(event) => {
+                          huePointerRef.current = true;
+                          setHueFromPointer(event.clientY);
+                        }}
+                        className="relative h-[320px] w-full rounded-2xl border"
+                        style={{
+                          borderColor: 'var(--border-normal)',
+                          background: 'linear-gradient(180deg, #ff0033 0%, #ff00d6 16%, #4a00ff 33%, #008cff 50%, #00f5d4 66%, #84ff00 82%, #fffb00 92%, #ff4b00 100%)',
+                        }}
+                      >
+                        <span
+                          className="pointer-events-none absolute left-1/2 h-3 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/20"
+                          style={{ top: huePointerTop }}
+                        />
+                      </button>
+                    </div>
+
+                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
+                      <div className="space-y-2">
+                        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
+                          HEX
+                        </p>
+                        <div className="flex items-center rounded-2xl border px-3 py-2.5" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg)' }}>
+                          <input
+                            type="text"
+                            value={hexInput}
+                            onChange={(event) => setHexInput(event.target.value)}
+                            onBlur={() => applyHexInput(hexInput)}
+                            className="w-full bg-transparent text-lg font-medium uppercase outline-none"
+                            style={{ color: 'var(--text-strong)' }}
+                          />
+                          <button
+                            type="button"
+                            onClick={async () => {
+                              try {
+                                await navigator.clipboard.writeText(currentHex);
+                              } catch (_error) {
+                                // Ignore clipboard failures.
+                              }
+                            }}
+                            className="rounded-xl p-1.5 transition hover:bg-white/10"
+                          >
+                            <Copy className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
+                          </button>
+                        </div>
+                      </div>
+
+                      <div className="grid grid-cols-3 gap-2">
+                        {['R', 'G', 'B'].map((channel, index) => {
+                          const values = [rgb.r, rgb.g, rgb.b];
+                          return (
+                            <div key={channel} className="space-y-1">
+                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{channel}</p>
+                              <input
+                                type="number"
+                                min={0}
+                                max={255}
+                                value={values[index]}
+                                onChange={(event) => {
+                                  const next = [...values];
+                                  next[index] = clamp(Number(event.target.value), 0, 255);
+                                  setDraft((previous) => ({ ...rgbToHsv({ r: next[0], g: next[1], b: next[2] }), a: previous.a }));
+                                }}
+                                className="w-full rounded-xl border bg-transparent px-2 py-1.5 text-sm outline-none"
+                                style={{ borderColor: 'var(--border-normal)', background: 'var(--bg)', color: 'var(--text-strong)' }}
+                              />
+                            </div>
+                          );
+                        })}
+                      </div>
+                    </div>
+
+                    <div className="space-y-2">
+                      <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+                        Colores recientes
+                      </p>
+                      <div className="flex flex-wrap gap-2">
+                        {recentColors.map((recent) => (
+                          <button
+                            key={recent}
+                            type="button"
+                            onClick={() => applyHexInput(recent)}
+                            className="h-10 w-10 rounded-full border transition hover:scale-105"
+                            style={{ background: recent, borderColor: recent === currentHex ? 'var(--accent)' : 'var(--border-normal)' }}
+                          />
+                        ))}
+                        {recentColors.length < MAX_RECENT_COLORS ? (
+                          <span
+                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed"
+                            style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}
+                          >
+                            <Plus className="h-4 w-4" />
+                          </span>
+                        ) : null}
+                      </div>
+                    </div>
+                  </div>
+
+                  <div className="space-y-4">
+                    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
+                        Vista previa
+                      </p>
+                      <div className="mt-3 grid grid-cols-2 gap-3">
+                        <div className="space-y-2">
+                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nuevo</p>
+                          <div className="h-24 rounded-2xl border" style={{ borderColor: 'var(--border-normal)', background: currentHex }} />
+                          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>{currentHex}</p>
+                        </div>
+                        <div className="space-y-2">
+                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Actual</p>
+                          <div className="h-24 rounded-2xl border" style={{ borderColor: 'var(--border-normal)', background: initialHexRef.current }} />
+                          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>{initialHexRef.current}</p>
+                        </div>
+                      </div>
+                    </div>
+
+                    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                      <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+                        Presets rápidos
+                      </p>
+                      <div className="mt-3 grid grid-cols-4 gap-2">
+                        {QUICK_PRESETS.map((preset) => (
+                          <button
+                            key={preset}
+                            type="button"
+                            onClick={() => applyHexInput(preset)}
+                            className="h-10 rounded-xl border transition hover:scale-[1.03]"
+                            style={{
+                              borderColor: preset === currentHex ? 'var(--accent)' : 'var(--border-normal)',
+                              background: preset,
+                            }}
+                          />
+                        ))}
+                      </div>
+                    </div>
+                  </div>
+                </div>
+              ) : null}
+
+              {activeTab === 'slider' ? (
+                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
+                  <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                    <div className="flex items-center justify-between">
+                      <p className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+                        Ajustar con deslizadores
+                      </p>
+                      <button
+                        type="button"
+                        onClick={() => setDraft(toHsvaFromHex(initialHexRef.current))}
+                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition hover:border-itson-blue/60"
+                        style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                      >
+                        <RefreshCcw className="h-3.5 w-3.5" />
+                        Restablecer
+                      </button>
+                    </div>
+
+                    <GradientSlider
+                      icon={Sparkles}
+                      label="Tono (H)"
+                      value={hsl.h}
+                      min={0}
+                      max={360}
+                      unit="°"
+                      gradient={hueGradient}
+                      onChange={(nextHue) => setDraft((previous) => ({ ...hslToHsv({ ...hsl, h: nextHue }), a: previous.a }))}
+                    />
+                    <GradientSlider
+                      icon={Droplets}
+                      label="Saturación (S)"
+                      value={hsl.s}
+                      min={0}
+                      max={100}
+                      unit="%"
+                      gradient={saturationGradient}
+                      onChange={(nextSat) => setDraft((previous) => ({ ...hslToHsv({ ...hsl, s: nextSat }), a: previous.a }))}
+                    />
+                    <GradientSlider
+                      icon={SunMedium}
+                      label="Luminosidad (L)"
+                      value={hsl.l}
+                      min={0}
+                      max={100}
+                      unit="%"
+                      gradient={lightnessGradient}
+                      onChange={(nextLight) => setDraft((previous) => ({ ...hslToHsv({ ...hsl, l: nextLight }), a: previous.a }))}
+                    />
+                    <GradientSlider
+                      icon={CheckCircle2}
+                      label="Opacidad (A)"
+                      value={draft.a * 100}
+                      min={0}
+                      max={100}
+                      unit="%"
+                      gradient={alphaGradient}
+                      onChange={(nextOpacity) => setDraft((previous) => ({ ...previous, a: nextOpacity / 100 }))}
+                    />
+
+                    <div>
+                      <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+                        Vista rápida de tonos relacionados
+                      </p>
+                      <div className="mt-3 flex flex-wrap gap-2">
+                        {generateRelatedColors(currentHex).map((tone) => (
+                          <button
+                            key={tone}
+                            type="button"
+                            onClick={() => applyHexInput(tone)}
+                            className="h-11 w-11 rounded-xl border transition hover:scale-[1.05]"
+                            style={{ background: tone, borderColor: tone === currentHex ? 'var(--accent)' : 'var(--border-normal)' }}
+                          />
+                        ))}
+                      </div>
+                    </div>
+                  </div>
+
+                  <div className="space-y-4">
+                    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                      <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>Vista previa en vivo</p>
+                      <div className="mt-3 grid grid-cols-2 gap-3">
+                        <div>
+                          <div className="h-20 rounded-xl border" style={{ borderColor: 'var(--border-normal)', background: currentHex }} />
+                          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Nuevo color</p>
+                        </div>
+                        <div>
+                          <div className="h-20 rounded-xl border" style={{ borderColor: 'var(--border-normal)', background: initialHexRef.current }} />
+                          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Color actual</p>
+                        </div>
+                      </div>
+                    </div>
+
+                    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                      <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>Valores numéricos</p>
+                      <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
+                        <p>H: {Math.round(hsl.h)}°</p>
+                        <p>S: {Math.round(hsl.s)}%</p>
+                        <p>L: {Math.round(hsl.l)}%</p>
+                        <p>A: {Math.round(draft.a * 100)}%</p>
+                      </div>
+                    </div>
+                  </div>
+                </div>
+              ) : null}
+
+              {activeTab === 'settings' ? (
+                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
+                  <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                    <h4 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+                      Ajustes del color
+                    </h4>
+                    <GradientSlider
+                      icon={Sparkles}
+                      label="Tono (H)"
+                      value={hsl.h}
+                      min={0}
+                      max={360}
+                      unit="°"
+                      gradient={hueGradient}
+                      onChange={(nextHue) => setDraft((previous) => ({ ...hslToHsv({ ...hsl, h: nextHue }), a: previous.a }))}
+                    />
+                    <GradientSlider
+                      icon={Droplets}
+                      label="Saturación (S)"
+                      value={hsl.s}
+                      min={0}
+                      max={100}
+                      unit="%"
+                      gradient={saturationGradient}
+                      onChange={(nextSat) => setDraft((previous) => ({ ...hslToHsv({ ...hsl, s: nextSat }), a: previous.a }))}
+                    />
+                    <GradientSlider
+                      icon={SunMedium}
+                      label="Luminosidad (L)"
+                      value={hsl.l}
+                      min={0}
+                      max={100}
+                      unit="%"
+                      gradient={lightnessGradient}
+                      onChange={(nextLight) => setDraft((previous) => ({ ...hslToHsv({ ...hsl, l: nextLight }), a: previous.a }))}
+                    />
+                    <GradientSlider
+                      icon={CheckCircle2}
+                      label="Opacidad (A)"
+                      value={draft.a * 100}
+                      min={0}
+                      max={100}
+                      unit="%"
+                      gradient={alphaGradient}
+                      onChange={(nextOpacity) => setDraft((previous) => ({ ...previous, a: nextOpacity / 100 }))}
+                    />
+
+                    <div className="grid grid-cols-2 gap-3">
+                      <ActionButton icon={SunMedium} label="Más claro" onClick={() => applyQuickAction('lighter')} />
+                      <ActionButton icon={SunMedium} label="Más oscuro" onClick={() => applyQuickAction('darker')} />
+                      <ActionButton icon={Droplets} label="Más saturado" onClick={() => applyQuickAction('saturate')} />
+                      <ActionButton icon={Droplets} label="Menos saturado" onClick={() => applyQuickAction('desaturate')} />
+                      <ActionButton icon={ArrowRightLeft} label="Invertir" onClick={() => applyQuickAction('invert')} />
+                      <ActionButton icon={RefreshCcw} label="Restablecer" onClick={() => applyQuickAction('reset')} />
+                    </div>
+                  </div>
+
+                  <div className="space-y-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                    <h4 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+                      Vista previa
+                    </h4>
+                    <div className="grid grid-cols-2 gap-3">
+                      <div>
+                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nuevo color</p>
+                        <div className="mt-1 h-20 rounded-xl border" style={{ borderColor: 'var(--border-normal)', background: currentHex }} />
+                      </div>
+                      <div>
+                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Color actual</p>
+                        <div className="mt-1 h-20 rounded-xl border" style={{ borderColor: 'var(--border-normal)', background: initialHexRef.current }} />
+                      </div>
+                    </div>
+
+                    <ModelInput
+                      label="HEX"
+                      values={[{ type: 'text', value: hexInput }]}
+                      onChange={(_index, nextValue) => {
+                        setHexInput(nextValue);
+                        applyHexInput(nextValue);
+                      }}
+                    />
+                    <ModelInput
+                      label="RGB"
+                      units={['', '', '']}
+                      values={[
+                        { value: rgb.r, min: 0, max: 255 },
+                        { value: rgb.g, min: 0, max: 255 },
+                        { value: rgb.b, min: 0, max: 255 },
+                      ]}
+                      onChange={(index, nextValue) => {
+                        const values = [rgb.r, rgb.g, rgb.b];
+                        values[index] = clamp(Number(nextValue), 0, 255);
+                        setDraft((previous) => ({ ...rgbToHsv({ r: values[0], g: values[1], b: values[2] }), a: previous.a }));
+                      }}
+                    />
+                    <ModelInput
+                      label="HSL"
+                      units={['°', '%', '%']}
+                      values={[
+                        { value: Math.round(hsl.h), min: 0, max: 360 },
+                        { value: Math.round(hsl.s), min: 0, max: 100 },
+                        { value: Math.round(hsl.l), min: 0, max: 100 },
+                      ]}
+                      onChange={(index, nextValue) => {
+                        const values = [hsl.h, hsl.s, hsl.l];
+                        values[index] = clamp(Number(nextValue), index === 0 ? 0 : 0, index === 0 ? 360 : 100);
+                        setDraft((previous) => ({ ...hslToHsv({ h: values[0], s: values[1], l: values[2] }), a: previous.a }));
+                      }}
+                    />
+                    <ModelInput
+                      label="CMYK"
+                      units={['%', '%', '%', '%']}
+                      values={[
+                        { value: cmyk.c, min: 0, max: 100 },
+                        { value: cmyk.m, min: 0, max: 100 },
+                        { value: cmyk.y, min: 0, max: 100 },
+                        { value: cmyk.k, min: 0, max: 100 },
+                      ]}
+                      onChange={(index, nextValue) => {
+                        const values = [cmyk.c, cmyk.m, cmyk.y, cmyk.k];
+                        values[index] = clamp(Number(nextValue), 0, 100);
+                        const nextRgb = cmykToRgb({
+                          c: values[0],
+                          m: values[1],
+                          y: values[2],
+                          k: values[3],
+                        });
+                        setDraft((previous) => ({ ...rgbToHsv(nextRgb), a: previous.a }));
+                      }}
+                    />
+                  </div>
+                </div>
+              ) : null}
+
+              {activeTab === 'palettes' ? (
+                <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
+                  <aside className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                    <div className="mb-3 flex items-center justify-between">
+                      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
+                        Mis paletas
+                      </p>
+                      <button
+                        type="button"
+                        onClick={handlePaletteCreate}
+                        className="rounded-xl border p-1.5 transition hover:border-itson-blue/60"
+                        style={{ borderColor: 'var(--border-normal)' }}
+                      >
+                        <Plus className="h-4 w-4" style={{ color: 'var(--accent)' }} />
+                      </button>
+                    </div>
+
+                    <div className="space-y-2">
+                      {palettes.map((palette) => {
+                        const active = palette.id === selectedPalette?.id;
+                        return (
+                          <button
+                            key={palette.id}
+                            type="button"
+                            onClick={() => setSelectedPaletteId(palette.id)}
+                            className="w-full rounded-2xl border p-2 text-left transition hover:border-itson-blue/60"
+                            style={{
+                              borderColor: active ? 'var(--accent)' : 'var(--border-normal)',
+                              background: active ? 'rgba(0,109,182,0.14)' : 'transparent',
+                            }}
+                          >
+                            <div className="mb-2 flex overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}>
+                              {palette.colors.slice(0, 6).map((swatch) => (
+                                <span key={`${palette.id}-${swatch}`} className="h-6 flex-1" style={{ background: swatch }} />
+                              ))}
+                            </div>
+                            <div className="flex items-center justify-between">
+                              <span className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>{palette.name}</span>
+                              {active ? <Check className="h-4 w-4" style={{ color: 'var(--accent)' }} /> : null}
+                            </div>
+                          </button>
+                        );
+                      })}
+                    </div>
+                  </aside>
+
+                  <section className="space-y-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
+                    <div className="flex flex-wrap items-center justify-between gap-2">
+                      <div>
+                        <h4 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+                          {selectedPalette?.name || 'Paleta'}
+                        </h4>
+                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
+                          {selectedPalette?.description || 'Gestiona tus colores personalizados'}
+                        </p>
+                      </div>
+
+                      <div className="flex flex-wrap gap-2">
+                        <button
+                          type="button"
+                          onClick={handlePaletteExport}
+                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition hover:border-itson-blue/60"
+                          style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                        >
+                          <Copy className="h-4 w-4" />
+                          Exportar
+                        </button>
+                        <button
+                          type="button"
+                          onClick={handlePaletteDuplicate}
+                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition hover:border-itson-blue/60"
+                          style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                        >
+                          <Sparkles className="h-4 w-4" />
+                          Duplicar
+                        </button>
+                        <button
+                          type="button"
+                          onClick={handlePaletteDelete}
+                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition hover:border-red-500/60"
+                          style={{ borderColor: 'var(--border-normal)', color: '#f87171' }}
+                        >
+                          <Trash2 className="h-4 w-4" />
+                          Eliminar
+                        </button>
+                      </div>
+                    </div>
+
+                    <div className="flex items-center gap-2">
+                      <div className="flex flex-1 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-normal)' }}>
+                        {(selectedPalette?.colors || []).map((swatch) => (
+                          <button
+                            key={`${selectedPalette?.id}-${swatch}`}
+                            type="button"
+                            onClick={() => applyHexInput(swatch)}
+                            className="h-24 flex-1 transition hover:brightness-110"
+                            style={{ background: swatch }}
+                          />
+                        ))}
+                      </div>
+                      <button
+                        type="button"
+                        onClick={() => {
+                          if (!selectedPalette) {
+                            return;
+                          }
+                          const updated = palettes.map((palette) =>
+                            palette.id === selectedPalette.id
+                              ? {
+                                ...palette,
+                                colors: [...new Set([currentHex, ...palette.colors])].slice(0, 10),
+                              }
+                              : palette,
+                          );
+                          persistPalettes(updated);
+                        }}
+                        className="h-24 w-16 rounded-2xl border border-dashed transition hover:border-itson-blue/60"
+                        style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}
+                      >
+                        <Plus className="mx-auto h-5 w-5" />
+                      </button>
+                    </div>
+
+                    <div className="grid gap-3 rounded-2xl border p-3 md:grid-cols-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg)' }}>
+                      <div>
+                        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Colores recientes</p>
+                        <div className="mt-2 flex flex-wrap gap-2">
+                          {recentColors.map((recent) => (
+                            <button
+                              key={`recent-${recent}`}
+                              type="button"
+                              onClick={() => applyHexInput(recent)}
+                              className="h-10 w-10 rounded-xl border transition hover:scale-[1.05]"
+                              style={{ background: recent, borderColor: 'var(--border-normal)' }}
+                            />
+                          ))}
+                        </div>
+                      </div>
+                      <div>
+                        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Paletas sugeridas</p>
+                        <div className="mt-2 flex flex-wrap gap-2">
+                          {DEFAULT_PALETTES.map((palette) => (
+                            <button
+                              key={`suggest-${palette.id}`}
+                              type="button"
+                              onClick={() => {
+                                persistPalettes((previous) => {
+                                  if (previous.some((entry) => entry.id === palette.id)) {
+                                    return previous;
+                                  }
+                                  return [...previous, palette];
+                                });
+                              }}
+                              className="overflow-hidden rounded-xl border transition hover:border-itson-blue/60"
+                              style={{ borderColor: 'var(--border-normal)' }}
+                            >
+                              <span className="flex h-10 w-[120px]">
+                                {palette.colors.slice(0, 5).map((swatch) => (
+                                  <span key={`${palette.id}-${swatch}`} className="flex-1" style={{ background: swatch }} />
+                                ))}
+                              </span>
+                            </button>
+                          ))}
+                        </div>
+                      </div>
+                    </div>
+                  </section>
+                </div>
+              ) : null}
+            </div>
+
+            <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
+              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
+                Cambio en tiempo real · {currentHex} · A {Math.round(draft.a * 100)}%
+              </p>
+              <div className="flex items-center gap-2">
+                <button
+                  type="button"
+                  onClick={handleCancel}
+                  className="rounded-2xl border px-5 py-2.5 text-sm font-medium transition hover:border-itson-blue/60"
+                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                >
+                  Cancelar
+                </button>
+                <button
+                  type="button"
+                  onClick={handleAccept}
+                  className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
+                  style={{ background: 'var(--accent)' }}
+                >
+                  Aceptar
+                </button>
+              </div>
+            </div>
+          </div>
+        </div>
+      ) : null}
+    </>
+  );
+}
+
+export default ColorPicker;
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index e5ef3ee..72498d8 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -7,6 +7,7 @@ import {
   ShieldCheck,
 } from 'lucide-react';
 import { useEffect, useState } from 'react';
+import ColorPicker from '../components/ColorPicker';
 import { useTheme } from '../ThemeContext';
 import { THEMES } from '../themes';
 
@@ -420,18 +421,11 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
                       Botones, elementos activos y highlights
                     </p>
                   </div>
-                  <div className="flex items-center gap-2">
-                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
-                      {customColors.accent}
-                    </span>
-                    <input
-                      type="color"
-                      value={customColors.accent}
-                      onChange={(event) => handleCustomColor('accent', event.target.value)}
-                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
-                      style={{ accentColor: customColors.accent }}
-                    />
-                  </div>
+                  <ColorPicker
+                    label="Acento"
+                    value={customColors.accent}
+                    onChange={(nextHex) => handleCustomColor('accent', nextHex)}
+                  />
                 </label>
 
                 <label className="flex items-center justify-between gap-4">
@@ -443,17 +437,11 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
                       Color de fondo de toda la app
                     </p>
                   </div>
-                  <div className="flex items-center gap-2">
-                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
-                      {customColors.bg}
-                    </span>
-                    <input
-                      type="color"
-                      value={customColors.bg}
-                      onChange={(event) => handleCustomColor('bg', event.target.value)}
-                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
-                    />
-                  </div>
+                  <ColorPicker
+                    label="Fondo"
+                    value={customColors.bg}
+                    onChange={(nextHex) => handleCustomColor('bg', nextHex)}
+                  />
                 </label>
 
                 <label className="flex items-center justify-between gap-4">
@@ -465,17 +453,11 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
                       Texto principal de la interfaz
                     </p>
                   </div>
-                  <div className="flex items-center gap-2">
-                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
-                      {customColors.text}
-                    </span>
-                    <input
-                      type="color"
-                      value={customColors.text}
-                      onChange={(event) => handleCustomColor('text', event.target.value)}
-                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
-                    />
-                  </div>
+                  <ColorPicker
+                    label="Texto"
+                    value={customColors.text}
+                    onChange={(nextHex) => handleCustomColor('text', nextHex)}
+                  />
                 </label>
 
                 <button
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** ninguno
**Comando de verificación:** npm run build
**Output de verificación:**
```
> scraper-app@0.1.0 build
> vite build

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
vite v5.4.21 building for production...
transforming...
✓ 1765 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip:  0.27 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-DeF-9x-6.css        28.81 kB | gzip:  6.16 kB
dist/assets/index-DzhmUnI8.js        272.21 kB | gzip: 75.89 kB
✓ built in 5.93s
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
