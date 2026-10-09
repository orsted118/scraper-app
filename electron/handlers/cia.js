// LEER ANTES DE TOCAR NADA — recon del portal, verificado 2026-09-11 contra la
// cuenta real.
//
// Fuente: Autoservicio > Registros Académicos > Mis Calificaciones
//   componente SA_LEARNER_SERVICES.SS_ES_GRADE_LIST.GBL, HTML puro.
//
//   NO se usa la Boleta (SQR ITSR0001), que es lo que había acá antes: su
//   matriz de evaluaciones UC/EV viene entera en guiones —el propio pie del PDF
//   dice que esas columnas no se usaron para la calificación final— así que el
//   modelo de "parciales" que armaba el handler viejo modelaba algo que el
//   portal no publica. Además su run control solo logra encolar el ciclo 3147:
//   con 3145 y 3153 el submit sale limpio y el Process Scheduler no encola nada.
//
// Trampas del portal, todas pagadas con horas:
//  - Los frames NAV y TargetContent se solapan e interceptan pointer events: un
//    locator.click() de Playwright nunca llega. Se dispara el javascript: del
//    portal (ver utils/ciaSession).
//  - Identificar frames por URL no sirve: el shell /psp/ y el UniversalHeader
//    llevan el nombre del componente en sus query params.
//  - El <select> de ciclo NO hace postback solo: hay que pegarle al link
//    "cambiar" (#DERIVED_AA2_DERIVED_LINK3) después de elegir.
//  - El ciclo en curso trae las materias con Calificación Oficial VACÍA, y esa
//    fila llega al DOM con UNA CELDA MENOS. No es un error: es un semestre
//    corriendo. Por eso jamás se filtran celdas vacías al leer la tabla.
//  - Dos fórmulas de promedio distintas, NO unificarlas: la del ciclo promedia
//    TODAS las numéricas (3147: 47/6 = 7.83, coincide con la boleta oficial);
//    la global promedia SOLO las aprobadas (72/9 = 8.000, coincide con el RPA).

const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron?.app;
const ipcMain = electron?.ipcMain;
const { chromium } = require('playwright');
const notificationCenter = require('./notification-center');
const { buildInstructorIndex, lookupInstructor } = require('../utils/instructorLookup');
const ciaSession = require('../utils/ciaSession');
const { extraerTexto } = require('../utils/sqrPdfText');
const { parseRPA } = require('../utils/rpaParser');

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // las notas oficiales cambian de a semanas
const GLOBAL_TIMEOUT_MS = 180_000;
// El expediente agrega el Process Scheduler y el Gestor de Informes al flujo:
// con el timeout normal la corrida completa queda al borde.
const GLOBAL_TIMEOUT_CON_EXPEDIENTE_MS = 300_000;
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);

// 1 → notas oficiales por ciclo desde HTML. Un caché SIN este campo es el
//     formato viejo de la boleta (parciales inventados): se descarta, no se
//     trata como v1.
const CALIFICACIONES_CACHE_SCHEMA_VERSION = 1;

const SELECT_CICLO = '#DERIVED_AA3_DERIVED_STERM';
const LINK_CAMBIAR = '#DERIVED_AA2_DERIVED_LINK3';
const TABLA_NOTAS = 'table[id^="STDNT_GRAD_SSVW"]';

// Reporte de Progreso Académico: Centro de Alumnado > "Reporte Prog Academico"
// > página de parámetros (precargada) > Ejecutar > Gestor de Informes.
const LINK_RPA = '#ITSR_DERIVED_PUSH';
const BOTON_RPA = '#ITSRPROGACA_WRK_PUSH';
const LINK_INFORME = '[id^="CONTENT_LINK"]';

// El expediente cambia cuando cierra un semestre, no durante: no tiene sentido
// pagar el Process Scheduler en cada sync.
const EXPEDIENTE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const CALIFICACION_MINIMA_APROBATORIA = 7;

let activeController = null;

function log(...args) {
  console.log('[calificaciones]', ...args);
}

// ---------------------------------------------------------------- Persistencia

function getUserDataPath() {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('userData');
  }

  const fallbackPath = path.join(process.cwd(), '.local-data');
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
}

// Función y no constante de módulo: los tests stubean app.getPath.
function getCachePath() {
  return path.join(getUserDataPath(), 'cia-cache.json');
}

function discardFile(cachePath) {
  if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
}

function readCache() {
  const cachePath = getCachePath();

  try {
    if (!fs.existsSync(cachePath)) return null;

    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

    // Un caché sin `schemaVersion` es el formato de la boleta, incompatible en
    // forma: no se trata como v1, se tira.
    if (parsed?.schemaVersion !== CALIFICACIONES_CACHE_SCHEMA_VERSION) {
      log('caché con esquema distinto: se descarta y se vuelve a extraer');
      discardFile(cachePath);
      return null;
    }

    if (!Array.isArray(parsed.ciclos) || typeof parsed.timestamp !== 'number') {
      log('caché con forma inesperada: se descarta');
      discardFile(cachePath);
      return null;
    }

    return parsed;
  } catch (_error) {
    discardFile(cachePath);
    return null;
  }
}

function writeCache(payload) {
  const anterior = readCache();

  const registro = {
    schemaVersion: CALIFICACIONES_CACHE_SCHEMA_VERSION,
    timestamp: Date.now(),
    cicloActual: payload.cicloActual || null,
    ciclos: Array.isArray(payload.ciclos) ? payload.ciclos : [],
    // El expediente lo llena el RPA, que corre aparte y puede no haber corrido
    // en esta pasada: conservar el anterior en vez de borrarlo.
    expediente: payload.expediente ?? anterior?.expediente ?? null,
  };

  fs.writeFileSync(getCachePath(), JSON.stringify(registro, null, 2), 'utf8');
  return registro;
}

function clearCIACache() {
  discardFile(getCachePath());
  return { success: true };
}

// ------------------------------------------------------------------- Parseo

// La celda "Curso" viene como "M 1172M" / "IDIOMA 1043D" / "TUTORIA 1132T":
// área + catálogo. El catálogo es el último token.
function parseCurso(celda) {
  const tokens = String(celda || '').trim().split(/\s+/).filter(Boolean);

  if (!tokens.length) return { area: '', codigo: '' };
  if (tokens.length === 1) return { area: '', codigo: tokens[0] };

  return { area: tokens.slice(0, -1).join(' '), codigo: tokens[tokens.length - 1] };
}

// La escala oficial del ITSON es entera 0-10, mínimo 7 para aprobar. Los cursos
// adicionales (laboratorios, tutorías) usan A/NA en vez de número.
function parseCalificacion(celda) {
  const texto = String(celda || '').trim();

  if (!texto) return { calificacion: null, literal: null };

  if (/^N\/?A$/i.test(texto)) return { calificacion: null, literal: 'NA' };
  if (/^A$/i.test(texto)) return { calificacion: null, literal: 'A' };

  const numero = Number(texto.replace(',', '.'));
  if (Number.isFinite(numero)) return { calificacion: numero, literal: null };

  return { calificacion: null, literal: texto.toUpperCase() };
}

// Sin `en_riesgo`: un 6 está reprobado, no en riesgo — el RPA lista los 6 bajo
// ASIGNATURAS REPROBADAS. Ese umbral solo tenía sentido para parciales.
function getEstado({ calificacion, literal }) {
  if (literal === 'A') return 'acreditada';
  if (literal === 'NA') return 'no_acreditada';
  if (!Number.isFinite(calificacion)) return 'sin_calificacion';
  return calificacion >= CALIFICACION_MINIMA_APROBATORIA ? 'aprobada' : 'reprobada';
}

function media(valores) {
  if (!valores.length) return null;
  const suma = valores.reduce((acc, v) => acc + v, 0);
  return Number((suma / valores.length).toFixed(2));
}

// Promedio del ciclo: TODAS las numéricas, reprobadas incluidas.
function promedioCiclo(materias) {
  return media(
    (materias || []).map((m) => m.calificacion).filter((c) => Number.isFinite(c)),
  );
}

// Promedio global: SOLO las aprobadas. Es la fórmula del RPA, distinta de la
// del ciclo a propósito.
function promedioGlobalCalculado(ciclos) {
  const aprobadas = (ciclos || [])
    .flatMap((ciclo) => ciclo.materias || [])
    .map((m) => m.calificacion)
    .filter((c) => Number.isFinite(c) && c >= CALIFICACION_MINIMA_APROBATORIA);

  return media(aprobadas);
}

// El value del <option> es "000002790093145LIC ITSON": matrícula + STRM + grado.
function cicloIdFromValue(value) {
  return String(value || '').replace(/\s+/g, '').slice(11, 15);
}

const ES_UNIDADES = /^\d+\.\d{2}$/;

// Mapea por ENCABEZADO, no por posición fija: el ciclo en curso devuelve una
// celda menos y un mapeo posicional le asignaría las unidades a la calificación.
function filasAMaterias(filas) {
  const normalizar = (s) => String(s || '').replace(/\s+/g, ' ').trim();

  const indiceEncabezado = (filas || []).findIndex((fila) => {
    const texto = fila.map(normalizar).join(' | ').toLowerCase();
    return texto.includes('curso') && texto.includes('nombre clase');
  });

  if (indiceEncabezado === -1) return [];

  const encabezado = filas[indiceEncabezado].map((c) => normalizar(c).toLowerCase());
  const col = {
    curso: encabezado.findIndex((c) => c.includes('curso')),
    nombre: encabezado.findIndex((c) => c.includes('nombre')),
    calificacion: encabezado.findIndex((c) => c.includes('calificaci')),
    unidades: encabezado.findIndex((c) => c.includes('unidades')),
  };

  return filas
    .slice(indiceEncabezado + 1)
    .map((fila) => {
      const celdas = fila.map(normalizar);

      // El breadcrumb ("Mi Informe Calificaciones > ...") llega como fila de una
      // sola celda.
      if (celdas.length < 2) return null;

      let curso;
      let nombre;
      let calificacionCruda;
      let unidadesCrudas;

      if (celdas.length === encabezado.length) {
        curso = celdas[col.curso];
        nombre = celdas[col.nombre];
        calificacionCruda = celdas[col.calificacion];
        unidadesCrudas = celdas[col.unidades];
      } else {
        // Ciclo en curso: falta la celda de calificación. Se reconstruye por
        // forma desde la derecha — las unidades son el "N.NN" final.
        const ultima = celdas[celdas.length - 1];
        const tieneUnidades = ES_UNIDADES.test(ultima);

        curso = celdas[0];
        unidadesCrudas = tieneUnidades ? ultima : '';
        nombre = celdas.slice(1, tieneUnidades ? -1 : undefined).join(' ');
        calificacionCruda = '';
      }

      const { area, codigo } = parseCurso(curso);
      if (!codigo) return null;

      const { calificacion, literal } = parseCalificacion(calificacionCruda);
      const unidades = ES_UNIDADES.test(unidadesCrudas) ? Number(unidadesCrudas) : null;

      return {
        codigo,
        clave: codigo,
        area,
        nombre: normalizar(nombre),
        profesor: '',
        calificacion,
        literal,
        unidades,
        estado: getEstado({ calificacion, literal }),
      };
    })
    .filter(Boolean);
}

// ------------------------------------------------------------ Enriquecimiento

function readHorarioCacheLazy() {
  try {
    return require('./horario').readHorarioCache();
  } catch (_error) {
    return null;
  }
}

// El horario trae el número de clase (14753) y el CIA el catálogo (1172M), así
// que el match pega por nombre normalizado, no por código.
function enrichWithInstructors(ciclos) {
  const index = buildInstructorIndex(readHorarioCacheLazy());

  return (ciclos || []).map((ciclo) => ({
    ...ciclo,
    materias: (ciclo.materias || []).map((materia) => ({
      ...materia,
      profesor:
        materia.profesor ||
        lookupInstructor(index, { codigo: materia.codigo, nombre: materia.nombre }),
    })),
  }));
}

// --------------------------------------------------------------- Scraping

async function applyResourceBlocking(page) {
  await page.route('**/*', (route) => {
    if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) {
      route.abort();
      return;
    }
    route.continue();
  });
}

const LEER_TABLA = (selector) => {
  const limpio = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const tabla = document.querySelector(selector);
  if (!tabla) return { filas: [], breadcrumb: '' };

  return {
    // Sin filtrar celdas vacías: la celda ausente de calificación en el ciclo
    // en curso es justamente la señal que distingue ese caso.
    filas: Array.from(tabla.rows).map((tr) => Array.from(tr.cells).map((c) => limpio(c.innerText))),
    breadcrumb: limpio(tabla.rows[0]?.innerText || ''),
  };
};

async function abrirMisCalificaciones(page) {
  const autoservicio = page.getByRole('link', { name: /autoservicio/i }).last();
  await autoservicio.click().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, ciaSession.PSOFT_SETTLE_MS));

  for (const frame of page.frames()) {
    const link = frame.getByRole('link', { name: /mis calificaciones/i }).first();
    if (await link.count().catch(() => 0)) {
      await link.click({ timeout: 10_000 }).catch(async () => {
        const id = await frame
          .evaluate(() => {
            const a = Array.from(document.querySelectorAll('a[id]')).find((x) =>
              /mis calificaciones/i.test(x.textContent || ''));
            return a?.id || null;
          })
          .catch(() => null);
        if (id) await ciaSession.submitAction(frame, id).catch(() => {});
      });
      break;
    }
  }

  return ciaSession.findFrameBySelector(page, SELECT_CICLO);
}

// --------------------------------------------------- Expediente (RPA, PDF)

// El expediente sale de un informe que hay que ENCOLAR en el Process Scheduler
// y después recoger del Gestor de Informes. Es caro (~40 s) y falla más que el
// HTML, así que nunca es fatal: si no sale, el sync sigue siendo exitoso.
async function scrapeExpediente(page, context) {
  // Después de recorrer los ciclos estamos en la hoja de Mis Calificaciones,
  // no en el Centro de Alumnado: hay que volver o el enlace del RPA no existe.
  await page.getByRole('link', { name: /autoservicio/i }).last().click().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, ciaSession.PSOFT_SETTLE_MS));

  for (const frame of page.frames()) {
    const link = frame.getByRole('link', { name: /centro de alumnado/i }).first();
    if (await link.count().catch(() => 0)) {
      await link.click({ timeout: 10_000 }).catch(() => {});
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, ciaSession.PSOFT_SETTLE_MS));

  const centro = await ciaSession.findFrameBySelector(page, LINK_RPA);
  if (!centro) { log('expediente: no se volvió al Centro de Alumnado'); return null; }

  await ciaSession.submitAction(centro, LINK_RPA.replace('#', ''));
  await new Promise((resolve) => setTimeout(resolve, ciaSession.PSOFT_SETTLE_MS));

  const params = await ciaSession.findFrameBySelector(page, BOTON_RPA);
  if (!params) { log('expediente: no se abrió la página de parámetros del RPA'); return null; }

  // No se usa submitAndWait acá: ese helper re-busca el frame por el MISMO
  // selector después de accionar, y este submit cambia de componente, con lo
  // que el botón deja de existir y la verificación nunca podría dar verdadero.
  //
  // El botón además responde de forma intermitente: el portal pierde submits
  // entre nodos del balanceador, y a veces sólo anda el click nativo.
  let lista = null;

  for (let intento = 1; intento <= 3 && !lista; intento += 1) {
    const actual = await ciaSession.findFrameBySelector(page, BOTON_RPA, 5000);
    if (!actual) break; // ya salió de la página de parámetros

    await actual
      .evaluate((id) => {
        const boton = document.getElementById(id);
        if (!boton) return;
        if (typeof window.submitAction_win0 === 'function') window.submitAction_win0(boton.form, boton.name);
        else boton.click();
      }, BOTON_RPA.replace('#', ''))
      .catch(() => {});

    lista = await ciaSession.findFrameBySelector(page, LINK_INFORME, 30_000);
    if (!lista) log(`expediente: intento ${intento} no llegó al Gestor`);
  }

  if (!lista) { log('expediente: el informe no llegó al Gestor'); return null; }

  // El SQR tarda: la fila queda en "Enviado" recién cuando el PDF está servible.
  for (let intento = 1; intento <= 10; intento += 1) {
    const listo = await lista
      .evaluate(() => /Enviado|Generado|Posted/i.test(document.body.innerText || ''))
      .catch(() => false);
    if (listo) break;
    await new Promise((resolve) => setTimeout(resolve, 6000));
  }

  // El Detalle, no la Descripción: la Descripción abre una ventana que queda en
  // about:blank mientras PeopleSoft redirige por dentro. Además, pasar por el
  // Detalle es lo que autoriza /psreports/ para esta sesión — armar la URL a
  // mano desde los ids de la tabla devuelve 403.
  const esperaVentana = context.waitForEvent('page', { timeout: 20_000 }).catch(() => null);
  const actual = (await ciaSession.findFrameBySelector(page, LINK_INFORME)) || lista;
  await ciaSession.submitAction(actual, 'CDM_WRK_INDEX_BTN$0').catch(() => {});

  const ventana = await esperaVentana;
  if (ventana) {
    await ventana.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
    await ventana.waitForTimeout(6000);
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const urls = new Set();
  for (const p of [page, ...context.pages()]) {
    for (const frame of p.frames()) {
      const hrefs = await frame
        .evaluate(() => Array.from(document.querySelectorAll('a'))
          .map((a) => a.href)
          .filter((h) => /\.pdf$/i.test(h)))
        .catch(() => []);
      hrefs.forEach((h) => urls.add(h));
    }
  }

  log(`expediente: ${urls.size} PDF(s) en el Detalle`);

  for (const url of urls) {
    // El request context reusa la cookie de sesión, que /psreports/ exige.
    const res = await context.request.get(url).catch(() => null);
    const archivo = url.split('/').pop();

    if (!res?.ok()) { log(`expediente: ${archivo} -> ${res?.status() ?? 'sin respuesta'}`); continue; }

    const buffer = await res.body();
    const parsed = parseRPA(extraerTexto(buffer));

    if (Number.isFinite(parsed?.promedioGlobal)) {
      log(`expediente: ${archivo} parseado, promedio ${parsed.promedioGlobal}`);
      return { ...parsed, actualizado: Date.now() };
    }

    // Un ITSR0001 es una Boleta, no el RPA: rechazarla es correcto.
    log(`expediente: ${archivo} (${buffer.length} bytes) no es un RPA parseable`);
  }

  log('expediente: ningún PDF del Gestor pudo parsearse como RPA');
  return null;
}

async function scrapeCalificaciones(controller = {}, onProgress, conExpediente = false) {
  const user = process.env.CIA_USER?.trim();
  const password = process.env.CIA_PASS?.trim();

  if (!user && !password) return { error: 'CIA_NO_CREDENTIALS' };
  if (!user) return { error: 'CIA_NO_USER' };
  if (!password) return { error: 'CIA_NO_PASSWORD' };

  const browser = await chromium.launch({ headless: true });
  controller.browser = browser;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(ciaSession.PAGE_TIMEOUT_MS);
    await applyResourceBlocking(page);

    const loginResult = await ciaSession.loginToCIA(page, user, password);
    if (loginResult?.error) return loginResult;

    const frameNotas = await abrirMisCalificaciones(page);
    if (!frameNotas) return { error: 'CIA_GRADES_UNAVAILABLE' };

    const opciones = await frameNotas.evaluate((selector) => {
      const select = document.querySelector(selector);
      if (!select) return { ciclos: [], seleccionado: null };

      const ciclos = Array.from(select.options)
        .map((o) => ({ value: o.value, nombre: (o.textContent || '').trim() }))
        .filter((o) => o.nombre && o.value.trim());

      return { ciclos, seleccionado: select.value };
    }, SELECT_CICLO);

    if (!opciones.ciclos.length) return { error: 'CIA_GRADES_UNAVAILABLE' };

    const ciclos = [];

    for (let i = 0; i < opciones.ciclos.length; i += 1) {
      const opcion = opciones.ciclos[i];
      onProgress?.({ done: i, total: opciones.ciclos.length, ciclo: opcion.nombre });

      try {
        const frameActual = await ciaSession.findFrameBySelector(page, SELECT_CICLO);
        if (!frameActual) continue;

        await frameActual.selectOption(SELECT_CICLO, opcion.value);

        // El select no hace postback solo: el link "cambiar" es el que aplica.
        const frameCambiado = await ciaSession.submitAndWait(
          page,
          SELECT_CICLO,
          LINK_CAMBIAR.replace('#', ''),
          (frame) =>
            frame.evaluate(
              (args) => {
                const tabla = document.querySelector(args.selector);
                return Boolean(tabla) && (tabla.innerText || '').includes(args.nombre);
              },
              { selector: TABLA_NOTAS, nombre: opcion.nombre },
            ),
        );

        const frameLectura = frameCambiado || (await ciaSession.findFrameBySelector(page, SELECT_CICLO));
        if (!frameLectura) continue;

        const { filas } = await frameLectura.evaluate(LEER_TABLA, TABLA_NOTAS);
        const materias = filasAMaterias(filas);
        if (!materias.length) continue;

        ciclos.push({
          id: cicloIdFromValue(opcion.value),
          value: opcion.value,
          nombre: opcion.nombre,
          enCurso: materias.some((m) => m.estado === 'sin_calificacion'),
          promedio: promedioCiclo(materias),
          creditos: Number(
            materias.reduce((sum, m) => sum + (Number.isFinite(m.unidades) ? m.unidades : 0), 0).toFixed(2),
          ),
          materias,
        });
      } catch (error) {
        // Un ciclo que falla el postback no invalida los demás.
        log(`ciclo "${opcion.nombre}" no se pudo leer:`, String(error?.message || error).slice(0, 120));
      }
    }

    onProgress?.({ done: opciones.ciclos.length, total: opciones.ciclos.length });

    if (!ciclos.length) return { error: 'CIA_GRADES_UNAVAILABLE' };

    ciclos.sort((a, b) => String(b.id).localeCompare(String(a.id)));

    // El expediente es el único lugar del portal con el promedio global. Se
    // recoge en la misma sesión, pero nunca es fatal: se devuelve `undefined`
    // para que writeCache conserve el que ya había.
    let expediente;

    if (conExpediente) {
      onProgress?.({ done: opciones.ciclos.length, total: opciones.ciclos.length, ciclo: 'expediente académico' });

      try {
        expediente = (await scrapeExpediente(page, context)) ?? undefined;
        if (!expediente) log('el expediente (RPA) no se pudo recoger; se conserva el anterior');
      } catch (error) {
        log('expediente (RPA) falló:', String(error?.message || error).slice(0, 120));
      }
    }

    return {
      cicloActual: cicloIdFromValue(opciones.seleccionado) || ciclos[0]?.id || null,
      ciclos,
      expediente,
    };
  } finally {
    await browser.close().catch(() => {});
    controller.browser = null;
  }
}

// ------------------------------------------------------------- Orquestador

async function getCalificacionesWithCache({ force = false } = {}, onProgress) {
  if (activeController) {
    return { error: 'Ya hay una sincronización de calificaciones en progreso.' };
  }

  const cached = readCache();

  if (!force && cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    return { ...cached, ciclos: enrichWithInstructors(cached.ciclos), fromCache: true };
  }

  const controller = {};
  activeController = controller;

  // El expediente pasa por el Process Scheduler y suma ~40 s: solo cuando el
  // usuario pidió la sync a mano y el que hay ya venció.
  const expedienteVencido = !cached?.expediente?.actualizado
    || Date.now() - cached.expediente.actualizado > EXPEDIENTE_MAX_AGE_MS;
  const conExpediente = force && expedienteVencido;

  let timeoutId = null;

  try {
    const result = await Promise.race([
      scrapeCalificaciones(controller, onProgress, conExpediente),
      new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          controller.browser?.close().catch(() => {});
          resolve({ error: 'CIA_TIMEOUT' });
        }, conExpediente ? GLOBAL_TIMEOUT_CON_EXPEDIENTE_MS : GLOBAL_TIMEOUT_MS);
      }),
    ]);

    if (result?.error) {
      notificationCenter.processSyncError?.('calificaciones', result.error);

      // Una caché vencida es mejor que una pantalla vacía: un error de acceso no
      // es evidencia de que lo guardado esté mal.
      if (cached) {
        return {
          ...cached,
          ciclos: enrichWithInstructors(cached.ciclos),
          fromCache: true,
          stale: true,
          error: result.error,
        };
      }

      return result;
    }

    const enriquecido = { ...result, ciclos: enrichWithInstructors(result.ciclos) };
    const registro = writeCache(enriquecido);

    notificationCenter.processSync?.('calificaciones', registro);

    return { ...registro, ciclos: enriquecido.ciclos, fromCache: false };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    activeController = null;
  }
}

// -------------------------------------------------------------------- IPC

function registerCIAHandlers() {
  if (!ipcMain?.handle) return; // los tests stubean electron con ipcMain: null

  ipcMain.handle('cia:run', async (_event, options) => getCalificacionesWithCache(options || {}));
  ipcMain.handle('cia:clear-cache', async () => clearCIACache());
}

module.exports = {
  CALIFICACIONES_CACHE_SCHEMA_VERSION,
  parseCurso,
  parseCalificacion,
  getEstado,
  promedioCiclo,
  promedioGlobalCalculado,
  cicloIdFromValue,
  filasAMaterias,
  getCachePath,
  readCache,
  writeCache,
  clearCIACache,
  scrapeCalificaciones,
  getCalificacionesWithCache,
  registerCIAHandlers,
};
