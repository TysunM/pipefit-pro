import { handle, resetClaudeSkip } from '../../worker/index';
import { DEFAULT_AI_MODEL, DEFAULT_AI_VISION_MODEL } from '../../worker/workersAi';
import { FITTING_SHEET_PATH, readSheet, sheetMissOf, sheetMissWords } from '../ai/fittingSheet';

const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJCcuIC';
const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const post = (body: unknown) =>
  new Request(`https://pipefit.test${FITTING_SHEET_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
/** A 2" PVC 45 off a box label, as a model would give it back. */
const READ = { unit: 'in', maker: 'Spears', schedule: '40', material: 'PVC', rows: [{ fitting: 'sock45', nps: 2, takeout: 1.75, centreToEnd: 0, socketDepth: 0, label: 'G' }], unread: '' };

type Ran = { model: string; inputs: Record<string, unknown> };
const ai = (answers: unknown[], ran: Ran[] = []) => ({
  run: async (model: string, inputs: Record<string, unknown>) => {
    ran.push({ model, inputs });
    const a = answers.shift();
    if (a instanceof Error) throw a;
    return a;
  },
});
/** Anthropic, answering with a status and a body; counts the calls. */
const anthropic = (status: number, data: unknown, calls: { n: number } = { n: 0 }) =>
  (async () => {
    calls.n += 1;
    return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });
  }) as unknown as typeof fetch;

beforeEach(() => resetClaudeSkip());

describe('a box label read by the free helper, when Claude is not paid for', () => {
  test('with no Claude key the picture goes to the vision model, as the chat format\'s image part, held to the sheet schema', async () => {
    const ran: Ran[] = [];
    const res = await handle(post({ image: JPEG, family: 'socket' }), { AI: ai([{ response: READ }], ran) }, anthropic(200, {}));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sheet: readSheet(READ, 'socket'), engine: 'workers-ai' });
    expect(ran[0]!.model).toBe(DEFAULT_AI_VISION_MODEL);
    const user = (ran[0]!.inputs.messages as { role: string; content: unknown }[])[1]!;
    expect(user.content).toEqual([
      { type: 'text', text: expect.stringContaining('PVC or CPVC socket') },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${JPEG}` } },
    ]);
    expect((ran[0]!.inputs.response_format as { type: string }).type).toBe('json_schema');
  });

  test('Claude out of credit: the free helper reads it instead', async () => {
    const res = await handle(
      post({ image: JPEG, family: 'socket' }),
      { ...ENV, AI: ai([{ response: READ }]) },
      anthropic(400, { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }),
    );
    expect(await res.json()).toEqual({ sheet: readSheet(READ, 'socket'), engine: 'workers-ai' });
  });

  test('a model that will not hold to the schema is asked once more for plain JSON', async () => {
    const ran: Ran[] = [];
    const res = await handle(post({ image: JPEG, family: 'socket' }), { AI: ai([new Error("JSON Mode couldn't be met"), { response: `Here it is: ${JSON.stringify(READ)}` }], ran) }, anthropic(200, {}));
    expect(await res.json()).toEqual({ sheet: readSheet(READ, 'socket'), engine: 'workers-ai' });
    expect(ran).toHaveLength(2);
    expect(ran[1]!.inputs.response_format).toBeUndefined();
  });

  test('the day\'s allowance spent, and an answer out of shape, are said plainly on the phone', async () => {
    const spent = await handle(post({ image: JPEG, family: 'socket' }), { AI: ai([new Error('4006: you have used up your daily free allocation of 10,000 neurons')]) }, anthropic(200, {}));
    expect(spent.status).toBe(429);
    expect(sheetMissWords(sheetMissOf(429, await spent.json()))).toMatch(/midnight UTC/);
    const odd = await handle(post({ image: JPEG, family: 'socket' }), { AI: ai([{ response: { rows: 'none' } }]) }, anthropic(200, {}));
    expect(odd.status).toBe(502);
    expect(sheetMissOf(502, await odd.json())).toBe('unread');
  });

  test('the vision model is its own setting, apart from the voice one', async () => {
    const ran: Ran[] = [];
    await handle(post({ image: JPEG, family: 'nohub' }), { AI: ai([{ response: { ...READ, rows: [] } }], ran), WORKERS_AI_MODEL: '@cf/meta/llama-3.1-8b-instruct', WORKERS_AI_VISION_MODEL: '@cf/google/gemma-3-12b-it' }, anthropic(200, {}));
    expect(ran[0]!.model).toBe('@cf/google/gemma-3-12b-it');
    expect(DEFAULT_AI_VISION_MODEL).not.toBe(DEFAULT_AI_MODEL);
    const bad = await handle(post({ image: JPEG, family: 'socket' }), { AI: ai([]), WORKERS_AI_VISION_MODEL: 'scout please' }, anthropic(200, {}));
    expect(await bad.json()).toEqual({ error: 'not_configured', missing: ['WORKERS_AI_VISION_MODEL'] });
  });

  test('a picture that is not one is refused before any model is asked', async () => {
    const ran: Ran[] = [];
    const res = await handle(post({ image: 'not a picture', family: 'socket' }), { AI: ai([], ran) }, anthropic(200, {}));
    expect(res.status).toBe(400);
    expect(ran).toHaveLength(0);
  });

  test('Claude answering is used, and the free helper is never asked', async () => {
    const ran: Ran[] = [];
    const calls = { n: 0 };
    const res = await handle(
      post({ image: JPEG, family: 'socket' }),
      { ...ENV, AI: ai([{ response: READ }], ran) },
      anthropic(200, { id: 'msg_1', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text: JSON.stringify(READ) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1500, output_tokens: 90 } }, calls),
    );
    expect(await res.json()).toEqual({ sheet: readSheet(READ, 'socket') });
    expect(calls.n).toBe(1);
    expect(ran).toHaveLength(0);
  });
});
