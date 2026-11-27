// Knot Certified
// --------------
// The run: every knot, from memory, back to back, in an order shuffled each
// time so it can't be learned by heart. No line, no steps, no look at the
// line, every over or under called. Scored on misses (each time off the line,
// and a wrong call as two) and the time spent tying. Then a certificate that
// certifies absolutely nothing. Pure.

import { KNOTS } from './knots';
import { missesFor } from './trace';

/** One knot in a run: how long it took, how often off the line, how many wrong calls, or skipped. */
export type CertKnot = { id: string; ms: number; slips: number; wrong: number; skipped?: boolean };
export type Tier = 'grand' | 'certified' | 'quite' | 'yet';
export type CertTotals = { ms: number; slips: number; wrong: number; misses: number; tied: number; skipped: number; of: number };

export const TIERS: Record<Tier, { stamp: string; struck?: string; title: string }> = {
  grand: { stamp: 'KNOT CERTIFIED', title: 'Certified Master Of Rope' },
  certified: { stamp: 'KNOT CERTIFIED', title: 'Journeyman Knotter' },
  quite: { stamp: 'KNOT QUITE', struck: 'CERTIFIED', title: 'Knot Quite Certified' },
  yet: { stamp: 'KNOT YET', struck: 'CERTIFIED', title: 'Knot Yet Certified' },
};

/** What it says at the bottom of every one, whatever the score. */
export const FINE_PRINT =
  'This certifies absolutely nothing. Not valid for rigging, lifting, fall protection or impressing your foreman. Knots are for tag lines and hand lines: tie it in real rope before you need it.';

/** The misses a run can have and still be certified, and still be quite. */
export const CERTIFIED_UP_TO = 4;
export const QUITE_UP_TO = 10;

export function certTotals(run: readonly CertKnot[]): CertTotals {
  const done = run.filter((r) => !r.skipped);
  const ms = done.reduce((a, r) => a + r.ms, 0);
  const slips = done.reduce((a, r) => a + r.slips, 0);
  const wrong = done.reduce((a, r) => a + r.wrong, 0);
  return { ms, slips, wrong, misses: missesFor(slips, wrong), tied: done.length, skipped: run.length - done.length, of: KNOTS.length };
}

/** A clean run of every knot is a grand master; any knot skipped or left untied, knot yet. */
export function tierOf(t: CertTotals): Tier {
  if (t.skipped > 0 || t.tied < t.of) return 'yet';
  if (t.misses === 0) return 'grand';
  if (t.misses <= CERTIFIED_UP_TO) return 'certified';
  if (t.misses <= QUITE_UP_TO) return 'quite';
  return 'yet';
}

const RANK: Record<Tier, number> = { grand: 3, certified: 2, quite: 1, yet: 0 };
/** Whether run a beats run b: the better tier, then fewer misses, then faster. */
export function beats(a: CertTotals, b: CertTotals): boolean {
  const ta = RANK[tierOf(a)];
  const tb = RANK[tierOf(b)];
  if (ta !== tb) return ta > tb;
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
