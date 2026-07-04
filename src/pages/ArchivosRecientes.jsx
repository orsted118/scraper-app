import { FolderOpen, FileText, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${Math.max(0, bytes)} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) {
    return 'Fecha no disponible';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ArchivosRecientes() {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.scraperApp : null;

    const loadArchivos = async () => {
      try {
        if (!api?.archivos?.getRecientes) {
          setError('DVPotro debe ejecutarse dentro de Electron.');
          setArchivos([]);
          return;
        }

        const response = await api.archivos.getRecientes();

        if (!response?.success) {
          setError(response?.error || 'No fue posible cargar los archivos recientes.');
          setArchivos([]);
          return;
        }

        setArchivos(Array.isArray(response.data) ? response.data : []);
        setError('');
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Error desconocido.');
        setArchivos([]);
      } finally {
        setLoading(false);
      }
    };

    loadArchivos();
  }, []);

  const handleOpen = async (filePath) => {
    const api = typeof window !== 'undefined' ? window.scraperApp : null;
    if (!api?.archivos?.abrir) {
      return;
    }

    await api.archivos.abrir(filePath);
  };

  const handleShowInFolder = async (filePath) => {
    const api = typeof window !== 'undefined' ? window.scraperApp : null;
    if (!api?.archivos?.mostrarEnCarpeta) {
      return;
    }

    await api.archivos.mostrarEnCarpeta(filePath);
  };

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}
          >
            <FolderOpen className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>
              Archivos Recientes
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Revisa las últimas descargas guardadas en la carpeta de descargas del sistema.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <section
          className="flex min-h-48 items-center justify-center rounded-2xl border p-6"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando archivos recientes...
          </div>
        </section>
      ) : error ? (
        <section
          className="rounded-2xl border px-4 py-4 text-sm"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#fecaca',
          }}
        >
          {error}
        </section>
      ) : archivos.length === 0 ? (
        <section
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <FileText className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
            No hay archivos recientes
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Cuando se descarguen archivos, aparecerán aquí para abrirlos o ubicarlos en su carpeta.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {archivos.map((archivo) => (
            <article
              key={archivo.path}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold" style={{ color: 'var(--text-strong)' }}>
                    {archivo.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span>{formatBytes(archivo.size)}</span>
                    <span>{formatDate(archivo.modified)}</span>
                  </div>
                  <p className="mt-2 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                    {archivo.path}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpen(archivo.path)}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
                    style={{ background: 'var(--accent)' }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShowInFolder(archivo.path)}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition"
                    style={{
                      borderColor: 'var(--border-normal)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-normal)',
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    Mostrar en carpeta
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default ArchivosRecientes;
