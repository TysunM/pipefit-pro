// Continuity alerts
// -----------------
// A welder who lapses on a process is found out at the next weld he puts a
// stamp on, which is too late: the weld is in and the record shows an
// unqualified welder. So the phone says so ahead, two weeks out and on the
// last good day, at seven in the morning, before the crew starts. Each alarm's
// key carries the day it is worked to: a weld logged with the process moves
// the day, the old alarms no longer match and are taken down.
//
// Pure; state/holdAlerts.tsx keeps the phone's alarms matching this list.

import { continuity, stampKey, type Weld, type Welder } from '../state/weldLog';

export const CONTINUITY_ALERT_PREFIX = 'cont:';
/** How far ahead the first warning comes, days. */
export const CONTINUITY_ALERT_DAYS = 14;
const HOUR = 7;

export type ContinuityAlert = { key: string; at: number; title: string; body: string };

/** Seven in the morning, local time, some days before a day. */
function morning(day: string, before: number): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d - before, HOUR, 0, 0, 0).getTime();
}

export function continuityAlerts(welders: readonly Welder[], welds: readonly Weld[], today: string, now: number): ContinuityAlert[] {
  const out: ContinuityAlert[] = [];
  for (const w of welders) {
    const who = `${w.stamp}${w.name ? ` (${w.name})` : ''}`;
    for (const c of continuity(w, welds, today)) {
      if (c.state === 'lapsed') continue;
      const key = (k: string) => `${CONTINUITY_ALERT_PREFIX}${stampKey(w.stamp)}:${c.process}:${c.until}:${k}`;
      const soon = morning(c.until, CONTINUITY_ALERT_DAYS);
      if (soon > now)
        out.push({ key: key('soon'), at: soon, title: `${w.stamp} ${c.process} continuity: ${CONTINUITY_ALERT_DAYS} days left`, body: `${who} has not welded ${c.process} since ${c.last}. Weld it before ${c.until}, or the qualification lapses.` });
      const last = morning(c.until, 0);
      if (last > now)
        out.push({ key: key('last'), at: last, title: `${w.stamp} ${c.process} lapses after today`, body: `${who} must weld ${c.process} today or be requalified before welding it again.` });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
