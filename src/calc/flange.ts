import { FlangeClass } from './flangedFitting';

// Flange thicknesses and overall lengths, pages 4-70, 4-76, 4-82, 4-87, 4-90,
// 4-93 and 4-96.
//
// Q is the flange thickness, raised face included. Y is the overall length of
// a screwed or slip-on welding flange, and Z that of a lapped one. A blind
// flange is Q thick and has no Y or Z.
//
// Below ten inch, and further up in the lighter classes, a lapped flange is
// the same length as a screwed one. It is only in the big sizes that the lap
// adds to it.
//
// The raised face is a sixteenth in 150 and 300 lb and a quarter inch from
// 400 lb up, and it is already counted in Q and Y.

export type Flange = {
  nps: number;
  label: string;
  /** Flange thickness, raised face included. */
  q: number;
  /** Overall length of a screwed or slip-on welding flange. */
  y: number;
  /** Overall length of a lapped flange, or no value where not made. */
  z: number;
};

const N = NaN;

export const FLANGES_150: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 0.4375, y: 0.625, z: 0.625 },
  { nps: 0.75, label: '3/4"', q: 0.5, y: 0.625, z: 0.625 },
  { nps: 1, label: '1"', q: 0.5625, y: 0.6875, z: 0.6875 },
  { nps: 1.25, label: '1-1/4"', q: 0.625, y: 0.8125, z: 0.8125 },
  { nps: 1.5, label: '1-1/2"', q: 0.6875, y: 0.875, z: 0.875 },
  { nps: 2, label: '2"', q: 0.75, y: 1.0, z: 1.0 },
  { nps: 2.5, label: '2-1/2"', q: 0.875, y: 1.125, z: 1.125 },
  { nps: 3, label: '3"', q: 0.9375, y: 1.1875, z: 1.1875 },
  { nps: 3.5, label: '3-1/2"', q: 0.9375, y: 1.25, z: 1.25 },
  { nps: 4, label: '4"', q: 0.9375, y: 1.3125, z: 1.3125 },
  { nps: 5, label: '5"', q: 0.9375, y: 1.4375, z: 1.4375 },
  { nps: 6, label: '6"', q: 1.0, y: 1.5625, z: 1.5625 },
  { nps: 8, label: '8"', q: 1.125, y: 1.75, z: 1.75 },
  { nps: 10, label: '10"', q: 1.1875, y: 1.9375, z: 1.9375 },
  { nps: 12, label: '12"', q: 1.25, y: 2.1875, z: 2.1875 },
  { nps: 14, label: '14" OD', q: 1.375, y: 2.25, z: 3.125 },
  { nps: 16, label: '16" OD', q: 1.4375, y: 2.5, z: 3.4375 },
  { nps: 18, label: '18" OD', q: 1.5625, y: 2.6875, z: 3.8125 },
  { nps: 20, label: '20" OD', q: 1.6875, y: 2.875, z: 4.0625 },
  { nps: 24, label: '24" OD', q: 1.875, y: 3.25, z: 4.375 },
];

export const FLANGES_300: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 0.5625, y: 0.875, z: 0.875 },
  { nps: 0.75, label: '3/4"', q: 0.625, y: 1.0, z: 1.0 },
  { nps: 1, label: '1"', q: 0.6875, y: 1.0625, z: 1.0625 },
  { nps: 1.25, label: '1-1/4"', q: 0.75, y: 1.0625, z: 1.0625 },
  { nps: 1.5, label: '1-1/2"', q: 0.8125, y: 1.1875, z: 1.1875 },
  { nps: 2, label: '2"', q: 0.875, y: 1.3125, z: 1.3125 },
  { nps: 2.5, label: '2-1/2"', q: 1.0, y: 1.5, z: 1.5 },
  { nps: 3, label: '3"', q: 1.125, y: 1.6875, z: 1.6875 },
  { nps: 3.5, label: '3-1/2"', q: 1.1875, y: 1.75, z: 1.75 },
  { nps: 4, label: '4"', q: 1.25, y: 1.875, z: 1.875 },
  { nps: 5, label: '5"', q: 1.375, y: 2.0, z: 2.0 },
  { nps: 6, label: '6"', q: 1.4375, y: 2.0625, z: 2.0625 },
  { nps: 8, label: '8"', q: 1.625, y: 2.4375, z: 2.4375 },
  { nps: 10, label: '10"', q: 1.875, y: 2.625, z: 3.75 },
  { nps: 12, label: '12"', q: 2.0, y: 2.875, z: 4.0 },
  { nps: 14, label: '14" OD', q: 2.125, y: 3.0, z: 4.375 },
  { nps: 16, label: '16" OD', q: 2.25, y: 3.25, z: 4.75 },
  { nps: 18, label: '18" OD', q: 2.375, y: 3.5, z: 5.125 },
  { nps: 20, label: '20" OD', q: 2.5, y: 3.75, z: 5.5 },
  { nps: 24, label: '24" OD', q: 2.75, y: 4.1875, z: 6.0 },
];

export const FLANGES_400: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 0.5625, y: 0.875, z: 0.875 },
  { nps: 0.75, label: '3/4"', q: 0.625, y: 1.0, z: 1.0 },
  { nps: 1, label: '1"', q: 0.6875, y: 1.0625, z: 1.0625 },
  { nps: 1.25, label: '1-1/4"', q: 0.8125, y: 1.125, z: 1.125 },
  { nps: 1.5, label: '1-1/2"', q: 0.875, y: 1.25, z: 1.25 },
  { nps: 2, label: '2"', q: 1.0, y: 1.4375, z: 1.4375 },
  { nps: 2.5, label: '2-1/2"', q: 1.125, y: 1.625, z: 1.625 },
  { nps: 3, label: '3"', q: 1.25, y: 1.8125, z: 1.8125 },
  { nps: 3.5, label: '3-1/2"', q: 1.375, y: 1.9375, z: 1.9375 },
  { nps: 4, label: '4"', q: 1.375, y: 2.0, z: 2.0 },
  { nps: 5, label: '5"', q: 1.5, y: 2.125, z: 2.125 },
  { nps: 6, label: '6"', q: 1.625, y: 2.25, z: 2.25 },
  { nps: 8, label: '8"', q: 1.875, y: 2.6875, z: 2.6875 },
  { nps: 10, label: '10"', q: 2.125, y: 2.875, z: 4.0 },
  { nps: 12, label: '12"', q: 2.25, y: 3.125, z: 4.25 },
  { nps: 14, label: '14" OD', q: 2.375, y: 3.3125, z: 4.625 },
  { nps: 16, label: '16" OD', q: 2.5, y: 3.6875, z: 5.0 },
  { nps: 18, label: '18" OD', q: 2.625, y: 3.875, z: 5.375 },
  { nps: 20, label: '20" OD', q: 2.75, y: 4.0, z: 5.75 },
  { nps: 24, label: '24" OD', q: 3.0, y: 4.5, z: 6.25 },
];

export const FLANGES_600: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 0.5625, y: 0.875, z: 0.875 },
  { nps: 0.75, label: '3/4"', q: 0.625, y: 1.0, z: 1.0 },
  { nps: 1, label: '1"', q: 0.6875, y: 1.0625, z: 1.0625 },
  { nps: 1.25, label: '1-1/4"', q: 0.8125, y: 1.125, z: 1.125 },
  { nps: 1.5, label: '1-1/2"', q: 0.875, y: 1.25, z: 1.25 },
  { nps: 2, label: '2"', q: 1.0, y: 1.4375, z: 1.4375 },
  { nps: 2.5, label: '2-1/2"', q: 1.125, y: 1.625, z: 1.625 },
  { nps: 3, label: '3"', q: 1.25, y: 1.8125, z: 1.8125 },
  { nps: 3.5, label: '3-1/2"', q: 1.375, y: 1.9375, z: 1.9375 },
  { nps: 4, label: '4"', q: 1.5, y: 2.125, z: 2.125 },
  { nps: 5, label: '5"', q: 1.75, y: 2.375, z: 2.375 },
  { nps: 6, label: '6"', q: 1.875, y: 2.625, z: 2.625 },
  { nps: 8, label: '8"', q: 2.1875, y: 3.0, z: 3.0 },
  { nps: 10, label: '10"', q: 2.5, y: 3.375, z: 4.375 },
  { nps: 12, label: '12"', q: 2.625, y: 3.625, z: 4.625 },
  { nps: 14, label: '14" OD', q: 2.75, y: 3.6875, z: 5.0 },
  { nps: 16, label: '16" OD', q: 3.0, y: 4.1875, z: 5.5 },
  { nps: 18, label: '18" OD', q: 3.25, y: 4.625, z: 6.0 },
  { nps: 20, label: '20" OD', q: 3.5, y: 5.0, z: 6.5 },
  { nps: 24, label: '24" OD', q: 4.0, y: 5.5, z: 7.25 },
];

export const FLANGES_900: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 0.875, y: 1.25, z: 1.25 },
  { nps: 0.75, label: '3/4"', q: 1.0, y: 1.375, z: 1.375 },
  { nps: 1, label: '1"', q: 1.125, y: 1.625, z: 1.625 },
  { nps: 1.25, label: '1-1/4"', q: 1.125, y: 1.625, z: 1.625 },
  { nps: 1.5, label: '1-1/2"', q: 1.25, y: 1.75, z: 1.75 },
  { nps: 2, label: '2"', q: 1.5, y: 2.25, z: 2.25 },
  { nps: 2.5, label: '2-1/2"', q: 1.625, y: 2.5, z: 2.5 },
  { nps: 3, label: '3"', q: 1.5, y: 2.125, z: 2.125 },
  { nps: 4, label: '4"', q: 1.75, y: 2.75, z: 2.75 },
  { nps: 5, label: '5"', q: 2.0, y: 3.125, z: 3.125 },
  { nps: 6, label: '6"', q: 2.1875, y: 3.375, z: 3.375 },
  { nps: 8, label: '8"', q: 2.5, y: 4.0, z: 4.5 },
  { nps: 10, label: '10"', q: 2.75, y: 4.25, z: 5.0 },
  { nps: 12, label: '12"', q: 3.125, y: 4.625, z: 5.625 },
  { nps: 14, label: '14" OD', q: 3.375, y: 5.125, z: 6.125 },
  { nps: 16, label: '16" OD', q: 3.5, y: 5.25, z: 6.5 },
  { nps: 18, label: '18" OD', q: 4.0, y: 6.0, z: 7.5 },
  { nps: 20, label: '20" OD', q: 4.25, y: 6.25, z: 8.25 },
  { nps: 24, label: '24" OD', q: 5.5, y: 8.0, z: 10.5 },
];

export const FLANGES_1500: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 0.875, y: 1.25, z: 1.25 },
  { nps: 0.75, label: '3/4"', q: 1.0, y: 1.375, z: 1.375 },
  { nps: 1, label: '1"', q: 1.125, y: 1.625, z: 1.625 },
  { nps: 1.25, label: '1-1/4"', q: 1.125, y: 1.625, z: 1.625 },
  { nps: 1.5, label: '1-1/2"', q: 1.25, y: 1.75, z: 1.75 },
  { nps: 2, label: '2"', q: 1.5, y: 2.25, z: 2.25 },
  { nps: 2.5, label: '2-1/2"', q: 1.625, y: 2.5, z: 2.5 },
  { nps: 3, label: '3"', q: 1.875, y: 2.875, z: 2.875 },
  { nps: 4, label: '4"', q: 2.125, y: 3.5625, z: 3.5625 },
  { nps: 5, label: '5"', q: 2.875, y: 4.125, z: 4.125 },
  { nps: 6, label: '6"', q: 3.25, y: 4.6875, z: 4.6875 },
  { nps: 8, label: '8"', q: 3.625, y: 5.625, z: 5.625 },
  { nps: 10, label: '10"', q: 4.25, y: 6.25, z: 7.0 },
  { nps: 12, label: '12"', q: 4.875, y: 7.125, z: 8.625 },
  { nps: 14, label: '14" OD', q: 5.25, y: N, z: 9.5 },
  { nps: 16, label: '16" OD', q: 5.75, y: N, z: 10.25 },
  { nps: 18, label: '18" OD', q: 6.375, y: N, z: 10.875 },
  { nps: 20, label: '20" OD', q: 7.0, y: N, z: 11.5 },
  { nps: 24, label: '24" OD', q: 8.0, y: N, z: 13.0 },
];

export const FLANGES_2500: Flange[] = [
  { nps: 0.5, label: '1/2"', q: 1.1875, y: 1.5625, z: 1.5625 },
  { nps: 0.75, label: '3/4"', q: 1.25, y: 1.6875, z: 1.6875 },
  { nps: 1, label: '1"', q: 1.375, y: 1.875, z: 1.875 },
  { nps: 1.25, label: '1-1/4"', q: 1.5, y: 2.0625, z: 2.0625 },
  { nps: 1.5, label: '1-1/2"', q: 1.75, y: 2.375, z: 2.375 },
  { nps: 2, label: '2"', q: 2.0, y: 2.75, z: 2.75 },
  { nps: 2.5, label: '2-1/2"', q: 2.25, y: 3.125, z: 3.125 },
  { nps: 3, label: '3"', q: 2.625, y: 3.625, z: 3.625 },
  { nps: 4, label: '4"', q: 3.0, y: 4.25, z: 4.25 },
  { nps: 5, label: '5"', q: 3.625, y: 5.125, z: 5.125 },
  { nps: 6, label: '6"', q: 4.25, y: 6.0, z: 6.0 },
  { nps: 8, label: '8"', q: 5.0, y: 7.0, z: 7.0 },
  { nps: 10, label: '10"', q: 6.5, y: 9.0, z: 9.0 },
  { nps: 12, label: '12"', q: 7.25, y: 10.0, z: 10.0 },
];

const BY_CLASS: Partial<Record<FlangeClass, Flange[]>> = {
  '150': FLANGES_150,
  '300': FLANGES_300,
  '400': FLANGES_400,
  '600': FLANGES_600,
  '900': FLANGES_900,
  '1500': FLANGES_1500,
  '2500': FLANGES_2500,
};

/** The flange row for a size and class. */
export const flange = (nps: number, cls: FlangeClass = '150'): Flange | undefined =>
  BY_CLASS[cls]?.find((f) => f.nps === nps);

/** Height the raised face itself stands, already counted in Q and Y. */
export const raisedFaceHeight = (cls: FlangeClass): number =>
  cls === '150' || cls === '300' ? 1 / 16 : 1 / 4;

/** Thickness of a blind flange: the same Q as any other in the class. */
export const blindFlangeThickness = (nps: number, cls: FlangeClass = '150'): number =>
  flange(nps, cls)?.q ?? NaN;

/** How far a lapped flange stands proud of a screwed one in the same size. */
export function lapAllowance(nps: number, cls: FlangeClass = '150'): number {
  const f = flange(nps, cls);
  if (!f || !Number.isFinite(f.z) || !Number.isFinite(f.y)) return NaN;
  return f.z - f.y;
}

export const flangeSizes = (cls: FlangeClass = '150'): number[] =>
  (BY_CLASS[cls] ?? []).map((f) => f.nps);
