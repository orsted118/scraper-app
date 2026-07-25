const { LlmBackendBase, classifyError, fetchWithTimeout, stripCodeFence, transientError } = require('./base');

// 20 req/día por key, pero hay hasta 16 keys en .env: el pool las rota.
const ENV_BASE = 'GEMINI_API_KEY';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Gemini no habla el dialecto OpenAI: el system prompt va aparte en
// systemInstruction y los roles se llaman 'user'/'model'.
function toGeminiPayload(messages) {
  const systemParts = [];
  const contents = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push({ text: message.content });
      continue;
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    });
  }

  const payload = { contents };

  if (systemParts.length > 0) {
    payload.systemInstruction = { parts: systemParts };
  }

  return payload;
}

class GeminiBackend extends LlmBackendBase {
  constructor(slot) {
    super({ providerName: 'gemini', model: DEFAULT_MODEL, slot });
  }

  async chat(messages, opts = {}) {
    const { maxTokens = 2000, temperature = 0.2, jsonSchema = null } = opts;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.slot.key}`;

    const body = {
      ...toGeminiPayload(messages),
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(jsonSchema ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      providerName: this.providerName,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw classifyError(this.providerName, response.status, errorText);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const content = (candidate?.content?.parts || []).map((part) => part.text || '').join('');

    if (!content) {
      // MAX_TOKENS con texto vacío significa que se gastó el presupuesto en el
      // razonamiento interno; reintentar en otro backend es mejor que fallar.
      const reason = candidate?.finishReason || 'sin candidatos';
      throw transientError(`[gemini] respuesta vacía (finishReason: ${reason}).`);
    }

    return {
      content: stripCodeFence(content),
      tokensUsed: data?.usageMetadata?.totalTokenCount || 0,
      model: this.model,
    };
  }
}

module.exports = { GeminiBackend, ENV_BASE };
