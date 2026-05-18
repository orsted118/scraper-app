# Report 019
**Fecha:** 2026-05-18 01:40  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index b68f608..44c03a7 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -244,9 +244,12 @@ async function collectAssignmentDetails(page, assignment) {
         .replace(/\n{3,}/g, '\n\n')
         .trim();
 
+    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
+
     const main = document.querySelector('#region-main') || document.body;
     const intro = document.querySelector('#intro');
-    const introText = (intro?.textContent || '').replace(/\r/g, '');
+    const introText = normalize(intro?.textContent || '');
+    const bodyText = normalize(document.body?.textContent || '');
     const attachments = Array.from(main.querySelectorAll('a[href*="pluginfile.php"]'))
       .map((anchor) => ({
         name: (anchor.textContent || '').trim(),
@@ -265,7 +268,6 @@ async function collectAssignmentDetails(page, assignment) {
       (file, index, array) => index === array.findIndex((entry) => entry.url === file.url),
     );
 
-    const bodyText = normalize(document.body?.textContent || '');
     const statusTableText = normalize(document.querySelector('.submissionstatustable')?.textContent || '');
     const deliveredByClass = Boolean(document.querySelector('.submissionstatussubmitted'));
     const deliveredByText = /submitted for grading|assignment was submitted|submitted to grading/i.test(
@@ -311,6 +313,92 @@ async function collectAssignmentDetails(page, assignment) {
         /add submission|submit assignment|enviar tarea|entregar/i.test(action.label) &&
         action.disabled,
     );
+    const detailRows = Array.from(main.querySelectorAll('table tr'));
+    const detailLines = bodyText.split('\n').map((line) => normalize(line)).filter(Boolean);
+
+    const extractDetailValue = (labels) => {
+      for (const row of detailRows) {
+        const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
+          normalize(cell.textContent || ''),
+        );
+
+        if (!cells.length) {
+          continue;
+        }
+
+        const rowText = cells.join(' ');
+
+        for (const label of labels) {
+          const labelLower = label.toLowerCase();
+          const labelIndex = cells.findIndex((cell) => cell.toLowerCase().includes(labelLower));
+
+          if (labelIndex !== -1) {
+            const sameCell = cells[labelIndex]
+              .replace(new RegExp(escapeRegExp(label), 'i'), '')
+              .replace(/^[:\-–—]\s*/, '')
+              .trim();
+
+            if (sameCell) {
+              return sameCell;
+            }
+
+            const nextCell = cells.slice(labelIndex + 1).find(Boolean);
+
+            if (nextCell) {
+              return nextCell;
+            }
+          }
+
+          const rowMatch = rowText.match(
+            new RegExp(`${escapeRegExp(label)}\\s*[:\\-–—]?\\s*(.+)$`, 'i'),
+          );
+
+          if (rowMatch) {
+            const value = normalize(rowMatch[1]);
+
+            if (value) {
+              return value;
+            }
+          }
+        }
+      }
+
+      for (let index = 0; index < detailLines.length; index += 1) {
+        const line = detailLines[index];
+
+        for (const label of labels) {
+          if (line.toLowerCase().includes(label.toLowerCase())) {
+            const inlineValue = line
+              .replace(new RegExp(`.*?${escapeRegExp(label)}\\s*[:\\-–—]?\\s*`, 'i'), '')
+              .trim();
+
+            if (inlineValue) {
+              return inlineValue;
+            }
+
+            const nextLine = detailLines[index + 1];
+
+            if (nextLine) {
+              return nextLine;
+            }
+          }
+        }
+      }
+
+      return null;
+    };
+
+    const combinedModalidadText = normalize([bodyText, introText, statusTableText].join('\n')).toLowerCase();
+    const modalidad = /(entrega en grupo|group submission|es una tarea grupal|team submission|submission in groups|trabajo en equipo|tarea grupal)/i.test(
+      combinedModalidadText,
+    )
+      ? 'equipo'
+      : 'individual';
+    const fechaPublicacion = extractDetailValue([
+      'Disponible desde',
+      'Allow submissions from',
+      'Fecha de apertura',
+    ]);
 
     return {
       archivos: uniqueAttachments,
@@ -318,8 +406,10 @@ async function collectAssignmentDetails(page, assignment) {
       closedByText,
       deliveredByClass,
       deliveredByText,
+      fechaPublicacion,
       introText,
       materia: courseName,
+      modalidad,
       hasDisabledSubmitAction,
       hasSubmitAction,
       statusTableText,
@@ -343,6 +433,8 @@ async function collectAssignmentDetails(page, assignment) {
 
   return {
     archivos: details.archivos,
+    fechaPublicacion: details.fechaPublicacion || null,
+    modalidad: details.modalidad || 'individual',
     submissionState: {
       bodyText: details.bodyText,
       closedByText: details.closedByText,
@@ -449,8 +541,10 @@ async function scrapeIVirtualActivities(event) {
             archivos: details.archivos,
             estado,
             fechaLimite: assignment.dueDate || 'Sin fecha visible',
+            fechaPublicacion: details.fechaPublicacion || null,
             instrucciones: details.instrucciones,
             materia: details.materia,
+            modalidad: details.modalidad || 'individual',
             nombre: assignment.title,
             rawGrade: assignment.grade,
             rawSubmission: assignment.submission,
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
index f7011c1..d3f9557 100644
--- a/src/components/ActivityCard.jsx
+++ b/src/components/ActivityCard.jsx
@@ -1,6 +1,11 @@
 import {
   AlertCircle,
   AlertTriangle,
+  AlignLeft,
+  Calendar,
+  CalendarX,
+  ChevronDown,
+  ChevronUp,
   Clock,
   Download,
   FileText,
@@ -10,122 +15,258 @@ import {
   Paperclip,
   Presentation,
   Table2,
+  Users,
 } from 'lucide-react';
-import { useMemo, useState } from 'react';
+import { useState } from 'react';
 
 function getFileIcon(fileName = '') {
   const lowerName = fileName.toLowerCase();
 
   if (lowerName.endsWith('.pdf')) {
-    return { icon: FileText, color: 'text-red-400', type: 'PDF' };
+    return { icon: FileText, color: 'text-red-400', label: 'PDF' };
   }
 
   if (/\.(doc|docx)$/.test(lowerName)) {
-    return { icon: FileType2, color: 'text-blue-400', type: 'Word' };
+    return { icon: FileType2, color: 'text-blue-400', label: 'Word' };
   }
 
   if (/\.(xls|xlsx|csv)$/.test(lowerName)) {
-    return { icon: Table2, color: 'text-green-400', type: 'Excel' };
+    return { icon: Table2, color: 'text-emerald-400', label: 'Excel' };
   }
 
   if (/\.(ppt|pptx)$/.test(lowerName)) {
-    return { icon: Presentation, color: 'text-orange-400', type: 'PowerPoint' };
+    return { icon: Presentation, color: 'text-orange-400', label: 'PowerPoint' };
   }
 
   if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
-    return { icon: ImageIcon, color: 'text-purple-400', type: 'Imagen' };
+    return { icon: ImageIcon, color: 'text-purple-400', label: 'Imagen' };
   }
 
-  return { icon: Paperclip, color: 'text-slate-400', type: 'Otro' };
+  return { icon: Paperclip, color: 'text-slate-400', label: 'Archivo' };
 }
 
-function getBadgeClass(status) {
-  if (status === 'retrasada') {
-    return 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30';
+function parseDate(value) {
+  if (!value || typeof value !== 'string') {
+    return null;
   }
 
-  if (status === 'cerrada') {
-    return 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-600';
+  const trimmedValue = value.trim();
+
+  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
+    return null;
   }
 
-  return 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30';
+  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
+  return Number.isNaN(parsed) ? null : new Date(parsed);
 }
 
-function parseDeadlineDate(fechaLimite) {
-  if (!fechaLimite || typeof fechaLimite !== 'string') {
-    return null;
+function capitalize(value = '') {
+  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
+}
+
+function formatShortDate(date) {
+  if (!date) {
+    return '';
   }
 
-  const trimmedValue = fechaLimite.trim();
+  const parts = new Intl.DateTimeFormat('es-MX', {
+    day: 'numeric',
+    month: 'short',
+    year: 'numeric',
+  }).formatToParts(date);
 
-  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
-    return null;
+  const day = parts.find((part) => part.type === 'day')?.value || '';
+  const month = capitalize(parts.find((part) => part.type === 'month')?.value || '');
+  const year = parts.find((part) => part.type === 'year')?.value || '';
+
+  return [day, month, year].filter(Boolean).join(' ');
+}
+
+function formatTime(date) {
+  if (!date) {
+    return '';
   }
 
-  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
-  return Number.isNaN(parsed) ? null : new Date(parsed);
+  const parts = new Intl.DateTimeFormat('en-US', {
+    hour: 'numeric',
+    hour12: true,
+    minute: '2-digit',
+  }).formatToParts(date);
+
+  const hour = parts.find((part) => part.type === 'hour')?.value || '';
+  const minute = parts.find((part) => part.type === 'minute')?.value || '';
+  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value || '').toUpperCase();
+
+  return [hour && minute ? `${hour}:${minute}` : '', dayPeriod].filter(Boolean).join(' ');
 }
 
-function getUrgencyLevel(estado, fechaLimite) {
+function getTimeContext(estado, fechaLimite) {
+  if (estado === 'cerrada') {
+    return { label: 'CERRADA', level: 'closed' };
+  }
+
+  if (estado === 'retrasada') {
+    const deadline = parseDate(fechaLimite);
+
+    if (!deadline) {
+      return { label: 'RETRASADA', level: 'late' };
+    }
+
+    const lateMs = Math.max(0, Date.now() - deadline.getTime());
+    const daysLate = Math.max(1, Math.ceil(lateMs / (24 * 60 * 60 * 1000)));
+
+    return {
+      label: `${daysLate} ${daysLate === 1 ? 'día' : 'días'} retrasada`,
+      level: 'late',
+    };
+  }
+
   if (estado !== 'pendiente') {
-    return null;
+    return { label: '', level: null };
   }
 
-  const deadline = parseDeadlineDate(fechaLimite);
+  const deadline = parseDate(fechaLimite);
 
   if (!deadline) {
-    return null;
+    return { label: '', level: null };
   }
 
   const diffMs = deadline.getTime() - Date.now();
   const oneDayMs = 24 * 60 * 60 * 1000;
-  const threeDaysMs = 3 * oneDayMs;
 
-  if (diffMs < 0) {
-    return null;
+  if (diffMs <= oneDayMs) {
+    return { label: 'Vence hoy', level: 'critical' };
   }
 
-  if (diffMs <= oneDayMs) {
-    return 'critical';
+  if (diffMs <= 3 * oneDayMs) {
+    const days = Math.max(1, Math.ceil(diffMs / oneDayMs));
+    return { label: `En ${days} ${days === 1 ? 'día' : 'días'}`, level: 'warning' };
+  }
+
+  return { label: '', level: null };
+}
+
+function getCardTheme(estado, modalidad) {
+  if (estado === 'cerrada') {
+    return {
+      accent: 'border-l-slate-600',
+      dateText: 'text-slate-400',
+      iconBg: 'bg-slate-700/50',
+      iconText: 'text-slate-500',
+      pillClass: 'border border-slate-600 bg-slate-700/50 text-slate-300',
+      pillLabel: 'CERRADA',
+    };
+  }
+
+  if (estado === 'retrasada') {
+    return {
+      accent: 'border-l-orange-500',
+      dateText: 'text-orange-400',
+      iconBg: 'bg-orange-500/20',
+      iconText: 'text-orange-400',
+      pillClass: 'border border-orange-500/40 bg-orange-500/10 text-orange-300',
+      pillLabel: 'RETRASADA',
+    };
+  }
+
+  if (modalidad === 'equipo') {
+    return {
+      accent: 'border-l-red-500',
+      dateText: 'text-red-400',
+      iconBg: 'bg-red-500/20',
+      iconText: 'text-red-400',
+      pillClass: 'border border-red-500/40 bg-red-500/10 text-red-300',
+      pillLabel: 'EN EQUIPO',
+    };
+  }
+
+  return {
+    accent: 'border-l-emerald-500',
+    dateText: 'text-emerald-400',
+    iconBg: 'bg-emerald-500/20',
+    iconText: 'text-emerald-400',
+    pillClass: '',
+    pillLabel: '',
+  };
+}
+
+function getTimeContextClass(level) {
+  if (level === 'critical') {
+    return 'animate-pulse border border-red-500/40 bg-red-500/20 text-red-300';
+  }
+
+  if (level === 'warning' || level === 'late') {
+    return 'border border-orange-500/40 bg-orange-500/20 text-orange-300';
+  }
+
+  if (level === 'closed') {
+    return 'border border-slate-600 bg-slate-700/50 text-slate-400';
+  }
+
+  return '';
+}
+
+function getTimeContextIcon(level) {
+  if (level === 'critical') {
+    return AlertTriangle;
+  }
+
+  if (level === 'warning' || level === 'late') {
+    return Clock;
   }
 
-  if (diffMs <= threeDaysMs) {
-    return 'warning';
+  if (level === 'closed') {
+    return CalendarX;
   }
 
   return null;
 }
 
 function ActivityCard({
-  nombre,
-  materia,
+  archivos = [],
   fechaLimite,
-  estado,
+  fechaPublicacion,
   instrucciones,
-  archivos = [],
+  materia,
+  modalidad = 'individual',
+  nombre,
+  profesor,
+  estado,
 }) {
-  const startsCollapsed = useMemo(
-    () => (instrucciones || '').length > 200 || archivos.length > 3,
-    [archivos.length, instrucciones],
-  );
-  const urgencyLevel = getUrgencyLevel(estado, fechaLimite);
-  const [expanded, setExpanded] = useState(!startsCollapsed);
+  const [expanded, setExpanded] = useState(false);
+  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
   const [downloadingKey, setDownloadingKey] = useState('');
+  const [downloadingAll, setDownloadingAll] = useState(false);
   const [downloadError, setDownloadError] = useState('');
 
-  const previewText = (instrucciones || '').trim();
-  const shownInstructions =
-    !previewText || expanded || previewText.length <= 200
-      ? previewText
-      : `${previewText.slice(0, 200).trim()}...`;
-
-  const visibleFiles = expanded ? archivos : archivos.slice(0, 3);
+  const theme = getCardTheme(estado, modalidad);
+  const timeContext = getTimeContext(estado, fechaLimite);
+  const deadlineDate = parseDate(fechaLimite);
+  const publicationDate = parseDate(fechaPublicacion);
+  const instructionsText = (instrucciones || '').trim();
+  const instructionsPreview =
+    instructionsText.length > 200 ? `${instructionsText.slice(0, 200).trim()}...` : instructionsText;
+  const visibleFiles = archivos.slice(0, 3);
+  const extraFilesCount = Math.max(0, archivos.length - visibleFiles.length);
+  const topBadgeVisible = Boolean(theme.pillLabel);
+  const cardMeta = [materia, profesor].filter(Boolean).join(' | ') || 'Materia no disponible';
+  const TimeBadgeIcon = getTimeContextIcon(timeContext.level);
+
+  const resolvedDeadline = deadlineDate ? formatShortDate(deadlineDate) : fechaLimite || 'Sin fecha visible';
+  const resolvedDeadlineTime = deadlineDate ? formatTime(deadlineDate) : '';
+  const footerPublication = publicationDate ? formatShortDate(publicationDate) : fechaPublicacion || '';
+  const footerClosed = deadlineDate ? `${formatShortDate(deadlineDate)}${resolvedDeadlineTime ? ` a las ${resolvedDeadlineTime}` : ''}` : fechaLimite || '';
 
   const handleDownload = async (archivo) => {
     setDownloadingKey(archivo.url);
     setDownloadError('');
 
     try {
+      if (typeof window === 'undefined' || !window.scraperApp?.downloadFile) {
+        setDownloadError('La descarga solo está disponible dentro de Electron.');
+        return;
+      }
+
       const result = await window.scraperApp.downloadFile(archivo.url, archivo.name);
 
       if (!result?.success) {
@@ -138,99 +279,242 @@ function ActivityCard({
     }
   };
 
+  const handleDownloadAll = async () => {
+    if (archivos.length <= 1) {
+      return;
+    }
+
+    setDownloadingAll(true);
+    setDownloadError('');
+
+    try {
+      if (typeof window === 'undefined' || !window.scraperApp?.downloadFile) {
+        throw new Error('La descarga solo está disponible dentro de Electron.');
+      }
+
+      for (const archivo of archivos) {
+        const result = await window.scraperApp.downloadFile(archivo.url, archivo.name);
+
+        if (!result?.success) {
+          throw new Error(result?.error || `No fue posible descargar ${archivo.name}.`);
+        }
+      }
+    } catch (error) {
+      setDownloadError(error instanceof Error ? error.message : 'No fue posible descargar los archivos.');
+    } finally {
+      setDownloadingAll(false);
+    }
+  };
+
   return (
-    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
-        <div className="space-y-2">
-          <h3 className="text-lg font-semibold text-white">{nombre}</h3>
-          <p className="text-sm text-slate-400">{materia}</p>
-          <div className="flex flex-wrap items-center gap-2">
-            <p className="text-sm text-slate-500">Fecha límite: {fechaLimite || 'Sin fecha visible'}</p>
-            {urgencyLevel === 'critical' ? (
-              <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
-                <AlertTriangle className="h-3.5 w-3.5" />
-                Vence hoy
-              </span>
-            ) : null}
-            {urgencyLevel === 'warning' ? (
-              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300">
-                <Clock className="h-3.5 w-3.5" />
-                Vence pronto
-              </span>
+    <article
+      className={`overflow-hidden rounded-[28px] border border-slate-800 border-l-4 bg-slate-950/70 shadow-[0_0_0_1px_rgba(15,23,42,0.5)] ${theme.accent}`}
+    >
+      <div className="p-5 sm:p-6">
+        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
+          <div className="flex gap-4 sm:gap-5">
+            <div
+              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 ${theme.iconBg}`}
+            >
+              <CalendarX className={`h-8 w-8 ${theme.iconText}`} />
+            </div>
+
+            <div className="min-w-0 flex-1">
+              <div className="flex flex-wrap items-center gap-2">
+                {topBadgeVisible ? (
+                  <span
+                    className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${theme.pillClass}`}
+                  >
+                    {theme.pillLabel}
+                  </span>
+                ) : null}
+              </div>
+
+              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
+                {nombre}
+              </h3>
+
+              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400 sm:text-base">
+                <span className="inline-flex items-center gap-2">
+                  <Users className="h-4 w-4 shrink-0 text-slate-500" />
+                  {cardMeta}
+                </span>
+              </p>
+
+              <div className="mt-4 flex flex-wrap items-center gap-2">
+                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
+                  <Users className="h-3.5 w-3.5 text-slate-400" />
+                  {modalidad === 'equipo' ? 'En equipo' : 'Individual'}
+                </span>
+
+                {fechaPublicacion ? (
+                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
+                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
+                    Publicado: {publicationDate ? formatShortDate(publicationDate) : fechaPublicacion}
+                  </span>
+                ) : null}
+              </div>
+            </div>
+          </div>
+
+          <div className="lg:border-l lg:border-slate-800 lg:pl-7">
+            <div className="flex items-start justify-between gap-4 lg:flex-col lg:items-end">
+              <div className="min-w-0 text-right">
+                <p className="text-sm text-slate-400">Fecha límite</p>
+                <p className={`mt-2 text-3xl font-semibold tracking-tight sm:text-[2.2rem] ${theme.dateText}`}>
+                  {resolvedDeadline}
+                </p>
+                {resolvedDeadlineTime ? (
+                  <p className="mt-1 text-base text-slate-400 sm:text-lg">{resolvedDeadlineTime}</p>
+                ) : null}
+              </div>
+
+              <button
+                type="button"
+                onClick={() => setExpanded((value) => !value)}
+                aria-label={expanded ? 'Contraer actividad' : 'Expandir actividad'}
+                className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-700 hover:text-white"
+              >
+                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
+              </button>
+            </div>
+
+            {timeContext.label ? (
+              <div className="mt-5 flex justify-end">
+                <span
+                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${getTimeContextClass(
+                    timeContext.level,
+                  )}`}
+                >
+                  {TimeBadgeIcon ? <TimeBadgeIcon className="h-4 w-4" /> : null}
+                  {timeContext.label}
+                </span>
+              </div>
             ) : null}
           </div>
         </div>
 
-        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getBadgeClass(estado)}`}>
-          {estado}
-        </span>
-      </div>
+        {expanded ? (
+          <div className="mt-6 border-t border-slate-800 pt-6">
+            {instructionsText ? (
+              <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5">
+                <div className="flex items-center gap-2 text-slate-300">
+                  <AlignLeft className="h-4 w-4 text-slate-500" />
+                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
+                    Instrucciones
+                  </h4>
+                </div>
 
-      {shownInstructions ? (
-        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Instrucciones</p>
-          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{shownInstructions}</p>
-        </div>
-      ) : null}
+                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
+                  {instructionsExpanded || instructionsText.length <= 200 ? instructionsText : instructionsPreview}
+                </p>
 
-      {downloadError ? (
-        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
-          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
-          <p>{downloadError}</p>
-        </div>
-      ) : null}
-
-      {archivos.length > 0 ? (
-        <div className="mt-5 space-y-3">
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Archivos adjuntos</p>
-          <div className="space-y-2">
-            {visibleFiles.map((archivo) => {
-              const fileMeta = getFileIcon(archivo.name);
-              const FileIcon = fileMeta.icon;
-
-              return (
-                <div
-                  key={`${archivo.url}-${archivo.name}`}
-                  className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
-                >
-                  <div className="flex items-center gap-3">
-                    <FileIcon className={`h-4 w-4 ${fileMeta.color}`} />
-                    <div className="min-w-0">
-                      <p className="truncate text-sm text-slate-200">{archivo.name}</p>
-                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
-                        {fileMeta.type}
-                      </p>
-                    </div>
-                  </div>
+                {instructionsText.length > 200 ? (
                   <button
                     type="button"
-                    onClick={() => handleDownload(archivo)}
-                    disabled={downloadingKey === archivo.url}
-                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-itson-blue/50 px-3 py-1 text-xs text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
+                    onClick={() => setInstructionsExpanded((value) => !value)}
+                    className="mt-4 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
                   >
-                    {downloadingKey === archivo.url ? (
-                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
-                    ) : (
-                      <Download className="h-3.5 w-3.5" />
-                    )}
-                    {downloadingKey === archivo.url ? 'Descargando...' : 'Descargar'}
+                    {instructionsExpanded ? 'Ver menos' : 'Ver más'}
                   </button>
+                ) : null}
+              </section>
+            ) : null}
+
+            {archivos.length > 0 ? (
+              <section className={`${instructionsText ? 'mt-6' : ''}`}>
+                <div className="flex items-center justify-between gap-4">
+                  <div className="flex items-center gap-2 text-slate-400">
+                    <Paperclip className="h-4 w-4" />
+                    <h4 className="text-sm font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
+                  </div>
+
+                  <span className="text-sm text-slate-500">{archivos.length} archivo{archivos.length === 1 ? '' : 's'}</span>
                 </div>
-              );
-            })}
+
+                <div className="mt-4 grid gap-3 lg:grid-cols-3">
+                  {visibleFiles.map((archivo) => {
+                    const fileMeta = getFileIcon(archivo.name);
+                    const FileIcon = fileMeta.icon;
+                    const isDownloading = downloadingKey === archivo.url;
+
+                    return (
+                      <div
+                        key={`${archivo.url}-${archivo.name}`}
+                        className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4"
+                      >
+                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60">
+                          <FileIcon className={`h-6 w-6 ${fileMeta.color}`} />
+                        </div>
+
+                        <div className="min-w-0 flex-1">
+                          <p className="truncate text-sm font-medium text-slate-100">{archivo.name}</p>
+                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{fileMeta.label}</p>
+                        </div>
+
+                        <button
+                          type="button"
+                          onClick={() => handleDownload(archivo)}
+                          disabled={isDownloading}
+                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
+                          aria-label={`Descargar ${archivo.name}`}
+                        >
+                          {isDownloading ? (
+                            <Loader2 className="h-4 w-4 animate-spin" />
+                          ) : (
+                            <Download className="h-4 w-4" />
+                          )}
+                        </button>
+                      </div>
+                    );
+                  })}
+
+                  {extraFilesCount > 0 ? (
+                    <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/55 px-4 py-4 text-center text-slate-300">
+                      <div>
+                        <p className="text-lg font-semibold">+{extraFilesCount} más</p>
+                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Archivos ocultos</p>
+                      </div>
+                    </div>
+                  ) : null}
+                </div>
+
+                {archivos.length > 1 ? (
+                  <div className="mt-5 flex justify-end">
+                    <button
+                      type="button"
+                      onClick={handleDownloadAll}
+                      disabled={downloadingAll}
+                      className="inline-flex items-center gap-2 rounded-2xl border border-itson-blue/50 px-5 py-3 text-sm font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
+                    >
+                      {downloadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
+                      {downloadingAll ? 'Descargando...' : 'Descargar todos'}
+                    </button>
+                  </div>
+                ) : null}
+              </section>
+            ) : null}
+
+            {downloadError ? (
+              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+                <p>{downloadError}</p>
+              </div>
+            ) : null}
+
+            <footer className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
+              <div className="flex items-center gap-2">
+                <Calendar className="h-4 w-4" />
+                {estado === 'cerrada' ? (
+                  <span>Cerrada el: {footerClosed}</span>
+                ) : footerPublication ? (
+                  <span>Publicado: {footerPublication}</span>
+                ) : null}
+              </div>
+            </footer>
           </div>
-        </div>
-      ) : null}
-
-      {(startsCollapsed || (previewText && previewText.length > 200) || archivos.length > 3) ? (
-        <button
-          type="button"
-          onClick={() => setExpanded((value) => !value)}
-          className="mt-5 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
-        >
-          {expanded ? 'Ver menos' : 'Ver más'}
-        </button>
-      ) : null}
+        ) : null}
+      </div>
     </article>
   );
 }
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 4390e3f..5826c30 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -7,7 +7,7 @@ import {
   Zap,
   X,
 } from 'lucide-react';
-import { useState } from 'react';
+import { useMemo, useState } from 'react';
 import ActivityCard from '../components/ActivityCard';
 
 const tabs = [
@@ -45,6 +45,25 @@ function formatLastSync(lastSyncAt) {
   }).format(syncDate)}`;
 }
 
+function parseActivityDate(value) {
+  if (!value || typeof value !== 'string') {
+    return null;
+  }
+
+  const trimmedValue = value.trim();
+
+  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
+    return null;
+  }
+
+  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
+  return Number.isNaN(parsed) ? null : parsed;
+}
+
+function compareText(left = '', right = '') {
+  return left.localeCompare(right, 'es', { sensitivity: 'base', numeric: true });
+}
+
 function StatCard({ icon: Icon, label, value }) {
   return (
     <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
@@ -64,6 +83,7 @@ function StatCard({ icon: Icon, label, value }) {
 function Actividades({ activities = [], error, lastSyncAt, loading, onSync, progress }) {
   const [activeTab, setActiveTab] = useState('pendiente');
   const [searchQuery, setSearchQuery] = useState('');
+  const [sortBy, setSortBy] = useState('deadline-asc');
   const counts = {
     pendiente: activities.filter((item) => item.estado === 'pendiente').length,
     retrasada: activities.filter((item) => item.estado === 'retrasada').length,
@@ -78,8 +98,48 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
 
     return [item.nombre, item.materia].some((field) =>
       (field || '').toLowerCase().includes(normalizedQuery),
-    );
+      );
   });
+  const sortedActivities = useMemo(() => {
+    const items = [...filteredActivities];
+
+    const sortByDeadline = (ascending) => (left, right) => {
+      const leftDate = parseActivityDate(left.fechaLimite);
+      const rightDate = parseActivityDate(right.fechaLimite);
+
+      if (leftDate === null && rightDate === null) {
+        return compareText(left.nombre || '', right.nombre || '');
+      }
+
+      if (leftDate === null) {
+        return 1;
+      }
+
+      if (rightDate === null) {
+        return -1;
+      }
+
+      return ascending ? leftDate - rightDate : rightDate - leftDate;
+    };
+
+    switch (sortBy) {
+      case 'deadline-desc':
+        return items.sort(sortByDeadline(false));
+      case 'name-asc':
+        return items.sort((left, right) =>
+          compareText(left.nombre || '', right.nombre || '') ||
+          compareText(left.materia || '', right.materia || ''),
+        );
+      case 'subject-asc':
+        return items.sort((left, right) =>
+          compareText(left.materia || '', right.materia || '') ||
+          compareText(left.nombre || '', right.nombre || ''),
+        );
+      case 'deadline-asc':
+      default:
+        return items.sort(sortByDeadline(true));
+    }
+  }, [filteredActivities, sortBy]);
 
   const handleTabChange = (tabId) => {
     setActiveTab(tabId);
@@ -137,25 +197,39 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
         </div>
       ) : null}
 
-      <div className="relative">
-        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
-        <input
-          type="text"
-          value={searchQuery}
-          onChange={(event) => setSearchQuery(event.target.value)}
-          placeholder="Buscar por nombre o materia..."
-          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pl-10 pr-11 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
-        />
-        {searchQuery ? (
-          <button
-            type="button"
-            onClick={() => setSearchQuery('')}
-            aria-label="Limpiar búsqueda"
-            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
-          >
-            <X className="h-4 w-4" />
-          </button>
-        ) : null}
+      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
+        <div className="relative">
+          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
+          <input
+            type="text"
+            value={searchQuery}
+            onChange={(event) => setSearchQuery(event.target.value)}
+            placeholder="Buscar por nombre o materia..."
+            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pl-10 pr-11 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+          />
+          {searchQuery ? (
+            <button
+              type="button"
+              onClick={() => setSearchQuery('')}
+              aria-label="Limpiar búsqueda"
+              className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
+            >
+              <X className="h-4 w-4" />
+            </button>
+          ) : null}
+        </div>
+
+        <select
+          value={sortBy}
+          onChange={(event) => setSortBy(event.target.value)}
+          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+          aria-label="Ordenar actividades"
+        >
+          <option value="deadline-asc">Fecha límite (más próxima)</option>
+          <option value="deadline-desc">Fecha límite (más lejana)</option>
+          <option value="name-asc">Nombre A-Z</option>
+          <option value="subject-asc">Materia</option>
+        </select>
       </div>
 
       <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
@@ -213,9 +287,9 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
             </div>
           ))}
         </div>
-      ) : filteredActivities.length > 0 ? (
+      ) : sortedActivities.length > 0 ? (
         <div className="space-y-4">
-          {filteredActivities.map((activity) => (
+          {sortedActivities.map((activity) => (
             <ActivityCard key={activity.id} {...activity} />
           ))}
         </div>
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
