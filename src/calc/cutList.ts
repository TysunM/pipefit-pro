// What to pull off the rack
// -------------------------
// A spool solved to cuts tells you how long every piece is. It does not tell
// you what to go and get, and those are different questions: four pieces
// totalling 180 inches are not fifteen feet of pipe, they are one twenty foot
// stick if they nest and two if they do not.
//
// So the cuts are packed onto sticks of whatever length the rack holds, and the
// answer is the number of sticks, what comes off each one, and what is left.
// The leftovers matter as much as the count: one long drop is material, and
// the same footage in four short ones is scrap.
//
// Two things this is careful about.
//
// The saw takes pipe. Every piece severed off a stick costs a kerf as well as
// its own length, so a stick that looks like it holds exactly four sixty inch
// pieces holds three. The kerf is charged on every piece including the last,
// which over-states the loss by one kerf on a stick used right to its end —
// the one direction it is safe to be wrong in when somebody is ordering.
//
// First fit is not good enough. Packing biggest first and dropping each piece
// in the first stick it fits is the usual answer and it is not the right one:
// it can call for a stick nobody needs. For the sizes this deals with the best
// packing is found outright, by trying every way the pieces can be grouped,
// and among the ways that use the fewest sticks it takes the one that leaves
// the longest single drop.

export type CutPiece = {
  id: string;
  /** What to write on it: `Leg 3`, `Riser`. */
  label: string;
  /** The same, short enough to sit inside its own bar: `3`. */
  tag?: string;
  length: number;
};

export type Stick = {
  /** 1, 2, 3 — what a man would call them out as. */
  number: number;
  pieces: CutPiece[];
  /** Pipe consumed: the pieces plus a kerf for each. */
  used: number;
  /** What is left on the end of it. */
  drop: number;
};

export type CutPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      sticks: Stick[];
      /** How many to pull. */
      count: number;
      /** Length of stock bought. */
      bought: number;
      /** Length that ends up in the spool. */
      inTheJob: number;
      /** Length the saw takes. */
      kerfLoss: number;
      /** What is left on the end of each stick, longest first. */
      drops: number[];
      /** The one worth putting back on the rack. */
      longestDrop: number;
      /** Everything bought and not used. */
      offcut: number;
      offcutPct: number;
      /** True when the packing is provably the fewest sticks, not merely a good one. */
      best: boolean;
    };

/** Above this many pieces the search is dropped for a good-enough packing. */
export const EXACT_UP_TO = 9;
/** A ceiling on the search, so a pathological list cannot hang a screen. */
const BUDGET = 400_000;

const EPS = 1e-9;

type Packing = { bins: CutPiece[][]; used: number[]; longest: number };

/**
 * Every way of grouping the pieces, with the hopeless ones cut off early.
 *
 * Pieces go in longest first, which fills sticks fast and makes the pruning
 * bite: any arrangement already using more sticks than the best one found is
 * abandoned where it stands. Two sticks with the same room left in them are
 * the same choice, so only one of them is tried.
 */
function packExactly(pieces: CutPiece[], stock: number, kerf: number): Packing | null {
  const items = [...pieces].sort((a, b) => b.length - a.length);
  const need = (p: CutPiece) => p.length + kerf;

  let best: Packing | null = null;
  let budget = BUDGET;
  const bins: CutPiece[][] = [];
  const used: number[] = [];

  const place = (i: number): void => {
    if (budget-- <= 0) return;
    if (best && bins.length > best.bins.length) return;

    if (i === items.length) {
      const longest = used.length ? Math.max(...used.map((u) => stock - u)) : 0;
      if (!best || bins.length < best.bins.length || longest > best.longest + EPS)
        best = { bins: bins.map((b) => [...b]), used: [...used], longest };
      return;
    }

    const item = items[i]!;
    const tried = new Set<string>();
    for (let b = 0; b < bins.length; b += 1) {
      if (used[b]! + need(item) > stock + EPS) continue;
      const room = used[b]!.toFixed(6);
      if (tried.has(room)) continue;
      tried.add(room);
      bins[b]!.push(item);
      used[b] = used[b]! + need(item);
      place(i + 1);
      bins[b]!.pop();
      used[b] = used[b]! - need(item);
    }

    // A fresh stick, but only while one more could still be an improvement.
    if (!best || bins.length + 1 <= best.bins.length) {
      bins.push([item]);
      used.push(need(item));
      place(i + 1);
      bins.pop();
      used.pop();
    }
  };

  place(0);
  return budget > 0 ? best : (best ?? null);
}

/** Biggest first into the first stick that takes it. Quick, and usually close. */
function packFirstFit(pieces: CutPiece[], stock: number, kerf: number): Packing {
  const items = [...pieces].sort((a, b) => b.length - a.length);
  const bins: CutPiece[][] = [];
  const used: number[] = [];
  for (const item of items) {
    const need = item.length + kerf;
    const at = used.findIndex((u) => u + need <= stock + EPS);
    if (at >= 0) {
      bins[at]!.push(item);
      used[at] = used[at]! + need;
    } else {
      bins.push([item]);
      used.push(need);
    }
  }
  return { bins, used, longest: used.length ? Math.max(...used.map((u) => stock - u)) : 0 };
}

/**
 * What to pull off the rack for a list of cuts.
 *
 * `kerf` is what the saw takes on every cut. Pass 0 and the plan assumes a
 * blade with no thickness, which is a plan that comes up one piece short.
 */
export function planCuts(pieces: CutPiece[], stock: number, kerf: number): CutPlan {
  const k = Number.isFinite(kerf) && kerf > 0 ? kerf : 0;
  if (!Number.isFinite(stock) || stock <= 0) return { ok: false, error: 'Set a stock length in Settings.' };

  const real = pieces.filter((p) => Number.isFinite(p.length) && p.length > 0);
  if (!real.length) return { ok: false, error: 'Nothing to cut yet.' };

  const tooLong = real.find((p) => p.length + k > stock + EPS);
  if (tooLong)
    return {
      ok: false,
      error: `${tooLong.label} is ${tooLong.length.toFixed(2)} long and a stick is ${stock.toFixed(2)}. It has to be joined, or bought longer.`,
    };

  const exact = real.length <= EXACT_UP_TO;
  const packing = (exact ? packExactly(real, stock, k) : null) ?? packFirstFit(real, stock, k);

  // Fullest stick first, so the one with the drop worth keeping is last and
  // reads as the odd one — which is how it gets treated on the rack.
  const order = packing.bins
    .map((pieces2, i) => ({ pieces: pieces2, used: packing.used[i]! }))
    .sort((a, b) => b.used - a.used);

  const sticks: Stick[] = order.map((s, i) => ({
    number: i + 1,
    // Longest piece first off each stick: the cut nobody wants to get wrong.
    pieces: [...s.pieces].sort((a, b) => b.length - a.length),
    used: s.used,
    drop: stock - s.used,
  }));

  const inTheJob = real.reduce((t, p) => t + p.length, 0);
  const bought = sticks.length * stock;
  const drops = sticks.map((s) => s.drop).sort((a, b) => b - a);

  return {
    ok: true,
    sticks,
    count: sticks.length,
    bought,
    inTheJob,
    kerfLoss: real.length * k,
    drops,
    longestDrop: drops[0] ?? 0,
    offcut: bought - inTheJob,
    offcutPct: bought > 0 ? ((bought - inTheJob) / bought) * 100 : 0,
    best: exact,
  };
}
