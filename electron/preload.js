const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperApp', {
  clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
  runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
  downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
  inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
  parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
});
