function Files() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[
        ['CSV', 'Preparado para pipelines con csv-parse.'],
        ['PDF', 'Preparado para lectura local con pdf-parse.'],
        ['XLSX', 'Preparado para importaciones y mapeo con xlsx.'],
      ].map(([label, detail]) => (
        <article
          key={label}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
          <h3 className="mt-3 text-xl font-medium text-white">{label} Handler</h3>
          <p className="mt-3 text-sm text-slate-400">{detail}</p>
        </article>
      ))}
    </div>
  );
}

export default Files;
