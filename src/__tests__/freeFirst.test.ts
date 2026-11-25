import { handle, resetClaudeSkip } from '../../worker/index';
import { FREE_MS } from '../../worker/workersAi';
import { checkPolish, cleanPolishBody, type Polish } from '../ai/shiftPolish';
import { ORIENTATION_PATH } from '../ai/orientation';
import { logFacts, shiftFacts } from '../calc/shiftReport';
import { newReport } from '../state/shiftLog';

// Every cloud route asks Cloudflare's free model first, and Claude only as the
// last resort: here, the shift report summary and the orientation course (the
// voice route and the box reader have their own: voiceClaude, sheetFree).

const T = new Date(2026, 8, 30, 7).getTime();
const facts = shiftFacts(
  { ...newReport('2026-09-30', 'BP-1', T), crew: 4, welds: [{ nps: 6, count: 8 }] },
  logFacts({ tests: [], joints: [], heats: [], readings: [], sketches: [] }, '2026-09-30', 'BP-1'),
);
const NOTES = { issues: 'crane late', safety: '', tomorrow: '', notes: '' };
const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const GOOD: Polish = { summary: 'The crew of 4 made 8 welds.', issues: 'The crane was late.', safety: '', tomorrow: '', notes: '' };
const COURSE = {
  title: 'Site rules',
  sections: [{ heading: 'Hard hats', points: ['Hard hats are worn everywhere past the gate.'] }],
  questions: [
    { q: 'Where are hard hats worn?', choices: ['Everywhere past the gate', 'Only in the shop'], answer: 0, why: 'Everywhere past the gate.' },
    { q: 'Who checks permits?', choices: ['The foreman', 'Nobody'], answer: 0, why: 'The foreman.' },
    { q: 'Is a hard hat optional in the yard?', choices: ['No', 'Yes'], answer: 0, why: 'The yard is past the gate.' },
  ],
};

const post = (path: string, body: unknown) =>
  new Request(`https://pipefit.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const ai = (answers: unknown[], ran: string[] = []) => ({
  run: async (model: string) => {
    ran.push(model);
    const a = answers.shift();
    if (a instanceof Error) throw a;
    return a;
  },
});
const anthropic = (answer: unknown, calls: { n: number } = { n: 0 }) =>
  (async () => {
    calls.n += 1;
    const message = { id: 'msg_1', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text: JSON.stringify(answer) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 900, output_tokens: 120 } };
    return new Response(JSON.stringify(message), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });
  }) as unknown as typeof fetch;

beforeEach(() => resetClaudeSkip());

describe('the shift report summary: the free model first, Claude last', () => {
  test('a summary true to the log from the free model is used, and Claude is never asked', async () => {
    const calls = { n: 0 };
    const res = await handle(post('/api/shift-polish', { facts, notes: NOTES }), { ...ENV, AI: ai([{ response: GOOD }]) }, anthropic(GOOD, calls));
    expect(await res.json()).toEqual({ polish: GOOD, engine: 'workers-ai' });
    expect(calls.n).toBe(0);
  });

  test('a free summary with a figure the log does not hold is turned down on the server, and Claude writes it', async () => {
    const made = { ...GOOD, summary: 'The crew of 5 made 8 welds.' };
    expect(checkPolish(cleanPolishBody({ facts, notes: NOTES })!, made).ok).toBe(false);
    const calls = { n: 0 };
    const res = await handle(post('/api/shift-polish', { facts, notes: NOTES }), { ...ENV, AI: ai([{ response: made }]) }, anthropic(GOOD, calls));
    expect(await res.json()).toEqual({ polish: GOOD, engine: 'claude' });
    expect(calls.n).toBe(1);
  });

  test('with no Claude key, the free model alone; its failure is said, nothing invented', async () => {
    const res = await handle(post('/api/shift-polish', { facts, notes: NOTES }), { AI: ai([new Error('4006: daily free allocation used')]) }, anthropic(GOOD));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'daily_limit' });
  });
});

describe('the orientation course: the free model first, Claude last', () => {
  test('a course in shape from the free model is used', async () => {
    const calls = { n: 0 };
    const res = await handle(post(ORIENTATION_PATH, { title: 'Site rules', text: 'Hard hats past the gate.', lang: 'en' }), { ...ENV, AI: ai([{ response: COURSE }]) }, anthropic(COURSE, calls));
    expect(await res.json()).toEqual({ course: COURSE, engine: 'workers-ai' });
    expect(calls.n).toBe(0);
  });

  test('a course with too few questions is no course: Claude builds it', async () => {
    const calls = { n: 0 };
    const thin = { ...COURSE, questions: COURSE.questions.slice(0, 1) };
    const res = await handle(post(ORIENTATION_PATH, { title: 'Site rules', text: 'Hard hats past the gate.', lang: 'en' }), { ...ENV, AI: ai([{ response: thin }]) }, anthropic(COURSE, calls));
    expect(await res.json()).toEqual({ course: COURSE, engine: 'claude' });
    expect(calls.n).toBe(1);
  });
});

describe('the time each free model gets leaves Claude room inside what the phone waits', () => {
  test.each([
    ['voice', FREE_MS.voice, 15_000, 25_000],
    ['sheet', FREE_MS.sheet, 45_000, 85_000],
    ['polish', FREE_MS.polish, 35_000, 60_000],
    ['course', FREE_MS.course, 65_000, 115_000],
  ])('%s', (_name, free, claude, phone) => expect(free + claude).toBeLessThan(phone));
});
