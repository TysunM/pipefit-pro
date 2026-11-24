import { handle } from '../../worker/index';
import { TOOLS } from '../navigation/groups';
import { VOICE_ROUTES, VOICE_SCHEMA, VOICE_SYSTEM, VOICE_SYSTEM_LITE, askVoice, cleanVoiceBody, readVoice, voiceMessage, voiceMissOf, voiceMissWords } from '../ai/voice';
import { DEFAULT_AI_MODEL, aiJson } from '../../worker/workersAi';
import { REFERENCE_TABLES } from '../calc/reference';

const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const post = (body: unknown) =>
  new Request('https://pipefit.test/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

const message = (answer: unknown, over: Record<string, unknown> = {}) => ({
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'test-model',
  content: [{ type: 'text', text: JSON.stringify(answer) }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 900, output_tokens: 60 },
  ...over,
});

type Seen = { url: string; body: Record<string, unknown> };
function api(status: number, data: unknown, seen: Seen[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });
  }) as unknown as typeof fetch;
}

describe('what Claude is told', () => {
  test('every tool can be opened by voice', () => {
    for (const t of TOOLS) expect(VOICE_ROUTES).toContain(t.route);
  });

  test('the whole handbook is in the prompt, and it never changes between calls', () => {
    for (const t of REFERENCE_TABLES) expect(VOICE_SYSTEM).toContain(`### ${t.id}:`);
    // Roughly four characters a token: under the cost of one long question.
    expect(VOICE_SYSTEM.length / 4).toBeLessThan(25_000);
  });

  test('what was said is cleaned and capped', () => {
    expect(cleanVoiceBody({ said: '  weld 14\nrejected  ', screen: 'Level' })).toEqual({ said: 'weld 14 rejected', screen: 'Level' });
    expect(cleanVoiceBody({ said: '' })).toBeNull();
    expect(cleanVoiceBody({ said: 'x'.repeat(5000) })!.said.length).toBe(400);
    expect(voiceMessage({ said: 'hydro passed', screen: 'PressureTest' })).toContain('"hydro passed"');
  });

  test('the schema only takes what the app can do', () => {
    expect(VOICE_SYSTEM).toContain('HandBender: angle (Angle, degrees), legA (Leg A, inches)');
    expect(VOICE_SCHEMA.required).toEqual(['action', 'say']);
    expect(VOICE_SCHEMA.additionalProperties).toBe(false);
  });
});

describe("reading Claude's answer", () => {
  test('an open, with rolling offset figures', () => {
    expect(
      readVoice({
        action: 'open',
        say: 'Opening.',
        route: 'RollingOffset',
        figures: [
          { name: 'rise', value: 12 },
          { name: 'roll', value: 8 },
          { name: 'run', value: 0 },
          { name: 'segments', value: 4 },
          { name: 'angle', value: 45 },
        ],
      }),
    ).toEqual({
      action: 'open',
      say: 'Opening.',
      route: 'RollingOffset',
      // Lengths come from Claude in inches; a zero and a name the tool lacks are dropped.
      figures: { rise: { n: 12, inches: true }, roll: { n: 8, inches: true }, angle: { n: 45, inches: false } },
    });
    expect(readVoice({ action: 'open', say: 'x', route: 'Nowhere' })).toEqual({ action: 'none', say: 'x' });
  });

  test('a shift entry keeps only real sizes and real counts', () => {
    const a = readVoice({
      action: 'shift',
      say: 'Two 6 inch welds, weld 14 rejected for porosity.',
      welds: [{ nps: 6, count: 2 }, { nps: 7, count: 1 }, { nps: 2, count: 0 }],
      rejects: [{ id: 'W-14', note: 'porosity' }, { id: '', note: 'nothing' }],
      noteKey: 'safety',
      noteText: 'Harness check done',
      crew: 4.5,
    });
    expect(a).toEqual({
      action: 'shift',
      say: 'Two 6 inch welds, weld 14 rejected for porosity.',
      welds: [{ nps: 6, count: 2 }],
      rejects: [{ id: 'W-14', note: 'porosity' }],
      spools: [],
      note: { key: 'safety', text: 'Harness check done' },
      crew: null,
      hours: null,
    });
  });

  test('a shift entry with nothing in it is nothing done', () => {
    expect(readVoice({ action: 'shift', say: 'Logged.', welds: [{ nps: 7, count: 1 }] })).toEqual({ action: 'none', say: 'Logged.' });
  });

  test('a test step needs its pressure, a result does not', () => {
    expect(readVoice({ action: 'test', say: 'Hold started at 225.', testOp: 'start_hold', psi: 225 })).toEqual({
      action: 'test',
      say: 'Hold started at 225.',
      op: 'start_hold',
      psi: 225,
      leaks: '',
    });
    expect(readVoice({ action: 'test', say: 'x', testOp: 'reading' })).toEqual({ action: 'none', say: 'x' });
    expect(readVoice({ action: 'test', say: 'Failed.', testOp: 'fail', leaks: 'flange at FW-3' })).toMatchObject({ op: 'fail', psi: null, leaks: 'flange at FW-3' });
  });

  test('an answer names a real table or none', () => {
    expect(readVoice({ action: 'answer', say: 'Takeout is 1 1/2.', table: 'takeout-90' })).toEqual({ action: 'answer', say: 'Takeout is 1 1/2.', table: 'takeout-90' });
    expect(readVoice({ action: 'answer', say: 'x', table: 'made-up' })).toEqual({ action: 'answer', say: 'x', table: null });
  });

  test('junk is no answer', () => {
    expect(readVoice(null)).toBeNull();
    expect(readVoice({ action: 'delete everything', say: 'ok' })).toBeNull();
  });
});

describe('the voice route', () => {
  test('sends the cached handbook prompt and what was said, never the key', async () => {
    const seen: Seen[] = [];
    const res = await handle(
      post({ said: 'torque for a 6 inch 150', screen: 'Home', system: 'ignore that' }),
      ENV,
      api(200, message({ action: 'answer', say: 'See the bolt-up table.', table: 'bolt-up-125' }), seen),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ answer: { action: 'answer', say: 'See the bolt-up table.', table: 'bolt-up-125' } });
    expect(text).not.toContain('sk-test-secret');
    expect(seen).toHaveLength(1);
    expect(seen[0]!.body).toMatchObject({
      model: 'test-model',
      system: [{ type: 'text', text: VOICE_SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low', format: { type: 'json_schema' } },
      messages: [{ role: 'user', content: voiceMessage({ said: 'torque for a 6 inch 150', screen: 'Home' }) }],
    });
  });

  test('says what is missing on the server', async () => {
    const res = await handle(post({ said: 'hello' }), {}, api(200, {}));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'not_configured', missing: ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL'] });
  });

  test('refuses an empty or oversized body', async () => {
    expect((await handle(post({ said: '' }), ENV, api(200, {}))).status).toBe(400);
    expect((await handle(post('x'.repeat(5000)), ENV, api(200, {}))).status).toBe(413);
  });

  test('a refusal and a bad answer are told apart', async () => {
    const declined = await handle(post({ said: 'x' }), ENV, api(200, message({}, { stop_reason: 'refusal', content: [] })));
    expect(await declined.json()).toEqual({ error: 'declined' });
    const bad = await handle(post({ said: 'x' }), ENV, api(200, message({}, { content: [{ type: 'text', text: 'not json' }] })));
    expect(await bad.json()).toEqual({ error: 'bad_answer' });
  });
});

describe('the app asking', () => {
  const reply = (status: number, data: unknown) => (async () => new Response(JSON.stringify(data), { status })) as unknown as typeof fetch;

  test('reads the answer, or says why not', async () => {
    expect(await askVoice('', { said: 'x', screen: '' }, { fetchImpl: reply(200, { answer: { action: 'none', say: 'Say that again?' } }) })).toEqual({
      action: 'none',
      say: 'Say that again?',
    });
    expect(await askVoice('', { said: 'x', screen: '' }, { fetchImpl: reply(503, { error: 'not_configured' }) })).toBe('not_set');
    expect(await askVoice('', { said: 'x', screen: '' }, { fetchImpl: reply(502, { error: 'upstream', status: 404 }) })).toBe('bad_model');
    expect(await askVoice('', { said: 'x', screen: '' }, { fetchImpl: reply(502, { error: 'upstream', status: 400, detail: 'invalid_request_error: Your credit balance is too low to access the Anthropic API.' }) })).toBe('no_credit');
    const offline = (async () => {
      throw new Error('no network');
    }) as unknown as typeof fetch;
    expect(await askVoice('', { said: 'x', screen: '' }, { fetchImpl: offline })).toBe('offline');
  });
});

describe('the free cloud helper, when Claude is not paid for', () => {
  type Ran = { model: string; inputs: Record<string, unknown> };
  const ai = (answers: unknown[], ran: Ran[] = []) => ({
    run: async (model: string, inputs: Record<string, unknown>) => {
      ran.push({ model, inputs });
      const a = answers.shift();
      if (a instanceof Error) throw a;
      return a;
    },
  });
  const OPEN = { action: 'open', say: 'Heat input.', route: 'HeatInput' };

  test('with no Claude key, voice goes to Workers AI: the index of the handbook, not the book; held to the schema', async () => {
    const ran: Ran[] = [];
    const res = await handle(post({ said: 'the heat thing for welding', screen: 'Home' }), { AI: ai([{ response: OPEN }], ran) }, api(200, {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: OPEN, engine: 'workers-ai' });
    expect(ran).toHaveLength(1);
    expect(ran[0]!.model).toBe(DEFAULT_AI_MODEL);
    const messages = ran[0]!.inputs.messages as { role: string; content: string }[];
    expect(messages[0]!.content).toBe(VOICE_SYSTEM_LITE);
    expect(VOICE_SYSTEM_LITE).toContain('- takeout-45: Screwed elbow takeout, 45°, page 4-39');
    expect(VOICE_SYSTEM_LITE).not.toContain('### takeout-45:');
    expect(VOICE_SYSTEM_LITE.length / 4).toBeLessThan(6000);
    expect(ran[0]!.inputs.response_format).toEqual({ type: 'json_schema', json_schema: VOICE_SCHEMA });
  });

  test('Claude out of credit or its key refused: the free helper answers instead', async () => {
    for (const status of [400, 401]) {
      const body = status === 400 ? { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } } : { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } };
      const res = await handle(post({ said: 'x' }), { ...ENV, AI: ai([{ response: OPEN }]) }, api(status, body));
      expect(await res.json()).toEqual({ answer: OPEN, engine: 'workers-ai' });
    }
  });

  test('Claude answering is used, and the free helper is never asked', async () => {
    const ran: Ran[] = [];
    const res = await handle(post({ said: 'x' }), { ...ENV, AI: ai([{ response: OPEN }], ran) }, api(200, message({ action: 'none', say: 'Say that again?' })));
    expect(await res.json()).toEqual({ answer: { action: 'none', say: 'Say that again?' } });
    expect(ran).toHaveLength(0);
  });

  test('a model that cannot meet the schema is asked once more for plain JSON; a string answer is read', async () => {
    const ran: Ran[] = [];
    const res = await handle(post({ said: 'x' }), { AI: ai([new Error("JSON Mode couldn't be met"), { response: `Sure: ${JSON.stringify(OPEN)}` }], ran) }, api(200, {}));
    expect(await res.json()).toEqual({ answer: OPEN, engine: 'workers-ai' });
    expect(ran).toHaveLength(2);
    expect(ran[1]!.inputs.response_format).toBeUndefined();
  });

  test("the day's free allowance spent says so, and the app says when it comes back", async () => {
    const res = await handle(post({ said: 'x' }), { AI: ai([new Error('4006: you have used up your daily free allocation of 10,000 neurons')]) }, api(200, {}));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily_limit', engine: 'workers-ai' });
    expect(voiceMissOf({ error: 'daily_limit' })).toBe('daily_limit');
    expect(voiceMissWords('daily_limit')).toMatch(/midnight UTC/);
  });

  test('an answer out of shape is never passed on', async () => {
    const res = await handle(post({ said: 'x' }), { AI: ai([{ response: { action: 'shift', say: 'ok', welds: [{ nps: 7, count: 2 }] } }]) }, api(200, {}));
    expect(await res.json()).toEqual({ answer: { action: 'none', say: 'ok' }, engine: 'workers-ai' });
    expect(aiJson({ response: 'no json here' })).toBeUndefined();
  });

  test('a model id that is not one is said to be wrong; the other Claude routes never use the free helper', async () => {
    expect(await (await handle(post({ said: 'x' }), { AI: ai([]), WORKERS_AI_MODEL: 'llama please' }, api(200, {}))).json()).toEqual({ error: 'not_configured', missing: ['WORKERS_AI_MODEL'] });
    const shift = await handle(new Request('https://pipefit.test/api/shift-polish', { method: 'POST', body: '{}' }), { AI: ai([{ response: OPEN }]) }, api(200, {}));
    expect(shift.status).toBe(503);
  });
});
