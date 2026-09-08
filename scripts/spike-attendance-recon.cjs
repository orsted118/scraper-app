// Spike de reconocimiento: cómo se ve mod_attendance para el ALUMNO y si el
// portal permite auto-registrarse.
//
// STRICT READ-ONLY. Este script NUNCA:
//   - clickea "Submit attendance" / "Guardar cambios" / ningún radio de estado
//   - dispara submit de ningún form
//   - marca una asistencia
// Sólo navega, lee DOM y guarda JSON + HTML crudo.
//
// Marcar asistencia es un WRITE con consecuencias académicas: hasta saber
// exactamente qué formulario hay del otro lado, no se toca nada.
//
// Salida: scripts/spike-output/attendance-<timestamp>/
//
// Uso: node scripts/spike-attendance-recon.cjs
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OUTPUT_ROOT = path.resolve(__dirname, 'spike-output');
const log = (m) => process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${m}\n`);
const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 44);

async function login(page) {
  await page.goto('https://ivirtual.itson.edu.mx/login/index.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#username', process.env.IVIRTUAL_USER);
  await page.fill('#password', process.env.IVIRTUAL_PASS);
  await page.click('#loginbtn');
  await page.waitForLoadState('domcontentloaded');
}

// La vista de alumno de mod_attendance lista las sesiones con su estado. Cuando
// el profe habilita el auto-registro aparece un link "Submit attendance" hacia
// attendance/attendance.php, que es el form que realmente marca.
async function readAttendance(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;

    // Tabla de sesiones: fecha, descripción, estado y (si se puede) la acción.
    const filas = Array.from(main.querySelectorAll('table tr'))
      .map((tr) => ({
        celdas: Array.from(tr.querySelectorAll('td, th')).map((td) => norm(td.textContent)).filter(Boolean),
        links: Array.from(tr.querySelectorAll('a[href]')).map((a) => ({ texto: norm(a.textContent), href: a.href })),
      }))
      .filter((f) => f.celdas.length > 0);

    // El link de auto-registro. Su presencia es LA señal de que esta sesión
    // acepta que el alumno se marque.
    const linksSubmit = Array.from(main.querySelectorAll('a[href*="attendance.php"]'))
      .map((a) => ({ texto: norm(a.textContent), href: a.href }));

    return {
      urlFinal: location.href,
      titulo: norm(document.querySelector('h1, h2')?.textContent || ''),
      // Resumen que Moodle pinta arriba (porcentaje de asistencia).
      resumen: norm(main.querySelector('.attendance-summary, .attfiltercontrols + div, .box')?.textContent || '').slice(0, 400),
      totalFilas: filas.length,
      filas: filas.slice(0, 25),
      linksSubmit,
      puedeAutoRegistrarse: linksSubmit.length > 0,
      // Si el profe pide contraseña de sesión, el form la exige.
      textoCompleto: norm(main.textContent || '').slice(0, 1200),
    };
  });
}

// El form real de auto-registro. SÓLO se lee: se listan los campos para saber
// qué habría que mandar, sin mandar nada.
async function readSubmitForm(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;
    const form = main.querySelector('form');

    return {
      urlFinal: location.href,
      hayForm: Boolean(form),
      action: form?.action || null,
      method: form?.method || null,
      // Los estados que el alumno puede elegir (Presente / Retardo / Falta…).
      opciones: Array.from(main.querySelectorAll('input[type="radio"]')).map((input) => ({
        name: input.name,
        value: input.value,
        label: norm(input.closest('label, .form-check, .felement, td, tr')?.textContent || ''),
      })),
      // Campos ocultos: sesskey, sessid, etc. Son los que hacen falta para postear.
      ocultos: Array.from(main.querySelectorAll('input[type="hidden"]')).map((i) => ({ name: i.name, value: String(i.value).slice(0, 24) })),
      pidePassword: Boolean(main.querySelector('input[name*="password"], input[type="password"]')),
      botones: Array.from(main.querySelectorAll('button, input[type="submit"]')).map((b) => norm(b.textContent || b.value)).filter(Boolean),
      textoCompleto: norm(main.textContent || '').slice(0, 900),
    };
  });
}

(async () => {
  if (!process.env.IVIRTUAL_USER || !process.env.IVIRTUAL_PASS) {
    log('Faltan credenciales en .env');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(OUTPUT_ROOT, `attendance-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  log(`Output → ${outDir}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const muestras = [];

  try {
    await login(page);
    log('Login OK');

    await page.goto('https://ivirtual.itson.edu.mx/my/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const cursos = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
      const seen = new Map();
      for (const l of links) {
        const id = (l.href.match(/id=(\d+)/) || [])[1];
        const name = (l.textContent || '').replace(/\s+/g, ' ').trim();
        if (id && name && !seen.has(id)) seen.set(id, { id, name });
      }
      return [...seen.values()];
    });

    log(`${cursos.length} cursos`);

    for (const curso of cursos) {
      await page.goto(`https://ivirtual.itson.edu.mx/course/view.php?id=${curso.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);

      const modulos = await page.locator('a[href*="/mod/attendance/view.php"]').evaluateAll((links) => {
        const seen = new Map();
        for (const l of links) {
          if (!seen.has(l.href)) seen.set(l.href, { href: l.href, nombre: (l.textContent || '').replace(/\s+/g, ' ').trim() });
        }
        return [...seen.values()];
      });

      if (modulos.length === 0) {
        log(`  ${curso.name}: sin módulo de asistencia`);
        continue;
      }

      for (const mod of modulos) {
        log(`  ${curso.name} → ${mod.nombre}`);
        const vista = await readAttendance(page, mod.href);

        let form = null;
        if (vista.puedeAutoRegistrarse) {
          log('     ¡tiene link de auto-registro! leyendo el form (sin enviar)…');
          form = await readSubmitForm(page, vista.linksSubmit[0].href);
        }

        fs.writeFileSync(path.join(outDir, `attendance-${curso.id}-${slug(mod.nombre)}.html`), await page.content(), 'utf8');
        muestras.push({ curso, modulo: mod, vista, form });
      }
    }

    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), muestras }, null, 2), 'utf8');
    log(`report.json escrito con ${muestras.length} módulos de asistencia.`);
  } finally {
    await browser.close().catch(() => {});
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
