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
  Loader2,
  Paperclip,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ActivityAnalyzer from '../pages/actividades/ActivityAnalyzer';
import ActivityCardMenu from './ActivityCardMenu';
import { useState } from 'react';
import { EASE } from '../utils/motion';
import { getFileIcon } from './file-icons';


function parseDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
    return null;
  }

  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

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
    const daysLate = Math.max(1, Math.ceil(lateMs / (24 * 60 * 60 * 1000)));

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

  const diffMs = deadline.getTime() - Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diffMs <= oneDayMs) {
    return { label: 'Vence hoy', level: 'critical' };
  }

  if (diffMs <= 3 * oneDayMs) {
    const days = Math.max(1, Math.ceil(diffMs / oneDayMs));
    return { label: `En ${days} ${days === 1 ? 'día' : 'días'}`, level: 'warning' };
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

function ActivityCard({
  archivos = [],
  fechaLimite,
  fechaPublicacion,
  id,
  instrucciones,
  materia,
  modalidad = 'individual',
  nombre,
  onHide,
  profesor,
  estado,
  url,
}) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState('');

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

  const resolvedDeadline = deadlineDate ? formatShortDate(deadlineDate) : fechaLimite || 'Sin fecha visible';
  const resolvedDeadlineTime = deadlineDate ? formatTime(deadlineDate) : '';
  const footerPublication = publicationDate ? formatShortDate(publicationDate) : fechaPublicacion || '';
  const footerClosed = deadlineDate ? `${formatShortDate(deadlineDate)}${resolvedDeadlineTime ? ` a las ${resolvedDeadlineTime}` : ''}` : fechaLimite || '';

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
              </span>

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

                      <p
                        className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed sm:text-sm ${instructionsClampClass}`}
                        style={{ color: 'var(--text-normal)' }}
                      >
                        {instructionsText}
                      </p>

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

                  <ActivityAnalyzer
                    activity={{ id, nombre, instrucciones, materia, modalidad }}
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
