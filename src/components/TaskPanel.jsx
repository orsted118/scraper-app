function TaskPanel({ title, description, children }) {
  return (
    <main
      className="flex-1 rounded-3xl border p-8"
      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
    >
      <header className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: 'var(--text-muted)' }}>
          Workspace
        </p>
        <h2 className="mt-3 text-3xl font-semibold" style={{ color: 'var(--text)' }}>
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
