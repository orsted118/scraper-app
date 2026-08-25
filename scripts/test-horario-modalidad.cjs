// Regresión del bug de modalidad por día.
//
// Caso real (ciclo Ago-Dic 2026, 1148C Bases de Datos): la misma clase-sección
// se da presencial Lun/Mié en LM0712 y remota el viernes. El merge agrupaba las
// sesiones solo por horario, así que los tres días caían en la misma sesión y
// la modalidad remota del viernes pisaba a las presenciales. Resultado: la app
// decía "Remoto" los lunes y el alumno no se presentaba al salón.
//
// Uso: node scripts/test-horario-modalidad.cjs
const { mergeWeeklyRows } = require('../electron/handlers/horario.js');

let failures = 0;

function check(label, actual, expected) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  const ok = actualStr === expectedStr;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) {
    console.log(`        esperado: ${expectedStr}`);
    console.log(`        obtenido: ${actualStr}`);
  }
}

// Filas tal como las produce el parser de la grilla semanal: una por celda.
const basesDeDatosRows = [
  {
    codigoRaw: 'C 1148C', seccion: '1029', componente: 'Teoria',
    horaInicio: '15:00', horaFin: '16:00', dias: ['Lunes'],
    ubicacion: 'LM0712', esEnLinea: false,
  },
  {
    codigoRaw: 'C 1148C', seccion: '1029', componente: 'Teoria',
    horaInicio: '15:00', horaFin: '16:00', dias: ['Miércoles'],
    ubicacion: 'LM0712', esEnLinea: false,
  },
  {
    codigoRaw: 'C 1148C', seccion: '1029', componente: 'Teoria',
    horaInicio: '15:00', horaFin: '16:00', dias: ['Viernes'],
    ubicacion: 'Remoto', esEnLinea: true,
  },
];

const identifiers = [
  {
    codigo: '1148C', nombre: 'Bases de Datos', seccion: '1029',
    numeroClase: '14835', componente: 'Teoria',
    instructor: 'José de Jesús Soto Padilla', dias: [],
  },
];

console.log('== 1148C Bases de Datos: presencial Lun/Mié + remoto Vie ==');
const [bd] = mergeWeeklyRows(basesDeDatosRows, identifiers);

check('modalidad de la materia es mixta', bd.modalidad, 'mixta');
check('conserva los tres días', bd.dias, ['Lunes', 'Miércoles', 'Viernes']);
check('produce dos sesiones distintas', bd.sesiones.length, 2);

const presencial = bd.sesiones.find((s) => s.modalidad === 'presencial');
const remota = bd.sesiones.find((s) => s.modalidad === 'en_linea');

check('sesión presencial existe', Boolean(presencial), true);
check('sesión presencial = Lun y Mié', presencial?.dias, ['Lunes', 'Miércoles']);
check('sesión presencial en LM0712', presencial?.ubicacion, 'LM0712');
check('sesión remota existe', Boolean(remota), true);
check('sesión remota = solo Viernes', remota?.dias, ['Viernes']);
check('sesión remota marcada Remoto', remota?.ubicacion, 'Remoto');
check('ninguna sesión hereda mixta', bd.sesiones.every((s) => s.modalidad !== 'mixta'), true);

// Control: una materia genuinamente 100% remota debe seguir dando en_linea,
// no mixta. 1190M Matemáticas Computacionales es así en el horario real.
console.log('');
console.log('== 1190M Matematicas Computacionales: remoto los tres días ==');
const todoRemotoRows = ['Lunes', 'Miércoles', 'Viernes'].map((dia) => ({
  codigoRaw: 'M 1190M', seccion: '1024', componente: 'Teoria',
  horaInicio: '16:00', horaFin: '18:00', dias: [dia],
  ubicacion: 'Remoto', esEnLinea: true,
}));
const [mc] = mergeWeeklyRows(todoRemotoRows, [
  { codigo: '1190M', nombre: 'Matematicas Computacionales', seccion: '1024', numeroClase: '14750', dias: [] },
]);
check('modalidad en_linea (no mixta)', mc.modalidad, 'en_linea');
check('una sola sesión', mc.sesiones.length, 1);
check('sesión cubre los tres días', mc.sesiones[0].dias, ['Lunes', 'Miércoles', 'Viernes']);

// Control: materia 100% presencial.
console.log('');
console.log('== 1147C Estructuras de Datos: presencial los dos días ==');
const todoPresencialRows = ['Martes', 'Jueves'].map((dia) => ({
  codigoRaw: 'C 1147C', seccion: '1027', componente: 'Teoria',
  horaInicio: '14:00', horaFin: '15:30', dias: [dia],
  ubicacion: 'LM0711', esEnLinea: false,
}));
const [ed] = mergeWeeklyRows(todoPresencialRows, [
  { codigo: '1147C', nombre: 'Estructuras de Datos', seccion: '1027', numeroClase: '14832', dias: [] },
]);
check('modalidad presencial', ed.modalidad, 'presencial');
check('una sola sesión', ed.sesiones.length, 1);
check('ubicación LM0711', ed.sesiones[0].ubicacion, 'LM0711');

// Control: mismo horario, dos salones presenciales distintos → dos sesiones.
console.log('');
console.log('== Dos salones presenciales distintos a la misma hora ==');
const dosSalonesRows = [
  { codigoRaw: 'C 9999C', seccion: '1000', componente: 'Teoria', horaInicio: '10:00', horaFin: '11:00', dias: ['Lunes'], ubicacion: 'AM0101', esEnLinea: false },
  { codigoRaw: 'C 9999C', seccion: '1000', componente: 'Teoria', horaInicio: '10:00', horaFin: '11:00', dias: ['Martes'], ubicacion: 'LM0202', esEnLinea: false },
];
const [dos] = mergeWeeklyRows(dosSalonesRows, [
  { codigo: '9999C', nombre: 'Materia Dos Salones', seccion: '1000', numeroClase: '99999', dias: [] },
]);
check('sigue siendo presencial', dos.modalidad, 'presencial');
check('dos sesiones (una por salón)', dos.sesiones.length, 2);

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
