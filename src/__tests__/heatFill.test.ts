import {
  JEV_MODEL,
  MAX_CANDIDATES,
  MAX_TEXT,
  OFFER_AT,
  cleanCandidates,
  cleanText,
  describeDetails,
  describeHeatDetails,
  detailsOf,
  fetchHeatFill,
  heatQuestions,
  heatRequest,
  readHeatAnswers,
} from '../ai/heatFill';
import { handle } from '../../worker/index';

// Smart fill, held to the contract
// --------------------------------
// The request must be exactly what TypeSafe's POST /v1/systemone takes (the
// shape in @typesafe-ai/sdk 0.6.0's types), Jev may only ever choose, never
// invent, and every way it can fail must leave the scanner as it was.

const CANDS = ['E7Z419', 'K2231', '4501'];

const choiceAns = (choice: string, confidence: number) => ({ type: 'choice', choice, confidence, probabilities: {} });

describe('the questions', () => {
  const qs = heatQuestions(CANDS);

  test('every question is a choice in the API shape, with a way to say none', () => {
    for (const q of Object.values(qs)) {
      expect(q.type).toBe('choice');
      expect(typeof q.instructions).toBe('string');
      expect(q.instructions).toContain('`ocr_text`');
      expect(q.criteria.none).toBeTruthy();
      expect(Object.keys(q.criteria).length).toBeLessThanOrEqual(255);
      for (const d of Object.values(q.criteria)) expect(typeof d).toBe('string');
    }
  });

  test('the heat can only be one of the strings the scanner found', () => {
    expect(Object.keys(qs.heat!.criteria)).toEqual(['c0', 'c1', 'c2', 'none']);
    expect(qs.heat!.criteria.c0).toContain('E7Z419');
  });

  test('with no candidates the heat is not asked at all, the rest still is', () => {
    const none = heatQuestions([]);
    expect(none.heat).toBeUndefined();
    expect(Object.keys(none).sort()).toEqual(['form', 'material', 'schedule', 'size']);
  });

  test('the request names the model and puts the text under ocr_text', () => {
    const r = heatRequest('HEAT E7Z419  A106 GR B  6" SCH 40', CANDS);
    expect(r.model).toBe(JEV_MODEL);
    expect(r.state).toEqual({ ocr_text: 'HEAT E7Z419 A106 GR B 6" SCH 40' });
    expect(Object.keys(r.questions)).toContain('heat');
  });
});

describe('what goes out is bounded', () => {
  test('text is printable, squeezed and capped', () => {
    expect(cleanText('A\u0000B  \t C\n')).toBe('A B C');
    expect(cleanText('x'.repeat(MAX_TEXT + 50))).toHaveLength(MAX_TEXT);
  });

  test('candidates are strings, short, unique and few', () => {
    const many = Array.from({ length: 40 }, (_, i) => `H${i}`);
    expect(cleanCandidates(many)).toHaveLength(MAX_CANDIDATES);
    expect(cleanCandidates(['A1', 'A1', 7, '', 'x'.repeat(99), ' B2 '])).toEqual(['A1', 'B2']);
  });
});

describe('reading the answers', () => {
  const good = {
    heat: choiceAns('c1', 0.93),
    material: choiceAns('a106b', 0.88),
    form: choiceAns('pipe', 0.8),
    size: choiceAns('nps6', 0.91),
    schedule: choiceAns('sch40', 0.86),
  };

  test('confident answers become offers with the app\'s own values', () => {
    const fill = readHeatAnswers(good, CANDS);
    expect(fill.heat).toEqual({ value: 'K2231', label: 'K2231', confidence: 0.93 });
    expect(fill.material?.value).toBe('A106 Gr B');
    expect(fill.form?.value).toBe('pipe');
    expect(fill.nps?.value).toBe(6);
    expect(fill.schedule?.value).toBe('40');
    expect(detailsOf(fill)).toEqual({ material: 'A106 Gr B', form: 'pipe', nps: 6, schedule: '40' });
    expect(describeDetails(fill)).toBe('A106 Gr B · 6" · SCH 40 · Pipe');
    expect(describeHeatDetails(detailsOf(fill))).toBe('A106 Gr B · 6" · SCH 40 · Pipe');
  });

  test('unsure, none and unknown answers are left out, not guessed', () => {
    const fill = readHeatAnswers(
      {
        heat: choiceAns('c0', OFFER_AT - 0.01),
        material: choiceAns('none', 0.99),
        form: choiceAns('spaceship', 0.99),
        size: choiceAns('nps6', OFFER_AT),
      },
      CANDS,
    );
    expect(fill).toEqual({ nps: { value: 6, label: '6"', confidence: OFFER_AT } });
  });

  test('a heat answer pointing past the candidates is ignored', () => {
    expect(readHeatAnswers({ heat: choiceAns('c9', 0.99) }, CANDS).heat).toBeUndefined();
  });

  test('anything malformed off the network reads as nothing', () => {
    for (const bad of [null, 'x', 42, [], { heat: { type: 'noul', noul: 1 } }, { heat: { type: 'choice', choice: 'c0', confidence: 'high' } }])
      expect(readHeatAnswers(bad, CANDS)).toEqual({});
  });

  test('the grade decides the form when the two disagree (the lab: CONC RED read as pipe at 96%)', () => {
    const fill = readHeatAnswers({ material: choiceAns('a420wpl6', 0.9), form: choiceAns('pipe', 0.96) }, CANDS);
    expect(fill.form).toEqual({ value: 'fitting', label: 'Fitting', confidence: 0.9 });
  });

  test('a grade with one possible form fills it in when Jev left it blank', () => {
    expect(readHeatAnswers({ material: choiceAns('a193b7', 0.8) }, CANDS).form?.value).toBe('bolting');
    expect(readHeatAnswers({ material: choiceAns('a516g70', 0.8), form: choiceAns('none', 0.9) }, CANDS).form?.value).toBe('plate');
  });

  test('a forging can be a flange or a fitting, so neither is guessed, and pipe is refused', () => {
    expect(readHeatAnswers({ material: choiceAns('a105', 0.9) }, CANDS).form).toBeUndefined();
    expect(readHeatAnswers({ material: choiceAns('a105', 0.9), form: choiceAns('flange', 0.8) }, CANDS).form?.value).toBe('flange');
    expect(readHeatAnswers({ material: choiceAns('a105', 0.9), form: choiceAns('pipe', 0.8) }, CANDS).form).toBeUndefined();
  });

  test('a stainless schedule on carbon steel is left blank (the lab: SCH 40 on A106 read as 40S)', () => {
    expect(readHeatAnswers({ material: choiceAns('a106b', 0.9), schedule: choiceAns('sch40s', 0.85) }, CANDS).schedule).toBeUndefined();
    expect(readHeatAnswers({ material: choiceAns('a312tp304', 0.9), schedule: choiceAns('sch40s', 0.85) }, CANDS).schedule?.value).toBe('40S');
    // With no grade to check against, the schedule stands as read.
    expect(readHeatAnswers({ schedule: choiceAns('sch40s', 0.85) }, CANDS).schedule?.value).toBe('40S');
  });

  test('an unsure grade decides nothing', () => {
    const fill = readHeatAnswers({ material: choiceAns('a420wpl6', OFFER_AT - 0.1), form: choiceAns('pipe', 0.96) }, CANDS);
    expect(fill.material).toBeUndefined();
    expect(fill.form?.value).toBe('pipe');
  });

  test('the schedule choices say plainly that 40 and 40S are different markings', () => {
    const c = heatQuestions(CANDS).schedule!.criteria;
    expect(c.sch40s).toMatch(/only when an S follows the number/);
    expect(c.sch40).toMatch(/no S after the number/);
  });

  test('standard weight reads as STD, not a numbered schedule', () => {
    expect(readHeatAnswers({ schedule: choiceAns('schstd', 0.9) }, CANDS).schedule).toEqual({ value: 'STD', label: 'STD', confidence: 0.9 });
  });
});

describe('the app asking the Worker', () => {
  const ok = (body: unknown, status = 200) =>
    jest.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  test('a clean answer becomes a fill', async () => {
    const f = ok({ answers: { heat: choiceAns('c0', 0.9) } });
    const fill = await fetchHeatFill('https://x.test', 'HEAT E7Z419', CANDS, { fetchImpl: f as unknown as typeof fetch });
    expect(fill?.heat?.value).toBe('E7Z419');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.test/api/heat-fill');
    expect(JSON.parse(String(init.body))).toEqual({ text: 'HEAT E7Z419', candidates: CANDS });
  });

  test('no signal, a server fault or a timeout all come back as no fill', async () => {
    const down = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await fetchHeatFill('', 'HEAT E7Z419', CANDS, { fetchImpl: down as unknown as typeof fetch })).toBeNull();
    expect(await fetchHeatFill('', 'HEAT E7Z419', CANDS, { fetchImpl: ok({ error: 'not_configured' }, 503) as unknown as typeof fetch })).toBeNull();
    const hang = jest.fn(
      (_u: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    expect(await fetchHeatFill('', 'HEAT E7Z419', CANDS, { fetchImpl: hang as unknown as typeof fetch, timeoutMs: 20 })).toBeNull();
  });

  test('an empty read is never sent', async () => {
    const f = ok({});
    expect(await fetchHeatFill('', '   ', CANDS, { fetchImpl: f as unknown as typeof fetch })).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

describe('the Worker', () => {
  const post = (body: unknown, path = '/api/heat-fill') =>
    new Request(`https://pipefit.test${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

  test('with no key set it says so and calls nobody', async () => {
    const up = jest.fn();
    const res = await handle(post({ text: 'HEAT E7Z419', candidates: CANDS }), {}, up as unknown as typeof fetch);
    expect(res.status).toBe(503);
    expect(up).not.toHaveBeenCalled();
  });

  test('it asks Jev the heat questions only, with the key as a bearer token, and hands back only the answers', async () => {
    const up = jest.fn(async () => new Response(JSON.stringify({ model: 'jev-1', answers: { heat: choiceAns('c0', 0.9) }, usage: { input_tokens: 300, output_tokens: 0 } }), { status: 200 }));
    const res = await handle(post({ text: 'HEAT E7Z419', candidates: CANDS, questions: { evil: {} } }), { TYPESAFE_API_KEY: 'k-secret' }, up as unknown as typeof fetch);
    expect(res.status).toBe(200);
    const [url, init] = up.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k-secret');
    const sent = JSON.parse(String(init.body));
    expect(sent).toEqual(heatRequest('HEAT E7Z419', CANDS));
    expect(sent.questions.evil).toBeUndefined();
    const out = await res.json();
    expect(out).toEqual({ answers: { heat: choiceAns('c0', 0.9) }, model: 'jev-1' });
    expect(JSON.stringify(out)).not.toContain('k-secret');
    expect(JSON.stringify(out)).not.toContain('usage');
  });

  test('bad requests are refused before any call', async () => {
    const up = jest.fn();
    const env = { TYPESAFE_API_KEY: 'k' };
    expect((await handle(post('{nope'), env, up as unknown as typeof fetch)).status).toBe(400);
    expect((await handle(post({ text: '   ' }), env, up as unknown as typeof fetch)).status).toBe(400);
    expect((await handle(post({ text: 'x'.repeat(20000) }), env, up as unknown as typeof fetch)).status).toBe(413);
    expect((await handle(new Request('https://pipefit.test/api/heat-fill'), env, up as unknown as typeof fetch)).status).toBe(405);
    expect((await handle(post({ text: 'a' }, '/api/anything-else'), env, up as unknown as typeof fetch)).status).toBe(404);
    expect(up).not.toHaveBeenCalled();
  });

  test('a TypeSafe fault or no answer is a gateway error, not a crash', async () => {
    const env = { TYPESAFE_API_KEY: 'k' };
    const fail = jest.fn(async () => new Response('nope', { status: 500 }));
    expect((await handle(post({ text: 'HEAT A1' }), env, fail as unknown as typeof fetch)).status).toBe(502);
    const gone = jest.fn(async () => {
      throw new Error('ECONNRESET');
    });
    expect((await handle(post({ text: 'HEAT A1' }), env, gone as unknown as typeof fetch)).status).toBe(504);
  });

  test('the web app is still served from its files', async () => {
    const assets = { fetch: jest.fn(async () => new Response('<html>')) };
    const res = await handle(new Request('https://pipefit.test/projects'), { ASSETS: assets });
    expect(await res.text()).toBe('<html>');
  });

  test('the browser preflight is answered', async () => {
    const res = await handle(new Request('https://pipefit.test/api/heat-fill', { method: 'OPTIONS' }), { TYPESAFE_API_KEY: 'k' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });
});
