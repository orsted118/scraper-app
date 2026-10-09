import { useId } from 'react';
import { Loader2, Mic, MonitorPlay } from 'lucide-react';

import Panel from './Panel';
import Rotulo from './Rotulo';

// Los márgenes salen de medir 120 s de clase real en un Ryzen 5 7520U. El margen
// es lo que importa en vivo: por debajo de ~2x, cualquier pico de CPU atrasa la
// transcripción y la cola ya no se recupera sola.
const MODELOS = [
  { id: 'tiny', label: 'tiny — 27x de margen, entiende poco' },
  { id: 'small', label: 'small — 5x de margen (recomendado)' },
  { id: 'medium', label: 'medium — 1.7x, se atrasa si la máquina está ocupada' },
];

export default function NuevaGrabacion({
  claseActual, modelo, onModelo, conPantalla, onConPantalla, onIniciar, iniciando,
  titulo, onTitulo, materiaSeleccion, onMateriaSeleccion, opciones,
}) {
  const id = useId();

  return (
    <Panel as="section" aria-labelledby={`${id}-titulo`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Rotulo>Nueva grabación</Rotulo>
          <h3 id={`${id}-titulo`} className="mt-2 text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
            {claseActual ? claseActual.nombre : 'No hay clase a esta hora'}
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {claseActual
              ? `${claseActual.profesor || 'sin profesor en el horario'} · ${claseActual.horaInicio} a ${claseActual.horaFin}`
              : 'Se puede grabar igual: elegí la materia abajo o dejala sin asignar.'}
          </p>
        </div>

        <button
          type="button"
          className="btn-primary flex items-center gap-2 px-6 py-3 text-sm"
          onClick={onIniciar}
          disabled={iniciando}
          aria-busy={iniciando || undefined}
        >
          {iniciando
            ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
            : <Mic className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
          {iniciando ? 'Cargando el modelo' : 'Empezar a grabar'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <Rotulo as="label" htmlFor={`${id}-nombre`}>Título (opcional)</Rotulo>
          <input
            id={`${id}-nombre`}
            type="text"
            className="field mt-2 w-full px-3 py-1.5 text-sm"
            placeholder="Ej. Clase 12 — repaso del parcial"
            value={titulo}
            maxLength={200}
            onChange={(event) => onTitulo(event.target.value)}
          />
        </div>

        <div>
          <Rotulo as="label" htmlFor={`${id}-materia`}>Materia</Rotulo>
          <select
            id={`${id}-materia`}
            className="field mt-2 w-full px-3 py-1.5 text-sm"
            value={materiaSeleccion}
            onChange={(event) => onMateriaSeleccion(event.target.value)}
          >
            <option value="__auto__">{claseActual ? `Automática — ${claseActual.nombre}` : 'Automática — ninguna clase ahora'}</option>
            <option value="">Sin materia</option>
            {opciones.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-4 flex flex-wrap items-end gap-6 border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <legend className="sr-only">Opciones de grabación</legend>
        <div>
          <Rotulo as="label" htmlFor={`${id}-modelo`}>Modelo</Rotulo>
          <select
            id={`${id}-modelo`}
            className="field mt-2 px-3 py-1.5 text-sm"
            value={modelo}
            onChange={(event) => onModelo(event.target.value)}
          >
            {MODELOS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm" style={{ color: 'var(--text-normal)' }}>
          <input type="checkbox" checked={conPantalla} onChange={(event) => onConPantalla(event.target.checked)} />
          <MonitorPlay className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Guardar capturas de la pantalla
        </label>
      </fieldset>

      <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        Se graba lo que suena en esta computadora, no el micrófono. Todo se queda en disco:
        el audio nunca sale de la máquina.
      </p>
    </Panel>
  );
}
