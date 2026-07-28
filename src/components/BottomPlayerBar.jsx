import { Maximize2, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import SleepTimer from './SleepTimer';
import { buildCoverUrl, useMusicPlayer } from '../contexts/MusicPlayerContext';
import { EASE } from '../utils/motion';

const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' };
// Cada botón anuncia el estado al que lleva, no el que tiene: el título se lee
// antes de hacer click.
const REPEAT_NEXT_LABEL = { off: 'Repetir todo', all: 'Repetir una', one: 'Sin repetición' };

// Los controles de la barra son los únicos de la app con radio propio: viven
// dentro de la excepción de --radius-player y no salen de este archivo.
const ICON_BUTTON = 'flex h-8 w-8 shrink-0 items-center justify-center transition-colors duration-150 hover:bg-[var(--bg-tertiary)]';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function TrackCover({ track, size, radius = 'var(--radius-card, 0px)' }) {
  const box = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: radius,
  };

  if (!track?.coverPath) {
    return (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ ...box, background: 'var(--bg-tertiary)' }}
        aria-hidden="true"
      >
        <Music2 style={{ width: size * 0.4, height: size * 0.4, color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={buildCoverUrl(track.coverPath)}
      alt=""
      // Explícito: Chromium no aplica lazy por defecto y la grilla de álbumes
      // puede pedir cien portadas de 180px de una.
      loading="lazy"
      className="shrink-0 object-cover"
      style={box}
      draggable="false"
    />
  );
}

// Barra del reproductor. La monta el módulo Música como último hijo del flow:
// sticky y no fixed, para que quede dentro del ancho del panel sin tener que
// replicar el ancho del sidebar ni pelearse con el layout centrado del shell.
function BottomPlayerBar({ onToggleFullscreen }) {
  const player = useMusicPlayer();
  const reduced = useReducedMotion();
  const currentTrack = player?.currentTrack || null;

  const {
    isPlaying,
    position,
    duration,
    volume,
    shuffle,
    repeat,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    setRepeat,
  } = player;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  const handleProgressClick = (event) => {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const toggleStyle = (active) => ({
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    borderRadius: 'var(--radius-player)',
  });

  const iconButtonStyle = {
    color: 'var(--text-normal)',
    borderRadius: 'var(--radius-player)',
  };

  return (
    <AnimatePresence>
      {currentTrack ? (
        <motion.div
          key="player-bar"
          // Las tres fases declaran y + opacity: si exit animara una propiedad
          // que animate no tiene, el nodo se quedaría montado para siempre.
          initial={reduced ? false : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
          className="sticky z-30 mt-6"
          style={{
            bottom: 'var(--player-inset)',
            height: 'var(--player-bar-height)',
            background: 'var(--bg-secondary)',
            // --border y no --border-subtle: hay temas donde subtle es idéntico
            // a --bg-secondary y el canto de la tarjeta flotante desaparecía.
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-player)',
            boxShadow: 'var(--shadow-player)',
          }}
        >
          {/* Progreso pegado al borde superior, inset horizontal del mismo radio
              que la caja: así la línea nunca asoma por fuera de las esquinas
              redondeadas y la barra no necesita overflow:hidden, que recortaría
              el popover del sleep timer. */}
          <div
            role="slider"
            aria-label="Posición de reproducción"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(position)}
            onClick={handleProgressClick}
            className="absolute top-0 h-2 cursor-pointer"
            style={{ left: 'var(--radius-player)', right: 'var(--radius-player)' }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: 'var(--border-normal)' }} />
            <div
              className="absolute left-0 top-0 h-0.5"
              style={{ width: `${progress * 100}%`, background: 'var(--accent)' }}
            />
          </div>

          <div className="flex h-full items-center gap-4 px-3">
            <TrackCover track={currentTrack} size={56} radius="var(--radius-player)" />

            <div className="min-w-0 flex-1">
              {/* Sin textWrap:'balance' — reparte el texto en varias líneas y pelea
                  contra truncate, que necesita whitespace-nowrap. Con títulos largos
                  de descargas la barra crecía a tres líneas y rompía el alto fijo. */}
              <p
                className="truncate font-extrabold leading-tight"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  letterSpacing: '-0.02em',
                  fontSize: '15px',
                }}
                title={currentTrack.title}
              >
                {currentTrack.title}
              </p>
              <p
                className="mt-0.5 truncate"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '11px',
                }}
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={prev}
                aria-label="Pista anterior"
                className={ICON_BUTTON}
                style={iconButtonStyle}
              >
                <SkipBack className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors duration-150 ${
                  isPlaying
                    ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-normal)]'
                }`}
                style={{ color: 'var(--text-strong)', borderRadius: 'var(--radius-player)' }}
              >
                {isPlaying ? <Pause className="h-5 w-5" strokeWidth={1.5} /> : <Play className="h-5 w-5" strokeWidth={1.5} />}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Pista siguiente"
                className={ICON_BUTTON}
                style={iconButtonStyle}
              >
                <SkipForward className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <p
              className="shrink-0 text-[11px]"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatTime(position)} / {formatTime(duration)}
            </p>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label={shuffle ? 'Desactivar shuffle' : 'Activar shuffle'}
                aria-pressed={shuffle}
                title={shuffle ? 'Desactivar shuffle' : 'Activar shuffle'}
                className={ICON_BUTTON}
                style={toggleStyle(shuffle)}
              >
                <Shuffle className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setRepeat(REPEAT_CYCLE[repeat])}
                aria-label={REPEAT_NEXT_LABEL[repeat]}
                title={REPEAT_NEXT_LABEL[repeat]}
                className={ICON_BUTTON}
                style={toggleStyle(repeat !== 'off')}
              >
                <RepeatIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>

              <SleepTimer />

              <button
                type="button"
                onClick={onToggleFullscreen}
                aria-label="Ver a pantalla completa"
                title="Ver a pantalla completa (F)"
                className={ICON_BUTTON}
                style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-player)' }}
              >
                <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2 pr-1">
              <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Volumen"
                className="music-volume-slider"
                style={{ width: '60px' }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export { TrackCover };
export default BottomPlayerBar;
