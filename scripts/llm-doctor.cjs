// Health check de los backends LLM desde la terminal, sin Electron corriendo.
//
//   npm run llm:doctor
//
// Pega 1 request por key con maxTokens 5: el gasto de cuota es mínimo pero real.
// No imprime valores de API keys, solo nombres de variable.
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'node_modules/dotenv')).config({ path: path.join(ROOT, '.env') });

const { probeAllBackends } = require(path.join(ROOT, 'electron/llm/probe'));
const { getPreferenceOrder } = require(path.join(ROOT, 'electron/llm/selector'));
const { discoverKeySlots } = require(path.join(ROOT, 'electron/llm/key-pool'));

const ENV_BASES = {
  cerebras: 'CEREBRAS_API_KEY',
  github: 'GITHUB_TOKEN',
  mistral: 'MISTRAL_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
};

const pad = (value, width) => String(value ?? '').padEnd(width);

function formatKeyLabel(result) {
  const base = ENV_BASES[result.backend] || '';
  // "GEMINI_API_KEY7" -> "…KEY7". El prefijo se repite en toda la columna.
  return result.keyEnvVar === base ? `${base} (1)` : result.keyEnvVar;
}

(async () => {
  const configured = Object.entries(ENV_BASES).filter(([, envBase]) => discoverKeySlots(envBase).length > 0);

  if (configured.length === 0) {
    console.log('\nNo hay ninguna key configurada en .env.');
    console.log('Agregá al menos una: CEREBRAS_API_KEY, GITHUB_TOKEN, MISTRAL_API_KEY, GEMINI_API_KEY o GROQ_API_KEY.\n');
    process.exit(1);
  }

  const total = configured.reduce((sum, [, envBase]) => sum + discoverKeySlots(envBase).length, 0);
  console.log(`\nProbando ${total} key(s) en ${configured.length} backend(s), de a 3 en paralelo...\n`);

  // skipLog: el CLI no debe ensuciar el historial de uso de la app, que es lo
  // que alimenta las sugerencias de routing.
  const results = await probeAllBackends({
    force: true,
    skipLog: true,
    parallel: 3,
    onProgress: ({ done, total: count }) => {
      process.stdout.write(`\r  ${done}/${count} probadas`);
      if (done === count) process.stdout.write('\n\n');
    },
  });

  const widths = {
    backend: Math.max(8, ...results.map((r) => r.backend.length)),
    key: Math.max(16, ...results.map((r) => formatKeyLabel(r).length)),
  };

  console.log(`${pad('Backend', widths.backend)}  ${pad('Key', widths.key)}  ${pad('Status', 8)}  ${pad('Latency', 9)}  Model / Error`);
  console.log('-'.repeat(widths.backend + widths.key + 46));

  for (const name of Object.keys(ENV_BASES)) {
    for (const result of results.filter((r) => r.backend === name)) {
      const status = result.ok ? 'ok' : 'fail';
      const mark = result.ok ? '✓' : '✗';
      const latency = result.ok ? `${result.latencyMs} ms` : '—';
      const tail = result.ok ? (result.model || '') : String(result.error || '').replace(/\s+/g, ' ').slice(0, 90);
      const cooling = result.coolingDown ? ' [cooldown]' : '';

      console.log(`${pad(result.backend, widths.backend)}  ${pad(formatKeyLabel(result), widths.key)}  ${pad(`${mark} ${status}`, 8)}  ${pad(latency, 9)}  ${tail}${cooling}`);
    }
  }

  console.log('\nResumen por backend:');
  let okTotal = 0;

  for (const [name] of configured) {
    const group = results.filter((r) => r.backend === name);
    const ok = group.filter((r) => r.ok).length;
    okTotal += ok;
    const flag = ok === 0 ? '  <- sin keys utilizables' : '';
    console.log(`  ${pad(name, 10)} ${ok}/${group.length} keys OK${flag}`);
  }

  const order = getPreferenceOrder().filter((name) => discoverKeySlots(ENV_BASES[name] || '').length > 0);
  console.log(`\nOrden de preferencia actual: ${order.join(' -> ')}`);

  if (process.env.LLM_BACKEND) {
    console.log(`  (LLM_BACKEND=${process.env.LLM_BACKEND} fuerza el primero)`);
  }

  console.log(`\n${okTotal}/${total} keys OK en total.\n`);
  // Exit 1 si no quedó ninguna key viva: sirve para encadenarlo en un script.
  process.exit(okTotal === 0 ? 1 : 0);
})().catch((error) => {
  console.error('\nllm-doctor falló:', error?.message || error);
  process.exit(1);
});
