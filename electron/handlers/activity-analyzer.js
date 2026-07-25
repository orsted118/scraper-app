// Analizador de consignas: extrae requisitos de una actividad con un LLM y
// verifica una entrega local contra ellos. Read-only respecto del scraper — no
// toca ni el shape ni el caché de actividades.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const llm = require('../llm');

const CACHE_DIR_NAME = 'activity-analysis';
const REQUIREMENTS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Cap del texto que viaja al LLM. ~4 chars por token: 16k chars ≈ 4k tokens,
// que es lo que tolera el modelo más chico del pool sin recortar la respuesta.
const MAX_SUBMISSION_CHARS = 16000;

const SUPPORTED_EXTENSIONS = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const EXTRACT_SYSTEM_PROMPT = `Extraés los requisitos de una consigna académica del ITSON. Respondés SOLO con
JSON válido. Formato exacto:
{
  "requirements": [
    {
      "id": "req-1",
      "description": "descripción del requisito en español, corta y accionable",
      "type": "format" | "content" | "structure" | "length" | "other",
      "criteria": "cómo verificar cumplimiento (una frase concreta)"
    }
  ]
}`;

const VERIFY_SYSTEM_PROMPT = `Verificás si una entrega académica cumple con requisitos dados. Sé estricto pero
justo. Respondés SOLO con JSON válido:
{
  "results": [
    {
      "requirementId": "req-N",
      "met": "yes" | "no" | "partial" | "unclear",
      "confidence": 0.0-1.0,
      "notes": "razón breve en español"
    }
  ]
}`;

function getCacheDir() {
  return path.join(app.getPath('userData'), CACHE_DIR_NAME);
}

// El id del scraper es "N-cursoId-M"; igual se sanea porque llega desde el
// renderer y termina siendo un nombre de archivo.
function getCachePath(activityId) {
  const safeId = String(activityId || 'sin-id').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getCacheDir(), `${safeId}.json`);
}

function readCache(activityId) {
  try {
    const cachePath = getCachePath(activityId);
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (error) {
    console.error('[activity-analyzer] no se pudo leer el caché:', error?.message);
    return null;
  }
}

function writeCache(activityId, data) {
  try {
    fs.mkdirSync(getCacheDir(), { recursive: true });
    fs.writeFileSync(getCachePath(activityId), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[activity-analyzer] no se pudo escribir el caché:', error?.message);
    return false;
  }
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function normalizeRequirements(raw) {
  const list = Array.isArray(raw?.requirements) ? raw.requirements : [];

  return list
    .filter((item) => item && (item.description || item.criteria))
    .map((item, index) => ({
      id: String(item.id || `req-${index + 1}`),
      description: String(item.description || '').trim(),
      type: ['format', 'content', 'structure', 'length', 'other'].includes(item.type) ? item.type : 'other',
      criteria: String(item.criteria || '').trim(),
    }));
}

// El scraper entrega `nombre` e `instrucciones`; se aceptan titulo/descripcion
// por si la actividad llega desde otra fuente (mock, deep-link).
function getActivityTitle(activity) {
  return String(activity?.nombre || activity?.titulo || '').trim();
}

function getActivityInstructions(activity) {
  return String(activity?.instrucciones || activity?.descripcion || '').trim();
}

async function extractRequirements(activity) {
  const activityId = activity?.id;

  if (!activityId) {
    throw new Error('La actividad no tiene id: no se puede analizar ni cachear.');
  }

  const cached = readCache(activityId);
  const isFresh = cached?.requirements && Date.now() - (cached.requirementsAt || 0) < REQUIREMENTS_TTL_MS;

  if (isFresh) {
    console.log(`[activity-analyzer] cache hit de requisitos para ${activityId}`);
    return { requirements: cached.requirements, fromCache: true, model: cached.requirementsModel || null };
  }

  const title = getActivityTitle(activity);
  const instructions = getActivityInstructions(activity);

  if (!instructions && !title) {
    throw new Error('La actividad no tiene título ni instrucciones para analizar.');
  }

  const userPrompt = [
    `Título: ${title || '(sin título)'}`,
    activity?.materia ? `Materia: ${activity.materia}` : null,
    activity?.modalidad ? `Modalidad: ${activity.modalidad}` : null,
    '',
    'Consigna:',
    instructions || '(la actividad no trae instrucciones; deduce los requisitos del título)',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const { data, raw } = await llm.chatJson(
    [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { task: 'extraction', maxTokens: 2000, temperature: 0.2 },
  );

  const requirements = normalizeRequirements(data);

  if (requirements.length === 0) {
    throw new Error('El modelo no devolvió requisitos utilizables para esta consigna.');
  }

  writeCache(activityId, {
    ...(cached || {}),
    activityId,
    requirements,
    requirementsAt: Date.now(),
    requirementsModel: raw.model,
  });

  return { requirements, fromCache: false, model: raw.model };
}

function countWords(text) {
  const trimmed = String(text || '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

async function parseSubmission(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('No se encontró el archivo de la entrega.');
  }

  const extension = path.extname(filePath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS[extension]) {
    throw new Error(`Formato no soportado en Fase 1: ${extension || 'sin extensión'}`);
  }

  const stats = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);

  let text = '';
  let pageCount = null;

  try {
    if (extension === '.pdf') {
      // Import directo del lib: el index de pdf-parse corre un archivo de debug
      // al cargarse si no encuentra su PDF de prueba.
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
      pageCount = parsed.numpages ?? null;
    } else {
      const mammoth = require('mammoth');
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value || '';
    }
  } catch (error) {
    throw new Error(`No se pudo leer el ${extension.slice(1).toUpperCase()}: ${error?.message || 'archivo dañado'}`);
  }

  if (!text.trim()) {
    throw new Error('El archivo no tiene texto extraíble (¿es un PDF escaneado?).');
  }

  return {
    text,
    pageCount,
    wordCount: countWords(text),
    extension,
    mime: SUPPORTED_EXTENSIONS[extension],
    sizeBytes: stats.size,
  };
}

function normalizeVerification(raw, requirements) {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  const byId = new Map(results.map((item) => [String(item?.requirementId), item]));

  // Se recorre la lista de requisitos, no la respuesta: si el modelo omite uno
  // queda como 'unclear' en vez de desaparecer del checklist.
  return requirements.map((requirement) => {
    const match = byId.get(requirement.id);
    const met = ['yes', 'no', 'partial', 'unclear'].includes(match?.met) ? match.met : 'unclear';
    const confidence = Number(match?.confidence);

    return {
      requirementId: requirement.id,
      met,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
      notes: String(match?.notes || (match ? '' : 'El modelo no evaluó este requisito.')).trim(),
    };
  });
}

async function verifySubmission(requirements, submissionData, activityId = null) {
  const list = Array.isArray(requirements) ? requirements : [];

  if (list.length === 0) {
    throw new Error('No hay requisitos contra los cuales verificar la entrega.');
  }

  if (!submissionData?.text) {
    throw new Error('La entrega no tiene texto para verificar.');
  }

  const submissionHash = hashText(submissionData.text);
  const cached = activityId ? readCache(activityId) : null;
  const previous = (cached?.verifications || []).find((entry) => entry.submissionHash === submissionHash);

  if (previous) {
    console.log(`[activity-analyzer] cache hit de verificación para ${activityId}`);
    return { results: previous.results, fromCache: true, model: previous.model || null };
  }

  const excerpt = submissionData.text.slice(0, MAX_SUBMISSION_CHARS);
  const truncated = submissionData.text.length > MAX_SUBMISSION_CHARS;

  const userPrompt = [
    'REQUISITOS:',
    ...list.map((item) => `- ${item.id} [${item.type}] ${item.description} | Criterio: ${item.criteria}`),
    '',
    'ENTREGA:',
    `Formato: ${submissionData.extension} · ${submissionData.wordCount} palabras${
      submissionData.pageCount ? ` · ${submissionData.pageCount} páginas` : ''
    }`,
    truncated ? `(texto recortado a los primeros ${MAX_SUBMISSION_CHARS} caracteres)` : '',
    '',
    excerpt,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, raw } = await llm.chatJson(
    [
      { role: 'system', content: VERIFY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { task: 'verification', maxTokens: 2500, temperature: 0.1 },
  );

  const results = normalizeVerification(data, list);

  if (activityId) {
    const verifications = (cached?.verifications || []).filter((entry) => entry.submissionHash !== submissionHash);
    verifications.unshift({
      submissionHash,
      results,
      model: raw.model,
      at: Date.now(),
      meta: {
        extension: submissionData.extension,
        wordCount: submissionData.wordCount,
        pageCount: submissionData.pageCount,
      },
    });

    writeCache(activityId, {
      ...(cached || {}),
      activityId,
      // Las 10 últimas alcanzan para reabrir entregas recientes sin que el JSON crezca sin techo.
      verifications: verifications.slice(0, 10),
    });
  }

  return { results, fromCache: false, model: raw.model };
}

// El renderer no puede leer del disco: manda el contenido y acá se materializa
// en un temporal que se borra al terminar.
async function parseSubmissionPayload({ filePath, arrayBuffer, filename }) {
  if (filePath) {
    return parseSubmission(filePath);
  }

  if (!arrayBuffer) {
    throw new Error('No se recibió ningún archivo para analizar.');
  }

  const extension = path.extname(filename || '').toLowerCase();

  if (!SUPPORTED_EXTENSIONS[extension]) {
    throw new Error(`Formato no soportado en Fase 1: ${extension || 'sin extensión'}`);
  }

  const tempDir = path.join(app.getPath('temp'), 'dvpotro-submissions');
  fs.mkdirSync(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`);

  try {
    fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
    return await parseSubmission(tempPath);
  } finally {
    fs.promises.unlink(tempPath).catch(() => {});
  }
}

function registerActivityAnalyzerHandlers() {
  ipcMain.handle('activity-analyzer:extract-requirements', async (_event, activity) => {
    try {
      return { ok: true, ...(await extractRequirements(activity || {})) };
    } catch (error) {
      console.error('[activity-analyzer] extract falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible analizar la consigna.' };
    }
  });

  ipcMain.handle('activity-analyzer:parse-file', async (_event, payload) => {
    try {
      return { ok: true, submission: await parseSubmissionPayload(payload || {}) };
    } catch (error) {
      console.error('[activity-analyzer] parse falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible leer el archivo.' };
    }
  });

  ipcMain.handle('activity-analyzer:verify-submission', async (_event, payload) => {
    try {
      const { requirements, submissionData, activityId } = payload || {};
      return { ok: true, ...(await verifySubmission(requirements, submissionData, activityId)) };
    } catch (error) {
      console.error('[activity-analyzer] verify falló:', error?.message);
      return { ok: false, error: error?.message || 'No fue posible verificar la entrega.' };
    }
  });
}

module.exports = {
  extractRequirements,
  parseSubmission,
  parseSubmissionPayload,
  registerActivityAnalyzerHandlers,
  verifySubmission,
};
