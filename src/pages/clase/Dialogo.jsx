import { useEffect, useRef } from 'react';

const ENFOCABLES = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Base de todo lo que se abre encima de la página: confirmaciones y el visor de
// capturas. Lo que un overlay suelto no hacía y un teclado necesita: el foco
// entra al abrir, no se escapa con Tab, Esc cierra y al cerrar vuelve a donde
// estaba. `bloqueado` es para cuando hay una operación en curso: cerrar a mitad
// de un borrado dejaba la UI sin saber cómo terminó.
export default function Dialogo({
  etiquetadoPor, descritoPor, etiqueta, onCerrar, bloqueado = false,
  fondo = 'rgba(0, 0, 0, 0.4)', className = '', style, onKeyDown, children,
}) {
  const cajaRef = useRef(null);

  useEffect(() => {
    const previo = document.activeElement;
    const caja = cajaRef.current;
    const inicial = caja?.querySelector('[data-autofocus]') || caja?.querySelector(ENFOCABLES) || caja;
    inicial?.focus();

    return () => {
      if (previo instanceof HTMLElement && document.contains(previo)) previo.focus();
    };
  }, []);

  const alTeclear = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!bloqueado) onCerrar();
      return;
    }

    if (event.key !== 'Tab') return;

    const enfocables = Array.from(cajaRef.current.querySelectorAll(ENFOCABLES));

    if (enfocables.length === 0) {
      event.preventDefault();
      return;
    }

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];

    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      style={{ background: fondo }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !bloqueado) onCerrar();
      }}
    >
      <div
        ref={cajaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={etiquetadoPor}
        aria-describedby={descritoPor}
        aria-label={etiquetadoPor ? undefined : etiqueta}
        tabIndex={-1}
        className={`outline-none ${className}`}
        style={style}
        onKeyDown={alTeclear}
      >
        {children}
      </div>
    </div>
  );
}
