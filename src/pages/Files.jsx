import { Download, FileText } from 'lucide-react';
import ResultsTable from '../components/ResultsTable';

function Files({ activities = [], loading }) {
  const attachments = activities.flatMap((activity) =>
    (activity.archivos || []).map((file) => ({
      source: activity.materia,
      status: activity.estado,
      detail: `${activity.nombre} -> ${file.name}`,
      file,
    })),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-xl font-semibold text-white">Descargas detectadas</h3>
            <p className="mt-2 text-sm text-slate-400">
              Este panel agrupa los archivos adjuntos encontrados dentro de las actividades
              extraídas desde iVirtual.
            </p>
          </div>
        </div>
      </section>

      {attachments.length > 0 ? (
        <div className="space-y-3">
          {attachments.map((entry) => (
            <div
              key={`${entry.file.url}-${entry.file.name}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white">{entry.file.name}</p>
                <p className="mt-1 text-sm text-slate-400">{entry.detail}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
                  {entry.source} · {entry.status}
                </p>
              </div>
              <a
                href={entry.file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Download className="h-4 w-4" />
                Descargar
              </a>
            </div>
          ))}
        </div>
      ) : (
        <ResultsTable rows={[]} loading={loading} />
      )}
    </div>
  );
}

export default Files;
