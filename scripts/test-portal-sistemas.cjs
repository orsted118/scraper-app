// Harness temporal: verifica portal-sistemas.js contra el portal REAL de ITSON
// (login, scrapeProfile, fetchCredential). Usa el userData del perfil "Electron"
// (separado del real). Correr: npx electron scripts/test-portal-sistemas.cjs
const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

function sniffJpeg(buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

async function main() {
  const portalSistemas = require('../electron/handlers/portal-sistemas');
  const { chromium } = require('playwright');
  const userData = app.getPath('userData');
  console.log('userData:', userData);

  // Limpieza de corridas anteriores del harness.
  fs.rmSync(path.join(userData, 'profile-cache'), { recursive: true, force: true });

  const user = process.env.IVIRTUAL_USER?.trim();
  const password = process.env.IVIRTUAL_PASS?.trim();
  check('credenciales presentes en .env', Boolean(user && password));

  // ── 1. getProfile sin cache ───────────────────────────────────
  check('getProfile() sin cache → null', portalSistemas.getProfile() === null);

  // ── 2. Login + scrapeProfile REAL contra ITSON ────────────────
  console.log('\nLogin + scrape real contra Portal de Sistemas (puede tardar ~15-20s)...');
  const browser = await chromium.launch({ headless: true });
  let profile;
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const t0 = Date.now();
    await portalSistemas.loginToPortalSistemas(page, user, password);
    const loginMs = Date.now() - t0;
    check('login real ok', true, `${loginMs}ms`);

    profile = await portalSistemas.scrapeProfile(page);
    console.log('profile:', JSON.stringify({ ...profile, photoPath: profile.photoPath ? '(path oculto en log, ver check aparte)' : null }));

    check('fullName no vacío', Boolean(profile.fullName), profile.fullName);
    check('email institucional correcto (sufijo @potros.itson.edu.mx)', /@potros\.itson\.edu\.mx$/i.test(profile.email || ''), profile.email);
    check('studentId es numérico de 11 dígitos', /^\d{11}$/.test(profile.studentId || ''), profile.studentId);
    check('acadProg presente', Boolean(profile.acadProg), profile.acadProg);
    check('cachedAt es ISO parseable', Number.isFinite(new Date(profile.cachedAt).getTime()));

    // ── 3. Foto: archivo real, JPEG válido, ~128px ────────────────
    check('photoPath escrito en disco', profile.photoPath && fs.existsSync(profile.photoPath));
    if (profile.photoPath && fs.existsSync(profile.photoPath)) {
      const buffer = fs.readFileSync(profile.photoPath);
      check('foto es JPEG válido', sniffJpeg(buffer), `${buffer.length} bytes`);
      check('foto es más chica que el original (resize aplicado)', buffer.length < 200 * 1024, `${buffer.length} bytes`);
    }

    // ── 4. profile.json persistido en disco ───────────────────────
    const profileJsonPath = path.join(userData, 'profile-cache', 'profile.json');
    check('profile.json escrito en disco', fs.existsSync(profileJsonPath));

    // ── 5. getProfile() ahora devuelve el cache (con isStale) ────
    const cached = portalSistemas.getProfile();
    check('getProfile() devuelve cache tras scrape', cached !== null && cached.studentId === profile.studentId);
    check('isStale=false para cache recién escrito', cached?.isStale === false);

    // ── 6. downloadCredentialBuffer REAL (sin diálogo) ────────────
    console.log('\nDescargando credencial real (sin diálogo, solo buffer)...');
    const pdfBuffer = await portalSistemas.downloadCredentialBuffer(context, profile.studentId, profile.acadProg);
    check('PDF real: header %PDF-', pdfBuffer.slice(0, 5).toString() === '%PDF-');
    check('PDF real: tamaño > 50KB', pdfBuffer.length > 50 * 1024, `${pdfBuffer.length} bytes`);

    // ── 7. fetchCredential completo con dialog monkeypatcheado ────
    const testSavePath = path.join(userData, 'Credencial-test.pdf');
    const originalShowSaveDialog = dialog.showSaveDialog;
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: testSavePath });
    try {
      const result = await portalSistemas.fetchCredential(context, profile.studentId, profile.acadProg);
      check('fetchCredential devuelve savedPath', result.savedPath === testSavePath, result.savedPath);
      check('archivo PDF escrito en el path elegido', fs.existsSync(testSavePath));
      if (fs.existsSync(testSavePath)) {
        const written = fs.readFileSync(testSavePath);
        check('archivo escrito es PDF válido', written.slice(0, 5).toString() === '%PDF-', `${written.length} bytes`);
      }
    } finally {
      dialog.showSaveDialog = originalShowSaveDialog;
      fs.rmSync(testSavePath, { force: true });
    }

    // ── 8. Lock: dos refreshProfile concurrentes → uno rechazado ──
    const [r1, r2] = await Promise.all([
      portalSistemas.refreshProfile(),
      portalSistemas.refreshProfile(),
    ]);
    const rejected = [r1, r2].filter((r) => r?.error === 'in-progress').length;
    check('lock: exactamente 1 de 2 refreshProfile concurrentes rechazado', rejected === 1, `rejected=${rejected}`);
  } finally {
    await browser.close().catch(() => {});
  }

  // ── 9. Credenciales inválidas → error amigable sin echo ───────
  console.log('\nProbando con password incorrecta (debe fallar amigable)...');
  const badBrowser = await chromium.launch({ headless: true });
  try {
    const badContext = await badBrowser.newContext();
    const badPage = await badContext.newPage();
    let threw = false;
    try {
      await portalSistemas.loginToPortalSistemas(badPage, user, 'password-incorrecta-xyz-123');
    } catch (error) {
      threw = true;
      check('password mala: error no incluye el password', !String(error.message).includes('password-incorrecta-xyz-123'));
    }
    check('password mala: login lanza error', threw);
  } finally {
    await badBrowser.close().catch(() => {});
  }

  // ── Resumen ────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) {
    console.log('FALLARON:', failed.map((f) => f.name).join(' | '));
  }
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() =>
  main().catch((error) => {
    console.error('HARNESS ERROR:', error?.message);
    app.exit(1);
  }),
);
