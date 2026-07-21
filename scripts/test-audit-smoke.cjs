// Smoke: todos los handlers cargan en Electron real post-refactor (utils nuevos,
// requires movidos). Un require roto muere acá, no en el arranque del usuario.
const { app } = require('electron');

app.whenReady().then(() => {
  const handlers = ['scraper', 'horario', 'cia', 'calendario', 'notifications',
    'notification-center', 'notices', 'settings', 'portal-sistemas', 'music', 'notes'];
  let ok = 0;
  for (const name of handlers) {
    try {
      require(`../electron/handlers/${name}`);
      ok += 1;
    } catch (error) {
      console.error(`FAIL require ${name}:`, error.message);
    }
  }
  const { parseDueDate, SPANISH_MONTHS } = require('../electron/utils/dateParser');
  const { withTimeout, isTimeoutError } = require('../electron/utils/withTimeout');
  const checks = [
    [Object.keys(SPANISH_MONTHS).length === 12, 'SPANISH_MONTHS 12 meses'],
    [parseDueDate('20 julio 2026') !== null, 'parseDueDate es->en'],
    [parseDueDate('basura sin fecha') === null, 'parseDueDate basura -> null'],
    [isTimeoutError(new Error('Timeout 3000ms exceeded')), 'isTimeoutError'],
  ];
  let checksOk = 0;
  for (const [pass, label] of checks) {
    if (pass) checksOk += 1;
    else console.error('FAIL check:', label);
  }
  Promise.resolve(withTimeout(() => new Promise((r) => setTimeout(() => r('x'), 50)), 2000))
    .then((v) => {
      const timeoutOk = v === 'x';
      if (!timeoutOk) console.error('FAIL withTimeout resolve');
      console.log(`SMOKE: handlers ${ok}/${handlers.length}, checks ${checksOk + (timeoutOk ? 1 : 0)}/5`);
      app.exit(ok === handlers.length && checksOk === 4 && timeoutOk ? 0 : 1);
    });
});
