// Silueta compartida por todos los iconos de archivo: hoja con esquina doblada.
// El glifo de cada formato se dibuja en knockout sobre el color de marca, así
// cada icono queda con UN color plano + hairline — sin gradientes ni sombras.
//
// El knockout usa --file-knockout (default: la superficie donde viven las
// cards). Un contenedor con otro fondo puede pisarlo sin tocar el componente.
const KNOCKOUT = 'var(--file-knockout, var(--bg-secondary))';

const SHEET_PATH = 'M5 2h9l5 5v15H5V2z';
const FOLD_PATH = 'M14 2v5h5';

function FileSheet({ color, children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d={SHEET_PATH} fill={color} />
      <path d={FOLD_PATH} stroke={KNOCKOUT} strokeWidth="1" fill="none" />
      {children}
    </svg>
  );
}

export { KNOCKOUT };
export default FileSheet;
