import { Heart } from 'lucide-react';
import { useMemo } from 'react';
import { TrackCover } from '../BottomPlayerBar';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';
import { formatDuration } from '../../utils/format';
import { trackMatches } from '../../utils/search';

// Lista plana de pistas. La usan la pestaña Pistas, Favoritos y las secciones
// de Historial — de ahí `renderTrailing`, que deja al caller poner lo suyo a la
// derecha (duración por defecto, timestamp o conteo en Historial).
function TracksView({
  tracks = [],
  search = '',
  favorites,
  onPlay,
  onContextMenu,
  renderTrailing,
  emptyState = null,
  numbered = false,
}) {
  const player = useMusicPlayer();
  const needle = search.trim();

  const visible = useMemo(
    () => (needle ? tracks.filter((track) => trackMatches(track, needle)) : tracks),
    [tracks, needle],
  );

  if (visible.length === 0) {
    return emptyState;
  }

  return (
    <div>
      {visible.map((track, index) => {
        const isCurrent = player?.currentTrack?.path === track.path;
        const isFavorite = favorites?.has(track.path) || false;

        return (
          // div y no button: adentro va el botón del corazón, y un button
          // anidado en otro button es HTML inválido.
          <div
            key={`${track.path}-${index}`}
            onContextMenu={(event) => onContextMenu?.(event, track, index)}
            className="row-hover flex w-full items-center gap-4 border-t"
            style={{
              borderTopColor: 'var(--border-subtle)',
              borderLeftWidth: isCurrent ? '3px' : '0px',
              borderLeftStyle: 'solid',
              borderLeftColor: isCurrent ? 'var(--accent)' : 'transparent',
              paddingLeft: isCurrent ? '9px' : '12px',
            }}
          >
            <button
              type="button"
              onClick={() => onPlay?.(visible, index)}
              className="flex min-w-0 flex-1 items-center gap-4 py-3 text-left"
            >
              {numbered ? (
                <span
                  className="w-6 shrink-0 text-right text-xs"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              ) : (
                <TrackCover track={track} size={32} />
              )}

              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-bold"
                  style={{
                    color: isCurrent ? 'var(--accent)' : 'var(--text-strong)',
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '18px',
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
                    fontSize: '13px',
                  }}
                  title={track.artist}
                >
                  {track.artist}
                  {track.album ? ` · ${track.album}` : ''}
                </p>
              </div>
            </button>

            {favorites ? (
              <button
                type="button"
                onClick={(event) => {
                  // El row entero reproduce: sin esto marcar un favorito
                  // también arrancaría la pista.
                  event.stopPropagation();
                  favorites.toggle(track.path);
                }}
                aria-label={isFavorite ? `Quitar ${track.title} de favoritos` : `Marcar ${track.title} como favorito`}
                aria-pressed={isFavorite}
                title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                className="shrink-0 p-2"
                style={{
                  color: isFavorite ? 'var(--accent)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-button, 0px)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = isFavorite ? 'var(--accent)' : 'var(--text-muted)';
                }}
              >
                <Heart
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                  fill={isFavorite ? 'var(--accent)' : 'none'}
                />
              </button>
            ) : null}

            <div
              className="shrink-0 pr-3 text-right text-xs"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {renderTrailing ? renderTrailing(track) : formatDuration(track.duration)}
            </div>
          </div>
        );
      })}
      <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />
    </div>
  );
}

export default TracksView;
