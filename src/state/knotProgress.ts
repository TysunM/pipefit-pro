// What a fitter has tied and how the tests went
// ---------------------------------------------
// Per knot: how many times tied by finger, the best time and the best stars,
// the same again tied from memory, and the best round of spot the fault. The
// Knot Certified run and Mystery knot sessions: the best and the last, and how
// many. The test: the best score, the last, and how many taken. Kept on the
// phone; a knot no longer in the app is dropped on the way in. Pure.

import { KNOTS } from '../calc/knots/knots';
import type { CertTotals } from '../calc/knots/cert';
import type { MysteryTotals } from '../calc/knots/mystery';

export const KNOTS_VERSION = 1;
export type Tied = { count: number; bestMs: number; bestStars: number; at: number };
export type Checked = { best: number; of: number; at: number };
export type CertRun = CertTotals & { at: number };
export type MysteryRun = MysteryTotals & { at: number };
export type KnotBook = { tied: Record<string, Tied>; memory: Record<string, Tied>; checked: Record<string, Checked>; cert: { best: CertRun | null; last: CertRun | null; runs: number }; mystery: { best: MysteryRun | null; last: MysteryRun | null; runs: number }; test: { best: number | null; last: number | null; of: number; taken: number }; foreign: boolean; dropped: number };

const known = new Set(KNOTS.map((k) => k.id));
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e6 ? v : null);

export const emptyKnots = (): KnotBook => ({ tied: {}, memory: {}, checked: {}, cert: { best: null, last: null, runs: 0 }, mystery: { best: null, last: null, runs: 0 }, test: { best: null, last: null, of: 10, taken: 0 }, foreign: false, dropped: 0 });

export function parseKnots(raw: string | null | undefined): KnotBook {
  const empty = emptyKnots();
  if (!raw) return empty;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { ...empty, dropped: 1 };
  }
  if (!isRec(v) || !Number.isInteger(v.v) || (v.v as number) < 1) return { ...empty, dropped: 1 };
  if ((v.v as number) > KNOTS_VERSION) return { ...empty, foreign: true };
  let dropped = 0;
  const ties = (raw: unknown) => {
    const out: Record<string, Tied> = {};
    for (const [id, t] of Object.entries(isRec(raw) ? raw : {})) {
      const c = isRec(t) ? count(t.count) : null;
      const ms = isRec(t) ? count(t.bestMs) : null;
      const stars = isRec(t) ? count(t.bestStars) : null;
      const at = isRec(t) && typeof t.at === 'number' && Number.isFinite(t.at) ? t.at : null;
      if (!known.has(id) || c === null || ms === null || stars === null || stars > 3 || at === null) {
        dropped += 1;
        continue;
      }
      out[id] = { count: c, bestMs: ms, bestStars: stars, at };
    }
    return out;
  };
  const tied = ties(v.tied);
  const memory = ties(v.memory);
  const checked: Record<string, Checked> = {};
  for (const [id, ch] of Object.entries(isRec(v.checked) ? v.checked : {})) {
    const of = isRec(ch) ? count(ch.of) : null;
    const best = isRec(ch) ? count(ch.best) : null;
    const at = isRec(ch) && typeof ch.at === 'number' && Number.isFinite(ch.at) ? ch.at : null;
    if (!known.has(id) || !of || best === null || best > of || at === null) {
      dropped += 1;
      continue;
    }
    checked[id] = { best, of, at };
  }
  const run = (r: unknown): CertRun | null => {
    if (r === null || r === undefined) return null;
    const f = isRec(r) ? (['ms', 'slips', 'wrong', 'misses', 'tied', 'skipped', 'of'] as const).map((k) => count(r[k])) : null;
    const at = isRec(r) && typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : null;
    if (!f || f.some((x) => x === null) || at === null || f[4]! + f[5]! > f[6]! || f[3] !== f[1]! + 2 * f[2]!) {
      dropped += 1;
      return null;
    }
    const [ms, slips, wrong, misses, tied, skipped, of] = f as number[];
    // Knots over the line allowance, kept since the run had sixteen knots: a run from before it never certifies anyway.
    const over = isRec(r) && r.over !== undefined ? count(r.over) : 0;
    if (over === null || over > tied!) {
      dropped += 1;
      return null;
    }
    return { ms: ms!, slips: slips!, wrong: wrong!, misses: misses!, tied: tied!, skipped: skipped!, of: of!, over, at };
  };
  const session = (r: unknown): MysteryRun | null => {
    if (r === null || r === undefined) return null;
    const f = isRec(r) ? (['rounds', 'right', 'ms', 'slips', 'wrong', 'misses', 'skipped'] as const).map((k) => count(r[k])) : null;
    const at = isRec(r) && typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : null;
    if (!f || f.some((x) => x === null) || at === null || f[1]! > f[0]! || f[6]! > f[0]! || f[5] !== f[3]! + 2 * f[4]!) {
      dropped += 1;
      return null;
    }
    const [rounds, right, ms, slips, wrong, misses, skipped] = f as number[];
    return { rounds: rounds!, right: right!, ms: ms!, slips: slips!, wrong: wrong!, misses: misses!, skipped: skipped!, at };
  };
  const my = isRec(v.mystery) ? v.mystery : {};
  const mystery = { best: session(my.best), last: session(my.last), runs: count(my.runs) ?? 0 };
  const cr = isRec(v.cert) ? v.cert : {};
  const cert = { best: run(cr.best), last: run(cr.last), runs: count(cr.runs) ?? 0 };
  const tt = isRec(v.test) ? v.test : {};
  const of = count(tt.of) || 10;
  const score = (x: unknown) => (x === null ? null : count(x) !== null && (x as number) <= of ? (x as number) : null);
  return { tied, memory, checked, cert, mystery, test: { best: score(tt.best ?? null), last: score(tt.last ?? null), of, taken: count(tt.taken) ?? 0 }, foreign: false, dropped };
}

export const serialiseKnots = (b: KnotBook) => JSON.stringify({ v: KNOTS_VERSION, tied: b.tied, memory: b.memory, checked: b.checked, cert: b.cert, mystery: b.mystery, test: b.test });

/** A Knot Certified run finished: kept as the last, and as the best if it beats it. */
export function recordCert(b: KnotBook, t: CertTotals, now: number, better: (a: CertTotals, c: CertTotals) => boolean): KnotBook {
  const r: CertRun = { ...t, at: now };
  return { ...b, cert: { best: !b.cert.best || better(t, b.cert.best) ? r : b.cert.best, last: r, runs: b.cert.runs + 1 } };
}

/** A knot tied by finger, with the line shown or from memory: one more time, and the best kept. */
export function recordTie(b: KnotBook, id: string, ms: number, stars: number, now: number, where: 'tied' | 'memory' = 'tied'): KnotBook {
  if (!known.has(id)) return b;
  const had = b[where][id];
  const ms0 = Math.max(0, Math.round(ms));
  return {
    ...b,
    [where]: { ...b[where], [id]: { count: (had?.count ?? 0) + 1, bestMs: had ? Math.min(had.bestMs, ms0) : ms0, bestStars: Math.max(had?.bestStars ?? 0, Math.min(3, stars)), at: now } },
  };
}

/** A round of spot the fault finished: the best kept, out of the faults that knot has now. */
export function recordCheck(b: KnotBook, id: string, score: number, of: number, now: number): KnotBook {
  if (!known.has(id) || of < 1) return b;
  const had = b.checked[id];
  const best = had && had.of === of ? Math.max(had.best, score) : score;
  return { ...b, checked: { ...b.checked, [id]: { best: Math.max(0, Math.min(of, best)), of, at: now } } };
}

/** A Mystery knot session finished: kept as the last, and as the best if it beats it. */
export function recordMystery(b: KnotBook, t: MysteryTotals, now: number, better: (a: MysteryTotals, c: MysteryTotals) => boolean): KnotBook {
  const r: MysteryRun = { ...t, at: now };
  return { ...b, mystery: { best: !b.mystery.best || better(t, b.mystery.best) ? r : b.mystery.best, last: r, runs: b.mystery.runs + 1 } };
}

/** A test finished. */
export function recordTest(b: KnotBook, score: number, of: number): KnotBook {
  return { ...b, test: { best: Math.max(b.test.best ?? 0, score), last: score, of, taken: b.test.taken + 1 } };
}
