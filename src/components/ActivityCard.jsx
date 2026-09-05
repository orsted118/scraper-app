import {
  AlertCircle,
  AlertTriangle,
  AlignLeft,
  Calendar,
  CalendarX,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  Paperclip,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ActivityAnalyzer from '../pages/actividades/ActivityAnalyzer';
import PromptGenerator from '../pages/actividades/PromptGenerator';
import ActivityCardMenu from './ActivityCardMenu';
import ActivityInstructions from './ActivityInstructions';
import ActivitySubmission from './ActivitySubmission';
import { useState } from 'react';
import { EASE } from '../utils/motion';
import { diasHastaVencimiento, parseFechaPortalDate } from '../utils/fechas';
import { getFileIcon } from './file-icons';


const parseDate = parseFechaPortalDate;

function capitalize(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function formatShortDate(date) {
  if (!date) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value || '';
  const month = capitalize(parts.find((part) => part.type === 'month')?.value || '');
  const year = parts.find((part) => part.type === 'year')?.value || '';

  return [day, month, year].filter(Boolean).join(' ');
}

function formatTime(date) {
  if (!date) {
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value || '';
  const minute = parts.find((part) => part.type === 'minute')?.value || '';
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value || '').toUpperCase();

  return [hour && minute ? `${hour}:${minute}` : '', dayPeriod].filter(Boolean).join(' ');
}

function getTimeContext(estado, fechaLimite) {
  if (estado === 'cerrada') {
    return { label: 'CERRADA', level: 'closed' };
  }

  if (estado === 'retrasada') {
    const deadline = parseDate(fechaLimite);

    if (!deadline) {
      return { label: 'RETRASADA', level: 'late' };
    }

    const lateMs = Math.max(0, Date.now() - deadline.getTime());
    // floor, no ceil: Moodle cuenta días COMPLETOS vencidos ("atrasada por: 8
    // días"). Con ceil, 8 días y media hora se mostraban como 9 y la app
    // contradecía al portal en la misma pantalla.
    const daysLate = Math.max(1, Math.floor(lateMs / (24 * 60 * 60 * 1000)));

    return {
      label: `${daysLate} ${daysLate === 1 ? 'día' : 'días'} retrasada`,
      level: 'late',
    };
  }

  if (estado !== 'pendiente') {
    return { label: '', level: null };
  }

  const deadline = parseDate(fechaLimite);

  if (!deadline) {
    return { label: '', level: null };
  }

  // Días de calendario, no ventana de 24h: la card muestra la fecha límite al
  // lado de esta etiqueta, así que "Vence hoy" sobre un "4 Sep" se lee como un
  // bug aunque falten menos de 24 horas. El rojo queda reservado para hoy.
  const days = diasHastaVencimiento(deadline);

  if (days === null) {
    return { label: '', level: null };
  }

  if (days <= 0) {
    return { label: 'Vence hoy', level: 'critical' };
  }

  if (days === 1) {
    return { label: 'Vence mañana', level: 'warning' };
  }

  if (days <= 3) {
    return { label: `En ${days} días`, level: 'warning' };
  }

  return { label: '', level: null };
}

function getCardTheme(estado, modalidad) {
  if (estado === 'cerrada') {
    return {
      dateColor: 'var(--closed-text)',
      pillStyle: {
        background: 'var(--closed-bg)',
        borderColor: 'var(--closed-border)',
        color: 'var(--closed-text)',
      },
      pillLabel: 'CERRADA',
    };
  }

  if (estado === 'retrasada') {
    return {
      dateColor: 'var(--retrasada-text)',
      pillStyle: {
        background: 'var(--retrasada-bg)',
        borderColor: 'var(--retrasada-border)',
        color: 'var(--retrasada-text)',
      },
      pillLabel: 'RETRASADA',
    };
  }

  if (modalidad === 'equipo') {
    return {
      dateColor: 'var(--error-text)',
      pillStyle: {
        background: 'var(--error-bg)',
        borderColor: 'var(--error-border)',
        color: 'var(--error-text)',
      },
      pillLabel: 'EN EQUIPO',
    };
  }

  return {
    dateColor: 'var(--success-text)',
    pillStyle: null,
    pillLabel: '',
  };
}

// El borde izquierdo comunica el estado: retrasada es la única voz de alarma
// (accent), pendiente lleva un tick de tinta y cerrada queda plana.
function getCardEdge(estado) {
  if (estado === 'retrasada') {
    return { width: '3px', color: 'var(--retrasada-text)' };
  }

  if (estado === 'pendiente') {
    return { width: '2px', color: 'color-mix(in srgb, var(--text-strong) 40%, transparent)' };
  }

  return { width: 'var(--border-width-card, 1px)', color: 'var(--border-subtle)' };
}

function getTimeContextClass(level) {
  if (level === 'critical') {
    return 'animate-pulse';
  }

  return '';
}

function getTimeContextStyle(level) {
  if (level === 'critical') {
    return {
      background: 'var(--error-bg)',
      borderColor: 'var(--error-border)',
      color: 'var(--error-text)',
    };
  }

  if (level === 'warning' || level === 'late') {
    return {
      background: 'var(--retrasada-bg)',
      borderColor: 'var(--retrasada-border)',
      color: 'var(--retrasada-text)',
    };
  }

  if (level === 'closed') {
    return {
      background: 'var(--closed-bg)',
      borderColor: 'var(--closed-border)',
      color: 'var(--closed-text)',
    };
  }

  return {};
}

function getTimeContextIcon(level) {
  if (level === 'critical') {
    return AlertTriangle;
  }

  if (level === 'warning' || level === 'late') {
    return Clock;
  }

  if (level === 'closed') {
    return CalendarX;
  }

  return null;
}

// Por qué no se puede entregar ahora. Antes estas dos situaciones terminaban en
// la pestaña de cerradas y el alumno no tenía forma de saber que la actividad
// seguía viva ni qué le faltaba para poder entregar.
function getAvailabilityNotice({ bloqueo, ventana, fechaPublicacion, publicationDate }) {
  if (bloqueo === 'sin_equipo') {
    return {
      title: 'Sin equipo asignado',
      detail:
        'Es una entrega en equipo y el portal todavía no te ubica en uno. Hasta que el profesor arme los equipos no aparece el botón de entrega.',
      Icon: Users,
    };
  }

  if (ventana === 'no_abierta') {
    const cuando = publicationDate ? formatShortDate(publicationDate) : fechaPublicacion || '';

    return {
      title: 'Todavía no abre',
      detail: cuando
        ? `El portal empieza a aceptar entregas el ${cuando}.`
        : 'El portal todavía no acepta entregas para esta actividad.',
      Icon: Clock,
    };
  }

  return null;
}

function ActivityCard({
  archivos = [],
  bloqueo = null,
  enlaces = [],
  equipo = null,
  fechaLimite,
  fechaPublicacion,
  id,
  instrucciones,
  instruccionesMarkdown,
  materia,
  modalidad = 'individual',
  nombre,
  onHide,
  profesor,
  puedeEntregar = false,
  rubrica = null,
  estado,
  url,
  ventana = 'abierta',
}) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [rubricExpanded, setRubricExpanded] = useState(false);
  const [linkError, setLinkError] = useState('');

  const theme = getCardTheme(estado, modalidad);
  const edge = getCardEdge(estado);
  const timeContext = getTimeContext(estado, fechaLimite);
  const deadlineDate = parseDate(fechaLimite);
  const publicationDate = parseDate(fechaPublicacion);
  const instructionsText = (instrucciones || '').trim();
  const shouldClampInstructions = !instructionsExpanded && instructionsText.length > 140;
  const instructionsClampClass = shouldClampInstructions ? 'line-clamp-3' : '';
  const visibleFiles = showAllFiles ? archivos : archivos.slice(0, 3);
  const extraFilesCount = Math.max(0, archivos.length - 3);
  const topBadgeVisible = Boolean(theme.pillLabel);
  const TimeBadgeIcon = getTimeContextIcon(timeContext.level);
  const availability = getAvailabilityNotice({ bloqueo, ventana, fechaPublicacion, publicationDate });
  const rubricRows = rubrica?.filas || [];
  const visibleRubricRows = rubricExpanded ? rubricRows : rubricRows.slice(0, 3);

  const resolvedDeadline = deadlineDate ? formatShortDate(deadlineDate) : fechaLimite || 'Sin fecha visible';
  const resolvedDeadlineTime = deadlineDate ? formatTime(deadlineDate) : '';
  const footerPublication = publicationDate ? formatShortDate(publicationDate) : fechaPublicacion || '';
  const footerClosed = deadlineDate ? `${formatShortDate(deadlineDate)}${resolvedDeadlineTime ? ` a las ${resolvedDeadlineTime}` : ''}` : fechaLimite || '';

  // Se abre en el navegador del sistema a propósito. Un Drive o un Forms exige
  // sesión de Google, y esa sesión ya vive en el navegador del alumno: pedirle
  // la contraseña de Google a la app sería guardar una credencial que no
  // necesitamos para nada más.
  const handleOpenLink = async (enlace) => {
    setLinkError('');

    try {
      if (typeof window === 'undefined' || !window.scraperApp?.openExternal) {
        setLinkError('Abrir enlaces solo está disponible dentro de la app.');
        return;
      }

      await window.scraperApp.openExternal(enlace.url);
    } catch (_error) {
      setLinkError('No fue posible abrir el enlace.');
    }
  };

  const handleDownload = async (archivo) => {
    setDownloadingKey(archivo.url);
    setDownloadError('');

    try {
      if (typeof window === 'undefined' || !window.scraperApp?.downloadFile) {
        setDownloadError('La descarga solo está disponible dentro de Electron.');
        return;
      }

      const result = await window.scraperApp.downloadFile(archivo.url, archivo.name);

      if (!result?.success) {
        setDownloadError(result?.error || 'No fue posible descargar el archivo.');
      }
    } catch (_error) {
      setDownloadError('No fue posible descargar el archivo.');
    } finally {
      setDownloadingKey('');
    }
  };

  const handleDownloadAll = async () => {
    if (archivos.length <= 1) {
      return;
    }

    setDownloadingAll(true);
    setDownloadError('');

    try {
      if (typeof window === 'undefined' || !window.scraperApp?.downloadFile) {
        throw new Error('La descarga solo está disponible dentro de Electron.');
      }

      for (const archivo of archivos) {
        const result = await window.scraperApp.downloadFile(archivo.url, archivo.name);

        if (!result?.success) {
          throw new Error(result?.error || `No fue posible descargar ${archivo.name}.`);
        }
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No fue posible descargar los archivos.');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <motion.article
      whileHover={reduced ? undefined : { y: -1 }}
      // Sin overflow-hidden: el popup del menú es absolute y quedaría recortado.
      // El bloque expandible ya recorta su propia altura al animar.
      className="card-hover-border border"
      style={{
        borderWidth: 'var(--border-width-card, 1px)',
        borderTopColor: 'var(--border-subtle)',
        borderRightColor: 'var(--border-subtle)',
        borderBottomColor: 'var(--border-subtle)',
        borderLeftWidth: edge.width,
        borderLeftColor: edge.color,
        '--edge-color': edge.color,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-card, 0px)',
        boxShadow: 'var(--shadow-card, none)',
      }}
    >
      <div className="p-4">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
          <div className="min-w-0 flex-1">
            {topBadgeVisible ? (
              <span
                className="inline-flex border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ ...theme.pillStyle, borderRadius: 'var(--radius-badge, 0px)' }}
              >
                {theme.pillLabel}
              </span>
            ) : null}

            <div className={`${topBadgeVisible ? 'mt-2' : ''} overflow-hidden`}>
              <h3
                title={nombre}
                className="truncate text-base font-bold sm:text-lg"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  letterSpacing: '-0.02em',
                }}
              >
                {nombre}
              </h3>
            </div>

            <p className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span
                title={materia || 'Materia no disponible'}
                className="min-w-0 max-w-full line-clamp-1 overflow-hidden"
              >
                {materia || 'Materia no disponible'}
              </span>

              {profesor ? (
                <>
                  <span
                    aria-hidden="true"
                    className="shrink-0"
                    style={{ borderLeft: '1px solid var(--border-normal)', height: '0.9em', margin: '0 0.5em' }}
                  />
                  <span title={profesor} className="min-w-0 truncate">
                    {profesor}
                  </span>
                </>
              ) : null}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 border px-2 py-0.5 text-xs"
                style={{
                  borderColor: 'var(--border-normal)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-normal)',
                  borderRadius: 'var(--radius-badge, 0px)',
                }}
              >
                <Users className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                {modalidad === 'equipo' ? 'En equipo' : 'Individual'}
                {equipo ? ` · ${equipo}` : ''}
              </span>

              {availability ? (
                <span
                  className="inline-flex items-center gap-2 border px-2 py-0.5 text-xs"
                  style={{
                    borderColor: 'var(--retrasada-border)',
                    background: 'var(--retrasada-bg)',
                    color: 'var(--retrasada-text)',
                    borderRadius: 'var(--radius-badge, 0px)',
                  }}
                >
                  <availability.Icon className="h-3 w-3" />
                  {availability.title}
                </span>
              ) : null}

              {fechaPublicacion ? (
                <span
                  className="inline-flex items-center gap-2 border px-2 py-0.5 text-xs"
                  style={{
                    borderColor: 'var(--border-normal)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-normal)',
                    borderRadius: 'var(--radius-badge, 0px)',
                  }}
                >
                  <Calendar className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                  Publicado: {publicationDate ? formatShortDate(publicationDate) : fechaPublicacion}
                </span>
              ) : null}
            </div>
          </div>

          <div className="lg:border-l lg:pl-6" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end">
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Fecha límite
                </p>
                <p
                  className="mt-1 text-xl font-semibold sm:text-2xl"
                  style={{
                    color: theme.dateColor,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {resolvedDeadline}
                </p>
                {resolvedDeadlineTime ? (
                  <p
                    className="mt-1 text-xs sm:text-sm"
                    style={{
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {resolvedDeadlineTime}
                  </p>
                ) : null}
              </div>

              <div className="mt-0.5 flex shrink-0 items-center gap-1">
                <ActivityCardMenu url={url} onHide={onHide ? () => onHide(id) : undefined} />

                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  aria-label={expanded ? 'Contraer actividad' : 'Expandir actividad'}
                  className="chev-hover inline-flex h-8 w-8 shrink-0 items-center justify-center border"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-normal)',
                    borderRadius: 'var(--radius-badge, 0px)',
                  }}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {timeContext.label ? (
              <div className="mt-3 flex justify-end">
                <span
                  className={`inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-medium ${getTimeContextClass(
                    timeContext.level,
                  )}`}
                  style={{ ...getTimeContextStyle(timeContext.level), borderRadius: 'var(--radius-badge, 0px)' }}
                >
                  {TimeBadgeIcon ? <TimeBadgeIcon className="h-3.5 w-3.5" /> : null}
                  {timeContext.label}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="details"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: EASE }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="space-y-3">
                  {instructionsText ? (
                    <section
                      className="border px-3 py-2"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-card, 0px)',
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-normal)' }}>
                        <AlignLeft className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
                          Instrucciones
                        </h4>
                      </div>

                      {/* Con markdown se renderiza la estructura real (tablas,
                          imágenes, listas); el texto plano queda de respaldo
                          para actividades cacheadas antes de que se extrajera. */}
                      {instruccionesMarkdown ? (
                        <div className={instructionsClampClass}>
                          <ActivityInstructions markdown={instruccionesMarkdown} />
                        </div>
                      ) : (
                        <p
                          className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed sm:text-sm ${instructionsClampClass}`}
                          style={{ color: 'var(--text-normal)' }}
                        >
                          {instructionsText}
                        </p>
                      )}

                      {instructionsText.length > 140 ? (
                        <button
                          type="button"
                          onClick={() => setInstructionsExpanded((value) => !value)}
                          className="link-accent mt-2 text-sm font-medium"
                        >
                          {instructionsExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      ) : null}
                    </section>
                  ) : null}

                  {availability ? (
                    <section
                      className="border px-3 py-2"
                      style={{
                        borderColor: 'var(--retrasada-border)',
                        background: 'var(--retrasada-bg)',
                        borderRadius: 'var(--radius-card, 0px)',
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ color: 'var(--retrasada-text)' }}>
                        <availability.Icon className="h-4 w-4" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.22em]">{availability.title}</h4>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-normal)' }}>
                        {availability.detail}
                      </p>
                    </section>
                  ) : null}

                  {enlaces.length > 0 ? (
                    <section>
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <LinkIcon className="h-4 w-4" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.22em]">Enlaces de la consigna</h4>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {enlaces.map((enlace) => (
                          <button
                            key={enlace.url}
                            type="button"
                            onClick={() => handleOpenLink(enlace)}
                            title={enlace.url}
                            className="hov-accent inline-flex max-w-full items-center gap-2 border px-3 py-1.5 text-xs"
                            style={{
                              borderColor: 'var(--border-normal)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-normal)',
                              borderRadius: 'var(--radius-badge, 0px)',
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <span className="truncate">{enlace.texto}</span>
                          </button>
                        ))}
                      </div>

                      {linkError ? (
                        <p className="mt-2 text-xs" style={{ color: 'var(--error-text)' }}>
                          {linkError}
                        </p>
                      ) : null}

                      {enlaces.some((enlace) => enlace.tipo === 'google') ? (
                        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          Se abren en tu navegador, donde ya tienes la sesión de Google iniciada.
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  {rubricRows.length > 0 ? (
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <ListChecks className="h-4 w-4" />
                          <h4 className="text-xs font-semibold uppercase tracking-[0.22em]">
                            {rubrica.titulo || 'Criterios de calificación'}
                          </h4>
                        </div>

                        <span
                          className="text-xs"
                          style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {rubricRows.length} criterio{rubricRows.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div
                        className="mt-2 overflow-x-auto border"
                        style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
                      >
                        <table className="w-full border-collapse text-left text-xs">
                          {rubrica.encabezados?.length > 0 ? (
                            <thead>
                              <tr>
                                {rubrica.encabezados.map((celda, index) => (
                                  <th
                                    key={`head-${index}`}
                                    className="border-b px-3 py-2 align-top font-semibold"
                                    style={{
                                      borderColor: 'var(--border-subtle)',
                                      background: 'var(--bg-tertiary)',
                                      color: 'var(--text-strong)',
                                    }}
                                  >
                                    {celda}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          ) : null}

                          <tbody>
                            {visibleRubricRows.map((fila, filaIndex) => (
                              <tr key={`fila-${filaIndex}`}>
                                {fila.map((celda, celdaIndex) => (
                                  <td
                                    key={`celda-${filaIndex}-${celdaIndex}`}
                                    className="border-b px-3 py-2 align-top leading-relaxed"
                                    style={{
                                      borderColor: 'var(--border-subtle)',
                                      // La primera columna nombra el criterio; el resto son
                                      // los niveles de desempeño y se leen como cuerpo.
                                      color: celdaIndex === 0 ? 'var(--text-strong)' : 'var(--text-normal)',
                                      minWidth: celdaIndex === 0 ? '9rem' : '11rem',
                                    }}
                                  >
                                    {celda}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {rubricRows.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setRubricExpanded((value) => !value)}
                          className="link-accent mt-2 text-sm font-medium"
                        >
                          {rubricExpanded
                            ? 'Ver menos criterios'
                            : `Ver los ${rubricRows.length} criterios`}
                        </button>
                      ) : null}
                    </section>
                  ) : null}

                  {archivos.length > 0 ? (
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <Paperclip className="h-4 w-4" />
                          <h4 className="text-xs font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
                        </div>

                        <span
                          className="text-xs"
                          style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {archivos.length} archivo{archivos.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-2 lg:grid-cols-3">
                        {visibleFiles.map((archivo) => {
                          const { Icon: FileIcon, label: fileLabel } = getFileIcon(archivo.name);
                          const isDownloading = downloadingKey === archivo.url;

                          return (
                            <div
                              key={`${archivo.url}-${archivo.name}`}
                              className="flex items-center gap-3 border px-3 py-2"
                              style={{
                                borderColor: 'var(--border-subtle)',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-card, 0px)',
                              }}
                            >
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center border"
                                style={{
                                  borderColor: 'var(--border-normal)',
                                  background: 'var(--bg-secondary)',
                                  borderRadius: 'var(--radius-badge, 0px)',
                                }}
                              >
                                <FileIcon className="h-5 w-5 shrink-0" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p
                                  title={archivo.name}
                                  className="max-w-[60%] truncate text-xs font-medium md:max-w-[120px]"
                                  style={{ color: 'var(--text-strong)' }}
                                >
                                  {archivo.name}
                                </p>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                                  {fileLabel}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownload(archivo)}
                                disabled={isDownloading}
                                className="hov-accent inline-flex h-8 w-8 shrink-0 items-center justify-center border disabled:cursor-not-allowed disabled:opacity-70"
                                style={{
                                  borderColor: 'var(--border-normal)',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-normal)',
                                  borderRadius: 'var(--radius-badge, 0px)',
                                }}
                                aria-label={`Descargar ${archivo.name}`}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {archivos.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllFiles((value) => !value)}
                          className="link-accent mt-2 inline-flex text-xs"
                        >
                          {showAllFiles ? 'Ver menos' : `+${extraFilesCount} más`}
                        </button>
                      ) : null}

                      {archivos.length > 1 ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={handleDownloadAll}
                            disabled={downloadingAll}
                            className="btn-outline-accent inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--accent) 55%, transparent)',
                              color: 'var(--accent)',
                              borderRadius: 'var(--radius-button, 0px)',
                            }}
                          >
                            {downloadingAll ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            {downloadingAll ? 'Descargando...' : 'Descargar todos'}
                          </button>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {downloadError ? (
                    <div
                      className="flex items-start gap-3 border px-3 py-3 text-sm"
                      style={{
                        background: 'var(--error-bg)',
                        borderColor: 'var(--error-border)',
                        color: 'var(--error-text)',
                        borderRadius: 'var(--radius-card, 0px)',
                      }}
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{downloadError}</p>
                    </div>
                  ) : null}

                  <footer
                    className="flex flex-col gap-3 border-t pt-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {estado === 'cerrada' ? (
                        <span>Cerrada el: {footerClosed}</span>
                      ) : footerPublication ? (
                        <span>Publicado: {footerPublication}</span>
                      ) : null}
                    </div>
                  </footer>

                  <ActivitySubmission url={url} puedeEntregar={puedeEntregar} />

                  <ActivityAnalyzer
                    activity={{ id, nombre, instrucciones, instruccionesMarkdown, rubrica, materia, modalidad }}
                  />

                  {/* Recibe MÁS campos que el analizador a propósito: el prompt
                      se arma con todo lo que la card sabe — profesor, fechas y
                      los adjuntos del profe, que son de donde sale la rúbrica. */}
                  <PromptGenerator
                    activity={{ id, nombre, instrucciones, instruccionesMarkdown, enlaces, rubrica, materia, modalidad, profesor, estado, fechaLimite, fechaPublicacion, archivos }}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export default ActivityCard;
