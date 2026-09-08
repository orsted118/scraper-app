// Cobertura del parseo de fechas de los portales ITSON.
//
// Regla de diseño que estos casos protegen: iVirtual en español escribe
// "lunes, 8 de septiembre de 2026, 23:59". `Date.parse` devuelve NaN con ese
// formato, y una fecha perdida no falla ruidosamente: la actividad simplemente
// deja de poder marcarse como retrasada y la card muestra la fecha en crudo sin
// aviso de urgencia.
//
// El main (CommonJS) y el renderer (ESM) tienen copias separadas del parser
// porque no pueden compartir módulo. Este archivo corre los mismos casos contra
// las dos y exige el mismo resultado, que es lo único que impide que se
// separen.
//
// Uso: node scripts/test-fechas.cjs
const { daysUntilDue, parseDueDate } = require('../electron/utils/dateParser.js');

let failures = 0;

const ts = (year, month, day, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();

const CASOS = [
  ['lunes, 8 de septiembre de 2026, 23:59', ts(2026, 9, 8, 23, 59), 'formato real de Moodle ES'],
  ['8 de septiembre de 2026, 23:59', ts(2026, 9, 8, 23, 59), 'sin día de la semana'],
  ['martes, 3 de marzo de 2026, 11:00', ts(2026, 3, 3, 11, 0), ''],
  ['15 de septiembre de 2026, a las 23:59', ts(2026, 9, 15, 23, 59), 'con "a las"'],
  ['1 de diciembre de 2026', ts(2026, 12, 1), 'sin hora'],
  ['30 de setiembre de 2026', ts(2026, 9, 30), 'variante sin p'],
  ['8 September 2026, 11:59 PM', ts(2026, 9, 8, 23, 59), 'Moodle en inglés'],
  ['Monday, 8 September 2026, 11:59 PM', ts(2026, 9, 8, 23, 59), 'inglés con día'],
  ['', null, 'vacío'],
  ['-', null, 'guion del portal'],
  ['Sin fecha visible', null, 'placeholder de la app'],
  ['no es una fecha', null, 'basura'],
  [null, null, 'null'],
  ['32 de enero de 2026', null, 'día imposible'],
  ['8 de brumario de 2026', null, 'mes inexistente'],
];


// Distancia en días de CALENDARIO. El bug que estos casos cierran: la card
// comparaba milisegundos ("¿faltan menos de 24h?") y anunciaba "Vence hoy" sobre
// una fecha límite que ella misma mostraba como el día siguiente.
// `now` fijo = jueves 3 de septiembre de 2026, 22:09 local.
const AHORA = ts(2026, 9, 3, 22, 9);

const CASOS_DIAS = [
  [ts(2026, 9, 3, 23, 59), 0, 'esta misma noche → hoy'],
  [ts(2026, 9, 3, 8, 0), 0, 'hoy pero ya pasó → hoy, no ayer'],
  [ts(2026, 9, 4, 0, 0), 1, 'medianoche de mañana → mañana (faltan 1h51m)'],
  [ts(2026, 9, 4, 17, 0), 1, 'el ACT04 del reporte: mañana 5pm, NO hoy'],
  [ts(2026, 9, 5, 0, 1), 2, 'pasado mañana apenas entrado'],
  [ts(2026, 9, 6, 23, 59), 3, 'tres días'],
  [ts(2026, 9, 2, 23, 59), -1, 'ayer'],
  [ts(2026, 8, 25, 12, 0), -9, 'retrasada nueve días'],
  [null, null, 'null'],
  [NaN, null, 'NaN'],
  ['no es un timestamp', null, 'basura'],
];

function compara(nombre, actual, esperado, nota) {
  const ok = actual === esperado;
  if (!ok) failures += 1;
  const legible = esperado === null ? 'null' : new Date(esperado).toLocaleString('es-MX');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nombre}${nota ? '   // ' + nota : ''}`);
  if (!ok) {
    console.log(`        esperado: ${legible}`);
    console.log(`        obtenido: ${actual === null ? 'null' : new Date(actual).toLocaleString('es-MX')}`);
  }
}

async function main() {
  console.log('== electron/utils/dateParser.js (main) ==');
  CASOS.forEach(([entrada, esperado, nota]) => {
    compara(JSON.stringify(entrada), parseDueDate(entrada), esperado, nota);
  });

  // `src/utils/fechas.js` es ESM: se carga con import dinámico desde este CJS.
  const { diasHastaVencimiento, parseFechaPortal } = await import('../src/utils/fechas.js');

  console.log('');
  console.log('== src/utils/fechas.js (renderer) ==');
  CASOS.forEach(([entrada, esperado, nota]) => {
    compara(JSON.stringify(entrada), parseFechaPortal(entrada), esperado, nota);
  });

  console.log('');
  console.log('== Los dos parsers no se separaron ==');
  CASOS.forEach(([entrada]) => {
    const main = parseDueDate(entrada);
    const renderer = parseFechaPortal(entrada);
    const ok = main === renderer;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  coinciden en ${JSON.stringify(entrada)}`);
    if (!ok) console.log(`        main=${main} renderer=${renderer}`);
  });


  console.log('');
  console.log('== Días de calendario (main) ==');
  CASOS_DIAS.forEach(([entrada, esperado, nota]) => {
    const actual = daysUntilDue(entrada, AHORA);
    const ok = actual === esperado;
    if (!ok) failures += 1;
    const etiqueta = entrada === null || Number.isNaN(entrada) || typeof entrada === 'string'
      ? JSON.stringify(entrada)
      : new Date(entrada).toLocaleString('es-MX');
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${etiqueta}${nota ? '   // ' + nota : ''}`);
    if (!ok) console.log(`        esperado: ${esperado}   obtenido: ${actual}`);
  });

  console.log('');
  console.log('== Días de calendario (renderer) ==');
  CASOS_DIAS.forEach(([entrada, esperado, nota]) => {
    const actual = diasHastaVencimiento(entrada, AHORA);
    const ok = actual === esperado;
    if (!ok) failures += 1;
    const etiqueta = entrada === null || Number.isNaN(entrada) || typeof entrada === 'string'
      ? JSON.stringify(entrada)
      : new Date(entrada).toLocaleString('es-MX');
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${etiqueta}${nota ? '   // ' + nota : ''}`);
    if (!ok) console.log(`        esperado: ${esperado}   obtenido: ${actual}`);
  });

  // El renderer también acepta un Date, que es lo que le pasan las cards.
  console.log('');
  console.log('== El renderer acepta Date además de timestamp ==');
  CASOS_DIAS.filter(([entrada]) => typeof entrada === 'number' && !Number.isNaN(entrada))
    .forEach(([entrada]) => {
      const conNumero = diasHastaVencimiento(entrada, AHORA);
      const conDate = diasHastaVencimiento(new Date(entrada), AHORA);
      const ok = conNumero === conDate;
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${new Date(entrada).toLocaleString('es-MX')}`);
      if (!ok) console.log(`        numero=${conNumero} date=${conDate}`);
    });

  console.log('');
  console.log('== Los dos contadores de días no se separaron ==');
  CASOS_DIAS.forEach(([entrada]) => {
    const main = daysUntilDue(entrada, AHORA);
    const renderer = diasHastaVencimiento(entrada, AHORA);
    const ok = main === renderer;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  coinciden en ${JSON.stringify(entrada)}`);
    if (!ok) console.log(`        main=${main} renderer=${renderer}`);
  });

  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('El test no pudo correr:', error?.message || error);
  process.exit(1);
});
