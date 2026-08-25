// Cobertura de la detección de modalidad a distancia.
//
// Regla de diseño que estos casos protegen: un falso positivo (marcar remota
// una clase presencial) hace que el alumno falte; un falso negativo solo lo
// manda al campus de gusto. Por eso los indicios débiles quedan bloqueados
// cuando la celda declara un salón físico.
//
// Uso: node scripts/test-modalidad-deteccion.cjs
const { inferModalidad } = require('../electron/handlers/horario.js');

let failures = 0;

function expect(texto, esperado, nota) {
  const actual = inferModalidad(texto);
  const ok = actual === esperado;
  if (!ok) failures += 1;
  const marca = ok ? 'PASS' : 'FAIL';
  console.log(`${marca}  ${esperado.padEnd(10)} <- "${texto}"${nota ? '   // ' + nota : ''}`);
  if (!ok) console.log(`        obtenido: ${actual}`);
}

console.log('== Nivel 1: texto real del portal ITSON (siempre remoto) ==');
expect('Curso a distancia con herramientas de Internet', 'en_linea', 'caso verificado');
expect('CURSO A DISTANCIA CON HERRAMIENTAS DE INTERNET', 'en_linea', 'mayúsculas');
expect('curso a distancia con herramientas de internet', 'en_linea', 'minúsculas');

console.log('');
console.log('== Presencial real del portal ==');
expect('Centro Integral de Tecnologia LM0712', 'presencial', 'caso verificado');
expect('AM0224', 'presencial', 'solo código de salón');
expect('Aulas', 'presencial', 'placeholder sin info');
expect('', 'presencial', 'vacío');

console.log('');
console.log('== Nivel 2: indicios SIN salón declarado -> remoto ==');
expect('Clase en línea', 'en_linea', 'acentuado');
expect('Clase en linea', 'en_linea', 'sin acento');
expect('Modalidad virtual', 'en_linea');
expect('Curso remoto', 'en_linea');
expect('Clase remota', 'en_linea');
expect('Educación a distancia', 'en_linea');
expect('Online', 'en_linea');
expect('No presencial', 'en_linea');

console.log('');
console.log('== Nivel 2 BLOQUEADO por salón físico (protege de faltar a clase) ==');
expect('Aula Virtual LM0301', 'presencial', 'salón que se llama Virtual');
expect('Laboratorio Virtual AM0105', 'presencial');
expect('Sala Remota LM0712', 'presencial');
expect('Aula Online AM0224', 'presencial');

console.log('');
console.log('== Nivel 1 NO se bloquea aunque haya código (evidencia fuerte) ==');
expect('Curso a distancia con herramientas de Internet LM0712', 'en_linea', 'nivel 1 gana');

console.log('');
console.log('== Palabras excluidas a propósito: salas físicas de AV ==');
expect('Sala de Videoconferencia', 'presencial', 'sala física, NO debe dar remoto');
expect('Sala Zoom', 'presencial', 'sala física');
expect('Aula Teams', 'presencial', 'sala física');

console.log('');
console.log('== No confundir subcadenas ==');
expect('Linea de Produccion AM0110', 'presencial', '"linea" suelto no cuenta');
expect('Centro Integral de Tecnologia', 'presencial', 'sin código, sin indicios');

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
