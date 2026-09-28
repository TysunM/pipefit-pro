import { REFERENCE_TABLES } from '../calc/reference';
import {
  HANDBOOK_PICK_PATH,
  MAX_QUERY,
  checkHandbookPick,
  cleanQuery,
  fetchHandbookPick,
  handbookRequest,
  readHandbookAnswer,
} from '../ai/handbookPick';
import { JEV_MODEL } from '../ai/heatFill';
import { handle } from '../../worker/index';

// Smart handbook search, held to the contract
// -------------------------------------------
// Jev picks a table; the app only ever shows a table it has. The ids travel,
// never Jev's option keys, so a Worker and an app built from different
// handbooks cannot disagree about which table was meant.

const idx = (id: string) => REFERENCE_TABLES.findIndex((t) => t.id === id);
const key = (id: string) => `t${idx(id)}`;
const answer = (choice: string, confidence: number, probabilities: Record<string, number> = {}) => ({ type: 'choice', choice, confidence, probabilities });

describe('the question', () => {
  const r = handbookRequest('  how far does a 90 take out  ');

  test('one choice over every table plus none, in the API shape', () => {
    expect(r.model).toBe(JEV_MODEL);
    expect(r.state).toEqual({ query: 'how far does a 90 take out' });
    const q = r.questions.table;
    expect(q.type).toBe('choice');
    expect(q.instructions).toContain('`query`');
    expect(Object.keys(q.criteria)).toHaveLength(REFERENCE_TABLES.length + 1);
    expect(q.criteria.none).toBeTruthy();
    expect(Object.keys(q.criteria).length).toBeLessThanOrEqual(255);
  });

  test('each table is described by its title, group, columns and printed note — the shape that scored 33/33', () => {
    const d = r.questions.table.criteria[key('weld-elbows')]!;
    expect(d).toContain('Butt welding elbows and tees (Welded fittings)');
    expect(d).toContain('Columns: Size, LR 90°');
    expect(d).toMatch(/long radius elbow/i);
  });

  test('queries are printable, squeezed and capped', () => {
    expect(cleanQuery('a\u0000b\n  c')).toBe('a b c');
    expect(cleanQuery('x'.repeat(MAX_QUERY + 40))).toHaveLength(MAX_QUERY);
    expect(cleanQuery(42)).toBe('');
  });
});

describe("reading Jev's answer on the Worker", () => {
  test('the pick and the likely alternatives come back as ids, most likely first', () => {
    const p = readHandbookAnswer(
      answer(key('weld-elbows'), 0.82, { [key('weld-elbows')]: 0.82, [key('takeout-90')]: 0.12, [key('flanged-150')]: 0.03, none: 0.03 }),
    );
    expect(p).toEqual({ best: 'weld-elbows', confidence: 0.82, ranked: ['weld-elbows', 'takeout-90'] });
  });

  test('none is an answer: no table here holds it', () => {
    expect(readHandbookAnswer(answer('none', 0.9, { none: 0.9 }))).toEqual({ best: null, confidence: 0.9, ranked: [] });
  });

  test('a key that is no table, or anything malformed, is no pick', () => {
    for (const bad of [null, 'x', answer('t9999', 0.9), answer('weld-elbows', 0.9), { type: 'noul', noul: 1 }, { ...answer(key('pvc'), 0.8), confidence: 'high' }])
      expect(readHandbookAnswer(bad)).toBeNull();
  });
});

describe('checking the reply in the app', () => {
  test('only tables this build has are shown', () => {
    expect(checkHandbookPick({ pick: { best: 'pvc', confidence: 0.7, ranked: ['pvc', 'gone-table', 'threads'] } })).toEqual({
      best: 'pvc',
      confidence: 0.7,
      ranked: ['pvc', 'threads'],
    });
    expect(checkHandbookPick({ pick: { best: 'gone-table', confidence: 0.7, ranked: [] } })).toBeNull();
    expect(checkHandbookPick({ pick: null })).toBeNull();
    expect(checkHandbookPick('nope')).toBeNull();
  });

  test('a clean reply becomes a pick; no signal, a fault or an empty query is no pick', async () => {
    const ok = jest.fn(async () => new Response(JSON.stringify({ pick: { best: 'threads', confidence: 0.9, ranked: ['threads'] } }), { status: 200 }));
    expect(await fetchHandbookPick('https://x.test', 'tap drill for 1/2 npt', { fetchImpl: ok as unknown as typeof fetch })).toEqual({
      best: 'threads',
      confidence: 0.9,
      ranked: ['threads'],
    });
    const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://x.test${HANDBOOK_PICK_PATH}`);
    expect(JSON.parse(String(init.body))).toEqual({ query: 'tap drill for 1/2 npt' });

    const down = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await fetchHandbookPick('', 'weld cap', { fetchImpl: down as unknown as typeof fetch })).toBeNull();
    const off = jest.fn(async () => new Response('{"error":"not_configured"}', { status: 503 }));
    expect(await fetchHandbookPick('', 'weld cap', { fetchImpl: off as unknown as typeof fetch })).toBeNull();
    const never = jest.fn();
    expect(await fetchHandbookPick('', '   ', { fetchImpl: never as unknown as typeof fetch })).toBeNull();
    expect(never).not.toHaveBeenCalled();
  });

  test('a search typed over is abandoned, not left to land on the new one', async () => {
    const hang = jest.fn(
      (_u: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    const ctrl = new AbortController();
    const pending = fetchHandbookPick('', 'weld cap', { fetchImpl: hang as unknown as typeof fetch, signal: ctrl.signal });
    ctrl.abort();
    expect(await pending).toBeNull();
  });
});

describe('the Worker route', () => {
  const post = (body: unknown) =>
    new Request(`https://pipefit.test${HANDBOOK_PICK_PATH}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

  test('asks Jev the table question only, and hands back table ids, never the key or the usage', async () => {
    const up = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            model: 'jev-1',
            answers: { table: answer(key('threads'), 0.93, { [key('threads')]: 0.93, none: 0.07 }) },
            usage: { input_tokens: 2400, output_tokens: 0 },
          }),
          { status: 200 },
        ),
    );
    const res = await handle(post({ query: 'tap drill for 1/2 npt', questions: { evil: {} } }), { TYPESAFE_API_KEY: 'k-secret' }, up as unknown as typeof fetch);
    expect(res.status).toBe(200);
    const [, init] = up.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k-secret');
    const sent = JSON.parse(String(init.body));
    expect(sent).toEqual(handbookRequest('tap drill for 1/2 npt'));
    expect(sent.questions.evil).toBeUndefined();
    const out = await res.json();
    expect(out).toEqual({ pick: { best: 'threads', confidence: 0.93, ranked: ['threads'] }, model: 'jev-1' });
    expect(JSON.stringify(out)).not.toContain('k-secret');
    expect(JSON.stringify(out)).not.toContain('usage');
  });

  test('an empty or oversized query is refused before any call', async () => {
    const up = jest.fn();
    const env = { TYPESAFE_API_KEY: 'k' };
    expect((await handle(post({ query: '   ' }), env, up as unknown as typeof fetch)).status).toBe(400);
    expect((await handle(post({ nope: 1 }), env, up as unknown as typeof fetch)).status).toBe(400);
    expect((await handle(post({ query: 'x'.repeat(5000) }), env, up as unknown as typeof fetch)).status).toBe(413);
    expect(up).not.toHaveBeenCalled();
  });

  test('with no key set it says so and calls nobody', async () => {
    const up = jest.fn();
    expect((await handle(post({ query: 'weld cap' }), {}, up as unknown as typeof fetch)).status).toBe(503);
    expect(up).not.toHaveBeenCalled();
  });
});
