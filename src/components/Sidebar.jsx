import { Calendar, Clock, ExternalLink, FolderCog, GraduationCap, ListChecks } from 'lucide-react';
import { useEffect, useState } from 'react';
import dvpotroLogo from '../assets/branding/dvpotro-logo.png';
import { getNextClass } from '../utils/horario.js';

const navigationItems = [
  { id: 'activities', label: 'Actividades', icon: ListChecks },
  { id: 'horario', label: 'Horario', icon: Calendar },
  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
  { id: 'settings', label: 'Ajustes', icon: FolderCog },
];

function getNextClassStatus(nextClass) {
  if (!nextClass) {
    return '';
  }

  if (!nextClass.esHoy) {
    return nextClass.diasAdelante === 1 ? 'Mañana' : nextClass.dia;
  }

  if (nextClass.minutosRestantes <= 30) {
    return `En ${nextClass.minutosRestantes} min`;
  }

  return `Hoy ${nextClass.hora.split('–')[0].trim()}`;
}

function Sidebar({ activePage, hasFinales = false, horario = [], diasConClases = [], onNavigate }) {
  const [nextClass, setNextClass] = useState(null);
  const visibleNavigationItems = navigationItems.filter(
    (item) => item.id !== 'calificaciones' || hasFinales === true,
  );
  const hasHorario = Array.isArray(horario) && horario.length > 0;

  useEffect(() => {
    if (!hasHorario) {
      setNextClass(null);
      return undefined;
    }

    const updateNextClass = () => {
      setNextClass(getNextClass(horario, diasConClases));
    };

    updateNextClass();
    const intervalId = setInterval(updateNextClass, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [hasHorario, horario, diasConClases]);

  const handleOpenMeetLink = () => {
    if (!nextClass?.meetLink) {
      return;
    }

    window.scraperApp?.openExternal?.(nextClass.meetLink);
  };

  return (
    <aside
      className="sticky top-8 flex h-[calc(100vh-4rem)] w-64 flex-col rounded-3xl border p-6 shadow-2xl shadow-slate-950/40"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border p-1.5 shadow-lg shadow-black/30"
            style={{ background: '#05070d', borderColor: 'var(--border-normal)' }}
          >
            <img
              src={dvpotroLogo}
              alt="DVPotro"
              className="h-full w-full object-contain"
              draggable="false"
            />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
              DVPotro
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
              ITSON
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Academic command center
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Consola enfocada en extraer actividades, fechas límite y adjuntos del portal académico.
        </p>
      </div>

      <nav className="space-y-2">
        {visibleNavigationItems.map((item) => {
          const isActive = item.id === activePage;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                isActive
                  ? ''
                  : ''
              }`}
              style={
                isActive
                  ? { background: 'var(--accent)', color: '#fff' }
                  : {
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                  }
              }
              onMouseEnter={(event) => {
                if (!isActive) {
                  event.currentTarget.style.background = 'var(--bg-tertiary)';
                  event.currentTarget.style.color = 'var(--text-strong)';
                }
              }}
              onMouseLeave={(event) => {
                if (!isActive) {
                  event.currentTarget.style.background = 'var(--bg-secondary)';
                  event.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <span
                className="text-xs uppercase tracking-[0.25em]"
                style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
              >
                {isActive ? 'Live' : 'Idle'}
              </span>
            </button>
          );
        })}
      </nav>

      {hasHorario ? (
        <div
          className="mt-auto border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="rounded-2xl border p-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Próxima clase</span>
            </div>

            {nextClass ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--text-strong)' }}
                      title={nextClass.materia}
                    >
                      {nextClass.materia}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {nextClass.hora} · {nextClass.salon}
                    </p>
                  </div>

                  {nextClass.meetLink ? (
                    <button
                      type="button"
                      onClick={handleOpenMeetLink}
                      className="shrink-0 rounded-xl border p-2 transition hover:scale-105"
                      style={{ borderColor: 'var(--border-normal)', color: 'var(--accent)' }}
                      title="Abrir videollamada"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                {nextClass.esHoy && nextClass.minutosRestantes <= 30 ? (
                  <span
                    className="inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold"
                    style={{
                      background: 'var(--retrasada-bg)',
                      borderColor: 'var(--retrasada-border)',
                      color: 'var(--retrasada-text)',
                    }}
                  >
                    {getNextClassStatus(nextClass)}
                  </span>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {getNextClassStatus(nextClass)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                Sin clases próximas
              </p>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export default Sidebar;
