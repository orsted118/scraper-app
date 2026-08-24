// Instructor lookup — el scraper del horario tira el único instructor real
// (PeopleSoft `CLASS_MTG_VW`). Actividades (iVirtual) y calificaciones (CIA)
// llegan sin profesor; este módulo los enriquece contra el cache del horario.
//
// Estrategia:
//   1. Match por código exacto — cuando la fuente aporta código (CIA `codigo`,
//      Horario `codigo`), es el único match confiable.
//   2. Match por nombre normalizado — para actividades de iVirtual, que solo
//      traen un string libre como `materia`. Normalización agresiva: sin
//      acentos, uppercase, sin puntuación, sin tokens ruido comunes ("Grupo",
//      "Optativa", números romanos, sufijos de sección).
//   3. Si nada matchea, string vacío. La UI ya sabe manejar "sin profesor".

// Palabras que aparecen en ambos lados y sesgan el match falso positivo.
const NOISE_TOKENS = new Set([
  'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN', 'A',
  'GRUPO', 'GPO', 'OPTATIVA', 'BASICA', 'BASICO',
  'I', 'II', 'III', 'IV', 'V', 'VI',
]);

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function normalizeSubjectName(value) {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !NOISE_TOKENS.has(token))
    .join(' ')
    .trim();
}

function normalizeCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

// Construye índices O(1) para los dos caminos de matching. Aceptar tanto el
// array pelado de materias como el envelope { materias, timestamp } que devuelve
// readHorarioCache — simplifica llamar desde ambos lados.
function buildInstructorIndex(source) {
  const materias = Array.isArray(source)
    ? source
    : Array.isArray(source?.materias)
    ? source.materias
    : [];

  const byCode = new Map();
  const byName = new Map();

  materias.forEach((materia) => {
    const instructor = String(materia?.instructor || '').trim();
    // "Personal" es el placeholder de PeopleSoft cuando no hay asignación real
    // (visto en la cache del usuario) — no lo propagamos.
    if (!instructor || instructor.toLowerCase() === 'personal') {
      return;
    }

    const code = normalizeCode(materia?.codigo);
    if (code && !byCode.has(code)) {
      byCode.set(code, instructor);
    }

    const name = normalizeSubjectName(materia?.nombre);
    if (name && !byName.has(name)) {
      byName.set(name, instructor);
    }
  });

  return { byCode, byName };
}

function lookupInstructor(index, { codigo, nombre } = {}) {
  if (!index) return '';

  const code = normalizeCode(codigo);
  if (code && index.byCode.has(code)) {
    return index.byCode.get(code);
  }

  const name = normalizeSubjectName(nombre);
  if (name && index.byName.has(name)) {
    return index.byName.get(name);
  }

  return '';
}

module.exports = {
  buildInstructorIndex,
  lookupInstructor,
  normalizeCode,
  normalizeSubjectName,
};
