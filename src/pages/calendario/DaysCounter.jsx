import { useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { EASE } from '../../utils/motion';

// Numero grande + label del contador de dias. Vive suelto porque lo comparten
// el hero de la timeline y la vista Contador, con escalas distintas.
function DaysCounter({ value, label, accent = false, size = 'hero' }) {
  const isXL = size === 'xl';
  const reduced = useReducedMotion();
  const isNumeric = typeof value === 'number';

  const motionValue = useMotionValue(isNumeric ? value : 0);
  const rounded = useTransform(motionValue, (current) => Math.round(current));
  const [display, setDisplay] = useState(value);

  // Solo el XL (Contador) interpola: ahi el numero cambia mientras el usuario
  // mueve las fechas. El hero de la timeline salta despues de un sync y animar
  // de 90 dias a 3 se leeria como ruido; ademas manda "HOY", que no es numero.
  useEffect(() => {
    if (!isXL || reduced || !isNumeric) {
      setDisplay(value);
      if (isNumeric) motionValue.set(value);
      return undefined;
    }

    const controls = animate(motionValue, value, { duration: 0.4, ease: EASE });
    const unsubscribe = rounded.on('change', (current) => setDisplay(current));

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, isXL, reduced, isNumeric, motionValue, rounded]);

  return (
    <>
      <p
        className={isXL ? 'font-extrabold' : 'text-5xl font-extrabold leading-none'}
        style={{
          color: accent ? 'var(--accent)' : 'var(--text-strong)',
          fontFamily: 'var(--font-display, sans-serif)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: isXL ? '-0.04em' : '-0.02em',
          fontSize: isXL ? 'clamp(72px, 12vw, 160px)' : undefined,
          lineHeight: isXL ? 0.9 : undefined,
        }}
      >
        {display}
      </p>
      <p
        className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
    </>
  );
}

export default DaysCounter;
