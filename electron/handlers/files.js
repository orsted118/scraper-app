const { ipcMain } = require('electron');

function registerFileHandlers() {
  ipcMain.handle('files:inspect', async (_event, payload = {}) => ({
    status: 'ready',
    scope: 'files',
    message: 'Base handler for file inspection initialized.',
    payload,
  }));

  ipcMain.handle('files:parse', async (_event, payload = {}) => ({
    status: 'ready',
    scope: 'files',
    message: 'Base handler for local file parsing initialized.',
    payload,
  }));
}

module.exports = {
  registerFileHandlers,
};
