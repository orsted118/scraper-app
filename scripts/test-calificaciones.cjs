// Funciones puras del handler de calificaciones, contra las filas REALES que
// devolvió el portal en el recon del 2026-09-11.
//
// Los dos promedios se verifican contra cifras oficiales impresas por el CIA:
// 7.83 del ciclo sale de la Boleta, 8.000 global sale del RPA. Si alguno de los
// dos deja de dar, el cambio rompió la fórmula aunque el scrape siga andando.
//
// Correr: npm run test:calificaciones
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Module = require('module');

// Stub de electron: el handler lo requiere al cargar y no hay app real acá.
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-calif-'));
const electronStub = { app: { getPath: () => userData }, ipcMain: null };
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolver(request, ...rest) {
  if (request === 'electron') return 'electron-stub';
  return originalResolve.call(this, request, ...rest);
};
require.cache['electron-stub'] = { id: 'electron-stub', filename: 'electron-stub', loaded: true, exports: electronStub };

const cia = require(path.join(__dirname, '..', 'electron', 'handlers', 'cia.js'));

let fallos = 0;
function check(nombre, actual, esperado) {
  try {
    assert.deepStrictEqual(actual, esperado);
    console.log('PASS ', nombre);
  } catch (error) {
    fallos += 1;
    console.log('FAIL ', nombre);
    console.log('        esperado:', JSON.stringify(esperado));
    console.log('        actual  :', JSON.stringify(actual));
  }
}

// --- filas reales de "Mis Calificaciones" -----------------------------------

const ENCABEZADO = ['Curso', 'Nombre Clase', 'Calificación Oficial', 'Unidades'];

// Ciclo cerrado: 4 celdas por fila.
const FILAS_3147 = [
  ['Mi Informe Calificaciones > enero-mayo de 2026 > Licenciatura'],
  ENCABEZADO,
  ['C 1115C', 'Tecnologia y Empresa', '9', '5.62'],
  ['C 1123C', 'Sist Operativos y Arq de Comp', '9', '9.37'],
  ['C 1124C', 'Programacion II c/Lab', '9', '11.25'],
  ['IDIOMA 1043D', 'Ingles Universitario A1', '7', '9.37'],
  ['M 1165M', 'Precálculo', '6', '9.37'],
  ['M 1178M', 'Matematicas Discretas', '7', '9.37'],
  ['TUTORIA 1132T', 'Tutoria 2 (INSOF)', 'A', ''],
];

const FILAS_3145 = [
  ENCABEZADO,
  ['C 1112C', 'Introd a la Ing en Software', '7', '5.62'],
  ['C 1113C', 'Programación I c/Lab', '8', '11.25'],
  ['IDIOMA 1042D', 'Ingles Introductorio', '6', '5.62'],
  ['P 1029F', 'Salud y Desarrollo Personal', '8', '5.62'],
  ['U 1030F', 'Analisis Información y Com', '8', '5.62'],
];

// Ciclo EN CURSO: la calificación vacía no llega como celda vacía, llega como
// UNA CELDA MENOS. Este es el caso que rompía el mapeo posicional.
const FILAS_3153 = [
  ENCABEZADO,
  ['A 1031F', 'Democracia Gestion Ciudadana', '5.62'],
  ['C 1145C', 'Redes', '5.62'],
  ['IDIOMA 1044D', 'Ingles Universitario A2', '9.37'],
  ['M 1190M', 'Matematicas Computacionales', '9.37'],
];

const m3147 = cia.filasAMaterias(FILAS_3147);
const m3145 = cia.filasAMaterias(FILAS_3145);
const m3153 = cia.filasAMaterias(FILAS_3153);

check('3147: lee las 7 materias', m3147.length, 7);
check('3147: descarta el breadcrumb', m3147.some((m) => /Mi Informe/.test(m.nombre)), false);
check('3147: separa area y catalogo', { area: m3147[0].area, codigo: m3147[0].codigo }, { area: 'C', codigo: '1115C' });
check('3147: area de varias palabras', m3147[3].area, 'IDIOMA');
check('3147: Precálculo reprobado', { c: m3147[4].calificacion, e: m3147[4].estado }, { c: 6, e: 'reprobada' });
check('3147: Tutoria acreditada sin numero', { c: m3147[6].calificacion, l: m3147[6].literal, e: m3147[6].estado }, { c: null, l: 'A', e: 'acreditada' });
check('3147: unidades numericas', m3147[2].unidades, 11.25);

check('3153: lee las 4 materias pese a la celda faltante', m3153.length, 4);
check('3153: nombre no se come las unidades', m3153[0].nombre, 'Democracia Gestion Ciudadana');
check('3153: unidades NO caen en calificacion', { c: m3153[0].calificacion, u: m3153[0].unidades }, { c: null, u: 5.62 });
check('3153: estado sin_calificacion', m3153[0].estado, 'sin_calificacion');
check('3153: catalogo correcto', m3153[2].codigo, '1044D');

// --- promedios: contra cifras oficiales del portal ---------------------------

// La Boleta oficial de ene-may 2026 imprime "Promedio 7.83".
check('promedio del ciclo 3147 coincide con la Boleta', cia.promedioCiclo(m3147), 7.83);

// El RPA imprime "Promedio: 8.000" — solo aprobadas, de todos los ciclos.
const ciclos = [
  { materias: m3145 },
  { materias: m3147 },
  { materias: m3153 },
];
check('promedio global coincide con el RPA', cia.promedioGlobalCalculado(ciclos), 8);

// Las dos fórmulas son distintas a propósito: si alguien las unifica, esto cae.
check('las dos formulas NO dan lo mismo', cia.promedioCiclo(m3147) === cia.promedioGlobalCalculado(ciclos), false);

check('promedio null cuando no hay numericas', cia.promedioCiclo(m3153), null);

// --- estados -----------------------------------------------------------------

check('6 es reprobada, no en_riesgo', cia.getEstado({ calificacion: 6, literal: null }), 'reprobada');
check('7 aprueba (minimo oficial)', cia.getEstado({ calificacion: 7, literal: null }), 'aprobada');
check('NA no acreditada', cia.getEstado({ calificacion: null, literal: 'NA' }), 'no_acreditada');
check('vacio es sin_calificacion', cia.getEstado(cia.parseCalificacion('')), 'sin_calificacion');

// --- ciclo -------------------------------------------------------------------

check('STRM sale del value del option', cia.cicloIdFromValue('000002790093145LIC ITSON'), '3145');
check('STRM tolera espacios', cia.cicloIdFromValue('00000279009 3153 LIC ITSON'), '3153');

// --- caché -------------------------------------------------------------------

const cachePath = cia.getCachePath();

fs.writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), materias: [] }));
check('caché sin schemaVersion (formato boleta) se descarta', cia.readCache(), null);

fs.writeFileSync(cachePath, JSON.stringify({ schemaVersion: 1, timestamp: '2026-09-11T00:00:00Z', ciclos: [] }));
check('caché con timestamp ISO se descarta', cia.readCache(), null);

fs.writeFileSync(cachePath, JSON.stringify({ schemaVersion: 99, timestamp: Date.now(), ciclos: [] }));
check('caché de version futura se descarta', cia.readCache(), null);

cia.writeCache({ cicloActual: '3153', ciclos: [{ id: '3153', materias: m3153 }] });
const leido = cia.readCache();
check('caché v1 valida sobrevive', { v: leido?.schemaVersion, ciclos: leido?.ciclos.length }, { v: 1, ciclos: 1 });
check('timestamp es epoch numerico', typeof leido.timestamp, 'number');

// El expediente lo llena el RPA en otra pasada: una escritura sin él no debe
// borrar el que ya estaba.
cia.writeCache({ cicloActual: '3153', ciclos: [], expediente: { promedioGlobal: 8 } });
cia.writeCache({ cicloActual: '3153', ciclos: [] });
check('writeCache conserva el expediente previo', cia.readCache()?.expediente, { promedioGlobal: 8 });

fs.rmSync(userData, { recursive: true, force: true });

console.log('');
if (fallos) {
  console.log(`${fallos} fallo(s)`);
  process.exit(1);
}
console.log('TODO OK');
