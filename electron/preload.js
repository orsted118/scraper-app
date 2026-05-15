const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperApp', {
  runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
  runAutomation: (payload) => ipcRenderer.invoke('automation:run', payload),
  inspectFile: (payload) => ipcRenderer.invoke('files:inspect', payload),
  parseFile: (payload) => ipcRenderer.invoke('files:parse', payload),
});
