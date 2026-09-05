// Material de las materias: lo que el profe publica en cada curso de iVirtual.
//
// LEER ANTES DE TOCAR NADA — lo que el recon del portal dejó claro:
//
// El material NO es "archivos subidos a Moodle". En los 5 cursos medidos hubo
// CERO módulos `resource`. Lo que hay son cuatro formas distintas, y un módulo
// que sólo baje archivos se pierde la mayoría:
//
//   folder → PDFs hosteados en Moodle (pluginfile.php). Descargables con la
//            sesión del scraper. Son las presentaciones de clase.
//   url    → Google Drive. Redes publica TODOS sus temas así y no tiene un solo
//            archivo en Moodle. VERIFICADO: esos Drive NO se pueden bajar sin la
//            sesión de Google del alumno (redirigen a accounts.google.com), así
//            que se guardan como enlace y se abren en su navegador.
//   page   → contenido HTML dentro de Moodle (apuntes, listas de recursos).
//   url    → utilidades que no son material pero valen oro: el Meet de la clase
//            y el grupo de WhatsApp. Salen aparte como "enlaces vivos".
//
// Por eso el modelo guarda `tipo` por recurso y la UI decide qué acción ofrecer,
// en vez de asumir que todo se descarga.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, ipcMain, shell } = require('electron');
const { chromium } = require('playwright');

const COURSE_URL = 'https://ivirtual.itson.edu.mx/course/view.php?id=';
const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
const COURSES_URL = 'https://ivirtual.itson.edu.mx/my/courses.php';
const PAGE_TIMEOUT_MS = 30_000;

// Sube cuando cambia la forma del JSON. Un caché viejo se descarta entero en vez
// de migrarse: es contenido reproducible con una sync, no datos del usuario.
const CACHE_VERSION = 3;

// Módulos que Moodle lista pero no son material ni enlaces: la entrega ya vive
// en el módulo de Actividades y duplicarla acá sería ruido.
const IGNORED_TYPES = new Set(['assign', 'attendance', 'quiz', 'choicegroup']);

// Un `url` cuyo destino matchea esto no es material de estudio sino una
// herramienta de la materia. Se muestran arriba como acción rápida.
const LIVE_LINK_PATTERNS = [
  { tipo: 'meet', re: /meet\.google\.com|zoom\.us|teams\.microsoft\.com/i },
  { tipo: 'whatsapp', re: /chat\.whatsapp\.com|wa\.me/i },
  { tipo: 'telegram', re: /t\.me/i },
];

function log(...args) {
  console.log('[material]', ...args);
}

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------

function getCachePath() {
  return path.join(app.getPath('userData'), 'material.json');
}

// Los archivos bajados viven aparte del JSON: el caché se puede tirar sin perder
// lo descargado, y viceversa.
function getDownloadsDir() {
  return path.join(app.getPath('userData'), 'material-files');
}

function readCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getCachePath(), 'utf8'));
    if (parsed?.version !== CACHE_VERSION) {
      log(`caché v${parsed?.version} descartado (actual v${CACHE_VERSION})`);
      return null;
    }
    return parsed;
  } catch (error) {
    if (error?.code !== 'ENOENT') log('error leyendo caché:', error?.message || error);
    return null;
  }
}

function writeCache(data) {
  fs.writeFileSync(getCachePath(), JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Clasificación
// ---------------------------------------------------------------------------

function detectLiveLink(url) {
  return LIVE_LINK_PATTERNS.find((pattern) => pattern.re.test(url || ''))?.tipo || null;
}

// Los links de Drive vienen en varias formas (/file/d/<id>/view, ?id=<id>,
// /open?id=). Se normaliza el id para poder armar la URL de preview y detectar
// duplicados entre secciones.
function parseDriveId(url) {
  const value = String(url || '');
  if (!/drive\.google\.com|docs\.google\.com/.test(value)) return null;

  const match = value.match(/\/file\/d\/([\w-]{20,})/)
    || value.match(/\/d\/([\w-]{20,})/)
    || value.match(/[?&]id=([\w-]{20,})/);

  return match ? match[1] : null;
}

// Un id estable por recurso: la URL del módulo ya es única por curso y no cambia
// entre syncs, así que sirve para casar lo descargado con lo scrapeado.
//
// Para links sueltos se hashea la URL COMPLETA. La primera versión recortaba un
// base64 del href a 20 caracteres, que sólo cubre los ~15 primeros bytes: todos
// los Drive empiezan con "https://drive.g" y colisionaban en el mismo id, así
// que el dedup se comía 5 de los 6 PDFs de Estructuras de Datos.
function resourceId(href) {
  const value = String(href || '');
  const cmid = value.match(/\/mod\/[a-z_]+\/view\.php\?id=(\d+)/);

  if (cmid) return `mod-${cmid[1]}`;

  return `url-${crypto.createHash('sha1').update(value).digest('base64url').slice(0, 16)}`;
}

// ---------------------------------------------------------------------------
// Scraping
// ---------------------------------------------------------------------------

// Ficha de cada curso tal como la muestra iVirtual: imagen, clave y periodo.
//
// Sale de /my/courses.php y NO del dashboard: el bloque del dashboard renderiza
// solo los cursos que su filtro deja pasar (en la cuenta medida mostraba 4 de 5)
// y además arranca vacío hasta que la tarjeta entra en viewport. La página "My
// courses" las trae todas de una.
//
// La imagen suele ser un data:image/svg+xml generado por Moodle — se ve sin
// sesión ni red. Cuando el profe sube una portada propia es un pluginfile, que
// sí necesita la cookie de sesión: por eso se marca cuál es cuál.
async function collectCourseCards(page) {
  await page.goto(COURSES_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const cards = await page.evaluate(() => {
    const limpiar = (value) => (value || '').replace(/\s+/g, ' ').trim();

    // Moodle rotula cada dato con un <span class="sr-only"> y pone el valor en
    // el resto del contenedor. Leerlo por rótulo aguanta que cambien el orden.
    const porRotulo = (card, rotulo) => {
      const span = Array.from(card.querySelectorAll('.sr-only')).find(
        (node) => limpiar(node.textContent) === rotulo,
      );

      if (!span) {
        return '';
      }

      return limpiar(span.parentElement?.textContent || '').replace(rotulo, '').trim();
    };

    return Array.from(document.querySelectorAll('[data-region="course-content"]')).map((card) => {
      const style = card.querySelector('.card-img-top')?.getAttribute('style') || '';
      const match = style.match(/url\(\s*["']?(.*?)["']?\s*\)/);
      const imagen = match ? match[1] : '';

      // El nombre vive en el ancla junto a rótulos de lectores de pantalla:
      // se clona y se les saca para no quedarse con "Course name Redes".
      const anchor = card.querySelector('a.coursename');
      let nombre = '';

      if (anchor) {
        const clone = anchor.cloneNode(true);
        clone.querySelectorAll('.sr-only, [data-region="favourite-icon"]').forEach((node) => node.remove());
        nombre = limpiar(clone.textContent);
      }

      return {
        id: card.getAttribute('data-course-id') || '',
        nombre,
        codigo: porRotulo(card, 'Course short name'),
        periodo: porRotulo(card, 'Course category'),
        imagen,
        imagenRequiereSesion: Boolean(imagen) && !imagen.startsWith('data:'),
      };
    });
  });

  return cards.filter((card) => card.id);
}

async function collectCourses(page) {
  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  return page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
    const seen = new Map();

    for (const link of links) {
      const id = (link.href.match(/id=(\d+)/) || [])[1];
      const name = (link.textContent || '').replace(/\s+/g, ' ').trim();
      if (id && name && !seen.has(id)) seen.set(id, { id, nombre: name });
    }

    return [...seen.values()];
  });
}

// Portada del curso: secciones ("temas"/"semanas") con sus módulos.
async function readCourseOutline(page, courseId) {
  await page.goto(`${COURSE_URL}${courseId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

    // Mucho material NO es un módulo con página propia. El profe lo pega como
    // link dentro de un `mod_label` — HTML suelto que Moodle renderiza en la
    // portada — o en el resumen de la sección o en la descripción de una
    // actividad. Estructuras de Datos tenía 6 PDFs de Drive así.
    //
    // Un label no tiene link a /mod/, así que el loop de módulos lo descartaba
    // por "sin nombre" y con él se iba todo su contenido. Por eso el barrido es
    // sobre la SECCIÓN entera y no sobre contenedores puntuales: alcanza con
    // saber qué links NO son material.
    const collectInlineLinks = (root) => {
      if (!root) return [];
      const porHref = new Map();

      for (const a of root.querySelectorAll('a[href]')) {
        const href = a.href;
        if (!/^https?:\/\//i.test(href || '')) continue;

        // Los /mod/ ya se capturan como módulos con su propio tratamiento; el
        // resto de lo interno es navegación de Moodle. Un pluginfile sí es
        // material aunque sea interno: es un archivo descargable.
        const esInterno = href.includes('ivirtual.itson.edu.mx');
        const esArchivo = /pluginfile\.php/.test(href);
        if (href.includes('/mod/') || (esInterno && !esArchivo)) continue;

        const textoAncla = norm(a.textContent);
        const contexto = norm(a.closest('p, li, h1, h2, h3, h4, h5, div')?.textContent || '');
        let nombre = textoAncla;
        let continuacion = false;

        // Word parte un link en varios <a>: en Estructuras, "Fundamentos de las
        // Estructuras de Datos" quedó como DOS anchors a archivos distintos, y
        // el segundo tenía por texto sólo "s". Un nombre así no sirve.
        if (textoAncla.length < 3) {
          nombre = contexto || 'Enlace sin nombre';
          continuacion = true;
        } else if (contexto.startsWith(textoAncla) && contexto.length > textoAncla.length) {
          // El ancla es el ARRANQUE de su bloque y el resto del nombre quedó
          // fuera del <a>: "Enlace a la" + "Asignación 01 - …". Si el bloque
          // empieza igual que el ancla, el bloque es el nombre completo.
          //
          // No aplica cuando el ancla está en medio de una frase ("Liga para
          // acceder al material de la Presentación del Curso"): ahí el texto
          // del ancla ya es el nombre bueno.
          nombre = contexto;
        }

        nombre = nombre.slice(0, 90);
        const previo = porHref.get(href);

        // El mismo href puede aparecer dos veces, una con texto y otra vacía
        // (marcador de Word). Gana la que tenga el nombre más informativo.
        if (!previo || (previo.continuacion && !continuacion) || (!continuacion && nombre.length > previo.nombre.length)) {
          porHref.set(href, { nombre, href, continuacion });
        }
      }

      return [...porHref.values()];
    };

    return Array.from(document.querySelectorAll('li.section, .course-section'))
      .map((section) => {
        const summary = section.querySelector('.summarytext, .section_summary');

        return {
          titulo: norm(section.querySelector('.sectionname, .section-title, h3')?.textContent || ''),
          resumen: norm(summary?.textContent || '').slice(0, 300),
          // Barrido de toda la sección: cubre resúmenes, labels y descripciones
          // de actividades de una sola pasada.
          enlacesSueltos: collectInlineLinks(section),
          modulos: Array.from(section.querySelectorAll('li.activity, .activity-wrapper'))
            .map((mod) => {
              const link = mod.querySelector('a[href*="/mod/"]');
              const href = link?.href || '';

              return {
                tipo: (href.match(/\/mod\/([a-z_]+)\//) || [])[1] || null,
                href,
                // El nombre visible del link trae el tipo como texto oculto
                // ("Archivo", "URL"); firstChild se queda sólo con el nombre.
                nombre: norm(link?.querySelector('.instancename')?.firstChild?.textContent || link?.textContent || ''),
                descripcion: norm(mod.querySelector('.contentafterlink, .activity-description')?.textContent || '').slice(0, 300),
              };
            })
            .filter((mod) => mod.href && mod.nombre),
        };
      })
      .filter((section) => section.modulos.length > 0 || section.enlacesSueltos.length > 0);
  });
}

// Convierte un link suelto (de un resumen de sección o de la descripción de una
// actividad) en un recurso. No tiene cmid, así que el id sale del href — que es
// igual de estable entre syncs.
function inlineLinkToResource(link, seccion) {
  const driveId = parseDriveId(link.href);

  return {
    id: resourceId(link.href),
    tipo: driveId ? 'drive' : /pluginfile\.php/.test(link.href) ? 'archivo' : 'enlace',
    nombre: link.nombre,
    // Un link partido por Word comparte nombre con el anterior: se marca para
    // que en la UI no parezcan el mismo archivo repetido.
    descripcion: link.continuacion ? `Del texto de "${seccion}" (enlace partido)` : `Del texto de "${seccion}"`,
    destino: link.href,
    driveId,
    liveLink: detectLiveLink(link.href),
    urlModulo: link.href,
  };
}

async function resolveFolder(page, href) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const main = document.querySelector('#region-main') || document.body;
    const vistos = new Map();

    for (const a of main.querySelectorAll('a[href*="pluginfile.php"]')) {
      if (vistos.has(a.href)) continue;
      const limpio = decodeURIComponent(a.href.split('?')[0]);

      vistos.set(a.href, {
        nombre: norm(a.textContent) || limpio.split('/').pop(),
        url: a.href,
        ext: (limpio.match(/\.([a-z0-9]{1,5})$/i) || [])[1]?.toLowerCase() || null,
      });
    }

    return { archivos: [...vistos.values()] };
  });
}

async function resolveUrl(page, href) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  return page.evaluate(() => {
    const main = document.querySelector('#region-main') || document.body;
    const externo = Array.from(main.querySelectorAll('a[href]'))
      .map((a) => a.href)
      .find((h) => h && !h.includes('ivirtual.itson.edu.mx'));

    return {
      // Moodle a veces redirige solo al destino y a veces muestra una página
      // intermedia con el link: hay que contemplar las dos.
      destino: location.href.includes('/mod/url/view.php') ? externo || null : location.href,
    };
  });
}

async function resolvePage(page, href) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  return page.evaluate(() => {
    const norm = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const box = document.querySelector('#region-main .box.generalbox') || document.querySelector('#region-main');

    return {
      texto: norm(box?.textContent || '')
        // Moodle mete este bloque de UI dentro del contenido.
        .replace(/^.*?Completion requirements/i, '')
        .trim()
        .slice(0, 4000),
      links: Array.from(box?.querySelectorAll('a[href]') || [])
        .map((a) => ({ texto: norm(a.textContent).slice(0, 80), url: a.href }))
        .filter((l) => l.url && !l.url.startsWith('javascript:') && l.texto)
        .slice(0, 30),
    };
  });
}

// Convierte un módulo de la portada en un recurso del modelo, entrando a
// resolverlo cuando hace falta. Devuelve null para lo que no es material.
async function buildResource(page, mod) {
  const base = {
    id: resourceId(mod.href),
    nombre: mod.nombre,
    descripcion: mod.descripcion,
    urlModulo: mod.href,
  };

  if (mod.tipo === 'folder') {
    const { archivos } = await resolveFolder(page, mod.href);
    return { ...base, tipo: 'carpeta', archivos };
  }

  if (mod.tipo === 'page') {
    const contenido = await resolvePage(page, mod.href);
    return { ...base, tipo: 'pagina', ...contenido };
  }

  if (mod.tipo === 'url') {
    const { destino } = await resolveUrl(page, mod.href);
    const driveId = parseDriveId(destino);

    return {
      ...base,
      // Drive va aparte de un link cualquiera: la UI puede ofrecer preview y
      // avisar que se abre con la cuenta de Google del ITSON.
      tipo: driveId ? 'drive' : 'enlace',
      destino,
      driveId,
      liveLink: detectLiveLink(destino),
    };
  }

  if (mod.tipo === 'forum') {
    return { ...base, tipo: 'foro' };
  }

  return null;
}

async function scrapeMaterial({ onProgress = null } = {}) {
  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;

  if (!user || !pass) {
    return { error: 'NO_CREDENTIALS' };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  try {
    const { loginToIVirtual } = require('./scraper');
    const loginError = await loginToIVirtual(page, user, pass);

    if (loginError) {
      return { error: loginError };
    }

    const cursos = await collectCourses(page);
    // Si la pagina de cursos cambia de forma, se pierden imagen/clave/periodo
    // pero NO el material: la ficha es decorativa y el modulo tiene que seguir
    // sirviendo sin ella.
    const fichas = await collectCourseCards(page).catch((error) => {
      log('no se pudieron leer las fichas de curso:', error?.message || error);
      return [];
    });
    const fichaPorId = new Map(fichas.map((ficha) => [ficha.id, ficha]));
    log(`${cursos.length} cursos, ${fichas.length} fichas`);

    const materias = [];

    for (const [index, curso] of cursos.entries()) {
      onProgress?.({ done: index, total: cursos.length, curso: curso.nombre });

      const outline = await readCourseOutline(page, curso.id);
      const secciones = [];
      const enlacesVivos = [];
      // Moodle renderiza el foro de avisos en varios contenedores de la portada,
      // así que el mismo módulo aparece hasta 4 veces. Se deduplica por id de
      // módulo, que es estable, y no por nombre (dos foros pueden llamarse igual).
      const vistos = new Set();

      for (const section of outline) {
        const recursos = [];

        // Un recurso, venga de donde venga, pasa por el mismo filtro: enlaces
        // vivos arriba, duplicados fuera.
        const agregar = (recurso) => {
          if (!recurso || vistos.has(recurso.id)) return;
          vistos.add(recurso.id);

          // Meet y WhatsApp suben al nivel de la materia: se usan todas las
          // semanas, no pertenecen a la sección donde el profe los pegó.
          if (recurso.liveLink) {
            enlacesVivos.push({ tipo: recurso.liveLink, nombre: recurso.nombre, url: recurso.destino });
            return;
          }

          recursos.push({ ...recurso, seccion: section.titulo });
        };

        // Los links sueltos van primero: el profe los escribe arriba porque son
        // el material de la semana, y las actividades vienen después.
        for (const link of section.enlacesSueltos || []) {
          agregar(inlineLinkToResource(link, section.titulo));
        }

        for (const mod of section.modulos) {
          if (IGNORED_TYPES.has(mod.tipo)) continue;

          const recurso = await buildResource(page, mod);
          agregar(recurso);
        }

        if (recursos.length > 0) {
          secciones.push({ titulo: section.titulo, resumen: section.resumen, recursos });
        }
      }

      const totalRecursos = secciones.reduce((sum, s) => sum + s.recursos.length, 0);
      log(`  ${curso.nombre}: ${secciones.length} secciones, ${totalRecursos} recursos`);

      const ficha = fichaPorId.get(String(curso.id)) || null;

      materias.push({
        ...curso,
        codigo: ficha?.codigo || '',
        periodo: ficha?.periodo || '',
        imagen: ficha?.imagen || '',
        imagenRequiereSesion: Boolean(ficha?.imagenRequiereSesion),
        secciones,
        enlacesVivos,
        totalRecursos,
      });
    }

    onProgress?.({ done: cursos.length, total: cursos.length, curso: null });

    return {
      version: CACHE_VERSION,
      timestamp: new Date().toISOString(),
      materias,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Novedades — qué cambió desde la última sync
// ---------------------------------------------------------------------------

// Compara contra el caché anterior y marca lo nuevo. Es la diferencia entre un
// mirror y algo que sirve: el alumno quiere saber qué subió el profe, no releer
// la lista entera.
function diffMaterial(anterior, actual) {
  const conocidos = new Set();

  for (const materia of anterior?.materias || []) {
    for (const seccion of materia.secciones || []) {
      for (const recurso of seccion.recursos || []) conocidos.add(recurso.id);
    }
  }

  // Sin caché previo NADA es novedad: la primera sync marcaría todo el semestre
  // como nuevo y el badge no querría decir nada.
  if (conocidos.size === 0) return [];

  const nuevos = [];

  for (const materia of actual?.materias || []) {
    for (const seccion of materia.secciones || []) {
      for (const recurso of seccion.recursos || []) {
        if (!conocidos.has(recurso.id)) {
          nuevos.push({ materiaId: materia.id, materia: materia.nombre, seccion: seccion.titulo, ...recurso });
        }
      }
    }
  }

  return nuevos;
}

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------

function safeFileName(nombre) {
  return String(nombre || 'archivo').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120);
}

// Sólo archivos hosteados en Moodle. Los de Drive requieren la sesión de Google
// del alumno (verificado: redirigen a accounts.google.com), así que la UI los
// abre en su navegador en vez de prometer una descarga que no puede cumplir.
async function downloadFile({ url, nombre, materiaId }) {
  if (!/pluginfile\.php/.test(String(url || ''))) {
    return { error: 'NOT_DOWNLOADABLE' };
  }

  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;

  if (!user || !pass) return { error: 'NO_CREDENTIALS' };

  const dir = path.join(getDownloadsDir(), String(materiaId || 'general'));
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, safeFileName(nombre));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);

  try {
    const { loginToIVirtual } = require('./scraper');
    const loginError = await loginToIVirtual(page, user, pass);
    if (loginError) return { error: loginError };

    // El archivo se pide con el fetch del contexto para heredar la cookie de
    // sesión: pluginfile.php responde 403 sin ella.
    const response = await context.request.get(url);

    if (!response.ok()) {
      return { error: 'HTTP_' + response.status() };
    }

    const buffer = await response.body();
    fs.writeFileSync(destino, buffer);

    return { ok: true, path: destino, bytes: buffer.length };
  } catch (error) {
    log('descarga falló:', error?.message || error);
    return { error: 'DOWNLOAD_FAILED', message: error?.message || String(error) };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerMaterialHandlers() {
  ipcMain.handle('material:get-cached', async () => {
    const cache = readCache();
    return { ok: true, data: cache };
  });

  ipcMain.handle('material:sync', async (event) => {
    try {
      const anterior = readCache();

      const data = await scrapeMaterial({
        onProgress: (progress) => event.sender.send('material:progress', progress),
      });

      if (data.error) return { ok: false, error: data.error };

      const novedades = diffMaterial(anterior, data);
      const conNovedades = { ...data, novedades };
      writeCache(conNovedades);

      return { ok: true, data: conNovedades };
    } catch (error) {
      log('sync falló:', error?.message || error);
      return { ok: false, error: error?.message || 'No fue posible sincronizar el material.' };
    }
  });

  ipcMain.handle('material:download', async (_event, payload) => downloadFile(payload || {}));

  // Los enlaces externos (Drive, Meet, WhatsApp) van al navegador del sistema:
  // ahí el alumno ya tiene su sesión de Google del ITSON.
  ipcMain.handle('material:open-external', async (_event, url) => {
    if (!/^https?:\/\//i.test(String(url || ''))) return { error: 'INVALID_URL' };
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle('material:open-file', async (_event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return { error: 'NOT_FOUND' };
    await shell.openPath(filePath);
    return { ok: true };
  });
}

module.exports = {
  CACHE_VERSION,
  detectLiveLink,
  inlineLinkToResource,
  diffMaterial,
  downloadFile,
  getCachePath,
  getDownloadsDir,
  parseDriveId,
  readCache,
  registerMaterialHandlers,
  resourceId,
  scrapeMaterial,
  writeCache,
};
