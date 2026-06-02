const fs = require('fs');
const path = require('path');
const electron = require('electron');
const { chromium } = require('playwright');

const app = electron?.app;

const CALENDAR_URL = 'https://apps11.itson.edu.mx/CalendarioEscolar/Calendario/Calendario';
const DEFAULT_TYPE = 'Profesional Asociado y Licenciatura';
const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

const SPANISH_MONTHS = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function getUserDataPath() {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('userData');
  }

  const fallbackPath = path.join(process.cwd(), '.local-data');
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
}

function getTempPath() {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('temp');
  }

  const fallbackPath = path.join(process.cwd(), '.local-data', 'tmp');
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
}

function getCalendarioCachePath() {
  return path.join(getUserDataPath(), 'calendario-cache.json');
}

function discardFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function normalizeCalendarType(calendarType) {
  return String(calendarType || DEFAULT_TYPE).trim() || DEFAULT_TYPE;
}

function readCalendarioCache(calendarType = DEFAULT_TYPE) {
  const cachePath = getCalendarioCachePath();
  const requestedType = normalizeCalendarType(calendarType);

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

    if (!Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') {
      discardFile(cachePath);
      return null;
    }

    if (normalizeCalendarType(parsed.calendarType) !== requestedType) {
      return null;
    }

    return {
      events: parsed.events,
      calendarTypes: Array.isArray(parsed.calendarTypes) ? parsed.calendarTypes : [],
      calendarType: requestedType,
      timestamp: parsed.timestamp,
    };
  } catch (_error) {
    discardFile(cachePath);
    return null;
  }
}

function writeCalendarioCache(payload, calendarType = DEFAULT_TYPE) {
  const requestedType = normalizeCalendarType(calendarType);
  const nextPayload = {
    events: Array.isArray(payload?.events) ? payload.events : [],
    calendarTypes: Array.isArray(payload?.calendarTypes) ? payload.calendarTypes : [],
    calendarType: requestedType,
    timestamp: Date.now(),
  };

  fs.writeFileSync(getCalendarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
  return nextPayload;
}

function clearCache() {
  discardFile(getCalendarioCachePath());
  return { success: true };
}

function isTimeoutError(error) {
  return Boolean(
    error &&
      (error.name === 'TimeoutError' ||
        /timeout/i.test(error.message || '') ||
        /timed out/i.test(error.message || '')),
  );
}

function isNetworkError(error) {
  const message = error?.message || '';
  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
    message,
  );
}

async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_TIMEOUT_MS,
        ...options,
      });
    } catch (error) {
      lastError = error;

      if (isNetworkError(error)) {
        throw new Error('NO_INTERNET');
      }

      if (!isTimeoutError(error) || attempt === maxRetries) {
        throw error;
      }

      await page.waitForTimeout(1500);
    }
  }

  throw lastError;
}

async function applyResourceBlocking(page) {
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();

    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      route.abort();
      return;
    }

    route.continue();
  });
}

function unfoldICS(content) {
  return String(content || '').replace(/\r?\n[ \t]/g, '');
}

function unescapeICSText(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseICSDate(str) {
  if (!str) return null;
  const clean = str.includes(':') ? str.split(':').pop() : str;
  const d = clean.replace(/[TZ]/g, '');
  if (d.length < 8) return null;

  try {
    return new Date(
      Number(d.slice(0, 4)),
      Number(d.slice(4, 6)) - 1,
      Number(d.slice(6, 8)),
      d.length >= 12 ? Number(d.slice(8, 10)) : 0,
      d.length >= 14 ? Number(d.slice(10, 12)) : 0,
    ).toISOString();
  } catch (_error) {
    return null;
  }
}

function parseDDMMYYYY(str) {
  const match = String(str || '').trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date.toISOString();
}

function parseModalDate(str) {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return null;

  return new Date(
    Number(match[3]),
    Number(match[1]) - 1,
    Number(match[2]),
    Number(match[4]),
    Number(match[5]),
  ).toISOString();
}

function parseICS(content) {
  const events = [];
  const blocks = unfoldICS(content).split('BEGIN:VEVENT');

  for (const block of blocks.slice(1)) {
    const get = (field) => {
      const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:([^\\r\\n]+)`, 'm'));
      return match ? unescapeICSText(match[1]) : '';
    };
    const inicio = parseICSDate(get('DTSTART'));

    if (!inicio) {
      continue;
    }

    events.push({
      titulo: get('SUMMARY') || 'Evento',
      inicio,
      fin: parseICSDate(get('DTEND')),
      descripcion: get('DESCRIPTION'),
      ubicacion: get('LOCATION'),
      categoria: get('CATEGORIES') || get('X-CATEGORY') || 'General',
    });
  }

  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
}

function parseDateText(text) {
  const normalized = String(text || '').trim();

  if (!normalized) {
    return null;
  }

  const nativeDate = new Date(normalized);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString();
  }

  const spanishMatch = normalized
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})\b/);

  if (spanishMatch) {
    const day = Number(spanishMatch[1]);
    const month = SPANISH_MONTHS[spanishMatch[2]];
    const year = Number(spanishMatch[3]);

    if (Number.isFinite(day) && Number.isInteger(month) && Number.isFinite(year)) {
      return new Date(year, month, day).toISOString();
    }
  }

  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]) - 1;
    const year = Number(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3]);
    return new Date(year, month, day).toISOString();
  }

  return null;
}

function normalizeEvent(event) {
  return {
    titulo: String(event?.titulo || 'Evento').trim().slice(0, 150),
    inicio: event?.inicio || null,
    fin: event?.fin || null,
    descripcion: String(event?.descripcion || '').trim(),
    ubicacion: String(event?.ubicacion || '').trim(),
    categoria: String(event?.categoria || 'General').trim() || 'General',
  };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function getCalendarTypes(page) {
  const types = await page.evaluate((defaultType) => {
    const monthWords = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const normalize = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    const selects = Array.from(document.querySelectorAll('select'));
    const selectData = selects.map((select) => {
      const options = Array.from(select.options || [])
        .map((option) => ({ text: option.textContent?.trim() || '', value: option.value || '' }))
        .filter((option) => option.text || option.value);
      const text = normalize(options.map((option) => option.text || option.value).join(' '));
      const hasMonth = monthWords.some((month) => text.includes(month));
      const hasYear = options.some((option) => /^20\d{2}$/.test((option.text || option.value).trim()));
      const hasDefaultType = text.includes(normalize(defaultType));
      return { options, hasMonth, hasYear, hasDefaultType };
    });

    const match =
      selectData.find((entry) => entry.hasDefaultType) ||
      selectData.find((entry) => !entry.hasMonth && !entry.hasYear && entry.options.length > 1);

    return match ? match.options.map((option) => option.text || option.value).filter(Boolean) : [];
  }, DEFAULT_TYPE);

  const unique = [...new Set(types.map((type) => String(type).trim()).filter(Boolean))];
  return unique.length > 0 ? unique : [DEFAULT_TYPE];
}

async function selectCalendarType(page, calendarType = DEFAULT_TYPE) {
  const requestedType = normalizeCalendarType(calendarType);
  const selected = await page.evaluate(
    ({ requestedType: requested, defaultType }) => {
      const monthWords = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ];
      const normalize = (value) =>
        String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      const wanted = normalize(requested);
      const fallback = normalize(defaultType);
      const selects = Array.from(document.querySelectorAll('select'));
      const candidates = selects
        .map((select) => {
          const options = Array.from(select.options || []);
          const optionText = normalize(options.map((option) => option.textContent || option.value).join(' '));
          const hasMonth = monthWords.some((month) => optionText.includes(month));
          const hasYear = options.some((option) => /^20\d{2}$/.test((option.textContent || option.value || '').trim()));
          return { select, options, optionText, hasMonth, hasYear };
        })
        .filter(({ optionText, hasMonth, hasYear }) => !hasMonth && !hasYear && (optionText.includes(wanted) || optionText.includes(fallback)));

      const candidate = candidates[0];
      if (!candidate) return false;

      const options = candidate.options;
      const option =
        options.find((item) => normalize(item.textContent) === wanted || normalize(item.value) === wanted) ||
        options.find((item) => normalize(item.textContent).includes(wanted) || normalize(item.value).includes(wanted)) ||
        options.find((item) => normalize(item.textContent).includes(fallback) || normalize(item.value).includes(fallback));

      if (!option) return false;

      candidate.select.value = option.value;
      candidate.select.dispatchEvent(new Event('input', { bubbles: true }));
      candidate.select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { requestedType, defaultType: DEFAULT_TYPE },
  );

  if (selected) {
    await page.waitForTimeout(800);
  }

  return selected;
}

async function selectYear(page, year = CURRENT_YEAR) {
  const selected = await page.evaluate((targetYear) => {
    const selects = Array.from(document.querySelectorAll('select'));
    const candidates = selects.filter((select) =>
      Array.from(select.options || []).some((option) => (option.textContent || option.value || '').trim() === String(targetYear)),
    );
    const select = candidates[0];
    if (!select) return false;

    const option = Array.from(select.options || []).find(
      (item) => (item.textContent || item.value || '').trim() === String(targetYear),
    );
    if (!option) return false;

    select.value = option.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, year);

  if (selected) {
    await page.waitForTimeout(800);
  }

  return selected;
}

async function selectMonth(page, monthName, monthIndex) {
  const selected = await page.evaluate(
    ({ monthName: targetMonth, monthIndex: targetIndex }) => {
      const normalize = (value) =>
        String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      const wanted = normalize(targetMonth);
      const selects = Array.from(document.querySelectorAll('select'));
      const candidates = selects
        .map((select) => ({ select, options: Array.from(select.options || []) }))
        .filter(({ options }) => options.some((option) => normalize(option.textContent || option.value).includes(wanted)));
      const candidate = candidates[0];
      if (!candidate) return false;

      const option =
        candidate.options.find((item) => normalize(item.textContent || item.value).includes(wanted)) ||
        candidate.options.find((item) => [String(targetIndex), String(targetIndex + 1)].includes(String(item.value || '').trim()));

      if (!option) return false;

      candidate.select.value = option.value;
      candidate.select.dispatchEvent(new Event('input', { bubbles: true }));
      candidate.select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    { monthName, monthIndex },
  );

  if (selected) {
    await page.waitForTimeout(900);
  }

  return selected;
}

async function extractVisibleListEvents(page) {
  const rawEvents = await page.evaluate(() => {
    const datePattern = /\d{2}-\d{2}-\d{4}/g;
    const visibleText = (element) => String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';
    };
    const isLeafish = (element, text) => {
      const children = Array.from(element.children || []);
      return !children.some((child) => {
        const childText = visibleText(child);
        return childText.match(datePattern) && childText.length < text.length;
      });
    };
    const inferCategory = (text, title) => {
      const explicit = text.match(/Categor[ií]a\s*:?\s*([^\n|]+)/i)?.[1]?.trim();
      if (explicit) return explicit;
      if (/inscrip|reinscrip/i.test(title)) return 'Inscripción';
      if (/vacaci|asueto|descanso/i.test(title)) return 'Vacaciones';
      if (/examen|evaluaci/i.test(title)) return 'Examen';
      return 'General';
    };

    return Array.from(document.querySelectorAll('body *'))
      .map((element) => ({ element, text: visibleText(element) }))
      .filter(({ element, text }) => {
        if (!text || text.length < 10 || text.length > 600) return false;
        if (!datePattern.test(text)) return false;
        datePattern.lastIndex = 0;
        return isVisible(element) && isLeafish(element, text);
      })
      .map(({ text }) => {
        const fechas = text.match(datePattern) || [];
        const title = text
          .replace(datePattern, ' ')
          .replace(/\s+-\s+/g, ' ')
          .replace(/\bFecha\b|\bInicio\b|\bFin\b|\bDel\b|\bal\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!title || title.length < 4) {
          return null;
        }

        return {
          titulo: title,
          fechaInicio: fechas[0] || null,
          fechaFin: fechas[1] || null,
          descripcion: text,
          ubicacion: '',
          categoria: inferCategory(text, title),
        };
      })
      .filter(Boolean);
  });

  const seen = new Set();
  const events = [];

  for (const rawEvent of rawEvents) {
    const inicio = parseDDMMYYYY(rawEvent.fechaInicio);
    if (!inicio) continue;

    const normalized = normalizeEvent({
      titulo: rawEvent.titulo,
      inicio,
      fin: parseDDMMYYYY(rawEvent.fechaFin),
      descripcion: rawEvent.descripcion,
      ubicacion: rawEvent.ubicacion,
      categoria: rawEvent.categoria,
    });
    const key = `${normalizeText(normalized.titulo)}-${normalized.inicio}`;

    if (seen.has(key)) continue;
    seen.add(key);
    events.push(normalized);
  }

  return events.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
}

async function tryDownloadICS(page) {
  const downloadButton = await page
    .$(
      'a[href*=".ics"], a[href*="download"], button:has-text("Descargar calendario"), a:has-text("Descargar calendario"), button:has-text("Descargar"), a:has-text("Descargar")',
    )
    .catch(() => null);

  if (!downloadButton) {
    return null;
  }

  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await downloadButton.click();
    const download = await downloadPromise;
    if (!download) return null;

    const tmpPath = path.join(getTempPath(), `itson-cal-download-${Date.now()}.tmp`);
    await download.saveAs(tmpPath);
    const content = fs.readFileSync(tmpPath, 'utf8');
    discardFile(tmpPath);

    if (!content.includes('BEGIN:VCALENDAR')) {
      return null;
    }

    const events = parseICS(content);
    return events.length > 0 ? events.map(normalizeEvent) : null;
  } catch (_error) {
    return null;
  }
}

async function scrapeCalendario(calendarType = DEFAULT_TYPE) {
  const requestedType = normalizeCalendarType(calendarType);
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    await applyResourceBlocking(page);
    await gotoWithRetry(page, CALENDAR_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const calendarTypes = await getCalendarTypes(page);
    await selectCalendarType(page, requestedType);
    await selectYear(page, CURRENT_YEAR);

    const eventsByKey = new Map();

    for (let index = 0; index < MONTHS.length; index += 1) {
      await selectMonth(page, MONTHS[index], index);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await page.waitForTimeout(350);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await page.waitForTimeout(500);

      const monthEvents = await extractVisibleListEvents(page);
      for (const event of monthEvents) {
        const key = `${normalizeText(event.titulo)}-${event.inicio}`;
        if (!eventsByKey.has(key)) {
          eventsByKey.set(key, event);
        }
      }
    }

    const events = Array.from(eventsByKey.values()).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    if (events.length > 0) {
      return { events, calendarTypes, calendarType: requestedType, timestamp: Date.now(), fromCache: false };
    }

    const icsEvents = await tryDownloadICS(page);
    return {
      events: Array.isArray(icsEvents) ? icsEvents : [],
      calendarTypes,
      calendarType: requestedType,
      timestamp: Date.now(),
      fromCache: false,
    };
  } finally {
    await browser.close();
  }
}

async function run(options = {}) {
  const calendarType = normalizeCalendarType(
    typeof options === 'string' ? options : options?.calendarType || DEFAULT_TYPE,
  );
  const cached = readCalendarioCache(calendarType);

  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    return {
      ...cached,
      fromCache: true,
    };
  }

  try {
    const result = await scrapeCalendario(calendarType);
    const cachedPayload = writeCalendarioCache(result, calendarType);
    return {
      ...cachedPayload,
      fromCache: false,
    };
  } catch (error) {
    if (error?.message === 'NO_INTERNET') {
      return { error: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
    }

    return {
      error: error?.message
        ? `Falló la extracción del calendario escolar: ${error.message}`
        : 'Falló la extracción del calendario escolar por un error no identificado.',
    };
  }
}

module.exports = {
  clearCache,
  getCalendarioCachePath,
  parseDateText,
  parseDDMMYYYY,
  parseICS,
  parseICSDate,
  parseModalDate,
  run,
};
