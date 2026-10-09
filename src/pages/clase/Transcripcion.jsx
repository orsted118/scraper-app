import { forwardRef, memo } from 'react';

import { minutoSegundo, rangoCoincidencia } from './formato';

function Resaltado({ texto, termino }) {
  const rango = rangoCoincidencia(texto, termino);
  if (!rango) return texto;

  const [desde, hasta] = rango;

  return (
    <>
      {texto.slice(0, desde)}
      <mark style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>{texto.slice(desde, hasta)}</mark>
      {texto.slice(hasta)}
    </>
  );
}

// memo porque la lista crece sin parar y en vivo se refresca cada 5 s: sin esto
// el minuto 100 de una clase vuelve a renderizar 1.750 líneas para agregar una.
// `onMomento` tiene que llegar con identidad estable (useCallback en quien lo
// pasa) o el memo deja de servir.
const Linea = memo(function Linea({ inicio, texto, termino, activa, onMomento, idPrefijo }) {
  const sello = minutoSegundo(inicio);
  const estiloSello = { fontFamily: 'var(--font-mono)', color: activa ? 'var(--accent)' : 'var(--text-muted)' };

  return (
    <li
      id={idPrefijo ? `${idPrefijo}-${inicio}` : undefined}
      className="flex scroll-mt-3 gap-3 text-sm leading-relaxed"
      style={{
        color: 'var(--text-normal)',
        boxShadow: activa ? 'inset 3px 0 0 var(--accent)' : 'none',
        paddingLeft: activa ? '0.5rem' : 0,
      }}
      aria-current={activa ? 'true' : undefined}
    >
      {onMomento ? (
        <button
          type="button"
          className="shrink-0 self-start"
          style={{ ...estiloSello, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
          onClick={() => onMomento(inicio)}
          aria-label={`Ver la pantalla en el minuto ${sello}`}
        >
          {sello}
        </button>
      ) : (
        <span className="shrink-0" style={estiloSello}>{sello}</span>
      )}
      <span className="min-w-0">{termino ? <Resaltado texto={texto} termino={termino} /> : texto}</span>
    </li>
  );
});

// En vivo es un `log`: el rol que los lectores de pantalla ya entienden como
// "llegan renglones nuevos al final", sin releer lo anterior en cada tick.
const Transcripcion = forwardRef(function Transcripcion(
  { lineas, termino = '', activaInicio = null, onMomento = null, idPrefijo = null, vivo = false, etiqueta, className = 'max-h-96', onScroll },
  ref,
) {
  return (
    <ol
      ref={ref}
      className={`${className} space-y-2 overflow-y-auto pr-2`}
      role={vivo ? 'log' : undefined}
      aria-live={vivo ? 'polite' : undefined}
      aria-label={etiqueta}
      tabIndex={0}
      onScroll={onScroll}
    >
      {lineas.map((linea) => (
        <Linea
          key={`${linea.inicio}-${linea.fin}`}
          inicio={linea.inicio}
          texto={linea.texto}
          termino={termino}
          activa={activaInicio === linea.inicio}
          onMomento={onMomento}
          idPrefijo={idPrefijo}
        />
      ))}
    </ol>
  );
});

export default Transcripcion;
