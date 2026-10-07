import {
  NewWeld,
  addMonths,
  addWeld,
  continuity,
  deleteWeld,
  emptyWelders,
  emptyWelds,
  findWelder,
  logRepair,
  nextNumber,
  parseWelders,
  parseWelds,
  pickWeld,
  putWeld,
  putWelder,
  serialiseWelders,
  serialiseWelds,
  setResult,
  stampProblems,
  weldName,
  weldState,
  welderStats,
  diameterInches,
  type WeldLog,
} from '../state/weldLog';
import { lotsOf, ndeAsks, ndeRequestText, summarise } from '../calc/ndeSampling';

const T = Date.UTC(2026, 9, 7, 15);
const base = (n: string, patch: Partial<NewWeld> = {}): NewWeld => ({
  project: 'J1',
  line: '2-CW-1201',
  number: n,
  sketchId: '',
  day: '2026-10-07',
  nps: 2,
  type: 'BW',
  process: 'GTAW',
  wps: 'WPS-101',
  welders: ['W-12'],
  heats: ['a1234'],
  pct: 5,
  method: 'RT',
  note: '',
  ...patch,
});

/** A log of n butt welds by one welder. */
function logOf(n: number, patch: Partial<NewWeld> = {}): WeldLog {
  let l = emptyWelds();
  for (let i = 1; i <= n; i += 1) {
    const r = addWeld(l, base(String(i), patch), T + i);
    if (!r.ok) throw new Error(r.why);
    l = r.log;
  }
  return l;
}
const byNo = (l: WeldLog, n: string) => l.welds.find((w) => w.number === n)!;
const shoot = (l: WeldLog, n: string, result: 'accept' | 'reject', how: Parameters<typeof pickWeld>[2] = { method: 'RT', reason: 'random' }) => {
  const picked = pickWeld(l, byNo(l, n).id, how, T + 100);
  const w = byNo(picked, n);
  return setResult(picked, w.id, w.exams[w.exams.length - 1]!.id, result, 'RT-1', T + 200);
};

describe('the weld log', () => {
  test('a weld is logged once per number on a line and job', () => {
    const l = logOf(2);
    expect(l.welds).toHaveLength(2);
    expect(addWeld(l, base('2'), T).ok).toBe(false);
    expect(addWeld(l, base('2', { line: '2-CW-1202' }), T).ok).toBe(true);
    expect(addWeld(l, base('2', { project: 'J2' }), T).ok).toBe(true);
    expect(nextNumber(l, 'J1', '2-cw-1201')).toBe('3');
    expect(nextNumber(l, 'J1', 'other')).toBe('1');
  });

  test('a weld moves through picked, rejected, repaired and accepted, and is called 14R1', () => {
    let l = logOf(1);
    const id = l.welds[0]!.id;
    expect(weldState(l.welds[0]!)).toBe('welded');
    l = pickWeld(l, id, { method: 'RT', reason: 'random' }, T);
    expect(weldState(l.welds[0]!)).toBe('picked');
    l = setResult(l, id, l.welds[0]!.exams[0]!.id, 'reject', 'RT-7', T);
    expect(weldState(l.welds[0]!)).toBe('repair');
    l = logRepair(l, id, T + 1);
    expect(weldName(l.welds[0]!)).toBe('1R1');
    expect(l.welds[0]!.exams[1]).toMatchObject({ reason: 'repair', result: 'pending' });
    l = setResult(l, id, l.welds[0]!.exams[1]!.id, 'accept', 'RT-8', T + 2);
    expect(weldState(l.welds[0]!)).toBe('accepted');
  });

  test('stored and read back, with anything damaged dropped', () => {
    const l = shoot(logOf(3), '2', 'accept');
    const raw = JSON.parse(serialiseWelds(l));
    raw.welds.push({ id: 'x' }, raw.welds[0]);
    const back = parseWelds(JSON.stringify(raw));
    expect(back.welds).toEqual(l.welds);
    expect(back.dropped).toBe(2);
    expect(parseWelds(JSON.stringify({ v: 99, welds: [] })).foreign).toBe(true);
  });

  test('a number cannot be moved onto another weld', () => {
    const l = logOf(2);
    expect(putWeld(l, { ...byNo(l, '1'), number: '2' }, T).ok).toBe(false);
    expect(putWeld(l, { ...byNo(l, '1'), number: '1A' }, T).ok).toBe(true);
    expect(deleteWeld(l, byNo(l, '1').id).welds).toHaveLength(1);
  });

  test('diameter-inches add up the sizes', () => {
    expect(diameterInches([...logOf(3).welds, ...logOf(1, { nps: 6 }).welds])).toBe(12);
  });
});

describe('welders and continuity', () => {
  const roster = () => {
    const r = putWelder(emptyWelders(), { stamp: 'w-12', name: 'R. Diaz', quals: [{ process: 'GTAW', since: '2026-01-15', note: '' }] }, T);
    return r.roster;
  };

  test('a stamp is one welder however it is written', () => {
    const r = roster();
    expect(findWelder(r, 'W12')?.name).toBe('R. Diaz');
    expect(putWelder(r, { stamp: 'W 12', name: 'Other', quals: [] }, T).ok).toBe(false);
    expect(parseWelders(serialiseWelders(r)).welders).toEqual(r.welders);
  });

  test('six months from the last weld with the process, held to the end of a short month', () => {
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2026-01-15', 6)).toBe('2026-07-15');
    const w = roster().welders[0]!;
    expect(continuity(w, [], '2026-06-20')[0]).toMatchObject({ until: '2026-07-15', state: 'soon' });
    expect(continuity(w, [], '2026-07-16')[0]).toMatchObject({ state: 'lapsed' });
    // A GTAW weld in May carries it on; an SMAW weld does not.
    const welds = [...logOf(1, { day: '2026-05-02' }).welds, ...logOf(1, { day: '2026-06-30', process: 'SMAW' }).welds];
    expect(continuity(w, welds, '2026-07-16')[0]).toMatchObject({ last: '2026-05-02', until: '2026-11-02', state: 'ok' });
  });

  test('stamps that should not go on a weld are named', () => {
    const r = roster();
    expect(stampProblems(r, [], ['W-12'], 'GTAW', '2026-03-01')).toEqual([]);
    expect(stampProblems(r, [], ['W-12'], 'SMAW', '2026-03-01')).toEqual(['W-12 has no SMAW qualification on the roster.']);
    expect(stampProblems(r, [], ['W-99'], 'GTAW', '2026-03-01')).toEqual(['W-99 is not on the welder roster.']);
    expect(stampProblems(r, [], ['W-12'], 'GTAW', '2026-08-01')[0]).toMatch(/lapsed on GTAW after 2026-07-15/);
  });

  test("a welder's reject rate counts each weld once, and a repair re-shoot never as a second reject", () => {
    let l = logOf(10);
    l = shoot(l, '1', 'reject');
    l = logRepair(l, byNo(l, '1').id, T + 300);
    const w = byNo(l, '1');
    l = setResult(l, w.id, w.exams[1]!.id, 'reject', 'RT-2', T + 400);
    l = shoot(l, '2', 'accept');
    expect(welderStats('W12', l.welds)).toMatchObject({ welds: 10, examined: 2, rejects: 1, rate: 0.5, diameterInches: 20 });
  });
});

describe('NDE sampling, B31.3', () => {
  test('5% of a welder\'s butt welds, rounded up; socket and fillet welds not counted', () => {
    const l = logOf(30);
    const more = addWeld(l, base('31', { type: 'SW' }), T).log;
    const [lot] = lotsOf(more.welds);
    expect(lot!.welds).toHaveLength(30);
    expect(summarise(lot!).required).toBe(2);
    const [ask] = ndeAsks(more.welds);
    expect(ask).toMatchObject({ kind: 'random', count: 2, reason: 'random' });
    expect(ask!.text).toBe('W-12 · 5% RT: 2 of 30 welds. 2 still to pick.');
  });

  test('a weld two welders made is in both their lots, and one shot serves both', () => {
    let l = logOf(4, { welders: ['W-12', 'W-07'] });
    expect(lotsOf(l.welds).map((x) => x.stamp)).toEqual(['W-07', 'W-12']);
    l = pickWeld(l, byNo(l, '3').id, { method: 'RT', reason: 'random' }, T);
    expect(ndeAsks(l.welds)).toEqual([]);
  });

  test('the suggestion is the same every time', () => {
    const l = logOf(40);
    expect(ndeAsks(l.welds)[0]!.candidates.map((w) => w.id)).toEqual(ndeAsks(l.welds)[0]!.candidates.map((w) => w.id));
  });

  test('a reject asks for two tracers; both passing ends it', () => {
    let l = shoot(logOf(20), '1', 'reject');
    let asks = ndeAsks(l.welds);
    expect(asks.map((a) => [a.kind, a.count])).toEqual([['tracer', 2]]);
    expect(asks[0]!.forWeld!.number).toBe('1');
    const tr = { method: 'RT' as const, reason: 'tracer' as const, forWeld: byNo(l, '1').id, round: 1 };
    l = shoot(l, '5', 'accept', tr);
    l = shoot(l, '9', 'accept', tr);
    asks = ndeAsks(l.welds);
    expect(asks).toEqual([]);
  });

  test('a failed tracer asks for two more; one of those failing takes in the whole lot', () => {
    let l = shoot(logOf(8), '1', 'reject');
    const t1 = { method: 'RT' as const, reason: 'tracer' as const, forWeld: byNo(l, '1').id, round: 1 };
    l = shoot(l, '2', 'reject', t1);
    l = shoot(l, '3', 'accept', t1);
    let asks = ndeAsks(l.welds);
    expect(asks.map((a) => [a.kind, a.round, a.forWeld?.number, a.count])).toEqual([['tracer', 2, '2', 2]]);
    const t2 = { method: 'RT' as const, reason: 'tracer' as const, forWeld: byNo(l, '2').id, round: 2 };
    l = shoot(l, '4', 'reject', t2);
    asks = ndeAsks(l.welds);
    expect(asks.map((a) => [a.kind, a.count])).toEqual([['lot', 4]]);
    expect(summarise(lotsOf(l.welds)[0]!).full).toBe(true);
  });

  test('100% lots ask for every weld; visual-only lines ask for none', () => {
    expect(ndeAsks(logOf(3, { pct: 100 }).welds)[0]).toMatchObject({ count: 3, reason: 'spec' });
    expect(ndeAsks(logOf(3, { pct: 0 }).welds)).toEqual([]);
  });

  test('the request for the NDE crew lists what is picked', () => {
    let l = logOf(3);
    l = pickWeld(l, byNo(l, '2').id, { method: 'RT', reason: 'random' }, T);
    expect(ndeRequestText(l.welds, { title: 'J1 NDE', size: (n) => `${n}"` })).toBe('J1 NDE\n\nRT — 1 weld\n  2-CW-1201  weld 2  2" BW  W-12  (random)');
  });
});

describe('continuity alarms and the turnover package', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { continuityAlerts, CONTINUITY_ALERT_PREFIX } = require('../calc/continuityAlerts') as typeof import('../calc/continuityAlerts');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { openItems, turnoverHtml } = require('../print/turnover') as typeof import('../print/turnover');
  const roster = putWelder(emptyWelders(), { stamp: 'W-12', name: 'R. Diaz', quals: [{ process: 'GTAW', since: '2026-04-20', note: '' }] }, T).roster;

  test('two weeks out and on the last day, at seven, keyed to the day worked to', () => {
    const now = new Date(2026, 9, 1, 12).getTime();
    const a = continuityAlerts(roster.welders, [], '2026-10-01', now);
    expect(a.map((x) => x.key)).toEqual([`${CONTINUITY_ALERT_PREFIX}W12:GTAW:2026-10-20:soon`, `${CONTINUITY_ALERT_PREFIX}W12:GTAW:2026-10-20:last`]);
    expect(new Date(a[0]!.at)).toEqual(new Date(2026, 9, 6, 7));
    expect(a[1]!.title).toBe('W-12 GTAW lapses after today');
    // A GTAW weld logged today moves it on six months, and the alarms with it.
    const moved = continuityAlerts(roster.welders, logOf(1, { day: '2026-10-01' }).welds, '2026-10-01', now);
    expect(moved[0]!.key).toContain(':2027-04-01:');
    // Past the warning, only the last-day alarm is left; lapsed, none.
    expect(continuityAlerts(roster.welders, [], '2026-10-10', new Date(2026, 9, 10).getTime())).toHaveLength(1);
    expect(continuityAlerts(roster.welders, [], '2026-10-21', new Date(2026, 9, 21).getTime())).toEqual([]);
  });

  test('what the welds still owe is an open item, and a heat welded in with no cert is one too', () => {
    let l = logOf(3, { heats: ['ZZ9'] });
    l = shoot(l, '1', 'reject');
    const items = openItems([], [], [], l.welds).map((o) => o.needs);
    expect(items[0]).toBe('2-CW-1201 weld 1: rejected, to repair and re-examine');
    expect(items).toContain('Not in the heat book; no cert on file (weld 1, weld 2, weld 3)');
    const html = turnoverHtml({ job: 'J1', dateLine: 'x', joints: [], heats: [], sketches: [], readings: [], spools: [], tests: [], grid: 20, welds: l.welds, welders: roster.welders });
    expect(html).toContain('<h2>Weld log</h2>');
    expect(html).toContain('NDE sampling, ASME B31.3');
  });
});

test('the printed weld log leads with what is owed and escapes what was typed', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { weldLogHtml } = require('../print/weldLog') as typeof import('../print/weldLog');
  const l = shoot(logOf(2, { line: 'L<1>' }), '1', 'reject');
  const html = weldLogHtml({ title: 'Weld log', welds: l.welds, welders: [], today: '2026-10-07', size: (n) => `${n}"` });
  expect(html).toContain('<p class="problem">L&lt;1&gt; weld 1: rejected, to repair and re-examine');
  expect(html).toContain('not on roster');
  expect(html).not.toContain('<1>');
});
