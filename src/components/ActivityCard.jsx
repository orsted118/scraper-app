import { Download, FileText, FileType, Image, Presentation, Table } from 'lucide-react';
import { useMemo, useState } from 'react';

function getFileIcon(fileName = '') {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) {
    return FileText;
  }

  if (/\.(doc|docx)$/.test(lowerName)) {
    return FileType;
  }

  if (/\.(xls|xlsx|csv)$/.test(lowerName)) {
    return Table;
  }

  if (/\.(ppt|pptx)$/.test(lowerName)) {
    return Presentation;
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
    return Image;
  }

  return FileText;
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
  const [expanded, setExpanded] = useState(!startsCollapsed);

  const previewText = (instrucciones || '').trim();
  const shownInstructions =
    !previewText || expanded || previewText.length <= 200
      ? previewText
      : `${previewText.slice(0, 200).trim()}...`;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{nombre}</h3>
          <p className="text-sm text-slate-400">{materia}</p>
          <p className="text-sm text-slate-500">Fecha límite: {fechaLimite || 'Sin fecha visible'}</p>
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

      {archivos.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Archivos adjuntos</p>
          <div className="space-y-2">
            {(expanded ? archivos : archivos.slice(0, 3)).map((archivo) => {
              const FileIcon = getFileIcon(archivo.name);

              return (
                <div
                  key={`${archivo.url}-${archivo.name}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-slate-200">{archivo.name}</span>
                  </div>
                  <a
                    href={archivo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </a>
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
          className="mt-5 text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      ) : null}
    </article>
  );
}

export default ActivityCard;
