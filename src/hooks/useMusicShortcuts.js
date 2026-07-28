import { useEffect, useRef } from 'react';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

// Atajos de teclado del reproductor, activos desde cualquier página:
//
//   Space              play / pausa
//   F                  abrir / cerrar la vista a pantalla completa
//   Ctrl + →           pista siguiente
//   Ctrl + ←           pista anterior
//   Ctrl + ↑           subir volumen 10%
//   Ctrl + ↓           bajar volumen 10%
//   Ctrl + Shift + S   shuffle on/off
//   Ctrl + Shift + R   ciclar repetición (off → todo → una → off)
//
// Ctrl+F queda libre a propósito: lo usa el buscador de la biblioteca.
// Complementa a las teclas multimedia (globalShortcut en main), que funcionan
// con la app en segundo plano; estas requieren que DVPotro tenga foco.

const VOLUME_STEP = 0.1;
const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' };

// Escribir en un campo o accionar un control no debe disparar el reproductor.
// Los botones entran acá porque el navegador ya usa Space para activarlos.
function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName);
}

function useMusicShortcuts({ onToggleFullscreen } = {}) {
  const player = useMusicPlayer();
  // El listener se registra una sola vez; lee el player de un ref para no
  // re-suscribirse en cada tick de posición.
  const playerRef = useRef(player);
  playerRef.current = player;
  const fullscreenRef = useRef(onToggleFullscreen);
  fullscreenRef.current = onToggleFullscreen;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      const current = playerRef.current;
      if (!current) return;

      if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        current.toggle();
        return;
      }

      // Tecla pelada como Space: isTypingTarget ya descarta campos de texto, y
      // Ctrl+F queda libre para el buscador de la biblioteca.
      if (event.code === 'KeyF' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        fullscreenRef.current?.();
        return;
      }

      if (!event.ctrlKey) return;

      if (event.shiftKey) {
        if (event.code === 'KeyS') {
          event.preventDefault();
          current.toggleShuffle();
        }
        if (event.code === 'KeyR') {
          event.preventDefault();
          current.setRepeat(REPEAT_CYCLE[current.repeat]);
        }
        return;
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        current.next();
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        current.prev();
      }
      // Updater y no valor: con la tecla repetida las pulsaciones llegan más
      // rápido que los renders y un valor calculado quedaría viejo.
      if (event.code === 'ArrowUp') {
        event.preventDefault();
        current.setVolume((previous) => previous + VOLUME_STEP);
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        current.setVolume((previous) => previous - VOLUME_STEP);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}

export default useMusicShortcuts;
