import { useId, useState } from 'react';
import { Loader2, Terminal } from 'lucide-react';

import Panel from './Panel';
import Rotulo from './Rotulo';

// El módulo no sirve sin un Python con las tres dependencias, y el error de un
// import fallido no le dice a nadie qué instalar. Esta pantalla es la única
// forma de que el usuario salga del paso solo.
export default function SetupPendiente({ diagnostico, onGuardarPython, guardando }) {
  const [ruta, setRuta] = useState('');
  const id = useId();

  return (
    <Panel as="section" aria-labelledby={`${id}-titulo`}>
      <div className="flex items-start gap-3">
        <Terminal className="mt-1 h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--retrasada-text)' }} aria-hidden="true" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 id={`${id}-titulo`} className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
              Falta el motor de transcripción
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-normal)' }}>
              {diagnostico.error}
            </p>
          </div>

          <div className="space-y-2">
            <Rotulo>Para dejarlo listo</Rotulo>
            <pre
              className="overflow-x-auto border p-3 text-xs"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-normal)',
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}
            >
{`py -3.12 -m venv %USERPROFILE%\\.dvpotro\\whisper-venv
%USERPROFILE%\\.dvpotro\\whisper-venv\\Scripts\\pip install faster-whisper pyaudiowpatch`}
            </pre>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Python 3.12 y no una versión más nueva: ctranslate2, que es lo que corre el modelo,
              no publica ruedas para las últimas.
            </p>
          </div>

          {diagnostico.intentos?.length > 0 ? (
            <div className="space-y-1">
              <Rotulo>Intérpretes probados</Rotulo>
              <ul>
                {diagnostico.intentos.map((intento) => (
                  <li
                    key={intento.candidato}
                    className="text-xs"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                  >
                    {intento.candidato} — {intento.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form
            className="space-y-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (ruta && !guardando) onGuardarPython(ruta);
            }}
          >
            <Rotulo as="label" htmlFor={`${id}-python`}>Ruta de un python.exe que ya tengas</Rotulo>
            <div className="flex gap-2">
              <input
                id={`${id}-python`}
                type="text"
                className="field flex-1 px-3 py-1.5 text-xs"
                placeholder="C:\ruta\al\python.exe"
                value={ruta}
                onChange={(event) => setRuta(event.target.value)}
              />
              <button type="submit" className="btn-outline px-4 text-sm" disabled={!ruta || guardando} aria-busy={guardando || undefined}>
                {guardando ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} aria-label="Guardando" /> : 'Usar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Panel>
  );
}
