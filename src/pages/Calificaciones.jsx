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

const statusClasses = {
  aprobada: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  en_riesgo: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
  reprobada: 'border-red-500/30 bg-red-500/10 text-red-100',
  sin_calificacion: 'border-slate-700 bg-slate-800/60 text-slate-300',
};

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

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-itson-blue/10 text-itson-blue',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    orange: 'bg-orange-500/10 text-orange-300',
  };

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex items-center gap-3">
        <span className={`rounded-2xl p-3 ${toneClasses[tone] || toneClasses.default}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
        statusClasses[status] || statusClasses.sin_calificacion
      }`}
    >
      {statusLabels[status] || statusLabels.sin_calificacion}
    </span>
  );
}

function PartialChip({ parcial, calificacion }) {
  const numericValue = calificacion === null ? null : Number(calificacion);

  const toneClasses =
    numericValue === null
      ? 'border border-slate-700 bg-slate-700/50 text-slate-500'
      : numericValue >= 70
        ? 'bg-emerald-500/20 text-emerald-300'
        : numericValue >= 60
          ? 'bg-orange-500/20 text-orange-300'
          : 'bg-red-500/20 text-red-300';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClasses}`}>
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
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold text-white">{materia.nombre || 'Materia sin nombre'}</h3>
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <p className="text-sm text-slate-400">
          Promedio:{' '}
          <span className="text-slate-100">
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
  const credentialError = /credenciales cia|cia inválidas|cia no configuradas/i.test(errorCIA || '');

  return (
    <div className="space-y-6">
      {errorCIA ? (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <div className="space-y-1">
              <p>{errorCIA}</p>
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
              onClick={() => onNavigate('settings')}
              className="rounded-xl border border-red-300/30 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              Ir a Ajustes
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-itson-blue/30 bg-itson-blue/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-itson-blue-light">
              <GraduationCap className="h-3.5 w-3.5" />
              CIA ITSON
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-white">Calificaciones</h3>
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
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
              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
            >
              <div className="h-5 w-64 rounded bg-slate-800" />
              <div className="mt-4 h-4 w-40 rounded bg-slate-800" />
              <div className="mt-6 h-20 rounded bg-slate-900" />
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
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center">
          <BookOpen className="h-8 w-8 text-slate-600" />
          <p className="mt-4 text-sm text-slate-300">
            No hay materias disponibles para mostrar.
          </p>
        </div>
      )}
    </div>
  );
}

export default Calificaciones;
