import { Inbox } from 'lucide-react';

function SkeletonRows() {
  return (
    <tbody className="animate-pulse divide-y divide-slate-800 bg-slate-950/60">
      {Array.from({ length: 3 }).map((_, index) => (
        <tr key={index}>
          <td className="px-4 py-4">
            <div className="h-4 w-40 rounded bg-slate-800" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-20 rounded bg-slate-800" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-full rounded bg-slate-800" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function ResultsTable({ rows = [], loading = false }) {
  if (loading) {
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
          <SkeletonRows />
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 py-10 text-center text-slate-400">
        <Inbox className="h-8 w-8 text-slate-600" />
        <p className="text-sm">Sin resultados aún.</p>
      </div>
    );
  }

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
