# Report 095
**Fecha:** 2026-07-22 08:48  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** feature/calendar-views
**Último commit:** a9bf0a1 — feat: vistas Grid y Contador + view switcher persistido
**Archivos modificados:** 3

## Archivos modificados
- `.claude/launch.json` — archivo creado como parte de la base inicial
- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
- `src/pages/calendario/GridView.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| .claude/launch.json | 11 | 0 |
| src/pages/Calendario.jsx | 1 | 5 |
| src/pages/calendario/GridView.jsx | 263 | 231 |

## Resumen
Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

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

### `src/pages/Calendario.jsx`
```diff
diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
index 89399ef..3a5ac30 100644
--- a/src/pages/Calendario.jsx
+++ b/src/pages/Calendario.jsx
@@ -246,11 +246,7 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
           </div>
 
           {view === 'grid' ? (
-            <GridView
-              events={events}
-              todayStart={todayStart}
-              onSeeAllInTimeline={() => handleViewChange('timeline')}
-            />
+            <GridView events={events} todayStart={todayStart} />
           ) : null}
 
           {view === 'contador' ? <ContadorView events={events} todayStart={todayStart} /> : null}
```

### `src/pages/calendario/GridView.jsx`
```diff
diff --git a/src/pages/calendario/GridView.jsx b/src/pages/calendario/GridView.jsx
index 7e89148..e57c06e 100644
--- a/src/pages/calendario/GridView.jsx
+++ b/src/pages/calendario/GridView.jsx
@@ -18,10 +18,13 @@ import {
 
 // Alto de cada barra multi-dia y offset del primer carril: el numero del dia
 // ocupa la primera linea de la celda y las barras arrancan debajo.
-const BAR_HEIGHT = 18;
-const LANES_TOP = 26;
+const BAR_HEIGHT = 20;
+const LANES_TOP = 30;
 const MAX_VISIBLE_PER_DAY = 3;
-const MAX_UPCOMING = 8;
+const SLIDE_DISTANCE = 30;
+// Un mes lleno pasa los 40 dias; sin tope el ultimo evento entraria casi un
+// segundo despues del primero y la cascada se leeria como lag.
+const STAGGER_CAP_MS = 0.3;
 
 function buildMonthWeeks(year, month) {
   const first = new Date(year, month, 1);
@@ -83,33 +86,56 @@ function layoutWeekBars(items, week) {
     });
 }
 
-function EventChip({ item }) {
+function EventBlock({ title, categoria, index, reduced, onClick, style, className = '' }) {
+  const [hovered, setHovered] = useState(false);
+
   return (
-    <span
-      className="block truncate"
+    <motion.span
+      className={`relative block overflow-hidden ${className}`}
+      onMouseEnter={() => setHovered(true)}
+      onMouseLeave={() => setHovered(false)}
+      onClick={onClick}
+      initial={reduced ? false : { opacity: 0, y: 4 }}
+      animate={{ opacity: 1, y: 0 }}
+      transition={{
+        delay: reduced ? 0 : Math.min(index * 0.02, STAGGER_CAP_MS),
+        duration: reduced ? 0 : 0.18,
+        ease: EASE,
+      }}
       style={{
-        borderLeft: `3px solid ${getCategoryColor(item.event.categoria)}`,
-        background: 'var(--bg-secondary)',
+        borderLeft: `3px solid ${getCategoryColor(categoria)}`,
+        background: 'var(--bg-tertiary)',
         color: 'var(--text-normal)',
         padding: '2px 6px',
-        fontSize: '10px',
+        fontSize: '11px',
         fontWeight: 600,
         textTransform: 'uppercase',
         letterSpacing: '0.06em',
+        ...style,
       }}
     >
-      {item.event.titulo}
-    </span>
+      {/* El realce de hover es una capa de acento a opacidad baja: framer no
+          sabe interpolar color-mix(), pero opacity anima limpio. */}
+      <motion.span
+        aria-hidden
+        className="pointer-events-none absolute inset-0"
+        style={{ background: 'var(--accent)' }}
+        animate={{ opacity: hovered && !reduced ? 0.12 : 0 }}
+        transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
+      />
+      <span className="relative block truncate">{title}</span>
+    </motion.span>
   );
 }
 
-function GridView({ events, todayStart, onSeeAllInTimeline }) {
+function GridView({ events, todayStart }) {
   const reduced = useReducedMotion();
   const containerRef = useRef(null);
   const [cursorMonth, setCursorMonth] = useState(
     () => new Date(todayStart.getFullYear(), todayStart.getMonth(), 1),
   );
   const [selectedDay, setSelectedDay] = useState('');
+  const [direction, setDirection] = useState(0);
 
   const enriched = useMemo(() => enrichEvents(events), [events]);
 
@@ -118,11 +144,6 @@ function GridView({ events, todayStart, onSeeAllInTimeline }) {
     [cursorMonth],
   );
 
-  const upcoming = useMemo(
-    () => enriched.filter((item) => startOfDay(item.end) >= todayStart).slice(0, MAX_UPCOMING),
-    [enriched, todayStart],
-  );
-
   const selectedDate = useMemo(() => fromDateInputValue(selectedDay), [selectedDay]);
 
   const selectedItems = useMemo(
@@ -148,18 +169,18 @@ function GridView({ events, todayStart, onSeeAllInTimeline }) {
   }, [selectedDay]);
 
   const shiftMonth = (delta) => {
+    setDirection(delta);
     setSelectedDay('');
-    setCursorMonth(
-      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
-    );
+    setCursorMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
   };
 
   const goToday = () => {
+    setDirection(0);
     setSelectedDay('');
     setCursorMonth(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
   };
 
-  const handleDayClick = (day, dayItems) => {
+  const selectDay = (day, dayItems) => {
     if (dayItems.length === 0) {
       return;
     }
@@ -168,16 +189,26 @@ function GridView({ events, todayStart, onSeeAllInTimeline }) {
     setSelectedDay((current) => (current === key ? '' : key));
   };
 
-  const renderDayNumber = (day, inMonth) => {
-    const color = !inMonth
-      ? 'color-mix(in srgb, var(--text-muted) 35%, transparent)'
-      : isWeekend(day)
-        ? 'color-mix(in srgb, var(--text-muted) 60%, transparent)'
-        : 'var(--text-muted)';
+  const getCellBackground = (weekend, selected) => {
+    // El seleccionado siempre lleva la mezcla con acento: si usara bg-secondary
+    // a secas quedaria indistinguible de un fin de semana sin seleccionar.
+    if (selected) return 'color-mix(in srgb, var(--bg-secondary) 100%, var(--accent) 8%)';
+    if (weekend) return 'var(--bg-secondary)';
+    return 'transparent';
+  };
+
+  const renderDayNumber = (day, inMonth, isToday) => {
+    const color = isToday
+      ? 'var(--accent)'
+      : !inMonth
+        ? 'color-mix(in srgb, var(--text-muted) 35%, transparent)'
+        : isWeekend(day)
+          ? 'color-mix(in srgb, var(--text-muted) 60%, transparent)'
+          : 'var(--text-muted)';
 
     return (
       <span
-        className="block text-[11px] font-semibold leading-4"
+        className="block text-[12px] font-semibold leading-4"
         style={{
           color,
           fontFamily: 'var(--font-mono, monospace)',
@@ -209,22 +240,44 @@ function GridView({ events, todayStart, onSeeAllInTimeline }) {
             return (
               <div
                 key={dayIndex}
-                onClick={() => handleDayClick(day, dayItems)}
-                className={`min-h-[80px] p-1.5 md:min-h-[120px] ${
+                onClick={() => selectDay(day, dayItems)}
+                className={`relative min-h-[100px] p-2 md:min-h-[150px] ${
                   dayItems.length > 0 ? 'cursor-pointer' : 'cursor-default'
                 }`}
                 style={{
-                  borderTop: `3px solid ${isToday ? 'var(--accent)' : 'transparent'}`,
+                  borderTop: '3px solid transparent',
                   borderRight: dayIndex === 6 ? 'none' : '1px solid var(--border-subtle)',
                   borderBottom: isLastWeek ? 'none' : '1px solid var(--border-subtle)',
-                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
+                  background: getCellBackground(isWeekend(day), isSelected),
                 }}
               >
-                {renderDayNumber(day, inMonth)}
+                {/* El pulso de hoy anima opacidad sobre una barra solida en vez
+                    de un glow: el sistema visual prohibe sombras con blur. */}
+                {isToday ? (
+                  <motion.span
+                    aria-hidden
+                    className="pointer-events-none absolute left-0 right-0"
+                    style={{ top: -3, height: 3, background: 'var(--accent)' }}
+                    animate={reduced ? { opacity: 1 } : { opacity: [1, 0.6, 1] }}
+                    transition={
+                      reduced
+                        ? { duration: 0 }
+                        : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
+                    }
+                  />
+                ) : null}
+
+                {renderDayNumber(day, inMonth, isToday)}
                 <div style={{ height: laneCount * BAR_HEIGHT }} />
                 <div className="space-y-[2px]">
                   {visibleSingles.map((item) => (
-                    <EventChip key={item.key} item={item} />
+                    <EventBlock
+                      key={item.key}
+                      title={item.event.titulo}
+                      categoria={item.event.categoria}
+                      index={weekIndex * 7 + dayIndex}
+                      reduced={reduced}
+                    />
                   ))}
                   {hidden > 0 ? (
                     <span
@@ -240,244 +293,223 @@ function GridView({ events, todayStart, onSeeAllInTimeline }) {
           })}
         </div>
 
-        {/* Las barras viven en una capa aparte para poder cruzar celdas; no
-            interceptan clicks, así la celda de abajo sigue siendo el control. */}
+        {/* Las barras cruzan celdas, así que viven en una capa aparte. La capa no
+            intercepta clicks; solo la barra, para poder resaltar en hover y
+            abrir el mismo panel que la celda donde arranca. */}
         <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
           {bars.map((bar) => (
-            <span
+            <EventBlock
               key={bar.item.key}
-              className="truncate self-start"
+              title={bar.item.event.titulo}
+              categoria={bar.item.event.categoria}
+              index={weekIndex * 7 + bar.startIndex}
+              reduced={reduced}
+              className="pointer-events-auto cursor-pointer self-start"
+              onClick={() =>
+                selectDay(
+                  week[bar.startIndex],
+                  enriched.filter((item) => coversDay(item, week[bar.startIndex])),
+                )
+              }
               style={{
                 gridColumn: `${bar.startIndex + 1} / span ${bar.span}`,
                 gridRow: 1,
                 marginTop: LANES_TOP + bar.lane * BAR_HEIGHT,
-                marginRight: bar.startIndex + bar.span === 7 ? '6px' : '2px',
-                marginLeft: '6px',
-                borderLeft: `3px solid ${getCategoryColor(bar.item.event.categoria)}`,
-                background: 'var(--bg-secondary)',
-                color: 'var(--text-normal)',
-                padding: '2px 6px',
-                fontSize: '10px',
-                fontWeight: 600,
-                textTransform: 'uppercase',
-                letterSpacing: '0.06em',
+                marginRight: bar.startIndex + bar.span === 7 ? '8px' : '2px',
+                marginLeft: '8px',
               }}
-            >
-              {bar.item.event.titulo}
-            </span>
+            />
           ))}
         </div>
       </div>
     );
   };
 
+  const enterX = reduced ? 0 : direction * SLIDE_DISTANCE;
+
   return (
     <motion.div
       ref={containerRef}
-      className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]"
       initial={{ opacity: 0, y: reduced ? 0 : 6 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
     >
-      <div className="min-w-0">
-        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4">
-          <div className="flex items-baseline gap-3">
-            <h3
-              className="text-2xl font-extrabold uppercase"
-              style={{
-                color: 'var(--text-strong)',
-                fontFamily: 'var(--font-display, sans-serif)',
-                letterSpacing: '-0.02em',
-              }}
-            >
-              {MONTHS_FULL[cursorMonth.getMonth()]}
-            </h3>
-            <span
-              className="text-xs"
-              style={{
-                color: 'var(--text-muted)',
-                fontFamily: 'var(--font-mono, monospace)',
-                fontVariantNumeric: 'tabular-nums',
-              }}
-            >
-              {cursorMonth.getFullYear()}
-            </span>
-          </div>
-
-          <div className="flex items-center gap-2">
-            <button
-              type="button"
-              onClick={() => shiftMonth(-1)}
-              aria-label="Mes anterior"
-              className="btn-outline inline-flex h-9 w-9 items-center justify-center"
-            >
-              <ChevronLeft className="h-4 w-4" />
-            </button>
-            <button
-              type="button"
-              onClick={goToday}
-              className="btn-outline px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
-            >
-              Hoy
-            </button>
-            <button
-              type="button"
-              onClick={() => shiftMonth(1)}
-              aria-label="Mes siguiente"
-              className="btn-outline inline-flex h-9 w-9 items-center justify-center"
-            >
-              <ChevronRight className="h-4 w-4" />
-            </button>
-          </div>
+      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4">
+        <div className="flex items-baseline gap-3">
+          <h3
+            className="text-2xl font-extrabold uppercase"
+            style={{
+              color: 'var(--text-strong)',
+              fontFamily: 'var(--font-display, sans-serif)',
+              letterSpacing: '-0.02em',
+            }}
+          >
+            {MONTHS_FULL[cursorMonth.getMonth()]}
+          </h3>
+          <span
+            className="text-xs"
+            style={{
+              color: 'var(--text-muted)',
+              fontFamily: 'var(--font-mono, monospace)',
+              fontVariantNumeric: 'tabular-nums',
+            }}
+          >
+            {cursorMonth.getFullYear()}
+          </span>
         </div>
 
-        <div
-          className="border"
-          style={{
-            borderColor: 'var(--border)',
-            background: 'var(--bg-card)',
-            borderRadius: 'var(--radius-card, 0px)',
-          }}
-        >
-          <div
-            className="grid grid-cols-7 border-b"
-            style={{ borderColor: 'var(--border-subtle)' }}
+        <div className="flex items-center gap-2">
+          <motion.button
+            type="button"
+            onClick={() => shiftMonth(-1)}
+            aria-label="Mes anterior"
+            className="btn-outline inline-flex h-9 w-9 items-center justify-center"
+            whileHover={reduced ? undefined : { x: -2 }}
+            transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
           >
-            {WEEKDAYS_SHORT.map((label) => (
-              <span
-                key={label}
-                className="px-1.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
-                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
-              >
-                {label}
-              </span>
-            ))}
-          </div>
+            <ChevronLeft className="h-4 w-4" />
+          </motion.button>
+          <button
+            type="button"
+            onClick={goToday}
+            className="btn-outline px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
+          >
+            Hoy
+          </button>
+          <motion.button
+            type="button"
+            onClick={() => shiftMonth(1)}
+            aria-label="Mes siguiente"
+            className="btn-outline inline-flex h-9 w-9 items-center justify-center"
+            whileHover={reduced ? undefined : { x: 2 }}
+            transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}
+          >
+            <ChevronRight className="h-4 w-4" />
+          </motion.button>
+        </div>
+      </div>
 
-          {weeks.map((week, index) => renderWeek(week, index, index === weeks.length - 1))}
+      <div
+        className="border"
+        style={{
+          borderColor: 'var(--border)',
+          background: 'var(--bg-card)',
+          borderRadius: 'var(--radius-card, 0px)',
+        }}
+      >
+        <div
+          className="grid grid-cols-7"
+          style={{ borderBottom: '2px solid var(--border)' }}
+        >
+          {WEEKDAYS_SHORT.map((label) => (
+            <span
+              key={label}
+              className="px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em]"
+              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
+            >
+              {label}
+            </span>
+          ))}
         </div>
 
-        <AnimatePresence initial={false}>
-          {selectedItems.length > 0 ? (
+        <div style={{ overflow: 'hidden' }}>
+          <AnimatePresence mode="wait" initial={false}>
             <motion.div
-              key={selectedDay}
-              initial={{ height: 0, opacity: 0 }}
-              animate={{ height: 'auto', opacity: 1 }}
-              exit={{ height: 0, opacity: 0 }}
-              transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
-              style={{ overflow: 'hidden' }}
+              key={`${cursorMonth.getFullYear()}-${cursorMonth.getMonth()}`}
+              // Con reduced no hay estado inicial que remontar: el mes entra ya
+              // pintado en vez de depender de un frame para volverse visible.
+              initial={reduced ? false : { x: enterX, opacity: 0 }}
+              animate={{ x: 0, opacity: 1 }}
+              exit={reduced ? { opacity: 1 } : { x: -enterX, opacity: 0 }}
+              transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
             >
-              <div
-                className="mt-4 border p-4"
-                style={{
-                  borderColor: 'var(--border)',
-                  background: 'var(--bg-card)',
-                  borderRadius: 'var(--radius-card, 0px)',
-                }}
-              >
-                <p
-                  className="text-[10px] font-bold uppercase tracking-[0.24em]"
-                  style={{ color: 'var(--accent)' }}
-                >
-                  {formatGutterDate({ start: selectedDate, end: selectedDate, isRange: false })}
-                </p>
-                <div className="mt-3 space-y-3">
-                  {selectedItems.map((item) => {
-                    const Icon = getCategoryIcon(item.event.categoria);
-                    const time = formatEventTime(item.event);
-
-                    return (
-                      <div
-                        key={item.key}
-                        className="border-l pl-3"
-                        style={{ borderLeftWidth: '3px', borderLeftColor: getCategoryColor(item.event.categoria) }}
-                      >
-                        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
-                          {item.event.titulo}
-                        </p>
-                        <p
-                          className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
-                          style={{ color: 'var(--text-muted)' }}
-                        >
-                          <Icon className="h-3 w-3 shrink-0" />
-                          <span>{item.event.categoria || 'General'}</span>
-                          {item.isRange ? <span>· {formatGutterDate(item)}</span> : null}
-                          {time ? (
-                            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
-                              · {time}
-                            </span>
-                          ) : null}
-                        </p>
-                        {item.event.descripcion ? (
-                          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-normal)' }}>
-                            {item.event.descripcion}
-                          </p>
-                        ) : null}
-                        {item.event.ubicacion ? (
-                          <p
-                            className="mt-2 flex items-center gap-2 text-xs"
-                            style={{ color: 'var(--text-muted)' }}
-                          >
-                            <MapPin className="h-3.5 w-3.5 shrink-0" />
-                            {item.event.ubicacion}
-                          </p>
-                        ) : null}
-                      </div>
-                    );
-                  })}
-                </div>
-              </div>
+              {weeks.map((week, index) => renderWeek(week, index, index === weeks.length - 1))}
             </motion.div>
-          ) : null}
-        </AnimatePresence>
+          </AnimatePresence>
+        </div>
       </div>
 
-      <aside className="hidden md:block">
-        <p
-          className="text-[11px] font-bold uppercase tracking-[0.24em]"
-          style={{ color: 'var(--text-muted)' }}
-        >
-          Próximos
-        </p>
-
-        {upcoming.length === 0 ? (
-          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
-            Sin eventos por delante.
-          </p>
-        ) : (
-          <div className="mt-3">
-            {upcoming.map((item) => (
-              <div
-                key={item.key}
-                className="border-b py-3"
-                style={{ borderColor: 'var(--border-subtle)' }}
-              >
+      <AnimatePresence initial={false}>
+        {selectedItems.length > 0 ? (
+          <motion.div
+            key={selectedDay}
+            initial={{ height: 0, opacity: 0 }}
+            animate={{ height: 'auto', opacity: 1 }}
+            exit={{ height: 0, opacity: 0 }}
+            transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
+            style={{ overflow: 'hidden' }}
+          >
+            <div
+              className="mt-4 border p-5"
+              style={{
+                borderColor: 'var(--border)',
+                background: 'var(--bg-card)',
+                borderRadius: 'var(--radius-card, 0px)',
+              }}
+            >
+              <p className="flex flex-wrap items-baseline gap-x-2 text-[10px] font-bold uppercase tracking-[0.24em]">
+                <span style={{ color: 'var(--accent)' }}>
+                  {formatGutterDate({ start: selectedDate, end: selectedDate, isRange: false })}
+                </span>
                 <span
-                  className="block text-[10px] font-semibold uppercase tracking-[0.16em]"
                   style={{
                     color: 'var(--text-muted)',
                     fontFamily: 'var(--font-mono, monospace)',
                     fontVariantNumeric: 'tabular-nums',
                   }}
                 >
-                  {formatGutterDate(item)}
+                  · {selectedItems.length} evento{selectedItems.length === 1 ? '' : 's'}
                 </span>
-                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
-                  {item.event.titulo}
-                </p>
+              </p>
+              <div className="mt-3 space-y-3">
+                {selectedItems.map((item) => {
+                  const Icon = getCategoryIcon(item.event.categoria);
+                  const time = formatEventTime(item.event);
+
+                  return (
+                    <div
+                      key={item.key}
+                      className="border-l pl-3"
+                      style={{ borderLeftWidth: '3px', borderLeftColor: getCategoryColor(item.event.categoria) }}
+                    >
+                      <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
+                        {item.event.titulo}
+                      </p>
+                      <p
+                        className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
+                        style={{ color: 'var(--text-muted)' }}
+                      >
+                        <Icon className="h-3 w-3 shrink-0" />
+                        <span>{item.event.categoria || 'General'}</span>
+                        {item.isRange ? <span>· {formatGutterDate(item)}</span> : null}
+                        {time ? (
+                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
+                            · {time}
+                          </span>
+                        ) : null}
+                      </p>
+                      {item.event.descripcion ? (
+                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-normal)' }}>
+                          {item.event.descripcion}
+                        </p>
+                      ) : null}
+                      {item.event.ubicacion ? (
+                        <p
+                          className="mt-2 flex items-center gap-2 text-xs"
+                          style={{ color: 'var(--text-muted)' }}
+                        >
+                          <MapPin className="h-3.5 w-3.5 shrink-0" />
+                          {item.event.ubicacion}
+                        </p>
+                      ) : null}
+                    </div>
+                  );
+                })}
               </div>
-            ))}
-          </div>
-        )}
-
-        <button
-          type="button"
-          onClick={onSeeAllInTimeline}
-          className="link-accent mt-4 text-[11px] font-bold uppercase tracking-[0.18em]"
-        >
-          Ver todos
-        </button>
-      </aside>
+            </div>
+          </motion.div>
+        ) : null}
+      </AnimatePresence>
     </motion.div>
   );
 }
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
