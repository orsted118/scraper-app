import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  Music,
  Settings,
  StickyNote,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';
import { getNextClass } from '../utils/horario.js';
import { useSidebar } from '../SidebarContext';

// file:// necesita forward-slashes y triple slash antes de la unidad en Windows
// (C:\... → file:///C:/...). Solo para <img src>, no involucra fetch/XHR.
function toFileUrl(filePath) {
  if (!filePath) return null;
  const normalized = String(filePath).replace(/\\/g, '/');
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

const NAV_ITEMS = [
  { id: 'activities', label: 'Actividades', icon: BookOpen, target: 'activities' },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays, target: 'calendario' },
  { id: 'horario', label: 'Horario', icon: Clock, target: 'horario' },
  { id: 'notifications', label: 'Notificaciones', icon: Bell, target: 'notifications' },
  { id: 'musica', label: 'Música', icon: Music, target: 'musica' },
  { id: 'notas', label: 'Notas', icon: StickyNote, target: 'notas' },
  { id: 'settings', label: 'Ajustes', icon: Settings, target: 'settings' },
];

function normDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDayShort(date = new Date()) {
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(str = '') {
  const clean = String(str || '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase() || 'DV';
}

function formatDisplayName(str = '') {
  const clean = String(str || '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);

  if (/^ID\s+\w+/i.test(clean)) {
    return clean;
  }

  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }

  return clean;
}

function formatRelativeDeadline(fechaLimite) {
  const deadline = normDate(fechaLimite);

  if (!deadline) {
    return 'Fecha pendiente';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const diffDays = Math.round((target - today) / 86400000);
  const time = formatTime(deadline);

  if (diffDays < 0) return 'Vencida';
  if (diffDays === 0) return `Hoy · ${time}`;
  if (diffDays === 1) return `Mañana · ${time}`;
  return `En ${diffDays} días`;
}

function getClassStatus(nextClass) {
  if (!nextClass) return '';
  const start = nextClass.hora?.split('–')[0]?.trim() || nextClass.hora || '';

  if (nextClass.esHoy && nextClass.minutosRestantes <= 30) {
    return `En ${nextClass.minutosRestantes} min`;
  }

  if (nextClass.esHoy) {
    return start;
  }

  return `${nextClass.dia || 'Próxima'} · ${start}`;
}

function getSyncPresentation(syncState = {}) {
  if (syncState.status === 'syncing') {
    return { Icon: Loader2, text: 'Sincronizando...', color: 'var(--text-muted)', spin: true };
  }

  if (syncState.status === 'done') {
    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
  }

  if (syncState.status === 'error') {
    return { Icon: AlertCircle, text: 'Error al sincronizar', color: '#ef4444' };
  }

  if (syncState.lastSync) {
    return { Icon: CheckCircle, text: 'Todo actualizado', color: '#10b981' };
  }

  return { Icon: Info, text: 'Sin sincronizar', color: 'var(--text-muted)' };
}

function Sidebar({
  activePage,
  activities = [],
  calendarCount = 0,
  diasConClases = [],
  errorHorario = '',
  hasFinales = false,
  horario = [],
  horarioData = null,
  onNavigate,
  onSyncAll,
  proximaEntrega = null,
  settingsData = {},
  studentName = '',
  syncState = { status: 'idle', lastSync: null },
}) {
  const [nextClass, setNextClass] = useState(null);
  const [profile, setProfile] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  // Sidebar compact is an independent visual preference (decoupled from any
  // background system): collapses the sidebar to an icon-only rail.
  const { sidebarCompact } = useSidebar();
  const compact = sidebarCompact;
  const materiasHorario = Array.isArray(horarioData?.materias)
    ? horarioData.materias
    : (Array.isArray(horario) ? horario : []);
  const pendingCount = activities.filter(
    (activity) => activity.estado === 'pendiente' || activity.estado === 'retrasada',
  ).length;
  const delayedCount = activities.filter((activity) => activity.estado === 'retrasada').length;
  const hasHorario = materiasHorario.length > 0;
  const syncInfo = getSyncPresentation(syncState);
  const SyncIcon = syncInfo.Icon;
  const userId = settingsData?.ciaUser || settingsData?.user || '';
  const hasRealStudentName = studentName && !/^ID\s+\w+/i.test(studentName);
  const profileName = hasRealStudentName ? formatDisplayName(studentName) : (userId || 'Estudiante ITSON');
  const initials = getInitials(profile?.fullName || (hasRealStudentName ? studentName : userId));
  const photoUrl = !photoFailed ? toFileUrl(profile?.photoPath) : null;
  const displayName = profile?.fullName || profileName;
  const displayIdentifier = profile?.email || userId || 'Sin ID configurado';

  useEffect(() => {
    const updateNextClass = () => {
      setNextClass(getNextClass(materiasHorario, diasConClases));
    };

    updateNextClass();
    const intervalId = setInterval(updateNextClass, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [materiasHorario, diasConClases]);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.scraperApp : null;
    if (!api?.portalSistemas) return undefined;

    let mounted = true;

    api.portalSistemas
      .getProfile()
      .then((cached) => {
        if (!mounted) return;

        if (cached) {
          setProfile(cached);
          return;
        }

        // Primer arranque sin cache: iniciales quedan visibles mientras esto
        // corre en background — no bloquea el render del Sidebar.
        api.portalSistemas.refreshProfile().then((result) => {
          if (mounted && result && !result.error) {
            setProfile(result);
          }
        }).catch(() => {});
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navItems = useMemo(() => NAV_ITEMS, []);

  const getBadge = (itemId) => {
    if (itemId === 'activities' && pendingCount > 0) {
      return (
        <span
          className="px-2 py-0.5 text-[10px] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 'var(--radius-badge, 0px)' }}
        >
          {pendingCount}
        </span>
      );
    }

    if (itemId === 'calendario' && Number(calendarCount) > 0) {
      return (
        <span
          className="px-2 py-0.5 text-[10px] font-bold"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderRadius: 'var(--radius-badge, 0px)' }}
        >
          {calendarCount}
        </span>
      );
    }

    if (itemId === 'horario') {
      if (errorHorario) {
        return <span className="h-2 w-2" style={{ background: '#ef4444', borderRadius: 'var(--radius-badge, 0px)' }} />;
      }
      if (hasHorario) {
        return <span className="h-2 w-2" style={{ background: '#10b981', borderRadius: 'var(--radius-badge, 0px)' }} />;
      }
    }

    return null;
  };

  const syncTimestamp = syncState.lastSync ? formatTime(new Date(syncState.lastSync)) : '';
  const syncLabel =
    syncState.status === 'syncing'
      ? 'Sincronizando...'
      : syncState.status === 'done'
        ? '✓ Actualizado'
        : 'Sincronizar todo';
  const LETTERS = 'SINCRONIZAR TODO'.split('');

  return (
    <aside
      className={`sticky top-8 flex h-[calc(100vh-4rem)] ${compact ? 'w-16' : 'w-64'} flex-col overflow-hidden border transition-[width] duration-200`}
      style={{
        background: 'var(--bg-sidebar)',
        borderColor: 'var(--border-subtle)',
        borderRadius: 'var(--radius-card, 0px)',
        boxShadow: 'var(--shadow-card, none)',
      }}
    >
      <header className={compact ? 'px-2 pb-3 pt-3' : 'px-4 pb-3 pt-3'}>
        <div className={`flex items-center gap-3 ${compact ? 'justify-center' : ''}`}>
          <img
            src={dvpotroLogo}
            alt="DVPotro"
            title={compact ? 'DVPotro · ITSON' : undefined}
            className="h-9 w-9 shrink-0 object-contain"
            style={{ borderRadius: 'var(--radius-button, 0px)' }}
            draggable="false"
          />
          {!compact ? (
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-tight" style={{ color: 'var(--text-strong)' }}>
                DVPotro
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                ITSON
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <nav className="px-2 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || (item.id === 'activities' && activePage === 'activities');
          const badge = getBadge(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.target)}
              title={compact ? item.label : undefined}
              aria-label={compact ? item.label : undefined}
              className={`relative mb-0.5 flex w-full items-center transition duration-150 ${
                isActive ? '' : 'nav-item-hover'
              } ${
                compact
                  ? 'justify-center px-0 py-2'
                  : 'justify-between gap-3 px-3.5 py-[7px] text-left text-sm'
              }`}
              style={
                isActive
                  ? { background: 'var(--itson-blue, var(--accent))', color: 'var(--on-accent)', fontWeight: 600, borderRadius: 'var(--radius-button, 0px)' }
                  : { background: 'transparent', color: 'var(--text-muted)', fontWeight: 500, borderRadius: 'var(--radius-button, 0px)' }
              }
            >
              {compact ? (
                <>
                  <Icon className="h-5 w-5 shrink-0" />
                  {badge ? (
                    <span
                      className="absolute right-2 top-1.5 h-2 w-2"
                      style={{ background: 'var(--accent)', borderRadius: 'var(--radius-badge, 0px)' }}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {badge}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {compact ? (
        <div className="px-2 py-1">
          <button
            type="button"
            className="flex w-full items-center justify-center border py-2"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: syncInfo.color, borderRadius: 'var(--radius-button, 0px)' }}
            onClick={onSyncAll}
            disabled={syncState.status === 'syncing'}
            title={syncInfo.text}
            aria-label="Sincronizar todo"
          >
            <SyncIcon className={`h-4 w-4 ${syncInfo.spin ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : null}

      {!compact ? (
      <>
      <section
        className="mx-2.5 my-1 border px-3.5 py-2.5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-card, 0px)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
          Sincronización
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: syncInfo.color }}>
          <SyncIcon className={`h-3.5 w-3.5 ${syncInfo.spin ? 'animate-spin' : ''}`} />
          <span className="font-medium">{syncInfo.text}</span>
        </div>
        {syncTimestamp ? (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Última sincronización · {syncTimestamp}
          </p>
        ) : null}
        <button
          type="button"
          className={`sync-all-btn${syncState.status === 'syncing' ? ' sync-all-btn--syncing' : ''}`}
          data-label={syncLabel}
          onClick={onSyncAll}
          disabled={syncState.status === 'syncing'}
          title="Actualiza actividades y horario"
        >
          {syncState.status === 'syncing' ? (
            <span className="sync-all-btn__syncing">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="sync-all-btn__spinner"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              SINCRONIZANDO
            </span>
          ) : (
            LETTERS.map((char, index) => (
              <span
                key={`${char}-${index}`}
                className="sync-letter"
                style={{ transitionDelay: `${(index + 1) * 0.04}s` }}
              >
                {char}
              </span>
            ))
          )}
        </button>
      </section>

      <section
        className="mx-2.5 my-1 border px-3.5 py-2.5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 'var(--radius-card, 0px)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
          HOY · {formatDayShort(new Date())}
        </p>

        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--itson-blue, var(--accent))' }}>
            Entrega
          </p>
          {proximaEntrega ? (
            <div className="mt-1 min-w-0">
              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={proximaEntrega.nombre}>
                {proximaEntrega.nombre}
              </p>
              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {proximaEntrega.materia || 'Materia'} · {formatRelativeDeadline(proximaEntrega.fechaLimite)}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin pendientes ✓</p>
          )}
        </div>

        <div className="my-1.5 border-t" style={{ borderColor: 'var(--border)' }} />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#8b5cf6' }}>
            Clase
          </p>
          {nextClass ? (
            <div className="mt-1 min-w-0">
              <p className="truncate text-xs font-medium" style={{ color: 'var(--text-strong)' }} title={nextClass.materia}>
                {nextClass.materia}
              </p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="truncate">{nextClass.hora}</span>
                {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
                  <span
                    className="shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'var(--retrasada-bg)', borderColor: 'var(--retrasada-border)', color: 'var(--retrasada-text)', borderRadius: 'var(--radius-badge, 0px)' }}
                  >
                    {getClassStatus(nextClass)}
                  </span>
                ) : (
                  <span className="truncate">· {getClassStatus(nextClass)}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Sin clases próximas</p>
          )}
        </div>
      </section>
      </>
      ) : null}

      <footer
        className={`mt-auto flex items-center border-t py-2 ${compact ? 'justify-center px-2' : 'gap-2.5 px-3.5'}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--itson-blue, var(--accent)), var(--itson-blue-light, var(--accent-hover, #1a7ec4)))',
            color: 'var(--on-accent)',
            borderRadius: 'var(--radius-badge, 0px)',
          }}
          title={compact ? `${displayName}${displayIdentifier ? ` · ${displayIdentifier}` : ''}` : undefined}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
              draggable="false"
            />
          ) : (
            initials
          )}
        </div>
        {!compact ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-strong)' }} title={displayName}>
              {displayName}
            </p>
            <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }} title={displayIdentifier}>
              {displayIdentifier}
            </p>
            {profile?.studentId ? (
              <p
                className="truncate text-[10px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
              >
                {profile.studentId}
              </p>
            ) : null}
          </div>
        ) : null}
      </footer>
    </aside>
  );
}

export default Sidebar;
