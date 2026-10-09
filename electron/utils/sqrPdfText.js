// Extrae texto de los PDFs que genera SQR (los informes de PeopleSoft).
//
// Por qué no pdf-parse ni pdf.js: los PDFs de SQR traen una tabla xref no
// estándar y ambos fallan con "bad XRef entry". Verificado: pdf.js abre la
// Boleta (ITSR0001) pero NO el Reporte de Progreso Académico (ITSR0003).
//
// Este extractor se saltea el xref por completo: infla cada stream FlateDecode
// y lee los operadores de texto de PostScript. Solo usa zlib de stdlib.

const zlib = require('zlib');

function inflarStreams(buf) {
  const salida = [];
  let i = 0;

  while (i < buf.length) {
    const inicio = buf.indexOf('stream', i);
    if (inicio === -1) break;

    // Después de "stream" viene CRLF o LF antes de los datos: hay que saltear
    // ambos o el inflate falla.
    let datos = inicio + 6;
    if (buf[datos] === 0x0d) datos += 1;
    if (buf[datos] === 0x0a) datos += 1;

    const fin = buf.indexOf('endstream', datos);
    if (fin === -1) break;

    try {
      salida.push(zlib.inflateSync(buf.subarray(datos, fin)).toString('latin1'));
    } catch (_error) {
      // Stream sin comprimir o imagen: no aporta texto.
    }

    i = fin + 9;
  }

  return salida;
}

function desescapar(texto) {
  return texto
    .replace(/\\(\d{1,3})/g, (_match, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\([()\\])/g, '$1');
}

// El texto vive en operadores `(...) Tj` y `[(...) n (...)] TJ`. El salto de
// línea lo marcan los operadores de posición (Td/TD/T*) y el fin de bloque ET.
function textoDeContenido(contenido) {
  const lineas = [];
  let actual = '';

  const tokens = contenido.match(/\((?:[^()\\]|\\.)*\)|T[djJdDm*]|ET|BT/g) || [];

  for (const token of tokens) {
    if (token.startsWith('(')) {
      actual += desescapar(token.slice(1, -1));
      continue;
    }

    if (/^(Td|TD|T\*|ET)$/.test(token) && actual.trim()) {
      lineas.push(actual.trim());
      actual = '';
    }
  }

  if (actual.trim()) lineas.push(actual.trim());

  return lineas;
}

function extraerTexto(buffer) {
  return inflarStreams(buffer).flatMap(textoDeContenido).join('\n');
}

module.exports = { extraerTexto };
