// Verifica attachments (arrayBuffer + validación + hash + cascade + migración)
// con imágenes reales. Correr: npx electron scripts/test-notes-attachments.cjs
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

require('../electron/handlers/notes').registerNoteImageScheme();

const results = [];
const check = (n, c, d = '') => { results.push({ n, ok: Boolean(c) }); console.log(`${c ? 'PASS' : 'FAIL'} — ${n}${d ? ` (${d})` : ''}`); };

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function main() {
  const notes = require('../electron/handlers/notes');
  const userData = app.getPath('userData');
  fs.rmSync(path.join(userData, 'notes.json'), { force: true });
  fs.rmSync(path.join(userData, 'notes-attachments'), { recursive: true, force: true });

  // ── 1. Migración: nota vieja sin attachments → [] ─────────────
  fs.writeFileSync(path.join(userData, 'notes.json'), JSON.stringify([{ id: 'old1', type: 'text', title: 'Vieja', body: 'sin campo attachments' }]));
  const migrated = notes.getNote('old1');
  check('migración: nota vieja sin attachments lee []', Array.isArray(migrated.attachments) && migrated.attachments.length === 0);
  fs.rmSync(path.join(userData, 'notes.json'), { force: true });

  // ── 2. attachImage con buffer real + hash ─────────────────────
  const note = notes.createNote({ title: 'Con adjunto' });
  const r1 = notes.attachImage(note.id, PNG, 'foto.png', 'image/png');
  check('attachImage ok + devuelve attachment', r1.ok && r1.attachment?.path);
  check('attachment con mime/size/filename', r1.attachment.mime === 'image/png' && r1.attachment.size === PNG.length && r1.attachment.filename === 'foto.png');
  const stored = notes.getNote(note.id).attachments[0];
  check('archivo escrito en notes-attachments/{noteId}', fs.existsSync(stored.path) && stored.path.includes(path.join('notes-attachments', note.id)));
  check('nombre de archivo = hash sha256 (8 char) + ext', /[a-f0-9]{8}\.png$/.test(path.basename(stored.path)));

  // ── 3. Validaciones ───────────────────────────────────────────
  const big = notes.attachImage(note.id, Buffer.alloc(16 * 1024 * 1024), 'big.png', 'image/png');
  check('rechaza >15MB con error', big.error && big.error.includes('15MB'));
  const badMime = notes.attachImage(note.id, PNG, 'x.pdf', 'application/pdf');
  check('rechaza mime no-imagen', Boolean(badMime.error));
  // Llenar a 10 y rechazar el 11.
  for (let i = 0; i < 9; i += 1) notes.attachImage(note.id, Buffer.concat([PNG, Buffer.from([i])]), `f${i}.png`, 'image/png');
  check('llega a 10 attachments', notes.getNote(note.id).attachments.length === 10);
  const overflow = notes.attachImage(note.id, Buffer.concat([PNG, Buffer.from([99])]), 'over.png', 'image/png');
  check('rechaza el 11 con "máximo 10"', overflow.error && overflow.error.includes('10'));

  // ── 4. Protocolo sirve la imagen + bloquea afuera ─────────────
  notes.registerNoteImageProtocol();
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  await win.loadURL('data:text/html,<html><body></body></html>');
  const imgUrl = `dvpotro-note-img:///${encodeURI(stored.path.replace(/\\/g, '/'))}`;
  const load = await win.webContents.executeJavaScript(`new Promise((res)=>{const i=new Image();const t=setTimeout(()=>res({ok:false}),8000);i.onload=()=>{clearTimeout(t);res({ok:true,w:i.naturalWidth})};i.onerror=()=>{clearTimeout(t);res({ok:false})};i.src=${JSON.stringify(imgUrl)};})`);
  check('protocolo sirve la imagen a un <img>', load.ok === true, JSON.stringify(load));
  win.destroy();

  // ── 5. removeAttachment borra archivo + ref ───────────────────
  const p = stored.path;
  const rm = notes.removeAttachment(note.id, stored.id);
  check('removeAttachment quita del array', rm.ok && rm.attachments.length === 9);
  check('archivo borrado del disco', !fs.existsSync(p));

  // ── 6. Cascade: permanent-delete borra la carpeta ────────────
  const dir = notes.getAttachmentsDir(note.id);
  check('carpeta existe antes de borrar', fs.existsSync(dir));
  notes.permanentDeleteNote(note.id);
  check('permanent-delete borra la carpeta de attachments', !fs.existsSync(dir));

  // ── 7. Duplicate copia archivos + reescribe body ─────────────
  const n2 = notes.createNote({ title: 'Orig', body: '<p>hola</p>' });
  const att = notes.attachImage(n2.id, PNG, 'img.png', 'image/png').attachment;
  // Insertar referencia inline en el body como haría el editor.
  const inlineSrc = `dvpotro-note-img:///${att.path.replace(/\\/g, '/')}`;
  notes.updateNote(n2.id, { body: `<p>hola</p><img src="${inlineSrc}" alt="img.png">` });
  const dup = notes.duplicateNote(n2.id);
  check('la copia tiene su propio archivo', dup.attachments.length === 1 && dup.attachments[0].path !== att.path);
  check('archivo de la copia existe', fs.existsSync(dup.attachments[0].path));
  check('body de la copia apunta a SU carpeta', dup.body.includes(`notes-attachments/${dup.id}/`) && !dup.body.includes(`notes-attachments/${n2.id}/`));
  notes.permanentDeleteNote(n2.id);
  check('borrar el original no borra la imagen de la copia', fs.existsSync(dup.attachments[0].path));

  // ── 8. Export: img inline → markdown ![]() ───────────────────
  const exp = notes.exportMarkdown(dup.id);
  check('export convierte <img> inline a ![](url)', /!\[.*\]\(dvpotro-note-img/.test(exp.markdown));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) console.log('FALLARON:', failed.map((f) => f.n).join(' | '));
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() => main().catch((e) => { console.error('ERR', e?.message, e?.stack); app.exit(1); }));
