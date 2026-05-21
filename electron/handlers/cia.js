const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const { chromium } = require('playwright');
const pdfjsLib = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');

const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';
const REPORT_MANAGER_URL = 'http://smartweb3.itson.edu.mx:9500/psp/ITSONPRD_1/EMPLOYEE/PSFT_HR/c/REPORT_MANAGER.CONTENT_LIST.GBL?Page=CDM_CONTLIST&Action=U&';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;

function normalizeWhitespace(value) {
  return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function getCIACachePath() {
  return path.join(app.getPath('userData'), 'cia-cache.json');
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

    await page.waitForTimeout(500);
  }

  throw new Error(`No se encontró el contenido esperado: ${matcher}`);
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

    await page.waitForTimeout(500);
  }

  throw new Error(`No se encontró el frame esperado: ${matcher}`);
}

async function loginToCIA(page, user, password) {
  await page.goto(CIA_ENTRY_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#txtITSONET').fill(user);
  await page.locator('#btnConexionTrayectorias').click();
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForTimeout(1500);

  await page.locator('#userid').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
  await page.locator('#userid').fill(user);
  await page.locator('#pwd').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await page.waitForTimeout(4000);

  const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();

  if (!(await autoservicioLink.count().catch(() => 0))) {
    throw new Error('Credenciales CIA inválidas o no configuradas.');
  }

  await autoservicioLink.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
}

async function openBoletaPage(page) {
  const autoservicioLink = page.getByRole('link', { name: 'Autoservicio', exact: true }).last();
  await autoservicioLink.click();
  await page.waitForTimeout(8000);

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
  await page.waitForTimeout(2000);
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

  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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

  const materias = [];

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

      const codeIndex = sortedItems.findIndex((item) => isGradeCode(item.text));

      if (codeIndex < 0) {
        return;
      }

      const clave = sortedItems[codeIndex].text;
      const contentItems = sortedItems.slice(codeIndex + 1);
      const nombreParts = [];
      const partialGrades = [];
      let finalGrade = null;

      contentItems.forEach((item) => {
        const isNumeric = /^-?\d+(?:[.,]\d+)?$/.test(item.text);

        if (item.x >= 760 && isNumeric) {
          finalGrade = parseFinalGrade(item.text);
          return;
        }

        if (item.x >= 700) {
          return;
        }

        if (isNumeric) {
          partialGrades.push(parseFinalGrade(item.text));
          return;
        }

        if (/^(?:TOTAL|CALIF|FALTAS)$/i.test(item.text)) {
          return;
        }

        nombreParts.push(item.text);
      });

      const nombre = normalizeWhitespace(nombreParts.join(' '));

      if (!nombre || /^(?:REGISTRO DE EVALUACIONES|INSTITUTO TECNOL[ÓO]GICO|CICLO LECTIVO|PLAN|NOMBRE|PROGRAMA|ID ALUMNO)/i.test(nombre)) {
        return;
      }

      const partialEntries = partialGrades
        .filter((value) => Number.isFinite(value))
        .map((value, index) => ({ parcial: `Parcial ${index + 1}`, calificacion: value }));
      const calificaciones =
        partialEntries.length > 0
          ? [
              ...partialEntries,
              ...(Number.isFinite(finalGrade) ? [{ parcial: 'Final', calificacion: finalGrade }] : []),
            ]
          : [{ parcial: 'Final', calificacion: finalGrade }];

      const promedio = Number.isFinite(finalGrade) ? finalGrade : null;

      let estado = 'sin_calificacion';
      if (promedio !== null) {
        if (promedio >= 70) {
          estado = 'aprobada';
        } else if (promedio >= 60) {
          estado = 'en_riesgo';
        } else {
          estado = 'reprobada';
        }
      }

      materias.push({
        clave,
        nombre,
        profesor: '',
        calificaciones,
        promedio,
        estado,
      });
    });

  return materias;
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
    await loginToCIA(page, user, password);

    const boletaFrame = await openBoletaPage(page);
    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_INSTITUTION', 'ITSON');
    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_CAREER', 'LIC');
    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_STRM', '3147');
    await setSelectValueWithoutPostback(boletaFrame, '#ITSR_RUN_BOLCAL_ACAD_PROG', 'INSOF');
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
      await page.waitForTimeout(5000);
    }

    if (!reportFrame) {
      throw new Error('No fue posible localizar el informe de la boleta en Report Manager.');
    }

    const detLink = reportFrame.locator('a[href*="CDM_WRK_INDEX_BTN"]').first();
    await detLink.click({ force: true });
    await page.waitForTimeout(5000);

    const detailFrame = await waitForFrameText(page, /Detalle Informe/i);
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
      return response;
    }

    if (Array.isArray(response.materias)) {
      writeCIACache(response.materias);
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
      return { error: 'Credenciales CIA inválidas o no configuradas.' };
    }

    return {
      error: message ? `Falló la extracción del CIA: ${message}` : 'Falló la extracción del CIA por un error no identificado.',
    };
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
