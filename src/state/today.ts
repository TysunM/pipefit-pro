// Today's work
// ------------
// The Projects tab opens on what was done today: anything saved, changed or
// finished in the work day — the calendar day on days, noon to noon on nights
// (calc/days.ts workDay). A view, never a delete: earlier work stays where it
// is and Everything shows it.

import { Shift, workDay } from '../calc/days';

/** Whether a time stamp falls in a work day ("2026-10-07"). */
export const onDay = (at: number | null | undefined, day: string, shift: Shift = 'days'): boolean =>
  typeof at === 'number' && at > 0 && workDay(at, shift) === day;

/** The records worked on a work day: any of their stamps (times, or work-day keys) on it. Order kept. */
export function workedOn<T>(xs: readonly T[], day: string, stamps: (x: T) => readonly (number | string | null | undefined)[], shift: Shift = 'days'): T[] {
  return xs.filter((x) => stamps(x).some((s) => (typeof s === 'string' ? s === day : onDay(s, day, shift))));
}
