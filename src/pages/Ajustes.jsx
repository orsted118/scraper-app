import { FolderCog, ShieldCheck } from 'lucide-react';

function Ajustes({ lastSyncAt }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-start gap-3">
          <FolderCog className="mt-1 h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-xl font-semibold text-white">Configuración local</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              ScraperApp usa variables locales en <code>.env</code> para autenticarse contra iVirtual.
              El archivo está ignorado por Git y se carga desde el proceso principal de Electron.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
              <li>Extracción por curso usando el índice de tareas de Moodle.</li>
              <li>Última sincronización registrada: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Ajustes;
