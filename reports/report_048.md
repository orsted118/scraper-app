# Report 048
**Fecha:** 2026-05-25 22:59  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** c1ecfee — chore: backup diseño v1 antes de rediseño visual
**Archivos modificados:** 5

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 5 | 5 |
| src/App.jsx | 34 | 1 |
| src/components/ActivityCard.jsx | 1 | 2 |
| src/components/Sidebar.jsx | 27 | 8 |
| src/pages/Actividades.jsx | 124 | 41 |

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 1862db9..3048483 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -24,17 +24,17 @@ const VERIFICATION = {
   verificationOutput: `> scraper-app@0.1.0 build
 > vite build
 
-The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
 vite v5.4.21 building for production...
 transforming...
 ✓ 1762 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                        0.41 kB | gzip: 0.27 kB
+dist/index.html                        0.41 kB | gzip: 0.28 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-naYlnb2n.css        22.09 kB | gzip: 5.06 kB
-dist/assets/index-CS8IlQya.js        213.62 kB | gzip: 62.65 kB
-✓ built in 8.91s`,
+dist/assets/index-DT2ZME8U.css        22.80 kB | gzip: 5.18 kB
+dist/assets/index-D19o6-wJ.js        215.87 kB | gzip: 63.41 kB
+✓ built in 4.78s
+The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
 };
 
 function ensureReportsDir() {
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 9c086ae..176b086 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -52,12 +52,27 @@ function App() {
   const [actividadesCargado, setActividadesCargado] = useState(false);
   const [horarioCargado, setHorarioCargado] = useState(false);
   const [ciaCargado, setCiaCargado] = useState(false);
+  const [studentName, setStudentName] = useState('');
 
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
 
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
 
+  const formatStudentDisplayName = (value = '') => {
+    const normalized = String(value || '').trim();
+
+    if (!normalized) {
+      return '';
+    }
+
+    if (/^\d+$/.test(normalized)) {
+      return `ID ${normalized}`;
+    }
+
+    return normalized;
+  };
+
   const getFriendlyIVirtualError = (message = '') => {
     const errorMap = {
       NO_CREDENTIALS: 'No has configurado tus credenciales de iVirtual. Ve a Ajustes para hacerlo.',
@@ -103,11 +118,14 @@ function App() {
       const settings = await api.getSettings();
       const hasUser = Boolean(settings?.user?.trim());
       const hasPassword = Boolean(settings?.hasPassword);
+      const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+      setStudentName(formatStudentDisplayName(preferredIdentity));
       setShowOnboarding(!(hasUser || hasPassword));
       setActividadesCargado(false);
       setHorarioCargado(false);
       setCiaCargado(false);
     } catch (_error) {
+      setStudentName('');
       setShowOnboarding(false);
     } finally {
       setSettingsReady(true);
@@ -151,6 +169,21 @@ function App() {
 
       const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
       setActivities(activitiesList);
+      if (!studentName) {
+        const inferredName =
+          activitiesList.find(
+            (item) => item?.nombreAlumno || item?.alumno || item?.estudiante || item?.userName,
+          ) || {};
+        const candidate =
+          inferredName?.nombreAlumno ||
+          inferredName?.alumno ||
+          inferredName?.estudiante ||
+          inferredName?.userName ||
+          '';
+        if (candidate) {
+          setStudentName(formatStudentDisplayName(candidate));
+        }
+      }
       setLastSyncAt(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
       if (activitiesList.length > 0 && typeof api.checkNotifications === 'function') {
         await api.checkNotifications(activitiesList);
@@ -309,7 +342,7 @@ function App() {
   return (
     <div className="min-h-screen bg-slate-950 text-slate-100">
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
-        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
+        <Sidebar activePage={activePage} onNavigate={handleNavigate} userName={studentName} />
         {!settingsReady ? (
           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
             <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index a31bcdb..973d07c 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -540,8 +540,7 @@ function ActivityCard({
               ) : null}
 
               <footer className="flex flex-col gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
-                <div className="flex items-center gap-2">
-                  <Calendar className="h-4 w-4" />
+                <div>
                   {estado === 'cerrada' ? (
                     <span>Cerrada el: {footerClosed}</span>
                   ) : footerPublication ? (
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 4e556a2..51ac5e2 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -8,7 +8,26 @@ const navigationItems = [
   { id: 'settings', label: 'Ajustes', icon: FolderCog },
 ];
 
-function Sidebar({ activePage, onNavigate }) {
+function getCurrentSemesterLabel() {
+  const now = new Date();
+  const month = now.getMonth() + 1;
+  const year = now.getFullYear();
+
+  if (month >= 1 && month <= 5) {
+    return `Enero - Mayo ${year}`;
+  }
+
+  if (month >= 8 && month <= 12) {
+    return `Agosto - Diciembre ${year}`;
+  }
+
+  return `Verano ${year}`;
+}
+
+function Sidebar({ activePage, onNavigate, userName }) {
+  const displayName = userName?.trim() || 'Estudiante ITSON';
+  const semesterLabel = getCurrentSemesterLabel();
+
   return (
     <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
       <div className="mb-8">
@@ -19,10 +38,8 @@ function Sidebar({ activePage, onNavigate }) {
             className="h-8 w-auto object-contain mix-blend-screen opacity-90"
           />
         </div>
-        <p className="mt-3 text-xs text-itson-gray">iVirtual Academic Tracker</p>
-        <p className="mt-3 text-sm text-slate-400">
-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
-        </p>
+        <p className="mt-4 text-sm font-semibold text-white">{displayName}</p>
+        <p className="mt-1 text-xs text-slate-400">{semesterLabel}</p>
       </div>
 
       <nav className="space-y-2">
@@ -45,9 +62,11 @@ function Sidebar({ activePage, onNavigate }) {
                 <Icon className="h-4 w-4" />
                 {item.label}
               </span>
-              <span className="text-xs uppercase tracking-[0.25em]">
-                {isActive ? 'Live' : 'Idle'}
-              </span>
+              <span
+                className={`h-2 w-2 rounded-full ${
+                  isActive ? 'animate-pulse bg-emerald-400' : 'bg-slate-600'
+                }`}
+              />
             </button>
           );
         })}
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 4a7b16b..596c713 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -2,11 +2,11 @@ import {
   Archive,
   AlertCircle,
   CheckCircle,
+  Clock3,
   Globe,
   RefreshCw,
   Search,
   SearchX,
-  Zap,
   X,
 } from 'lucide-react';
 import { useMemo, useState } from 'react';
@@ -47,6 +47,37 @@ function formatLastSync(lastSyncAt) {
   }).format(syncDate)}`;
 }
 
+function getSemesterProgress() {
+  const now = new Date();
+  const year = now.getFullYear();
+  const month = now.getMonth() + 1;
+
+  let start;
+  let end;
+
+  if (month >= 1 && month <= 5) {
+    start = new Date(year, 0, 13);
+    end = new Date(year, 4, 30);
+  } else if (month >= 8 && month <= 12) {
+    start = new Date(year, 7, 11);
+    end = new Date(year, 11, 5);
+  } else {
+    return null;
+  }
+
+  const total = end.getTime() - start.getTime();
+  const elapsed = now.getTime() - start.getTime();
+  const boundedElapsed = Math.min(total, Math.max(0, elapsed));
+  const percent = Math.min(100, Math.max(0, Math.round((boundedElapsed / total) * 100)));
+  const weeksTotal = Math.max(1, Math.round(total / (7 * 24 * 60 * 60 * 1000)));
+  const weeksElapsed = Math.max(
+    0,
+    Math.min(weeksTotal, Math.round(boundedElapsed / (7 * 24 * 60 * 60 * 1000))),
+  );
+
+  return { percent, weeksElapsed, weeksTotal };
+}
+
 function parseSort(fechaLimite) {
   if (!fechaLimite || fechaLimite === 'Sin fecha visible') {
     return null;
@@ -73,22 +104,62 @@ const settingsErrorCodes = new Set([
   'SESSION_EXPIRED',
 ]);
 
-function StatCard({ icon: Icon, label, value }) {
+function StatCard({ icon: Icon, label, value, color = 'itson-blue' }) {
+  const colorMap = {
+    'itson-blue': {
+      iconWrap: 'bg-itson-blue/15 text-itson-blue',
+      value: 'text-itson-blue-light',
+    },
+    orange: {
+      iconWrap: 'bg-orange-500/15 text-orange-400',
+      value: 'text-orange-300',
+    },
+    slate: {
+      iconWrap: 'bg-slate-800 text-slate-300',
+      value: 'text-slate-200',
+    },
+  };
+  const palette = colorMap[color] || colorMap['itson-blue'];
+
   return (
-    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
-      <div className="flex items-center gap-3">
-        <span className="rounded-2xl bg-itson-blue/10 p-3 text-itson-blue">
-          <Icon className="h-5 w-5" />
-        </span>
-        <div>
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
-          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
-        </div>
+    <article className="flex h-20 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
+      <span
+        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${palette.iconWrap}`}
+      >
+        <Icon className="h-4 w-4" />
+      </span>
+      <div className="min-w-0">
+        <p className={`text-3xl font-bold leading-none ${palette.value}`}>{value}</p>
+        <p className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
       </div>
     </article>
   );
 }
 
+function TabButton({ tab, isActive, count, onClick }) {
+  return (
+    <button
+      type="button"
+      onClick={onClick}
+      title={tab.title || tab.label}
+      className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-medium transition ${
+        isActive
+          ? 'bg-itson-blue text-slate-50'
+          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
+      }`}
+    >
+      {tab.label}
+      <span
+        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
+          isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
+        }`}
+      >
+        {count}
+      </span>
+    </button>
+  );
+}
+
 function Actividades({
   activities = [],
   error,
@@ -102,6 +173,7 @@ function Actividades({
   const [activeTab, setActiveTab] = useState('pendiente');
   const [searchQuery, setSearchQuery] = useState('');
   const [sortBy, setSortBy] = useState('deadline-asc');
+  const semesterProgress = useMemo(() => getSemesterProgress(), []);
   const friendlyError = getFriendlyErrorMessage(error);
   const counts = {
     pendiente: activities.filter((item) => item.estado === 'pendiente').length,
@@ -187,46 +259,62 @@ function Actividades({
 
   return (
     <div className="space-y-6">
-      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
-        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
-            <div className="space-y-4">
-              <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
-                <Globe className="h-3.5 w-3.5" />
-                Portal iVirtual ITSON
+      <section className="space-y-3">
+        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
+          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+            <div className="flex items-center gap-3">
+              <div className="rounded-xl bg-itson-blue/10 p-2.5">
+                <Globe className="h-5 w-5 text-itson-blue" />
               </div>
               <div>
-                <h3 className="text-2xl font-semibold text-white">Extracción real de actividades</h3>
-                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
-                  Inicia una sesión contra iVirtual, recorre los cursos inscritos y clasifica actividades
-                  en pendientes, retrasadas y cerradas con sus fechas límite, instrucciones y adjuntos.
-                </p>
+                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Portal iVirtual ITSON</p>
+                <p className="text-sm font-medium text-slate-200">Actividades del semestre</p>
               </div>
             </div>
 
-            <div className="space-y-3">
+            <div className="flex flex-col items-start gap-1 xl:items-end">
               <button
                 type="button"
                 onClick={onSync}
                 disabled={loading}
-                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-4 py-2 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
               >
                 <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                 {loading ? 'Sincronizando...' : 'Sincronizar'}
               </button>
 
-              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
+              <p className="text-xs text-slate-500">
                 {formatLastSync(lastSyncAt)}
               </p>
             </div>
           </div>
         </article>
 
-        <div className="grid gap-4">
-          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} />
-          <StatCard icon={AlertCircle} label="Retrasadas" value={counts.retrasada} />
-          <StatCard icon={Zap} label="Cerradas" value={counts.cerrada} />
+        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
+          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} color="itson-blue" />
+          <StatCard icon={Clock3} label="Retrasadas" value={counts.retrasada} color="orange" />
+          <StatCard icon={Archive} label="Cerradas" value={counts.cerrada} color="slate" />
         </div>
+
+        {semesterProgress ? (
+          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
+            <div className="mb-2 flex items-center justify-between">
+              <p className="text-xs text-slate-400">Progreso del semestre</p>
+              <p className="text-xs font-medium text-slate-300">
+                Semana {semesterProgress.weeksElapsed} de {semesterProgress.weeksTotal}
+              </p>
+            </div>
+            <div className="h-1.5 w-full rounded-full bg-slate-800">
+              <div
+                className="h-1.5 rounded-full bg-itson-blue transition-all"
+                style={{ width: `${semesterProgress.percent}%` }}
+              />
+            </div>
+            <p className="mt-1.5 text-right text-[10px] text-slate-500">
+              {semesterProgress.percent}% completado
+            </p>
+          </article>
+        ) : null}
       </section>
 
       {friendlyError ? (
@@ -286,21 +374,16 @@ function Actividades({
         <div className="flex flex-wrap gap-2">
           {tabs.map((tab) => {
             const isActive = tab.id === activeTab;
+            const tabCount = counts[tab.id] || 0;
 
             return (
-              <button
+              <TabButton
                 key={tab.id}
-                type="button"
+                tab={tab}
+                isActive={isActive}
+                count={tabCount}
                 onClick={() => handleTabChange(tab.id)}
-                title={tab.title || tab.label}
-                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
-                  isActive
-                    ? 'bg-itson-blue text-slate-50'
-                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
-                }`}
-              >
-                {tab.label}
-              </button>
+              />
             );
           })}
         </div>
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
dist/index.html                        0.41 kB | gzip: 0.28 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-DT2ZME8U.css        22.80 kB | gzip: 5.18 kB
dist/assets/index-D19o6-wJ.js        215.87 kB | gzip: 63.41 kB
✓ built in 4.78s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
