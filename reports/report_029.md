# Report 029
**Fecha:** 2026-05-22 00:54  
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
index 3de1737..84580e9 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -53,6 +53,9 @@ const MEET_PATTERNS = [
   /teams\.microsoft\.com\/l\/meetup-join/i,
   /meet\.google\.com/i,
 ];
+const VIDEO_LINK_PATTERN = /meet\.google\.com|zoom\.us\/j\/|teams\.microsoft\.com\/l\/meetup/i;
+const VIDEO_RESOURCE_KEYWORD_PATTERN =
+  /meet|zoom|teams|videollamada|video.?llamada|enlace|liga.?remoto|remote|clase.?en.?l[ií]nea/i;
 
 function normalizeWhitespace(value) {
   return (value || '')
@@ -79,8 +82,14 @@ function isTimeoutError(error) {
 }
 
 function isNetworkError(error) {
+  const message = error?.message || '';
+
+  if (/ERR_ABORTED/i.test(message)) {
+    return false;
+  }
+
   return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
-    error?.message || '',
+    message,
   );
 }
 
@@ -904,7 +913,12 @@ function combineScheduleRows(rows, identifiers) {
   const identifierIndex = new Map();
 
   identifiers.forEach((item) => {
-    const keyCandidates = [item.numeroClase, item.codigo, item.nombre]
+    const keyCandidates = [
+      item.numeroClase,
+      item.codigo,
+      item.nombre,
+      item.codigo && item.seccion ? `${item.codigo}-${item.seccion}` : '',
+    ]
       .map((value) => normalizeForCompare(value))
       .filter(Boolean);
 
@@ -918,7 +932,12 @@ function combineScheduleRows(rows, identifiers) {
   const merged = new Map();
 
   rows.forEach((row) => {
-    const rowKeys = [row.numeroClase, row.codigo, row.nombre]
+    const rowKeys = [
+      row.numeroClase,
+      row.codigo,
+      row.nombre,
+      row.codigo && row.seccion ? `${row.codigo}-${row.seccion}` : '',
+    ]
       .map((value) => normalizeForCompare(value))
       .filter(Boolean);
 
@@ -940,7 +959,9 @@ function combineScheduleRows(rows, identifiers) {
       horaInicio: row.horaInicio || null,
       horaFin: row.horaFin || null,
       modalidad: row.modalidad || inferModalidad(row.rawText || ''),
-      ubicacion: row.ubicacion || (row.modalidad === 'en_linea' ? 'Remoto' : ''),
+      ubicacion:
+        row.ubicacion ||
+        ((row.modalidad || inferModalidad(row.rawText || '')) === 'en_linea' ? 'Remoto' : ''),
       instructor: row.instructor || '',
       meetLink: row.meetLink || null,
       linkManual: false,
@@ -955,13 +976,20 @@ function combineScheduleRows(rows, identifiers) {
 
     const previous = merged.get(key);
     const days = new Set([...(previous.dias || []), ...(base.dias || [])]);
+    const modalidadCombinada =
+      previous.modalidad === 'en_linea' || base.modalidad === 'en_linea'
+        ? 'en_linea'
+        : previous.modalidad || base.modalidad;
     merged.set(key, {
       ...previous,
       ...base,
       dias: DAY_ORDER.filter((day) => days.has(day)),
       instructor: previous.instructor || base.instructor,
-      ubicacion: previous.ubicacion || base.ubicacion,
-      modalidad: previous.modalidad || base.modalidad,
+      ubicacion:
+        modalidadCombinada === 'en_linea'
+          ? previous.ubicacion || base.ubicacion || 'Remoto'
+          : previous.ubicacion || base.ubicacion,
+      modalidad: modalidadCombinada,
       meetLink: previous.meetLink || base.meetLink || null,
     });
   });
@@ -985,42 +1013,99 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
   const rawRows = await scheduleFrame
     .evaluate(() => {
       const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
-      const tables = Array.from(document.querySelectorAll('table'));
-      const candidate = tables.find((table) => /WEEKLY|SCHEDULE|SS_SCHED_TABLE/i.test(table.id));
 
-      if (!candidate) {
+      const table =
+        document.getElementById('STDNT_CLASS_TIM$scroll$0') ||
+        document.querySelector('table[id*="STDNT_CLASS_TIM"]') ||
+        document.querySelector('table.datadisplaytable') ||
+        document.querySelector('table[summary*="horario" i]') ||
+        document.querySelector('table');
+
+      if (!table) {
         return [];
       }
 
-      const headerCells = Array.from(
-        candidate.querySelectorAll('thead th, tr:first-child th, tr:first-child td'),
-      ).map((cell) => normalize(cell.textContent || ''));
+      const rows = Array.from(table.querySelectorAll('tr'));
+      const matrix = [];
+
+      rows.forEach((row, rowIndex) => {
+        if (!matrix[rowIndex]) {
+          matrix[rowIndex] = [];
+        }
+
+        let colIndex = 0;
+        Array.from(row.querySelectorAll('td, th')).forEach((cell) => {
+          while (matrix[rowIndex][colIndex]) {
+            colIndex += 1;
+          }
+
+          const rowspan = Math.max(Number.parseInt(cell.getAttribute('rowspan') || '1', 10), 1);
+          const colspan = Math.max(Number.parseInt(cell.getAttribute('colspan') || '1', 10), 1);
+          const content = normalize(cell.textContent || '');
+
+          for (let r = 0; r < rowspan; r += 1) {
+            if (!matrix[rowIndex + r]) {
+              matrix[rowIndex + r] = [];
+            }
+
+            for (let c = 0; c < colspan; c += 1) {
+              matrix[rowIndex + r][colIndex + c] = {
+                content,
+                isOrigin: r === 0 && c === 0,
+              };
+            }
+          }
+
+          colIndex += colspan;
+        });
+      });
+
+      const headerRowIndex = matrix.findIndex((row) =>
+        row?.some((cell) => normalize(cell?.content || '').toLowerCase() === 'hora'),
+      );
 
-      const rows = Array.from(candidate.querySelectorAll('tr'));
+      if (headerRowIndex < 0 || !matrix[headerRowIndex]) {
+        return [];
+      }
+
+      const headerRow = matrix[headerRowIndex];
+      const dayHeaders = headerRow.slice(1).map((cell) => normalize(cell?.content || ''));
       const output = [];
 
-      rows.forEach((row) => {
-        const cells = Array.from(row.querySelectorAll('th, td'));
-        if (cells.length <= 1) {
-          return;
+      for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
+        const row = matrix[rowIndex];
+        if (!row || row.length < 2) {
+          continue;
+        }
+
+        const timeLabel = normalize(row[0]?.content || '');
+        if (!timeLabel || !/\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(timeLabel)) {
+          continue;
         }
 
-        const timeLabel = normalize(cells[0]?.textContent || '');
+        for (let colIndex = 1; colIndex < row.length && colIndex <= dayHeaders.length; colIndex += 1) {
+          const dayHeader = dayHeaders[colIndex - 1];
+          const cell = row[colIndex];
+          const cellText = normalize(cell?.content || '');
 
-        for (let index = 1; index < cells.length; index += 1) {
-          const cellText = normalize(cells[index]?.textContent || '');
+          if (!dayHeader || !cellText || /^-+$/.test(cellText)) {
+            continue;
+          }
 
-          if (!cellText || /^-+$/.test(cellText)) {
+          if (!/\b\d{4}[A-Z]\b/i.test(cellText) && !/[A-Z]\s*\d{4}[A-Z]\s*-\s*\d{2,4}/i.test(cellText)) {
             continue;
           }
 
           output.push({
-            dayHeader: headerCells[index] || '',
+            dayHeader,
             timeLabel,
             rawText: cellText,
+            isOrigin: Boolean(cell?.isOrigin),
+            rowIndex,
+            colIndex,
           });
         }
-      });
+      }
 
       return output;
     })
@@ -1032,20 +1117,32 @@ async function collectWeeklySchedule(scheduleFrame, identifiers) {
 
   const parsedRows = rawRows.map((item) => {
     const combinedText = `${item.dayHeader} ${item.rawText}`;
-    const range = parseTimeRange(item.timeLabel || item.rawText);
+    const rawTextNormalized = normalizeWhitespace(item.rawText).replace(
+      /(\d{3,4})(\d{1,2}:\d{2}\s*(?:AM|PM))/gi,
+      '$1 $2',
+    );
+    const range = parseTimeRange(`${rawTextNormalized} ${item.timeLabel}`);
+    const sectionMatch = normalizeWhitespace(item.rawText).match(/-\s*(\d{2,4})(?=[A-Za-z]|\s|$)/i);
+    const modalValue = inferModalidad(item.rawText);
+    const parsedDays = extractDayTokens(item.dayHeader);
 
     return {
       codigo: extractCode(item.rawText),
       nombre: '',
-      dias: parsePeopleSoftDays(combinedText),
+      dias: parsedDays.length > 0 ? parsedDays : parsePeopleSoftDays(item.dayHeader || combinedText),
       horaInicio: range.horaInicio,
       horaFin: range.horaFin,
-      modalidad: inferModalidad(item.rawText),
-      ubicacion: inferModalidad(item.rawText) === 'en_linea' ? 'Remoto' : '',
+      modalidad: modalValue,
+      ubicacion:
+        modalValue === 'en_linea'
+          ? 'Remoto'
+          : normalizeWhitespace(
+              item.rawText.match(/(?:aulas?|edificio|room|lm\d{3,4}|am\d{3,4})[^ ]*/i)?.[0] || '',
+            ),
       instructor: '',
-      seccion: extractSection(item.rawText),
-      numeroClase: extractClassNumber(item.rawText),
-      rawText: item.rawText,
+      seccion: normalizeWhitespace(sectionMatch?.[1] || ''),
+      numeroClase: '',
+      rawText: rawTextNormalized,
     };
   });
 
@@ -1084,11 +1181,7 @@ async function loginToIVirtual(context, user, password) {
     page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {}),
     page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
   ]);
-
-  if (page.url().includes('/login/')) {
-    await page.close().catch(() => {});
-    return { success: false, error: 'No fue posible iniciar sesión en iVirtual para buscar enlaces.' };
-  }
+  await page.waitForTimeout(1200);
 
   await applyResourceBlocking(page);
   await gotoWithRetry(page, IVIRTUAL_DASHBOARD_URL, {
@@ -1096,6 +1189,11 @@ async function loginToIVirtual(context, user, password) {
     waitUntil: 'domcontentloaded',
   });
 
+  if (page.url().includes('/login/')) {
+    await page.close().catch(() => {});
+    return { success: false, error: 'No fue posible iniciar sesión en iVirtual para buscar enlaces.' };
+  }
+
   return { success: true, page };
 }
 
@@ -1110,29 +1208,63 @@ function findMeetLinkInUrls(urls) {
   return null;
 }
 
-function areNamesRelated(left, right) {
-  const normalizedLeft = normalizeForCompare(left)
-    .replace(/[^a-z0-9 ]/g, ' ')
-    .replace(/\s+/g, ' ')
-    .trim();
-  const normalizedRight = normalizeForCompare(right)
+function normalizeCourseNameForMatch(value) {
+  return normalizeForCompare(value)
+    .replace(/sistemas?/g, 'sist')
+    .replace(/operativos?/g, 'oper')
+    .replace(/oper\./g, 'oper')
+    .replace(/arquit(?:ectura|\.?)/g, 'arq')
+    .replace(/computadoras?/g, 'comp')
+    .replace(/comp(?:utacion|utadora|\.?)/g, 'comp')
+    .replace(/tecnologia/g, 'tec')
+    .replace(/empresa/g, 'emp')
+    .replace(/matematicas?/g, 'mat')
+    .replace(/discretas?/g, 'disc')
     .replace(/[^a-z0-9 ]/g, ' ')
     .replace(/\s+/g, ' ')
     .trim();
+}
+
+function scoreCourseNameMatch(left, right) {
+  const normalizedLeft = normalizeCourseNameForMatch(left);
+  const normalizedRight = normalizeCourseNameForMatch(right);
 
   if (!normalizedLeft || !normalizedRight) {
-    return false;
+    return 0;
   }
 
   if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
-    return true;
+    return 1;
+  }
+
+  const leftTokens = normalizedLeft.split(' ').filter((token) => token.length >= 3);
+  const rightTokens = normalizedRight.split(' ').filter((token) => token.length >= 3);
+
+  if (!leftTokens.length || !rightTokens.length) {
+    return 0;
+  }
+
+  const rightTokenSet = new Set(rightTokens);
+  const overlap = leftTokens.filter((token) => rightTokenSet.has(token));
+
+  if (!overlap.length) {
+    return 0;
   }
 
-  const leftTokens = normalizedLeft.split(' ').filter((token) => token.length >= 4);
-  const rightTokens = new Set(normalizedRight.split(' ').filter((token) => token.length >= 4));
+  const coverage = overlap.length / Math.max(leftTokens.length, rightTokens.length);
+  const normalizedDistanceBonus =
+    overlap.length / Math.min(leftTokens.length, rightTokens.length);
 
-  const overlap = leftTokens.filter((token) => rightTokens.has(token));
-  return overlap.length >= Math.max(1, Math.min(2, leftTokens.length));
+  return Math.max(coverage, normalizedDistanceBonus * 0.75);
+}
+
+function areNamesRelated(left, right) {
+  const score = scoreCourseNameMatch(left, right);
+  if (score >= 0.3) {
+    return true;
+  }
+
+  return false;
 }
 
 async function collectCourseLinks(dashboardPage) {
@@ -1162,34 +1294,175 @@ async function collectCourseLinks(dashboardPage) {
     .catch(() => []);
 }
 
-async function findLinkForOnlineCourse(context, dashboardPage, materia) {
-  const courses = await collectCourseLinks(dashboardPage);
-  const match = courses.find((course) => areNamesRelated(course.name, materia.nombre || materia.codigo));
+function pickBestCourseMatch(courses, materia) {
+  const query = materia.nombre || materia.codigo || '';
+  const scored = courses
+    .map((course) => ({
+      ...course,
+      score: scoreCourseNameMatch(course.name, query),
+    }))
+    .sort((left, right) => right.score - left.score);
 
-  if (!match) {
+  return scored[0]?.score >= 0.3 ? scored[0] : null;
+}
+
+function normalizeCandidateUrl(value) {
+  const normalized = normalizeWhitespace(value);
+
+  if (!normalized) {
     return null;
   }
 
-  const page = await context.newPage();
-  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
-  await applyResourceBlocking(page);
+  if (/^https?:\/\//i.test(normalized)) {
+    return normalized;
+  }
 
+  if (/^(meet\.google\.com|zoom\.us|teams\.microsoft\.com)\//i.test(normalized)) {
+    return `https://${normalized}`;
+  }
+
+  return null;
+}
+
+function pickFirstVideoLink(candidates) {
+  const normalized = (Array.isArray(candidates) ? candidates : [])
+    .map((candidate) => normalizeCandidateUrl(candidate))
+    .filter(Boolean);
+
+  return findMeetLinkInUrls([...new Set(normalized)]);
+}
+
+async function findMeetLinkInCourse(page, courseUrl) {
   try {
-    await gotoWithRetry(page, match.url, {
-      timeout: PAGE_TIMEOUT_MS,
+    await gotoWithRetry(page, courseUrl, {
       waitUntil: 'domcontentloaded',
+      timeout: PAGE_TIMEOUT_MS,
     });
 
-    const links = await page
-      .locator('a[href]')
-      .evaluateAll((anchors) =>
-        anchors
+    const directLinks = await page
+      .evaluate(() => {
+        const unique = (values) => [...new Set(values.filter(Boolean))];
+        const hrefs = Array.from(document.querySelectorAll('a[href]'))
           .map((anchor) => anchor.href)
-          .filter((href) => typeof href === 'string' && href.startsWith('http')),
+          .filter((href) =>
+            /meet\.google\.com/i.test(href) ||
+            /zoom\.us\/j\//i.test(href) ||
+            /teams\.microsoft\.com\/l\/meetup/i.test(href),
+          );
+
+        const bodyText = document.body?.innerText || '';
+        const meetMatches = [...bodyText.matchAll(/https?:\/\/meet\.google\.com\/[a-z0-9][a-z0-9\-]{2,}/gi)].map(
+          (match) => match[0],
+        );
+        const zoomMatches = [...bodyText.matchAll(/https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9?&=_-]+/gi)].map(
+          (match) => match[0],
+        );
+        const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
+          (match) => match[0],
+        );
+
+        return unique([...hrefs, ...meetMatches, ...zoomMatches, ...teamsMatches]);
+      })
+      .catch(() => []);
+
+    const directMatch = pickFirstVideoLink(directLinks);
+    if (directMatch) {
+      return directMatch;
+    }
+
+    const urlResources = await page
+      .evaluate(() =>
+        Array.from(document.querySelectorAll('a[href*="/mod/url/view.php"]'))
+          .filter((anchor) =>
+            /meet|zoom|teams|videollamada|video.?llamada|enlace|liga.?remoto|remote|clase.?en.?l[ií]nea/i.test(
+              `${anchor.textContent || ''} ${anchor.title || ''}`,
+            ),
+          )
+          .map((anchor) => anchor.href),
       )
       .catch(() => []);
 
-    return findMeetLinkInUrls(links);
+    for (const resourceUrl of urlResources.slice(0, 3)) {
+      try {
+        await gotoWithRetry(page, resourceUrl, {
+          waitUntil: 'domcontentloaded',
+          timeout: 15_000,
+        });
+
+        const resourceCandidates = await page
+          .evaluate(() => {
+            const unique = (values) => [...new Set(values.filter(Boolean))];
+            const hrefCandidates = Array.from(document.querySelectorAll('a[href]'))
+              .map((anchor) => anchor.href)
+              .filter((href) =>
+                /meet\.google\.com/i.test(href) ||
+                /zoom\.us\/j\//i.test(href) ||
+                /teams\.microsoft\.com/i.test(href),
+              );
+
+            const bodyText = document.body?.innerText || '';
+            const meetMatches = [...bodyText.matchAll(/https?:\/\/meet\.google\.com\/[a-z0-9][a-z0-9\-]{2,}/gi)].map(
+              (match) => match[0],
+            );
+            const zoomMatches = [...bodyText.matchAll(/https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9?&=_-]+/gi)].map(
+              (match) => match[0],
+            );
+            const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
+              (match) => match[0],
+            );
+            const dataUrlValues = Array.from(document.querySelectorAll('[data-url]')).map((node) =>
+              node.getAttribute('data-url'),
+            );
+            const metaRefresh = Array.from(
+              document.querySelectorAll('meta[http-equiv="refresh"], meta[http-equiv="REFRESH"]'),
+            )
+              .map((meta) => meta.getAttribute('content') || '')
+              .map((content) => {
+                const match = content.match(/url=(.+)$/i);
+                return match ? match[1].trim() : '';
+              });
+
+            return unique([
+              ...hrefCandidates,
+              ...meetMatches,
+              ...zoomMatches,
+              ...teamsMatches,
+              ...dataUrlValues,
+              ...metaRefresh,
+              window.location.href,
+            ]);
+          })
+          .catch(() => []);
+
+        const resourceMatch = pickFirstVideoLink(resourceCandidates);
+        if (resourceMatch) {
+          return resourceMatch;
+        }
+      } catch (_error) {
+        // Continue with next resource.
+      }
+    }
+
+    return null;
+  } catch (_error) {
+    return null;
+  }
+}
+
+async function findLinkForOnlineCourse(context, dashboardPage, materia, cachedCourses = null) {
+  const courses = Array.isArray(cachedCourses) ? cachedCourses : await collectCourseLinks(dashboardPage);
+  const match = pickBestCourseMatch(courses, materia);
+
+  if (!match) {
+    return null;
+  }
+
+  const page = await context.newPage();
+  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
+  await applyResourceBlocking(page);
+
+  try {
+    return await findMeetLinkInCourse(page, match.url);
   } finally {
     await page.close().catch(() => {});
   }
@@ -1240,6 +1513,10 @@ async function enrichMeetLinks(materias, ivirtualUser, ivirtualPass) {
     }
 
     const dashboardPage = loginResult.page;
+    await dashboardPage
+      .waitForSelector('a[href*="/course/view.php?id="]', { timeout: 15_000 })
+      .catch(() => {});
+    const courses = await collectCourseLinks(dashboardPage);
     const nextMaterias = [...materias];
 
     const chunks = chunkArray(onlineIndexes, CHUNK_SIZE);
@@ -1250,7 +1527,7 @@ async function enrichMeetLinks(materias, ivirtualUser, ivirtualPass) {
           withTimeout(
             async () => ({
               index,
-              meetLink: await findLinkForOnlineCourse(context, dashboardPage, materia),
+              meetLink: await findLinkForOnlineCourse(context, dashboardPage, materia, courses),
             }),
             LINK_TIMEOUT_MS,
           ),
```

## Pendiente para Claude
- Output exacto del comando de verificación:
  - Comando:
    - `node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { console.log('Total materias:', r.materias?.length); r.materias?.forEach(m => console.log(m.nombre.padEnd(40), m.modalidad.padEnd(12), m.meetLink ? '✅ ' + m.meetLink : '❌ sin link')); })"`
  - Salida:
    - `Total materias: 7`
    - `Ingles Universitario A1                  presencial   ❌ sin link`
    - `Precálculo                               presencial   ❌ sin link`
    - `Sist Operativos y Arq de Comp            en_linea     ✅ https://meet.google.com/yiv-xspu-fpn`
    - `Tutoria 2 (INSOF)                        presencial   ❌ sin link`
    - `Programacion II c/Lab                    presencial   ❌ sin link`
    - `Matematicas Discretas                    en_linea     ✅ https://meet.google.com/guq-ocgc-bsi`
    - `Tecnologia y Empresa                     en_linea     ✅ https://meet.google.com/tpt-ofxq-nus`
- Forma de link detectada por materia en línea:
  - `Tecnologia y Empresa` → **Forma B** (`mod/url` “Link Videollamada Google Meet”, con extracción en página intermedia).
  - `Sist Operativos y Arq de Comp` → **Forma A** (link de Meet directo en HTML/texto del curso).
  - `Matematicas Discretas` → **Forma A** (directo) y también disponible por **Forma B** (`mod/url`).
- Integridad del horario semanal:
  - Se parseó con matriz expandida (`rowspan/colspan`) en `STDNT_CLASS_TIM$scroll$0`.
  - Se confirmaron todas las materias del semestre en el resultado final (`>= 7`), y `Sist Operativos y Arq de Comp` quedó con días `Martes`, `Miércoles`, `Jueves` (incluye `Martes` y `Jueves`).
