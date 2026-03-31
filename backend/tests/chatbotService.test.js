const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generateFallbackResponse,
  generateChatReply,
} = require('../services/chatbotService');

test('generateFallbackResponse returns urgent guidance for self-harm signals', () => {
  const response = generateFallbackResponse('I want to end my life');
  assert.match(response.toLowerCase(), /urgent|trusted adult|crisis|emergency/);
});

test('generateChatReply falls back when OpenRouter key is unavailable', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  const reply = await generateChatReply(
    {
      messages: [{ sender: 'user', content: 'I feel stressed and alone.' }],
    },
    'I feel stressed and alone.'
  );

  assert.equal(typeof reply, 'string');
  assert.ok(reply.length > 0);

  if (previousKey) {
    process.env.OPENROUTER_API_KEY = previousKey;
  }
});
