import { useMemo, useState } from 'react';
import { TrackCover } from '../BottomPlayerBar';
import TracksView from './TracksView';
import { formatTotalDuration } from '../../utils/format';
import { matchesQuery, trackMatches } from '../../utils/search';

const NO_ALBUM = '__sin-album__';

// Agrupa la biblioteca por álbum. Si hay búsqueda activa, un álbum entra cuando
// matchea su nombre (con todas sus pistas) o cuando matchean pistas sueltas
// (solo esas), que es lo que se espera al buscar un tema puntual.
function groupByAlbum(tracks, needle) {
  const groups = new Map();

  for (const track of tracks) {
    const key = track.album?.trim() || NO_ALBUM;

    if (needle) {
      const albumMatches = key !== NO_ALBUM && matchesQuery(key, needle);
      if (!albumMatches && !trackMatches(track, needle)) continue;
    }

    if (!groups.has(key)) {
      groups.set(key, { key, name: key === NO_ALBUM ? 'Sin álbum' : key, tracks: [] });
    }

    groups.get(key).tracks.push(track);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      artists: [...new Set(group.tracks.map((track) => track.artist).filter(Boolean))],
      totalDuration: group.tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
    }))
    // "Sin álbum" al final: es el cajón de sobras, no compite con los reales.
    .sort((left, right) => {
      if (left.key === NO_ALBUM) return 1;
      if (right.key === NO_ALBUM) return -1;
      return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
    });
}

function AlbumsView({ tracks = [], search = '', favorites, onPlay, onContextMenu, emptyState = null }) {
  const [expanded, setExpanded] = useState(null);
  const needle = search.trim();
  const albums = useMemo(() => groupByAlbum(tracks, needle), [tracks, needle]);

  if (albums.length === 0) {
    return emptyState;
  }

  const expandedAlbum = albums.find((album) => album.key === expanded) || null;

  return (
    <div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
      >
        {albums.map((album) => {
          const isExpanded = album.key === expanded;

          return (
            <button
              key={album.key}
              type="button"
              // Un solo álbum abierto a la vez: abrir otro cierra el anterior.
              onClick={() => setExpanded(isExpanded ? null : album.key)}
              aria-expanded={isExpanded}
              className="text-left"
            >
              <div
                style={{
                  // outline y no border: no empuja el layout del grid al aparecer.
                  outline: isExpanded ? '1px solid var(--accent)' : '1px solid transparent',
                  outlineOffset: '0px',
                }}
                onMouseEnter={(event) => {
                  if (!isExpanded) event.currentTarget.style.outline = '1px solid var(--border-normal)';
                }}
                onMouseLeave={(event) => {
                  if (!isExpanded) event.currentTarget.style.outline = '1px solid transparent';
                }}
              >
                <TrackCover track={album.tracks[0]} size={180} />
              </div>
              <p
                className="mt-2 truncate font-bold"
                style={{
                  color: isExpanded ? 'var(--accent)' : 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: '15px',
                  letterSpacing: '-0.01em',
                }}
                title={album.name}
              >
                {album.name}
              </p>
              <p
                className="mt-0.5 truncate"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '12px',
                }}
                title={album.artists.join(', ')}
              >
                {album.artists.join(', ') || 'Artista desconocido'}
              </p>
            </button>
          );
        })}
      </div>

      {expandedAlbum ? (
        <section className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-normal)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3
              className="font-extrabold"
              style={{
                color: 'var(--text-strong)',
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '22px',
                letterSpacing: '-0.02em',
              }}
            >
              {expandedAlbum.name}
            </h3>
            <p
              className="text-xs"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {expandedAlbum.tracks.length} pista{expandedAlbum.tracks.length === 1 ? '' : 's'}
              {expandedAlbum.totalDuration ? ` · ${formatTotalDuration(expandedAlbum.totalDuration)}` : ''}
            </p>
          </div>

          <div className="mt-3">
            <TracksView
              tracks={expandedAlbum.tracks}
              favorites={favorites}
              onPlay={onPlay}
              onContextMenu={onContextMenu}
              numbered
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default AlbumsView;
