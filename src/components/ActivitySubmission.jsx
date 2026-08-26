import { AlertTriangle, Check, FileUp, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';

// Apartado de entrega dentro de la card de una actividad.
//
// El copy NO puede prometer "borrador". Moodle decide por actividad si guardar
// deja un borrador o envía a calificar directo (`submissiondrafts`), y no hay
// forma de saberlo de antemano sin guardar. Así que la UI avisa que puede
// quedar como entrega final, y recién después de guardar muestra el estado que
// realmente quedó, leído del portal.
const ESTADO_COPY = {
  idle: null,
  cargando: 'Consultando la actividad en iVirtual…',
  subiendo: 'Subiendo archivos…',
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ActivitySubmission({ url, puedeEntregar }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;

  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState('idle');
  const [info, setInfo] = useState(null);
  const [seleccion, setSeleccion] = useState([]);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [deshaciendo, setDeshaciendo] = useState(false);

  // El portal es la fuente de verdad de si se puede entregar. Si el scrape dijo
  // que no, ni siquiera se ofrece el panel.
  if (!puedeEntregar || !url) {
    return null;
  }

  const abrirPanel = async () => {
    if (abierto) {
      setAbierto(false);
      return;
    }

    setAbierto(true);
    setError('');
    setResultado(null);

    if (info) {
      return;
    }

    if (!api?.assignmentUpload) {
      setError('La entrega solo funciona dentro de DVPotro.');
      return;
    }

    setEstado('cargando');

    try {
      const result = await api.assignmentUpload.getInfo(url);

      if (!result?.success) {
        setError(result?.message || 'No fue posible leer el formulario de entrega.');
        return;
      }

      setInfo(result);

      if (!result.puedeEntregar) {
        setError('iVirtual no permite entregar en esta actividad ahora mismo.');
      } else if (!result.aceptaArchivos) {
        setError('Esta actividad no recibe archivos.');
      }
    } catch (_error) {
      setError('No fue posible conectar con iVirtual.');
    } finally {
      setEstado('idle');
    }
  };

  const elegirArchivos = async () => {
    setError('');
    setResultado(null);

    try {
      const picked = await api.assignmentUpload.pickFiles();
      if (picked?.canceled) return;
      setSeleccion(picked?.files || []);
    } catch (_error) {
      setError('No fue posible abrir el selector de archivos.');
    }
  };

  const quitarArchivo = (filePath) => {
    setSeleccion((previa) => previa.filter((archivo) => archivo.path !== filePath));
  };

  const subir = async () => {
    if (seleccion.length === 0) return;

    setConfirmando(false);
    setEstado('subiendo');
    setError('');
    setResultado(null);

    try {
      const result = await api.assignmentUpload.upload(
        url,
        seleccion.map((archivo) => archivo.path),
      );

      if (!result?.success) {
        setError(result?.message || 'No fue posible subir los archivos.');
        return;
      }

      setResultado(result);
      setSeleccion([]);
      setInfo((previa) => (previa ? { ...previa, archivosEnBorrador: result.archivos || [] } : previa));
    } catch (_error) {
      setError('No fue posible subir los archivos.');
    } finally {
      setEstado('idle');
    }
  };

  const deshacer = async () => {
    setDeshaciendo(true);
    setError('');

    try {
      const result = await api.assignmentUpload.removeSubmission(url);

      if (!result?.success) {
        setError(result?.message || 'No fue posible quitar la entrega desde acá. Hacelo en el portal.');
        return;
      }

      setResultado(null);
      setInfo((previa) => (previa ? { ...previa, archivosEnBorrador: [] } : previa));
    } catch (_error) {
      setError('No fue posible quitar la entrega.');
    } finally {
      setDeshaciendo(false);
    }
  };

  const ocupado = estado !== 'idle' || deshaciendo;
  const limite = info?.maxBytes ? formatBytes(info.maxBytes) : null;

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        type="button"
        onClick={abrirPanel}
        className="inline-flex items-center gap-2 text-xs font-semibold"
        style={{ color: 'var(--accent)' }}
      >
        <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} />
        {abierto ? 'Ocultar entrega' : 'Entregar archivos'}
      </button>

      {abierto ? (
        <div className="mt-3 space-y-3">
          {ESTADO_COPY[estado] ? (
            <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              {ESTADO_COPY[estado]}
            </p>
          ) : null}

          {info?.limitesTexto || limite ? (
            <p
              className="text-[11px]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {limite ? `Máximo ${limite} por archivo` : ''}
              {info?.maxFiles > 0 ? ` · hasta ${info.maxFiles} archivos` : ''}
              {Array.isArray(info?.acceptedTypes) && info.acceptedTypes.length > 0
                ? ` · solo ${info.acceptedTypes.join(', ')}`
                : ' · cualquier formato'}
            </p>
          ) : null}

          {Array.isArray(info?.archivosEnBorrador) && info.archivosEnBorrador.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                Ya entregado en iVirtual
              </p>
              <ul className="mt-1 space-y-0.5">
                {info.archivosEnBorrador.map((nombre) => (
                  <li key={nombre} className="text-xs" style={{ color: 'var(--text-normal)' }}>
                    {nombre}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {seleccion.length > 0 ? (
            <ul className="space-y-1">
              {seleccion.map((archivo) => (
                <li
                  key={archivo.path}
                  className="flex items-center justify-between gap-2 border px-2 py-1 text-xs"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-badge, 0px)',
                    color: 'var(--text-normal)',
                  }}
                >
                  <span className="min-w-0 truncate" title={archivo.name}>
                    {archivo.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {formatBytes(archivo.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarArchivo(archivo.path)}
                      aria-label={`Quitar ${archivo.name}`}
                      disabled={ocupado}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <p className="flex items-start gap-2 text-xs" style={{ color: 'var(--error-text)' }}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {error}
            </p>
          ) : null}

          {resultado ? (
            <div
              className="border px-3 py-2 text-xs"
              style={{
                borderColor: 'var(--border-normal)',
                borderRadius: 'var(--radius-badge, 0px)',
                color: 'var(--text-normal)',
              }}
            >
              <p className="flex items-center gap-2 font-semibold">
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                {resultado.estado === 'enviada'
                  ? 'Entregado y enviado para calificar'
                  : resultado.estado === 'borrador'
                    ? 'Guardado como borrador'
                    : 'Archivos guardados'}
              </p>
              {/* El texto sale del portal, no de lo que la app supuso. */}
              {resultado.textoEstado ? (
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  Estado en iVirtual: {resultado.textoEstado}
                </p>
              ) : null}
              {resultado.estado === 'borrador' ? (
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  Falta enviarlo para calificar desde el portal.
                </p>
              ) : null}
              {resultado.sePuedeDeshacer ? (
                <button
                  type="button"
                  onClick={deshacer}
                  disabled={ocupado}
                  className="mt-2 inline-flex items-center gap-2 text-xs font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  {deshaciendo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  Quitar la entrega
                </button>
              ) : null}
            </div>
          ) : null}

          {info?.puedeEntregar && info?.aceptaArchivos ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={elegirArchivos}
                disabled={ocupado}
                className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                Elegir archivos
              </button>

              {confirmando ? (
                <span className="flex flex-wrap items-center gap-2">
                  {/* No se puede prometer borrador: depende de la configuración
                      de la actividad y no se sabe hasta guardar. */}
                  <span className="text-xs" style={{ color: 'var(--error-text)' }}>
                    Según cómo esté configurada la actividad, esto puede quedar como
                    entrega final. ¿Continuar?
                  </span>
                  <button
                    type="button"
                    onClick={subir}
                    disabled={ocupado}
                    className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
                  >
                    {estado === 'subiendo' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    Sí, entregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    disabled={ocupado}
                    className="btn-outline px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={ocupado || seleccion.length === 0}
                  className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
                >
                  <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Entregar en iVirtual
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ActivitySubmission;
