// Formato y agrupación de sesiones de clase. Sin React: lo usan la lista, el
// detalle y el panel en vivo, y así se puede razonar sin montar nada.

export function minutoSegundo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function horaLegible(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function fechaLegible(ms) {
  if (!ms) return 'sin fecha';
  return new Date(ms).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// En una sesión unida `fin - inicio` incluye los recesos: por eso se muestra el
// rango de reloj además de los minutos, para que nadie lea 79 min como 79 min
// de audio.
//
// Sin `fin` la sesión nunca se cerró (la en vivo no llega a la lista, así que
// acá es siempre un cierre sucio): solo se sabe cuándo empezó.
export function rangoHorario(sesion) {
  if (!sesion.fin) return `desde las ${horaLegible(sesion.inicio)}`;
  return `${horaLegible(sesion.inicio)}–${horaLegible(sesion.fin)}`;
}

export function duracionLegible(sesion) {
  if (!sesion.inicio || !sesion.fin) return null;
  return `${Math.round((sesion.fin - sesion.inicio) / 60000)} min`;
}

// Accent-insensitive: "asincrono" tiene que encontrar "asíncrono" en el
// transcript. Mismo truco que `norm` en dvpotro-mcp.js — duplicado porque son
// dos runtimes distintos (Node suelto vs. bundle de Vite).
export function normalizar(valor = '') {
  return String(valor).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function incluye(texto, termino) {
  return normalizar(texto).includes(normalizar(termino));
}

// Dónde cae el término DENTRO del texto original. No alcanza con un indexOf en
// minúsculas: la búsqueda ignora acentos, así que "asincrono" encontraba la
// línea con "asíncrono" pero el resaltado no la marcaba. Se normaliza letra por
// letra guardando de qué posición original salió cada una.
export function rangoCoincidencia(texto, termino) {
  const objetivo = normalizar(termino);
  if (!objetivo) return null;

  let plano = '';
  const origen = [];

  for (let i = 0; i < texto.length; i += 1) {
    const pedazo = normalizar(texto[i]);

    for (let k = 0; k < pedazo.length; k += 1) {
      plano += pedazo[k];
      origen.push(i);
    }
  }

  const posicion = plano.indexOf(objetivo);
  if (posicion === -1) return null;

  return [origen[posicion], origen[posicion + objetivo.length - 1] + 1];
}

export function claveMateria(materia) {
  return materia?.clave || materia?.codigo || materia?.nombre || '';
}

export function nombreMateria(materia) {
  return materia?.nombre || materia?.clave || null;
}

export function etiquetaSesion(sesion) {
  return sesion?.titulo || nombreMateria(sesion?.materia) || 'Clase sin título';
}

// El horario trae una fila por materia con sus sesiones adentro; el Map es un
// cerco contra duplicados si algún ciclo viejo repite código. El profesor viene
// como `instructor` desde CIA: leer solo `profesor` lo dejaba siempre en null.
export function materiasUnicas(materias) {
  if (!Array.isArray(materias)) return [];

  const vistas = new Map();

  for (const materia of materias) {
    const clave = materia?.codigo || materia?.clave || materia?.nombre;
    if (!clave || vistas.has(clave)) continue;

    // Mismo shape que `claseActual()` en el main process, con el resto en null
    // y no ausente: una materia elegida a mano y una detectada se ven iguales
    // en meta.json.
    vistas.set(clave, {
      clave,
      nombre: materia?.nombre || clave,
      profesor: materia?.profesor || materia?.instructor || null,
      horaInicio: null,
      horaFin: null,
      modalidad: null,
    });
  }

  return Array.from(vistas.values());
}

// Opciones del selector de materia. La materia que la sesión YA tiene entra
// aunque no esté en el horario de este ciclo: sin eso el select la mostraba
// como "Sin materia" y guardar la borraba sin que nadie lo pidiera.
export function opcionesMateria(disponibles, actual = null) {
  const opciones = disponibles.map((materia) => ({ valor: materia.clave, nombre: materia.nombre, materia }));
  const valorActual = claveMateria(actual);

  if (valorActual && !opciones.some((opcion) => opcion.valor === valorActual)) {
    opciones.unshift({ valor: valorActual, nombre: nombreMateria(actual), materia: actual });
  }

  return opciones;
}

function inicioDelDia(ms) {
  const dia = new Date(ms);
  dia.setHours(0, 0, 0, 0);
  return dia.getTime();
}

function tituloDelDia(inicioDia, hoy) {
  const dias = Math.round((hoy - inicioDia) / 86400000);

  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';

  return new Date(inicioDia).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Espera las sesiones ordenadas de la más nueva a la más vieja, que es como las
// devuelve el main process, y respeta ese orden dentro de cada día.
export function agruparPorDia(sesiones, ahora = Date.now()) {
  const hoy = inicioDelDia(ahora);
  const grupos = new Map();

  for (const sesion of sesiones) {
    const dia = sesion.inicio ? inicioDelDia(sesion.inicio) : 0;

    if (!grupos.has(dia)) {
      grupos.set(dia, { clave: String(dia), titulo: dia ? tituloDelDia(dia, hoy) : 'Sin fecha', sesiones: [] });
    }

    grupos.get(dia).sesiones.push(sesion);
  }

  return Array.from(grupos.values());
}

// Una clase cortada por un receso deja dos grabaciones seguidas el mismo día.
// Se sugiere unirlas cuando la pausa es corta y ninguna contradice a la otra en
// materia; la decisión sigue siendo del usuario, esto solo la pone a mano.
const PAUSA_MAXIMA_MIN = 45;

export function sugerenciasDeUnion(sesiones) {
  const cronologicas = sesiones
    .filter((sesion) => sesion.inicio && sesion.estado !== 'grabando')
    .sort((a, b) => a.inicio - b.inicio);

  const sugerencias = new Map();

  for (let i = 1; i < cronologicas.length; i += 1) {
    const anterior = cronologicas[i - 1];
    const sesion = cronologicas[i];

    if (!anterior.fin || inicioDelDia(anterior.inicio) !== inicioDelDia(sesion.inicio)) continue;

    const pausaMin = Math.round((sesion.inicio - anterior.fin) / 60000);
    if (pausaMin < 0 || pausaMin > PAUSA_MAXIMA_MIN) continue;

    const claveAnterior = claveMateria(anterior.materia);
    const claveSesion = claveMateria(sesion.materia);
    if (claveAnterior && claveSesion && claveAnterior !== claveSesion) continue;

    sugerencias.set(sesion.id, { base: anterior, pausaMin });
  }

  return sugerencias;
}

// Captura más cercana a un momento de la clase, sin pasarse: lo que estaba en
// pantalla cuando se dijo algo es la última captura ANTES de ese segundo.
export function capturaEn(capturas, segundo) {
  let elegida = -1;

  for (let i = 0; i < capturas.length; i += 1) {
    if (capturas[i].segundo > segundo) break;
    elegida = i;
  }

  return elegida === -1 && capturas.length ? 0 : elegida;
}

// Línea de la transcripción que estaba sonando en un segundo dado.
export function lineaEn(lineas, segundo) {
  let elegida = null;

  for (const linea of lineas) {
    if (linea.inicio > segundo) break;
    elegida = linea;
  }

  return elegida || lineas[0] || null;
}
