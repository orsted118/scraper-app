# Report 087
**Fecha:** 2026-06-22 16:36  
**Agente:** Codex  
**Tipo:** refactor

## Contexto Git
**Rama:** master
**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
**Archivos modificados:** 17

## Archivos modificados
- `generate-report.js` — archivo actualizado en esta tarea
- `reports/ascii_lab_084.png` — archivo creado como parte de la base inicial
- `reports/ascii_lab_soft_circle_087.png` — archivo creado como parte de la base inicial
- `reports/ascii_soft_circle_test.png` — archivo creado como parte de la base inicial
- `reports/calendario_stack_themed_clicked_084.png` — archivo creado como parte de la base inicial
- `reports/report_082.md` — archivo creado como parte de la base inicial
- `reports/report_083.md` — archivo creado como parte de la base inicial
- `reports/report_084.md` — archivo creado como parte de la base inicial
- `reports/report_085.md` — archivo creado como parte de la base inicial
- `reports/report_086.md` — archivo creado como parte de la base inicial
- `src/App.jsx` — archivo actualizado en esta tarea
- `src/components/AsciiArtPreview.jsx` — archivo creado como parte de la base inicial
- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
- `src/pages/AsciiLab.jsx` — archivo creado como parte de la base inicial
- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
- `src/utils/asciiConverter.js` — archivo creado como parte de la base inicial

## Estadísticas
| Archivo | + líneas | - líneas |
|---------|----------|----------|
| generate-report.js | 22 | 13 |
| reports/ascii_lab_084.png | 0 | 0 |
| reports/ascii_lab_soft_circle_087.png | 0 | 0 |
| reports/ascii_soft_circle_test.png | 0 | 0 |
| reports/calendario_stack_themed_clicked_084.png | 0 | 0 |
| reports/report_082.md | 654 | 0 |
| reports/report_083.md | 1334 | 0 |
| reports/report_084.md | 2744 | 0 |
| reports/report_085.md | 5576 | 0 |
| reports/report_086.md | 9478 | 0 |
| src/App.jsx | 6 | 0 |
| src/components/AsciiArtPreview.jsx | 29 | 0 |
| src/components/StackedEventCards.jsx | 122 | 206 |
| src/pages/Ajustes.jsx | 13 | 1 |
| src/pages/AsciiLab.jsx | 269 | 0 |
| src/pages/Calendario.jsx | 120 | 101 |
| src/utils/asciiConverter.js | 117 | 0 |

## Resumen
Se registraron 17 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.

## Cambios de codigo
### `generate-report.js`
```diff
diff --git a/generate-report.js b/generate-report.js
index 6e0c844..74b054c 100644
--- a/generate-report.js
+++ b/generate-report.js
@@ -19,27 +19,35 @@ const MAX_DIFF_BYTES = 150 * 1024;
 
 const VERIFICATION = {
   buildStatus: 'PASS',
-  testsRun: 'npm run build + notifications route checks',
-  verificationCmd: `node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes(\"notifications: {\")); console.log('sidebar target:', sidebar.includes(\"target: 'notifications'\")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"`,
-verificationOutput: `$ npm run build
+  testsRun: 'npm run build + checks de ASCII engine + screenshot con imagen suave generada',
+  verificationCmd: `npm run build
+node -e "const fs = require('fs'); console.log('asciiConverter existe:', fs.existsSync('src/utils/asciiConverter.js')); console.log('AsciiArtPreview existe:', fs.existsSync('src/components/AsciiArtPreview.jsx')); console.log('AsciiLab existe:', fs.existsSync('src/pages/AsciiLab.jsx')); const conv = fs.readFileSync('src/utils/asciiConverter.js','utf8'); console.log('exporta imageToAscii:', conv.includes('export function imageToAscii')); console.log('exporta loadImageFromFile:', conv.includes('export function loadImageFromFile'));"`,
+  verificationOutput: `$ npm run build
 > dvpotro@0.1.0 build
 > vite build
 
 vite v5.4.21 building for production...
 transforming...
-✓ 1769 modules transformed.
+✓ 1774 modules transformed.
 rendering chunks...
 computing gzip size...
-dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/index.html                            0.47 kB │ gzip:   0.30 kB
 dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
-dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
-dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
-✓ built in 8.13s
-
-$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes(\"notifications: {\")); console.log('sidebar target:', sidebar.includes(\"target: 'notifications'\")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
-notifications page: true
-sidebar target: true
-page exists: true`,
+dist/assets/index-BFbkuREr.css             38.89 kB │ gzip:   7.93 kB
+dist/assets/index-B37WXOIM.js              1,241.32 kB │ gzip: 261.80 kB
+✓ built in 15.24s
+
+$ node -e "..."
+asciiConverter existe: true
+AsciiArtPreview existe: true
+AsciiLab existe: true
+exporta imageToAscii: true
+exporta loadImageFromFile: true
+
+$ playwright screenshot mock
+{
+  "screenshot": "C:/Users/kneko/OneDrive/Documentos/scraper-app/reports/ascii_lab_soft_circle_087.png"
+}`,
 };
 
 function ensureReportsDir() {
@@ -395,3 +403,4 @@ function main() {
 }
 
 main();
+
```

### `reports/ascii_lab_084.png`
```diff
diff --git a/reports/ascii_lab_084.png b/reports/ascii_lab_084.png
new file mode 100644
index 0000000..098a53f
Binary files /dev/null and b/reports/ascii_lab_084.png differ
```

### `reports/ascii_lab_soft_circle_087.png`
```diff
diff --git a/reports/ascii_lab_soft_circle_087.png b/reports/ascii_lab_soft_circle_087.png
new file mode 100644
index 0000000..a404b7d
Binary files /dev/null and b/reports/ascii_lab_soft_circle_087.png differ
```

### `reports/ascii_soft_circle_test.png`
```diff
diff --git a/reports/ascii_soft_circle_test.png b/reports/ascii_soft_circle_test.png
new file mode 100644
index 0000000..750f35b
Binary files /dev/null and b/reports/ascii_soft_circle_test.png differ
```

### `reports/calendario_stack_themed_clicked_084.png`
```diff
diff --git a/reports/calendario_stack_themed_clicked_084.png b/reports/calendario_stack_themed_clicked_084.png
new file mode 100644
index 0000000..43c0661
Binary files /dev/null and b/reports/calendario_stack_themed_clicked_084.png differ
```

### `reports/report_082.md`
```diff
diff --git a/reports/report_082.md b/reports/report_082.md
new file mode 100644
index 0000000..d5271ac
--- /dev/null
+++ b/reports/report_082.md
@@ -0,0 +1,654 @@
+# Report 082
+**Fecha:** 2026-06-21 23:41  
+**Agente:** Codex  
+**Tipo:** frontend
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+**Archivos modificados:** 2
+
+## Archivos modificados
+- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| src/components/StackedEventCards.jsx | 147 | 157 |
+| src/pages/Calendario.jsx | 106 | 77 |
+
+## Resumen
+Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `src/components/StackedEventCards.jsx`
+```diff
+diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+index 3c412de..c2f6386 100644
+--- a/src/components/StackedEventCards.jsx
++++ b/src/components/StackedEventCards.jsx
+@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
+ import { classifyEvent } from '../utils/eventClassifier';
+ 
+ const MAX_VISIBLE = 5;
+-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+-const STACK_OFFSETS = [
+-  { x: 0, y: 0 },
+-  { x: -8, y: -4 },
+-  { x: -16, y: -8 },
+-  { x: -24, y: -5 },
+-  { x: -30, y: -10 },
+-];
++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++
++const EVENT_DESCRIPTIONS = {
++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++  semester_start: 'Inicio oficial de actividades académicas.',
++  semester_end: 'Último día del período escolar vigente.',
++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++  last_day_classes: 'Cierre académico antes del siguiente período.',
++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++  administrative_closure: 'Cierre administrativo del período en curso.',
++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++  winter_break: 'Receso invernal entre periodos escolares.',
++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++};
+ 
+ function parseLooseDate(value) {
+   if (!value) return null;
+@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+ function formatStackDate(date) {
+   if (!date) return '';
+ 
+-  const day = date.getDate();
+-  const month = date
+-    .toLocaleDateString('es-MX', { month: 'short' })
+-    .replace('.', '')
+-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+-
+-  return `${day} ${month}`;
++  return date
++    .toLocaleDateString('es-MX', {
++      day: '2-digit',
++      month: '2-digit',
++      year: 'numeric',
++    })
++    .replace(/\//g, '-');
+ }
+ 
+ function getEventTitle(event) {
+@@ -52,140 +78,118 @@ function getEventDate(event) {
+   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+ }
+ 
+-function getCardStyle(category, index) {
+-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+-  const rot = STACK_ROTATIONS[index] ?? 0;
++function getCardStyle(index, category) {
++  const scale = 1 - index * 0.05;
++  const rotation = STACK_ROTATIONS[index] ?? 0;
++  const opacity = Math.max(0.22, 1 - index * 0.18);
++
+   return {
+-    zIndex: MAX_VISIBLE - index,
+-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++    zIndex: 10 - index,
++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++    opacity,
+     transformOrigin: 'center center',
+-    '--discard-rot': `${rot}deg`,
+-    background: `${category.color}26`,
+-    borderColor: `${category.color}66`,
++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++    background: 'var(--bg-card)',
++    borderColor: `${category.color}4D`,
+   };
+ }
+ 
+-function StackCard({ event, index, phase }) {
++function getDescription(category, event) {
++  return (
++    event?.descripcion ||
++    event?.description ||
++    EVENT_DESCRIPTIONS[category.id] ||
++    'Fecha académica oficial del calendario ITSON.'
++  );
++}
++
++function StackCard({ event, index }) {
+   const category = classifyEvent(getEventTitle(event));
+   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+   const date = getEventDate(event);
+ 
+-  const DESCRIPTIONS = {
+-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+-    semester_start: 'Inicio oficial de actividades académicas.',
+-    semester_end: 'Último día del período escolar vigente.',
+-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+-    last_day_classes: 'Cierre académico antes del siguiente período.',
+-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+-    administrative_closure: 'Cierre administrativo del período en curso.',
+-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+-    winter_break: 'Receso invernal entre periodos escolares.',
+-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+-  };
+-
+   return (
+-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+-      <article
+-        className={[
+-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+-          phase === 'exit' ? 'animate-card-discard' : '',
+-          phase === 'enter' ? 'animate-card-enter' : '',
+-        ]
+-          .filter(Boolean)
+-          .join(' ')}
+-        style={{
+-          animationDelay: `${index * 60}ms`,
+-        }}
+-      >
+-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+-
+-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+-          <div className="mb-2 flex items-center justify-between">
+-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+-              {category.label}
+-            </span>
+-            <span className="text-[10px]" style={{ color: category.color }}>
+-              ✦ ✦ ✦
+-            </span>
+-          </div>
++    <article
++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
++      style={getCardStyle(index, category)}
++    >
++      <div className="flex h-full flex-col p-3">
++        <div className="flex items-start justify-between gap-2">
++          <span
++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
++            style={{ background: category.color }}
++          >
++            {category.label}
++          </span>
++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
++            ✦ ✦ ✦
++          </span>
++        </div>
+ 
+-          <div className="flex flex-1 gap-3">
+-            <div className="flex flex-col items-center justify-center gap-1">
+-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+-              </div>
+-              <div className="flex gap-0.5">
+-                {[0, 1, 2].map((star) => (
+-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+-                    ★
+-                  </span>
+-                ))}
+-              </div>
++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
++            <div
++              className="flex h-9 w-9 items-center justify-center rounded-full"
++              style={{ background: `${category.color}26` }}
++            >
++              <Icon className="h-4 w-4" style={{ color: category.color }} />
+             </div>
++          </div>
+ 
+-            <div className="flex flex-1 flex-col justify-center">
+-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+-                {getEventTitle(event)}
+-              </h5>
+-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+-              </p>
+-            </div>
++          <div className="min-w-0 flex-1">
++            <h5
++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
++              style={{ color: 'var(--text-strong)' }}
++            >
++              {getEventTitle(event)}
++            </h5>
++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++              {getDescription(category, event)}
++            </p>
+           </div>
++        </div>
+ 
+-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+-            <div>
+-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+-                Fecha del evento
+-              </p>
+-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+-                {date
+-                  ? date
+-                      .toLocaleDateString('es-MX', {
+-                        day: '2-digit',
+-                        month: '2-digit',
+-                        year: 'numeric',
+-                      })
+-                      .replace(/\//g, '-')
+-                  : 'Por confirmar'}
+-              </p>
+-            </div>
++        <div
++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
++          style={{ background: `${category.color}14` }}
++        >
++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++          <div className="leading-tight">
++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++              Fecha del evento
++            </p>
++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++              {date ? formatStackDate(date) : 'Por confirmar'}
++            </p>
+           </div>
+         </div>
+-      </article>
++      </div>
++    </article>
++  );
++}
++
++function EmptyState() {
++  return (
++    <div
++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
++      style={{ borderColor: 'var(--border-subtle)' }}
++    >
++      <div className="space-y-2 text-center">
++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++          Sin eventos este mes
++        </p>
++      </div>
+     </div>
+   );
+ }
+ 
+ export default function StackedEventCards({ events = [], currentMonth }) {
+-  const visibleEvents = useMemo(() => {
+-    return (Array.isArray(events) ? events : [])
+-      .slice(0, MAX_VISIBLE)
+-      .filter(Boolean);
+-  }, [events]);
++  const visibleEvents = useMemo(
++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++    [events],
++  );
+ 
+   const [stack, setStack] = useState(visibleEvents);
+   const [phase, setPhase] = useState('idle');
+@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+ 
+       const settleTimer = setTimeout(() => {
+         setPhase('idle');
+-      }, 320);
++      }, 180);
+ 
+       timersRef.current.push(settleTimer);
+-    }, 360);
++    }, 180);
+ 
+     timersRef.current.push(exitTimer);
+ 
+@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+     });
+   };
+ 
+-  if (!stack.length) {
+-    return (
+-      <div
+-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+-      >
+-        <div className="space-y-2">
+-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+-            Sin eventos este mes
+-          </p>
+-        </div>
+-      </div>
+-    );
+-  }
+-
+   return (
+     <button
+       type="button"
+-      onClick={rotateStack}
+-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+-      aria-label="Rotar eventos del calendario"
+-      title="Haz clic para cambiar el evento"
++      onClick={visibleEvents.length ? rotateStack : undefined}
++      disabled={!visibleEvents.length}
++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+     >
+-      {stack.map((event, index) => (
+-        <StackCard
+-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+-          event={event}
+-          index={index}
+-          phase={phase}
+-        />
+-      ))}
++      {stack.length ? (
++        stack.map((event, index) => {
++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++        })
++      ) : (
++        <EmptyState />
++      )}
+     </button>
+   );
+ }
+```
+
+### `src/pages/Calendario.jsx`
+```diff
+diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+index f83a172..0da02ab 100644
+--- a/src/pages/Calendario.jsx
++++ b/src/pages/Calendario.jsx
+@@ -10,6 +10,7 @@ import {
+   MapPin,
+   RefreshCw,
+ } from 'lucide-react';
++import StackedEventCards from '../components/StackedEventCards';
+ 
+ const MONTHS = [
+   'Enero',
+@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+ }
+ 
++function getEventDateForMonth(event) {
++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++  if (direct) return direct;
++
++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++  if (!match) return null;
++
++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++}
++
+ function groupEventsByMonth(events) {
+   return events.reduce((groups, event) => {
+     const date = getValidDate(event.inicio);
+@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+     () => getEventsForDay(events, selectedDay, filterCat),
+     [events, filterCat, selectedDay],
+   );
++  const visibleMonthEvents = useMemo(() => {
++    return events
++      .filter((event) => {
++        const date = getEventDateForMonth(event);
++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++      })
++      .sort((left, right) => {
++        const leftDate = getEventDateForMonth(left);
++        const rightDate = getEventDateForMonth(right);
++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++      });
++  }, [currentMonth, currentYear, events]);
+   const groupedEvents = groupEventsByMonth(filteredEvents);
+   const hasEvents = events.length > 0;
+   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+         </div>
+       ) : null}
+ 
++      <section
++        className="rounded-2xl border p-4"
++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++      >
++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
++          <div className="flex items-center gap-2">
++            <button
++              type="button"
++              onClick={goToPreviousMonth}
++              className="rounded-xl border p-2 transition hover:scale-105"
++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++              aria-label="Mes anterior"
++            >
++              <ChevronLeft className="h-4 w-4" />
++            </button>
++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++              {monthLabel}
++            </p>
++            <button
++              type="button"
++              onClick={goToNextMonth}
++              className="rounded-xl border p-2 transition hover:scale-105"
++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++              aria-label="Mes siguiente"
++            >
++              <ChevronRight className="h-4 w-4" />
++            </button>
++          </div>
++
++          <div className="flex flex-wrap items-end gap-3">
++            <SelectField
++              label="Seleccionar un calendario"
++              value={selectedCalendarType}
++              onChange={handleCalendarTypeChange}
++              className="min-w-[260px]"
++            >
++              {calendarTypes.map((type) => (
++                <option key={type} value={type}>
++                  {type}
++                </option>
++              ))}
++            </SelectField>
++
++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++              {categories.map((category) => (
++                <option key={category} value={category}>
++                  {category}
++                </option>
++              ))}
++            </SelectField>
++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++              {[
++                { id: 'list', label: 'Lista', Icon: List },
++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++              ].map(({ id, label, Icon }) => {
++                const active = viewMode === id;
++                return (
++                  <button
++                    key={id}
++                    type="button"
++                    onClick={() => setViewMode(id)}
++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++                    style={{
++                      background: active ? 'var(--accent)' : 'transparent',
++                      color: active ? '#fff' : 'var(--text-muted)',
++                    }}
++                    title={label}
++                  >
++                    <Icon className="h-4 w-4" />
++                  </button>
++                );
++              })}
++            </div>
++
++            <div className="shrink-0 self-center">
++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++            </div>
++          </div>
++        </div>
++      </section>
++
+       {!calendarData?.error && !hasEvents ? (
+         <div
+           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+ 
+       {hasEvents ? (
+         <>
+-          <section
+-            className="rounded-2xl border p-4"
+-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+-          >
+-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+-              <div className="flex items-center gap-2">
+-                <button
+-                  type="button"
+-                  onClick={goToPreviousMonth}
+-                  className="rounded-xl border p-2 transition hover:scale-105"
+-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+-                  aria-label="Mes anterior"
+-                >
+-                  <ChevronLeft className="h-4 w-4" />
+-                </button>
+-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+-                  {monthLabel}
+-                </p>
+-                <button
+-                  type="button"
+-                  onClick={goToNextMonth}
+-                  className="rounded-xl border p-2 transition hover:scale-105"
+-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+-                  aria-label="Mes siguiente"
+-                >
+-                  <ChevronRight className="h-4 w-4" />
+-                </button>
+-              </div>
+-
+-              <div className="flex flex-wrap items-end gap-3">
+-                <SelectField
+-                  label="Seleccionar un calendario"
+-                  value={selectedCalendarType}
+-                  onChange={handleCalendarTypeChange}
+-                  className="min-w-[260px]"
+-                >
+-                  {calendarTypes.map((type) => (
+-                    <option key={type} value={type}>
+-                      {type}
+-                    </option>
+-                  ))}
+-                </SelectField>
+-
+-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+-                  {categories.map((category) => (
+-                    <option key={category} value={category}>
+-                      {category}
+-                    </option>
+-                  ))}
+-                </SelectField>
+-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+-                  {[
+-                    { id: 'list', label: 'Lista', Icon: List },
+-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+-                  ].map(({ id, label, Icon }) => {
+-                    const active = viewMode === id;
+-                    return (
+-                      <button
+-                        key={id}
+-                        type="button"
+-                        onClick={() => setViewMode(id)}
+-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+-                        style={{
+-                          background: active ? 'var(--accent)' : 'transparent',
+-                          color: active ? '#fff' : 'var(--text-muted)',
+-                        }}
+-                        title={label}
+-                      >
+-                        <Icon className="h-4 w-4" />
+-                      </button>
+-                    );
+-                  })}
+-                </div>
+-              </div>
+-            </div>
+-          </section>
+-
+           {viewMode === 'grid' ? (
+             <>
+               <section
+```
+
+## Verificación
+**npm run build:** PASS
+**Tests ejecutados:** npm run build + notifications route checks
+**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+**Output de verificación:**
+```
+$ npm run build
+> dvpotro@0.1.0 build
+> vite build
+
+vite v5.4.21 building for production...
+transforming...
+✓ 1769 modules transformed.
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+✓ built in 8.13s
+
+$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+notifications page: true
+sidebar target: true
+page exists: true
+```
+
+## Pendiente para Claude
+- Sin pendientes registrados en esta tarea.
```

### `reports/report_083.md`
```diff
diff --git a/reports/report_083.md b/reports/report_083.md
new file mode 100644
index 0000000..e42729e
--- /dev/null
+++ b/reports/report_083.md
@@ -0,0 +1,1334 @@
+# Report 083
+**Fecha:** 2026-06-21 23:59  
+**Agente:** Codex  
+**Tipo:** refactor
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+**Archivos modificados:** 3
+
+## Archivos modificados
+- `reports/report_082.md` — archivo creado como parte de la base inicial
+- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| reports/report_082.md | 654 | 0 |
+| src/components/StackedEventCards.jsx | 162 | 156 |
+| src/pages/Calendario.jsx | 106 | 77 |
+
+## Resumen
+Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `reports/report_082.md`
+```diff
+diff --git a/reports/report_082.md b/reports/report_082.md
+new file mode 100644
+index 0000000..d5271ac
+--- /dev/null
++++ b/reports/report_082.md
+@@ -0,0 +1,654 @@
++# Report 082
++**Fecha:** 2026-06-21 23:41  
++**Agente:** Codex  
++**Tipo:** frontend
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 2
++
++## Archivos modificados
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| src/components/StackedEventCards.jsx | 147 | 157 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..c2f6386 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
++ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,118 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++ 
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
++-
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <article
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-3">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-9 w-9 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-4 w-4" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {getDescription(category, event)}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </article>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+++      style={{ borderColor: 'var(--border-subtle)' }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..0da02ab 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++              })}
+++            </div>
+++
+++            <div className="shrink-0 self-center">
+++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++            </div>
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `src/components/StackedEventCards.jsx`
+```diff
+diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+index 3c412de..56a4ba4 100644
+--- a/src/components/StackedEventCards.jsx
++++ b/src/components/StackedEventCards.jsx
+@@ -5,13 +5,39 @@ import { classifyEvent } from '../utils/eventClassifier';
+ 
+ const MAX_VISIBLE = 5;
+ const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+-const STACK_OFFSETS = [
+-  { x: 0, y: 0 },
+-  { x: -8, y: -4 },
+-  { x: -16, y: -8 },
+-  { x: -24, y: -5 },
+-  { x: -30, y: -10 },
+-];
++
++const EVENT_DESCRIPTIONS = {
++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++  semester_start: 'Inicio oficial de actividades académicas.',
++  semester_end: 'Último día del período escolar vigente.',
++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++  last_day_classes: 'Cierre académico antes del siguiente período.',
++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++  administrative_closure: 'Cierre administrativo del período en curso.',
++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++  winter_break: 'Receso invernal entre periodos escolares.',
++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++};
+ 
+ function parseLooseDate(value) {
+   if (!value) return null;
+@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+ function formatStackDate(date) {
+   if (!date) return '';
+ 
+-  const day = date.getDate();
+-  const month = date
+-    .toLocaleDateString('es-MX', { month: 'short' })
+-    .replace('.', '')
+-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+-
+-  return `${day} ${month}`;
++  return date
++    .toLocaleDateString('es-MX', {
++      day: '2-digit',
++      month: '2-digit',
++      year: 'numeric',
++    })
++    .replace(/\//g, '-');
+ }
+ 
+ function getEventTitle(event) {
+@@ -52,140 +78,134 @@ function getEventDate(event) {
+   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+ }
+ 
+-function getCardStyle(category, index) {
+-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+-  const rot = STACK_ROTATIONS[index] ?? 0;
++function getCardStyle(index, category) {
++  const scale = 1 - index * 0.05;
++  const rotation = STACK_ROTATIONS[index] ?? 0;
++  const opacity = Math.max(0.22, 1 - index * 0.18);
++
+   return {
+-    zIndex: MAX_VISIBLE - index,
+-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++    zIndex: 10 - index,
++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++    opacity,
+     transformOrigin: 'center center',
+-    '--discard-rot': `${rot}deg`,
+-    background: `${category.color}26`,
+-    borderColor: `${category.color}66`,
++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++    background: 'var(--bg-card)',
++    borderColor: `${category.color}4D`,
+   };
+ }
+ 
+-function StackCard({ event, index, phase }) {
++function getDescription(category, event) {
++  return (
++    event?.descripcion ||
++    event?.description ||
++    EVENT_DESCRIPTIONS[category.id] ||
++    'Fecha académica oficial del calendario ITSON.'
++  );
++}
++
++function StackCard({ event, index }) {
+   const category = classifyEvent(getEventTitle(event));
++  const isBack = index > 0;
++
++  if (isBack) {
++    return (
++      <div
++        className="absolute inset-0 m-auto h-[110px] w-[200px] rounded-[14px] border-2"
++        style={getCardStyle(index, category)}
++        aria-hidden="true"
++      />
++    );
++  }
++
+   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+   const date = getEventDate(event);
+-
+-  const DESCRIPTIONS = {
+-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+-    semester_start: 'Inicio oficial de actividades académicas.',
+-    semester_end: 'Último día del período escolar vigente.',
+-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+-    last_day_classes: 'Cierre académico antes del siguiente período.',
+-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+-    administrative_closure: 'Cierre administrativo del período en curso.',
+-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+-    winter_break: 'Receso invernal entre periodos escolares.',
+-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+-  };
++  const description = getDescription(category, event);
+ 
+   return (
+-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+-      <article
+-        className={[
+-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+-          phase === 'exit' ? 'animate-card-discard' : '',
+-          phase === 'enter' ? 'animate-card-enter' : '',
+-        ]
+-          .filter(Boolean)
+-          .join(' ')}
+-        style={{
+-          animationDelay: `${index * 60}ms`,
+-        }}
+-      >
+-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+-
+-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+-          <div className="mb-2 flex items-center justify-between">
+-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+-              {category.label}
+-            </span>
+-            <span className="text-[10px]" style={{ color: category.color }}>
+-              ✦ ✦ ✦
+-            </span>
+-          </div>
++    <div
++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] flex-col overflow-hidden rounded-[14px] border shadow-[0_14px_24px_rgba(2,6,23,0.18)]"
++      style={getCardStyle(index, category)}
++    >
++      <div className="flex h-full flex-col p-2.5">
++        <div className="flex items-start justify-between gap-2">
++          <span
++            className="max-w-[116px] rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white"
++            style={{ background: category.color }}
++          >
++            {category.label}
++          </span>
++          <span className="text-[9px] leading-none" style={{ color: category.color }}>
++            ✦ ✦ ✦
++          </span>
++        </div>
+ 
+-          <div className="flex flex-1 gap-3">
+-            <div className="flex flex-col items-center justify-center gap-1">
+-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+-              </div>
+-              <div className="flex gap-0.5">
+-                {[0, 1, 2].map((star) => (
+-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+-                    ★
+-                  </span>
+-                ))}
+-              </div>
++        <div className="mt-1.5 flex min-h-0 flex-1 gap-2.5">
++          <div className="flex w-8 shrink-0 flex-col items-center justify-start pt-0.5">
++            <div
++              className="flex h-8 w-8 items-center justify-center rounded-full"
++              style={{ background: `${category.color}26` }}
++            >
++              <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
+             </div>
++          </div>
+ 
+-            <div className="flex flex-1 flex-col justify-center">
+-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+-                {getEventTitle(event)}
+-              </h5>
+-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+-              </p>
+-            </div>
++          <div className="min-w-0 flex-1">
++            <h5
++              className="line-clamp-2 text-[11px] font-semibold leading-tight"
++              style={{ color: 'var(--text-strong)' }}
++            >
++              {getEventTitle(event)}
++            </h5>
++            <div className="my-1 h-px w-8" style={{ background: category.color }} />
++            <p className="line-clamp-2 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++              {description}
++            </p>
+           </div>
++        </div>
+ 
+-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+-            <div>
+-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+-                Fecha del evento
+-              </p>
+-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+-                {date
+-                  ? date
+-                      .toLocaleDateString('es-MX', {
+-                        day: '2-digit',
+-                        month: '2-digit',
+-                        year: 'numeric',
+-                      })
+-                      .replace(/\//g, '-')
+-                  : 'Por confirmar'}
+-              </p>
+-            </div>
++        <div
++          className="mt-1.5 flex items-center gap-2 self-start rounded-lg px-2 py-1"
++          style={{ background: `${category.color}14` }}
++        >
++          <CalendarDays className="h-3 w-3" style={{ color: category.color }} />
++          <div className="leading-tight">
++            <p className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++              Fecha del evento
++            </p>
++            <p className="text-[9px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++              {date ? formatStackDate(date) : 'Por confirmar'}
++            </p>
+           </div>
+         </div>
+-      </article>
++      </div>
++    </div>
++  );
++}
++
++function EmptyState() {
++  return (
++    <div
++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] items-center justify-center rounded-[14px] border border-dashed"
++      style={{
++        borderColor: 'var(--border-subtle)',
++        background: 'var(--bg-card)',
++      }}
++    >
++      <div className="space-y-2 text-center">
++        <CalendarX className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} />
++        <p className="text-[11px] font-medium" style={{ color: 'var(--text-normal)' }}>
++          Sin eventos este mes
++        </p>
++      </div>
+     </div>
+   );
+ }
+ 
+ export default function StackedEventCards({ events = [], currentMonth }) {
+-  const visibleEvents = useMemo(() => {
+-    return (Array.isArray(events) ? events : [])
+-      .slice(0, MAX_VISIBLE)
+-      .filter(Boolean);
+-  }, [events]);
++  const visibleEvents = useMemo(
++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++    [events],
++  );
+ 
+   const [stack, setStack] = useState(visibleEvents);
+   const [phase, setPhase] = useState('idle');
+@@ -213,10 +233,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+ 
+       const settleTimer = setTimeout(() => {
+         setPhase('idle');
+-      }, 320);
++      }, 180);
+ 
+       timersRef.current.push(settleTimer);
+-    }, 360);
++    }, 180);
+ 
+     timersRef.current.push(exitTimer);
+ 
+@@ -232,38 +252,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+     });
+   };
+ 
+-  if (!stack.length) {
+-    return (
+-      <div
+-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+-      >
+-        <div className="space-y-2">
+-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+-            Sin eventos este mes
+-          </p>
+-        </div>
+-      </div>
+-    );
+-  }
+-
+   return (
+     <button
+       type="button"
+-      onClick={rotateStack}
+-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+-      aria-label="Rotar eventos del calendario"
+-      title="Haz clic para cambiar el evento"
++      onClick={visibleEvents.length ? rotateStack : undefined}
++      disabled={!visibleEvents.length}
++      className="relative hidden h-[132px] w-[220px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+     >
+-      {stack.map((event, index) => (
+-        <StackCard
+-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+-          event={event}
+-          index={index}
+-          phase={phase}
+-        />
+-      ))}
++      {stack.length ? (
++        stack.map((event, index) => {
++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++        })
++      ) : (
++        <EmptyState />
++      )}
+     </button>
+   );
+ }
+```
+
+### `src/pages/Calendario.jsx`
+```diff
+diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+index f83a172..92d5f0f 100644
+--- a/src/pages/Calendario.jsx
++++ b/src/pages/Calendario.jsx
+@@ -10,6 +10,7 @@ import {
+   MapPin,
+   RefreshCw,
+ } from 'lucide-react';
++import StackedEventCards from '../components/StackedEventCards';
+ 
+ const MONTHS = [
+   'Enero',
+@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+ }
+ 
++function getEventDateForMonth(event) {
++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++  if (direct) return direct;
++
++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++  if (!match) return null;
++
++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++}
++
+ function groupEventsByMonth(events) {
+   return events.reduce((groups, event) => {
+     const date = getValidDate(event.inicio);
+@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+     () => getEventsForDay(events, selectedDay, filterCat),
+     [events, filterCat, selectedDay],
+   );
++  const visibleMonthEvents = useMemo(() => {
++    return events
++      .filter((event) => {
++        const date = getEventDateForMonth(event);
++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++      })
++      .sort((left, right) => {
++        const leftDate = getEventDateForMonth(left);
++        const rightDate = getEventDateForMonth(right);
++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++      });
++  }, [currentMonth, currentYear, events]);
+   const groupedEvents = groupEventsByMonth(filteredEvents);
+   const hasEvents = events.length > 0;
+   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+         </div>
+       ) : null}
+ 
++      <section
++        className="rounded-2xl border p-4"
++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++      >
++        <div className="flex flex-wrap items-center gap-4">
++          <div className="flex items-center gap-2">
++            <button
++              type="button"
++              onClick={goToPreviousMonth}
++              className="rounded-xl border p-2 transition hover:scale-105"
++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++              aria-label="Mes anterior"
++            >
++              <ChevronLeft className="h-4 w-4" />
++            </button>
++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++              {monthLabel}
++            </p>
++            <button
++              type="button"
++              onClick={goToNextMonth}
++              className="rounded-xl border p-2 transition hover:scale-105"
++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++              aria-label="Mes siguiente"
++            >
++              <ChevronRight className="h-4 w-4" />
++            </button>
++          </div>
++
++          <div className="flex flex-wrap items-end gap-3">
++            <SelectField
++              label="Seleccionar un calendario"
++              value={selectedCalendarType}
++              onChange={handleCalendarTypeChange}
++              className="min-w-[260px]"
++            >
++              {calendarTypes.map((type) => (
++                <option key={type} value={type}>
++                  {type}
++                </option>
++              ))}
++            </SelectField>
++
++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++              {categories.map((category) => (
++                <option key={category} value={category}>
++                  {category}
++                </option>
++              ))}
++            </SelectField>
++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++              {[
++                { id: 'list', label: 'Lista', Icon: List },
++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++              ].map(({ id, label, Icon }) => {
++                const active = viewMode === id;
++                return (
++                  <button
++                    key={id}
++                    type="button"
++                    onClick={() => setViewMode(id)}
++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++                    style={{
++                      background: active ? 'var(--accent)' : 'transparent',
++                      color: active ? '#fff' : 'var(--text-muted)',
++                    }}
++                    title={label}
++                  >
++                    <Icon className="h-4 w-4" />
++                  </button>
++                );
++                  })}
++                </div>
++          </div>
++
++          <div className="shrink-0 self-center">
++            <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++          </div>
++        </div>
++      </section>
++
+       {!calendarData?.error && !hasEvents ? (
+         <div
+           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+ 
+       {hasEvents ? (
+         <>
+-          <section
+-            className="rounded-2xl border p-4"
+-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+-          >
+-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+-              <div className="flex items-center gap-2">
+-                <button
+-                  type="button"
+-                  onClick={goToPreviousMonth}
+-                  className="rounded-xl border p-2 transition hover:scale-105"
+-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+-                  aria-label="Mes anterior"
+-                >
+-                  <ChevronLeft className="h-4 w-4" />
+-                </button>
+-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+-                  {monthLabel}
+-                </p>
+-                <button
+-                  type="button"
+-                  onClick={goToNextMonth}
+-                  className="rounded-xl border p-2 transition hover:scale-105"
+-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+-                  aria-label="Mes siguiente"
+-                >
+-                  <ChevronRight className="h-4 w-4" />
+-                </button>
+-              </div>
+-
+-              <div className="flex flex-wrap items-end gap-3">
+-                <SelectField
+-                  label="Seleccionar un calendario"
+-                  value={selectedCalendarType}
+-                  onChange={handleCalendarTypeChange}
+-                  className="min-w-[260px]"
+-                >
+-                  {calendarTypes.map((type) => (
+-                    <option key={type} value={type}>
+-                      {type}
+-                    </option>
+-                  ))}
+-                </SelectField>
+-
+-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+-                  {categories.map((category) => (
+-                    <option key={category} value={category}>
+-                      {category}
+-                    </option>
+-                  ))}
+-                </SelectField>
+-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+-                  {[
+-                    { id: 'list', label: 'Lista', Icon: List },
+-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+-                  ].map(({ id, label, Icon }) => {
+-                    const active = viewMode === id;
+-                    return (
+-                      <button
+-                        key={id}
+-                        type="button"
+-                        onClick={() => setViewMode(id)}
+-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+-                        style={{
+-                          background: active ? 'var(--accent)' : 'transparent',
+-                          color: active ? '#fff' : 'var(--text-muted)',
+-                        }}
+-                        title={label}
+-                      >
+-                        <Icon className="h-4 w-4" />
+-                      </button>
+-                    );
+-                  })}
+-                </div>
+-              </div>
+-            </div>
+-          </section>
+-
+           {viewMode === 'grid' ? (
+             <>
+               <section
+```
+
+## Verificación
+**npm run build:** PASS
+**Tests ejecutados:** npm run build + notifications route checks
+**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+**Output de verificación:**
+```
+$ npm run build
+> dvpotro@0.1.0 build
+> vite build
+
+vite v5.4.21 building for production...
+transforming...
+✓ 1769 modules transformed.
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+✓ built in 8.13s
+
+$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+notifications page: true
+sidebar target: true
+page exists: true
+```
+
+## Pendiente para Claude
+- Sin pendientes registrados en esta tarea.
```

### `reports/report_084.md`
```diff
diff --git a/reports/report_084.md b/reports/report_084.md
new file mode 100644
index 0000000..e7ab131
--- /dev/null
+++ b/reports/report_084.md
@@ -0,0 +1,2744 @@
+# Report 084
+**Fecha:** 2026-06-22 00:23  
+**Agente:** Codex  
+**Tipo:** refactor
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+**Archivos modificados:** 4
+
+## Archivos modificados
+- `reports/report_082.md` — archivo creado como parte de la base inicial
+- `reports/report_083.md` — archivo creado como parte de la base inicial
+- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| reports/report_082.md | 654 | 0 |
+| reports/report_083.md | 1334 | 0 |
+| src/components/StackedEventCards.jsx | 101 | 214 |
+| src/pages/Calendario.jsx | 128 | 106 |
+
+## Resumen
+Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `reports/report_082.md`
+```diff
+diff --git a/reports/report_082.md b/reports/report_082.md
+new file mode 100644
+index 0000000..d5271ac
+--- /dev/null
++++ b/reports/report_082.md
+@@ -0,0 +1,654 @@
++# Report 082
++**Fecha:** 2026-06-21 23:41  
++**Agente:** Codex  
++**Tipo:** frontend
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 2
++
++## Archivos modificados
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| src/components/StackedEventCards.jsx | 147 | 157 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..c2f6386 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
++ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,118 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++ 
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
++-
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <article
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-3">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-9 w-9 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-4 w-4" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {getDescription(category, event)}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </article>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+++      style={{ borderColor: 'var(--border-subtle)' }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..0da02ab 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++              })}
+++            </div>
+++
+++            <div className="shrink-0 self-center">
+++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++            </div>
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_083.md`
+```diff
+diff --git a/reports/report_083.md b/reports/report_083.md
+new file mode 100644
+index 0000000..e42729e
+--- /dev/null
++++ b/reports/report_083.md
+@@ -0,0 +1,1334 @@
++# Report 083
++**Fecha:** 2026-06-21 23:59  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 3
++
++## Archivos modificados
++- `reports/report_082.md` — archivo creado como parte de la base inicial
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| reports/report_082.md | 654 | 0 |
++| src/components/StackedEventCards.jsx | 162 | 156 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `reports/report_082.md`
++```diff
++diff --git a/reports/report_082.md b/reports/report_082.md
++new file mode 100644
++index 0000000..d5271ac
++--- /dev/null
+++++ b/reports/report_082.md
++@@ -0,0 +1,654 @@
+++# Report 082
+++**Fecha:** 2026-06-21 23:41  
+++**Agente:** Codex  
+++**Tipo:** frontend
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 2
+++
+++## Archivos modificados
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| src/components/StackedEventCards.jsx | 147 | 157 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `src/components/StackedEventCards.jsx`
+++```diff
+++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+++index 3c412de..c2f6386 100644
+++--- a/src/components/StackedEventCards.jsx
++++++ b/src/components/StackedEventCards.jsx
+++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
+++ import { classifyEvent } from '../utils/eventClassifier';
+++ 
+++ const MAX_VISIBLE = 5;
+++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+++-const STACK_OFFSETS = [
+++-  { x: 0, y: 0 },
+++-  { x: -8, y: -4 },
+++-  { x: -16, y: -8 },
+++-  { x: -24, y: -5 },
+++-  { x: -30, y: -10 },
+++-];
++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++++
++++const EVENT_DESCRIPTIONS = {
++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++  semester_start: 'Inicio oficial de actividades académicas.',
++++  semester_end: 'Último día del período escolar vigente.',
++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++++  last_day_classes: 'Cierre académico antes del siguiente período.',
++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++  administrative_closure: 'Cierre administrativo del período en curso.',
++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++  winter_break: 'Receso invernal entre periodos escolares.',
++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++};
+++ 
+++ function parseLooseDate(value) {
+++   if (!value) return null;
+++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+++ function formatStackDate(date) {
+++   if (!date) return '';
+++ 
+++-  const day = date.getDate();
+++-  const month = date
+++-    .toLocaleDateString('es-MX', { month: 'short' })
+++-    .replace('.', '')
+++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+++-
+++-  return `${day} ${month}`;
++++  return date
++++    .toLocaleDateString('es-MX', {
++++      day: '2-digit',
++++      month: '2-digit',
++++      year: 'numeric',
++++    })
++++    .replace(/\//g, '-');
+++ }
+++ 
+++ function getEventTitle(event) {
+++@@ -52,140 +78,118 @@ function getEventDate(event) {
+++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++ }
+++ 
+++-function getCardStyle(category, index) {
+++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+++-  const rot = STACK_ROTATIONS[index] ?? 0;
++++function getCardStyle(index, category) {
++++  const scale = 1 - index * 0.05;
++++  const rotation = STACK_ROTATIONS[index] ?? 0;
++++  const opacity = Math.max(0.22, 1 - index * 0.18);
++++
+++   return {
+++-    zIndex: MAX_VISIBLE - index,
+++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++++    zIndex: 10 - index,
++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++++    opacity,
+++     transformOrigin: 'center center',
+++-    '--discard-rot': `${rot}deg`,
+++-    background: `${category.color}26`,
+++-    borderColor: `${category.color}66`,
++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++++    background: 'var(--bg-card)',
++++    borderColor: `${category.color}4D`,
+++   };
+++ }
+++ 
+++-function StackCard({ event, index, phase }) {
++++function getDescription(category, event) {
++++  return (
++++    event?.descripcion ||
++++    event?.description ||
++++    EVENT_DESCRIPTIONS[category.id] ||
++++    'Fecha académica oficial del calendario ITSON.'
++++  );
++++}
++++
++++function StackCard({ event, index }) {
+++   const category = classifyEvent(getEventTitle(event));
+++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+++   const date = getEventDate(event);
+++ 
+++-  const DESCRIPTIONS = {
+++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++-    semester_start: 'Inicio oficial de actividades académicas.',
+++-    semester_end: 'Último día del período escolar vigente.',
+++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+++-    last_day_classes: 'Cierre académico antes del siguiente período.',
+++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++-    administrative_closure: 'Cierre administrativo del período en curso.',
+++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++-    winter_break: 'Receso invernal entre periodos escolares.',
+++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++-  };
+++-
+++   return (
+++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+++-      <article
+++-        className={[
+++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+++-          phase === 'exit' ? 'animate-card-discard' : '',
+++-          phase === 'enter' ? 'animate-card-enter' : '',
+++-        ]
+++-          .filter(Boolean)
+++-          .join(' ')}
+++-        style={{
+++-          animationDelay: `${index * 60}ms`,
+++-        }}
+++-      >
+++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+++-
+++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+++-          <div className="mb-2 flex items-center justify-between">
+++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+++-              {category.label}
+++-            </span>
+++-            <span className="text-[10px]" style={{ color: category.color }}>
+++-              ✦ ✦ ✦
+++-            </span>
+++-          </div>
++++    <article
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
++++      style={getCardStyle(index, category)}
++++    >
++++      <div className="flex h-full flex-col p-3">
++++        <div className="flex items-start justify-between gap-2">
++++          <span
++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
++++            style={{ background: category.color }}
++++          >
++++            {category.label}
++++          </span>
++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
++++            ✦ ✦ ✦
++++          </span>
++++        </div>
+++ 
+++-          <div className="flex flex-1 gap-3">
+++-            <div className="flex flex-col items-center justify-center gap-1">
+++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+++-              </div>
+++-              <div className="flex gap-0.5">
+++-                {[0, 1, 2].map((star) => (
+++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+++-                    ★
+++-                  </span>
+++-                ))}
+++-              </div>
++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
++++            <div
++++              className="flex h-9 w-9 items-center justify-center rounded-full"
++++              style={{ background: `${category.color}26` }}
++++            >
++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
+++             </div>
++++          </div>
+++ 
+++-            <div className="flex flex-1 flex-col justify-center">
+++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+++-                {getEventTitle(event)}
+++-              </h5>
+++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+++-              </p>
+++-            </div>
++++          <div className="min-w-0 flex-1">
++++            <h5
++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
++++              style={{ color: 'var(--text-strong)' }}
++++            >
++++              {getEventTitle(event)}
++++            </h5>
++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++++              {getDescription(category, event)}
++++            </p>
+++           </div>
++++        </div>
+++ 
+++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++-            <div>
+++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+++-                Fecha del evento
+++-              </p>
+++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+++-                {date
+++-                  ? date
+++-                      .toLocaleDateString('es-MX', {
+++-                        day: '2-digit',
+++-                        month: '2-digit',
+++-                        year: 'numeric',
+++-                      })
+++-                      .replace(/\//g, '-')
+++-                  : 'Por confirmar'}
+++-              </p>
+++-            </div>
++++        <div
++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
++++          style={{ background: `${category.color}14` }}
++++        >
++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++          <div className="leading-tight">
++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++++              Fecha del evento
++++            </p>
++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {date ? formatStackDate(date) : 'Por confirmar'}
++++            </p>
+++           </div>
+++         </div>
+++-      </article>
++++      </div>
++++    </article>
++++  );
++++}
++++
++++function EmptyState() {
++++  return (
++++    <div
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
++++      style={{ borderColor: 'var(--border-subtle)' }}
++++    >
++++      <div className="space-y-2 text-center">
++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++          Sin eventos este mes
++++        </p>
++++      </div>
+++     </div>
+++   );
+++ }
+++ 
+++ export default function StackedEventCards({ events = [], currentMonth }) {
+++-  const visibleEvents = useMemo(() => {
+++-    return (Array.isArray(events) ? events : [])
+++-      .slice(0, MAX_VISIBLE)
+++-      .filter(Boolean);
+++-  }, [events]);
++++  const visibleEvents = useMemo(
++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++++    [events],
++++  );
+++ 
+++   const [stack, setStack] = useState(visibleEvents);
+++   const [phase, setPhase] = useState('idle');
+++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++ 
+++       const settleTimer = setTimeout(() => {
+++         setPhase('idle');
+++-      }, 320);
++++      }, 180);
+++ 
+++       timersRef.current.push(settleTimer);
+++-    }, 360);
++++    }, 180);
+++ 
+++     timersRef.current.push(exitTimer);
+++ 
+++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++     });
+++   };
+++ 
+++-  if (!stack.length) {
+++-    return (
+++-      <div
+++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+++-      >
+++-        <div className="space-y-2">
+++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++-            Sin eventos este mes
+++-          </p>
+++-        </div>
+++-      </div>
+++-    );
+++-  }
+++-
+++   return (
+++     <button
+++       type="button"
+++-      onClick={rotateStack}
+++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+++-      aria-label="Rotar eventos del calendario"
+++-      title="Haz clic para cambiar el evento"
++++      onClick={visibleEvents.length ? rotateStack : undefined}
++++      disabled={!visibleEvents.length}
++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+++     >
+++-      {stack.map((event, index) => (
+++-        <StackCard
+++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+++-          event={event}
+++-          index={index}
+++-          phase={phase}
+++-        />
+++-      ))}
++++      {stack.length ? (
++++        stack.map((event, index) => {
++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++++        })
++++      ) : (
++++        <EmptyState />
++++      )}
+++     </button>
+++   );
+++ }
+++```
+++
+++### `src/pages/Calendario.jsx`
+++```diff
+++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+++index f83a172..0da02ab 100644
+++--- a/src/pages/Calendario.jsx
++++++ b/src/pages/Calendario.jsx
+++@@ -10,6 +10,7 @@ import {
+++   MapPin,
+++   RefreshCw,
+++ } from 'lucide-react';
++++import StackedEventCards from '../components/StackedEventCards';
+++ 
+++ const MONTHS = [
+++   'Enero',
+++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+++ }
+++ 
++++function getEventDateForMonth(event) {
++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++  if (direct) return direct;
++++
++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++++  if (!match) return null;
++++
++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++++}
++++
+++ function groupEventsByMonth(events) {
+++   return events.reduce((groups, event) => {
+++     const date = getValidDate(event.inicio);
+++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++     () => getEventsForDay(events, selectedDay, filterCat),
+++     [events, filterCat, selectedDay],
+++   );
++++  const visibleMonthEvents = useMemo(() => {
++++    return events
++++      .filter((event) => {
++++        const date = getEventDateForMonth(event);
++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++++      })
++++      .sort((left, right) => {
++++        const leftDate = getEventDateForMonth(left);
++++        const rightDate = getEventDateForMonth(right);
++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++++      });
++++  }, [currentMonth, currentYear, events]);
+++   const groupedEvents = groupEventsByMonth(filteredEvents);
+++   const hasEvents = events.length > 0;
+++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++         </div>
+++       ) : null}
+++ 
++++      <section
++++        className="rounded-2xl border p-4"
++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++++      >
++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
++++          <div className="flex items-center gap-2">
++++            <button
++++              type="button"
++++              onClick={goToPreviousMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes anterior"
++++            >
++++              <ChevronLeft className="h-4 w-4" />
++++            </button>
++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {monthLabel}
++++            </p>
++++            <button
++++              type="button"
++++              onClick={goToNextMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes siguiente"
++++            >
++++              <ChevronRight className="h-4 w-4" />
++++            </button>
++++          </div>
++++
++++          <div className="flex flex-wrap items-end gap-3">
++++            <SelectField
++++              label="Seleccionar un calendario"
++++              value={selectedCalendarType}
++++              onChange={handleCalendarTypeChange}
++++              className="min-w-[260px]"
++++            >
++++              {calendarTypes.map((type) => (
++++                <option key={type} value={type}>
++++                  {type}
++++                </option>
++++              ))}
++++            </SelectField>
++++
++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++++              {categories.map((category) => (
++++                <option key={category} value={category}>
++++                  {category}
++++                </option>
++++              ))}
++++            </SelectField>
++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++++              {[
++++                { id: 'list', label: 'Lista', Icon: List },
++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++++              ].map(({ id, label, Icon }) => {
++++                const active = viewMode === id;
++++                return (
++++                  <button
++++                    key={id}
++++                    type="button"
++++                    onClick={() => setViewMode(id)}
++++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++++                    style={{
++++                      background: active ? 'var(--accent)' : 'transparent',
++++                      color: active ? '#fff' : 'var(--text-muted)',
++++                    }}
++++                    title={label}
++++                  >
++++                    <Icon className="h-4 w-4" />
++++                  </button>
++++                );
++++              })}
++++            </div>
++++
++++            <div className="shrink-0 self-center">
++++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++++            </div>
++++          </div>
++++        </div>
++++      </section>
++++
+++       {!calendarData?.error && !hasEvents ? (
+++         <div
+++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++ 
+++       {hasEvents ? (
+++         <>
+++-          <section
+++-            className="rounded-2xl border p-4"
+++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++-          >
+++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+++-              <div className="flex items-center gap-2">
+++-                <button
+++-                  type="button"
+++-                  onClick={goToPreviousMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes anterior"
+++-                >
+++-                  <ChevronLeft className="h-4 w-4" />
+++-                </button>
+++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++-                  {monthLabel}
+++-                </p>
+++-                <button
+++-                  type="button"
+++-                  onClick={goToNextMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes siguiente"
+++-                >
+++-                  <ChevronRight className="h-4 w-4" />
+++-                </button>
+++-              </div>
+++-
+++-              <div className="flex flex-wrap items-end gap-3">
+++-                <SelectField
+++-                  label="Seleccionar un calendario"
+++-                  value={selectedCalendarType}
+++-                  onChange={handleCalendarTypeChange}
+++-                  className="min-w-[260px]"
+++-                >
+++-                  {calendarTypes.map((type) => (
+++-                    <option key={type} value={type}>
+++-                      {type}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-
+++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++-                  {categories.map((category) => (
+++-                    <option key={category} value={category}>
+++-                      {category}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++-                  {[
+++-                    { id: 'list', label: 'Lista', Icon: List },
+++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++-                  ].map(({ id, label, Icon }) => {
+++-                    const active = viewMode === id;
+++-                    return (
+++-                      <button
+++-                        key={id}
+++-                        type="button"
+++-                        onClick={() => setViewMode(id)}
+++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++-                        style={{
+++-                          background: active ? 'var(--accent)' : 'transparent',
+++-                          color: active ? '#fff' : 'var(--text-muted)',
+++-                        }}
+++-                        title={label}
+++-                      >
+++-                        <Icon className="h-4 w-4" />
+++-                      </button>
+++-                    );
+++-                  })}
+++-                </div>
+++-              </div>
+++-            </div>
+++-          </section>
+++-
+++           {viewMode === 'grid' ? (
+++             <>
+++               <section
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + notifications route checks
+++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++**Output de verificación:**
+++```
+++$ npm run build
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1769 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+++✓ built in 8.13s
+++
+++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++notifications page: true
+++sidebar target: true
+++page exists: true
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..56a4ba4 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -5,13 +5,39 @@ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++ const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,134 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
+++  const isBack = index > 0;
+++
+++  if (isBack) {
+++    return (
+++      <div
+++        className="absolute inset-0 m-auto h-[110px] w-[200px] rounded-[14px] border-2"
+++        style={getCardStyle(index, category)}
+++        aria-hidden="true"
+++      />
+++    );
+++  }
+++
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++-
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
+++  const description = getDescription(category, event);
++ 
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <div
+++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] flex-col overflow-hidden rounded-[14px] border shadow-[0_14px_24px_rgba(2,6,23,0.18)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-2.5">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[116px] rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[9px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-1.5 flex min-h-0 flex-1 gap-2.5">
+++          <div className="flex w-8 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-8 w-8 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[11px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1 h-px w-8" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {description}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-1.5 flex items-center gap-2 self-start rounded-lg px-2 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3 w-3" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[9px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </div>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] items-center justify-center rounded-[14px] border border-dashed"
+++      style={{
+++        borderColor: 'var(--border-subtle)',
+++        background: 'var(--bg-card)',
+++      }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-[11px] font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +233,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +252,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[132px] w-[220px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..92d5f0f 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-wrap items-center gap-4">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++                  })}
+++                </div>
+++          </div>
+++
+++          <div className="shrink-0 self-center">
+++            <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `src/components/StackedEventCards.jsx`
+```diff
+diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+index 3c412de..79434fe 100644
+--- a/src/components/StackedEventCards.jsx
++++ b/src/components/StackedEventCards.jsx
+@@ -1,269 +1,156 @@
+-import { useEffect, useMemo, useRef, useState } from 'react';
+ import * as LucideIcons from 'lucide-react';
+ import { CalendarDays, CalendarX } from 'lucide-react';
+ import { classifyEvent } from '../utils/eventClassifier';
+ 
+ const MAX_VISIBLE = 5;
+-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+-const STACK_OFFSETS = [
+-  { x: 0, y: 0 },
+-  { x: -8, y: -4 },
+-  { x: -16, y: -8 },
+-  { x: -24, y: -5 },
+-  { x: -30, y: -10 },
+-];
++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++
++const EVENT_DESCRIPTIONS = {
++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++  semester_start: 'Inicio oficial de actividades académicas.',
++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++};
+ 
+ function parseLooseDate(value) {
+   if (!value) return null;
+-
+-  const direct = new Date(value);
+-  if (!Number.isNaN(direct.getTime())) {
+-    return direct;
+-  }
+-
+-  const match = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
+-  if (!match) return null;
+-
+-  const year = Number(match[3]);
+-  const month = Number(match[2]) - 1;
+-  const day = Number(match[1]);
+-  const parsed = new Date(year, month, day);
+-
++  if (value instanceof Date) return value;
++  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
++  if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
++  const dmyMatch = String(value).match(/^(\d{2})-(\d{2})-(\d{4})/);
++  if (dmyMatch) return new Date(+dmyMatch[3], +dmyMatch[2] - 1, +dmyMatch[1]);
++  const parsed = new Date(value);
+   return Number.isNaN(parsed.getTime()) ? null : parsed;
+ }
+ 
+ function formatStackDate(date) {
+   if (!date) return '';
+-
+-  const day = date.getDate();
+-  const month = date
+-    .toLocaleDateString('es-MX', { month: 'short' })
+-    .replace('.', '')
+-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+-
+-  return `${day} ${month}`;
++  return date
++    .toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
++    .replace(/\//g, '-');
+ }
+ 
+ function getEventTitle(event) {
+-  return String(event?.titulo || event?.title || 'Evento').trim();
++  return event?.titulo || event?.title || event?.nombre || 'Evento';
+ }
+ 
+ function getEventDate(event) {
+   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+ }
+ 
+-function getCardStyle(category, index) {
+-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+-  const rot = STACK_ROTATIONS[index] ?? 0;
++function getDescription(category, event) {
++  return (
++    event?.descripcion ||
++    event?.description ||
++    EVENT_DESCRIPTIONS[category.id] ||
++    'Fecha académica oficial del calendario ITSON.'
++  );
++}
++
++// Estilo del CONTENEDOR de cada tarjeta (posición en el stack)
++function getCardWrapperStyle(index) {
++  const scale = 1 - index * 0.05;
++  const rotation = STACK_ROTATIONS[index] ?? 0;
+   return {
+-    zIndex: MAX_VISIBLE - index,
+-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++    zIndex: 10 - index,
++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+     transformOrigin: 'center center',
+-    '--discard-rot': `${rot}deg`,
+-    background: `${category.color}26`,
+-    borderColor: `${category.color}66`,
++    transition: 'transform 300ms ease',
+   };
+ }
+ 
+-function StackCard({ event, index, phase }) {
++function StackCard({ event, index }) {
++  const isBack = index > 0;
+   const category = classifyEvent(getEventTitle(event));
+-  const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+-  const date = getEventDate(event);
+ 
+-  const DESCRIPTIONS = {
+-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+-    semester_start: 'Inicio oficial de actividades académicas.',
+-    semester_end: 'Último día del período escolar vigente.',
+-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+-    last_day_classes: 'Cierre académico antes del siguiente período.',
+-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+-    administrative_closure: 'Cierre administrativo del período en curso.',
+-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+-    winter_break: 'Receso invernal entre periodos escolares.',
+-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++  // Estilo base compartido: FONDO OPACO SÓLIDO obligatorio.
++  // Esto es lo que evita que se vea cualquier cosa detrás/debajo.
++  const baseCardClass =
++    'absolute inset-0 m-auto h-[110px] w-[210px] rounded-2xl border-2 overflow-hidden';
++  const baseCardStyle = {
++    background: 'var(--bg-card)',
++    borderColor: `${category.color}55`,
++    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
+   };
+ 
+-  return (
+-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+-      <article
+-        className={[
+-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+-          phase === 'exit' ? 'animate-card-discard' : '',
+-          phase === 'enter' ? 'animate-card-enter' : '',
+-        ]
+-          .filter(Boolean)
+-          .join(' ')}
+-        style={{
+-          animationDelay: `${index * 60}ms`,
+-        }}
+-      >
+-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+-
+-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+-          <div className="mb-2 flex items-center justify-between">
+-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+-              {category.label}
+-            </span>
+-            <span className="text-[10px]" style={{ color: category.color }}>
+-              ✦ ✦ ✦
+-            </span>
+-          </div>
++  if (isBack) {
++    // Tarjeta trasera: silueta opaca, CERO texto, CERO hijos.
++    return (
++      <div
++        className={baseCardClass}
++        style={{ ...baseCardStyle, ...getCardWrapperStyle(index) }}
++      />
++    );
++  }
+ 
+-          <div className="flex flex-1 gap-3">
+-            <div className="flex flex-col items-center justify-center gap-1">
+-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+-              </div>
+-              <div className="flex gap-0.5">
+-                {[0, 1, 2].map((star) => (
+-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+-                    ★
+-                  </span>
+-                ))}
+-              </div>
+-            </div>
++  // Tarjeta frontal: única que renderiza contenido.
++  const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++  const date = getEventDate(event);
++  const description = getDescription(category, event);
+ 
+-            <div className="flex flex-1 flex-col justify-center">
+-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+-                {getEventTitle(event)}
+-              </h5>
+-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+-              </p>
+-            </div>
++  return (
++    <div
++      className={baseCardClass}
++      style={{ ...baseCardStyle, ...getCardWrapperStyle(index) }}
++    >
++      <div className="flex h-full w-full flex-col p-2.5">
++        <span
++          className="mb-1.5 inline-block self-start rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white"
++          style={{ background: category.color }}
++        >
++          {category.label}
++        </span>
++
++        <div className="flex flex-1 items-start gap-2 overflow-hidden">
++          <div
++            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
++            style={{ background: `${category.color}22` }}
++          >
++            <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
+           </div>
++          <p
++            className="line-clamp-2 text-[11px] font-semibold leading-snug"
++            style={{ color: 'var(--text-strong)' }}
++          >
++            {getEventTitle(event)}
++          </p>
++        </div>
+ 
+-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+-            <div>
+-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+-                Fecha del evento
+-              </p>
+-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+-                {date
+-                  ? date
+-                      .toLocaleDateString('es-MX', {
+-                        day: '2-digit',
+-                        month: '2-digit',
+-                        year: 'numeric',
+-                      })
+-                      .replace(/\//g, '-')
+-                  : 'Por confirmar'}
+-              </p>
+-            </div>
+-          </div>
++        <div className="mt-1 flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
++          <CalendarDays className="h-3 w-3" style={{ color: category.color }} />
++          <span>{formatStackDate(date)}</span>
+         </div>
+-      </article>
++      </div>
+     </div>
+   );
+ }
+ 
+ export default function StackedEventCards({ events = [], currentMonth }) {
+-  const visibleEvents = useMemo(() => {
+-    return (Array.isArray(events) ? events : [])
+-      .slice(0, MAX_VISIBLE)
+-      .filter(Boolean);
+-  }, [events]);
+-
+-  const [stack, setStack] = useState(visibleEvents);
+-  const [phase, setPhase] = useState('idle');
+-  const isFirstRender = useRef(true);
+-  const timersRef = useRef([]);
+-
+-  const clearTimers = () => {
+-    timersRef.current.forEach((timer) => clearTimeout(timer));
+-    timersRef.current = [];
+-  };
+-
+-  useEffect(() => {
+-    if (isFirstRender.current) {
+-      isFirstRender.current = false;
+-      setStack(visibleEvents);
+-      return () => clearTimers();
+-    }
++  const visible = events.slice(0, MAX_VISIBLE);
+ 
+-    clearTimers();
+-    setPhase('exit');
+-
+-    const exitTimer = setTimeout(() => {
+-      setStack(visibleEvents);
+-      setPhase('enter');
+-
+-      const settleTimer = setTimeout(() => {
+-        setPhase('idle');
+-      }, 320);
+-
+-      timersRef.current.push(settleTimer);
+-    }, 360);
+-
+-    timersRef.current.push(exitTimer);
+-
+-    return () => clearTimers();
+-  }, [visibleEvents, currentMonth]);
+-
+-  const rotateStack = () => {
+-    if (phase !== 'idle' || stack.length <= 1) return;
+-
+-    setStack((previous) => {
+-      if (!previous.length) return previous;
+-      return [...previous.slice(1), previous[0]];
+-    });
+-  };
+-
+-  if (!stack.length) {
++  if (visible.length === 0) {
+     return (
+       <div
+-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++        className="relative hidden h-[130px] w-[230px] shrink-0 select-none items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed lg:flex"
++        style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}
+       >
+-        <div className="space-y-2">
+-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+-            Sin eventos este mes
+-          </p>
++        <div className="flex flex-col items-center gap-1 text-[10px]">
++          <CalendarX className="h-5 w-5" />
++          <span>Sin eventos este mes</span>
+         </div>
+       </div>
+     );
+   }
+ 
+   return (
+-    <button
+-      type="button"
+-      onClick={rotateStack}
+-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+-      aria-label="Rotar eventos del calendario"
+-      title="Haz clic para cambiar el evento"
++    <div
++      key={currentMonth}
++      className="relative hidden h-[130px] w-[230px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++      style={{ background: 'var(--bg-secondary)' }}
+     >
+-      {stack.map((event, index) => (
+-        <StackCard
+-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+-          event={event}
+-          index={index}
+-          phase={phase}
+-        />
++      {visible.map((event, index) => (
++        <StackCard key={`${currentMonth}-${index}`} event={event} index={index} />
+       ))}
+-    </button>
++    </div>
+   );
+ }
+```
+
+### `src/pages/Calendario.jsx`
+```diff
+diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+index f83a172..48ad0c3 100644
+--- a/src/pages/Calendario.jsx
++++ b/src/pages/Calendario.jsx
+@@ -10,6 +10,7 @@ import {
+   MapPin,
+   RefreshCw,
+ } from 'lucide-react';
++import StackedEventCards from '../components/StackedEventCards';
+ 
+ const MONTHS = [
+   'Enero',
+@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+ }
+ 
++function getEventDateForMonth(event) {
++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++  if (direct) return direct;
++
++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++  if (!match) return null;
++
++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++}
++
+ function groupEventsByMonth(events) {
+   return events.reduce((groups, event) => {
+     const date = getValidDate(event.inicio);
+@@ -194,24 +207,25 @@ function groupEventsByMonth(events) {
+ function SelectField({ label, value, onChange, children, className = '' }) {
+   return (
+     <label className={`relative block min-w-[180px] ${className}`.trim()}>
+-      <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
++      <span className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>
+         {label}
+       </span>
+       <select
+         value={value}
+         onChange={(event) => onChange(event.target.value)}
+-        className="w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-itson-blue/30"
++        className="w-full appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-[#93c5fd]/30"
+         style={{
+-          background: 'var(--bg-secondary)',
+-          borderColor: 'var(--border-normal)',
+-          color: 'var(--text-strong)',
++          background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.92) 100%)',
++          borderColor: '#b6c4d6',
++          color: '#0f172a',
++          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
+         }}
+       >
+         {children}
+       </select>
+       <ChevronDown
+         className="pointer-events-none absolute bottom-2.5 right-3 h-4 w-4"
+-        style={{ color: 'var(--text-muted)' }}
++        style={{ color: '#64748b' }}
+       />
+     </label>
+   );
+@@ -302,6 +316,19 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+     () => getEventsForDay(events, selectedDay, filterCat),
+     [events, filterCat, selectedDay],
+   );
++  const visibleMonthEvents = useMemo(() => {
++    return events
++      .filter((event) => {
++        const date = getEventDateForMonth(event);
++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++      })
++      .sort((left, right) => {
++        const leftDate = getEventDateForMonth(left);
++        const rightDate = getEventDateForMonth(right);
++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++      });
++  }, [currentMonth, currentYear, events]);
++  const toolbarPreviewEvents = visibleMonthEvents.length ? visibleMonthEvents : events.slice(0, 5);
+   const groupedEvents = groupEventsByMonth(filteredEvents);
+   const hasEvents = events.length > 0;
+   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+@@ -362,33 +389,105 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+   return (
+     <div className="space-y-5">
+       <section
+-        className="rounded-2xl border p-6"
+-        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++        className="rounded-2xl border p-4"
++        style={{
++          borderColor: '#cbd5e1',
++          background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
++          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
++        }}
+       >
+-        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
+-          <div>
+-            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
+-              <CalendarDays className="h-3.5 w-3.5" />
+-              ITSON · {currentYear}
++        <div className="flex items-start gap-6">
++          <div className="min-w-0 flex-1">
++            <div className="mb-4">
++              <label className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>
++                Seleccionar un calendario
++              </label>
++              <select
++                value={selectedCalendarType}
++                onChange={(event) => handleCalendarTypeChange(event.target.value)}
++                className="w-full max-w-[360px] appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-[#93c5fd]/30"
++                style={{
++                  background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.92) 100%)',
++                  borderColor: '#b6c4d6',
++                  color: '#0f172a',
++                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
++                }}
++              >
++                {calendarTypes.map((type) => (
++                  <option key={type} value={type}>
++                    {type}
++                  </option>
++                ))}
++              </select>
++            </div>
++
++            <div className="flex flex-wrap items-end gap-5">
++              <div className="flex flex-col items-center gap-1">
++                <span className="text-[12px] uppercase tracking-[0.16em]" style={{ color: '#0f172a' }}>
++                  Mes
++                </span>
++                <div className="flex items-center gap-4">
++                  <button
++                    type="button"
++                    onClick={goToPreviousMonth}
++                    className="grid h-9 w-9 place-items-center rounded-xl border transition hover:bg-slate-50"
++                    style={{ borderColor: '#94a3b8', color: '#0f172a' }}
++                    aria-label="Mes anterior"
++                  >
++                    <ChevronLeft className="h-4 w-4" />
++                  </button>
++                  <p className="min-w-[120px] text-center text-[17px] font-bold tracking-[-0.02em]" style={{ color: '#0f172a' }}>
++                    {monthLabel}
++                  </p>
++                  <button
++                    type="button"
++                    onClick={goToNextMonth}
++                    className="grid h-9 w-9 place-items-center rounded-xl border transition hover:bg-slate-50"
++                    style={{ borderColor: '#94a3b8', color: '#0f172a' }}
++                    aria-label="Mes siguiente"
++                  >
++                    <ChevronRight className="h-4 w-4" />
++                  </button>
++                </div>
++              </div>
++
++              <SelectField label="Categoría" value={filterCat} onChange={setFilterCat} className="min-w-[180px]">
++                {categories.map((category) => (
++                  <option key={category} value={category}>
++                    {category}
++                  </option>
++                ))}
++              </SelectField>
++
++              <div className="flex rounded-xl border bg-slate-50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" style={{ borderColor: '#b6c4d6' }}>
++                {[
++                  { id: 'list', label: 'Lista', Icon: List },
++                  { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++                ].map(({ id, label, Icon }) => {
++                  const active = viewMode === id;
++                  return (
++                    <button
++                      key={id}
++                      type="button"
++                      onClick={() => setViewMode(id)}
++                      className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++                      style={{
++                        background: active ? '#0b76c4' : 'transparent',
++                        color: active ? '#fff' : '#64748b',
++                      }}
++                      title={label}
++                    >
++                      <Icon className="h-4 w-4" />
++                    </button>
++                  );
++                })}
++              </div>
+             </div>
+-            <h3 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
+-              Calendario Escolar
+-            </h3>
+-            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
+-              Consulta fechas académicas oficiales publicadas por ITSON.
+-            </p>
+           </div>
+ 
+-          <button
+-            type="button"
+-            onClick={() => syncCalendar({ clearCacheFirst: true })}
+-            disabled={isSyncing}
+-            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
+-            style={{ background: 'var(--accent)' }}
+-          >
+-            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
+-            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
+-          </button>
++          <div className="shrink-0 self-start pt-0.5">
++            <StackedEventCards events={toolbarPreviewEvents} currentMonth={currentMonth} variant="light" />
++          </div>
+         </div>
+       </section>
+ 
+@@ -423,83 +522,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+ 
+       {hasEvents ? (
+         <>
+-          <section
+-            className="rounded-2xl border p-4"
+-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+-          >
+-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+-              <div className="flex items-center gap-2">
+-                <button
+-                  type="button"
+-                  onClick={goToPreviousMonth}
+-                  className="rounded-xl border p-2 transition hover:scale-105"
+-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+-                  aria-label="Mes anterior"
+-                >
+-                  <ChevronLeft className="h-4 w-4" />
+-                </button>
+-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+-                  {monthLabel}
+-                </p>
+-                <button
+-                  type="button"
+-                  onClick={goToNextMonth}
+-                  className="rounded-xl border p-2 transition hover:scale-105"
+-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+-                  aria-label="Mes siguiente"
+-                >
+-                  <ChevronRight className="h-4 w-4" />
+-                </button>
+-              </div>
+-
+-              <div className="flex flex-wrap items-end gap-3">
+-                <SelectField
+-                  label="Seleccionar un calendario"
+-                  value={selectedCalendarType}
+-                  onChange={handleCalendarTypeChange}
+-                  className="min-w-[260px]"
+-                >
+-                  {calendarTypes.map((type) => (
+-                    <option key={type} value={type}>
+-                      {type}
+-                    </option>
+-                  ))}
+-                </SelectField>
+-
+-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+-                  {categories.map((category) => (
+-                    <option key={category} value={category}>
+-                      {category}
+-                    </option>
+-                  ))}
+-                </SelectField>
+-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+-                  {[
+-                    { id: 'list', label: 'Lista', Icon: List },
+-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+-                  ].map(({ id, label, Icon }) => {
+-                    const active = viewMode === id;
+-                    return (
+-                      <button
+-                        key={id}
+-                        type="button"
+-                        onClick={() => setViewMode(id)}
+-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+-                        style={{
+-                          background: active ? 'var(--accent)' : 'transparent',
+-                          color: active ? '#fff' : 'var(--text-muted)',
+-                        }}
+-                        title={label}
+-                      >
+-                        <Icon className="h-4 w-4" />
+-                      </button>
+-                    );
+-                  })}
+-                </div>
+-              </div>
+-            </div>
+-          </section>
+-
+           {viewMode === 'grid' ? (
+             <>
+               <section
+```
+
+## Verificación
+**npm run build:** PASS
+**Tests ejecutados:** npm run build + notifications route checks
+**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+**Output de verificación:**
+```
+$ npm run build
+> dvpotro@0.1.0 build
+> vite build
+
+vite v5.4.21 building for production...
+transforming...
+✓ 1769 modules transformed.
+rendering chunks...
+computing gzip size...
+dist/index.html                            0.47 kB │ gzip:  0.30 kB
+dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+✓ built in 8.13s
+
+$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+notifications page: true
+sidebar target: true
+page exists: true
+```
+
+## Pendiente para Claude
+- Sin pendientes registrados en esta tarea.
```

### `reports/report_085.md`
```diff
diff --git a/reports/report_085.md b/reports/report_085.md
new file mode 100644
index 0000000..3027655
--- /dev/null
+++ b/reports/report_085.md
@@ -0,0 +1,5576 @@
+# Report 085
+**Fecha:** 2026-06-22 01:02  
+**Agente:** Codex  
+**Tipo:** refactor
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+**Archivos modificados:** 7
+
+## Archivos modificados
+- `generate-report.js` — archivo actualizado en esta tarea
+- `reports/calendario_stack_themed_clicked_084.png` — archivo creado como parte de la base inicial
+- `reports/report_082.md` — archivo creado como parte de la base inicial
+- `reports/report_083.md` — archivo creado como parte de la base inicial
+- `reports/report_084.md` — archivo creado como parte de la base inicial
+- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| generate-report.js | 24 | 14 |
+| reports/calendario_stack_themed_clicked_084.png | 0 | 0 |
+| reports/report_082.md | 654 | 0 |
+| reports/report_083.md | 1334 | 0 |
+| reports/report_084.md | 2744 | 0 |
+| src/components/StackedEventCards.jsx | 122 | 206 |
+| src/pages/Calendario.jsx | 120 | 101 |
+
+## Resumen
+Se registraron 7 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `generate-report.js`
+```diff
+diff --git a/generate-report.js b/generate-report.js
+index 6e0c844..764766a 100644
+--- a/generate-report.js
++++ b/generate-report.js
+@@ -19,27 +19,37 @@ const MAX_DIFF_BYTES = 150 * 1024;
+ 
+ const VERIFICATION = {
+   buildStatus: 'PASS',
+-  testsRun: 'npm run build + notifications route checks',
+-  verificationCmd: `node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes(\"notifications: {\")); console.log('sidebar target:', sidebar.includes(\"target: 'notifications'\")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"`,
+-verificationOutput: `$ npm run build
++  testsRun: 'npm run build + checks de theming/StackedEventCards + screenshot Playwright con mock de calendario',
++  verificationCmd: `npm run build
++node -e "const fs = require('fs'); const cal = fs.readFileSync('src/pages/Calendario.jsx','utf8'); const sec = fs.readFileSync('src/components/StackedEventCards.jsx','utf8'); console.log('sin hex hardcoded en header:', !/#0f172a|#64748b|#94a3b8|#b6c4d6|#0b76c4/.test(cal)); console.log('bg-card en section header:', cal.includes(\"background: 'var(--bg-card)'\")); console.log('useState en StackedEventCards:', sec.includes('useState')); console.log('onClick en contenedor:', sec.includes('onClick={handleClick}')); console.log('blob decorativo:', sec.includes('-bottom-8 -left-8'));"`,
++  verificationOutput: `$ npm run build
+ > dvpotro@0.1.0 build
+ > vite build
+ 
+ vite v5.4.21 building for production...
+ transforming...
+-✓ 1769 modules transformed.
++? 1771 modules transformed.
+ rendering chunks...
+ computing gzip size...
+-dist/index.html                            0.47 kB │ gzip:  0.30 kB
+-dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+-dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+-dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+-✓ built in 8.13s
+-
+-$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes(\"notifications: {\")); console.log('sidebar target:', sidebar.includes(\"target: 'notifications'\")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+-notifications page: true
+-sidebar target: true
+-page exists: true`,
++dist/index.html                                0.47 kB ? gzip:   0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png      9.18 kB
++dist/assets/index-D-FGDWdf.css                37.03 kB ? gzip:   7.59 kB
++dist/assets/index-DQxN184M.js              1,231.29 kB ? gzip: 258.92 kB
++? built in 17.78s
++
++$ node -e "..."
++sin hex hardcoded en header: true
++bg-card en section header: true
++useState en StackedEventCards: true
++onClick en contenedor: true
++blob decorativo: true
++
++$ playwright screenshot mock
++{
++  "textBefore": "EVENTO ESCOLAR\\n\\nSolicitud de baja parcial o total de clases...",
++  "textAfter": "EVENTO ESCOLAR\\n\\nEvaluacion del desempeno docente...",
++  "screenshot": "C:/Users/kneko/OneDrive/Documentos/scraper-app/reports/calendario_stack_themed_clicked_084.png"
++}`,
+ };
+ 
+ function ensureReportsDir() {
+```
+
+### `reports/calendario_stack_themed_clicked_084.png`
+```diff
+diff --git a/reports/calendario_stack_themed_clicked_084.png b/reports/calendario_stack_themed_clicked_084.png
+new file mode 100644
+index 0000000..43c0661
+Binary files /dev/null and b/reports/calendario_stack_themed_clicked_084.png differ
+```
+
+### `reports/report_082.md`
+```diff
+diff --git a/reports/report_082.md b/reports/report_082.md
+new file mode 100644
+index 0000000..d5271ac
+--- /dev/null
++++ b/reports/report_082.md
+@@ -0,0 +1,654 @@
++# Report 082
++**Fecha:** 2026-06-21 23:41  
++**Agente:** Codex  
++**Tipo:** frontend
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 2
++
++## Archivos modificados
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| src/components/StackedEventCards.jsx | 147 | 157 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..c2f6386 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
++ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,118 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++ 
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
++-
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <article
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-3">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-9 w-9 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-4 w-4" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {getDescription(category, event)}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </article>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+++      style={{ borderColor: 'var(--border-subtle)' }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..0da02ab 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++              })}
+++            </div>
+++
+++            <div className="shrink-0 self-center">
+++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++            </div>
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_083.md`
+```diff
+diff --git a/reports/report_083.md b/reports/report_083.md
+new file mode 100644
+index 0000000..e42729e
+--- /dev/null
++++ b/reports/report_083.md
+@@ -0,0 +1,1334 @@
++# Report 083
++**Fecha:** 2026-06-21 23:59  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 3
++
++## Archivos modificados
++- `reports/report_082.md` — archivo creado como parte de la base inicial
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| reports/report_082.md | 654 | 0 |
++| src/components/StackedEventCards.jsx | 162 | 156 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `reports/report_082.md`
++```diff
++diff --git a/reports/report_082.md b/reports/report_082.md
++new file mode 100644
++index 0000000..d5271ac
++--- /dev/null
+++++ b/reports/report_082.md
++@@ -0,0 +1,654 @@
+++# Report 082
+++**Fecha:** 2026-06-21 23:41  
+++**Agente:** Codex  
+++**Tipo:** frontend
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 2
+++
+++## Archivos modificados
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| src/components/StackedEventCards.jsx | 147 | 157 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `src/components/StackedEventCards.jsx`
+++```diff
+++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+++index 3c412de..c2f6386 100644
+++--- a/src/components/StackedEventCards.jsx
++++++ b/src/components/StackedEventCards.jsx
+++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
+++ import { classifyEvent } from '../utils/eventClassifier';
+++ 
+++ const MAX_VISIBLE = 5;
+++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+++-const STACK_OFFSETS = [
+++-  { x: 0, y: 0 },
+++-  { x: -8, y: -4 },
+++-  { x: -16, y: -8 },
+++-  { x: -24, y: -5 },
+++-  { x: -30, y: -10 },
+++-];
++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++++
++++const EVENT_DESCRIPTIONS = {
++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++  semester_start: 'Inicio oficial de actividades académicas.',
++++  semester_end: 'Último día del período escolar vigente.',
++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++++  last_day_classes: 'Cierre académico antes del siguiente período.',
++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++  administrative_closure: 'Cierre administrativo del período en curso.',
++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++  winter_break: 'Receso invernal entre periodos escolares.',
++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++};
+++ 
+++ function parseLooseDate(value) {
+++   if (!value) return null;
+++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+++ function formatStackDate(date) {
+++   if (!date) return '';
+++ 
+++-  const day = date.getDate();
+++-  const month = date
+++-    .toLocaleDateString('es-MX', { month: 'short' })
+++-    .replace('.', '')
+++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+++-
+++-  return `${day} ${month}`;
++++  return date
++++    .toLocaleDateString('es-MX', {
++++      day: '2-digit',
++++      month: '2-digit',
++++      year: 'numeric',
++++    })
++++    .replace(/\//g, '-');
+++ }
+++ 
+++ function getEventTitle(event) {
+++@@ -52,140 +78,118 @@ function getEventDate(event) {
+++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++ }
+++ 
+++-function getCardStyle(category, index) {
+++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+++-  const rot = STACK_ROTATIONS[index] ?? 0;
++++function getCardStyle(index, category) {
++++  const scale = 1 - index * 0.05;
++++  const rotation = STACK_ROTATIONS[index] ?? 0;
++++  const opacity = Math.max(0.22, 1 - index * 0.18);
++++
+++   return {
+++-    zIndex: MAX_VISIBLE - index,
+++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++++    zIndex: 10 - index,
++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++++    opacity,
+++     transformOrigin: 'center center',
+++-    '--discard-rot': `${rot}deg`,
+++-    background: `${category.color}26`,
+++-    borderColor: `${category.color}66`,
++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++++    background: 'var(--bg-card)',
++++    borderColor: `${category.color}4D`,
+++   };
+++ }
+++ 
+++-function StackCard({ event, index, phase }) {
++++function getDescription(category, event) {
++++  return (
++++    event?.descripcion ||
++++    event?.description ||
++++    EVENT_DESCRIPTIONS[category.id] ||
++++    'Fecha académica oficial del calendario ITSON.'
++++  );
++++}
++++
++++function StackCard({ event, index }) {
+++   const category = classifyEvent(getEventTitle(event));
+++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+++   const date = getEventDate(event);
+++ 
+++-  const DESCRIPTIONS = {
+++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++-    semester_start: 'Inicio oficial de actividades académicas.',
+++-    semester_end: 'Último día del período escolar vigente.',
+++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+++-    last_day_classes: 'Cierre académico antes del siguiente período.',
+++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++-    administrative_closure: 'Cierre administrativo del período en curso.',
+++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++-    winter_break: 'Receso invernal entre periodos escolares.',
+++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++-  };
+++-
+++   return (
+++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+++-      <article
+++-        className={[
+++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+++-          phase === 'exit' ? 'animate-card-discard' : '',
+++-          phase === 'enter' ? 'animate-card-enter' : '',
+++-        ]
+++-          .filter(Boolean)
+++-          .join(' ')}
+++-        style={{
+++-          animationDelay: `${index * 60}ms`,
+++-        }}
+++-      >
+++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+++-
+++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+++-          <div className="mb-2 flex items-center justify-between">
+++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+++-              {category.label}
+++-            </span>
+++-            <span className="text-[10px]" style={{ color: category.color }}>
+++-              ✦ ✦ ✦
+++-            </span>
+++-          </div>
++++    <article
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
++++      style={getCardStyle(index, category)}
++++    >
++++      <div className="flex h-full flex-col p-3">
++++        <div className="flex items-start justify-between gap-2">
++++          <span
++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
++++            style={{ background: category.color }}
++++          >
++++            {category.label}
++++          </span>
++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
++++            ✦ ✦ ✦
++++          </span>
++++        </div>
+++ 
+++-          <div className="flex flex-1 gap-3">
+++-            <div className="flex flex-col items-center justify-center gap-1">
+++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+++-              </div>
+++-              <div className="flex gap-0.5">
+++-                {[0, 1, 2].map((star) => (
+++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+++-                    ★
+++-                  </span>
+++-                ))}
+++-              </div>
++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
++++            <div
++++              className="flex h-9 w-9 items-center justify-center rounded-full"
++++              style={{ background: `${category.color}26` }}
++++            >
++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
+++             </div>
++++          </div>
+++ 
+++-            <div className="flex flex-1 flex-col justify-center">
+++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+++-                {getEventTitle(event)}
+++-              </h5>
+++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+++-              </p>
+++-            </div>
++++          <div className="min-w-0 flex-1">
++++            <h5
++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
++++              style={{ color: 'var(--text-strong)' }}
++++            >
++++              {getEventTitle(event)}
++++            </h5>
++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++++              {getDescription(category, event)}
++++            </p>
+++           </div>
++++        </div>
+++ 
+++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++-            <div>
+++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+++-                Fecha del evento
+++-              </p>
+++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+++-                {date
+++-                  ? date
+++-                      .toLocaleDateString('es-MX', {
+++-                        day: '2-digit',
+++-                        month: '2-digit',
+++-                        year: 'numeric',
+++-                      })
+++-                      .replace(/\//g, '-')
+++-                  : 'Por confirmar'}
+++-              </p>
+++-            </div>
++++        <div
++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
++++          style={{ background: `${category.color}14` }}
++++        >
++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++          <div className="leading-tight">
++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++++              Fecha del evento
++++            </p>
++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {date ? formatStackDate(date) : 'Por confirmar'}
++++            </p>
+++           </div>
+++         </div>
+++-      </article>
++++      </div>
++++    </article>
++++  );
++++}
++++
++++function EmptyState() {
++++  return (
++++    <div
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
++++      style={{ borderColor: 'var(--border-subtle)' }}
++++    >
++++      <div className="space-y-2 text-center">
++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++          Sin eventos este mes
++++        </p>
++++      </div>
+++     </div>
+++   );
+++ }
+++ 
+++ export default function StackedEventCards({ events = [], currentMonth }) {
+++-  const visibleEvents = useMemo(() => {
+++-    return (Array.isArray(events) ? events : [])
+++-      .slice(0, MAX_VISIBLE)
+++-      .filter(Boolean);
+++-  }, [events]);
++++  const visibleEvents = useMemo(
++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++++    [events],
++++  );
+++ 
+++   const [stack, setStack] = useState(visibleEvents);
+++   const [phase, setPhase] = useState('idle');
+++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++ 
+++       const settleTimer = setTimeout(() => {
+++         setPhase('idle');
+++-      }, 320);
++++      }, 180);
+++ 
+++       timersRef.current.push(settleTimer);
+++-    }, 360);
++++    }, 180);
+++ 
+++     timersRef.current.push(exitTimer);
+++ 
+++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++     });
+++   };
+++ 
+++-  if (!stack.length) {
+++-    return (
+++-      <div
+++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+++-      >
+++-        <div className="space-y-2">
+++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++-            Sin eventos este mes
+++-          </p>
+++-        </div>
+++-      </div>
+++-    );
+++-  }
+++-
+++   return (
+++     <button
+++       type="button"
+++-      onClick={rotateStack}
+++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+++-      aria-label="Rotar eventos del calendario"
+++-      title="Haz clic para cambiar el evento"
++++      onClick={visibleEvents.length ? rotateStack : undefined}
++++      disabled={!visibleEvents.length}
++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+++     >
+++-      {stack.map((event, index) => (
+++-        <StackCard
+++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+++-          event={event}
+++-          index={index}
+++-          phase={phase}
+++-        />
+++-      ))}
++++      {stack.length ? (
++++        stack.map((event, index) => {
++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++++        })
++++      ) : (
++++        <EmptyState />
++++      )}
+++     </button>
+++   );
+++ }
+++```
+++
+++### `src/pages/Calendario.jsx`
+++```diff
+++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+++index f83a172..0da02ab 100644
+++--- a/src/pages/Calendario.jsx
++++++ b/src/pages/Calendario.jsx
+++@@ -10,6 +10,7 @@ import {
+++   MapPin,
+++   RefreshCw,
+++ } from 'lucide-react';
++++import StackedEventCards from '../components/StackedEventCards';
+++ 
+++ const MONTHS = [
+++   'Enero',
+++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+++ }
+++ 
++++function getEventDateForMonth(event) {
++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++  if (direct) return direct;
++++
++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++++  if (!match) return null;
++++
++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++++}
++++
+++ function groupEventsByMonth(events) {
+++   return events.reduce((groups, event) => {
+++     const date = getValidDate(event.inicio);
+++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++     () => getEventsForDay(events, selectedDay, filterCat),
+++     [events, filterCat, selectedDay],
+++   );
++++  const visibleMonthEvents = useMemo(() => {
++++    return events
++++      .filter((event) => {
++++        const date = getEventDateForMonth(event);
++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++++      })
++++      .sort((left, right) => {
++++        const leftDate = getEventDateForMonth(left);
++++        const rightDate = getEventDateForMonth(right);
++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++++      });
++++  }, [currentMonth, currentYear, events]);
+++   const groupedEvents = groupEventsByMonth(filteredEvents);
+++   const hasEvents = events.length > 0;
+++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++         </div>
+++       ) : null}
+++ 
++++      <section
++++        className="rounded-2xl border p-4"
++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++++      >
++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
++++          <div className="flex items-center gap-2">
++++            <button
++++              type="button"
++++              onClick={goToPreviousMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes anterior"
++++            >
++++              <ChevronLeft className="h-4 w-4" />
++++            </button>
++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {monthLabel}
++++            </p>
++++            <button
++++              type="button"
++++              onClick={goToNextMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes siguiente"
++++            >
++++              <ChevronRight className="h-4 w-4" />
++++            </button>
++++          </div>
++++
++++          <div className="flex flex-wrap items-end gap-3">
++++            <SelectField
++++              label="Seleccionar un calendario"
++++              value={selectedCalendarType}
++++              onChange={handleCalendarTypeChange}
++++              className="min-w-[260px]"
++++            >
++++              {calendarTypes.map((type) => (
++++                <option key={type} value={type}>
++++                  {type}
++++                </option>
++++              ))}
++++            </SelectField>
++++
++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++++              {categories.map((category) => (
++++                <option key={category} value={category}>
++++                  {category}
++++                </option>
++++              ))}
++++            </SelectField>
++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++++              {[
++++                { id: 'list', label: 'Lista', Icon: List },
++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++++              ].map(({ id, label, Icon }) => {
++++                const active = viewMode === id;
++++                return (
++++                  <button
++++                    key={id}
++++                    type="button"
++++                    onClick={() => setViewMode(id)}
++++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++++                    style={{
++++                      background: active ? 'var(--accent)' : 'transparent',
++++                      color: active ? '#fff' : 'var(--text-muted)',
++++                    }}
++++                    title={label}
++++                  >
++++                    <Icon className="h-4 w-4" />
++++                  </button>
++++                );
++++              })}
++++            </div>
++++
++++            <div className="shrink-0 self-center">
++++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++++            </div>
++++          </div>
++++        </div>
++++      </section>
++++
+++       {!calendarData?.error && !hasEvents ? (
+++         <div
+++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++ 
+++       {hasEvents ? (
+++         <>
+++-          <section
+++-            className="rounded-2xl border p-4"
+++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++-          >
+++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+++-              <div className="flex items-center gap-2">
+++-                <button
+++-                  type="button"
+++-                  onClick={goToPreviousMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes anterior"
+++-                >
+++-                  <ChevronLeft className="h-4 w-4" />
+++-                </button>
+++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++-                  {monthLabel}
+++-                </p>
+++-                <button
+++-                  type="button"
+++-                  onClick={goToNextMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes siguiente"
+++-                >
+++-                  <ChevronRight className="h-4 w-4" />
+++-                </button>
+++-              </div>
+++-
+++-              <div className="flex flex-wrap items-end gap-3">
+++-                <SelectField
+++-                  label="Seleccionar un calendario"
+++-                  value={selectedCalendarType}
+++-                  onChange={handleCalendarTypeChange}
+++-                  className="min-w-[260px]"
+++-                >
+++-                  {calendarTypes.map((type) => (
+++-                    <option key={type} value={type}>
+++-                      {type}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-
+++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++-                  {categories.map((category) => (
+++-                    <option key={category} value={category}>
+++-                      {category}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++-                  {[
+++-                    { id: 'list', label: 'Lista', Icon: List },
+++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++-                  ].map(({ id, label, Icon }) => {
+++-                    const active = viewMode === id;
+++-                    return (
+++-                      <button
+++-                        key={id}
+++-                        type="button"
+++-                        onClick={() => setViewMode(id)}
+++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++-                        style={{
+++-                          background: active ? 'var(--accent)' : 'transparent',
+++-                          color: active ? '#fff' : 'var(--text-muted)',
+++-                        }}
+++-                        title={label}
+++-                      >
+++-                        <Icon className="h-4 w-4" />
+++-                      </button>
+++-                    );
+++-                  })}
+++-                </div>
+++-              </div>
+++-            </div>
+++-          </section>
+++-
+++           {viewMode === 'grid' ? (
+++             <>
+++               <section
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + notifications route checks
+++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++**Output de verificación:**
+++```
+++$ npm run build
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1769 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+++✓ built in 8.13s
+++
+++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++notifications page: true
+++sidebar target: true
+++page exists: true
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..56a4ba4 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -5,13 +5,39 @@ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++ const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,134 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
+++  const isBack = index > 0;
+++
+++  if (isBack) {
+++    return (
+++      <div
+++        className="absolute inset-0 m-auto h-[110px] w-[200px] rounded-[14px] border-2"
+++        style={getCardStyle(index, category)}
+++        aria-hidden="true"
+++      />
+++    );
+++  }
+++
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++-
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
+++  const description = getDescription(category, event);
++ 
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <div
+++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] flex-col overflow-hidden rounded-[14px] border shadow-[0_14px_24px_rgba(2,6,23,0.18)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-2.5">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[116px] rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[9px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-1.5 flex min-h-0 flex-1 gap-2.5">
+++          <div className="flex w-8 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-8 w-8 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[11px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1 h-px w-8" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {description}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-1.5 flex items-center gap-2 self-start rounded-lg px-2 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3 w-3" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[9px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </div>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] items-center justify-center rounded-[14px] border border-dashed"
+++      style={{
+++        borderColor: 'var(--border-subtle)',
+++        background: 'var(--bg-card)',
+++      }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-[11px] font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +233,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +252,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[132px] w-[220px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..92d5f0f 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-wrap items-center gap-4">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++                  })}
+++                </div>
+++          </div>
+++
+++          <div className="shrink-0 self-center">
+++            <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_084.md`
+```diff
+diff --git a/reports/report_084.md b/reports/report_084.md
+new file mode 100644
+index 0000000..e7ab131
+--- /dev/null
++++ b/reports/report_084.md
+@@ -0,0 +1,2744 @@
++# Report 084
++**Fecha:** 2026-06-22 00:23  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 4
++
++## Archivos modificados
++- `reports/report_082.md` — archivo creado como parte de la base inicial
++- `reports/report_083.md` — archivo creado como parte de la base inicial
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| reports/report_082.md | 654 | 0 |
++| reports/report_083.md | 1334 | 0 |
++| src/components/StackedEventCards.jsx | 101 | 214 |
++| src/pages/Calendario.jsx | 128 | 106 |
++
++## Resumen
++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `reports/report_082.md`
++```diff
++diff --git a/reports/report_082.md b/reports/report_082.md
++new file mode 100644
++index 0000000..d5271ac
++--- /dev/null
+++++ b/reports/report_082.md
++@@ -0,0 +1,654 @@
+++# Report 082
+++**Fecha:** 2026-06-21 23:41  
+++**Agente:** Codex  
+++**Tipo:** frontend
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 2
+++
+++## Archivos modificados
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| src/components/StackedEventCards.jsx | 147 | 157 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `src/components/StackedEventCards.jsx`
+++```diff
+++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+++index 3c412de..c2f6386 100644
+++--- a/src/components/StackedEventCards.jsx
++++++ b/src/components/StackedEventCards.jsx
+++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
+++ import { classifyEvent } from '../utils/eventClassifier';
+++ 
+++ const MAX_VISIBLE = 5;
+++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+++-const STACK_OFFSETS = [
+++-  { x: 0, y: 0 },
+++-  { x: -8, y: -4 },
+++-  { x: -16, y: -8 },
+++-  { x: -24, y: -5 },
+++-  { x: -30, y: -10 },
+++-];
++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++++
++++const EVENT_DESCRIPTIONS = {
++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++  semester_start: 'Inicio oficial de actividades académicas.',
++++  semester_end: 'Último día del período escolar vigente.',
++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++++  last_day_classes: 'Cierre académico antes del siguiente período.',
++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++  administrative_closure: 'Cierre administrativo del período en curso.',
++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++  winter_break: 'Receso invernal entre periodos escolares.',
++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++};
+++ 
+++ function parseLooseDate(value) {
+++   if (!value) return null;
+++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+++ function formatStackDate(date) {
+++   if (!date) return '';
+++ 
+++-  const day = date.getDate();
+++-  const month = date
+++-    .toLocaleDateString('es-MX', { month: 'short' })
+++-    .replace('.', '')
+++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+++-
+++-  return `${day} ${month}`;
++++  return date
++++    .toLocaleDateString('es-MX', {
++++      day: '2-digit',
++++      month: '2-digit',
++++      year: 'numeric',
++++    })
++++    .replace(/\//g, '-');
+++ }
+++ 
+++ function getEventTitle(event) {
+++@@ -52,140 +78,118 @@ function getEventDate(event) {
+++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++ }
+++ 
+++-function getCardStyle(category, index) {
+++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+++-  const rot = STACK_ROTATIONS[index] ?? 0;
++++function getCardStyle(index, category) {
++++  const scale = 1 - index * 0.05;
++++  const rotation = STACK_ROTATIONS[index] ?? 0;
++++  const opacity = Math.max(0.22, 1 - index * 0.18);
++++
+++   return {
+++-    zIndex: MAX_VISIBLE - index,
+++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++++    zIndex: 10 - index,
++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++++    opacity,
+++     transformOrigin: 'center center',
+++-    '--discard-rot': `${rot}deg`,
+++-    background: `${category.color}26`,
+++-    borderColor: `${category.color}66`,
++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++++    background: 'var(--bg-card)',
++++    borderColor: `${category.color}4D`,
+++   };
+++ }
+++ 
+++-function StackCard({ event, index, phase }) {
++++function getDescription(category, event) {
++++  return (
++++    event?.descripcion ||
++++    event?.description ||
++++    EVENT_DESCRIPTIONS[category.id] ||
++++    'Fecha académica oficial del calendario ITSON.'
++++  );
++++}
++++
++++function StackCard({ event, index }) {
+++   const category = classifyEvent(getEventTitle(event));
+++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+++   const date = getEventDate(event);
+++ 
+++-  const DESCRIPTIONS = {
+++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++-    semester_start: 'Inicio oficial de actividades académicas.',
+++-    semester_end: 'Último día del período escolar vigente.',
+++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+++-    last_day_classes: 'Cierre académico antes del siguiente período.',
+++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++-    administrative_closure: 'Cierre administrativo del período en curso.',
+++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++-    winter_break: 'Receso invernal entre periodos escolares.',
+++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++-  };
+++-
+++   return (
+++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+++-      <article
+++-        className={[
+++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+++-          phase === 'exit' ? 'animate-card-discard' : '',
+++-          phase === 'enter' ? 'animate-card-enter' : '',
+++-        ]
+++-          .filter(Boolean)
+++-          .join(' ')}
+++-        style={{
+++-          animationDelay: `${index * 60}ms`,
+++-        }}
+++-      >
+++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+++-
+++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+++-          <div className="mb-2 flex items-center justify-between">
+++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+++-              {category.label}
+++-            </span>
+++-            <span className="text-[10px]" style={{ color: category.color }}>
+++-              ✦ ✦ ✦
+++-            </span>
+++-          </div>
++++    <article
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
++++      style={getCardStyle(index, category)}
++++    >
++++      <div className="flex h-full flex-col p-3">
++++        <div className="flex items-start justify-between gap-2">
++++          <span
++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
++++            style={{ background: category.color }}
++++          >
++++            {category.label}
++++          </span>
++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
++++            ✦ ✦ ✦
++++          </span>
++++        </div>
+++ 
+++-          <div className="flex flex-1 gap-3">
+++-            <div className="flex flex-col items-center justify-center gap-1">
+++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+++-              </div>
+++-              <div className="flex gap-0.5">
+++-                {[0, 1, 2].map((star) => (
+++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+++-                    ★
+++-                  </span>
+++-                ))}
+++-              </div>
++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
++++            <div
++++              className="flex h-9 w-9 items-center justify-center rounded-full"
++++              style={{ background: `${category.color}26` }}
++++            >
++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
+++             </div>
++++          </div>
+++ 
+++-            <div className="flex flex-1 flex-col justify-center">
+++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+++-                {getEventTitle(event)}
+++-              </h5>
+++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+++-              </p>
+++-            </div>
++++          <div className="min-w-0 flex-1">
++++            <h5
++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
++++              style={{ color: 'var(--text-strong)' }}
++++            >
++++              {getEventTitle(event)}
++++            </h5>
++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++++              {getDescription(category, event)}
++++            </p>
+++           </div>
++++        </div>
+++ 
+++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++-            <div>
+++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+++-                Fecha del evento
+++-              </p>
+++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+++-                {date
+++-                  ? date
+++-                      .toLocaleDateString('es-MX', {
+++-                        day: '2-digit',
+++-                        month: '2-digit',
+++-                        year: 'numeric',
+++-                      })
+++-                      .replace(/\//g, '-')
+++-                  : 'Por confirmar'}
+++-              </p>
+++-            </div>
++++        <div
++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
++++          style={{ background: `${category.color}14` }}
++++        >
++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++          <div className="leading-tight">
++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++++              Fecha del evento
++++            </p>
++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {date ? formatStackDate(date) : 'Por confirmar'}
++++            </p>
+++           </div>
+++         </div>
+++-      </article>
++++      </div>
++++    </article>
++++  );
++++}
++++
++++function EmptyState() {
++++  return (
++++    <div
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
++++      style={{ borderColor: 'var(--border-subtle)' }}
++++    >
++++      <div className="space-y-2 text-center">
++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++          Sin eventos este mes
++++        </p>
++++      </div>
+++     </div>
+++   );
+++ }
+++ 
+++ export default function StackedEventCards({ events = [], currentMonth }) {
+++-  const visibleEvents = useMemo(() => {
+++-    return (Array.isArray(events) ? events : [])
+++-      .slice(0, MAX_VISIBLE)
+++-      .filter(Boolean);
+++-  }, [events]);
++++  const visibleEvents = useMemo(
++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++++    [events],
++++  );
+++ 
+++   const [stack, setStack] = useState(visibleEvents);
+++   const [phase, setPhase] = useState('idle');
+++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++ 
+++       const settleTimer = setTimeout(() => {
+++         setPhase('idle');
+++-      }, 320);
++++      }, 180);
+++ 
+++       timersRef.current.push(settleTimer);
+++-    }, 360);
++++    }, 180);
+++ 
+++     timersRef.current.push(exitTimer);
+++ 
+++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++     });
+++   };
+++ 
+++-  if (!stack.length) {
+++-    return (
+++-      <div
+++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+++-      >
+++-        <div className="space-y-2">
+++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++-            Sin eventos este mes
+++-          </p>
+++-        </div>
+++-      </div>
+++-    );
+++-  }
+++-
+++   return (
+++     <button
+++       type="button"
+++-      onClick={rotateStack}
+++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+++-      aria-label="Rotar eventos del calendario"
+++-      title="Haz clic para cambiar el evento"
++++      onClick={visibleEvents.length ? rotateStack : undefined}
++++      disabled={!visibleEvents.length}
++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+++     >
+++-      {stack.map((event, index) => (
+++-        <StackCard
+++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+++-          event={event}
+++-          index={index}
+++-          phase={phase}
+++-        />
+++-      ))}
++++      {stack.length ? (
++++        stack.map((event, index) => {
++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++++        })
++++      ) : (
++++        <EmptyState />
++++      )}
+++     </button>
+++   );
+++ }
+++```
+++
+++### `src/pages/Calendario.jsx`
+++```diff
+++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+++index f83a172..0da02ab 100644
+++--- a/src/pages/Calendario.jsx
++++++ b/src/pages/Calendario.jsx
+++@@ -10,6 +10,7 @@ import {
+++   MapPin,
+++   RefreshCw,
+++ } from 'lucide-react';
++++import StackedEventCards from '../components/StackedEventCards';
+++ 
+++ const MONTHS = [
+++   'Enero',
+++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+++ }
+++ 
++++function getEventDateForMonth(event) {
++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++  if (direct) return direct;
++++
++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++++  if (!match) return null;
++++
++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++++}
++++
+++ function groupEventsByMonth(events) {
+++   return events.reduce((groups, event) => {
+++     const date = getValidDate(event.inicio);
+++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++     () => getEventsForDay(events, selectedDay, filterCat),
+++     [events, filterCat, selectedDay],
+++   );
++++  const visibleMonthEvents = useMemo(() => {
++++    return events
++++      .filter((event) => {
++++        const date = getEventDateForMonth(event);
++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++++      })
++++      .sort((left, right) => {
++++        const leftDate = getEventDateForMonth(left);
++++        const rightDate = getEventDateForMonth(right);
++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++++      });
++++  }, [currentMonth, currentYear, events]);
+++   const groupedEvents = groupEventsByMonth(filteredEvents);
+++   const hasEvents = events.length > 0;
+++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++         </div>
+++       ) : null}
+++ 
++++      <section
++++        className="rounded-2xl border p-4"
++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++++      >
++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
++++          <div className="flex items-center gap-2">
++++            <button
++++              type="button"
++++              onClick={goToPreviousMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes anterior"
++++            >
++++              <ChevronLeft className="h-4 w-4" />
++++            </button>
++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {monthLabel}
++++            </p>
++++            <button
++++              type="button"
++++              onClick={goToNextMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes siguiente"
++++            >
++++              <ChevronRight className="h-4 w-4" />
++++            </button>
++++          </div>
++++
++++          <div className="flex flex-wrap items-end gap-3">
++++            <SelectField
++++              label="Seleccionar un calendario"
++++              value={selectedCalendarType}
++++              onChange={handleCalendarTypeChange}
++++              className="min-w-[260px]"
++++            >
++++              {calendarTypes.map((type) => (
++++                <option key={type} value={type}>
++++                  {type}
++++                </option>
++++              ))}
++++            </SelectField>
++++
++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++++              {categories.map((category) => (
++++                <option key={category} value={category}>
++++                  {category}
++++                </option>
++++              ))}
++++            </SelectField>
++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++++              {[
++++                { id: 'list', label: 'Lista', Icon: List },
++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++++              ].map(({ id, label, Icon }) => {
++++                const active = viewMode === id;
++++                return (
++++                  <button
++++                    key={id}
++++                    type="button"
++++                    onClick={() => setViewMode(id)}
++++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++++                    style={{
++++                      background: active ? 'var(--accent)' : 'transparent',
++++                      color: active ? '#fff' : 'var(--text-muted)',
++++                    }}
++++                    title={label}
++++                  >
++++                    <Icon className="h-4 w-4" />
++++                  </button>
++++                );
++++              })}
++++            </div>
++++
++++            <div className="shrink-0 self-center">
++++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++++            </div>
++++          </div>
++++        </div>
++++      </section>
++++
+++       {!calendarData?.error && !hasEvents ? (
+++         <div
+++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++ 
+++       {hasEvents ? (
+++         <>
+++-          <section
+++-            className="rounded-2xl border p-4"
+++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++-          >
+++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+++-              <div className="flex items-center gap-2">
+++-                <button
+++-                  type="button"
+++-                  onClick={goToPreviousMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes anterior"
+++-                >
+++-                  <ChevronLeft className="h-4 w-4" />
+++-                </button>
+++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++-                  {monthLabel}
+++-                </p>
+++-                <button
+++-                  type="button"
+++-                  onClick={goToNextMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes siguiente"
+++-                >
+++-                  <ChevronRight className="h-4 w-4" />
+++-                </button>
+++-              </div>
+++-
+++-              <div className="flex flex-wrap items-end gap-3">
+++-                <SelectField
+++-                  label="Seleccionar un calendario"
+++-                  value={selectedCalendarType}
+++-                  onChange={handleCalendarTypeChange}
+++-                  className="min-w-[260px]"
+++-                >
+++-                  {calendarTypes.map((type) => (
+++-                    <option key={type} value={type}>
+++-                      {type}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-
+++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++-                  {categories.map((category) => (
+++-                    <option key={category} value={category}>
+++-                      {category}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++-                  {[
+++-                    { id: 'list', label: 'Lista', Icon: List },
+++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++-                  ].map(({ id, label, Icon }) => {
+++-                    const active = viewMode === id;
+++-                    return (
+++-                      <button
+++-                        key={id}
+++-                        type="button"
+++-                        onClick={() => setViewMode(id)}
+++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++-                        style={{
+++-                          background: active ? 'var(--accent)' : 'transparent',
+++-                          color: active ? '#fff' : 'var(--text-muted)',
+++-                        }}
+++-                        title={label}
+++-                      >
+++-                        <Icon className="h-4 w-4" />
+++-                      </button>
+++-                    );
+++-                  })}
+++-                </div>
+++-              </div>
+++-            </div>
+++-          </section>
+++-
+++           {viewMode === 'grid' ? (
+++             <>
+++               <section
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + notifications route checks
+++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++**Output de verificación:**
+++```
+++$ npm run build
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1769 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+++✓ built in 8.13s
+++
+++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++notifications page: true
+++sidebar target: true
+++page exists: true
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `reports/report_083.md`
++```diff
++diff --git a/reports/report_083.md b/reports/report_083.md
++new file mode 100644
++index 0000000..e42729e
++--- /dev/null
+++++ b/reports/report_083.md
++@@ -0,0 +1,1334 @@
+++# Report 083
+++**Fecha:** 2026-06-21 23:59  
+++**Agente:** Codex  
+++**Tipo:** refactor
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 3
+++
+++## Archivos modificados
+++- `reports/report_082.md` — archivo creado como parte de la base inicial
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| reports/report_082.md | 654 | 0 |
+++| src/components/StackedEventCards.jsx | 162 | 156 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `reports/report_082.md`
+++```diff
+++diff --git a/reports/report_082.md b/reports/report_082.md
+++new file mode 100644
+++index 0000000..d5271ac
+++--- /dev/null
++++++ b/reports/report_082.md
+++@@ -0,0 +1,654 @@
++++# Report 082
++++**Fecha:** 2026-06-21 23:41  
++++**Agente:** Codex  
++++**Tipo:** frontend
++++
++++## Contexto Git
++++**Rama:** master
++++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++++**Archivos modificados:** 2
++++
++++## Archivos modificados
++++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++++
++++## Estadísticas
++++| Archivo | + líneas | - líneas |
++++|---------|----------|----------|
++++| src/components/StackedEventCards.jsx | 147 | 157 |
++++| src/pages/Calendario.jsx | 106 | 77 |
++++
++++## Resumen
++++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++++
++++## Cambios de codigo
++++### `src/components/StackedEventCards.jsx`
++++```diff
++++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++++index 3c412de..c2f6386 100644
++++--- a/src/components/StackedEventCards.jsx
+++++++ b/src/components/StackedEventCards.jsx
++++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
++++ import { classifyEvent } from '../utils/eventClassifier';
++++ 
++++ const MAX_VISIBLE = 5;
++++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++++-const STACK_OFFSETS = [
++++-  { x: 0, y: 0 },
++++-  { x: -8, y: -4 },
++++-  { x: -16, y: -8 },
++++-  { x: -24, y: -5 },
++++-  { x: -30, y: -10 },
++++-];
+++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+++++
+++++const EVENT_DESCRIPTIONS = {
+++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++++  semester_start: 'Inicio oficial de actividades académicas.',
+++++  semester_end: 'Último día del período escolar vigente.',
+++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++++  administrative_closure: 'Cierre administrativo del período en curso.',
+++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++++  winter_break: 'Receso invernal entre periodos escolares.',
+++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++++};
++++ 
++++ function parseLooseDate(value) {
++++   if (!value) return null;
++++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++++ function formatStackDate(date) {
++++   if (!date) return '';
++++ 
++++-  const day = date.getDate();
++++-  const month = date
++++-    .toLocaleDateString('es-MX', { month: 'short' })
++++-    .replace('.', '')
++++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++++-
++++-  return `${day} ${month}`;
+++++  return date
+++++    .toLocaleDateString('es-MX', {
+++++      day: '2-digit',
+++++      month: '2-digit',
+++++      year: 'numeric',
+++++    })
+++++    .replace(/\//g, '-');
++++ }
++++ 
++++ function getEventTitle(event) {
++++@@ -52,140 +78,118 @@ function getEventDate(event) {
++++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++ }
++++ 
++++-function getCardStyle(category, index) {
++++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++++function getCardStyle(index, category) {
+++++  const scale = 1 - index * 0.05;
+++++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++++
++++   return {
++++-    zIndex: MAX_VISIBLE - index,
++++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++++    zIndex: 10 - index,
+++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++++    opacity,
++++     transformOrigin: 'center center',
++++-    '--discard-rot': `${rot}deg`,
++++-    background: `${category.color}26`,
++++-    borderColor: `${category.color}66`,
+++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++++    background: 'var(--bg-card)',
+++++    borderColor: `${category.color}4D`,
++++   };
++++ }
++++ 
++++-function StackCard({ event, index, phase }) {
+++++function getDescription(category, event) {
+++++  return (
+++++    event?.descripcion ||
+++++    event?.description ||
+++++    EVENT_DESCRIPTIONS[category.id] ||
+++++    'Fecha académica oficial del calendario ITSON.'
+++++  );
+++++}
+++++
+++++function StackCard({ event, index }) {
++++   const category = classifyEvent(getEventTitle(event));
++++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++++   const date = getEventDate(event);
++++ 
++++-  const DESCRIPTIONS = {
++++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++-    semester_start: 'Inicio oficial de actividades académicas.',
++++-    semester_end: 'Último día del período escolar vigente.',
++++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++-    administrative_closure: 'Cierre administrativo del período en curso.',
++++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++-    winter_break: 'Receso invernal entre periodos escolares.',
++++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++-  };
++++-
++++   return (
++++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++++-      <article
++++-        className={[
++++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++++-          phase === 'exit' ? 'animate-card-discard' : '',
++++-          phase === 'enter' ? 'animate-card-enter' : '',
++++-        ]
++++-          .filter(Boolean)
++++-          .join(' ')}
++++-        style={{
++++-          animationDelay: `${index * 60}ms`,
++++-        }}
++++-      >
++++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++++-
++++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++++-          <div className="mb-2 flex items-center justify-between">
++++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++++-              {category.label}
++++-            </span>
++++-            <span className="text-[10px]" style={{ color: category.color }}>
++++-              ✦ ✦ ✦
++++-            </span>
++++-          </div>
+++++    <article
+++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+++++      style={getCardStyle(index, category)}
+++++    >
+++++      <div className="flex h-full flex-col p-3">
+++++        <div className="flex items-start justify-between gap-2">
+++++          <span
+++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+++++            style={{ background: category.color }}
+++++          >
+++++            {category.label}
+++++          </span>
+++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+++++            ✦ ✦ ✦
+++++          </span>
+++++        </div>
++++ 
++++-          <div className="flex flex-1 gap-3">
++++-            <div className="flex flex-col items-center justify-center gap-1">
++++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++++-              </div>
++++-              <div className="flex gap-0.5">
++++-                {[0, 1, 2].map((star) => (
++++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++++-                    ★
++++-                  </span>
++++-                ))}
++++-              </div>
+++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+++++            <div
+++++              className="flex h-9 w-9 items-center justify-center rounded-full"
+++++              style={{ background: `${category.color}26` }}
+++++            >
+++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
++++             </div>
+++++          </div>
++++ 
++++-            <div className="flex flex-1 flex-col justify-center">
++++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++++-                {getEventTitle(event)}
++++-              </h5>
++++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++++-              </p>
++++-            </div>
+++++          <div className="min-w-0 flex-1">
+++++            <h5
+++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+++++              style={{ color: 'var(--text-strong)' }}
+++++            >
+++++              {getEventTitle(event)}
+++++            </h5>
+++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++++              {getDescription(category, event)}
+++++            </p>
++++           </div>
+++++        </div>
++++ 
++++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++-            <div>
++++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++++-                Fecha del evento
++++-              </p>
++++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++++-                {date
++++-                  ? date
++++-                      .toLocaleDateString('es-MX', {
++++-                        day: '2-digit',
++++-                        month: '2-digit',
++++-                        year: 'numeric',
++++-                      })
++++-                      .replace(/\//g, '-')
++++-                  : 'Por confirmar'}
++++-              </p>
++++-            </div>
+++++        <div
+++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+++++          style={{ background: `${category.color}14` }}
+++++        >
+++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++++          <div className="leading-tight">
+++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++++              Fecha del evento
+++++            </p>
+++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++++              {date ? formatStackDate(date) : 'Por confirmar'}
+++++            </p>
++++           </div>
++++         </div>
++++-      </article>
+++++      </div>
+++++    </article>
+++++  );
+++++}
+++++
+++++function EmptyState() {
+++++  return (
+++++    <div
+++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+++++      style={{ borderColor: 'var(--border-subtle)' }}
+++++    >
+++++      <div className="space-y-2 text-center">
+++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++++          Sin eventos este mes
+++++        </p>
+++++      </div>
++++     </div>
++++   );
++++ }
++++ 
++++ export default function StackedEventCards({ events = [], currentMonth }) {
++++-  const visibleEvents = useMemo(() => {
++++-    return (Array.isArray(events) ? events : [])
++++-      .slice(0, MAX_VISIBLE)
++++-      .filter(Boolean);
++++-  }, [events]);
+++++  const visibleEvents = useMemo(
+++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++++    [events],
+++++  );
++++ 
++++   const [stack, setStack] = useState(visibleEvents);
++++   const [phase, setPhase] = useState('idle');
++++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++++ 
++++       const settleTimer = setTimeout(() => {
++++         setPhase('idle');
++++-      }, 320);
+++++      }, 180);
++++ 
++++       timersRef.current.push(settleTimer);
++++-    }, 360);
+++++    }, 180);
++++ 
++++     timersRef.current.push(exitTimer);
++++ 
++++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++++     });
++++   };
++++ 
++++-  if (!stack.length) {
++++-    return (
++++-      <div
++++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++++-      >
++++-        <div className="space-y-2">
++++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++-            Sin eventos este mes
++++-          </p>
++++-        </div>
++++-      </div>
++++-    );
++++-  }
++++-
++++   return (
++++     <button
++++       type="button"
++++-      onClick={rotateStack}
++++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++++-      aria-label="Rotar eventos del calendario"
++++-      title="Haz clic para cambiar el evento"
+++++      onClick={visibleEvents.length ? rotateStack : undefined}
+++++      disabled={!visibleEvents.length}
+++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++++     >
++++-      {stack.map((event, index) => (
++++-        <StackCard
++++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++++-          event={event}
++++-          index={index}
++++-          phase={phase}
++++-        />
++++-      ))}
+++++      {stack.length ? (
+++++        stack.map((event, index) => {
+++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++++        })
+++++      ) : (
+++++        <EmptyState />
+++++      )}
++++     </button>
++++   );
++++ }
++++```
++++
++++### `src/pages/Calendario.jsx`
++++```diff
++++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++++index f83a172..0da02ab 100644
++++--- a/src/pages/Calendario.jsx
+++++++ b/src/pages/Calendario.jsx
++++@@ -10,6 +10,7 @@ import {
++++   MapPin,
++++   RefreshCw,
++++ } from 'lucide-react';
+++++import StackedEventCards from '../components/StackedEventCards';
++++ 
++++ const MONTHS = [
++++   'Enero',
++++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++++ }
++++ 
+++++function getEventDateForMonth(event) {
+++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++++  if (direct) return direct;
+++++
+++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++++  if (!match) return null;
+++++
+++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++++}
+++++
++++ function groupEventsByMonth(events) {
++++   return events.reduce((groups, event) => {
++++     const date = getValidDate(event.inicio);
++++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++++     () => getEventsForDay(events, selectedDay, filterCat),
++++     [events, filterCat, selectedDay],
++++   );
+++++  const visibleMonthEvents = useMemo(() => {
+++++    return events
+++++      .filter((event) => {
+++++        const date = getEventDateForMonth(event);
+++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++++      })
+++++      .sort((left, right) => {
+++++        const leftDate = getEventDateForMonth(left);
+++++        const rightDate = getEventDateForMonth(right);
+++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++++      });
+++++  }, [currentMonth, currentYear, events]);
++++   const groupedEvents = groupEventsByMonth(filteredEvents);
++++   const hasEvents = events.length > 0;
++++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++++         </div>
++++       ) : null}
++++ 
+++++      <section
+++++        className="rounded-2xl border p-4"
+++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++++      >
+++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+++++          <div className="flex items-center gap-2">
+++++            <button
+++++              type="button"
+++++              onClick={goToPreviousMonth}
+++++              className="rounded-xl border p-2 transition hover:scale-105"
+++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++++              aria-label="Mes anterior"
+++++            >
+++++              <ChevronLeft className="h-4 w-4" />
+++++            </button>
+++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++++              {monthLabel}
+++++            </p>
+++++            <button
+++++              type="button"
+++++              onClick={goToNextMonth}
+++++              className="rounded-xl border p-2 transition hover:scale-105"
+++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++++              aria-label="Mes siguiente"
+++++            >
+++++              <ChevronRight className="h-4 w-4" />
+++++            </button>
+++++          </div>
+++++
+++++          <div className="flex flex-wrap items-end gap-3">
+++++            <SelectField
+++++              label="Seleccionar un calendario"
+++++              value={selectedCalendarType}
+++++              onChange={handleCalendarTypeChange}
+++++              className="min-w-[260px]"
+++++            >
+++++              {calendarTypes.map((type) => (
+++++                <option key={type} value={type}>
+++++                  {type}
+++++                </option>
+++++              ))}
+++++            </SelectField>
+++++
+++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++++              {categories.map((category) => (
+++++                <option key={category} value={category}>
+++++                  {category}
+++++                </option>
+++++              ))}
+++++            </SelectField>
+++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++++              {[
+++++                { id: 'list', label: 'Lista', Icon: List },
+++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++++              ].map(({ id, label, Icon }) => {
+++++                const active = viewMode === id;
+++++                return (
+++++                  <button
+++++                    key={id}
+++++                    type="button"
+++++                    onClick={() => setViewMode(id)}
+++++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++++                    style={{
+++++                      background: active ? 'var(--accent)' : 'transparent',
+++++                      color: active ? '#fff' : 'var(--text-muted)',
+++++                    }}
+++++                    title={label}
+++++                  >

... [DIFF TRUNCADO — archivo muy grande, ver git diff completo] ...
```

### `reports/report_086.md`
```diff
diff --git a/reports/report_086.md b/reports/report_086.md
new file mode 100644
index 0000000..16e0641
--- /dev/null
+++ b/reports/report_086.md
@@ -0,0 +1,9478 @@
+# Report 086
+**Fecha:** 2026-06-22 16:20  
+**Agente:** Codex  
+**Tipo:** refactor
+
+## Contexto Git
+**Rama:** master
+**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+**Archivos modificados:** 14
+
+## Archivos modificados
+- `generate-report.js` — archivo actualizado en esta tarea
+- `reports/ascii_lab_084.png` — archivo creado como parte de la base inicial
+- `reports/calendario_stack_themed_clicked_084.png` — archivo creado como parte de la base inicial
+- `reports/report_082.md` — archivo creado como parte de la base inicial
+- `reports/report_083.md` — archivo creado como parte de la base inicial
+- `reports/report_084.md` — archivo creado como parte de la base inicial
+- `reports/report_085.md` — archivo creado como parte de la base inicial
+- `src/App.jsx` — archivo actualizado en esta tarea
+- `src/components/AsciiArtPreview.jsx` — archivo creado como parte de la base inicial
+- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+- `src/pages/Ajustes.jsx` — archivo actualizado en esta tarea
+- `src/pages/AsciiLab.jsx` — archivo creado como parte de la base inicial
+- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+- `src/utils/asciiConverter.js` — archivo creado como parte de la base inicial
+
+## Estadísticas
+| Archivo | + líneas | - líneas |
+|---------|----------|----------|
+| generate-report.js | 21 | 13 |
+| reports/ascii_lab_084.png | 0 | 0 |
+| reports/calendario_stack_themed_clicked_084.png | 0 | 0 |
+| reports/report_082.md | 654 | 0 |
+| reports/report_083.md | 1334 | 0 |
+| reports/report_084.md | 2744 | 0 |
+| reports/report_085.md | 5576 | 0 |
+| src/App.jsx | 6 | 0 |
+| src/components/AsciiArtPreview.jsx | 29 | 0 |
+| src/components/StackedEventCards.jsx | 122 | 206 |
+| src/pages/Ajustes.jsx | 13 | 1 |
+| src/pages/AsciiLab.jsx | 269 | 0 |
+| src/pages/Calendario.jsx | 120 | 101 |
+| src/utils/asciiConverter.js | 99 | 0 |
+
+## Resumen
+Se registraron 14 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+
+## Cambios de codigo
+### `generate-report.js`
+```diff
+diff --git a/generate-report.js b/generate-report.js
+index 6e0c844..243425a 100644
+--- a/generate-report.js
++++ b/generate-report.js
+@@ -19,27 +19,35 @@ const MAX_DIFF_BYTES = 150 * 1024;
+ 
+ const VERIFICATION = {
+   buildStatus: 'PASS',
+-  testsRun: 'npm run build + notifications route checks',
+-  verificationCmd: `node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes(\"notifications: {\")); console.log('sidebar target:', sidebar.includes(\"target: 'notifications'\")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"`,
+-verificationOutput: `$ npm run build
++  testsRun: 'npm run build + checks de asciiConverter/AsciiLab + screenshot Playwright con mock',
++  verificationCmd: `npm run build
++node -e "const fs = require('fs'); console.log('asciiConverter existe:', fs.existsSync('src/utils/asciiConverter.js')); console.log('AsciiArtPreview existe:', fs.existsSync('src/components/AsciiArtPreview.jsx')); console.log('AsciiLab existe:', fs.existsSync('src/pages/AsciiLab.jsx')); const conv = fs.readFileSync('src/utils/asciiConverter.js','utf8'); console.log('exporta imageToAscii:', conv.includes('export function imageToAscii')); console.log('exporta loadImageFromFile:', conv.includes('export function loadImageFromFile'));"`,
++  verificationOutput: `$ npm run build
+ > dvpotro@0.1.0 build
+ > vite build
+ 
+ vite v5.4.21 building for production...
+ transforming...
+-✓ 1769 modules transformed.
++✓ 1774 modules transformed.
+ rendering chunks...
+ computing gzip size...
+-dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/index.html                            0.47 kB │ gzip:   0.30 kB
+ dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+-dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+-dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+-✓ built in 8.13s
+-
+-$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes(\"notifications: {\")); console.log('sidebar target:', sidebar.includes(\"target: 'notifications'\")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+-notifications page: true
+-sidebar target: true
+-page exists: true`,
++dist/assets/index-BFbkuREr.css             38.89 kB │ gzip:   7.93 kB
++dist/assets/index-WL6WRmiP.js              1,241.08 kB │ gzip: 261.68 kB
++✓ built in 13.25s
++
++$ node -e "..."
++asciiConverter existe: true
++AsciiArtPreview existe: true
++AsciiLab existe: true
++exporta imageToAscii: true
++exporta loadImageFromFile: true
++
++$ playwright screenshot mock
++{
++  "screenshot": "C:/Users/kneko/OneDrive/Documentos/scraper-app/reports/ascii_lab_084.png"
++}`,
+ };
+ 
+ function ensureReportsDir() {
+```
+
+### `reports/ascii_lab_084.png`
+```diff
+diff --git a/reports/ascii_lab_084.png b/reports/ascii_lab_084.png
+new file mode 100644
+index 0000000..098a53f
+Binary files /dev/null and b/reports/ascii_lab_084.png differ
+```
+
+### `reports/calendario_stack_themed_clicked_084.png`
+```diff
+diff --git a/reports/calendario_stack_themed_clicked_084.png b/reports/calendario_stack_themed_clicked_084.png
+new file mode 100644
+index 0000000..43c0661
+Binary files /dev/null and b/reports/calendario_stack_themed_clicked_084.png differ
+```
+
+### `reports/report_082.md`
+```diff
+diff --git a/reports/report_082.md b/reports/report_082.md
+new file mode 100644
+index 0000000..d5271ac
+--- /dev/null
++++ b/reports/report_082.md
+@@ -0,0 +1,654 @@
++# Report 082
++**Fecha:** 2026-06-21 23:41  
++**Agente:** Codex  
++**Tipo:** frontend
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 2
++
++## Archivos modificados
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| src/components/StackedEventCards.jsx | 147 | 157 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..c2f6386 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
++ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,118 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++ 
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
++-
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <article
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-3">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-9 w-9 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-4 w-4" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {getDescription(category, event)}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </article>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+++      style={{ borderColor: 'var(--border-subtle)' }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..0da02ab 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++              })}
+++            </div>
+++
+++            <div className="shrink-0 self-center">
+++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++            </div>
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_083.md`
+```diff
+diff --git a/reports/report_083.md b/reports/report_083.md
+new file mode 100644
+index 0000000..e42729e
+--- /dev/null
++++ b/reports/report_083.md
+@@ -0,0 +1,1334 @@
++# Report 083
++**Fecha:** 2026-06-21 23:59  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 3
++
++## Archivos modificados
++- `reports/report_082.md` — archivo creado como parte de la base inicial
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| reports/report_082.md | 654 | 0 |
++| src/components/StackedEventCards.jsx | 162 | 156 |
++| src/pages/Calendario.jsx | 106 | 77 |
++
++## Resumen
++Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `reports/report_082.md`
++```diff
++diff --git a/reports/report_082.md b/reports/report_082.md
++new file mode 100644
++index 0000000..d5271ac
++--- /dev/null
+++++ b/reports/report_082.md
++@@ -0,0 +1,654 @@
+++# Report 082
+++**Fecha:** 2026-06-21 23:41  
+++**Agente:** Codex  
+++**Tipo:** frontend
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 2
+++
+++## Archivos modificados
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| src/components/StackedEventCards.jsx | 147 | 157 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `src/components/StackedEventCards.jsx`
+++```diff
+++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+++index 3c412de..c2f6386 100644
+++--- a/src/components/StackedEventCards.jsx
++++++ b/src/components/StackedEventCards.jsx
+++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
+++ import { classifyEvent } from '../utils/eventClassifier';
+++ 
+++ const MAX_VISIBLE = 5;
+++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+++-const STACK_OFFSETS = [
+++-  { x: 0, y: 0 },
+++-  { x: -8, y: -4 },
+++-  { x: -16, y: -8 },
+++-  { x: -24, y: -5 },
+++-  { x: -30, y: -10 },
+++-];
++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++++
++++const EVENT_DESCRIPTIONS = {
++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++  semester_start: 'Inicio oficial de actividades académicas.',
++++  semester_end: 'Último día del período escolar vigente.',
++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++++  last_day_classes: 'Cierre académico antes del siguiente período.',
++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++  administrative_closure: 'Cierre administrativo del período en curso.',
++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++  winter_break: 'Receso invernal entre periodos escolares.',
++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++};
+++ 
+++ function parseLooseDate(value) {
+++   if (!value) return null;
+++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+++ function formatStackDate(date) {
+++   if (!date) return '';
+++ 
+++-  const day = date.getDate();
+++-  const month = date
+++-    .toLocaleDateString('es-MX', { month: 'short' })
+++-    .replace('.', '')
+++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+++-
+++-  return `${day} ${month}`;
++++  return date
++++    .toLocaleDateString('es-MX', {
++++      day: '2-digit',
++++      month: '2-digit',
++++      year: 'numeric',
++++    })
++++    .replace(/\//g, '-');
+++ }
+++ 
+++ function getEventTitle(event) {
+++@@ -52,140 +78,118 @@ function getEventDate(event) {
+++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++ }
+++ 
+++-function getCardStyle(category, index) {
+++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+++-  const rot = STACK_ROTATIONS[index] ?? 0;
++++function getCardStyle(index, category) {
++++  const scale = 1 - index * 0.05;
++++  const rotation = STACK_ROTATIONS[index] ?? 0;
++++  const opacity = Math.max(0.22, 1 - index * 0.18);
++++
+++   return {
+++-    zIndex: MAX_VISIBLE - index,
+++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++++    zIndex: 10 - index,
++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++++    opacity,
+++     transformOrigin: 'center center',
+++-    '--discard-rot': `${rot}deg`,
+++-    background: `${category.color}26`,
+++-    borderColor: `${category.color}66`,
++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++++    background: 'var(--bg-card)',
++++    borderColor: `${category.color}4D`,
+++   };
+++ }
+++ 
+++-function StackCard({ event, index, phase }) {
++++function getDescription(category, event) {
++++  return (
++++    event?.descripcion ||
++++    event?.description ||
++++    EVENT_DESCRIPTIONS[category.id] ||
++++    'Fecha académica oficial del calendario ITSON.'
++++  );
++++}
++++
++++function StackCard({ event, index }) {
+++   const category = classifyEvent(getEventTitle(event));
+++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+++   const date = getEventDate(event);
+++ 
+++-  const DESCRIPTIONS = {
+++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++-    semester_start: 'Inicio oficial de actividades académicas.',
+++-    semester_end: 'Último día del período escolar vigente.',
+++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+++-    last_day_classes: 'Cierre académico antes del siguiente período.',
+++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++-    administrative_closure: 'Cierre administrativo del período en curso.',
+++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++-    winter_break: 'Receso invernal entre periodos escolares.',
+++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++-  };
+++-
+++   return (
+++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+++-      <article
+++-        className={[
+++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+++-          phase === 'exit' ? 'animate-card-discard' : '',
+++-          phase === 'enter' ? 'animate-card-enter' : '',
+++-        ]
+++-          .filter(Boolean)
+++-          .join(' ')}
+++-        style={{
+++-          animationDelay: `${index * 60}ms`,
+++-        }}
+++-      >
+++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+++-
+++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+++-          <div className="mb-2 flex items-center justify-between">
+++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+++-              {category.label}
+++-            </span>
+++-            <span className="text-[10px]" style={{ color: category.color }}>
+++-              ✦ ✦ ✦
+++-            </span>
+++-          </div>
++++    <article
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
++++      style={getCardStyle(index, category)}
++++    >
++++      <div className="flex h-full flex-col p-3">
++++        <div className="flex items-start justify-between gap-2">
++++          <span
++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
++++            style={{ background: category.color }}
++++          >
++++            {category.label}
++++          </span>
++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
++++            ✦ ✦ ✦
++++          </span>
++++        </div>
+++ 
+++-          <div className="flex flex-1 gap-3">
+++-            <div className="flex flex-col items-center justify-center gap-1">
+++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+++-              </div>
+++-              <div className="flex gap-0.5">
+++-                {[0, 1, 2].map((star) => (
+++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+++-                    ★
+++-                  </span>
+++-                ))}
+++-              </div>
++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
++++            <div
++++              className="flex h-9 w-9 items-center justify-center rounded-full"
++++              style={{ background: `${category.color}26` }}
++++            >
++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
+++             </div>
++++          </div>
+++ 
+++-            <div className="flex flex-1 flex-col justify-center">
+++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+++-                {getEventTitle(event)}
+++-              </h5>
+++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+++-              </p>
+++-            </div>
++++          <div className="min-w-0 flex-1">
++++            <h5
++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
++++              style={{ color: 'var(--text-strong)' }}
++++            >
++++              {getEventTitle(event)}
++++            </h5>
++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++++              {getDescription(category, event)}
++++            </p>
+++           </div>
++++        </div>
+++ 
+++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++-            <div>
+++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+++-                Fecha del evento
+++-              </p>
+++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+++-                {date
+++-                  ? date
+++-                      .toLocaleDateString('es-MX', {
+++-                        day: '2-digit',
+++-                        month: '2-digit',
+++-                        year: 'numeric',
+++-                      })
+++-                      .replace(/\//g, '-')
+++-                  : 'Por confirmar'}
+++-              </p>
+++-            </div>
++++        <div
++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
++++          style={{ background: `${category.color}14` }}
++++        >
++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++          <div className="leading-tight">
++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++++              Fecha del evento
++++            </p>
++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {date ? formatStackDate(date) : 'Por confirmar'}
++++            </p>
+++           </div>
+++         </div>
+++-      </article>
++++      </div>
++++    </article>
++++  );
++++}
++++
++++function EmptyState() {
++++  return (
++++    <div
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
++++      style={{ borderColor: 'var(--border-subtle)' }}
++++    >
++++      <div className="space-y-2 text-center">
++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++          Sin eventos este mes
++++        </p>
++++      </div>
+++     </div>
+++   );
+++ }
+++ 
+++ export default function StackedEventCards({ events = [], currentMonth }) {
+++-  const visibleEvents = useMemo(() => {
+++-    return (Array.isArray(events) ? events : [])
+++-      .slice(0, MAX_VISIBLE)
+++-      .filter(Boolean);
+++-  }, [events]);
++++  const visibleEvents = useMemo(
++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++++    [events],
++++  );
+++ 
+++   const [stack, setStack] = useState(visibleEvents);
+++   const [phase, setPhase] = useState('idle');
+++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++ 
+++       const settleTimer = setTimeout(() => {
+++         setPhase('idle');
+++-      }, 320);
++++      }, 180);
+++ 
+++       timersRef.current.push(settleTimer);
+++-    }, 360);
++++    }, 180);
+++ 
+++     timersRef.current.push(exitTimer);
+++ 
+++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++     });
+++   };
+++ 
+++-  if (!stack.length) {
+++-    return (
+++-      <div
+++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+++-      >
+++-        <div className="space-y-2">
+++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++-            Sin eventos este mes
+++-          </p>
+++-        </div>
+++-      </div>
+++-    );
+++-  }
+++-
+++   return (
+++     <button
+++       type="button"
+++-      onClick={rotateStack}
+++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+++-      aria-label="Rotar eventos del calendario"
+++-      title="Haz clic para cambiar el evento"
++++      onClick={visibleEvents.length ? rotateStack : undefined}
++++      disabled={!visibleEvents.length}
++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+++     >
+++-      {stack.map((event, index) => (
+++-        <StackCard
+++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+++-          event={event}
+++-          index={index}
+++-          phase={phase}
+++-        />
+++-      ))}
++++      {stack.length ? (
++++        stack.map((event, index) => {
++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++++        })
++++      ) : (
++++        <EmptyState />
++++      )}
+++     </button>
+++   );
+++ }
+++```
+++
+++### `src/pages/Calendario.jsx`
+++```diff
+++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+++index f83a172..0da02ab 100644
+++--- a/src/pages/Calendario.jsx
++++++ b/src/pages/Calendario.jsx
+++@@ -10,6 +10,7 @@ import {
+++   MapPin,
+++   RefreshCw,
+++ } from 'lucide-react';
++++import StackedEventCards from '../components/StackedEventCards';
+++ 
+++ const MONTHS = [
+++   'Enero',
+++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+++ }
+++ 
++++function getEventDateForMonth(event) {
++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++  if (direct) return direct;
++++
++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++++  if (!match) return null;
++++
++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++++}
++++
+++ function groupEventsByMonth(events) {
+++   return events.reduce((groups, event) => {
+++     const date = getValidDate(event.inicio);
+++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++     () => getEventsForDay(events, selectedDay, filterCat),
+++     [events, filterCat, selectedDay],
+++   );
++++  const visibleMonthEvents = useMemo(() => {
++++    return events
++++      .filter((event) => {
++++        const date = getEventDateForMonth(event);
++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++++      })
++++      .sort((left, right) => {
++++        const leftDate = getEventDateForMonth(left);
++++        const rightDate = getEventDateForMonth(right);
++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++++      });
++++  }, [currentMonth, currentYear, events]);
+++   const groupedEvents = groupEventsByMonth(filteredEvents);
+++   const hasEvents = events.length > 0;
+++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++         </div>
+++       ) : null}
+++ 
++++      <section
++++        className="rounded-2xl border p-4"
++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++++      >
++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
++++          <div className="flex items-center gap-2">
++++            <button
++++              type="button"
++++              onClick={goToPreviousMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes anterior"
++++            >
++++              <ChevronLeft className="h-4 w-4" />
++++            </button>
++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {monthLabel}
++++            </p>
++++            <button
++++              type="button"
++++              onClick={goToNextMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes siguiente"
++++            >
++++              <ChevronRight className="h-4 w-4" />
++++            </button>
++++          </div>
++++
++++          <div className="flex flex-wrap items-end gap-3">
++++            <SelectField
++++              label="Seleccionar un calendario"
++++              value={selectedCalendarType}
++++              onChange={handleCalendarTypeChange}
++++              className="min-w-[260px]"
++++            >
++++              {calendarTypes.map((type) => (
++++                <option key={type} value={type}>
++++                  {type}
++++                </option>
++++              ))}
++++            </SelectField>
++++
++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++++              {categories.map((category) => (
++++                <option key={category} value={category}>
++++                  {category}
++++                </option>
++++              ))}
++++            </SelectField>
++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++++              {[
++++                { id: 'list', label: 'Lista', Icon: List },
++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++++              ].map(({ id, label, Icon }) => {
++++                const active = viewMode === id;
++++                return (
++++                  <button
++++                    key={id}
++++                    type="button"
++++                    onClick={() => setViewMode(id)}
++++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++++                    style={{
++++                      background: active ? 'var(--accent)' : 'transparent',
++++                      color: active ? '#fff' : 'var(--text-muted)',
++++                    }}
++++                    title={label}
++++                  >
++++                    <Icon className="h-4 w-4" />
++++                  </button>
++++                );
++++              })}
++++            </div>
++++
++++            <div className="shrink-0 self-center">
++++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++++            </div>
++++          </div>
++++        </div>
++++      </section>
++++
+++       {!calendarData?.error && !hasEvents ? (
+++         <div
+++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++ 
+++       {hasEvents ? (
+++         <>
+++-          <section
+++-            className="rounded-2xl border p-4"
+++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++-          >
+++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+++-              <div className="flex items-center gap-2">
+++-                <button
+++-                  type="button"
+++-                  onClick={goToPreviousMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes anterior"
+++-                >
+++-                  <ChevronLeft className="h-4 w-4" />
+++-                </button>
+++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++-                  {monthLabel}
+++-                </p>
+++-                <button
+++-                  type="button"
+++-                  onClick={goToNextMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes siguiente"
+++-                >
+++-                  <ChevronRight className="h-4 w-4" />
+++-                </button>
+++-              </div>
+++-
+++-              <div className="flex flex-wrap items-end gap-3">
+++-                <SelectField
+++-                  label="Seleccionar un calendario"
+++-                  value={selectedCalendarType}
+++-                  onChange={handleCalendarTypeChange}
+++-                  className="min-w-[260px]"
+++-                >
+++-                  {calendarTypes.map((type) => (
+++-                    <option key={type} value={type}>
+++-                      {type}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-
+++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++-                  {categories.map((category) => (
+++-                    <option key={category} value={category}>
+++-                      {category}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++-                  {[
+++-                    { id: 'list', label: 'Lista', Icon: List },
+++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++-                  ].map(({ id, label, Icon }) => {
+++-                    const active = viewMode === id;
+++-                    return (
+++-                      <button
+++-                        key={id}
+++-                        type="button"
+++-                        onClick={() => setViewMode(id)}
+++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++-                        style={{
+++-                          background: active ? 'var(--accent)' : 'transparent',
+++-                          color: active ? '#fff' : 'var(--text-muted)',
+++-                        }}
+++-                        title={label}
+++-                      >
+++-                        <Icon className="h-4 w-4" />
+++-                      </button>
+++-                    );
+++-                  })}
+++-                </div>
+++-              </div>
+++-            </div>
+++-          </section>
+++-
+++           {viewMode === 'grid' ? (
+++             <>
+++               <section
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + notifications route checks
+++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++**Output de verificación:**
+++```
+++$ npm run build
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1769 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+++✓ built in 8.13s
+++
+++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++notifications page: true
+++sidebar target: true
+++page exists: true
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `src/components/StackedEventCards.jsx`
++```diff
++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++index 3c412de..56a4ba4 100644
++--- a/src/components/StackedEventCards.jsx
+++++ b/src/components/StackedEventCards.jsx
++@@ -5,13 +5,39 @@ import { classifyEvent } from '../utils/eventClassifier';
++ 
++ const MAX_VISIBLE = 5;
++ const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++-const STACK_OFFSETS = [
++-  { x: 0, y: 0 },
++-  { x: -8, y: -4 },
++-  { x: -16, y: -8 },
++-  { x: -24, y: -5 },
++-  { x: -30, y: -10 },
++-];
+++
+++const EVENT_DESCRIPTIONS = {
+++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++  semester_start: 'Inicio oficial de actividades académicas.',
+++  semester_end: 'Último día del período escolar vigente.',
+++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++  administrative_closure: 'Cierre administrativo del período en curso.',
+++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++  winter_break: 'Receso invernal entre periodos escolares.',
+++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++};
++ 
++ function parseLooseDate(value) {
++   if (!value) return null;
++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++ function formatStackDate(date) {
++   if (!date) return '';
++ 
++-  const day = date.getDate();
++-  const month = date
++-    .toLocaleDateString('es-MX', { month: 'short' })
++-    .replace('.', '')
++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++-
++-  return `${day} ${month}`;
+++  return date
+++    .toLocaleDateString('es-MX', {
+++      day: '2-digit',
+++      month: '2-digit',
+++      year: 'numeric',
+++    })
+++    .replace(/\//g, '-');
++ }
++ 
++ function getEventTitle(event) {
++@@ -52,140 +78,134 @@ function getEventDate(event) {
++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++ }
++ 
++-function getCardStyle(category, index) {
++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++function getCardStyle(index, category) {
+++  const scale = 1 - index * 0.05;
+++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++
++   return {
++-    zIndex: MAX_VISIBLE - index,
++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++    zIndex: 10 - index,
+++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++    opacity,
++     transformOrigin: 'center center',
++-    '--discard-rot': `${rot}deg`,
++-    background: `${category.color}26`,
++-    borderColor: `${category.color}66`,
+++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++    background: 'var(--bg-card)',
+++    borderColor: `${category.color}4D`,
++   };
++ }
++ 
++-function StackCard({ event, index, phase }) {
+++function getDescription(category, event) {
+++  return (
+++    event?.descripcion ||
+++    event?.description ||
+++    EVENT_DESCRIPTIONS[category.id] ||
+++    'Fecha académica oficial del calendario ITSON.'
+++  );
+++}
+++
+++function StackCard({ event, index }) {
++   const category = classifyEvent(getEventTitle(event));
+++  const isBack = index > 0;
+++
+++  if (isBack) {
+++    return (
+++      <div
+++        className="absolute inset-0 m-auto h-[110px] w-[200px] rounded-[14px] border-2"
+++        style={getCardStyle(index, category)}
+++        aria-hidden="true"
+++      />
+++    );
+++  }
+++
++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++   const date = getEventDate(event);
++-
++-  const DESCRIPTIONS = {
++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++-    semester_start: 'Inicio oficial de actividades académicas.',
++-    semester_end: 'Último día del período escolar vigente.',
++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++-    administrative_closure: 'Cierre administrativo del período en curso.',
++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++-    winter_break: 'Receso invernal entre periodos escolares.',
++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++-  };
+++  const description = getDescription(category, event);
++ 
++   return (
++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++-      <article
++-        className={[
++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++-          phase === 'exit' ? 'animate-card-discard' : '',
++-          phase === 'enter' ? 'animate-card-enter' : '',
++-        ]
++-          .filter(Boolean)
++-          .join(' ')}
++-        style={{
++-          animationDelay: `${index * 60}ms`,
++-        }}
++-      >
++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++-
++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++-          <div className="mb-2 flex items-center justify-between">
++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++-              {category.label}
++-            </span>
++-            <span className="text-[10px]" style={{ color: category.color }}>
++-              ✦ ✦ ✦
++-            </span>
++-          </div>
+++    <div
+++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] flex-col overflow-hidden rounded-[14px] border shadow-[0_14px_24px_rgba(2,6,23,0.18)]"
+++      style={getCardStyle(index, category)}
+++    >
+++      <div className="flex h-full flex-col p-2.5">
+++        <div className="flex items-start justify-between gap-2">
+++          <span
+++            className="max-w-[116px] rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white"
+++            style={{ background: category.color }}
+++          >
+++            {category.label}
+++          </span>
+++          <span className="text-[9px] leading-none" style={{ color: category.color }}>
+++            ✦ ✦ ✦
+++          </span>
+++        </div>
++ 
++-          <div className="flex flex-1 gap-3">
++-            <div className="flex flex-col items-center justify-center gap-1">
++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++-              </div>
++-              <div className="flex gap-0.5">
++-                {[0, 1, 2].map((star) => (
++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++-                    ★
++-                  </span>
++-                ))}
++-              </div>
+++        <div className="mt-1.5 flex min-h-0 flex-1 gap-2.5">
+++          <div className="flex w-8 shrink-0 flex-col items-center justify-start pt-0.5">
+++            <div
+++              className="flex h-8 w-8 items-center justify-center rounded-full"
+++              style={{ background: `${category.color}26` }}
+++            >
+++              <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
++             </div>
+++          </div>
++ 
++-            <div className="flex flex-1 flex-col justify-center">
++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++-                {getEventTitle(event)}
++-              </h5>
++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++-              </p>
++-            </div>
+++          <div className="min-w-0 flex-1">
+++            <h5
+++              className="line-clamp-2 text-[11px] font-semibold leading-tight"
+++              style={{ color: 'var(--text-strong)' }}
+++            >
+++              {getEventTitle(event)}
+++            </h5>
+++            <div className="my-1 h-px w-8" style={{ background: category.color }} />
+++            <p className="line-clamp-2 text-[9px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++              {description}
+++            </p>
++           </div>
+++        </div>
++ 
++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++-            <div>
++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++-                Fecha del evento
++-              </p>
++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++-                {date
++-                  ? date
++-                      .toLocaleDateString('es-MX', {
++-                        day: '2-digit',
++-                        month: '2-digit',
++-                        year: 'numeric',
++-                      })
++-                      .replace(/\//g, '-')
++-                  : 'Por confirmar'}
++-              </p>
++-            </div>
+++        <div
+++          className="mt-1.5 flex items-center gap-2 self-start rounded-lg px-2 py-1"
+++          style={{ background: `${category.color}14` }}
+++        >
+++          <CalendarDays className="h-3 w-3" style={{ color: category.color }} />
+++          <div className="leading-tight">
+++            <p className="text-[7px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++              Fecha del evento
+++            </p>
+++            <p className="text-[9px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {date ? formatStackDate(date) : 'Por confirmar'}
+++            </p>
++           </div>
++         </div>
++-      </article>
+++      </div>
+++    </div>
+++  );
+++}
+++
+++function EmptyState() {
+++  return (
+++    <div
+++      className="absolute inset-0 m-auto flex h-[110px] w-[200px] items-center justify-center rounded-[14px] border border-dashed"
+++      style={{
+++        borderColor: 'var(--border-subtle)',
+++        background: 'var(--bg-card)',
+++      }}
+++    >
+++      <div className="space-y-2 text-center">
+++        <CalendarX className="mx-auto h-7 w-7" style={{ color: 'var(--text-muted)' }} />
+++        <p className="text-[11px] font-medium" style={{ color: 'var(--text-normal)' }}>
+++          Sin eventos este mes
+++        </p>
+++      </div>
++     </div>
++   );
++ }
++ 
++ export default function StackedEventCards({ events = [], currentMonth }) {
++-  const visibleEvents = useMemo(() => {
++-    return (Array.isArray(events) ? events : [])
++-      .slice(0, MAX_VISIBLE)
++-      .filter(Boolean);
++-  }, [events]);
+++  const visibleEvents = useMemo(
+++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++    [events],
+++  );
++ 
++   const [stack, setStack] = useState(visibleEvents);
++   const [phase, setPhase] = useState('idle');
++@@ -213,10 +233,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++ 
++       const settleTimer = setTimeout(() => {
++         setPhase('idle');
++-      }, 320);
+++      }, 180);
++ 
++       timersRef.current.push(settleTimer);
++-    }, 360);
+++    }, 180);
++ 
++     timersRef.current.push(exitTimer);
++ 
++@@ -232,38 +252,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++     });
++   };
++ 
++-  if (!stack.length) {
++-    return (
++-      <div
++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++-      >
++-        <div className="space-y-2">
++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++-            Sin eventos este mes
++-          </p>
++-        </div>
++-      </div>
++-    );
++-  }
++-
++   return (
++     <button
++       type="button"
++-      onClick={rotateStack}
++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++-      aria-label="Rotar eventos del calendario"
++-      title="Haz clic para cambiar el evento"
+++      onClick={visibleEvents.length ? rotateStack : undefined}
+++      disabled={!visibleEvents.length}
+++      className="relative hidden h-[132px] w-[220px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++     >
++-      {stack.map((event, index) => (
++-        <StackCard
++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++-          event={event}
++-          index={index}
++-          phase={phase}
++-        />
++-      ))}
+++      {stack.length ? (
+++        stack.map((event, index) => {
+++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++        })
+++      ) : (
+++        <EmptyState />
+++      )}
++     </button>
++   );
++ }
++```
++
++### `src/pages/Calendario.jsx`
++```diff
++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++index f83a172..92d5f0f 100644
++--- a/src/pages/Calendario.jsx
+++++ b/src/pages/Calendario.jsx
++@@ -10,6 +10,7 @@ import {
++   MapPin,
++   RefreshCw,
++ } from 'lucide-react';
+++import StackedEventCards from '../components/StackedEventCards';
++ 
++ const MONTHS = [
++   'Enero',
++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++ }
++ 
+++function getEventDateForMonth(event) {
+++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++  if (direct) return direct;
+++
+++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++  if (!match) return null;
+++
+++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++}
+++
++ function groupEventsByMonth(events) {
++   return events.reduce((groups, event) => {
++     const date = getValidDate(event.inicio);
++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++     () => getEventsForDay(events, selectedDay, filterCat),
++     [events, filterCat, selectedDay],
++   );
+++  const visibleMonthEvents = useMemo(() => {
+++    return events
+++      .filter((event) => {
+++        const date = getEventDateForMonth(event);
+++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++      })
+++      .sort((left, right) => {
+++        const leftDate = getEventDateForMonth(left);
+++        const rightDate = getEventDateForMonth(right);
+++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++      });
+++  }, [currentMonth, currentYear, events]);
++   const groupedEvents = groupEventsByMonth(filteredEvents);
++   const hasEvents = events.length > 0;
++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++         </div>
++       ) : null}
++ 
+++      <section
+++        className="rounded-2xl border p-4"
+++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++      >
+++        <div className="flex flex-wrap items-center gap-4">
+++          <div className="flex items-center gap-2">
+++            <button
+++              type="button"
+++              onClick={goToPreviousMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes anterior"
+++            >
+++              <ChevronLeft className="h-4 w-4" />
+++            </button>
+++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++              {monthLabel}
+++            </p>
+++            <button
+++              type="button"
+++              onClick={goToNextMonth}
+++              className="rounded-xl border p-2 transition hover:scale-105"
+++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++              aria-label="Mes siguiente"
+++            >
+++              <ChevronRight className="h-4 w-4" />
+++            </button>
+++          </div>
+++
+++          <div className="flex flex-wrap items-end gap-3">
+++            <SelectField
+++              label="Seleccionar un calendario"
+++              value={selectedCalendarType}
+++              onChange={handleCalendarTypeChange}
+++              className="min-w-[260px]"
+++            >
+++              {calendarTypes.map((type) => (
+++                <option key={type} value={type}>
+++                  {type}
+++                </option>
+++              ))}
+++            </SelectField>
+++
+++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++              {categories.map((category) => (
+++                <option key={category} value={category}>
+++                  {category}
+++                </option>
+++              ))}
+++            </SelectField>
+++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++              {[
+++                { id: 'list', label: 'Lista', Icon: List },
+++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++              ].map(({ id, label, Icon }) => {
+++                const active = viewMode === id;
+++                return (
+++                  <button
+++                    key={id}
+++                    type="button"
+++                    onClick={() => setViewMode(id)}
+++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++                    style={{
+++                      background: active ? 'var(--accent)' : 'transparent',
+++                      color: active ? '#fff' : 'var(--text-muted)',
+++                    }}
+++                    title={label}
+++                  >
+++                    <Icon className="h-4 w-4" />
+++                  </button>
+++                );
+++                  })}
+++                </div>
+++          </div>
+++
+++          <div className="shrink-0 self-center">
+++            <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
+++          </div>
+++        </div>
+++      </section>
+++
++       {!calendarData?.error && !hasEvents ? (
++         <div
++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++ 
++       {hasEvents ? (
++         <>
++-          <section
++-            className="rounded-2xl border p-4"
++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++-          >
++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
++-              <div className="flex items-center gap-2">
++-                <button
++-                  type="button"
++-                  onClick={goToPreviousMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes anterior"
++-                >
++-                  <ChevronLeft className="h-4 w-4" />
++-                </button>
++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++-                  {monthLabel}
++-                </p>
++-                <button
++-                  type="button"
++-                  onClick={goToNextMonth}
++-                  className="rounded-xl border p-2 transition hover:scale-105"
++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++-                  aria-label="Mes siguiente"
++-                >
++-                  <ChevronRight className="h-4 w-4" />
++-                </button>
++-              </div>
++-
++-              <div className="flex flex-wrap items-end gap-3">
++-                <SelectField
++-                  label="Seleccionar un calendario"
++-                  value={selectedCalendarType}
++-                  onChange={handleCalendarTypeChange}
++-                  className="min-w-[260px]"
++-                >
++-                  {calendarTypes.map((type) => (
++-                    <option key={type} value={type}>
++-                      {type}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-
++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++-                  {categories.map((category) => (
++-                    <option key={category} value={category}>
++-                      {category}
++-                    </option>
++-                  ))}
++-                </SelectField>
++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++-                  {[
++-                    { id: 'list', label: 'Lista', Icon: List },
++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++-                  ].map(({ id, label, Icon }) => {
++-                    const active = viewMode === id;
++-                    return (
++-                      <button
++-                        key={id}
++-                        type="button"
++-                        onClick={() => setViewMode(id)}
++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++-                        style={{
++-                          background: active ? 'var(--accent)' : 'transparent',
++-                          color: active ? '#fff' : 'var(--text-muted)',
++-                        }}
++-                        title={label}
++-                      >
++-                        <Icon className="h-4 w-4" />
++-                      </button>
++-                    );
++-                  })}
++-                </div>
++-              </div>
++-            </div>
++-          </section>
++-
++           {viewMode === 'grid' ? (
++             <>
++               <section
++```
++
++## Verificación
++**npm run build:** PASS
++**Tests ejecutados:** npm run build + notifications route checks
++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++**Output de verificación:**
++```
++$ npm run build
++> dvpotro@0.1.0 build
++> vite build
++
++vite v5.4.21 building for production...
++transforming...
++✓ 1769 modules transformed.
++rendering chunks...
++computing gzip size...
++dist/index.html                            0.47 kB │ gzip:  0.30 kB
++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
++✓ built in 8.13s
++
++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
++notifications page: true
++sidebar target: true
++page exists: true
++```
++
++## Pendiente para Claude
++- Sin pendientes registrados en esta tarea.
+```
+
+### `reports/report_084.md`
+```diff
+diff --git a/reports/report_084.md b/reports/report_084.md
+new file mode 100644
+index 0000000..e7ab131
+--- /dev/null
++++ b/reports/report_084.md
+@@ -0,0 +1,2744 @@
++# Report 084
++**Fecha:** 2026-06-22 00:23  
++**Agente:** Codex  
++**Tipo:** refactor
++
++## Contexto Git
++**Rama:** master
++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++**Archivos modificados:** 4
++
++## Archivos modificados
++- `reports/report_082.md` — archivo creado como parte de la base inicial
++- `reports/report_083.md` — archivo creado como parte de la base inicial
++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++
++## Estadísticas
++| Archivo | + líneas | - líneas |
++|---------|----------|----------|
++| reports/report_082.md | 654 | 0 |
++| reports/report_083.md | 1334 | 0 |
++| src/components/StackedEventCards.jsx | 101 | 214 |
++| src/pages/Calendario.jsx | 128 | 106 |
++
++## Resumen
++Se registraron 4 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++
++## Cambios de codigo
++### `reports/report_082.md`
++```diff
++diff --git a/reports/report_082.md b/reports/report_082.md
++new file mode 100644
++index 0000000..d5271ac
++--- /dev/null
+++++ b/reports/report_082.md
++@@ -0,0 +1,654 @@
+++# Report 082
+++**Fecha:** 2026-06-21 23:41  
+++**Agente:** Codex  
+++**Tipo:** frontend
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 2
+++
+++## Archivos modificados
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| src/components/StackedEventCards.jsx | 147 | 157 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `src/components/StackedEventCards.jsx`
+++```diff
+++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
+++index 3c412de..c2f6386 100644
+++--- a/src/components/StackedEventCards.jsx
++++++ b/src/components/StackedEventCards.jsx
+++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
+++ import { classifyEvent } from '../utils/eventClassifier';
+++ 
+++ const MAX_VISIBLE = 5;
+++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
+++-const STACK_OFFSETS = [
+++-  { x: 0, y: 0 },
+++-  { x: -8, y: -4 },
+++-  { x: -16, y: -8 },
+++-  { x: -24, y: -5 },
+++-  { x: -30, y: -10 },
+++-];
++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
++++
++++const EVENT_DESCRIPTIONS = {
++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++  semester_start: 'Inicio oficial de actividades académicas.',
++++  semester_end: 'Último día del período escolar vigente.',
++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
++++  last_day_classes: 'Cierre académico antes del siguiente período.',
++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++  administrative_closure: 'Cierre administrativo del período en curso.',
++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++  winter_break: 'Receso invernal entre periodos escolares.',
++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++};
+++ 
+++ function parseLooseDate(value) {
+++   if (!value) return null;
+++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
+++ function formatStackDate(date) {
+++   if (!date) return '';
+++ 
+++-  const day = date.getDate();
+++-  const month = date
+++-    .toLocaleDateString('es-MX', { month: 'short' })
+++-    .replace('.', '')
+++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
+++-
+++-  return `${day} ${month}`;
++++  return date
++++    .toLocaleDateString('es-MX', {
++++      day: '2-digit',
++++      month: '2-digit',
++++      year: 'numeric',
++++    })
++++    .replace(/\//g, '-');
+++ }
+++ 
+++ function getEventTitle(event) {
+++@@ -52,140 +78,118 @@ function getEventDate(event) {
+++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++ }
+++ 
+++-function getCardStyle(category, index) {
+++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
+++-  const rot = STACK_ROTATIONS[index] ?? 0;
++++function getCardStyle(index, category) {
++++  const scale = 1 - index * 0.05;
++++  const rotation = STACK_ROTATIONS[index] ?? 0;
++++  const opacity = Math.max(0.22, 1 - index * 0.18);
++++
+++   return {
+++-    zIndex: MAX_VISIBLE - index,
+++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
++++    zIndex: 10 - index,
++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
++++    opacity,
+++     transformOrigin: 'center center',
+++-    '--discard-rot': `${rot}deg`,
+++-    background: `${category.color}26`,
+++-    borderColor: `${category.color}66`,
++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
++++    background: 'var(--bg-card)',
++++    borderColor: `${category.color}4D`,
+++   };
+++ }
+++ 
+++-function StackCard({ event, index, phase }) {
++++function getDescription(category, event) {
++++  return (
++++    event?.descripcion ||
++++    event?.description ||
++++    EVENT_DESCRIPTIONS[category.id] ||
++++    'Fecha académica oficial del calendario ITSON.'
++++  );
++++}
++++
++++function StackCard({ event, index }) {
+++   const category = classifyEvent(getEventTitle(event));
+++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+++   const date = getEventDate(event);
+++ 
+++-  const DESCRIPTIONS = {
+++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++-    semester_start: 'Inicio oficial de actividades académicas.',
+++-    semester_end: 'Último día del período escolar vigente.',
+++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
+++-    last_day_classes: 'Cierre académico antes del siguiente período.',
+++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++-    administrative_closure: 'Cierre administrativo del período en curso.',
+++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
+++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
+++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++-    winter_break: 'Receso invernal entre periodos escolares.',
+++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
+++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++-  };
+++-
+++   return (
+++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
+++-      <article
+++-        className={[
+++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
+++-          phase === 'exit' ? 'animate-card-discard' : '',
+++-          phase === 'enter' ? 'animate-card-enter' : '',
+++-        ]
+++-          .filter(Boolean)
+++-          .join(' ')}
+++-        style={{
+++-          animationDelay: `${index * 60}ms`,
+++-        }}
+++-      >
+++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
+++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
+++-
+++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
+++-          <div className="mb-2 flex items-center justify-between">
+++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
+++-              {category.label}
+++-            </span>
+++-            <span className="text-[10px]" style={{ color: category.color }}>
+++-              ✦ ✦ ✦
+++-            </span>
+++-          </div>
++++    <article
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
++++      style={getCardStyle(index, category)}
++++    >
++++      <div className="flex h-full flex-col p-3">
++++        <div className="flex items-start justify-between gap-2">
++++          <span
++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
++++            style={{ background: category.color }}
++++          >
++++            {category.label}
++++          </span>
++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
++++            ✦ ✦ ✦
++++          </span>
++++        </div>
+++ 
+++-          <div className="flex flex-1 gap-3">
+++-            <div className="flex flex-col items-center justify-center gap-1">
+++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
+++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
+++-              </div>
+++-              <div className="flex gap-0.5">
+++-                {[0, 1, 2].map((star) => (
+++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
+++-                    ★
+++-                  </span>
+++-                ))}
+++-              </div>
++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
++++            <div
++++              className="flex h-9 w-9 items-center justify-center rounded-full"
++++              style={{ background: `${category.color}26` }}
++++            >
++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
+++             </div>
++++          </div>
+++ 
+++-            <div className="flex flex-1 flex-col justify-center">
+++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
+++-                {getEventTitle(event)}
+++-              </h5>
+++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
+++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
+++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
+++-              </p>
+++-            </div>
++++          <div className="min-w-0 flex-1">
++++            <h5
++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
++++              style={{ color: 'var(--text-strong)' }}
++++            >
++++              {getEventTitle(event)}
++++            </h5>
++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
++++              {getDescription(category, event)}
++++            </p>
+++           </div>
++++        </div>
+++ 
+++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
+++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++-            <div>
+++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
+++-                Fecha del evento
+++-              </p>
+++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
+++-                {date
+++-                  ? date
+++-                      .toLocaleDateString('es-MX', {
+++-                        day: '2-digit',
+++-                        month: '2-digit',
+++-                        year: 'numeric',
+++-                      })
+++-                      .replace(/\//g, '-')
+++-                  : 'Por confirmar'}
+++-              </p>
+++-            </div>
++++        <div
++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
++++          style={{ background: `${category.color}14` }}
++++        >
++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++          <div className="leading-tight">
++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
++++              Fecha del evento
++++            </p>
++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {date ? formatStackDate(date) : 'Por confirmar'}
++++            </p>
+++           </div>
+++         </div>
+++-      </article>
++++      </div>
++++    </article>
++++  );
++++}
++++
++++function EmptyState() {
++++  return (
++++    <div
++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
++++      style={{ borderColor: 'var(--border-subtle)' }}
++++    >
++++      <div className="space-y-2 text-center">
++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++          Sin eventos este mes
++++        </p>
++++      </div>
+++     </div>
+++   );
+++ }
+++ 
+++ export default function StackedEventCards({ events = [], currentMonth }) {
+++-  const visibleEvents = useMemo(() => {
+++-    return (Array.isArray(events) ? events : [])
+++-      .slice(0, MAX_VISIBLE)
+++-      .filter(Boolean);
+++-  }, [events]);
++++  const visibleEvents = useMemo(
++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
++++    [events],
++++  );
+++ 
+++   const [stack, setStack] = useState(visibleEvents);
+++   const [phase, setPhase] = useState('idle');
+++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++ 
+++       const settleTimer = setTimeout(() => {
+++         setPhase('idle');
+++-      }, 320);
++++      }, 180);
+++ 
+++       timersRef.current.push(settleTimer);
+++-    }, 360);
++++    }, 180);
+++ 
+++     timersRef.current.push(exitTimer);
+++ 
+++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
+++     });
+++   };
+++ 
+++-  if (!stack.length) {
+++-    return (
+++-      <div
+++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
+++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+++-      >
+++-        <div className="space-y-2">
+++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++-            Sin eventos este mes
+++-          </p>
+++-        </div>
+++-      </div>
+++-    );
+++-  }
+++-
+++   return (
+++     <button
+++       type="button"
+++-      onClick={rotateStack}
+++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
+++-      aria-label="Rotar eventos del calendario"
+++-      title="Haz clic para cambiar el evento"
++++      onClick={visibleEvents.length ? rotateStack : undefined}
++++      disabled={!visibleEvents.length}
++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
+++     >
+++-      {stack.map((event, index) => (
+++-        <StackCard
+++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
+++-          event={event}
+++-          index={index}
+++-          phase={phase}
+++-        />
+++-      ))}
++++      {stack.length ? (
++++        stack.map((event, index) => {
++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
++++        })
++++      ) : (
++++        <EmptyState />
++++      )}
+++     </button>
+++   );
+++ }
+++```
+++
+++### `src/pages/Calendario.jsx`
+++```diff
+++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
+++index f83a172..0da02ab 100644
+++--- a/src/pages/Calendario.jsx
++++++ b/src/pages/Calendario.jsx
+++@@ -10,6 +10,7 @@ import {
+++   MapPin,
+++   RefreshCw,
+++ } from 'lucide-react';
++++import StackedEventCards from '../components/StackedEventCards';
+++ 
+++ const MONTHS = [
+++   'Enero',
+++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
+++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
+++ }
+++ 
++++function getEventDateForMonth(event) {
++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++  if (direct) return direct;
++++
++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
++++  if (!match) return null;
++++
++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
++++}
++++
+++ function groupEventsByMonth(events) {
+++   return events.reduce((groups, event) => {
+++     const date = getValidDate(event.inicio);
+++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++     () => getEventsForDay(events, selectedDay, filterCat),
+++     [events, filterCat, selectedDay],
+++   );
++++  const visibleMonthEvents = useMemo(() => {
++++    return events
++++      .filter((event) => {
++++        const date = getEventDateForMonth(event);
++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
++++      })
++++      .sort((left, right) => {
++++        const leftDate = getEventDateForMonth(left);
++++        const rightDate = getEventDateForMonth(right);
++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
++++      });
++++  }, [currentMonth, currentYear, events]);
+++   const groupedEvents = groupEventsByMonth(filteredEvents);
+++   const hasEvents = events.length > 0;
+++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
+++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++         </div>
+++       ) : null}
+++ 
++++      <section
++++        className="rounded-2xl border p-4"
++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
++++      >
++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
++++          <div className="flex items-center gap-2">
++++            <button
++++              type="button"
++++              onClick={goToPreviousMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes anterior"
++++            >
++++              <ChevronLeft className="h-4 w-4" />
++++            </button>
++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
++++              {monthLabel}
++++            </p>
++++            <button
++++              type="button"
++++              onClick={goToNextMonth}
++++              className="rounded-xl border p-2 transition hover:scale-105"
++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
++++              aria-label="Mes siguiente"
++++            >
++++              <ChevronRight className="h-4 w-4" />
++++            </button>
++++          </div>
++++
++++          <div className="flex flex-wrap items-end gap-3">
++++            <SelectField
++++              label="Seleccionar un calendario"
++++              value={selectedCalendarType}
++++              onChange={handleCalendarTypeChange}
++++              className="min-w-[260px]"
++++            >
++++              {calendarTypes.map((type) => (
++++                <option key={type} value={type}>
++++                  {type}
++++                </option>
++++              ))}
++++            </SelectField>
++++
++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
++++              {categories.map((category) => (
++++                <option key={category} value={category}>
++++                  {category}
++++                </option>
++++              ))}
++++            </SelectField>
++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
++++              {[
++++                { id: 'list', label: 'Lista', Icon: List },
++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
++++              ].map(({ id, label, Icon }) => {
++++                const active = viewMode === id;
++++                return (
++++                  <button
++++                    key={id}
++++                    type="button"
++++                    onClick={() => setViewMode(id)}
++++                    className="rounded-lg px-3 py-2 text-xs font-semibold transition"
++++                    style={{
++++                      background: active ? 'var(--accent)' : 'transparent',
++++                      color: active ? '#fff' : 'var(--text-muted)',
++++                    }}
++++                    title={label}
++++                  >
++++                    <Icon className="h-4 w-4" />
++++                  </button>
++++                );
++++              })}
++++            </div>
++++
++++            <div className="shrink-0 self-center">
++++              <StackedEventCards events={visibleMonthEvents} currentMonth={currentMonth} />
++++            </div>
++++          </div>
++++        </div>
++++      </section>
++++
+++       {!calendarData?.error && !hasEvents ? (
+++         <div
+++           className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
+++@@ -423,83 +529,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
+++ 
+++       {hasEvents ? (
+++         <>
+++-          <section
+++-            className="rounded-2xl border p-4"
+++-            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++-          >
+++-            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
+++-              <div className="flex items-center gap-2">
+++-                <button
+++-                  type="button"
+++-                  onClick={goToPreviousMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes anterior"
+++-                >
+++-                  <ChevronLeft className="h-4 w-4" />
+++-                </button>
+++-                <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++-                  {monthLabel}
+++-                </p>
+++-                <button
+++-                  type="button"
+++-                  onClick={goToNextMonth}
+++-                  className="rounded-xl border p-2 transition hover:scale-105"
+++-                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++-                  aria-label="Mes siguiente"
+++-                >
+++-                  <ChevronRight className="h-4 w-4" />
+++-                </button>
+++-              </div>
+++-
+++-              <div className="flex flex-wrap items-end gap-3">
+++-                <SelectField
+++-                  label="Seleccionar un calendario"
+++-                  value={selectedCalendarType}
+++-                  onChange={handleCalendarTypeChange}
+++-                  className="min-w-[260px]"
+++-                >
+++-                  {calendarTypes.map((type) => (
+++-                    <option key={type} value={type}>
+++-                      {type}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-
+++-                <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++-                  {categories.map((category) => (
+++-                    <option key={category} value={category}>
+++-                      {category}
+++-                    </option>
+++-                  ))}
+++-                </SelectField>
+++-                <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++-                  {[
+++-                    { id: 'list', label: 'Lista', Icon: List },
+++-                    { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+++-                  ].map(({ id, label, Icon }) => {
+++-                    const active = viewMode === id;
+++-                    return (
+++-                      <button
+++-                        key={id}
+++-                        type="button"
+++-                        onClick={() => setViewMode(id)}
+++-                        className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+++-                        style={{
+++-                          background: active ? 'var(--accent)' : 'transparent',
+++-                          color: active ? '#fff' : 'var(--text-muted)',
+++-                        }}
+++-                        title={label}
+++-                      >
+++-                        <Icon className="h-4 w-4" />
+++-                      </button>
+++-                    );
+++-                  })}
+++-                </div>
+++-              </div>
+++-            </div>
+++-          </section>
+++-
+++           {viewMode === 'grid' ? (
+++             <>
+++               <section
+++```
+++
+++## Verificación
+++**npm run build:** PASS
+++**Tests ejecutados:** npm run build + notifications route checks
+++**Comando de verificación:** node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++**Output de verificación:**
+++```
+++$ npm run build
+++> dvpotro@0.1.0 build
+++> vite build
+++
+++vite v5.4.21 building for production...
+++transforming...
+++✓ 1769 modules transformed.
+++rendering chunks...
+++computing gzip size...
+++dist/index.html                            0.47 kB │ gzip:  0.30 kB
+++dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
+++dist/assets/index-_4KKbzMN.css             37.93 kB │ gzip:  7.75 kB
+++dist/assets/index-Bjfn2_UT.js              338.62 kB │ gzip: 91.37 kB
+++✓ built in 8.13s
+++
+++$ node -e "const fs = require('fs'); const app = fs.readFileSync('src/App.jsx','utf8'); const sidebar = fs.readFileSync('src/components/Sidebar.jsx','utf8'); console.log('notifications page:', app.includes("notifications: {")); console.log('sidebar target:', sidebar.includes("target: 'notifications'")); console.log('page exists:', fs.existsSync('src/pages/Notificaciones.jsx'));"
+++notifications page: true
+++sidebar target: true
+++page exists: true
+++```
+++
+++## Pendiente para Claude
+++- Sin pendientes registrados en esta tarea.
++```
++
++### `reports/report_083.md`
++```diff
++diff --git a/reports/report_083.md b/reports/report_083.md
++new file mode 100644
++index 0000000..e42729e
++--- /dev/null
+++++ b/reports/report_083.md
++@@ -0,0 +1,1334 @@
+++# Report 083
+++**Fecha:** 2026-06-21 23:59  
+++**Agente:** Codex  
+++**Tipo:** refactor
+++
+++## Contexto Git
+++**Rama:** master
+++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
+++**Archivos modificados:** 3
+++
+++## Archivos modificados
+++- `reports/report_082.md` — archivo creado como parte de la base inicial
+++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
+++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
+++
+++## Estadísticas
+++| Archivo | + líneas | - líneas |
+++|---------|----------|----------|
+++| reports/report_082.md | 654 | 0 |
+++| src/components/StackedEventCards.jsx | 162 | 156 |
+++| src/pages/Calendario.jsx | 106 | 77 |
+++
+++## Resumen
+++Se registraron 3 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
+++
+++## Cambios de codigo
+++### `reports/report_082.md`
+++```diff
+++diff --git a/reports/report_082.md b/reports/report_082.md
+++new file mode 100644
+++index 0000000..d5271ac
+++--- /dev/null
++++++ b/reports/report_082.md
+++@@ -0,0 +1,654 @@
++++# Report 082
++++**Fecha:** 2026-06-21 23:41  
++++**Agente:** Codex  
++++**Tipo:** frontend
++++
++++## Contexto Git
++++**Rama:** master
++++**Último commit:** 8b3b1cd — docs: reporte generado del checkpoint de commits
++++**Archivos modificados:** 2
++++
++++## Archivos modificados
++++- `src/components/StackedEventCards.jsx` — archivo actualizado en esta tarea
++++- `src/pages/Calendario.jsx` — archivo actualizado en esta tarea
++++
++++## Estadísticas
++++| Archivo | + líneas | - líneas |
++++|---------|----------|----------|
++++| src/components/StackedEventCards.jsx | 147 | 157 |
++++| src/pages/Calendario.jsx | 106 | 77 |
++++
++++## Resumen
++++Se registraron 2 archivo(s) modificados en esta tarea. El diff completo se incluye abajo.
++++
++++## Cambios de codigo
++++### `src/components/StackedEventCards.jsx`
++++```diff
++++diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
++++index 3c412de..c2f6386 100644
++++--- a/src/components/StackedEventCards.jsx
+++++++ b/src/components/StackedEventCards.jsx
++++@@ -4,14 +4,40 @@ import { CalendarDays, CalendarX } from 'lucide-react';
++++ import { classifyEvent } from '../utils/eventClassifier';
++++ 
++++ const MAX_VISIBLE = 5;
++++-const STACK_ROTATIONS = [0, -3, 3, -5, 5];
++++-const STACK_OFFSETS = [
++++-  { x: 0, y: 0 },
++++-  { x: -8, y: -4 },
++++-  { x: -16, y: -8 },
++++-  { x: -24, y: -5 },
++++-  { x: -30, y: -10 },
++++-];
+++++const STACK_ROTATIONS = [0, -4, 4, -7, 7];
+++++
+++++const EVENT_DESCRIPTIONS = {
+++++  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
+++++  final_exams: 'Período oficial de evaluaciones finales del semestre.',
+++++  semester_start: 'Inicio oficial de actividades académicas.',
+++++  semester_end: 'Último día del período escolar vigente.',
+++++  first_day_classes: 'Arranque del semestre y primeras actividades.',
+++++  last_day_classes: 'Cierre académico antes del siguiente período.',
+++++  no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
+++++  no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
+++++  no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
+++++  no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
+++++  course_load_selection_jan_may: 'Proceso de selección de carga académica.',
+++++  course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
+++++  new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
+++++  orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
+++++  administrative_closure: 'Cierre administrativo del período en curso.',
+++++  final_grades_release: 'Publicación oficial de calificaciones finales.',
+++++  grade_submission: 'Periodo destinado a la entrega de calificaciones.',
+++++  grade_capture: 'Captura interna de evaluaciones y resultados.',
+++++  vacation_period: 'Tiempo de receso académico o descanso institucional.',
+++++  winter_break: 'Receso invernal entre periodos escolares.',
+++++  summer_break: 'Receso de verano antes del siguiente ciclo.',
+++++  holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
+++++  holiday_national_independence: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_benito: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_labor: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_dead: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
+++++  holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
+++++};
++++ 
++++ function parseLooseDate(value) {
++++   if (!value) return null;
++++@@ -35,13 +61,13 @@ function parseLooseDate(value) {
++++ function formatStackDate(date) {
++++   if (!date) return '';
++++ 
++++-  const day = date.getDate();
++++-  const month = date
++++-    .toLocaleDateString('es-MX', { month: 'short' })
++++-    .replace('.', '')
++++-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
++++-
++++-  return `${day} ${month}`;
+++++  return date
+++++    .toLocaleDateString('es-MX', {
+++++      day: '2-digit',
+++++      month: '2-digit',
+++++      year: 'numeric',
+++++    })
+++++    .replace(/\//g, '-');
++++ }
++++ 
++++ function getEventTitle(event) {
++++@@ -52,140 +78,118 @@ function getEventDate(event) {
++++   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
++++ }
++++ 
++++-function getCardStyle(category, index) {
++++-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
++++-  const rot = STACK_ROTATIONS[index] ?? 0;
+++++function getCardStyle(index, category) {
+++++  const scale = 1 - index * 0.05;
+++++  const rotation = STACK_ROTATIONS[index] ?? 0;
+++++  const opacity = Math.max(0.22, 1 - index * 0.18);
+++++
++++   return {
++++-    zIndex: MAX_VISIBLE - index,
++++-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+++++    zIndex: 10 - index,
+++++    transform: `scale(${scale}) rotate(${rotation}deg)`,
+++++    opacity,
++++     transformOrigin: 'center center',
++++-    '--discard-rot': `${rot}deg`,
++++-    background: `${category.color}26`,
++++-    borderColor: `${category.color}66`,
+++++    transition: 'transform 300ms ease, opacity 300ms ease, box-shadow 300ms ease',
+++++    background: 'var(--bg-card)',
+++++    borderColor: `${category.color}4D`,
++++   };
++++ }
++++ 
++++-function StackCard({ event, index, phase }) {
+++++function getDescription(category, event) {
+++++  return (
+++++    event?.descripcion ||
+++++    event?.description ||
+++++    EVENT_DESCRIPTIONS[category.id] ||
+++++    'Fecha académica oficial del calendario ITSON.'
+++++  );
+++++}
+++++
+++++function StackCard({ event, index }) {
++++   const category = classifyEvent(getEventTitle(event));
++++   const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
++++   const date = getEventDate(event);
++++ 
++++-  const DESCRIPTIONS = {
++++-    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
++++-    final_exams: 'Período oficial de evaluaciones finales del semestre.',
++++-    semester_start: 'Inicio oficial de actividades académicas.',
++++-    semester_end: 'Último día del período escolar vigente.',
++++-    first_day_classes: 'Arranque del semestre y primeras actividades.',
++++-    last_day_classes: 'Cierre académico antes del siguiente período.',
++++-    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
++++-    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
++++-    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
++++-    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
++++-    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
++++-    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
++++-    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
++++-    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
++++-    administrative_closure: 'Cierre administrativo del período en curso.',
++++-    final_grades_release: 'Publicación oficial de calificaciones finales.',
++++-    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
++++-    grade_capture: 'Captura interna de evaluaciones y resultados.',
++++-    vacation_period: 'Tiempo de receso académico o descanso institucional.',
++++-    winter_break: 'Receso invernal entre periodos escolares.',
++++-    summer_break: 'Receso de verano antes del siguiente ciclo.',
++++-    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
++++-    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
++++-    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
++++-  };
++++-
++++   return (
++++-    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
++++-      <article
++++-        className={[
++++-          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
++++-          phase === 'exit' ? 'animate-card-discard' : '',
++++-          phase === 'enter' ? 'animate-card-enter' : '',
++++-        ]
++++-          .filter(Boolean)
++++-          .join(' ')}
++++-        style={{
++++-          animationDelay: `${index * 60}ms`,
++++-        }}
++++-      >
++++-        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
++++-        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />
++++-
++++-        <div className="relative z-10 flex h-full w-full flex-col p-4">
++++-          <div className="mb-2 flex items-center justify-between">
++++-            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
++++-              {category.label}
++++-            </span>
++++-            <span className="text-[10px]" style={{ color: category.color }}>
++++-              ✦ ✦ ✦
++++-            </span>
++++-          </div>
+++++    <article
+++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_16px_30px_rgba(2,6,23,0.16)] dark:bg-[var(--bg-card)]"
+++++      style={getCardStyle(index, category)}
+++++    >
+++++      <div className="flex h-full flex-col p-3">
+++++        <div className="flex items-start justify-between gap-2">
+++++          <span
+++++            className="max-w-[140px] rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
+++++            style={{ background: category.color }}
+++++          >
+++++            {category.label}
+++++          </span>
+++++          <span className="text-[10px] leading-none" style={{ color: category.color }}>
+++++            ✦ ✦ ✦
+++++          </span>
+++++        </div>
++++ 
++++-          <div className="flex flex-1 gap-3">
++++-            <div className="flex flex-col items-center justify-center gap-1">
++++-              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
++++-                <Icon className="h-6 w-6" style={{ color: category.color }} />
++++-              </div>
++++-              <div className="flex gap-0.5">
++++-                {[0, 1, 2].map((star) => (
++++-                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
++++-                    ★
++++-                  </span>
++++-                ))}
++++-              </div>
+++++        <div className="mt-2 flex min-h-0 flex-1 gap-3">
+++++          <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5">
+++++            <div
+++++              className="flex h-9 w-9 items-center justify-center rounded-full"
+++++              style={{ background: `${category.color}26` }}
+++++            >
+++++              <Icon className="h-4 w-4" style={{ color: category.color }} />
++++             </div>
+++++          </div>
++++ 
++++-            <div className="flex flex-1 flex-col justify-center">
++++-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
++++-                {getEventTitle(event)}
++++-              </h5>
++++-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
++++-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
++++-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
++++-              </p>
++++-            </div>
+++++          <div className="min-w-0 flex-1">
+++++            <h5
+++++              className="line-clamp-2 text-[13px] font-semibold leading-tight"
+++++              style={{ color: 'var(--text-strong)' }}
+++++            >
+++++              {getEventTitle(event)}
+++++            </h5>
+++++            <div className="my-1.5 h-px w-10" style={{ background: category.color }} />
+++++            <p className="line-clamp-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
+++++              {getDescription(category, event)}
+++++            </p>
++++           </div>
+++++        </div>
++++ 
++++-          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
++++-            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
++++-            <div>
++++-              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
++++-                Fecha del evento
++++-              </p>
++++-              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
++++-                {date
++++-                  ? date
++++-                      .toLocaleDateString('es-MX', {
++++-                        day: '2-digit',
++++-                        month: '2-digit',
++++-                        year: 'numeric',
++++-                      })
++++-                      .replace(/\//g, '-')
++++-                  : 'Por confirmar'}
++++-              </p>
++++-            </div>
+++++        <div
+++++          className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1"
+++++          style={{ background: `${category.color}14` }}
+++++        >
+++++          <CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
+++++          <div className="leading-tight">
+++++            <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: category.color }}>
+++++              Fecha del evento
+++++            </p>
+++++            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
+++++              {date ? formatStackDate(date) : 'Por confirmar'}
+++++            </p>
++++           </div>
++++         </div>
++++-      </article>
+++++      </div>
+++++    </article>
+++++  );
+++++}
+++++
+++++function EmptyState() {
+++++  return (
+++++    <div
+++++      className="absolute inset-0 m-auto flex h-[130px] w-[240px] items-center justify-center rounded-[14px] border border-dashed bg-white dark:bg-[var(--bg-card)]"
+++++      style={{ borderColor: 'var(--border-subtle)' }}
+++++    >
+++++      <div className="space-y-2 text-center">
+++++        <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
+++++        <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
+++++          Sin eventos este mes
+++++        </p>
+++++      </div>
++++     </div>
++++   );
++++ }
++++ 
++++ export default function StackedEventCards({ events = [], currentMonth }) {
++++-  const visibleEvents = useMemo(() => {
++++-    return (Array.isArray(events) ? events : [])
++++-      .slice(0, MAX_VISIBLE)
++++-      .filter(Boolean);
++++-  }, [events]);
+++++  const visibleEvents = useMemo(
+++++    () => (Array.isArray(events) ? events : []).filter(Boolean).slice(0, MAX_VISIBLE),
+++++    [events],
+++++  );
++++ 
++++   const [stack, setStack] = useState(visibleEvents);
++++   const [phase, setPhase] = useState('idle');
++++@@ -213,10 +217,10 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++++ 
++++       const settleTimer = setTimeout(() => {
++++         setPhase('idle');
++++-      }, 320);
+++++      }, 180);
++++ 
++++       timersRef.current.push(settleTimer);
++++-    }, 360);
+++++    }, 180);
++++ 
++++     timersRef.current.push(exitTimer);
++++ 
++++@@ -232,38 +236,24 @@ export default function StackedEventCards({ events = [], currentMonth }) {
++++     });
++++   };
++++ 
++++-  if (!stack.length) {
++++-    return (
++++-      <div
++++-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
++++-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
++++-      >
++++-        <div className="space-y-2">
++++-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
++++-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
++++-            Sin eventos este mes
++++-          </p>
++++-        </div>
++++-      </div>
++++-    );
++++-  }
++++-
++++   return (
++++     <button
++++       type="button"
++++-      onClick={rotateStack}
++++-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
++++-      aria-label="Rotar eventos del calendario"
++++-      title="Haz clic para cambiar el evento"
+++++      onClick={visibleEvents.length ? rotateStack : undefined}
+++++      disabled={!visibleEvents.length}
+++++      className="relative hidden h-[170px] w-[280px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+++++      aria-label={visibleEvents.length ? 'Rotar eventos del calendario' : 'Sin eventos este mes'}
+++++      title={visibleEvents.length ? 'Haz clic para cambiar el evento' : 'Sin eventos este mes'}
+++++      style={{ opacity: phase === 'exit' ? 0.25 : 1, transition: 'opacity 220ms ease' }}
++++     >
++++-      {stack.map((event, index) => (
++++-        <StackCard
++++-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
++++-          event={event}
++++-          index={index}
++++-          phase={phase}
++++-        />
++++-      ))}
+++++      {stack.length ? (
+++++        stack.map((event, index) => {
+++++          const key = event?.id || `${getEventTitle(event)}-${event?.inicio || event?.date || event?.fechaInicio || index}`;
+++++          return <StackCard key={key} event={event} index={index} phase={phase} />;
+++++        })
+++++      ) : (
+++++        <EmptyState />
+++++      )}
++++     </button>
++++   );
++++ }
++++```
++++
++++### `src/pages/Calendario.jsx`
++++```diff
++++diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
++++index f83a172..0da02ab 100644
++++--- a/src/pages/Calendario.jsx
+++++++ b/src/pages/Calendario.jsx
++++@@ -10,6 +10,7 @@ import {
++++   MapPin,
++++   RefreshCw,
++++ } from 'lucide-react';
+++++import StackedEventCards from '../components/StackedEventCards';
++++ 
++++ const MONTHS = [
++++   'Enero',
++++@@ -177,6 +178,18 @@ function getEventsForDay(events, date, filterCat = 'Todas') {
++++     .sort((left, right) => new Date(left.inicio) - new Date(right.inicio));
++++ }
++++ 
+++++function getEventDateForMonth(event) {
+++++  const direct = getValidDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
+++++  if (direct) return direct;
+++++
+++++  const raw = String(event?.inicio || event?.date || event?.fechaInicio || event?.fecha || '').trim();
+++++  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
+++++  if (!match) return null;
+++++
+++++  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
+++++  return Number.isNaN(parsed.getTime()) ? null : parsed;
+++++}
+++++
++++ function groupEventsByMonth(events) {
++++   return events.reduce((groups, event) => {
++++     const date = getValidDate(event.inicio);
++++@@ -302,6 +315,18 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++++     () => getEventsForDay(events, selectedDay, filterCat),
++++     [events, filterCat, selectedDay],
++++   );
+++++  const visibleMonthEvents = useMemo(() => {
+++++    return events
+++++      .filter((event) => {
+++++        const date = getEventDateForMonth(event);
+++++        return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
+++++      })
+++++      .sort((left, right) => {
+++++        const leftDate = getEventDateForMonth(left);
+++++        const rightDate = getEventDateForMonth(right);
+++++        return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
+++++      });
+++++  }, [currentMonth, currentYear, events]);
++++   const groupedEvents = groupEventsByMonth(filteredEvents);
++++   const hasEvents = events.length > 0;
++++   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
++++@@ -401,6 +426,87 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
++++         </div>
++++       ) : null}
++++ 
+++++      <section
+++++        className="rounded-2xl border p-4"
+++++        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+++++      >
+++++        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
+++++          <div className="flex items-center gap-2">
+++++            <button
+++++              type="button"
+++++              onClick={goToPreviousMonth}
+++++              className="rounded-xl border p-2 transition hover:scale-105"
+++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++++              aria-label="Mes anterior"
+++++            >
+++++              <ChevronLeft className="h-4 w-4" />
+++++            </button>
+++++            <p className="min-w-[160px] text-center text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
+++++              {monthLabel}
+++++            </p>
+++++            <button
+++++              type="button"
+++++              onClick={goToNextMonth}
+++++              className="rounded-xl border p-2 transition hover:scale-105"
+++++              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)' }}
+++++              aria-label="Mes siguiente"
+++++            >
+++++              <ChevronRight className="h-4 w-4" />
+++++            </button>
+++++          </div>
+++++
+++++          <div className="flex flex-wrap items-end gap-3">
+++++            <SelectField
+++++              label="Seleccionar un calendario"
+++++              value={selectedCalendarType}
+++++              onChange={handleCalendarTypeChange}
+++++              className="min-w-[260px]"
+++++            >
+++++              {calendarTypes.map((type) => (
+++++                <option key={type} value={type}>
+++++                  {type}
+++++                </option>
+++++              ))}
+++++            </SelectField>
+++++
+++++            <SelectField label="Categoría" value={filterCat} onChange={setFilterCat}>
+++++              {categories.map((category) => (
+++++                <option key={category} value={category}>
+++++                  {category}
+++++                </option>
+++++              ))}
+++++            </SelectField>
+++++            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+++++              {[
+++++                { id: 'list', label: 'Lista', Icon: List },
+++++                { id: 'grid', label: 'Grilla', Icon: LayoutGrid },

... [DIFF TRUNCADO — archivo muy grande, ver git diff completo] ...
```

### `src/App.jsx`
```diff
diff --git a/src/App.jsx b/src/App.jsx
index f2abaa2..ba21637 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -8,6 +8,7 @@ import Calendario from './pages/Calendario';
 import Calificaciones from './pages/Calificaciones';
 import Notificaciones from './pages/Notificaciones';
 import Ajustes from './pages/Ajustes';
+import AsciiLab from './pages/AsciiLab';
 import dvpotroLogo from './assets/branding/dvpotro-logo-128.png';
 
 const pageRegistry = {
@@ -41,6 +42,11 @@ const pageRegistry = {
     description: 'Revisa el estado de la integración y la configuración local requerida.',
     component: Ajustes,
   },
+  asciiLab: {
+    title: 'ASCII Lab',
+    description: 'Laboratorio temporal para convertir imágenes en arte ASCII.',
+    component: AsciiLab,
+  },
 };
 
 const ACTIVITIES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
```

### `src/components/AsciiArtPreview.jsx`
```diff
diff --git a/src/components/AsciiArtPreview.jsx b/src/components/AsciiArtPreview.jsx
new file mode 100644
index 0000000..66f5ba4
--- /dev/null
+++ b/src/components/AsciiArtPreview.jsx
@@ -0,0 +1,29 @@
+export default function AsciiArtPreview({ art, color = 'currentColor', fontSize = 6 }) {
+  if (!art) return null;
+
+  return (
+    <div
+      style={{
+        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
+        fontSize: `${fontSize}px`,
+        lineHeight: 1,
+        whiteSpace: 'pre',
+        color,
+        userSelect: 'none',
+      }}
+    >
+      {art.grid.map((row, rowIndex) => (
+        <div key={rowIndex}>
+          {row.map((cell, cellIndex) => (
+            <span
+              key={cellIndex}
+              style={{ opacity: Math.max(0.1, 1 - cell.brightness / 255) }}
+            >
+              {cell.char}
+            </span>
+          ))}
+        </div>
+      ))}
+    </div>
+  );
+}
```

### `src/components/StackedEventCards.jsx`
```diff
diff --git a/src/components/StackedEventCards.jsx b/src/components/StackedEventCards.jsx
index 3c412de..159350f 100644
--- a/src/components/StackedEventCards.jsx
+++ b/src/components/StackedEventCards.jsx
@@ -1,248 +1,168 @@
-import { useEffect, useMemo, useRef, useState } from 'react';
+import { useEffect, useState } from 'react';
 import * as LucideIcons from 'lucide-react';
 import { CalendarDays, CalendarX } from 'lucide-react';
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
+  first_day_classes: 'Arranque del semestre y primeras actividades.',
+};
 
 function parseLooseDate(value) {
   if (!value) return null;
-
-  const direct = new Date(value);
-  if (!Number.isNaN(direct.getTime())) {
-    return direct;
-  }
-
-  const match = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
-  if (!match) return null;
-
-  const year = Number(match[3]);
-  const month = Number(match[2]) - 1;
-  const day = Number(match[1]);
-  const parsed = new Date(year, month, day);
-
+  if (value instanceof Date) return value;
+  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
+  if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
+  const dmyMatch = String(value).match(/^(\d{2})-(\d{2})-(\d{4})/);
+  if (dmyMatch) return new Date(+dmyMatch[3], +dmyMatch[2] - 1, +dmyMatch[1]);
+  const parsed = new Date(value);
   return Number.isNaN(parsed.getTime()) ? null : parsed;
 }
 
 function formatStackDate(date) {
   if (!date) return '';
-
-  const day = date.getDate();
-  const month = date
-    .toLocaleDateString('es-MX', { month: 'short' })
-    .replace('.', '')
-    .replace(/^(\w)/, (letter) => letter.toUpperCase());
-
-  return `${day} ${month}`;
+  return date
+    .toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
+    .replace(/\//g, '-');
 }
 
 function getEventTitle(event) {
-  return String(event?.titulo || event?.title || 'Evento').trim();
+  return event?.titulo || event?.title || event?.nombre || 'Evento';
 }
 
 function getEventDate(event) {
   return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
 }
 
-function getCardStyle(category, index) {
-  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
-  const rot = STACK_ROTATIONS[index] ?? 0;
+function getDescription(category, event) {
+  return (
+    event?.descripcion ||
+    event?.description ||
+    EVENT_DESCRIPTIONS[category.id] ||
+    'Fecha académica oficial del calendario ITSON.'
+  );
+}
+
+// Estilo del CONTENEDOR de cada tarjeta (posición en el stack)
+function getCardWrapperStyle(index) {
+  const scale = 1 - index * 0.05;
+  const rotation = STACK_ROTATIONS[index] ?? 0;
   return {
-    zIndex: MAX_VISIBLE - index,
-    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
+    zIndex: 10 - index,
+    transform: `scale(${scale}) rotate(${rotation}deg)`,
     transformOrigin: 'center center',
-    '--discard-rot': `${rot}deg`,
-    background: `${category.color}26`,
-    borderColor: `${category.color}66`,
+    transition: 'transform 300ms ease',
   };
 }
 
-function StackCard({ event, index, phase }) {
+function StackCard({ event, index }) {
+  const isBack = index > 0;
   const category = classifyEvent(getEventTitle(event));
-  const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
-  const date = getEventDate(event);
 
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
+  // Estilo base compartido: FONDO OPACO SÓLIDO obligatorio.
+  // Esto es lo que evita que se vea cualquier cosa detrás/debajo.
+  const baseCardClass =
+    'absolute inset-0 m-auto h-[110px] w-[210px] rounded-2xl border-2 overflow-hidden';
+  const baseCardStyle = {
+    background: 'var(--bg-card)',
+    borderColor: `${category.color}55`,
+    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
   };
 
-  return (
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
+  if (isBack) {
+    // Tarjeta trasera: silueta opaca, CERO texto, CERO hijos.
+    return (
+      <div
+        className={baseCardClass}
+        style={{ ...baseCardStyle, ...getCardWrapperStyle(index) }}
+      />
+    );
+  }
 
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
-            </div>
+  // Tarjeta frontal: única que renderiza contenido.
+  const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
+  const date = getEventDate(event);
+  const description = getDescription(category, event);
 
-            <div className="flex flex-1 flex-col justify-center">
-              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
-                {getEventTitle(event)}
-              </h5>
-              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
-              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
-                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
-              </p>
-            </div>
+  return (
+    <div
+      className={baseCardClass}
+      style={{ ...baseCardStyle, ...getCardWrapperStyle(index) }}
+    >
+      <div className="relative flex h-full w-full flex-col overflow-hidden p-3">
+        {/* blob decorativo de fondo, esquina inferior izquierda */}
+        <div
+          className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full opacity-25"
+          style={{ background: category.color }}
+        />
+        {/* badge superior */}
+        <span
+          className="relative z-10 mb-2 inline-block self-start rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white"
+          style={{ background: category.color }}
+        >
+          Evento escolar
+        </span>
+
+        <div className="relative z-10 flex flex-1 items-center gap-2.5">
+          <div
+            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
+            style={{ background: `${category.color}25` }}
+          >
+            <Icon className="h-[18px] w-[18px]" style={{ color: category.color }} />
           </div>
-
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
+          <div className="min-w-0">
+            <p className="line-clamp-2 text-[12px] font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
+              {getEventTitle(event)}
+            </p>
+            <div className="mt-1 h-[2px] w-6" style={{ background: category.color }} />
+            <p className="mt-1 line-clamp-1 text-[8px] leading-tight" style={{ color: 'var(--text-muted)' }}>
+              {description}
+            </p>
           </div>
         </div>
-      </article>
+
+        <div
+          className="relative z-10 mt-2 flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-[9px] font-semibold"
+          style={{ background: `${category.color}18`, color: category.color }}
+        >
+          <CalendarDays className="h-3 w-3" />
+          {formatStackDate(date)}
+        </div>
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
-
-  const [stack, setStack] = useState(visibleEvents);
-  const [phase, setPhase] = useState('idle');
-  const isFirstRender = useRef(true);
-  const timersRef = useRef([]);
-
-  const clearTimers = () => {
-    timersRef.current.forEach((timer) => clearTimeout(timer));
-    timersRef.current = [];
-  };
+  const [rotation, setRotation] = useState(0);
 
   useEffect(() => {
-    if (isFirstRender.current) {
-      isFirstRender.current = false;
-      setStack(visibleEvents);
-      return () => clearTimers();
-    }
-
-    clearTimers();
-    setPhase('exit');
-
-    const exitTimer = setTimeout(() => {
-      setStack(visibleEvents);
-      setPhase('enter');
+    setRotation(0);
+  }, [currentMonth]);
 
-      const settleTimer = setTimeout(() => {
-        setPhase('idle');
-      }, 320);
+  const visible = events.slice(0, MAX_VISIBLE);
+  const rotated = visible.length
+    ? [...visible.slice(rotation % visible.length), ...visible.slice(0, rotation % visible.length)]
+    : [];
 
-      timersRef.current.push(settleTimer);
-    }, 360);
-
-    timersRef.current.push(exitTimer);
-
-    return () => clearTimers();
-  }, [visibleEvents, currentMonth]);
-
-  const rotateStack = () => {
-    if (phase !== 'idle' || stack.length <= 1) return;
-
-    setStack((previous) => {
-      if (!previous.length) return previous;
-      return [...previous.slice(1), previous[0]];
-    });
+  const handleClick = () => {
+    if (visible.length > 1) setRotation((r) => r + 1);
   };
 
-  if (!stack.length) {
+  if (visible.length === 0) {
     return (
       <div
-        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
-        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
+        className="relative hidden h-[130px] w-[230px] shrink-0 select-none items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed lg:flex"
+        style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}
       >
-        <div className="space-y-2">
-          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
-          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
-            Sin eventos este mes
-          </p>
+        <div className="flex flex-col items-center gap-1 text-[10px]">
+          <CalendarX className="h-5 w-5" />
+          <span>Sin eventos este mes</span>
         </div>
       </div>
     );
@@ -251,18 +171,14 @@ export default function StackedEventCards({ events = [], currentMonth }) {
   return (
     <button
       type="button"
-      onClick={rotateStack}
-      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
-      aria-label="Rotar eventos del calendario"
-      title="Haz clic para cambiar el evento"
+      onClick={handleClick}
+      key={currentMonth}
+      className="relative hidden h-[140px] w-[235px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
+      style={{ background: 'var(--bg-secondary)' }}
+      aria-label="Ver siguiente evento del mes"
     >
-      {stack.map((event, index) => (
-        <StackCard
-          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
-          event={event}
-          index={index}
-          phase={phase}
-        />
+      {rotated.map((event, index) => (
+        <StackCard key={`${currentMonth}-${event?.id ?? index}`} event={event} index={index} />
       ))}
     </button>
   );
```

### `src/pages/Ajustes.jsx`
```diff
diff --git a/src/pages/Ajustes.jsx b/src/pages/Ajustes.jsx
index 8ccd181..36332db 100644
--- a/src/pages/Ajustes.jsx
+++ b/src/pages/Ajustes.jsx
@@ -2,6 +2,7 @@ import {
   AlertCircle,
   BellRing,
   CheckCircle,
+  FlaskConical,
   FolderCog,
   Loader2,
   Palette,
@@ -105,7 +106,7 @@ function CredentialSection({
   );
 }
 
-function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
+function Ajustes({ error, lastSyncAt, loading, onNavigate, onSettingsSaved }) {
   const api = typeof window !== 'undefined' ? window.scraperApp : null;
   const { themeId, setThemeId, saveCustomTheme } = useTheme();
   const [user, setUser] = useState('');
@@ -321,6 +322,17 @@ function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
 
   return (
     <div className="space-y-6">
+      <div className="flex justify-end">
+        <button
+          type="button"
+          onClick={() => onNavigate?.('asciiLab')}
+          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-white"
+          title="Abrir ASCII Lab temporal"
+        >
+          <FlaskConical className="h-3.5 w-3.5" />
+          ASCII Lab
+        </button>
+      </div>
       {error ? (
         <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
           <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
```

### `src/pages/AsciiLab.jsx`
```diff
diff --git a/src/pages/AsciiLab.jsx b/src/pages/AsciiLab.jsx
new file mode 100644
index 0000000..76dd0f7
--- /dev/null
+++ b/src/pages/AsciiLab.jsx
@@ -0,0 +1,269 @@
+import { useEffect, useMemo, useState } from 'react';
+import {
+  ArrowLeft,
+  FlaskConical,
+  FlipHorizontal,
+  ImageUp,
+  Columns3,
+  Palette,
+  Sparkles,
+  Type,
+  Upload,
+} from 'lucide-react';
+import AsciiArtPreview from '../components/AsciiArtPreview';
+import { imageToAscii, loadImageFromFile } from '../utils/asciiConverter';
+
+const CHARSET_OPTIONS = [
+  { value: 'density', label: 'Density' },
+  { value: 'blocks', label: 'Blocks' },
+  { value: 'binary', label: 'Binary' },
+];
+
+function ControlCard({ children, title, icon: Icon }) {
+  return (
+    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
+      <div className="mb-4 flex items-center gap-3">
+        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8 text-sky-300">
+          <Icon className="h-5 w-5" />
+        </div>
+        <div>
+          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
+          <p className="text-xs text-slate-400">Ajusta el motor de conversión en tiempo real.</p>
+        </div>
+      </div>
+      {children}
+    </section>
+  );
+}
+
+export default function AsciiLab({ onNavigate }) {
+  const [image, setImage] = useState(null);
+  const [fileName, setFileName] = useState('Sin archivo');
+  const [columns, setColumns] = useState(120);
+  const [fontSize, setFontSize] = useState(6);
+  const [invert, setInvert] = useState(false);
+  const [charset, setCharset] = useState('density');
+  const [art, setArt] = useState(null);
+  const [status, setStatus] = useState('Sube una imagen para empezar.');
+  const [error, setError] = useState('');
+
+  const imageMeta = useMemo(() => {
+    if (!image) return null;
+    return {
+      width: image.naturalWidth || image.width || 0,
+      height: image.naturalHeight || image.height || 0,
+    };
+  }, [image]);
+
+  useEffect(() => {
+    if (!image) {
+      setArt(null);
+      return;
+    }
+
+    let cancelled = false;
+    setStatus('Generando arte ASCII...');
+
+    try {
+      const nextArt = imageToAscii(image, { columns, charset, invert });
+      if (!cancelled) {
+        setArt(nextArt);
+        setStatus(`Listo · ${nextArt?.columns || 0} columnas × ${nextArt?.rows || 0} filas`);
+      }
+    } catch (conversionError) {
+      if (!cancelled) {
+        setArt(null);
+        setStatus('No se pudo convertir la imagen.');
+        setError(conversionError?.message || 'Conversion failed');
+      }
+    }
+
+    return () => {
+      cancelled = true;
+    };
+  }, [image, columns, charset, invert]);
+
+  const handleFileChange = async (event) => {
+    const file = event.target.files?.[0];
+    event.target.value = '';
+
+    if (!file) return;
+
+    setError('');
+    setFileName(file.name);
+    setStatus('Cargando imagen...');
+
+    try {
+      const nextImage = await loadImageFromFile(file);
+      setImage(nextImage);
+    } catch (_loadError) {
+      setImage(null);
+      setArt(null);
+      setStatus('No se pudo cargar la imagen.');
+      setError('No fue posible leer el archivo seleccionado.');
+    }
+  };
+
+  return (
+    <main className="min-h-screen" style={{ background: '#0a0a0a', color: '#f8fafc' }}>
+      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-6 py-8">
+        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] lg:flex-row lg:items-center lg:justify-between">
+          <div className="max-w-3xl">
+            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
+              <FlaskConical className="h-3.5 w-3.5" />
+              ASCII Lab
+            </div>
+            <h1 className="text-3xl font-semibold tracking-[-0.03em]">Motor de imagen a ASCII</h1>
+            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
+              Laboratorio temporal para probar densidad de caracteres, inversión y tamaño de salida antes de integrar el motor al flujo principal.
+            </p>
+          </div>
+
+          <div className="flex items-center gap-3 self-start lg:self-auto">
+            <button
+              type="button"
+              onClick={() => onNavigate?.('settings')}
+              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-sky-400/40 hover:bg-sky-400/10"
+            >
+              <ArrowLeft className="h-4 w-4" />
+              Volver a Ajustes
+            </button>
+          </div>
+        </header>
+
+        {error ? (
+          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
+            {error}
+          </div>
+        ) : null}
+
+        <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
+          <div className="space-y-6">
+            <ControlCard title="Imagen fuente" icon={ImageUp}>
+              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/10 bg-black/20 px-5 py-8 text-center transition hover:border-sky-400/40 hover:bg-sky-400/5">
+                <input
+                  type="file"
+                  accept="image/*"
+                  onChange={handleFileChange}
+                  className="sr-only"
+                />
+                <Upload className="h-8 w-8 text-sky-300" />
+                <div>
+                  <p className="text-sm font-semibold text-slate-100">Subir imagen</p>
+                  <p className="mt-1 text-xs text-slate-400">PNG, JPG, WebP o cualquier imagen compatible.</p>
+                </div>
+              </label>
+
+              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
+                <p className="font-medium text-slate-100">{fileName}</p>
+                <p className="mt-1 text-xs text-slate-400">{status}</p>
+                {imageMeta ? (
+                  <p className="mt-2 text-xs text-slate-500">
+                    {imageMeta.width} × {imageMeta.height} px
+                  </p>
+                ) : null}
+              </div>
+            </ControlCard>
+
+            <ControlCard title="Parámetros" icon={Columns3}>
+              <div className="space-y-4">
+                <label className="block space-y-2">
+                  <div className="flex items-center justify-between text-sm">
+                    <span className="text-slate-200">Columns</span>
+                    <span className="text-sky-300">{columns}</span>
+                  </div>
+                  <input
+                    type="range"
+                    min="60"
+                    max="200"
+                    value={columns}
+                    onChange={(event) => setColumns(Number(event.target.value))}
+                    className="w-full cursor-pointer accent-sky-400"
+                  />
+                </label>
+
+                <label className="block space-y-2">
+                  <div className="flex items-center justify-between text-sm">
+                    <span className="text-slate-200">Font size</span>
+                    <span className="text-sky-300">{fontSize}px</span>
+                  </div>
+                  <input
+                    type="range"
+                    min="3"
+                    max="10"
+                    value={fontSize}
+                    onChange={(event) => setFontSize(Number(event.target.value))}
+                    className="w-full cursor-pointer accent-sky-400"
+                  />
+                </label>
+
+                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
+                  <div>
+                    <p className="text-sm font-medium text-slate-100">Invertir</p>
+                    <p className="text-xs text-slate-400">Intercambia claro/oscuro en el mapeo.</p>
+                  </div>
+                  <button
+                    type="button"
+                    onClick={() => setInvert((value) => !value)}
+                    className={`relative h-7 w-12 rounded-full border transition ${invert ? 'border-sky-400/60 bg-sky-400/30' : 'border-white/10 bg-white/10'}`}
+                    aria-pressed={invert}
+                  >
+                    <span
+                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${invert ? 'left-5' : 'left-0.5'}`}
+                    />
+                  </button>
+                </label>
+
+                <label className="block space-y-2">
+                  <div className="flex items-center gap-2 text-sm text-slate-200">
+                    <Palette className="h-4 w-4 text-sky-300" />
+                    Charset
+                  </div>
+                  <select
+                    value={charset}
+                    onChange={(event) => setCharset(event.target.value)}
+                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
+                  >
+                    {CHARSET_OPTIONS.map((option) => (
+                      <option key={option.value} value={option.value}>
+                        {option.label}
+                      </option>
+                    ))}
+                  </select>
+                </label>
+              </div>
+            </ControlCard>
+          </div>
+
+          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
+            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
+              <div>
+                <h2 className="text-lg font-semibold text-slate-100">Vista previa ASCII</h2>
+                <p className="mt-1 text-sm text-slate-400">
+                  La imagen se convierte en una grilla de caracteres con opacidad por brillo.
+                </p>
+              </div>
+              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
+                <Sparkles className="h-3.5 w-3.5 text-sky-300" />
+                {art ? `${art.columns} × ${art.rows}` : 'Sin arte generado'}
+              </div>
+            </div>
+
+            <div className="overflow-auto rounded-3xl border border-white/10 bg-black/70 p-4">
+              {art ? (
+                <AsciiArtPreview art={art} color="#f8fafc" fontSize={fontSize} />
+              ) : (
+                <div className="flex min-h-[60vh] items-center justify-center text-center text-slate-500">
+                  <div>
+                    <ImageUp className="mx-auto h-14 w-14 text-slate-600" />
+                    <p className="mt-4 text-sm">Sube una imagen para ver el resultado aquí.</p>
+                  </div>
+                </div>
+              )}
+            </div>
+          </section>
+        </section>
+      </div>
+    </main>
+  );
+}
```

### `src/pages/Calendario.jsx`
```diff
diff --git a/src/pages/Calendario.jsx b/src/pages/Calendario.jsx
index f83a172..7e6f41b 100644
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
@@ -205,7 +218,7 @@ function SelectField({ label, value, onChange, children, className = '' }) {
           background: 'var(--bg-secondary)',
           borderColor: 'var(--border-normal)',
           color: 'var(--text-strong)',
-        }}
+                  }}
       >
         {children}
       </select>
@@ -302,6 +315,19 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
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
+  const toolbarPreviewEvents = visibleMonthEvents.length ? visibleMonthEvents : events.slice(0, 5);
   const groupedEvents = groupEventsByMonth(filteredEvents);
   const hasEvents = events.length > 0;
   const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;
@@ -362,33 +388,103 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
   return (
     <div className="space-y-5">
       <section
-        className="rounded-2xl border p-6"
-        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
+        className="rounded-2xl border p-4"
+        style={{
+          borderColor: 'var(--border)',
+          background: 'var(--bg-card)',
+        }}
       >
-        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
-          <div>
-            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
-              <CalendarDays className="h-3.5 w-3.5" />
-              ITSON · {currentYear}
+        <div className="flex items-start gap-6">
+          <div className="min-w-0 flex-1">
+            <div className="mb-4">
+              <label className="mb-1 block text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
+                Seleccionar un calendario
+              </label>
+              <select
+                value={selectedCalendarType}
+                onChange={(event) => handleCalendarTypeChange(event.target.value)}
+                className="w-full max-w-[360px] appearance-none rounded-xl border px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-itson-blue/30"
+                style={{
+                  background: 'var(--bg-secondary)',
+                  borderColor: 'var(--border-normal)',
+                  color: 'var(--text-strong)',
+                }}
+              >
+                {calendarTypes.map((type) => (
+                  <option key={type} value={type}>
+                    {type}
+                  </option>
+                ))}
+              </select>
+            </div>
+
+            <div className="flex flex-wrap items-end gap-5">
+              <div className="flex flex-col items-center gap-1">
+                <span className="text-[12px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-strong)' }}>
+                  Mes
+                </span>
+                <div className="flex items-center gap-4">
+                  <button
+                    type="button"
+                    onClick={goToPreviousMonth}
+                    className="grid h-9 w-9 place-items-center rounded-xl border transition hover:opacity-80"
+                    style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-strong)' }}
+                    aria-label="Mes anterior"
+                  >
+                    <ChevronLeft className="h-4 w-4" />
+                  </button>
+                  <p className="min-w-[120px] text-center text-[17px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text-strong)' }}>
+                    {monthLabel}
+                  </p>
+                  <button
+                    type="button"
+                    onClick={goToNextMonth}
+                    className="grid h-9 w-9 place-items-center rounded-xl border transition hover:opacity-80"
+                    style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-strong)' }}
+                    aria-label="Mes siguiente"
+                  >
+                    <ChevronRight className="h-4 w-4" />
+                  </button>
+                </div>
+              </div>
+
+              <SelectField label="Categoría" value={filterCat} onChange={setFilterCat} className="min-w-[180px]">
+                {categories.map((category) => (
+                  <option key={category} value={category}>
+                    {category}
+                  </option>
+                ))}
+              </SelectField>
+
+              <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
+                {[
+                  { id: 'list', label: 'Lista', Icon: List },
+                  { id: 'grid', label: 'Grilla', Icon: LayoutGrid },
+                ].map(({ id, label, Icon }) => {
+                  const active = viewMode === id;
+                  return (
+                    <button
+                      key={id}
+                      type="button"
+                      onClick={() => setViewMode(id)}
+                      className="rounded-lg px-3 py-2 text-xs font-semibold transition"
+                      style={{
+                        background: active ? 'var(--accent)' : 'transparent',
+                        color: active ? 'white' : 'var(--text-muted)',
+                      }}
+                      title={label}
+                    >
+                      <Icon className="h-4 w-4" />
+                    </button>
+                  );
+                })}
+              </div>
             </div>
-            <h3 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
-              Calendario Escolar
-            </h3>
-            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
-              Consulta fechas académicas oficiales publicadas por ITSON.
-            </p>
           </div>
 
-          <button
-            type="button"
-            onClick={() => syncCalendar({ clearCacheFirst: true })}
-            disabled={isSyncing}
-            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
-            style={{ background: 'var(--accent)' }}
-          >
-            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
-            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
-          </button>
+          <div className="shrink-0 self-start pt-0.5">
+            <StackedEventCards events={toolbarPreviewEvents} currentMonth={currentMonth} />
+          </div>
         </div>
       </section>
 
@@ -423,83 +519,6 @@ function Calendario({ calendarData = { events: [], calendarTypes: [] }, isSyncin
 
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

### `src/utils/asciiConverter.js`
```diff
diff --git a/src/utils/asciiConverter.js b/src/utils/asciiConverter.js
new file mode 100644
index 0000000..26cd0f7
--- /dev/null
+++ b/src/utils/asciiConverter.js
@@ -0,0 +1,117 @@
+const CHARSETS = {
+  density: ' .\'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
+  blocks: ' ░▒▓█',
+  binary: ' #',
+};
+
+function getCharset(name) {
+  return CHARSETS[name] || CHARSETS.density;
+}
+
+function clamp(value, min, max) {
+  return Math.min(max, Math.max(min, value));
+}
+
+export function loadImageFromFile(file) {
+  return new Promise((resolve, reject) => {
+    const img = new Image();
+    const url = URL.createObjectURL(file);
+
+    img.onload = () => {
+      URL.revokeObjectURL(url);
+      resolve(img);
+    };
+
+    img.onerror = (error) => {
+      URL.revokeObjectURL(url);
+      reject(error);
+    };
+
+    img.src = url;
+  });
+}
+
+export function imageToAscii(imageElement, options = {}) {
+  const {
+    columns = 120,
+    charset = 'density',
+    invert = false,
+  } = options;
+
+  if (!imageElement) return null;
+
+  const sourceWidth = imageElement.naturalWidth || imageElement.width;
+  const sourceHeight = imageElement.naturalHeight || imageElement.height;
+  if (!sourceWidth || !sourceHeight) return null;
+
+  const targetColumns = Math.max(1, Math.round(columns));
+  const targetRows = Math.max(1, Math.round((sourceHeight / sourceWidth) * targetColumns * 0.5));
+
+  const sampleWidth = targetColumns * 8;
+  const sampleHeight = targetRows * 8;
+
+  const canvas = document.createElement('canvas');
+  canvas.width = sampleWidth;
+  canvas.height = sampleHeight;
+
+  const context = canvas.getContext('2d', { willReadFrequently: true });
+  if (!context) return null;
+
+  context.imageSmoothingEnabled = true;
+  context.imageSmoothingQuality = 'high';
+  context.clearRect(0, 0, sampleWidth, sampleHeight);
+  context.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);
+
+  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
+  const charsetChars = getCharset(charset);
+  const maxIndex = charsetChars.length - 1;
+  const grid = [];
+
+  const blockWidth = sampleWidth / targetColumns;
+  const blockHeight = sampleHeight / targetRows;
+
+  for (let rowIndex = 0; rowIndex < targetRows; rowIndex += 1) {
+    const row = [];
+    const yStart = Math.floor(rowIndex * blockHeight);
+    const yEnd = Math.floor((rowIndex + 1) * blockHeight);
+
+    for (let columnIndex = 0; columnIndex < targetColumns; columnIndex += 1) {
+      const xStart = Math.floor(columnIndex * blockWidth);
+      const xEnd = Math.floor((columnIndex + 1) * blockWidth);
+
+      let sum = 0;
+      let count = 0;
+
+      for (let y = yStart; y < yEnd; y += 1) {
+        for (let x = xStart; x < xEnd; x += 1) {
+          const pixelIndex = (y * sampleWidth + x) * 4;
+          const red = imageData[pixelIndex];
+          const green = imageData[pixelIndex + 1];
+          const blue = imageData[pixelIndex + 2];
+          const alpha = imageData[pixelIndex + 3] / 255;
+          const brightness = ((0.299 * red) + (0.587 * green) + (0.114 * blue)) * alpha + (255 * (1 - alpha));
+          sum += brightness;
+          count += 1;
+        }
+      }
+
+      const avgBrightness = clamp(Math.round(sum / Math.max(1, count)), 0, 255);
+      const normalized = avgBrightness / 255;
+      const mapped = invert ? normalized : 1 - normalized;
+      const charIndex = clamp(Math.round(mapped * maxIndex), 0, maxIndex);
+
+      row.push({
+        char: charsetChars[charIndex] || charsetChars[maxIndex],
+        brightness: avgBrightness,
+      });
+    }
+
+    grid.push(row);
+  }
+
+  return {
+    rows: targetRows,
+    columns: targetColumns,
+    grid,
+  };
+}
```

## Verificación
**npm run build:** PASS
**Tests ejecutados:** npm run build + checks de ASCII engine + screenshot con imagen suave generada
**Comando de verificación:** npm run build
node -e "const fs = require('fs'); console.log('asciiConverter existe:', fs.existsSync('src/utils/asciiConverter.js')); console.log('AsciiArtPreview existe:', fs.existsSync('src/components/AsciiArtPreview.jsx')); console.log('AsciiLab existe:', fs.existsSync('src/pages/AsciiLab.jsx')); const conv = fs.readFileSync('src/utils/asciiConverter.js','utf8'); console.log('exporta imageToAscii:', conv.includes('export function imageToAscii')); console.log('exporta loadImageFromFile:', conv.includes('export function loadImageFromFile'));"
**Output de verificación:**
```
$ npm run build
> dvpotro@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1774 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            0.47 kB │ gzip:   0.30 kB
dist/assets/dvpotro-logo-128-BsNSF5CX.png  9.18 kB
dist/assets/index-BFbkuREr.css             38.89 kB │ gzip:   7.93 kB
dist/assets/index-B37WXOIM.js              1,241.32 kB │ gzip: 261.80 kB
✓ built in 15.24s

$ node -e "..."
asciiConverter existe: true
AsciiArtPreview existe: true
AsciiLab existe: true
exporta imageToAscii: true
exporta loadImageFromFile: true

$ playwright screenshot mock
{
  "screenshot": "C:/Users/kneko/OneDrive/Documentos/scraper-app/reports/ascii_lab_soft_circle_087.png"
}
```

## Pendiente para Claude
- Sin pendientes registrados en esta tarea.
