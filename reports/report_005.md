# Report 005
**Fecha:** 2026-05-15 01:03  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/files.js` — archivo actualizado en esta tarea
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `generate-report.js` — archivo actualizado en esta tarea
- `src/pages/Files.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/files.js`
```diff
diff --git a/electron/handlers/files.js b/electron/handlers/files.js
index f2947c0..8b7d468 100644
--- a/electron/handlers/files.js
+++ b/electron/handlers/files.js
@@ -1,4 +1,90 @@
-const { ipcMain } = require('electron');
+const fs = require('fs');
+const path = require('path');
+const { app, ipcMain, session, shell } = require('electron');
+
+function sanitizeFileName(name) {
+  return (name || 'download')
+    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
+    .replace(/\s+/g, ' ')
+    .trim();
+}
+
+function resolveDownloadPath(downloadsDir, fileName) {
+  const parsed = path.parse(fileName);
+  let candidatePath = path.join(downloadsDir, fileName);
+  let index = 1;
+
+  while (fs.existsSync(candidatePath)) {
+    candidatePath = path.join(downloadsDir, `${parsed.name} (${index})${parsed.ext}`);
+    index += 1;
+  }
+
+  return candidatePath;
+}
+
+function downloadFileWithSession(url, name) {
+  return new Promise((resolve) => {
+    if (!url) {
+      resolve({ success: false, error: 'URL de descarga no proporcionada.' });
+      return;
+    }
+
+    const downloadsDir = app.getPath('downloads');
+    const resolvedName = sanitizeFileName(name || path.basename(new URL(url).pathname));
+    const targetPath = resolveDownloadPath(downloadsDir, resolvedName);
+    let settled = false;
+
+    const cleanup = () => {
+      session.defaultSession.removeListener('will-download', handleWillDownload);
+      clearTimeout(timeoutId);
+    };
+
+    const finish = (result) => {
+      if (settled) {
+        return;
+      }
+
+      settled = true;
+      cleanup();
+      resolve(result);
+    };
+
+    const handleWillDownload = (_event, item) => {
+      if (item.getURL() !== url) {
+        return;
+      }
+
+      item.setSavePath(targetPath);
+      item.once('done', async (_downloadEvent, state) => {
+        if (state !== 'completed') {
+          finish({ success: false, error: `La descarga no se completó: ${state}.` });
+          return;
+        }
+
+        const openError = await shell.openPath(targetPath);
+
+        if (openError) {
+          finish({ success: false, error: openError });
+          return;
+        }
+
+        finish({ success: true, path: targetPath });
+      });
+    };
+
+    const timeoutId = setTimeout(() => {
+      finish({ success: false, error: 'La descarga excedió el tiempo de espera.' });
+    }, 120000);
+
+    session.defaultSession.on('will-download', handleWillDownload);
+
+    try {
+      session.defaultSession.downloadURL(url);
+    } catch (error) {
+      finish({ success: false, error: error.message || 'No fue posible iniciar la descarga.' });
+    }
+  });
+}
 
 function registerFileHandlers() {
   ipcMain.handle('files:inspect', async (_event, payload = {}) => ({
@@ -14,8 +100,13 @@ function registerFileHandlers() {
     message: 'Base handler for local file parsing initialized.',
     payload,
   }));
+
+  ipcMain.handle('files:download', async (_event, payload = {}) =>
+    downloadFileWithSession(payload.url, payload.name),
+  );
 }
 
 module.exports = {
+  downloadFileWithSession,
   registerFileHandlers,
 };
```

### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index d78f043..4b62e32 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -1,9 +1,25 @@
-const { ipcMain } = require('electron');
+const { ipcMain, session } = require('electron');
 const { chromium } = require('playwright');
 
 const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
 const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
 
+function mapSameSite(sameSite) {
+  if (sameSite === 'Strict') {
+    return 'strict';
+  }
+
+  if (sameSite === 'Lax') {
+    return 'lax';
+  }
+
+  if (sameSite === 'None') {
+    return 'no_restriction';
+  }
+
+  return 'unspecified';
+}
+
 function normalizeWhitespace(value) {
   return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
 }
@@ -148,7 +164,14 @@ async function collectAssignmentDetails(page, assignment) {
         name: (anchor.textContent || '').trim(),
         url: anchor.href,
       }))
-      .filter((file) => file.name && file.url && file.url.includes('/introattachment/'));
+      .filter(
+        (file) =>
+          file.name &&
+          file.url &&
+          file.url.includes('pluginfile.php') &&
+          !file.url.includes('/user/') &&
+          !file.url.includes('/theme/'),
+      );
 
     const uniqueAttachments = attachments.filter(
       (file, index, array) => index === array.findIndex((entry) => entry.url === file.url),
@@ -183,6 +206,33 @@ async function collectAssignmentDetails(page, assignment) {
   };
 }
 
+async function syncCookiesToElectronSession(playwrightContext) {
+  const cookies = await playwrightContext.cookies();
+
+  await Promise.all(
+    cookies.map((cookie) => {
+      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
+      const url = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path || '/'}`;
+      const cookiePayload = {
+        domain: cookie.domain,
+        httpOnly: cookie.httpOnly,
+        name: cookie.name,
+        path: cookie.path,
+        sameSite: mapSameSite(cookie.sameSite),
+        secure: cookie.secure,
+        url,
+        value: cookie.value,
+      };
+
+      if (typeof cookie.expires === 'number' && cookie.expires > 0) {
+        cookiePayload.expirationDate = cookie.expires;
+      }
+
+      return session.defaultSession.cookies.set(cookiePayload);
+    }),
+  );
+}
+
 async function scrapeIVirtualActivities() {
   const username = process.env.IVIRTUAL_USER;
   const password = process.env.IVIRTUAL_PASS;
@@ -200,6 +250,7 @@ async function scrapeIVirtualActivities() {
     page.setDefaultTimeout(45000);
 
     await loginToIVirtual(page, username, password);
+    await syncCookiesToElectronSession(context);
 
     const courses = await collectCourses(page);
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 8aad27a..5e33709 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -2,6 +2,7 @@ const { contextBridge, ipcRenderer } = require('electron');
 
 contextBridge.exposeInMainWorld('scraperApp', {
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+  downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
   inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
   parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
 });
```

### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 8136390..db8634b 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -130,8 +130,25 @@ function buildDiffMap(diffOutput) {
   return diffMap;
 }
 
+function buildSummary(files) {
+  if (files.length === 0) {
+    return 'No se detectaron cambios pendientes en el working tree para esta tarea.';
+  }
+
+  return `Se registraron ${files.length} archivo(s) modificados en esta tarea. El diff completo se incluye abajo.`;
+}
+
+function buildPendingSection(pendingItems = []) {
+  if (pendingItems.length === 0) {
+    return '- Sin pendientes registrados en esta tarea.';
+  }
+
+  return pendingItems.map((item) => `- ${item}`).join('\n');
+}
+
 function buildReportContent(reportNumber, files, diffOutput) {
   const diffMap = buildDiffMap(diffOutput);
+  const pendingItems = [];
   const modifiedFilesSection = files.length
     ? files
         .map(({ status, filePath }) => `- \`${filePath}\` — ${describeChange(status)}`)
@@ -156,14 +173,13 @@ function buildReportContent(reportNumber, files, diffOutput) {
 ${modifiedFilesSection}
 
 ## Resumen
-Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de handlers y la configuracion minima para continuar el desarrollo del proyecto.
+${buildSummary(files)}
 
 ## Cambios de codigo
 ${codeChangesSection}
 
 ## Pendiente para Claude
-- Validar la direccion visual de la UI base antes de profundizar en componentes interactivos.
-- Confirmar el flujo preferido para desarrollo local Electron + Vite y el contrato de IPC definitivo.
+${buildPendingSection(pendingItems)}
 `;
 }
```

### `src/pages/Files.jsx`
```diff
diff --git a/src/pages/Files.jsx b/src/pages/Files.jsx
index aa51660..3747b4d 100644
--- a/src/pages/Files.jsx
+++ b/src/pages/Files.jsx
@@ -1,7 +1,11 @@
-import { Download, FileText } from 'lucide-react';
+import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
+import { useState } from 'react';
 import ResultsTable from '../components/ResultsTable';
 
 function Files({ activities = [], loading }) {
+  const [downloadingKey, setDownloadingKey] = useState('');
+  const [downloadError, setDownloadError] = useState('');
+
   const attachments = activities.flatMap((activity) =>
     (activity.archivos || []).map((file) => ({
       source: activity.materia,
@@ -11,6 +15,23 @@ function Files({ activities = [], loading }) {
     })),
   );
 
+  const handleDownload = async (file) => {
+    setDownloadingKey(file.url);
+    setDownloadError('');
+
+    try {
+      const result = await window.scraperApp.downloadFile(file.url, file.name);
+
+      if (!result?.success) {
+        setDownloadError(result?.error || 'No fue posible descargar el archivo.');
+      }
+    } catch (_error) {
+      setDownloadError('No fue posible descargar el archivo.');
+    } finally {
+      setDownloadingKey('');
+    }
+  };
+
   return (
     <div className="space-y-6">
       <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
@@ -26,6 +47,13 @@ function Files({ activities = [], loading }) {
         </div>
       </section>
 
+      {downloadError ? (
+        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+          <p>{downloadError}</p>
+        </div>
+      ) : null}
+
       {attachments.length > 0 ? (
         <div className="space-y-3">
           {attachments.map((entry) => (
@@ -40,15 +68,19 @@ function Files({ activities = [], loading }) {
                   {entry.source} · {entry.status}
                 </p>
               </div>
-              <a
-                href={entry.file.url}
-                target="_blank"
-                rel="noreferrer"
+              <button
+                type="button"
+                onClick={() => handleDownload(entry.file)}
+                disabled={downloadingKey === entry.file.url}
                 className="inline-flex w-fit items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
               >
-                <Download className="h-4 w-4" />
-                Descargar
-              </a>
+                {downloadingKey === entry.file.url ? (
+                  <Loader2 className="h-4 w-4 animate-spin" />
+                ) : (
+                  <Download className="h-4 w-4" />
+                )}
+                {downloadingKey === entry.file.url ? 'Descargando...' : 'Descargar'}
+              </button>
             </div>
           ))}
         </div>
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
