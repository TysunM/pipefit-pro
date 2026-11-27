// Knot Certified
// --------------
// The run: every knot, from memory, back to back, in an order shuffled each
// time so it can't be learned by heart. No line, no steps, no look at the
// line, every over or under called. All of them, not one wrong call, none
// skipped, and no more than three times off the line on any one knot, and
// you're certified: one certificate, that certifies absolutely nothing. Past
// that and the run is finished anyway, then run again, as many times as it
// takes. Pure.

import { KNOTS } from './knots';
import { missesFor } from './trace';

/** One knot in a run: how long it took, how often off the line, how many wrong calls, or skipped. */
export type CertKnot = { id: string; ms: number; slips: number; wrong: number; skipped?: boolean };
export type CertTotals = { ms: number; slips: number; wrong: number; misses: number; tied: number; skipped: number; of: number; /** Knots off the line more often than allowed. */ over: number };

/** Times off the line allowed on any one knot of a certified run. */
export const OFF_LINE_ALLOWED = 3;

/** The one certificate: its stamp and its title. */
export const STAMP = 'KNOT CERTIFIED';
export const TITLE = 'Certified Master Of Rope';

/** What it says at the bottom of every one, whatever the score. */
export const FINE_PRINT =
  'This certifies absolutely nothing. Not valid for rigging, lifting, fall protection or impressing your foreman. Knots are for tag lines and hand lines: tie it in real rope before you need it.';

export function certTotals(run: readonly CertKnot[]): CertTotals {
  const done = run.filter((r) => !r.skipped);
  const ms = done.reduce((a, r) => a + r.ms, 0);
  const slips = done.reduce((a, r) => a + r.slips, 0);
  const wrong = done.reduce((a, r) => a + r.wrong, 0);
  const over = done.filter((r) => r.slips > OFF_LINE_ALLOWED).length;
  return { ms, slips, wrong, misses: missesFor(slips, wrong), tied: done.length, skipped: run.length - done.length, of: KNOTS.length, over };
}

/** Certified: every knot there is tied, none skipped, not one wrong call, no knot off the line more than allowed. */
export const certified = (t: CertTotals) => t.of === KNOTS.length && t.tied === t.of && t.skipped === 0 && t.wrong === 0 && t.over === 0;

/** How many knots in a run were missed: skipped, a wrong call, or off the line more than allowed. */
export const missedOf = (run: readonly CertKnot[]) => run.filter((r) => r.skipped || r.wrong || r.slips > OFF_LINE_ALLOWED).length;

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
/** What kept a run from it, in words: "1 knot skipped, 2 knots off the line more than 3 times and 1 wrong call". */
export function shortOf(t: CertTotals): string {
  const parts = [t.skipped ? `${count(t.skipped, 'knot')} skipped` : '', t.over ? `${count(t.over, 'knot')} off the line more than ${OFF_LINE_ALLOWED} times` : '', t.wrong ? count(t.wrong, 'wrong call') : ''].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '');
}

/** Whether run a beats run b: certified beats not, then more knots tied, then fewer misses, then faster. */
export function beats(a: CertTotals, b: CertTotals): boolean {
  if (certified(a) !== certified(b)) return certified(a);
  if (a.tied !== b.tied) return a.tied > b.tied;
  if (a.misses !== b.misses) return a.misses < b.misses;
  return a.ms < b.ms;
}

/** Every knot once, in an order from the random function given. */
export function certOrder(rnd: () => number): string[] {
  const ids = KNOTS.map((k) => k.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids;
}

/** Minutes and seconds: 3:07. */
export function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
