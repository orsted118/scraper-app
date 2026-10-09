// El rótulo mono en mayúsculas del sistema. `as` deja usarlo como <label> o como
// encabezado: el mismo aspecto visual no tiene por qué perder la semántica.
export default function Rotulo({ as: Etiqueta = 'p', children, className = '', style, ...resto }) {
  return (
    <Etiqueta
      className={`block text-xs uppercase tracking-widest ${className}`}
      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', ...style }}
      {...resto}
    >
      {children}
    </Etiqueta>
  );
}
