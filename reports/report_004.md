# Report 004
**Fecha:** 2026-05-15 00:57  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `.gitignore` — archivo actualizado en esta tarea
- `electron/handlers/scraper.js` — archivo actualizado en esta tarea
- `electron/main.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `package-lock.json` — archivo actualizado en esta tarea
- `package.json` — archivo actualizado en esta tarea
- `postcss.config.js` — archivo creado como parte de la base inicial
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/ActivityCard.jsx` — archivo creado como parte de la base inicial
- `src/components/ResultsTable.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/index.css` — archivo creado como parte de la base inicial
- `src/main.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo creado como parte de la base inicial
- `src/pages/Ajustes.jsx` — archivo creado como parte de la base inicial
- `src/pages/Automation.jsx` — archivo eliminado en esta tarea
- `src/pages/Files.jsx` — archivo actualizado en esta tarea
- `src/pages/Scraper.jsx` — archivo eliminado en esta tarea

## Resumen
Se genero la estructura base de ScraperApp con el shell de Electron, la interfaz inicial en React, los placeholders de handlers y la configuracion minima para continuar el desarrollo del proyecto.

## Cambios de codigo
### `.gitignore`
```diff
diff --git a/.gitignore b/.gitignore
index b947077..deed335 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,2 +1,3 @@
 node_modules/
 dist/
+.env
```

### `electron/handlers/scraper.js`
```diff
diff --git a/electron/handlers/scraper.js b/electron/handlers/scraper.js
index 9401365..d78f043 100644
--- a/electron/handlers/scraper.js
+++ b/electron/handlers/scraper.js
@@ -1,21 +1,261 @@
 const { ipcMain } = require('electron');
+const { chromium } = require('playwright');
 
-function registerScraperHandlers() {
-  ipcMain.handle('scraper:run', async (_event, payload = {}) => ({
-    status: 'ready',
-    scope: 'scraper',
-    message: 'Base handler for scraper tasks initialized.',
-    payload,
-  }));
+const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
+const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
+
+function normalizeWhitespace(value) {
+  return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
+}
+
+function parseDueDate(value) {
+  if (!value) {
+    return null;
+  }
+
+  const parsed = Date.parse(value.replace(/\s+/g, ' ').trim());
+  return Number.isNaN(parsed) ? null : new Date(parsed);
+}
+
+function classifyAssignment({ dueDate, submission, grade }) {
+  const lowerSubmission = (submission || '').toLowerCase();
+  const normalizedGrade = (grade || '').trim();
+
+  if (
+    lowerSubmission.includes('submitted') ||
+    lowerSubmission.includes('graded') ||
+    (normalizedGrade && normalizedGrade !== '-' && normalizedGrade.toLowerCase() !== 'not graded')
+  ) {
+    return 'cerrada';
+  }
+
+  const parsedDueDate = parseDueDate(dueDate);
+
+  if (parsedDueDate && parsedDueDate.getTime() < Date.now()) {
+    return 'retrasada';
+  }
+
+  return 'pendiente';
+}
+
+async function loginToIVirtual(page, username, password) {
+  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
+  await page.fill('#username', username);
+  await page.fill('#password', password);
+  await Promise.all([
+    page.waitForLoadState('networkidle').catch(() => {}),
+    page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
+  ]);
+
+  if (page.url().includes('/login/index.php')) {
+    const errorText = await page.locator('#loginerrormessage').textContent().catch(() => '');
+    throw new Error(errorText?.trim() || 'No fue posible iniciar sesión en iVirtual.');
+  }
+}
+
+async function collectCourses(page) {
+  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
+
+  const courses = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
+    const seen = new Set();
+    const items = [];
+
+    links.forEach((link) => {
+      const name = (link.textContent || '').trim().replace(/\s+/g, ' ');
+      const href = link.href;
+
+      if (!name || !href) {
+        return;
+      }
+
+      const match = href.match(/id=(\d+)/);
+
+      if (!match) {
+        return;
+      }
+
+      const id = match[1];
+
+      if (seen.has(id)) {
+        return;
+      }
+
+      seen.add(id);
+      items.push({ id, name, url: href });
+    });
+
+    return items;
+  });
+
+  return courses;
+}
+
+async function collectAssignmentsFromCourse(page, course) {
+  const indexUrl = `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=${course.id}`;
+  await page.goto(indexUrl, { waitUntil: 'networkidle' });
+
+  return page.evaluate((courseName) => {
+    const tableRows = Array.from(document.querySelectorAll('table.generaltable tbody tr'));
+    let currentWeek = '';
 
-  ipcMain.handle('automation:run', async (_event, payload = {}) => ({
-    status: 'ready',
-    scope: 'automation',
-    message: 'Base handler for automation tasks initialized.',
-    payload,
-  }));
+    return tableRows
+      .map((row) => {
+        const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
+          (cell.textContent || '').trim().replace(/\s+/g, ' '),
+        );
+        const link = row.querySelector('a[href*="/mod/assign/view.php?id="]');
+
+        if (!link) {
+          return null;
+        }
+
+        let week = currentWeek;
+        let title = '';
+        let dueDate = '';
+        let submission = '';
+        let grade = '';
+
+        if (cells.length >= 5) {
+          [week, title, dueDate, submission, grade] = cells;
+          currentWeek = week || currentWeek;
+        } else if (cells.length === 4) {
+          [title, dueDate, submission, grade] = cells;
+        }
+
+        return {
+          courseName,
+          dueDate,
+          grade,
+          title,
+          submission,
+          url: link.href,
+          week,
+        };
+      })
+      .filter(Boolean);
+  }, course.name);
+}
+
+async function collectAssignmentDetails(page, assignment) {
+  await page.goto(assignment.url, { waitUntil: 'networkidle' });
+
+  const details = await page.evaluate((courseName) => {
+    const main = document.querySelector('#region-main') || document.body;
+    const intro = document.querySelector('#intro');
+    const introText = (intro?.textContent || '').replace(/\r/g, '');
+    const attachments = Array.from(main.querySelectorAll('a[href*="pluginfile.php"]'))
+      .map((anchor) => ({
+        name: (anchor.textContent || '').trim(),
+        url: anchor.href,
+      }))
+      .filter((file) => file.name && file.url && file.url.includes('/introattachment/'));
+
+    const uniqueAttachments = attachments.filter(
+      (file, index, array) => index === array.findIndex((entry) => entry.url === file.url),
+    );
+
+    return {
+      archivos: uniqueAttachments,
+      introText,
+      materia: courseName,
+    };
+  }, assignment.courseName);
+  let instructions = normalizeWhitespace(details.introText);
+
+  if (details.archivos.length > 0 && instructions) {
+    details.archivos.forEach((file) => {
+      instructions = instructions.replace(file.name, '').trim();
+    });
+    instructions = normalizeWhitespace(instructions);
+  }
+
+  instructions = normalizeWhitespace(
+    instructions.replace(
+      /\b\d{1,2} [A-Za-z]+ \d{4}, \d{1,2}:\d{2} (?:AM|PM)\b/g,
+      '',
+    ),
+  );
+
+  return {
+    archivos: details.archivos,
+    instrucciones: instructions,
+      materia: details.materia,
+  };
+}
+
+async function scrapeIVirtualActivities() {
+  const username = process.env.IVIRTUAL_USER;
+  const password = process.env.IVIRTUAL_PASS;
+
+  if (!username || !password) {
+    return { error: 'Faltan IVIRTUAL_USER o IVIRTUAL_PASS en el archivo .env local.' };
+  }
+
+  let browser;
+
+  try {
+    browser = await chromium.launch({ headless: true });
+    const context = await browser.newContext();
+    const page = await context.newPage();
+    page.setDefaultTimeout(45000);
+
+    await loginToIVirtual(page, username, password);
+
+    const courses = await collectCourses(page);
+
+    if (courses.length === 0) {
+      return { error: 'No se encontraron cursos visibles en el dashboard de iVirtual.' };
+    }
+
+    const assignments = [];
+
+    for (const course of courses) {
+      const courseAssignments = await collectAssignmentsFromCourse(page, course);
+      assignments.push(...courseAssignments);
+    }
+
+    const detailPage = await context.newPage();
+    detailPage.setDefaultTimeout(45000);
+    const activities = [];
+
+    for (let index = 0; index < assignments.length; index += 1) {
+      const assignment = assignments[index];
+      const details = await collectAssignmentDetails(detailPage, assignment);
+
+      activities.push({
+        id: `${index + 1}-${assignment.url.split('id=').pop()}`,
+        archivos: details.archivos,
+        estado: classifyAssignment(assignment),
+        fechaLimite: assignment.dueDate || 'Sin fecha visible',
+        instrucciones: details.instrucciones,
+        materia: details.materia,
+        nombre: assignment.title,
+        rawGrade: assignment.grade,
+        rawSubmission: assignment.submission,
+        url: assignment.url,
+      });
+    }
+
+    return { activities };
+  } catch (error) {
+    return {
+      error:
+        error && error.message
+          ? `Falló la extracción de iVirtual: ${error.message}`
+          : 'Falló la extracción de iVirtual por un error no identificado.',
+    };
+  } finally {
+    if (browser) {
+      await browser.close();
+    }
+  }
+}
+
+function registerScraperHandlers() {
+  ipcMain.handle('scraper:run', async () => scrapeIVirtualActivities());
 }
 
 module.exports = {
   registerScraperHandlers,
+  scrapeIVirtualActivities,
 };
```

### `electron/main.js`
```diff
diff --git a/electron/main.js b/electron/main.js
index 6c680c5..7cc6443 100644
--- a/electron/main.js
+++ b/electron/main.js
@@ -1,3 +1,5 @@
+require('dotenv').config({ quiet: true });
+
 const { app, BrowserWindow } = require('electron');
 const path = require('path');
 const { registerScraperHandlers } = require('./handlers/scraper');
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index d1c88a5..8aad27a 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -2,7 +2,6 @@ const { contextBridge, ipcRenderer } = require('electron');
 
 contextBridge.exposeInMainWorld('scraperApp', {
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
-  runAutomation: (payload) => ipcRenderer.invoke('automation:run', payload),
   inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
   parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
 });
```

### `package-lock.json`
```diff
diff --git a/package-lock.json b/package-lock.json
index ce92bcd..72a344e 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -9,7 +9,9 @@
       "version": "0.1.0",
       "dependencies": {
         "csv-parse": "^5.5.6",
+        "dotenv": "^17.4.2",
         "electron": "^31.0.2",
+        "lucide-react": "^1.16.0",
         "pdf-parse": "^1.1.1",
         "react": "^18.3.1",
         "react-dom": "^18.3.1",
@@ -17,8 +19,10 @@
       },
       "devDependencies": {
         "@vitejs/plugin-react": "^4.3.1",
+        "autoprefixer": "^10.5.0",
         "concurrently": "^9.2.1",
-        "playwright": "^1.46.0",
+        "playwright": "^1.60.0",
+        "postcss": "^8.5.14",
         "tailwindcss": "^3.4.10",
         "vite": "^5.4.2"
       }
@@ -1390,6 +1394,43 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/autoprefixer": {
+      "version": "10.5.0",
+      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.5.0.tgz",
+      "integrity": "sha512-FMhOoZV4+qR6aTUALKX2rEqGG+oyATvwBt9IIzVR5rMa2HRWPkxf+P+PAJLD1I/H5/II+HuZcBJYEFBpq39ong==",
+      "dev": true,
+      "funding": [
+        {
+          "type": "opencollective",
+          "url": "https://opencollective.com/postcss/"
+        },
+        {
+          "type": "tidelift",
+          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
+        },
+        {
+          "type": "github",
+          "url": "https://github.com/sponsors/ai"
+        }
+      ],
+      "license": "MIT",
+      "dependencies": {
+        "browserslist": "^4.28.2",
+        "caniuse-lite": "^1.0.30001787",
+        "fraction.js": "^5.3.4",
+        "picocolors": "^1.1.1",
+        "postcss-value-parser": "^4.2.0"
+      },
+      "bin": {
+        "autoprefixer": "bin/autoprefixer"
+      },
+      "engines": {
+        "node": "^10 || ^12 || >=14"
+      },
+      "peerDependencies": {
+        "postcss": "^8.1.0"
+      }
+    },
     "node_modules/baseline-browser-mapping": {
       "version": "2.10.29",
       "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.10.29.tgz",
@@ -1858,6 +1899,18 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/dotenv": {
+      "version": "17.4.2",
+      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.4.2.tgz",
+      "integrity": "sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==",
+      "license": "BSD-2-Clause",
+      "engines": {
+        "node": ">=12"
+      },
+      "funding": {
+        "url": "https://dotenvx.com"
+      }
+    },
     "node_modules/electron": {
       "version": "31.7.7",
       "resolved": "https://registry.npmjs.org/electron/-/electron-31.7.7.tgz",
@@ -2088,6 +2141,20 @@
         "node": ">=0.8"
       }
     },
+    "node_modules/fraction.js": {
+      "version": "5.3.4",
+      "resolved": "https://registry.npmjs.org/fraction.js/-/fraction.js-5.3.4.tgz",
+      "integrity": "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": "*"
+      },
+      "funding": {
+        "type": "github",
+        "url": "https://github.com/sponsors/rawify"
+      }
+    },
     "node_modules/fs-extra": {
       "version": "8.1.0",
       "resolved": "https://registry.npmjs.org/fs-extra/-/fs-extra-8.1.0.tgz",
@@ -2518,6 +2585,15 @@
         "yallist": "^3.0.2"
       }
     },
+    "node_modules/lucide-react": {
+      "version": "1.16.0",
+      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-1.16.0.tgz",
+      "integrity": "sha512-dYwyPzb4MEKpGUmNYk3WKWPnMrHs3FKM+q94kAnJrcDIqqn1hq2xY8scaS2ovsOCM5D51ey2gaRG3PBb1vgoYQ==",
+      "license": "ISC",
+      "peerDependencies": {
+        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"
+      }
+    },
     "node_modules/matcher": {
       "version": "3.0.0",
       "resolved": "https://registry.npmjs.org/matcher/-/matcher-3.0.0.tgz",
```

### `package.json`
```diff
diff --git a/package.json b/package.json
index 35c51c0..52c65c8 100644
--- a/package.json
+++ b/package.json
@@ -14,7 +14,9 @@
   },
   "dependencies": {
     "csv-parse": "^5.5.6",
+    "dotenv": "^17.4.2",
     "electron": "^31.0.2",
+    "lucide-react": "^1.16.0",
     "pdf-parse": "^1.1.1",
     "react": "^18.3.1",
     "react-dom": "^18.3.1",
@@ -22,8 +24,10 @@
   },
   "devDependencies": {
     "@vitejs/plugin-react": "^4.3.1",
+    "autoprefixer": "^10.5.0",
     "concurrently": "^9.2.1",
-    "playwright": "^1.46.0",
+    "playwright": "^1.60.0",
+    "postcss": "^8.5.14",
     "tailwindcss": "^3.4.10",
     "vite": "^5.4.2"
   }
```

### `postcss.config.js`
```diff
diff --git a/postcss.config.js b/postcss.config.js
new file mode 100644
index 0000000..12a703d
--- /dev/null
+++ b/postcss.config.js
@@ -0,0 +1,6 @@
+module.exports = {
+  plugins: {
+    tailwindcss: {},
+    autoprefixer: {},
+  },
+};
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index e0dc4f0..f4504f2 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,40 +1,77 @@
-import { useState } from 'react';
+import { useEffect, useState } from 'react';
 import Sidebar from './components/Sidebar';
 import TaskPanel from './components/TaskPanel';
-import Scraper from './pages/Scraper';
-import Automation from './pages/Automation';
+import Actividades from './pages/Actividades';
 import Files from './pages/Files';
+import Ajustes from './pages/Ajustes';
 
 const pageRegistry = {
-  scraper: {
-    title: 'Scraper',
-    description: 'Orquesta scraping, clicks y flujos automatizados con Playwright.',
-    component: Scraper,
-  },
-  automation: {
-    title: 'Automation',
-    description: 'Centraliza ejecuciones guiadas, colas y tareas repetibles.',
-    component: Automation,
+  activities: {
+    title: 'Actividades',
+    description: 'Consulta y clasifica las actividades de iVirtual ITSON por estado.',
+    component: Actividades,
   },
   files: {
-    title: 'Files',
-    description: 'Procesa CSV, PDF y XLSX desde el entorno local de la app.',
+    title: 'Archivos',
+    description: 'Centraliza los adjuntos encontrados en las actividades de iVirtual.',
     component: Files,
   },
+  settings: {
+    title: 'Ajustes',
+    description: 'Revisa el estado de la integración y la configuración local requerida.',
+    component: Ajustes,
+  },
 };
 
 function App() {
-  const [activePage, setActivePage] = useState('scraper');
+  const [activePage, setActivePage] = useState('activities');
+  const [activities, setActivities] = useState([]);
+  const [loading, setLoading] = useState(false);
+  const [error, setError] = useState('');
+  const [lastSyncAt, setLastSyncAt] = useState('');
 
   const pageConfig = pageRegistry[activePage];
   const ActivePage = pageConfig.component;
 
+  const handleRefreshActivities = async () => {
+    setLoading(true);
+    setError('');
+
+    try {
+      const response = await window.scraperApp.runScraper();
+
+      if (response?.error) {
+        setError(response.error);
+        setActivities([]);
+        return;
+      }
+
+      setActivities(Array.isArray(response?.activities) ? response.activities : []);
+      setLastSyncAt(new Date().toISOString());
+    } catch (_error) {
+      setError('No fue posible consultar iVirtual. Verifica la conexión y las credenciales locales.');
+      setActivities([]);
+    } finally {
+      setLoading(false);
+    }
+  };
+
+  useEffect(() => {
+    handleRefreshActivities();
+  }, []);
+
   return (
     <div className="min-h-screen bg-slate-950 text-slate-100">
-      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-6 py-8">
+      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
         <Sidebar activePage={activePage} onNavigate={setActivePage} />
         <TaskPanel title={pageConfig.title} description={pageConfig.description}>
-          <ActivePage />
+          <ActivePage
+            activities={activities}
+            error={error}
+            lastSyncAt={lastSyncAt}
+            loading={loading}
+            onRefresh={handleRefreshActivities}
+          />
         </TaskPanel>
       </div>
     </div>
```

### `src/components/ActivityCard.jsx`
```diff
diff --git a/src/components/ActivityCard.jsx b/src/components/ActivityCard.jsx
new file mode 100644
index 0000000..971a152
--- /dev/null
+++ b/src/components/ActivityCard.jsx
@@ -0,0 +1,128 @@
+import { Download, FileText, FileType, Image, Presentation, Table } from 'lucide-react';
+import { useMemo, useState } from 'react';
+
+function getFileIcon(fileName = '') {
+  const lowerName = fileName.toLowerCase();
+
+  if (lowerName.endsWith('.pdf')) {
+    return FileText;
+  }
+
+  if (/\.(doc|docx)$/.test(lowerName)) {
+    return FileType;
+  }
+
+  if (/\.(xls|xlsx|csv)$/.test(lowerName)) {
+    return Table;
+  }
+
+  if (/\.(ppt|pptx)$/.test(lowerName)) {
+    return Presentation;
+  }
+
+  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
+    return Image;
+  }
+
+  return FileText;
+}
+
+function getBadgeClass(status) {
+  if (status === 'retrasada') {
+    return 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30';
+  }
+
+  if (status === 'cerrada') {
+    return 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-600';
+  }
+
+  return 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30';
+}
+
+function ActivityCard({
+  nombre,
+  materia,
+  fechaLimite,
+  estado,
+  instrucciones,
+  archivos = [],
+}) {
+  const startsCollapsed = useMemo(
+    () => (instrucciones || '').length > 200 || archivos.length > 3,
+    [archivos.length, instrucciones],
+  );
+  const [expanded, setExpanded] = useState(!startsCollapsed);
+
+  const previewText = (instrucciones || '').trim();
+  const shownInstructions =
+    !previewText || expanded || previewText.length <= 200
+      ? previewText
+      : `${previewText.slice(0, 200).trim()}...`;
+
+  return (
+    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
+        <div className="space-y-2">
+          <h3 className="text-lg font-semibold text-white">{nombre}</h3>
+          <p className="text-sm text-slate-400">{materia}</p>
+          <p className="text-sm text-slate-500">Fecha límite: {fechaLimite || 'Sin fecha visible'}</p>
+        </div>
+
+        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getBadgeClass(estado)}`}>
+          {estado}
+        </span>
+      </div>
+
+      {shownInstructions ? (
+        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
+          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Instrucciones</p>
+          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{shownInstructions}</p>
+        </div>
+      ) : null}
+
+      {archivos.length > 0 ? (
+        <div className="mt-5 space-y-3">
+          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Archivos adjuntos</p>
+          <div className="space-y-2">
+            {(expanded ? archivos : archivos.slice(0, 3)).map((archivo) => {
+              const FileIcon = getFileIcon(archivo.name);
+
+              return (
+                <div
+                  key={`${archivo.url}-${archivo.name}`}
+                  className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
+                >
+                  <div className="flex items-center gap-3">
+                    <FileIcon className="h-4 w-4 text-cyan-400" />
+                    <span className="text-sm text-slate-200">{archivo.name}</span>
+                  </div>
+                  <a
+                    href={archivo.url}
+                    target="_blank"
+                    rel="noreferrer"
+                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
+                  >
+                    <Download className="h-4 w-4" />
+                    Descargar
+                  </a>
+                </div>
+              );
+            })}
+          </div>
+        </div>
+      ) : null}
+
+      {(startsCollapsed || (previewText && previewText.length > 200) || archivos.length > 3) ? (
+        <button
+          type="button"
+          onClick={() => setExpanded((value) => !value)}
+          className="mt-5 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
+        >
+          {expanded ? 'Ver menos' : 'Ver más'}
+        </button>
+      ) : null}
+    </article>
+  );
+}
+
+export default ActivityCard;
```

### `src/components/ResultsTable.jsx`
```diff
diff --git a/src/components/ResultsTable.jsx b/src/components/ResultsTable.jsx
index 93fe63a..7c62070 100644
--- a/src/components/ResultsTable.jsx
+++ b/src/components/ResultsTable.jsx
@@ -1,10 +1,52 @@
-const defaultRows = [
-  { source: 'playwright-job-001', status: 'Ready', detail: 'Esperando instrucciones de scraping.' },
-  { source: 'automation-batch-001', status: 'Queued', detail: 'Base de automatización creada.' },
-  { source: 'local-file-001', status: 'Idle', detail: 'Aún no se han cargado archivos.' },
-];
+import { Inbox } from 'lucide-react';
+
+function SkeletonRows() {
+  return (
+    <tbody className="animate-pulse divide-y divide-slate-800 bg-slate-950/60">
+      {Array.from({ length: 3 }).map((_, index) => (
+        <tr key={index}>
+          <td className="px-4 py-4">
+            <div className="h-4 w-40 rounded bg-slate-800" />
+          </td>
+          <td className="px-4 py-4">
+            <div className="h-4 w-20 rounded bg-slate-800" />
+          </td>
+          <td className="px-4 py-4">
+            <div className="h-4 w-full rounded bg-slate-800" />
+          </td>
+        </tr>
+      ))}
+    </tbody>
+  );
+}
+
+function ResultsTable({ rows = [], loading = false }) {
+  if (loading) {
+    return (
+      <div className="overflow-hidden rounded-2xl border border-slate-800">
+        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
+          <thead className="bg-slate-900 text-slate-400">
+            <tr>
+              <th className="px-4 py-3 font-medium">Origen</th>
+              <th className="px-4 py-3 font-medium">Estado</th>
+              <th className="px-4 py-3 font-medium">Detalle</th>
+            </tr>
+          </thead>
+          <SkeletonRows />
+        </table>
+      </div>
+    );
+  }
+
+  if (rows.length === 0) {
+    return (
+      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center text-slate-400">
+        <Inbox className="h-8 w-8 text-slate-600" />
+        <p className="text-sm">Sin resultados aún.</p>
+      </div>
+    );
+  }
 
-function ResultsTable({ rows = defaultRows }) {
   return (
     <div className="overflow-hidden rounded-2xl border border-slate-800">
       <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 3cf5919..3ced6e3 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,7 +1,9 @@
+import { Download, FolderCog, ListChecks } from 'lucide-react';
+
 const navigationItems = [
-  { id: 'scraper', label: 'Scraper' },
-  { id: 'automation', label: 'Automation' },
-  { id: 'files', label: 'Files' },
+  { id: 'activities', label: 'Actividades', icon: ListChecks },
+  { id: 'files', label: 'Archivos', icon: Download },
+  { id: 'settings', label: 'Ajustes', icon: FolderCog },
 ];
 
 function Sidebar({ activePage, onNavigate }) {
@@ -9,15 +11,16 @@ function Sidebar({ activePage, onNavigate }) {
     <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
       <div className="mb-8">
         <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">ScraperApp</p>
-        <h1 className="mt-3 text-2xl font-semibold text-white">Desktop Console</h1>
+        <h1 className="mt-3 text-2xl font-semibold text-white">iVirtual ITSON</h1>
         <p className="mt-2 text-sm text-slate-400">
-          Base operativa para scraping, automatización y lectura de archivos locales.
+          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
         </p>
       </div>
 
       <nav className="space-y-2">
         {navigationItems.map((item) => {
           const isActive = item.id === activePage;
+          const Icon = item.icon;
 
           return (
             <button
@@ -30,7 +33,10 @@ function Sidebar({ activePage, onNavigate }) {
                   : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
               }`}
             >
-              <span>{item.label}</span>
+              <span className="flex items-center gap-3">
+                <Icon className="h-4 w-4" />
+                {item.label}
+              </span>
               <span className="text-xs uppercase tracking-[0.25em]">
                 {isActive ? 'Live' : 'Idle'}
               </span>
```

### `src/index.css`
```diff
diff --git a/src/index.css b/src/index.css
new file mode 100644
index 0000000..411fddf
--- /dev/null
+++ b/src/index.css
@@ -0,0 +1,27 @@
+@tailwind base;
+@tailwind components;
+@tailwind utilities;
+
+:root {
+  color-scheme: dark;
+}
+
+body {
+  margin: 0;
+  font-family: Inter, 'Segoe UI', sans-serif;
+  background:
+    radial-gradient(circle at top left, rgba(6, 182, 212, 0.12), transparent 32%),
+    radial-gradient(circle at top right, rgba(14, 116, 144, 0.12), transparent 24%),
+    #020617;
+}
+
+* {
+  box-sizing: border-box;
+}
+
+button,
+input,
+select,
+a {
+  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
+}
```

### `src/main.jsx`
```diff
diff --git a/src/main.jsx b/src/main.jsx
index 1b79458..303ff4d 100644
--- a/src/main.jsx
+++ b/src/main.jsx
@@ -1,6 +1,7 @@
 import React from 'react';
 import ReactDOM from 'react-dom/client';
 import App from './App';
+import './index.css';
 
 ReactDOM.createRoot(document.getElementById('root')).render(
   <React.StrictMode>
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
new file mode 100644
index 0000000..0c789c5
--- /dev/null
+++ b/src/pages/Actividades.jsx
@@ -0,0 +1,159 @@
+import {
+  AlertCircle,
+  Globe,
+  Loader2,
+  Play,
+  Search,
+  Zap,
+} from 'lucide-react';
+import { useState } from 'react';
+import ActivityCard from '../components/ActivityCard';
+
+const tabs = [
+  { id: 'pendiente', label: 'Pendientes' },
+  { id: 'retrasada', label: 'Retrasadas' },
+  { id: 'cerrada', label: 'Cerradas' },
+];
+
+function formatLastSync(lastSyncAt) {
+  if (!lastSyncAt) {
+    return 'Aún no se ha realizado una consulta.';
+  }
+
+  return new Intl.DateTimeFormat('es-MX', {
+    dateStyle: 'medium',
+    timeStyle: 'short',
+  }).format(new Date(lastSyncAt));
+}
+
+function StatCard({ icon: Icon, label, value }) {
+  return (
+    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+      <div className="flex items-center gap-3">
+        <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-400">
+          <Icon className="h-5 w-5" />
+        </span>
+        <div>
+          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
+          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
+        </div>
+      </div>
+    </article>
+  );
+}
+
+function Actividades({ activities = [], error, lastSyncAt, loading, onRefresh }) {
+  const [activeTab, setActiveTab] = useState('pendiente');
+  const counts = {
+    pendiente: activities.filter((item) => item.estado === 'pendiente').length,
+    retrasada: activities.filter((item) => item.estado === 'retrasada').length,
+    cerrada: activities.filter((item) => item.estado === 'cerrada').length,
+  };
+  const filteredActivities = activities.filter((item) => item.estado === activeTab);
+
+  return (
+    <div className="space-y-6">
+      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
+        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
+            <div className="space-y-4">
+              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
+                <Globe className="h-3.5 w-3.5" />
+                Portal iVirtual ITSON
+              </div>
+              <div>
+                <h3 className="text-2xl font-semibold text-white">Extracción real de actividades</h3>
+                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
+                  Inicia una sesión contra iVirtual, recorre los cursos inscritos y clasifica actividades
+                  en pendientes, retrasadas y cerradas con sus fechas límite, instrucciones y adjuntos.
+                </p>
+              </div>
+            </div>
+
+            <button
+              type="button"
+              onClick={onRefresh}
+              disabled={loading}
+              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/50"
+            >
+              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
+              {loading ? 'Consultando iVirtual...' : 'Actualizar actividades'}
+            </button>
+          </div>
+
+          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-slate-500">
+            Última sincronización: {formatLastSync(lastSyncAt)}
+          </p>
+        </article>
+
+        <div className="grid gap-4">
+          <StatCard icon={Search} label="Pendientes" value={counts.pendiente} />
+          <StatCard icon={AlertCircle} label="Retrasadas" value={counts.retrasada} />
+          <StatCard icon={Zap} label="Cerradas" value={counts.cerrada} />
+        </div>
+      </section>
+
+      {error ? (
+        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+          <p>{error}</p>
+        </div>
+      ) : null}
+
+      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
+        <div className="flex flex-wrap gap-2">
+          {tabs.map((tab) => {
+            const isActive = tab.id === activeTab;
+
+            return (
+              <button
+                key={tab.id}
+                type="button"
+                onClick={() => setActiveTab(tab.id)}
+                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
+                  isActive
+                    ? 'bg-cyan-500 text-slate-950'
+                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
+                }`}
+              >
+                {tab.label}
+              </button>
+            );
+          })}
+        </div>
+      </section>
+
+      {loading ? (
+        <div className="space-y-3">
+          {Array.from({ length: 3 }).map((_, index) => (
+            <div
+              key={index}
+              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
+            >
+              <div className="h-5 w-64 rounded bg-slate-800" />
+              <div className="mt-4 h-4 w-40 rounded bg-slate-800" />
+              <div className="mt-6 h-20 rounded bg-slate-900" />
+            </div>
+          ))}
+        </div>
+      ) : filteredActivities.length > 0 ? (
+        <div className="space-y-4">
+          {filteredActivities.map((activity) => (
+            <ActivityCard key={activity.id} {...activity} />
+          ))}
+        </div>
+      ) : (
+        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+          <Search className="h-8 w-8 text-slate-600" />
+          <p className="mt-4 text-sm text-slate-300">
+            {activities.length === 0
+              ? 'Aún no se ha ejecutado la extracción de actividades.'
+              : 'No hay actividades en esta categoría.'}
+          </p>
+        </div>
+      )}
+    </div>
+  );
+}
+
+export default Actividades;
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
new file mode 100644
index 0000000..4012c6c
--- /dev/null
+++ b/src/pages/Ajustes.jsx
@@ -0,0 +1,36 @@
+import { FolderCog, ShieldCheck } from 'lucide-react';
+
+function Ajustes({ lastSyncAt }) {
+  return (
+    <div className="grid gap-4 lg:grid-cols-2">
+      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+        <div className="flex items-start gap-3">
+          <FolderCog className="mt-1 h-5 w-5 text-cyan-400" />
+          <div>
+            <h3 className="text-xl font-semibold text-white">Configuración local</h3>
+            <p className="mt-2 text-sm leading-6 text-slate-400">
+              ScraperApp usa variables locales en <code>.env</code> para autenticarse contra iVirtual.
+              El archivo está ignorado por Git y se carga desde el proceso principal de Electron.
+            </p>
+          </div>
+        </div>
+      </section>
+
+      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+        <div className="flex items-start gap-3">
+          <ShieldCheck className="mt-1 h-5 w-5 text-cyan-400" />
+          <div>
+            <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
+            <ul className="mt-3 space-y-2 text-sm text-slate-300">
+              <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
+              <li>Extracción por curso usando el índice de tareas de Moodle.</li>
+              <li>Última sincronización registrada: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</li>
+            </ul>
+          </div>
+        </div>
+      </section>
+    </div>
+  );
+}
+
+export default Ajustes;
```

### `src/pages/Automation.jsx`
```diff
diff --git a/src/pages/Automation.jsx b/src/pages/Automation.jsx
deleted file mode 100644
index 04c86dc..0000000
--- a/src/pages/Automation.jsx
+++ /dev/null
@@ -1,24 +0,0 @@
-function Automation() {
-  return (
-    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Queue</p>
-        <h3 className="mt-3 text-xl font-medium text-white">Automation Control Surface</h3>
-        <p className="mt-3 text-sm text-slate-400">
-          Este espacio queda preparado para ejecutar batches, retries y tareas guiadas por prompts.
-        </p>
-      </section>
-
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
-        <ul className="mt-3 space-y-3 text-sm text-slate-300">
-          <li>IPC listo para `automation:run`.</li>
-          <li>UI base separada del flujo de scraping.</li>
-          <li>Espacio reservado para logs y reintentos.</li>
-        </ul>
-      </section>
-    </div>
-  );
-}
-
-export default Automation;
```

### `src/pages/Files.jsx`
```diff
diff --git a/src/pages/Files.jsx b/src/pages/Files.jsx
index a1b1a4f..aa51660 100644
--- a/src/pages/Files.jsx
+++ b/src/pages/Files.jsx
@@ -1,20 +1,60 @@
-function Files() {
+import { Download, FileText } from 'lucide-react';
+import ResultsTable from '../components/ResultsTable';
+
+function Files({ activities = [], loading }) {
+  const attachments = activities.flatMap((activity) =>
+    (activity.archivos || []).map((file) => ({
+      source: activity.materia,
+      status: activity.estado,
+      detail: `${activity.nombre} -> ${file.name}`,
+      file,
+    })),
+  );
+
   return (
-    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
-      {[
-        ['CSV', 'Preparado para pipelines con csv-parse.'],
-        ['PDF', 'Preparado para lectura local con pdf-parse.'],
-        ['XLSX', 'Preparado para importaciones y mapeo con xlsx.'],
-      ].map(([label, detail]) => (
-        <article
-          key={label}
-          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
-        >
-          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
-          <h3 className="mt-3 text-xl font-medium text-white">{label} Handler</h3>
-          <p className="mt-3 text-sm text-slate-400">{detail}</p>
-        </article>
-      ))}
+    <div className="space-y-6">
+      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+        <div className="flex items-start gap-3">
+          <FileText className="mt-1 h-5 w-5 text-cyan-400" />
+          <div>
+            <h3 className="text-xl font-semibold text-white">Descargas detectadas</h3>
+            <p className="mt-2 text-sm text-slate-400">
+              Este panel agrupa los archivos adjuntos encontrados dentro de las actividades
+              extraídas desde iVirtual.
+            </p>
+          </div>
+        </div>
+      </section>
+
+      {attachments.length > 0 ? (
+        <div className="space-y-3">
+          {attachments.map((entry) => (
+            <div
+              key={`${entry.file.url}-${entry.file.name}`}
+              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 md:flex-row md:items-center md:justify-between"
+            >
+              <div>
+                <p className="text-sm font-medium text-white">{entry.file.name}</p>
+                <p className="mt-1 text-sm text-slate-400">{entry.detail}</p>
+                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
+                  {entry.source} · {entry.status}
+                </p>
+              </div>
+              <a
+                href={entry.file.url}
+                target="_blank"
+                rel="noreferrer"
+                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
+              >
+                <Download className="h-4 w-4" />
+                Descargar
+              </a>
+            </div>
+          ))}
+        </div>
+      ) : (
+        <ResultsTable rows={[]} loading={loading} />
+      )}
     </div>
   );
 }
```

### `src/pages/Scraper.jsx`
```diff
diff --git a/src/pages/Scraper.jsx b/src/pages/Scraper.jsx
deleted file mode 100644
index b190d0e..0000000
--- a/src/pages/Scraper.jsx
+++ /dev/null
@@ -1,35 +0,0 @@
-import ResultsTable from '../components/ResultsTable';
-
-function Scraper() {
-  return (
-    <div className="space-y-6">
-      <section className="grid gap-4 md:grid-cols-3">
-        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Runner</p>
-          <h3 className="mt-3 text-lg font-medium text-white">Playwright Bridge</h3>
-          <p className="mt-2 text-sm text-slate-400">
-            Punto de entrada para sesiones de scraping y automatización de formularios.
-          </p>
-        </article>
-        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Scope</p>
-          <h3 className="mt-3 text-lg font-medium text-white">Selectors + Click Flow</h3>
-          <p className="mt-2 text-sm text-slate-400">
-            Base visual para modelar secuencias de clicks, extracción y validación.
-          </p>
-        </article>
-        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Output</p>
-          <h3 className="mt-3 text-lg font-medium text-white">Structured Results</h3>
-          <p className="mt-2 text-sm text-slate-400">
-            Diseñado para mostrar resultados tabulares y trazas de ejecución.
-          </p>
-        </article>
-      </section>
-
-      <ResultsTable />
-    </div>
-  );
-}
-
-export default Scraper;
```

## Pendiente para Claude
- Validar la direccion visual de la UI base antes de profundizar en componentes interactivos.
- Confirmar el flujo preferido para desarrollo local Electron + Vite y el contrato de IPC definitivo.
