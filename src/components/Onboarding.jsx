import { ArrowRight } from 'lucide-react';
import dvpotroLogo from '../assets/branding/dvpotro-logo.png';

function Onboarding({ onNavigate }) {
  return (
    <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center shadow-2xl shadow-slate-950/40">
        <div className="flex justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-black p-2 shadow-2xl shadow-black/50">
            <img
              src={dvpotroLogo}
              alt="DVPotro"
              className="h-full w-full object-contain"
              draggable="false"
            />
          </span>
        </div>

        <h3 className="mt-8 text-3xl font-semibold text-white">Bienvenido a DVPotro</h3>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Para comenzar, configura tus credenciales de iVirtual ITSON
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('ajustes')}
            className="inline-flex items-center gap-2 rounded-2xl bg-itson-blue px-6 py-3 text-sm font-semibold text-slate-50 transition hover:bg-itson-blue-light"
          >
            Configurar credenciales
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default Onboarding;
