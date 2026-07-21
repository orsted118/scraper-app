import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Barra inferior del reproductor: montada por Musica.jsx (visible solo ahí),
// pero el audio vive en el contexto — la música sigue al navegar.
function BottomPlayerBar() {
  const player = useMusicPlayer();

  if (!player?.currentTrack) return null;

  const { currentTrack, isPlaying, position, duration, volume, toggle, next, prev, seek, setVolume } = player;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const handleProgressClick = (event) => {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

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

export default BottomPlayerBar;
