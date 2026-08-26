// Validación local de archivos y construcción de URLs del portal.
//
// Uso: node scripts/test-upload-validacion.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

// El handler pide app/dialog/ipcMain de Electron. Se stubea antes de cargarlo
// para poder correr en Node puro.
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: { app: { on: () => {} }, dialog: {}, ipcMain: null },
};

const upload = require('../electron/handlers/assignment-upload.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-upload-test-'));
const crear = (nombre, bytes) => {
  const p = path.join(tmp, nombre);
  fs.writeFileSync(p, Buffer.alloc(bytes));
  return p;
};

const chico = crear('tarea.pdf', 1024);
const grande = crear('video.mp4', 6 * 1024 * 1024);
const docx = crear('reporte.docx', 2048);

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

// Límites reales medidos en A01 - TOPOLOGIAS del portal.
const infoReal = { maxBytes: 5242880, maxFiles: 20, acceptedTypes: [], archivosEnBorrador: [] };

console.log('== Archivo válido contra los límites reales del portal ==');
check('sin problemas', upload.validateFiles([chico], infoReal), []);

console.log('');
console.log('== Límite de tamaño (5 MB) ==');
const porTamano = upload.validateFiles([grande], infoReal);
check('reporta un problema', porTamano.length, 1);
check('menciona el archivo', porTamano[0].includes('video.mp4'), true);
check('menciona el límite', porTamano[0].includes('5.0 MB'), true);

console.log('');
console.log('== acceptedTypes vacío = cualquier extensión ==');
check('.docx pasa', upload.validateFiles([docx], infoReal), []);
check('.mp4 pasa por tipo (falla solo por peso)', upload.validateFiles([crear('clip.mp4', 512)], infoReal), []);

console.log('');
console.log('== acceptedTypes con restricción ==');
const soloPdf = { ...infoReal, acceptedTypes: ['.pdf'] };
check('.pdf permitido', upload.validateFiles([chico], soloPdf), []);
const rechazado = upload.validateFiles([docx], soloPdf);
check('.docx rechazado', rechazado.length, 1);
check('dice la extensión', rechazado[0].includes('.docx'), true);

console.log('');
console.log('== Límite de cantidad, contando lo que ya hay en el borrador ==');
const casiLleno = { ...infoReal, maxFiles: 2, archivosEnBorrador: ['previo.pdf'] };
check('uno más entra', upload.validateFiles([chico], casiLleno), []);
const sePasa = upload.validateFiles([chico, docx], casiLleno);
check('dos más se pasan', sePasa.length, 1);
check('menciona el total', sePasa[0].includes('3'), true);

console.log('');
console.log('== Archivo inexistente ==');
const fantasma = upload.validateFiles([path.join(tmp, 'no-existe.pdf')], infoReal);
check('lo reporta', fantasma.length, 1);
check('dice que no se encuentra', fantasma[0].includes('No se encuentra'), true);

console.log('');
console.log('== URLs del portal ==');
check(
  'view sin action',
  upload.buildViewUrl('https://ivirtual.itson.edu.mx/mod/assign/view.php?id=1679947&action=editsubmission'),
  'https://ivirtual.itson.edu.mx/mod/assign/view.php?id=1679947',
);

console.log('');
console.log('== Construcción de la URL de edición ==');
check(
  'agrega action=editsubmission',
  upload.buildEditUrl('https://ivirtual.itson.edu.mx/mod/assign/view.php?id=1679947'),
  'https://ivirtual.itson.edu.mx/mod/assign/view.php?id=1679947&action=editsubmission',
);
check('rechaza URL sin id', upload.buildEditUrl('https://ivirtual.itson.edu.mx/mod/assign/view.php'), null);
check('rechaza id no numérico', upload.buildEditUrl('https://ivirtual.itson.edu.mx/mod/assign/view.php?id=abc'), null);

fs.rmSync(tmp, { recursive: true, force: true });

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
