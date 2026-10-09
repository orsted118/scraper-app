import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, GraduationCap, RefreshCw } from 'lucide-react';
import { formatLastSync } from '../utils/formatLastSync';

// Códigos que el usuario puede resolver él mismo yendo a Ajustes. El resto son
// fallas del portal y mandarlo a Ajustes por ellas solo lo desvía.
const CODIGOS_DE_AJUSTES = new Set([
  'CIA_NO_CREDENTIALS',
  'CIA_NO_USER',
  'CIA_NO_PASSWORD',
  'CIA_LOGIN_FAILED',
]);

const ESTADOS = {
  aprobada: { etiqueta: 'Aprobada', texto: 'var(--success-text)', borde: 'var(--success-border)' },
  acreditada: { etiqueta: 'Acreditada', texto: 'var(--success-text)', borde: 'var(--success-border)' },
  reprobada: { etiqueta: 'Reprobada', texto: 'var(--error-text)', borde: 'var(--error-border)' },
  no_acreditada: { etiqueta: 'No acreditada', texto: 'var(--error-text)', borde: 'var(--error-border)' },
  sin_calificacion: { etiqueta: 'Sin calificar', texto: 'var(--text-muted)', borde: 'var(--border-subtle)' },
};

const MONO = { fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' };

function formatGrade(materia) {
  if (materia.literal) return materia.literal;
  if (!Number.isFinite(materia.calificacion)) return '—';
  return String(materia.calificacion);
}

function Header({ onSync, loading, timestamp, stale }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}>
          Calificaciones
        </h1>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Registro académico oficial del CIA
          {timestamp ? ` · ${formatLastSync(new Date(timestamp).toISOString())}` : ''}
          {stale ? ' · sin actualizar' : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={onSync}
        disabled={loading}
        className="flex items-center gap-2 border px-3 py-2 text-xs uppercase disabled:opacity-50"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-normal)',
          letterSpacing: '0.1em',
          borderRadius: 'var(--radius-card, 0px)',
        }}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Sincronizando' : 'Sincronizar'}
      </button>
    </div>
  );
}

function StatCard({ label, value, hint, tone }) {
  return (
    <div
      className="border px-4 py-3"
      style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <p className="text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        {label}
      </p>
      <p className="mt-1 text-2xl" style={{ ...MONO, color: tone || 'var(--text-strong)' }}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function EmptyState({ title, detail, action }) {
  return (
    <div
      className="flex flex-col items-center gap-3 border border-dashed px-6 py-12 text-center"
      style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <GraduationCap size={28} style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-strong)' }}>{title}</p>
      <p className="max-w-sm text-xs" style={{ color: 'var(--text-muted)' }}>{detail}</p>
      {action}
    </div>
  );
}

// Expediente completo de la carrera, del PDF del RPA. Es global, no del ciclo:
// va en su propia franja para que no se confunda con las métricas de arriba.
function Expediente({ datos }) {
  const { creditos, asignaturas } = datos;

  const campos = [
    { label: 'Promedio global', valor: datos.promedioGlobal?.toFixed(3), hint: 'solo materias aprobadas' },
    { label: 'Avance', valor: `${datos.avance}%`, hint: asignaturas ? `${asignaturas.acreditadas} de ${asignaturas.obligatorias} materias` : null },
    { label: 'Créditos', valor: creditos ? creditos.acreditados.toFixed(2) : '—', hint: creditos ? `de ${creditos.obligatorios.toFixed(2)} · faltan ${creditos.faltan.toFixed(2)}` : null },
    { label: 'Reprobadas', valor: datos.reprobadas, hint: `índice ${datos.indiceReprobacion}%` },
  ];

  return (
    <div
      className="border px-4 py-4"
      style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          Expediente de la carrera
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Reporte de Progreso Académico
        </p>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {campos.map((campo) => (
          <div key={campo.label}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{campo.label}</p>
            <p className="text-lg" style={{ ...MONO, color: 'var(--text-strong)' }}>{campo.valor ?? '—'}</p>
            {campo.hint ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{campo.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TablaCiclo({ ciclo }) {
  // El profesor sale del horario, que solo cubre el ciclo en curso: en los
  // cerrados la columna quedaría entera en guiones.
  const hayProfesores = ciclo.materias.some((m) => m.profesor);
  const columnas = hayProfesores
    ? ['Curso', 'Materia', 'Profesor', 'Calificación', 'Créditos']
    : ['Curso', 'Materia', 'Calificación', 'Créditos'];
  const alineaDerechaDesde = hayProfesores ? 3 : 2;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }}>
            {columnas.map((head, index) => (
              <th
                key={head}
                className={`border-b pb-2 font-semibold uppercase ${index >= alineaDerechaDesde ? 'text-right' : 'text-left'}`}
                style={{ borderColor: 'var(--border-subtle)', letterSpacing: '0.1em' }}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ciclo.materias.map((materia) => {
            const estado = ESTADOS[materia.estado] || ESTADOS.sin_calificacion;

            return (
              <tr
                key={`${ciclo.id}-${materia.codigo}`}
                className="border-b last:border-b-0"
                style={{ borderColor: 'var(--border-subtle)', borderLeft: `3px solid ${estado.borde}` }}
              >
                <td className="py-2 pl-3 text-left" style={{ ...MONO, color: 'var(--text-muted)' }}>
                  {materia.codigo}
                </td>
                <td className="py-2 text-left" style={{ color: 'var(--text-normal)' }}>
                  {materia.nombre}
                  <span className="ml-2 text-xs" style={{ color: estado.texto }}>{estado.etiqueta}</span>
                </td>
                {hayProfesores ? (
                  <td className="py-2 text-left" style={{ color: 'var(--text-muted)' }}>
                    {materia.profesor || '—'}
                  </td>
                ) : null}
                <td className="py-2 text-right" style={{ ...MONO, color: estado.texto }}>
                  {formatGrade(materia)}
                </td>
                <td className="py-2 pr-3 text-right" style={{ ...MONO, color: 'var(--text-muted)' }}>
                  {Number.isFinite(materia.unidades) ? materia.unidades.toFixed(2) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// `calificaciones` es el payload completo del handler, no un array de materias:
// { schemaVersion, timestamp, cicloActual, ciclos: [...], expediente }.
function Calificaciones({
  calificaciones: data = null,
  errorCIA = '',
  errorCIACode = '',
  loadingCIA = false,
  onNavigate,
  onSyncCIA,
}) {
  const ciclos = useMemo(() => (Array.isArray(data?.ciclos) ? data.ciclos : []), [data]);
  const [cicloId, setCicloId] = useState(null);

  const cicloActivo = useMemo(
    () => ciclos.find((c) => c.id === cicloId) || ciclos.find((c) => c.id === data?.cicloActual) || ciclos[0],
    [ciclos, cicloId, data],
  );

  const resumen = useMemo(() => {
    const materias = cicloActivo?.materias || [];
    return {
      aprobadas: materias.filter((m) => m.estado === 'aprobada' || m.estado === 'acreditada').length,
      reprobadas: materias.filter((m) => m.estado === 'reprobada' || m.estado === 'no_acreditada').length,
      sinCalificar: materias.filter((m) => m.estado === 'sin_calificacion').length,
    };
  }, [cicloActivo]);

  const irAAjustes = CODIGOS_DE_AJUSTES.has(errorCIACode) && onNavigate;
  const header = (
    <Header onSync={onSyncCIA} loading={loadingCIA} timestamp={data?.timestamp} stale={data?.stale} />
  );

  // Solo es pantalla de error si además no hay nada que mostrar: con caché vieja
  // el error se degrada a un aviso arriba de los datos.
  if (errorCIA && !ciclos.length) {
    return (
      <div className="space-y-6">
        {header}
        <div
          className="border px-4 py-4 text-sm"
          style={{
            borderColor: 'var(--error-border)',
            background: 'var(--error-bg)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <p>{errorCIA}</p>
          {irAAjustes ? (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="mt-3 border px-3 py-1.5 text-xs uppercase"
              style={{ borderColor: 'var(--error-border)', color: 'var(--error-text)', letterSpacing: '0.1em' }}
            >
              Ir a Ajustes
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (loadingCIA && !ciclos.length) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          title="Consultando el CIA…"
          detail="Entrando a Mis Calificaciones y recorriendo cada ciclo del portal."
        />
      </div>
    );
  }

  if (!ciclos.length) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          title="Sin calificaciones sincronizadas"
          detail="Sincronizá para traer tu registro académico del CIA."
          action={(
            <button
              type="button"
              onClick={onSyncCIA}
              className="mt-1 border px-3 py-1.5 text-xs uppercase"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-normal)', letterSpacing: '0.1em' }}
            >
              Sincronizar ahora
            </button>
          )}
        />
      </div>
    );
  }

  const expediente = data?.expediente;

  return (
    <div className="space-y-6">
      {header}

      {errorCIA ? (
        <div
          className="border px-4 py-3 text-xs"
          style={{
            borderColor: 'var(--error-border)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <AlertCircle size={14} className="mr-2 inline align-text-bottom" />
          {errorCIA} Se muestran los últimos datos guardados.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Promedio del ciclo"
          value={Number.isFinite(cicloActivo?.promedio) ? cicloActivo.promedio.toFixed(2) : '—'}
          hint={cicloActivo?.enCurso ? 'Parcial: ciclo en curso' : 'Oficial'}
        />
        <StatCard label="Aprobadas" value={resumen.aprobadas} tone="var(--success-text)" />
        <StatCard label="Reprobadas" value={resumen.reprobadas} tone={resumen.reprobadas ? 'var(--error-text)' : undefined} />
        <StatCard label="Sin calificar" value={resumen.sinCalificar} />
      </div>

      {expediente ? <Expediente datos={expediente} /> : null}

      <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {ciclos.map((ciclo) => {
          const activo = ciclo.id === cicloActivo?.id;

          return (
            <button
              key={ciclo.id}
              type="button"
              onClick={() => setCicloId(ciclo.id)}
              className="relative px-3 py-2 text-xs"
              style={{ color: activo ? 'var(--text-strong)' : 'var(--text-muted)' }}
            >
              {ciclo.nombre}
              {activo ? (
                <motion.div
                  layoutId="ciclo-activo"
                  className="absolute inset-x-0 bottom-0 h-px"
                  style={{ background: 'var(--accent)' }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {cicloActivo?.enCurso ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Ciclo en curso: las calificaciones oficiales se publican al cierre del semestre.
        </p>
      ) : null}

      {cicloActivo ? <TablaCiclo ciclo={cicloActivo} /> : null}
    </div>
  );
}

export default Calificaciones;
