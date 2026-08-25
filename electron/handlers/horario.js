const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron?.app;
const ipcMain = electron?.ipcMain;
const { chromium } = require('playwright');
const notificationCenter = require('./notification-center');
const { isTimeoutError, withTimeout } = require('../utils/withTimeout');

const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
const IVIRTUAL_LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
const IVIRTUAL_DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const GLOBAL_TIMEOUT_MS = 4 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;
const CIA_LOGIN_TIMEOUT_MS = 45_000;
const CHUNK_SIZE = 3;
const LINK_TIMEOUT_MS = 45_000;
// Timeouts de espera por rol (antes valores mágicos inline):
const PSOFT_SETTLE_SHORT_MS = 8_000; // asentamiento rápido de PeopleSoft + campos de login
const PSOFT_SETTLE_MS = 10_000; // asentamiento estándar post-navegación
const SELECTOR_TIMEOUT_MS = 12_000; // waits de selectores (frames PeopleSoft y Moodle)
const NAV_SETTLE_TIMEOUT_MS = 15_000; // navegación completa + elementos lentos
const FRAME_TIMEOUT_MS = 25_000; // aparición del content frame de PeopleSoft
const MAX_DEEP_RESOURCES = 12;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);

const DAY_MAP = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  sábado: 'Sábado',
  domingo: 'Domingo',
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  mié: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  sáb: 'Sábado',
  dom: 'Domingo',
};

const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEET_PATTERNS = [
  /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i,
  /meet\.google\.com\/lookup\//i,
  /zoom\.us\/j\//i,
  /teams\.microsoft\.com\/l\/meetup-join/i,
  /meet\.google\.com/i,
];

function normalizeWhitespace(value) {
  return (value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForCompare(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isNetworkError(error) {
  const message = error?.message || '';

  if (/ERR_ABORTED/i.test(message)) {
    return false;
  }

  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
    message,
  );
}

async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        console.log(`Reintentando navegación, intento ${attempt} de ${maxRetries}`);
      }
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

      await new Promise((resolve) => setTimeout(resolve, 2000));
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

function getHorarioCachePath() {
  return path.join(getUserDataPath(), 'horario-cache.json');
}

function getManualLinksPath() {
  return path.join(getUserDataPath(), 'horario-links-manuales.json');
}

function getUserDataPath() {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('userData');
  }

  const fallbackPath = path.join(process.cwd(), '.local-data');
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
}

function discardFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function readJSONFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('[horario] Error leyendo caché:', error?.message || error);
    discardFile(filePath);
    return null;
  }
}

function readHorarioCache() {
  const parsed = readJSONFile(getHorarioCachePath());

  if (!parsed) {
    return null;
  }

  if (!Array.isArray(parsed.materias) || typeof parsed.timestamp !== 'number') {
    discardFile(getHorarioCachePath());
    return null;
  }

  return parsed;
}

let cachedHorarioMaterias = [];

function updateCachedHorarioMaterias(payload) {
  cachedHorarioMaterias = Array.isArray(payload?.materias) ? payload.materias : [];
}

function getCachedHorario() {
  return Array.isArray(cachedHorarioMaterias) ? cachedHorarioMaterias : [];
}

function writeHorarioCache(payload) {
  const nextPayload = {
    materias: Array.isArray(payload?.materias) ? payload.materias : [],
    diasConClases: Array.isArray(payload?.diasConClases) ? payload.diasConClases : [],
    timestamp: Date.now(),
  };

  fs.writeFileSync(getHorarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
  updateCachedHorarioMaterias(nextPayload);
  return nextPayload;
}

function clearHorarioCache() {
  discardFile(getHorarioCachePath());
  updateCachedHorarioMaterias({ materias: [] });
  return { success: true };
}

function readManualLinks() {
  const parsed = readJSONFile(getManualLinksPath());

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  return Object.entries(parsed).reduce((accumulator, [classNumber, link]) => {
    if (typeof classNumber === 'string' && typeof link === 'string' && link.startsWith('http')) {
      accumulator[classNumber] = link;
    }

    return accumulator;
  }, {});
}

function writeManualLinks(linksMap) {
  fs.writeFileSync(getManualLinksPath(), JSON.stringify(linksMap, null, 2), 'utf8');
}

function normalizeLink(url) {
  const normalized = normalizeWhitespace(url);

  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^(meet\.google\.com|zoom\.us|teams\.microsoft\.com)\//i.test(normalized)) {
    return `https://${normalized}`;
  }

  return normalized;
}

function applyManualLinks(payload) {
  const manualLinks = readManualLinks();

  const materias = (Array.isArray(payload?.materias) ? payload.materias : []).map((materia) => {
    const manualLink = manualLinks[materia.numeroClase] || null;

    if (!manualLink) {
      return {
        ...materia,
        linkManual: Boolean(materia.linkManual),
        meetLinkLayer: materia.meetLinkLayer || null,
      };
    }

    return {
      ...materia,
      meetLink: manualLink,
      meetLinkLayer: 'MANUAL',
      linkManual: true,
    };
  });

  return {
    ...payload,
    materias,
  };
}

function saveManualLink(numeroClase, link) {
  const classNumber = normalizeWhitespace(numeroClase);
  const normalizedLink = normalizeLink(link);

  if (!classNumber) {
    return { success: false, error: 'numeroClase requerido.' };
  }

  if (!normalizedLink || !/^https?:\/\//i.test(normalizedLink)) {
    return { success: false, error: 'Link inválido.' };
  }

  const manualLinks = readManualLinks();
  manualLinks[classNumber] = normalizedLink;
  writeManualLinks(manualLinks);

  const cached = readHorarioCache();

  if (cached) {
    const patched = {
      ...cached,
      materias: cached.materias.map((materia) =>
        materia.numeroClase === classNumber
          ? { ...materia, meetLink: normalizedLink, meetLinkLayer: 'MANUAL', linkManual: true }
          : materia,
      ),
    };

    fs.writeFileSync(getHorarioCachePath(), JSON.stringify(patched, null, 2), 'utf8');
  }

  return { success: true, numeroClase: classNumber, link: normalizedLink };
}

function buildHorarioError(message) {
  try {
    clearHorarioCache();
  } catch (_error) {
    // Ignore cleanup failures
  }

  return { error: message };
}

function parseTimeTo24h(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();

  if (!normalized) {
    return null;
  }

  const amPmMatch = normalized.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);

  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const meridiem = amPmMatch[3].toLowerCase();

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const militaryMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/);

  if (!militaryMatch) {
    return null;
  }

  const hours = Number(militaryMatch[1]);
  const minutes = Number(militaryMatch[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeRange(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return { horaInicio: null, horaFin: null };
  }

  const matches = normalized.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/g);

  if (!matches || matches.length < 2) {
    return { horaInicio: null, horaFin: null };
  }

  return {
    horaInicio: parseTimeTo24h(matches[0]),
    horaFin: parseTimeTo24h(matches[1]),
  };
}

function toMinutes(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') {
    return null;
  }

  const [hours, minutes] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesDiff(timeA, timeB) {
  const a = toMinutes(timeA);
  const b = toMinutes(timeB);

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(a - b);
}

function extractCode(value) {
  const text = normalizeWhitespace(value);

  if (!text) {
    return '';
  }

  const patterns = [
    /\b\d{4}[A-Z]\b/i,
    /\b[A-Z]{2,5}-?\d{2,4}[A-Z]?\b/i,
    /\b[A-Z]{3,}\d{2,}\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return match[0].toUpperCase();
    }
  }

  return '';
}

function extractSection(value) {
  const text = normalizeWhitespace(value);
  const sectionMatch = text.match(/(?:secci[oó]n|section)\s*[:#-]?\s*(\d{1,4}[A-Z]?)/i);
  if (sectionMatch) {
    return sectionMatch[1].toUpperCase();
  }

  return '';
}

function extractClassNumber(value) {
  const text = normalizeWhitespace(value);
  const classMatch = text.match(/(?:n[uú]mero\s*de\s*clase|class\s*number|class\s*nbr|nro\.?\s*clase)\s*[:#-]?\s*(\d{4,7})/i);
  if (classMatch) {
    return classMatch[1];
  }

  const bareMatch = text.match(/\b\d{5,7}\b/);
  return bareMatch ? bareMatch[0] : '';
}

function inferModalidad(value) {
  const normalized = normalizeForCompare(value);

  if (
    normalized.includes('curso a distancia con herramientas de internet') ||
    normalized.includes('distancia con herramientas de internet') ||
    normalized.includes('online') ||
    normalized.includes('en linea') ||
    normalized.includes('virtual') ||
    normalized.includes('remoto')
  ) {
    return 'en_linea';
  }

  return 'presencial';
}

function extractDayTokens(text) {
  const normalized = normalizeForCompare(text);
  const days = new Set();

  Object.entries(DAY_MAP).forEach(([token, day]) => {
    if (normalized.includes(token)) {
      days.add(day);
    }
  });

  return DAY_ORDER.filter((day) => days.has(day));
}

function parsePeopleSoftDays(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return [];
  }

  const tokenPart = normalized
    .split(/\d/)[0]
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g, '');

  const compact = normalizeForCompare(tokenPart).replace(/[^a-z]/g, '');
  const days = new Set();

  for (let index = 0; index < compact.length; ) {
    const slice = compact.slice(index);

    if (slice.startsWith('mi')) {
      days.add('Miércoles');
      index += 2;
      continue;
    }

    if (slice.startsWith('ma')) {
      days.add('Martes');
      index += 2;
      continue;
    }

    const char = compact[index];

    if (char === 'l') {
      days.add('Lunes');
    } else if (char === 'j') {
      days.add('Jueves');
    } else if (char === 'v') {
      days.add('Viernes');
    } else if (char === 's') {
      days.add('Sábado');
    } else if (char === 'd') {
      days.add('Domingo');
    }

    index += 1;
  }

  if (days.size > 0) {
    return DAY_ORDER.filter((day) => days.has(day));
  }

  return extractDayTokens(normalized);
}

function parseDays(raw = '') {
  const normalized = normalizeWhitespace(raw);
  const DAY_PATTERNS = [
    { pattern: /\bLunes\b/i, day: 'Lunes' },
    { pattern: /\bMartes\b/i, day: 'Martes' },
    { pattern: /\bMi[eé]rcoles\b/i, day: 'Miércoles' },
    { pattern: /\bJueves\b/i, day: 'Jueves' },
    { pattern: /\bViernes\b/i, day: 'Viernes' },
    { pattern: /\bS[aá]bado\b/i, day: 'Sábado' },
    { pattern: /\bDomingo\b/i, day: 'Domingo' },
  ];

  const fromWords = DAY_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(
    ({ day }) => day,
  );

  if (fromWords.length > 0) {
    return [...new Set(fromWords)];
  }

  const compact = normalized.toUpperCase().replace(/[^A-Z]/g, '');
  const days = [];
  let index = 0;

  while (index < compact.length) {
    if (compact.startsWith('MI', index)) {
      days.push('Miércoles');
      index += 2;
    } else if (compact.startsWith('MA', index)) {
      days.push('Martes');
      index += 2;
    } else if (compact[index] === 'L') {
      days.push('Lunes');
      index += 1;
    } else if (compact[index] === 'M') {
      if (days.includes('Martes')) {
        days.push('Miércoles');
      } else {
        days.push('Martes');
      }
      index += 1;
    } else if (compact[index] === 'J') {
      days.push('Jueves');
      index += 1;
    } else if (compact[index] === 'V') {
      days.push('Viernes');
      index += 1;
    } else if (compact[index] === 'S') {
      days.push('Sábado');
      index += 1;
    } else if (compact[index] === 'D') {
      days.push('Domingo');
      index += 1;
    } else {
      index += 1;
    }
  }

  return [...new Set(days)];
}

function getFriendlyDayOrder(days) {
  const normalizedDays = Array.isArray(days) ? days : [];
  return DAY_ORDER.filter((day) => normalizedDays.includes(day));
}

function uniqueByKey(items, keyFn) {
  const map = new Map();

  items.forEach((item) => {
    const key = keyFn(item);

    if (!key) {
      return;
    }

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return [...map.values()];
}

function extractCourseFromContext(value) {
  const text = normalizeWhitespace(value);

  if (!text) {
    return { codigo: '', nombre: '' };
  }

  const courseMatch = text.match(
    /(?:^|\s)(?:[A-ZÁÉÍÓÚÑ]+)\s+([A-Z0-9-]{4,}[A-Z]?)\s*-\s*(.+?)(?:\s+Estado\s+Uni|\s+Estado\b|\s+N[ºo]\s*Clase|\s+Inscrito\b)/i,
  );

  if (courseMatch) {
    return {
      codigo: normalizeWhitespace(courseMatch[1]).toUpperCase(),
      nombre: normalizeWhitespace(courseMatch[2]),
    };
  }

  const fallbackCode = extractCode(text);

  if (!fallbackCode) {
    const looseMatch = text.match(/\b(\d{4}[A-Z])\b/i);
    if (looseMatch) {
      return { codigo: looseMatch[1].toUpperCase(), nombre: '' };
    }
    return { codigo: '', nombre: '' };
  }

  let fallbackName = normalizeWhitespace(
    text
      .replace(new RegExp(`.*?${fallbackCode}\\s*-\\s*`, 'i'), '')
      .replace(/\s+Estado\b.*/i, '')
      .replace(/\s+N[ºo]\s*Clase\b.*/i, ''),
  );

  if (!fallbackName || fallbackName.length < 4) {
    const secondary = text.match(new RegExp(`${fallbackCode}\\s*-\\s*([^\\n]+)`, 'i'));
    fallbackName = normalizeWhitespace(secondary?.[1] || '');
  }

  return {
    codigo: fallbackCode,
    nombre: fallbackName,
  };
}

async function waitForPeopleSoftNav(page, timeout = NAV_SETTLE_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const busy = await page
      .evaluate(() => Boolean(document.querySelector('#processing, .ps_box-loading, .psc_processing')))
      .catch(() => false);

    if (!busy) {
      return;
    }
  }
}

async function waitForFrame(page, predicate, timeoutMs = PAGE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const frames = page.frames();

    for (const frame of frames) {
      try {
        if (await predicate(frame)) {
          return frame;
        }
      } catch (_error) {
        // ignore and continue
      }
    }

    await page.waitForTimeout(300);
  }

  throw new Error('No se encontró el frame esperado.');
}

async function frameHasAnyText(frame, patterns) {
  const bodyText = normalizeWhitespace(
    await frame
      .locator('body')
      .textContent()
      .catch(() => ''),
  );

  if (!bodyText) {
    return false;
  }

  return patterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(bodyText) : bodyText.includes(pattern),
  );
}

async function readFrameBodyText(frame) {
  const text = await frame
    .locator('body')
    .textContent()
    .catch(() => '');

  return normalizeWhitespace(text);
}

function isScheduleAccessBlockedText(value = '') {
  const normalized = normalizeForCompare(value);

  return (
    normalized.includes('no tiene acceso al horario de clases en este momento') ||
    normalized.includes('no tiene acceso al horario de clases') ||
    normalized.includes('no access to class schedule')
  );
}

async function isScheduleAccessBlocked(frame) {
  const bodyText = await readFrameBodyText(frame);
  return isScheduleAccessBlockedText(bodyText);
}

async function clickFirstLinkInFrame(frame, patterns) {
  const links = await frame
    .locator('a')
    .evaluateAll((anchors) =>
      anchors
        .map((anchor, index) => ({
          href: anchor.href || '',
          index,
          text: (anchor.textContent || '').replace(/\s+/g, ' ').trim(),
        }))
        .filter((item) => item.text),
    )
    .catch(() => []);

  const target = links.find((link) => {
    const normalizedText = normalizeForCompare(link.text);
    const normalizedHref = normalizeForCompare(link.href);

    return patterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(link.text) || pattern.test(link.href);
      }

      const normalizedPattern = normalizeForCompare(pattern);
      return (
        normalizedText.includes(normalizedPattern) ||
        normalizedHref.includes(normalizedPattern)
      );
    });
  });

  if (!target) {
    return false;
  }

  await frame.locator('a').nth(target.index).click({ force: true }).catch(() => {});
  return true;
}

async function switchScheduleView(frame, viewPatterns) {
  const requestedList = viewPatterns.some((pattern) =>
    pattern instanceof RegExp
      ? pattern.test('vista listado list view')
      : /listado|list view/i.test(String(pattern)),
  );
  const requestedWeekly = viewPatterns.some((pattern) =>
    pattern instanceof RegExp
      ? pattern.test('vista horario semanal weekly')
      : /semanal|weekly/i.test(String(pattern)),
  );

  if (requestedList || requestedWeekly) {
    const changed = await frame
      .evaluate((mode) => {
        const listInput = document.getElementById('DERIVED_REGFRM1_SSR_SCHED_FORMAT');
        const weeklyInput = document.getElementById('DERIVED_REGFRM1_SSR_SCHED_FORMAT$11$');
        const trigger = document.getElementById('DERIVED_REGFRM1_SSR_PB_GO');
        const target = mode === 'weekly' ? weeklyInput : listInput;

        if (!target) {
          return false;
        }

        const alreadyChecked = Boolean(target.checked);
        target.click();

        if (trigger && !alreadyChecked) {
          trigger.click();
        }

        return true;
      }, requestedWeekly ? 'weekly' : 'list')
      .catch(() => false);

    if (changed) {
      await waitForPeopleSoftNav(frame.page(), PSOFT_SETTLE_MS);
      return true;
    }
  }

  const selectors = [
    'a',
    'button',
    'input[type="button"]',
    'input[type="submit"]',
    'label',
    'option',
  ];

  for (const selector of selectors) {
    const elements = await frame
      .locator(selector)
      .evaluateAll((nodes) =>
        nodes
          .map((node, index) => ({
            id: node.id || '',
            index,
            text: [node.textContent, node.value, node.getAttribute('aria-label')]
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim(),
          }))
          .filter((item) => item.text),
      )
      .catch(() => []);

    const target = elements.find((item) =>
      viewPatterns.some((pattern) =>
        pattern instanceof RegExp ? pattern.test(item.text) : normalizeForCompare(item.text).includes(normalizeForCompare(pattern)),
      ),
    );

    if (!target) {
      continue;
    }

    if (selector === 'option') {
      const optionLocator = frame.locator(selector).nth(target.index);
      const optionValue = await optionLocator.getAttribute('value').catch(() => null);
      if (optionValue) {
        const selectId = await optionLocator.evaluate((option) => option.parentElement?.id || null).catch(() => null);
        if (selectId) {
          await frame.selectOption(`#${selectId}`, optionValue).catch(() => {});
          await waitForPeopleSoftNav(frame.page(), PSOFT_SETTLE_SHORT_MS);
          return true;
        }
      }
      continue;
    }

    await frame.locator(selector).nth(target.index).click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(frame.page(), PSOFT_SETTLE_SHORT_MS);
    return true;
  }

  return false;
}

async function loginToCIA(page, user, password) {
  await gotoWithRetry(page, CIA_ENTRY_URL, {
    timeout: CIA_LOGIN_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });

  await page.locator('#txtITSONET').fill(user).catch(() => {});
  await page.locator('#btnConexionTrayectorias').click().catch(() => {});

  // The ITSONET step lands either on an intermediate "Continuar" page or
  // directly on the PeopleSoft login form; wait for whichever shows first.
  await Promise.race([
    page.getByRole('button', { name: /continuar/i }).first().waitFor({ state: 'visible', timeout: PSOFT_SETTLE_SHORT_MS }),
    page.locator('#userid').waitFor({ state: 'visible', timeout: PSOFT_SETTLE_SHORT_MS }),
  ]).catch(() => {});

  const continueButton = page.getByRole('button', { name: /continuar/i }).first();
  if (await continueButton.count().catch(() => 0)) {
    await continueButton.click().catch(() => {});
  }

  await page.locator('#userid').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
  await page.locator('#userid').fill(user);
  await page.locator('#pwd').fill(password);
  await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click();

  await page.waitForLoadState('domcontentloaded', { timeout: CIA_LOGIN_TIMEOUT_MS }).catch(() => {});
  await page
    .getByRole('link', { name: /autoservicio/i })
    .last()
    .waitFor({ state: 'visible', timeout: NAV_SETTLE_TIMEOUT_MS })
    .catch(() => {});

  const autoservicioLink = page.getByRole('link', { name: /autoservicio/i }).last();
  if (!(await autoservicioLink.count().catch(() => 0))) {
    console.error('Inicio de sesión fallido en CIA');
    return buildHorarioError('Credenciales CIA inválidas o no configuradas.');
  }

  return null;
}

async function tryExtractStudentName(page) {
  const selectors = [
    '#ctl00_cLabel_nombre',
    '.user-name',
    '#user-name',
    '[id*="Nombre"],[id*="nombre"],[class*="username"]',
    '.navbar-text',
    'span[id*="Name"]',
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);

      if (!element) {
        continue;
      }

      const text = normalizeWhitespace(await element.textContent());
      if (text.length > 3 && /\s/.test(text) && !/\d{5,}/.test(text)) {
        return text;
      }
    } catch (_error) {
      // Continue with the next selector.
    }
  }

  try {
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const match = bodyText.match(/[Bb]ienvenid[oa],?\s+([A-ZÁÉÍÓÚ][a-záéíóú][\w\sÁÉÍÓÚáéíóú]{3,50})/);
    if (match) {
      return normalizeWhitespace(match[1]);
    }
  } catch (_error) {
    // Silent fallback.
  }

  return null;
}

async function persistStudentNameFromCIA(page) {
  const nombre = await tryExtractStudentName(page);

  if (!nombre) {
    return;
  }

  try {
    const { saveStudentName } = require('./settings');
    await saveStudentName(nombre);
  } catch (_error) {
    // Student name persistence must never block horario scraping.
  }
}

async function getTargetContentFrame(page, timeout = FRAME_TIMEOUT_MS) {
  return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
}

async function clickHorarioEntry(page) {
  const targetFrame = await getTargetContentFrame(page, FRAME_TIMEOUT_MS);
  const targetLink = targetFrame.locator('a', { hasText: /mi horario de clases|class schedule|horario de clases/i }).first();

  if (await targetLink.count().catch(() => 0)) {
    await targetLink.click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(page, PSOFT_SETTLE_MS);
  }

  const alreadyOpened = page.frames().some(
    (frame) => frame.name() === 'TargetContent' && /SSR_SSENRL_LIST/i.test(frame.url()),
  );

  if (alreadyOpened) {
    return;
  }

  const navFrame = await waitForFrame(
    page,
    async (frame) => frame.name() === 'NAV',
    FRAME_TIMEOUT_MS,
  );

  const centerLink = navFrame.locator('a', { hasText: /centro de alumnado|student center/i }).first();
  if (await centerLink.count().catch(() => 0)) {
    await centerLink.click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(page, PSOFT_SETTLE_MS);
  }

  const scheduleLink = navFrame.locator('a', { hasText: /mi horario de clases|class schedule|horario de clases/i }).first();
  if (await scheduleLink.count().catch(() => 0)) {
    await scheduleLink.click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(page, PSOFT_SETTLE_MS);
  }
}

async function openHorarioPage(page) {
  const autoservicioLink = page.getByRole('link', { name: /autoservicio/i }).last();
  await autoservicioLink.click().catch(() => {});
  await waitForPeopleSoftNav(page, 20_000);
  await clickHorarioEntry(page);
  await waitForPeopleSoftNav(page, 20_000);

  const frame = await waitForFrame(
    page,
    async (frame) =>
      frame.name() === 'TargetContent' &&
      (/SSR_SSENRL_LIST/i.test(frame.url()) ||
        (await frameHasAnyText(frame, [/vista listado/i, /vista horario semanal/i, /class schedule/i]))),
    30_000,
  );
  return frame;
}

async function collectIdentifiersFromListView(scheduleFrame) {
  await switchScheduleView(scheduleFrame, [/vista listado/i, /list view/i]);
  await waitForPeopleSoftNav(scheduleFrame.page(), SELECTOR_TIMEOUT_MS);

  const rawEntries = await scheduleFrame
    .evaluate(() => {
      const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
      const tables = Array.from(document.querySelectorAll('table[id^="CLASS_MTG_VW$scroll$"]'));

      return tables.flatMap((table) => {
        let container = table;
        for (let index = 0; index < 8 && container; index += 1) {
          container = container.parentElement;
        }

        const containerText = normalize(container?.textContent || '');
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);

        return rows
          .map((row) =>
            Array.from(row.querySelectorAll('td')).map((cell) => normalize(cell.textContent || '')),
          )
          .filter((cells) => cells.some(Boolean))
          .map((cells) => ({
            containerText,
            numeroClase: cells[0] || '',
            seccion: cells[1] || '',
            componente: cells[2] || '',
            diasHoras: cells[3] || '',
            ubicacion: cells[4] || cells.find((value) => /[A-Z]{2,3}\d{3,4}/.test(value)) || '',
            instructor:
              cells[5] ||
              cells
                .slice(4)
                .find(
                  (value) =>
                    value &&
                    !/\d{1,2}:\d{2}/i.test(value) &&
                    !/curso a distancia|aulas?|centro integral|edificio/i.test(value) &&
                    !/[A-Z]{2,3}\d{3,4}/.test(value),
                ) ||
              '',
            fechaRango: cells[6] || '',
          }));
      });
    })
    .catch(() => []);

  const entries = rawEntries.map((entry) => {
    const { codigo, nombre } = extractCourseFromContext(entry.containerText);
    const hora = parseTimeRange(entry.diasHoras);
    const days = parseDays(entry.diasHoras);
    // Solo la ubicación y el componente de ESTA fila. `containerText` es el
    // bloque entero de la clase e incluye todas sus filas de reunión: si
    // cualquiera dice "curso a distancia", meterlo acá marcaba remotas también
    // a las filas presenciales.
    const modalidad = inferModalidad(`${entry.ubicacion} ${entry.componente}`);

    let horaInicio = hora.horaInicio;
    let horaFin = hora.horaFin;

    if (horaInicio && horaFin && horaFin <= horaInicio) {
      [horaInicio, horaFin] = [horaFin, horaInicio];
    }

    return {
      codigo,
      nombre: nombre || codigo || 'Materia sin nombre',
      seccion: entry.seccion || '',
      numeroClase: entry.numeroClase || '',
      dias: days,
      horaInicio,
      horaFin,
      modalidad,
      ubicacion: entry.ubicacion || (modalidad === 'en_linea' ? 'Remoto' : ''),
      instructor: normalizeWhitespace(entry.instructor || ''),
      meetLink: null,
      linkManual: false,
    };
  });

  const uniqueEntries = uniqueByKey(
    entries.filter((entry) => entry.numeroClase || entry.codigo || entry.nombre),
    (entry) => entry.numeroClase || `${entry.codigo}-${entry.seccion}-${entry.horaInicio || 'na'}`,
  );
  return uniqueEntries;
}

function combineScheduleRows(rows, identifiers) {
  const identifierIndex = new Map();

  identifiers.forEach((item) => {
    const keyCandidates = [
      item.numeroClase,
      item.codigo,
      item.nombre,
      item.codigo && item.seccion ? `${item.codigo}-${item.seccion}` : '',
    ]
      .map((value) => normalizeForCompare(value))
      .filter(Boolean);

    keyCandidates.forEach((key) => {
      if (!identifierIndex.has(key)) {
        identifierIndex.set(key, item);
      }
    });
  });

  const merged = new Map();

  rows.forEach((row) => {
    const rowKeys = [
      row.numeroClase,
      row.codigo,
      row.nombre,
      row.codigo && row.seccion ? `${row.codigo}-${row.seccion}` : '',
    ]
      .map((value) => normalizeForCompare(value))
      .filter(Boolean);

    let matched = null;

    for (const key of rowKeys) {
      if (identifierIndex.has(key)) {
        matched = identifierIndex.get(key);
        break;
      }
    }

    const base = {
      codigo: row.codigo || matched?.codigo || '',
      nombre: row.nombre || matched?.nombre || row.codigo || 'Materia sin nombre',
      seccion: row.seccion || matched?.seccion || '',
      numeroClase: row.numeroClase || matched?.numeroClase || '',
      dias: Array.isArray(row.dias) ? row.dias : [],
      horaInicio: row.horaInicio || null,
      horaFin: row.horaFin || null,
      modalidad: row.modalidad || inferModalidad(row.rawText || ''),
      ubicacion:
        row.ubicacion ||
        ((row.modalidad || inferModalidad(row.rawText || '')) === 'en_linea' ? 'Remoto' : ''),
      instructor: row.instructor || '',
      meetLink: row.meetLink || null,
      linkManual: false,
    };

    const key = base.numeroClase || `${base.codigo}-${base.seccion}-${base.horaInicio}-${base.horaFin}`;

    if (!merged.has(key)) {
      merged.set(key, base);
      return;
    }

    const previous = merged.get(key);
    const days = new Set([...(previous.dias || []), ...(base.dias || [])]);
    // Mismo criterio que en la vista semanal: modalidades distintas producen
    // 'mixta', no 'en_linea'. Dejar ganar a en_linea marcaba como remota una
    // materia con días presenciales.
    const modalidadCombinada =
      previous.modalidad && base.modalidad && previous.modalidad !== base.modalidad
        ? 'mixta'
        : previous.modalidad || base.modalidad;
    merged.set(key, {
      ...previous,
      ...base,
      dias: DAY_ORDER.filter((day) => days.has(day)),
      instructor: previous.instructor || base.instructor,
      ubicacion:
        modalidadCombinada === 'en_linea'
          ? previous.ubicacion || base.ubicacion || 'Remoto'
          : previous.ubicacion || base.ubicacion,
      modalidad: modalidadCombinada,
      meetLink: previous.meetLink || base.meetLink || null,
    });
  });

  return [...merged.values()];
}

function convertTo24h(timeStr) {
  const normalized = normalizeWhitespace(timeStr).toUpperCase();
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    return parseTimeTo24h(normalized) || '00:00';
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  }

  if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function normalizeWeeklyCode(raw = '') {
  const cleaned = normalizeWhitespace(raw)
    .replace(/^[A-Z]/, '')
    .replace(/\s+/g, '')
    .toUpperCase();
  return cleaned;
}

function pickBetterLocation(current, next, modal = 'presencial') {
  if (modal === 'en_linea') {
    return 'Remoto';
  }

  const currentNormalized = normalizeWhitespace(current);
  const nextNormalized = normalizeWhitespace(next);
  const currentRoom = currentNormalized.match(/[A-Z]{2,3}\d{3,4}/)?.[0] || '';
  const nextRoom = nextNormalized.match(/[A-Z]{2,3}\d{3,4}/)?.[0] || '';

  if (nextRoom) {
    return nextRoom;
  }

  if (currentRoom) {
    return currentRoom;
  }

  if (nextNormalized && !/^(aulas?|remoto)$/i.test(nextNormalized)) {
    return nextNormalized;
  }

  if (currentNormalized) {
    return currentNormalized;
  }

  return 'Aulas';
}

function deriveDaysFromSessions(materia) {
  const sessionDays = Array.isArray(materia?.sesiones)
    ? materia.sesiones.flatMap((session) => (Array.isArray(session?.dias) ? session.dias : []))
    : [];

  if (!sessionDays.length) {
    return getFriendlyDayOrder(Array.isArray(materia?.dias) ? materia.dias : []);
  }

  const uniqueDays = [...new Set(sessionDays.map((day) => normalizeWhitespace(day)).filter(Boolean))];
  return uniqueDays.sort((left, right) => DAY_ORDER.indexOf(left) - DAY_ORDER.indexOf(right));
}

async function collectWeeklySchedule(scheduleFrame, identifiers) {
  const normalizedIdentifiers = Array.isArray(identifiers) ? identifiers : [];

  await switchScheduleView(scheduleFrame, [
    /vista horario semanal/i,
    /weekly schedule/i,
    /weekly calendar view/i,
    /semanal/i,
  ]);
  await waitForPeopleSoftNav(scheduleFrame.page(), SELECTOR_TIMEOUT_MS);
  const rawRows = await scheduleFrame
    .evaluate(() => {
      const table = document.querySelector('#STDNT_CLASS_TIM\\$scroll\\$0');
      if (!table) return [];

      const COLS_TO_DAY = {
        1: 'Lunes',
        2: 'Martes',
        3: 'Miércoles',
        4: 'Jueves',
        5: 'Viernes',
        6: 'Sábado',
        7: 'Domingo',
      };

      const convertTo24hLocal = (timeStr) => {
        const match = String(timeStr || '').match(/(\d+):(\d+)(AM|PM)/i);
        if (!match) return '00:00';
        let hours = Number.parseInt(match[1], 10);
        const minutes = match[2];
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      };

      const spans = Array.from(
        document.querySelectorAll('#STDNT_CLASS_TIM\\$scroll\\$0 span.PSLEVEL1GRIDACTIVETAB'),
      );

      const entries = [];

      spans.forEach((span) => {
        const td = span.closest('td');
        const tr = td?.closest('tr');
        if (!td || !tr) return;

        const rowCells = Array.from(tr.children);
        let logicalCol = 0;
        let startCol = -1;
        let spanCols = 1;
        for (const rowCell of rowCells) {
          const colSpan = Number.parseInt(rowCell.getAttribute('colspan') || '1', 10) || 1;
          if (rowCell === td) {
            startCol = logicalCol;
            spanCols = colSpan;
            break;
          }
          logicalCol += colSpan;
        }

        if (startCol < 0) return;
        const dayNames = [];
        for (let offset = 0; offset < spanCols; offset += 1) {
          const maybeDay = COLS_TO_DAY[startCol + offset];
          if (maybeDay) dayNames.push(maybeDay);
        }
        const uniqueDays = [...new Set(dayNames)];
        if (uniqueDays.length === 0) return;

        const rawHtml = span.innerHTML || '';
        const blocks = rawHtml
          .split(/<br\s*\/?>(?:\s|&nbsp;|&#160;)*<br\s*\/?>/i)
          .map((block) =>
            block
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim(),
          )
          .filter((block) => block.length > 0);

        blocks.forEach((block) => {
          const lines = block
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
          if (lines.length < 2) return;

          const codigoMatch = lines[0].match(/^(.+?)\s*-\s*(\d+)$/i);
          if (!codigoMatch) return;
          const leftCode = codigoMatch[1].trim();
          const extractedCode =
            leftCode.match(/([A-Z]\s*\d{4}[A-Z])$/i)?.[1] ||
            leftCode.match(/(\d{4}[A-Z])$/i)?.[1] ||
            leftCode;
          const codigoRaw = extractedCode.replace(/\s+/g, '');
          const seccion = codigoMatch[2];

          const horaLine = lines.find((line) =>
            /\d+:\d+(?:AM|PM)\s*-\s*\d+:\d+(?:AM|PM)/i.test(line),
          );
          if (!horaLine) return;

          const horaMatch = horaLine.match(
            /(\d+:\d+(?:AM|PM))\s*-\s*(\d+:\d+(?:AM|PM))/i,
          );
          if (!horaMatch) return;

          const horaInicio = convertTo24hLocal(horaMatch[1]);
          const horaFin = convertTo24hLocal(horaMatch[2]);
          if (horaFin <= horaInicio) return;

          const componenteLine = lines.find((line) =>
            /^(Teoria|Laboratorio|Clase|Taller|Seminario)$/i.test(line),
          );
          const componente = componenteLine || 'Teoria';

          const ubicacionLines = lines.filter(
            (line) =>
              line !== lines[0] &&
              !/\d+:\d+(?:AM|PM)/i.test(line) &&
              !/^(Teoria|Laboratorio|Clase|Taller|Seminario)$/i.test(line),
          );
          const ubicacionText = ubicacionLines.join(' ').trim();
          const esEnLinea = /curso a distancia|herramientas de internet/i.test(
            ubicacionText,
          );
          const salonMatch = ubicacionText.match(/[A-Z]{2,3}\d{3,4}/);
          const ubicacion = salonMatch
            ? salonMatch[0]
            : esEnLinea
              ? 'Remoto'
              : ubicacionText || 'Aulas';

          // La grilla de PeopleSoft emite celdas duplicadas para la misma clase,
          // y algunas copias vienen SIN texto de ubicación. En esas, `esEnLinea`
          // sale false solo porque no había texto donde buscar "curso a
          // distancia" — no porque la clase sea presencial. Marcarlas para que
          // el merge no las deje votar la modalidad: una clase remota traía
          // copias vacías y terminaba clasificada como mixta.
          const tieneEvidenciaModalidad = Boolean(ubicacionText);

          entries.push({
            codigoRaw,
            seccion,
            componente,
            horaInicio,
            horaFin,
            dias: uniqueDays,
            ubicacion,
            tieneEvidenciaModalidad,
            esEnLinea,
          });
        });
      });

      return entries;
    })
    .catch(() => []);

  return mergeWeeklyRows(rawRows, normalizedIdentifiers);
}

// Merge puro de las filas de la grilla semanal contra los identificadores del
// listado de clases. Extraído de collectWeeklySchedule para poder testear la
// resolución de modalidad sin levantar Playwright ni PeopleSoft.
function mergeWeeklyRows(rawRows, identifiers) {
  const normalizedIdentifiers = Array.isArray(identifiers) ? identifiers : [];

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    console.log('No se encontraron clases en la vista semanal de horario.');
    return normalizedIdentifiers;
  }

  const byCode = new Map();
  const blocksByCode = new Map();
  rawRows.forEach((row) => {
    const key = normalizeWeeklyCode(row.codigoRaw);
    if (!key) return;
    if (!blocksByCode.has(key)) {
      blocksByCode.set(key, []);
    }
    blocksByCode.get(key).push(row);
  });

  blocksByCode.forEach((blocks, key) => {
    blocks.forEach((row) => {
      const rowDays = getFriendlyDayOrder(Array.isArray(row.dias) ? row.dias : []);

      // Una fila sin texto de ubicación no aporta evidencia de modalidad: se
      // suma a los días de una sesión existente pero nunca crea una nueva ni
      // vota la modalidad de la materia.
      const rowTieneEvidencia = row.tieneEvidenciaModalidad !== false;
      const rowModalidad = row.esEnLinea ? 'en_linea' : 'presencial';
      const rowUbicacion = row.esEnLinea ? 'Remoto' : row.ubicacion;

      if (!byCode.has(key)) {
        byCode.set(key, {
          codigoRaw: row.codigoRaw,
          codigo: key,
          secciones: new Set(),
          componentes: new Set(),
          dias: new Set(rowDays),
          horaInicio: row.horaInicio,
          horaFin: row.horaFin,
          ubicacion: rowUbicacion,
          // Sin evidencia la materia arranca sin modalidad; la primera fila que
          // sí la traiga la define.
          modalidad: rowTieneEvidencia ? rowModalidad : null,
          sesiones: rowTieneEvidencia
            ? [
                {
                  dias: rowDays,
                  horaInicio: row.horaInicio,
                  horaFin: row.horaFin,
                  modalidad: rowModalidad,
                  ubicacion: rowUbicacion,
                },
              ]
            : [],
        });
      }

      const current = byCode.get(key);
      current.secciones.add(row.seccion);
      current.componentes.add(normalizeWhitespace(row.componente));
      rowDays.forEach((day) => current.dias.add(day));

      // Modalidad a nivel materia: si las filas CON evidencia no coinciden
      // entre sí, la materia es mixta. Antes `en_linea` pisaba a `presencial`,
      // que era el origen del bug — una clase con un solo día remoto se marcaba
      // entera como remota y el usuario no se presentaba a los días
      // presenciales.
      if (rowTieneEvidencia) {
        if (!current.modalidad) {
          current.modalidad = rowModalidad;
        } else if (current.modalidad !== 'mixta' && current.modalidad !== rowModalidad) {
          current.modalidad = 'mixta';
        }

        // Con modalidad mixta el "mejor salón" a nivel materia deja de tener
        // sentido: cada sesión lleva el suyo. Se conserva el primero presencial
        // como referencia para vistas que aún leen el campo plano.
        if (!row.esEnLinea) {
          current.ubicacion = pickBetterLocation(current.ubicacion, row.ubicacion, 'presencial');
        } else if (current.modalidad === 'en_linea') {
          current.ubicacion = 'Remoto';
        }
      }

      // La identidad de una sesión es (horario, modalidad) — NO solo el horario.
      // Una materia puede dar el mismo bloque horario presencial unos días y
      // remoto otros (visto en 1148C Bases de Datos: Lun/Mié en LM0712, Vie a
      // distancia). Agrupando solo por hora, esos días caían en la misma sesión
      // y la modalidad del último ganaba.
      //
      // La ubicación NO entra en la identidad: es un atributo que se refina con
      // pickBetterLocation. PeopleSoft emite copias de la misma celda con el
      // salón vacío, y tratarlas como sesión aparte duplicaba todo el horario.
      const matchesTime = (session) =>
        minutesDiff(row.horaInicio, session.horaInicio) <= 120 &&
        minutesDiff(row.horaFin, session.horaFin) <= 120;

      const existingSession = rowTieneEvidencia
        ? (current.sesiones || []).find(
            (session) => matchesTime(session) && (session.modalidad || 'presencial') === rowModalidad,
          )
        : // Sin evidencia solo aporta días: se pega a cualquier sesión del mismo
          // horario, sin importar su modalidad.
          (current.sesiones || []).find(matchesTime);

      if (!existingSession) {
        // Una fila sin evidencia no puede inaugurar una sesión: haría aparecer
        // un bloque presencial fantasma en una materia enteramente remota.
        if (!rowTieneEvidencia) return;

        current.sesiones.push({
          dias: rowDays,
          horaInicio: row.horaInicio,
          horaFin: row.horaFin,
          modalidad: rowModalidad,
          ubicacion: rowUbicacion,
        });
        return;
      }

      const mergedDays = new Set([...(existingSession.dias || []), ...rowDays]);
      existingSession.dias = DAY_ORDER.filter((day) => mergedDays.has(day));

      const hasDifferentSchedule = minutesDiff(row.horaInicio, existingSession.horaInicio) > 120;

      if (!hasDifferentSchedule) {
        if (row.horaInicio && (!existingSession.horaInicio || row.horaInicio < existingSession.horaInicio)) {
          existingSession.horaInicio = row.horaInicio;
        }
        if (row.horaFin && (!existingSession.horaFin || row.horaFin > existingSession.horaFin)) {
          existingSession.horaFin = row.horaFin;
        }
      }

      // La sesión matcheada ya tiene la misma modalidad (es parte de su clave
      // de identidad), así que acá solo queda refinar el salón cuando la fila
      // trae una etiqueta mejor y realmente sabe algo.
      if (!row.esEnLinea && rowTieneEvidencia) {
        existingSession.ubicacion = pickBetterLocation(
          existingSession.ubicacion,
          row.ubicacion,
          existingSession.modalidad || 'presencial',
        );
      }
    });
  });

  const identifierByCode = new Map();
  normalizedIdentifiers.forEach((item) => {
    const key = normalizeWeeklyCode(item.codigo || '');
    if (!key) return;
    if (!identifierByCode.has(key)) {
      identifierByCode.set(key, []);
    }
    identifierByCode.get(key).push(item);
  });

  const merged = [...byCode.values()].map((item) => {
    const matches = identifierByCode.get(item.codigo) || [];
    const byComponent = matches.find(
      (entry) =>
        entry.componente &&
        [...item.componentes].some((comp) =>
          normalizeForCompare(entry.componente).includes(normalizeForCompare(comp)),
        ),
    );
    const main = byComponent || matches[0] || {};
    const fallbackName = main.nombre || main.codigo || `Materia ${item.codigo}`;
    const mainInstructor =
      matches.find((entry) => normalizeWhitespace(entry.instructor || ''))?.instructor ||
      main.instructor ||
      '';

    const sessions = (Array.isArray(item.sesiones) ? item.sesiones : [])
      .map((session) => {
        const normalizedDays = DAY_ORDER.filter((day) =>
          new Set(getFriendlyDayOrder(session.dias || [])).has(day),
        );
        if (!session.horaInicio || !session.horaFin || session.horaFin <= session.horaInicio) {
          return null;
        }
        const sessionModalidad =
          session.modalidad === 'en_linea'
            ? 'en_linea'
            : inferModalidad(`${session.ubicacion || ''} ${fallbackName}`);

        return {
          dias: normalizedDays,
          horaInicio: session.horaInicio,
          horaFin: session.horaFin,
          modalidad: sessionModalidad,
          ubicacion:
            sessionModalidad === 'en_linea'
              ? 'Remoto'
              : pickBetterLocation('', session.ubicacion || '', sessionModalidad),
        };
      })
      .filter((session) => session && session.dias.length > 0);

    const firstSession =
      sessions[0] ||
      (item.horaInicio && item.horaFin
        ? {
            dias: getFriendlyDayOrder([...item.dias]),
            horaInicio: item.horaInicio,
            horaFin: item.horaFin,
            modalidad: item.modalidad === 'en_linea' ? 'en_linea' : 'presencial',
            ubicacion: item.modalidad === 'en_linea' ? 'Remoto' : item.ubicacion,
          }
        : null);

    // Modalidad de la materia derivada de sus sesiones ya resueltas: si no
    // todas coinciden, es 'mixta'. Nunca colapsar a 'en_linea' porque una sola
    // sesión sea remota — eso oculta los días presenciales.
    const sessionModalidades = new Set(sessions.map((session) => session.modalidad));
    const modalidad =
      sessionModalidades.size > 1
        ? 'mixta'
        : sessionModalidades.size === 1
          ? [...sessionModalidades][0]
          : item.modalidad === 'en_linea'
            ? 'en_linea'
            : inferModalidad(`${item.ubicacion} ${fallbackName}`);
    const ubicacion =
      modalidad === 'en_linea'
        ? 'Remoto'
        : pickBetterLocation(main.ubicacion || '', item.ubicacion || '', modalidad);
    const daysSet = new Set(item.dias);
    sessions.forEach((session) => (session.dias || []).forEach((day) => daysSet.add(day)));
    matches.forEach((entry) => {
      (entry.dias || []).forEach((day) => daysSet.add(day));
    });

    // Una sesión nunca hereda 'mixta': eso es un agregado de la materia, no una
    // modalidad que una sesión concreta pueda tener. Sin modalidad propia cae a
    // 'presencial', que es el default seguro (mandar al alumno al salón es
    // recuperable; decirle "es remoto" y que falte, no).
    const sessionFallbackModalidad = modalidad === 'mixta' ? 'presencial' : modalidad;
    const normalizedSessions = (firstSession ? [firstSession, ...sessions.slice(1)] : sessions).map(
      (session) => {
        const sessionModalidad = session.modalidad || sessionFallbackModalidad;
        return {
          ...session,
          modalidad: sessionModalidad,
          ubicacion:
            sessionModalidad === 'en_linea'
              ? 'Remoto'
              : pickBetterLocation('', session.ubicacion || ubicacion, sessionModalidad),
        };
      },
    );

    return {
      codigo: item.codigo,
      nombre: fallbackName,
      seccion: main.seccion || [...item.secciones][0] || '',
      numeroClase: main.numeroClase || '',
      dias: DAY_ORDER.filter((day) => daysSet.has(day)),
      horaInicio: firstSession?.horaInicio || item.horaInicio,
      horaFin: firstSession?.horaFin || item.horaFin,
      modalidad,
      ubicacion,
      instructor: normalizeWhitespace(mainInstructor),
      sesiones: normalizedSessions,
      meetLink: null,
      linkManual: false,
    };
  });

  const mergedByCode = new Map(
    merged.map((entry) => [normalizeWeeklyCode(entry.codigo), entry]),
  );

  normalizedIdentifiers.forEach((entry) => {
    const key = normalizeWeeklyCode(entry.codigo || '');
    if (!key || mergedByCode.has(key)) {
      return;
    }

    const modalidad = entry.modalidad || inferModalidad(`${entry.ubicacion} ${entry.nombre}`);
    const ubicacion = modalidad === 'en_linea' ? 'Remoto' : pickBetterLocation('', entry.ubicacion || '', modalidad);
    if (!entry.horaInicio || !entry.horaFin || entry.horaFin <= entry.horaInicio) {
      return;
    }

    mergedByCode.set(key, {
      codigo: key,
      nombre: entry.nombre || `Materia ${key}`,
      seccion: entry.seccion || '',
      numeroClase: entry.numeroClase || '',
      dias: DAY_ORDER.filter((day) => new Set(entry.dias || []).has(day)),
      horaInicio: entry.horaInicio,
      horaFin: entry.horaFin,
      modalidad,
      ubicacion,
      instructor: normalizeWhitespace(entry.instructor || ''),
      sesiones: [
        {
          dias: DAY_ORDER.filter((day) => new Set(entry.dias || []).has(day)),
          horaInicio: entry.horaInicio,
          horaFin: entry.horaFin,
          modalidad,
          ubicacion,
        },
      ],
      meetLink: null,
      linkManual: false,
    });
  });

  const result = [...mergedByCode.values()]
    .map((materia) => ({
      ...materia,
      dias: deriveDaysFromSessions(materia),
    }))
    .filter(
    (row) =>
      row.codigo &&
      row.horaInicio &&
      row.horaFin &&
      row.horaFin > row.horaInicio &&
      Array.isArray(row.dias) &&
      row.dias.length > 0,
  );
  return result;
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function loginToIVirtual(context, user, password) {
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  await gotoWithRetry(page, IVIRTUAL_LOGIN_URL, {
    timeout: 45_000,
    waitUntil: 'domcontentloaded',
  });

  await page.fill('#username', user);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {}),
    page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
  ]);
  await page.waitForTimeout(1200);

  await applyResourceBlocking(page);
  await gotoWithRetry(page, IVIRTUAL_DASHBOARD_URL, {
    timeout: 45_000,
    waitUntil: 'domcontentloaded',
  });

  if (page.url().includes('/login/')) {
    await page.close().catch(() => {});
    console.error('Inicio de sesión fallido en iVirtual');
    return { success: false, error: 'No fue posible iniciar sesión en iVirtual para buscar enlaces.' };
  }

  return { success: true, page };
}

function findMeetLinkInUrls(urls) {
  for (const pattern of MEET_PATTERNS) {
    const match = urls.find((url) => pattern.test(url));
    if (match) {
      return match;
    }
  }

  return null;
}

function normalizeCourseNameForMatch(value) {
  return normalizeForCompare(value)
    .replace(/sistemas?/g, 'sist')
    .replace(/operativos?/g, 'oper')
    .replace(/oper\./g, 'oper')
    .replace(/arquit(?:ectura|\.?)/g, 'arq')
    .replace(/computadoras?/g, 'comp')
    .replace(/comp(?:utacion|utadora|\.?)/g, 'comp')
    .replace(/tecnologia/g, 'tec')
    .replace(/empresa/g, 'emp')
    .replace(/matematicas?/g, 'mat')
    .replace(/discretas?/g, 'disc')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCourseNameMatch(left, right) {
  const normalizedLeft = normalizeCourseNameForMatch(left);
  const normalizedRight = normalizeCourseNameForMatch(right);

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return 1;
  }

  const leftTokens = normalizedLeft.split(' ').filter((token) => token.length >= 3);
  const rightTokens = normalizedRight.split(' ').filter((token) => token.length >= 3);

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const rightTokenSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightTokenSet.has(token));

  if (!overlap.length) {
    return 0;
  }

  const coverage = overlap.length / Math.max(leftTokens.length, rightTokens.length);
  const normalizedDistanceBonus =
    overlap.length / Math.min(leftTokens.length, rightTokens.length);

  return Math.max(coverage, normalizedDistanceBonus * 0.75);
}

function areNamesRelated(left, right) {
  const score = scoreCourseNameMatch(left, right);
  if (score >= 0.3) {
    return true;
  }

  return false;
}

async function collectCourseLinks(dashboardPage) {
  return dashboardPage
    .locator('a[href*="/course/view.php?id="]')
    .evaluateAll((anchors) => {
      const seen = new Set();

      return anchors
        .map((anchor) => ({
          name: (anchor.textContent || '').replace(/\s+/g, ' ').trim(),
          url: anchor.href,
        }))
        .filter((item) => {
          if (!item.name || !item.url) {
            return false;
          }

          if (seen.has(item.url)) {
            return false;
          }

          seen.add(item.url);
          return true;
        });
    })
    .catch(() => []);
}

function pickBestCourseMatch(courses, materia) {
  const query = materia.nombre || materia.codigo || '';
  const scored = courses
    .map((course) => ({
      ...course,
      score: scoreCourseNameMatch(course.name, query),
    }))
    .sort((left, right) => right.score - left.score);

  return scored[0]?.score >= 0.3 ? scored[0] : null;
}

function normalizeCandidateUrl(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^(meet\.google\.com|zoom\.us|teams\.microsoft\.com)\//i.test(normalized)) {
    return `https://${normalized}`;
  }

  return null;
}

function pickFirstVideoLink(candidates) {
  const normalized = (Array.isArray(candidates) ? candidates : [])
    .map((candidate) => normalizeCandidateUrl(candidate))
    .filter(Boolean);

  return findMeetLinkInUrls([...new Set(normalized)]);
}

async function collectVideoCandidatesFromPage(page, courseOrigin = '') {
  const candidates = await page
    .evaluate(() => {
      const unique = (values) => [...new Set(values.filter(Boolean))];
      const hrefs = Array.from(document.querySelectorAll('a[href]'))
        .map((anchor) => anchor.href)
        .filter((href) =>
          /meet\.google\.com/i.test(href) ||
          /zoom\.us\/j\//i.test(href) ||
          /teams\.microsoft\.com\/l\/meetup/i.test(href),
        );

      const bodyText = document.body?.innerText || '';
      const meetMatches = [...bodyText.matchAll(/https?:\/\/meet\.google\.com\/[a-z0-9][a-z0-9\-]{2,}/gi)].map(
        (match) => match[0],
      );
      const zoomMatches = [...bodyText.matchAll(/https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9?&=_-]+/gi)].map(
        (match) => match[0],
      );
      const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
        (match) => match[0],
      );
      const dataAttrs = Array.from(
        document.querySelectorAll('[data-url],[data-href],[data-link]'),
      )
        .map(
          (element) =>
            element.getAttribute('data-url') ||
            element.getAttribute('data-href') ||
            element.getAttribute('data-link') ||
            '',
        )
        .filter((value) => /meet\.google\.com|zoom\.us|teams\.microsoft/i.test(value));

      return unique([...hrefs, ...meetMatches, ...zoomMatches, ...teamsMatches, ...dataAttrs, window.location.href]);
    })
    .catch(() => []);

  const origin =
    courseOrigin ||
    (() => {
      try {
        return new URL(page.url()).origin;
      } catch (_error) {
        return '';
      }
    })();

  const frameCandidates = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) {
      continue;
    }

    const frameUrl = frame.url();
    if (!frameUrl || frameUrl === 'about:blank') {
      continue;
    }

    if (origin && !frameUrl.startsWith(origin)) {
      continue;
    }

    const frameMatches = await frame
      .evaluate(() => {
        const unique = (values) => [...new Set(values.filter(Boolean))];
        const hrefs = Array.from(document.querySelectorAll('a[href]'))
          .map((anchor) => anchor.href)
          .filter((href) =>
            /meet\.google\.com/i.test(href) ||
            /zoom\.us\/j\//i.test(href) ||
            /teams\.microsoft\.com\/l\/meetup/i.test(href),
          );

        const bodyText = document.body?.innerText || '';
        const meetMatches = [...bodyText.matchAll(/https?:\/\/meet\.google\.com\/[a-z0-9][a-z0-9\-]{2,}/gi)].map(
          (match) => match[0],
        );
        const zoomMatches = [...bodyText.matchAll(/https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9?&=_-]+/gi)].map(
          (match) => match[0],
        );
        const teamsMatches = [...bodyText.matchAll(/https?:\/\/teams\.microsoft\.com\/l\/meetup[^\s)"]+/gi)].map(
          (match) => match[0],
        );
        const dataAttrs = Array.from(
          document.querySelectorAll('[data-url],[data-href],[data-link]'),
        )
          .map(
            (element) =>
              element.getAttribute('data-url') ||
              element.getAttribute('data-href') ||
              element.getAttribute('data-link') ||
              '',
          )
          .filter((value) => /meet\.google\.com|zoom\.us|teams\.microsoft/i.test(value));

        return unique([...hrefs, ...meetMatches, ...zoomMatches, ...teamsMatches, ...dataAttrs]);
      })
      .catch(() => []);

    frameCandidates.push(...frameMatches);
  }

  return [...new Set([...(Array.isArray(candidates) ? candidates : []), ...frameCandidates])];
}

async function extractLinkFromPage(page, url, options = {}) {
  try {
    await gotoWithRetry(page, url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout || SELECTOR_TIMEOUT_MS,
    });

    const candidates = await collectVideoCandidatesFromPage(page, options.courseOrigin || '');
    return pickFirstVideoLink(candidates);
  } catch (_error) {
    return null;
  }
}

async function findMeetLinkInCourse(page, courseUrl) {
  const courseOrigin = (() => {
    try {
      return new URL(courseUrl).origin;
    } catch (_error) {
      return '';
    }
  })();

  try {
    await gotoWithRetry(page, courseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TIMEOUT_MS,
    });

    const layerOneCandidates = await collectVideoCandidatesFromPage(page, courseOrigin);
    const layerOneMatch = pickFirstVideoLink(layerOneCandidates);
    if (layerOneMatch) {
      return { link: layerOneMatch, layer: 'CAPA_1_DOM' };
    }

    const courseIntroLink = await page
      .evaluate(() => {
        const intro = document.querySelector(
          '.course-description, #course-description, .summary, [data-region="course-description"]',
        );

        if (!intro) {
          return null;
        }

        const links = Array.from(intro.querySelectorAll('a[href]'))
          .map((anchor) => anchor.href)
          .filter((href) => /meet\.google\.com|zoom\.us|teams\.microsoft/i.test(href));

        return links[0] || null;
      })
      .catch(() => null);

    if (courseIntroLink) {
      return { link: courseIntroLink, layer: 'CAPA_5_INTRO' };
    }

    let remainingResources = MAX_DEEP_RESOURCES;
    const consumeResourceBudget = () => {
      if (remainingResources <= 0) {
        return false;
      }

      remainingResources -= 1;
      return true;
    };

    const detailPage = page;

    const allUrlResources = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/mod/url/view.php"]'))
          .map((anchor) => anchor.href),
      )
      .catch(() => []);

    for (const resourceUrl of allUrlResources.slice(0, 6)) {
      if (!consumeResourceBudget()) {
        break;
      }

      const link = await extractLinkFromPage(detailPage, resourceUrl, {
        timeout: SELECTOR_TIMEOUT_MS,
        courseOrigin,
      });

      if (link) {
        return { link, layer: 'CAPA_2_MOD_URL' };
      }
    }

    const pageResources = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/mod/page/view.php"]'))
          .map((anchor) => ({
            href: anchor.href,
            text: (anchor.textContent || '').trim(),
          }))
          .filter((resource) =>
            /meet|zoom|teams|videollamada|enlace|liga|remoto|clase|acceso|sesi[oó]n/i.test(
              resource.text,
            ),
          )
          .map((resource) => resource.href),
      )
      .catch(() => []);

    for (const pageUrl of pageResources.slice(0, 3)) {
      if (!consumeResourceBudget()) {
        break;
      }

      const link = await extractLinkFromPage(detailPage, pageUrl, {
        timeout: SELECTOR_TIMEOUT_MS,
        courseOrigin,
      });

      if (link) {
        return { link, layer: 'CAPA_3_MOD_PAGE' };
      }
    }

    const forumResources = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/mod/forum/view.php"]'))
          .map((anchor) => anchor.href),
      )
      .catch(() => []);

    for (const forumUrl of forumResources.slice(0, 2)) {
      if (!consumeResourceBudget()) {
        break;
      }

      try {
        await gotoWithRetry(detailPage, forumUrl, {
          waitUntil: 'domcontentloaded',
          timeout: SELECTOR_TIMEOUT_MS,
        });

        const firstDiscussion = await detailPage
          .evaluate(() => {
            const discussion = document.querySelector('a[href*="/mod/forum/discuss.php"]');
            return discussion ? discussion.href : null;
          })
          .catch(() => null);

        if (firstDiscussion && consumeResourceBudget()) {
          const link = await extractLinkFromPage(detailPage, firstDiscussion, {
            timeout: SELECTOR_TIMEOUT_MS,
            courseOrigin,
          });

          if (link) {
            return { link, layer: 'CAPA_4_FORUM' };
          }
        }
      } catch (_error) {
        // Continue with next resource.
      }
    }

    const assignResources = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/mod/assign/view.php"]'))
          .map((anchor) => ({
            href: anchor.href,
            text: (anchor.textContent || '').trim(),
          }))
          .filter((resource) =>
            /remoto|en.?l[ií]nea|sesi[oó]n|clase|meet|zoom|teams|videollamada|acceso|liga/i.test(
              resource.text,
            ),
          )
          .map((resource) => resource.href)
          .slice(0, 3),
      )
      .catch(() => []);

    for (const assignUrl of assignResources) {
      if (!consumeResourceBudget()) {
        break;
      }

      const link = await extractLinkFromPage(detailPage, assignUrl, {
        timeout: SELECTOR_TIMEOUT_MS,
        courseOrigin,
      });

      if (link) {
        return { link, layer: 'CAPA_6_MOD_ASSIGN' };
      }
    }

    // CAPA_7 removed: duplicate of CAPA_4 forum scan above.

    const bookResources = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/mod/book/view.php"]'))
          .map((anchor) => ({
            href: anchor.href,
            text: (anchor.textContent || '').trim(),
          }))
          .filter(
            (resource) =>
              /remoto|clase|meet|zoom|teams|enlace|liga|acceso|sesi[oó]n|videollamada/i.test(
                resource.text,
              ),
          )
          .map((resource) => resource.href)
          .slice(0, 3),
      )
      .catch(() => []);

    for (const bookUrl of bookResources) {
      if (!consumeResourceBudget()) {
        break;
      }

      try {
        await gotoWithRetry(detailPage, bookUrl, {
          waitUntil: 'domcontentloaded',
          timeout: SELECTOR_TIMEOUT_MS,
        });

        const linkInBook = await collectVideoCandidatesFromPage(detailPage, courseOrigin);
        const bookMatch = pickFirstVideoLink(linkInBook);
        if (bookMatch) {
          return { link: bookMatch, layer: 'CAPA_8_MOD_BOOK' };
        }

        const nextChapter = await detailPage
          .evaluate(() => {
            const next = document.querySelector(
              'a[title*="siguiente"], a[title*="Siguiente"], a[accesskey="n"], .navnext a',
            );
            return next ? next.href : null;
          })
          .catch(() => null);

        if (nextChapter && consumeResourceBudget()) {
          const link = await extractLinkFromPage(detailPage, nextChapter, {
            timeout: PSOFT_SETTLE_MS,
            courseOrigin,
          });

          if (link) {
            return { link, layer: 'CAPA_8_MOD_BOOK' };
          }
        }
      } catch (_error) {
        // Continue with next book.
      }
    }

    const shortLinks = await page
      .evaluate(() => {
        const shortDomains = [
          'bit.ly',
          'shorturl.at',
          'tinyurl.com',
          'short.gy',
          'ow.ly',
          'rb.gy',
          'cutt.ly',
          't.co',
          'goo.gl',
        ];

        return Array.from(document.querySelectorAll('a[href]'))
          .map((anchor) => anchor.href)
          .filter((href) => {
            try {
              const domain = new URL(href).hostname.replace('www.', '');
              return shortDomains.some((shortDomain) => domain === shortDomain || domain.endsWith(`.${shortDomain}`));
            } catch (_error) {
              return false;
            }
          })
          .slice(0, 4);
      })
      .catch(() => []);

    for (const shortUrl of shortLinks) {
      if (!consumeResourceBudget()) {
        break;
      }

      try {
        await gotoWithRetry(detailPage, shortUrl, {
          waitUntil: 'domcontentloaded',
          timeout: SELECTOR_TIMEOUT_MS,
        });

        const finalUrl = detailPage.url();
        const resolvedMatch = pickFirstVideoLink([finalUrl]);
        if (resolvedMatch) {
          return { link: resolvedMatch, layer: 'CAPA_9_SHORT_URL' };
        }

        const candidates = await collectVideoCandidatesFromPage(detailPage, '');
        const shortMatch = pickFirstVideoLink(candidates);
        if (shortMatch) {
          return { link: shortMatch, layer: 'CAPA_9_SHORT_URL' };
        }
      } catch (_error) {
        // Continue with next short URL.
      }
    }

    const quizAndLessons = await page
      .evaluate(() =>
        [
          ...Array.from(document.querySelectorAll('a[href*="/mod/quiz/view.php"]')),
          ...Array.from(document.querySelectorAll('a[href*="/mod/lesson/view.php"]')),
          ...Array.from(document.querySelectorAll('a[href*="/mod/scorm/view.php"]')),
        ]
          .map((anchor) => ({
            href: anchor.href,
            text: (anchor.textContent || '').trim(),
          }))
          .filter((resource) =>
            /remoto|clase|meet|zoom|teams|enlace|liga|acceso|sesi[oó]n|videollamada|en.?l[ií]nea/i.test(
              resource.text,
            ),
          )
          .map((resource) => resource.href)
          .slice(0, 3),
      )
      .catch(() => []);

    for (const activityUrl of quizAndLessons) {
      if (!consumeResourceBudget()) {
        break;
      }

      const link = await extractLinkFromPage(detailPage, activityUrl, {
        timeout: SELECTOR_TIMEOUT_MS,
        courseOrigin,
      });

      if (link) {
        return { link, layer: 'CAPA_10_QUIZ_LESSON' };
      }
    }

    return { link: null, layer: null };
  } catch (_error) {
    return { link: null, layer: null };
  }
}

async function findLinkForOnlineCourse(context, dashboardPage, materia, cachedCourses = null) {
  const courses = Array.isArray(cachedCourses) ? cachedCourses : await collectCourseLinks(dashboardPage);
  const match = pickBestCourseMatch(courses, materia);

  if (!match) {
    return { link: null, layer: null };
  }

  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
  await applyResourceBlocking(page);

  try {
    const result = await findMeetLinkInCourse(page, match.url);
    if (result && result.link) {
    }
    return result;
  } finally {
    await page.close().catch(() => {});
  }
}

async function enrichMeetLinks(materias, ivirtualUser, ivirtualPass) {
  const onlineIndexes = materias
    .map((materia, index) => ({ index, materia }))
    .filter((item) => item.materia.modalidad === 'en_linea');

  if (onlineIndexes.length === 0) {
    return materias;
  }

  if (!ivirtualUser || !ivirtualPass) {
    console.log('No se configuraron credenciales de iVirtual. Se omite la búsqueda de enlaces de videollamada.');
    return materias;
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const loginResult = await loginToIVirtual(context, ivirtualUser, ivirtualPass);

    if (!loginResult.success || !loginResult.page) {
      return materias;
    }

    const dashboardPage = loginResult.page;
    await dashboardPage
      .waitForSelector('a[href*="/course/view.php?id="]', { timeout: NAV_SETTLE_TIMEOUT_MS })
      .catch(() => {});
    const courses = await collectCourseLinks(dashboardPage);
    const nextMaterias = [...materias];

    const chunks = chunkArray(onlineIndexes, CHUNK_SIZE);

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(({ index, materia }) =>
          withTimeout(
            async () => ({
              index,
              result: await findLinkForOnlineCourse(context, dashboardPage, materia, courses),
            }),
            LINK_TIMEOUT_MS,
          ),
        ),
      );

      results.filter(Boolean).forEach((result) => {
        const meetLink = result?.result?.link || null;
        const meetLinkLayer = result?.result?.layer || null;

        if (meetLink) {
          nextMaterias[result.index] = {
            ...nextMaterias[result.index],
            meetLink,
            meetLinkLayer,
            linkManual: false,
          };
        }
      });
    }

    await dashboardPage.close().catch(() => {});
    return nextMaterias;
  } finally {
    await browser.close();
  }
}

function computeDaysWithClasses(materias) {
  const daySet = new Set();

  materias.forEach((materia) => {
    (materia.dias || []).forEach((day) => daySet.add(day));
  });

  const ordered = DAY_ORDER.filter((day) => daySet.has(day));

  if (ordered.length === 0) {
    return DAY_ORDER.slice(0, 5);
  }

  return ordered;
}

async function scrapeHorario(controller = {}) {
  const ciaUser = process.env.CIA_USER?.trim();
  const ciaPass = process.env.CIA_PASS?.trim();

  if (!ciaUser || !ciaPass) {
    console.error('Error: Credenciales de CIA no configuradas.');
    return buildHorarioError('Credenciales CIA inválidas o no configuradas.');
  }

  const ivirtualUser = process.env.IVIRTUAL_USER?.trim();
  const ivirtualPass = process.env.IVIRTUAL_PASS?.trim();

  const browser = await chromium.launch({ headless: true });
  controller.browser = browser;

  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const loginResult = await loginToCIA(page, ciaUser, ciaPass);

    if (loginResult?.error) {
      return loginResult;
    }

    await persistStudentNameFromCIA(page);
    await applyResourceBlocking(page);
    let scheduleFrame;
    try {
      scheduleFrame = await openHorarioPage(page);
    } catch (error) {
      console.warn(`Error al abrir página de horario en primer intento. Reintentando desde inicio...`);
      if ((error?.message || '').includes('No se encontró el frame esperado')) {
        await page.goto(CIA_ENTRY_URL, {
          waitUntil: 'domcontentloaded',
          timeout: CIA_LOGIN_TIMEOUT_MS,
        });
        const retryLogin = await loginToCIA(page, ciaUser, ciaPass);
        if (retryLogin?.error) {
          return retryLogin;
        }
        await persistStudentNameFromCIA(page);
        scheduleFrame = await openHorarioPage(page);
      } else {
        throw error;
      }
    }

    if (await isScheduleAccessBlocked(scheduleFrame)) {
      console.error('Acceso bloqueado al horario en portal CIA.');
      return buildHorarioError('CIA_SCHEDULE_UNAVAILABLE');
    }

    const identifiers = await collectIdentifiersFromListView(scheduleFrame);
    let materias = await collectWeeklySchedule(scheduleFrame, identifiers);

    if (materias.length === 0 && (await isScheduleAccessBlocked(scheduleFrame))) {
      console.error('Acceso bloqueado detectado después de carga de horario.');
      return buildHorarioError('CIA_SCHEDULE_UNAVAILABLE');
    }

    materias = materias.map((materia) => ({
      ...materia,
      meetLink: materia.meetLink || null,
      meetLinkLayer: materia.meetLinkLayer || null,
      linkManual: Boolean(materia.linkManual),
      modalidad: materia.modalidad || 'presencial',
      ubicacion: materia.ubicacion || (materia.modalidad === 'en_linea' ? 'Remoto' : ''),
      dias: getFriendlyDayOrder(materia.dias),
    }));

    materias = await enrichMeetLinks(materias, ivirtualUser, ivirtualPass);

    const payload = {
      materias,
      diasConClases: computeDaysWithClasses(materias),
      timestamp: Date.now(),
    };

    return applyManualLinks(payload);
  } catch (error) {
    console.error(`Error durante scraping de horario: ${error.message}`);
    if (error?.message === 'NO_INTERNET') {
      return buildHorarioError('Sin conexión a internet. Verifica tu red e intenta de nuevo.');
    }

    return buildHorarioError(
      error?.message
        ? `Falló la extracción de horario: ${error.message}`
        : 'Falló la extracción de horario por un error no identificado.',
    );
  } finally {
    await browser.close();
  }
}


let activeHorarioController = null;

async function getHorarioWithCache() {
  if (activeHorarioController) {
    console.log('Intento de extracción concurrentes bloqueado.');
    return { error: 'Ya hay un escaneo de horario en progreso. Espera a que termine.' };
  }

  const cached = readHorarioCache();

  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    console.log('Sirviendo horario desde la caché.');
    const cachedWithManualLinks = applyManualLinks(cached);
    updateCachedHorarioMaterias(cachedWithManualLinks);

    return {
      ...cachedWithManualLinks,
      fromCache: true,
    };
  }

  const controller = { cancelled: false, browser: null };
  activeHorarioController = controller;

  try {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(
        async () => {
          controller.cancelled = true;
          if (controller.browser) {
            await controller.browser.close().catch(() => {});
          }
          console.error(`Timeout de escaneo global superado (${GLOBAL_TIMEOUT_MS}ms).`);
          resolve(
            buildHorarioError('El escaneo del horario tardó demasiado. Intenta de nuevo.'),
          );
        },
        GLOBAL_TIMEOUT_MS,
      );
    });

    const scrapePromise = Promise.resolve(scrapeHorario(controller)).finally(() => {
      clearTimeout(timeoutId);
    });

    const result = await Promise.race([scrapePromise, timeoutPromise]);

    if (result?.error) {
      notificationCenter.processSyncError('horario', result.error);
      return result;
    }

    const cachedPayload = writeHorarioCache(result);
    const cachedWithManualLinks = applyManualLinks(cachedPayload);
    updateCachedHorarioMaterias(cachedWithManualLinks);
    notificationCenter.processSync('horario', cachedWithManualLinks.materias);

    return {
      ...cachedWithManualLinks,
      fromCache: false,
    };
  } finally {
    activeHorarioController = null;
  }
}

function registerHorarioHandlers() {
  if (!ipcMain?.handle) {
    return;
  }

  ipcMain.handle('horario:run', async () => getHorarioWithCache());
  ipcMain.handle('horario:clear-cache', async () => clearHorarioCache());
  ipcMain.handle('horario:save-link', async (_event, payload = {}) =>
    saveManualLink(payload.numeroClase, payload.link),
  );
}

module.exports = {
  clearHorarioCache,
  mergeWeeklyRows,
  getCachedHorario,
  getHorarioCachePath,
  getHorarioWithCache,
  readHorarioCache,
  registerHorarioHandlers,
  saveManualLink,
  scrapeHorario,
  writeHorarioCache,
};
