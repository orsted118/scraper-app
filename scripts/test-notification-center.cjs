// Harness temporal de verificación del notification-center (correr con:
// npx electron scripts/test-notification-center.cjs). Usa el userData del
// perfil "Electron" (separado del real), así no contamina la app.
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  const nc = require('../electron/handlers/notification-center');
  const userData = app.getPath('userData');
  console.log('userData:', userData);

  // Limpieza de corridas anteriores del harness
  for (const file of ['notifications.json', 'notification-settings.json']) {
    fs.rmSync(path.join(userData, file), { force: true });
  }
  fs.rmSync(path.join(userData, 'snapshots'), { recursive: true, force: true });

  const readInbox = () => {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(userData, 'notifications.json'), 'utf8'),
    );
    return parsed.items;
  };

  // ── 1. Settings ──────────────────────────────────────────────
  const defaults = nc.getSettings();
  check('settings default ON', defaults.noticesEnabled === true && defaults.remindersEnabled === true);
  check('lastSyncAt arranca null', defaults.lastSyncAt === null);

  // ── 2. Emit + idempotencia por key + dedupe window ───────────
  nc.emit({ key: 'test-1', source: 'sistema', title: 'Uno', priority: 'info' });
  nc.emit({ key: 'test-1', source: 'sistema', title: 'Uno duplicado', priority: 'info' });
  check('emit idempotente por key', readInbox().length === 1);

  nc.processSyncError('actividades', 'SESSION_EXPIRED');
  nc.processSyncError('actividades', 'SESSION_EXPIRED');
  const inbox2 = readInbox();
  const errorNotif = inbox2.find((n) => n.key.startsWith('sys-error'));
  check('error crítico emitido 1 vez con dedupe 6h', inbox2.length === 2 && errorNotif?.priority === 'critica');
  check('error de credenciales apunta a Ajustes', errorNotif?.actionUrl === 'app://ajustes');

  // ── 3. Diff actividades: seed silencioso → nueva/fecha/cierre ─
  const actsV1 = [
    { id: 'a1', nombre: 'Tarea A', materia: 'M1', fechaLimite: '10 julio 2026', estado: 'pendiente' },
    { id: 'a2', nombre: 'Tarea B', materia: 'M1', fechaLimite: '12 julio 2026', estado: 'pendiente' },
  ];
  nc.processSync('actividades', actsV1);
  check('seed actividades silencioso', readInbox().length === 2);
  const syncedAt = nc.getSettings().lastSyncAt;
  check('processSync registra lastSyncAt', typeof syncedAt === 'string' && Number.isFinite(Date.parse(syncedAt)), syncedAt);

  const actsV2 = [
    { id: 'a1', nombre: 'Tarea A', materia: 'M1', fechaLimite: '15 julio 2026', estado: 'pendiente' },
    { id: 'a2', nombre: 'Tarea B', materia: 'M1', fechaLimite: '12 julio 2026', estado: 'cerrada' },
    { id: 'a3', nombre: 'Tarea C', materia: 'M2', fechaLimite: '20 julio 2026', estado: 'pendiente' },
  ];
  nc.processSync('actividades', actsV2);
  const inbox3 = readInbox();
  check('diff: nueva tarea', inbox3.some((n) => n.key === 'act-nueva-a3'));
  check('diff: fecha cambiada', inbox3.some((n) => n.key.startsWith('act-fecha-a1')));
  const cierre = inbox3.find((n) => n.key === 'act-cerro-a2');
  check('diff: cerró sin entrega es crítica', cierre?.priority === 'critica');

  // ── 4. Diff horario: link/aula/alta/baja ─────────────────────
  nc.processSync('horario', [
    { numeroClase: '1', nombre: 'Redes', meetLink: '', sesiones: [{ ubicacion: 'LV-1' }] },
    { numeroClase: '2', nombre: 'Ética', meetLink: 'https://meet/x', sesiones: [] },
  ]);
  nc.processSync('horario', [
    { numeroClase: '1', nombre: 'Redes', meetLink: '', sesiones: [{ ubicacion: 'LV-9' }] },
    { numeroClase: '3', nombre: 'Nueva Materia', meetLink: '', sesiones: [] },
  ]);
  const inbox4 = readInbox();
  check('diff horario: aula', inbox4.some((n) => n.key.startsWith('hor-aula-1')));
  check('diff horario: alta', inbox4.some((n) => n.key === 'hor-nueva-3'));
  check('diff horario: baja', inbox4.some((n) => n.key === 'hor-baja-2'));

  // ── 5. Diff calificaciones ───────────────────────────────────
  nc.processSync('calificaciones', [
    { clave: 'C1', nombre: 'Sistemas', promedio: 90, calificaciones: [{ parcial: 'Parcial 1', calificacion: 90 }] },
  ]);
  nc.processSync('calificaciones', [
    { clave: 'C1', nombre: 'Sistemas', promedio: 94.5, calificaciones: [
      { parcial: 'Parcial 1', calificacion: 90 },
      { parcial: 'Parcial 2', calificacion: 99 },
    ] },
  ]);
  const inbox5 = readInbox();
  check('diff cal: parcial nuevo', inbox5.some((n) => n.key === 'cal-nueva-C1-Parcial 2'));
  check('diff cal: promedio >0.3', inbox5.some((n) => n.key.startsWith('cal-prom-C1')));

  // ── 6. Diff calendario: seed por tipo + evento futuro nuevo ──
  const futureISO = new Date(Date.now() + 30 * 86400000).toISOString();
  nc.processSync('calendario', { events: [{ titulo: 'Evento base', inicio: futureISO }], calendarType: 'T1' });
  nc.processSync('calendario', {
    events: [
      { titulo: 'Evento base', inicio: futureISO },
      { titulo: 'Evento agregado', inicio: futureISO },
      { titulo: 'Evento pasado', inicio: '2020-01-01T00:00:00Z' },
    ],
    calendarType: 'T1',
  });
  const inbox6 = readInbox();
  check('diff calendario: solo el futuro nuevo', inbox6.some((n) => n.title.includes('Evento agregado')) && !inbox6.some((n) => n.title.includes('Evento pasado')));

  // ── 7. Recordatorios con cachés sintéticos + debounce ────────
  const now = new Date();
  const inTen = new Date(now.getTime() + 10 * 60000);
  const hh = String(inTen.getHours()).padStart(2, '0');
  const mm = String(inTen.getMinutes()).padStart(2, '0');
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  fs.writeFileSync(path.join(userData, 'horario-cache.json'), JSON.stringify({
    timestamp: Date.now(),
    materias: [{ numeroClase: '77', nombre: 'Clase Próxima', modalidad: 'presencial',
      sesiones: [{ dias: [dayNames[now.getDay()]], horaInicio: `${hh}:${mm}`, horaFin: '23:59', ubicacion: 'X-1' }] }],
  }));
  const dueToday = new Date(now.getTime() + 2 * 3600000);
  fs.writeFileSync(path.join(userData, 'actividades-cache.json'), JSON.stringify({
    timestamp: Date.now(),
    actividades: [{ id: 'r1', nombre: 'Entrega Hoy', materia: 'M', estado: 'pendiente',
      fechaLimite: dueToday.toISOString() }],
  }));
  const tomorrow = new Date(now.getTime() + 26 * 3600000);
  fs.writeFileSync(path.join(userData, 'calendario-cache.json'), JSON.stringify({
    timestamp: Date.now(),
    events: [{ titulo: 'Evento Mañana', inicio: tomorrow.toISOString() }],
  }));

  nc.checkReminders(now);
  const inbox7 = readInbox();
  check('reminder clase ≤15min crítica', inbox7.some((n) => n.key.startsWith('rem-clase-77') && n.priority === 'critica'));
  check('reminder entrega hoy crítica', inbox7.some((n) => n.key.startsWith('rem-act-hoy-r1') && n.priority === 'critica'));
  check('reminder evento mañana', inbox7.some((n) => n.key.includes('evento mañana'.toLowerCase().slice(0, 6)) || n.title.includes('mañana')));

  const countBefore = readInbox().length;
  nc.checkReminders(new Date(now.getTime() + 60000));
  check('debounce: segunda corrida no re-emite', readInbox().length === countBefore);

  // ── 8. Rotación FIFO 500 ─────────────────────────────────────
  for (let i = 0; i < 520; i += 1) {
    nc.emit({ key: `bulk-${i}`, source: 'sistema', title: `Bulk ${i}`, priority: 'info' });
  }
  check('rotación FIFO en 500', readInbox().length === 500);

  // ── 9. Notices REAL contra páginas públicas de ITSON ─────────
  console.log('\nScrapeando ITSON News (real)...');
  const { syncNotices } = require('../electron/handlers/notices');
  const noticesResult = await syncNotices();
  console.log('notices:', JSON.stringify(noticesResult));
  check('notices: seed inicial ok', noticesResult.ok === true && noticesResult.seeded === true && noticesResult.total > 0, `total=${noticesResult.total}`);
  const noticesAgain = await syncNotices();
  check('notices: segunda corrida sin duplicados', noticesAgain.ok === true && noticesAgain.added === 0, `added=${noticesAgain.added}`);

  // ── 10. Calendario REAL: seed → tamper snapshot → re-diff ────
  console.log('\nScrapeando calendario escolar (real)...');
  const calendario = require('../electron/handlers/calendario');
  calendario.clearCache();
  const run1 = await calendario.run({});
  check('calendario real: scrape ok', !run1.error && Array.isArray(run1.events) && run1.events.length > 0, `${run1.events?.length || 0} eventos`);

  const inboxBeforeTamper = readInbox().filter((n) => n.source === 'calendario' && n.key.startsWith('cal-evento')).length;

  const snapPath = path.join(userData, 'snapshots', 'calendario.json');
  const snapshot = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  const realType = run1.calendarType;
  const keys = snapshot[realType] || [];
  // "Olvidamos" una key de evento FUTURO del tipo real para forzar el diff.
  const futureIndex = keys.findIndex((k) => {
    const inicio = String(k).split('::')[1];
    const time = new Date(inicio).getTime();
    return Number.isFinite(time) && time > Date.now();
  });
  check('calendario real: hay evento futuro para manipular', futureIndex >= 0, `tipo=${realType}`);
  const removed = keys.splice(futureIndex, 1)[0];
  snapshot[realType] = keys;
  fs.writeFileSync(snapPath, JSON.stringify(snapshot), 'utf8');

  calendario.clearCache();
  const run2 = await calendario.run({});
  const calNotifs = readInbox().filter((n) => n.source === 'calendario' && n.key.startsWith('cal-evento'));
  check(
    'calendario real: snapshot manipulado dispara el diff',
    !run2.error && calNotifs.length === inboxBeforeTamper + 1,
    `antes=${inboxBeforeTamper} después=${calNotifs.length} · re-detectado="${String(removed).split('::')[0].slice(0, 45)}"`,
  );

  // ── Resumen ──────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
  if (failed.length) {
    console.log('FALLARON:', failed.map((f) => f.name).join(' | '));
  }
  app.exit(failed.length ? 1 : 0);
}

app.whenReady().then(() =>
  main().catch((error) => {
    console.error('HARNESS ERROR:', error);
    app.exit(1);
  }),
);
