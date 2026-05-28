# Report 058
**Fecha:** 2026-05-27 22:29  
**Agente:** Codex  
**Tipo:** feature

## Contexto Git
**Rama:** master
**Último commit:** 6efe3d6 — fix: color picker como ventana flotante compacta sin fondo borroso
**Archivos modificados:** 4

## Archivos modificados
- `electron/handlers/cia.js` — archivo actualizado en esta tarea
- `generate-report.js` — archivo actualizado en esta tarea
- `src/components/GradeCard.jsx` — archivo creado como parte de la base inicial
- `src/pages/Calificaciones.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| electron/handlers/cia.js | 177 | 62 |
| generate-report.js | 20 | 10 |
| src/components/GradeCard.jsx | 291 | 0 |
| src/pages/Calificaciones.jsx | 37 | 139 |

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/cia.js`
```diff
diff --git a/electron/handlers/cia.js b/electron/handlers/cia.js
index bd55417..78e520f 100644
--- a/electron/handlers/cia.js
+++ b/electron/handlers/cia.js
@@ -1,6 +1,8 @@
 const fs = require('fs');
 const path = require('path');
-const { app, ipcMain } = require('electron');
+const electron = require('electron');
+const app = electron?.app;
+const ipcMain = electron?.ipcMain;
 const { chromium } = require('playwright');
 const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
 
@@ -14,7 +16,17 @@ function normalizeWhitespace(value) {
 }
 
 function getCIACachePath() {
-  return path.join(app.getPath('userData'), 'cia-cache.json');
+  return path.join(getCIAUserDataPath(), 'cia-cache.json');
+}
+
+function getCIAUserDataPath() {
+  if (app && typeof app.getPath === 'function') {
+    return app.getPath('userData');
+  }
+
+  const fallbackPath = path.join(process.cwd(), '.local-data');
+  fs.mkdirSync(fallbackPath, { recursive: true });
+  return fallbackPath;
 }
 
 function discardCIACache(cachePath) {
@@ -197,11 +209,141 @@ function parseFinalGrade(value) {
     return null;
   }
 
-  const normalized = value.replace(',', '.');
+  if (/^\s*-+\s*$/.test(value) || /^[A-Z]\s*$/i.test(value)) {
+    return null;
+  }
+
+  const normalized = String(value).replace(',', '.');
   const parsed = Number(normalized);
   return Number.isFinite(parsed) ? parsed : null;
 }
 
+function getGradeStatus(promedio, calificaciones = []) {
+  const hasGrades = calificaciones.some((item) => Number.isFinite(item?.calificacion));
+
+  if (!hasGrades || !Number.isFinite(promedio)) {
+    return 'sin_calificacion';
+  }
+
+  if (promedio >= 7) {
+    return 'aprobada';
+  }
+
+  if (promedio >= 6) {
+    return 'en_riesgo';
+  }
+
+  return 'reprobada';
+}
+
+function normalizeCourseCode(value = '') {
+  return normalizeWhitespace(value).replace(/\s+/g, '').toUpperCase();
+}
+
+function cleanCourseName(value = '') {
+  return normalizeWhitespace(
+    value
+      .replace(/\s+-\s*/g, ' ')
+      .replace(/\s{2,}/g, ' '),
+  );
+}
+
+function buildPartialEntries(cells) {
+  const relevantCells = cells
+    .filter((item) => item.x >= 220 && item.x < 705)
+    .filter((item) => /^-?\d+(?:[.,]\d+)?$/.test(item.text) || /^\s*-+\s*$/.test(item.text));
+
+  const visiblePartials = relevantCells
+    .filter((item) => Number.isFinite(parseFinalGrade(item.text)))
+    .map((item, index) => ({
+      nombre: `Parcial ${index + 1}`,
+      etiqueta: `P${index + 1}`,
+      parcial: `P${index + 1}`,
+      calificacion: parseFinalGrade(item.text),
+      sobre: 10,
+    }));
+
+  if (visiblePartials.length > 0) {
+    return visiblePartials;
+  }
+
+  // The current CIA PDF often renders partial columns as "-" even when final
+  // grades are visible. Keep explicit partial slots so the UI can distinguish
+  // "no partial uploaded yet" from "only final was parsed".
+  return Array.from({ length: Math.min(3, Math.max(1, relevantCells.length || 3)) }, (_, index) => ({
+    nombre: `Parcial ${index + 1}`,
+    etiqueta: `P${index + 1}`,
+    parcial: `P${index + 1}`,
+    calificacion: null,
+    sobre: 10,
+  }));
+}
+
+function buildComponentFromRow(row, fallbackTipo = 'Teoría') {
+  return {
+    tipo: row.componente || fallbackTipo,
+    calificaciones: row.calificaciones,
+    promedio: row.promedio,
+  };
+}
+
+function groupMateriasByCode(rows) {
+  const groups = new Map();
+
+  rows.forEach((row) => {
+    const code = normalizeCourseCode(row.codigo || row.clave);
+    if (!code) return;
+
+    if (!groups.has(code)) {
+      groups.set(code, []);
+    }
+
+    groups.get(code).push(row);
+  });
+
+  return [...groups.entries()].map(([codigo, groupRows]) => {
+    const primary = groupRows[0];
+    const numericPromedios = groupRows
+      .map((row) => row.promedio)
+      .filter((value) => Number.isFinite(value));
+    const promedio =
+      numericPromedios.length > 0
+        ? Number((numericPromedios.reduce((sum, value) => sum + value, 0) / numericPromedios.length).toFixed(2))
+        : null;
+    const hasLabInName = /(?:c\/lab|\/lab|laboratorio)/i.test(primary.nombre);
+    const hasMultipleComponents = groupRows.length > 1;
+    const tieneComponentes = hasMultipleComponents || hasLabInName;
+    let componentes = [];
+
+    if (hasMultipleComponents) {
+      componentes = groupRows.map((row, index) => buildComponentFromRow(row, index === 0 ? 'Teoría' : 'Laboratorio'));
+    } else if (hasLabInName) {
+      componentes = [
+        buildComponentFromRow(primary, 'Teoría'),
+        {
+          tipo: 'Laboratorio',
+          calificaciones: primary.calificaciones,
+          promedio: primary.promedio,
+        },
+      ];
+    }
+
+    const calificaciones = primary.calificaciones || [];
+
+    return {
+      codigo,
+      clave: codigo,
+      nombre: primary.nombre,
+      profesor: primary.profesor || '',
+      calificaciones,
+      promedio,
+      estado: getGradeStatus(promedio, calificaciones),
+      tieneComponentes,
+      componentes,
+    };
+  });
+}
+
 function extractMateriasFromPage(pageTextItems) {
   const groupedRows = new Map();
 
@@ -215,7 +357,7 @@ function extractMateriasFromPage(pageTextItems) {
     groupedRows.get(rowKey).push(item);
   });
 
-  const materias = [];
+  const rows = [];
 
   [...groupedRows.entries()]
     .sort((a, b) => b[0] - a[0])
@@ -232,83 +374,56 @@ function extractMateriasFromPage(pageTextItems) {
         return;
       }
 
-      const codeIndex = sortedItems.findIndex((item) => isGradeCode(item.text));
+      const codeIndex = sortedItems.findIndex((item) => item.x >= 20 && item.x <= 75 && isGradeCode(item.text));
 
       if (codeIndex < 0) {
         return;
       }
 
-      const clave = sortedItems[codeIndex].text;
-      const contentItems = sortedItems.slice(codeIndex + 1);
-      const nombreParts = [];
-      const partialGrades = [];
-      let finalGrade = null;
-
-      contentItems.forEach((item) => {
-        const isNumeric = /^-?\d+(?:[.,]\d+)?$/.test(item.text);
-
-        if (item.x >= 760 && isNumeric) {
-          finalGrade = parseFinalGrade(item.text);
-          return;
-        }
-
-        if (item.x >= 700) {
-          return;
-        }
-
-        if (isNumeric) {
-          partialGrades.push(parseFinalGrade(item.text));
-          return;
-        }
+      const codigo = normalizeCourseCode(sortedItems[codeIndex].text);
+      const nombre = cleanCourseName(
+        sortedItems
+          .filter((item) => item.x > 70 && item.x < 225)
+          .map((item) => item.text)
+          .filter((text) => text && !/^(?:TOTAL|CALIF|FALTAS|-+)$/i.test(text))
+          .join(' '),
+      );
 
-        if (/^(?:TOTAL|CALIF|FALTAS)$/i.test(item.text)) {
-          return;
-        }
-
-        nombreParts.push(item.text);
-      });
-
-      const nombre = normalizeWhitespace(nombreParts.join(' '));
-
-      if (!nombre || /^(?:REGISTRO DE EVALUACIONES|INSTITUTO TECNOL[ÓO]GICO|CICLO LECTIVO|PLAN|NOMBRE|PROGRAMA|ID ALUMNO)/i.test(nombre)) {
+      if (!nombre || /^(?:REGISTRO DE EVALUACIONES|INSTITUTO TECNOL[ÓO]GICO|CICLO LECTIVO|PLAN\b|NOMBRE\b|PROGRAMA\b|ID ALUMNO)/i.test(nombre)) {
         return;
       }
 
-      const partialEntries = partialGrades
-        .filter((value) => Number.isFinite(value))
-        .map((value, index) => ({ parcial: `Parcial ${index + 1}`, calificacion: value }));
-      const calificaciones =
-        partialEntries.length > 0
-          ? [
-              ...partialEntries,
-              ...(Number.isFinite(finalGrade) ? [{ parcial: 'Final', calificacion: finalGrade }] : []),
-            ]
-          : [{ parcial: 'Final', calificacion: finalGrade }];
+      const finalGradeItem = sortedItems
+        .filter((item) => item.x >= 740)
+        .sort((a, b) => b.x - a.x)
+        .find((item) => /^-?\d+(?:[.,]\d+)?$/.test(item.text) || /^\s*-+\s*$/.test(item.text) || /^[A-Z]\s*$/i.test(item.text));
+      const finalGrade = parseFinalGrade(finalGradeItem?.text);
+      const partialEntries = buildPartialEntries(sortedItems);
+      const calificaciones = [
+        ...partialEntries,
+        {
+          nombre: 'Final',
+          etiqueta: 'Final',
+          parcial: 'Final',
+          calificacion: finalGrade,
+          sobre: 10,
+        },
+      ];
 
       const promedio = Number.isFinite(finalGrade) ? finalGrade : null;
 
-      let estado = 'sin_calificacion';
-      if (promedio !== null) {
-        if (promedio >= 70) {
-          estado = 'aprobada';
-        } else if (promedio >= 60) {
-          estado = 'en_riesgo';
-        } else {
-          estado = 'reprobada';
-        }
-      }
-
-      materias.push({
-        clave,
+      rows.push({
+        codigo,
+        clave: codigo,
         nombre,
         profesor: '',
         calificaciones,
         promedio,
-        estado,
+        estado: getGradeStatus(promedio, calificaciones),
       });
     });
 
-  return materias;
+  return groupMateriasByCode(rows);
 }
 
 async function extractCalificacionesFromPdf(buffer) {
```

### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index c7cd4af..ac94230 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -19,22 +19,32 @@ const MAX_DIFF_BYTES = 150 * 1024;
 
 const VERIFICATION = {
   buildStatus: 'PASS',
-  testsRun: 'ninguno',
-  verificationCmd: 'npm run build',
-  verificationOutput: `> scraper-app@0.1.0 build
+  testsRun: 'Comando obligatorio de CIA + npm run build',
+  verificationCmd: 'node -e "require(\'dotenv\').config(); const c=require(\'./electron/handlers/cia\'); c.clearCIACache(); c.getCalificacionesWithCache().then(r => { r.materias?.forEach(m => console.log(m.nombre, \'|\', m.codigo, \'|\', m.profesor, \'|\', JSON.stringify(m.calificaciones), \'|\', m.promedio)); console.log(\'Total:\', r.materias?.length); })"',
+  verificationOutput: `◇ injected env (5) from .env // tip: ⌁ auth for agents [www.vestauth.com]
+Precálculo | 1165M |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":6,"sobre":10}] | 6
+Ingles Universitario A1 | 1043D |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":7,"sobre":10}] | 7
+Sist Operativos y Arq de Comp | 1123C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
+Matematicas Discretas | 1178M |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":7,"sobre":10}] | 7
+Programacion II c/Lab | 1124C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
+Tecnologia y Empresa | 1115C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
+Tutoria 2 (INSOF) | 1132T |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":null,"sobre":10}] | null
+Total: 7
+
+> scraper-app@0.1.0 build
 > vite build
 
-The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
 vite v5.4.21 building for production...
 transforming...
-✓ 1765 modules transformed.
+✓ 1766 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                        0.41 kB | gzip:  0.28 kB
-dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-CwYUsmUR.css        28.03 kB | gzip:  6.09 kB
-dist/assets/index-Dpb30FCB.js        272.34 kB | gzip: 75.95 kB
-✓ built in 6.41s`,
+dist/index.html                      0.41 kB │ gzip:  0.27 kB
+dist/assets/logo-itson-GKrD7IS7.png  37.09 kB
+dist/assets/index-ByOxmHud.css       28.90 kB │ gzip:  6.24 kB
+dist/assets/index-C9dellb7.js        278.47 kB │ gzip: 77.13 kB
+✓ built in 9.76s
+The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
 };
 
 function ensureReportsDir() {
```

### `src/components/GradeCard.jsx`
```diff
diff --git a/src/components/GradeCard.jsx b/src/components/GradeCard.jsx
new file mode 100644
index 0000000..587b06f
--- /dev/null
+++ b/src/components/GradeCard.jsx
@@ -0,0 +1,291 @@
+import {
+  CheckCircle2,
+  ClipboardList,
+  Code2,
+  FlaskConical,
+  UserRound,
+  XCircle,
+  AlertTriangle,
+  MinusCircle,
+} from 'lucide-react';
+
+const STATUS_META = {
+  aprobada: {
+    label: 'Aprobada',
+    icon: CheckCircle2,
+    color: 'var(--success-text)',
+    bg: 'var(--success-bg)',
+    border: 'var(--success-border)',
+  },
+  en_riesgo: {
+    label: 'En riesgo',
+    icon: AlertTriangle,
+    color: 'var(--retrasada-text)',
+    bg: 'var(--retrasada-bg)',
+    border: 'var(--retrasada-border)',
+  },
+  reprobada: {
+    label: 'Reprobada',
+    icon: XCircle,
+    color: 'var(--error-text)',
+    bg: 'var(--error-bg)',
+    border: 'var(--error-border)',
+  },
+  sin_calificacion: {
+    label: 'Sin calificación',
+    icon: MinusCircle,
+    color: 'var(--closed-text)',
+    bg: 'var(--closed-bg)',
+    border: 'var(--closed-border)',
+  },
+};
+
+function normalizeGrade(value) {
+  if (value === null || value === undefined || Number.isNaN(Number(value))) {
+    return null;
+  }
+
+  return Number(value);
+}
+
+function getMateriaStatus(materia) {
+  if (materia?.estado && STATUS_META[materia.estado]) {
+    return materia.estado;
+  }
+
+  const promedio = normalizeGrade(materia?.promedio);
+  const hasGrades = Array.isArray(materia?.calificaciones)
+    ? materia.calificaciones.some((item) => normalizeGrade(item.calificacion) !== null)
+    : false;
+
+  if (!hasGrades || promedio === null) return 'sin_calificacion';
+  if (promedio >= 7) return 'aprobada';
+  if (promedio >= 6) return 'en_riesgo';
+  return 'reprobada';
+}
+
+function formatGrade(value) {
+  const numericValue = normalizeGrade(value);
+
+  if (numericValue === null) {
+    return '--';
+  }
+
+  return numericValue.toFixed(1);
+}
+
+function getGradeColor(value) {
+  const numericValue = normalizeGrade(value);
+
+  if (numericValue === null) {
+    return 'var(--text-muted)';
+  }
+
+  if (numericValue >= 7) {
+    return 'var(--success-text)';
+  }
+
+  if (numericValue >= 6) {
+    return 'var(--retrasada-text)';
+  }
+
+  return 'var(--error-text)';
+}
+
+function getGradeLabel(item) {
+  return item?.etiqueta || item?.parcial || item?.nombre || 'Parcial';
+}
+
+function StatusBadge({ status }) {
+  const meta = STATUS_META[status] || STATUS_META.sin_calificacion;
+  const Icon = meta.icon;
+
+  return (
+    <span
+      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
+      style={{
+        background: meta.bg,
+        borderColor: meta.border,
+        color: meta.color,
+      }}
+    >
+      <Icon className="h-4 w-4" />
+      {meta.label}
+    </span>
+  );
+}
+
+function GradeChip({ grade }) {
+  return (
+    <span
+      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
+      style={{
+        background: 'var(--bg-secondary)',
+        borderColor: 'var(--border-subtle)',
+        color: 'var(--text-normal)',
+      }}
+      title={grade?.nombre || getGradeLabel(grade)}
+    >
+      <span>{getGradeLabel(grade)}:</span>
+      <strong style={{ color: getGradeColor(grade?.calificacion) }}>
+        {formatGrade(grade?.calificacion)}
+      </strong>
+    </span>
+  );
+}
+
+function EmptyGrades() {
+  return (
+    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{
+      background: 'var(--bg-secondary)',
+      borderColor: 'var(--border-subtle)',
+    }}>
+      <ClipboardList className="h-5 w-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
+      <div>
+        <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+          Sin calificaciones registradas aún
+        </p>
+        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+          El profesor aún no ha subido calificaciones.
+        </p>
+      </div>
+    </div>
+  );
+}
+
+function ComponentRow({ component, index }) {
+  const isLab = /lab/i.test(component?.tipo || '');
+  const label = component?.tipo || (index === 0 ? 'Teoría' : 'Laboratorio');
+  const grades = Array.isArray(component?.calificaciones) ? component.calificaciones : [];
+
+  return (
+    <div className="flex flex-wrap items-center gap-3">
+      <span
+        className="inline-flex min-w-24 justify-center rounded-lg px-3 py-1.5 text-xs font-semibold"
+        style={{
+          background: isLab ? 'var(--success-bg)' : 'rgba(0, 109, 182, 0.16)',
+          color: isLab ? 'var(--success-text)' : 'var(--accent-hover)',
+          border: `1px solid ${isLab ? 'var(--success-border)' : 'rgba(0, 109, 182, 0.35)'}`,
+        }}
+      >
+        {label}
+      </span>
+
+      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
+        {grades.length > 0 ? grades.map((grade) => (
+          <GradeChip key={`${label}-${getGradeLabel(grade)}`} grade={grade} />
+        )) : <EmptyGrades />}
+      </div>
+
+      <div className="ml-auto min-w-24 text-right">
+        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+          Promedio
+        </p>
+        <p className="text-2xl font-bold leading-none" style={{ color: getGradeColor(component?.promedio) }}>
+          {formatGrade(component?.promedio)}
+        </p>
+      </div>
+    </div>
+  );
+}
+
+function GradeList({ materia }) {
+  const hasComponents =
+    materia?.tieneComponentes &&
+    Array.isArray(materia.componentes) &&
+    materia.componentes.length > 0;
+  const grades = Array.isArray(materia?.calificaciones) ? materia.calificaciones : [];
+
+  if (hasComponents) {
+    return (
+      <div className="space-y-4">
+        {materia.componentes.map((component, index) => (
+          <div key={`${component?.tipo || 'component'}-${index}`}>
+            {index > 0 ? (
+              <div className="mb-4 h-px w-full" style={{ background: 'var(--border-subtle)' }} />
+            ) : null}
+            <ComponentRow component={component} index={index} />
+          </div>
+        ))}
+      </div>
+    );
+  }
+
+  if (grades.length === 0) {
+    return <EmptyGrades />;
+  }
+
+  return (
+    <div className="flex flex-wrap justify-center gap-3">
+      {grades.map((grade) => (
+        <GradeChip key={getGradeLabel(grade)} grade={grade} />
+      ))}
+    </div>
+  );
+}
+
+function GradeCard({ materia }) {
+  const status = getMateriaStatus(materia);
+  const meta = STATUS_META[status] || STATUS_META.sin_calificacion;
+  const Icon = materia?.tieneComponentes ? FlaskConical : Code2;
+  const promedio = normalizeGrade(materia?.promedio);
+
+  return (
+    <article
+      className="overflow-hidden rounded-2xl border border-l-4 p-5 shadow-2xl shadow-black/10"
+      style={{
+        background: 'linear-gradient(135deg, var(--bg-card), rgba(15, 23, 42, 0.28))',
+        borderColor: 'var(--border-subtle)',
+        borderLeftColor: meta.color,
+      }}
+    >
+      <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)_220px] xl:items-center">
+        <div className="flex min-w-0 items-center gap-5">
+          <div
+            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
+            style={{
+              background: `color-mix(in srgb, ${meta.color} 22%, transparent)`,
+              boxShadow: `0 18px 42px color-mix(in srgb, ${meta.color} 12%, transparent)`,
+            }}
+          >
+            <Icon className="h-10 w-10" style={{ color: 'var(--text-strong)' }} />
+          </div>
+
+          <div className="min-w-0">
+            <h3 className="truncate text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
+              {materia?.nombre || 'Materia sin nombre'}
+            </h3>
+            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--accent-hover)' }}>
+              {materia?.codigo || materia?.clave || 'Código no disponible'}
+            </p>
+            <p className="mt-5 flex min-w-0 items-center gap-2 truncate text-sm" style={{ color: 'var(--text-muted)' }}>
+              <UserRound className="h-4 w-4 shrink-0" />
+              <span className="truncate">{materia?.profesor || 'Instructor pendiente de sincronizar'}</span>
+            </p>
+          </div>
+        </div>
+
+        <div
+          className="min-w-0 border-y py-5 xl:border-x xl:border-y-0 xl:px-7 xl:py-2"
+          style={{ borderColor: 'var(--border-subtle)' }}
+        >
+          <GradeList materia={materia} />
+        </div>
+
+        <div className="flex items-center justify-between gap-4 xl:flex-col xl:items-center xl:justify-center">
+          <StatusBadge status={status} />
+          <div className="text-right xl:text-center">
+            <p className="text-sm" style={{ color: 'var(--text-normal)' }}>
+              Promedio Final
+            </p>
+            <p className="text-5xl font-bold leading-none" style={{ color: promedio === null ? 'var(--text-muted)' : meta.color }}>
+              {promedio === null ? '--' : formatGrade(promedio)}
+            </p>
+          </div>
+        </div>
+      </div>
+    </article>
+  );
+}
+
+export default GradeCard;
```

### `src/pages/Calificaciones.jsx`
```diff
diff --git a/src/pages/Calificaciones.jsx b/src/pages/Calificaciones.jsx
index a47a6fb..e619600 100644
--- a/src/pages/Calificaciones.jsx
+++ b/src/pages/Calificaciones.jsx
@@ -4,39 +4,10 @@ import {
   BookOpen,
   CheckCircle2,
   GraduationCap,
-  Loader2,
   RefreshCw,
+  XCircle,
 } from 'lucide-react';
-
-const statusLabels = {
-  aprobada: 'Aprobada',
-  en_riesgo: 'En riesgo',
-  reprobada: 'Reprobada',
-  sin_calificacion: 'Sin calificación',
-};
-
-const statusStyles = {
-  aprobada: {
-    borderColor: 'rgba(16, 185, 129, 0.3)',
-    background: 'rgba(16, 185, 129, 0.1)',
-    color: 'rgb(209, 250, 229)',
-  },
-  en_riesgo: {
-    borderColor: 'rgba(249, 115, 22, 0.3)',
-    background: 'rgba(249, 115, 22, 0.1)',
-    color: 'rgb(254, 215, 170)',
-  },
-  reprobada: {
-    borderColor: 'rgba(239, 68, 68, 0.3)',
-    background: 'rgba(239, 68, 68, 0.1)',
-    color: 'rgb(254, 202, 202)',
-  },
-  sin_calificacion: {
-    borderColor: 'var(--border-normal)',
-    background: 'var(--bg-tertiary)',
-    color: 'var(--text-normal)',
-  },
-};
+import GradeCard from '../components/GradeCard';
 
 const ciaFriendlyErrors = {
   CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
@@ -56,7 +27,28 @@ function formatGrade(value) {
   }
 
   const numericValue = Number(value);
-  return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1);
+  return Number.isInteger(numericValue) ? numericValue.toFixed(1) : numericValue.toFixed(1);
+}
+
+function getMateriaStatus(materia) {
+  const promedio = typeof materia.promedio === 'number' ? materia.promedio : null;
+  const hasGrades = Array.isArray(materia.calificaciones)
+    ? materia.calificaciones.some((item) => typeof item.calificacion === 'number')
+    : false;
+
+  if (!hasGrades || promedio === null) {
+    return 'sin_calificacion';
+  }
+
+  if (promedio >= 7) {
+    return 'aprobada';
+  }
+
+  if (promedio >= 6) {
+    return 'en_riesgo';
+  }
+
+  return 'reprobada';
 }
 
 function formatLastSync(lastSyncAt) {
@@ -93,10 +85,11 @@ function getFriendlyCIAErrorMessage(errorCode, fallbackMessage = '') {
 }
 
 function StatCard({ icon: Icon, label, value, tone = 'default' }) {
-  const toneClasses = {
-    default: 'bg-itson-blue/10 text-itson-blue',
-    emerald: 'bg-emerald-500/10 text-emerald-300',
-    orange: 'bg-orange-500/10 text-orange-300',
+  const toneStyles = {
+    default: { background: 'rgba(0, 109, 182, 0.12)', color: 'var(--accent-hover)' },
+    emerald: { background: 'var(--success-bg)', color: 'var(--success-text)' },
+    orange: { background: 'var(--retrasada-bg)', color: 'var(--retrasada-text)' },
+    red: { background: 'var(--error-bg)', color: 'var(--error-text)' },
   };
 
   return (
@@ -105,7 +98,7 @@ function StatCard({ icon: Icon, label, value, tone = 'default' }) {
       style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
     >
       <div className="flex items-center gap-3">
-        <span className={`rounded-2xl p-3 ${toneClasses[tone] || toneClasses.default}`}>
+        <span className="rounded-2xl p-3" style={toneStyles[tone] || toneStyles.default}>
           <Icon className="h-5 w-5" />
         </span>
         <div>
@@ -121,103 +114,6 @@ function StatCard({ icon: Icon, label, value, tone = 'default' }) {
   );
 }
 
-function StatusBadge({ status }) {
-  return (
-    <span
-      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
-      style={statusStyles[status] || statusStyles.sin_calificacion}
-    >
-      {statusLabels[status] || statusLabels.sin_calificacion}
-    </span>
-  );
-}
-
-function PartialChip({ parcial, calificacion }) {
-  const numericValue = calificacion === null ? null : Number(calificacion);
-
-  const toneClasses =
-    numericValue === null
-      ? ''
-      : numericValue >= 70
-        ? 'bg-emerald-500/20 text-emerald-300'
-        : numericValue >= 60
-          ? 'bg-orange-500/20 text-orange-300'
-          : 'bg-red-500/20 text-red-300';
-  const toneStyle = numericValue === null
-    ? {
-      borderColor: 'var(--border-normal)',
-      background: 'var(--bg-tertiary)',
-      color: 'var(--text-muted)',
-    }
-    : undefined;
-
-  return (
-    <span
-      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClasses}`}
-      style={toneStyle}
-    >
-      <span>{parcial}</span>
-      <span>{formatGrade(calificacion)}</span>
-    </span>
-  );
-}
-
-function GradeCard({ materia }) {
-  const partials = Array.isArray(materia.calificaciones) && materia.calificaciones.length > 0
-    ? materia.calificaciones
-    : [{ parcial: 'Final', calificacion: null }];
-
-  return (
-    <article
-      className="rounded-2xl border p-6 shadow-lg shadow-slate-950/20"
-      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
-    >
-      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
-        <div className="space-y-2">
-          <div>
-            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
-              {materia.nombre || 'Materia sin nombre'}
-            </h3>
-            <p className="text-sm text-slate-400">{materia.clave || 'Clave no disponible'}</p>
-          </div>
-          <p className="text-sm text-slate-400">
-            {materia.profesor || 'Profesor no visible en CIA'}
-          </p>
-        </div>
-
-        <div className="flex shrink-0 items-center gap-3">
-          <StatusBadge status={materia.estado} />
-        </div>
-      </div>
-
-      <div className="mt-5 flex flex-wrap gap-2">
-        {partials.map((item) => (
-          <PartialChip
-            key={`${materia.clave || materia.nombre}-${item.parcial}`}
-            parcial={item.parcial}
-            calificacion={item.calificacion}
-          />
-        ))}
-      </div>
-
-      <div
-        className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
-        style={{ borderColor: 'var(--border-subtle)' }}
-      >
-        <p className="text-sm text-slate-400">
-          Promedio:{' '}
-          <span style={{ color: 'var(--text-strong)' }}>
-            {materia.promedio === null || materia.promedio === undefined ? '—' : formatGrade(materia.promedio)}
-          </span>
-        </p>
-        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
-          CIA ITSON · semestre actual
-        </p>
-      </div>
-    </article>
-  );
-}
-
 function Calificaciones({
   calificaciones = [],
   errorCIA,
@@ -228,8 +124,9 @@ function Calificaciones({
   onSyncCIA,
 }) {
   const materias = Array.isArray(calificaciones) ? calificaciones : [];
-  const aprobadas = materias.filter((materia) => materia.estado === 'aprobada').length;
-  const enRiesgo = materias.filter((materia) => materia.estado === 'en_riesgo').length;
+  const aprobadas = materias.filter((materia) => getMateriaStatus(materia) === 'aprobada').length;
+  const enRiesgo = materias.filter((materia) => getMateriaStatus(materia) === 'en_riesgo').length;
+  const reprobadas = materias.filter((materia) => getMateriaStatus(materia) === 'reprobada').length;
   const numericAverages = materias
     .map((materia) => (typeof materia.promedio === 'number' ? materia.promedio : null))
     .filter((value) => value !== null);
@@ -309,10 +206,11 @@ function Calificaciones({
         </div>
       </section>
 
-      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
+      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
         <StatCard icon={BookOpen} label="Total de materias" value={materias.length} />
         <StatCard icon={CheckCircle2} label="Materias aprobadas" value={aprobadas} tone="emerald" />
         <StatCard icon={AlertTriangle} label="Materias en riesgo" value={enRiesgo} tone="orange" />
+        <StatCard icon={XCircle} label="Materias reprobadas" value={reprobadas} tone="red" />
         <StatCard
           icon={GraduationCap}
           label="Promedio general"
@@ -335,9 +233,9 @@ function Calificaciones({
           ))}
         </div>
       ) : materias.length > 0 ? (
-        <div className="space-y-4">
+        <div className="grid grid-cols-1 gap-3">
           {materias.map((materia, index) => (
-            <GradeCard key={`${materia.clave || materia.nombre || 'materia'}-${index}`} materia={materia} />
+            <GradeCard key={`${materia.codigo || materia.clave || materia.nombre || 'materia'}-${index}`} materia={materia} />
           ))}
         </div>
       ) : (
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** Comando obligatorio de CIA + npm run build
**Comando de verificación:** node -e "require('dotenv').config(); const c=require('./electron/handlers/cia'); c.clearCIACache(); c.getCalificacionesWithCache().then(r => { r.materias?.forEach(m => console.log(m.nombre, '|', m.codigo, '|', m.profesor, '|', JSON.stringify(m.calificaciones), '|', m.promedio)); console.log('Total:', r.materias?.length); })"
**Output de verificación:**
```
◇ injected env (5) from .env // tip: ⌁ auth for agents [www.vestauth.com]
Precálculo | 1165M |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":6,"sobre":10}] | 6
Ingles Universitario A1 | 1043D |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":7,"sobre":10}] | 7
Sist Operativos y Arq de Comp | 1123C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
Matematicas Discretas | 1178M |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":7,"sobre":10}] | 7
Programacion II c/Lab | 1124C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
Tecnologia y Empresa | 1115C |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":9,"sobre":10}] | 9
Tutoria 2 (INSOF) | 1132T |  | [{"nombre":"Parcial 1","etiqueta":"P1","parcial":"P1","calificacion":null,"sobre":10},{"nombre":"Parcial 2","etiqueta":"P2","parcial":"P2","calificacion":null,"sobre":10},{"nombre":"Parcial 3","etiqueta":"P3","parcial":"P3","calificacion":null,"sobre":10},{"nombre":"Final","etiqueta":"Final","parcial":"Final","calificacion":null,"sobre":10}] | null
Total: 7

> scraper-app@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1766 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                      0.41 kB │ gzip:  0.27 kB
dist/assets/logo-itson-GKrD7IS7.png  37.09 kB
dist/assets/index-ByOxmHud.css       28.90 kB │ gzip:  6.24 kB
dist/assets/index-C9dellb7.js        278.47 kB │ gzip: 77.13 kB
✓ built in 9.76s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
