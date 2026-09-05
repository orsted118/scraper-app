// Asistencia de iVirtual (plugin mod_attendance).
//
// LEER ANTES DE TOCAR NADA — esto ESCRIBE en un registro académico:
//
// Registrar asistencia es afirmar que estuviste en clase. Por eso el diseño
// tiene dos reglas que NO se negocian:
//
//   1. NUNCA se marca solo. No hay auto-marcado, ni al abrir la app, ni por
//      temporizador, ni "por las dudas" durante una sync. El único camino que
//      llega a `markAttendance` es que el usuario apriete el botón.
//   2. NUNCA se arma el POST a mano. Se navega al formulario real del portal,
//      se leen las opciones que ese formulario ofrece y se clickea su propio
//      botón. Si la página no es la esperada, se aborta y se reporta — antes
//      que mandar un POST inventado contra el registro de asistencia.
//
// Lo que el recon del portal (scripts/spike-attendance-recon.cjs) dejó claro:
//
//   - 3 de 5 materias tienen mod_attendance.
//   - El auto-registro SÍ está habilitado: hay sesiones con Remarks
//     "Self-recorded", o sea que el alumno ya se marcó a sí mismo.
//   - El link para marcarse (`attendance.php?sessid=…`) SÓLO existe mientras el
//     profe tiene la sesión abierta. Fuera de esa ventana no hay nada que
//     clickear, y ese es el estado normal.
//   - Una sesión futura aparece con estado "?" y sin link.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const { chromium } = require('playwright');

const PORTAL_HOST = 'ivirtual.itson.edu.mx';
const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
const COURSE_URL = 'https://ivirtual.itson.edu.mx/course/view.php?id=';
const PAGE_TIMEOUT_MS = 30_000;
const CACHE_VERSION = 1;

// Los encabezados de la tabla de sesiones vienen en inglés o español según cómo
// tenga el idioma cada curso.
const HEADER_HINTS = /date|fecha|description|descripci|status|estado|points|puntos|remarks|observaci/i;

function log(...args) {
  console.log('[attendance]', ...args);
}

function getCachePath() {
  return path.join(app.getPath('userData'), 'attendance.json');
}

function readCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getCachePath(), 'utf8'));
    return parsed?.version === CACHE_VERSION ? parsed : null;
  } catch (error) {
    if (error?.code !== 'ENOENT') log('error leyendo caché:', error?.message || error);
    return null;
  }
}

function writeCache(data) {
  fs.writeFileSync(getCachePath(), JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

// Una sesión sin tomar todavía se muestra con "?" en estado y puntos. Sirve para
// distinguir "el profe no pasó lista" de "faltaste".
function parseSessionRow(celdas) {
  const [fecha, descripcion, estado, puntos, observaciones] = celdas;

  return {
    fecha: fecha || '',
    descripcion: descripcion || '',
    estado: estado || '',
    puntos: puntos || '',
    observaciones: observaciones || '',
    pendiente: estado === '?' || estado === '',
    // Moodle marca así las que registró el propio alumno. Es la prueba de que
    // el curso tiene el auto-registro habilitado.
    autoRegistrada: /self.?recorded|auto.?registrad/i.test(observaciones || ''),
  };
}

async function readAttendanceModule(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  return page.evaluate((headerPattern) => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;
    const headerRe = new RegExp(headerPattern, 'i');

    const filas = [];
    let resumen = { tomadas: null, puntos: null, porcentaje: null };

    for (const tr of main.querySelectorAll('table tr')) {
      const celdas = Array.from(tr.querySelectorAll('td, th')).map((td) => norm(td.textContent));
      const utiles = celdas.filter(Boolean);
      if (utiles.length === 0) continue;

      // Las filas de totales tienen 2 celdas ("Percentage…: 100.0%"); las de
      // sesión tienen la fila completa de la tabla.
      if (utiles.length <= 2) {
        const [etiqueta, valor] = utiles;

        // Anclado al inicio a propósito: "Percentage over taken sessions"
        // contiene "taken sessions", así que un test suelto metía el
        // porcentaje en el contador de sesiones tomadas.
        if (/^percentage|^porcentaje/i.test(etiqueta)) resumen.porcentaje = valor;
        else if (/^points|^puntos/i.test(etiqueta)) resumen.puntos = valor;
        else if (/^taken sessions|^sesiones tomadas/i.test(etiqueta)) resumen.tomadas = valor;
        continue;
      }

      // Descarta el encabezado.
      if (celdas.slice(0, 3).every((c) => headerRe.test(c))) continue;

      filas.push(celdas);
    }

    // EL dato que habilita marcar: sólo existe mientras el profe tiene abierta
    // la sesión para auto-registro.
    const submit = Array.from(main.querySelectorAll('a[href*="attendance.php"]'))
      .map((a) => ({ texto: norm(a.textContent), href: a.href }))
      .filter((l) => /sessid=/.test(l.href));

    return { urlFinal: location.href, filas, resumen, submit };
  }, HEADER_HINTS.source);
}

async function scrapeAttendance({ onProgress = null } = {}) {
  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;

  if (!user || !pass) return { error: 'NO_CREDENTIALS' };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  try {
    const { loginToIVirtual } = require('./scraper');
    const loginError = await loginToIVirtual(page, user, pass);
    if (loginError) return { error: loginError };

    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const cursos = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
      const seen = new Map();
      for (const l of links) {
        const id = (l.href.match(/id=(\d+)/) || [])[1];
        const nombre = (l.textContent || '').replace(/\s+/g, ' ').trim();
        if (id && nombre && !seen.has(id)) seen.set(id, { id, nombre });
      }
      return [...seen.values()];
    });

    const materias = [];

    for (const [index, curso] of cursos.entries()) {
      onProgress?.({ done: index, total: cursos.length, curso: curso.nombre });

      await page.goto(`${COURSE_URL}${curso.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const modulos = await page.locator('a[href*="/mod/attendance/view.php"]').evaluateAll((links) => {
        const seen = new Map();
        for (const l of links) {
          if (!seen.has(l.href)) seen.set(l.href, { href: l.href, nombre: (l.textContent || '').replace(/\s+/g, ' ').trim() });
        }
        return [...seen.values()];
      });

      // La mayoría de las materias no lleva asistencia por iVirtual.
      if (modulos.length === 0) continue;

      for (const mod of modulos) {
        const data = await readAttendanceModule(page, mod.href);
        const sesiones = data.filas.map(parseSessionRow);

        materias.push({
          cursoId: curso.id,
          materia: curso.nombre,
          modulo: mod.nombre,
          url: mod.href,
          sesiones,
          resumen: data.resumen,
          // Presencia del link = el profe abrió la sesión ahora mismo.
          sesionAbierta: data.submit.length > 0 ? data.submit[0] : null,
          // Si alguna vez se auto-registró, el curso lo permite. Sirve para que
          // la UI diga "acá te podés marcar" aunque ahora no haya sesión.
          permiteAutoRegistro: sesiones.some((s) => s.autoRegistrada),
        });

        log(`  ${curso.nombre}: ${sesiones.length} sesiones, ${data.resumen.porcentaje || '—'}${data.submit.length ? ' · SESIÓN ABIERTA' : ''}`);
      }
    }

    onProgress?.({ done: cursos.length, total: cursos.length, curso: null });

    return { version: CACHE_VERSION, timestamp: new Date().toISOString(), materias };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Registro — el único camino que escribe
// ---------------------------------------------------------------------------

// La URL del form sale de scrapear la página del curso, o sea de contenido que
// no controlamos. Se fija el host además de la forma: un link plantado hacia
// otro dominio se llevaría la cookie de sesión de Moodle al navegar.
function isSessionUrl(url) {
  try {
    const parsed = new URL(String(url));

    return parsed.protocol === 'https:'
      && parsed.hostname === PORTAL_HOST
      && parsed.pathname.endsWith('/mod/attendance/attendance.php')
      && parsed.searchParams.has('sessid');
  } catch (_error) {
    return false;
  }
}

// Devuelve las opciones que el formulario REAL ofrece, sin enviar nada. La UI
// las muestra para que el usuario elija con qué estado marcarse.
async function readMarkOptions(page, submitUrl) {
  await page.goto(submitUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;

    return {
      urlFinal: location.href,
      hayForm: Boolean(main.querySelector('form')),
      opciones: Array.from(main.querySelectorAll('input[type="radio"]'))
        .filter((input) => /status/i.test(input.name || ''))
        .map((input) => ({
          value: input.value,
          label: norm(input.closest('label, .form-check, .felement, td')?.textContent || '') || input.value,
        })),
      pidePassword: Boolean(main.querySelector('input[name*="password"]')),
      textoVisible: norm(main.textContent || '').slice(0, 600),
    };
  });
}

// Marca la asistencia clickeando el formulario real del portal.
//
// NO se arma un POST a mano a propósito: los nombres de campo de mod_attendance
// cambian entre versiones del plugin, y un POST mal formado contra un registro
// académico es peor que no hacer nada. Si el form no está donde se espera, se
// aborta.
async function markAttendance({ url, statusValue = null, password = null }) {
  if (!isSessionUrl(url)) return { error: 'INVALID_SESSION_URL' };

  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;
  if (!user || !pass) return { error: 'NO_CREDENTIALS' };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  try {
    const { loginToIVirtual } = require('./scraper');
    const loginError = await loginToIVirtual(page, user, pass);
    if (loginError) return { error: loginError };

    const opciones = await readMarkOptions(page, url);

    // La ventana de auto-registro se cierra sola: entre que la UI mostró el
    // botón y el usuario lo apretó, el profe pudo cerrar la sesión.
    if (!opciones.hayForm || opciones.opciones.length === 0) {
      return { error: 'SESSION_CLOSED', message: 'La sesión ya no acepta registro. Puede haberla cerrado el profesor.' };
    }

    if (opciones.pidePassword && !password) {
      return { error: 'PASSWORD_REQUIRED', opciones: opciones.opciones };
    }

    // Sin elección explícita se toma la primera, que en mod_attendance es el
    // estado "presente". Igual la UI siempre manda una.
    const elegido = statusValue || opciones.opciones[0].value;
    const radio = page.locator(`input[type="radio"][value="${elegido}"]`).first();

    if ((await radio.count()) === 0) {
      return { error: 'STATUS_NOT_FOUND', message: `El portal no ofrece el estado "${elegido}".` };
    }

    await radio.check();

    if (password) {
      const campo = page.locator('input[name*="password"]').first();
      if ((await campo.count()) > 0) await campo.fill(String(password));
    }

    // El botón del propio form, no una URL construida.
    const boton = page.locator('form button[type="submit"], form input[type="submit"]').first();

    if ((await boton.count()) === 0) {
      return { error: 'SUBMIT_NOT_FOUND', message: 'No se encontró el botón de envío en el portal.' };
    }

    await boton.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(900);

    // El resultado se LEE del portal, no se asume por haber clickeado. Es el
    // mismo criterio que usa la entrega de actividades.
    const resultado = await page.evaluate(() => {
      const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
      const main = document.querySelector('#region-main') || document.body;
      const texto = norm(main.textContent || '');

      return {
        url: location.href,
        // Volver a la vista del módulo con el estado ya puesto es la señal de
        // éxito de mod_attendance.
        volvioAlModulo: location.href.includes('/mod/attendance/view.php'),
        errorVisible: norm(main.querySelector('.alert-danger, .error, .notifyproblem')?.textContent || ''),
        seAutoRegistro: /self.?recorded|auto.?registrad/i.test(texto),
        extracto: texto.slice(0, 400),
      };
    });

    if (resultado.errorVisible) {
      return { error: 'PORTAL_REJECTED', message: resultado.errorVisible };
    }

    if (!resultado.volvioAlModulo && !resultado.seAutoRegistro) {
      return { error: 'UNCONFIRMED', message: 'El portal no confirmó el registro. Revisá en iVirtual antes de asumir que quedó.', detalle: resultado.extracto };
    }

    log('asistencia registrada:', resultado.url);
    return { ok: true, estado: elegido, url: resultado.url };
  } catch (error) {
    log('falló el registro:', error?.message || error);
    return { error: 'MARK_FAILED', message: error?.message || String(error) };
  } finally {
    await browser.close().catch(() => {});
  }
}

// Abre el navegador headless sólo para leer qué opciones ofrece el form, sin
// marcar. La UI lo usa para armar el diálogo de confirmación.
async function peekMarkOptions(url) {
  if (!isSessionUrl(url)) return { error: 'INVALID_SESSION_URL' };

  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;
  if (!user || !pass) return { error: 'NO_CREDENTIALS' };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  try {
    const { loginToIVirtual } = require('./scraper');
    const loginError = await loginToIVirtual(page, user, pass);
    if (loginError) return { error: loginError };

    const opciones = await readMarkOptions(page, url);

    if (!opciones.hayForm || opciones.opciones.length === 0) {
      return { error: 'SESSION_CLOSED' };
    }

    return { ok: true, opciones: opciones.opciones, pidePassword: opciones.pidePassword };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerAttendanceHandlers() {
  ipcMain.handle('attendance:get-cached', async () => ({ ok: true, data: readCache() }));

  ipcMain.handle('attendance:sync', async (event) => {
    try {
      const data = await scrapeAttendance({
        onProgress: (progress) => event.sender.send('attendance:progress', progress),
      });

      if (data.error) return { ok: false, error: data.error };

      writeCache(data);
      return { ok: true, data };
    } catch (error) {
      log('sync falló:', error?.message || error);
      return { ok: false, error: error?.message || 'No fue posible leer la asistencia.' };
    }
  });

  ipcMain.handle('attendance:peek-options', async (_event, payload) => peekMarkOptions(payload?.url));

  // El ÚNICO canal que escribe. No lo llama ninguna sync ni ningún timer: sale
  // de que el usuario apretó el botón y confirmó.
  ipcMain.handle('attendance:mark', async (_event, payload) => markAttendance(payload || {}));
}

module.exports = {
  CACHE_VERSION,
  isSessionUrl,
  getCachePath,
  markAttendance,
  parseSessionRow,
  peekMarkOptions,
  readCache,
  registerAttendanceHandlers,
  scrapeAttendance,
  writeCache,
};
