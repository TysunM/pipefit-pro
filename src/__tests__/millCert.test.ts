import { handle, resetClaudeSkip } from '../../worker/index';
import { DEFAULT_AI_VISION_MODEL } from '../../worker/workersAi';
import { MILL_CERT_PATH, askMillCert, certRows, certStatusWords, keepCert, millMissOf, millMissWords, readMill, toggleCert, type MillRead } from '../ai/millCert';
import { newHeat } from '../calc/heat';
import { emptyBook, findHeat, putHeat } from '../state/heatBook';

const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJCcuIC';
const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const post = (body: unknown) => new Request(`https://pipefit.test${MILL_CERT_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
/** Two heats off a 316L tube cert, one printed scaled ×1000. */
const READ = {
  mill: 'Sandvik',
  certNo: 'MTR-4471',
  heats: [
    { heat: '541277', s: 0.012, sPrinted: '0.012', analysis: 'product', spec: 'ASTM A270 TP316L' },
    { heat: '541300', s: 0.002, sPrinted: '2 (x1000)', analysis: 'heat', spec: 'ASTM A270 TP316L' },
  ],
  unread: '',
};
type Ran = { model: string; inputs: Record<string, unknown> };
const ai = (answers: unknown[], ran: Ran[] = []) => ({
  run: async (model: string, inputs: Record<string, unknown>) => {
    ran.push({ model, inputs });
    const a = answers.shift();
    if (a instanceof Error) throw a;
    return a;
  },
});
const claude = (answer: unknown, calls: { n: number } = { n: 0 }) =>
  (async () => {
    calls.n += 1;
    const message = { id: 'msg_1', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text: JSON.stringify(answer) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1500, output_tokens: 90 } };
    return new Response(JSON.stringify(message), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } });
  }) as unknown as typeof fetch;

beforeEach(() => resetClaudeSkip());

describe('a mill cert read on the server: the free reader first, Claude last', () => {
  test('the picture goes to the vision model as its image part, held to the schema; Claude is never asked', async () => {
    const ran: Ran[] = [];
    const calls = { n: 0 };
    const res = await handle(post({ image: JPEG }), { ...ENV, AI: ai([{ response: READ }], ran) }, claude(READ, calls));
    expect(await res.json()).toEqual({ cert: readMill(READ), engine: 'workers-ai' });
    expect(ran[0]!.model).toBe(DEFAULT_AI_VISION_MODEL);
    const user = (ran[0]!.inputs.messages as { content: unknown }[])[1]!.content as { type: string }[];
    expect(user.map((p) => p.type)).toEqual(['text', 'image_url']);
    expect((ran[0]!.inputs.response_format as { type: string }).type).toBe('json_schema');
    expect(calls.n).toBe(0);
  });
  test('a cert the free reader reads no heat off goes to Claude', async () => {
    const calls = { n: 0 };
    const res = await handle(post({ image: JPEG }), { ...ENV, AI: ai([{ response: { ...READ, heats: [], unread: 'Too blurred.' } }]) }, claude(READ, calls));
    expect(await res.json()).toEqual({ cert: readMill(READ), engine: 'claude' });
    expect(calls.n).toBe(1);
  });
  test('with no Claude, the free reader alone: the day spent is said; a picture that is not one is refused before any model', async () => {
    const spent = await handle(post({ image: JPEG }), { AI: ai([new Error('4006: daily free allocation used')]) }, claude(READ));
    expect(spent.status).toBe(429);
    expect(millMissWords(millMissOf(429, await spent.json()))).toMatch(/midnight UTC/);
    const ran: Ran[] = [];
    const bad = await handle(post({ image: 'not a picture' }), { AI: ai([], ran) }, claude(READ));
    expect(bad.status).toBe(400);
    expect(ran).toHaveLength(0);
  });
});

describe('the answer held to shape', () => {
  test('a heat with no number, or a sulphur not printed, is no figure', () => {
    const r = readMill({ mill: 'X', certNo: '', unread: '', heats: [{ heat: '', s: 0.01, sPrinted: '0.01', analysis: '', spec: '' }, { heat: 'H1', s: 0, sPrinted: '', analysis: 'heat', spec: '' }, { heat: 'H2', s: 0.01, sPrinted: '', analysis: 'odd', spec: '' }, { heat: 'H3', s: 7, sPrinted: '7', analysis: '', spec: '' }] })!;
    expect(r.heats.map((h) => [h.heat, h.s])).toEqual([['H1', null], ['H2', null], ['H3', null]]);
    expect(r.heats[1]!.analysis).toBe('');
    expect(readMill({ heats: 'none' })).toBeNull();
  });
  test('on the phone: a reply out of shape is the reader down, no signal is offline', async () => {
    const ok = (async () => new Response(JSON.stringify({ cert: READ }), { status: 200 })) as unknown as typeof fetch;
    expect(await askMillCert('https://x', JPEG, { fetchImpl: ok })).toEqual(readMill(READ));
    const offline = (async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    expect(await askMillCert('https://x', JPEG, { fetchImpl: offline })).toBe('offline');
    expect(await askMillCert('https://x', 'nope', { fetchImpl: ok })).toBe('not_image');
  });
});

describe('each heat read, set against the heat book', () => {
  const T = 1;
  const book = [{ ...newHeat('541277', T), sulphur: null, material: 'A270 316L' }, { ...newHeat('541300', T), sulphur: 0.004 }, { ...newHeat('998', T), sulphur: 0.01 }].reduce(putHeat, emptyBook());
  const read = (heats: MillRead['heats']): MillRead => ({ mill: 'Sandvik', certNo: 'MTR-4471', heats, unread: '' });
  const h = (heat: string, s: number | null, spec = 'A270 TP316L') => ({ heat, s, sPrinted: s === null ? '' : String(s), analysis: '' as const, spec });

  test('new, fills in, the same, a change: only new and fills-in start ticked', () => {
    const rows = certRows(read([h('NEW1', 0.008), h('541277', 0.012), h('998', 0.01), h('541300', 0.002)]), book);
    expect(rows.map((r) => [r.heat, r.status, r.pick])).toEqual([
      ['NEW1', 'new', true],
      ['541277', 'adds', true],
      ['998', 'same', false],
      ['541300', 'changes', false],
    ]);
    expect(certStatusWords(rows[3]!).text).toBe('Replaces 0.004%');
  });
  test('a heat read twice with two figures, a figure past what a cert prints, and no figure wait for a tick', () => {
    const rows = certRows(read([h('A9', 0.01), h('a-9', 0.02), h('B9', 0.3), h('C9', 0.25, 'A582 TP303'), h('D9', null)]), book);
    expect(rows.map((r) => [r.status, r.pick])).toEqual([['twice', false], ['twice', false], ['check', false], ['new', true], ['no-figure', false]]);
    const one = toggleCert(rows, rows[0]!.id);
    const other = toggleCert(one, rows[1]!.id);
    expect(other.slice(0, 2).map((r) => r.pick)).toEqual([false, true]);
    expect(toggleCert(rows, rows[4]!.id)[4]!.pick).toBe(false);
  });
  test('kept: the sulphur always; the spec, mill and cert number only into boxes still empty', () => {
    const rows = certRows(read([h('NEW1', 0.008), h('541277', 0.012), h('541300', 0.002)]), book);
    const out = keepCert(book, read([]), rows, 50);
    expect([out.added, out.updated]).toEqual([1, 1]);
    expect(findHeat(out.book, 'NEW1')).toMatchObject({ sulphur: 0.008, material: 'A270 TP316L', mill: 'Sandvik', mtr: 'MTR-4471', updatedAt: 50 });
    expect(findHeat(out.book, '541277')).toMatchObject({ sulphur: 0.012, material: 'A270 316L', mill: 'Sandvik' });
    expect(findHeat(out.book, '541300')!.sulphur).toBe(0.004);
  });
});
