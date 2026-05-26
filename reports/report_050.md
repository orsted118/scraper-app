# Report 050
**Fecha:** 2026-05-25 23:47  
**Agente:** Codex  
**Tipo:** feature

## Contexto Git
**Rama:** master
**Último commit:** 00c18a6 — docs: documentación técnica completa para agentes IA
**Archivos modificados:** 8

## Archivos modificados
- `electron/handlers/cia.js` — archivo actualizado en esta tarea
- `electron/handlers/horario.js` — archivo actualizado en esta tarea
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `electron/main.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `generate-report.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| electron/handlers/cia.js | 1 | 1 |
| electron/handlers/horario.js | 1 | 1 |
| electron/handlers/scraper.js | 1 | 1 |
| electron/main.js | 29 | 0 |
| electron/preload.js | 1 | 0 |
| generate-report.js | 4 | 4 |
| src/App.jsx | 271 | 72 |
| src/components/Sidebar.jsx | 34 | 6 |

## Resumen
Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/cia.js`
```diff
diff --git a/electron/handlers/cia.js b/electron/handlers/cia.js
index cf20356..bd55417 100644
--- a/electron/handlers/cia.js
+++ b/electron/handlers/cia.js
@@ -6,7 +6,7 @@ const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
 
 const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
 const REPORT_MANAGER_URL = 'http://smartweb3.itson.edu.mx:9500/psp/ITSONPRD_1/EMPLOYEE/PSFT_HR/c/REPORT_MANAGER.CONTENT_LIST.GBL?Page=CDM_CONTLIST&Action=U&';
-const CACHE_MAX_AGE_MS = 30 * 60 * 1000;
+const CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
 const PAGE_TIMEOUT_MS = 20_000;
 
 function normalizeWhitespace(value) {
```

### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 74daa9a..964162b 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -9,7 +9,7 @@ const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
 const IVIRTUAL_LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
 const IVIRTUAL_DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
 
-const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
+const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
 const GLOBAL_TIMEOUT_MS = 4 * 60 * 1000;
 const PAGE_TIMEOUT_MS = 20_000;
 const CIA_LOGIN_TIMEOUT_MS = 45_000;
```

### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 56e8a3d..096c5bc 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -5,7 +5,7 @@ const { chromium } = require('playwright');
 
 const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
 const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
-const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
+const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
 const PAGE_TIMEOUT_MS = 20_000;
 const DASHBOARD_NAVIGATION_TIMEOUT_MS = 45_000;
 const COURSE_NAVIGATION_TIMEOUT_MS = 30_000;
```

### `electron/main.js`
```diff
diff --git a/electron/main.js b/electron/main.js
index e5b8a5e..4f893c3 100644
--- a/electron/main.js
+++ b/electron/main.js
@@ -56,6 +56,35 @@ app.whenReady().then(() => {
       await shell.openExternal(url);
     }
   });
+  ipcMain.removeHandler('sync:all');
+  ipcMain.handle('sync:all', async () => {
+    const { getActivitiesWithCache, clearActivitiesCache } = require('./handlers/scraper');
+    const { getHorarioWithCache, clearHorarioCache } = require('./handlers/horario');
+    const { getCalificacionesWithCache, clearCIACache } = require('./handlers/cia');
+
+    clearActivitiesCache();
+    clearHorarioCache();
+    clearCIACache();
+
+    const [actividades, horario, calificaciones] = await Promise.allSettled([
+      getActivitiesWithCache(),
+      getHorarioWithCache(),
+      getCalificacionesWithCache(),
+    ]);
+
+    return {
+      actividades:
+        actividades.status === 'fulfilled'
+          ? actividades.value
+          : { error: actividades.reason?.message },
+      horario:
+        horario.status === 'fulfilled' ? horario.value : { error: horario.reason?.message },
+      calificaciones:
+        calificaciones.status === 'fulfilled'
+          ? calificaciones.value
+          : { error: calificaciones.reason?.message },
+    };
+  });
   createMainWindow();
 
   app.on('activate', () => {
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 433a1c7..5e49875 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -18,4 +18,5 @@ contextBridge.exposeInMainWorld('scraperApp', {
   inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
   parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
   openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
+  syncAll: () => ipcRenderer.invoke('sync:all'),
 });
```

### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index ec2b8a5..4940cce 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -29,11 +29,11 @@ transforming...
 ✓ 1762 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                        0.41 kB | gzip: 0.28 kB
+dist/index.html                        0.41 kB | gzip: 0.27 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-DT2ZME8U.css        22.80 kB | gzip: 5.18 kB
-dist/assets/index-D19o6-wJ.js        215.87 kB | gzip: 63.41 kB
-✓ built in 6.89s
+dist/assets/index-xQvnpD6q.css        22.99 kB | gzip: 5.20 kB
+dist/assets/index-DX1vi1gs.js        218.36 kB | gzip: 64.07 kB
+✓ built in 6.08s
 The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
 };
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 176b086..59795ce 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,4 +1,4 @@
-import { useEffect, useState } from 'react';
+import { useEffect, useRef, useState } from 'react';
 import Sidebar from './components/Sidebar';
 import Onboarding from './components/Onboarding';
 import TaskPanel from './components/TaskPanel';
@@ -30,6 +30,9 @@ const pageRegistry = {
   },
 };
 
+const ACTIVITIES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
+const ONE_HOUR_MS = 60 * 60 * 1000;
+
 function App() {
   const [activePage, setActivePage] = useState('activities');
   const [showOnboarding, setShowOnboarding] = useState(false);
@@ -40,6 +43,8 @@ function App() {
   const [loading, setLoading] = useState(false);
   const [loadingHorario, setLoadingHorario] = useState(false);
   const [loadingCIA, setLoadingCIA] = useState(false);
+  const [syncingAll, setSyncingAll] = useState(false);
+  const [syncingModules, setSyncingModules] = useState([]);
   const [error, setError] = useState('');
   const [errorHorario, setErrorHorario] = useState('');
   const [errorCIA, setErrorCIA] = useState('');
@@ -54,11 +59,27 @@ function App() {
   const [ciaCargado, setCiaCargado] = useState(false);
   const [studentName, setStudentName] = useState('');
 
+  const initializedRef = useRef(false);
+  const nearExpiryRefreshLaunchedRef = useRef(false);
+
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
 
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
 
+  const addSyncingModule = (moduleId) => {
+    setSyncingModules((previous) => {
+      if (previous.includes(moduleId)) {
+        return previous;
+      }
+      return [...previous, moduleId];
+    });
+  };
+
+  const removeSyncingModule = (moduleId) => {
+    setSyncingModules((previous) => previous.filter((item) => item !== moduleId));
+  };
+
   const formatStudentDisplayName = (value = '') => {
     const normalized = String(value || '').trim();
 
@@ -78,7 +99,8 @@ function App() {
       NO_CREDENTIALS: 'No has configurado tus credenciales de iVirtual. Ve a Ajustes para hacerlo.',
       NO_USER: 'Falta tu ID de usuario en la configuración. Ve a Ajustes.',
       NO_PASSWORD: 'Falta tu contraseña en la configuración. Ve a Ajustes.',
-      SESSION_EXPIRED: 'Tu sesión de iVirtual expiró o las credenciales son incorrectas. Ve a Ajustes y verifica tu contraseña.',
+      SESSION_EXPIRED:
+        'Tu sesión de iVirtual expiró o las credenciales son incorrectas. Ve a Ajustes y verifica tu contraseña.',
       NO_INTERNET: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.',
       CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
       CIA_NO_USER: 'Falta tu usuario del CIA en la configuración. Ve a Ajustes.',
@@ -124,6 +146,8 @@ function App() {
       setActividadesCargado(false);
       setHorarioCargado(false);
       setCiaCargado(false);
+      initializedRef.current = false;
+      nearExpiryRefreshLaunchedRef.current = false;
     } catch (_error) {
       setStudentName('');
       setShowOnboarding(false);
@@ -132,18 +156,25 @@ function App() {
     }
   };
 
-  const loadActivities = async ({ clearCacheFirst = false } = {}) => {
-    setLoading(true);
-    setError('');
-    setErrorCode('');
-    setProgress({ current: 0, total: 0, curso: '' });
+  const loadActivities = async ({ clearCacheFirst = false, silent = false } = {}) => {
     let response;
 
+    if (silent) {
+      addSyncingModule('activities');
+    } else {
+      setLoading(true);
+      setError('');
+      setErrorCode('');
+      setProgress({ current: 0, total: 0, curso: '' });
+    }
+
     try {
       if (!api) {
-        setError('ScraperApp debe ejecutarse dentro de Electron.');
-        setErrorCode('');
-        setActivities([]);
+        if (!silent) {
+          setError('ScraperApp debe ejecutarse dentro de Electron.');
+          setErrorCode('');
+          setActivities([]);
+        }
         return;
       }
 
@@ -151,9 +182,11 @@ function App() {
         const cacheResult = await api.clearCache();
 
         if (cacheResult?.success === false) {
-          setError(cacheResult.error || 'No fue posible limpiar el caché local.');
-          setErrorCode(cacheResult.error || '');
-          setActivities([]);
+          if (!silent) {
+            setError(cacheResult.error || 'No fue posible limpiar el caché local.');
+            setErrorCode(cacheResult.error || '');
+            setActivities([]);
+          }
           return;
         }
       }
@@ -161,14 +194,21 @@ function App() {
       response = await api.runScraper();
 
       if (response?.error) {
-        setErrorCode(response.error);
-        setError(getFriendlyIVirtualError(response.error));
-        setActivities([]);
+        if (!silent) {
+          setErrorCode(response.error);
+          setError(getFriendlyIVirtualError(response.error));
+          if (!activities.length) {
+            setActivities([]);
+          }
+        }
         return;
       }
 
       const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
       setActivities(activitiesList);
+      setError('');
+      setErrorCode('');
+
       if (!studentName) {
         const inferredName =
           activitiesList.find(
@@ -184,32 +224,69 @@ function App() {
           setStudentName(formatStudentDisplayName(candidate));
         }
       }
-      setLastSyncAt(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
+
+      if (response?.timestamp) {
+        setLastSyncAt(new Date(response.timestamp).toISOString());
+      }
+
       if (activitiesList.length > 0 && typeof api.checkNotifications === 'function') {
         await api.checkNotifications(activitiesList);
       }
-      setProgress({ current: 0, total: 0, curso: '' });
+
+      if (
+        response?.fromCache &&
+        response?.timestamp &&
+        !clearCacheFirst &&
+        !nearExpiryRefreshLaunchedRef.current
+      ) {
+        const ageMs = Date.now() - response.timestamp;
+        const remainingMs = ACTIVITIES_CACHE_TTL_MS - ageMs;
+
+        if (remainingMs > 0 && remainingMs <= ONE_HOUR_MS) {
+          nearExpiryRefreshLaunchedRef.current = true;
+          loadActivities({ clearCacheFirst: true, silent: true });
+        }
+      }
+
+      if (!response?.fromCache) {
+        nearExpiryRefreshLaunchedRef.current = false;
+      }
     } catch (_error) {
       const rawError = response?.error || _error?.message || 'Error desconocido.';
-      setErrorCode(rawError);
-      setError(getFriendlyIVirtualError(rawError));
-      setActivities([]);
+      if (!silent) {
+        setErrorCode(rawError);
+        setError(getFriendlyIVirtualError(rawError));
+        if (!activities.length) {
+          setActivities([]);
+        }
+      }
     } finally {
-      setLoading(false);
+      if (silent) {
+        removeSyncingModule('activities');
+      } else {
+        setLoading(false);
+      }
     }
   };
 
-  const loadCalificaciones = async ({ clearCacheFirst = false } = {}) => {
-    setLoadingCIA(true);
-    setErrorCIA('');
-    setErrorCIACode('');
+  const loadCalificaciones = async ({ clearCacheFirst = false, silent = false } = {}) => {
     let response;
 
+    if (silent) {
+      addSyncingModule('calificaciones');
+    } else {
+      setLoadingCIA(true);
+      setErrorCIA('');
+      setErrorCIACode('');
+    }
+
     try {
       if (!api) {
-        setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
-        setErrorCIACode('');
-        setCalificaciones([]);
+        if (!silent) {
+          setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
+          setErrorCIACode('');
+          setCalificaciones([]);
+        }
         return;
       }
 
@@ -217,9 +294,11 @@ function App() {
         const cacheResult = await api.clearCIACache();
 
         if (cacheResult?.success === false) {
-          setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
-          setErrorCIACode(cacheResult.error || '');
-          setCalificaciones([]);
+          if (!silent) {
+            setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
+            setErrorCIACode(cacheResult.error || '');
+            setCalificaciones([]);
+          }
           return;
         }
       }
@@ -227,34 +306,57 @@ function App() {
       response = await api.runCIA();
 
       if (response?.error) {
-        setErrorCIACode(response.error);
-        setErrorCIA(getFriendlyIVirtualError(response.error));
-        setCalificaciones([]);
+        if (!silent) {
+          setErrorCIACode(response.error);
+          setErrorCIA(getFriendlyIVirtualError(response.error));
+          if (!calificaciones.length) {
+            setCalificaciones([]);
+          }
+        }
         return;
       }
 
       const materiasList = Array.isArray(response?.materias) ? response.materias : [];
       setCalificaciones(materiasList);
-      setLastSyncCIA(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
+      setErrorCIA('');
+      setErrorCIACode('');
+      if (response?.timestamp) {
+        setLastSyncCIA(new Date(response.timestamp).toISOString());
+      }
     } catch (_error) {
       const rawError = response?.error || _error?.message || 'Error desconocido.';
-      setErrorCIACode(rawError);
-      setErrorCIA(getFriendlyIVirtualError(rawError));
-      setCalificaciones([]);
+      if (!silent) {
+        setErrorCIACode(rawError);
+        setErrorCIA(getFriendlyIVirtualError(rawError));
+        if (!calificaciones.length) {
+          setCalificaciones([]);
+        }
+      }
     } finally {
-      setLoadingCIA(false);
+      if (silent) {
+        removeSyncingModule('calificaciones');
+      } else {
+        setLoadingCIA(false);
+      }
     }
   };
 
-  const loadHorario = async ({ clearCacheFirst = false } = {}) => {
-    setLoadingHorario(true);
-    setErrorHorario('');
+  const loadHorario = async ({ clearCacheFirst = false, silent = false } = {}) => {
     let response;
 
+    if (silent) {
+      addSyncingModule('horario');
+    } else {
+      setLoadingHorario(true);
+      setErrorHorario('');
+    }
+
     try {
       if (!api) {
-        setErrorHorario('ScraperApp debe ejecutarse dentro de Electron.');
-        setHorario({ materias: [], diasConClases: [] });
+        if (!silent) {
+          setErrorHorario('ScraperApp debe ejecutarse dentro de Electron.');
+          setHorario({ materias: [], diasConClases: [] });
+        }
         return;
       }
 
@@ -262,8 +364,12 @@ function App() {
         const cacheResult = await api.clearHorarioCache();
 
         if (cacheResult?.success === false) {
-          setErrorHorario(cacheResult.error || 'No fue posible limpiar el caché local del horario.');
-          setHorario({ materias: [], diasConClases: [] });
+          if (!silent) {
+            setErrorHorario(
+              cacheResult.error || 'No fue posible limpiar el caché local del horario.',
+            );
+            setHorario({ materias: [], diasConClases: [] });
+          }
           return;
         }
       }
@@ -271,8 +377,12 @@ function App() {
       response = await api.runHorario();
 
       if (response?.error) {
-        setErrorHorario(getFriendlyIVirtualError(response.error));
-        setHorario({ materias: [], diasConClases: [] });
+        if (!silent) {
+          setErrorHorario(getFriendlyIVirtualError(response.error));
+          if (!horario?.materias?.length) {
+            setHorario({ materias: [], diasConClases: [] });
+          }
+        }
         return;
       }
 
@@ -280,13 +390,72 @@ function App() {
         materias: Array.isArray(response?.materias) ? response.materias : [],
         diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
       });
-      setLastSyncHorario(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
+      setErrorHorario('');
+      if (response?.timestamp) {
+        setLastSyncHorario(new Date(response.timestamp).toISOString());
+      }
     } catch (_error) {
       const rawError = response?.error || _error?.message || 'Error desconocido.';
-      setErrorHorario(getFriendlyIVirtualError(rawError));
-      setHorario({ materias: [], diasConClases: [] });
+      if (!silent) {
+        setErrorHorario(getFriendlyIVirtualError(rawError));
+        if (!horario?.materias?.length) {
+          setHorario({ materias: [], diasConClases: [] });
+        }
+      }
     } finally {
-      setLoadingHorario(false);
+      if (silent) {
+        removeSyncingModule('horario');
+      } else {
+        setLoadingHorario(false);
+      }
+    }
+  };
+
+  const handleSyncAll = async () => {
+    if (!api?.syncAll) {
+      return;
+    }
+
+    setSyncingAll(true);
+    addSyncingModule('activities');
+    addSyncingModule('horario');
+    addSyncingModule('calificaciones');
+
+    try {
+      const result = await api.syncAll();
+
+      if (result?.actividades?.activities) {
+        setActivities(result.actividades.activities);
+        if (result.actividades?.timestamp) {
+          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+        }
+      }
+
+      if (result?.horario?.materias) {
+        setHorario({
+          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
+          diasConClases: Array.isArray(result.horario.diasConClases)
+            ? result.horario.diasConClases
+            : [],
+        });
+        if (result.horario?.timestamp) {
+          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+        }
+      }
+
+      if (result?.calificaciones?.materias) {
+        setCalificaciones(result.calificaciones.materias);
+        if (result.calificaciones?.timestamp) {
+          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+        }
+      }
+    } catch (_error) {
+      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+    } finally {
+      removeSyncingModule('activities');
+      removeSyncingModule('horario');
+      removeSyncingModule('calificaciones');
+      setSyncingAll(false);
     }
   };
 
@@ -295,31 +464,50 @@ function App() {
   }, [api]);
 
   useEffect(() => {
-    if (
-      settingsReady &&
-      !showOnboarding &&
-      activePage === 'activities' &&
-      !actividadesCargado &&
-      !loading
-    ) {
+    if (!settingsReady || showOnboarding || !api || initializedRef.current) {
+      return undefined;
+    }
+
+    initializedRef.current = true;
+
+    if (!actividadesCargado) {
       setActividadesCargado(true);
-      loadActivities();
+      loadActivities({ silent: true });
     }
-  }, [activePage, actividadesCargado, loading, settingsReady, showOnboarding]);
+
+    const horarioTimeout = setTimeout(() => {
+      if (!horarioCargado) {
+        setHorarioCargado(true);
+        loadHorario({ silent: true });
+      }
+    }, 2000);
+
+    const ciaTimeout = setTimeout(() => {
+      if (!ciaCargado) {
+        setCiaCargado(true);
+        loadCalificaciones({ silent: true });
+      }
+    }, 4000);
+
+    return () => {
+      clearTimeout(horarioTimeout);
+      clearTimeout(ciaTimeout);
+    };
+  }, [settingsReady, showOnboarding, api, actividadesCargado, horarioCargado, ciaCargado]);
 
   useEffect(() => {
-    if (activePage === 'horario' && !horarioCargado && !loadingHorario) {
+    if (activePage === 'horario' && !horarioCargado) {
       setHorarioCargado(true);
-      loadHorario();
+      loadHorario({ silent: true });
     }
-  }, [activePage, horarioCargado, loadingHorario]);
+  }, [activePage, horarioCargado]);
 
   useEffect(() => {
-    if (activePage === 'calificaciones' && !ciaCargado && !loadingCIA) {
+    if (activePage === 'calificaciones' && !ciaCargado) {
       setCiaCargado(true);
-      loadCalificaciones();
+      loadCalificaciones({ silent: true });
     }
-  }, [activePage, ciaCargado, loadingCIA]);
+  }, [activePage, ciaCargado]);
 
   useEffect(() => {
     if (!api) return;
@@ -335,20 +523,29 @@ function App() {
     return () => {
       api.removeProgress();
     };
-  }, []);
+  }, [api]);
 
   const handleSyncActivities = () => loadActivities({ clearCacheFirst: true });
 
   return (
     <div className="min-h-screen bg-slate-950 text-slate-100">
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
-        <Sidebar activePage={activePage} onNavigate={handleNavigate} userName={studentName} />
+        <Sidebar
+          activePage={activePage}
+          onNavigate={handleNavigate}
+          onSyncAll={handleSyncAll}
+          syncingAll={syncingAll}
+          syncingModules={syncingModules}
+          userName={studentName}
+        />
         {!settingsReady ? (
           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
             <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
               <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center">
                 <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Workspace</p>
-                <p className="mt-3 text-lg font-semibold text-white">Cargando configuración inicial...</p>
+                <p className="mt-3 text-lg font-semibold text-white">
+                  Cargando configuración inicial...
+                </p>
                 <p className="mt-2 text-sm text-slate-400">
                   Verificando credenciales locales antes de mostrar el contenido.
                 </p>
@@ -378,7 +575,9 @@ function App() {
               loading={loading}
               onSettingsSaved={refreshSettings}
               onSync={handleSyncActivities}
-              onSyncHorario={({ clearCacheFirst = false } = {}) => loadHorario({ clearCacheFirst })}
+              onSyncHorario={({ clearCacheFirst = false } = {}) =>
+                loadHorario({ clearCacheFirst })
+              }
               onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
               onNavigate={handleNavigate}
               progress={progress}
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 51ac5e2..a91b064 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,5 +1,5 @@
 import logoItson from '../assets/logo-itson.png';
-import { Calendar, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
+import { Calendar, FolderCog, GraduationCap, ListChecks, RefreshCw } from 'lucide-react';
 
 const navigationItems = [
   { id: 'activities', label: 'Actividades', icon: ListChecks },
@@ -24,12 +24,32 @@ function getCurrentSemesterLabel() {
   return `Verano ${year}`;
 }
 
-function Sidebar({ activePage, onNavigate, userName }) {
+function Sidebar({
+  activePage,
+  onNavigate,
+  onSyncAll,
+  syncingAll = false,
+  syncingModules = [],
+  userName,
+}) {
   const displayName = userName?.trim() || 'Estudiante ITSON';
   const semesterLabel = getCurrentSemesterLabel();
+  const syncingSet = new Set(Array.isArray(syncingModules) ? syncingModules : []);
+
+  const getStatusDot = (moduleId) => {
+    if (syncingSet.has(moduleId)) {
+      return 'animate-pulse bg-itson-blue';
+    }
+
+    if (activePage === moduleId) {
+      return 'animate-pulse bg-emerald-400';
+    }
+
+    return 'bg-slate-600';
+  };
 
   return (
-    <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
+    <aside className="flex w-64 flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
       <div className="mb-8">
         <div className="flex items-center gap-3">
           <img
@@ -63,14 +83,22 @@ function Sidebar({ activePage, onNavigate, userName }) {
                 {item.label}
               </span>
               <span
-                className={`h-2 w-2 rounded-full ${
-                  isActive ? 'animate-pulse bg-emerald-400' : 'bg-slate-600'
-                }`}
+                className={`h-2 w-2 rounded-full ${getStatusDot(item.id)}`}
               />
             </button>
           );
         })}
       </nav>
+
+      <button
+        type="button"
+        onClick={() => onSyncAll?.()}
+        disabled={syncingAll}
+        className="mt-auto flex w-full items-center gap-2 rounded-2xl border border-slate-700 px-3 py-2.5 text-xs text-slate-400 transition hover:border-itson-blue hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-50"
+      >
+        <RefreshCw className={`h-3.5 w-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
+        {syncingAll ? 'Sincronizando...' : 'Sincronizar todo'}
+      </button>
     </aside>
   );
 }
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** ninguno
**Comando de verificación:** npm run build
**Output de verificación:**
```
> scraper-app@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1762 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.27 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-xQvnpD6q.css        22.99 kB | gzip: 5.20 kB
dist/assets/index-DX1vi1gs.js        218.36 kB | gzip: 64.07 kB
✓ built in 6.08s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
