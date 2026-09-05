import { Check, ChevronDown, Copy, Sparkles, Wand2 } from 'lucide-react';
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

  // Un prompt ya generado se guarda: al reabrir la card no hay que esperar de
  // nuevo ni gastar otra request del pool.
  useEffect(() => {
    if (!open) return undefined;

    (async () => {
      const cached = await api()?.prompt?.getCached?.(activity?.id, modo);
      setResult(cached?.ok ? cached.data : null);
      setError('');
    })();

    return undefined;
  }, [open, activity?.id, modo]);

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
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-strong)' }}>
          <Wand2 className="h-4 w-4" strokeWidth={1.5} />
          Generar prompt para IA
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
              disabled={loading}
              className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
            >
              <Sparkles className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
              {loading
                ? PROGRESS_COPY[progress?.fase] || 'Generando…'
                : result
                  ? 'Regenerar'
                  : 'Generar prompt'}
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
