const { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { registerScraperHandlers } = require('./handlers/scraper');
const { registerCIAHandlers } = require('./handlers/cia');
const { registerFileHandlers } = require('./handlers/files');
const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
const { registerSettingsHandlers } = require('./handlers/settings');
const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
const notificationCenter = require('./handlers/notification-center');
const { registerNoticesHandlers } = require('./handlers/notices');
const { registerActivityAnalyzerHandlers } = require('./handlers/activity-analyzer');
const { registerHiddenActivitiesHandlers } = require('./handlers/hidden-activities');
const { getDemoActivities, isDemoModeEnabled } = require('./handlers/demo-activities');
const { registerPortalSistemasHandlers } = require('./handlers/portal-sistemas');
const { registerMusicHandlers, registerMusicProtocol, registerMusicScheme } = require('./handlers/music');
const { registerNotesHandlers, registerNoteImageScheme } = require('./handlers/notes');
const calendarioHandler = require('./handlers/calendario');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const appIconPath = path.join(__dirname, '..', 'build', process.platform === 'darwin' ? 'icon.icns' : 'icon.ico');
const envPath = isDev
  ? path.resolve(__dirname, '..', '.env')
  : path.join(app.getPath('userData'), '.env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Los privilegios de schemes custom deben registrarse ANTES de app.whenReady().
registerMusicScheme();
registerNoteImageScheme();

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
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// El renderer decide si sincroniza: main solo avisa que la máquina despertó.
function registerPowerMonitor() {
  const broadcastResume = (reason) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('power:resume', { reason });
    }
  };

  powerMonitor.on('resume', () => broadcastResume('resume'));
  powerMonitor.on('unlock-screen', () => broadcastResume('unlock-screen'));
}

// Teclas multimedia físicas del teclado. globalShortcut captura a nivel OS, así
// que responden con DVPotro en segundo plano — que es el punto. Complementa a
// MediaSession, que solo cubre los controles que Windows dibuja (volume flyout).
const MEDIA_KEYS = [
  ['MediaPlayPause', 'media-key:play-pause'],
  ['MediaNextTrack', 'media-key:next'],
  ['MediaPreviousTrack', 'media-key:prev'],
];

function registerMediaKeys() {
  for (const [accelerator, channel] of MEDIA_KEYS) {
    const registered = globalShortcut.register(accelerator, () => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(channel);
      }
    });

    if (!registered) {
      // Otra app (Spotify, el propio Windows) ya se quedó con la tecla. No es
      // fatal: el resto del reproductor funciona igual.
      console.warn(`[media-keys] ${accelerator} ya está tomada por otra aplicación.`);
    }
  }
}

app.whenReady().then(() => {
  app.setName('DVPotro');
  registerScraperHandlers();
  registerCIAHandlers();
  registerHorarioHandlers();
  registerFileHandlers();
  registerSettingsHandlers();
  registerNotificationHandlers();
  notificationCenter.registerNotificationCenter();
  registerNoticesHandlers();
  registerActivityAnalyzerHandlers();
  registerHiddenActivitiesHandlers();

  // Con DVPOTRO_DEMO_ACTIVITIES=1 el scraper queda pisado por consignas de
  // ejemplo: permite ejercitar el analizador contra el LLM real mientras los
  // portales están vacíos. Sin la variable, el scraper real sigue intacto.
  if (isDemoModeEnabled()) {
    const { activities: demoList } = getDemoActivities();
    const ids = demoList.map((a) => a.id).join(', ');
    console.log(`[demo] DVPOTRO_DEMO_ACTIVITIES=1 detectado — scraper:run pisado por ${demoList.length} consignas de ejemplo (${ids}).`);
    ipcMain.removeHandler('scraper:run');
    ipcMain.handle('scraper:run', async () => {
      console.log('[demo] sirviendo actividades de ejemplo en lugar de scrapear iVirtual.');
      return getDemoActivities();
    });
  } else {
    console.log('[demo] DVPOTRO_DEMO_ACTIVITIES no está seteado — scraper real activo. Usa `npm run start:demo` para probar el analizador sin scraper.');
  }
  registerPortalSistemasHandlers();
  registerMusicHandlers();
  registerMusicProtocol();
  registerNotesHandlers();
  notificationCenter.startSchedulers();
  ipcMain.handle('calendario:run', (_event, options) => calendarioHandler.run(options || {}));
  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
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
    calendarioHandler.clearCache();

    const [actividades, horario, calificaciones, calendario] = await Promise.allSettled([
      getActivitiesWithCache(),
      getHorarioWithCache(),
      getCalificacionesWithCache(),
      calendarioHandler.run({}),
    ]);

    const summaryParts = [];
    if (actividades.status === 'fulfilled' && !actividades.value?.error) {
      summaryParts.push(`${(actividades.value?.activities || []).length} actividades`);
    }
    if (horario.status === 'fulfilled' && !horario.value?.error) {
      summaryParts.push(`${(horario.value?.materias || []).length} materias`);
    }
    if (calificaciones.status === 'fulfilled' && !calificaciones.value?.error) {
      summaryParts.push(`${(calificaciones.value?.materias || []).length} boletas`);
    }
    if (calendario.status === 'fulfilled' && !calendario.value?.error) {
      summaryParts.push(`${(calendario.value?.events || []).length} eventos del calendario`);
    }
    if (summaryParts.length > 0) {
      notificationCenter.emitSyncAllSummary(summaryParts);
    }

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
      calendario:
        calendario.status === 'fulfilled'
          ? calendario.value
          : { error: calendario.reason?.message },
    };
  });
  registerPowerMonitor();
  createMainWindow();
  registerMediaKeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Sin esto los accelerators quedan tomados a nivel OS después de cerrar y
// ninguna otra app puede reclamarlos hasta reiniciar sesión.
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

