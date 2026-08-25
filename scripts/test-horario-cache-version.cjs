// Versionado del formato de la caché del horario.
//
// El TTL responde "¿está vieja?"; la versión responde "¿la generó un código que
// producía datos distintos?". Sin esto, un usuario con caché previa seguía
// viendo el bug de modalidad hasta 24 h después de actualizar, y el arreglo
// parecía no funcionar.
//
// Corre con un userData temporal para no tocar la caché real del usuario.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-cache-test-'));

// El handler pide app.getPath('userData') de Electron. Se stubea el módulo en
// el require cache antes de cargarlo, así corre en Node puro.
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: {
    app: { getPath: () => tempUserData, getVersion: () => '0.0.0-test' },
    ipcMain: null,
  },
};

const horario = require('../electron/handlers/horario.js');
const cachePath = horario.getHorarioCachePath();

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}  obtenido: ${JSON.stringify(actual)}`);
}

const materiaDemo = { codigo: '1148C', nombre: 'Bases de Datos', numeroClase: '14835', modalidad: 'mixta' };

console.log('== Escritura estampa la versión ==');
const written = horario.writeHorarioCache({ materias: [materiaDemo], diasConClases: ['Lunes'] });
check('payload escrito trae schemaVersion', typeof written.schemaVersion, 'number');
const onDisk = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
check('el archivo lo persiste', typeof onDisk.schemaVersion, 'number');
const CURRENT = onDisk.schemaVersion;
console.log(`        (versión actual del formato: ${CURRENT})`);

console.log('');
console.log('== Caché de la versión actual se lee ==');
const readOk = horario.readHorarioCache();
check('devuelve la caché', Array.isArray(readOk?.materias), true);
check('conserva la materia', readOk?.materias?.[0]?.codigo, '1148C');

console.log('');
console.log('== Caché de una versión anterior se descarta ==');
fs.writeFileSync(
  cachePath,
  JSON.stringify({ materias: [materiaDemo], diasConClases: [], timestamp: Date.now(), schemaVersion: CURRENT - 1 }, null, 2),
  'utf8',
);
check('readHorarioCache devuelve null', horario.readHorarioCache(), null);
check('y borra el archivo', fs.existsSync(cachePath), false);

console.log('');
console.log('== Caché SIN versión (anterior al versionado) se descarta ==');
fs.writeFileSync(
  cachePath,
  JSON.stringify({ materias: [materiaDemo], diasConClases: [], timestamp: Date.now() }, null, 2),
  'utf8',
);
check('readHorarioCache devuelve null', horario.readHorarioCache(), null);
check('y borra el archivo', fs.existsSync(cachePath), false);

console.log('');
console.log('== Caché fresca pero de formato viejo NO sobrevive por TTL ==');
fs.writeFileSync(
  cachePath,
  JSON.stringify({ materias: [materiaDemo], diasConClases: [], timestamp: Date.now(), schemaVersion: 1 }, null, 2),
  'utf8',
);
// timestamp de hace un segundo: el TTL (24 h) la daría por válida.
check('igual se descarta', horario.readHorarioCache(), null);

fs.rmSync(tempUserData, { recursive: true, force: true });

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
