// Spike parte 2: resolver a QUÉ apunta cada módulo de material.
//
// El recon de portadas dijo que el material vive en tres formas — url, folder y
// page. Cada una necesita un tratamiento distinto en el módulo, y eso depende de
// datos que sólo se ven entrando: una `url` puede apuntar a un PDF descargable,
// a Drive o a YouTube, y un `folder` puede tener 1 archivo o 40.
//
// STRICT READ-ONLY: acceptDownloads:false, no clickea submit, no marca nada.
//
// Uso: node scripts/spike-material-deep.cjs [--input <dir de material-*>]
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OUTPUT_ROOT = path.resolve(__dirname, 'spike-output');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : fallback;
};

const log = (message) => process.stdout.write(`[${new Date().toISOString().slice(11, 19)}] ${message}\n`);

function latestMaterialDir() {
  const dirs = fs.readdirSync(OUTPUT_ROOT).filter((d) => d.startsWith('material-')).sort();
  return dirs.length ? path.join(OUTPUT_ROOT, dirs[dirs.length - 1]) : null;
}

async function login(page) {
  await page.goto('https://ivirtual.itson.edu.mx/login/index.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#username', process.env.IVIRTUAL_USER);
  await page.fill('#password', process.env.IVIRTUAL_PASS);
  await page.click('#loginbtn');
  await page.waitForLoadState('domcontentloaded');
}

// mod/url: Moodle puede mostrar una página intermedia con el link, o redirigir
// directo al destino. Se contemplan ambas.
async function resolveUrlModule(page, href) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;

    // El destino aparece como link directo en el cuerpo, o Moodle ya redirigió.
    const externo = Array.from(main.querySelectorAll('a[href]'))
      .map((a) => a.href)
      .find((h) => h && !h.includes('ivirtual.itson.edu.mx'));

    return {
      urlFinal: location.href,
      redirigido: !location.href.includes('/mod/url/view.php'),
      destino: externo || null,
      descripcion: norm(main.querySelector('.box.generalbox, .urlworkaround, .no-overflow')?.textContent || '').slice(0, 300),
      // Si el destino es un archivo servido por Moodle (pluginfile) es
      // descargable directo; si es Drive/YouTube hay que abrirlo en el browser.
      esArchivoMoodle: /pluginfile\.php|draftfile\.php/.test(externo || ''),
    };
  });
}

// mod/folder: la lista de archivos vive en el DOM como links a pluginfile.php.
async function resolveFolderModule(page, href) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;

    const archivos = Array.from(main.querySelectorAll('a[href*="pluginfile.php"]')).map((a) => ({
      nombre: norm(a.textContent) || decodeURIComponent((a.href.split('/').pop() || '').split('?')[0]),
      url: a.href,
      ext: (decodeURIComponent(a.href.split('?')[0]).match(/\.([a-z0-9]{1,5})$/i) || [])[1]?.toLowerCase() || null,
      // El ícono que pinta Moodle delata el tipo sin bajar el archivo.
      icono: a.querySelector('img')?.getAttribute('src') || a.previousElementSibling?.querySelector('img')?.getAttribute('src') || null,
    }));

    // Deduplica: Moodle repite el link en el ícono y en el nombre.
    const vistos = new Map();
    for (const a of archivos) if (!vistos.has(a.url)) vistos.set(a.url, a);

    return {
      urlFinal: location.href,
      descripcion: norm(main.querySelector('.box.generalbox')?.textContent || '').slice(0, 250),
      archivos: [...vistos.values()],
    };
  });
}

// mod/page: contenido HTML embebido. Puede traer texto, links y archivos.
async function resolvePageModule(page, href) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const box = document.querySelector('#region-main .box.generalbox, #region-main [role="main"], #region-main');

    return {
      urlFinal: location.href,
      chars: (box?.innerHTML || '').length,
      texto: norm(box?.textContent || '').slice(0, 400),
      links: Array.from(box?.querySelectorAll('a[href]') || [])
        .map((a) => ({ texto: norm(a.textContent).slice(0, 70), href: a.href }))
        .filter((l) => l.href && !l.href.startsWith('javascript:'))
        .slice(0, 25),
      archivosEmbebidos: Array.from(box?.querySelectorAll('a[href*="pluginfile.php"]') || []).length,
    };
  });
}

(async () => {
  const inputDir = getArg('input', latestMaterialDir());
  if (!inputDir || !fs.existsSync(path.join(inputDir, 'report.json'))) {
    log('No hay report.json. Corré primero spike-material-recon.cjs');
    process.exit(1);
  }

  const base = JSON.parse(fs.readFileSync(path.join(inputDir, 'report.json'), 'utf8'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(OUTPUT_ROOT, `material-deep-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });
  log(`Input  ← ${inputDir}`);
  log(`Output → ${outDir}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  const resultados = [];

  try {
    await login(page);
    log('Login OK');

    for (const sample of base.samples) {
      for (const section of sample.content.sections) {
        for (const mod of section.modules) {
          if (!['url', 'folder', 'page'].includes(mod.tipo)) continue;

          log(`  ${sample.course.name} / ${mod.tipo} / ${mod.nombre.slice(0, 42)}`);
          let detalle = null;

          try {
            if (mod.tipo === 'url') detalle = await resolveUrlModule(page, mod.href);
            else if (mod.tipo === 'folder') detalle = await resolveFolderModule(page, mod.href);
            else detalle = await resolvePageModule(page, mod.href);
          } catch (error) {
            detalle = { error: error.message };
          }

          resultados.push({ curso: sample.course.name, cursoId: sample.course.id, seccion: section.title, ...mod, detalle });
        }
      }
    }

    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), resultados }, null, 2), 'utf8');
    log(`report.json escrito con ${resultados.length} módulos resueltos.`);
  } finally {
    await browser.close().catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
