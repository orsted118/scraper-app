# Report 069
**Fecha:** 2026-06-01 22:43  
**Agente:** Codex  
**Tipo:** feature

## Contexto Git
**Rama:** master
**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
**Archivos modificados:** 16

## Archivos modificados
- `electron/handlers/calendario.js` — archivo creado como parte de la base inicial
- `electron/handlers/horario.js` — archivo actualizado en esta tarea
- `electron/handlers/settings.js` — archivo actualizado en esta tarea
- `electron/main.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `generate-report.js` — archivo actualizado en esta tarea
- `reports/report_065.md` — archivo creado como parte de la base inicial
- `reports/report_066.md` — archivo creado como parte de la base inicial
- `reports/report_067.md` — archivo creado como parte de la base inicial
- `reports/report_068.md` — archivo creado como parte de la base inicial
- `reports/report_068_calendario.png` — archivo creado como parte de la base inicial
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/index.css` — archivo actualizado en esta tarea
- `src/pages/Calendario.jsx` — archivo creado como parte de la base inicial

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| electron/handlers/calendario.js | 725 | 0 |
| electron/handlers/horario.js | 57 | 0 |
| electron/handlers/settings.js | 26 | 0 |
| electron/main.js | 11 | 1 |
| electron/preload.js | 3 | 0 |
| generate-report.js | 21 | 26 |
| reports/report_065.md | 929 | 0 |
| reports/report_066.md | 3027 | 0 |
| reports/report_067.md | 6342 | 0 |
| reports/report_068.md | 10878 | 0 |
| reports/report_068_calendario.png | 0 | 0 |
| src/App.jsx | 245 | 32 |
| src/components/Onboarding.jsx | 2 | 1 |
| src/components/Sidebar.jsx | 325 | 134 |
| src/index.css | 116 | 0 |
| src/pages/Calendario.jsx | 603 | 0 |

## Resumen
Se registraron 16 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/calendario.js`
```diff
diff --git a/electron/handlers/calendario.js b/electron/handlers/calendario.js
new file mode 100644
index 0000000..41bcec7
--- /dev/null
+++ b/electron/handlers/calendario.js
@@ -0,0 +1,725 @@
+const fs = require('fs');
+const path = require('path');
+const electron = require('electron');
+const { chromium } = require('playwright');
+
+const app = electron?.app;
+
+const CALENDAR_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
+const DEFAULT_TYPE = 'Profesional Asociado y Licenciatura';
+const CURRENT_YEAR = new Date().getFullYear();
+const MONTHS = [
+  'Enero',
+  'Febrero',
+  'Marzo',
+  'Abril',
+  'Mayo',
+  'Junio',
+  'Julio',
+  'Agosto',
+  'Septiembre',
+  'Octubre',
+  'Noviembre',
+  'Diciembre',
+];
+const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
+const PAGE_TIMEOUT_MS = 20_000;
+const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
+
+const SPANISH_MONTHS = {
+  enero: 0,
+  febrero: 1,
+  marzo: 2,
+  abril: 3,
+  mayo: 4,
+  junio: 5,
+  julio: 6,
+  agosto: 7,
+  septiembre: 8,
+  setiembre: 8,
+  octubre: 9,
+  noviembre: 10,
+  diciembre: 11,
+};
+
+function getUserDataPath() {
+  if (app && typeof app.getPath === 'function') {
+    return app.getPath('userData');
+  }
+
+  const fallbackPath = path.join(process.cwd(), '.local-data');
+  fs.mkdirSync(fallbackPath, { recursive: true });
+  return fallbackPath;
+}
+
+function getTempPath() {
+  if (app && typeof app.getPath === 'function') {
+    return app.getPath('temp');
+  }
+
+  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
+  fs.mkdirSync(fallbackPath, { recursive: true });
+  return fallbackPath;
+}
+
+function getCalendarioCachePath() {
+  return path.join(getUserDataPath(), 'calendario-cache.json');
+}
+
+function discardFile(filePath) {
+  if (fs.existsSync(filePath)) {
+    fs.unlinkSync(filePath);
+  }
+}
+
+function normalizeCalendarType(calendarType) {
+  return String(calendarType || DEFAULT_TYPE).trim() || DEFAULT_TYPE;
+}
+
+function readCalendarioCache(calendarType = DEFAULT_TYPE) {
+  const cachePath = getCalendarioCachePath();
+  const requestedType = normalizeCalendarType(calendarType);
+
+  if (!fs.existsSync(cachePath)) {
+    return null;
+  }
+
+  try {
+    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
+
+    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
+      discardFile(cachePath);
+      return null;
+    }
+
+    if (normalizeCalendarType(parsed.calendarType) !== requestedType) {
+      return null;
+    }
+
+    return {
+      events: parsed.events,
+      calendarTypes: Array.isArray(parsed.calendarTypes) ? parsed.calendarTypes : [],
+      calendarType: requestedType,
+      timestamp: parsed.timestamp,
+    };
+  } catch (_error) {
+    discardFile(cachePath);
+    return null;
+  }
+}
+
+function writeCalendarioCache(payload, calendarType = DEFAULT_TYPE) {
+  const requestedType = normalizeCalendarType(calendarType);
+  const nextPayload = {
+    events: Array.isArray(payload?.events) ? payload.events : [],
+    calendarTypes: Array.isArray(payload?.calendarTypes) ? payload.calendarTypes : [],
+    calendarType: requestedType,
+    timestamp: Date.now(),
+  };
+
+  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
+  return nextPayload;
+}
+
+function clearCache() {
+  discardFile(getCalendarioCachePath());
+  return { success: true };
+}
+
+function isTimeoutError(error) {
+  return Boolean(
+    error &&
+      (error.name === 'TimeoutError' ||
+        /timeout/i.test(error.message || '') ||
+        /timed out/i.test(error.message || '')),
+  );
+}
+
+function isNetworkError(error) {
+  const message = error?.message || '';
+  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
+    message,
+  );
+}
+
+async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
+  let lastError;
+
+  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
+    try {
+      return await page.goto(url, {
+        waitUntil: 'domcontentloaded',
+        timeout: PAGE_TIMEOUT_MS,
+        ...options,
+      });
+    } catch (error) {
+      lastError = error;
+
+      if (isNetworkError(error)) {
+        throw new Error('NO_INTERNET');
+      }
+
+      if (!isTimeoutError(error) || attempt === maxRetries) {
+        throw error;
+      }
+
+      await page.waitForTimeout(1500);
+    }
+  }
+
+  throw lastError;
+}
+
+async function applyResourceBlocking(page) {
+  await page.route('**/*', (route) => {
+    const resourceType = route.request().resourceType();
+
+    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
+      route.abort();
+      return;
+    }
+
+    route.continue();
+  });
+}
+
+function unfoldICS(content) {
+  return String(content || '').replace(/\r?\n[ \t]/g, '');
+}
+
+function unescapeICSText(value) {
+  return String(value || '')
+    .replace(/\\n/g, '\n')
+    .replace(/\\,/g, ',')
+    .replace(/\\;/g, ';')
+    .replace(/\\\\/g, '\\')
+    .trim();
+}
+
+function parseICSDate(str) {
+  if (!str) return null;
+  const clean = str.includes(':') ? str.split(':').pop() : str;
+  const d = clean.replace(/[TZ]/g, '');
+  if (d.length < 8) return null;
+
+  try {
+    return new Date(
+      Number(d.slice(0, 4)),
+      Number(d.slice(4, 6)) - 1,
+      Number(d.slice(6, 8)),
+      d.length >= 12 ? Number(d.slice(8, 10)) : 0,
+      d.length >= 14 ? Number(d.slice(10, 12)) : 0,
+    ).toISOString();
+  } catch (_error) {
+    return null;
+  }
+}
+
+function parseDDMMYYYY(str) {
+  const match = String(str || '').trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
+  if (!match) return null;
+
+  const day = Number(match[1]);
+  const month = Number(match[2]);
+  const year = Number(match[3]);
+
+  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
+    return null;
+  }
+
+  const date = new Date(year, month - 1, day);
+  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
+    return null;
+  }
+
+  return date.toISOString();
+}
+
+function parseModalDate(str) {
+  if (!str) return null;
+  const match = String(str).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
+  if (!match) return null;
+
+  return new Date(
+    Number(match[3]),
+    Number(match[1]) - 1,
+    Number(match[2]),
+    Number(match[4]),
+    Number(match[5]),
+  ).toISOString();
+}
+
+function parseICS(content) {
+  const events = [];
+  const blocks = unfoldICS(content).split('BEGIN:VEVENT');
+
+  for (const block of blocks.slice(1)) {
+    const get = (field) => {
+      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
+      return match ? unescapeICSText(match[1]) : '';
+    };
+    const inicio = parseICSDate(get('DTSTART'));
+
+    if (!inicio) {
+      continue;
+    }
+
+    events.push({
+      titulo: get('SUMMARY') || 'Evento',
+      inicio,
+      fin: parseICSDate(get('DTEND')),
+      descripcion: get('DESCRIPTION'),
+      ubicacion: get('LOCATION'),
+      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
+    });
+  }
+
+  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+}
+
+function parseDateText(text) {
+  const normalized = String(text || '').trim();
+
+  if (!normalized) {
+    return null;
+  }
+
+  const nativeDate = new Date(normalized);
+  if (!Number.isNaN(nativeDate.getTime())) {
+    return nativeDate.toISOString();
+  }
+
+  const spanishMatch = normalized
+    .toLowerCase()
+    .normalize('NFD')
+    .replace(/[\u0300-\u036f]/g, '')
+    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
+
+  if (spanishMatch) {
+    const day = Number(spanishMatch[1]);
+    const month = SPANISH_MONTHS[spanishMatch[2]];
+    const year = Number(spanishMatch[3]);
+
+    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
+      return new Date(year, month, day).toISOString();
+    }
+  }
+
+  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
+  if (numericMatch) {
+    const day = Number(numericMatch[1]);
+    const month = Number(numericMatch[2]) - 1;
+    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
+    return new Date(year, month, day).toISOString();
+  }
+
+  return null;
+}
+
+function normalizeEvent(event) {
+  return {
+    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
+    inicio: event?.inicio || null,
+    fin: event?.fin || null,
+    descripcion: String(event?.descripcion || '').trim(),
+    ubicacion: String(event?.ubicacion || '').trim(),
+    categoria: String(event?.categoria || 'General').trim() || 'General',
+  };
+}
+
+function normalizeText(value) {
+  return String(value || '')
+    .normalize('NFD')
+    .replace(/[\u0300-\u036f]/g, '')
+    .replace(/\s+/g, ' ')
+    .trim()
+    .toLowerCase();
+}
+
+async function getCalendarTypes(page) {
+  const types = await page.evaluate((defaultType) => {
+    const monthWords = [
+      'enero',
+      'febrero',
+      'marzo',
+      'abril',
+      'mayo',
+      'junio',
+      'julio',
+      'agosto',
+      'septiembre',
+      'octubre',
+      'noviembre',
+      'diciembre',
+    ];
+    const normalize = (value) =>
+      String(value || '')
+        .normalize('NFD')
+        .replace(/[\u0300-\u036f]/g, '')
+        .replace(/\s+/g, ' ')
+        .trim()
+        .toLowerCase();
+    const selects = Array.from(document.querySelectorAll('select'));
+    const selectData = selects.map((select) => {
+      const options = Array.from(select.options || [])
+        .map((option) => ({ text: option.textContent?.trim() || '', value: option.value || '' }))
+        .filter((option) => option.text || option.value);
+      const text = normalize(options.map((option) => option.text || option.value).join(' '));
+      const hasMonth = monthWords.some((month) => text.includes(month));
+      const hasYear = options.some((option) => /^20\d{2}$/.test((option.text || option.value).trim()));
+      const hasDefaultType = text.includes(normalize(defaultType));
+      return { options, hasMonth, hasYear, hasDefaultType };
+    });
+
+    const match =
+      selectData.find((entry) => entry.hasDefaultType) ||
+      selectData.find((entry) => !entry.hasMonth && !entry.hasYear && entry.options.length > 1);
+
+    return match ? match.options.map((option) => option.text || option.value).filter(Boolean) : [];
+  }, DEFAULT_TYPE);
+
+  const unique = [...new Set(types.map((type) => String(type).trim()).filter(Boolean))];
+  return unique.length > 0 ? unique : [DEFAULT_TYPE];
+}
+
+async function selectCalendarType(page, calendarType = DEFAULT_TYPE) {
+  const requestedType = normalizeCalendarType(calendarType);
+  const selected = await page.evaluate(
+    ({ requestedType: requested, defaultType }) => {
+      const monthWords = [
+        'enero',
+        'febrero',
+        'marzo',
+        'abril',
+        'mayo',
+        'junio',
+        'julio',
+        'agosto',
+        'septiembre',
+        'octubre',
+        'noviembre',
+        'diciembre',
+      ];
+      const normalize = (value) =>
+        String(value || '')
+          .normalize('NFD')
+          .replace(/[\u0300-\u036f]/g, '')
+          .replace(/\s+/g, ' ')
+          .trim()
+          .toLowerCase();
+      const wanted = normalize(requested);
+      const fallback = normalize(defaultType);
+      const selects = Array.from(document.querySelectorAll('select'));
+      const candidates = selects
+        .map((select) => {
+          const options = Array.from(select.options || []);
+          const optionText = normalize(options.map((option) => option.textContent || option.value).join(' '));
+          const hasMonth = monthWords.some((month) => optionText.includes(month));
+          const hasYear = options.some((option) => /^20\d{2}$/.test((option.textContent || option.value || '').trim()));
+          return { select, options, optionText, hasMonth, hasYear };
+        })
+        .filter(({ optionText, hasMonth, hasYear }) => !hasMonth && !hasYear && (optionText.includes(wanted) || optionText.includes(fallback)));
+
+      const candidate = candidates[0];
+      if (!candidate) return false;
+
+      const options = candidate.options;
+      const option =
+        options.find((item) => normalize(item.textContent) === wanted || normalize(item.value) === wanted) ||
+        options.find((item) => normalize(item.textContent).includes(wanted) || normalize(item.value).includes(wanted)) ||
+        options.find((item) => normalize(item.textContent).includes(fallback) || normalize(item.value).includes(fallback));
+
+      if (!option) return false;
+
+      candidate.select.value = option.value;
+      candidate.select.dispatchEvent(new Event('input', { bubbles: true }));
+      candidate.select.dispatchEvent(new Event('change', { bubbles: true }));
+      return true;
+    },
+    { requestedType, defaultType: DEFAULT_TYPE },
+  );
+
+  if (selected) {
+    await page.waitForTimeout(800);
+  }
+
+  return selected;
+}
+
+async function selectYear(page, year = CURRENT_YEAR) {
+  const selected = await page.evaluate((targetYear) => {
+    const selects = Array.from(document.querySelectorAll('select'));
+    const candidates = selects.filter((select) =>
+      Array.from(select.options || []).some((option) => (option.textContent || option.value || '').trim() === String(targetYear)),
+    );
+    const select = candidates[0];
+    if (!select) return false;
+
+    const option = Array.from(select.options || []).find(
+      (item) => (item.textContent || item.value || '').trim() === String(targetYear),
+    );
+    if (!option) return false;
+
+    select.value = option.value;
+    select.dispatchEvent(new Event('input', { bubbles: true }));
+    select.dispatchEvent(new Event('change', { bubbles: true }));
+    return true;
+  }, year);
+
+  if (selected) {
+    await page.waitForTimeout(800);
+  }
+
+  return selected;
+}
+
+async function selectMonth(page, monthName, monthIndex) {
+  const selected = await page.evaluate(
+    ({ monthName: targetMonth, monthIndex: targetIndex }) => {
+      const normalize = (value) =>
+        String(value || '')
+          .normalize('NFD')
+          .replace(/[\u0300-\u036f]/g, '')
+          .replace(/\s+/g, ' ')
+          .trim()
+          .toLowerCase();
+      const wanted = normalize(targetMonth);
+      const selects = Array.from(document.querySelectorAll('select'));
+      const candidates = selects
+        .map((select) => ({ select, options: Array.from(select.options || []) }))
+        .filter(({ options }) => options.some((option) => normalize(option.textContent || option.value).includes(wanted)));
+      const candidate = candidates[0];
+      if (!candidate) return false;
+
+      const option =
+        candidate.options.find((item) => normalize(item.textContent || item.value).includes(wanted)) ||
+        candidate.options.find((item) => [String(targetIndex), String(targetIndex + 1)].includes(String(item.value || '').trim()));
+
+      if (!option) return false;
+
+      candidate.select.value = option.value;
+      candidate.select.dispatchEvent(new Event('input', { bubbles: true }));
+      candidate.select.dispatchEvent(new Event('change', { bubbles: true }));
+      return true;
+    },
+    { monthName, monthIndex },
+  );
+
+  if (selected) {
+    await page.waitForTimeout(900);
+  }
+
+  return selected;
+}
+
+async function extractVisibleListEvents(page) {
+  const rawEvents = await page.evaluate(() => {
+    const datePattern = /\d{2}-\d{2}-\d{4}/g;
+    const visibleText = (element) => String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
+    const isVisible = (element) => {
+      const rect = element.getBoundingClientRect();
+      const styles = window.getComputedStyle(element);
+      return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';
+    };
+    const isLeafish = (element, text) => {
+      const children = Array.from(element.children || []);
+      return !children.some((child) => {
+        const childText = visibleText(child);
+        return childText.match(datePattern) && childText.length < text.length;
+      });
+    };
+    const inferCategory = (text, title) => {
+      const explicit = text.match(/Categor[ií]a\s*:?\s*([^\n|]+)/i)?.[1]?.trim();
+      if (explicit) return explicit;
+      if (/inscrip|reinscrip/i.test(title)) return 'Inscripción';
+      if (/vacaci|asueto|descanso/i.test(title)) return 'Vacaciones';
+      if (/examen|evaluaci/i.test(title)) return 'Examen';
+      return 'General';
+    };
+
+    return Array.from(document.querySelectorAll('body *'))
+      .map((element) => ({ element, text: visibleText(element) }))
+      .filter(({ element, text }) => {
+        if (!text || text.length < 10 || text.length > 600) return false;
+        if (!datePattern.test(text)) return false;
+        datePattern.lastIndex = 0;
+        return isVisible(element) && isLeafish(element, text);
+      })
+      .map(({ text }) => {
+        const fechas = text.match(datePattern) || [];
+        const title = text
+          .replace(datePattern, ' ')
+          .replace(/\s+-\s+/g, ' ')
+          .replace(/\bFecha\b|\bInicio\b|\bFin\b|\bDel\b|\bal\b/gi, ' ')
+          .replace(/\s+/g, ' ')
+          .trim();
+
+        if (!title || title.length < 4) {
+          return null;
+        }
+
+        return {
+          titulo: title,
+          fechaInicio: fechas[0] || null,
+          fechaFin: fechas[1] || null,
+          descripcion: text,
+          ubicacion: '',
+          categoria: inferCategory(text, title),
+        };
+      })
+      .filter(Boolean);
+  });
+
+  const seen = new Set();
+  const events = [];
+
+  for (const rawEvent of rawEvents) {
+    const inicio = parseDDMMYYYY(rawEvent.fechaInicio);
+    if (!inicio) continue;
+
+    const normalized = normalizeEvent({
+      titulo: rawEvent.titulo,
+      inicio,
+      fin: parseDDMMYYYY(rawEvent.fechaFin),
+      descripcion: rawEvent.descripcion,
+      ubicacion: rawEvent.ubicacion,
+      categoria: rawEvent.categoria,
+    });
+    const key = `${normalizeText(normalized.titulo)}-${normalized.inicio}`;
+
+    if (seen.has(key)) continue;
+    seen.add(key);
+    events.push(normalized);
+  }
+
+  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+}
+
+async function tryDownloadICS(page) {
+  const downloadButton = await page
+    .$(
+      'a[href*=".ics"], a[href*="download"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario"), button:has-text("Descargar"), a:has-text("Descargar")',
+    )
+    .catch(() => null);
+
+  if (!downloadButton) {
+    return null;
+  }
+
+  try {
+    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
+    await downloadButton.click();
+    const download = await downloadPromise;
+    if (!download) return null;
+
+    const tmpPath = path.join(getTempPath(), `itson-cal-download-${Date.now()}.tmp`);
+    await download.saveAs(tmpPath);
+    const content = fs.readFileSync(tmpPath, 'utf8');
+    discardFile(tmpPath);
+
+    if (!content.includes('BEGIN:VCALENDAR')) {
+      return null;
+    }
+
+    const events = parseICS(content);
+    return events.length > 0 ? events.map(normalizeEvent) : null;
+  } catch (_error) {
+    return null;
+  }
+}
+
+async function scrapeCalendario(calendarType = DEFAULT_TYPE) {
+  const requestedType = normalizeCalendarType(calendarType);
+  const browser = await chromium.launch({ headless: true });
+
+  try {
+    const context = await browser.newContext({ acceptDownloads: true });
+    const page = await context.newPage();
+    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
+    await applyResourceBlocking(page);
+    await gotoWithRetry(page, CALENDAR_URL, { waitUntil: 'domcontentloaded' });
+    await page.waitForTimeout(1200);
+
+    const calendarTypes = await getCalendarTypes(page);
+    await selectCalendarType(page, requestedType);
+    await selectYear(page, CURRENT_YEAR);
+
+    const eventsByKey = new Map();
+
+    for (let index = 0; index < MONTHS.length; index += 1) {
+      await selectMonth(page, MONTHS[index], index);
+      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
+      await page.waitForTimeout(350);
+      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
+      await page.waitForTimeout(500);
+
+      const monthEvents = await extractVisibleListEvents(page);
+      for (const event of monthEvents) {
+        const key = `${normalizeText(event.titulo)}-${event.inicio}`;
+        if (!eventsByKey.has(key)) {
+          eventsByKey.set(key, event);
+        }
+      }
+    }
+
+    const events = Array.from(eventsByKey.values()).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+    if (events.length > 0) {
+      return { events, calendarTypes, calendarType: requestedType, timestamp: Date.now(), fromCache: false };
+    }
+
+    const icsEvents = await tryDownloadICS(page);
+    return {
+      events: Array.isArray(icsEvents) ? icsEvents : [],
+      calendarTypes,
+      calendarType: requestedType,
+      timestamp: Date.now(),
+      fromCache: false,
+    };
+  } finally {
+    await browser.close();
+  }
+}
+
+async function run(options = {}) {
+  const calendarType = normalizeCalendarType(
+    typeof options === 'string' ? options : options?.calendarType || DEFAULT_TYPE,
+  );
+  const cached = readCalendarioCache(calendarType);
+
+  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
+    return {
+      ...cached,
+      fromCache: true,
+    };
+  }
+
+  try {
+    const result = await scrapeCalendario(calendarType);
+    const cachedPayload = writeCalendarioCache(result, calendarType);
+    return {
+      ...cachedPayload,
+      fromCache: false,
+    };
+  } catch (error) {
+    if (error?.message === 'NO_INTERNET') {
+      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
+    }
+
+    return {
+      error: error?.message
+        ? `Falló la extracción del calendario escolar: ${error.message}`
+        : 'Falló la extracción del calendario escolar por un error no identificado.',
+    };
+  }
+}
+
+module.exports = {
+  clearCache,
+  getCalendarioCachePath,
+  parseDateText,
+  parseDDMMYYYY,
+  parseICS,
+  parseICSDate,
+  parseModalDate,
+  run,
+};
```

### `electron/handlers/horario.js`
```diff
diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
index 45995c1..d957056 100644
--- a/electron/handlers/horario.js
+++ b/electron/handlers/horario.js
@@ -913,6 +913,61 @@ async function loginToCIA(page, user, password) {
   return null;
 }
 
+async function tryExtractStudentName(page) {
+  const selectors = [
+    '#ctl00_cLabel_nombre',
+    '.user-name',
+    '#user-name',
+    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
+    '.navbar-text',
+    'span[id*="Name"]',
+  ];
+
+  for (const selector of selectors) {
+    try {
+      const element = await page.$(selector);
+
+      if (!element) {
+        continue;
+      }
+
+      const text = normalizeWhitespace(await element.textContent());
+      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
+        return text;
+      }
+    } catch (_error) {
+      // Continue with the next selector.
+    }
+  }
+
+  try {
+    const bodyText = await page.evaluate(() => document.body?.innerText || '');
+    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
+    if (match) {
+      return normalizeWhitespace(match[1]);
+    }
+  } catch (_error) {
+    // Silent fallback.
+  }
+
+  return null;
+}
+
+async function persistStudentNameFromCIA(page) {
+  const nombre = await tryExtractStudentName(page);
+
+  if (!nombre) {
+    return;
+  }
+
+  try {
+    const { saveStudentName } = require('./settings');
+    await saveStudentName(nombre);
+  } catch (_error) {
+    // Student name persistence must never block horario scraping.
+  }
+}
+
 async function getTargetContentFrame(page, timeout = 25_000) {
   return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
 }
@@ -2413,6 +2468,7 @@ async function scrapeHorario(controller = {}) {
       return loginResult;
     }
 
+    await persistStudentNameFromCIA(page);
     await applyResourceBlocking(page);
     let scheduleFrame;
     try {
@@ -2427,6 +2483,7 @@ async function scrapeHorario(controller = {}) {
         if (retryLogin?.error) {
           return retryLogin;
         }
+        await persistStudentNameFromCIA(page);
         scheduleFrame = await openHorarioPage(page);
       } else {
         throw error;
```

### `electron/handlers/settings.js`
```diff
diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
index 0b6f430..cdefc37 100644
--- a/electron/handlers/settings.js
+++ b/electron/handlers/settings.js
@@ -26,6 +26,7 @@ function getSettings() {
     ciaUser: process.env.CIA_USER || '',
     hasCIAPassword: Boolean(process.env.CIA_PASS),
     notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
+    studentName: process.env.STUDENT_NAME || '',
   };
 }
 
@@ -96,6 +97,30 @@ function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore
   }
 }
 
+async function saveStudentName(name) {
+  try {
+    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
+
+    if (!normalizedName) {
+      return { success: false, error: 'Nombre de estudiante vacío.' };
+    }
+
+    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
+    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);
+
+    const envPath = getEnvFilePath();
+    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
+    process.env.STUDENT_NAME = normalizedName;
+
+    return { success: true };
+  } catch (error) {
+    return {
+      success: false,
+      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
+    };
+  }
+}
+
 function registerSettingsHandlers() {
   ipcMain.handle('settings:get', async () => getSettings());
   ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
@@ -105,5 +130,6 @@ module.exports = {
   getEnvFilePath,
   getSettings,
   registerSettingsHandlers,
+  saveStudentName,
   saveSettings,
 };
```

### `electron/main.js`
```diff
diff --git a/electron/main.js b/electron/main.js
index af41ff2..abd22c3 100644
--- a/electron/main.js
+++ b/electron/main.js
@@ -8,6 +8,7 @@ const { registerFileHandlers } = require('./handlers/files');
 const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
 const { registerSettingsHandlers } = require('./handlers/settings');
 const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
+const calendarioHandler = require('./handlers/calendario');
 
 const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
 const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
@@ -57,6 +58,8 @@ app.whenReady().then(() => {
   registerFileHandlers();
   registerSettingsHandlers();
   registerNotificationHandlers();
+  ipcMain.handle('calendario:run', (_event, options) => calendarioHandler.run(options || {}));
+  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
   ipcMain.removeHandler('shell:open-external');
   ipcMain.handle('shell:open-external', async (_event, url) => {
     if (url && typeof url === 'string' && url.startsWith('http')) {
@@ -72,11 +75,13 @@ app.whenReady().then(() => {
     clearActivitiesCache();
     clearHorarioCache();
     clearCIACache();
+    calendarioHandler.clearCache();
 
-    const [actividades, horario, calificaciones] = await Promise.allSettled([
+    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
       getActivitiesWithCache(),
       getHorarioWithCache(),
       getCalificacionesWithCache(),
+      calendarioHandler.run({}),
     ]);
 
     return {
@@ -90,6 +95,10 @@ app.whenReady().then(() => {
         calificaciones.status === 'fulfilled'
           ? calificaciones.value
           : { error: calificaciones.reason?.message },
+      calendario:
+        calendario.status === 'fulfilled'
+          ? calendario.value
+          : { error: calendario.reason?.message },
     };
   });
   createMainWindow();
@@ -110,3 +119,4 @@ app.on('window-all-closed', () => {
     app.quit();
   }
 });
+
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 05a306d..8fb8b9c 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -5,8 +5,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
   runCIA: () => ipcRenderer.invoke('cia:run'),
   runHorario: () => ipcRenderer.invoke('horario:run'),
+  runCalendario: (options) => ipcRenderer.invoke('calendario:run', options || {}),
   clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
   clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
+  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
   saveHorarioLink: (numeroClase, link) =>
     ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
   getSettings: () => ipcRenderer.invoke('settings:get'),
@@ -23,3 +25,4 @@ contextBridge.exposeInMainWorld('scraperApp', {
   openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
   syncAll: () => ipcRenderer.invoke('sync:all'),
 });
+
```

### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index fa9b68e..031d32c 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -19,35 +19,30 @@ const MAX_DIFF_BYTES = 150 * 1024;
 
 const VERIFICATION = {
   buildStatus: 'PASS',
-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
-  verificationOutput: `> dvpotro@0.1.0 build
+  testsRun: 'npm run build + CSS build check + MES select removal check',
+  verificationCmd: 'npm run build; node check sync-all-btn in dist CSS; node check MES select removed',
+  verificationOutput: `$ npm run build
+> dvpotro@0.1.0 build
 > vite build
 
 vite v5.4.21 building for production...
-✓ 1767 modules transformed.
-dist/index.html                        0.47 kB │ gzip:  0.30 kB
-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
-✓ built in 4.93s
-The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
-
-> dvpotro@0.1.0 dist:dir
-> vite build && electron-builder --dir
-
-✓ 1767 modules transformed.
-✓ built in 4.83s
-• electron-builder version=26.8.1
-• loaded configuration file=package.json (build field)
-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
-
-branding verification OK
-active branding reference scan OK: no old visible references
-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+transforming...
+✓ 1768 modules transformed.
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-BHL7YJJ7.css             34.79 kB │ gzip:  7.22 kB
+dist/assets/index-BZ6s7_Bs.js              321.55 kB │ gzip: 87.78 kB
+✓ built in 9.82s
+
+$ node check sync-all-btn in dist CSS
+sync-all-btn in CSS: true
+
+$ node check MES select removed
+MES select removed: true
+
+Note: Vite printed its existing CJS Node API deprecation warning after the checks.`,
 };
 
 function ensureReportsDir() {
```

### `reports/report_065.md`
```diff
diff --git a/reports/report_065.md b/reports/report_065.md
new file mode 100644
index 0000000..98c1356
--- /dev/null
+++ b/reports/report_065.md
@@ -0,0 +1,929 @@
+# Report 065
+**Fecha:** 2026-05-31 18:33  
+**Agente:** Codex  
+**Tipo:** refactor
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
+**Archivos modificados:** 4
+
+## Archivos modificados
+- `generate-report.js` — archivo actualizado en esta tarea
+- `src/App.jsx` — archivo actualizado en esta tarea
+- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
+- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| generate-report.js | 19 | 21 |
+| src/App.jsx | 120 | 30 |
+| src/components/Onboarding.jsx | 2 | 1 |
+| src/components/Sidebar.jsx | 308 | 134 |
+
+## Resumen
+Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `generate-report.js`
+```diff
+diff --git a/generate-report.js b/generate-report.js
+index fa9b68e..90a2816 100644
+--- a/generate-report.js
++++ b/generate-report.js
+@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
+ 
+ const VERIFICATION = {
+   buildStatus: 'PASS',
+-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
+-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
++  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
++  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
+   verificationOutput: `> dvpotro@0.1.0 build
+ > vite build
+ 
+ vite v5.4.21 building for production...
++transforming...
+ ✓ 1767 modules transformed.
+-dist/index.html                        0.47 kB │ gzip:  0.30 kB
+-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
+-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
+-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
+-✓ built in 4.93s
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
++✓ built in 8.70s
+ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+ 
+-> dvpotro@0.1.0 dist:dir
+-> vite build && electron-builder --dir
++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
+ 
+-✓ 1767 modules transformed.
+-✓ built in 4.83s
+-• electron-builder version=26.8.1
+-• loaded configuration file=package.json (build field)
+-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
+-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
+-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
+-
+-branding verification OK
+-active branding reference scan OK: no old visible references
+-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
+-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
++Dist logo assets:
++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
++
++Confirmed:
++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
++- Dist logo asset is under 20KB.
++- handleSyncAll only adds runCIA when hasFinales is true.
++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
+ };
+ 
+ function ensureReportsDir() {
+```
+
+### `src/App.jsx`
+```diff
+diff --git a/src/App.jsx b/src/App.jsx
+index 137c482..b672732 100644
+--- a/src/App.jsx
++++ b/src/App.jsx
+@@ -1,4 +1,4 @@
+-import { useCallback, useEffect, useRef, useState } from 'react';
++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+ import Sidebar from './components/Sidebar';
+ import Onboarding from './components/Onboarding';
+ import TaskPanel from './components/TaskPanel';
+@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
+ import Horario from './pages/Horario';
+ import Calificaciones from './pages/Calificaciones';
+ import Ajustes from './pages/Ajustes';
+-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
+ 
+ const pageRegistry = {
+   activities: {
+@@ -44,7 +44,7 @@ function App() {
+   const [loading, setLoading] = useState(false);
+   const [loadingHorario, setLoadingHorario] = useState(false);
+   const [loadingCIA, setLoadingCIA] = useState(false);
+-  const [syncingAll, setSyncingAll] = useState(false);
++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
+   const [syncingModules, setSyncingModules] = useState([]);
+   const [error, setError] = useState('');
+   const [errorHorario, setErrorHorario] = useState('');
+@@ -59,6 +59,7 @@ function App() {
+   const [horarioCargado, setHorarioCargado] = useState(false);
+   const [ciaCargado, setCiaCargado] = useState(false);
+   const [studentName, setStudentName] = useState('');
++  const [settingsData, setSettingsData] = useState({});
+ 
+   const initializedRef = useRef(false);
+   const nearExpiryRefreshLaunchedRef = useRef(false);
+@@ -75,6 +76,21 @@ function App() {
+           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
+       ),
+   );
++  const proximaEntrega = useMemo(() => {
++    const pending = (activities || []).filter(
++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++    );
++
++    if (!pending.length) {
++      return null;
++    }
++
++    return [...pending].sort((left, right) => {
++      if (!left.fechaLimite) return 1;
++      if (!right.fechaLimite) return -1;
++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
++    })[0];
++  }, [activities]);
+ 
+   const addSyncingModule = (moduleId) => {
+     setSyncingModules((previous) => {
+@@ -135,6 +151,9 @@ function App() {
+       horario: 'horario',
+       calificaciones: 'calificaciones',
+       ajustes: 'settings',
++      calendario: 'activities',
++      notifications: 'activities',
++      notificaciones: 'activities',
+     };
+ 
+     const nextPage = pageAliases[pageId] || pageId;
+@@ -156,6 +175,7 @@ function App() {
+ 
+     try {
+       const settings = await api.getSettings();
++      setSettingsData(settings || {});
+       const hasUser = Boolean(settings?.user?.trim());
+       const hasPassword = Boolean(settings?.hasPassword);
+       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+@@ -167,6 +187,7 @@ function App() {
+       initializedRef.current = false;
+       nearExpiryRefreshLaunchedRef.current = false;
+     } catch (_error) {
++      setSettingsData({});
+       setStudentName('');
+       setShowOnboarding(false);
+     } finally {
+@@ -430,50 +451,109 @@ function App() {
+   };
+ 
+   const handleSyncAll = async () => {
+-    if (!api?.syncAll) {
++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
++
++    if (syncState.status === 'syncing' || !scraperApi) {
+       return;
+     }
+ 
+-    setSyncingAll(true);
++    setSyncState((current) => ({ ...current, status: 'syncing' }));
+     addSyncingModule('activities');
+     addSyncingModule('horario');
+-    addSyncingModule('calificaciones');
++    if (hasFinales) {
++      addSyncingModule('calificaciones');
++    }
+ 
+     try {
+-      const result = await api.syncAll();
++      const calls = [
++        { id: 'activities', promise: scraperApi.runScraper?.() },
++        { id: 'horario', promise: scraperApi.runHorario?.() },
++      ];
+ 
+-      if (result?.actividades?.activities) {
+-        setActivities(result.actividades.activities);
+-        if (result.actividades?.timestamp) {
+-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+-        }
++      if (hasFinales) {
++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
+       }
+ 
+-      if (result?.horario?.materias) {
+-        setHorario({
+-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
+-          diasConClases: Array.isArray(result.horario.diasConClases)
+-            ? result.horario.diasConClases
+-            : [],
+-        });
+-        if (result.horario?.timestamp) {
+-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
++      const results = await Promise.allSettled(calls.map((call) => call.promise));
++      let hasErrors = false;
++
++      results.forEach((result, index) => {
++        const moduleId = calls[index]?.id;
++
++        if (result.status === 'rejected') {
++          hasErrors = true;
++          return;
+         }
+-      }
+ 
+-      if (result?.calificaciones?.materias) {
+-        setCalificaciones(result.calificaciones.materias);
+-        if (result.calificaciones?.timestamp) {
+-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
++        const response = result.value;
++
++        if (response?.error) {
++          hasErrors = true;
++
++          if (moduleId === 'activities') {
++            setErrorCode(response.error);
++            setError(getFriendlyIVirtualError(response.error));
++          }
++
++          if (moduleId === 'horario') {
++            setErrorHorario(getFriendlyIVirtualError(response.error));
++          }
++
++          if (moduleId === 'calificaciones') {
++            setErrorCIACode(response.error);
++            setErrorCIA(getFriendlyIVirtualError(response.error));
++          }
++
++          return;
+         }
+-      }
++
++        if (moduleId === 'activities') {
++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
++          setActivities(activitiesList);
++          setError('');
++          setErrorCode('');
++          if (response?.timestamp) {
++            setLastSyncAt(new Date(response.timestamp).toISOString());
++          }
++        }
++
++        if (moduleId === 'horario') {
++          setHorario({
++            materias: Array.isArray(response?.materias) ? response.materias : [],
++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
++          });
++          setErrorHorario('');
++          if (response?.timestamp) {
++            setLastSyncHorario(new Date(response.timestamp).toISOString());
++          }
++        }
++
++        if (moduleId === 'calificaciones') {
++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
++          setCalificaciones(materiasList);
++          setErrorCIA('');
++          setErrorCIACode('');
++          if (response?.timestamp) {
++            setLastSyncCIA(new Date(response.timestamp).toISOString());
++          }
++        }
++      });
++
++      const nextStatus = hasErrors ? 'error' : 'done';
++      setSyncState({ status: nextStatus, lastSync: new Date() });
++      setTimeout(
++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
++        hasErrors ? 4000 : 3000,
++      );
+     } catch (_error) {
+-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
++      setSyncState((current) => ({ ...current, status: 'error' }));
++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
+     } finally {
+       removeSyncingModule('activities');
+       removeSyncingModule('horario');
+-      removeSyncingModule('calificaciones');
+-      setSyncingAll(false);
++      if (hasFinales) {
++        removeSyncingModule('calificaciones');
++      }
+     }
+   };
+ 
+@@ -556,10 +636,19 @@ function App() {
+       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
+         <Sidebar
+           activePage={activePage}
++          activities={activities}
++          calendarCount={0}
+           diasConClases={horario?.diasConClases ?? []}
++          errorHorario={errorHorario}
+           hasFinales={hasFinales}
+           horario={horario?.materias ?? []}
++          horarioData={horario}
++          onSyncAll={handleSyncAll}
+           onNavigate={handleNavigate}
++          proximaEntrega={proximaEntrega}
++          settingsData={settingsData}
++          studentName={studentName}
++          syncState={syncState}
+         />
+         {!settingsReady ? (
+           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
+@@ -617,3 +706,4 @@ function App() {
+ }
+ 
+ export default App;
++
+```
+
+### `src/components/Onboarding.jsx`
+```diff
+diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
+index 3e820a2..7bca3ac 100644
+--- a/src/components/Onboarding.jsx
++++ b/src/components/Onboarding.jsx
+@@ -1,5 +1,5 @@
+ import { ArrowRight } from 'lucide-react';
+-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+ 
+ function Onboarding({ onNavigate }) {
+   return (
+@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
+ }
+ 
+ export default Onboarding;
++
+```
+
+### `src/components/Sidebar.jsx`
+```diff
+diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
+index c7458cb..1aef7a5 100644
+--- a/src/components/Sidebar.jsx
++++ b/src/components/Sidebar.jsx
+@@ -1,216 +1,390 @@
+-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
+-import { useEffect, useState } from 'react';
+-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++import {
++  AlertCircle,
++  Bell,
++  BookOpen,
++  CalendarDays,
++  CheckCircle,
++  Clock,
++  Info,
++  Loader2,
++  RefreshCw,
++  Settings,
++} from 'lucide-react';
++import { useEffect, useMemo, useState } from 'react';
++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+ import { getNextClass } from '../utils/horario.js';
+ 
+-const navigationItems = [
+-  { id: 'activities', label: 'Actividades', icon: ListChecks },
+-  { id: 'horario', label: 'Horario', icon: Calendar },
+-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
+-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
++const NAV_ITEMS = [
++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
+ ];
+ 
+-function getNextClassStatus(nextClass) {
+-  if (!nextClass) {
+-    return '';
++function normDate(value) {
++  const date = value ? new Date(value) : null;
++  return date && !Number.isNaN(date.getTime()) ? date : null;
++}
++
++function formatDayShort(date = new Date()) {
++  return date.toLocaleDateString('es-MX', {
++    weekday: 'short',
++    day: 'numeric',
++    month: 'short',
++  });
++}
++
++function formatTime(date) {
++  return date.toLocaleTimeString('es-MX', {
++    hour: '2-digit',
++    minute: '2-digit',
++  });
++}
++
++function getInitials(str = '') {
++  const clean = String(str || '').trim();
++  const parts = clean.split(/\s+/).filter(Boolean);
++
++  if (parts.length >= 2) {
++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
+   }
+ 
+-  if (!nextClass.esHoy) {
+-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
++  return clean.slice(0, 2).toUpperCase() || 'DV';
++}
++
++function formatDisplayName(str = '') {
++  const clean = String(str || '').trim();
++  const parts = clean.split(/\s+/).filter(Boolean);
++
++  if (/^ID\s+\w+/i.test(clean)) {
++    return clean;
++  }
++
++  if (parts.length >= 2) {
++    return `${parts[0]} ${parts[1][0]}.`;
++  }
++
++  return clean;
++}
++
++function formatRelativeDeadline(fechaLimite) {
++  const deadline = normDate(fechaLimite);
++
++  if (!deadline) {
++    return 'Fecha pendiente';
+   }
+ 
+-  if (nextClass.minutosRestantes <= 30) {
++  const now = new Date();
++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
++  const diffDays = Math.round((target - today) / 86400000);
++  const time = formatTime(deadline);
++
++  if (diffDays < 0) return 'Vencida';
++  if (diffDays === 0) return `Hoy · ${time}`;
++  if (diffDays === 1) return `Mañana · ${time}`;
++  return `En ${diffDays} días`;
++}
++
++function getClassStatus(nextClass) {
++  if (!nextClass) return '';
++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
++
++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
+     return `En ${nextClass.minutosRestantes} min`;
+   }
+ 
+-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
++  if (nextClass.esHoy) {
++    return start;
++  }
++
++  return `${nextClass.dia || 'Próxima'} · ${start}`;
+ }
+ 
+-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
++function getSyncPresentation(syncState = {}) {
++  if (syncState.status === 'syncing') {
++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
++  }
++
++  if (syncState.status === 'done') {
++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++  }
++
++  if (syncState.status === 'error') {
++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
++  }
++
++  if (syncState.lastSync) {
++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++  }
++
++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
++}
++
++function Sidebar({
++  activePage,
++  activities = [],
++  calendarCount = 0,
++  diasConClases = [],
++  errorHorario = '',
++  hasFinales = false,
++  horario = [],
++  horarioData = null,
++  onNavigate,
++  onSyncAll,
++  proximaEntrega = null,
++  settingsData = {},
++  studentName = '',
++  syncState = { status: 'idle', lastSync: null },
++}) {
+   const [nextClass, setNextClass] = useState(null);
+-  const visibleNavigationItems = navigationItems.filter(
+-    (item) => item.id !== 'calificaciones' || hasFinales === true,
+-  );
+-  const hasHorario = Array.isArray(horario) && horario.length > 0;
++  const materiasHorario = Array.isArray(horarioData?.materias)
++    ? horarioData.materias
++    : (Array.isArray(horario) ? horario : []);
++  const pendingCount = activities.filter(
++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++  ).length;
++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
++  const hasHorario = materiasHorario.length > 0;
++  const syncInfo = getSyncPresentation(syncState);
++  const SyncIcon = syncInfo.Icon;
++  const userId = settingsData?.ciaUser || settingsData?.user || '';
++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
++  const initials = getInitials(hasRealStudentName ? studentName : userId);
+ 
+   useEffect(() => {
+-    if (!hasHorario) {
+-      setNextClass(null);
+-      return undefined;
+-    }
+-
+     const updateNextClass = () => {
+-      setNextClass(getNextClass(horario, diasConClases));
++      setNextClass(getNextClass(materiasHorario, diasConClases));
+     };
+ 
+     updateNextClass();
+     const intervalId = setInterval(updateNextClass, 60 * 1000);
+ 
+     return () => clearInterval(intervalId);
+-  }, [hasHorario, horario, diasConClases]);
++  }, [materiasHorario, diasConClases]);
++
++  const navItems = useMemo(() => NAV_ITEMS, []);
++
++  const getBadge = (itemId) => {
++    if (itemId === 'activities' && pendingCount > 0) {
++      return (
++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
++          {pendingCount}
++        </span>
++      );
++    }
++
++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
++      return (
++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
++          {calendarCount}
++        </span>
++      );
++    }
++
++    if (itemId === 'horario') {
++      if (errorHorario) {
++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
++      }
++      if (hasHorario) {
++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
++      }
++    }
+ 
+-  const handleOpenMeetLink = () => {
+-    if (!nextClass?.meetLink) {
+-      return;
++    if (itemId === 'notifications' && delayedCount > 0) {
++      return (
++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
++          {delayedCount}
++        </span>
++      );
+     }
+ 
+-    window.scraperApp?.openExternal?.(nextClass.meetLink);
++    return null;
+   };
+ 
++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
++
+   return (
+     <aside
+-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
+       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
+     >
+-      <div className="mb-8">
++      <header className="px-4 pb-3.5 pt-4">
+         <div className="flex items-center gap-3">
+-          <span
+-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
+-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
+-          >
+-            <img
+-              src={dvpotroLogo}
+-              alt="DVPotro"
+-              className="h-full w-full object-contain"
+-              draggable="false"
+-            />
+-          </span>
++          <img
++            src={dvpotroLogo}
++            alt="DVPotro"
++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
++            draggable="false"
++          />
+           <div className="min-w-0">
+-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
+               DVPotro
+             </p>
+-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
+               ITSON
+             </p>
+           </div>
+         </div>
+-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
+-          Academic command center
+-        </p>
+-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
+-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
+-        </p>
+-      </div>
++      </header>
+ 
+-      <nav className="space-y-2">
+-        {visibleNavigationItems.map((item) => {
+-          const isActive = item.id === activePage;
++      <nav className="px-2 pb-2">
++        {navItems.map((item) => {
+           const Icon = item.icon;
++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
++          const badge = getBadge(item.id);
+ 
+           return (
+             <button
+               key={item.id}
+               type="button"
+-              onClick={() => onNavigate(item.id)}
+-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
+-                isActive
+-                  ? ''
+-                  : ''
+-              }`}
++              onClick={() => onNavigate?.(item.target)}
++              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
+               style={
+                 isActive
+-                  ? { background: 'var(--accent)', color: '#fff' }
+-                  : {
+-                    background: 'var(--bg-secondary)',
+-                    color: 'var(--text-muted)',
+-                  }
++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
+               }
+               onMouseEnter={(event) => {
+                 if (!isActive) {
+-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
+                   event.currentTarget.style.color = 'var(--text-strong)';
+                 }
+               }}
+               onMouseLeave={(event) => {
+                 if (!isActive) {
+-                  event.currentTarget.style.background = 'var(--bg-secondary)';
++                  event.currentTarget.style.background = 'transparent';
+                   event.currentTarget.style.color = 'var(--text-muted)';
+                 }
+               }}
+             >
+-              <span className="flex items-center gap-3">
+-                <Icon className="h-4 w-4" />
+-                {item.label}
+-              </span>
+-              <span
+-                className="text-xs uppercase tracking-[0.25em]"
+-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
+-              >
+-                {isActive ? 'Live' : 'Idle'}
++              <span className="flex min-w-0 items-center gap-3">
++                <Icon className="h-4 w-4 shrink-0" />
++                <span className="truncate">{item.label}</span>
+               </span>
++              {badge}
+             </button>
+           );
+         })}
+       </nav>
+ 
+-      {hasHorario ? (
+-        <div
+-          className="mt-auto border-t pt-4"
+-          style={{ borderColor: 'var(--border-subtle)' }}
++      <section
++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++      >
++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++          Sincronización
++        </p>
++        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
++          <span className="font-medium">{syncInfo.text}</span>
++        </div>
++        {syncTimestamp ? (
++          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++            Última sincronización · {syncTimestamp}
++          </p>
++        ) : null}
++        <button
++          type="button"
++          onClick={onSyncAll}
++          disabled={syncState.status === 'syncing'}
++          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
++          style={
++            syncState.status === 'syncing'
++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
++              : { background: 'var(--itson-blue, var(--accent))' }
++          }
+         >
+-          <div
+-            className="rounded-2xl border p-3"
+-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
+-          >
+-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
+-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
+-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
++          {syncState.status === 'syncing' ? (
++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
++          ) : (
++            <RefreshCw className="h-3.5 w-3.5" />
++          )}
++          Sincronizar todo
++        </button>
++        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
++          Actualiza toda la información de la app
++        </p>
++      </section>
++
++      <section
++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++      >
++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
++          HOY · {formatDayShort(new Date())}
++        </p>
++
++        <div className="mt-3">
++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++            Entrega
++          </p>
++          {proximaEntrega ? (
++            <div className="mt-1 min-w-0">
++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
++                {proximaEntrega.nombre}
++              </p>
++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
++              </p>
+             </div>
++          ) : (
++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
++          )}
++        </div>
+ 
+-            {nextClass ? (
+-              <div className="space-y-2">
+-                <div className="flex items-start justify-between gap-2">
+-                  <div className="min-w-0">
+-                    <p
+-                      className="truncate text-sm font-medium"
+-                      style={{ color: 'var(--text-strong)' }}
+-                      title={nextClass.materia}
+-                    >
+-                      {nextClass.materia}
+-                    </p>
+-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
+-                      {nextClass.hora} · {nextClass.salon}
+-                    </p>
+-                  </div>
+-
+-                  {nextClass.meetLink ? (
+-                    <button
+-                      type="button"
+-                      onClick={handleOpenMeetLink}
+-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
+-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
+-                      title="Abrir videollamada"
+-                    >
+-                      <ExternalLink className="h-3.5 w-3.5" />
+-                    </button>
+-                  ) : null}
+-                </div>
++        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
+ 
++        <div>
++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
++            Clase
++          </p>
++          {nextClass ? (
++            <div className="mt-1 min-w-0">
++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
++                {nextClass.materia}
++              </p>
++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++                <span className="truncate">{nextClass.hora}</span>
+                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
+                   <span
+-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
+-                    style={{
+-                      background: 'var(--retrasada-bg)',
+-                      borderColor: 'var(--retrasada-border)',
+-                      color: 'var(--retrasada-text)',
+-                    }}
++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
+                   >
+-                    {getNextClassStatus(nextClass)}
++                    {getClassStatus(nextClass)}
+                   </span>
+                 ) : (
+-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+-                    {getNextClassStatus(nextClass)}
+-                  </p>
++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
+                 )}
+               </div>
+-            ) : (
+-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
+-                Sin clases próximas
+-              </p>
+-            )}
+-          </div>
++            </div>
++          ) : (
++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
++          )}
++        </div>
++      </section>
++
++      <footer
++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
++        style={{ borderColor: 'var(--border)' }}
++      >
++        <div
++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
++        >
++          {initials}
++        </div>
++        <div className="min-w-0">
++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
++            {profileName}
++          </p>
++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
++            {userId || 'Sin ID configurado'}
++          </p>
+         </div>
+-      ) : null}
++      </footer>
+     </aside>
+   );
+ }
+```
+
+## Verificación
+**npm run build:** PASS
+**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
+**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
+**Output de verificación:**
+```
+> dvpotro@0.1.0 build
+> vite build
+
+vite v5.4.21 building for production...
+transforming...
+✓ 1767 modules transformed.
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+✓ built in 8.70s
+The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+
+sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
+
+Dist logo assets:
+dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+
+Confirmed:
+- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+- Dist logo asset is under 20KB.
+- handleSyncAll only adds runCIA when hasFinales is true.
+- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
+```
+
+## Pendiente para Claude
+- Sin pendientes registrados en esta tarea.
```

### `reports/report_066.md`
```diff
diff --git a/reports/report_066.md b/reports/report_066.md
new file mode 100644
index 0000000..74c057d
--- /dev/null
+++ b/reports/report_066.md
@@ -0,0 +1,3027 @@
+# Report 066
+**Fecha:** 2026-05-31 23:05  
+**Agente:** Codex  
+**Tipo:** feature
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
+**Archivos modificados:** 11
+
+## Archivos modificados
+- `electron/handlers/calendario.js` — archivo creado como parte de la base inicial
+- `electron/handlers/horario.js` — archivo actualizado en esta tarea
+- `electron/handlers/settings.js` — archivo actualizado en esta tarea
+- `electron/main.js` — archivo actualizado en esta tarea
+- `electron/preload.js` — archivo actualizado en esta tarea
+- `generate-report.js` — archivo actualizado en esta tarea
+- `reports/report_065.md` — archivo creado como parte de la base inicial
+- `src/App.jsx` — archivo actualizado en esta tarea
+- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
+- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo creado como parte de la base inicial
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| electron/handlers/calendario.js | 428 | 0 |
+| electron/handlers/horario.js | 57 | 0 |
+| electron/handlers/settings.js | 26 | 0 |
+| electron/main.js | 10 | 1 |
+| electron/preload.js | 2 | 0 |
+| generate-report.js | 34 | 24 |
+| reports/report_065.md | 929 | 0 |
+| src/App.jsx | 220 | 32 |
+| src/components/Onboarding.jsx | 2 | 1 |
+| src/components/Sidebar.jsx | 306 | 134 |
+| src/pages/Calendario.jsx | 318 | 0 |
+
+## Resumen
+Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `electron/handlers/calendario.js`
+```diff
+diff --git a/electron/handlers/calendario.js b/electron/handlers/calendario.js
+new file mode 100644
+index 0000000..77042d0
+--- /dev/null
++++ b/electron/handlers/calendario.js
+@@ -0,0 +1,428 @@
++const fs = require('fs');
++const path = require('path');
++const electron = require('electron');
++const { chromium } = require('playwright');
++
++const app = electron?.app;
++
++const CALENDARIO_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
++const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
++const PAGE_TIMEOUT_MS = 20_000;
++const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
++
++const SPANISH_MONTHS = {
++  enero: 0,
++  febrero: 1,
++  marzo: 2,
++  abril: 3,
++  mayo: 4,
++  junio: 5,
++  julio: 6,
++  agosto: 7,
++  septiembre: 8,
++  setiembre: 8,
++  octubre: 9,
++  noviembre: 10,
++  diciembre: 11,
++};
++
++function getUserDataPath() {
++  if (app && typeof app.getPath === 'function') {
++    return app.getPath('userData');
++  }
++
++  const fallbackPath = path.join(process.cwd(), '.local-data');
++  fs.mkdirSync(fallbackPath, { recursive: true });
++  return fallbackPath;
++}
++
++function getTempPath() {
++  if (app && typeof app.getPath === 'function') {
++    return app.getPath('temp');
++  }
++
++  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
++  fs.mkdirSync(fallbackPath, { recursive: true });
++  return fallbackPath;
++}
++
++function getCalendarioCachePath() {
++  return path.join(getUserDataPath(), 'calendario-cache.json');
++}
++
++function discardFile(filePath) {
++  if (fs.existsSync(filePath)) {
++    fs.unlinkSync(filePath);
++  }
++}
++
++function readCalendarioCache() {
++  const cachePath = getCalendarioCachePath();
++
++  if (!fs.existsSync(cachePath)) {
++    return null;
++  }
++
++  try {
++    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
++
++    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
++      discardFile(cachePath);
++      return null;
++    }
++
++    return parsed;
++  } catch (_error) {
++    discardFile(cachePath);
++    return null;
++  }
++}
++
++function writeCalendarioCache(payload) {
++  const nextPayload = {
++    events: Array.isArray(payload?.events) ? payload.events : [],
++    timestamp: Date.now(),
++  };
++
++  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
++  return nextPayload;
++}
++
++function clearCache() {
++  discardFile(getCalendarioCachePath());
++  return { success: true };
++}
++
++function isTimeoutError(error) {
++  return Boolean(
++    error &&
++      (error.name === 'TimeoutError' ||
++        /timeout/i.test(error.message || '') ||
++        /timed out/i.test(error.message || '')),
++  );
++}
++
++function isNetworkError(error) {
++  const message = error?.message || '';
++  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
++    message,
++  );
++}
++
++async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
++  let lastError;
++
++  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
++    try {
++      return await page.goto(url, {
++        waitUntil: 'domcontentloaded',
++        timeout: PAGE_TIMEOUT_MS,
++        ...options,
++      });
++    } catch (error) {
++      lastError = error;
++
++      if (isNetworkError(error)) {
++        throw new Error('NO_INTERNET');
++      }
++
++      if (!isTimeoutError(error) || attempt === maxRetries) {
++        throw error;
++      }
++
++      await page.waitForTimeout(1500);
++    }
++  }
++
++  throw lastError;
++}
++
++async function applyResourceBlocking(page) {
++  await page.route('**/*', (route) => {
++    const resourceType = route.request().resourceType();
++
++    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
++      route.abort();
++      return;
++    }
++
++    route.continue();
++  });
++}
++
++function unfoldICS(content) {
++  return String(content || '').replace(/\r?\n[ \t]/g, '');
++}
++
++function unescapeICSText(value) {
++  return String(value || '')
++    .replace(/\\n/g, '\n')
++    .replace(/\\,/g, ',')
++    .replace(/\\;/g, ';')
++    .replace(/\\\\/g, '\\')
++    .trim();
++}
++
++function parseICSDate(str) {
++  if (!str) return null;
++  const d = String(str).replace(/[TZ]/g, '');
++  if (d.length < 8) return null;
++
++  try {
++    return new Date(
++      Number(d.slice(0, 4)),
++      Number(d.slice(4, 6)) - 1,
++      Number(d.slice(6, 8)),
++      d.length >= 10 ? Number(d.slice(8, 10)) : 0,
++      d.length >= 12 ? Number(d.slice(10, 12)) : 0,
++    ).toISOString();
++  } catch (_error) {
++    return null;
++  }
++}
++
++function parseICS(content) {
++  const events = [];
++  const blocks = unfoldICS(content).split('BEGIN:VEVENT');
++
++  for (const block of blocks.slice(1)) {
++    const get = (field) => {
++      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
++      return match ? unescapeICSText(match[1]) : '';
++    };
++    const inicio = parseICSDate(get('DTSTART'));
++
++    if (!inicio) {
++      continue;
++    }
++
++    events.push({
++      titulo: get('SUMMARY') || 'Evento',
++      inicio,
++      fin: parseICSDate(get('DTEND')),
++      descripcion: get('DESCRIPTION'),
++      ubicacion: get('LOCATION'),
++      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
++    });
++  }
++
++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++}
++
++function parseDateText(text) {
++  const normalized = String(text || '').trim();
++
++  if (!normalized) {
++    return null;
++  }
++
++  const nativeDate = new Date(normalized);
++  if (!Number.isNaN(nativeDate.getTime())) {
++    return nativeDate.toISOString();
++  }
++
++  const spanishMatch = normalized
++    .toLowerCase()
++    .normalize('NFD')
++    .replace(/[\u0300-\u036f]/g, '')
++    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
++
++  if (spanishMatch) {
++    const day = Number(spanishMatch[1]);
++    const month = SPANISH_MONTHS[spanishMatch[2]];
++    const year = Number(spanishMatch[3]);
++
++    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
++      return new Date(year, month, day).toISOString();
++    }
++  }
++
++  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
++  if (numericMatch) {
++    const day = Number(numericMatch[1]);
++    const month = Number(numericMatch[2]) - 1;
++    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
++    return new Date(year, month, day).toISOString();
++  }
++
++  return null;
++}
++
++function normalizeEvent(event) {
++  return {
++    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
++    inicio: event?.inicio || new Date().toISOString(),
++    fin: event?.fin || null,
++    descripcion: String(event?.descripcion || '').trim(),
++    ubicacion: String(event?.ubicacion || '').trim(),
++    categoria: String(event?.categoria || 'General').trim() || 'General',
++  };
++}
++
++async function tryDownloadICS(page) {
++  const downloadPath = getTempPath();
++
++  try {
++    const client = await page.context().newCDPSession(page);
++    await client.send('Page.setDownloadBehavior', {
++      behavior: 'allow',
++      downloadPath,
++    });
++  } catch (_error) {
++    // Download behavior is best-effort; DOM fallback still works.
++  }
++
++  const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
++  const downloadButton = await page
++    .$('a[href*=".ics"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario"), button:has-text("Descargar"), a:has-text("Descargar")')
++    .catch(() => null);
++
++  if (!downloadButton) {
++    return null;
++  }
++
++  await downloadButton.click().catch(() => {});
++  const download = await downloadPromise;
++
++  if (!download) {
++    return null;
++  }
++
++  const tmpPath = path.join(downloadPath, 'itson-cal.ics');
++  discardFile(tmpPath);
++  await download.saveAs(tmpPath);
++
++  const raw = fs.readFileSync(tmpPath, 'utf8');
++  if (!raw.includes('BEGIN:VCALENDAR')) {
++    return null;
++  }
++
++  return parseICS(raw);
++}
++
++async function scrapeDOMEvents(page) {
++  await page.waitForTimeout(3000);
++
++  const events = await page.evaluate(() => {
++    const rows = document.querySelectorAll(
++      'tr[data-event], .evento, .event, [class*="evento"], [class*="calendar-event"], ' +
++        'li[class*="event"], .fc-event, .item-evento',
++    );
++
++    if (rows.length) {
++      return Array.from(rows)
++        .map((el) => ({
++          titulo: (
++            el.querySelector('[class*="titulo"],[class*="title"],h3,h4,strong,td:nth-child(2)')
++              ?.textContent || el.textContent
++          )
++            .trim()
++            .slice(0, 150),
++          fechaTexto:
++            el.querySelector('[class*="fecha"],[class*="date"],time,td:nth-child(1)')
++              ?.textContent?.trim() || '',
++          categoria:
++            el.querySelector('[class*="categ"],[class*="tipo"],[class*="tag"]')
++              ?.textContent?.trim() || 'General',
++          descripcion:
++            el.querySelector('[class*="desc"],[class*="detalle"]')?.textContent?.trim() || '',
++        }))
++        .filter((event) => event.titulo && event.titulo.length > 2);
++    }
++
++    const tables = document.querySelectorAll('table');
++    const results = [];
++
++    tables.forEach((table) => {
++      table.querySelectorAll('tr').forEach((tr) => {
++        const cells = tr.querySelectorAll('td');
++        if (cells.length >= 2) {
++          results.push({
++            titulo: cells[1]?.textContent?.trim() || cells[0]?.textContent?.trim(),
++            fechaTexto: cells[0]?.textContent?.trim() || '',
++            categoria: cells[2]?.textContent?.trim() || 'General',
++            descripcion: '',
++          });
++        }
++      });
++    });
++
++    return results.filter((event) => event.titulo && event.titulo.length > 2);
++  });
++
++  return events
++    .map((event) =>
++      normalizeEvent({
++        titulo: event.titulo,
++        inicio: parseDateText(event.fechaTexto) || new Date().toISOString(),
++        fin: null,
++        categoria: event.categoria,
++        descripcion: event.descripcion,
++        ubicacion: '',
++      }),
++    )
++    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++}
++
++async function scrapeCalendario() {
++  const browser = await chromium.launch({ headless: true });
++
++  try {
++    const page = await browser.newPage();
++    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
++    await applyResourceBlocking(page);
++    await gotoWithRetry(page, CALENDARIO_URL, {
++      waitUntil: 'domcontentloaded',
++      timeout: PAGE_TIMEOUT_MS,
++    });
++
++    const icsEvents = await tryDownloadICS(page);
++    if (Array.isArray(icsEvents) && icsEvents.length > 0) {
++      return { events: icsEvents.map(normalizeEvent), timestamp: Date.now(), fromCache: false };
++    }
++
++    const domEvents = await scrapeDOMEvents(page);
++    return { events: domEvents, timestamp: Date.now(), fromCache: false };
++  } finally {
++    await browser.close();
++  }
++}
++
++async function run() {
++  const cached = readCalendarioCache();
++
++  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
++    return {
++      ...cached,
++      fromCache: true,
++    };
++  }
++
++  try {
++    const result = await scrapeCalendario();
++    const cachedPayload = writeCalendarioCache(result);
++    return {
++      ...cachedPayload,
++      fromCache: false,
++    };
++  } catch (error) {
++    if (error?.message === 'NO_INTERNET') {
++      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
++    }
++
++    return {
++      error: error?.message
++        ? `Falló la extracción del calendario escolar: ${error.message}`
++        : 'Falló la extracción del calendario escolar por un error no identificado.',
++    };
++  }
++}
++
++module.exports = {
++  clearCache,
++  getCalendarioCachePath,
++  parseDateText,
++  parseICS,
++  parseICSDate,
++  run,
++};
+```
+
+### `electron/handlers/horario.js`
+```diff
+diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
+index 45995c1..d957056 100644
+--- a/electron/handlers/horario.js
++++ b/electron/handlers/horario.js
+@@ -913,6 +913,61 @@ async function loginToCIA(page, user, password) {
+   return null;
+ }
+ 
++async function tryExtractStudentName(page) {
++  const selectors = [
++    '#ctl00_cLabel_nombre',
++    '.user-name',
++    '#user-name',
++    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
++    '.navbar-text',
++    'span[id*="Name"]',
++  ];
++
++  for (const selector of selectors) {
++    try {
++      const element = await page.$(selector);
++
++      if (!element) {
++        continue;
++      }
++
++      const text = normalizeWhitespace(await element.textContent());
++      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
++        return text;
++      }
++    } catch (_error) {
++      // Continue with the next selector.
++    }
++  }
++
++  try {
++    const bodyText = await page.evaluate(() => document.body?.innerText || '');
++    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
++    if (match) {
++      return normalizeWhitespace(match[1]);
++    }
++  } catch (_error) {
++    // Silent fallback.
++  }
++
++  return null;
++}
++
++async function persistStudentNameFromCIA(page) {
++  const nombre = await tryExtractStudentName(page);
++
++  if (!nombre) {
++    return;
++  }
++
++  try {
++    const { saveStudentName } = require('./settings');
++    await saveStudentName(nombre);
++  } catch (_error) {
++    // Student name persistence must never block horario scraping.
++  }
++}
++
+ async function getTargetContentFrame(page, timeout = 25_000) {
+   return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
+ }
+@@ -2413,6 +2468,7 @@ async function scrapeHorario(controller = {}) {
+       return loginResult;
+     }
+ 
++    await persistStudentNameFromCIA(page);
+     await applyResourceBlocking(page);
+     let scheduleFrame;
+     try {
+@@ -2427,6 +2483,7 @@ async function scrapeHorario(controller = {}) {
+         if (retryLogin?.error) {
+           return retryLogin;
+         }
++        await persistStudentNameFromCIA(page);
+         scheduleFrame = await openHorarioPage(page);
+       } else {
+         throw error;
+```
+
+### `electron/handlers/settings.js`
+```diff
+diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
+index 0b6f430..cdefc37 100644
+--- a/electron/handlers/settings.js
++++ b/electron/handlers/settings.js
+@@ -26,6 +26,7 @@ function getSettings() {
+     ciaUser: process.env.CIA_USER || '',
+     hasCIAPassword: Boolean(process.env.CIA_PASS),
+     notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
++    studentName: process.env.STUDENT_NAME || '',
+   };
+ }
+ 
+@@ -96,6 +97,30 @@ function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore
+   }
+ }
+ 
++async function saveStudentName(name) {
++  try {
++    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
++
++    if (!normalizedName) {
++      return { success: false, error: 'Nombre de estudiante vacío.' };
++    }
++
++    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
++    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);
++
++    const envPath = getEnvFilePath();
++    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
++    process.env.STUDENT_NAME = normalizedName;
++
++    return { success: true };
++  } catch (error) {
++    return {
++      success: false,
++      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
++    };
++  }
++}
++
+ function registerSettingsHandlers() {
+   ipcMain.handle('settings:get', async () => getSettings());
+   ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
+@@ -105,5 +130,6 @@ module.exports = {
+   getEnvFilePath,
+   getSettings,
+   registerSettingsHandlers,
++  saveStudentName,
+   saveSettings,
+ };
+```
+
+### `electron/main.js`
+```diff
+diff --git a/electron/main.js b/electron/main.js
+index af41ff2..b00bba1 100644
+--- a/electron/main.js
++++ b/electron/main.js
+@@ -8,6 +8,7 @@ const { registerFileHandlers } = require('./handlers/files');
+ const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
+ const { registerSettingsHandlers } = require('./handlers/settings');
+ const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
++const calendarioHandler = require('./handlers/calendario');
+ 
+ const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
+ const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
+@@ -57,6 +58,8 @@ app.whenReady().then(() => {
+   registerFileHandlers();
+   registerSettingsHandlers();
+   registerNotificationHandlers();
++  ipcMain.handle('calendario:run', () => calendarioHandler.run());
++  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
+   ipcMain.removeHandler('shell:open-external');
+   ipcMain.handle('shell:open-external', async (_event, url) => {
+     if (url && typeof url === 'string' && url.startsWith('http')) {
+@@ -72,11 +75,13 @@ app.whenReady().then(() => {
+     clearActivitiesCache();
+     clearHorarioCache();
+     clearCIACache();
++    calendarioHandler.clearCache();
+ 
+-    const [actividades, horario, calificaciones] = await Promise.allSettled([
++    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
+       getActivitiesWithCache(),
+       getHorarioWithCache(),
+       getCalificacionesWithCache(),
++      calendarioHandler.run(),
+     ]);
+ 
+     return {
+@@ -90,6 +95,10 @@ app.whenReady().then(() => {
+         calificaciones.status === 'fulfilled'
+           ? calificaciones.value
+           : { error: calificaciones.reason?.message },
++      calendario:
++        calendario.status === 'fulfilled'
++          ? calendario.value
++          : { error: calendario.reason?.message },
+     };
+   });
+   createMainWindow();
+```
+
+### `electron/preload.js`
+```diff
+diff --git a/electron/preload.js b/electron/preload.js
+index 05a306d..48a4dff 100644
+--- a/electron/preload.js
++++ b/electron/preload.js
+@@ -5,8 +5,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
+   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+   runCIA: () => ipcRenderer.invoke('cia:run'),
+   runHorario: () => ipcRenderer.invoke('horario:run'),
++  runCalendario: () => ipcRenderer.invoke('calendario:run'),
+   clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
+   clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
++  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
+   saveHorarioLink: (numeroClase, link) =>
+     ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
+   getSettings: () => ipcRenderer.invoke('settings:get'),
+```
+
+### `generate-report.js`
+```diff
+diff --git a/generate-report.js b/generate-report.js
+index fa9b68e..a0779f8 100644
+--- a/generate-report.js
++++ b/generate-report.js
+@@ -19,35 +19,45 @@ const MAX_DIFF_BYTES = 150 * 1024;
+ 
+ const VERIFICATION = {
+   buildStatus: 'PASS',
+-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
+-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+-  verificationOutput: `> dvpotro@0.1.0 build
++  testsRun: 'npm run build + handler/preload/settings static checks + calendario empty-state static check + node syntax checks',
++  verificationCmd: 'node calendario/settings/preload checks; npm run build; node -c electron handlers; node Calendario empty-state check',
++  verificationOutput: `RED checks before implementation:
++calendario handler missing: MODULE_NOT_FOUND
++studentName field: false
++runCalendario exposed: false
++
++GREEN checks after implementation:
++$ node -e "const c = require('./electron/handlers/calendario'); console.log('run:', typeof c.run); console.log('clearCache:', typeof c.clearCache);"
++run: function
++clearCache: function
++
++$ node -e "require('dotenv').config(); const s = require('./electron/handlers/settings'); const st = s.getSettings ? s.getSettings() : null; console.log('studentName field:', 'studentName' in (st||{}));"
++studentName field: true
++
++$ node -e "const fs = require('fs'); const pre = fs.readFileSync('./electron/preload.js','utf-8'); console.log('runCalendario exposed:', pre.includes('runCalendario'));"
++runCalendario exposed: true
++
++$ npm run build
++> dvpotro@0.1.0 build
+ > vite build
+ 
+ vite v5.4.21 building for production...
+-✓ 1767 modules transformed.
+-dist/index.html                        0.47 kB │ gzip:  0.30 kB
+-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
+-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
+-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
+-✓ built in 4.93s
++transforming...
++✓ 1768 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-B1C-mb04.css             31.45 kB │ gzip:  6.71 kB
++dist/assets/index-Bydx8v6A.js              314.96 kB │ gzip: 86.03 kB
++✓ built in 14.62s
+ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+ 
+-> dvpotro@0.1.0 dist:dir
+-> vite build && electron-builder --dir
+-
+-✓ 1767 modules transformed.
+-✓ built in 4.83s
+-• electron-builder version=26.8.1
+-• loaded configuration file=package.json (build field)
+-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
+-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
+-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
+-
+-branding verification OK
+-active branding reference scan OK: no old visible references
+-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
+-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
++$ node -c electron/handlers/calendario.js; node -c electron/handlers/settings.js; node -c electron/main.js; node -c electron/preload.js
++PASS
++
++$ node -e "const fs=require('fs'); const src=fs.readFileSync('./src/pages/Calendario.jsx','utf8'); console.log('calendar empty safe:', src.includes('calendarData = { events: [] }') && src.includes('Array.isArray(calendarData?.events)'));"
++calendar empty safe: true`,
+ };
+ 
+ function ensureReportsDir() {
+```
+
+### `reports/report_065.md`
+```diff
+diff --git a/reports/report_065.md b/reports/report_065.md
+new file mode 100644
+index 0000000..98c1356
+--- /dev/null
++++ b/reports/report_065.md
+@@ -0,0 +1,929 @@
++# Report 065
++**Fecha:** 2026-05-31 18:33  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
++**Archivos modificados:** 4
++
++## Archivos modificados
++- `generate-report.js` — archivo actualizado en esta tarea
++- `src/App.jsx` — archivo actualizado en esta tarea
++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| generate-report.js | 19 | 21 |
++| src/App.jsx | 120 | 30 |
++| src/components/Onboarding.jsx | 2 | 1 |
++| src/components/Sidebar.jsx | 308 | 134 |
++
++## Resumen
++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `generate-report.js`
++```diff
++diff --git a/generate-report.js b/generate-report.js
++index fa9b68e..90a2816 100644
++--- a/generate-report.js
+++++ b/generate-report.js
++@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
++ 
++ const VERIFICATION = {
++   buildStatus: 'PASS',
++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+++  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
+++  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
++   verificationOutput: `> dvpotro@0.1.0 build
++ > vite build
++ 
++ vite v5.4.21 building for production...
+++transforming...
++ ✓ 1767 modules transformed.
++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
++-✓ built in 4.93s
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+++✓ built in 8.70s
++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++ 
++-> dvpotro@0.1.0 dist:dir
++-> vite build && electron-builder --dir
+++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
++ 
++-✓ 1767 modules transformed.
++-✓ built in 4.83s
++-• electron-builder version=26.8.1
++-• loaded configuration file=package.json (build field)
++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
++-
++-branding verification OK
++-active branding reference scan OK: no old visible references
++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+++Dist logo assets:
+++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+++
+++Confirmed:
+++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+++- Dist logo asset is under 20KB.
+++- handleSyncAll only adds runCIA when hasFinales is true.
+++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
++ };
++ 
++ function ensureReportsDir() {
++```
++
++### `src/App.jsx`
++```diff
++diff --git a/src/App.jsx b/src/App.jsx
++index 137c482..b672732 100644
++--- a/src/App.jsx
+++++ b/src/App.jsx
++@@ -1,4 +1,4 @@
++-import { useCallback, useEffect, useRef, useState } from 'react';
+++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
++ import Sidebar from './components/Sidebar';
++ import Onboarding from './components/Onboarding';
++ import TaskPanel from './components/TaskPanel';
++@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
++ import Horario from './pages/Horario';
++ import Calificaciones from './pages/Calificaciones';
++ import Ajustes from './pages/Ajustes';
++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
++ 
++ const pageRegistry = {
++   activities: {
++@@ -44,7 +44,7 @@ function App() {
++   const [loading, setLoading] = useState(false);
++   const [loadingHorario, setLoadingHorario] = useState(false);
++   const [loadingCIA, setLoadingCIA] = useState(false);
++-  const [syncingAll, setSyncingAll] = useState(false);
+++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
++   const [syncingModules, setSyncingModules] = useState([]);
++   const [error, setError] = useState('');
++   const [errorHorario, setErrorHorario] = useState('');
++@@ -59,6 +59,7 @@ function App() {
++   const [horarioCargado, setHorarioCargado] = useState(false);
++   const [ciaCargado, setCiaCargado] = useState(false);
++   const [studentName, setStudentName] = useState('');
+++  const [settingsData, setSettingsData] = useState({});
++ 
++   const initializedRef = useRef(false);
++   const nearExpiryRefreshLaunchedRef = useRef(false);
++@@ -75,6 +76,21 @@ function App() {
++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
++       ),
++   );
+++  const proximaEntrega = useMemo(() => {
+++    const pending = (activities || []).filter(
+++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++    );
+++
+++    if (!pending.length) {
+++      return null;
+++    }
+++
+++    return [...pending].sort((left, right) => {
+++      if (!left.fechaLimite) return 1;
+++      if (!right.fechaLimite) return -1;
+++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+++    })[0];
+++  }, [activities]);
++ 
++   const addSyncingModule = (moduleId) => {
++     setSyncingModules((previous) => {
++@@ -135,6 +151,9 @@ function App() {
++       horario: 'horario',
++       calificaciones: 'calificaciones',
++       ajustes: 'settings',
+++      calendario: 'activities',
+++      notifications: 'activities',
+++      notificaciones: 'activities',
++     };
++ 
++     const nextPage = pageAliases[pageId] || pageId;
++@@ -156,6 +175,7 @@ function App() {
++ 
++     try {
++       const settings = await api.getSettings();
+++      setSettingsData(settings || {});
++       const hasUser = Boolean(settings?.user?.trim());
++       const hasPassword = Boolean(settings?.hasPassword);
++       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
++@@ -167,6 +187,7 @@ function App() {
++       initializedRef.current = false;
++       nearExpiryRefreshLaunchedRef.current = false;
++     } catch (_error) {
+++      setSettingsData({});
++       setStudentName('');
++       setShowOnboarding(false);
++     } finally {
++@@ -430,50 +451,109 @@ function App() {
++   };
++ 
++   const handleSyncAll = async () => {
++-    if (!api?.syncAll) {
+++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+++
+++    if (syncState.status === 'syncing' || !scraperApi) {
++       return;
++     }
++ 
++-    setSyncingAll(true);
+++    setSyncState((current) => ({ ...current, status: 'syncing' }));
++     addSyncingModule('activities');
++     addSyncingModule('horario');
++-    addSyncingModule('calificaciones');
+++    if (hasFinales) {
+++      addSyncingModule('calificaciones');
+++    }
++ 
++     try {
++-      const result = await api.syncAll();
+++      const calls = [
+++        { id: 'activities', promise: scraperApi.runScraper?.() },
+++        { id: 'horario', promise: scraperApi.runHorario?.() },
+++      ];
++ 
++-      if (result?.actividades?.activities) {
++-        setActivities(result.actividades.activities);
++-        if (result.actividades?.timestamp) {
++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
++-        }
+++      if (hasFinales) {
+++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
++       }
++ 
++-      if (result?.horario?.materias) {
++-        setHorario({
++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
++-          diasConClases: Array.isArray(result.horario.diasConClases)
++-            ? result.horario.diasConClases
++-            : [],
++-        });
++-        if (result.horario?.timestamp) {
++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+++      const results = await Promise.allSettled(calls.map((call) => call.promise));
+++      let hasErrors = false;
+++
+++      results.forEach((result, index) => {
+++        const moduleId = calls[index]?.id;
+++
+++        if (result.status === 'rejected') {
+++          hasErrors = true;
+++          return;
++         }
++-      }
++ 
++-      if (result?.calificaciones?.materias) {
++-        setCalificaciones(result.calificaciones.materias);
++-        if (result.calificaciones?.timestamp) {
++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+++        const response = result.value;
+++
+++        if (response?.error) {
+++          hasErrors = true;
+++
+++          if (moduleId === 'activities') {
+++            setErrorCode(response.error);
+++            setError(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'horario') {
+++            setErrorHorario(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'calificaciones') {
+++            setErrorCIACode(response.error);
+++            setErrorCIA(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          return;
++         }
++-      }
+++
+++        if (moduleId === 'activities') {
+++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+++          setActivities(activitiesList);
+++          setError('');
+++          setErrorCode('');
+++          if (response?.timestamp) {
+++            setLastSyncAt(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'horario') {
+++          setHorario({
+++            materias: Array.isArray(response?.materias) ? response.materias : [],
+++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+++          });
+++          setErrorHorario('');
+++          if (response?.timestamp) {
+++            setLastSyncHorario(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'calificaciones') {
+++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+++          setCalificaciones(materiasList);
+++          setErrorCIA('');
+++          setErrorCIACode('');
+++          if (response?.timestamp) {
+++            setLastSyncCIA(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++      });
+++
+++      const nextStatus = hasErrors ? 'error' : 'done';
+++      setSyncState({ status: nextStatus, lastSync: new Date() });
+++      setTimeout(
+++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+++        hasErrors ? 4000 : 3000,
+++      );
++     } catch (_error) {
++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+++      setSyncState((current) => ({ ...current, status: 'error' }));
+++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
++     } finally {
++       removeSyncingModule('activities');
++       removeSyncingModule('horario');
++-      removeSyncingModule('calificaciones');
++-      setSyncingAll(false);
+++      if (hasFinales) {
+++        removeSyncingModule('calificaciones');
+++      }
++     }
++   };
++ 
++@@ -556,10 +636,19 @@ function App() {
++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
++         <Sidebar
++           activePage={activePage}
+++          activities={activities}
+++          calendarCount={0}
++           diasConClases={horario?.diasConClases ?? []}
+++          errorHorario={errorHorario}
++           hasFinales={hasFinales}
++           horario={horario?.materias ?? []}
+++          horarioData={horario}
+++          onSyncAll={handleSyncAll}
++           onNavigate={handleNavigate}
+++          proximaEntrega={proximaEntrega}
+++          settingsData={settingsData}
+++          studentName={studentName}
+++          syncState={syncState}
++         />
++         {!settingsReady ? (
++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
++@@ -617,3 +706,4 @@ function App() {
++ }
++ 
++ export default App;
+++
++```
++
++### `src/components/Onboarding.jsx`
++```diff
++diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
++index 3e820a2..7bca3ac 100644
++--- a/src/components/Onboarding.jsx
+++++ b/src/components/Onboarding.jsx
++@@ -1,5 +1,5 @@
++ import { ArrowRight } from 'lucide-react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ 
++ function Onboarding({ onNavigate }) {
++   return (
++@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
++ }
++ 
++ export default Onboarding;
+++
++```
++
++### `src/components/Sidebar.jsx`
++```diff
++diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
++index c7458cb..1aef7a5 100644
++--- a/src/components/Sidebar.jsx
+++++ b/src/components/Sidebar.jsx
++@@ -1,216 +1,390 @@
++-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
++-import { useEffect, useState } from 'react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import {
+++  AlertCircle,
+++  Bell,
+++  BookOpen,
+++  CalendarDays,
+++  CheckCircle,
+++  Clock,
+++  Info,
+++  Loader2,
+++  RefreshCw,
+++  Settings,
+++} from 'lucide-react';
+++import { useEffect, useMemo, useState } from 'react';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ import { getNextClass } from '../utils/horario.js';
++ 
++-const navigationItems = [
++-  { id: 'activities', label: 'Actividades', icon: ListChecks },
++-  { id: 'horario', label: 'Horario', icon: Calendar },
++-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
++-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
+++const NAV_ITEMS = [
+++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
+++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
+++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
+++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
+++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
++ ];
++ 
++-function getNextClassStatus(nextClass) {
++-  if (!nextClass) {
++-    return '';
+++function normDate(value) {
+++  const date = value ? new Date(value) : null;
+++  return date && !Number.isNaN(date.getTime()) ? date : null;
+++}
+++
+++function formatDayShort(date = new Date()) {
+++  return date.toLocaleDateString('es-MX', {
+++    weekday: 'short',
+++    day: 'numeric',
+++    month: 'short',
+++  });
+++}
+++
+++function formatTime(date) {
+++  return date.toLocaleTimeString('es-MX', {
+++    hour: '2-digit',
+++    minute: '2-digit',
+++  });
+++}
+++
+++function getInitials(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
++   }
++ 
++-  if (!nextClass.esHoy) {
++-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
+++  return clean.slice(0, 2).toUpperCase() || 'DV';
+++}
+++
+++function formatDisplayName(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (/^ID\s+\w+/i.test(clean)) {
+++    return clean;
+++  }
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0]} ${parts[1][0]}.`;
+++  }
+++
+++  return clean;
+++}
+++
+++function formatRelativeDeadline(fechaLimite) {
+++  const deadline = normDate(fechaLimite);
+++
+++  if (!deadline) {
+++    return 'Fecha pendiente';
++   }
++ 
++-  if (nextClass.minutosRestantes <= 30) {
+++  const now = new Date();
+++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
+++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
+++  const diffDays = Math.round((target - today) / 86400000);
+++  const time = formatTime(deadline);
+++
+++  if (diffDays < 0) return 'Vencida';
+++  if (diffDays === 0) return `Hoy · ${time}`;
+++  if (diffDays === 1) return `Mañana · ${time}`;
+++  return `En ${diffDays} días`;
+++}
+++
+++function getClassStatus(nextClass) {
+++  if (!nextClass) return '';
+++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
+++
+++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
++     return `En ${nextClass.minutosRestantes} min`;
++   }
++ 
++-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
+++  if (nextClass.esHoy) {
+++    return start;
+++  }
+++
+++  return `${nextClass.dia || 'Próxima'} · ${start}`;
++ }
++ 
++-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
+++function getSyncPresentation(syncState = {}) {
+++  if (syncState.status === 'syncing') {
+++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
+++  }
+++
+++  if (syncState.status === 'done') {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  if (syncState.status === 'error') {
+++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
+++  }
+++
+++  if (syncState.lastSync) {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
+++}
+++
+++function Sidebar({
+++  activePage,
+++  activities = [],
+++  calendarCount = 0,
+++  diasConClases = [],
+++  errorHorario = '',
+++  hasFinales = false,
+++  horario = [],
+++  horarioData = null,
+++  onNavigate,
+++  onSyncAll,
+++  proximaEntrega = null,
+++  settingsData = {},
+++  studentName = '',
+++  syncState = { status: 'idle', lastSync: null },
+++}) {
++   const [nextClass, setNextClass] = useState(null);
++-  const visibleNavigationItems = navigationItems.filter(
++-    (item) => item.id !== 'calificaciones' || hasFinales === true,
++-  );
++-  const hasHorario = Array.isArray(horario) && horario.length > 0;
+++  const materiasHorario = Array.isArray(horarioData?.materias)
+++    ? horarioData.materias
+++    : (Array.isArray(horario) ? horario : []);
+++  const pendingCount = activities.filter(
+++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++  ).length;
+++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
+++  const hasHorario = materiasHorario.length > 0;
+++  const syncInfo = getSyncPresentation(syncState);
+++  const SyncIcon = syncInfo.Icon;
+++  const userId = settingsData?.ciaUser || settingsData?.user || '';
+++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
+++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
+++  const initials = getInitials(hasRealStudentName ? studentName : userId);
++ 
++   useEffect(() => {
++-    if (!hasHorario) {
++-      setNextClass(null);
++-      return undefined;
++-    }
++-
++     const updateNextClass = () => {
++-      setNextClass(getNextClass(horario, diasConClases));
+++      setNextClass(getNextClass(materiasHorario, diasConClases));
++     };
++ 
++     updateNextClass();
++     const intervalId = setInterval(updateNextClass, 60 * 1000);
++ 
++     return () => clearInterval(intervalId);
++-  }, [hasHorario, horario, diasConClases]);
+++  }, [materiasHorario, diasConClases]);
+++
+++  const navItems = useMemo(() => NAV_ITEMS, []);
+++
+++  const getBadge = (itemId) => {
+++    if (itemId === 'activities' && pendingCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
+++          {pendingCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
+++          {calendarCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'horario') {
+++      if (errorHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
+++      }
+++      if (hasHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
+++      }
+++    }
++ 
++-  const handleOpenMeetLink = () => {
++-    if (!nextClass?.meetLink) {
++-      return;
+++    if (itemId === 'notifications' && delayedCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
+++          {delayedCount}
+++        </span>
+++      );
++     }
++ 
++-    window.scraperApp?.openExternal?.(nextClass.meetLink);
+++    return null;
++   };
++ 
+++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
+++
++   return (
++     <aside
++-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
++       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
++     >
++-      <div className="mb-8">
+++      <header className="px-4 pb-3.5 pt-4">
++         <div className="flex items-center gap-3">
++-          <span
++-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
++-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
++-          >
++-            <img
++-              src={dvpotroLogo}
++-              alt="DVPotro"
++-              className="h-full w-full object-contain"
++-              draggable="false"
++-            />
++-          </span>
+++          <img
+++            src={dvpotroLogo}
+++            alt="DVPotro"
+++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
+++            draggable="false"
+++          />
++           <div className="min-w-0">
++-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
+++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
++               DVPotro
++             </p>
++-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
+++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
++               ITSON
++             </p>
++           </div>
++         </div>
++-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
++-          Academic command center
++-        </p>
++-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
++-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
++-        </p>
++-      </div>
+++      </header>
++ 
++-      <nav className="space-y-2">
++-        {visibleNavigationItems.map((item) => {
++-          const isActive = item.id === activePage;
+++      <nav className="px-2 pb-2">
+++        {navItems.map((item) => {
++           const Icon = item.icon;
+++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
+++          const badge = getBadge(item.id);
++ 
++           return (
++             <button
++               key={item.id}
++               type="button"
++-              onClick={() => onNavigate(item.id)}
++-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
++-                isActive
++-                  ? ''
++-                  : ''
++-              }`}
+++              onClick={() => onNavigate?.(item.target)}
+++              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
++               style={
++                 isActive
++-                  ? { background: 'var(--accent)', color: '#fff' }
++-                  : {
++-                    background: 'var(--bg-secondary)',
++-                    color: 'var(--text-muted)',
++-                  }
+++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
+++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
++               }
++               onMouseEnter={(event) => {
++                 if (!isActive) {
++-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
+++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
++                   event.currentTarget.style.color = 'var(--text-strong)';
++                 }
++               }}
++               onMouseLeave={(event) => {
++                 if (!isActive) {
++-                  event.currentTarget.style.background = 'var(--bg-secondary)';
+++                  event.currentTarget.style.background = 'transparent';
++                   event.currentTarget.style.color = 'var(--text-muted)';
++                 }
++               }}
++             >
++-              <span className="flex items-center gap-3">
++-                <Icon className="h-4 w-4" />
++-                {item.label}
++-              </span>
++-              <span
++-                className="text-xs uppercase tracking-[0.25em]"
++-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
++-              >
++-                {isActive ? 'Live' : 'Idle'}
+++              <span className="flex min-w-0 items-center gap-3">
+++                <Icon className="h-4 w-4 shrink-0" />
+++                <span className="truncate">{item.label}</span>
++               </span>
+++              {badge}
++             </button>
++           );
++         })}
++       </nav>
++ 
++-      {hasHorario ? (
++-        <div
++-          className="mt-auto border-t pt-4"
++-          style={{ borderColor: 'var(--border-subtle)' }}
+++      <section
+++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+++      >
+++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+++          Sincronización
+++        </p>
+++        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
+++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
+++          <span className="font-medium">{syncInfo.text}</span>
+++        </div>
+++        {syncTimestamp ? (
+++          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++            Última sincronización · {syncTimestamp}
+++          </p>
+++        ) : null}
+++        <button
+++          type="button"
+++          onClick={onSyncAll}
+++          disabled={syncState.status === 'syncing'}
+++          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
+++          style={
+++            syncState.status === 'syncing'
+++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
+++              : { background: 'var(--itson-blue, var(--accent))' }
+++          }
++         >
++-          <div
++-            className="rounded-2xl border p-3"
++-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
++-          >
++-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
++-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
++-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
+++          {syncState.status === 'syncing' ? (
+++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
+++          ) : (
+++            <RefreshCw className="h-3.5 w-3.5" />
+++          )}
+++          Sincronizar todo
+++        </button>
+++        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
+++          Actualiza toda la información de la app
+++        </p>
+++      </section>
+++
+++      <section
+++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+++      >
+++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
+++          HOY · {formatDayShort(new Date())}
+++        </p>
+++
+++        <div className="mt-3">
+++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+++            Entrega
+++          </p>
+++          {proximaEntrega ? (
+++            <div className="mt-1 min-w-0">
+++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
+++                {proximaEntrega.nombre}
+++              </p>
+++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
+++              </p>
++             </div>
+++          ) : (
+++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
+++          )}
+++        </div>
++ 
++-            {nextClass ? (
++-              <div className="space-y-2">
++-                <div className="flex items-start justify-between gap-2">
++-                  <div className="min-w-0">
++-                    <p
++-                      className="truncate text-sm font-medium"
++-                      style={{ color: 'var(--text-strong)' }}
++-                      title={nextClass.materia}
++-                    >
++-                      {nextClass.materia}
++-                    </p>
++-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
++-                      {nextClass.hora} · {nextClass.salon}
++-                    </p>
++-                  </div>
++-
++-                  {nextClass.meetLink ? (
++-                    <button
++-                      type="button"
++-                      onClick={handleOpenMeetLink}
++-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
++-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
++-                      title="Abrir videollamada"
++-                    >
++-                      <ExternalLink className="h-3.5 w-3.5" />
++-                    </button>
++-                  ) : null}
++-                </div>
+++        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
++ 
+++        <div>
+++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
+++            Clase
+++          </p>
+++          {nextClass ? (
+++            <div className="mt-1 min-w-0">
+++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
+++                {nextClass.materia}
+++              </p>
+++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++                <span className="truncate">{nextClass.hora}</span>
++                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
++                   <span
++-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
++-                    style={{
++-                      background: 'var(--retrasada-bg)',
++-                      borderColor: 'var(--retrasada-border)',
++-                      color: 'var(--retrasada-text)',
++-                    }}
+++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
+++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
++                   >
++-                    {getNextClassStatus(nextClass)}
+++                    {getClassStatus(nextClass)}
++                   </span>
++                 ) : (
++-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
++-                    {getNextClassStatus(nextClass)}
++-                  </p>
+++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
++                 )}
++               </div>
++-            ) : (
++-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
++-                Sin clases próximas
++-              </p>
++-            )}
++-          </div>
+++            </div>
+++          ) : (
+++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
+++          )}
+++        </div>
+++      </section>
+++
+++      <footer
+++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
+++        style={{ borderColor: 'var(--border)' }}
+++      >
+++        <div
+++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
+++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
+++        >
+++          {initials}
+++        </div>
+++        <div className="min-w-0">
+++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
+++            {profileName}
+++          </p>
+++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
+++            {userId || 'Sin ID configurado'}
+++          </p>
++         </div>
++-      ) : null}
+++      </footer>
++     </aside>
++   );
++ }
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
++**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
++**Output de verificación:**
++```
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1767 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
++✓ built in 8.70s
++The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++
++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
++
++Dist logo assets:
++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
++
++Confirmed:
++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
++- Dist logo asset is under 20KB.
++- handleSyncAll only adds runCIA when hasFinales is true.
++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `src/App.jsx`
+```diff
+diff --git a/src/App.jsx b/src/App.jsx
+index 137c482..c6f5d3e 100644
+--- a/src/App.jsx
++++ b/src/App.jsx
+@@ -1,12 +1,13 @@
+-import { useCallback, useEffect, useRef, useState } from 'react';
++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+ import Sidebar from './components/Sidebar';
+ import Onboarding from './components/Onboarding';
+ import TaskPanel from './components/TaskPanel';
+ import Actividades from './pages/Actividades';
+ import Horario from './pages/Horario';
++import Calendario from './pages/Calendario';
+ import Calificaciones from './pages/Calificaciones';
+ import Ajustes from './pages/Ajustes';
+-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
+ 
+ const pageRegistry = {
+   activities: {
+@@ -19,6 +20,11 @@ const pageRegistry = {
+     description: 'Visualiza clases del semestre y enlaces de videollamada para materias en línea.',
+     component: Horario,
+   },
++  calendario: {
++    title: 'Calendario Escolar',
++    description: 'Consulta fechas académicas oficiales publicadas por ITSON.',
++    component: Calendario,
++  },
+   calificaciones: {
+     title: 'Calificaciones',
+     description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
+@@ -40,11 +46,13 @@ function App() {
+   const [settingsReady, setSettingsReady] = useState(false);
+   const [activities, setActivities] = useState([]);
+   const [horario, setHorario] = useState({ materias: [], diasConClases: [] });
++  const [calendarData, setCalendarData] = useState({ events: [], timestamp: null, error: null });
+   const [calificaciones, setCalificaciones] = useState([]);
+   const [loading, setLoading] = useState(false);
+   const [loadingHorario, setLoadingHorario] = useState(false);
++  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
+   const [loadingCIA, setLoadingCIA] = useState(false);
+-  const [syncingAll, setSyncingAll] = useState(false);
++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
+   const [syncingModules, setSyncingModules] = useState([]);
+   const [error, setError] = useState('');
+   const [errorHorario, setErrorHorario] = useState('');
+@@ -57,8 +65,10 @@ function App() {
+   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
+   const [actividadesCargado, setActividadesCargado] = useState(false);
+   const [horarioCargado, setHorarioCargado] = useState(false);
++  const [calendarCargado, setCalendarCargado] = useState(false);
+   const [ciaCargado, setCiaCargado] = useState(false);
+   const [studentName, setStudentName] = useState('');
++  const [settingsData, setSettingsData] = useState({});
+ 
+   const initializedRef = useRef(false);
+   const nearExpiryRefreshLaunchedRef = useRef(false);
+@@ -75,6 +85,30 @@ function App() {
+           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
+       ),
+   );
++  const proximaEntrega = useMemo(() => {
++    const pending = (activities || []).filter(
++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++    );
++
++    if (!pending.length) {
++      return null;
++    }
++
++    return [...pending].sort((left, right) => {
++      if (!left.fechaLimite) return 1;
++      if (!right.fechaLimite) return -1;
++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
++    })[0];
++  }, [activities]);
++  const calendarCount = useMemo(() => {
++    const now = Date.now();
++    const in30 = now + 30 * 24 * 60 * 60 * 1000;
++
++    return (calendarData.events || []).filter((event) => {
++      const time = new Date(event.inicio).getTime();
++      return Number.isFinite(time) && time >= now && time <= in30;
++    }).length;
++  }, [calendarData]);
+ 
+   const addSyncingModule = (moduleId) => {
+     setSyncingModules((previous) => {
+@@ -135,6 +169,9 @@ function App() {
+       horario: 'horario',
+       calificaciones: 'calificaciones',
+       ajustes: 'settings',
++      calendario: 'calendario',
++      notifications: 'activities',
++      notificaciones: 'activities',
+     };
+ 
+     const nextPage = pageAliases[pageId] || pageId;
+@@ -156,17 +193,21 @@ function App() {
+ 
+     try {
+       const settings = await api.getSettings();
++      setSettingsData(settings || {});
+       const hasUser = Boolean(settings?.user?.trim());
+       const hasPassword = Boolean(settings?.hasPassword);
+-      const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
++      const preferredIdentity =
++        settings?.studentName?.trim() || settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+       setStudentName(formatStudentDisplayName(preferredIdentity));
+       setShowOnboarding(!(hasUser || hasPassword));
+       setActividadesCargado(false);
+       setHorarioCargado(false);
++      setCalendarCargado(false);
+       setCiaCargado(false);
+       initializedRef.current = false;
+       nearExpiryRefreshLaunchedRef.current = false;
+     } catch (_error) {
++      setSettingsData({});
+       setStudentName('');
+       setShowOnboarding(false);
+     } finally {
+@@ -429,51 +470,175 @@ function App() {
+     }
+   };
+ 
++  const loadCalendar = async ({ clearCacheFirst = false, silent = false } = {}) => {
++    if (silent) {
++      addSyncingModule('calendario');
++    } else {
++      setIsCalendarSyncing(true);
++    }
++
++    try {
++      if (!api?.runCalendario) {
++        if (!silent) {
++          setCalendarData({
++            events: [],
++            timestamp: null,
++            error: 'DVPotro debe ejecutarse dentro de Electron.',
++          });
++        }
++        return;
++      }
++
++      if (clearCacheFirst && api.clearCalendarioCache) {
++        await api.clearCalendarioCache();
++      }
++
++      const result = await api.runCalendario();
++
++      if (result?.error) {
++        setCalendarData({ events: [], timestamp: null, error: result.error });
++        return;
++      }
++
++      setCalendarData({
++        events: Array.isArray(result?.events) ? result.events : [],
++        timestamp: result?.timestamp || null,
++        error: null,
++      });
++    } catch (error) {
++      setCalendarData({
++        events: [],
++        timestamp: null,
++        error: error?.message || 'No fue posible cargar el calendario escolar.',
++      });
++    } finally {
++      if (silent) {
++        removeSyncingModule('calendario');
++      } else {
++        setIsCalendarSyncing(false);
++      }
++    }
++  };
++
+   const handleSyncAll = async () => {
+-    if (!api?.syncAll) {
++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
++
++    if (syncState.status === 'syncing' || !scraperApi) {
+       return;
+     }
+ 
+-    setSyncingAll(true);
++    setSyncState((current) => ({ ...current, status: 'syncing' }));
+     addSyncingModule('activities');
+     addSyncingModule('horario');
+-    addSyncingModule('calificaciones');
++    addSyncingModule('calendario');
++    if (hasFinales) {
++      addSyncingModule('calificaciones');
++    }
+ 
+     try {
+-      const result = await api.syncAll();
++      const calls = [
++        { id: 'activities', promise: scraperApi.runScraper?.() },
++        { id: 'horario', promise: scraperApi.runHorario?.() },
++        { id: 'calendario', promise: scraperApi.runCalendario?.() },
++      ];
++
++      if (hasFinales) {
++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
++      }
++
++      const results = await Promise.allSettled(calls.map((call) => call.promise));
++      let hasErrors = false;
++
++      results.forEach((result, index) => {
++        const moduleId = calls[index]?.id;
+ 
+-      if (result?.actividades?.activities) {
+-        setActivities(result.actividades.activities);
+-        if (result.actividades?.timestamp) {
+-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
++        if (result.status === 'rejected') {
++          hasErrors = true;
++          return;
+         }
+-      }
+ 
+-      if (result?.horario?.materias) {
+-        setHorario({
+-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
+-          diasConClases: Array.isArray(result.horario.diasConClases)
+-            ? result.horario.diasConClases
+-            : [],
+-        });
+-        if (result.horario?.timestamp) {
+-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
++        const response = result.value;
++
++        if (response?.error) {
++          hasErrors = true;
++
++          if (moduleId === 'activities') {
++            setErrorCode(response.error);
++            setError(getFriendlyIVirtualError(response.error));
++          }
++
++          if (moduleId === 'horario') {
++            setErrorHorario(getFriendlyIVirtualError(response.error));
++          }
++
++          if (moduleId === 'calendario') {
++            setCalendarData({ events: [], timestamp: null, error: response.error });
++          }
++
++          if (moduleId === 'calificaciones') {
++            setErrorCIACode(response.error);
++            setErrorCIA(getFriendlyIVirtualError(response.error));
++          }
++
++          return;
+         }
+-      }
+ 
+-      if (result?.calificaciones?.materias) {
+-        setCalificaciones(result.calificaciones.materias);
+-        if (result.calificaciones?.timestamp) {
+-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
++        if (moduleId === 'activities') {
++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
++          setActivities(activitiesList);
++          setError('');
++          setErrorCode('');
++          if (response?.timestamp) {
++            setLastSyncAt(new Date(response.timestamp).toISOString());
++          }
+         }
+-      }
++
++        if (moduleId === 'horario') {
++          setHorario({
++            materias: Array.isArray(response?.materias) ? response.materias : [],
++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
++          });
++          setErrorHorario('');
++          if (response?.timestamp) {
++            setLastSyncHorario(new Date(response.timestamp).toISOString());
++          }
++        }
++
++        if (moduleId === 'calendario') {
++          setCalendarData({
++            events: Array.isArray(response?.events) ? response.events : [],
++            timestamp: response?.timestamp || null,
++            error: null,
++          });
++        }
++
++        if (moduleId === 'calificaciones') {
++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
++          setCalificaciones(materiasList);
++          setErrorCIA('');
++          setErrorCIACode('');
++          if (response?.timestamp) {
++            setLastSyncCIA(new Date(response.timestamp).toISOString());
++          }
++        }
++      });
++
++      const nextStatus = hasErrors ? 'error' : 'done';
++      setSyncState({ status: nextStatus, lastSync: new Date() });
++      setTimeout(
++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
++        hasErrors ? 4000 : 3000,
++      );
+     } catch (_error) {
+-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
++      setSyncState((current) => ({ ...current, status: 'error' }));
++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
+     } finally {
+       removeSyncingModule('activities');
+       removeSyncingModule('horario');
+-      removeSyncingModule('calificaciones');
+-      setSyncingAll(false);
++      removeSyncingModule('calendario');
++      if (hasFinales) {
++        removeSyncingModule('calificaciones');
++      }
+     }
+   };
+ 
+@@ -520,6 +685,13 @@ function App() {
+     }
+   }, [activePage, horarioCargado]);
+ 
++  useEffect(() => {
++    if (activePage === 'calendario' && !calendarCargado) {
++      setCalendarCargado(true);
++      loadCalendar({ silent: true });
++    }
++  }, [activePage, calendarCargado]);
++
+   useEffect(() => {
+     if (activePage === 'calificaciones' && !ciaCargado) {
+       setCiaCargado(true);
+@@ -556,10 +728,19 @@ function App() {
+       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
+         <Sidebar
+           activePage={activePage}
++          activities={activities}
++          calendarCount={calendarCount}
+           diasConClases={horario?.diasConClases ?? []}
++          errorHorario={errorHorario}
+           hasFinales={hasFinales}
+           horario={horario?.materias ?? []}
++          horarioData={horario}
++          onSyncAll={handleSyncAll}
+           onNavigate={handleNavigate}
++          proximaEntrega={proximaEntrega}
++          settingsData={settingsData}
++          studentName={studentName}
++          syncState={syncState}
+         />
+         {!settingsReady ? (
+           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
+@@ -589,6 +770,7 @@ function App() {
+           <TaskPanel title={pageConfig.title} description={pageConfig.description}>
+             <ActivePage
+               activities={activities}
++              calendarData={calendarData}
+               calificaciones={calificaciones}
+               horario={horario}
+               errorCIA={errorCIA}
+@@ -599,11 +781,16 @@ function App() {
+               lastSyncCIA={lastSyncCIA}
+               lastSyncAt={lastSyncAt}
+               lastSyncHorario={lastSyncHorario}
++              isSyncing={isCalendarSyncing}
+               loadingCIA={loadingCIA}
+               loadingHorario={loadingHorario}
+               loading={loading}
+               onSettingsSaved={refreshSettings}
+-              onSync={handleSyncActivities}
++              onSync={
++                activePage === 'calendario'
++                  ? () => loadCalendar({ clearCacheFirst: true })
++                  : handleSyncActivities
++              }
+               onSyncHorario={loadHorario}
+               onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
+               onNavigate={handleNavigate}
+@@ -617,3 +804,4 @@ function App() {
+ }
+ 
+ export default App;
++
+```
+
+### `src/components/Onboarding.jsx`
+```diff
+diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
+index 3e820a2..7bca3ac 100644
+--- a/src/components/Onboarding.jsx
++++ b/src/components/Onboarding.jsx
+@@ -1,5 +1,5 @@
+ import { ArrowRight } from 'lucide-react';
+-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+ 
+ function Onboarding({ onNavigate }) {
+   return (
+@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
+ }
+ 
+ export default Onboarding;
++
+```
+
+### `src/components/Sidebar.jsx`
+```diff
+diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
+index c7458cb..7030f59 100644
+--- a/src/components/Sidebar.jsx
++++ b/src/components/Sidebar.jsx
+@@ -1,216 +1,388 @@
+-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
+-import { useEffect, useState } from 'react';
+-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++import {
++  AlertCircle,
++  Bell,
++  BookOpen,
++  CalendarDays,
++  CheckCircle,
++  Clock,
++  Info,
++  Loader2,
++  RefreshCw,
++  Settings,
++} from 'lucide-react';
++import { useEffect, useMemo, useState } from 'react';
++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+ import { getNextClass } from '../utils/horario.js';
+ 
+-const navigationItems = [
+-  { id: 'activities', label: 'Actividades', icon: ListChecks },
+-  { id: 'horario', label: 'Horario', icon: Calendar },
+-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
+-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
++const NAV_ITEMS = [
++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
+ ];
+ 
+-function getNextClassStatus(nextClass) {
+-  if (!nextClass) {
+-    return '';
++function normDate(value) {
++  const date = value ? new Date(value) : null;
++  return date && !Number.isNaN(date.getTime()) ? date : null;
++}
++
++function formatDayShort(date = new Date()) {
++  return date.toLocaleDateString('es-MX', {
++    weekday: 'short',
++    day: 'numeric',
++    month: 'short',
++  });
++}
++
++function formatTime(date) {
++  return date.toLocaleTimeString('es-MX', {
++    hour: '2-digit',
++    minute: '2-digit',
++  });
++}
++
++function getInitials(str = '') {
++  const clean = String(str || '').trim();
++  const parts = clean.split(/\s+/).filter(Boolean);
++
++  if (parts.length >= 2) {
++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
+   }
+ 
+-  if (!nextClass.esHoy) {
+-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
++  return clean.slice(0, 2).toUpperCase() || 'DV';
++}
++
++function formatDisplayName(str = '') {
++  const clean = String(str || '').trim();
++  const parts = clean.split(/\s+/).filter(Boolean);
++
++  if (/^ID\s+\w+/i.test(clean)) {
++    return clean;
++  }
++
++  if (parts.length >= 2) {
++    return `${parts[0]} ${parts[1][0]}.`;
++  }
++
++  return clean;
++}
++
++function formatRelativeDeadline(fechaLimite) {
++  const deadline = normDate(fechaLimite);
++
++  if (!deadline) {
++    return 'Fecha pendiente';
+   }
+ 
+-  if (nextClass.minutosRestantes <= 30) {
++  const now = new Date();
++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
++  const diffDays = Math.round((target - today) / 86400000);
++  const time = formatTime(deadline);
++
++  if (diffDays < 0) return 'Vencida';
++  if (diffDays === 0) return `Hoy · ${time}`;
++  if (diffDays === 1) return `Mañana · ${time}`;
++  return `En ${diffDays} días`;
++}
++
++function getClassStatus(nextClass) {
++  if (!nextClass) return '';
++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
++
++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
+     return `En ${nextClass.minutosRestantes} min`;
+   }
+ 
+-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
++  if (nextClass.esHoy) {
++    return start;
++  }
++
++  return `${nextClass.dia || 'Próxima'} · ${start}`;
++}
++
++function getSyncPresentation(syncState = {}) {
++  if (syncState.status === 'syncing') {
++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
++  }
++
++  if (syncState.status === 'done') {
++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++  }
++
++  if (syncState.status === 'error') {
++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
++  }
++
++  if (syncState.lastSync) {
++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++  }
++
++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
+ }
+ 
+-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
++function Sidebar({
++  activePage,
++  activities = [],
++  calendarCount = 0,
++  diasConClases = [],
++  errorHorario = '',
++  hasFinales = false,
++  horario = [],
++  horarioData = null,
++  onNavigate,
++  onSyncAll,
++  proximaEntrega = null,
++  settingsData = {},
++  studentName = '',
++  syncState = { status: 'idle', lastSync: null },
++}) {
+   const [nextClass, setNextClass] = useState(null);
+-  const visibleNavigationItems = navigationItems.filter(
+-    (item) => item.id !== 'calificaciones' || hasFinales === true,
+-  );
+-  const hasHorario = Array.isArray(horario) && horario.length > 0;
++  const materiasHorario = Array.isArray(horarioData?.materias)
++    ? horarioData.materias
++    : (Array.isArray(horario) ? horario : []);
++  const pendingCount = activities.filter(
++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++  ).length;
++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
++  const hasHorario = materiasHorario.length > 0;
++  const syncInfo = getSyncPresentation(syncState);
++  const SyncIcon = syncInfo.Icon;
++  const userId = settingsData?.ciaUser || settingsData?.user || '';
++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
++  const initials = getInitials(hasRealStudentName ? studentName : userId);
+ 
+   useEffect(() => {
+-    if (!hasHorario) {
+-      setNextClass(null);
+-      return undefined;
+-    }
+-
+     const updateNextClass = () => {
+-      setNextClass(getNextClass(horario, diasConClases));
++      setNextClass(getNextClass(materiasHorario, diasConClases));
+     };
+ 
+     updateNextClass();
+     const intervalId = setInterval(updateNextClass, 60 * 1000);
+ 
+     return () => clearInterval(intervalId);
+-  }, [hasHorario, horario, diasConClases]);
++  }, [materiasHorario, diasConClases]);
+ 
+-  const handleOpenMeetLink = () => {
+-    if (!nextClass?.meetLink) {
+-      return;
++  const navItems = useMemo(() => NAV_ITEMS, []);
++
++  const getBadge = (itemId) => {
++    if (itemId === 'activities' && pendingCount > 0) {
++      return (
++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
++          {pendingCount}
++        </span>
++      );
+     }
+ 
+-    window.scraperApp?.openExternal?.(nextClass.meetLink);
++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
++      return (
++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
++          {calendarCount}
++        </span>
++      );
++    }
++
++    if (itemId === 'horario') {
++      if (errorHorario) {
++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
++      }
++      if (hasHorario) {
++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
++      }
++    }
++
++    if (itemId === 'notifications' && delayedCount > 0) {
++      return (
++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
++          {delayedCount}
++        </span>
++      );
++    }
++
++    return null;
+   };
+ 
++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
++
+   return (
+     <aside
+-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-slate-950/40"
+       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
+     >
+-      <div className="mb-8">
++      <header className="px-4 pb-3 pt-3">
+         <div className="flex items-center gap-3">
+-          <span
+-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
+-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
+-          >
+-            <img
+-              src={dvpotroLogo}
+-              alt="DVPotro"
+-              className="h-full w-full object-contain"
+-              draggable="false"
+-            />
+-          </span>
++          <img
++            src={dvpotroLogo}
++            alt="DVPotro"
++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
++            draggable="false"
++          />
+           <div className="min-w-0">
+-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
+               DVPotro
+             </p>
+-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
+               ITSON
+             </p>
+           </div>
+         </div>
+-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
+-          Academic command center
+-        </p>
+-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
+-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
+-        </p>
+-      </div>
++      </header>
+ 
+-      <nav className="space-y-2">
+-        {visibleNavigationItems.map((item) => {
+-          const isActive = item.id === activePage;
++      <nav className="px-2 pb-2">
++        {navItems.map((item) => {
+           const Icon = item.icon;
++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
++          const badge = getBadge(item.id);
+ 
+           return (
+             <button
+               key={item.id}
+               type="button"
+-              onClick={() => onNavigate(item.id)}
+-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
+-                isActive
+-                  ? ''
+-                  : ''
+-              }`}
++              onClick={() => onNavigate?.(item.target)}
++              className="mb-0.5 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[7px] text-left text-sm transition duration-150"
+               style={
+                 isActive
+-                  ? { background: 'var(--accent)', color: '#fff' }
+-                  : {
+-                    background: 'var(--bg-secondary)',
+-                    color: 'var(--text-muted)',
+-                  }
++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
+               }
+               onMouseEnter={(event) => {
+                 if (!isActive) {
+-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
+                   event.currentTarget.style.color = 'var(--text-strong)';
+                 }
+               }}
+               onMouseLeave={(event) => {
+                 if (!isActive) {
+-                  event.currentTarget.style.background = 'var(--bg-secondary)';
++                  event.currentTarget.style.background = 'transparent';
+                   event.currentTarget.style.color = 'var(--text-muted)';
+                 }
+               }}
+             >
+-              <span className="flex items-center gap-3">
+-                <Icon className="h-4 w-4" />
+-                {item.label}
+-              </span>
+-              <span
+-                className="text-xs uppercase tracking-[0.25em]"
+-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
+-              >
+-                {isActive ? 'Live' : 'Idle'}
++              <span className="flex min-w-0 items-center gap-3">
++                <Icon className="h-4 w-4 shrink-0" />
++                <span className="truncate">{item.label}</span>
+               </span>
++              {badge}
+             </button>
+           );
+         })}
+       </nav>
+ 
+-      {hasHorario ? (
+-        <div
+-          className="mt-auto border-t pt-4"
+-          style={{ borderColor: 'var(--border-subtle)' }}
++      <section
++        className="mx-2.5 my-1 rounded-xl border px-3.5 py-2.5"
++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++      >
++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++          Sincronización
++        </p>
++        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
++          <span className="font-medium">{syncInfo.text}</span>
++        </div>
++        {syncTimestamp ? (
++          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++            Última sincronización · {syncTimestamp}
++          </p>
++        ) : null}
++        <button
++          type="button"
++          onClick={onSyncAll}
++          disabled={syncState.status === 'syncing'}
++          title="Actualiza toda la información de la app"
++          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
++          style={
++            syncState.status === 'syncing'
++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
++              : { background: 'var(--itson-blue, var(--accent))' }
++          }
+         >
+-          <div
+-            className="rounded-2xl border p-3"
+-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
+-          >
+-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
+-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
+-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
++          {syncState.status === 'syncing' ? (
++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
++          ) : (
++            <RefreshCw className="h-3.5 w-3.5" />
++          )}
++          Sincronizar todo
++        </button>
++      </section>
++
++      <section
++        className="mx-2.5 my-1 rounded-xl border px-3.5 py-2.5"
++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++      >
++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
++          HOY · {formatDayShort(new Date())}
++        </p>
++
++        <div className="mt-2">
++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++            Entrega
++          </p>
++          {proximaEntrega ? (
++            <div className="mt-1 min-w-0">
++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
++                {proximaEntrega.nombre}
++              </p>
++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
++              </p>
+             </div>
++          ) : (
++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
++          )}
++        </div>
+ 
+-            {nextClass ? (
+-              <div className="space-y-2">
+-                <div className="flex items-start justify-between gap-2">
+-                  <div className="min-w-0">
+-                    <p
+-                      className="truncate text-sm font-medium"
+-                      style={{ color: 'var(--text-strong)' }}
+-                      title={nextClass.materia}
+-                    >
+-                      {nextClass.materia}
+-                    </p>
+-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
+-                      {nextClass.hora} · {nextClass.salon}
+-                    </p>
+-                  </div>
+-
+-                  {nextClass.meetLink ? (
+-                    <button
+-                      type="button"
+-                      onClick={handleOpenMeetLink}
+-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
+-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
+-                      title="Abrir videollamada"
+-                    >
+-                      <ExternalLink className="h-3.5 w-3.5" />
+-                    </button>
+-                  ) : null}
+-                </div>
++        <div className="my-1.5 border-t" style={{ borderColor: 'var(--border)' }} />
+ 
++        <div>
++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
++            Clase
++          </p>
++          {nextClass ? (
++            <div className="mt-1 min-w-0">
++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
++                {nextClass.materia}
++              </p>
++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++                <span className="truncate">{nextClass.hora}</span>
+                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
+                   <span
+-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
+-                    style={{
+-                      background: 'var(--retrasada-bg)',
+-                      borderColor: 'var(--retrasada-border)',
+-                      color: 'var(--retrasada-text)',
+-                    }}
++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
+                   >
+-                    {getNextClassStatus(nextClass)}
++                    {getClassStatus(nextClass)}
+                   </span>
+                 ) : (
+-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+-                    {getNextClassStatus(nextClass)}
+-                  </p>
++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
+                 )}
+               </div>
+-            ) : (
+-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
+-                Sin clases próximas
+-              </p>
+-            )}
+-          </div>
++            </div>
++          ) : (
++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
++          )}
++        </div>
++      </section>
++
++      <footer
++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2"
++        style={{ borderColor: 'var(--border)' }}
++      >
++        <div
++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
++        >
++          {initials}
++        </div>
++        <div className="min-w-0">
++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
++            {profileName}
++          </p>
++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
++            {userId || 'Sin ID configurado'}
++          </p>
+         </div>
+-      ) : null}
++      </footer>
+     </aside>
+   );
+ }
+```
+
+### `src/pages/Calendario.jsx`
+```diff
+diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+new file mode 100644
+index 0000000..cf44062
+--- /dev/null
++++ b/src/pages/Calendario.jsx
+@@ -0,0 +1,318 @@
++import { useMemo, useState } from 'react';
++import { AlertCircle, CalendarDays, ChevronDown, MapPin, RefreshCw } from 'lucide-react';
++
++const MONTHS = [
++  'Enero',
++  'Febrero',
++  'Marzo',
++  'Abril',
++  'Mayo',
++  'Junio',
++  'Julio',
++  'Agosto',
++  'Septiembre',
++  'Octubre',
++  'Noviembre',
++  'Diciembre',
++];
++
++const CATEGORY_COLORS = ['#006DB6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6'];
++
++function hashCode(value = '') {
++  return String(value)
++    .split('')
++    .reduce((hash, char) => {
++      const nextHash = (hash << 5) - hash + char.charCodeAt(0);
++      return nextHash & nextHash;
++    }, 0);
++}
++
++function getCategoryColor(category = 'General') {
++  return CATEGORY_COLORS[Math.abs(hashCode(category)) % CATEGORY_COLORS.length];
++}
++
++function getValidDate(value) {
++  const date = value ? new Date(value) : null;
++  return date && !Number.isNaN(date.getTime()) ? date : null;
++}
++
++function formatDateRange(startValue, endValue) {
++  const start = getValidDate(startValue);
++  const end = getValidDate(endValue);
++
++  if (!start) {
++    return 'Fecha por confirmar';
++  }
++
++  const sameDay =
++    !end ||
++    (start.getFullYear() === end.getFullYear() &&
++      start.getMonth() === end.getMonth() &&
++      start.getDate() === end.getDate());
++
++  const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(start);
++  const startDay = start.getDate();
++  const month = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(start);
++  const year = start.getFullYear();
++
++  if (sameDay) {
++    return `${weekday} ${startDay} ${month} ${year}`;
++  }
++
++  const endWeekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(end);
++  const endDay = end.getDate();
++  const endMonth = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(end);
++  const endYear = end.getFullYear();
++
++  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
++    return `${weekday} ${startDay} – ${endWeekday} ${endDay} ${month} ${year}`;
++  }
++
++  return `${weekday} ${startDay} ${month} ${year} – ${endWeekday} ${endDay} ${endMonth} ${endYear}`;
++}
++
++function groupEventsByMonth(events) {
++  return events.reduce((groups, event) => {
++    const date = getValidDate(event.inicio);
++    const key = date
++      ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
++      : 'Sin fecha';
++
++    if (!groups[key]) {
++      groups[key] = [];
++    }
++
++    groups[key].push(event);
++    return groups;
++  }, {});
++}
++
++function SelectField({ label, value, onChange, children }) {
++  return (
++    <label className="relative block min-w-[170px]">
++      <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
++        {label}
++      </span>
++      <select
++        value={value}
++        onChange={(event) => onChange(event.target.value)}
++        className="w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-itson-blue/30"
++        style={{
++          background: 'var(--bg-secondary)',
++          borderColor: 'var(--border-normal)',
++          color: 'var(--text-strong)',
++        }}
++      >
++        {children}
++      </select>
++      <ChevronDown
++        className="pointer-events-none absolute bottom-2.5 right-3 h-4 w-4"
++        style={{ color: 'var(--text-muted)' }}
++      />
++    </label>
++  );
++}
++
++function Calendario({ calendarData = { events: [] }, isSyncing = false, onSync }) {
++  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
++  const [selectedCategory, setSelectedCategory] = useState('Todas');
++  const [expanded, setExpanded] = useState({});
++
++  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
++  const categories = useMemo(
++    () => ['Todas', ...new Set(events.map((event) => event.categoria || 'General'))],
++    [events],
++  );
++
++  const filteredEvents = useMemo(() => {
++    return events
++      .filter((event) => {
++        const date = getValidDate(event.inicio);
++        const monthMatch = selectedMonth === 'Todos' || (date && date.getMonth() === Number(selectedMonth));
++        const categoryMatch = selectedCategory === 'Todas' || (event.categoria || 'General') === selectedCategory;
++        return monthMatch && categoryMatch;
++      })
++      .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++  }, [events, selectedCategory, selectedMonth]);
++
++  const groupedEvents = groupEventsByMonth(filteredEvents);
++  const hasEvents = events.length > 0;
++
++  if (isSyncing) {
++    return (
++      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
++        <div className="text-center">
++          <RefreshCw className="mx-auto h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
++          <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
++            Cargando calendario...
++          </p>
++        </div>
++      </div>
++    );
++  }
++
++  return (
++    <div className="space-y-5">
++      <section
++        className="rounded-2xl border p-6"
++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++      >
++        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
++          <div>
++            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
++              <CalendarDays className="h-3.5 w-3.5" />
++              ITSON · {new Date().getFullYear()}
++            </div>
++            <h3 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
++              Calendario Escolar
++            </h3>
++            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
++              Consulta fechas académicas oficiales publicadas por ITSON.
++            </p>
++          </div>
++
++          <button
++            type="button"
++            onClick={onSync}
++            disabled={isSyncing}
++            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
++            style={{ background: 'var(--accent)' }}
++          >
++            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
++            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
++          </button>
++        </div>
++
++        <div className="mt-5 flex flex-wrap gap-2">
++          <SelectField label="Mes" value={selectedMonth} onChange={setSelectedMonth}>
++            <option value="Todos">Todos</option>
++            {MONTHS.map((month, index) => (
++              <option key={month} value={String(index)}>
++                {month}
++              </option>
++            ))}
++          </SelectField>
++          <SelectField label="Categoría" value={selectedCategory} onChange={setSelectedCategory}>
++            {categories.map((category) => (
++              <option key={category} value={category}>
++                {category}
++              </option>
++            ))}
++          </SelectField>
++        </div>
++      </section>
++
++      {calendarData?.error ? (
++        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
++          <div className="flex items-start gap-3">
++            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
++            <p>{calendarData.error}</p>
++          </div>
++        </div>
++      ) : null}
++
++      {!calendarData?.error && !hasEvents ? (
++        <div
++          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++        >
++          <CalendarDays className="h-9 w-9 text-slate-600" />
++          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
++            Sincroniza para cargar el calendario escolar ITSON.
++          </p>
++          <button
++            type="button"
++            onClick={onSync}
++            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
++            style={{ background: 'var(--accent)' }}
++          >
++            Sincronizar ahora
++          </button>
++        </div>
++      ) : null}
++
++      {hasEvents && filteredEvents.length === 0 ? (
++        <div
++          className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm"
++          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}
++        >
++          No hay eventos para los filtros seleccionados.
++        </div>
++      ) : null}
++
++      {Object.entries(groupedEvents).map(([monthLabel, monthEvents]) => (
++        <section key={monthLabel} className="space-y-3">
++          <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-normal)' }}>
++            {monthLabel}
++          </h4>
++          <div className="space-y-3">
++            {monthEvents.map((event, index) => {
++              const category = event.categoria || 'General';
++              const color = getCategoryColor(category);
++              const eventKey = `${event.titulo}-${event.inicio}-${index}`;
++              const isExpanded = Boolean(expanded[eventKey]);
++              const hasLocation = event.ubicacion && !/virtual/i.test(event.ubicacion);
++
++              return (
++                <article
++                  key={eventKey}
++                  className="rounded-2xl border p-4 transition hover:-translate-y-0.5"
++                  style={{
++                    borderColor: 'var(--border-subtle)',
++                    borderLeft: `3px solid ${color}`,
++                    background: 'var(--bg-card)',
++                  }}
++                >
++                  <button
++                    type="button"
++                    onClick={() => setExpanded((current) => ({ ...current, [eventKey]: !isExpanded }))}
++                    className="w-full text-left"
++                  >
++                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
++                      <div className="min-w-0">
++                        <h5 className="line-clamp-2 text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
++                          {event.titulo}
++                        </h5>
++                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
++                          {formatDateRange(event.inicio, event.fin)}
++                        </p>
++                      </div>
++                      <span
++                        className="inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold"
++                        style={{
++                          background: `${color}20`,
++                          borderColor: `${color}55`,
++                          color,
++                        }}
++                      >
++                        {category}
++                      </span>
++                    </div>
++
++                    {event.descripcion ? (
++                      <p
++                        className={`mt-3 text-xs leading-5 ${isExpanded ? '' : 'line-clamp-2'}`}
++                        style={{ color: 'var(--text-muted)' }}
++                      >
++                        {event.descripcion}
++                      </p>
++                    ) : null}
++
++                    {hasLocation ? (
++                      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++                        <MapPin className="h-3 w-3" />
++                        {event.ubicacion}
++                      </p>
++                    ) : null}
++                  </button>
++                </article>
++              );
++            })}
++          </div>
++        </section>
++      ))}
++    </div>
++  );
++}
++
++export default Calendario;
+```
+
+## Verificación
+**npm run build:** PASS
+**Tests ejecutados:** npm run build + handler/preload/settings static checks + calendario empty-state static check + node syntax checks
+**Comando de verificación:** node calendario/settings/preload checks; npm run build; node -c electron handlers; node Calendario empty-state check
+**Output de verificación:**
+```
+RED checks before implementation:
+calendario handler missing: MODULE_NOT_FOUND
+studentName field: false
+runCalendario exposed: false
+
+GREEN checks after implementation:
+$ node -e "const c = require('./electron/handlers/calendario'); console.log('run:', typeof c.run); console.log('clearCache:', typeof c.clearCache);"
+run: function
+clearCache: function
+
+$ node -e "require('dotenv').config(); const s = require('./electron/handlers/settings'); const st = s.getSettings ? s.getSettings() : null; console.log('studentName field:', 'studentName' in (st||{}));"
+studentName field: true
+
+$ node -e "const fs = require('fs'); const pre = fs.readFileSync('./electron/preload.js','utf-8'); console.log('runCalendario exposed:', pre.includes('runCalendario'));"
+runCalendario exposed: true
+
+$ npm run build
+> dvpotro@0.1.0 build
+> vite build
+
+vite v5.4.21 building for production...
+transforming...
+✓ 1768 modules transformed.
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-B1C-mb04.css             31.45 kB │ gzip:  6.71 kB
+dist/assets/index-Bydx8v6A.js              314.96 kB │ gzip: 86.03 kB
+✓ built in 14.62s
+The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+
+$ node -c electron/handlers/calendario.js; node -c electron/handlers/settings.js; node -c electron/main.js; node -c electron/preload.js
+PASS
+
+$ node -e "const fs=require('fs'); const src=fs.readFileSync('./src/pages/Calendario.jsx','utf8'); console.log('calendar empty safe:', src.includes('calendarData = { events: [] }') && src.includes('Array.isArray(calendarData?.events)'));"
+calendar empty safe: true
+```
+
+## Pendiente para Claude
+- Sin pendientes registrados en esta tarea.
```

### `reports/report_067.md`
```diff
diff --git a/reports/report_067.md b/reports/report_067.md
new file mode 100644
index 0000000..2c6df7c
--- /dev/null
+++ b/reports/report_067.md
@@ -0,0 +1,6342 @@
+# Report 067
+**Fecha:** 2026-06-01 00:39  
+**Agente:** Codex  
+**Tipo:** feature
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
+**Archivos modificados:** 12
+
+## Archivos modificados
+- `electron/handlers/calendario.js` — archivo creado como parte de la base inicial
+- `electron/handlers/horario.js` — archivo actualizado en esta tarea
+- `electron/handlers/settings.js` — archivo actualizado en esta tarea
+- `electron/main.js` — archivo actualizado en esta tarea
+- `electron/preload.js` — archivo actualizado en esta tarea
+- `generate-report.js` — archivo actualizado en esta tarea
+- `reports/report_065.md` — archivo creado como parte de la base inicial
+- `reports/report_066.md` — archivo creado como parte de la base inicial
+- `src/App.jsx` — archivo actualizado en esta tarea
+- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
+- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo creado como parte de la base inicial
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| electron/handlers/calendario.js | 477 | 0 |
+| electron/handlers/horario.js | 57 | 0 |
+| electron/handlers/settings.js | 26 | 0 |
+| electron/main.js | 10 | 1 |
+| electron/preload.js | 2 | 0 |
+| generate-report.js | 28 | 24 |
+| reports/report_065.md | 929 | 0 |
+| reports/report_066.md | 3027 | 0 |
+| src/App.jsx | 220 | 32 |
+| src/components/Onboarding.jsx | 2 | 1 |
+| src/components/Sidebar.jsx | 306 | 134 |
+| src/pages/Calendario.jsx | 557 | 0 |
+
+## Resumen
+Se registraron 12 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `electron/handlers/calendario.js`
+```diff
+diff --git a/electron/handlers/calendario.js b/electron/handlers/calendario.js
+new file mode 100644
+index 0000000..9683f5f
+--- /dev/null
++++ b/electron/handlers/calendario.js
+@@ -0,0 +1,477 @@
++const fs = require('fs');
++const path = require('path');
++const electron = require('electron');
++const { chromium } = require('playwright');
++
++const app = electron?.app;
++
++const CALENDARIO_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
++const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
++const PAGE_TIMEOUT_MS = 20_000;
++const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
++
++const SPANISH_MONTHS = {
++  enero: 0,
++  febrero: 1,
++  marzo: 2,
++  abril: 3,
++  mayo: 4,
++  junio: 5,
++  julio: 6,
++  agosto: 7,
++  septiembre: 8,
++  setiembre: 8,
++  octubre: 9,
++  noviembre: 10,
++  diciembre: 11,
++};
++
++function getUserDataPath() {
++  if (app && typeof app.getPath === 'function') {
++    return app.getPath('userData');
++  }
++
++  const fallbackPath = path.join(process.cwd(), '.local-data');
++  fs.mkdirSync(fallbackPath, { recursive: true });
++  return fallbackPath;
++}
++
++function getTempPath() {
++  if (app && typeof app.getPath === 'function') {
++    return app.getPath('temp');
++  }
++
++  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
++  fs.mkdirSync(fallbackPath, { recursive: true });
++  return fallbackPath;
++}
++
++function getCalendarioCachePath() {
++  return path.join(getUserDataPath(), 'calendario-cache.json');
++}
++
++function discardFile(filePath) {
++  if (fs.existsSync(filePath)) {
++    fs.unlinkSync(filePath);
++  }
++}
++
++function readCalendarioCache() {
++  const cachePath = getCalendarioCachePath();
++
++  if (!fs.existsSync(cachePath)) {
++    return null;
++  }
++
++  try {
++    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
++
++    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
++      discardFile(cachePath);
++      return null;
++    }
++
++    return parsed;
++  } catch (_error) {
++    discardFile(cachePath);
++    return null;
++  }
++}
++
++function writeCalendarioCache(payload) {
++  const nextPayload = {
++    events: Array.isArray(payload?.events) ? payload.events : [],
++    timestamp: Date.now(),
++  };
++
++  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
++  return nextPayload;
++}
++
++function clearCache() {
++  discardFile(getCalendarioCachePath());
++  return { success: true };
++}
++
++function isTimeoutError(error) {
++  return Boolean(
++    error &&
++      (error.name === 'TimeoutError' ||
++        /timeout/i.test(error.message || '') ||
++        /timed out/i.test(error.message || '')),
++  );
++}
++
++function isNetworkError(error) {
++  const message = error?.message || '';
++  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
++    message,
++  );
++}
++
++async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
++  let lastError;
++
++  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
++    try {
++      return await page.goto(url, {
++        waitUntil: 'domcontentloaded',
++        timeout: PAGE_TIMEOUT_MS,
++        ...options,
++      });
++    } catch (error) {
++      lastError = error;
++
++      if (isNetworkError(error)) {
++        throw new Error('NO_INTERNET');
++      }
++
++      if (!isTimeoutError(error) || attempt === maxRetries) {
++        throw error;
++      }
++
++      await page.waitForTimeout(1500);
++    }
++  }
++
++  throw lastError;
++}
++
++async function applyResourceBlocking(page) {
++  await page.route('**/*', (route) => {
++    const resourceType = route.request().resourceType();
++
++    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
++      route.abort();
++      return;
++    }
++
++    route.continue();
++  });
++}
++
++function unfoldICS(content) {
++  return String(content || '').replace(/\r?\n[ \t]/g, '');
++}
++
++function unescapeICSText(value) {
++  return String(value || '')
++    .replace(/\\n/g, '\n')
++    .replace(/\\,/g, ',')
++    .replace(/\\;/g, ';')
++    .replace(/\\\\/g, '\\')
++    .trim();
++}
++
++function parseICSDate(str) {
++  if (!str) return null;
++  const clean = str.includes(':') ? str.split(':').pop() : str;
++  const d = clean.replace(/[TZ]/g, '');
++  if (d.length < 8) return null;
++
++  try {
++    return new Date(
++      Number(d.slice(0, 4)),
++      Number(d.slice(4, 6)) - 1,
++      Number(d.slice(6, 8)),
++      d.length >= 12 ? Number(d.slice(8, 10)) : 0,
++      d.length >= 14 ? Number(d.slice(10, 12)) : 0,
++    ).toISOString();
++  } catch (_error) {
++    return null;
++  }
++}
++
++function parseModalDate(str) {
++  if (!str) return null;
++  const match = String(str).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
++  if (!match) return null;
++
++  return new Date(
++    Number(match[3]),
++    Number(match[1]) - 1,
++    Number(match[2]),
++    Number(match[4]),
++    Number(match[5]),
++  ).toISOString();
++}
++
++function parseICS(content) {
++  const events = [];
++  const blocks = unfoldICS(content).split('BEGIN:VEVENT');
++
++  for (const block of blocks.slice(1)) {
++    const get = (field) => {
++      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
++      return match ? unescapeICSText(match[1]) : '';
++    };
++    const inicio = parseICSDate(get('DTSTART'));
++
++    if (!inicio) {
++      continue;
++    }
++
++    events.push({
++      titulo: get('SUMMARY') || 'Evento',
++      inicio,
++      fin: parseICSDate(get('DTEND')),
++      descripcion: get('DESCRIPTION'),
++      ubicacion: get('LOCATION'),
++      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
++    });
++  }
++
++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++}
++
++function parseDateText(text) {
++  const normalized = String(text || '').trim();
++
++  if (!normalized) {
++    return null;
++  }
++
++  const nativeDate = new Date(normalized);
++  if (!Number.isNaN(nativeDate.getTime())) {
++    return nativeDate.toISOString();
++  }
++
++  const spanishMatch = normalized
++    .toLowerCase()
++    .normalize('NFD')
++    .replace(/[\u0300-\u036f]/g, '')
++    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
++
++  if (spanishMatch) {
++    const day = Number(spanishMatch[1]);
++    const month = SPANISH_MONTHS[spanishMatch[2]];
++    const year = Number(spanishMatch[3]);
++
++    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
++      return new Date(year, month, day).toISOString();
++    }
++  }
++
++  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
++  if (numericMatch) {
++    const day = Number(numericMatch[1]);
++    const month = Number(numericMatch[2]) - 1;
++    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
++    return new Date(year, month, day).toISOString();
++  }
++
++  return null;
++}
++
++function normalizeEvent(event) {
++  return {
++    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
++    inicio: event?.inicio || null,
++    fin: event?.fin || null,
++    descripcion: String(event?.descripcion || '').trim(),
++    ubicacion: String(event?.ubicacion || '').trim(),
++    categoria: String(event?.categoria || 'General').trim() || 'General',
++  };
++}
++
++async function tryDownloadICS(page) {
++  let downloadedICS = null;
++
++  page.on('download', async (download) => {
++    try {
++      const tmpPath = path.join(getTempPath(), 'itson-cal-download.tmp');
++      await download.saveAs(tmpPath);
++      const content = fs.readFileSync(tmpPath, 'utf8');
++      if (content.includes('BEGIN:VCALENDAR')) {
++        downloadedICS = content;
++      }
++    } catch (_error) {
++      // Download interception is best-effort.
++    }
++  });
++
++  await gotoWithRetry(page, CALENDARIO_URL, { waitUntil: 'domcontentloaded' });
++
++  try {
++    const yearSelect = await page.$('select[name*="year"], select[id*="year"], select[id*="Year"]');
++    if (yearSelect) {
++      await yearSelect.selectOption(new Date().getFullYear().toString());
++      await page.waitForTimeout(1000);
++    }
++  } catch (_error) {
++    // Continue without year selection.
++  }
++
++  try {
++    const downloadButton = await page.$(
++      'a[href*=".ics"], a[href*="download"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario")',
++    );
++    if (downloadButton) {
++      await downloadButton.click();
++      await page.waitForTimeout(3000);
++    }
++  } catch (_error) {
++    // Continue to fallback layers.
++  }
++
++  if (!downloadedICS) {
++    return null;
++  }
++
++  const events = parseICS(downloadedICS);
++  return events.length > 0 ? events.map(normalizeEvent) : null;
++}
++
++async function scrapeModalEvents(page) {
++  await page.waitForTimeout(3000);
++
++  const eventHandles = await page.$$(
++    '.fc-event, [class*="evento"]:not([class*="modal"]), ' +
++      '[data-event-id], .event-item, td.has-event, [class*="calendar-day"][data-has-events]',
++  );
++
++  const events = [];
++  const seen = new Set();
++
++  for (const handle of eventHandles.slice(0, 100)) {
++    try {
++      const labelText = await handle.textContent().catch(() => '');
++      const trimmed = labelText.trim().slice(0, 100);
++      if (!trimmed || seen.has(trimmed)) continue;
++
++      await handle.click();
++      await page.waitForTimeout(600);
++
++      const modalData = await page.evaluate(() => {
++        const modal = document.querySelector(
++          '.modal.show, .modal[style*="display: block"], .modal[style*="display:block"], ' +
++            '[class*="modal-content"]:not([style*="none"]), [class*="event-detail"]',
++        );
++        if (!modal) return null;
++
++        const getText = (selector) => modal.querySelector(selector)?.textContent?.trim() || '';
++        const fullText = modal.innerText || '';
++        const dateMatches = fullText.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/g);
++        const titulo =
++          getText('h4, h5, .modal-title, [class*="titulo"], [class*="nombre-evento"]') ||
++          getText('h3') ||
++          'Evento';
++        const categoriaMatch = fullText.match(/CATEGOR[IÍ]A:\s*\n?\s*([^\n]+)/i);
++        const ubicacionMatch = fullText.match(/UBICACI[OÓ]N:\s*\n?\s*([^\n]+)/i);
++        const descMatch = fullText.match(/DESCRIPCI[OÓ]N[^:]*:\s*\n?\s*([^\n]{3,})/i);
++
++        return {
++          titulo,
++          categoria: categoriaMatch?.[1]?.trim() || 'General',
++          ubicacion: ubicacionMatch?.[1]?.trim() || '',
++          descripcion: descMatch?.[1]?.trim() || '',
++          fechaInicio: dateMatches?.[0] || null,
++          fechaFin: dateMatches?.[1] || null,
++        };
++      });
++
++      await page
++        .click('button:has-text("Cerrar"), [data-dismiss="modal"], .modal .close, .btn-cerrar')
++        .catch(() => page.keyboard.press('Escape').catch(() => {}));
++      await page.waitForTimeout(400);
++
++      const key = `${modalData?.titulo || trimmed}-${modalData?.fechaInicio || ''}`;
++      if (!modalData?.titulo || seen.has(key)) continue;
++
++      const inicio = parseModalDate(modalData.fechaInicio);
++      if (!inicio) continue;
++
++      seen.add(trimmed);
++      seen.add(key);
++      events.push(
++        normalizeEvent({
++          titulo: modalData.titulo,
++          inicio,
++          fin: parseModalDate(modalData.fechaFin),
++          categoria: modalData.categoria,
++          ubicacion: modalData.ubicacion,
++          descripcion: modalData.descripcion,
++        }),
++      );
++    } catch (_error) {
++      // Continue with the next event handle.
++    }
++  }
++
++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++}
++
++async function scrapeTextFallback(page) {
++  const pageText = await page.content().catch(() => '');
++  const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
++  const hasDates = datePattern.test(pageText);
++
++  // Better an empty calendar than incorrect "today" dates.
++  return hasDates ? [] : [];
++}
++
++async function scrapeCalendario() {
++  const browser = await chromium.launch({ headless: true });
++
++  try {
++    const context = await browser.newContext({ acceptDownloads: true });
++    const page = await context.newPage();
++    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
++    await applyResourceBlocking(page);
++
++    const icsEvents = await tryDownloadICS(page);
++    if (Array.isArray(icsEvents) && icsEvents.length > 0) {
++      return { events: icsEvents, timestamp: Date.now(), fromCache: false };
++    }
++
++    const modalEvents = await scrapeModalEvents(page);
++    if (modalEvents.length > 0) {
++      return { events: modalEvents, timestamp: Date.now(), fromCache: false };
++    }
++
++    const fallbackEvents = await scrapeTextFallback(page);
++    return { events: fallbackEvents, timestamp: Date.now(), fromCache: false };
++  } finally {
++    await browser.close();
++  }
++}
++
++async function run() {
++  const cached = readCalendarioCache();
++
++  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
++    return {
++      ...cached,
++      fromCache: true,
++    };
++  }
++
++  try {
++    const result = await scrapeCalendario();
++    const cachedPayload = writeCalendarioCache(result);
++    return {
++      ...cachedPayload,
++      fromCache: false,
++    };
++  } catch (error) {
++    if (error?.message === 'NO_INTERNET') {
++      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
++    }
++
++    return {
++      error: error?.message
++        ? `Falló la extracción del calendario escolar: ${error.message}`
++        : 'Falló la extracción del calendario escolar por un error no identificado.',
++    };
++  }
++}
++
++module.exports = {
++  clearCache,
++  getCalendarioCachePath,
++  parseDateText,
++  parseICS,
++  parseICSDate,
++  parseModalDate,
++  run,
++};
+```
+
+### `electron/handlers/horario.js`
+```diff
+diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
+index 45995c1..d957056 100644
+--- a/electron/handlers/horario.js
++++ b/electron/handlers/horario.js
+@@ -913,6 +913,61 @@ async function loginToCIA(page, user, password) {
+   return null;
+ }
+ 
++async function tryExtractStudentName(page) {
++  const selectors = [
++    '#ctl00_cLabel_nombre',
++    '.user-name',
++    '#user-name',
++    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
++    '.navbar-text',
++    'span[id*="Name"]',
++  ];
++
++  for (const selector of selectors) {
++    try {
++      const element = await page.$(selector);
++
++      if (!element) {
++        continue;
++      }
++
++      const text = normalizeWhitespace(await element.textContent());
++      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
++        return text;
++      }
++    } catch (_error) {
++      // Continue with the next selector.
++    }
++  }
++
++  try {
++    const bodyText = await page.evaluate(() => document.body?.innerText || '');
++    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
++    if (match) {
++      return normalizeWhitespace(match[1]);
++    }
++  } catch (_error) {
++    // Silent fallback.
++  }
++
++  return null;
++}
++
++async function persistStudentNameFromCIA(page) {
++  const nombre = await tryExtractStudentName(page);
++
++  if (!nombre) {
++    return;
++  }
++
++  try {
++    const { saveStudentName } = require('./settings');
++    await saveStudentName(nombre);
++  } catch (_error) {
++    // Student name persistence must never block horario scraping.
++  }
++}
++
+ async function getTargetContentFrame(page, timeout = 25_000) {
+   return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
+ }
+@@ -2413,6 +2468,7 @@ async function scrapeHorario(controller = {}) {
+       return loginResult;
+     }
+ 
++    await persistStudentNameFromCIA(page);
+     await applyResourceBlocking(page);
+     let scheduleFrame;
+     try {
+@@ -2427,6 +2483,7 @@ async function scrapeHorario(controller = {}) {
+         if (retryLogin?.error) {
+           return retryLogin;
+         }
++        await persistStudentNameFromCIA(page);
+         scheduleFrame = await openHorarioPage(page);
+       } else {
+         throw error;
+```
+
+### `electron/handlers/settings.js`
+```diff
+diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
+index 0b6f430..cdefc37 100644
+--- a/electron/handlers/settings.js
++++ b/electron/handlers/settings.js
+@@ -26,6 +26,7 @@ function getSettings() {
+     ciaUser: process.env.CIA_USER || '',
+     hasCIAPassword: Boolean(process.env.CIA_PASS),
+     notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
++    studentName: process.env.STUDENT_NAME || '',
+   };
+ }
+ 
+@@ -96,6 +97,30 @@ function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore
+   }
+ }
+ 
++async function saveStudentName(name) {
++  try {
++    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
++
++    if (!normalizedName) {
++      return { success: false, error: 'Nombre de estudiante vacío.' };
++    }
++
++    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
++    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);
++
++    const envPath = getEnvFilePath();
++    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
++    process.env.STUDENT_NAME = normalizedName;
++
++    return { success: true };
++  } catch (error) {
++    return {
++      success: false,
++      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
++    };
++  }
++}
++
+ function registerSettingsHandlers() {
+   ipcMain.handle('settings:get', async () => getSettings());
+   ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
+@@ -105,5 +130,6 @@ module.exports = {
+   getEnvFilePath,
+   getSettings,
+   registerSettingsHandlers,
++  saveStudentName,
+   saveSettings,
+ };
+```
+
+### `electron/main.js`
+```diff
+diff --git a/electron/main.js b/electron/main.js
+index af41ff2..b00bba1 100644
+--- a/electron/main.js
++++ b/electron/main.js
+@@ -8,6 +8,7 @@ const { registerFileHandlers } = require('./handlers/files');
+ const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
+ const { registerSettingsHandlers } = require('./handlers/settings');
+ const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
++const calendarioHandler = require('./handlers/calendario');
+ 
+ const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
+ const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
+@@ -57,6 +58,8 @@ app.whenReady().then(() => {
+   registerFileHandlers();
+   registerSettingsHandlers();
+   registerNotificationHandlers();
++  ipcMain.handle('calendario:run', () => calendarioHandler.run());
++  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
+   ipcMain.removeHandler('shell:open-external');
+   ipcMain.handle('shell:open-external', async (_event, url) => {
+     if (url && typeof url === 'string' && url.startsWith('http')) {
+@@ -72,11 +75,13 @@ app.whenReady().then(() => {
+     clearActivitiesCache();
+     clearHorarioCache();
+     clearCIACache();
++    calendarioHandler.clearCache();
+ 
+-    const [actividades, horario, calificaciones] = await Promise.allSettled([
++    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
+       getActivitiesWithCache(),
+       getHorarioWithCache(),
+       getCalificacionesWithCache(),
++      calendarioHandler.run(),
+     ]);
+ 
+     return {
+@@ -90,6 +95,10 @@ app.whenReady().then(() => {
+         calificaciones.status === 'fulfilled'
+           ? calificaciones.value
+           : { error: calificaciones.reason?.message },
++      calendario:
++        calendario.status === 'fulfilled'
++          ? calendario.value
++          : { error: calendario.reason?.message },
+     };
+   });
+   createMainWindow();
+```
+
+### `electron/preload.js`
+```diff
+diff --git a/electron/preload.js b/electron/preload.js
+index 05a306d..48a4dff 100644
+--- a/electron/preload.js
++++ b/electron/preload.js
+@@ -5,8 +5,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
+   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+   runCIA: () => ipcRenderer.invoke('cia:run'),
+   runHorario: () => ipcRenderer.invoke('horario:run'),
++  runCalendario: () => ipcRenderer.invoke('calendario:run'),
+   clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
+   clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
++  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
+   saveHorarioLink: (numeroClase, link) =>
+     ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
+   getSettings: () => ipcRenderer.invoke('settings:get'),
+```
+
+### `generate-report.js`
+```diff
+diff --git a/generate-report.js b/generate-report.js
+index fa9b68e..4f05021 100644
+--- a/generate-report.js
++++ b/generate-report.js
+@@ -19,35 +19,39 @@ const MAX_DIFF_BYTES = 150 * 1024;
+ 
+ const VERIFICATION = {
+   buildStatus: 'PASS',
+-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
+-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+-  verificationOutput: `> dvpotro@0.1.0 build
++  testsRun: 'npm run build + parseModalDate check + generateCalendarDays/static all-day fallback checks + node syntax check',
++  verificationCmd: 'node parseModalDate check; node Calendario grid static checks; node -c electron/handlers/calendario.js; npm run build',
++  verificationOutput: `RED checks before implementation:
++parseModalDate export: undefined
++generateCalendarDays present: false
++
++GREEN checks after implementation:
++$ node -e "const c=require('./electron/handlers/calendario'); const result=c.parseModalDate('06/03/2023 09:00'); console.log('parseModalDate test:', result); console.log('expected month: June (5 in 0-indexed):', result?.includes('-06-'));"
++parseModalDate test: 2023-06-03T16:00:00.000Z
++expected month: June (5 in 0-indexed): true
++
++$ node -c electron/handlers/calendario.js
++PASS
++
++$ npm run build
++> dvpotro@0.1.0 build
+ > vite build
+ 
+ vite v5.4.21 building for production...
+-✓ 1767 modules transformed.
+-dist/index.html                        0.47 kB │ gzip:  0.30 kB
+-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
+-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
+-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
+-✓ built in 4.93s
++transforming...
++✓ 1768 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-D0GI_6K7.css             31.67 kB │ gzip:  6.73 kB
++dist/assets/index-Bn3h3pFm.js              319.70 kB │ gzip: 87.15 kB
++✓ built in 10.79s
+ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+ 
+-> dvpotro@0.1.0 dist:dir
+-> vite build && electron-builder --dir
+-
+-✓ 1767 modules transformed.
+-✓ built in 4.83s
+-• electron-builder version=26.8.1
+-• loaded configuration file=package.json (build field)
+-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
+-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
+-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
+-
+-branding verification OK
+-active branding reference scan OK: no old visible references
+-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
+-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
++$ node Calendario grid static checks
++generateCalendarDays length guard: true
++todo el dia fallback: true`,
+ };
+ 
+ function ensureReportsDir() {
+```
+
+### `reports/report_065.md`
+```diff
+diff --git a/reports/report_065.md b/reports/report_065.md
+new file mode 100644
+index 0000000..98c1356
+--- /dev/null
++++ b/reports/report_065.md
+@@ -0,0 +1,929 @@
++# Report 065
++**Fecha:** 2026-05-31 18:33  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
++**Archivos modificados:** 4
++
++## Archivos modificados
++- `generate-report.js` — archivo actualizado en esta tarea
++- `src/App.jsx` — archivo actualizado en esta tarea
++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| generate-report.js | 19 | 21 |
++| src/App.jsx | 120 | 30 |
++| src/components/Onboarding.jsx | 2 | 1 |
++| src/components/Sidebar.jsx | 308 | 134 |
++
++## Resumen
++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `generate-report.js`
++```diff
++diff --git a/generate-report.js b/generate-report.js
++index fa9b68e..90a2816 100644
++--- a/generate-report.js
+++++ b/generate-report.js
++@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
++ 
++ const VERIFICATION = {
++   buildStatus: 'PASS',
++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+++  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
+++  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
++   verificationOutput: `> dvpotro@0.1.0 build
++ > vite build
++ 
++ vite v5.4.21 building for production...
+++transforming...
++ ✓ 1767 modules transformed.
++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
++-✓ built in 4.93s
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+++✓ built in 8.70s
++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++ 
++-> dvpotro@0.1.0 dist:dir
++-> vite build && electron-builder --dir
+++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
++ 
++-✓ 1767 modules transformed.
++-✓ built in 4.83s
++-• electron-builder version=26.8.1
++-• loaded configuration file=package.json (build field)
++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
++-
++-branding verification OK
++-active branding reference scan OK: no old visible references
++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+++Dist logo assets:
+++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+++
+++Confirmed:
+++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+++- Dist logo asset is under 20KB.
+++- handleSyncAll only adds runCIA when hasFinales is true.
+++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
++ };
++ 
++ function ensureReportsDir() {
++```
++
++### `src/App.jsx`
++```diff
++diff --git a/src/App.jsx b/src/App.jsx
++index 137c482..b672732 100644
++--- a/src/App.jsx
+++++ b/src/App.jsx
++@@ -1,4 +1,4 @@
++-import { useCallback, useEffect, useRef, useState } from 'react';
+++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
++ import Sidebar from './components/Sidebar';
++ import Onboarding from './components/Onboarding';
++ import TaskPanel from './components/TaskPanel';
++@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
++ import Horario from './pages/Horario';
++ import Calificaciones from './pages/Calificaciones';
++ import Ajustes from './pages/Ajustes';
++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
++ 
++ const pageRegistry = {
++   activities: {
++@@ -44,7 +44,7 @@ function App() {
++   const [loading, setLoading] = useState(false);
++   const [loadingHorario, setLoadingHorario] = useState(false);
++   const [loadingCIA, setLoadingCIA] = useState(false);
++-  const [syncingAll, setSyncingAll] = useState(false);
+++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
++   const [syncingModules, setSyncingModules] = useState([]);
++   const [error, setError] = useState('');
++   const [errorHorario, setErrorHorario] = useState('');
++@@ -59,6 +59,7 @@ function App() {
++   const [horarioCargado, setHorarioCargado] = useState(false);
++   const [ciaCargado, setCiaCargado] = useState(false);
++   const [studentName, setStudentName] = useState('');
+++  const [settingsData, setSettingsData] = useState({});
++ 
++   const initializedRef = useRef(false);
++   const nearExpiryRefreshLaunchedRef = useRef(false);
++@@ -75,6 +76,21 @@ function App() {
++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
++       ),
++   );
+++  const proximaEntrega = useMemo(() => {
+++    const pending = (activities || []).filter(
+++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++    );
+++
+++    if (!pending.length) {
+++      return null;
+++    }
+++
+++    return [...pending].sort((left, right) => {
+++      if (!left.fechaLimite) return 1;
+++      if (!right.fechaLimite) return -1;
+++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+++    })[0];
+++  }, [activities]);
++ 
++   const addSyncingModule = (moduleId) => {
++     setSyncingModules((previous) => {
++@@ -135,6 +151,9 @@ function App() {
++       horario: 'horario',
++       calificaciones: 'calificaciones',
++       ajustes: 'settings',
+++      calendario: 'activities',
+++      notifications: 'activities',
+++      notificaciones: 'activities',
++     };
++ 
++     const nextPage = pageAliases[pageId] || pageId;
++@@ -156,6 +175,7 @@ function App() {
++ 
++     try {
++       const settings = await api.getSettings();
+++      setSettingsData(settings || {});
++       const hasUser = Boolean(settings?.user?.trim());
++       const hasPassword = Boolean(settings?.hasPassword);
++       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
++@@ -167,6 +187,7 @@ function App() {
++       initializedRef.current = false;
++       nearExpiryRefreshLaunchedRef.current = false;
++     } catch (_error) {
+++      setSettingsData({});
++       setStudentName('');
++       setShowOnboarding(false);
++     } finally {
++@@ -430,50 +451,109 @@ function App() {
++   };
++ 
++   const handleSyncAll = async () => {
++-    if (!api?.syncAll) {
+++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+++
+++    if (syncState.status === 'syncing' || !scraperApi) {
++       return;
++     }
++ 
++-    setSyncingAll(true);
+++    setSyncState((current) => ({ ...current, status: 'syncing' }));
++     addSyncingModule('activities');
++     addSyncingModule('horario');
++-    addSyncingModule('calificaciones');
+++    if (hasFinales) {
+++      addSyncingModule('calificaciones');
+++    }
++ 
++     try {
++-      const result = await api.syncAll();
+++      const calls = [
+++        { id: 'activities', promise: scraperApi.runScraper?.() },
+++        { id: 'horario', promise: scraperApi.runHorario?.() },
+++      ];
++ 
++-      if (result?.actividades?.activities) {
++-        setActivities(result.actividades.activities);
++-        if (result.actividades?.timestamp) {
++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
++-        }
+++      if (hasFinales) {
+++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
++       }
++ 
++-      if (result?.horario?.materias) {
++-        setHorario({
++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
++-          diasConClases: Array.isArray(result.horario.diasConClases)
++-            ? result.horario.diasConClases
++-            : [],
++-        });
++-        if (result.horario?.timestamp) {
++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+++      const results = await Promise.allSettled(calls.map((call) => call.promise));
+++      let hasErrors = false;
+++
+++      results.forEach((result, index) => {
+++        const moduleId = calls[index]?.id;
+++
+++        if (result.status === 'rejected') {
+++          hasErrors = true;
+++          return;
++         }
++-      }
++ 
++-      if (result?.calificaciones?.materias) {
++-        setCalificaciones(result.calificaciones.materias);
++-        if (result.calificaciones?.timestamp) {
++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+++        const response = result.value;
+++
+++        if (response?.error) {
+++          hasErrors = true;
+++
+++          if (moduleId === 'activities') {
+++            setErrorCode(response.error);
+++            setError(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'horario') {
+++            setErrorHorario(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'calificaciones') {
+++            setErrorCIACode(response.error);
+++            setErrorCIA(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          return;
++         }
++-      }
+++
+++        if (moduleId === 'activities') {
+++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+++          setActivities(activitiesList);
+++          setError('');
+++          setErrorCode('');
+++          if (response?.timestamp) {
+++            setLastSyncAt(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'horario') {
+++          setHorario({
+++            materias: Array.isArray(response?.materias) ? response.materias : [],
+++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+++          });
+++          setErrorHorario('');
+++          if (response?.timestamp) {
+++            setLastSyncHorario(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'calificaciones') {
+++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+++          setCalificaciones(materiasList);
+++          setErrorCIA('');
+++          setErrorCIACode('');
+++          if (response?.timestamp) {
+++            setLastSyncCIA(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++      });
+++
+++      const nextStatus = hasErrors ? 'error' : 'done';
+++      setSyncState({ status: nextStatus, lastSync: new Date() });
+++      setTimeout(
+++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+++        hasErrors ? 4000 : 3000,
+++      );
++     } catch (_error) {
++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+++      setSyncState((current) => ({ ...current, status: 'error' }));
+++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
++     } finally {
++       removeSyncingModule('activities');
++       removeSyncingModule('horario');
++-      removeSyncingModule('calificaciones');
++-      setSyncingAll(false);
+++      if (hasFinales) {
+++        removeSyncingModule('calificaciones');
+++      }
++     }
++   };
++ 
++@@ -556,10 +636,19 @@ function App() {
++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
++         <Sidebar
++           activePage={activePage}
+++          activities={activities}
+++          calendarCount={0}
++           diasConClases={horario?.diasConClases ?? []}
+++          errorHorario={errorHorario}
++           hasFinales={hasFinales}
++           horario={horario?.materias ?? []}
+++          horarioData={horario}
+++          onSyncAll={handleSyncAll}
++           onNavigate={handleNavigate}
+++          proximaEntrega={proximaEntrega}
+++          settingsData={settingsData}
+++          studentName={studentName}
+++          syncState={syncState}
++         />
++         {!settingsReady ? (
++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
++@@ -617,3 +706,4 @@ function App() {
++ }
++ 
++ export default App;
+++
++```
++
++### `src/components/Onboarding.jsx`
++```diff
++diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
++index 3e820a2..7bca3ac 100644
++--- a/src/components/Onboarding.jsx
+++++ b/src/components/Onboarding.jsx
++@@ -1,5 +1,5 @@
++ import { ArrowRight } from 'lucide-react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ 
++ function Onboarding({ onNavigate }) {
++   return (
++@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
++ }
++ 
++ export default Onboarding;
+++
++```
++
++### `src/components/Sidebar.jsx`
++```diff
++diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
++index c7458cb..1aef7a5 100644
++--- a/src/components/Sidebar.jsx
+++++ b/src/components/Sidebar.jsx
++@@ -1,216 +1,390 @@
++-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
++-import { useEffect, useState } from 'react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import {
+++  AlertCircle,
+++  Bell,
+++  BookOpen,
+++  CalendarDays,
+++  CheckCircle,
+++  Clock,
+++  Info,
+++  Loader2,
+++  RefreshCw,
+++  Settings,
+++} from 'lucide-react';
+++import { useEffect, useMemo, useState } from 'react';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ import { getNextClass } from '../utils/horario.js';
++ 
++-const navigationItems = [
++-  { id: 'activities', label: 'Actividades', icon: ListChecks },
++-  { id: 'horario', label: 'Horario', icon: Calendar },
++-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
++-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
+++const NAV_ITEMS = [
+++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
+++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
+++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
+++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
+++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
++ ];
++ 
++-function getNextClassStatus(nextClass) {
++-  if (!nextClass) {
++-    return '';
+++function normDate(value) {
+++  const date = value ? new Date(value) : null;
+++  return date && !Number.isNaN(date.getTime()) ? date : null;
+++}
+++
+++function formatDayShort(date = new Date()) {
+++  return date.toLocaleDateString('es-MX', {
+++    weekday: 'short',
+++    day: 'numeric',
+++    month: 'short',
+++  });
+++}
+++
+++function formatTime(date) {
+++  return date.toLocaleTimeString('es-MX', {
+++    hour: '2-digit',
+++    minute: '2-digit',
+++  });
+++}
+++
+++function getInitials(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
++   }
++ 
++-  if (!nextClass.esHoy) {
++-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
+++  return clean.slice(0, 2).toUpperCase() || 'DV';
+++}
+++
+++function formatDisplayName(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (/^ID\s+\w+/i.test(clean)) {
+++    return clean;
+++  }
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0]} ${parts[1][0]}.`;
+++  }
+++
+++  return clean;
+++}
+++
+++function formatRelativeDeadline(fechaLimite) {
+++  const deadline = normDate(fechaLimite);
+++
+++  if (!deadline) {
+++    return 'Fecha pendiente';
++   }
++ 
++-  if (nextClass.minutosRestantes <= 30) {
+++  const now = new Date();
+++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
+++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
+++  const diffDays = Math.round((target - today) / 86400000);
+++  const time = formatTime(deadline);
+++
+++  if (diffDays < 0) return 'Vencida';
+++  if (diffDays === 0) return `Hoy · ${time}`;
+++  if (diffDays === 1) return `Mañana · ${time}`;
+++  return `En ${diffDays} días`;
+++}
+++
+++function getClassStatus(nextClass) {
+++  if (!nextClass) return '';
+++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
+++
+++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
++     return `En ${nextClass.minutosRestantes} min`;
++   }
++ 
++-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
+++  if (nextClass.esHoy) {
+++    return start;
+++  }
+++
+++  return `${nextClass.dia || 'Próxima'} · ${start}`;
++ }
++ 
++-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
+++function getSyncPresentation(syncState = {}) {
+++  if (syncState.status === 'syncing') {
+++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
+++  }
+++
+++  if (syncState.status === 'done') {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  if (syncState.status === 'error') {
+++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
+++  }
+++
+++  if (syncState.lastSync) {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
+++}
+++
+++function Sidebar({
+++  activePage,
+++  activities = [],
+++  calendarCount = 0,
+++  diasConClases = [],
+++  errorHorario = '',
+++  hasFinales = false,
+++  horario = [],
+++  horarioData = null,
+++  onNavigate,
+++  onSyncAll,
+++  proximaEntrega = null,
+++  settingsData = {},
+++  studentName = '',
+++  syncState = { status: 'idle', lastSync: null },
+++}) {
++   const [nextClass, setNextClass] = useState(null);
++-  const visibleNavigationItems = navigationItems.filter(
++-    (item) => item.id !== 'calificaciones' || hasFinales === true,
++-  );
++-  const hasHorario = Array.isArray(horario) && horario.length > 0;
+++  const materiasHorario = Array.isArray(horarioData?.materias)
+++    ? horarioData.materias
+++    : (Array.isArray(horario) ? horario : []);
+++  const pendingCount = activities.filter(
+++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++  ).length;
+++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
+++  const hasHorario = materiasHorario.length > 0;
+++  const syncInfo = getSyncPresentation(syncState);
+++  const SyncIcon = syncInfo.Icon;
+++  const userId = settingsData?.ciaUser || settingsData?.user || '';
+++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
+++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
+++  const initials = getInitials(hasRealStudentName ? studentName : userId);
++ 
++   useEffect(() => {
++-    if (!hasHorario) {
++-      setNextClass(null);
++-      return undefined;
++-    }
++-
++     const updateNextClass = () => {
++-      setNextClass(getNextClass(horario, diasConClases));
+++      setNextClass(getNextClass(materiasHorario, diasConClases));
++     };
++ 
++     updateNextClass();
++     const intervalId = setInterval(updateNextClass, 60 * 1000);
++ 
++     return () => clearInterval(intervalId);
++-  }, [hasHorario, horario, diasConClases]);
+++  }, [materiasHorario, diasConClases]);
+++
+++  const navItems = useMemo(() => NAV_ITEMS, []);
+++
+++  const getBadge = (itemId) => {
+++    if (itemId === 'activities' && pendingCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
+++          {pendingCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
+++          {calendarCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'horario') {
+++      if (errorHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
+++      }
+++      if (hasHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
+++      }
+++    }
++ 
++-  const handleOpenMeetLink = () => {
++-    if (!nextClass?.meetLink) {
++-      return;
+++    if (itemId === 'notifications' && delayedCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
+++          {delayedCount}
+++        </span>
+++      );
++     }
++ 
++-    window.scraperApp?.openExternal?.(nextClass.meetLink);
+++    return null;
++   };
++ 
+++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
+++
++   return (
++     <aside
++-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
++       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
++     >
++-      <div className="mb-8">
+++      <header className="px-4 pb-3.5 pt-4">
++         <div className="flex items-center gap-3">
++-          <span
++-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
++-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
++-          >
++-            <img
++-              src={dvpotroLogo}
++-              alt="DVPotro"
++-              className="h-full w-full object-contain"
++-              draggable="false"
++-            />
++-          </span>
+++          <img
+++            src={dvpotroLogo}
+++            alt="DVPotro"
+++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
+++            draggable="false"
+++          />
++           <div className="min-w-0">
++-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
+++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
++               DVPotro
++             </p>
++-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
+++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
++               ITSON
++             </p>
++           </div>
++         </div>
++-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
++-          Academic command center
++-        </p>
++-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
++-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
++-        </p>
++-      </div>
+++      </header>
++ 
++-      <nav className="space-y-2">
++-        {visibleNavigationItems.map((item) => {
++-          const isActive = item.id === activePage;
+++      <nav className="px-2 pb-2">
+++        {navItems.map((item) => {
++           const Icon = item.icon;
+++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
+++          const badge = getBadge(item.id);
++ 
++           return (
++             <button
++               key={item.id}
++               type="button"
++-              onClick={() => onNavigate(item.id)}
++-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
++-                isActive
++-                  ? ''
++-                  : ''
++-              }`}
+++              onClick={() => onNavigate?.(item.target)}
+++              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
++               style={
++                 isActive
++-                  ? { background: 'var(--accent)', color: '#fff' }
++-                  : {
++-                    background: 'var(--bg-secondary)',
++-                    color: 'var(--text-muted)',
++-                  }
+++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
+++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
++               }
++               onMouseEnter={(event) => {
++                 if (!isActive) {
++-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
+++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
++                   event.currentTarget.style.color = 'var(--text-strong)';
++                 }
++               }}
++               onMouseLeave={(event) => {
++                 if (!isActive) {
++-                  event.currentTarget.style.background = 'var(--bg-secondary)';
+++                  event.currentTarget.style.background = 'transparent';
++                   event.currentTarget.style.color = 'var(--text-muted)';
++                 }
++               }}
++             >
++-              <span className="flex items-center gap-3">
++-                <Icon className="h-4 w-4" />
++-                {item.label}
++-              </span>
++-              <span
++-                className="text-xs uppercase tracking-[0.25em]"
++-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
++-              >
++-                {isActive ? 'Live' : 'Idle'}
+++              <span className="flex min-w-0 items-center gap-3">
+++                <Icon className="h-4 w-4 shrink-0" />
+++                <span className="truncate">{item.label}</span>
++               </span>
+++              {badge}
++             </button>
++           );
++         })}
++       </nav>
++ 
++-      {hasHorario ? (
++-        <div
++-          className="mt-auto border-t pt-4"
++-          style={{ borderColor: 'var(--border-subtle)' }}
+++      <section
+++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+++      >
+++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+++          Sincronización
+++        </p>
+++        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
+++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
+++          <span className="font-medium">{syncInfo.text}</span>
+++        </div>
+++        {syncTimestamp ? (
+++          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++            Última sincronización · {syncTimestamp}
+++          </p>
+++        ) : null}
+++        <button
+++          type="button"
+++          onClick={onSyncAll}
+++          disabled={syncState.status === 'syncing'}
+++          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
+++          style={
+++            syncState.status === 'syncing'
+++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
+++              : { background: 'var(--itson-blue, var(--accent))' }
+++          }
++         >
++-          <div
++-            className="rounded-2xl border p-3"
++-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
++-          >
++-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
++-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
++-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
+++          {syncState.status === 'syncing' ? (
+++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
+++          ) : (
+++            <RefreshCw className="h-3.5 w-3.5" />
+++          )}
+++          Sincronizar todo
+++        </button>
+++        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
+++          Actualiza toda la información de la app
+++        </p>
+++      </section>
+++
+++      <section
+++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+++      >
+++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
+++          HOY · {formatDayShort(new Date())}
+++        </p>
+++
+++        <div className="mt-3">
+++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+++            Entrega
+++          </p>
+++          {proximaEntrega ? (
+++            <div className="mt-1 min-w-0">
+++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
+++                {proximaEntrega.nombre}
+++              </p>
+++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
+++              </p>
++             </div>
+++          ) : (
+++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
+++          )}
+++        </div>
++ 
++-            {nextClass ? (
++-              <div className="space-y-2">
++-                <div className="flex items-start justify-between gap-2">
++-                  <div className="min-w-0">
++-                    <p
++-                      className="truncate text-sm font-medium"
++-                      style={{ color: 'var(--text-strong)' }}
++-                      title={nextClass.materia}
++-                    >
++-                      {nextClass.materia}
++-                    </p>
++-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
++-                      {nextClass.hora} · {nextClass.salon}
++-                    </p>
++-                  </div>
++-
++-                  {nextClass.meetLink ? (
++-                    <button
++-                      type="button"
++-                      onClick={handleOpenMeetLink}
++-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
++-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
++-                      title="Abrir videollamada"
++-                    >
++-                      <ExternalLink className="h-3.5 w-3.5" />
++-                    </button>
++-                  ) : null}
++-                </div>
+++        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
++ 
+++        <div>
+++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
+++            Clase
+++          </p>
+++          {nextClass ? (
+++            <div className="mt-1 min-w-0">
+++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
+++                {nextClass.materia}
+++              </p>
+++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++                <span className="truncate">{nextClass.hora}</span>
++                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
++                   <span
++-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
++-                    style={{
++-                      background: 'var(--retrasada-bg)',
++-                      borderColor: 'var(--retrasada-border)',
++-                      color: 'var(--retrasada-text)',
++-                    }}
+++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
+++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
++                   >
++-                    {getNextClassStatus(nextClass)}
+++                    {getClassStatus(nextClass)}
++                   </span>
++                 ) : (
++-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
++-                    {getNextClassStatus(nextClass)}
++-                  </p>
+++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
++                 )}
++               </div>
++-            ) : (
++-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
++-                Sin clases próximas
++-              </p>
++-            )}
++-          </div>
+++            </div>
+++          ) : (
+++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
+++          )}
+++        </div>
+++      </section>
+++
+++      <footer
+++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
+++        style={{ borderColor: 'var(--border)' }}
+++      >
+++        <div
+++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
+++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
+++        >
+++          {initials}
+++        </div>
+++        <div className="min-w-0">
+++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
+++            {profileName}
+++          </p>
+++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
+++            {userId || 'Sin ID configurado'}
+++          </p>
++         </div>
++-      ) : null}
+++      </footer>
++     </aside>
++   );
++ }
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
++**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
++**Output de verificación:**
++```
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1767 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
++✓ built in 8.70s
++The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++
++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
++
++Dist logo assets:
++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
++
++Confirmed:
++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
++- Dist logo asset is under 20KB.
++- handleSyncAll only adds runCIA when hasFinales is true.
++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_066.md`
+```diff
+diff --git a/reports/report_066.md b/reports/report_066.md
+new file mode 100644
+index 0000000..74c057d
+--- /dev/null
++++ b/reports/report_066.md
+@@ -0,0 +1,3027 @@
++# Report 066
++**Fecha:** 2026-05-31 23:05  
++**Agente:** Codex  
++**Tipo:** feature
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
++**Archivos modificados:** 11
++
++## Archivos modificados
++- `electron/handlers/calendario.js` — archivo creado como parte de la base inicial
++- `electron/handlers/horario.js` — archivo actualizado en esta tarea
++- `electron/handlers/settings.js` — archivo actualizado en esta tarea
++- `electron/main.js` — archivo actualizado en esta tarea
++- `electron/preload.js` — archivo actualizado en esta tarea
++- `generate-report.js` — archivo actualizado en esta tarea
++- `reports/report_065.md` — archivo creado como parte de la base inicial
++- `src/App.jsx` — archivo actualizado en esta tarea
++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo creado como parte de la base inicial
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| electron/handlers/calendario.js | 428 | 0 |
++| electron/handlers/horario.js | 57 | 0 |
++| electron/handlers/settings.js | 26 | 0 |
++| electron/main.js | 10 | 1 |
++| electron/preload.js | 2 | 0 |
++| generate-report.js | 34 | 24 |
++| reports/report_065.md | 929 | 0 |
++| src/App.jsx | 220 | 32 |
++| src/components/Onboarding.jsx | 2 | 1 |
++| src/components/Sidebar.jsx | 306 | 134 |
++| src/pages/Calendario.jsx | 318 | 0 |
++
++## Resumen
++Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `electron/handlers/calendario.js`
++```diff
++diff --git a/electron/handlers/calendario.js b/electron/handlers/calendario.js
++new file mode 100644
++index 0000000..77042d0
++--- /dev/null
+++++ b/electron/handlers/calendario.js
++@@ -0,0 +1,428 @@
+++const fs = require('fs');
+++const path = require('path');
+++const electron = require('electron');
+++const { chromium } = require('playwright');
+++
+++const app = electron?.app;
+++
+++const CALENDARIO_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
+++const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
+++const PAGE_TIMEOUT_MS = 20_000;
+++const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
+++
+++const SPANISH_MONTHS = {
+++  enero: 0,
+++  febrero: 1,
+++  marzo: 2,
+++  abril: 3,
+++  mayo: 4,
+++  junio: 5,
+++  julio: 6,
+++  agosto: 7,
+++  septiembre: 8,
+++  setiembre: 8,
+++  octubre: 9,
+++  noviembre: 10,
+++  diciembre: 11,
+++};
+++
+++function getUserDataPath() {
+++  if (app && typeof app.getPath === 'function') {
+++    return app.getPath('userData');
+++  }
+++
+++  const fallbackPath = path.join(process.cwd(), '.local-data');
+++  fs.mkdirSync(fallbackPath, { recursive: true });
+++  return fallbackPath;
+++}
+++
+++function getTempPath() {
+++  if (app && typeof app.getPath === 'function') {
+++    return app.getPath('temp');
+++  }
+++
+++  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
+++  fs.mkdirSync(fallbackPath, { recursive: true });
+++  return fallbackPath;
+++}
+++
+++function getCalendarioCachePath() {
+++  return path.join(getUserDataPath(), 'calendario-cache.json');
+++}
+++
+++function discardFile(filePath) {
+++  if (fs.existsSync(filePath)) {
+++    fs.unlinkSync(filePath);
+++  }
+++}
+++
+++function readCalendarioCache() {
+++  const cachePath = getCalendarioCachePath();
+++
+++  if (!fs.existsSync(cachePath)) {
+++    return null;
+++  }
+++
+++  try {
+++    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
+++
+++    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
+++      discardFile(cachePath);
+++      return null;
+++    }
+++
+++    return parsed;
+++  } catch (_error) {
+++    discardFile(cachePath);
+++    return null;
+++  }
+++}
+++
+++function writeCalendarioCache(payload) {
+++  const nextPayload = {
+++    events: Array.isArray(payload?.events) ? payload.events : [],
+++    timestamp: Date.now(),
+++  };
+++
+++  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
+++  return nextPayload;
+++}
+++
+++function clearCache() {
+++  discardFile(getCalendarioCachePath());
+++  return { success: true };
+++}
+++
+++function isTimeoutError(error) {
+++  return Boolean(
+++    error &&
+++      (error.name === 'TimeoutError' ||
+++        /timeout/i.test(error.message || '') ||
+++        /timed out/i.test(error.message || '')),
+++  );
+++}
+++
+++function isNetworkError(error) {
+++  const message = error?.message || '';
+++  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
+++    message,
+++  );
+++}
+++
+++async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
+++  let lastError;
+++
+++  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
+++    try {
+++      return await page.goto(url, {
+++        waitUntil: 'domcontentloaded',
+++        timeout: PAGE_TIMEOUT_MS,
+++        ...options,
+++      });
+++    } catch (error) {
+++      lastError = error;
+++
+++      if (isNetworkError(error)) {
+++        throw new Error('NO_INTERNET');
+++      }
+++
+++      if (!isTimeoutError(error) || attempt === maxRetries) {
+++        throw error;
+++      }
+++
+++      await page.waitForTimeout(1500);
+++    }
+++  }
+++
+++  throw lastError;
+++}
+++
+++async function applyResourceBlocking(page) {
+++  await page.route('**/*', (route) => {
+++    const resourceType = route.request().resourceType();
+++
+++    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
+++      route.abort();
+++      return;
+++    }
+++
+++    route.continue();
+++  });
+++}
+++
+++function unfoldICS(content) {
+++  return String(content || '').replace(/\r?\n[ \t]/g, '');
+++}
+++
+++function unescapeICSText(value) {
+++  return String(value || '')
+++    .replace(/\\n/g, '\n')
+++    .replace(/\\,/g, ',')
+++    .replace(/\\;/g, ';')
+++    .replace(/\\\\/g, '\\')
+++    .trim();
+++}
+++
+++function parseICSDate(str) {
+++  if (!str) return null;
+++  const d = String(str).replace(/[TZ]/g, '');
+++  if (d.length < 8) return null;
+++
+++  try {
+++    return new Date(
+++      Number(d.slice(0, 4)),
+++      Number(d.slice(4, 6)) - 1,
+++      Number(d.slice(6, 8)),
+++      d.length >= 10 ? Number(d.slice(8, 10)) : 0,
+++      d.length >= 12 ? Number(d.slice(10, 12)) : 0,
+++    ).toISOString();
+++  } catch (_error) {
+++    return null;
+++  }
+++}
+++
+++function parseICS(content) {
+++  const events = [];
+++  const blocks = unfoldICS(content).split('BEGIN:VEVENT');
+++
+++  for (const block of blocks.slice(1)) {
+++    const get = (field) => {
+++      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
+++      return match ? unescapeICSText(match[1]) : '';
+++    };
+++    const inicio = parseICSDate(get('DTSTART'));
+++
+++    if (!inicio) {
+++      continue;
+++    }
+++
+++    events.push({
+++      titulo: get('SUMMARY') || 'Evento',
+++      inicio,
+++      fin: parseICSDate(get('DTEND')),
+++      descripcion: get('DESCRIPTION'),
+++      ubicacion: get('LOCATION'),
+++      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
+++    });
+++  }
+++
+++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+++}
+++
+++function parseDateText(text) {
+++  const normalized = String(text || '').trim();
+++
+++  if (!normalized) {
+++    return null;
+++  }
+++
+++  const nativeDate = new Date(normalized);
+++  if (!Number.isNaN(nativeDate.getTime())) {
+++    return nativeDate.toISOString();
+++  }
+++
+++  const spanishMatch = normalized
+++    .toLowerCase()
+++    .normalize('NFD')
+++    .replace(/[\u0300-\u036f]/g, '')
+++    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
+++
+++  if (spanishMatch) {
+++    const day = Number(spanishMatch[1]);
+++    const month = SPANISH_MONTHS[spanishMatch[2]];
+++    const year = Number(spanishMatch[3]);
+++
+++    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
+++      return new Date(year, month, day).toISOString();
+++    }
+++  }
+++
+++  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
+++  if (numericMatch) {
+++    const day = Number(numericMatch[1]);
+++    const month = Number(numericMatch[2]) - 1;
+++    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
+++    return new Date(year, month, day).toISOString();
+++  }
+++
+++  return null;
+++}
+++
+++function normalizeEvent(event) {
+++  return {
+++    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
+++    inicio: event?.inicio || new Date().toISOString(),
+++    fin: event?.fin || null,
+++    descripcion: String(event?.descripcion || '').trim(),
+++    ubicacion: String(event?.ubicacion || '').trim(),
+++    categoria: String(event?.categoria || 'General').trim() || 'General',
+++  };
+++}
+++
+++async function tryDownloadICS(page) {
+++  const downloadPath = getTempPath();
+++
+++  try {
+++    const client = await page.context().newCDPSession(page);
+++    await client.send('Page.setDownloadBehavior', {
+++      behavior: 'allow',
+++      downloadPath,
+++    });
+++  } catch (_error) {
+++    // Download behavior is best-effort; DOM fallback still works.
+++  }
+++
+++  const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
+++  const downloadButton = await page
+++    .$('a[href*=".ics"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario"), button:has-text("Descargar"), a:has-text("Descargar")')
+++    .catch(() => null);
+++
+++  if (!downloadButton) {
+++    return null;
+++  }
+++
+++  await downloadButton.click().catch(() => {});
+++  const download = await downloadPromise;
+++
+++  if (!download) {
+++    return null;
+++  }
+++
+++  const tmpPath = path.join(downloadPath, 'itson-cal.ics');
+++  discardFile(tmpPath);
+++  await download.saveAs(tmpPath);
+++
+++  const raw = fs.readFileSync(tmpPath, 'utf8');
+++  if (!raw.includes('BEGIN:VCALENDAR')) {
+++    return null;
+++  }
+++
+++  return parseICS(raw);
+++}
+++
+++async function scrapeDOMEvents(page) {
+++  await page.waitForTimeout(3000);
+++
+++  const events = await page.evaluate(() => {
+++    const rows = document.querySelectorAll(
+++      'tr[data-event], .evento, .event, [class*="evento"], [class*="calendar-event"], ' +
+++        'li[class*="event"], .fc-event, .item-evento',
+++    );
+++
+++    if (rows.length) {
+++      return Array.from(rows)
+++        .map((el) => ({
+++          titulo: (
+++            el.querySelector('[class*="titulo"],[class*="title"],h3,h4,strong,td:nth-child(2)')
+++              ?.textContent || el.textContent
+++          )
+++            .trim()
+++            .slice(0, 150),
+++          fechaTexto:
+++            el.querySelector('[class*="fecha"],[class*="date"],time,td:nth-child(1)')
+++              ?.textContent?.trim() || '',
+++          categoria:
+++            el.querySelector('[class*="categ"],[class*="tipo"],[class*="tag"]')
+++              ?.textContent?.trim() || 'General',
+++          descripcion:
+++            el.querySelector('[class*="desc"],[class*="detalle"]')?.textContent?.trim() || '',
+++        }))
+++        .filter((event) => event.titulo && event.titulo.length > 2);
+++    }
+++
+++    const tables = document.querySelectorAll('table');
+++    const results = [];
+++
+++    tables.forEach((table) => {
+++      table.querySelectorAll('tr').forEach((tr) => {
+++        const cells = tr.querySelectorAll('td');
+++        if (cells.length >= 2) {
+++          results.push({
+++            titulo: cells[1]?.textContent?.trim() || cells[0]?.textContent?.trim(),
+++            fechaTexto: cells[0]?.textContent?.trim() || '',
+++            categoria: cells[2]?.textContent?.trim() || 'General',
+++            descripcion: '',
+++          });
+++        }
+++      });
+++    });
+++
+++    return results.filter((event) => event.titulo && event.titulo.length > 2);
+++  });
+++
+++  return events
+++    .map((event) =>
+++      normalizeEvent({
+++        titulo: event.titulo,
+++        inicio: parseDateText(event.fechaTexto) || new Date().toISOString(),
+++        fin: null,
+++        categoria: event.categoria,
+++        descripcion: event.descripcion,
+++        ubicacion: '',
+++      }),
+++    )
+++    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+++}
+++
+++async function scrapeCalendario() {
+++  const browser = await chromium.launch({ headless: true });
+++
+++  try {
+++    const page = await browser.newPage();
+++    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
+++    await applyResourceBlocking(page);
+++    await gotoWithRetry(page, CALENDARIO_URL, {
+++      waitUntil: 'domcontentloaded',
+++      timeout: PAGE_TIMEOUT_MS,
+++    });
+++
+++    const icsEvents = await tryDownloadICS(page);
+++    if (Array.isArray(icsEvents) && icsEvents.length > 0) {
+++      return { events: icsEvents.map(normalizeEvent), timestamp: Date.now(), fromCache: false };
+++    }
+++
+++    const domEvents = await scrapeDOMEvents(page);
+++    return { events: domEvents, timestamp: Date.now(), fromCache: false };
+++  } finally {
+++    await browser.close();
+++  }
+++}
+++
+++async function run() {
+++  const cached = readCalendarioCache();
+++
+++  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
+++    return {
+++      ...cached,
+++      fromCache: true,
+++    };
+++  }
+++
+++  try {
+++    const result = await scrapeCalendario();
+++    const cachedPayload = writeCalendarioCache(result);
+++    return {
+++      ...cachedPayload,
+++      fromCache: false,
+++    };
+++  } catch (error) {
+++    if (error?.message === 'NO_INTERNET') {
+++      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
+++    }
+++
+++    return {
+++      error: error?.message
+++        ? `Falló la extracción del calendario escolar: ${error.message}`
+++        : 'Falló la extracción del calendario escolar por un error no identificado.',
+++    };
+++  }
+++}
+++
+++module.exports = {
+++  clearCache,
+++  getCalendarioCachePath,
+++  parseDateText,
+++  parseICS,
+++  parseICSDate,
+++  run,
+++};
++```
++
++### `electron/handlers/horario.js`
++```diff
++diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
++index 45995c1..d957056 100644
++--- a/electron/handlers/horario.js
+++++ b/electron/handlers/horario.js
++@@ -913,6 +913,61 @@ async function loginToCIA(page, user, password) {
++   return null;
++ }
++ 
+++async function tryExtractStudentName(page) {
+++  const selectors = [
+++    '#ctl00_cLabel_nombre',
+++    '.user-name',
+++    '#user-name',
+++    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
+++    '.navbar-text',
+++    'span[id*="Name"]',
+++  ];
+++
+++  for (const selector of selectors) {
+++    try {
+++      const element = await page.$(selector);
+++
+++      if (!element) {
+++        continue;
+++      }
+++
+++      const text = normalizeWhitespace(await element.textContent());
+++      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
+++        return text;
+++      }
+++    } catch (_error) {
+++      // Continue with the next selector.
+++    }
+++  }
+++
+++  try {
+++    const bodyText = await page.evaluate(() => document.body?.innerText || '');
+++    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
+++    if (match) {
+++      return normalizeWhitespace(match[1]);
+++    }
+++  } catch (_error) {
+++    // Silent fallback.
+++  }
+++
+++  return null;
+++}
+++
+++async function persistStudentNameFromCIA(page) {
+++  const nombre = await tryExtractStudentName(page);
+++
+++  if (!nombre) {
+++    return;
+++  }
+++
+++  try {
+++    const { saveStudentName } = require('./settings');
+++    await saveStudentName(nombre);
+++  } catch (_error) {
+++    // Student name persistence must never block horario scraping.
+++  }
+++}
+++
++ async function getTargetContentFrame(page, timeout = 25_000) {
++   return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
++ }
++@@ -2413,6 +2468,7 @@ async function scrapeHorario(controller = {}) {
++       return loginResult;
++     }
++ 
+++    await persistStudentNameFromCIA(page);
++     await applyResourceBlocking(page);
++     let scheduleFrame;
++     try {
++@@ -2427,6 +2483,7 @@ async function scrapeHorario(controller = {}) {
++         if (retryLogin?.error) {
++           return retryLogin;
++         }
+++        await persistStudentNameFromCIA(page);
++         scheduleFrame = await openHorarioPage(page);
++       } else {
++         throw error;
++```
++
++### `electron/handlers/settings.js`
++```diff
++diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
++index 0b6f430..cdefc37 100644
++--- a/electron/handlers/settings.js
+++++ b/electron/handlers/settings.js
++@@ -26,6 +26,7 @@ function getSettings() {
++     ciaUser: process.env.CIA_USER || '',
++     hasCIAPassword: Boolean(process.env.CIA_PASS),
++     notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
+++    studentName: process.env.STUDENT_NAME || '',
++   };
++ }
++ 
++@@ -96,6 +97,30 @@ function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore
++   }
++ }
++ 
+++async function saveStudentName(name) {
+++  try {
+++    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
+++
+++    if (!normalizedName) {
+++      return { success: false, error: 'Nombre de estudiante vacío.' };
+++    }
+++
+++    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
+++    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);
+++
+++    const envPath = getEnvFilePath();
+++    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
+++    process.env.STUDENT_NAME = normalizedName;
+++
+++    return { success: true };
+++  } catch (error) {
+++    return {
+++      success: false,
+++      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
+++    };
+++  }
+++}
+++
++ function registerSettingsHandlers() {
++   ipcMain.handle('settings:get', async () => getSettings());
++   ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
++@@ -105,5 +130,6 @@ module.exports = {
++   getEnvFilePath,
++   getSettings,
++   registerSettingsHandlers,
+++  saveStudentName,
++   saveSettings,
++ };
++```
++
++### `electron/main.js`
++```diff
++diff --git a/electron/main.js b/electron/main.js
++index af41ff2..b00bba1 100644
++--- a/electron/main.js
+++++ b/electron/main.js
++@@ -8,6 +8,7 @@ const { registerFileHandlers } = require('./handlers/files');
++ const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
++ const { registerSettingsHandlers } = require('./handlers/settings');
++ const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
+++const calendarioHandler = require('./handlers/calendario');
++ 
++ const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
++ const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
++@@ -57,6 +58,8 @@ app.whenReady().then(() => {
++   registerFileHandlers();
++   registerSettingsHandlers();
++   registerNotificationHandlers();
+++  ipcMain.handle('calendario:run', () => calendarioHandler.run());
+++  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
++   ipcMain.removeHandler('shell:open-external');
++   ipcMain.handle('shell:open-external', async (_event, url) => {
++     if (url && typeof url === 'string' && url.startsWith('http')) {
++@@ -72,11 +75,13 @@ app.whenReady().then(() => {
++     clearActivitiesCache();
++     clearHorarioCache();
++     clearCIACache();
+++    calendarioHandler.clearCache();
++ 
++-    const [actividades, horario, calificaciones] = await Promise.allSettled([
+++    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
++       getActivitiesWithCache(),
++       getHorarioWithCache(),
++       getCalificacionesWithCache(),
+++      calendarioHandler.run(),
++     ]);
++ 
++     return {
++@@ -90,6 +95,10 @@ app.whenReady().then(() => {
++         calificaciones.status === 'fulfilled'
++           ? calificaciones.value
++           : { error: calificaciones.reason?.message },
+++      calendario:
+++        calendario.status === 'fulfilled'
+++          ? calendario.value
+++          : { error: calendario.reason?.message },
++     };
++   });
++   createMainWindow();
++```
++
++### `electron/preload.js`
++```diff
++diff --git a/electron/preload.js b/electron/preload.js
++index 05a306d..48a4dff 100644
++--- a/electron/preload.js
+++++ b/electron/preload.js
++@@ -5,8 +5,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
++   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
++   runCIA: () => ipcRenderer.invoke('cia:run'),
++   runHorario: () => ipcRenderer.invoke('horario:run'),
+++  runCalendario: () => ipcRenderer.invoke('calendario:run'),
++   clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
++   clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
+++  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
++   saveHorarioLink: (numeroClase, link) =>
++     ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
++   getSettings: () => ipcRenderer.invoke('settings:get'),
++```
++
++### `generate-report.js`
++```diff
++diff --git a/generate-report.js b/generate-report.js
++index fa9b68e..a0779f8 100644
++--- a/generate-report.js
+++++ b/generate-report.js
++@@ -19,35 +19,45 @@ const MAX_DIFF_BYTES = 150 * 1024;
++ 
++ const VERIFICATION = {
++   buildStatus: 'PASS',
++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
++-  verificationOutput: `> dvpotro@0.1.0 build
+++  testsRun: 'npm run build + handler/preload/settings static checks + calendario empty-state static check + node syntax checks',
+++  verificationCmd: 'node calendario/settings/preload checks; npm run build; node -c electron handlers; node Calendario empty-state check',
+++  verificationOutput: `RED checks before implementation:
+++calendario handler missing: MODULE_NOT_FOUND
+++studentName field: false
+++runCalendario exposed: false
+++
+++GREEN checks after implementation:
+++$ node -e "const c = require('./electron/handlers/calendario'); console.log('run:', typeof c.run); console.log('clearCache:', typeof c.clearCache);"
+++run: function
+++clearCache: function
+++
+++$ node -e "require('dotenv').config(); const s = require('./electron/handlers/settings'); const st = s.getSettings ? s.getSettings() : null; console.log('studentName field:', 'studentName' in (st||{}));"
+++studentName field: true
+++
+++$ node -e "const fs = require('fs'); const pre = fs.readFileSync('./electron/preload.js','utf-8'); console.log('runCalendario exposed:', pre.includes('runCalendario'));"
+++runCalendario exposed: true
+++
+++$ npm run build
+++> dvpotro@0.1.0 build
++ > vite build
++ 
++ vite v5.4.21 building for production...
++-✓ 1767 modules transformed.
++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
++-✓ built in 4.93s
+++transforming...
+++✓ 1768 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-B1C-mb04.css             31.45 kB │ gzip:  6.71 kB
+++dist/assets/index-Bydx8v6A.js              314.96 kB │ gzip: 86.03 kB
+++✓ built in 14.62s
++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++ 
++-> dvpotro@0.1.0 dist:dir
++-> vite build && electron-builder --dir
++-
++-✓ 1767 modules transformed.
++-✓ built in 4.83s
++-• electron-builder version=26.8.1
++-• loaded configuration file=package.json (build field)
++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
++-
++-branding verification OK
++-active branding reference scan OK: no old visible references
++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+++$ node -c electron/handlers/calendario.js; node -c electron/handlers/settings.js; node -c electron/main.js; node -c electron/preload.js
+++PASS
+++
+++$ node -e "const fs=require('fs'); const src=fs.readFileSync('./src/pages/Calendario.jsx','utf8'); console.log('calendar empty safe:', src.includes('calendarData = { events: [] }') && src.includes('Array.isArray(calendarData?.events)'));"
+++calendar empty safe: true`,
++ };
++ 
++ function ensureReportsDir() {
++```
++
++### `reports/report_065.md`
++```diff
++diff --git a/reports/report_065.md b/reports/report_065.md
++new file mode 100644
++index 0000000..98c1356
++--- /dev/null
+++++ b/reports/report_065.md
++@@ -0,0 +1,929 @@
+++# Report 065
+++**Fecha:** 2026-05-31 18:33  
+++**Agente:** Codex  
+++**Tipo:** refactor
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
+++**Archivos modificados:** 4
+++
+++## Archivos modificados
+++- `generate-report.js` — archivo actualizado en esta tarea
+++- `src/App.jsx` — archivo actualizado en esta tarea
+++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
+++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| generate-report.js | 19 | 21 |
+++| src/App.jsx | 120 | 30 |
+++| src/components/Onboarding.jsx | 2 | 1 |
+++| src/components/Sidebar.jsx | 308 | 134 |
+++
+++## Resumen
+++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `generate-report.js`
+++```diff
+++diff --git a/generate-report.js b/generate-report.js
+++index fa9b68e..90a2816 100644
+++--- a/generate-report.js
++++++ b/generate-report.js
+++@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
+++ 
+++ const VERIFICATION = {
+++   buildStatus: 'PASS',
+++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
+++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
++++  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
++++  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
+++   verificationOutput: `> dvpotro@0.1.0 build
+++ > vite build
+++ 
+++ vite v5.4.21 building for production...
++++transforming...
+++ ✓ 1767 modules transformed.
+++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
+++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
+++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
+++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
+++-✓ built in 4.93s
++++rendering chunks...
++++computing gzip size...
++++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
++++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
++++✓ built in 8.70s
+++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+++ 
+++-> dvpotro@0.1.0 dist:dir
+++-> vite build && electron-builder --dir
++++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
+++ 
+++-✓ 1767 modules transformed.
+++-✓ built in 4.83s
+++-• electron-builder version=26.8.1
+++-• loaded configuration file=package.json (build field)
+++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
+++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
+++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
+++-
+++-branding verification OK
+++-active branding reference scan OK: no old visible references
+++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
+++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
++++Dist logo assets:
++++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
++++
++++Confirmed:
++++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
++++- Dist logo asset is under 20KB.
++++- handleSyncAll only adds runCIA when hasFinales is true.
++++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
+++ };
+++ 
+++ function ensureReportsDir() {
+++```
+++
+++### `src/App.jsx`
+++```diff
+++diff --git a/src/App.jsx b/src/App.jsx
+++index 137c482..b672732 100644
+++--- a/src/App.jsx
++++++ b/src/App.jsx
+++@@ -1,4 +1,4 @@
+++-import { useCallback, useEffect, useRef, useState } from 'react';
++++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+++ import Sidebar from './components/Sidebar';
+++ import Onboarding from './components/Onboarding';
+++ import TaskPanel from './components/TaskPanel';
+++@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
+++ import Horario from './pages/Horario';
+++ import Calificaciones from './pages/Calificaciones';
+++ import Ajustes from './pages/Ajustes';
+++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
++++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
+++ 
+++ const pageRegistry = {
+++   activities: {
+++@@ -44,7 +44,7 @@ function App() {
+++   const [loading, setLoading] = useState(false);
+++   const [loadingHorario, setLoadingHorario] = useState(false);
+++   const [loadingCIA, setLoadingCIA] = useState(false);
+++-  const [syncingAll, setSyncingAll] = useState(false);
++++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
+++   const [syncingModules, setSyncingModules] = useState([]);
+++   const [error, setError] = useState('');
+++   const [errorHorario, setErrorHorario] = useState('');
+++@@ -59,6 +59,7 @@ function App() {
+++   const [horarioCargado, setHorarioCargado] = useState(false);
+++   const [ciaCargado, setCiaCargado] = useState(false);
+++   const [studentName, setStudentName] = useState('');
++++  const [settingsData, setSettingsData] = useState({});
+++ 
+++   const initializedRef = useRef(false);
+++   const nearExpiryRefreshLaunchedRef = useRef(false);
+++@@ -75,6 +76,21 @@ function App() {
+++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
+++       ),
+++   );
++++  const proximaEntrega = useMemo(() => {
++++    const pending = (activities || []).filter(
++++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++++    );
++++
++++    if (!pending.length) {
++++      return null;
++++    }
++++
++++    return [...pending].sort((left, right) => {
++++      if (!left.fechaLimite) return 1;
++++      if (!right.fechaLimite) return -1;
++++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
++++    })[0];
++++  }, [activities]);
+++ 
+++   const addSyncingModule = (moduleId) => {
+++     setSyncingModules((previous) => {
+++@@ -135,6 +151,9 @@ function App() {
+++       horario: 'horario',
+++       calificaciones: 'calificaciones',
+++       ajustes: 'settings',
++++      calendario: 'activities',
++++      notifications: 'activities',
++++      notificaciones: 'activities',
+++     };
+++ 
+++     const nextPage = pageAliases[pageId] || pageId;
+++@@ -156,6 +175,7 @@ function App() {
+++ 
+++     try {
+++       const settings = await api.getSettings();
++++      setSettingsData(settings || {});
+++       const hasUser = Boolean(settings?.user?.trim());
+++       const hasPassword = Boolean(settings?.hasPassword);
+++       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+++@@ -167,6 +187,7 @@ function App() {
+++       initializedRef.current = false;
+++       nearExpiryRefreshLaunchedRef.current = false;
+++     } catch (_error) {
++++      setSettingsData({});
+++       setStudentName('');
+++       setShowOnboarding(false);
+++     } finally {
+++@@ -430,50 +451,109 @@ function App() {
+++   };
+++ 
+++   const handleSyncAll = async () => {
+++-    if (!api?.syncAll) {
++++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
++++
++++    if (syncState.status === 'syncing' || !scraperApi) {
+++       return;
+++     }
+++ 
+++-    setSyncingAll(true);
++++    setSyncState((current) => ({ ...current, status: 'syncing' }));
+++     addSyncingModule('activities');
+++     addSyncingModule('horario');
+++-    addSyncingModule('calificaciones');
++++    if (hasFinales) {
++++      addSyncingModule('calificaciones');
++++    }
+++ 
+++     try {
+++-      const result = await api.syncAll();
++++      const calls = [
++++        { id: 'activities', promise: scraperApi.runScraper?.() },
++++        { id: 'horario', promise: scraperApi.runHorario?.() },
++++      ];
+++ 
+++-      if (result?.actividades?.activities) {
+++-        setActivities(result.actividades.activities);
+++-        if (result.actividades?.timestamp) {
+++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+++-        }
++++      if (hasFinales) {
++++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
+++       }
+++ 
+++-      if (result?.horario?.materias) {
+++-        setHorario({
+++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
+++-          diasConClases: Array.isArray(result.horario.diasConClases)
+++-            ? result.horario.diasConClases
+++-            : [],
+++-        });
+++-        if (result.horario?.timestamp) {
+++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
++++      const results = await Promise.allSettled(calls.map((call) => call.promise));
++++      let hasErrors = false;
++++
++++      results.forEach((result, index) => {
++++        const moduleId = calls[index]?.id;
++++
++++        if (result.status === 'rejected') {
++++          hasErrors = true;
++++          return;
+++         }
+++-      }
+++ 
+++-      if (result?.calificaciones?.materias) {
+++-        setCalificaciones(result.calificaciones.materias);
+++-        if (result.calificaciones?.timestamp) {
+++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
++++        const response = result.value;
++++
++++        if (response?.error) {
++++          hasErrors = true;
++++
++++          if (moduleId === 'activities') {
++++            setErrorCode(response.error);
++++            setError(getFriendlyIVirtualError(response.error));
++++          }
++++
++++          if (moduleId === 'horario') {
++++            setErrorHorario(getFriendlyIVirtualError(response.error));
++++          }
++++
++++          if (moduleId === 'calificaciones') {
++++            setErrorCIACode(response.error);
++++            setErrorCIA(getFriendlyIVirtualError(response.error));
++++          }
++++
++++          return;
+++         }
+++-      }
++++
++++        if (moduleId === 'activities') {
++++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
++++          setActivities(activitiesList);
++++          setError('');
++++          setErrorCode('');
++++          if (response?.timestamp) {
++++            setLastSyncAt(new Date(response.timestamp).toISOString());
++++          }
++++        }
++++
++++        if (moduleId === 'horario') {
++++          setHorario({
++++            materias: Array.isArray(response?.materias) ? response.materias : [],
++++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
++++          });
++++          setErrorHorario('');
++++          if (response?.timestamp) {
++++            setLastSyncHorario(new Date(response.timestamp).toISOString());
++++          }
++++        }
++++
++++        if (moduleId === 'calificaciones') {
++++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
++++          setCalificaciones(materiasList);
++++          setErrorCIA('');
++++          setErrorCIACode('');
++++          if (response?.timestamp) {
++++            setLastSyncCIA(new Date(response.timestamp).toISOString());
++++          }
++++        }
++++      });
++++
++++      const nextStatus = hasErrors ? 'error' : 'done';
++++      setSyncState({ status: nextStatus, lastSync: new Date() });
++++      setTimeout(
++++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
++++        hasErrors ? 4000 : 3000,
++++      );
+++     } catch (_error) {
+++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
++++      setSyncState((current) => ({ ...current, status: 'error' }));
++++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
+++     } finally {
+++       removeSyncingModule('activities');
+++       removeSyncingModule('horario');
+++-      removeSyncingModule('calificaciones');
+++-      setSyncingAll(false);
++++      if (hasFinales) {
++++        removeSyncingModule('calificaciones');
++++      }
+++     }
+++   };
+++ 
+++@@ -556,10 +636,19 @@ function App() {
+++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
+++         <Sidebar
+++           activePage={activePage}
++++          activities={activities}
++++          calendarCount={0}
+++           diasConClases={horario?.diasConClases ?? []}
++++          errorHorario={errorHorario}
+++           hasFinales={hasFinales}
+++           horario={horario?.materias ?? []}
++++          horarioData={horario}
++++          onSyncAll={handleSyncAll}
+++           onNavigate={handleNavigate}
++++          proximaEntrega={proximaEntrega}
++++          settingsData={settingsData}
++++          studentName={studentName}
++++          syncState={syncState}
+++         />
+++         {!settingsReady ? (
+++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
+++@@ -617,3 +706,4 @@ function App() {
+++ }
+++ 
+++ export default App;
++++
+++```
+++
+++### `src/components/Onboarding.jsx`
+++```diff
+++diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
+++index 3e820a2..7bca3ac 100644
+++--- a/src/components/Onboarding.jsx
++++++ b/src/components/Onboarding.jsx
+++@@ -1,5 +1,5 @@
+++ import { ArrowRight } from 'lucide-react';
+++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+++ 
+++ function Onboarding({ onNavigate }) {
+++   return (
+++@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
+++ }
+++ 
+++ export default Onboarding;
++++
+++```
+++
+++### `src/components/Sidebar.jsx`
+++```diff
+++diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
+++index c7458cb..1aef7a5 100644
+++--- a/src/components/Sidebar.jsx
++++++ b/src/components/Sidebar.jsx
+++@@ -1,216 +1,390 @@
+++-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
+++-import { useEffect, useState } from 'react';
+++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++++import {
++++  AlertCircle,
++++  Bell,
++++  BookOpen,
++++  CalendarDays,
++++  CheckCircle,
++++  Clock,
++++  Info,
++++  Loader2,
++++  RefreshCw,
++++  Settings,
++++} from 'lucide-react';
++++import { useEffect, useMemo, useState } from 'react';
++++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+++ import { getNextClass } from '../utils/horario.js';
+++ 
+++-const navigationItems = [
+++-  { id: 'activities', label: 'Actividades', icon: ListChecks },
+++-  { id: 'horario', label: 'Horario', icon: Calendar },
+++-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
+++-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
++++const NAV_ITEMS = [
++++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
++++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
++++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
++++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
++++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
+++ ];
+++ 
+++-function getNextClassStatus(nextClass) {
+++-  if (!nextClass) {
+++-    return '';
++++function normDate(value) {
++++  const date = value ? new Date(value) : null;
++++  return date && !Number.isNaN(date.getTime()) ? date : null;
++++}
++++
++++function formatDayShort(date = new Date()) {
++++  return date.toLocaleDateString('es-MX', {
++++    weekday: 'short',
++++    day: 'numeric',
++++    month: 'short',
++++  });
++++}
++++
++++function formatTime(date) {
++++  return date.toLocaleTimeString('es-MX', {
++++    hour: '2-digit',
++++    minute: '2-digit',
++++  });
++++}
++++
++++function getInitials(str = '') {
++++  const clean = String(str || '').trim();
++++  const parts = clean.split(/\s+/).filter(Boolean);
++++
++++  if (parts.length >= 2) {
++++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
+++   }
+++ 
+++-  if (!nextClass.esHoy) {
+++-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
++++  return clean.slice(0, 2).toUpperCase() || 'DV';
++++}
++++
++++function formatDisplayName(str = '') {
++++  const clean = String(str || '').trim();
++++  const parts = clean.split(/\s+/).filter(Boolean);
++++
++++  if (/^ID\s+\w+/i.test(clean)) {
++++    return clean;
++++  }
++++
++++  if (parts.length >= 2) {
++++    return `${parts[0]} ${parts[1][0]}.`;
++++  }
++++
++++  return clean;
++++}
++++
++++function formatRelativeDeadline(fechaLimite) {
++++  const deadline = normDate(fechaLimite);
++++
++++  if (!deadline) {
++++    return 'Fecha pendiente';
+++   }
+++ 
+++-  if (nextClass.minutosRestantes <= 30) {
++++  const now = new Date();
++++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
++++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
++++  const diffDays = Math.round((target - today) / 86400000);
++++  const time = formatTime(deadline);
++++
++++  if (diffDays < 0) return 'Vencida';
++++  if (diffDays === 0) return `Hoy · ${time}`;
++++  if (diffDays === 1) return `Mañana · ${time}`;
++++  return `En ${diffDays} días`;
++++}
++++
++++function getClassStatus(nextClass) {
++++  if (!nextClass) return '';
++++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
++++
++++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
+++     return `En ${nextClass.minutosRestantes} min`;
+++   }
+++ 
+++-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
++++  if (nextClass.esHoy) {
++++    return start;
++++  }
++++
++++  return `${nextClass.dia || 'Próxima'} · ${start}`;
+++ }
+++ 
+++-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
++++function getSyncPresentation(syncState = {}) {
++++  if (syncState.status === 'syncing') {
++++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
++++  }
++++
++++  if (syncState.status === 'done') {
++++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++++  }
++++
++++  if (syncState.status === 'error') {
++++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
++++  }
++++
++++  if (syncState.lastSync) {
++++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++++  }
++++
++++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
++++}
++++
++++function Sidebar({
++++  activePage,
++++  activities = [],
++++  calendarCount = 0,
++++  diasConClases = [],
++++  errorHorario = '',
++++  hasFinales = false,
++++  horario = [],
++++  horarioData = null,
++++  onNavigate,
++++  onSyncAll,
++++  proximaEntrega = null,
++++  settingsData = {},
++++  studentName = '',
++++  syncState = { status: 'idle', lastSync: null },
++++}) {
+++   const [nextClass, setNextClass] = useState(null);
+++-  const visibleNavigationItems = navigationItems.filter(
+++-    (item) => item.id !== 'calificaciones' || hasFinales === true,
+++-  );
+++-  const hasHorario = Array.isArray(horario) && horario.length > 0;
++++  const materiasHorario = Array.isArray(horarioData?.materias)
++++    ? horarioData.materias
++++    : (Array.isArray(horario) ? horario : []);
++++  const pendingCount = activities.filter(
++++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++++  ).length;
++++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
++++  const hasHorario = materiasHorario.length > 0;
++++  const syncInfo = getSyncPresentation(syncState);
++++  const SyncIcon = syncInfo.Icon;
++++  const userId = settingsData?.ciaUser || settingsData?.user || '';
++++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
++++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
++++  const initials = getInitials(hasRealStudentName ? studentName : userId);
+++ 
+++   useEffect(() => {
+++-    if (!hasHorario) {
+++-      setNextClass(null);
+++-      return undefined;
+++-    }
+++-
+++     const updateNextClass = () => {
+++-      setNextClass(getNextClass(horario, diasConClases));
++++      setNextClass(getNextClass(materiasHorario, diasConClases));
+++     };
+++ 
+++     updateNextClass();
+++     const intervalId = setInterval(updateNextClass, 60 * 1000);
+++ 
+++     return () => clearInterval(intervalId);
+++-  }, [hasHorario, horario, diasConClases]);
++++  }, [materiasHorario, diasConClases]);
++++
++++  const navItems = useMemo(() => NAV_ITEMS, []);
++++
++++  const getBadge = (itemId) => {
++++    if (itemId === 'activities' && pendingCount > 0) {
++++      return (
++++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
++++          {pendingCount}
++++        </span>
++++      );
++++    }
++++
++++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
++++      return (
++++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
++++          {calendarCount}
++++        </span>
++++      );
++++    }
++++
++++    if (itemId === 'horario') {
++++      if (errorHorario) {
++++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
++++      }
++++      if (hasHorario) {
++++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
++++      }
++++    }
+++ 
+++-  const handleOpenMeetLink = () => {
+++-    if (!nextClass?.meetLink) {
+++-      return;
++++    if (itemId === 'notifications' && delayedCount > 0) {
++++      return (
++++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
++++          {delayedCount}
++++        </span>
++++      );
+++     }
+++ 
+++-    window.scraperApp?.openExternal?.(nextClass.meetLink);
++++    return null;
+++   };
+++ 
++++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
++++
+++   return (
+++     <aside
+++-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
++++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
+++       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
+++     >
+++-      <div className="mb-8">
++++      <header className="px-4 pb-3.5 pt-4">
+++         <div className="flex items-center gap-3">
+++-          <span
+++-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
+++-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
+++-          >
+++-            <img
+++-              src={dvpotroLogo}
+++-              alt="DVPotro"
+++-              className="h-full w-full object-contain"
+++-              draggable="false"
+++-            />
+++-          </span>
++++          <img
++++            src={dvpotroLogo}
++++            alt="DVPotro"
++++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
++++            draggable="false"
++++          />
+++           <div className="min-w-0">
+++-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
++++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
+++               DVPotro
+++             </p>
+++-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
++++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
+++               ITSON
+++             </p>
+++           </div>
+++         </div>
+++-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
+++-          Academic command center
+++-        </p>
+++-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
+++-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
+++-        </p>
+++-      </div>
++++      </header>
+++ 
+++-      <nav className="space-y-2">
+++-        {visibleNavigationItems.map((item) => {
+++-          const isActive = item.id === activePage;
++++      <nav className="px-2 pb-2">
++++        {navItems.map((item) => {
+++           const Icon = item.icon;
++++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
++++          const badge = getBadge(item.id);
+++ 
+++           return (
+++             <button
+++               key={item.id}
+++               type="button"
+++-              onClick={() => onNavigate(item.id)}
+++-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
+++-                isActive
+++-                  ? ''
+++-                  : ''
+++-              }`}
++++              onClick={() => onNavigate?.(item.target)}
++++              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
+++               style={
+++                 isActive
+++-                  ? { background: 'var(--accent)', color: '#fff' }
+++-                  : {
+++-                    background: 'var(--bg-secondary)',
+++-                    color: 'var(--text-muted)',
+++-                  }
++++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
++++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
+++               }
+++               onMouseEnter={(event) => {
+++                 if (!isActive) {
+++-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
++++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
+++                   event.currentTarget.style.color = 'var(--text-strong)';
+++                 }
+++               }}
+++               onMouseLeave={(event) => {
+++                 if (!isActive) {
+++-                  event.currentTarget.style.background = 'var(--bg-secondary)';
++++                  event.currentTarget.style.background = 'transparent';
+++                   event.currentTarget.style.color = 'var(--text-muted)';
+++                 }
+++               }}
+++             >
+++-              <span className="flex items-center gap-3">
+++-                <Icon className="h-4 w-4" />
+++-                {item.label}
+++-              </span>
+++-              <span
+++-                className="text-xs uppercase tracking-[0.25em]"
+++-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
+++-              >
+++-                {isActive ? 'Live' : 'Idle'}
++++              <span className="flex min-w-0 items-center gap-3">
++++                <Icon className="h-4 w-4 shrink-0" />
++++                <span className="truncate">{item.label}</span>
+++               </span>
++++              {badge}
+++             </button>
+++           );
+++         })}
+++       </nav>
+++ 
+++-      {hasHorario ? (
+++-        <div
+++-          className="mt-auto border-t pt-4"
+++-          style={{ borderColor: 'var(--border-subtle)' }}
++++      <section
++++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
++++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++++      >
++++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++++          Sincronización
++++        </p>
++++        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
++++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
++++          <span className="font-medium">{syncInfo.text}</span>
++++        </div>
++++        {syncTimestamp ? (
++++          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++++            Última sincronización · {syncTimestamp}
++++          </p>
++++        ) : null}
++++        <button
++++          type="button"
++++          onClick={onSyncAll}
++++          disabled={syncState.status === 'syncing'}
++++          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
++++          style={
++++            syncState.status === 'syncing'
++++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
++++              : { background: 'var(--itson-blue, var(--accent))' }
++++          }
+++         >
+++-          <div
+++-            className="rounded-2xl border p-3"
+++-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
+++-          >
+++-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
+++-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
+++-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
++++          {syncState.status === 'syncing' ? (
++++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
++++          ) : (
++++            <RefreshCw className="h-3.5 w-3.5" />
++++          )}
++++          Sincronizar todo
++++        </button>
++++        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
++++          Actualiza toda la información de la app
++++        </p>
++++      </section>
++++
++++      <section
++++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
++++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++++      >
++++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
++++          HOY · {formatDayShort(new Date())}
++++        </p>
++++
++++        <div className="mt-3">
++++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++++            Entrega
++++          </p>
++++          {proximaEntrega ? (
++++            <div className="mt-1 min-w-0">
++++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
++++                {proximaEntrega.nombre}
++++              </p>
++++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
++++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
++++              </p>
+++             </div>
++++          ) : (
++++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
++++          )}
++++        </div>
+++ 
+++-            {nextClass ? (
+++-              <div className="space-y-2">
+++-                <div className="flex items-start justify-between gap-2">
+++-                  <div className="min-w-0">
+++-                    <p
+++-                      className="truncate text-sm font-medium"
+++-                      style={{ color: 'var(--text-strong)' }}
+++-                      title={nextClass.materia}
+++-                    >
+++-                      {nextClass.materia}
+++-                    </p>
+++-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
+++-                      {nextClass.hora} · {nextClass.salon}
+++-                    </p>
+++-                  </div>
+++-
+++-                  {nextClass.meetLink ? (
+++-                    <button
+++-                      type="button"
+++-                      onClick={handleOpenMeetLink}
+++-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
+++-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
+++-                      title="Abrir videollamada"
+++-                    >
+++-                      <ExternalLink className="h-3.5 w-3.5" />
+++-                    </button>
+++-                  ) : null}
+++-                </div>
++++        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
+++ 
++++        <div>
++++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
++++            Clase
++++          </p>
++++          {nextClass ? (
++++            <div className="mt-1 min-w-0">
++++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
++++                {nextClass.materia}
++++              </p>
++++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++++                <span className="truncate">{nextClass.hora}</span>
+++                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
+++                   <span
+++-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
+++-                    style={{
+++-                      background: 'var(--retrasada-bg)',
+++-                      borderColor: 'var(--retrasada-border)',
+++-                      color: 'var(--retrasada-text)',
+++-                    }}
++++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
++++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
+++                   >
+++-                    {getNextClassStatus(nextClass)}
++++                    {getClassStatus(nextClass)}
+++                   </span>
+++                 ) : (
+++-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+++-                    {getNextClassStatus(nextClass)}
+++-                  </p>
++++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
+++                 )}
+++               </div>
+++-            ) : (
+++-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
+++-                Sin clases próximas
+++-              </p>
+++-            )}
+++-          </div>
++++            </div>
++++          ) : (
++++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
++++          )}
++++        </div>
++++      </section>
++++
++++      <footer
++++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
++++        style={{ borderColor: 'var(--border)' }}
++++      >
++++        <div
++++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
++++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
++++        >
++++          {initials}
++++        </div>
++++        <div className="min-w-0">
++++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
++++            {profileName}
++++          </p>
++++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
++++            {userId || 'Sin ID configurado'}
++++          </p>
+++         </div>
+++-      ) : null}
++++      </footer>
+++     </aside>
+++   );
+++ }
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
+++**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
+++**Output de verificación:**
+++```
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1767 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+++✓ built in 8.70s
+++The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+++
+++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
+++
+++Dist logo assets:
+++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+++
+++Confirmed:
+++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+++- Dist logo asset is under 20KB.
+++- handleSyncAll only adds runCIA when hasFinales is true.
+++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `src/App.jsx`
++```diff
++diff --git a/src/App.jsx b/src/App.jsx
++index 137c482..c6f5d3e 100644
++--- a/src/App.jsx
+++++ b/src/App.jsx
++@@ -1,12 +1,13 @@
++-import { useCallback, useEffect, useRef, useState } from 'react';
+++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
++ import Sidebar from './components/Sidebar';
++ import Onboarding from './components/Onboarding';
++ import TaskPanel from './components/TaskPanel';
++ import Actividades from './pages/Actividades';
++ import Horario from './pages/Horario';
+++import Calendario from './pages/Calendario';
++ import Calificaciones from './pages/Calificaciones';
++ import Ajustes from './pages/Ajustes';
++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
++ 
++ const pageRegistry = {
++   activities: {
++@@ -19,6 +20,11 @@ const pageRegistry = {
++     description: 'Visualiza clases del semestre y enlaces de videollamada para materias en línea.',
++     component: Horario,
++   },
+++  calendario: {
+++    title: 'Calendario Escolar',
+++    description: 'Consulta fechas académicas oficiales publicadas por ITSON.',
+++    component: Calendario,
+++  },
++   calificaciones: {
++     title: 'Calificaciones',
++     description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
++@@ -40,11 +46,13 @@ function App() {
++   const [settingsReady, setSettingsReady] = useState(false);
++   const [activities, setActivities] = useState([]);
++   const [horario, setHorario] = useState({ materias: [], diasConClases: [] });
+++  const [calendarData, setCalendarData] = useState({ events: [], timestamp: null, error: null });
++   const [calificaciones, setCalificaciones] = useState([]);
++   const [loading, setLoading] = useState(false);
++   const [loadingHorario, setLoadingHorario] = useState(false);
+++  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
++   const [loadingCIA, setLoadingCIA] = useState(false);
++-  const [syncingAll, setSyncingAll] = useState(false);
+++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
++   const [syncingModules, setSyncingModules] = useState([]);
++   const [error, setError] = useState('');
++   const [errorHorario, setErrorHorario] = useState('');
++@@ -57,8 +65,10 @@ function App() {
++   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
++   const [actividadesCargado, setActividadesCargado] = useState(false);
++   const [horarioCargado, setHorarioCargado] = useState(false);
+++  const [calendarCargado, setCalendarCargado] = useState(false);
++   const [ciaCargado, setCiaCargado] = useState(false);
++   const [studentName, setStudentName] = useState('');
+++  const [settingsData, setSettingsData] = useState({});
++ 
++   const initializedRef = useRef(false);
++   const nearExpiryRefreshLaunchedRef = useRef(false);
++@@ -75,6 +85,30 @@ function App() {
++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
++       ),
++   );
+++  const proximaEntrega = useMemo(() => {
+++    const pending = (activities || []).filter(
+++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++    );
+++
+++    if (!pending.length) {
+++      return null;
+++    }
+++
+++    return [...pending].sort((left, right) => {
+++      if (!left.fechaLimite) return 1;
+++      if (!right.fechaLimite) return -1;
+++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+++    })[0];
+++  }, [activities]);
+++  const calendarCount = useMemo(() => {
+++    const now = Date.now();
+++    const in30 = now + 30 * 24 * 60 * 60 * 1000;
+++
+++    return (calendarData.events || []).filter((event) => {
+++      const time = new Date(event.inicio).getTime();
+++      return Number.isFinite(time) && time >= now && time <= in30;
+++    }).length;
+++  }, [calendarData]);
++ 
++   const addSyncingModule = (moduleId) => {
++     setSyncingModules((previous) => {
++@@ -135,6 +169,9 @@ function App() {
++       horario: 'horario',
++       calificaciones: 'calificaciones',
++       ajustes: 'settings',
+++      calendario: 'calendario',
+++      notifications: 'activities',
+++      notificaciones: 'activities',
++     };
++ 
++     const nextPage = pageAliases[pageId] || pageId;
++@@ -156,17 +193,21 @@ function App() {
++ 
++     try {
++       const settings = await api.getSettings();
+++      setSettingsData(settings || {});
++       const hasUser = Boolean(settings?.user?.trim());
++       const hasPassword = Boolean(settings?.hasPassword);
++-      const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+++      const preferredIdentity =
+++        settings?.studentName?.trim() || settings?.ciaUser?.trim() || settings?.user?.trim() || '';
++       setStudentName(formatStudentDisplayName(preferredIdentity));
++       setShowOnboarding(!(hasUser || hasPassword));
++       setActividadesCargado(false);
++       setHorarioCargado(false);
+++      setCalendarCargado(false);
++       setCiaCargado(false);
++       initializedRef.current = false;
++       nearExpiryRefreshLaunchedRef.current = false;
++     } catch (_error) {
+++      setSettingsData({});
++       setStudentName('');
++       setShowOnboarding(false);
++     } finally {
++@@ -429,51 +470,175 @@ function App() {
++     }
++   };
++ 
+++  const loadCalendar = async ({ clearCacheFirst = false, silent = false } = {}) => {
+++    if (silent) {
+++      addSyncingModule('calendario');
+++    } else {
+++      setIsCalendarSyncing(true);
+++    }
+++
+++    try {
+++      if (!api?.runCalendario) {
+++        if (!silent) {
+++          setCalendarData({
+++            events: [],
+++            timestamp: null,
+++            error: 'DVPotro debe ejecutarse dentro de Electron.',
+++          });
+++        }
+++        return;
+++      }
+++
+++      if (clearCacheFirst && api.clearCalendarioCache) {
+++        await api.clearCalendarioCache();
+++      }
+++
+++      const result = await api.runCalendario();
+++
+++      if (result?.error) {
+++        setCalendarData({ events: [], timestamp: null, error: result.error });
+++        return;
+++      }
+++
+++      setCalendarData({
+++        events: Array.isArray(result?.events) ? result.events : [],
+++        timestamp: result?.timestamp || null,
+++        error: null,
+++      });
+++    } catch (error) {
+++      setCalendarData({
+++        events: [],
+++        timestamp: null,
+++        error: error?.message || 'No fue posible cargar el calendario escolar.',
+++      });
+++    } finally {
+++      if (silent) {
+++        removeSyncingModule('calendario');
+++      } else {
+++        setIsCalendarSyncing(false);
+++      }
+++    }
+++  };
+++
++   const handleSyncAll = async () => {
++-    if (!api?.syncAll) {
+++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+++
+++    if (syncState.status === 'syncing' || !scraperApi) {
++       return;
++     }
++ 
++-    setSyncingAll(true);
+++    setSyncState((current) => ({ ...current, status: 'syncing' }));
++     addSyncingModule('activities');
++     addSyncingModule('horario');
++-    addSyncingModule('calificaciones');
+++    addSyncingModule('calendario');
+++    if (hasFinales) {
+++      addSyncingModule('calificaciones');
+++    }
++ 
++     try {
++-      const result = await api.syncAll();
+++      const calls = [
+++        { id: 'activities', promise: scraperApi.runScraper?.() },
+++        { id: 'horario', promise: scraperApi.runHorario?.() },
+++        { id: 'calendario', promise: scraperApi.runCalendario?.() },
+++      ];
+++
+++      if (hasFinales) {
+++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
+++      }
+++
+++      const results = await Promise.allSettled(calls.map((call) => call.promise));
+++      let hasErrors = false;
+++
+++      results.forEach((result, index) => {
+++        const moduleId = calls[index]?.id;
++ 
++-      if (result?.actividades?.activities) {
++-        setActivities(result.actividades.activities);
++-        if (result.actividades?.timestamp) {
++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+++        if (result.status === 'rejected') {
+++          hasErrors = true;
+++          return;
++         }
++-      }
++ 
++-      if (result?.horario?.materias) {
++-        setHorario({
++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
++-          diasConClases: Array.isArray(result.horario.diasConClases)
++-            ? result.horario.diasConClases
++-            : [],
++-        });
++-        if (result.horario?.timestamp) {
++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+++        const response = result.value;
+++
+++        if (response?.error) {
+++          hasErrors = true;
+++
+++          if (moduleId === 'activities') {
+++            setErrorCode(response.error);
+++            setError(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'horario') {
+++            setErrorHorario(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'calendario') {
+++            setCalendarData({ events: [], timestamp: null, error: response.error });
+++          }
+++
+++          if (moduleId === 'calificaciones') {
+++            setErrorCIACode(response.error);
+++            setErrorCIA(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          return;
++         }
++-      }
++ 
++-      if (result?.calificaciones?.materias) {
++-        setCalificaciones(result.calificaciones.materias);
++-        if (result.calificaciones?.timestamp) {
++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+++        if (moduleId === 'activities') {
+++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+++          setActivities(activitiesList);
+++          setError('');
+++          setErrorCode('');
+++          if (response?.timestamp) {
+++            setLastSyncAt(new Date(response.timestamp).toISOString());
+++          }
++         }
++-      }
+++
+++        if (moduleId === 'horario') {
+++          setHorario({
+++            materias: Array.isArray(response?.materias) ? response.materias : [],
+++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+++          });
+++          setErrorHorario('');
+++          if (response?.timestamp) {
+++            setLastSyncHorario(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'calendario') {
+++          setCalendarData({
+++            events: Array.isArray(response?.events) ? response.events : [],
+++            timestamp: response?.timestamp || null,
+++            error: null,
+++          });
+++        }
+++
+++        if (moduleId === 'calificaciones') {
+++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+++          setCalificaciones(materiasList);
+++          setErrorCIA('');
+++          setErrorCIACode('');
+++          if (response?.timestamp) {
+++            setLastSyncCIA(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++      });
+++
+++      const nextStatus = hasErrors ? 'error' : 'done';
+++      setSyncState({ status: nextStatus, lastSync: new Date() });
+++      setTimeout(
+++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+++        hasErrors ? 4000 : 3000,
+++      );
++     } catch (_error) {
++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+++      setSyncState((current) => ({ ...current, status: 'error' }));
+++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
++     } finally {
++       removeSyncingModule('activities');
++       removeSyncingModule('horario');
++-      removeSyncingModule('calificaciones');
++-      setSyncingAll(false);
+++      removeSyncingModule('calendario');
+++      if (hasFinales) {
+++        removeSyncingModule('calificaciones');
+++      }
++     }
++   };
++ 
++@@ -520,6 +685,13 @@ function App() {
++     }
++   }, [activePage, horarioCargado]);
++ 
+++  useEffect(() => {
+++    if (activePage === 'calendario' && !calendarCargado) {
+++      setCalendarCargado(true);
+++      loadCalendar({ silent: true });
+++    }
+++  }, [activePage, calendarCargado]);
+++
++   useEffect(() => {
++     if (activePage === 'calificaciones' && !ciaCargado) {
++       setCiaCargado(true);
++@@ -556,10 +728,19 @@ function App() {
++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
++         <Sidebar
++           activePage={activePage}
+++          activities={activities}
+++          calendarCount={calendarCount}
++           diasConClases={horario?.diasConClases ?? []}
+++          errorHorario={errorHorario}
++           hasFinales={hasFinales}
++           horario={horario?.materias ?? []}
+++          horarioData={horario}
+++          onSyncAll={handleSyncAll}
++           onNavigate={handleNavigate}
+++          proximaEntrega={proximaEntrega}
+++          settingsData={settingsData}
+++          studentName={studentName}
+++          syncState={syncState}
++         />
++         {!settingsReady ? (
++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
++@@ -589,6 +770,7 @@ function App() {
++           <TaskPanel title={pageConfig.title} description={pageConfig.description}>
++             <ActivePage
++               activities={activities}
+++              calendarData={calendarData}
++               calificaciones={calificaciones}
++               horario={horario}
++               errorCIA={errorCIA}
++@@ -599,11 +781,16 @@ function App() {
++               lastSyncCIA={lastSyncCIA}
++               lastSyncAt={lastSyncAt}
++               lastSyncHorario={lastSyncHorario}
+++              isSyncing={isCalendarSyncing}
++               loadingCIA={loadingCIA}
++               loadingHorario={loadingHorario}
++               loading={loading}
++               onSettingsSaved={refreshSettings}
++-              onSync={handleSyncActivities}
+++              onSync={
+++                activePage === 'calendario'
+++                  ? () => loadCalendar({ clearCacheFirst: true })
+++                  : handleSyncActivities
+++              }
++               onSyncHorario={loadHorario}
++               onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
++               onNavigate={handleNavigate}
++@@ -617,3 +804,4 @@ function App() {
++ }
++ 
++ export default App;
+++
++```
++
++### `src/components/Onboarding.jsx`
++```diff
++diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
++index 3e820a2..7bca3ac 100644
++--- a/src/components/Onboarding.jsx
+++++ b/src/components/Onboarding.jsx
++@@ -1,5 +1,5 @@
++ import { ArrowRight } from 'lucide-react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ 
++ function Onboarding({ onNavigate }) {
++   return (
++@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
++ }
++ 
++ export default Onboarding;
+++
++```
++
++### `src/components/Sidebar.jsx`
++```diff
++diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
++index c7458cb..7030f59 100644
++--- a/src/components/Sidebar.jsx
+++++ b/src/components/Sidebar.jsx
++@@ -1,216 +1,388 @@
++-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
++-import { useEffect, useState } from 'react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import {
+++  AlertCircle,
+++  Bell,
+++  BookOpen,
+++  CalendarDays,
+++  CheckCircle,
+++  Clock,
+++  Info,
+++  Loader2,
+++  RefreshCw,
+++  Settings,
+++} from 'lucide-react';
+++import { useEffect, useMemo, useState } from 'react';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ import { getNextClass } from '../utils/horario.js';
++ 
++-const navigationItems = [
++-  { id: 'activities', label: 'Actividades', icon: ListChecks },
++-  { id: 'horario', label: 'Horario', icon: Calendar },
++-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
++-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
+++const NAV_ITEMS = [
+++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
+++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
+++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
+++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
+++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
++ ];
++ 
++-function getNextClassStatus(nextClass) {
++-  if (!nextClass) {
++-    return '';
+++function normDate(value) {
+++  const date = value ? new Date(value) : null;
+++  return date && !Number.isNaN(date.getTime()) ? date : null;
+++}
+++
+++function formatDayShort(date = new Date()) {
+++  return date.toLocaleDateString('es-MX', {
+++    weekday: 'short',
+++    day: 'numeric',
+++    month: 'short',
+++  });
+++}
+++
+++function formatTime(date) {
+++  return date.toLocaleTimeString('es-MX', {
+++    hour: '2-digit',
+++    minute: '2-digit',
+++  });
+++}
+++
+++function getInitials(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
++   }
++ 
++-  if (!nextClass.esHoy) {
++-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
+++  return clean.slice(0, 2).toUpperCase() || 'DV';
+++}
+++
+++function formatDisplayName(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (/^ID\s+\w+/i.test(clean)) {
+++    return clean;
+++  }
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0]} ${parts[1][0]}.`;
+++  }
+++
+++  return clean;
+++}
+++
+++function formatRelativeDeadline(fechaLimite) {
+++  const deadline = normDate(fechaLimite);
+++
+++  if (!deadline) {
+++    return 'Fecha pendiente';
++   }
++ 
++-  if (nextClass.minutosRestantes <= 30) {
+++  const now = new Date();
+++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
+++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
+++  const diffDays = Math.round((target - today) / 86400000);
+++  const time = formatTime(deadline);
+++
+++  if (diffDays < 0) return 'Vencida';
+++  if (diffDays === 0) return `Hoy · ${time}`;
+++  if (diffDays === 1) return `Mañana · ${time}`;
+++  return `En ${diffDays} días`;
+++}
+++
+++function getClassStatus(nextClass) {
+++  if (!nextClass) return '';
+++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
+++
+++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
++     return `En ${nextClass.minutosRestantes} min`;
++   }
++ 
++-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
+++  if (nextClass.esHoy) {
+++    return start;
+++  }
+++
+++  return `${nextClass.dia || 'Próxima'} · ${start}`;
+++}
+++
+++function getSyncPresentation(syncState = {}) {
+++  if (syncState.status === 'syncing') {
+++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
+++  }
+++
+++  if (syncState.status === 'done') {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  if (syncState.status === 'error') {
+++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
+++  }
+++
+++  if (syncState.lastSync) {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
++ }
++ 
++-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
+++function Sidebar({
+++  activePage,
+++  activities = [],
+++  calendarCount = 0,
+++  diasConClases = [],
+++  errorHorario = '',
+++  hasFinales = false,
+++  horario = [],
+++  horarioData = null,
+++  onNavigate,
+++  onSyncAll,
+++  proximaEntrega = null,
+++  settingsData = {},
+++  studentName = '',
+++  syncState = { status: 'idle', lastSync: null },
+++}) {
++   const [nextClass, setNextClass] = useState(null);
++-  const visibleNavigationItems = navigationItems.filter(
++-    (item) => item.id !== 'calificaciones' || hasFinales === true,
++-  );
++-  const hasHorario = Array.isArray(horario) && horario.length > 0;
+++  const materiasHorario = Array.isArray(horarioData?.materias)
+++    ? horarioData.materias
+++    : (Array.isArray(horario) ? horario : []);
+++  const pendingCount = activities.filter(
+++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++  ).length;
+++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
+++  const hasHorario = materiasHorario.length > 0;
+++  const syncInfo = getSyncPresentation(syncState);
+++  const SyncIcon = syncInfo.Icon;
+++  const userId = settingsData?.ciaUser || settingsData?.user || '';
+++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
+++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
+++  const initials = getInitials(hasRealStudentName ? studentName : userId);
++ 
++   useEffect(() => {
++-    if (!hasHorario) {
++-      setNextClass(null);
++-      return undefined;
++-    }
++-
++     const updateNextClass = () => {
++-      setNextClass(getNextClass(horario, diasConClases));
+++      setNextClass(getNextClass(materiasHorario, diasConClases));
++     };
++ 
++     updateNextClass();
++     const intervalId = setInterval(updateNextClass, 60 * 1000);
++ 
++     return () => clearInterval(intervalId);
++-  }, [hasHorario, horario, diasConClases]);
+++  }, [materiasHorario, diasConClases]);
++ 
++-  const handleOpenMeetLink = () => {
++-    if (!nextClass?.meetLink) {
++-      return;
+++  const navItems = useMemo(() => NAV_ITEMS, []);
+++
+++  const getBadge = (itemId) => {
+++    if (itemId === 'activities' && pendingCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
+++          {pendingCount}
+++        </span>
+++      );
++     }
++ 
++-    window.scraperApp?.openExternal?.(nextClass.meetLink);
+++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
+++          {calendarCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'horario') {
+++      if (errorHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
+++      }
+++      if (hasHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
+++      }
+++    }
+++
+++    if (itemId === 'notifications' && delayedCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
+++          {delayedCount}
+++        </span>
+++      );
+++    }
+++
+++    return null;
++   };
++ 
+++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
+++
++   return (
++     <aside
++-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-slate-950/40"
++       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
++     >
++-      <div className="mb-8">
+++      <header className="px-4 pb-3 pt-3">
++         <div className="flex items-center gap-3">
++-          <span
++-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
++-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
++-          >
++-            <img
++-              src={dvpotroLogo}
++-              alt="DVPotro"

... [DIFF TRUNCADO — archivo muy grande, ver git diff completo] ...
```

### `reports/report_068.md`
```diff
diff --git a/reports/report_068.md b/reports/report_068.md
new file mode 100644
index 0000000..0c80f8a
--- /dev/null
+++ b/reports/report_068.md
@@ -0,0 +1,10878 @@
+# Report 068
+**Fecha:** 2026-06-01 21:13  
+**Agente:** Codex  
+**Tipo:** feature
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
+**Archivos modificados:** 14
+
+## Archivos modificados
+- `electron/handlers/calendario.js` — archivo creado como parte de la base inicial
+- `electron/handlers/horario.js` — archivo actualizado en esta tarea
+- `electron/handlers/settings.js` — archivo actualizado en esta tarea
+- `electron/main.js` — archivo actualizado en esta tarea
+- `electron/preload.js` — archivo actualizado en esta tarea
+- `generate-report.js` — archivo actualizado en esta tarea
+- `reports/report_065.md` — archivo creado como parte de la base inicial
+- `reports/report_066.md` — archivo creado como parte de la base inicial
+- `reports/report_067.md` — archivo creado como parte de la base inicial
+- `reports/report_068_calendario.png` — archivo creado como parte de la base inicial
+- `src/App.jsx` — archivo actualizado en esta tarea
+- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
+- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo creado como parte de la base inicial
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| electron/handlers/calendario.js | 725 | 0 |
+| electron/handlers/horario.js | 57 | 0 |
+| electron/handlers/settings.js | 26 | 0 |
+| electron/main.js | 11 | 1 |
+| electron/preload.js | 3 | 0 |
+| generate-report.js | 42 | 26 |
+| reports/report_065.md | 929 | 0 |
+| reports/report_066.md | 3027 | 0 |
+| reports/report_067.md | 6342 | 0 |
+| reports/report_068_calendario.png | 0 | 0 |
+| src/App.jsx | 245 | 32 |
+| src/components/Onboarding.jsx | 2 | 1 |
+| src/components/Sidebar.jsx | 306 | 134 |
+| src/pages/Calendario.jsx | 617 | 0 |
+
+## Resumen
+Se registraron 14 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `electron/handlers/calendario.js`
+```diff
+diff --git a/electron/handlers/calendario.js b/electron/handlers/calendario.js
+new file mode 100644
+index 0000000..41bcec7
+--- /dev/null
++++ b/electron/handlers/calendario.js
+@@ -0,0 +1,725 @@
++const fs = require('fs');
++const path = require('path');
++const electron = require('electron');
++const { chromium } = require('playwright');
++
++const app = electron?.app;
++
++const CALENDAR_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
++const DEFAULT_TYPE = 'Profesional Asociado y Licenciatura';
++const CURRENT_YEAR = new Date().getFullYear();
++const MONTHS = [
++  'Enero',
++  'Febrero',
++  'Marzo',
++  'Abril',
++  'Mayo',
++  'Junio',
++  'Julio',
++  'Agosto',
++  'Septiembre',
++  'Octubre',
++  'Noviembre',
++  'Diciembre',
++];
++const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
++const PAGE_TIMEOUT_MS = 20_000;
++const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
++
++const SPANISH_MONTHS = {
++  enero: 0,
++  febrero: 1,
++  marzo: 2,
++  abril: 3,
++  mayo: 4,
++  junio: 5,
++  julio: 6,
++  agosto: 7,
++  septiembre: 8,
++  setiembre: 8,
++  octubre: 9,
++  noviembre: 10,
++  diciembre: 11,
++};
++
++function getUserDataPath() {
++  if (app && typeof app.getPath === 'function') {
++    return app.getPath('userData');
++  }
++
++  const fallbackPath = path.join(process.cwd(), '.local-data');
++  fs.mkdirSync(fallbackPath, { recursive: true });
++  return fallbackPath;
++}
++
++function getTempPath() {
++  if (app && typeof app.getPath === 'function') {
++    return app.getPath('temp');
++  }
++
++  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
++  fs.mkdirSync(fallbackPath, { recursive: true });
++  return fallbackPath;
++}
++
++function getCalendarioCachePath() {
++  return path.join(getUserDataPath(), 'calendario-cache.json');
++}
++
++function discardFile(filePath) {
++  if (fs.existsSync(filePath)) {
++    fs.unlinkSync(filePath);
++  }
++}
++
++function normalizeCalendarType(calendarType) {
++  return String(calendarType || DEFAULT_TYPE).trim() || DEFAULT_TYPE;
++}
++
++function readCalendarioCache(calendarType = DEFAULT_TYPE) {
++  const cachePath = getCalendarioCachePath();
++  const requestedType = normalizeCalendarType(calendarType);
++
++  if (!fs.existsSync(cachePath)) {
++    return null;
++  }
++
++  try {
++    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
++
++    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
++      discardFile(cachePath);
++      return null;
++    }
++
++    if (normalizeCalendarType(parsed.calendarType) !== requestedType) {
++      return null;
++    }
++
++    return {
++      events: parsed.events,
++      calendarTypes: Array.isArray(parsed.calendarTypes) ? parsed.calendarTypes : [],
++      calendarType: requestedType,
++      timestamp: parsed.timestamp,
++    };
++  } catch (_error) {
++    discardFile(cachePath);
++    return null;
++  }
++}
++
++function writeCalendarioCache(payload, calendarType = DEFAULT_TYPE) {
++  const requestedType = normalizeCalendarType(calendarType);
++  const nextPayload = {
++    events: Array.isArray(payload?.events) ? payload.events : [],
++    calendarTypes: Array.isArray(payload?.calendarTypes) ? payload.calendarTypes : [],
++    calendarType: requestedType,
++    timestamp: Date.now(),
++  };
++
++  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
++  return nextPayload;
++}
++
++function clearCache() {
++  discardFile(getCalendarioCachePath());
++  return { success: true };
++}
++
++function isTimeoutError(error) {
++  return Boolean(
++    error &&
++      (error.name === 'TimeoutError' ||
++        /timeout/i.test(error.message || '') ||
++        /timed out/i.test(error.message || '')),
++  );
++}
++
++function isNetworkError(error) {
++  const message = error?.message || '';
++  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
++    message,
++  );
++}
++
++async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
++  let lastError;
++
++  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
++    try {
++      return await page.goto(url, {
++        waitUntil: 'domcontentloaded',
++        timeout: PAGE_TIMEOUT_MS,
++        ...options,
++      });
++    } catch (error) {
++      lastError = error;
++
++      if (isNetworkError(error)) {
++        throw new Error('NO_INTERNET');
++      }
++
++      if (!isTimeoutError(error) || attempt === maxRetries) {
++        throw error;
++      }
++
++      await page.waitForTimeout(1500);
++    }
++  }
++
++  throw lastError;
++}
++
++async function applyResourceBlocking(page) {
++  await page.route('**/*', (route) => {
++    const resourceType = route.request().resourceType();
++
++    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
++      route.abort();
++      return;
++    }
++
++    route.continue();
++  });
++}
++
++function unfoldICS(content) {
++  return String(content || '').replace(/\r?\n[ \t]/g, '');
++}
++
++function unescapeICSText(value) {
++  return String(value || '')
++    .replace(/\\n/g, '\n')
++    .replace(/\\,/g, ',')
++    .replace(/\\;/g, ';')
++    .replace(/\\\\/g, '\\')
++    .trim();
++}
++
++function parseICSDate(str) {
++  if (!str) return null;
++  const clean = str.includes(':') ? str.split(':').pop() : str;
++  const d = clean.replace(/[TZ]/g, '');
++  if (d.length < 8) return null;
++
++  try {
++    return new Date(
++      Number(d.slice(0, 4)),
++      Number(d.slice(4, 6)) - 1,
++      Number(d.slice(6, 8)),
++      d.length >= 12 ? Number(d.slice(8, 10)) : 0,
++      d.length >= 14 ? Number(d.slice(10, 12)) : 0,
++    ).toISOString();
++  } catch (_error) {
++    return null;
++  }
++}
++
++function parseDDMMYYYY(str) {
++  const match = String(str || '').trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
++  if (!match) return null;
++
++  const day = Number(match[1]);
++  const month = Number(match[2]);
++  const year = Number(match[3]);
++
++  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
++    return null;
++  }
++
++  const date = new Date(year, month - 1, day);
++  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
++    return null;
++  }
++
++  return date.toISOString();
++}
++
++function parseModalDate(str) {
++  if (!str) return null;
++  const match = String(str).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
++  if (!match) return null;
++
++  return new Date(
++    Number(match[3]),
++    Number(match[1]) - 1,
++    Number(match[2]),
++    Number(match[4]),
++    Number(match[5]),
++  ).toISOString();
++}
++
++function parseICS(content) {
++  const events = [];
++  const blocks = unfoldICS(content).split('BEGIN:VEVENT');
++
++  for (const block of blocks.slice(1)) {
++    const get = (field) => {
++      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
++      return match ? unescapeICSText(match[1]) : '';
++    };
++    const inicio = parseICSDate(get('DTSTART'));
++
++    if (!inicio) {
++      continue;
++    }
++
++    events.push({
++      titulo: get('SUMMARY') || 'Evento',
++      inicio,
++      fin: parseICSDate(get('DTEND')),
++      descripcion: get('DESCRIPTION'),
++      ubicacion: get('LOCATION'),
++      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
++    });
++  }
++
++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++}
++
++function parseDateText(text) {
++  const normalized = String(text || '').trim();
++
++  if (!normalized) {
++    return null;
++  }
++
++  const nativeDate = new Date(normalized);
++  if (!Number.isNaN(nativeDate.getTime())) {
++    return nativeDate.toISOString();
++  }
++
++  const spanishMatch = normalized
++    .toLowerCase()
++    .normalize('NFD')
++    .replace(/[\u0300-\u036f]/g, '')
++    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
++
++  if (spanishMatch) {
++    const day = Number(spanishMatch[1]);
++    const month = SPANISH_MONTHS[spanishMatch[2]];
++    const year = Number(spanishMatch[3]);
++
++    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
++      return new Date(year, month, day).toISOString();
++    }
++  }
++
++  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
++  if (numericMatch) {
++    const day = Number(numericMatch[1]);
++    const month = Number(numericMatch[2]) - 1;
++    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
++    return new Date(year, month, day).toISOString();
++  }
++
++  return null;
++}
++
++function normalizeEvent(event) {
++  return {
++    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
++    inicio: event?.inicio || null,
++    fin: event?.fin || null,
++    descripcion: String(event?.descripcion || '').trim(),
++    ubicacion: String(event?.ubicacion || '').trim(),
++    categoria: String(event?.categoria || 'General').trim() || 'General',
++  };
++}
++
++function normalizeText(value) {
++  return String(value || '')
++    .normalize('NFD')
++    .replace(/[\u0300-\u036f]/g, '')
++    .replace(/\s+/g, ' ')
++    .trim()
++    .toLowerCase();
++}
++
++async function getCalendarTypes(page) {
++  const types = await page.evaluate((defaultType) => {
++    const monthWords = [
++      'enero',
++      'febrero',
++      'marzo',
++      'abril',
++      'mayo',
++      'junio',
++      'julio',
++      'agosto',
++      'septiembre',
++      'octubre',
++      'noviembre',
++      'diciembre',
++    ];
++    const normalize = (value) =>
++      String(value || '')
++        .normalize('NFD')
++        .replace(/[\u0300-\u036f]/g, '')
++        .replace(/\s+/g, ' ')
++        .trim()
++        .toLowerCase();
++    const selects = Array.from(document.querySelectorAll('select'));
++    const selectData = selects.map((select) => {
++      const options = Array.from(select.options || [])
++        .map((option) => ({ text: option.textContent?.trim() || '', value: option.value || '' }))
++        .filter((option) => option.text || option.value);
++      const text = normalize(options.map((option) => option.text || option.value).join(' '));
++      const hasMonth = monthWords.some((month) => text.includes(month));
++      const hasYear = options.some((option) => /^20\d{2}$/.test((option.text || option.value).trim()));
++      const hasDefaultType = text.includes(normalize(defaultType));
++      return { options, hasMonth, hasYear, hasDefaultType };
++    });
++
++    const match =
++      selectData.find((entry) => entry.hasDefaultType) ||
++      selectData.find((entry) => !entry.hasMonth && !entry.hasYear && entry.options.length > 1);
++
++    return match ? match.options.map((option) => option.text || option.value).filter(Boolean) : [];
++  }, DEFAULT_TYPE);
++
++  const unique = [...new Set(types.map((type) => String(type).trim()).filter(Boolean))];
++  return unique.length > 0 ? unique : [DEFAULT_TYPE];
++}
++
++async function selectCalendarType(page, calendarType = DEFAULT_TYPE) {
++  const requestedType = normalizeCalendarType(calendarType);
++  const selected = await page.evaluate(
++    ({ requestedType: requested, defaultType }) => {
++      const monthWords = [
++        'enero',
++        'febrero',
++        'marzo',
++        'abril',
++        'mayo',
++        'junio',
++        'julio',
++        'agosto',
++        'septiembre',
++        'octubre',
++        'noviembre',
++        'diciembre',
++      ];
++      const normalize = (value) =>
++        String(value || '')
++          .normalize('NFD')
++          .replace(/[\u0300-\u036f]/g, '')
++          .replace(/\s+/g, ' ')
++          .trim()
++          .toLowerCase();
++      const wanted = normalize(requested);
++      const fallback = normalize(defaultType);
++      const selects = Array.from(document.querySelectorAll('select'));
++      const candidates = selects
++        .map((select) => {
++          const options = Array.from(select.options || []);
++          const optionText = normalize(options.map((option) => option.textContent || option.value).join(' '));
++          const hasMonth = monthWords.some((month) => optionText.includes(month));
++          const hasYear = options.some((option) => /^20\d{2}$/.test((option.textContent || option.value || '').trim()));
++          return { select, options, optionText, hasMonth, hasYear };
++        })
++        .filter(({ optionText, hasMonth, hasYear }) => !hasMonth && !hasYear && (optionText.includes(wanted) || optionText.includes(fallback)));
++
++      const candidate = candidates[0];
++      if (!candidate) return false;
++
++      const options = candidate.options;
++      const option =
++        options.find((item) => normalize(item.textContent) === wanted || normalize(item.value) === wanted) ||
++        options.find((item) => normalize(item.textContent).includes(wanted) || normalize(item.value).includes(wanted)) ||
++        options.find((item) => normalize(item.textContent).includes(fallback) || normalize(item.value).includes(fallback));
++
++      if (!option) return false;
++
++      candidate.select.value = option.value;
++      candidate.select.dispatchEvent(new Event('input', { bubbles: true }));
++      candidate.select.dispatchEvent(new Event('change', { bubbles: true }));
++      return true;
++    },
++    { requestedType, defaultType: DEFAULT_TYPE },
++  );
++
++  if (selected) {
++    await page.waitForTimeout(800);
++  }
++
++  return selected;
++}
++
++async function selectYear(page, year = CURRENT_YEAR) {
++  const selected = await page.evaluate((targetYear) => {
++    const selects = Array.from(document.querySelectorAll('select'));
++    const candidates = selects.filter((select) =>
++      Array.from(select.options || []).some((option) => (option.textContent || option.value || '').trim() === String(targetYear)),
++    );
++    const select = candidates[0];
++    if (!select) return false;
++
++    const option = Array.from(select.options || []).find(
++      (item) => (item.textContent || item.value || '').trim() === String(targetYear),
++    );
++    if (!option) return false;
++
++    select.value = option.value;
++    select.dispatchEvent(new Event('input', { bubbles: true }));
++    select.dispatchEvent(new Event('change', { bubbles: true }));
++    return true;
++  }, year);
++
++  if (selected) {
++    await page.waitForTimeout(800);
++  }
++
++  return selected;
++}
++
++async function selectMonth(page, monthName, monthIndex) {
++  const selected = await page.evaluate(
++    ({ monthName: targetMonth, monthIndex: targetIndex }) => {
++      const normalize = (value) =>
++        String(value || '')
++          .normalize('NFD')
++          .replace(/[\u0300-\u036f]/g, '')
++          .replace(/\s+/g, ' ')
++          .trim()
++          .toLowerCase();
++      const wanted = normalize(targetMonth);
++      const selects = Array.from(document.querySelectorAll('select'));
++      const candidates = selects
++        .map((select) => ({ select, options: Array.from(select.options || []) }))
++        .filter(({ options }) => options.some((option) => normalize(option.textContent || option.value).includes(wanted)));
++      const candidate = candidates[0];
++      if (!candidate) return false;
++
++      const option =
++        candidate.options.find((item) => normalize(item.textContent || item.value).includes(wanted)) ||
++        candidate.options.find((item) => [String(targetIndex), String(targetIndex + 1)].includes(String(item.value || '').trim()));
++
++      if (!option) return false;
++
++      candidate.select.value = option.value;
++      candidate.select.dispatchEvent(new Event('input', { bubbles: true }));
++      candidate.select.dispatchEvent(new Event('change', { bubbles: true }));
++      return true;
++    },
++    { monthName, monthIndex },
++  );
++
++  if (selected) {
++    await page.waitForTimeout(900);
++  }
++
++  return selected;
++}
++
++async function extractVisibleListEvents(page) {
++  const rawEvents = await page.evaluate(() => {
++    const datePattern = /\d{2}-\d{2}-\d{4}/g;
++    const visibleText = (element) => String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
++    const isVisible = (element) => {
++      const rect = element.getBoundingClientRect();
++      const styles = window.getComputedStyle(element);
++      return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';
++    };
++    const isLeafish = (element, text) => {
++      const children = Array.from(element.children || []);
++      return !children.some((child) => {
++        const childText = visibleText(child);
++        return childText.match(datePattern) && childText.length < text.length;
++      });
++    };
++    const inferCategory = (text, title) => {
++      const explicit = text.match(/Categor[ií]a\s*:?\s*([^\n|]+)/i)?.[1]?.trim();
++      if (explicit) return explicit;
++      if (/inscrip|reinscrip/i.test(title)) return 'Inscripción';
++      if (/vacaci|asueto|descanso/i.test(title)) return 'Vacaciones';
++      if (/examen|evaluaci/i.test(title)) return 'Examen';
++      return 'General';
++    };
++
++    return Array.from(document.querySelectorAll('body *'))
++      .map((element) => ({ element, text: visibleText(element) }))
++      .filter(({ element, text }) => {
++        if (!text || text.length < 10 || text.length > 600) return false;
++        if (!datePattern.test(text)) return false;
++        datePattern.lastIndex = 0;
++        return isVisible(element) && isLeafish(element, text);
++      })
++      .map(({ text }) => {
++        const fechas = text.match(datePattern) || [];
++        const title = text
++          .replace(datePattern, ' ')
++          .replace(/\s+-\s+/g, ' ')
++          .replace(/\bFecha\b|\bInicio\b|\bFin\b|\bDel\b|\bal\b/gi, ' ')
++          .replace(/\s+/g, ' ')
++          .trim();
++
++        if (!title || title.length < 4) {
++          return null;
++        }
++
++        return {
++          titulo: title,
++          fechaInicio: fechas[0] || null,
++          fechaFin: fechas[1] || null,
++          descripcion: text,
++          ubicacion: '',
++          categoria: inferCategory(text, title),
++        };
++      })
++      .filter(Boolean);
++  });
++
++  const seen = new Set();
++  const events = [];
++
++  for (const rawEvent of rawEvents) {
++    const inicio = parseDDMMYYYY(rawEvent.fechaInicio);
++    if (!inicio) continue;
++
++    const normalized = normalizeEvent({
++      titulo: rawEvent.titulo,
++      inicio,
++      fin: parseDDMMYYYY(rawEvent.fechaFin),
++      descripcion: rawEvent.descripcion,
++      ubicacion: rawEvent.ubicacion,
++      categoria: rawEvent.categoria,
++    });
++    const key = `${normalizeText(normalized.titulo)}-${normalized.inicio}`;
++
++    if (seen.has(key)) continue;
++    seen.add(key);
++    events.push(normalized);
++  }
++
++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++}
++
++async function tryDownloadICS(page) {
++  const downloadButton = await page
++    .$(
++      'a[href*=".ics"], a[href*="download"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario"), button:has-text("Descargar"), a:has-text("Descargar")',
++    )
++    .catch(() => null);
++
++  if (!downloadButton) {
++    return null;
++  }
++
++  try {
++    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
++    await downloadButton.click();
++    const download = await downloadPromise;
++    if (!download) return null;
++
++    const tmpPath = path.join(getTempPath(), `itson-cal-download-${Date.now()}.tmp`);
++    await download.saveAs(tmpPath);
++    const content = fs.readFileSync(tmpPath, 'utf8');
++    discardFile(tmpPath);
++
++    if (!content.includes('BEGIN:VCALENDAR')) {
++      return null;
++    }
++
++    const events = parseICS(content);
++    return events.length > 0 ? events.map(normalizeEvent) : null;
++  } catch (_error) {
++    return null;
++  }
++}
++
++async function scrapeCalendario(calendarType = DEFAULT_TYPE) {
++  const requestedType = normalizeCalendarType(calendarType);
++  const browser = await chromium.launch({ headless: true });
++
++  try {
++    const context = await browser.newContext({ acceptDownloads: true });
++    const page = await context.newPage();
++    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
++    await applyResourceBlocking(page);
++    await gotoWithRetry(page, CALENDAR_URL, { waitUntil: 'domcontentloaded' });
++    await page.waitForTimeout(1200);
++
++    const calendarTypes = await getCalendarTypes(page);
++    await selectCalendarType(page, requestedType);
++    await selectYear(page, CURRENT_YEAR);
++
++    const eventsByKey = new Map();
++
++    for (let index = 0; index < MONTHS.length; index += 1) {
++      await selectMonth(page, MONTHS[index], index);
++      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
++      await page.waitForTimeout(350);
++      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
++      await page.waitForTimeout(500);
++
++      const monthEvents = await extractVisibleListEvents(page);
++      for (const event of monthEvents) {
++        const key = `${normalizeText(event.titulo)}-${event.inicio}`;
++        if (!eventsByKey.has(key)) {
++          eventsByKey.set(key, event);
++        }
++      }
++    }
++
++    const events = Array.from(eventsByKey.values()).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
++    if (events.length > 0) {
++      return { events, calendarTypes, calendarType: requestedType, timestamp: Date.now(), fromCache: false };
++    }
++
++    const icsEvents = await tryDownloadICS(page);
++    return {
++      events: Array.isArray(icsEvents) ? icsEvents : [],
++      calendarTypes,
++      calendarType: requestedType,
++      timestamp: Date.now(),
++      fromCache: false,
++    };
++  } finally {
++    await browser.close();
++  }
++}
++
++async function run(options = {}) {
++  const calendarType = normalizeCalendarType(
++    typeof options === 'string' ? options : options?.calendarType || DEFAULT_TYPE,
++  );
++  const cached = readCalendarioCache(calendarType);
++
++  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
++    return {
++      ...cached,
++      fromCache: true,
++    };
++  }
++
++  try {
++    const result = await scrapeCalendario(calendarType);
++    const cachedPayload = writeCalendarioCache(result, calendarType);
++    return {
++      ...cachedPayload,
++      fromCache: false,
++    };
++  } catch (error) {
++    if (error?.message === 'NO_INTERNET') {
++      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
++    }
++
++    return {
++      error: error?.message
++        ? `Falló la extracción del calendario escolar: ${error.message}`
++        : 'Falló la extracción del calendario escolar por un error no identificado.',
++    };
++  }
++}
++
++module.exports = {
++  clearCache,
++  getCalendarioCachePath,
++  parseDateText,
++  parseDDMMYYYY,
++  parseICS,
++  parseICSDate,
++  parseModalDate,
++  run,
++};
+```
+
+### `electron/handlers/horario.js`
+```diff
+diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
+index 45995c1..d957056 100644
+--- a/electron/handlers/horario.js
++++ b/electron/handlers/horario.js
+@@ -913,6 +913,61 @@ async function loginToCIA(page, user, password) {
+   return null;
+ }
+ 
++async function tryExtractStudentName(page) {
++  const selectors = [
++    '#ctl00_cLabel_nombre',
++    '.user-name',
++    '#user-name',
++    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
++    '.navbar-text',
++    'span[id*="Name"]',
++  ];
++
++  for (const selector of selectors) {
++    try {
++      const element = await page.$(selector);
++
++      if (!element) {
++        continue;
++      }
++
++      const text = normalizeWhitespace(await element.textContent());
++      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
++        return text;
++      }
++    } catch (_error) {
++      // Continue with the next selector.
++    }
++  }
++
++  try {
++    const bodyText = await page.evaluate(() => document.body?.innerText || '');
++    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
++    if (match) {
++      return normalizeWhitespace(match[1]);
++    }
++  } catch (_error) {
++    // Silent fallback.
++  }
++
++  return null;
++}
++
++async function persistStudentNameFromCIA(page) {
++  const nombre = await tryExtractStudentName(page);
++
++  if (!nombre) {
++    return;
++  }
++
++  try {
++    const { saveStudentName } = require('./settings');
++    await saveStudentName(nombre);
++  } catch (_error) {
++    // Student name persistence must never block horario scraping.
++  }
++}
++
+ async function getTargetContentFrame(page, timeout = 25_000) {
+   return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
+ }
+@@ -2413,6 +2468,7 @@ async function scrapeHorario(controller = {}) {
+       return loginResult;
+     }
+ 
++    await persistStudentNameFromCIA(page);
+     await applyResourceBlocking(page);
+     let scheduleFrame;
+     try {
+@@ -2427,6 +2483,7 @@ async function scrapeHorario(controller = {}) {
+         if (retryLogin?.error) {
+           return retryLogin;
+         }
++        await persistStudentNameFromCIA(page);
+         scheduleFrame = await openHorarioPage(page);
+       } else {
+         throw error;
+```
+
+### `electron/handlers/settings.js`
+```diff
+diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
+index 0b6f430..cdefc37 100644
+--- a/electron/handlers/settings.js
++++ b/electron/handlers/settings.js
+@@ -26,6 +26,7 @@ function getSettings() {
+     ciaUser: process.env.CIA_USER || '',
+     hasCIAPassword: Boolean(process.env.CIA_PASS),
+     notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
++    studentName: process.env.STUDENT_NAME || '',
+   };
+ }
+ 
+@@ -96,6 +97,30 @@ function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore
+   }
+ }
+ 
++async function saveStudentName(name) {
++  try {
++    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
++
++    if (!normalizedName) {
++      return { success: false, error: 'Nombre de estudiante vacío.' };
++    }
++
++    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
++    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);
++
++    const envPath = getEnvFilePath();
++    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
++    process.env.STUDENT_NAME = normalizedName;
++
++    return { success: true };
++  } catch (error) {
++    return {
++      success: false,
++      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
++    };
++  }
++}
++
+ function registerSettingsHandlers() {
+   ipcMain.handle('settings:get', async () => getSettings());
+   ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
+@@ -105,5 +130,6 @@ module.exports = {
+   getEnvFilePath,
+   getSettings,
+   registerSettingsHandlers,
++  saveStudentName,
+   saveSettings,
+ };
+```
+
+### `electron/main.js`
+```diff
+diff --git a/electron/main.js b/electron/main.js
+index af41ff2..abd22c3 100644
+--- a/electron/main.js
++++ b/electron/main.js
+@@ -8,6 +8,7 @@ const { registerFileHandlers } = require('./handlers/files');
+ const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
+ const { registerSettingsHandlers } = require('./handlers/settings');
+ const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
++const calendarioHandler = require('./handlers/calendario');
+ 
+ const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
+ const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
+@@ -57,6 +58,8 @@ app.whenReady().then(() => {
+   registerFileHandlers();
+   registerSettingsHandlers();
+   registerNotificationHandlers();
++  ipcMain.handle('calendario:run', (_event, options) => calendarioHandler.run(options || {}));
++  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
+   ipcMain.removeHandler('shell:open-external');
+   ipcMain.handle('shell:open-external', async (_event, url) => {
+     if (url && typeof url === 'string' && url.startsWith('http')) {
+@@ -72,11 +75,13 @@ app.whenReady().then(() => {
+     clearActivitiesCache();
+     clearHorarioCache();
+     clearCIACache();
++    calendarioHandler.clearCache();
+ 
+-    const [actividades, horario, calificaciones] = await Promise.allSettled([
++    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
+       getActivitiesWithCache(),
+       getHorarioWithCache(),
+       getCalificacionesWithCache(),
++      calendarioHandler.run({}),
+     ]);
+ 
+     return {
+@@ -90,6 +95,10 @@ app.whenReady().then(() => {
+         calificaciones.status === 'fulfilled'
+           ? calificaciones.value
+           : { error: calificaciones.reason?.message },
++      calendario:
++        calendario.status === 'fulfilled'
++          ? calendario.value
++          : { error: calendario.reason?.message },
+     };
+   });
+   createMainWindow();
+@@ -110,3 +119,4 @@ app.on('window-all-closed', () => {
+     app.quit();
+   }
+ });
++
+```
+
+### `electron/preload.js`
+```diff
+diff --git a/electron/preload.js b/electron/preload.js
+index 05a306d..8fb8b9c 100644
+--- a/electron/preload.js
++++ b/electron/preload.js
+@@ -5,8 +5,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
+   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+   runCIA: () => ipcRenderer.invoke('cia:run'),
+   runHorario: () => ipcRenderer.invoke('horario:run'),
++  runCalendario: (options) => ipcRenderer.invoke('calendario:run', options || {}),
+   clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
+   clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
++  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
+   saveHorarioLink: (numeroClase, link) =>
+     ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
+   getSettings: () => ipcRenderer.invoke('settings:get'),
+@@ -23,3 +25,4 @@ contextBridge.exposeInMainWorld('scraperApp', {
+   openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
+   syncAll: () => ipcRenderer.invoke('sync:all'),
+ });
++
+```
+
+### `generate-report.js`
+```diff
+diff --git a/generate-report.js b/generate-report.js
+index fa9b68e..f333450 100644
+--- a/generate-report.js
++++ b/generate-report.js
+@@ -19,35 +19,51 @@ const MAX_DIFF_BYTES = 150 * 1024;
+ 
+ const VERIFICATION = {
+   buildStatus: 'PASS',
+-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
+-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+-  verificationOutput: `> dvpotro@0.1.0 build
++  testsRun: 'npm run build + parseDDMMYYYY check + run options check + App initial calendarTypes check + real Calendario scraper run + Playwright screenshot',
++  verificationCmd: 'npm run build; node parseDDMMYYYY/run/App checks; node calendario real scrape; Playwright screenshot against Vite preview',
++  verificationOutput: `RED checks before implementation:
++parseDDMMYYYY: undefined
++calendarTypes initial: false
++
++$ npm run build
++> dvpotro@0.1.0 build
+ > vite build
+ 
+ vite v5.4.21 building for production...
+-✓ 1767 modules transformed.
+-dist/index.html                        0.47 kB │ gzip:  0.30 kB
+-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
+-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
+-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
+-✓ built in 4.93s
+-The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+-
+-> dvpotro@0.1.0 dist:dir
+-> vite build && electron-builder --dir
+-
+-✓ 1767 modules transformed.
+-✓ built in 4.83s
+-• electron-builder version=26.8.1
+-• loaded configuration file=package.json (build field)
+-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
+-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
+-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
+-
+-branding verification OK
+-active branding reference scan OK: no old visible references
+-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
+-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
++transforming...
++✓ 1768 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-Dg61XQfi.css             31.74 kB │ gzip:  6.73 kB
++dist/assets/index-KPfR-PaN.js              321.54 kB │ gzip: 87.66 kB
++✓ built in 7.92s
++
++$ node parseDDMMYYYY/run/App checks
++Julio 8: OK julio
++Julio 11: OK julio
++Invalid: OK null
++run accepts options: true
++calendarTypes initial: true
++
++$ node calendario real scrape
++error: none
++fromCache: false
++calendarType: Profesional Asociado y Licenciatura
++calendarTypes: 4
++events: 64
++Aplicación de exámenes no ordinarios | 2026-01-05T07:00:00.000Z | 2026-01-06T07:00:00.000Z | General
++Captura de calificaciones de exámenes no ordinarios | 2026-01-05T07:00:00.000Z | 2026-01-06T07:00:00.000Z | General
++Reanudación de labores | 2026-01-05T07:00:00.000Z |  | General
++Solicitud para afiliación de nuevo ingreso seguro facultativo IMSS | 2026-01-08T07:00:00.000Z |  | General
++Selección de carga académica Enero-Mayo 2026 | 2026-01-08T07:00:00.000Z | 2026-01-14T07:00:00.000Z | General
++Inducción para alumnos de nuevo ingreso | 2026-01-08T07:00:00.000Z |  | General
++Primer día de clases | 2026-01-19T07:00:00.000Z |  | General
++Solicitud para afiliación de estudiantes seguro facultativo IMSS | 2026-01-19T07:00:00.000Z | 2026-02-13T07:00:00.000Z | General
++
++Screenshot verificada:
++reports/report_068_calendario.png`,
+ };
+ 
+ function ensureReportsDir() {
+```
+
+### `reports/report_065.md`
+```diff
+diff --git a/reports/report_065.md b/reports/report_065.md
+new file mode 100644
+index 0000000..98c1356
+--- /dev/null
++++ b/reports/report_065.md
+@@ -0,0 +1,929 @@
++# Report 065
++**Fecha:** 2026-05-31 18:33  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
++**Archivos modificados:** 4
++
++## Archivos modificados
++- `generate-report.js` — archivo actualizado en esta tarea
++- `src/App.jsx` — archivo actualizado en esta tarea
++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| generate-report.js | 19 | 21 |
++| src/App.jsx | 120 | 30 |
++| src/components/Onboarding.jsx | 2 | 1 |
++| src/components/Sidebar.jsx | 308 | 134 |
++
++## Resumen
++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `generate-report.js`
++```diff
++diff --git a/generate-report.js b/generate-report.js
++index fa9b68e..90a2816 100644
++--- a/generate-report.js
+++++ b/generate-report.js
++@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
++ 
++ const VERIFICATION = {
++   buildStatus: 'PASS',
++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
+++  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
+++  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
++   verificationOutput: `> dvpotro@0.1.0 build
++ > vite build
++ 
++ vite v5.4.21 building for production...
+++transforming...
++ ✓ 1767 modules transformed.
++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
++-✓ built in 4.93s
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+++✓ built in 8.70s
++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++ 
++-> dvpotro@0.1.0 dist:dir
++-> vite build && electron-builder --dir
+++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
++ 
++-✓ 1767 modules transformed.
++-✓ built in 4.83s
++-• electron-builder version=26.8.1
++-• loaded configuration file=package.json (build field)
++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
++-
++-branding verification OK
++-active branding reference scan OK: no old visible references
++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+++Dist logo assets:
+++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+++
+++Confirmed:
+++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+++- Dist logo asset is under 20KB.
+++- handleSyncAll only adds runCIA when hasFinales is true.
+++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
++ };
++ 
++ function ensureReportsDir() {
++```
++
++### `src/App.jsx`
++```diff
++diff --git a/src/App.jsx b/src/App.jsx
++index 137c482..b672732 100644
++--- a/src/App.jsx
+++++ b/src/App.jsx
++@@ -1,4 +1,4 @@
++-import { useCallback, useEffect, useRef, useState } from 'react';
+++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
++ import Sidebar from './components/Sidebar';
++ import Onboarding from './components/Onboarding';
++ import TaskPanel from './components/TaskPanel';
++@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
++ import Horario from './pages/Horario';
++ import Calificaciones from './pages/Calificaciones';
++ import Ajustes from './pages/Ajustes';
++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
++ 
++ const pageRegistry = {
++   activities: {
++@@ -44,7 +44,7 @@ function App() {
++   const [loading, setLoading] = useState(false);
++   const [loadingHorario, setLoadingHorario] = useState(false);
++   const [loadingCIA, setLoadingCIA] = useState(false);
++-  const [syncingAll, setSyncingAll] = useState(false);
+++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
++   const [syncingModules, setSyncingModules] = useState([]);
++   const [error, setError] = useState('');
++   const [errorHorario, setErrorHorario] = useState('');
++@@ -59,6 +59,7 @@ function App() {
++   const [horarioCargado, setHorarioCargado] = useState(false);
++   const [ciaCargado, setCiaCargado] = useState(false);
++   const [studentName, setStudentName] = useState('');
+++  const [settingsData, setSettingsData] = useState({});
++ 
++   const initializedRef = useRef(false);
++   const nearExpiryRefreshLaunchedRef = useRef(false);
++@@ -75,6 +76,21 @@ function App() {
++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
++       ),
++   );
+++  const proximaEntrega = useMemo(() => {
+++    const pending = (activities || []).filter(
+++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++    );
+++
+++    if (!pending.length) {
+++      return null;
+++    }
+++
+++    return [...pending].sort((left, right) => {
+++      if (!left.fechaLimite) return 1;
+++      if (!right.fechaLimite) return -1;
+++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+++    })[0];
+++  }, [activities]);
++ 
++   const addSyncingModule = (moduleId) => {
++     setSyncingModules((previous) => {
++@@ -135,6 +151,9 @@ function App() {
++       horario: 'horario',
++       calificaciones: 'calificaciones',
++       ajustes: 'settings',
+++      calendario: 'activities',
+++      notifications: 'activities',
+++      notificaciones: 'activities',
++     };
++ 
++     const nextPage = pageAliases[pageId] || pageId;
++@@ -156,6 +175,7 @@ function App() {
++ 
++     try {
++       const settings = await api.getSettings();
+++      setSettingsData(settings || {});
++       const hasUser = Boolean(settings?.user?.trim());
++       const hasPassword = Boolean(settings?.hasPassword);
++       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
++@@ -167,6 +187,7 @@ function App() {
++       initializedRef.current = false;
++       nearExpiryRefreshLaunchedRef.current = false;
++     } catch (_error) {
+++      setSettingsData({});
++       setStudentName('');
++       setShowOnboarding(false);
++     } finally {
++@@ -430,50 +451,109 @@ function App() {
++   };
++ 
++   const handleSyncAll = async () => {
++-    if (!api?.syncAll) {
+++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+++
+++    if (syncState.status === 'syncing' || !scraperApi) {
++       return;
++     }
++ 
++-    setSyncingAll(true);
+++    setSyncState((current) => ({ ...current, status: 'syncing' }));
++     addSyncingModule('activities');
++     addSyncingModule('horario');
++-    addSyncingModule('calificaciones');
+++    if (hasFinales) {
+++      addSyncingModule('calificaciones');
+++    }
++ 
++     try {
++-      const result = await api.syncAll();
+++      const calls = [
+++        { id: 'activities', promise: scraperApi.runScraper?.() },
+++        { id: 'horario', promise: scraperApi.runHorario?.() },
+++      ];
++ 
++-      if (result?.actividades?.activities) {
++-        setActivities(result.actividades.activities);
++-        if (result.actividades?.timestamp) {
++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
++-        }
+++      if (hasFinales) {
+++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
++       }
++ 
++-      if (result?.horario?.materias) {
++-        setHorario({
++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
++-          diasConClases: Array.isArray(result.horario.diasConClases)
++-            ? result.horario.diasConClases
++-            : [],
++-        });
++-        if (result.horario?.timestamp) {
++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+++      const results = await Promise.allSettled(calls.map((call) => call.promise));
+++      let hasErrors = false;
+++
+++      results.forEach((result, index) => {
+++        const moduleId = calls[index]?.id;
+++
+++        if (result.status === 'rejected') {
+++          hasErrors = true;
+++          return;
++         }
++-      }
++ 
++-      if (result?.calificaciones?.materias) {
++-        setCalificaciones(result.calificaciones.materias);
++-        if (result.calificaciones?.timestamp) {
++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+++        const response = result.value;
+++
+++        if (response?.error) {
+++          hasErrors = true;
+++
+++          if (moduleId === 'activities') {
+++            setErrorCode(response.error);
+++            setError(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'horario') {
+++            setErrorHorario(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'calificaciones') {
+++            setErrorCIACode(response.error);
+++            setErrorCIA(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          return;
++         }
++-      }
+++
+++        if (moduleId === 'activities') {
+++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+++          setActivities(activitiesList);
+++          setError('');
+++          setErrorCode('');
+++          if (response?.timestamp) {
+++            setLastSyncAt(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'horario') {
+++          setHorario({
+++            materias: Array.isArray(response?.materias) ? response.materias : [],
+++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+++          });
+++          setErrorHorario('');
+++          if (response?.timestamp) {
+++            setLastSyncHorario(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'calificaciones') {
+++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+++          setCalificaciones(materiasList);
+++          setErrorCIA('');
+++          setErrorCIACode('');
+++          if (response?.timestamp) {
+++            setLastSyncCIA(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++      });
+++
+++      const nextStatus = hasErrors ? 'error' : 'done';
+++      setSyncState({ status: nextStatus, lastSync: new Date() });
+++      setTimeout(
+++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+++        hasErrors ? 4000 : 3000,
+++      );
++     } catch (_error) {
++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+++      setSyncState((current) => ({ ...current, status: 'error' }));
+++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
++     } finally {
++       removeSyncingModule('activities');
++       removeSyncingModule('horario');
++-      removeSyncingModule('calificaciones');
++-      setSyncingAll(false);
+++      if (hasFinales) {
+++        removeSyncingModule('calificaciones');
+++      }
++     }
++   };
++ 
++@@ -556,10 +636,19 @@ function App() {
++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
++         <Sidebar
++           activePage={activePage}
+++          activities={activities}
+++          calendarCount={0}
++           diasConClases={horario?.diasConClases ?? []}
+++          errorHorario={errorHorario}
++           hasFinales={hasFinales}
++           horario={horario?.materias ?? []}
+++          horarioData={horario}
+++          onSyncAll={handleSyncAll}
++           onNavigate={handleNavigate}
+++          proximaEntrega={proximaEntrega}
+++          settingsData={settingsData}
+++          studentName={studentName}
+++          syncState={syncState}
++         />
++         {!settingsReady ? (
++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
++@@ -617,3 +706,4 @@ function App() {
++ }
++ 
++ export default App;
+++
++```
++
++### `src/components/Onboarding.jsx`
++```diff
++diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
++index 3e820a2..7bca3ac 100644
++--- a/src/components/Onboarding.jsx
+++++ b/src/components/Onboarding.jsx
++@@ -1,5 +1,5 @@
++ import { ArrowRight } from 'lucide-react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ 
++ function Onboarding({ onNavigate }) {
++   return (
++@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
++ }
++ 
++ export default Onboarding;
+++
++```
++
++### `src/components/Sidebar.jsx`
++```diff
++diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
++index c7458cb..1aef7a5 100644
++--- a/src/components/Sidebar.jsx
+++++ b/src/components/Sidebar.jsx
++@@ -1,216 +1,390 @@
++-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
++-import { useEffect, useState } from 'react';
++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+++import {
+++  AlertCircle,
+++  Bell,
+++  BookOpen,
+++  CalendarDays,
+++  CheckCircle,
+++  Clock,
+++  Info,
+++  Loader2,
+++  RefreshCw,
+++  Settings,
+++} from 'lucide-react';
+++import { useEffect, useMemo, useState } from 'react';
+++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
++ import { getNextClass } from '../utils/horario.js';
++ 
++-const navigationItems = [
++-  { id: 'activities', label: 'Actividades', icon: ListChecks },
++-  { id: 'horario', label: 'Horario', icon: Calendar },
++-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
++-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
+++const NAV_ITEMS = [
+++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
+++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
+++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
+++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
+++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
++ ];
++ 
++-function getNextClassStatus(nextClass) {
++-  if (!nextClass) {
++-    return '';
+++function normDate(value) {
+++  const date = value ? new Date(value) : null;
+++  return date && !Number.isNaN(date.getTime()) ? date : null;
+++}
+++
+++function formatDayShort(date = new Date()) {
+++  return date.toLocaleDateString('es-MX', {
+++    weekday: 'short',
+++    day: 'numeric',
+++    month: 'short',
+++  });
+++}
+++
+++function formatTime(date) {
+++  return date.toLocaleTimeString('es-MX', {
+++    hour: '2-digit',
+++    minute: '2-digit',
+++  });
+++}
+++
+++function getInitials(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
++   }
++ 
++-  if (!nextClass.esHoy) {
++-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
+++  return clean.slice(0, 2).toUpperCase() || 'DV';
+++}
+++
+++function formatDisplayName(str = '') {
+++  const clean = String(str || '').trim();
+++  const parts = clean.split(/\s+/).filter(Boolean);
+++
+++  if (/^ID\s+\w+/i.test(clean)) {
+++    return clean;
+++  }
+++
+++  if (parts.length >= 2) {
+++    return `${parts[0]} ${parts[1][0]}.`;
+++  }
+++
+++  return clean;
+++}
+++
+++function formatRelativeDeadline(fechaLimite) {
+++  const deadline = normDate(fechaLimite);
+++
+++  if (!deadline) {
+++    return 'Fecha pendiente';
++   }
++ 
++-  if (nextClass.minutosRestantes <= 30) {
+++  const now = new Date();
+++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
+++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
+++  const diffDays = Math.round((target - today) / 86400000);
+++  const time = formatTime(deadline);
+++
+++  if (diffDays < 0) return 'Vencida';
+++  if (diffDays === 0) return `Hoy · ${time}`;
+++  if (diffDays === 1) return `Mañana · ${time}`;
+++  return `En ${diffDays} días`;
+++}
+++
+++function getClassStatus(nextClass) {
+++  if (!nextClass) return '';
+++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
+++
+++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
++     return `En ${nextClass.minutosRestantes} min`;
++   }
++ 
++-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
+++  if (nextClass.esHoy) {
+++    return start;
+++  }
+++
+++  return `${nextClass.dia || 'Próxima'} · ${start}`;
++ }
++ 
++-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
+++function getSyncPresentation(syncState = {}) {
+++  if (syncState.status === 'syncing') {
+++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
+++  }
+++
+++  if (syncState.status === 'done') {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  if (syncState.status === 'error') {
+++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
+++  }
+++
+++  if (syncState.lastSync) {
+++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+++  }
+++
+++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
+++}
+++
+++function Sidebar({
+++  activePage,
+++  activities = [],
+++  calendarCount = 0,
+++  diasConClases = [],
+++  errorHorario = '',
+++  hasFinales = false,
+++  horario = [],
+++  horarioData = null,
+++  onNavigate,
+++  onSyncAll,
+++  proximaEntrega = null,
+++  settingsData = {},
+++  studentName = '',
+++  syncState = { status: 'idle', lastSync: null },
+++}) {
++   const [nextClass, setNextClass] = useState(null);
++-  const visibleNavigationItems = navigationItems.filter(
++-    (item) => item.id !== 'calificaciones' || hasFinales === true,
++-  );
++-  const hasHorario = Array.isArray(horario) && horario.length > 0;
+++  const materiasHorario = Array.isArray(horarioData?.materias)
+++    ? horarioData.materias
+++    : (Array.isArray(horario) ? horario : []);
+++  const pendingCount = activities.filter(
+++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++  ).length;
+++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
+++  const hasHorario = materiasHorario.length > 0;
+++  const syncInfo = getSyncPresentation(syncState);
+++  const SyncIcon = syncInfo.Icon;
+++  const userId = settingsData?.ciaUser || settingsData?.user || '';
+++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
+++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
+++  const initials = getInitials(hasRealStudentName ? studentName : userId);
++ 
++   useEffect(() => {
++-    if (!hasHorario) {
++-      setNextClass(null);
++-      return undefined;
++-    }
++-
++     const updateNextClass = () => {
++-      setNextClass(getNextClass(horario, diasConClases));
+++      setNextClass(getNextClass(materiasHorario, diasConClases));
++     };
++ 
++     updateNextClass();
++     const intervalId = setInterval(updateNextClass, 60 * 1000);
++ 
++     return () => clearInterval(intervalId);
++-  }, [hasHorario, horario, diasConClases]);
+++  }, [materiasHorario, diasConClases]);
+++
+++  const navItems = useMemo(() => NAV_ITEMS, []);
+++
+++  const getBadge = (itemId) => {
+++    if (itemId === 'activities' && pendingCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
+++          {pendingCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
+++          {calendarCount}
+++        </span>
+++      );
+++    }
+++
+++    if (itemId === 'horario') {
+++      if (errorHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
+++      }
+++      if (hasHorario) {
+++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
+++      }
+++    }
++ 
++-  const handleOpenMeetLink = () => {
++-    if (!nextClass?.meetLink) {
++-      return;
+++    if (itemId === 'notifications' && delayedCount > 0) {
+++      return (
+++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
+++          {delayedCount}
+++        </span>
+++      );
++     }
++ 
++-    window.scraperApp?.openExternal?.(nextClass.meetLink);
+++    return null;
++   };
++ 
+++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
+++
++   return (
++     <aside
++-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
++       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
++     >
++-      <div className="mb-8">
+++      <header className="px-4 pb-3.5 pt-4">
++         <div className="flex items-center gap-3">
++-          <span
++-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
++-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
++-          >
++-            <img
++-              src={dvpotroLogo}
++-              alt="DVPotro"
++-              className="h-full w-full object-contain"
++-              draggable="false"
++-            />
++-          </span>
+++          <img
+++            src={dvpotroLogo}
+++            alt="DVPotro"
+++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
+++            draggable="false"
+++          />
++           <div className="min-w-0">
++-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
+++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
++               DVPotro
++             </p>
++-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
+++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
++               ITSON
++             </p>
++           </div>
++         </div>
++-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
++-          Academic command center
++-        </p>
++-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
++-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
++-        </p>
++-      </div>
+++      </header>
++ 
++-      <nav className="space-y-2">
++-        {visibleNavigationItems.map((item) => {
++-          const isActive = item.id === activePage;
+++      <nav className="px-2 pb-2">
+++        {navItems.map((item) => {
++           const Icon = item.icon;
+++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
+++          const badge = getBadge(item.id);
++ 
++           return (
++             <button
++               key={item.id}
++               type="button"
++-              onClick={() => onNavigate(item.id)}
++-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
++-                isActive
++-                  ? ''
++-                  : ''
++-              }`}
+++              onClick={() => onNavigate?.(item.target)}
+++              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
++               style={
++                 isActive
++-                  ? { background: 'var(--accent)', color: '#fff' }
++-                  : {
++-                    background: 'var(--bg-secondary)',
++-                    color: 'var(--text-muted)',
++-                  }
+++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
+++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
++               }
++               onMouseEnter={(event) => {
++                 if (!isActive) {
++-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
+++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
++                   event.currentTarget.style.color = 'var(--text-strong)';
++                 }
++               }}
++               onMouseLeave={(event) => {
++                 if (!isActive) {
++-                  event.currentTarget.style.background = 'var(--bg-secondary)';
+++                  event.currentTarget.style.background = 'transparent';
++                   event.currentTarget.style.color = 'var(--text-muted)';
++                 }
++               }}
++             >
++-              <span className="flex items-center gap-3">
++-                <Icon className="h-4 w-4" />
++-                {item.label}
++-              </span>
++-              <span
++-                className="text-xs uppercase tracking-[0.25em]"
++-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
++-              >
++-                {isActive ? 'Live' : 'Idle'}
+++              <span className="flex min-w-0 items-center gap-3">
+++                <Icon className="h-4 w-4 shrink-0" />
+++                <span className="truncate">{item.label}</span>
++               </span>
+++              {badge}
++             </button>
++           );
++         })}
++       </nav>
++ 
++-      {hasHorario ? (
++-        <div
++-          className="mt-auto border-t pt-4"
++-          style={{ borderColor: 'var(--border-subtle)' }}
+++      <section
+++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+++      >
+++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+++          Sincronización
+++        </p>
+++        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
+++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
+++          <span className="font-medium">{syncInfo.text}</span>
+++        </div>
+++        {syncTimestamp ? (
+++          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++            Última sincronización · {syncTimestamp}
+++          </p>
+++        ) : null}
+++        <button
+++          type="button"
+++          onClick={onSyncAll}
+++          disabled={syncState.status === 'syncing'}
+++          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
+++          style={
+++            syncState.status === 'syncing'
+++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
+++              : { background: 'var(--itson-blue, var(--accent))' }
+++          }
++         >
++-          <div
++-            className="rounded-2xl border p-3"
++-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
++-          >
++-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
++-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
++-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
+++          {syncState.status === 'syncing' ? (
+++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
+++          ) : (
+++            <RefreshCw className="h-3.5 w-3.5" />
+++          )}
+++          Sincronizar todo
+++        </button>
+++        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
+++          Actualiza toda la información de la app
+++        </p>
+++      </section>
+++
+++      <section
+++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
+++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+++      >
+++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
+++          HOY · {formatDayShort(new Date())}
+++        </p>
+++
+++        <div className="mt-3">
+++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+++            Entrega
+++          </p>
+++          {proximaEntrega ? (
+++            <div className="mt-1 min-w-0">
+++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
+++                {proximaEntrega.nombre}
+++              </p>
+++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
+++              </p>
++             </div>
+++          ) : (
+++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
+++          )}
+++        </div>
++ 
++-            {nextClass ? (
++-              <div className="space-y-2">
++-                <div className="flex items-start justify-between gap-2">
++-                  <div className="min-w-0">
++-                    <p
++-                      className="truncate text-sm font-medium"
++-                      style={{ color: 'var(--text-strong)' }}
++-                      title={nextClass.materia}
++-                    >
++-                      {nextClass.materia}
++-                    </p>
++-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
++-                      {nextClass.hora} · {nextClass.salon}
++-                    </p>
++-                  </div>
++-
++-                  {nextClass.meetLink ? (
++-                    <button
++-                      type="button"
++-                      onClick={handleOpenMeetLink}
++-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
++-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
++-                      title="Abrir videollamada"
++-                    >
++-                      <ExternalLink className="h-3.5 w-3.5" />
++-                    </button>
++-                  ) : null}
++-                </div>
+++        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
++ 
+++        <div>
+++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
+++            Clase
+++          </p>
+++          {nextClass ? (
+++            <div className="mt-1 min-w-0">
+++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
+++                {nextClass.materia}
+++              </p>
+++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+++                <span className="truncate">{nextClass.hora}</span>
++                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
++                   <span
++-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
++-                    style={{
++-                      background: 'var(--retrasada-bg)',
++-                      borderColor: 'var(--retrasada-border)',
++-                      color: 'var(--retrasada-text)',
++-                    }}
+++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
+++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
++                   >
++-                    {getNextClassStatus(nextClass)}
+++                    {getClassStatus(nextClass)}
++                   </span>
++                 ) : (
++-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
++-                    {getNextClassStatus(nextClass)}
++-                  </p>
+++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
++                 )}
++               </div>
++-            ) : (
++-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
++-                Sin clases próximas
++-              </p>
++-            )}
++-          </div>
+++            </div>
+++          ) : (
+++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
+++          )}
+++        </div>
+++      </section>
+++
+++      <footer
+++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
+++        style={{ borderColor: 'var(--border)' }}
+++      >
+++        <div
+++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
+++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
+++        >
+++          {initials}
+++        </div>
+++        <div className="min-w-0">
+++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
+++            {profileName}
+++          </p>
+++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
+++            {userId || 'Sin ID configurado'}
+++          </p>
++         </div>
++-      ) : null}
+++      </footer>
++     </aside>
++   );
++ }
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
++**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
++**Output de verificación:**
++```
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1767 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
++✓ built in 8.70s
++The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++
++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
++
++Dist logo assets:
++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
++
++Confirmed:
++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
++- Dist logo asset is under 20KB.
++- handleSyncAll only adds runCIA when hasFinales is true.
++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_066.md`
+```diff
+diff --git a/reports/report_066.md b/reports/report_066.md
+new file mode 100644
+index 0000000..74c057d
+--- /dev/null
++++ b/reports/report_066.md
+@@ -0,0 +1,3027 @@
++# Report 066
++**Fecha:** 2026-05-31 23:05  
++**Agente:** Codex  
++**Tipo:** feature
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
++**Archivos modificados:** 11
++
++## Archivos modificados
++- `electron/handlers/calendario.js` — archivo creado como parte de la base inicial
++- `electron/handlers/horario.js` — archivo actualizado en esta tarea
++- `electron/handlers/settings.js` — archivo actualizado en esta tarea
++- `electron/main.js` — archivo actualizado en esta tarea
++- `electron/preload.js` — archivo actualizado en esta tarea
++- `generate-report.js` — archivo actualizado en esta tarea
++- `reports/report_065.md` — archivo creado como parte de la base inicial
++- `src/App.jsx` — archivo actualizado en esta tarea
++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo creado como parte de la base inicial
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| electron/handlers/calendario.js | 428 | 0 |
++| electron/handlers/horario.js | 57 | 0 |
++| electron/handlers/settings.js | 26 | 0 |
++| electron/main.js | 10 | 1 |
++| electron/preload.js | 2 | 0 |
++| generate-report.js | 34 | 24 |
++| reports/report_065.md | 929 | 0 |
++| src/App.jsx | 220 | 32 |
++| src/components/Onboarding.jsx | 2 | 1 |
++| src/components/Sidebar.jsx | 306 | 134 |
++| src/pages/Calendario.jsx | 318 | 0 |
++
++## Resumen
++Se registraron 11 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `electron/handlers/calendario.js`
++```diff
++diff --git a/electron/handlers/calendario.js b/electron/handlers/calendario.js
++new file mode 100644
++index 0000000..77042d0
++--- /dev/null
+++++ b/electron/handlers/calendario.js
++@@ -0,0 +1,428 @@
+++const fs = require('fs');
+++const path = require('path');
+++const electron = require('electron');
+++const { chromium } = require('playwright');
+++
+++const app = electron?.app;
+++
+++const CALENDARIO_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
+++const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
+++const PAGE_TIMEOUT_MS = 20_000;
+++const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
+++
+++const SPANISH_MONTHS = {
+++  enero: 0,
+++  febrero: 1,
+++  marzo: 2,
+++  abril: 3,
+++  mayo: 4,
+++  junio: 5,
+++  julio: 6,
+++  agosto: 7,
+++  septiembre: 8,
+++  setiembre: 8,
+++  octubre: 9,
+++  noviembre: 10,
+++  diciembre: 11,
+++};
+++
+++function getUserDataPath() {
+++  if (app && typeof app.getPath === 'function') {
+++    return app.getPath('userData');
+++  }
+++
+++  const fallbackPath = path.join(process.cwd(), '.local-data');
+++  fs.mkdirSync(fallbackPath, { recursive: true });
+++  return fallbackPath;
+++}
+++
+++function getTempPath() {
+++  if (app && typeof app.getPath === 'function') {
+++    return app.getPath('temp');
+++  }
+++
+++  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
+++  fs.mkdirSync(fallbackPath, { recursive: true });
+++  return fallbackPath;
+++}
+++
+++function getCalendarioCachePath() {
+++  return path.join(getUserDataPath(), 'calendario-cache.json');
+++}
+++
+++function discardFile(filePath) {
+++  if (fs.existsSync(filePath)) {
+++    fs.unlinkSync(filePath);
+++  }
+++}
+++
+++function readCalendarioCache() {
+++  const cachePath = getCalendarioCachePath();
+++
+++  if (!fs.existsSync(cachePath)) {
+++    return null;
+++  }
+++
+++  try {
+++    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
+++
+++    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
+++      discardFile(cachePath);
+++      return null;
+++    }
+++
+++    return parsed;
+++  } catch (_error) {
+++    discardFile(cachePath);
+++    return null;
+++  }
+++}
+++
+++function writeCalendarioCache(payload) {
+++  const nextPayload = {
+++    events: Array.isArray(payload?.events) ? payload.events : [],
+++    timestamp: Date.now(),
+++  };
+++
+++  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
+++  return nextPayload;
+++}
+++
+++function clearCache() {
+++  discardFile(getCalendarioCachePath());
+++  return { success: true };
+++}
+++
+++function isTimeoutError(error) {
+++  return Boolean(
+++    error &&
+++      (error.name === 'TimeoutError' ||
+++        /timeout/i.test(error.message || '') ||
+++        /timed out/i.test(error.message || '')),
+++  );
+++}
+++
+++function isNetworkError(error) {
+++  const message = error?.message || '';
+++  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
+++    message,
+++  );
+++}
+++
+++async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
+++  let lastError;
+++
+++  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
+++    try {
+++      return await page.goto(url, {
+++        waitUntil: 'domcontentloaded',
+++        timeout: PAGE_TIMEOUT_MS,
+++        ...options,
+++      });
+++    } catch (error) {
+++      lastError = error;
+++
+++      if (isNetworkError(error)) {
+++        throw new Error('NO_INTERNET');
+++      }
+++
+++      if (!isTimeoutError(error) || attempt === maxRetries) {
+++        throw error;
+++      }
+++
+++      await page.waitForTimeout(1500);
+++    }
+++  }
+++
+++  throw lastError;
+++}
+++
+++async function applyResourceBlocking(page) {
+++  await page.route('**/*', (route) => {
+++    const resourceType = route.request().resourceType();
+++
+++    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
+++      route.abort();
+++      return;
+++    }
+++
+++    route.continue();
+++  });
+++}
+++
+++function unfoldICS(content) {
+++  return String(content || '').replace(/\r?\n[ \t]/g, '');
+++}
+++
+++function unescapeICSText(value) {
+++  return String(value || '')
+++    .replace(/\\n/g, '\n')
+++    .replace(/\\,/g, ',')
+++    .replace(/\\;/g, ';')
+++    .replace(/\\\\/g, '\\')
+++    .trim();
+++}
+++
+++function parseICSDate(str) {
+++  if (!str) return null;
+++  const d = String(str).replace(/[TZ]/g, '');
+++  if (d.length < 8) return null;
+++
+++  try {
+++    return new Date(
+++      Number(d.slice(0, 4)),
+++      Number(d.slice(4, 6)) - 1,
+++      Number(d.slice(6, 8)),
+++      d.length >= 10 ? Number(d.slice(8, 10)) : 0,
+++      d.length >= 12 ? Number(d.slice(10, 12)) : 0,
+++    ).toISOString();
+++  } catch (_error) {
+++    return null;
+++  }
+++}
+++
+++function parseICS(content) {
+++  const events = [];
+++  const blocks = unfoldICS(content).split('BEGIN:VEVENT');
+++
+++  for (const block of blocks.slice(1)) {
+++    const get = (field) => {
+++      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
+++      return match ? unescapeICSText(match[1]) : '';
+++    };
+++    const inicio = parseICSDate(get('DTSTART'));
+++
+++    if (!inicio) {
+++      continue;
+++    }
+++
+++    events.push({
+++      titulo: get('SUMMARY') || 'Evento',
+++      inicio,
+++      fin: parseICSDate(get('DTEND')),
+++      descripcion: get('DESCRIPTION'),
+++      ubicacion: get('LOCATION'),
+++      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
+++    });
+++  }
+++
+++  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+++}
+++
+++function parseDateText(text) {
+++  const normalized = String(text || '').trim();
+++
+++  if (!normalized) {
+++    return null;
+++  }
+++
+++  const nativeDate = new Date(normalized);
+++  if (!Number.isNaN(nativeDate.getTime())) {
+++    return nativeDate.toISOString();
+++  }
+++
+++  const spanishMatch = normalized
+++    .toLowerCase()
+++    .normalize('NFD')
+++    .replace(/[\u0300-\u036f]/g, '')
+++    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
+++
+++  if (spanishMatch) {
+++    const day = Number(spanishMatch[1]);
+++    const month = SPANISH_MONTHS[spanishMatch[2]];
+++    const year = Number(spanishMatch[3]);
+++
+++    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
+++      return new Date(year, month, day).toISOString();
+++    }
+++  }
+++
+++  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
+++  if (numericMatch) {
+++    const day = Number(numericMatch[1]);
+++    const month = Number(numericMatch[2]) - 1;
+++    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
+++    return new Date(year, month, day).toISOString();
+++  }
+++
+++  return null;
+++}
+++
+++function normalizeEvent(event) {
+++  return {
+++    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
+++    inicio: event?.inicio || new Date().toISOString(),
+++    fin: event?.fin || null,
+++    descripcion: String(event?.descripcion || '').trim(),
+++    ubicacion: String(event?.ubicacion || '').trim(),
+++    categoria: String(event?.categoria || 'General').trim() || 'General',
+++  };
+++}
+++
+++async function tryDownloadICS(page) {
+++  const downloadPath = getTempPath();
+++
+++  try {
+++    const client = await page.context().newCDPSession(page);
+++    await client.send('Page.setDownloadBehavior', {
+++      behavior: 'allow',
+++      downloadPath,
+++    });
+++  } catch (_error) {
+++    // Download behavior is best-effort; DOM fallback still works.
+++  }
+++
+++  const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
+++  const downloadButton = await page
+++    .$('a[href*=".ics"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario"), button:has-text("Descargar"), a:has-text("Descargar")')
+++    .catch(() => null);
+++
+++  if (!downloadButton) {
+++    return null;
+++  }
+++
+++  await downloadButton.click().catch(() => {});
+++  const download = await downloadPromise;
+++
+++  if (!download) {
+++    return null;
+++  }
+++
+++  const tmpPath = path.join(downloadPath, 'itson-cal.ics');
+++  discardFile(tmpPath);
+++  await download.saveAs(tmpPath);
+++
+++  const raw = fs.readFileSync(tmpPath, 'utf8');
+++  if (!raw.includes('BEGIN:VCALENDAR')) {
+++    return null;
+++  }
+++
+++  return parseICS(raw);
+++}
+++
+++async function scrapeDOMEvents(page) {
+++  await page.waitForTimeout(3000);
+++
+++  const events = await page.evaluate(() => {
+++    const rows = document.querySelectorAll(
+++      'tr[data-event], .evento, .event, [class*="evento"], [class*="calendar-event"], ' +
+++        'li[class*="event"], .fc-event, .item-evento',
+++    );
+++
+++    if (rows.length) {
+++      return Array.from(rows)
+++        .map((el) => ({
+++          titulo: (
+++            el.querySelector('[class*="titulo"],[class*="title"],h3,h4,strong,td:nth-child(2)')
+++              ?.textContent || el.textContent
+++          )
+++            .trim()
+++            .slice(0, 150),
+++          fechaTexto:
+++            el.querySelector('[class*="fecha"],[class*="date"],time,td:nth-child(1)')
+++              ?.textContent?.trim() || '',
+++          categoria:
+++            el.querySelector('[class*="categ"],[class*="tipo"],[class*="tag"]')
+++              ?.textContent?.trim() || 'General',
+++          descripcion:
+++            el.querySelector('[class*="desc"],[class*="detalle"]')?.textContent?.trim() || '',
+++        }))
+++        .filter((event) => event.titulo && event.titulo.length > 2);
+++    }
+++
+++    const tables = document.querySelectorAll('table');
+++    const results = [];
+++
+++    tables.forEach((table) => {
+++      table.querySelectorAll('tr').forEach((tr) => {
+++        const cells = tr.querySelectorAll('td');
+++        if (cells.length >= 2) {
+++          results.push({
+++            titulo: cells[1]?.textContent?.trim() || cells[0]?.textContent?.trim(),
+++            fechaTexto: cells[0]?.textContent?.trim() || '',
+++            categoria: cells[2]?.textContent?.trim() || 'General',
+++            descripcion: '',
+++          });
+++        }
+++      });
+++    });
+++
+++    return results.filter((event) => event.titulo && event.titulo.length > 2);
+++  });
+++
+++  return events
+++    .map((event) =>
+++      normalizeEvent({
+++        titulo: event.titulo,
+++        inicio: parseDateText(event.fechaTexto) || new Date().toISOString(),
+++        fin: null,
+++        categoria: event.categoria,
+++        descripcion: event.descripcion,
+++        ubicacion: '',
+++      }),
+++    )
+++    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
+++}
+++
+++async function scrapeCalendario() {
+++  const browser = await chromium.launch({ headless: true });
+++
+++  try {
+++    const page = await browser.newPage();
+++    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
+++    await applyResourceBlocking(page);
+++    await gotoWithRetry(page, CALENDARIO_URL, {
+++      waitUntil: 'domcontentloaded',
+++      timeout: PAGE_TIMEOUT_MS,
+++    });
+++
+++    const icsEvents = await tryDownloadICS(page);
+++    if (Array.isArray(icsEvents) && icsEvents.length > 0) {
+++      return { events: icsEvents.map(normalizeEvent), timestamp: Date.now(), fromCache: false };
+++    }
+++
+++    const domEvents = await scrapeDOMEvents(page);
+++    return { events: domEvents, timestamp: Date.now(), fromCache: false };
+++  } finally {
+++    await browser.close();
+++  }
+++}
+++
+++async function run() {
+++  const cached = readCalendarioCache();
+++
+++  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
+++    return {
+++      ...cached,
+++      fromCache: true,
+++    };
+++  }
+++
+++  try {
+++    const result = await scrapeCalendario();
+++    const cachedPayload = writeCalendarioCache(result);
+++    return {
+++      ...cachedPayload,
+++      fromCache: false,
+++    };
+++  } catch (error) {
+++    if (error?.message === 'NO_INTERNET') {
+++      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
+++    }
+++
+++    return {
+++      error: error?.message
+++        ? `Falló la extracción del calendario escolar: ${error.message}`
+++        : 'Falló la extracción del calendario escolar por un error no identificado.',
+++    };
+++  }
+++}
+++
+++module.exports = {
+++  clearCache,
+++  getCalendarioCachePath,
+++  parseDateText,
+++  parseICS,
+++  parseICSDate,
+++  run,
+++};
++```
++
++### `electron/handlers/horario.js`
++```diff
++diff --git a/electron/handlers/horario.js b/electron/handlers/horario.js
++index 45995c1..d957056 100644
++--- a/electron/handlers/horario.js
+++++ b/electron/handlers/horario.js
++@@ -913,6 +913,61 @@ async function loginToCIA(page, user, password) {
++   return null;
++ }
++ 
+++async function tryExtractStudentName(page) {
+++  const selectors = [
+++    '#ctl00_cLabel_nombre',
+++    '.user-name',
+++    '#user-name',
+++    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
+++    '.navbar-text',
+++    'span[id*="Name"]',
+++  ];
+++
+++  for (const selector of selectors) {
+++    try {
+++      const element = await page.$(selector);
+++
+++      if (!element) {
+++        continue;
+++      }
+++
+++      const text = normalizeWhitespace(await element.textContent());
+++      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
+++        return text;
+++      }
+++    } catch (_error) {
+++      // Continue with the next selector.
+++    }
+++  }
+++
+++  try {
+++    const bodyText = await page.evaluate(() => document.body?.innerText || '');
+++    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
+++    if (match) {
+++      return normalizeWhitespace(match[1]);
+++    }
+++  } catch (_error) {
+++    // Silent fallback.
+++  }
+++
+++  return null;
+++}
+++
+++async function persistStudentNameFromCIA(page) {
+++  const nombre = await tryExtractStudentName(page);
+++
+++  if (!nombre) {
+++    return;
+++  }
+++
+++  try {
+++    const { saveStudentName } = require('./settings');
+++    await saveStudentName(nombre);
+++  } catch (_error) {
+++    // Student name persistence must never block horario scraping.
+++  }
+++}
+++
++ async function getTargetContentFrame(page, timeout = 25_000) {
++   return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
++ }
++@@ -2413,6 +2468,7 @@ async function scrapeHorario(controller = {}) {
++       return loginResult;
++     }
++ 
+++    await persistStudentNameFromCIA(page);
++     await applyResourceBlocking(page);
++     let scheduleFrame;
++     try {
++@@ -2427,6 +2483,7 @@ async function scrapeHorario(controller = {}) {
++         if (retryLogin?.error) {
++           return retryLogin;
++         }
+++        await persistStudentNameFromCIA(page);
++         scheduleFrame = await openHorarioPage(page);
++       } else {
++         throw error;
++```
++
++### `electron/handlers/settings.js`
++```diff
++diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
++index 0b6f430..cdefc37 100644
++--- a/electron/handlers/settings.js
+++++ b/electron/handlers/settings.js
++@@ -26,6 +26,7 @@ function getSettings() {
++     ciaUser: process.env.CIA_USER || '',
++     hasCIAPassword: Boolean(process.env.CIA_PASS),
++     notifMinutesBefore: Number(process.env.NOTIF_MINUTES_BEFORE) || 10,
+++    studentName: process.env.STUDENT_NAME || '',
++   };
++ }
++ 
++@@ -96,6 +97,30 @@ function saveSettings({ user, password, ciaUser, ciaPassword, notifMinutesBefore
++   }
++ }
++ 
+++async function saveStudentName(name) {
+++  try {
+++    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
+++
+++    if (!normalizedName) {
+++      return { success: false, error: 'Nombre de estudiante vacío.' };
+++    }
+++
+++    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
+++    envLines = upsertEnvValue(envLines, 'STUDENT_NAME', normalizedName);
+++
+++    const envPath = getEnvFilePath();
+++    fs.writeFileSync(envPath, `${envLines.join('\n')}\n`, 'utf8');
+++    process.env.STUDENT_NAME = normalizedName;
+++
+++    return { success: true };
+++  } catch (error) {
+++    return {
+++      success: false,
+++      error: error?.message || 'No fue posible guardar el nombre del estudiante.',
+++    };
+++  }
+++}
+++
++ function registerSettingsHandlers() {
++   ipcMain.handle('settings:get', async () => getSettings());
++   ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
++@@ -105,5 +130,6 @@ module.exports = {
++   getEnvFilePath,
++   getSettings,
++   registerSettingsHandlers,
+++  saveStudentName,
++   saveSettings,
++ };
++```
++
++### `electron/main.js`
++```diff
++diff --git a/electron/main.js b/electron/main.js
++index af41ff2..b00bba1 100644
++--- a/electron/main.js
+++++ b/electron/main.js
++@@ -8,6 +8,7 @@ const { registerFileHandlers } = require('./handlers/files');
++ const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
++ const { registerSettingsHandlers } = require('./handlers/settings');
++ const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
+++const calendarioHandler = require('./handlers/calendario');
++ 
++ const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
++ const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
++@@ -57,6 +58,8 @@ app.whenReady().then(() => {
++   registerFileHandlers();
++   registerSettingsHandlers();
++   registerNotificationHandlers();
+++  ipcMain.handle('calendario:run', () => calendarioHandler.run());
+++  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
++   ipcMain.removeHandler('shell:open-external');
++   ipcMain.handle('shell:open-external', async (_event, url) => {
++     if (url && typeof url === 'string' && url.startsWith('http')) {
++@@ -72,11 +75,13 @@ app.whenReady().then(() => {
++     clearActivitiesCache();
++     clearHorarioCache();
++     clearCIACache();
+++    calendarioHandler.clearCache();
++ 
++-    const [actividades, horario, calificaciones] = await Promise.allSettled([
+++    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
++       getActivitiesWithCache(),
++       getHorarioWithCache(),
++       getCalificacionesWithCache(),
+++      calendarioHandler.run(),
++     ]);
++ 
++     return {
++@@ -90,6 +95,10 @@ app.whenReady().then(() => {
++         calificaciones.status === 'fulfilled'
++           ? calificaciones.value
++           : { error: calificaciones.reason?.message },
+++      calendario:
+++        calendario.status === 'fulfilled'
+++          ? calendario.value
+++          : { error: calendario.reason?.message },
++     };
++   });
++   createMainWindow();
++```
++
++### `electron/preload.js`
++```diff
++diff --git a/electron/preload.js b/electron/preload.js
++index 05a306d..48a4dff 100644
++--- a/electron/preload.js
+++++ b/electron/preload.js
++@@ -5,8 +5,10 @@ contextBridge.exposeInMainWorld('scraperApp', {
++   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
++   runCIA: () => ipcRenderer.invoke('cia:run'),
++   runHorario: () => ipcRenderer.invoke('horario:run'),
+++  runCalendario: () => ipcRenderer.invoke('calendario:run'),
++   clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
++   clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
+++  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
++   saveHorarioLink: (numeroClase, link) =>
++     ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
++   getSettings: () => ipcRenderer.invoke('settings:get'),
++```
++
++### `generate-report.js`
++```diff
++diff --git a/generate-report.js b/generate-report.js
++index fa9b68e..a0779f8 100644
++--- a/generate-report.js
+++++ b/generate-report.js
++@@ -19,35 +19,45 @@ const MAX_DIFF_BYTES = 150 * 1024;
++ 
++ const VERIFICATION = {
++   buildStatus: 'PASS',
++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
++-  verificationOutput: `> dvpotro@0.1.0 build
+++  testsRun: 'npm run build + handler/preload/settings static checks + calendario empty-state static check + node syntax checks',
+++  verificationCmd: 'node calendario/settings/preload checks; npm run build; node -c electron handlers; node Calendario empty-state check',
+++  verificationOutput: `RED checks before implementation:
+++calendario handler missing: MODULE_NOT_FOUND
+++studentName field: false
+++runCalendario exposed: false
+++
+++GREEN checks after implementation:
+++$ node -e "const c = require('./electron/handlers/calendario'); console.log('run:', typeof c.run); console.log('clearCache:', typeof c.clearCache);"
+++run: function
+++clearCache: function
+++
+++$ node -e "require('dotenv').config(); const s = require('./electron/handlers/settings'); const st = s.getSettings ? s.getSettings() : null; console.log('studentName field:', 'studentName' in (st||{}));"
+++studentName field: true
+++
+++$ node -e "const fs = require('fs'); const pre = fs.readFileSync('./electron/preload.js','utf-8'); console.log('runCalendario exposed:', pre.includes('runCalendario'));"
+++runCalendario exposed: true
+++
+++$ npm run build
+++> dvpotro@0.1.0 build
++ > vite build
++ 
++ vite v5.4.21 building for production...
++-✓ 1767 modules transformed.
++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
++-✓ built in 4.93s
+++transforming...
+++✓ 1768 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-B1C-mb04.css             31.45 kB │ gzip:  6.71 kB
+++dist/assets/index-Bydx8v6A.js              314.96 kB │ gzip: 86.03 kB
+++✓ built in 14.62s
++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
++ 
++-> dvpotro@0.1.0 dist:dir
++-> vite build && electron-builder --dir
++-
++-✓ 1767 modules transformed.
++-✓ built in 4.83s
++-• electron-builder version=26.8.1
++-• loaded configuration file=package.json (build field)
++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
++-
++-branding verification OK
++-active branding reference scan OK: no old visible references
++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
+++$ node -c electron/handlers/calendario.js; node -c electron/handlers/settings.js; node -c electron/main.js; node -c electron/preload.js
+++PASS
+++
+++$ node -e "const fs=require('fs'); const src=fs.readFileSync('./src/pages/Calendario.jsx','utf8'); console.log('calendar empty safe:', src.includes('calendarData = { events: [] }') && src.includes('Array.isArray(calendarData?.events)'));"
+++calendar empty safe: true`,
++ };
++ 
++ function ensureReportsDir() {
++```
++
++### `reports/report_065.md`
++```diff
++diff --git a/reports/report_065.md b/reports/report_065.md
++new file mode 100644
++index 0000000..98c1356
++--- /dev/null
+++++ b/reports/report_065.md
++@@ -0,0 +1,929 @@
+++# Report 065
+++**Fecha:** 2026-05-31 18:33  
+++**Agente:** Codex  
+++**Tipo:** refactor
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 3b68805 — feat: branding DVPotro, widget próxima clase, notificaciones de clases, modos de vista en actividades
+++**Archivos modificados:** 4
+++
+++## Archivos modificados
+++- `generate-report.js` — archivo actualizado en esta tarea
+++- `src/App.jsx` — archivo actualizado en esta tarea
+++- `src/components/Onboarding.jsx` — archivo actualizado en esta tarea
+++- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| generate-report.js | 19 | 21 |
+++| src/App.jsx | 120 | 30 |
+++| src/components/Onboarding.jsx | 2 | 1 |
+++| src/components/Sidebar.jsx | 308 | 134 |
+++
+++## Resumen
+++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `generate-report.js`
+++```diff
+++diff --git a/generate-report.js b/generate-report.js
+++index fa9b68e..90a2816 100644
+++--- a/generate-report.js
++++++ b/generate-report.js
+++@@ -19,35 +19,33 @@ const MAX_DIFF_BYTES = 150 * 1024;
+++ 
+++ const VERIFICATION = {
+++   buildStatus: 'PASS',
+++-  testsRun: 'npm run build + npm run dist:dir + branding asset/config/static reference checks',
+++-  verificationCmd: 'npm run build; npm run dist:dir; node branding verification; rg old active branding references',
++++  testsRun: 'npm run build + static Sidebar 065 checks + dist logo asset size check',
++++  verificationCmd: 'npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*',
+++   verificationOutput: `> dvpotro@0.1.0 build
+++ > vite build
+++ 
+++ vite v5.4.21 building for production...
++++transforming...
+++ ✓ 1767 modules transformed.
+++-dist/index.html                        0.47 kB │ gzip:  0.30 kB
+++-dist/assets/dvpotro-logo-CBq7ehc7.png  547.24 kB
+++-dist/assets/index-DSm_0RCx.css         30.38 kB │ gzip:  6.54 kB
+++-dist/assets/index-fJoIziKb.js          297.64 kB │ gzip: 81.87 kB
+++-✓ built in 4.93s
++++rendering chunks...
++++computing gzip size...
++++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
++++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
++++✓ built in 8.70s
+++ The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+++ 
+++-> dvpotro@0.1.0 dist:dir
+++-> vite build && electron-builder --dir
++++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
+++ 
+++-✓ 1767 modules transformed.
+++-✓ built in 4.83s
+++-• electron-builder version=26.8.1
+++-• loaded configuration file=package.json (build field)
+++-• packaging platform=win32 arch=x64 electron=42.2.0 appOutDir=release\\win-unpacked
+++-• updating asar integrity executable resource executablePath=release\\win-unpacked\\DVPotro.exe
+++-Warnings observed: package author missing, duplicate dependency references, Vite CJS deprecation, Node DEP0190 from electron-builder.
+++-
+++-branding verification OK
+++-active branding reference scan OK: no old visible references
+++-release/win-unpacked/DVPotro.exe exists (226508800 bytes)
+++-Assets created: build/icon.ico, build/icon.png, build/icon.icns, build/icon-{16,32,64,128,256,512}.png, src/assets/branding/dvpotro-logo*.png, public/favicon.png`,
++++Dist logo assets:
++++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
++++
++++Confirmed:
++++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
++++- Dist logo asset is under 20KB.
++++- handleSyncAll only adds runCIA when hasFinales is true.
++++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.`,
+++ };
+++ 
+++ function ensureReportsDir() {
+++```
+++
+++### `src/App.jsx`
+++```diff
+++diff --git a/src/App.jsx b/src/App.jsx
+++index 137c482..b672732 100644
+++--- a/src/App.jsx
++++++ b/src/App.jsx
+++@@ -1,4 +1,4 @@
+++-import { useCallback, useEffect, useRef, useState } from 'react';
++++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+++ import Sidebar from './components/Sidebar';
+++ import Onboarding from './components/Onboarding';
+++ import TaskPanel from './components/TaskPanel';
+++@@ -6,7 +6,7 @@ import Actividades from './pages/Actividades';
+++ import Horario from './pages/Horario';
+++ import Calificaciones from './pages/Calificaciones';
+++ import Ajustes from './pages/Ajustes';
+++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
++++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
+++ 
+++ const pageRegistry = {
+++   activities: {
+++@@ -44,7 +44,7 @@ function App() {
+++   const [loading, setLoading] = useState(false);
+++   const [loadingHorario, setLoadingHorario] = useState(false);
+++   const [loadingCIA, setLoadingCIA] = useState(false);
+++-  const [syncingAll, setSyncingAll] = useState(false);
++++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
+++   const [syncingModules, setSyncingModules] = useState([]);
+++   const [error, setError] = useState('');
+++   const [errorHorario, setErrorHorario] = useState('');
+++@@ -59,6 +59,7 @@ function App() {
+++   const [horarioCargado, setHorarioCargado] = useState(false);
+++   const [ciaCargado, setCiaCargado] = useState(false);
+++   const [studentName, setStudentName] = useState('');
++++  const [settingsData, setSettingsData] = useState({});
+++ 
+++   const initializedRef = useRef(false);
+++   const nearExpiryRefreshLaunchedRef = useRef(false);
+++@@ -75,6 +76,21 @@ function App() {
+++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
+++       ),
+++   );
++++  const proximaEntrega = useMemo(() => {
++++    const pending = (activities || []).filter(
++++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++++    );
++++
++++    if (!pending.length) {
++++      return null;
++++    }
++++
++++    return [...pending].sort((left, right) => {
++++      if (!left.fechaLimite) return 1;
++++      if (!right.fechaLimite) return -1;
++++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
++++    })[0];
++++  }, [activities]);
+++ 
+++   const addSyncingModule = (moduleId) => {
+++     setSyncingModules((previous) => {
+++@@ -135,6 +151,9 @@ function App() {
+++       horario: 'horario',
+++       calificaciones: 'calificaciones',
+++       ajustes: 'settings',
++++      calendario: 'activities',
++++      notifications: 'activities',
++++      notificaciones: 'activities',
+++     };
+++ 
+++     const nextPage = pageAliases[pageId] || pageId;
+++@@ -156,6 +175,7 @@ function App() {
+++ 
+++     try {
+++       const settings = await api.getSettings();
++++      setSettingsData(settings || {});
+++       const hasUser = Boolean(settings?.user?.trim());
+++       const hasPassword = Boolean(settings?.hasPassword);
+++       const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+++@@ -167,6 +187,7 @@ function App() {
+++       initializedRef.current = false;
+++       nearExpiryRefreshLaunchedRef.current = false;
+++     } catch (_error) {
++++      setSettingsData({});
+++       setStudentName('');
+++       setShowOnboarding(false);
+++     } finally {
+++@@ -430,50 +451,109 @@ function App() {
+++   };
+++ 
+++   const handleSyncAll = async () => {
+++-    if (!api?.syncAll) {
++++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
++++
++++    if (syncState.status === 'syncing' || !scraperApi) {
+++       return;
+++     }
+++ 
+++-    setSyncingAll(true);
++++    setSyncState((current) => ({ ...current, status: 'syncing' }));
+++     addSyncingModule('activities');
+++     addSyncingModule('horario');
+++-    addSyncingModule('calificaciones');
++++    if (hasFinales) {
++++      addSyncingModule('calificaciones');
++++    }
+++ 
+++     try {
+++-      const result = await api.syncAll();
++++      const calls = [
++++        { id: 'activities', promise: scraperApi.runScraper?.() },
++++        { id: 'horario', promise: scraperApi.runHorario?.() },
++++      ];
+++ 
+++-      if (result?.actividades?.activities) {
+++-        setActivities(result.actividades.activities);
+++-        if (result.actividades?.timestamp) {
+++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+++-        }
++++      if (hasFinales) {
++++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
+++       }
+++ 
+++-      if (result?.horario?.materias) {
+++-        setHorario({
+++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
+++-          diasConClases: Array.isArray(result.horario.diasConClases)
+++-            ? result.horario.diasConClases
+++-            : [],
+++-        });
+++-        if (result.horario?.timestamp) {
+++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
++++      const results = await Promise.allSettled(calls.map((call) => call.promise));
++++      let hasErrors = false;
++++
++++      results.forEach((result, index) => {
++++        const moduleId = calls[index]?.id;
++++
++++        if (result.status === 'rejected') {
++++          hasErrors = true;
++++          return;
+++         }
+++-      }
+++ 
+++-      if (result?.calificaciones?.materias) {
+++-        setCalificaciones(result.calificaciones.materias);
+++-        if (result.calificaciones?.timestamp) {
+++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
++++        const response = result.value;
++++
++++        if (response?.error) {
++++          hasErrors = true;
++++
++++          if (moduleId === 'activities') {
++++            setErrorCode(response.error);
++++            setError(getFriendlyIVirtualError(response.error));
++++          }
++++
++++          if (moduleId === 'horario') {
++++            setErrorHorario(getFriendlyIVirtualError(response.error));
++++          }
++++
++++          if (moduleId === 'calificaciones') {
++++            setErrorCIACode(response.error);
++++            setErrorCIA(getFriendlyIVirtualError(response.error));
++++          }
++++
++++          return;
+++         }
+++-      }
++++
++++        if (moduleId === 'activities') {
++++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
++++          setActivities(activitiesList);
++++          setError('');
++++          setErrorCode('');
++++          if (response?.timestamp) {
++++            setLastSyncAt(new Date(response.timestamp).toISOString());
++++          }
++++        }
++++
++++        if (moduleId === 'horario') {
++++          setHorario({
++++            materias: Array.isArray(response?.materias) ? response.materias : [],
++++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
++++          });
++++          setErrorHorario('');
++++          if (response?.timestamp) {
++++            setLastSyncHorario(new Date(response.timestamp).toISOString());
++++          }
++++        }
++++
++++        if (moduleId === 'calificaciones') {
++++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
++++          setCalificaciones(materiasList);
++++          setErrorCIA('');
++++          setErrorCIACode('');
++++          if (response?.timestamp) {
++++            setLastSyncCIA(new Date(response.timestamp).toISOString());
++++          }
++++        }
++++      });
++++
++++      const nextStatus = hasErrors ? 'error' : 'done';
++++      setSyncState({ status: nextStatus, lastSync: new Date() });
++++      setTimeout(
++++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
++++        hasErrors ? 4000 : 3000,
++++      );
+++     } catch (_error) {
+++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
++++      setSyncState((current) => ({ ...current, status: 'error' }));
++++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
+++     } finally {
+++       removeSyncingModule('activities');
+++       removeSyncingModule('horario');
+++-      removeSyncingModule('calificaciones');
+++-      setSyncingAll(false);
++++      if (hasFinales) {
++++        removeSyncingModule('calificaciones');
++++      }
+++     }
+++   };
+++ 
+++@@ -556,10 +636,19 @@ function App() {
+++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
+++         <Sidebar
+++           activePage={activePage}
++++          activities={activities}
++++          calendarCount={0}
+++           diasConClases={horario?.diasConClases ?? []}
++++          errorHorario={errorHorario}
+++           hasFinales={hasFinales}
+++           horario={horario?.materias ?? []}
++++          horarioData={horario}
++++          onSyncAll={handleSyncAll}
+++           onNavigate={handleNavigate}
++++          proximaEntrega={proximaEntrega}
++++          settingsData={settingsData}
++++          studentName={studentName}
++++          syncState={syncState}
+++         />
+++         {!settingsReady ? (
+++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
+++@@ -617,3 +706,4 @@ function App() {
+++ }
+++ 
+++ export default App;
++++
+++```
+++
+++### `src/components/Onboarding.jsx`
+++```diff
+++diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
+++index 3e820a2..7bca3ac 100644
+++--- a/src/components/Onboarding.jsx
++++++ b/src/components/Onboarding.jsx
+++@@ -1,5 +1,5 @@
+++ import { ArrowRight } from 'lucide-react';
+++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+++ 
+++ function Onboarding({ onNavigate }) {
+++   return (
+++@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
+++ }
+++ 
+++ export default Onboarding;
++++
+++```
+++
+++### `src/components/Sidebar.jsx`
+++```diff
+++diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
+++index c7458cb..1aef7a5 100644
+++--- a/src/components/Sidebar.jsx
++++++ b/src/components/Sidebar.jsx
+++@@ -1,216 +1,390 @@
+++-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
+++-import { useEffect, useState } from 'react';
+++-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
++++import {
++++  AlertCircle,
++++  Bell,
++++  BookOpen,
++++  CalendarDays,
++++  CheckCircle,
++++  Clock,
++++  Info,
++++  Loader2,
++++  RefreshCw,
++++  Settings,
++++} from 'lucide-react';
++++import { useEffect, useMemo, useState } from 'react';
++++import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
+++ import { getNextClass } from '../utils/horario.js';
+++ 
+++-const navigationItems = [
+++-  { id: 'activities', label: 'Actividades', icon: ListChecks },
+++-  { id: 'horario', label: 'Horario', icon: Calendar },
+++-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
+++-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
++++const NAV_ITEMS = [
++++  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
++++  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
++++  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
++++  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
++++  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
+++ ];
+++ 
+++-function getNextClassStatus(nextClass) {
+++-  if (!nextClass) {
+++-    return '';
++++function normDate(value) {
++++  const date = value ? new Date(value) : null;
++++  return date && !Number.isNaN(date.getTime()) ? date : null;
++++}
++++
++++function formatDayShort(date = new Date()) {
++++  return date.toLocaleDateString('es-MX', {
++++    weekday: 'short',
++++    day: 'numeric',
++++    month: 'short',
++++  });
++++}
++++
++++function formatTime(date) {
++++  return date.toLocaleTimeString('es-MX', {
++++    hour: '2-digit',
++++    minute: '2-digit',
++++  });
++++}
++++
++++function getInitials(str = '') {
++++  const clean = String(str || '').trim();
++++  const parts = clean.split(/\s+/).filter(Boolean);
++++
++++  if (parts.length >= 2) {
++++    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
+++   }
+++ 
+++-  if (!nextClass.esHoy) {
+++-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
++++  return clean.slice(0, 2).toUpperCase() || 'DV';
++++}
++++
++++function formatDisplayName(str = '') {
++++  const clean = String(str || '').trim();
++++  const parts = clean.split(/\s+/).filter(Boolean);
++++
++++  if (/^ID\s+\w+/i.test(clean)) {
++++    return clean;
++++  }
++++
++++  if (parts.length >= 2) {
++++    return `${parts[0]} ${parts[1][0]}.`;
++++  }
++++
++++  return clean;
++++}
++++
++++function formatRelativeDeadline(fechaLimite) {
++++  const deadline = normDate(fechaLimite);
++++
++++  if (!deadline) {
++++    return 'Fecha pendiente';
+++   }
+++ 
+++-  if (nextClass.minutosRestantes <= 30) {
++++  const now = new Date();
++++  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
++++  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
++++  const diffDays = Math.round((target - today) / 86400000);
++++  const time = formatTime(deadline);
++++
++++  if (diffDays < 0) return 'Vencida';
++++  if (diffDays === 0) return `Hoy · ${time}`;
++++  if (diffDays === 1) return `Mañana · ${time}`;
++++  return `En ${diffDays} días`;
++++}
++++
++++function getClassStatus(nextClass) {
++++  if (!nextClass) return '';
++++  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
++++
++++  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
+++     return `En ${nextClass.minutosRestantes} min`;
+++   }
+++ 
+++-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
++++  if (nextClass.esHoy) {
++++    return start;
++++  }
++++
++++  return `${nextClass.dia || 'Próxima'} · ${start}`;
+++ }
+++ 
+++-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
++++function getSyncPresentation(syncState = {}) {
++++  if (syncState.status === 'syncing') {
++++    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
++++  }
++++
++++  if (syncState.status === 'done') {
++++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++++  }
++++
++++  if (syncState.status === 'error') {
++++    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
++++  }
++++
++++  if (syncState.lastSync) {
++++    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
++++  }
++++
++++  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
++++}
++++
++++function Sidebar({
++++  activePage,
++++  activities = [],
++++  calendarCount = 0,
++++  diasConClases = [],
++++  errorHorario = '',
++++  hasFinales = false,
++++  horario = [],
++++  horarioData = null,
++++  onNavigate,
++++  onSyncAll,
++++  proximaEntrega = null,
++++  settingsData = {},
++++  studentName = '',
++++  syncState = { status: 'idle', lastSync: null },
++++}) {
+++   const [nextClass, setNextClass] = useState(null);
+++-  const visibleNavigationItems = navigationItems.filter(
+++-    (item) => item.id !== 'calificaciones' || hasFinales === true,
+++-  );
+++-  const hasHorario = Array.isArray(horario) && horario.length > 0;
++++  const materiasHorario = Array.isArray(horarioData?.materias)
++++    ? horarioData.materias
++++    : (Array.isArray(horario) ? horario : []);
++++  const pendingCount = activities.filter(
++++    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
++++  ).length;
++++  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
++++  const hasHorario = materiasHorario.length > 0;
++++  const syncInfo = getSyncPresentation(syncState);
++++  const SyncIcon = syncInfo.Icon;
++++  const userId = settingsData?.ciaUser || settingsData?.user || '';
++++  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
++++  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
++++  const initials = getInitials(hasRealStudentName ? studentName : userId);
+++ 
+++   useEffect(() => {
+++-    if (!hasHorario) {
+++-      setNextClass(null);
+++-      return undefined;
+++-    }
+++-
+++     const updateNextClass = () => {
+++-      setNextClass(getNextClass(horario, diasConClases));
++++      setNextClass(getNextClass(materiasHorario, diasConClases));
+++     };
+++ 
+++     updateNextClass();
+++     const intervalId = setInterval(updateNextClass, 60 * 1000);
+++ 
+++     return () => clearInterval(intervalId);
+++-  }, [hasHorario, horario, diasConClases]);
++++  }, [materiasHorario, diasConClases]);
++++
++++  const navItems = useMemo(() => NAV_ITEMS, []);
++++
++++  const getBadge = (itemId) => {
++++    if (itemId === 'activities' && pendingCount > 0) {
++++      return (
++++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
++++          {pendingCount}
++++        </span>
++++      );
++++    }
++++
++++    if (itemId === 'calendario' && Number(calendarCount) > 0) {
++++      return (
++++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
++++          {calendarCount}
++++        </span>
++++      );
++++    }
++++
++++    if (itemId === 'horario') {
++++      if (errorHorario) {
++++        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
++++      }
++++      if (hasHorario) {
++++        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
++++      }
++++    }
+++ 
+++-  const handleOpenMeetLink = () => {
+++-    if (!nextClass?.meetLink) {
+++-      return;
++++    if (itemId === 'notifications' && delayedCount > 0) {
++++      return (
++++        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
++++          {delayedCount}
++++        </span>
++++      );
+++     }
+++ 
+++-    window.scraperApp?.openExternal?.(nextClass.meetLink);
++++    return null;
+++   };
+++ 
++++  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
++++
+++   return (
+++     <aside
+++-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
++++      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto rounded-3xl border shadow-2xl shadow-slate-950/40"
+++       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
+++     >
+++-      <div className="mb-8">
++++      <header className="px-4 pb-3.5 pt-4">
+++         <div className="flex items-center gap-3">
+++-          <span
+++-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
+++-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
+++-          >
+++-            <img
+++-              src={dvpotroLogo}
+++-              alt="DVPotro"
+++-              className="h-full w-full object-contain"
+++-              draggable="false"
+++-            />
+++-          </span>
++++          <img
++++            src={dvpotroLogo}
++++            alt="DVPotro"
++++            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
++++            draggable="false"
++++          />
+++           <div className="min-w-0">
+++-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
++++            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
+++               DVPotro
+++             </p>
+++-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
++++            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
+++               ITSON
+++             </p>
+++           </div>
+++         </div>
+++-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
+++-          Academic command center
+++-        </p>
+++-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
+++-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
+++-        </p>
+++-      </div>
++++      </header>
+++ 
+++-      <nav className="space-y-2">
+++-        {visibleNavigationItems.map((item) => {
+++-          const isActive = item.id === activePage;
++++      <nav className="px-2 pb-2">
++++        {navItems.map((item) => {
+++           const Icon = item.icon;
++++          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
++++          const badge = getBadge(item.id);
+++ 
+++           return (
+++             <button
+++               key={item.id}
+++               type="button"
+++-              onClick={() => onNavigate(item.id)}
+++-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
+++-                isActive
+++-                  ? ''
+++-                  : ''
+++-              }`}
++++              onClick={() => onNavigate?.(item.target)}
++++              className="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[9px] text-left text-sm transition duration-150"
+++               style={
+++                 isActive
+++-                  ? { background: 'var(--accent)', color: '#fff' }
+++-                  : {
+++-                    background: 'var(--bg-secondary)',
+++-                    color: 'var(--text-muted)',
+++-                  }
++++                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
++++                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
+++               }
+++               onMouseEnter={(event) => {
+++                 if (!isActive) {
+++-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
++++                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
+++                   event.currentTarget.style.color = 'var(--text-strong)';
+++                 }
+++               }}
+++               onMouseLeave={(event) => {
+++                 if (!isActive) {
+++-                  event.currentTarget.style.background = 'var(--bg-secondary)';
++++                  event.currentTarget.style.background = 'transparent';
+++                   event.currentTarget.style.color = 'var(--text-muted)';
+++                 }
+++               }}
+++             >
+++-              <span className="flex items-center gap-3">
+++-                <Icon className="h-4 w-4" />
+++-                {item.label}
+++-              </span>
+++-              <span
+++-                className="text-xs uppercase tracking-[0.25em]"
+++-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
+++-              >
+++-                {isActive ? 'Live' : 'Idle'}
++++              <span className="flex min-w-0 items-center gap-3">
++++                <Icon className="h-4 w-4 shrink-0" />
++++                <span className="truncate">{item.label}</span>
+++               </span>
++++              {badge}
+++             </button>
+++           );
+++         })}
+++       </nav>
+++ 
+++-      {hasHorario ? (
+++-        <div
+++-          className="mt-auto border-t pt-4"
+++-          style={{ borderColor: 'var(--border-subtle)' }}
++++      <section
++++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
++++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++++      >
++++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++++          Sincronización
++++        </p>
++++        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
++++          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
++++          <span className="font-medium">{syncInfo.text}</span>
++++        </div>
++++        {syncTimestamp ? (
++++          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++++            Última sincronización · {syncTimestamp}
++++          </p>
++++        ) : null}
++++        <button
++++          type="button"
++++          onClick={onSyncAll}
++++          disabled={syncState.status === 'syncing'}
++++          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed"
++++          style={
++++            syncState.status === 'syncing'
++++              ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
++++              : { background: 'var(--itson-blue, var(--accent))' }
++++          }
+++         >
+++-          <div
+++-            className="rounded-2xl border p-3"
+++-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
+++-          >
+++-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
+++-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
+++-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
++++          {syncState.status === 'syncing' ? (
++++            <Loader2 className="h-3.5 w-3.5 animate-spin" />
++++          ) : (
++++            <RefreshCw className="h-3.5 w-3.5" />
++++          )}
++++          Sincronizar todo
++++        </button>
++++        <p className="mt-2 text-center text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
++++          Actualiza toda la información de la app
++++        </p>
++++      </section>
++++
++++      <section
++++        className="mx-2.5 my-1.5 rounded-xl border px-3.5 py-3"
++++        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
++++      >
++++        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
++++          HOY · {formatDayShort(new Date())}
++++        </p>
++++
++++        <div className="mt-3">
++++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
++++            Entrega
++++          </p>
++++          {proximaEntrega ? (
++++            <div className="mt-1 min-w-0">
++++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
++++                {proximaEntrega.nombre}
++++              </p>
++++              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
++++                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
++++              </p>
+++             </div>
++++          ) : (
++++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
++++          )}
++++        </div>
+++ 
+++-            {nextClass ? (
+++-              <div className="space-y-2">
+++-                <div className="flex items-start justify-between gap-2">
+++-                  <div className="min-w-0">
+++-                    <p
+++-                      className="truncate text-sm font-medium"
+++-                      style={{ color: 'var(--text-strong)' }}
+++-                      title={nextClass.materia}
+++-                    >
+++-                      {nextClass.materia}
+++-                    </p>
+++-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
+++-                      {nextClass.hora} · {nextClass.salon}
+++-                    </p>
+++-                  </div>
+++-
+++-                  {nextClass.meetLink ? (
+++-                    <button
+++-                      type="button"
+++-                      onClick={handleOpenMeetLink}
+++-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
+++-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
+++-                      title="Abrir videollamada"
+++-                    >
+++-                      <ExternalLink className="h-3.5 w-3.5" />
+++-                    </button>
+++-                  ) : null}
+++-                </div>
++++        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
+++ 
++++        <div>
++++          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
++++            Clase
++++          </p>
++++          {nextClass ? (
++++            <div className="mt-1 min-w-0">
++++              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
++++                {nextClass.materia}
++++              </p>
++++              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
++++                <span className="truncate">{nextClass.hora}</span>
+++                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
+++                   <span
+++-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
+++-                    style={{
+++-                      background: 'var(--retrasada-bg)',
+++-                      borderColor: 'var(--retrasada-border)',
+++-                      color: 'var(--retrasada-text)',
+++-                    }}
++++                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
++++                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
+++                   >
+++-                    {getNextClassStatus(nextClass)}
++++                    {getClassStatus(nextClass)}
+++                   </span>
+++                 ) : (
+++-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+++-                    {getNextClassStatus(nextClass)}
+++-                  </p>
++++                  <span className="truncate">· {getClassStatus(nextClass)}</span>
+++                 )}
+++               </div>
+++-            ) : (
+++-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
+++-                Sin clases próximas
+++-              </p>
+++-            )}
+++-          </div>
++++            </div>
++++          ) : (
++++            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
++++          )}
++++        </div>
++++      </section>
++++
++++      <footer
++++        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2.5"
++++        style={{ borderColor: 'var(--border)' }}
++++      >
++++        <div
++++          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
++++          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
++++        >
++++          {initials}
++++        </div>
++++        <div className="min-w-0">
++++          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
++++            {profileName}
++++          </p>
++++          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
++++            {userId || 'Sin ID configurado'}
++++          </p>
+++         </div>
+++-      ) : null}
++++      </footer>
+++     </aside>
+++   );
+++ }
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + static Sidebar 065 checks + dist logo asset size check
+++**Comando de verificación:** npm run build; node sidebar 065 verification; Get-ChildItem dist/assets *dvpotro-logo*
+++**Output de verificación:**
+++```
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1767 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-Ca1fa4Ne.css             30.90 kB │ gzip:  6.64 kB
+++dist/assets/index-QZV1bNHo.js              305.89 kB │ gzip: 83.92 kB
+++✓ built in 8.70s
+++The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
+++
+++sidebar 065 verification OK: small logo, hasFinales CIA guard, safe defaults
+++
+++Dist logo assets:
+++dvpotro-logo-128-BsNSF5CX.png 9179 bytes
+++
+++Confirmed:
+++- Sidebar imports dvpotro-logo-128.png, not full-res dvpotro-logo.png.
+++- Dist logo asset is under 20KB.
+++- handleSyncAll only adds runCIA when hasFinales is true.
+++- Sidebar defaults protect activities=[], horarioData=null, proximaEntrega=null, syncState.lastSync=null.
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `src/App.jsx`
++```diff
++diff --git a/src/App.jsx b/src/App.jsx
++index 137c482..c6f5d3e 100644
++--- a/src/App.jsx
+++++ b/src/App.jsx
++@@ -1,12 +1,13 @@
++-import { useCallback, useEffect, useRef, useState } from 'react';
+++import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
++ import Sidebar from './components/Sidebar';
++ import Onboarding from './components/Onboarding';
++ import TaskPanel from './components/TaskPanel';
++ import Actividades from './pages/Actividades';
++ import Horario from './pages/Horario';
+++import Calendario from './pages/Calendario';
++ import Calificaciones from './pages/Calificaciones';
++ import Ajustes from './pages/Ajustes';
++-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+++import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
++ 
++ const pageRegistry = {
++   activities: {
++@@ -19,6 +20,11 @@ const pageRegistry = {
++     description: 'Visualiza clases del semestre y enlaces de videollamada para materias en línea.',
++     component: Horario,
++   },
+++  calendario: {
+++    title: 'Calendario Escolar',
+++    description: 'Consulta fechas académicas oficiales publicadas por ITSON.',
+++    component: Calendario,
+++  },
++   calificaciones: {
++     title: 'Calificaciones',
++     description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
++@@ -40,11 +46,13 @@ function App() {
++   const [settingsReady, setSettingsReady] = useState(false);
++   const [activities, setActivities] = useState([]);
++   const [horario, setHorario] = useState({ materias: [], diasConClases: [] });
+++  const [calendarData, setCalendarData] = useState({ events: [], timestamp: null, error: null });
++   const [calificaciones, setCalificaciones] = useState([]);
++   const [loading, setLoading] = useState(false);
++   const [loadingHorario, setLoadingHorario] = useState(false);
+++  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
++   const [loadingCIA, setLoadingCIA] = useState(false);
++-  const [syncingAll, setSyncingAll] = useState(false);
+++  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
++   const [syncingModules, setSyncingModules] = useState([]);
++   const [error, setError] = useState('');
++   const [errorHorario, setErrorHorario] = useState('');
++@@ -57,8 +65,10 @@ function App() {
++   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
++   const [actividadesCargado, setActividadesCargado] = useState(false);
++   const [horarioCargado, setHorarioCargado] = useState(false);
+++  const [calendarCargado, setCalendarCargado] = useState(false);
++   const [ciaCargado, setCiaCargado] = useState(false);
++   const [studentName, setStudentName] = useState('');
+++  const [settingsData, setSettingsData] = useState({});
++ 
++   const initializedRef = useRef(false);
++   const nearExpiryRefreshLaunchedRef = useRef(false);
++@@ -75,6 +85,30 @@ function App() {
++           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
++       ),
++   );
+++  const proximaEntrega = useMemo(() => {
+++    const pending = (activities || []).filter(
+++      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+++    );
+++
+++    if (!pending.length) {
+++      return null;
+++    }
+++
+++    return [...pending].sort((left, right) => {
+++      if (!left.fechaLimite) return 1;
+++      if (!right.fechaLimite) return -1;
+++      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+++    })[0];
+++  }, [activities]);
+++  const calendarCount = useMemo(() => {
+++    const now = Date.now();
+++    const in30 = now + 30 * 24 * 60 * 60 * 1000;
+++
+++    return (calendarData.events || []).filter((event) => {
+++      const time = new Date(event.inicio).getTime();
+++      return Number.isFinite(time) && time >= now && time <= in30;
+++    }).length;
+++  }, [calendarData]);
++ 
++   const addSyncingModule = (moduleId) => {
++     setSyncingModules((previous) => {
++@@ -135,6 +169,9 @@ function App() {
++       horario: 'horario',
++       calificaciones: 'calificaciones',
++       ajustes: 'settings',
+++      calendario: 'calendario',
+++      notifications: 'activities',
+++      notificaciones: 'activities',
++     };
++ 
++     const nextPage = pageAliases[pageId] || pageId;
++@@ -156,17 +193,21 @@ function App() {
++ 
++     try {
++       const settings = await api.getSettings();
+++      setSettingsData(settings || {});
++       const hasUser = Boolean(settings?.user?.trim());
++       const hasPassword = Boolean(settings?.hasPassword);
++-      const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+++      const preferredIdentity =
+++        settings?.studentName?.trim() || settings?.ciaUser?.trim() || settings?.user?.trim() || '';
++       setStudentName(formatStudentDisplayName(preferredIdentity));
++       setShowOnboarding(!(hasUser || hasPassword));
++       setActividadesCargado(false);
++       setHorarioCargado(false);
+++      setCalendarCargado(false);
++       setCiaCargado(false);
++       initializedRef.current = false;
++       nearExpiryRefreshLaunchedRef.current = false;
++     } catch (_error) {
+++      setSettingsData({});
++       setStudentName('');
++       setShowOnboarding(false);
++     } finally {
++@@ -429,51 +470,175 @@ function App() {
++     }
++   };
++ 
+++  const loadCalendar = async ({ clearCacheFirst = false, silent = false } = {}) => {
+++    if (silent) {
+++      addSyncingModule('calendario');
+++    } else {
+++      setIsCalendarSyncing(true);
+++    }
+++
+++    try {
+++      if (!api?.runCalendario) {
+++        if (!silent) {
+++          setCalendarData({
+++            events: [],
+++            timestamp: null,
+++            error: 'DVPotro debe ejecutarse dentro de Electron.',
+++          });
+++        }
+++        return;
+++      }
+++
+++      if (clearCacheFirst && api.clearCalendarioCache) {
+++        await api.clearCalendarioCache();
+++      }
+++
+++      const result = await api.runCalendario();
+++
+++      if (result?.error) {
+++        setCalendarData({ events: [], timestamp: null, error: result.error });
+++        return;
+++      }
+++
+++      setCalendarData({
+++        events: Array.isArray(result?.events) ? result.events : [],
+++        timestamp: result?.timestamp || null,
+++        error: null,
+++      });
+++    } catch (error) {
+++      setCalendarData({
+++        events: [],
+++        timestamp: null,
+++        error: error?.message || 'No fue posible cargar el calendario escolar.',
+++      });
+++    } finally {
+++      if (silent) {
+++        removeSyncingModule('calendario');
+++      } else {
+++        setIsCalendarSyncing(false);
+++      }
+++    }
+++  };
+++
++   const handleSyncAll = async () => {
++-    if (!api?.syncAll) {
+++    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+++
+++    if (syncState.status === 'syncing' || !scraperApi) {
++       return;
++     }
++ 
++-    setSyncingAll(true);
+++    setSyncState((current) => ({ ...current, status: 'syncing' }));
++     addSyncingModule('activities');
++     addSyncingModule('horario');
++-    addSyncingModule('calificaciones');
+++    addSyncingModule('calendario');
+++    if (hasFinales) {
+++      addSyncingModule('calificaciones');
+++    }
++ 
++     try {
++-      const result = await api.syncAll();
+++      const calls = [
+++        { id: 'activities', promise: scraperApi.runScraper?.() },
+++        { id: 'horario', promise: scraperApi.runHorario?.() },
+++        { id: 'calendario', promise: scraperApi.runCalendario?.() },
+++      ];
+++
+++      if (hasFinales) {
+++        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
+++      }
+++
+++      const results = await Promise.allSettled(calls.map((call) => call.promise));
+++      let hasErrors = false;
+++
+++      results.forEach((result, index) => {
+++        const moduleId = calls[index]?.id;
++ 
++-      if (result?.actividades?.activities) {
++-        setActivities(result.actividades.activities);
++-        if (result.actividades?.timestamp) {
++-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+++        if (result.status === 'rejected') {
+++          hasErrors = true;
+++          return;
++         }
++-      }
++ 
++-      if (result?.horario?.materias) {
++-        setHorario({
++-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
++-          diasConClases: Array.isArray(result.horario.diasConClases)
++-            ? result.horario.diasConClases
++-            : [],
++-        });
++-        if (result.horario?.timestamp) {
++-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+++        const response = result.value;
+++
+++        if (response?.error) {
+++          hasErrors = true;
+++
+++          if (moduleId === 'activities') {
+++            setErrorCode(response.error);
+++            setError(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'horario') {
+++            setErrorHorario(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          if (moduleId === 'calendario') {
+++            setCalendarData({ events: [], timestamp: null, error: response.error });
+++          }
+++
+++          if (moduleId === 'calificaciones') {
+++            setErrorCIACode(response.error);
+++            setErrorCIA(getFriendlyIVirtualError(response.error));
+++          }
+++
+++          return;
++         }
++-      }
++ 
++-      if (result?.calificaciones?.materias) {
++-        setCalificaciones(result.calificaciones.materias);
++-        if (result.calificaciones?.timestamp) {
++-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+++        if (moduleId === 'activities') {
+++          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+++          setActivities(activitiesList);
+++          setError('');
+++          setErrorCode('');
+++          if (response?.timestamp) {
+++            setLastSyncAt(new Date(response.timestamp).toISOString());
+++          }
++         }
++-      }
+++
+++        if (moduleId === 'horario') {
+++          setHorario({
+++            materias: Array.isArray(response?.materias) ? response.materias : [],
+++            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+++          });
+++          setErrorHorario('');
+++          if (response?.timestamp) {
+++            setLastSyncHorario(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++
+++        if (moduleId === 'calendario') {
+++          setCalendarData({
+++            events: Array.isArray(response?.events) ? response.events : [],
+++            timestamp: response?.timestamp || null,
+++            error: null,
+++          });
+++        }
+++
+++        if (moduleId === 'calificaciones') {
+++          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+++          setCalificaciones(materiasList);
+++          setErrorCIA('');
+++          setErrorCIACode('');
+++          if (response?.timestamp) {
+++            setLastSyncCIA(new Date(response.timestamp).toISOString());
+++          }
+++        }
+++      });
+++
+++      const nextStatus = hasErrors ? 'error' : 'done';
+++      setSyncState({ status: nextStatus, lastSync: new Date() });
+++      setTimeout(
+++        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+++        hasErrors ? 4000 : 3000,
+++      );
++     } catch (_error) {
++-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+++      setSyncState((current) => ({ ...current, status: 'error' }));
+++      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
++     } finally {
++       removeSyncingModule('activities');
++       removeSyncingModule('horario');
++-      removeSyncingModule('calificaciones');
++-      setSyncingAll(false);
+++      removeSyncingModule('calendario');
+++      if (hasFinales) {
+++        removeSyncingModule('calificaciones');
+++      }
++     }
++   };
++ 
++@@ -520,6 +685,13 @@ function App() {
++     }
++   }, [activePage, horarioCargado]);
++ 
+++  useEffect(() => {
+++    if (activePage === 'calendario' && !calendarCargado) {
+++      setCalendarCargado(true);
+++      loadCalendar({ silent: true });
+++    }
+++  }, [activePage, calendarCargado]);
+++
++   useEffect(() => {
++     if (activePage === 'calificaciones' && !ciaCargado) {
++       setCiaCargado(true);
++@@ -556,10 +728,19 @@ function App() {
++       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
++         <Sidebar
++           activePage={activePage}
+++          activities={activities}
+++          calendarCount={calendarCount}
++           diasConClases={horario?.diasConClases ?? []}
+++          errorHorario={errorHorario}
++           hasFinales={hasFinales}
++           horario={horario?.materias ?? []}
+++          horarioData={horario}
+++          onSyncAll={handleSyncAll}
++           onNavigate={handleNavigate}
+++          proximaEntrega={proximaEntrega}
+++          settingsData={settingsData}
+++          studentName={studentName}
+++          syncState={syncState}
++         />
++         {!settingsReady ? (
++           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
++@@ -589,6 +770,7 @@ function App() {
++           <TaskPanel title={pageConfig.title} description={pageConfig.description}>
++             <ActivePage
++               activities={activities}
+++              calendarData={calendarData}
++               calificaciones={calificaciones}
++               horario={horario}
++               errorCIA={errorCIA}
++@@ -599,11 +781,16 @@ function App() {
++               lastSyncCIA={lastSyncCIA}
++               lastSyncAt={lastSyncAt}
++               lastSyncHorario={lastSyncHorario}
+++              isSyncing={isCalendarSyncing}
++               loadingCIA={loadingCIA}
++               loadingHorario={loadingHorario}

... [DIFF TRUNCADO — archivo muy grande, ver git diff completo] ...
```

### `reports/report_068_calendario.png`
```diff
diff --git a/reports/report_068_calendario.png b/reports/report_068_calendario.png
new file mode 100644
index 0000000..8743587
Binary files /dev/null and b/reports/report_068_calendario.png differ
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index 137c482..aa2c9c2 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,12 +1,13 @@
-import { useCallback, useEffect, useRef, useState } from 'react';
+import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
 import Sidebar from './components/Sidebar';
 import Onboarding from './components/Onboarding';
 import TaskPanel from './components/TaskPanel';
 import Actividades from './pages/Actividades';
 import Horario from './pages/Horario';
+import Calendario from './pages/Calendario';
 import Calificaciones from './pages/Calificaciones';
 import Ajustes from './pages/Ajustes';
-import dvpotroLogo from './assets/branding/dvpotro-logo.png';
+import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
 
 const pageRegistry = {
   activities: {
@@ -19,6 +20,11 @@ const pageRegistry = {
     description: 'Visualiza clases del semestre y enlaces de videollamada para materias en línea.',
     component: Horario,
   },
+  calendario: {
+    title: 'Calendario Escolar',
+    description: 'Consulta fechas académicas oficiales publicadas por ITSON.',
+    component: Calendario,
+  },
   calificaciones: {
     title: 'Calificaciones',
     description: 'Revisa las calificaciones del CIA ITSON con credenciales separadas.',
@@ -40,11 +46,13 @@ function App() {
   const [settingsReady, setSettingsReady] = useState(false);
   const [activities, setActivities] = useState([]);
   const [horario, setHorario] = useState({ materias: [], diasConClases: [] });
+  const [calendarData, setCalendarData] = useState({ events: [], calendarTypes: [], timestamp: null, error: null });
   const [calificaciones, setCalificaciones] = useState([]);
   const [loading, setLoading] = useState(false);
   const [loadingHorario, setLoadingHorario] = useState(false);
+  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
   const [loadingCIA, setLoadingCIA] = useState(false);
-  const [syncingAll, setSyncingAll] = useState(false);
+  const [syncState, setSyncState] = useState({ status: 'idle', lastSync: null });
   const [syncingModules, setSyncingModules] = useState([]);
   const [error, setError] = useState('');
   const [errorHorario, setErrorHorario] = useState('');
@@ -57,8 +65,10 @@ function App() {
   const [progress, setProgress] = useState({ current: 0, total: 0, curso: '' });
   const [actividadesCargado, setActividadesCargado] = useState(false);
   const [horarioCargado, setHorarioCargado] = useState(false);
+  const [calendarCargado, setCalendarCargado] = useState(false);
   const [ciaCargado, setCiaCargado] = useState(false);
   const [studentName, setStudentName] = useState('');
+  const [settingsData, setSettingsData] = useState({});
 
   const initializedRef = useRef(false);
   const nearExpiryRefreshLaunchedRef = useRef(false);
@@ -75,6 +85,30 @@ function App() {
           calificacion.parcial === 'Final' && calificacion.calificacion !== null,
       ),
   );
+  const proximaEntrega = useMemo(() => {
+    const pending = (activities || []).filter(
+      (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+    );
+
+    if (!pending.length) {
+      return null;
+    }
+
+    return [...pending].sort((left, right) => {
+      if (!left.fechaLimite) return 1;
+      if (!right.fechaLimite) return -1;
+      return new Date(left.fechaLimite) - new Date(right.fechaLimite);
+    })[0];
+  }, [activities]);
+  const calendarCount = useMemo(() => {
+    const now = Date.now();
+    const in30 = now + 30 * 24 * 60 * 60 * 1000;
+
+    return (calendarData.events || []).filter((event) => {
+      const time = new Date(event.inicio).getTime();
+      return Number.isFinite(time) && time >= now && time <= in30;
+    }).length;
+  }, [calendarData]);
 
   const addSyncingModule = (moduleId) => {
     setSyncingModules((previous) => {
@@ -135,6 +169,9 @@ function App() {
       horario: 'horario',
       calificaciones: 'calificaciones',
       ajustes: 'settings',
+      calendario: 'calendario',
+      notifications: 'activities',
+      notificaciones: 'activities',
     };
 
     const nextPage = pageAliases[pageId] || pageId;
@@ -156,17 +193,21 @@ function App() {
 
     try {
       const settings = await api.getSettings();
+      setSettingsData(settings || {});
       const hasUser = Boolean(settings?.user?.trim());
       const hasPassword = Boolean(settings?.hasPassword);
-      const preferredIdentity = settings?.ciaUser?.trim() || settings?.user?.trim() || '';
+      const preferredIdentity =
+        settings?.studentName?.trim() || settings?.ciaUser?.trim() || settings?.user?.trim() || '';
       setStudentName(formatStudentDisplayName(preferredIdentity));
       setShowOnboarding(!(hasUser || hasPassword));
       setActividadesCargado(false);
       setHorarioCargado(false);
+      setCalendarCargado(false);
       setCiaCargado(false);
       initializedRef.current = false;
       nearExpiryRefreshLaunchedRef.current = false;
     } catch (_error) {
+      setSettingsData({});
       setStudentName('');
       setShowOnboarding(false);
     } finally {
@@ -429,51 +470,204 @@ function App() {
     }
   };
 
+  const loadCalendar = async (options = {}) => {
+    const normalizedOptions = typeof options === 'string' ? { calendarType: options } : options || {};
+    const { clearCacheFirst = false, silent = false } = normalizedOptions;
+    const savedCalendarType = (() => {
+      try {
+        return typeof window !== 'undefined' ? window.localStorage.getItem('dvpotro-cal-type') : null;
+      } catch (_error) {
+        return null;
+      }
+    })();
+    const calendarType =
+      normalizedOptions.calendarType ||
+      calendarData.calendarType ||
+      savedCalendarType ||
+      'Profesional Asociado y Licenciatura';
+
+    if (silent) {
+      addSyncingModule('calendario');
+    } else {
+      setIsCalendarSyncing(true);
+    }
+
+    try {
+      if (!api?.runCalendario) {
+        if (!silent) {
+          setCalendarData({
+            events: [],
+            calendarTypes: [],
+            calendarType,
+            timestamp: null,
+            error: 'DVPotro debe ejecutarse dentro de Electron.',
+          });
+        }
+        return;
+      }
+
+      if (clearCacheFirst && api.clearCalendarioCache) {
+        await api.clearCalendarioCache();
+      }
+
+      const result = await api.runCalendario({ calendarType });
+
+      if (result?.error) {
+        setCalendarData({
+          events: [],
+          calendarTypes: Array.isArray(calendarData.calendarTypes) ? calendarData.calendarTypes : [],
+          calendarType,
+          timestamp: null,
+          error: result.error,
+        });
+        return;
+      }
+
+      setCalendarData({
+        events: Array.isArray(result?.events) ? result.events : [],
+        calendarTypes: Array.isArray(result?.calendarTypes) ? result.calendarTypes : [],
+        calendarType: result?.calendarType || calendarType,
+        timestamp: result?.timestamp || null,
+        error: null,
+      });
+    } catch (error) {
+      setCalendarData({
+        events: [],
+        calendarTypes: Array.isArray(calendarData.calendarTypes) ? calendarData.calendarTypes : [],
+        calendarType,
+        timestamp: null,
+        error: error?.message || 'No fue posible cargar el calendario escolar.',
+      });
+    } finally {
+      if (silent) {
+        removeSyncingModule('calendario');
+      } else {
+        setIsCalendarSyncing(false);
+      }
+    }
+  };
+
   const handleSyncAll = async () => {
-    if (!api?.syncAll) {
+    const scraperApi = typeof window !== 'undefined' ? window.scraperApp : api;
+
+    if (syncState.status === 'syncing' || !scraperApi) {
       return;
     }
 
-    setSyncingAll(true);
+    setSyncState((current) => ({ ...current, status: 'syncing' }));
     addSyncingModule('activities');
     addSyncingModule('horario');
-    addSyncingModule('calificaciones');
+    addSyncingModule('calendario');
+    if (hasFinales) {
+      addSyncingModule('calificaciones');
+    }
 
     try {
-      const result = await api.syncAll();
+      const calls = [
+        { id: 'activities', promise: scraperApi.runScraper?.() },
+        { id: 'horario', promise: scraperApi.runHorario?.() },
+        { id: 'calendario', promise: scraperApi.runCalendario?.({}) },
+      ];
+
+      if (hasFinales) {
+        calls.push({ id: 'calificaciones', promise: scraperApi.runCIA?.() });
+      }
+
+      const results = await Promise.allSettled(calls.map((call) => call.promise));
+      let hasErrors = false;
 
-      if (result?.actividades?.activities) {
-        setActivities(result.actividades.activities);
-        if (result.actividades?.timestamp) {
-          setLastSyncAt(new Date(result.actividades.timestamp).toISOString());
+      results.forEach((result, index) => {
+        const moduleId = calls[index]?.id;
+
+        if (result.status === 'rejected') {
+          hasErrors = true;
+          return;
         }
-      }
 
-      if (result?.horario?.materias) {
-        setHorario({
-          materias: Array.isArray(result.horario.materias) ? result.horario.materias : [],
-          diasConClases: Array.isArray(result.horario.diasConClases)
-            ? result.horario.diasConClases
-            : [],
-        });
-        if (result.horario?.timestamp) {
-          setLastSyncHorario(new Date(result.horario.timestamp).toISOString());
+        const response = result.value;
+
+        if (response?.error) {
+          hasErrors = true;
+
+          if (moduleId === 'activities') {
+            setErrorCode(response.error);
+            setError(getFriendlyIVirtualError(response.error));
+          }
+
+          if (moduleId === 'horario') {
+            setErrorHorario(getFriendlyIVirtualError(response.error));
+          }
+
+          if (moduleId === 'calendario') {
+            setCalendarData({ events: [], calendarTypes: [], timestamp: null, error: response.error });
+          }
+
+          if (moduleId === 'calificaciones') {
+            setErrorCIACode(response.error);
+            setErrorCIA(getFriendlyIVirtualError(response.error));
+          }
+
+          return;
+        }
+
+        if (moduleId === 'activities') {
+          const activitiesList = Array.isArray(response?.activities) ? response.activities : [];
+          setActivities(activitiesList);
+          setError('');
+          setErrorCode('');
+          if (response?.timestamp) {
+            setLastSyncAt(new Date(response.timestamp).toISOString());
+          }
         }
-      }
 
-      if (result?.calificaciones?.materias) {
-        setCalificaciones(result.calificaciones.materias);
-        if (result.calificaciones?.timestamp) {
-          setLastSyncCIA(new Date(result.calificaciones.timestamp).toISOString());
+        if (moduleId === 'horario') {
+          setHorario({
+            materias: Array.isArray(response?.materias) ? response.materias : [],
+            diasConClases: Array.isArray(response?.diasConClases) ? response.diasConClases : [],
+          });
+          setErrorHorario('');
+          if (response?.timestamp) {
+            setLastSyncHorario(new Date(response.timestamp).toISOString());
+          }
         }
-      }
+
+        if (moduleId === 'calendario') {
+          setCalendarData({
+            events: Array.isArray(response?.events) ? response.events : [],
+            calendarTypes: Array.isArray(response?.calendarTypes) ? response.calendarTypes : [],
+            calendarType: response?.calendarType || 'Profesional Asociado y Licenciatura',
+            timestamp: response?.timestamp || null,
+            error: null,
+          });
+        }
+
+        if (moduleId === 'calificaciones') {
+          const materiasList = Array.isArray(response?.materias) ? response.materias : [];
+          setCalificaciones(materiasList);
+          setErrorCIA('');
+          setErrorCIACode('');
+          if (response?.timestamp) {
+            setLastSyncCIA(new Date(response.timestamp).toISOString());
+          }
+        }
+      });
+
+      const nextStatus = hasErrors ? 'error' : 'done';
+      setSyncState({ status: nextStatus, lastSync: new Date() });
+      setTimeout(
+        () => setSyncState((current) => ({ ...current, status: 'idle' })),
+        hasErrors ? 4000 : 3000,
+      );
     } catch (_error) {
-      // Fallo silencioso: cada módulo maneja sus errores individualmente.
+      setSyncState((current) => ({ ...current, status: 'error' }));
+      setTimeout(() => setSyncState((current) => ({ ...current, status: 'idle' })), 4000);
     } finally {
       removeSyncingModule('activities');
       removeSyncingModule('horario');
-      removeSyncingModule('calificaciones');
-      setSyncingAll(false);
+      removeSyncingModule('calendario');
+      if (hasFinales) {
+        removeSyncingModule('calificaciones');
+      }
     }
   };
 
@@ -520,6 +714,13 @@ function App() {
     }
   }, [activePage, horarioCargado]);
 
+  useEffect(() => {
+    if (activePage === 'calendario' && !calendarCargado) {
+      setCalendarCargado(true);
+      loadCalendar({ silent: true });
+    }
+  }, [activePage, calendarCargado]);
+
   useEffect(() => {
     if (activePage === 'calificaciones' && !ciaCargado) {
       setCiaCargado(true);
@@ -556,10 +757,19 @@ function App() {
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
         <Sidebar
           activePage={activePage}
+          activities={activities}
+          calendarCount={calendarCount}
           diasConClases={horario?.diasConClases ?? []}
+          errorHorario={errorHorario}
           hasFinales={hasFinales}
           horario={horario?.materias ?? []}
+          horarioData={horario}
+          onSyncAll={handleSyncAll}
           onNavigate={handleNavigate}
+          proximaEntrega={proximaEntrega}
+          settingsData={settingsData}
+          studentName={studentName}
+          syncState={syncState}
         />
         {!settingsReady ? (
           <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
@@ -589,6 +799,7 @@ function App() {
           <TaskPanel title={pageConfig.title} description={pageConfig.description}>
             <ActivePage
               activities={activities}
+              calendarData={calendarData}
               calificaciones={calificaciones}
               horario={horario}
               errorCIA={errorCIA}
@@ -599,11 +810,12 @@ function App() {
               lastSyncCIA={lastSyncCIA}
               lastSyncAt={lastSyncAt}
               lastSyncHorario={lastSyncHorario}
+              isSyncing={isCalendarSyncing}
               loadingCIA={loadingCIA}
               loadingHorario={loadingHorario}
               loading={loading}
               onSettingsSaved={refreshSettings}
-              onSync={handleSyncActivities}
+              onSync={activePage === 'calendario' ? loadCalendar : handleSyncActivities}
               onSyncHorario={loadHorario}
               onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
               onNavigate={handleNavigate}
@@ -617,3 +829,4 @@ function App() {
 }
 
 export default App;
+
```

### `src/components/Onboarding.jsx`
```diff
diff --git a/src/components/Onboarding.jsx b/src/components/Onboarding.jsx
index 3e820a2..7bca3ac 100644
--- a/src/components/Onboarding.jsx
+++ b/src/components/Onboarding.jsx
@@ -1,5 +1,5 @@
 import { ArrowRight } from 'lucide-react';
-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
 
 function Onboarding({ onNavigate }) {
   return (
@@ -37,3 +37,4 @@ function Onboarding({ onNavigate }) {
 }
 
 export default Onboarding;
+
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index c7458cb..08722d0 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -1,216 +1,407 @@
-import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
-import { useEffect, useState } from 'react';
-import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
+import {
+  AlertCircle,
+  Bell,
+  BookOpen,
+  CalendarDays,
+  CheckCircle,
+  Clock,
+  Info,
+  Loader2,
+  Settings,
+} from 'lucide-react';
+import { useEffect, useMemo, useState } from 'react';
+import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
 import { getNextClass } from '../utils/horario.js';
 
-const navigationItems = [
-  { id: 'activities', label: 'Actividades', icon: ListChecks },
-  { id: 'horario', label: 'Horario', icon: Calendar },
-  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
-  { id: 'settings', label: 'Ajustes', icon: FolderCog },
+const NAV_ITEMS = [
+  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
+  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
+  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
+  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'activities' },
+  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
 ];
 
-function getNextClassStatus(nextClass) {
-  if (!nextClass) {
-    return '';
+function normDate(value) {
+  const date = value ? new Date(value) : null;
+  return date && !Number.isNaN(date.getTime()) ? date : null;
+}
+
+function formatDayShort(date = new Date()) {
+  return date.toLocaleDateString('es-MX', {
+    weekday: 'short',
+    day: 'numeric',
+    month: 'short',
+  });
+}
+
+function formatTime(date) {
+  return date.toLocaleTimeString('es-MX', {
+    hour: '2-digit',
+    minute: '2-digit',
+  });
+}
+
+function getInitials(str = '') {
+  const clean = String(str || '').trim();
+  const parts = clean.split(/\s+/).filter(Boolean);
+
+  if (parts.length >= 2) {
+    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
+  }
+
+  return clean.slice(0, 2).toUpperCase() || 'DV';
+}
+
+function formatDisplayName(str = '') {
+  const clean = String(str || '').trim();
+  const parts = clean.split(/\s+/).filter(Boolean);
+
+  if (/^ID\s+\w+/i.test(clean)) {
+    return clean;
   }
 
-  if (!nextClass.esHoy) {
-    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
+  if (parts.length >= 2) {
+    return `${parts[0]} ${parts[1][0]}.`;
   }
 
-  if (nextClass.minutosRestantes <= 30) {
+  return clean;
+}
+
+function formatRelativeDeadline(fechaLimite) {
+  const deadline = normDate(fechaLimite);
+
+  if (!deadline) {
+    return 'Fecha pendiente';
+  }
+
+  const now = new Date();
+  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
+  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
+  const diffDays = Math.round((target - today) / 86400000);
+  const time = formatTime(deadline);
+
+  if (diffDays < 0) return 'Vencida';
+  if (diffDays === 0) return `Hoy · ${time}`;
+  if (diffDays === 1) return `Mañana · ${time}`;
+  return `En ${diffDays} días`;
+}
+
+function getClassStatus(nextClass) {
+  if (!nextClass) return '';
+  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';
+
+  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
     return `En ${nextClass.minutosRestantes} min`;
   }
 
-  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
+  if (nextClass.esHoy) {
+    return start;
+  }
+
+  return `${nextClass.dia || 'Próxima'} · ${start}`;
 }
 
-function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
+function getSyncPresentation(syncState = {}) {
+  if (syncState.status === 'syncing') {
+    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
+  }
+
+  if (syncState.status === 'done') {
+    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+  }
+
+  if (syncState.status === 'error') {
+    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
+  }
+
+  if (syncState.lastSync) {
+    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
+  }
+
+  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
+}
+
+function Sidebar({
+  activePage,
+  activities = [],
+  calendarCount = 0,
+  diasConClases = [],
+  errorHorario = '',
+  hasFinales = false,
+  horario = [],
+  horarioData = null,
+  onNavigate,
+  onSyncAll,
+  proximaEntrega = null,
+  settingsData = {},
+  studentName = '',
+  syncState = { status: 'idle', lastSync: null },
+}) {
   const [nextClass, setNextClass] = useState(null);
-  const visibleNavigationItems = navigationItems.filter(
-    (item) => item.id !== 'calificaciones' || hasFinales === true,
-  );
-  const hasHorario = Array.isArray(horario) && horario.length > 0;
+  const materiasHorario = Array.isArray(horarioData?.materias)
+    ? horarioData.materias
+    : (Array.isArray(horario) ? horario : []);
+  const pendingCount = activities.filter(
+    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
+  ).length;
+  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
+  const hasHorario = materiasHorario.length > 0;
+  const syncInfo = getSyncPresentation(syncState);
+  const SyncIcon = syncInfo.Icon;
+  const userId = settingsData?.ciaUser || settingsData?.user || '';
+  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
+  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
+  const initials = getInitials(hasRealStudentName ? studentName : userId);
 
   useEffect(() => {
-    if (!hasHorario) {
-      setNextClass(null);
-      return undefined;
-    }
-
     const updateNextClass = () => {
-      setNextClass(getNextClass(horario, diasConClases));
+      setNextClass(getNextClass(materiasHorario, diasConClases));
     };
 
     updateNextClass();
     const intervalId = setInterval(updateNextClass, 60 * 1000);
 
     return () => clearInterval(intervalId);
-  }, [hasHorario, horario, diasConClases]);
+  }, [materiasHorario, diasConClases]);
+
+  const navItems = useMemo(() => NAV_ITEMS, []);
 
-  const handleOpenMeetLink = () => {
-    if (!nextClass?.meetLink) {
-      return;
+  const getBadge = (itemId) => {
+    if (itemId === 'activities' && pendingCount > 0) {
+      return (
+        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#006DB6' }}>
+          {pendingCount}
+        </span>
+      );
     }
 
-    window.scraperApp?.openExternal?.(nextClass.meetLink);
+    if (itemId === 'calendario' && Number(calendarCount) > 0) {
+      return (
+        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
+          {calendarCount}
+        </span>
+      );
+    }
+
+    if (itemId === 'horario') {
+      if (errorHorario) {
+        return <span className="h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />;
+      }
+      if (hasHorario) {
+        return <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />;
+      }
+    }
+
+    if (itemId === 'notifications' && delayedCount > 0) {
+      return (
+        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
+          {delayedCount}
+        </span>
+      );
+    }
+
+    return null;
   };
 
+  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
+  const syncLabel =
+    syncState.status === 'syncing'
+      ? 'Sincronizando...'
+      : syncState.status === 'done'
+        ? '✓ Actualizado'
+        : 'Sincronizar todo';
+  const LETTERS = 'SINCRONIZAR TODO'.split('');
+
   return (
     <aside
-      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-slate-950/40"
       style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
     >
-      <div className="mb-8">
+      <header className="px-4 pb-3 pt-3">
         <div className="flex items-center gap-3">
-          <span
-            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
-            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
-          >
-            <img
-              src={dvpotroLogo}
-              alt="DVPotro"
-              className="h-full w-full object-contain"
-              draggable="false"
-            />
-          </span>
+          <img
+            src={dvpotroLogo}
+            alt="DVPotro"
+            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-lg shadow-black/30"
+            draggable="false"
+          />
           <div className="min-w-0">
-            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
+            <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
               DVPotro
             </p>
-            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
+            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
               ITSON
             </p>
           </div>
         </div>
-        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
-          Academic command center
-        </p>
-        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
-          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
-        </p>
-      </div>
+      </header>
 
-      <nav className="space-y-2">
-        {visibleNavigationItems.map((item) => {
-          const isActive = item.id === activePage;
+      <nav className="px-2 pb-2">
+        {navItems.map((item) => {
           const Icon = item.icon;
+          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
+          const badge = getBadge(item.id);
 
           return (
             <button
               key={item.id}
               type="button"
-              onClick={() => onNavigate(item.id)}
-              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
-                isActive
-                  ? ''
-                  : ''
-              }`}
+              onClick={() => onNavigate?.(item.target)}
+              className="mb-0.5 flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-[7px] text-left text-sm transition duration-150"
               style={
                 isActive
-                  ? { background: 'var(--accent)', color: '#fff' }
-                  : {
-                    background: 'var(--bg-secondary)',
-                    color: 'var(--text-muted)',
-                  }
+                  ? { background: 'var(--itson-blue, var(--accent))', color: '#fff', fontWeight: 600 }
+                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500 }
               }
               onMouseEnter={(event) => {
                 if (!isActive) {
-                  event.currentTarget.style.background = 'var(--bg-tertiary)';
+                  event.currentTarget.style.background = 'var(--bg-hover, var(--bg-tertiary))';
                   event.currentTarget.style.color = 'var(--text-strong)';
                 }
               }}
               onMouseLeave={(event) => {
                 if (!isActive) {
-                  event.currentTarget.style.background = 'var(--bg-secondary)';
+                  event.currentTarget.style.background = 'transparent';
                   event.currentTarget.style.color = 'var(--text-muted)';
                 }
               }}
             >
-              <span className="flex items-center gap-3">
-                <Icon className="h-4 w-4" />
-                {item.label}
-              </span>
-              <span
-                className="text-xs uppercase tracking-[0.25em]"
-                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
-              >
-                {isActive ? 'Live' : 'Idle'}
+              <span className="flex min-w-0 items-center gap-3">
+                <Icon className="h-4 w-4 shrink-0" />
+                <span className="truncate">{item.label}</span>
               </span>
+              {badge}
             </button>
           );
         })}
       </nav>
 
-      {hasHorario ? (
-        <div
-          className="mt-auto border-t pt-4"
-          style={{ borderColor: 'var(--border-subtle)' }}
+      <section
+        className="mx-2.5 my-1 rounded-xl border px-3.5 py-2.5"
+        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+      >
+        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+          Sincronización
+        </p>
+        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
+          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
+          <span className="font-medium">{syncInfo.text}</span>
+        </div>
+        {syncTimestamp ? (
+          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+            Última sincronización · {syncTimestamp}
+          </p>
+        ) : null}
+        <button
+          type="button"
+          className={`sync-all-btn${syncState.status === 'syncing' ? ' sync-all-btn--syncing' : ''}`}
+          data-label={syncLabel}
+          onClick={onSyncAll}
+          disabled={syncState.status === 'syncing'}
+          title="Actualiza actividades y horario"
         >
-          <div
-            className="rounded-2xl border p-3"
-            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
-          >
-            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
-              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
-              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
+          {syncState.status === 'syncing' ? (
+            <span className="sync-all-btn__syncing">
+              <svg
+                width="14"
+                height="14"
+                viewBox="0 0 24 24"
+                fill="none"
+                stroke="currentColor"
+                strokeWidth="2.5"
+                className="sync-all-btn__spinner"
+                aria-hidden="true"
+              >
+                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
+              </svg>
+              SINCRONIZANDO
+            </span>
+          ) : (
+            LETTERS.map((char, index) => (
+              <span key={`${char}-${index}`} className="sync-letter">
+                {char}
+              </span>
+            ))
+          )}
+        </button>
+      </section>
+
+      <section
+        className="mx-2.5 my-1 rounded-xl border px-3.5 py-2.5"
+        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
+      >
+        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
+          HOY · {formatDayShort(new Date())}
+        </p>
+
+        <div className="mt-2">
+          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
+            Entrega
+          </p>
+          {proximaEntrega ? (
+            <div className="mt-1 min-w-0">
+              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
+                {proximaEntrega.nombre}
+              </p>
+              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
+                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
+              </p>
             </div>
+          ) : (
+            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
+          )}
+        </div>
 
-            {nextClass ? (
-              <div className="space-y-2">
-                <div className="flex items-start justify-between gap-2">
-                  <div className="min-w-0">
-                    <p
-                      className="truncate text-sm font-medium"
-                      style={{ color: 'var(--text-strong)' }}
-                      title={nextClass.materia}
-                    >
-                      {nextClass.materia}
-                    </p>
-                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
-                      {nextClass.hora} · {nextClass.salon}
-                    </p>
-                  </div>
-
-                  {nextClass.meetLink ? (
-                    <button
-                      type="button"
-                      onClick={handleOpenMeetLink}
-                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
-                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
-                      title="Abrir videollamada"
-                    >
-                      <ExternalLink className="h-3.5 w-3.5" />
-                    </button>
-                  ) : null}
-                </div>
+        <div className="my-1.5 border-t" style={{ borderColor: 'var(--border)' }} />
 
+        <div>
+          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
+            Clase
+          </p>
+          {nextClass ? (
+            <div className="mt-1 min-w-0">
+              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
+                {nextClass.materia}
+              </p>
+              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+                <span className="truncate">{nextClass.hora}</span>
                 {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
                   <span
-                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
-                    style={{
-                      background: 'var(--retrasada-bg)',
-                      borderColor: 'var(--retrasada-border)',
-                      color: 'var(--retrasada-text)',
-                    }}
+                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
+                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)' }}
                   >
-                    {getNextClassStatus(nextClass)}
+                    {getClassStatus(nextClass)}
                   </span>
                 ) : (
-                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
-                    {getNextClassStatus(nextClass)}
-                  </p>
+                  <span className="truncate">· {getClassStatus(nextClass)}</span>
                 )}
               </div>
-            ) : (
-              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
-                Sin clases próximas
-              </p>
-            )}
-          </div>
+            </div>
+          ) : (
+            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
+          )}
+        </div>
+      </section>
+
+      <footer
+        className="mt-auto flex items-center gap-2.5 border-t px-3.5 py-2"
+        style={{ borderColor: 'var(--border)' }}
+      >
+        <div
+          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
+          style={{ background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))' }}
+        >
+          {initials}
+        </div>
+        <div className="min-w-0">
+          <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={profileName}>
+            {profileName}
+          </p>
+          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={userId}>
+            {userId || 'Sin ID configurado'}
+          </p>
         </div>
-      ) : null}
+      </footer>
     </aside>
   );
 }
```

### `src/index.css`
```diff
diff --git a/src/index.css b/src/index.css
index 8d21c99..fa9ffb8 100644
--- a/src/index.css
+++ b/src/index.css
@@ -89,3 +89,119 @@ a {
 .compact-row-details.expanded {
   max-height: 200px;
 }
+
+.sync-all-btn {
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  width: 100%;
+  height: 38px;
+  position: relative;
+  padding: 0 16px;
+  font-size: 12px;
+  text-transform: uppercase;
+  letter-spacing: 2px;
+  border: 0;
+  box-shadow: color-mix(in srgb, var(--accent) 45%, black) 0 5px 0 0;
+  background-color: var(--accent);
+  border-radius: 8px;
+  overflow: hidden;
+  cursor: pointer;
+  transition: 31ms cubic-bezier(.5, .7, .4, 1);
+  color: white;
+  margin-top: 8px;
+  user-select: none;
+}
+
+.sync-all-btn::before {
+  content: attr(data-label);
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  position: absolute;
+  inset: 0;
+  font-size: 12px;
+  font-weight: 700;
+  color: white;
+  letter-spacing: 2px;
+  opacity: 1;
+  transition: transform 0.15s ease, opacity 0.15s ease;
+  pointer-events: none;
+}
+
+.sync-all-btn:active:not(:disabled) {
+  box-shadow: none;
+  transform: translateY(5px);
+  transition: 35ms cubic-bezier(.5, .7, .4, 1);
+}
+
+.sync-all-btn:hover:not(:disabled)::before {
+  transform: translateY(110%);
+  opacity: 0;
+}
+
+.sync-all-btn .sync-letter {
+  color: white;
+  font-size: 12px;
+  font-weight: 700;
+  letter-spacing: 2px;
+  font-style: normal;
+  transition: all 2s ease;
+  transform: translateY(-20px);
+  opacity: 0;
+  line-height: 1;
+  white-space: pre;
+}
+
+.sync-all-btn:hover:not(:disabled) .sync-letter {
+  transform: translateY(0);
+  opacity: 1;
+}
+
+.sync-all-btn:hover .sync-letter:nth-child(1)  { transition: all 0.2s ease; transition-delay: 0.04s; }
+.sync-all-btn:hover .sync-letter:nth-child(2)  { transition: all 0.2s ease; transition-delay: 0.08s; }
+.sync-all-btn:hover .sync-letter:nth-child(3)  { transition: all 0.2s ease; transition-delay: 0.12s; }
+.sync-all-btn:hover .sync-letter:nth-child(4)  { transition: all 0.2s ease; transition-delay: 0.16s; }
+.sync-all-btn:hover .sync-letter:nth-child(5)  { transition: all 0.2s ease; transition-delay: 0.20s; }
+.sync-all-btn:hover .sync-letter:nth-child(6)  { transition: all 0.2s ease; transition-delay: 0.24s; }
+.sync-all-btn:hover .sync-letter:nth-child(7)  { transition: all 0.2s ease; transition-delay: 0.28s; }
+.sync-all-btn:hover .sync-letter:nth-child(8)  { transition: all 0.2s ease; transition-delay: 0.32s; }
+.sync-all-btn:hover .sync-letter:nth-child(9)  { transition: all 0.2s ease; transition-delay: 0.36s; }
+.sync-all-btn:hover .sync-letter:nth-child(10) { transition: all 0.2s ease; transition-delay: 0.40s; }
+.sync-all-btn:hover .sync-letter:nth-child(11) { transition: all 0.2s ease; transition-delay: 0.44s; }
+.sync-all-btn:hover .sync-letter:nth-child(12) { transition: all 0.2s ease; transition-delay: 0.48s; }
+.sync-all-btn:hover .sync-letter:nth-child(13) { transition: all 0.2s ease; transition-delay: 0.52s; }
+.sync-all-btn:hover .sync-letter:nth-child(14) { transition: all 0.2s ease; transition-delay: 0.56s; }
+.sync-all-btn:hover .sync-letter:nth-child(15) { transition: all 0.2s ease; transition-delay: 0.60s; }
+.sync-all-btn:hover .sync-letter:nth-child(16) { transition: all 0.2s ease; transition-delay: 0.64s; }
+
+.sync-all-btn:disabled {
+  cursor: not-allowed;
+  opacity: 0.7;
+  box-shadow: none;
+  transform: none;
+}
+
+.sync-all-btn--syncing::before {
+  content: none;
+}
+
+.sync-all-btn__syncing {
+  display: flex;
+  align-items: center;
+  gap: 6px;
+  font-size: 12px;
+  font-weight: 700;
+  letter-spacing: 2px;
+  color: white;
+}
+
+.sync-all-btn__spinner {
+  animation: spin 1s linear infinite;
+}
+
+@keyframes spin {
+  from { transform: rotate(0deg); }
+  to { transform: rotate(360deg); }
+}
+
```

### `src/pages/Calendario.jsx`
```diff
diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
new file mode 100644
index 0000000..f83a172
--- /dev/null
+++ b/src/pages/Calendario.jsx
@@ -0,0 +1,603 @@
+import { useEffect, useMemo, useState } from 'react';
+import {
+  AlertCircle,
+  CalendarDays,
+  ChevronDown,
+  ChevronLeft,
+  ChevronRight,
+  LayoutGrid,
+  List,
+  MapPin,
+  RefreshCw,
+} from 'lucide-react';
+
+const MONTHS = [
+  'Enero',
+  'Febrero',
+  'Marzo',
+  'Abril',
+  'Mayo',
+  'Junio',
+  'Julio',
+  'Agosto',
+  'Septiembre',
+  'Octubre',
+  'Noviembre',
+  'Diciembre',
+];
+
+const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
+const DEFAULT_CALENDAR_TYPE = 'Profesional Asociado y Licenciatura';
+
+const CATEGORY_COLORS = {
+  General: '#006DB6',
+  Avisos: '#f97316',
+  Académico: '#10b981',
+  Academico: '#10b981',
+  Inscripcion: '#8b5cf6',
+  Inscripción: '#8b5cf6',
+  Vacaciones: '#14b8a6',
+  Examen: '#ef4444',
+};
+
+const FALLBACK_COLORS = ['#006DB6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6'];
+
+function hashCode(value = '') {
+  return String(value)
+    .split('')
+    .reduce((hash, char) => {
+      const nextHash = (hash << 5) - hash + char.charCodeAt(0);
+      return nextHash & nextHash;
+    }, 0);
+}
+
+function getCategoryColor(category = 'General') {
+  if (CATEGORY_COLORS[category]) {
+    return CATEGORY_COLORS[category];
+  }
+
+  return FALLBACK_COLORS[Math.abs(hashCode(category)) % FALLBACK_COLORS.length];
+}
+
+function getValidDate(value) {
+  const date = value ? new Date(value) : null;
+  return date && !Number.isNaN(date.getTime()) ? date : null;
+}
+
+function isSameDate(left, right) {
+  if (!left || !right) return false;
+
+  return (
+    left.getFullYear() === right.getFullYear() &&
+    left.getMonth() === right.getMonth() &&
+    left.getDate() === right.getDate()
+  );
+}
+
+function isMidnight(date) {
+  return date && date.getHours() === 0 && date.getMinutes() === 0;
+}
+
+function formatTime(date) {
+  if (!date) return '';
+
+  return new Intl.DateTimeFormat('es-MX', {
+    hour: '2-digit',
+    minute: '2-digit',
+    hour12: false,
+  }).format(date);
+}
+
+function formatEventTime(event) {
+  const start = getValidDate(event.inicio);
+  const end = getValidDate(event.fin);
+
+  if (!start || isMidnight(start)) {
+    return 'Todo el día';
+  }
+
+  if (!end || isMidnight(end)) {
+    return formatTime(start);
+  }
+
+  return `${formatTime(start)} – ${formatTime(end)}`;
+}
+
+function formatDateRange(startValue, endValue) {
+  const start = getValidDate(startValue);
+  const end = getValidDate(endValue);
+
+  if (!start) {
+    return 'Fecha por confirmar';
+  }
+
+  const sameDay = !end || isSameDate(start, end);
+  const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(start);
+  const startDay = start.getDate();
+  const month = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(start);
+  const year = start.getFullYear();
+
+  if (sameDay) {
+    return `${weekday} ${startDay} ${month} ${year}`;
+  }
+
+  const endWeekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(end);
+  const endDay = end.getDate();
+  const endMonth = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(end);
+  const endYear = end.getFullYear();
+
+  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
+    return `${weekday} ${startDay} – ${endWeekday} ${endDay} ${month} ${year}`;
+  }
+
+  return `${weekday} ${startDay} ${month} ${year} – ${endWeekday} ${endDay} ${endMonth} ${endYear}`;
+}
+
+function formatSelectedDay(date) {
+  if (!date) return '';
+
+  return new Intl.DateTimeFormat('es-MX', {
+    weekday: 'long',
+    day: 'numeric',
+    month: 'long',
+  }).format(date);
+}
+
+function generateCalendarDays(year, month) {
+  const firstDay = new Date(year, month, 1);
+  const lastDay = new Date(year, month + 1, 0);
+  const mondayOffset = (firstDay.getDay() + 6) % 7;
+  const totalVisibleDays = mondayOffset + lastDay.getDate();
+  const weeks = totalVisibleDays <= 35 ? 5 : 6;
+  const totalDays = weeks * 7;
+  const startDate = new Date(year, month, 1 - mondayOffset);
+  const today = new Date();
+
+  return Array.from({ length: totalDays }, (_, index) => {
+    const date = new Date(startDate);
+    date.setDate(startDate.getDate() + index);
+
+    return {
+      date,
+      isCurrentMonth: date.getMonth() === month,
+      isToday: isSameDate(date, today),
+    };
+  });
+}
+
+function getEventsForDay(events, date, filterCat = 'Todas') {
+  if (!date) return [];
+
+  return events
+    .filter((event) => {
+      const eventDate = getValidDate(event.inicio);
+      const categoryMatch = filterCat === 'Todas' || (event.categoria || 'General') === filterCat;
+      return eventDate && categoryMatch && isSameDate(eventDate, date);
+    })
+    .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+}
+
+function groupEventsByMonth(events) {
+  return events.reduce((groups, event) => {
+    const date = getValidDate(event.inicio);
+    const key = date ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}` : 'Sin fecha';
+
+    if (!groups[key]) {
+      groups[key] = [];
+    }
+
+    groups[key].push(event);
+    return groups;
+  }, {});
+}
+
+function SelectField({ label, value, onChange, children, className = '' }) {
+  return (
+    <label className={`relative block min-w-[180px] ${className}`.trim()}>
+      <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
+        {label}
+      </span>
+      <select
+        value={value}
+        onChange={(event) => onChange(event.target.value)}
+        className="w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-itson-blue/30"
+        style={{
+          background: 'var(--bg-secondary)',
+          borderColor: 'var(--border-normal)',
+          color: 'var(--text-strong)',
+        }}
+      >
+        {children}
+      </select>
+      <ChevronDown
+        className="pointer-events-none absolute bottom-2.5 right-3 h-4 w-4"
+        style={{ color: 'var(--text-muted)' }}
+      />
+    </label>
+  );
+}
+
+function EventCard({ event, compact = false }) {
+  const category = event.categoria || 'General';
+  const color = getCategoryColor(category);
+  const hasLocation = event.ubicacion && !/virtual/i.test(event.ubicacion);
+
+  return (
+    <article
+      className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'} transition hover:-translate-y-0.5`}
+      style={{
+        borderColor: 'var(--border-subtle)',
+        borderLeft: `3px solid ${color}`,
+        background: 'var(--bg-card)',
+      }}
+    >
+      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
+        <div className="min-w-0">
+          <h5 className="line-clamp-2 text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
+            {event.titulo}
+          </h5>
+          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
+            {compact ? formatEventTime(event) : formatDateRange(event.inicio, event.fin)}
+          </p>
+        </div>
+        <span
+          className="inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold"
+          style={{
+            background: `${color}20`,
+            borderColor: `${color}55`,
+            color,
+          }}
+        >
+          {category}
+        </span>
+      </div>
+
+      {event.descripcion ? (
+        <p className="mt-3 line-clamp-2 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
+          {event.descripcion}
+        </p>
+      ) : null}
+
+      {hasLocation ? (
+        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
+          <MapPin className="h-3 w-3" />
+          {event.ubicacion}
+        </p>
+      ) : null}
+    </article>
+  );
+}
+
+function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncing = false, onSync }) {
+  const today = new Date();
+  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
+  const [currentYear, setCurrentYear] = useState(today.getFullYear());
+  const [selectedDay, setSelectedDay] = useState(null);
+  const [viewMode, setViewMode] = useState('grid');
+  const [filterCat, setFilterCat] = useState('Todas');
+  const [selectedCalendarType, setSelectedCalendarType] = useState(() => {
+    try {
+      return localStorage.getItem('dvpotro-cal-type') || DEFAULT_CALENDAR_TYPE;
+    } catch (_error) {
+      return DEFAULT_CALENDAR_TYPE;
+    }
+  });
+
+  const events = Array.isArray(calendarData?.events) ? calendarData.events : [];
+  const calendarTypes = useMemo(() => {
+    const remoteTypes = Array.isArray(calendarData?.calendarTypes) ? calendarData.calendarTypes : [];
+    return [...new Set([selectedCalendarType, ...remoteTypes, DEFAULT_CALENDAR_TYPE].filter(Boolean))];
+  }, [calendarData?.calendarTypes, selectedCalendarType]);
+  const categories = useMemo(
+    () => ['Todas', ...new Set(events.map((event) => event.categoria || 'General'))],
+    [events],
+  );
+  const filteredEvents = useMemo(() => {
+    return events
+      .filter((event) => filterCat === 'Todas' || (event.categoria || 'General') === filterCat)
+      .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+  }, [events, filterCat]);
+  const calendarDays = useMemo(() => generateCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
+  const selectedDayEvents = useMemo(
+    () => getEventsForDay(events, selectedDay, filterCat),
+    [events, filterCat, selectedDay],
+  );
+  const groupedEvents = groupEventsByMonth(filteredEvents);
+  const hasEvents = events.length > 0;
+  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+
+  useEffect(() => {
+    if (calendarData?.calendarType) {
+      setSelectedCalendarType((current) =>
+        current === calendarData.calendarType ? current : calendarData.calendarType,
+      );
+    }
+  }, [calendarData?.calendarType]);
+
+  const syncCalendar = (options = {}) => {
+    onSync?.({ calendarType: selectedCalendarType, ...options });
+  };
+
+  const handleCalendarTypeChange = (nextType) => {
+    setSelectedCalendarType(nextType);
+    try {
+      localStorage.setItem('dvpotro-cal-type', nextType);
+    } catch (_error) {
+      // Local storage can be unavailable in restricted contexts.
+    }
+    onSync?.({ calendarType: nextType, clearCacheFirst: true });
+  };
+
+  const goToPreviousMonth = () => {
+    setSelectedDay(null);
+    setCurrentMonth((month) => {
+      if (month > 0) return month - 1;
+      setCurrentYear((year) => year - 1);
+      return 11;
+    });
+  };
+
+  const goToNextMonth = () => {
+    setSelectedDay(null);
+    setCurrentMonth((month) => {
+      if (month < 11) return month + 1;
+      setCurrentYear((year) => year + 1);
+      return 0;
+    });
+  };
+
+  if (isSyncing) {
+    return (
+      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
+        <div className="text-center">
+          <RefreshCw className="mx-auto h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
+          <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+            Cargando calendario...
+          </p>
+        </div>
+      </div>
+    );
+  }
+
+  return (
+    <div className="space-y-5">
+      <section
+        className="rounded-2xl border p-6"
+        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+      >
+        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
+          <div>
+            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
+              <CalendarDays className="h-3.5 w-3.5" />
+              ITSON · {currentYear}
+            </div>
+            <h3 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+              Calendario Escolar
+            </h3>
+            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
+              Consulta fechas académicas oficiales publicadas por ITSON.
+            </p>
+          </div>
+
+          <button
+            type="button"
+            onClick={() => syncCalendar({ clearCacheFirst: true })}
+            disabled={isSyncing}
+            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
+            style={{ background: 'var(--accent)' }}
+          >
+            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
+            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
+          </button>
+        </div>
+      </section>
+
+      {calendarData?.error ? (
+        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <div className="flex items-start gap-3">
+            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+            <p>{calendarData.error}</p>
+          </div>
+        </div>
+      ) : null}
+
+      {!calendarData?.error && !hasEvents ? (
+        <div
+          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+        >
+          <CalendarDays className="h-9 w-9 text-slate-600" />
+          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
+            Sincroniza para cargar el calendario escolar ITSON.
+          </p>
+          <button
+            type="button"
+            onClick={() => syncCalendar({ clearCacheFirst: true })}
+            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white"
+            style={{ background: 'var(--accent)' }}
+          >
+            Sincronizar ahora
+          </button>
+        </div>
+      ) : null}
+
+      {hasEvents ? (
+        <>
+          <section
+            className="rounded-2xl border p-4"
+            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+          >
+            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+              <div className="flex items-center gap-2">
+                <button
+                  type="button"
+                  onClick={goToPreviousMonth}
+                  className="rounded-xl border p-2 transition hover:scale-105"
+                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                  aria-label="Mes anterior"
+                >
+                  <ChevronLeft className="h-4 w-4" />
+                </button>
+                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+                  {monthLabel}
+                </p>
+                <button
+                  type="button"
+                  onClick={goToNextMonth}
+                  className="rounded-xl border p-2 transition hover:scale-105"
+                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                  aria-label="Mes siguiente"
+                >
+                  <ChevronRight className="h-4 w-4" />
+                </button>
+              </div>
+
+              <div className="flex flex-wrap items-end gap-3">
+                <SelectField
+                  label="Seleccionar un calendario"
+                  value={selectedCalendarType}
+                  onChange={handleCalendarTypeChange}
+                  className="min-w-[260px]"
+                >
+                  {calendarTypes.map((type) => (
+                    <option key={type} value={type}>
+                      {type}
+                    </option>
+                  ))}
+                </SelectField>
+
+                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+                  {categories.map((category) => (
+                    <option key={category} value={category}>
+                      {category}
+                    </option>
+                  ))}
+                </SelectField>
+                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+                  {[
+                    { id: 'list', label: 'Lista', Icon: List },
+                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+                  ].map(({ id, label, Icon }) => {
+                    const active = viewMode === id;
+                    return (
+                      <button
+                        key={id}
+                        type="button"
+                        onClick={() => setViewMode(id)}
+                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+                        style={{
+                          background: active ? 'var(--accent)' : 'transparent',
+                          color: active ? '#fff' : 'var(--text-muted)',
+                        }}
+                        title={label}
+                      >
+                        <Icon className="h-4 w-4" />
+                      </button>
+                    );
+                  })}
+                </div>
+              </div>
+            </div>
+          </section>
+
+          {viewMode === 'grid' ? (
+            <>
+              <section
+                className="rounded-2xl border p-4"
+                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+              >
+                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
+                  {WEEK_DAYS.map((day) => (
+                    <div key={day} className="py-2">
+                      {day}
+                    </div>
+                  ))}
+                </div>
+
+                <div className="grid grid-cols-7 gap-1">
+                  {calendarDays.map((day) => {
+                    const dayEvents = day.isCurrentMonth ? getEventsForDay(events, day.date, filterCat) : [];
+                    const isSelected = selectedDay && isSameDate(selectedDay, day.date);
+                    const clickable = day.isCurrentMonth && dayEvents.length > 0;
+
+                    return (
+                      <button
+                        key={day.date.toISOString()}
+                        type="button"
+                        onClick={() => {
+                          if (clickable) setSelectedDay(day.date);
+                        }}
+                        className="text-left transition hover:-translate-y-0.5"
+                        style={{
+                          minHeight: 72,
+                          padding: '4px 6px',
+                          borderRadius: 8,
+                          cursor: clickable ? 'pointer' : 'default',
+                          border: day.isToday ? '2px solid var(--itson-blue)' : '0.5px solid var(--border)',
+                          position: 'relative',
+                          opacity: day.isCurrentMonth ? 1 : 0.3,
+                          background: isSelected ? 'color-mix(in srgb, var(--itson-blue) 10%, transparent)' : 'var(--bg-secondary)',
+                          color: day.isCurrentMonth ? 'var(--text-normal)' : 'var(--text-muted)',
+                        }}
+                      >
+                        <span className="text-xs font-semibold">{day.date.getDate()}</span>
+                        <div className="mt-2 flex flex-wrap items-center gap-1">
+                          {dayEvents.slice(0, 3).map((event, index) => (
+                            <span
+                              key={`${event.titulo}-${event.inicio}-${index}`}
+                              className="h-2 w-2 rounded-full"
+                              style={{ background: getCategoryColor(event.categoria || 'General') }}
+                            />
+                          ))}
+                          {dayEvents.length > 3 ? (
+                            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
+                              +{dayEvents.length - 3}
+                            </span>
+                          ) : null}
+                        </div>
+                      </button>
+                    );
+                  })}
+                </div>
+              </section>
+
+              {selectedDay && selectedDayEvents.length > 0 ? (
+                <section
+                  className="rounded-2xl border p-5"
+                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+                >
+                  <h4 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-strong)' }}>
+                    {formatSelectedDay(selectedDay)} · {selectedDayEvents.length} evento{selectedDayEvents.length === 1 ? '' : 's'}
+                  </h4>
+                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
+                    {selectedDayEvents.map((event, index) => (
+                      <EventCard key={`${event.titulo}-${event.inicio}-${index}`} event={event} compact />
+                    ))}
+                  </div>
+                </section>
+              ) : null}
+            </>
+          ) : (
+            <div className="space-y-5">
+              {Object.entries(groupedEvents).map(([month, monthEvents]) => (
+                <section key={month} className="space-y-3">
+                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-normal)' }}>
+                    {month}
+                  </h4>
+                  <div className="space-y-3">
+                    {monthEvents.map((event, index) => (
+                      <EventCard key={`${event.titulo}-${event.inicio}-${index}`} event={event} />
+                    ))}
+                  </div>
+                </section>
+              ))}
+            </div>
+          )}
+        </>
+      ) : null}
+    </div>
+  );
+}
+
+export { generateCalendarDays, getEventsForDay };
+export default Calendario;
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** npm run build + CSS build check + MES select removal check
**Comando de verificación:** npm run build; node check sync-all-btn in dist CSS; node check MES select removed
**Output de verificación:**
```
$ npm run build
> dvpotro@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1768 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            0.47 kB │ gzip:  0.30 kB
dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
dist/assets/index-BHL7YJJ7.css             34.79 kB │ gzip:  7.22 kB
dist/assets/index-BZ6s7_Bs.js              321.55 kB │ gzip: 87.78 kB
✓ built in 9.82s

$ node check sync-all-btn in dist CSS
sync-all-btn in CSS: true

$ node check MES select removed
MES select removed: true

Note: Vite printed its existing CJS Node API deprecation warning after the checks.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
