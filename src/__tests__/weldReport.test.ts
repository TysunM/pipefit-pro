import { handle, resetClaudeSkip } from '../../worker/index';
import { DEFAULT_AI_VISION_MODEL } from '../../worker/workersAi';
import { WELD_REPORT_PATH, askWeldReport, readReport, reportMissOf, reportMissWords, type WeldReportRead } from '../ai/weldReport';
import { REPORT_OFF_PCT, checkReport } from '../calc/orbitalReport';
import { newProgram, newRun, parseRuns, putRun, emptyRuns, serialiseRuns, type Program } from '../state/orbitalBook';
import { newWps, type Wps } from '../state/wpsBook';

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);
const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJCcuIC';
const ENV = { ANTHROPIC_API_KEY: 'sk-test-secret', CLAUDE_MODEL: 'test-model' };
const post = (body: unknown) => new Request(`https://pipefit.test${WELD_REPORT_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const zero = { ip: 0, ib: 0, avg: 0, volts: 0, rpm: 0, ipm: 0, mmpm: 0, secs: 0 };
/** A four-level report as a supply prints it, measured, level 3 run hot. */
const READ = {
  program: '316-050-065',
  weldNo: '0142',
  date: '11/26/26',
  time: '07:14',
  operator: 'JR',
  machine: 'M217 SN 4410',
  figures: 'actual',
  levels: [
    { ...zero, level: 1, ip: 70, ib: 20, volts: 9.5, rpm: 4, secs: 3.9 },
    { ...zero, level: 2, ip: 67.5, ib: 20, volts: 9.4, rpm: 4, secs: 3.9 },
    { ...zero, level: 3, ip: 69, ib: 20, volts: 9.6, rpm: 4, secs: 3.9 },
    { ...zero, level: 4, ip: 61, ib: 20, volts: 9.3, rpm: 4, secs: 3.9 },
  ],
  faults: [],
  status: 'complete',
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

const lv = (ip: number) => ({ deg: 93.75, rpm: 4, ip, ib: 20, tp: 0.1, tb: 0.1 });
const prog = (p: Partial<Program> = {}): Program => ({ ...newProgram(1), id: 'p', name: '316-050-065', od: 0.5, wall: 0.065, wps: 'WPS-OW-1', levels: [lv(70), lv(67), lv(64), lv(61)], ...p });
const wps = (over: Partial<Wps> = {}): Wps => ({ ...newWps(1), id: 'w', name: 'WPS-OW-1', process: 'gtaw', heat: { min: 100, max: 200 }, ...over });

describe('a weld report read on the server: the free reader first, Claude last', () => {
  test('the vision model reads it; Claude is never asked', async () => {
    const ran: Ran[] = [];
    const calls = { n: 0 };
    const res = await handle(post({ image: JPEG }), { ...ENV, AI: ai([{ response: READ }], ran) }, claude(READ, calls));
    expect(await res.json()).toEqual({ report: readReport(READ), engine: 'workers-ai' });
    expect(ran[0]!.model).toBe(DEFAULT_AI_VISION_MODEL);
    expect(calls.n).toBe(0);
  });
  test('a picture the free reader reads nothing off goes to Claude', async () => {
    const calls = { n: 0 };
    const res = await handle(post({ image: JPEG }), { ...ENV, AI: ai([{ response: { ...READ, levels: [], faults: [] } }]) }, claude(READ, calls));
    expect(await res.json()).toEqual({ report: readReport(READ), engine: 'claude' });
    expect(calls.n).toBe(1);
  });
  test('a report with only a fault on it is still a read', async () => {
    const res = await handle(post({ image: JPEG }), { AI: ai([{ response: { ...READ, levels: [], faults: ['ARC START FAIL'], status: 'fault' } }]) }, claude(READ));
    expect(res.status).toBe(200);
  });
  test('the day spent, said plainly; no signal, said plainly', async () => {
    const spent = await handle(post({ image: JPEG }), { AI: ai([new Error('4006: daily free allocation used')]) }, claude(READ));
    expect(reportMissWords(reportMissOf(spent.status, await spent.json()))).toMatch(/midnight UTC/);
    const offline = (async () => {
      throw new Error('net');
    }) as unknown as typeof fetch;
    expect(await askWeldReport('https://x', JPEG, { fetchImpl: offline })).toBe('offline');
  });
});

describe('the answer held to shape', () => {
  test('a level with nothing on it is dropped; a figure past what a supply prints is no figure', () => {
    const r = readReport({ ...READ, levels: [{ ...zero, level: 1 }, { ...zero, level: 2, ip: 5000, volts: 9 }, { ...zero, level: 0, ip: 60 }], faults: [' LOW GAS ', ''], status: 'odd' })!;
    expect(r.levels.map((l) => [l.level, l.ip, l.volts])).toEqual([[2, null, 9], [2, 60, null]]);
    expect(r.faults).toEqual(['LOW GAS']);
    expect(r.status).toBe('');
    expect(readReport({ levels: 'x', faults: [] })).toBeNull();
  });
});

describe('the report set against the program', () => {
  const r = readReport(READ)!;
  test('each level beside its program: level 3 ran hot on peak current; the rest within 5%', () => {
    const c = checkReport(r, prog(), []);
    expect(c.program).toBe('same');
    near(c.levels[2]!.ip!.pct, ((69 - 64) / 64) * 100);
    expect(c.levels[2]!.ip!.off).toBe(true);
    expect(c.levels.filter((l) => l.ip?.off)).toHaveLength(1);
    expect(c.notes).toEqual([`Level 3 ran off its program: peak current +8%.`]);
    expect(REPORT_OFF_PCT).toBe(5);
  });
  test('the heat input off the reported volts, the pulse averaged over the program\'s times, the speed round this OD', () => {
    const c = checkReport(r, prog(), []);
    near(c.levels[0]!.avg!, 45);
    near(c.levels[0]!.ipm!, Math.PI * 0.5 * 4);
    near(c.levels[0]!.heat!, (9.5 * 45 * 60) / (Math.PI * 2));
  });
  test('against the WPS by name: J/in made J/mm, the EN ISO basis taking GTAW\'s 0.6', () => {
    const asme = checkReport(r, prog(), [wps({ heat: { min: 100, max: 150 } })]);
    // Level 1: 4082 J/in = 160.7 J/mm, over a 150 max.
    expect(asme.levels[0]!.wps).toBe('high');
    expect(asme.notes.join('\n')).toMatch(/Level 1's heat input, 4082 J\/in, is over WPS-OW-1's window/);
    const iso = checkReport(r, prog(), [wps({ basis: 'iso', heat: { min: 50, max: 150 } })]);
    expect(iso.levels[0]!.wps).toBe('in');
    expect(checkReport(r, prog({ wps: '' }), [wps()]).wps).toBeNull();
  });
  test('a report for another program, a different level count, a fault: each said', () => {
    const odd = readReport({ ...READ, program: '304-050', levels: READ.levels.slice(0, 3), faults: ['LOW GAS'], status: 'fault' })!;
    const notes = checkReport(odd, prog(), []).notes.join('\n');
    expect(notes).toMatch(/report is for program 304-050; this weld is on 316-050-065/);
    expect(notes).toMatch(/report has 3 levels; the program has 4/);
    expect(notes).toMatch(/stopped on a fault: LOW GAS/);
  });
  test("set figures check the supply's program: 'is set' off, and the supply is said not to hold this one", () => {
    const set = readReport({ ...READ, figures: 'programmed' })!;
    const notes = checkReport(set, prog(), []).notes;
    expect(notes[0]).toMatch(/Level 3 is set off its program/);
    expect(notes[notes.length - 1]).toMatch(/program on the supply is not the one here/);
  });
  test('speed printed in in/min or mm/min is set against the RPM round this OD', () => {
    const ipm = readReport({ ...READ, levels: [{ ...zero, level: 1, ip: 70, ib: 20, volts: 9.5, ipm: Math.PI * 0.5 * 4.4 }] })!;
    near(checkReport(ipm, prog(), []).levels[0]!.rpm!.read, 4.4);
    const mm = readReport({ ...READ, levels: [{ ...zero, level: 1, ip: 70, ib: 20, volts: 9.5, mmpm: Math.PI * 0.5 * 4 * 25.4 }] })!;
    expect(checkReport(mm, prog(), []).levels[0]!.rpm!.off).toBe(false);
  });
});

describe('kept on the weld', () => {
  test('a run keeps its report through the store; one kept before reports has none', () => {
    const run = { ...newRun(prog(), 'production', 5), id: 'r1', weld: '0142', result: 'pass' as const, report: { ...(readReport(READ) as WeldReportRead), readAt: 9 } };
    expect(parseRuns(serialiseRuns(putRun(emptyRuns(), run))).runs[0]).toEqual(run);
    const old = { ...run } as Record<string, unknown>;
    delete old.report;
    expect(parseRuns(JSON.stringify({ v: 1, runs: [old] })).runs[0]!.report).toBeNull();
    expect(parseRuns(JSON.stringify({ v: 1, runs: [{ ...run, report: { junk: true } }] })).runs[0]!.report).toBeNull();
  });
});
