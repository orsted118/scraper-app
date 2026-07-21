// Harness temporal: verifica settings.js extendido (appVersion, test-connection,
// clear-credentials). Hace backup del .env real y lo restaura SIEMPRE en finally.
// Correr con: npx electron scripts/test-ajustes-settings.cjs
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  const settings = require('../electron/handlers/settings');
  const envPath = settings.getEnvFilePath();
  const backupPath = `${envPath}.harness-bak`;
  const envSnapshot = {};

  for (const key of ['IVIRTUAL_USER', 'IVIRTUAL_PASS', 'CIA_USER', 'CIA_PASS', 'NOTIF_MINUTES_BEFORE', 'STUDENT_NAME']) {
    envSnapshot[key] = process.env[key];
  }

  fs.copyFileSync(envPath, backupPath);

  try {
    // ── 1. appVersion ────────────────────────────────────────────
    const current = settings.getSettings();
    check('getSettings incluye appVersion', typeof current.appVersion === 'string' && current.appVersion.length > 0, current.appVersion);

    // ── 2. testConnection: validaciones sin browser ──────────────
    const noUser = await settings.testConnection({ portal: 'ivirtual', user: '' });
    check('test sin usuario falla rápido', noUser.ok === false && noUser.error === 'Falta el usuario.');

    // ── 3. testConnection iVirtual REAL con password guardada ────
    console.log('\nProbando login real iVirtual (password guardada)...');
    const ivUser = process.env.IVIRTUAL_USER;
    const okRun = settings.testConnection({ portal: 'ivirtual', user: ivUser, password: '' });
    const lockRun = settings.testConnection({ portal: 'ivirtual', user: ivUser, password: '' });
    const [okResult, lockResult] = await Promise.all([okRun, lockRun]);
    check('login iVirtual real ok', okResult.ok === true, JSON.stringify(okResult));
    check('lock: segunda prueba concurrente rechazada', lockResult.ok === false && lockResult.error.includes('en curso'));

    // ── 4. testConnection iVirtual con password INCORRECTA ───────
    console.log('\nProbando login iVirtual con password incorrecta...');
    const badResult = await settings.testConnection({ portal: 'ivirtual', user: ivUser, password: 'password-incorrecta-123' });
    check('password mala → rechazo sin echo de credenciales', badResult.ok === false && !JSON.stringify(badResult).includes('password-incorrecta'), badResult.error);

    // ── 5. testConnection CIA REAL ───────────────────────────────
    console.log('\nProbando login real CIA (puede tardar ~30s)...');
    const ciaResult = await settings.testConnection({ portal: 'cia', user: process.env.CIA_USER, password: '' });
    check('login CIA real ok', ciaResult.ok === true, JSON.stringify(ciaResult));

    // ── 6. clearCredentials ──────────────────────────────────────
    const cleared = settings.clearCredentials();
    const envAfter = fs.readFileSync(envPath, 'utf8');
    check('clearCredentials success', cleared.success === true);
    check(
      'las 4 keys de credenciales fuera del .env',
      !/^(IVIRTUAL_USER|IVIRTUAL_PASS|CIA_USER|CIA_PASS)=/m.test(envAfter),
    );
    check('otras keys preservadas', envAfter.includes('NOTIF_MINUTES_BEFORE=') || !envSnapshot.NOTIF_MINUTES_BEFORE, envAfter.split('\n').filter(Boolean).map((l) => l.split('=')[0]).join(','));
    check('process.env invalidado', !process.env.IVIRTUAL_PASS && !process.env.CIA_PASS);
  } finally {
    // Restaurar SIEMPRE: .env original + process.env
    fs.copyFileSync(backupPath, envPath);
    fs.rmSync(backupPath, { force: true });
    for (const [key, value] of Object.entries(envSnapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  const restoredEnv = fs.readFileSync(envPath, 'utf8');
  check('.env restaurado con credenciales', /^IVIRTUAL_USER=/m.test(restoredEnv) && /^IVIRTUAL_PASS=/m.test(restoredEnv));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) {
    console.log('FALLARON:', failed.map((f) => f.name).join(' | '));
  }
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() =>
  main().catch((error) => {
    console.error('HARNESS ERROR:', error);
    app.exit(1);
  }),
);
