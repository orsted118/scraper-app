import { FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BottomPlayerBar from '../components/BottomPlayerBar';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { EASE } from '../utils/motion';


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
  const [library, setLibrary] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

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
    player.playFromList(library.tracks, index);
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
          — la barra sigue disponible (retorna null sola si no hay pista). */}
      <div className="mt-4">
        <BottomPlayerBar />
      </div>
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
          Biblioteca · {library.tracks.length} pistas
        </p>
        <div className="flex items-center gap-3">
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
        {library.tracks.map((track, index) => {
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
        <BottomPlayerBar />
      </div>
    </div>
  );
}

export default Musica;
