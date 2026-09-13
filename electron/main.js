const { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Chromium empaquetado en extraResources/ms-playwright/. En dev queda el default
// (%LOCALAPPDATA%/ms-playwright). Debe setearse ANTES del primer require de un
// handler que `require('playwright')`.
if (app.isPackaged) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, 'ms-playwright');
}

const { autoUpdater } = require('electron-updater');
const { registerScraperHandlers } = require('./handlers/scraper');
const { registerCIAHandlers } = require('./handlers/cia');
const { registerFileHandlers } = require('./handlers/files');
const { getCachedHorario, registerHorarioHandlers } = require('./handlers/horario');
const { registerSettingsHandlers } = require('./handlers/settings');
const { registerCredentialHistoryHandlers } = require('./handlers/credential-history');
const { registerAssignmentUploadHandlers } = require('./handlers/assignment-upload');
const { registerNotificationHandlers, startClassNotifier } = require('./handlers/notifications');
const notificationCenter = require('./handlers/notification-center');
const { registerNoticesHandlers } = require('./handlers/notices');
const { registerActivityAnalyzerHandlers } = require('./handlers/activity-analyzer');
const { registerHiddenActivitiesHandlers } = require('./handlers/hidden-activities');
const { getDemoActivities, isDemoModeEnabled } = require('./handlers/demo-activities');
const { registerPortalSistemasHandlers } = require('./handlers/portal-sistemas');
const {
  registerMusicHandlers,
  registerMusicProtocol,
  registerMusicScheme,
  startAllWatchers,
  stopAllWatchers,
} = require('./handlers/music');
const { registerMusicFavoritesHandlers } = require('./handlers/music-favorites');
const { registerMusicHistoryHandlers } = require('./handlers/music-history');
const { registerMusicPlaylistsHandlers } = require('./handlers/music-playlists');
const { registerNotesHandlers, registerNoteImageScheme } = require('./handlers/notes');
const { registerNoteImproverHandlers } = require('./handlers/note-improver');
const { registerLlmStatusHandlers } = require('./handlers/llm-status');
const { registerMaterialHandlers } = require('./handlers/material');
const { registerAttendanceHandlers } = require('./handlers/attendance');
const { registerPromptBuilderHandlers } = require('./handlers/prompt-builder');
const { registerDriveHandlers } = require('./handlers/drive');
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

// Sin AppUserModelID Windows agrupa la ventana bajo "Electron" en la taskbar y
// pinta el ícono default de Electron, aunque electron-builder puso el nuestro
// en el .exe. Debe coincidir con `appId` de electron-builder.
if (process.platform === 'win32') {
  app.setAppUserModelId('mx.itson.dvpotro');
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
  registerMaterialHandlers();
  registerAttendanceHandlers();
  registerPromptBuilderHandlers();
  registerDriveHandlers();
  registerCIAHandlers();
  registerHorarioHandlers();
  registerFileHandlers();
  registerSettingsHandlers();
  registerCredentialHistoryHandlers();
  registerAssignmentUploadHandlers();
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
  // Vigila las carpetas ya configuradas: altas y bajas de archivos se reflejan
  // sin que el usuario pida un re-escaneo.
  startAllWatchers();
  registerMusicFavoritesHandlers();
  registerMusicHistoryHandlers();
  registerMusicPlaylistsHandlers();
  // Revela el archivo en el explorador del sistema. No abre nada: seleccionar
  // en una carpeta no ejecuta ni entrega contenido al renderer.
  ipcMain.handle('music:show-in-folder', async (_event, filePath) => {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return { ok: false, error: 'Ruta vacía.' };
    }

    shell.showItemInFolder(filePath);
    return { ok: true };
  });
  registerNotesHandlers();
  registerNoteImproverHandlers();
  registerLlmStatusHandlers();
  notificationCenter.startSchedulers();
  ipcMain.handle('calendario:run', (_event, options) => calendarioHandler.run(options || {}));
  ipcMain.handle('calendario:clear-cache', () => calendarioHandler.clearCache());
  ipcMain.removeHandler('shell:open-external');
  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      await shell.openExternal(url);
    }
  });
  // El sync-all real lo orquesta `handleSyncAll` en App.jsx, que sí incluye
  // material y asistencia. Acá vivía un segundo registro que nadie llamaba y
  // que había quedado atrás: arreglar el equivocado es exactamente cómo
  // calificaciones terminó sin sincronizarse nunca.
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
  // Los watchers mantienen handles de archivo abiertos: sin cerrarlos quedan
  // colgados del proceso al salir.
  stopAllWatchers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

