const { callOpenAI } = require('./_openai');

function parseJSON(text) {
  try {
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

const SYSTEM = `You are an ATS (Applicant Tracking System) analyzer.
Analyze how well a resume matches a job description. Return ONLY a JSON object with this shape:
{
  "overallScore": number (0-100),
  "matchedSkills": string[],
  "missingKeywords": string[],
  "suggestions": string[]
}`;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeText, jd } = req.body || {};
  if (!resumeText || !jd) {
    return res.status(400).json({ error: 'resumeText and jd are required' });
  }

  try {
    const raw = await callOpenAI(SYSTEM, `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd.slice(0, 5000)}`);
    const parsed = parseJSON(raw);

    if (!parsed || typeof parsed.overallScore !== 'number') {
      return res.status(422).json({ error: 'LLM returned malformed analysis. Please try again.' });
    }
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[api/analyze]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
