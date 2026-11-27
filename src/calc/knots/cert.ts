// Knot Certified
// --------------
// The run: every knot, from memory, back to back, in an order shuffled each
// time so it can't be learned by heart. No line, no steps, no look at the
// line, every over or under called. Tie every one and you're certified: one
// certificate, that certifies absolutely nothing. Skip one and there's none.
// Its misses (each time off the line, a wrong call as two) and tying time are
// printed on it, and rank the best run. Pure.

import { KNOTS } from './knots';
import { missesFor } from './trace';

/** One knot in a run: how long it took, how often off the line, how many wrong calls, or skipped. */
export type CertKnot = { id: string; ms: number; slips: number; wrong: number; skipped?: boolean };
export type CertTotals = { ms: number; slips: number; wrong: number; misses: number; tied: number; skipped: number; of: number };

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
  return { ms, slips, wrong, misses: missesFor(slips, wrong), tied: done.length, skipped: run.length - done.length, of: KNOTS.length };
}

/** Certified: every knot tied, none skipped. */
export const certified = (t: CertTotals) => t.skipped === 0 && t.tied === t.of;

/** Whether run a beats run b: more knots tied (a certified run beats any other), then fewer misses, then faster. */
export function beats(a: CertTotals, b: CertTotals): boolean {
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
