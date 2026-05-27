# Report 052
**Fecha:** 2026-05-26 17:43  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** 7d28ef4 — revert: restaurar diseño v1 desde backup
**Archivos modificados:** 12

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/ThemeContext.jsx` — archivo creado como parte de la base inicial
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/components/TaskPanel.jsx` — archivo actualizado en esta tarea
- `src/index.css` — archivo actualizado en esta tarea
- `src/main.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/pages/Calificaciones.jsx` — archivo actualizado en esta tarea
- `src/pages/Horario.jsx` — archivo actualizado en esta tarea
- `src/themes.js` — archivo creado como parte de la base inicial

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 5 | 5 |
| src/App.jsx | 1 | 1 |
| src/ThemeContext.jsx | 45 | 0 |
| src/components/Sidebar.jsx | 15 | 5 |
| src/components/TaskPanel.jsx | 14 | 5 |
| src/index.css | 15 | 3 |
| src/main.jsx | 4 | 1 |
| src/pages/Actividades.jsx | 17 | 7 |
| src/pages/Ajustes.jsx | 74 | 1 |
| src/pages/Calificaciones.jsx | 16 | 5 |
| src/pages/Horario.jsx | 14 | 4 |
| src/themes.js | 84 | 0 |

## Resumen
Se registraron 12 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index da9138c..06b5932 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -26,14 +26,14 @@ const VERIFICATION = {
 
 vite v5.4.21 building for production...
 transforming...
-✓ 1762 modules transformed.
+✓ 1764 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                        0.41 kB | gzip: 0.27 kB
+dist/index.html                        0.41 kB | gzip: 0.28 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-naYlnb2n.css        22.09 kB | gzip: 5.06 kB
-dist/assets/index-BvkqC4uS.js        215.33 kB | gzip: 63.23 kB
-✓ built in 5.20s
+dist/assets/index-BMP17a7U.css        22.76 kB | gzip: 5.24 kB
+dist/assets/index-D6_SpU8j.js        220.98 kB | gzip: 64.86 kB
+✓ built in 4.00s
 The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.`,
 };
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index b2810ab..533b190 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -528,7 +528,7 @@ function App() {
   const handleSyncActivities = () => loadActivities({ clearCacheFirst: true });
 
   return (
-    <div className="min-h-screen bg-slate-950 text-slate-100">
+    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
       <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-6 py-8">
         <Sidebar activePage={activePage} onNavigate={handleNavigate} />
         {!settingsReady ? (
```

### `src/ThemeContext.jsx`
```diff
diff --git a/src/ThemeContext.jsx b/src/ThemeContext.jsx
new file mode 100644
index 0000000..8127899
--- /dev/null
+++ b/src/ThemeContext.jsx
@@ -0,0 +1,45 @@
+import { createContext, useContext, useEffect, useState } from 'react';
+import { THEMES, DEFAULT_THEME } from './themes';
+
+const ThemeContext = createContext(null);
+
+export function ThemeProvider({ children }) {
+  const [themeId, setThemeId] = useState(() => {
+    try {
+      return localStorage.getItem('scraperapp-theme') || DEFAULT_THEME;
+    } catch (_error) {
+      return DEFAULT_THEME;
+    }
+  });
+
+  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
+
+  useEffect(() => {
+    const root = document.documentElement;
+    root.style.setProperty('--bg', theme.bg);
+    root.style.setProperty('--bg-card', theme.bgCard);
+    root.style.setProperty('--bg-sidebar', theme.bgSidebar);
+    root.style.setProperty('--border', theme.border);
+    root.style.setProperty('--accent', theme.accent);
+    root.style.setProperty('--accent-hover', theme.accentHover);
+    root.style.setProperty('--accent-dark', theme.accentDark);
+    root.style.setProperty('--text', theme.text);
+    root.style.setProperty('--text-muted', theme.textMuted);
+    root.style.setProperty('--gradient-from', theme.gradientFrom);
+    root.style.setProperty('--gradient-to', theme.gradientTo);
+
+    try {
+      localStorage.setItem('scraperapp-theme', themeId);
+    } catch (_error) {
+      // Ignore storage errors.
+    }
+  }, [themeId, theme]);
+
+  return (
+    <ThemeContext.Provider value={{ themeId, setThemeId, theme, themes: THEMES }}>
+      {children}
+    </ThemeContext.Provider>
+  );
+}
+
+export const useTheme = () => useContext(ThemeContext);
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 4e556a2..e934af0 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -10,7 +10,10 @@ const navigationItems = [
 
 function Sidebar({ activePage, onNavigate }) {
   return (
-    <aside className="w-64 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
+    <aside
+      className="w-64 rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
+      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
+    >
       <div className="mb-8">
         <div className="flex items-center gap-3">
           <img
@@ -19,8 +22,10 @@ function Sidebar({ activePage, onNavigate }) {
             className="h-8 w-auto object-contain mix-blend-screen opacity-90"
           />
         </div>
-        <p className="mt-3 text-xs text-itson-gray">iVirtual Academic Tracker</p>
-        <p className="mt-3 text-sm text-slate-400">
+        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
+          iVirtual Academic Tracker
+        </p>
+        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
           Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
         </p>
       </div>
@@ -37,9 +42,14 @@ function Sidebar({ activePage, onNavigate }) {
               onClick={() => onNavigate(item.id)}
               className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                 isActive
-                  ? 'bg-itson-blue text-slate-50'
-                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
+                  ? ''
+                  : 'bg-slate-900 hover:bg-slate-800 hover:text-white'
               }`}
+              style={
+                isActive
+                  ? { background: 'var(--accent)', color: '#fff' }
+                  : { color: 'var(--text-muted)' }
+              }
             >
               <span className="flex items-center gap-3">
                 <Icon className="h-4 w-4" />
```

### `src/components/TaskPanel.jsx`
```diff
diff --git a/src/components/TaskPanel.jsx b/src/components/TaskPanel.jsx
index c06b106..24546a7 100644
--- a/src/components/TaskPanel.jsx
+++ b/src/components/TaskPanel.jsx
@@ -1,10 +1,19 @@
 function TaskPanel({ title, description, children }) {
   return (
-    <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
-      <header className="border-b border-slate-800 pb-6">
-        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Workspace</p>
-        <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
-        <p className="mt-3 max-w-2xl text-sm text-slate-400">{description}</p>
+    <main
+      className="flex-1 rounded-3xl border p-8"
+      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
+    >
+      <header className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
+        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-muted)' }}>
+          Workspace
+        </p>
+        <h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--text)' }}>
+          {title}
+        </h2>
+        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
+          {description}
+        </p>
       </header>
 
       <section className="pt-8">{children}</section>
```

### `src/index.css`
```diff
diff --git a/src/index.css b/src/index.css
index 6346888..1a65f79 100644
--- a/src/index.css
+++ b/src/index.css
@@ -4,15 +4,27 @@
 
 :root {
   color-scheme: dark;
+  --bg: #020617;
+  --bg-card: rgba(2, 6, 23, 0.6);
+  --bg-sidebar: rgba(15, 23, 42, 0.8);
+  --border: #1e293b;
+  --accent: #006DB6;
+  --accent-hover: #1a7ec4;
+  --accent-dark: #005a94;
+  --text: #f1f5f9;
+  --text-muted: #94a3b8;
+  --gradient-from: rgba(0, 109, 182, 0.10);
+  --gradient-to: rgba(0, 90, 148, 0.10);
 }
 
 body {
   margin: 0;
   font-family: Inter, 'Segoe UI', sans-serif;
   background:
-    radial-gradient(circle at top left, rgba(0, 109, 182, 0.10), transparent 32%),
-    radial-gradient(circle at top right, rgba(0, 90, 148, 0.10), transparent 24%),
-    #020617;
+    radial-gradient(circle at top left, var(--gradient-from), transparent 32%),
+    radial-gradient(circle at top right, var(--gradient-to), transparent 24%),
+    var(--bg);
+  color: var(--text);
 }
 
 * {
```

### `src/main.jsx`
```diff
diff --git a/src/main.jsx b/src/main.jsx
index 303ff4d..4d5753e 100644
--- a/src/main.jsx
+++ b/src/main.jsx
@@ -1,10 +1,13 @@
 import React from 'react';
 import ReactDOM from 'react-dom/client';
 import App from './App';
+import { ThemeProvider } from './ThemeContext';
 import './index.css';
 
 ReactDOM.createRoot(document.getElementById('root')).render(
   <React.StrictMode>
-    <App />
+    <ThemeProvider>
+      <App />
+    </ThemeProvider>
   </React.StrictMode>,
 );
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index 4a7b16b..0993815 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -75,14 +75,17 @@ const settingsErrorCodes = new Set([
 
 function StatCard({ icon: Icon, label, value }) {
   return (
-    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+    <article
+      className="rounded-2xl border p-5"
+      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+    >
       <div className="flex items-center gap-3">
-        <span className="rounded-2xl bg-itson-blue/10 p-3 text-itson-blue">
+        <span className="rounded-2xl p-3" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
           <Icon className="h-5 w-5" />
         </span>
         <div>
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
-          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
+          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
+          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
         </div>
       </div>
     </article>
@@ -188,7 +191,10 @@ function Actividades({
   return (
     <div className="space-y-6">
       <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
-        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+        <article
+          className="rounded-2xl border p-6"
+          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+        >
           <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
             <div className="space-y-4">
               <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
@@ -209,7 +215,8 @@ function Actividades({
                 type="button"
                 onClick={onSync}
                 disabled={loading}
-                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+                className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
+                style={{ background: 'var(--accent)' }}
               >
                 <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                 {loading ? 'Sincronizando...' : 'Sincronizar'}
@@ -282,7 +289,10 @@ function Actividades({
         </select>
       </div>
 
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
+      <section
+        className="rounded-2xl border p-3"
+        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+      >
         <div className="flex flex-wrap gap-2">
           {tabs.map((tab) => {
             const isActive = tab.id === activeTab;
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index da98b00..4470724 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -1,5 +1,14 @@
-import { AlertCircle, CheckCircle, FolderCog, Loader2, ShieldCheck } from 'lucide-react';
+import {
+  AlertCircle,
+  CheckCircle,
+  FolderCog,
+  Loader2,
+  Palette,
+  ShieldCheck,
+} from 'lucide-react';
 import { useEffect, useState } from 'react';
+import { useTheme } from '../ThemeContext';
+import { THEMES } from '../themes';
 
 function CredentialSection({
   buttonLabel,
@@ -71,6 +80,7 @@ function CredentialSection({
 
 function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
+  const { themeId, setThemeId } = useTheme();
   const [user, setUser] = useState('');
   const [password, setPassword] = useState('');
   const [ciaUser, setCiaUser] = useState('');
@@ -253,6 +263,69 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
         />
       </div>
 
+      <section
+        className="rounded-2xl border p-6"
+        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+      >
+        <div className="flex items-start gap-3">
+          <Palette className="mt-1 h-5 w-5" style={{ color: 'var(--accent)' }} />
+          <div className="w-full">
+            <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
+              Tema visual
+            </h3>
+            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
+              Personaliza la apariencia de la app
+            </p>
+
+            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
+              {Object.values(THEMES).map((themeOption) => (
+                <button
+                  key={themeOption.id}
+                  type="button"
+                  onClick={() => setThemeId(themeOption.id)}
+                  className="relative flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:scale-[1.02]"
+                  style={{
+                    borderColor: themeId === themeOption.id ? themeOption.accent : 'var(--border)',
+                    background: themeId === themeOption.id ? `${themeOption.accent}15` : 'transparent',
+                    boxShadow: themeId === themeOption.id ? `0 0 0 2px ${themeOption.accent}40` : 'none',
+                  }}
+                >
+                  <div className="flex flex-col gap-1">
+                    <div className="flex gap-1">
+                      <div
+                        className="h-4 w-8 rounded"
+                        style={{ background: themeOption.bg, border: `1px solid ${themeOption.border}` }}
+                      />
+                      <div className="h-4 w-4 rounded" style={{ background: themeOption.accent }} />
+                    </div>
+                    <div
+                      className="h-2 w-12 rounded"
+                      style={{
+                        background: themeOption.bgCard,
+                        border: `1px solid ${themeOption.border}`,
+                      }}
+                    />
+                  </div>
+
+                  <div className="min-w-0 flex-1">
+                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
+                      {themeOption.name}
+                    </p>
+                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
+                      {themeOption.description}
+                    </p>
+                  </div>
+
+                  {themeId === themeOption.id ? (
+                    <CheckCircle className="h-4 w-4 shrink-0" style={{ color: themeOption.accent }} />
+                  ) : null}
+                </button>
+              ))}
+            </div>
+          </div>
+        </div>
+      </section>
+
       <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
         <div className="flex items-start gap-3">
           <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
```

### `src/pages/Calificaciones.jsx`
```diff
diff --git a/src/pages/Calificaciones.jsx b/src/pages/Calificaciones.jsx
index a39c967..5d87d6b 100644
--- a/src/pages/Calificaciones.jsx
+++ b/src/pages/Calificaciones.jsx
@@ -84,14 +84,21 @@ function StatCard({ icon: Icon, label, value, tone = 'default' }) {
   };
 
   return (
-    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+    <article
+      className="rounded-2xl border p-5"
+      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+    >
       <div className="flex items-center gap-3">
         <span className={`rounded-2xl p-3 ${toneClasses[tone] || toneClasses.default}`}>
           <Icon className="h-5 w-5" />
         </span>
         <div>
-          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
-          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
+          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
+            {label}
+          </p>
+          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text)' }}>
+            {value}
+          </p>
         </div>
       </div>
     </article>
@@ -229,7 +236,10 @@ function Calificaciones({
         </div>
       ) : null}
 
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+      <section
+        className="rounded-2xl border p-6"
+        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+      >
         <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
           <div className="space-y-4">
             <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
@@ -250,7 +260,8 @@ function Calificaciones({
               type="button"
               onClick={onSyncCIA}
               disabled={loadingCIA}
-              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
+              style={{ background: 'var(--accent)' }}
             >
               <RefreshCw className={`h-4 w-4 ${loadingCIA ? 'animate-spin' : ''}`} />
               {loadingCIA ? 'Sincronizando...' : 'Sincronizar'}
```

### `src/pages/Horario.jsx`
```diff
diff --git a/src/pages/Horario.jsx b/src/pages/Horario.jsx
index 6460b23..0d14de7 100644
--- a/src/pages/Horario.jsx
+++ b/src/pages/Horario.jsx
@@ -330,7 +330,10 @@ function Horario({
 
   return (
     <div className="space-y-6">
-      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
+      <section
+        className="rounded-2xl border p-6"
+        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+      >
         <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
           <div className="space-y-4">
             <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
@@ -351,7 +354,8 @@ function Horario({
               type="button"
               onClick={() => onSyncHorario?.({ clearCacheFirst: true })}
               disabled={loadingHorario}
-              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
+              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
+              style={{ background: 'var(--accent)' }}
             >
               <RefreshCw className={`h-4 w-4 ${loadingHorario ? 'animate-spin' : ''}`} />
               {loadingHorario ? 'Sincronizando...' : 'Sincronizar'}
@@ -384,7 +388,10 @@ function Horario({
         </div>
       ) : (
         <>
-          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+          <section
+            className="rounded-2xl border p-5"
+            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+          >
             <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Clases en Línea</h4>
             <div className="mt-4 space-y-3">
               {onlineMaterias.length === 0 ? (
@@ -461,7 +468,10 @@ function Horario({
             </div>
           </section>
 
-          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
+          <section
+            className="rounded-2xl border p-5"
+            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+          >
             <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Horario semanal</h4>
             <div className="mt-4 overflow-x-auto">
               <table
```

### `src/themes.js`
```diff
diff --git a/src/themes.js b/src/themes.js
new file mode 100644
index 0000000..466a481
--- /dev/null
+++ b/src/themes.js
@@ -0,0 +1,84 @@
+export const THEMES = {
+  'itson-dark': {
+    id: 'itson-dark',
+    name: 'ITSON Oscuro',
+    description: 'Tema oficial oscuro con azul ITSON',
+    bg: '#020617',
+    bgCard: 'rgba(2, 6, 23, 0.6)',
+    bgSidebar: 'rgba(15, 23, 42, 0.8)',
+    border: '#1e293b',
+    accent: '#006DB6',
+    accentHover: '#1a7ec4',
+    accentDark: '#005a94',
+    text: '#f1f5f9',
+    textMuted: '#94a3b8',
+    gradientFrom: 'rgba(0, 109, 182, 0.10)',
+    gradientTo: 'rgba(0, 90, 148, 0.10)',
+  },
+  'itson-classic': {
+    id: 'itson-classic',
+    name: 'ITSON Clásico',
+    description: 'Blanco y azul institucional',
+    bg: '#F0F4F8',
+    bgCard: '#FFFFFF',
+    bgSidebar: '#FFFFFF',
+    border: '#CBD5E1',
+    accent: '#006DB6',
+    accentHover: '#1a7ec4',
+    accentDark: '#005a94',
+    text: '#0F172A',
+    textMuted: '#475569',
+    gradientFrom: 'rgba(0, 109, 182, 0.05)',
+    gradientTo: 'rgba(0, 90, 148, 0.05)',
+  },
+  midnight: {
+    id: 'midnight',
+    name: 'Medianoche',
+    description: 'Dark profundo con acento violeta',
+    bg: '#0F0F13',
+    bgCard: 'rgba(15, 15, 19, 0.7)',
+    bgSidebar: 'rgba(20, 20, 28, 0.9)',
+    border: '#27272a',
+    accent: '#7C3AED',
+    accentHover: '#8B5CF6',
+    accentDark: '#6D28D9',
+    text: '#f4f4f5',
+    textMuted: '#a1a1aa',
+    gradientFrom: 'rgba(124, 58, 237, 0.10)',
+    gradientTo: 'rgba(109, 40, 217, 0.08)',
+  },
+  'carbon-green': {
+    id: 'carbon-green',
+    name: 'Carbón Verde',
+    description: 'Dark carbón con acento esmeralda',
+    bg: '#0A0F0A',
+    bgCard: 'rgba(10, 15, 10, 0.7)',
+    bgSidebar: 'rgba(15, 22, 15, 0.9)',
+    border: '#1a2e1a',
+    accent: '#059669',
+    accentHover: '#10B981',
+    accentDark: '#047857',
+    text: '#f0fdf4',
+    textMuted: '#86efac',
+    gradientFrom: 'rgba(5, 150, 105, 0.10)',
+    gradientTo: 'rgba(4, 120, 87, 0.08)',
+  },
+  sunset: {
+    id: 'sunset',
+    name: 'Atardecer',
+    description: 'Dark cálido con acento ámbar',
+    bg: '#0F0A05',
+    bgCard: 'rgba(15, 10, 5, 0.7)',
+    bgSidebar: 'rgba(22, 15, 8, 0.9)',
+    border: '#2d1f0a',
+    accent: '#D97706',
+    accentHover: '#F59E0B',
+    accentDark: '#B45309',
+    text: '#fffbeb',
+    textMuted: '#fcd34d',
+    gradientFrom: 'rgba(217, 119, 6, 0.10)',
+    gradientTo: 'rgba(180, 83, 9, 0.08)',
+  },
+};
+
+export const DEFAULT_THEME = 'itson-dark';
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** ninguno
**Comando de verificación:** npm run build
**Output de verificación:**
```
> scraper-app@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1764 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.28 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-BMP17a7U.css        22.76 kB | gzip: 5.24 kB
dist/assets/index-D6_SpU8j.js        220.98 kB | gzip: 64.86 kB
✓ built in 4.00s
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
