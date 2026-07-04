import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { CalendarDays, CalendarX } from 'lucide-react';
import { classifyEvent } from '../utils/eventClassifier';

const MAX_VISIBLE = 5;
const STACK_ROTATIONS = [0, -4, 4, -7, 7];

const EVENT_DESCRIPTIONS = {
  teacher_evaluation: 'Tu opinión ayuda a mejorar la calidad educativa.',
  final_exams: 'Período oficial de evaluaciones finales del semestre.',
  semester_start: 'Inicio oficial de actividades académicas.',
  first_day_classes: 'Arranque del semestre y primeras actividades.',
};

function parseLooseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  const dmyMatch = String(value).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmyMatch) return new Date(+dmyMatch[3], +dmyMatch[2] - 1, +dmyMatch[1]);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatStackDate(date) {
  if (!date) return '';
  return date
    .toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');
}

function getEventTitle(event) {
  return event?.titulo || event?.title || event?.nombre || 'Evento';
}

function getEventDate(event) {
  return parseLooseDate(event?.inicio || event?.date || event?.fechaInicio || event?.fecha);
}

function getDescription(category, event) {
  return (
    event?.descripcion ||
    event?.description ||
    EVENT_DESCRIPTIONS[category.id] ||
    'Fecha académica oficial del calendario ITSON.'
  );
}

// Estilo del CONTENEDOR de cada tarjeta (posición en el stack)
function getCardWrapperStyle(index) {
  const scale = 1 - index * 0.05;
  const rotation = STACK_ROTATIONS[index] ?? 0;
  return {
    zIndex: 10 - index,
    transform: `scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    transition: 'transform 300ms ease',
  };
}

function StackCard({ event, index }) {
  const isBack = index > 0;
  const category = classifyEvent(getEventTitle(event));

  // Estilo base compartido: FONDO OPACO SÓLIDO obligatorio.
  // Esto es lo que evita que se vea cualquier cosa detrás/debajo.
  const baseCardClass =
    'absolute inset-0 m-auto h-[110px] w-[210px] rounded-2xl border-2 overflow-hidden';
  const baseCardStyle = {
    background: 'var(--bg-card)',
    borderColor: `${category.color}55`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
  };

  if (isBack) {
    // Tarjeta trasera: silueta opaca, CERO texto, CERO hijos.
    return (
      <div
        className={baseCardClass}
        style={{ ...baseCardStyle, ...getCardWrapperStyle(index) }}
      />
    );
  }

  // Tarjeta frontal: única que renderiza contenido.
  const Icon = LucideIcons[category.icon] ?? LucideIcons.CalendarDays;
  const date = getEventDate(event);
  const description = getDescription(category, event);

  return (
    <div
      className={baseCardClass}
      style={{ ...baseCardStyle, ...getCardWrapperStyle(index) }}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden p-3">
        {/* blob decorativo de fondo, esquina inferior izquierda */}
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full opacity-25"
          style={{ background: category.color }}
        />
        {/* badge superior */}
        <span
          className="relative z-10 mb-2 inline-block self-start rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white"
          style={{ background: category.color }}
        >
          Evento escolar
        </span>

        <div className="relative z-10 flex flex-1 items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: `${category.color}25` }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color: category.color }} />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-[12px] font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
              {getEventTitle(event)}
            </p>
            <div className="mt-1 h-[2px] w-6" style={{ background: category.color }} />
            <p className="mt-1 line-clamp-1 text-[8px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
        </div>

        <div
          className="relative z-10 mt-2 flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-[9px] font-semibold"
          style={{ background: `${category.color}18`, color: category.color }}
        >
          <CalendarDays className="h-3 w-3" />
          {formatStackDate(date)}
        </div>
      </div>
    </div>
  );
}

export default function StackedEventCards({ events = [], currentMonth }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setRotation(0);
  }, [currentMonth]);

  const visible = events.slice(0, MAX_VISIBLE);
  const rotated = visible.length
    ? [...visible.slice(rotation % visible.length), ...visible.slice(0, rotation % visible.length)]
    : [];

  const handleClick = () => {
    if (visible.length > 1) setRotation((r) => r + 1);
  };

  if (visible.length === 0) {
    return (
      <div
        className="relative hidden h-[130px] w-[230px] shrink-0 select-none items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed lg:flex"
        style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)' }}
      >
        <div className="flex flex-col items-center gap-1 text-[10px]">
          <CalendarX className="h-5 w-5" />
          <span>Sin eventos este mes</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      key={currentMonth}
      className="relative hidden h-[140px] w-[235px] shrink-0 select-none overflow-hidden rounded-2xl lg:block"
      style={{ background: 'var(--bg-secondary)' }}
      aria-label="Ver siguiente evento del mes"
    >
      {rotated.map((event, index) => (
        <StackCard key={`${currentMonth}-${event?.id ?? index}`} event={event} index={index} />
      ))}
    </button>
  );
}
