import {
  Heart,
  Moon,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { buildCoverUrl, useMusicPlayer } from '../contexts/MusicPlayerContext';
import { formatCountdown } from './SleepTimer';
import useFavorites from '../hooks/useFavorites';
import useLyrics from '../hooks/useLyrics';
import { EASE } from '../utils/motion';

const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' };
const REPEAT_NEXT_LABEL = { off: 'Repetir todo', all: 'Repetir una', one: 'Sin repetición' };
// Índice de la línea "sin letra todavía": el hueco anterior al primer timestamp.
const BEFORE_FIRST_LINE = -1;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function Cover({ track }) {
  const box = { width: 'min(60vh, 60vw, 500px)', aspectRatio: '1 / 1' };

  if (!track.coverPath) {
    // Sin portada NO se pinta el cuadrado entero de gris: medio metro de color
    // plano con un ícono perdido adentro se ve peor que un marcador chico.
    return (
      <div className="flex shrink-0 items-center justify-center" style={box} aria-hidden="true">
        <div
          className="flex items-center justify-center"
          style={{ width: '160px', height: '160px', background: 'var(--bg-tertiary)' }}
        >
          <Music2 style={{ width: '96px', height: '96px', color: 'var(--text-muted)' }} strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  return (
    <img
      src={buildCoverUrl(track.coverPath)}
      alt=""
      className="shrink-0 object-cover"
      style={box}
      draggable="false"
    />
  );
}

function Lyrics({ lines, position, title, reduced }) {
  const containerRef = useRef(null);
  // Un ref por línea, en un Map: el índice activo cambia con la posición y hace
  // falta llegar al nodo concreto para centrarlo.
  const lineRefs = useRef(new Map());

  const activeIndex = useMemo(() => {
    let index = BEFORE_FIRST_LINE;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].time > position) break;
      index = i;
    }
    return index;
  }, [lines, position]);

  // scrollTo manual y no scrollIntoView: este último arrastra a TODOS los
  // ancestros scrolleables, y como la vista es un overlay fijo terminaría
  // moviendo también la página de atrás.
  useEffect(() => {
    const container = containerRef.current;
    const node = lineRefs.current.get(activeIndex);
    if (!container || !node) return;

    container.scrollTo({
      top: node.offsetTop - container.clientHeight / 2 + node.clientHeight / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [activeIndex, reduced]);

  const lineStyle = (index) => {
    if (index === activeIndex) {
      return { color: 'var(--text-strong)', fontWeight: 700, transform: 'scale(1.05)', opacity: 1 };
    }
    return {
      color: 'var(--text-muted)',
      fontWeight: 400,
      transform: 'scale(1)',
      opacity: index < activeIndex ? 0.5 : 0.8,
    };
  };

  return (
    <div
      ref={containerRef}
      className="no-scrollbar w-full max-w-md overflow-y-auto text-center"
      aria-label="Letra sincronizada"
      style={{
        height: '40vh',
        // relative: offsetTop de cada línea se mide contra este contenedor.
        position: 'relative',
        // Media altura arriba y abajo para que la primera y la última línea
        // puedan quedar centradas igual que el resto.
        paddingBlock: '18vh',
      }}
    >
      {/* Intro instrumental: hasta el primer timestamp no hay letra que mostrar,
          así que el título ocupa ese lugar. */}
      {lines[0]?.time > 0 ? (
        <p
          ref={(node) => {
            if (node) lineRefs.current.set(BEFORE_FIRST_LINE, node);
            else lineRefs.current.delete(BEFORE_FIRST_LINE);
          }}
          className="px-4 py-1.5"
          style={{
            ...lineStyle(BEFORE_FIRST_LINE),
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: '15px',
            transition: reduced ? 'none' : 'color 0.2s, opacity 0.2s, transform 0.2s',
          }}
        >
          {title}
        </p>
      ) : null}

      {lines.map((line, index) => (
        <p
          key={`${line.time}-${index}`}
          ref={(node) => {
            if (node) lineRefs.current.set(index, node);
            else lineRefs.current.delete(index);
          }}
          className="px-4 py-1.5"
          style={{
            ...lineStyle(index),
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: '15px',
            transition: reduced ? 'none' : 'color 0.2s, opacity 0.2s, transform 0.2s',
            // Una línea vacía es una pausa marcada en el .lrc: ocupa lugar para
            // que el resalte no salte dos versos de golpe.
            minHeight: '1.5em',
          }}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

// Vista dedicada del reproductor. Se monta en el shell, al lado de la barra
// inferior: el audio es global y esta vista tiene que poder abrirse desde
// cualquier página sin arrastrar el módulo Música entero.
function NowPlaying({ open, onClose }) {
  const reduced = useReducedMotion();
  const player = useMusicPlayer();
  const favorites = useFavorites();
  const currentTrack = player?.currentTrack || null;
  const lines = useLyrics(open ? currentTrack?.path : null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Devolver el foco a quien abrió la vista al cerrarla: si no, el foco vuelve
  // al <body> y el teclado pierde el hilo.
  useEffect(() => {
    if (!open) return undefined;

    const opener = document.activeElement;

    return () => {
      if (opener?.isConnected) opener.focus?.();
    };
  }, [open]);

  // La cola puede vaciarse con la vista abierta: sin pista no hay nada que
  // mostrar y el estado tiene que quedar consistente para la próxima apertura.
  useEffect(() => {
    if (open && !currentTrack) onClose();
  }, [open, currentTrack, onClose]);

  const visible = open && currentTrack;

  const handleProgressClick = (event) => {
    if (player.duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    player.seek(ratio * player.duration);
  };

  const progress = visible && player.duration > 0 ? Math.min(1, player.position / player.duration) : 0;
  const RepeatIcon = player?.repeat === 'one' ? Repeat1 : Repeat;
  const isFavorite = visible ? favorites.has(currentTrack.path) : false;

  const toggleStyle = (active) => ({
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    borderRadius: 'var(--radius-button, 0px)',
  });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="now-playing"
          role="dialog"
          aria-modal="true"
          aria-label="Reproduciendo ahora"
          initial={reduced ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
          className="fixed inset-0 z-40 overflow-y-auto"
          style={{ background: 'var(--bg)' }}
        >
          {player.sleepTimerEndsAt ? (
            <div
              className="absolute left-6 top-6 flex items-center gap-1.5"
              style={{ color: 'var(--accent)' }}
            >
              <Moon className="h-4 w-4" strokeWidth={1.5} />
              <span
                className="text-[11px]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCountdown(player.sleepTimerRemaining)}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista fullscreen"
            title="Cerrar (Esc)"
            className="absolute right-6 top-6 z-10 p-2"
            style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div className="flex min-h-full flex-col items-center justify-center gap-10 p-12 lg:flex-row lg:items-center lg:gap-16">
            <div className="flex w-full max-w-2xl flex-col items-center">
              <Cover track={currentTrack} />

              <h2
                className="mt-8 text-center font-extrabold leading-tight"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: 'clamp(24px, 4vw, 48px)',
                  letterSpacing: '-0.03em',
                  textWrap: 'balance',
                }}
              >
                {currentTrack.title}
              </h2>
              <p
                className="mt-2 text-center"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '15px',
                }}
              >
                {currentTrack.artist}
              </p>
              {currentTrack.album ? (
                <p
                  className="mt-1 text-center"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '13px',
                  }}
                >
                  {currentTrack.album}
                </p>
              ) : null}

              <div className="mt-8 w-full">
                <div
                  role="slider"
                  aria-label="Posición de reproducción"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(player.duration)}
                  aria-valuenow={Math.round(player.position)}
                  onClick={handleProgressClick}
                  className="relative h-3 w-full cursor-pointer"
                >
                  <div
                    className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2"
                    style={{ background: 'var(--border-normal)' }}
                  />
                  <div
                    className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2"
                    style={{ width: `${progress * 100}%`, background: 'var(--accent)' }}
                  />
                </div>
                <div
                  className="mt-2 flex items-center justify-between text-xs"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span>{formatTime(player.position)}</span>
                  <span>{formatTime(player.duration)}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={player.toggleShuffle}
                  aria-label={player.shuffle ? 'Desactivar shuffle' : 'Activar shuffle'}
                  aria-pressed={player.shuffle}
                  title={player.shuffle ? 'Desactivar shuffle' : 'Activar shuffle'}
                  className="p-2"
                  style={toggleStyle(player.shuffle)}
                >
                  <Shuffle style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={player.prev}
                  aria-label="Pista anterior"
                  className="p-2"
                  style={{ color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
                >
                  <SkipBack style={{ width: '36px', height: '36px' }} strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={player.toggle}
                  aria-label={player.isPlaying ? 'Pausar' : 'Reproducir'}
                  className="p-2"
                  style={{ color: 'var(--text-strong)', borderRadius: 'var(--radius-button, 0px)' }}
                >
                  {player.isPlaying ? (
                    <Pause style={{ width: '48px', height: '48px' }} strokeWidth={1.5} />
                  ) : (
                    <Play style={{ width: '48px', height: '48px' }} strokeWidth={1.5} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={player.next}
                  aria-label="Pista siguiente"
                  className="p-2"
                  style={{ color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
                >
                  <SkipForward style={{ width: '36px', height: '36px' }} strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={() => player.setRepeat(REPEAT_CYCLE[player.repeat])}
                  aria-label={REPEAT_NEXT_LABEL[player.repeat]}
                  title={REPEAT_NEXT_LABEL[player.repeat]}
                  className="p-2"
                  style={toggleStyle(player.repeat !== 'off')}
                >
                  <RepeatIcon style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
                </button>

                {/* Dentro del mismo cluster y no en una fila propia: suelto abajo
                    sumaba una franja de alto que empujaba la vista fuera de la
                    ventana por defecto. */}
                <button
                  type="button"
                  onClick={() => favorites.toggle(currentTrack.path)}
                  aria-label={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  aria-pressed={isFavorite}
                  title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  className="p-2"
                  style={toggleStyle(isFavorite)}
                >
                  <Heart
                    style={{ width: '20px', height: '20px' }}
                    strokeWidth={1.5}
                    fill={isFavorite ? 'var(--accent)' : 'none'}
                  />
                </button>
              </div>

              {lines?.length === 0 ? (
                <p className="mt-8 max-w-md text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Sin letra sincronizada. Colocá un archivo .lrc con el mismo nombre que la canción.
                </p>
              ) : null}
            </div>

            {lines?.length > 0 ? (
              <Lyrics
                lines={lines}
                position={player.position}
                title={currentTrack.title}
                reduced={reduced}
              />
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default NowPlaying;
