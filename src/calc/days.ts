// Days and clock times
// --------------------
// Records that are kept by the day — a shift report, a pressure test — need
// the same few things: the local day a moment falls on, the day's bounds, the
// day before and after, and the date and time the way a fitter writes them.
//
// A day is kept as YYYY-MM-DD in local time. Not a timestamp, because "the
// test on the 30th" is the 30th wherever the phone is and whatever the clock
// change did, and not a locale string, because it has to sort and compare.

const pad = (n: number) => String(n).padStart(2, '0');

/** The local day a moment falls on, as YYYY-MM-DD. */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether a string is a real calendar day in YYYY-MM-DD. */
export function isDay(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/**
 * The local midnight a day starts at, and the next one. A day is [start, end).
 * Given a turnover hour, the work day that runs from that hour to the same hour
 * the next day.
 */
export function dayBounds(day: string, hour = 0): { start: number; end: number } {
  const m = DAY_RE.exec(day);
  if (!m) return { start: NaN, end: NaN };
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return { start: new Date(y, mo, d, hour).getTime(), end: new Date(y, mo, d + 1, hour).getTime() };
}

/**
 * The shift a phone works. A day shift's work day is the calendar day. A night
 * shift's runs noon to noon and is dated by the night it started, so 6 pm
 * Tuesday to 6 am Wednesday is all Tuesday's work, on one shift report — the
 * way a night foreman dates it. Any shift that starts after noon and ends
 * before the next noon fits.
 */
export type Shift = 'days' | 'nights';
export const TURNOVER: Record<Shift, number> = { days: 0, nights: 12 };

/** The work day a moment belongs to. The calendar day on days; on nights, the day the shift started. */
export function workDay(at: number, shift: Shift = 'days'): string {
  const day = dayKey(at);
  return new Date(at).getHours() < TURNOVER[shift] ? shiftDay(day, -1) : day;
}

/** The day before or after. Through a month or a year end, and across a clock change. */
export function shiftDay(day: string, by: number): string {
  const m = DAY_RE.exec(day);
  if (!m) return day;
  return dayKey(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + by, 12).getTime());
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A day the way a report heads it: Tue 30 Sep 2026. */
export function dayLabel(day: string): string {
  const { start } = dayBounds(day);
  if (!Number.isFinite(start)) return day;
  const d = new Date(start);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A day the way it is written on a form or a calibration sticker here: 9/30/2026. */
export function usDate(day: string): string {
  const m = DAY_RE.exec(day);
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : '';
}

/**
 * A date as typed: 9/30/26, 9/30/2026, 9-30-2026 or 2026-09-30. Two-digit
 * years are this century. Null for anything that is not a real day.
 */
export function readDate(text: string): string | null {
  const s = text.trim();
  if (isDay(s)) return s;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const y = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const day = `${y}-${pad(Number(m[1]))}-${pad(Number(m[2]))}`;
  return isDay(day) ? day : null;
}

/** A time of day the way a gauge log has it: 9:05 am. */
export function clockLabel(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}

/**
 * A time as typed, on a given day: 9:05, 09:05, 905, 21:05, 9:05p, 9:05 pm.
 * With no am or pm it is read as a 24-hour clock, which is what a time with
 * no am or pm on a test record is. Null for anything that is not a time.
 */
export function readClock(text: string, day: string): number | null {
  const m = /^(\d{1,2}):?(\d{2})\s*([ap])?\.?\s*m?\.?$/i.exec(text.trim());
  const { start } = dayBounds(day);
  if (!m || !Number.isFinite(start)) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const half = m[3]?.toLowerCase();
  if (min > 59) return null;
  if (half) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (half === 'p' ? 12 : 0);
  } else if (h > 23) return null;
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, min).getTime();
}

/** A length of time the way a timer shows it: 7:05, or 1:07:05 past the hour. */
export function stopwatch(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
