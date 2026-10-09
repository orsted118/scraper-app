import { AlertTriangle, Circle, GitMerge, Pencil, Trash2 } from 'lucide-react';

import EditorTituloMateria from './EditorTituloMateria';
import { duracionLegible, etiquetaSesion, nombreMateria, rangoHorario } from './formato';

export default function FilaSesion({ sesion, sugerencia, edicion, onEmpezarEdicion, onAbrir, onPedirBorrado, onPedirUnion }) {
  // Separador por token y no con `divide-y`: sin color de borde por defecto en
  // tailwind.config, el divide pinta un gris fijo que no sigue el tema.
  const separador = { borderColor: 'var(--border-subtle)' };

  if (edicion.activa) {
    return (
      <li className="border-t py-4 first:border-t-0" style={separador}>
        <EditorTituloMateria {...edicion.props} />
      </li>
    );
  }

  const etiqueta = etiquetaSesion(sesion);
  const materia = nombreMateria(sesion.materia);
  const partes = Array.isArray(sesion.partes) ? sesion.partes.length : 0;
  const detalles = [
    rangoHorario(sesion),
    duracionLegible(sesion),
    `${sesion.segmentos ?? 0} segmentos`,
    partes > 0 ? `${partes + 1} partes unidas` : null,
  ].filter(Boolean).join(' · ');

  return (
    <li className="border-t py-3 first:border-t-0" style={separador}>
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" data-sesion-id={sesion.id} onClick={() => onAbrir(sesion.id)}>
          <span className="block truncate text-sm" style={{ color: 'var(--text-strong)' }}>{etiqueta}</span>
          <span className="block truncate text-xs" style={{ color: 'var(--text-muted)' }}>
            {sesion.titulo
              ? (materia ? [materia, sesion.materia?.profesor].filter(Boolean).join(' · ') : 'Sin materia')
              : (sesion.materia?.profesor || (materia ? '' : 'Sin materia'))}
          </span>
          <span className="mt-0.5 block text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {detalles}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {sesion.estado === 'error' ? (
            <span className="flex items-center gap-1 px-1 text-xs" style={{ color: 'var(--error-text)' }}>
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Terminó con error</span>
            </span>
          ) : null}

          {/* La sesión realmente en vivo ya se filtró antes de llegar acá. Si una
              fila igual dice "grabando" es un fantasma de un cierre sucio de la
              app: tiene que poder renombrarse o borrarse como cualquier otra. */}
          {sesion.estado === 'grabando' ? (
            <span className="flex items-center gap-1 px-1 text-xs" style={{ color: 'var(--retrasada-text)' }}>
              <Circle className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />
              <span>Cierre incompleto</span>
            </span>
          ) : null}

          <button
            type="button"
            className="p-2"
            style={{ color: 'var(--text-muted)' }}
            aria-label={`Renombrar ${etiqueta}`}
            title="Renombrar"
            data-editar-id={sesion.id}
            onClick={() => onEmpezarEdicion(sesion)}
          >
            <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="p-2"
            style={{ color: 'var(--text-muted)' }}
            aria-label={`Eliminar ${etiqueta}`}
            title="Eliminar"
            onClick={() => onPedirBorrado(sesion)}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      {sugerencia ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <GitMerge className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <span>
            {sugerencia.pausaMin === 0
              ? `Empezó justo cuando terminó «${etiquetaSesion(sugerencia.base)}».`
              : `Empezó ${sugerencia.pausaMin} min después de que terminó «${etiquetaSesion(sugerencia.base)}».`}
            {' '}¿Es la misma clase?
          </span>
          <button
            type="button"
            className="btn-outline px-2.5 py-1 text-xs"
            aria-label={`Unir ${etiqueta} con ${etiquetaSesion(sugerencia.base)}`}
            onClick={() => onPedirUnion(sesion, sugerencia.base.id)}
          >
            Unir
          </button>
        </div>
      ) : null}
    </li>
  );
}
