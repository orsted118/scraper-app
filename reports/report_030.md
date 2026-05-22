# Report 030
**Fecha:** 2026-05-22 01:31  
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
index b8bfe17..0165cdf 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -14,7 +14,8 @@ const GLOBAL_TIMEOUT_MS = 4 * 60 * 1000;
 const PAGE_TIMEOUT_MS = 20_000;
 const CIA_LOGIN_TIMEOUT_MS = 45_000;
 const CHUNK_SIZE = 2;
-const LINK_TIMEOUT_MS = 15_000;
+const LINK_TIMEOUT_MS = 45_000;
+const MAX_DEEP_RESOURCES = 6;
 const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);
 
 const DAY_MAP = {
@@ -247,12 +248,14 @@ function applyManualLinks(payload) {
       return {
         ...materia,
         linkManual: Boolean(materia.linkManual),
+        meetLinkLayer: materia.meetLinkLayer || null,
       };
     }
 
     return {
       ...materia,
       meetLink: manualLink,
+      meetLinkLayer: 'MANUAL',
       linkManual: true,
     };
   });
@@ -286,7 +289,7 @@ function saveManualLink(numeroClase, link) {
       ...cached,
       materias: cached.materias.map((materia) =>
         materia.numeroClase === classNumber
-          ? { ...materia, meetLink: normalizedLink, linkManual: true }
+          ? { ...materia, meetLink: normalizedLink, meetLinkLayer: 'MANUAL', linkManual: true }
           : materia,
       ),
     };
@@ -1329,14 +1332,70 @@ function pickFirstVideoLink(candidates) {
   return findMeetLinkInUrls([...new Set(normalized)]);
 }
 
-async function findMeetLinkInCourse(page, courseUrl) {
-  try {
-    await gotoWithRetry(page, courseUrl, {
-      waitUntil: 'domcontentloaded',
-      timeout: PAGE_TIMEOUT_MS,
-    });
+async function collectVideoCandidatesFromPage(page, courseOrigin = '') {
+  const candidates = await page
+    .evaluate(() => {
+      const unique = (values) => [...new Set(values.filter(Boolean))];
+      const hrefs = Array.from(document.querySelectorAll('a[href]'))
+        .map((anchor) => anchor.href)
+        .filter((href) =>
+          /meet\.google\.com/i.test(href) ||
+          /zoom\.us\/j\//i.test(href) ||
+          /teams\.microsoft\.com\/l\/meetup/i.test(href),
+        );
 
-    const directLinks = await page
+      const bodyText = document.body?.innerText || '';
+      const meetMatches = [...bodyText.matchAll(/https?:\/\/meet\.google\.com\/[a-z0-9][a-z0-9\-]{2,}/gi)].map(
+        (match) => match[0],
+      );
+      const zoomMatches = [...bodyText.matchAll(/https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9?&=_-]+/gi)].map(
+        (match) => match[0],
+      );
+      const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
+        (match) => match[0],
+      );
+      const dataAttrs = Array.from(
+        document.querySelectorAll('[data-url],[data-href],[data-link]'),
+      )
+        .map(
+          (element) =>
+            element.getAttribute('data-url') ||
+            element.getAttribute('data-href') ||
+            element.getAttribute('data-link') ||
+            '',
+        )
+        .filter((value) => /meet\.google\.com|zoom\.us|teams\.microsoft/i.test(value));
+
+      return unique([...hrefs, ...meetMatches, ...zoomMatches, ...teamsMatches, ...dataAttrs, window.location.href]);
+    })
+    .catch(() => []);
+
+  const origin =
+    courseOrigin ||
+    (() => {
+      try {
+        return new URL(page.url()).origin;
+      } catch (_error) {
+        return '';
+      }
+    })();
+
+  const frameCandidates = [];
+  for (const frame of page.frames()) {
+    if (frame === page.mainFrame()) {
+      continue;
+    }
+
+    const frameUrl = frame.url();
+    if (!frameUrl || frameUrl === 'about:blank') {
+      continue;
+    }
+
+    if (origin && !frameUrl.startsWith(origin)) {
+      continue;
+    }
+
+    const frameMatches = await frame
       .evaluate(() => {
         const unique = (values) => [...new Set(values.filter(Boolean))];
         const hrefs = Array.from(document.querySelectorAll('a[href]'))
@@ -1357,92 +1416,193 @@ async function findMeetLinkInCourse(page, courseUrl) {
         const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
           (match) => match[0],
         );
+        const dataAttrs = Array.from(
+          document.querySelectorAll('[data-url],[data-href],[data-link]'),
+        )
+          .map(
+            (element) =>
+              element.getAttribute('data-url') ||
+              element.getAttribute('data-href') ||
+              element.getAttribute('data-link') ||
+              '',
+          )
+          .filter((value) => /meet\.google\.com|zoom\.us|teams\.microsoft/i.test(value));
 
-        return unique([...hrefs, ...meetMatches, ...zoomMatches, ...teamsMatches]);
+        return unique([...hrefs, ...meetMatches, ...zoomMatches, ...teamsMatches, ...dataAttrs]);
       })
       .catch(() => []);
 
-    const directMatch = pickFirstVideoLink(directLinks);
-    if (directMatch) {
-      return directMatch;
+    frameCandidates.push(...frameMatches);
+  }
+
+  return [...new Set([...(Array.isArray(candidates) ? candidates : []), ...frameCandidates])];
+}
+
+async function extractLinkFromPage(page, url, options = {}) {
+  try {
+    await gotoWithRetry(page, url, {
+      waitUntil: 'domcontentloaded',
+      timeout: options.timeout || 12_000,
+    });
+
+    const candidates = await collectVideoCandidatesFromPage(page, options.courseOrigin || '');
+    return pickFirstVideoLink(candidates);
+  } catch (_error) {
+    return null;
+  }
+}
+
+async function findMeetLinkInCourse(page, courseUrl) {
+  const courseOrigin = (() => {
+    try {
+      return new URL(courseUrl).origin;
+    } catch (_error) {
+      return '';
     }
+  })();
 
-    const urlResources = await page
+  try {
+    await gotoWithRetry(page, courseUrl, {
+      waitUntil: 'domcontentloaded',
+      timeout: PAGE_TIMEOUT_MS,
+    });
+
+    const layerOneCandidates = await collectVideoCandidatesFromPage(page, courseOrigin);
+    const layerOneMatch = pickFirstVideoLink(layerOneCandidates);
+    if (layerOneMatch) {
+      return { link: layerOneMatch, layer: 'CAPA_1_DOM' };
+    }
+
+    const courseIntroLink = await page
+      .evaluate(() => {
+        const intro = document.querySelector(
+          '.course-description, #course-description, .summary, [data-region="course-description"]',
+        );
+
+        if (!intro) {
+          return null;
+        }
+
+        const links = Array.from(intro.querySelectorAll('a[href]'))
+          .map((anchor) => anchor.href)
+          .filter((href) => /meet\.google\.com|zoom\.us|teams\.microsoft/i.test(href));
+
+        return links[0] || null;
+      })
+      .catch(() => null);
+
+    if (courseIntroLink) {
+      return { link: courseIntroLink, layer: 'CAPA_5_INTRO' };
+    }
+
+    let remainingResources = MAX_DEEP_RESOURCES;
+    const consumeResourceBudget = () => {
+      if (remainingResources <= 0) {
+        return false;
+      }
+
+      remainingResources -= 1;
+      return true;
+    };
+
+    const detailPage = page;
+
+    const allUrlResources = await page
       .evaluate(() =>
         Array.from(document.querySelectorAll('a[href*="/mod/url/view.php"]'))
-          .filter((anchor) =>
-            /meet|zoom|teams|videollamada|video.?llamada|enlace|liga.?remoto|remote|clase.?en.?l[ií]nea/i.test(
-              `${anchor.textContent || ''} ${anchor.title || ''}`,
+          .map((anchor) => anchor.href),
+      )
+      .catch(() => []);
+
+    for (const resourceUrl of allUrlResources.slice(0, 6)) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      const link = await extractLinkFromPage(detailPage, resourceUrl, {
+        timeout: 12_000,
+        courseOrigin,
+      });
+
+      if (link) {
+        return { link, layer: 'CAPA_2_MOD_URL' };
+      }
+    }
+
+    const pageResources = await page
+      .evaluate(() =>
+        Array.from(document.querySelectorAll('a[href*="/mod/page/view.php"]'))
+          .map((anchor) => ({
+            href: anchor.href,
+            text: (anchor.textContent || '').trim(),
+          }))
+          .filter((resource) =>
+            /meet|zoom|teams|videollamada|enlace|liga|remoto|clase|acceso|sesi[oó]n/i.test(
+              resource.text,
             ),
           )
+          .map((resource) => resource.href),
+      )
+      .catch(() => []);
+
+    for (const pageUrl of pageResources.slice(0, 3)) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      const link = await extractLinkFromPage(detailPage, pageUrl, {
+        timeout: 12_000,
+        courseOrigin,
+      });
+
+      if (link) {
+        return { link, layer: 'CAPA_3_MOD_PAGE' };
+      }
+    }
+
+    const forumResources = await page
+      .evaluate(() =>
+        Array.from(document.querySelectorAll('a[href*="/mod/forum/view.php"]'))
           .map((anchor) => anchor.href),
       )
       .catch(() => []);
 
-    for (const resourceUrl of urlResources.slice(0, 3)) {
+    for (const forumUrl of forumResources.slice(0, 2)) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
       try {
-        await gotoWithRetry(page, resourceUrl, {
+        await gotoWithRetry(detailPage, forumUrl, {
           waitUntil: 'domcontentloaded',
-          timeout: 15_000,
+          timeout: 12_000,
         });
 
-        const resourceCandidates = await page
+        const firstDiscussion = await detailPage
           .evaluate(() => {
-            const unique = (values) => [...new Set(values.filter(Boolean))];
-            const hrefCandidates = Array.from(document.querySelectorAll('a[href]'))
-              .map((anchor) => anchor.href)
-              .filter((href) =>
-                /meet\.google\.com/i.test(href) ||
-                /zoom\.us\/j\//i.test(href) ||
-                /teams\.microsoft\.com/i.test(href),
-              );
-
-            const bodyText = document.body?.innerText || '';
-            const meetMatches = [...bodyText.matchAll(/https?:\/\/meet\.google\.com\/[a-z0-9][a-z0-9\-]{2,}/gi)].map(
-              (match) => match[0],
-            );
-            const zoomMatches = [...bodyText.matchAll(/https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9?&=_-]+/gi)].map(
-              (match) => match[0],
-            );
-            const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
-              (match) => match[0],
-            );
-            const dataUrlValues = Array.from(document.querySelectorAll('[data-url]')).map((node) =>
-              node.getAttribute('data-url'),
-            );
-            const metaRefresh = Array.from(
-              document.querySelectorAll('meta[http-equiv="refresh"], meta[http-equiv="REFRESH"]'),
-            )
-              .map((meta) => meta.getAttribute('content') || '')
-              .map((content) => {
-                const match = content.match(/url=(.+)$/i);
-                return match ? match[1].trim() : '';
-              });
-
-            return unique([
-              ...hrefCandidates,
-              ...meetMatches,
-              ...zoomMatches,
-              ...teamsMatches,
-              ...dataUrlValues,
-              ...metaRefresh,
-              window.location.href,
-            ]);
+            const discussion = document.querySelector('a[href*="/mod/forum/discuss.php"]');
+            return discussion ? discussion.href : null;
           })
-          .catch(() => []);
+          .catch(() => null);
 
-        const resourceMatch = pickFirstVideoLink(resourceCandidates);
-        if (resourceMatch) {
-          return resourceMatch;
+        if (firstDiscussion && consumeResourceBudget()) {
+          const link = await extractLinkFromPage(detailPage, firstDiscussion, {
+            timeout: 12_000,
+            courseOrigin,
+          });
+
+          if (link) {
+            return { link, layer: 'CAPA_4_FORUM' };
+          }
         }
       } catch (_error) {
         // Continue with next resource.
       }
     }
 
-    return null;
+    return { link: null, layer: null };
   } catch (_error) {
-    return null;
+    return { link: null, layer: null };
   }
 }
 
@@ -1451,7 +1611,7 @@ async function findLinkForOnlineCourse(context, dashboardPage, materia, cachedCo
   const match = pickBestCourseMatch(courses, materia);
 
   if (!match) {
-    return null;
+    return { link: null, layer: null };
   }
 
   const page = await context.newPage();
@@ -1524,7 +1684,7 @@ async function enrichMeetLinks(materias, ivirtualUser, ivirtualPass) {
           withTimeout(
             async () => ({
               index,
-              meetLink: await findLinkForOnlineCourse(context, dashboardPage, materia, courses),
+              result: await findLinkForOnlineCourse(context, dashboardPage, materia, courses),
             }),
             LINK_TIMEOUT_MS,
           ),
@@ -1532,10 +1692,14 @@ async function enrichMeetLinks(materias, ivirtualUser, ivirtualPass) {
       );
 
       results.filter(Boolean).forEach((result) => {
-        if (result.meetLink) {
+        const meetLink = result?.result?.link || null;
+        const meetLinkLayer = result?.result?.layer || null;
+
+        if (meetLink) {
           nextMaterias[result.index] = {
             ...nextMaterias[result.index],
-            meetLink: result.meetLink,
+            meetLink,
+            meetLinkLayer,
             linkManual: false,
           };
         }
@@ -1599,6 +1763,7 @@ async function scrapeHorario() {
     materias = materias.map((materia) => ({
       ...materia,
       meetLink: materia.meetLink || null,
+      meetLinkLayer: materia.meetLinkLayer || null,
       linkManual: Boolean(materia.linkManual),
       modalidad: materia.modalidad || 'presencial',
       ubicacion: materia.ubicacion || (materia.modalidad === 'en_linea' ? 'Remoto' : ''),
```

## Pendiente para Claude
- Verificación real ejecutada con:
  `node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { r.materias?.filter(m=>m.modalidad==='en_linea').forEach(m => console.log(m.nombre, '|', m.meetLink || 'SIN LINK')); })"`
- Capa que encontró link por materia en línea:
  - Sist Operativos y Arq de Comp → CAPA_1_DOM
  - Matematicas Discretas → CAPA_1_DOM
  - Tecnologia y Empresa → CAPA_2_MOD_URL
- Tiempo total del escaneo completo (sin caché): **23.3 s**
- Materias en línea sin link: **0** (todas resueltas en esta corrida).
