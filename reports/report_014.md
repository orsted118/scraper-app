# Report 014
**Fecha:** 2026-05-15 19:16  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 20b8ac2..286254c 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -3,7 +3,9 @@ import {
   Globe,
   RefreshCw,
   Search,
+  SearchX,
   Zap,
+  X,
 } from 'lucide-react';
 import { useState } from 'react';
 import ActivityCard from '../components/ActivityCard';
@@ -61,12 +63,28 @@ function StatCard({ icon: Icon, label, value }) {
 
 function Actividades({ activities = [], error, lastSyncAt, loading, onSync, progress }) {
   const [activeTab, setActiveTab] = useState('pendiente');
+  const [searchQuery, setSearchQuery] = useState('');
   const counts = {
     pendiente: activities.filter((item) => item.estado === 'pendiente').length,
     retrasada: activities.filter((item) => item.estado === 'retrasada').length,
     cerrada: activities.filter((item) => item.estado === 'cerrada').length,
   };
-  const filteredActivities = activities.filter((item) => item.estado === activeTab);
+  const tabActivities = activities.filter((item) => item.estado === activeTab);
+  const normalizedQuery = searchQuery.trim().toLowerCase();
+  const filteredActivities = tabActivities.filter((item) => {
+    if (!normalizedQuery) {
+      return true;
+    }
+
+    return [item.nombre, item.materia].some((field) =>
+      (field || '').toLowerCase().includes(normalizedQuery),
+    );
+  });
+
+  const handleTabChange = (tabId) => {
+    setActiveTab(tabId);
+    setSearchQuery('');
+  };
 
   return (
     <div className="space-y-6">
@@ -119,6 +137,27 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
         </div>
       ) : null}
 
+      <div className="relative">
+        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
+        <input
+          type="text"
+          value={searchQuery}
+          onChange={(event) => setSearchQuery(event.target.value)}
+          placeholder="Buscar por nombre o materia..."
+          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pl-10 pr-11 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+        />
+        {searchQuery ? (
+          <button
+            type="button"
+            onClick={() => setSearchQuery('')}
+            aria-label="Limpiar búsqueda"
+            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
+          >
+            <X className="h-4 w-4" />
+          </button>
+        ) : null}
+      </div>
+
       <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
         <div className="flex flex-wrap gap-2">
           {tabs.map((tab) => {
@@ -128,7 +167,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
               <button
                 key={tab.id}
                 type="button"
-                onClick={() => setActiveTab(tab.id)}
+                onClick={() => handleTabChange(tab.id)}
                 className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                   isActive
                     ? 'bg-itson-blue text-slate-50'
@@ -179,6 +218,13 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
             <ActivityCard key={activity.id} {...activity} />
           ))}
         </div>
+      ) : normalizedQuery ? (
+        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+          <SearchX className="h-8 w-8 text-slate-600" />
+          <p className="mt-4 text-sm text-slate-300">
+            Sin actividades que coincidan con la búsqueda.
+          </p>
+        </div>
       ) : (
         <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
           <Search className="h-8 w-8 text-slate-600" />
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
