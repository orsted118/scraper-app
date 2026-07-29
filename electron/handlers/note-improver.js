// Mejora la redacción de una nota con un LLM. Vive aparte de notes.js igual que
// activity-analyzer: el CRUD de notas no tiene por qué saber que existe una IA.
// Reusa el pool de electron/llm tal cual — no elige backend ni toca keys.
const { ipcMain } = require('electron');
const llm = require('../llm');

// El HTML viaja con tags porque es lo que el modelo procesa y cobra. ~4 chars
// por token: 8000 chars ≈ 2k tokens de entrada, que deja lugar de sobra para los
// 2000 de respuesta en el modelo más chico del pool.
const MAX_INPUT_CHARS = 8000;

// Contexto de dominio. Sin esto el modelo trata la jerga de la app como errores
// de tipeo: "iVirtual" y "CIA" se vuelven otra cosa, y una nota sobre una
// actividad retrasada se reescribe hablando de otro tema. Es vocabulario para
// ENTENDER lo que el usuario escribió, no material para agregar.
const APP_CONTEXT = `Contexto — dónde viven estas notas:

DVPotro es una app de escritorio para estudiantes del ITSON (Instituto Tecnológico
de Sonora, México). El usuario escribe estas notas ahí adentro, mientras cursa.

Vocabulario que puede aparecer y NO son errores de tipeo:
- iVirtual: plataforma de cursos del ITSON, de donde salen las actividades.
- CIA: portal del ITSON donde se consultan las calificaciones.
- Portal de Sistemas: portal del alumno (perfil, datos personales).
- Actividad: tarea o entrega de una materia. Estados: pendiente, retrasada,
  entregada, cerrada.
- Consigna / instrucciones: el enunciado de una actividad.
- Materia, parcial, semestre, calendario escolar: términos académicos del ITSON.
- Módulos de la app: Actividades, Horario, Calendario, Calificaciones,
  Notificaciones, Música, Notas, Ajustes.

Usá este contexto SOLO para entender de qué habla la nota y respetar los nombres
propios tal como están escritos. NUNCA agregues información de este contexto a la
nota: si el usuario no lo escribió, no va.`;

// Los tags son exactamente los que sobreviven a sanitizeNoteHtml en el renderer:
// pedirle al modelo <h1>-<h6> sería mentirle — el sanitizer los aplana a texto y
// la "estructura preservada" se perdería igual.
const SYSTEM_PROMPT = `Mejorás notas del usuario: mismo mensaje, más claro y conciso, en el MISMO idioma
del texto original.

${APP_CONTEXT}

Reglas duras:
- Devolvés SOLO el HTML mejorado. Nada de explicaciones, markdown, comentarios
  ni backticks. Ni una palabra antes o después del HTML.
- Preservás la estructura de tags del input: <p>, <div>, <ul>, <ol>, <li>,
  <strong>, <b>, <em>, <i>, <u>, <s>, <span>, <br>. Si el input tenía listas, la
  salida tiene listas. Si tenía párrafos, párrafos.
- No uses ningún otro tag. Nada de <h1>-<h6>, <table>, <a> ni <code>: se
  descartan al guardar y el usuario pierde ese contenido.
- Preservás los <span> con atributo style tal cual vienen: son el color de letra
  que el usuario eligió.
- Preservás las etiquetas <img> exactamente como aparecen — no las modifiques
  ni las quites.
- No inventás información que no esté en el texto original, ni siquiera datos
  del contexto de la app.
- Respetás los nombres propios del contexto tal cual: iVirtual, CIA, ITSON,
  DVPotro. No los expandas ni los "corrijas".
- No agregás títulos, encabezados ni saludos que el usuario no puso.
- No expandís: si dudás entre dos redacciones, elegí la más corta.`;

// Sin DOMParser en main: alcanza con sacar los tags para saber si hay prosa.
// Un HTML de solo <p><br></p> (editor vacío) tiene que contar como vacío.
function hasVisibleText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim().length > 0;
}

// El input tiene <img>: una nota que es solo una imagen no tiene prosa que
// mejorar, pero tampoco es un error del usuario que valga un toast rojo.
function hasOnlyImages(html) {
  return !hasVisibleText(html) && /<img\b/i.test(String(html || ''));
}

async function improveNote(html) {
  const input = typeof html === 'string' ? html : '';

  if (!hasVisibleText(input) || hasOnlyImages(input)) {
    return { error: 'EMPTY_INPUT' };
  }

  if (input.length > MAX_INPUT_CHARS) {
    return { error: 'TOO_LONG' };
  }

  try {
    const response = await llm.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
      // temperature más alta que la extracción pura: queremos que reescriba la
      // prosa, no que copie. Por encima de esto empieza a inventar contenido.
      { task: 'extraction', maxTokens: 2000, temperature: 0.4, handler: 'note-improver' },
    );

    return { improved: response.content, backend: response.model };
  } catch (error) {
    const message = error?.message || String(error);

    // El pool tira estos dos mensajes con texto fijo desde electron/llm/index.js.
    // Se traducen a códigos para que la UI decida el copy y no muestre el detalle
    // técnico (que incluye nombres de variables de entorno).
    if (message.startsWith('No hay ningún backend LLM')) {
      return {
        error: 'NO_BACKEND',
        message: 'No hay IA configurada. Agregá una key (por ejemplo CEREBRAS_API_KEY o GEMINI_API_KEY) al .env.',
      };
    }

    if (message.startsWith('Todos los backends LLM')) {
      console.error('[note-improver] todos los backends fallaron:', message);
      return {
        error: 'ALL_FAILED',
        message: 'La IA no respondió. Puede ser límite de cuota: probá de nuevo en un rato.',
      };
    }

    console.error('[note-improver] falló la mejora:', message);
    return { error: 'UNKNOWN', message: 'No fue posible mejorar la nota.' };
  }
}

function registerNoteImproverHandlers() {
  // Nunca tira: un throw acá viaja al renderer como "Error invoking remote
  // method" y la UI no puede distinguir falta de key de un 429.
  ipcMain.handle('notes:improve', async (_event, payload) => improveNote(payload?.html));
}

module.exports = {
  MAX_INPUT_CHARS,
  improveNote,
  registerNoteImproverHandlers,
};
