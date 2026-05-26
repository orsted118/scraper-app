const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperApp', {
  clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
  runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
  runCIA: () => ipcRenderer.invoke('cia:run'),
  runHorario: () => ipcRenderer.invoke('horario:run'),
  clearCIACache: () => ipcRenderer.invoke('cia:clear-cache'),
  clearHorarioCache: () => ipcRenderer.invoke('horario:clear-cache'),
  saveHorarioLink: (numeroClase, link) =>
    ipcRenderer.invoke('horario:save-link', { numeroClase, link }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
  checkNotifications: (activities) => ipcRenderer.invoke('notifications:check', activities),
  onProgress: (callback) => ipcRenderer.on('scraper:progress', (_event, data) => callback(data)),
  removeProgress: () => ipcRenderer.removeAllListeners('scraper:progress'),
  downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
  inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
  parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  syncAll: () => ipcRenderer.invoke('sync:all'),
});
