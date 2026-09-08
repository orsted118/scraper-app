// Verifica copiar/guardar imágenes de una nota y, sobre todo, el cerco de rutas
// que las habilita. Correr: npx electron scripts/test-notes-image-actions.cjs
//
// Lo que protege: `resolveAttachmentPath` traduce un src que MANDA EL RENDERER a
// un path del disco que el main lee y copia. Si el cerco se afloja, una nota
// importada con un <img src> apuntando a cualquier lado convierte "copiar
// imagen" en un lector de archivos arbitrarios.
const fs = require('fs');
const path = require('path');
const { app, clipboard } = require('electron');

require('../electron/handlers/notes').registerNoteImageScheme();

let failures = 0;
const check = (name, condition, detail = '') => {
  if (!condition) failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

// PNG rojo de 1x1: nativeImage tiene que poder decodificarlo.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// Gemelo de `buildNoteImageUrl` del renderer (NoteEditorModal.jsx): el src que
// llega por IPC se arma así, y el test tiene que ejercitar ese formato exacto.
function buildNoteImageUrl(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  return `dvpotro-note-img://${normalized.startsWith('/') ? '' : '/'}${encodeURI(normalized)}`;
}

async function main() {
  const notes = require('../electron/handlers/notes');
  const userData = app.getPath('userData');

  fs.rmSync(path.join(userData, 'notes.json'), { force: true });
  fs.rmSync(path.join(userData, 'notes-attachments'), { recursive: true, force: true });
  fs.rmSync(path.join(userData, 'notes-attachments-otro'), { recursive: true, force: true });

  const note = notes.createNote({ title: 'Con imagen' });
  const attached = notes.attachImage(note.id, PNG, 'captura del portal.png', 'image/png');
  const real = attached.attachment.path;

  // ── 1. Rutas que SÍ resuelven ─────────────────────────────────
  check('resuelve el src dvpotro-note-img:// del renderer',
    notes.resolveAttachmentPath(buildNoteImageUrl(real)) === real);
  check('resuelve también el path crudo',
    notes.resolveAttachmentPath(real) === real);
  check('el src con espacios codificados (%20) resuelve',
    buildNoteImageUrl(real).includes('%') === false || notes.resolveAttachmentPath(buildNoteImageUrl(real)) === real);

  // ── 2. Rutas que NO deben resolver ────────────────────────────
  const outside = path.join(userData, 'notes.json');
  check('rechaza un archivo fuera de notes-attachments',
    notes.resolveAttachmentPath(buildNoteImageUrl(outside)) === null);

  // El fix del path.sep: sin él este hermano pasaba el startsWith.
  const siblingDir = path.join(userData, 'notes-attachments-otro');
  fs.mkdirSync(siblingDir, { recursive: true });
  const sibling = path.join(siblingDir, 'ajeno.png');
  fs.writeFileSync(sibling, PNG);
  check('rechaza el directorio hermano notes-attachments-otro',
    notes.resolveAttachmentPath(buildNoteImageUrl(sibling)) === null);

  const traversal = path.join(notes.getAttachmentsDir(note.id), '..', '..', 'notes.json');
  check('rechaza traversal con ..',
    notes.resolveAttachmentPath(buildNoteImageUrl(traversal)) === null);

  const notAnImage = path.join(notes.getAttachmentsDir(note.id), 'datos.json');
  fs.writeFileSync(notAnImage, '{}');
  check('rechaza extensión no-imagen aunque esté adentro',
    notes.resolveAttachmentPath(buildNoteImageUrl(notAnImage)) === null);

  check('rechaza un archivo inexistente',
    notes.resolveAttachmentPath(buildNoteImageUrl(path.join(notes.getAttachmentsDir(note.id), 'fantasma.png'))) === null);

  check('rechaza null', notes.resolveAttachmentPath(null) === null);
  check('rechaza string vacío', notes.resolveAttachmentPath('') === null);
  check('rechaza basura', notes.resolveAttachmentPath('no es una ruta') === null);
  check('rechaza otro protocolo', notes.resolveAttachmentPath('file:///C:/Windows/win.ini') === null);

  // ── 3. Copiar al portapapeles ─────────────────────────────────
  clipboard.clear();
  const copied = notes.copyImageToClipboard(buildNoteImageUrl(real));
  check('copyImageToClipboard devuelve ok', copied.ok === true);
  check('el portapapeles quedó con un bitmap legible', !clipboard.readImage().isEmpty());

  const copyBad = notes.copyImageToClipboard(buildNoteImageUrl(outside));
  check('copyImageToClipboard rechaza un src fuera del cerco', Boolean(copyBad.error));

  // ── 4. Guardar: el src inválido falla ANTES de abrir el diálogo ─
  // Si el guard corriera después, un src ajeno abriría un diálogo modal que en
  // este harness sin ventana quedaría colgado para siempre.
  const saveBad = await notes.saveImageAs(buildNoteImageUrl(outside), 'x.png');
  check('saveImageAs rechaza sin abrir diálogo', Boolean(saveBad.error));

  // ── 5. Cascade: borrar la nota invalida el src ────────────────
  notes.permanentDeleteNote(note.id);
  check('tras borrar la nota el src ya no resuelve',
    notes.resolveAttachmentPath(buildNoteImageUrl(real)) === null);

  fs.rmSync(siblingDir, { recursive: true, force: true });

  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  app.exit(failures === 0 ? 0 : 1);
}

app.whenReady().then(main).catch((error) => {
  console.error('El test no pudo correr:', error?.stack || error);
  app.exit(1);
});
