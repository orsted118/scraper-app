// Portal de Sistemas ITSON: perfil del alumno (foto, nombre, email institucional,
// student ID) para el bloque de identidad del Sidebar, y descarga on-demand de la
// Credencial Alumno oficial (PDF). Reutiliza las credenciales de iVirtual — el
// Portal de Sistemas comparte usuario/contraseña (confirmado en investigación,
// ver scripts/investigate-portal-sistemas.cjs). DOM propio, no relacionado al de
// iVirtual/CIA — no toca scraper.js/cia.js.
const fs = require('fs');
const path = require('path');
const { app, ipcMain, dialog, nativeImage } = require('electron');
const { chromium } = require('playwright');

const LANDING_URL = 'https://apps9.itson.edu.mx/PortalSistemas';
const CREDENCIAL_BASE_URL = 'https://apps9.itson.edu.mx/Constancias/ValidarCredencial.aspx';
const NAV_TIMEOUT_MS = 45_000;
const MODULE_TIMEOUT_MS = 15_000;
const MIN_PDF_BYTES = 50 * 1024;
// Política documental: get-profile no fuerza refresh por antigüedad, solo marca
// isStale. El único trigger automático de refresh es cache ausente (Sidebar).
const PROFILE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getCacheDir() {
  return path.join(app.getPath('userData'), 'profile-cache');
}

function getProfilePath() {
  return path.join(getCacheDir(), 'profile.json');
}

function getPhotoPath() {
  return path.join(getCacheDir(), 'photo.jpg');
}

function readProfileCache() {
  try {
    return JSON.parse(fs.readFileSync(getProfilePath(), 'utf8'));
  } catch (_error) {
    return null;
  }
}

function writeProfileCache(profile) {
  fs.mkdirSync(getCacheDir(), { recursive: true });
  fs.writeFileSync(getProfilePath(), JSON.stringify(profile, null, 2), 'utf8');
}

// Login del Portal de Sistemas: DOM propio, distinto de iVirtual/CIA. #btnIniciar
// es input type=button con onclick JS — click explícito, Enter no dispara el submit.
async function loginToPortalSistemas(page, user, password) {
  await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.fill('#txtUsuario', user);
  await page.fill('#txtContraseña', password);
  await page.locator('#btnIniciar').click();
  // El login es un redirect vía JS dentro del mismo documento — no dispara un
  // nuevo evento domcontentloaded real. Esperar la URL final directamente en
  // vez de una waitForLoadState que resuelve antes de tiempo.
  await page.waitForURL('**/PortalSistemas/PortalSistemas', { timeout: NAV_TIMEOUT_MS }).catch(() => {});

  if (!page.url().includes('/PortalSistemas/PortalSistemas')) {
    throw new Error('PORTAL_SISTEMAS_LOGIN_FAILED');
  }
}

// Los módulos cargan dentro de iframe#ContenidoIframe sin cambiar la URL del
// shell (SPA). Esperar a que el iframe apunte al módulo evita leer contenido
// stale del módulo anterior; el selector del propio campo es la confirmación
// de que el módulo ya montó su contenido real.
async function openModule(page, moduleId, urlPattern) {
  await page.locator(`a.module-item[id="${moduleId}"]`).first().click({ timeout: MODULE_TIMEOUT_MS });
  await page.waitForFunction(
    (pattern) => {
      const frame = document.querySelector('#ContenidoIframe');
      return Boolean(frame && new RegExp(pattern, 'i').test(frame.src));
    },
    urlPattern.source,
    { timeout: MODULE_TIMEOUT_MS },
  );

  // page.frames() puede tardar un instante en reflejar el frame nuevo aunque el
  // atributo src del iframe ya haya cambiado — reintentar corto antes de fallar.
  let frame = null;
  for (let attempt = 0; attempt < 10 && !frame; attempt += 1) {
    frame = page.frames().find((f) => urlPattern.test(f.url()));
    if (!frame) {
      await page.waitForTimeout(300);
    }
  }

  if (!frame) {
    throw new Error(`No se pudo abrir el módulo ${moduleId}`);
  }

  return frame;
}

function pickInstitutionalEmail(candidates) {
  return candidates.find((value) => /@potros\.itson\.edu\.mx$/i.test(String(value || '').trim())) || null;
}

function extractAcadProg(rawUrl) {
  try {
    return new URL(rawUrl, LANDING_URL).searchParams.get('acad_prog');
  } catch (_error) {
    return null;
  }
}

async function scrapeProfile(page) {
  // 1. Home shell: foto + nombre. El shell se renderiza client-side tras el
  // redirect del login — esperar el CONTENIDO (texto no vacío), no solo que el
  // nodo exista, porque el nodo puede montar antes de que el dato llegue.
  await page
    .waitForFunction(() => {
      const el = document.querySelector('#nomUsuario');
      return Boolean(el && el.textContent && el.textContent.trim().length > 0);
    }, { timeout: MODULE_TIMEOUT_MS })
    .catch(() => {});
  // La foto llega por un AJAX aparte del nombre y puede tardar un poco más — o
  // no llegar nunca si el alumno no tiene foto cargada (placeholder se queda
  // fijo, ver riesgo documentado en la investigación). Timeout corto propio:
  // no vale la pena esperar el MODULE_TIMEOUT_MS completo para este caso.
  await page
    .waitForFunction(() => {
      const src = document.querySelector('#PhotoEmplid')?.getAttribute('src') || '';
      return src.startsWith('data:') && src.length > 1000;
    }, { timeout: 12_000 })
    .catch(() => {});
  const home = await page.evaluate(() => ({
    photoSrc: document.querySelector('#PhotoEmplid')?.getAttribute('src') || null,
    fullName: document.querySelector('#nomUsuario')?.textContent?.trim() || '',
  }));

  // 2. Correo Potros: student ID + emails. Institucional = por SUFIJO, no por
  // cuál campo es (el DOM no lo distingue semánticamente). Los inputs montan
  // vacíos y se poblan por AJAX interno del módulo — esperar el VALOR, no el nodo.
  const correoFrame = await openModule(page, '1128', /CorreoPotros/i);
  await correoFrame
    .waitForFunction(() => {
      const el = document.querySelector('#txemplid');
      return Boolean(el && el.value && el.value.trim().length > 0);
    }, { timeout: MODULE_TIMEOUT_MS })
    .catch(() => {});
  const correo = await correoFrame.evaluate(() => ({
    studentId: document.querySelector('#txemplid')?.value?.trim() || '',
    correoPersonal: document.querySelector('#txtCorreoPersonal')?.value?.trim() || '',
    txtUsuario: document.querySelector('#txtUsuario')?.value?.trim() || '',
  }));
  const institutionalEmail = pickInstitutionalEmail([correo.txtUsuario, correo.correoPersonal]);

  // 3. Credencial Alumno: acad_prog vive en el querystring del recurso embebido
  // (object/embed/iframe — ITSON no garantiza cuál tag usa). El recurso mismo
  // tarda en montar dentro del módulo — esperar su presencia con atributo.
  const credFrame = await openModule(page, '1125', /CredencialAlumno/i);
  // El tag <iframe id="ifmCredencial"> existe desde el DOM inicial con src=""
  // — el selector [src] matchea la sola PRESENCIA del atributo, vacío o no.
  // Hay que esperar a que el módulo puebla el VALOR (tras resolver acad_prog).
  await credFrame
    .waitForFunction(() => {
      const el = document.querySelector('object[data], embed[src], iframe[src]');
      const value = el?.getAttribute('data') || el?.getAttribute('src') || '';
      return value.trim().length > 0;
    }, { timeout: MODULE_TIMEOUT_MS })
    .catch(() => {});
  const credResourceUrl = await credFrame.evaluate(() => {
    const el = document.querySelector('object[data], embed[src], iframe[src]');
    return el?.getAttribute('data') || el?.getAttribute('src') || null;
  });
  const acadProg = credResourceUrl ? extractAcadProg(credResourceUrl) : null;

  // 4. Foto: data URL → JPEG 128px vía nativeImage (cero deps nuevas, sin sharp).
  let photoPath = null;
  if (home.photoSrc && home.photoSrc.startsWith('data:')) {
    // createFromDataURL falla silenciosamente (imagen 0x0) con el MIME type no
    // estándar "image/jpg" que manda el Portal de Sistemas (debería ser
    // "image/jpeg"). Decodificar el base64 a mano y usar createFromBuffer
    // evita depender de que Electron reconozca el prefijo del data URL.
    const base64 = home.photoSrc.split(',')[1] || '';
    const rawBuffer = Buffer.from(base64, 'base64');
    const image = nativeImage.createFromBuffer(rawBuffer);
    const resized = image.resize({ width: 128, quality: 'best' });
    const jpeg = resized.toJPEG(85);

    // Guard: si la data URL llegó truncada/corrupta, nativeImage no throwea —
    // devuelve un buffer vacío. No cachear un archivo de foto roto.
    if (jpeg.length > 0) {
      fs.mkdirSync(getCacheDir(), { recursive: true });
      fs.writeFileSync(getPhotoPath(), jpeg);
      photoPath = getPhotoPath();
    }
  }

  const profile = {
    fullName: home.fullName || '',
    email: institutionalEmail,
    studentId: correo.studentId || null,
    photoPath,
    acadProg,
    cachedAt: new Date().toISOString(),
  };

  writeProfileCache(profile);
  return profile;
}

// Separado de fetchCredential a propósito: esto es lo testeable sin disparar un
// diálogo nativo real (el harness de verificación llama esto directo).
async function downloadCredentialBuffer(context, studentId, acadProg) {
  const url = `${CREDENCIAL_BASE_URL}?Folio=${encodeURIComponent(studentId)}&acad_prog=${encodeURIComponent(acadProg)}`;
  const response = await context.request.get(url);
  const buffer = Buffer.from(await response.body());

  if (buffer.slice(0, 5).toString() !== '%PDF-' || buffer.length < MIN_PDF_BYTES) {
    throw new Error('La credencial no está disponible en este momento.');
  }

  return buffer;
}

async function fetchCredential(context, studentId, acadProg) {
  const buffer = await downloadCredentialBuffer(context, studentId, acadProg);

  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('documents'), `Credencial-${studentId}.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { error: 'Descarga cancelada.' };
  }

  fs.writeFileSync(filePath, buffer);
  return { savedPath: filePath };
}

// Un lock por acción: la UI queda disabled, pero esto protege contra invocación
// concurrente desde cualquier origen (mismo patrón que settings:test-connection).
const locks = new Map([
  ['profile', false],
  ['credential', false],
]);

function withLock(key, fn) {
  return async (...args) => {
    if (locks.get(key)) {
      return { error: 'in-progress' };
    }
    locks.set(key, true);
    try {
      return await fn(...args);
    } finally {
      locks.set(key, false);
    }
  };
}

// Nunca incluir detalle crudo del error: podría filtrar contexto de sesión.
// Mensaje genérico y estable de cara al usuario, password jamás referenciado acá.
function friendlyError(error) {
  const message = String(error?.message || '');

  if (message.includes('PORTAL_SISTEMAS_LOGIN_FAILED') || message.includes('credenciales')) {
    return 'No fue posible iniciar sesión en el Portal de Sistemas. Verifica tus credenciales de iVirtual en Ajustes.';
  }

  return 'No fue posible completar la operación. Intenta de nuevo en unos minutos.';
}

async function withLoggedInPage(callback) {
  const user = process.env.IVIRTUAL_USER?.trim();
  const password = process.env.IVIRTUAL_PASS?.trim();

  if (!user || !password) {
    throw new Error('No hay credenciales de iVirtual configuradas.');
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginToPortalSistemas(page, user, password);
    return await callback(page, context);
  } finally {
    await browser.close().catch(() => {});
  }
}

const refreshProfileLocked = withLock('profile', async () => {
  try {
    return await withLoggedInPage((page) => scrapeProfile(page));
  } catch (error) {
    return { error: friendlyError(error) };
  }
});

const getCredentialLocked = withLock('credential', async () => {
  try {
    return await withLoggedInPage(async (page, context) => {
      let cached = readProfileCache();

      if (!cached?.studentId || !cached?.acadProg) {
        cached = await scrapeProfile(page);
      }

      if (!cached?.studentId || !cached?.acadProg) {
        throw new Error('No fue posible determinar el folio/programa del alumno.');
      }

      return fetchCredential(context, cached.studentId, cached.acadProg);
    });
  } catch (error) {
    return { error: friendlyError(error) };
  }
});

function getProfile() {
  const cached = readProfileCache();

  if (!cached) {
    return null;
  }

  const cachedAtMs = new Date(cached.cachedAt).getTime();
  const isStale = !Number.isFinite(cachedAtMs) || Date.now() - cachedAtMs > PROFILE_CACHE_MAX_AGE_MS;
  return { ...cached, isStale };
}

function registerPortalSistemasHandlers() {
  ipcMain.handle('portal-sistemas:get-profile', async () => getProfile());
  ipcMain.handle('portal-sistemas:refresh-profile', async () => refreshProfileLocked());
  ipcMain.handle('portal-sistemas:get-credential', async () => getCredentialLocked());
}

module.exports = {
  downloadCredentialBuffer,
  fetchCredential,
  getCredential: getCredentialLocked,
  getProfile,
  loginToPortalSistemas,
  refreshProfile: refreshProfileLocked,
  registerPortalSistemasHandlers,
  scrapeProfile,
};
