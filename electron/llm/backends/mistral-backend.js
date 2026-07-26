const { OpenAICompatibleBackend } = require('./base');

const ENV_BASE = 'MISTRAL_API_KEY';
const DEFAULT_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

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
