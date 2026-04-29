// Vercel serverless function — proxies DeepL API calls
const DEEPL_KEY = process.env.DEEPL_API_KEY;
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!DEEPL_KEY) {
    return res.status(500).json({ error: 'DeepL API key not configured' });
  }

  try {
    const { text, targetLang = 'FR' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: typeof text === 'string' ? text : JSON.stringify(text),
        target_lang: targetLang,
      }).toString(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.message || 'Translation failed' });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('[translate]', err);
    res.status(500).json({ error: 'Translation service unavailable' });
  }
};
