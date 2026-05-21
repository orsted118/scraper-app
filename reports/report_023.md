# Report 023
**Fecha:** 2026-05-20 23:48  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/cia.js` — archivo actualizado en esta tarea
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Calificaciones.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/cia.js`
```diff
diff --git a/electron/handlers/cia.js b/electron/handlers/cia.js
index 1666ab1..cf20356 100644
--- a/electron/handlers/cia.js
+++ b/electron/handlers/cia.js
@@ -17,6 +17,12 @@ function getCIACachePath() {
   return path.join(app.getPath('userData'), 'cia-cache.json');
 }
 
+function discardCIACache(cachePath) {
+  if (fs.existsSync(cachePath)) {
+    fs.unlinkSync(cachePath);
+  }
+}
+
 function readCIACache() {
   const cachePath = getCIACachePath();
 
@@ -28,11 +34,13 @@ function readCIACache() {
     const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
 
     if (!parsed || typeof parsed.timestamp !== 'number' || !Array.isArray(parsed.materias)) {
+      discardCIACache(cachePath);
       return null;
     }
 
     return parsed;
   } catch (_error) {
+    discardCIACache(cachePath);
     return null;
   }
 }
@@ -58,6 +66,16 @@ function clearCIACache() {
   return { success: true };
 }
 
+function buildCIAError(message) {
+  try {
+    clearCIACache();
+  } catch (_error) {
+    // Ignore cache cleanup failures.
+  }
+
+  return { error: message };
+}
+
 async function waitForFrameText(page, matcher, timeoutMs = PAGE_TIMEOUT_MS) {
   const deadline = Date.now() + timeoutMs;
 
@@ -99,14 +117,7 @@ async function waitForFrameUrl(page, matcher, timeoutMs = PAGE_TIMEOUT_MS) {
   throw new Error(`No se encontró el frame esperado: ${matcher}`);
 }
 
-async function loginToCIA(page) {
-  const user = process.env.CIA_USER;
-  const password = process.env.CIA_PASS;
-
-  if (!user || !password) {
-    throw new Error('Credenciales CIA inválidas o no configuradas.');
-  }
-
+async function loginToCIA(page, user, password) {
   await page.goto(CIA_ENTRY_URL, { waitUntil: 'domcontentloaded' });
   await page.locator('#txtITSONET').fill(user);
   await page.locator('#btnConexionTrayectorias').click();
@@ -321,11 +332,26 @@ async function extractCalificacionesFromPdf(buffer) {
 }
 
 async function scrapeCIAWithPlaywright() {
+  const user = process.env.CIA_USER?.trim();
+  const password = process.env.CIA_PASS?.trim();
+
+  if (!user && !password) {
+    return buildCIAError('CIA_NO_CREDENTIALS');
+  }
+
+  if (!user) {
+    return buildCIAError('CIA_NO_USER');
+  }
+
+  if (!password) {
+    return buildCIAError('CIA_NO_PASSWORD');
+  }
+
   const browser = await chromium.launch({ headless: true });
 
   try {
     const page = await browser.newPage();
-    await loginToCIA(page);
+    await loginToCIA(page, user, password);
 
     const boletaFrame = await openBoletaPage(page);
     await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_INSTITUTION', 'ITSON');
@@ -398,6 +424,10 @@ async function getCalificacionesWithCache() {
   try {
     const response = await scrapeCIAWithPlaywright();
 
+    if (response?.error) {
+      return response;
+    }
+
     if (Array.isArray(response.materias)) {
       writeCIACache(response.materias);
     }
```

### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 8830784..42f7a28 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -55,6 +55,12 @@ function isTimeoutError(error) {
   );
 }
 
+function isNetworkError(error) {
+  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
+    error?.message || '',
+  );
+}
+
 async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
   let lastError;
 
@@ -64,6 +70,12 @@ async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
     } catch (error) {
       lastError = error;
 
+      if (isNetworkError(error)) {
+        const networkFailure = new Error('NO_INTERNET');
+        networkFailure.result = buildScrapeError('NO_INTERNET');
+        throw networkFailure;
+      }
+
       if (!isTimeoutError(error)) {
         throw error;
       }
@@ -168,6 +180,12 @@ function getActivitiesCachePath() {
   return path.join(app.getPath('userData'), 'actividades-cache.json');
 }
 
+function discardActivitiesCache(cachePath) {
+  if (fs.existsSync(cachePath)) {
+    fs.unlinkSync(cachePath);
+  }
+}
+
 function readActivitiesCache() {
   const cachePath = getActivitiesCachePath();
 
@@ -183,11 +201,13 @@ function readActivitiesCache() {
       typeof parsed.timestamp !== 'number' ||
       !Array.isArray(parsed.actividades)
     ) {
+      discardActivitiesCache(cachePath);
       return null;
     }
 
     return parsed;
   } catch (_error) {
+    discardActivitiesCache(cachePath);
     return null;
   }
 }
@@ -281,10 +301,13 @@ async function loginToIVirtual(page, username, password) {
     page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
   ]);
 
-  if (page.url().includes('/login/index.php')) {
-    const errorText = await page.locator('#loginerrormessage').textContent().catch(() => '');
-    throw new Error(errorText?.trim() || 'No fue posible iniciar sesión en iVirtual.');
+  const currentUrl = page.url();
+
+  if (currentUrl.includes('/login/')) {
+    return buildScrapeError('SESSION_EXPIRED');
   }
+
+  return null;
 }
 
 async function collectCourses(page) {
@@ -623,11 +646,19 @@ async function syncCookiesToElectronSession(playwrightContext) {
 }
 
 async function scrapeIVirtualActivities(event) {
-  const username = process.env.IVIRTUAL_USER;
-  const password = process.env.IVIRTUAL_PASS;
+  const username = process.env.IVIRTUAL_USER?.trim();
+  const password = process.env.IVIRTUAL_PASS?.trim();
+
+  if (!username && !password) {
+    return buildScrapeError('NO_CREDENTIALS');
+  }
+
+  if (!username) {
+    return buildScrapeError('NO_USER');
+  }
 
-  if (!username || !password) {
-    return buildScrapeError('Faltan IVIRTUAL_USER o IVIRTUAL_PASS en el archivo .env local.');
+  if (!password) {
+    return buildScrapeError('NO_PASSWORD');
   }
 
   let browser;
@@ -639,7 +670,12 @@ async function scrapeIVirtualActivities(event) {
     const page = await context.newPage();
     page.setDefaultTimeout(PAGE_TIMEOUT_MS);
 
-    await loginToIVirtual(page, username, password);
+    const loginResult = await loginToIVirtual(page, username, password);
+
+    if (loginResult?.error) {
+      return loginResult;
+    }
+
     await applyResourceBlocking(page);
     await syncCookiesToElectronSession(context);
 
@@ -739,6 +775,10 @@ async function scrapeIVirtualActivities(event) {
       fromCache: false,
     };
   } catch (error) {
+    if (error?.result?.error) {
+      return error.result;
+    }
+
     return buildScrapeError(
       error && error.message
         ? `Falló la extracción de iVirtual: ${error.message}`
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 7636997..d026698 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -37,6 +37,8 @@ function App() {
   const [loadingCIA, setLoadingCIA] = useState(false);
   const [error, setError] = useState('');
   const [errorCIA, setErrorCIA] = useState('');
+  const [errorCode, setErrorCode] = useState('');
+  const [errorCIACode, setErrorCIACode] = useState('');
   const [lastSyncAt, setLastSyncAt] = useState('');
   const [lastSyncCIA, setLastSyncCIA] = useState('');
   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
@@ -46,20 +48,49 @@ function App() {
 
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
 
-  const getFriendlyIVirtualError = (message = '') =>
-    message?.includes('Timeout')
+  const getFriendlyIVirtualError = (message = '') => {
+    const errorMap = {
+      NO_CREDENTIALS: 'No has configurado tus credenciales de iVirtual. Ve a Ajustes para hacerlo.',
+      NO_USER: 'Falta tu ID de usuario en la configuración. Ve a Ajustes.',
+      NO_PASSWORD: 'Falta tu contraseña en la configuración. Ve a Ajustes.',
+      SESSION_EXPIRED: 'Tu sesión de iVirtual expiró o las credenciales son incorrectas. Ve a Ajustes y verifica tu contraseña.',
+      NO_INTERNET: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.',
+      CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
+      CIA_NO_USER: 'Falta tu usuario del CIA en la configuración. Ve a Ajustes.',
+      CIA_NO_PASSWORD: 'Falta tu contraseña del CIA en la configuración. Ve a Ajustes.',
+    };
+
+    if (errorMap[message]) {
+      return errorMap[message];
+    }
+
+    return message?.includes('Timeout')
       ? 'iVirtual tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
       : message || 'Error desconocido.';
+  };
+
+  const handleNavigate = (pageId) => {
+    const pageAliases = {
+      actividades: 'activities',
+      calificaciones: 'calificaciones',
+      archivos: 'files',
+      ajustes: 'settings',
+    };
+
+    setActivePage(pageAliases[pageId] || pageId);
+  };
 
   const loadActivities = async ({ clearCacheFirst = false } = {}) => {
     setLoading(true);
     setError('');
+    setErrorCode('');
     setProgress({ current: 0, total: 0, curso: '' });
     let response;
 
     try {
       if (!api) {
         setError('ScraperApp debe ejecutarse dentro de Electron.');
+        setErrorCode('');
         setActivities([]);
         return;
       }
@@ -69,6 +100,7 @@ function App() {
 
         if (cacheResult?.success === false) {
           setError(cacheResult.error || 'No fue posible limpiar el caché local.');
+          setErrorCode(cacheResult.error || '');
           setActivities([]);
           return;
         }
@@ -77,6 +109,7 @@ function App() {
       response = await api.runScraper();
 
       if (response?.error) {
+        setErrorCode(response.error);
         setError(getFriendlyIVirtualError(response.error));
         setActivities([]);
         return;
@@ -90,7 +123,9 @@ function App() {
       }
       setProgress({ current: 0, total: 0, curso: '' });
     } catch (_error) {
-      setError(getFriendlyIVirtualError(response?.error || _error?.message || 'Error desconocido.'));
+      const rawError = response?.error || _error?.message || 'Error desconocido.';
+      setErrorCode(rawError);
+      setError(getFriendlyIVirtualError(rawError));
       setActivities([]);
     } finally {
       setLoading(false);
@@ -100,10 +135,13 @@ function App() {
   const loadCalificaciones = async ({ clearCacheFirst = false } = {}) => {
     setLoadingCIA(true);
     setErrorCIA('');
+    setErrorCIACode('');
+    let response;
 
     try {
       if (!api) {
         setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
+        setErrorCIACode('');
         setCalificaciones([]);
         return;
       }
@@ -113,15 +151,17 @@ function App() {
 
         if (cacheResult?.success === false) {
           setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
+          setErrorCIACode(cacheResult.error || '');
           setCalificaciones([]);
           return;
         }
       }
 
-      const response = await api.runCIA();
+      response = await api.runCIA();
 
       if (response?.error) {
-        setErrorCIA(response.error);
+        setErrorCIACode(response.error);
+        setErrorCIA(getFriendlyIVirtualError(response.error));
         setCalificaciones([]);
         return;
       }
@@ -130,7 +170,9 @@ function App() {
       setCalificaciones(materiasList);
       setLastSyncCIA(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
     } catch (_error) {
-      setErrorCIA('No fue posible consultar el CIA. Verifica la conexión y las credenciales locales.');
+      const rawError = response?.error || _error?.message || 'Error desconocido.';
+      setErrorCIACode(rawError);
+      setErrorCIA(getFriendlyIVirtualError(rawError));
       setCalificaciones([]);
     } finally {
       setLoadingCIA(false);
@@ -168,12 +210,14 @@ function App() {
   return (
     <div className="min-h-screen bg-slate-950 text-slate-100">
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
-        <Sidebar activePage={activePage} onNavigate={setActivePage} />
+        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
         <TaskPanel title={pageConfig.title} description={pageConfig.description}>
           <ActivePage
             activities={activities}
             calificaciones={calificaciones}
             errorCIA={errorCIA}
+            errorCIACode={errorCIACode}
+            errorCode={errorCode}
             error={error}
             lastSyncCIA={lastSyncCIA}
             lastSyncAt={lastSyncAt}
@@ -181,7 +225,7 @@ function App() {
             loading={loading}
             onSync={handleSyncActivities}
             onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
-            onNavigate={setActivePage}
+            onNavigate={handleNavigate}
             progress={progress}
           />
         </TaskPanel>
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 4484bfa..8638717 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -70,6 +70,13 @@ function getFriendlyErrorMessage(message = '') {
     : message;
 }
 
+const settingsErrorCodes = new Set([
+  'NO_CREDENTIALS',
+  'NO_USER',
+  'NO_PASSWORD',
+  'SESSION_EXPIRED',
+]);
+
 function StatCard({ icon: Icon, label, value }) {
   return (
     <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
@@ -86,7 +93,16 @@ function StatCard({ icon: Icon, label, value }) {
   );
 }
 
-function Actividades({ activities = [], error, lastSyncAt, loading, onSync, progress }) {
+function Actividades({
+  activities = [],
+  error,
+  errorCode,
+  lastSyncAt,
+  loading,
+  onNavigate,
+  onSync,
+  progress,
+}) {
   const [activeTab, setActiveTab] = useState('pendiente');
   const [searchQuery, setSearchQuery] = useState('');
   const [sortBy, setSortBy] = useState('deadline-asc');
@@ -198,9 +214,20 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
       </section>
 
       {friendlyError ? (
-        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
-          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
-          <p>{friendlyError}</p>
+        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <div className="flex items-start gap-3">
+            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+            <p>{friendlyError}</p>
+          </div>
+          {settingsErrorCodes.has(errorCode) && typeof onNavigate === 'function' ? (
+            <button
+              type="button"
+              onClick={() => onNavigate('ajustes')}
+              className="mt-4 rounded-xl border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
+            >
+              Ir a Ajustes
+            </button>
+          ) : null}
         </div>
       ) : null}
```

### `src/pages/Calificaciones.jsx`
```diff
diff --git a/src/pages/Calificaciones.jsx b/src/pages/Calificaciones.jsx
index fd6dfb8..a39c967 100644
--- a/src/pages/Calificaciones.jsx
+++ b/src/pages/Calificaciones.jsx
@@ -22,6 +22,18 @@ const statusClasses = {
   sin_calificacion: 'border-slate-700 bg-slate-800/60 text-slate-300',
 };
 
+const ciaFriendlyErrors = {
+  CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
+  CIA_NO_USER: 'Falta tu usuario del CIA en la configuración. Ve a Ajustes.',
+  CIA_NO_PASSWORD: 'Falta tu contraseña del CIA en la configuración. Ve a Ajustes.',
+};
+
+const ciaSettingsErrorCodes = new Set([
+  'CIA_NO_CREDENTIALS',
+  'CIA_NO_USER',
+  'CIA_NO_PASSWORD',
+]);
+
 function formatGrade(value) {
   if (value === null || value === undefined || Number.isNaN(Number(value))) {
     return '—';
@@ -60,6 +72,10 @@ function formatLastSync(lastSyncAt) {
   }).format(syncDate)}`;
 }
 
+function getFriendlyCIAErrorMessage(errorCode, fallbackMessage = '') {
+  return ciaFriendlyErrors[errorCode] || fallbackMessage;
+}
+
 function StatCard({ icon: Icon, label, value, tone = 'default' }) {
   const toneClasses = {
     default: 'bg-itson-blue/10 text-itson-blue',
@@ -165,6 +181,7 @@ function GradeCard({ materia }) {
 function Calificaciones({
   calificaciones = [],
   errorCIA,
+  errorCIACode,
   lastSyncCIA,
   loadingCIA,
   onNavigate,
@@ -180,16 +197,19 @@ function Calificaciones({
     numericAverages.length > 0
       ? numericAverages.reduce((sum, value) => sum + value, 0) / numericAverages.length
       : null;
-  const credentialError = /credenciales cia|cia inválidas|cia no configuradas/i.test(errorCIA || '');
+  const friendlyCIAError = getFriendlyCIAErrorMessage(errorCIACode, errorCIA);
+  const credentialError =
+    ciaSettingsErrorCodes.has(errorCIACode) ||
+    /credenciales cia|cia inválidas|cia no configuradas/i.test(errorCIA || '');
 
   return (
     <div className="space-y-6">
-      {errorCIA ? (
+      {friendlyCIAError ? (
         <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
           <div className="flex items-start gap-3">
             <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
             <div className="space-y-1">
-              <p>{errorCIA}</p>
+              <p>{friendlyCIAError}</p>
               {credentialError ? (
                 <p className="text-xs text-red-200/80">
                   Revisa tus credenciales CIA desde Ajustes.
@@ -200,7 +220,7 @@ function Calificaciones({
           {credentialError && typeof onNavigate === 'function' ? (
             <button
               type="button"
-              onClick={() => onNavigate('settings')}
+              onClick={() => onNavigate('ajustes')}
               className="rounded-xl border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
             >
               Ir a Ajustes
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
