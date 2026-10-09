// Graba la clase que suena en la máquina y la deja transcrita en userData.
//
// POR QUÉ EXISTE
// El 2026-09-14 la profesora dictó la consigna completa de viva voz y la
// actividad quedó en iVirtual sin consigna publicada. El scraper no puede ver
// lo que nadie escribió: la tarea estaba en el audio y en ningún otro lado.
//
// QUÉ PONE ESTE HANDLER Y QUÉ PONE PYTHON
// Acá vive el ciclo de vida de la sesión (carpeta, meta.json, arranque, parada,
// eventos al renderer) y la captura de pantalla, que Electron ya sabe hacer.
// La captura de audio y la transcripción viven en `electron/clase/daemon.py`
// porque faster-whisper es ctranslate2 y no hay equivalente en Node que no
// implique mandar el audio de la clase a un servicio ajeno.
//
// LA TRANSCRIPCIÓN NO PASA POR ACÁ
// El daemon la escribe a `transcript.jsonl` y este handler solo lee ese archivo.
// Si la app se cierra en medio de la clase el daemon sigue y no se pierde nada;
// si el daemon muere, lo transcrito hasta ese momento ya está en disco.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, desktopCapturer, dialog, ipcMain, net, protocol, screen, BrowserWindow } = require('electron');

const { getSessionsForToday, timeToMinutes } = require('./notifications');
const { getCachedHorario } = require('./horario');

const CARPETA = 'clase';
const META = 'meta.json';
const TRANSCRIPT = 'transcript.jsonl';
const CONFIG = 'config.json';

// SUBIR ESTE NÚMERO si cambia la forma de meta.json. El servidor MCP declara
// qué versión sabe leer y avisa cuando no coinciden, en vez de servir campos
// que ya no significan lo mismo.
const META_VERSION = 1;

const MODELOS = ['tiny', 'base', 'small', 'medium', 'large-v3'];
const SEGUNDOS_ENTRE_CAPTURAS = 12;

// Estado del proceso vivo. Uno solo a la vez: dos daemons compiten por el mismo
// loopback y escriben dos transcripciones de la misma clase.
let activo = null;

function dirBase() {
  return path.join(app.getPath('userData'), CARPETA);
}

function dirSesion(id) {
  return path.join(dirBase(), id);
}

function leerJson(ruta, porDefecto) {
  try {
    return JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch (_error) {
    return porDefecto;
  }
}

function escribirJson(ruta, datos) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), 'utf8');
}

function leerConfig() {
  return leerJson(path.join(dirBase(), CONFIG), {});
}

// ---------------------------------------------------------------------------
// El intérprete de Python
// ---------------------------------------------------------------------------

// No se empaqueta un Python con la app: ctranslate2 y los modelos de whisper son
// cientos de MB y la mayoría de los alumnos no va a usar este módulo. Se busca
// uno que ya tenga las tres dependencias y, si no hay, se explica qué instalar.
function candidatosPython() {
  const config = leerConfig();
  const home = os.homedir();

  return [
    process.env.DVPOTRO_PYTHON,
    config.python,
    // Un venv dedicado es lo recomendado: ctranslate2 no publica wheels para las
    // versiones más nuevas de Python y el intérprete del sistema suele ir adelante.
    path.join(home, '.dvpotro', 'whisper-venv', 'Scripts', 'python.exe'),
    path.join(home, '.claude', 'tools', 'whisper-venv', 'Scripts', 'python.exe'),
    'python',
  ].filter(Boolean);
}

function probarPython(ejecutable) {
  return new Promise((resolve) => {
    const proceso = spawn(ejecutable, ['-c', 'import faster_whisper, pyaudiowpatch, numpy; print("ok")'], {
      windowsHide: true,
    });

    let salida = '';
    let error = '';

    proceso.stdout.on('data', (d) => { salida += d; });
    proceso.stderr.on('data', (d) => { error += d; });
    proceso.on('error', (e) => resolve({ ok: false, error: e.message }));
    proceso.on('close', () => {
      if (salida.includes('ok')) {
        resolve({ ok: true, ejecutable });
        return;
      }

      // El nombre del módulo que falta es la única parte del traceback que le
      // sirve a quien tiene que instalarlo.
      const falta = /No module named '([^']+)'/.exec(error);
      resolve({ ok: false, error: falta ? `falta el módulo ${falta[1]}` : (error.trim().split('\n').pop() || 'no respondió') });
    });
  });
}

async function resolverPython() {
  const intentos = [];

  for (const candidato of candidatosPython()) {
    const resultado = await probarPython(candidato);

    if (resultado.ok) {
      return { ok: true, python: candidato, intentos };
    }

    intentos.push({ candidato, error: resultado.error });
  }

  return {
    ok: false,
    intentos,
    error:
      'No hay un Python con faster-whisper, pyaudiowpatch y numpy. Creá un venv con Python 3.12 ' +
      '(ctranslate2 no publica wheels para las versiones más nuevas), instalá ahí ' +
      '`faster-whisper pyaudiowpatch`, y guardá la ruta del python.exe en Ajustes.',
  };
}

// ---------------------------------------------------------------------------
// Qué clase está pasando ahora
// ---------------------------------------------------------------------------

// Se resuelve desde el horario ya cacheado y no se le pide al usuario: la sesión
// se etiqueta sola con la materia correcta, que es lo que después permite buscar
// "qué dijo la profe de Matemáticas Computacionales" sin acordarse de la fecha.
function claseActual(ahora = new Date()) {
  const sesiones = getSessionsForToday(getCachedHorario(), ahora);
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();

  for (const { materia, session } of sesiones) {
    const inicio = timeToMinutes(session.horaInicio);
    const fin = timeToMinutes(session.horaFin);

    if (inicio === null || fin === null) continue;

    // Margen hacia atrás: se suele arrancar la grabación unos minutos después de
    // que la clase empezó, y ahí la sesión ya no matchearía por poco.
    if (minutos >= inicio - 10 && minutos <= fin + 5) {
      return {
        clave: materia.clave || materia.codigo || null,
        nombre: materia.nombre || null,
        // El scraper de CIA lo guarda como `instructor`: leyendo solo `profesor`
        // quedaba en null en todas las sesiones auto-detectadas.
        profesor: materia.profesor || materia.instructor || null,
        horaInicio: session.horaInicio,
        horaFin: session.horaFin,
        modalidad: session.esEnLinea ? 'en_linea' : (materia.modalidad || null),
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Captura de pantalla
// ---------------------------------------------------------------------------

// Firma diminuta para comparar dos capturas. 32x18 en escala de gris son 576
// números: alcanza de sobra para distinguir un cambio de diapositiva y es
// insensible al cursor, al reloj de la barra de tareas y al ruido de compresión.
const FIRMA_ANCHO = 32;
const FIRMA_ALTO = 18;

function firmaDe(imagen) {
  const chico = imagen.resize({ width: FIRMA_ANCHO, height: FIRMA_ALTO, quality: 'good' });
  const bitmap = chico.toBitmap();
  const firma = new Uint8Array(FIRMA_ANCHO * FIRMA_ALTO);

  // BGRA: se promedian los tres canales de color y se ignora el alfa.
  for (let i = 0, p = 0; p < firma.length; i += 4, p += 1) {
    firma[p] = (bitmap[i] + bitmap[i + 1] + bitmap[i + 2]) / 3;
  }

  return firma;
}

function bastanteDistinta(a, b) {
  if (!a || !b || a.length !== b.length) return true;

  let suma = 0;

  for (let i = 0; i < a.length; i += 1) {
    suma += Math.abs(a[i] - b[i]);
  }

  // Umbral sobre la diferencia media por píxel, en una escala de 0 a 255. Con 3
  // sobrevive el ruido de compresión y el cursor moviéndose, y cae cualquier
  // cambio de lámina o de ventana.
  return suma / a.length > 3;
}

// Las diapositivas no están en el audio. Un frame cada 12 segundos alcanza: una
// presentación de clase cambia de lámina cada varios minutos.
//
// SE GUARDA SOLO SI LA PANTALLA CAMBIÓ. Sin esto, dos horas de clase dejaban ~600
// JPEG de ~47 KB —28 MB— y casi todos eran la misma lámina repetida. Con la
// comparación de firmas queda una imagen por lámina, que además es lo que hace
// revisable la carpeta después.
async function capturarPantalla(destino, indice, firmaPrevia) {
  const { width, height } = screen.getPrimaryDisplay().size;

  // thumbnailSize es el tamaño REAL de lo que devuelve, no un preview: con el
  // default (150x150) las diapositivas salen ilegibles. Se pide la mitad de la
  // resolución, que deja el texto de una presentación perfectamente leíble y
  // pesa una fracción.
  const fuentes = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width / 2), height: Math.round(height / 2) },
  });

  if (fuentes.length === 0) return null;

  const imagen = fuentes[0].thumbnail;

  if (imagen.isEmpty()) return null;

  const firma = firmaDe(imagen);

  if (!bastanteDistinta(firma, firmaPrevia)) {
    return { firma, nombre: null };
  }

  // El nombre lleva el segundo de la clase y no un contador: así una captura se
  // puede cruzar con lo que se estaba diciendo en ese momento del transcript.
  const nombre = `f_${String(indice).padStart(5, '0')}s.jpg`;
  fs.writeFileSync(path.join(destino, nombre), imagen.toJPEG(70));
  return { firma, nombre };
}

// ---------------------------------------------------------------------------
// Ciclo de vida de la sesión
// ---------------------------------------------------------------------------

function avisarRenderer(canal, datos) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(canal, datos);
  }
}

function nuevoId(ahora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}`;
}

function guardarMeta(id, cambios) {
  const ruta = path.join(dirSesion(id), META);
  const actual = leerJson(ruta, {});
  const siguiente = { ...actual, ...cambios };
  escribirJson(ruta, siguiente);
  return siguiente;
}

async function iniciar({ modelo = 'small', materia, conPantalla = true, titulo = null } = {}) {
  if (activo) {
    return { ok: false, error: `Ya hay una grabación corriendo (${activo.id}). Detenela antes de empezar otra.` };
  }

  if (!MODELOS.includes(modelo)) {
    return { ok: false, error: `Modelo desconocido: ${modelo}. Disponibles: ${MODELOS.join(', ')}.` };
  }

  const python = await resolverPython();

  if (!python.ok) {
    return { ok: false, error: python.error, intentos: python.intentos };
  }

  const id = nuevoId();
  const carpeta = dirSesion(id);
  fs.mkdirSync(carpeta, { recursive: true });

  // `materia === undefined` es "no lo mandaron, detectá sola"; `null` explícito
  // es el picker de la UI diciendo a propósito "esta clase no tiene materia", y
  // ahí no se pisa con el horario. Con `||` un `null` explícito nunca se podía
  // distinguir de "no vino nada" y el auto-detect lo tapaba siempre.
  const detectada = materia !== undefined ? materia : claseActual();
  const tituloLimpio = titulo ? String(titulo).trim().slice(0, 200) || null : null;
  const inicio = Date.now();

  guardarMeta(id, {
    version: META_VERSION,
    id,
    inicio,
    fin: null,
    estado: 'grabando',
    modelo,
    materia: detectada,
    titulo: tituloLimpio,
    python: python.python,
    conPantalla,
  });

  const script = path.join(__dirname, '..', 'clase', 'daemon.py');
  const proceso = spawn(
    python.python,
    ['-u', script, '--salida', carpeta, '--modelo', modelo, '--idioma', 'es', '--vigilar-stdin'],
    {
      windowsHide: true,
      // Sin esto los acentos del daemon llegan como mojibake y el JSON de stdout
      // se rompe en la primera palabra con tilde.
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    },
  );

  activo = {
    id,
    proceso,
    carpeta,
    inicio,
    modelo,
    materia: detectada,
    titulo: tituloLimpio,
    ultimoEvento: null,
    atrasado: false,
    frames: 0,
    // Se acumulan de los eventos del daemon en vez de leerse del disco: `estado()`
    // lo llama la UI cada 5 s durante toda la clase.
    segmentos: 0,
    capturado: 0,
    firmaPantalla: null,
    repetidas: 0,
    temporizadorPantalla: null,
  };

  let pendiente = '';

  proceso.stdout.on('data', (chunk) => {
    pendiente += chunk.toString();
    let corte = pendiente.indexOf('\n');

    while (corte !== -1) {
      const linea = pendiente.slice(0, corte).trim();
      pendiente = pendiente.slice(corte + 1);

      if (linea) {
        try {
          const evento = JSON.parse(linea);

          if (activo) {
            activo.ultimoEvento = evento;
            if (evento.evt === 'atraso') activo.atrasado = true;
            if (evento.evt === 'audio_faltante') activo.audioFaltante = evento;
            // El daemon ya contó las líneas del tramo: sumarlas sale gratis y
            // evita releer el transcript en cada `estado()`.
            if (evento.evt === 'tramo') {
              activo.segmentos += evento.lineas || 0;
              activo.capturado = Math.round((evento.offset || 0) + (evento.duracion || 0));
            }
          }

          // A la consola además del renderer: estos tres son los que explican una
          // grabación que salió mal, y sin la app abierta —o en un test— el evento
          // no tendría a dónde llegar.
          if (['audio_faltante', 'dispositivo_perdido', 'error_dispositivo', 'parando', 'detenido'].includes(evento.evt)) {
            console.warn('[clase]', evento.evt, JSON.stringify(evento));
          }

          avisarRenderer('clase:evento', { id, ...evento });
        } catch (_error) {
          console.warn('[clase] evento ilegible del daemon:', linea.slice(0, 120));
        }
      }

      corte = pendiente.indexOf('\n');
    }
  });

  proceso.stderr.on('data', (chunk) => {
    console.log('[clase/py]', chunk.toString().trimEnd());
  });

  proceso.on('error', (error) => {
    console.error('[clase] no se pudo lanzar el daemon:', error?.message);
    guardarMeta(id, { estado: 'error', error: error?.message, fin: Date.now() });
    avisarRenderer('clase:evento', { id, evt: 'error', detalle: error?.message });
    limpiarActivo();
  });

  proceso.on('close', (codigo) => {
    // Si el proceso se cae solo, meta.json tiene que decirlo: una sesión que
    // quedó en "grabando" para siempre hace creer que el audio sigue entrando.
    const meta = leerJson(path.join(carpeta, META), {});

    if (meta.estado === 'grabando') {
      guardarMeta(id, {
        estado: codigo === 0 ? 'terminada' : 'error',
        fin: Date.now(),
        codigoSalida: codigo,
      });
    }

    avisarRenderer('clase:evento', { id, evt: 'cerrado', codigo });
    limpiarActivo();
  });

  if (conPantalla) {
    const destino = path.join(carpeta, 'pantalla');
    fs.mkdirSync(destino, { recursive: true });

    activo.temporizadorPantalla = setInterval(async () => {
      // Sin este guard los tics se encabalgan: `desktopCapturer.getSources` tarda
      // ~300 ms de por sí y bajo carga bastante más, y varias capturas en vuelo a
      // la vez le comen el turno al hilo que está grabando la clase.
      if (!activo || activo.capturando) return;

      activo.capturando = true;

      try {
        const segundo = Math.round((Date.now() - activo.inicio) / 1000);
        const captura = await capturarPantalla(destino, segundo, activo.firmaPantalla);

        if (captura) {
          activo.firmaPantalla = captura.firma;
          if (captura.nombre) activo.frames += 1;
          else activo.repetidas += 1;
        }
      } catch (error) {
        // Una captura fallida no puede tumbar la grabación: el audio es el dato
        // que importa y las diapositivas son el complemento.
        console.warn('[clase] captura de pantalla fallida:', error?.message);
      } finally {
        if (activo) activo.capturando = false;
      }
    }, SEGUNDOS_ENTRE_CAPTURAS * 1000);
  }

  return { ok: true, id, materia: detectada, titulo: tituloLimpio, modelo, python: python.python };
}

function limpiarActivo() {
  if (activo?.temporizadorPantalla) {
    clearInterval(activo.temporizadorPantalla);
  }

  activo = null;
}

async function detener() {
  if (!activo) {
    return { ok: false, error: 'No hay ninguna grabación corriendo.' };
  }

  const { id, proceso, carpeta, frames, repetidas } = activo;

  if (activo.temporizadorPantalla) {
    clearInterval(activo.temporizadorPantalla);
    activo.temporizadorPantalla = null;
  }

  // "parar" por stdin y NO kill: en Windows `proceso.kill()` es TerminateProcess
  // y el daemon no llega a transcribir el último tramo — justo donde el profesor
  // dicta la tarea. El kill queda de último recurso si no se cierra solo.
  await new Promise((resolve) => {
    let listo = false;

    const terminar = () => {
      if (listo) return;
      listo = true;
      resolve();
    };

    proceso.once('close', terminar);

    try {
      proceso.stdin.write('parar\n');
    } catch (_error) {
      proceso.kill();
    }

    // El tramo pendiente puede tardar: hasta 30 s de audio contra el modelo. Con
    // `small` son ~6 s, pero alguien puede haber elegido `medium` o `large-v3`,
    // donde el mismo tramo se va a 20-60 s.
    setTimeout(() => {
      if (!listo) {
        console.warn('[clase] el daemon no cerró en 90s, se lo mata');
        proceso.kill();
        terminar();
      }
    }, 90000);
  });

  const meta = guardarMeta(id, {
    estado: 'terminada',
    fin: Date.now(),
    frames,
    // `repetidas` son las capturas descartadas por idénticas. Queda escrito para
    // poder saber después si la deduplicación está calibrada o de más.
    repetidas,
    segmentos: contarLineas(path.join(carpeta, TRANSCRIPT)),
  });

  limpiarActivo();
  return { ok: true, id, meta };
}

// Solo para sesiones VIEJAS cuyo meta.json no guardó la cuenta — las que quedaron
// a medias por un cierre sucio. Mientras graba, la cuenta sale de los eventos del
// daemon y no toca el disco.
//
// Cuenta saltos de línea sobre el Buffer en vez de `split('\n').filter(Boolean)`,
// que construye un array de 1.750 strings para después tirarlo.
function contarLineas(ruta) {
  try {
    const buffer = fs.readFileSync(ruta);
    let total = 0;

    for (let i = 0; i < buffer.length; i += 1) {
      if (buffer[i] === 0x0a) total += 1;
    }

    return total;
  } catch (_error) {
    return 0;
  }
}

// El transcript entero, para las operaciones sobre sesiones TERMINADAS (unir,
// exportar). Mientras graba se usa `leerTranscript` con offset, no esto.
function leerLineasCompletas(ruta) {
  let crudo;

  try {
    crudo = fs.readFileSync(ruta, 'utf8');
  } catch (_error) {
    return [];
  }

  const lineas = [];

  for (const linea of crudo.split('\n')) {
    if (!linea.trim()) continue;

    try {
      lineas.push(JSON.parse(linea));
    } catch (_error) {
      // Una línea ilegible no invalida las demás.
    }
  }

  return lineas;
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

function listarSesiones() {
  let ids;

  try {
    ids = fs.readdirSync(dirBase(), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch (_error) {
    return [];
  }

  return ids
    .map((id) => {
      const meta = leerJson(path.join(dirSesion(id), META), null);

      if (!meta) return null;

      return {
        ...meta,
        segmentos: meta.segmentos ?? contarLineas(path.join(dirSesion(id), TRANSCRIPT)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.inicio || 0) - (a.inicio || 0));
}

// LEE DESDE UN OFFSET, no el archivo entero. La UI refresca cada 5 s mientras la
// clase corre, y una clase de dos horas deja ~1.750 líneas / ~210 KB: releer,
// re-parsear y volver a mandar todo por IPC 1.440 veces era el único costo del
// módulo que crecía con la duración de la clase. Con `desdeByte` cada refresco
// lee solo lo que se agregó — unos cientos de bytes.
//
// `siguienteByte` se corta en el último salto de línea COMPLETO: el daemon puede
// estar escribiendo justo ahora y media línea no se puede parsear. Esa mitad
// llega entera en el refresco siguiente.
function leerTranscript(id, { desdeMinuto = 0, hastaMinuto = null, desdeByte = 0 } = {}) {
  const ruta = path.join(dirSesion(id), TRANSCRIPT);

  let tamano;

  try {
    tamano = fs.statSync(ruta).size;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ok: false, error: `La sesión ${id} no tiene transcripción todavía.` };
    }

    return { ok: false, error: error.message };
  }

  // Un archivo más chico que el offset significa que lo reemplazaron —
  // `--retranscribir` lo reescribe entero— así que se relee desde cero en vez de
  // servir un pedazo del medio de un texto nuevo.
  const arranque = desdeByte > tamano ? 0 : desdeByte;

  if (arranque >= tamano) {
    return { ok: true, id, lineas: [], siguienteByte: tamano, reiniciado: false };
  }

  let crudo;

  try {
    const fd = fs.openSync(ruta, 'r');

    try {
      const buffer = Buffer.allocUnsafe(tamano - arranque);
      const leidos = fs.readSync(fd, buffer, 0, buffer.length, arranque);
      crudo = buffer.toString('utf8', 0, leidos);
    } finally {
      fs.closeSync(fd);
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const corte = crudo.lastIndexOf('\n');
  const completo = corte === -1 ? '' : crudo.slice(0, corte + 1);
  const siguienteByte = arranque + Buffer.byteLength(completo, 'utf8');

  const desde = desdeMinuto * 60;
  const hasta = hastaMinuto === null ? Infinity : hastaMinuto * 60;
  const lineas = [];

  for (const linea of completo.split('\n')) {
    if (!linea) continue;

    try {
      const item = JSON.parse(linea);
      if (item.inicio >= desde && item.inicio <= hasta) lineas.push(item);
    } catch (_error) {
      // Una línea ilegible no invalida las demás: se descarta y se sigue.
    }
  }

  return { ok: true, id, lineas, siguienteByte, reiniciado: desdeByte > tamano };
}

function estado() {
  if (!activo) {
    return { ok: true, grabando: false, sesiones: listarSesiones().length };
  }

  return {
    ok: true,
    grabando: true,
    id: activo.id,
    inicio: activo.inicio,
    minutos: Math.round((Date.now() - activo.inicio) / 60000),
    modelo: activo.modelo,
    materia: activo.materia,
    titulo: activo.titulo,
    frames: activo.frames,
    repetidas: activo.repetidas,
    atrasado: activo.atrasado,
    // Se acumula de los eventos `tramo` del daemon, que ya traen la cuenta. Antes
    // se leía el transcript entero acá, y `estado()` lo llama la UI cada 5 s.
    segmentos: activo.segmentos,
    capturado: activo.capturado,
    ultimoEvento: activo.ultimoEvento,
  };
}

async function diagnostico() {
  const python = await resolverPython();

  return {
    ok: true,
    python: python.ok ? python.python : null,
    listo: python.ok,
    error: python.ok ? null : python.error,
    intentos: python.intentos,
    claseActual: claseActual(),
    carpeta: dirBase(),
  };
}

function guardarPython(ruta) {
  const config = leerConfig();
  escribirJson(path.join(dirBase(), CONFIG), { ...config, python: ruta || undefined });
  return { ok: true };
}

// Segunda pasada sobre una sesión ya grabada, con un modelo más grande. Existe
// porque la pasada en vivo tiene que ganarle al reloj y por eso corre con `small`;
// acá el audio ya está en disco y puede tardar lo que quiera.
//
// No corre si hay una grabación en curso: son los dos procesos más pesados del
// módulo y ponerlos a competir por los mismos núcleos es exactamente lo que hace
// que la grabación se atrase y pierda audio.
async function retranscribir({ id, modelo = 'medium' } = {}) {
  if (activo) {
    return { ok: false, error: 'Hay una grabación en curso. Esperá a que termine: las dos cosas juntas se pelean el CPU y la que pierde es la que está grabando.' };
  }

  if (!MODELOS.includes(modelo)) {
    return { ok: false, error: `Modelo desconocido: ${modelo}. Disponibles: ${MODELOS.join(', ')}.` };
  }

  const carpeta = dirSesion(id);

  // El daemon rehace transcript.jsonl a partir de audio.wav y nada más: en una
  // sesión unida borraría en silencio todo lo que vino de las otras partes.
  if (leerMeta(id)?.partes?.length) {
    return { ok: false, error: 'Esta sesión es la unión de varias grabaciones y re-transcribirla borraría el texto de las otras partes. Hacelo antes de unirlas.' };
  }

  if (!fs.existsSync(path.join(carpeta, 'audio.wav'))) {
    return { ok: false, error: `La sesión ${id} no guardó el audio crudo: no hay nada que volver a transcribir.` };
  }

  const python = await resolverPython();

  if (!python.ok) return { ok: false, error: python.error };

  const script = path.join(__dirname, '..', 'clase', 'daemon.py');

  return new Promise((resolve) => {
    const proceso = spawn(
      python.python,
      ['-u', script, '--salida', carpeta, '--modelo', modelo, '--idioma', 'es', '--retranscribir'],
      { windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
    );

    let pendiente = '';
    let resultado = null;

    proceso.stdout.on('data', (chunk) => {
      pendiente += chunk.toString();
      let corte = pendiente.indexOf('\n');

      while (corte !== -1) {
        const linea = pendiente.slice(0, corte).trim();
        pendiente = pendiente.slice(corte + 1);

        if (linea) {
          try {
            const evento = JSON.parse(linea);
            if (evento.evt === 'retranscrito') resultado = evento;
            avisarRenderer('clase:evento', { id, ...evento });
          } catch (_error) {
            // Línea de diagnóstico sin formato: no es fatal.
          }
        }

        corte = pendiente.indexOf('\n');
      }
    });

    proceso.stderr.on('data', (chunk) => console.log('[clase/py]', chunk.toString().trimEnd()));
    proceso.on('error', (error) => resolve({ ok: false, error: error.message }));
    proceso.on('close', (codigo) => {
      if (codigo !== 0 || !resultado) {
        resolve({ ok: false, error: `La re-transcripción terminó con código ${codigo}.` });
        return;
      }

      guardarMeta(id, { modelo, segmentos: resultado.segmentos, retranscrito: Date.now() });
      resolve({ ok: true, id, ...resultado });
    });
  });
}

// ---------------------------------------------------------------------------
// Título y materia — editables después de grabar, y no solo al arrancar
// ---------------------------------------------------------------------------

function leerMeta(id) {
  return leerJson(path.join(dirSesion(id), META), null);
}

// `activo` no alcanza para saber si una sesión sigue grabando: si la app se
// reinicia en medio de la clase, el daemon sigue escribiendo en su carpeta y
// meta.json se queda en "grabando" sin que este proceso lo sepa. Que el wav o el
// transcript se hayan tocado hace poco es la única prueba de vida que no depende
// de quién lanzó el daemon. Y sin ese chequeo de frescura, una sesión que murió
// sucia quedaría en "grabando" para siempre y no se podría ni borrar ni unir.
const SEGUNDOS_SIN_ESCRITURA_PARA_DARLA_POR_MUERTA = 120;

function sigueGrabando(id, meta) {
  if (activo && activo.id === id) return true;
  if (meta?.estado !== 'grabando') return false;

  const ultimaEscritura = ['audio.wav', TRANSCRIPT].reduce((maximo, archivo) => {
    try {
      return Math.max(maximo, fs.statSync(path.join(dirSesion(id), archivo)).mtimeMs);
    } catch (_error) {
      return maximo;
    }
  }, 0);

  return Date.now() - ultimaEscritura < SEGUNDOS_SIN_ESCRITURA_PARA_DARLA_POR_MUERTA * 1000;
}

// El picker de la UI manda el objeto de `claseActual()`, pero un string suelto
// (MCP, consola) no puede terminar guardado tal cual: todo lo que lee meta.json
// espera `materia.nombre`.
function normalizarMateria(materia) {
  if (materia === null) return null;
  if (typeof materia === 'string') {
    const nombre = materia.trim();
    return nombre ? { clave: null, nombre, profesor: null, horaInicio: null, horaFin: null, modalidad: null } : null;
  }
  if (typeof materia === 'object') return materia;
  return null;
}

// Solo estos dos campos se dejan tocar desde acá: el resto (estado, tiempos,
// modelo, partes) lo administra este archivo y no un picker de la UI.
function actualizarMeta({ id, titulo, materia } = {}) {
  if (!id) return { ok: false, error: 'Falta el id de la sesión.' };

  const actual = leerMeta(id);

  if (!actual) return { ok: false, error: `No existe la sesión ${id}.` };

  const cambios = {};

  if (titulo !== undefined) cambios.titulo = titulo ? String(titulo).trim().slice(0, 200) || null : null;
  if (materia !== undefined) cambios.materia = normalizarMateria(materia);

  if (Object.keys(cambios).length === 0) {
    return { ok: false, error: 'Nada para actualizar: mandá titulo y/o materia.' };
  }

  const meta = guardarMeta(id, cambios);

  // La sesión puede estar grabando en este momento: `estado()` durante la clase
  // lee del objeto en memoria y no de meta.json, así que sin esto el cambio no
  // se vería en la UI hasta detener.
  if (activo && activo.id === id) {
    if ('titulo' in cambios) activo.titulo = cambios.titulo;
    if ('materia' in cambios) activo.materia = cambios.materia;
  }

  return { ok: true, id, meta };
}

// ---------------------------------------------------------------------------
// Unir sesiones — una clase que se cortó por un receso vuelve a ser una sola
// ---------------------------------------------------------------------------

// La que arrancó ANTES es la base y sobrevive; la de después se pega al final
// con el desfasaje de reloj entre las dos y se borra. Nunca al revés: pegarle
// audio futuro a una base más nueva dejaría un transcript con los minutos
// desordenados.
async function fusionar({ base, extra } = {}) {
  if (!base || !extra) return { ok: false, error: 'Faltan las dos sesiones a unir.' };
  if (base === extra) return { ok: false, error: 'No se puede unir una sesión consigo misma.' };

  const metaBase = leerMeta(base);
  const metaExtra = leerMeta(extra);

  if (!metaBase) return { ok: false, error: `No existe la sesión ${base}.` };
  if (!metaExtra) return { ok: false, error: `No existe la sesión ${extra}.` };

  if (sigueGrabando(base, metaBase) || sigueGrabando(extra, metaExtra)) {
    return { ok: false, error: 'Una de las dos sesiones se está grabando ahora mismo. Detenela antes de unir.' };
  }

  if (!(metaBase.inicio < metaExtra.inicio)) {
    return { ok: false, error: 'La sesión base tiene que haber empezado antes que la que se une.' };
  }

  const partesPrevias = Array.isArray(metaBase.partes) ? metaBase.partes : [];

  // Un reintento después de una unión que se cortó a la mitad no puede pegar el
  // transcript dos veces.
  if (partesPrevias.some((parte) => parte.id === extra)) {
    return { ok: false, error: `La sesión ${extra} ya está unida a ${base}.` };
  }

  const carpetaBase = dirSesion(base);
  const carpetaExtra = dirSesion(extra);
  const offsetSegundos = Math.round((metaExtra.inicio - metaBase.inicio) / 1000);

  try {
    // 1. Capturas de pantalla: se copian (no se mueven) a la carpeta de la
    // base con el nombre renumerado. Si algo de lo que sigue falla, la extra
    // tiene que seguir intacta para poder reintentar.
    const pantallaExtra = path.join(carpetaExtra, 'pantalla');
    let framesTraidos = 0;

    if (fs.existsSync(pantallaExtra)) {
      const pantallaBase = path.join(carpetaBase, 'pantalla');
      fs.mkdirSync(pantallaBase, { recursive: true });

      for (const nombre of fs.readdirSync(pantallaExtra)) {
        const match = /^f_(\d+)s\.jpg$/.exec(nombre);
        if (!match) continue;

        const segundo = Number(match[1]) + offsetSegundos;
        const nuevoNombre = `f_${String(segundo).padStart(5, '0')}s.jpg`;
        fs.copyFileSync(path.join(pantallaExtra, nombre), path.join(pantallaBase, nuevoNombre));
        framesTraidos += 1;
      }
    }

    // 2. Audio: se copia entero como parte adicional, SIN reencodear. Unir dos
    // wav de verdad requiere decodificar y volver a codificar los dos, y este
    // módulo no tiene ninguna razón para sumar esa dependencia: mantenerlos
    // separados con el offset guardado en meta no pierde nada.
    //
    // El número sale de lo que YA hay en disco y no de `partes.length`: con una
    // parte borrada a mano, contar pisaría un wav existente.
    let ultimoNumero = fs.readdirSync(carpetaBase).reduce((maximo, nombre) => {
      const match = /^audio_parte(\d+)\.wav$/.exec(nombre);
      return match ? Math.max(maximo, Number(match[1])) : maximo;
    }, 1);

    const copiarAudio = (origen) => {
      if (!fs.existsSync(origen)) return null;

      ultimoNumero += 1;
      const nombre = `audio_parte${ultimoNumero}.wav`;
      fs.copyFileSync(origen, path.join(carpetaBase, nombre));
      return nombre;
    };

    const partesNuevas = [
      {
        id: extra,
        offsetSegundos,
        audio: copiarAudio(path.join(carpetaExtra, 'audio.wav')),
        frames: framesTraidos,
        inicio: metaExtra.inicio,
        fin: metaExtra.fin,
      },
      // Si la extra ya era el resultado de otra unión, sus propias partes viajan
      // con ella: sin esto sus audio_parteN.wav se iban con el rmSync del final.
      ...(Array.isArray(metaExtra.partes) ? metaExtra.partes : []).map((parte) => ({
        ...parte,
        offsetSegundos: (parte.offsetSegundos || 0) + offsetSegundos,
        audio: parte.audio ? copiarAudio(path.join(carpetaExtra, parte.audio)) : null,
      })),
    ];

    // 3. Transcript: las líneas de la extra se desplazan al reloj de la base.
    // `reloj` NO se toca: es la hora de pared absoluta (epoch) en que se dijo la
    // frase, y ya es correcta — sumarle el offset la corría la duración entera
    // de la primera parte.
    //
    // Se escribe a un temporal y se renombra encima: con un append directo, un
    // corte a mitad de camino dejaba media extra pegada y el reintento la
    // duplicaba.
    const lineasExtra = leerLineasCompletas(path.join(carpetaExtra, TRANSCRIPT));
    const rutaTranscript = path.join(carpetaBase, TRANSCRIPT);

    if (lineasExtra.length > 0) {
      const previo = fs.existsSync(rutaTranscript) ? fs.readFileSync(rutaTranscript, 'utf8') : '';
      const separador = previo && !previo.endsWith('\n') ? '\n' : '';
      const desplazadas = lineasExtra
        .map((linea) => JSON.stringify({
          ...linea,
          inicio: linea.inicio + offsetSegundos,
          fin: linea.fin + offsetSegundos,
        }))
        .join('\n');

      const temporal = `${rutaTranscript}.uniendo`;
      fs.writeFileSync(temporal, `${previo}${separador}${desplazadas}\n`, 'utf8');
      fs.renameSync(temporal, rutaTranscript);
    }

    const meta = guardarMeta(base, {
      fin: metaExtra.fin || metaBase.fin,
      segmentos: contarLineas(rutaTranscript),
      frames: (metaBase.frames || 0) + framesTraidos,
      partes: [...partesPrevias, ...partesNuevas],
    });

    // Recién ahora, con todo copiado y confirmado en el meta.json de la base,
    // se borra la extra. Si algo de arriba tira, la extra queda intacta y se
    // puede reintentar la unión sin haber perdido nada.
    fs.rmSync(carpetaExtra, { recursive: true, force: true });

    return { ok: true, id: base, eliminada: extra, meta };
  } catch (error) {
    return { ok: false, error: `No se pudo unir: ${error.message}` };
  }
}

// ---------------------------------------------------------------------------
// Borrar sesión
// ---------------------------------------------------------------------------

function eliminar({ id } = {}) {
  if (!id) return { ok: false, error: 'Falta el id de la sesión.' };

  if (sigueGrabando(id, leerMeta(id))) {
    return { ok: false, error: 'Esa sesión se está grabando ahora mismo. Detenela antes de borrarla.' };
  }

  const carpeta = dirSesion(id);

  if (!fs.existsSync(carpeta)) {
    return { ok: false, error: `No existe la sesión ${id}.` };
  }

  try {
    fs.rmSync(carpeta, { recursive: true, force: true });
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// Capturas de pantalla de una sesión — listado para la galería de la UI
// ---------------------------------------------------------------------------

function listarCapturas(id) {
  const carpeta = path.join(dirSesion(id), 'pantalla');
  let archivos;

  try {
    archivos = fs.readdirSync(carpeta);
  } catch (_error) {
    return { ok: true, id, capturas: [] };
  }

  const capturas = archivos
    .map((nombre) => {
      const match = /^f_(\d+)s\.jpg$/.exec(nombre);
      if (!match) return null;

      const ruta = path.join(carpeta, nombre);

      // Cada segmento codificado por separado: `encodeURI` deja pasar `#` y `?`,
      // y una carpeta de usuario con cualquiera de los dos cortaba la URL ahí.
      // `resolverCapturaPath` deshace esto con `decodeURIComponent`.
      const url = `${CLASE_IMG_SCHEME}:///${ruta.split(path.sep).map(encodeURIComponent).join('/')}`;

      return { archivo: nombre, segundo: Number(match[1]), ruta, url };
    })
    .filter(Boolean)
    .sort((a, b) => a.segundo - b.segundo);

  return { ok: true, id, capturas };
}

// Sirve los .jpg de `pantalla/` al renderer. Hace falta un protocolo propio y
// no `file://` porque el renderer corre en http://localhost en dev (Vite) y
// Chromium bloquea subresources file:// desde un origin http — mismo motivo
// por el que Música y Notas ya tienen el suyo (`dvpotro-media`,
// `dvpotro-note-img`). Uno nuevo y no reusar esos dos: ninguno tiene por qué
// saber que existe el módulo de clase.
const CLASE_IMG_SCHEME = 'dvpotro-clase-img';

// Único cerco del protocolo: solo sirve .jpg que caigan DENTRO de la carpeta
// de clase. Sin esto sería una lectura arbitraria de disco disfrazada de URL.
function resolverCapturaPath(src) {
  if (!src || typeof src !== 'string') return null;

  try {
    const decoded = src.startsWith(`${CLASE_IMG_SCHEME}://`)
      ? decodeURIComponent(new URL(src).pathname)
      : src;
    const filePath = path.normalize(
      process.platform === 'win32' && /^\/[a-z]:/i.test(decoded) ? decoded.slice(1) : decoded,
    );

    // Con `path.sep` al final: sin él, una carpeta hermana llamada
    // "clase-otra" pasaría el startsWith.
    if (!filePath.startsWith(dirBase() + path.sep)) return null;
    if (path.extname(filePath).toLowerCase() !== '.jpg') return null;
    if (!fs.existsSync(filePath)) return null;

    return filePath;
  } catch (_error) {
    return null;
  }
}

// Los privilegios de un scheme custom se registran ANTES de app.whenReady().
function registerClaseImageScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: CLASE_IMG_SCHEME, privileges: { supportFetchAPI: true, stream: true } },
  ]);
}

// El handler del protocolo se registra DENTRO de whenReady — se llama desde
// `registerClaseHandlers()` mismo, mismo patrón que `registerNotesHandlers()`
// con el suyo, para no obligar a `main.js` a acordarse de un segundo call.
function registerClaseImageProtocol() {
  protocol.handle(CLASE_IMG_SCHEME, (request) => {
    const filePath = resolverCapturaPath(request.url);

    if (!filePath) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers });
  });
}

// ---------------------------------------------------------------------------
// Exportar transcripción a un archivo elegido por el usuario
// ---------------------------------------------------------------------------

function limpiarNombreArchivo(nombre) {
  return nombre.replace(/[\\/:*?"<>|]/g, '_').trim() || 'clase';
}

function selloLegible(segundos) {
  return `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, '0')}`;
}

async function exportarTranscript({ id, formato = 'txt' } = {}) {
  if (!id) return { ok: false, error: 'Falta el id de la sesión.' };

  const meta = leerMeta(id);
  if (!meta) return { ok: false, error: `No existe la sesión ${id}.` };

  const lineas = leerLineasCompletas(path.join(dirSesion(id), TRANSCRIPT));

  if (lineas.length === 0) {
    return { ok: false, error: `La sesión ${id} no tiene transcripción.` };
  }

  const titulo = meta.titulo || meta.materia?.nombre || meta.materia?.clave || id;
  const esMarkdown = formato === 'md';

  const cuerpo = esMarkdown
    ? [`# ${titulo}`, '', ...lineas.map((linea) => `**${selloLegible(linea.inicio)}** — ${linea.texto}`)].join('\n\n')
    : lineas.map((linea) => `[${selloLegible(linea.inicio)}] ${linea.texto}`).join('\n');

  const extension = esMarkdown ? 'md' : 'txt';

  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('documents'), `${limpiarNombreArchivo(titulo)}.${extension}`),
    filters: [{ name: esMarkdown ? 'Markdown' : 'Texto', extensions: [extension] }],
  });

  if (canceled || !filePath) {
    return { ok: false, cancelado: true, error: 'Exportación cancelada.' };
  }

  fs.writeFileSync(filePath, cuerpo, 'utf8');
  return { ok: true, path: filePath };
}

function registerClaseHandlers() {
  ipcMain.handle('clase:estado', async () => estado());
  ipcMain.handle('clase:diagnostico', async () => diagnostico());
  ipcMain.handle('clase:iniciar', async (_event, opciones) => iniciar(opciones || {}));
  ipcMain.handle('clase:detener', async () => detener());
  ipcMain.handle('clase:sesiones', async () => ({ ok: true, sesiones: listarSesiones() }));
  ipcMain.handle('clase:transcript', async (_event, { id, desdeMinuto, hastaMinuto, desdeByte } = {}) =>
    leerTranscript(id, { desdeMinuto, hastaMinuto, desdeByte }));
  ipcMain.handle('clase:retranscribir', async (_event, opciones) => retranscribir(opciones || {}));
  ipcMain.handle('clase:set-python', async (_event, ruta) => guardarPython(ruta));
  ipcMain.handle('clase:actualizar-meta', async (_event, opciones) => actualizarMeta(opciones || {}));
  ipcMain.handle('clase:fusionar', async (_event, opciones) => fusionar(opciones || {}));
  ipcMain.handle('clase:eliminar', async (_event, opciones) => eliminar(opciones || {}));
  ipcMain.handle('clase:capturas', async (_event, { id } = {}) => listarCapturas(id));
  ipcMain.handle('clase:exportar', async (_event, opciones) => exportarTranscript(opciones || {}));

  registerClaseImageProtocol();
}

// Se llama desde `will-quit`: un daemon huérfano sigue grabando con la app
// cerrada y el usuario no tiene forma de pararlo desde la UI.
function detenerAlSalir() {
  if (!activo) return;

  try {
    activo.proceso.stdin.write('parar\n');
  } catch (_error) {
    activo.proceso.kill();
  }

  limpiarActivo();
}

module.exports = {
  actualizarMeta,
  claseActual,
  detener,
  retranscribir,
  detenerAlSalir,
  diagnostico,
  eliminar,
  estado,
  exportarTranscript,
  fusionar,
  iniciar,
  leerTranscript,
  listarCapturas,
  listarSesiones,
  registerClaseHandlers,
  registerClaseImageScheme,
};
