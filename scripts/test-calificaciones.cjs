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

// --- expediente (RPA) --------------------------------------------------------

const { parseRPA, tresEnteros, tresDecimales } = require(path.join(__dirname, '..', 'electron', 'utils', 'rpaParser.js'));

// El reporte imprime los tres enteros PEGADOS ("55946"). Lo que desambigua es
// que obligatorias = acreditadas + faltantes.
check('desambigua 55946 como 55/9/46', tresEnteros('55946'), { obligatorias: 55, acreditadas: 9, faltantes: 46 });
check('desambigua 000 como 0/0/0', tresEnteros('000'), { obligatorias: 0, acreditadas: 0, faltantes: 0 });
check('desambigua 101 como 1/0/1', tresEnteros('101'), { obligatorias: 1, acreditadas: 0, faltantes: 1 });
check('devuelve null si ninguna particion cierra', tresEnteros('123'), null);
check('parte los creditos por forma', tresDecimales('378.4773.09305.38'), { obligatorios: 378.47, acreditados: 73.09, faltan: 305.38 });

// Texto real del RPA del 2026-09-10, con los renglones pegados como salen del
// PDF. La fila de "Sist Operativos y Arq de Comp" queda con UN solo espacio
// antes de su calificación: es el nombre más largo de la tabla y exigir dos
// espacios la perdía en silencio.
const RPA_REAL = [
  'CONDICIONES ACADÉMICAS',
  'Reprobadas Plan2',
  'Promedio:8.000',
  'Asignaturas Plan55946',
  'Total de Reprobadas2',
  'Indice de Reprobación18.18',
  '% Avance:19%',
  'Créditos Totales378.4773.09305.38',
  'ASIGNATURAS APROBADAS DEL PLAN DE ESTUDIOS VIGENTE',
  'Ciclo          Período      Catalogo       Nombre                                       Calificación         CréditosAgo-Dic 25011030F     Analisis Información y Com    8  5.62Ago-Dic 25011112C     Introd a la Ing en Software   7  5.62Ago-Dic 25011113C     Programación I c/Lab          8  11.25Ago-Dic 25011029F     Salud y Desarrollo Personal   8  5.62Ene-May 26021043D     Ingles Universitario A1       7  9.37Ene-May 26021178M     Matematicas Discretas         7  9.37Ene-May 26021124C     Programacion II c/Lab         9  11.25Ene-May 26021123C     Sist Operativos y Arq de Comp 9  9.37Ene-May 26021115C     Tecnologia y Empresa          9  5.62',
  'ASIGNATURAS REPROBADAS DEL PLAN DE ESTUDIOS VIGENTE',
  'Ciclo          Período      Catalogo       Nombre                                       Calificación         CréditosEne-May 26011165M     Precálculo                    6  9.37Ago-Dic 25011042D     Ingles Introductorio          6  5.62',
  'CURSOS ADICIONALES (*)',
  'Ciclo          Período      Catalogo       Nombre                                       Calificación         CréditosEne-May 26OC1132T     Tutoria 2 (INSOF)             A  0.01',
].join('\n');

const exp = parseRPA(RPA_REAL);

check('promedio global del RPA', exp?.promedioGlobal, 8);
check('% avance', exp?.avance, 19);
check('indice de reprobacion', exp?.indiceReprobacion, 18.18);
check('creditos', exp?.creditos, { obligatorios: 378.47, acreditados: 73.09, faltan: 305.38 });
check('asignaturas', exp?.asignaturas, { obligatorias: 55, acreditadas: 9, faltantes: 46 });

check('las 9 aprobadas, ninguna perdida', exp?.materias.aprobadas.length, 9);
check('lee el nombre mas largo de la tabla', exp?.materias.aprobadas[7]?.nombre, 'Sist Operativos y Arq de Comp');
check('las 2 reprobadas', exp?.materias.reprobadas.length, 2);
check('el curso adicional con literal', { l: exp?.materias.adicionales[0]?.literal, c: exp?.materias.adicionales[0]?.calificacion }, { l: 'A', c: null });
check('nombre con numero adentro no se parte', exp?.materias.aprobadas[6]?.nombre, 'Programacion II c/Lab');
check('periodo OC de los adicionales', exp?.materias.adicionales[0]?.periodo, 'OC');

// Coherencia interna: si el parseo se desalinea, estas dos dejan de cerrar
// contra las cifras que el propio reporte imprime.
const totalCursadas = exp.materias.aprobadas.length + exp.materias.reprobadas.length;
check(
  'indice calculado == impreso',
  Number(((exp.materias.reprobadas.length / totalCursadas) * 100).toFixed(2)),
  exp.indiceReprobacion,
);
check(
  'creditos de aprobadas == acreditados impresos',
  Number(exp.materias.aprobadas.reduce((s, m) => s + m.creditos, 0).toFixed(2)),
  exp.creditos.acreditados,
);
check('acreditadas impresas == filas aprobadas', exp.asignaturas.acreditadas, exp.materias.aprobadas.length);

check('texto que no es un RPA devuelve null', parseRPA('cualquier cosa'), null);

// `undefined` significa "el RPA no corrió": el expediente anterior sobrevive.
// `null` sí sería un valor y lo pisaría.
cia.writeCache({ cicloActual: '3153', ciclos: [], expediente: { promedioGlobal: 8, actualizado: 1 } });
cia.writeCache({ cicloActual: '3153', ciclos: [], expediente: undefined });
check('expediente sobrevive si el RPA no corrió', cia.readCache()?.expediente?.promedioGlobal, 8);

fs.rmSync(userData, { recursive: true, force: true });

console.log('');
if (fallos) {
  console.log(`${fallos} fallo(s)`);
  process.exit(1);
}
console.log('TODO OK');
