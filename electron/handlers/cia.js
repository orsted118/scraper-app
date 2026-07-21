const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron?.app;
const ipcMain = electron?.ipcMain;
const { chromium } = require('playwright');
const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
const notificationCenter = require('./notification-center');

const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
const REPORT_MANAGER_URL = 'http://smartweb3.itson.edu.mx:9500/psp/ITSONPRD_1/EMPLOYEE/PSFT_HR/c/REPORT_MANAGER.CONTENT_LIST.GBL?Page=CDM_CONTLIST&Action=U&';
const CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font']);

function normalizeWhitespace(value) {
  return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function getCIACachePath() {
  return path.join(getCIAUserDataPath(), 'cia-cache.json');
}

function getCIAUserDataPath() {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('userData');
  }

  const fallbackPath = path.join(process.cwd(), '.local-data');
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
}

function discardCIACache(cachePath) {
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

function readCIACache() {
  const cachePath = getCIACachePath();

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

    if (!parsed || typeof parsed.timestamp !== 'number' || !Array.isArray(parsed.materias)) {
      discardCIACache(cachePath);
      return null;
    }

    return parsed;
  } catch (_error) {
    discardCIACache(cachePath);
    return null;
  }
}

function writeCIACache(materias) {
  const cachePayload = {
    timestamp: Date.now(),
    materias,
  };

  fs.writeFileSync(getCIACachePath(), JSON.stringify(cachePayload, null, 2), 'utf8');

  return cachePayload;
}

function clearCIACache() {
  const cachePath = getCIACachePath();

  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }

  return { success: true };
}

function buildCIAError(message) {
  try {
    clearCIACache();
  } catch (_error) {
    // Ignore cache cleanup failures.
  }

  return { error: message };
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

async function waitForFrameText(page, matcher, timeoutMs = PAGE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const text = await frame.locator('body').textContent().catch(() => '');
      const normalized = normalizeWhitespace(text);

      if (!normalized) {
        continue;
      }

      if (matcher instanceof RegExp ? matcher.test(normalized) : normalized.includes(matcher)) {
        return frame;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`No se encontró el contenido esperado: ${matcher}`);
}

async function waitForFrameWithSelector(page, selector, timeoutMs = PAGE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const count = await frame.locator(selector).count().catch(() => 0);

      if (count > 0) {
        return frame;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`No se encontró el frame con el selector esperado: ${selector}`);
}

async function waitForFrameUrl(page, matcher, timeoutMs = PAGE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const url = frame.url() || '';

      if (matcher instanceof RegExp ? matcher.test(url) : url.includes(matcher)) {
        return frame;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`No se encontró el frame esperado: ${matcher}`);
}

async function loginToCIA(page, user, password) {
  await page.goto(CIA_ENTRY_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#txtITSONET').fill(user);
  await page.locator('#btnConexionTrayectorias').click();
  await page.getByRole('button', { name: 'Continuar' }).waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS }).catch(() => {});

  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#userid').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });

  await page.locator('#userid').fill(user);
  await page.locator('#pwd').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await page.getByRole('link', { name: 'Autoservicio', exact: true })
    .last()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {});

  const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();

  if (!(await autoservicioLink.count().catch(() => 0))) {
    throw new Error('Credenciales CIA inválidas o no configuradas.');
  }

  await autoservicioLink.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
}

async function openBoletaPage(page) {
  const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();
  await autoservicioLink.click();
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('iframe')).some(
        (f) => f.src && f.src.includes('CO_EMPLOYEE_SELF_SERVICE'),
      ),
    { timeout: 15_000 },
  ).catch(() => {});

  const navFrame = page.frames().find(
    (frame) =>
      frame.url().includes('PortalCacheContent=true') &&
      frame.url().includes('CO_EMPLOYEE_SELF_SERVICE&FolderPath'),
  );

  if (!navFrame) {
    throw new Error('No fue posible abrir el menú de Autoservicio.');
  }

  const boletaLink = navFrame.getByRole('link', { name: 'Boleta de Calificación', exact: true });
  await boletaLink.click();

  const boletaFrame = await waitForFrameUrl(
    page,
    /ITSR_MENU\.ITSR_BOL_CAL_GBL\.GBL.*PortalCRefLabel=Boleta/i,
  );

  if (!boletaFrame) {
    throw new Error('No fue posible abrir el formulario de Boleta de Calificación.');
  }

  await boletaFrame.locator('#ITSR_RUN_BOLCAL_EMPLID').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });

  return boletaFrame;
}

async function openReportManagerList(page) {
  await page.goto(REPORT_MANAGER_URL, { waitUntil: 'domcontentloaded' });
  return waitForFrameText(page, /Lista Informes/i);
}

async function setSelectValueWithoutPostback(frame, selector, value) {
  await frame.locator(selector).evaluate((element, nextValue) => {
    if (element instanceof HTMLSelectElement) {
      element.value = nextValue;
    }
  }, value);
}

function isGradeCode(value) {
  return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9-]{4,}$/.test(value || '');
}

function parseFinalGrade(value) {
  if (!value) {
    return null;
  }

  if (/^\s*-+\s*$/.test(value) || /^[A-Z]\s*$/i.test(value)) {
    return null;
  }

  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getGradeStatus(promedio, calificaciones = []) {
  const hasGrades = calificaciones.some((item) => Number.isFinite(item?.calificacion));

  if (!hasGrades || !Number.isFinite(promedio)) {
    return 'sin_calificacion';
  }

  if (promedio >= 7) {
    return 'aprobada';
  }

  if (promedio >= 6) {
    return 'en_riesgo';
  }

  return 'reprobada';
}

function normalizeCourseCode(value = '') {
  return normalizeWhitespace(value).replace(/\s+/g, '').toUpperCase();
}

function cleanCourseName(value = '') {
  return normalizeWhitespace(
    value
      .replace(/\s+-\s*/g, ' ')
      .replace(/\s{2,}/g, ' '),
  );
}

function buildPartialEntries(cells) {
  const relevantCells = cells
    .filter((item) => item.x >= 220 && item.x < 705)
    .filter((item) => /^-?\d+(?:[.,]\d+)?$/.test(item.text) || /^\s*-+\s*$/.test(item.text));

  const visiblePartials = relevantCells
    .filter((item) => Number.isFinite(parseFinalGrade(item.text)))
    .map((item, index) => ({
      nombre: `Parcial ${index + 1}`,
      etiqueta: `P${index + 1}`,
      parcial: `P${index + 1}`,
      calificacion: parseFinalGrade(item.text),
      sobre: 10,
    }));

  if (visiblePartials.length > 0) {
    return visiblePartials;
  }

  // The current CIA PDF often renders partial columns as "-" even when final
  // grades are visible. Keep explicit partial slots so the UI can distinguish
  // "no partial uploaded yet" from "only final was parsed".
  return Array.from({ length: Math.min(3, Math.max(1, relevantCells.length || 3)) }, (_, index) => ({
    nombre: `Parcial ${index + 1}`,
    etiqueta: `P${index + 1}`,
    parcial: `P${index + 1}`,
    calificacion: null,
    sobre: 10,
  }));
}

function buildComponentFromRow(row, fallbackTipo = 'Teoría') {
  return {
    tipo: row.componente || fallbackTipo,
    calificaciones: row.calificaciones,
    promedio: row.promedio,
  };
}

function groupMateriasByCode(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const code = normalizeCourseCode(row.codigo || row.clave);
    if (!code) return;

    if (!groups.has(code)) {
      groups.set(code, []);
    }

    groups.get(code).push(row);
  });

  return [...groups.entries()].map(([codigo, groupRows]) => {
    const primary = groupRows[0];
    const numericPromedios = groupRows
      .map((row) => row.promedio)
      .filter((value) => Number.isFinite(value));
    const promedio =
      numericPromedios.length > 0
        ? Number((numericPromedios.reduce((sum, value) => sum + value, 0) / numericPromedios.length).toFixed(2))
        : null;
    const hasLabInName = /(?:c\/lab|\/lab|laboratorio)/i.test(primary.nombre);
    const hasMultipleComponents = groupRows.length > 1;
    const tieneComponentes = hasMultipleComponents || hasLabInName;
    let componentes = [];

    if (hasMultipleComponents) {
      componentes = groupRows.map((row, index) => buildComponentFromRow(row, index === 0 ? 'Teoría' : 'Laboratorio'));
    } else if (hasLabInName) {
      componentes = [
        buildComponentFromRow(primary, 'Teoría'),
        {
          tipo: 'Laboratorio',
          calificaciones: primary.calificaciones,
          promedio: primary.promedio,
        },
      ];
    }

    const calificaciones = primary.calificaciones || [];

    return {
      codigo,
      clave: codigo,
      nombre: primary.nombre,
      profesor: primary.profesor || '',
      calificaciones,
      promedio,
      estado: getGradeStatus(promedio, calificaciones),
      tieneComponentes,
      componentes,
    };
  });
}

function extractMateriasFromPage(pageTextItems) {
  const groupedRows = new Map();

  pageTextItems.forEach((item) => {
    const rowKey = Math.round(item.y * 2) / 2;

    if (!groupedRows.has(rowKey)) {
      groupedRows.set(rowKey, []);
    }

    groupedRows.get(rowKey).push(item);
  });

  const rows = [];

  [...groupedRows.entries()]
    .sort((a, b) => b[0] - a[0])
    .forEach(([, rowItems]) => {
      const sortedItems = rowItems
        .map((item) => ({
          text: normalizeWhitespace(item.str),
          x: item.x,
        }))
        .filter((item) => item.text)
        .sort((a, b) => a.x - b.x);

      if (sortedItems.length === 0) {
        return;
      }

      const codeIndex = sortedItems.findIndex((item) => item.x >= 20 && item.x <= 75 && isGradeCode(item.text));

      if (codeIndex < 0) {
        return;
      }

      const codigo = normalizeCourseCode(sortedItems[codeIndex].text);
      const nombre = cleanCourseName(
        sortedItems
          .filter((item) => item.x > 70 && item.x < 225)
          .map((item) => item.text)
          .filter((text) => text && !/^(?:TOTAL|CALIF|FALTAS|-+)$/i.test(text))
          .join(' '),
      );

      if (!nombre || /^(?:REGISTRO DE EVALUACIONES|INSTITUTO TECNOL[ÓO]GICO|CICLO LECTIVO|PLAN\b|NOMBRE\b|PROGRAMA\b|ID ALUMNO)/i.test(nombre)) {
        return;
      }

      const finalGradeItem = sortedItems
        .filter((item) => item.x >= 740)
        .sort((a, b) => b.x - a.x)
        .find((item) => /^-?\d+(?:[.,]\d+)?$/.test(item.text) || /^\s*-+\s*$/.test(item.text) || /^[A-Z]\s*$/i.test(item.text));
      const finalGrade = parseFinalGrade(finalGradeItem?.text);
      const partialEntries = buildPartialEntries(sortedItems);
      const calificaciones = [
        ...partialEntries,
        {
          nombre: 'Final',
          etiqueta: 'Final',
          parcial: 'Final',
          calificacion: finalGrade,
          sobre: 10,
        },
      ];

      const promedio = Number.isFinite(finalGrade) ? finalGrade : null;

      rows.push({
        codigo,
        clave: codigo,
        nombre,
        profesor: '',
        calificaciones,
        promedio,
        estado: getGradeStatus(promedio, calificaciones),
      });
    });

  return groupMateriasByCode(rows);
}

async function extractCalificacionesFromPdf(buffer) {
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allItems = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    content.items.forEach((item) => {
      allItems.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
      });
    });
  }

  return extractMateriasFromPage(allItems);
}

async function scrapeCIAWithPlaywright() {
  const user = process.env.CIA_USER?.trim();
  const password = process.env.CIA_PASS?.trim();

  if (!user && !password) {
    return buildCIAError('CIA_NO_CREDENTIALS');
  }

  if (!user) {
    return buildCIAError('CIA_NO_USER');
  }

  if (!password) {
    return buildCIAError('CIA_NO_PASSWORD');
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await applyResourceBlocking(page);
    await loginToCIA(page, user, password);

    const boletaFrame = await openBoletaPage(page);
    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_INSTITUTION', 'ITSON');
    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_CAREER', 'LIC');

    const latestSemester = await boletaFrame.evaluate(() => {
      const select = document.getElementById('ITSR_RUN_BOLCAL_STRM');
      if (!select) return null;
      const options = Array.from(select.options).filter((o) => o.value && o.value.trim() !== '');
      return options.length > 0 ? options[options.length - 1].value : null;
    });

    if (!latestSemester) {
      throw new Error('No se encontró un semestre disponible en el formulario de boleta.');
    }

    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_STRM', latestSemester);

    const academicProgram = await boletaFrame.evaluate(() => {
      const select = document.getElementById('ITSR_RUN_BOLCAL_ACAD_PROG');
      if (!select) return null;
      const options = Array.from(select.options).filter((o) => o.value && o.value.trim() !== '');
      return options.length > 0 ? options[options.length - 1].value : null;
    });

    if (!academicProgram) {
      throw new Error('No se encontró un programa académico en el formulario de boleta.');
    }

    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_PROG', academicProgram);
    await boletaFrame.locator('#ITSRDERIVBOLCAL_PUSH').click();

    let reportFrame = null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      reportFrame = await openReportManagerList(page);
      const rowDetailLink = reportFrame.locator('a[href*="CDM_WRK_INDEX_BTN"]').first();
      if (await rowDetailLink.count().catch(() => 0)) {
        await rowDetailLink.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
        break;
      }

      reportFrame = null;
      await page.waitForTimeout(1500);
    }

    if (!reportFrame) {
      throw new Error('No fue posible localizar el informe de la boleta en Report Manager.');
    }

    const detLink = reportFrame.locator('a[href*="CDM_WRK_INDEX_BTN"]').first();
    await detLink.click({ force: true });

    const detailFrame = await waitForFrameWithSelector(page, 'a[href*="/psreports/"][href$=".PDF"]');
    const pdfHref = await detailFrame
      .locator('a[href*="/psreports/"][href$=".PDF"]')
      .first()
      .getAttribute('href');

    if (!pdfHref) {
      throw new Error('No fue posible ubicar el PDF de la boleta.');
    }

    const pdfUrl = new URL(pdfHref, page.url()).href;
    const pdfResponse = await page.context().request.get(pdfUrl);

    if (!pdfResponse.ok()) {
      throw new Error('No fue posible descargar el PDF de la boleta.');
    }

    const materias = await extractCalificacionesFromPdf(Buffer.from(await pdfResponse.body()));

    return {
      materias,
      timestamp: Date.now(),
    };
  } finally {
    await browser.close();
  }
}

async function getCalificacionesWithCache() {
  const cached = readCIACache();

  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    return {
      materias: cached.materias,
      timestamp: cached.timestamp,
      fromCache: true,
    };
  }

  try {
    const response = await scrapeCIAWithPlaywright();

    if (response?.error) {
      notificationCenter.processSyncError('calificaciones', response.error);
      return response;
    }

    if (Array.isArray(response.materias)) {
      writeCIACache(response.materias);
      notificationCenter.processSync('calificaciones', response.materias);
    }

    return {
      ...response,
      fromCache: false,
    };
  } catch (error) {
    const message = error?.message || '';

    if (
      message.includes('Credenciales CIA inválidas o no configuradas') ||
      /timeout|login/i.test(message)
    ) {
      notificationCenter.processSyncError('calificaciones', 'CIA_NO_CREDENTIALS');
      return { error: 'Credenciales CIA inválidas o no configuradas.' };
    }

    const fallbackError = message
      ? `Falló la extracción del CIA: ${message}`
      : 'Falló la extracción del CIA por un error no identificado.';
    notificationCenter.processSyncError('calificaciones', fallbackError);

    return { error: fallbackError };
  }
}

function registerCIAHandlers() {
  ipcMain.handle('cia:run', async () => getCalificacionesWithCache());
  ipcMain.handle('cia:clear-cache', async () => clearCIACache());
}

module.exports = {
  clearCIACache,
  extractCalificacionesFromPdf,
  getCIACachePath,
  getCalificacionesWithCache,
  loginToCIA,
  openBoletaPage,
  openReportManagerList,
  readCIACache,
  registerCIAHandlers,
  scrapeCIAWithPlaywright,
  waitForFrameText,
  writeCIACache,
};
