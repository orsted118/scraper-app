const { OpenAICompatibleBackend } = require('./base');

// TPM restrictivo y respuestas cortadas en uso real, así que va tarde en el
// orden de preferencia. Sólo entra si los proveedores previos fallaron.
const ENV_BASE = 'GROQ_API_KEY';
// llama-3.3-70b-versatile fue retirado y devuelve 404 model_not_found. gpt-oss-120b
// es el reemplazo verificado: razona antes de contestar pero respeta el formato
// pedido (el 20b devuelve documentos HTML completos ignorando las instrucciones).
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

class GroqBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'groq',
      model: DEFAULT_MODEL,
      slot,
      url: 'https://api.groq.com/openai/v1/chat/completions',
    });
  }
}

module.exports = { GroqBackend, ENV_BASE };
