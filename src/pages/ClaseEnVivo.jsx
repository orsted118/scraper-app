import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import ConfirmModal from './clase/ConfirmModal';
import EnVivo from './clase/EnVivo';
import Historial from './clase/Historial';
import NuevaGrabacion from './clase/NuevaGrabacion';
import Panel from './clase/Panel';
import Rotulo from './clase/Rotulo';
import SesionDetalle from './clase/SesionDetalle';
import SetupPendiente from './clase/SetupPendiente';
import Toast from './clase/Toast';
import { claveMateria, etiquetaSesion, fechaLegible, materiasUnicas, opcionesMateria } from './clase/formato';

// Devuelve el foco a un control que volvió a montarse (la fila de una sesión, el
// botón de renombrar). Espera un frame: el nodo recién existe después del render.
function enfocar(selector) {
  requestAnimationFrame(() => document.querySelector(selector)?.focus());
}

function ClaseEnVivo({ horario }) {
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimeoutRef = useRef(null);
  // Byte hasta el que ya se leyó el transcript de la sesión en curso.
  const byteRef = useRef(0);
  const [cargando, setCargando] = useState(true);
  const [diagnostico, setDiagnostico] = useState(null);
  const [estado, setEstado] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [modelo, setModelo] = useState('small');
  const [conPantalla, setConPantalla] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const [guardandoPython, setGuardandoPython] = useState(false);
  const [modeloFino, setModeloFino] = useState('medium');
  const [retranscribiendo, setRetranscribiendo] = useState(null);
  const [avanceFino, setAvanceFino] = useState(0);

  // Antes de arrancar: título libre + materia, que por default sigue la
  // detección del horario (`__auto__`) y se puede pisar.
  const [tituloNuevo, setTituloNuevo] = useState('');
  const [materiaSeleccion, setMateriaSeleccion] = useState('__auto__');

  // null = lista; id = detalle abierto.
  const [detalleId, setDetalleId] = useState(null);
  const ultimaAbiertaRef = useRef(null);
  const [transcriptAbierta, setTranscriptAbierta] = useState([]);
  const [cargandoTranscript, setCargandoTranscript] = useState(false);
  const [capturas, setCapturas] = useState([]);
  const [cargandoCapturas, setCargandoCapturas] = useState(false);

  // Una sola edición de título/materia a la vez: fila de la lista, detalle o
  // panel en vivo.
  const [editandoId, setEditandoId] = useState(null);
  const [tituloEdit, setTituloEdit] = useState('');
  const [materiaEdit, setMateriaEdit] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [eliminandoId, setEliminandoId] = useState(null);
  const [borrando, setBorrando] = useState(false);

  const [uniendoId, setUniendoId] = useState(null);
  const [candidatoBase, setCandidatoBase] = useState('');
  const [fusionando, setFusionando] = useState(false);

  const [exportando, setExportando] = useState(false);

  const api = window.scraperApp?.clase;
  const materiasDisponibles = useMemo(() => materiasUnicas(horario?.materias), [horario]);
  const opcionesNueva = useMemo(() => opcionesMateria(materiasDisponibles), [materiasDisponibles]);

  const showToast = useCallback((mensaje) => {
    clearTimeout(toastTimeoutRef.current);
    setToast(mensaje);
    toastTimeoutRef.current = setTimeout(() => setToast(''), 4000);
  }, []);

  // Las acciones de gestión viven en main/preload y solo existen después de
  // reiniciar la app: main.js no se recarga en caliente. Sin este guard, usarlas
  // contra un Electron viejo tira un TypeError crudo en vez de explicar qué hacer.
  const avisarSiFalta = useCallback((fn) => {
    if (typeof fn === 'function') return false;
    showToast('Reiniciá DVPotro para usar esto: son cambios del proceso principal.');
    return true;
  }, [showToast]);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  const refrescar = useCallback(async () => {
    if (!api) {
      setError('Esta versión de DVPotro no expone el módulo de clase. Reiniciá la app.');
      setCargando(false);
      return;
    }

    try {
      const [diag, est, ses] = await Promise.all([api.diagnostico(), api.estado(), api.sesiones()]);
      setDiagnostico(diag);
      setEstado(est);
      setSesiones(ses.sesiones || []);
      setError(null);
    } catch (problema) {
      setError(problema?.message || 'No se pudo leer el estado de la grabación.');
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  // Mientras graba, el transcript crece en disco y se pide cada 5 s SOLO LO
  // NUEVO, por offset de bytes. Una clase de dos horas deja ~1.750 líneas:
  // releerlas en cada uno de los ~1.440 refrescos era el único costo que crecía
  // con la duración de la clase, y se notaba justo al final, cuando dictan la tarea.
  useEffect(() => {
    if (!estado?.grabando || !api) return undefined;

    let vivo = true;

    const tick = async () => {
      try {
        const [respuesta, est] = await Promise.all([
          api.transcript(estado.id, { desdeByte: byteRef.current }),
          api.estado(),
        ]);

        if (!vivo) return;

        if (respuesta.ok) {
          byteRef.current = respuesta.siguienteByte ?? byteRef.current;

          // `reiniciado` llega cuando el archivo se reemplazó entero — lo hace la
          // re-transcripción. Ahí no se puede concatenar: se reemplaza.
          if (respuesta.reiniciado) setLineas(respuesta.lineas);
          else if (respuesta.lineas.length) setLineas((previas) => previas.concat(respuesta.lineas));
        }

        setEstado(est);
      } catch (problema) {
        // Un tick fallido no rompe la grabación, que corre en otro proceso.
        console.warn('[clase] no se pudo refrescar:', problema?.message);
      }
    };

    tick();
    const intervalo = setInterval(tick, 5000);

    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [api, estado?.grabando, estado?.id]);

  useEffect(() => {
    if (!api) return undefined;

    return api.onEvento((evento) => {
      if (evento.evt === 'retranscribiendo') {
        setAvanceFino(evento.avance || 0);
        return;
      }

      if (evento.evt === 'error' || evento.evt === 'cerrado') {
        refrescar();
      }
    });
  }, [api, refrescar]);

  // Si la sesión abierta deja de existir (se borró, o se unió a otra y la otra
  // quedó como base), el detalle vuelve a la lista en vez de quedar vacío.
  useEffect(() => {
    if (!detalleId || cargando) return;
    if (!sesiones.some((sesion) => sesion.id === detalleId)) setDetalleId(null);
  }, [detalleId, sesiones, cargando]);

  // Al volver a la lista, el foco regresa a la fila que se había abierto.
  useEffect(() => {
    if (detalleId || !ultimaAbiertaRef.current) return;
    enfocar(`[data-sesion-id="${CSS.escape(ultimaAbiertaRef.current)}"]`);
    ultimaAbiertaRef.current = null;
  }, [detalleId]);

  const iniciar = async () => {
    setIniciando(true);

    try {
      const materiaElegida = materiaSeleccion === '__auto__'
        ? undefined
        : opcionesNueva.find((opcion) => opcion.valor === materiaSeleccion)?.materia || null;

      const respuesta = await api.iniciar({
        modelo,
        conPantalla,
        materia: materiaElegida,
        titulo: tituloNuevo.trim() || undefined,
      });

      if (!respuesta.ok) {
        showToast(respuesta.error);
        return;
      }

      setLineas([]);
      byteRef.current = 0;
      setTituloNuevo('');
      setMateriaSeleccion('__auto__');
      await refrescar();
      showToast(`Grabando ${respuesta.titulo || respuesta.materia?.nombre || 'la clase'}.`);
    } catch (problema) {
      showToast(problema?.message || 'No se pudo arrancar la grabación.');
    } finally {
      setIniciando(false);
    }
  };

  const detener = async () => {
    setDeteniendo(true);

    try {
      const respuesta = await api.detener();

      if (!respuesta.ok) {
        showToast(respuesta.error);
        return;
      }

      await refrescar();
      showToast('Clase guardada y transcrita.');
    } catch (problema) {
      showToast(problema?.message || 'No se pudo detener la grabación.');
    } finally {
      setDeteniendo(false);
    }
  };

  const guardarPython = async (ruta) => {
    setGuardandoPython(true);

    try {
      await api.setPython(ruta.trim());
      await refrescar();
    } catch (problema) {
      showToast(problema?.message || 'No se pudo guardar la ruta.');
    } finally {
      setGuardandoPython(false);
    }
  };

  const retranscribir = async (id) => {
    setRetranscribiendo(id);
    setAvanceFino(0);

    try {
      const respuesta = await api.retranscribir(id, modeloFino);

      if (!respuesta.ok) {
        showToast(respuesta.error);
        return;
      }

      showToast(`Reprocesada con ${modeloFino}: ${respuesta.segmentos} segmentos en ${Math.round(respuesta.demora)} s.`);
      await refrescar();
      // El archivo se reemplazó entero: hay que releerlo desde cero.
      const nueva = await api.transcript(id);
      setTranscriptAbierta(nueva.ok ? nueva.lineas : []);
    } catch (problema) {
      showToast(problema?.message || 'No se pudo volver a transcribir.');
    } finally {
      setRetranscribiendo(null);
      setAvanceFino(0);
    }
  };

  const abrirDetalle = async (id) => {
    setDetalleId(id);
    setEditandoId(null);
    setTranscriptAbierta([]);
    setCapturas([]);
    setCargandoTranscript(true);
    setCargandoCapturas(true);

    try {
      const [transcriptRes, capturasRes] = await Promise.all([
        api.transcript(id),
        typeof api.capturas === 'function' ? api.capturas(id) : Promise.resolve({ ok: true, capturas: [] }),
      ]);
      setTranscriptAbierta(transcriptRes.ok ? transcriptRes.lineas : []);
      setCapturas(capturasRes.ok ? capturasRes.capturas : []);
    } catch (problema) {
      showToast(problema?.message || 'No se pudo leer la sesión.');
    } finally {
      setCargandoTranscript(false);
      setCargandoCapturas(false);
    }
  };

  const volverAlHistorial = () => {
    ultimaAbiertaRef.current = detalleId;
    setDetalleId(null);
    setEditandoId(null);
    setTranscriptAbierta([]);
    setCapturas([]);
  };

  const empezarEdicion = (sesion) => {
    setEditandoId(sesion.id);
    setTituloEdit(sesion.titulo || '');
    setMateriaEdit(claveMateria(sesion.materia));
  };

  const terminarEdicion = (id) => {
    setEditandoId(null);
    enfocar(`[data-editar-id="${CSS.escape(id)}"]`);
  };

  const sesionEditando = editandoId
    ? sesiones.find((sesion) => sesion.id === editandoId) || (estado?.id === editandoId ? estado : null)
    : null;
  const opcionesEdicion = useMemo(
    () => opcionesMateria(materiasDisponibles, sesionEditando?.materia),
    [materiasDisponibles, sesionEditando?.materia],
  );

  const guardarEdicion = async () => {
    if (avisarSiFalta(api?.actualizarMeta)) return;

    const id = editandoId;
    setGuardandoEdicion(true);

    try {
      const materiaElegida = materiaEdit === ''
        ? null
        : opcionesEdicion.find((opcion) => opcion.valor === materiaEdit)?.materia || null;

      const respuesta = await api.actualizarMeta(id, { titulo: tituloEdit.trim() || null, materia: materiaElegida });

      if (!respuesta.ok) {
        showToast(respuesta.error);
        return;
      }

      await refrescar();
      terminarEdicion(id);
      showToast('Cambios guardados.');
    } catch (problema) {
      showToast(problema?.message || 'No se pudo guardar.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const edicionProps = {
    titulo: tituloEdit,
    materia: materiaEdit,
    opciones: opcionesEdicion,
    onCambiarTitulo: setTituloEdit,
    onCambiarMateria: setMateriaEdit,
    onGuardar: guardarEdicion,
    onCancelar: () => terminarEdicion(editandoId),
    guardando: guardandoEdicion,
  };

  const pedirBorrado = (sesion) => setEliminandoId(sesion.id);
  const cancelarBorrado = () => setEliminandoId(null);

  const confirmarBorrado = async () => {
    if (avisarSiFalta(api?.eliminar)) return;

    setBorrando(true);

    try {
      const respuesta = await api.eliminar(eliminandoId);

      if (!respuesta.ok) {
        showToast(respuesta.error);
        return;
      }

      if (detalleId === eliminandoId) {
        setDetalleId(null);
        setTranscriptAbierta([]);
        setCapturas([]);
      }

      setEliminandoId(null);
      await refrescar();
      showToast('Sesión eliminada.');
    } catch (problema) {
      showToast(problema?.message || 'No se pudo eliminar.');
    } finally {
      setBorrando(false);
    }
  };

  // `baseId` llega cuando la unión sale de la sugerencia de la lista, que ya sabe
  // con cuál; si no, se preselecciona la sesión terminada más cercana que arrancó
  // antes — el caso típico de "se cortó por un receso".
  const pedirUnion = (sesion, baseId = null) => {
    setUniendoId(sesion.id);

    if (baseId) {
      setCandidatoBase(baseId);
      return;
    }

    const anteriores = sesiones
      .filter((s) => s.id !== sesion.id && s.estado !== 'grabando' && s.inicio < sesion.inicio)
      .sort((a, b) => b.inicio - a.inicio);

    setCandidatoBase(anteriores[0]?.id || '');
  };

  const cancelarUnion = () => {
    setUniendoId(null);
    setCandidatoBase('');
  };

  const confirmarUnion = async () => {
    if (avisarSiFalta(api?.fusionar)) return;
    if (!candidatoBase) {
      showToast('Elegí con cuál sesión unirla.');
      return;
    }

    setFusionando(true);

    try {
      const sesionExtra = sesiones.find((s) => s.id === uniendoId);
      const sesionBase = sesiones.find((s) => s.id === candidatoBase);

      if (!sesionExtra || !sesionBase) {
        showToast('Una de las dos sesiones ya no existe.');
        return;
      }

      // La que arrancó antes es la base, sin importar desde cuál fila se pidió.
      const [base, extra] = sesionBase.inicio < sesionExtra.inicio
        ? [sesionBase.id, sesionExtra.id]
        : [sesionExtra.id, sesionBase.id];

      const respuesta = await api.fusionar(base, extra);

      if (!respuesta.ok) {
        showToast(respuesta.error);
        return;
      }

      cancelarUnion();
      await refrescar();

      // El detalle abierto (de cualquiera de las dos) se recarga desde la base:
      // su transcripción y sus capturas acaban de crecer.
      if (detalleId === base || detalleId === extra) await abrirDetalle(base);

      showToast('Sesiones unidas.');
    } catch (problema) {
      showToast(problema?.message || 'No se pudo unir.');
    } finally {
      setFusionando(false);
    }
  };

  const exportar = async (id, formato) => {
    if (avisarSiFalta(api?.exportar)) return;

    setExportando(true);

    try {
      const respuesta = await api.exportar(id, formato);

      if (!respuesta.ok) {
        if (!respuesta.cancelado) showToast(respuesta.error);
        return;
      }

      showToast(`Exportado a ${respuesta.path}`);
    } catch (problema) {
      showToast(problema?.message || 'No se pudo exportar.');
    } finally {
      setExportando(false);
    }
  };

  if (error) {
    return (
      <Panel role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--error-text)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--error-text)' }}>{error}</p>
        </div>
      </Panel>
    );
  }

  if (cargando) {
    return (
      <Panel>
        <p className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }} role="status">
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} aria-hidden="true" />
          Buscando el motor de transcripción...
        </p>
      </Panel>
    );
  }

  // La sesión en curso ya se ve completa en el panel en vivo: listarla también
  // en el historial duplicaría la fila y dejaría borrar/unir algo que se está
  // grabando en ese instante.
  const historialSesiones = estado.grabando ? sesiones.filter((s) => s.id !== estado.id) : sesiones;
  const sesionEliminando = sesiones.find((s) => s.id === eliminandoId) || null;
  const candidatosUnion = uniendoId
    ? sesiones.filter((s) => s.id !== uniendoId && s.estado !== 'grabando')
    : [];
  const sesionDetalle = detalleId ? sesiones.find((s) => s.id === detalleId) || null : null;
  const hayOtrasSesiones = detalleId
    ? sesiones.some((s) => s.id !== detalleId && s.estado !== 'grabando')
    : false;

  // Python sin configurar solo bloquea EMPEZAR a grabar: lo ya grabado se sigue
  // pudiendo abrir, renombrar, unir, exportar o borrar.
  const faltaSetup = !diagnostico.listo && !estado.grabando;

  // Con una sesión abierta, el panel para grabar se aparta: una cosa a la vez.
  // Lo que se está grabando, en cambio, no se esconde nunca.
  const panelSuperior = (() => {
    if (estado.grabando) {
      return (
        <EnVivo
          estado={estado}
          lineas={lineas}
          onDetener={detener}
          deteniendo={deteniendo}
          edicion={{ activa: editandoId === estado.id, props: edicionProps, onEmpezar: () => empezarEdicion(estado) }}
        />
      );
    }

    if (detalleId) return null;

    if (faltaSetup) {
      return <SetupPendiente diagnostico={diagnostico} onGuardarPython={guardarPython} guardando={guardandoPython} />;
    }

    return (
      <NuevaGrabacion
        claseActual={diagnostico.claseActual}
        modelo={modelo}
        onModelo={setModelo}
        conPantalla={conPantalla}
        onConPantalla={setConPantalla}
        onIniciar={iniciar}
        iniciando={iniciando}
        titulo={tituloNuevo}
        onTitulo={setTituloNuevo}
        materiaSeleccion={materiaSeleccion}
        onMateriaSeleccion={setMateriaSeleccion}
        opciones={opcionesNueva}
      />
    );
  })();

  return (
    <div className="space-y-6">
      {panelSuperior}

      {detalleId ? (
        <SesionDetalle
          sesion={sesionDetalle}
          transcript={transcriptAbierta}
          cargando={cargandoTranscript}
          capturas={capturas}
          cargandoCapturas={cargandoCapturas}
          onVolver={volverAlHistorial}
          onPedirBorrado={pedirBorrado}
          onPedirUnion={pedirUnion}
          hayOtrasSesiones={hayOtrasSesiones}
          edicion={{ activa: editandoId === detalleId, props: edicionProps }}
          onEmpezarEdicion={empezarEdicion}
          modeloFino={modeloFino}
          onModeloFino={setModeloFino}
          onRetranscribir={retranscribir}
          retranscribiendo={retranscribiendo}
          avanceFino={avanceFino}
          onExportar={exportar}
          exportando={exportando}
        />
      ) : (
        <Historial
          sesiones={historialSesiones}
          editandoId={editandoId}
          edicionProps={edicionProps}
          onEmpezarEdicion={empezarEdicion}
          onAbrir={abrirDetalle}
          onPedirBorrado={pedirBorrado}
          onPedirUnion={pedirUnion}
        />
      )}

      <Toast mensaje={toast} />

      {eliminandoId ? (
        <ConfirmModal
          titulo={`Eliminar «${etiquetaSesion(sesionEliminando)}»`}
          descripcion="Se borran el audio, la transcripción y las capturas de pantalla de esta sesión."
          textoConfirmar="Eliminar"
          peligroso
          procesando={borrando}
          onConfirmar={confirmarBorrado}
          onCancelar={cancelarBorrado}
        />
      ) : null}

      {uniendoId ? (
        <ConfirmModal
          titulo={`Unir «${etiquetaSesion(sesiones.find((s) => s.id === uniendoId))}»`}
          descripcion="La que empezó después se agrega al final de la que empezó antes, con el desfasaje de reloj correcto: transcripción, capturas y audio. La de después se borra recién cuando la unión terminó bien."
          textoConfirmar="Unir"
          procesando={fusionando}
          deshabilitado={!candidatoBase}
          onConfirmar={confirmarUnion}
          onCancelar={cancelarUnion}
        >
          <Rotulo as="label" htmlFor="clase-unir-con">Unir con</Rotulo>
          <select
            id="clase-unir-con"
            className="field mt-2 w-full px-3 py-1.5 text-sm"
            value={candidatoBase}
            onChange={(event) => setCandidatoBase(event.target.value)}
            data-autofocus
          >
            <option value="">Elegí una sesión...</option>
            {candidatosUnion.map((s) => (
              <option key={s.id} value={s.id}>
                {etiquetaSesion(s)} · {fechaLegible(s.inicio)}
              </option>
            ))}
          </select>
        </ConfirmModal>
      ) : null}
    </div>
  );
}

export default ClaseEnVivo;
