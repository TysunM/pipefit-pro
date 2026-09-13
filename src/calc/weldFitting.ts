import { findRow } from './pipeData';

// Laying lengths of butt welding fittings, pages 2-42 onward.
//
// These are the same for standard weight and extra strong: the wall changes,
// the centre lines do not.
//
// Three of the four columns are pure rule rather than table. A long radius
// 90 elbow's centre to end is one and a half times the nominal size, a short
// radius one is the nominal size, and from four inch up a 45 long radius
// elbow's B is five eighths of it. Every printed row obeys those exactly, so
// the rules are held and the page is used to check them — which also answers
// the sizes above twenty four inch that the page stops at.
//
// Below four inch the 45 elbow is made to its own stock figures, larger than
// five eighths of the size would give, and those rows are held.

/** Centre to end of a long radius 90 degree butt welding elbow. */
export const longRadiusElbow = (nps: number): number =>
  Number.isFinite(nps) && nps > 0 ? 1.5 * nps : NaN;

/** Centre to end of a short radius 90 degree butt welding elbow. */
export const shortRadiusElbow = (nps: number): number =>
  Number.isFinite(nps) && nps > 0 ? nps : NaN;

/** Bend radius the elbow is made to, which is what sets its centre to end. */
export const elbowBendRadius = (nps: number, radius: 'long' | 'short' = 'long'): number =>
  radius === 'long' ? longRadiusElbow(nps) : shortRadiusElbow(nps);

// Dimension B for the sizes the rule does not cover. Page 2-42.
const SMALL_45: Record<number, number> = {
  0.75: 7 / 16,
  1: 7 / 8,
  1.25: 1,
  1.5: 1.125,
  2: 1.375,
  2.5: 1.75,
  3: 2,
  3.5: 2.25,
};

/** Centre to end of a 45 degree long radius butt welding elbow, dimension B. */
export function elbow45(nps: number): number {
  if (!Number.isFinite(nps) || nps <= 0) return NaN;
  const small = SMALL_45[nps];
  if (small !== undefined) return small;
  return nps >= 4 ? 0.625 * nps : NaN;
}

/** Smallest size a short radius elbow is made in. */
export const SHORT_RADIUS_SMALLEST = 1;

export type WeldTee = { nps: number; label: string; c: number };

// Standard and extra strong butt welding straight tees, page 2-43. Run and
// outlet carry the same centre to end in every size, so it is held once.
export const WELD_TEES: WeldTee[] = [
  { nps: 0.75, label: '3/4"', c: 1.125 },
  { nps: 1, label: '1"', c: 1.5 },
  { nps: 1.25, label: '1-1/4"', c: 1.875 },
  { nps: 1.5, label: '1-1/2"', c: 2.25 },
  { nps: 2, label: '2"', c: 2.5 },
  { nps: 2.5, label: '2-1/2"', c: 3 },
  { nps: 3, label: '3"', c: 3.375 },
  { nps: 3.5, label: '3-1/2"', c: 3.75 },
  { nps: 4, label: '4"', c: 4.125 },
  { nps: 5, label: '5"', c: 4.875 },
  { nps: 6, label: '6"', c: 5.625 },
  { nps: 8, label: '8"', c: 7 },
  { nps: 10, label: '10"', c: 8.5 },
  { nps: 12, label: '12"', c: 10 },
  { nps: 14, label: '14" OD', c: 11 },
  { nps: 16, label: '16" OD', c: 12 },
  { nps: 18, label: '18" OD', c: 13.5 },
  { nps: 20, label: '20" OD', c: 15 },
  { nps: 24, label: '24" OD', c: 17 },
];

const TEE_BY_NPS = new Map(WELD_TEES.map((t) => [t.nps, t.c]));

/** Centre to end of a butt welding straight tee, on the run or the outlet. */
export const weldTee = (nps: number): number => TEE_BY_NPS.get(nps) ?? NaN;

export const weldTeeSizes = (): number[] => WELD_TEES.map((t) => t.nps);

/**
 * Pipe to cut for a centre to centre run with a butt welding fitting at each
 * end. A welded joint has no makeup, so only the fittings come off, plus the
 * root gap at each weld if one is being allowed.
 */
export function weldCut(
  centerToCenter: number,
  takeoutA: number,
  takeoutB: number = takeoutA,
  gap = 0
): number {
  if (![centerToCenter, takeoutA, takeoutB, gap].every(Number.isFinite)) return NaN;
  const cut = centerToCenter - takeoutA - takeoutB - 2 * gap;
  return cut > 0 ? cut : NaN;
}

// Butt welding reducers, concentric and eccentric, pages 2-48 and 2-50.
//
// Dimension H depends only on the larger of the two sizes, and the concentric
// and eccentric patterns share it. It is held that way, one length per large
// size, with the combinations the pages actually print kept separately so a
// reducer nobody makes is not quietly worked out.

const REDUCER_H = new Map<number, number>([
  [1, 2], [1.25, 2], [1.5, 2.5], [2, 3], [2.5, 3.5], [3, 3.5], [3.5, 4], [4, 4],
  [5, 5], [6, 5.5], [8, 6], [10, 7], [12, 8], [14, 13], [16, 14], [18, 15],
  [20, 20], [24, 20],
]);

const REDUCER_BRANCHES = new Map<number, number[]>([
  [1, [0.375, 0.5, 0.75]],
  [1.25, [0.5, 0.75, 1]],
  [1.5, [0.5, 0.75, 1, 1.25]],
  [2, [0.75, 1, 1.25, 1.5]],
  [2.5, [1, 1.25, 1.5, 2]],
  [3, [1.25, 1.5, 2, 2.5]],
  [3.5, [1.25, 1.5, 2, 3]],
  [4, [1.5, 2, 2.5, 3, 3.5]],
  [5, [2, 2.5, 3, 3.5, 4]],
  [6, [2.5, 3, 3.5, 4, 5]],
  [8, [3.5, 4, 5, 6]],
  [10, [4, 5, 6, 8]],
  [12, [5, 6, 8, 10]],
  [14, [6, 8, 10, 12]],
  [16, [8, 10, 12, 14]],
  [18, [10, 12, 14, 16]],
  [20, [12, 14, 16, 18]],
  [24, [16, 18, 20]],
]);

/** End to end of a butt welding reducer, concentric or eccentric. */
export function weldReducer(a: number, b: number): number {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (!(small < big)) return NaN;
  return REDUCER_H.get(big) ?? NaN;
}

/** Whether the pages list that combination as made. */
export const weldReducerMade = (a: number, b: number): boolean =>
  (REDUCER_BRANCHES.get(Math.max(a, b)) ?? []).includes(Math.min(a, b));

export const weldReducerLargeSizes = (): number[] => [...REDUCER_H.keys()];
export const weldReducerBranches = (large: number): number[] =>
  REDUCER_BRANCHES.get(large) ?? [];

// Butt welding 180 degree returns, page 2-51.
//
// Both dimensions are geometry rather than table. O, the centre to centre of
// the two ends, is twice the bend radius. K, the overall height, is that
// radius plus half the pipe's outside diameter, since the outside of the bend
// stands half a diameter proud of its own centre line.
//
// Sixteen of the seventeen printed rows come out of that exactly, in both
// columns and both radii. The half inch row does not: it prints an O of 3,
// which is the one inch figure, and a K larger than the three quarter inch
// below it. The rule is kept and that row is flagged.

/** Centre to centre of the two ends of a 180 degree return, dimension O. */
export const returnSpacing = (nps: number, radius: 'long' | 'short' = 'long'): number =>
  2 * elbowBendRadius(nps, radius);

/** Overall height of a 180 degree return, dimension K. */
export function returnHeight(nps: number, radius: 'long' | 'short' = 'long'): number {
  const row = findRow(nps);
  const r = elbowBendRadius(nps, radius);
  if (!row || !Number.isFinite(r)) return NaN;
  return r + row.od / 2;
}

/** The one printed row the rule does not account for. */
export const RETURN_DISAGREEMENT = { nps: 0.5, printedK: 1.875, printedO: 3 };

// Standard and extra strong butt welding caps, page 2-53.
export const WELD_CAPS: { nps: number; label: string; e: number }[] = [
  { nps: 1, label: '1"', e: 1.5 },
  { nps: 1.25, label: '1-1/4"', e: 1.5 },
  { nps: 1.5, label: '1-1/2"', e: 1.5 },
  { nps: 2, label: '2"', e: 1.5 },
  { nps: 2.5, label: '2-1/2"', e: 1.5 },
  { nps: 3, label: '3"', e: 2 },
  { nps: 3.5, label: '3-1/2"', e: 2.5 },
  { nps: 4, label: '4"', e: 2.5 },
  { nps: 5, label: '5"', e: 3 },
  { nps: 6, label: '6"', e: 3.5 },
  { nps: 8, label: '8"', e: 4 },
  { nps: 10, label: '10"', e: 5 },
  { nps: 12, label: '12"', e: 6 },
  { nps: 14, label: '14" OD', e: 6.5 },
  { nps: 16, label: '16" OD', e: 7 },
  { nps: 18, label: '18" OD', e: 8 },
  { nps: 20, label: '20" OD', e: 9 },
  { nps: 24, label: '24" OD', e: 10.5 },
];

const CAP_BY_NPS = new Map(WELD_CAPS.map((c) => [c.nps, c.e]));

/** How far a butt welding cap adds to the end of a run, dimension E. */
export const weldCap = (nps: number): number => CAP_BY_NPS.get(nps) ?? NaN;

export const weldCapSizes = (): number[] => WELD_CAPS.map((c) => c.nps);
