/**
 * @jest-environment node
 */

jest.mock('./_anthropic', () => ({
  callAnthropic: jest.fn().mockResolvedValue(
    '{"impact_score": 75, "missing_keywords": ["Docker", "Kubernetes"], "suggestions": ["Quantify results"]}'
  ),
}));

const handler = require('./ats-score');
const {
  extractKeywords,
  cosineSimilarity,
  calcFormatScore,
  calcCompletenessScore,
} = require('./ats-score');

// ─── Helper ──────────────────────────────────────────────
const makeReqRes = (method = 'POST', body = {}) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req: { method, body }, res };
};

// ─── extractKeywords ─────────────────────────────────────
describe('extractKeywords', () => {
  it('returns empty array for null', () => {
    expect(extractKeywords(null)).toEqual([]);
  });

  it('strips stop words', () => {
    const words = extractKeywords('the quick brown fox and a cat');
    expect(words).not.toContain('the');
    expect(words).not.toContain('and');
    expect(words).not.toContain('a');
    expect(words).toContain('quick');
    expect(words).toContain('brown');
  });

  it('lowercases all words', () => {
    const words = extractKeywords('React TypeScript Docker');
    expect(words).toContain('react');
    expect(words).toContain('typescript');
  });

  it('filters out words shorter than 3 characters', () => {
    const words = extractKeywords('go js python');
    expect(words).not.toContain('go');
    expect(words).not.toContain('js');
    expect(words).toContain('python');
  });
});

// ─── cosineSimilarity ────────────────────────────────────
describe('cosineSimilarity', () => {
  it('returns 0 for empty strings', () => {
    expect(cosineSimilarity('', '')).toBe(0);
  });

  it('returns 1 for identical strings', () => {
    const sim = cosineSimilarity('python machine learning', 'python machine learning');
    expect(sim).toBeCloseTo(1, 2);
  });

  it('returns a value between 0 and 1 for partially overlapping strings', () => {
    const sim = cosineSimilarity('python react docker', 'python typescript kubernetes');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('returns 0 for completely non-overlapping strings', () => {
    const sim = cosineSimilarity('python react', 'accounting finance');
    expect(sim).toBe(0);
  });
});

// ─── calcFormatScore ─────────────────────────────────────
describe('calcFormatScore', () => {
  it('returns 100 for a fully complete resume', () => {
    const r = {
      personalInfo: { fullName: 'Jane', email: 'j@ex.com' },
      workExperience: [{ jobTitle: 'Dev' }],
      skills: { technicalSkills: ['React'] },
    };
    expect(calcFormatScore(r)).toBe(100);
  });

  it('deducts 20 for missing fullName', () => {
    const r = {
      personalInfo: { email: 'j@ex.com' },
      workExperience: [{ jobTitle: 'Dev' }],
      skills: { technicalSkills: ['React'] },
    };
    expect(calcFormatScore(r)).toBe(80);
  });

  it('deducts 15 for missing email', () => {
    const r = {
      personalInfo: { fullName: 'Jane' },
      workExperience: [{ jobTitle: 'Dev' }],
      skills: { technicalSkills: ['React'] },
    };
    expect(calcFormatScore(r)).toBe(85);
  });

  it('deducts 20 for no work experience', () => {
    const r = {
      personalInfo: { fullName: 'Jane', email: 'j@ex.com' },
      workExperience: [],
      skills: { technicalSkills: ['React'] },
    };
    expect(calcFormatScore(r)).toBe(80);
  });

  it('deducts 15 for no skills', () => {
    const r = {
      personalInfo: { fullName: 'Jane', email: 'j@ex.com' },
      workExperience: [{ jobTitle: 'Dev' }],
      skills: {},
    };
    expect(calcFormatScore(r)).toBe(85);
  });

  it('never goes below 0', () => {
    expect(calcFormatScore({})).toBeGreaterThanOrEqual(0);
  });
});

// ─── calcCompletenessScore ───────────────────────────────
describe('calcCompletenessScore', () => {
  it('returns 0 for empty resume', () => {
    expect(calcCompletenessScore({})).toBe(0);
  });

  it('reaches 100 for a full resume', () => {
    const r = {
      personalInfo: { fullName: 'Jane', email: 'j@ex.com', phone: '5551234567' },
      workExperience: [{ jobTitle: 'Dev' }],
      education: [{ institutionName: 'MIT' }],
      skills: { technicalSkills: ['React'] },
      careerObjective: { targetJobTitle: 'Engineer' },
    };
    expect(calcCompletenessScore(r)).toBe(100);
  });

  it('adds 15 for fullName and 15 for email', () => {
    const r = { personalInfo: { fullName: 'Jane', email: 'j@ex.com' } };
    expect(calcCompletenessScore(r)).toBe(30);
  });
});

// ─── HTTP handler ────────────────────────────────────────
describe('ats-score handler', () => {
  it('returns 405 for GET requests', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when resumeData is missing', async () => {
    const { req, res } = makeReqRes('POST', {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns overall score with sub-scores for a minimal resume', async () => {
    const { req, res } = makeReqRes('POST', {
      resumeData: {
        personalInfo: { fullName: 'Alex Chen', email: 'alex@ex.com' },
        workExperience: [{ jobTitle: 'Engineer', bulletPoints: ['Built scalable APIs'] }],
        skills: { technicalSkills: ['React', 'Node.js'] },
      },
      jobDescription: 'Looking for a React engineer with Node.js experience',
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty('overall');
    expect(jsonArg).toHaveProperty('keyword');
    expect(jsonArg).toHaveProperty('format');
    expect(jsonArg).toHaveProperty('impact');
    expect(jsonArg).toHaveProperty('completeness');
    expect(jsonArg.overall).toBeGreaterThanOrEqual(0);
    expect(jsonArg.overall).toBeLessThanOrEqual(100);
  });

  it('returns missingKeywords and suggestions from AI', async () => {
    const { req, res } = makeReqRes('POST', {
      resumeData: { personalInfo: { fullName: 'Alex' } },
    });
    await handler(req, res);
    const jsonArg = res.json.mock.calls[0][0];
    expect(Array.isArray(jsonArg.missingKeywords)).toBe(true);
    expect(Array.isArray(jsonArg.suggestions)).toBe(true);
  });
});
