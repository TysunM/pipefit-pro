import { NPT_TABLE } from './thread';

// Laying lengths of cast iron reducer couplings.
//
// The book draws two patterns and marks one dimension on each: J on the left
// hand casting, K on the right. Both mark the same thing — the gap left
// between the end of the large pipe and the end of the small pipe once both
// are made up tight. That gap is what a reducer adds to a run.
//
// Every printed row obeys one rule:
//
//     gap = shoulder(large) - engagementWhenTight(small)
//
// where the shoulder is how deep the casting carries the large pipe's end past
// the small end's face. It is fixed by the pattern and the large size, so one
// constant covers a whole block of the printed table. All thirty nine K rows
// across ten large sizes fit it with no exception at all, and the shoulder it implies
// for 4, 5, 6 and 8 inch reproduces this project's thread engagements for those
// sizes, which the coupling table never prints.
//
// A dash in the print means that pattern is not made in that combination. The
// rule will still work out a gap for it, so the printed rows are kept as the
// record of what is actually made and the rule is offered separately.

export type Pattern = 'j' | 'k';

export type ReducerCoupling = {
  large: number;
  small: number;
  /** Gap for the left hand pattern, or no value where it is not made. */
  j: number;
  /** Gap for the right hand pattern, or no value where it is not made. */
  k: number;
};

const N = NaN;

export const REDUCER_COUPLINGS: ReducerCoupling[] = [
  { large: 0.75, small: 0.5, j: 0.4375, k: N },
  { large: 1, small: 0.5, j: 0.5, k: N },
  { large: 1, small: 0.75, j: 0.625, k: N },
  { large: 1.25, small: 0.75, j: N, k: 0.875 },
  { large: 1.25, small: 1, j: 0.75, k: 0.75 },
  { large: 1.5, small: 0.75, j: N, k: 1 },
  { large: 1.5, small: 1, j: N, k: 0.875 },
  { large: 1.5, small: 1.25, j: N, k: 0.875 },
  { large: 2, small: 0.75, j: N, k: 1.125 },
  { large: 2, small: 1, j: 1, k: 1 },
  { large: 2, small: 1.25, j: 1, k: 1 },
  { large: 2, small: 1.5, j: 1, k: 1 },
  { large: 2.5, small: 1, j: N, k: 1.0625 },
  { large: 2.5, small: 1.25, j: N, k: 1.0625 },
  { large: 2.5, small: 1.5, j: N, k: 1.0625 },
  { large: 2.5, small: 2, j: 0.9375, k: 1 },
  { large: 3, small: 1, j: N, k: 1.25 },
  { large: 3, small: 1.25, j: N, k: 1.25 },
  { large: 3, small: 1.5, j: N, k: 1.25 },
  { large: 3, small: 2, j: 1.125, k: 1.1875 },
  { large: 3, small: 2.5, j: 0.9375, k: 1 },
  { large: 3.5, small: 1, j: N, k: 1.375 },
  { large: 3.5, small: 1.25, j: N, k: 1.375 },
  { large: 3.5, small: 1.5, j: N, k: 1.375 },
  { large: 3.5, small: 2, j: N, k: 1.3125 },
  { large: 3.5, small: 2.5, j: N, k: 1.125 },
  { large: 3.5, small: 3, j: N, k: 1.0625 },
  { large: 4, small: 1, j: N, k: 1.5625 },
  { large: 4, small: 1.25, j: N, k: 1.5625 },
  { large: 4, small: 1.5, j: N, k: 1.5625 },
  { large: 4, small: 2, j: 1.5, k: 1.5 },
  { large: 4, small: 2.5, j: 1.3125, k: 1.3125 },
  { large: 4, small: 3, j: 1.25, k: 1.25 },
  { large: 5, small: 2, j: N, k: 1.875 },
  { large: 5, small: 3, j: N, k: 1.625 },
  { large: 5, small: 4, j: 1.5, k: 1.5 },
  { large: 6, small: 2, j: N, k: 2.3125 },
  { large: 6, small: 3, j: N, k: 2.0625 },
  { large: 6, small: 4, j: 1.9375, k: 1.9375 },
  { large: 6, small: 5, j: 1.8125, k: 1.8125 },
  { large: 8, small: 5, j: N, k: 2.5625 },
  { large: 8, small: 6, j: 2.5, k: 2.5 },
];

/**
 * How deep each casting carries the large pipe's end past the small end's face.
 *
 * The one inch J figure is 1-3/16, not the 1 inch the 1 x 1/2 row works out to.
 * That row prints J as 1/2 where the rule wants 11/16, and it is the only row
 * on either page that does not fit. The 1 x 3/4 row on the same page gives
 * 1-3/16, and the sizes either side of it are 15/16 and 1-7/16, a clean quarter
 * inch step through it. The 1 x 1/2 row is the odd one out, so the sequence is
 * kept and that row is held as printed and flagged rather than followed.
 */
export const SHOULDER: Record<Pattern, ReadonlyMap<number, number>> = {
  j: new Map([
    [0.75, 0.9375],
    [1, 1.1875],
    [1.25, 1.4375],
    [2, 1.6875],
    [2.5, 1.6875],
    [3, 1.875],
    [4, 2.25],
    [5, 2.625],
    [6, 3.0625],
    [8, 3.8125],
  ]),
  k: new Map([
    [1.25, 1.4375],
    [1.5, 1.5625],
    [2, 1.6875],
    [2.5, 1.75],
    [3, 1.9375],
    [3.5, 2.0625],
    [4, 2.25],
    [5, 2.625],
    [6, 3.0625],
    [8, 3.8125],
  ]),
};

const key = (large: number, small: number) => `${large}x${small}`;
const BY_PAIR = new Map(REDUCER_COUPLINGS.map((r) => [key(r.large, r.small), r]));

/** The printed row for a pair, if the book carries one. */
export const reducerCoupling = (large: number, small: number): ReducerCoupling | undefined =>
  BY_PAIR.get(key(large, small));

const eng = (nps: number): number =>
  NPT_TABLE.find((x) => x.nps === nps)?.engagementWhenTight ?? NaN;

/** The gap the rule gives, whether or not the book prints that combination. */
export function reducerGapFromRule(large: number, small: number, pattern: Pattern): number {
  if (!(small < large)) return NaN;
  const shoulder = SHOULDER[pattern].get(large);
  const e = eng(small);
  if (shoulder === undefined || !Number.isFinite(e)) return NaN;
  const gap = shoulder - e;
  return gap > 0 ? gap : NaN;
}

/**
 * Gap left between the two pipe ends by a reducer coupling, printed where the
 * book prints it and worked from the rule where it does not.
 */
export function reducerGap(large: number, small: number, pattern: Pattern): number {
  const row = reducerCoupling(large, small);
  const printed = row ? row[pattern] : NaN;
  return Number.isFinite(printed) ? printed : reducerGapFromRule(large, small, pattern);
}

/** Whether the book lists that combination as made in that pattern. */
export const reducerIsMade = (large: number, small: number, pattern: Pattern): boolean =>
  Number.isFinite(reducerCoupling(large, small)?.[pattern] ?? NaN);

/** Large sizes the book carries in a pattern. */
export const reducerLargeSizes = (pattern: Pattern): number[] =>
  [...new Set(REDUCER_COUPLINGS.filter((r) => Number.isFinite(r[pattern])).map((r) => r.large))].sort(
    (a, b) => a - b
  );

/** Small sizes made against a large size in a pattern. */
export const reducerSmallSizes = (large: number, pattern: Pattern): number[] =>
  REDUCER_COUPLINGS.filter((r) => r.large === large && Number.isFinite(r[pattern]))
    .map((r) => r.small)
    .sort((a, b) => a - b);


// Malleable iron reducer couplings, page 4-44. One pattern, dimension J, and
// the same rule: the casting's shoulder less the small end's engagement.
// Thirty eight of the forty printed rows fit it exactly.
//
// The two that do not both print a figure that appears on the cast iron pages
// for the same pair — 3 x 2-1/2 prints the cast iron K, and 6 x 4 prints the
// cast iron J — which is what a compositor reading across the wrong table
// would produce. They are held as printed and marked suspect. For 3 x 2-1/2
// the rule gives an answer, because four other three inch rows fix that
// shoulder. For 6 x 4 it cannot: there is no other six inch row to check it
// against, and the figure printed would make the six inch casting shallower
// than the five inch one.

export type MalleableReducerCoupling = {
  large: number;
  small: number;
  /** Gap as printed. */
  j: number;
  /** True where the printed figure misses the rule every other row obeys. */
  suspect?: boolean;
};

export const REDUCER_COUPLINGS_MALLEABLE: MalleableReducerCoupling[] = [
  { large: 0.375, small: 0.25, j: 0.375 },
  { large: 0.5, small: 0.125, j: 0.5 },
  { large: 0.5, small: 0.25, j: 0.375 },
  // The page prints this pair as 1/2 x 1/2, which is not a reducer. The gap
  // works back to the three eighths engagement, not the half inch one, and
  // three eighths is the one size otherwise missing from the half inch block.
  { large: 0.5, small: 0.375, j: 0.375 },
  { large: 0.75, small: 0.25, j: 0.5 },
  { large: 0.75, small: 0.375, j: 0.5 },
  { large: 0.75, small: 0.5, j: 0.375 },
  { large: 1, small: 0.25, j: 0.625 },
  { large: 1, small: 0.375, j: 0.625 },
  { large: 1, small: 0.5, j: 0.5 },
  { large: 1, small: 0.75, j: 0.4375 },
  { large: 1.25, small: 0.5, j: 0.875 },
  { large: 1.25, small: 0.75, j: 0.8125 },
  { large: 1.25, small: 1, j: 0.6875 },
  { large: 1.5, small: 0.5, j: 1.125 },
  { large: 1.5, small: 0.75, j: 1.0625 },
  { large: 1.5, small: 1, j: 0.9375 },
  { large: 1.5, small: 1.25, j: 0.9375 },
  { large: 2, small: 0.5, j: 1.5625 },
  { large: 2, small: 0.75, j: 1.5 },
  { large: 2, small: 1, j: 1.375 },
  { large: 2, small: 1.25, j: 1.375 },
  { large: 2, small: 1.5, j: 1.375 },
  { large: 2.5, small: 1, j: 1.625 },
  { large: 2.5, small: 1.25, j: 1.625 },
  { large: 2.5, small: 1.5, j: 1.625 },
  { large: 2.5, small: 2, j: 1.5625 },
  { large: 3, small: 1, j: 2 },
  { large: 3, small: 1.25, j: 2 },
  { large: 3, small: 1.5, j: 2 },
  { large: 3, small: 2, j: 1.9375 },
  { large: 3, small: 2.5, j: 1, suspect: true },
  { large: 3.5, small: 2, j: 2.1875 },
  { large: 3.5, small: 3, j: 1.9375 },
  { large: 4, small: 1.5, j: 2.5625 },
  { large: 4, small: 2, j: 2.5 },
  { large: 4, small: 2.5, j: 2.3125 },
  { large: 4, small: 3, j: 2.25 },
  { large: 5, small: 4, j: 2.75 },
  { large: 6, small: 4, j: 1.9375, suspect: true },
];

/** Shoulder depth of the malleable casting, by large size. */
export const SHOULDER_MALLEABLE: ReadonlyMap<number, number> = new Map([
  [0.375, 0.75],
  [0.5, 0.75],
  [0.75, 0.875],
  [1, 1],
  [1.25, 1.375],
  [1.5, 1.625],
  [2, 2.0625],
  [2.5, 2.3125],
  [3, 2.6875],
  [3.5, 2.9375],
  [4, 3.25],
  [5, 3.875],
]);

const MALLEABLE_BY_PAIR = new Map(
  REDUCER_COUPLINGS_MALLEABLE.map((r) => [key(r.large, r.small), r])
);

/** The printed malleable row for a pair, if the book carries one. */
export const malleableReducerCoupling = (
  large: number,
  small: number
): MalleableReducerCoupling | undefined => MALLEABLE_BY_PAIR.get(key(large, small));

/** The malleable gap the rule gives, printed or not. */
export function malleableReducerGapFromRule(large: number, small: number): number {
  if (!(small < large)) return NaN;
  const shoulder = SHOULDER_MALLEABLE.get(large);
  const e = eng(small);
  if (shoulder === undefined || !Number.isFinite(e)) return NaN;
  const gap = shoulder - e;
  return gap > 0 ? gap : NaN;
}

/**
 * Gap a malleable reducer coupling leaves, printed where printed and worked
 * from the rule where not.
 *
 * A row the rule contradicts gives nothing rather than a figure that is very
 * likely a page astray. Ask for it by name through `malleableReducerCoupling`
 * if the printed figure is what is wanted.
 */
export function malleableReducerGap(large: number, small: number): number {
  const row = malleableReducerCoupling(large, small);
  if (row?.suspect) return malleableReducerGapFromRule(large, small);
  if (row) return row.j;
  return malleableReducerGapFromRule(large, small);
}

/** Whether the printed figure for a pair misses the rule. */
export const malleableReducerIsSuspect = (large: number, small: number): boolean =>
  malleableReducerCoupling(large, small)?.suspect === true;
