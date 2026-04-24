const Anthropic = require('@anthropic-ai/sdk');

let client;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function complete(systemPrompt, userMessage, options = {}) {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: options.maxTokens || 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

module.exports = { complete };
