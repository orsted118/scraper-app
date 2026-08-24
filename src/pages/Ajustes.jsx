import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ColorPicker from '../components/ColorPicker';
import LlmBackendsPanel from '../components/LlmBackendsPanel';
import { useSidebar } from '../SidebarContext';
import { useTheme } from '../ThemeContext';
import { DEFAULT_THEME, THEMES } from '../themes';
import { EASE } from '../utils/motion';

const CONN_STATUS_KEY = 'dvpotro-conn-status';
const FEEDBACK_TIMEOUT_MS = 4000;

const THEME_ORDER = [
  'swiss-noir',
  'cobalt',
  'nordic',
  'forest',
  'rose-gold',
  'terracotta',
  'cyber',
  'terminal',
  'paper',
  'magenta',
  'bauhaus',
  'custom',
];

const CUSTOM_THEME_DEFAULTS = {
  accent: '#006DB6',
  bg: '#020617',
  text: '#f1f5f9',
};

const AUTO_SYNC_INTERVAL_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
];

const MINUTES_OPTIONS = [
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
];

function formatRelative(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);

  if (days <= 14) return `hace ${days} d`;

  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function readConnStatus(portal) {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONN_STATUS_KEY) || '{}');
    return parsed[portal] || null;
  } catch (_error) {
    return null;
  }
}

function writeConnStatus(portal, entry) {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONN_STATUS_KEY) || '{}');
    parsed[portal] = entry;
    localStorage.setItem(CONN_STATUS_KEY, JSON.stringify(parsed));
  } catch (_error) {
    // Sin storage disponible: el estado vive solo en memoria.
  }
}

function useTransientFeedback() {
  const [feedback, setFeedback] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const show = (type, text) => {
    clearTimeout(timeoutRef.current);
    setFeedback({ type, text });

    if (type === 'ok') {
      timeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS);
    }
  };

  return [feedback, show];
}

function InlineFeedback({ feedback }) {
  if (!feedback) return null;

  return (
    <span
      className="text-[11px]"
      style={{
        color: feedback.type === 'ok' ? 'var(--text-muted)' : 'var(--error-text)',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {feedback.text}
    </span>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative inline-flex h-6 w-11 shrink-0 items-center"
      style={{
        background: checked ? 'var(--accent)' : 'var(--border-normal)',
        borderRadius: 'var(--radius-badge, 0px)',
        transition: 'background 0.15s ease',
      }}
    >
      <span
        className="inline-block h-4 w-4"
        style={{
          background: 'var(--text-strong)',
          borderRadius: 'var(--radius-badge, 0px)',
          transform: checked ? 'translateX(24px)' : 'translateX(4px)',
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  );
}

function SettingRow({ title, description, children, last = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-6 py-4 ${last ? '' : 'border-b'}`}
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

function Section({ eyebrow, title, description, children, first = false, accentEyebrow = false, reduced }) {
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
      className={first ? '' : 'border-t pt-8'}
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-[0.24em]"
        style={{ color: accentEyebrow ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {eyebrow}
      </p>
      <h3
        className="mt-1 text-2xl font-extrabold"
        style={{
          color: 'var(--text-strong)',
          fontFamily: 'var(--font-display, sans-serif)',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function PortalCredentials({
  api,
  portal,
  title,
  note,
  userLabel,
  userPlaceholder,
  user,
  onUserChange,
  password,
  onPasswordChange,
  hasPassword,
  loading,
  saving,
  onSave,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connStatus, setConnStatus] = useState(() => readConnStatus(portal));
  const [feedback, showFeedback] = useTransientFeedback();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  // null = el campo se acaba de enfocar y todavía no se tipeó. Filtrar por el
  // valor actual dejaría fuera al resto de las cuentas, que es exactamente lo
  // que se busca al abrir la lista sobre un campo ya lleno.
  const [typedQuery, setTypedQuery] = useState(null);
  const userRef = useRef(null);
  const suggestionsRef = useRef(null);

  const configured = Boolean(user) && hasPassword;

  const refreshHistory = async () => {
    if (!api?.credentialHistory) {
      return;
    }

    setHistoryEntries((await api.credentialHistory.list(portal)) || []);
  };

  useEffect(() => {
    refreshHistory();
  }, [portal]);

  const filteredSuggestions = typedQuery
    ? historyEntries.filter((entry) =>
        entry.user.toLowerCase().includes(typedQuery.toLowerCase()),
      )
    : historyEntries;

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        userRef.current &&
        !userRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await onSave();

    if (result?.ok) {
      showFeedback('ok', `Guardado · ${formatClock()}`);
      setShowPassword(false);
      await refreshHistory();
      return;
    }

    showFeedback('error', result?.error || 'No fue posible guardar.');
  };

  const handleTest = async () => {
    if (!api?.testConnection) {
      showFeedback('error', 'Prueba de conexión disponible solo dentro de Electron.');
      return;
    }

    setTesting(true);

    try {
      const result = await api.testConnection({ portal, user, password });
      const entry = {
        ok: Boolean(result?.ok),
        at: new Date().toISOString(),
        error: result?.ok ? null : result?.error || 'Falló la prueba de conexión.',
      };
      setConnStatus(entry);
      writeConnStatus(portal, entry);
    } catch (_error) {
      const entry = { ok: false, at: new Date().toISOString(), error: 'Falló la prueba de conexión.' };
      setConnStatus(entry);
      writeConnStatus(portal, entry);
    } finally {
      setTesting(false);
    }
  };

  const renderConnStatus = () => {
    if (!connStatus) {
      return <span style={{ color: 'var(--text-muted)' }}>SIN PROBAR</span>;
    }

    if (connStatus.ok) {
      return (
        <span style={{ color: 'var(--text-strong)' }}>
          OK · {formatRelative(connStatus.at)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--error-text)' }}>
        <span
          className="inline-block h-[6px] w-[6px]"
          style={{ background: 'var(--accent)', borderRadius: 'var(--radius-badge, 0px)' }}
        />
        FALLÓ · {formatRelative(connStatus.at)}
      </span>
    );
  };

  return (
    <div
      className="border p-5"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4
          className="text-base font-extrabold"
          style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
        >
          {title}
        </h4>
        <p
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{
            color: configured ? 'var(--text-muted)' : 'var(--text-strong)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {configured ? 'CONFIGURADO' : 'SIN CONFIGURAR'}
        </p>
      </div>

      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
        {note}
      </p>

      <p
        className="mt-3 text-[10px] uppercase tracking-[0.18em]"
        style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
      >
        {renderConnStatus()}
      </p>
      {connStatus && !connStatus.ok && connStatus.error ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {connStatus.error}
        </p>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
            {userLabel}
          </span>
          <div className="field relative">
            <input
              ref={userRef}
              type="text"
              value={user}
              autoComplete="off"
              onChange={(event) => {
                onUserChange(event.target.value);
                setTypedQuery(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                setTypedQuery(null);
                setShowSuggestions(true);
              }}
              placeholder={userPlaceholder}
              className="w-full bg-transparent px-3.5 py-2.5 text-sm outline-none"
              style={{ color: 'var(--text-strong)' }}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto border"
                style={{
                  borderColor: 'var(--border-normal)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-card, 0px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                {filteredSuggestions.map((entry) => (
                  <button
                    key={entry.user}
                    type="button"
                    onMouseUp={async (event) => {
                      event.preventDefault();
                      onUserChange(entry.user);
                      setShowSuggestions(false);
                      setTypedQuery(null);

                      if (!entry.hasPassword) {
                        return;
                      }

                      onPasswordChange(
                        (await api.credentialHistory.getPassword(portal, entry.user)) || '',
                      );
                    }}
                    className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition"
                    style={{ color: 'var(--text-strong)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{entry.user}</span>
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      {formatRelative(entry.savedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-normal)' }}>
            Contraseña
          </span>
          <div className="field relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="off"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent px-3.5 py-2.5 pr-10 text-sm outline-none"
              style={{ color: 'var(--text-strong)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {hasPassword
              ? 'Si dejas este campo vacío, se conserva la contraseña actual.'
              : 'Aún no hay contraseña guardada.'}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || saving}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={loading || saving || testing}
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>
          <InlineFeedback feedback={feedback} />
        </div>
        {testing ? (
          <p
            className="text-[11px]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
          >
            Puede tardar hasta 30 segundos.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function ThemeCard({ theme, active, customColors, reduced, onSelect }) {
  const specimen = theme.id === 'custom'
    ? { ...theme, bg: customColors.bg, accent: customColors.accent, textStrong: customColors.text }
    : theme;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="relative overflow-hidden border text-left"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
        // 1px extra vía sombra: marco de 2px visual sin mover el layout.
        boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
        transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
      }}
    >
      <div
        className="flex items-end justify-between gap-2 px-4 pb-3 pt-4"
        style={{ background: specimen.bg }}
      >
        <span
          style={{
            color: specimen.textStrong || specimen.text,
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Ag
        </span>
        <span
          className="mb-0.5 inline-block h-3 w-8"
          style={{
            background: specimen.accent,
            borderRadius: 'var(--radius-button, 0px)',
          }}
        />
      </div>
      <div style={{ borderTop: `1px solid ${specimen.border}` }} />

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
            {theme.name}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
            {theme.description}
          </p>
        </div>
        {active ? (
          <motion.span
            layoutId="theme-active"
            transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
            className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)' }}
          >
            Activo
          </motion.span>
        ) : null}
      </div>
    </button>
  );
}

function Ajustes({ error, lastSyncAt, loading, onAutoSyncChanged, onSettingsSaved }) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const reduced = useReducedMotion();
  const { themeId, setThemeId, saveCustomTheme } = useTheme();
  const { sidebarCompact, setSidebarCompact } = useSidebar();

  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [ciaUser, setCiaUser] = useState('');
  const [ciaPassword, setCiaPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [hasCIAPassword, setHasCIAPassword] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [notifMinutesBefore, setNotifMinutesBefore] = useState(10);
  const [noticesEnabled, setNoticesEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoSyncInterval, setAutoSyncInterval] = useState(15);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [pageError, setPageError] = useState('');
  const [syncFeedback, showSyncFeedback] = useTransientFeedback();
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [profileFeedback, showProfileFeedback] = useTransientFeedback();
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [credentialFeedback, showCredentialFeedback] = useTransientFeedback();
  const [confirmAction, setConfirmAction] = useState(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerFeedback, setDangerFeedback] = useState(null);
  const dangerTimeoutRef = useRef(null);
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

  useEffect(() => () => clearTimeout(dangerTimeoutRef.current), []);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      if (!api) {
        if (mounted) {
          setPageError('DVPotro debe ejecutarse dentro de Electron para administrar credenciales.');
          setSettingsLoading(false);
        }
        return;
      }

      try {
        const response = await api.getSettings();

        if (!mounted) return;

        setUser(response?.user || '');
        setHasPassword(Boolean(response?.hasPassword));
        setCiaUser(response?.ciaUser || '');
        setHasCIAPassword(Boolean(response?.hasCIAPassword));
        setNotifMinutesBefore(Number(response?.notifMinutesBefore) || 10);
        setAppVersion(response?.appVersion || '');
      } catch (_error) {
        if (mounted) {
          setPageError('No fue posible leer la configuración actual.');
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

  useEffect(() => {
    let mounted = true;

    api?.notifications
      ?.getSettings?.()
      .then((response) => {
        if (!mounted) return;
        if (typeof response?.settings?.noticesEnabled === 'boolean') {
          setNoticesEnabled(response.settings.noticesEnabled);
        }
        if (typeof response?.settings?.remindersEnabled === 'boolean') {
          setRemindersEnabled(response.settings.remindersEnabled);
        }
      })
      .catch(() => {
        // Sin bandeja disponible (browser dev sin mock): quedan los defaults.
      });

    return () => {
      mounted = false;
    };
  }, [api]);

  useEffect(() => {
    let mounted = true;

    api
      ?.getAutoSyncSettings?.()
      .then((response) => {
        if (!mounted || !response) return;
        setAutoSyncEnabled(response.enabled !== false);
        setAutoSyncInterval(Number(response.intervalMinutes) || 15);
      })
      .catch(() => {
        // Sin bridge disponible (browser dev sin mock): quedan los defaults.
      });

    return () => {
      mounted = false;
    };
  }, [api]);

  const persistAutoSync = async (patch, revert) => {
    if (!api?.setAutoSyncSettings) {
      return;
    }

    try {
      await api.setAutoSyncSettings(patch);
      showSyncFeedback('ok', `Guardado · ${formatClock()}`);

      if (typeof onAutoSyncChanged === 'function') {
        await onAutoSyncChanged();
      }
    } catch (_error) {
      revert();
      showSyncFeedback('error', 'No se pudo guardar la auto-sincronización.');
    }
  };

  const handleAutoSyncToggle = () => {
    const previous = autoSyncEnabled;
    setAutoSyncEnabled(!previous);
    persistAutoSync({ enabled: !previous }, () => setAutoSyncEnabled(previous));
  };

  const handleAutoSyncInterval = (value) => {
    const previous = autoSyncInterval;
    setAutoSyncInterval(value);
    persistAutoSync({ intervalMinutes: value }, () => setAutoSyncInterval(previous));
  };

  const handleSave = async (section) => {
    if (!api) {
      return { ok: false, error: 'DVPotro debe ejecutarse dentro de Electron.' };
    }

    setSavingSection(section);

    try {
      const result = await api.saveSettings({
        user,
        password: section === 'ivirtual' ? password : '',
        ciaUser,
        ciaPassword: section === 'cia' ? ciaPassword : '',
        notifMinutesBefore,
      });

      if (!result?.success) {
        return { ok: false, error: result?.error || 'No fue posible guardar las credenciales.' };
      }

      if (section === 'ivirtual') {
        await api.credentialHistory?.save({ portal: 'ivirtual', user, password });
        setPassword('');
        setHasPassword(true);
        handleProfileSync();
      }

      if (section === 'cia') {
        await api.credentialHistory?.save({ portal: 'cia', user: ciaUser, password: ciaPassword });
        setCiaPassword('');
        setHasCIAPassword(true);
      }

      if (typeof onSettingsSaved === 'function') {
        await onSettingsSaved();
      }

      return { ok: true };
    } catch (_error) {
      return { ok: false, error: 'No fue posible guardar las credenciales.' };
    } finally {
      setSavingSection('');
    }
  };

  const handleNotifSetting = async (key) => {
    const current = key === 'noticesEnabled' ? noticesEnabled : remindersEnabled;
    const setter = key === 'noticesEnabled' ? setNoticesEnabled : setRemindersEnabled;
    const next = !current;
    setter(next);

    try {
      await api?.notifications?.setSettings?.({ [key]: next });
    } catch (_error) {
      setter(current);
      showSyncFeedback('error', 'No se pudo cambiar la configuración.');
    }
  };

  const handleMinutesChange = async (value) => {
    const previous = notifMinutesBefore;
    setNotifMinutesBefore(value);

    if (!api) {
      return;
    }

    try {
      const result = await api.saveSettings({
        user,
        password: '',
        ciaUser,
        ciaPassword: '',
        notifMinutesBefore: value,
      });

      if (!result?.success) {
        setNotifMinutesBefore(previous);
        showSyncFeedback('error', result?.error || 'No se pudo guardar.');
        return;
      }

      showSyncFeedback('ok', `Guardado · ${formatClock()}`);

      if (typeof onSettingsSaved === 'function') {
        await onSettingsSaved();
      }
    } catch (_error) {
      setNotifMinutesBefore(previous);
      showSyncFeedback('error', 'No se pudo guardar.');
    }
  };

  const handleProfileSync = async () => {
    setProfileSyncing(true);

    try {
      const result = await api?.portalSistemas?.refreshProfile?.();

      if (result?.error) {
        showProfileFeedback(
          'error',
          result.error === 'in-progress' ? 'Ya hay una sincronización en curso.' : result.error,
        );
        return;
      }

      showProfileFeedback('ok', `Actualizado · ${formatClock()}`);
    } catch (_error) {
      showProfileFeedback('error', 'No fue posible sincronizar el perfil.');
    } finally {
      setProfileSyncing(false);
    }
  };

  const handleGetCredential = async () => {
    setCredentialBusy(true);

    try {
      const result = await api?.portalSistemas?.getCredential?.();

      if (result?.error) {
        showCredentialFeedback(
          'error',
          result.error === 'in-progress' ? 'Ya hay una descarga en curso.' : `FALLÓ · ${result.error}`,
        );
        return;
      }

      showCredentialFeedback('ok', `Descargada · ${formatClock()}`);
    } catch (_error) {
      showCredentialFeedback('error', 'No fue posible obtener la credencial.');
    } finally {
      setCredentialBusy(false);
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

  const showDangerFeedback = (id, text) => {
    clearTimeout(dangerTimeoutRef.current);
    setDangerFeedback({ id, text });
    dangerTimeoutRef.current = setTimeout(() => setDangerFeedback(null), FEEDBACK_TIMEOUT_MS);
  };

  const runDangerAction = async (action) => {
    setDangerBusy(true);

    try {
      if (action.id === 'cache') {
        await Promise.allSettled([
          api?.clearCache?.(),
          api?.clearCIACache?.(),
          api?.clearHorarioCache?.(),
          api?.clearCalendarioCache?.(),
        ]);
      }

      if (action.id === 'notifications') {
        await api?.notifications?.clear?.();
      }

      if (action.id === 'credentials') {
        const result = await api?.clearCredentials?.();

        if (result?.success === false) {
          showDangerFeedback(action.id, result?.error || 'No fue posible borrar.');
          return;
        }

        setUser('');
        setPassword('');
        setCiaUser('');
        setCiaPassword('');
        setHasPassword(false);
        setHasCIAPassword(false);

        if (typeof onSettingsSaved === 'function') {
          await onSettingsSaved();
        }
      }

      if (action.id === 'preferences') {
        setThemeId(DEFAULT_THEME);
        handleResetCustom();
        setSidebarCompact(false);
      }

      showDangerFeedback(action.id, `Listo · ${formatClock()}`);
    } catch (_error) {
      showDangerFeedback(action.id, 'La acción falló. Intenta de nuevo.');
    } finally {
      setDangerBusy(false);
      setConfirmAction(null);
    }
  };

  const dangerActions = [
    {
      id: 'cache',
      title: 'Borrar caché de sincronización',
      description: 'Actividades, horario, calificaciones y calendario se vuelven a descargar en el próximo sync.',
      confirmLabel: 'Borrar caché',
    },
    {
      id: 'notifications',
      title: 'Borrar historial de notificaciones',
      description: 'Vacía la bandeja completa. Las notificaciones nuevas se siguen generando.',
      confirmLabel: 'Borrar historial',
    },
    {
      id: 'credentials',
      title: 'Borrar credenciales',
      description: 'Elimina usuario y contraseña de iVirtual y CIA. La sincronización deja de funcionar hasta configurarlas de nuevo.',
      confirmLabel: 'Borrar credenciales',
    },
    {
      id: 'preferences',
      title: 'Restablecer preferencias visuales',
      description: 'Tema, colores personalizados y sidebar vuelven a sus valores por defecto.',
      confirmLabel: 'Restablecer',
    },
  ];

  const orderedThemes = THEME_ORDER.map((id) => THEMES[id]).filter(Boolean);

  return (
    <div className="space-y-8 pb-4">
      {error || pageError ? (
        <div
          className="flex items-start gap-3 border p-4 text-sm"
          style={{
            borderColor: 'var(--error-border)',
            borderLeftWidth: '3px',
            borderLeftColor: 'var(--error-text)',
            background: 'var(--error-bg)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-card, 0px)',
          }}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error || pageError}</p>
        </div>
      ) : null}

      <Section
        first
        reduced={reduced}
        eyebrow="Cuentas"
        title="Credenciales"
        description="DVPotro guarda tus credenciales solo en este equipo y las usa únicamente para iniciar sesión en los portales de ITSON."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <PortalCredentials
            api={api}
            portal="ivirtual"
            title="iVirtual"
            note="Actividades, cursos y enlaces de videollamada (Moodle)."
            userLabel="ID de usuario"
            userPlaceholder="Ej. 00000000000"
            user={user}
            onUserChange={setUser}
            password={password}
            onPasswordChange={setPassword}
            hasPassword={hasPassword}
            loading={settingsLoading}
            saving={savingSection === 'ivirtual'}
            onSave={() => handleSave('ivirtual')}
          />
          <PortalCredentials
            api={api}
            portal="cia"
            title="CIA"
            note="Horario y calificaciones (dominio institucional). La contraseña se renueva anualmente por políticas ITSON."
            userLabel="Usuario CIA"
            userPlaceholder="Usuario de dominio"
            user={ciaUser}
            onUserChange={setCiaUser}
            password={ciaPassword}
            onPasswordChange={setCiaPassword}
            hasPassword={hasCIAPassword}
            loading={settingsLoading}
            saving={savingSection === 'cia'}
            onSave={() => handleSave('cia')}
          />
        </div>
      </Section>

      <Section
        reduced={reduced}
        eyebrow="Identidad"
        title="Perfil del Portal de Sistemas"
        description="Foto, nombre y correo institucional para el bloque de identidad del sidebar, y la credencial oficial de estudiante."
      >
        <SettingRow
          title="Sincronizar perfil"
          description="Actualiza foto, nombre completo y correo institucional desde el Portal de Sistemas."
        >
          <InlineFeedback feedback={profileFeedback} />
          <button
            type="button"
            onClick={handleProfileSync}
            disabled={profileSyncing}
            className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {profileSyncing ? 'Sincronizando...' : 'Sincronizar perfil'}
          </button>
        </SettingRow>
        <SettingRow
          last
          title="Credencial estudiantil ITSON"
          description="Descarga el PDF oficial de tu credencial electrónica, con folio y QR de validación."
        >
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              <InlineFeedback feedback={credentialFeedback} />
              <button
                type="button"
                onClick={handleGetCredential}
                disabled={credentialBusy}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {credentialBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {credentialBusy ? 'Obteniendo...' : 'Obtener credencial estudiantil ITSON'}
              </button>
            </div>
            {credentialBusy ? (
              <p
                className="text-[11px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
              >
                Puede tardar hasta 25 segundos.
              </p>
            ) : null}
          </div>
        </SettingRow>
      </Section>

      <Section
        reduced={reduced}
        eyebrow="Avisos"
        title="Sincronización y avisos"
      >
        <SettingRow
          title="Sincronizar automáticamente"
          description={`Se sincroniza al abrir la app, al despertar la laptop, y cada ${autoSyncInterval} minutos.`}
        >
          <Switch
            checked={autoSyncEnabled}
            onChange={handleAutoSyncToggle}
            label="Sincronizar automáticamente"
          />
        </SettingRow>
        <SettingRow
          title="Cada"
          description="Frecuencia del sincronizado automático mientras la app esté abierta."
        >
          <div className="field">
            <select
              value={autoSyncInterval}
              onChange={(event) => handleAutoSyncInterval(Number(event.target.value))}
              disabled={!autoSyncEnabled}
              className="bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed"
              style={{ color: 'var(--text-strong)' }}
            >
              {AUTO_SYNC_INTERVAL_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </SettingRow>
        <SettingRow
          title="Noticias de ITSON"
          description="Becas, convocatorias y comunicados oficiales en la bandeja de notificaciones."
        >
          <Switch
            checked={noticesEnabled}
            onChange={() => handleNotifSetting('noticesEnabled')}
            label="Noticias de ITSON"
          />
        </SettingRow>
        <SettingRow
          title="Recordatorios temporales"
          description="Clases próximas, entregas que vencen y eventos del calendario, directo a la bandeja."
        >
          <Switch
            checked={remindersEnabled}
            onChange={() => handleNotifSetting('remindersEnabled')}
            label="Recordatorios temporales"
          />
        </SettingRow>
        <SettingRow
          last
          title="Avisar antes de clase"
          description="Anticipación del aviso nativo del sistema para las clases del horario."
        >
          <InlineFeedback feedback={syncFeedback} />
          <div className="field">
            <select
              value={notifMinutesBefore}
              onChange={(event) => handleMinutesChange(Number(event.target.value))}
              disabled={settingsLoading}
              className="bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed"
              style={{ color: 'var(--text-strong)' }}
            >
              {MINUTES_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </SettingRow>
      </Section>

      <Section
        reduced={reduced}
        eyebrow="Apariencia"
        title="Tema visual"
        description="El cambio aplica al instante y queda guardado en este equipo."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orderedThemes.map((themeOption) => (
            <ThemeCard
              key={themeOption.id}
              theme={themeOption}
              active={themeId === themeOption.id}
              customColors={customColors}
              reduced={reduced}
              onSelect={() => setThemeId(themeOption.id)}
            />
          ))}
        </div>

        {themeId === 'custom' ? (
          <div
            className="mt-5 space-y-4 border p-5"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <h4
              className="text-sm font-extrabold"
              style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
            >
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
              <ColorPicker
                label="Acento"
                value={customColors.accent}
                onChange={(nextHex) => handleCustomColor('accent', nextHex)}
              />
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
              <ColorPicker
                label="Fondo"
                value={customColors.bg}
                onChange={(nextHex) => handleCustomColor('bg', nextHex)}
              />
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
              <ColorPicker
                label="Texto"
                value={customColors.text}
                onChange={(nextHex) => handleCustomColor('text', nextHex)}
              />
            </label>

            <button type="button" onClick={handleResetCustom} className="link-accent text-xs font-medium">
              Restablecer valores por defecto
            </button>
          </div>
        ) : null}

        <SettingRow
          last
          title="Sidebar compacto"
          description="Reduce el sidebar a solo íconos para aprovechar más espacio."
        >
          <Switch
            checked={sidebarCompact}
            onChange={() => setSidebarCompact(!sidebarCompact)}
            label="Sidebar compacto"
          />
        </SettingRow>
      </Section>

      {/* Antes de la zona de riesgo a propósito: las acciones destructivas
          quedan siempre últimas, que es donde el usuario las espera. */}
      <Section
        reduced={reduced}
        eyebrow="Inteligencia Artificial"
        title="Backends LLM"
        description="Estado de las claves configuradas en .env, uso de los últimos 7 días y sugerencias de orden. Solo diagnóstico: nada de acá modifica la configuración."
      >
        <LlmBackendsPanel />
      </Section>

      <Section
        reduced={reduced}
        accentEyebrow
        eyebrow="Zona de riesgo"
        title="Acciones destructivas"
        description="Cada acción pide confirmación antes de ejecutarse."
      >
        {dangerActions.map((action, index) => (
          <SettingRow
            key={action.id}
            title={action.title}
            description={action.description}
            last={index === dangerActions.length - 1}
          >
            {dangerFeedback?.id === action.id ? (
              <span
                className="text-[11px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
              >
                {dangerFeedback.text}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirmAction(action)}
              disabled={dangerBusy}
              className="btn-outline btn-outline-accent px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              style={{ color: 'var(--accent)' }}
            >
              {action.confirmLabel}
            </button>
          </SettingRow>
        ))}
      </Section>

      <motion.section
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
        className="flex flex-wrap items-end justify-between gap-4 border-t pt-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <p
            className="text-base font-extrabold"
            style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)' }}
          >
            DVPotro
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            App no oficial para estudiantes de ITSON.
          </p>
        </div>
        <div
          className="text-right text-[11px]"
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <p>{appVersion ? `v${appVersion}` : 'versión desconocida'}</p>
          <p className="mt-1">
            {loading
              ? 'sincronizando...'
              : `última sincronización · ${lastSyncAt ? new Date(lastSyncAt).toLocaleString('es-MX') : 'sin ejecutar'}`}
          </p>
        </div>
      </motion.section>

      {confirmAction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => (dangerBusy ? null : setConfirmAction(null))}
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label={confirmAction.title}
            className="w-full max-w-md border p-6"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color: 'var(--accent)' }}
            >
              Confirmar
            </p>
            <h4
              className="mt-2 text-xl font-extrabold"
              style={{
                color: 'var(--text-strong)',
                fontFamily: 'var(--font-display, sans-serif)',
                letterSpacing: '-0.02em',
              }}
            >
              {confirmAction.title}
            </h4>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              {confirmAction.description}
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={dangerBusy}
                className="btn-outline px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => runDangerAction(confirmAction)}
                disabled={dangerBusy}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dangerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmAction.confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

export default Ajustes;
