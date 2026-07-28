import {
  ChevronsRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Heart,
  Link2,
  ListMusic,
  ListPlus,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import BottomPlayerBar from '../components/BottomPlayerBar';
import QueueDrawer from '../components/QueueDrawer';
import TrackContextMenu from '../components/TrackContextMenu';
import AlbumsView from '../components/music/AlbumsView';
import ArtistsView from '../components/music/ArtistsView';
import EmptyMessage from '../components/music/EmptyMessage';
import FavoritesView from '../components/music/FavoritesView';
import HistoryView from '../components/music/HistoryView';
import TracksView from '../components/music/TracksView';
import AddToPlaylistModal from '../components/music/AddToPlaylistModal';
import PlaylistsView from '../components/music/PlaylistsView';
import useFavorites from '../hooks/useFavorites';
import useLibrary from '../hooks/useLibrary';
import usePlaylists from '../hooks/usePlaylists';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { EASE } from '../utils/motion';

const TABS = [
  { id: 'tracks', label: 'Pistas' },
  { id: 'albums', label: 'Álbumes' },
  { id: 'artists', label: 'Artistas' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'history', label: 'Historial' },
  // Última a propósito: las cinco originales conservan el orden ya aprendido.
  { id: 'playlists', label: 'Playlists' },
];

function Musica({ onToggleFullscreen }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const reduced = useReducedMotion();
  const player = useMusicPlayer();
  const favorites = useFavorites();
  const playlists = usePlaylists();
  const searchInputRef = useRef(null);
  const { library, loading, folders, addFolder, removeFolder, refreshAll } = useLibrary();
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [search, setSearch] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);
  const [tab, setTab] = useState('tracks');
  const [contextMenu, setContextMenu] = useState(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.ctrlKey || event.key.toLowerCase() !== 'f') return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const allTracks = useMemo(() => library?.tracks || [], [library]);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2400);
  };

  const handleAddFolder = async () => {
    setScanning(true);
    setScanError('');

    try {
      const result = await addFolder();

      if (result?.canceled) return;

      if (result?.error) {
        setScanError(result.error);
        return;
      }

      // added:false llega cuando la carpeta ya estaba o es subcarpeta de otra.
      if (result?.added === false) {
        flash(result.reason === 'nested'
          ? 'Esa carpeta ya está cubierta por otra de la biblioteca.'
          : 'Esa carpeta ya está en la biblioteca.');
        return;
      }

      // La cola del player se alinea a la librería nueva; nada suena solo.
      player?.setQueue?.(result.tracks, -1);
    } catch (_error) {
      setScanError('No fue posible agregar la carpeta.');
    } finally {
      setScanning(false);
    }
  };

  const handleRemoveFolder = async (folderPath) => {
    const confirmed = window.confirm(
      `¿Remover «${folderPath}» de la biblioteca? Las canciones que solo estén ahí dejarán de aparecer.`,
    );
    if (!confirmed) return;

    const result = await removeFolder(folderPath);
    if (result?.error) setScanError(result.error);
  };

  const handleRefresh = async () => {
    if (folders.length === 0) return;

    setScanning(true);
    setScanError('');

    try {
      const result = await refreshAll();
      if (result?.error) setScanError(result.error);
    } catch (_error) {
      setScanError('No fue posible re-escanear.');
    } finally {
      setScanning(false);
    }
  };

  // Cada vista pasa la lista que el usuario tiene delante, no la biblioteca
  // entera: si estás en un álbum y das play, "siguiente" sigue en ese álbum.
  const handlePlay = (list, index) => {
    player.playFromList(list, index);
  };

  const handleContextMenu = (event, track) => {
    // Sin esto Electron dibuja su menú nativo encima del nuestro.
    event.preventDefault();
    setContextMenu({ track, x: event.clientX, y: event.clientY });
  };

  const buildActions = (track) => {
    const isFavorite = favorites.has(track.path);

    return [
      {
        key: 'play-next',
        label: 'Reproducir siguiente',
        Icon: ChevronsRight,
        onClick: () => player.playNext(track),
      },
      {
        key: 'add-to-queue',
        label: 'Agregar a la cola',
        Icon: ListPlus,
        onClick: () => player.enqueue(track),
      },
      {
        key: 'favorite',
        label: isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito',
        Icon: Heart,
        onClick: () => favorites.toggle(track.path),
        separated: true,
      },
      {
        key: 'add-to-playlist',
        label: 'Agregar a playlist...',
        Icon: ListPlus,
        onClick: () => setAddToPlaylistTrack(track),
      },
      {
        key: 'copy-path',
        label: 'Copiar ruta',
        Icon: Link2,
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(track.path);
          } catch (_error) {
            // Portapapeles bloqueado (ventana sin foco). No hay sistema de
            // toast global; fallar en silencio es preferible a inventar uno.
          }
        },
        separated: true,
      },
      {
        key: 'show-in-folder',
        label: 'Mostrar en carpeta',
        Icon: FolderOpen,
        onClick: () => api?.music?.showInFolder?.(track.path),
      },
    ];
  };

  if (loading) {
    return null;
  }

  // ── Empty state: primera vez, sin carpeta elegida ─────────────
  if (!allTracks.length) {
    return (
      <div className="flex min-h-[60vh] flex-col">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
        className="flex flex-1 flex-col items-start justify-center"
      >
        <p
          className="text-xs font-bold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
        >
          Biblioteca · Vacía
        </p>
        <h2
          className="mt-3 font-extrabold"
          style={{
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 'clamp(38px, 6vw, 64px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            textWrap: 'balance',
          }}
        >
          Aún no hay música
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
          Elige una o varias carpetas de tu equipo y DVPotro las escanea completas: MP3, M4A,
          FLAC, OGG y WAV. Podés agregar más carpetas después.
        </p>
        <button
          type="button"
          onClick={handleAddFolder}
          disabled={scanning}
          className="btn-primary mt-7 inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <FolderOpen className="h-4 w-4" strokeWidth={1.5} />}
          {scanning ? 'Escaneando...' : 'Elegir carpeta'}
        </button>
        {scanError ? (
          <p className="mt-3 text-xs" style={{ color: 'var(--error-text)' }}>
            {scanError}
          </p>
        ) : null}
      </motion.div>
      {/* Edge: la librería fue borrada pero quedó cola hidratada de otra sesión.
          Drawer y barra siguen disponibles para verla y controlarla. */}
      <QueueDrawer favorites={favorites} open={queueOpen} onClose={() => setQueueOpen(false)} />
      <BottomPlayerBar onToggleFullscreen={onToggleFullscreen} />
      </div>
    );
  }

  const viewProps = {
    tracks: allTracks,
    search,
    favorites,
    onPlay: handlePlay,
    onContextMenu: handleContextMenu,
  };

  const renderTab = () => {
    if (tab === 'albums') {
      return <AlbumsView {...viewProps} emptyState={<EmptyMessage title={`Sin álbumes para «${search.trim()}»`} />} />;
    }

    if (tab === 'artists') {
      return <ArtistsView {...viewProps} emptyState={<EmptyMessage title={`Sin artistas para «${search.trim()}»`} />} />;
    }

    if (tab === 'favorites') {
      return <FavoritesView {...viewProps} />;
    }

    if (tab === 'history') {
      return <HistoryView {...viewProps} />;
    }

    if (tab === 'playlists') {
      return <PlaylistsView tracks={allTracks} search={search} playlists={playlists} onPlay={handlePlay} />;
    }

    return (
      <TracksView
        {...viewProps}
        emptyState={
          <EmptyMessage
            title={`Sin resultados para «${search.trim()}»`}
            detail="Probá con otro título, artista o álbum."
          />
        }
      />
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p
          className="text-xs font-bold uppercase"
          style={{
            color: 'var(--text-muted)',
            letterSpacing: '0.14em',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Biblioteca · {allTracks.length} pistas
        </p>
        <div className="flex items-center gap-3">
          <div className="field relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              strokeWidth={1.5}
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar en la biblioteca..."
              aria-label="Buscar en la biblioteca"
              className="w-full bg-transparent py-1.5 pl-9 pr-3 text-xs outline-none"
              style={{ color: 'var(--text-strong)', width: '240px' }}
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={scanning}
            className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {scanning ? 'Escaneando...' : 'Actualizar'}
          </button>
          {/* El drawer es una vista del módulo, no un control global del
              reproductor: su disparador vive acá y no en la barra, que ahora se
              ve desde cualquier página. */}
          <button
            type="button"
            onClick={() => setQueueOpen((open) => !open)}
            aria-label={queueOpen ? 'Cerrar cola' : 'Ver cola'}
            aria-expanded={queueOpen}
            title={queueOpen ? 'Cerrar cola' : 'Ver cola'}
            className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
            style={queueOpen ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          >
            <ListMusic className="h-3.5 w-3.5" strokeWidth={1.5} />
            Cola
          </button>
          <button
            type="button"
            onClick={() => setFoldersOpen((open) => !open)}
            aria-expanded={foldersOpen}
            title="Carpetas de la biblioteca"
            className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
            style={foldersOpen ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          >
            <Folder className="h-3.5 w-3.5" strokeWidth={1.5} />
            Carpetas · {folders.length}
          </button>
        </div>
      </div>

      {foldersOpen ? (
        <div
          className="mt-4 border-y py-3"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
        >
          {folders.length === 0 ? (
            <p className="px-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Todavía no hay carpetas en la biblioteca.
            </p>
          ) : (
            folders.map((folderPath) => (
              <div key={folderPath} className="row-hover flex items-center gap-3 px-3 py-2">
                <Folder className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                <p
                  className="min-w-0 flex-1 truncate"
                  style={{ color: 'var(--text-normal)', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}
                  title={folderPath}
                >
                  {folderPath}
                </p>
                <button
                  type="button"
                  onClick={() => api?.music?.showInFolder?.(folderPath)}
                  className="link-accent shrink-0 text-xs font-medium"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFolder(folderPath)}
                  aria-label={`Quitar ${folderPath} de la biblioteca`}
                  title="Quitar de la biblioteca"
                  className="shrink-0 p-1"
                  style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 border-t px-3 pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={handleAddFolder}
              disabled={scanning}
              className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Agregar carpeta
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={scanning || folders.length === 0}
              className="link-accent text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              Re-escanear todo
            </button>
            {notice ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {notice}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {scanError ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--error-text)' }}>
          {scanError}
        </p>
      ) : null}

      <div className="mt-5 flex items-end gap-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {TABS.map((item) => {
          const isActive = item.id === tab;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={isActive}
              className={`relative pb-2 text-xs font-bold uppercase ${isActive ? '' : 'tab-hover'}`}
              style={{
                color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
                letterSpacing: '0.14em',
                borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
        className="mt-5 flex-1 overflow-y-auto"
      >
        {renderTab()}
      </motion.div>

      {/* Última en el flow y sticky: se apoya sola al final del módulo cuando el
          contenido es corto y queda flotando sobre la lista cuando hay scroll,
          sin reservar padding artificial ni pisar el sidebar. */}
      <BottomPlayerBar onToggleFullscreen={onToggleFullscreen} />

      {/* El drawer vive acá y no en el provider: la cola solo tiene sentido
          mientras estás en Música, no flotando sobre Notas o Calendario. */}
      <QueueDrawer favorites={favorites} open={queueOpen} onClose={() => setQueueOpen(false)} />

      <AddToPlaylistModal
        open={Boolean(addToPlaylistTrack)}
        track={addToPlaylistTrack}
        playlists={playlists.playlists}
        // El track lo devuelve el modal: para cuando estas callbacks corren, el
        // state que las abrió ya se limpió al cerrar.
        onAdd={(playlistId, target) => playlists.addTrack(playlistId, target.path)}
        onCreate={async (name, target) => {
          const created = await playlists.create(name);
          if (created && target) playlists.addTrack(created.id, target.path);
        }}
        onClose={() => setAddToPlaylistTrack(null)}
      />

      {contextMenu ? (
        <TrackContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={buildActions(contextMenu.track)}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

export default Musica;
