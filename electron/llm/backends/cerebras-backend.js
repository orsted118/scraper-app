const { OpenAICompatibleBackend, classifyError, transientError } = require('./base');

const ENV_BASE = 'CEREBRAS_API_KEY';
// El orquestador dejó verificado que Cerebras NO acepta nombres estilo
// "llama-3.3-70b"; gpt-oss-120b sí responde. CEREBRAS_MODEL permite probar otro
// sin tocar código.
const DEFAULT_MODEL = process.env.CEREBRAS_MODEL || 'gpt-oss-120b';

class CerebrasBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'cerebras',
      model: DEFAULT_MODEL,
      slot,
      url: 'https://api.cerebras.ai/v1/chat/completions',
    });
  }

  classifyHttpError(status, bodyText) {
    const body = String(bodyText);

    // Los límites por minuto (tokens o requests) se recuperan en la ventana
    // siguiente. Castigarlos con los 90s del default saca al backend más rápido
    // del pool y empuja la carga a GitHub, que tiene un tope duro de 50/día.
    if (status === 429 && /tokens?\s+per\s+minute/i.test(body)) {
      return transientError(`[cerebras] TPM alcanzado: ${body.slice(0, 200)}`, 15);
    }

    if (status === 429 && /requests?\s+per\s+minute/i.test(body)) {
      return transientError(`[cerebras] RPM alcanzado: ${body.slice(0, 200)}`, 30);
    }

    return classifyError(this.providerName, status, body);
  }
}

module.exports = { CerebrasBackend, ENV_BASE };
