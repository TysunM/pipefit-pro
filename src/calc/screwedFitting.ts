// Overall dimensions of screwed elbows, tees and crosses, from the handbook.
//
// A is centre to end for a 90 degree elbow, a tee and a cross. C is centre to
// end for a 45 degree elbow. H is the outside diameter of the band, which
// decides whether two fittings will clear each other.
//
// The lighter table covers 125 lb cast iron and 150 lb malleable; the heavier
// one covers 250 lb cast iron and 300 lb malleable.

export type FittingClass = 'standard' | 'heavy';

export type ScrewedFitting = {
  nps: number;
  label: string;
  /** Centre to end, everything except the 45 degree elbow. */
  centerToEnd: number;
  /** Centre to end, 45 degree elbow. */
  centerToEnd45: number;
  /** Band outside diameter, cast iron. */
  bandCastIron: number;
  /** Band outside diameter, malleable. Absent where the table prints a dash. */
  bandMalleable: number;
};

// 125 lb cast iron and 150 lb malleable.
export const SCREWED_STANDARD: ScrewedFitting[] = [
  { nps: 0.25, label: '1/4"', centerToEnd: 0.81, centerToEnd45: 0.73, bandCastIron: 0.93, bandMalleable: 0.84 },
  { nps: 0.375, label: '3/8"', centerToEnd: 0.95, centerToEnd45: 0.8, bandCastIron: 1.12, bandMalleable: 1.02 },
  { nps: 0.5, label: '1/2"', centerToEnd: 1.12, centerToEnd45: 0.88, bandCastIron: 1.34, bandMalleable: 1.2 },
  { nps: 0.75, label: '3/4"', centerToEnd: 1.31, centerToEnd45: 0.98, bandCastIron: 1.63, bandMalleable: 1.46 },
  { nps: 1, label: '1"', centerToEnd: 1.5, centerToEnd45: 1.12, bandCastIron: 1.95, bandMalleable: 1.77 },
  { nps: 1.25, label: '1-1/4"', centerToEnd: 1.75, centerToEnd45: 1.29, bandCastIron: 2.39, bandMalleable: 2.15 },
  { nps: 1.5, label: '1-1/2"', centerToEnd: 1.94, centerToEnd45: 1.43, bandCastIron: 2.68, bandMalleable: 2.43 },
  { nps: 2, label: '2"', centerToEnd: 2.25, centerToEnd45: 1.68, bandCastIron: 3.28, bandMalleable: 2.96 },
  { nps: 2.5, label: '2-1/2"', centerToEnd: 2.7, centerToEnd45: 1.95, bandCastIron: 3.86, bandMalleable: 3.59 },
  { nps: 3, label: '3"', centerToEnd: 3.08, centerToEnd45: 2.17, bandCastIron: 4.62, bandMalleable: 4.29 },
  { nps: 3.5, label: '3-1/2"', centerToEnd: 3.42, centerToEnd45: 2.39, bandCastIron: 5.2, bandMalleable: 4.84 },
  { nps: 4, label: '4"', centerToEnd: 3.79, centerToEnd45: 2.61, bandCastIron: 5.79, bandMalleable: 5.4 },
  { nps: 5, label: '5"', centerToEnd: 4.5, centerToEnd45: 3.05, bandCastIron: 7.05, bandMalleable: 6.58 },
  { nps: 6, label: '6"', centerToEnd: 5.13, centerToEnd45: 3.46, bandCastIron: 8.28, bandMalleable: 7.77 },
  { nps: 8, label: '8"', centerToEnd: 6.56, centerToEnd45: 4.28, bandCastIron: 10.63, bandMalleable: NaN },
  { nps: 10, label: '10"', centerToEnd: 8.08, centerToEnd45: 5.16, bandCastIron: 13.12, bandMalleable: NaN },
  { nps: 12, label: '12"', centerToEnd: 9.5, centerToEnd45: 5.97, bandCastIron: 15.47, bandMalleable: NaN },
];

// 250 lb cast iron and 300 lb malleable.
export const SCREWED_HEAVY: ScrewedFitting[] = [
  { nps: 0.25, label: '1/4"', centerToEnd: 0.94, centerToEnd45: 0.81, bandCastIron: 1.17, bandMalleable: 0.93 },
  { nps: 0.375, label: '3/8"', centerToEnd: 1.06, centerToEnd45: 0.88, bandCastIron: 1.36, bandMalleable: 1.12 },
  { nps: 0.5, label: '1/2"', centerToEnd: 1.25, centerToEnd45: 1.0, bandCastIron: 1.59, bandMalleable: 1.34 },
  { nps: 0.75, label: '3/4"', centerToEnd: 1.44, centerToEnd45: 1.13, bandCastIron: 1.88, bandMalleable: 1.63 },
  { nps: 1, label: '1"', centerToEnd: 1.63, centerToEnd45: 1.31, bandCastIron: 2.24, bandMalleable: 1.95 },
  { nps: 1.25, label: '1-1/4"', centerToEnd: 1.94, centerToEnd45: 1.5, bandCastIron: 2.73, bandMalleable: 2.39 },
  { nps: 1.5, label: '1-1/2"', centerToEnd: 2.13, centerToEnd45: 1.69, bandCastIron: 3.07, bandMalleable: 2.68 },
  { nps: 2, label: '2"', centerToEnd: 2.5, centerToEnd45: 2.0, bandCastIron: 3.74, bandMalleable: 3.28 },
  { nps: 2.5, label: '2-1/2"', centerToEnd: 2.94, centerToEnd45: 2.25, bandCastIron: 4.6, bandMalleable: 3.86 },
  { nps: 3, label: '3"', centerToEnd: 3.38, centerToEnd45: 2.5, bandCastIron: 5.36, bandMalleable: 4.62 },
  { nps: 3.5, label: '3-1/2"', centerToEnd: 3.75, centerToEnd45: 2.63, bandCastIron: 5.98, bandMalleable: NaN },
  { nps: 4, label: '4"', centerToEnd: 4.13, centerToEnd45: 2.81, bandCastIron: 6.61, bandMalleable: NaN },
  { nps: 5, label: '5"', centerToEnd: 4.88, centerToEnd45: 3.19, bandCastIron: 7.92, bandMalleable: NaN },
  { nps: 6, label: '6"', centerToEnd: 5.63, centerToEnd45: 3.5, bandCastIron: 9.24, bandMalleable: NaN },
  { nps: 8, label: '8"', centerToEnd: 7.0, centerToEnd45: 4.31, bandCastIron: 11.73, bandMalleable: NaN },
  { nps: 10, label: '10"', centerToEnd: 8.63, centerToEnd45: 5.19, bandCastIron: 14.37, bandMalleable: NaN },
  { nps: 12, label: '12"', centerToEnd: 10.0, centerToEnd45: 6.0, bandCastIron: 16.84, bandMalleable: NaN },
];

const TABLES: Record<FittingClass, ScrewedFitting[]> = {
  standard: SCREWED_STANDARD,
  heavy: SCREWED_HEAVY,
};

export const SCREWED_FITTINGS = SCREWED_STANDARD;

export const screwedFitting = (nps: number, cls: FittingClass = 'standard'): ScrewedFitting | undefined =>
  TABLES[cls].find((f) => f.nps === nps);

export const screwedSizes = (cls: FittingClass = 'standard'): number[] => TABLES[cls].map((f) => f.nps);

/** Centre to end for the fitting a given turn calls for. */
export function screwedCenterToEnd(nps: number, angleDeg: number, cls: FittingClass = 'standard'): number {
  const f = screwedFitting(nps, cls);
  if (!f) return NaN;
  if (angleDeg === 45) return f.centerToEnd45;
  if (angleDeg === 90) return f.centerToEnd;
  return NaN;
}
