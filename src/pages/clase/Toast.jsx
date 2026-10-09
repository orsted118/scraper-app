// La región viva existe SIEMPRE y solo cambia su contenido: un lector de
// pantalla no anuncia un nodo aria-live que aparece ya con el texto adentro.
export default function Toast({ mensaje }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-16 left-1/2 z-[70] -translate-x-1/2">
      {mensaje ? (
        <div
          className="border px-4 py-2 text-xs"
          style={{
            borderColor: 'var(--border-normal)',
            background: 'var(--bg-card)',
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-mono, monospace)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          {mensaje}
        </div>
      ) : null}
    </div>
  );
}
