# Report 011
**Fecha:** 2026-05-15 18:56  
**Agente:** Codex  
**Tipo:** feature

## Archivos modificados
- `electron/handlers/settings.js` — archivo creado como parte de la base inicial
- `electron/main.js` — archivo actualizado en esta tarea
- `electron/preload.js` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea

## Resumen
Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `electron/handlers/settings.js`
```diff
diff --git a/electron/handlers/settings.js b/electron/handlers/settings.js
new file mode 100644
index 0000000..51932ef
--- /dev/null
+++ b/electron/handlers/settings.js
@@ -0,0 +1,80 @@
+const fs = require('fs');
+const path = require('path');
+const { ipcMain } = require('electron');
+
+function getEnvFilePath() {
+  return path.resolve(__dirname, '..', '..', '.env');
+}
+
+function readEnvLines() {
+  const envPath = getEnvFilePath();
+
+  if (!fs.existsSync(envPath)) {
+    return [];
+  }
+
+  return fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
+}
+
+function getSettings() {
+  return {
+    user: process.env.IVIRTUAL_USER || '',
+    hasPassword: Boolean(process.env.IVIRTUAL_PASS),
+  };
+}
+
+function upsertEnvValue(lines, key, value) {
+  const nextLine = `${key}=${value}`;
+  const lineIndex = lines.findIndex((line) => line.startsWith(`${key}=`));
+
+  if (lineIndex >= 0) {
+    lines[lineIndex] = nextLine;
+    return lines;
+  }
+
+  return [...lines, nextLine];
+}
+
+function saveSettings({ user, password }) {
+  try {
+    const normalizedUser = typeof user === 'string' ? user.trim() : '';
+    const normalizedPassword = typeof password === 'string' ? password : '';
+
+    if (!normalizedUser) {
+      return { success: false, error: 'El ID de usuario es requerido.' };
+    }
+
+    let envLines = readEnvLines().filter((line) => line.trim().length > 0);
+    envLines = upsertEnvValue(envLines, 'IVIRTUAL_USER', normalizedUser);
+
+    if (normalizedPassword.trim()) {
+      envLines = upsertEnvValue(envLines, 'IVIRTUAL_PASS', normalizedPassword);
+      process.env.IVIRTUAL_PASS = normalizedPassword;
+    }
+
+    const envPath = getEnvFilePath();
+    const envContents = `${envLines.join('\n')}\n`;
+
+    fs.writeFileSync(envPath, envContents, 'utf8');
+    process.env.IVIRTUAL_USER = normalizedUser;
+
+    return { success: true };
+  } catch (error) {
+    return {
+      success: false,
+      error: error?.message || 'No fue posible guardar las credenciales.',
+    };
+  }
+}
+
+function registerSettingsHandlers() {
+  ipcMain.handle('settings:get', async () => getSettings());
+  ipcMain.handle('settings:save', async (_event, payload) => saveSettings(payload || {}));
+}
+
+module.exports = {
+  getEnvFilePath,
+  getSettings,
+  registerSettingsHandlers,
+  saveSettings,
+};
```

### `electron/main.js`
```diff
diff --git a/electron/main.js b/electron/main.js
index 7cc6443..0d454a5 100644
--- a/electron/main.js
+++ b/electron/main.js
@@ -4,6 +4,7 @@ const { app, BrowserWindow } = require('electron');
 const path = require('path');
 const { registerScraperHandlers } = require('./handlers/scraper');
 const { registerFileHandlers } = require('./handlers/files');
+const { registerSettingsHandlers } = require('./handlers/settings');
 
 function createMainWindow() {
   const mainWindow = new BrowserWindow({
@@ -32,6 +33,7 @@ function createMainWindow() {
 app.whenReady().then(() => {
   registerScraperHandlers();
   registerFileHandlers();
+  registerSettingsHandlers();
   createMainWindow();
 
   app.on('activate', () => {
```

### `electron/preload.js`
```diff
diff --git a/electron/preload.js b/electron/preload.js
index 91f5e6d..507717a 100644
--- a/electron/preload.js
+++ b/electron/preload.js
@@ -3,6 +3,8 @@ const { contextBridge, ipcRenderer } = require('electron');
 contextBridge.exposeInMainWorld('scraperApp', {
   clearCache: () => ipcRenderer.invoke('scraper:clear-cache'),
   runScraper: (payload) => ipcRenderer.invoke('scraper:run', payload),
+  getSettings: () => ipcRenderer.invoke('settings:get'),
+  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
   onProgress: (callback) => ipcRenderer.on('scraper:progress', (_event, data) => callback(data)),
   removeProgress: () => ipcRenderer.removeAllListeners('scraper:progress'),
   downloadFile: (url, name) => ipcRenderer.invoke('files:download', { url, name }),
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index c0fd191..9d4c12d 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -1,34 +1,209 @@
-import { FolderCog, ShieldCheck } from 'lucide-react';
+import { AlertCircle, CheckCircle, FolderCog, Loader2, ShieldCheck } from 'lucide-react';
+import { useEffect, useState } from 'react';
+
+function Ajustes({ error, lastSyncAt, loading }) {
+  const api = typeof window !== 'undefined' ? window.scraperApp : null;
+  const [user, setUser] = useState('');
+  const [password, setPassword] = useState('');
+  const [hasPassword, setHasPassword] = useState(false);
+  const [settingsLoading, setSettingsLoading] = useState(true);
+  const [saving, setSaving] = useState(false);
+  const [feedback, setFeedback] = useState({ type: '', message: '' });
+
+  useEffect(() => {
+    let mounted = true;
+
+    const loadSettings = async () => {
+      if (!api) {
+        if (mounted) {
+          setFeedback({
+            type: 'error',
+            message: 'ScraperApp debe ejecutarse dentro de Electron para administrar credenciales.',
+          });
+          setSettingsLoading(false);
+        }
+        return;
+      }
+
+      try {
+        const response = await api.getSettings();
+
+        if (!mounted) {
+          return;
+        }
+
+        setUser(response?.user || '');
+        setHasPassword(Boolean(response?.hasPassword));
+      } catch (_error) {
+        if (mounted) {
+          setFeedback({
+            type: 'error',
+            message: 'No fue posible leer la configuración actual.',
+          });
+        }
+      } finally {
+        if (mounted) {
+          setSettingsLoading(false);
+        }
+      }
+    };
+
+    loadSettings();
+
+    return () => {
+      mounted = false;
+    };
+  }, [api]);
+
+  const handleSubmit = async (event) => {
+    event.preventDefault();
+
+    if (!api) {
+      setFeedback({
+        type: 'error',
+        message: 'ScraperApp debe ejecutarse dentro de Electron para guardar credenciales.',
+      });
+      return;
+    }
+
+    setSaving(true);
+    setFeedback({ type: '', message: '' });
+
+    try {
+      const result = await api.saveSettings({ user, password });
+
+      if (!result?.success) {
+        setFeedback({
+          type: 'error',
+          message: result?.error || 'No fue posible guardar las credenciales.',
+        });
+        return;
+      }
+
+      setPassword('');
+      setHasPassword(true);
+      setFeedback({
+        type: 'success',
+        message: 'Credenciales guardadas correctamente',
+      });
+    } catch (_error) {
+      setFeedback({
+        type: 'error',
+        message: 'No fue posible guardar las credenciales.',
+      });
+    } finally {
+      setSaving(false);
+    }
+  };
 
-function Ajustes({ lastSyncAt }) {
   return (
-    <div className="grid gap-4 lg:grid-cols-2">
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-        <div className="flex items-start gap-3">
-          <FolderCog className="mt-1 h-5 w-5 text-itson-blue" />
-          <div>
-            <h3 className="text-xl font-semibold text-white">Configuración local</h3>
-            <p className="mt-2 text-sm leading-6 text-slate-400">
-              ScraperApp usa variables locales en <code>.env</code> para autenticarse contra iVirtual.
-              El archivo está ignorado por Git y se carga desde el proceso principal de Electron.
-            </p>
-          </div>
+    <div className="space-y-6">
+      {error ? (
+        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
+          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+          <p>{error}</p>
         </div>
-      </section>
-
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
-        <div className="flex items-start gap-3">
-          <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
-          <div>
-            <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
-            <ul className="mt-3 space-y-2 text-sm text-slate-300">
-              <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
-              <li>Extracción por curso usando el índice de tareas de Moodle.</li>
-              <li>Última sincronización registrada: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</li>
-            </ul>
-          </div>
+      ) : null}
+
+      {feedback.message ? (
+        <div
+          className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-sm ${
+            feedback.type === 'success'
+              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
+              : 'border border-red-500/30 bg-red-500/10 text-red-100'
+          }`}
+        >
+          {feedback.type === 'success' ? (
+            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
+          ) : (
+            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
+          )}
+          <p>{feedback.message}</p>
         </div>
-      </section>
+      ) : null}
+
+      <div className="grid gap-4 lg:grid-cols-2">
+        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+          <div className="flex items-start gap-3">
+            <FolderCog className="mt-1 h-5 w-5 text-itson-blue" />
+            <div className="w-full">
+              <h3 className="text-xl font-semibold text-white">Configuración local</h3>
+              <p className="mt-2 text-sm leading-6 text-slate-400">
+                ScraperApp usa variables locales en <code>.env</code> para autenticarse contra iVirtual.
+                Ahora puedes administrarlas desde la app sin editar archivos manualmente.
+              </p>
+            </div>
+          </div>
+
+          {settingsLoading ? (
+            <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
+              <Loader2 className="h-4 w-4 animate-spin" />
+              Cargando configuración...
+            </div>
+          ) : (
+            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
+              <label className="block space-y-2">
+                <span className="text-sm font-medium text-slate-200">ID de usuario</span>
+                <input
+                  type="text"
+                  value={user}
+                  onChange={(event) => setUser(event.target.value)}
+                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+                  placeholder="Ej. 00000279009"
+                />
+              </label>
+
+              <label className="block space-y-2">
+                <span className="text-sm font-medium text-slate-200">Contraseña</span>
+                <input
+                  type="password"
+                  value={password}
+                  onChange={(event) => setPassword(event.target.value)}
+                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
+                  placeholder="••••••••"
+                />
+                <p className="text-xs text-slate-500">
+                  {hasPassword
+                    ? 'Si dejas este campo vacío, se conservará la contraseña actual.'
+                    : 'Aún no hay contraseña guardada en la configuración local.'}
+                </p>
+              </label>
+
+              <button
+                type="submit"
+                disabled={saving || settingsLoading}
+                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+              >
+                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
+                {saving ? 'Guardando...' : 'Guardar credenciales'}
+              </button>
+            </form>
+          )}
+        </section>
+
+        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+          <div className="flex items-start gap-3">
+            <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
+            <div>
+              <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
+              <ul className="mt-3 space-y-2 text-sm text-slate-300">
+                <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
+                <li>Extracción por curso usando el índice de tareas de Moodle.</li>
+                <li>
+                  {loading ? (
+                    <span className="inline-flex items-center gap-2">
+                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
+                      Sincronizando...
+                    </span>
+                  ) : (
+                    <>Última sincronización: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</>
+                  )}
+                </li>
+              </ul>
+            </div>
+          </div>
+        </section>
+      </div>
     </div>
   );
 }
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
