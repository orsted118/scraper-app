// Verifica el ciclo reminder → notification-center REAL (no mock del emit):
// un reminder vencido dispara UNA notificación real en la bandeja, y el mismo
// reminder no la duplica. Correr: npx electron scripts/test-notes-reminder-emit.cjs
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

async function main() {
  const userData = app.getPath('userData');
  for (const f of ['notes.json', 'notifications.json']) fs.rmSync(path.join(userData, f), { force: true });

  const notes = require('../electron/handlers/notes');
  const nc = require('../electron/handlers/notification-center');

  const readInbox = () => {
    try {
      return JSON.parse(fs.readFileSync(path.join(userData, 'notifications.json'), 'utf8')).items;
    } catch (_e) {
      return [];
    }
  };

  const note = notes.createNote({ title: 'Recordatorio real' });
  notes.setReminder(note.id, new Date(Date.now() - 60000).toISOString());
  const at = notes.getNote(note.id).reminder.at;

  notes.checkReminders();
  const inbox1 = readInbox();
  const reminderNotif = inbox1.find((n) => n.source === 'notes' && n.key === `notes-reminder-${note.id}-${at}`);
  check('reminder vencido → notificación real en la bandeja', Boolean(reminderNotif));
  check('la notificación tiene actionUrl app://notas?note', reminderNotif?.actionUrl === `app://notas?note=${note.id}`, reminderNotif?.actionUrl);
  check('body = "Recordatorio"', reminderNotif?.body === 'Recordatorio');
  check('key idempotente incluye id+at', reminderNotif?.key === `notes-reminder-${note.id}-${at}`);

  const countAfterFirst = readInbox().filter((n) => n.source === 'notes').length;
  notes.checkReminders();
  notes.checkReminders();
  const countAfterRepeat = readInbox().filter((n) => n.source === 'notes').length;
  check('re-scan NO duplica (idempotente por key + fired)', countAfterFirst === countAfterRepeat, `${countAfterFirst} vs ${countAfterRepeat}`);

  // Snooze reactiva (fired=false + at nuevo). Para probar que el nuevo at es un
  // evento emitible distinto, tamper del JSON dejándolo en el pasado y re-scan.
  notes.snoozeReminder(note.id, 30);
  const snoozedAt = notes.getNote(note.id).reminder.at;
  check('snooze cambia el at (nueva key posible)', snoozedAt !== at && notes.getNote(note.id).reminder.fired === false);

  const raw = JSON.parse(fs.readFileSync(path.join(userData, 'notes.json'), 'utf8'));
  const pastAt = new Date(Date.now() - 60000).toISOString();
  raw.find((n) => n.id === note.id).reminder.at = pastAt;
  fs.writeFileSync(path.join(userData, 'notes.json'), JSON.stringify(raw), 'utf8');

  notes.checkReminders();
  const snoozeNotif = readInbox().find((n) => n.key === `notes-reminder-${note.id}-${pastAt}`);
  check('el reminder pospuesto dispara bajo key nueva al vencer', Boolean(snoozeNotif) && pastAt !== at);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() => main().catch((e) => { console.error('ERR', e?.message); app.exit(1); }));
