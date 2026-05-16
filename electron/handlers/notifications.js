const DAY_MS = 24 * 60 * 60 * 1000;

function getElectron() {
  return require('electron');
}

function parseDueDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
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
      body: `Tienes ${formatCountLabel(summary.delayedCount, 'actividad retrasada', 'actividades retrasadas')}. Revisa ScraperApp.`,
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

function registerNotificationHandlers() {
  const { ipcMain } = getElectron();

  ipcMain.handle('notifications:check', async (_event, activities) => checkAndNotify(activities));
}

module.exports = {
  checkAndNotify,
  registerNotificationHandlers,
  summarizeUrgentActivities,
};
