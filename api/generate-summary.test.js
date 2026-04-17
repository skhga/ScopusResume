/**
 * @jest-environment node
 */

jest.mock('./_openai', () => ({
  callOpenAI: jest.fn().mockResolvedValue(
    'Software engineer with 5 years of experience building scalable systems.'
  ),
}));

const handler = require('./generate-summary');

const makeReqRes = (method = 'POST', body = {}) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req: { method, body }, res };
};

describe('generate-summary handler', () => {
  it('returns 405 for non-POST requests', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 when resumeData is missing', async () => {
    const { req, res } = makeReqRes('POST', {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'resumeData is required' });
  });

  it('returns generated summary string', async () => {
    const { req, res } = makeReqRes('POST', {
      resumeData: {
        careerObjective: { targetJobTitle: 'Software Engineer', targetIndustry: 'Technology' },
        workExperience: [{ jobTitle: 'Dev', companyName: 'Acme', startYear: '2020' }],
        skills: { technicalSkills: ['React', 'Node.js'], programmingLanguages: ['TypeScript'] },
        education: [{ degreeType: 'bs', fieldOfStudy: 'CS', institutionName: 'MIT' }],
      },
    });
    await handler(req, res);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty('summary');
    expect(typeof jsonArg.summary).toBe('string');
    expect(jsonArg.summary.length).toBeGreaterThan(0);
  });

  it('computes yearsOfExperience from startYear and passes it to AI', async () => {
    const { callOpenAI } = require('./_openai');
    callOpenAI.mockClear();
    const { req, res } = makeReqRes('POST', {
      resumeData: {
        workExperience: [{ startYear: '2015' }, { startYear: '2019' }],
      },
    });
    await handler(req, res);
    expect(callOpenAI).toHaveBeenCalled();
    const [, userMessage] = callOpenAI.mock.calls[0];
    const expectedYears = new Date().getFullYear() - 2015;
    expect(userMessage).toContain(`Years of Experience: ${expectedYears}`);
  });

  it('returns 500 when AI throws', async () => {
    const { callOpenAI } = require('./_openai');
    callOpenAI.mockRejectedValueOnce(new Error('Network error'));
    const { req, res } = makeReqRes('POST', { resumeData: { personalInfo: {} } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
