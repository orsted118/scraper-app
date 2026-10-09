import { ChevronLeft, ChevronRight, MessageSquareText, X } from 'lucide-react';

import Dialogo from './Dialogo';
import { minutoSegundo } from './formato';

// Visor a pantalla completa de una captura. Las flechas recorren la clase igual
// que los botones, y "Ver lo que se decía" lleva a la línea de la transcripción
// de ese minuto: la lámina sola no dice qué explicó la profe sobre ella.
export default function VisorCaptura({ capturas, indice, onCambiar, onCerrar, onVerTranscripcion }) {
  const captura = capturas[indice];
  const sello = minutoSegundo(captura.segundo);
  const esPrimera = indice === 0;
  const esUltima = indice === capturas.length - 1;

  const alTeclear = (event) => {
    if (event.key === 'ArrowLeft' && !esPrimera) {
      event.preventDefault();
      onCambiar(indice - 1);
      return;
    }

    if (event.key === 'ArrowRight' && !esUltima) {
      event.preventDefault();
      onCambiar(indice + 1);
    }
  };

  return (
    <Dialogo
      etiqueta={`Captura del minuto ${sello}, ${indice + 1} de ${capturas.length}`}
      onCerrar={onCerrar}
      onKeyDown={alTeclear}
      fondo="rgba(0, 0, 0, 0.75)"
      className="flex max-h-[92vh] w-full max-w-5xl flex-col border"
      style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          Minuto {sello} · {indice + 1} de {capturas.length}
        </p>
        <button type="button" className="p-1.5" onClick={onCerrar} aria-label="Cerrar el visor">
          <X className="h-4 w-4" strokeWidth={1.5} style={{ color: 'var(--text-strong)' }} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <img
          src={captura.url}
          alt={`Pantalla de la clase en el minuto ${sello}`}
          draggable="false"
          className="max-h-[72vh] w-auto object-contain"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          type="button"
          className="btn-outline flex items-center gap-1 px-3 py-1.5 text-xs"
          disabled={esPrimera}
          onClick={() => onCambiar(indice - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          Anterior
        </button>

        {onVerTranscripcion ? (
          <button
            type="button"
            className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
            onClick={() => onVerTranscripcion(captura.segundo)}
          >
            <MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            Ver lo que se decía
          </button>
        ) : null}

        <button
          type="button"
          className="btn-outline flex items-center gap-1 px-3 py-1.5 text-xs"
          disabled={esUltima}
          onClick={() => onCambiar(indice + 1)}
        >
          Siguiente
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </Dialogo>
  );
}
