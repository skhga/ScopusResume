/**
 * @jest-environment node
 */

jest.mock('./_anthropic', () => ({
  callAnthropic: jest.fn().mockResolvedValue('Led team of 5 engineers, reducing deployment time by 40%.'),
}));

const handler = require('./rewrite-bullets');

const makeReqRes = (method = 'POST', body = {}) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req: { method, body }, res };
};

describe('rewrite-bullets handler', () => {
  it('returns 405 for GET requests', async () => {
    const { req, res } = makeReqRes('GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when bullet is missing', async () => {
    const { req, res } = makeReqRes('POST', { jobTitle: 'Engineer' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bullet is required' });
  });

  it('returns rewritten bullet from AI', async () => {
    const { req, res } = makeReqRes('POST', {
      bullet: 'helped with team deployments',
      jobTitle: 'DevOps Engineer',
      company: 'Acme',
    });
    await handler(req, res);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty('rewritten');
    expect(typeof jsonArg.rewritten).toBe('string');
    expect(jsonArg.rewritten.length).toBeGreaterThan(0);
  });

  it('returns 500 when AI throws', async () => {
    const { callAnthropic } = require('./_anthropic');
    callAnthropic.mockRejectedValueOnce(new Error('API down'));
    const { req, res } = makeReqRes('POST', { bullet: 'did some work' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.error).toBe('AI rewriting failed');
  });
});
