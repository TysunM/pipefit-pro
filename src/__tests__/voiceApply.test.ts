import { applyShift, applyTest, targetTest } from '../voice/apply';
import { emptyShifts, newReport, putReport, reportFor } from '../state/shiftLog';
import { emptyPressureLog, newTest, putTest, getTest } from '../state/pressureLog';
import { dayKey } from '../calc/days';

const T = new Date(2026, 9, 4, 9).getTime();
const DAY = dayKey(T);
const shift = (over: Partial<Parameters<typeof applyShift>[1]> = {}) => ({
  action: 'shift' as const,
  say: 'ok',
  welds: [],
  rejects: [],
  spools: [],
  note: null,
  crew: null,
  hours: null,
  ...over,
});

describe("today's shift report, by voice", () => {
  test('starts the report if there is none, and adds to it', () => {
    const { log, report } = applyShift(emptyShifts(), shift({ welds: [{ nps: 6, count: 2 }], rejects: [{ id: 'W-14', note: 'porosity' }] }), 'BP-1', T);
    expect(report.day).toBe(DAY);
    expect(report.welds).toEqual([{ nps: 6, count: 2 }]);
    expect(report.rejects).toEqual([{ id: 'W-14', note: 'porosity' }]);
    expect(reportFor(log, DAY, 'BP-1')).toBeTruthy();
  });

  test('adds welds to the count already there, and notes under what was written', () => {
    const start = putReport(
      emptyShifts(),
      { ...newReport(DAY, 'BP-1', T), welds: [{ nps: 6, count: 3 }], notes: { issues: '', safety: 'Harness check', tomorrow: '', notes: '' }, text: 'old', polished: true },
      T,
    );
    const { report } = applyShift(
      start,
      shift({ welds: [{ nps: 6, count: 2 }, { nps: 2, count: 1 }], note: { key: 'safety', text: 'Fire watch posted' }, crew: 5, spools: ['SP-1'] }),
      'BP-1',
      T + 1000,
    );
    // Largest first, as the report keeps them.
    expect(report.welds).toEqual([{ nps: 6, count: 5 }, { nps: 2, count: 1 }]);
    expect(report.notes.safety).toBe('Harness check\nFire watch posted');
    expect(report.crew).toBe(5);
    expect(report.spools).toEqual(['SP-1']);
    // The written-up text is out of date now, so it is cleared to be built again.
    expect(report.text).toBe('');
    expect(report.polished).toBe(false);
  });

  test('another job keeps its own report', () => {
    const a = applyShift(emptyShifts(), shift({ crew: 3 }), 'BP-1', T).log;
    const b = applyShift(a, shift({ crew: 7 }), 'BP-2', T + 1);
    expect(reportFor(b.log, DAY, 'BP-1')!.crew).toBe(3);
    expect(reportFor(b.log, DAY, 'BP-2')!.crew).toBe(7);
  });
});

describe('a pressure test, by voice', () => {
  const step = (op: 'start_hold' | 'reading' | 'end_hold' | 'pass' | 'fail', psi: number | null = null, leaks = '') => ({ action: 'test' as const, say: 'ok', op, psi, leaks });
  const older = { ...newTest('BP-1', T - 60_000), id: 'pt-old' };
  const newer = { ...newTest('BP-1', T), id: 'pt-new' };
  const other = { ...newTest('BP-2', T + 5), id: 'pt-other' };
  const log = putTest(putTest(putTest(emptyPressureLog(), older, T), newer, T + 1), other, T + 2);

  test('goes to the test on screen, or the job’s latest open one', () => {
    expect(targetTest(log, 'pt-old', 'BP-1')!.id).toBe('pt-old');
    expect(targetTest(log, null, 'BP-1')!.id).toBe('pt-new');
    expect(targetTest(log, null, 'BP-9')).toBeNull();
  });

  test('a hold started, read and ended', () => {
    const a = applyTest(log, step('start_hold', 225), null, 'BP-1', T + 10_000);
    if ('error' in a) throw new Error(a.error);
    expect(a.test.hold).toMatchObject({ startPsi: 225, startAt: T + 10_000 });
    const b = applyTest(a.log, step('reading', 224), null, 'BP-1', T + 70_000);
    if ('error' in b) throw new Error(b.error);
    expect(b.test.readings).toEqual([{ at: T + 70_000, psi: 224 }]);
    const c = applyTest(b.log, step('end_hold', 224), null, 'BP-1', T + 610_000);
    if ('error' in c) throw new Error(c.error);
    expect(c.test.hold.endPsi).toBe(224);
  });

  test('a reading with no hold running is refused, with why', () => {
    const r = applyTest(log, step('reading', 200), null, 'BP-1', T);
    expect('error' in r && r.error).toMatch(/not holding/);
  });

  test('a failure, with what leaked', () => {
    const r = applyTest(log, step('fail', null, 'flange at FW-3'), 'pt-old', 'BP-1', T);
    if ('error' in r) throw new Error(r.error);
    expect(getTest(r.log, 'pt-old')).toMatchObject({ result: 'fail', leaks: 'flange at FW-3' });
  });

  test('no open test on the job is said, not guessed at', () => {
    expect(applyTest(emptyPressureLog(), step('pass'), null, 'BP-1', T)).toEqual({ error: 'There is no open pressure test on this job. Open one first.' });
  });
});
