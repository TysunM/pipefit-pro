// Calibration alerts
// ------------------
// A gauge found overdue on the morning of a test is a test put off. So the
// phone says so a month out, time to send it away and get it back, and again
// on the day it runs out, at seven before the crew starts. Each alarm's key
// carries the due day: a new calibration moves it, and the old alarms no
// longer match and are taken down.
//
// Pure; state/holdAlerts.tsx keeps the phone's alarms matching this list.

import { DUE_SOON_DAYS, current, kindOf, tagKey, type Instrument } from '../state/calibration';

export const CALIBRATION_ALERT_PREFIX = 'cal:';
const HOUR = 7;

export type CalibrationAlert = { key: string; at: number; title: string; body: string };

function morning(day: string, before: number): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d - before, HOUR, 0, 0, 0).getTime();
}

export function calibrationAlerts(instruments: readonly Instrument[], now: number): CalibrationAlert[] {
  const out: CalibrationAlert[] = [];
  for (const i of instruments) {
    const c = current(i);
    if (i.out || !c) continue;
    const what = `${kindOf(i.kind).label.toLowerCase()} ${i.tag}`;
    const key = (k: string) => `${CALIBRATION_ALERT_PREFIX}${tagKey(i.tag)}:${c.due}:${k}`;
    const soon = morning(c.due, DUE_SOON_DAYS);
    if (soon > now) out.push({ key: key('soon'), at: soon, title: `${i.tag} calibration due in ${DUE_SOON_DAYS} days`, body: `The ${what} is due ${c.due}. Send it for calibration now so it is back before then.` });
    const last = morning(c.due, 0);
    if (last > now) out.push({ key: key('due'), at: last, title: `${i.tag} calibration runs out today`, body: `After today nothing read off the ${what} stands on a record until it is calibrated again.` });
  }
  return out.sort((a, b) => a.at - b.at);
}
