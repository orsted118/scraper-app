import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const statusLabels = {
  aprobada: 'Aprobada',
  en_riesgo: 'En riesgo',
  reprobada: 'Reprobada',
  sin_calificacion: 'Sin calificación',
};

const statusStyles = {
  aprobada: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'rgb(209, 250, 229)',
  },
  en_riesgo: {
    borderColor: 'rgba(249, 115, 22, 0.3)',
    background: 'rgba(249, 115, 22, 0.1)',
    color: 'rgb(254, 215, 170)',
  },
  reprobada: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'rgb(254, 202, 202)',
  },
  sin_calificacion: {
    borderColor: 'var(--border-normal)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-normal)',
  },
};

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
  return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1);
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
  const toneClasses = {
    default: 'bg-itson-blue/10 text-itson-blue',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    orange: 'bg-orange-500/10 text-orange-300',
  };

  return (
    <article
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-3">
        <span className={`rounded-2xl p-3 ${toneClasses[tone] || toneClasses.default}`}>
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

function StatusBadge({ status }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
      style={statusStyles[status] || statusStyles.sin_calificacion}
    >
      {statusLabels[status] || statusLabels.sin_calificacion}
    </span>
  );
}

function PartialChip({ parcial, calificacion }) {
  const numericValue = calificacion === null ? null : Number(calificacion);

  const toneClasses =
    numericValue === null
      ? ''
      : numericValue >= 70
        ? 'bg-emerald-500/20 text-emerald-300'
        : numericValue >= 60
          ? 'bg-orange-500/20 text-orange-300'
          : 'bg-red-500/20 text-red-300';
  const toneStyle = numericValue === null
    ? {
      borderColor: 'var(--border-normal)',
      background: 'var(--bg-tertiary)',
      color: 'var(--text-muted)',
    }
    : undefined;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClasses}`}
      style={toneStyle}
    >
      <span>{parcial}</span>
      <span>{formatGrade(calificacion)}</span>
    </span>
  );
}

function GradeCard({ materia }) {
  const partials = Array.isArray(materia.calificaciones) && materia.calificaciones.length > 0
    ? materia.calificaciones
    : [{ parcial: 'Final', calificacion: null }];

  return (
    <article
      className="rounded-2xl border p-6 shadow-lg shadow-slate-950/20"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
              {materia.nombre || 'Materia sin nombre'}
            </h3>
            <p className="text-sm text-slate-400">{materia.clave || 'Clave no disponible'}</p>
          </div>
          <p className="text-sm text-slate-400">
            {materia.profesor || 'Profesor no visible en CIA'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge status={materia.estado} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {partials.map((item) => (
          <PartialChip
            key={`${materia.clave || materia.nombre}-${item.parcial}`}
            parcial={item.parcial}
            calificacion={item.calificacion}
          />
        ))}
      </div>

      <div
        className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <p className="text-sm text-slate-400">
          Promedio:{' '}
          <span style={{ color: 'var(--text-strong)' }}>
            {materia.promedio === null || materia.promedio === undefined ? '—' : formatGrade(materia.promedio)}
          </span>
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          CIA ITSON · semestre actual
        </p>
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
  const aprobadas = materias.filter((materia) => materia.estado === 'aprobada').length;
  const enRiesgo = materias.filter((materia) => materia.estado === 'en_riesgo').length;
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Total de materias" value={materias.length} />
        <StatCard icon={CheckCircle2} label="Materias aprobadas" value={aprobadas} tone="emerald" />
        <StatCard icon={AlertTriangle} label="Materias en riesgo" value={enRiesgo} tone="orange" />
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
        <div className="space-y-4">
          {materias.map((materia, index) => (
            <GradeCard key={`${materia.clave || materia.nombre || 'materia'}-${index}`} materia={materia} />
          ))}
        </div>
      ) : (
        <div
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
        >
          <BookOpen className="h-8 w-8 text-slate-600" />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-normal)' }}>
            No hay materias disponibles para mostrar.
          </p>
        </div>
      )}
    </div>
  );
}

export default Calificaciones;
