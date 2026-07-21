const { SPANISH_MONTHS, parseDueDate } = require('../utils/dateParser');
// Toasts NATIVOS del OS (avisos efímeros de urgencias y clases próximas).
// NO confundir con notification-center.js, que es el motor de la bandeja
// in-app — la coexistencia de ambos es intencional.
const DAY_MS = 24 * 60 * 60 * 1000;

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

let classNotifierInterval = null;
const notifiedSet = new Set();
let lastResetDate = new Date().toDateString();

function getElectron() {
  return require('electron');
}

function normalizeDay(value = '') {
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getMateriaSessions(materia = {}) {
  if (Array.isArray(materia.sesiones) && materia.sesiones.length > 0) {
    return materia.sesiones;
  }

  if (Array.isArray(materia.dias) && materia.horaInicio && materia.horaFin) {
    return [
      {
        dias: materia.dias,
        horaInicio: materia.horaInicio,
        horaFin: materia.horaFin,
        ubicacion: materia.ubicacion,
        esEnLinea: materia.modalidad === 'en_linea',
      },
    ];
  }

  return [];
}

function getSessionsForToday(materias, now = new Date()) {
  const today = normalizeDay(DAY_NAMES[now.getDay()]);
  const list = Array.isArray(materias) ? materias : [];
  const todaySessions = [];

  list.forEach((materia) => {
    getMateriaSessions(materia).forEach((session) => {
      const days = Array.isArray(session?.dias) ? session.dias : [];
      const matchesToday = days.some((day) => normalizeDay(day) === today);

      if (matchesToday) {
        todaySessions.push({ materia, session });
      }
    });
  });

  return todaySessions;
}

function summarizeUrgentActivities(activities, now = Date.now()) {
  const list = Array.isArray(activities) ? activities : [];
  const windowEnd = now + DAY_MS;

  let delayedCount = 0;
  let expiringCount = 0;

  list.forEach((activity) => {
    if (!activity || typeof activity !== 'object') {
      return;
    }

    const status = String(activity.estado || '').trim().toLowerCase();
    const dueTime = parseDueDate(activity.fechaLimite);

    if (status === 'retrasada') {
      delayedCount += 1;
    }

    if (status === 'pendiente' && dueTime !== null && dueTime >= now && dueTime <= windowEnd) {
      expiringCount += 1;
    }
  });

  return { delayedCount, expiringCount };
}

function formatCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function checkAndNotify(activities) {
  const { Notification } = getElectron();

  const supported = typeof Notification?.isSupported === 'function' ? Notification.isSupported() : false;
  const summary = summarizeUrgentActivities(activities);

  if (!supported) {
    return {
      ...summary,
      supported: false,
      success: true,
    };
  }

  if (summary.delayedCount > 0) {
    new Notification({
      body: `Tienes ${formatCountLabel(summary.delayedCount, 'actividad retrasada', 'actividades retrasadas')}. Revisa DVPotro.`,
      title: 'Actividades retrasadas en iVirtual',
    }).show();
  }

  if (summary.expiringCount > 0) {
    new Notification({
      body: `${formatCountLabel(summary.expiringCount, 'actividad', 'actividades')} vencen hoy o mañana.`,
      title: 'Actividades por vencer',
    }).show();
  }

  return {
    ...summary,
    supported: true,
    success: true,
  };
}

function notifyClassStart({ materia, session, minutesBefore, today }) {
  const { Notification } = getElectron();
  const supported = typeof Notification?.isSupported === 'function' ? Notification.isSupported() : false;

  if (!supported) {
    return false;
  }

  const key = `${materia.clave || materia.codigo || materia.nombre}-${session.horaInicio}-${today}`;

  if (notifiedSet.has(key)) {
    return false;
  }

  notifiedSet.add(key);

  const salon =
    session.esEnLinea || materia.modalidad === 'en_linea'
      ? 'En línea'
      : session.ubicacion || materia.ubicacion || '';
  const meetLink = session.meetLink || materia.meetLink || null;
  const body = [materia.nombre || 'Clase', salon, meetLink || '']
    .filter(Boolean)
    .join(' · ');

  new Notification({
    title: `Clase en ${minutesBefore} minutos`,
    body,
  }).show();

  return true;
}

function checkClassNotifications(getCachedHorarioFn, now = new Date()) {
  const today = now.toDateString();

  if (today !== lastResetDate) {
    notifiedSet.clear();
    lastResetDate = today;
  }

  const minutesBefore = Number(process.env.NOTIF_MINUTES_BEFORE) || 10;
  const materias = typeof getCachedHorarioFn === 'function' ? getCachedHorarioFn() || [] : [];
  const todaySessions = getSessionsForToday(materias, now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let notifiedCount = 0;

  todaySessions.forEach(({ materia, session }) => {
    const startMinutes = timeToMinutes(session.horaInicio);

    if (startMinutes === null) {
      return;
    }

    const diff = startMinutes - nowMinutes;

    if (diff !== minutesBefore) {
      return;
    }

    if (notifyClassStart({ materia, session, minutesBefore, today })) {
      notifiedCount += 1;
    }
  });

  return { checked: todaySessions.length, notifiedCount };
}

function startClassNotifier(getCachedHorarioFn) {
  if (classNotifierInterval) return;

  classNotifierInterval = setInterval(() => {
    checkClassNotifications(getCachedHorarioFn);
  }, 60000);
}

function stopClassNotifier() {
  if (classNotifierInterval) {
    clearInterval(classNotifierInterval);
    classNotifierInterval = null;
  }
}

function registerNotificationHandlers() {
  const { ipcMain } = getElectron();

  ipcMain.handle('notifications:check', async (_event, activities) => checkAndNotify(activities));
}

module.exports = {
  checkAndNotify,
  checkClassNotifications,
  getNowMinutes,
  getSessionsForToday,
  registerNotificationHandlers,
  startClassNotifier,
  stopClassNotifier,
  summarizeUrgentActivities,
  timeToMinutes,
};
