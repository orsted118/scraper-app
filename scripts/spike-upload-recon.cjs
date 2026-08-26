// Spike de reconocimiento: qué le hace falta al modelo de `activity` para
// habilitar upload directo a iVirtual desde la app.
//
// STRICT READ-ONLY. Este script NUNCA:
//   - clickea "Guardar cambios" / "Save changes" / "Enviar para calificar"
//   - dispara submit de ningún form
//   - sube ningún archivo
// Solo navega, extrae DOM y guarda screenshots + JSON.
//
// Salida por corrida: scripts/spike-output/recon-<timestamp>/
//   report.json                  — metadata estructurada por actividad
//   view-<slug>.html             — HTML crudo de la página de la actividad
//   editsubmission-<slug>.html   — HTML crudo del form de subida
//   editsubmission-<slug>.png    — screenshot del form (referencia visual)
//
// Uso:
//   node scripts/spike-upload-recon.cjs --urls URL1 URL2 URL3
//     Modo directo: pega URLs de mod/assign/view.php específicas.
//     Ideal cuando el dashboard está vacío (intersemestre) o para
//     muestrear actividades concretas.
//
//   node scripts/spike-upload-recon.cjs [--limit N] [--course-id ID]
//     Modo descubrimiento: crawlea desde /my/ hasta encontrar N actividades.
//     Requiere que el dashboard tenga cursos matriculados visibles.

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
const OUTPUT_ROOT = path.resolve(__dirname, 'spike-output');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : fallback;
};
const LIMIT = Number(getArg('limit', '3')) || 3;
const COURSE_FILTER = getArg('course-id', '');

// --urls consume TODO lo que venga después hasta el próximo --flag o fin de argv.
function collectDirectUrls() {
  const idx = args.indexOf('--urls');
  if (idx < 0) return [];
  const collected = [];
  for (let i = idx + 1; i < args.length; i += 1) {
    if (args[i].startsWith('--')) break;
    collected.push(args[i]);
  }
  return collected;
}
const DIRECT_URLS = collectDirectUrls();

function log(message) {
  const ts = new Date().toISOString().slice(11, 19);
  process.stdout.write('[' + ts + '] ' + message + '\n');
}

function slugify(value) {
  return String(value || 'sin-nombre')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

async function loginToIVirtual(page, username, password) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(() => {}),
    page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
  ]);

  if (page.url().includes('/login/')) {
    throw new Error('Login rechazado: revisa IVIRTUAL_USER / IVIRTUAL_PASS');
  }
}

async function collectCourses(page) {
  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });

  return page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
    const seen = new Set();
    const items = [];

    links.forEach((link) => {
      const name = (link.textContent || '').trim().replace(/\s+/g, ' ');
      const href = link.href;
      const match = href.match(/id=(\d+)/);

      if (!name || !href || !match || seen.has(match[1])) {
        return;
      }

      seen.add(match[1]);
      items.push({ id: match[1], name, url: href });
    });

    return items;
  });
}

async function collectAssignmentsFromCourse(page, course) {
  await page.goto('https://ivirtual.itson.edu.mx/mod/assign/index.php?id=' + course.id, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  return page.evaluate((courseName) => {
    return Array.from(document.querySelectorAll('table.generaltable tbody tr'))
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
          (cell.textContent || '').trim().replace(/\s+/g, ' '),
        );
        const link = row.querySelector('a[href*="/mod/assign/view.php?id="]');

        if (!link) return null;

        return {
          courseName,
          url: link.href,
          title: cells[cells.length >= 5 ? 1 : 0] || '',
          dueDate: cells[cells.length >= 5 ? 2 : 1] || '',
          submission: cells[cells.length >= 5 ? 3 : 2] || '',
        };
      })
      .filter(Boolean);
  }, course.name);
}

async function inspectViewPage(page, assignment) {
  await page.goto(assignment.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  return page.evaluate(() => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;

    // Tabla "Estado del envío" — fuente canónica de si hay entrega previa.
    const statusTable = main.querySelector('table.generaltable, table.submissionstatustable');
    const statusRows = statusTable
      ? Array.from(statusTable.querySelectorAll('tr')).map((row) =>
          Array.from(row.querySelectorAll('th, td')).map((c) => normalize(c.textContent)),
        )
      : [];

    // Botón "Añadir entrega" — punto de entrada al editsubmission.
    const submitCandidates = Array.from(main.querySelectorAll('a, button, input[type="submit"]'))
      .map((el) => ({
        label: normalize(el.textContent || el.value || ''),
        href: el.tagName === 'A' ? el.href : null,
        tag: el.tagName.toLowerCase(),
      }))
      .filter(({ label }) =>
        /a[nñ]adir entrega|edit(ar)? (mi )?entrega|add submission|edit submission|enviar tarea|entregar/i.test(
          label,
        ),
      );

    // Adjuntos declarados por el profesor (no lo que subiría el alumno).
    const teacherAttachments = Array.from(main.querySelectorAll('a[href*="pluginfile.php"]'))
      .map((a) => ({ name: normalize(a.textContent), url: a.href }))
      .filter((f) => f.url && !f.url.includes('/user/') && !f.url.includes('/theme/'));

    const bodyText = normalize(document.body?.textContent || '');
    const modalidadHint = /(entrega en grupo|group submission|tarea grupal|team submission)/i.test(bodyText)
      ? 'equipo'
      : 'individual';

    return {
      pageTitle: normalize(document.title),
      submitButtons: submitCandidates,
      statusTable: statusRows,
      teacherAttachments,
      modalidadHint,
      hasFileSubmissionPlugin: Boolean(
        main.querySelector('[id*="assignsubmission_file"], .assignsubmission_file'),
      ),
      hasOnlineTextPlugin: Boolean(
        main.querySelector('[id*="assignsubmission_onlinetext"], .assignsubmission_onlinetext'),
      ),
    };
  });
}

async function inspectEditSubmission(page, assignment) {
  const url = new URL(assignment.url);
  const cmid = url.searchParams.get('id');
  const editUrl =
    'https://ivirtual.itson.edu.mx/mod/assign/view.php?id=' + cmid + '&action=editsubmission';

  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const meta = await page.evaluate(() => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;
    const html = document.documentElement.innerHTML;
    const bodyText = normalize(document.body.textContent || '');

    // Moodle inyecta el filemanager por JavaScript: en el HTML estático no hay
    // <input type="file">. Los límites reales viven en el JSON de configuración
    // del filepicker, no en atributos data-* del contenedor.
    const pickNumber = (pattern) => {
      const m = html.match(pattern);
      return m ? Number(m[1]) : null;
    };
    const pickString = (pattern) => {
      const m = html.match(pattern);
      return m ? m[1] : null;
    };

    const filemanager = main.querySelector('[data-fieldtype="filemanager"], .filemanager');
    const saveButtons = Array.from(main.querySelectorAll('form button, form input[type="submit"]'))
      .map((el) => normalize(el.textContent || el.value || ''))
      .filter(Boolean);

    // "Continue" solo (sin "Save changes") = Moodle rechazó la edición: la
    // entrega está cerrada, vencida o no permite archivos.
    const puedeEntregar = saveButtons.some((label) => /save changes|guardar cambios/i.test(label));

    // Límite legible que Moodle imprime arriba del uploader.
    const limitesTexto = normalize(
      (bodyText.match(/Maximum file size:[^.]{0,80}/i) ||
        bodyText.match(/Tama[nñ]o m[aá]ximo[^.]{0,80}/i) ||
        [''])[0],
    );

    // accepted_types vacío = sin restricción de extensión.
    const acceptedRaw = pickString(/accepted_types"\s*:\s*(\[[^\]]*\])/);
    let acceptedTypes = null;
    try {
      acceptedTypes = acceptedRaw ? JSON.parse(acceptedRaw) : null;
    } catch (_e) {
      acceptedTypes = acceptedRaw;
    }

    const onlineText = main.querySelector('textarea[name*="onlinetext"]');
    const declaration = Array.from(main.querySelectorAll('input[type="checkbox"]')).map((el) => ({
      name: el.name,
      id: el.id,
      label: normalize(el.closest('label, .form-check, .fitem')?.textContent || ''),
    }));

    // Nombres de archivo ya cargados en el borrador (no las etiquetas del árbol).
    const draftFiles = Array.from(main.querySelectorAll('.fp-filename'))
      .map((el) => normalize(el.textContent))
      .filter((name) => name && name.toLowerCase() !== 'files');

    return {
      currentUrl: location.href,
      redirectedAwayFromEdit: !location.href.includes('action=editsubmission'),

      // Señal principal para la UI: ¿esta actividad acepta entrega ahora?
      puedeEntregar,
      formButtons: saveButtons,

      filemanagerFound: Boolean(filemanager),
      hasOnlineTextArea: Boolean(onlineText),

      // Restricciones reales.
      limitesTexto,
      maxBytes: pickNumber(/maxbytes"\s*:\s*"?(\d+)"?/),
      maxFiles: pickNumber(/maxfiles"\s*:\s*"?(-?\d+)"?/),
      areaMaxBytes: pickNumber(/areamaxbytes"\s*:\s*"?(-?\d+)"?/),
      acceptedTypes,

      // Identificadores que necesita cualquier subida programática.
      draftItemId: pickNumber(/"itemid"\s*:\s*(\d+)/),
      sesskey: pickString(/"sesskey"\s*:\s*"([^"]+)"/),
      repositorios: Array.from(new Set((html.match(/"type":"(upload|recent|user|local|url)"/g) || []))),

      declaration,
      draftFiles,
    };
  });

  return { editUrl, meta };
}

async function run() {
  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;

  if (!user || !pass) {
    throw new Error('Faltan IVIRTUAL_USER / IVIRTUAL_PASS en .env');
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(OUTPUT_ROOT, 'recon-' + runId);
  fs.mkdirSync(outputDir, { recursive: true });
  log('Output → ' + outputDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    log('Login iVirtual…');
    await loginToIVirtual(page, user, pass);

    const sampledDirect = [];
    if (DIRECT_URLS.length) {
      log('Modo directo: ' + DIRECT_URLS.length + ' URL(s) desde argv.');

      for (const url of DIRECT_URLS) {
        const cmid = new URL(url).searchParams.get('id') || 'sin-id';
        const assignment = { url, title: 'assign-' + cmid, dueDate: '', submission: '' };
        const slug = slugify('direct-' + cmid);
        log('  → ' + url);

        try {
          const view = await inspectViewPage(page, assignment);
          fs.writeFileSync(path.join(outputDir, 'view-' + slug + '.html'), await page.content(), 'utf8');
          const edit = await inspectEditSubmission(page, assignment);
          fs.writeFileSync(
            path.join(outputDir, 'editsubmission-' + slug + '.html'),
            await page.content(),
            'utf8',
          );
          await page.screenshot({
            path: path.join(outputDir, 'editsubmission-' + slug + '.png'),
            fullPage: true,
          });

          sampledDirect.push({
            slug,
            course: null,
            assignment,
            view,
            edit,
          });
        } catch (error) {
          log('  ⚠ falló: ' + error.message);
          sampledDirect.push({ slug, assignment, error: error.message });
        }
      }

      const report = {
        generatedAt: new Date().toISOString(),
        user,
        mode: 'direct',
        samplesCount: sampledDirect.length,
        samples: sampledDirect,
      };
      fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
      log('report.json escrito.');
      log('Listo. ' + sampledDirect.length + ' muestras en ' + outputDir);
      return;
    }

    log('Dashboard courses…');
    const allCourses = await collectCourses(page);
    const courses = COURSE_FILTER
      ? allCourses.filter((c) => c.id === COURSE_FILTER)
      : allCourses;
    log('Cursos: ' + courses.length + (COURSE_FILTER ? ' (filtrado a ' + COURSE_FILTER + ')' : ''));

    const sampled = [];

    for (const course of courses) {
      if (sampled.length >= LIMIT) break;

      log('Curso "' + course.name + '" → assignments…');
      const assignments = await collectAssignmentsFromCourse(page, course);
      log('  ' + assignments.length + ' assignments');

      for (const assignment of assignments) {
        if (sampled.length >= LIMIT) break;

        const slug = slugify(course.id + '-' + assignment.title);
        log('  [' + (sampled.length + 1) + '/' + LIMIT + '] ' + assignment.title);

        try {
          const view = await inspectViewPage(page, assignment);
          fs.writeFileSync(path.join(outputDir, 'view-' + slug + '.html'), await page.content(), 'utf8');

          const edit = await inspectEditSubmission(page, assignment);
          fs.writeFileSync(
            path.join(outputDir, 'editsubmission-' + slug + '.html'),
            await page.content(),
            'utf8',
          );
          await page.screenshot({
            path: path.join(outputDir, 'editsubmission-' + slug + '.png'),
            fullPage: true,
          });

          sampled.push({
            slug,
            course: { id: course.id, name: course.name },
            assignment: {
              url: assignment.url,
              title: assignment.title,
              dueDate: assignment.dueDate,
              submission: assignment.submission,
            },
            view,
            edit,
          });
        } catch (error) {
          log('  ⚠ falló: ' + error.message);
          sampled.push({ slug, course, assignment, error: error.message });
        }
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      user,
      limit: LIMIT,
      courseFilter: COURSE_FILTER || null,
      samplesCount: sampled.length,
      samples: sampled,
    };

    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    log('report.json escrito.');
    log('Listo. ' + sampled.length + ' muestras en ' + outputDir);
  } finally {
    await browser.close().catch(() => {});
  }
}

run().catch((error) => {
  console.error('spike falló:', error);
  process.exit(1);
});
