const { callAnthropic } = require('./_anthropic');
const crypto = require('crypto');

function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','is','are','was','were','be','been','have','has','had',
    'do','does','did','will','would','could','should','may','might','can',
    'this','that','these','those','we','you','they','i','it','he','she',
  ]);
  return text.toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function cosineSimilarity(textA, textB) {
  const wordsA = extractKeywords(textA);
  const wordsB = extractKeywords(textB);
  const allWords = [...new Set([...wordsA, ...wordsB])];
  if (allWords.length === 0) return 0;
  const freqA = Object.fromEntries(allWords.map(w => [w, wordsA.filter(x => x === w).length]));
  const freqB = Object.fromEntries(allWords.map(w => [w, wordsB.filter(x => x === w).length]));
  const dot = allWords.reduce((sum, w) => sum + (freqA[w] || 0) * (freqB[w] || 0), 0);
  const magA = Math.sqrt(Object.values(freqA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(freqB).reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function calcFormatScore(r) {
  let score = 100;
  if (!r.personalInfo?.fullName) score -= 20;
  if (!r.personalInfo?.email) score -= 15;
  if (!r.workExperience?.length) score -= 20;
  const hasSkills = r.skills?.technicalSkills?.length ||
                    r.skills?.programmingLanguages?.length ||
                    r.skills?.toolsSoftware?.length;
  if (!hasSkills) score -= 15;
  return Math.max(0, score);
}

function calcCompletenessScore(r) {
  let score = 0;
  if (r.personalInfo?.fullName) score += 15;
  if (r.personalInfo?.email) score += 15;
  if (r.personalInfo?.phone) score += 10;
  if (r.workExperience?.length > 0) score += 20;
  if (r.education?.length > 0) score += 15;
  const hasSkills = r.skills?.technicalSkills?.length ||
                    r.skills?.programmingLanguages?.length;
  if (hasSkills) score += 15;
  if (r.careerObjective?.targetJobTitle) score += 10;
  return Math.min(100, score);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData, jobDescription } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  // Build resume text blob for keyword comparison
  const resumeText = [
    resumeData.personalInfo?.fullName,
    resumeData.careerObjective?.targetJobTitle,
    resumeData.careerObjective?.targetIndustry,
    ...(resumeData.workExperience || []).map(e =>
      `${e.jobTitle || ''} ${e.companyName || ''} ${e.jobDescriptionRaw || ''} ${(e.bulletPoints || []).join(' ')}`
    ),
    ...(resumeData.skills?.technicalSkills || []),
    ...(resumeData.skills?.programmingLanguages || []),
    ...(resumeData.skills?.toolsSoftware || []),
    ...(resumeData.skills?.domainSpecificSkills || []),
  ].filter(Boolean).join(' ');

  // 1. Keyword Match Score (40% weight) — cosine similarity, scaled to 0-100
  const rawSim = cosineSimilarity(resumeText, jobDescription || '');
  const keywordScore = jobDescription
    ? Math.min(100, Math.round(rawSim * 250)) // scale: similarity ~0.4 → score 100
    : 50; // no JD = neutral

  // 2. Format Score (20% weight)
  const formatScore = calcFormatScore(resumeData);

  // 3. Completeness Score (15% weight)
  const completenessScore = calcCompletenessScore(resumeData);

  // 4. Impact Score (25% weight) — AI evaluated
  let impactScore = 50;
  let missingKeywords = [];
  let suggestions = [];

  try {
    const bullets = (resumeData.workExperience || [])
      .flatMap(e => e.bulletPoints?.length ? e.bulletPoints : [e.jobDescriptionRaw])
      .filter(Boolean)
      .join('\n');

    const systemPrompt = `You are an expert ATS resume analyzer. Analyze resume content and return a JSON object.`;
    const userPrompt = `Analyze these resume bullet points for impact quality.
Score 0-100 based on: strong action verbs, quantified results, achievement vs duty focus.
Also identify keywords present in the job description but missing from the resume.
Return ONLY valid JSON: { "impact_score": number, "missing_keywords": string[], "suggestions": string[] }

Resume bullets:
${bullets || 'No bullets provided'}

Job Description (check for missing keywords):
${jobDescription ? jobDescription.substring(0, 800) : 'None provided'}`;

    const raw = await callAnthropic(systemPrompt, userPrompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const aiData = JSON.parse(match[0]);
      impactScore = Math.min(100, Math.max(0, Number(aiData.impact_score) || 50));
      missingKeywords = Array.isArray(aiData.missing_keywords) ? aiData.missing_keywords : [];
      suggestions = Array.isArray(aiData.suggestions) ? aiData.suggestions : [];
    }
  } catch (err) {
    console.error('AI impact scoring failed, using default:', err.message);
  }

  const overall = Math.round(
    keywordScore * 0.40 +
    formatScore  * 0.20 +
    impactScore  * 0.25 +
    completenessScore * 0.15
  );

  res.status(200).json({
    overall,
    keyword: Math.min(100, Math.round(keywordScore)),
    format: Math.round(formatScore),
    impact: Math.round(impactScore),
    completeness: Math.round(completenessScore),
    missingKeywords: missingKeywords.slice(0, 15),
    suggestions: suggestions.slice(0, 5),
  });
};
