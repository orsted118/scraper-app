// Entrega de archivos a iVirtual desde las cards de Actividades.
//
// LEER ANTES DE TOCAR NADA — el supuesto que rompió esto en producción:
//
// Moodle tiene un ajuste POR ACTIVIDAD, `submissiondrafts` ("Require students
// to click submit button"). Determina si existe un estado intermedio:
//
//   submissiondrafts = Yes → "Save changes" deja la entrega en BORRADOR, y
//                            hace falta un segundo paso explícito para
//                            enviarla a calificar.
//   submissiondrafts = No  → "Save changes" ES la entrega final. Moodle marca
//                            "Submitted for grading" en el acto. NO hay
//                            borrador que valga.
//
// La primera versión de este módulo asumía que el borrador siempre existía y
// prometía "nunca enviar a calificar". Contra una actividad real con
// submissiondrafts=No, guardar dejó la entrega enviada — exactamente lo que
// decía evitar. El supuesto nunca se había verificado contra el portal.
//
// No hay forma confiable de saber de antemano cuál de las dos configuraciones
// tiene una actividad sin guardar algo. Así que el diseño NO se apoya en
// adivinarlo:
//   1. La UI avisa ANTES de que la entrega puede quedar como final.
//   2. Después de guardar se RELEE el estado real y se reporta el que quedó,
//      sin asumir cuál fue.
//   3. `removeSubmission` deshace desde la app, sin ir al portal a mano.
const fs = require('fs');
const path = require('path');
const { app, dialog, ipcMain } = require('electron');
const { chromium } = require('playwright');

const EDIT_ACTION = 'action=editsubmission';
const PAGE_TIMEOUT_MS = 30_000;
const NAV_TIMEOUT_MS = 45_000;
const UPLOAD_TIMEOUT_MS = 120_000;

// El arranque en frío de Playwright cuesta 15-30 s. Subir tres archivos
// levantando un browser por archivo es inusable, así que la sesión logueada se
// reusa y se cierra sola tras un rato sin actividad.
const SESSION_IDLE_MS = 5 * 60 * 1000;

let cachedSession = null;
let idleTimer = null;

function log(...args) {
  console.log('[upload]', ...args);
}

function buildError(code, message) {
  return { error: code, message: message || null };
}

// ---------------------------------------------------------------------------
// Sesión reutilizable
// ---------------------------------------------------------------------------

function scheduleIdleClose() {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(() => {
    closeSession('idle');
  }, SESSION_IDLE_MS);
}

async function closeSession(reason = 'manual') {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  const session = cachedSession;
  cachedSession = null;

  if (!session) {
    return;
  }

  log('cerrando sesión del navegador:', reason);
  await session.browser.close().catch(() => {});
}

async function getSession() {
  if (cachedSession) {
    // Un browser cerrado por fuera (crash, cierre de la app) deja el objeto
    // colgado: se detecta acá en vez de fallar en medio de una subida.
    if (cachedSession.browser.isConnected()) {
      scheduleIdleClose();
      return cachedSession;
    }
    cachedSession = null;
  }

  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;

  if (!user || !pass) {
    throw Object.assign(new Error('NO_CREDENTIALS'), {
      result: buildError('NO_CREDENTIALS', 'Configura tus credenciales de iVirtual en Ajustes.'),
    });
  }

  log('abriendo navegador y logueando…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  // El scraper ya sabe loguear; se reutiliza para no tener dos implementaciones
  // del login que puedan divergir cuando el portal cambie.
  const { loginToIVirtual } = require('./scraper');
  const loginError = await loginToIVirtual(page, user, pass);

  if (loginError) {
    await browser.close().catch(() => {});
    throw Object.assign(new Error('LOGIN_FAILED'), {
      result: buildError('LOGIN_FAILED', 'iVirtual rechazó las credenciales.'),
    });
  }

  cachedSession = { browser, context, page };
  scheduleIdleClose();
  return cachedSession;
}

// ---------------------------------------------------------------------------
// Lectura del formulario de entrega
// ---------------------------------------------------------------------------

function buildEditUrl(assignmentUrl) {
  const parsed = new URL(assignmentUrl);
  const cmid = parsed.searchParams.get('id');

  if (!cmid || !/^\d+$/.test(cmid)) {
    return null;
  }

  return `https://ivirtual.itson.edu.mx/mod/assign/view.php?id=${cmid}&${EDIT_ACTION}`;
}

function buildViewUrl(assignmentUrl) {
  const parsed = new URL(assignmentUrl);
  const cmid = parsed.searchParams.get('id');
  return `https://ivirtual.itson.edu.mx/mod/assign/view.php?id=${cmid}`;
}

// Lee del formulario vivo todo lo que la UI necesita para validar antes de
// subir. Las restricciones NO viajan en atributos data-* del contenedor: viven
// en el JSON de configuración del filepicker que Moodle inyecta por JS.
async function readSubmissionForm(page) {
  return page.evaluate(() => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;
    const html = document.documentElement.innerHTML;

    const pickNumber = (pattern) => {
      const match = html.match(pattern);
      return match ? Number(match[1]) : null;
    };

    const formButtons = Array.from(main.querySelectorAll('form button, form input[type="submit"]'))
      .map((el) => normalize(el.textContent || el.value || ''))
      .filter(Boolean);

    // Una actividad vencida o cerrada devuelve solo "Continue" y sin
    // filemanager. Es la señal del propio portal, más confiable que comparar
    // contra la fecha límite (que no contempla prórrogas del profesor).
    const puedeEntregar = formButtons.some((label) => /save changes|guardar cambios/i.test(label));

    // El filemanager de la ENTREGA es el único que Moodle monta con
    // M.form_filemanager.init. Los otros bloques de opciones de la página
    // pertenecen al editor de texto enriquecido (sus pickers de imagen, media y
    // subtítulos), y aparecen ANTES en el documento.
    //
    // Buscar accepted_types en todo el HTML agarraba el primero, que es el
    // picker de imágenes del editor (.gif/.jpg/.png/.svg): la app creía que la
    // entrega sólo aceptaba imágenes y rechazaba PDFs que el portal sí acepta.
    // Medido en "Asignación 01 - Tipos de Datos Abstractos": 14 bloques en la
    // página, 12 del editor, y el de la entrega acepta [.pdf, .doc, .docx].
    const readFilemanagerOptions = () => {
      const anchor = html.indexOf('M.form_filemanager.init');
      if (anchor === -1) return null;

      const start = html.indexOf('{', anchor);
      if (start === -1) return null;

      // Recorrido con conciencia de strings: las opciones traen HTML con
      // comillas escapadas, así que contar llaves a secas corta de más.
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let i = start; i < html.length; i += 1) {
        const char = html[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          if (inString) escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') depth += 1;
        else if (char === '}') {
          depth -= 1;
          if (depth === 0) {
            try {
              return JSON.parse(html.slice(start, i + 1));
            } catch (_error) {
              return null;
            }
          }
        }
      }

      return null;
    };

    const fileManager = readFilemanagerOptions();

    // Sin el bloque de la entrega no se adivina: se informa "sin restricción" y
    // decide el portal. Bloquear por una lista que capaz es del editor es peor
    // que dejar que iVirtual conteste con el motivo real.
    const acceptedTypes = Array.isArray(fileManager?.accepted_types) ? fileManager.accepted_types : [];

    const numberOf = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return {
      puedeEntregar,
      formButtons,
      aceptaArchivos: Boolean(main.querySelector('[data-fieldtype="filemanager"], .filemanager')),
      aceptaTexto: Boolean(main.querySelector('textarea[name*="onlinetext"]')),
      // Mismo motivo que accepted_types: los límites del editor no son los de
      // la entrega. Sólo se cae al regex global si no se encontró el bloque.
      maxBytes: fileManager ? numberOf(fileManager.maxbytes) : pickNumber(/maxbytes"\s*:\s*"?(\d+)"?/),
      maxFiles: fileManager ? numberOf(fileManager.maxfiles) : pickNumber(/maxfiles"\s*:\s*"?(-?\d+)"?/),
      // Lista vacía = sin restricción de extensión.
      acceptedTypes,
      requiereDeclaracion: Boolean(main.querySelector('input[type="checkbox"][name*="submissionstatement"]')),
      archivosEnBorrador: Array.from(main.querySelectorAll('.fp-filename'))
        .map((el) => normalize(el.textContent))
        .filter((name) => name && name.toLowerCase() !== 'files'),
      limitesTexto: normalize(
        (normalize(document.body.textContent || '').match(/Maximum file size:[^-]{0,60}/i) || [''])[0],
      ),
    };
  });
}

async function getUploadInfo(assignmentUrl) {
  const editUrl = buildEditUrl(assignmentUrl);

  if (!editUrl) {
    return buildError('INVALID_URL', 'La actividad no tiene un identificador válido.');
  }

  try {
    const { page } = await getSession();
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    // El filemanager se monta por JS; sin esta espera el formulario se lee vacío.
    await page.waitForTimeout(1500);

    const info = await readSubmissionForm(page);
    return { success: true, ...info };
  } catch (error) {
    if (error?.result) {
      return error.result;
    }
    log('error leyendo el formulario:', error?.message);
    return buildError('FORM_READ_FAILED', 'No fue posible leer el formulario de entrega.');
  }
}

// ---------------------------------------------------------------------------
// Validación local — antes de tocar el portal
// ---------------------------------------------------------------------------

// `accepted_types` de Moodle admite cuatro sintaxis mezcladas en la misma lista:
// extensiones (".pdf" o "pdf"), grupos ("document", "image"), mimetypes
// ("application/pdf") y el comodín "*". El portal de ITSON expande los grupos a
// extensiones antes de mandarlos, pero la sintaxis de grupo es válida y otras
// instalaciones la emiten tal cual.
//
// Sólo se listan los grupos estables de Moodle. Uno que no esté acá se trata
// como no interpretable a propósito: ver isExtensionRejected.
const MOODLE_TYPE_GROUPS = {
  archive: ['.7z', '.bdoc', '.cdoc', '.ddoc', '.gtar', '.tgz', '.gz', '.gzip', '.hqx', '.rar', '.sit', '.tar', '.zip'],
  audio: ['.aac', '.aif', '.aiff', '.aifc', '.au', '.flac', '.m3u', '.m4a', '.mp3', '.oga', '.ogg', '.ra', '.ram', '.rm', '.wav', '.wma'],
  document: ['.doc', '.docx', '.epub', '.gdoc', '.odt', '.oth', '.ott', '.pdf', '.rtf', '.txt'],
  image: ['.bmp', '.cur', '.gif', '.ico', '.jpe', '.jpeg', '.jpg', '.png', '.svg', '.svgz', '.tif', '.tiff', '.webp'],
  presentation: ['.gslides', '.odp', '.otp', '.pps', '.ppt', '.pptx'],
  spreadsheet: ['.csv', '.gsheet', '.ods', '.ots', '.xls', '.xlsx'],
  video: ['.3gp', '.asf', '.avi', '.dif', '.dv', '.f4v', '.flv', '.fmp4', '.m4v', '.mov', '.movie', '.mp4', '.mpe', '.mpeg', '.mpg', '.ogv', '.qt', '.rmvb', '.rv', '.ts', '.webm', '.wmv'],
  web_file: ['.htm', '.html', '.xhtml'],
  web_image: ['.gif', '.jpe', '.jpeg', '.jpg', '.png', '.svg', '.svgz'],
};

MOODLE_TYPE_GROUPS.media = [...MOODLE_TYPE_GROUPS.audio, ...MOODLE_TYPE_GROUPS.video];

// Grupos que existen en Moodle pero cuya lista no se modela acá: o cambian entre
// versiones ("sourcecode" son decenas de lenguajes) o dependen de qué formatos
// soporte el navegador. Se nombran igual para NO confundirlos con extensiones:
// sin esta lista, "sourcecode" pasaba por extensión ".sourcecode" y hacía que la
// validación rechazara archivos que el portal acepta.
const UNMODELED_TYPE_GROUPS = new Set([
  'html_audio',
  'html_track',
  'html_video',
  'optimised_image',
  'sourcecode',
  'web_audio',
  'web_video',
]);

// Suficiente para los mimetypes que Moodle usa en entregas. No pretende ser la
// tabla completa: lo que no esté acá cae en "no interpretable" y no bloquea.
const MIME_EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/zip': ['.zip'],
  'text/plain': ['.txt'],
};

// Devuelve las extensiones que representa un token, o null si no se sabe.
function expandAcceptedType(token) {
  const value = String(token || '').trim().toLowerCase();

  if (!value) {
    return null;
  }

  if (value.startsWith('.')) {
    return [value];
  }

  if (MOODLE_TYPE_GROUPS[value]) {
    return MOODLE_TYPE_GROUPS[value];
  }

  if (UNMODELED_TYPE_GROUPS.has(value)) {
    return null;
  }

  if (value.includes('/')) {
    // Un mimetype con comodín ("image/*") no se puede acotar sin la tabla
    // completa de Moodle: mejor no opinar.
    return MIME_EXTENSIONS[value] || null;
  }

  // "pdf" sin punto: Moodle lo acepta como extensión.
  if (/^[a-z0-9]+$/.test(value)) {
    return [`.${value}`];
  }

  return null;
}

// Rechaza SÓLO cuando se entienden todos los tokens y ninguno matchea.
//
// El portal es la autoridad sobre qué acepta: esta validación existe para
// ahorrarle al usuario un viaje al portal, no para vetar archivos. Ante un token
// que no se sabe leer, se deja pasar y que conteste iVirtual con el motivo real
// — bloquear de más fue justo lo que rompió la entrega de un PDF válido.
function isExtensionRejected(ext, accepted) {
  if (!ext) {
    return false;
  }

  const expanded = [];

  for (const token of accepted) {
    if (String(token).trim() === '*') {
      return false;
    }

    const extensions = expandAcceptedType(token);

    if (!extensions) {
      return false;
    }

    expanded.push(...extensions);
  }

  return expanded.length > 0 && !expanded.includes(ext);
}

// Los grupos se muestran ya expandidos: "document" no le dice nada al usuario.
function describeAcceptedTypes(accepted) {
  const expanded = accepted.flatMap((token) => expandAcceptedType(token) || [String(token)]);
  const unicas = [...new Set(expanded)];

  return unicas.length > 6 ? `${unicas.slice(0, 6).join(', ')} y otros` : unicas.join(', ');
}

function validateFiles(filePaths, info) {
  const problems = [];
  const accepted = Array.isArray(info.acceptedTypes) ? info.acceptedTypes : [];

  const yaEnBorrador = Array.isArray(info.archivosEnBorrador) ? info.archivosEnBorrador.length : 0;
  if (Number.isInteger(info.maxFiles) && info.maxFiles > 0) {
    const total = yaEnBorrador + filePaths.length;
    if (total > info.maxFiles) {
      problems.push(
        `La entrega admite ${info.maxFiles} archivo(s) y quedarían ${total}.`,
      );
    }
  }

  filePaths.forEach((filePath) => {
    const nombre = path.basename(filePath);

    let stats;
    try {
      stats = fs.statSync(filePath);
    } catch (_error) {
      problems.push(`No se encuentra el archivo "${nombre}".`);
      return;
    }

    if (!stats.isFile()) {
      problems.push(`"${nombre}" no es un archivo.`);
      return;
    }

    if (Number.isInteger(info.maxBytes) && info.maxBytes > 0 && stats.size > info.maxBytes) {
      const limiteMb = (info.maxBytes / (1024 * 1024)).toFixed(1);
      const pesoMb = (stats.size / (1024 * 1024)).toFixed(1);
      problems.push(`"${nombre}" pesa ${pesoMb} MB y el límite es ${limiteMb} MB.`);
    }

    // Lista vacía significa "cualquier extensión", no "ninguna".
    if (accepted.length > 0) {
      const ext = path.extname(nombre).toLowerCase();

      if (isExtensionRejected(ext, accepted)) {
        problems.push(
          `"${nombre}" tiene extensión ${ext || 'desconocida'} y la entrega acepta ${describeAcceptedTypes(accepted)}.`,
        );
      }
    }
  });

  return problems;
}

// ---------------------------------------------------------------------------
// Subida
// ---------------------------------------------------------------------------

// Estado real de la entrega según la tabla que pinta Moodle. Es la única fuente
// confiable de si quedó en borrador o enviada: depende de la configuración de
// la actividad, no de qué botón se clickeó.
async function readSubmissionStatus(page) {
  return page.evaluate(() => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const table = document.querySelector('table.generaltable');

    if (!table) {
      return { estado: 'desconocido', textoEstado: '', archivos: [] };
    }

    const filas = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) => normalize(cell.textContent)),
    );

    const filaEstado = filas.find((celdas) => /submission status|estado de la entrega/i.test(celdas[0] || ''));
    const textoEstado = filaEstado ? filaEstado[1] || '' : '';

    let estado = 'desconocido';
    if (/submitted for grading|enviado para calificar/i.test(textoEstado)) {
      estado = 'enviada';
    } else if (/draft|borrador/i.test(textoEstado)) {
      estado = 'borrador';
    } else if (/no submissions|no attempt|sin entrega/i.test(textoEstado)) {
      estado = 'sin_entrega';
    }

    return {
      estado,
      textoEstado,
      archivos: Array.from(document.querySelectorAll('a[href*="pluginfile.php"]'))
        .map((a) => normalize(a.textContent))
        .filter(Boolean),
    };
  });
}

// Adjunta UN archivo por el filepicker de Moodle.
//
// Moodle no deja un <input type="file"> en el HTML: el filemanager lo crea
// cuando se abre el picker. Cada paso espera una CONDICIÓN REAL en vez de un
// tiempo fijo — la primera versión usaba esperas de 800 ms y fallaba de forma
// intermitente cuando el portal tardaba un poco más.
async function attachSingleFile(page, filePath) {
  const nombre = path.basename(filePath);

  // El filemanager avisa que terminó de montarse con la clase fm-loaded.
  await page.waitForSelector('.filemanager.fm-loaded, [data-fieldtype="filemanager"]', {
    timeout: PAGE_TIMEOUT_MS,
  });

  await page.locator('.fp-btn-add a, .fp-btn-add button, [title="Add..."]').first().click({
    timeout: PAGE_TIMEOUT_MS,
  });

  // Esperar el modal REAL, no un tiempo arbitrario. `.file-picker` matchea más
  // de un nodo, así que se espera el que de verdad está visible.
  await page.locator('.file-picker:visible').first().waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });

  // El repositorio "Upload a file" no siempre viene preseleccionado.
  const repo = page.locator('.fp-repo-name', { hasText: /upload a file|subir un archivo/i }).first();
  if (await repo.count()) {
    await repo.click({ timeout: PAGE_TIMEOUT_MS });
  }

  // El input aparece recién cuando el repositorio de subida está activo.
  const fileInput = page.locator('.file-picker input[type="file"]').first();
  await fileInput.waitFor({ state: 'attached', timeout: PAGE_TIMEOUT_MS });
  await fileInput.setInputFiles(filePath, { timeout: PAGE_TIMEOUT_MS });

  await page
    .locator('.fp-upload-btn, button:has-text("Upload this file"), button:has-text("Subir este archivo")')
    .first()
    .click({ timeout: PAGE_TIMEOUT_MS });

  // Si ya había un archivo con el mismo nombre, Moodle pregunta qué hacer.
  // Sobrescribir es lo que espera quien vuelve a subir una corrección.
  const overwrite = page.locator('button:has-text("Overwrite"), button:has-text("Sobrescribir")').first();
  if (await overwrite.count().catch(() => 0)) {
    await overwrite.click({ timeout: PAGE_TIMEOUT_MS }).catch(() => {});
  }

  // LA condición de éxito: el archivo figura en el filemanager. Esperar a que
  // se cierre el modal no alcanza — se cierra antes de que el archivo aparezca.
  await page
    .waitForFunction(
      (esperado) =>
        Array.from(document.querySelectorAll('.fp-filename')).some((el) =>
          (el.textContent || '').includes(esperado),
        ),
      nombre,
      { timeout: UPLOAD_TIMEOUT_MS },
    )
    .catch(() => {
      throw new Error(`El archivo "${nombre}" no apareció en iVirtual después de subirlo.`);
    });
}

async function attachFiles(page, filePaths) {
  for (const filePath of filePaths) {
    const nombre = path.basename(filePath);
    let ultimoError = null;

    // Un reintento cubre los tropiezos transitorios del portal (JS del picker
    // lento, un modal que no llegó a montarse). Más de dos vueltas solo alarga
    // la espera de un fallo real.
    for (let intento = 1; intento <= 2; intento += 1) {
      try {
        await attachSingleFile(page, filePath);
        ultimoError = null;
        break;
      } catch (error) {
        ultimoError = error;
        log(`intento ${intento} fallido para "${nombre}":`, error?.message);

        if (intento === 1) {
          // Recargar deja el formulario en un estado conocido: un modal a medio
          // abrir bloquea el siguiente intento.
          await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    }

    if (ultimoError) {
      throw ultimoError;
    }
  }
}

async function uploadFiles(assignmentUrl, filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return buildError('NO_FILES', 'No se eligió ningún archivo.');
  }

  const editUrl = buildEditUrl(assignmentUrl);

  if (!editUrl) {
    return buildError('INVALID_URL', 'La actividad no tiene un identificador válido.');
  }

  try {
    const { page } = await getSession();
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);

    const info = await readSubmissionForm(page);

    if (!info.puedeEntregar) {
      return buildError(
        'SUBMISSION_CLOSED',
        'iVirtual no permite entregar en esta actividad ahora mismo.',
      );
    }

    if (!info.aceptaArchivos) {
      return buildError('NO_FILE_SUBMISSION', 'Esta actividad no recibe archivos.');
    }

    const problems = validateFiles(filePaths, info);

    if (problems.length > 0) {
      return buildError('VALIDATION_FAILED', problems.join(' '));
    }

    await attachFiles(page, filePaths);

    // Guardar y esperar la navegación de verdad: sin esto el paso siguiente
    // podía leer el estado de la página anterior y reportar cualquier cosa.
    const saveButton = page
      .locator('form button:has-text("Save changes"), form input[value="Save changes"]')
      .first();

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => {}),
      saveButton.click({ timeout: PAGE_TIMEOUT_MS }),
    ]);

    // Releer el estado que quedó DE VERDAD. Con submissiondrafts=No este mismo
    // "Save changes" ya dejó la entrega enviada a calificar, así que no se puede
    // asumir "borrador" ni reportarlo sin mirar.
    const viewUrl = buildViewUrl(assignmentUrl);
    await page.goto(viewUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForSelector('table.generaltable', { timeout: PAGE_TIMEOUT_MS }).catch(() => {});
    const status = await readSubmissionStatus(page);

    // El portal manda: si el archivo no figura en la entrega, la subida no
    // sirvió por más que los clicks hayan salido bien.
    const nombresEsperados = filePaths.map((ruta) => path.basename(ruta));
    const faltantes = nombresEsperados.filter(
      (nombre) => !(status.archivos || []).some((subido) => subido.includes(nombre)),
    );

    if (faltantes.length > 0) {
      return buildError(
        'UPLOAD_NOT_CONFIRMED',
        `iVirtual no muestra ${faltantes.join(', ')} en la entrega. Revisá en el portal antes de reintentar.`,
      );
    }

    return {
      success: true,
      // 'borrador' | 'enviada' | 'sin_entrega' | 'desconocido'
      estado: status.estado,
      textoEstado: status.textoEstado,
      archivos: status.archivos,
      // Con la entrega ya enviada la única salida es quitarla entera: la UI
      // necesita saberlo para ofrecer el deshacer correcto.
      sePuedeDeshacer: status.estado === 'enviada' || status.estado === 'borrador',
    };
  } catch (error) {
    if (error?.result) {
      return error.result;
    }
    const detalle = String(error?.message || '').split(String.fromCharCode(10))[0].slice(0, 200);
    log('error subiendo archivos:', error?.message);
    return buildError('UPLOAD_FAILED', `No fue posible subir los archivos. ${detalle}`);
  }
}

// Quitar un archivo del borrador. Es el complemento necesario de la subida: sin
// esto, un archivo equivocado solo se puede sacar entrando al portal a mano.
// Sigue siendo una operación sobre el BORRADOR — no toca nada calificado.
async function removeDraftFile(assignmentUrl, fileName) {
  const editUrl = buildEditUrl(assignmentUrl);

  if (!editUrl) {
    return buildError('INVALID_URL', 'La actividad no tiene un identificador válido.');
  }

  if (!fileName) {
    return buildError('NO_FILE', 'No se indicó qué archivo quitar.');
  }

  try {
    const { page } = await getSession();
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);

    const before = await readSubmissionForm(page);

    if (!before.puedeEntregar) {
      return buildError('SUBMISSION_CLOSED', 'iVirtual no permite editar esta entrega.');
    }

    if (!(before.archivosEnBorrador || []).includes(fileName)) {
      return buildError('FILE_NOT_FOUND', `"${fileName}" no está en el borrador.`);
    }

    // El filemanager abre un diálogo por archivo con las acciones disponibles.
    await page.locator('.fp-filename', { hasText: fileName }).first().click({ timeout: PAGE_TIMEOUT_MS });
    await page.waitForTimeout(600);

    await page
      .locator('button:has-text("Delete"), a:has-text("Delete"), .fp-file-delete')
      .first()
      .click({ timeout: PAGE_TIMEOUT_MS });
    await page.waitForTimeout(500);

    // Confirmación del propio Moodle.
    const confirm = page.locator('button:has-text("OK"), button:has-text("Yes")').first();
    if (await confirm.count()) {
      await confirm.click({ timeout: PAGE_TIMEOUT_MS });
    }
    await page.waitForTimeout(900);

    await page
      .locator('form button:has-text("Save changes"), form input[value="Save changes"]')
      .first()
      .click({ timeout: PAGE_TIMEOUT_MS });
    await page.waitForLoadState('domcontentloaded', { timeout: NAV_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(1200);

    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);
    const after = await readSubmissionForm(page);

    return {
      success: !(after.archivosEnBorrador || []).includes(fileName),
      archivosEnBorrador: after.archivosEnBorrador,
    };
  } catch (error) {
    if (error?.result) {
      return error.result;
    }
    log('error quitando archivo:', error?.message);
    return buildError('REMOVE_FAILED', 'No fue posible quitar el archivo del borrador.');
  }
}

// Quita la entrega COMPLETA. Es el único deshacer disponible cuando la
// actividad no tiene borrador (submissiondrafts=No) y guardar ya la dejó
// enviada a calificar. Verificado contra el portal real: Moodle ofrece "Remove
// submission" al alumno y deja el estado en "No submissions have been made yet".
async function removeSubmission(assignmentUrl) {
  const viewUrl = buildViewUrl(assignmentUrl);

  try {
    const { page } = await getSession();
    await page.goto(viewUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);

    const boton = page.getByRole('button', { name: /remove submission|eliminar entrega/i }).first();

    if (!(await boton.count())) {
      return buildError(
        'NO_REMOVE_ACTION',
        'iVirtual no ofrece quitar esta entrega. Puede estar calificada o cerrada.',
      );
    }

    await boton.click({ timeout: PAGE_TIMEOUT_MS });
    await page.waitForTimeout(1500);

    // Moodle pide confirmación; la etiqueta varía entre versiones e idioma.
    for (const nombre of [/^Continue$/i, /^Yes$/i, /^OK$/i, /^Continuar$/i, /^S[ií]$/i]) {
      const confirmar = page.getByRole('button', { name: nombre }).first();
      if (await confirmar.count()) {
        await confirmar.click({ timeout: PAGE_TIMEOUT_MS });
        break;
      }
    }

    await page.waitForLoadState('domcontentloaded', { timeout: NAV_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(2000);

    await page.goto(viewUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);
    const status = await readSubmissionStatus(page);

    return {
      success: status.estado === 'sin_entrega',
      estado: status.estado,
      textoEstado: status.textoEstado,
    };
  } catch (error) {
    if (error?.result) {
      return error.result;
    }
    log('error quitando la entrega:', error?.message);
    return buildError('REMOVE_SUBMISSION_FAILED', 'No fue posible quitar la entrega.');
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

async function pickFiles() {
  const result = await dialog.showOpenDialog({
    title: 'Elegir archivos para entregar',
    properties: ['openFile', 'multiSelections'],
  });

  if (result.canceled) {
    return { canceled: true, files: [] };
  }

  return {
    canceled: false,
    files: result.filePaths.map((filePath) => ({
      path: filePath,
      name: path.basename(filePath),
      size: (() => {
        try {
          return fs.statSync(filePath).size;
        } catch (_error) {
          return 0;
        }
      })(),
    })),
  };
}

function registerAssignmentUploadHandlers() {
  if (!ipcMain?.handle) {
    return;
  }

  ipcMain.handle('assignment:pick-files', async () => pickFiles());
  ipcMain.handle('assignment:upload-info', async (_event, url) => getUploadInfo(url));
  ipcMain.handle('assignment:upload-files', async (_event, payload = {}) =>
    uploadFiles(payload.url, payload.filePaths),
  );
  ipcMain.handle('assignment:remove-draft-file', async (_event, payload = {}) =>
    removeDraftFile(payload.url, payload.fileName),
  );
  ipcMain.handle('assignment:remove-submission', async (_event, url) => removeSubmission(url));

  if (app?.on) {
    app.on('before-quit', () => {
      closeSession('app-quit');
    });
  }
}

// Solo para pruebas de fiabilidad: adjunta sin guardar, así el filepicker se
// puede ejercitar repetidas veces sin tocar la entrega real del usuario.
async function __attachOnly(assignmentUrl, filePaths) {
  const { page } = await getSession();
  await page.goto(buildEditUrl(assignmentUrl), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector('.filemanager.fm-loaded, [data-fieldtype="filemanager"]', { timeout: PAGE_TIMEOUT_MS });
  await attachFiles(page, filePaths);
}

module.exports = {
  __attachOnly,
  buildEditUrl,
  buildViewUrl,
  closeSession,
  describeAcceptedTypes,
  isExtensionRejected,
  getUploadInfo,
  registerAssignmentUploadHandlers,
  removeDraftFile,
  removeSubmission,
  uploadFiles,
  validateFiles,
};
