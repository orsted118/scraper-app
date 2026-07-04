# Report 082
**Fecha:** 2026-06-21 23:41  
**Agente:** Codex  
**Tipo:** frontend

## Contexto Git
**Rama:** master
**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
**Archivos modificados:** 2

## Archivos modificados
- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| src/components/StackedEventCards.jsx | 147 | 157 |
| src/pages/Calendario.jsx | 106 | 77 |

## Resumen
Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `src/components/StackedEventCards.jsx`
```diff
diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
index 3c412de..c2f6386 100644
--- a/src/components/StackedEventCards.jsx
+++ b/src/components/StackedEventCards.jsx
@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
 import { classifyEvent } from '../utils/eventClassifier';
 
 const MAX_VISIBLE = 5;
-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
-const STACK_OFFSETS = [
-  { x: 0, y: 0 },
-  { x: -8, y: -4 },
-  { x: -16, y: -8 },
-  { x: -24, y: -5 },
-  { x: -30, y: -10 },
-];
+const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+
+const EVENT_DESCRIPTIONS = {
+  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+  semester_start: 'Inicio oficial de actividades académicas.',
+  semester_end: 'Último día del período escolar vigente.',
+  first_day_classes: 'Arranque del semestre y primeras actividades.',
+  last_day_classes: 'Cierre académico antes del siguiente período.',
+  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+  administrative_closure: 'Cierre administrativo del período en curso.',
+  final_grades_release: 'Publicación oficial de calificaciones finales.',
+  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+  grade_capture: 'Captura interna de evaluaciones y resultados.',
+  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+  winter_break: 'Receso invernal entre periodos escolares.',
+  summer_break: 'Receso de verano antes del siguiente ciclo.',
+  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+};
 
 function parseLooseDate(value) {
   if (!value) return null;
@@ -35,13 +61,13 @@ function parseLooseDate(value) {
 function formatStackDate(date) {
   if (!date) return '';
 
-  const day = date.getDate();
-  const month = date
-    .toLocaleDateString('es-MX', { month: 'short' })
-    .replace('.', '')
-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
-
-  return `${day} ${month}`;
+  return date
+    .toLocaleDateString('es-MX', {
+      day: '2-digit',
+      month: '2-digit',
+      year: 'numeric',
+    })
+    .replace(/\//g, '-');
 }
 
 function getEventTitle(event) {
@@ -52,140 +78,118 @@ function getEventDate(event) {
   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
 }
 
-function getCardStyle(category, index) {
-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
-  const rot = STACK_ROTATIONS[index] ?? 0;
+function getCardStyle(index, category) {
+  const scale = 1 - index * 0.05;
+  const rotation = STACK_ROTATIONS[index] ?? 0;
+  const opacity = Math.max(0.22, 1 - index * 0.18);
+
   return {
-    zIndex: MAX_VISIBLE - index,
-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+    zIndex: 10 - index,
+    transform: `scale(${scale}) rotate(${rotation}deg)`,
+    opacity,
     transformOrigin: 'center center',
-    '--discard-rot': `${rot}deg`,
-    background: `${category.color}26`,
-    borderColor: `${category.color}66`,
+    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+    background: 'var(--bg-card)',
+    borderColor: `${category.color}4D`,
   };
 }
 
-function StackCard({ event, index, phase }) {
+function getDescription(category, event) {
+  return (
+    event?.descripcion ||
+    event?.description ||
+    EVENT_DESCRIPTIONS[category.id] ||
+    'Fecha académica oficial del calendario ITSON.'
+  );
+}
+
+function StackCard({ event, index }) {
   const category = classifyEvent(getEventTitle(event));
   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
   const date = getEventDate(event);
 
-  const DESCRIPTIONS = {
-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
-    semester_start: 'Inicio oficial de actividades académicas.',
-    semester_end: 'Último día del período escolar vigente.',
-    first_day_classes: 'Arranque del semestre y primeras actividades.',
-    last_day_classes: 'Cierre académico antes del siguiente período.',
-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
-    administrative_closure: 'Cierre administrativo del período en curso.',
-    final_grades_release: 'Publicación oficial de calificaciones finales.',
-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
-    grade_capture: 'Captura interna de evaluaciones y resultados.',
-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
-    winter_break: 'Receso invernal entre periodos escolares.',
-    summer_break: 'Receso de verano antes del siguiente ciclo.',
-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
-  };
-
   return (
-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
-      <article
-        className={[
-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
-          phase === 'exit' ? 'animate-card-discard' : '',
-          phase === 'enter' ? 'animate-card-enter' : '',
-        ]
-          .filter(Boolean)
-          .join(' ')}
-        style={{
-          animationDelay: `${index * 60}ms`,
-        }}
-      >
-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
-
-        <div className="relative z-10 flex h-full w-full flex-col p-4">
-          <div className="mb-2 flex items-center justify-between">
-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
-              {category.label}
-            </span>
-            <span className="text-[10px]" style={{ color: category.color }}>
-              ✦ ✦ ✦
-            </span>
-          </div>
+    <article
+      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+      style={getCardStyle(index, category)}
+    >
+      <div className="flex h-full flex-col p-3">
+        <div className="flex items-start justify-between gap-2">
+          <span
+            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+            style={{ background: category.color }}
+          >
+            {category.label}
+          </span>
+          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+            ✦ ✦ ✦
+          </span>
+        </div>
 
-          <div className="flex flex-1 gap-3">
-            <div className="flex flex-col items-center justify-center gap-1">
-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
-                <Icon className="h-6 w-6" style={{ color: category.color }} />
-              </div>
-              <div className="flex gap-0.5">
-                {[0, 1, 2].map((star) => (
-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
-                    ★
-                  </span>
-                ))}
-              </div>
+        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+            <div
+              className="flex h-9 w-9 items-center justify-center rounded-full"
+              style={{ background: `${category.color}26` }}
+            >
+              <Icon className="h-4 w-4" style={{ color: category.color }} />
             </div>
+          </div>
 
-            <div className="flex flex-1 flex-col justify-center">
-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
-                {getEventTitle(event)}
-              </h5>
-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
-              </p>
-            </div>
+          <div className="min-w-0 flex-1">
+            <h5
+              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+              style={{ color: 'var(--text-strong)' }}
+            >
+              {getEventTitle(event)}
+            </h5>
+            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+              {getDescription(category, event)}
+            </p>
           </div>
+        </div>
 
-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
-            <div>
-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
-                Fecha del evento
-              </p>
-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
-                {date
-                  ? date
-                      .toLocaleDateString('es-MX', {
-                        day: '2-digit',
-                        month: '2-digit',
-                        year: 'numeric',
-                      })
-                      .replace(/\//g, '-')
-                  : 'Por confirmar'}
-              </p>
-            </div>
+        <div
+          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+          style={{ background: `${category.color}14` }}
+        >
+          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+          <div className="leading-tight">
+            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+              Fecha del evento
+            </p>
+            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+              {date ? formatStackDate(date) : 'Por confirmar'}
+            </p>
           </div>
         </div>
-      </article>
+      </div>
+    </article>
+  );
+}
+
+function EmptyState() {
+  return (
+    <div
+      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+      style={{ borderColor: 'var(--border-subtle)' }}
+    >
+      <div className="space-y-2 text-center">
+        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+          Sin eventos este mes
+        </p>
+      </div>
     </div>
   );
 }
 
 export default function StackedEventCards({ events = [], currentMonth }) {
-  const visibleEvents = useMemo(() => {
-    return (Array.isArray(events) ? events : [])
-      .slice(0, MAX_VISIBLE)
-      .filter(Boolean);
-  }, [events]);
+  const visibleEvents = useMemo(
+    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+    [events],
+  );
 
   const [stack, setStack] = useState(visibleEvents);
   const [phase, setPhase] = useState('idle');
@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
 
       const settleTimer = setTimeout(() => {
         setPhase('idle');
-      }, 320);
+      }, 180);
 
       timersRef.current.push(settleTimer);
-    }, 360);
+    }, 180);
 
     timersRef.current.push(exitTimer);
 
@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
     });
   };
 
-  if (!stack.length) {
-    return (
-      <div
-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
-      >
-        <div className="space-y-2">
-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
-            Sin eventos este mes
-          </p>
-        </div>
-      </div>
-    );
-  }
-
   return (
     <button
       type="button"
-      onClick={rotateStack}
-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
-      aria-label="Rotar eventos del calendario"
-      title="Haz clic para cambiar el evento"
+      onClick={visibleEvents.length ? rotateStack : undefined}
+      disabled={!visibleEvents.length}
+      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
     >
-      {stack.map((event, index) => (
-        <StackCard
-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
-          event={event}
-          index={index}
-          phase={phase}
-        />
-      ))}
+      {stack.length ? (
+        stack.map((event, index) => {
+          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+          return <StackCard key={key} event={event} index={index} phase={phase} />;
+        })
+      ) : (
+        <EmptyState />
+      )}
     </button>
   );
 }
```

### `src/pages/Calendario.jsx`
```diff
diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
index f83a172..0da02ab 100644
--- a/src/pages/Calendario.jsx
+++ b/src/pages/Calendario.jsx
@@ -10,6 +10,7 @@ import {
   MapPin,
   RefreshCw,
 } from 'lucide-react';
+import StackedEventCards from '../components/StackedEventCards';
 
 const MONTHS = [
   'Enero',
@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
 }
 
+function getEventDateForMonth(event) {
+  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+  if (direct) return direct;
+
+  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+  if (!match) return null;
+
+  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+  return Number.isNaN(parsed.getTime()) ? null : parsed;
+}
+
 function groupEventsByMonth(events) {
   return events.reduce((groups, event) => {
     const date = getValidDate(event.inicio);
@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
     () => getEventsForDay(events, selectedDay, filterCat),
     [events, filterCat, selectedDay],
   );
+  const visibleMonthEvents = useMemo(() => {
+    return events
+      .filter((event) => {
+        const date = getEventDateForMonth(event);
+        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+      })
+      .sort((left, right) => {
+        const leftDate = getEventDateForMonth(left);
+        const rightDate = getEventDateForMonth(right);
+        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+      });
+  }, [currentMonth, currentYear, events]);
   const groupedEvents = groupEventsByMonth(filteredEvents);
   const hasEvents = events.length > 0;
   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
         </div>
       ) : null}
 
+      <section
+        className="rounded-2xl border p-4"
+        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+      >
+        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+          <div className="flex items-center gap-2">
+            <button
+              type="button"
+              onClick={goToPreviousMonth}
+              className="rounded-xl border p-2 transition hover:scale-105"
+              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+              aria-label="Mes anterior"
+            >
+              <ChevronLeft className="h-4 w-4" />
+            </button>
+            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+              {monthLabel}
+            </p>
+            <button
+              type="button"
+              onClick={goToNextMonth}
+              className="rounded-xl border p-2 transition hover:scale-105"
+              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+              aria-label="Mes siguiente"
+            >
+              <ChevronRight className="h-4 w-4" />
+            </button>
+          </div>
+
+          <div className="flex flex-wrap items-end gap-3">
+            <SelectField
+              label="Seleccionar un calendario"
+              value={selectedCalendarType}
+              onChange={handleCalendarTypeChange}
+              className="min-w-[260px]"
+            >
+              {calendarTypes.map((type) => (
+                <option key={type} value={type}>
+                  {type}
+                </option>
+              ))}
+            </SelectField>
+
+            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+              {categories.map((category) => (
+                <option key={category} value={category}>
+                  {category}
+                </option>
+              ))}
+            </SelectField>
+            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+              {[
+                { id: 'list', label: 'Lista', Icon: List },
+                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+              ].map(({ id, label, Icon }) => {
+                const active = viewMode === id;
+                return (
+                  <button
+                    key={id}
+                    type="button"
+                    onClick={() => setViewMode(id)}
+                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+                    style={{
+                      background: active ? 'var(--accent)' : 'transparent',
+                      color: active ? '#fff' : 'var(--text-muted)',
+                    }}
+                    title={label}
+                  >
+                    <Icon className="h-4 w-4" />
+                  </button>
+                );
+              })}
+            </div>
+
+            <div className="shrink-0 self-center">
+              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+            </div>
+          </div>
+        </div>
+      </section>
+
       {!calendarData?.error && !hasEvents ? (
         <div
           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
 
       {hasEvents ? (
         <>
-          <section
-            className="rounded-2xl border p-4"
-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
-          >
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
-
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
-
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
-                </div>
-              </div>
-            </div>
-          </section>
-
           {viewMode === 'grid' ? (
             <>
               <section
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** npm run build + notifications route checks
**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
**Output de verificación:**
```
$ npm run build
> dvpotro@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1769 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            0.47 kB │ gzip:  0.30 kB
dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
✓ built in 8.13s

$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
notifications page: true
sidebar target: true
page exists: true
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
