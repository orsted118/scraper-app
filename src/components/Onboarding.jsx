import { ArrowRight } from 'lucide-react';
import dvpotroLogo from '../assets/branding/dvpotro-logo-128.png';

function Onboarding({ onNavigate }) {
  return (
    <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div
        className="w-full max-w-2xl border px-8 py-10 text-center"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          borderRadius: 'var(--radius-card, 0px)',
          boxShadow: 'var(--shadow-card, none)',
        }}
      >
        <div className="flex justify-center">
          <span
            className="flex h-20 w-20 items-center justify-center border p-2"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
              borderRadius: 'var(--radius-card, 0px)',
            }}
          >
            <img
              src={dvpotroLogo}
              alt="DVPotro"
              className="h-full w-full object-contain"
              draggable="false"
            />
          </span>
        </div>

        <h3
          className="mt-8 font-extrabold"
          style={{
            color: 'var(--text-strong)',
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            textWrap: 'balance',
          }}
        >
          Bienvenido a DVPotro
        </h3>
        <p className="mt-4 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
          Para comenzar, configura tus credenciales de iVirtual ITSON
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('ajustes')}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            Configurar credenciales
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default Onboarding;
