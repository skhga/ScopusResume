// api/_openai.js — shared OpenAI call for Vercel Functions
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

/**
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>} raw text response
 */
async function callOpenAI(systemPrompt, userMessage) {
  const key = process.env.OPENAI_KEY;
  if (!key) throw new Error('OPENAI_KEY not set on server');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

module.exports = { callOpenAI };
