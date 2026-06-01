const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { registerScraperHandlers } = require('./handlers/scraper');
const { registerCIAHandlers } = require('./handlers/cia');
const { registerFileHandlers } = require('./handlers/files');
const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
const { registerSettingsHandlers } = require('./handlers/settings');
const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
const envPath = isDev
  ? path.resolve(__dirname, '..', '.env')
  : path.join(app.getPath('userData'), '.env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    title: 'DVPotro',
    icon: appIconPath,
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  mainWindow.webContents.once('did-finish-load', () => {
    startClassNotifier(getCachedHorario);
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  app.setName('DVPotro');
  registerScraperHandlers();
  registerCIAHandlers();
  registerHorarioHandlers();
  registerFileHandlers();
  registerSettingsHandlers();
  registerNotificationHandlers();
  ipcMain.removeHandler('shell:open-external');
  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      await shell.openExternal(url);
    }
  });
  ipcMain.removeHandler('sync:all');
  ipcMain.handle('sync:all', async () => {
    const { getActivitiesWithCache, clearActivitiesCache } = require('./handlers/scraper');
    const { getHorarioWithCache, clearHorarioCache } = require('./handlers/horario');
    const { getCalificacionesWithCache, clearCIACache } = require('./handlers/cia');

    clearActivitiesCache();
    clearHorarioCache();
    clearCIACache();

    const [actividades, horario, calificaciones] = await Promise.allSettled([
      getActivitiesWithCache(),
      getHorarioWithCache(),
      getCalificacionesWithCache(),
    ]);

    return {
      actividades:
        actividades.status === 'fulfilled'
          ? actividades.value
          : { error: actividades.reason?.message },
      horario:
        horario.status === 'fulfilled' ? horario.value : { error: horario.reason?.message },
      calificaciones:
        calificaciones.status === 'fulfilled'
          ? calificaciones.value
          : { error: calificaciones.reason?.message },
    };
  });
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
