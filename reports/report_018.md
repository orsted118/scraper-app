# Report 018
**Fecha:** 2026-05-17 23:50  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index a9c8955..b68f608 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -102,15 +102,27 @@ function parseDueDate(value) {
   return Number.isNaN(parsed) ? null : new Date(parsed);
 }
 
-function classifyAssignment({ dueDate, submission, grade }) {
-  const lowerSubmission = (submission || '').toLowerCase();
-  const normalizedGrade = (grade || '').trim();
-
-  if (
-    lowerSubmission.includes('submitted') ||
-    lowerSubmission.includes('graded') ||
-    (normalizedGrade && normalizedGrade !== '-' && normalizedGrade.toLowerCase() !== 'not graded')
-  ) {
+function classifyAssignment({ dueDate, submission, submissionState }) {
+  const lowerSubmission = normalizeWhitespace(submission).toLowerCase();
+  const detailText = normalizeWhitespace(submissionState?.statusSummary || submissionState?.bodyText || '').toLowerCase();
+
+  const isDelivered =
+    Boolean(submissionState?.deliveredByClass) ||
+    Boolean(submissionState?.deliveredByText) ||
+    /submitted for grading|assignment was submitted|submitted to grading|submissionstatussubmitted/i.test(lowerSubmission) ||
+    /submitted for grading|assignment was submitted|submitted to grading/i.test(detailText);
+
+  if (isDelivered) {
+    return null;
+  }
+
+  const isClosed =
+    Boolean(submissionState?.closedByText) ||
+    (!submissionState?.hasSubmitAction &&
+      (/no submission/i.test(lowerSubmission) ||
+        /submission is not open|closed|no se permiten m[aá]s env[ií]os|esta tarea est[aá] cerrada/i.test(detailText)));
+
+  if (isClosed) {
     return 'cerrada';
   }
 
@@ -225,6 +237,13 @@ async function collectAssignmentDetails(page, assignment) {
   await page.goto(assignment.url, { waitUntil: 'domcontentloaded' });
 
   const details = await page.evaluate((courseName) => {
+    const normalize = (value) =>
+      (value || '')
+        .replace(/\r/g, '')
+        .replace(/[ \t]+/g, ' ')
+        .replace(/\n{3,}/g, '\n\n')
+        .trim();
+
     const main = document.querySelector('#region-main') || document.body;
     const intro = document.querySelector('#intro');
     const introText = (intro?.textContent || '').replace(/\r/g, '');
@@ -246,10 +265,64 @@ async function collectAssignmentDetails(page, assignment) {
       (file, index, array) => index === array.findIndex((entry) => entry.url === file.url),
     );
 
+    const bodyText = normalize(document.body?.textContent || '');
+    const statusTableText = normalize(document.querySelector('.submissionstatustable')?.textContent || '');
+    const deliveredByClass = Boolean(document.querySelector('.submissionstatussubmitted'));
+    const deliveredByText = /submitted for grading|assignment was submitted|submitted to grading/i.test(
+      statusTableText,
+    );
+    const closedByText = /submission is not open|no se permiten m[aá]s env[ií]os|esta tarea est[aá] cerrada|submission closed|submissions are closed|no submission allowed/i.test(
+      bodyText,
+    );
+    const submitActions = Array.from(
+      document.querySelectorAll('button, input[type="submit"], input[type="button"], a'),
+    ).map((element) => {
+      const label = normalize(
+        [element.textContent, element.value, element.getAttribute('aria-label'), element.getAttribute('title')]
+          .filter(Boolean)
+          .join(' '),
+      );
+      const disabled =
+        Boolean(element.disabled) ||
+        element.getAttribute('disabled') !== null ||
+        element.getAttribute('aria-disabled') === 'true' ||
+        element.classList.contains('disabled');
+      const style = window.getComputedStyle(element);
+      const rect = element.getBoundingClientRect();
+
+      return {
+        disabled,
+        label,
+        visible:
+          style.display !== 'none' &&
+          style.visibility !== 'hidden' &&
+          rect.width > 0 &&
+          rect.height > 0,
+      };
+    });
+    const hasSubmitAction = submitActions.some(
+      (action) =>
+        action.visible &&
+        !action.disabled &&
+        /add submission|submit assignment|enviar tarea|entregar/i.test(action.label),
+    );
+    const hasDisabledSubmitAction = submitActions.some(
+      (action) =>
+        /add submission|submit assignment|enviar tarea|entregar/i.test(action.label) &&
+        action.disabled,
+    );
+
     return {
       archivos: uniqueAttachments,
+      bodyText,
+      closedByText,
+      deliveredByClass,
+      deliveredByText,
       introText,
       materia: courseName,
+      hasDisabledSubmitAction,
+      hasSubmitAction,
+      statusTableText,
     };
   }, assignment.courseName);
   let instructions = normalizeWhitespace(details.introText);
@@ -270,6 +343,15 @@ async function collectAssignmentDetails(page, assignment) {
 
   return {
     archivos: details.archivos,
+    submissionState: {
+      bodyText: details.bodyText,
+      closedByText: details.closedByText,
+      deliveredByClass: details.deliveredByClass,
+      deliveredByText: details.deliveredByText,
+      hasDisabledSubmitAction: details.hasDisabledSubmitAction,
+      hasSubmitAction: details.hasSubmitAction,
+      statusSummary: details.statusTableText,
+    },
     instrucciones: instructions,
     materia: details.materia,
   };
@@ -348,14 +430,24 @@ async function scrapeIVirtualActivities(event) {
     for (let courseIndex = 0; courseIndex < courses.length; courseIndex += 1) {
       const course = courses[courseIndex];
       const courseAssignments = await collectAssignmentsFromCourse(page, course);
-      const courseActivities = await processInChunks(
+      const courseActivities = (await processInChunks(
         courseAssignments,
         3,
         async (assignment, indexInChunk) => {
           const details = await collectAssignmentDetails(detailPages[indexInChunk], assignment);
+          const estado = classifyAssignment({
+            dueDate: assignment.dueDate,
+            submission: assignment.submission,
+            submissionState: details.submissionState,
+          });
+
+          if (!estado) {
+            return null;
+          }
+
           return {
             archivos: details.archivos,
-            estado: classifyAssignment(assignment),
+            estado,
             fechaLimite: assignment.dueDate || 'Sin fecha visible',
             instrucciones: details.instrucciones,
             materia: details.materia,
@@ -365,7 +457,7 @@ async function scrapeIVirtualActivities(event) {
             url: assignment.url,
           };
         },
-      );
+      )).filter(Boolean);
 
       courseActivities.forEach((activity, indexWithinCourse) => {
         activities.push({
@@ -424,6 +516,7 @@ function registerScraperHandlers() {
 
 module.exports = {
   clearActivitiesCache,
+  classifyAssignment,
   getActivitiesCachePath,
   getActivitiesWithCache,
   registerScraperHandlers,
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 286254c..4390e3f 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -13,7 +13,7 @@ import ActivityCard from '../components/ActivityCard';
 const tabs = [
   { id: 'pendiente', label: 'Pendientes' },
   { id: 'retrasada', label: 'Retrasadas' },
-  { id: 'cerrada', label: 'Cerradas' },
+  { id: 'cerrada', label: 'Cerradas', title: 'Actividades que cerraron sin ser entregadas' },
 ];
 
 function formatLastSync(lastSyncAt) {
@@ -168,6 +168,7 @@ function Actividades({ activities = [], error, lastSyncAt, loading, onSync, prog
                 key={tab.id}
                 type="button"
                 onClick={() => handleTabChange(tab.id)}
+                title={tab.title || tab.label}
                 className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                   isActive
                     ? 'bg-itson-blue text-slate-50'
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
