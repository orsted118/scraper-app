import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle,
  Clock3,
  FileCheck2,
  GraduationCap,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const NOTIFICATION_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'No leídas' },
  { id: 'cia', label: 'CIA' },
  { id: 'horario', label: 'Horario' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'tramite', label: 'Trámites' },
];

const NOTIFICATION_META = {
  cia: {
    label: 'CIA',
    tone: 'var(--error-text)',
    toneBg: 'var(--error-bg)',
    tint: 'rgba(239, 68, 68, 0.14)',
    tintSoft: 'rgba(239, 68, 68, 0.22)',
    icon: GraduationCap,
  },
  horario: {
    label: 'Horario',
    tone: 'var(--success-text)',
    toneBg: 'var(--success-bg)',
    tint: 'rgba(16, 185, 129, 0.14)',
    tintSoft: 'rgba(16, 185, 129, 0.22)',
    icon: Clock3,
  },
  calendario: {
    label: 'Calendario',
    tone: 'var(--accent)',
    toneBg: 'rgba(0, 109, 182, 0.15)',
    tint: 'rgba(0, 109, 182, 0.14)',
    tintSoft: 'rgba(0, 109, 182, 0.22)',
    icon: CalendarDays,
  },
  tramite: {
    label: 'Trámite',
    tone: 'var(--retrasada-text)',
    toneBg: 'var(--retrasada-bg)',
    tint: 'rgba(249, 115, 22, 0.14)',
    tintSoft: 'rgba(249, 115, 22, 0.22)',
    icon: FileCheck2,
  },
  ivirtual: {
    label: 'iVirtual',
    tone: '#8b5cf6',
    toneBg: 'rgba(139, 92, 246, 0.16)',
    tint: 'rgba(139, 92, 246, 0.14)',
    tintSoft: 'rgba(139, 92, 246, 0.22)',
    icon: Bell,
  },
  sistema: {
    label: 'Sistema',
    tone: 'var(--closed-text)',
    toneBg: 'var(--closed-bg)',
    tint: 'rgba(100, 116, 139, 0.14)',
    tintSoft: 'rgba(100, 116, 139, 0.22)',
    icon: AlertCircle,
  },
};

const MOCK_NOTIFICATIONS = [
  {
    id: 'cia-final-sist-op',
    channel: 'cia',
    bucket: 'Hoy',
    title: 'Se publicó tu calificación final de Sistemas Operativos',
    message: 'La materia ya muestra promedio final y detalle por componentes dentro del CIA.',
    time: 'hace 18 min',
    read: false,
  },
  {
    id: 'horario-link-update',
    channel: 'horario',
    bucket: 'Hoy',
    title: 'Horario actualizado: enlace Meet renovado',
    message: 'Se ajustó el enlace de videollamada de Programación II con Laboratorio para la próxima sesión.',
    time: 'hace 42 min',
    read: false,
  },
  {
    id: 'calendario-evaluacion-docente',
    channel: 'calendario',
    bucket: 'Hoy',
    title: 'Evaluación docente abierta esta semana',
    message: 'El calendario académico marca el periodo activo para evaluar a tus profesores.',
    time: 'hace 2 h',
    read: true,
  },
  {
    id: 'tramite-reinscripcion',
    channel: 'tramite',
    bucket: 'Ayer',
    title: 'Recordatorio: reinscripción y pago siguen disponibles',
    message: 'Tu ventana de trámite continúa activa y el acceso al portal sigue habilitado.',
    time: 'ayer 17:20',
    read: true,
  },
  {
    id: 'ivirtual-actividad-nueva',
    channel: 'ivirtual',
    bucket: 'Ayer',
    title: 'Nueva actividad en iVirtual para Programación II c/Lab',
    message: 'Hay una entrega pendiente con fecha visible y materiales actualizados por el profesor.',
    time: 'ayer 13:45',
    read: false,
  },
  {
    id: 'sistema-sincronizacion',
    channel: 'sistema',
    bucket: 'Esta semana',
    title: 'Tu horario quedó sincronizado correctamente',
    message: 'La última actualización recuperó 7 materias y guardó los enlaces de clase en línea.',
    time: 'hace 2 días',
    read: true,
  },
  {
    id: 'cia-parcial-publicado',
    channel: 'cia',
    bucket: 'Esta semana',
    title: 'Parcial 2 publicado en Calificaciones',
    message: 'Se registró la evaluación parcial y el promedio del curso se actualizó en tiempo real.',
    time: 'hace 3 días',
    read: true,
  },
  {
    id: 'calendario-receso',
    channel: 'calendario',
    bucket: 'Esta semana',
    title: 'Calendario escolar: inicia receso académico',
    message: 'El periodo de descanso quedó marcado para esta quincena en el panel del calendario.',
    time: 'hace 5 días',
    read: false,
  },
];

const BUCKET_ORDER = ['Hoy', 'Ayer', 'Esta semana'];

function NotificationCard({ item, onToggleRead }) {
  const meta = NOTIFICATION_META[item.channel] || NOTIFICATION_META.sistema;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onToggleRead(item.id)}
      className="group w-full text-left"
      aria-pressed={!item.read}
    >
      <article
        className="relative overflow-hidden rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5"
        style={{
          borderColor: item.read ? 'var(--border-subtle)' : meta.tone,
          background: item.read
            ? 'var(--bg-card)'
            : `linear-gradient(135deg, ${meta.tint}, rgba(2, 6, 23, 0.82))`,
          boxShadow: item.read ? 'none' : `0 18px 40px rgba(0,0,0,0.18)`,
        }}
      >
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: meta.tone }} />
        <div className="flex gap-4 pl-1">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              background: meta.tint,
              borderColor: meta.tintSoft,
              color: meta.tone,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{
                      background: meta.tint,
                      color: meta.tone,
                    }}
                  >
                    {meta.label}
                  </span>
                  {!item.read ? (
                    <span className="h-2 w-2 rounded-full" style={{ background: meta.tone }} />
                  ) : null}
                </div>

                <h3 className="mt-2 text-[15px] font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
                  {item.title}
                </h3>
              </div>

              <p className="shrink-0 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {item.time}
              </p>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-normal)' }}>
              {item.message}
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: item.read ? 'var(--closed-text)' : meta.tone,
                  }}
                />
                <span>{item.read ? 'Leída' : 'Sin leer'}</span>
              </div>
              <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
                Toca para alternar estado
              </span>
            </div>
          </div>
        </div>
      </article>
    </button>
  );
}

function Notificaciones() {
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = items.filter((item) => !item.read).length;

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'unread'
            ? !item.read
            : item.channel === filter;

      const matchesQuery =
        !normalizedQuery ||
        [item.title, item.message, item.time, NOTIFICATION_META[item.channel]?.label]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(normalizedQuery));

      return matchesFilter && matchesQuery;
    });
  }, [filter, items, searchQuery]);

  const groupedItems = useMemo(() => {
    return BUCKET_ORDER.map((bucket) => ({
      bucket,
      items: filteredItems.filter((item) => item.bucket === bucket),
    })).filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const markAllAsRead = () => {
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
  };

  const toggleRead = (id) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, read: !item.read } : item)),
    );
  };

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-strong)' }}>
            Notificaciones
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {unreadCount} sin leer
          </p>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          className="shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
          style={{
            borderColor: 'var(--border-normal)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-strong)',
          }}
        >
          Marcar todo como leído
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-3xl border p-5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
                  Filtros rápidos
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-normal)' }}>
                  Filtra por fuente o muestra sólo lo pendiente.
                </p>
              </div>

              <label className="flex min-w-[240px] items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)' }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar notificaciones"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  style={{ color: 'var(--text-strong)' }}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {NOTIFICATION_FILTERS.map((option) => {
                const active = filter === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{
                      borderColor: active ? 'var(--accent)' : 'var(--border-normal)',
                      background: active ? 'rgba(0, 109, 182, 0.14)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-normal)',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            {groupedItems.length ? (
              groupedItems.map(({ bucket, items: bucketItems }) => (
                <section key={bucket} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
                        {bucket}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
                        {bucketItems.length} notificación{bucketItems.length === 1 ? '' : 'es'}
                      </p>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                  </div>

                  <div className="space-y-3">
                    {bucketItems.map((item) => (
                      <NotificationCard key={item.id} item={item} onToggleRead={toggleRead} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)' }}>
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
                  Sin resultados
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Ajusta el filtro o la búsqueda para volver a ver avisos simulados.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-8 self-start">
          <section className="rounded-3xl border p-5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
              Canales activos
            </p>
            <div className="mt-4 space-y-3">
              {Object.entries(NOTIFICATION_META).map(([key, meta]) => {
                const count = items.filter((item) => item.channel === key).length;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.tone }} />
                      <span className="text-sm" style={{ color: 'var(--text-normal)' }}>{meta.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

export default Notificaciones;
