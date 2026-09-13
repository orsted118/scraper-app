// Login y navegación del portal CIA (PeopleSoft del ITSON), compartidos por
// horario, calificaciones y el test de conexión de Ajustes.
//
// Antes había dos copias divergentes del login (cia.js y horario.js) y el
// arreglo del 2026-09-05 —esperar "Continuar" o #userid, lo que llegue primero—
// se aplicó a una sola. La otra seguía clickeando "Continuar" a ciegas y se
// colgaba 30 s cuando el SSO caía directo en el formulario.
//
// Este módulo NO tiene efectos laterales: devolver un error acá jamás borra una
// caché. Quien llama decide qué hacer (ver scraper.js para por qué importa).

const CIA_ENTRY_URL = 'https://apps9.itson.edu.mx/CIA/index.aspx';

const PAGE_TIMEOUT_MS = 20_000;
const CIA_LOGIN_TIMEOUT_MS = 45_000;
const PSOFT_SETTLE_SHORT_MS = 8_000;
const PSOFT_SETTLE_MS = 10_000;
const NAV_SETTLE_TIMEOUT_MS = 15_000;
const FRAME_TIMEOUT_MS = 25_000;

function isTimeoutError(error) {
  return /timeout|Timeout/i.test(error?.message || '');
}

function isNetworkError(error) {
  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
    error?.message || '',
  );
}

async function gotoCIA(page, url, options = {}, maxRetries = 2) {
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

      if (isNetworkError(error)) throw new Error('NO_INTERNET');
      if (!isTimeoutError(error) || attempt === maxRetries) throw error;

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}

// Devuelve null si entró, { error: 'CIA_LOGIN_FAILED' } si no.
async function loginToCIA(page, user, password) {
  await gotoCIA(page, CIA_ENTRY_URL, {
    timeout: CIA_LOGIN_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });

  await page.locator('#txtITSONET').fill(user).catch(() => {});
  await page.locator('#btnConexionTrayectorias').click().catch(() => {});

  // El paso de ITSONET cae en una página intermedia con "Continuar" o directo
  // en el formulario de PeopleSoft: esperar la que llegue primero.
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
    return { error: 'CIA_LOGIN_FAILED' };
  }

  return null;
}

// Los frames se identifican por CONTENIDO, nunca por URL: el shell /psp/ y el
// UniversalHeader llevan el nombre del componente en sus query params, así que
// la URL no distingue nada. Y elegir "el frame con más texto" cae en el Menú
// Principal (1856 chars) por encima del componente real (280 chars).
async function findFrameBySelector(page, selector, timeoutMs = FRAME_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const found = await frame
        .evaluate((sel) => Boolean(document.querySelector(sel)), selector)
        .catch(() => false);
      if (found) return frame;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

// Los frames NAV y TargetContent se solapan e interceptan los pointer events
// mutuamente: un locator.click() de Playwright NUNCA llega al control —
// reporta el elemento visible y estable, y después "intercepts pointer events"
// en bucle hasta el timeout. Hay que disparar el javascript: del portal.
async function submitAction(frame, id) {
  return frame.evaluate((controlId) => {
    if (typeof window.submitAction_win0 === 'function') {
      return window.submitAction_win0(document.win0, controlId);
    }
    document.getElementById(controlId)?.click();
    return undefined;
  }, id);
}

// El portal está balanceado entre smartweb1/2/3 en ~9 puertos y pierde submits
// de forma intermitente: la misma acción funciona y falla en corridas
// consecutivas. Toda acción que espere un cambio de DOM se reintenta.
async function submitAndWait(page, frameSelector, controlId, verificar, intentos = 3) {
  for (let intento = 1; intento <= intentos; intento += 1) {
    const frame = await findFrameBySelector(page, frameSelector);
    if (!frame) return null;

    await submitAction(frame, controlId).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, PSOFT_SETTLE_MS));

    const actual = await findFrameBySelector(page, frameSelector);
    if (actual && (await verificar(actual).catch(() => false))) return actual;
  }

  return null;
}

module.exports = {
  CIA_ENTRY_URL,
  PAGE_TIMEOUT_MS,
  CIA_LOGIN_TIMEOUT_MS,
  PSOFT_SETTLE_SHORT_MS,
  PSOFT_SETTLE_MS,
  NAV_SETTLE_TIMEOUT_MS,
  FRAME_TIMEOUT_MS,
  gotoCIA,
  loginToCIA,
  findFrameBySelector,
  submitAction,
  submitAndWait,
};
