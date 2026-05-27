import {
  AlertCircle,
  CheckCircle,
  FolderCog,
  Loader2,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';
import { THEMES } from '../themes';

function CredentialSection({
  buttonLabel,
  hasPassword,
  icon: Icon,
  isLoading,
  isSaving,
  note,
  onSubmit,
  password,
  passwordLabel,
  passwordPlaceholder = '••••••••',
  passwordValueSetter,
  title,
  user,
  userLabel,
  userValueSetter,
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 text-itson-blue" />
        <div className="w-full">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {note ? <p className="mt-2 text-sm leading-6 text-slate-400">{note}</p> : null}
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">{userLabel}</span>
          <input
            type="text"
            value={user}
            onChange={(event) => userValueSetter(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
            placeholder="Ej. 00000279009"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">{passwordLabel}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => passwordValueSetter(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
            placeholder={passwordPlaceholder}
          />
          <p className="text-xs text-slate-500">
            {hasPassword
              ? 'Si dejas este campo vacío, se conservará la contraseña actual.'
              : 'Aún no hay contraseña guardada en la configuración local.'}
          </p>
        </label>

        <button
          type="submit"
          disabled={isLoading || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-itson-blue px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light disabled:cursor-not-allowed disabled:bg-itson-blue/50"
        >
          {isLoading || isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Cargando...' : isSaving ? 'Guardando...' : buttonLabel}
        </button>
      </form>
    </section>
  );
}

function Ajustes({ error, lastSyncAt, loading, onSettingsSaved }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const { themeId, setThemeId } = useTheme();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [ciaUser, setCiaUser] = useState('');
  const [ciaPassword, setCiaPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [hasCIAPassword, setHasCIAPassword] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
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
        setCiaUser(response?.ciaUser || '');
        setHasCIAPassword(Boolean(response?.hasCIAPassword));
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

  const handleSubmit = async (section) => {
    if (!api) {
      setFeedback({
        type: 'error',
        message: 'ScraperApp debe ejecutarse dentro de Electron para guardar credenciales.',
      });
      return;
    }

    setSavingSection(section);
    setFeedback({ type: '', message: '' });

    try {
      const result = await api.saveSettings({
        user,
        password: section === 'ivirtual' ? password : '',
        ciaUser,
        ciaPassword: section === 'cia' ? ciaPassword : '',
      });

      if (!result?.success) {
        setFeedback({
          type: 'error',
          message: result?.error || 'No fue posible guardar las credenciales.',
        });
        return;
      }

      if (section === 'ivirtual') {
        setPassword('');
        setHasPassword(true);
      }

      if (section === 'cia') {
        setCiaPassword('');
        setHasCIAPassword(true);
      }

      setFeedback({
        type: 'success',
        message: 'Credenciales guardadas correctamente',
      });

      if (typeof onSettingsSaved === 'function') {
        await onSettingsSaved();
      }
    } catch (_error) {
      setFeedback({
        type: 'error',
        message: 'No fue posible guardar las credenciales.',
      });
    } finally {
      setSavingSection('');
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
        <CredentialSection
          buttonLabel="Guardar credenciales"
          hasPassword={hasPassword}
          icon={FolderCog}
          isLoading={settingsLoading}
          isSaving={savingSection === 'ivirtual'}
          note="ScraperApp usa variables locales en .env para autenticarse contra iVirtual. Ahora puedes administrarlas desde la app sin editar archivos manualmente."
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit('ivirtual');
          }}
          password={password}
          passwordLabel="Contraseña"
          passwordValueSetter={setPassword}
          title="Configuración iVirtual"
          user={user}
          userLabel="ID de usuario"
          userValueSetter={setUser}
        />

        <CredentialSection
          buttonLabel="Guardar credenciales CIA"
          hasPassword={hasCIAPassword}
          icon={ShieldCheck}
          isLoading={settingsLoading}
          isSaving={savingSection === 'cia'}
          note="Credenciales CIA (Dominio institucional). Se actualiza anualmente por políticas ITSON."
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit('cia');
          }}
          password={ciaPassword}
          passwordLabel="Contraseña CIA"
          passwordPlaceholder="••••••••"
          passwordValueSetter={setCiaPassword}
          title="Credenciales CIA (Dominio institucional)"
          user={ciaUser}
          userLabel="Usuario CIA"
          userValueSetter={setCiaUser}
        />
      </div>

      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-start gap-3">
          <Palette className="mt-1 h-5 w-5" style={{ color: 'var(--accent)' }} />
          <div className="w-full">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Tema visual
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Personaliza la apariencia de la app
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(THEMES).map((themeOption) => (
                <button
                  key={themeOption.id}
                  type="button"
                  onClick={() => setThemeId(themeOption.id)}
                  className="relative flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:scale-[1.02]"
                  style={{
                    borderColor: themeId === themeOption.id ? themeOption.accent : 'var(--border)',
                    background: themeId === themeOption.id ? `${themeOption.accent}15` : 'transparent',
                    boxShadow: themeId === themeOption.id ? `0 0 0 2px ${themeOption.accent}40` : 'none',
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <div
                        className="h-4 w-8 rounded"
                        style={{ background: themeOption.bg, border: `1px solid ${themeOption.border}` }}
                      />
                      <div className="h-4 w-4 rounded" style={{ background: themeOption.accent }} />
                    </div>
                    <div
                      className="h-2 w-12 rounded"
                      style={{
                        background: themeOption.bgCard,
                        border: `1px solid ${themeOption.border}`,
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {themeOption.name}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {themeOption.description}
                    </p>
                  </div>

                  {themeId === themeOption.id ? (
                    <CheckCircle className="h-4 w-4 shrink-0" style={{ color: themeOption.accent }} />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
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
  );
}

export default Ajustes;
