import { FolderOpen, Loader2, RefreshCw, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import BottomPlayerBar, { TrackCover } from '../components/BottomPlayerBar';
import QueueDrawer from '../components/QueueDrawer';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { EASE } from '../utils/motion';

// usage:'search' + sensitivity:'base' ignora mayúsculas y diacríticos, así que
// "cancion" encuentra "Canción".
const SEARCH_COLLATOR = new Intl.Collator('es', { sensitivity: 'base', usage: 'search' });

function matchesQuery(haystack, needle) {
  const text = String(haystack || '');
  const size = needle.length;

  for (let start = 0; start + size <= text.length; start += 1) {
    if (SEARCH_COLLATOR.compare(text.slice(start, start + size), needle) === 0) {
      return true;
    }
  }

  return false;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—:——';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function Musica() {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const reduced = useReducedMotion();
  const player = useMusicPlayer();
  const searchInputRef = useRef(null);
  const [library, setLibrary] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [search, setSearch] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);

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

  const allTracks = library?.tracks;
  const visibleTracks = useMemo(() => {
    const tracks = allTracks || [];
    const needle = search.trim();

    if (!needle) return tracks;

    return tracks.filter(
      (track) =>
        matchesQuery(track.title, needle) ||
        matchesQuery(track.artist, needle) ||
        matchesQuery(track.album, needle),
    );
  }, [allTracks, search]);

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

  const handleTrackClick = (index) => {
    // playFromList alinea cola + reproduce en un paso: la cola persistida de
    // una sesión anterior puede no coincidir con la librería re-escaneada.
    //
    // La cola se arma con los resultados filtrados, no con la librería entera:
    // si buscás un artista y le das play, "siguiente" tiene que seguir dentro de
    // ese artista y no saltar a lo que venía después en la biblioteca completa.
    player.playFromList(visibleTracks, index);
  };

  if (!loaded) {
    return null;
  }

  // ── Empty state: primera vez, sin carpeta elegida ─────────────
  if (!library?.tracks?.length) {
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
      {/* Edge: hay pista hidratada de otra sesión pero la librería fue borrada
          — la barra sigue disponible (retorna null sola si no hay pista). Esa
          cola hidratada es justamente la que el drawer tiene que poder mostrar,
          así que acá va cableado igual que en la vista con biblioteca. */}
      <div className="mt-4">
        <BottomPlayerBar queueOpen={queueOpen} onToggleQueue={() => setQueueOpen((open) => !open)} />
      </div>
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
      </div>
    );
  }

  // ── Biblioteca cargada: track list plana ──────────────────────
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
          Biblioteca ·{' '}
          {search.trim()
            ? `${visibleTracks.length} de ${library.tracks.length} pistas`
            : `${library.tracks.length} pistas`}
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

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
        className="mt-5 flex-1 overflow-y-auto"
      >
        {visibleTracks.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
            >
              Sin resultados para «{search.trim()}»
            </p>
            <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
              Probá con otro título, artista o álbum.
            </p>
          </div>
        ) : null}

        {visibleTracks.map((track, index) => {
          const isCurrent = player.currentTrack?.path === track.path;

          return (
            <button
              key={track.path}
              type="button"
              onClick={() => handleTrackClick(index)}
              className="row-hover flex w-full items-center gap-4 border-t px-3 py-3 text-left"
              style={{
                borderTopColor: 'var(--border-subtle)',
                borderLeftWidth: isCurrent ? '3px' : '0px',
                borderLeftStyle: 'solid',
                borderLeftColor: isCurrent ? 'var(--accent)' : 'transparent',
                paddingLeft: isCurrent ? '9px' : '12px',
              }}
            >
              <TrackCover track={track} size={32} />

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
              <p
                className="shrink-0 text-right text-xs"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatDuration(track.duration)}
              </p>
            </button>
          );
        })}
        <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />
      </motion.div>

      <div className="mt-4">
        <BottomPlayerBar queueOpen={queueOpen} onToggleQueue={() => setQueueOpen((open) => !open)} />
      </div>

      {/* El drawer vive acá y no en el provider: la cola solo tiene sentido
          mientras estás en Música, no flotando sobre Notas o Calendario. */}
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}

export default Musica;
