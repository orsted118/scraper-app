// Generador de prompts: armado del contexto y presupuesto de tokens.
//
// Lo que mas importa acá es el PRESUPUESTO: la consigna, los adjuntos y el
// material juntos no entran en el contexto del modelo mas chico del pool, asi
// que el recorte tiene que ser por prioridad y tiene que AVISAR lo que recorto.
//
// Uso: node scripts/test-prompt-builder.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-pb-'));
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: { app: { getPath: () => userData, on: () => {} }, ipcMain: { handle: () => {} }, shell: {}, dialog: {} },
};

const pb = require('../electron/handlers/prompt-builder.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

console.log('== Presupuesto de adjuntos ==');
const gigante = 'x'.repeat(50000);
const uno = pb.budgetAttachments([{ nombre: 'a.pdf', texto: gigante }]);
check('un adjunto solo se corta al techo por archivo', uno[0].texto.length, 6000);
check('y queda marcado como recortado', uno[0].recortado, true);

// Sin reparto, el primero se comia todo el presupuesto y los otros quedaban
// afuera del prompt sin que nadie se enterara.
const tres = pb.budgetAttachments([
  { nombre: 'a.pdf', texto: gigante },
  { nombre: 'b.pdf', texto: gigante },
  { nombre: 'c.pdf', texto: gigante },
]);
check('tres adjuntos se reparten el techo total', tres.reduce((s, a) => s + a.texto.length, 0), 12000);
check('ninguno queda vacio', tres.every((a) => a.texto.length > 0), true);

const chico = pb.budgetAttachments([{ nombre: 'a.pdf', texto: 'corto' }]);
check('un adjunto corto no se toca', chico[0].texto, 'corto');
check('ni se marca como recortado', chico[0].recortado, false);
check('sin adjuntos devuelve lista vacia', pb.budgetAttachments([]), []);

console.log('');
console.log('== renderContext: prioridad y honestidad ==');
const ctx = {
  actividad: { nombre: 'Practica 6', materia: 'Estructuras', profesor: 'Dr. X', modalidad: 'individual', fechaLimite: 'lunes' },
  instrucciones: 'CONSIGNA-COMPLETA',
  instruccionesRecortadas: true,
  adjuntos: [{ nombre: 'rubrica.pdf', texto: 'TEXTO-RUBRICA', recortado: true }],
  adjuntosOmitidos: [{ nombre: 'escaneado.pdf', motivo: 'sin texto extraible' }],
  material: [{ nombre: 'Tema1.pdf', seccion: 'Semana 1' }],
};
const render = pb.renderContext(ctx);

check('la consigna va entera', render.includes('CONSIGNA-COMPLETA'), true);
check('el texto del adjunto va', render.includes('TEXTO-RUBRICA'), true);
check('avisa que la consigna se recorto', render.includes('consigna recortada'), true);
check('avisa que el adjunto se recorto', render.includes('documento recortado'), true);
// Sin esto el modelo escribe un prompt apoyado en un documento que nunca vio.
check('nombra lo que no pudo leer', render.includes('escaneado.pdf'), true);
check('y le dice al modelo que no lo asuma', render.includes('No asumas'), true);
check('el material entra solo por titulo', render.includes('Tema1.pdf'), true);
check('y se aclara que no conoce su contenido', render.includes('sólo títulos'), true);
check('incluye al profesor', render.includes('Dr. X'), true);
check('incluye la fecha limite', render.includes('lunes'), true);

const vacio = pb.renderContext({
  actividad: { nombre: '', materia: '', profesor: '', modalidad: '', fechaLimite: null },
  instrucciones: '', instruccionesRecortadas: false, adjuntos: [], adjuntosOmitidos: [], material: [],
});
check('una actividad sin nada no rompe', vacio.includes('(sin título)'), true);
check('y dice que no hay instrucciones', vacio.includes('no trae instrucciones'), true);

console.log('');
console.log('== Cruce con el material por nombre de materia ==');
check('normaliza acentos', pb.normalizeSubject('Matemáticas Computacionales'), 'MATEMATICAS COMPUTACIONALES');
check('normaliza mayusculas y puntuacion', pb.normalizeSubject('redes  i.'), 'REDES I');
check('sin materia no explota', pb.normalizeSubject(null), '');

console.log('');
console.log('== Modos ==');
check('el default existe', Boolean(pb.MODES[pb.DEFAULT_MODE]), true);
check('hay tres modos', Object.keys(pb.MODES).length, 3);
// Cada modo cambia el objetivo que se le pide a la IA destino: si dieran el
// mismo texto, el selector de la UI seria decorativo.
const objetivos = Object.values(pb.MODES).map((m) => m.objetivo);
check('cada modo pide algo distinto', new Set(objetivos).size, 3);

console.log('');
console.log('== Adjuntos: cual es del profe y cual es mio ==');
// El scraper barre TODO pluginfile.php de la pagina, asi que `archivos`
// mezcla el adjunto de la consigna con las entregas del propio alumno. En la
// cache real son 1 y 11. Sin separarlos, el prompt le manda al modelo la
// respuesta del alumno bajo el titulo que promete la consigna del profesor.
const DEL_PROFE = {
  name: 'Ejercicio Clase 28 agosto 2026.pdf',
  url: 'https://ivirtual.itson.edu.mx/pluginfile.php/2089123/mod_assign/introattachment/0/Ejercicio%20Clase%2028%20agosto%202026.pdf?forcedownload=1',
};
const MIO = {
  name: 'A02_DavidAlvarez_00000279009.pdf',
  url: 'https://ivirtual.itson.edu.mx/pluginfile.php/2151379/assignsubmission_file/submission_files/8421920/A02_DavidAlvarez_00000279009.pdf?forcedownload=1',
};
const MIA_IMAGEN = {
  name: 'WhatsApp Image 2026-09-03 at 7.19.47 PM.jpeg',
  url: 'https://ivirtual.itson.edu.mx/pluginfile.php/2159924/assignsubmission_file/submission_files/8446321/WhatsApp%20Image.jpeg?forcedownload=1',
};

check('introattachment es del profe', pb.isProfessorAttachment(DEL_PROFE), true);
check('assignsubmission_file es mio', pb.isProfessorAttachment(MIO), false);
check('una imagen mia tampoco', pb.isProfessorAttachment(MIA_IMAGEN), false);

// El scraper guarda `name`. Leer solo `nombre` hacia que el filtro cayera al
// URL, donde extname devuelve '.pdf?forcedownload=1': candidatos salia vacio
// para el 100% de los datos reales y extractAttachmentTexts nunca corrio.
check('lee el nombre que el scraper guarda', pb.attachmentName(DEL_PROFE), 'Ejercicio Clase 28 agosto 2026.pdf');
check('tolera la forma vieja', pb.attachmentName({ nombre: 'viejo.pdf' }), 'viejo.pdf');
check('sin nada devuelve vacio', pb.attachmentName({}), '');
check('la extension no arrastra la query', pb.attachmentExtension(DEL_PROFE), '.pdf');
check('ni cuando solo hay url', pb.attachmentExtension({ url: DEL_PROFE.url }), '.pdf');
check('un docx se reconoce', pb.attachmentExtension({ name: 'consigna.DOCX' }), '.docx');
check('un archivo sin extension no inventa', pb.attachmentExtension({ name: 'sin-extension', url: 'https://x.com/a' }), '');

// El filtro completo, tal como lo aplica extractAttachmentTexts.
const SOPORTADAS = new Set(['.pdf', '.docx']);
const candidatos = (archivos) => archivos.filter((f) => pb.isProfessorAttachment(f) && SOPORTADAS.has(pb.attachmentExtension(f)));
check('de una consigna real queda solo el del profe', candidatos([DEL_PROFE, MIO, MIA_IMAGEN]).map((f) => f.name), ['Ejercicio Clase 28 agosto 2026.pdf']);
check('sin adjunto del profe no hay candidatos', candidatos([MIO, MIA_IMAGEN]), []);
check('una imagen del profe no es candidata', candidatos([{ name: 'diagrama.png', url: DEL_PROFE.url.replace('.pdf', '.png') }]), []);

console.log('');
console.log('== Guardas ==');
(async () => {
  const sinId = await pb.generatePrompt({ nombre: 'x' }, {});
  check('sin id de actividad no genera', sinId.error, 'NO_ACTIVITY');

  fs.rmSync(userData, { recursive: true, force: true });
  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  process.exit(failures === 0 ? 0 : 1);
})();
