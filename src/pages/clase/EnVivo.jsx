import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, Circle, Loader2, Pencil, Square } from 'lucide-react';

import EditorTituloMateria from './EditorTituloMateria';
import Panel from './Panel';
import Rotulo from './Rotulo';
import Transcripcion from './Transcripcion';
import { nombreMateria } from './formato';

// Distancia al final (px) por debajo de la cual se considera que el usuario
// está siguiendo la clase y no leyendo algo de más arriba.
const PEGADO_AL_FINAL = 48;

export default function EnVivo({ estado, lineas, onDetener, deteniendo, edicion }) {
  const listaRef = useRef(null);
  const [siguiendo, setSiguiendo] = useState(true);
  const id = useId();

  // Solo se baja sola si el usuario ya estaba abajo. Antes era un scrollIntoView
  // en cada tick: si estabas releyendo lo que dictaron hace diez minutos, la
  // página te arrancaba de ahí cada 5 s — y además movía la página entera, no
  // solo la lista.
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista || !siguiendo) return;
    lista.scrollTop = lista.scrollHeight;
  }, [lineas.length, siguiendo]);

  const alDesplazar = () => {
    const lista = listaRef.current;
    if (!lista) return;
    setSiguiendo(lista.scrollHeight - lista.scrollTop - lista.clientHeight < PEGADO_AL_FINAL);
  };

  const irAlFinal = () => {
    const lista = listaRef.current;
    if (!lista) return;
    lista.scrollTop = lista.scrollHeight;
    setSiguiendo(true);
  };

  const materia = nombreMateria(estado.materia);
  const titular = estado.titulo || materia || 'Clase sin título';
  const secundario = estado.titulo && materia
    ? [materia, estado.materia?.profesor].filter(Boolean).join(' · ')
    : (estado.materia?.profesor || 'El horario no tiene ninguna clase a esta hora');

  return (
    <div className="space-y-4">
      <Panel as="section" acento aria-labelledby={`${id}-titulo`}>
        {edicion.activa ? (
          <EditorTituloMateria {...edicion.props} />
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 motion-safe:animate-pulse" fill="var(--accent)" strokeWidth={0} aria-hidden="true" />
                <Rotulo>Grabando</Rotulo>
              </div>
              <h3 id={`${id}-titulo`} className="mt-2 text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
                {titular}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {secundario}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-2 px-4 py-2 text-sm"
                data-editar-id={estado.id}
                onClick={edicion.onEmpezar}
              >
                <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                Nombrar
              </button>
              <button
                type="button"
                className="btn-outline flex items-center gap-2 px-5 py-2 text-sm"
                onClick={onDetener}
                disabled={deteniendo}
                aria-busy={deteniendo || undefined}
              >
                {deteniendo
                  ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  : <Square className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                {deteniendo ? 'Cerrando el último tramo' : 'Detener'}
              </button>
            </div>
          </div>
        )}

        <dl className="mt-5 flex flex-wrap gap-8" style={{ fontFamily: 'var(--font-mono)' }}>
          {[
            ['Transcurrido', `${estado.minutos} min`],
            ['Segmentos', estado.segmentos],
            ['Capturas', estado.frames],
            ['Modelo', estado.modelo],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <Rotulo as="dt">{rotulo}</Rotulo>
              <dd className="mt-1 text-xl" style={{ color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{valor}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {estado.atrasado ? (
        <div
          role="status"
          className="flex items-start gap-3 border p-4"
          style={{
            borderColor: 'var(--retrasada-border)',
            background: 'var(--retrasada-bg)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--retrasada-text)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--retrasada-text)' }}>
            La transcripción se está atrasando: el audio entra más rápido de lo que el modelo lo procesa.
            No se pierde nada — el audio queda grabado y termina de transcribirse — pero para la próxima
            clase conviene bajar a <span style={{ fontFamily: 'var(--font-mono)' }}>small</span>.
          </p>
        </div>
      ) : null}

      <Panel as="section" aria-labelledby={`${id}-dice`}>
        <div className="flex items-center justify-between gap-3">
          <Rotulo as="h4" id={`${id}-dice`}>Lo que va diciendo</Rotulo>
          {!siguiendo && lineas.length > 0 ? (
            <button type="button" className="btn-outline flex items-center gap-1.5 px-3 py-1 text-xs" onClick={irAlFinal}>
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              Ir a lo último
            </button>
          ) : null}
        </div>

        {lineas.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            El primer tramo tarda entre 20 y 40 segundos en salir: se junta audio hasta un silencio
            para no cortar una palabra al medio.
          </p>
        ) : (
          <div className="mt-4">
            <Transcripcion ref={listaRef} lineas={lineas} vivo etiqueta="Transcripción en vivo" onScroll={alDesplazar} />
          </div>
        )}
      </Panel>
    </div>
  );
}
