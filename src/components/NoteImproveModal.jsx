import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { EASE } from '../utils/motion';

// Preview lado a lado de la mejora sugerida por la IA. No aplica nada solo: el
// contenido solo cambia si el usuario acepta. Ambos HTML llegan ya sanitizados
// por el padre — acá no se sanea de nuevo.
function NoteImproveModal({ open, original, improved, backend, onAccept, onDiscard }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      // stopImmediatePropagation y no solo stopPropagation: el listener del
      // editor de notas también cuelga de window, y stopPropagation no frena a
      // los demás listeners del MISMO nodo. Con uno solo, Escape descartaba el
      // preview y de paso cerraba la nota entera.
      event.stopImmediatePropagation();
      event.stopPropagation();
      onDiscard();
    };

    // Captura para ganarle al listener del editor cuando el evento nace en un
    // descendiente (el caso normal: foco en el contentEditable).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onDiscard]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onDiscard}
        >
          <motion.div
            key="improve-preview"
            // Las tres fases declaran opacity Y scale: si exit animara una
            // propiedad que animate no tiene, el nodo no desmontaría nunca.
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Comparar mejora de la nota"
            className="flex max-h-[80vh] w-full max-w-[880px] flex-col border"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
              boxShadow: 'var(--shadow-card, none)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b px-6 pb-4 pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
              <p
                className="text-[11px] font-bold uppercase"
                style={{ color: 'var(--accent)', letterSpacing: '0.24em' }}
              >
                Sugerencia
              </p>
              <h2
                className="mt-2 font-extrabold"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: '20px',
                  letterSpacing: '-0.02em',
                }}
              >
                Comparar antes de aplicar
              </h2>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-px overflow-y-auto md:grid-cols-2" style={{ background: 'var(--border-subtle)' }}>
              <Column label="Original" html={original} muted />
              <Column label="Mejorada" html={improved} />
            </div>

            <div
              className="flex flex-wrap items-center gap-3 border-t px-6 py-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <p
                className="min-w-0 flex-1 truncate text-[11px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
              >
                {backend ? `Sugerencia generada por ${backend}` : 'Sugerencia generada por IA'}
              </p>
              <button type="button" onClick={onDiscard} className="btn-outline px-4 py-1.5 text-sm font-semibold">
                Descartar
              </button>
              <button
                type="button"
                onClick={() => onAccept(improved)}
                className="btn-primary px-4 py-1.5 text-sm font-semibold"
              >
                Usar mejorada
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function Column({ label, html, muted = false }) {
  return (
    <section className="flex min-w-0 flex-col p-6" style={{ background: 'var(--bg-card)' }}>
      <p
        className="mb-3 text-[10px] font-bold uppercase"
        style={{ color: muted ? 'var(--text-muted)' : 'var(--accent)', letterSpacing: '0.18em' }}
      >
        {label}
      </p>
      <div
        className="note-rich-editor min-w-0 text-sm leading-6"
        style={{ color: muted ? 'var(--text-muted)' : 'var(--text-normal)', fontFamily: 'var(--font-body, inherit)' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export default NoteImproveModal;
