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

    const acceptedRaw = (html.match(/accepted_types"\s*:\s*(\[[^\]]*\])/) || [])[1];
    let acceptedTypes = [];
    try {
      acceptedTypes = acceptedRaw ? JSON.parse(acceptedRaw) : [];
    } catch (_error) {
      acceptedTypes = [];
    }

    return {
      puedeEntregar,
      formButtons,
      aceptaArchivos: Boolean(main.querySelector('[data-fieldtype="filemanager"], .filemanager')),
      aceptaTexto: Boolean(main.querySelector('textarea[name*="onlinetext"]')),
      maxBytes: pickNumber(/maxbytes"\s*:\s*"?(\d+)"?/),
      maxFiles: pickNumber(/maxfiles"\s*:\s*"?(-?\d+)"?/),
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
      const permitido = accepted.some((tipo) => String(tipo).toLowerCase() === ext);
      if (!permitido) {
        problems.push(`"${nombre}" tiene extensión ${ext || 'desconocida'} y no está permitida.`);
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

async function attachFiles(page, filePaths) {
  // Moodle no deja un <input type="file"> en el HTML: el filemanager lo crea
  // cuando se abre el filepicker. Se abre, se elige el repositorio "Upload a
  // file" y recién ahí existe el input al que Playwright puede adjuntar.
  for (const filePath of filePaths) {
    const addButton = page.locator('.fp-btn-add a, .fp-btn-add button, [title="Add..."]').first();
    await addButton.click({ timeout: PAGE_TIMEOUT_MS });

    const uploadRepo = page
      .locator('.fp-repo-name', { hasText: /upload a file|subir un archivo/i })
      .first();
    if (await uploadRepo.count()) {
      await uploadRepo.click();
    }

    const fileInput = page.locator('.file-picker input[type="file"]').first();
    await fileInput.setInputFiles(filePath, { timeout: PAGE_TIMEOUT_MS });

    const submitUpload = page
      .locator('.fp-upload-btn, button:has-text("Upload this file")')
      .first();
    await submitUpload.click({ timeout: PAGE_TIMEOUT_MS });

    // El filepicker cierra su modal cuando la subida terminó.
    await page
      .waitForSelector('.file-picker', { state: 'hidden', timeout: UPLOAD_TIMEOUT_MS })
      .catch(() => {});
    await page.waitForTimeout(800);
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

    const saveButton = page
      .locator('form button:has-text("Save changes"), form input[value="Save changes"]')
      .first();
    await saveButton.click({ timeout: PAGE_TIMEOUT_MS });
    await page.waitForLoadState('domcontentloaded', { timeout: NAV_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(1500);

    // Releer el estado que quedó DE VERDAD. Con submissiondrafts=No este mismo
    // "Save changes" ya dejó la entrega enviada a calificar, así que no se puede
    // asumir "borrador" ni reportarlo sin mirar.
    const viewUrl = buildViewUrl(assignmentUrl);
    await page.goto(viewUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);
    const status = await readSubmissionStatus(page);

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
    log('error subiendo archivos:', error?.message);
    return buildError('UPLOAD_FAILED', 'No fue posible subir los archivos.');
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

module.exports = {
  buildEditUrl,
  buildViewUrl,
  closeSession,
  getUploadInfo,
  registerAssignmentUploadHandlers,
  removeDraftFile,
  removeSubmission,
  uploadFiles,
  validateFiles,
};
