// Módulo Notas (Fase 1): notas de texto y checklist tipo Keep. CRUD completo,
// labels, colores funcionales, pin/archive/trash con papelera auto-purgada.
// Persistencia en JSON plano (mismo patrón que el resto de handlers).
const fs = require('fs');
const path = require('path');
const { app, dialog, ipcMain, net, protocol } = require('electron');

const VALID_COLORS = new Set(['neutral', 'vermillion', 'amber', 'green', 'cyan', 'purple']);
const VALID_TYPES = new Set(['text', 'checklist']);
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NOTE_IMG_SCHEME = 'dvpotro-note-img';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_NOTE = 10;
// mime → extensión (fuente de verdad del tipo, no confiar en el filename).
const MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Backstop de seguridad (la sanitización real, con allowlist DOM, ocurre en el
// renderer): quita lo peligroso aunque un JSON manipulado llegue con basura.
function sanitizeHtmlBackstop(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// Texto plano de un cuerpo HTML — para indexar la búsqueda sin tags.
function stripHtml(html) {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const DEFAULT_SETTINGS = { view: 'grid', sortBy: 'updatedAt' };

function getNotesPath() {
  return path.join(app.getPath('userData'), 'notes.json');
}

function getLabelsPath() {
  return path.join(app.getPath('userData'), 'notes-labels.json');
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'notes-settings.json');
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadNotes() {
  const parsed = readJson(getNotesPath(), []);
  if (!Array.isArray(parsed)) return [];
  // Migración silenciosa en lectura: notas viejas sin attachments toman []
  // (default en memoria; se persiste recién si la nota se actualiza).
  return parsed.map((note) => (Array.isArray(note?.attachments) ? note : { ...note, attachments: [] }));
}

function saveNotes(notes) {
  writeJson(getNotesPath(), notes);
}

function loadLabels() {
  const parsed = readJson(getLabelsPath(), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveLabels(labels) {
  writeJson(getLabelsPath(), labels);
}

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(readJson(getSettingsPath(), {}) || {}) };
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    id: item?.id || makeId(),
    text: typeof item?.text === 'string' ? item.text : '',
    done: Boolean(item?.done),
  }));
}

// Migración silenciosa: notas viejas sin attachments (o con el viejo `images`)
// entran con []. No se intenta reconstruir el shape antiguo.
function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((att) => att && typeof att.path === 'string')
    .map((att) => ({
      id: att.id || makeId(),
      filename: typeof att.filename === 'string' ? att.filename : '',
      mime: typeof att.mime === 'string' ? att.mime : '',
      size: Number.isFinite(att.size) ? att.size : 0,
      path: att.path,
      createdAt: att.createdAt || new Date().toISOString(),
    }));
}

function normalizeNote(input = {}) {
  const now = new Date().toISOString();
  const type = VALID_TYPES.has(input.type) ? input.type : 'text';
  const color = VALID_COLORS.has(input.color) ? input.color : 'neutral';

  return {
    id: input.id || makeId(),
    type,
    title: typeof input.title === 'string' ? input.title : '',
    body: sanitizeHtmlBackstop(typeof input.body === 'string' ? input.body : ''),
    items: type === 'checklist' ? sanitizeItems(input.items) : [],
    attachments: sanitizeAttachments(input.attachments),
    color,
    labels: Array.isArray(input.labels) ? input.labels.filter((l) => typeof l === 'string') : [],
    pinned: Boolean(input.pinned),
    archived: Boolean(input.archived),
    trashed: Boolean(input.trashed),
    createdAt: input.createdAt || now,
    updatedAt: now,
    deletedAt: input.deletedAt || null,
    reminder: normalizeReminder(input.reminder),
  };
}

function normalizeReminder(reminder) {
  if (!reminder || typeof reminder.at !== 'string') return null;
  if (Number.isNaN(new Date(reminder.at).getTime())) return null;
  return {
    at: reminder.at,
    fired: Boolean(reminder.fired),
    snoozedFrom: reminder.snoozedFrom || null,
  };
}

function matchesView(note, view) {
  if (note.trashed) return view === 'trashed';
  if (note.archived) return view === 'archived';
  return view === 'active';
}

function matchesFilters(note, filters = {}) {
  const { colors, labels, types, search } = filters;

  if (Array.isArray(colors) && colors.length > 0 && !colors.includes(note.color)) {
    return false;
  }

  if (Array.isArray(types) && types.length > 0 && !types.includes(note.type)) {
    return false;
  }

  if (Array.isArray(labels) && labels.length > 0 && !labels.some((l) => note.labels.includes(l))) {
    return false;
  }

  if (search && search.trim()) {
    const needle = search.trim().toLowerCase();
    const haystack = [
      note.title,
      stripHtml(note.body), // el body es HTML: buscar en su texto plano.
      ...note.items.map((i) => i.text),
      ...note.labels,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function listNotes({ view = 'active', filters = {} } = {}) {
  const settings = getSettings();
  const sortBy = ['updatedAt', 'createdAt', 'title'].includes(settings.sortBy) ? settings.sortBy : 'updatedAt';

  const compare = (a, b) => {
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
    }
    return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
  };

  return loadNotes()
    .filter((note) => matchesView(note, view))
    .filter((note) => matchesFilters(note, filters))
    .sort((a, b) => {
      // Pinned primero solo en la vista activa; el orden secundario es el elegido.
      if (view === 'active' && Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return compare(a, b);
    });
}

function getNote(id) {
  return loadNotes().find((note) => note.id === id) || null;
}

function createNote(input) {
  const notes = loadNotes();
  const note = normalizeNote(input);
  notes.push(note);
  saveNotes(notes);
  return note;
}

function updateNote(id, patch = {}) {
  const notes = loadNotes();
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) return null;

  const current = notes[index];
  const next = {
    ...current,
    ...patch,
    // Campos con reglas propias: no dejar que un patch los deje inconsistentes.
    id: current.id,
    type: VALID_TYPES.has(patch.type) ? patch.type : current.type,
    body: patch.body !== undefined ? sanitizeHtmlBackstop(patch.body) : current.body,
    color: patch.color !== undefined ? (VALID_COLORS.has(patch.color) ? patch.color : current.color) : current.color,
    items: patch.items !== undefined ? sanitizeItems(patch.items) : current.items,
    attachments: patch.attachments !== undefined ? sanitizeAttachments(patch.attachments) : (current.attachments || []),
    labels: patch.labels !== undefined
      ? patch.labels.filter((l) => typeof l === 'string')
      : current.labels,
    reminder: patch.reminder !== undefined ? normalizeReminder(patch.reminder) : current.reminder,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  notes[index] = next;
  saveNotes(notes);
  return next;
}

// ---------------------------------------------------------------------------
// Adjuntos de imagen: archivos en userData/notes-attachments/{noteId}, servidos
// por el protocolo dvpotro-note-img:// (file:// no carga desde el origin http
// del dev server — mismo motivo que el módulo Música). El renderer manda el
// arrayBuffer (no un path del disco), así funciona igual para paste/drag-drop.
// ---------------------------------------------------------------------------

const crypto = require('crypto');
const { pathToFileURL } = require('url');

function getAttachmentsRoot() {
  return path.join(app.getPath('userData'), 'notes-attachments');
}

function getAttachmentsDir(noteId) {
  return path.join(getAttachmentsRoot(), String(noteId));
}

function removeAttachmentFiles(noteId) {
  fs.rmSync(getAttachmentsDir(noteId), { recursive: true, force: true });
}

function attachImage(noteId, arrayBuffer, filename, mime) {
  const note = getNote(noteId);
  if (!note) return { error: 'La nota no existe.' };

  const ext = MIME_TO_EXT[mime];
  if (!ext) return { error: 'Formato no soportado. Usa PNG, JPG, WEBP o GIF.' };

  const buffer = Buffer.from(arrayBuffer || []);
  if (buffer.length === 0) return { error: 'La imagen está vacía.' };
  if (buffer.length > MAX_ATTACHMENT_BYTES) return { error: 'La imagen excede 15MB.' };
  if ((note.attachments || []).length >= MAX_ATTACHMENTS_PER_NOTE) {
    return { error: 'Máximo 10 imágenes por nota.' };
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  const dir = getAttachmentsDir(noteId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${hash}${ext}`);

  try {
    fs.writeFileSync(dest, buffer);
  } catch (_error) {
    return { error: 'No se pudo guardar la imagen.' };
  }

  const attachment = {
    id: makeId(),
    filename: typeof filename === 'string' ? filename : `imagen${ext}`,
    mime,
    size: buffer.length,
    path: dest,
    createdAt: new Date().toISOString(),
  };
  updateNote(noteId, { attachments: [...(note.attachments || []), attachment] });
  return { ok: true, attachment };
}

function removeAttachment(noteId, attachmentId) {
  const note = getNote(noteId);
  if (!note) return { error: 'La nota no existe.' };

  const target = (note.attachments || []).find((att) => att.id === attachmentId);
  if (target?.path) fs.rmSync(target.path, { force: true });

  const updated = updateNote(noteId, { attachments: (note.attachments || []).filter((att) => att.id !== attachmentId) });
  return { ok: true, attachments: updated.attachments };
}

function registerNoteImageScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: NOTE_IMG_SCHEME, privileges: { supportFetchAPI: true, stream: true } },
  ]);
}

function registerNoteImageProtocol() {
  protocol.handle(NOTE_IMG_SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      const decoded = decodeURIComponent(url.pathname);
      const filePath = path.normalize(
        process.platform === 'win32' && decoded.startsWith('/') ? decoded.slice(1) : decoded,
      );

      // Solo sirve DENTRO de notes-attachments: no es un file-server del disco.
      if (!filePath.startsWith(getAttachmentsRoot()) || !IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()) || !fs.existsSync(filePath)) {
        return new Response('Not found', { status: 404 });
      }

      return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers });
    } catch (_error) {
      return new Response('Bad request', { status: 400 });
    }
  });
}

// ---------------------------------------------------------------------------
// Recordatorios, duplicado, export, bulk
// ---------------------------------------------------------------------------

function setReminder(id, at) {
  if (!at || Number.isNaN(new Date(at).getTime())) {
    return { error: 'Fecha de recordatorio inválida.' };
  }
  // fired:false arranca limpio — un reminder nuevo debe volver a disparar.
  return updateNote(id, { reminder: { at, fired: false, snoozedFrom: null } });
}

function clearReminder(id) {
  return updateNote(id, { reminder: null });
}

function snoozeReminder(id, minutes) {
  const note = getNote(id);
  if (!note?.reminder) return { error: 'La nota no tiene recordatorio.' };

  const mins = Number(minutes) > 0 ? Number(minutes) : 10;
  const nextAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
  // snoozedFrom preserva el disparo original; fired:false lo reactiva.
  return updateNote(id, {
    reminder: { at: nextAt, fired: false, snoozedFrom: note.reminder.snoozedFrom || note.reminder.at },
  });
}

function duplicateNote(id) {
  const note = getNote(id);
  if (!note) return null;

  const copy = normalizeNote({
    ...note,
    id: undefined,
    title: `${note.title || 'Nota'} (Copia)`,
    pinned: false,
    reminder: null, // La copia no hereda el recordatorio: sería doble aviso.
    attachments: [], // se copian aparte abajo (archivos propios, no compartidos)
    createdAt: undefined,
  });

  // La copia necesita SUS PROPIOS archivos: compartir los del original haría que
  // borrar uno rompiera el otro. El hash (contenido) es igual, así que el
  // filename no cambia — solo el segmento {noteId} del path.
  if ((note.attachments || []).length) {
    const destDir = getAttachmentsDir(copy.id);
    fs.mkdirSync(destDir, { recursive: true });
    copy.attachments = note.attachments.map((att) => {
      try {
        const dest = path.join(destDir, path.basename(att.path));
        fs.copyFileSync(att.path, dest);
        return { ...att, id: makeId(), path: dest, createdAt: new Date().toISOString() };
      } catch (_error) {
        return null;
      }
    }).filter(Boolean);
    // Reescribir en el body las referencias inline al nuevo directorio.
    copy.body = sanitizeHtmlBackstop(
      String(copy.body || '').split(`notes-attachments/${note.id}/`).join(`notes-attachments/${copy.id}/`),
    );
  }

  const notes = loadNotes();
  notes.push(copy);
  saveNotes(notes);
  return copy;
}

// Conversión mínima HTML → Markdown para el body enriquecido. No pretende ser
// completa: cubre el formato que produce el editor (negrita/itálica/tachado).
function htmlToMarkdown(html) {
  // Las imágenes inline (<img src=... alt=...>) → markdown ![alt](src) ANTES de
  // stripHtml, que si no las borraría.
  const withImages = String(html || '').replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (tag.match(/src="([^"]*)"/i) || [])[1] || '';
    const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || 'imagen';
    return src ? `\n![${alt}](${src})\n` : '';
  });

  return stripHtml(
    withImages
      .replace(/<(?:b|strong)[^>]*>(.*?)<\/(?:b|strong)>/gi, '**$1**')
      .replace(/<(?:i|em)[^>]*>(.*?)<\/(?:i|em)>/gi, '*$1*')
      .replace(/<(?:s|strike)[^>]*>(.*?)<\/(?:s|strike)>/gi, '~~$1~~')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|p|li)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- '),
  ).replace(/ (!\[)/g, '\n$1');
}

function exportMarkdown(id) {
  const note = getNote(id);
  if (!note) return { error: 'La nota no existe.' };

  const bodyBlock = note.type === 'checklist'
    ? note.items.map((item) => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n')
    : htmlToMarkdown(note.body);

  const fmt = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-MX');
  };

  // Checklist no lleva imágenes inline en el body: listarlas al pie.
  const imagesBlock = note.type === 'checklist' && (note.attachments || []).length
    ? `\n\n${note.attachments.map((att) => `![${att.filename || 'imagen'}](${att.path})`).join('\n')}`
    : '';

  const meta = [
    `Color: ${note.color}`,
    `Etiquetas: ${note.labels.length ? note.labels.join(', ') : '—'}`,
    `Creada: ${fmt(note.createdAt)}`,
    `Actualizada: ${fmt(note.updatedAt)}`,
  ].join(' · ');

  const markdown = `# ${note.title || 'Sin título'}\n\n${bodyBlock}${imagesBlock}\n\n---\n${meta}\n`;
  return { ok: true, markdown };
}

function bulkAction(ids, action, payload = {}) {
  const idSet = new Set(Array.isArray(ids) ? ids : []);
  if (idSet.size === 0) return { ok: true, affected: 0 };

  const notes = loadNotes();
  const now = new Date().toISOString();
  let affected = 0;

  for (const note of notes) {
    if (!idSet.has(note.id)) continue;
    affected += 1;

    if (action === 'archive') { note.archived = true; note.pinned = false; }
    else if (action === 'unarchive') { note.archived = false; }
    else if (action === 'trash') { note.trashed = true; note.archived = false; note.pinned = false; note.deletedAt = now; }
    else if (action === 'color' && VALID_COLORS.has(payload.color)) { note.color = payload.color; }
    else if (action === 'label-add' && typeof payload.label === 'string') {
      if (!note.labels.includes(payload.label)) note.labels.push(payload.label);
    } else if (action === 'label-remove' && typeof payload.label === 'string') {
      note.labels = note.labels.filter((l) => l !== payload.label);
    }
    note.updatedAt = now;
  }

  saveNotes(notes);
  return { ok: true, affected };
}

// Cambios de estado: siempre tocan updatedAt para que el orden lo refleje.
function setNoteFlags(id, flags) {
  return updateNote(id, flags);
}

function archiveNote(id) {
  return setNoteFlags(id, { archived: true, pinned: false });
}

function unarchiveNote(id) {
  return setNoteFlags(id, { archived: false });
}

function trashNote(id) {
  return setNoteFlags(id, { trashed: true, archived: false, pinned: false, deletedAt: new Date().toISOString() });
}

function restoreNote(id) {
  return setNoteFlags(id, { trashed: false, deletedAt: null });
}

function permanentDeleteNote(id) {
  const notes = loadNotes();
  const next = notes.filter((note) => note.id !== id);
  saveNotes(next);
  if (next.length < notes.length) removeAttachmentFiles(id); // no dejar imágenes huérfanas
  return { ok: next.length < notes.length };
}

function emptyTrash() {
  const notes = loadNotes();
  const removed = notes.filter((note) => note.trashed);
  const next = notes.filter((note) => !note.trashed);
  saveNotes(next);
  removed.forEach((note) => removeAttachmentFiles(note.id));
  return { ok: true, removed: removed.length };
}

// Purga silenciosa de la papelera: notas con deletedAt más viejo que el TTL se
// borran para siempre. Corre al registrar los handlers (arranque de la app).
function purgeExpiredTrash() {
  const notes = loadNotes();
  const now = Date.now();
  const purged = [];
  const survivors = notes.filter((note) => {
    if (!note.trashed || !note.deletedAt) return true;
    if (now - new Date(note.deletedAt).getTime() < TRASH_TTL_MS) return true;
    purged.push(note);
    return false;
  });

  if (survivors.length !== notes.length) {
    saveNotes(survivors);
    purged.forEach((note) => removeAttachmentFiles(note.id));
  }
  return notes.length - survivors.length;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function listLabels() {
  return loadLabels();
}

function createLabel(name) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized) return { error: 'El nombre de la etiqueta no puede estar vacío.' };

  const labels = loadLabels();
  if (labels.some((l) => l.toLowerCase() === normalized.toLowerCase())) {
    return { error: 'Ya existe una etiqueta con ese nombre.' };
  }

  labels.push(normalized);
  saveLabels(labels);
  return { ok: true, labels };
}

function renameLabel(from, to) {
  const target = typeof to === 'string' ? to.trim() : '';
  if (!target) return { error: 'El nombre de la etiqueta no puede estar vacío.' };

  const labels = loadLabels();
  const index = labels.findIndex((l) => l === from);
  if (index < 0) return { error: 'La etiqueta no existe.' };

  labels[index] = target;
  saveLabels(labels);

  // Propagar el rename a todas las notas que la usaban.
  const notes = loadNotes();
  let touched = false;
  for (const note of notes) {
    const labelIndex = note.labels.indexOf(from);
    if (labelIndex >= 0) {
      note.labels[labelIndex] = target;
      touched = true;
    }
  }
  if (touched) saveNotes(notes);

  return { ok: true, labels };
}

function deleteLabel(name) {
  const labels = loadLabels().filter((l) => l !== name);
  saveLabels(labels);

  // Al borrar una etiqueta se quita de todas las notas — no dejar labels huérfanas.
  const notes = loadNotes();
  let touched = false;
  for (const note of notes) {
    const filtered = note.labels.filter((l) => l !== name);
    if (filtered.length !== note.labels.length) {
      note.labels = filtered;
      touched = true;
    }
  }
  if (touched) saveNotes(notes);

  return { ok: true, labels };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function updateSettings(patch = {}) {
  const next = { ...getSettings() };
  if (patch.view === 'grid' || patch.view === 'list') next.view = patch.view;
  if (['updatedAt', 'createdAt', 'title'].includes(patch.sortBy)) next.sortBy = patch.sortBy;
  writeJson(getSettingsPath(), next);
  return next;
}

// ---------------------------------------------------------------------------
// Scheduler de recordatorios → notification-center (require lazy: evita ciclo)
// ---------------------------------------------------------------------------

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
let reminderInterval = null;

function checkReminders(now = Date.now()) {
  try {
    const notes = loadNotes();
    let touched = false;

    for (const note of notes) {
      if (note.trashed || !note.reminder || note.reminder.fired) continue;
      if (new Date(note.reminder.at).getTime() > now) continue;

      // Require perezoso dentro de la función: rompe el ciclo notes ↔ center.
      const { emit } = require('./notification-center');
      emit({
        // key con id+at: el mismo recordatorio nunca se emite dos veces, y un
        // snooze (cambia at) es un evento nuevo legítimo.
        key: `notes-reminder-${note.id}-${note.reminder.at}`,
        source: 'notes',
        category: 'proximidad',
        priority: 'normal',
        title: note.title || 'Nota sin título',
        body: 'Recordatorio',
        actionUrl: `app://notas?note=${note.id}`,
      });

      note.reminder = { ...note.reminder, fired: true };
      touched = true;
    }

    if (touched) saveNotes(notes);
  } catch (error) {
    console.error('[notes] checkReminders falló:', error?.message);
  }
}

function startReminderScheduler() {
  if (reminderInterval) return;
  // Barrido inicial corto tras el arranque + intervalo de 5 min.
  setTimeout(() => checkReminders(), 15 * 1000);
  reminderInterval = setInterval(() => checkReminders(), REMINDER_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerNotesHandlers() {
  purgeExpiredTrash();

  ipcMain.handle('notes:list', async (_event, payload) => listNotes(payload || {}));
  ipcMain.handle('notes:get', async (_event, id) => getNote(id));
  ipcMain.handle('notes:create', async (_event, note) => createNote(note || {}));
  ipcMain.handle('notes:update', async (_event, { id, patch }) => updateNote(id, patch || {}));
  ipcMain.handle('notes:archive', async (_event, id) => archiveNote(id));
  ipcMain.handle('notes:unarchive', async (_event, id) => unarchiveNote(id));
  ipcMain.handle('notes:trash', async (_event, id) => trashNote(id));
  ipcMain.handle('notes:restore', async (_event, id) => restoreNote(id));
  ipcMain.handle('notes:permanent-delete', async (_event, id) => permanentDeleteNote(id));
  ipcMain.handle('notes:empty-trash', async () => emptyTrash());
  ipcMain.handle('notes:labels-list', async () => listLabels());
  ipcMain.handle('notes:labels-create', async (_event, name) => createLabel(name));
  ipcMain.handle('notes:labels-rename', async (_event, { from, to }) => renameLabel(from, to));
  ipcMain.handle('notes:labels-delete', async (_event, name) => deleteLabel(name));
  ipcMain.handle('notes:settings-get', async () => getSettings());
  ipcMain.handle('notes:settings-update', async (_event, patch) => updateSettings(patch || {}));
  ipcMain.handle('notes:set-reminder', async (_event, { id, at }) => setReminder(id, at));
  ipcMain.handle('notes:clear-reminder', async (_event, id) => clearReminder(id));
  ipcMain.handle('notes:snooze-reminder', async (_event, { id, minutes }) => snoozeReminder(id, minutes));
  ipcMain.handle('notes:duplicate', async (_event, id) => duplicateNote(id));
  ipcMain.handle('notes:export-markdown', async (_event, id) => exportMarkdown(id));
  ipcMain.handle('notes:bulk-action', async (_event, { ids, action, payload }) => bulkAction(ids, action, payload));
  ipcMain.handle('notes:attach-image', async (_event, { noteId, arrayBuffer, filename, mime }) => attachImage(noteId, arrayBuffer, filename, mime));
  ipcMain.handle('notes:remove-attachment', async (_event, { noteId, attachmentId }) => removeAttachment(noteId, attachmentId));

  registerNoteImageProtocol();
  startReminderScheduler();
}

module.exports = {
  archiveNote,
  attachImage,
  bulkAction,
  checkReminders,
  clearReminder,
  createNote,
  deleteLabel,
  createLabel,
  duplicateNote,
  emptyTrash,
  exportMarkdown,
  getAttachmentsDir,
  getNote,
  getSettings,
  listLabels,
  listNotes,
  permanentDeleteNote,
  purgeExpiredTrash,
  registerNotesHandlers,
  registerNoteImageProtocol,
  registerNoteImageScheme,
  removeAttachment,
  renameLabel,
  restoreNote,
  setReminder,
  snoozeReminder,
  trashNote,
  unarchiveNote,
  updateNote,
  updateSettings,
};
