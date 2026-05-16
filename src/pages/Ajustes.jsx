import { AlertCircle, CheckCircle, FolderCog, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

function Ajustes({ error, lastSyncAt, loading }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      if (!api) {
        if (mounted) {
          setFeedback({
            type: 'error',
            message: 'ScraperApp debe ejecutarse dentro de Electron para administrar credenciales.',
          });
          setSettingsLoading(false);
        }
        return;
      }

      try {
        const response = await api.getSettings();

        if (!mounted) {
          return;
        }

        setUser(response?.user || '');
        setHasPassword(Boolean(response?.hasPassword));
      } catch (_error) {
        if (mounted) {
          setFeedback({
            type: 'error',
            message: 'No fue posible leer la configuración actual.',
          });
        }
      } finally {
        if (mounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [api]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!api) {
      setFeedback({
        type: 'error',
        message: 'ScraperApp debe ejecutarse dentro de Electron para guardar credenciales.',
      });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const result = await api.saveSettings({ user, password });

      if (!result?.success) {
        setFeedback({
          type: 'error',
          message: result?.error || 'No fue posible guardar las credenciales.',
        });
        return;
      }

      setPassword('');
      setHasPassword(true);
      setFeedback({
        type: 'success',
        message: 'Credenciales guardadas correctamente',
      });
    } catch (_error) {
      setFeedback({
        type: 'error',
        message: 'No fue posible guardar las credenciales.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <p>{error}</p>
        </div>
      ) : null}

      {feedback.message ? (
        <div
          className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-sm ${
            feedback.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
              : 'border border-red-500/30 bg-red-500/10 text-red-100'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          )}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex items-start gap-3">
            <FolderCog className="mt-1 h-5 w-5 text-itson-blue" />
            <div className="w-full">
              <h3 className="text-xl font-semibold text-white">Configuración local</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                ScraperApp usa variables locales en <code>.env</code> para autenticarse contra iVirtual.
                Ahora puedes administrarlas desde la app sin editar archivos manualmente.
              </p>
            </div>
          </div>

          {settingsLoading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando configuración...
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">ID de usuario</span>
                <input
                  type="text"
                  value={user}
                  onChange={(event) => setUser(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
                  placeholder="Ej. 00000279009"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500">
                  {hasPassword
                    ? 'Si dejas este campo vacío, se conservará la contraseña actual.'
                    : 'Aún no hay contraseña guardada en la configuración local.'}
                </p>
              </label>

              <button
                type="submit"
                disabled={saving || settingsLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Guardando...' : 'Guardar credenciales'}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
            <div>
              <h3 className="text-xl font-semibold text-white">Estado operativo</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Login automatizado vía Playwright contra iVirtual ITSON.</li>
                <li>Extracción por curso usando el índice de tareas de Moodle.</li>
                <li>
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sincronizando...
                    </span>
                  ) : (
                    <>Última sincronización: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}.</>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Ajustes;
