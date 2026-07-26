// Smoke del analizador de actividades. Pega contra los LLM reales, así que
// consume cuota: correr cuando se toca electron/llm/ o el handler.
//
//   node scripts/test-activity-analyzer.cjs
//
// No imprime valores de API keys, solo nombres de variable.
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'node_modules/dotenv')).config({ path: path.join(ROOT, '.env') });

// El handler pide app.getPath: se stubea Electron para correr en node pelado.
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-smoke-'));
const fakeElectron = {
  app: { getPath: (key) => (key === 'temp' ? os.tmpdir() : userData), getVersion: () => '0.0.0' },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => {}, removeHandler: () => {} },
};
const originalLoad = Module._load;
Module._load = (request, parent, isMain) =>
  (request === 'electron' ? fakeElectron : originalLoad(request, parent, isMain));

const analyzer = require(path.join(ROOT, 'electron/handlers/activity-analyzer'));
const { extractFirstJsonObject } = require(path.join(ROOT, 'electron/llm'));
const { discoverKeySlots } = require(path.join(ROOT, 'electron/llm/key-pool'));
const { availableBackends } = require(path.join(ROOT, 'electron/llm/selector'));

const failures = [];
const fail = (message) => failures.push(message);
const norm = (value) => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const VALID_TYPES = ['format', 'content', 'structure', 'length', 'other'];
const VALID_MET = ['yes', 'no', 'partial', 'unclear'];

// Cada concepto lista sinónimos: basta que el modelo exprese uno para darlo por
// cubierto. Sin esto la prueba castigaría diferencias de redacción, no de fondo.
const ACTIVITIES = [
  {
    id: 'smoke-ensayo',
    nombre: 'Ensayo argumentativo: sesgos algorítmicos',
    materia: 'Ética Profesional',
    modalidad: 'individual',
    instrucciones:
      'Redacta un ensayo argumentativo de entre 1200 y 1500 palabras sobre sesgos algorítmicos en sistemas de contratación. ' +
      'Debe incluir introducción, desarrollo y conclusión. Cita al menos 6 fuentes académicas en formato APA 7ma edición. ' +
      'Entrega en PDF con interlineado 1.5 y letra Arial 12.',
    expect: {
      extension: ['1200', '1500', 'palabras'],
      estructura: ['introduccion', 'desarrollo', 'conclusion'],
      fuentes: ['6 fuentes', 'seis fuentes', '6 referencias', 'al menos 6'],
      apa: ['apa'],
      pdf: ['pdf'],
      tipografia: ['arial', 'interlineado', '1.5', 'letra'],
    },
  },
  {
    id: 'smoke-crud',
    nombre: 'Práctica 5: CRUD con Express y PostgreSQL',
    materia: 'Desarrollo de Aplicaciones Web',
    modalidad: 'equipo',
    instrucciones:
      'Implementen una API CRUD completa con Express conectada a PostgreSQL. Requisitos: los 4 endpoints (GET, POST, PUT, DELETE), ' +
      'validación de entrada con Zod, manejo de errores con middleware y pruebas unitarias con Jest cubriendo al menos el 70% del código. ' +
      'Entreguen el enlace al repositorio de GitHub y un README con instrucciones de instalación.',
    expect: {
      crud: ['crud', 'endpoint', 'get', 'post'],
      zod: ['zod', 'validacion'],
      middleware: ['middleware', 'errores'],
      tests: ['jest', '70', 'cobertura', 'pruebas'],
      repo: ['github', 'repositorio'],
      readme: ['readme', 'instalacion'],
    },
  },
  {
    id: 'smoke-mapa',
    nombre: 'Mapa conceptual: normalización de bases de datos',
    materia: 'Bases de Datos',
    modalidad: 'individual',
    instrucciones:
      'Elabora un mapa conceptual que cubra de la 1FN a la 4FN. Cada forma normal debe tener un ejemplo propio de tabla ' +
      'antes y después de normalizar. Entrega una sola imagen PNG legible o un PDF de máximo 2 páginas.',
    expect: {
      formasNormales: ['1fn', '4fn', 'formas normales', 'forma normal'],
      ejemplos: ['ejemplo'],
      antesDespues: ['antes', 'despues'],
      formato: ['png', 'pdf'],
      paginas: ['2 pagina', 'dos pagina', 'maximo'],
    },
  },
  {
    id: 'smoke-lab',
    nombre: 'Reporte de laboratorio: análisis de tráfico TCP',
    materia: 'Redes de Computadoras',
    modalidad: 'individual',
    instrucciones:
      'Captura tráfico con Wireshark durante una sesión HTTP y elabora un reporte que incluya: portada con tus datos, ' +
      'objetivo de la práctica, metodología, capturas de pantalla numeradas y comentadas, análisis de al menos 3 retransmisiones TCP ' +
      'y conclusiones. El reporte no debe exceder 10 páginas.',
    expect: {
      wireshark: ['wireshark', 'captura'],
      portada: ['portada'],
      metodologia: ['objetivo', 'metodologia'],
      capturas: ['numerada', 'capturas de pantalla', 'comentada'],
      retransmisiones: ['retransmision', 'tcp'],
      conclusiones: ['conclusion'],
      limite: ['10 pagina', 'exceder', 'maximo'],
    },
  },
  {
    id: 'smoke-expo',
    nombre: 'Exposición: patrones de diseño estructurales',
    materia: 'Ingeniería de Software',
    modalidad: 'equipo',
    instrucciones:
      'Preparen una exposición de 15 minutos sobre un patrón estructural asignado. Deben entregar las diapositivas en PPTX ' +
      'con un máximo de 12 slides, incluir un diagrama UML del patrón y un ejemplo de código funcional en Java. ' +
      'Todos los integrantes deben participar en la exposición.',
    expect: {
      duracion: ['15 minuto', 'quince minuto', 'duracion'],
      pptx: ['pptx', 'diapositiva'],
      slides: ['12', 'slide', 'diapositiva'],
      uml: ['uml', 'diagrama'],
      java: ['java', 'codigo'],
      participacion: ['integrante', 'participen', 'participar', 'todos'],
    },
  },
  {
    id: 'smoke-cuestionario',
    nombre: 'Cuestionario unidad 3',
    materia: 'Matemáticas para Ingeniería',
    modalidad: 'individual',
    instrucciones: 'Resuelve el cuestionario en línea. Tienes un solo intento y 40 minutos.',
    expect: { intento: ['intento'], tiempo: ['40', 'minuto'] },
  },
  {
    // Borde: sin instrucciones debe deducir del título en vez de romper.
    id: 'smoke-sin-consigna',
    nombre: 'Entrega final del proyecto integrador',
    materia: 'Proyecto Integrador',
    modalidad: 'equipo',
    instrucciones: '',
    expect: {},
  },
  {
    id: 'smoke-portafolio',
    nombre: 'Portafolio de evidencias del semestre',
    materia: 'Tutorías',
    modalidad: 'individual',
    instrucciones:
      'Integra en un solo documento PDF: 1) carta de presentación firmada, 2) las 5 evidencias de aprendizaje trabajadas en clase, ' +
      '3) una autoevaluación usando la rúbrica del anexo, y 4) un plan de mejora para el siguiente semestre. ' +
      'Nombra el archivo como ApellidoNombre_Portafolio.pdf',
    expect: {
      pdfUnico: ['pdf', 'unico', 'un solo', 'documento'],
      carta: ['carta', 'firmada', 'presentacion'],
      evidencias: ['5 evidencia', 'cinco evidencia', 'evidencias'],
      autoevaluacion: ['autoevaluacion', 'rubrica'],
      planMejora: ['plan de mejora', 'mejora'],
      nombreArchivo: ['nombre', 'apellidonombre', 'nombra'],
    },
  },
];

function checkRequirementShape(activityId, requirements) {
  const ids = requirements.map((item) => item.id);

  if (requirements.length === 0) fail(`${activityId}: sin requisitos`);
  if (new Set(ids).size !== ids.length) fail(`${activityId}: ids duplicados`);
  if (ids.some((id, index) => id !== `req-${index + 1}`)) fail(`${activityId}: ids no secuenciales`);
  if (requirements.some((item) => !VALID_TYPES.includes(item.type))) fail(`${activityId}: type fuera del enum`);
  if (requirements.some((item) => !item.description)) fail(`${activityId}: description vacía`);
  if (requirements.length > 20) fail(`${activityId}: supera el tope de 20 requisitos`);
}

async function runExtraction() {
  console.log('\n== Extracción de requisitos ==');
  let expectedTotal = 0;
  let coveredTotal = 0;

  for (const activity of ACTIVITIES) {
    let result;

    try {
      result = await analyzer.extractRequirements(activity);
    } catch (error) {
      fail(`${activity.id}: throw ${error.message}`);
      console.log(`  ${activity.id.padEnd(22)} ERROR ${error.message}`);
      continue;
    }

    checkRequirementShape(activity.id, result.requirements);

    const haystack = norm(result.requirements.map((item) => `${item.description} ${item.criteria}`).join(' | '));
    const concepts = Object.entries(activity.expect);
    const missing = concepts.filter(([, synonyms]) => !synonyms.some((word) => haystack.includes(norm(word))));

    expectedTotal += concepts.length;
    coveredTotal += concepts.length - missing.length;

    if (missing.length > 0) fail(`${activity.id}: no cubre ${missing.map(([name]) => name).join(', ')}`);

    const coverage = concepts.length > 0 ? `${concepts.length - missing.length}/${concepts.length}` : 'n/a';
    console.log(`  ${activity.id.padEnd(22)} ${String(result.requirements.length).padStart(2)} reqs · cobertura ${coverage} · ${result.model}`);
  }

  return { expectedTotal, coveredTotal };
}

async function runCacheCheck() {
  console.log('\n== Caché ==');
  const activity = ACTIVITIES[0];
  const again = await analyzer.extractRequirements(activity);

  if (!again.fromCache) fail('caché: la segunda extracción no pegó al caché');
  console.log(`  segunda extracción fromCache=${again.fromCache}`);
}

async function runPipeline() {
  console.log('\n== Pipeline entrega -> verificación ==');
  const docx = path.join(ROOT, 'node_modules/mammoth/test/test-data/single-paragraph.docx');

  if (!fs.existsSync(docx)) {
    console.log('  (se omite: falta el docx de mammoth)');
    return;
  }

  const submission = await analyzer.parseSubmission(docx);

  if (!submission.text || submission.wordCount < 1) fail('parseSubmission: docx sin texto');

  const activity = ACTIVITIES[5];
  const { requirements } = await analyzer.extractRequirements(activity);
  const { results } = await analyzer.verifySubmission(requirements, submission, activity.id);

  if (results.length !== requirements.length) fail('verify: cantidad de resultados != requisitos');
  if (results.some((item, index) => item.requirementId !== requirements[index].id)) fail('verify: ids desalineados');
  if (results.some((item) => !VALID_MET.includes(item.met))) fail('verify: met fuera del enum');
  if (results.some((item) => item.confidence < 0 || item.confidence > 1)) fail('verify: confidence fuera de rango');

  const repeat = await analyzer.verifySubmission(requirements, submission, activity.id);
  if (!repeat.fromCache) fail('verify: la segunda verificación no pegó al caché');

  console.log(`  docx ${submission.wordCount} palabras · ${results.length} resultados alineados · cache hit ${repeat.fromCache}`);
}

async function expectThrow(label, run) {
  try {
    await run();
    fail(`${label}: no lanzó`);
    console.log(`  ${label.padEnd(34)} NO LANZÓ`);
  } catch (error) {
    console.log(`  ${label.padEnd(34)} ${error.message.slice(0, 46)}`);
  }
}

async function runEdgeCases() {
  console.log('\n== Bordes ==');

  await expectThrow('formato no soportado', () => analyzer.parseSubmission(path.join(ROOT, 'package.json')));
  await expectThrow('archivo inexistente', () => analyzer.parseSubmission(path.join(ROOT, 'no-existe.pdf')));
  await expectThrow('actividad sin id', () => analyzer.extractRequirements({ nombre: 'x', instrucciones: 'y' }));
  await expectThrow('verify sin requisitos', () => analyzer.verifySubmission([], { text: 'hola' }));
  await expectThrow('verify sin texto', () => analyzer.verifySubmission([{ id: 'req-1' }], {}));

  // El modelo a veces pega texto después del JSON; el parser tiene que recortar.
  const sucio = 'Aquí va: {"requirements": [{"id":"req-1","description":"con {llaves} adentro"}]} y basura final"';
  const recuperado = extractFirstJsonObject(sucio);
  const parsed = recuperado ? JSON.parse(recuperado) : null;

  if (parsed?.requirements?.[0]?.description !== 'con {llaves} adentro') {
    fail('extractFirstJsonObject: no recuperó el objeto');
  }
  console.log(`  ${'JSON sucio recuperable'.padEnd(34)} ${parsed ? 'OK' : 'FALLÓ'}`);
}

(async () => {
  console.log('== Pools de claves ==');
  for (const [name, base] of Object.entries({
    cerebras: 'CEREBRAS_API_KEY',
    github: 'GITHUB_TOKEN',
    mistral: 'MISTRAL_API_KEY',
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
  })) {
    console.log(`  ${name.padEnd(9)} ${String(discoverKeySlots(base).length).padStart(2)} slot(s)`);
  }

  const backends = availableBackends();
  console.log(`  orden disponible: ${backends.join(' > ') || '(ninguno)'}`);

  if (backends.length === 0) {
    console.error('\nNo hay backends configurados: el smoke necesita al menos una API key.');
    process.exit(1);
  }

  const { expectedTotal, coveredTotal } = await runExtraction();
  await runCacheCheck();
  await runPipeline();
  await runEdgeCases();

  const pct = expectedTotal > 0 ? Math.round((coveredTotal / expectedTotal) * 100) : 100;
  console.log(`\nCOBERTURA: ${coveredTotal}/${expectedTotal} conceptos (${pct}%)`);

  if (failures.length > 0) {
    console.error(`FALLAS (${failures.length}):\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }

  console.log('SMOKE OK');
})().catch((error) => {
  console.error('FATAL:', error.message);
  process.exit(1);
});
