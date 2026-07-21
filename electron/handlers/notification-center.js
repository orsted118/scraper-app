// Motor de la bandeja de notificaciones IN-APP: diffs de syncs, recordatorios,
// persistencia y push al renderer. NO confundir con notifications.js, que
// maneja los toasts nativos del OS — la coexistencia es intencional.
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { SPANISH_MONTHS, parseDueDate } = require('../utils/dateParser');

const MAX_NOTIFICATIONS = 500;
const ERROR_DEDUPE_MS = 6 * 60 * 60 * 1000;
const SYNC_ALL_DEDUPE_MS = 30 * 60 * 1000;
const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const NOTICES_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 20 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_SETTINGS = {
  noticesEnabled: true,
  remindersEnabled: true,
  // null = nunca hubo un sync exitoso: la UI muestra onboarding en vez de "Al día".
  lastSyncAt: null,
};

const SOURCE_LABELS = {
  actividades: 'iVirtual',
  horario: 'Horario',
  calificaciones: 'CIA',
  calendario: 'Calendario',
  sistema: 'Sistema',
  'itson-news': 'Institucional',
};

const FRIENDLY_SYNC_ERRORS = {
  NO_CREDENTIALS: 'No hay credenciales de iVirtual configuradas. Revísalas en Ajustes.',
  NO_USER: 'Falta tu ID de usuario de iVirtual. Revísalo en Ajustes.',
  NO_PASSWORD: 'Falta tu contraseña de iVirtual. Revísala en Ajustes.',
  SESSION_EXPIRED: 'La sesión de iVirtual expiró o la contraseña cambió. Revísala en Ajustes.',
  LOGIN_FAILED: 'No fue posible iniciar sesión en iVirtual. Verifica tus credenciales en Ajustes.',
  CIA_NO_CREDENTIALS: 'No hay credenciales del CIA configuradas. Revísalas en Ajustes.',
  CIA_NO_USER: 'Falta tu usuario del CIA. Revísalo en Ajustes.',
  CIA_NO_PASSWORD: 'Falta tu contraseña del CIA. Revísala en Ajustes.',
};

const CREDENTIAL_ERROR_CODES = new Set(Object.keys(FRIENDLY_SYNC_ERRORS));

let reminderInterval = null;
let noticesInterval = null;

// ---------------------------------------------------------------------------
// Persistencia (mismo patrón del proyecto: JSON plano en userData con fs)
// ---------------------------------------------------------------------------

function getUserDataPath() {
  return app.getPath('userData');
}

function getNotificationsPath() {
  return path.join(getUserDataPath(), 'notifications.json');
}

function getSettingsPath() {
  return path.join(getUserDataPath(), 'notification-settings.json');
}

function getSnapshotsDir() {
  return path.join(getUserDataPath(), 'snapshots');
}

function getSnapshotPath(name) {
  return path.join(getSnapshotsDir(), `${name}.json`);
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[notification-center] No se pudo leer ${filePath}:`, error?.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`[notification-center] No se pudo escribir ${filePath}:`, error?.message);
    return false;
  }
}

function loadNotifications() {
  const parsed = readJson(getNotificationsPath());
  return Array.isArray(parsed?.items) ? parsed.items : [];
}

function saveNotifications(items) {
  writeJson(getNotificationsPath(), { version: 1, items: items.slice(0, MAX_NOTIFICATIONS) });
}

function readSnapshot(name) {
  return readJson(getSnapshotPath(name));
}

function writeSnapshot(name, data) {
  writeJson(getSnapshotPath(name), data);
}

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(readJson(getSettingsPath()) || {}) };
}

function setSettings(patch = {}) {
  const next = { ...getSettings() };

  if (typeof patch.noticesEnabled === 'boolean') {
    next.noticesEnabled = patch.noticesEnabled;
  }

  if (typeof patch.remindersEnabled === 'boolean') {
    next.remindersEnabled = patch.remindersEnabled;
  }

  writeJson(getSettingsPath(), next);
  return next;
}

// Fuera de setSettings a propósito: el IPC set-settings solo acepta booleanos,
// lastSyncAt lo escriben únicamente los syncs exitosos.
function touchLastSync() {
  writeJson(getSettingsPath(), { ...getSettings(), lastSyncAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Emisión: idempotente por `key`, rota FIFO, push al renderer
// ---------------------------------------------------------------------------

function emit(input, { dedupeWindowMs = null } = {}) {
  try {
    if (!input?.key || !input?.title) {
      return null;
    }

    const items = loadNotifications();
    const existing = items.find((item) => item.key === input.key);

    if (existing) {
      if (!dedupeWindowMs) {
        return null;
      }
      const age = Date.now() - new Date(existing.timestamp).getTime();
      if (age < dedupeWindowMs) {
        return null;
      }
    }

    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      key: input.key,
      source: input.source || 'sistema',
      category: input.category || 'info',
      priority: input.priority || 'info',
      title: input.title,
      body: input.body || '',
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: input.actionUrl || null,
      meta: input.meta || {},
    };

    items.unshift(notification);
    saveNotifications(items);

    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('notifications:new', { notification });
    }

    return notification;
  } catch (error) {
    console.error('[notification-center] emit falló:', error?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Diffs por fuente. Regla de seed silencioso: sin snapshot previo se guarda
// el estado y no se emite nada — el estreno del módulo no puede ser spam.
// ---------------------------------------------------------------------------

function getActivityKey(activity = {}) {
  return String(activity.id || `${activity.nombre || ''}::${activity.materia || ''}`);
}

function diffActividades(activities) {
  const list = Array.isArray(activities) ? activities : [];
  const next = list.map((activity) => ({
    key: getActivityKey(activity),
    nombre: activity.nombre || 'Actividad',
    materia: activity.materia || '',
    fechaLimite: activity.fechaLimite || '',
    estado: activity.estado || '',
  }));
  const previous = readSnapshot('actividades');
  writeSnapshot('actividades', { items: next });

  if (!Array.isArray(previous?.items)) {
    return;
  }

  const prevMap = new Map(previous.items.map((item) => [item.key, item]));

  for (const current of next) {
    const prev = prevMap.get(current.key);

    if (!prev) {
      emit({
        key: `act-nueva-${current.key}`,
        source: 'actividades',
        category: 'nueva',
        priority: 'normal',
        title: `Nueva actividad: ${current.nombre}`,
        body: [current.materia, current.fechaLimite ? `Vence: ${current.fechaLimite}` : '']
          .filter(Boolean)
          .join(' · '),
        meta: { materia: current.materia },
      });
      continue;
    }

    if (prev.fechaLimite && current.fechaLimite && prev.fechaLimite !== current.fechaLimite) {
      emit({
        key: `act-fecha-${current.key}-${current.fechaLimite}`,
        source: 'actividades',
        category: 'cambio',
        priority: 'normal',
        title: `Cambió la fecha límite: ${current.nombre}`,
        body: `Antes: ${prev.fechaLimite} · Ahora: ${current.fechaLimite}`,
        meta: { materia: current.materia },
      });
    }

    if (['pendiente', 'retrasada'].includes(prev.estado) && current.estado === 'cerrada') {
      emit({
        key: `act-cerro-${current.key}`,
        source: 'actividades',
        category: 'cambio',
        priority: 'critica',
        title: `Cerró sin entrega: ${current.nombre}`,
        body: current.materia || 'La actividad ya no acepta entregas.',
        meta: { materia: current.materia },
      });
    }
  }
  // Actividades que desaparecen del array normalmente fueron entregadas:
  // notificar su ausencia sería ruido, no información.
}

function getMateriaKey(materia = {}) {
  return String(
    materia.numeroClase || `${materia.codigo || ''}-${materia.seccion || ''}-${materia.nombre || ''}`,
  );
}

function getMateriaUbicaciones(materia = {}) {
  const sessions = Array.isArray(materia.sesiones) ? materia.sesiones : [];
  const fromSessions = sessions.map((session) => session?.ubicacion || '').filter(Boolean);
  const list = fromSessions.length > 0 ? fromSessions : [materia.ubicacion || ''];
  return list.filter(Boolean).join(' | ');
}

function diffHorario(materias) {
  const list = Array.isArray(materias) ? materias : [];
  const next = list.map((materia) => ({
    key: getMateriaKey(materia),
    nombre: materia.nombre || 'Materia',
    meetLink: materia.meetLink || '',
    ubicaciones: getMateriaUbicaciones(materia),
  }));
  const previous = readSnapshot('horario');
  writeSnapshot('horario', { items: next });

  if (!Array.isArray(previous?.items)) {
    return;
  }

  const prevMap = new Map(previous.items.map((item) => [item.key, item]));
  const nextKeys = new Set(next.map((item) => item.key));

  for (const current of next) {
    const prev = prevMap.get(current.key);

    if (!prev) {
      emit({
        key: `hor-nueva-${current.key}`,
        source: 'horario',
        category: 'cambio',
        priority: 'normal',
        title: `Materia nueva en tu horario: ${current.nombre}`,
        body: current.ubicaciones || 'Revisa los detalles en Horario.',
      });
      continue;
    }

    if (prev.meetLink !== current.meetLink && current.meetLink) {
      emit({
        key: `hor-link-${current.key}-${current.meetLink.slice(-24)}`,
        source: 'horario',
        category: 'cambio',
        priority: 'normal',
        title: `Se actualizó el link de videollamada: ${current.nombre}`,
        body: current.meetLink,
        actionUrl: current.meetLink,
      });
    }

    if (prev.ubicaciones && current.ubicaciones && prev.ubicaciones !== current.ubicaciones) {
      emit({
        key: `hor-aula-${current.key}-${current.ubicaciones}`,
        source: 'horario',
        category: 'cambio',
        priority: 'normal',
        title: `Cambio de aula: ${current.nombre}`,
        body: `Antes: ${prev.ubicaciones} · Ahora: ${current.ubicaciones}`,
      });
    }
  }

  for (const prev of previous.items) {
    if (!nextKeys.has(prev.key)) {
      emit({
        key: `hor-baja-${prev.key}`,
        source: 'horario',
        category: 'cambio',
        priority: 'normal',
        title: `Materia eliminada de tu horario: ${prev.nombre}`,
        body: 'Ya no aparece en el horario del CIA.',
      });
    }
  }
}

function diffCalificaciones(materias) {
  const list = Array.isArray(materias) ? materias : [];
  const next = list.map((materia) => ({
    key: String(materia.clave || materia.nombre || ''),
    nombre: materia.nombre || 'Materia',
    promedio: Number.isFinite(Number(materia.promedio)) ? Number(materia.promedio) : null,
    califs: (Array.isArray(materia.calificaciones) ? materia.calificaciones : []).reduce(
      (acc, entry) => {
        if (entry?.parcial && entry.calificacion !== null && entry.calificacion !== undefined) {
          acc[entry.parcial] = entry.calificacion;
        }
        return acc;
      },
      {},
    ),
  }));
  const previous = readSnapshot('calificaciones');
  writeSnapshot('calificaciones', { items: next });

  if (!Array.isArray(previous?.items)) {
    return;
  }

  const prevMap = new Map(previous.items.map((item) => [item.key, item]));

  for (const current of next) {
    const prev = prevMap.get(current.key);

    if (!prev) {
      continue; // Materia nueva en boleta: sus calificaciones aparecerán en el próximo diff.
    }

    for (const [parcial, valor] of Object.entries(current.califs)) {
      if (prev.califs?.[parcial] === undefined) {
        emit({
          key: `cal-nueva-${current.key}-${parcial}`,
          source: 'calificaciones',
          category: 'nueva',
          priority: 'normal',
          title: `Calificación publicada: ${current.nombre}`,
          body: `${parcial}: ${valor}`,
        });
      }
    }

    if (
      prev.promedio !== null &&
      current.promedio !== null &&
      Math.abs(current.promedio - prev.promedio) > 0.3
    ) {
      emit({
        key: `cal-prom-${current.key}-${current.promedio}`,
        source: 'calificaciones',
        category: 'cambio',
        priority: 'normal',
        title: `Tu promedio cambió: ${current.nombre}`,
        body: `De ${prev.promedio} a ${current.promedio}`,
      });
    }
  }
}

function getEventKey(event = {}) {
  return `${String(event.titulo || '').trim().toLowerCase()}::${event.inicio || ''}`;
}

function diffCalendario(payload = {}) {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const calendarType = payload.calendarType || 'default';
  const nextKeys = events.map(getEventKey);
  const previous = readSnapshot('calendario') || {};
  const prevKeys = new Set(Array.isArray(previous[calendarType]) ? previous[calendarType] : null);

  writeSnapshot('calendario', { ...previous, [calendarType]: nextKeys });

  if (!Array.isArray(previous[calendarType])) {
    return;
  }

  const now = Date.now();

  for (const event of events) {
    const key = getEventKey(event);
    const start = new Date(event.inicio).getTime();

    if (prevKeys.has(key) || !Number.isFinite(start) || start < now) {
      continue;
    }

    emit({
      key: `cal-evento-${key}`,
      source: 'calendario',
      category: 'nueva',
      priority: 'info',
      title: `Nuevo evento en el calendario: ${event.titulo}`,
      body: new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(event.inicio)),
    });
  }
}

// ---------------------------------------------------------------------------
// API para handlers: fire-and-forget, jamás rompe un sync
// ---------------------------------------------------------------------------

function processSync(source, data) {
  try {
    if (source === 'actividades') diffActividades(data);
    else if (source === 'horario') diffHorario(data);
    else if (source === 'calificaciones') diffCalificaciones(data);
    else if (source === 'calendario') diffCalendario(data);
    else return;

    touchLastSync();
  } catch (error) {
    console.error(`[notification-center] processSync(${source}) falló:`, error?.message);
  }
}

function processSyncError(source, code) {
  try {
    const normalized = String(code || '').trim();
    if (!normalized) return;

    const label = SOURCE_LABELS[source] || source;
    const friendly = FRIENDLY_SYNC_ERRORS[normalized] || normalized;
    const isCredentialIssue = CREDENTIAL_ERROR_CODES.has(normalized);

    emit(
      {
        key: `sys-error-${source}-${normalized.slice(0, 60)}`,
        source: 'sistema',
        category: 'error',
        priority: 'critica',
        title: `Error al sincronizar ${label}`,
        body: friendly,
        actionUrl: isCredentialIssue ? 'app://ajustes' : null,
        meta: { code: normalized, origin: source },
      },
      { dedupeWindowMs: ERROR_DEDUPE_MS },
    );
  } catch (error) {
    console.error('[notification-center] processSyncError falló:', error?.message);
  }
}

function emitSyncAllSummary(parts = []) {
  try {
    const body = parts.filter(Boolean).join(' · ');
    emit(
      {
        key: 'sys-syncall',
        source: 'sistema',
        category: 'info',
        priority: 'info',
        title: 'Sincronización completa',
        body: body || 'Todos los módulos quedaron actualizados.',
      },
      { dedupeWindowMs: SYNC_ALL_DEDUPE_MS },
    );
  } catch (error) {
    console.error('[notification-center] emitSyncAllSummary falló:', error?.message);
  }
}

// ---------------------------------------------------------------------------
// Recordatorios: leen los cachés existentes de disco (read-only, sin scraping
// ni require de handlers — así no hay dependencias circulares).
// ---------------------------------------------------------------------------

function normalizeDay(value = '') {
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function readReminderLog() {
  return readJson(getSnapshotPath('reminders'), {});
}

function wasEmitted(log, key) {
  return Boolean(log[key]);
}

function checkClassReminders(log, now) {
  const cache = readJson(path.join(getUserDataPath(), 'horario-cache.json'));
  const materias = Array.isArray(cache?.materias) ? cache.materias : [];
  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const today = dayNames[now.getDay()];
  const todayISO = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const materia of materias) {
    const sessions = Array.isArray(materia.sesiones) && materia.sesiones.length > 0
      ? materia.sesiones
      : materia.dias
        ? [{ dias: materia.dias, horaInicio: materia.horaInicio, horaFin: materia.horaFin, ubicacion: materia.ubicacion }]
        : [];

    for (const session of sessions) {
      const matchesToday = (session?.dias || []).some((day) => normalizeDay(day) === today);
      const startMinutes = timeToMinutes(session?.horaInicio);

      if (!matchesToday || startMinutes === null) {
        continue;
      }

      const diff = startMinutes - nowMinutes;

      if (diff <= 0 || diff > 15) {
        continue;
      }

      const key = `rem-clase-${getMateriaKey(materia)}-${todayISO}-${session.horaInicio}`;

      if (wasEmitted(log, key)) {
        continue;
      }

      const isOnline = materia.modalidad === 'en_linea';
      emit({
        key,
        source: 'horario',
        category: 'proximidad',
        priority: 'critica',
        title: `Clase en ${diff} min: ${materia.nombre || 'Materia'}`,
        body: isOnline
          ? 'Clase en línea — el link está en Horario.'
          : session.ubicacion || materia.ubicacion || 'Revisa el aula en Horario.',
        actionUrl: materia.meetLink || null,
      });
      log[key] = new Date().toISOString();
    }
  }
}

function checkActivityReminders(log, now) {
  const cache = readJson(path.join(getUserDataPath(), 'actividades-cache.json'));
  const activities = Array.isArray(cache?.actividades) ? cache.actividades : [];
  const nowMs = now.getTime();
  const todayISO = now.toISOString().slice(0, 10);

  for (const activity of activities) {
    if (activity?.estado !== 'pendiente') {
      continue;
    }

    const dueMs = parseDueDate(activity.fechaLimite);

    if (dueMs === null || dueMs < nowMs || dueMs - nowMs > DAY_MS) {
      continue;
    }

    const activityKey = getActivityKey(activity);
    const dueDate = new Date(dueMs);
    const isToday = dueDate.toISOString().slice(0, 10) === todayISO;
    const window = isToday ? 'hoy' : '24h';
    const key = `rem-act-${window}-${activityKey}-${dueDate.toISOString().slice(0, 10)}`;

    if (wasEmitted(log, key)) {
      continue;
    }

    emit({
      key,
      source: 'actividades',
      category: 'proximidad',
      priority: isToday ? 'critica' : 'normal',
      title: isToday ? `Vence hoy: ${activity.nombre}` : `Vence en menos de 24h: ${activity.nombre}`,
      body: [activity.materia, activity.fechaLimite].filter(Boolean).join(' · '),
    });
    log[key] = new Date().toISOString();
  }
}

function checkCalendarReminders(log, now) {
  const cache = readJson(path.join(getUserDataPath(), 'calendario-cache.json'));
  const events = Array.isArray(cache?.events) ? cache.events : [];
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const event of events) {
    const start = new Date(event?.inicio).getTime();

    if (!Number.isFinite(start)) {
      continue;
    }

    const days = Math.round((new Date(start).setHours(0, 0, 0, 0) - todayStart.getTime()) / DAY_MS);
    let window = null;
    let priority = 'info';

    if (days === 0) {
      window = 'hoy';
      priority = 'normal';
    } else if (days === 1) {
      window = 'manana';
      priority = 'normal';
    } else if (days === 3) {
      window = '3d';
      priority = 'info';
    }

    if (!window) {
      continue;
    }

    const key = `rem-cal-${getEventKey(event)}-${window}`;

    if (wasEmitted(log, key)) {
      continue;
    }

    const label = days === 0 ? 'hoy' : days === 1 ? 'mañana' : 'en 3 días';
    emit({
      key,
      source: 'calendario',
      category: 'proximidad',
      priority,
      title: `Evento del calendario ${label}: ${event.titulo}`,
      body: new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(start)),
    });
    log[key] = new Date().toISOString();
  }
}

function pruneReminderLog(log, now) {
  const cutoff = now.getTime() - 14 * DAY_MS;

  for (const [key, iso] of Object.entries(log)) {
    if (new Date(iso).getTime() < cutoff) {
      delete log[key];
    }
  }
}

function checkReminders(now = new Date()) {
  try {
    if (!getSettings().remindersEnabled) {
      return;
    }

    const log = readReminderLog();
    checkClassReminders(log, now);
    checkActivityReminders(log, now);
    checkCalendarReminders(log, now);
    pruneReminderLog(log, now);
    writeSnapshot('reminders', log);
  } catch (error) {
    console.error('[notification-center] checkReminders falló:', error?.message);
  }
}

// ---------------------------------------------------------------------------
// Schedulers
// ---------------------------------------------------------------------------

function runNoticesSync() {
  try {
    if (!getSettings().noticesEnabled) {
      return;
    }

    // Require perezoso: notices.js requiere este módulo, así se evita el ciclo.
    const { syncNotices } = require('./notices');
    syncNotices().catch((error) => {
      console.error('[notification-center] notices sync falló:', error?.message);
    });
  } catch (error) {
    console.error('[notification-center] runNoticesSync falló:', error?.message);
  }
}

function startSchedulers() {
  if (reminderInterval) {
    return;
  }

  setTimeout(() => {
    checkReminders();
    runNoticesSync();
  }, STARTUP_DELAY_MS);

  reminderInterval = setInterval(() => checkReminders(), REMINDER_INTERVAL_MS);
  noticesInterval = setInterval(() => runNoticesSync(), NOTICES_INTERVAL_MS);
}

function stopSchedulers() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  if (noticesInterval) {
    clearInterval(noticesInterval);
    noticesInterval = null;
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerNotificationCenter() {
  ipcMain.handle('notifications:list', async () => ({
    ok: true,
    notifications: loadNotifications(),
  }));

  ipcMain.handle('notifications:mark-read', async (_event, id) => {
    const items = loadNotifications();
    const target = items.find((item) => item.id === id);
    if (target) {
      target.read = true;
      saveNotifications(items);
    }
    return { ok: Boolean(target) };
  });

  ipcMain.handle('notifications:mark-all-read', async () => {
    const items = loadNotifications().map((item) => ({ ...item, read: true }));
    saveNotifications(items);
    return { ok: true };
  });

  ipcMain.handle('notifications:dismiss', async (_event, id) => {
    const items = loadNotifications();
    const next = items.filter((item) => item.id !== id);
    saveNotifications(next);
    return { ok: next.length < items.length };
  });

  ipcMain.handle('notifications:clear', async () => {
    saveNotifications([]);
    return { ok: true };
  });

  ipcMain.handle('notifications:get-settings', async () => ({ ok: true, settings: getSettings() }));

  ipcMain.handle('notifications:set-settings', async (_event, patch) => ({
    ok: true,
    settings: setSettings(patch || {}),
  }));
}

module.exports = {
  checkReminders,
  emit,
  emitSyncAllSummary,
  getSettings,
  processSync,
  processSyncError,
  registerNotificationCenter,
  startSchedulers,
  stopSchedulers,
  touchLastSync,
};
