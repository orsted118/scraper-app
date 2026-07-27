import { ListMusic, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { buildCoverUrl, useMusicPlayer } from '../contexts/MusicPlayerContext';

const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' };
// Cada botón anuncia el estado al que lleva, no el que tiene: el título se lee
// antes de hacer click.
const REPEAT_NEXT_LABEL = { off: 'Repetir todo', all: 'Repetir una', one: 'Sin repetición' };

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function TrackCover({ track, size }) {
  const box = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: 'var(--radius-card, 0px)',
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

// Barra inferior del reproductor: montada por Musica.jsx (visible solo ahí),
// pero el audio vive en el contexto — la música sigue al navegar.
function BottomPlayerBar({ onToggleQueue, queueOpen = false }) {
  const player = useMusicPlayer();

  if (!player?.currentTrack) return null;

  const {
    currentTrack,
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
    borderRadius: 'var(--radius-button, 0px)',
  });

  return (
    <div
      className="border-t"
      style={{
        height: '64px',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      {/* Progreso: 1px, click = seek. Área de click más alta que la línea. */}
      <div
        role="slider"
        aria-label="Posición de reproducción"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        onClick={handleProgressClick}
        className="relative -mt-px h-2 w-full cursor-pointer"
      >
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'var(--border-normal)' }} />
        <div
          className="absolute left-0 top-0 h-px"
          style={{ width: `${progress * 100}%`, background: 'var(--accent)' }}
        />
      </div>

      <div className="flex h-[54px] items-center gap-4 px-4">
        <TrackCover track={currentTrack} size={48} />

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-base font-extrabold leading-tight"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              letterSpacing: '-0.02em',
              fontSize: '20px',
              textWrap: 'balance',
            }}
            title={currentTrack.title}
          >
            {currentTrack.title}
          </p>
          <p
            className="truncate text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}
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
            className="p-2"
            style={{ color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
          >
            <SkipBack className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className="p-2"
            style={{ color: 'var(--text-strong)', borderRadius: 'var(--radius-button, 0px)' }}
          >
            {isPlaying ? <Pause className="h-5 w-5" strokeWidth={1.5} /> : <Play className="h-5 w-5" strokeWidth={1.5} />}
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Pista siguiente"
            className="p-2"
            style={{ color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
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
            className="p-2"
            style={toggleStyle(shuffle)}
          >
            <Shuffle className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setRepeat(REPEAT_CYCLE[repeat])}
            aria-label={REPEAT_NEXT_LABEL[repeat]}
            title={REPEAT_NEXT_LABEL[repeat]}
            className="p-2"
            style={toggleStyle(repeat !== 'off')}
          >
            <RepeatIcon className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onToggleQueue}
            aria-label={queueOpen ? 'Cerrar cola' : 'Ver cola'}
            aria-expanded={queueOpen}
            title={queueOpen ? 'Cerrar cola' : 'Ver cola'}
            className="p-2"
            style={toggleStyle(queueOpen)}
          >
            <ListMusic className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
    </div>
  );
}

export { TrackCover };
export default BottomPlayerBar;
