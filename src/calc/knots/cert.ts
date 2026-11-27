// Knot Certified
// --------------
// The run: every knot, from memory, back to back, in an order shuffled each
// time so it can't be learned by heart. No line, no steps, no look at the
// line, every over or under called. All of them clean, not once off the line
// and not one wrong call, and you're certified: one certificate, that
// certifies absolutely nothing. One miss and the run is finished anyway, then
// run again, as many times as it takes. Pure.

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

/** Certified: every knot tied, none skipped, not once off the line, not one wrong call. */
export const certified = (t: CertTotals) => t.skipped === 0 && t.tied === t.of && t.slips === 0 && t.wrong === 0;

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
/** What kept a run from it, in words: "1 knot skipped, 2 times off the line and 1 wrong call". */
export function shortOf(t: CertTotals): string {
  const parts = [t.skipped ? `${count(t.skipped, 'knot')} skipped` : '', t.slips ? `${count(t.slips, 'time')} off the line` : '', t.wrong ? count(t.wrong, 'wrong call') : ''].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '');
}

/** Whether run a beats run b: more knots tied, then fewer misses (a certified run beats any other), then faster. */
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
