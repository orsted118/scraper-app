# Report 022
**Fecha:** 2026-05-20 23:11  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 44c03a7..8830784 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -7,6 +7,12 @@ const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
 const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
 const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
 const PAGE_TIMEOUT_MS = 20_000;
+const DASHBOARD_NAVIGATION_TIMEOUT_MS = 45_000;
+const COURSE_NAVIGATION_TIMEOUT_MS = 30_000;
+const ACTIVITY_NAVIGATION_TIMEOUT_MS = 20_000;
+const CHUNK_TIMEOUT_MS = 25_000;
+const CHUNK_SIZE = 3;
+const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);
 
 function mapSameSite(sameSite) {
   if (sameSite === 'Strict') {
@@ -40,6 +46,124 @@ async function processInChunks(items, chunkSize, asyncFn) {
   return results;
 }
 
+function isTimeoutError(error) {
+  return Boolean(
+    error &&
+      (error.name === 'TimeoutError' ||
+        /timeout/i.test(error.message || '') ||
+        /timed out/i.test(error.message || '')),
+  );
+}
+
+async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
+  let lastError;
+
+  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
+    try {
+      return await page.goto(url, options);
+    } catch (error) {
+      lastError = error;
+
+      if (!isTimeoutError(error)) {
+        throw error;
+      }
+
+      if (attempt === maxRetries) {
+        throw lastError;
+      }
+
+      await new Promise((resolve) => setTimeout(resolve, 2000));
+    }
+  }
+
+  throw lastError;
+}
+
+async function applyResourceBlocking(page) {
+  await page.route('**/*', (route) => {
+    const resourceType = route.request().resourceType();
+
+    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
+      route.abort();
+      return;
+    }
+
+    route.continue();
+  });
+}
+
+async function createDetailPages(context, count) {
+  const pages = [];
+
+  for (let index = 0; index < count; index += 1) {
+    const detailPage = await context.newPage();
+    detailPage.setDefaultTimeout(PAGE_TIMEOUT_MS);
+    await applyResourceBlocking(detailPage);
+    pages.push(detailPage);
+  }
+
+  return pages;
+}
+
+async function closePages(pages = []) {
+  await Promise.all(pages.map((page) => page.close().catch(() => {})));
+}
+
+function withTimeout(taskFactory, timeoutMs, onTimeout) {
+  return new Promise((resolve) => {
+    let settled = false;
+
+    const finish = (value) => {
+      if (settled) {
+        return;
+      }
+
+      settled = true;
+      clearTimeout(timer);
+      resolve(value);
+    };
+
+    const timer = setTimeout(async () => {
+      if (settled) {
+        return;
+      }
+
+      settled = true;
+
+      if (onTimeout) {
+        await onTimeout().catch(() => {});
+      }
+
+      resolve(null);
+    }, timeoutMs);
+
+    Promise.resolve()
+      .then(taskFactory)
+      .then(
+        (result) => finish(result),
+        async (error) => {
+          if (settled) {
+            return;
+          }
+
+          settled = true;
+          clearTimeout(timer);
+
+          if (isTimeoutError(error)) {
+            if (onTimeout) {
+              await onTimeout().catch(() => {});
+            }
+
+            resolve(null);
+            return;
+          }
+
+          resolve(null);
+        },
+      );
+  });
+}
+
 function getActivitiesCachePath() {
   return path.join(app.getPath('userData'), 'actividades-cache.json');
 }
@@ -93,6 +217,16 @@ function clearActivitiesCache() {
   return { success: true };
 }
 
+function buildScrapeError(message) {
+  try {
+    clearActivitiesCache();
+  } catch (_error) {
+    // Ignore cache cleanup failures.
+  }
+
+  return { error: message };
+}
+
 function parseDueDate(value) {
   if (!value) {
     return null;
@@ -136,11 +270,14 @@ function classifyAssignment({ dueDate, submission, submissionState }) {
 }
 
 async function loginToIVirtual(page, username, password) {
-  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
+  await gotoWithRetry(page, LOGIN_URL, {
+    timeout: DASHBOARD_NAVIGATION_TIMEOUT_MS,
+    waitUntil: 'domcontentloaded',
+  });
   await page.fill('#username', username);
   await page.fill('#password', password);
   await Promise.all([
-    page.waitForLoadState('networkidle').catch(() => {}),
+    page.waitForLoadState('domcontentloaded', { timeout: DASHBOARD_NAVIGATION_TIMEOUT_MS }).catch(() => {}),
     page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
   ]);
 
@@ -151,7 +288,10 @@ async function loginToIVirtual(page, username, password) {
 }
 
 async function collectCourses(page) {
-  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
+  await gotoWithRetry(page, DASHBOARD_URL, {
+    timeout: DASHBOARD_NAVIGATION_TIMEOUT_MS,
+    waitUntil: 'domcontentloaded',
+  });
 
   const courses = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
     const seen = new Set();
@@ -189,7 +329,10 @@ async function collectCourses(page) {
 
 async function collectAssignmentsFromCourse(page, course) {
   const indexUrl = `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=${course.id}`;
-  await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });
+  await gotoWithRetry(page, indexUrl, {
+    timeout: COURSE_NAVIGATION_TIMEOUT_MS,
+    waitUntil: 'domcontentloaded',
+  });
 
   return page.evaluate((courseName) => {
     const tableRows = Array.from(document.querySelectorAll('table.generaltable tbody tr'));
@@ -234,7 +377,10 @@ async function collectAssignmentsFromCourse(page, course) {
 }
 
 async function collectAssignmentDetails(page, assignment) {
-  await page.goto(assignment.url, { waitUntil: 'domcontentloaded' });
+  await gotoWithRetry(page, assignment.url, {
+    timeout: ACTIVITY_NAVIGATION_TIMEOUT_MS,
+    waitUntil: 'domcontentloaded',
+  });
 
   const details = await page.evaluate((courseName) => {
     const normalize = (value) =>
@@ -481,7 +627,7 @@ async function scrapeIVirtualActivities(event) {
   const password = process.env.IVIRTUAL_PASS;
 
   if (!username || !password) {
-    return { error: 'Faltan IVIRTUAL_USER o IVIRTUAL_PASS en el archivo .env local.' };
+    return buildScrapeError('Faltan IVIRTUAL_USER o IVIRTUAL_PASS en el archivo .env local.');
   }
 
   let browser;
@@ -494,22 +640,16 @@ async function scrapeIVirtualActivities(event) {
     page.setDefaultTimeout(PAGE_TIMEOUT_MS);
 
     await loginToIVirtual(page, username, password);
+    await applyResourceBlocking(page);
     await syncCookiesToElectronSession(context);
 
     const courses = await collectCourses(page);
 
     if (courses.length === 0) {
-      return { error: 'No se encontraron cursos visibles en el dashboard de iVirtual.' };
+      return buildScrapeError('No se encontraron cursos visibles en el dashboard de iVirtual.');
     }
 
     const activities = [];
-    const detailPages = await Promise.all(
-      Array.from({ length: 3 }, async () => {
-        const detailPage = await context.newPage();
-        detailPage.setDefaultTimeout(PAGE_TIMEOUT_MS);
-        return detailPage;
-      }),
-    );
 
     if (event?.sender?.send) {
       event.sender.send('scraper:progress', {
@@ -522,36 +662,59 @@ async function scrapeIVirtualActivities(event) {
     for (let courseIndex = 0; courseIndex < courses.length; courseIndex += 1) {
       const course = courses[courseIndex];
       const courseAssignments = await collectAssignmentsFromCourse(page, course);
-      const courseActivities = (await processInChunks(
-        courseAssignments,
-        3,
-        async (assignment, indexInChunk) => {
-          const details = await collectAssignmentDetails(detailPages[indexInChunk], assignment);
-          const estado = classifyAssignment({
-            dueDate: assignment.dueDate,
-            submission: assignment.submission,
-            submissionState: details.submissionState,
-          });
-
-          if (!estado) {
-            return null;
-          }
+      const courseActivities = [];
+
+      for (let chunkIndex = 0; chunkIndex < courseAssignments.length; chunkIndex += CHUNK_SIZE) {
+        const chunk = courseAssignments.slice(chunkIndex, chunkIndex + CHUNK_SIZE);
+        const detailPages = await createDetailPages(context, chunk.length);
+
+        try {
+          const chunkResults = await Promise.all(
+            chunk.map((assignment, indexInChunk) =>
+              withTimeout(
+                async () => {
+                  try {
+                    const details = await collectAssignmentDetails(detailPages[indexInChunk], assignment);
+                    const estado = classifyAssignment({
+                      dueDate: assignment.dueDate,
+                      submission: assignment.submission,
+                      submissionState: details.submissionState,
+                    });
+
+                    if (!estado) {
+                      return null;
+                    }
+
+                    return {
+                      archivos: details.archivos,
+                      estado,
+                      fechaLimite: assignment.dueDate || 'Sin fecha visible',
+                      fechaPublicacion: details.fechaPublicacion || null,
+                      instrucciones: details.instrucciones,
+                      materia: details.materia,
+                      modalidad: details.modalidad || 'individual',
+                      nombre: assignment.title,
+                      rawGrade: assignment.grade,
+                      rawSubmission: assignment.submission,
+                      url: assignment.url,
+                    };
+                  } catch (_error) {
+                    return null;
+                  }
+                },
+                CHUNK_TIMEOUT_MS,
+                async () => {
+                  await detailPages[indexInChunk]?.close().catch(() => {});
+                },
+              ),
+            ),
+          );
 
-          return {
-            archivos: details.archivos,
-            estado,
-            fechaLimite: assignment.dueDate || 'Sin fecha visible',
-            fechaPublicacion: details.fechaPublicacion || null,
-            instrucciones: details.instrucciones,
-            materia: details.materia,
-            modalidad: details.modalidad || 'individual',
-            nombre: assignment.title,
-            rawGrade: assignment.grade,
-            rawSubmission: assignment.submission,
-            url: assignment.url,
-          };
-        },
-      )).filter(Boolean);
+          courseActivities.push(...chunkResults.filter(Boolean));
+        } finally {
+          await closePages(detailPages);
+        }
+      }
 
       courseActivities.forEach((activity, indexWithinCourse) => {
         activities.push({
@@ -576,12 +739,11 @@ async function scrapeIVirtualActivities(event) {
       fromCache: false,
     };
   } catch (error) {
-    return {
-      error:
-        error && error.message
-          ? `Falló la extracción de iVirtual: ${error.message}`
-          : 'Falló la extracción de iVirtual por un error no identificado.',
-    };
+    return buildScrapeError(
+      error && error.message
+        ? `Falló la extracción de iVirtual: ${error.message}`
+        : 'Falló la extracción de iVirtual por un error no identificado.',
+    );
   } finally {
     if (browser) {
       await browser.close();
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 16214b8..7636997 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -46,10 +46,16 @@ function App() {
 
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
 
+  const getFriendlyIVirtualError = (message = '') =>
+    message?.includes('Timeout')
+      ? 'iVirtual tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
+      : message || 'Error desconocido.';
+
   const loadActivities = async ({ clearCacheFirst = false } = {}) => {
     setLoading(true);
     setError('');
     setProgress({ current: 0, total: 0, curso: '' });
+    let response;
 
     try {
       if (!api) {
@@ -68,10 +74,10 @@ function App() {
         }
       }
 
-      const response = await api.runScraper();
+      response = await api.runScraper();
 
       if (response?.error) {
-        setError(response.error);
+        setError(getFriendlyIVirtualError(response.error));
         setActivities([]);
         return;
       }
@@ -84,7 +90,7 @@ function App() {
       }
       setProgress({ current: 0, total: 0, curso: '' });
     } catch (_error) {
-      setError('No fue posible consultar iVirtual. Verifica la conexión y las credenciales locales.');
+      setError(getFriendlyIVirtualError(response?.error || _error?.message || 'Error desconocido.'));
       setActivities([]);
     } finally {
       setLoading(false);
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 5826c30..4484bfa 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -64,6 +64,12 @@ function compareText(left = '', right = '') {
   return left.localeCompare(right, 'es', { sensitivity: 'base', numeric: true });
 }
 
+function getFriendlyErrorMessage(message = '') {
+  return message?.includes('Timeout')
+    ? 'iVirtual tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
+    : message;
+}
+
 function StatCard({ icon: Icon, label, value }) {
   return (
     <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
@@ -84,6 +90,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
   const [activeTab, setActiveTab] = useState('pendiente');
   const [searchQuery, setSearchQuery] = useState('');
   const [sortBy, setSortBy] = useState('deadline-asc');
+  const friendlyError = getFriendlyErrorMessage(error);
   const counts = {
     pendiente: activities.filter((item) => item.estado === 'pendiente').length,
     retrasada: activities.filter((item) => item.estado === 'retrasada').length,
@@ -190,10 +197,10 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
         </div>
       </section>
 
-      {error ? (
+      {friendlyError ? (
         <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
           <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
-          <p>{error}</p>
+          <p>{friendlyError}</p>
         </div>
       ) : null}
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
