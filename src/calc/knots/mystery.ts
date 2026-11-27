// Mystery knot
// ------------
// The job is given, never the knot: "tie off a hand line to the handrail".
// Pick the knot for it from all of them, then tie that knot from memory. A
// wrong pick says what the picked knot is for and which knot the job wants,
// and the right one is tied anyway. Choosing the knot is where the trouble
// starts on site, so it scores first. Pure.

import { KNOTS, knotById } from './knots';
import { missesFor } from './trace';

export const ROUNDS = 5;

export type MysteryRound = { knot: string; job: string };
/** One round done: the knot the job wanted, the one picked, and how the tie went (or that it was skipped). */
export type MysteryResult = { knot: string; picked: string; ms: number; slips: number; wrong: number; skipped?: boolean };
export type MysteryTotals = { rounds: number; right: number; ms: number; slips: number; wrong: number; misses: number; skipped: number };

/** Rounds from the random function given: a different knot each, one of its jobs at random. */
export function mysteryRounds(rnd: () => number, n = ROUNDS): MysteryRound[] {
  const ids = KNOTS.map((k) => k.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids.slice(0, Math.min(n, ids.length)).map((id) => {
    const jobs = knotById(id)!.jobs;
    return { knot: id, job: jobs[Math.floor(rnd() * jobs.length)]! };
  });
}

export function mysteryTotals(rs: readonly MysteryResult[]): MysteryTotals {
  const tied = rs.filter((r) => !r.skipped);
  const slips = tied.reduce((a, r) => a + r.slips, 0);
  const wrong = tied.reduce((a, r) => a + r.wrong, 0);
  return { rounds: rs.length, right: rs.filter((r) => r.picked === r.knot).length, ms: tied.reduce((a, r) => a + r.ms, 0), slips, wrong, misses: missesFor(slips, wrong), skipped: rs.length - tied.length };
}

/** What it says at the end: the right knot first, then how it was tied. */
export function verdictOf(t: MysteryTotals): { title: string; line: string } {
  if (t.right === t.rounds && t.misses === 0 && t.skipped === 0) return { title: 'Mind reader', line: 'Right knot every time, tied clean. You knew the knot before the job was finished.' };
  if (t.right === t.rounds) return { title: 'Right knot, every time', line: 'You picked the right knot for every job. The tying could use a polish.' };
  if (t.right >= t.rounds - 2) return { title: 'Mostly the right knot', line: "On site, mostly is how a tag line ends up on the ground. Look again at the ones you missed." };
  return { title: 'Wrong knot, right confidence', line: 'Go through Learn, then pick again: the job tells you the knot.' };
}

/** Whether session a beats b: more right picks, then fewer misses, then faster. */
export function mysteryBeats(a: MysteryTotals, b: MysteryTotals): boolean {
  if (a.right !== b.right) return a.right > b.right;
  if (a.skipped !== b.skipped) return a.skipped < b.skipped;
  if (a.misses !== b.misses) return a.misses < b.misses;
  return a.ms < b.ms;
}

/** What a wrong pick says: what the picked knot is for, and what the job wanted. */
export function whyNot(picked: string, right: string): string {
  const p = knotById(picked)!;
  const r = knotById(right)!;
  return `A ${p.name.toLowerCase()} is for this: ${lower(p.use)} This job wants a ${r.name.toLowerCase()}: ${lower(r.use)}`;
}
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
