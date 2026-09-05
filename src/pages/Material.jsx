import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Link2,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatLastSync } from '../utils/formatLastSync';
import { parseFechaPortal } from '../utils/fechas';

// Cada tipo de recurso tiene una acción distinta porque vive en un lado
// distinto: un PDF de Moodle se baja, un Drive se abre con la cuenta de Google
// del alumno, una página de Moodle se lee acá mismo.
const RESOURCE_META = {
  carpeta: { icon: Folder, label: 'Archivos' },
  drive: { icon: FileText, label: 'Drive' },
  // Un pluginfile suelto en el texto de una sección: está en Moodle, así que se
  // baja igual que los de una carpeta.
  archivo: { icon: FileText, label: 'Archivo' },
  pagina: { icon: BookOpen, label: 'Apunte' },
  enlace: { icon: Link2, label: 'Enlace' },
  foro: { icon: MessageSquare, label: 'Foro' },
};

const LIVE_LINK_META = {
  meet: { icon: Video, label: 'Entrar a clase' },
  whatsapp: { icon: MessageSquare, label: 'Grupo de WhatsApp' },
  telegram: { icon: MessageSquare, label: 'Grupo de Telegram' },
};

const api = () => (typeof window !== 'undefined' ? window.scraperApp?.material : null);

// El texto que se busca de un recurso depende del tipo: en una página el
// contenido importa tanto como el título, en una carpeta importan los nombres
// de archivo. Buscar sólo por título dejaría fuera lo que el alumno recuerda.
function searchableText(resource) {
  return [
    resource.nombre,
    resource.descripcion,
    resource.texto,
    ...(resource.archivos || []).map((file) => file.nombre),
    ...(resource.links || []).map((link) => link.texto),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

// Los dos módulos escriben el nombre de la materia con el mismo texto del
// portal, pero cruzarlos por string exacto se rompe con un acento o un espacio
// de más, y el conteo daría cero sin avisar de nada.
function normalizarMateria(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function Material({ activities = [] }) {
  const [data, setData] = useState(null);
  // Toast local: App no le pasa un showToast a las páginas, y el feedback de
  // "descargado" / "N recursos nuevos" es de este módulo nada más.
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openMateria, setOpenMateria] = useState(null);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    (async () => {
      const result = await api()?.getCached?.();
      if (result?.ok && result.data) setData(result.data);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = setToast;

  // El scrape recorre curso por curso y tarda ~25s: sin progreso la UI queda
  // muda y parece colgada.
  useEffect(() => api()?.onProgress?.(setProgress), []);

  const sync = async () => {
    setLoading(true);
    setError('');
    setProgress(null);

    try {
      const bridge = api();

      // La app pudo quedar corriendo desde antes de que existiera el módulo:
      // ahí el canal no está registrado en el main y el invoke rechaza.
      if (!bridge?.sync) {
        setError('La app no expone el canal de material. Reiniciá DVPotro.');
        return;
      }

      const result = await bridge.sync();

      if (!result?.ok) {
        setError(result?.error || 'No fue posible sincronizar el material.');
        return;
      }

      setData(result.data);
      const nuevos = result.data.novedades?.length || 0;
      showToast?.(nuevos > 0 ? `${nuevos} recurso(s) nuevo(s)` : 'Material actualizado');
    } catch (bridgeError) {
      // `ipcRenderer.invoke` rechaza cuando el canal no tiene handler. Con
      // try/finally sin catch el spinner se apagaba sin decir nada y parecía
      // que el botón no hacía nada.
      setError(`No fue posible sincronizar el material: ${bridgeError?.message || bridgeError}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const download = async (resource, file, materiaId) => {
    const key = `${resource.id}-${file.url}`;
    setDownloading((current) => ({ ...current, [key]: true }));

    try {
      const result = await api()?.download?.({ url: file.url, nombre: file.nombre, materiaId });

      if (result?.ok) {
        showToast?.(`${file.nombre} descargado`);
        await api()?.openFile?.(result.path);
        return;
      }

      showToast?.(result?.error === 'NOT_DOWNLOADABLE'
        ? 'Ese archivo no está en iVirtual: se abre en el navegador.'
        : 'No fue posible descargar el archivo.');
    } catch (bridgeError) {
      showToast?.(`No fue posible descargar: ${bridgeError?.message || bridgeError}`);
    } finally {
      setDownloading((current) => ({ ...current, [key]: false }));
    }
  };

  const materias = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data?.materias || [];

    // Filtra recursos, no materias: buscar "java" tiene que mostrar la materia
    // con sólo los recursos que matchean, no la materia entera.
    return (data?.materias || [])
      .map((materia) => ({
        ...materia,
        secciones: materia.secciones
          .map((seccion) => ({
            ...seccion,
            recursos: seccion.recursos.filter((recurso) => searchableText(recurso).includes(term)),
          }))
          .filter((seccion) => seccion.recursos.length > 0),
      }))
      .filter((materia) => materia.secciones.length > 0);
  }, [data, query]);

  // Las entregadas llegan del scraper de Actividades, no del de Material: son la
  // misma actividad vista desde el otro lado. Se cruzan por nombre de materia,
  // que en los dos módulos sale del mismo enlace del dashboard de iVirtual.
  const entregadasPorMateria = useMemo(() => {
    const mapa = new Map();

    (activities || [])
      .filter((activity) => activity?.estado === 'entregada')
      .forEach((activity) => {
        const clave = normalizarMateria(activity.materia);
        if (!mapa.has(clave)) mapa.set(clave, []);
        mapa.get(clave).push(activity);
      });

    // Lo último entregado primero: es lo que el alumno acaba de hacer y lo que
    // viene a confirmar.
    mapa.forEach((lista) =>
      lista.sort((left, right) => (parseFechaPortal(right.fechaEntrega) || 0) - (parseFechaPortal(left.fechaEntrega) || 0)),
    );

    return mapa;
  }, [activities]);

  const entregadasDe = (materia) => entregadasPorMateria.get(normalizarMateria(materia?.nombre)) || [];

  const novedades = data?.novedades || [];
  const totalRecursos = (data?.materias || []).reduce((sum, m) => sum + (m.totalRecursos || 0), 0);
  const totalEntregadas = (activities || []).filter((activity) => activity?.estado === 'entregada').length;
  const materiaAbierta = (data?.materias || []).find((materia) => materia.id === openMateria) || null;

  if (error) {
    return (
      <div className="space-y-6">
        <Header onSync={sync} loading={loading} progress={progress} timestamp={data?.timestamp} total={totalRecursos} />
        <div
          className="border px-4 py-4 text-sm"
          style={{ borderColor: 'var(--error-border)', background: 'var(--error-bg)', color: 'var(--error-text)', borderRadius: 'var(--radius-card, 0px)' }}
        >
          {error === 'NO_CREDENTIALS'
            ? 'No has configurado tus credenciales de iVirtual. Ve a Ajustes para hacerlo.'
            : error}
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Header onSync={sync} loading={loading} progress={progress} timestamp={null} total={0} />
        <EmptyState
          icon={RefreshCw}
          title="Buscando material…"
          detail={progress?.curso ? `Revisando ${progress.curso}` : 'Entrando a cada materia en iVirtual.'}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Header onSync={sync} loading={loading} progress={progress} timestamp={null} total={0} />
        <EmptyState
          icon={BookOpen}
          title="Todavía no sincronizaste el material"
          detail="Sincronizá para traer presentaciones, apuntes y enlaces de cada materia."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        onSync={sync}
        loading={loading}
        progress={progress}
        timestamp={data.timestamp}
        total={totalRecursos}
        entregadas={totalEntregadas}
      />

      {novedades.length > 0 ? <NovedadesBanner novedades={novedades} /> : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en títulos, apuntes y nombres de archivo..."
          className="w-full border py-2 pl-9 pr-3 text-sm"
          style={{
            borderColor: 'var(--border-normal)',
            background: 'var(--bg-card)',
            color: 'var(--text-normal)',
            borderRadius: 'var(--radius-button, 0px)',
          }}
        />
      </div>

      {/* Tres vistas, en este orden de prioridad:
          1. buscando        → resultados de todas las materias, siempre abiertos
          2. materia abierta → su material y lo que entregaste ahí
          3. nada de eso     → la grilla de materias, como las ve iVirtual */}
      {query ? (
        materias.length === 0 ? (
          <EmptyState icon={Search} title="Sin resultados" detail={`Nada coincide con "${query}".`} />
        ) : (
          materias.map((materia) => (
            <MateriaCard
              key={materia.id}
              materia={materia}
              // Con búsqueda activa se abre todo: esconder resultados detrás de
              // un acordeón haría que la búsqueda no parezca haber encontrado
              // nada.
              expanded
              onToggle={() => setOpenMateria(materia.id)}
              onDownload={download}
              downloading={downloading}
              novedadIds={new Set(novedades.map((n) => n.id))}
            />
          ))
        )
      ) : materiaAbierta ? (
        <MateriaDetalle
          materia={materiaAbierta}
          entregadas={entregadasDe(materiaAbierta)}
          onBack={() => setOpenMateria(null)}
          onDownload={download}
          downloading={downloading}
          novedadIds={new Set(novedades.map((n) => n.id))}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data.materias || []).map((materia) => (
            <CourseTile
              key={materia.id}
              materia={materia}
              entregadas={entregadasDe(materia).length}
              onOpen={() => setOpenMateria(materia.id)}
            />
          ))}
        </div>
      )}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-30 border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-strong)',
            borderRadius: 'var(--radius-card, 0px)',
            boxShadow: 'var(--shadow-card, none)',
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Header({ onSync, loading, progress, timestamp, total, entregadas = 0 }) {
  return (
    <div
      className="border p-6"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <span
            className="inline-flex items-center gap-2 border px-3 py-1 text-xs uppercase tracking-[0.25em]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 'var(--radius-badge, 0px)' }}
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
            Material
          </span>

          <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, inherit)' }}>
            Material de tus materias
          </h3>

          <p className="max-w-2xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            Presentaciones, apuntes y enlaces que publicaron tus profesores, ordenados por materia y semana.
          </p>

          {timestamp ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
              {total} recursos · {entregadas} {entregadas === 1 ? 'entregada' : 'entregadas'} · {formatLastSync(timestamp)}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSync}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-60"
          style={{
            borderColor: 'var(--border-normal)',
            color: 'var(--text-normal)',
            borderRadius: 'var(--radius-button, 0px)',
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          {loading && progress?.curso ? progress.curso.slice(0, 22) : loading ? 'Sincronizando' : 'Sincronizar'}
        </button>
      </div>
    </div>
  );
}

// El valor del módulo frente a abrir iVirtual: saber qué cambió sin releer todo.
function NovedadesBanner({ novedades }) {
  return (
    <div
      className="border px-4 py-3"
      style={{ borderColor: 'var(--accent)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {novedades.length} recurso(s) nuevo(s) desde la última sync
        </p>
      </div>

      <ul className="mt-2 space-y-1">
        {novedades.slice(0, 6).map((item) => (
          <li key={item.id} className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-normal)' }}>{item.nombre}</span> · {item.materia}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Cuadro de materia, con la misma información que la tarjeta de iVirtual:
// portada, clave, nombre y periodo. Debajo, lo que iVirtual NO te dice de un
// vistazo — cuánto material hay y cuántas entregaste.
function CourseTile({ materia, entregadas, onOpen }) {
  const [imagenRota, setImagenRota] = useState(false);
  // La portada generada por Moodle es un data:image/svg+xml y se ve siempre.
  // Cuando el profe sube una propia es un pluginfile y necesita la cookie de
  // sesión: si la sesión venció queda un hueco, así que se cae a un fondo liso.
  const conImagen = Boolean(materia.imagen) && !imagenRota;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden border text-left"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div
        className="h-24 w-full shrink-0"
        style={{
          background: conImagen ? `center / cover no-repeat url("${materia.imagen}")` : 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Una <img> oculta es la única forma de enterarse de que el fondo CSS
            no cargó: background-image no dispara onError. */}
        {materia.imagen && !imagenRota ? (
          <img src={materia.imagen} alt="" hidden onError={() => setImagenRota(true)} />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        {materia.codigo ? (
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {materia.codigo}
          </span>
        ) : null}

        <h4 className="truncate text-base font-semibold" style={{ color: 'var(--text-strong)' }}>
          {materia.nombre}
        </h4>

        {materia.periodo ? (
          <span className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
            {materia.periodo}
          </span>
        ) : null}

        <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
            {materia.totalRecursos} recursos
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            style={{ color: entregadas > 0 ? 'var(--success-text)' : 'var(--text-muted)' }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {entregadas} {entregadas === 1 ? 'entregada' : 'entregadas'}
          </span>
        </div>
      </div>
    </button>
  );
}

// Una actividad que ya entregaste. Muestra cuándo la entregaste y con qué
// archivo: es lo que uno viene a confirmar cuando duda de si la subió.
function EntregadaRow({ actividad }) {
  const entregada = parseFechaPortal(actividad.fechaEntrega);
  const limite = parseFechaPortal(actividad.fechaLimite);
  // A tiempo o tarde según la fecha real de entrega contra el límite: iVirtual
  // lo dice en una frase suelta y acá es un dato comparable.
  const aTiempo = entregada !== null && limite !== null ? entregada <= limite : null;

  return (
    <div
      className="flex items-start gap-3 border-l-[3px] py-2 pl-3"
      style={{ borderColor: aTiempo === false ? 'var(--retrasada-text)' : 'var(--success-text)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" style={{ color: 'var(--text-normal)' }}>
          {actividad.nombre}
        </p>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            {actividad.fechaEntrega || 'Sin fecha de entrega'}
          </span>
          {aTiempo === false ? <span style={{ color: 'var(--retrasada-text)' }}>· fuera de plazo</span> : null}
        </p>

        {(actividad.entregaArchivos || []).length > 0 ? (
          <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {actividad.entregaArchivos.map((file) => file.name).join(' · ')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// Vista de una materia: su material por sección y lo que entregaste en ella.
function MateriaDetalle({ materia, entregadas, onBack, onDownload, downloading, novedadIds }) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        Todas las materias
      </button>

      <div>
        {materia.codigo ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {materia.codigo}
          </p>
        ) : null}
        <h3 className="text-2xl font-semibold" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, inherit)' }}>
          {materia.nombre}
        </h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {materia.totalRecursos} recursos · {materia.secciones.length} secciones · {entregadas.length}{' '}
          {entregadas.length === 1 ? 'entregada' : 'entregadas'}
        </p>
      </div>

      {entregadas.length > 0 ? (
        <section
          className="border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
        >
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Entregadas
          </h4>
          <div className="space-y-1">
            {entregadas.map((actividad) => (
              <EntregadaRow key={actividad.id} actividad={actividad} />
            ))}
          </div>
        </section>
      ) : null}

      <MateriaCard
        materia={materia}
        expanded
        onToggle={() => {}}
        onDownload={onDownload}
        downloading={downloading}
        novedadIds={novedadIds}
      />
    </div>
  );
}

function MateriaCard({ materia, expanded, onToggle, onDownload, downloading, novedadIds }) {
  return (
    <div
      className="border"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <div className="min-w-0">
          <h4 className="truncate text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
            {materia.nombre}
          </h4>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {materia.totalRecursos} recursos · {materia.secciones.length} secciones
          </p>
        </div>

        {/* Los enlaces vivos se ven aunque la materia esté colapsada: entrar a
            clase es la acción más frecuente y no debe costar dos clicks. */}
        {materia.enlacesVivos?.length > 0 ? (
          <div className="flex shrink-0 gap-2">
            {materia.enlacesVivos.map((enlace) => {
              const meta = LIVE_LINK_META[enlace.tipo] || LIVE_LINK_META.meet;
              const Icon = meta.icon;

              return (
                <span
                  key={enlace.url}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    api()?.openExternal?.(enlace.url);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.stopPropagation();
                    api()?.openExternal?.(enlace.url);
                  }}
                  title={meta.label}
                  className="inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 text-xs"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 'var(--radius-badge, 0px)' }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </button>

      {expanded ? (
        <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          {materia.secciones.map((seccion) => (
            <div key={seccion.titulo} className="mb-5 last:mb-0">
              <p className="mb-2 text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                {seccion.titulo}
              </p>

              <div className="space-y-2">
                {seccion.recursos.map((recurso) => (
                  <ResourceRow
                    key={recurso.id}
                    recurso={recurso}
                    materiaId={materia.id}
                    onDownload={onDownload}
                    downloading={downloading}
                    esNuevo={novedadIds.has(recurso.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResourceRow({ recurso, materiaId, onDownload, downloading, esNuevo }) {
  const [openPage, setOpenPage] = useState(false);
  const meta = RESOURCE_META[recurso.tipo] || RESOURCE_META.enlace;
  const Icon = meta.icon;

  return (
    <div
      className="border px-3 py-2.5"
      style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-button, 0px)' }}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm" style={{ color: 'var(--text-normal)' }}>
              {recurso.nombre}
            </p>
            {esNuevo ? (
              <span
                className="shrink-0 px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 'var(--radius-badge, 0px)' }}
              >
                Nuevo
              </span>
            ) : null}
          </div>

          {recurso.descripcion ? (
            <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
              {recurso.descripcion}
            </p>
          ) : null}

          {recurso.tipo === 'carpeta' ? (
            <ul className="mt-2 space-y-1">
              {recurso.archivos.map((archivo) => {
                const key = `${recurso.id}-${archivo.url}`;

                return (
                  <li key={archivo.url} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDownload(recurso, archivo, materiaId)}
                      disabled={downloading[key]}
                      className="inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Download className={`h-3 w-3 ${downloading[key] ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
                      <span className="truncate">{archivo.nombre}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {recurso.tipo === 'archivo' ? (
            <button
              type="button"
              onClick={() => onDownload(recurso, { nombre: recurso.nombre, url: recurso.destino }, materiaId)}
              disabled={downloading[`${recurso.id}-${recurso.destino}`]}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
              style={{ color: 'var(--accent)' }}
            >
              <Download
                className={`h-3 w-3 ${downloading[`${recurso.id}-${recurso.destino}`] ? 'animate-pulse' : ''}`}
                strokeWidth={1.5}
              />
              Descargar
            </button>
          ) : null}

          {recurso.tipo === 'pagina' && openPage ? (
            <div className="mt-2 space-y-2">
              <p className="whitespace-pre-line text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                {recurso.texto}
              </p>
              {recurso.links?.length > 0 ? (
                <ul className="space-y-1">
                  {recurso.links.map((link) => (
                    <li key={link.url}>
                      <button
                        type="button"
                        onClick={() => api()?.openExternal?.(link.url)}
                        className="inline-flex items-center gap-1.5 text-xs"
                        style={{ color: 'var(--accent)' }}
                      >
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                        <span className="truncate">{link.texto}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {meta.label}
          </span>

          {recurso.tipo === 'pagina' ? (
            <button
              type="button"
              onClick={() => setOpenPage((visible) => !visible)}
              className="text-xs"
              style={{ color: 'var(--accent)' }}
            >
              {openPage ? 'Ocultar' : 'Leer'}
            </button>
          ) : null}

          {/* Drive y enlaces se abren en el navegador del sistema: ahí el alumno
              ya tiene la sesión de Google del ITSON. Bajarlos desde acá no se
              puede — los Drive del portal exigen esa sesión. */}
          {recurso.tipo === 'drive' || recurso.tipo === 'enlace' || recurso.tipo === 'foro' ? (
            <button
              type="button"
              onClick={() => api()?.openExternal?.(recurso.destino || recurso.urlModulo)}
              aria-label={`Abrir ${recurso.nombre}`}
              className="p-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div
      className="border p-10 text-center"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <Icon className="mx-auto h-8 w-8" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
      <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
        {title}
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        {detail}
      </p>
    </div>
  );
}

export default Material;
