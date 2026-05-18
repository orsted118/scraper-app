# Report 021
**Fecha:** 2026-05-18 02:06  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `package-lock.json` — archivo actualizado en esta tarea
- `package.json` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/index.css` — archivo actualizado en esta tarea
- `tailwind.config.js` — archivo actualizado en esta tarea

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `package-lock.json`
```diff
diff --git a/package-lock.json b/package-lock.json
index 727117c..72a344e 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -23,7 +23,6 @@
         "concurrently": "^9.2.1",
         "playwright": "^1.60.0",
         "postcss": "^8.5.14",
-        "tailwind-scrollbar": "^3.1.0",
         "tailwindcss": "^3.4.10",
         "vite": "^5.4.2"
       }
@@ -3468,19 +3467,6 @@
         "url": "https://github.com/sponsors/ljharb"
       }
     },
-    "node_modules/tailwind-scrollbar": {
-      "version": "3.1.0",
-      "resolved": "https://registry.npmjs.org/tailwind-scrollbar/-/tailwind-scrollbar-3.1.0.tgz",
-      "integrity": "sha512-pmrtDIZeHyu2idTejfV59SbaJyvp1VRjYxAjZBH0jnyrPRo6HL1kD5Glz8VPagasqr6oAx6M05+Tuw429Z8jxg==",
-      "dev": true,
-      "license": "MIT",
-      "engines": {
-        "node": ">=12.13.0"
-      },
-      "peerDependencies": {
-        "tailwindcss": "3.x"
-      }
-    },
     "node_modules/tailwindcss": {
       "version": "3.4.19",
       "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.19.tgz",
```

### `package.json`
```diff
diff --git a/package.json b/package.json
index 2bb537d..52c65c8 100644
--- a/package.json
+++ b/package.json
@@ -28,7 +28,6 @@
     "concurrently": "^9.2.1",
     "playwright": "^1.60.0",
     "postcss": "^8.5.14",
-    "tailwind-scrollbar": "^3.1.0",
     "tailwindcss": "^3.4.10",
     "vite": "^5.4.2"
   }
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index e69b01e..cbbe048 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -244,8 +244,8 @@ function ActivityCard({
   const deadlineDate = parseDate(fechaLimite);
   const publicationDate = parseDate(fechaPublicacion);
   const instructionsText = (instrucciones || '').trim();
-  const instructionsPreview =
-    instructionsText.length > 200 ? `${instructionsText.slice(0, 200).trim()}...` : instructionsText;
+  const shouldClampInstructions = !instructionsExpanded && instructionsText.length > 140;
+  const instructionsClampClass = shouldClampInstructions ? 'line-clamp-3' : '';
   const visibleFiles = archivos.slice(0, 3);
   const extraFilesCount = Math.max(0, archivos.length - visibleFiles.length);
   const topBadgeVisible = Boolean(theme.pillLabel);
@@ -310,46 +310,46 @@ function ActivityCard({
     <article
       className={`overflow-hidden rounded-[28px] border border-slate-800 border-l-4 bg-slate-950/70 shadow-[0_0_0_1px_rgba(15,23,42,0.5)] ${theme.accent}`}
     >
-      <div className="p-5 sm:p-6">
-        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
-          <div className="flex gap-4 sm:gap-5">
+      <div className="p-4">
+        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
+          <div className="flex gap-3">
             <div
-              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 ${theme.iconBg}`}
+              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 ${theme.iconBg}`}
             >
-              <CalendarX className={`h-8 w-8 ${theme.iconText}`} />
+              <CalendarX className={`h-5 w-5 ${theme.iconText}`} />
             </div>
 
             <div className="min-w-0 flex-1">
               <div className="flex flex-wrap items-center gap-2">
                 {topBadgeVisible ? (
                   <span
-                    className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${theme.pillClass}`}
+                    className={`inline-flex rounded-2xl px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${theme.pillClass}`}
                   >
                     {theme.pillLabel}
                   </span>
                 ) : null}
               </div>
 
-              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
+              <h3 className="mt-2 text-base font-bold tracking-tight text-white sm:text-lg">
                 {nombre}
               </h3>
 
-              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400 sm:text-base">
+              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                 <span className="inline-flex items-center gap-2">
-                  <Users className="h-4 w-4 shrink-0 text-slate-500" />
+                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                   {cardMeta}
                 </span>
               </p>
 
-              <div className="mt-4 flex flex-wrap items-center gap-2">
-                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
-                  <Users className="h-3.5 w-3.5 text-slate-400" />
+              <div className="mt-2 flex flex-wrap items-center gap-2">
+                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
+                  <Users className="h-3 w-3 text-slate-400" />
                   {modalidad === 'equipo' ? 'En equipo' : 'Individual'}
                 </span>
 
                 {fechaPublicacion ? (
-                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
-                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
+                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
+                    <Calendar className="h-3 w-3 text-slate-400" />
                     Publicado: {publicationDate ? formatShortDate(publicationDate) : fechaPublicacion}
                   </span>
                 ) : null}
@@ -357,15 +357,15 @@ function ActivityCard({
             </div>
           </div>
 
-          <div className="lg:border-l lg:border-slate-800 lg:pl-7">
-            <div className="flex items-start justify-between gap-4 lg:flex-col lg:items-end">
+          <div className="lg:border-l lg:border-slate-800 lg:pl-6">
+            <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end">
               <div className="min-w-0 text-right">
-                <p className="text-sm text-slate-400">Fecha límite</p>
-                <p className={`mt-2 text-3xl font-semibold tracking-tight sm:text-[2.2rem] ${theme.dateText}`}>
+                <p className="text-xs text-slate-400">Fecha límite</p>
+                <p className={`mt-1 text-2xl font-semibold tracking-tight sm:text-[2.1rem] ${theme.dateText}`}>
                   {resolvedDeadline}
                 </p>
                 {resolvedDeadlineTime ? (
-                  <p className="mt-1 text-base text-slate-400 sm:text-lg">{resolvedDeadlineTime}</p>
+                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">{resolvedDeadlineTime}</p>
                 ) : null}
               </div>
 
@@ -373,20 +373,20 @@ function ActivityCard({
                 type="button"
                 onClick={() => setExpanded((value) => !value)}
                 aria-label={expanded ? 'Contraer actividad' : 'Expandir actividad'}
-                className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-700 hover:text-white"
+                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-700 hover:text-white"
               >
-                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
+                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
               </button>
             </div>
 
             {timeContext.label ? (
-              <div className="mt-5 flex justify-end">
+              <div className="mt-3 flex justify-end">
                 <span
-                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${getTimeContextClass(
+                  className={`inline-flex items-center gap-2 rounded-2xl px-2.5 py-1 text-xs font-medium ${getTimeContextClass(
                     timeContext.level,
                   )}`}
                 >
-                  {TimeBadgeIcon ? <TimeBadgeIcon className="h-4 w-4" /> : null}
+                  {TimeBadgeIcon ? <TimeBadgeIcon className="h-3.5 w-3.5" /> : null}
                   {timeContext.label}
                 </span>
               </div>
@@ -395,28 +395,28 @@ function ActivityCard({
         </div>
 
         {expanded ? (
-          <div className="mt-6 border-t border-slate-800 pt-6">
-            <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
+          <div className="mt-4 border-t border-slate-800 pt-3">
+            <div className="space-y-3">
               {instructionsText ? (
-                <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5">
+                <section className="rounded-2xl border border-slate-800 bg-slate-900/45 px-3 py-2">
                   <div className="flex items-center gap-2 text-slate-300">
                     <AlignLeft className="h-4 w-4 text-slate-500" />
-                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
+                    <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                       Instrucciones
                     </h4>
                   </div>
 
-                  <div className={`mt-4 ${instructionsExpanded ? '' : 'max-h-24 overflow-hidden'}`}>
-                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
-                      {instructionsExpanded || instructionsText.length <= 200 ? instructionsText : instructionsPreview}
-                    </p>
-                  </div>
+                  <p
+                    className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300 sm:text-sm ${instructionsClampClass}`}
+                  >
+                    {instructionsText}
+                  </p>
 
-                  {instructionsText.length > 200 ? (
+                  {instructionsText.length > 140 ? (
                     <button
                       type="button"
                       onClick={() => setInstructionsExpanded((value) => !value)}
-                      className="mt-4 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
+                      className="mt-2 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
                     >
                       {instructionsExpanded ? 'Ver menos' : 'Ver más'}
                     </button>
@@ -425,19 +425,19 @@ function ActivityCard({
               ) : null}
 
               {archivos.length > 0 ? (
-                <section className={`${instructionsText ? 'mt-6' : ''}`}>
-                  <div className="flex items-center justify-between gap-4">
+                <section>
+                  <div className="flex items-center justify-between gap-3">
                     <div className="flex items-center gap-2 text-slate-400">
                       <Paperclip className="h-4 w-4" />
-                      <h4 className="text-sm font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
+                      <h4 className="text-xs font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
                     </div>
 
-                    <span className="text-sm text-slate-500">
+                    <span className="text-xs text-slate-500">
                       {archivos.length} archivo{archivos.length === 1 ? '' : 's'}
                     </span>
                   </div>
 
-                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
+                  <div className="mt-2 grid gap-2 lg:grid-cols-3">
                     {visibleFiles.map((archivo) => {
                       const fileMeta = getFileIcon(archivo.name);
                       const FileIcon = fileMeta.icon;
@@ -446,15 +446,15 @@ function ActivityCard({
                       return (
                         <div
                           key={`${archivo.url}-${archivo.name}`}
-                          className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4"
+                          className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-2"
                         >
-                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60">
-                            <FileIcon className={`h-6 w-6 ${fileMeta.color}`} />
+                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60">
+                            <FileIcon className={`h-4 w-4 ${fileMeta.color}`} />
                           </div>
 
                           <div className="min-w-0 flex-1">
-                            <p className="truncate text-sm font-medium text-slate-100">{archivo.name}</p>
-                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
+                            <p className="truncate text-xs font-medium text-slate-100">{archivo.name}</p>
+                            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                               {fileMeta.label}
                             </p>
                           </div>
@@ -463,13 +463,13 @@ function ActivityCard({
                             type="button"
                             onClick={() => handleDownload(archivo)}
                             disabled={isDownloading}
-                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
+                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
                             aria-label={`Descargar ${archivo.name}`}
                           >
                             {isDownloading ? (
-                              <Loader2 className="h-4 w-4 animate-spin" />
+                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                             ) : (
-                              <Download className="h-4 w-4" />
+                              <Download className="h-3.5 w-3.5" />
                             )}
                           </button>
                         </div>
@@ -477,22 +477,24 @@ function ActivityCard({
                     })}
 
                     {extraFilesCount > 0 ? (
-                      <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4 text-center text-slate-300">
+                      <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-2 text-center text-slate-300">
                         <div>
-                          <p className="text-lg font-semibold">+{extraFilesCount} más</p>
-                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Archivos ocultos</p>
+                          <p className="text-sm font-semibold">+{extraFilesCount} más</p>
+                          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
+                            Archivos ocultos
+                          </p>
                         </div>
                       </div>
                     ) : null}
                   </div>
 
                   {archivos.length > 1 ? (
-                    <div className="mt-5 flex justify-end">
+                    <div className="mt-3 flex justify-end">
                       <button
                         type="button"
                         onClick={handleDownloadAll}
                         disabled={downloadingAll}
-                        className="inline-flex items-center gap-2 rounded-2xl border border-itson-blue/50 px-5 py-3 text-sm font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
+                        className="inline-flex items-center gap-2 rounded-2xl border border-itson-blue/50 px-4 py-2 text-sm font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
                       >
                         {downloadingAll ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
@@ -507,13 +509,13 @@ function ActivityCard({
               ) : null}
 
               {downloadError ? (
-                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
-                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+                <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
+                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                   <p>{downloadError}</p>
                 </div>
               ) : null}
 
-              <footer className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
+              <footer className="flex flex-col gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" />
                   {estado === 'cerrada' ? (
```

### `src/index.css`
```diff
diff --git a/src/index.css b/src/index.css
index acb3537..6346888 100644
--- a/src/index.css
+++ b/src/index.css
@@ -29,3 +29,10 @@ a {
     color 0.2s ease,
     opacity 0.2s ease;
 }
+
+.line-clamp-3 {
+  display: -webkit-box;
+  overflow: hidden;
+  -webkit-box-orient: vertical;
+  -webkit-line-clamp: 3;
+}
```

### `tailwind.config.js`
```diff
diff --git a/tailwind.config.js b/tailwind.config.js
index 9167808..d5dd9af 100644
--- a/tailwind.config.js
+++ b/tailwind.config.js
@@ -32,5 +32,5 @@ module.exports = {
       },
     },
   },
-  plugins: [require('tailwind-scrollbar')],
+  plugins: [],
 };
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
