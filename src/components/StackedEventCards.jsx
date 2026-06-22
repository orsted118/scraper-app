import { useEffect, useMemo, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { CalendarDays, CalendarX } from 'lucide-react';
import { classifyEvent } from '../utils/eventClassifier';

const MAX_VISIBLE = 5;
const STACK_ROTATIONS = [0, -3, 3, -5, 5];
const STACK_OFFSETS = [
  { x: 0, y: 0 },
  { x: -8, y: -4 },
  { x: -16, y: -8 },
  { x: -24, y: -5 },
  { x: -30, y: -10 },
];

function parseLooseDate(value) {
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const year = Number(match[3]);
  const month = Number(match[2]) - 1;
  const day = Number(match[1]);
  const parsed = new Date(year, month, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatStackDate(date) {
  if (!date) return '';

  const day = date.getDate();
  const month = date
    .toLocaleDateString('es-MX', { month: 'short' })
    .replace('.', '')
    .replace(/^(\w)/, (letter) => letter.toUpperCase());

  return `${day} ${month}`;
}

function getEventTitle(event) {
  return String(event?.titulo || event?.title || 'Evento').trim();
}

function getEventDate(event) {
  return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
}

function getCardStyle(category, index) {
  const offset = STACK_OFFSETS[index] ?? { x: index * -8, y: index * -4 };
  const rot = STACK_ROTATIONS[index] ?? 0;
  return {
    zIndex: MAX_VISIBLE - index,
    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rot}deg)`,
    transformOrigin: 'center center',
    '--discard-rot': `${rot}deg`,
    background: `${category.color}26`,
    borderColor: `${category.color}66`,
  };
}

function StackCard({ event, index, phase }) {
  const category = classifyEvent(getEventTitle(event));
  const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
  const date = getEventDate(event);

  const DESCRIPTIONS = {
    teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
    final_exams: 'Período oficial de evaluaciones finales del semestre.',
    semester_start: 'Inicio oficial de actividades académicas.',
    semester_end: 'Último día del período escolar vigente.',
    first_day_classes: 'Arranque del semestre y primeras actividades.',
    last_day_classes: 'Cierre académico antes del siguiente período.',
    no_ordinary_exam_schedule: 'Publicación del calendario de exámenes no ordinarios.',
    no_ordinary_exam_payment: 'Proceso de pago para presentar examen no ordinario.',
    no_ordinary_exam_application: 'Registro oficial de exámenes no ordinarios.',
    no_ordinary_exam_grades_capture: 'Captura de resultados de exámenes no ordinarios.',
    course_load_selection_jan_may: 'Proceso de selección de carga académica.',
    course_load_selection_summer: 'Proceso de inscripción para el período de verano.',
    new_entry_induction: 'Actividades de bienvenida para estudiantes de nuevo ingreso.',
    orientation: 'Sesiones de orientación para comenzar el ciclo escolar.',
    administrative_closure: 'Cierre administrativo del período en curso.',
    final_grades_release: 'Publicación oficial de calificaciones finales.',
    grade_submission: 'Periodo destinado a la entrega de calificaciones.',
    grade_capture: 'Captura interna de evaluaciones y resultados.',
    vacation_period: 'Tiempo de receso académico o descanso institucional.',
    winter_break: 'Receso invernal entre periodos escolares.',
    summer_break: 'Receso de verano antes del siguiente ciclo.',
    holiday_institutional_itson: 'Suspensión académica por fecha institucional ITSON.',
    holiday_national_independence: 'Día festivo oficial del calendario nacional.',
    holiday_national_revolution: 'Día festivo oficial del calendario nacional.',
    holiday_national_constitution: 'Día festivo oficial del calendario nacional.',
    holiday_national_benito: 'Día festivo oficial del calendario nacional.',
    holiday_national_labor: 'Día festivo oficial del calendario nacional.',
    holiday_national_dead: 'Día festivo oficial del calendario nacional.',
    holiday_national_christmas: 'Día festivo oficial del calendario nacional.',
    holiday_national_new_year: 'Día festivo oficial del calendario nacional.',
  };

  return (
    <div className="absolute bottom-0 right-0" style={getCardStyle(category, index)}>
      <article
        className={[
          'relative flex h-[200px] w-[320px] flex-col overflow-hidden rounded-[16px] border-2 border-black/80 bg-white shadow-[4px_6px_0px_rgba(0,0,0,0.85)] dark:bg-[var(--bg-card)]',
          phase === 'exit' ? 'animate-card-discard' : '',
          phase === 'enter' ? 'animate-card-enter' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          animationDelay: `${index * 60}ms`,
        }}
      >
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-30" style={{ background: category.color }} />
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20" style={{ background: category.color }} />

        <div className="relative z-10 flex h-full w-full flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: category.color }}>
              {category.label}
            </span>
            <span className="text-[10px]" style={{ color: category.color }}>
              ✦ ✦ ✦
            </span>
          </div>

          <div className="flex flex-1 gap-3">
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${category.color}22` }}>
                <Icon className="h-6 w-6" style={{ color: category.color }} />
              </div>
              <div className="flex gap-0.5">
                {[0, 1, 2].map((star) => (
                  <span key={star} className="text-[10px]" style={{ color: '#FBBF24' }}>
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-center">
              <h5 className="mb-1 line-clamp-2 text-sm font-bold leading-tight" style={{ color: '#1e293b' }}>
                {getEventTitle(event)}
              </h5>
              <div className="mb-2 h-px w-8" style={{ background: category.color }} />
              <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                {DESCRIPTIONS[category.id] ?? 'Fecha académica oficial del calendario ITSON.'}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 self-start rounded-lg px-2.5 py-1.5" style={{ background: `${category.color}18` }}>
            <LucideIcons.CalendarDays className="h-3.5 w-3.5" style={{ color: category.color }} />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: category.color }}>
                Fecha del evento
              </p>
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {date
                  ? date
                      .toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                      .replace(/\//g, '-')
                  : 'Por confirmar'}
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export default function StackedEventCards({ events = [], currentMonth }) {
  const visibleEvents = useMemo(() => {
    return (Array.isArray(events) ? events : [])
      .slice(0, MAX_VISIBLE)
      .filter(Boolean);
  }, [events]);

  const [stack, setStack] = useState(visibleEvents);
  const [phase, setPhase] = useState('idle');
  const isFirstRender = useRef(true);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setStack(visibleEvents);
      return () => clearTimers();
    }

    clearTimers();
    setPhase('exit');

    const exitTimer = setTimeout(() => {
      setStack(visibleEvents);
      setPhase('enter');

      const settleTimer = setTimeout(() => {
        setPhase('idle');
      }, 320);

      timersRef.current.push(settleTimer);
    }, 360);

    timersRef.current.push(exitTimer);

    return () => clearTimers();
  }, [visibleEvents, currentMonth]);

  const rotateStack = () => {
    if (phase !== 'idle' || stack.length <= 1) return;

    setStack((previous) => {
      if (!previous.length) return previous;
      return [...previous.slice(1), previous[0]];
    });
  };

  if (!stack.length) {
    return (
      <div
        className="flex h-[220px] w-[340px] items-center justify-center rounded-[16px] border border-dashed px-4 text-center"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
      >
        <div className="space-y-2">
          <CalendarX className="mx-auto h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
            Sin eventos este mes
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={rotateStack}
      className="relative hidden h-[220px] w-[340px] shrink-0 select-none lg:block"
      aria-label="Rotar eventos del calendario"
      title="Haz clic para cambiar el evento"
    >
      {stack.map((event, index) => (
        <StackCard
          key={`${getEventTitle(event)}-${event?.inicio || event?.date || index}`}
          event={event}
          index={index}
          phase={phase}
        />
      ))}
    </button>
  );
}
