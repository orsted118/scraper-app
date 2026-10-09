import { useId } from 'react';
import { Check, Loader2, X } from 'lucide-react';

import Rotulo from './Rotulo';

// El mismo formulario en la fila de la lista, en el detalle y en el panel en
// vivo. Es un <form> para que Enter guarde sin buscar el botón con el mouse, y
// Esc cancela desde cualquiera de los dos campos.
export default function EditorTituloMateria({
  titulo, materia, opciones, onCambiarTitulo, onCambiarMateria, onGuardar, onCancelar, guardando,
}) {
  const id = useId();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      aria-label="Editar título y materia"
      onSubmit={(event) => {
        event.preventDefault();
        if (!guardando) onGuardar();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || guardando) return;
        event.stopPropagation();
        onCancelar();
      }}
    >
      <div>
        <Rotulo as="label" htmlFor={`${id}-titulo`}>Título</Rotulo>
        <input
          id={`${id}-titulo`}
          type="text"
          className="field mt-1.5 w-full px-3 py-1.5 text-sm"
          placeholder="Ej. Clase 12 — repaso del parcial"
          value={titulo}
          maxLength={200}
          onChange={(event) => onCambiarTitulo(event.target.value)}
          autoFocus
        />
      </div>

      <div>
        <Rotulo as="label" htmlFor={`${id}-materia`}>Materia</Rotulo>
        <select
          id={`${id}-materia`}
          className="field mt-1.5 w-full px-3 py-1.5 text-sm"
          value={materia}
          onChange={(event) => onCambiarMateria(event.target.value)}
        >
          <option value="">Sin materia</option>
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>{opcion.nombre}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <span className="mr-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          Enter guarda · Esc cancela
        </span>
        <button type="button" className="btn-outline flex items-center gap-1 px-3 py-1.5 text-xs" onClick={onCancelar} disabled={guardando}>
          <X className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          Cancelar
        </button>
        <button type="submit" className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs" disabled={guardando} aria-busy={guardando || undefined}>
          {guardando
            ? <Loader2 className="h-3 w-3 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
            : <Check className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />}
          Guardar
        </button>
      </div>
    </form>
  );
}
