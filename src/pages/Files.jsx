import { FileText } from 'lucide-react';
import ResultsTable from '../components/ResultsTable';

function Files({ activities = [], loading }) {
  const attachments = activities.flatMap((activity) =>
    (activity.archivos || []).map((file) => file),
  );
  const totals = attachments.reduce((accumulator, file) => {
    const lowerName = file.name.toLowerCase();
    let type = 'Otros';

    if (lowerName.endsWith('.pdf')) type = 'PDF';
    else if (/\.(doc|docx)$/.test(lowerName)) type = 'Word';
    else if (/\.(xls|xlsx|csv)$/.test(lowerName)) type = 'Excel';
    else if (/\.(ppt|pptx)$/.test(lowerName)) type = 'PowerPoint';
    else if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) type = 'Imágenes';

    accumulator[type] = (accumulator[type] || 0) + 1;
    return accumulator;
  }, {});
  const groupedStats = Object.entries(totals)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const totalFiles = attachments.length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-5 w-5 text-itson-blue" />
          <div>
            <h3 className="text-xl font-semibold text-white">Resumen de adjuntos</h3>
            <p className="mt-2 text-sm text-slate-400">
              Este panel concentra el total de archivos encontrados en iVirtual y su distribución
              por tipo. Las descargas individuales viven dentro de cada actividad.
            </p>
          </div>
        </div>
      </section>

      {groupedStats.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total de archivos</p>
            <p className="mt-4 text-5xl font-semibold text-white">{totalFiles}</p>
            <p className="mt-3 text-sm text-slate-400">
              Adjuntos detectados al recorrer las actividades extraídas del portal.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              barra de progreso por tipo de archivo
            </p>
            {groupedStats.map((item) => {
              const width = totalFiles > 0 ? `${(item.count / totalFiles) * 100}%` : '0%';

              return (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{item.type}</span>
                    <span className="text-slate-400">{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-itson-blue" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      ) : (
        <ResultsTable rows={[]} loading={loading} />
      )}
    </div>
  );
}

export default Files;
