// api/_anthropic.js — shared Anthropic call for Vercel Functions
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

/**
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>} raw text response
 */
async function callAnthropic(systemPrompt, userMessage) {
  const key = process.env.ANTHROPIC_KEY;
  if (!key) throw new Error('ANTHROPIC_KEY not set on server');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic error: ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

module.exports = { callAnthropic };
