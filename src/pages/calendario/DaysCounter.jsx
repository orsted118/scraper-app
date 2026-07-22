// Numero grande + label del contador de dias. Vive suelto porque lo comparten
// el hero de la timeline y la vista Contador, con escalas distintas.
function DaysCounter({ value, label, accent = false, size = 'hero' }) {
  const isXL = size === 'xl';

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
        {value}
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
