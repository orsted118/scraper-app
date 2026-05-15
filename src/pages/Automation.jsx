function Automation() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Queue</p>
        <h3 className="mt-3 text-xl font-medium text-white">Automation Control Surface</h3>
        <p className="mt-3 text-sm text-slate-400">
          Este espacio queda preparado para ejecutar batches, retries y tareas guiadas por prompts.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
        <ul className="mt-3 space-y-3 text-sm text-slate-300">
          <li>IPC listo para `automation:run`.</li>
          <li>UI base separada del flujo de scraping.</li>
          <li>Espacio reservado para logs y reintentos.</li>
        </ul>
      </section>
    </div>
  );
}

export default Automation;
