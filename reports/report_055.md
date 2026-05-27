# Report 055
**Fecha:** 2026-05-26 22:52  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** aa516f1 — feat: superficies secundarias adaptativas por tema
**Archivos modificados:** 5

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `src/ThemeContext.jsx` — archivo actualizado en esta tarea
- `src/pages/Actividades.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/themes.js` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 4 | 4 |
| src/ThemeContext.jsx | 22 | 3 |
| src/pages/Actividades.jsx | 225 | 33 |
| src/pages/Ajustes.jsx | 151 | 4 |
| src/themes.js | 38 | 0 |

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 730abd3..e328d17 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -30,11 +30,11 @@ transforming...
 ✓ 1764 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                        0.41 kB | gzip: 0.28 kB
+dist/index.html                        0.41 kB | gzip: 0.27 kB
 dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
-dist/assets/index-D2z52HT7.css        23.47 kB | gzip: 5.47 kB
-dist/assets/index-mi80jdxw.js        228.82 kB | gzip: 66.13 kB
-✓ built in 4.44s`,
+dist/assets/index-CkhrxtXk.css        23.80 kB | gzip: 5.53 kB
+dist/assets/index-BpSmhJyL.js        236.80 kB | gzip: 67.61 kB
+✓ built in 5.69s`,
 };
 
 function ensureReportsDir() {
```

### `src/ThemeContext.jsx`
```diff
diff --git a/src/ThemeContext.jsx b/src/ThemeContext.jsx
index 86e9932..23e70e9 100644
--- a/src/ThemeContext.jsx
+++ b/src/ThemeContext.jsx
@@ -1,4 +1,4 @@
-import { createContext, useContext, useEffect, useState } from 'react';
+import { createContext, useCallback, useContext, useEffect, useState } from 'react';
 import { THEMES, DEFAULT_THEME } from './themes';
 
 const ThemeContext = createContext(null);
@@ -12,7 +12,26 @@ export function ThemeProvider({ children }) {
     }
   });
 
-  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
+  const getCustomTheme = useCallback(() => {
+    try {
+      const saved = localStorage.getItem('scraperapp-custom-theme');
+      return saved ? { ...THEMES.custom, ...JSON.parse(saved) } : THEMES.custom;
+    } catch (_error) {
+      return THEMES.custom;
+    }
+  }, []);
+
+  const saveCustomTheme = useCallback((overrides) => {
+    try {
+      localStorage.setItem('scraperapp-custom-theme', JSON.stringify(overrides));
+    } catch (_error) {
+      // Ignore storage errors.
+    }
+  }, []);
+
+  const theme = themeId === 'custom'
+    ? getCustomTheme()
+    : (THEMES[themeId] || THEMES[DEFAULT_THEME]);
 
   useEffect(() => {
     const root = document.documentElement;
@@ -58,7 +77,7 @@ export function ThemeProvider({ children }) {
   }, [themeId, theme]);
 
   return (
-    <ThemeContext.Provider value={{ themeId, setThemeId, theme, themes: THEMES }}>
+    <ThemeContext.Provider value={{ themeId, setThemeId, theme, themes: THEMES, saveCustomTheme }}>
       {children}
     </ThemeContext.Provider>
   );
```

### `src/pages/Actividades.jsx`
```diff
diff --git a/src/pages/Actividades.jsx b/src/pages/Actividades.jsx
index ea9f044..fe58e03 100644
--- a/src/pages/Actividades.jsx
+++ b/src/pages/Actividades.jsx
@@ -2,7 +2,6 @@ import {
   Archive,
   AlertCircle,
   CheckCircle,
-  Globe,
   RefreshCw,
   Search,
   SearchX,
@@ -66,6 +65,80 @@ function getFriendlyErrorMessage(message = '') {
     : message;
 }
 
+function getActivityAnchorId(activity) {
+  const raw = activity?.id || `${activity?.nombre || ''}-${activity?.materia || ''}-${activity?.fechaLimite || ''}`;
+  const normalized = String(raw)
+    .toLowerCase()
+    .replace(/[^a-z0-9_-]+/g, '-')
+    .replace(/^-+|-+$/g, '');
+  return `activity-${normalized || 'item'}`;
+}
+
+function parseDeadline(activity) {
+  const parsed = parseSort(activity?.fechaLimite);
+  return parsed === null ? null : new Date(parsed);
+}
+
+function formatDeadline(date) {
+  if (!date) {
+    return 'Sin fecha visible';
+  }
+
+  return new Intl.DateTimeFormat('es-MX', {
+    dateStyle: 'medium',
+    timeStyle: 'short',
+  }).format(date);
+}
+
+function getUrgentActivity(activities) {
+  const pendientes = activities
+    .filter((activity) => activity.estado === 'pendiente' && activity.fechaLimite !== 'Sin fecha visible')
+    .map((activity) => ({ activity, deadline: parseDeadline(activity) }))
+    .filter((item) => item.deadline)
+    .sort((left, right) => left.deadline - right.deadline);
+
+  if (pendientes.length > 0) {
+    return { activity: pendientes[0].activity, type: 'urgent', deadline: pendientes[0].deadline };
+  }
+
+  const retrasadas = activities
+    .filter((activity) => activity.estado === 'retrasada' && activity.fechaLimite !== 'Sin fecha visible')
+    .map((activity) => ({ activity, deadline: parseDeadline(activity) }))
+    .filter((item) => item.deadline)
+    .sort((left, right) => left.deadline - right.deadline);
+
+  if (retrasadas.length > 0) {
+    return { activity: retrasadas[0].activity, type: 'late', deadline: retrasadas[0].deadline };
+  }
+
+  return null;
+}
+
+function getRemainingLabel(deadline) {
+  if (!deadline) {
+    return '';
+  }
+
+  const dayMs = 24 * 60 * 60 * 1000;
+  const remainingDays = Math.ceil((deadline.getTime() - Date.now()) / dayMs);
+
+  if (remainingDays <= 0) {
+    return 'Vence hoy';
+  }
+
+  return `Faltan ${remainingDays} día${remainingDays === 1 ? '' : 's'}`;
+}
+
+function getLateLabel(deadline) {
+  if (!deadline) {
+    return '';
+  }
+
+  const dayMs = 24 * 60 * 60 * 1000;
+  const lateDays = Math.max(1, Math.ceil((Date.now() - deadline.getTime()) / dayMs));
+  return `${lateDays} día${lateDays === 1 ? '' : 's'} de retraso`;
+}
+
 const settingsErrorCodes = new Set([
   'NO_CREDENTIALS',
   'NO_USER',
@@ -138,6 +211,7 @@ function Actividades({
       (field || '').toLowerCase().includes(normalizedQuery),
       );
   });
+  const urgentInfo = useMemo(() => getUrgentActivity(activities), [activities]);
   const sortedActivities = useMemo(() => {
     const items = [...filteredActivities];
 
@@ -183,6 +257,32 @@ function Actividades({
     setSearchQuery('');
   };
 
+  const handleOpenUrgentActivity = (info) => {
+    if (!info?.activity) {
+      return;
+    }
+
+    const nextTab = info.type === 'late' ? 'retrasada' : 'pendiente';
+    setActiveTab(nextTab);
+    setSearchQuery('');
+
+    const anchorId = getActivityAnchorId(info.activity);
+    setTimeout(() => {
+      const target = document.getElementById(anchorId);
+      if (!target) {
+        return;
+      }
+
+      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
+      target.style.outline = '2px solid var(--accent)';
+      target.style.outlineOffset = '4px';
+
+      window.setTimeout(() => {
+        target.style.outline = 'none';
+      }, 1300);
+    }, 120);
+  };
+
   const emptyStateConfig = {
     pendiente: {
       icon: CheckCircle,
@@ -211,40 +311,130 @@ function Actividades({
           className="rounded-2xl border p-6"
           style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
         >
-          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
+          {loading ? (
+            <div className="space-y-4 animate-pulse">
+              <div className="h-5 w-36 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="h-8 w-4/5 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="h-4 w-3/5 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+              <div className="h-10 w-52 rounded" style={{ background: 'var(--bg-tertiary)' }} />
+            </div>
+          ) : (
             <div className="space-y-4">
-              <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
-                <Globe className="h-3.5 w-3.5" />
-                Portal iVirtual ITSON
-              </div>
-              <div>
-                <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
-                  Extracción real de actividades
-                </h3>
-                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
-                  Inicia una sesión contra iVirtual, recorre los cursos inscritos y clasifica actividades
-                  en pendientes, retrasadas y cerradas con sus fechas límite, instrucciones y adjuntos.
+              {urgentInfo ? (
+                <>
+                  <span
+                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]"
+                    style={
+                      urgentInfo.type === 'urgent'
+                        ? {
+                          borderColor: 'var(--accent)',
+                          background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
+                          color: 'var(--accent)',
+                        }
+                        : {
+                          borderColor: 'var(--retrasada-border)',
+                          background: 'var(--retrasada-bg)',
+                          color: 'var(--retrasada-text)',
+                        }
+                    }
+                  >
+                    {urgentInfo.type === 'urgent' ? 'ATENCIÓN' : 'RETRASADA'}
+                  </span>
+
+                  <div>
+                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
+                      {urgentInfo.activity.nombre}
+                    </h3>
+                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
+                      {urgentInfo.activity.materia || 'Materia no disponible'}
+                    </p>
+                  </div>
+
+                  <div className="space-y-1">
+                    <p
+                      className="text-lg font-semibold"
+                      style={{
+                        color: urgentInfo.type === 'urgent' ? 'var(--error-text)' : 'var(--retrasada-text)',
+                      }}
+                    >
+                      {formatDeadline(urgentInfo.deadline)}
+                    </p>
+                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
+                      {urgentInfo.type === 'urgent'
+                        ? getRemainingLabel(urgentInfo.deadline)
+                        : getLateLabel(urgentInfo.deadline)}
+                    </p>
+                  </div>
+
+                  <div className="flex flex-wrap items-center gap-3">
+                    <button
+                      type="button"
+                      onClick={() => handleOpenUrgentActivity(urgentInfo)}
+                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-50 transition"
+                      style={{ background: 'var(--accent)' }}
+                    >
+                      Ver actividad
+                    </button>
+                    <button
+                      type="button"
+                      onClick={onSync}
+                      disabled={loading}
+                      className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
+                      style={{
+                        borderColor: 'var(--border-normal)',
+                        background: 'var(--bg-secondary)',
+                        color: 'var(--text-normal)',
+                      }}
+                    >
+                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
+                      Sincronizar
+                    </button>
+                  </div>
+                </>
+              ) : (
+                <>
+                  <div className="flex items-center gap-3">
+                    <span
+                      className="inline-flex h-10 w-10 items-center justify-center rounded-full"
+                      style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}
+                    >
+                      <CheckCircle className="h-6 w-6" />
+                    </span>
+                    <div>
+                      <h3 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
+                        Todo al día
+                      </h3>
+                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
+                        No tienes actividades pendientes ni retrasadas.
+                      </p>
+                    </div>
+                  </div>
+
+                  <div className="flex flex-wrap items-center gap-3">
+                    <button
+                      type="button"
+                      onClick={onSync}
+                      disabled={loading}
+                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
+                      style={{ background: 'var(--accent)' }}
+                    >
+                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
+                      Sincronizar
+                    </button>
+                    <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
+                      {formatLastSync(lastSyncAt)}
+                    </p>
+                  </div>
+                </>
+              )}
+
+              {urgentInfo ? (
+                <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
+                  {formatLastSync(lastSyncAt)}
                 </p>
-              </div>
+              ) : null}
             </div>
-
-            <div className="space-y-3">
-              <button
-                type="button"
-                onClick={onSync}
-                disabled={loading}
-                className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
-                style={{ background: 'var(--accent)' }}
-              >
-                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
-                {loading ? 'Sincronizando...' : 'Sincronizar'}
-              </button>
-
-              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
-                {formatLastSync(lastSyncAt)}
-              </p>
-            </div>
-          </div>
+          )}
         </article>
 
         <div className="grid gap-4">
@@ -410,7 +600,9 @@ function Actividades({
       ) : sortedActivities.length > 0 ? (
         <div className="space-y-4">
           {sortedActivities.map((activity) => (
-            <ActivityCard key={activity.id} {...activity} />
+            <div key={getActivityAnchorId(activity)} id={getActivityAnchorId(activity)}>
+              <ActivityCard {...activity} />
+            </div>
           ))}
         </div>
       ) : normalizedQuery ? (
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index 0ab1c4d..e5ef3ee 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -10,6 +10,12 @@ import { useEffect, useState } from 'react';
 import { useTheme } from '../ThemeContext';
 import { THEMES } from '../themes';
 
+const CUSTOM_THEME_DEFAULTS = {
+  accent: '#006DB6',
+  bg: '#020617',
+  text: '#f1f5f9',
+};
+
 function CredentialSection({
   buttonLabel,
   hasPassword,
@@ -99,7 +105,7 @@ function CredentialSection({
 
 function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
-  const { themeId, setThemeId } = useTheme();
+  const { themeId, setThemeId, saveCustomTheme } = useTheme();
   const [user, setUser] = useState('');
   const [password, setPassword] = useState('');
   const [ciaUser, setCiaUser] = useState('');
@@ -109,6 +115,19 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
   const [settingsLoading, setSettingsLoading] = useState(true);
   const [savingSection, setSavingSection] = useState('');
   const [feedback, setFeedback] = useState({ type: '', message: '' });
+  const [customColors, setCustomColors] = useState(() => {
+    try {
+      const saved = localStorage.getItem('scraperapp-custom-theme');
+      const parsed = saved ? JSON.parse(saved) : {};
+      return {
+        accent: parsed.accent || CUSTOM_THEME_DEFAULTS.accent,
+        bg: parsed.bg || CUSTOM_THEME_DEFAULTS.bg,
+        text: parsed.text || CUSTOM_THEME_DEFAULTS.text,
+      };
+    } catch (_error) {
+      return { ...CUSTOM_THEME_DEFAULTS };
+    }
+  });
 
   useEffect(() => {
     let mounted = true;
@@ -213,6 +232,39 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
     }
   };
 
+  const handleCustomColor = (key, value) => {
+    const next = { ...customColors, [key]: value };
+    setCustomColors(next);
+
+    const overrides = {
+      accent: next.accent,
+      accentHover: `${next.accent}cc`,
+      bg: next.bg,
+      text: next.text,
+      textStrong: next.text,
+      gradientFrom: `${next.accent}1a`,
+      gradientTo: `${next.accent}14`,
+    };
+
+    saveCustomTheme(overrides);
+
+    if (themeId === 'custom') {
+      const root = document.documentElement;
+      Object.entries(overrides).forEach(([themeKey, themeValue]) => {
+        const cssKey = `--${themeKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
+        root.style.setProperty(cssKey, themeValue);
+      });
+    } else {
+      setThemeId('custom');
+    }
+  };
+
+  const handleResetCustom = () => {
+    localStorage.removeItem('scraperapp-custom-theme');
+    setCustomColors({ ...CUSTOM_THEME_DEFAULTS });
+    saveCustomTheme({});
+  };
+
   return (
     <div className="space-y-6">
       {error ? (
@@ -313,14 +365,22 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
                     <div className="flex gap-1">
                       <div
                         className="h-4 w-8 rounded"
-                        style={{ background: themeOption.bg, border: `1px solid ${themeOption.border}` }}
+                        style={{
+                          background: themeOption.id === 'custom' ? customColors.bg : themeOption.bg,
+                          border: `1px solid ${themeOption.border}`,
+                        }}
+                      />
+                      <div
+                        className="h-4 w-4 rounded"
+                        style={{ background: themeOption.id === 'custom' ? customColors.accent : themeOption.accent }}
                       />
-                      <div className="h-4 w-4 rounded" style={{ background: themeOption.accent }} />
                     </div>
                     <div
                       className="h-2 w-12 rounded"
                       style={{
-                        background: themeOption.bgCard,
+                        background: themeOption.id === 'custom'
+                          ? 'rgba(2, 6, 23, 0.6)'
+                          : themeOption.bgCard,
                         border: `1px solid ${themeOption.border}`,
                       }}
                     />
@@ -341,6 +401,93 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
                 </button>
               ))}
             </div>
+
+            {themeId === 'custom' ? (
+              <section
+                className="mt-4 space-y-4 rounded-2xl border p-5"
+                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
+              >
+                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
+                  Personalizar Mi Tema
+                </h4>
+
+                <label className="flex items-center justify-between gap-4">
+                  <div>
+                    <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+                      Color de acento
+                    </p>
+                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+                      Botones, elementos activos y highlights
+                    </p>
+                  </div>
+                  <div className="flex items-center gap-2">
+                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
+                      {customColors.accent}
+                    </span>
+                    <input
+                      type="color"
+                      value={customColors.accent}
+                      onChange={(event) => handleCustomColor('accent', event.target.value)}
+                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
+                      style={{ accentColor: customColors.accent }}
+                    />
+                  </div>
+                </label>
+
+                <label className="flex items-center justify-between gap-4">
+                  <div>
+                    <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+                      Fondo principal
+                    </p>
+                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+                      Color de fondo de toda la app
+                    </p>
+                  </div>
+                  <div className="flex items-center gap-2">
+                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
+                      {customColors.bg}
+                    </span>
+                    <input
+                      type="color"
+                      value={customColors.bg}
+                      onChange={(event) => handleCustomColor('bg', event.target.value)}
+                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
+                    />
+                  </div>
+                </label>
+
+                <label className="flex items-center justify-between gap-4">
+                  <div>
+                    <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
+                      Color de texto
+                    </p>
+                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
+                      Texto principal de la interfaz
+                    </p>
+                  </div>
+                  <div className="flex items-center gap-2">
+                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
+                      {customColors.text}
+                    </span>
+                    <input
+                      type="color"
+                      value={customColors.text}
+                      onChange={(event) => handleCustomColor('text', event.target.value)}
+                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
+                    />
+                  </div>
+                </label>
+
+                <button
+                  type="button"
+                  onClick={handleResetCustom}
+                  className="text-xs"
+                  style={{ color: 'var(--text-muted)' }}
+                >
+                  Restablecer valores por defecto
+                </button>
+              </section>
+            ) : null}
           </div>
         </div>
       </section>
```

### `src/themes.js`
```diff
diff --git a/src/themes.js b/src/themes.js
index ea68fcd..2cde85f 100644
--- a/src/themes.js
+++ b/src/themes.js
@@ -158,6 +158,44 @@ export const THEMES = {
     textStrong: 'rgb(255, 251, 235)',
     textNormal: 'rgb(253, 230, 138)',
   },
+  custom: {
+    id: 'custom',
+    name: 'Mi Tema',
+    description: 'Personaliza tus propios colores',
+    mode: 'dark',
+    bg: '#020617',
+    bgCard: 'rgba(2, 6, 23, 0.6)',
+    bgSidebar: 'rgba(15, 23, 42, 0.8)',
+    bgSecondary: 'rgb(15, 23, 42)',
+    bgTertiary: 'rgb(30, 41, 59)',
+    border: '#1e293b',
+    borderSubtle: 'rgb(30, 41, 59)',
+    borderNormal: 'rgb(51, 65, 85)',
+    accent: '#006DB6',
+    accentHover: '#1a7ec4',
+    accentDark: '#005a94',
+    text: '#f1f5f9',
+    textStrong: 'rgb(241, 245, 249)',
+    textNormal: 'rgb(203, 213, 225)',
+    textMuted: '#94a3b8',
+    gradientFrom: 'rgba(0, 109, 182, 0.10)',
+    gradientTo: 'rgba(0, 90, 148, 0.10)',
+    pendingBg: 'rgba(234, 179, 8, 0.15)',
+    pendingBorder: 'rgba(234, 179, 8, 0.35)',
+    pendingText: '#fde047',
+    retrasadaBg: 'rgba(249, 115, 22, 0.15)',
+    retrasadaBorder: 'rgba(249, 115, 22, 0.35)',
+    retrasadaText: '#fb923c',
+    closedBg: 'rgba(100, 116, 139, 0.15)',
+    closedBorder: 'rgba(100, 116, 139, 0.30)',
+    closedText: '#94a3b8',
+    successBg: 'rgba(16, 185, 129, 0.15)',
+    successBorder: 'rgba(16, 185, 129, 0.35)',
+    successText: '#34d399',
+    errorBg: 'rgba(239, 68, 68, 0.15)',
+    errorBorder: 'rgba(239, 68, 68, 0.35)',
+    errorText: '#f87171',
+  },
 };
 
 export const DEFAULT_THEME = 'itson-dark';
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** ninguno
**Comando de verificación:** npm run build
**Output de verificación:**
```
> scraper-app@0.1.0 build
> vite build

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
vite v5.4.21 building for production...
transforming...
✓ 1764 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.41 kB | gzip: 0.27 kB
dist/assets/logo-itson-GKrD7IS7.png   37.09 kB
dist/assets/index-CkhrxtXk.css        23.80 kB | gzip: 5.53 kB
dist/assets/index-BpSmhJyL.js        236.80 kB | gzip: 67.61 kB
✓ built in 5.69s
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
