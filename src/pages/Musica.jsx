import {
  ChevronsRight,
  FolderOpen,
  Heart,
  Link2,
  ListMusic,
  ListPlus,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import QueueDrawer from '../components/QueueDrawer';
import TrackContextMenu from '../components/TrackContextMenu';
import AlbumsView from '../components/music/AlbumsView';
import ArtistsView from '../components/music/ArtistsView';
import EmptyMessage from '../components/music/EmptyMessage';
import FavoritesView from '../components/music/FavoritesView';
import HistoryView from '../components/music/HistoryView';
import TracksView from '../components/music/TracksView';
import useFavorites from '../hooks/useFavorites';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { EASE } from '../utils/motion';

const TABS = [
  { id: 'tracks', label: 'Pistas' },
  { id: 'albums', label: 'Álbumes' },
  { id: 'artists', label: 'Artistas' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'history', label: 'Historial' },
];

function Musica() {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const reduced = useReducedMotion();
  const player = useMusicPlayer();
  const favorites = useFavorites();
  const searchInputRef = useRef(null);
  const [library, setLibrary] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [search, setSearch] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);
  const [tab, setTab] = useState('tracks');
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    let mounted = true;

    api?.music
      ?.getLibrary?.()
      .then((cached) => {
        if (mounted && cached?.tracks) {
          setLibrary(cached);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
    // api estable durante la vida del renderer.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const runScan = async (folderPath) => {
    setScanning(true);
    setScanError('');

    try {
      const result = await api.music.scanFolder(folderPath);

      if (result?.error) {
        setScanError(result.error);
        return;
      }

      setLibrary(result);
      // La cola del player se alinea a la librería nueva; nada suena solo.
      player?.setQueue?.(result.tracks, -1);
    } catch (_error) {
      setScanError('No fue posible escanear la carpeta.');
    } finally {
      setScanning(false);
    }
  };

  const handlePickFolder = async () => {
    if (!api?.music?.pickFolder) {
      setScanError('Disponible solo dentro de Electron.');
      return;
    }

    try {
      const folderPath = await api.music.pickFolder();
      if (!folderPath) return;
      await runScan(folderPath);
    } catch (_error) {
      setScanError('Error al seleccionar carpeta.');
    }
  };

  const handleRefresh = async () => {
    if (!library?.folderPath) return;
    await runScan(library.folderPath);
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

  if (!loaded) {
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
          Elige una carpeta de tu equipo y DVPotro la escanea completa: MP3, M4A, FLAC, OGG y WAV.
        </p>
        <button
          type="button"
          onClick={handlePickFolder}
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
          El drawer sigue disponible para verla; la barra la monta App. */}
      <QueueDrawer favorites={favorites} open={queueOpen} onClose={() => setQueueOpen(false)} />
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
          <button type="button" onClick={handlePickFolder} disabled={scanning} className="link-accent text-xs font-medium">
            Cambiar carpeta
          </button>
        </div>
      </div>
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

      {/* El drawer vive acá y no en el provider: la cola solo tiene sentido
          mientras estás en Música, no flotando sobre Notas o Calendario. */}
      <QueueDrawer favorites={favorites} open={queueOpen} onClose={() => setQueueOpen(false)} />

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
