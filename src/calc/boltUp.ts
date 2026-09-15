// Templates for drilling cast iron flanges, pages 4-51 to 4-54.
//
// Everything needed to bolt a joint up: the flange diameter and thickness, the
// bolt circle, how many bolts, what size and how long, and the ring gasket.
//
// The book sets out two layout rules with the tables, and they are kept here
// as `boltHoleAngles`: the holes are always a multiple of four, so a fitting
// can be turned to face any quarter, and they straddle the centreline rather
// than sitting on it.
//
// Bolt holes are drilled larger than the bolt. In 125 lb that is an eighth,
// and a quarter from 54 inch up. In 250 lb it is an eighth, three sixteenths
// at 24 inch, and a quarter from 30 inch up.
//
// Cast iron flanges are plane faced: there is no raised face in these
// thicknesses, which is why they differ from the steel flange thicknesses at
// the small end and agree with them higher up.

export type CastIronFlangeClass = '125' | '250';

export type BoltUp = {
  nps: number;
  label: string;
  flangeOd: number;
  thickness: number;
  boltCircle: number;
  bolts: number;
  boltDiameter: number;
  boltLength: number;
  /** Ring gasket bore. */
  gasketId: number;
  /** Ring gasket outside diameter. */
  gasketOd: number;
};

// 125 lb cast iron flanges, pages 4-51 and 4-52.
export const BOLT_UP_125: BoltUp[] = [
  { nps: 1, label: '1"', flangeOd: 4.25, thickness: 0.4375, boltCircle: 3.125, bolts: 4, boltDiameter: 0.5, boltLength: 1.75, gasketId: 1.0, gasketOd: 2.625 },
  { nps: 1.25, label: '1-1/4"', flangeOd: 4.625, thickness: 0.5, boltCircle: 3.5, bolts: 4, boltDiameter: 0.5, boltLength: 2.0, gasketId: 1.25, gasketOd: 3.0 },
  { nps: 1.5, label: '1-1/2"', flangeOd: 5.0, thickness: 0.5625, boltCircle: 3.875, bolts: 4, boltDiameter: 0.5, boltLength: 2.0, gasketId: 1.5, gasketOd: 3.375 },
  { nps: 2, label: '2"', flangeOd: 6.0, thickness: 0.625, boltCircle: 4.75, bolts: 4, boltDiameter: 0.625, boltLength: 2.25, gasketId: 2.0, gasketOd: 4.125 },
  { nps: 2.5, label: '2-1/2"', flangeOd: 7.0, thickness: 0.6875, boltCircle: 5.5, bolts: 4, boltDiameter: 0.625, boltLength: 2.5, gasketId: 2.5, gasketOd: 4.875 },
  { nps: 3, label: '3"', flangeOd: 7.5, thickness: 0.75, boltCircle: 6.0, bolts: 4, boltDiameter: 0.625, boltLength: 2.5, gasketId: 3.0, gasketOd: 5.375 },
  { nps: 3.5, label: '3-1/2"', flangeOd: 8.5, thickness: 0.8125, boltCircle: 7.0, bolts: 8, boltDiameter: 0.625, boltLength: 2.75, gasketId: 3.5, gasketOd: 6.375 },
  { nps: 4, label: '4"', flangeOd: 9.0, thickness: 0.9375, boltCircle: 7.5, bolts: 8, boltDiameter: 0.625, boltLength: 3.0, gasketId: 4.0, gasketOd: 6.875 },
  { nps: 5, label: '5"', flangeOd: 10.0, thickness: 0.9375, boltCircle: 8.5, bolts: 8, boltDiameter: 0.75, boltLength: 3.0, gasketId: 5.0, gasketOd: 7.75 },
  { nps: 6, label: '6"', flangeOd: 11.0, thickness: 1.0, boltCircle: 9.5, bolts: 8, boltDiameter: 0.75, boltLength: 3.25, gasketId: 6.0, gasketOd: 8.75 },
  { nps: 8, label: '8"', flangeOd: 13.5, thickness: 1.125, boltCircle: 11.75, bolts: 8, boltDiameter: 0.75, boltLength: 3.5, gasketId: 8.0, gasketOd: 11.0 },
  { nps: 10, label: '10"', flangeOd: 16.0, thickness: 1.1875, boltCircle: 14.25, bolts: 12, boltDiameter: 0.875, boltLength: 3.75, gasketId: 10.0, gasketOd: 13.375 },
  { nps: 12, label: '12"', flangeOd: 19.0, thickness: 1.25, boltCircle: 17.0, bolts: 12, boltDiameter: 0.875, boltLength: 3.75, gasketId: 12.0, gasketOd: 16.125 },
  { nps: 14, label: '14" OD', flangeOd: 21.0, thickness: 1.375, boltCircle: 18.75, bolts: 12, boltDiameter: 1.0, boltLength: 4.25, gasketId: 14.0, gasketOd: 17.75 },
  { nps: 16, label: '16" OD', flangeOd: 23.5, thickness: 1.4375, boltCircle: 21.25, bolts: 16, boltDiameter: 1.0, boltLength: 4.5, gasketId: 16.0, gasketOd: 20.25 },
  { nps: 18, label: '18" OD', flangeOd: 25.0, thickness: 1.5625, boltCircle: 22.75, bolts: 16, boltDiameter: 1.125, boltLength: 4.75, gasketId: 18.0, gasketOd: 21.625 },
  { nps: 20, label: '20" OD', flangeOd: 27.5, thickness: 1.6875, boltCircle: 25.0, bolts: 20, boltDiameter: 1.125, boltLength: 5.0, gasketId: 20.0, gasketOd: 23.875 },
  { nps: 24, label: '24" OD', flangeOd: 32.0, thickness: 1.875, boltCircle: 29.5, bolts: 20, boltDiameter: 1.25, boltLength: 5.5, gasketId: 24.0, gasketOd: 28.25 },
  { nps: 30, label: '30" OD', flangeOd: 38.75, thickness: 2.125, boltCircle: 36.0, bolts: 28, boltDiameter: 1.25, boltLength: 6.25, gasketId: 30.0, gasketOd: 34.75 },
  { nps: 36, label: '36" OD', flangeOd: 46.0, thickness: 2.375, boltCircle: 42.75, bolts: 32, boltDiameter: 1.5, boltLength: 7.0, gasketId: 36.0, gasketOd: 41.25 },
  { nps: 42, label: '42" OD', flangeOd: 53.0, thickness: 2.625, boltCircle: 49.5, bolts: 36, boltDiameter: 1.5, boltLength: 7.5, gasketId: 42.0, gasketOd: 48.0 },
  { nps: 48, label: '48" OD', flangeOd: 59.5, thickness: 2.75, boltCircle: 56.0, bolts: 44, boltDiameter: 1.5, boltLength: 7.75, gasketId: 48.0, gasketOd: 54.5 },
  { nps: 54, label: '54" OD', flangeOd: 66.25, thickness: 3.0, boltCircle: 62.75, bolts: 44, boltDiameter: 1.75, boltLength: 8.5, gasketId: 54.0, gasketOd: 61.0 },
  { nps: 60, label: '60" OD', flangeOd: 73.0, thickness: 3.125, boltCircle: 69.25, bolts: 52, boltDiameter: 1.75, boltLength: 8.75, gasketId: 60.0, gasketOd: 67.5 },
  { nps: 72, label: '72" OD', flangeOd: 86.5, thickness: 3.5, boltCircle: 82.5, bolts: 60, boltDiameter: 1.75, boltLength: 9.5, gasketId: 72.0, gasketOd: 80.75 },
  { nps: 84, label: '84" OD', flangeOd: 99.75, thickness: 3.875, boltCircle: 95.5, bolts: 64, boltDiameter: 2.0, boltLength: 10.5, gasketId: 84.0, gasketOd: 93.5 },
  { nps: 96, label: '96" OD', flangeOd: 113.25, thickness: 4.25, boltCircle: 108.5, bolts: 68, boltDiameter: 2.25, boltLength: 11.5, gasketId: 96.0, gasketOd: 106.25 },
];

// 250 lb cast iron flanges, pages 4-53 and 4-54.
export const BOLT_UP_250: BoltUp[] = [
  { nps: 1, label: '1"', flangeOd: 4.875, thickness: 0.6875, boltCircle: 3.5, bolts: 4, boltDiameter: 0.75, boltLength: 2.5, gasketId: 1.0, gasketOd: 2.875 },
  { nps: 1.25, label: '1-1/4"', flangeOd: 5.25, thickness: 0.75, boltCircle: 3.875, bolts: 4, boltDiameter: 0.75, boltLength: 2.5, gasketId: 1.25, gasketOd: 3.25 },
  { nps: 1.5, label: '1-1/2"', flangeOd: 6.125, thickness: 0.8125, boltCircle: 4.5, bolts: 4, boltDiameter: 0.875, boltLength: 2.75, gasketId: 1.5, gasketOd: 3.75 },
  { nps: 2, label: '2"', flangeOd: 6.5, thickness: 0.875, boltCircle: 5.0, bolts: 8, boltDiameter: 0.75, boltLength: 2.75, gasketId: 2.0, gasketOd: 4.375 },
  { nps: 2.5, label: '2-1/2"', flangeOd: 7.5, thickness: 1.0, boltCircle: 5.875, bolts: 8, boltDiameter: 0.875, boltLength: 3.25, gasketId: 2.5, gasketOd: 5.125 },
  { nps: 3, label: '3"', flangeOd: 8.25, thickness: 1.125, boltCircle: 6.625, bolts: 8, boltDiameter: 0.875, boltLength: 3.5, gasketId: 3.0, gasketOd: 5.875 },
  { nps: 3.5, label: '3-1/2"', flangeOd: 9.0, thickness: 1.1875, boltCircle: 7.25, bolts: 8, boltDiameter: 0.875, boltLength: 3.5, gasketId: 3.5, gasketOd: 6.5 },
  { nps: 4, label: '4"', flangeOd: 10.0, thickness: 1.25, boltCircle: 7.875, bolts: 8, boltDiameter: 0.875, boltLength: 3.75, gasketId: 4.0, gasketOd: 7.125 },
  { nps: 5, label: '5"', flangeOd: 11.0, thickness: 1.375, boltCircle: 9.25, bolts: 8, boltDiameter: 0.875, boltLength: 4.0, gasketId: 5.0, gasketOd: 8.5 },
  { nps: 6, label: '6"', flangeOd: 12.5, thickness: 1.4375, boltCircle: 10.625, bolts: 12, boltDiameter: 0.875, boltLength: 4.0, gasketId: 6.0, gasketOd: 9.875 },
  { nps: 8, label: '8"', flangeOd: 15.0, thickness: 1.625, boltCircle: 13.0, bolts: 12, boltDiameter: 1.0, boltLength: 4.5, gasketId: 8.0, gasketOd: 12.125 },
  { nps: 10, label: '10"', flangeOd: 17.5, thickness: 1.875, boltCircle: 15.25, bolts: 16, boltDiameter: 1.125, boltLength: 5.25, gasketId: 10.0, gasketOd: 14.25 },
  { nps: 12, label: '12"', flangeOd: 20.5, thickness: 2.0, boltCircle: 17.75, bolts: 16, boltDiameter: 1.25, boltLength: 5.5, gasketId: 12.0, gasketOd: 16.625 },
  { nps: 14, label: '14" OD', flangeOd: 23.0, thickness: 2.125, boltCircle: 20.25, bolts: 20, boltDiameter: 1.25, boltLength: 6.0, gasketId: 13.25, gasketOd: 19.125 },
  { nps: 16, label: '16" OD', flangeOd: 25.5, thickness: 2.25, boltCircle: 22.5, bolts: 20, boltDiameter: 1.375, boltLength: 6.25, gasketId: 15.25, gasketOd: 21.25 },
  { nps: 18, label: '18" OD', flangeOd: 28.0, thickness: 2.375, boltCircle: 24.75, bolts: 24, boltDiameter: 1.375, boltLength: 6.5, gasketId: 17.0, gasketOd: 23.5 },
  { nps: 20, label: '20" OD', flangeOd: 30.5, thickness: 2.5, boltCircle: 27.0, bolts: 24, boltDiameter: 1.375, boltLength: 6.75, gasketId: 19.0, gasketOd: 25.75 },
  { nps: 24, label: '24" OD', flangeOd: 36.0, thickness: 2.75, boltCircle: 32.0, bolts: 24, boltDiameter: 1.6875, boltLength: 7.75, gasketId: 23.0, gasketOd: 30.5 },
  { nps: 30, label: '30" OD', flangeOd: 43.0, thickness: 3.0, boltCircle: 39.25, bolts: 28, boltDiameter: 2.0, boltLength: 8.5, gasketId: 29.0, gasketOd: 37.5 },
  { nps: 36, label: '36" OD', flangeOd: 50.0, thickness: 3.375, boltCircle: 46.0, bolts: 32, boltDiameter: 2.25, boltLength: 9.5, gasketId: 34.5, gasketOd: 44.0 },
  { nps: 42, label: '42" OD', flangeOd: 57.0, thickness: 3.6875, boltCircle: 52.75, bolts: 36, boltDiameter: 2.25, boltLength: 10.25, gasketId: 40.25, gasketOd: 50.75 },
  { nps: 48, label: '48" OD', flangeOd: 65.0, thickness: 4.0, boltCircle: 60.75, bolts: 40, boltDiameter: 2.25, boltLength: 10.75, gasketId: 46.0, gasketOd: 58.75 },
];
const BY_CLASS: Record<CastIronFlangeClass, BoltUp[]> = {
  '125': BOLT_UP_125,
  '250': BOLT_UP_250,
};

export const boltUp = (nps: number, cls: CastIronFlangeClass = '125'): BoltUp | undefined =>
  BY_CLASS[cls].find((b) => b.nps === nps);

/** How much larger the drilled hole is than the bolt. */
export function boltHoleClearance(nps: number, cls: CastIronFlangeClass = '125'): number {
  if (!boltUp(nps, cls)) return NaN;
  if (cls === '125') return nps >= 54 ? 0.25 : 0.125;
  if (nps >= 30) return 0.25;
  if (nps >= 24) return 0.1875;
  return 0.125;
}

/** Diameter to drill for the bolt. */
export function boltHoleDiameter(nps: number, cls: CastIronFlangeClass = '125'): number {
  const b = boltUp(nps, cls);
  const c = boltHoleClearance(nps, cls);
  return b && Number.isFinite(c) ? b.boltDiameter + c : NaN;
}

/**
 * Where the bolt holes go, in degrees from the centreline, for a flange with
 * that many bolts.
 *
 * The holes straddle the centreline, so the first one sits half a pitch off it
 * rather than on it. That is what lets a fitting be turned a quarter turn and
 * still bolt up.
 */
export function boltHoleAngles(bolts: number): number[] {
  if (!Number.isInteger(bolts) || bolts < 4 || bolts % 4 !== 0) return [];
  const pitch = 360 / bolts;
  return Array.from({ length: bolts }, (_, i) => pitch / 2 + i * pitch);
}

/** Chord from one bolt hole to the next, for stepping a bolt circle off. */
export function boltSpacing(nps: number, cls: CastIronFlangeClass = '125'): number {
  const b = boltUp(nps, cls);
  if (!b) return NaN;
  return b.boltCircle * Math.sin(Math.PI / b.bolts);
}

export const boltUpSizes = (cls: CastIronFlangeClass = '125'): number[] =>
  BY_CLASS[cls].map((b) => b.nps);
