# Report 025
**Fecha:** 2026-05-21 00:14  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/files.js` — archivo actualizado en esta tarea
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/files.js`
```diff
diff --git a/electron/handlers/files.js b/electron/handlers/files.js
index 8b7d468..dc8180d 100644
--- a/electron/handlers/files.js
+++ b/electron/handlers/files.js
@@ -3,10 +3,30 @@ const path = require('path');
 const { app, ipcMain, session, shell } = require('electron');
 
 function sanitizeFileName(name) {
-  return (name || 'download')
+  const sanitized = (name || '')
     .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
     .replace(/\s+/g, ' ')
     .trim();
+
+  return sanitized || 'archivo-descargado';
+}
+
+function getFileNameFromUrl(url) {
+  try {
+    const parsedUrl = new URL(url);
+    const baseName = path.basename(parsedUrl.pathname || '');
+    if (!baseName || baseName === '/') {
+      return '';
+    }
+
+    try {
+      return decodeURIComponent(baseName);
+    } catch (_error) {
+      return baseName;
+    }
+  } catch (_error) {
+    return '';
+  }
 }
 
 function resolveDownloadPath(downloadsDir, fileName) {
@@ -30,7 +50,7 @@ function downloadFileWithSession(url, name) {
     }
 
     const downloadsDir = app.getPath('downloads');
-    const resolvedName = sanitizeFileName(name || path.basename(new URL(url).pathname));
+    const resolvedName = sanitizeFileName(name || getFileNameFromUrl(url) || 'archivo-descargado');
     const targetPath = resolveDownloadPath(downloadsDir, resolvedName);
     let settled = false;
```

### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 42f7a28..56e8a3d 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -11,6 +11,7 @@ const DASHBOARD_NAVIGATION_TIMEOUT_MS = 45_000;
 const COURSE_NAVIGATION_TIMEOUT_MS = 30_000;
 const ACTIVITY_NAVIGATION_TIMEOUT_MS = 20_000;
 const CHUNK_TIMEOUT_MS = 25_000;
+const GLOBAL_SCRAPE_TIMEOUT_MS = 5 * 60 * 1000;
 const CHUNK_SIZE = 3;
 const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);
 
@@ -768,9 +769,17 @@ async function scrapeIVirtualActivities(event) {
       }
     }
 
-    const cachePayload = writeActivitiesCache(activities);
+    const validActivities = activities.filter(
+      (activity) =>
+        activity &&
+        typeof activity.nombre === 'string' &&
+        activity.nombre.trim().length > 0 &&
+        ['pendiente', 'retrasada', 'cerrada'].includes(activity.estado),
+    );
+
+    const cachePayload = writeActivitiesCache(validActivities);
     return {
-      activities,
+      activities: validActivities,
       timestamp: cachePayload.timestamp,
       fromCache: false,
     };
@@ -802,7 +811,24 @@ async function getActivitiesWithCache(event) {
     };
   }
 
-  return scrapeIVirtualActivities(event);
+  let timeoutId;
+  const timeoutPromise = new Promise((resolve) => {
+    timeoutId = setTimeout(
+      () =>
+        resolve(
+          buildScrapeError(
+            'El escaneo tardó demasiado. iVirtual puede estar lento. Intenta de nuevo.',
+          ),
+        ),
+      GLOBAL_SCRAPE_TIMEOUT_MS,
+    );
+  });
+
+  const scrapePromise = Promise.resolve(scrapeIVirtualActivities(event)).finally(() => {
+    clearTimeout(timeoutId);
+  });
+
+  return Promise.race([scrapePromise, timeoutPromise]);
 }
 
 function registerScraperHandlers() {
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index b8e47f6..a31bcdb 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -250,7 +250,6 @@ function ActivityCard({
   const visibleFiles = showAllFiles ? archivos : archivos.slice(0, 3);
   const extraFilesCount = Math.max(0, archivos.length - 3);
   const topBadgeVisible = Boolean(theme.pillLabel);
-  const cardMeta = [materia, profesor].filter(Boolean).join(' | ') || 'Materia no disponible';
   const TimeBadgeIcon = getTimeContextIcon(timeContext.level);
 
   const resolvedDeadline = deadlineDate ? formatShortDate(deadlineDate) : fechaLimite || 'Sin fecha visible';
@@ -331,15 +330,34 @@ function ActivityCard({
                 ) : null}
               </div>
 
-              <h3 className="mt-2 text-base font-bold tracking-tight text-white sm:text-lg">
-                {nombre}
-              </h3>
+              <div className="mt-2 max-w-[55%] overflow-hidden">
+                <h3
+                  title={nombre}
+                  className="truncate text-base font-bold tracking-tight text-white sm:text-lg"
+                >
+                  {nombre}
+                </h3>
+              </div>
 
-              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
-                <span className="inline-flex items-center gap-2">
-                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
-                  {cardMeta}
+              <p className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-400">
+                <span
+                  title={materia || 'Materia no disponible'}
+                  className="min-w-0 max-w-full line-clamp-1 overflow-hidden"
+                >
+                  {materia || 'Materia no disponible'}
                 </span>
+
+                {profesor ? (
+                  <>
+                    <span className="text-slate-600">|</span>
+                    <span
+                      title={profesor}
+                      className="min-w-0 truncate text-slate-400"
+                    >
+                      {profesor}
+                    </span>
+                  </>
+                ) : null}
               </p>
 
               <div className="mt-2 flex flex-wrap items-center gap-2">
@@ -454,7 +472,12 @@ function ActivityCard({
                           </div>
 
                           <div className="min-w-0 flex-1">
-                            <p className="truncate text-xs font-medium text-slate-100">{archivo.name}</p>
+                            <p
+                              title={archivo.name}
+                              className="max-w-[60%] truncate text-xs font-medium text-slate-100 md:max-w-[120px]"
+                            >
+                              {archivo.name}
+                            </p>
                             <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                               {fileMeta.label}
                             </p>
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 21d1c0a..4a7b16b 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -47,18 +47,12 @@ function formatLastSync(lastSyncAt) {
   }).format(syncDate)}`;
 }
 
-function parseActivityDate(value) {
-  if (!value || typeof value !== 'string') {
+function parseSort(fechaLimite) {
+  if (!fechaLimite || fechaLimite === 'Sin fecha visible') {
     return null;
   }
 
-  const trimmedValue = value.trim();
-
-  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
-    return null;
-  }
-
-  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
+  const parsed = Date.parse(fechaLimite);
   return Number.isNaN(parsed) ? null : parsed;
 }
 
@@ -128,28 +122,28 @@ function Actividades({
   const sortedActivities = useMemo(() => {
     const items = [...filteredActivities];
 
-    const sortByDeadline = (ascending) => (left, right) => {
-      const leftDate = parseActivityDate(left.fechaLimite);
-      const rightDate = parseActivityDate(right.fechaLimite);
+    if (sortBy === 'deadline-asc' || sortBy === 'deadline-desc') {
+      return items.sort((left, right) => {
+        const leftDate = parseSort(left.fechaLimite);
+        const rightDate = parseSort(right.fechaLimite);
 
-      if (leftDate === null && rightDate === null) {
-        return compareText(left.nombre || '', right.nombre || '');
-      }
+        if (leftDate === null && rightDate === null) {
+          return 0;
+        }
 
-      if (leftDate === null) {
-        return 1;
-      }
+        if (leftDate === null) {
+          return 1;
+        }
 
-      if (rightDate === null) {
-        return -1;
-      }
+        if (rightDate === null) {
+          return -1;
+        }
 
-      return ascending ? leftDate - rightDate : rightDate - leftDate;
-    };
+        return sortBy === 'deadline-asc' ? leftDate - rightDate : rightDate - leftDate;
+      });
+    }
 
     switch (sortBy) {
-      case 'deadline-desc':
-        return items.sort(sortByDeadline(false));
       case 'name-asc':
         return items.sort((left, right) =>
           compareText(left.nombre || '', right.nombre || '') ||
@@ -160,9 +154,8 @@ function Actividades({
           compareText(left.materia || '', right.materia || '') ||
           compareText(left.nombre || '', right.nombre || ''),
         );
-      case 'deadline-asc':
       default:
-        return items.sort(sortByDeadline(true));
+        return items;
     }
   }, [filteredActivities, sortBy]);
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
