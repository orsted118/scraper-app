const { OpenAICompatibleBackend } = require('./base');

const ENV_BASE = 'SCW_SECRET_KEY';
const DEFAULT_BASE_URL = process.env.SCW_API_BASE_URL || 'https://api.scaleway.ai/v1';
const DEFAULT_MODEL = process.env.SCW_MODEL || 'mistral-small-3.2-24b-instruct-2506';

class ScalewayBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'scaleway',
      model: DEFAULT_MODEL,
      slot,
      url: `${DEFAULT_BASE_URL.replace(/\/+$/, '')}/chat/completions`,
    });
  }
}

module.exports = { ENV_BASE, ScalewayBackend };
