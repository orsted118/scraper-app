import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { EASE } from '../utils/motion';

const PANEL_WIDTH = 380;

// exit anima la MISMA propiedad que animate (x), y no opacity. AnimatePresence
// difiere el desmontaje hasta que el exit completa, y con initial={false} la
// opacidad nunca entra al set de propiedades que framer sigue: salir por ahí
// no completa nunca y el panel queda colgado en el DOM tapando media pantalla,
// sin forma de cerrarlo.

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—:——';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function QueueDrawer({ open, onClose }) {
  const reduced = useReducedMotion();
  const player = useMusicPlayer();
  // El índice de origen del drag vive en un ref y no en state: onDragStart y
  // onDrop ocurren en gestos distintos y el state llegaría viejo al drop.
  const dragFromRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const queue = player?.queue || [];
  const currentIndex = player?.currentIndex ?? -1;

  const handleDrop = (toIndex) => {
    const fromIndex = dragFromRef.current;
    dragFromRef.current = null;
    if (fromIndex === null || fromIndex === toIndex) return;
    player.reorderQueue(fromIndex, toIndex);
  };

  const panel = open ? (
    <motion.aside
      key="queue-panel"
      role="dialog"
      aria-label="Cola de reproducción"
      initial={reduced ? false : { x: PANEL_WIDTH }}
      animate={{ x: 0 }}
      exit={{ x: PANEL_WIDTH }}
      transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
      className="fixed inset-y-0 right-0 z-40 flex flex-col border-l"
      style={{
        width: `${PANEL_WIDTH}px`,
        borderLeftColor: 'var(--border-normal)',
        background: 'var(--bg)',
      }}
    >
            <header
              className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <h2
                  className="font-extrabold"
                  style={{
                    color: 'var(--text-strong)',
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '20px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Cola
                </h2>
                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {queue.length} pista{queue.length === 1 ? '' : 's'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar cola"
                title="Cerrar cola"
                className="shrink-0 p-2"
                style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {queue.length === 0 ? (
                <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                  La cola está vacía.
                </p>
              ) : (
                queue.map((track, index) => {
                  const isCurrent = index === currentIndex;

                  return (
                    <div
                      key={`${track.path}-${index}`}
                      draggable
                      onDragStart={() => {
                        dragFromRef.current = index;
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      className="group row-hover flex items-center gap-3 border-b px-4 py-2"
                      style={{
                        borderBottomColor: 'var(--border-subtle)',
                        borderLeftWidth: isCurrent ? '3px' : '0px',
                        borderLeftStyle: 'solid',
                        borderLeftColor: isCurrent ? 'var(--accent)' : 'transparent',
                        paddingLeft: isCurrent ? '13px' : '16px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => player.jumpTo(index)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className="truncate font-bold"
                          style={{
                            color: isCurrent ? 'var(--accent)' : 'var(--text-strong)',
                            fontFamily: 'var(--font-display, sans-serif)',
                            fontSize: '15px',
                            letterSpacing: '-0.01em',
                          }}
                          title={track.title}
                        >
                          {track.title}
                        </p>
                        <p
                          className="mt-0.5 truncate"
                          style={{
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '12px',
                          }}
                          title={track.artist}
                        >
                          {track.artist}
                        </p>
                      </button>

                      <p
                        className="shrink-0 text-xs"
                        style={{
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatDuration(track.duration)}
                      </p>

                      <button
                        type="button"
                        onClick={() => player.removeFromQueue(index)}
                        aria-label={`Quitar ${track.title} de la cola`}
                        title="Quitar de la cola"
                        className="shrink-0 p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
    </motion.aside>
  ) : null;

  return (
    <>
      {/* El overlay va fuera de AnimatePresence: sus hijos tienen que ser
          componentes motion directos y con key, y envolver dos elementos en un
          fragment le rompe el seguimiento de presencia. */}
      {open ? <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden="true" /> : null}

      <AnimatePresence>{panel}</AnimatePresence>
    </>
  );
}

export default QueueDrawer;
