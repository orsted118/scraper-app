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
    // El límite de tokens por minuto se recupera solo en el próximo minuto:
    // 90s de castigo dejaría la mejor key fuera de juego sin necesidad.
    if (status === 429 && /tokens?\s+per\s+minute/i.test(String(bodyText))) {
      return transientError(`[cerebras] TPM alcanzado: ${String(bodyText).slice(0, 200)}`, 15);
    }

    return classifyError(this.providerName, status, bodyText);
  }
}

module.exports = { CerebrasBackend, ENV_BASE };
