#!/usr/bin/env node
// Servidor MCP de DVPotro — SOLO LECTURA.
//
// Expone a un cliente MCP (Claude Code) lo que la app ya scrapeó: actividades
// con su consigna y rúbrica, horario, material por materia, asistencia, notas,
// calendario y notificaciones.
//
// POR QUÉ LEE ARCHIVOS Y NO HABLA CON LA APP
// Todo el estado de DVPotro ya vive como JSON plano en `userData`. Un puente
// IPC o un servidor HTTP no agregarían un solo dato y sí agregarían un puerto
// abierto con el nombre, la matrícula y las calificaciones del alumno detrás.
// Por stdio no hay puerto, no hay auth que administrar y no hace falta que la
// app esté corriendo.
//
// POR QUÉ EXISTE, SI EL CLIENTE PODRÍA LEER LOS JSON SOLO
// Porque `actividades-cache.json` son ~300 KB (unos 75.000 tokens). Volcarlo
// entero quema la ventana de contexto. El valor de este servidor es FILTRAR:
// las listas devuelven resúmenes y el detalle se pide de a uno.
//
// SIN DEPENDENCIAS a propósito: el transporte stdio de MCP es JSON-RPC 2.0
// delimitado por saltos de línea. Meter el SDK oficial (ESM) en un proyecto
// CommonJS costaba más que estas líneas.
//
// Uso:  node mcp/dvpotro-mcp.js
// Registro en Claude Code:
//   claude mcp add dvpotro -- node "<ruta absoluta>/mcp/dvpotro-mcp.js"
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Blindaje de stdout — va PRIMERO, antes de que se cargue nada más
// ---------------------------------------------------------------------------
//
// stdout es el canal del protocolo MCP: un solo byte ajeno corrompe la sesión y
// el cliente se desconecta sin decir por qué. Este servidor carga código que no
// controla (los handlers de la app loguean con console.log, dotenv imprime un
// banner), así que no alcanza con tener cuidado: se secuestra stdout.
//
// Se guarda el write REAL para el protocolo y se reemplaza el público por uno
// que manda todo a stderr. A partir de acá, escriba quien escriba, lo único que
// llega a stdout es lo que pase por `enviar()`.
const escribirProtocolo = process.stdout.write.bind(process.stdout);

process.stdout.write = (chunk, encoding, callback) => process.stderr.write(chunk, encoding, callback);

['log', 'info', 'warn', 'debug', 'trace'].forEach((nivel) => {
  console[nivel] = (...args) => console.error(...args);
});

// ---------------------------------------------------------------------------
// Acceso a los datos
// ---------------------------------------------------------------------------

// Mismo directorio que `app.getPath('userData')` de Electron. Se puede pisar
// con DVPOTRO_USER_DATA para apuntar a una copia sin tocar la instalación real.
function getUserDataDir() {
  if (process.env.DVPOTRO_USER_DATA) {
    return process.env.DVPOTRO_USER_DATA;
  }

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'dvpotro');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'dvpotro');
  }

  return path.join(os.homedir(), '.config', 'dvpotro');
}

const USER_DATA = getUserDataDir();

// Versiones de esquema que este servidor sabe leer. Si la app avanza y el
// servidor no, hay que AVISARLO: devolver datos viejos como si fueran actuales
// es peor que no devolver nada.
const SCHEMA = {
  'actividades-cache.json': { campo: 'schemaVersion', esperada: 6 },
  'material.json': { campo: 'version', esperada: 3 },
  'horario-cache.json': { campo: 'schemaVersion', esperada: 2 },
  'attendance.json': { campo: 'version', esperada: 1 },
  'notifications.json': { campo: 'version', esperada: 1 },
  'prompt-cache.json': { campo: 'version', esperada: 1 },
};

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// `writeJson` de la app no es atómico (escribe en el destino, no en un .tmp que
// después renombra). Si la app sincroniza justo mientras leemos, agarramos un
// JSON cortado a la mitad. Reintentar un par de veces cubre esa ventana.
function readJson(file) {
  const full = path.join(USER_DATA, file);

  for (let intento = 0; intento < 3; intento += 1) {
    let raw;

    try {
      raw = fs.readFileSync(full, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { falta: true, file };
      }

      return { error: `No se pudo leer ${file}: ${error.message}` };
    }

    try {
      return { data: JSON.parse(raw) };
    } catch (_parseError) {
      if (intento < 2) sleepSync(150);
    }
  }

  return { error: `${file} está a medio escribir (la app debe estar sincronizando). Reintentá en unos segundos.` };
}

// Frescura de una colección que no lleva sello propio: la del elemento más
// nuevo.
function maxFecha(items, campo) {
  const fechas = (Array.isArray(items) ? items : [])
    .map((x) => new Date(x?.[campo]).getTime())
    .filter(Number.isFinite);

  return fechas.length ? Math.max(...fechas) : null;
}

function edad(timestamp) {
  const ms = Date.now() - new Date(timestamp).getTime();

  if (!Number.isFinite(ms)) return 'sin fecha';
  if (ms < 60_000) return 'recién';

  const min = Math.round(ms / 60_000);
  if (min < 60) return `hace ${min} min`;

  const horas = Math.round(min / 60);
  if (horas < 48) return `hace ${horas} h`;

  return `hace ${Math.round(horas / 24)} días`;
}

// Encabezado con la frescura y el estado del esquema. Va en TODA respuesta: sin
// esto el cliente no puede distinguir un dato de hoy de uno de la semana pasada.
function cabecera(file, data) {
  const partes = [`caché ${file}`];

  if (data?.timestamp) partes.push(edad(data.timestamp));

  const spec = SCHEMA[file];

  if (spec) {
    const actual = data?.[spec.campo];

    if (actual !== spec.esperada) {
      partes.push(
        `AVISO: esquema v${actual ?? '?'} y este servidor espera v${spec.esperada} — puede faltar información`,
      );
    }
  }

  return `[${partes.join(' · ')}]`;
}

// Carga con el manejo de faltantes ya resuelto: devuelve o los datos o un texto
// que explica qué hacer.
function cargar(file, queHacer) {
  const res = readJson(file);

  if (res.falta) {
    return { fallo: `No hay caché de ${file}. ${queHacer}` };
  }

  if (res.error) {
    return { fallo: res.error };
  }

  return { data: res.data, cabecera: cabecera(file, res.data) };
}

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------

// El rango va escapado y no con las marcas combinantes literales: son
// caracteres invisibles y cualquier editor que normalice el archivo las come
// sin avisar, dejando un `[-]` que no saca ningún acento.
const norm = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const incluye = (haystack, needle) => norm(haystack).includes(norm(needle));

// Recorta preservando palabras: cortar a la mitad de una palabra hace que el
// texto parezca corrupto en vez de recortado.
function extracto(texto, max) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();

  if (limpio.length <= max) return limpio;

  // `lastIndexOf` devuelve -1 cuando no hay ningún espacio antes del corte —
  // una consigna que arranca con una URL de Drive de 300 caracteres, por
  // ejemplo. `slice(0, -1)` entonces devolvía el texto ENTERO menos el último
  // carácter: el recorte no recortaba entrando justo en el caso que este
  // servidor existe para evitar.
  const espacio = limpio.lastIndexOf(' ', max);

  return `${limpio.slice(0, espacio > 0 ? espacio : max)}…`;
}

function lista(items) {
  return items.length ? items.join('\n') : '(nada)';
}

// El portal escribe "-" o "—" en las celdas vacías de la tabla de estado. Sin
// esto, una actividad PENDIENTE mostraba la línea "ENTREGADA: -", que es
// justamente lo contrario de la verdad.
function vacio(value) {
  const limpio = String(value ?? '').trim();
  return !limpio || limpio === '-' || limpio === '—';
}

const oNada = (value) => (vacio(value) ? null : String(value).trim());

// El alumno puede ocultar actividades en la app (las que no le corresponden, o
// ruido del profe). Listarlas igual es contradecir una decisión suya explícita.
function idsOcultos() {
  const res = readJson('hidden-activities.json');
  return new Set(res.data?.ids || []);
}

// `equipo` viene corrupto en varias actividades: el scraper a veces se trae un
// fragmento de la consigna en vez del nombre del equipo ("s arriba, 4 abajo, y
// un servidor..."). Un nombre de equipo real es corto y sin puntuación de prosa.
function equipoLegible(valor) {
  const limpio = oNada(valor);
  if (!limpio || limpio.length > 40 || /[.,;:]/.test(limpio)) return null;
  return limpio;
}

// Los PDFs de Drive que la app ya resolvió. Que el archivo falte es NORMAL: la
// app pudo no haber corrido nunca la cola, o el alumno no tener una sola consigna
// en Drive. Por eso no está en SCHEMA — una entrada ahí haría que un archivo
// legítimamente ausente se reporte como esquema roto en cada consulta.
function indiceDrive() {
  const res = readJson('drive-files.json');
  return res.falta || res.error ? { archivos: {} } : res.data || { archivos: {} };
}

// Se reusa el normalizador del handler en vez de repetir el regex: si Google
// cambia las formas de URL, tiene que romperse en un solo lugar. Es una función
// pura — drive.js sólo pide electron adentro de las que salen a la red.
function normalizarDrive(url) {
  try {
    const drive = require(path.join(REPO, 'electron', 'handlers', 'drive.js'));
    const resultado = drive.normalizeDriveLink(url);
    return resultado.kind === 'no_es_archivo' ? null : resultado;
  } catch (_error) {
    return null;
  }
}

const MOTIVO_DRIVE = {
  requiere_sesion: 'requiere tu sesión de Google — abrilo en el navegador',
  no_existe: 'el profesor lo borró de Drive',
  tipo_rechazado: 'lo que devolvió Drive no es un documento',
  muy_grande: 'pesa más de lo que la app baja',
  error_red: 'no se pudo bajar; se reintenta en la próxima sync',
  pendiente: 'todavía no se bajó',
};

// Une los enlaces de Drive de una actividad con lo que la cola ya resolvió. El
// id se vuelve a derivar de la URL: la actividad no guarda ningún campo nuevo, y
// así el MCP sigue leyendo una caché de actividades que no cambió de versión.
function archivosDrive(a, indice = null) {
  const datos = indice || indiceDrive();

  return (a.enlaces || [])
    .filter((l) => l.tipo === 'google')
    .map((l) => {
      const normalizado = normalizarDrive(l.url);
      if (!normalizado) return null;

      const entrada = datos.archivos?.[normalizado.fileId];
      if (!entrada) return { estado: 'pendiente', url: l.url, etiqueta: l.texto || '', fileId: normalizado.fileId };

      return { ...entrada, url: l.url, etiqueta: l.texto || entrada.etiqueta || '' };
    })
    .filter(Boolean);
}

function textoDrive(entrada) {
  if (!entrada?.textoRuta) return null;

  try {
    return fs.readFileSync(entrada.textoRuta, 'utf8');
  } catch (_error) {
    return null;
  }
}

// Buscar solo en `nombre` e `instrucciones` dejaba afuera la RÚBRICA, que es
// donde el profesor escribe los entregables concretos ("bolsa_ID", "clase
// Cilindro", "PruebaGeometria"). Con la consigna de Moodle reducida a un enlace
// de Drive — que es lo normal acá —, buscar "bolsa" no encontraba la tarea que
// es enteramente sobre bolsas.
// El texto del PDF de Drive entra acá por el mismo motivo que la rúbrica: cuando
// la consigna de Moodle es sólo un enlace, TODO lo buscable vive adentro de ese
// PDF. Ahora que la app lo baja, buscar "BolsaException" tiene que encontrar la
// tarea que es enteramente sobre eso.
function textoBuscable(a, indice = null) {
  const deDrive = archivosDrive(a, indice)
    .map((d) => [d.nombre, textoDrive(d)].filter(Boolean).join(' '))
    .filter(Boolean);

  return [
    ...deDrive,
    a.nombre,
    a.instrucciones,
    a.instruccionesMarkdown,
    a.rubrica?.titulo,
    a.rubrica?.markdown,
    ...(a.tablas || []).map((t) => `${t.titulo || ''} ${t.markdown || ''}`),
    ...(a.enlaces || []).map((l) => l.texto),
    ...(a.archivos || []).map((f) => f.name),
  ].join(' ');
}

// Mismo criterio para el material: un recurso `pagina` es una lista de enlaces
// y el título del apunte casi nunca dice qué contiene.
function recursoBuscable(r) {
  return [
    r.nombre,
    r.descripcion,
    ...(r.archivos || []).map((f) => f.nombre),
    ...(r.links || []).map((l) => l.texto),
  ].join(' ');
}

// Resolución compartida por las tools que trabajan sobre UNA actividad. Devuelve
// `{ fallo }` con el texto ya listo para responder, o `{ a, cabecera }`.
function unaActividad({ id, nombre }) {
  const res = cargar('actividades-cache.json', 'Sincronizá Actividades en DVPotro.');
  if (res.fallo) return { fallo: res.fallo };

  const items = res.data.actividades || [];
  const encontradas = id
    ? items.filter((a) => String(a.id) === String(id))
    : items.filter((a) => incluye(a.nombre, nombre || ''));

  if (!nombre && !id) return { fallo: 'Pasá `id` o `nombre`.' };
  if (!encontradas.length) return { fallo: 'Sin coincidencias. Usá dvpotro_actividades para ver los ids disponibles.' };

  if (encontradas.length > 1) {
    return {
      fallo: `Coinciden ${encontradas.length}. Especificá el id:\n${encontradas.map((a) => `  [${a.id}] ${a.nombre} (${a.materia})`).join('\n')}`,
    };
  }

  return { a: encontradas[0], cabecera: res.cabecera };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const TOOLS = [];

function tool(name, description, inputSchema, handler) {
  TOOLS.push({ name, description, inputSchema, handler });
}

const SIN_ARGS = { type: 'object', properties: {} };

tool(
  'dvpotro_estado',
  'Qué datos tiene DVPotro cacheados y qué tan frescos están. Conviene llamarlo primero: dice qué módulos tienen información y cuáles hay que sincronizar en la app antes de poder consultarlos.',
  SIN_ARGS,
  () => {
    const archivos = [
      ['actividades-cache.json', 'actividades', (d) => `${d.actividades?.length || 0} actividades`],
      ['material.json', 'material', (d) => `${d.materias?.length || 0} materias, ${(d.materias || []).reduce((s, m) => s + (m.totalRecursos || 0), 0)} recursos`],
      ['horario-cache.json', 'horario', (d) => `${d.materias?.length || 0} materias`],
      ['attendance.json', 'asistencia', (d) => `${d.materias?.length || 0} materias`],
      ['calendario-cache.json', 'calendario', (d) => `${d.events?.length || 0} eventos`],
      // Notas y notificaciones no llevan `timestamp` de archivo: la frescura se
      // deduce del elemento más nuevo. Sin esto las dos filas decían "sin
      // fecha", que en una tabla cuyo único trabajo es responder qué tan viejo
      // está cada módulo no informa nada.
      ['notes.json', 'notas', (d) => `${Array.isArray(d) ? d.length : 0} notas`, (d) => maxFecha(d, 'updatedAt')],
      ['notifications.json', 'notificaciones', (d) => `${d.items?.length || 0} items`, (d) => maxFecha(d?.items, 'timestamp')],
      ['cia-cache.json', 'calificaciones', (d) => `${d.materias?.length || 0} materias`],
      [path.join('profile-cache', 'profile.json'), 'perfil', (d) => d.fullName || 'sin nombre'],
      ['prompt-cache.json', 'prompts', (d) => `${Object.keys(d.prompts || {}).length} guardados`, (d) => maxFecha(Object.values(d?.prompts || {}), 'generadoEn')],
    ];

    const filas = archivos.map(([file, etiqueta, resumen, sellar]) => {
      const res = readJson(file);

      if (res.falta) return `  ${etiqueta.padEnd(16)} sin caché — sincronizá ese módulo en DVPotro`;
      if (res.error) return `  ${etiqueta.padEnd(16)} ERROR: ${res.error}`;

      const spec = SCHEMA[file];
      const aviso =
        spec && res.data?.[spec.campo] !== spec.esperada
          ? `  ⚠ esquema v${res.data?.[spec.campo] ?? '?'} (se espera v${spec.esperada})`
          : '';

      // El perfil sella `cachedAt` en vez de `timestamp`; sin esto la única
      // fila que nunca envejecía era justo la que se copia a las portadas.
      const sello = res.data?.timestamp || res.data?.cachedAt || sellar?.(res.data);

      return `  ${etiqueta.padEnd(16)} ${resumen(res.data)} · ${sello ? edad(sello) : 'sin fecha'}${aviso}`;
    });

    // Fuera de la lista de arriba a propósito: si falta, la fila de arriba diría
    // "sincronizá ese módulo", y no hay ningún módulo de Drive que sincronizar —
    // la cola corre sola después del scrape de Actividades.
    const drive = readJson('drive-files.json');

    if (!drive.falta && !drive.error) {
      const entradas = Object.values(drive.data?.archivos || {});
      const cuenta = (estado) => entradas.filter((e) => e.estado === estado).length;
      const ok = cuenta('ok');
      const sesion = cuenta('requiere_sesion');
      const sello = drive.data?.actualizado;

      filas.push(
        `  ${'drive'.padEnd(16)} ${ok} resueltos, ${sesion} piden sesión, ${entradas.length - ok - sesion} sin resolver · ${sello ? edad(sello) : 'sin fecha'}`,
      );
    }

    // `activity-analysis` es una carpeta con un JSON por actividad analizada, no
    // un archivo: sin esta fila no había forma de saber para qué actividades
    // `dvpotro_requisitos` va a devolver algo.
    let analisis;

    try {
      analisis = fs.readdirSync(path.join(USER_DATA, 'activity-analysis')).filter((f) => f.endsWith('.json'));
    } catch (_error) {
      analisis = null;
    }

    filas.push(
      analisis?.length
        ? `  ${'análisis'.padEnd(16)} ${analisis.length} actividades analizadas (dvpotro_requisitos)`
        : `  ${'análisis'.padEnd(16)} ninguna actividad analizada todavía`,
    );

    return `Datos de DVPotro en ${USER_DATA}\n\n${filas.join('\n')}`;
  },
);

tool(
  'dvpotro_materias',
  'Las materias del ciclo con su clave, periodo, profesor y contadores: cuánto material hay, cuántas actividades por estado y el resumen de asistencia. Vista de conjunto del semestre.',
  SIN_ARGS,
  () => {
    const mat = cargar('material.json', 'Sincronizá Material en DVPotro.');
    const act = readJson('actividades-cache.json');
    const asis = readJson('attendance.json');
    const hor = readJson('horario-cache.json');

    if (mat.fallo) return mat.fallo;

    // Se descuentan las ocultas igual que en `dvpotro_actividades`: si no, este
    // resumen decía "1 pendiente, 2 retrasadas" y la lista mostraba una sola
    // tarea. Dos tools del mismo servidor contestando distinto es peor que
    // cualquiera de las dos respuestas.
    const ocultos = idsOcultos();
    const actividades = (act.data?.actividades || []).filter((a) => !ocultos.has(String(a.id)));
    const bloques = mat.data.materias.map((materia) => {
      const suyas = actividades.filter((a) => norm(a.materia) === norm(materia.nombre));
      const porEstado = suyas.reduce((acc, a) => ({ ...acc, [a.estado]: (acc[a.estado] || 0) + 1 }), {});
      const asistencia = (asis.data?.materias || []).find((m) => norm(m.materia) === norm(materia.nombre));
      const profesor = suyas.find((a) => a.profesor)?.profesor
        || (hor.data?.materias || []).find((m) => norm(m.nombre) === norm(materia.nombre))?.instructor
        || '—';

      const conteo = ['pendiente', 'retrasada', 'cerrada', 'entregada']
        .filter((estado) => porEstado[estado])
        .map((estado) => `${porEstado[estado]} ${estado}${porEstado[estado] > 1 && estado !== 'pendiente' ? 's' : ''}`)
        .join(', ') || 'sin actividades';

      return [
        `${materia.codigo || '—'}  ${materia.nombre}`,
        `   profesor: ${profesor}`,
        `   periodo:  ${materia.periodo || '—'}`,
        `   material: ${materia.totalRecursos || 0} recursos en ${(materia.secciones || []).length} secciones`,
        `   tareas:   ${conteo}`,
        asistencia ? `   asistencia: ${asistencia.resumen?.porcentaje || '—'} (${asistencia.resumen?.puntos || '—'})` : null,
        (materia.enlacesVivos || []).length
          ? `   enlaces:  ${materia.enlacesVivos.map((e) => `${e.tipo} ${e.url}`).join(' | ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');
    });

    return `${mat.cabecera}\n\n${bloques.join('\n\n')}`;
  },
);

tool(
  'dvpotro_actividades',
  'Lista RESUMIDA de actividades, filtrable. No devuelve la consigna completa — para eso está dvpotro_actividad, que trae una sola. Estados: pendiente, retrasada, cerrada, entregada.',
  {
    type: 'object',
    properties: {
      estado: {
        type: 'string',
        enum: ['pendiente', 'retrasada', 'cerrada', 'entregada', 'todas'],
        description: 'Por defecto muestra las que requieren acción (pendiente y retrasada).',
      },
      materia: { type: 'string', description: 'Nombre o parte del nombre de la materia.' },
      buscar: { type: 'string', description: 'Texto en el nombre o en la consigna.' },
    },
  },
  ({ estado, materia, buscar }) => {
    const res = cargar('actividades-cache.json', 'Sincronizá Actividades en DVPotro.');
    if (res.fallo) return res.fallo;

    const ocultos = idsOcultos();
    let items = (res.data.actividades || []).filter((a) => !ocultos.has(String(a.id)));
    const nOcultas = (res.data.actividades || []).length - items.length;

    if (!estado || estado === 'todas') {
      if (!estado) items = items.filter((a) => a.estado === 'pendiente' || a.estado === 'retrasada');
    } else {
      items = items.filter((a) => a.estado === estado);
    }

    if (materia) items = items.filter((a) => incluye(a.materia, materia));
    if (buscar) {
      const drive = indiceDrive();
      items = items.filter((a) => incluye(textoBuscable(a, drive), buscar));
    }

    const filas = items.map((a) => {
      const marcas = [
        a.rubrica ? 'rúbrica' : null,
        (a.imagenes || []).length ? `${a.imagenes.length} img` : null,
        (a.archivos || []).length ? `${a.archivos.length} adj` : null,
        (a.tablas || []).length ? `${a.tablas.length} tabla${a.tablas.length > 1 ? 's' : ''}` : null,
        a.bloqueo ? `bloqueo:${a.bloqueo}` : null,
        a.modalidad === 'equipo' ? 'en equipo' : null,
      ].filter(Boolean);

      return [
        `[${a.id}] ${a.nombre}`,
        `   ${a.materia} · ${a.estado}` + (a.estado === 'entregada' ? ` el ${oNada(a.fechaEntrega) || '?'}` : ` · vence ${oNada(a.fechaLimite) || 'sin fecha'}`),
        marcas.length ? `   tiene: ${marcas.join(', ')}` : null,
        a.instrucciones ? `   ${extracto(a.instrucciones, 180)}` : '   (sin consigna publicada)',
      ]
        .filter(Boolean)
        .join('\n');
    });

    const nota = nOcultas ? ` (${nOcultas} ocultas por vos en la app, no se listan)` : '';

    return `${res.cabecera}\n${items.length} actividades${nota}\n\n${lista(filas)}\n\nPara la consigna completa de una: dvpotro_actividad con su id.`;
  },
);

tool(
  'dvpotro_actividad',
  'UNA actividad completa: consigna en markdown (con tablas e imágenes), rúbrica, adjuntos del profe, enlaces y datos de la entrega. Se pide de a una porque una sola rúbrica puede pasar los 7.000 caracteres.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id exacto que devuelve dvpotro_actividades.' },
      nombre: { type: 'string', description: 'Alternativa al id: parte del nombre de la actividad.' },
      incluir_rubrica: { type: 'boolean', description: 'Rúbrica completa. Por defecto true.' },
      incluir_documentos: { type: 'boolean', description: 'El TEXTO completo de los PDFs de Drive que la app ya bajó. Por defecto false: una consigna sola puede pasar los 7.000 caracteres.' },
    },
  },
  ({ id, nombre, incluir_rubrica = true, incluir_documentos = false }) => {
    const encontrada = unaActividad({ id, nombre });
    if (encontrada.fallo) return encontrada.fallo;

    const { a } = encontrada;
    const bloques = [
      `${encontrada.cabecera}`,
      '',
      `# ${a.nombre}`,
      `${a.materia}${a.profesor ? ` · ${a.profesor}` : ''}`,
      `estado: ${a.estado} · modalidad: ${a.modalidad}${equipoLegible(a.equipo) ? ` (equipo ${equipoLegible(a.equipo)})` : ''} · ventana: ${a.ventana}`,
      `fecha límite: ${a.fechaLimite}`,
      oNada(a.fechaPublicacion) ? `publicada: ${a.fechaPublicacion}` : null,
      oNada(a.fechaCierre) ? `cierre: ${a.fechaCierre}` : null,
      oNada(a.fechaEntrega) ? `ENTREGADA: ${a.fechaEntrega}` : null,
      (a.entregaArchivos || []).length
        ? `archivos entregados: ${a.entregaArchivos.map((f) => f.name).join(', ')}`
        : null,
      a.bloqueo ? `bloqueo: ${a.bloqueo}` : null,
      a.url ? `url: ${a.url}` : null,
      '',
      '## Consigna',
      a.instruccionesMarkdown || a.instrucciones || '(el profesor no publicó consigna en iVirtual)',
    ];

    if ((a.imagenes || []).length) {
      bloques.push(
        '',
        '## Imágenes de la consigna',
        // Se da la URL y no el archivo: las de pluginfile necesitan la cookie de
        // sesión del alumno, que esta tool de lectura no tiene.
        ...a.imagenes.map((img) => `- ${img.alt || img.titulo || 'sin descripción'} → ${img.url}${img.requiereSesion ? ' (requiere sesión de iVirtual)' : ''}`),
        '(para verlas: dvpotro_adjuntos con este id, que las baja a disco)',
      );
    }

    if ((a.archivos || []).length) {
      bloques.push(
        '',
        '## Adjuntos del profesor',
        ...a.archivos.map((f) => `- ${f.name} → ${f.url}`),
        // Esa URL no se abre sin la cookie de sesión: cuando el profe no
        // escribió consigna, la tarea entera vive adentro de ese archivo.
        '(para leerlos: dvpotro_adjuntos con este id, que los baja y extrae el texto)',
      );
    }

    // La app resuelve los Drive de la consigna a un archivo local. Cuando lo
    // logró, lo que sirve es la RUTA —que se puede abrir y leer— y no la URL, así
    // que ese enlace sale de la lista de abajo para no ofrecer dos veces lo mismo.
    const drive = archivosDrive(a);
    const resueltos = drive.filter((d) => d.estado === 'ok');

    if (drive.length) {
      bloques.push('', '## Archivos enlazados');

      for (const d of drive) {
        if (d.estado !== 'ok') {
          bloques.push(`- ${d.etiqueta || 'enlace de Drive'} → ${d.url}`, `  ${MOTIVO_DRIVE[d.estado] || d.estado}`);
          continue;
        }

        bloques.push(`- ${d.nombre}${d.palabras ? ` — ${d.palabras} palabras` : ''}`, `  ${d.ruta}`);

        if (!incluir_documentos) continue;

        const texto = textoDrive(d);
        if (texto) bloques.push('', '```', texto, '```');
      }

      if (resueltos.length && !incluir_documentos) {
        bloques.push(
          `(el texto de ${resueltos.length === 1 ? 'ese documento' : `esos ${resueltos.length} documentos`} se pide con incluir_documentos:true; también se puede abrir el archivo de la ruta)`,
        );
      }
    }

    const urlsResueltas = new Set(resueltos.map((d) => d.url));
    const enlacesSueltos = (a.enlaces || []).filter((l) => !urlsResueltas.has(l.url));

    if (enlacesSueltos.length) {
      bloques.push('', '## Enlaces', ...enlacesSueltos.map((l) => `- [${l.tipo}] ${l.texto} → ${l.url}`));
    }

    if ((a.tablas || []).length) {
      bloques.push('', '## Tablas de la consigna', ...a.tablas.map((t) => `${t.titulo ? `**${t.titulo}**\n` : ''}${t.markdown}`));
    }

    if (a.rubrica) {
      bloques.push(
        '',
        `## ${a.rubrica.titulo || 'Rúbrica'}`,
        incluir_rubrica
          ? a.rubrica.markdown
          : `(${a.rubrica.filas.length} criterios — pedila con incluir_rubrica:true)`,
      );
    }

    return bloques.filter((b) => b !== null).join('\n');
  },
);

tool(
  'dvpotro_horario',
  'El horario semanal: materias, días, horas, aula o modalidad y el enlace de videollamada de las clases en línea.',
  {
    type: 'object',
    properties: {
      dia: {
        type: 'string',
        description: 'Filtra por día (lunes, martes…). "hoy" usa el día actual.',
      },
    },
  },
  ({ dia }) => {
    const res = cargar('horario-cache.json', 'Sincronizá Horario en DVPotro.');
    if (res.fallo) return res.fallo;

    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const objetivo = dia ? (norm(dia) === 'hoy' ? DIAS[new Date().getDay()] : dia) : null;

    const bloques = (res.data.materias || [])
      .map((m) => {
        const sesiones = (m.sesiones?.length ? m.sesiones : [m]).filter(
          (s) => !objetivo || (s.dias || []).some((d) => incluye(d, objetivo)),
        );

        if (!sesiones.length) return null;

        const lineas = sesiones.map((s) => {
          const donde = s.modalidad === 'en_linea' ? (m.meetLink || m.linkManual || 'en línea, sin enlace') : (s.ubicacion || 'sin aula');
          return `   ${(s.dias || []).join(', ')}  ${s.horaInicio}–${s.horaFin}  ${donde}`;
        });

        return [`${m.codigo || '—'}  ${m.nombre}${m.instructor ? ` · ${m.instructor}` : ''}`, ...lineas].join('\n');
      })
      .filter(Boolean);

    return `${res.cabecera}${objetivo ? `\nFiltrado por: ${objetivo}` : ''}\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_material',
  'Material publicado por los profesores: presentaciones, apuntes, carpetas, enlaces de Drive y foros, agrupado por materia y sección.',
  {
    type: 'object',
    properties: {
      materia: { type: 'string', description: 'Nombre o parte del nombre. Sin esto devuelve solo el conteo por materia.' },
      buscar: { type: 'string', description: 'Texto en el nombre o la descripción del recurso, en todas las materias.' },
    },
  },
  ({ materia, buscar }) => {
    const res = cargar('material.json', 'Sincronizá Material en DVPotro.');
    if (res.fallo) return res.fallo;

    let materias = res.data.materias || [];

    if (materia) materias = materias.filter((m) => incluye(m.nombre, materia) || incluye(m.codigo, materia));

    // Sin materia ni búsqueda solo se listan los conteos: volcar el material de
    // las cinco materias son decenas de miles de tokens y casi nunca se quieren
    // todas a la vez.
    if (!materia && !buscar) {
      const filas = materias.map((m) => `  ${(m.codigo || '—').padEnd(12)} ${m.nombre.padEnd(32)} ${m.totalRecursos} recursos`);
      return `${res.cabecera}\n\n${filas.join('\n')}\n\nPedí una con \`materia\`, o buscá en todas con \`buscar\`.`;
    }

    const bloques = materias
      .map((m) => {
        const secciones = m.secciones
          .map((s) => {
            const recursos = (s.recursos || []).filter(
              (r) => !buscar || incluye(recursoBuscable(r), buscar),
            );

            if (!recursos.length) return null;

            const filas = recursos.map((r) => {
              const destino = r.destino || r.urlModulo || '';
              const archivos = (r.archivos || []).map((f) => f.nombre).join(', ');
              const partes = [`   - [${r.tipo}] ${r.nombre}${archivos ? ` → ${archivos}` : ''}`];

              if (oNada(r.descripcion)) partes.push(`     ${extracto(r.descripcion, 200)}`);
              if (destino) partes.push(`     ${destino}`);

              // Un recurso `pagina` es en realidad una LISTA de enlaces. Sin
              // esto se ve el título del apunte y se pierden los diez temas de
              // Drive que contiene, que son el material de verdad.
              (r.links || []).forEach((l) => partes.push(`     · ${l.texto} → ${l.url}`));

              return partes.join('\n');
            });

            return `  ${s.titulo}\n${filas.join('\n')}`;
          })
          .filter(Boolean);

        if (!secciones.length) return null;

        return `${m.codigo || '—'}  ${m.nombre}\n${secciones.join('\n')}`;
      })
      .filter(Boolean);

    return `${res.cabecera}\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_asistencia',
  'Asistencia por materia: porcentaje, puntos y el detalle de cada sesión tomada o faltada.',
  { type: 'object', properties: { materia: { type: 'string' } } },
  ({ materia }) => {
    const res = cargar('attendance.json', 'Sincronizá Asistencia desde Horario en DVPotro.');
    if (res.fallo) return res.fallo;

    const bloques = (res.data.materias || [])
      .filter((m) => !materia || incluye(m.materia, materia))
      .map((m) => {
        const sesiones = (m.sesiones || []).map(
          (s) => `   ${s.fecha}  ${s.estado || '—'}${s.puntos ? ` (${s.puntos})` : ''}${s.observaciones ? ` · ${s.observaciones}` : ''}`,
        );

        return [
          `${m.materia}`,
          `   ${m.resumen?.porcentaje || '—'} · ${m.resumen?.tomadas || '?'} tomadas · ${m.resumen?.puntos || '—'}`,
          m.permiteAutoRegistro && (m.sesiones || []).some((s) => s.pendiente)
            ? '   HAY UNA SESIÓN PENDIENTE de registrar — marcala vos en la app, DVPotro nunca la marca solo'
            : null,
          ...sesiones,
        ]
          .filter(Boolean)
          .join('\n');
      });

    return `${res.cabecera}\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_calificaciones',
  'La boleta de CIA: parciales, final, promedio y estado por materia (aprobada, en riesgo, reprobada, sin calificación). Las materias con laboratorio traen además el desglose por componente.',
  {
    type: 'object',
    properties: {
      materia: { type: 'string', description: 'Nombre, clave o parte del nombre. Sin esto devuelve todas.' },
      solo_en_riesgo: { type: 'boolean', description: 'Solo las reprobadas o en riesgo.' },
    },
  },
  ({ materia, solo_en_riesgo = false }) => {
    const res = cargar('cia-cache.json', 'Sincronizá Calificaciones en DVPotro, o pedí dvpotro_sync con modulo:"calificaciones".');
    if (res.fallo) return res.fallo;

    // La boleta guarda `null` mientras el parcial no se capturó. Mostrar "0"
    // ahí sería inventar un reprobado que el profesor todavía no puso.
    const nota = (c) => (Number.isFinite(c?.calificacion) ? `${c.calificacion}/${c.sobre ?? 10}` : '—');
    const enRiesgo = (m) => m.estado === 'reprobada' || m.estado === 'en_riesgo';

    const materias = (res.data.materias || [])
      .filter((m) => !materia || incluye(m.nombre, materia) || incluye(m.codigo || m.clave, materia))
      .filter((m) => !solo_en_riesgo || enRiesgo(m));

    const bloques = materias.map((m) => {
      const parciales = (m.calificaciones || []).map((c) => `${c.etiqueta || c.nombre} ${nota(c)}`).join('  ');

      const componentes = (m.componentes || []).map(
        (c) => `   ${c.tipo}: ${(c.calificaciones || []).map((x) => `${x.etiqueta || x.nombre} ${nota(x)}`).join('  ')}`
          + `${Number.isFinite(c.promedio) ? `  → ${c.promedio}` : ''}`,
      );

      return [
        `${m.codigo || m.clave || '—'}  ${m.nombre}${m.profesor ? ` · ${m.profesor}` : ''}`,
        `   ${parciales || 'sin capturar'}`,
        `   promedio: ${Number.isFinite(m.promedio) ? m.promedio : '—'} · ${m.estado}`,
        ...componentes,
      ].join('\n');
    });

    const riesgo = (res.data.materias || []).filter(enRiesgo);
    const aviso = !materia && !solo_en_riesgo && riesgo.length
      ? `\n\nATENCIÓN: ${riesgo.length} materia(s) por debajo de 7 — ${riesgo.map((m) => m.nombre).join(', ')}`
      : '';

    return `${res.cabecera}\n\n${lista(bloques)}${aviso}`;
  },
);

tool(
  'dvpotro_notas',
  'Las notas personales del alumno dentro de DVPotro (tipo Keep): texto y checklists, con etiquetas, color y estado.',
  {
    type: 'object',
    properties: {
      buscar: { type: 'string' },
      etiqueta: { type: 'string' },
      incluir_archivadas: { type: 'boolean' },
    },
  },
  ({ buscar, etiqueta, incluir_archivadas = false }) => {
    const res = cargar('notes.json', 'Creá alguna nota en DVPotro.');
    if (res.fallo) return res.fallo;

    const notas = (Array.isArray(res.data) ? res.data : [])
      .filter((n) => !n.trashed)
      .filter((n) => incluir_archivadas || !n.archived)
      .filter((n) => !etiqueta || (n.labels || []).some((l) => incluye(l, etiqueta)))
      .filter((n) => !buscar || incluye(n.title, buscar) || incluye(n.body, buscar) || (n.items || []).some((i) => incluye(i.text, buscar)));

    const bloques = notas.map((n) => {
      const cuerpo = n.type === 'checklist'
        ? (n.items || []).map((i) => `   [${i.done ? 'x' : ' '}] ${i.text}`).join('\n')
        : `   ${extracto(String(n.body || '').replace(/<[^>]+>/g, ' '), 400)}`;

      const meta = [n.status, n.color !== 'neutral' ? n.color : null, ...(n.labels || [])].filter(Boolean).join(' · ');

      // El id va adelante porque sin él la nota no es direccionable: no se
      // podía pedirla entera con dvpotro_nota ni agregarle nada.
      return `[${n.id}] ${n.pinned ? '📌 ' : ''}${n.title || '(sin título)'}${n.archived ? ' [archivada]' : ''}\n   ${meta}\n${cuerpo}`;
    });

    const ultima = maxFecha(res.data, 'updatedAt');

    return `[notes.json · ${notas.length} notas${ultima ? ` · última edición ${edad(ultima)}` : ''}]\n\n${lista(bloques)}`;
  },
);

tool(
  'dvpotro_calendario',
  'Calendario escolar del ITSON: exámenes, entregas institucionales, periodos y días no laborables.',
  {
    type: 'object',
    properties: {
      dias: { type: 'number', description: 'Ventana hacia adelante en días. Por defecto 30.' },
      buscar: { type: 'string' },
    },
  },
  ({ dias = 30, buscar }) => {
    const res = cargar('calendario-cache.json', 'Sincronizá Calendario en DVPotro.');
    if (res.fallo) return res.fallo;

    const ahora = Date.now();
    const hasta = ahora + dias * 24 * 60 * 60 * 1000;

    const eventos = (res.data.events || [])
      .filter((e) => {
        const inicio = new Date(e.inicio).getTime();
        return Number.isFinite(inicio) && inicio >= ahora - 24 * 60 * 60 * 1000 && inicio <= hasta;
      })
      .filter((e) => !buscar || incluye(e.titulo, buscar) || incluye(e.descripcion, buscar))
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
      .map((e) => {
        const inicio = new Date(e.inicio);
        const fecha = inicio.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
        return `  ${fecha}  ${e.titulo}${e.categoria ? ` [${e.categoria}]` : ''}${e.ubicacion ? ` · ${e.ubicacion}` : ''}`;
      });

    return `${res.cabecera}\nPróximos ${dias} días\n\n${lista(eventos)}`;
  },
);

tool(
  'dvpotro_buscar',
  'Busca un texto a la vez en actividades, material, notas y calendario. Útil cuando no se sabe en qué módulo está lo que se busca.',
  {
    type: 'object',
    properties: { texto: { type: 'string', description: 'Qué buscar.' } },
    required: ['texto'],
  },
  ({ texto }) => {
    if (!texto) return 'Pasá `texto`.';

    const partes = [];

    const ocultos = idsOcultos();
    const act = readJson('actividades-cache.json');
    if (act.data) {
      const visibles = (act.data.actividades || []).filter((a) => !ocultos.has(String(a.id)));
      const driveIndice = indiceDrive();
      const hits = visibles.filter((a) => incluye(textoBuscable(a, driveIndice), texto));
      if (hits.length) {
        partes.push(`ACTIVIDADES (${hits.length})\n${hits.map((a) => `  [${a.id}] ${a.nombre} — ${a.materia} · ${a.estado}`).join('\n')}`);
      }
    }

    const mat = readJson('material.json');
    if (mat.data) {
      const hits = [];
      (mat.data.materias || []).forEach((m) =>
        (m.secciones || []).forEach((s) =>
          (s.recursos || []).forEach((r) => {
            if (incluye(recursoBuscable(r), texto)) {
              hits.push(`  [${r.tipo}] ${r.nombre} — ${m.nombre} / ${s.titulo}`);
            }
          }),
        ),
      );
      if (hits.length) partes.push(`MATERIAL (${hits.length})\n${hits.join('\n')}`);
    }

    const notas = readJson('notes.json');
    if (Array.isArray(notas.data)) {
      const hits = notas.data.filter(
        (n) => !n.trashed && (incluye(n.title, texto) || incluye(n.body, texto)),
      );
      if (hits.length) partes.push(`NOTAS (${hits.length})\n${hits.map((n) => `  ${n.title || '(sin título)'}`).join('\n')}`);
    }

    const cal = readJson('calendario-cache.json');
    if (cal.data) {
      const hits = (cal.data.events || []).filter((e) => incluye(e.titulo, texto));
      if (hits.length) {
        partes.push(`CALENDARIO (${hits.length})\n${hits.slice(0, 15).map((e) => `  ${new Date(e.inicio).toLocaleDateString('es-MX')} ${e.titulo}`).join('\n')}`);
      }
    }

    return partes.length ? partes.join('\n\n') : `Sin coincidencias para "${texto}".`;
  },
);

tool(
  'dvpotro_notificaciones',
  'Avisos que DVPotro generó: cambios detectados entre sincronizaciones, recordatorios y noticias del portal. Filtrá por `fuente` — sin filtro la bandeja está dominada por los errores de sync de "sistema", que no son novedades académicas.',
  {
    type: 'object',
    properties: {
      fuente: {
        type: 'string',
        description: 'actividades, horario, calendario, itson-news (convocatorias, becas, pagos), notas o sistema (errores de sync). Coincidencia parcial.',
      },
      categoria: {
        type: 'string',
        description: 'nueva, cambio, proximidad, error o info. Coincidencia parcial.',
      },
      solo_no_leidas: { type: 'boolean' },
      limite: { type: 'number', description: 'Por defecto 25.' },
    },
  },
  ({ fuente, categoria, solo_no_leidas = false, limite = 25 }) => {
    const res = cargar('notifications.json', 'Usá DVPotro un rato para que genere avisos.');
    if (res.fallo) return res.fallo;

    const todos = res.data.items || [];

    const filtrados = todos
      .filter((n) => !solo_no_leidas || !n.read)
      // Coincidencia parcial y no un enum cerrado: `source` lo decide quien
      // emite, y un enum desactualizado rechazaría un valor perfectamente
      // válido en vez de filtrarlo.
      .filter((n) => !fuente || incluye(n.source, fuente))
      .filter((n) => !categoria || incluye(n.category, categoria))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const items = filtrados
      .slice(0, limite)
      // El id adelante para que `dvpotro_marcar_leidas` tenga a qué apuntarle.
      .map((n) => `  [${n.id}] [${n.source}/${n.priority}] ${n.title}${n.body ? `\n     ${extracto(n.body, 160)}` : ''}`
        // El enlace solo donde ES el contenido: en una convocatoria del portal
        // y en el meet de una clase. En el resto solo alarga cada bloque.
        + (n.actionUrl && /itson-news|horario/.test(n.source) ? `\n     ${n.actionUrl}` : ''));

    const ultima = maxFecha(todos, 'timestamp');

    // El desglose por fuente es la brújula: dice qué filtro pedir sin tener que
    // volcar los 192 items para descubrirlo.
    const porFuente = Object.entries(
      todos.reduce((acc, n) => ({ ...acc, [n.source || '?']: (acc[n.source || '?'] || 0) + 1 }), {}),
    ).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');

    const cabecera = `[notifications.json · mostrando ${items.length} de ${filtrados.length} filtrados`
      + ` · ${todos.length} en total, ${todos.filter((n) => !n.read).length} sin leer`
      + `${ultima ? ` · más reciente ${edad(ultima)}` : ''}]`;

    return `${cabecera}\n${fuente || categoria ? '' : `Por fuente: ${porFuente}\n`}\n${lista(items)}`;
  },
);

tool(
  'dvpotro_perfil',
  'Datos del alumno: nombre completo como figura en el sistema, matrícula, correo institucional y programa. Sirve para llenar portadas y encabezados de entregas sin tener que preguntárselos.',
  SIN_ARGS,
  () => {
    const res = readJson(path.join('profile-cache', 'profile.json'));

    if (res.falta) return 'No hay perfil cacheado. Abrí Ajustes → Perfil en DVPotro para traerlo del Portal de Sistemas.';
    if (res.error) return res.error;

    const p = res.data;

    return [
      `nombre:    ${p.fullName || '—'}`,
      `matrícula: ${p.studentId || '—'}`,
      `correo:    ${p.email || '—'}`,
      `programa:  ${p.acadProg || '—'}`,
      p.cachedAt ? `[traído ${edad(p.cachedAt)}]` : null,
    ]
      .filter(Boolean)
      .join('\n');
  },
);

tool(
  'dvpotro_requisitos',
  'Los requisitos que DVPotro ya extrajo de una consigna con IA, y el resultado de la última verificación de la entrega contra ellos. NO llama a ningún modelo: devuelve análisis ya cacheados, cuesta cero. Ideal para responder "¿qué me falta para entregar esto?".',
  {
    type: 'object',
    properties: { id: { type: 'string', description: 'Id de la actividad, el de dvpotro_actividades.' } },
    required: ['id'],
  },
  ({ id }) => {
    // Misma convención de nombre que `activity-analyzer.js` al guardar.
    const archivo = path.join('activity-analysis', `${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    const res = readJson(archivo);

    if (res.falta) {
      return `La actividad ${id} todavía no fue analizada. Abrila en DVPotro y usá el analizador — este tool solo lee resultados ya calculados, no llama al modelo.`;
    }

    if (res.error) return res.error;

    const a = res.data;
    const bloques = [
      `[analizado ${a.requirementsAt ? edad(a.requirementsAt) : '?'} con ${a.requirementsModel || 'modelo desconocido'}]`,
      '',
      `## Requisitos (${(a.requirements || []).length})`,
      ...(a.requirements || []).map((r) => `- [${r.type}] ${r.description}${r.criteria ? `\n    criterio: ${r.criteria}` : ''}`),
    ];

    const ultima = (a.verifications || [])[a.verifications.length - 1];

    if (ultima) {
      const cumple = (ultima.results || []).filter((r) => r.met === 'yes').length;
      const total = (ultima.results || []).length;
      const mapa = new Map((a.requirements || []).map((r) => [r.id, r.description]));

      bloques.push(
        '',
        `## Última verificación — ${cumple}/${total} cumplidos`,
        `[${ultima.model || '?'} · ${ultima.at ? edad(ultima.at) : '?'}${ultima.meta ? ` · ${ultima.meta.extension || ''} ${ultima.meta.wordCount || '?'} palabras` : ''}]`,
        ...(ultima.results || []).map(
          (r) => `- ${r.met.toUpperCase().padEnd(7)} ${mapa.get(r.requirementId) || r.requirementId}${r.notes ? `\n    ${r.notes}` : ''}`,
        ),
      );
    } else {
      bloques.push('', '(todavía no se verificó ninguna entrega contra estos requisitos)');
    }

    return bloques.join('\n');
  },
);

tool(
  'dvpotro_prompts',
  'Los prompts que DVPotro ya armó para una actividad, con el contexto de la consigna, la rúbrica y el material que usó. Sin `id` lista para qué actividades hay prompts guardados. NO llama a ningún modelo: lee la caché, cuesta cero.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id de la actividad, el de dvpotro_actividades. Sin esto solo lista.' },
      modo: { type: 'string', description: 'Modo del prompt (resolver, explicar…). Por defecto trae todos los de esa actividad.' },
    },
  },
  ({ id, modo }) => {
    const res = cargar('prompt-cache.json', 'Generá algún prompt desde una actividad en DVPotro.');
    if (res.fallo) return res.fallo;

    // Las claves son `<idActividad>::<modo>`, igual que las arma
    // `prompt-builder.js` al guardar.
    const entradas = Object.entries(res.data.prompts || {}).map(([clave, valor]) => {
      const [actividadId, modoClave] = clave.split('::');
      return { actividadId, modo: valor.modo || modoClave, ...valor };
    });

    if (!entradas.length) return `${res.cabecera}\n\nNo hay prompts guardados todavía.`;

    const nombres = new Map(
      (readJson('actividades-cache.json').data?.actividades || []).map((a) => [String(a.id), `${a.nombre} — ${a.materia}`]),
    );

    if (!id) {
      const filas = entradas.map(
        (e) => `  [${e.actividadId}] ${e.modo}  ${nombres.get(e.actividadId) || '(actividad fuera de la caché)'}`
          + `${e.generadoEn ? ` · ${edad(e.generadoEn)}` : ''}`,
      );

      return `${res.cabecera}\n${entradas.length} prompts guardados\n\n${filas.join('\n')}\n\nPedí uno con \`id\`.`;
    }

    const suyos = entradas.filter((e) => e.actividadId === String(id) && (!modo || e.modo === modo));

    if (!suyos.length) {
      return `No hay prompt guardado para la actividad ${id}${modo ? ` en modo ${modo}` : ''}. Generalo en DVPotro — este tool solo lee.`;
    }

    const bloques = suyos.map((e) =>
      [
        `## ${e.modo} — ${nombres.get(e.actividadId) || e.actividadId}`,
        `[${e.backend || 'backend desconocido'}${e.generadoEn ? ` · ${edad(e.generadoEn)}` : ''}]`,
        (e.fuentes || []).length ? `fuentes: ${e.fuentes.join(', ')}` : null,
        '',
        e.prompt,
      ]
        .filter((b) => b !== null)
        .join('\n'),
    );

    return `${res.cabecera}\n\n${bloques.join('\n\n---\n\n')}`;
  },
);

tool(
  'dvpotro_agenda',
  'Un solo eje temporal ordenado con lo que viene: clases del horario, vencimientos de actividades y eventos del calendario escolar, mezclados por fecha. Reemplaza tener que llamar a horario, actividades y calendario por separado y ordenarlos a mano.',
  {
    type: 'object',
    properties: { dias: { type: 'number', description: 'Ventana hacia adelante. Por defecto 7.' } },
  },
  ({ dias = 7 }) => {
    const { parseDueDate, daysUntilDue } = require(path.join(REPO, 'electron', 'utils', 'dateParser.js'));

    const eventos = [];
    const ocultos = idsOcultos();

    const act = readJson('actividades-cache.json');
    (act.data?.actividades || [])
      .filter((a) => !ocultos.has(String(a.id)) && a.estado !== 'entregada')
      .forEach((a) => {
        const ms = parseDueDate(a.fechaLimite);
        const d = daysUntilDue(ms);

        if (d === null || d < 0 || d > dias) return;

        eventos.push({ ms, dias: d, texto: `ENTREGA  ${a.nombre} — ${a.materia}${a.estado === 'retrasada' ? ' (RETRASADA)' : ''}` });
      });

    const cal = readJson('calendario-cache.json');
    (cal.data?.events || []).forEach((e) => {
      const ms = new Date(e.inicio).getTime();
      const d = daysUntilDue(ms);

      if (d === null || d < 0 || d > dias) return;

      eventos.push({ ms, dias: d, texto: `ITSON    ${e.titulo}${e.categoria ? ` [${e.categoria}]` : ''}` });
    });

    // Las clases son semanales, no tienen fecha: se proyectan sobre la ventana.
    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const hor = readJson('horario-cache.json');
    const hoy = new Date();

    for (let salto = 0; salto <= dias; salto += 1) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + salto);
      const nombreDia = DIAS[fecha.getDay()];

      (hor.data?.materias || []).forEach((m) => {
        (m.sesiones?.length ? m.sesiones : [m]).forEach((s) => {
          if (!(s.dias || []).some((d) => incluye(d, nombreDia))) return;

          const [hh, mm] = String(s.horaInicio || '00:00').split(':').map(Number);
          const donde = s.modalidad === 'en_linea' ? (oNada(m.meetLink) || 'en línea') : (s.ubicacion || 'aula sin dato');

          eventos.push({
            ms: new Date(fecha).setHours(hh || 0, mm || 0, 0, 0),
            dias: salto,
            texto: `CLASE    ${m.nombre}  ${s.horaInicio}–${s.horaFin}  ${donde}`,
          });
        });
      });
    }

    if (!eventos.length) return `Nada agendado en los próximos ${dias} días.`;

    eventos.sort((a, b) => a.ms - b.ms);

    // Agrupado por día: una lista plana de treinta líneas con la fecha repetida
    // se lee mucho peor que seis bloques con encabezado.
    const porDia = new Map();
    eventos.forEach((e) => {
      const clave = new Date(e.ms).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
      if (!porDia.has(clave)) porDia.set(clave, { dias: e.dias, items: [] });
      porDia.get(clave).items.push(e);
    });

    const bloques = [...porDia.entries()].map(([dia, { dias: d, items }]) => {
      const cuando = d === 0 ? 'HOY' : d === 1 ? 'MAÑANA' : `en ${d} días`;
      return `${dia.toUpperCase()} · ${cuando}\n${items.map((i) => `  ${i.texto}`).join('\n')}`;
    });

    return `Próximos ${dias} días\n\n${bloques.join('\n\n')}`;
  },
);

tool(
  'dvpotro_novedades',
  'Qué cambió desde la última vez: actividades nuevas, fechas límite movidas, cambios de aula o de enlace de clase, y avisos del portal. Sale del historial de notificaciones que DVPotro ya calculó comparando sincronizaciones.',
  {
    type: 'object',
    properties: {
      horas: { type: 'number', description: 'Ventana hacia atrás. Por defecto 72.' },
      categoria: {
        type: 'string',
        enum: ['nueva', 'cambio', 'proximidad', 'error', 'info', 'todas'],
        description: 'Por defecto muestra nueva y cambio, que es lo que de verdad cambió.',
      },
    },
  },
  ({ horas = 72, categoria }) => {
    const res = cargar('notifications.json', 'Usá DVPotro un rato para que detecte cambios.');
    if (res.fallo) return res.fallo;

    const desde = Date.now() - horas * 3600_000;
    const quiere = categoria && categoria !== 'todas' ? [categoria] : ['nueva', 'cambio'];

    const items = (res.data.items || [])
      .filter((n) => new Date(n.timestamp).getTime() >= desde)
      .filter((n) => (categoria === 'todas' ? true : quiere.includes(n.category)))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!items.length) return `Sin novedades en las últimas ${horas} horas.`;

    const porFuente = new Map();
    items.forEach((n) => {
      if (!porFuente.has(n.source)) porFuente.set(n.source, []);
      porFuente.get(n.source).push(n);
    });

    const bloques = [...porFuente.entries()].map(([fuente, lista]) =>
      `${fuente.toUpperCase()} (${lista.length})\n${lista
        .map((n) => `  · ${n.title}${n.body ? `\n      ${extracto(n.body, 150)}` : ''}`)
        .join('\n')}`,
    );

    return `Últimas ${horas} h · ${items.length} novedades\n\n${bloques.join('\n\n')}`;
  },
);

// ---------------------------------------------------------------------------
// Sincronización — la única parte que NO es de solo lectura
// ---------------------------------------------------------------------------

const REPO = path.join(__dirname, '..');

// Los handlers de la app son módulos de Electron. Corren igual en Node pelado
// si se les da un `electron` de mentira ANTES de requerirlos: solo usan
// `app.getPath` para ubicar userData y tocan `session` para sincronizar cookies.
//
// Se cargan PEREZOSAMENTE: requerir Playwright y los handlers en el arranque
// haría lento cada inicio del servidor, y las 11 tools de lectura no los
// necesitan para nada.
let handlersListos = false;

function prepararHandlers() {
  if (handlersListos) return;

  const dotenv = path.join(REPO, 'node_modules', 'dotenv');

  // Las credenciales viven en el repo durante desarrollo y en userData cuando
  // la app está empaquetada. Se prueban las dos, sin pisar lo que ya esté en
  // el entorno.
  for (const envPath of [path.join(REPO, '.env'), path.join(USER_DATA, '.env')]) {
    if (fs.existsSync(envPath)) {
      // `quiet` porque dotenv imprime un banner a stdout, que es el canal del
      // protocolo. El secuestro de arriba ya lo contendría, pero silenciarlo en
      // su propia API evita el ruido en stderr en cada sync.
      require(dotenv).config({ path: envPath, quiet: true });
    }
  }

  require.cache[require.resolve('electron')] = {
    id: require.resolve('electron'),
    filename: require.resolve('electron'),
    loaded: true,
    exports: {
      app: {
        // `getPath('temp')` tiene que ser el temp real: `calendario.js` baja ahí
        // el ICS y devolverle userData le ensucia la carpeta de datos.
        getPath: (key) => (key === 'temp' ? os.tmpdir() : USER_DATA),
        on: () => {},
        getVersion: () => 'mcp',
        // isPackaged: true NO ES COSMÉTICO. `settings.js:getEnvFilePath()` lo
        // consulta para decidir dónde vive el .env, y `scrapeHorario` termina
        // llamando a `saveStudentName` cuando lee el nombre del alumno en CIA.
        // Con `undefined` toma la rama de desarrollo y REESCRIBE el .env del
        // repo — el archivo con todas las claves. Forzando true escribe en
        // userData, que es el archivo propio de la app.
        isPackaged: true,
      },
      ipcMain: { handle: () => {}, removeHandler: () => {} },
      BrowserWindow: { getAllWindows: () => [] },
      shell: {},
      dialog: {},

      // `portal-sistemas.js` lo destructura en su require y lo usa para achicar
      // la foto del alumno ANTES de guardar el perfil. Sin este doble el scrape
      // tiraba TypeError justo antes de `writeProfileCache` y se perdían también
      // nombre, matrícula y correo, que ya estaban leídos. Devolver un JPEG
      // vacío hace que su propio guard (`if (jpeg.length > 0)`) deje la foto en
      // null y siga de largo: por MCP la foto no le sirve a nadie, los datos sí.
      nativeImage: {
        createFromBuffer: () => ({ resize: () => ({ toJPEG: () => Buffer.alloc(0) }) }),
      },
      protocol: { handle: () => {}, registerSchemesAsPrivileged: () => {} },
      // El scraper copia sus cookies a la sesión de Electron para que el
      // renderer pueda bajar adjuntos. Sin renderer no hay a dónde copiarlas.
      session: {
        defaultSession: { cookies: { set: async () => {} } },

        // `drive.js` baja los PDF de Drive con `session.fromPartition(...).fetch()`,
        // que es API de Electron. Sin ventana no existen esas sesiones, así que
        // la llamada tiraba y la cola archivaba TODO Drive como `error_red`: el
        // MCP nunca pudo resolver un enlace de Drive, ni para material ni para
        // consignas. De esa sesión solo se usa `fetch`, y el global de Node
        // cumple el mismo contrato (status, headers, body.getReader,
        // arrayBuffer), así que alcanza con prestárselo.
        fromPartition: () => ({ fetch: (url, opciones) => fetch(url, opciones) }),
      },
    },
  };

  handlersListos = true;
}

// LISTA BLANCA. El módulo pedido se busca en este objeto y nunca se arma un
// nombre de función a partir del argumento del cliente.
//
// Regla dura del proyecto: LA ASISTENCIA NUNCA SE MARCA SOLA. Acá no entra
// ninguna función que escriba en el portal — ni marcar asistencia, ni subir
// entregas, ni guardar enlaces. Sincronizar es traer, nunca mandar.
const SINCRONIZABLES = {
  actividades: {
    descripcion: 'consignas, rúbricas, adjuntos y estado de entrega de iVirtual',
    credenciales: ['IVIRTUAL_USER', 'IVIRTUAL_PASS'],
    segundos: 45,
    ejecutar: async () => {
      const scraper = require(path.join(REPO, 'electron', 'handlers', 'scraper.js'));
      const res = await scraper.getActivitiesWithCache(null, { force: true });

      if (res?.error) return { error: res.error };

      const items = res.activities || res.actividades || [];
      const porEstado = items.reduce((acc, a) => ({ ...acc, [a.estado]: (acc[a.estado] || 0) + 1 }), {});

      return { resumen: `${items.length} actividades (${Object.entries(porEstado).map(([k, v]) => `${v} ${k}`).join(', ')})` };
    },
  },
  material: {
    descripcion: 'presentaciones, apuntes y enlaces publicados por los profesores',
    credenciales: ['IVIRTUAL_USER', 'IVIRTUAL_PASS'],
    segundos: 40,
    ejecutar: async () => {
      const material = require(path.join(REPO, 'electron', 'handlers', 'material.js'));

      // `scrapeMaterial` devuelve el objeto pero NO lo persiste: el diff contra
      // la caché anterior y la escritura los hace el handler IPC. Se replica su
      // secuencia exacta en vez de escribir el archivo a mano, o el sync desde
      // acá dejaría el módulo sin las novedades que la UI muestra arriba.
      const anterior = material.readCache();
      const res = await material.scrapeMaterial({});

      if (res?.error) return { error: res.error };

      const novedades = material.diffMaterial(anterior, res);
      material.writeCache({ ...res, novedades });

      const recursos = (res.materias || []).reduce((sum, m) => sum + (m.totalRecursos || 0), 0);
      return {
        resumen: `${res.materias?.length || 0} materias, ${recursos} recursos`
          + (novedades.length ? ` · ${novedades.length} recurso(s) nuevo(s)` : ''),
      };
    },
  },

  horario: {
    descripcion: 'horario semanal de CIA y los enlaces de videollamada de iVirtual',
    credenciales: ['CIA_USER', 'CIA_PASS'],
    segundos: 60,
    ejecutar: async () => {
      const horario = require(path.join(REPO, 'electron', 'handlers', 'horario.js'));
      const res = await horario.getHorarioWithCache({ force: true });

      if (res?.error) return { error: res.error };

      return { resumen: `${res.materias?.length || 0} materias` };
    },
  },
  calendario: {
    descripcion: 'calendario escolar del ITSON (pagina publica, no pide credenciales)',
    credenciales: [],
    segundos: 20,
    ejecutar: async () => {
      const calendario = require(path.join(REPO, 'electron', 'handlers', 'calendario.js'));
      const res = await calendario.run({ force: true });

      if (res?.error) return { error: res.error };

      return { resumen: `${res.events?.length || 0} eventos` };
    },
  },
  asistencia: {
    descripcion: 'asistencia tomada por materia — SOLO LECTURA, nunca marca presencia',
    credenciales: ['IVIRTUAL_USER', 'IVIRTUAL_PASS'],
    segundos: 40,
    ejecutar: async () => {
      const attendance = require(path.join(REPO, 'electron', 'handlers', 'attendance.js'));

      // `scrapeAttendance` solo LEE el modulo de asistencia. La funcion que
      // marca presencia es `markAttendance` y no se referencia en ningun lado
      // de este archivo, a proposito: la regla del proyecto es que la
      // asistencia jamas se marca de forma automatica.
      const res = await attendance.scrapeAttendance({});

      if (res?.error) return { error: res.error };

      attendance.writeCache(res);

      const pendientes = (res.materias || []).filter((m) => (m.sesiones || []).some((x) => x.pendiente)).length;

      return {
        resumen: `${res.materias?.length || 0} materias`
          + (pendientes ? ` · ${pendientes} con sesiones pendientes (marcalas vos en la app)` : ''),
      };
    },
  },
  calificaciones: {
    descripcion: 'boleta y promedios de CIA',
    credenciales: ['CIA_USER', 'CIA_PASS'],
    segundos: 120,
    ejecutar: async () => {
      const cia = require(path.join(REPO, 'electron', 'handlers', 'cia.js'));
      const res = await cia.getCalificacionesWithCache();

      if (res?.error) return { error: res.error };

      return { resumen: `${res.materias?.length || 0} materias` };
    },
  },

  // `notices.js` quedó afuera de la lista blanca por forma, no por peligro:
  // SINCRONIZABLES asumía "módulo con caché propia + tool de lectura + fila en
  // dvpotro_estado", y los avisos no tienen nada de eso: desembocan en
  // notifications.json, que `dvpotro_notificaciones` ya lee.
  avisos: {
    descripcion: 'convocatorias, becas, pagos y reinscripción del portal público del ITSON',
    credenciales: [],
    segundos: 20,
    ejecutar: async () => {
      const notices = require(path.join(REPO, 'electron', 'handlers', 'notices.js'));
      const res = await notices.syncNotices();

      if (!res?.ok) return { error: res?.error || 'no se pudieron leer las noticias' };

      return {
        resumen: res.seeded
          ? `${res.total} avisos registrados por primera vez (no se notifican para no inundar)`
          : `${res.added} aviso(s) nuevo(s) sobre ${res.total}`,
      };
    },
  },

  // `dvpotro_perfil` era la única lectura que terminaba en un callejón sin
  // salida: sin caché contestaba "abrí Ajustes en DVPotro", justo lo que no se
  // puede hacer desde una sesión por stdio con la app cerrada. Y es el dato que
  // hace falta a las 2 AM para una portada.
  perfil: {
    descripcion: 'nombre como figura en el sistema, matrícula, correo institucional y programa',
    credenciales: ['IVIRTUAL_USER', 'IVIRTUAL_PASS'],
    segundos: 30,
    ejecutar: async () => {
      const portal = require(path.join(REPO, 'electron', 'handlers', 'portal-sistemas.js'));
      const res = await portal.refreshProfile();

      if (res?.error) return { error: res.error };

      const p = res.profile || res;

      return { resumen: `${p.fullName || 'sin nombre'} · ${p.studentId || 'sin matrícula'}` };
    },
  },
};

tool(
  'dvpotro_sync',
  'Trae datos frescos del portal y actualiza la caché. LENTO: abre un navegador y navega iVirtual, entre 40 y 60 segundos por módulo. Usalo solo cuando la caché esté vieja o falte algo — dvpotro_estado dice qué tan vieja está. Solo LEE del portal: nunca marca asistencia ni sube entregas.',
  {
    type: 'object',
    properties: {
      modulo: {
        type: 'string',
        enum: Object.keys(SINCRONIZABLES),
        description: 'Qué sincronizar. Obligatorio: se pide de a uno para no encadenar minutos de espera.',
      },
    },
    required: ['modulo'],
  },
  async ({ modulo }) => {
    const spec = SINCRONIZABLES[modulo];

    // El módulo se busca en la lista blanca; nunca se arma un nombre de función
    // con lo que mandó el cliente.
    if (!spec) {
      return `Módulo desconocido. Disponibles: ${Object.keys(SINCRONIZABLES).join(', ')}`;
    }

    prepararHandlers();

    const faltan = (spec.credenciales || []).filter((v) => !process.env[v]);

    if (faltan.length) {
      return `Faltan credenciales para sincronizar ${modulo}: ${faltan.join(', ')}. Configuralas en Ajustes de DVPotro.`;
    }

    const inicio = Date.now();
    let res;

    try {
      res = await spec.ejecutar();
    } catch (error) {
      return `El scrape de ${modulo} falló: ${error?.message || error}`;
    }

    const segundos = Math.round((Date.now() - inicio) / 1000);

    if (res.error) {
      return `El scrape de ${modulo} falló: ${res.error}`;
    }

    return `Sincronizado ${modulo} en ${segundos}s — ${res.resumen}\nLa caché quedó fresca; las tools de lectura ya devuelven lo nuevo.`;
  },
);

// ---------------------------------------------------------------------------
// Adjuntos de iVirtual
// ---------------------------------------------------------------------------

// Moodle sirve los adjuntos detrás de la cookie de sesión: la URL que guarda la
// caché devuelve la pantalla de login desde afuera. Cuando el profesor no
// escribe consigna —pasa seguido— la tarea entera vive adentro de ese .docx, y
// sin esto el alumno tiene que bajarlo a mano para que el modelo lo lea.
const ADJUNTOS_DIR = 'adjuntos';
const MAX_TEXTO_ADJUNTO = 4000;

// Mismo criterio que `drive.js`: sólo estos dos tienen texto extraíble sin OCR.
const EXTENSIONES_CON_TEXTO = new Set(['.pdf', '.docx']);

// Sanitizador propio en vez del `safeFileName` de `drive.js`: importarlo obliga
// a requerir el handler y con él todo el electron falso, para cuatro reemplazos.
function nombreSeguro(nombre) {
  const limpio = String(nombre || '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return limpio || 'adjunto';
}

// Moodle nombra `blobid0.png` a TODAS las imágenes que se pegan en un editor, así
// que la URL no distingue nada. El nombre real, cuando existe, viaja en el `alt`.
// El índice adelante evita que dos blobid0 de la misma actividad se pisen.
function nombreImagen(img, indice) {
  const alt = String(img.alt || img.titulo || '').trim();
  let base = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(alt) ? alt : '';

  if (!base) {
    try {
      base = decodeURIComponent(path.basename(new URL(img.url).pathname));
    } catch (_error) {
      base = '';
    }
  }

  return `${String(indice + 1).padStart(2, '0')}-${nombreSeguro(base || 'imagen.png')}`;
}

// `extracto` colapsa los saltos de línea, que en una consigna son la estructura.
function recorte(texto, max) {
  if (texto.length <= max) return texto;

  const corte = texto.lastIndexOf('\n', max);

  return `${texto.slice(0, corte > max * 0.5 ? corte : max)}\n…`;
}

async function bajarAdjuntos(pendientes) {
  prepararHandlers();

  const { chromium } = require(path.join(REPO, 'node_modules', 'playwright'));
  const scraper = require(path.join(REPO, 'electron', 'handlers', 'scraper.js'));

  const navegador = await chromium.launch({ headless: true });

  try {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    const login = await scraper.loginToIVirtual(
      pagina,
      process.env.IVIRTUAL_USER?.trim(),
      process.env.IVIRTUAL_PASS,
    );

    if (login?.error) return { error: login.error };

    const hechos = [];

    for (const item of pendientes) {
      // La URL sale de la caché de actividades, nunca del cliente: acá adentro
      // sólo entran ids de actividad.
      const respuesta = await contexto.request.get(item.url, { timeout: 60000 });

      if (!respuesta.ok()) {
        hechos.push({ url: item.url, error: `HTTP ${respuesta.status()}` });
        continue;
      }

      const cuerpo = await respuesta.body();

      // Moodle contesta la pantalla de login con 200, no con 401. Sin este
      // chequeo el HTML se guardaría con extensión .docx y el fallo aparecería
      // recién al intentar abrirlo.
      if (/^\s*<(!doctype|html)/i.test(cuerpo.subarray(0, 64).toString('latin1'))) {
        hechos.push({ url: item.url, error: 'iVirtual devolvió HTML: la sesión no quedó abierta' });
        continue;
      }

      fs.mkdirSync(path.dirname(item.ruta), { recursive: true });

      // Se escribe a un parcial y se renombra: si el proceso muere a la mitad,
      // la próxima corrida ve que el archivo no está en vez de reusar uno roto.
      const parcial = `${item.ruta}.part`;
      fs.writeFileSync(parcial, cuerpo);
      fs.renameSync(parcial, item.ruta);

      hechos.push({ url: item.url });
    }

    return { hechos };
  } finally {
    await navegador.close();
  }
}

// El texto va a un sidecar junto al archivo y no a un índice: son varios
// adjuntos por actividad y una consigna sola ya pasa los 7.000 caracteres.
async function extraerTextoAdjunto(ruta) {
  if (!EXTENSIONES_CON_TEXTO.has(path.extname(ruta).toLowerCase())) return null;

  const sidecar = `${ruta}.txt`;

  if (fs.existsSync(sidecar)) {
    const texto = fs.readFileSync(sidecar, 'utf8');
    return { ruta: sidecar, texto, palabras: texto.split(/\s+/).filter(Boolean).length };
  }

  prepararHandlers();

  try {
    const { parseSubmission } = require(path.join(REPO, 'electron', 'handlers', 'activity-analyzer.js'));
    const parsed = await parseSubmission(ruta);
    const texto = String(parsed?.text || '').trim();

    if (!texto) return null;

    fs.writeFileSync(sidecar, texto, 'utf8');

    return {
      ruta: sidecar,
      texto,
      palabras: parsed?.wordCount ?? texto.split(/\s+/).filter(Boolean).length,
    };
  } catch (error) {
    // Un PDF escaneado no tiene texto extraíble. El archivo sigue sirviendo:
    // está en disco y se puede abrir.
    log('sin texto extraíble para', ruta, error?.message || error);
    return null;
  }
}

tool(
  'dvpotro_adjuntos',
  'Baja a disco los adjuntos de UNA actividad —archivos y las imágenes incrustadas en la consigna— y devuelve la ruta local de cada uno, con el texto extraído de los .pdf/.docx. Para eso existe: las URLs de iVirtual necesitan la cookie de sesión del alumno, así que no se pueden abrir desde afuera, y cuando el profesor no publicó consigna la tarea entera está adentro de ese .docx o dibujada en esa imagen. LENTO la primera vez (~10-20 s: abre un navegador e inicia sesión); después reusa lo que ya está en disco, sin red. Solo LEE: nunca sube nada al portal.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id exacto que devuelve dvpotro_actividades.' },
      nombre: { type: 'string', description: 'Alternativa al id: parte del nombre de la actividad.' },
      incluir_texto: {
        type: 'boolean',
        description: `Texto de cada .pdf/.docx, recortado a ${MAX_TEXTO_ADJUNTO} caracteres. Por defecto true.`,
      },
      incluir_imagenes: {
        type: 'boolean',
        description: 'Baja también las imágenes incrustadas en la consigna. Por defecto true: muchas veces el enunciado está dibujado ahí y no escrito.',
      },
      forzar: {
        type: 'boolean',
        description: 'Vuelve a bajarlos aunque ya estén en disco. Para cuando el profesor reemplazó el adjunto.',
      },
    },
  },
  async ({ id, nombre, incluir_texto = true, incluir_imagenes = true, forzar = false }) => {
    const encontrada = unaActividad({ id, nombre });
    if (encontrada.fallo) return encontrada.fallo;

    const { a } = encontrada;
    const dir = path.join(USER_DATA, ADJUNTOS_DIR, nombreSeguro(String(a.id)));

    const items = (a.archivos || []).map((f) => ({
      nombre: f.name,
      url: f.url,
      ruta: path.join(dir, nombreSeguro(f.name)),
    }));

    // Van a su propia carpeta: los nombres de Moodle chocan con los de los
    // adjuntos apenas dos archivos se llaman igual.
    const imagenes = incluir_imagenes
      ? (a.imagenes || [])
          // Una consigna puede traer la imagen embebida como data: URI, que ya
          // está en la caché y no hay a dónde ir a buscarla.
          .filter((img) => /^https?:/i.test(img.url || ''))
          .map((img, i) => {
            const nombreArchivo = nombreImagen(img, i);

            return {
              nombre: nombreArchivo,
              url: img.url,
              ruta: path.join(dir, 'imagenes', nombreArchivo),
              medidas: img.ancho && img.alto ? `${img.ancho}×${img.alto}` : '',
              alt: String(img.alt || img.titulo || '').trim(),
            };
          })
      : [];

    if (!items.length && !imagenes.length) {
      return `[${a.id}] ${a.nombre}\nNo tiene adjuntos ni imágenes. Si la consigna cuelga de un enlace de Drive, pedila con dvpotro_actividad e incluir_documentos:true.`;
    }

    const todos = [...items, ...imagenes];
    const pendientes = todos.filter((i) => forzar || !fs.existsSync(i.ruta));
    const errores = new Map();

    if (pendientes.length) {
      // Antes del chequeo: `prepararHandlers` es quien carga el .env, y sin él
      // las credenciales siempre parecen faltar.
      prepararHandlers();

      const faltan = ['IVIRTUAL_USER', 'IVIRTUAL_PASS'].filter((v) => !process.env[v]);

      if (faltan.length) {
        return `Faltan credenciales para entrar a iVirtual: ${faltan.join(', ')}. Configuralas en Ajustes de DVPotro.`;
      }

      let bajada;

      try {
        bajada = await bajarAdjuntos(pendientes);
      } catch (error) {
        return `La descarga falló: ${error?.message || error}`;
      }

      if (bajada.error) return `No se pudo entrar a iVirtual: ${bajada.error}`;

      for (const h of bajada.hechos) {
        if (h.error) errores.set(h.url, h.error);
      }
    }

    const partes = [
      `${items.length} archivo(s)`,
      imagenes.length ? `${imagenes.length} imagen(es)` : null,
      `${pendientes.length} bajado(s) ahora, ${todos.length - pendientes.length} ya en disco`,
    ].filter(Boolean);

    const bloques = [
      encontrada.cabecera,
      '',
      `# Adjuntos de ${a.nombre}`,
      `${a.materia} · ${partes.join(' · ')}`,
    ];

    const noBajado = (item) => {
      const fallo = errores.get(item.url);
      if (!fallo && fs.existsSync(item.ruta)) return null;

      return [`- ${item.nombre} — NO SE PUDO BAJAR: ${fallo || 'el archivo no quedó en disco'}`, `  ${item.url}`];
    };

    if (items.length) {
      bloques.push('', '## Archivos');

      for (const item of items) {
        const fallo = noBajado(item);

        if (fallo) {
          bloques.push(...fallo);
          continue;
        }

        const kb = Math.round(fs.statSync(item.ruta).size / 1024);
        const extraido = await extraerTextoAdjunto(item.ruta);

        bloques.push(
          `- ${item.nombre} — ${kb} KB${extraido ? ` · ${extraido.palabras} palabras` : ' · sin texto extraíble'}`,
          `  ${item.ruta}`,
        );

        if (!incluir_texto || !extraido) continue;

        bloques.push('', '```', recorte(extraido.texto, MAX_TEXTO_ADJUNTO), '```');

        if (extraido.texto.length > MAX_TEXTO_ADJUNTO) {
          bloques.push(`(recortado; el texto completo está en ${extraido.ruta})`);
        }
      }
    }

    if (imagenes.length) {
      bloques.push('', '## Imágenes de la consigna');

      for (const img of imagenes) {
        const fallo = noBajado(img);

        if (fallo) {
          bloques.push(...fallo);
          continue;
        }

        const etiqueta = [
          img.medidas,
          img.alt && img.alt !== img.nombre ? `"${img.alt}"` : null,
        ].filter(Boolean).join(' · ');

        bloques.push(`- ${img.nombre}${etiqueta ? ` — ${etiqueta}` : ''}`, `  ${img.ruta}`);
      }

      // No tienen texto que extraer: el valor es que ahora hay un archivo local
      // que se puede mirar, y en estas materias el enunciado suele estar dibujado.
      bloques.push('', '(las imágenes se leen abriendo su ruta)');
    }

    return bloques.join('\n');
  },
);

tool(
  'dvpotro_marcar_leidas',
  'Marca avisos como leídos para que la bandeja funcione como un inbox con cursor: sin esto `solo_no_leidas` nunca achica nada y cada sesión te repite las mismas novedades. Exige un criterio (ids, fuente o categoría): nunca marca todo. Escribe la caché local, no toca el portal.',
  {
    type: 'object',
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ids exactos, los que dvpotro_notificaciones muestra entre corchetes.',
      },
      fuente: { type: 'string', description: 'Marca todas las de esa fuente. Valor EXACTO: actividades, horario, calendario, itson-news, sistema.' },
      categoria: { type: 'string', description: 'Marca todas las de esa categoría. Valor EXACTO: nueva, cambio, proximidad, error, info.' },
      confirmar: { type: 'boolean', description: 'Sin esto solo cuenta cuántas marcaría. Requerido para escribir.' },
    },
  },
  ({ ids, fuente, categoria, confirmar = false }) => {
    const porId = Array.isArray(ids) && ids.length ? new Set(ids.map(String)) : null;

    if (!porId && !fuente && !categoria) {
      return 'Pasá `ids`, `fuente` o `categoria`. Sin criterio no marco nada: barrer la bandeja entera borra la única señal de qué es nuevo, y para eso está el botón de la app.';
    }

    const res = cargar('notifications.json', 'Usá DVPotro un rato para que genere avisos.');
    if (res.fallo) return res.fallo;

    const todos = res.data.items || [];
    const alcanzadas = todos.filter((n) => !n.read
      && (!porId || porId.has(String(n.id)))
      && (!fuente || n.source === fuente)
      && (!categoria || n.category === categoria));

    if (!alcanzadas.length) {
      return `Ningún aviso sin leer coincide con ese criterio. Sin leer hay ${todos.filter((n) => !n.read).length}; mirá el desglose con dvpotro_notificaciones.`;
    }

    const desglose = Object.entries(
      alcanzadas.reduce((acc, n) => ({ ...acc, [n.source || '?']: (acc[n.source || '?'] || 0) + 1 }), {}),
    ).map(([k, v]) => `${k} ${v}`).join(' · ');

    // Es la primera escritura EN LOTE del server: un filtro puede tocar 78
    // items de una sola llamada, así que el conteo previo es la pantalla de
    // consentimiento. Marcar leído no se deshace desde acá.
    if (!confirmar) {
      return [
        `ENSAYO — no se marcó nada.`,
        `Marcaría ${alcanzadas.length} aviso(s): ${desglose}`,
        '',
        ...alcanzadas.slice(0, 8).map((n) => `  [${n.source}] ${n.title}`),
        alcanzadas.length > 8 ? `  ... y ${alcanzadas.length - 8} más` : '',
        '',
        'Para marcarlos, volvé a llamarme con confirmar:true.',
      ].filter(Boolean).join('\n');
    }

    prepararHandlers();

    const centro = require(path.join(REPO, 'electron', 'handlers', 'notification-center.js'));
    const hecho = centro.setRead({ ids: ids || null, source: fuente || null, category: categoria || null });

    if (!hecho.ok) return hecho.error;

    return [
      `Marcadas ${hecho.marcadas} como leídas (${desglose}).`,
      `Quedan ${hecho.sinLeer} sin leer.`,
      '',
      // El push al renderer va por BrowserWindow, que acá es una lista vacía.
      'Si tenías DVPotro abierto, su bandeja no se entera hasta que la vuelvas a abrir.',
    ].join('\n');
  },
);

// ---------------------------------------------------------------------------
// Notas: leer una entera y crear
// ---------------------------------------------------------------------------
//
// `dvpotro_notas` lista, pero recorta el cuerpo a 400 caracteres: unos apuntes
// de clase llegaban mutilados. Y hasta acá el MCP solo leía, así que lo que se
// hablaba en la terminal moría en el scrollback en vez de quedar en la app.

// El `body` de una nota es HTML —así lo guarda y lo renderiza la app— y
// `sanitizeHtmlBackstop` es un backstop contra scripts, no un escapador. Guardar
// texto pelado ahí haría desaparecer los saltos de línea y trataría cualquier
// `<` del alumno como etiqueta.
function textoAHtml(texto) {
  const escapado = String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escapado
    .split(/\n{2,}/)
    .map((parrafo) => `<p>${parrafo.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

tool(
  'dvpotro_nota',
  'UNA nota completa, en markdown y sin recortar. dvpotro_notas lista y recorta el cuerpo a 400 caracteres; esta trae el texto entero, el checklist con sus tildes y las imágenes adjuntas.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id de la nota, el que ahora devuelve dvpotro_notas entre corchetes.' },
    },
    required: ['id'],
  },
  ({ id }) => {
    prepararHandlers();

    const notas = require(path.join(REPO, 'electron', 'handlers', 'notes.js'));
    const res = notas.exportMarkdown(id);

    if (!res.ok) return res.error || 'No se pudo leer la nota.';

    return res.markdown;
  },
);

tool(
  'dvpotro_nota_crear',
  'Crea una nota en DVPotro: de texto o checklist. Para que lo que se habla acá quede DENTRO de la app y no en el scrollback de la terminal — los pendientes de una conversación, un apunte de clase, lo que hay que llevar el lunes. Escribe en la caché local, no toca el portal.',
  {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Título de la nota.' },
      texto: { type: 'string', description: 'Cuerpo en texto plano. Los saltos de línea se respetan. Excluyente con `checklist`.' },
      checklist: {
        type: 'array',
        items: { type: 'string' },
        description: 'Una línea por ítem. Si viene, la nota es un checklist y `texto` se ignora.',
      },
      etiquetas: { type: 'array', items: { type: 'string' }, description: 'Etiquetas existentes o nuevas.' },
      color: { type: 'string', description: 'Color de la nota en la app. Por defecto neutral.' },
      fijada: { type: 'boolean', description: 'La deja arriba de todo en la app.' },
    },
  },
  ({ titulo, texto, checklist, etiquetas, color, fijada = false }) => {
    if (!titulo && !texto && !(checklist || []).length) {
      return 'Pasá al menos `titulo`, `texto` o `checklist`: una nota vacía no le sirve a nadie.';
    }

    prepararHandlers();

    const notas = require(path.join(REPO, 'electron', 'handlers', 'notes.js'));
    const items = (checklist || []).map((t) => String(t)).filter((t) => t.trim());

    // `normalizeNote` ya valida tipo, color, estado, etiquetas e ítems y
    // descarta lo que no reconoce, así que no hace falta repetir esa validación
    // acá: se le pasa la intención y él decide.
    const nota = notas.createNote({
      type: items.length ? 'checklist' : 'text',
      title: titulo || '',
      body: items.length ? '' : textoAHtml(texto),
      items: items.map((t) => ({ text: t, done: false })),
      labels: Array.isArray(etiquetas) ? etiquetas : [],
      color,
      pinned: fijada,
    });

    const cuerpo = nota.type === 'checklist'
      ? nota.items.map((i) => `   [ ] ${i.text}`).join('\n')
      : `   ${recorte(String(texto || ''), 300)}`;

    return [
      `Nota creada en DVPotro.`,
      '',
      `[${nota.id}] ${nota.title || '(sin título)'}`,
      `   ${[nota.type, nota.color, ...(nota.labels || [])].filter(Boolean).join(' · ')}`,
      cuerpo,
      '',
      `Para verla entera: dvpotro_nota con id:"${nota.id}".`,
    ].join('\n');
  },
);

// ---------------------------------------------------------------------------
// Actividades ocultas
// ---------------------------------------------------------------------------
//
// `dvpotro_actividades`, `dvpotro_materias`, `dvpotro_buscar` y `dvpotro_agenda`
// ya RESTAN las ocultas, pero hasta acá lo único que se veía desde el chat era
// el pie "(N ocultas por vos en la app, no se listan)": ni cuáles eran ni cómo
// revertirlo sin abrir DVPotro.
//
// No pide confirmación, a diferencia de dvpotro_entregar, y es a propósito: esa
// regla protege lo irreversible y lo que sale al portal. Esto es local y el
// handler ni siquiera implementa "eliminar" — la actividad vive en iVirtual y
// vuelve en el próximo scrape. La salvaguarda acá es otra: id EXACTO y una por
// llamada, para que un "limpiá mi lista" no termine ocultando ocho de un saque.

function nombresDeActividades() {
  return new Map(
    (readJson('actividades-cache.json').data?.actividades || [])
      .map((a) => [String(a.id), `${a.nombre} — ${a.materia}`]),
  );
}

tool(
  'dvpotro_ocultar',
  'Oculta o restaura UNA actividad en DVPotro. Sin argumentos lista las que están ocultas hoy, que es lo único que no se puede ver desde el chat. Ocultar no borra nada: la actividad sigue en iVirtual y vuelve a aparecer apenas la restaures.',
  {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Id EXACTO de la actividad, el que devuelve dvpotro_actividades. Sin esto solo lista las ocultas.',
      },
      mostrar: {
        type: 'boolean',
        description: 'Restaura en vez de ocultar. Por defecto false (oculta).',
      },
    },
  },
  ({ id, mostrar = false }) => {
    prepararHandlers();

    const ocultas = require(path.join(REPO, 'electron', 'handlers', 'hidden-activities.js'));
    const nombres = nombresDeActividades();
    const listar = (ids) => (ids.length
      ? ids.map((x) => `  [${x}] ${nombres.get(String(x)) || '(ya no está en la caché)'}`).join('\n')
      : '  (ninguna)');

    if (!id) {
      const ids = ocultas.readIds();

      return [
        `${ids.length} actividad(es) oculta(s):`,
        listar(ids),
        '',
        ids.length
          ? 'Para restaurar una: dvpotro_ocultar con su id y mostrar:true.'
          : 'Para ocultar una: dvpotro_ocultar con su id.',
      ].join('\n');
    }

    // El id se exige exacto: matchear por nombre es lo que convierte un
    // "ocultá esa" en ocho actividades ocultas.
    const etiqueta = nombres.get(String(id));

    if (!etiqueta && !mostrar) {
      return `No hay ninguna actividad con id ${id} en la caché. Mirá los ids con dvpotro_actividades — son posicionales y se corren cuando el profe agrega tareas.`;
    }

    const res = mostrar ? ocultas.removeId(id) : ocultas.addId(id);

    if (!res.ok) return res.error;

    if (mostrar) {
      return [
        res.noEstaba
          ? `[${id}] no estaba oculta; no cambió nada.`
          : `Restaurada [${id}] ${etiqueta || ''}`.trim(),
        '',
        `Ocultas ahora (${res.ids.length}):`,
        listar(res.ids),
      ].join('\n');
    }

    return [
      res.yaEstaba ? `[${id}] ya estaba oculta.` : `Oculta [${id}] ${etiqueta}`,
      'Deja de aparecer en dvpotro_actividades, dvpotro_materias, dvpotro_buscar y dvpotro_agenda.',
      '',
      `Para revertirlo: dvpotro_ocultar con id:"${id}" y mostrar:true.`,
    ].join('\n');
  },
);

// ---------------------------------------------------------------------------
// Lectura de material
// ---------------------------------------------------------------------------
//
// `dvpotro_material` lista los recursos pero no puede abrirlos, y ahí vive casi
// todo lo que el profesor explicó. Medido sobre la caché real: de 34 recursos,
// 19 son enlaces de Drive, 1 es la carpeta con los PDFs de clase y 3 son páginas
// con texto propio. O sea que el contenido de la materia estaba, hasta ahora,
// fuera del alcance de Claude Code.
//
// Cada tipo se lee distinto y por eso hay tres caminos, no una abstracción:
//   pagina   -> el texto ya vino en el scrape, no hay nada que bajar
//   carpeta  -> `pluginfile.php`, necesita la cookie de sesión
//   drive    -> la cola de `drive.js`, que resuelve anónimo

function recursosDeMaterial(data) {
  const salida = [];

  for (const m of data.materias || []) {
    for (const s of m.secciones || []) {
      for (const r of s.recursos || []) {
        salida.push({ ...r, materia: m.nombre, codigo: m.codigo });
      }
    }
  }

  return salida;
}

function unRecurso({ id, nombre, materia }) {
  const res = cargar('material.json', 'Sincronizá Material en DVPotro, o pedí dvpotro_sync con modulo:"material".');
  if (res.fallo) return { fallo: res.fallo };

  const todos = recursosDeMaterial(res.data);
  const deLaMateria = materia
    ? todos.filter((r) => incluye(r.materia, materia) || incluye(r.codigo, materia))
    : todos;

  const encontrados = id
    ? deLaMateria.filter((r) => String(r.id) === String(id))
    : deLaMateria.filter((r) => incluye(r.nombre, nombre));

  if (!id && !nombre) return { fallo: 'Pasá `id` o `nombre` del recurso. Para ver cuáles hay: dvpotro_material.' };
  if (!encontrados.length) return { fallo: 'Sin coincidencias. Usá dvpotro_material para ver los recursos disponibles.' };

  if (encontrados.length > 1) {
    return {
      fallo: `Coinciden ${encontrados.length}. Especificá el id:\n${encontrados
        .map((r) => `  [${r.id}] ${r.nombre} (${r.materia} · ${r.tipo})`)
        .join('\n')}`,
    };
  }

  return { r: encontrados[0], cabecera: res.cabecera };
}

async function textoDeDrive(url, forzar) {
  const drive = require(path.join(REPO, 'electron', 'handlers', 'drive.js'));
  const normalizado = drive.normalizeDriveLink(url);

  if (normalizado.kind === 'no_es_archivo') {
    return { error: `el enlace de Drive no apunta a un archivo descargable (${normalizado.motivo || 'sin id'})` };
  }

  // `juntarLinks` lee `enlaces` con tipo 'google', así que se le pasa una
  // actividad sintética. La cola está escrita para actividades y no hace falta
  // tocarla para resolver un recurso de material: lo que le importa es el link.
  await drive.resolveLinksForActivities(
    [{ id: 'material', enlaces: [{ tipo: 'google', url }] }],
    { forzar },
  );

  const entrada = drive.readIndice().archivos[normalizado.fileId];

  if (!entrada) return { error: 'la cola de Drive no dejó registro del archivo' };

  if (entrada.estado !== 'ok') {
    // `requiere_sesion` es el caso común: un Drive compartido solo con la
    // cuenta institucional no se baja anónimo, y eso no es un error a arreglar.
    return { error: `Drive devolvió "${entrada.estado}"${entrada.estado === 'requiere_sesion' ? ' (el archivo no es público; abrilo con tu cuenta del ITSON)' : ''}` };
  }

  return { texto: drive.leerTexto(entrada), ruta: entrada.ruta, nombre: entrada.nombre };
}

async function textoDePluginfile(archivo, codigo) {
  const material = require(path.join(REPO, 'electron', 'handlers', 'material.js'));

  const faltan = ['IVIRTUAL_USER', 'IVIRTUAL_PASS'].filter((v) => !process.env[v]);
  if (faltan.length) {
    return { error: `faltan credenciales para bajarlo de iVirtual: ${faltan.join(', ')}` };
  }

  const bajada = await material.downloadFile({
    url: archivo.url,
    nombre: archivo.nombre,
    materiaId: codigo || 'general',
  });

  if (bajada.error) return { error: `${bajada.error}${bajada.message ? `: ${bajada.message}` : ''}` };

  // `downloadFile` se conforma con un 200, y Moodle contesta la pantalla de
  // login con 200. Sin este chequeo el HTML del login se archiva con extensión
  // .pdf y el fallo recién aparece al intentar leerlo.
  const cabeza = fs.readFileSync(bajada.path).subarray(0, 64).toString('latin1');

  if (/^\s*<(!doctype|html)/i.test(cabeza)) {
    fs.unlinkSync(bajada.path);
    return { error: 'iVirtual devolvió HTML: la sesión no quedó abierta' };
  }

  const extraido = await extraerTextoAdjunto(bajada.path);

  return {
    texto: extraido ? extraido.texto : '',
    ruta: bajada.path,
    nombre: archivo.nombre,
    sinTexto: !extraido,
  };
}

tool(
  'dvpotro_material_leer',
  'Abre UN recurso de material y devuelve su texto: la presentación del profesor, el PDF de la clase, la página del curso. dvpotro_material lista qué hay; esta lo lee. Baja de Drive o de iVirtual según el recurso y deja el archivo en disco. LENTO la primera vez (~10-30 s), después reusa lo que ya bajó.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id exacto del recurso, el que devuelve dvpotro_material.' },
      nombre: { type: 'string', description: 'Alternativa al id: parte del nombre del recurso.' },
      materia: { type: 'string', description: 'Acota la búsqueda cuando el nombre se repite entre materias.' },
      archivo: {
        type: 'string',
        description: 'Si el recurso es una carpeta con varios PDFs, parte del nombre del que querés. Sin esto los lista.',
      },
      forzar: { type: 'boolean', description: 'Vuelve a bajarlo aunque ya esté en disco.' },
    },
  },
  async ({ id, nombre, materia, archivo, forzar = false }) => {
    const encontrado = unRecurso({ id, nombre, materia });
    if (encontrado.fallo) return encontrado.fallo;

    const { r } = encontrado;
    const cabecera = [
      encontrado.cabecera,
      '',
      `# ${r.nombre}`,
      `${r.materia} · ${r.tipo} · sección "${r.seccion || '—'}"`,
      r.descripcion ? r.descripcion : '',
      '',
    ].filter(Boolean);

    // Las páginas del curso ya trajeron su texto en el scrape: no hay nada que
    // bajar y salir a la red sería trabajo de más.
    if (r.texto) {
      const enlaces = (r.links || []).map((l) => `- ${l.texto || l.nombre || l.url}: ${l.url}`);

      return [
        ...cabecera,
        '```',
        recorte(r.texto, MAX_TEXTO_ADJUNTO),
        '```',
        enlaces.length ? `\n## Enlaces de la página\n${enlaces.join('\n')}` : '',
      ].filter(Boolean).join('\n');
    }

    if (Array.isArray(r.archivos) && r.archivos.length) {
      const candidatos = archivo
        ? r.archivos.filter((f) => incluye(f.nombre, archivo))
        : r.archivos;

      if (!candidatos.length) {
        return [...cabecera, `Ningún archivo coincide con "${archivo}". Tiene:`, ...r.archivos.map((f) => `- ${f.nombre}`)].join('\n');
      }

      if (candidatos.length > 1) {
        return [
          ...cabecera,
          `Es una carpeta con ${candidatos.length} archivos. Pedí uno con \`archivo\`:`,
          ...candidatos.map((f) => `- ${f.nombre}`),
        ].join('\n');
      }

      prepararHandlers();
      const leido = await textoDePluginfile(candidatos[0], r.codigo);

      if (leido.error) return [...cabecera, `No se pudo leer "${candidatos[0].nombre}": ${leido.error}`].join('\n');

      return [
        ...cabecera,
        `## ${leido.nombre}`,
        leido.ruta,
        '',
        leido.sinTexto ? '(sin texto extraíble: es un archivo que hay que abrir)' : '```',
        leido.sinTexto ? '' : recorte(leido.texto, MAX_TEXTO_ADJUNTO),
        leido.sinTexto ? '' : '```',
      ].filter(Boolean).join('\n');
    }

    const urlDrive = r.driveId ? r.destino || r.urlModulo : null;

    if (urlDrive) {
      prepararHandlers();
      const leido = await textoDeDrive(urlDrive, forzar);

      if (leido.error) {
        return [...cabecera, `No se pudo leer de Drive: ${leido.error}`, '', `Abrilo a mano: ${urlDrive}`].join('\n');
      }

      if (!leido.texto) {
        return [...cabecera, `Bajado a ${leido.ruta}`, '', '(sin texto extraíble: probablemente sea una presentación de puras imágenes)'].join('\n');
      }

      return [...cabecera, `## ${leido.nombre}`, leido.ruta, '', '```', recorte(leido.texto, MAX_TEXTO_ADJUNTO), '```'].join('\n');
    }

    // Foros y enlaces sueltos no tienen contenido propio que bajar.
    return [
      ...cabecera,
      `Este recurso es de tipo "${r.tipo}" y no tiene un archivo que leer.`,
      r.urlModulo ? `Abrilo en el portal: ${r.urlModulo}` : '',
    ].filter(Boolean).join('\n');
  },
);

// ---------------------------------------------------------------------------
// Entrega — la ÚNICA tool que escribe en el portal
// ---------------------------------------------------------------------------
//
// Rompe a propósito el invariante "sincronizar es traer, nunca mandar", y por eso
// vive acá abajo, fuera de `SINCRONIZABLES`: ningún sync puede terminar entregando.
//
// NO reimplementa la subida. Leer el formulario, expandir los grupos de
// `accepted_types`, validar y subir lo hace `electron/handlers/assignment-upload.js`
// —el mismo camino que usa la card de Actividades en la app—. Dos implementaciones
// del mismo POST contra un portal frágil divergen apenas Moodle cambia algo, y esa
// ya sabe cosas que no son obvias: la página trae ~14 bloques
// `M.form_filemanager.init` y 12 son de los pickers del editor de texto, así que
// quedarse con el primero hacía creer que la entrega solo aceptaba imágenes.
//
// Lo único que agrega esta tool es la capa de decisión: por defecto NO sube.

// El transporte de este server NO serializa `tools/call`: despacha cada una con
// `Promise.resolve().then(...)` a propósito, para que un sync de 40 s no deje
// mudo al resto. Pero `assignment-upload.js` guarda UNA sola sesión de navegador
// a nivel módulo —una única `page`— porque la pensó para los clicks secuenciales
// de la UI, donde no hay concurrencia posible.
//
// Dos entregas simultáneas manejarían esa misma pestaña: los clicks de una caen
// sobre el formulario de la otra, y el `closeSession` de la que termina primero
// le cierra el navegador a la que todavía está guardando. El modelo pide dos
// actividades en un mismo bloque sin pensarlo.
//
// Se serializa acá y no en el handler porque la app sí quiere ese reuso: el
// problema es exclusivo de este proceso.
// `buildError` devuelve { error: CODIGO, message: texto }. No existe ningún
// `.code`: leerlo dejaba el código pelado en pantalla y tiraba justo la línea
// que dice qué revisar.
function detalleError(res) {
  return [res.error, res.message].filter(Boolean).join(': ');
}

let entregaEnCurso = Promise.resolve();

function enFila(tarea) {
  const turno = entregaEnCurso.then(tarea, tarea);

  // La cola no se puede cortar porque una llamada previa haya fallado.
  entregaEnCurso = turno.then(() => {}, () => {});

  return turno;
}

function mb(bytes) {
  if (!Number.isInteger(bytes) || bytes <= 0) return 'sin tope';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fichaEntrega(info, upload) {
  // Sin formulario no hay límites que leer. Reportar "sin tope" ahí sería
  // inventar: lo que pasa es que el portal no mostró nada.
  if (!info.puedeEntregar) {
    return 'Ventana:   CERRADA — el portal no rinde el formulario de entrega.\n'
      + '           Sus límites y formatos no se pueden leer hasta que vuelva a abrir.';
  }

  const formatos = info.acceptedTypes?.length
    ? upload.describeAcceptedTypes(info.acceptedTypes)
    : 'cualquier formato';

  const recibe = [
    info.aceptaArchivos ? 'archivos' : null,
    info.aceptaTexto ? 'texto en línea' : null,
  ].filter(Boolean).join(' y ') || 'nada';

  return [
    `Ventana:   ${info.puedeEntregar ? 'ABIERTA — el portal acepta entregas ahora' : 'CERRADA — el portal no rinde el formulario'}`,
    `Recibe:    ${recibe}`,
    `Formatos:  ${formatos}`,
    `Tamaño:    hasta ${mb(info.maxBytes)} por archivo`,
    `Archivos:  hasta ${Number.isInteger(info.maxFiles) && info.maxFiles > 0 ? info.maxFiles : 'sin tope'}`,
    info.archivosEnBorrador?.length
      ? `Ya subido: ${info.archivosEnBorrador.join(', ')}`
      : 'Ya subido: nada',
    info.requiereDeclaracion ? 'Pide declaración de autoría al enviar.' : null,
  ].filter(Boolean).join('\n');
}

tool(
  'dvpotro_entregar',
  'Consulta qué acepta una actividad de iVirtual y, si se lo confirmás, SUBE el archivo como entrega. Es la única tool que ESCRIBE en el portal: todas las demás solo leen. Sin `archivo` responde qué formatos acepta, cuánto pesa el tope, cuántos archivos admite y si la ventana sigue abierta. Con `archivo` pero sin `confirmar:true` valida y reporta sin subir nada. LENTO: abre un navegador, ~20-40 s.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id exacto que devuelve dvpotro_actividades.' },
      nombre: { type: 'string', description: 'Alternativa al id: parte del nombre de la actividad.' },
      archivo: {
        type: 'string',
        description: 'Ruta absoluta del archivo a entregar. Sin esto solo informa qué acepta la actividad.',
      },
      confirmar: {
        type: 'boolean',
        description: 'Sin esto NO sube nada. Según cómo esté configurada la actividad, subir puede quedar como entrega FINAL enviada a calificar, que ya no se edita. Ponelo en true solo con el visto bueno explícito del alumno.',
      },
      reemplazar: {
        type: 'boolean',
        description: 'Seguir aunque la actividad ya tenga algo entregado. Si el nombre coincide con un archivo ya entregado, lo PISA y no se recupera.',
      },
    },
  },
  async ({ id, nombre, archivo, confirmar = false, reemplazar = false }) => enFila(async () => {
    const encontrada = unaActividad({ id, nombre });
    if (encontrada.fallo) return encontrada.fallo;

    const { a } = encontrada;
    if (!a.url) return `La actividad [${a.id}] no tiene URL de iVirtual en la caché; no hay a dónde entregar.`;

    if (archivo !== undefined) {
      if (!path.isAbsolute(archivo)) return `\`archivo\` tiene que ser una ruta absoluta. Llegó: ${archivo}`;
      if (!fs.existsSync(archivo)) return `No existe el archivo: ${archivo}`;
    }

    prepararHandlers();

    const faltan = ['IVIRTUAL_USER', 'IVIRTUAL_PASS'].filter((v) => !process.env[v]);
    if (faltan.length) {
      return `Faltan credenciales para entrar a iVirtual: ${faltan.join(', ')}. Configuralas en Ajustes de DVPotro.`;
    }

    const upload = require(path.join(REPO, 'electron', 'handlers', 'assignment-upload.js'));

    const cabecera = [
      encontrada.cabecera,
      '',
      `# ${a.nombre}`,
      `${a.materia} · ${a.profesor || 'sin profesor en caché'}`,
      `Caché: ${a.estado} · vence ${a.fechaLimite || 'sin fecha'}`,
      '',
    ];

    try {
      const info = await upload.getUploadInfo(a.url);

      if (!info.success) {
        return [...cabecera, `No se pudo leer el formulario de entrega: ${detalleError(info)}`].join('\n');
      }

      const bloques = [...cabecera, '## Qué pide esta actividad', fichaEntrega(info, upload)];

      // Sin archivo la pregunta era "¿qué acepta y hasta cuándo?": ya está contestada.
      if (archivo === undefined) {
        bloques.push(
          '',
          info.puedeEntregar
            ? 'Para entregar: volvé a llamarme con `archivo` (ruta absoluta) y, si querés que suba de verdad, `confirmar:true`.'
            : 'El portal no está aceptando entregas para esta actividad.',
        );
        return bloques.join('\n');
      }

      const kb = Math.round(fs.statSync(archivo).size / 1024);
      bloques.push('', '## Archivo', `${archivo}`, `${kb} KB · sube como ${path.basename(archivo)}`);

      const problemas = upload.validateFiles([archivo], info);

      if (!info.puedeEntregar) {
        problemas.unshift('El portal no rinde el formulario de entrega: la ventana está cerrada.');
      }

      if (!info.aceptaArchivos) {
        problemas.unshift('Esta actividad no recibe archivos.');
      }

      // El handler ya frena si se pasa de `maxFiles`; esto es distinto: avisa que
      // hay algo entregado aunque quepan más archivos.
      //
      // Y hay dos desenlaces muy distintos según el nombre: `attachSingleFile`
      // confirma el diálogo de Moodle con Overwrite, así que un nombre repetido
      // DESTRUYE el archivo ya entregado, mientras que uno nuevo se suma.
      const pisaria = (info.archivosEnBorrador || []).filter((n) => n === path.basename(archivo));

      if (info.archivosEnBorrador?.length && !reemplazar) {
        problemas.push(
          pisaria.length
            ? `Ya hay entregado un archivo con ESE MISMO nombre (${pisaria.join(', ')}) y subir lo PISA sin vuelta atrás. Pedilo con reemplazar:true solo si es lo que querés.`
            : `Ya hay algo entregado (${info.archivosEnBorrador.join(', ')}) y subir AGREGA otro archivo. Pedilo con reemplazar:true si es lo que querés.`,
        );
      }

      if (problemas.length) {
        return [...bloques, '', '## NO SE PUEDE ENTREGAR ASÍ', ...problemas.map((p) => `- ${p}`)].join('\n');
      }

      if (!confirmar) {
        return [
          ...bloques,
          '',
          '## ENSAYO — no se subió nada',
          'Pasa todas las validaciones contra el formulario real del portal.',
          // Esta es la única pantalla de consentimiento del camino MCP. Con
          // `submissiondrafts` desactivado —la configuración más común— el
          // guardado ES la entrega enviada a calificar, y ya no se edita.
          'Ojo: según cómo esté configurada la actividad, esto puede quedar como entrega FINAL',
          'enviada a calificar. Pedile el OK explícito al alumno antes de mandar confirmar:true.',
          pisaria.length ? `Y pisaría ${pisaria.join(', ')}, que ya está entregado.` : '',
          '',
          'Para subirlo, volvé a llamarme con confirmar:true.',
        ].filter(Boolean).join('\n');
      }

      const res = await upload.uploadFiles(a.url, [archivo]);

      if (!res.success) {
        // UPLOAD_NOT_CONFIRMED no significa "no se subió": significa que el
        // portal no lo mostró donde se lo esperaba. Titularlo como fallo invita
        // a reintentar, y un reintento a ciegas puede pisar lo que sí entró.
        const incierto = res.error === 'UPLOAD_NOT_CONFIRMED';

        return [
          ...bloques,
          '',
          incierto ? '## NO SE PUDO CONFIRMAR' : '## NO SE ENTREGÓ',
          detalleError(res),
          incierto ? '\nPuede haber quedado subido. Mirá la actividad en el portal ANTES de reintentar.' : '',
        ].filter(Boolean).join('\n');
      }

      return [
        ...bloques,
        '',
        '## ENTREGADO',
        `Estado en el portal: ${res.textoEstado || res.estado}`,
        `Archivos en la entrega: ${(res.archivos || []).join(', ') || 'el portal no los lista'}`,
        // Con `submissiondrafts` activado, "Save changes" deja borrador y el
        // profesor NO lo ve. Hay que decirlo fuerte: el alumno cree que entregó.
        res.estado === 'borrador'
          ? '\nATENCIÓN: quedó como BORRADOR. El profesor todavía NO lo ve como entregado. Terminá de enviarlo desde la app o el portal.'
          : '',
        '\nLa caché quedó vieja: corré dvpotro_sync con modulo:"actividades" para que la app lo refleje.',
      ].filter(Boolean).join('\n');
    } finally {
      // El handler deja un timer de cierre ocioso. En la app eso reusa el
      // navegador entre clicks; acá mantendría vivo el proceso del MCP.
      await upload.closeSession('mcp').catch(() => {});
    }
  }),
);


tool(
  'dvpotro_quitar_archivo',
  'Saca UN archivo de la entrega de una actividad en iVirtual. Es el complemento de dvpotro_entregar: con un nombre nuevo Moodle SUMA el archivo en vez de reemplazarlo, así que sin esto un archivo equivocado solo se sacaba entrando al portal a mano. Sin `confirmar:true` solo lista qué hay subido. ESCRIBE EN EL PORTAL.',
  {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id exacto que devuelve dvpotro_actividades.' },
      nombre: { type: 'string', description: 'Alternativa al id: parte del nombre de la actividad.' },
      archivo: {
        type: 'string',
        description: 'Nombre EXACTO del archivo a sacar, tal como figura en la entrega. Sin esto solo lista.',
      },
      confirmar: {
        type: 'boolean',
        description: 'Sin esto NO saca nada. Ponelo en true solo con el visto bueno explícito del alumno.',
      },
    },
  },
  async ({ id, nombre, archivo, confirmar = false }) => enFila(async () => {
    const encontrada = unaActividad({ id, nombre });
    if (encontrada.fallo) return encontrada.fallo;

    const { a } = encontrada;
    if (!a.url) return `La actividad [${a.id}] no tiene URL de iVirtual en la caché.`;

    prepararHandlers();

    const faltan = ['IVIRTUAL_USER', 'IVIRTUAL_PASS'].filter((v) => !process.env[v]);
    if (faltan.length) {
      return `Faltan credenciales para entrar a iVirtual: ${faltan.join(', ')}. Configuralas en Ajustes de DVPotro.`;
    }

    const upload = require(path.join(REPO, 'electron', 'handlers', 'assignment-upload.js'));

    const cabecera = [
      encontrada.cabecera,
      '',
      `# Quitar archivo de "${a.nombre}"`,
      `${a.materia} · ${a.profesor || 'sin profesor en caché'}`,
      '',
    ];

    try {
      const info = await upload.getUploadInfo(a.url);

      if (!info.success) {
        return [...cabecera, `No se pudo leer el formulario de entrega: ${detalleError(info)}`].join('\n');
      }

      const subidos = info.archivosEnBorrador || [];

      if (!info.puedeEntregar) {
        return [...cabecera, 'La ventana está cerrada: el portal no deja editar esta entrega.'].join('\n');
      }

      if (!subidos.length) {
        return [...cabecera, 'No hay ningún archivo en esta entrega; no hay nada que sacar.'].join('\n');
      }

      const listado = subidos.map((n) => `- ${n}`).join('\n');

      if (!archivo) {
        return [...cabecera, `## Archivos en la entrega (${subidos.length})`, listado, '', 'Pasá `archivo` con el nombre EXACTO del que querés sacar.'].join('\n');
      }

      // Nombre exacto y nada de matcheo parcial: acá un "el PDF ese" que matchea
      // de más saca el archivo bueno, y lo que se pierde es una entrega.
      if (!subidos.includes(archivo)) {
        return [...cabecera, `"${archivo}" no está en la entrega. Lo que hay es:`, listado].join('\n');
      }

      // Si la actividad ya tiene nota, lo que hay arriba ya lo miró el profesor.
      const nota = Number(String(a.rawGrade || '').replace(',', '.'));
      if (Number.isFinite(nota)) {
        return [...cabecera, `Esta actividad ya está calificada (${a.rawGrade}). No la toco: sacar el archivo ahora no cambia la nota y sí te deja sin el respaldo.`].join('\n');
      }

      const quedaVacia = subidos.length === 1;

      if (!confirmar) {
        return [
          ...cabecera,
          `## ENSAYO — no se sacó nada`,
          `Sacaría: ${archivo}`,
          `Quedarían ${subidos.length - 1} archivo(s) en la entrega.`,
          // Una entrega sin archivos pero marcada "Submitted for grading" es
          // peor que no haber entregado: el profesor la abre y no hay nada.
          quedaVacia
            ? '\nATENCIÓN: es el único archivo. La entrega quedaría VACÍA pero seguiría marcada como enviada, que es peor que no haber entregado. Si lo que querés es cambiarlo, usá dvpotro_entregar con el archivo nuevo (y reemplazar:true si se llama igual) en vez de sacar este.'
            : '',
          '',
          'Para sacarlo, volvé a llamarme con confirmar:true.',
        ].filter(Boolean).join('\n');
      }

      const res = await upload.removeDraftFile(a.url, archivo);

      if (!res.success) {
        return [...cabecera, '## NO SE SACÓ', detalleError(res)].join('\n');
      }

      return [
        ...cabecera,
        '## SACADO',
        `Quitado: ${archivo}`,
        `Quedan en la entrega: ${(res.archivosEnBorrador || []).join(', ') || 'nada'}`,
        quedaVacia ? '\nLa entrega quedó SIN archivos. Subí el que corresponda con dvpotro_entregar antes de que cierre la ventana.' : '',
        '\nLa caché quedó vieja: corré dvpotro_sync con modulo:"actividades".',
      ].filter(Boolean).join('\n');
    } finally {
      await upload.closeSession('mcp').catch(() => {});
    }
  }),
);

// ---------------------------------------------------------------------------
// Transporte MCP (JSON-RPC 2.0 por stdio, mensajes separados por \n)
// ---------------------------------------------------------------------------

// stdout es EL CANAL DEL PROTOCOLO: cualquier console.log suelto corrompe la
// sesión y el cliente desconecta sin explicar por qué. Todo lo humano va a
// stderr.
const log = (...args) => console.error('[dvpotro-mcp]', ...args);

function enviar(mensaje) {
  // El write REAL, capturado antes del secuestro: `process.stdout.write` ahora
  // apunta a stderr para que nada ajeno contamine el canal.
  escribirProtocolo(`${JSON.stringify(mensaje)}\n`);
}

function responder(id, result) {
  enviar({ jsonrpc: '2.0', id, result });
}

function fallar(id, code, message) {
  enviar({ jsonrpc: '2.0', id, error: { code, message } });
}

function manejar(msg) {
  const { id, method, params } = msg;

  // Las notificaciones (sin id) no llevan respuesta. Contestarlas es un error
  // de protocolo.
  if (id === undefined || id === null) return;

  if (method === 'initialize') {
    responder(id, {
      // Se devuelve la versión que pidió el cliente cuando la manda: negociar
      // hacia abajo es más compatible que imponer una.
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'dvpotro', version: '1.0.0' },
    });
    return;
  }

  if (method === 'ping') {
    responder(id, {});
    return;
  }

  if (method === 'tools/list') {
    responder(id, {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    });
    return;
  }

  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name);

    if (!tool) {
      fallar(id, -32602, `Tool desconocida: ${params?.name}`);
      return;
    }

    // Los handlers de lectura son síncronos, pero `dvpotro_sync` tarda ~40s
    // scrapeando. `Promise.resolve` cubre los dos casos sin bloquear el bucle:
    // mientras un scrape corre, el servidor sigue contestando otras llamadas.
    Promise.resolve()
      .then(() => tool.handler(params.arguments || {}))
      .then((texto) => {
        responder(id, { content: [{ type: 'text', text: String(texto) }] });
      })
      .catch((error) => {
        // Se responde como resultado con isError y no como error de JSON-RPC:
        // así el cliente ve QUÉ falló en vez de un error de transporte opaco.
        log('fallo en', params?.name, error?.stack || error);
        responder(id, {
          content: [{ type: 'text', text: `Error ejecutando ${params?.name}: ${error?.message || error}` }],
          isError: true,
        });
      });

    return;
  }

  fallar(id, -32601, `Método no soportado: ${method}`);
}

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;

  // Un chunk puede traer varios mensajes o cortar uno por la mitad: se procesa
  // por líneas completas y lo que sobra queda para el próximo chunk.
  let corte = buffer.indexOf('\n');

  while (corte !== -1) {
    const linea = buffer.slice(0, corte).trim();
    buffer = buffer.slice(corte + 1);

    if (linea) {
      try {
        manejar(JSON.parse(linea));
      } catch (error) {
        log('mensaje ilegible:', error?.message);
      }
    }

    corte = buffer.indexOf('\n');
  }
});

process.stdin.on('end', () => process.exit(0));

log(`leyendo de ${USER_DATA}`);
