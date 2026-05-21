# Report 024
**Fecha:** 2026-05-21 00:08  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/components/Onboarding.jsx` — archivo creado como parte de la base inicial
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/pages/Files.jsx` — archivo eliminado en esta tarea

## Resumen
Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index d026698..c3fc9ec 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,9 +1,9 @@
 import { useEffect, useState } from 'react';
 import Sidebar from './components/Sidebar';
+import Onboarding from './components/Onboarding';
 import TaskPanel from './components/TaskPanel';
 import Actividades from './pages/Actividades';
 import Calificaciones from './pages/Calificaciones';
-import Files from './pages/Files';
 import Ajustes from './pages/Ajustes';
 
 const pageRegistry = {
@@ -17,11 +17,6 @@ const pageRegistry = {
     description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
     component: Calificaciones,
   },
-  files: {
-    title: 'Archivos',
-    description: 'Centraliza los adjuntos encontrados en las actividades de iVirtual.',
-    component: Files,
-  },
   settings: {
     title: 'Ajustes',
     description: 'Revisa el estado de la integración y la configuración local requerida.',
@@ -31,6 +26,8 @@ const pageRegistry = {
 
 function App() {
   const [activePage, setActivePage] = useState('activities');
+  const [showOnboarding, setShowOnboarding] = useState(false);
+  const [settingsReady, setSettingsReady] = useState(false);
   const [activities, setActivities] = useState([]);
   const [calificaciones, setCalificaciones] = useState([]);
   const [loading, setLoading] = useState(false);
@@ -42,6 +39,8 @@ function App() {
   const [lastSyncAt, setLastSyncAt] = useState('');
   const [lastSyncCIA, setLastSyncCIA] = useState('');
   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
+  const [actividadesCargado, setActividadesCargado] = useState(false);
+  const [ciaCargado, setCiaCargado] = useState(false);
 
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
@@ -73,13 +72,33 @@ function App() {
     const pageAliases = {
       actividades: 'activities',
       calificaciones: 'calificaciones',
-      archivos: 'files',
       ajustes: 'settings',
     };
 
     setActivePage(pageAliases[pageId] || pageId);
   };
 
+  const refreshSettings = async () => {
+    if (!api?.getSettings) {
+      setShowOnboarding(false);
+      setSettingsReady(true);
+      return;
+    }
+
+    try {
+      const settings = await api.getSettings();
+      const hasUser = Boolean(settings?.user?.trim());
+      const hasPassword = Boolean(settings?.hasPassword);
+      setShowOnboarding(!(hasUser || hasPassword));
+      setActividadesCargado(false);
+      setCiaCargado(false);
+    } catch (_error) {
+      setShowOnboarding(false);
+    } finally {
+      setSettingsReady(true);
+    }
+  };
+
   const loadActivities = async ({ clearCacheFirst = false } = {}) => {
     setLoading(true);
     setError('');
@@ -180,14 +199,28 @@ function App() {
   };
 
   useEffect(() => {
-    loadActivities();
-  }, []);
+    refreshSettings();
+  }, [api]);
+
+  useEffect(() => {
+    if (
+      settingsReady &&
+      !showOnboarding &&
+      activePage === 'activities' &&
+      !actividadesCargado &&
+      !loading
+    ) {
+      setActividadesCargado(true);
+      loadActivities();
+    }
+  }, [activePage, actividadesCargado, loading, settingsReady, showOnboarding]);
 
   useEffect(() => {
-    if (activePage === 'calificaciones' && calificaciones.length === 0 && !loadingCIA && !lastSyncCIA) {
+    if (activePage === 'calificaciones' && !ciaCargado && !loadingCIA) {
+      setCiaCargado(true);
       loadCalificaciones();
     }
-  }, [activePage]);
+  }, [activePage, ciaCargado, loadingCIA]);
 
   useEffect(() => {
     if (!api) return;
@@ -211,24 +244,43 @@ function App() {
     <div className="min-h-screen bg-slate-950 text-slate-100">
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
         <Sidebar activePage={activePage} onNavigate={handleNavigate} />
-        <TaskPanel title={pageConfig.title} description={pageConfig.description}>
-          <ActivePage
-            activities={activities}
-            calificaciones={calificaciones}
-            errorCIA={errorCIA}
-            errorCIACode={errorCIACode}
-            errorCode={errorCode}
-            error={error}
-            lastSyncCIA={lastSyncCIA}
-            lastSyncAt={lastSyncAt}
-            loadingCIA={loadingCIA}
-            loading={loading}
-            onSync={handleSyncActivities}
-            onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
-            onNavigate={handleNavigate}
-            progress={progress}
-          />
-        </TaskPanel>
+        {!settingsReady ? (
+          <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
+            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
+              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center">
+                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Workspace</p>
+                <p className="mt-3 text-lg font-semibold text-white">Cargando configuración inicial...</p>
+                <p className="mt-2 text-sm text-slate-400">
+                  Verificando credenciales locales antes de mostrar el contenido.
+                </p>
+              </div>
+            </div>
+          </main>
+        ) : showOnboarding && activePage === 'activities' ? (
+          <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
+            <Onboarding onNavigate={handleNavigate} />
+          </main>
+        ) : (
+          <TaskPanel title={pageConfig.title} description={pageConfig.description}>
+            <ActivePage
+              activities={activities}
+              calificaciones={calificaciones}
+              errorCIA={errorCIA}
+              errorCIACode={errorCIACode}
+              errorCode={errorCode}
+              error={error}
+              lastSyncCIA={lastSyncCIA}
+              lastSyncAt={lastSyncAt}
+              loadingCIA={loadingCIA}
+              loading={loading}
+              onSettingsSaved={refreshSettings}
+              onSync={handleSyncActivities}
+              onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
+              onNavigate={handleNavigate}
+              progress={progress}
+            />
+          </TaskPanel>
+        )}
       </div>
     </div>
   );
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index cbbe048..b8e47f6 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -235,6 +235,7 @@ function ActivityCard({
 }) {
   const [expanded, setExpanded] = useState(false);
   const [instructionsExpanded, setInstructionsExpanded] = useState(false);
+  const [showAllFiles, setShowAllFiles] = useState(false);
   const [downloadingKey, setDownloadingKey] = useState('');
   const [downloadingAll, setDownloadingAll] = useState(false);
   const [downloadError, setDownloadError] = useState('');
@@ -246,8 +247,8 @@ function ActivityCard({
   const instructionsText = (instrucciones || '').trim();
   const shouldClampInstructions = !instructionsExpanded && instructionsText.length > 140;
   const instructionsClampClass = shouldClampInstructions ? 'line-clamp-3' : '';
-  const visibleFiles = archivos.slice(0, 3);
-  const extraFilesCount = Math.max(0, archivos.length - visibleFiles.length);
+  const visibleFiles = showAllFiles ? archivos : archivos.slice(0, 3);
+  const extraFilesCount = Math.max(0, archivos.length - 3);
   const topBadgeVisible = Boolean(theme.pillLabel);
   const cardMeta = [materia, profesor].filter(Boolean).join(' | ') || 'Materia no disponible';
   const TimeBadgeIcon = getTimeContextIcon(timeContext.level);
@@ -476,18 +477,18 @@ function ActivityCard({
                       );
                     })}
 
-                    {extraFilesCount > 0 ? (
-                      <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-2 text-center text-slate-300">
-                        <div>
-                          <p className="text-sm font-semibold">+{extraFilesCount} más</p>
-                          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
-                            Archivos ocultos
-                          </p>
-                        </div>
-                      </div>
-                    ) : null}
                   </div>
 
+                  {archivos.length > 3 ? (
+                    <button
+                      type="button"
+                      onClick={() => setShowAllFiles((value) => !value)}
+                      className="mt-2 inline-flex text-xs text-itson-blue transition hover:text-itson-blue-light"
+                    >
+                      {showAllFiles ? 'Ver menos' : `+${extraFilesCount} más`}
+                    </button>
+                  ) : null}
+
                   {archivos.length > 1 ? (
                     <div className="mt-3 flex justify-end">
                       <button
```

### `src/components/Onboarding.jsx`
```diff
diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
new file mode 100644
index 0000000..264ddfc
--- /dev/null
+++ b/src/components/Onboarding.jsx
@@ -0,0 +1,36 @@
+import { ArrowRight } from 'lucide-react';
+import logoItson from '../assets/logo-itson.png';
+
+function Onboarding({ onNavigate }) {
+  return (
+    <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
+      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center shadow-2xl shadow-slate-950/40">
+        <div className="flex justify-center">
+          <img
+            src={logoItson}
+            alt="ITSON"
+            className="h-12 w-auto object-contain mix-blend-screen opacity-90"
+          />
+        </div>
+
+        <h3 className="mt-8 text-3xl font-semibold text-white">Bienvenido a ScraperApp</h3>
+        <p className="mt-4 text-sm leading-6 text-slate-400">
+          Para comenzar, configura tus credenciales de iVirtual ITSON
+        </p>
+
+        <div className="mt-8 flex flex-col items-center justify-center gap-3">
+          <button
+            type="button"
+            onClick={() => onNavigate('ajustes')}
+            className="inline-flex items-center gap-2 rounded-2xl bg-itson-blue px-6 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light"
+          >
+            Configurar credenciales
+            <ArrowRight className="h-4 w-4" />
+          </button>
+        </div>
+      </div>
+    </section>
+  );
+}
+
+export default Onboarding;
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index ff61566..3756e09 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,10 +1,9 @@
 import logoItson from '../assets/logo-itson.png';
-import { Download, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
+import { FolderCog, GraduationCap, ListChecks } from 'lucide-react';
 
 const navigationItems = [
   { id: 'activities', label: 'Actividades', icon: ListChecks },
   { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
-  { id: 'files', label: 'Archivos', icon: Download },
   { id: 'settings', label: 'Ajustes', icon: FolderCog },
 ];
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 8638717..21d1c0a 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -1,5 +1,7 @@
 import {
+  Archive,
   AlertCircle,
+  CheckCircle,
   Globe,
   RefreshCw,
   Search,
@@ -169,6 +171,27 @@ function Actividades({
     setSearchQuery('');
   };
 
+  const emptyStateConfig = {
+    pendiente: {
+      icon: CheckCircle,
+      iconClass: 'text-emerald-400',
+      title: 'Sin actividades pendientes',
+      subtitle: 'No tienes tareas por entregar. ¡Al día!',
+    },
+    retrasada: {
+      icon: CheckCircle,
+      iconClass: 'text-emerald-400',
+      title: 'Sin actividades retrasadas',
+      subtitle: 'No tienes tareas vencidas pendientes de entrega.',
+    },
+    cerrada: {
+      icon: Archive,
+      iconClass: 'text-slate-400',
+      title: 'Sin actividades cerradas',
+      subtitle: 'No hay actividades cerradas sin entregar en este semestre.',
+    },
+  };
+
   return (
     <div className="space-y-6">
       <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
@@ -336,12 +359,18 @@ function Actividades({
         </div>
       ) : (
         <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
-          <Search className="h-8 w-8 text-slate-600" />
-          <p className="mt-4 text-sm text-slate-300">
-            {activities.length === 0
-              ? 'Aún no se ha ejecutado la extracción de actividades.'
-              : 'No hay actividades en esta categoría.'}
-          </p>
+          {(() => {
+            const emptyState = emptyStateConfig[activeTab] || emptyStateConfig.pendiente;
+            const EmptyIcon = emptyState.icon;
+
+            return (
+              <>
+                <EmptyIcon className={`h-8 w-8 ${emptyState.iconClass}`} />
+                <p className="mt-4 text-sm font-semibold text-slate-100">{emptyState.title}</p>
+                <p className="mt-2 max-w-md text-sm text-slate-400">{emptyState.subtitle}</p>
+              </>
+            );
+          })()}
         </div>
       )}
     </div>
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index 62ac1bf..da98b00 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -69,7 +69,7 @@ function CredentialSection({
   );
 }
 
-function Ajustes({ error, lastSyncAt, loading }) {
+function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
   const [user, setUser] = useState('');
   const [password, setPassword] = useState('');
@@ -170,6 +170,10 @@ function Ajustes({ error, lastSyncAt, loading }) {
         type: 'success',
         message: 'Credenciales guardadas correctamente',
       });
+
+      if (typeof onSettingsSaved === 'function') {
+        await onSettingsSaved();
+      }
     } catch (_error) {
       setFeedback({
         type: 'error',
```

### `src/pages/Files.jsx`
```diff
diff --git a/src/pages/Files.jsx b/src/pages/Files.jsx
deleted file mode 100644
index 036e1a5..0000000
--- a/src/pages/Files.jsx
+++ /dev/null
@@ -1,79 +0,0 @@
-import { FileText } from 'lucide-react';
-import ResultsTable from '../components/ResultsTable';
-
-function Files({ activities = [], loading }) {
-  const attachments = activities.flatMap((activity) =>
-    (activity.archivos || []).map((file) => file),
-  );
-  const totals = attachments.reduce((accumulator, file) => {
-    const lowerName = file.name.toLowerCase();
-    let type = 'Otros';
-
-    if (lowerName.endsWith('.pdf')) type = 'PDF';
-    else if (/\.(doc|docx)$/.test(lowerName)) type = 'Word';
-    else if (/\.(xls|xlsx|csv)$/.test(lowerName)) type = 'Excel';
-    else if (/\.(ppt|pptx)$/.test(lowerName)) type = 'PowerPoint';
-    else if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) type = 'Imágenes';
-
-    accumulator[type] = (accumulator[type] || 0) + 1;
-    return accumulator;
-  }, {});
-  const groupedStats = Object.entries(totals)
-    .map(([type, count]) => ({ type, count }))
-    .sort((a, b) => b.count - a.count);
-  const totalFiles = attachments.length;
-
-  return (
-    <div className="space-y-6">
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-        <div className="flex items-start gap-3">
-          <FileText className="mt-1 h-5 w-5 text-itson-blue" />
-          <div>
-            <h3 className="text-xl font-semibold text-white">Resumen de adjuntos</h3>
-            <p className="mt-2 text-sm text-slate-400">
-              Este panel concentra el total de archivos encontrados en iVirtual y su distribución
-              por tipo. Las descargas individuales viven dentro de cada actividad.
-            </p>
-          </div>
-        </div>
-      </section>
-
-      {groupedStats.length > 0 ? (
-        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
-          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total de archivos</p>
-            <p className="mt-4 text-5xl font-semibold text-white">{totalFiles}</p>
-            <p className="mt-3 text-sm text-slate-400">
-              Adjuntos detectados al recorrer las actividades extraídas del portal.
-            </p>
-          </section>
-
-          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
-              barra de progreso por tipo de archivo
-            </p>
-            {groupedStats.map((item) => {
-              const width = totalFiles > 0 ? `${(item.count / totalFiles) * 100}%` : '0%';
-
-              return (
-                <div key={item.type} className="space-y-2">
-                  <div className="flex items-center justify-between text-sm">
-                    <span className="text-slate-200">{item.type}</span>
-                    <span className="text-slate-400">{item.count}</span>
-                  </div>
-                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
-                    <div className="h-full rounded-full bg-itson-blue" style={{ width }} />
-                  </div>
-                </div>
-              );
-            })}
-          </section>
-        </div>
-      ) : (
-        <ResultsTable rows={[]} loading={loading} />
-      )}
-    </div>
-  );
-}
-
-export default Files;
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
