const { callAnthropic } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { bullet, jobTitle, company } = req.body;
  if (!bullet) return res.status(400).json({ error: 'bullet is required' });

  const systemPrompt = `You are a professional resume writer following Harvard Resume Guide principles.
Transform a plain-language bullet point into one strong achievement-focused bullet.
Rules:
1. Start with a strong action verb (Led, Developed, Implemented, Achieved, Orchestrated, Designed, Reduced, Increased)
2. Quantify results wherever possible (percentages, dollar amounts, headcount, time saved)
3. Focus on achievements and measurable impact, not duties
4. Keep to 1-2 lines maximum
5. Eliminate weak verbs: helped, assisted, was responsible for, participated in
Return ONLY the rewritten bullet point text — no quotes, no preamble, no explanation.`;

  const userPrompt = `Job Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}

Original bullet:
${bullet}

Rewrite this into one strong achievement-focused bullet point.`;

  try {
    const rewritten = await callAnthropic(systemPrompt, userPrompt);
    res.status(200).json({ rewritten: rewritten.trim() });
  } catch (err) {
    console.error('rewrite-bullets error:', err);
    res.status(500).json({ error: 'AI rewriting failed', details: err.message });
  }
};
