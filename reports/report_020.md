# Report 020
**Fecha:** 2026-05-18 01:53  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `package-lock.json` — archivo actualizado en esta tarea
- `package.json` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `tailwind.config.js` — archivo actualizado en esta tarea

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `package-lock.json`
```diff
diff --git a/package-lock.json b/package-lock.json
index 72a344e..727117c 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -23,6 +23,7 @@
         "concurrently": "^9.2.1",
         "playwright": "^1.60.0",
         "postcss": "^8.5.14",
+        "tailwind-scrollbar": "^3.1.0",
         "tailwindcss": "^3.4.10",
         "vite": "^5.4.2"
       }
@@ -3467,6 +3468,19 @@
         "url": "https://github.com/sponsors/ljharb"
       }
     },
+    "node_modules/tailwind-scrollbar": {
+      "version": "3.1.0",
+      "resolved": "https://registry.npmjs.org/tailwind-scrollbar/-/tailwind-scrollbar-3.1.0.tgz",
+      "integrity": "sha512-pmrtDIZeHyu2idTejfV59SbaJyvp1VRjYxAjZBH0jnyrPRo6HL1kD5Glz8VPagasqr6oAx6M05+Tuw429Z8jxg==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=12.13.0"
+      },
+      "peerDependencies": {
+        "tailwindcss": "3.x"
+      }
+    },
     "node_modules/tailwindcss": {
       "version": "3.4.19",
       "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.19.tgz",
```

### `package.json`
```diff
diff --git a/package.json b/package.json
index 52c65c8..2bb537d 100644
--- a/package.json
+++ b/package.json
@@ -28,6 +28,7 @@
     "concurrently": "^9.2.1",
     "playwright": "^1.60.0",
     "postcss": "^8.5.14",
+    "tailwind-scrollbar": "^3.1.0",
     "tailwindcss": "^3.4.10",
     "vite": "^5.4.2"
   }
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index d3f9557..e69b01e 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -396,122 +396,134 @@ function ActivityCard({
 
         {expanded ? (
           <div className="mt-6 border-t border-slate-800 pt-6">
-            {instructionsText ? (
-              <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5">
-                <div className="flex items-center gap-2 text-slate-300">
-                  <AlignLeft className="h-4 w-4 text-slate-500" />
-                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
-                    Instrucciones
-                  </h4>
-                </div>
+            <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
+              {instructionsText ? (
+                <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5">
+                  <div className="flex items-center gap-2 text-slate-300">
+                    <AlignLeft className="h-4 w-4 text-slate-500" />
+                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
+                      Instrucciones
+                    </h4>
+                  </div>
 
-                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
-                  {instructionsExpanded || instructionsText.length <= 200 ? instructionsText : instructionsPreview}
-                </p>
+                  <div className={`mt-4 ${instructionsExpanded ? '' : 'max-h-24 overflow-hidden'}`}>
+                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
+                      {instructionsExpanded || instructionsText.length <= 200 ? instructionsText : instructionsPreview}
+                    </p>
+                  </div>
 
-                {instructionsText.length > 200 ? (
-                  <button
-                    type="button"
-                    onClick={() => setInstructionsExpanded((value) => !value)}
-                    className="mt-4 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
-                  >
-                    {instructionsExpanded ? 'Ver menos' : 'Ver más'}
-                  </button>
-                ) : null}
-              </section>
-            ) : null}
+                  {instructionsText.length > 200 ? (
+                    <button
+                      type="button"
+                      onClick={() => setInstructionsExpanded((value) => !value)}
+                      className="mt-4 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
+                    >
+                      {instructionsExpanded ? 'Ver menos' : 'Ver más'}
+                    </button>
+                  ) : null}
+                </section>
+              ) : null}
+
+              {archivos.length > 0 ? (
+                <section className={`${instructionsText ? 'mt-6' : ''}`}>
+                  <div className="flex items-center justify-between gap-4">
+                    <div className="flex items-center gap-2 text-slate-400">
+                      <Paperclip className="h-4 w-4" />
+                      <h4 className="text-sm font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
+                    </div>
 
-            {archivos.length > 0 ? (
-              <section className={`${instructionsText ? 'mt-6' : ''}`}>
-                <div className="flex items-center justify-between gap-4">
-                  <div className="flex items-center gap-2 text-slate-400">
-                    <Paperclip className="h-4 w-4" />
-                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
+                    <span className="text-sm text-slate-500">
+                      {archivos.length} archivo{archivos.length === 1 ? '' : 's'}
+                    </span>
                   </div>
 
-                  <span className="text-sm text-slate-500">{archivos.length} archivo{archivos.length === 1 ? '' : 's'}</span>
-                </div>
+                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
+                    {visibleFiles.map((archivo) => {
+                      const fileMeta = getFileIcon(archivo.name);
+                      const FileIcon = fileMeta.icon;
+                      const isDownloading = downloadingKey === archivo.url;
 
-                <div className="mt-4 grid gap-3 lg:grid-cols-3">
-                  {visibleFiles.map((archivo) => {
-                    const fileMeta = getFileIcon(archivo.name);
-                    const FileIcon = fileMeta.icon;
-                    const isDownloading = downloadingKey === archivo.url;
-
-                    return (
-                      <div
-                        key={`${archivo.url}-${archivo.name}`}
-                        className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4"
-                      >
-                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60">
-                          <FileIcon className={`h-6 w-6 ${fileMeta.color}`} />
+                      return (
+                        <div
+                          key={`${archivo.url}-${archivo.name}`}
+                          className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4"
+                        >
+                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60">
+                            <FileIcon className={`h-6 w-6 ${fileMeta.color}`} />
+                          </div>
+
+                          <div className="min-w-0 flex-1">
+                            <p className="truncate text-sm font-medium text-slate-100">{archivo.name}</p>
+                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
+                              {fileMeta.label}
+                            </p>
+                          </div>
+
+                          <button
+                            type="button"
+                            onClick={() => handleDownload(archivo)}
+                            disabled={isDownloading}
+                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
+                            aria-label={`Descargar ${archivo.name}`}
+                          >
+                            {isDownloading ? (
+                              <Loader2 className="h-4 w-4 animate-spin" />
+                            ) : (
+                              <Download className="h-4 w-4" />
+                            )}
+                          </button>
                         </div>
-
-                        <div className="min-w-0 flex-1">
-                          <p className="truncate text-sm font-medium text-slate-100">{archivo.name}</p>
-                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{fileMeta.label}</p>
+                      );
+                    })}
+
+                    {extraFilesCount > 0 ? (
+                      <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4 text-center text-slate-300">
+                        <div>
+                          <p className="text-lg font-semibold">+{extraFilesCount} más</p>
+                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Archivos ocultos</p>
                         </div>
-
-                        <button
-                          type="button"
-                          onClick={() => handleDownload(archivo)}
-                          disabled={isDownloading}
-                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
-                          aria-label={`Descargar ${archivo.name}`}
-                        >
-                          {isDownloading ? (
-                            <Loader2 className="h-4 w-4 animate-spin" />
-                          ) : (
-                            <Download className="h-4 w-4" />
-                          )}
-                        </button>
-                      </div>
-                    );
-                  })}
-
-                  {extraFilesCount > 0 ? (
-                    <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4 text-center text-slate-300">
-                      <div>
-                        <p className="text-lg font-semibold">+{extraFilesCount} más</p>
-                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Archivos ocultos</p>
                       </div>
-                    </div>
-                  ) : null}
-                </div>
-
-                {archivos.length > 1 ? (
-                  <div className="mt-5 flex justify-end">
-                    <button
-                      type="button"
-                      onClick={handleDownloadAll}
-                      disabled={downloadingAll}
-                      className="inline-flex items-center gap-2 rounded-2xl border border-itson-blue/50 px-5 py-3 text-sm font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
-                    >
-                      {downloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
-                      {downloadingAll ? 'Descargando...' : 'Descargar todos'}
-                    </button>
+                    ) : null}
                   </div>
-                ) : null}
-              </section>
-            ) : null}
 
-            {downloadError ? (
-              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
-                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
-                <p>{downloadError}</p>
-              </div>
-            ) : null}
+                  {archivos.length > 1 ? (
+                    <div className="mt-5 flex justify-end">
+                      <button
+                        type="button"
+                        onClick={handleDownloadAll}
+                        disabled={downloadingAll}
+                        className="inline-flex items-center gap-2 rounded-2xl border border-itson-blue/50 px-5 py-3 text-sm font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
+                      >
+                        {downloadingAll ? (
+                          <Loader2 className="h-4 w-4 animate-spin" />
+                        ) : (
+                          <Download className="h-4 w-4" />
+                        )}
+                        {downloadingAll ? 'Descargando...' : 'Descargar todos'}
+                      </button>
+                    </div>
+                  ) : null}
+                </section>
+              ) : null}
 
-            <footer className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
-              <div className="flex items-center gap-2">
-                <Calendar className="h-4 w-4" />
-                {estado === 'cerrada' ? (
-                  <span>Cerrada el: {footerClosed}</span>
-                ) : footerPublication ? (
-                  <span>Publicado: {footerPublication}</span>
-                ) : null}
-              </div>
-            </footer>
+              {downloadError ? (
+                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+                  <p>{downloadError}</p>
+                </div>
+              ) : null}
+
+              <footer className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
+                <div className="flex items-center gap-2">
+                  <Calendar className="h-4 w-4" />
+                  {estado === 'cerrada' ? (
+                    <span>Cerrada el: {footerClosed}</span>
+                  ) : footerPublication ? (
+                    <span>Publicado: {footerPublication}</span>
+                  ) : null}
+                </div>
+              </footer>
+            </div>
           </div>
         ) : null}
       </div>
```

### `tailwind.config.js`
```diff
diff --git a/tailwind.config.js b/tailwind.config.js
index d5dd9af..9167808 100644
--- a/tailwind.config.js
+++ b/tailwind.config.js
@@ -32,5 +32,5 @@ module.exports = {
       },
     },
   },
-  plugins: [],
+  plugins: [require('tailwind-scrollbar')],
 };
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
