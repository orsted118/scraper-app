const fs = require('fs');
const path = require('path');
const { app, ipcMain, session, shell } = require('electron');

function listFilesRecursive(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) {
    return results;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        listFilesRecursive(fullPath, results);
      } else if (stat.isFile()) {
        results.push({
          name: entry.name,
          path: fullPath,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      }
    } catch (_error) {
      // Skip files that cannot be inspected
    }
  }

  return results;
}

function registerArchivosHandlers() {
  ipcMain.handle('archivos:get-recientes', async () => {
    try {
      const downloadsDir = app.getPath('downloads');
      const archivos = listFilesRecursive(downloadsDir)
        .sort((left, right) => new Date(right.modified).getTime() - new Date(left.modified).getTime())
        .slice(0, 20);

      return { success: true, data: archivos };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('archivos:abrir', async (_event, filePath = '') => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Ruta de archivo inválida.' };
      }

      const result = await shell.openPath(filePath);
      if (result) {
        return { success: false, error: result };
      }

      return { success: true, data: { path: filePath } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('archivos:mostrar-en-carpeta', async (_event, filePath = '') => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Ruta de archivo inválida.' };
      }

      shell.showItemInFolder(filePath);

      return { success: true, data: { path: filePath } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

module.exports = {
  registerArchivosHandlers,
};
