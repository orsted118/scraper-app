import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN_WIDTH = 200;
// Margen contra el borde del viewport para que el menú no quede pegado.
const EDGE_GAP = 8;

// Menú contextual de pista. No decide qué acciones existen: el caller arma el
// array `actions` y este componente solo lo dibuja. Esa separación es lo que
// permite que la lista y la cola muestren menús distintos, y que más adelante
// se agreguen entradas sin tocar este archivo.
//
// Sin framer a propósito: un menú contextual tiene que sentirse instantáneo, y
// el render condicional puro evita cualquier enredo de AnimatePresence.
function TrackContextMenu({ actions = [], onClose, x, y }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // useLayoutEffect y no useEffect: mide y corrige antes del paint, si no el
  // menú se ve un frame desbordado antes de acomodarse.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const { width, height } = menu.getBoundingClientRect();
    const overflowsRight = x + width > window.innerWidth - EDGE_GAP;
    const overflowsBottom = y + height > window.innerHeight - EDGE_GAP;

    setPosition({
      left: overflowsRight ? Math.max(EDGE_GAP, x - width) : x,
      top: overflowsBottom ? Math.max(EDGE_GAP, y - height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    // Scroll cierra: si no, el menú queda flotando anclado a una fila que ya se
    // movió y las acciones apuntarían a algo que no está debajo del cursor.
    const onScroll = () => onClose();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [onClose]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Acciones de la pista"
      className="fixed z-50 border py-1"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        minWidth: `${MIN_WIDTH}px`,
        borderColor: 'var(--border)',
        // --bg-card es translúcido y el menú flota sobre la lista: necesita
        // superficie opaca para no leerse encima de los títulos.
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      {actions.map(({ key, label, Icon, onClick, disabled, separated }) => (
        <button
          key={key}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            onClose();
            onClick?.();
          }}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
            separated ? 'mt-1 border-t pt-2' : ''
          }`}
          style={{
            color: 'var(--text-normal)',
            borderTopColor: separated ? 'var(--border-subtle)' : undefined,
          }}
          onMouseEnter={(event) => {
            if (disabled) return;
            event.currentTarget.style.background = 'var(--bg-tertiary)';
            event.currentTarget.style.color = 'var(--text-strong)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
            event.currentTarget.style.color = 'var(--text-normal)';
          }}
        >
          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          {label}
        </button>
      ))}
    </div>
  );
}

export default TrackContextMenu;
