const fs = require('fs');
const path = require('path');
const { app, ipcMain, session } = require('electron');
const { chromium } = require('playwright');
const notificationCenter = require('./notification-center');
const { SPANISH_MONTHS, parseDueDate } = require('../utils/dateParser');
const { isTimeoutError, withTimeout } = require('../utils/withTimeout');
const { buildInstructorIndex, lookupInstructor } = require('../utils/instructorLookup');
// require perezoso del handler de horario para no forzar dependencia circular
// en la carga inicial de main.js.
function readHorarioCacheLazy() {
  try {
    return require('./horario').readHorarioCache();
  } catch (_error) {
    return null;
  }
}

const LOGIN_URL = 'https://ivirtual.itson.edu.mx/login/index.php';
const DASHBOARD_URL = 'https://ivirtual.itson.edu.mx/my/';
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Versión del FORMATO de la caché de actividades. El TTL responde "¿está
// vieja?"; esto responde "¿la generó un código que producía campos distintos?".
// Una caché de versión anterior se descarta y se vuelve a extraer una sola vez,
// aunque el TTL no haya vencido.
//
// SUBIR ESTE NÚMERO al agregar o cambiar campos de la actividad. Si no, el
// usuario que ya tenía caché no ve la función nueva hasta que expire el TTL y
// parece que no funciona.
//
// 1 → formato original.
// 2 → campo `puedeEntregar`, que habilita el apartado de entrega en la card.
// 3 → `enlaces`, `tablas`, `rubrica`, `instruccionesMarkdown` y el estado de
//     ventana (`ventana`/`bloqueo`) que reemplaza la heurística de "cerrada".
// 4 → `submissionState` completo en la actividad, `equipo` saneado (Moodle
//     imprime "()" cuando no hay grupo) y cierre deducido del botón de entrega.
const ACTIVITIES_CACHE_SCHEMA_VERSION = 6;
const PAGE_TIMEOUT_MS = 20_000;
const DASHBOARD_NAVIGATION_TIMEOUT_MS = 45_000;
const COURSE_NAVIGATION_TIMEOUT_MS = 30_000;
const ACTIVITY_NAVIGATION_TIMEOUT_MS = 20_000;
const CHUNK_TIMEOUT_MS = 25_000;
const GLOBAL_SCRAPE_TIMEOUT_MS = 5 * 60 * 1000;
// Actividades cuyos detalles se leen en paralelo. Medido: con 3 el escaneo
// hacía 3 tandas secuenciales para 9 actividades y el detalle se llevaba 42%
// del tiempo. 5 es un equilibrio entre velocidad y no martillar el portal.
const CHUNK_SIZE = 5;
// Materias cuyo índice de actividades se lista en paralelo. Antes se recorrían
// una por una con la MISMA página, y eso costaba el 28% del escaneo esperando
// navegaciones que no dependen entre sí.
const LIST_CONCURRENCY = 5;
// Se bloquea todo lo que no cambia el DOM. `stylesheet` entra porque el scraper
// lee estructura, nunca estilos: descargarlos sólo agrega latencia a cada
// navegación. `script` NO se bloquea: Moodle monta el filemanager y parte del
// contenido por JS.
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet']);

function mapSameSite(sameSite) {
  if (sameSite === 'Strict') {
    return 'strict';
  }

  if (sameSite === 'Lax') {
    return 'lax';
  }

  if (sameSite === 'None') {
    return 'no_restriction';
  }

  return 'unspecified';
}

function normalizeWhitespace(value) {
  return (value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

async function processInChunks(items, chunkSize, asyncFn) {
  const results = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    const chunkResults = await Promise.all(chunk.map(asyncFn));
    results.push(...chunkResults);
  }

  return results;
}

function isNetworkError(error) {
  const message = error?.message || '';

  // ERR_ABORTED lo produce nuestro propio resource blocking — no es "sin
  // internet" y clasificarlo así puede borrar caché válida (mismo carve-out
  // que horario.js/calendario.js).
  if (/ERR_ABORTED/i.test(message)) {
    return false;
  }

  return /net::|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT/i.test(
    message,
  );
}

async function gotoWithRetry(page, url, options = {}, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;

      if (isNetworkError(error)) {
        const networkFailure = new Error('NO_INTERNET');
        networkFailure.result = buildScrapeError('NO_INTERNET');
        throw networkFailure;
      }

      if (!isTimeoutError(error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}

async function applyResourceBlocking(page) {
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();

    if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      route.abort();
      return;
    }

    route.continue();
  });
}

async function createDetailPages(context, count) {
  const pages = [];

  for (let index = 0; index < count; index += 1) {
    const detailPage = await context.newPage();
    detailPage.setDefaultTimeout(PAGE_TIMEOUT_MS);
    await applyResourceBlocking(detailPage);
    pages.push(detailPage);
  }

  return pages;
}

async function closePages(pages = []) {
  await Promise.all(pages.map((page) => page.close().catch(() => {})));
}

function getActivitiesCachePath() {
  return path.join(app.getPath('userData'), 'actividades-cache.json');
}

function discardActivitiesCache(cachePath) {
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

function readActivitiesCache() {
  const cachePath = getActivitiesCachePath();

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

    if (
      !parsed ||
      typeof parsed.timestamp !== 'number' ||
      !Array.isArray(parsed.actividades)
    ) {
      discardActivitiesCache(cachePath);
      return null;
    }

    // Cachés sin versión son anteriores al versionado: se tratan como v1.
    const cachedVersion = Number.isInteger(parsed.schemaVersion) ? parsed.schemaVersion : 1;

    if (cachedVersion !== ACTIVITIES_CACHE_SCHEMA_VERSION) {
      console.log(
        `[scraper] Caché de actividades en formato v${cachedVersion}, el código genera v${ACTIVITIES_CACHE_SCHEMA_VERSION}: se descarta y se vuelve a extraer.`,
      );
      discardActivitiesCache(cachePath);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[scraper] Error leyendo caché de actividades:', error?.message || error);
    discardActivitiesCache(cachePath);
    return null;
  }
}

function writeActivitiesCache(activities) {
  const cachePayload = {
    timestamp: Date.now(),
    actividades: activities,
    schemaVersion: ACTIVITIES_CACHE_SCHEMA_VERSION,
  };

  fs.writeFileSync(
    getActivitiesCachePath(),
    JSON.stringify(cachePayload, null, 2),
    'utf8',
  );

  return cachePayload;
}

function clearActivitiesCache() {
  const cachePath = getActivitiesCachePath();

  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }

  return { success: true };
}

// NO borra la caché. Antes sí lo hacía, y todos sus call sites son errores de
// ACCESO —NO_INTERNET, LOGIN_FAILED, NO_CREDENTIALS, NO_USER, NO_PASSWORD, un
// timeout— que dicen "no pude entrar", no "lo cacheado es falso". Un scrape
// fallido dejaba al alumno sin `actividades-cache.json`, que es de donde viven
// actividades, agenda, materias, búsqueda y novedades.
//
// En la app el daño se disimulaba porque el alumno está mirando y vuelve a
// sincronizar. Por MCP no hay nadie: la sesión se queda ciega, en silencio y
// sin la app abierta para recuperarse. Para limpiar a propósito está
// `scraper:clear-cache`.
function buildScrapeError(message) {
  return { error: message };
}

// Estado de la ventana de entrega, que es cosa distinta del estado de MI
// entrega. Antes se mezclaban y cualquier tarea sin botón de entrega cuya
// columna "Submission" dijera "No submission" caía en `cerrada`; eso marcaba
// como cerradas tanto las que todavía no abren como las grupales en las que el
// profesor aún no asignó equipo. "No submission" describe que no he entregado,
// que es exactamente la definición de pendiente.
function resolveSubmissionWindow(submissionState) {
  const now = Date.now();
  const apertura = parseDueDate(submissionState?.fechaApertura);
  const cierre = parseDueDate(submissionState?.fechaCierre);
  const limite = parseDueDate(submissionState?.fechaLimite);

  // Una fecha de corte ya vencida es prueba estructural de cierre: pasado ese
  // instante el portal no acepta entregas ni con prórroga.
  if (cierre !== null && cierre < now) {
    return 'cerrada';
  }

  if (submissionState?.closedByText) {
    return 'cerrada';
  }

  // Vencida Y sin botón de entrega = el portal ya no acepta nada.
  //
  // La mayoría de las actividades del ITSON no publican fecha de corte, así que
  // mirar sólo `cierre` dejaba en "retrasada" cosas que llevaban semanas
  // cerradas. El botón es la señal REAL: medido en el portal, "Clase 26" está
  // vencida y CONSERVA el botón (acepta entrega tardía) mientras que "ACT01"
  // está vencida y NO lo tiene.
  //
  // El bloqueo se excluye a propósito: en una grupal sin equipo asignado el
  // botón tampoco está, pero eso no es un cierre — es el profe que todavía no
  // armó los equipos.
  const bloqueada = Boolean(submissionState?.sinEquipo);

  if (!bloqueada && limite !== null && limite < now && submissionState?.hasSubmitAction === false) {
    return 'cerrada';
  }

  if (apertura !== null && apertura > now) {
    return 'no_abierta';
  }

  if (submissionState?.notOpenYet) {
    return 'no_abierta';
  }

  return 'abierta';
}

function classifyAssignment({ dueDate, submission, submissionState }) {
  const lowerSubmission = normalizeWhitespace(submission).toLowerCase();
  const detailText = normalizeWhitespace(submissionState?.statusSummary || submissionState?.bodyText || '').toLowerCase();

  const isDelivered =
    Boolean(submissionState?.deliveredByClass) ||
    Boolean(submissionState?.deliveredByText) ||
    /submitted for grading|assignment was submitted|submitted to grading|submissionstatussubmitted/i.test(lowerSubmission) ||
    /submitted for grading|assignment was submitted|submitted to grading/i.test(detailText);

  // Antes devolvía null y la actividad se descartaba en el pipeline. Se conserva
  // como estado propio: es el insumo del conteo de entregas por materia en
  // Material, y los detalles ya se scrapearon igual, así que guardarla es
  // gratis. Las páginas que muestran pendientes filtran por estado explícito,
  // así que `entregada` no se cuela entre ellas.
  if (isDelivered) {
    return 'entregada';
  }

  const ventana = submissionState?.ventana || resolveSubmissionWindow(submissionState);

  if (ventana === 'cerrada') {
    return 'cerrada';
  }

  // Todavía no abre: no se puede entregar, pero el alumno no perdió nada y la
  // tarea le sigue pendiendo. Enterrarla en "cerradas" la vuelve invisible.
  if (ventana === 'no_abierta') {
    return 'pendiente';
  }

  const parsedDueDate = parseDueDate(dueDate);

  if (parsedDueDate !== null && parsedDueDate < Date.now()) {
    return 'retrasada';
  }

  return 'pendiente';
}

async function loginToIVirtual(page, username, password) {
  await gotoWithRetry(page, LOGIN_URL, {
    timeout: DASHBOARD_NAVIGATION_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: DASHBOARD_NAVIGATION_TIMEOUT_MS }).catch(() => {}),
    page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click(),
  ]);

  const currentUrl = page.url();

  if (currentUrl.includes('/login/')) {
    return buildScrapeError('LOGIN_FAILED');
  }

  return null;
}

async function collectCourses(page) {
  await gotoWithRetry(page, DASHBOARD_URL, {
    timeout: DASHBOARD_NAVIGATION_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });

  const courses = await page.locator('a[href*="/course/view.php?id="]').evaluateAll((links) => {
    const seen = new Set();
    const items = [];

    links.forEach((link) => {
      const name = (link.textContent || '').trim().replace(/\s+/g, ' ');
      const href = link.href;

      if (!name || !href) {
        return;
      }

      const match = href.match(/id=(\d+)/);

      if (!match) {
        return;
      }

      const id = match[1];

      if (seen.has(id)) {
        return;
      }

      seen.add(id);
      items.push({ id, name, url: href });
    });

    return items;
  });

  return courses;
}

async function collectAssignmentsFromCourse(page, course) {
  const indexUrl = `https://ivirtual.itson.edu.mx/mod/assign/index.php?id=${course.id}`;
  await gotoWithRetry(page, indexUrl, {
    timeout: COURSE_NAVIGATION_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });

  return page.evaluate((courseName) => {
    const tableRows = Array.from(document.querySelectorAll('table.generaltable tbody tr'));
    let currentWeek = '';

    return tableRows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
          (cell.textContent || '').trim().replace(/\s+/g, ' '),
        );
        const link = row.querySelector('a[href*="/mod/assign/view.php?id="]');

        if (!link) {
          return null;
        }

        let week = currentWeek;
        let title = '';
        let dueDate = '';
        let submission = '';
        let grade = '';

        if (cells.length >= 5) {
          [week, title, dueDate, submission, grade] = cells;
          currentWeek = week || currentWeek;
        } else if (cells.length === 4) {
          [title, dueDate, submission, grade] = cells;
        }

        return {
          courseName,
          dueDate,
          grade,
          title,
          submission,
          url: link.href,
          week,
        };
      })
      .filter(Boolean);
  }, course.name);
}

// Se ejecuta DENTRO de la página (Playwright la serializa), por eso no puede
// cerrar sobre nada del scope de Node. Vive fuera de `collectAssignmentDetails`
// para poder correrla contra fixtures HTML en scripts/test-extraccion-contenido.cjs.
function extractActivityDetailsFromPage(courseName) {
  const MAX_MARKDOWN_CHARS = 20_000;

  const normalize = (value) =>
    (value || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const collapseInline = (value) => (value || '').replace(/\s+/g, ' ').trim();

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const absoluteUrl = (href) => {
    try {
      return new URL(href, document.baseURI).href;
    } catch (_error) {
      return '';
    }
  };

  const main = document.querySelector('#region-main') || document.body;
  const intro = document.querySelector('#intro');

  // --- Serialización estructurada -----------------------------------------
  // `textContent` aplana el HTML: un <a> queda como texto muerto (se pierde a
  // dónde apuntaba) y una <table> se convierte en una tira de palabras sin
  // separadores. La consigna real suele vivir detrás de ese enlace y la
  // rúbrica siempre es una tabla, así que ambos se extraen con estructura.

  // Texto de una celda conservando lo que `textContent` fusionaría en una tira:
  // saltos de línea, viñetas e imágenes. Se trabaja sobre un clon para no tocar
  // el DOM de la página.
  const cellText = (cell) => {
    const clone = cell.cloneNode(true);

    clone.querySelectorAll('br').forEach((br) => br.replaceWith(document.createTextNode(' / ')));
    clone.querySelectorAll('li').forEach((li) => li.insertBefore(document.createTextNode('• '), li.firstChild));
    // Una celda que solo contiene una imagen quedaba vacía y la columna parecía
    // en blanco: al menos deja constancia de que ahí hay algo.
    clone.querySelectorAll('img').forEach((img) => {
      const label = collapseInline(img.getAttribute('alt') || img.getAttribute('title') || '');
      img.replaceWith(document.createTextNode(label ? `[imagen: ${label}]` : '[imagen]'));
    });

    return collapseInline(clone.textContent || '');
  };

  // Una cabecera hecha de <td> con todo el texto en negrita es lo que produce
  // pegar una tabla desde Word, y es el caso más común en las consignas.
  // Exigir <th> dejaba esas tablas sin cabecera y con una fila vacía arriba.
  const looksLikeHeaderRow = (row) => {
    const cells = Array.from(row?.cells || []);

    if (cells.length < 2) {
      return false;
    }

    if (cells.every((cell) => cell.tagName === 'TH' || cell.getAttribute('scope') === 'col')) {
      return true;
    }

    const withText = cells.filter((cell) => collapseInline(cell.textContent || ''));

    return (
      withText.length >= 2 &&
      withText.every((cell) => {
        const emphasis = cell.querySelector('strong, b');
        return (
          Boolean(emphasis) &&
          collapseInline(emphasis.textContent || '') === collapseInline(cell.textContent || '')
        );
      })
    );
  };

  // Varias filas de cabecera (el caso `rowspan` + `colspan`) se funden columna a
  // columna: markdown no tiene celdas combinadas, así que la única forma de no
  // perder el nivel superior es arrastrarlo al nombre de cada columna.
  const mergeHeaderRows = (rows) => {
    const width = Math.max(0, ...rows.map((row) => row.length));
    const merged = [];

    for (let column = 0; column < width; column += 1) {
      const parts = [];

      rows.forEach((row) => {
        const value = (row[column] || '').trim();

        if (value && !parts.includes(value)) {
          parts.push(value);
        }
      });

      merged.push(parts.join(' · '));
    }

    return merged;
  };

  const tableToData = (table) => {
    const rows = Array.from(table.rows || []);

    if (!rows.length) {
      return null;
    }

    // Rejilla explícita: `colspan`/`rowspan` se expanden a celdas reales. Sin
    // esto una cabecera con rowspan corre la fila siguiente un lugar y cada
    // dato queda bajo la columna equivocada — no se ve roto, se lee mal, que es
    // peor.
    const taken = new Set();
    const grid = [];

    rows.forEach((row, rowIndex) => {
      if (!grid[rowIndex]) {
        grid[rowIndex] = [];
      }

      let column = 0;

      Array.from(row.cells || []).forEach((cell) => {
        while (taken.has(`${rowIndex}:${column}`)) {
          column += 1;
        }

        // Los spans se acotan: un `rowspan="9999"` de una tabla mal armada haría
        // crecer la rejilla sin límite dentro del navegador.
        const colspan = Math.min(20, Math.max(1, Number(cell.getAttribute('colspan')) || 1));
        const rowspan = Math.min(50, Math.max(1, Number(cell.getAttribute('rowspan')) || 1));
        const text = cellText(cell);

        for (let dr = 0; dr < rowspan; dr += 1) {
          for (let dc = 0; dc < colspan; dc += 1) {
            const r = rowIndex + dr;
            const c = column + dc;

            if (!grid[r]) {
              grid[r] = [];
            }

            // La celda combinada se repite en cada posición que ocupa: así cada
            // fila sigue siendo legible por sí sola.
            grid[r][c] = text;
            taken.add(`${r}:${c}`);
          }
        }

        column += colspan;
      });
    });

    const width = Math.max(1, ...grid.map((row) => row.length));
    const padded = grid.map((row) => {
      const copy = row.slice();

      for (let c = 0; c < width; c += 1) {
        if (copy[c] === undefined) {
          copy[c] = '';
        }
      }

      return copy.slice(0, width);
    });

    const theadRows = table.tHead ? table.tHead.rows.length : 0;
    const headerCount = theadRows || (looksLikeHeaderRow(rows[0]) ? 1 : 0);
    const titulo = collapseInline(table.caption?.textContent || '');

    if (headerCount > 0 && padded.length > headerCount) {
      return {
        titulo,
        encabezados: mergeHeaderRows(padded.slice(0, headerCount)),
        filas: padded.slice(headerCount),
      };
    }

    return { titulo, encabezados: [], filas: padded };
  };

  const tableToMarkdown = (data) => {
    if (!data) {
      return '';
    }

    const escapeCell = (cell) =>
      String(cell || '')
        .replace(/\|/g, '\\|')
        .replace(/\n+/g, ' ')
        .trim();

    const width = Math.max(1, data.encabezados.length, ...data.filas.map((row) => row.length));
    const toRow = (row) => {
      const copy = row.map(escapeCell);

      while (copy.length < width) {
        copy.push('');
      }

      return `| ${copy.join(' | ')} |`;
    };

    const header = data.encabezados.length ? data.encabezados : new Array(width).fill('');
    const lines = [toRow(header), `|${new Array(width).fill(' --- ').join('|')}|`];
    data.filas.forEach((row) => lines.push(toRow(row)));

    // El <caption> es el nombre que el profe le puso a la tabla; sin él, dos
    // tablas seguidas en la misma consigna son indistinguibles.
    return data.titulo ? `**${data.titulo}**\n${lines.join('\n')}` : lines.join('\n');
  };

  // --- Imágenes -----------------------------------------------------------
  // Una consigna puede ser mayormente visual (diagramas de topología, capturas
  // de la terminal, esquemas). Nada de eso llegaba: `textContent` no ve un <img>
  // y `archivos` solo miraba anclas con texto, así que la imagen desaparecía sin
  // dejar hueco ni aviso.

  // Un data URI grande multiplicado por diez imágenes revienta el JSON de la
  // caché. Los chicos (íconos, logos) sí entran: sirven sin sesión ni red.
  const MAX_DATA_URI_CHARS = 32_000;

  // Moodle mezcla su propia decoración con el contenido: emoticones, íconos de
  // tipo de archivo, espaciadores. Ninguno es material del alumno.
  const isChromeImage = (img) => {
    const src = img.getAttribute('src') || '';

    if (/\/theme\/|\/pix\/(?!user)|emoticon|smiley|spacer\.gif|\/f\/[a-z0-9_-]+$/i.test(src)) {
      return true;
    }

    // Se miden los atributos y no `naturalWidth`: al extraer se bloquean las
    // imágenes por red, así que nunca terminan de cargar y `naturalWidth` es 0
    // para todas — descartaría el contenido real junto con los íconos.
    const width = Number(img.getAttribute('width')) || 0;
    const height = Number(img.getAttribute('height')) || 0;

    return width > 0 && width <= 24 && height > 0 && height <= 24;
  };

  const imageLabel = (img) =>
    collapseInline(img.getAttribute('alt') || img.getAttribute('title') || '');

  const imageUrl = (img) => {
    const src = (img.getAttribute('src') || '').trim();

    if (!src) {
      return '';
    }

    if (src.startsWith('data:')) {
      return src.length <= MAX_DATA_URI_CHARS ? src : '';
    }

    return absoluteUrl(src);
  };

  const collectImages = (root) => {
    if (!root) {
      return [];
    }

    const seen = new Set();

    return Array.from(root.querySelectorAll('img'))
      .filter((img) => !isChromeImage(img))
      .map((img) => {
        const url = imageUrl(img);
        const anchor = img.closest('a[href]');
        const enlace = anchor ? absoluteUrl(anchor.getAttribute('href') || '') : '';

        return {
          url,
          alt: collapseInline(img.getAttribute('alt') || ''),
          titulo: collapseInline(img.getAttribute('title') || ''),
          // Moodle suele mostrar una miniatura envuelta en un <a> al original.
          // Sin guardarlo, el alumno se queda con la versión chica.
          original: enlace && enlace !== url ? enlace : '',
          ancho: Number(img.getAttribute('width')) || null,
          alto: Number(img.getAttribute('height')) || null,
          // Un pluginfile necesita la cookie de sesión para cargar; el renderer
          // la tiene porque el scraper sincroniza cookies con la sesión de
          // Electron, pero conviene que la UI sepa distinguirlas.
          requiereSesion: /pluginfile\.php/.test(url),
        };
      })
      .filter((image) => {
        if (!image.url || seen.has(image.url)) {
          return false;
        }

        seen.add(image.url);
        return true;
      });
  };

  const BLOCK_CHILD = /^(P|DIV|UL|OL|DL|TABLE|SECTION|ARTICLE|BLOCKQUOTE|PRE|FIGURE|DETAILS|HR|H[1-6])$/;

  const markdownFromNode = (root) => {
    if (!root) {
      return '';
    }

    const out = [];

    const inline = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.nodeValue || '').replace(/\s+/g, ' ');
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName;

      if (tag === 'SCRIPT' || tag === 'STYLE') {
        return '';
      }

      if (tag === 'BR') {
        return '\n';
      }

      // Antes de recorrer hijos: un <img> no tiene ninguno, así que caía al
      // `inner` vacío y se descartaba en silencio.
      if (tag === 'IMG') {
        if (isChromeImage(node)) {
          return '';
        }

        const url = imageUrl(node);
        const label = imageLabel(node) || 'imagen';

        // Una imagen incrustada demasiado grande para viajar en la caché deja
        // su descripción: el alumno tiene que enterarse de que ahí había algo.
        return url ? `![${label}](${url})` : `*[imagen incrustada: ${label}]*`;
      }

      const inner = Array.from(node.childNodes).map(inline).join('');

      if (tag === 'A') {
        const href = absoluteUrl(node.getAttribute('href') || '');
        const label = collapseInline(inner);

        if (!href) {
          return label;
        }

        if (!label || label === href) {
          return href;
        }

        return `[${label}](${href})`;
      }

      const trimmed = inner.trim();

      if (!trimmed) {
        return '';
      }

      if (tag === 'STRONG' || tag === 'B') {
        return `**${trimmed}**`;
      }

      if (tag === 'EM' || tag === 'I') {
        return `*${trimmed}*`;
      }

      if (tag === 'CODE') {
        return `\`${trimmed}\``;
      }

      // En una materia técnica el exponente ES el dato: "2^32 direcciones" y
      // "2 32 direcciones" no dicen lo mismo, y aplanado no hay forma de saber
      // cuál era.
      if (tag === 'SUP') {
        return `^${trimmed}`;
      }

      if (tag === 'SUB') {
        return `_${trimmed}`;
      }

      if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') {
        return `~~${trimmed}~~`;
      }

      return inner;
    };

    // Las listas se arman aparte porque una sublista dentro de un <li> hay que
    // sacarla ANTES de leer el texto del ítem: si no, `inline()` la aplana
    // dentro del renglón del padre y el nivel entero desaparece.
    const listToMarkdown = (list, depth) => {
      const ordered = list.tagName === 'OL';
      const start = Number(list.getAttribute('start')) || 1;
      const lines = [];

      Array.from(list.children)
        .filter((child) => child.tagName === 'LI')
        .forEach((item, index) => {
          const sublists = Array.from(item.children).filter(
            (child) => child.tagName === 'UL' || child.tagName === 'OL',
          );
          const clone = item.cloneNode(true);

          Array.from(clone.children)
            .filter((child) => child.tagName === 'UL' || child.tagName === 'OL')
            .forEach((child) => child.remove());

          const text = collapseInline(inline(clone));

          if (text) {
            lines.push(`${'  '.repeat(depth)}${ordered ? `${start + index}.` : '-'} ${text}`);
          }

          sublists.forEach((sublist) => {
            const nested = listToMarkdown(sublist, depth + 1);

            if (nested) {
              lines.push(nested);
            }
          });
        });

      // Un solo \n entre ítems: separados por la distancia de bloque (\n\n)
      // cada punto se leía como un párrafo suelto y dejaba de parecer una lista.
      return lines.join('\n');
    };

    const block = (node, depth, sink) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = collapseInline(node.nodeValue || '');

        if (text) {
          sink.push(text);
        }

        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const tag = node.tagName;

      if (tag === 'SCRIPT' || tag === 'STYLE') {
        return;
      }

      if (/^H[1-6]$/.test(tag)) {
        const text = collapseInline(inline(node));

        if (text) {
          sink.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
        }

        return;
      }

      if (tag === 'UL' || tag === 'OL') {
        const markdown = listToMarkdown(node, depth);

        if (markdown) {
          sink.push(markdown);
        }

        return;
      }

      // Listas de definición: el profe las usa para el glosario de la consigna.
      // No estaban contempladas en ninguna rama, así que el bloque entero se
      // perdía sin dejar rastro.
      if (tag === 'DL') {
        const lines = [];

        Array.from(node.children).forEach((child) => {
          const text = collapseInline(inline(child));

          if (!text) {
            return;
          }

          if (child.tagName === 'DT') {
            lines.push(`**${text}**`);
          } else if (child.tagName === 'DD') {
            lines.push(`: ${text}`);
          }
        });

        if (lines.length) {
          sink.push(lines.join('\n'));
        }

        return;
      }

      // El único lugar donde el salto de línea ES el dato: comandos, salidas de
      // consola, código. `inline()` los colapsaba a un renglón y "ping ... /
      // ipconfig /all" quedaba como un comando inexistente.
      if (tag === 'PRE') {
        const code = (node.textContent || '').replace(/\r/g, '').replace(/\s+$/, '');

        if (code.trim()) {
          sink.push(`\`\`\`\n${code}\n\`\`\``);
        }

        return;
      }

      if (tag === 'BLOCKQUOTE') {
        const inner = renderInto(node, depth).join('\n\n');

        if (inner.trim()) {
          sink.push(
            inner
              .split('\n')
              .map((line) => `> ${line}`.trimEnd())
              .join('\n'),
          );
        }

        return;
      }

      // Un <details> cerrado esconde contenido en pantalla pero no en el DOM:
      // sin tratarlo, el texto del resumen y el del cuerpo salían pegados y sin
      // señal de que uno titulaba al otro.
      if (tag === 'DETAILS') {
        const summary = node.querySelector('summary');
        const title = summary ? collapseInline(inline(summary)) : '';
        const body = Array.from(node.children).filter((child) => child.tagName !== 'SUMMARY');

        if (title) {
          sink.push(`**${title}**`);
        }

        body.forEach((child) => block(child, depth, sink));
        return;
      }

      if (tag === 'HR') {
        sink.push('---');
        return;
      }

      if (tag === 'TABLE') {
        const markdown = tableToMarkdown(tableToData(node));

        if (markdown) {
          sink.push(markdown);
        }

        return;
      }

      if (tag === 'BR') {
        return;
      }

      const hasBlockChild = Array.from(node.childNodes).some(
        (child) => child.nodeType === Node.ELEMENT_NODE && BLOCK_CHILD.test(child.tagName),
      );

      if (hasBlockChild) {
        Array.from(node.childNodes).forEach((child) => block(child, depth + 1, sink));
        return;
      }

      const text = inline(node)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');

      if (text) {
        sink.push(text);
      }
    };

    const renderInto = (parent, depth) => {
      const sink = [];
      Array.from(parent.childNodes).forEach((child) => block(child, depth, sink));
      return sink;
    };

    out.push(...renderInto(root, 0));

    return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_MARKDOWN_CHARS);
  };

  const classifyLink = (url) => {
    const lower = (url || '').toLowerCase();

    if (/drive\.google\.com|docs\.google\.com|forms\.gle/.test(lower)) {
      return 'google';
    }

    if (/youtube\.com|youtu\.be|vimeo\.com/.test(lower)) {
      return 'video';
    }

    if (/ivirtual\.itson\.edu\.mx|itson\.edu\.mx/.test(lower)) {
      return 'itson';
    }

    return 'externo';
  };

  const collectLinks = (root) => {
    if (!root) {
      return [];
    }

    const seen = new Set();

    return Array.from(root.querySelectorAll('a[href]'))
      .map((anchor) => {
        const raw = (anchor.getAttribute('href') || '').trim();
        const url = absoluteUrl(raw);
        const texto = collapseInline(anchor.textContent || '');

        return { raw, texto: texto || url, url, tipo: classifyLink(url) };
      })
      .filter((link) => {
        // El descarte se decide sobre el href crudo: tras absolutizar, un ancla
        // "#seccion" se convierte en una URL completa y pasaría el filtro.
        if (!link.url || /^(javascript:|mailto:|tel:|#)/i.test(link.raw)) {
          return false;
        }

        // Los adjuntos ya viajan en `archivos`; repetirlos como enlace externo
        // duplicaría la misma acción con dos affordances distintas.
        if (link.url.includes('pluginfile.php')) {
          return false;
        }

        if (seen.has(link.url)) {
          return false;
        }

        seen.add(link.url);
        return true;
      })
      .map(({ raw: _raw, ...link }) => link);
  };

  // Un video de YouTube incrustado o un audio de la clase no son anclas: viven
  // en <iframe>/<video>/<audio> y `collectLinks` no los ve. Para el alumno son
  // exactamente igual de importantes que un enlace.
  const collectEmbeds = (root) => {
    if (!root) {
      return [];
    }

    const seen = new Set();

    return Array.from(root.querySelectorAll('iframe[src], video[src], audio[src], video source[src], audio source[src]'))
      .map((node) => {
        const url = absoluteUrl(node.getAttribute('src') || '');
        const owner = node.tagName === 'SOURCE' ? node.parentElement : node;
        const texto =
          collapseInline(node.getAttribute('title') || '') ||
          (owner?.tagName === 'AUDIO' ? 'Audio incrustado' : '') ||
          (owner?.tagName === 'VIDEO' ? 'Video incrustado' : '') ||
          'Contenido incrustado';

        return { texto, url, tipo: classifyLink(url) === 'externo' ? 'embebido' : classifyLink(url) };
      })
      .filter((embed) => {
        if (!embed.url || /^(about:|javascript:|data:)/i.test(embed.url) || seen.has(embed.url)) {
          return false;
        }

        seen.add(embed.url);
        return true;
      });
  };

  const collectTables = (root) => {
    if (!root) {
      return [];
    }

    return Array.from(root.querySelectorAll('table'))
      .map((table) => {
        const data = tableToData(table);

        if (!data) {
          return null;
        }

        return { ...data, markdown: tableToMarkdown(data) };
      })
      .filter((table) => table && table.filas.length > 0);
  };

  // --- Rúbrica ------------------------------------------------------------
  // Vive fuera de #intro: Moodle la renderiza en su propio bloque de criterios
  // de calificación. Nunca se extraía, y es la información que dice qué puntos
  // dan por qué.
  const RUBRIC_HEADING = /criterios de calificaci[oó]n|grading (criteria|guide)|r[uú]brica|rubric/i;

  const RUBRIC_CONTAINER = '.gradingform_rubric, .gradingform_guide, .advancedgrading';

  const isUsableRubricTable = (table) => {
    if (!table) {
      return false;
    }

    // La tabla de estado de la entrega no es una rúbrica.
    if (table.classList.contains('submissionstatustable')) {
      return false;
    }

    // NO se descarta por estar DENTRO de un `.submissionstatustable`. En el
    // portal real la rúbrica se renderiza dentro de ese contenedor
    // (div.submissionstatustable > div.gradingform_rubric > table.criteria),
    // así que el `closest` que había acá tiraba justo lo que se quería
    // extraer: en la Asignación 02 son 7.500 caracteres de criterios, el
    // bloque de contenido más grande de la página. Solo se descarta cuando la
    // tabla de estado es un ancestro REAL de tipo tabla y la candidata no está
    // marcada como rúbrica.
    if (!table.closest(RUBRIC_CONTAINER) && table.closest('table.submissionstatustable')) {
      return false;
    }

    return (
      (table.rows?.length || 0) >= 2 &&
      Array.from(table.rows).some((row) => (row.cells?.length || 0) >= 2)
    );
  };

  // La rúbrica de Moodle no es una tabla plana: cada `tr.criterion` tiene una
  // celda de descripción y OTRA TABLA con los niveles, y cada nivel guarda su
  // definición y su puntaje en divs distintos. El conversor genérico mete los
  // cuatro niveles con sus puntos en una sola celda de miles de caracteres.
  const parseMoodleRubric = (table) => {
    const criterios = Array.from(table.querySelectorAll('tr.criterion'));

    if (!criterios.length) {
      return null;
    }

    const filas = criterios.map((row) => {
      const descripcion = collapseInline(row.querySelector('.description')?.textContent || '');
      const niveles = Array.from(row.querySelectorAll('td.level')).map((level) => {
        // Los saltos de línea de la definición separan los incisos a), b), c)…
        // `collapseInline` los pegaría en un párrafo corrido ilegible, y una
        // celda de markdown no admite saltos: se usa un separador visible.
        const definicion = (level.querySelector('.definition')?.textContent || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join(' · ');
        const puntos = collapseInline(level.querySelector('.scorevalue')?.textContent || '');

        return puntos ? `${definicion} (${puntos} pts)` : definicion;
      });

      return [descripcion, ...niveles];
    });

    const anchoNiveles = Math.max(0, ...filas.map((fila) => fila.length - 1));

    if (!anchoNiveles) {
      return null;
    }

    return {
      encabezados: ['Criterio'].concat(
        Array.from({ length: anchoNiveles }, (_unused, index) => `Nivel ${index + 1}`),
      ),
      filas,
    };
  };

  const findRubric = () => {
    const direct = main.querySelector(
      'table.gradingform_rubric, .gradingform_rubric table, .gradingform_guide table, .advancedgrading table',
    );

    if (isUsableRubricTable(direct)) {
      return { titulo: 'Criterios de calificación', table: direct };
    }

    const headings = Array.from(
      main.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, summary, caption, strong'),
    ).filter((heading) => RUBRIC_HEADING.test(heading.textContent || ''));

    for (const heading of headings) {
      let node = heading;

      for (let hop = 0; hop < 4 && node; hop += 1) {
        let sibling = node.nextElementSibling;

        while (sibling) {
          const table =
            sibling.tagName === 'TABLE' ? sibling : sibling.querySelector && sibling.querySelector('table');

          if (isUsableRubricTable(table)) {
            return { titulo: collapseInline(heading.textContent) || 'Criterios de calificación', table };
          }

          sibling = sibling.nextElementSibling;
        }

        node = node.parentElement;
      }
    }

    return null;
  };

  const rubricMatch = findRubric();
  const rubrica = rubricMatch
    ? (() => {
        // La rúbrica nativa de Moodle primero; el conversor genérico queda para
        // las rúbricas que el profe arma como tabla común en la consigna.
        const data = parseMoodleRubric(rubricMatch.table) || tableToData(rubricMatch.table);

        if (!data) {
          return null;
        }

        return {
          titulo: rubricMatch.titulo,
          encabezados: data.encabezados,
          filas: data.filas,
          markdown: tableToMarkdown(data),
        };
      })()
    : null;

  // --- Texto base ---------------------------------------------------------
  const introText = normalize(intro?.textContent || '');
  const introMarkdown = markdownFromNode(intro);
  const bodyText = normalize(document.body?.textContent || '');
  const enlaces = collectLinks(intro).concat(collectEmbeds(intro));
  const tablas = collectTables(intro);
  const imagenes = collectImages(intro);

  // El nombre del archivo se cae al href cuando el ancla no tiene texto: Moodle
  // publica adjuntos envueltos en un ícono o una miniatura, y exigir texto los
  // descartaba enteros. Un adjunto perdido es una consigna perdida.
  const filenameFromUrl = (url) => {
    try {
      const last = new URL(url).pathname.split('/').pop() || '';
      return decodeURIComponent(last);
    } catch (_error) {
      return '';
    }
  };

  const attachments = Array.from(main.querySelectorAll('a[href*="pluginfile.php"]'))
    .map((anchor) => {
      const image = anchor.querySelector('img');

      return {
        name:
          (anchor.textContent || '').trim() ||
          (image ? imageLabel(image) : '') ||
          filenameFromUrl(anchor.href),
        url: anchor.href,
      };
    })
    .filter(
      (file) =>
        file.name &&
        file.url &&
        file.url.includes('pluginfile.php') &&
        !file.url.includes('/user/') &&
        !file.url.includes('/theme/'),
    );

  const uniqueAttachments = attachments.filter(
    (file, index, array) => index === array.findIndex((entry) => entry.url === file.url),
  );

  const statusTableText = normalize(document.querySelector('.submissionstatustable')?.textContent || '');

  // Cuándo se entregó y con qué archivo. Se lee por el RÓTULO de cada fila y no
  // por posición: el orden cambia según si la actividad es grupal o ya tiene
  // calificación. El portal real no rotula "Time submitted" sino "Last
  // modified" (verificado contra iVirtual), así que se aceptan las dos formas.
  const statusRows = (() => {
    const table = document.querySelector('table.submissionstatustable, .submissionstatustable table');
    return table ? Array.from(table.rows || []) : [];
  })();

  const findStatusRow = (pattern) =>
    statusRows.find((row) => pattern.test(collapseInline(row.cells?.[0]?.textContent || '').toLowerCase())) || null;

  const fechaEntrega = (() => {
    const row = findStatusRow(/time submitted|last modified|[uú]ltima modificaci[oó]n|fecha de entrega|enviado el/);
    return row ? collapseInline(row.cells?.[1]?.textContent || '') || null : null;
  })();

  // Los archivos que YO subí — distinto de `archivos`, que son los adjuntos que
  // publicó el profe en la consigna.
  const entregaArchivos = (() => {
    const row = findStatusRow(/file submissions|archivos enviados|entrega de archivo/);

    if (!row) {
      return [];
    }

    return Array.from(row.querySelectorAll('a[href]'))
      .map((anchor) => ({
        name: collapseInline(anchor.textContent || ''),
        url: anchor.href,
      }))
      .filter((file) => file.name && file.url);
  })();

  const deliveredByClass = Boolean(document.querySelector('.submissionstatussubmitted'));
  const deliveredByText = /submitted for grading|assignment was submitted|submitted to grading/i.test(
    statusTableText,
  );

  // --- Estado de la ventana de entrega ------------------------------------
  // Se evalúa sobre las regiones que hablan de la entrega (estado, avisos,
  // fechas), no sobre el body completo: cualquier palabra suelta del menú o
  // del pie cerraba actividades abiertas.
  const windowText = normalize(
    [
      statusTableText,
      ...Array.from(
        main.querySelectorAll('.alert, .activity-dates, .activity-information, .box.generalbox, .description-inner'),
      ).map((node) => node.textContent || ''),
    ].join('\n'),
  );

  const OPENS_LATER =
    /(this assignment will accept submissions from|esta tarea aceptar[aá] entregas|la entrega estar[aá] disponible|a[uú]n no est[aá] disponible|no est[aá] disponible hasta)/i;
  const CLOSED_WINDOW =
    /(submission is not open|no se permiten m[aá]s env[ií]os|esta tarea est[aá] cerrada|submissions? (are|is) closed|no submissions? allowed)/i;
  const NO_GROUP =
    /(you are not a member of any group|not a member of any group|no eres miembro de ning[uú]n grupo|usted no es miembro de ning[uú]n grupo|no perteneces a ning[uú]n grupo|sin grupo asignado)/i;

  const notOpenYet = OPENS_LATER.test(windowText);
  const closedByText = !notOpenYet && CLOSED_WINDOW.test(windowText);
  const sinEquipo = NO_GROUP.test(windowText) || NO_GROUP.test(bodyText);

  const submitActions = Array.from(
    document.querySelectorAll('button, input[type="submit"], input[type="button"], a'),
  ).map((element) => {
    const label = normalize(
      [element.textContent, element.value, element.getAttribute('aria-label'), element.getAttribute('title')]
        .filter(Boolean)
        .join(' '),
    );
    const disabled =
      Boolean(element.disabled) ||
      element.getAttribute('disabled') !== null ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.classList.contains('disabled');
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      disabled,
      label,
      visible:
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0,
    };
  });
  const hasSubmitAction = submitActions.some(
    (action) =>
      action.visible &&
      !action.disabled &&
      /add submission|submit assignment|enviar tarea|entregar/i.test(action.label),
  );
  const hasDisabledSubmitAction = submitActions.some(
    (action) =>
      /add submission|submit assignment|enviar tarea|entregar/i.test(action.label) &&
      action.disabled,
  );
  const detailRows = Array.from(main.querySelectorAll('table tr'));
  const detailLines = bodyText.split('\n').map((line) => normalize(line)).filter(Boolean);

  const extractDetailValue = (labels) => {
    for (const row of detailRows) {
      const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
        normalize(cell.textContent || ''),
      );

      if (!cells.length) {
        continue;
      }

      const rowText = cells.join(' ');

      for (const label of labels) {
        const labelLower = label.toLowerCase();
        const labelIndex = cells.findIndex((cell) => cell.toLowerCase().includes(labelLower));

        if (labelIndex !== -1) {
          const sameCell = cells[labelIndex]
            .replace(new RegExp(escapeRegExp(label), 'i'), '')
            .replace(/^[:\-–—]\s*/, '')
            .trim();

          if (sameCell) {
            return sameCell;
          }

          const nextCell = cells.slice(labelIndex + 1).find(Boolean);

          if (nextCell) {
            return nextCell;
          }
        }

        const rowMatch = rowText.match(
          new RegExp(`${escapeRegExp(label)}\\s*[:\\-–—]?\\s*(.+)$`, 'i'),
        );

        if (rowMatch) {
          const value = normalize(rowMatch[1]);

          if (value) {
            return value;
          }
        }
      }
    }

    for (let index = 0; index < detailLines.length; index += 1) {
      const line = detailLines[index];

      for (const label of labels) {
        if (line.toLowerCase().includes(label.toLowerCase())) {
          const inlineValue = line
            .replace(new RegExp(`.*?${escapeRegExp(label)}\\s*[:\\-–—]?\\s*`, 'i'), '')
            .trim();

          if (inlineValue) {
            return inlineValue;
          }

          const nextLine = detailLines[index + 1];

          if (nextLine) {
            return nextLine;
          }
        }
      }
    }

    return null;
  };

  const combinedModalidadText = normalize([bodyText, introText, statusTableText].join('\n')).toLowerCase();
  const modalidad = /(entrega en grupo|group submission|es una tarea grupal|team submission|submission in groups|trabajo en equipo|tarea grupal)/i.test(
    combinedModalidadText,
  )
    ? 'equipo'
    : 'individual';
  const fechaPublicacion = extractDetailValue([
    'Disponible desde',
    'Allow submissions from',
    'Fecha de apertura',
  ]);
  // Sólo etiquetas que en Moodle significan cutoffdate sin ambigüedad. NO se
  // busca "Fecha límite" a secas: si un tema del portal etiquetara así la fecha
  // de entrega, toda actividad vencida se leería como cerrada — que es
  // exactamente el bug que esta separación vino a arreglar. Sin cutoff
  // reconocido la actividad cae en `retrasada`, que es el error barato.
  const fechaCierre = extractDetailValue([
    'Fecha límite de entrega',
    'Fecha de corte',
    'Cut-off date',
  ]);
  // Moodle imprime "()" cuando la fila existe pero no hay grupo asignado, y eso
  // llegaba a la UI como "Individual · ()". Sólo cuenta un nombre de grupo real.
  const equipoCrudo = extractDetailValue(['Grupo de la entrega', 'Group', 'Equipo']);
  const equipo = /^[\s()]*$/.test(equipoCrudo || '') ? null : equipoCrudo;

  return {
    archivos: uniqueAttachments,
    bodyText,
    closedByText,
    deliveredByClass,
    deliveredByText,
    enlaces,
    equipo,
    fechaCierre,
    fechaPublicacion,
    entregaArchivos,
    fechaEntrega,
    imagenes,
    introMarkdown,
    introText,
    materia: courseName,
    modalidad,
    hasDisabledSubmitAction,
    hasSubmitAction,
    notOpenYet,
    rubrica,
    sinEquipo,
    statusTableText,
    tablas,
  };
}

async function collectAssignmentDetails(page, assignment) {
  await gotoWithRetry(page, assignment.url, {
    timeout: ACTIVITY_NAVIGATION_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  });

  const details = await page.evaluate(extractActivityDetailsFromPage, assignment.courseName);

  let instructions = normalizeWhitespace(details.introText);
  let instructionsMarkdown = normalizeWhitespace(details.introMarkdown);

  if (details.archivos.length > 0 && instructions) {
    details.archivos.forEach((file) => {
      instructions = instructions.replace(file.name, '').trim();
    });
    instructions = normalizeWhitespace(instructions);
  }

  const stripTimestamps = (value) =>
    normalizeWhitespace(
      (value || '').replace(/\b\d{1,2} [A-Za-z]+ \d{4}, \d{1,2}:\d{2} (?:AM|PM)\b/g, ''),
    );

  instructions = stripTimestamps(instructions);
  instructionsMarkdown = stripTimestamps(instructionsMarkdown) || instructions;

  const ventana = resolveSubmissionWindow({
    closedByText: details.closedByText,
    fechaApertura: details.fechaPublicacion,
    fechaCierre: details.fechaCierre,
    // La fecha límite vive en el índice del curso, no en el detalle: sin
    // pasarla acá el resolver no podía saber si la actividad estaba vencida.
    fechaLimite: assignment?.dueDate,
    // El botón es la prueba de que el portal todavía acepta entregas.
    hasSubmitAction: details.hasSubmitAction,
    notOpenYet: details.notOpenYet,
    sinEquipo: details.sinEquipo,
  });

  // Un bloqueo no cambia el estado de la actividad: sigue pendiente. Solo
  // explica por qué el botón de entrega no está disponible todavía.
  const bloqueo = details.sinEquipo && details.modalidad === 'equipo' ? 'sin_equipo' : null;

  return {
    archivos: details.archivos,
    bloqueo,
    enlaces: details.enlaces || [],
    equipo: details.equipo || null,
    fechaCierre: details.fechaCierre || null,
    entregaArchivos: details.entregaArchivos || [],
    fechaEntrega: details.fechaEntrega || null,
    fechaPublicacion: details.fechaPublicacion || null,
    imagenes: details.imagenes || [],
    modalidad: details.modalidad || 'individual',
    rubrica: details.rubrica || null,
    submissionState: {
      bodyText: details.bodyText,
      closedByText: details.closedByText,
      deliveredByClass: details.deliveredByClass,
      deliveredByText: details.deliveredByText,
      fechaApertura: details.fechaPublicacion,
      fechaCierre: details.fechaCierre,
      hasDisabledSubmitAction: details.hasDisabledSubmitAction,
      hasSubmitAction: details.hasSubmitAction,
      notOpenYet: details.notOpenYet,
      sinEquipo: details.sinEquipo,
      statusSummary: details.statusTableText,
      ventana,
    },
    tablas: details.tablas || [],
    instrucciones: instructions,
    // La variable local está en inglés y la clave del modelo en español: sin el
    // `:` explícito el shorthand referencia un identificador que no existe y
    // tira ReferenceError para CADA actividad.
    instruccionesMarkdown: instructionsMarkdown,
    materia: details.materia,
    ventana,
  };
}

async function syncCookiesToElectronSession(playwrightContext) {
  const cookies = await playwrightContext.cookies();

  await Promise.all(
    cookies.map((cookie) => {
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      const url = `${cookie.secure ? 'https' : 'http'}://${domain}${cookie.path || '/'}`;
      const cookiePayload = {
        domain: cookie.domain,
        httpOnly: cookie.httpOnly,
        name: cookie.name,
        path: cookie.path,
        sameSite: mapSameSite(cookie.sameSite),
        secure: cookie.secure,
        url,
        value: cookie.value,
      };

      if (typeof cookie.expires === 'number' && cookie.expires > 0) {
        cookiePayload.expirationDate = cookie.expires;
      }

      return session.defaultSession.cookies.set(cookiePayload);
    }),
  );
}

// Cronómetro de fases. El escaneo es la operación más lenta de la app y hasta
// ahora no había forma de saber en qué se iba el tiempo: se medía el total y se
// optimizaba a ciegas.
function createTimer() {
  const inicio = Date.now();
  const fases = {};
  let ultimo = inicio;

  return {
    marcar(fase) {
      const ahora = Date.now();
      fases[fase] = (fases[fase] || 0) + (ahora - ultimo);
      ultimo = ahora;
    },
    // Para trabajo concurrente: mide una sección sin mover el cursor de fases
    // secuenciales.
    async medir(fase, tarea) {
      const desde = Date.now();
      try {
        return await tarea();
      } finally {
        fases[fase] = (fases[fase] || 0) + (Date.now() - desde);
        ultimo = Date.now();
      }
    },
    resumen() {
      return { totalMs: Date.now() - inicio, fases };
    },
  };
}

async function scrapeIVirtualActivities(event, controller = {}) {
  const timer = createTimer();
  const username = process.env.IVIRTUAL_USER?.trim();
  const password = process.env.IVIRTUAL_PASS?.trim();

  if (!username && !password) {
    return buildScrapeError('NO_CREDENTIALS');
  }

  if (!username) {
    return buildScrapeError('NO_USER');
  }

  if (!password) {
    return buildScrapeError('NO_PASSWORD');
  }

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    controller.browser = browser;
    const context = await browser.newContext();
    context.setDefaultTimeout(PAGE_TIMEOUT_MS);
    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    timer.marcar('arranqueBrowser');

    const loginResult = await loginToIVirtual(page, username, password);
    timer.marcar('login');

    if (loginResult?.error) {
      return loginResult;
    }

    await applyResourceBlocking(page);
    await syncCookiesToElectronSession(context);
    timer.marcar('cookies');

    const courses = await collectCourses(page);
    timer.marcar('listarCursos');

    if (courses.length === 0) {
      return buildScrapeError('No se encontraron cursos visibles en el dashboard de iVirtual.');
    }

    const activities = [];

    if (event?.sender?.send) {
      event.sender.send('scraper:progress', {
        current: 0,
        total: courses.length,
        curso: courses[0]?.name || '',
      });
    }

    // Fase 1 — listar el índice de cada materia EN PARALELO. Son navegaciones
    // independientes entre sí; hacerlas en fila sólo suma latencias. Se usa una
    // página por materia concurrente porque una página de Playwright no puede
    // navegar a dos sitios a la vez.
    const listPages = await createDetailPages(context, Math.min(LIST_CONCURRENCY, courses.length));

    let assignmentsByCourse;

    try {
      assignmentsByCourse = await timer.medir('listarActividades', () =>
        processInChunks(courses, listPages.length, async (course, indexInChunk) => {
          try {
            return { course, assignments: await collectAssignmentsFromCourse(listPages[indexInChunk], course) };
          } catch (error) {
            // Una materia que no se puede listar no debe tumbar el escaneo
            // entero: se reporta y las demás siguen.
            console.error(`[scraper] no se pudo listar ${course.name}:`, error?.message || error);
            return { course, assignments: [] };
          }
        }));
    } finally {
      await closePages(listPages);
    }

    // Fase 2 — detalles de TODAS las actividades, aplanadas entre materias.
    //
    // Antes se troceaba por materia, así que una con 2 actividades y otra con 4
    // gastaban dos tandas separadas aunque juntas entraran en una sola. Aplanar
    // llena cada tanda hasta CHUNK_SIZE sin importar de qué materia venga.
    const pendientesDeDetalle = assignmentsByCourse.flatMap(({ course, assignments }) =>
      assignments.map((assignment) => ({ course, assignment })));

    // El pool se crea UNA vez y se reusa entre tandas: antes se creaban y
    // cerraban páginas en cada tanda, lo que costaba ~0.7s de puro setup.
    const detailPages = await timer.medir('crearPaginas', () =>
      createDetailPages(context, Math.min(CHUNK_SIZE, Math.max(pendientesDeDetalle.length, 1))));

    // Se agrupa por materia para conservar los ids estables y el log por materia.
    const porMateria = new Map(assignmentsByCourse.map(({ course }) => [course.id, { course, activities: [] }]));
    let procesadas = 0;

    try {
      for (let chunkIndex = 0; chunkIndex < pendientesDeDetalle.length; chunkIndex += CHUNK_SIZE) {
        const chunk = pendientesDeDetalle.slice(chunkIndex, chunkIndex + CHUNK_SIZE);

        const chunkResults = await timer.medir('detallesActividad', () => Promise.all(
          chunk.map(({ course, assignment }, indexInChunk) =>
            withTimeout(
                async () => {
                  try {
                    const details = await collectAssignmentDetails(detailPages[indexInChunk], assignment);
                    const estado = classifyAssignment({
                      dueDate: assignment.dueDate,
                      submission: assignment.submission,
                      submissionState: details.submissionState,
                    });

                    // Sin estado no hay nada que mostrar ni que contar: solo
                    // pasa si el portal devolvió una página que no se pudo
                    // clasificar. Se loguea porque una actividad que desaparece
                    // en silencio es indistinguible de una que se perdió por un
                    // bug.
                    if (!estado) {
                      console.log(`[scraper] sin estado, se omite: ${assignment.title}`);
                      return null;
                    }

                    return {
                      archivos: details.archivos,
                      // No cambia el estado: explica por qué no hay botón de
                      // entrega aunque la actividad esté abierta.
                      bloqueo: details.bloqueo || null,
                      enlaces: details.enlaces || [],
                      equipo: details.equipo || null,
                      estado,
                      fechaCierre: details.fechaCierre || null,
                      fechaLimite: assignment.dueDate || 'Sin fecha visible',
                      fechaPublicacion: details.fechaPublicacion || null,
                      entregaArchivos: details.entregaArchivos || [],
                      fechaEntrega: details.fechaEntrega || null,
                      imagenes: details.imagenes || [],
                      instrucciones: details.instrucciones,
                      instruccionesMarkdown: details.instruccionesMarkdown || details.instrucciones,
                      materia: details.materia,
                      modalidad: details.modalidad || 'individual',
                      nombre: assignment.title,
                      rubrica: details.rubrica || null,
                      tablas: details.tablas || [],
                      ventana: details.ventana || 'abierta',
                      // El portal ya nos dice si acepta entrega ahora: el botón
                      // "Add submission" existe y está habilitado. Una actividad
                      // vencida no lo muestra. Es más confiable que deducirlo de
                      // la fecha límite, que no contempla prórrogas del profe.
                      puedeEntregar: Boolean(details.submissionState?.hasSubmitAction),
                      rawGrade: assignment.grade,
                      rawSubmission: assignment.submission,
                      // Se guarda el estado crudo del portal: sin esto la card
                      // y los diagnósticos veían `undefined` en todos los
                      // campos aunque el scraper sí los hubiera leído.
                      submissionState: details.submissionState,
                      url: assignment.url,
                    };
                  } catch (error) {
                    // Un ReferenceError/TypeError es un BUG NUESTRO, no un
                    // problema del portal, y devolver null lo disfraza de
                    // "actividad que no se pudo leer". Así fue como un typo
                    // dejó el escaneo en cero actividades pareciendo que
                    // iVirtual estaba fallando: se re-lanza para que explote
                    // fuerte en vez de vaciar la lista en silencio.
                    if (error instanceof ReferenceError || error instanceof TypeError) {
                      console.error('[scraper] BUG en la extracción, no es el portal:', error?.stack || error);
                      throw error;
                    }

                    console.error('[scraper] Failed to collect details for:', assignment.url, error?.message);
                    return null;
                  }
                },
                CHUNK_TIMEOUT_MS,
                async () => {
                  // La página que venció se cierra, pero el pool se reusa
                  // entre tandas: se marca perdida para no reutilizarla.
                  await detailPages[indexInChunk]?.close().catch(() => {});
                  detailPages[indexInChunk] = null;
                },
              ),
            ),
          ),
        );

        chunkResults.forEach((activity, indexInChunk) => {
          if (!activity) return;
          porMateria.get(chunk[indexInChunk].course.id)?.activities.push(activity);
        });

        procesadas += chunk.length;

        if (event?.sender?.send) {
          event.sender.send('scraper:progress', {
            current: procesadas,
            total: pendientesDeDetalle.length,
            curso: chunk[chunk.length - 1]?.course?.name || '',
          });
        }
      }
    } finally {
      await closePages(detailPages);
    }

    for (const { course, activities: courseActivities } of porMateria.values()) {
      const listadas = assignmentsByCourse.find((entry) => entry.course.id === course.id)?.assignments.length || 0;
      console.log(`[scraper] ${course.name}: ${listadas} listadas -> ${courseActivities.length} visibles`);

      courseActivities.forEach((activity, indexWithinCourse) => {
        activities.push({
          id: `${activities.length + 1}-${course.id}-${indexWithinCourse + 1}`,
          ...activity,
        });
      });
    }

    // Este filtro es el último embudo antes de la UI: lo que caiga acá
    // desaparece sin dejar rastro. Se cuenta el descarte por motivo porque una
    // actividad que se pierde en silencio es indistinguible de una que el
    // portal no publicó.
    const descartes = { sinNombre: 0, estadoInvalido: 0, nulas: 0 };

    const validActivities = activities.filter((activity) => {
      if (!activity) {
        descartes.nulas += 1;
        return false;
      }

      if (typeof activity.nombre !== 'string' || activity.nombre.trim().length === 0) {
        descartes.sinNombre += 1;
        return false;
      }

      // `entregada` entra a la lista aunque no se muestre en las pestañas de
      // Actividades: la consume Material para contar y listar lo entregado por
      // materia. Este embudo valida que el estado sea CONOCIDO, no que sea
      // visible — decidir visibilidad es de la UI, no del scraper.
      if (!['pendiente', 'retrasada', 'cerrada', 'entregada'].includes(activity.estado)) {
        descartes.estadoInvalido += 1;
        console.warn(`[scraper] descartada por estado "${activity.estado}": ${activity.nombre}`);
        return false;
      }

      return true;
    });

    const totalDescartado = descartes.nulas + descartes.sinNombre + descartes.estadoInvalido;
    if (totalDescartado > 0) {
      console.warn(`[scraper] ${totalDescartado} de ${activities.length} actividades descartadas:`, descartes);
    }

    // Enriquecer con `profesor` desde el cache del horario: iVirtual no expone
    // instructor por assignment, así que la única fuente es PeopleSoft por
    // nombre de materia. Si no hay cache del horario, el campo queda vacío y la
    // card ya sabe ocultar la línea.
    const instructorIndex = buildInstructorIndex(readHorarioCacheLazy());
    const enrichedActivities = validActivities.map((activity) => ({
      ...activity,
      profesor: activity.profesor || lookupInstructor(instructorIndex, { nombre: activity.materia }),
    }));

    const cachePayload = writeActivitiesCache(enrichedActivities);

    // Los PDFs de Drive se resuelven DESPUÉS, y sin await: acá adentro el pool de
    // páginas ya no se repara entre chunks, y el re-throw que debería hacer
    // explotar un error es inoperativo porque withTimeout hace resolve(null) para
    // todo lo que no sea un timeout. Un fetch lento no perdería una actividad:
    // envenenaría un slot del pool y tiraría en silencio una de cada cinco
    // restantes. Además runScrape corre contra GLOBAL_SCRAPE_TIMEOUT_MS y, al
    // vencer, devuelve error SIN escribir la caché.
    require('./drive')
      .resolveLinksForActivities(enrichedActivities)
      .catch((error) => console.error('[scraper] la resolución de Drive falló:', error?.message || error));

    return {
      activities: enrichedActivities,
      // El desglose viaja con el resultado para poder medirlo desde un test y
      // detectar regresiones de TIEMPO, no sólo de correctitud.
      timing: timer.resumen(),
      timestamp: cachePayload.timestamp,
      fromCache: false,
    };
  } catch (error) {
    if (error?.result?.error) {
      return error.result;
    }

    return buildScrapeError(
      error && error.message
        ? `Falló la extracción de iVirtual: ${error.message}`
        : 'Falló la extracción de iVirtual por un error no identificado.',
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

let activeScrapeController = null;
// Promesa del escaneo en curso. Dos llamadores simultáneos comparten el mismo
// resultado en vez de que el segundo reciba un error.
let inFlightScrape = null;

async function getActivitiesWithCache(event, { force = false } = {}) {
  // Coalescing en vez de rechazar. "Sincronizar todo" dispara varias syncs a la
  // vez y la página de Actividades carga al montarse: el segundo llamador
  // recibía "Ya hay un escaneo en progreso" y la UI lo mostraba como error rojo
  // aunque el escaneo estuviera andando bien. Los dos quieren lo mismo, así que
  // esperan el mismo resultado.
  if (inFlightScrape) {
    console.log('[scraper] escaneo ya en curso: se comparte el resultado');
    return inFlightScrape;
  }

  const cached = readActivitiesCache();

  // `force` lo manda una sync que el usuario pidió explícitamente. Sin esto el
  // botón devolvía la caché y no se re-escaneaba nada: apretarlo dos veces
  // dentro de la ventana de caché no traía nada nuevo del portal.
  if (!force && cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    // Re-aplicar el lookup en cada lectura: si la cache es vieja y el horario
    // se sincronizó después, ahora sí hay instructor que propagar.
    const instructorIndex = buildInstructorIndex(readHorarioCacheLazy());
    const activitiesWithProfesor = (cached.actividades || []).map((activity) => ({
      ...activity,
      profesor: activity.profesor || lookupInstructor(instructorIndex, { nombre: activity.materia }),
    }));
    return {
      activities: activitiesWithProfesor,
      timestamp: cached.timestamp,
      fromCache: true,
    };
  }

  const controller = { cancelled: false, browser: null };
  activeScrapeController = controller;
  inFlightScrape = runScrape(event, controller);

  try {
    return await inFlightScrape;
  } finally {
    activeScrapeController = null;
    inFlightScrape = null;
  }
}

// El escaneo en sí, separado para que `getActivitiesWithCache` pueda guardar su
// promesa y compartirla entre llamadores concurrentes.
async function runScrape(event, controller) {
  {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(
        async () => {
          controller.cancelled = true;
          if (controller.browser) {
            await controller.browser.close().catch(() => {});
          }
          resolve(
            buildScrapeError(
              'El escaneo tardó demasiado. iVirtual puede estar lento. Intenta de nuevo.',
            ),
          );
        },
        GLOBAL_SCRAPE_TIMEOUT_MS,
      );
    });

    const scrapePromise = Promise.resolve(scrapeIVirtualActivities(event, controller)).finally(() => {
      clearTimeout(timeoutId);
    });

    const result = await Promise.race([scrapePromise, timeoutPromise]);

    if (result?.error) {
      notificationCenter.processSyncError('actividades', result.error);
    } else if (!result?.fromCache && Array.isArray(result?.activities)) {
      notificationCenter.processSync('actividades', result.activities);
    }

    return result;
  }
}

function registerScraperHandlers() {
  ipcMain.handle('scraper:run', async (event, options) => getActivitiesWithCache(event, options || {}));
  ipcMain.handle('scraper:clear-cache', async () => clearActivitiesCache());
}

module.exports = {
  clearActivitiesCache,
  classifyAssignment,
  extractActivityDetailsFromPage,
  resolveSubmissionWindow,
  getActivitiesCachePath,
  getActivitiesWithCache,
  loginToIVirtual,
  registerScraperHandlers,
  readActivitiesCache,
  scrapeIVirtualActivities,
  writeActivitiesCache,
};
