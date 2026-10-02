import { clockLabel, dayBounds, dayKey, dayLabel, isDay, readClock, readDate, shiftDay, stopwatch, usDate } from '../calc/days';
import { CODE_HOLD_MIN, checkTest, codeRule, gaugeSpan, holdState, prelimPsi, problems, reliefMax, requiredHold } from '../calc/pressureTest';
import { SIG_POINTS, cleanSig, decodeSig, encodeSig, hasSig, sigSvg, simplify } from '../calc/signature';
import {
  MAX_TESTS,
  PRESSURE_VERSION,
  canAdd,
  deleteTest,
  emptyPressureLog,
  endHold,
  freshId,
  heldMinutes,
  holding,
  logReading,
  newTest,
  parsePressureLog,
  putTest,
  retest,
  retested,
  serialisePressureLog,
  startHold,
  stepsFor,
  testName,
  validTest,
  type PressureTest,
} from '../state/pressureLog';

const T = new Date(2026, 8, 30, 9, 0).getTime();
const MIN = 60_000;

/** A B31.3 hydro test on 150 psi design, ready to run. */
const ready = (over: Partial<PressureTest> = {}): PressureTest => ({
  ...newTest('BP-1', T),
  pkg: 'TP-014',
  system: 'CW-1001, CW-1002',
  designPsi: 150,
  testPsi: 225,
  gauges: [{ id: 'G-12', range: 400, calDue: '2026-12-31' }],
  ...over,
});

const ids = (t: PressureTest) => checkTest(t).map((c) => `${c.id}:${c.level}`);

describe('days and clock times', () => {
  test('a day is local, and steps over month ends', () => {
    expect(dayKey(T)).toBe('2026-09-30');
    expect(shiftDay('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(dayLabel('2026-09-30')).toBe('Wed 30 Sep 2026');
    const b = dayBounds('2026-09-30');
    expect(b.end - b.start).toBe(24 * 60 * MIN);
  });

  test('only real calendar days are days', () => {
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2028-02-29')).toBe(true);
    expect(isDay('2026-9-30')).toBe(false);
    expect(isDay(20260930)).toBe(false);
  });

  test('dates are read the way they are written on a sticker', () => {
    expect(readDate('12/31/26')).toBe('2026-12-31');
    expect(readDate('1/5/2027')).toBe('2027-01-05');
    expect(readDate('2026-12-31')).toBe('2026-12-31');
    expect(readDate('2-30-2026')).toBeNull();
    expect(readDate('soon')).toBeNull();
    expect(usDate('2026-01-05')).toBe('1/5/2026');
  });

  test('times read as a gauge log has them', () => {
    const at = (h: number, m: number) => new Date(2026, 8, 30, h, m).getTime();
    expect(readClock('9:05', '2026-09-30')).toBe(at(9, 5));
    expect(readClock('0905', '2026-09-30')).toBe(at(9, 5));
    expect(readClock('21:05', '2026-09-30')).toBe(at(21, 5));
    expect(readClock('9:05 pm', '2026-09-30')).toBe(at(21, 5));
    expect(readClock('12:10a', '2026-09-30')).toBe(at(0, 10));
    expect(readClock('12:10 PM', '2026-09-30')).toBe(at(12, 10));
    expect(readClock('25:00', '2026-09-30')).toBeNull();
    expect(readClock('13:00 pm', '2026-09-30')).toBeNull();
    expect(readClock('9:65', '2026-09-30')).toBeNull();
    expect(clockLabel(at(21, 5))).toBe('9:05 pm');
    expect(clockLabel(at(0, 7))).toBe('12:07 am');
  });

  test('a stopwatch shows minutes, and hours past the hour', () => {
    expect(stopwatch(0)).toBe('0:00');
    expect(stopwatch(10 * MIN + 5000)).toBe('10:05');
    expect(stopwatch(67 * MIN)).toBe('1:07:00');
    expect(stopwatch(-5)).toBe('0:00');
  });
});

describe('the code figures', () => {
  test('B31.3 hydro is at least 1.5 times design, with no top', () => {
    expect(codeRule('B31.3', 'hydro', 150)).toMatchObject({ min: 225, max: null, hold: CODE_HOLD_MIN });
  });

  test('B31.3 pneumatic is 1.1 to 1.33 times design, rounded inward', () => {
    expect(codeRule('B31.3', 'pneumatic', 150)).toMatchObject({ min: 165, max: 199 });
    expect(codeRule('B31.3', 'pneumatic', 135)).toMatchObject({ min: 149, max: 179 });
  });

  test('B31.1 pneumatic is 1.2 to 1.5 times design', () => {
    expect(codeRule('B31.1', 'pneumatic', 100)).toMatchObject({ min: 120, max: 150 });
    expect(codeRule('B31.1', 'hydro', 100)).toMatchObject({ min: 150, max: null });
  });

  test('a job spec sets nothing, and no design pressure means no limits', () => {
    expect(codeRule('spec', 'hydro', 150)).toMatchObject({ min: null, max: null, hold: null });
    expect(codeRule('B31.3', 'hydro', null)).toMatchObject({ min: null, max: null, hold: CODE_HOLD_MIN });
  });

  test('the B31.3 pneumatic relief limit is the lesser of 50 psi or 10% over test', () => {
    expect(reliefMax({ code: 'B31.3', kind: 'pneumatic', testPsi: 165 })).toBe(181);
    expect(reliefMax({ code: 'B31.3', kind: 'pneumatic', testPsi: 800 })).toBe(850);
    expect(reliefMax({ code: 'B31.3', kind: 'hydro', testPsi: 165 })).toBeNull();
  });

  test('the preliminary check is the lesser of 25 psi or half the test', () => {
    expect(prelimPsi({ code: 'B31.3', kind: 'pneumatic', testPsi: 165 })).toBe(25);
    expect(prelimPsi({ code: 'B31.3', kind: 'pneumatic', testPsi: 30 })).toBe(15);
    expect(prelimPsi({ code: 'B31.1', kind: 'pneumatic', testPsi: 165 })).toBeNull();
  });

  test('a job may ask for a longer hold, never a shorter one', () => {
    expect(requiredHold({ code: 'B31.3', kind: 'hydro', holdReq: null })).toBe(10);
    expect(requiredHold({ code: 'B31.3', kind: 'hydro', holdReq: 30 })).toBe(30);
    expect(requiredHold({ code: 'B31.3', kind: 'hydro', holdReq: 5 })).toBe(10);
    expect(requiredHold({ code: 'spec', kind: 'hydro', holdReq: 120 })).toBe(120);
    expect(requiredHold({ code: 'spec', kind: 'hydro', holdReq: null })).toBeNull();
  });

  test('a gauge should read to 1.5 to 4 times the test pressure', () => {
    expect(gaugeSpan(225)).toEqual({ lo: 338, hi: 900 });
  });
});

describe('checking a test', () => {
  test('a good test passes every check it can make', () => {
    let t = startHold(ready(), T, 226);
    t = endHold(t, T + 12 * MIN, 226);
    t = { ...t, result: 'pass', steps: stepsFor('hydro').map((s) => s.id), people: { ...t.people, examiner: { name: 'J. Ruiz', sig: encodeSig([[[10, 10], [40, 30]]]), signedAt: T + 13 * MIN } } };
    expect(problems(checkTest(t))).toEqual([]);
    expect(ids(t)).toEqual(['test-code:ok', 'cal-0:ok', 'range-0:ok', 'hold-time:ok']);
  });

  test('a test pressure under the code minimum stops it', () => {
    const c = checkTest(ready({ testPsi: 200 }));
    expect(c[0]).toMatchObject({ id: 'test-min', level: 'stop' });
    expect(c[0]?.text).toBe('200 psi is under the B31.3 minimum of 225 psi (1.5 × design).');
  });

  test('a pneumatic test over 1.33 times design stops it, and so does no relief valve', () => {
    const c = ids(ready({ kind: 'pneumatic', medium: 'Air', testPsi: 250 }));
    expect(c).toContain('test-max:stop');
    expect(c).toContain('relief:stop');
  });

  test('a relief valve below the test pressure, or over the B31.3 limit, stops it', () => {
    expect(ids(ready({ reliefPsi: 200 }))).toContain('relief:stop');
    const pneu = ready({ kind: 'pneumatic', testPsi: 165, reliefPsi: 190, gauges: [{ id: 'G-12', range: 300, calDue: '2026-12-31' }] });
    expect(checkTest(pneu).find((x) => x.id === 'relief')?.text).toContain('over the B31.3 limit of 181 psi');
    expect(ids({ ...pneu, reliefPsi: 180 })).toContain('relief:ok');
  });

  test('a gauge out of calibration on the day stops it; one with no date or the wrong range is a warning', () => {
    const t = ready({
      gauges: [
        { id: 'G-1', range: 400, calDue: '2026-09-29' },
        { id: 'G-2', range: 300, calDue: '' },
        { id: 'G-3', range: 400, calDue: '2026-09-30' },
      ],
    });
    expect(ids(t)).toEqual(expect.arrayContaining(['cal-0:stop', 'cal-1:warn', 'range-1:warn', 'cal-2:ok']));
    expect(checkTest(t).find((c) => c.id === 'cal-0')?.text).toBe('Gauge G-1: calibration ran out 9/29/2026, before the test.');
  });

  test('a short hold stops it; a pressure drop is a warning', () => {
    let t = startHold(ready(), T, 225);
    t = endHold(t, T + 8 * MIN, 220);
    expect(ids(t)).toEqual(expect.arrayContaining(['hold-time:stop', 'hold-drop:warn']));
    expect(checkTest(t).find((c) => c.id === 'hold-drop')?.text).toContain('fell 5 psi');
  });

  test('a reading under the start pressure during the hold counts as a drop', () => {
    let t = startHold(ready(), T, 225);
    t = logReading(t, T + 3 * MIN, 221);
    t = endHold(t, T + 11 * MIN, 225);
    expect(checkTest(t).find((c) => c.id === 'hold-drop')?.text).toContain('225 psi to 221 psi');
  });

  test('a hold started under the test pressure stops it', () => {
    expect(ids(startHold(ready(), T, 210))).toContain('hold-start:stop');
  });

  test('passing a test needs an examiner, and not a hold still running', () => {
    const t = { ...startHold(ready(), T, 225), result: 'pass' as const };
    expect(ids(t)).toEqual(expect.arrayContaining(['pass-holding:stop', 'examiner:stop']));
  });

  test('a fail with no word on where it leaked is a warning', () => {
    expect(ids(ready({ result: 'fail' }))).toContain('leaks:warn');
  });

  test('design hotter than the test raises a B31.3 stress-ratio warning', () => {
    expect(ids(ready({ designTemp: 650, testTemp: 70 }))).toContain('stress:warn');
    expect(ids(ready({ designTemp: 650, testTemp: 70, code: 'B31.1' }))).not.toContain('stress:warn');
  });

  test('cold testing is a warning', () => {
    expect(checkTest(ready({ testTemp: 35 })).find((c) => c.id === 'cold')?.text).toContain('water can freeze');
  });

  test('a job spec test is not held to a code', () => {
    const c = ids(ready({ code: 'spec', testPsi: 100 }));
    expect(c).not.toContain('test-min:stop');
    expect(c).not.toContain('design:warn');
  });
});

describe('the hold clock', () => {
  test('runs from the stamps, and says when the hold is met', () => {
    const t = startHold(ready({ holdReq: 30 }), T, 225);
    expect(holdState(ready(), T)).toEqual({ phase: 'ready' });
    expect(holdState(t, T + 12 * MIN)).toEqual({ phase: 'holding', elapsedMs: 12 * MIN, needMs: 30 * MIN, met: false });
    expect(holdState(t, T + 31 * MIN)).toMatchObject({ phase: 'holding', met: true });
    const done = endHold(t, T + 40 * MIN, 225);
    expect(holdState(done, T + 99 * MIN)).toEqual({ phase: 'held', elapsedMs: 40 * MIN, needMs: 30 * MIN, met: true });
    expect(heldMinutes(done)).toBe(40);
    expect(holding(t)).toBe(true);
    expect(holding(done)).toBe(false);
  });

  test('starting the hold dates the test to that day and clears the old readings', () => {
    const later = new Date(2026, 9, 2, 7, 30).getTime();
    const t = startHold(logReading(ready(), T, 225), later, 225);
    expect(t.day).toBe('2026-10-02');
    expect(t.readings).toEqual([]);
  });
});

describe('signatures', () => {
  test('a stroke survives being written down and read back', () => {
    const strokes = [
      [[0, 0], [150, 50], [300, 100]],
      [[42, 7]],
    ] as const;
    const sig = encodeSig(strokes);
    expect(sig.split(' ')).toHaveLength(2);
    expect(decodeSig(sig)).toEqual([
      [[0, 0], [300, 100]],
      [[42, 7]],
    ]);
  });

  test('points on a straight line are thinned; corners stay', () => {
    expect(simplify([[0, 0], [1, 0.1], [2, 0], [2, 5], [2, 10]])).toEqual([[0, 0], [2, 0], [2, 10]]);
  });

  test('points off the box are pulled onto it, and the cap holds', () => {
    expect(decodeSig(encodeSig([[[-5, 300]]]))).toEqual([[[0, 100]]]);
    const zigzag = Array.from({ length: 2000 }, (_, i) => [i % 300, i % 2 ? 0 : 100] as const);
    const kept = decodeSig(encodeSig([zigzag]));
    expect(kept.flat().length).toBe(SIG_POINTS);
  });

  test('anything that is not a signature is cleaned away', () => {
    expect(cleanSig(42)).toBe('');
    expect(cleanSig('AB!? ' + encodeSig([[[1, 2]]]))).toBe(encodeSig([[[1, 2]]]));
    expect(hasSig('')).toBe(false);
  });

  test('a signature prints as an SVG path; none prints as nothing', () => {
    expect(sigSvg(encodeSig([[[1, 2], [30, 40]]]))).toContain('<path d="M1 2L30 40"');
    expect(sigSvg('')).toBe('');
  });
});

describe('the log', () => {
  test('a record survives a save and a load', () => {
    const t = endHold(startHold(ready({ reliefTag: 'PSV-3', reliefPsi: 240 }), T, 226), T + 15 * MIN, 225);
    const log = putTest(emptyPressureLog(), t, T + 16 * MIN);
    const back = parsePressureLog(serialisePressureLog(log));
    expect(back.dropped).toBe(0);
    expect(back.tests[0]).toEqual({ ...t, updatedAt: T + 16 * MIN });
  });

  test('a store from a newer app is left alone', () => {
    expect(parsePressureLog(JSON.stringify({ v: PRESSURE_VERSION + 1, tests: [] })).foreign).toBe(true);
    expect(parsePressureLog('{nope').dropped).toBe(1);
  });

  test('bad parts are cleaned; a record with no id or day is dropped', () => {
    const raw = JSON.stringify({
      v: 1,
      tests: [
        { ...ready(), id: 'a', code: 'B99', result: 'maybe', testPsi: -3, gauges: [{ id: '', range: null, calDue: 'x' }], hold: { endAt: T } },
        { ...ready(), id: '' },
        { ...ready(), id: 'b', day: '2026-02-30' },
        { ...ready(), id: 'a' },
      ],
    });
    const log = parsePressureLog(raw);
    expect(log.dropped).toBe(3);
    expect(log.tests[0]).toMatchObject({ id: 'a', code: 'spec', result: 'open', testPsi: null, gauges: [], hold: { startAt: null, endAt: null } });
  });

  test('a signature with no signer time keeps no time; a time with no signature is dropped', () => {
    const t = validTest({ ...ready(), people: { tester: { name: 'A', sig: '', signedAt: T }, examiner: { name: 'B', sig: encodeSig([[[1, 1]]]), signedAt: T } } });
    expect(t?.people.tester.signedAt).toBeNull();
    expect(t?.people.examiner.signedAt).toBe(T);
    expect(t?.people.witness).toEqual({ name: '', sig: '', signedAt: null });
  });

  test('a retest carries the package over and nothing that belonged to the attempt', () => {
    const failed = endHold(startHold(ready({ result: 'fail', leaks: 'W-22 weeping', notes: 'x' }), T, 225), T + 20 * MIN, 225);
    const signedFailed = { ...failed, people: { ...failed.people, examiner: { name: 'J. Ruiz', sig: encodeSig([[[1, 1]]]), signedAt: T } } };
    const again = retest(signedFailed, T + 60 * MIN);
    expect(again).toMatchObject({ pkg: 'TP-014', attempt: 2, testPsi: 225, result: 'open', leaks: '', notes: '', readings: [], steps: [] });
    expect(again.hold.startAt).toBeNull();
    expect(again.people.examiner).toEqual({ name: 'J. Ruiz', sig: '', signedAt: null });
    expect(testName(again)).toBe('TP-014 retest 1');
    let log = putTest(emptyPressureLog(), signedFailed, T);
    expect(retested(log, signedFailed)).toBe(false);
    log = putTest(log, { ...again, id: freshId(log, T + 60 * MIN) }, T + 60 * MIN);
    expect(retested(log, signedFailed)).toBe(true);
  });

  test('ids stay unique and the cap refuses a new test rather than losing an old one', () => {
    let log = emptyPressureLog();
    log = putTest(log, { ...ready(), id: freshId(log, T) }, T);
    expect(freshId(log, T)).toBe(`pt${T.toString(36)}-2`);
    const full = { ...log, tests: Array.from({ length: MAX_TESTS }, (_, i) => ({ ...ready(), id: `t${i}` })) };
    expect(canAdd(full)).toBe(false);
    expect(putTest(full, { ...ready(), id: 'new' }, T)).toBe(full);
    expect(putTest(full, { ...ready(), id: 't3', pkg: 'TP-99' }, T).tests.find((x) => x.id === 't3')?.pkg).toBe('TP-99');
    expect(deleteTest(full, 't3').tests).toHaveLength(MAX_TESTS - 1);
    expect(deleteTest(full, 'nope')).toBe(full);
  });

  test('the walk-down fits the kind of test', () => {
    expect(stepsFor('hydro').map((s) => s.id)).toContain('vented');
    expect(stepsFor('hydro').map((s) => s.id)).not.toContain('barricaded');
    expect(stepsFor('pneumatic').map((s) => s.id)).toEqual(expect.arrayContaining(['barricaded', 'prelim']));
  });
});
