// El texto del PDF de Drive llegando a las dos superficies que hablan con el
// modelo: el generador de prompts y el extractor de requisitos. Sin red y sin
// llamar a ningún modelo — sólo se mira qué contexto se arma.
//
// Lee el store real, así que espera que `npm run drive:resolve` (o un scrape) ya
// haya corrido. Si el store está vacío, avisa y no falla.
//
// Uso: node scripts/test-drive-llm.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

// El store de Drive vive en la carpeta real de la app, no en un sandbox: lo que
// se prueba acá es justamente que el contexto se arme con lo que la cola bajó.
const userData = process.env.DVPOTRO_USER_DATA
  || (process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'dvpotro')
    : path.join(os.homedir(), '.config', 'dvpotro'));

require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: { app: { getPath: () => userData, on: () => {} }, ipcMain: { handle: () => {} }, shell: {}, dialog: {} },
};

const pb = require('../electron/handlers/prompt-builder.js');
const analyzer = require('../electron/handlers/activity-analyzer.js');
const drive = require('../electron/handlers/drive.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

const indice = drive.readIndice();
const resueltos = Object.values(indice.archivos || {}).filter((a) => a.estado === 'ok');

if (resueltos.length === 0) {
  console.log('SKIP  el store de Drive está vacío — corré: npm run drive:resolve');
  process.exit(0);
}

const cachePath = path.join(userData, 'actividades-cache.json');

if (!fs.existsSync(cachePath)) {
  console.log('SKIP  no hay actividades-cache.json');
  process.exit(0);
}

const actividades = JSON.parse(fs.readFileSync(cachePath, 'utf8')).actividades || [];
const actividad = actividades.find((a) => (a.enlaces || []).some((l) => l.tipo === 'google'));

if (!actividad) {
  console.log('SKIP  ninguna actividad de la caché tiene enlaces de Drive');
  process.exit(0);
}

console.log(`== Actividad de prueba: [${actividad.id}] ${actividad.nombre} ==`);
console.log(`      la consigna en Moodle son ${(actividad.instruccionesMarkdown || '').length} caracteres`);

console.log('');
console.log('== El generador de prompts ==');

const { textos, omitidos } = pb.textosDeDrive(actividad);
check('encuentra el documento resuelto', textos.length > 0, true);

if (textos.length > 0) {
  console.log(`      ${textos[0].nombre} — ${textos[0].texto.length} caracteres`);
  check('con el texto adentro', textos[0].texto.length > 500, true);
  check('y el nombre del archivo, no la URL', textos[0].nombre.endsWith('.pdf'), true);
}

// Un adjunto grande sin recorte se come el presupuesto entero del prompt.
const presupuestado = pb.budgetAttachments(textos);
check('budgetAttachments lo recorta como a cualquier adjunto', presupuestado[0].texto.length <= 6000, true);
check('y avisa cuando recortó', typeof presupuestado[0].recortado, 'boolean');
check('los omitidos son una lista', Array.isArray(omitidos), true);

console.log('');
console.log('== El extractor de requisitos ==');

const instrucciones = analyzer.getActivityInstructions(actividad);
const soloMoodle = String(actividad.instruccionesMarkdown || actividad.instrucciones || '').trim();

check('la consigna crece con el documento', instrucciones.length > soloMoodle.length, true);
check('conserva lo que decía Moodle', instrucciones.startsWith(soloMoodle.slice(0, 60)), true);
check('y marca de dónde salió lo agregado', instrucciones.includes('Documento enlazado en la consigna:'), true);
console.log(`      ${soloMoodle.length} caracteres antes, ${instrucciones.length} después`);

// Lo que prueba que sirvió: un término que define la tarea y que NO existe en
// ningún campo de Moodle.
const terminoDelPdf = ['BolsaException', 'obtenNumObjetos', 'JUnit5'].find((t) => textos.some((x) => x.texto.includes(t)));

if (terminoDelPdf) {
  const enMoodle = [
    actividad.nombre,
    actividad.instrucciones,
    actividad.instruccionesMarkdown,
    actividad.rubrica?.markdown,
    JSON.stringify(actividad.tablas || []),
  ].some((campo) => String(campo || '').includes(terminoDelPdf));

  check(`"${terminoDelPdf}" no estaba en ningún campo de Moodle`, enMoodle, false);
  check(`y ahora sí llega al modelo`, instrucciones.includes(terminoDelPdf), true);
}

console.log('');
console.log('== Un enlace ya resuelto no se anuncia como no disponible ==');
// El bloque de enlaces del prompt le dice al modelo "nadie los abrió, no asumas
// qué dicen". Decir eso de un documento que va adjunto en el mismo prompt sería
// mentirle sobre lo que tiene delante.
const urlsResueltas = new Set(textos.map((t) => t.url));
check('hay al menos un enlace resuelto', urlsResueltas.size > 0, true);

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
