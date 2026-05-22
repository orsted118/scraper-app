const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron?.app;
const ipcMain = electron?.ipcMain;
const { chromium } = require('playwright');

const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
const IVIRTUAL_LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
const IVIRTUAL_DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const GLOBAL_TIMEOUT_MS = 4 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;
const CIA_LOGIN_TIMEOUT_MS = 45_000;
const CHUNK_SIZE = 2;
const LINK_TIMEOUT_MS = 15_000;
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

function isTimeoutError(error) {
  return Boolean(
    error &&
      (error.name === 'TimeoutError' ||
        /timeout/i.test(error.message || '') ||
        /timed out/i.test(error.message || '')),
  );
}

function isNetworkError(error) {
  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
    error?.message || '',
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
  } catch (_error) {
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

function writeHorarioCache(payload) {
  const nextPayload = {
    materias: Array.isArray(payload?.materias) ? payload.materias : [],
    diasConClases: Array.isArray(payload?.diasConClases) ? payload.diasConClases : [],
    timestamp: Date.now(),
  };

  fs.writeFileSync(getHorarioCachePath(), JSON.stringify(nextPayload, null, 2), 'utf8');
  return nextPayload;
}

function clearHorarioCache() {
  discardFile(getHorarioCachePath());
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
      };
    }

    return {
      ...materia,
      meetLink: manualLink,
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
          ? { ...materia, meetLink: normalizedLink, linkManual: true }
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
    return { codigo: '', nombre: '' };
  }

  const fallbackName = normalizeWhitespace(
    text
      .replace(new RegExp(`.*?${fallbackCode}\\s*-\\s*`, 'i'), '')
      .replace(/\s+Estado\b.*/i, '')
      .replace(/\s+N[ºo]\s*Clase\b.*/i, ''),
  );

  return {
    codigo: fallbackCode,
    nombre: fallbackName,
  };
}

async function waitForPeopleSoftNav(page, timeout = 15_000) {
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
      await waitForPeopleSoftNav(frame.page(), 10_000);
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
          await frame.page().waitForTimeout(1200);
          return true;
        }
      }
      continue;
    }

    await frame.locator(selector).nth(target.index).click({ force: true }).catch(() => {});
    await frame.page().waitForTimeout(1200);
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
  await page.waitForTimeout(1200);

  const continueButton = page.getByRole('button', { name: /continuar/i }).first();
  if (await continueButton.count().catch(() => 0)) {
    await continueButton.click().catch(() => {});
  }

  await page.locator('#userid').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
  await page.locator('#userid').fill(user);
  await page.locator('#pwd').fill(password);
  await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click();

  await page.waitForLoadState('domcontentloaded', { timeout: CIA_LOGIN_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(2500);

  const autoservicioLink = page.getByRole('link', { name: /autoservicio/i }).last();
  if (!(await autoservicioLink.count().catch(() => 0))) {
    return buildHorarioError('Credenciales CIA inválidas o no configuradas.');
  }

  return null;
}

async function getTargetContentFrame(page, timeout = 25_000) {
  return waitForFrame(page, async (frame) => frame.name() === 'TargetContent', timeout);
}

async function clickHorarioEntry(page) {
  const targetFrame = await getTargetContentFrame(page, 25_000);
  const targetLink = targetFrame.locator('a', { hasText: /mi horario de clases|class schedule|horario de clases/i }).first();

  if (await targetLink.count().catch(() => 0)) {
    await targetLink.click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(page, 10_000);
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
    25_000,
  );

  const centerLink = navFrame.locator('a', { hasText: /centro de alumnado|student center/i }).first();
  if (await centerLink.count().catch(() => 0)) {
    await centerLink.click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(page, 10_000);
  }

  const scheduleLink = navFrame.locator('a', { hasText: /mi horario de clases|class schedule|horario de clases/i }).first();
  if (await scheduleLink.count().catch(() => 0)) {
    await scheduleLink.click({ force: true }).catch(() => {});
    await waitForPeopleSoftNav(page, 10_000);
  }
}

async function openHorarioPage(page) {
  const autoservicioLink = page.getByRole('link', { name: /autoservicio/i }).last();
  await autoservicioLink.click().catch(() => {});
  await waitForPeopleSoftNav(page, 20_000);
  await clickHorarioEntry(page);
  await waitForPeopleSoftNav(page, 20_000);

  return waitForFrame(
    page,
    async (frame) =>
      frame.name() === 'TargetContent' &&
      (/SSR_SSENRL_LIST/i.test(frame.url()) ||
        (await frameHasAnyText(frame, [/vista listado/i, /vista horario semanal/i, /class schedule/i]))),
    30_000,
  );
}

async function collectIdentifiersFromListView(scheduleFrame) {
  await switchScheduleView(scheduleFrame, [/vista listado/i, /list view/i]);
  await waitForPeopleSoftNav(scheduleFrame.page(), 12_000);

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
        const rows = Array.from(table.querySelectorAll('tr'))
          .slice(1)
          .map((row) =>
            Array.from(row.querySelectorAll('td'))
              .map((cell) => normalize(cell.textContent || ''))
              .filter((cell) => cell.length > 0),
          )
          .filter((cells) => cells.length >= 6);

        return rows.map((cells) => ({
          containerText,
          numeroClase: cells[0] || '',
          seccion: cells[1] || '',
          componente: cells[2] || '',
          diasHoras: cells[3] || '',
          ubicacion: cells[4] || '',
          instructor: cells[5] || '',
          fechaRango: cells[6] || '',
        }));
      });
    })
    .catch(() => []);

  const entries = rawEntries.map((entry) => {
    const { codigo, nombre } = extractCourseFromContext(entry.containerText);
    const hora = parseTimeRange(entry.diasHoras);
    const days = parsePeopleSoftDays(entry.diasHoras);
    const modalidad = inferModalidad(
      `${entry.ubicacion} ${entry.componente} ${entry.containerText}`,
    );

    return {
      codigo,
      nombre: nombre || codigo || 'Materia sin nombre',
      seccion: entry.seccion || '',
      numeroClase: entry.numeroClase || '',
      dias: days,
      horaInicio: hora.horaInicio,
      horaFin: hora.horaFin,
      modalidad,
      ubicacion: entry.ubicacion || (modalidad === 'en_linea' ? 'Remoto' : ''),
      instructor: entry.instructor || '',
      meetLink: null,
      linkManual: false,
    };
  });

  return uniqueByKey(
    entries.filter((entry) => entry.numeroClase || entry.codigo || entry.nombre),
    (entry) => entry.numeroClase || `${entry.codigo}-${entry.seccion}-${entry.horaInicio || 'na'}`,
  );
}

function combineScheduleRows(rows, identifiers) {
  const identifierIndex = new Map();

  identifiers.forEach((item) => {
    const keyCandidates = [item.numeroClase, item.codigo, item.nombre]
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
    const rowKeys = [row.numeroClase, row.codigo, row.nombre]
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
      ubicacion: row.ubicacion || (row.modalidad === 'en_linea' ? 'Remoto' : ''),
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
    merged.set(key, {
      ...previous,
      ...base,
      dias: DAY_ORDER.filter((day) => days.has(day)),
      instructor: previous.instructor || base.instructor,
      ubicacion: previous.ubicacion || base.ubicacion,
      modalidad: previous.modalidad || base.modalidad,
      meetLink: previous.meetLink || base.meetLink || null,
    });
  });

  return [...merged.values()];
}

async function collectWeeklySchedule(scheduleFrame, identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return [];
  }

  await switchScheduleView(scheduleFrame, [
    /vista horario semanal/i,
    /weekly schedule/i,
    /weekly calendar view/i,
    /semanal/i,
  ]);
  await waitForPeopleSoftNav(scheduleFrame.page(), 12_000);

  const rawRows = await scheduleFrame
    .evaluate(() => {
      const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
      const tables = Array.from(document.querySelectorAll('table'));
      const candidate = tables.find((table) => /WEEKLY|SCHEDULE|SS_SCHED_TABLE/i.test(table.id));

      if (!candidate) {
        return [];
      }

      const headerCells = Array.from(
        candidate.querySelectorAll('thead th, tr:first-child th, tr:first-child td'),
      ).map((cell) => normalize(cell.textContent || ''));

      const rows = Array.from(candidate.querySelectorAll('tr'));
      const output = [];

      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        if (cells.length <= 1) {
          return;
        }

        const timeLabel = normalize(cells[0]?.textContent || '');

        for (let index = 1; index < cells.length; index += 1) {
          const cellText = normalize(cells[index]?.textContent || '');

          if (!cellText || /^-+$/.test(cellText)) {
            continue;
          }

          output.push({
            dayHeader: headerCells[index] || '',
            timeLabel,
            rawText: cellText,
          });
        }
      });

      return output;
    })
    .catch(() => []);

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return identifiers;
  }

  const parsedRows = rawRows.map((item) => {
    const combinedText = `${item.dayHeader} ${item.rawText}`;
    const range = parseTimeRange(item.timeLabel || item.rawText);

    return {
      codigo: extractCode(item.rawText),
      nombre: '',
      dias: parsePeopleSoftDays(combinedText),
      horaInicio: range.horaInicio,
      horaFin: range.horaFin,
      modalidad: inferModalidad(item.rawText),
      ubicacion: inferModalidad(item.rawText) === 'en_linea' ? 'Remoto' : '',
      instructor: '',
      seccion: extractSection(item.rawText),
      numeroClase: extractClassNumber(item.rawText),
      rawText: item.rawText,
    };
  });

  const completedRows = parsedRows.filter(
    (row) => row.horaInicio && row.horaFin && Array.isArray(row.dias) && row.dias.length > 0,
  );

  if (completedRows.length === 0) {
    return identifiers;
  }

  const merged = combineScheduleRows(completedRows, identifiers);
  return merged.length > 0 ? merged : identifiers;
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

  if (page.url().includes('/login/')) {
    await page.close().catch(() => {});
    return { success: false, error: 'No fue posible iniciar sesión en iVirtual para buscar enlaces.' };
  }

  await applyResourceBlocking(page);
  await gotoWithRetry(page, IVIRTUAL_DASHBOARD_URL, {
    timeout: 45_000,
    waitUntil: 'domcontentloaded',
  });

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

function areNamesRelated(left, right) {
  const normalizedLeft = normalizeForCompare(left)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedRight = normalizeForCompare(right)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return true;
  }

  const leftTokens = normalizedLeft.split(' ').filter((token) => token.length >= 4);
  const rightTokens = new Set(normalizedRight.split(' ').filter((token) => token.length >= 4));

  const overlap = leftTokens.filter((token) => rightTokens.has(token));
  return overlap.length >= Math.max(1, Math.min(2, leftTokens.length));
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

async function findLinkForOnlineCourse(context, dashboardPage, materia) {
  const courses = await collectCourseLinks(dashboardPage);
  const match = courses.find((course) => areNamesRelated(course.name, materia.nombre || materia.codigo));

  if (!match) {
    return null;
  }

  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
  await applyResourceBlocking(page);

  try {
    await gotoWithRetry(page, match.url, {
      timeout: PAGE_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    });

    const links = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors
          .map((anchor) => anchor.href)
          .filter((href) => typeof href === 'string' && href.startsWith('http')),
      )
      .catch(() => []);

    return findMeetLinkInUrls(links);
  } finally {
    await page.close().catch(() => {});
  }
}

async function withTimeout(taskFactory, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    Promise.resolve()
      .then(taskFactory)
      .then(
        (result) => {
          clearTimeout(timer);
          resolve(result || null);
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
      );
  });
}

async function enrichMeetLinks(materias, ivirtualUser, ivirtualPass) {
  const onlineIndexes = materias
    .map((materia, index) => ({ index, materia }))
    .filter((item) => item.materia.modalidad === 'en_linea');

  if (onlineIndexes.length === 0) {
    return materias;
  }

  if (!ivirtualUser || !ivirtualPass) {
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
    const nextMaterias = [...materias];

    const chunks = chunkArray(onlineIndexes, CHUNK_SIZE);

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(({ index, materia }) =>
          withTimeout(
            async () => ({
              index,
              meetLink: await findLinkForOnlineCourse(context, dashboardPage, materia),
            }),
            LINK_TIMEOUT_MS,
          ),
        ),
      );

      results.filter(Boolean).forEach((result) => {
        if (result.meetLink) {
          nextMaterias[result.index] = {
            ...nextMaterias[result.index],
            meetLink: result.meetLink,
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

async function scrapeHorario() {
  const ciaUser = process.env.CIA_USER?.trim();
  const ciaPass = process.env.CIA_PASS?.trim();

  if (!ciaUser || !ciaPass) {
    return buildHorarioError('Credenciales CIA inválidas o no configuradas.');
  }

  const ivirtualUser = process.env.IVIRTUAL_USER?.trim();
  const ivirtualPass = process.env.IVIRTUAL_PASS?.trim();

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    const loginResult = await loginToCIA(page, ciaUser, ciaPass);

    if (loginResult?.error) {
      return loginResult;
    }

    await applyResourceBlocking(page);
    const scheduleFrame = await openHorarioPage(page);
    const identifiers = await collectIdentifiersFromListView(scheduleFrame);
    let materias = await collectWeeklySchedule(scheduleFrame, identifiers);

    materias = materias.map((materia) => ({
      ...materia,
      meetLink: materia.meetLink || null,
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

async function diagnosticarCIA(page) {
  await gotoWithRetry(page, CIA_ENTRY_URL, {
    waitUntil: 'domcontentloaded',
    timeout: CIA_LOGIN_TIMEOUT_MS,
  });

  const frames = page.frames();
  console.log(
    'Frames encontrados:',
    frames.map((frame) => ({ url: frame.url(), name: frame.name() })),
  );

  for (const frame of frames) {
    const html = await frame.content().catch(() => '');
    if (html.length > 100) {
      console.log(`Frame ${frame.url()}:`, html.substring(0, 500));
    }
  }
}

async function getHorarioWithCache() {
  const cached = readHorarioCache();

  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    return {
      ...applyManualLinks(cached),
      fromCache: true,
    };
  }

  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(
      () =>
        resolve(
          buildHorarioError('El escaneo del horario tardó demasiado. Intenta de nuevo.'),
        ),
      GLOBAL_TIMEOUT_MS,
    );
  });

  const scrapePromise = Promise.resolve(scrapeHorario()).finally(() => {
    clearTimeout(timeoutId);
  });

  const result = await Promise.race([scrapePromise, timeoutPromise]);

  if (result?.error) {
    return result;
  }

  const cachedPayload = writeHorarioCache(result);

  return {
    ...applyManualLinks(cachedPayload),
    fromCache: false,
  };
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
  getHorarioCachePath,
  getHorarioWithCache,
  readHorarioCache,
  registerHorarioHandlers,
  saveManualLink,
  scrapeHorario,
  diagnosticarCIA,
  writeHorarioCache,
};
