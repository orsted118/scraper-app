const { OpenAICompatibleBackend } = require('./base');

// Último recurso del orden de preferencia: en uso real dio cuelgues, TPM
// restrictivo y respuestas cortadas. Sólo entra si los otros cuatro fallaron.
const ENV_BASE = 'GROQ_API_KEY';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
