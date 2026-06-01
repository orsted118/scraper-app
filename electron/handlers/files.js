const fs = require('fs');
const path = require('path');
const { app, ipcMain, session, shell } = require('electron');

const SAFE_OPEN_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.rtf', '.csv', '.png', '.jpg', '.jpeg', '.gif',
  '.bmp', '.svg', '.webp', '.mp4', '.mp3', '.wav', '.ogg',
]);

function sanitizeFileName(name) {
  const sanitized = (name || '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || 'archivo-descargado';
}

function getFileNameFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const baseName = path.basename(parsedUrl.pathname || '');
    if (!baseName || baseName === '/') {
      return '';
    }

    try {
      return decodeURIComponent(baseName);
    } catch (_error) {
      return baseName;
    }
  } catch (_error) {
    return '';
  }
}

function resolveDownloadPath(downloadsDir, fileName) {
  const parsed = path.parse(fileName);
  let candidatePath = path.join(downloadsDir, fileName);
  let index = 1;

  while (fs.existsSync(candidatePath)) {
    candidatePath = path.join(downloadsDir, `${parsed.name} (${index})${parsed.ext}`);
    index += 1;
  }

  return candidatePath;
}

function downloadFileWithSession(url, name) {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ success: false, error: 'URL de descarga no proporcionada.' });
      return;
    }

    const downloadsDir = app.getPath('downloads');
    const resolvedName = sanitizeFileName(name || getFileNameFromUrl(url) || 'archivo-descargado');
    const targetPath = resolveDownloadPath(downloadsDir, resolvedName);
    let settled = false;

    const cleanup = () => {
      session.defaultSession.removeListener('will-download', handleWillDownload);
      clearTimeout(timeoutId);
    };

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    const handleWillDownload = (_event, item) => {
      const itemUrl = item.getURL();
      if (itemUrl !== url) {
        try {
          const originalHost = new URL(url).hostname;
          const itemHost = new URL(itemUrl).hostname;
          if (originalHost !== itemHost) {
            return;
          }
        } catch (_urlError) {
          return;
        }
      }

      item.setSavePath(targetPath);
      item.once('done', async (_downloadEvent, state) => {
        if (state !== 'completed') {
          finish({ success: false, error: `La descarga no se completó: ${state}.` });
          return;
        }

        const ext = path.extname(targetPath).toLowerCase();

        if (SAFE_OPEN_EXTENSIONS.has(ext)) {
          const openError = await shell.openPath(targetPath);

          if (openError) {
            finish({ success: false, error: openError });
            return;
          }
        } else {
          shell.showItemInFolder(targetPath);
        }

        finish({ success: true, path: targetPath });
      });
    };

    const timeoutId = setTimeout(() => {
      finish({ success: false, error: 'La descarga excedió el tiempo de espera.' });
    }, 120000);

    session.defaultSession.on('will-download', handleWillDownload);

    try {
      session.defaultSession.downloadURL(url);
    } catch (error) {
      finish({ success: false, error: error.message || 'No fue posible iniciar la descarga.' });
    }
  });
}

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

  ipcMain.handle('files:download', async (_event, payload = {}) =>
    downloadFileWithSession(payload.url, payload.name),
  );
}

module.exports = {
  downloadFileWithSession,
  registerFileHandlers,
};
