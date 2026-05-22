# Report 028
**Fecha:** 2026-05-22 00:07  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/horario.js` — archivo actualizado en esta tarea

## Resumen
Se registraron 1 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 9d4ddbf..3de1737 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -1,6 +1,8 @@
 const fs = require('fs');
 const path = require('path');
-const { app, ipcMain } = require('electron');
+const electron = require('electron');
+const app = electron?.app;
+const ipcMain = electron?.ipcMain;
 const { chromium } = require('playwright');
 
 const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
@@ -124,11 +126,21 @@ async function applyResourceBlocking(page) {
 }
 
 function getHorarioCachePath() {
-  return path.join(app.getPath('userData'), 'horario-cache.json');
+  return path.join(getUserDataPath(), 'horario-cache.json');
 }
 
 function getManualLinksPath() {
-  return path.join(app.getPath('userData'), 'horario-links-manuales.json');
+  return path.join(getUserDataPath(), 'horario-links-manuales.json');
+}
+
+function getUserDataPath() {
+  if (app && typeof app.getPath === 'function') {
+    return app.getPath('userData');
+  }
+
+  const fallbackPath = path.join(process.cwd(), '.local-data');
+  fs.mkdirSync(fallbackPath, { recursive: true });
+  return fallbackPath;
 }
 
 function discardFile(filePath) {
@@ -424,6 +436,59 @@ function extractDayTokens(text) {
   return DAY_ORDER.filter((day) => days.has(day));
 }
 
+function parsePeopleSoftDays(value) {
+  const normalized = normalizeWhitespace(value);
+
+  if (!normalized) {
+    return [];
+  }
+
+  const tokenPart = normalized
+    .split(/\d/)[0]
+    .replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g, '');
+
+  const compact = normalizeForCompare(tokenPart).replace(/[^a-z]/g, '');
+  const days = new Set();
+
+  for (let index = 0; index < compact.length; ) {
+    const slice = compact.slice(index);
+
+    if (slice.startsWith('mi')) {
+      days.add('Miércoles');
+      index += 2;
+      continue;
+    }
+
+    if (slice.startsWith('ma')) {
+      days.add('Martes');
+      index += 2;
+      continue;
+    }
+
+    const char = compact[index];
+
+    if (char === 'l') {
+      days.add('Lunes');
+    } else if (char === 'j') {
+      days.add('Jueves');
+    } else if (char === 'v') {
+      days.add('Viernes');
+    } else if (char === 's') {
+      days.add('Sábado');
+    } else if (char === 'd') {
+      days.add('Domingo');
+    }
+
+    index += 1;
+  }
+
+  if (days.size > 0) {
+    return DAY_ORDER.filter((day) => days.has(day));
+  }
+
+  return extractDayTokens(normalized);
+}
+
 function getFriendlyDayOrder(days) {
   const normalizedDays = Array.isArray(days) ? days : [];
   return DAY_ORDER.filter((day) => normalizedDays.includes(day));
@@ -447,6 +512,59 @@ function uniqueByKey(items, keyFn) {
   return [...map.values()];
 }
 
+function extractCourseFromContext(value) {
+  const text = normalizeWhitespace(value);
+
+  if (!text) {
+    return { codigo: '', nombre: '' };
+  }
+
+  const courseMatch = text.match(
+    /(?:^|\s)(?:[A-ZÁÉÍÓÚÑ]+)\s+([A-Z0-9-]{4,}[A-Z]?)\s*-\s*(.+?)(?:\s+Estado\s+Uni|\s+Estado\b|\s+N[ºo]\s*Clase|\s+Inscrito\b)/i,
+  );
+
+  if (courseMatch) {
+    return {
+      codigo: normalizeWhitespace(courseMatch[1]).toUpperCase(),
+      nombre: normalizeWhitespace(courseMatch[2]),
+    };
+  }
+
+  const fallbackCode = extractCode(text);
+
+  if (!fallbackCode) {
+    return { codigo: '', nombre: '' };
+  }
+
+  const fallbackName = normalizeWhitespace(
+    text
+      .replace(new RegExp(`.*?${fallbackCode}\\s*-\\s*`, 'i'), '')
+      .replace(/\s+Estado\b.*/i, '')
+      .replace(/\s+N[ºo]\s*Clase\b.*/i, ''),
+  );
+
+  return {
+    codigo: fallbackCode,
+    nombre: fallbackName,
+  };
+}
+
+async function waitForPeopleSoftNav(page, timeout = 15_000) {
+  const deadline = Date.now() + timeout;
+
+  while (Date.now() < deadline) {
+    await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => {});
+    await page.waitForTimeout(800);
+    const busy = await page
+      .evaluate(() => Boolean(document.querySelector('#processing, .ps_box-loading, .psc_processing')))
+      .catch(() => false);
+
+    if (!busy) {
+      return;
+    }
+  }
+}
+
 async function waitForFrame(page, predicate, timeoutMs = PAGE_TIMEOUT_MS) {
   const deadline = Date.now() + timeoutMs;
 
@@ -526,6 +644,46 @@ async function clickFirstLinkInFrame(frame, patterns) {
 }
 
 async function switchScheduleView(frame, viewPatterns) {
+  const requestedList = viewPatterns.some((pattern) =>
+    pattern instanceof RegExp
+      ? pattern.test('vista listado list view')
+      : /listado|list view/i.test(String(pattern)),
+  );
+  const requestedWeekly = viewPatterns.some((pattern) =>
+    pattern instanceof RegExp
+      ? pattern.test('vista horario semanal weekly')
+      : /semanal|weekly/i.test(String(pattern)),
+  );
+
+  if (requestedList || requestedWeekly) {
+    const changed = await frame
+      .evaluate((mode) => {
+        const listInput = document.getElementById('DERIVED_REGFRM1_SSR_SCHED_FORMAT');
+        const weeklyInput = document.getElementById('DERIVED_REGFRM1_SSR_SCHED_FORMAT$11$');
+        const trigger = document.getElementById('DERIVED_REGFRM1_SSR_PB_GO');
+        const target = mode === 'weekly' ? weeklyInput : listInput;
+
+        if (!target) {
+          return false;
+        }
+
+        const alreadyChecked = Boolean(target.checked);
+        target.click();
+
+        if (trigger && !alreadyChecked) {
+          trigger.click();
+        }
+
+        return true;
+      }, requestedWeekly ? 'weekly' : 'list')
+      .catch(() => false);
+
+    if (changed) {
+      await waitForPeopleSoftNav(frame.page(), 10_000);
+      return true;
+    }
+  }
+
   const selectors = [
     'a',
     'button',
@@ -616,155 +774,130 @@ async function loginToCIA(page, user, password) {
   return null;
 }
 
-async function openHorarioPage(page) {
-  const autoservicioLink = page.getByRole('link', { name: /autoservicio/i }).last();
-  await autoservicioLink.click();
-  await page.waitForTimeout(3500);
+async function getTargetContentFrame(page, timeout = 25_000) {
+  return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
+}
 
-  const navigationFrame = await waitForFrame(
-    page,
-    async (frame) => /PortalCacheContent=true|FolderPath|EMPLOYEE_SELF_SERVICE/i.test(frame.url()),
-    25_000,
+async function clickHorarioEntry(page) {
+  const targetFrame = await getTargetContentFrame(page, 25_000);
+  const targetLink = targetFrame.locator('a', { hasText: /mi horario de clases|class schedule|horario de clases/i }).first();
+
+  if (await targetLink.count().catch(() => 0)) {
+    await targetLink.click({ force: true }).catch(() => {});
+    await waitForPeopleSoftNav(page, 10_000);
+  }
+
+  const alreadyOpened = page.frames().some(
+    (frame) => frame.name() === 'TargetContent' && /SSR_SSENRL_LIST/i.test(frame.url()),
   );
 
-  await clickFirstLinkInFrame(navigationFrame, [/centro de alumnado/i, /student center/i]);
-  await page.waitForTimeout(2500);
+  if (alreadyOpened) {
+    return;
+  }
 
-  const centerFrame = await waitForFrame(
+  const navFrame = await waitForFrame(
     page,
-    async (frame) =>
-      /StudentCenter|SCC_SSS_STUDENT_CENTER|SSR_SSENRL_LIST|PortalCRefLabel=Centro/i.test(frame.url()) ||
-      (await frameHasAnyText(frame, [/mi horario de clases/i, /class schedule/i])),
+    async (frame) => frame.name() === 'NAV',
     25_000,
   );
 
-  const scheduleOpened = await clickFirstLinkInFrame(centerFrame, [
-    /mi horario de clases/i,
-    /class schedule/i,
-    /horario de clases/i,
-  ]);
+  const centerLink = navFrame.locator('a', { hasText: /centro de alumnado|student center/i }).first();
+  if (await centerLink.count().catch(() => 0)) {
+    await centerLink.click({ force: true }).catch(() => {});
+    await waitForPeopleSoftNav(page, 10_000);
+  }
 
-  if (scheduleOpened) {
-    await page.waitForTimeout(2500);
+  const scheduleLink = navFrame.locator('a', { hasText: /mi horario de clases|class schedule|horario de clases/i }).first();
+  if (await scheduleLink.count().catch(() => 0)) {
+    await scheduleLink.click({ force: true }).catch(() => {});
+    await waitForPeopleSoftNav(page, 10_000);
   }
+}
+
+async function openHorarioPage(page) {
+  const autoservicioLink = page.getByRole('link', { name: /autoservicio/i }).last();
+  await autoservicioLink.click().catch(() => {});
+  await waitForPeopleSoftNav(page, 20_000);
+  await clickHorarioEntry(page);
+  await waitForPeopleSoftNav(page, 20_000);
 
   return waitForFrame(
     page,
     async (frame) =>
-      /SSR_SSENRL_LIST|SS_WEEKLY_SCHEDULE|WEEKLY|SCHEDULE/i.test(frame.url()) ||
-      (await frameHasAnyText(frame, [/vista listado/i, /vista horario semanal/i, /class schedule/i])),
-    25_000,
+      frame.name() === 'TargetContent' &&
+      (/SSR_SSENRL_LIST/i.test(frame.url()) ||
+        (await frameHasAnyText(frame, [/vista listado/i, /vista horario semanal/i, /class schedule/i]))),
+    30_000,
   );
 }
 
 async function collectIdentifiersFromListView(scheduleFrame) {
   await switchScheduleView(scheduleFrame, [/vista listado/i, /list view/i]);
+  await waitForPeopleSoftNav(scheduleFrame.page(), 12_000);
 
-  const entries = [];
-
-  const evaluationTargets = await scheduleFrame
-    .locator('a')
-    .evaluateAll((anchors) =>
-      anchors
-        .map((anchor, index) => {
-          const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
-          const aria = anchor.getAttribute('aria-label') || '';
-          const title = anchor.getAttribute('title') || '';
-          const href = anchor.href || '';
-          return {
-            index,
-            text,
-            aria,
-            title,
-            href,
-          };
-        })
-        .filter((link) => {
-          const probe = `${link.text} ${link.aria} ${link.title} ${link.href}`.toLowerCase();
-          return (
-            probe.includes('cuaderno') ||
-            probe.includes('evaluacion') ||
-            probe.includes('evaluation') ||
-            probe.includes('gradebook') ||
-            probe.includes('eval')
-          );
-        }),
-    )
-    .catch(() => []);
-
-  for (const target of evaluationTargets) {
-    try {
-      await scheduleFrame.locator('a').nth(target.index).click({ force: true });
-      await scheduleFrame.page().waitForTimeout(1200);
-
-      const detailText = normalizeWhitespace(
-        await scheduleFrame
-          .locator('body')
-          .textContent()
-          .catch(() => ''),
-      );
-
-      const codigo = extractCode(detailText);
-      const seccion = extractSection(detailText) || '';
-      const numeroClase = extractClassNumber(detailText) || '';
-      const nombreMatch = detailText.match(/(?:materia|course|nombre)\s*[:\-]?\s*([^\n]+)/i);
-      const nombre = normalizeWhitespace(nombreMatch?.[1] || '');
-
-      if (codigo || nombre || seccion || numeroClase) {
-        entries.push({ codigo, nombre, seccion, numeroClase });
-      }
-    } catch (_error) {
-      // Continue with next item.
-    } finally {
-      const returned = await clickFirstLinkInFrame(scheduleFrame, [
-        /vista listado/i,
-        /regresar/i,
-        /volver/i,
-        /return/i,
-      ]);
-
-      if (!returned) {
-        await scheduleFrame.page().goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
-      }
+  const rawEntries = await scheduleFrame
+    .evaluate(() => {
+      const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
+      const tables = Array.from(document.querySelectorAll('table[id^="CLASS_MTG_VW$scroll$"]'));
 
-      await scheduleFrame.page().waitForTimeout(1200);
-    }
-  }
+      return tables.flatMap((table) => {
+        let container = table;
+        for (let index = 0; index < 8 && container; index += 1) {
+          container = container.parentElement;
+        }
 
-  const fallbackRows = await scheduleFrame
-    .locator('table tr')
-    .evaluateAll((rows) =>
-      rows
-        .map((row) => (row.textContent || '').replace(/\s+/g, ' ').trim())
-        .filter((text) => text.length > 8),
-    )
+        const containerText = normalize(container?.textContent || '');
+        const rows = Array.from(table.querySelectorAll('tr'))
+          .slice(1)
+          .map((row) =>
+            Array.from(row.querySelectorAll('td'))
+              .map((cell) => normalize(cell.textContent || ''))
+              .filter((cell) => cell.length > 0),
+          )
+          .filter((cells) => cells.length >= 6);
+
+        return rows.map((cells) => ({
+          containerText,
+          numeroClase: cells[0] || '',
+          seccion: cells[1] || '',
+          componente: cells[2] || '',
+          diasHoras: cells[3] || '',
+          ubicacion: cells[4] || '',
+          instructor: cells[5] || '',
+          fechaRango: cells[6] || '',
+        }));
+      });
+    })
     .catch(() => []);
 
-  fallbackRows.forEach((rowText) => {
-    const codigo = extractCode(rowText);
-    const numeroClase = extractClassNumber(rowText);
-    const seccion = extractSection(rowText);
-
-    if (!codigo && !numeroClase && !seccion) {
-      return;
-    }
-
-    const cleaned = rowText
-      .replace(codigo, '')
-      .replace(numeroClase, '')
-      .replace(seccion, '')
-      .replace(/\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b.*/i, '')
-      .trim();
+  const entries = rawEntries.map((entry) => {
+    const { codigo, nombre } = extractCourseFromContext(entry.containerText);
+    const hora = parseTimeRange(entry.diasHoras);
+    const days = parsePeopleSoftDays(entry.diasHoras);
+    const modalidad = inferModalidad(
+      `${entry.ubicacion} ${entry.componente} ${entry.containerText}`,
+    );
 
-    entries.push({
+    return {
       codigo,
-      nombre: normalizeWhitespace(cleaned),
-      seccion,
-      numeroClase,
-    });
+      nombre: nombre || codigo || 'Materia sin nombre',
+      seccion: entry.seccion || '',
+      numeroClase: entry.numeroClase || '',
+      dias: days,
+      horaInicio: hora.horaInicio,
+      horaFin: hora.horaFin,
+      modalidad,
+      ubicacion: entry.ubicacion || (modalidad === 'en_linea' ? 'Remoto' : ''),
+      instructor: entry.instructor || '',
+      meetLink: null,
+      linkManual: false,
+    };
   });
 
-  return uniqueByKey(entries, (entry) => entry.numeroClase || `${entry.codigo}-${entry.seccion}`);
+  return uniqueByKey(
+    entries.filter((entry) => entry.numeroClase || entry.codigo || entry.nombre),
+    (entry) => entry.numeroClase || `${entry.codigo}-${entry.seccion}-${entry.horaInicio || 'na'}`,
+  );
 }
 
 function combineScheduleRows(rows, identifiers) {
@@ -837,105 +970,95 @@ function combineScheduleRows(rows, identifiers) {
 }
 
 async function collectWeeklySchedule(scheduleFrame, identifiers) {
-  await switchScheduleView(scheduleFrame, [/vista horario semanal/i, /weekly schedule/i, /weekly calendar view/i]);
+  if (!Array.isArray(identifiers) || identifiers.length === 0) {
+    return [];
+  }
+
+  await switchScheduleView(scheduleFrame, [
+    /vista horario semanal/i,
+    /weekly schedule/i,
+    /weekly calendar view/i,
+    /semanal/i,
+  ]);
+  await waitForPeopleSoftNav(scheduleFrame.page(), 12_000);
 
   const rawRows = await scheduleFrame
     .evaluate(() => {
-      const normalize = (value) =>
-        (value || '')
-          .replace(/\s+/g, ' ')
-          .trim();
-
-      const extractText = (cell) => normalize(cell.textContent || '');
+      const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
       const tables = Array.from(document.querySelectorAll('table'));
-      const bestTable = tables.find((table) => {
-        const headers = Array.from(table.querySelectorAll('th')).map((th) => normalize(th.textContent || '').toLowerCase());
-        return headers.some((header) => /(lunes|monday|martes|tuesday|mi[eé]rcoles|wednesday|jueves|thursday|viernes|friday|s[aá]bado|saturday|domingo|sunday)/i.test(header));
-      }) || tables[0];
+      const candidate = tables.find((table) => /WEEKLY|SCHEDULE|SS_SCHED_TABLE/i.test(table.id));
 
-      if (!bestTable) {
+      if (!candidate) {
         return [];
       }
 
-      const headerCells = Array.from(bestTable.querySelectorAll('thead th, tr:first-child th, tr:first-child td')).map((header) => extractText(header));
-      const rows = Array.from(bestTable.querySelectorAll('tr'));
-      const scheduleRows = [];
+      const headerCells = Array.from(
+        candidate.querySelectorAll('thead th, tr:first-child th, tr:first-child td'),
+      ).map((cell) => normalize(cell.textContent || ''));
+
+      const rows = Array.from(candidate.querySelectorAll('tr'));
+      const output = [];
 
-      rows.forEach((row, rowIndex) => {
+      rows.forEach((row) => {
         const cells = Array.from(row.querySelectorAll('th, td'));
         if (cells.length <= 1) {
           return;
         }
 
-        const timeLabel = extractText(cells[0]);
+        const timeLabel = normalize(cells[0]?.textContent || '');
 
         for (let index = 1; index < cells.length; index += 1) {
-          const cell = cells[index];
-          const text = extractText(cell);
+          const cellText = normalize(cells[index]?.textContent || '');
 
-          if (!text || /^-+$/.test(text)) {
+          if (!cellText || /^-+$/.test(cellText)) {
             continue;
           }
 
-          const dayHeader = headerCells[index] || '';
-
-          scheduleRows.push({
-            dayHeader,
-            rawText: text,
-            rowIndex,
+          output.push({
+            dayHeader: headerCells[index] || '',
             timeLabel,
+            rawText: cellText,
           });
         }
       });
 
-      return scheduleRows;
+      return output;
     })
     .catch(() => []);
 
-  const rows = rawRows.map((item) => {
+  if (!Array.isArray(rawRows) || rawRows.length === 0) {
+    return identifiers;
+  }
+
+  const parsedRows = rawRows.map((item) => {
     const combinedText = `${item.dayHeader} ${item.rawText}`;
-    const days = extractDayTokens(combinedText);
     const range = parseTimeRange(item.timeLabel || item.rawText);
-    const modalidad = inferModalidad(item.rawText);
-
-    const locationMatch = item.rawText.match(/(?:sal[oó]n|aula|room|ubicaci[oó]n|facility|edificio|laboratorio)\s*[:\-]?\s*([A-Za-z0-9\- ]{2,})/i);
-    const instructorMatch = item.rawText.match(/(?:instructor|profesor|docente|teacher)\s*[:\-]?\s*([A-Za-zÀ-ÿ .,'-]{3,})/i);
 
     return {
       codigo: extractCode(item.rawText),
       nombre: '',
-      dias,
+      dias: parsePeopleSoftDays(combinedText),
       horaInicio: range.horaInicio,
       horaFin: range.horaFin,
-      modalidad,
-      ubicacion: normalizeWhitespace(locationMatch?.[1] || (modalidad === 'en_linea' ? 'Remoto' : '')),
-      instructor: normalizeWhitespace(instructorMatch?.[1] || ''),
+      modalidad: inferModalidad(item.rawText),
+      ubicacion: inferModalidad(item.rawText) === 'en_linea' ? 'Remoto' : '',
+      instructor: '',
       seccion: extractSection(item.rawText),
       numeroClase: extractClassNumber(item.rawText),
       rawText: item.rawText,
     };
   });
 
-  const completedRows = rows.filter((row) => row.horaInicio && row.horaFin && row.dias.length > 0);
+  const completedRows = parsedRows.filter(
+    (row) => row.horaInicio && row.horaFin && Array.isArray(row.dias) && row.dias.length > 0,
+  );
 
   if (completedRows.length === 0) {
-    return identifiers.map((entry) => ({
-      codigo: entry.codigo || '',
-      nombre: entry.nombre || entry.codigo || 'Materia sin nombre',
-      dias: [],
-      horaInicio: null,
-      horaFin: null,
-      modalidad: 'presencial',
-      ubicacion: '',
-      instructor: '',
-      seccion: entry.seccion || '',
-      numeroClase: entry.numeroClase || '',
-      meetLink: null,
-      linkManual: false,
-    }));
+    return identifiers;
   }
 
-  return combineScheduleRows(completedRows, identifiers);
+  const merged = combineScheduleRows(completedRows, identifiers);
+  return merged.length > 0 ? merged : identifiers;
 }
 
 function chunkArray(items, chunkSize) {
@@ -1187,7 +1310,6 @@ async function scrapeHorario() {
 
     const page = await context.newPage();
     page.setDefaultTimeout(PAGE_TIMEOUT_MS);
-    await applyResourceBlocking(page);
 
     const loginResult = await loginToCIA(page, ciaUser, ciaPass);
 
@@ -1195,6 +1317,7 @@ async function scrapeHorario() {
       return loginResult;
     }
 
+    await applyResourceBlocking(page);
     const scheduleFrame = await openHorarioPage(page);
     const identifiers = await collectIdentifiersFromListView(scheduleFrame);
     let materias = await collectWeeklySchedule(scheduleFrame, identifiers);
@@ -1232,6 +1355,26 @@ async function scrapeHorario() {
   }
 }
 
+async function diagnosticarCIA(page) {
+  await gotoWithRetry(page, CIA_ENTRY_URL, {
+    waitUntil: 'domcontentloaded',
+    timeout: CIA_LOGIN_TIMEOUT_MS,
+  });
+
+  const frames = page.frames();
+  console.log(
+    'Frames encontrados:',
+    frames.map((frame) => ({ url: frame.url(), name: frame.name() })),
+  );
+
+  for (const frame of frames) {
+    const html = await frame.content().catch(() => '');
+    if (html.length > 100) {
+      console.log(`Frame ${frame.url()}:`, html.substring(0, 500));
+    }
+  }
+}
+
 async function getHorarioWithCache() {
   const cached = readHorarioCache();
 
@@ -1272,6 +1415,10 @@ async function getHorarioWithCache() {
 }
 
 function registerHorarioHandlers() {
+  if (!ipcMain?.handle) {
+    return;
+  }
+
   ipcMain.handle('horario:run', async () => getHorarioWithCache());
   ipcMain.handle('horario:clear-cache', async () => clearHorarioCache());
   ipcMain.handle('horario:save-link', async (_event, payload = {}) =>
@@ -1287,5 +1434,6 @@ module.exports = {
   registerHorarioHandlers,
   saveManualLink,
   scrapeHorario,
+  diagnosticarCIA,
   writeHorarioCache,
 };
```

## Pendiente para Claude
- Estructura de frames CIA detectada en navegación real:
  - Frame principal (`name: ""`) para shell PeopleSoft.
  - `UniversalHeader` (header superior).
  - `NAV` (árbol de navegación lateral).
  - `TargetContent` (contenido funcional: Home, Mi Horario, SSR_SSENRL_LIST).
- Selectores que sí funcionaron en scraping real:
  - Entrada de horario: `TargetContent -> a:has-text("Mi Horario de Clases")`.
  - Frame de horario: `frame.name() === "TargetContent"` y URL con `SSR_SSENRL_LIST`.
  - Extracción de materias: `table[id^="CLASS_MTG_VW$scroll$"]`.
  - Vista listado/semanal: `#DERIVED_REGFRM1_SSR_SCHED_FORMAT`, `[id="DERIVED_REGFRM1_SSR_SCHED_FORMAT$11$"]`, `#DERIVED_REGFRM1_SSR_PB_GO`.
- Verificación final devolvió: **8 materias reales**.
- Output exacto del comando de verificación:
  - Comando:
    - `node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => console.log('Materias:', r.materias?.length, JSON.stringify(r.materias?.map(m => m.nombre), null, 2)))"`
  - Salida:
    - `Materias: 8 [`
    - `  "Tecnologia y Empresa",`
    - `  "Sist Operativos y Arq de Comp",`
    - `  "Programacion II c/Lab",`
    - `  "Programacion II c/Lab",`
    - `  "Ingles Universitario A1",`
    - `  "Precálculo",`
    - `  "Matematicas Discretas",`
    - `  "Tutoria 2 (INSOF)"`
    - `]`
