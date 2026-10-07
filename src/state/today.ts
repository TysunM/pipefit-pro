// Today's work
// ------------
// The Projects tab opens on what was done today: anything saved, changed,
// finished or dated today, by the phone's own calendar. A view, never a
// delete — earlier work stays where it is and Everything shows it.

import { dayKey } from '../calc/days';

/** Whether a time stamp falls on a day ("2026-10-07"), local midnight to midnight. */
export const onDay = (at: number | null | undefined, day: string): boolean => typeof at === 'number' && at > 0 && dayKey(at) === day;

/** The records worked on a day: any of their stamps (times, or day keys) on it. Order kept. */
export function workedOn<T>(xs: readonly T[], day: string, stamps: (x: T) => readonly (number | string | null | undefined)[]): T[] {
  return xs.filter((x) => stamps(x).some((s) => (typeof s === 'string' ? s === day : onDay(s, day))));
}
