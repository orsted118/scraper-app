// Generador de prompts para las cards de Actividades.
//
// Junta TODO lo que la app sabe de una actividad — consigna, adjuntos del profe
// (con su texto extraído), material de la materia, datos de la card — y le pide
// a una LLM free tier que redacte un prompt para llevarle a otra IA.
//
// EL PROBLEMA REAL DE ESTE MÓDULO ES EL PRESUPUESTO DE TOKENS.
//
// La consigna sola puede tener 8k caracteres, un adjunto 40k, y el material de
// la materia otro tanto. Mandar todo revienta el contexto del modelo más chico
// del pool y devuelve vacío o cortado. Por eso el contexto se arma con
// PRIORIDAD explícita, no con un concat:
//
//   1. La consigna. Es la fuente de verdad de qué se pide; va entera.
//   2. Los adjuntos del profe. Suelen traer la rúbrica o el formato exigido,
//      así que valen mucho — pero recortados y con aviso de que se recortaron.
//   3. El material de la materia. Casi siempre es contexto de apoyo, así que
//      entra sólo como TÍTULOS. Sirve para que el prompt final pueda decir
//      "apoyate en la presentación X" sin gastar el presupuesto en su contenido.
//
// Lo que no entra se dice explícitamente en el contexto, para que el modelo no
// invente que lo leyó.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, ipcMain } = require('electron');
const { chromium } = require('playwright');
const llm = require('../llm');

// Techos por sección. Suman ~24k chars ≈ 6k tokens de entrada, que deja lugar
// de sobra para los 2000 de respuesta hasta en el modelo más chico del pool.
const MAX_INSTRUCTIONS_CHARS = 8000;
const MAX_ATTACHMENT_CHARS = 6000;
const MAX_TOTAL_ATTACHMENT_CHARS = 12000;
const MAX_MATERIAL_ITEMS = 25;
const MAX_RUBRIC_CHARS = 6000;
const MAX_LINKS = 10;

// Sólo estos dos tienen texto extraíble sin OCR. Mismo criterio que el
// analizador de entregas.
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx']);

// Los adjuntos del profe viven bajo este segmento; las entregas del alumno
// bajo assignsubmission_file.
const INTROATTACHMENT_RE = new RegExp("/mod_assign/introattachment/");

const CACHE_VERSION = 1;

// Qué se le pide a la IA destino. Cambia el prompt generado por completo, así
// que es una elección del usuario y no un ajuste escondido.
const MODES = {
  resolver: {
    label: 'Resolver la actividad',
    objetivo: 'que produzca la entrega completa, lista para revisar y ajustar',
  },
  entender: {
    label: 'Explicar el tema',
    objetivo: 'que explique los conceptos que la actividad exige dominar, con ejemplos, sin resolverla',
  },
  revisar: {
    label: 'Revisar mi borrador',
    objetivo: 'que revise un borrador contra los requisitos de la consigna y señale qué falta',
  },
};

const DEFAULT_MODE = 'resolver';

function log(...args) {
  console.log('[prompt-builder]', ...args);
}

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------

function getCachePath() {
  return path.join(app.getPath('userData'), 'prompt-cache.json');
}

function readCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getCachePath(), 'utf8'));
    return parsed?.version === CACHE_VERSION ? parsed : { version: CACHE_VERSION, prompts: {} };
  } catch (error) {
    if (error?.code !== 'ENOENT') log('error leyendo caché:', error?.message || error);
    return { version: CACHE_VERSION, prompts: {} };
  }
}

function writeCache(cache) {
  try {
    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    // El caché es una conveniencia: si no se puede escribir, el prompt ya se
    // generó igual y no vale perderlo por esto.
    log('no se pudo escribir el caché:', error?.message || error);
  }
}

// ---------------------------------------------------------------------------
// Adjuntos del profe
// ---------------------------------------------------------------------------

// Los adjuntos viven en pluginfile.php y necesitan la cookie de sesión. Se bajan
// a un temporal y se descartan: lo que importa es el texto, no el archivo.
// El scraper guarda `name`, no `nombre`. Leer solo `nombre` hacia que el filtro
// cayera al URL, donde extname devuelve '.pdf?forcedownload=1' y nunca entra en
// SUPPORTED_EXTENSIONS: candidatos salia vacio para el 100% de los datos reales
// y esta funcion nunca llego a correr.
function attachmentName(file) {
  return String(file?.name || file?.nombre || '');
}

function attachmentExtension(file) {
  const desdeNombre = path.extname(attachmentName(file)).toLowerCase();
  if (desdeNombre) return desdeNombre;

  // extname sobre el URL crudo se come la query: hay que quedarse con el path.
  try {
    return path.extname(new URL(String(file?.url || '')).pathname).toLowerCase();
  } catch (_error) {
    return '';
  }
}

// `archivos` NO son solo los adjuntos del profe. El scraper barre todo
// pluginfile.php de la pagina, asi que mezcla mod_assign/introattachment con
// assignsubmission_file: las entregas del propio alumno, 11 de 12 en datos
// reales. Sin este filtro el prompt le pasa al modelo la respuesta del alumno
// bajo el titulo que promete la consigna del profesor.
function isProfessorAttachment(file) {
  return INTROATTACHMENT_RE.test(String(file?.url || ""));
}

async function extractAttachmentTexts(archivos, { onProgress = null } = {}) {
  const candidatos = (archivos || []).filter(
    (file) => isProfessorAttachment(file) && SUPPORTED_EXTENSIONS.has(attachmentExtension(file)),
  );

  if (candidatos.length === 0) return { textos: [], omitidos: [] };

  const user = process.env.IVIRTUAL_USER;
  const pass = process.env.IVIRTUAL_PASS;

  if (!user || !pass) {
    return { textos: [], omitidos: candidatos.map((f) => ({ nombre: attachmentName(f), motivo: 'sin credenciales' })) };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-prompt-'));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  const textos = [];
  const omitidos = [];

  try {
    const { loginToIVirtual } = require('./scraper');
    const loginError = await loginToIVirtual(page, user, pass);

    if (loginError) {
      return { textos: [], omitidos: candidatos.map((f) => ({ nombre: attachmentName(f), motivo: 'no se pudo entrar a iVirtual' })) };
    }

    for (const [index, file] of candidatos.entries()) {
      onProgress?.({ fase: 'adjuntos', done: index, total: candidatos.length, nombre: file.nombre });

      try {
        // context.request hereda la cookie de sesión; sin ella pluginfile da 403.
        const response = await context.request.get(file.url);

        if (!response.ok()) {
          omitidos.push({ nombre: attachmentName(file), motivo: `HTTP ${response.status()}` });
          continue;
        }

        const destino = path.join(tmpDir, `adj-${index}${attachmentExtension(file) || '.pdf'}`);
        fs.writeFileSync(destino, await response.body());

        const { parseSubmission } = require('./activity-analyzer');
        const parsed = await parseSubmission(destino);

        textos.push({ nombre: attachmentName(file), texto: parsed.text, palabras: parsed.wordCount });
      } catch (error) {
        // Un PDF escaneado no tiene texto extraíble. No es un fallo del flujo:
        // se anota para poder decírselo al modelo y que no lo dé por leído.
        omitidos.push({ nombre: attachmentName(file), motivo: error?.message || 'no se pudo leer' });
      }
    }
  } finally {
    await browser.close().catch(() => {});
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return { textos, omitidos };
}

// ---------------------------------------------------------------------------
// Material de la materia
// ---------------------------------------------------------------------------

// Normalización agresiva para casar "Estructuras de Datos" de iVirtual con la
// materia de la card. Mismo criterio que instructorLookup: sin acentos, sin
// puntuación, sin tokens de ruido.
function normalizeSubject(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .trim();
}

// Sólo los TÍTULOS del material, no su contenido: el presupuesto de tokens se
// gasta mejor en la consigna y los adjuntos. Con el título alcanza para que el
// prompt final pueda mandar a la IA a apoyarse en un recurso concreto.
function collectMaterialTitles(materia) {
  let cache = null;

  try {
    const material = require('./material');
    cache = material.readCache();
  } catch (error) {
    log('no se pudo leer el material:', error?.message || error);
    return [];
  }

  if (!cache?.materias) return [];

  const objetivo = normalizeSubject(materia);
  const curso = cache.materias.find((m) => normalizeSubject(m.nombre) === objetivo);

  if (!curso) return [];

  const items = [];

  for (const seccion of curso.secciones || []) {
    for (const recurso of seccion.recursos || []) {
      // Los foros no son material de estudio.
      if (recurso.tipo === 'foro') continue;

      if (recurso.tipo === 'carpeta') {
        for (const archivo of recurso.archivos || []) {
          items.push({ nombre: archivo.nombre, tipo: 'archivo', seccion: seccion.titulo });
        }
        continue;
      }

      items.push({ nombre: recurso.nombre, tipo: recurso.tipo, seccion: seccion.titulo });
    }
  }

  return items.slice(0, MAX_MATERIAL_ITEMS);
}

// ---------------------------------------------------------------------------
// Armado del contexto
// ---------------------------------------------------------------------------

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
}

// Reparte el presupuesto de adjuntos entre los que haya, para que uno gigante no
// deje a los demás afuera.
function budgetAttachments(textos) {
  if (textos.length === 0) return [];

  const porArchivo = Math.min(MAX_ATTACHMENT_CHARS, Math.floor(MAX_TOTAL_ATTACHMENT_CHARS / textos.length));

  return textos.map((item) => {
    const recortado = item.texto.length > porArchivo;

    return {
      nombre: item.nombre,
      texto: item.texto.slice(0, porArchivo),
      recortado,
      palabras: item.palabras,
    };
  });
}

// Los PDFs de Drive que la cola ya bajó. Entran por la misma puerta que los
// adjuntos de Moodle para que budgetAttachments los recorte con el mismo
// criterio: la consigna real del profe suele estar acá y no en el cuerpo de
// Moodle, que muchas veces es sólo el enlace.
function textosDeDrive(activity) {
  try {
    const { getDriveFilesForActivity, leerTexto } = require('./drive');
    const textos = [];
    const omitidos = [];

    for (const archivo of getDriveFilesForActivity(activity)) {
      if (archivo.estado !== 'ok') {
        omitidos.push({ nombre: archivo.etiqueta || archivo.url, motivo: `enlace de Drive: ${archivo.estado}` });
        continue;
      }

      const texto = leerTexto(archivo);

      if (!texto) {
        omitidos.push({ nombre: archivo.nombre, motivo: 'el PDF no tiene texto extraíble' });
        continue;
      }

      textos.push({ nombre: archivo.nombre, texto, palabras: archivo.palabras || 0, url: archivo.url });
    }

    return { textos, omitidos };
  } catch (error) {
    // Sin el store de Drive el prompt se arma igual, con lo que haya en Moodle.
    log('no se pudo leer el store de Drive:', error?.message || error);
    return { textos: [], omitidos: [] };
  }
}

async function gatherContext(activity, { onProgress = null } = {}) {
  const { textos, omitidos } = await extractAttachmentTexts(activity?.archivos, { onProgress });
  const drive = textosDeDrive(activity);

  // Los de Drive van PRIMERO: cuando la consigna de Moodle es un enlace, ese PDF
  // es la consigna, y si hay que recortar no puede ser lo primero que se pierda.
  const todosLosTextos = [...drive.textos, ...textos];
  const todosOmitidos = [...omitidos, ...drive.omitidos];

  // Un enlace cuyo contenido YA está en el prompt no puede seguir listado como
  // "contenido NO disponible": eso le dice al modelo que no lo asuma, justo
  // cuando lo tiene delante.
  const urlsResueltas = new Set(drive.textos.map((t) => t.url).filter(Boolean));

  return {
    actividad: {
      nombre: activity?.nombre || '',
      materia: activity?.materia || '',
      profesor: activity?.profesor || '',
      modalidad: activity?.modalidad || '',
      estado: activity?.estado || '',
      fechaLimite: formatDate(activity?.fechaLimite),
      fechaPublicacion: formatDate(activity?.fechaPublicacion),
    },
    // Se prefiere el markdown: conserva los enlaces y las tablas de la consigna,
    // que en texto plano se convertían en palabras sueltas sin destino.
    instrucciones: String(activity?.instruccionesMarkdown || activity?.instrucciones || '').slice(
      0,
      MAX_INSTRUCTIONS_CHARS,
    ),
    instruccionesRecortadas:
      String(activity?.instruccionesMarkdown || activity?.instrucciones || '').length > MAX_INSTRUCTIONS_CHARS,
    adjuntos: budgetAttachments(todosLosTextos),
    adjuntosOmitidos: todosOmitidos,
    enlaces: Array.isArray(activity?.enlaces)
      ? activity.enlaces.filter((e) => !urlsResueltas.has(e.url)).slice(0, MAX_LINKS)
      : [],
    rubrica: activity?.rubrica?.markdown
      ? {
          titulo: activity.rubrica.titulo || 'Criterios de calificación',
          markdown: String(activity.rubrica.markdown).slice(0, MAX_RUBRIC_CHARS),
        }
      : null,
    material: collectMaterialTitles(activity?.materia),
  };
}

// Convierte el contexto a texto para el modelo. Se separa de gatherContext para
// poder testear el armado sin tocar la red.
function renderContext(context) {
  const { actividad } = context;
  const bloques = [];

  bloques.push([
    '## Datos de la actividad',
    `Título: ${actividad.nombre || '(sin título)'}`,
    actividad.materia ? `Materia: ${actividad.materia}` : null,
    actividad.profesor ? `Profesor: ${actividad.profesor}` : null,
    actividad.modalidad ? `Modalidad: ${actividad.modalidad}` : null,
    actividad.fechaLimite ? `Fecha límite: ${actividad.fechaLimite}` : null,
  ].filter(Boolean).join('\n'));

  bloques.push([
    '## Consigna textual del profesor',
    context.instrucciones || '(la actividad no trae instrucciones escritas)',
    context.instruccionesRecortadas ? '\n(consigna recortada por longitud)' : null,
  ].filter(Boolean).join('\n'));

  if (context.adjuntos.length > 0) {
    bloques.push([
      '## Documentos que adjuntó el profesor',
      ...context.adjuntos.map((adj) => [
        `### ${adj.nombre}`,
        adj.texto,
        adj.recortado ? '(documento recortado por longitud)' : null,
      ].filter(Boolean).join('\n')),
    ].join('\n\n'));
  }

  // Decir qué NO se pudo leer evita que el modelo asuma que tuvo el documento
  // completo y escriba un prompt apoyado en algo que nunca vio.
  if (context.adjuntosOmitidos.length > 0) {
    bloques.push([
      '## Documentos que NO se pudieron leer',
      'Existen pero su contenido no está disponible. No asumas qué dicen:',
      ...context.adjuntosOmitidos.map((o) => `- ${o.nombre} (${o.motivo})`),
    ].join('\n'));
  }

  // La rúbrica es el criterio de evaluación literal: sin ella el prompt sale
  // pidiendo "un buen trabajo" en vez de apuntar a los puntos que reparten.
  if (context.rubrica) {
    bloques.push([
      `## ${context.rubrica.titulo}`,
      'Así se reparten los puntos. El prompt debe apuntar a cumplir estos criterios:',
      context.rubrica.markdown,
    ].join('\n\n'));
  }

  // El modelo no puede abrir URLs. Se listan igual para que el prompt pueda
  // decirle al alumno qué tiene que abrir él, en vez de inventar el contenido.
  if ((context.enlaces || []).length > 0) {
    bloques.push([
      '## Enlaces de la consigna (contenido NO disponible)',
      'Existen en la consigna pero nadie los abrió. No asumas qué dicen:',
      ...(context.enlaces || []).map((enlace) => `- ${enlace.texto} → ${enlace.url}`),
    ].join('\n'));
  }

  if (context.material.length > 0) {
    bloques.push([
      '## Material de la materia (sólo títulos, no su contenido)',
      'Sirve para que el prompt pueda señalar en qué apoyarse. No sabés qué dicen por dentro:',
      ...context.material.map((m) => `- ${m.nombre}${m.seccion ? ` — ${m.seccion}` : ''}`),
    ].join('\n'));
  }

  return bloques.join('\n\n');
}

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

function buildSystemPrompt(modo) {
  const elegido = MODES[modo] || MODES[DEFAULT_MODE];

  return `Sos un ingeniero de prompts. Recibís el contexto completo de una actividad
académica de un estudiante del ITSON y devolvés UN PROMPT listo para pegar en
otra IA (ChatGPT, Claude, Gemini).

El prompt que escribas debe pedirle a esa IA: ${elegido.objetivo}.

Reglas duras:
- Devolvés SOLO el texto del prompt. Nada de explicaciones, encabezados tuyos,
  markdown de cierre ni comentarios. Ni una palabra antes o después.
- El prompt tiene que ser AUTOSUFICIENTE: la IA que lo reciba no ve la consigna
  original ni los documentos, así que todo lo que necesite saber va adentro.
  Copiá los requisitos concretos (formato, extensión, secciones, cantidad de
  referencias, entregables) en vez de decir "según la consigna".
- Empezá dándole a la IA un rol y el contexto de la materia.
- Listá los requisitos como criterios verificables, no como prosa.
- Si la consigna exige un formato de entrega (PDF, cuartillas, portada, APA),
  eso va explícito en el prompt.
- NO inventes requisitos que no estén en el contexto. Si algo no está, no lo
  menciones o pedile a la IA que lo confirme con el estudiante.
- Si hay documentos que no se pudieron leer, el prompt debe decirle a la IA que
  pida esos archivos al estudiante en vez de suponer su contenido.
- Escribí el prompt en el mismo idioma de la consigna (español).
- Cerrá el prompt pidiéndole a la IA que, antes de entregar, verifique punto por
  punto contra los criterios listados.`;
}

async function generatePrompt(activity, { modo = DEFAULT_MODE, backend = null, force = false, onProgress = null } = {}) {
  if (!activity?.id) return { error: 'NO_ACTIVITY' };

  const modoValido = MODES[modo] ? modo : DEFAULT_MODE;
  const cacheKey = `${activity.id}::${modoValido}`;
  const cache = readCache();

  // El contexto de una actividad no cambia salvo que el profe la edite, y
  // regenerar cuesta una request del pool más la descarga de los adjuntos.
  if (!force && cache.prompts[cacheKey]) {
    log(`cache hit para ${cacheKey}`);
    return { ok: true, ...cache.prompts[cacheKey], fromCache: true };
  }

  try {
    onProgress?.({ fase: 'contexto' });
    const context = await gatherContext(activity, { onProgress });

    onProgress?.({ fase: 'generando' });
    const response = await llm.chat(
      [
        { role: 'system', content: buildSystemPrompt(modoValido) },
        { role: 'user', content: renderContext(context) },
      ],
      // maxTokens alto: un prompt bueno para una consigna densa es largo, y
      // cortarlo a la mitad lo vuelve inservible.
      { task: 'extraction', maxTokens: 2000, temperature: 0.4, handler: 'prompt-builder', backend },
    );

    const prompt = String(response.content || '').trim();

    if (!prompt) {
      return { error: 'EMPTY_RESULT', message: 'El modelo devolvió un prompt vacío. Probá con otro.' };
    }

    const entrada = {
      prompt,
      modo: modoValido,
      backend: response.model,
      generadoEn: new Date().toISOString(),
      // Se guarda de qué se alimentó: sirve para que la UI pueda decir "esto
      // incluyó 2 documentos" y para saber si vale regenerar.
      fuentes: {
        adjuntosLeidos: context.adjuntos.map((a) => a.nombre),
        adjuntosOmitidos: context.adjuntosOmitidos.map((a) => a.nombre),
        materialTitulos: context.material.length,
        instruccionesChars: context.instrucciones.length,
        enlaces: (context.enlaces || []).length,
        rubrica: Boolean(context.rubrica),
      },
    };

    cache.prompts[cacheKey] = entrada;
    writeCache(cache);

    return { ok: true, ...entrada, fromCache: false };
  } catch (error) {
    const message = error?.message || String(error);

    // Mismos prefijos que usa el pool; se traducen a códigos para que la UI
    // elija el copy y no muestre nombres de variables de entorno.
    if (message.startsWith('No hay ningún backend LLM')) {
      return { error: 'NO_BACKEND', message: 'No hay IA configurada. Agregá una key al .env.' };
    }

    if (message.startsWith('El backend "')) {
      return { error: 'BACKEND_FAILED', message: `${backend} no respondió. Probá con otro modelo o volvé a Automático.` };
    }

    if (message.startsWith('Todos los backends LLM')) {
      log('todos los backends fallaron:', message);
      return { error: 'ALL_FAILED', message: 'La IA no respondió. Puede ser límite de cuota: probá en un rato.' };
    }

    log('falló la generación:', message);
    return { error: 'UNKNOWN', message: 'No fue posible generar el prompt.' };
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerPromptBuilderHandlers() {
  // Nunca tira: un throw acá viaja al renderer como "Error invoking remote
  // method" y la UI no puede distinguir falta de key de un 429.
  ipcMain.handle('prompt:generate', async (event, payload) =>
    generatePrompt(payload?.activity, {
      modo: payload?.modo,
      backend: payload?.backend || null,
      force: Boolean(payload?.force),
      onProgress: (progress) => event.sender.send('prompt:progress', progress),
    }));

  ipcMain.handle('prompt:get-cached', async (_event, payload) => {
    const cache = readCache();
    const entrada = cache.prompts[`${payload?.activityId}::${payload?.modo || DEFAULT_MODE}`];
    return { ok: true, data: entrada || null };
  });

  ipcMain.handle('prompt:modes', async () => ({
    ok: true,
    modes: Object.entries(MODES).map(([id, meta]) => ({ id, label: meta.label })),
    defaultMode: DEFAULT_MODE,
  }));
}

module.exports = {
  CACHE_VERSION,
  DEFAULT_MODE,
  MODES,
  attachmentExtension,
  attachmentName,
  budgetAttachments,
  collectMaterialTitles,
  gatherContext,
  generatePrompt,
  getCachePath,
  isProfessorAttachment,
  normalizeSubject,
  readCache,
  registerPromptBuilderHandlers,
  renderContext,
  textosDeDrive,
  writeCache,
};
