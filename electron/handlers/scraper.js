const { ipcMain } = require('electron');

function registerScraperHandlers() {
  ipcMain.handle('scraper:run', async (_event, payload = {}) => ({
    status: 'ready',
    scope: 'scraper',
    message: 'Base handler for scraper tasks initialized.',
    payload,
  }));

  ipcMain.handle('automation:run', async (_event, payload = {}) => ({
    status: 'ready',
    scope: 'automation',
    message: 'Base handler for automation tasks initialized.',
    payload,
  }));
}

module.exports = {
  registerScraperHandlers,
};
