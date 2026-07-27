import { useMemo, useState } from 'react';
import { TrackCover } from '../BottomPlayerBar';
import AlbumsView from './AlbumsView';
import { formatTotalDuration } from '../../utils/format';
import { matchesQuery } from '../../utils/search';

const UNKNOWN_ARTIST = 'Artista desconocido';

function groupByArtist(tracks, needle) {
  const groups = new Map();

  for (const track of tracks) {
    const name = track.artist?.trim() || UNKNOWN_ARTIST;

    if (needle && !matchesQuery(name, needle)) continue;

    if (!groups.has(name)) {
      groups.set(name, { name, tracks: [] });
    }

    groups.get(name).tracks.push(track);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      albumCount: new Set(group.tracks.map((track) => track.album?.trim()).filter(Boolean)).size,
      totalDuration: group.tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
    }))
    .sort((left, right) => {
      if (left.name === UNKNOWN_ARTIST) return 1;
      if (right.name === UNKNOWN_ARTIST) return -1;
      return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
    });
}

function ArtistsView({ tracks = [], search = '', favorites, onPlay, onContextMenu, emptyState = null }) {
  const [expanded, setExpanded] = useState(null);
  const needle = search.trim();
  const artists = useMemo(() => groupByArtist(tracks, needle), [tracks, needle]);

  if (artists.length === 0) {
    return emptyState;
  }

  return (
    <div>
      {artists.map((artist) => {
        const isExpanded = artist.name === expanded;
        const parts = [
          `${artist.tracks.length} pista${artist.tracks.length === 1 ? '' : 's'}`,
          artist.albumCount ? `${artist.albumCount} álbum${artist.albumCount === 1 ? '' : 'es'}` : null,
          formatTotalDuration(artist.totalDuration) || null,
        ].filter(Boolean);

        return (
          <div key={artist.name} className="border-t" style={{ borderTopColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : artist.name)}
              aria-expanded={isExpanded}
              className="row-hover flex w-full items-center gap-4 px-3 py-3 text-left"
              style={{
                borderLeftWidth: isExpanded ? '3px' : '0px',
                borderLeftStyle: 'solid',
                borderLeftColor: isExpanded ? 'var(--accent)' : 'transparent',
                paddingLeft: isExpanded ? '9px' : '12px',
              }}
            >
              <TrackCover track={artist.tracks[0]} size={48} />

              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-bold"
                  style={{
                    color: isExpanded ? 'var(--accent)' : 'var(--text-strong)',
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '18px',
                    letterSpacing: '-0.01em',
                  }}
                  title={artist.name}
                >
                  {artist.name}
                </p>
                <p
                  className="mt-0.5 truncate"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '13px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {parts.join(' · ')}
                </p>
              </div>
            </button>

            {isExpanded ? (
              <div className="pb-6 pl-3 pr-3">
                {/* Sin search: el filtro ya se aplicó al elegir el artista, y
                    volver a filtrar acá escondería sus álbumes. */}
                <AlbumsView
                  tracks={artist.tracks}
                  favorites={favorites}
                  onPlay={onPlay}
                  onContextMenu={onContextMenu}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />
    </div>
  );
}

export default ArtistsView;
