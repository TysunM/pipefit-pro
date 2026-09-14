// Cast brass solder joint fittings, pages 3-5 to 3-9.
//
// H is the dimension a copper fitter works to: centre of the fitting to the
// bottom of the socket, which is where the tube end lands. G is how deep the
// socket is, so the fitting's centre to face is H plus G.
//
// The male end K is the female end G plus a sixteenth, in every size. The page
// says both are given to the nearest larger sixteenth, which is exactly that.
//
// A street elbow is an eighth longer than a plain one on every size both are
// made in, at 90 degrees. At 45 it is an eighth on six of the seven sizes and
// three sixteenths on the two inch.

export type SolderEnd = { nps: number; label: string; male: number; female: number };

const N = NaN;

export const SOLDER_ENDS: SolderEnd[] = [
  { nps: 0.25, label: '1/4"', male: 0.375, female: 0.3125 },
  { nps: 0.375, label: '3/8"', male: 0.4375, female: 0.375 },
  { nps: 0.5, label: '1/2"', male: 0.5625, female: 0.5 },
  { nps: 0.75, label: '3/4"', male: 0.8125, female: 0.75 },
  { nps: 1, label: '1"', male: 1, female: 0.9375 },
  { nps: 1.25, label: '1-1/4"', male: 1.0625, female: 1 },
  { nps: 1.5, label: '1-1/2"', male: 1.1875, female: 1.125 },
  { nps: 2, label: '2"', male: 1.4375, female: 1.375 },
  { nps: 2.5, label: '2-1/2"', male: 1.5625, female: 1.5 },
  { nps: 3, label: '3"', male: 1.75, female: 1.6875 },
  { nps: 3.5, label: '3-1/2"', male: 2, female: 1.9375 },
  { nps: 4, label: '4"', male: 2.25, female: 2.1875 },
  { nps: 5, label: '5"', male: 2.75, female: 2.6875 },
  { nps: 6, label: '6"', male: 3.1875, female: 3.125 },
  { nps: 8, label: '8"', male: 4.0625, female: 4 },
];

/** What the male end runs over the female, being rounded up a step. */
export const SOLDER_END_STEP = 1 / 16;

export type SolderElbow = {
  nps: number;
  label: string;
  /** 90 degree elbow, centre to the bottom of the socket. */
  h: number;
  /** 90 degree street elbow. */
  street90: number;
  /** 45 degree elbow. */
  j: number;
  /** 45 degree street elbow. */
  street45: number;
};

export const SOLDER_ELBOWS: SolderElbow[] = [
  { nps: 0.25, label: '1/4"', h: 0.25, street90: 0.375, j: N, street45: N },
  { nps: 0.375, label: '3/8"', h: 0.3125, street90: 0.4375, j: 0.1875, street45: 0.3125 },
  { nps: 0.5, label: '1/2"', h: 0.4375, street90: 0.5625, j: 0.1875, street45: 0.3125 },
  { nps: 0.75, label: '3/4"', h: 0.5625, street90: 0.6875, j: 0.25, street45: 0.375 },
  { nps: 1, label: '1"', h: 0.75, street90: 0.875, j: 0.3125, street45: 0.4375 },
  { nps: 1.25, label: '1-1/4"', h: 0.875, street90: 1, j: 0.4375, street45: 0.5625 },
  { nps: 1.5, label: '1-1/2"', h: 1, street90: 1.125, j: 0.5, street45: 0.625 },
  { nps: 2, label: '2"', h: 1.25, street90: 1.375, j: 0.5625, street45: 0.75 },
  { nps: 2.5, label: '2-1/2"', h: 1.5, street90: 1.625, j: 0.625, street45: N },
  { nps: 3, label: '3"', h: 1.75, street90: 1.875, j: 0.75, street45: N },
  { nps: 3.5, label: '3-1/2"', h: 2, street90: N, j: 0.875, street45: N },
  { nps: 4, label: '4"', h: 2.25, street90: 2.375, j: 0.9375, street45: N },
  { nps: 5, label: '5"', h: 3.125, street90: N, j: 1.4375, street45: N },
  { nps: 6, label: '6"', h: 3.625, street90: N, j: 1.625, street45: N },
  { nps: 8, label: '8"', h: 4.875, street90: N, j: 2.125, street45: N },
];

/** What a street elbow runs over a plain one at 90 degrees, in every size. */
export const SOLDER_STREET_STEP = 1 / 8;

// Straight couplings, page 3-9. M is the stop between the two tube ends.
const COUPLING_STOP = new Map<number, number>([
  [0.25, 1 / 16], [0.375, 1 / 16], [0.5, 0.125], [0.75, 0.125], [1, 0.125],
  [1.25, 0.125], [1.5, 0.125], [2, 0.1875], [2.5, 0.1875], [3, 0.1875],
  [3.5, 0.25], [4, 0.25], [5, 0.25], [6, 0.25], [8, 0.625],
]);

// Fitting reducers and bushings, page 3-9. Like every other reducer in the
// book, the length depends only on the larger of the two sizes.
const REDUCER_LENGTH = new Map<number, number>([
  [0.5, 0.9375], [0.75, 1.1875], [1, 1.5], [1.25, 1.625], [1.5, 1.8125],
  [2, 2.125], [2.5, 2.375], [3, 2.625], [4, 3.4375],
]);

const REDUCER_SMALLS = new Map<number, number[]>([
  [0.5, [0.25, 0.375]],
  [0.75, [0.5]],
  [1, [0.5, 0.75]],
  [1.25, [0.5, 1]],
  [1.5, [0.75, 1.25]],
  [2, [1, 1.25, 1.5]],
  [2.5, [1.5, 2]],
  [3, [1.5, 2, 2.5]],
  [4, [2, 2.5, 3]],
]);

const END_BY_NPS = new Map(SOLDER_ENDS.map((e) => [e.nps, e]));
const ELBOW_BY_NPS = new Map(SOLDER_ELBOWS.map((e) => [e.nps, e]));

export const solderEnd = (nps: number): SolderEnd | undefined => END_BY_NPS.get(nps);
export const solderElbow = (nps: number): SolderElbow | undefined => ELBOW_BY_NPS.get(nps);

/** Depth of the socket a tube goes into. */
export const socketDepth = (nps: number): number => END_BY_NPS.get(nps)?.female ?? NaN;

/**
 * Takeout of a solder fitting: centre of the fitting to where the tube end
 * lands in the socket. Comes off a centre to centre measurement once for each
 * fitting on the run, the same way a screwed takeout does.
 */
export function solderTakeout(
  nps: number,
  kind: 'elbow90' | 'street90' | 'elbow45' | 'street45' | 'tee' = 'elbow90'
): number {
  const e = ELBOW_BY_NPS.get(nps);
  if (!e) return NaN;
  // The page draws the tee with the same H on the run and the outlet.
  if (kind === 'elbow90' || kind === 'tee') return e.h;
  if (kind === 'street90') return e.street90;
  if (kind === 'elbow45') return e.j;
  return e.street45;
}

/** Centre of the fitting to the face of the socket: the takeout plus the socket. */
export function solderCenterToFace(nps: number, kind: 'elbow90' | 'elbow45' | 'tee' = 'elbow90'): number {
  const take = solderTakeout(nps, kind);
  const g = socketDepth(nps);
  return Number.isFinite(take) && Number.isFinite(g) ? take + g : NaN;
}

/** Stop between the two tube ends in a straight coupling. */
export const solderCouplingStop = (nps: number): number => COUPLING_STOP.get(nps) ?? NaN;

/** End to end of a fitting reducer or bushing. */
export function solderReducer(a: number, b: number): number {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (!(small < big)) return NaN;
  return REDUCER_LENGTH.get(big) ?? NaN;
}

/** Whether the page lists that reducer combination. */
export const solderReducerMade = (a: number, b: number): boolean =>
  (REDUCER_SMALLS.get(Math.max(a, b)) ?? []).includes(Math.min(a, b));

export const solderReducerLargeSizes = (): number[] => [...REDUCER_LENGTH.keys()];
export const solderReducerSmalls = (large: number): number[] => REDUCER_SMALLS.get(large) ?? [];

/**
 * Tube to cut for a run measured centre to centre with a solder fitting at
 * each end. A soldered joint has no makeup: the tube bottoms in the socket.
 */
export function solderCut(centerToCenter: number, takeoutA: number, takeoutB: number = takeoutA): number {
  if (![centerToCenter, takeoutA, takeoutB].every(Number.isFinite)) return NaN;
  const cut = centerToCenter - takeoutA - takeoutB;
  return cut > 0 ? cut : NaN;
}

export const solderSizes = (): number[] => SOLDER_ELBOWS.map((e) => e.nps);
