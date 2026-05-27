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
  FileText,
  FileType2,
  ImageIcon,
  Loader2,
  Paperclip,
  Presentation,
  Table2,
  Users,
} from 'lucide-react';
import { useState } from 'react';

function getFileIcon(fileName = '') {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) {
    return { icon: FileText, color: 'text-red-400', label: 'PDF' };
  }

  if (/\.(doc|docx)$/.test(lowerName)) {
    return { icon: FileType2, color: 'text-blue-400', label: 'Word' };
  }

  if (/\.(xls|xlsx|csv)$/.test(lowerName)) {
    return { icon: Table2, color: 'text-emerald-400', label: 'Excel' };
  }

  if (/\.(ppt|pptx)$/.test(lowerName)) {
    return { icon: Presentation, color: 'text-orange-400', label: 'PowerPoint' };
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
    return { icon: ImageIcon, color: 'text-purple-400', label: 'Imagen' };
  }

  return { icon: Paperclip, color: 'text-slate-400', label: 'Archivo' };
}

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
      accentColor: 'var(--closed-text)',
      dateColor: 'var(--closed-text)',
      iconBg: 'var(--closed-bg)',
      iconText: 'var(--closed-text)',
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
      accentColor: 'var(--retrasada-text)',
      dateColor: 'var(--retrasada-text)',
      iconBg: 'var(--retrasada-bg)',
      iconText: 'var(--retrasada-text)',
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
      accentColor: 'var(--error-text)',
      dateColor: 'var(--error-text)',
      iconBg: 'var(--error-bg)',
      iconText: 'var(--error-text)',
      pillStyle: {
        background: 'var(--error-bg)',
        borderColor: 'var(--error-border)',
        color: 'var(--error-text)',
      },
      pillLabel: 'EN EQUIPO',
    };
  }

  return {
    accentColor: 'var(--success-text)',
    dateColor: 'var(--success-text)',
    iconBg: 'var(--success-bg)',
    iconText: 'var(--success-text)',
    pillStyle: null,
    pillLabel: '',
  };
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
  instrucciones,
  materia,
  modalidad = 'individual',
  nombre,
  profesor,
  estado,
}) {
  const [expanded, setExpanded] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const theme = getCardTheme(estado, modalidad);
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
    <article
      className="overflow-hidden rounded-[28px] border border-l-4 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]"
      style={{
        borderColor: 'var(--border)',
        borderLeftColor: theme.accentColor,
        background: 'var(--bg-card)',
      }}
    >
      <div className="p-4">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
          <div className="flex gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10"
              style={{ background: theme.iconBg, color: theme.iconText }}
            >
              <CalendarX className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {topBadgeVisible ? (
                  <span
                    className="inline-flex rounded-2xl border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={theme.pillStyle || undefined}
                  >
                    {theme.pillLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 max-w-[55%] overflow-hidden">
                <h3
                  title={nombre}
                  className="truncate text-base font-bold tracking-tight text-white sm:text-lg"
                >
                  {nombre}
                </h3>
              </div>

              <p className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-400">
                <span
                  title={materia || 'Materia no disponible'}
                  className="min-w-0 max-w-full line-clamp-1 overflow-hidden"
                >
                  {materia || 'Materia no disponible'}
                </span>

                {profesor ? (
                  <>
                    <span className="text-slate-600">|</span>
                    <span
                      title={profesor}
                      className="min-w-0 truncate text-slate-400"
                    >
                      {profesor}
                    </span>
                  </>
                ) : null}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  <Users className="h-3 w-3 text-slate-400" />
                  {modalidad === 'equipo' ? 'En equipo' : 'Individual'}
                </span>

                {fechaPublicacion ? (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Publicado: {publicationDate ? formatShortDate(publicationDate) : fechaPublicacion}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:border-l lg:border-slate-800 lg:pl-6">
            <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end">
              <div className="min-w-0 text-right">
                <p className="text-xs text-slate-400">Fecha límite</p>
                <p
                  className="mt-1 text-2xl font-semibold tracking-tight sm:text-[2.1rem]"
                  style={{ color: theme.dateColor }}
                >
                  {resolvedDeadline}
                </p>
                {resolvedDeadlineTime ? (
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">{resolvedDeadlineTime}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? 'Contraer actividad' : 'Expandir actividad'}
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {timeContext.label ? (
              <div className="mt-3 flex justify-end">
                <span
                  className={`inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1 text-xs font-medium ${getTimeContextClass(
                    timeContext.level,
                  )}`}
                  style={getTimeContextStyle(timeContext.level)}
                >
                  {TimeBadgeIcon ? <TimeBadgeIcon className="h-3.5 w-3.5" /> : null}
                  {timeContext.label}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {expanded ? (
          <div className="mt-4 border-t border-slate-800 pt-3">
            <div className="space-y-3">
              {instructionsText ? (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/45 px-3 py-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <AlignLeft className="h-4 w-4 text-slate-500" />
                    <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Instrucciones
                    </h4>
                  </div>

                  <p
                    className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300 sm:text-sm ${instructionsClampClass}`}
                  >
                    {instructionsText}
                  </p>

                  {instructionsText.length > 140 ? (
                    <button
                      type="button"
                      onClick={() => setInstructionsExpanded((value) => !value)}
                      className="mt-2 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
                    >
                      {instructionsExpanded ? 'Ver menos' : 'Ver más'}
                    </button>
                  ) : null}
                </section>
              ) : null}

              {archivos.length > 0 ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Paperclip className="h-4 w-4" />
                      <h4 className="text-xs font-semibold uppercase tracking-[0.22em]">Archivos adjuntos</h4>
                    </div>

                    <span className="text-xs text-slate-500">
                      {archivos.length} archivo{archivos.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 lg:grid-cols-3">
                    {visibleFiles.map((archivo) => {
                      const fileMeta = getFileIcon(archivo.name);
                      const FileIcon = fileMeta.icon;
                      const isDownloading = downloadingKey === archivo.url;

                      return (
                        <div
                          key={`${archivo.url}-${archivo.name}`}
                          className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 px-3 py-2"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60">
                            <FileIcon className={`h-4 w-4 ${fileMeta.color}`} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              title={archivo.name}
                              className="max-w-[60%] truncate text-xs font-medium text-slate-100 md:max-w-[120px]"
                            >
                              {archivo.name}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                              {fileMeta.label}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownload(archivo)}
                            disabled={isDownloading}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/30 text-slate-200 transition hover:border-itson-blue/50 hover:bg-itson-blue/10 hover:text-itson-blue disabled:cursor-not-allowed disabled:opacity-70"
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
                      className="mt-2 inline-flex text-xs text-itson-blue transition hover:text-itson-blue-light"
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
                        className="inline-flex items-center gap-2 rounded-2xl border border-itson-blue/50 px-4 py-2 text-sm font-semibold text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
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
                <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <p>{downloadError}</p>
                </div>
              ) : null}

              <footer className="flex flex-col gap-3 border-t border-slate-800 pt-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {estado === 'cerrada' ? (
                    <span>Cerrada el: {footerClosed}</span>
                  ) : footerPublication ? (
                    <span>Publicado: {footerPublication}</span>
                  ) : null}
                </div>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ActivityCard;
