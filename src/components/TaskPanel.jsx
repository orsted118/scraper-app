function TaskPanel({ title, description, children }) {
  return (
    <main
      // min-w-0: como hijo flex, min-width auto le impide encoger bajo el ancho
      // intrinseco del contenido (el masonry de Notas desbordaba el layout).
      className="min-w-0 flex-1 border p-8"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border-subtle)',
        borderRadius: 'var(--radius-card, 24px)',
      }}
    >
      <header className="border-b pb-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-muted)' }}>
          Workspace
        </p>
        <h2
          className="mt-3 text-3xl font-bold"
          style={{
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-display, inherit)',
            letterSpacing: '-0.02em',
            textWrap: 'balance',
          }}
        >
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </header>

      <section className="pt-8">{children}</section>
    </main>
  );
}

export default TaskPanel;
