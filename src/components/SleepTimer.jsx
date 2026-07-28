import { Moon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

const PRESETS = [15, 30, 60];

// mm:ss aunque pase de una hora: 90 minutos se leen 90:00. Un tercer campo solo
// para el caso raro complicaría la lectura del caso normal.
export function formatCountdown(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Popover del sleep timer. Vive en la barra inferior y no en la vista
// fullscreen: la barra está disponible desde cualquier página, y dormirse
// escuchando música no requiere tener el reproductor a pantalla completa.
function SleepTimer() {
  const player = useMusicPlayer();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  const active = Boolean(player?.sleepTimerEndsAt);
  const remaining = player?.sleepTimerRemaining;

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const start = (minutes) => {
    player.startSleepTimer(minutes);
    setOpen(false);
  };

  const startCustom = () => {
    const minutes = Number(custom);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    setCustom('');
    start(minutes);
  };

  const optionStyle = {
    color: 'var(--text-normal)',
    borderRadius: 'var(--radius-button, 0px)',
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={active ? `Sleep timer activo, resta ${formatCountdown(remaining)}` : 'Sleep timer'}
        aria-expanded={open}
        title="Sleep timer"
        className="flex items-center gap-1.5 p-2"
        style={{
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          borderRadius: 'var(--radius-button, 0px)',
        }}
      >
        <Moon className="h-4 w-4" strokeWidth={1.5} />
        {active ? (
          <span
            className="text-[11px]"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCountdown(remaining)}
          </span>
        ) : null}
      </button>

      {open ? (
        // Se abre hacia arriba: el botón vive pegado al borde inferior de la
        // ventana y hacia abajo no hay lugar.
        <div
          role="menu"
          aria-label="Opciones del sleep timer"
          className="absolute bottom-full right-0 mb-2 border py-1"
          style={{
            minWidth: '240px',
            borderColor: 'var(--border)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          {active ? (
            <div className="px-3 py-2">
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
              >
                Sleep timer activo
              </p>
              <p
                className="mt-1 font-extrabold"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: '22px',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCountdown(remaining)}
              </p>
              <button
                type="button"
                onClick={() => {
                  player.cancelSleepTimer();
                  setOpen(false);
                }}
                className="mt-2 w-full border px-3 py-1.5 text-left text-sm"
                style={{
                  color: 'var(--text-normal)',
                  borderColor: 'var(--border-normal)',
                  borderRadius: 'var(--radius-button, 0px)',
                }}
              >
                Cancelar timer
              </button>
            </div>
          ) : (
            <>
              {PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  role="menuitem"
                  onClick={() => start(minutes)}
                  className="w-full px-3 py-2 text-left text-sm"
                  style={optionStyle}
                >
                  {minutes} min
                </button>
              ))}

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  player.startSleepTimerAtTrackEnd();
                  setOpen(false);
                }}
                disabled={!player?.currentTrack}
                className="w-full border-t px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
                style={{ ...optionStyle, borderTopColor: 'var(--border-subtle)' }}
              >
                Fin de la pista actual
              </button>

              <div
                className="mt-1 flex items-center gap-2 border-t px-3 pb-1 pt-2"
                style={{ borderTopColor: 'var(--border-subtle)' }}
              >
                <input
                  type="number"
                  min="1"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') startCustom();
                  }}
                  placeholder="min"
                  aria-label="Minutos personalizados"
                  className="w-16 border px-2 py-1 text-sm"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border-normal)',
                    color: 'var(--text-strong)',
                    fontFamily: 'var(--font-mono, monospace)',
                    borderRadius: 'var(--radius-button, 0px)',
                  }}
                />
                <button
                  type="button"
                  onClick={startCustom}
                  disabled={!custom || Number(custom) <= 0}
                  className="border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    color: 'var(--text-normal)',
                    borderColor: 'var(--border-normal)',
                    borderRadius: 'var(--radius-button, 0px)',
                  }}
                >
                  Iniciar
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SleepTimer;
