function TaskPanel({ title, description, children }) {
  return (
    <main className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
      <header className="border-b border-slate-800 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Workspace</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">{description}</p>
      </header>

      <section className="pt-8">{children}</section>
    </main>
  );
}

export default TaskPanel;
