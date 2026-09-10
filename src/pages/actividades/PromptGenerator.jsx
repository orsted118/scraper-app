import { Check, ChevronDown, Copy, ListPlus, Sparkles, Wand2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Generador de prompts de la card: junta todo lo que la app sabe de la actividad
// (consigna, adjuntos del profe con su texto, material de la materia) y pide a
// una LLM free tier que redacte un prompt para llevarle a otra IA.
const api = () => (typeof window !== 'undefined' ? window.scraperApp : null);

const ERROR_COPY = {
  NO_BACKEND: 'No hay IA configurada. Agregá una key al .env.',
  ALL_FAILED: 'La IA no respondió. Puede ser límite de cuota: probá en un rato.',
  BACKEND_FAILED: 'Ese modelo no respondió. Probá con otro o volvé a Automático.',
  BACKEND_UNAVAILABLE: 'Ese modelo ya no está configurado.',
  EMPTY_RESULT: 'El modelo devolvió un prompt vacío. Probá con otro.',
  NO_ACTIVITY: 'Falta información de la actividad.',
};

// El modelo guardado se comparte con el de mejorar notas: es la misma decisión
// ("con qué LLM redacto"), y tener dos preferencias distintas confundiría.
const MODEL_KEY = 'dvpotro-improve-model';

function readStoredModel() {
  try {
    return window.localStorage.getItem(MODEL_KEY) || null;
  } catch (_error) {
    return null;
  }
}

// Las especificaciones se guardan POR ACTIVIDAD: son aclaraciones de esa
// consigna puntual ("el profe dijo en clase que...", "usá Java 17"), no una
// preferencia global. Viven en localStorage y no en el main porque son del
// alumno y no valen un canal IPC ni un archivo propio.
const SPECS_KEY = 'dvpotro-prompt-specs';

function readStoredSpecs(activityId) {
  if (!activityId) return '';

  try {
    return window.localStorage.getItem(`${SPECS_KEY}::${activityId}`) || '';
  } catch (_error) {
    return '';
  }
}

function writeStoredSpecs(activityId, value) {
  if (!activityId) return;

  try {
    if (value.trim()) {
      window.localStorage.setItem(`${SPECS_KEY}::${activityId}`, value);
      return;
    }

    window.localStorage.removeItem(`${SPECS_KEY}::${activityId}`);
  } catch (_error) {
    // Sin localStorage las especificaciones sirven igual para esta generación;
    // sólo no sobreviven a cerrar la card.
  }
}

const PROGRESS_COPY = {
  contexto: 'Reuniendo el contexto…',
  adjuntos: 'Leyendo los documentos del profesor…',
  generando: 'Redactando el prompt…',
};

function PromptGenerator({ activity }) {
  const [open, setOpen] = useState(false);
  const [modes, setModes] = useState([]);
  const [modo, setModo] = useState('resolver');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [specs, setSpecs] = useState('');
  const [showSpecs, setShowSpecs] = useState(false);
  // Lo que efectivamente se usó para buscar en caché. Se separa de `specs` para
  // no disparar una consulta IPC en cada tecla del textarea.
  const [appliedSpecs, setAppliedSpecs] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    (async () => {
      const result = await api()?.prompt?.modes?.();
      if (result?.ok) {
        setModes(result.modes);
        setModo((current) => current || result.defaultMode);
      }
    })();

    return undefined;
  }, [open]);

  useEffect(() => {
    const guardadas = readStoredSpecs(activity?.id);
    setSpecs(guardadas);
    setAppliedSpecs(guardadas);
  }, [activity?.id]);

  // El textarea escribe en cada tecla; la búsqueda en caché sólo necesita el
  // valor cuando el alumno frenó de tipear.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSpecs(specs), 400);
    return () => clearTimeout(timer);
  }, [specs]);

  // Sólo Escape, sin "cerrar al clickear afuera".
  //
  // El panel NO es un popover flotante: vive en el flujo del contenido. Tuvo que
  // dejar de ser `position: absolute` porque la card anima su altura con
  // `overflow: hidden`, y ese overflow recortaba el panel entero — abría en el
  // DOM y no se veía nada en pantalla.
  //
  // Estando en flujo, cerrarlo al clickear afuera sería hostil: se cerraría al
  // tocar el propio textarea o el botón de generar.
  useEffect(() => {
    if (!showSpecs) return undefined;

    const cerrarConEsc = (event) => {
      if (event.key === 'Escape') setShowSpecs(false);
    };

    document.addEventListener('keydown', cerrarConEsc);
    return () => document.removeEventListener('keydown', cerrarConEsc);
  }, [showSpecs]);

  // Un prompt ya generado se guarda: al reabrir la card no hay que esperar de
  // nuevo ni gastar otra request del pool.
  useEffect(() => {
    if (!open) return undefined;

    (async () => {
      const cached = await api()?.prompt?.getCached?.(activity?.id, modo, appliedSpecs);
      setResult(cached?.ok ? cached.data : null);
      setError('');
    })();

    return undefined;
  }, [open, activity?.id, modo, appliedSpecs]);

  // El contexto baja y parsea los adjuntos: sin progreso son ~10s de silencio.
  useEffect(() => api()?.prompt?.onProgress?.(setProgress), []);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const generate = async (force = false) => {
    setLoading(true);
    setError('');
    setProgress(null);

    try {
      const bridge = api()?.prompt;

      // La app pudo quedar corriendo desde antes de que existiera el canal.
      if (!bridge?.generate) {
        setError('La app no expone el generador de prompts. Reiniciá DVPotro.');
        return;
      }

      const response = await bridge.generate({
        activity,
        modo,
        backend: readStoredModel(),
        force,
        especificaciones: specs,
      });

      if (!response?.ok) {
        setError(ERROR_COPY[response?.error] || response?.message || 'No fue posible generar el prompt.');
        return;
      }

      setResult(response);
    } catch (bridgeError) {
      // `ipcRenderer.invoke` rechaza si el canal no tiene handler en el main;
      // sin catch el spinner se apagaba sin decir nada.
      setError(`No fue posible generar el prompt: ${bridgeError?.message || bridgeError}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const copy = async () => {
    if (!result?.prompt) return;

    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopied(true);
    } catch (_error) {
      // Sin permiso de portapapeles queda el fallback de seleccionar a mano.
      textareaRef.current?.select();
    }
  };

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        type="button"
        onClick={() => setOpen((visible) => !visible)}
        // El click derecho también entra por acá. Este encabezado es lo ÚNICO
        // que se ve con la sección cerrada, así que es donde el alumno lo
        // intenta: tenerlo sólo en el botón de adentro hacía que la función
        // pareciera rota hasta desplegar la sección.
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
          setShowSpecs(true);
        }}
        title="Click derecho para agregar especificaciones al prompt"
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-strong)' }}>
          <Wand2 className="h-4 w-4" strokeWidth={1.5} />
          Generar prompt para IA
          {specs.trim() ? (
            <ListPlus className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
          style={{ color: 'var(--text-muted)' }}
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setModo(item.id)}
                className="border px-2.5 py-1 text-[11px]"
                style={{
                  borderColor: modo === item.id ? 'var(--accent)' : 'var(--border-subtle)',
                  color: modo === item.id ? 'var(--accent)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-badge, 0px)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error ? (
            <p className="text-xs" style={{ color: 'var(--error-text)' }}>
              {error}
            </p>
          ) : null}

          {result?.prompt ? (
            <>
              <textarea
                ref={textareaRef}
                readOnly
                value={result.prompt}
                rows={10}
                className="w-full resize-y border p-3 text-xs leading-5"
                style={{
                  borderColor: 'var(--border-normal)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-normal)',
                  borderRadius: 'var(--radius-button, 0px)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              />

              {/* De qué se alimentó: sin esto no hay forma de saber si el prompt
                  llegó a leer los documentos del profe o los ignoró. */}
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {result.backend ? `${result.backend} · ` : ''}
                {result.fuentes?.adjuntosLeidos?.length > 0
                  ? `${result.fuentes.adjuntosLeidos.length} documento(s) leído(s)`
                  : 'sin documentos adjuntos'}
                {result.fuentes?.adjuntosOmitidos?.length > 0
                  ? ` · ${result.fuentes.adjuntosOmitidos.length} no legible(s)`
                  : ''}
                {result.fuentes?.materialTitulos > 0 ? ` · ${result.fuentes.materialTitulos} recurso(s) de la materia` : ''}
              </p>
            </>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => generate(Boolean(result))}
              // Click derecho abre las especificaciones, igual que el botón de
              // mejorar notas abre ahí su selector de modelo.
              onContextMenu={(event) => {
                event.preventDefault();
                setShowSpecs((visible) => !visible);
              }}
              disabled={loading}
              title={
                specs.trim()
                  ? 'Click derecho para editar tus especificaciones'
                  : 'Click derecho para agregar especificaciones'
              }
              className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{
                // El borde de acento es la única señal de que hay
                // especificaciones cargadas: sin esto el alumno no sabe que el
                // prompt va a salir distinto al de la vez pasada.
                borderColor: specs.trim() ? 'var(--accent)' : 'var(--border-normal)',
                color: 'var(--text-normal)',
                borderRadius: 'var(--radius-button, 0px)',
              }}
            >
              <Sparkles className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
              {loading
                ? PROGRESS_COPY[progress?.fase] || 'Generando…'
                : result
                  ? 'Regenerar'
                  : 'Generar prompt'}
              {specs.trim() ? (
                <ListPlus className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
              ) : null}
            </button>


            {result?.prompt ? (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: 'var(--border-normal)', color: copied ? 'var(--success-text)' : 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            ) : null}
          </div>

          {showSpecs ? (
            <div
              role="dialog"
              aria-label="Especificaciones"
              className="w-full max-w-lg border p-3"
              style={{
                borderColor: 'var(--border-normal)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-card, 0px)',
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--text-strong)' }}
                >
                  Especificaciones
                </span>
                <button
                  type="button"
                  onClick={() => setShowSpecs(false)}
                  aria-label="Cerrar"
                  className="p-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>

              <p className="mb-2 text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>
                Lo que la consigna no dice y el prompt debería incluir. Se suma a las
                instrucciones, la rúbrica y el material que ya se mandan.
              </p>

              <textarea
                value={specs}
                onChange={(event) => {
                  setSpecs(event.target.value);
                  writeStoredSpecs(activity?.id, event.target.value);
                }}
                rows={5}
                maxLength={2000}
                placeholder={'Ejemplos:\nEl profe dijo en clase que la portada va sin logo.\nUsar Java 17 y sin librerías externas.\nEntregarlo en una sola cuartilla.'}
                className="w-full resize-y border p-2 text-xs leading-5"
                style={{
                  borderColor: 'var(--border-normal)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-normal)',
                  borderRadius: 'var(--radius-button, 0px)',
                  fontFamily: 'var(--font-body, inherit)',
                }}
              />

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {specs.length}/2000
                </span>

                {specs.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSpecs('');
                      writeStoredSpecs(activity?.id, '');
                    }}
                    className="text-[11px] underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Borrar
                  </button>
                ) : null}
              </div>

              {/* Un prompt ya generado se hizo SIN estas especificaciones:
                  decirlo evita que el alumno crea que ya están aplicadas. */}
              {result?.prompt ? (
                <p className="mt-2 text-[10px] leading-4" style={{ color: 'var(--text-muted)' }}>
                  El prompt de arriba no las incluye todavía. Apretá Regenerar.
                </p>
              ) : null}
            </div>
          ) : null}

          {loading && progress?.fase === 'adjuntos' && progress.nombre ? (
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {progress.nombre} ({progress.done + 1}/{progress.total})
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default PromptGenerator;
