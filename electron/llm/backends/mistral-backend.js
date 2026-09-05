const { OpenAICompatibleBackend } = require('./base');

const ENV_BASE = 'MISTRAL_API_KEY';
// mistral-large-latest no responde en la free tier: se come el timeout entero
// antes de rotar. small contesta el mismo prompt en ~1s.
const DEFAULT_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';

class MistralBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'mistral',
      model: DEFAULT_MODEL,
      slot,
      url: 'https://api.mistral.ai/v1/chat/completions',
    });
  }
}

module.exports = { MistralBackend, ENV_BASE };
