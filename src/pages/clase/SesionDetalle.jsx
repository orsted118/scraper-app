import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, FileDown, GitMerge, Loader2, Pencil, Search, Sparkles, Trash2,
} from 'lucide-react';

import { EASE } from '../../utils/motion';
import EditorTituloMateria from './EditorTituloMateria';
import Galeria from './Galeria';
import Panel from './Panel';
import Rotulo from './Rotulo';
import Transcripcion from './Transcripcion';
import VisorCaptura from './VisorCaptura';
import {
  capturaEn, duracionLegible, etiquetaSesion, horaLegible, incluye, lineaEn, minutoSegundo, nombreMateria, rangoHorario,
} from './formato';

// Para la segunda pasada, donde el reloj no importa.
const MODELOS_FINOS = [
  { id: 'medium', label: 'medium' },
  { id: 'large-v3', label: 'large-v3 (lento)' },
];

const PREFIJO_LINEA = 'detalle-linea';

function Cargando({ texto }) {
  return (
    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }} role="status">
      <Loader2 className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
      {texto}
    </p>
  );
}

// Una sesión abierta: transcripción con búsqueda y la pantalla de la clase,
// en pestañas porque son dos formas de recorrer lo mismo. Los minutos de la
// transcripción abren la captura de ese momento y la captura lleva de vuelta
// al texto: es el cruce que hace útil tener las dos cosas.
export default function SesionDetalle({
  sesion, transcript, cargando, capturas, cargandoCapturas,
  onVolver, onPedirBorrado, onPedirUnion, hayOtrasSesiones,
  edicion, onEmpezarEdicion,
  modeloFino, onModeloFino, onRetranscribir, retranscribiendo, avanceFino,
  onExportar, exportando,
}) {
  const [tab, setTab] = useState('transcripcion');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [imagenAbierta, setImagenAbierta] = useState(null);
  const [lineaMarcada, setLineaMarcada] = useState(null);
  const tituloRef = useRef(null);
  const reduced = useReducedMotion();
  const id = useId();

  // Al abrir, el foco va al título: quien navega con teclado o lector de
  // pantalla aterriza en la sesión que eligió y no en el tope de la página.
  useEffect(() => {
    tituloRef.current?.focus();
  }, [sesion?.id]);

  // Debounce corto: una clase de 2 h son ~1.750 líneas, y filtrar/resaltar en
  // cada tecla sobre la lista completa se nota.
  useEffect(() => {
    const espera = setTimeout(() => setBusqueda(busquedaInput.trim()), 150);
    return () => clearTimeout(espera);
  }, [busquedaInput]);

  useEffect(() => {
    setIndiceActivo(0);
  }, [busqueda]);

  const resultados = useMemo(
    () => (busqueda ? transcript.filter((linea) => incluye(linea.texto, busqueda)) : []),
    [transcript, busqueda],
  );

  const irALinea = useCallback((inicio, enfocar = false) => {
    const nodo = document.getElementById(`${PREFIJO_LINEA}-${inicio}`);
    if (!nodo) return;
    nodo.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    if (enfocar) nodo.querySelector('button')?.focus({ preventScroll: true });
  }, [reduced]);

  // La línea marcada desde el visor se busca DESPUÉS de que la pestaña de
  // transcripción volvió a montarse; antes de eso el nodo no existe.
  useEffect(() => {
    if (tab !== 'transcripcion' || lineaMarcada === null) return;
    irALinea(lineaMarcada, true);
  }, [tab, lineaMarcada, irALinea]);

  const irAResultado = (delta) => {
    if (!resultados.length) return;

    const siguiente = (indiceActivo + delta + resultados.length) % resultados.length;
    setIndiceActivo(siguiente);
    setLineaMarcada(null);
    irALinea(resultados[siguiente].inicio);
  };

  // Se limpia la marca al abrir: si no, volver a pedir "ver lo que se decía"
  // sobre la misma línea no cambiaría el estado y no volvería a llevar a ella.
  const abrirCapturaEn = useCallback((segundo) => {
    setLineaMarcada(null);
    setImagenAbierta(capturaEn(capturas, segundo));
  }, [capturas]);

  const verTranscripcionEn = (segundo) => {
    const linea = lineaEn(transcript, segundo);
    setImagenAbierta(null);
    setTab('transcripcion');
    if (linea) setLineaMarcada(linea.inicio);
  };

  if (!sesion) return null;

  const etiqueta = etiquetaSesion(sesion);
  const materia = nombreMateria(sesion.materia);
  const partes = Array.isArray(sesion.partes) ? sesion.partes : [];
  // Re-transcribir pasa audio.wav solo: en una sesión unida reescribiría el
  // transcript desde cero con la primera parte y las demás desaparecerían.
  const tienePartesUnidas = partes.length > 0;
  // Lo último que pidió el usuario manda: volver desde una captura marca esa
  // línea aunque haya una búsqueda activa; moverse entre resultados la limpia.
  const activaInicio = lineaMarcada ?? (busqueda ? resultados[indiceActivo]?.inicio ?? null : null);

  const pestanas = [
    { id: 'transcripcion', label: 'Transcripción', cantidad: transcript.length },
    { id: 'pantalla', label: 'Pantalla', cantidad: capturas.length },
  ];

  const moverConFlechas = (event) => {
    const orden = pestanas.map((p) => p.id);
    const actual = orden.indexOf(tab);
    const destinos = { ArrowRight: actual + 1, ArrowLeft: actual - 1, Home: 0, End: orden.length - 1 };
    if (!(event.key in destinos)) return;

    event.preventDefault();
    const siguiente = orden[(destinos[event.key] + orden.length) % orden.length];
    setTab(siguiente);
    document.getElementById(`${id}-tab-${siguiente}`)?.focus();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="flex items-center gap-2 text-xs uppercase tracking-widest"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
        onClick={onVolver}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        Volver a clases grabadas
      </button>

      <Panel as="section" acento aria-labelledby={`${id}-titulo`}>
        {edicion.activa ? (
          <EditorTituloMateria {...edicion.props} />
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Rotulo>
                {[
                  new Date(sesion.inicio).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
                  rangoHorario(sesion),
                  duracionLegible(sesion),
                ].filter(Boolean).join(' · ')}
              </Rotulo>
              <h3
                ref={tituloRef}
                id={`${id}-titulo`}
                tabIndex={-1}
                className="mt-2 text-2xl outline-none"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}
              >
                {etiqueta}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {materia ? [materia, sesion.materia?.profesor].filter(Boolean).join(' · ') : 'Sin materia'}
              </p>
              <p className="mt-1 text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {sesion.segmentos ?? 0} segmentos · modelo {sesion.modelo || '?'}
                {sesion.retranscrito ? ' · reprocesada' : ''}
              </p>

              {tienePartesUnidas ? (
                <ol aria-label="Partes unidas" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-normal)' }}>
                  <li>Parte 1 · {horaLegible(sesion.inicio)} · desde 0:00</li>
                  {partes.map((parte, indice) => (
                    <li key={parte.id}>
                      Parte {indice + 2} · {horaLegible(parte.inicio)} · desde {minutoSegundo(parte.offsetSegundos || 0)}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
                data-editar-id={sesion.id}
                onClick={() => onEmpezarEdicion(sesion)}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                Renombrar
              </button>
              {hayOtrasSesiones ? (
                <button type="button" className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => onPedirUnion(sesion)}>
                  <GitMerge className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Unir con otra
                </button>
              ) : null}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                style={{ border: '1px solid var(--error-border)', color: 'var(--error-text)', borderRadius: 'var(--radius-button, 0px)' }}
                onClick={() => onPedirBorrado(sesion)}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel as="section" aria-label="Contenido de la clase">
        <div
          role="tablist"
          aria-label="Contenido de la clase"
          className="no-scrollbar flex items-end gap-5 overflow-x-auto border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
          onKeyDown={moverConFlechas}
        >
          {pestanas.map(({ id: pestana, label, cantidad }) => {
            const activa = pestana === tab;

            return (
              <button
                key={pestana}
                id={`${id}-tab-${pestana}`}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls={`${id}-panel-${pestana}`}
                tabIndex={activa ? 0 : -1}
                onClick={() => setTab(pestana)}
                className={`relative shrink-0 pb-3 text-xs font-bold uppercase tracking-[0.14em] ${activa ? '' : 'tab-hover'}`}
                style={{ color: activa ? 'var(--text-strong)' : 'var(--text-muted)' }}
              >
                {label}
                <span
                  className="ml-1.5"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', color: activa ? 'var(--accent)' : 'inherit' }}
                >
                  {cantidad}
                </span>
                {activa ? (
                  <motion.span
                    layoutId="clase-detalle-tab"
                    className="absolute inset-x-0 -bottom-px block h-0.5"
                    style={{ background: 'var(--accent)' }}
                    transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        {tab === 'transcripcion' ? (
          <div id={`${id}-panel-transcripcion`} role="tabpanel" aria-labelledby={`${id}-tab-transcripcion`} className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="field flex min-w-[14rem] flex-1 items-center gap-2 px-3">
                <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                <label htmlFor={`${id}-buscar`} className="sr-only">Buscar en la transcripción</label>
                <input
                  id={`${id}-buscar`}
                  type="search"
                  className="w-full bg-transparent py-1.5 text-sm outline-none"
                  style={{ color: 'var(--text-strong)' }}
                  placeholder="Buscar en lo que se dijo... (Enter: siguiente)"
                  value={busquedaInput}
                  onChange={(event) => setBusquedaInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    irAResultado(event.shiftKey ? -1 : 1);
                  }}
                />
              </div>

              {busqueda ? (
                <div className="flex items-center gap-1 text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  <button type="button" className="p-1.5" onClick={() => irAResultado(-1)} disabled={!resultados.length} aria-label="Resultado anterior">
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <span role="status" aria-live="polite" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {resultados.length ? `${indiceActivo + 1} de ${resultados.length}` : 'Sin resultados'}
                  </span>
                  <button type="button" className="p-1.5" onClick={() => irAResultado(1)} disabled={!resultados.length} aria-label="Resultado siguiente">
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              <div className="ml-auto flex items-center gap-2" role="group" aria-label="Exportar la transcripción">
                <button type="button" className="btn-outline flex items-center gap-1.5 px-3 py-1 text-xs" onClick={() => onExportar(sesion.id, 'txt')} disabled={exportando} aria-label="Exportar la transcripción como .txt">
                  <FileDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  .txt
                </button>
                <button type="button" className="btn-outline flex items-center gap-1.5 px-3 py-1 text-xs" onClick={() => onExportar(sesion.id, 'md')} disabled={exportando} aria-label="Exportar la transcripción como .md">
                  <FileDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  .md
                </button>
              </div>
            </div>

            {capturas.length > 0 ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Tocá un minuto para ver qué había en pantalla en ese momento.
              </p>
            ) : null}

            <div className="mt-4">
              {cargando ? <Cargando texto="Leyendo la transcripción..." /> : null}
              {!cargando && transcript.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Esta sesión no transcribió nada. Puede que no haya entrado audio.
                </p>
              ) : null}
              {!cargando && transcript.length > 0 ? (
                <Transcripcion
                  lineas={transcript}
                  className="max-h-[32rem]"
                  termino={busqueda}
                  activaInicio={activaInicio}
                  onMomento={capturas.length ? abrirCapturaEn : null}
                  idPrefijo={PREFIJO_LINEA}
                  etiqueta="Transcripción completa"
                />
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <Rotulo as="label" htmlFor={`${id}-modelo-fino`}>Mejorar transcripción</Rotulo>
              {tienePartesUnidas ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No disponible: esta sesión tiene partes unidas. Reprocesar reescribiría la transcripción
                  solo desde el audio de la primera parte y las partes agregadas se perderían.
                </p>
              ) : (
                <>
                  <select
                    id={`${id}-modelo-fino`}
                    className="field px-2 py-1 text-xs"
                    value={modeloFino}
                    onChange={(event) => onModeloFino(event.target.value)}
                    disabled={!!retranscribiendo}
                  >
                    {MODELOS_FINOS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-outline flex items-center gap-2 px-4 py-1.5 text-xs"
                    onClick={() => onRetranscribir(sesion.id)}
                    disabled={!!retranscribiendo}
                    aria-busy={retranscribiendo === sesion.id || undefined}
                  >
                    {retranscribiendo === sesion.id ? (
                      <>
                        <Loader2 className="h-3 w-3 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
                        {avanceFino ? `${Math.round(avanceFino * 100)}%` : 'Cargando modelo'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        Volver a transcribir
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div id={`${id}-panel-pantalla`} role="tabpanel" aria-labelledby={`${id}-tab-pantalla`} className="pt-4">
            {cargandoCapturas ? <Cargando texto="Buscando las capturas..." /> : null}
            {!cargandoCapturas && capturas.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Esta sesión no guardó capturas de pantalla.
              </p>
            ) : null}
            {!cargandoCapturas && capturas.length > 0 ? (
              <Galeria
                capturas={capturas}
                onAbrir={(indice) => {
                  setLineaMarcada(null);
                  setImagenAbierta(indice);
                }}
              />
            ) : null}
          </div>
        )}
      </Panel>

      {imagenAbierta !== null && capturas[imagenAbierta] ? (
        <VisorCaptura
          capturas={capturas}
          indice={imagenAbierta}
          onCambiar={setImagenAbierta}
          onCerrar={() => setImagenAbierta(null)}
          onVerTranscripcion={transcript.length ? verTranscripcionEn : null}
        />
      ) : null}
    </div>
  );
}
