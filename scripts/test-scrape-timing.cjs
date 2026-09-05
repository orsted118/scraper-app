// Escaneo de actividades: correctitud Y tiempo, contra iVirtual real.
//
// Existe porque un typo dejó el escaneo devolviendo CERO actividades y ningún
// test lo detectó: los que había verificaban parsers con fixtures, y el bug
// estaba en el pegamento entre el extractor y el modelo. Este corre la tubería
// entera de punta a punta.
//
// También mide el tiempo por fase. El escaneo es la operación más lenta de la
// app y sin desglose se optimiza a ciegas — así se descubrió que listar las
// materias en fila costaba el 28% del total.
//
// Necesita credenciales en .env y toca la red. Uso:
//   node scripts/test-scrape-timing.cjs [--presupuesto 15000]
const fs = require('fs');
const os = require('os');
const path = require('path');

require(path.join(__dirname, '..', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', '.env'),
});

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

// Techo de tiempo del escaneo completo. No es una medida de la máquina sino un
// detector de regresiones: si alguien vuelve a serializar lo que hoy corre en
// paralelo, esto se pone rojo.
const PRESUPUESTO_MS = Number(getArg('presupuesto', '20000'));

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-timing-'));
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: {
    app: { getPath: () => userData, on: () => {} },
    ipcMain: { handle: () => {} },
    BrowserWindow: { getAllWindows: () => [] },
    shell: {}, dialog: {},
    session: { defaultSession: { cookies: { set: async () => {} } } },
  },
};

const scraper = require('../electron/handlers/scraper.js');

let failures = 0;
function check(label, ok, detalle = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detalle ? `  ${detalle}` : ''}`);
}

(async () => {
  if (!process.env.IVIRTUAL_USER || !process.env.IVIRTUAL_PASS) {
    console.log('SKIP  faltan credenciales de iVirtual en .env');
    process.exit(0);
  }

  console.log('== Escaneo completo contra iVirtual ==');
  const t0 = Date.now();
  const res = await scraper.getActivitiesWithCache(null, { force: true });
  const totalMs = Date.now() - t0;

  if (res?.error) {
    console.log(`FAIL  el escaneo devolvió error: ${res.error}`);
    process.exit(1);
  }

  const acts = res.activities || [];

  // LA regresión que importa: el escaneo tiene que traer actividades. Con cero
  // la app se ve vacía y parece que el portal no publicó nada.
  check('el escaneo devuelve actividades', acts.length > 0, `${acts.length} actividades`);
  check('no viene de caché', res.fromCache !== true);
  check('todas tienen nombre', acts.every((a) => a.nombre?.trim()), '');
  check('todas tienen estado válido',
    acts.every((a) => ['pendiente', 'retrasada', 'cerrada'].includes(a.estado)));
  check('todas tienen materia', acts.every((a) => a.materia?.trim()));
  check('todas tienen url del portal', acts.every((a) => /ivirtual\.itson\.edu\.mx/.test(a.url || '')));

  // El campo que rompió todo: si el extractor tira ReferenceError, ninguna
  // actividad llega y este check es el que lo delata.
  check('el markdown de la consigna llega', acts.every((a) => typeof a.instruccionesMarkdown === 'string'));

  const porEstado = {};
  for (const a of acts) porEstado[a.estado] = (porEstado[a.estado] || 0) + 1;
  console.log(`      estados: ${JSON.stringify(porEstado)}`);

  console.log('');
  console.log('== Tiempo ==');
  console.log(`      total: ${(totalMs / 1000).toFixed(1)}s  (presupuesto ${(PRESUPUESTO_MS / 1000).toFixed(0)}s)`);

  if (res.timing?.fases) {
    const fases = Object.entries(res.timing.fases).sort((a, b) => b[1] - a[1]);
    for (const [fase, ms] of fases) {
      const pct = ((ms / res.timing.totalMs) * 100).toFixed(0);
      console.log(`      ${fase.padEnd(20)} ${String(ms).padStart(6)}ms ${pct.padStart(3)}%`);
    }

    check('el desglose por fase viaja en el resultado', fases.length > 0);

    // Estas dos fases son las que se paralelizaron. Si alguien las vuelve a
    // serializar, su proporción se dispara y conviene enterarse acá.
    const detalles = res.timing.fases.detallesActividad || 0;
    const listado = res.timing.fases.listarActividades || 0;
    check('listar materias no domina el escaneo',
      listado < res.timing.totalMs * 0.35,
      `${((listado / res.timing.totalMs) * 100).toFixed(0)}% del total`);
    check('los detalles se leen en paralelo',
      detalles < res.timing.totalMs * 0.6,
      `${((detalles / res.timing.totalMs) * 100).toFixed(0)}% del total`);
  }

  check('el escaneo entra en el presupuesto', totalMs < PRESUPUESTO_MS,
    `${(totalMs / 1000).toFixed(1)}s`);

  console.log('');
  console.log('== El estado crudo del portal llega a la actividad ==');
  // Antes `submissionState` se construía dentro del scraper y NO se copiaba a
  // la actividad: la card y los diagnósticos veían undefined en todo.
  const conEstado = acts.filter((a) => a.submissionState);
  check('todas traen submissionState', conEstado.length === acts.length,
    `${conEstado.length}/${acts.length}`);
  check('hasSubmitAction es booleano, no undefined',
    acts.every((a) => typeof a.submissionState?.hasSubmitAction === 'boolean'));
  // Moodle imprime "()" cuando la fila de grupo existe pero está vacía; eso
  // llegaba a la UI como "Individual · ()".
  check('equipo nunca es paréntesis vacíos',
    acts.every((a) => !/^[\s()]*$/.test(a.equipo || 'x')));

  console.log('');
  console.log('== Coherencia estado <-> botón de entrega ==');
  // La regla que motivó el arreglo: si está vencida y el portal ya no muestra
  // botón, es cerrada, no retrasada.
  const incoherentes = acts.filter((a) =>
    a.estado === 'retrasada' && a.submissionState?.hasSubmitAction === false && !a.bloqueo);
  check('ninguna retrasada sin botón y sin bloqueo', incoherentes.length === 0,
    incoherentes.map((a) => a.nombre).join(', '));

  const cerradasConBoton = acts.filter((a) => a.estado === 'cerrada' && a.submissionState?.hasSubmitAction === true);
  check('ninguna cerrada que todavía acepte entrega', cerradasConBoton.length === 0,
    cerradasConBoton.map((a) => a.nombre).join(', '));

  console.log('');
  console.log('== Dos escaneos simultáneos comparten resultado ==');
  // "Sincronizar todo" y la carga de la página de Actividades pueden pedir el
  // escaneo a la vez. Antes el segundo recibía "Ya hay un escaneo en progreso"
  // y la UI lo pintaba como error rojo con el escaneo andando bien.
  const [a1, a2] = await Promise.all([
    scraper.getActivitiesWithCache(null, { force: true }),
    scraper.getActivitiesWithCache(null, { force: true }),
  ]);
  check('el segundo llamador no recibe error', !a2?.error, a2?.error || '');
  check('ambos reciben las mismas actividades',
    (a1.activities?.length || 0) === (a2.activities?.length || 0));

  fs.rmSync(userData, { recursive: true, force: true });
  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error('FALLO:', error);
  process.exit(1);
});
