// Extracción de accepted_types contra el HTML REAL del portal, y matching de
// las cuatro sintaxis que Moodle admite.
//
// Uso: node scripts/test-accepted-types.cjs
const fs = require('fs');
const path = require('path');

require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: { app: { on: () => {} }, dialog: {}, ipcMain: null },
};

const upload = require('../electron/handlers/assignment-upload.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

// --- Réplica de la extracción que corre en page.evaluate ---------------------
// Mismo algoritmo que readSubmissionForm, aplicado al HTML guardado por el spike.
function readFilemanagerOptions(html) {
  const anchor = html.indexOf('M.form_filemanager.init');
  if (anchor === -1) return null;
  const start = html.indexOf('{', anchor);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { if (inString) escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch (_e) { return null; }
      }
    }
  }
  return null;
}

console.log('== HTML REAL del portal: la entrega que rechazaba PDFs válidos ==');
const capturas = path.join(__dirname, 'spike-output');
const dirs = fs.existsSync(capturas) ? fs.readdirSync(capturas) : [];
let htmlRestringido = null;

for (const dir of dirs) {
  const full = path.join(capturas, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (!f.startsWith('editsubmission-') || !f.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(full, f), 'utf8');
    const opts = readFilemanagerOptions(html);
    if (opts && Array.isArray(opts.accepted_types) && opts.accepted_types.length > 0) {
      htmlRestringido = { f, html, opts };
    }
  }
}

if (!htmlRestringido) {
  console.log('SKIP  no hay captura con restricción en scripts/spike-output/');
} else {
  const { f, html, opts } = htmlRestringido;
  console.log(`      captura: ${f}`);

  // El bug: el primer accepted_types del documento es del editor, no de la entrega.
  const primeroDelDocumento = JSON.parse((html.match(/accepted_types"\s*:\s*(\[[^\]]*\])/) || [])[1]);
  check('el regex viejo agarraba el picker del editor', primeroDelDocumento, ['.gif', '.jpe', '.jpeg', '.jpg', '.png', '.svg', '.svgz']);
  check('la entrega REAL acepta pdf/doc/docx', opts.accepted_types, ['.pdf', '.doc', '.docx']);
  check('el viejo rechazaba el .pdf', upload.isExtensionRejected('.pdf', primeroDelDocumento), true);
  check('el nuevo lo acepta', upload.isExtensionRejected('.pdf', opts.accepted_types), false);
  check('maxfiles sale del bloque de la entrega', Number(opts.maxfiles), 1);
}

console.log('');
console.log('== Las cuatro sintaxis de Moodle ==');
check('extensión con punto', upload.isExtensionRejected('.pdf', ['.pdf', '.doc']), false);
check('extensión sin punto', upload.isExtensionRejected('.pdf', ['pdf']), false);
check('grupo document acepta pdf', upload.isExtensionRejected('.pdf', ['document']), false);
check('grupo image rechaza pdf', upload.isExtensionRejected('.pdf', ['image']), true);
check('mimetype application/pdf', upload.isExtensionRejected('.pdf', ['application/pdf']), false);
check('comodín * acepta todo', upload.isExtensionRejected('.exe', ['*']), false);
check('lista mixta grupo + extensión', upload.isExtensionRejected('.zip', ['document', '.zip']), false);

console.log('');
console.log('== Ante la duda NO se bloquea: el portal es la autoridad ==');
check('grupo desconocido deja pasar', upload.isExtensionRejected('.pdf', ['sourcecode']), false);
check('mimetype no mapeado deja pasar', upload.isExtensionRejected('.pdf', ['image/*']), false);
check('token raro deja pasar', upload.isExtensionRejected('.pdf', ['???']), false);
check('un token ilegible anula la lista entera', upload.isExtensionRejected('.pdf', ['image', 'sourcecode']), false);
check('archivo sin extensión no se bloquea', upload.isExtensionRejected('', ['.pdf']), false);

console.log('');
console.log('== Rechazo legítimo: sólo con la lista entendida y sin match ==');
check('.exe contra pdf/doc/docx', upload.isExtensionRejected('.exe', ['.pdf', '.doc', '.docx']), true);
check('.pdf contra web_image', upload.isExtensionRejected('.pdf', ['web_image']), true);

console.log('');
console.log('== El mensaje dice qué SÍ se acepta ==');
check('expande el grupo', upload.describeAcceptedTypes(['web_image']).includes('.png'), true);
check('lista corta va completa', upload.describeAcceptedTypes(['.pdf', '.doc']), '.pdf, .doc');
check('lista larga se recorta', upload.describeAcceptedTypes(['document']).includes('y otros'), true);

console.log('');
console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
process.exit(failures === 0 ? 0 : 1);
