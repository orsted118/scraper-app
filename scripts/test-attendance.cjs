// Asistencia: parseo de la tabla de sesiones y las guardas del registro.
//
// El registro ESCRIBE en un registro academico, asi que lo que mas importa acá
// es que markAttendance rechace todo lo dudoso ANTES de abrir el navegador.
//
// Uso: node scripts/test-attendance.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dvpotro-att-'));
require.cache[require.resolve('electron')] = {
  id: require.resolve('electron'),
  filename: require.resolve('electron'),
  loaded: true,
  exports: { app: { getPath: () => userData, on: () => {} }, ipcMain: { handle: () => {} }, shell: {}, dialog: {} },
};

const att = require('../electron/handlers/attendance.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        esperado: ${JSON.stringify(expected)}\n        obtenido: ${JSON.stringify(actual)}`);
}

console.log('== Filas de sesion, con los datos reales del portal ==');
const tomada = att.parseSessionRow(['Wed 26 Aug 2026 4PM - 4:30PM', 'Regular class session', 'Presente', '2 / 2', 'Self-recorded']);
check('una sesion tomada no esta pendiente', tomada.pendiente, false);
check('"Self-recorded" marca auto-registro', tomada.autoRegistrada, true);
check('conserva el estado', tomada.estado, 'Presente');

// Una sesion futura viene con "?" en estado y puntos. Distingue "el profe no
// paso lista" de "faltaste": no es lo mismo para el alumno.
const futura = att.parseSessionRow(['Mon 31 Aug 2026 4PM - 4:30PM', 'Regular class session', '?', '? / 2', '']);
check('"?" es pendiente', futura.pendiente, true);
check('y no cuenta como auto-registrada', futura.autoRegistrada, false);

const enEspanol = att.parseSessionRow(['Jue 27 Ago', 'Sesion regular', 'Presente', '2 / 2', 'Auto-registrada']);
check('tambien detecta el remark en espanol', enEspanol.autoRegistrada, true);

const vacia = att.parseSessionRow(['Vie 28 Ago', 'Sesion', '', '', '']);
check('estado vacio cuenta como pendiente', vacia.pendiente, true);

console.log('');
console.log('== Guardas del registro: rechaza ANTES de abrir el navegador ==');
(async () => {
  const casos = [
    ['sin url', {}],
    ['url vacia', { url: '' }],
    ['una url del portal que no es de asistencia', { url: 'https://ivirtual.itson.edu.mx/my/' }],
    ['la vista del modulo, no el form de registro', { url: 'https://ivirtual.itson.edu.mx/mod/attendance/view.php?id=5' }],
    ['el form pero sin sessid', { url: 'https://ivirtual.itson.edu.mx/mod/attendance/attendance.php' }],
    ['un host ajeno con la forma correcta', { url: 'https://evil.example.com/mod/attendance/attendance.php?sessid=1' }],
    ['http en vez de https', { url: 'http://ivirtual.itson.edu.mx/mod/attendance/attendance.php?sessid=1' }],
    ['subdominio que termina parecido', { url: 'https://ivirtual.itson.edu.mx.evil.com/mod/attendance/attendance.php?sessid=1' }],
  ];

  // Todos tienen que morir en la guarda de URL, ANTES de que se abra un
  // navegador o se manden credenciales a ningun lado.
  for (const [label, payload] of casos) {
    const r = await att.markAttendance(payload);
    const ok = r.error === 'INVALID_SESSION_URL';
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} -> ${r.error}`);
  }

  console.log('');
  console.log('== isSessionUrl acepta solo el form real del portal ==');
  check('el form legitimo pasa', att.isSessionUrl('https://ivirtual.itson.edu.mx/mod/attendance/attendance.php?sessid=999&sesskey=abc'), true);
  // La URL sale de scrapear el curso: un link plantado hacia otro dominio se
  // llevaria la cookie de sesion de Moodle.
  check('otro host no pasa', att.isSessionUrl('https://evil.com/mod/attendance/attendance.php?sessid=1'), false);
  check('sufijo de host no engania', att.isSessionUrl('https://ivirtual.itson.edu.mx.evil.com/mod/attendance/attendance.php?sessid=1'), false);
  check('http no pasa', att.isSessionUrl('http://ivirtual.itson.edu.mx/mod/attendance/attendance.php?sessid=1'), false);
  check('path parecido no pasa', att.isSessionUrl('https://ivirtual.itson.edu.mx/evil/attendance.php?sessid=1'), false);
  check('sin sessid no pasa', att.isSessionUrl('https://ivirtual.itson.edu.mx/mod/attendance/attendance.php'), false);
  check('basura no rompe', att.isSessionUrl('no-es-una-url'), false);

  console.log('');
  console.log('== peekMarkOptions tampoco escribe con una url invalida ==');
  const peek = await att.peekMarkOptions('https://ivirtual.itson.edu.mx/my/');
  check('rechaza url que no es el form', peek.error, 'INVALID_SESSION_URL');

  console.log('');
  console.log('== Ningun camino automatico llega a markAttendance ==');
  const src = fs.readFileSync(path.join(__dirname, '..', 'electron', 'handlers', 'attendance.js'), 'utf8');
  // scrapeAttendance es lo que corre en cada sync: no debe invocar el registro.
  const scrapeBody = src.slice(src.indexOf('async function scrapeAttendance'), src.indexOf('// Registro'));
  check('scrapeAttendance no llama a markAttendance', /markAttendance\s*\(/.test(scrapeBody), false);
  check('no hay setInterval/setTimeout que marque', /set(Interval|Timeout)[^)]*mark/i.test(src), false);
  const panel = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AttendancePanel.jsx'), 'utf8');
  check('la UI solo marca desde confirmMark', (panel.match(/\.mark\?\.\(/g) || []).length, 1);

  console.log('');
  console.log('== La UI muestra los fallos del puente IPC ==');
  // `ipcRenderer.invoke` RECHAZA cuando el canal no tiene handler en el main
  // (la app quedo corriendo desde antes de que existiera el modulo). Con
  // try/finally sin catch el spinner se apagaba y no se mostraba nada: el
  // sintoma era "le doy en actualizar y no pasa nada".
  const material = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'Material.jsx'), 'utf8');

  const sinCatch = (src, nombre) => {
    const i = src.indexOf(`const ${nombre} = async`);
    if (i < 0) return 'no encontrado';
    const cuerpo = src.slice(i, i + 2200);
    return /\} catch \(/.test(cuerpo);
  };

  check('AttendancePanel.sync captura el rechazo', sinCatch(panel, 'sync'), true);
  check('AttendancePanel.openConfirm captura', sinCatch(panel, 'openConfirm'), true);
  check('AttendancePanel.confirmMark captura', sinCatch(panel, 'confirmMark'), true);
  check('Material.sync captura', sinCatch(material, 'sync'), true);
  check('Material.download captura', sinCatch(material, 'download'), true);
  // Una sync exitosa casi nunca cambia los datos: sin confirmacion visible
  // parece que el boton esta roto.
  check('la sync exitosa confirma en pantalla', /setToast\('Asistencia actualizada'\)/.test(panel), true);
  check('el panel muestra cuando fue la ultima lectura', /formatLastSync\(data\.timestamp\)/.test(panel), true);

  fs.rmSync(userData, { recursive: true, force: true });
  console.log('');
  console.log(failures === 0 ? 'TODO OK' : `${failures} CHECKS FALLARON`);
  process.exit(failures === 0 ? 0 : 1);
})();
