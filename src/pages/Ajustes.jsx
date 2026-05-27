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

const CUSTOM_THEME_DEFAULTS = {
  accent: '#006DB6',
  bg: '#020617',
  text: '#f1f5f9',
};

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
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-5 w-5 text-itson-blue" />
        <div className="w-full">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-strong)' }}>
            {title}
          </h3>
          {note ? <p className="mt-2 text-sm leading-6 text-slate-400">{note}</p> : null}
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
            {userLabel}
          </span>
          <input
            type="text"
            value={user}
            onChange={(event) => userValueSetter(event.target.value)}
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
            style={{
              borderColor: 'var(--border-normal)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-strong)',
            }}
            placeholder="Ej. 00000279009"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
            {passwordLabel}
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => passwordValueSetter(event.target.value)}
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-itson-blue focus:ring-2 focus:ring-itson-blue/30"
            style={{
              borderColor: 'var(--border-normal)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-strong)',
            }}
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
  const { themeId, setThemeId, saveCustomTheme } = useTheme();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [ciaUser, setCiaUser] = useState('');
  const [ciaPassword, setCiaPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [hasCIAPassword, setHasCIAPassword] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [customColors, setCustomColors] = useState(() => {
    try {
      const saved = localStorage.getItem('scraperapp-custom-theme');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        accent: parsed.accent || CUSTOM_THEME_DEFAULTS.accent,
        bg: parsed.bg || CUSTOM_THEME_DEFAULTS.bg,
        text: parsed.text || CUSTOM_THEME_DEFAULTS.text,
      };
    } catch (_error) {
      return { ...CUSTOM_THEME_DEFAULTS };
    }
  });

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

  const handleCustomColor = (key, value) => {
    const next = { ...customColors, [key]: value };
    setCustomColors(next);

    const overrides = {
      accent: next.accent,
      accentHover: `${next.accent}cc`,
      bg: next.bg,
      text: next.text,
      textStrong: next.text,
      gradientFrom: `${next.accent}1a`,
      gradientTo: `${next.accent}14`,
    };

    saveCustomTheme(overrides);

    if (themeId === 'custom') {
      const root = document.documentElement;
      Object.entries(overrides).forEach(([themeKey, themeValue]) => {
        const cssKey = `--${themeKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssKey, themeValue);
      });
    } else {
      setThemeId('custom');
    }
  };

  const handleResetCustom = () => {
    localStorage.removeItem('scraperapp-custom-theme');
    setCustomColors({ ...CUSTOM_THEME_DEFAULTS });
    saveCustomTheme({});
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
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
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
                        style={{
                          background: themeOption.id === 'custom' ? customColors.bg : themeOption.bg,
                          border: `1px solid ${themeOption.border}`,
                        }}
                      />
                      <div
                        className="h-4 w-4 rounded"
                        style={{ background: themeOption.id === 'custom' ? customColors.accent : themeOption.accent }}
                      />
                    </div>
                    <div
                      className="h-2 w-12 rounded"
                      style={{
                        background: themeOption.id === 'custom'
                          ? 'rgba(2, 6, 23, 0.6)'
                          : themeOption.bgCard,
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

            {themeId === 'custom' ? (
              <section
                className="mt-4 space-y-4 rounded-2xl border p-5"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
              >
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  Personalizar Mi Tema
                </h4>

                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
                      Color de acento
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Botones, elementos activos y highlights
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {customColors.accent}
                    </span>
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(event) => handleCustomColor('accent', event.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
                      style={{ accentColor: customColors.accent }}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
                      Fondo principal
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Color de fondo de toda la app
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {customColors.bg}
                    </span>
                    <input
                      type="color"
                      value={customColors.bg}
                      onChange={(event) => handleCustomColor('bg', event.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-normal)' }}>
                      Color de texto
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Texto principal de la interfaz
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {customColors.text}
                    </span>
                    <input
                      type="color"
                      value={customColors.text}
                      onChange={(event) => handleCustomColor('text', event.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={handleResetCustom}
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Restablecer valores por defecto
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-itson-blue" />
          <div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-strong)' }}>
              Estado operativo
            </h3>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-normal)' }}>
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
