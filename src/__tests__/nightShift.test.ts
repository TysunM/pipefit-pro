import { dayBounds, workDay } from '../calc/days';
import { logFacts, shiftFacts, testWorkDay, type DayRecords } from '../calc/shiftReport';
import { newTest, startHold } from '../state/pressureLog';
import { newJoint } from '../state/register';
import { emptyShifts, reportFor } from '../state/shiftLog';
import { onDay, workedOn } from '../state/today';
import { applyShift } from '../voice/apply';

// Tuesday 6 Oct 2026, and the night shift that runs 6 pm Tue to 6 am Wed.
const at = (h: number, d = 6, m = 0) => new Date(2026, 9, d, h, m).getTime();
const TUE = '2026-10-06';
const WED = '2026-10-07';

describe('the work day', () => {
  test('on days it is the calendar day', () => {
    expect(workDay(at(23, 6, 59), 'days')).toBe(TUE);
    expect(workDay(at(0, 7), 'days')).toBe(WED);
    expect(workDay(at(2, 7))).toBe(WED);
  });

  test('on nights it runs noon to noon, dated by the night it started', () => {
    expect(workDay(at(18), 'nights')).toBe(TUE);
    expect(workDay(at(2, 7), 'nights')).toBe(TUE);
    expect(workDay(at(11, 7, 59), 'nights')).toBe(TUE);
    expect(workDay(at(12, 7), 'nights')).toBe(WED);
    // Across a month end.
    expect(workDay(new Date(2026, 10, 1, 3).getTime(), 'nights')).toBe('2026-10-31');
  });

  test('the bounds of a night shift day are noon to noon', () => {
    expect(dayBounds(TUE, 12)).toEqual({ start: at(12), end: at(12, 7) });
    expect(dayBounds(TUE)).toEqual({ start: at(0), end: at(0, 7) });
  });

  test('the Today view keeps a whole night shift together', () => {
    const xs = [{ id: 'start', t: at(19) }, { id: 'small-hours', t: at(4, 7) }, { id: 'next-shift', t: at(19, 7) }, { id: 'day-before', t: at(4, 6) }];
    expect(workedOn(xs, TUE, (x) => [x.t], 'nights').map((x) => x.id)).toEqual(['start', 'small-hours']);
    expect(workedOn(xs, TUE, (x) => [x.t]).map((x) => x.id)).toEqual(['start', 'day-before']);
    expect(onDay(at(4, 7), TUE, 'nights')).toBe(true);
  });
});

describe('the night shift report', () => {
  test('a test held at 2 am is dated that calendar day and reported on the night it was held', () => {
    const t = startHold(newTest('BP-1', at(1, 7)), at(2, 7), 225);
    expect(t.day).toBe(WED);
    expect(testWorkDay(t, 'nights')).toBe(TUE);
    expect(testWorkDay(t, 'days')).toBe(WED);
    // Dated by hand to another day: the date given is the one meant.
    expect(testWorkDay({ ...t, day: '2026-10-02' }, 'nights')).toBe('2026-10-02');
  });

  test('facts are gathered from noon to noon on nights', () => {
    const recs: DayRecords = {
      tests: [{ ...startHold(newTest('BP-1', at(1, 7)), at(2, 7), 225), id: 'a', pkg: 'TP-1' }],
      joints: [
        { ...newJoint('j1', { tag: 'F-1', cls: '125', nps: 6, bolts: 8, torque: 60, project: 'BP-1' }, at(3, 7)) },
        { ...newJoint('j2', { tag: 'F-2', cls: '125', nps: 6, bolts: 8, torque: 60, project: 'BP-1' }, at(13, 7)) },
      ],
      heats: [],
      readings: [],
      sketches: [],
    };
    const night = logFacts(recs, TUE, 'BP-1', 'nights');
    expect(night.tests.map((x) => x.name)).toEqual(['TP-1']);
    expect(night.jointsOpen).toEqual(['F-1']);
    const day = logFacts(recs, TUE, 'BP-1');
    expect(day.tests).toEqual([]);
    expect(day.jointsOpen).toEqual([]);
  });

  test('a weld count said at 4 am goes on the report the shift started', () => {
    const say = { action: 'shift' as const, welds: [{ nps: 6, count: 2 }], rejects: [], spools: [], note: null, crew: null, hours: null, say: '' };
    const first = applyShift(emptyShifts(), say, 'BP-1', at(20), 'nights').log;
    const { log, report } = applyShift(first, say, 'BP-1', at(4, 7), 'nights');
    expect(report.day).toBe(TUE);
    expect(log.reports).toHaveLength(1);
    expect(reportFor(log, TUE, 'BP-1')!.welds).toEqual([{ nps: 6, count: 4 }]);
    expect(applyShift(emptyShifts(), say, 'BP-1', at(4, 7)).report.day).toBe(WED);
    const facts = logFacts({ tests: [], joints: [], heats: [], readings: [], sketches: [] }, TUE, 'BP-1', 'nights');
    expect(shiftFacts(report, facts, 'nights').date).toBe('Night shift of Tue 6 Oct 2026');
    expect(shiftFacts(report, facts).date).toBe('Tue 6 Oct 2026');
  });
});
