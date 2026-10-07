// Hold alerts
// -----------
// A hold is ten minutes at least and can run hours, and nobody stands over a
// gauge with the phone unlocked for that. So every running hold is turned
// into alarms the phone keeps itself, locked or not: a warning a few minutes
// out so there is time to walk back to the gauge, the moment the hold is met,
// and a nudge if it is left running long after — a hold that is never ended
// puts a wrong time on the record.
//
// Worked from the stamps alone, so the same list comes out after a restart,
// and each alarm's key carries the start and the minutes it was worked from:
// change either and the old alarms no longer match and are taken down.
//
// Pure; state/holdAlerts.tsx keeps the phone's alarms matching this list.

import { requiredHold } from './pressureTest';
import { holding, testName, type PressureTest } from '../state/pressureLog';

export type HoldAlertKind = 'soon' | 'met' | 'over';

export type HoldAlert = {
  /** The alarm's id on the phone: `hold:<test>:<kind>:<start>:<minutes>`. */
  key: string;
  testId: string;
  kind: HoldAlertKind;
  at: number;
  title: string;
  body: string;
};

/** How long before the hold is met the warning comes, minutes. Only on holds long enough to walk away from. */
export const SOON_MIN = 5;
export const SOON_FROM_MIN = 15;
/** How long past the hold a running one is called out, minutes. */
export const OVER_MIN = 30;

export const HOLD_ALERT_PREFIX = 'hold:';

const MIN = 60_000;
const psi = (n: number | null) => (n === null ? '' : ` at ${Math.round(n * 10) / 10} psi`);

/** The alarms every running hold wants, soonest first; only those still ahead of `now`. */
export function holdAlerts(tests: readonly PressureTest[], now: number): HoldAlert[] {
  const out: HoldAlert[] = [];
  for (const t of tests) {
    if (!holding(t) || t.hold.startAt === null) continue;
    const need = requiredHold(t);
    if (need === null || !(need > 0)) continue;
    const start = t.hold.startAt;
    const name = testName(t);
    const metAt = start + need * MIN;
    const key = (kind: HoldAlertKind) => `${HOLD_ALERT_PREFIX}${t.id}:${kind}:${start}:${need}`;
    const add = (kind: HoldAlertKind, at: number, title: string, body: string) => {
      if (at > now) out.push({ key: key(kind), testId: t.id, kind, at, title, body });
    };
    if (need >= SOON_FROM_MIN) add('soon', metAt - SOON_MIN * MIN, `${SOON_MIN} minutes left: ${name}`, `The ${need} minute hold is met in ${SOON_MIN} minutes. Get back to the gauge.`);
    add('met', metAt, `Hold met: ${name}`, `${need} minutes held${psi(t.hold.startPsi)}. Read the gauge, then end the hold.`);
    add('over', metAt + OVER_MIN * MIN, `Still holding: ${name}`, `The hold was met ${OVER_MIN} minutes ago and is still running. End it, or the record says it is still holding.`);
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Which of the phone's alarms to take down and which to set, so it holds exactly `want`. */
export function alarmChanges<A extends { key: string }>(want: readonly A[], set: readonly string[], prefixes: readonly string[] = [HOLD_ALERT_PREFIX]): { cancel: string[]; add: A[] } {
  const wanted = new Set(want.map((a) => a.key));
  const have = new Set(set);
  return {
    cancel: set.filter((k) => prefixes.some((p) => k.startsWith(p)) && !wanted.has(k)),
    add: want.filter((a) => !have.has(a.key)),
  };
}

/** The test an alarm's id belongs to, or null for one that is not a hold alarm. */
export function alarmTest(key: string): string | null {
  if (!key.startsWith(HOLD_ALERT_PREFIX)) return null;
  const id = key.slice(HOLD_ALERT_PREFIX.length).split(':')[0];
  return id || null;
}
