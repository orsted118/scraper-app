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
  getAutoSyncSettings: () => ipcRenderer.invoke('settings:get-auto-sync'),
  setAutoSyncSettings: (payload) => ipcRenderer.invoke('settings:set-auto-sync', payload),
  onPowerResume: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('power:resume', listener);
    return () => ipcRenderer.removeListener('power:resume', listener);
  },
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
  analyzer: {
    extractRequirements: (activity) =>
      ipcRenderer.invoke('activity-analyzer:extract-requirements', activity),
    verifySubmission: (requirements, submissionData, activityId) =>
      ipcRenderer.invoke('activity-analyzer:verify-submission', { requirements, submissionData, activityId }),
    parseFile: (payload) => ipcRenderer.invoke('activity-analyzer:parse-file', payload),
  },
  favorites: {
    list: () => ipcRenderer.invoke('music-favorites:list'),
    add: (filePath) => ipcRenderer.invoke('music-favorites:add', filePath),
    remove: (filePath) => ipcRenderer.invoke('music-favorites:remove', filePath),
  },
  playlists: {
    list: () => ipcRenderer.invoke('music-playlists:list'),
    create: (name) => ipcRenderer.invoke('music-playlists:create', { name }),
    rename: (id, name) => ipcRenderer.invoke('music-playlists:rename', { id, name }),
    delete: (id) => ipcRenderer.invoke('music-playlists:delete', { id }),
    addTrack: (playlistId, trackPath) =>
      ipcRenderer.invoke('music-playlists:add-track', { playlistId, trackPath }),
    removeTrack: (playlistId, trackPath) =>
      ipcRenderer.invoke('music-playlists:remove-track', { playlistId, trackPath }),
    reorder: (playlistId, fromIndex, toIndex) =>
      ipcRenderer.invoke('music-playlists:reorder', { playlistId, fromIndex, toIndex }),
    // Elegir, leer y guardar la portada ocurre entero en main: acá solo viaja el
    // id. No hay forma de pedirle al puente que lea un archivo por ruta.
    pickCover: (playlistId) => ipcRenderer.invoke('music-playlists:pick-cover', { playlistId }),
    removeCover: (playlistId) => ipcRenderer.invoke('music-playlists:remove-cover', { playlistId }),
    importM3u: (filePath) => ipcRenderer.invoke('music-playlists:import-m3u', { filePath }),
    pickM3u: () => ipcRenderer.invoke('music-playlists:pick-m3u'),
  },
  history: {
    list: () => ipcRenderer.invoke('music-history:list'),
    add: (filePath, playedAt) => ipcRenderer.invoke('music-history:add', { path: filePath, playedAt }),
    clear: () => ipcRenderer.invoke('music-history:clear'),
  },
  hiddenActivities: {
    get: () => ipcRenderer.invoke('hidden-activities:get'),
    add: (id) => ipcRenderer.invoke('hidden-activities:add', id),
    remove: (id) => ipcRenderer.invoke('hidden-activities:remove', id),
  },
  portalSistemas: {
    getProfile: () => ipcRenderer.invoke('portal-sistemas:get-profile'),
    refreshProfile: () => ipcRenderer.invoke('portal-sistemas:refresh-profile'),
    getCredential: () => ipcRenderer.invoke('portal-sistemas:get-credential'),
  },
  music: {
    pickFolder: () => ipcRenderer.invoke('music:pick-folder'),
    scanFolder: (folderPath) => ipcRenderer.invoke('music:scan-folder', folderPath),
    addFolder: (folderPath) => ipcRenderer.invoke('music:add-folder', folderPath),
    removeFolder: (folderPath) => ipcRenderer.invoke('music:remove-folder', folderPath),
    listFolders: () => ipcRenderer.invoke('music:list-folders'),
    // Altas y bajas detectadas por el watcher. Se quita el listener puntual
    // (no removeAllListeners) para que dos suscriptores no se pisen.
    onLibraryUpdated: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('music-library:updated', listener);
      return () => ipcRenderer.removeListener('music-library:updated', listener);
    },
    getLibrary: () => ipcRenderer.invoke('music:get-library'),
    // Devuelve el .lrc crudo o null. main valida que la pista esté dentro de la
    // biblioteca antes de tocar el disco: el renderer no elige qué se lee.
    readLyrics: (trackPath) => ipcRenderer.invoke('music:read-lyrics', trackPath),
    refresh: () => ipcRenderer.invoke('music:refresh'),
    saveState: (state) => ipcRenderer.invoke('music:save-state', state),
    loadState: () => ipcRenderer.invoke('music:load-state'),
    // Teclas multimedia del teclado, capturadas por globalShortcut en main.
    // Se quitan los listeners uno por uno (no removeAllListeners) para que dos
    // suscriptores no se pisen entre sí.
    showInFolder: (filePath) => ipcRenderer.invoke('music:show-in-folder', filePath),
    onMediaKey: (callback) => {
      const channels = {
        'media-key:play-pause': 'play-pause',
        'media-key:next': 'next',
        'media-key:prev': 'prev',
      };
      const listeners = Object.entries(channels).map(([channel, key]) => {
        const listener = () => callback(key);
        ipcRenderer.on(channel, listener);
        return [channel, listener];
      });

      return () => {
        for (const [channel, listener] of listeners) {
          ipcRenderer.removeListener(channel, listener);
        }
      };
    },
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
    improve: (html) => ipcRenderer.invoke('notes:improve', { html }),
    bulkAction: (ids, action, payload) => ipcRenderer.invoke('notes:bulk-action', { ids, action, payload }),
    attachImage: (noteId, arrayBuffer, filename, mime) => ipcRenderer.invoke('notes:attach-image', { noteId, arrayBuffer, filename, mime }),
    removeAttachment: (noteId, attachmentId) => ipcRenderer.invoke('notes:remove-attachment', { noteId, attachmentId }),
  },
  // Diagnóstico de los backends LLM. Solo lectura: nada de acá cambia el
  // routing ni expone el valor de las keys, apenas sus nombres de variable.
  llm: {
    probeAll: (opts) => ipcRenderer.invoke('llm:probe-all', opts),
    usageStats: (opts) => ipcRenderer.invoke('llm:usage-stats', opts),
    currentOrder: () => ipcRenderer.invoke('llm:current-order'),
  },
});

