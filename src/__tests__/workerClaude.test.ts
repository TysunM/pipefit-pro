import { handle } from '../../worker/index';
import { POLISH_SYSTEM, cleanPolishBody, polishMessage, type Polish } from '../ai/shiftPolish';
import { logFacts, shiftFacts } from '../calc/shiftReport';
import { newReport } from '../state/shiftLog';

const T = new Date(2026, 8, 30, 7).getTime();
const facts = shiftFacts(
  { ...newReport('2026-09-30', 'BP-1', T), crew: 4, welds: [{ nps: 6, count: 8 }] },
  logFacts({ tests: [], joints: [], heats: [], readings: [], sketches: [] }, '2026-09-30', 'BP-1'),
);
const NOTES = { issues: 'crane late', safety: '', tomorrow: '', notes: '' };
const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const ANSWER: Polish = { summary: 'The crew of 4 made 8 welds.', issues: 'The crane was late.', safety: '', tomorrow: '', notes: '' };

const post = (body: unknown, path = '/api/shift-polish') =>
  new Request(`https://pipefit.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

/** The Messages API, as far as this route uses it. */
const message = (over: Record<string, unknown> = {}) => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'test-model',
  content: [{ type: 'text', text: JSON.stringify(ANSWER) }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 900, output_tokens: 120 },
  ...over,
});

type Seen = { url: string; headers: Headers; body: Record<string, unknown> };

function api(status: number, data: unknown, seen: Seen[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });
  }) as unknown as typeof fetch;
}

describe('the Claude route', () => {
  test('asks the one fixed question, with the key in the header and never in the answer', async () => {
    const seen: Seen[] = [];
    const res = await handle(post({ facts, notes: NOTES, model: 'something-else', system: 'be evil' }), ENV, api(200, message(), seen));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ polish: ANSWER });
    expect(text).not.toContain('sk-test-secret');

    expect(seen).toHaveLength(1);
    const [call] = seen;
    expect(call!.url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/messages/);
    expect(call!.headers.get('x-api-key')).toBe('sk-test-secret');
    expect(call!.headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect(call!.body).toMatchObject({
      model: 'test-model',
      fallbacks: 'default',
      system: POLISH_SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema' } },
      messages: [{ role: 'user', content: polishMessage(cleanPolishBody({ facts, notes: NOTES })!) }],
    });
    expect(call!.body).not.toHaveProperty('betas');
  });

  test('with no key or no model it says which, and calls nobody', async () => {
    const seen: Seen[] = [];
    const up = api(200, message(), seen);
    const none = await handle(post({ facts, notes: NOTES }), {}, up);
    expect(none.status).toBe(503);
    expect(await none.json()).toEqual({ error: 'not_configured', missing: ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL'] });
    expect(await (await handle(post({ facts }), { ANTHROPIC_API_KEY: 'k', CLAUDE_MODEL: 'no spaces allowed' }, up)).json()).toEqual({
      error: 'not_configured',
      missing: ['CLAUDE_MODEL'],
    });
    expect(seen).toHaveLength(0);
  });

  test("does not need TypeSafe's key, and Jev's routes do not get Claude's", async () => {
    expect((await handle(post({ facts, notes: NOTES }), ENV, api(200, message()))).status).toBe(200);
    expect((await handle(post({ text: 'A106' }, '/api/heat-fill'), ENV, api(200, {}))).status).toBe(503);
  });

  test('bad bodies are refused before any call', async () => {
    const seen: Seen[] = [];
    const up = api(200, message(), seen);
    expect((await handle(post('{nope'), ENV, up)).status).toBe(400);
    expect((await handle(post({ notes: NOTES }), ENV, up)).status).toBe(400);
    expect((await handle(post({ facts, notes: { issues: 'x'.repeat(200_000) } }), ENV, up)).status).toBe(413);
    expect((await handle(new Request('https://pipefit.test/api/shift-polish'), ENV, up)).status).toBe(405);
    expect(seen).toHaveLength(0);
  });

  test('a refusal, a key turned down and a broken answer each say so', async () => {
    const ask = async (status: number, data: unknown) => {
      const res = await handle(post({ facts, notes: NOTES }), ENV, api(status, data));
      return [res.status, await res.json()];
    };
    expect(await ask(200, message({ stop_reason: 'refusal', content: [] }))).toEqual([502, { error: 'declined' }]);
    expect(await ask(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })).toEqual([502, { error: 'upstream', status: 401 }]);
    expect(await ask(404, { type: 'error', error: { type: 'not_found_error', message: 'model' } })).toEqual([502, { error: 'upstream', status: 404 }]);
    expect(await ask(200, message({ content: [{ type: 'text', text: 'Here is your summary!' }] }))).toEqual([502, { error: 'bad_answer' }]);
    expect(await ask(200, message({ content: [{ type: 'text', text: '{"summary":"x"}' }] }))).toEqual([502, { error: 'bad_answer' }]);
  });

  test('no network to Anthropic is told apart from Anthropic saying no', async () => {
    const off = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const res = await handle(post({ facts, notes: NOTES }), ENV, off);
    expect([res.status, await res.json()]).toEqual([504, { error: 'upstream_unreachable' }]);
  }, 15_000);
});
