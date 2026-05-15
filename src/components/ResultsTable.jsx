const defaultRows = [
  { source: 'playwright-job-001', status: 'Ready', detail: 'Esperando instrucciones de scraping.' },
  { source: 'automation-batch-001', status: 'Queued', detail: 'Base de automatización creada.' },
  { source: 'local-file-001', status: 'Idle', detail: 'Aún no se han cargado archivos.' },
];

function ResultsTable({ rows = defaultRows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Origen</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/60 text-slate-200">
          {rows.map((row) => (
            <tr key={row.source}>
              <td className="px-4 py-3">{row.source}</td>
              <td className="px-4 py-3">{row.status}</td>
              <td className="px-4 py-3 text-slate-400">{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ResultsTable;
