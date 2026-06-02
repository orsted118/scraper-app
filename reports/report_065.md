# Report 065
**Fecha:** 2026-05-31 18:33  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
**Archivos modificados:** 4

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 19 | 21 |
| src/App.jsx | 120 | 30 |
| src/components/Onboarding.jsx | 2 | 1 |
| src/components/Sidebar.jsx | 308 | 134 |

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index fa9b68e..90a2816 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
 
 const VERIFICATION = {
   buildStatus: 'PASS',
-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
+  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
   verificationOutput: `> dvpotro@0.1.0 build
 > vite build
 
 vite v5.4.21 building for production...
+transforming...
 ✓ 1767 modules transformed.
-dist/index.html                        0.47 kB │ gzip:  0.30 kB
-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
-✓ built in 4.93s
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+✓ built in 8.70s
 The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
 
-> dvpotro@0.1.0 dist:dir
-> vite build && electron-builder --dir
+sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
 
-✓ 1767 modules transformed.
-✓ built in 4.83s
-• electron-builder version=26.8.1
-• loaded configuration file=package.json (build field)
-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
-
-branding verification OK
-active branding reference scan OK: no old visible references
-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+Dist logo assets:
+dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+
+Confirmed:
+- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+- Dist logo asset is under 20KB.
+- handleSyncAll only adds runCIA when hasFinales is true.
+- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
 };
 
 function ensureReportsDir() {
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 137c482..b672732 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,4 +1,4 @@
-import { useCallback, useEffect, useRef, useState } from 'react';
+import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
 import Sidebar from './components/Sidebar';
 import Onboarding from './components/Onboarding';
 import TaskPanel from './components/TaskPanel';
@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
 import Horario from './pages/Horario';
 import Calificaciones from './pages/Calificaciones';
 import Ajustes from './pages/Ajustes';
-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
 
 const pageRegistry = {
   activities: {
@@ -44,7 +44,7 @@ function App() {
   const [loading, setLoading] = useState(false);
   const [loadingHorario, setLoadingHorario] = useState(false);
   const [loadingCIA, setLoadingCIA] = useState(false);
-  const [syncingAll, setSyncingAll] = useState(false);
+  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
   const [syncingModules, setSyncingModules] = useState([]);
   const [error, setError] = useState('');
   const [errorHorario, setErrorHorario] = useState('');
@@ -59,6 +59,7 @@ function App() {
   const [horarioCargado, setHorarioCargado] = useState(false);
   const [ciaCargado, setCiaCargado] = useState(false);
   const [studentName, setStudentName] = useState('');
+  const [settingsData, setSettingsData] = useState({});
 
   const initializedRef = useRef(false);
   const nearExpiryRefreshLaunchedRef = useRef(false);
@@ -75,6 +76,21 @@ function App() {
           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
       ),
   );
+  const proximaEntrega = useMemo(() => {
+    const pending = (activities || []).filter(
+      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+    );
+
+    if (!pending.length) {
+      return null;
+    }
+
+    return [...pending].sort((left, right) => {
+      if (!left.fechaLimite) return 1;
+      if (!right.fechaLimite) return -1;
+      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+    })[0];
+  }, [activities]);
 
   const addSyncingModule = (moduleId) => {
     setSyncingModules((previous) => {
@@ -135,6 +151,9 @@ function App() {
       horario: 'horario',
       calificaciones: 'calificaciones',
       ajustes: 'settings',
+      calendario: 'activities',
+      notifications: 'activities',
+      notificaciones: 'activities',
     };
 
     const nextPage = pageAliases[pageId] || pageId;
@@ -156,6 +175,7 @@ function App() {
 
     try {
       const settings = await api.getSettings();
+      setSettingsData(settings || {});
       const hasUser = Boolean(settings?.user?.trim());
       const hasPassword = Boolean(settings?.hasPassword);
       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
@@ -167,6 +187,7 @@ function App() {
       initializedRef.current = false;
       nearExpiryRefreshLaunchedRef.current = false;
     } catch (_error) {
+      setSettingsData({});
       setStudentName('');
       setShowOnboarding(false);
     } finally {
@@ -430,50 +451,109 @@ function App() {
   };
 
   const handleSyncAll = async () => {
-    if (!api?.syncAll) {
+    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+
+    if (syncState.status === 'syncing' || !scraperApi) {
       return;
     }
 
-    setSyncingAll(true);
+    setSyncState((current) => ({ ...current, status: 'syncing' }));
     addSyncingModule('activities');
     addSyncingModule('horario');
-    addSyncingModule('calificaciones');
+    if (hasFinales) {
+      addSyncingModule('calificaciones');
+    }
 
     try {
-      const result = await api.syncAll();
+      const calls = [
+        { id: 'activities', promise: scraperApi.runScraper?.() },
+        { id: 'horario', promise: scraperApi.runHorario?.() },
+      ];
 
-      if (result?.actividades?.activities) {
-        setActivities(result.actividades.activities);
-        if (result.actividades?.timestamp) {
-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
-        }
+      if (hasFinales) {
+        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
       }
 
-      if (result?.horario?.materias) {
-        setHorario({
-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
-          diasConClases: Array.isArray(result.horario.diasConClases)
-            ? result.horario.diasConClases
-            : [],
-        });
-        if (result.horario?.timestamp) {
-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+      const results = await Promise.allSettled(calls.map((call) => call.promise));
+      let hasErrors = false;
+
+      results.forEach((result, index) => {
+        const moduleId = calls[index]?.id;
+
+        if (result.status === 'rejected') {
+          hasErrors = true;
+          return;
         }
-      }
 
-      if (result?.calificaciones?.materias) {
-        setCalificaciones(result.calificaciones.materias);
-        if (result.calificaciones?.timestamp) {
-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+        const response = result.value;
+
+        if (response?.error) {
+          hasErrors = true;
+
+          if (moduleId === 'activities') {
+            setErrorCode(response.error);
+            setError(getFriendlyIVirtualError(response.error));
+          }
+
+          if (moduleId === 'horario') {
+            setErrorHorario(getFriendlyIVirtualError(response.error));
+          }
+
+          if (moduleId === 'calificaciones') {
+            setErrorCIACode(response.error);
+            setErrorCIA(getFriendlyIVirtualError(response.error));
+          }
+
+          return;
         }
-      }
+
+        if (moduleId === 'activities') {
+          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+          setActivities(activitiesList);
+          setError('');
+          setErrorCode('');
+          if (response?.timestamp) {
+            setLastSyncAt(new Date(response.timestamp).toISOString());
+          }
+        }
+
+        if (moduleId === 'horario') {
+          setHorario({
+            materias: Array.isArray(response?.materias) ? response.materias : [],
+            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+          });
+          setErrorHorario('');
+          if (response?.timestamp) {
+            setLastSyncHorario(new Date(response.timestamp).toISOString());
+          }
+        }
+
+        if (moduleId === 'calificaciones') {
+          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+          setCalificaciones(materiasList);
+          setErrorCIA('');
+          setErrorCIACode('');
+          if (response?.timestamp) {
+            setLastSyncCIA(new Date(response.timestamp).toISOString());
+          }
+        }
+      });
+
+      const nextStatus = hasErrors ? 'error' : 'done';
+      setSyncState({ status: nextStatus, lastSync: new Date() });
+      setTimeout(
+        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+        hasErrors ? 4000 : 3000,
+      );
     } catch (_error) {
-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+      setSyncState((current) => ({ ...current, status: 'error' }));
+      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
     } finally {
       removeSyncingModule('activities');
       removeSyncingModule('horario');
-      removeSyncingModule('calificaciones');
-      setSyncingAll(false);
+      if (hasFinales) {
+        removeSyncingModule('calificaciones');
+      }
     }
   };
 
@@ -556,10 +636,19 @@ function App() {
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
         <Sidebar
           activePage={activePage}
+          activities={activities}
+          calendarCount={0}
           diasConClases={horario?.diasConClases ?? []}
+          errorHorario={errorHorario}
           hasFinales={hasFinales}
           horario={horario?.materias ?? []}
+          horarioData={horario}
+          onSyncAll={handleSyncAll}
           onNavigate={handleNavigate}
+          proximaEntrega={proximaEntrega}
+          settingsData={settingsData}
+          studentName={studentName}
+          syncState={syncState}
         />
         {!settingsReady ? (
           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
@@ -617,3 +706,4 @@ function App() {
 }
 
 export default App;
+
```

### `src/components/Onboarding.jsx`
```diff
diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
index 3e820a2..7bca3ac 100644
--- a/src/components/Onboarding.jsx
+++ b/src/components/Onboarding.jsx
@@ -1,5 +1,5 @@
 import { ArrowRight } from 'lucide-react';
-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
 
 function Onboarding({ onNavigate }) {
   return (
@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
 }
 
 export default Onboarding;
+
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index c7458cb..1aef7a5 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,216 +1,390 @@
-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
-import { useEffect, useState } from 'react';
-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+import {
+  AlertCircle,
+  Bell,
+  BookOpen,
+  CalendarDays,
+  CheckCircle,
+  Clock,
+  Info,
+  Loader2,
+  RefreshCw,
+  Settings,
+} from 'lucide-react';
+import { useEffect, useMemo, useState } from 'react';
+import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
 import { getNextClass } from '../utils/horario.js';
 
-const navigationItems = [
-  { id: 'activities', label: 'Actividades', icon: ListChecks },
-  { id: 'horario', label: 'Horario', icon: Calendar },
-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
+const NAV_ITEMS = [
+  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
+  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
+  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
+  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
+  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
 ];
 
-function getNextClassStatus(nextClass) {
-  if (!nextClass) {
-    return '';
+function normDate(value) {
+  const date = value ? new Date(value) : null;
+  return date && !Number.isNaN(date.getTime()) ? date : null;
+}
+
+function formatDayShort(date = new Date()) {
+  return date.toLocaleDateString('es-MX', {
+    weekday: 'short',
+    day: 'numeric',
+    month: 'short',
+  });
+}
+
+function formatTime(date) {
+  return date.toLocaleTimeString('es-MX', {
+    hour: '2-digit',
+    minute: '2-digit',
+  });
+}
+
+function getInitials(str = '') {
+  const clean = String(str || '').trim();
+  const parts = clean.split(/\s+/).filter(Boolean);
+
+  if (parts.length >= 2) {
+    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
   }
 
-  if (!nextClass.esHoy) {
-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
+  return clean.slice(0, 2).toUpperCase() || 'DV';
+}
+
+function formatDisplayName(str = '') {
+  const clean = String(str || '').trim();
+  const parts = clean.split(/\s+/).filter(Boolean);
+
+  if (/^ID\s+\w+/i.test(clean)) {
+    return clean;
+  }
+
+  if (parts.length >= 2) {
+    return `${parts[0]} ${parts[1][0]}.`;
+  }
+
+  return clean;
+}
+
+function formatRelativeDeadline(fechaLimite) {
+  const deadline = normDate(fechaLimite);
+
+  if (!deadline) {
+    return 'Fecha pendiente';
   }
 
-  if (nextClass.minutosRestantes <= 30) {
+  const now = new Date();
+  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
+  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
+  const diffDays = Math.round((target - today) / 86400000);
+  const time = formatTime(deadline);
+
+  if (diffDays < 0) return 'Vencida';
+  if (diffDays === 0) return `Hoy · ${time}`;
+  if (diffDays === 1) return `Mañana · ${time}`;
+  return `En ${diffDays} días`;
+}
+
+function getClassStatus(nextClass) {
+  if (!nextClass) return '';
+  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
+
+  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
     return `En ${nextClass.minutosRestantes} min`;
   }
 
-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
+  if (nextClass.esHoy) {
+    return start;
+  }
+
+  return `${nextClass.dia || 'Próxima'} · ${start}`;
 }
 
-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
+function getSyncPresentation(syncState = {}) {
+  if (syncState.status === 'syncing') {
+    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
+  }
+
+  if (syncState.status === 'done') {
+    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+  }
+
+  if (syncState.status === 'error') {
+    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
+  }
+
+  if (syncState.lastSync) {
+    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+  }
+
+  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
+}
+
+function Sidebar({
+  activePage,
+  activities = [],
+  calendarCount = 0,
+  diasConClases = [],
+  errorHorario = '',
+  hasFinales = false,
+  horario = [],
+  horarioData = null,
+  onNavigate,
+  onSyncAll,
+  proximaEntrega = null,
+  settingsData = {},
+  studentName = '',
+  syncState = { status: 'idle', lastSync: null },
+}) {
   const [nextClass, setNextClass] = useState(null);
-  const visibleNavigationItems = navigationItems.filter(
-    (item) => item.id !== 'calificaciones' || hasFinales === true,
-  );
-  const hasHorario = Array.isArray(horario) && horario.length > 0;
+  const materiasHorario = Array.isArray(horarioData?.materias)
+    ? horarioData.materias
+    : (Array.isArray(horario) ? horario : []);
+  const pendingCount = activities.filter(
+    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+  ).length;
+  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
+  const hasHorario = materiasHorario.length > 0;
+  const syncInfo = getSyncPresentation(syncState);
+  const SyncIcon = syncInfo.Icon;
+  const userId = settingsData?.ciaUser || settingsData?.user || '';
+  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
+  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
+  const initials = getInitials(hasRealStudentName ? studentName : userId);
 
   useEffect(() => {
-    if (!hasHorario) {
-      setNextClass(null);
-      return undefined;
-    }
-
     const updateNextClass = () => {
-      setNextClass(getNextClass(horario, diasConClases));
+      setNextClass(getNextClass(materiasHorario, diasConClases));
     };
 
     updateNextClass();
     const intervalId = setInterval(updateNextClass, 60 * 1000);
 
     return () => clearInterval(intervalId);
-  }, [hasHorario, horario, diasConClases]);
+  }, [materiasHorario, diasConClases]);
+
+  const navItems = useMemo(() => NAV_ITEMS, []);
+
+  const getBadge = (itemId) => {
+    if (itemId === 'activities' && pendingCount > 0) {
+      return (
+        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
+          {pendingCount}
+        </span>
+      );
+    }
+
+    if (itemId === 'calendario' && Number(calendarCount) > 0) {
+      return (
+        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
+          {calendarCount}
+        </span>
+      );
+    }
+
+    if (itemId === 'horario') {
+      if (errorHorario) {
+        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
+      }
+      if (hasHorario) {
+        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
+      }
+    }
 
-  const handleOpenMeetLink = () => {
-    if (!nextClass?.meetLink) {
-      return;
+    if (itemId === 'notifications' && delayedCount > 0) {
+      return (
+        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
+          {delayedCount}
+        </span>
+      );
     }
 
-    window.scraperApp?.openExternal?.(nextClass.meetLink);
+    return null;
   };
 
+  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
+
   return (
     <aside
-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
     >
-      <div className="mb-8">
+      <header className="px-4 pb-3.5 pt-4">
         <div className="flex items-center gap-3">
-          <span
-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
-          >
-            <img
-              src={dvpotroLogo}
-              alt="DVPotro"
-              className="h-full w-full object-contain"
-              draggable="false"
-            />
-          </span>
+          <img
+            src={dvpotroLogo}
+            alt="DVPotro"
+            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
+            draggable="false"
+          />
           <div className="min-w-0">
-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
+            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
               DVPotro
             </p>
-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
+            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
               ITSON
             </p>
           </div>
         </div>
-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
-          Academic command center
-        </p>
-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
-        </p>
-      </div>
+      </header>
 
-      <nav className="space-y-2">
-        {visibleNavigationItems.map((item) => {
-          const isActive = item.id === activePage;
+      <nav className="px-2 pb-2">
+        {navItems.map((item) => {
           const Icon = item.icon;
+          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
+          const badge = getBadge(item.id);
 
           return (
             <button
               key={item.id}
               type="button"
-              onClick={() => onNavigate(item.id)}
-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
-                isActive
-                  ? ''
-                  : ''
-              }`}
+              onClick={() => onNavigate?.(item.target)}
+              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
               style={
                 isActive
-                  ? { background: 'var(--accent)', color: '#fff' }
-                  : {
-                    background: 'var(--bg-secondary)',
-                    color: 'var(--text-muted)',
-                  }
+                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
+                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
               }
               onMouseEnter={(event) => {
                 if (!isActive) {
-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
+                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
                   event.currentTarget.style.color = 'var(--text-strong)';
                 }
               }}
               onMouseLeave={(event) => {
                 if (!isActive) {
-                  event.currentTarget.style.background = 'var(--bg-secondary)';
+                  event.currentTarget.style.background = 'transparent';
                   event.currentTarget.style.color = 'var(--text-muted)';
                 }
               }}
             >
-              <span className="flex items-center gap-3">
-                <Icon className="h-4 w-4" />
-                {item.label}
-              </span>
-              <span
-                className="text-xs uppercase tracking-[0.25em]"
-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
-              >
-                {isActive ? 'Live' : 'Idle'}
+              <span className="flex min-w-0 items-center gap-3">
+                <Icon className="h-4 w-4 shrink-0" />
+                <span className="truncate">{item.label}</span>
               </span>
+              {badge}
             </button>
           );
         })}
       </nav>
 
-      {hasHorario ? (
-        <div
-          className="mt-auto border-t pt-4"
-          style={{ borderColor: 'var(--border-subtle)' }}
+      <section
+        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+      >
+        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+          Sincronización
+        </p>
+        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
+          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
+          <span className="font-medium">{syncInfo.text}</span>
+        </div>
+        {syncTimestamp ? (
+          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+            Última sincronización · {syncTimestamp}
+          </p>
+        ) : null}
+        <button
+          type="button"
+          onClick={onSyncAll}
+          disabled={syncState.status === 'syncing'}
+          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
+          style={
+            syncState.status === 'syncing'
+              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
+              : { background: 'var(--itson-blue, var(--accent))' }
+          }
         >
-          <div
-            className="rounded-2xl border p-3"
-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
-          >
-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
+          {syncState.status === 'syncing' ? (
+            <Loader2 className="h-3.5 w-3.5 animate-spin" />
+          ) : (
+            <RefreshCw className="h-3.5 w-3.5" />
+          )}
+          Sincronizar todo
+        </button>
+        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
+          Actualiza toda la información de la app
+        </p>
+      </section>
+
+      <section
+        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+      >
+        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
+          HOY · {formatDayShort(new Date())}
+        </p>
+
+        <div className="mt-3">
+          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+            Entrega
+          </p>
+          {proximaEntrega ? (
+            <div className="mt-1 min-w-0">
+              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
+                {proximaEntrega.nombre}
+              </p>
+              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
+                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
+              </p>
             </div>
+          ) : (
+            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
+          )}
+        </div>
 
-            {nextClass ? (
-              <div className="space-y-2">
-                <div className="flex items-start justify-between gap-2">
-                  <div className="min-w-0">
-                    <p
-                      className="truncate text-sm font-medium"
-                      style={{ color: 'var(--text-strong)' }}
-                      title={nextClass.materia}
-                    >
-                      {nextClass.materia}
-                    </p>
-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
-                      {nextClass.hora} · {nextClass.salon}
-                    </p>
-                  </div>
-
-                  {nextClass.meetLink ? (
-                    <button
-                      type="button"
-                      onClick={handleOpenMeetLink}
-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
-                      title="Abrir videollamada"
-                    >
-                      <ExternalLink className="h-3.5 w-3.5" />
-                    </button>
-                  ) : null}
-                </div>
+        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
 
+        <div>
+          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
+            Clase
+          </p>
+          {nextClass ? (
+            <div className="mt-1 min-w-0">
+              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
+                {nextClass.materia}
+              </p>
+              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+                <span className="truncate">{nextClass.hora}</span>
                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
                   <span
-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
-                    style={{
-                      background: 'var(--retrasada-bg)',
-                      borderColor: 'var(--retrasada-border)',
-                      color: 'var(--retrasada-text)',
-                    }}
+                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
+                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
                   >
-                    {getNextClassStatus(nextClass)}
+                    {getClassStatus(nextClass)}
                   </span>
                 ) : (
-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
-                    {getNextClassStatus(nextClass)}
-                  </p>
+                  <span className="truncate">· {getClassStatus(nextClass)}</span>
                 )}
               </div>
-            ) : (
-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
-                Sin clases próximas
-              </p>
-            )}
-          </div>
+            </div>
+          ) : (
+            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
+          )}
+        </div>
+      </section>
+
+      <footer
+        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
+        style={{ borderColor: 'var(--border)' }}
+      >
+        <div
+          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
+          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
+        >
+          {initials}
+        </div>
+        <div className="min-w-0">
+          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
+            {profileName}
+          </p>
+          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
+            {userId || 'Sin ID configurado'}
+          </p>
         </div>
-      ) : null}
+      </footer>
     </aside>
   );
 }
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
**Output de verificación:**
```
> dvpotro@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1767 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            0.47 kB │ gzip:  0.30 kB
dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
✓ built in 8.70s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults

Dist logo assets:
dvpotro-logo-128-BsNSF5CX.png 9179 bytes

Confirmed:
- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
- Dist logo asset is under 20KB.
- handleSyncAll only adds runCIA when hasFinales is true.
- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
