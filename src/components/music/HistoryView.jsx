import { useMemo } from 'react';
import TracksView from './TracksView';
import EmptyMessage from './EmptyMessage';
import useHistory from '../../hooks/useHistory';
import { formatRelative } from '../../utils/format';

const RECENT_LIMIT = 30;
const TOP_LIMIT = 20;

function SectionHeader({ title, count }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 pb-2">
      <h3
        className="text-xs font-bold uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
      >
        {title}
      </h3>
      <p
        className="text-xs"
        style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono, monospace)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </p>
    </div>
  );
}

function HistoryView({ tracks = [], search = '', favorites, onPlay, onContextMenu }) {
  const { entries } = useHistory();

  // Índice por ruta: las entradas guardan solo el path y hay que resolverlas
  // contra la biblioteca actual.
  const byPath = useMemo(() => new Map(tracks.map((track) => [track.path, track])), [tracks]);

  // Las pistas borradas del disco siguen en el historial pero ya no existen en
  // la biblioteca: se descartan en vez de dibujar filas fantasma.
  const recent = useMemo(() => {
    const seen = [];

    for (const entry of entries) {
      const track = byPath.get(entry.path);
      if (track) seen.push({ ...track, playedAt: entry.playedAt });
      if (seen.length >= RECENT_LIMIT) break;
    }

    return seen;
  }, [entries, byPath]);

  const mostPlayed = useMemo(() => {
    const counts = new Map();

    for (const entry of entries) {
      counts.set(entry.path, (counts.get(entry.path) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([path, count]) => (byPath.has(path) ? { ...byPath.get(path), playCount: count } : null))
      .filter(Boolean)
      .sort((left, right) => right.playCount - left.playCount)
      .slice(0, TOP_LIMIT);
  }, [entries, byPath]);

  if (recent.length === 0 && mostPlayed.length === 0) {
    return (
      <EmptyMessage
        title="El historial está vacío"
        detail="Se llena solo con lo que vayas reproduciendo."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Escuchadas recientemente" count={`${recent.length}`} />
        <TracksView
          tracks={recent}
          search={search}
          favorites={favorites}
          onPlay={onPlay}
          onContextMenu={onContextMenu}
          renderTrailing={(track) => formatRelative(track.playedAt)}
          emptyState={<EmptyMessage title={`Sin coincidencias para «${search.trim()}»`} />}
        />
      </section>

      <section>
        <SectionHeader title="Más escuchadas" count={`${mostPlayed.length}`} />
        <TracksView
          tracks={mostPlayed}
          search={search}
          favorites={favorites}
          onPlay={onPlay}
          onContextMenu={onContextMenu}
          renderTrailing={(track) =>
            `${track.playCount} reproducci${track.playCount === 1 ? 'ón' : 'ones'}`
          }
          emptyState={<EmptyMessage title={`Sin coincidencias para «${search.trim()}»`} />}
        />
      </section>
    </div>
  );
}

export default HistoryView;
