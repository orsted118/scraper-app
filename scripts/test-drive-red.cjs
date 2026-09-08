// Descarga real de Drive, adentro de Electron. CON RED.
//
// Este script existe porque la clasificación se diseñó sobre lo que hacía curl, y
// en Electron NO es lo mismo. Lo que se midió acá, contra ids reales:
//
//   - `respuesta.url` viene SIEMPRE vacío y `redirected` siempre false, tanto en
//     session.fetch como en net.fetch. El chequeo de host final, tal como estaba
//     escrito, no resolvía un solo archivo: todo caía en url_invalida.
//   - Electron no sigue el redirect al login. Un archivo restringido devuelve 401
//     con ~1.7 KB desde el propio host de descarga, en vez del 200 con ~900 KB de
//     accounts.google.com que ve curl.
//   - Los headers los decodifica como UTF-8, así que el nombre del profe llega
//     limpio. Repararlo de latin1 incondicionalmente lo rompía.
//
// Si algo de esto cambia en una versión futura de Electron, este test lo agarra.
//
// Uso: npx electron scripts/test-drive-red.cjs
const os = require('os');
const path = require('path');
const { app } = require('electron');

// Sandbox: este test no debe tocar la instalación real.
app.setPath('userData', path.join(os.tmpdir(), 'dvpotro-drive-red'));

const drive = require('../electron/handlers/drive.js');

// Ids reales de la caché.
const PUBLICO_A02 = '16kys9eSgQwXxW6ddWD41Q9o7luJliPQl';
const PUBLICO_A01 = '1-YKG9qb6OqpVPev1zJcRMKT0yWd5cFBh';
const RESTRINGIDO = '1UozoP2bz0tI201DOaiL__6DLsSFE_6y6';
const BORRADO = '1F3c2nv9_OayKUzY5FDox7iE98mdQxA0U';

const link = (id) => `https://drive.google.com/file/d/${id}/view?usp=sharing`;

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

async function bajar(id) {
  const normalizado = drive.normalizeDriveLink(link(id));
  return drive.fetchDrive(normalizado.fetchUrl);
}

app.whenReady().then(async () => {
  console.log('== EL supuesto: net.fetch de Electron y el host final ==');

  const restringido = await bajar(RESTRINGIDO);
  console.log(`      host final del restringido: ${restringido.url || '(sin url)'}`);
  check('un archivo restringido no pasa', restringido.ok, false);
  check('y se detecta como sesión, no como error genérico', restringido.motivo, 'requiere_sesion');
  // MEDIDO acá: Electron NO sigue el redirect al login. Se queda en el host de
  // descarga y devuelve 401. curl, que sí lo sigue, termina en accounts.google.com
  // con status 200. Los dos casos tienen que dar requiere_sesion, y por eso la
  // clasificación no puede apoyarse sólo en el host ni sólo en el status.
  check('no redirige: se queda en el host de descarga', String(restringido.url || '').startsWith('https://drive.usercontent.google.com/'), true);
  check('respuesta.url viene vacío, así que se usó la URL pedida', restringido.url, drive.normalizeDriveLink(link(RESTRINGIDO)).fetchUrl);

  console.log('');
  console.log('== Los dos PDFs que están de verdad en las consignas ==');

  for (const [etiqueta, id] of [['Asignación 01', PUBLICO_A01], ['Asignación 02', PUBLICO_A02]]) {
    const bajada = await bajar(id);
    check(`${etiqueta} baja anónimo`, bajada.ok, true);
    if (!bajada.ok) continue;
    check(`${etiqueta} es un PDF de verdad`, bajada.buffer.slice(0, 5).toString('latin1'), '%PDF-');
    check(`${etiqueta} tiene firma conocida`, bajada.magicConocido, true);
    check(`${etiqueta} llega con el nombre del profe`, bajada.nombre.toLowerCase().endsWith('.pdf'), true);
    // Si esto sale mojibake, el arreglo de latin1 no se aplicó.
    check(`${etiqueta} sin mojibake en el nombre`, /Ã|Â/.test(bajada.nombre), false);
    console.log(`      ${bajada.bytes} bytes — ${bajada.nombre}`);
  }

  console.log('');
  console.log('== Un archivo que el profe borró ==');
  const borrado = await bajar(BORRADO);
  check('no existe', borrado.motivo, 'no_existe');

  console.log('');
  console.log('== La cola completa, de punta a punta ==');
  const actividades = [
    { id: '4-64090-1', enlaces: [{ tipo: 'google', texto: 'Enlace a la', url: link(PUBLICO_A01) }] },
    { id: '5-64090-2', enlaces: [{ tipo: 'google', texto: 'Enlace a la', url: link(PUBLICO_A02) }] },
    { id: 'x-restringida', enlaces: [{ tipo: 'google', texto: 'Tema', url: link(RESTRINGIDO) }] },
    { id: 'x-carpeta', enlaces: [{ tipo: 'google', texto: 'Carpeta', url: 'https://drive.google.com/drive/folders/0B7EVK8r0v71pWEZsZE9oNnFzTm8' }] },
  ];

  const resultado = await drive.resolveLinksForActivities(actividades);
  check('la cola termina bien', resultado.ok, true);
  check('resuelve los dos públicos', resultado.resueltos, 2);
  check('la carpeta no cuenta como link a resolver', resultado.total, 3);

  const indice = drive.readIndice();
  check('el índice guarda tres entradas', Object.keys(indice.archivos).length, 3);
  check('el público quedó ok', indice.archivos[PUBLICO_A02].estado, 'ok');
  check('el restringido quedó marcado', indice.archivos[RESTRINGIDO].estado, 'requiere_sesion');
  check('el archivo está en disco', require('fs').existsSync(indice.archivos[PUBLICO_A02].ruta), true);
  check('se extrajo el texto', (indice.archivos[PUBLICO_A02].palabras || 0) > 50, true);

  const texto = drive.leerTexto(indice.archivos[PUBLICO_A02]);
  check('el texto es el de la consigna', texto.includes('BolsaException'), true);

  console.log('');
  console.log('== Segunda corrida: no vuelve a pedir nada ==');
  const otraVez = await drive.resolveLinksForActivities(actividades);
  check('nada por resolver', otraVez.resueltos, 0);
  check('y el restringido no se reintenta', indice.archivos[RESTRINGIDO].estado, 'requiere_sesion');

  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  app.exit(failures === 0 ? 0 : 1);
});
