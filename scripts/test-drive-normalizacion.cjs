// Normalización y clasificación de links de Drive. Sin red: valida qué URL se
// arma para cada forma de link, y si lo que volvió es el archivo o una pantalla
// de Google.
//
// Uso: node scripts/test-drive-normalizacion.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const drive = require('../electron/handlers/drive.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

// Ids reales de la caché: los dos que aparecen en consignas y uno de Redes, que
// es el que está restringido.
const ID_A02 = '16kys9eSgQwXxW6ddWD41Q9o7luJliPQl';
const ID_A01 = '1-YKG9qb6OqpVPev1zJcRMKT0yWd5cFBh';
const ID_REDES = '1UozoP2bz0tI201DOaiL__6DLsSFE_6y6';

const descarga = (id) => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

console.log('== Un solo template para todo binario, salga de la forma que salga ==');
const a02 = drive.normalizeDriveLink(`https://drive.google.com/file/d/${ID_A02}/view?usp=sharing`);
check('/file/d/<id>/view es binario', a02.kind, 'binario');
check('saca el id', a02.fileId, ID_A02);
check('arma la URL canónica', a02.fetchUrl, descarga(ID_A02));
check('?usp=drive_link da lo mismo', drive.normalizeDriveLink(`https://drive.google.com/file/d/${ID_A01}/view?usp=drive_link`).fetchUrl, descarga(ID_A01));
check('/open?id=', drive.normalizeDriveLink(`https://drive.google.com/open?id=${ID_A01}`).fetchUrl, descarga(ID_A01));
check('/uc?export=download&id=', drive.normalizeDriveLink(`https://drive.google.com/uc?export=download&id=${ID_A01}`).fetchUrl, descarga(ID_A01));
check('una URL ya canónica se queda igual', drive.normalizeDriveLink(descarga(ID_A01)).fetchUrl, descarga(ID_A01));
check('/file/d/<id>/preview', drive.normalizeDriveLink(`https://drive.google.com/file/d/${ID_A01}/preview`).fetchUrl, descarga(ID_A01));

console.log('');
console.log('== La trampa: un login con el Drive enterrado en continue= ==');
// Está de verdad en material.json. El parseDriveId de material.js le saca el id
// igual, porque su guard no está anclado al host: si se pidiera ese href, se
// guardaría la pantalla de sesión de Google creyendo que es el PDF.
const TRAMPA = `https://accounts.google.com/v3/signin/identifier?continue=https://drive.google.com/file/d/${ID_REDES}/view?usp%3Ddrive_link&followup=https://drive.google.com/file/d/${ID_REDES}/view?usp%3Ddrive_link&osid=1&passive=1209600`;
check('no es un archivo', drive.normalizeDriveLink(TRAMPA).kind, 'no_es_archivo');
check('y se dice por qué', drive.normalizeDriveLink(TRAMPA).motivo, 'login');
check('no devuelve fetchUrl', drive.normalizeDriveLink(TRAMPA).fetchUrl, undefined);

console.log('');
console.log('== Docs nativos: otro endpoint, otro formato por tipo ==');
const doc = drive.normalizeDriveLink('https://docs.google.com/document/d/1qHOgrf9jdXTlfRsP1hQ92v_ESsqcPioqHb5EUb3dbUI/edit');
check('un Doc es documento', doc.kind, 'documento');
check('exporta en forma de query, no de path', doc.fetchUrl, 'https://docs.google.com/document/d/1qHOgrf9jdXTlfRsP1hQ92v_ESsqcPioqHb5EUb3dbUI/export?format=pdf');
check('un Sheet sale en csv', drive.normalizeDriveLink('https://docs.google.com/spreadsheets/d/1qHOgrf9jdXTlfRsP1hQ92v_ESsqcPioqHb5EUb3dbUI/edit').formato, 'csv');
check('un Slides sale en pdf', drive.normalizeDriveLink('https://docs.google.com/presentation/d/1qHOgrf9jdXTlfRsP1hQ92v_ESsqcPioqHb5EUb3dbUI/edit').formato, 'pdf');
check('se puede pedir markdown para el modelo', drive.normalizeDriveLink('https://docs.google.com/document/d/1qHOgrf9jdXTlfRsP1hQ92v_ESsqcPioqHb5EUb3dbUI/edit', { formato: 'markdown' }).fetchUrl, 'https://docs.google.com/document/d/1qHOgrf9jdXTlfRsP1hQ92v_ESsqcPioqHb5EUb3dbUI/export?format=markdown');

console.log('');
console.log('== Lo que no se pide nunca ==');
const motivo = (url) => drive.normalizeDriveLink(url).motivo;
check('carpeta', motivo('https://drive.google.com/drive/folders/0B7EVK8r0v71pWEZsZE9oNnFzTm8'), 'carpeta');
check('formulario', motivo('https://docs.google.com/forms/d/e/1FAIpQLSf_ejemplo_de_formulario/viewform'), 'formulario');
check('forms.gle', motivo('https://forms.gle/abcdefghijkLMNOP'), 'host_no_permitido');
check('meet no es material', motivo('https://meet.google.com/snm-kqct-rtk'), 'host_no_permitido');
check('otro host cualquiera', motivo('https://ejemplo.com/algo.pdf'), 'host_no_permitido');
check('onedrive tampoco', motivo('https://itson-my.sharepoint.com/personal/x/Documents/a.pdf'), 'host_no_permitido');
check('drive sin id', motivo('https://drive.google.com/'), 'sin_id');
check('no es URL', motivo('no soy una url'), 'url_invalida');
check('vacío', motivo(''), 'sin_url');
check('null', motivo(null), 'sin_url');

console.log('');
console.log('== Detalles que muerden ==');
// Los links que salen de instruccionesMarkdown llegan pegados a la puntuación.
check('URL pegada al markdown', drive.normalizeDriveLink(`https://drive.google.com/file/d/${ID_A02}/view?usp=sharing).`).fetchUrl, descarga(ID_A02));
const conKey = drive.normalizeDriveLink(`https://drive.google.com/file/d/${ID_A01}/view?usp=sharing&resourcekey=0-AbCdEfGhIjKlMnOpQrStUv`);
check('conserva el resourcekey', conKey.resourcekey, '0-AbCdEfGhIjKlMnOpQrStUv');
check('y lo pasa a la URL', conKey.fetchUrl.includes('resourcekey=0-AbCdEfGhIjKlMnOpQrStUv'), true);
check('sin resourcekey queda en null', drive.normalizeDriveLink(`https://drive.google.com/file/d/${ID_A01}/view`).resourcekey, null);
// Los ids viejos "0B..." de 28 caracteres siguen vivos en Drive.
check('id legacy de 28 chars', drive.normalizeDriveLink('https://drive.google.com/file/d/0B7EVK8r0v71pZjFTYXZWM3FlRnM/view').fileId, '0B7EVK8r0v71pZjFTYXZWM3FlRnM');

console.log('');
console.log('== Clasificar la respuesta: el status NO alcanza ==');
const PDF = Buffer.from('%PDF-1.7\n', 'latin1');
const HTML = Buffer.from('<!DOCTYPE html><html><head>', 'latin1');
const respuesta = (url, status, contentType) => ({ url, status, headers: { get: (k) => (k.toLowerCase() === 'content-type' ? contentType : null) } });

check(
  'PDF público',
  drive.classifyDriveResponse(respuesta(descarga(ID_A02), 200, 'application/octet-stream'), PDF).ok,
  true,
);
// El caso que arruina todo: 200, no 403.
const restringido = drive.classifyDriveResponse(respuesta('https://accounts.google.com/v3/signin/identifier?continue=x', 200, 'text/html; charset=utf-8'), HTML);
check('restringido devuelve 200 y aun así no pasa', restringido.ok, false);
check('y se llama por su nombre', restringido.motivo, 'requiere_sesion');
check('borrado', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 404, 'text/html'), HTML).motivo, 'no_existe');
check('interstitial de virus scan', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 200, 'text/html'), HTML).motivo, 'html');
check('doc nativo contra el endpoint binario', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 500, 'text/html'), Buffer.alloc(0)).motivo, 'tipo_incorrecto');
check('con Range da 416, mismo caso', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 416, 'text/html'), Buffer.alloc(0)).motivo, 'tipo_incorrecto');
check('archivo subido contra /export', drive.classifyDriveResponse(respuesta('https://docs.google.com/document/d/x/export?format=pdf', 400, 'text/html'), HTML).motivo, 'tipo_incorrecto');
check('un host que no esperábamos', drive.classifyDriveResponse(respuesta('https://cualquier.cosa.com/x', 200, 'application/pdf'), PDF).motivo, 'host_inesperado');
// Content-Type miente a veces; el cuerpo no.
check('HTML disfrazado de binario', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 200, 'application/octet-stream'), HTML).motivo, 'html');
check('206 del Range vale igual que 200', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 206, 'application/octet-stream'), PDF).ok, true);
// Un csv o un markdown no tienen firma: no puede ser un rechazo.
const csv = drive.classifyDriveResponse(respuesta('https://doc-0g-3c-docstext.googleusercontent.com/x', 200, 'text/csv'), Buffer.from('a,b,c\n1,2,3'));
check('un export de texto pasa', csv.ok, true);
check('pero avisa que no tiene firma', csv.magicConocido, false);
check('un PDF sí tiene firma', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 200, 'application/octet-stream'), PDF).magicConocido, true);
check('un zip también', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 200, 'application/octet-stream'), Buffer.from([0x50, 0x4b, 0x03, 0x04])).magicConocido, true);

// MEDIDO en Electron 42: el net stack NO sigue el redirect al login y devuelve
// 401 con ~1.7 KB, mientras que curl lo sigue y termina en 200 con ~900 KB de
// HTML. Los dos tienen que caer en el mismo estado.
check('401 es sesion, no un error generico', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 401, 'text/html'), HTML).motivo, 'requiere_sesion');
check('403 tambien', drive.classifyDriveResponse(respuesta(descarga(ID_A02), 403, 'text/html'), HTML).motivo, 'requiere_sesion');

// Electron deja respuesta.url vacio SIEMPRE. Sin el fallback, todo caia en
// url_invalida y no se resolvia un solo archivo.
const sinUrl = { url: '', status: 200, headers: { get: () => 'application/octet-stream' } };
check('sin respuesta.url no se rinde', drive.classifyDriveResponse(sinUrl, PDF, { urlPedida: descarga(ID_A02) }).ok, true);
check('y sin nada de donde agarrarse, falla', drive.classifyDriveResponse(sinUrl, PDF).motivo, 'url_invalida');
check('la urlPedida tambien pasa por el allowlist', drive.classifyDriveResponse(sinUrl, PDF, { urlPedida: 'https://cualquier.cosa.com/x' }).motivo, 'host_inesperado');

console.log('');
console.log('== El nombre del archivo ==');
// Drive manda UTF-8 crudo entre comillas y sin filename*. Node lee los headers
// como latin1, así que llega mojibake y hay que repararlo.
const REAL = 'Asignación 02 - Implementación de Tipos de Datos Abstractos.pdf';
const comoLoLeeNode = Buffer.from(`attachment; filename="${REAL}"`, 'utf8').toString('latin1');
check('el header llega mojibake', comoLoLeeNode.includes('AsignaciÃ³n'), true);
check('y se repara', drive.parseContentDisposition(comoLoLeeNode), REAL);
check('docs manda filename* y ese gana', drive.parseContentDisposition("attachment; filename=\"CET support.txt\"; filename*=UTF-8''CET%20support%20in%20Chrome%20%28Windows%29.txt"), 'CET support in Chrome (Windows).txt');
// Electron SI decodifica los headers como UTF-8, asi que el nombre llega bien.
// Repararlo igual lo convertia en basura: la reparacion tiene que ser condicional.
check('un header ya correcto no se toca', drive.parseContentDisposition(`attachment; filename="${REAL}"`), REAL);
check('ni uno con enie', drive.parseContentDisposition('attachment; filename="Diseno de senales.pdf"'), 'Diseno de senales.pdf');
check('sin comillas', drive.parseContentDisposition('attachment; filename=simple.pdf'), 'simple.pdf');
check('header vacío', drive.parseContentDisposition(''), '');

console.log('');
console.log('== Corpus real: todos los links de Google que hay en la caché ==');
const userData = process.env.DVPOTRO_USER_DATA || path.join(os.homedir(), 'AppData', 'Roaming', 'dvpotro');

function leerCache(nombre) {
  try {
    return JSON.parse(fs.readFileSync(path.join(userData, nombre), 'utf8'));
  } catch (_error) {
    return null;
  }
}

const actividades = leerCache('actividades-cache.json');
const material = leerCache('material.json');

if (!actividades && !material) {
  console.log('SKIP  no hay caché en ' + userData);
} else {
  const urls = new Set();

  for (const actividad of actividades?.actividades || []) {
    for (const enlace of actividad.enlaces || []) {
      if (enlace.tipo === 'google') urls.add(enlace.url);
    }
  }

  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) return nodo.forEach(recorrer);
    for (const [clave, valor] of Object.entries(nodo)) {
      if (typeof valor === 'string' && /^https?:\/\/[^/]*google\.com/.test(valor)) urls.add(valor);
      else if (typeof valor === 'object') recorrer(valor);
      void clave;
    }
  };
  recorrer(material);

  const resueltos = [...urls].map((url) => ({ url, resultado: drive.normalizeDriveLink(url) }));
  const binarios = resueltos.filter((r) => r.resultado.kind === 'binario');
  const descartados = resueltos.filter((r) => r.resultado.kind === 'no_es_archivo');

  console.log(`      ${urls.size} URLs de Google en la caché: ${binarios.length} binarios, ${descartados.length} descartados`);

  check('ningún fetchUrl apunta fuera del host de descarga', binarios.every((r) => r.resultado.fetchUrl.startsWith(drive.GOOGLE.DESCARGA)), true);
  check('todo binario trae id', binarios.every((r) => r.resultado.fileId && r.resultado.fileId.length >= 20), true);
  check('ningún login se coló como archivo', resueltos.filter((r) => r.url.includes('accounts.google.com')).every((r) => r.resultado.motivo === 'login'), true);
  check('los meet quedan afuera', resueltos.filter((r) => r.url.includes('meet.google.com')).every((r) => r.resultado.kind === 'no_es_archivo'), true);

  const idsDeActividades = [...urls]
    .filter((u) => u.includes('/file/d/'))
    .map((u) => drive.normalizeDriveLink(u).fileId);
  check('los ids no se repiten mal ni se pisan', new Set(idsDeActividades).size, idsDeActividades.length > 0 ? new Set(idsDeActividades).size : 0);

  const motivos = {};
  for (const r of descartados) motivos[r.resultado.motivo] = (motivos[r.resultado.motivo] || 0) + 1;
  console.log('      descartes por motivo: ' + (JSON.stringify(motivos) || '{}'));
}

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
