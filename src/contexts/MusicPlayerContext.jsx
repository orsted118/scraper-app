import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const MusicPlayerContext = createContext(null);

const SAVE_DEBOUNCE_MS = 500;

// dvpotro-media:///C:/ruta/cancion.mp3 — el protocolo custom del main process
// sirve el archivo (file:// no carga desde el origin http del dev server).
export function buildMediaUrl(filePath) {
  if (!filePath) return '';
  const normalized = String(filePath).replace(/\\/g, '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `dvpotro-media://${encodeURI(withLeadingSlash)}`;
}

export function MusicPlayerProvider({ children }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const audioRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  // currentTime al que hay que saltar cuando el <audio> termine de cargar la
  // pista hidratada desde disco (no se puede setear antes de loadedmetadata).
  const pendingSeekRef = useRef(null);
  const hydratedRef = useRef(false);

  const [queue, setQueueState] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeatState] = useState('off'); // 'off' | 'all' | 'one'

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] || null : null;

  const loadTrackIntoAudio = useCallback((track, { autoplay = false, seekTo = null } = {}) => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    pendingSeekRef.current = seekTo;
    audio.src = buildMediaUrl(track.path);

    if (autoplay) {
      audio.play().catch(() => {
        // El archivo puede haber desaparecido del disco: el estado visual no
        // debe quedar en "reproduciendo" un silencio.
        setIsPlaying(false);
      });
    }
  }, []);

  const jumpTo = useCallback(
    (index) => {
      if (index < 0 || index >= queue.length) return;
      setCurrentIndex(index);
      setPosition(0);
      setIsPlaying(true);
      loadTrackIntoAudio(queue[index], { autoplay: true });
    },
    [queue, loadTrackIntoAudio],
  );

  const pickNextIndex = useCallback(
    (direction) => {
      if (queue.length === 0) return -1;

      if (shuffle && queue.length > 1) {
        let candidate = currentIndex;
        while (candidate === currentIndex) {
          candidate = Math.floor(Math.random() * queue.length);
        }
        return candidate;
      }

      const raw = currentIndex + direction;

      if (repeat === 'all') {
        return (raw + queue.length) % queue.length;
      }

      return raw >= 0 && raw < queue.length ? raw : -1;
    },
    [queue.length, currentIndex, shuffle, repeat],
  );

  const next = useCallback(() => {
    const index = pickNextIndex(1);
    if (index >= 0) jumpTo(index);
  }, [pickNextIndex, jumpTo]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // Convención estándar: si la pista ya avanzó, prev reinicia; si está al
    // principio, va a la anterior.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const index = pickNextIndex(-1);
    if (index >= 0) jumpTo(index);
  }, [pickNextIndex, jumpTo]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (!audio.src) {
      loadTrackIntoAudio(currentTrack, { autoplay: true, seekTo: position });
      setIsPlaying(true);
      return;
    }

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [currentTrack, position, loadTrackIntoAudio]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const setQueue = useCallback((tracks, startIndex = -1) => {
    setQueueState(Array.isArray(tracks) ? tracks : []);
    setCurrentIndex(startIndex);
    setPosition(0);
  }, []);

  // setQueue + jumpTo en un solo paso: evita la carrera de setState cuando la
  // página quiere alinear la cola Y reproducir en el mismo click.
  const playFromList = useCallback(
    (tracks, index) => {
      const list = Array.isArray(tracks) ? tracks : [];
      if (index < 0 || index >= list.length) return;
      setQueueState(list);
      setCurrentIndex(index);
      setPosition(0);
      setIsPlaying(true);
      loadTrackIntoAudio(list[index], { autoplay: true });
    },
    [loadTrackIntoAudio],
  );

  const toggleShuffle = useCallback(() => setShuffle((previous) => !previous), []);
  const setRepeat = useCallback((mode) => {
    setRepeatState(['off', 'all', 'one'].includes(mode) ? mode : 'off');
  }, []);

  // Eventos del <audio>: la única fuente de verdad de position/duration.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTimeUpdate = () => setPosition(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      if (pendingSeekRef.current !== null) {
        audio.currentTime = pendingSeekRef.current;
        setPosition(pendingSeekRef.current);
        pendingSeekRef.current = null;
      }
    };
    const onEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        return;
      }
      const index = pickNextIndex(1);
      if (index >= 0) {
        jumpTo(index);
      } else {
        setIsPlaying(false);
        setPosition(0);
      }
    };
    const onError = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [repeat, pickNextIndex, jumpTo]);

  // Hidratación al arrancar: restaura pista, posición y volumen — SIEMPRE en
  // pausa. Auto-play al abrir la app sería una emboscada al usuario.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    api?.music
      ?.loadState?.()
      .then((saved) => {
        if (!saved || !Array.isArray(saved.queue) || saved.queue.length === 0) return;

        const index = Number.isInteger(saved.currentIndex) && saved.currentIndex >= 0 && saved.currentIndex < saved.queue.length
          ? saved.currentIndex
          : -1;

        setQueueState(saved.queue);
        setCurrentIndex(index);
        setShuffle(Boolean(saved.shuffle));
        setRepeatState(['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off');

        const savedVolume = Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 1;
        setVolumeState(savedVolume);
        if (audioRef.current) {
          audioRef.current.volume = savedVolume;
        }

        const savedPosition = Number.isFinite(saved.position) ? saved.position : 0;
        setPosition(savedPosition);

        if (index >= 0) {
          loadTrackIntoAudio(saved.queue[index], { autoplay: false, seekTo: savedPosition });
        }
      })
      .catch(() => {});
    // api estable durante la vida del renderer.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistencia con debounce: cualquier cambio relevante → music-state.json.
  useEffect(() => {
    if (!api?.music?.saveState || queue.length === 0) return undefined;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      api.music.saveState({
        queue,
        currentIndex,
        position: Math.floor(position),
        volume,
        shuffle,
        repeat,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [api, queue, currentIndex, position, volume, shuffle, repeat]);

  const value = {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    queue,
    currentIndex,
    shuffle,
    repeat,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    setQueue,
    jumpTo,
    playFromList,
    toggleShuffle,
    setRepeat,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      {/* Único <audio> de la app: vive acá para sobrevivir la navegación. */}
      <audio ref={audioRef} preload="metadata" />
    </MusicPlayerContext.Provider>
  );
}

export const useMusicPlayer = () => useContext(MusicPlayerContext);
