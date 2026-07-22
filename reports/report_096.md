# Report 096
**Fecha:** 2026-07-22 09:06  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** feature/motion-polish
**Último commit:** 3e3aaf1 — polish: Grid full-width + motion + refinamiento visual
**Archivos modificados:** 5

## Archivos modificados
- `.claude/launch.json` — archivo creado como parte de la base inicial
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/Sidebar.jsx` — archivo actualizado en esta tarea
- `src/pages/Notas.jsx` — archivo actualizado en esta tarea
- `src/pages/calendario/DaysCounter.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| .claude/launch.json | 11 | 0 |
| src/App.jsx | 42 | 27 |
| src/components/Sidebar.jsx | 24 | 5 |
| src/pages/Notas.jsx | 44 | 18 |
| src/pages/calendario/DaysCounter.jsx | 30 | 1 |

## Resumen
Se registraron 5 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `.claude/launch.json`
```diff
diff --git a/.claude/launch.json b/.claude/launch.json
new file mode 100644
index 0000000..57bd55d
--- /dev/null
+++ b/.claude/launch.json
@@ -0,0 +1,11 @@
+{
+  "version": "0.0.1",
+  "configurations": [
+    {
+      "name": "vite-dev",
+      "runtimeExecutable": "npm",
+      "runtimeArgs": ["run", "dev", "--", "--port", "5174"],
+      "port": 5174
+    }
+  ]
+}
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index e9971dd..6120a4e 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,4 +1,6 @@
 import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
+import { EASE } from './utils/motion';
 import Sidebar from './components/Sidebar';
 import Onboarding from './components/Onboarding';
 import TaskPanel from './components/TaskPanel';
@@ -59,6 +61,7 @@ const ACTIVITIES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
 const ONE_HOUR_MS = 60 * 60 * 1000;
 
 function App() {
+  const reduced = useReducedMotion();
   const [activePage, setActivePage] = useState('activities');
   // Deep-link a una nota puntual (desde app://notas?note={id} de un recordatorio).
   const [notasDeepLink, setNotasDeepLink] = useState(null);
@@ -849,33 +852,45 @@ function App() {
             <Onboarding onNavigate={handleNavigate} />
           </main>
         ) : (
-          <TaskPanel title={pageConfig.title} description={pageConfig.description}>
-            <ActivePage
-              activities={activities}
-              calendarData={calendarData}
-              calificaciones={calificaciones}
-              horario={horario}
-              errorCIA={errorCIA}
-              errorCIACode={errorCIACode}
-              errorCode={errorCode}
-              error={error}
-              errorHorario={errorHorario}
-              lastSyncCIA={lastSyncCIA}
-              lastSyncAt={lastSyncAt}
-              lastSyncHorario={lastSyncHorario}
-              isSyncing={isCalendarSyncing}
-              loadingCIA={loadingCIA}
-              loadingHorario={loadingHorario}
-              loading={loading}
-              onSettingsSaved={refreshSettings}
-              onSync={activePage === 'calendario' ? loadCalendar : handleSyncActivities}
-              onSyncHorario={loadHorario}
-              onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
-              onNavigate={handleNavigate}
-              deepLink={activePage === 'notas' ? notasDeepLink : null}
-              progress={progress}
-            />
-          </TaskPanel>
+          // Solo el switch entre modulos del pageRegistry se anima: onboarding y
+          // el shell de carga son estados puntuales, no navegacion.
+          <AnimatePresence mode="wait" initial={false}>
+            <motion.div
+              key={activePage}
+              initial={reduced ? false : { opacity: 0, y: 6 }}
+              animate={{ opacity: 1, y: 0 }}
+              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
+              transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
+            >
+              <TaskPanel title={pageConfig.title} description={pageConfig.description}>
+                <ActivePage
+                  activities={activities}
+                  calendarData={calendarData}
+                  calificaciones={calificaciones}
+                  horario={horario}
+                  errorCIA={errorCIA}
+                  errorCIACode={errorCIACode}
+                  errorCode={errorCode}
+                  error={error}
+                  errorHorario={errorHorario}
+                  lastSyncCIA={lastSyncCIA}
+                  lastSyncAt={lastSyncAt}
+                  lastSyncHorario={lastSyncHorario}
+                  isSyncing={isCalendarSyncing}
+                  loadingCIA={loadingCIA}
+                  loadingHorario={loadingHorario}
+                  loading={loading}
+                  onSettingsSaved={refreshSettings}
+                  onSync={activePage === 'calendario' ? loadCalendar : handleSyncActivities}
+                  onSyncHorario={loadHorario}
+                  onSyncCIA={() => loadCalificaciones({ clearCacheFirst: true })}
+                  onNavigate={handleNavigate}
+                  deepLink={activePage === 'notas' ? notasDeepLink : null}
+                  progress={progress}
+                />
+              </TaskPanel>
+            </motion.div>
+          </AnimatePresence>
         )}
       </div>
     </div>
```

### `src/components/Sidebar.jsx`
```diff
diff --git a/src/components/Sidebar.jsx b/src/components/Sidebar.jsx
index 83a468e..f29cb78 100644
--- a/src/components/Sidebar.jsx
+++ b/src/components/Sidebar.jsx
@@ -11,6 +11,7 @@ import {
   Settings,
   StickyNote,
 } from 'lucide-react';
+import { motion, useReducedMotion } from 'framer-motion';
 import { useEffect, useMemo, useState } from 'react';
 import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
 import { getNextClass } from '../utils/horario.js';
@@ -156,6 +157,7 @@ function Sidebar({
   // Sidebar compact is an independent visual preference (decoupled from any
   // background system): collapses the sidebar to an icon-only rail.
   const { sidebarCompact } = useSidebar();
+  const reduced = useReducedMotion();
   const compact = sidebarCompact;
   const materiasHorario = Array.isArray(horarioData?.materias)
     ? horarioData.materias
@@ -318,28 +320,45 @@ function Sidebar({
               }`}
               style={
                 isActive
-                  ? { background: 'var(--itson-blue, var(--accent))', color: 'var(--on-accent)', fontWeight: 600, borderRadius: 'var(--radius-button, 0px)' }
+                  ? { color: 'var(--on-accent)', fontWeight: 600, borderRadius: 'var(--radius-button, 0px)' }
                   : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500, borderRadius: 'var(--radius-button, 0px)' }
               }
             >
+              {/* El fondo del item activo es una capa aparte con layoutId: framer
+                  la reposiciona entre botones en vez de repintarla de golpe. El
+                  contenido va sobre ella con z-index propio. */}
+              {isActive ? (
+                <motion.span
+                  layoutId="sidebar-active"
+                  className="absolute inset-0"
+                  style={{
+                    background: 'var(--itson-blue, var(--accent))',
+                    borderRadius: 'var(--radius-button, 0px)',
+                  }}
+                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
+                />
+              ) : null}
+
               {compact ? (
                 <>
-                  <Icon className="h-5 w-5 shrink-0" />
+                  <span className="relative z-[1] flex items-center">
+                    <Icon className="h-5 w-5 shrink-0" />
+                  </span>
                   {badge ? (
                     <span
-                      className="absolute right-2 top-1.5 h-2 w-2"
+                      className="absolute right-2 top-1.5 z-[1] h-2 w-2"
                       style={{ background: 'var(--accent)', borderRadius: 'var(--radius-badge, 0px)' }}
                     />
                   ) : null}
                 </>
               ) : (
-                <>
+                <span className="relative z-[1] flex w-full items-center justify-between gap-3">
                   <span className="flex min-w-0 items-center gap-3">
                     <Icon className="h-4 w-4 shrink-0" />
                     <span className="truncate">{item.label}</span>
                   </span>
                   {badge}
-                </>
+                </span>
               )}
             </button>
           );
```

### `src/pages/Notas.jsx`
```diff
diff --git a/src/pages/Notas.jsx b/src/pages/Notas.jsx
index c3f6042..7626f4a 100644
--- a/src/pages/Notas.jsx
+++ b/src/pages/Notas.jsx
@@ -19,7 +19,7 @@ import {
   Trash2,
   X,
 } from 'lucide-react';
-import { motion, useReducedMotion } from 'framer-motion';
+import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
 import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
 import NoteEditorModal, { buildNoteImageUrl } from '../components/NoteEditorModal';
 import { NOTE_COLORS, noteColorHex } from '../utils/noteColors';
@@ -139,6 +139,9 @@ function NoteCard({ note, view, selected, selectionActive, focused, onCardClick,
         background: 'var(--bg-card)',
         borderRadius: 'var(--radius-card, 0px)',
         breakInside: listMode ? undefined : 'avoid',
+        // El color y la selección cambian en el lugar (sin remontar la card):
+        // sin transición el salto de tinta se lee como parpadeo.
+        transition: 'background-color 200ms ease, border-color 200ms ease',
       }}
     >
       {/* Checkbox multi-select: visible en hover o cuando hay selección activa. */}
@@ -701,27 +704,50 @@ function Notas({ deepLink } = {}) {
     return map;
   }, [notes]);
 
+  // El margen entre cards baja al wrapper de motion: con [&>*]:mb-4 el selector
+  // seguiria pegandole al motion.div, pero conviene tenerlo explicito ahora que
+  // el hijo directo dejo de ser la NoteCard.
   const gridClass = viewMode === 'grid'
-    ? 'columns-1 gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4'
+    ? 'columns-1 gap-4 sm:columns-2 xl:columns-3'
     : 'flex flex-col gap-3';
 
   const renderCards = (list) => (
-    <div className={gridClass}>
-      {list.map((note) => (
-        <NoteCard
-          key={note.id}
-          note={note}
-          view={view}
-          selected={selectedIds.has(note.id)}
-          selectionActive={selectedIds.size > 0}
-          focused={visibleFlat[focusedIndex]?.id === note.id}
-          onCardClick={handleCardClick}
-          onOpen={openExisting}
-          onAction={handleAction}
-          onRemoveLabel={handleRemoveLabel}
-          listMode={viewMode === 'list'}
-        />
-      ))}
+    // La key por vista fuerza el remonte al saltar de activas a archivadas o
+    // papelera: el set entero vuelve a entrar en cascada y marca el cambio.
+    <div key={`${view}-${viewMode}`} className={gridClass}>
+      <AnimatePresence>
+        {list.map((note, index) => (
+          <motion.div
+            key={note.id}
+            // columns CSS posiciona por flow: framer no puede hacer FLIP real en
+            // un masonry, asi que el layout queda fuera y solo entra/sale.
+            layout={false}
+            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
+            animate={{ opacity: 1, scale: 1 }}
+            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
+            transition={{
+              duration: reduced ? 0 : 0.18,
+              delay: reduced ? 0 : Math.min(index * 0.03, 0.3),
+              ease: EASE,
+            }}
+            className={viewMode === 'grid' ? 'mb-4' : ''}
+            style={{ breakInside: viewMode === 'grid' ? 'avoid' : undefined }}
+          >
+            <NoteCard
+              note={note}
+              view={view}
+              selected={selectedIds.has(note.id)}
+              selectionActive={selectedIds.size > 0}
+              focused={visibleFlat[focusedIndex]?.id === note.id}
+              onCardClick={handleCardClick}
+              onOpen={openExisting}
+              onAction={handleAction}
+              onRemoveLabel={handleRemoveLabel}
+              listMode={viewMode === 'list'}
+            />
+          </motion.div>
+        ))}
+      </AnimatePresence>
     </div>
   );
```

### `src/pages/calendario/DaysCounter.jsx`
```diff
diff --git a/src/pages/calendario/DaysCounter.jsx b/src/pages/calendario/DaysCounter.jsx
index fc8b20e..3a88de6 100644
--- a/src/pages/calendario/DaysCounter.jsx
+++ b/src/pages/calendario/DaysCounter.jsx
@@ -1,7 +1,36 @@
+import { useEffect, useState } from 'react';
+import { animate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
+import { EASE } from '../../utils/motion';
+
 // Numero grande + label del contador de dias. Vive suelto porque lo comparten
 // el hero de la timeline y la vista Contador, con escalas distintas.
 function DaysCounter({ value, label, accent = false, size = 'hero' }) {
   const isXL = size === 'xl';
+  const reduced = useReducedMotion();
+  const isNumeric = typeof value === 'number';
+
+  const motionValue = useMotionValue(isNumeric ? value : 0);
+  const rounded = useTransform(motionValue, (current) => Math.round(current));
+  const [display, setDisplay] = useState(value);
+
+  // Solo el XL (Contador) interpola: ahi el numero cambia mientras el usuario
+  // mueve las fechas. El hero de la timeline salta despues de un sync y animar
+  // de 90 dias a 3 se leeria como ruido; ademas manda "HOY", que no es numero.
+  useEffect(() => {
+    if (!isXL || reduced || !isNumeric) {
+      setDisplay(value);
+      if (isNumeric) motionValue.set(value);
+      return undefined;
+    }
+
+    const controls = animate(motionValue, value, { duration: 0.4, ease: EASE });
+    const unsubscribe = rounded.on('change', (current) => setDisplay(current));
+
+    return () => {
+      controls.stop();
+      unsubscribe();
+    };
+  }, [value, isXL, reduced, isNumeric, motionValue, rounded]);
 
   return (
     <>
@@ -16,7 +45,7 @@ function DaysCounter({ value, label, accent = false, size = 'hero' }) {
           lineHeight: isXL ? 0.9 : undefined,
         }}
       >
-        {value}
+        {display}
       </p>
       <p
         className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em]"
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** npm run build + checks de activos ASCII, ascii-fg y sección Fondo ASCII
**Comando de verificación:** npm run build
node -e "const fs=require('fs'); console.log('contexto existe:', fs.existsSync('src/AsciiBackgroundContext.jsx')); console.log('AsciiBackdrop existe:', fs.existsSync('src/components/AsciiBackdrop.jsx')); console.log('AsciiLab eliminado:', !fs.existsSync('src/pages/AsciiLab.jsx')); console.log('manos.json existe:', fs.existsSync('src/assets/ascii-defaults/manos.json')); console.log('coyote.json existe:', fs.existsSync('src/assets/ascii-defaults/coyote.json')); console.log('gato.json existe:', fs.existsSync('src/assets/ascii-defaults/gato.json')); console.log('pajaro.json existe:', fs.existsSync('src/assets/ascii-defaults/pajaro.json')); const ajustes = fs.readFileSync('src/pages/Ajustes.jsx','utf8'); console.log('seccion Fondo ASCII en Ajustes:', ajustes.includes('Fondo ASCII')); const css = fs.readFileSync('src/index.css','utf8'); console.log('ascii-fg definido:', css.includes('--ascii-fg'));""
**Output de verificación:**
```
$ npm run build
> dvpotro@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1780 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            0.47 kB │ gzip:   0.30 kB
dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
dist/assets/index-9flYp8Ot.css             38.06 kB │ gzip:   7.74 kB
dist/assets/index-BJFKfqkt.js              2,087.50 kB │ gzip: 297.19 kB
✓ built in 22.31s

$ node -e "..."
contexto existe: true
AsciiBackdrop existe: true
AsciiLab eliminado: true
manos.json existe: true
coyote.json existe: true
gato.json existe: true
pajaro.json existe: true
seccion Fondo ASCII en Ajustes: true
ascii-fg definido: true
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
