import ResultsTable from '../components/ResultsTable';

function Scraper() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Runner</p>
          <h3 className="mt-3 text-lg font-medium text-white">Playwright Bridge</h3>
          <p className="mt-2 text-sm text-slate-400">
            Punto de entrada para sesiones de scraping y automatización de formularios.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Scope</p>
          <h3 className="mt-3 text-lg font-medium text-white">Selectors + Click Flow</h3>
          <p className="mt-2 text-sm text-slate-400">
            Base visual para modelar secuencias de clicks, extracción y validación.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Output</p>
          <h3 className="mt-3 text-lg font-medium text-white">Structured Results</h3>
          <p className="mt-2 text-sm text-slate-400">
            Diseñado para mostrar resultados tabulares y trazas de ejecución.
          </p>
        </article>
      </section>

      <ResultsTable />
    </div>
  );
}

export default Scraper;
