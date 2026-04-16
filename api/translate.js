const { callAnthropic } = require('./_anthropic');

const FRENCH_SECTION_HEADERS = {
  'Experience': 'Expérience Professionnelle',
  'Education': 'Formation',
  'Skills': 'Compétences',
  'Projects': 'Projets',
  'Certifications': 'Certifications',
  'Languages': 'Langues',
  'Volunteer': 'Bénévolat',
  'Awards': 'Prix et Distinctions',
  'Summary': 'Résumé Professionnel',
  'Personal Info': 'Informations Personnelles',
  'Career Objective': 'Objectif de Carrière',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  const systemPrompt = `You are a professional French translator specializing in business and resume documents.
Translate the provided resume content to professional French.
Rules:
- Use professional French business terminology
- Localize job titles (Software Engineer → Ingénieur Logiciel, Project Manager → Chef de Projet)
- Convert English month names to French (January → Janvier, etc.)
- Keep technical terms in English if they are widely recognized industry standards (Machine Learning, JavaScript, React, Docker, etc.)
- Use formal tone in summary/objective text
- Return the translated content as a JSON object with exactly the same structure as the input
Return ONLY valid JSON, no explanation.`;

  try {
    const input = JSON.stringify(resumeData, null, 2).substring(0, 8000);
    const userPrompt = `Translate this resume content to French:\n${input}`;
    const raw = await callAnthropic(systemPrompt, userPrompt);
    const match = raw.match(/\{[\s\S]*\}/);
    const translated = match ? JSON.parse(match[0]) : resumeData;

    res.status(200).json({
      translated,
      sectionHeaders: FRENCH_SECTION_HEADERS,
    });
  } catch (err) {
    console.error('translate error:', err);
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
};
