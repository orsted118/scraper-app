# Report 053
**Fecha:** 2026-05-26 18:00  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** c6bf3ed — feat: sistema de temas visuales con 5 temas predefinidos
**Archivos modificados:** 7

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/ThemeContext.jsx` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/index.css` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Horario.jsx` — archivo actualizado en esta tarea
- `src/themes.js` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 3 | 3 |
| src/ThemeContext.jsx | 16 | 0 |
| src/components/ActivityCard.jsx | 73 | 30 |
| src/index.css | 15 | 0 |
| src/pages/Actividades.jsx | 21 | 5 |
| src/pages/Horario.jsx | 14 | 5 |
| src/themes.js | 45 | 0 |

## Resumen
Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 06b5932..cea9f1d 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -31,9 +31,9 @@ rendering chunks...
 computing gzip size...
 dist/index.html                        0.41 kB | gzip: 0.28 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-BMP17a7U.css        22.76 kB | gzip: 5.24 kB
-dist/assets/index-D6_SpU8j.js        220.98 kB | gzip: 64.86 kB
-✓ built in 4.00s
+dist/assets/index-lYzT1SJ0.css        23.27 kB | gzip: 5.39 kB
+dist/assets/index-qOU34oel.js        223.79 kB | gzip: 65.47 kB
+✓ built in 3.50s
 The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
 };
```

### `src/ThemeContext.jsx`
```diff
diff --git a/src/ThemeContext.jsx b/src/ThemeContext.jsx
index 8127899..fbded63 100644
--- a/src/ThemeContext.jsx
+++ b/src/ThemeContext.jsx
@@ -16,6 +16,7 @@ export function ThemeProvider({ children }) {
 
   useEffect(() => {
     const root = document.documentElement;
+    root.style.setProperty('color-scheme', theme.mode === 'light' ? 'light' : 'dark');
     root.style.setProperty('--bg', theme.bg);
     root.style.setProperty('--bg-card', theme.bgCard);
     root.style.setProperty('--bg-sidebar', theme.bgSidebar);
@@ -27,6 +28,21 @@ export function ThemeProvider({ children }) {
     root.style.setProperty('--text-muted', theme.textMuted);
     root.style.setProperty('--gradient-from', theme.gradientFrom);
     root.style.setProperty('--gradient-to', theme.gradientTo);
+    root.style.setProperty('--pending-bg', theme.pendingBg);
+    root.style.setProperty('--pending-border', theme.pendingBorder);
+    root.style.setProperty('--pending-text', theme.pendingText);
+    root.style.setProperty('--retrasada-bg', theme.retrasadaBg);
+    root.style.setProperty('--retrasada-border', theme.retrasadaBorder);
+    root.style.setProperty('--retrasada-text', theme.retrasadaText);
+    root.style.setProperty('--closed-bg', theme.closedBg);
+    root.style.setProperty('--closed-border', theme.closedBorder);
+    root.style.setProperty('--closed-text', theme.closedText);
+    root.style.setProperty('--success-bg', theme.successBg);
+    root.style.setProperty('--success-border', theme.successBorder);
+    root.style.setProperty('--success-text', theme.successText);
+    root.style.setProperty('--error-bg', theme.errorBg);
+    root.style.setProperty('--error-border', theme.errorBorder);
+    root.style.setProperty('--error-text', theme.errorText);
 
     try {
       localStorage.setItem('scraperapp-theme', themeId);
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index a31bcdb..69bd68b 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -149,61 +149,93 @@ function getTimeContext(estado, fechaLimite) {
 function getCardTheme(estado, modalidad) {
   if (estado === 'cerrada') {
     return {
-      accent: 'border-l-slate-600',
-      dateText: 'text-slate-400',
-      iconBg: 'bg-slate-700/50',
-      iconText: 'text-slate-500',
-      pillClass: 'border border-slate-600 bg-slate-700/50 text-slate-300',
+      accentColor: 'var(--closed-text)',
+      dateColor: 'var(--closed-text)',
+      iconBg: 'var(--closed-bg)',
+      iconText: 'var(--closed-text)',
+      pillStyle: {
+        background: 'var(--closed-bg)',
+        borderColor: 'var(--closed-border)',
+        color: 'var(--closed-text)',
+      },
       pillLabel: 'CERRADA',
     };
   }
 
   if (estado === 'retrasada') {
     return {
-      accent: 'border-l-orange-500',
-      dateText: 'text-orange-400',
-      iconBg: 'bg-orange-500/20',
-      iconText: 'text-orange-400',
-      pillClass: 'border border-orange-500/40 bg-orange-500/10 text-orange-300',
+      accentColor: 'var(--retrasada-text)',
+      dateColor: 'var(--retrasada-text)',
+      iconBg: 'var(--retrasada-bg)',
+      iconText: 'var(--retrasada-text)',
+      pillStyle: {
+        background: 'var(--retrasada-bg)',
+        borderColor: 'var(--retrasada-border)',
+        color: 'var(--retrasada-text)',
+      },
       pillLabel: 'RETRASADA',
     };
   }
 
   if (modalidad === 'equipo') {
     return {
-      accent: 'border-l-red-500',
-      dateText: 'text-red-400',
-      iconBg: 'bg-red-500/20',
-      iconText: 'text-red-400',
-      pillClass: 'border border-red-500/40 bg-red-500/10 text-red-300',
+      accentColor: 'var(--error-text)',
+      dateColor: 'var(--error-text)',
+      iconBg: 'var(--error-bg)',
+      iconText: 'var(--error-text)',
+      pillStyle: {
+        background: 'var(--error-bg)',
+        borderColor: 'var(--error-border)',
+        color: 'var(--error-text)',
+      },
       pillLabel: 'EN EQUIPO',
     };
   }
 
   return {
-    accent: 'border-l-emerald-500',
-    dateText: 'text-emerald-400',
-    iconBg: 'bg-emerald-500/20',
-    iconText: 'text-emerald-400',
-    pillClass: '',
+    accentColor: 'var(--success-text)',
+    dateColor: 'var(--success-text)',
+    iconBg: 'var(--success-bg)',
+    iconText: 'var(--success-text)',
+    pillStyle: null,
     pillLabel: '',
   };
 }
 
 function getTimeContextClass(level) {
   if (level === 'critical') {
-    return 'animate-pulse border border-red-500/40 bg-red-500/20 text-red-300';
+    return 'animate-pulse';
+  }
+
+  return '';
+}
+
+function getTimeContextStyle(level) {
+  if (level === 'critical') {
+    return {
+      background: 'var(--error-bg)',
+      borderColor: 'var(--error-border)',
+      color: 'var(--error-text)',
+    };
   }
 
   if (level === 'warning' || level === 'late') {
-    return 'border border-orange-500/40 bg-orange-500/20 text-orange-300';
+    return {
+      background: 'var(--retrasada-bg)',
+      borderColor: 'var(--retrasada-border)',
+      color: 'var(--retrasada-text)',
+    };
   }
 
   if (level === 'closed') {
-    return 'border border-slate-600 bg-slate-700/50 text-slate-400';
+    return {
+      background: 'var(--closed-bg)',
+      borderColor: 'var(--closed-border)',
+      color: 'var(--closed-text)',
+    };
   }
 
-  return '';
+  return {};
 }
 
 function getTimeContextIcon(level) {
@@ -308,22 +340,29 @@ function ActivityCard({
 
   return (
     <article
-      className={`overflow-hidden rounded-[28px] border border-slate-800 border-l-4 bg-slate-950/70 shadow-[0_0_0_1px_rgba(15,23,42,0.5)] ${theme.accent}`}
+      className="overflow-hidden rounded-[28px] border border-l-4 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]"
+      style={{
+        borderColor: 'var(--border)',
+        borderLeftColor: theme.accentColor,
+        background: 'var(--bg-card)',
+      }}
     >
       <div className="p-4">
         <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
           <div className="flex gap-3">
             <div
-              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 ${theme.iconBg}`}
+              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10"
+              style={{ background: theme.iconBg, color: theme.iconText }}
             >
-              <CalendarX className={`h-5 w-5 ${theme.iconText}`} />
+              <CalendarX className="h-5 w-5" />
             </div>
 
             <div className="min-w-0 flex-1">
               <div className="flex flex-wrap items-center gap-2">
                 {topBadgeVisible ? (
                   <span
-                    className={`inline-flex rounded-2xl px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${theme.pillClass}`}
+                    className="inline-flex rounded-2xl border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
+                    style={theme.pillStyle || undefined}
                   >
                     {theme.pillLabel}
                   </span>
@@ -380,7 +419,10 @@ function ActivityCard({
             <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end">
               <div className="min-w-0 text-right">
                 <p className="text-xs text-slate-400">Fecha límite</p>
-                <p className={`mt-1 text-2xl font-semibold tracking-tight sm:text-[2.1rem] ${theme.dateText}`}>
+                <p
+                  className="mt-1 text-2xl font-semibold tracking-tight sm:text-[2.1rem]"
+                  style={{ color: theme.dateColor }}
+                >
                   {resolvedDeadline}
                 </p>
                 {resolvedDeadlineTime ? (
@@ -401,9 +443,10 @@ function ActivityCard({
             {timeContext.label ? (
               <div className="mt-3 flex justify-end">
                 <span
-                  className={`inline-flex items-center gap-2 rounded-2xl px-2.5 py-1 text-xs font-medium ${getTimeContextClass(
+                  className={`inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1 text-xs font-medium ${getTimeContextClass(
                     timeContext.level,
                   )}`}
+                  style={getTimeContextStyle(timeContext.level)}
                 >
                   {TimeBadgeIcon ? <TimeBadgeIcon className="h-3.5 w-3.5" /> : null}
                   {timeContext.label}
```

### `src/index.css`
```diff
diff --git a/src/index.css b/src/index.css
index 1a65f79..90b5048 100644
--- a/src/index.css
+++ b/src/index.css
@@ -15,6 +15,21 @@
   --text-muted: #94a3b8;
   --gradient-from: rgba(0, 109, 182, 0.10);
   --gradient-to: rgba(0, 90, 148, 0.10);
+  --pending-bg: rgba(234, 179, 8, 0.15);
+  --pending-border: rgba(234, 179, 8, 0.35);
+  --pending-text: #fde047;
+  --retrasada-bg: rgba(249, 115, 22, 0.15);
+  --retrasada-border: rgba(249, 115, 22, 0.35);
+  --retrasada-text: #fb923c;
+  --closed-bg: rgba(100, 116, 139, 0.15);
+  --closed-border: rgba(100, 116, 139, 0.30);
+  --closed-text: #94a3b8;
+  --success-bg: rgba(16, 185, 129, 0.15);
+  --success-border: rgba(16, 185, 129, 0.35);
+  --success-text: #34d399;
+  --error-bg: rgba(239, 68, 68, 0.15);
+  --error-border: rgba(239, 68, 68, 0.35);
+  --error-text: #f87171;
 }
 
 body {
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 0993815..2972c41 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -73,14 +73,30 @@ const settingsErrorCodes = new Set([
   'SESSION_EXPIRED',
 ]);
 
-function StatCard({ icon: Icon, label, value }) {
+function StatCard({ icon: Icon, label, value, tone = 'pending' }) {
+  const toneStyles = {
+    pending: {
+      background: 'var(--success-bg)',
+      color: 'var(--success-text)',
+    },
+    retrasada: {
+      background: 'var(--retrasada-bg)',
+      color: 'var(--retrasada-text)',
+    },
+    cerrada: {
+      background: 'var(--closed-bg)',
+      color: 'var(--closed-text)',
+    },
+  };
+  const toneStyle = toneStyles[tone] || toneStyles.pending;
+
   return (
     <article
       className="rounded-2xl border p-5"
       style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
     >
       <div className="flex items-center gap-3">
-        <span className="rounded-2xl p-3" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
+        <span className="rounded-2xl p-3" style={toneStyle}>
           <Icon className="h-5 w-5" />
         </span>
         <div>
@@ -230,9 +246,9 @@ function Actividades({
         </article>
 
         <div className="grid gap-4">
-          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} />
-          <StatCard icon={AlertCircle} label="Retrasadas" value={counts.retrasada} />
-          <StatCard icon={Zap} label="Cerradas" value={counts.cerrada} />
+          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} tone="pending" />
+          <StatCard icon={AlertCircle} label="Retrasadas" value={counts.retrasada} tone="retrasada" />
+          <StatCard icon={Zap} label="Cerradas" value={counts.cerrada} tone="cerrada" />
         </div>
       </section>
```

### `src/pages/Horario.jsx`
```diff
diff --git a/src/pages/Horario.jsx b/src/pages/Horario.jsx
index 0d14de7..ccfb9a7 100644
--- a/src/pages/Horario.jsx
+++ b/src/pages/Horario.jsx
@@ -239,6 +239,16 @@ function compactName(name) {
   return (name || '').length > 30 ? `${name.slice(0, 30)}…` : name || 'Materia';
 }
 
+const presencialCellToneStyle = {
+  background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
+  borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
+};
+
+const onlineCellToneStyle = {
+  background: 'var(--success-bg)',
+  borderColor: 'var(--success-border)',
+};
+
 function ScheduleSkeleton() {
   return (
     <div className="space-y-6">
@@ -525,9 +535,7 @@ function Horario({
                                 const { materia, session } = materiaSlot;
                                 const isOnline = (session?.modalidad || materia.modalidad) === 'en_linea';
                                 const isFirstSlot = isFirstSlotForMateria(materias, day, slot, materiaSlot);
-                                const baseClass = isOnline
-                                  ? 'border-emerald-500/40 bg-emerald-500/20'
-                                  : 'border-itson-blue/40 bg-itson-blue/20';
+                                const slotToneStyle = isOnline ? onlineCellToneStyle : presencialCellToneStyle;
 
                                 return (
                                   <div
@@ -536,7 +544,8 @@ function Horario({
                                   >
                                     {isFirstSlot ? (
                                       <div
-                                        className={`h-full overflow-hidden rounded-lg border px-1.5 py-0.5 ${baseClass}`}
+                                        className="h-full overflow-hidden rounded-lg border px-1.5 py-0.5"
+                                        style={slotToneStyle}
                                       >
                                         <p className="truncate text-[10px] font-semibold leading-tight text-white">
                                           {compactName(materia.nombre)}
@@ -546,7 +555,7 @@ function Horario({
                                         </p>
                                       </div>
                                     ) : (
-                                      <div className={`h-full rounded-b-lg border border-t-0 ${baseClass}`} />
+                                      <div className="h-full rounded-b-lg border border-t-0" style={slotToneStyle} />
                                     )}
                                   </div>
                                 );
```

### `src/themes.js`
```diff
diff --git a/src/themes.js b/src/themes.js
index 466a481..a421106 100644
--- a/src/themes.js
+++ b/src/themes.js
@@ -1,8 +1,27 @@
+const darkStatePalette = {
+  pendingBg: 'rgba(234, 179, 8, 0.15)',
+  pendingBorder: 'rgba(234, 179, 8, 0.35)',
+  pendingText: '#fde047',
+  retrasadaBg: 'rgba(249, 115, 22, 0.15)',
+  retrasadaBorder: 'rgba(249, 115, 22, 0.35)',
+  retrasadaText: '#fb923c',
+  closedBg: 'rgba(100, 116, 139, 0.15)',
+  closedBorder: 'rgba(100, 116, 139, 0.30)',
+  closedText: '#94a3b8',
+  successBg: 'rgba(16, 185, 129, 0.15)',
+  successBorder: 'rgba(16, 185, 129, 0.35)',
+  successText: '#34d399',
+  errorBg: 'rgba(239, 68, 68, 0.15)',
+  errorBorder: 'rgba(239, 68, 68, 0.35)',
+  errorText: '#f87171',
+};
+
 export const THEMES = {
   'itson-dark': {
     id: 'itson-dark',
     name: 'ITSON Oscuro',
     description: 'Tema oficial oscuro con azul ITSON',
+    mode: 'dark',
     bg: '#020617',
     bgCard: 'rgba(2, 6, 23, 0.6)',
     bgSidebar: 'rgba(15, 23, 42, 0.8)',
@@ -14,11 +33,13 @@ export const THEMES = {
     textMuted: '#94a3b8',
     gradientFrom: 'rgba(0, 109, 182, 0.10)',
     gradientTo: 'rgba(0, 90, 148, 0.10)',
+    ...darkStatePalette,
   },
   'itson-classic': {
     id: 'itson-classic',
     name: 'ITSON Clásico',
     description: 'Blanco y azul institucional',
+    mode: 'light',
     bg: '#F0F4F8',
     bgCard: '#FFFFFF',
     bgSidebar: '#FFFFFF',
@@ -30,11 +51,27 @@ export const THEMES = {
     textMuted: '#475569',
     gradientFrom: 'rgba(0, 109, 182, 0.05)',
     gradientTo: 'rgba(0, 90, 148, 0.05)',
+    pendingBg: 'rgba(234, 179, 8, 0.12)',
+    pendingBorder: 'rgba(161, 98, 7, 0.40)',
+    pendingText: '#92400e',
+    retrasadaBg: 'rgba(249, 115, 22, 0.12)',
+    retrasadaBorder: 'rgba(194, 65, 12, 0.40)',
+    retrasadaText: '#9a3412',
+    closedBg: 'rgba(100, 116, 139, 0.12)',
+    closedBorder: 'rgba(71, 85, 105, 0.40)',
+    closedText: '#334155',
+    successBg: 'rgba(16, 185, 129, 0.12)',
+    successBorder: 'rgba(4, 120, 87, 0.40)',
+    successText: '#065f46',
+    errorBg: 'rgba(239, 68, 68, 0.12)',
+    errorBorder: 'rgba(185, 28, 28, 0.40)',
+    errorText: '#7f1d1d',
   },
   midnight: {
     id: 'midnight',
     name: 'Medianoche',
     description: 'Dark profundo con acento violeta',
+    mode: 'dark',
     bg: '#0F0F13',
     bgCard: 'rgba(15, 15, 19, 0.7)',
     bgSidebar: 'rgba(20, 20, 28, 0.9)',
@@ -46,11 +83,14 @@ export const THEMES = {
     textMuted: '#a1a1aa',
     gradientFrom: 'rgba(124, 58, 237, 0.10)',
     gradientTo: 'rgba(109, 40, 217, 0.08)',
+    ...darkStatePalette,
+    successText: '#a78bfa',
   },
   'carbon-green': {
     id: 'carbon-green',
     name: 'Carbón Verde',
     description: 'Dark carbón con acento esmeralda',
+    mode: 'dark',
     bg: '#0A0F0A',
     bgCard: 'rgba(10, 15, 10, 0.7)',
     bgSidebar: 'rgba(15, 22, 15, 0.9)',
@@ -62,11 +102,14 @@ export const THEMES = {
     textMuted: '#86efac',
     gradientFrom: 'rgba(5, 150, 105, 0.10)',
     gradientTo: 'rgba(4, 120, 87, 0.08)',
+    ...darkStatePalette,
+    successText: '#34d399',
   },
   sunset: {
     id: 'sunset',
     name: 'Atardecer',
     description: 'Dark cálido con acento ámbar',
+    mode: 'dark',
     bg: '#0F0A05',
     bgCard: 'rgba(15, 10, 5, 0.7)',
     bgSidebar: 'rgba(22, 15, 8, 0.9)',
@@ -78,6 +121,8 @@ export const THEMES = {
     textMuted: '#fcd34d',
     gradientFrom: 'rgba(217, 119, 6, 0.10)',
     gradientTo: 'rgba(180, 83, 9, 0.08)',
+    ...darkStatePalette,
+    successText: '#fbbf24',
   },
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
✓ 1764 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.28 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-lYzT1SJ0.css        23.27 kB | gzip: 5.39 kB
dist/assets/index-qOU34oel.js        223.79 kB | gzip: 65.47 kB
✓ built in 3.50s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
