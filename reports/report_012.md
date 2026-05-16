# Report 012
**Fecha:** 2026-05-15 19:04  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/notifications.js` — archivo creado como parte de la base inicial
- `electron/main.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/notifications.js`
```diff
diff --git a/electron/handlers/notifications.js b/electron/handlers/notifications.js
new file mode 100644
index 0000000..b306dec
--- /dev/null
+++ b/electron/handlers/notifications.js
@@ -0,0 +1,92 @@
+const DAY_MS = 24 * 60 * 60 * 1000;
+
+function getElectron() {
+  return require('electron');
+}
+
+function parseDueDate(value) {
+  if (!value || typeof value !== 'string') {
+    return null;
+  }
+
+  const parsed = Date.parse(value);
+  return Number.isNaN(parsed) ? null : parsed;
+}
+
+function summarizeUrgentActivities(activities, now = Date.now()) {
+  const list = Array.isArray(activities) ? activities : [];
+  const windowEnd = now + DAY_MS;
+
+  let delayedCount = 0;
+  let expiringCount = 0;
+
+  list.forEach((activity) => {
+    if (!activity || typeof activity !== 'object') {
+      return;
+    }
+
+    const status = String(activity.estado || '').trim().toLowerCase();
+    const dueTime = parseDueDate(activity.fechaLimite);
+
+    if (status === 'retrasada') {
+      delayedCount += 1;
+    }
+
+    if (status === 'pendiente' && dueTime !== null && dueTime >= now && dueTime <= windowEnd) {
+      expiringCount += 1;
+    }
+  });
+
+  return { delayedCount, expiringCount };
+}
+
+function formatCountLabel(count, singular, plural) {
+  return `${count} ${count === 1 ? singular : plural}`;
+}
+
+function checkAndNotify(activities) {
+  const { Notification } = getElectron();
+
+  const supported = typeof Notification?.isSupported === 'function' ? Notification.isSupported() : false;
+  const summary = summarizeUrgentActivities(activities);
+
+  if (!supported) {
+    return {
+      ...summary,
+      supported: false,
+      success: true,
+    };
+  }
+
+  if (summary.delayedCount > 0) {
+    new Notification({
+      body: `Tienes ${formatCountLabel(summary.delayedCount, 'actividad retrasada', 'actividades retrasadas')}. Revisa ScraperApp.`,
+      title: 'Actividades retrasadas en iVirtual',
+    }).show();
+  }
+
+  if (summary.expiringCount > 0) {
+    new Notification({
+      body: `${formatCountLabel(summary.expiringCount, 'actividad', 'actividades')} vencen hoy o mañana.`,
+      title: 'Actividades por vencer',
+    }).show();
+  }
+
+  return {
+    ...summary,
+    supported: true,
+    success: true,
+  };
+}
+
+function registerNotificationHandlers() {
+  const { ipcMain } = getElectron();
+
+  ipcMain.handle('notifications:check', async (_event, activities) => checkAndNotify(activities));
+}
+
+module.exports = {
+  checkAndNotify,
+  registerNotificationHandlers,
+  summarizeUrgentActivities,
+};
```

### `electron/main.js`
```diff
diff --git a/electron/main.js b/electron/main.js
index 0d454a5..81b2b1d 100644
--- a/electron/main.js
+++ b/electron/main.js
@@ -5,6 +5,7 @@ const path = require('path');
 const { registerScraperHandlers } = require('./handlers/scraper');
 const { registerFileHandlers } = require('./handlers/files');
 const { registerSettingsHandlers } = require('./handlers/settings');
+const { registerNotificationHandlers } = require('./handlers/notifications');
 
 function createMainWindow() {
   const mainWindow = new BrowserWindow({
@@ -34,6 +35,7 @@ app.whenReady().then(() => {
   registerScraperHandlers();
   registerFileHandlers();
   registerSettingsHandlers();
+  registerNotificationHandlers();
   createMainWindow();
 
   app.on('activate', () => {
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 507717a..fa1998e 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -5,6 +5,7 @@ contextBridge.exposeInMainWorld('scraperApp', {
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
   getSettings: () => ipcRenderer.invoke('settings:get'),
   saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
+  checkNotifications: (activities) => ipcRenderer.invoke('notifications:check', activities),
   onProgress: (callback) => ipcRenderer.on('scraper:progress', (_event, data) => callback(data)),
   removeProgress: () => ipcRenderer.removeAllListeners('scraper:progress'),
   downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index f495755..2aed887 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -34,14 +34,22 @@ function App() {
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
 
+  const api = typeof window !== 'undefined' ? window.scraperApp : null;
+
   const loadActivities = async ({ clearCacheFirst = false } = {}) => {
     setLoading(true);
     setError('');
     setProgress({ current: 0, total: 0, curso: '' });
 
     try {
+      if (!api) {
+        setError('ScraperApp debe ejecutarse dentro de Electron.');
+        setActivities([]);
+        return;
+      }
+
       if (clearCacheFirst) {
-        const cacheResult = await window.scraperApp.clearCache();
+        const cacheResult = await api.clearCache();
 
         if (cacheResult?.success === false) {
           setError(cacheResult.error || 'No fue posible limpiar el caché local.');
@@ -50,7 +58,7 @@ function App() {
         }
       }
 
-      const response = await window.scraperApp.runScraper();
+      const response = await api.runScraper();
 
       if (response?.error) {
         setError(response.error);
@@ -58,8 +66,12 @@ function App() {
         return;
       }
 
-      setActivities(Array.isArray(response?.activities) ? response.activities : []);
+      const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+      setActivities(activitiesList);
       setLastSyncAt(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
+      if (activitiesList.length > 0 && typeof api.checkNotifications === 'function') {
+        await api.checkNotifications(activitiesList);
+      }
       setProgress({ current: 0, total: 0, curso: '' });
     } catch (_error) {
       setError('No fue posible consultar iVirtual. Verifica la conexión y las credenciales locales.');
@@ -74,7 +86,9 @@ function App() {
   }, []);
 
   useEffect(() => {
-    window.scraperApp.onProgress((data) => {
+    if (!api) return;
+
+    api.onProgress((data) => {
       setProgress({
         current: data?.current || 0,
         total: data?.total || 0,
@@ -83,7 +97,7 @@ function App() {
     });
 
     return () => {
-      window.scraperApp.removeProgress();
+      api.removeProgress();
     };
   }, []);
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
