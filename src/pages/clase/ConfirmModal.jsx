import { useId } from 'react';
import { Loader2 } from 'lucide-react';

import Dialogo from './Dialogo';

// Confirmación para lo irreversible (borrar) y lo que conviene pensar dos veces
// (unir). El foco arranca en Cancelar a propósito: Enter por reflejo no puede
// terminar borrando una clase. `children` es el hueco para el selector de
// "unir con cuál".
export default function ConfirmModal({
  titulo, descripcion, textoConfirmar = 'Confirmar', peligroso = false,
  procesando = false, deshabilitado = false, onConfirmar, onCancelar, children = null,
}) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const descripcionId = `${id}-descripcion`;

  return (
    <Dialogo
      etiquetadoPor={tituloId}
      descritoPor={descripcion ? descripcionId : undefined}
      onCerrar={onCancelar}
      bloqueado={procesando}
      className="w-full max-w-md border p-6"
      style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <p
        className="text-xs uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-mono)', color: peligroso ? 'var(--error-text)' : 'var(--accent)' }}
      >
        {peligroso ? 'No se puede deshacer' : 'Confirmar'}
      </p>
      <h3 id={tituloId} className="mt-2 text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
        {titulo}
      </h3>
      {descripcion ? (
        <p id={descripcionId} className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {descripcion}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={onCancelar} disabled={procesando} data-autofocus>
          Cancelar
        </button>
        <button
          type="button"
          className={peligroso ? 'px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}
          style={
            peligroso
              ? { border: '1px solid var(--error-border)', color: 'var(--error-text)', background: 'transparent', borderRadius: 'var(--radius-button, 0px)' }
              : undefined
          }
          onClick={onConfirmar}
          disabled={procesando || deshabilitado}
          aria-busy={procesando || undefined}
        >
          {procesando ? (
            <>
              <Loader2 className="mx-auto h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Procesando</span>
            </>
          ) : textoConfirmar}
        </button>
      </div>
    </Dialogo>
  );
}
