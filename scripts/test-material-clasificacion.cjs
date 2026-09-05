// Clasificación y diff del módulo Material. Sin red: valida las reglas que
// deciden qué es material, qué es enlace vivo y qué es novedad.
//
// Uso: node scripts/test-material-clasificacion.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const fakeUserData = path.join(os.tmpdir(), 'dvpotro-material-test');
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: { app: { getPath: () => fakeUserData, on: () => {} }, ipcMain: { handle: () => {} }, shell: {}, dialog: {} },
};
fs.mkdirSync(fakeUserData, { recursive: true });

const material = require('../electron/handlers/material.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

console.log('== Drive: las tres formas de link que usa el portal ==');
check('/file/d/<id>/view', material.parseDriveId('https://drive.google.com/file/d/1M8GaWJdEl3Odlxi5nB1WepeqRSnH5DcN/view?usp=sharing'), '1M8GaWJdEl3Odlxi5nB1WepeqRSnH5DcN');
check('/open?id=<id>', material.parseDriveId('https://drive.google.com/open?id=1ABCDEFGHIJKLMNOPQRSTUVWXYZ012'), '1ABCDEFGHIJKLMNOPQRSTUVWXYZ012');
check('docs.google /d/<id>', material.parseDriveId('https://docs.google.com/presentation/d/1ABCDEFGHIJKLMNOPQRSTUVWXYZ012/edit'), '1ABCDEFGHIJKLMNOPQRSTUVWXYZ012');
check('un link cualquiera no es Drive', material.parseDriveId('https://ejemplo.com/algo.pdf'), null);

console.log('');
console.log('== Enlaces vivos: no son material, van arriba como acción rápida ==');
check('Google Meet', material.detectLiveLink('https://meet.google.com/snm-kqct-rtk'), 'meet');
check('Zoom cuenta como clase', material.detectLiveLink('https://us02web.zoom.us/j/123'), 'meet');
check('WhatsApp', material.detectLiveLink('https://chat.whatsapp.com/D2IrUAjqaorHFsanVT3Tng'), 'whatsapp');
check('Drive NO es enlace vivo', material.detectLiveLink('https://drive.google.com/file/d/abc/view'), null);

console.log('');
console.log('== Id de recurso estable entre syncs ==');
const url = 'https://ivirtual.itson.edu.mx/mod/url/view.php?id=1679947';
check('sale del cmid', material.resourceId(url), 'mod-1679947');
check('mismo módulo, mismo id', material.resourceId(url), material.resourceId(url));

console.log('');
console.log('== Ids de links sueltos: el bug que se comia 5 de 6 PDFs ==');
// La primera version recortaba un base64 del href a 20 chars, que solo cubre
// los ~15 primeros bytes. Todos los Drive empiezan igual y colisionaban.
const drives = [
  'https://drive.google.com/file/d/1l_-iihBjCfTi7fe1c0SW9s2p4T1IPcJK/view?usp=sharing',
  'https://drive.google.com/file/d/1gTgJhVms2Ch-eSadnMJFwkJPqBDTo3AH/view?usp=sharing',
  'https://drive.google.com/file/d/1C6T-sqfcUry3q-rYYHzpYOQKgUuhzXjw/view?usp=sharing',
  'https://drive.google.com/file/d/1F3c2nv9_OayKUzY5FDox7iE98mdQxA0U/view?usp=sharing',
  'https://drive.google.com/file/d/1q0P3iMSkKkomJCQWTeafSibjMekD0BA9/view?usp=sharing',
  'https://drive.google.com/file/d/1-YKG9qb6OqpVPev1zJcRMKT0yWd5cFBh/view?usp=sharing',
];
const ids = drives.map(material.resourceId);
check('6 Drive del mismo curso dan 6 ids distintos', new Set(ids).size, 6);
check('un modulo sigue usando su cmid', material.resourceId('https://ivirtual.itson.edu.mx/mod/url/view.php?id=1679947'), 'mod-1679947');
// El id de un link suelto no debe confundirse con el de un modulo aunque la
// URL traiga un ?id= numerico.
check('un link suelto con ?id= no finge ser modulo', material.resourceId('https://ejemplo.com/x?id=123').startsWith('url-'), true);

console.log('');
console.log('== Links sueltos -> recurso ==');
const drive = material.inlineLinkToResource({ nombre: 'Presentacion del Curso', href: drives[0], continuacion: false }, 'Semana 1');
check('un Drive suelto es tipo drive', drive.tipo, 'drive');
check('conserva el driveId', drive.driveId, '1l_-iihBjCfTi7fe1c0SW9s2p4T1IPcJK');
const archivo = material.inlineLinkToResource({ nombre: 'apunte.pdf', href: 'https://ivirtual.itson.edu.mx/pluginfile.php/1/a.pdf', continuacion: false }, 'S1');
check('un pluginfile suelto es tipo archivo', archivo.tipo, 'archivo');
const partido = material.inlineLinkToResource({ nombre: 'Estudia esos conceptos...', href: drives[3], continuacion: true }, 'Semana 1');
check('un link partido por Word se marca', partido.descripcion.includes('enlace partido'), true);

console.log('');
console.log('== Novedades ==');
const v1 = { materias: [{ id: '1', nombre: 'Redes', secciones: [{ titulo: 'S1', recursos: [{ id: 'mod-1', nombre: 'T1' }] }] }] };
const v2 = { materias: [{ id: '1', nombre: 'Redes', secciones: [{ titulo: 'S1', recursos: [{ id: 'mod-1', nombre: 'T1' }, { id: 'mod-2', nombre: 'T2' }] }] }] };
check('detecta el recurso nuevo', material.diffMaterial(v1, v2).map((n) => n.id), ['mod-2']);
check('trae la materia para el banner', material.diffMaterial(v1, v2)[0].materia, 'Redes');
check('sin cambios no hay novedades', material.diffMaterial(v2, v2), []);
// Sin esto, la primera sync marcaría el semestre entero como "nuevo" y el badge
// no querría decir nada.
check('primera sync no marca todo como nuevo', material.diffMaterial(null, v2), []);
check('caché vacío tampoco', material.diffMaterial({ materias: [] }, v2), []);

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
