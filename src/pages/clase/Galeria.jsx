import { minutoSegundo } from './formato';

export default function Galeria({ capturas, onAbrir }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {capturas.map((captura, indice) => (
        <li key={captura.archivo}>
          <button
            type="button"
            className="block w-full border text-left"
            style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}
            onClick={() => onAbrir(indice)}
            aria-label={`Ver la captura del minuto ${minutoSegundo(captura.segundo)}`}
          >
            <img src={captura.url} alt="" loading="lazy" draggable="false" className="aspect-video w-full object-cover" />
            <span
              className="block px-2 py-1 text-[11px]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-secondary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {minutoSegundo(captura.segundo)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
