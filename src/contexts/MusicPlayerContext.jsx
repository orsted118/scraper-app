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

// Las portadas viven en userData/music-covers y las sirve el mismo protocolo,
// que autoriza esa carpeta aparte de la librería. Alias con nombre propio para
// que el consumidor no tenga que saber que audio e imagen comparten transporte.
export const buildCoverUrl = buildMediaUrl;

export function MusicPlayerProvider({ children }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const audioRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  // currentTime al que hay que saltar cuando el <audio> termine de cargar la
  // pista hidratada desde disco (no se puede setear antes de loadedmetadata).
  const pendingSeekRef = useRef(null);
  const hydratedRef = useRef(false);
  // Pista en curso y si su escucha ya se registró en el historial.
  const scrobbleRef = useRef({ path: null, registered: false });

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

  // Acepta un número o un updater (previous) => next. El updater importa para
  // los atajos de teclado: con la tecla repetida las pulsaciones llegan mucho
  // más rápido que los renders, y leer `volume` del render anterior hacía que
  // treinta pulsaciones movieran el volumen un solo paso.
  const setVolume = useCallback((value) => {
    setVolumeState((previous) => {
      const next = typeof value === 'function' ? value(previous) : value;
      return Math.min(1, Math.max(0, Number.isFinite(next) ? next : previous));
    });
  }, []);

  // El <audio> sigue al state en vez de que cada setter lo toque: un solo lugar
  // donde se sincroniza, y cubre también la hidratación.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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

  // Inserta justo después de la actual sin cortarla. Con la cola vacía no hay
  // "después": la pista arranca y se convierte en la cola.
  const playNext = useCallback(
    (track) => {
      if (!track) return;

      if (queue.length === 0 || currentIndex < 0) {
        playFromList([track], 0);
        return;
      }

      setQueueState((current) => {
        const next = [...current];
        next.splice(currentIndex + 1, 0, track);
        return next;
      });
    },
    [queue.length, currentIndex, playFromList],
  );

  const enqueue = useCallback(
    (track) => {
      if (!track) return;

      if (queue.length === 0) {
        playFromList([track], 0);
        return;
      }

      setQueueState((current) => [...current, track]);
    },
    [queue.length, playFromList],
  );

  const toggleShuffle = useCallback(() => setShuffle((previous) => !previous), []);
  const setRepeat = useCallback((mode) => {
    setRepeatState(['off', 'all', 'one'].includes(mode) ? mode : 'off');
  }, []);

  const removeFromQueue = useCallback(
    (index) => {
      if (index < 0 || index >= queue.length) return;

      const nextQueue = queue.filter((_, entryIndex) => entryIndex !== index);
      setQueueState(nextQueue);

      if (nextQueue.length === 0) {
        const audio = audioRef.current;
        audio?.pause();
        if (audio) audio.removeAttribute('src');
        setCurrentIndex(-1);
        setIsPlaying(false);
        setPosition(0);
        return;
      }

      if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1);
        return;
      }

      if (index > currentIndex) return;

      // Se quitó la pista sonando. La que ocupa su lugar toma la posta; si era
      // la última no hay siguiente, así que queda cargada y en pausa al final.
      const isLast = index >= nextQueue.length;
      const targetIndex = isLast ? nextQueue.length - 1 : index;

      setCurrentIndex(targetIndex);
      setPosition(0);

      if (isLast) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }

      loadTrackIntoAudio(nextQueue[targetIndex], { autoplay: !isLast && isPlaying });
    },
    [queue, currentIndex, isPlaying, loadTrackIntoAudio],
  );

  const reorderQueue = useCallback(
    (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= queue.length) return;
      if (toIndex < 0 || toIndex >= queue.length) return;

      const nextQueue = [...queue];
      const [moved] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, moved);
      setQueueState(nextQueue);

      // currentIndex apunta a la pista que suena, no a una posición fija: si el
      // reordenamiento la corre, el índice la sigue. Nunca se recarga el
      // <audio>, así que mover la cola no interrumpe la reproducción.
      setCurrentIndex((current) => {
        if (current < 0) return current;
        if (current === fromIndex) return toIndex;
        if (fromIndex < current && toIndex >= current) return current - 1;
        if (fromIndex > current && toIndex <= current) return current + 1;
        return current;
      });
    },
    [queue],
  );

  // Eventos del <audio>: la única fuente de verdad de position/duration.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTimeUpdate = () => {
      setPosition(audio.currentTime);
      // Alimenta la barra de progreso que Windows dibuja en el volume flyout.
      // Chromium tira si position excede duration, cosa que pasa un instante al
      // cambiar de pista, así que se valida antes de mandar.
      const media = navigator.mediaSession;
      if (media?.setPositionState && Number.isFinite(audio.duration) && audio.duration > 0) {
        try {
          media.setPositionState({
            duration: audio.duration,
            position: Math.min(audio.currentTime, audio.duration),
            playbackRate: 1,
          });
        } catch (_error) {
          // Estado transitorio inconsistente: el próximo timeupdate lo corrige.
        }
      }
    };
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
        // Rearmar el scrobble a mano: currentTrack no cambia al repetir la misma
        // pista, así que el efecto que lo resetea no corre y la segunda vuelta
        // nunca se registraría.
        scrobbleRef.current = { path: scrobbleRef.current.path, registered: false };
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

  // ── Integración con el OS ──────────────────────────────────────
  // MediaSession alimenta lo que Windows dibuja (volume flyout, centro de
  // notificaciones, lockscreen) y sus botones. Las teclas físicas del teclado
  // van por globalShortcut en main: son dos caminos distintos y conviven.

  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media) return;

    if (!currentTrack) {
      media.metadata = null;
      return;
    }

    media.metadata = new window.MediaMetadata({
      title: currentTrack.title || '',
      artist: currentTrack.artist || '',
      album: currentTrack.album || '',
      // MediaMetadata rechaza undefined en artwork: sin portada va lista vacía.
      artwork: currentTrack.coverPath
        ? [{ src: buildCoverUrl(currentTrack.coverPath), sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });
  }, [currentTrack]);

  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media) return;
    media.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media?.setActionHandler) return undefined;

    const handlers = {
      play,
      pause,
      nexttrack: next,
      previoustrack: prev,
      seekto: (details) => {
        if (Number.isFinite(details?.seekTime)) seek(details.seekTime);
      },
      seekbackward: (details) => {
        const offset = Number.isFinite(details?.seekOffset) ? details.seekOffset : 10;
        seek(Math.max(0, (audioRef.current?.currentTime || 0) - offset));
      },
      seekforward: (details) => {
        const offset = Number.isFinite(details?.seekOffset) ? details.seekOffset : 10;
        const audio = audioRef.current;
        const max = Number.isFinite(audio?.duration) ? audio.duration : Infinity;
        seek(Math.min(max, (audio?.currentTime || 0) + offset));
      },
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        media.setActionHandler(action, handler);
      } catch (_error) {
        // Acción no soportada por esta versión de Chromium: se ignora.
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          media.setActionHandler(action, null);
        } catch (_error) {
          // Nada que desregistrar.
        }
      }
    };
  }, [play, pause, next, prev, seek]);

  // Las teclas multimedia llegan por IPC. La suscripción es mount-only y lee
  // los handlers de un ref: re-suscribir en cada cambio de identidad de
  // toggle/next/prev haría rebotar el canal cuatro veces por segundo.
  const mediaKeyHandlersRef = useRef({ toggle, next, prev });
  mediaKeyHandlersRef.current = { toggle, next, prev };

  useEffect(() => {
    if (!api?.music?.onMediaKey) return undefined;

    return api.music.onMediaKey((key) => {
      const handlers = mediaKeyHandlersRef.current;
      if (key === 'play-pause') handlers.toggle();
      if (key === 'next') handlers.next();
      if (key === 'prev') handlers.prev();
    });
    // api estable durante la vida del renderer.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Historial de escucha ───────────────────────────────────────
  // Umbral de scrobble clásico: 30 segundos o la mitad de la pista, lo que
  // ocurra antes. Se registra al cruzarlo y no al terminar, así una pista que
  // se skipea al 60% cuenta igual — que es lo que el usuario realmente escuchó.
  useEffect(() => {
    scrobbleRef.current = { path: currentTrack?.path || null, registered: false };
  }, [currentTrack?.path]);

  useEffect(() => {
    if (!api?.history?.add || !isPlaying) return undefined;

    // Chequeo cada 5s en vez de por timeupdate: timeupdate dispara cuatro veces
    // por segundo y esto no necesita esa resolución.
    const timer = setInterval(() => {
      const audio = audioRef.current;
      const state = scrobbleRef.current;

      if (!audio || !state.path || state.registered) return;
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

      if (audio.currentTime >= Math.min(30, audio.duration / 2)) {
        state.registered = true;
        api.history.add(state.path, new Date().toISOString()).catch(() => {
          // Falló el disco: se reintenta en la próxima reproducción, no vale
          // la pena romper nada por una entrada de historial.
        });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [api, isPlaying]);

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

        // El efecto de sincronización de arriba se encarga del <audio>.
        setVolumeState(Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 1);

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
    removeFromQueue,
    reorderQueue,
    playNext,
    enqueue,
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
