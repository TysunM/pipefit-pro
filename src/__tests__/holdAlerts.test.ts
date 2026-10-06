import { HOLD_ALERT_PREFIX, OVER_MIN, SOON_MIN, alarmChanges, alarmTest, holdAlerts } from '../calc/holdAlerts';
import { endHold, newTest, startHold, type PressureTest } from '../state/pressureLog';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 14, 0);

const mk = (patch: Partial<PressureTest> = {}): PressureTest => ({ ...newTest('J1', T0 - 10 * MIN), pkg: 'HT-12', ...patch });

describe('the alarms a running hold wants', () => {
  test('a 10 minute code hold rings when met, and again if left running', () => {
    const t = startHold(mk(), T0, 150);
    const a = holdAlerts([t], T0);
    expect(a.map((x) => [x.kind, (x.at - T0) / MIN])).toEqual([
      ['met', 10],
      ['over', 10 + OVER_MIN],
    ]);
    expect(a[0]!.title).toBe('Hold met: HT-12');
    expect(a[0]!.body).toBe('10 minutes held at 150 psi. Read the gauge, then end the hold.');
    expect(a[0]!.key).toBe(`${HOLD_ALERT_PREFIX}${t.id}:met:${T0}:10`);
  });

  test('a long hold also warns ahead, to get back to the gauge', () => {
    const t = startHold(mk({ holdReq: 120 }), T0, 150);
    const a = holdAlerts([t], T0);
    expect(a.map((x) => [x.kind, (x.at - T0) / MIN])).toEqual([
      ['soon', 120 - SOON_MIN],
      ['met', 120],
      ['over', 120 + OVER_MIN],
    ]);
    expect(a[0]!.title).toBe(`${SOON_MIN} minutes left: HT-12`);
  });

  test('only what is still ahead', () => {
    const t = startHold(mk(), T0, 150);
    expect(holdAlerts([t], T0 + 11 * MIN).map((x) => x.kind)).toEqual(['over']);
    expect(holdAlerts([t], T0 + 60 * MIN)).toEqual([]);
  });

  test('nothing for a hold not started, ended, or with no minutes to work to', () => {
    expect(holdAlerts([mk()], T0)).toEqual([]);
    expect(holdAlerts([endHold(startHold(mk(), T0, 150), T0 + 12 * MIN, 150)], T0 + 12 * MIN)).toEqual([]);
    expect(holdAlerts([startHold(mk({ code: 'spec', holdReq: null }), T0, 150)], T0)).toEqual([]);
    expect(holdAlerts([startHold(mk({ code: 'spec', holdReq: 30 }), T0, 150)], T0)).toHaveLength(3);
  });

  test('a retest is named as one', () => {
    const t = startHold(mk({ attempt: 2 }), T0, 150);
    expect(holdAlerts([t], T0)[0]!.title).toBe('Hold met: HT-12 retest 1');
  });

  test('several holds at once, soonest first', () => {
    const a = startHold({ ...mk(), id: 'a' }, T0, 150);
    const b = startHold({ ...mk({ holdReq: 15 }), id: 'b' }, T0 - 8 * MIN, 150);
    expect(holdAlerts([a, b], T0).map((x) => `${x.testId}:${x.kind}`)).toEqual(['b:soon', 'b:met', 'a:met', 'b:over', 'a:over']);
  });
});

describe('keeping the phone matching', () => {
  const t = startHold(mk(), T0, 150);
  const want = holdAlerts([t], T0);

  test('sets what is missing and takes down what is not wanted, leaving other alarms alone', () => {
    const stale = `${HOLD_ALERT_PREFIX}${t.id}:met:${T0 - MIN}:10`;
    const { cancel, add } = alarmChanges(want, [want[0]!.key, stale, 'something-else']);
    expect(cancel).toEqual([stale]);
    expect(add.map((a) => a.kind)).toEqual(['over']);
  });

  test('a moved start or changed minutes is new alarms, the old ones gone', () => {
    const moved = holdAlerts([{ ...t, hold: { ...t.hold, startAt: T0 - 2 * MIN } }], T0);
    const { cancel, add } = alarmChanges(moved, want.map((a) => a.key));
    expect(cancel).toHaveLength(2);
    expect(add).toHaveLength(2);
  });

  test('an ended hold takes its alarms down', () => {
    expect(alarmChanges([], want.map((a) => a.key)).cancel).toHaveLength(2);
  });

  test('an alarm leads back to its test', () => {
    expect(alarmTest(want[0]!.key)).toBe(t.id);
    expect(alarmTest('other:x')).toBeNull();
  });
});
