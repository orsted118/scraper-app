const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperApp', {
  clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
  runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
  runCIA: () => ipcRenderer.invoke('cia:run'),
  runHorario: () => ipcRenderer.invoke('horario:run'),
  runCalendario: (options) => ipcRenderer.invoke('calendario:run', options || {}),
  clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
  clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
  clearCalendarioCache: () => ipcRenderer.invoke('calendario:clear-cache'),
  saveHorarioLink: (numeroClase, link) =>
    ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
  testConnection: (payload) => ipcRenderer.invoke('settings:test-connection', payload),
  clearCredentials: () => ipcRenderer.invoke('settings:clear-credentials'),
  checkNotifications: (activities) => ipcRenderer.invoke('notifications:check', activities),
  onProgress: (callback) => {
      ipcRenderer.removeAllListeners('scraper:progress');
      ipcRenderer.on('scraper:progress', (_event, data) => callback(data));
    },
  removeProgress: () => ipcRenderer.removeAllListeners('scraper:progress'),
  downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
  inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
  parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  syncAll: () => ipcRenderer.invoke('sync:all'),
  notifications: {
    list: () => ipcRenderer.invoke('notifications:list'),
    markRead: (id) => ipcRenderer.invoke('notifications:mark-read', id),
    markAllRead: () => ipcRenderer.invoke('notifications:mark-all-read'),
    dismiss: (id) => ipcRenderer.invoke('notifications:dismiss', id),
    clear: () => ipcRenderer.invoke('notifications:clear'),
    getSettings: () => ipcRenderer.invoke('notifications:get-settings'),
    setSettings: (patch) => ipcRenderer.invoke('notifications:set-settings', patch),
    onNew: (callback) => {
      ipcRenderer.removeAllListeners('notifications:new');
      ipcRenderer.on('notifications:new', (_event, data) => callback(data));
    },
    removeNew: () => ipcRenderer.removeAllListeners('notifications:new'),
  },
  notices: {
    sync: () => ipcRenderer.invoke('notices:sync'),
  },
  portalSistemas: {
    getProfile: () => ipcRenderer.invoke('portal-sistemas:get-profile'),
    refreshProfile: () => ipcRenderer.invoke('portal-sistemas:refresh-profile'),
    getCredential: () => ipcRenderer.invoke('portal-sistemas:get-credential'),
  },
  music: {
    pickFolder: () => ipcRenderer.invoke('music:pick-folder'),
    scanFolder: (folderPath) => ipcRenderer.invoke('music:scan-folder', folderPath),
    getLibrary: () => ipcRenderer.invoke('music:get-library'),
    refresh: () => ipcRenderer.invoke('music:refresh'),
    saveState: (state) => ipcRenderer.invoke('music:save-state', state),
    loadState: () => ipcRenderer.invoke('music:load-state'),
  },
  notes: {
    list: (payload) => ipcRenderer.invoke('notes:list', payload),
    get: (id) => ipcRenderer.invoke('notes:get', id),
    create: (note) => ipcRenderer.invoke('notes:create', note),
    update: (id, patch) => ipcRenderer.invoke('notes:update', { id, patch }),
    archive: (id) => ipcRenderer.invoke('notes:archive', id),
    unarchive: (id) => ipcRenderer.invoke('notes:unarchive', id),
    trash: (id) => ipcRenderer.invoke('notes:trash', id),
    restore: (id) => ipcRenderer.invoke('notes:restore', id),
    permanentDelete: (id) => ipcRenderer.invoke('notes:permanent-delete', id),
    emptyTrash: () => ipcRenderer.invoke('notes:empty-trash'),
    labelsList: () => ipcRenderer.invoke('notes:labels-list'),
    labelsCreate: (name) => ipcRenderer.invoke('notes:labels-create', name),
    labelsRename: (from, to) => ipcRenderer.invoke('notes:labels-rename', { from, to }),
    labelsDelete: (name) => ipcRenderer.invoke('notes:labels-delete', name),
    settingsGet: () => ipcRenderer.invoke('notes:settings-get'),
    settingsUpdate: (patch) => ipcRenderer.invoke('notes:settings-update', patch),
    setReminder: (id, at) => ipcRenderer.invoke('notes:set-reminder', { id, at }),
    clearReminder: (id) => ipcRenderer.invoke('notes:clear-reminder', id),
    snoozeReminder: (id, minutes) => ipcRenderer.invoke('notes:snooze-reminder', { id, minutes }),
    duplicate: (id) => ipcRenderer.invoke('notes:duplicate', id),
    exportMarkdown: (id) => ipcRenderer.invoke('notes:export-markdown', id),
    bulkAction: (ids, action, payload) => ipcRenderer.invoke('notes:bulk-action', { ids, action, payload }),
    attachImage: (noteId, arrayBuffer, filename, mime) => ipcRenderer.invoke('notes:attach-image', { noteId, arrayBuffer, filename, mime }),
    removeAttachment: (noteId, attachmentId) => ipcRenderer.invoke('notes:remove-attachment', { noteId, attachmentId }),
  },
});

