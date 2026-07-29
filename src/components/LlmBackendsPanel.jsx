import { AlertTriangle, ChevronRight, Circle, Loader2, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { EASE } from '../utils/motion';

// Mínimo de llamadas por combinación (backend, task) para que una sugerencia
// signifique algo. Con menos, una racha de suerte manda al primer puesto a un
// backend que en realidad es peor.
const MIN_SAMPLES_FOR_SUGGESTION = 20;
// Diferencia de tasa de éxito por debajo de la cual no vale la pena sugerir un
// cambio: mover el orden por un punto porcentual es ruido, no señal.
const MIN_SUCCESS_GAP = 0.05;

function formatMs(value) {
  if (!Number.isFinite(value)) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

// El error crudo del proveedor trae el JSON entero. Para la lista alcanza con
// la primera línea legible.
function shortenError(message) {
  return String(message || '')
    .replace(/\s+/g, ' ')
    .slice(0, 110);
}

function StatusDot({ state }) {
  if (state === 'ok') {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--success-text)' }} />;
  }
  if (state === 'fail') {
    return <XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--error-text)' }} />;
  }
  return <Circle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />;
}

function Expander({ open, onToggle, label, right, children, reduced }) {
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="row-hover flex w-full items-center gap-3 py-2.5 text-left"
      >
        {/* rotate de framer, no `rotate-*` de Tailwind: motion escribe transform
            inline y pisaría la clase. */}
        <motion.span
          className="inline-flex shrink-0"
          animate={reduced ? {} : { rotate: open ? 90 : 0 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
          style={reduced && open ? { transform: 'rotate(90deg)' } : undefined}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </motion.span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {label}
        </span>
        {right}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            // Las tres fases declaran height Y opacity.
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-3 pl-7">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LlmBackendsPanel() {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const reduced = useReducedMotion();

  const [order, setOrder] = useState(null);
  const [probe, setProbe] = useState(null);
  const [probing, setProbing] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState('');
  const [openBackend, setOpenBackend] = useState(null);
  const [showHandlers, setShowHandlers] = useState(false);
  const [includeProbe, setIncludeProbe] = useState(false);

  const loadStats = useCallback(async (withProbe) => {
    if (!api?.llm?.usageStats) return;
    setLoadingStats(true);
    try {
      const result = await api.llm.usageStats({ days: 7, includeProbe: withProbe });
      if (result?.ok) setStats(result);
      else setError(result?.error || 'No fue posible leer el log de uso.');
    } catch (_error) {
      setError('No fue posible leer el log de uso.');
    } finally {
      setLoadingStats(false);
    }
  }, [api]);

  const runProbe = useCallback(async (force) => {
    if (!api?.llm?.probeAll) return;
    setProbing(true);
    setError('');
    try {
      const result = await api.llm.probeAll({ force });
      if (result?.ok) setProbe(result.results);
      else setError(result?.error || 'No fue posible probar los backends.');
    } catch (_error) {
      setError('No fue posible probar los backends.');
    } finally {
      setProbing(false);
    }
  }, [api]);

  // El probe escribe en el log: releer después deja la tabla al día en vez de
  // mostrar el estado previo a la prueba.
  const probeThenRefresh = useCallback(async (force) => {
    await runProbe(force);
    await loadStats(includeProbe);
  }, [runProbe, loadStats, includeProbe]);

  useEffect(() => {
    if (!api?.llm?.currentOrder) return;
    api.llm.currentOrder().then((result) => {
      if (result?.ok) setOrder(result);
    }).catch(() => {});
    // force:false aprovecha el caché de 30s del main: entrar y salir de Ajustes
    // no vuelve a gastar cuota.
    probeThenRefresh(false);
    // Solo al montar: probeThenRefresh cambia de identidad con includeProbe y
    // re-ejecutar acá dispararía un probe extra por cada toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  if (!api?.llm) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        El diagnóstico de backends solo está disponible dentro de Electron.
      </p>
    );
  }

  // Los slots vienen del main aunque el probe no haya corrido todavía: así la
  // lista se dibuja completa desde el arranque y las keys sin probar salen en
  // gris en vez de desaparecer.
  const slots = order?.slots || [];
  const probeByKey = new Map((probe || []).map((item) => [item.keyEnvVar, item]));
  const backendNames = order?.order?.length
    ? [...order.order, ...[...new Set(slots.map((s) => s.backend))].filter((name) => !order.order.includes(name))]
    : [...new Set(slots.map((s) => s.backend))];

  const probedCount = (probe || []).length;
  const okCount = (probe || []).filter((item) => item.ok).length;

  const byBackend = Object.values(stats?.stats?.byBackend || {}).sort((left, right) => right.count - left.count);
  const byHandlerTask = Object.values(stats?.stats?.byHandlerTask || {})
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  // ── Motor de sugerencia ────────────────────────────────────────
  // Compara, para cada task, el backend con mejor tasa de éxito contra el que
  // el orden actual usa primero. Solo mira combinaciones con muestra suficiente.
  const suggestions = (() => {
    const groups = Object.values(stats?.stats?.byBackendTask || {}).filter(
      (item) => item.count >= MIN_SAMPLES_FOR_SUGGESTION && item.task !== 'probe',
    );
    if (groups.length === 0 || !order?.order?.length) return [];

    const tasks = [...new Set(groups.map((item) => item.task))];
    const out = [];

    for (const task of tasks) {
      const candidates = groups
        .filter((item) => item.task === task)
        .sort((left, right) => (
          right.successRate - left.successRate
          || (left.latencyP50 ?? Infinity) - (right.latencyP50 ?? Infinity)
        ));

      if (candidates.length < 2) continue;

      const best = candidates[0];
      // El "primero actual" es el primero del orden que además tiene datos para
      // este task: comparar contra uno que nunca se usó no diría nada.
      const incumbent = order.order
        .map((name) => candidates.find((item) => item.backend === name))
        .find(Boolean);

      if (!incumbent || incumbent.backend === best.backend) continue;
      if (best.successRate - incumbent.successRate < MIN_SUCCESS_GAP) continue;

      out.push({ task, best, incumbent });
    }

    return out;
  })();

  return (
    <div className="space-y-8">
      {error ? (
        <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--error-text)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {error}
        </p>
      ) : null}

      {/* ── Estado de las keys ─────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
              Estado de las claves
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
              {probedCount > 0 ? `${okCount}/${probedCount} claves respondieron` : `${slots.length} clave(s) configurada(s)`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => probeThenRefresh(true)}
            disabled={probing}
            className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {probing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {probing ? 'Probando...' : 'Probar todas las claves'}
          </button>
        </div>

        {/* Advertencia real y no decorativa: Gemini free tier son 20 requests
            por día y por key. Probar las 16 quema 16 de esas. */}
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Cada prueba gasta una llamada real por clave. En proveedores con cuota diaria chica (Gemini free tier)
          probar seguido agota el saldo del día.
        </p>

        <div className="mt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {backendNames.length === 0 ? (
            <p className="py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              No hay ninguna clave configurada en el archivo .env.
            </p>
          ) : (
            backendNames.map((name, index) => {
              const backendSlots = slots.filter((slot) => slot.backend === name);
              const probed = backendSlots.map((slot) => probeByKey.get(slot.keyEnvVar)).filter(Boolean);
              const ok = probed.filter((item) => item.ok).length;
              const isFirst = order?.order?.[0] === name;

              return (
                <Expander
                  key={name}
                  reduced={reduced}
                  open={openBackend === name}
                  onToggle={() => setOpenBackend((current) => (current === name ? null : name))}
                  label={`${index + 1}. ${name}${isFirst ? ' · preferido' : ''}`}
                  right={(
                    <span
                      className="shrink-0 text-xs"
                      style={{
                        color: probed.length === 0 ? 'var(--text-muted)' : ok === 0 ? 'var(--error-text)' : 'var(--text-normal)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {probed.length === 0 ? `${backendSlots.length} sin probar` : `${ok}/${backendSlots.length} OK`}
                    </span>
                  )}
                >
                  <div className="space-y-1.5">
                    {backendSlots.map((slot) => {
                      const result = probeByKey.get(slot.keyEnvVar);
                      const state = !result ? 'unknown' : result.ok ? 'ok' : 'fail';

                      return (
                        <div key={slot.keyEnvVar} className="flex items-start gap-2.5">
                          <span className="mt-0.5">
                            <StatusDot state={state} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-xs"
                              style={{ color: 'var(--text-normal)', fontFamily: 'var(--font-mono, monospace)' }}
                            >
                              {slot.keyEnvVar}
                              {slot.coolingDown ? ' · en cooldown' : ''}
                            </p>
                            {result?.error ? (
                              <p className="mt-0.5 text-[11px] leading-4" style={{ color: 'var(--error-text)' }}>
                                {shortenError(result.error)}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className="shrink-0 text-[11px]"
                            style={{
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {result?.ok ? formatMs(result.latencyMs) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Expander>
              );
            })
          )}
        </div>

        {order?.override ? (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>LLM_BACKEND={order.override}</span>
            {' '}fuerza a ese proveedor al primer puesto.
          </p>
        ) : null}
      </div>

      {/* ── Uso de los últimos 7 días ──────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
            Uso · últimos 7 días
          </p>
          <div className="flex items-center gap-4">
            {stats?.probeEntries > 0 || includeProbe ? (
              <button
                type="button"
                onClick={() => {
                  const next = !includeProbe;
                  setIncludeProbe(next);
                  loadStats(next);
                }}
                className="text-xs font-medium"
                style={{ color: includeProbe ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {includeProbe ? 'Ocultar pruebas' : 'Incluir pruebas'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => loadStats(includeProbe)}
              disabled={loadingStats}
              className="link-accent text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingStats ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {!includeProbe && stats?.probeEntries > 0 ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {stats.probeEntries} llamada(s) de diagnóstico excluidas del conteo.
          </p>
        ) : null}

        {stats?.stats?.totalEntries === 0 ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Todavía no hay llamadas registradas.
          </p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-xs">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    {['Backend', 'Llamadas', '% éxito', 'P50', 'P95'].map((head, index) => (
                      <th
                        key={head}
                        className={`border-b pb-2 font-semibold uppercase ${index === 0 ? 'text-left' : 'text-right'}`}
                        style={{ borderColor: 'var(--border-subtle)', letterSpacing: '0.1em' }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byBackend.map((row) => (
                    <tr key={row.backend} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="py-2 text-left" style={{ color: 'var(--text-normal)' }}>{row.backend}</td>
                      <td className="py-2 text-right" style={{ color: 'var(--text-normal)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.count}
                      </td>
                      <td
                        className="py-2 text-right"
                        style={{
                          color: row.successRate >= 0.9 ? 'var(--success-text)' : row.successRate < 0.5 ? 'var(--error-text)' : 'var(--text-normal)',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatPercent(row.successRate)}
                      </td>
                      <td className="py-2 text-right" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMs(row.latencyP50)}
                      </td>
                      <td className="py-2 text-right" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMs(row.latencyP95)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <Expander
                reduced={reduced}
                open={showHandlers}
                onToggle={() => setShowHandlers((value) => !value)}
                label="Detalle por función y tarea"
                right={(
                  <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                    top {byHandlerTask.length}
                  </span>
                )}
              >
                <div className="space-y-1.5">
                  {byHandlerTask.map((row) => (
                    <div key={`${row.handler}::${row.task}`} className="flex items-center gap-3 text-xs">
                      <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--text-normal)', fontFamily: 'var(--font-mono, monospace)' }}>
                        {row.handler} · {row.task}
                      </span>
                      <span className="shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                        {row.count} · {formatPercent(row.successRate)} · {formatMs(row.latencyP50)}
                      </span>
                    </div>
                  ))}
                </div>
              </Expander>
            </div>
          </>
        )}

        {stats?.logPath ? (
          <p className="mt-3 break-all text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
            {stats.logPath}
          </p>
        ) : null}
      </div>

      {/* ── Sugerencia de routing ──────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
          Sugerencia de orden
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Basadas en tu historial. No se aplican solas: el orden se cambia editando
          {' '}
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>electron/llm/selector.js</span>
          {' '}a mano.
        </p>

        {suggestions.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Sin datos suficientes para sugerir cambios (mínimo {MIN_SAMPLES_FOR_SUGGESTION} llamadas por combinación de backend y tarea).
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {suggestions.map(({ task, best, incumbent }) => (
              <div
                key={task}
                className="border p-3"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-card, 0px)',
                }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--text-strong)' }}>
                  Tarea <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{task}</span>
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--success-text)' }}>{best.backend}</span>
                  {' '}tiene {formatPercent(best.successRate)} de éxito ({best.count} llamadas, P50 {formatMs(best.latencyP50)})
                  {' '}frente a{' '}
                  <span style={{ color: 'var(--text-normal)' }}>{incumbent.backend}</span>
                  {' '}con {formatPercent(incumbent.successRate)} ({incumbent.count} llamadas, P50 {formatMs(incumbent.latencyP50)}).
                  {' '}Considerá moverlo primero.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LlmBackendsPanel;
