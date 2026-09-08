const { OpenAICompatibleBackend, classifyError, transientError } = require('./base');

const ENV_BASE = 'OPENROUTER_API_KEY';
// Los modelos ":free" de OpenRouter salen de un pool compartido entre todos los
// usuarios: rotan y se saturan seguido. OPENROUTER_MODEL permite apuntar a otro
// sin tocar código cuando este se retire.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';

class OpenRouterBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'openrouter',
      model: DEFAULT_MODEL,
      slot,
      url: 'https://openrouter.ai/api/v1/chat/completions',
    });
  }

  classifyHttpError(status, bodyText) {
    const body = String(bodyText);

    // OpenRouter devuelve 404 cuando el modelo dejó de tener variante gratuita.
    // El default de classifyError lo trataría como fatal del backend entero,
    // pero acá es un problema de configuración: conviene rotar a otro proveedor
    // en vez de abortar la llamada.
    if (status === 404 && /unavailable for free|not a valid model|No endpoints found/i.test(body)) {
      return transientError(`[openrouter] modelo ${this.model} sin variante gratuita: ${body.slice(0, 200)}`, 300);
    }

    return classifyError(this.providerName, status, body);
  }
}

module.exports = { ENV_BASE, OpenRouterBackend };
