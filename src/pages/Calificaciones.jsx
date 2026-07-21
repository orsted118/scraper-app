import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import GradeCard from '../components/GradeCard';
import { formatLastSync } from '../utils/formatLastSync';

const ciaFriendlyErrors = {
  CIA_NO_CREDENTIALS: 'No has configurado tus credenciales del CIA. Ve a Ajustes para hacerlo.',
  CIA_NO_USER: 'Falta tu usuario del CIA en la configuración. Ve a Ajustes.',
  CIA_NO_PASSWORD: 'Falta tu contraseña del CIA en la configuración. Ve a Ajustes.',
};

const ciaSettingsErrorCodes = new Set([
  'CIA_NO_CREDENTIALS',
  'CIA_NO_USER',
  'CIA_NO_PASSWORD',
]);

function formatGrade(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toFixed(1);
}

function getMateriaStatus(materia) {
  const promedio = typeof materia.promedio === 'number' ? materia.promedio : null;
  const hasGrades = Array.isArray(materia.calificaciones)
    ? materia.calificaciones.some((item) => typeof item.calificacion === 'number')
    : false;

  if (!hasGrades || promedio === null) {
    return 'sin_calificacion';
  }

  if (promedio >= 7) {
    return 'aprobada';
  }

  if (promedio >= 6) {
    return 'en_riesgo';
  }

  return 'reprobada';
}


function getFriendlyCIAErrorMessage(errorCode, fallbackMessage = '') {
  return ciaFriendlyErrors[errorCode] || fallbackMessage;
}

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const toneStyles = {
    default: { background: 'rgba(0, 109, 182, 0.12)', color: 'var(--accent-hover)' },
    emerald: { background: 'var(--success-bg)', color: 'var(--success-text)' },
    orange: { background: 'var(--retrasada-bg)', color: 'var(--retrasada-text)' },
    red: { background: 'var(--error-bg)', color: 'var(--error-text)' },
  };

  return (
    <article
      className="border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div className="flex items-center gap-3">
        <span className="p-3" style={{ ...(toneStyles[tone] || toneStyles.default), borderRadius: 'var(--radius-badge, 0px)' }}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text)' }}>
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function Calificaciones({
  calificaciones = [],
  errorCIA,
  errorCIACode,
  lastSyncCIA,
  loadingCIA,
  onNavigate,
  onSyncCIA,
}) {
  const materias = Array.isArray(calificaciones) ? calificaciones : [];
  const aprobadas = materias.filter((materia) => getMateriaStatus(materia) === 'aprobada').length;
  const enRiesgo = materias.filter((materia) => getMateriaStatus(materia) === 'en_riesgo').length;
  const reprobadas = materias.filter((materia) => getMateriaStatus(materia) === 'reprobada').length;
  const numericAverages = materias
    .map((materia) => (typeof materia.promedio === 'number' ? materia.promedio : null))
    .filter((value) => value !== null);
  const averageGeneral =
    numericAverages.length > 0
      ? numericAverages.reduce((sum, value) => sum + value, 0) / numericAverages.length
      : null;
  const friendlyCIAError = getFriendlyCIAErrorMessage(errorCIACode, errorCIA);
  const credentialError =
    ciaSettingsErrorCodes.has(errorCIACode) ||
    /credenciales cia|cia inválidas|cia no configuradas/i.test(errorCIA || '');

  return (
    <div className="space-y-6">
      {friendlyCIAError ? (
        <div
          className="flex items-start justify-between gap-4 border px-4 py-4 text-sm"
          style={{
            borderColor: 'var(--error-border)',
            background: 'var(--error-bg)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
            <div className="space-y-1">
              <p>{friendlyCIAError}</p>
              {credentialError ? (
                <p className="text-xs" style={{ opacity: 0.85 }}>
                  Revisa tus credenciales CIA desde Ajustes.
                </p>
              ) : null}
            </div>
          </div>
          {credentialError && typeof onNavigate === 'function' ? (
            <button
              type="button"
              onClick={() => onNavigate('ajustes')}
              className="border px-4 py-2 text-xs font-semibold transition"
              style={{
                borderColor: 'var(--error-border)',
                color: 'var(--error-text)',
                borderRadius: 'var(--radius-button, 0px)',
              }}
            >
              Ir a Ajustes
            </button>
          ) : null}
        </div>
      ) : null}

      <section
        className="border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 border px-3 py-1 text-xs uppercase tracking-[0.25em]"
              style={{
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius-badge, 0px)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
              CIA ITSON
            </div>
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
                Calificaciones
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                Consulta el registro académico del semestre actual desde el CIA con caché local,
                sincronización manual y acceso directo a tu información institucional.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={onSyncCIA}
              disabled={loadingCIA}
              className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loadingCIA ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              {loadingCIA ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <p
              className="text-xs uppercase tracking-[0.25em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {formatLastSync(lastSyncCIA)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={BookOpen} label="Total de materias" value={materias.length} />
        <StatCard icon={CheckCircle2} label="Materias aprobadas" value={aprobadas} tone="emerald" />
        <StatCard icon={AlertTriangle} label="Materias en riesgo" value={enRiesgo} tone="orange" />
        <StatCard icon={XCircle} label="Materias reprobadas" value={reprobadas} tone="red" />
        <StatCard
          icon={GraduationCap}
          label="Promedio general"
          value={averageGeneral === null ? '—' : formatGrade(averageGeneral)}
        />
      </section>

      {loadingCIA ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse border p-6"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
            >
              <div className="h-5 w-64 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="mt-4 h-4 w-40 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="mt-6 h-20 rounded" style={{ background: 'var(--bg-secondary)' }} />
            </div>
          ))}
        </div>
      ) : materias.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {materias.map((materia, index) => (
            <GradeCard key={`${materia.codigo || materia.clave || materia.nombre || 'materia'}-${index}`} materia={materia} />
          ))}
        </div>
      ) : (
        <div
          className="flex min-h-48 flex-col items-center justify-center border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
        >
          <BookOpen className="h-8 w-8" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
          <p className="mt-4 max-w-md text-sm leading-6" style={{ color: 'var(--text-normal)' }}>
            Las calificaciones finales estarán disponibles al cierre del semestre.
            Cuando CIA las publique, esta sección se activará automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}

export default Calificaciones;
