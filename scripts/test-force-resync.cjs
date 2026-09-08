// El botón "Sincronizar todo" debe re-escanear SIEMPRE. Sin `force`, actividades
// (6 h), horario (24 h) y calendario (24 h) devolvían caché y apretar el botón
// dos veces no traía nada nuevo del portal.
//
// Sin red: se escribe una caché fresca a mano y se verifica que `force` la
// ignore y que sin `force` la use.
//
// Uso: node scripts/test-force-resync.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-force-'));
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: {
    app: { getPath: () => userData, on: () => {} },
    ipcMain: { handle: () => {} },
    shell: {}, dialog: {}, BrowserWindow: class {},
  },
};

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

const scraper = require('../electron/handlers/scraper.js');

console.log('== Actividades: caché fresca de hace 1 minuto ==');
scraper.writeActivitiesCache([{ id: '1', nombre: 'de la cache' }]);
const cache = scraper.readActivitiesCache();
check('la caché quedó escrita', Array.isArray(cache?.actividades), true);
check('y es fresca', Date.now() - cache.timestamp < 60_000, true);

// Sin force debe servirla; con force debe ignorarla e intentar scrapear (que sin
// credenciales falla, y ESE es justamente el indicador de que no usó la caché).
(async () => {
  const sinForce = await scraper.getActivitiesWithCache(null);
  check('sin force sirve la caché', sinForce?.fromCache, true);

  // Sin credenciales el scrape real no puede correr: si `force` funciona, la
  // respuesta NO puede venir de la caché.
  const userBackup = process.env.IVIRTUAL_USER;
  const passBackup = process.env.IVIRTUAL_PASS;
  delete process.env.IVIRTUAL_USER;
  delete process.env.IVIRTUAL_PASS;

  const conForce = await scraper.getActivitiesWithCache(null, { force: true });
  check('con force NO sirve la caché', conForce?.fromCache === true, false);
  check('con force intenta scrapear de verdad', Boolean(conForce?.error), true);

  if (userBackup) process.env.IVIRTUAL_USER = userBackup;
  if (passBackup) process.env.IVIRTUAL_PASS = passBackup;

  console.log('');
  console.log('== Los handlers aceptan el parámetro ==');
  const src = fs.readFileSync(path.join(__dirname, '..', 'electron', 'handlers', 'scraper.js'), 'utf8');
  check('scraper:run reenvía options', /scraper:run'.*getActivitiesWithCache\(event, options/s.test(src), true);
  const horario = fs.readFileSync(path.join(__dirname, '..', 'electron', 'handlers', 'horario.js'), 'utf8');
  check('horario respeta force', /!force && cached && Date\.now\(\) - cached\.timestamp/.test(horario), true);
  const calendario = fs.readFileSync(path.join(__dirname, '..', 'electron', 'handlers', 'calendario.js'), 'utf8');
  check('calendario respeta force', /!options\?\.force && cached/.test(calendario), true);

  console.log('');
  console.log('== La UI manda force en las syncs que pide el usuario ==');
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
  check('sync-all fuerza actividades', /runScraper\?\.\(\{ force: true \}\)/.test(app), true);
  check('sync-all fuerza horario', /runHorario\?\.\(\{ force: true \}\)/.test(app), true);
  check('sync-all fuerza calendario', /runCalendario\?\.\(\{ force: true \}\)/.test(app), true);
  check('sync-all incluye material', /id: 'material', promise: scraperApi\.material\?\.sync/.test(app), true);
  check('botón individual fuerza si no es silent', /runScraper\(\{ force: !silent \}\)/.test(app), true);

  fs.rmSync(userData, { recursive: true, force: true });
  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  process.exit(failures === 0 ? 0 : 1);
})();
