import { askClaudeCheck, checkWords, detailOf, readCheck } from '../ai/claudeCheck';

const reply = (status: number, body: unknown) =>
  (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;

describe('the words', () => {
  test('name what is missing on the server', () => {
    expect(checkWords(503, { error: 'not_configured', missing: ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL'] })).toMatch(/ANTHROPIC_API_KEY and CLAUDE_MODEL are missing/);
    expect(checkWords(503, { error: 'not_configured', missing: ['CLAUDE_MODEL'] })).toMatch(/CLAUDE_MODEL is missing/);
    expect(checkWords(503, { error: 'not_configured' })).toMatch(/the key and the model are missing/);
  });

  test("tell a wrong model from a model that would not take the request, with Anthropic's words", () => {
    const gone = checkWords(502, { error: 'upstream', status: 404, detail: 'not_found_error: model: claude-old' });
    expect(gone).toMatch(/no model by the name in CLAUDE_MODEL/);
    expect(gone).toContain('Anthropic said: "not_found_error: model: claude-old"');
    const cap = checkWords(502, { error: 'upstream', status: 400, detail: 'invalid_request_error: max_tokens: 8000 > 4096' });
    expect(cap).toMatch(/would not take the request/);
    expect(cap).toContain('max_tokens: 8000 > 4096');
    expect(checkWords(502, { error: 'upstream', status: 401 })).toMatch(/turned the key down/);
    expect(checkWords(502, { error: 'upstream', status: 429 })).toMatch(/rate-limiting|out of credit/);
    expect(checkWords(502, { error: 'upstream', status: 529, detail: 'overloaded_error: Overloaded' })).toMatch(/error \(529\).*Overloaded/);
    expect(checkWords(504, { error: 'upstream_unreachable' })).toMatch(/could not reach Anthropic/);
    expect(checkWords(404, { error: 'not_found' })).toMatch(/older Worker/);
    expect(checkWords(500, 'nope')).toMatch(/answered 500/);
  });

  test('cut what Anthropic said to a line, and read only the one answer', () => {
    expect(detailOf({ detail: 'x'.repeat(1000) })).toHaveLength(240);
    expect(detailOf({ detail: 7 })).toBe('');
    expect(readCheck({ ok: true })).toBe(true);
    expect(readCheck({ ok: 'true' })).toBe(false);
    expect(readCheck(null)).toBe(false);
  });
});

describe('asking', () => {
  test('a yes says which model answered, and how long it took', async () => {
    let t = 1000;
    const now = () => (t += 700);
    const r = await askClaudeCheck('https://w.test', { fetchImpl: reply(200, { ok: true, model: 'claude-x', asked: 'claude-x' }), now });
    expect(r).toEqual({ ok: true, model: 'claude-x', asked: 'claude-x', ms: 700 });
  });

  test('posts an empty body to the one path', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body });
      return new Response('{"ok":true,"model":"m","asked":"m"}', { status: 200 });
    }) as unknown as typeof fetch;
    await askClaudeCheck('https://w.test', { fetchImpl: f });
    expect(calls).toEqual([{ url: 'https://w.test/api/claude-check', body: '{}' }]);
  });

  test('a no comes back in words, and nothing that is not an answer is one', async () => {
    expect(await askClaudeCheck('', { fetchImpl: reply(502, { error: 'upstream', status: 404, detail: 'not_found_error: model: x' }) })).toEqual({
      ok: false,
      why: expect.stringContaining('no model by the name in CLAUDE_MODEL'),
    });
    expect(await askClaudeCheck('', { fetchImpl: reply(200, { ok: false }) })).toMatchObject({ ok: false });
    expect(await askClaudeCheck('', { fetchImpl: reply(404, '<html>not found</html>') })).toEqual({ ok: false, why: 'The server answered 404 with something that was not an answer.' });
    const off = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await askClaudeCheck('', { fetchImpl: off })).toEqual({ ok: false, why: 'No signal to reach the server.' });
  });
});
