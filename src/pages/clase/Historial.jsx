import { useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';

import { EASE } from '../../utils/motion';
import FilaSesion from './FilaSesion';
import Panel from './Panel';
import Rotulo from './Rotulo';
import {
  agruparPorDia, claveMateria, etiquetaSesion, fechaLegible, incluye, nombreMateria, sugerenciasDeUnion,
} from './formato';

const TODAS = '__todas__';
const SIN_MATERIA = '__sin__';

// Con pocas grabaciones el buscador es ruido: aparece cuando la lista ya no se
// abarca de un vistazo.
const MINIMO_PARA_BUSCAR = 6;

function gruposDeMateria(sesiones) {
  const grupos = new Map();
  let sinMateria = 0;

  for (const sesion of sesiones) {
    const valor = claveMateria(sesion.materia);

    if (!valor) {
      sinMateria += 1;
      continue;
    }

    const grupo = grupos.get(valor) || { valor, nombre: nombreMateria(sesion.materia), cantidad: 0 };
    grupo.cantidad += 1;
    grupos.set(valor, grupo);
  }

  const lista = Array.from(grupos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (sinMateria) lista.push({ valor: SIN_MATERIA, nombre: 'Sin materia', cantidad: sinMateria });
  return lista;
}

export default function Historial({ sesiones, editandoId, edicionProps, onEmpezarEdicion, onAbrir, onPedirBorrado, onPedirUnion }) {
  const [filtro, setFiltro] = useState(TODAS);
  const [busqueda, setBusqueda] = useState('');
  const reduced = useReducedMotion();
  const id = useId();

  const materias = useMemo(() => gruposDeMateria(sesiones), [sesiones]);
  const sugerencias = useMemo(() => sugerenciasDeUnion(sesiones), [sesiones]);

  // Si la materia del filtro deja de existir (se renombró la única sesión que
  // la tenía), el filtro vuelve solo a "Todas" en vez de mostrar una lista vacía
  // sin explicación.
  const filtroVigente = filtro === TODAS || materias.some((m) => m.valor === filtro) ? filtro : TODAS;

  const filtradas = useMemo(() => sesiones.filter((sesion) => {
    const valor = claveMateria(sesion.materia);
    if (filtroVigente === SIN_MATERIA && valor) return false;
    if (filtroVigente !== TODAS && filtroVigente !== SIN_MATERIA && valor !== filtroVigente) return false;
    if (!busqueda.trim()) return true;

    const texto = [etiquetaSesion(sesion), nombreMateria(sesion.materia), sesion.materia?.profesor, fechaLegible(sesion.inicio)]
      .filter(Boolean)
      .join(' ');
    return incluye(texto, busqueda.trim());
  }), [sesiones, filtroVigente, busqueda]);

  const dias = useMemo(() => agruparPorDia(filtradas), [filtradas]);

  const encabezado = (
    <div className="flex items-baseline justify-between gap-3">
      <h3 id={`${id}-titulo`} className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
        Clases grabadas
      </h3>
      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {sesiones.length}
      </span>
    </div>
  );

  if (sesiones.length === 0) {
    return (
      <Panel as="section" aria-labelledby={`${id}-titulo`}>
        {encabezado}
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Todavía no grabaste ninguna clase. Cuando empieces una, aparece acá con su transcripción y sus capturas.
        </p>
      </Panel>
    );
  }

  const conFiltros = materias.length > 1;
  const conBusqueda = sesiones.length >= MINIMO_PARA_BUSCAR;

  return (
    <Panel as="section" aria-labelledby={`${id}-titulo`}>
      {encabezado}

      {conFiltros || conBusqueda ? (
        <div className="mt-4 space-y-3">
          {conFiltros ? (
            <div
              role="group"
              aria-label="Filtrar por materia"
              className="no-scrollbar flex items-end gap-5 overflow-x-auto border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {[{ valor: TODAS, nombre: 'Todas', cantidad: sesiones.length }, ...materias].map(({ valor, nombre, cantidad }) => {
                const activo = valor === filtroVigente;

                return (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={activo}
                    title={nombre}
                    onClick={() => setFiltro(valor)}
                    className={`relative flex shrink-0 items-baseline pb-3 text-xs font-bold uppercase tracking-[0.14em] ${activo ? '' : 'tab-hover'}`}
                    style={{ color: activo ? 'var(--text-strong)' : 'var(--text-muted)' }}
                  >
                    <span className="max-w-[14rem] truncate">{nombre}</span>
                    <span
                      className="ml-1.5"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', color: activo ? 'var(--accent)' : 'inherit' }}
                    >
                      {cantidad}
                    </span>
                    {activo ? (
                      <motion.span
                        layoutId="clase-filtro-underline"
                        className="absolute inset-x-0 -bottom-px block h-0.5"
                        style={{ background: 'var(--accent)' }}
                        transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {conBusqueda ? (
            <div className="field flex items-center gap-2 px-3">
              <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <label htmlFor={`${id}-buscar`} className="sr-only">Buscar entre las clases grabadas</label>
              <input
                id={`${id}-buscar`}
                type="search"
                className="w-full bg-transparent py-1.5 text-sm outline-none"
                style={{ color: 'var(--text-strong)' }}
                placeholder="Buscar por título, materia, profesor o fecha..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {filtradas.length === 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ninguna clase coincide con el filtro.</p>
          <button
            type="button"
            className="btn-outline px-3 py-1 text-xs"
            onClick={() => {
              setFiltro(TODAS);
              setBusqueda('');
            }}
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <div className="mt-2">
          {dias.map((dia) => (
            <section key={dia.clave} aria-labelledby={`${id}-dia-${dia.clave}`} className="mt-4">
              <Rotulo as="h4" id={`${id}-dia-${dia.clave}`} className="border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                {dia.titulo} · {dia.sesiones.length}
              </Rotulo>
              <ul>
                {dia.sesiones.map((sesion) => (
                  <FilaSesion
                    key={sesion.id}
                    sesion={sesion}
                    sugerencia={sugerencias.get(sesion.id)}
                    edicion={{ activa: editandoId === sesion.id, props: edicionProps }}
                    onEmpezarEdicion={onEmpezarEdicion}
                    onAbrir={onAbrir}
                    onPedirBorrado={onPedirBorrado}
                    onPedirUnion={onPedirUnion}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
