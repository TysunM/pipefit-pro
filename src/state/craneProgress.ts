// How the crane signals have gone
// -------------------------------
// Per signal: how often read or picked right and wrong, so the test brings up
// the ones got wrong. The test: the best score, the last, and how many taken.
// The quick read: the best time and the last, with the misses, and how many
// runs. Kept on the phone; a signal no longer in the app is dropped on the
// way in. Pure.

import { SIGNAL_IDS } from '../calc/crane/signals';
import { TEST_OF, type Seen } from '../calc/crane/drill';

export const CRANE_VERSION = 1;
export type QuickRun = { ms: number; missed: number; at: number };
export type CraneBook = { seen: Record<string, Seen>; test: { best: number | null; last: number | null; of: number; taken: number }; quick: { best: QuickRun | null; last: QuickRun | null; runs: number }; foreign: boolean; dropped: number };

const known = new Set<string>(SIGNAL_IDS);
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e9 ? v : null);

export const emptyCrane = (): CraneBook => ({ seen: {}, test: { best: null, last: null, of: TEST_OF, taken: 0 }, quick: { best: null, last: null, runs: 0 }, foreign: false, dropped: 0 });

/** The quick read's ranking: the fewest misses, then the quickest time with them. */
export const quicker = (a: QuickRun, b: QuickRun | null) => !b || a.missed < b.missed || (a.missed === b.missed && a.ms < b.ms);

export function parseCrane(raw: string | null | undefined): CraneBook {
  const empty = emptyCrane();
  if (!raw) return empty;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { ...empty, dropped: 1 };
  }
  if (!isRec(v) || !Number.isInteger(v.v) || (v.v as number) < 1) return { ...empty, dropped: 1 };
  if ((v.v as number) > CRANE_VERSION) return { ...empty, foreign: true };
  let dropped = 0;
  const seen: Record<string, Seen> = {};
  for (const [id, s] of Object.entries(isRec(v.seen) ? v.seen : {})) {
    const right = isRec(s) ? count(s.right) : null;
    const wrong = isRec(s) ? count(s.wrong) : null;
    if (!known.has(id) || right === null || wrong === null) {
      dropped += 1;
      continue;
    }
    seen[id] = { right, wrong };
  }
  const t = isRec(v.test) ? v.test : {};
  const of = count(t.of) || TEST_OF;
  const score = (x: unknown) => {
    const n = count(x);
    return n !== null && n <= of ? n : null;
  };
  const test = { best: score(t.best), last: score(t.last), of, taken: count(t.taken) ?? 0 };
  const run = (x: unknown): QuickRun | null => {
    if (!isRec(x)) return null;
    const ms = count(x.ms);
    const missed = count(x.missed);
    const at = typeof x.at === 'number' && Number.isFinite(x.at) ? x.at : null;
    return ms !== null && missed !== null && missed <= SIGNAL_IDS.length && at !== null ? { ms, missed, at } : null;
  };
  const q = isRec(v.quick) ? v.quick : {};
  const quick = { best: run(q.best), last: run(q.last), runs: count(q.runs) ?? 0 };
  return { seen, test, quick, foreign: false, dropped };
}

export function serialiseCrane(b: CraneBook): string {
  return JSON.stringify({ v: CRANE_VERSION, seen: b.seen, test: b.test, quick: b.quick });
}

/** One signal read or picked, right or wrong. */
export function recordSeen(b: CraneBook, id: string, right: boolean): CraneBook {
  const s = b.seen[id] ?? { right: 0, wrong: 0 };
  return { ...b, seen: { ...b.seen, [id]: right ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 } } };
}

export function recordCraneTest(b: CraneBook, score: number, of: number): CraneBook {
  return { ...b, test: { best: Math.max(b.test.best ?? 0, score), last: score, of, taken: b.test.taken + 1 } };
}

export function recordQuick(b: CraneBook, run: QuickRun): CraneBook {
  return { ...b, quick: { best: quicker(run, b.quick.best) ? run : b.quick.best, last: run, runs: b.quick.runs + 1 } };
}
