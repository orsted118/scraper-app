# Report 054
**Fecha:** 2026-05-26 18:22  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** 456716b — feat: colores de estado adaptativos por tema
**Archivos modificados:** 11

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/ThemeContext.jsx` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/components/TaskPanel.jsx` — archivo actualizado en esta tarea
- `src/index.css` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/pages/Calificaciones.jsx` — archivo actualizado en esta tarea
- `src/pages/Horario.jsx` — archivo actualizado en esta tarea
- `src/themes.js` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 4 | 4 |
| src/ThemeContext.jsx | 6 | 0 |
| src/components/ActivityCard.jsx | 72 | 17 |
| src/components/Sidebar.jsx | 22 | 4 |
| src/components/TaskPanel.jsx | 3 | 3 |
| src/index.css | 6 | 0 |
| src/pages/Actividades.jsx | 68 | 16 |
| src/pages/Ajustes.jsx | 34 | 10 |
| src/pages/Calificaciones.jsx | 60 | 21 |
| src/pages/Horario.jsx | 72 | 26 |
| src/themes.js | 34 | 0 |

## Resumen
Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index cea9f1d..730abd3 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -24,6 +24,7 @@ const VERIFICATION = {
   verificationOutput: `> scraper-app@0.1.0 build
 > vite build
 
+The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
 vite v5.4.21 building for production...
 transforming...
 ✓ 1764 modules transformed.
@@ -31,10 +32,9 @@ rendering chunks...
 computing gzip size...
 dist/index.html                        0.41 kB | gzip: 0.28 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-lYzT1SJ0.css        23.27 kB | gzip: 5.39 kB
-dist/assets/index-qOU34oel.js        223.79 kB | gzip: 65.47 kB
-✓ built in 3.50s
-The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
+dist/assets/index-D2z52HT7.css        23.47 kB | gzip: 5.47 kB
+dist/assets/index-mi80jdxw.js        228.82 kB | gzip: 66.13 kB
+✓ built in 4.44s`,
 };
 
 function ensureReportsDir() {
```

### `src/ThemeContext.jsx`
```diff
diff --git a/src/ThemeContext.jsx b/src/ThemeContext.jsx
index fbded63..86e9932 100644
--- a/src/ThemeContext.jsx
+++ b/src/ThemeContext.jsx
@@ -26,6 +26,12 @@ export function ThemeProvider({ children }) {
     root.style.setProperty('--accent-dark', theme.accentDark);
     root.style.setProperty('--text', theme.text);
     root.style.setProperty('--text-muted', theme.textMuted);
+    root.style.setProperty('--bg-secondary', theme.bgSecondary);
+    root.style.setProperty('--bg-tertiary', theme.bgTertiary);
+    root.style.setProperty('--border-subtle', theme.borderSubtle);
+    root.style.setProperty('--border-normal', theme.borderNormal);
+    root.style.setProperty('--text-strong', theme.textStrong);
+    root.style.setProperty('--text-normal', theme.textNormal);
     root.style.setProperty('--gradient-from', theme.gradientFrom);
     root.style.setProperty('--gradient-to', theme.gradientTo);
     root.style.setProperty('--pending-bg', theme.pendingBg);
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index 69bd68b..628e887 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -342,9 +342,9 @@ function ActivityCard({
     <article
       className="overflow-hidden rounded-[28px] border border-l-4 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]"
       style={{
-        borderColor: 'var(--border)',
+        borderColor: 'var(--border-subtle)',
         borderLeftColor: theme.accentColor,
-        background: 'var(--bg-card)',
+        background: 'var(--bg-secondary)',
       }}
     >
       <div className="p-4">
@@ -372,7 +372,8 @@ function ActivityCard({
               <div className="mt-2 max-w-[55%] overflow-hidden">
                 <h3
                   title={nombre}
-                  className="truncate text-base font-bold tracking-tight text-white sm:text-lg"
+                  className="truncate text-base font-bold tracking-tight sm:text-lg"
+                  style={{ color: 'var(--text-strong)' }}
                 >
                   {nombre}
                 </h3>
@@ -400,13 +401,27 @@ function ActivityCard({
               </p>
 
               <div className="mt-2 flex flex-wrap items-center gap-2">
-                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
+                <span
+                  className="inline-flex items-center gap-2 rounded-lg border px-2 py-0.5 text-xs"
+                  style={{
+                    borderColor: 'var(--border-normal)',
+                    background: 'var(--bg-tertiary)',
+                    color: 'var(--text-normal)',
+                  }}
+                >
                   <Users className="h-3 w-3 text-slate-400" />
                   {modalidad === 'equipo' ? 'En equipo' : 'Individual'}
                 </span>
 
                 {fechaPublicacion ? (
-                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
+                  <span
+                    className="inline-flex items-center gap-2 rounded-lg border px-2 py-0.5 text-xs"
+                    style={{
+                      borderColor: 'var(--border-normal)',
+                      background: 'var(--bg-tertiary)',
+                      color: 'var(--text-normal)',
+                    }}
+                  >
                     <Calendar className="h-3 w-3 text-slate-400" />
                     Publicado: {publicationDate ? formatShortDate(publicationDate) : fechaPublicacion}
                   </span>
@@ -415,7 +430,7 @@ function ActivityCard({
             </div>
           </div>
 
-          <div className="lg:border-l lg:border-slate-800 lg:pl-6">
+          <div className="lg:border-l lg:pl-6" style={{ borderColor: 'var(--border-subtle)' }}>
             <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end">
               <div className="min-w-0 text-right">
                 <p className="text-xs text-slate-400">Fecha límite</p>
@@ -434,9 +449,30 @@ function ActivityCard({
                 type="button"
                 onClick={() => setExpanded((value) => !value)}
                 aria-label={expanded ? 'Contraer actividad' : 'Expandir actividad'}
-                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-700 hover:text-white"
+                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition"
+                style={{
+                  borderColor: 'var(--border-subtle)',
+                  background: 'var(--bg-secondary)',
+                  color: 'var(--text-normal)',
+                }}
+                onMouseEnter={(event) => {
+                  event.currentTarget.style.borderColor = 'var(--border-normal)';
+                  event.currentTarget.style.color = 'var(--text-strong)';
+                }}
+                onFocus={(event) => {
+                  event.currentTarget.style.color = 'var(--text-strong)';
+                  event.currentTarget.style.borderColor = 'var(--border-normal)';
+                }}
+                onBlur={(event) => {
+                  event.currentTarget.style.color = 'var(--text-normal)';
+                  event.currentTarget.style.borderColor = 'var(--border-subtle)';
+                }}
+                onMouseLeave={(event) => {
+                  event.currentTarget.style.borderColor = 'var(--border-subtle)';
+                  event.currentTarget.style.color = 'var(--text-normal)';
+                }}
               >
-                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
+                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
               </button>
             </div>
 
@@ -457,11 +493,14 @@ function ActivityCard({
         </div>
 
         {expanded ? (
-          <div className="mt-4 border-t border-slate-800 pt-3">
+          <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
             <div className="space-y-3">
               {instructionsText ? (
-                <section className="rounded-2xl border border-slate-800 bg-slate-900/45 px-3 py-2">
-                  <div className="flex items-center gap-2 text-slate-300">
+                <section
+                  className="rounded-2xl border px-3 py-2"
+                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+                >
+                  <div className="flex items-center gap-2" style={{ color: 'var(--text-normal)' }}>
                     <AlignLeft className="h-4 w-4 text-slate-500" />
                     <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                       Instrucciones
@@ -469,7 +508,8 @@ function ActivityCard({
                   </div>
 
                   <p
-                    className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300 sm:text-sm ${instructionsClampClass}`}
+                    className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed sm:text-sm ${instructionsClampClass}`}
+                    style={{ color: 'var(--text-normal)' }}
                   >
                     {instructionsText}
                   </p>
@@ -508,16 +548,21 @@ function ActivityCard({
                       return (
                         <div
                           key={`${archivo.url}-${archivo.name}`}
-                          className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-2"
+                          className="flex items-center gap-3 rounded-2xl border px-3 py-2"
+                          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
                         >
-                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60">
+                          <div
+                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
+                            style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}
+                          >
                             <FileIcon className={`h-4 w-4 ${fileMeta.color}`} />
                           </div>
 
                           <div className="min-w-0 flex-1">
                             <p
                               title={archivo.name}
-                              className="max-w-[60%] truncate text-xs font-medium text-slate-100 md:max-w-[120px]"
+                              className="max-w-[60%] truncate text-xs font-medium md:max-w-[120px]"
+                              style={{ color: 'var(--text-strong)' }}
                             >
                               {archivo.name}
                             </p>
@@ -530,8 +575,15 @@ function ActivityCard({
                             type="button"
                             onClick={() => handleDownload(archivo)}
                             disabled={isDownloading}
-                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
+                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
+                            style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}
                             aria-label={`Descargar ${archivo.name}`}
+                            onMouseEnter={(event) => {
+                              event.currentTarget.style.color = 'var(--text-strong)';
+                            }}
+                            onMouseLeave={(event) => {
+                              event.currentTarget.style.color = 'var(--text-normal)';
+                            }}
                           >
                             {isDownloading ? (
                               <Loader2 className="h-3.5 w-3.5 animate-spin" />
@@ -582,7 +634,10 @@ function ActivityCard({
                 </div>
               ) : null}
 
-              <footer className="flex flex-col gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
+              <footer
+                className="flex flex-col gap-3 border-t pt-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"
+                style={{ borderColor: 'var(--border-subtle)' }}
+              >
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" />
                   {estado === 'cerrada' ? (
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index e934af0..aa2d144 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -12,7 +12,7 @@ function Sidebar({ activePage, onNavigate }) {
   return (
     <aside
       className="w-64 rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
-      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
+      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
     >
       <div className="mb-8">
         <div className="flex items-center gap-3">
@@ -43,19 +43,37 @@ function Sidebar({ activePage, onNavigate }) {
               className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                 isActive
                   ? ''
-                  : 'bg-slate-900 hover:bg-slate-800 hover:text-white'
+                  : ''
               }`}
               style={
                 isActive
                   ? { background: 'var(--accent)', color: '#fff' }
-                  : { color: 'var(--text-muted)' }
+                  : {
+                    background: 'var(--bg-secondary)',
+                    color: 'var(--text-muted)',
+                  }
               }
+              onMouseEnter={(event) => {
+                if (!isActive) {
+                  event.currentTarget.style.background = 'var(--bg-tertiary)';
+                  event.currentTarget.style.color = 'var(--text-strong)';
+                }
+              }}
+              onMouseLeave={(event) => {
+                if (!isActive) {
+                  event.currentTarget.style.background = 'var(--bg-secondary)';
+                  event.currentTarget.style.color = 'var(--text-muted)';
+                }
+              }}
             >
               <span className="flex items-center gap-3">
                 <Icon className="h-4 w-4" />
                 {item.label}
               </span>
-              <span className="text-xs uppercase tracking-[0.25em]">
+              <span
+                className="text-xs uppercase tracking-[0.25em]"
+                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
+              >
                 {isActive ? 'Live' : 'Idle'}
               </span>
             </button>
```

### `src/components/TaskPanel.jsx`
```diff
diff --git a/src/components/TaskPanel.jsx b/src/components/TaskPanel.jsx
index 24546a7..a43e9fc 100644
--- a/src/components/TaskPanel.jsx
+++ b/src/components/TaskPanel.jsx
@@ -2,13 +2,13 @@ function TaskPanel({ title, description, children }) {
   return (
     <main
       className="flex-1 rounded-3xl border p-8"
-      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
+      style={{ background: 'var(--bg)', borderColor: 'var(--border-subtle)' }}
     >
-      <header className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
+      <header className="border-b pb-6" style={{ borderColor: 'var(--border-subtle)' }}>
         <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-muted)' }}>
           Workspace
         </p>
-        <h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--text)' }}>
+        <h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--text-strong)' }}>
           {title}
         </h2>
         <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
```

### `src/index.css`
```diff
diff --git a/src/index.css b/src/index.css
index 90b5048..ef532c0 100644
--- a/src/index.css
+++ b/src/index.css
@@ -13,6 +13,12 @@
   --accent-dark: #005a94;
   --text: #f1f5f9;
   --text-muted: #94a3b8;
+  --bg-secondary: rgb(15, 23, 42);
+  --bg-tertiary: rgb(30, 41, 59);
+  --border-subtle: rgb(30, 41, 59);
+  --border-normal: rgb(51, 65, 85);
+  --text-strong: rgb(241, 245, 249);
+  --text-normal: rgb(203, 213, 225);
   --gradient-from: rgba(0, 109, 182, 0.10);
   --gradient-to: rgba(0, 90, 148, 0.10);
   --pending-bg: rgba(234, 179, 8, 0.15);
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 2972c41..ea9f044 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -218,7 +218,9 @@ function Actividades({
                 Portal iVirtual ITSON
               </div>
               <div>
-                <h3 className="text-2xl font-semibold text-white">Extracción real de actividades</h3>
+                <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+                  Extracción real de actividades
+                </h3>
                 <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                   Inicia una sesión contra iVirtual, recorre los cursos inscritos y clasifica actividades
                   en pendientes, retrasadas y cerradas con sus fechas límite, instrucciones y adjuntos.
@@ -278,14 +280,27 @@ function Actividades({
             value={searchQuery}
             onChange={(event) => setSearchQuery(event.target.value)}
             placeholder="Buscar por nombre o materia..."
-            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pl-10 pr-11 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            className="w-full rounded-2xl border px-4 py-3 pl-10 pr-11 text-sm outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            style={{
+              borderColor: 'var(--border-normal)',
+              background: 'var(--bg-secondary)',
+              color: 'var(--text-strong)',
+            }}
           />
           {searchQuery ? (
             <button
               type="button"
               onClick={() => setSearchQuery('')}
               aria-label="Limpiar búsqueda"
-              className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
+              className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition"
+              onMouseEnter={(event) => {
+                event.currentTarget.style.background = 'var(--bg-tertiary)';
+                event.currentTarget.style.color = 'var(--text-strong)';
+              }}
+              onMouseLeave={(event) => {
+                event.currentTarget.style.background = 'transparent';
+                event.currentTarget.style.color = '';
+              }}
             >
               <X className="h-4 w-4" />
             </button>
@@ -295,7 +310,12 @@ function Actividades({
         <select
           value={sortBy}
           onChange={(event) => setSortBy(event.target.value)}
-          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+          style={{
+            borderColor: 'var(--border-normal)',
+            background: 'var(--bg-secondary)',
+            color: 'var(--text-strong)',
+          }}
           aria-label="Ordenar actividades"
         >
           <option value="deadline-asc">Fecha límite (más próxima)</option>
@@ -322,8 +342,28 @@ function Actividades({
                 className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                   isActive
                     ? 'bg-itson-blue text-slate-50'
-                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
+                    : ''
                 }`}
+                style={
+                  isActive
+                    ? undefined
+                    : {
+                      background: 'var(--bg-secondary)',
+                      color: 'var(--text-normal)',
+                    }
+                }
+                onMouseEnter={(event) => {
+                  if (!isActive) {
+                    event.currentTarget.style.background = 'var(--bg-tertiary)';
+                    event.currentTarget.style.color = 'var(--text-strong)';
+                  }
+                }}
+                onMouseLeave={(event) => {
+                  if (!isActive) {
+                    event.currentTarget.style.background = 'var(--bg-secondary)';
+                    event.currentTarget.style.color = 'var(--text-normal)';
+                  }
+                }}
               >
                 {tab.label}
               </button>
@@ -334,16 +374,19 @@ function Actividades({
 
       {loading ? (
         <div className="space-y-4">
-          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+          <section
+            className="rounded-2xl border p-5"
+            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+          >
             <div className="flex items-center justify-between gap-4 text-sm">
-              <span className="text-slate-200">
+              <span style={{ color: 'var(--text-strong)' }}>
                 Escaneando curso {progress?.current || 0} de {progress?.total || 0}: {progress?.curso || 'iniciando...'}
               </span>
               <span className="text-slate-400">
                 {progress?.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0}%
               </span>
             </div>
-            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
+            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
               <div
                 className="h-full rounded-full bg-itson-blue transition-all"
                 style={{
@@ -355,11 +398,12 @@ function Actividades({
           {Array.from({ length: 4 }).map((_, index) => (
             <div
               key={index}
-              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
+              className="animate-pulse rounded-2xl border p-6"
+              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
             >
-              <div className="h-5 w-64 rounded bg-slate-800" />
-              <div className="mt-4 h-4 w-40 rounded bg-slate-800" />
-              <div className="mt-6 h-20 rounded bg-slate-900" />
+              <div className="h-5 w-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="mt-4 h-4 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="mt-6 h-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
             </div>
           ))}
         </div>
@@ -370,14 +414,20 @@ function Actividades({
           ))}
         </div>
       ) : normalizedQuery ? (
-        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+        <div
+          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+        >
           <SearchX className="h-8 w-8 text-slate-600" />
-          <p className="mt-4 text-sm text-slate-300">
+          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
             Sin actividades que coincidan con la búsqueda.
           </p>
         </div>
       ) : (
-        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+        <div
+          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+        >
           {(() => {
             const emptyState = emptyStateConfig[activeTab] || emptyStateConfig.pendiente;
             const EmptyIcon = emptyState.icon;
@@ -385,7 +435,9 @@ function Actividades({
             return (
               <>
                 <EmptyIcon className={`h-8 w-8 ${emptyState.iconClass}`} />
-                <p className="mt-4 text-sm font-semibold text-slate-100">{emptyState.title}</p>
+                <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
+                  {emptyState.title}
+                </p>
                 <p className="mt-2 max-w-md text-sm text-slate-400">{emptyState.subtitle}</p>
               </>
             );
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index 4470724..0ab1c4d 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -28,34 +28,53 @@ function CredentialSection({
   userValueSetter,
 }) {
   return (
-    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+    <section
+      className="rounded-2xl border p-6"
+      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+    >
       <div className="flex items-start gap-3">
         <Icon className="mt-1 h-5 w-5 text-itson-blue" />
         <div className="w-full">
-          <h3 className="text-xl font-semibold text-white">{title}</h3>
+          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+            {title}
+          </h3>
           {note ? <p className="mt-2 text-sm leading-6 text-slate-400">{note}</p> : null}
         </div>
       </div>
 
       <form className="mt-6 space-y-4" onSubmit={onSubmit}>
         <label className="block space-y-2">
-          <span className="text-sm font-medium text-slate-200">{userLabel}</span>
+          <span className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+            {userLabel}
+          </span>
           <input
             type="text"
             value={user}
             onChange={(event) => userValueSetter(event.target.value)}
-            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            style={{
+              borderColor: 'var(--border-normal)',
+              background: 'var(--bg-secondary)',
+              color: 'var(--text-strong)',
+            }}
             placeholder="Ej. 00000279009"
           />
         </label>
 
         <label className="block space-y-2">
-          <span className="text-sm font-medium text-slate-200">{passwordLabel}</span>
+          <span className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+            {passwordLabel}
+          </span>
           <input
             type="password"
             value={password}
             onChange={(event) => passwordValueSetter(event.target.value)}
-            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            style={{
+              borderColor: 'var(--border-normal)',
+              background: 'var(--bg-secondary)',
+              color: 'var(--text-strong)',
+            }}
             placeholder={passwordPlaceholder}
           />
           <p className="text-xs text-slate-500">
@@ -265,7 +284,7 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
 
       <section
         className="rounded-2xl border p-6"
-        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
       >
         <div className="flex items-start gap-3">
           <Palette className="mt-1 h-5 w-5" style={{ color: 'var(--accent)' }} />
@@ -326,12 +345,17 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
         </div>
       </section>
 
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+      <section
+        className="rounded-2xl border p-6"
+        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+      >
         <div className="flex items-start gap-3">
           <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
           <div>
-            <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
-            <ul className="mt-3 space-y-2 text-sm text-slate-300">
+            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+              Estado operativo
+            </h3>
+            <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-normal)' }}>
               <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
               <li>Extracción por curso usando el índice de tareas de Moodle.</li>
               <li>
```

### `src/pages/Calificaciones.jsx`
```diff
diff --git a/src/pages/Calificaciones.jsx b/src/pages/Calificaciones.jsx
index 5d87d6b..a47a6fb 100644
--- a/src/pages/Calificaciones.jsx
+++ b/src/pages/Calificaciones.jsx
@@ -15,11 +15,27 @@ const statusLabels = {
   sin_calificacion: 'Sin calificación',
 };
 
-const statusClasses = {
-  aprobada: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
-  en_riesgo: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
-  reprobada: 'border-red-500/30 bg-red-500/10 text-red-100',
-  sin_calificacion: 'border-slate-700 bg-slate-800/60 text-slate-300',
+const statusStyles = {
+  aprobada: {
+    borderColor: 'rgba(16, 185, 129, 0.3)',
+    background: 'rgba(16, 185, 129, 0.1)',
+    color: 'rgb(209, 250, 229)',
+  },
+  en_riesgo: {
+    borderColor: 'rgba(249, 115, 22, 0.3)',
+    background: 'rgba(249, 115, 22, 0.1)',
+    color: 'rgb(254, 215, 170)',
+  },
+  reprobada: {
+    borderColor: 'rgba(239, 68, 68, 0.3)',
+    background: 'rgba(239, 68, 68, 0.1)',
+    color: 'rgb(254, 202, 202)',
+  },
+  sin_calificacion: {
+    borderColor: 'var(--border-normal)',
+    background: 'var(--bg-tertiary)',
+    color: 'var(--text-normal)',
+  },
 };
 
 const ciaFriendlyErrors = {
@@ -108,9 +124,8 @@ function StatCard({ icon: Icon, label, value, tone = 'default' }) {
 function StatusBadge({ status }) {
   return (
     <span
-      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
-        statusClasses[status] || statusClasses.sin_calificacion
-      }`}
+      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
+      style={statusStyles[status] || statusStyles.sin_calificacion}
     >
       {statusLabels[status] || statusLabels.sin_calificacion}
     </span>
@@ -122,15 +137,25 @@ function PartialChip({ parcial, calificacion }) {
 
   const toneClasses =
     numericValue === null
-      ? 'border border-slate-700 bg-slate-700/50 text-slate-500'
+      ? ''
       : numericValue >= 70
         ? 'bg-emerald-500/20 text-emerald-300'
         : numericValue >= 60
           ? 'bg-orange-500/20 text-orange-300'
           : 'bg-red-500/20 text-red-300';
+  const toneStyle = numericValue === null
+    ? {
+      borderColor: 'var(--border-normal)',
+      background: 'var(--bg-tertiary)',
+      color: 'var(--text-muted)',
+    }
+    : undefined;
 
   return (
-    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClasses}`}>
+    <span
+      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClasses}`}
+      style={toneStyle}
+    >
       <span>{parcial}</span>
       <span>{formatGrade(calificacion)}</span>
     </span>
@@ -143,11 +168,16 @@ function GradeCard({ materia }) {
     : [{ parcial: 'Final', calificacion: null }];
 
   return (
-    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
+    <article
+      className="rounded-2xl border p-6 shadow-lg shadow-slate-950/20"
+      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+    >
       <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
         <div className="space-y-2">
           <div>
-            <h3 className="text-lg font-semibold text-white">{materia.nombre || 'Materia sin nombre'}</h3>
+            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+              {materia.nombre || 'Materia sin nombre'}
+            </h3>
             <p className="text-sm text-slate-400">{materia.clave || 'Clave no disponible'}</p>
           </div>
           <p className="text-sm text-slate-400">
@@ -170,10 +200,13 @@ function GradeCard({ materia }) {
         ))}
       </div>
 
-      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
+      <div
+        className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
+        style={{ borderColor: 'var(--border-subtle)' }}
+      >
         <p className="text-sm text-slate-400">
           Promedio:{' '}
-          <span className="text-slate-100">
+          <span style={{ color: 'var(--text-strong)' }}>
             {materia.promedio === null || materia.promedio === undefined ? '—' : formatGrade(materia.promedio)}
           </span>
         </p>
@@ -247,7 +280,9 @@ function Calificaciones({
               CIA ITSON
             </div>
             <div>
-              <h3 className="text-2xl font-semibold text-white">Calificaciones</h3>
+              <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+                Calificaciones
+              </h3>
               <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                 Consulta el registro académico del semestre actual desde el CIA con caché local,
                 sincronización manual y acceso directo a tu información institucional.
@@ -290,11 +325,12 @@ function Calificaciones({
           {Array.from({ length: 4 }).map((_, index) => (
             <div
               key={index}
-              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
+              className="animate-pulse rounded-2xl border p-6"
+              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
             >
-              <div className="h-5 w-64 rounded bg-slate-800" />
-              <div className="mt-4 h-4 w-40 rounded bg-slate-800" />
-              <div className="mt-6 h-20 rounded bg-slate-900" />
+              <div className="h-5 w-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="mt-4 h-4 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="mt-6 h-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
             </div>
           ))}
         </div>
@@ -305,9 +341,12 @@ function Calificaciones({
           ))}
         </div>
       ) : (
-        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+        <div
+          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+        >
           <BookOpen className="h-8 w-8 text-slate-600" />
-          <p className="mt-4 text-sm text-slate-300">
+          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
             No hay materias disponibles para mostrar.
           </p>
         </div>
```

### `src/pages/Horario.jsx`
```diff
diff --git a/src/pages/Horario.jsx b/src/pages/Horario.jsx
index ccfb9a7..32c8ebc 100644
--- a/src/pages/Horario.jsx
+++ b/src/pages/Horario.jsx
@@ -254,15 +254,22 @@ function ScheduleSkeleton() {
     <div className="space-y-6">
       <div className="space-y-3">
         {Array.from({ length: 4 }).map((_, index) => (
-          <div key={index} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
-            <div className="h-4 w-52 rounded bg-slate-800" />
-            <div className="mt-3 h-3 w-72 rounded bg-slate-800" />
+          <div
+            key={index}
+            className="animate-pulse rounded-2xl border p-4"
+            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+          >
+            <div className="h-4 w-52 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+            <div className="mt-3 h-3 w-72 rounded" style={{ background: 'var(--bg-tertiary)' }} />
           </div>
         ))}
       </div>
-      <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
-        <div className="h-5 w-40 rounded bg-slate-800" />
-        <div className="mt-4 h-60 rounded bg-slate-900" />
+      <div
+        className="animate-pulse rounded-2xl border p-4"
+        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+      >
+        <div className="h-5 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+        <div className="mt-4 h-60 rounded" style={{ background: 'var(--bg-secondary)' }} />
       </div>
     </div>
   );
@@ -351,7 +358,9 @@ function Horario({
               CIA + iVirtual ITSON
             </div>
             <div>
-              <h3 className="text-2xl font-semibold text-white">Horario</h3>
+              <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+                Horario
+              </h3>
               <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                 Consulta tu horario semanal del semestre y los enlaces de videollamada detectados para
                 materias en línea.
@@ -390,9 +399,12 @@ function Horario({
       {loadingHorario ? (
         <ScheduleSkeleton />
       ) : materias.length === 0 ? (
-        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+        <div
+          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+        >
           <Calendar className="h-8 w-8 text-slate-600" />
-          <p className="mt-4 text-sm text-slate-300">
+          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
             No se encontró horario para este semestre.
           </p>
         </div>
@@ -402,7 +414,12 @@ function Horario({
             className="rounded-2xl border p-5"
             style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
           >
-            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Clases en Línea</h4>
+            <h4
+              className="text-sm font-semibold uppercase tracking-[0.2em]"
+              style={{ color: 'var(--text-normal)' }}
+            >
+              Clases en Línea
+            </h4>
             <div className="mt-4 space-y-3">
               {onlineMaterias.length === 0 ? (
                 <p className="text-sm text-slate-400">No hay materias en línea registradas.</p>
@@ -414,7 +431,8 @@ function Horario({
                   return (
                     <article
                       key={materia.numeroClase || `${materia.codigo}-${materia.horaInicio}`}
-                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
+                      className="rounded-2xl border p-4"
+                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
                     >
                       <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                         <div className="flex min-w-0 items-start gap-3">
@@ -422,7 +440,9 @@ function Horario({
                             <Video className="h-4 w-4" />
                           </span>
                           <div className="min-w-0">
-                            <p className="truncate text-sm font-semibold text-white">{materia.nombre}</p>
+                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
+                              {materia.nombre}
+                            </p>
                             <p className="text-xs text-slate-400">{materia.instructor || 'Instructor no disponible'}</p>
                             <p className="mt-1 text-xs text-slate-400">
                               {(materia.dias || []).join(', ') || 'Días no disponibles'} · {format12h(materia.horaInicio)} - {format12h(materia.horaFin)}
@@ -438,8 +458,9 @@ function Horario({
                             className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                               canJoin
                                 ? 'bg-itson-blue text-white hover:bg-itson-blue-light'
-                                : 'cursor-not-allowed bg-slate-700 text-slate-500'
+                                : 'cursor-not-allowed text-slate-500'
                             }`}
+                            style={canJoin ? undefined : { background: 'var(--bg-tertiary)' }}
                           >
                             <ExternalLink className="h-4 w-4" />
                             {canJoin ? 'Unirse' : 'Sin enlace'}
@@ -457,7 +478,12 @@ function Horario({
                                   }))
                                 }
                                 placeholder="Pegar link de Meet/Zoom..."
-                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-itson-blue focus:ring-1 focus:ring-itson-blue/30"
+                                className="w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-itson-blue focus:ring-1 focus:ring-itson-blue/30"
+                                style={{
+                                  borderColor: 'var(--border-normal)',
+                                  background: 'var(--bg-secondary)',
+                                  color: 'var(--text-strong)',
+                                }}
                               />
                               <button
                                 type="button"
@@ -482,21 +508,30 @@ function Horario({
             className="rounded-2xl border p-5"
             style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
           >
-            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Horario semanal</h4>
+            <h4
+              className="text-sm font-semibold uppercase tracking-[0.2em]"
+              style={{ color: 'var(--text-normal)' }}
+            >
+              Horario semanal
+            </h4>
             <div className="mt-4 overflow-x-auto">
               <table
-                className="min-w-max border-separate text-xs text-slate-200"
-                style={{ borderSpacing: '1px' }}
+                className="min-w-max border-separate text-xs"
+                style={{ borderSpacing: '1px', color: 'var(--text-normal)' }}
               >
                 <thead>
                   <tr>
-                    <th className="w-16 rounded-lg bg-slate-900 px-2 py-1.5 text-left text-[10px] text-slate-500">
+                    <th
+                      className="w-16 rounded-lg px-2 py-1.5 text-left text-[10px] text-slate-500"
+                      style={{ background: 'var(--bg-secondary)' }}
+                    >
                       Hora
                     </th>
                     {days.map((day) => (
                       <th
                         key={day}
-                        className="min-w-[100px] rounded-lg bg-slate-900 px-2 py-1.5 text-left text-[11px] text-slate-300"
+                        className="min-w-[100px] rounded-lg px-2 py-1.5 text-left text-[11px]"
+                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-normal)' }}
                       >
                         {day}
                       </th>
@@ -507,8 +542,8 @@ function Horario({
                   {slots.map((slot) => (
                     <tr key={slot} className="h-11">
                       <td
-                        className="w-16 rounded-lg bg-slate-900 px-2 py-1 align-top text-[10px] text-slate-500 overflow-hidden"
-                        style={{ maxHeight: '44px' }}
+                        className="w-16 rounded-lg px-2 py-1 align-top text-[10px] text-slate-500 overflow-hidden"
+                        style={{ maxHeight: '44px', background: 'var(--bg-secondary)' }}
                       >
                         {format12h(slot)}
                       </td>
@@ -518,8 +553,12 @@ function Horario({
                           return (
                             <td
                               key={`${day}-${slot}`}
-                              className="h-11 min-w-[100px] rounded-lg border border-slate-800 bg-slate-900/40 align-top overflow-hidden"
-                              style={{ maxHeight: '44px' }}
+                              className="h-11 min-w-[100px] rounded-lg border align-top overflow-hidden"
+                              style={{
+                                maxHeight: '44px',
+                                borderColor: 'var(--border-subtle)',
+                                background: 'var(--bg-card)',
+                              }}
                             />
                           );
                         }
@@ -527,8 +566,12 @@ function Horario({
                         return (
                           <td
                             key={`${day}-${slot}`}
-                            className="h-11 min-w-[100px] rounded-lg border border-slate-800 bg-slate-900/40 p-0.5 align-top overflow-hidden"
-                            style={{ maxHeight: '44px' }}
+                            className="h-11 min-w-[100px] rounded-lg border p-0.5 align-top overflow-hidden"
+                            style={{
+                              maxHeight: '44px',
+                              borderColor: 'var(--border-subtle)',
+                              background: 'var(--bg-card)',
+                            }}
                           >
                             <div className="flex h-full flex-col gap-px overflow-hidden">
                               {materiaSlots.map((materiaSlot) => {
@@ -547,7 +590,10 @@ function Horario({
                                         className="h-full overflow-hidden rounded-lg border px-1.5 py-0.5"
                                         style={slotToneStyle}
                                       >
-                                        <p className="truncate text-[10px] font-semibold leading-tight text-white">
+                                        <p
+                                          className="truncate text-[10px] font-semibold leading-tight"
+                                          style={{ color: 'var(--text-strong)' }}
+                                        >
                                           {compactName(materia.nombre)}
                                         </p>
                                         <p className="truncate text-[9px] leading-tight text-slate-400">
```

### `src/themes.js`
```diff
diff --git a/src/themes.js b/src/themes.js
index a421106..ea68fcd 100644
--- a/src/themes.js
+++ b/src/themes.js
@@ -16,6 +16,15 @@ const darkStatePalette = {
   errorText: '#f87171',
 };
 
+const defaultDarkSurfaces = {
+  bgSecondary: 'rgb(15, 23, 42)',
+  bgTertiary: 'rgb(30, 41, 59)',
+  borderSubtle: 'rgb(30, 41, 59)',
+  borderNormal: 'rgb(51, 65, 85)',
+  textStrong: 'rgb(241, 245, 249)',
+  textNormal: 'rgb(203, 213, 225)',
+};
+
 export const THEMES = {
   'itson-dark': {
     id: 'itson-dark',
@@ -34,6 +43,7 @@ export const THEMES = {
     gradientFrom: 'rgba(0, 109, 182, 0.10)',
     gradientTo: 'rgba(0, 90, 148, 0.10)',
     ...darkStatePalette,
+    ...defaultDarkSurfaces,
   },
   'itson-classic': {
     id: 'itson-classic',
@@ -66,6 +76,12 @@ export const THEMES = {
     errorBg: 'rgba(239, 68, 68, 0.12)',
     errorBorder: 'rgba(185, 28, 28, 0.40)',
     errorText: '#7f1d1d',
+    bgSecondary: 'rgb(241, 245, 249)',
+    bgTertiary: 'rgb(226, 232, 240)',
+    borderSubtle: 'rgb(203, 213, 225)',
+    borderNormal: 'rgb(148, 163, 184)',
+    textStrong: 'rgb(15, 23, 42)',
+    textNormal: 'rgb(51, 65, 85)',
   },
   midnight: {
     id: 'midnight',
@@ -85,6 +101,12 @@ export const THEMES = {
     gradientTo: 'rgba(109, 40, 217, 0.08)',
     ...darkStatePalette,
     successText: '#a78bfa',
+    bgSecondary: 'rgb(18, 14, 28)',
+    bgTertiary: 'rgb(30, 24, 48)',
+    borderSubtle: 'rgb(39, 31, 58)',
+    borderNormal: 'rgb(55, 44, 80)',
+    textStrong: 'rgb(244, 244, 245)',
+    textNormal: 'rgb(212, 212, 216)',
   },
   'carbon-green': {
     id: 'carbon-green',
@@ -104,6 +126,12 @@ export const THEMES = {
     gradientTo: 'rgba(4, 120, 87, 0.08)',
     ...darkStatePalette,
     successText: '#34d399',
+    bgSecondary: 'rgb(12, 18, 12)',
+    bgTertiary: 'rgb(20, 30, 20)',
+    borderSubtle: 'rgb(26, 46, 26)',
+    borderNormal: 'rgb(37, 62, 37)',
+    textStrong: 'rgb(240, 253, 244)',
+    textNormal: 'rgb(187, 247, 208)',
   },
   sunset: {
     id: 'sunset',
@@ -123,6 +151,12 @@ export const THEMES = {
     gradientTo: 'rgba(180, 83, 9, 0.08)',
     ...darkStatePalette,
     successText: '#fbbf24',
+    bgSecondary: 'rgb(20, 13, 6)',
+    bgTertiary: 'rgb(32, 22, 10)',
+    borderSubtle: 'rgb(45, 31, 14)',
+    borderNormal: 'rgb(62, 43, 18)',
+    textStrong: 'rgb(255, 251, 235)',
+    textNormal: 'rgb(253, 230, 138)',
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

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
vite v5.4.21 building for production...
transforming...
✓ 1764 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.28 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-D2z52HT7.css        23.47 kB | gzip: 5.47 kB
dist/assets/index-mi80jdxw.js        228.82 kB | gzip: 66.13 kB
✓ built in 4.44s
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
