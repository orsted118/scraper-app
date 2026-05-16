# Report 015
**Fecha:** 2026-05-15 19:18  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index d985fe5..f7011c1 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -1,5 +1,7 @@
 import {
   AlertCircle,
+  AlertTriangle,
+  Clock,
   Download,
   FileText,
   FileType2,
@@ -49,6 +51,51 @@ function getBadgeClass(status) {
   return 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30';
 }
 
+function parseDeadlineDate(fechaLimite) {
+  if (!fechaLimite || typeof fechaLimite !== 'string') {
+    return null;
+  }
+
+  const trimmedValue = fechaLimite.trim();
+
+  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
+    return null;
+  }
+
+  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
+  return Number.isNaN(parsed) ? null : new Date(parsed);
+}
+
+function getUrgencyLevel(estado, fechaLimite) {
+  if (estado !== 'pendiente') {
+    return null;
+  }
+
+  const deadline = parseDeadlineDate(fechaLimite);
+
+  if (!deadline) {
+    return null;
+  }
+
+  const diffMs = deadline.getTime() - Date.now();
+  const oneDayMs = 24 * 60 * 60 * 1000;
+  const threeDaysMs = 3 * oneDayMs;
+
+  if (diffMs < 0) {
+    return null;
+  }
+
+  if (diffMs <= oneDayMs) {
+    return 'critical';
+  }
+
+  if (diffMs <= threeDaysMs) {
+    return 'warning';
+  }
+
+  return null;
+}
+
 function ActivityCard({
   nombre,
   materia,
@@ -61,6 +108,7 @@ function ActivityCard({
     () => (instrucciones || '').length > 200 || archivos.length > 3,
     [archivos.length, instrucciones],
   );
+  const urgencyLevel = getUrgencyLevel(estado, fechaLimite);
   const [expanded, setExpanded] = useState(!startsCollapsed);
   const [downloadingKey, setDownloadingKey] = useState('');
   const [downloadError, setDownloadError] = useState('');
@@ -96,7 +144,21 @@ function ActivityCard({
         <div className="space-y-2">
           <h3 className="text-lg font-semibold text-white">{nombre}</h3>
           <p className="text-sm text-slate-400">{materia}</p>
-          <p className="text-sm text-slate-500">Fecha límite: {fechaLimite || 'Sin fecha visible'}</p>
+          <div className="flex flex-wrap items-center gap-2">
+            <p className="text-sm text-slate-500">Fecha límite: {fechaLimite || 'Sin fecha visible'}</p>
+            {urgencyLevel === 'critical' ? (
+              <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
+                <AlertTriangle className="h-3.5 w-3.5" />
+                Vence hoy
+              </span>
+            ) : null}
+            {urgencyLevel === 'warning' ? (
+              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300">
+                <Clock className="h-3.5 w-3.5" />
+                Vence pronto
+              </span>
+            ) : null}
+          </div>
         </div>
 
         <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getBadgeClass(estado)}`}>
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
