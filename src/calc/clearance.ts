import { screwedFitting as screwedFittingFor } from './screwedFitting';

// Minimum distance from a pipe centreline to a wall that still lets a standard
// 125 lb cast iron fitting turn on the thread.

export type WallClearance = { nps: number; label: string; clearance: number };

export const WALL_CLEARANCES: WallClearance[] = [
  { nps: 0.25, label: '1/4"', clearance: 1 },
  { nps: 0.375, label: '3/8"', clearance: 1.125 },
  { nps: 0.5, label: '1/2"', clearance: 1.375 },
  { nps: 0.75, label: '3/4"', clearance: 1.625 },
  { nps: 1, label: '1"', clearance: 1.875 },
  { nps: 1.25, label: '1-1/4"', clearance: 2.1875 },
  { nps: 1.5, label: '1-1/2"', clearance: 2.4375 },
  { nps: 2, label: '2"', clearance: 2.875 },
  { nps: 2.5, label: '2-1/2"', clearance: 3.375 },
  { nps: 3, label: '3"', clearance: 3.9375 },
  { nps: 3.5, label: '3-1/2"', clearance: 4.375 },
  { nps: 4, label: '4"', clearance: 4.8125 },
  { nps: 5, label: '5"', clearance: 5.75 },
  { nps: 6, label: '6"', clearance: 6.625 },
  { nps: 8, label: '8"', clearance: 8.5 },
  { nps: 10, label: '10"', clearance: 10.375 },
  { nps: 12, label: '12"', clearance: 12.3125 },
];

const BY_NPS = new Map(WALL_CLEARANCES.map((c) => [c.nps, c]));

export const wallClearance = (nps: number): number => BY_NPS.get(nps)?.clearance ?? NaN;

/** Whether a fitting will turn with the centreline this far off the wall. */
export function fittingWillTurn(nps: number, centreToWall: number): boolean | undefined {
  const need = wallClearance(nps);
  if (!Number.isFinite(need) || !Number.isFinite(centreToWall)) return undefined;
  return centreToWall >= need;
}

/**
 * The radius a fitting sweeps as it turns on the thread: the corner of the
 * band, out at the centre-to-end distance. The printed clearances sit a little
 * outside this, which is the working margin.
 */
export const sweptRadius = (centerToEnd: number, bandDiameter: number): number =>
  Number.isFinite(centerToEnd) && Number.isFinite(bandDiameter)
    ? Math.hypot(centerToEnd, bandDiameter / 2)
    : NaN;

/**
 * Minimum centre to centre spacing of two parallel lines that still lets the
 * fittings turn, with fittings assumed to lie opposite each other.
 *
 * The handbook prints this as four pages of pairs, and states the rule behind
 * them: the turning fitting sweeps the diagonal of a triangle whose legs are
 * its centre to end and half its band. The larger fitting is the one that has
 * to turn; the smaller one only has to be cleared, so it contributes half its
 * band. Computing it covers every pair rather than the ones printed, and
 * carries no rounding.
 *
 * Figures are for 125 lb cast iron. Malleable fittings are smaller, so these
 * are safe for them too.
 */
export function parallelLineSpacing(npsA: number, npsB: number): number {
  const big = screwedFittingFor(Math.max(npsA, npsB));
  const small = screwedFittingFor(Math.min(npsA, npsB));
  if (!big || !small) return NaN;
  return sweptRadius(big.centerToEnd, big.bandCastIron) + small.bandCastIron / 2;
}
