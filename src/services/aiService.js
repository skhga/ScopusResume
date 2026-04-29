import { resumeToText } from '../utils/resumeToText';

const OPENAI_KEY = process.env.REACT_APP_OPENAI_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const IS_PROD = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

/**
 * Call a Vercel proxy endpoint (production path).
 * The proxy handles the API key server-side.
 */
async function callProxy(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Call OpenAI directly (dev path — requires REACT_APP_OPENAI_KEY in .env.local).
 */
async function callLLM(systemPrompt, userMessage) {
  if (!OPENAI_KEY) {
    throw new Error(
      'No OpenAI API key. Set REACT_APP_OPENAI_KEY in .env.local (see .env.local.example).'
    );
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `LLM request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Parse the LLM response as JSON, stripping markdown code fences if present.
 * Returns null if parsing fails.
 */
function parseJSON(text) {
  try {
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

/**
 * Tailor a resume for a specific job description.
 * Returns an array of diff objects: [{section, original, tailored, reason}]
 * Production: calls /api/tailor proxy. Dev: calls OpenAI directly.
 */
export async function tailorResume(resume, jd) {
  if (!jd || !jd.trim()) {
    throw new Error('Job description is required.');
  }

  const resumeText = resumeToText(resume);

  // Production: use the Vercel proxy (OPENAI_KEY is server-side only)
  if (IS_PROD || !OPENAI_KEY) {
    return callProxy('/api/tailor', { resumeText, jd: jd.slice(0, 5000) });
  }

  // Dev: call OpenAI directly
  const systemPrompt = `You are an expert resume coach helping job seekers tailor their resumes to specific job descriptions.
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
- Keep the candidate's writing voice — don't make it sound like a different person
- Prioritize bullet points that can be rewritten to match JD keywords
- If a section is already strong for this job, skip it`;

  const raw = await callLLM(systemPrompt, `RESUME:\n${resumeText || '(empty resume)'}\n\nJOB DESCRIPTION:\n${jd.slice(0, 5000)}`);
  const parsed = parseJSON(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('LLM returned malformed response. Please try again.');
  }
  for (const item of parsed) {
    if (!item.section || !item.tailored || !item.reason) {
      throw new Error('LLM returned malformed diff objects. Please try again.');
    }
  }
  return parsed;
}

/**
 * Analyze a job description against a resume.
 * Returns ATS match score, matched skills, missing keywords, and suggestions.
 * Production: calls /api/analyze proxy. Dev: calls OpenAI directly or uses mock.
 */
export async function analyzeJobDescription(jdText, resume) {
  const resumeText = resumeToText(resume);

  // Production: use the Vercel proxy
  if (IS_PROD) {
    return callProxy('/api/analyze', { resumeText, jd: jdText.slice(0, 5000) });
  }

  if (!OPENAI_KEY) {
    // Dev mock — useful for UI development without a key
    console.warn('[aiService] No API key — using mock analyzeJobDescription response.');
    await new Promise(r => setTimeout(r, 800));
    const skills = resume?.skills || {};
    const allSkills = [
      ...(skills.technicalSkills || []),
      ...(skills.programmingLanguages || []),
      ...(skills.toolsSoftware || []),
    ].map(s => s.toLowerCase());
    const required = ['React.js', 'Node.js', 'TypeScript', 'REST APIs', 'PostgreSQL'];
    const matched = required.filter(s => allSkills.some(sk => sk.includes(s.toLowerCase())));
    const missing = required.filter(s => !allSkills.some(sk => sk.includes(s.toLowerCase())));
    return {
      overallScore: Math.round((matched.length / required.length) * 100),
      matchedSkills: matched,
      missingKeywords: missing,
      suggestions: [
        'Add more quantified achievements to bullet points',
        'Include missing keywords in your skills section',
        'Tailor your summary to match the job description',
      ],
    };
  }

  // Dev with key: call OpenAI directly
  const systemPrompt = `You are an ATS (Applicant Tracking System) analyzer.
Analyze how well a resume matches a job description. Return ONLY a JSON object with this shape:
{
  "overallScore": number (0-100),
  "matchedSkills": string[],
  "missingKeywords": string[],
  "suggestions": string[]
}`;

  const raw = await callLLM(systemPrompt, `RESUME:\n${resumeText || '(empty resume)'}\n\nJOB DESCRIPTION:\n${jdText.slice(0, 5000)}`);
  const parsed = parseJSON(raw);

  if (!parsed || typeof parsed.overallScore !== 'number') {
    throw new Error('LLM returned malformed analysis. Please try again.');
  }
  return parsed;
}

// Legacy helpers
export async function rewriteBulletPoint(original) {
  if (!OPENAI_KEY) {
    await new Promise(r => setTimeout(r, 1000));
    return `Spearheaded ${original.toLowerCase().replace('responsible for ', '').replace('worked on ', '')}, driving measurable impact across the organization`;
  }
  const raw = await callLLM(
    'Rewrite the following resume bullet point to be more impactful and quantified. Return only the rewritten bullet, no preamble.',
    original
  );
  return raw.trim();
}

export async function generateSummary(resumeData) {
  if (!OPENAI_KEY) {
    await new Promise(r => setTimeout(r, 1200));
    return 'Results-driven software professional with expertise in full-stack development, specializing in building scalable web applications. Proven track record of delivering high-impact solutions and collaborating with cross-functional teams.';
  }
  const resumeText = resumeToText(resumeData);
  const raw = await callLLM(
    'Write a professional summary for this resume in 2-3 sentences. Match the candidate\'s actual experience. Return only the summary text.',
    resumeText
  );
  return raw.trim();
}

export async function optimizeBullets(bullets) {
  if (!OPENAI_KEY) {
    await new Promise(r => setTimeout(r, 1500));
    return bullets.map(b =>
      `Engineered and delivered ${b.toLowerCase().replace('responsible for ', '').replace('worked on ', '')}, resulting in 25% improvement in team productivity`
    );
  }
  const raw = await callLLM(
    'Rewrite each of these resume bullet points to be more impactful and quantified. Return a JSON array of strings, one per bullet. No preamble.',
    JSON.stringify(bullets)
  );
  const parsed = parseJSON(raw);
  return Array.isArray(parsed) ? parsed : bullets;
}

/**
 * Translate resume content via DeepL proxy.
 * Returns a deep-cloned resume with translated text fields.
 */
export async function translateResume(resume, targetLang = 'FR') {
  const texts = [];

  const exp = resume.workExperience || [];
  for (const e of exp) {
    if (e.jobTitle) texts.push(e.jobTitle);
    if (e.bulletPoints) texts.push(...e.bulletPoints.filter(Boolean));
  }

  const edu = resume.education || [];
  for (const e of edu) {
    if (e.degreeType) texts.push(e.degreeType);
    if (e.fieldOfStudy) texts.push(e.fieldOfStudy);
    if (e.thesisTitle) texts.push(e.thesisTitle);
    if (e.honorsAwards) texts.push(e.honorsAwards);
  }

  const skills = resume.skills || {};
  if (skills.domainSpecificSkills) texts.push(...skills.domainSpecificSkills);

  const summaryText =
    resume.reviewOptimize?.professionalSummary?.summaryText ||
    resume.professionalSummary?.summaryText ||
    resume.summary?.summaryText ||
    '';
  if (summaryText) texts.push(summaryText);

  const additionalInfo = resume.additionalInfo || {};
  const volunteerExp = additionalInfo.volunteerExperience || [];
  for (const v of volunteerExp) {
    if (v.role) texts.push(v.role);
    if (v.description) texts.push(v.description);
  }

  const projects = resume.projects || [];
  for (const p of projects) {
    if (p.projectDescription) texts.push(p.projectDescription);
  }

  if (texts.length === 0) return resume;

  let translated;
  if (IS_PROD || !OPENAI_KEY) {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts, targetLang }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Translation failed');
    }
    const data = await res.json();
    translated = data.translations?.map(t => t.text) || texts;
  } else {
    await new Promise(r => setTimeout(r, 800));
    translated = texts.map(t => `[${targetLang}] ${t}`);
  }

  const result = JSON.parse(JSON.stringify(resume));
  let ti = 0;
  const next = () => translated[ti++] || '';

  for (const e of result.workExperience || []) {
    if (e.jobTitle) e.jobTitle = next();
    if (e.bulletPoints) e.bulletPoints = e.bulletPoints.map(() => next());
  }
  for (const e of result.education || []) {
    if (e.degreeType) e.degreeType = next();
    if (e.fieldOfStudy) e.fieldOfStudy = next();
    if (e.thesisTitle) e.thesisTitle = next();
    if (e.honorsAwards) e.honorsAwards = next();
  }
  if (result.skills?.domainSpecificSkills) {
    result.skills.domainSpecificSkills = result.skills.domainSpecificSkills.map(() => next());
  }
  const sumPath = result.reviewOptimize?.professionalSummary || result.professionalSummary || result.summary || {};
  if (sumPath.summaryText) sumPath.summaryText = next();

  return result;
}
