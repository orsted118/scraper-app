// Cinco vistas necesitan el mismo bloque vacío centrado. Duplicarlo cinco veces
// garantiza que se desincronicen a la primera corrección tipográfica.
function EmptyMessage({ title, detail }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <p
        className="text-sm font-bold"
        style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
      >
        {title}
      </p>
      {detail ? (
        <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export default EmptyMessage;
