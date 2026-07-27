import { useMemo } from 'react';
import TracksView from './TracksView';
import EmptyMessage from './EmptyMessage';

function FavoritesView({ tracks = [], search = '', favorites, onPlay, onContextMenu }) {
  const favoriteTracks = useMemo(
    () => tracks.filter((track) => favorites?.has(track.path)),
    [tracks, favorites],
  );

  if (favoriteTracks.length === 0) {
    return (
      <EmptyMessage
        title="Aún no marcaste favoritos"
        detail="Usá el corazón de cualquier pista para guardarla acá."
      />
    );
  }

  return (
    <TracksView
      tracks={favoriteTracks}
      search={search}
      favorites={favorites}
      onPlay={onPlay}
      onContextMenu={onContextMenu}
      emptyState={<EmptyMessage title={`Sin favoritos para «${search.trim()}»`} />}
    />
  );
}

export default FavoritesView;
