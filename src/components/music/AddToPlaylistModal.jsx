import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { TrackCover } from '../BottomPlayerBar';
import { EASE } from '../../utils/motion';

// exit anima las MISMAS propiedades que animate (opacity y scale). Si saliera
// por una que animate no declara, AnimatePresence no completa la salida y el
// modal queda colgado tapando la pantalla.
const CARD_MOTION = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

function AddToPlaylistModal({ open, track, playlists = [], onAdd, onCreate, onClose }) {
  const reduced = useReducedMotion();
  const [draftName, setDraftName] = useState('');
  const [notice, setNotice] = useState('');
  // onClose llega como arrow nueva en cada render del padre. Si entrara al dep
  // array, el efecto correría en cada tecla y limpiaría lo que se está
  // escribiendo. El ref lo mantiene fresco sin ser dependencia.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    setDraftName('');
    setNotice('');

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleAdd = (playlist) => {
    // El backend es idempotente, pero agregar en silencio algo que ya estaba se
    // lee como que el click no hizo nada. Mejor decirlo y no cerrar.
    if (track && playlist.tracks?.includes(track.path)) {
      setNotice(`«${track.title}» ya estaba en ${playlist.name}.`);
      return;
    }

    // El track se manda de vuelta explícito y no se lee del state del padre:
    // onClose() lo pone en null en el mismo tick, y la referencia que quedó
    // capturada en el handler podía llegar nula.
    onAdd(playlist.id, track);
    onClose();
  };

  const handleCreate = () => {
    const name = draftName.trim();
    if (!name) return;

    onCreate(name, track);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && track ? (
        <motion.div
          key="add-to-playlist"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15, ease: EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          // Semiopaco sin blur: el glassmorphism no entra en el sistema.
          style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Agregar a playlist"
            initial={reduced ? false : CARD_MOTION.initial}
            animate={CARD_MOTION.animate}
            exit={CARD_MOTION.exit}
            transition={{ duration: reduced ? 0 : 0.15, ease: EASE }}
            className="flex w-full max-w-[420px] flex-col border"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <h2
                  className="font-extrabold"
                  style={{
                    color: 'var(--text-strong)',
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '18px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Agregar a playlist
                </h2>
                <p
                  className="mt-0.5 truncate"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}
                  title={track.title}
                >
                  {track.title}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar"
                className="shrink-0 p-2"
                style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </header>

            <div className="max-h-[40vh] overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="px-4 py-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Todavía no hay playlists. Creá una abajo.
                </p>
              ) : (
                playlists.map((playlist) => {
                  const already = track && playlist.tracks?.includes(track.path);

                  return (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => handleAdd(playlist)}
                      className="row-hover flex w-full items-center gap-3 border-b px-4 py-2 text-left"
                      style={{ borderBottomColor: 'var(--border-subtle)' }}
                    >
                      <TrackCover track={{ coverPath: playlist.coverPath }} size={32} />

                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-bold"
                          style={{
                            color: 'var(--text-strong)',
                            fontFamily: 'var(--font-display, sans-serif)',
                            fontSize: '15px',
                          }}
                          title={playlist.name}
                        >
                          {playlist.name}
                        </p>
                        <p
                          className="mt-0.5 truncate"
                          style={{
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '12px',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {playlist.tracks.length} pista{playlist.tracks.length === 1 ? '' : 's'}
                          {already ? ' · ya incluida' : ''}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {notice ? (
              <p
                className="border-t px-4 py-2 text-xs"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                {notice}
              </p>
            ) : null}

            <div className="flex items-center gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="field relative flex-1">
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleCreate();
                  }}
                  placeholder="Nombre..."
                  aria-label="Nombre de la playlist nueva"
                  className="w-full bg-transparent px-3 py-1.5 text-xs outline-none"
                  style={{ color: 'var(--text-strong)' }}
                />
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!draftName.trim()}
                className="btn-primary inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Crear y agregar
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default AddToPlaylistModal;
