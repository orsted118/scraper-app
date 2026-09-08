const { OpenAICompatibleBackend } = require('./base');

// Workers AI expone un endpoint OpenAI-compatible bajo la cuenta, así que la URL
// depende del account id y no puede ser una constante como en los otros backends.
const ENV_BASE = 'CLOUDFLARE_API_KEY';
const ACCOUNT_ENV = 'CLOUDFLARE_ACCOUNT_ID';
const DEFAULT_MODEL = process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function accountId() {
  return String(process.env[ACCOUNT_ENV] || '').trim();
}

// La key sola no alcanza: sin account id la URL no existe y cada intento se
// gastaría en un 404. El selector consulta esto antes de ofrecer el backend.
function isReady() {
  return accountId().length > 0;
}

class CloudflareBackend extends OpenAICompatibleBackend {
  constructor(slot) {
    super({
      providerName: 'cloudflare',
      model: DEFAULT_MODEL,
      slot,
      url: `https://api.cloudflare.com/client/v4/accounts/${accountId()}/ai/v1/chat/completions`,
    });
  }
}

module.exports = { CloudflareBackend, ENV_BASE, isReady };
