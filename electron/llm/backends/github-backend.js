const { OpenAICompatibleBackend } = require('./base');

// 50 req/día por token: el pool (GITHUB_TOKEN, GITHUB_TOKEN2..4) multiplica el
// presupuesto diario rotando cuando uno se agota.
const ENV_BASE = 'GITHUB_TOKEN';
const DEFAULT_MODEL = process.env.GITHUB_MODEL || 'openai/gpt-4.1';

class GitHubBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'github',
      model: DEFAULT_MODEL,
      slot,
      url: 'https://models.github.ai/inference/chat/completions',
      extraHeaders: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }
}

module.exports = { GitHubBackend, ENV_BASE };
