// Spike de reconocimiento: qué material publica cada materia en iVirtual y con
// qué estructura, para diseñar el módulo de Material.
//
// STRICT READ-ONLY. Este script NUNCA:
//   - descarga archivos (acceptDownloads: false)
//   - clickea submit de ningún form
//   - marca actividades como completadas
// Solo navega la portada de cada curso, extrae DOM y guarda JSON + HTML crudo.
//
// Salida: scripts/spike-output/material-<timestamp>/
//   report.json          — secciones y recursos por curso
//   course-<slug>.html   — HTML crudo de la portada del curso
//
// Uso: node scripts/spike-material-recon.cjs [--limit N]
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
const LIMIT = Number(getArg('limit', '6')) || 6;

const log = (message) => process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${message}\n`);
const slugify = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 46);

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', process.env.IVIRTUAL_USER);
  await page.fill('#password', process.env.IVIRTUAL_PASS);
  await page.click('#loginbtn');
  await page.waitForLoadState('domcontentloaded');
}

// La portada del curso es la fuente: lista secciones ("temas"/"semanas") y
// dentro de cada una los módulos con su tipo (resource=archivo, url, page,
// folder, assign...). El tipo sale del href de mod/<tipo>/view.php.
async function readCourseContent(page, course) {
  await page.goto(`https://ivirtual.itson.edu.mx/course/view.php?id=${course.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();

    const sections = Array.from(document.querySelectorAll('li.section, .course-section')).map((section) => {
      const title = norm(
        section.querySelector('.sectionname, .section-title, h3')?.textContent || '',
      );
      const summary = norm(section.querySelector('.summarytext, .section_availability')?.textContent || '').slice(0, 300);

      const modules = Array.from(section.querySelectorAll('li.activity, .activity-wrapper')).map((mod) => {
        const link = mod.querySelector('a[href*="/mod/"]');
        const href = link?.href || '';
        const tipo = (href.match(/\/mod\/([a-z_]+)\//) || [])[1] || null;

        return {
          tipo,
          href,
          // Moodle mete el tipo como texto oculto ("Archivo", "URL") dentro del
          // link: se saca para que el nombre quede limpio.
          nombre: norm(link?.querySelector('.instancename')?.firstChild?.textContent || link?.textContent || ''),
          // El badge de tipo de archivo (PDF, PowerPoint) que pinta Moodle.
          iconAlt: mod.querySelector('.activityicon, .icon')?.getAttribute('alt') || null,
          iconSrc: mod.querySelector('.activityicon, .icon')?.getAttribute('src') || null,
          descripcion: norm(mod.querySelector('.contentafterlink, .activity-description')?.textContent || '').slice(0, 200),
          // "Archivo PDF · 2.4 MB" y similares.
          meta: norm(mod.querySelector('.resourcelinkdetails, .activity-badges')?.textContent || ''),
          completado: Boolean(mod.querySelector('.completion-icon-container [data-toggletype="manual:mark-done"], .completioncheckbox')),
        };
      }).filter((mod) => mod.nombre || mod.href);

      return { title, summary, modules };
    }).filter((section) => section.modules.length > 0 || section.title);

    return {
      pageTitle: document.title,
      formato: document.body.className.match(/format-([a-z]+)/)?.[1] || null,
      sections,
      totalModulos: sections.reduce((sum, s) => sum + s.modules.length, 0),
    };
  });
}

(async () => {
  if (!process.env.IVIRTUAL_USER || !process.env.IVIRTUAL_PASS) {
    log('Faltan IVIRTUAL_USER / IVIRTUAL_PASS en .env');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(OUTPUT_ROOT, `material-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  log(`Output → ${outDir}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  try {
    log('Login iVirtual…');
    await login(page);

    log('Dashboard…');
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const courses = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
      const seen = new Map();
      for (const link of links) {
        const id = (link.href.match(/id=(\d+)/) || [])[1];
        const name = (link.textContent || '').replace(/\s+/g, ' ').trim();
        if (id && name && !seen.has(id)) seen.set(id, { id, name });
      }
      return [...seen.values()];
    });

    log(`Cursos: ${courses.length}`);
    const samples = [];

    for (const course of courses.slice(0, LIMIT)) {
      log(`  ${course.name} (${course.id})…`);
      const content = await readCourseContent(page, course);
      const slug = `${course.id}-${slugify(course.name)}`;

      fs.writeFileSync(path.join(outDir, `course-${slug}.html`), await page.content(), 'utf8');
      samples.push({ course, content });
      log(`    ${content.sections.length} secciones, ${content.totalModulos} módulos (formato ${content.formato})`);
    }

    const report = { generatedAt: new Date().toISOString(), user: process.env.IVIRTUAL_USER, cursos: courses.length, samples };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    log('report.json escrito.');

    // Resumen por tipo: es lo que decide qué soporta el módulo primero.
    const porTipo = {};
    for (const s of samples) {
      for (const sec of s.content.sections) {
        for (const mod of sec.modules) porTipo[mod.tipo || 'sin-tipo'] = (porTipo[mod.tipo || 'sin-tipo'] || 0) + 1;
      }
    }
    log(`Tipos encontrados: ${Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  } finally {
    await browser.close().catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
