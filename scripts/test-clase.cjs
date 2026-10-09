// Grabación de clase de punta a punta, ADENTRO de Electron.
//
// Corre el ciclo real: resuelve el intérprete, lanza el daemon de Python, captura
// el audio que suena en la máquina, lo transcribe, saca capturas de pantalla con
// `desktopCapturer` y cierra la sesión por stdin.
//
// Por qué adentro de Electron y no en Node pelado: `desktopCapturer`, `screen` y
// `app.getPath` no existen fuera, y el handler los usa en el camino normal. Un
// test en Node pelado pasaría sin probar la mitad del módulo.
//
// Le hace falta audio sonando para que la transcripción tenga qué morder. Con
// AUDIO_PRUEBA apuntando a un archivo, lo reproduce solo.
//
// Uso:  npx electron scripts/test-clase.cjs
//       AUDIO_PRUEBA="C:/ruta/a/clase.mp4" npx electron scripts/test-clase.cjs
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

// Sandbox: este test no debe tocar la instalación real.
const SANDBOX = path.join(os.tmpdir(), 'dvpotro-clase-test');
fs.rmSync(SANDBOX, { recursive: true, force: true });
app.setPath('userData', SANDBOX);

const clase = require('../electron/handlers/clase.js');

const SEGUNDOS = Number(process.env.SEGUNDOS_PRUEBA) || 70;
const AUDIO = process.env.AUDIO_PRUEBA || null;
const CON_PANTALLA = process.env.SIN_PANTALLA !== '1';
const FFPLAY = process.env.FFPLAY || path.join(
  os.homedir(),
  'AppData/Local/Microsoft/WinGet/Packages',
  'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
  'ffmpeg-8.1.2-full_build/bin/ffplay.exe',
);

let fallos = 0;

function check(etiqueta, condicion, detalle = '') {
  if (!condicion) fallos += 1;
  console.log(`${condicion ? 'PASS' : 'FAIL'}  ${etiqueta}${detalle ? ` — ${detalle}` : ''}`);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Reproduce audio de verdad por la salida default, que es lo que el loopback
// captura. Son dos pasos y no `ffplay` directo a propósito: ffplay spawneado se
// cierra a los ~1.2 s pase lo que pase con su stdio, y esos cierres tempranos
// hacían fallar la cobertura de audio y mandaban a buscar el bug al daemon, que
// estaba sano. SoundPlayer.PlaySync bloquea hasta que el wav termina de verdad.
function duracionDe(archivo) {
  const ffprobe = FFPLAY.replace(/ffplay\.exe$/i, 'ffprobe.exe');

  if (!fs.existsSync(ffprobe)) return null;

  const r = spawnSync(ffprobe, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo,
  ], { windowsHide: true, encoding: 'utf8' });

  const segundos = Number.parseFloat(r.stdout);
  return Number.isFinite(segundos) ? segundos : null;
}

// El offset SALE DE LA DURACIÓN REAL, no de una constante. Estaba fijo en 300 s
// contra una grabación de 136: ffmpeg escribía un wav de 78 bytes, no sonaba nada,
// y la cobertura de audio fallaba por falta de audio que reproducir — no por un
// problema del daemon, que era donde se estaba buscando.
function extraerWav(segundos, destino) {
  const ffmpeg = FFPLAY.replace(/ffplay\.exe$/i, 'ffmpeg.exe');

  if (!fs.existsSync(ffmpeg)) return null;

  const duracion = duracionDe(AUDIO);

  if (duracion === null) return null;

  const pedido = Math.min(segundos, Math.max(0, duracion - 10));
  const desde = Math.max(0, Math.min(60, duracion - pedido - 1));

  if (pedido < 5) {
    console.log(`     (el audio de prueba dura ${duracion.toFixed(0)}s: muy corto)`);
    return null;
  }

  if (pedido < segundos) {
    console.log(`     (el audio de prueba dura ${duracion.toFixed(0)}s, se reproducen ${pedido.toFixed(0)}s de los ${segundos} pedidos)`);
  }

  const r = spawnSync(ffmpeg, [
    '-v', 'error', '-ss', String(Math.round(desde)), '-t', String(Math.round(pedido)), '-i', AUDIO,
    '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-y', destino,
  ], { windowsHide: true });

  // Un wav de cabecera sola (44 bytes) es "se extrajo cero audio", no un éxito.
  const ok = r.status === 0 && fs.existsSync(destino) && fs.statSync(destino).size > 10000;
  return ok ? { ruta: destino, segundos: pedido } : null;
}

function reproducir(segundos) {
  if (!AUDIO || !fs.existsSync(FFPLAY)) {
    console.log('     (sin AUDIO_PRUEBA: se graba silencio y la transcripción va a salir vacía)');
    return Promise.resolve();
  }

  const wav = extraerWav(segundos, path.join(SANDBOX, 'reproducir.wav'));

  if (!wav) {
    console.log('     (no se pudo extraer el wav de prueba)');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const t0 = Date.now();
    // Load() antes de PlaySync(): sin él, PlaySync vuelve mientras el wav todavía
    // se está leyendo y la "reproducción" dura menos que el archivo.
    const p = spawn('powershell', [
      '-NoProfile', '-Command',
      `$p = New-Object Media.SoundPlayer '${wav.ruta}'; $p.Load(); $p.PlaySync()`,
    ], { windowsHide: true });

    p.on('close', () => {
      console.log(`     (reprodujo ${((Date.now() - t0) / 1000).toFixed(1)}s de ${wav.segundos.toFixed(0)}s)`);
      resolve();
    });
    p.on('error', (e) => { console.log(`     (falló la reproducción: ${e.message})`); resolve(); });
  });
}

app.whenReady().then(async () => {
  try {
    await correr();
  } catch (error) {
    // Sin esto una excepción queda como unhandled rejection, app.exit() no corre
    // y Electron se queda vivo con una ventana invisible hasta que alguien lo mata.
    console.error(`
EL TEST EXPLOTÓ: ${error?.stack || error}`);
    app.exit(1);
  }
});

async function correr() {
  console.log(`userData de prueba: ${SANDBOX}\n`);

  const diag = await clase.diagnostico();
  console.log(`python: ${diag.python || '(ninguno)'}`);
  console.log(`clase detectada en el horario: ${diag.claseActual?.nombre || '(ninguna a esta hora)'}\n`);

  check('el diagnóstico encuentra un Python utilizable', diag.listo, diag.error || '');

  if (!diag.listo) {
    console.log('\nSin intérprete no se puede seguir. El resto del test no corre.');
    app.exit(1);
    return;
  }

  check('no hay ninguna grabación al arrancar', clase.estado().grabando === false);
  check('el historial arranca vacío', clase.listarSesiones().length === 0);

  const inicio = await clase.iniciar({ modelo: 'small', conPantalla: CON_PANTALLA });
  check('iniciar() devuelve ok', inicio.ok, inicio.error || '');

  if (!inicio.ok) {
    app.exit(1);
    return;
  }

  console.log(`\nsesión ${inicio.id} — grabando ${SEGUNDOS}s...`);

  // Una segunda grabación tiene que rebotar: dos daemons se pelean el mismo
  // loopback y escriben dos transcripciones de la misma clase.
  const segunda = await clase.iniciar({ modelo: 'small' });
  check('una segunda grabación simultánea se rechaza', segunda.ok === false, segunda.error || 'devolvió ok');

  // REGRESIÓN: el `import numpy` perezoso del hilo principal esperaba el lock de
  // módulo que tenía el transcriptor importando faster_whisper, y la captura no
  // arrancaba hasta 8-20 s después de "iniciado". Se chequea el wav, que crece
  // desde la primera lectura, y no la transcripción, que sí depende del modelo.
  const wavTemprano = path.join(SANDBOX, 'clase', inicio.id, 'audio.wav');
  await esperar(4000);
  const bytesTemprano = fs.existsSync(wavTemprano) ? fs.statSync(wavTemprano).size : 0;
  check(
    'la captura arranca de una, sin esperar a que cargue el modelo',
    bytesTemprano > 44,
    `${bytesTemprano} bytes a los 4s`,
  );

  // El modelo tarda unos segundos en cargar: antes de eso no hay con qué transcribir.
  await esperar(6000);
  await reproducir(SEGUNDOS);
  await esperar(2000);

  const enVivo = clase.estado();
  check('el estado dice que está grabando', enVivo.grabando === true);
  check('etiquetó la sesión con el modelo pedido', enVivo.modelo === 'small', `modelo=${enVivo.modelo}`);
  if (CON_PANTALLA) check('sacó capturas de pantalla', enVivo.frames > 0, `frames=${enVivo.frames}`);

  console.log('\ndeteniendo (cierra el último tramo, puede tardar)...');
  // Se marca ANTES de detener: `meta.fin` se sella cuando el daemon termina de
  // transcribir el último tramo, hasta 40 s después de que la captura paró, y
  // medir la cobertura contra ese sello descuenta audio que nunca debió existir.
  const hastaAca = Date.now();
  const fin = await clase.detener();
  check('detener() devuelve ok', fin.ok, fin.error || '');
  check('la sesión queda en estado terminada', fin.meta?.estado === 'terminada', `estado=${fin.meta?.estado}`);

  const carpeta = path.join(SANDBOX, 'clase', inicio.id);
  const wav = path.join(carpeta, 'audio.wav');
  const segundosGrabados = fs.existsSync(wav) ? (fs.statSync(wav).size - 44) / 2 / 16000 : 0;

  check('guardó el audio crudo', fs.existsSync(wav));
  // Se compara contra el RELOJ de la grabación, no contra cuánto audio se llegó a
  // reproducir: el daemon captura todo el tiempo, suene algo o no. Medir contra la
  // reproducción hacía fallar este check cuando el problema estaba en el wav de
  // prueba, y mandaba a buscar el bug adentro del daemon.
  const relojGrabado = (hastaAca - fin.meta.inicio) / 1000;
  check(
    'el audio grabado cubre el tiempo real (sin huecos por CPU)',
    segundosGrabados > relojGrabado * 0.85,
    `${segundosGrabados.toFixed(1)}s capturados de ${relojGrabado.toFixed(1)}s grabando`,
  );

  const transcript = clase.leerTranscript(inicio.id);
  const lineas = transcript.ok ? transcript.lineas : [];

  if (AUDIO) {
    check('hay transcripción', lineas.length > 0, `${lineas.length} segmentos`);

    // Guardado y no encadenado: sin transcripción, `lineas.at(-1)` tira dentro
    // del handler async, app.exit() no corre y Electron queda vivo sin ventana.
    if (lineas.length > 1) {
      check('los tiempos de los segmentos avanzan', lineas.at(-1).inicio > lineas[0].inicio);

      const rango = clase.leerTranscript(inicio.id, { desdeMinuto: 0, hastaMinuto: 0.25 });
      check('el filtro por minuto recorta', rango.ok && rango.lineas.length < lineas.length,
        `${rango.lineas?.length} de ${lineas.length}`);
    }

    console.log('\n--- transcripción ---');
    lineas.slice(0, 8).forEach((l) => {
      console.log(`  [${Math.floor(l.inicio / 60)}:${String(Math.floor(l.inicio % 60)).padStart(2, '0')}] ${l.texto}`);
    });
  }

  // --- lectura incremental -------------------------------------------------
  // La UI refresca cada 5 s durante toda la clase. Si `desdeByte` no recorta, el
  // costo del refresco crece con la duración y se nota justo al final, que es
  // cuando el profesor dicta la tarea.
  if (lineas.length > 1) {
    const entero = clase.leerTranscript(inicio.id, { desdeByte: 0 });
    check('la lectura incremental devuelve un offset', typeof entero.siguienteByte === 'number');

    const alFinal = clase.leerTranscript(inicio.id, { desdeByte: entero.siguienteByte });
    check('releer desde el último offset no trae nada', alFinal.ok && alFinal.lineas.length === 0,
      `trajo ${alFinal.lineas?.length}`);

    // Lo que importa de verdad: leer de a pedazos tiene que reconstruir
    // exactamente el mismo texto que leer todo de una. Se recorre en saltos
    // chicos para que los cortes caigan en medio de líneas.
    const porPedazos = [];
    let cursor = 0;

    for (let vuelta = 0; vuelta < 500; vuelta += 1) {
      const trozo = clase.leerTranscript(inicio.id, { desdeByte: cursor });
      if (!trozo.ok || trozo.siguienteByte === cursor) break;
      porPedazos.push(...trozo.lineas);
      cursor = trozo.siguienteByte;
    }

    check('leer de a pedazos reconstruye el texto completo',
      porPedazos.map((l) => l.texto).join('|') === lineas.map((l) => l.texto).join('|'),
      `${porPedazos.length} vs ${lineas.length} líneas`);

    check('un offset mayor al archivo reinicia en vez de servir basura',
      clase.leerTranscript(inicio.id, { desdeByte: 10 ** 9 }).reiniciado === true);
  }

  // --- deduplicación de capturas -------------------------------------------
  if (CON_PANTALLA) {
    const guardadas = fs.existsSync(path.join(carpeta, 'pantalla'))
      ? fs.readdirSync(path.join(carpeta, 'pantalla')).filter((f) => f.endsWith('.jpg'))
      : [];
    const tics = Math.floor(relojGrabado / 12);

    check('guardó al menos una captura', guardadas.length > 0, `${guardadas.length} archivos`);
    // Con una pantalla quieta —el caso normal de una clase con diapositivas— la
    // mayoría de los tics no debería dejar archivo.
    check(
      'descartó capturas repetidas',
      fin.meta.repetidas > 0 || guardadas.length <= tics,
      `${guardadas.length} guardadas, ${fin.meta.repetidas} descartadas, ${tics} tics`,
    );
  }

  const historial = clase.listarSesiones();
  check('la sesión aparece en el historial', historial.length === 1 && historial[0].id === inicio.id);
  check('el historial trae la cuenta de segmentos', typeof historial[0].segmentos === 'number');
  check('no quedó nada grabando', clase.estado().grabando === false);

  // --- segunda pasada ------------------------------------------------------
  // Solo con RETRANSCRIBIR=1: carga otro modelo y vuelve a procesar todo el wav,
  // así que agrega minutos al test.
  if (process.env.RETRANSCRIBIR === '1' && lineas.length > 0) {
    console.log('\nre-transcribiendo con medium...');
    const fino = await clase.retranscribir({ id: inicio.id, modelo: 'medium' });

    check('la re-transcripción devuelve ok', fino.ok, fino.error || '');

    if (fino.ok) {
      check('produjo segmentos', fino.segmentos > 0, `${fino.segmentos} segmentos en ${fino.demora}s`);
      // La pasada en vivo no se pisa: si la fina sale peor, el original sigue ahí.
      check('conservó la transcripción en vivo',
        fs.existsSync(path.join(carpeta, 'transcript-vivo.jsonl')));

      const nueva = clase.leerTranscript(inicio.id);
      check('la nueva transcripción se puede leer', nueva.ok && nueva.lineas.length > 0,
        `${nueva.lineas?.length} líneas`);
      console.log(`  vivo (small):   ${lineas.map((l) => l.texto).join(' ').slice(0, 110)}`);
      console.log(`  fino (medium):  ${nueva.lineas.map((l) => l.texto).join(' ').slice(0, 110)}`);
    }
  }

  console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`}`);
  app.exit(fallos === 0 ? 0 : 1);
}
