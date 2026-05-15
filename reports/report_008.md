# Report 008
**Fecha:** 2026-05-15 01:39  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/assets/logo-itson.png` — archivo creado como parte de la base inicial
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/pages/Files.jsx` — archivo actualizado en esta tarea
- `tailwind.config.js` — archivo actualizado en esta tarea

## Resumen
Se registraron 10 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index bbc440e..a9c8955 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -6,6 +6,7 @@ const { chromium } = require('playwright');
 const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
 const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
 const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
+const PAGE_TIMEOUT_MS = 20_000;
 
 function mapSameSite(sameSite) {
   if (sameSite === 'Strict') {
@@ -27,6 +28,18 @@ function normalizeWhitespace(value) {
   return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
 }
 
+async function processInChunks(items, chunkSize, asyncFn) {
+  const results = [];
+
+  for (let index = 0; index < items.length; index += chunkSize) {
+    const chunk = items.slice(index, index + chunkSize);
+    const chunkResults = await Promise.all(chunk.map(asyncFn));
+    results.push(...chunkResults);
+  }
+
+  return results;
+}
+
 function getActivitiesCachePath() {
   return path.join(app.getPath('userData'), 'actividades-cache.json');
 }
@@ -164,7 +177,7 @@ async function collectCourses(page) {
 
 async function collectAssignmentsFromCourse(page, course) {
   const indexUrl = `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=${course.id}`;
-  await page.goto(indexUrl, { waitUntil: 'networkidle' });
+  await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });
 
   return page.evaluate((courseName) => {
     const tableRows = Array.from(document.querySelectorAll('table.generaltable tbody tr'));
@@ -209,7 +222,7 @@ async function collectAssignmentsFromCourse(page, course) {
 }
 
 async function collectAssignmentDetails(page, assignment) {
-  await page.goto(assignment.url, { waitUntil: 'networkidle' });
+  await page.goto(assignment.url, { waitUntil: 'domcontentloaded' });
 
   const details = await page.evaluate((courseName) => {
     const main = document.querySelector('#region-main') || document.body;
@@ -289,7 +302,7 @@ async function syncCookiesToElectronSession(playwrightContext) {
   );
 }
 
-async function scrapeIVirtualActivities() {
+async function scrapeIVirtualActivities(event) {
   const username = process.env.IVIRTUAL_USER;
   const password = process.env.IVIRTUAL_PASS;
 
@@ -302,8 +315,9 @@ async function scrapeIVirtualActivities() {
   try {
     browser = await chromium.launch({ headless: true });
     const context = await browser.newContext();
+    context.setDefaultTimeout(PAGE_TIMEOUT_MS);
     const page = await context.newPage();
-    page.setDefaultTimeout(45000);
+    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
 
     await loginToIVirtual(page, username, password);
     await syncCookiesToElectronSession(context);
@@ -314,33 +328,59 @@ async function scrapeIVirtualActivities() {
       return { error: 'No se encontraron cursos visibles en el dashboard de iVirtual.' };
     }
 
-    const assignments = [];
+    const activities = [];
+    const detailPages = await Promise.all(
+      Array.from({ length: 3 }, async () => {
+        const detailPage = await context.newPage();
+        detailPage.setDefaultTimeout(PAGE_TIMEOUT_MS);
+        return detailPage;
+      }),
+    );
 
-    for (const course of courses) {
-      const courseAssignments = await collectAssignmentsFromCourse(page, course);
-      assignments.push(...courseAssignments);
+    if (event?.sender?.send) {
+      event.sender.send('scraper:progress', {
+        current: 0,
+        total: courses.length,
+        curso: courses[0]?.name || '',
+      });
     }
 
-    const detailPage = await context.newPage();
-    detailPage.setDefaultTimeout(45000);
-    const activities = [];
+    for (let courseIndex = 0; courseIndex < courses.length; courseIndex += 1) {
+      const course = courses[courseIndex];
+      const courseAssignments = await collectAssignmentsFromCourse(page, course);
+      const courseActivities = await processInChunks(
+        courseAssignments,
+        3,
+        async (assignment, indexInChunk) => {
+          const details = await collectAssignmentDetails(detailPages[indexInChunk], assignment);
+          return {
+            archivos: details.archivos,
+            estado: classifyAssignment(assignment),
+            fechaLimite: assignment.dueDate || 'Sin fecha visible',
+            instrucciones: details.instrucciones,
+            materia: details.materia,
+            nombre: assignment.title,
+            rawGrade: assignment.grade,
+            rawSubmission: assignment.submission,
+            url: assignment.url,
+          };
+        },
+      );
 
-    for (let index = 0; index < assignments.length; index += 1) {
-      const assignment = assignments[index];
-      const details = await collectAssignmentDetails(detailPage, assignment);
-
-      activities.push({
-        id: `${index + 1}-${assignment.url.split('id=').pop()}`,
-        archivos: details.archivos,
-        estado: classifyAssignment(assignment),
-        fechaLimite: assignment.dueDate || 'Sin fecha visible',
-        instrucciones: details.instrucciones,
-        materia: details.materia,
-        nombre: assignment.title,
-        rawGrade: assignment.grade,
-        rawSubmission: assignment.submission,
-        url: assignment.url,
+      courseActivities.forEach((activity, indexWithinCourse) => {
+        activities.push({
+          id: `${activities.length + 1}-${course.id}-${indexWithinCourse + 1}`,
+          ...activity,
+        });
       });
+
+      if (event?.sender?.send) {
+        event.sender.send('scraper:progress', {
+          current: courseIndex + 1,
+          total: courses.length,
+          curso: course.name,
+        });
+      }
     }
 
     const cachePayload = writeActivitiesCache(activities);
@@ -363,7 +403,7 @@ async function scrapeIVirtualActivities() {
   }
 }
 
-async function getActivitiesWithCache() {
+async function getActivitiesWithCache(event) {
   const cached = readActivitiesCache();
 
   if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
@@ -374,11 +414,11 @@ async function getActivitiesWithCache() {
     };
   }
 
-  return scrapeIVirtualActivities();
+  return scrapeIVirtualActivities(event);
 }
 
 function registerScraperHandlers() {
-  ipcMain.handle('scraper:run', async () => getActivitiesWithCache());
+  ipcMain.handle('scraper:run', async (event) => getActivitiesWithCache(event));
   ipcMain.handle('scraper:clear-cache', async () => clearActivitiesCache());
 }
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 7c677dd..91f5e6d 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -3,6 +3,8 @@ const { contextBridge, ipcRenderer } = require('electron');
 contextBridge.exposeInMainWorld('scraperApp', {
   clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+  onProgress: (callback) => ipcRenderer.on('scraper:progress', (_event, data) => callback(data)),
+  removeProgress: () => ipcRenderer.removeAllListeners('scraper:progress'),
   downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
   inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
   parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index ac1b6e1..f495755 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -29,6 +29,7 @@ function App() {
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
   const [lastSyncAt, setLastSyncAt] = useState('');
+  const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
 
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
@@ -36,6 +37,7 @@ function App() {
   const loadActivities = async ({ clearCacheFirst = false } = {}) => {
     setLoading(true);
     setError('');
+    setProgress({ current: 0, total: 0, curso: '' });
 
     try {
       if (clearCacheFirst) {
@@ -58,6 +60,7 @@ function App() {
 
       setActivities(Array.isArray(response?.activities) ? response.activities : []);
       setLastSyncAt(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
+      setProgress({ current: 0, total: 0, curso: '' });
     } catch (_error) {
       setError('No fue posible consultar iVirtual. Verifica la conexión y las credenciales locales.');
       setActivities([]);
@@ -70,6 +73,20 @@ function App() {
     loadActivities();
   }, []);
 
+  useEffect(() => {
+    window.scraperApp.onProgress((data) => {
+      setProgress({
+        current: data?.current || 0,
+        total: data?.total || 0,
+        curso: data?.curso || '',
+      });
+    });
+
+    return () => {
+      window.scraperApp.removeProgress();
+    };
+  }, []);
+
   const handleSyncActivities = () => loadActivities({ clearCacheFirst: true });
 
   return (
@@ -83,6 +100,7 @@ function App() {
             lastSyncAt={lastSyncAt}
             loading={loading}
             onSync={handleSyncActivities}
+            progress={progress}
           />
         </TaskPanel>
       </div>
```

### `src/assets/logo-itson.png`
```diff
diff --git a/src/assets/logo-itson.png b/src/assets/logo-itson.png
new file mode 100644
index 0000000..54c826e
Binary files /dev/null and b/src/assets/logo-itson.png differ
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index 971a152..d985fe5 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -1,30 +1,40 @@
-import { Download, FileText, FileType, Image, Presentation, Table } from 'lucide-react';
+import {
+  AlertCircle,
+  Download,
+  FileText,
+  FileType2,
+  ImageIcon,
+  Loader2,
+  Paperclip,
+  Presentation,
+  Table2,
+} from 'lucide-react';
 import { useMemo, useState } from 'react';
 
 function getFileIcon(fileName = '') {
   const lowerName = fileName.toLowerCase();
 
   if (lowerName.endsWith('.pdf')) {
-    return FileText;
+    return { icon: FileText, color: 'text-red-400', type: 'PDF' };
   }
 
   if (/\.(doc|docx)$/.test(lowerName)) {
-    return FileType;
+    return { icon: FileType2, color: 'text-blue-400', type: 'Word' };
   }
 
   if (/\.(xls|xlsx|csv)$/.test(lowerName)) {
-    return Table;
+    return { icon: Table2, color: 'text-green-400', type: 'Excel' };
   }
 
   if (/\.(ppt|pptx)$/.test(lowerName)) {
-    return Presentation;
+    return { icon: Presentation, color: 'text-orange-400', type: 'PowerPoint' };
   }
 
   if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
-    return Image;
+    return { icon: ImageIcon, color: 'text-purple-400', type: 'Imagen' };
   }
 
-  return FileText;
+  return { icon: Paperclip, color: 'text-slate-400', type: 'Otro' };
 }
 
 function getBadgeClass(status) {
@@ -52,6 +62,8 @@ function ActivityCard({
     [archivos.length, instrucciones],
   );
   const [expanded, setExpanded] = useState(!startsCollapsed);
+  const [downloadingKey, setDownloadingKey] = useState('');
+  const [downloadError, setDownloadError] = useState('');
 
   const previewText = (instrucciones || '').trim();
   const shownInstructions =
@@ -59,6 +71,25 @@ function ActivityCard({
       ? previewText
       : `${previewText.slice(0, 200).trim()}...`;
 
+  const visibleFiles = expanded ? archivos : archivos.slice(0, 3);
+
+  const handleDownload = async (archivo) => {
+    setDownloadingKey(archivo.url);
+    setDownloadError('');
+
+    try {
+      const result = await window.scraperApp.downloadFile(archivo.url, archivo.name);
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
     <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
       <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
@@ -80,12 +111,20 @@ function ActivityCard({
         </div>
       ) : null}
 
+      {downloadError ? (
+        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+          <p>{downloadError}</p>
+        </div>
+      ) : null}
+
       {archivos.length > 0 ? (
         <div className="mt-5 space-y-3">
           <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Archivos adjuntos</p>
           <div className="space-y-2">
-            {(expanded ? archivos : archivos.slice(0, 3)).map((archivo) => {
-              const FileIcon = getFileIcon(archivo.name);
+            {visibleFiles.map((archivo) => {
+              const fileMeta = getFileIcon(archivo.name);
+              const FileIcon = fileMeta.icon;
 
               return (
                 <div
@@ -93,18 +132,27 @@ function ActivityCard({
                   className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                 >
                   <div className="flex items-center gap-3">
-                    <FileIcon className="h-4 w-4 text-cyan-400" />
-                    <span className="text-sm text-slate-200">{archivo.name}</span>
+                    <FileIcon className={`h-4 w-4 ${fileMeta.color}`} />
+                    <div className="min-w-0">
+                      <p className="truncate text-sm text-slate-200">{archivo.name}</p>
+                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
+                        {fileMeta.type}
+                      </p>
+                    </div>
                   </div>
-                  <a
-                    href={archivo.url}
-                    target="_blank"
-                    rel="noreferrer"
-                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
+                  <button
+                    type="button"
+                    onClick={() => handleDownload(archivo)}
+                    disabled={downloadingKey === archivo.url}
+                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-itson-blue/50 px-3 py-1 text-xs text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
                   >
-                    <Download className="h-4 w-4" />
-                    Descargar
-                  </a>
+                    {downloadingKey === archivo.url ? (
+                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
+                    ) : (
+                      <Download className="h-3.5 w-3.5" />
+                    )}
+                    {downloadingKey === archivo.url ? 'Descargando...' : 'Descargar'}
+                  </button>
                 </div>
               );
             })}
@@ -116,7 +164,7 @@ function ActivityCard({
         <button
           type="button"
           onClick={() => setExpanded((value) => !value)}
-          className="mt-5 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
+          className="mt-5 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
         >
           {expanded ? 'Ver menos' : 'Ver más'}
         </button>
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 3ced6e3..d27bbd6 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,3 +1,4 @@
+import logoItson from '../assets/logo-itson.png';
 import { Download, FolderCog, ListChecks } from 'lucide-react';
 
 const navigationItems = [
@@ -10,9 +11,9 @@ function Sidebar({ activePage, onNavigate }) {
   return (
     <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
       <div className="mb-8">
-        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">ScraperApp</p>
-        <h1 className="mt-3 text-2xl font-semibold text-white">iVirtual ITSON</h1>
-        <p className="mt-2 text-sm text-slate-400">
+        <img src={logoItson} alt="ITSON" className="h-10 w-auto object-contain" />
+        <p className="mt-3 text-xs text-itson-gray">iVirtual Academic Tracker</p>
+        <p className="mt-3 text-sm text-slate-400">
           Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
         </p>
       </div>
@@ -29,7 +30,7 @@ function Sidebar({ activePage, onNavigate }) {
               onClick={() => onNavigate(item.id)}
               className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                 isActive
-                  ? 'bg-cyan-500 text-slate-950'
+                  ? 'bg-itson-blue text-slate-50'
                   : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
               }`}
             >
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index c0a4084..20b8ac2 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -47,7 +47,7 @@ function StatCard({ icon: Icon, label, value }) {
   return (
     <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
       <div className="flex items-center gap-3">
-        <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-400">
+        <span className="rounded-2xl bg-itson-blue/10 p-3 text-itson-blue">
           <Icon className="h-5 w-5" />
         </span>
         <div>
@@ -59,7 +59,7 @@ function StatCard({ icon: Icon, label, value }) {
   );
 }
 
-function Actividades({ activities = [], error, lastSyncAt, loading, onSync }) {
+function Actividades({ activities = [], error, lastSyncAt, loading, onSync, progress }) {
   const [activeTab, setActiveTab] = useState('pendiente');
   const counts = {
     pendiente: activities.filter((item) => item.estado === 'pendiente').length,
@@ -74,7 +74,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync }) {
         <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
           <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
             <div className="space-y-4">
-              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
+              <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
                 <Globe className="h-3.5 w-3.5" />
                 Portal iVirtual ITSON
               </div>
@@ -92,7 +92,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync }) {
                 type="button"
                 onClick={onSync}
                 disabled={loading}
-                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/50"
+                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
               >
                 <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                 {loading ? 'Sincronizando...' : 'Sincronizar'}
@@ -131,7 +131,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync }) {
                 onClick={() => setActiveTab(tab.id)}
                 className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                   isActive
-                    ? 'bg-cyan-500 text-slate-950'
+                    ? 'bg-itson-blue text-slate-50'
                     : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                 }`}
               >
@@ -143,7 +143,25 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync }) {
       </section>
 
       {loading ? (
-        <div className="space-y-3">
+        <div className="space-y-4">
+          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+            <div className="flex items-center justify-between gap-4 text-sm">
+              <span className="text-slate-200">
+                Escaneando curso {progress?.current || 0} de {progress?.total || 0}: {progress?.curso || 'iniciando...'}
+              </span>
+              <span className="text-slate-400">
+                {progress?.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0}%
+              </span>
+            </div>
+            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
+              <div
+                className="h-full rounded-full bg-itson-blue transition-all"
+                style={{
+                  width: `${progress?.total ? ((progress.current || 0) / progress.total) * 100 : 0}%`,
+                }}
+              />
+            </div>
+          </section>
           {Array.from({ length: 4 }).map((_, index) => (
             <div
               key={index}
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index 4012c6c..c0fd191 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -5,7 +5,7 @@ function Ajustes({ lastSyncAt }) {
     <div className="grid gap-4 lg:grid-cols-2">
       <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
         <div className="flex items-start gap-3">
-          <FolderCog className="mt-1 h-5 w-5 text-cyan-400" />
+          <FolderCog className="mt-1 h-5 w-5 text-itson-blue" />
           <div>
             <h3 className="text-xl font-semibold text-white">Configuración local</h3>
             <p className="mt-2 text-sm leading-6 text-slate-400">
@@ -18,7 +18,7 @@ function Ajustes({ lastSyncAt }) {
 
       <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
         <div className="flex items-start gap-3">
-          <ShieldCheck className="mt-1 h-5 w-5 text-cyan-400" />
+          <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
           <div>
             <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
             <ul className="mt-3 space-y-2 text-sm text-slate-300">
```

### `src/pages/Files.jsx`
```diff
diff --git a/src/pages/Files.jsx b/src/pages/Files.jsx
index 3747b4d..036e1a5 100644
--- a/src/pages/Files.jsx
+++ b/src/pages/Files.jsx
@@ -1,88 +1,73 @@
-import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
-import { useState } from 'react';
+import { FileText } from 'lucide-react';
 import ResultsTable from '../components/ResultsTable';
 
 function Files({ activities = [], loading }) {
-  const [downloadingKey, setDownloadingKey] = useState('');
-  const [downloadError, setDownloadError] = useState('');
-
   const attachments = activities.flatMap((activity) =>
-    (activity.archivos || []).map((file) => ({
-      source: activity.materia,
-      status: activity.estado,
-      detail: `${activity.nombre} -> ${file.name}`,
-      file,
-    })),
+    (activity.archivos || []).map((file) => file),
   );
+  const totals = attachments.reduce((accumulator, file) => {
+    const lowerName = file.name.toLowerCase();
+    let type = 'Otros';
 
-  const handleDownload = async (file) => {
-    setDownloadingKey(file.url);
-    setDownloadError('');
-
-    try {
-      const result = await window.scraperApp.downloadFile(file.url, file.name);
+    if (lowerName.endsWith('.pdf')) type = 'PDF';
+    else if (/\.(doc|docx)$/.test(lowerName)) type = 'Word';
+    else if (/\.(xls|xlsx|csv)$/.test(lowerName)) type = 'Excel';
+    else if (/\.(ppt|pptx)$/.test(lowerName)) type = 'PowerPoint';
+    else if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) type = 'Imágenes';
 
-      if (!result?.success) {
-        setDownloadError(result?.error || 'No fue posible descargar el archivo.');
-      }
-    } catch (_error) {
-      setDownloadError('No fue posible descargar el archivo.');
-    } finally {
-      setDownloadingKey('');
-    }
-  };
+    accumulator[type] = (accumulator[type] || 0) + 1;
+    return accumulator;
+  }, {});
+  const groupedStats = Object.entries(totals)
+    .map(([type, count]) => ({ type, count }))
+    .sort((a, b) => b.count - a.count);
+  const totalFiles = attachments.length;
 
   return (
     <div className="space-y-6">
       <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
         <div className="flex items-start gap-3">
-          <FileText className="mt-1 h-5 w-5 text-cyan-400" />
+          <FileText className="mt-1 h-5 w-5 text-itson-blue" />
           <div>
-            <h3 className="text-xl font-semibold text-white">Descargas detectadas</h3>
+            <h3 className="text-xl font-semibold text-white">Resumen de adjuntos</h3>
             <p className="mt-2 text-sm text-slate-400">
-              Este panel agrupa los archivos adjuntos encontrados dentro de las actividades
-              extraídas desde iVirtual.
+              Este panel concentra el total de archivos encontrados en iVirtual y su distribución
+              por tipo. Las descargas individuales viven dentro de cada actividad.
             </p>
           </div>
         </div>
       </section>
 
-      {downloadError ? (
-        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
-          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
-          <p>{downloadError}</p>
-        </div>
-      ) : null}
+      {groupedStats.length > 0 ? (
+        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
+          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total de archivos</p>
+            <p className="mt-4 text-5xl font-semibold text-white">{totalFiles}</p>
+            <p className="mt-3 text-sm text-slate-400">
+              Adjuntos detectados al recorrer las actividades extraídas del portal.
+            </p>
+          </section>
+
+          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
+              barra de progreso por tipo de archivo
+            </p>
+            {groupedStats.map((item) => {
+              const width = totalFiles > 0 ? `${(item.count / totalFiles) * 100}%` : '0%';
 
-      {attachments.length > 0 ? (
-        <div className="space-y-3">
-          {attachments.map((entry) => (
-            <div
-              key={`${entry.file.url}-${entry.file.name}`}
-              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 md:flex-row md:items-center md:justify-between"
-            >
-              <div>
-                <p className="text-sm font-medium text-white">{entry.file.name}</p>
-                <p className="mt-1 text-sm text-slate-400">{entry.detail}</p>
-                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
-                  {entry.source} · {entry.status}
-                </p>
-              </div>
-              <button
-                type="button"
-                onClick={() => handleDownload(entry.file)}
-                disabled={downloadingKey === entry.file.url}
-                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
-              >
-                {downloadingKey === entry.file.url ? (
-                  <Loader2 className="h-4 w-4 animate-spin" />
-                ) : (
-                  <Download className="h-4 w-4" />
-                )}
-                {downloadingKey === entry.file.url ? 'Descargando...' : 'Descargar'}
-              </button>
-            </div>
-          ))}
+              return (
+                <div key={item.type} className="space-y-2">
+                  <div className="flex items-center justify-between text-sm">
+                    <span className="text-slate-200">{item.type}</span>
+                    <span className="text-slate-400">{item.count}</span>
+                  </div>
+                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
+                    <div className="h-full rounded-full bg-itson-blue" style={{ width }} />
+                  </div>
+                </div>
+              );
+            })}
+          </section>
         </div>
       ) : (
         <ResultsTable rows={[]} loading={loading} />
```

### `tailwind.config.js`
```diff
diff --git a/tailwind.config.js b/tailwind.config.js
index 47598ac..ddd2a34 100644
--- a/tailwind.config.js
+++ b/tailwind.config.js
@@ -1,7 +1,16 @@
 module.exports = {
   content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
   theme: {
-    extend: {},
+    extend: {
+      colors: {
+        itson: {
+          blue: '#006DB6',
+          'blue-dark': '#005a94',
+          'blue-light': '#1a7ec4',
+          gray: '#9CA4AF',
+        },
+      },
+    },
   },
   plugins: [],
 };
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
