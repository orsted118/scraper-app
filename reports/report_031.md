# Report 031
**Fecha:** 2026-05-22 16:32  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `.local-data/horario-cache.json` — archivo creado como parte de la base inicial
- `electron/handlers/horario.js` — archivo actualizado en esta tarea

## Resumen
Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `.local-data/horario-cache.json`
```diff
diff --git a/.local-data/horario-cache.json b/.local-data/horario-cache.json
new file mode 100644
index 0000000..ca6ea16
--- /dev/null
+++ b/.local-data/horario-cache.json
@@ -0,0 +1,145 @@
+{
+  "materias": [
+    {
+      "codigo": "1043D",
+      "nombre": "Ingles Universitario A1",
+      "seccion": "104",
+      "numeroClase": "13157",
+      "dias": [
+        "Lunes",
+        "Martes",
+        "Miércoles",
+        "Jueves",
+        "Viernes"
+      ],
+      "horaInicio": "07:00",
+      "horaFin": "08:00",
+      "modalidad": "presencial",
+      "ubicacion": "Aulas",
+      "instructor": "",
+      "meetLink": null,
+      "linkManual": false,
+      "meetLinkLayer": null
+    },
+    {
+      "codigo": "1165M",
+      "nombre": "Precálculo",
+      "seccion": "102",
+      "numeroClase": "13155",
+      "dias": [
+        "Lunes",
+        "Martes",
+        "Miércoles",
+        "Jueves",
+        "Viernes"
+      ],
+      "horaInicio": "08:00",
+      "horaFin": "09:00",
+      "modalidad": "presencial",
+      "ubicacion": "Aulas",
+      "instructor": "",
+      "meetLink": null,
+      "linkManual": false,
+      "meetLinkLayer": null
+    },
+    {
+      "codigo": "1123C",
+      "nombre": "Sist Operativos y Arq de Comp",
+      "seccion": "105",
+      "numeroClase": "13159",
+      "dias": [
+        "Martes",
+        "Miércoles",
+        "Jueves"
+      ],
+      "horaInicio": "13:00",
+      "horaFin": "14:00",
+      "modalidad": "en_linea",
+      "ubicacion": "Aulas",
+      "instructor": "",
+      "meetLink": "https://meet.google.com/yiv-xspu-fpn",
+      "linkManual": false,
+      "meetLinkLayer": "CAPA_1_DOM"
+    },
+    {
+      "codigo": "1132T",
+      "nombre": "Tutoria 2 (INSOF)",
+      "seccion": "157",
+      "numeroClase": "14023",
+      "dias": [
+        "Lunes"
+      ],
+      "horaInicio": "11:00",
+      "horaFin": "12:00",
+      "modalidad": "presencial",
+      "ubicacion": "LM0710",
+      "instructor": "",
+      "meetLink": null,
+      "linkManual": false,
+      "meetLinkLayer": null
+    },
+    {
+      "codigo": "1124C",
+      "nombre": "Programacion II c/Lab",
+      "seccion": "110",
+      "numeroClase": "13196",
+      "dias": [
+        "Martes",
+        "Jueves"
+      ],
+      "horaInicio": "14:30",
+      "horaFin": "14:00",
+      "modalidad": "presencial",
+      "ubicacion": "LM0712",
+      "instructor": "",
+      "meetLink": null,
+      "linkManual": false,
+      "meetLinkLayer": null
+    },
+    {
+      "codigo": "1178M",
+      "nombre": "Matematicas Discretas",
+      "seccion": "107",
+      "numeroClase": "13179",
+      "dias": [
+        "Lunes",
+        "Miércoles",
+        "Jueves"
+      ],
+      "horaInicio": "16:00",
+      "horaFin": "18:00",
+      "modalidad": "en_linea",
+      "ubicacion": "Remoto",
+      "instructor": "",
+      "meetLink": "https://meet.google.com/guq-ocgc-bsi",
+      "linkManual": false,
+      "meetLinkLayer": "CAPA_1_DOM"
+    },
+    {
+      "codigo": "1115C",
+      "nombre": "Tecnologia y Empresa",
+      "seccion": "113",
+      "numeroClase": "13268",
+      "dias": [
+        "Martes",
+        "Jueves"
+      ],
+      "horaInicio": "17:00",
+      "horaFin": "18:00",
+      "modalidad": "en_linea",
+      "ubicacion": "Remoto",
+      "instructor": "",
+      "meetLink": "https://meet.google.com/tpt-ofxq-nus",
+      "linkManual": false,
+      "meetLinkLayer": "CAPA_2_MOD_URL"
+    }
+  ],
+  "diasConClases": [
+    "Lunes",
+    "Martes",
+    "Miércoles",
+    "Jueves",
+    "Viernes"
+  ],
+  "timestamp": 1779492722539
+}
\ No newline at end of file
```

### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 0165cdf..184ea9b 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -15,7 +15,7 @@ const PAGE_TIMEOUT_MS = 20_000;
 const CIA_LOGIN_TIMEOUT_MS = 45_000;
 const CHUNK_SIZE = 2;
 const LINK_TIMEOUT_MS = 45_000;
-const MAX_DEEP_RESOURCES = 6;
+const MAX_DEEP_RESOURCES = 12;
 const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);
 
 const DAY_MAP = {
@@ -1600,6 +1600,234 @@ async function findMeetLinkInCourse(page, courseUrl) {
       }
     }
 
+    const assignResources = await page
+      .evaluate(() =>
+        Array.from(document.querySelectorAll('a[href*="/mod/assign/view.php"]'))
+          .map((anchor) => ({
+            href: anchor.href,
+            text: (anchor.textContent || '').trim(),
+          }))
+          .filter((resource) =>
+            /remoto|en.?l[ií]nea|sesi[oó]n|clase|meet|zoom|teams|videollamada|acceso|liga/i.test(
+              resource.text,
+            ),
+          )
+          .map((resource) => resource.href)
+          .slice(0, 3),
+      )
+      .catch(() => []);
+
+    for (const assignUrl of assignResources) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      const link = await extractLinkFromPage(detailPage, assignUrl, {
+        timeout: 12_000,
+        courseOrigin,
+      });
+
+      if (link) {
+        return { link, layer: 'CAPA_6_MOD_ASSIGN' };
+      }
+    }
+
+    const forumDiscussions = await page
+      .evaluate(() =>
+        Array.from(document.querySelectorAll('a[href*="/mod/forum/view.php"]'))
+          .map((anchor) => anchor.href)
+          .slice(0, 2),
+      )
+      .catch(() => []);
+
+    for (const forumUrl of forumDiscussions) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      try {
+        await gotoWithRetry(detailPage, forumUrl, {
+          waitUntil: 'domcontentloaded',
+          timeout: 12_000,
+        });
+
+        const discussions = await detailPage
+          .evaluate(() =>
+            Array.from(document.querySelectorAll('a[href*="/mod/forum/discuss.php"]'))
+              .map((anchor) => anchor.href)
+              .slice(0, 3),
+          )
+          .catch(() => []);
+
+        for (const discussionUrl of discussions) {
+          if (!consumeResourceBudget()) {
+            break;
+          }
+
+          const link = await extractLinkFromPage(detailPage, discussionUrl, {
+            timeout: 10_000,
+            courseOrigin,
+          });
+
+          if (link) {
+            return { link, layer: 'CAPA_7_FORUM_THREADS' };
+          }
+        }
+      } catch (_error) {
+        // Continue with next forum.
+      }
+    }
+
+    const bookResources = await page
+      .evaluate(() =>
+        Array.from(document.querySelectorAll('a[href*="/mod/book/view.php"]'))
+          .map((anchor) => ({
+            href: anchor.href,
+            text: (anchor.textContent || '').trim(),
+          }))
+          .filter(
+            (resource) =>
+              /remoto|clase|meet|zoom|teams|enlace|liga|acceso|sesi[oó]n|videollamada/i.test(
+                resource.text,
+              ) || true,
+          )
+          .map((resource) => resource.href)
+          .slice(0, 3),
+      )
+      .catch(() => []);
+
+    for (const bookUrl of bookResources) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      try {
+        await gotoWithRetry(detailPage, bookUrl, {
+          waitUntil: 'domcontentloaded',
+          timeout: 12_000,
+        });
+
+        const linkInBook = await collectVideoCandidatesFromPage(detailPage, courseOrigin);
+        const bookMatch = pickFirstVideoLink(linkInBook);
+        if (bookMatch) {
+          return { link: bookMatch, layer: 'CAPA_8_MOD_BOOK' };
+        }
+
+        const nextChapter = await detailPage
+          .evaluate(() => {
+            const next = document.querySelector(
+              'a[title*="siguiente"], a[title*="Siguiente"], a[accesskey="n"], .navnext a',
+            );
+            return next ? next.href : null;
+          })
+          .catch(() => null);
+
+        if (nextChapter && consumeResourceBudget()) {
+          const link = await extractLinkFromPage(detailPage, nextChapter, {
+            timeout: 10_000,
+            courseOrigin,
+          });
+
+          if (link) {
+            return { link, layer: 'CAPA_8_MOD_BOOK' };
+          }
+        }
+      } catch (_error) {
+        // Continue with next book.
+      }
+    }
+
+    const shortLinks = await page
+      .evaluate(() => {
+        const shortDomains = [
+          'bit.ly',
+          'shorturl.at',
+          'tinyurl.com',
+          'short.gy',
+          'ow.ly',
+          'rb.gy',
+          'cutt.ly',
+          't.co',
+          'goo.gl',
+        ];
+
+        return Array.from(document.querySelectorAll('a[href]'))
+          .map((anchor) => anchor.href)
+          .filter((href) => {
+            try {
+              const domain = new URL(href).hostname.replace('www.', '');
+              return shortDomains.some((shortDomain) => domain === shortDomain || domain.endsWith(`.${shortDomain}`));
+            } catch (_error) {
+              return false;
+            }
+          })
+          .slice(0, 4);
+      })
+      .catch(() => []);
+
+    for (const shortUrl of shortLinks) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      try {
+        await gotoWithRetry(detailPage, shortUrl, {
+          waitUntil: 'domcontentloaded',
+          timeout: 12_000,
+        });
+
+        const finalUrl = detailPage.url();
+        const resolvedMatch = pickFirstVideoLink([finalUrl]);
+        if (resolvedMatch) {
+          return { link: resolvedMatch, layer: 'CAPA_9_SHORT_URL' };
+        }
+
+        const candidates = await collectVideoCandidatesFromPage(detailPage, '');
+        const shortMatch = pickFirstVideoLink(candidates);
+        if (shortMatch) {
+          return { link: shortMatch, layer: 'CAPA_9_SHORT_URL' };
+        }
+      } catch (_error) {
+        // Continue with next short URL.
+      }
+    }
+
+    const quizAndLessons = await page
+      .evaluate(() =>
+        [
+          ...Array.from(document.querySelectorAll('a[href*="/mod/quiz/view.php"]')),
+          ...Array.from(document.querySelectorAll('a[href*="/mod/lesson/view.php"]')),
+          ...Array.from(document.querySelectorAll('a[href*="/mod/scorm/view.php"]')),
+        ]
+          .map((anchor) => ({
+            href: anchor.href,
+            text: (anchor.textContent || '').trim(),
+          }))
+          .filter((resource) =>
+            /remoto|clase|meet|zoom|teams|enlace|liga|acceso|sesi[oó]n|videollamada|en.?l[ií]nea/i.test(
+              resource.text,
+            ),
+          )
+          .map((resource) => resource.href)
+          .slice(0, 3),
+      )
+      .catch(() => []);
+
+    for (const activityUrl of quizAndLessons) {
+      if (!consumeResourceBudget()) {
+        break;
+      }
+
+      const link = await extractLinkFromPage(detailPage, activityUrl, {
+        timeout: 12_000,
+        courseOrigin,
+      });
+
+      if (link) {
+        return { link, layer: 'CAPA_10_QUIZ_LESSON' };
+      }
+    }
+
     return { link: null, layer: null };
   } catch (_error) {
     return { link: null, layer: null };
```

## Pendiente para Claude
- Verificación real ejecutada con:
  `node -e "require('dotenv').config(); const h=require('./electron/handlers/horario'); h.clearHorarioCache(); h.getHorarioWithCache().then(r => { r.materias?.filter(m=>m.modalidad==='en_linea').forEach(m => console.log(m.nombre.padEnd(35), '|', (m.meetLinkLayer||'').padEnd(20), '|', m.meetLink || 'SIN LINK')); })"`
- Capa que encontró cada link:
  - Sist Operativos y Arq de Comp → CAPA_1_DOM
  - Matematicas Discretas → CAPA_1_DOM
  - Tecnologia y Empresa → CAPA_2_MOD_URL
- Tiempo total de escaneo sin caché: **21.3 s**
- Impacto en tiempo por nuevas capas: no hubo incremento visible; en esta corrida fue incluso menor que la referencia previa (~23.3 s), porque los links se resolvieron en capas tempranas.
