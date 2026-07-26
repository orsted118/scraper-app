import { ExternalLink, EyeOff, Link2, MoreVertical } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { EASE } from '../utils/motion';

const COPIED_FEEDBACK_MS = 1400;

function ActivityCardMenu({ onHide, url }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // El feedback de "copiado" vive en el propio item: no hay sistema de toast
  // global todavía y un banner suelto sería ruido para una acción trivial.
  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleHide = () => {
    setOpen(false);
    onHide?.();
  };

  const handleOpenPortal = () => {
    setOpen(false);
    window.scraperApp?.openExternal?.(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (_error) {
      setCopied(false);
    }
  };

  const options = [
    { key: 'hide', Icon: EyeOff, label: 'Ocultar actividad', onClick: handleHide, enabled: Boolean(onHide) },
    { key: 'portal', Icon: ExternalLink, label: 'Ver en el portal', onClick: handleOpenPortal, enabled: Boolean(url) },
    {
      key: 'copy',
      Icon: Link2,
      label: copied ? 'Link copiado' : 'Copiar link',
      onClick: handleCopyLink,
      enabled: Boolean(url),
    },
  ].filter((option) => option.enabled);

  if (options.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Opciones"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Opciones"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center border"
        style={{
          borderColor: open ? 'var(--border-normal)' : 'transparent',
          background: open ? 'var(--bg-secondary)' : 'transparent',
          color: open ? 'var(--text-strong)' : 'var(--text-muted)',
          borderRadius: 'var(--radius-badge, 0px)',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = 'var(--bg-secondary)';
          event.currentTarget.style.color = 'var(--text-strong)';
        }}
        onMouseLeave={(event) => {
          if (open) {
            return;
          }

          event.currentTarget.style.background = 'transparent';
          event.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: reduced ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -4 }}
            transition={{ duration: reduced ? 0 : 0.15, ease: EASE }}
            className="absolute right-0 top-full z-20 mt-1 min-w-[200px] border py-1"
            style={{
              borderColor: 'var(--border)',
              // --bg-card es translúcido: sobre contenido el menú se leería
              // encima del texto de la card. La superficie opaca es la correcta.
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            {options.map(({ key, Icon, label, onClick }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={onClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                style={{ color: 'var(--text-normal)' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--bg-tertiary)';
                  event.currentTarget.style.color = 'var(--text-strong)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                  event.currentTarget.style.color = 'var(--text-normal)';
                }}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                {label}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default ActivityCardMenu;
