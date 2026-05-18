# Report 017
**Fecha:** 2026-05-17 22:57  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/cia.js` — archivo creado como parte de la base inicial
- `electron/handlers/settings.js` — archivo actualizado en esta tarea
- `electron/main.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/pages/Calificaciones.jsx` — archivo creado como parte de la base inicial

## Resumen
Se registraron 8 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/cia.js`
```diff
diff --git a/electron/handlers/cia.js b/electron/handlers/cia.js
new file mode 100644
index 0000000..1666ab1
--- /dev/null
+++ b/electron/handlers/cia.js
@@ -0,0 +1,443 @@
+const fs = require('fs');
+const path = require('path');
+const { app, ipcMain } = require('electron');
+const { chromium } = require('playwright');
+const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
+
+const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
+const REPORT_MANAGER_URL = 'http://smartweb3.itson.edu.mx:9500/psp/ITSONPRD_1/EMPLOYEE/PSFT_HR/c/REPORT_MANAGER.CONTENT_LIST.GBL?Page=CDM_CONTLIST&Action=U&';
+const CACHE_MAX_AGE_MS = 30 * 60 * 1000;
+const PAGE_TIMEOUT_MS = 20_000;
+
+function normalizeWhitespace(value) {
+  return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
+}
+
+function getCIACachePath() {
+  return path.join(app.getPath('userData'), 'cia-cache.json');
+}
+
+function readCIACache() {
+  const cachePath = getCIACachePath();
+
+  if (!fs.existsSync(cachePath)) {
+    return null;
+  }
+
+  try {
+    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
+
+    if (!parsed || typeof parsed.timestamp !== 'number' || !Array.isArray(parsed.materias)) {
+      return null;
+    }
+
+    return parsed;
+  } catch (_error) {
+    return null;
+  }
+}
+
+function writeCIACache(materias) {
+  const cachePayload = {
+    timestamp: Date.now(),
+    materias,
+  };
+
+  fs.writeFileSync(getCIACachePath(), JSON.stringify(cachePayload, null, 2), 'utf8');
+
+  return cachePayload;
+}
+
+function clearCIACache() {
+  const cachePath = getCIACachePath();
+
+  if (fs.existsSync(cachePath)) {
+    fs.unlinkSync(cachePath);
+  }
+
+  return { success: true };
+}
+
+async function waitForFrameText(page, matcher, timeoutMs = PAGE_TIMEOUT_MS) {
+  const deadline = Date.now() + timeoutMs;
+
+  while (Date.now() < deadline) {
+    for (const frame of page.frames()) {
+      const text = await frame.locator('body').textContent().catch(() => '');
+      const normalized = normalizeWhitespace(text);
+
+      if (!normalized) {
+        continue;
+      }
+
+      if (matcher instanceof RegExp ? matcher.test(normalized) : normalized.includes(matcher)) {
+        return frame;
+      }
+    }
+
+    await page.waitForTimeout(500);
+  }
+
+  throw new Error(`No se encontró el contenido esperado: ${matcher}`);
+}
+
+async function waitForFrameUrl(page, matcher, timeoutMs = PAGE_TIMEOUT_MS) {
+  const deadline = Date.now() + timeoutMs;
+
+  while (Date.now() < deadline) {
+    for (const frame of page.frames()) {
+      const url = frame.url() || '';
+
+      if (matcher instanceof RegExp ? matcher.test(url) : url.includes(matcher)) {
+        return frame;
+      }
+    }
+
+    await page.waitForTimeout(500);
+  }
+
+  throw new Error(`No se encontró el frame esperado: ${matcher}`);
+}
+
+async function loginToCIA(page) {
+  const user = process.env.CIA_USER;
+  const password = process.env.CIA_PASS;
+
+  if (!user || !password) {
+    throw new Error('Credenciales CIA inválidas o no configuradas.');
+  }
+
+  await page.goto(CIA_ENTRY_URL, { waitUntil: 'domcontentloaded' });
+  await page.locator('#txtITSONET').fill(user);
+  await page.locator('#btnConexionTrayectorias').click();
+  await page.waitForTimeout(1500);
+
+  await page.getByRole('button', { name: 'Continuar' }).click();
+  await page.waitForTimeout(1500);
+
+  await page.locator('#userid').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
+  await page.locator('#userid').fill(user);
+  await page.locator('#pwd').fill(password);
+  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
+
+  await page.waitForTimeout(4000);
+
+  const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();
+
+  if (!(await autoservicioLink.count().catch(() => 0))) {
+    throw new Error('Credenciales CIA inválidas o no configuradas.');
+  }
+
+  await autoservicioLink.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
+}
+
+async function openBoletaPage(page) {
+  const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();
+  await autoservicioLink.click();
+  await page.waitForTimeout(8000);
+
+  const navFrame = page.frames().find(
+    (frame) =>
+      frame.url().includes('PortalCacheContent=true') &&
+      frame.url().includes('CO_EMPLOYEE_SELF_SERVICE&FolderPath'),
+  );
+
+  if (!navFrame) {
+    throw new Error('No fue posible abrir el menú de Autoservicio.');
+  }
+
+  const boletaLink = navFrame.getByRole('link', { name: 'Boleta de Calificación', exact: true });
+  await boletaLink.click();
+
+  const boletaFrame = await waitForFrameUrl(
+    page,
+    /ITSR_MENU\.ITSR_BOL_CAL_GBL\.GBL.*PortalCRefLabel=Boleta/i,
+  );
+
+  if (!boletaFrame) {
+    throw new Error('No fue posible abrir el formulario de Boleta de Calificación.');
+  }
+
+  await boletaFrame.locator('#ITSR_RUN_BOLCAL_EMPLID').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
+
+  return boletaFrame;
+}
+
+async function openReportManagerList(page) {
+  await page.goto(REPORT_MANAGER_URL, { waitUntil: 'domcontentloaded' });
+  await page.waitForTimeout(2000);
+  return waitForFrameText(page, /Lista Informes/i);
+}
+
+async function setSelectValueWithoutPostback(frame, selector, value) {
+  await frame.locator(selector).evaluate((element, nextValue) => {
+    if (element instanceof HTMLSelectElement) {
+      element.value = nextValue;
+    }
+  }, value);
+}
+
+function isGradeCode(value) {
+  return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9-]{4,}$/.test(value || '');
+}
+
+function parseFinalGrade(value) {
+  if (!value) {
+    return null;
+  }
+
+  const normalized = value.replace(',', '.');
+  const parsed = Number(normalized);
+  return Number.isFinite(parsed) ? parsed : null;
+}
+
+function extractMateriasFromPage(pageTextItems) {
+  const groupedRows = new Map();
+
+  pageTextItems.forEach((item) => {
+    const rowKey = Math.round(item.y * 2) / 2;
+
+    if (!groupedRows.has(rowKey)) {
+      groupedRows.set(rowKey, []);
+    }
+
+    groupedRows.get(rowKey).push(item);
+  });
+
+  const materias = [];
+
+  [...groupedRows.entries()]
+    .sort((a, b) => b[0] - a[0])
+    .forEach(([, rowItems]) => {
+      const sortedItems = rowItems
+        .map((item) => ({
+          text: normalizeWhitespace(item.str),
+          x: item.x,
+        }))
+        .filter((item) => item.text)
+        .sort((a, b) => a.x - b.x);
+
+      if (sortedItems.length === 0) {
+        return;
+      }
+
+      const codeIndex = sortedItems.findIndex((item) => isGradeCode(item.text));
+
+      if (codeIndex < 0) {
+        return;
+      }
+
+      const clave = sortedItems[codeIndex].text;
+      const contentItems = sortedItems.slice(codeIndex + 1);
+      const nombreParts = [];
+      const partialGrades = [];
+      let finalGrade = null;
+
+      contentItems.forEach((item) => {
+        const isNumeric = /^-?\d+(?:[.,]\d+)?$/.test(item.text);
+
+        if (item.x >= 760 && isNumeric) {
+          finalGrade = parseFinalGrade(item.text);
+          return;
+        }
+
+        if (item.x >= 700) {
+          return;
+        }
+
+        if (isNumeric) {
+          partialGrades.push(parseFinalGrade(item.text));
+          return;
+        }
+
+        if (/^(?:TOTAL|CALIF|FALTAS)$/i.test(item.text)) {
+          return;
+        }
+
+        nombreParts.push(item.text);
+      });
+
+      const nombre = normalizeWhitespace(nombreParts.join(' '));
+
+      if (!nombre || /^(?:REGISTRO DE EVALUACIONES|INSTITUTO TECNOL[ÓO]GICO|CICLO LECTIVO|PLAN|NOMBRE|PROGRAMA|ID ALUMNO)/i.test(nombre)) {
+        return;
+      }
+
+      const partialEntries = partialGrades
+        .filter((value) => Number.isFinite(value))
+        .map((value, index) => ({ parcial: `Parcial ${index + 1}`, calificacion: value }));
+      const calificaciones =
+        partialEntries.length > 0
+          ? [
+              ...partialEntries,
+              ...(Number.isFinite(finalGrade) ? [{ parcial: 'Final', calificacion: finalGrade }] : []),
+            ]
+          : [{ parcial: 'Final', calificacion: finalGrade }];
+
+      const promedio = Number.isFinite(finalGrade) ? finalGrade : null;
+
+      let estado = 'sin_calificacion';
+      if (promedio !== null) {
+        if (promedio >= 70) {
+          estado = 'aprobada';
+        } else if (promedio >= 60) {
+          estado = 'en_riesgo';
+        } else {
+          estado = 'reprobada';
+        }
+      }
+
+      materias.push({
+        clave,
+        nombre,
+        profesor: '',
+        calificaciones,
+        promedio,
+        estado,
+      });
+    });
+
+  return materias;
+}
+
+async function extractCalificacionesFromPdf(buffer) {
+  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
+  const allItems = [];
+
+  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
+    const page = await doc.getPage(pageNumber);
+    const content = await page.getTextContent();
+
+    content.items.forEach((item) => {
+      allItems.push({
+        str: item.str,
+        x: item.transform[4],
+        y: item.transform[5],
+      });
+    });
+  }
+
+  return extractMateriasFromPage(allItems);
+}
+
+async function scrapeCIAWithPlaywright() {
+  const browser = await chromium.launch({ headless: true });
+
+  try {
+    const page = await browser.newPage();
+    await loginToCIA(page);
+
+    const boletaFrame = await openBoletaPage(page);
+    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_INSTITUTION', 'ITSON');
+    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_CAREER', 'LIC');
+    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_STRM', '3147');
+    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_PROG', 'INSOF');
+    await boletaFrame.locator('#ITSRDERIVBOLCAL_PUSH').click();
+
+    let reportFrame = null;
+
+    for (let attempt = 0; attempt < 12; attempt += 1) {
+      reportFrame = await openReportManagerList(page);
+      const rowDetailLink = reportFrame.locator('a[href*="CDM_WRK_INDEX_BTN"]').first();
+      if (await rowDetailLink.count().catch(() => 0)) {
+        await rowDetailLink.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
+        break;
+      }
+
+      reportFrame = null;
+      await page.waitForTimeout(5000);
+    }
+
+    if (!reportFrame) {
+      throw new Error('No fue posible localizar el informe de la boleta en Report Manager.');
+    }
+
+    const detLink = reportFrame.locator('a[href*="CDM_WRK_INDEX_BTN"]').first();
+    await detLink.click({ force: true });
+    await page.waitForTimeout(5000);
+
+    const detailFrame = await waitForFrameText(page, /Detalle Informe/i);
+    const pdfHref = await detailFrame
+      .locator('a[href*="/psreports/"][href$=".PDF"]')
+      .first()
+      .getAttribute('href');
+
+    if (!pdfHref) {
+      throw new Error('No fue posible ubicar el PDF de la boleta.');
+    }
+
+    const pdfUrl = new URL(pdfHref, page.url()).href;
+    const pdfResponse = await page.context().request.get(pdfUrl);
+
+    if (!pdfResponse.ok()) {
+      throw new Error('No fue posible descargar el PDF de la boleta.');
+    }
+
+    const materias = await extractCalificacionesFromPdf(Buffer.from(await pdfResponse.body()));
+
+    return {
+      materias,
+      timestamp: Date.now(),
+    };
+  } finally {
+    await browser.close();
+  }
+}
+
+async function getCalificacionesWithCache() {
+  const cached = readCIACache();
+
+  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
+    return {
+      materias: cached.materias,
+      timestamp: cached.timestamp,
+      fromCache: true,
+    };
+  }
+
+  try {
+    const response = await scrapeCIAWithPlaywright();
+
+    if (Array.isArray(response.materias)) {
+      writeCIACache(response.materias);
+    }
+
+    return {
+      ...response,
+      fromCache: false,
+    };
+  } catch (error) {
+    const message = error?.message || '';
+
+    if (
+      message.includes('Credenciales CIA inválidas o no configuradas') ||
+      /timeout|login/i.test(message)
+    ) {
+      return { error: 'Credenciales CIA inválidas o no configuradas.' };
+    }
+
+    return {
+      error: message ? `Falló la extracción del CIA: ${message}` : 'Falló la extracción del CIA por un error no identificado.',
+    };
+  }
+}
+
+function registerCIAHandlers() {
+  ipcMain.handle('cia:run', async () => getCalificacionesWithCache());
+  ipcMain.handle('cia:clear-cache', async () => clearCIACache());
+}
+
+module.exports = {
+  clearCIACache,
+  extractCalificacionesFromPdf,
+  getCIACachePath,
+  getCalificacionesWithCache,
+  loginToCIA,
+  openBoletaPage,
+  openReportManagerList,
+  readCIACache,
+  registerCIAHandlers,
+  scrapeCIAWithPlaywright,
+  waitForFrameText,
+  writeCIACache,
+};
```

### `electron/handlers/settings.js`
```diff
diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
index 51932ef..a1a282a 100644
--- a/electron/handlers/settings.js
+++ b/electron/handlers/settings.js
@@ -20,6 +20,8 @@ function getSettings() {
   return {
     user: process.env.IVIRTUAL_USER || '',
     hasPassword: Boolean(process.env.IVIRTUAL_PASS),
+    ciaUser: process.env.CIA_USER || '',
+    hasCIAPassword: Boolean(process.env.CIA_PASS),
   };
 }
 
@@ -35,28 +37,41 @@ function upsertEnvValue(lines, key, value) {
   return [...lines, nextLine];
 }
 
-function saveSettings({ user, password }) {
+function saveSettings({ user, password, ciaUser, ciaPassword }) {
   try {
     const normalizedUser = typeof user === 'string' ? user.trim() : '';
     const normalizedPassword = typeof password === 'string' ? password : '';
+    const normalizedCIAUser = typeof ciaUser === 'string' ? ciaUser.trim() : '';
+    const normalizedCIAPassword = typeof ciaPassword === 'string' ? ciaPassword : '';
 
     if (!normalizedUser) {
       return { success: false, error: 'El ID de usuario es requerido.' };
     }
 
+    if (!normalizedCIAUser) {
+      return { success: false, error: 'El Usuario CIA es requerido.' };
+    }
+
     let envLines = readEnvLines().filter((line) => line.trim().length > 0);
     envLines = upsertEnvValue(envLines, 'IVIRTUAL_USER', normalizedUser);
+    envLines = upsertEnvValue(envLines, 'CIA_USER', normalizedCIAUser);
 
     if (normalizedPassword.trim()) {
       envLines = upsertEnvValue(envLines, 'IVIRTUAL_PASS', normalizedPassword);
       process.env.IVIRTUAL_PASS = normalizedPassword;
     }
 
+    if (normalizedCIAPassword.trim()) {
+      envLines = upsertEnvValue(envLines, 'CIA_PASS', normalizedCIAPassword);
+      process.env.CIA_PASS = normalizedCIAPassword;
+    }
+
     const envPath = getEnvFilePath();
     const envContents = `${envLines.join('\n')}\n`;
 
     fs.writeFileSync(envPath, envContents, 'utf8');
     process.env.IVIRTUAL_USER = normalizedUser;
+    process.env.CIA_USER = normalizedCIAUser;
 
     return { success: true };
   } catch (error) {
```

### `electron/main.js`
```diff
diff --git a/electron/main.js b/electron/main.js
index 81b2b1d..e7dfb28 100644
--- a/electron/main.js
+++ b/electron/main.js
@@ -3,6 +3,7 @@ require('dotenv').config({ quiet: true });
 const { app, BrowserWindow } = require('electron');
 const path = require('path');
 const { registerScraperHandlers } = require('./handlers/scraper');
+const { registerCIAHandlers } = require('./handlers/cia');
 const { registerFileHandlers } = require('./handlers/files');
 const { registerSettingsHandlers } = require('./handlers/settings');
 const { registerNotificationHandlers } = require('./handlers/notifications');
@@ -33,6 +34,7 @@ function createMainWindow() {
 
 app.whenReady().then(() => {
   registerScraperHandlers();
+  registerCIAHandlers();
   registerFileHandlers();
   registerSettingsHandlers();
   registerNotificationHandlers();
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index fa1998e..ae731c4 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -3,6 +3,8 @@ const { contextBridge, ipcRenderer } = require('electron');
 contextBridge.exposeInMainWorld('scraperApp', {
   clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+  runCIA: () => ipcRenderer.invoke('cia:run'),
+  clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
   getSettings: () => ipcRenderer.invoke('settings:get'),
   saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
   checkNotifications: (activities) => ipcRenderer.invoke('notifications:check', activities),
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 2aed887..16214b8 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -2,6 +2,7 @@ import { useEffect, useState } from 'react';
 import Sidebar from './components/Sidebar';
 import TaskPanel from './components/TaskPanel';
 import Actividades from './pages/Actividades';
+import Calificaciones from './pages/Calificaciones';
 import Files from './pages/Files';
 import Ajustes from './pages/Ajustes';
 
@@ -11,6 +12,11 @@ const pageRegistry = {
     description: 'Consulta y clasifica las actividades de iVirtual ITSON por estado.',
     component: Actividades,
   },
+  calificaciones: {
+    title: 'Calificaciones',
+    description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
+    component: Calificaciones,
+  },
   files: {
     title: 'Archivos',
     description: 'Centraliza los adjuntos encontrados en las actividades de iVirtual.',
@@ -26,9 +32,13 @@ const pageRegistry = {
 function App() {
   const [activePage, setActivePage] = useState('activities');
   const [activities, setActivities] = useState([]);
+  const [calificaciones, setCalificaciones] = useState([]);
   const [loading, setLoading] = useState(false);
+  const [loadingCIA, setLoadingCIA] = useState(false);
   const [error, setError] = useState('');
+  const [errorCIA, setErrorCIA] = useState('');
   const [lastSyncAt, setLastSyncAt] = useState('');
+  const [lastSyncCIA, setLastSyncCIA] = useState('');
   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
 
   const pageConfig = pageRegistry[activePage];
@@ -81,10 +91,56 @@ function App() {
     }
   };
 
+  const loadCalificaciones = async ({ clearCacheFirst = false } = {}) => {
+    setLoadingCIA(true);
+    setErrorCIA('');
+
+    try {
+      if (!api) {
+        setErrorCIA('ScraperApp debe ejecutarse dentro de Electron.');
+        setCalificaciones([]);
+        return;
+      }
+
+      if (clearCacheFirst) {
+        const cacheResult = await api.clearCIACache();
+
+        if (cacheResult?.success === false) {
+          setErrorCIA(cacheResult.error || 'No fue posible limpiar el caché local del CIA.');
+          setCalificaciones([]);
+          return;
+        }
+      }
+
+      const response = await api.runCIA();
+
+      if (response?.error) {
+        setErrorCIA(response.error);
+        setCalificaciones([]);
+        return;
+      }
+
+      const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+      setCalificaciones(materiasList);
+      setLastSyncCIA(response?.timestamp ? new Date(response.timestamp).toISOString() : '');
+    } catch (_error) {
+      setErrorCIA('No fue posible consultar el CIA. Verifica la conexión y las credenciales locales.');
+      setCalificaciones([]);
+    } finally {
+      setLoadingCIA(false);
+    }
+  };
+
   useEffect(() => {
     loadActivities();
   }, []);
 
+  useEffect(() => {
+    if (activePage === 'calificaciones' && calificaciones.length === 0 && !loadingCIA && !lastSyncCIA) {
+      loadCalificaciones();
+    }
+  }, [activePage]);
+
   useEffect(() => {
     if (!api) return;
 
@@ -110,10 +166,16 @@ function App() {
         <TaskPanel title={pageConfig.title} description={pageConfig.description}>
           <ActivePage
             activities={activities}
+            calificaciones={calificaciones}
+            errorCIA={errorCIA}
             error={error}
+            lastSyncCIA={lastSyncCIA}
             lastSyncAt={lastSyncAt}
+            loadingCIA={loadingCIA}
             loading={loading}
             onSync={handleSyncActivities}
+            onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
+            onNavigate={setActivePage}
             progress={progress}
           />
         </TaskPanel>
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 67081ba..ff61566 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,8 +1,9 @@
 import logoItson from '../assets/logo-itson.png';
-import { Download, FolderCog, ListChecks } from 'lucide-react';
+import { Download, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
 
 const navigationItems = [
   { id: 'activities', label: 'Actividades', icon: ListChecks },
+  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
   { id: 'files', label: 'Archivos', icon: Download },
   { id: 'settings', label: 'Ajustes', icon: FolderCog },
 ];
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index 9d4c12d..62ac1bf 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -1,13 +1,84 @@
 import { AlertCircle, CheckCircle, FolderCog, Loader2, ShieldCheck } from 'lucide-react';
 import { useEffect, useState } from 'react';
 
+function CredentialSection({
+  buttonLabel,
+  hasPassword,
+  icon: Icon,
+  isLoading,
+  isSaving,
+  note,
+  onSubmit,
+  password,
+  passwordLabel,
+  passwordPlaceholder = '••••••••',
+  passwordValueSetter,
+  title,
+  user,
+  userLabel,
+  userValueSetter,
+}) {
+  return (
+    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+      <div className="flex items-start gap-3">
+        <Icon className="mt-1 h-5 w-5 text-itson-blue" />
+        <div className="w-full">
+          <h3 className="text-xl font-semibold text-white">{title}</h3>
+          {note ? <p className="mt-2 text-sm leading-6 text-slate-400">{note}</p> : null}
+        </div>
+      </div>
+
+      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
+        <label className="block space-y-2">
+          <span className="text-sm font-medium text-slate-200">{userLabel}</span>
+          <input
+            type="text"
+            value={user}
+            onChange={(event) => userValueSetter(event.target.value)}
+            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            placeholder="Ej. 00000279009"
+          />
+        </label>
+
+        <label className="block space-y-2">
+          <span className="text-sm font-medium text-slate-200">{passwordLabel}</span>
+          <input
+            type="password"
+            value={password}
+            onChange={(event) => passwordValueSetter(event.target.value)}
+            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+            placeholder={passwordPlaceholder}
+          />
+          <p className="text-xs text-slate-500">
+            {hasPassword
+              ? 'Si dejas este campo vacío, se conservará la contraseña actual.'
+              : 'Aún no hay contraseña guardada en la configuración local.'}
+          </p>
+        </label>
+
+        <button
+          type="submit"
+          disabled={isLoading || isSaving}
+          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+        >
+          {isLoading || isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
+          {isLoading ? 'Cargando...' : isSaving ? 'Guardando...' : buttonLabel}
+        </button>
+      </form>
+    </section>
+  );
+}
+
 function Ajustes({ error, lastSyncAt, loading }) {
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
   const [user, setUser] = useState('');
   const [password, setPassword] = useState('');
+  const [ciaUser, setCiaUser] = useState('');
+  const [ciaPassword, setCiaPassword] = useState('');
   const [hasPassword, setHasPassword] = useState(false);
+  const [hasCIAPassword, setHasCIAPassword] = useState(false);
   const [settingsLoading, setSettingsLoading] = useState(true);
-  const [saving, setSaving] = useState(false);
+  const [savingSection, setSavingSection] = useState('');
   const [feedback, setFeedback] = useState({ type: '', message: '' });
 
   useEffect(() => {
@@ -34,6 +105,8 @@ function Ajustes({ error, lastSyncAt, loading }) {
 
         setUser(response?.user || '');
         setHasPassword(Boolean(response?.hasPassword));
+        setCiaUser(response?.ciaUser || '');
+        setHasCIAPassword(Boolean(response?.hasCIAPassword));
       } catch (_error) {
         if (mounted) {
           setFeedback({
@@ -55,9 +128,7 @@ function Ajustes({ error, lastSyncAt, loading }) {
     };
   }, [api]);
 
-  const handleSubmit = async (event) => {
-    event.preventDefault();
-
+  const handleSubmit = async (section) => {
     if (!api) {
       setFeedback({
         type: 'error',
@@ -66,11 +137,16 @@ function Ajustes({ error, lastSyncAt, loading }) {
       return;
     }
 
-    setSaving(true);
+    setSavingSection(section);
     setFeedback({ type: '', message: '' });
 
     try {
-      const result = await api.saveSettings({ user, password });
+      const result = await api.saveSettings({
+        user,
+        password: section === 'ivirtual' ? password : '',
+        ciaUser,
+        ciaPassword: section === 'cia' ? ciaPassword : '',
+      });
 
       if (!result?.success) {
         setFeedback({
@@ -80,8 +156,16 @@ function Ajustes({ error, lastSyncAt, loading }) {
         return;
       }
 
-      setPassword('');
-      setHasPassword(true);
+      if (section === 'ivirtual') {
+        setPassword('');
+        setHasPassword(true);
+      }
+
+      if (section === 'cia') {
+        setCiaPassword('');
+        setHasCIAPassword(true);
+      }
+
       setFeedback({
         type: 'success',
         message: 'Credenciales guardadas correctamente',
@@ -92,7 +176,7 @@ function Ajustes({ error, lastSyncAt, loading }) {
         message: 'No fue posible guardar las credenciales.',
       });
     } finally {
-      setSaving(false);
+      setSavingSection('');
     }
   };
 
@@ -123,87 +207,70 @@ function Ajustes({ error, lastSyncAt, loading }) {
       ) : null}
 
       <div className="grid gap-4 lg:grid-cols-2">
-        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-          <div className="flex items-start gap-3">
-            <FolderCog className="mt-1 h-5 w-5 text-itson-blue" />
-            <div className="w-full">
-              <h3 className="text-xl font-semibold text-white">Configuración local</h3>
-              <p className="mt-2 text-sm leading-6 text-slate-400">
-                ScraperApp usa variables locales en <code>.env</code> para autenticarse contra iVirtual.
-                Ahora puedes administrarlas desde la app sin editar archivos manualmente.
-              </p>
-            </div>
-          </div>
+        <CredentialSection
+          buttonLabel="Guardar credenciales"
+          hasPassword={hasPassword}
+          icon={FolderCog}
+          isLoading={settingsLoading}
+          isSaving={savingSection === 'ivirtual'}
+          note="ScraperApp usa variables locales en .env para autenticarse contra iVirtual. Ahora puedes administrarlas desde la app sin editar archivos manualmente."
+          onSubmit={(event) => {
+            event.preventDefault();
+            handleSubmit('ivirtual');
+          }}
+          password={password}
+          passwordLabel="Contraseña"
+          passwordValueSetter={setPassword}
+          title="Configuración iVirtual"
+          user={user}
+          userLabel="ID de usuario"
+          userValueSetter={setUser}
+        />
 
-          {settingsLoading ? (
-            <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
-              <Loader2 className="h-4 w-4 animate-spin" />
-              Cargando configuración...
-            </div>
-          ) : (
-            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
-              <label className="block space-y-2">
-                <span className="text-sm font-medium text-slate-200">ID de usuario</span>
-                <input
-                  type="text"
-                  value={user}
-                  onChange={(event) => setUser(event.target.value)}
-                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
-                  placeholder="Ej. 00000279009"
-                />
-              </label>
-
-              <label className="block space-y-2">
-                <span className="text-sm font-medium text-slate-200">Contraseña</span>
-                <input
-                  type="password"
-                  value={password}
-                  onChange={(event) => setPassword(event.target.value)}
-                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
-                  placeholder="••••••••"
-                />
-                <p className="text-xs text-slate-500">
-                  {hasPassword
-                    ? 'Si dejas este campo vacío, se conservará la contraseña actual.'
-                    : 'Aún no hay contraseña guardada en la configuración local.'}
-                </p>
-              </label>
-
-              <button
-                type="submit"
-                disabled={saving || settingsLoading}
-                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
-              >
-                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
-                {saving ? 'Guardando...' : 'Guardar credenciales'}
-              </button>
-            </form>
-          )}
-        </section>
-
-        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-          <div className="flex items-start gap-3">
-            <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
-            <div>
-              <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
-              <ul className="mt-3 space-y-2 text-sm text-slate-300">
-                <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
-                <li>Extracción por curso usando el índice de tareas de Moodle.</li>
-                <li>
-                  {loading ? (
-                    <span className="inline-flex items-center gap-2">
-                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
-                      Sincronizando...
-                    </span>
-                  ) : (
-                    <>Última sincronización: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</>
-                  )}
-                </li>
-              </ul>
-            </div>
-          </div>
-        </section>
+        <CredentialSection
+          buttonLabel="Guardar credenciales CIA"
+          hasPassword={hasCIAPassword}
+          icon={ShieldCheck}
+          isLoading={settingsLoading}
+          isSaving={savingSection === 'cia'}
+          note="Credenciales CIA (Dominio institucional). Se actualiza anualmente por políticas ITSON."
+          onSubmit={(event) => {
+            event.preventDefault();
+            handleSubmit('cia');
+          }}
+          password={ciaPassword}
+          passwordLabel="Contraseña CIA"
+          passwordPlaceholder="••••••••"
+          passwordValueSetter={setCiaPassword}
+          title="Credenciales CIA (Dominio institucional)"
+          user={ciaUser}
+          userLabel="Usuario CIA"
+          userValueSetter={setCiaUser}
+        />
       </div>
+
+      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+        <div className="flex items-start gap-3">
+          <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
+          <div>
+            <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
+            <ul className="mt-3 space-y-2 text-sm text-slate-300">
+              <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
+              <li>Extracción por curso usando el índice de tareas de Moodle.</li>
+              <li>
+                {loading ? (
+                  <span className="inline-flex items-center gap-2">
+                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
+                    Sincronizando...
+                  </span>
+                ) : (
+                  <>Última sincronización: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</>
+                )}
+              </li>
+            </ul>
+          </div>
+        </div>
+      </section>
     </div>
   );
 }
```

### `src/pages/Calificaciones.jsx`
```diff
diff --git a/src/pages/Calificaciones.jsx b/src/pages/Calificaciones.jsx
new file mode 100644
index 0000000..fd6dfb8
--- /dev/null
+++ b/src/pages/Calificaciones.jsx
@@ -0,0 +1,288 @@
+import {
+  AlertCircle,
+  AlertTriangle,
+  BookOpen,
+  CheckCircle2,
+  GraduationCap,
+  Loader2,
+  RefreshCw,
+} from 'lucide-react';
+
+const statusLabels = {
+  aprobada: 'Aprobada',
+  en_riesgo: 'En riesgo',
+  reprobada: 'Reprobada',
+  sin_calificacion: 'Sin calificación',
+};
+
+const statusClasses = {
+  aprobada: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
+  en_riesgo: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
+  reprobada: 'border-red-500/30 bg-red-500/10 text-red-100',
+  sin_calificacion: 'border-slate-700 bg-slate-800/60 text-slate-300',
+};
+
+function formatGrade(value) {
+  if (value === null || value === undefined || Number.isNaN(Number(value))) {
+    return '—';
+  }
+
+  const numericValue = Number(value);
+  return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1);
+}
+
+function formatLastSync(lastSyncAt) {
+  if (!lastSyncAt) {
+    return 'Última sync: aún no disponible.';
+  }
+
+  const syncDate = new Date(lastSyncAt);
+  const now = new Date();
+  const diffMs = Math.max(0, now.getTime() - syncDate.getTime());
+  const diffMinutes = Math.floor(diffMs / 60000);
+
+  if (diffMinutes < 60) {
+    return `Última sync: hace ${Math.max(1, diffMinutes)} minuto${diffMinutes === 1 ? '' : 's'}`;
+  }
+
+  const isToday = syncDate.toDateString() === now.toDateString();
+
+  if (isToday) {
+    return `Última sync: hoy ${new Intl.DateTimeFormat('es-MX', {
+      hour: '2-digit',
+      minute: '2-digit',
+    }).format(syncDate)}`;
+  }
+
+  return `Última sync: ${new Intl.DateTimeFormat('es-MX', {
+    dateStyle: 'medium',
+    timeStyle: 'short',
+  }).format(syncDate)}`;
+}
+
+function StatCard({ icon: Icon, label, value, tone = 'default' }) {
+  const toneClasses = {
+    default: 'bg-itson-blue/10 text-itson-blue',
+    emerald: 'bg-emerald-500/10 text-emerald-300',
+    orange: 'bg-orange-500/10 text-orange-300',
+  };
+
+  return (
+    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+      <div className="flex items-center gap-3">
+        <span className={`rounded-2xl p-3 ${toneClasses[tone] || toneClasses.default}`}>
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
+function StatusBadge({ status }) {
+  return (
+    <span
+      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
+        statusClasses[status] || statusClasses.sin_calificacion
+      }`}
+    >
+      {statusLabels[status] || statusLabels.sin_calificacion}
+    </span>
+  );
+}
+
+function PartialChip({ parcial, calificacion }) {
+  const numericValue = calificacion === null ? null : Number(calificacion);
+
+  const toneClasses =
+    numericValue === null
+      ? 'border border-slate-700 bg-slate-700/50 text-slate-500'
+      : numericValue >= 70
+        ? 'bg-emerald-500/20 text-emerald-300'
+        : numericValue >= 60
+          ? 'bg-orange-500/20 text-orange-300'
+          : 'bg-red-500/20 text-red-300';
+
+  return (
+    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClasses}`}>
+      <span>{parcial}</span>
+      <span>{formatGrade(calificacion)}</span>
+    </span>
+  );
+}
+
+function GradeCard({ materia }) {
+  const partials = Array.isArray(materia.calificaciones) && materia.calificaciones.length > 0
+    ? materia.calificaciones
+    : [{ parcial: 'Final', calificacion: null }];
+
+  return (
+    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
+      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
+        <div className="space-y-2">
+          <div>
+            <h3 className="text-lg font-semibold text-white">{materia.nombre || 'Materia sin nombre'}</h3>
+            <p className="text-sm text-slate-400">{materia.clave || 'Clave no disponible'}</p>
+          </div>
+          <p className="text-sm text-slate-400">
+            {materia.profesor || 'Profesor no visible en CIA'}
+          </p>
+        </div>
+
+        <div className="flex shrink-0 items-center gap-3">
+          <StatusBadge status={materia.estado} />
+        </div>
+      </div>
+
+      <div className="mt-5 flex flex-wrap gap-2">
+        {partials.map((item) => (
+          <PartialChip
+            key={`${materia.clave || materia.nombre}-${item.parcial}`}
+            parcial={item.parcial}
+            calificacion={item.calificacion}
+          />
+        ))}
+      </div>
+
+      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
+        <p className="text-sm text-slate-400">
+          Promedio:{' '}
+          <span className="text-slate-100">
+            {materia.promedio === null || materia.promedio === undefined ? '—' : formatGrade(materia.promedio)}
+          </span>
+        </p>
+        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
+          CIA ITSON · semestre actual
+        </p>
+      </div>
+    </article>
+  );
+}
+
+function Calificaciones({
+  calificaciones = [],
+  errorCIA,
+  lastSyncCIA,
+  loadingCIA,
+  onNavigate,
+  onSyncCIA,
+}) {
+  const materias = Array.isArray(calificaciones) ? calificaciones : [];
+  const aprobadas = materias.filter((materia) => materia.estado === 'aprobada').length;
+  const enRiesgo = materias.filter((materia) => materia.estado === 'en_riesgo').length;
+  const numericAverages = materias
+    .map((materia) => (typeof materia.promedio === 'number' ? materia.promedio : null))
+    .filter((value) => value !== null);
+  const averageGeneral =
+    numericAverages.length > 0
+      ? numericAverages.reduce((sum, value) => sum + value, 0) / numericAverages.length
+      : null;
+  const credentialError = /credenciales cia|cia inválidas|cia no configuradas/i.test(errorCIA || '');
+
+  return (
+    <div className="space-y-6">
+      {errorCIA ? (
+        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <div className="flex items-start gap-3">
+            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+            <div className="space-y-1">
+              <p>{errorCIA}</p>
+              {credentialError ? (
+                <p className="text-xs text-red-200/80">
+                  Revisa tus credenciales CIA desde Ajustes.
+                </p>
+              ) : null}
+            </div>
+          </div>
+          {credentialError && typeof onNavigate === 'function' ? (
+            <button
+              type="button"
+              onClick={() => onNavigate('settings')}
+              className="rounded-xl border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
+            >
+              Ir a Ajustes
+            </button>
+          ) : null}
+        </div>
+      ) : null}
+
+      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
+          <div className="space-y-4">
+            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
+              <GraduationCap className="h-3.5 w-3.5" />
+              CIA ITSON
+            </div>
+            <div>
+              <h3 className="text-2xl font-semibold text-white">Calificaciones</h3>
+              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
+                Consulta el registro académico del semestre actual desde el CIA con caché local,
+                sincronización manual y acceso directo a tu información institucional.
+              </p>
+            </div>
+          </div>
+
+          <div className="space-y-3">
+            <button
+              type="button"
+              onClick={onSyncCIA}
+              disabled={loadingCIA}
+              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+            >
+              <RefreshCw className={`h-4 w-4 ${loadingCIA ? 'animate-spin' : ''}`} />
+              {loadingCIA ? 'Sincronizando...' : 'Sincronizar'}
+            </button>
+
+            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
+              {formatLastSync(lastSyncCIA)}
+            </p>
+          </div>
+        </div>
+      </section>
+
+      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
+        <StatCard icon={BookOpen} label="Total de materias" value={materias.length} />
+        <StatCard icon={CheckCircle2} label="Materias aprobadas" value={aprobadas} tone="emerald" />
+        <StatCard icon={AlertTriangle} label="Materias en riesgo" value={enRiesgo} tone="orange" />
+        <StatCard
+          icon={GraduationCap}
+          label="Promedio general"
+          value={averageGeneral === null ? '—' : formatGrade(averageGeneral)}
+        />
+      </section>
+
+      {loadingCIA ? (
+        <div className="space-y-4">
+          {Array.from({ length: 4 }).map((_, index) => (
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
+      ) : materias.length > 0 ? (
+        <div className="space-y-4">
+          {materias.map((materia, index) => (
+            <GradeCard key={`${materia.clave || materia.nombre || 'materia'}-${index}`} materia={materia} />
+          ))}
+        </div>
+      ) : (
+        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
+          <BookOpen className="h-8 w-8 text-slate-600" />
+          <p className="mt-4 text-sm text-slate-300">
+            No hay materias disponibles para mostrar.
+          </p>
+        </div>
+      )}
+    </div>
+  );
+}
+
+export default Calificaciones;
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
