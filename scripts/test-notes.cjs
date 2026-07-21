// Harness temporal: verifica notes.js (CRUD, labels, filtros, auto-purge).
// Perfil "Electron" separado. Correr: npx electron scripts/test-notes.cjs
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  const notes = require('../electron/handlers/notes');
  const userData = app.getPath('userData');

  for (const file of ['notes.json', 'notes-labels.json', 'notes-settings.json']) {
    fs.rmSync(path.join(userData, file), { force: true });
  }

  // ── 1. Create text + checklist ────────────────────────────────
  const t1 = notes.createNote({ type: 'text', title: 'Nota A', body: 'cuerpo alfa' });
  const t2 = notes.createNote({
    type: 'checklist',
    title: 'Lista B',
    items: [{ text: 'uno', done: false }, { text: 'dos', done: true }],
    color: 'vermillion',
  });
  check('create devuelve id + timestamps', Boolean(t1.id && t1.createdAt && t1.updatedAt));
  check('checklist sanitiza items con id', t2.items.length === 2 && Boolean(t2.items[0].id));
  check('color inválido cae a neutral', notes.createNote({ color: 'fucsia' }).color === 'neutral');

  // ── 2. List active ────────────────────────────────────────────
  const active = notes.listNotes({ view: 'active' });
  check('list active devuelve las 3', active.length === 3);

  // ── 3. Update + pin ordering ──────────────────────────────────
  notes.updateNote(t1.id, { pinned: true });
  const pinnedFirst = notes.listNotes({ view: 'active' });
  check('nota fijada va primero', pinnedFirst[0].id === t1.id);

  // ── 4. updatedAt cambia en update ─────────────────────────────
  const beforeUpdate = notes.getNote(t2.id).updatedAt;
  const updated = notes.updateNote(t2.id, { title: 'Lista B editada' });
  check('update toca updatedAt', updated.updatedAt >= beforeUpdate && updated.title === 'Lista B editada');

  // ── 5. Labels CRUD + propagación ──────────────────────────────
  notes.createLabel('trabajo');
  notes.createLabel('personal');
  check('labels-create dedup case-insensitive', notes.createLabel('Trabajo').error !== undefined);
  notes.updateNote(t1.id, { labels: ['trabajo', 'personal'] });
  notes.renameLabel('trabajo', 'escuela');
  check('rename propaga a notas', notes.getNote(t1.id).labels.includes('escuela') && !notes.getNote(t1.id).labels.includes('trabajo'));
  notes.deleteLabel('personal');
  check('delete label la quita de notas', !notes.getNote(t1.id).labels.includes('personal'));
  check('delete label la quita de la lista', !notes.listLabels().includes('personal'));

  // ── 6. Filtros: color + search ────────────────────────────────
  const byColor = notes.listNotes({ view: 'active', filters: { colors: ['vermillion'] } });
  check('filtro por color', byColor.length === 1 && byColor[0].id === t2.id);
  const bySearch = notes.listNotes({ view: 'active', filters: { search: 'alfa' } });
  check('filtro por search en body', bySearch.length === 1 && bySearch[0].id === t1.id);
  const bySearchItem = notes.listNotes({ view: 'active', filters: { search: 'uno' } });
  check('search matchea texto de items de checklist', bySearchItem.some((n) => n.id === t2.id));

  // ── 7. Archive / trash / restore ──────────────────────────────
  notes.archiveNote(t1.id);
  check('archive saca de active y limpia pin', notes.listNotes({ view: 'active' }).every((n) => n.id !== t1.id) && !notes.getNote(t1.id).pinned);
  check('archive aparece en archived', notes.listNotes({ view: 'archived' }).some((n) => n.id === t1.id));
  notes.unarchiveNote(t1.id);
  check('unarchive vuelve a active', notes.listNotes({ view: 'active' }).some((n) => n.id === t1.id));

  notes.trashNote(t2.id);
  const trashed = notes.getNote(t2.id);
  check('trash setea deletedAt', Boolean(trashed.deletedAt) && trashed.trashed === true);
  check('trash aparece en trashed', notes.listNotes({ view: 'trashed' }).some((n) => n.id === t2.id));
  notes.restoreNote(t2.id);
  check('restore limpia deletedAt', notes.getNote(t2.id).deletedAt === null && notes.getNote(t2.id).trashed === false);

  // ── 8. Permanent delete + empty trash ─────────────────────────
  notes.trashNote(t2.id);
  notes.permanentDeleteNote(t2.id);
  check('permanent-delete elimina de verdad', notes.getNote(t2.id) === null);

  // ── 9. Settings ───────────────────────────────────────────────
  check('settings default view=grid', notes.getSettings().view === 'grid');
  notes.updateSettings({ view: 'list', sortBy: 'createdAt' });
  check('settings-update persiste', notes.getSettings().view === 'list' && notes.getSettings().sortBy === 'createdAt');

  // ── 10. Auto-purge trash > 30d ────────────────────────────────
  const old = notes.createNote({ title: 'vieja' });
  notes.trashNote(old.id);
  // Falsear deletedAt 31 días atrás directo en el JSON.
  const raw = JSON.parse(fs.readFileSync(path.join(userData, 'notes.json'), 'utf8'));
  const target = raw.find((n) => n.id === old.id);
  target.deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  fs.writeFileSync(path.join(userData, 'notes.json'), JSON.stringify(raw), 'utf8');

  const purged = notes.purgeExpiredTrash();
  check('auto-purge borra trashed > 30d', purged === 1 && notes.getNote(old.id) === null);

  // Nota trashed reciente NO se purga.
  const fresh = notes.createNote({ title: 'reciente' });
  notes.trashNote(fresh.id);
  check('auto-purge respeta trashed reciente', notes.purgeExpiredTrash() === 0 && notes.getNote(fresh.id) !== null);

  // ── 11. Reminders → emit idempotente por key (Fase 2) ─────────
  const notificationCenter = require('../electron/handlers/notification-center');
  const emitted = [];
  const originalEmit = notificationCenter.emit;
  notificationCenter.emit = (input, opts) => { emitted.push(input); return originalEmit(input, opts); };

  const remNote = notes.createNote({ title: 'Con recordatorio' });
  // Reminder en el pasado → debe disparar en el próximo checkReminders.
  notes.setReminder(remNote.id, new Date(Date.now() - 60000).toISOString());
  notes.checkReminders();
  check('reminder pasado dispara emit', emitted.some((e) => e.key === `notes-reminder-${remNote.id}-${notes.getNote(remNote.id).reminder.at}` || e.key.startsWith(`notes-reminder-${remNote.id}`)));
  check('reminder marca fired=true', notes.getNote(remNote.id).reminder.fired === true);
  const emitCountAfterFirst = emitted.length;
  notes.checkReminders();
  check('reminder no re-emite (idempotente por fired)', emitted.length === emitCountAfterFirst);

  // Reminder futuro NO dispara.
  const futureNote = notes.createNote({ title: 'Futuro' });
  notes.setReminder(futureNote.id, new Date(Date.now() + 3600000).toISOString());
  notes.checkReminders();
  check('reminder futuro no dispara', notes.getNote(futureNote.id).reminder.fired === false);

  // Snooze reactiva (fired=false + at nuevo).
  notes.snoozeReminder(remNote.id, 10);
  const snoozed = notes.getNote(remNote.id);
  check('snooze limpia fired y adelanta at', snoozed.reminder.fired === false && new Date(snoozed.reminder.at).getTime() > Date.now());
  check('snooze preserva snoozedFrom', Boolean(snoozed.reminder.snoozedFrom));

  notes.clearReminder(remNote.id);
  check('clear-reminder deja reminder null', notes.getNote(remNote.id).reminder === null);
  notificationCenter.emit = originalEmit;

  // ── 12. Duplicate ─────────────────────────────────────────────
  const dupSource = notes.createNote({ title: 'Original', body: 'contenido', color: 'cyan', pinned: true });
  const dup = notes.duplicateNote(dupSource.id);
  check('duplicate agrega (Copia) al título', dup.title === 'Original (Copia)');
  check('duplicate no hereda pin', dup.pinned === false);
  check('duplicate es otra nota (id distinto)', dup.id !== dupSource.id && notes.getNote(dup.id) !== null);

  // ── 13. Export markdown ───────────────────────────────────────
  const mdText = notes.createNote({ title: 'Export Test', body: 'línea uno', color: 'amber', labels: ['Escuela'] });
  const exportedText = notes.exportMarkdown(mdText.id);
  check('export text: header + body + meta', exportedText.markdown.startsWith('# Export Test') && exportedText.markdown.includes('línea uno') && exportedText.markdown.includes('Color: amber'));

  const mdCheck = notes.createNote({ type: 'checklist', title: 'Lista MD', items: [{ text: 'hecho', done: true }, { text: 'pendiente', done: false }] });
  const exportedCheck = notes.exportMarkdown(mdCheck.id);
  check('export checklist: - [x] / - [ ]', exportedCheck.markdown.includes('- [x] hecho') && exportedCheck.markdown.includes('- [ ] pendiente'));

  // ── 14. Bulk action ───────────────────────────────────────────
  const b1 = notes.createNote({ title: 'Bulk 1' });
  const b2 = notes.createNote({ title: 'Bulk 2' });
  const b3 = notes.createNote({ title: 'Bulk 3' });
  const ids = [b1.id, b2.id, b3.id];
  notes.bulkAction(ids, 'color', { color: 'green' });
  check('bulk color aplica a los 3', ids.every((id) => notes.getNote(id).color === 'green'));
  notes.bulkAction(ids, 'label-add', { label: 'Bulk' });
  check('bulk label-add', ids.every((id) => notes.getNote(id).labels.includes('Bulk')));
  const bulkArchive = notes.bulkAction(ids, 'archive');
  check('bulk archive afecta 3', bulkArchive.affected === 3 && ids.every((id) => notes.getNote(id).archived));

  // ── 15. Filtro por type + sort título (Fase 2) ────────────────
  const byType = notes.listNotes({ view: 'active', filters: { types: ['checklist'] } });
  check('filtro por type checklist', byType.length > 0 && byType.every((n) => n.type === 'checklist'));
  notes.updateSettings({ sortBy: 'title' });
  const sorted = notes.listNotes({ view: 'active' });
  const titles = sorted.filter((n) => !n.pinned).map((n) => n.title);
  const sortedCopy = [...titles].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  check('sort por título alfabético', JSON.stringify(titles) === JSON.stringify(sortedCopy));
  notes.updateSettings({ sortBy: 'updatedAt' });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) console.log('FALLARON:', failed.map((f) => f.name).join(' | '));
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() =>
  main().catch((error) => {
    console.error('HARNESS ERROR:', error?.message, error?.stack);
    app.exit(1);
  }),
);
