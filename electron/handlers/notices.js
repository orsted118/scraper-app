// Scraper de noticias/comunicados públicos de ITSON (sin credenciales).
// Emite a la bandeja vía notification-center. Páginas SharePoint: selectores
// defensivos, y si la estructura cambia falla con log — nunca rompe la app.
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const { chromium } = require('playwright');

const notificationCenter = require('./notification-center');

const PAGE_TIMEOUT_MS = 45_000;
const CONTENT_TIMEOUT_MS = 15_000;
const MAX_SEEN_KEYS = 300;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

// ITSON migró su portal (las viejas Paginas/*.aspx de SharePoint son 404).
// El portal nuevo es una SPA: noticias en /articulo/{id} y convocatorias
// en /evento/{id} — IDs estables en el path, sin query strings volátiles.
const SOURCES = [
  {
    label: 'Noticias ITSON',
    url: 'https://www.itson.mx/portalinstitucional/noticias',
    pattern: '/portalinstitucional/articulo/',
  },
  {
    label: 'Portal ITSON',
    url: 'https://www.itson.mx/portalinstitucional/',
    pattern: '/portalinstitucional/evento/',
  },
];

const STUDENT_KEYWORDS = [
  'beca',
  'convocatoria',
  'servicios escolares',
  'kardex',
  'receso',
  'pago',
  'inscripcion',
  'reinscripcion',
  'titulacion',
  'biblioteca',
];

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesStudentKeywords(title) {
  const normalized = normalizeText(title);
  return STUDENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getNoticeKey(item) {
  // Dedupe por título+fecha: las URLs de SharePoint traen query strings volátiles.
  return `${normalizeText(item.titulo)}::${item.fecha || ''}`;
}

function getSnapshotPath() {
  return path.join(app.getPath('userData'), 'snapshots', 'notices.json');
}

function readSeenKeys() {
  try {
    if (!fs.existsSync(getSnapshotPath())) {
      return null;
    }
    const parsed = JSON.parse(fs.readFileSync(getSnapshotPath(), 'utf8'));
    return Array.isArray(parsed?.keys) ? parsed.keys : null;
  } catch (error) {
    console.error('[notices] No se pudo leer el snapshot:', error?.message);
    return null;
  }
}

function writeSeenKeys(keys) {
  try {
    fs.mkdirSync(path.dirname(getSnapshotPath()), { recursive: true });
    fs.writeFileSync(
      getSnapshotPath(),
      JSON.stringify({ keys: keys.slice(0, MAX_SEEN_KEYS) }, null, 2),
      'utf8',
    );
  } catch (error) {
    console.error('[notices] No se pudo escribir el snapshot:', error?.message);
  }
}

async function applyResourceBlocking(page) {
  await page.route('**/*', (route) => {
    if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) {
      return route.abort();
    }
    return route.continue();
  });
}

async function extractNoticesFromPage(page, source) {
  return page.evaluate(({ label, pattern }) => {
    const DATE_PATTERN =
      /(\d{1,2}\s*(?:de)?\s*(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*(?:de)?\s*\d{4})|(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i;

    const anchors = [...document.querySelectorAll(`a[href*="${pattern}"]`)];
    const results = [];
    const seenLocal = new Set();

    for (const anchor of anchors) {
      const title = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
      const href = anchor.href || '';

      if (title.length < 15 || title.length > 220) {
        continue;
      }

      const container = anchor.closest('article, li, div') || anchor;
      const containerText = (container.textContent || '').replace(/\s+/g, ' ');
      const dateMatch = containerText.match(DATE_PATTERN);
      const localKey = title.toLowerCase();

      if (seenLocal.has(localKey)) {
        continue;
      }
      seenLocal.add(localKey);

      results.push({
        titulo: title,
        url: href,
        fecha: dateMatch ? dateMatch[0].trim() : '',
        fuente: label,
      });
    }

    return results;
  }, { label: source.label, pattern: source.pattern });
}

async function syncNotices() {
  const settings = notificationCenter.getSettings();

  if (!settings.noticesEnabled) {
    return { ok: false, error: 'Las noticias de ITSON están deshabilitadas en Ajustes.' };
  }

  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const collected = [];

    for (const source of SOURCES) {
      const page = await context.newPage();

      try {
        await applyResourceBlocking(page);
        await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
        // SPA: esperar a que aparezca el contenido real, no un sleep ciego.
        await page
          .waitForSelector(`a[href*="${source.pattern}"]`, { timeout: CONTENT_TIMEOUT_MS })
          .catch(() => {});

        const items = await extractNoticesFromPage(page, source);

        if (items.length === 0) {
          console.error(`[notices] Estructura no reconocida en ${source.url} — 0 items.`);
        }

        collected.push(...items);
      } catch (error) {
        console.error(`[notices] Falló ${source.url}:`, error?.message);
      } finally {
        await page.close().catch(() => {});
      }
    }

    if (collected.length === 0) {
      return { ok: false, error: 'No se pudieron leer las páginas de noticias de ITSON.' };
    }

    const seenKeys = readSeenKeys();
    const allKeys = collected.map(getNoticeKey);

    // Seed silencioso: la primera corrida registra lo existente sin emitir.
    if (seenKeys === null) {
      writeSeenKeys(allKeys);
      notificationCenter.touchLastSync();
      return { ok: true, added: 0, seeded: true, total: collected.length };
    }

    const seenSet = new Set(seenKeys);
    let added = 0;

    for (const item of collected) {
      const key = getNoticeKey(item);

      if (seenSet.has(key) || !matchesStudentKeywords(item.titulo)) {
        continue;
      }

      notificationCenter.emit({
        key: `news-${key.slice(0, 120)}`,
        source: 'itson-news',
        category: 'info',
        priority: 'info',
        title: item.titulo,
        body: [item.fuente, item.fecha].filter(Boolean).join(' · '),
        actionUrl: item.url,
        meta: { fuente: item.fuente },
      });
      added += 1;
    }

    writeSeenKeys([...new Set([...allKeys, ...seenKeys])]);
    notificationCenter.touchLastSync();

    return { ok: true, added, total: collected.length };
  } catch (error) {
    console.error('[notices] syncNotices falló:', error?.message);
    return { ok: false, error: error?.message || 'Falló la lectura de noticias de ITSON.' };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

function registerNoticesHandlers() {
  ipcMain.handle('notices:sync', async () => syncNotices());
}

module.exports = {
  matchesStudentKeywords,
  registerNoticesHandlers,
  syncNotices,
};
