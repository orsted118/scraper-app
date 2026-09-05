import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatLastSync } from '../utils/formatLastSync';

// Asistencia de iVirtual, dentro de Horario porque es el módulo de las clases:
// el alumno abre Horario para ver a qué hora entra, y ese es exactamente el
// momento en que se marca.
//
// REGLA QUE NO SE NEGOCIA: acá no se marca nada solo. El registro sale de que
// el usuario apriete el botón Y confirme el estado en el diálogo. Marcar
// asistencia es afirmar que estuviste en clase; automatizarlo sería falsear un
// registro académico.
const api = () => (typeof window !== 'undefined' ? window.scraperApp?.attendance : null);

const MARK_ERROR_COPY = {
  SESSION_CLOSED: 'La sesión ya no acepta registro. Puede haberla cerrado el profesor.',
  PASSWORD_REQUIRED: 'Esta sesión pide la contraseña que dio el profesor.',
  INVALID_SESSION_URL: 'El enlace de la sesión no es válido.',
  NO_CREDENTIALS: 'Configurá tus credenciales de iVirtual en Ajustes.',
  STATUS_NOT_FOUND: 'El portal no ofrece ese estado.',
  SUBMIT_NOT_FOUND: 'El portal cambió el formulario. Registrá desde iVirtual.',
  UNCONFIRMED: 'El portal no confirmó el registro. Revisalo en iVirtual antes de darlo por hecho.',
  PORTAL_REJECTED: 'iVirtual rechazó el registro.',
  MARK_FAILED: 'No fue posible registrar la asistencia.',
};

// El porcentaje es el número que importa: por debajo del umbral se pierde el
// derecho a examen. Se colorea para que se lea de un vistazo.
function percentTone(porcentaje) {
  const value = parseFloat(String(porcentaje || '').replace(',', '.'));
  if (!Number.isFinite(value)) return 'var(--text-muted)';
  if (value >= 90) return 'var(--success-text)';
  if (value >= 80) return 'var(--retrasada-text)';
  return 'var(--error-text)';
}

function AttendancePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  // Sesión que el usuario quiere marcar. Mientras esto es null NO hay ningún
  // camino que escriba en el portal.
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    (async () => {
      const result = await api()?.getCached?.();
      if (result?.ok && result.data) setData(result.data);
    })();
  }, []);

  useEffect(() => api()?.onProgress?.(setProgress), []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const sync = async () => {
    setLoading(true);
    setError('');

    try {
      const bridge = api();

      // Pasa cuando el main todavía no registró el handler: la app quedó
      // corriendo desde antes de que existiera el módulo. Sin este chequeo el
      // invoke rechaza y el error se pierde en el finally.
      if (!bridge?.sync) {
        setError('La app no expone el canal de asistencia. Reiniciá DVPotro.');
        return;
      }

      const result = await bridge.sync();

      if (!result?.ok) {
        setError(result?.error === 'NO_CREDENTIALS'
          ? 'Configurá tus credenciales de iVirtual en Ajustes.'
          : result?.error || 'No fue posible leer la asistencia.');
        return;
      }

      setData(result.data);
      // Confirmación explícita: la asistencia casi nunca cambia entre syncs, así
      // que sin esto una actualización exitosa se ve idéntica a no haber hecho
      // nada y parece que el botón está roto.
      setToast('Asistencia actualizada');
    } catch (bridgeError) {
      // `ipcRenderer.invoke` RECHAZA si el canal no tiene handler en el main.
      // Con try/finally sin catch el spinner se apagaba y no se mostraba nada:
      // exactamente "le doy en actualizar y no pasa nada".
      setError(`No fue posible leer la asistencia: ${bridgeError?.message || bridgeError}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // Paso 1 de 2: se leen del portal los estados que ofrece esa sesión. Todavía
  // no se marca nada.
  const openConfirm = async (materia) => {
    setConfirming({ materia, cargando: true });

    try {
      const result = await api()?.peekOptions?.(materia.sesionAbierta.href);

      if (!result?.ok) {
        setConfirming(null);
        setToast(MARK_ERROR_COPY[result?.error] || 'No fue posible abrir el registro.');
        return;
      }

      setConfirming({
        materia,
        cargando: false,
        opciones: result.opciones,
        pidePassword: result.pidePassword,
        seleccion: result.opciones[0]?.value || null,
        password: '',
      });
    } catch (bridgeError) {
      // Sin esto el diálogo quedaba clavado en "Leyendo la sesión…" para
      // siempre, sin forma de cerrarlo.
      setConfirming(null);
      setToast(`No fue posible abrir el registro: ${bridgeError?.message || bridgeError}`);
    }
  };

  // Paso 2 de 2: acá sí escribe, y sólo con lo que el usuario eligió.
  const confirmMark = async () => {
    const { materia, seleccion, password } = confirming;
    setConfirming((current) => ({ ...current, enviando: true }));

    try {
      const result = await api()?.mark?.({
        url: materia.sesionAbierta.href,
        statusValue: seleccion,
        password: password || null,
      });

      setConfirming(null);

      if (result?.ok) {
        setToast(`Asistencia registrada en ${materia.materia}`);
        await sync();
        return;
      }

      setToast(MARK_ERROR_COPY[result?.error] || result?.message || 'No fue posible registrar la asistencia.');
    } catch (bridgeError) {
      // Acá el silencio es lo peor de todo: el registro pudo haber quedado
      // hecho del otro lado. Se dice que no se sabe, en vez de dar por
      // fracasado algo que capaz sí se asentó.
      setConfirming(null);
      setToast(`No se pudo confirmar el registro: ${bridgeError?.message || bridgeError}. Revisalo en iVirtual.`);
    }
  };

  const materias = data?.materias || [];
  const abiertas = materias.filter((m) => m.sesionAbierta);

  return (
    <div
      className="border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          <h4 className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-strong)' }}>
            Asistencia
          </h4>
          {/* Sin esto no había forma de saber si el botón hizo algo: los datos
              casi nunca cambian entre una lectura y la siguiente. */}
          {data?.timestamp ? (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
              {formatLastSync(data.timestamp)}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={sync}
          disabled={loading}
          className="inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          style={{ borderColor: 'var(--border-normal)', color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          {loading && progress?.curso ? progress.curso.slice(0, 18) : 'Actualizar'}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-xs" style={{ color: 'var(--error-text)' }}>
          {error}
        </p>
      ) : null}

      {/* Una sesión abierta es urgente y efímera: se avisa arriba de todo. */}
      {abiertas.length > 0 ? (
        <div
          className="mt-4 border px-3 py-3"
          style={{ borderColor: 'var(--accent)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-button, 0px)' }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>
            {abiertas.length === 1 ? 'Hay una sesión abierta para registrarte' : `${abiertas.length} sesiones abiertas`}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {abiertas.map((materia) => (
              <button
                key={materia.cursoId}
                type="button"
                onClick={() => openConfirm(materia)}
                className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                Registrar en {materia.materia}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {materias.length === 0 ? (
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          {data ? 'Ninguna materia lleva asistencia por iVirtual.' : 'Actualizá para ver tu asistencia por materia.'}
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {materias.map((materia) => {
            const pendientes = materia.sesiones.filter((s) => s.pendiente).length;

            return (
              <div
                key={materia.cursoId}
                className="flex items-center justify-between gap-3 border px-3 py-2.5"
                style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm" style={{ color: 'var(--text-normal)' }}>
                    {materia.materia}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {materia.resumen.tomadas || 0} sesión(es) tomada(s)
                    {materia.resumen.puntos ? ` · ${materia.resumen.puntos} pts` : ''}
                    {pendientes > 0 ? ` · ${pendientes} sin tomar` : ''}
                    {/* Vale decirlo aunque ahora no haya sesión: explica por qué
                        a veces aparece el botón y a veces no. */}
                    {materia.permiteAutoRegistro ? ' · permite auto-registro' : ''}
                  </p>
                </div>

                <span
                  className="shrink-0 text-sm font-semibold"
                  style={{ color: percentTone(materia.resumen.porcentaje), fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {materia.resumen.porcentaje || '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {confirming ? (
        <ConfirmDialog
          state={confirming}
          onChange={setConfirming}
          onCancel={() => setConfirming(null)}
          onConfirm={confirmMark}
        />
      ) : null}

      {toast ? (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-xs"
          style={{ color: 'var(--text-normal)' }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {toast}
        </p>
      ) : null}
    </div>
  );
}

// Confirmación explícita. No es ceremonia: el usuario elige CON QUÉ ESTADO se
// marca, y el aviso deja claro que esto escribe en su registro académico.
function ConfirmDialog({ state, onChange, onCancel, onConfirm }) {
  const { materia, cargando, opciones = [], pidePassword, seleccion, password, enviando } = state;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar registro de asistencia"
        className="w-full max-w-sm border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
      >
        <h5 className="text-sm font-bold" style={{ color: 'var(--text-strong)' }}>
          Registrar asistencia
        </h5>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {materia.materia}
        </p>

        {cargando ? (
          <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            Leyendo la sesión en iVirtual…
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-1.5">
              {opciones.map((opcion) => (
                <label key={opcion.value} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-normal)' }}>
                  <input
                    type="radio"
                    name="attendance-status"
                    checked={seleccion === opcion.value}
                    onChange={() => onChange({ ...state, seleccion: opcion.value })}
                  />
                  {opcion.label}
                </label>
              ))}
            </div>

            {pidePassword ? (
              <input
                type="text"
                value={password || ''}
                onChange={(event) => onChange({ ...state, password: event.target.value })}
                placeholder="Contraseña de la sesión"
                className="mt-3 w-full border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-secondary)', color: 'var(--text-normal)', borderRadius: 'var(--radius-button, 0px)' }}
              />
            ) : null}

            <p className="mt-3 flex items-start gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
              Esto queda asentado en tu registro de asistencia de iVirtual.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="border px-3 py-1.5 text-xs"
                style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={enviando || !seleccion}
                className="btn-primary px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                {enviando ? 'Registrando…' : 'Registrar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AttendancePanel;
