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

  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue.toFixed(1) : numericValue.toFixed(1);
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

function formatLastSync(lastSyncAt) {
  if (!lastSyncAt) {
    return 'Última sync: aún no disponible.';
  }

  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - syncDate.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) {
    return `Última sync: hace ${Math.max(1, diffMinutes)} minuto${diffMinutes === 1 ? '' : 's'}`;
  }

  const isToday = syncDate.toDateString() === now.toDateString();

  if (isToday) {
    return `Última sync: hoy ${new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(syncDate)}`;
  }

  return `Última sync: ${new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(syncDate)}`;
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
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-2xl p-3" style={toneStyles[tone] || toneStyles.default}>
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
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div className="space-y-1">
              <p>{friendlyCIAError}</p>
              {credentialError ? (
                <p className="text-xs text-red-200/80">
                  Revisa tus credenciales CIA desde Ajustes.
                </p>
              ) : null}
            </div>
          </div>
          {credentialError && typeof onNavigate === 'function' ? (
            <button
              type="button"
              onClick={() => onNavigate('ajustes')}
              className="rounded-xl border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              Ir a Ajustes
            </button>
          ) : null}
        </div>
      ) : null}

      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
              <GraduationCap className="h-3.5 w-3.5" />
              CIA ITSON
            </div>
            <div>
              <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>
                Calificaciones
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              <RefreshCw className={`h-4 w-4 ${loadingCIA ? 'animate-spin' : ''}`} />
              {loadingCIA ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
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
              className="animate-pulse rounded-2xl border p-6"
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
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <BookOpen className="h-8 w-8 text-slate-600" />
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
