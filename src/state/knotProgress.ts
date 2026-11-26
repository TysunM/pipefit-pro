// What a fitter has tied and how the tests went
// ---------------------------------------------
// Per knot: how many times tied by finger, the best time and the best stars,
// the same again tied from memory, and the best round of spot the fault. The test: the best score, the last, and how many taken. Kept on the phone;
// a knot no longer in the app is dropped on the way in. Pure.

import { KNOTS } from '../calc/knots/knots';

export const KNOTS_VERSION = 1;
export type Tied = { count: number; bestMs: number; bestStars: number; at: number };
export type Checked = { best: number; of: number; at: number };
export type KnotBook = { tied: Record<string, Tied>; memory: Record<string, Tied>; checked: Record<string, Checked>; test: { best: number | null; last: number | null; of: number; taken: number }; foreign: boolean; dropped: number };

const known = new Set(KNOTS.map((k) => k.id));
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e6 ? v : null);

export const emptyKnots = (): KnotBook => ({ tied: {}, memory: {}, checked: {}, test: { best: null, last: null, of: 10, taken: 0 }, foreign: false, dropped: 0 });

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
  const tt = isRec(v.test) ? v.test : {};
  const of = count(tt.of) || 10;
  const score = (x: unknown) => (x === null ? null : count(x) !== null && (x as number) <= of ? (x as number) : null);
  return { tied, memory, checked, test: { best: score(tt.best ?? null), last: score(tt.last ?? null), of, taken: count(tt.taken) ?? 0 }, foreign: false, dropped };
}

export const serialiseKnots = (b: KnotBook) => JSON.stringify({ v: KNOTS_VERSION, tied: b.tied, memory: b.memory, checked: b.checked, test: b.test });

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

/** A test finished. */
export function recordTest(b: KnotBook, score: number, of: number): KnotBook {
  return { ...b, test: { best: Math.max(b.test.best ?? 0, score), last: score, of, taken: b.test.taken + 1 } };
}
