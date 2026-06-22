# Report 070
**Fecha:** 2026-06-02 15:15  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** f296629 — feat: módulo Calendario ITSON, sidebar redesign, notificaciones de clase, modos de vista y botón sync animado
**Archivos modificados:** 3

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `reports/report_070_calendario_fullscreen.png` — archivo creado como parte de la base inicial
- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 15 | 10 |
| reports/report_070_calendario_fullscreen.png | 0 | 0 |
| src/pages/Calendario.jsx | 132 | 66 |

## Resumen
Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 031d32c..8e69b94 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -19,9 +19,13 @@ const MAX_DIFF_BYTES = 150 * 1024;
 
 const VERIFICATION = {
   buildStatus: 'PASS',
-  testsRun: 'npm run build + CSS build check + MES select removal check',
-  verificationCmd: 'npm run build; node check sync-all-btn in dist CSS; node check MES select removed',
-  verificationOutput: `$ npm run build
+  testsRun: 'npm run build + StackedPhotos/xl:flex-row source check + fullscreen Calendario screenshot',
+  verificationCmd: 'npm run build; node check StackedPhotos and xl:flex-row; Playwright screenshot against Vite preview',
+  verificationOutput: `RED check before implementation:
+StackedPhotos defined: false
+xl:flex-row removed: false
+
+$ npm run build
 > dvpotro@0.1.0 build
 > vite build
 
@@ -32,15 +36,16 @@ rendering chunks...
 computing gzip size...
 dist/index.html                            0.47 kB │ gzip:  0.30 kB
 dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
-dist/assets/index-BHL7YJJ7.css             34.79 kB │ gzip:  7.22 kB
-dist/assets/index-BZ6s7_Bs.js              321.55 kB │ gzip: 87.78 kB
-✓ built in 9.82s
+dist/assets/index-5mNcl6hp.css             35.91 kB │ gzip:  7.37 kB
+dist/assets/index-1uB9TZnT.js              322.70 kB │ gzip: 88.36 kB
+✓ built in 8.14s
 
-$ node check sync-all-btn in dist CSS
-sync-all-btn in CSS: true
+$ node check StackedPhotos and xl:flex-row
+StackedPhotos defined: true
+xl:flex-row removed: true
 
-$ node check MES select removed
-MES select removed: true
+Screenshot fullscreen:
+reports/report_070_calendario_fullscreen.png
 
 Note: Vite printed its existing CJS Node API deprecation warning after the checks.`,
 };
```

### `reports/report_070_calendario_fullscreen.png`
```diff
diff --git a/reports/report_070_calendario_fullscreen.png b/reports/report_070_calendario_fullscreen.png
new file mode 100644
index 0000000..35b8ebc
Binary files /dev/null and b/reports/report_070_calendario_fullscreen.png differ
```

### `src/pages/Calendario.jsx`
```diff
diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
index f83a172..7d3e991 100644
--- a/src/pages/Calendario.jsx
+++ b/src/pages/Calendario.jsx
@@ -268,6 +268,67 @@ function EventCard({ event, compact = false }) {
   );
 }
 
+
+const STACKED_IMAGES = [
+  'https://picsum.photos/id/237/300/200',
+  'https://picsum.photos/id/1025/300/200',
+  'https://picsum.photos/id/1069/300/200',
+  'https://picsum.photos/id/1074/300/200',
+];
+
+const ROTATIONS = [-6, -2, 3, 7];
+const Z_INDICES = [4, 3, 2, 1];
+
+function StackedPhotos({ images = STACKED_IMAGES }) {
+  const [order, setOrder] = useState([0, 1, 2, 3]);
+  const [flyingOut, setFlyingOut] = useState(false);
+
+  const handleClick = () => {
+    if (flyingOut) return;
+    setFlyingOut(true);
+    setTimeout(() => {
+      setOrder((previous) => [...previous.slice(1), previous[0]]);
+      setFlyingOut(false);
+    }, 350);
+  };
+
+  return (
+    <button
+      type="button"
+      onClick={handleClick}
+      className="relative hidden h-[122px] w-[190px] shrink-0 select-none lg:block"
+      aria-label="Rotar fotos del calendario"
+      title="Haz clic para cambiar la foto"
+    >
+      {order.map((imageIndex, stackPosition) => {
+        const isTopCard = stackPosition === 0;
+        const transform = flyingOut && isTopCard
+          ? 'translate(24px, -180px) rotate(20deg)'
+          : `translateY(-50%) rotate(${ROTATIONS[stackPosition]}deg)`;
+
+        return (
+          <span
+            key={`${imageIndex}-${stackPosition}`}
+            className="absolute right-2 top-1/2 block h-[86px] w-[136px] rounded-xl border-[3px] border-black bg-white p-1.5 shadow-xl transition-all duration-[350ms] ease-out"
+            style={{
+              zIndex: Z_INDICES[stackPosition],
+              transform,
+              opacity: flyingOut && isTopCard ? 0 : 1,
+            }}
+          >
+            <img
+              src={images[imageIndex]}
+              alt="Calendario visual"
+              className="h-full w-full rounded-md object-cover"
+              draggable="false"
+            />
+          </span>
+        );
+      })}
+    </button>
+  );
+}
+
 function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncing = false, onSync }) {
   const today = new Date();
   const [currentMonth, setCurrentMonth] = useState(today.getMonth());
@@ -427,76 +488,81 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
             className="rounded-2xl border p-4"
             style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
           >
-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
-              <div className="flex items-center gap-2">
-                <button
-                  type="button"
-                  onClick={goToPreviousMonth}
-                  className="rounded-xl border p-2 transition hover:scale-105"
-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
-                  aria-label="Mes anterior"
-                >
-                  <ChevronLeft className="h-4 w-4" />
-                </button>
-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
-                  {monthLabel}
-                </p>
-                <button
-                  type="button"
-                  onClick={goToNextMonth}
-                  className="rounded-xl border p-2 transition hover:scale-105"
-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
-                  aria-label="Mes siguiente"
-                >
-                  <ChevronRight className="h-4 w-4" />
-                </button>
-              </div>
+            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
+              <div className="min-w-0 flex-1 space-y-3">
+                <div className="flex flex-wrap items-end gap-3">
+                  <SelectField
+                    label="Seleccionar un calendario"
+                    value={selectedCalendarType}
+                    onChange={handleCalendarTypeChange}
+                    className="min-w-[260px]"
+                  >
+                    {calendarTypes.map((type) => (
+                      <option key={type} value={type}>
+                        {type}
+                      </option>
+                    ))}
+                  </SelectField>
 
-              <div className="flex flex-wrap items-end gap-3">
-                <SelectField
-                  label="Seleccionar un calendario"
-                  value={selectedCalendarType}
-                  onChange={handleCalendarTypeChange}
-                  className="min-w-[260px]"
-                >
-                  {calendarTypes.map((type) => (
-                    <option key={type} value={type}>
-                      {type}
-                    </option>
-                  ))}
-                </SelectField>
+                  <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+                    {categories.map((category) => (
+                      <option key={category} value={category}>
+                        {category}
+                      </option>
+                    ))}
+                  </SelectField>
+                </div>
 
-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
-                  {categories.map((category) => (
-                    <option key={category} value={category}>
-                      {category}
-                    </option>
-                  ))}
-                </SelectField>
-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
-                  {[
-                    { id: 'list', label: 'Lista', Icon: List },
-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
-                  ].map(({ id, label, Icon }) => {
-                    const active = viewMode === id;
-                    return (
-                      <button
-                        key={id}
-                        type="button"
-                        onClick={() => setViewMode(id)}
-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
-                        style={{
-                          background: active ? 'var(--accent)' : 'transparent',
-                          color: active ? '#fff' : 'var(--text-muted)',
-                        }}
-                        title={label}
-                      >
-                        <Icon className="h-4 w-4" />
-                      </button>
-                    );
-                  })}
+                <div className="flex flex-wrap items-center gap-2">
+                  <button
+                    type="button"
+                    onClick={goToPreviousMonth}
+                    className="rounded-xl border p-2 transition hover:scale-105"
+                    style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                    aria-label="Mes anterior"
+                  >
+                    <ChevronLeft className="h-4 w-4" />
+                  </button>
+                  <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+                    {monthLabel}
+                  </p>
+                  <button
+                    type="button"
+                    onClick={goToNextMonth}
+                    className="rounded-xl border p-2 transition hover:scale-105"
+                    style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+                    aria-label="Mes siguiente"
+                  >
+                    <ChevronRight className="h-4 w-4" />
+                  </button>
+
+                  <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+                    {[
+                      { id: 'list', label: 'Lista', Icon: List },
+                      { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+                    ].map(({ id, label, Icon }) => {
+                      const active = viewMode === id;
+                      return (
+                        <button
+                          key={id}
+                          type="button"
+                          onClick={() => setViewMode(id)}
+                          className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+                          style={{
+                            background: active ? 'var(--accent)' : 'transparent',
+                            color: active ? '#fff' : 'var(--text-muted)',
+                          }}
+                          title={label}
+                        >
+                          <Icon className="h-4 w-4" />
+                        </button>
+                      );
+                    })}
+                  </div>
                 </div>
               </div>
+
+              <StackedPhotos />
             </div>
           </section>
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** npm run build + StackedPhotos/xl:flex-row source check + fullscreen Calendario screenshot
**Comando de verificación:** npm run build; node check StackedPhotos and xl:flex-row; Playwright screenshot against Vite preview
**Output de verificación:**
```
RED check before implementation:
StackedPhotos defined: false
xl:flex-row removed: false

$ npm run build
> dvpotro@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1768 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            0.47 kB │ gzip:  0.30 kB
dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
dist/assets/index-5mNcl6hp.css             35.91 kB │ gzip:  7.37 kB
dist/assets/index-1uB9TZnT.js              322.70 kB │ gzip: 88.36 kB
✓ built in 8.14s

$ node check StackedPhotos and xl:flex-row
StackedPhotos defined: true
xl:flex-row removed: true

Screenshot fullscreen:
reports/report_070_calendario_fullscreen.png

Note: Vite printed its existing CJS Node API deprecation warning after the checks.
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
