// `acento` es el border-left de 3px del sistema: estado — acá, "esto está
// grabando" o "esta es la sesión abierta".
export default function Panel({ children, acento = false, as: Etiqueta = 'div', className = '', ...resto }) {
  return (
    <Etiqueta
      className={`border p-5 ${className}`}
      style={{
        borderColor: 'var(--border-normal)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
        borderLeftWidth: acento ? '3px' : 'var(--border-width-card, 1px)',
        borderLeftColor: acento ? 'var(--accent)' : 'var(--border-normal)',
      }}
      {...resto}
    >
      {children}
    </Etiqueta>
  );
}
