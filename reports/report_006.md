# Report 006
**Fecha:** 2026-05-15 01:08  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 4b62e32..bbc440e 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -1,8 +1,11 @@
-const { ipcMain, session } = require('electron');
+const fs = require('fs');
+const path = require('path');
+const { app, ipcMain, session } = require('electron');
 const { chromium } = require('playwright');
 
 const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
 const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
+const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
 
 function mapSameSite(sameSite) {
   if (sameSite === 'Strict') {
@@ -24,6 +27,59 @@ function normalizeWhitespace(value) {
   return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
 }
 
+function getActivitiesCachePath() {
+  return path.join(app.getPath('userData'), 'actividades-cache.json');
+}
+
+function readActivitiesCache() {
+  const cachePath = getActivitiesCachePath();
+
+  if (!fs.existsSync(cachePath)) {
+    return null;
+  }
+
+  try {
+    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
+
+    if (
+      !parsed ||
+      typeof parsed.timestamp !== 'number' ||
+      !Array.isArray(parsed.actividades)
+    ) {
+      return null;
+    }
+
+    return parsed;
+  } catch (_error) {
+    return null;
+  }
+}
+
+function writeActivitiesCache(activities) {
+  const cachePayload = {
+    timestamp: Date.now(),
+    actividades: activities,
+  };
+
+  fs.writeFileSync(
+    getActivitiesCachePath(),
+    JSON.stringify(cachePayload, null, 2),
+    'utf8',
+  );
+
+  return cachePayload;
+}
+
+function clearActivitiesCache() {
+  const cachePath = getActivitiesCachePath();
+
+  if (fs.existsSync(cachePath)) {
+    fs.unlinkSync(cachePath);
+  }
+
+  return { success: true };
+}
+
 function parseDueDate(value) {
   if (!value) {
     return null;
@@ -202,7 +258,7 @@ async function collectAssignmentDetails(page, assignment) {
   return {
     archivos: details.archivos,
     instrucciones: instructions,
-      materia: details.materia,
+    materia: details.materia,
   };
 }
 
@@ -287,7 +343,12 @@ async function scrapeIVirtualActivities() {
       });
     }
 
-    return { activities };
+    const cachePayload = writeActivitiesCache(activities);
+    return {
+      activities,
+      timestamp: cachePayload.timestamp,
+      fromCache: false,
+    };
   } catch (error) {
     return {
       error:
@@ -302,11 +363,31 @@ async function scrapeIVirtualActivities() {
   }
 }
 
+async function getActivitiesWithCache() {
+  const cached = readActivitiesCache();
+
+  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
+    return {
+      activities: cached.actividades,
+      timestamp: cached.timestamp,
+      fromCache: true,
+    };
+  }
+
+  return scrapeIVirtualActivities();
+}
+
 function registerScraperHandlers() {
-  ipcMain.handle('scraper:run', async () => scrapeIVirtualActivities());
+  ipcMain.handle('scraper:run', async () => getActivitiesWithCache());
+  ipcMain.handle('scraper:clear-cache', async () => clearActivitiesCache());
 }
 
 module.exports = {
+  clearActivitiesCache,
+  getActivitiesCachePath,
+  getActivitiesWithCache,
   registerScraperHandlers,
+  readActivitiesCache,
   scrapeIVirtualActivities,
+  writeActivitiesCache,
 };
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 5e33709..7c677dd 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -1,6 +1,7 @@
 const { contextBridge, ipcRenderer } = require('electron');
 
 contextBridge.exposeInMainWorld('scraperApp', {
+  clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
   downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
   inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index f4504f2..ac1b6e1 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -33,11 +33,21 @@ function App() {
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
 
-  const handleRefreshActivities = async () => {
+  const loadActivities = async ({ clearCacheFirst = false } = {}) => {
     setLoading(true);
     setError('');
 
     try {
+      if (clearCacheFirst) {
+        const cacheResult = await window.scraperApp.clearCache();
+
+        if (cacheResult?.success === false) {
+          setError(cacheResult.error || 'No fue posible limpiar el caché local.');
+          setActivities([]);
+          return;
+        }
+      }
+
       const response = await window.scraperApp.runScraper();
 
       if (response?.error) {
@@ -47,7 +57,7 @@ function App() {
       }
 
       setActivities(Array.isArray(response?.activities) ? response.activities : []);
-      setLastSyncAt(new Date().toISOString());
+      setLastSyncAt(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
     } catch (_error) {
       setError('No fue posible consultar iVirtual. Verifica la conexión y las credenciales locales.');
       setActivities([]);
@@ -57,9 +67,11 @@ function App() {
   };
 
   useEffect(() => {
-    handleRefreshActivities();
+    loadActivities();
   }, []);
 
+  const handleSyncActivities = () => loadActivities({ clearCacheFirst: true });
+
   return (
     <div className="min-h-screen bg-slate-950 text-slate-100">
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
@@ -70,7 +82,7 @@ function App() {
             error={error}
             lastSyncAt={lastSyncAt}
             loading={loading}
-            onRefresh={handleRefreshActivities}
+            onSync={handleSyncActivities}
           />
         </TaskPanel>
       </div>
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 0c789c5..c0a4084 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -1,8 +1,7 @@
 import {
   AlertCircle,
   Globe,
-  Loader2,
-  Play,
+  RefreshCw,
   Search,
   Zap,
 } from 'lucide-react';
@@ -17,13 +16,31 @@ const tabs = [
 
 function formatLastSync(lastSyncAt) {
   if (!lastSyncAt) {
-    return 'Aún no se ha realizado una consulta.';
+    return 'Última sync: aún no disponible.';
   }
 
-  return new Intl.DateTimeFormat('es-MX', {
+  const syncDate = new Date(lastSyncAt);
+  const now = new Date();
+  const diffMs = Math.max(0, now.getTime() - syncDate.getTime());
+  const diffMinutes = Math.floor(diffMs / 60000);
+
+  if (diffMinutes < 60) {
+    return `Última sync: hace ${Math.max(1, diffMinutes)} minuto${diffMinutes === 1 ? '' : 's'}`;
+  }
+
+  const isToday = syncDate.toDateString() === now.toDateString();
+
+  if (isToday) {
+    return `Última sync: hoy ${new Intl.DateTimeFormat('es-MX', {
+      hour: '2-digit',
+      minute: '2-digit',
+    }).format(syncDate)}`;
+  }
+
+  return `Última sync: ${new Intl.DateTimeFormat('es-MX', {
     dateStyle: 'medium',
     timeStyle: 'short',
-  }).format(new Date(lastSyncAt));
+  }).format(syncDate)}`;
 }
 
 function StatCard({ icon: Icon, label, value }) {
@@ -42,7 +59,7 @@ function StatCard({ icon: Icon, label, value }) {
   );
 }
 
-function Actividades({ activities = [], error, lastSyncAt, loading, onRefresh }) {
+function Actividades({ activities = [], error, lastSyncAt, loading, onSync }) {
   const [activeTab, setActiveTab] = useState('pendiente');
   const counts = {
     pendiente: activities.filter((item) => item.estado === 'pendiente').length,
@@ -70,20 +87,22 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onRefresh })
               </div>
             </div>
 
-            <button
-              type="button"
-              onClick={onRefresh}
-              disabled={loading}
-              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/50"
-            >
-              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
-              {loading ? 'Consultando iVirtual...' : 'Actualizar actividades'}
-            </button>
-          </div>
+            <div className="space-y-3">
+              <button
+                type="button"
+                onClick={onSync}
+                disabled={loading}
+                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/50"
+              >
+                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
+                {loading ? 'Sincronizando...' : 'Sincronizar'}
+              </button>
 
-          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-slate-500">
-            Última sincronización: {formatLastSync(lastSyncAt)}
-          </p>
+              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
+                {formatLastSync(lastSyncAt)}
+              </p>
+            </div>
+          </div>
         </article>
 
         <div className="grid gap-4">
@@ -125,7 +144,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onRefresh })
 
       {loading ? (
         <div className="space-y-3">
-          {Array.from({ length: 3 }).map((_, index) => (
+          {Array.from({ length: 4 }).map((_, index) => (
             <div
               key={index}
               className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
