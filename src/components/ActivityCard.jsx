import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  FileText,
  FileType2,
  ImageIcon,
  Loader2,
  Paperclip,
  Presentation,
  Table2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

function getFileIcon(fileName = '') {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) {
    return { icon: FileText, color: 'text-red-400', type: 'PDF' };
  }

  if (/\.(doc|docx)$/.test(lowerName)) {
    return { icon: FileType2, color: 'text-blue-400', type: 'Word' };
  }

  if (/\.(xls|xlsx|csv)$/.test(lowerName)) {
    return { icon: Table2, color: 'text-green-400', type: 'Excel' };
  }

  if (/\.(ppt|pptx)$/.test(lowerName)) {
    return { icon: Presentation, color: 'text-orange-400', type: 'PowerPoint' };
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
    return { icon: ImageIcon, color: 'text-purple-400', type: 'Imagen' };
  }

  return { icon: Paperclip, color: 'text-slate-400', type: 'Otro' };
}

function getBadgeClass(status) {
  if (status === 'retrasada') {
    return 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30';
  }

  if (status === 'cerrada') {
    return 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-600';
  }

  return 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30';
}

function parseDeadlineDate(fechaLimite) {
  if (!fechaLimite || typeof fechaLimite !== 'string') {
    return null;
  }

  const trimmedValue = fechaLimite.trim();

  if (!trimmedValue || trimmedValue === 'Sin fecha visible') {
    return null;
  }

  const parsed = Date.parse(trimmedValue.replace(/\s+/g, ' ').trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function getUrgencyLevel(estado, fechaLimite) {
  if (estado !== 'pendiente') {
    return null;
  }

  const deadline = parseDeadlineDate(fechaLimite);

  if (!deadline) {
    return null;
  }

  const diffMs = deadline.getTime() - Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const threeDaysMs = 3 * oneDayMs;

  if (diffMs < 0) {
    return null;
  }

  if (diffMs <= oneDayMs) {
    return 'critical';
  }

  if (diffMs <= threeDaysMs) {
    return 'warning';
  }

  return null;
}

function ActivityCard({
  nombre,
  materia,
  fechaLimite,
  estado,
  instrucciones,
  archivos = [],
}) {
  const startsCollapsed = useMemo(
    () => (instrucciones || '').length > 200 || archivos.length > 3,
    [archivos.length, instrucciones],
  );
  const urgencyLevel = getUrgencyLevel(estado, fechaLimite);
  const [expanded, setExpanded] = useState(!startsCollapsed);
  const [downloadingKey, setDownloadingKey] = useState('');
  const [downloadError, setDownloadError] = useState('');

  const previewText = (instrucciones || '').trim();
  const shownInstructions =
    !previewText || expanded || previewText.length <= 200
      ? previewText
      : `${previewText.slice(0, 200).trim()}...`;

  const visibleFiles = expanded ? archivos : archivos.slice(0, 3);

  const handleDownload = async (archivo) => {
    setDownloadingKey(archivo.url);
    setDownloadError('');

    try {
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

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{nombre}</h3>
          <p className="text-sm text-slate-400">{materia}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-500">Fecha límite: {fechaLimite || 'Sin fecha visible'}</p>
            {urgencyLevel === 'critical' ? (
              <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Vence hoy
              </span>
            ) : null}
            {urgencyLevel === 'warning' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300">
                <Clock className="h-3.5 w-3.5" />
                Vence pronto
              </span>
            ) : null}
          </div>
        </div>

        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getBadgeClass(estado)}`}>
          {estado}
        </span>
      </div>

      {shownInstructions ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Instrucciones</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{shownInstructions}</p>
        </div>
      ) : null}

      {downloadError ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <p>{downloadError}</p>
        </div>
      ) : null}

      {archivos.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Archivos adjuntos</p>
          <div className="space-y-2">
            {visibleFiles.map((archivo) => {
              const fileMeta = getFileIcon(archivo.name);
              const FileIcon = fileMeta.icon;

              return (
                <div
                  key={`${archivo.url}-${archivo.name}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className={`h-4 w-4 ${fileMeta.color}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{archivo.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {fileMeta.type}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(archivo)}
                    disabled={downloadingKey === archivo.url}
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-itson-blue/50 px-3 py-1 text-xs text-itson-blue transition hover:bg-itson-blue/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {downloadingKey === archivo.url ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {downloadingKey === archivo.url ? 'Descargando...' : 'Descargar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {(startsCollapsed || (previewText && previewText.length > 200) || archivos.length > 3) ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-5 text-sm font-medium text-itson-blue transition hover:text-itson-blue-light"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      ) : null}
    </article>
  );
}

export default ActivityCard;
