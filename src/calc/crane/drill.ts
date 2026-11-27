// The signals test and the quick read
// -----------------------------------
// The test: ten signals, some shown (which signal is that?) and some named
// (which one is it?), each against the three it's likeliest mistaken for. The
// ones a fitter has got wrong come up more. The quick read: every signal once,
// in a shuffle, as fast as they can be read; each miss costs five seconds.
// A one-hand signal is shown with either hand. Pure.

import { SIGNALS, signalById, type SignalId } from './signals';

export type Ask = 'read' | 'give';
export type Question = { id: SignalId; ask: Ask; options: SignalId[]; /** Per option, given with the left hand. */ left: boolean[] };
export type Seen = { right: number; wrong: number };

export const TEST_OF = 10;
export const MISS_MS = 5000;

const shuffle = <T>(xs: readonly T[], rand: () => number): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** How often a signal should come up: more for one got wrong, more again for one not seen. */
export function weight(s: Seen | undefined): number {
  if (!s || s.right + s.wrong === 0) return 2;
  return 1 + (3 * (s.wrong + 0.5)) / (s.right + s.wrong + 1);
}

/** The answer and three it's mistaken for, the nearest first, filled from the rest; shuffled. */
export function optionsFor(id: SignalId, rand: () => number): SignalId[] {
  const s = signalById(id)!;
  const near = s.near.filter((n) => n !== id).slice(0, 3);
  const rest = shuffle(
    SIGNALS.map((x) => x.id).filter((x) => x !== id && !near.includes(x)),
    rand,
  );
  return shuffle([id, ...near, ...rest].slice(0, 4), rand);
}

const sides = (ids: readonly SignalId[], rand: () => number) => ids.map((o) => !signalById(o)!.twoHands && rand() < 0.5);

function draw(rand: () => number, seen: Record<string, Seen>, n: number): SignalId[] {
  const pool = SIGNALS.map((s) => ({ id: s.id, w: weight(seen[s.id]) }));
  const out: SignalId[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, p) => a + p.w, 0);
    let r = rand() * total;
    let i = 0;
    for (; i < pool.length - 1; i += 1) {
      r -= pool[i]!.w;
      if (r <= 0) break;
    }
    out.push(pool[i]!.id);
    pool.splice(i, 1);
  }
  return out;
}

/** Ten different signals, the ones got wrong more likely; read or give, half and half. */
export function makeTest(rand: () => number, seen: Record<string, Seen> = {}, n = TEST_OF): Question[] {
  const ids = draw(rand, seen, n);
  const asks = shuffle(
    ids.map((_, i) => (i % 2 ? 'give' : 'read') as Ask),
    rand,
  );
  return ids.map((id, i) => {
    const options = optionsFor(id, rand);
    return { id, ask: asks[i]!, options, left: sides(options, rand) };
  });
}

/** Every signal once, shuffled, none straight after one it's mistaken for where that can be helped; all read. */
export function makeRun(rand: () => number): Question[] {
  const clash = (a: SignalId | undefined, b: SignalId) => !!a && signalById(b)!.near.includes(a);
  let ids: SignalId[] = [];
  let worst = Infinity;
  // A few shuffles, each laid out greedily; the one with the fewest clashes left.
  for (let tries = 0; tries < 8 && worst > 0; tries += 1) {
    const pool = shuffle(SIGNALS.map((s) => s.id), rand);
    const order: SignalId[] = [];
    while (pool.length) {
      const i = Math.max(0, pool.findIndex((x) => !clash(order[order.length - 1], x)));
      order.push(pool.splice(i, 1)[0]!);
    }
    const n = order.filter((x, i) => clash(order[i - 1], x)).length;
    if (n < worst) [ids, worst] = [order, n];
  }
  return ids.map((id) => {
    const options = optionsFor(id, rand);
    return { id, ask: 'read' as const, options, left: sides(options, rand) };
  });
}

/** A quick read's time: the clock and five seconds a miss. */
export const runTime = (ms: number, missed: number) => ms + missed * MISS_MS;
