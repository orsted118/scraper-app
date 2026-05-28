import {
  CheckCircle2,
  ClipboardList,
  Code2,
  FlaskConical,
  UserRound,
  XCircle,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react';

const STATUS_META = {
  aprobada: {
    label: 'Aprobada',
    icon: CheckCircle2,
    color: 'var(--success-text)',
    bg: 'var(--success-bg)',
    border: 'var(--success-border)',
  },
  en_riesgo: {
    label: 'En riesgo',
    icon: AlertTriangle,
    color: 'var(--retrasada-text)',
    bg: 'var(--retrasada-bg)',
    border: 'var(--retrasada-border)',
  },
  reprobada: {
    label: 'Reprobada',
    icon: XCircle,
    color: 'var(--error-text)',
    bg: 'var(--error-bg)',
    border: 'var(--error-border)',
  },
  sin_calificacion: {
    label: 'Sin calificación',
    icon: MinusCircle,
    color: 'var(--closed-text)',
    bg: 'var(--closed-bg)',
    border: 'var(--closed-border)',
  },
};

function normalizeGrade(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Number(value);
}

function getMateriaStatus(materia) {
  if (materia?.estado && STATUS_META[materia.estado]) {
    return materia.estado;
  }

  const promedio = normalizeGrade(materia?.promedio);
  const hasGrades = Array.isArray(materia?.calificaciones)
    ? materia.calificaciones.some((item) => normalizeGrade(item.calificacion) !== null)
    : false;

  if (!hasGrades || promedio === null) return 'sin_calificacion';
  if (promedio >= 7) return 'aprobada';
  if (promedio >= 6) return 'en_riesgo';
  return 'reprobada';
}

function formatGrade(value) {
  const numericValue = normalizeGrade(value);

  if (numericValue === null) {
    return '--';
  }

  return numericValue.toFixed(1);
}

function getGradeColor(value) {
  const numericValue = normalizeGrade(value);

  if (numericValue === null) {
    return 'var(--text-muted)';
  }

  if (numericValue >= 7) {
    return 'var(--success-text)';
  }

  if (numericValue >= 6) {
    return 'var(--retrasada-text)';
  }

  return 'var(--error-text)';
}

function getGradeLabel(item) {
  return item?.etiqueta || item?.parcial || item?.nombre || 'Parcial';
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.sin_calificacion;
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
      style={{
        background: meta.bg,
        borderColor: meta.border,
        color: meta.color,
      }}
    >
      <Icon className="h-4 w-4" />
      {meta.label}
    </span>
  );
}

function GradeChip({ grade }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-normal)',
      }}
      title={grade?.nombre || getGradeLabel(grade)}
    >
      <span>{getGradeLabel(grade)}:</span>
      <strong style={{ color: getGradeColor(grade?.calificacion) }}>
        {formatGrade(grade?.calificacion)}
      </strong>
    </span>
  );
}

function EmptyGrades() {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{
      background: 'var(--bg-secondary)',
      borderColor: 'var(--border-subtle)',
    }}>
      <ClipboardList className="h-5 w-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
          Sin calificaciones registradas aún
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          El profesor aún no ha subido calificaciones.
        </p>
      </div>
    </div>
  );
}

function ComponentRow({ component, index }) {
  const isLab = /lab/i.test(component?.tipo || '');
  const label = component?.tipo || (index === 0 ? 'Teoría' : 'Laboratorio');
  const grades = Array.isArray(component?.calificaciones) ? component.calificaciones : [];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="inline-flex min-w-24 justify-center rounded-lg px-3 py-1.5 text-xs font-semibold"
        style={{
          background: isLab ? 'var(--success-bg)' : 'rgba(0, 109, 182, 0.16)',
          color: isLab ? 'var(--success-text)' : 'var(--accent-hover)',
          border: `1px solid ${isLab ? 'var(--success-border)' : 'rgba(0, 109, 182, 0.35)'}`,
        }}
      >
        {label}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {grades.length > 0 ? grades.map((grade) => (
          <GradeChip key={`${label}-${getGradeLabel(grade)}`} grade={grade} />
        )) : <EmptyGrades />}
      </div>

      <div className="ml-auto min-w-24 text-right">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Promedio
        </p>
        <p className="text-2xl font-bold leading-none" style={{ color: getGradeColor(component?.promedio) }}>
          {formatGrade(component?.promedio)}
        </p>
      </div>
    </div>
  );
}

function GradeList({ materia }) {
  const hasComponents =
    materia?.tieneComponentes &&
    Array.isArray(materia.componentes) &&
    materia.componentes.length > 0;
  const grades = Array.isArray(materia?.calificaciones) ? materia.calificaciones : [];

  if (hasComponents) {
    return (
      <div className="space-y-4">
        {materia.componentes.map((component, index) => (
          <div key={`${component?.tipo || 'component'}-${index}`}>
            {index > 0 ? (
              <div className="mb-4 h-px w-full" style={{ background: 'var(--border-subtle)' }} />
            ) : null}
            <ComponentRow component={component} index={index} />
          </div>
        ))}
      </div>
    );
  }

  if (grades.length === 0) {
    return <EmptyGrades />;
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {grades.map((grade) => (
        <GradeChip key={getGradeLabel(grade)} grade={grade} />
      ))}
    </div>
  );
}

function GradeCard({ materia }) {
  const status = getMateriaStatus(materia);
  const meta = STATUS_META[status] || STATUS_META.sin_calificacion;
  const Icon = materia?.tieneComponentes ? FlaskConical : Code2;
  const promedio = normalizeGrade(materia?.promedio);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-l-4 p-5 shadow-2xl shadow-black/10"
      style={{
        background: 'linear-gradient(135deg, var(--bg-card), rgba(15, 23, 42, 0.28))',
        borderColor: 'var(--border-subtle)',
        borderLeftColor: meta.color,
      }}
    >
      <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)_220px] xl:items-center">
        <div className="flex min-w-0 items-center gap-5">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${meta.color} 22%, transparent)`,
              boxShadow: `0 18px 42px color-mix(in srgb, ${meta.color} 12%, transparent)`,
            }}
          >
            <Icon className="h-10 w-10" style={{ color: 'var(--text-strong)' }} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
              {materia?.nombre || 'Materia sin nombre'}
            </h3>
            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--accent-hover)' }}>
              {materia?.codigo || materia?.clave || 'Código no disponible'}
            </p>
            <p className="mt-5 flex min-w-0 items-center gap-2 truncate text-sm" style={{ color: 'var(--text-muted)' }}>
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="truncate">{materia?.profesor || 'Instructor pendiente de sincronizar'}</span>
            </p>
          </div>
        </div>

        <div
          className="min-w-0 border-y py-5 xl:border-x xl:border-y-0 xl:px-7 xl:py-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <GradeList materia={materia} />
        </div>

        <div className="flex items-center justify-between gap-4 xl:flex-col xl:items-center xl:justify-center">
          <StatusBadge status={status} />
          <div className="text-right xl:text-center">
            <p className="text-sm" style={{ color: 'var(--text-normal)' }}>
              Promedio Final
            </p>
            <p className="text-5xl font-bold leading-none" style={{ color: promedio === null ? 'var(--text-muted)' : meta.color }}>
              {promedio === null ? '--' : formatGrade(promedio)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default GradeCard;
