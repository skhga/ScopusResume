const { callAnthropic } = require('./_anthropic');

function parseJSON(text) {
  try {
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

const SYSTEM = `You are an expert resume coach helping job seekers tailor their resumes to specific job descriptions.
Your goal is to improve the resume's match to the job while maintaining the candidate's authentic voice — never invent experience or exaggerate.

Return ONLY a JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have exactly these fields:
{
  "section": string,
  "original": string,
  "tailored": string,
  "reason": string
}

Rules:
- Only include sections that were actually changed
- Do not invent experience, degrees, or skills that aren't in the resume
- Keep the candidate's writing voice
- Prioritize bullet points that can be rewritten to match JD keywords
- If a section is already strong for this job, skip it`;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeText, jd } = req.body || {};
  if (!resumeText || !jd) {
    return res.status(400).json({ error: 'resumeText and jd are required' });
  }

  try {
    const raw = await callAnthropic(SYSTEM, `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd.slice(0, 5000)}`);
    const parsed = parseJSON(raw);

    if (!Array.isArray(parsed)) {
      return res.status(422).json({ error: 'LLM returned malformed response. Please try again.' });
    }
    for (const item of parsed) {
      if (!item.section || !item.tailored || !item.reason) {
        return res.status(422).json({ error: 'LLM returned malformed diff objects. Please try again.' });
      }
    }
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[api/tailor]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
