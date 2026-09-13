// Overall dimensions of screwed elbows, tees and crosses, from the handbook's
// 125 lb cast iron and 150 lb malleable table.
//
// A is centre to end for a 90 degree elbow, a tee and a cross. C is centre to
// end for a 45 degree elbow. H is the outside diameter of the band, which is
// what decides whether two fittings will clear each other.

export type ScrewedFitting = {
  nps: number;
  label: string;
  /** Centre to end, everything except the 45 degree elbow. */
  centerToEnd: number;
  /** Centre to end, 45 degree elbow. */
  centerToEnd45: number;
  /** Band outside diameter, 125 lb cast iron. */
  bandCastIron: number;
  /** Band outside diameter, 150 lb malleable. Absent above 6 inch. */
  bandMalleable: number;
};

export const SCREWED_FITTINGS: ScrewedFitting[] = [
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

const BY_NPS = new Map(SCREWED_FITTINGS.map((f) => [f.nps, f]));

export const screwedFitting = (nps: number): ScrewedFitting | undefined => BY_NPS.get(nps);

export const screwedSizes = (): number[] => SCREWED_FITTINGS.map((f) => f.nps);

/** Centre to end for the fitting a given turn calls for. */
export function screwedCenterToEnd(nps: number, angleDeg: number): number {
  const f = BY_NPS.get(nps);
  if (!f) return NaN;
  if (angleDeg === 45) return f.centerToEnd45;
  if (angleDeg === 90) return f.centerToEnd;
  return NaN;
}
