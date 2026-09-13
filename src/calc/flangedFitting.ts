// Laying lengths of flanged fittings, from the handbook's tables.
//
// A is centre to face of a 90 degree elbow, a tee and a cross; B is centre to
// face of a long radius elbow; C is centre to face of a 45 degree elbow.
// E is centre to face on the run of a 45 degree lateral and F the short leg;
// G is face to face of a reducer, concentric or eccentric.
//
// Each class is printed twice, once raised face and once ring joint. The ring
// joint figures are the raised face ones plus a fixed amount for every flange
// face in the dimension. That amount depends on the class and, at the top of
// the range, on the size: the ring groove face is thicker than the 1/16 inch
// raised one. Every value on both 150 lb and both 300 lb ring joint pages
// comes out of it exactly, reducers included, where a face to face figure
// picks the addition up twice. The rule is held rather than the second set of
// tables.

export type FlangeClass = '150' | '300' | '400' | '600' | '900' | '1500' | '2500';
export type FlangeFacing = 'raisedFace' | 'ringJoint';

export type FlangedFitting = {
  nps: number;
  label: string;
  /** Centre to face, 90 degree elbow, tee and cross. */
  a: number;
  /** Centre to face, long radius elbow. */
  b: number;
  /** Centre to face, 45 degree elbow. */
  c: number;
};

export type FlangedLateral = {
  nps: number;
  label: string;
  /** Centre to face on the run of a 45 degree lateral. */
  e: number;
  /** Centre to face on the short leg of a 45 degree lateral. */
  f: number;
  /** Face to face of a reducer, or no value where not made. */
  g: number;
};

const N = NaN;

// 150 lb steel flanged elbows, tees and crosses, 1/16 inch raised face. 4-71.
export const FLANGED_150: FlangedFitting[] = [
  { nps: 1, label: '1"', a: 3.5, b: 5, c: 1.75 },
  { nps: 1.25, label: '1-1/4"', a: 3.75, b: 5.5, c: 2 },
  { nps: 1.5, label: '1-1/2"', a: 4, b: 6, c: 2.25 },
  { nps: 2, label: '2"', a: 4.5, b: 6.5, c: 2.5 },
  { nps: 2.5, label: '2-1/2"', a: 5, b: 7, c: 3 },
  { nps: 3, label: '3"', a: 5.5, b: 7.75, c: 3 },
  { nps: 3.5, label: '3-1/2"', a: 6, b: 8.5, c: 3.5 },
  { nps: 4, label: '4"', a: 6.5, b: 9, c: 4 },
  { nps: 5, label: '5"', a: 7.5, b: 10.25, c: 4.5 },
  { nps: 6, label: '6"', a: 8, b: 11.5, c: 5 },
  { nps: 8, label: '8"', a: 9, b: 14, c: 5.5 },
  { nps: 10, label: '10"', a: 11, b: 16.5, c: 6.5 },
  { nps: 12, label: '12"', a: 12, b: 19, c: 7.5 },
  { nps: 14, label: '14" OD', a: 14, b: 21.5, c: 7.5 },
  { nps: 16, label: '16" OD', a: 15, b: 24, c: 8 },
  { nps: 18, label: '18" OD', a: 16.5, b: 26.5, c: 8.5 },
  { nps: 20, label: '20" OD', a: 18, b: 29, c: 9.5 },
  { nps: 24, label: '24" OD', a: 22, b: 34, c: 11 },
];

// 150 lb steel flanged laterals and reducers, 1/16 inch raised face. 4-72.
export const LATERALS_150: FlangedLateral[] = [
  { nps: 1, label: '1"', e: 5.75, f: 1.75, g: N },
  { nps: 1.25, label: '1-1/4"', e: 6.25, f: 1.75, g: N },
  { nps: 1.5, label: '1-1/2"', e: 7, f: 2, g: N },
  { nps: 2, label: '2"', e: 8, f: 2.5, g: 5 },
  { nps: 2.5, label: '2-1/2"', e: 9.5, f: 2.5, g: 5.5 },
  { nps: 3, label: '3"', e: 10, f: 3, g: 6 },
  { nps: 3.5, label: '3-1/2"', e: 11.5, f: 3, g: 6.5 },
  { nps: 4, label: '4"', e: 12, f: 3, g: 7 },
  { nps: 5, label: '5"', e: 13.5, f: 3.5, g: 8 },
  { nps: 6, label: '6"', e: 14.5, f: 3.5, g: 9 },
  { nps: 8, label: '8"', e: 17.5, f: 4.5, g: 11 },
  { nps: 10, label: '10"', e: 20.5, f: 5, g: 12 },
  { nps: 12, label: '12"', e: 24.5, f: 5.5, g: 14 },
  { nps: 14, label: '14" OD', e: 27, f: 6, g: 16 },
  { nps: 16, label: '16" OD', e: 30, f: 6.5, g: 18 },
  { nps: 18, label: '18" OD', e: 32, f: 7, g: 19 },
  { nps: 20, label: '20" OD', e: 35, f: 8, g: 20 },
  { nps: 24, label: '24" OD', e: 40.5, f: 9, g: 24 },
];

// 150 lb steel flanged base elbows and tees. 4-75. Not made below two inch.
export const BASES_150: { nps: number; label: string; centerToBase: number; baseDiameter: number }[] = [
  { nps: 2, label: '2"', centerToBase: 4.125, baseDiameter: 4.625 },
  { nps: 2.5, label: '2-1/2"', centerToBase: 4.5, baseDiameter: 4.625 },
  { nps: 3, label: '3"', centerToBase: 4.875, baseDiameter: 5 },
  { nps: 3.5, label: '3-1/2"', centerToBase: 5.25, baseDiameter: 5 },
  { nps: 4, label: '4"', centerToBase: 5.5, baseDiameter: 6 },
  { nps: 5, label: '5"', centerToBase: 6.25, baseDiameter: 7 },
  { nps: 6, label: '6"', centerToBase: 7, baseDiameter: 7 },
  { nps: 8, label: '8"', centerToBase: 8.375, baseDiameter: 9 },
  { nps: 10, label: '10"', centerToBase: 9.75, baseDiameter: 9 },
  { nps: 12, label: '12"', centerToBase: 11.25, baseDiameter: 11 },
  { nps: 14, label: '14" OD', centerToBase: 12.5, baseDiameter: 11 },
  { nps: 16, label: '16" OD', centerToBase: 13.75, baseDiameter: 11 },
  { nps: 18, label: '18" OD', centerToBase: 15, baseDiameter: 13.5 },
  { nps: 20, label: '20" OD', centerToBase: 16, baseDiameter: 13.5 },
  { nps: 24, label: '24" OD', centerToBase: 18.5, baseDiameter: 13.5 },
];

// 300 lb steel flanged elbows, tees and crosses, 1/16 inch raised face. 4-77.
export const FLANGED_300: FlangedFitting[] = [
  { nps: 1, label: '1"', a: 4, b: 5, c: 2.25 },
  { nps: 1.25, label: '1-1/4"', a: 4.25, b: 5.5, c: 2.5 },
  { nps: 1.5, label: '1-1/2"', a: 4.5, b: 6, c: 2.75 },
  { nps: 2, label: '2"', a: 5, b: 6.5, c: 3 },
  { nps: 2.5, label: '2-1/2"', a: 5.5, b: 7, c: 3.5 },
  { nps: 3, label: '3"', a: 6, b: 7.75, c: 3.5 },
  { nps: 3.5, label: '3-1/2"', a: 6.5, b: 8.5, c: 4 },
  { nps: 4, label: '4"', a: 7, b: 9, c: 4.5 },
  { nps: 5, label: '5"', a: 8, b: 10.25, c: 5 },
  { nps: 6, label: '6"', a: 8.5, b: 11.5, c: 5.5 },
  { nps: 8, label: '8"', a: 10, b: 14, c: 6 },
  { nps: 10, label: '10"', a: 11.5, b: 16.5, c: 7 },
  { nps: 12, label: '12"', a: 13, b: 19, c: 8 },
  { nps: 14, label: '14" OD', a: 15, b: 21.5, c: 8.5 },
  { nps: 16, label: '16" OD', a: 16.5, b: 24, c: 9.5 },
  { nps: 18, label: '18" OD', a: 18, b: 26.5, c: 10 },
  { nps: 20, label: '20" OD', a: 19.5, b: 29, c: 10.5 },
  { nps: 24, label: '24" OD', a: 22.5, b: 34, c: 12 },
];

// 300 lb steel flanged laterals and reducers, 1/16 inch raised face. 4-78.
export const LATERALS_300: FlangedLateral[] = [
  { nps: 1, label: '1"', e: 6.5, f: 2, g: 4.5 },
  { nps: 1.25, label: '1-1/4"', e: 7.25, f: 2.25, g: 4.5 },
  { nps: 1.5, label: '1-1/2"', e: 8.5, f: 2.5, g: 4.5 },
  { nps: 2, label: '2"', e: 9, f: 2.5, g: 5 },
  { nps: 2.5, label: '2-1/2"', e: 10.5, f: 2.5, g: 5.5 },
  { nps: 3, label: '3"', e: 11, f: 3, g: 6 },
  { nps: 3.5, label: '3-1/2"', e: 12.5, f: 3, g: 6.5 },
  { nps: 4, label: '4"', e: 13.5, f: 3, g: 7 },
  { nps: 5, label: '5"', e: 15, f: 3.5, g: 8 },
  { nps: 6, label: '6"', e: 17.5, f: 4, g: 9 },
  { nps: 8, label: '8"', e: 20.5, f: 5, g: 11 },
  { nps: 10, label: '10"', e: 24, f: 5.5, g: 12 },
  { nps: 12, label: '12"', e: 27.5, f: 6, g: 14 },
  { nps: 14, label: '14" OD', e: 31, f: 6.5, g: 16 },
  { nps: 16, label: '16" OD', e: 34.5, f: 7.5, g: 18 },
  { nps: 18, label: '18" OD', e: 37.5, f: 8, g: 19 },
  { nps: 20, label: '20" OD', e: 40.5, f: 8.5, g: 20 },
  { nps: 24, label: '24" OD', e: 47.5, f: 10, g: 24 },
];

const BY_CLASS: Partial<Record<FlangeClass, FlangedFitting[]>> = {
  '150': FLANGED_150,
  '300': FLANGED_300,
};
const LATERALS_BY_CLASS: Partial<Record<FlangeClass, FlangedLateral[]>> = {
  '150': LATERALS_150,
  '300': LATERALS_300,
};

/**
 * What a ring joint face adds over a 1/16 inch raised face, per flange face.
 *
 * Held as the size at which each step starts. Below the first size in a class
 * the ring joint fitting is not made, and nothing is worked out for it.
 */
const RING_JOINT_STEPS: Partial<Record<FlangeClass, [number, number][]>> = {
  '150': [
    [1, 7 / 32],
    [2, 1 / 4],
  ],
  '300': [
    [2, 5 / 16],
    [20, 3 / 8],
    [24, 7 / 16],
  ],
};

export function ringJointAllowance(nps: number, cls: FlangeClass = '150'): number {
  const steps = RING_JOINT_STEPS[cls];
  if (!steps) return NaN;
  let out = NaN;
  for (const [from, d] of steps) if (nps >= from) out = d;
  return out;
}

/** Whether a class is made with a ring joint face in a size. */
export const madeInRingJoint = (nps: number, cls: FlangeClass = '150'): boolean =>
  Number.isFinite(ringJointAllowance(nps, cls));

export const flangedFitting = (
  nps: number,
  cls: FlangeClass = '150',
  facing: FlangeFacing = 'raisedFace'
): FlangedFitting | undefined => {
  const row = BY_CLASS[cls]?.find((f) => f.nps === nps);
  if (!row || facing === 'raisedFace') return row;
  const d = ringJointAllowance(nps, cls);
  if (!Number.isFinite(d)) return undefined;
  return { ...row, a: row.a + d, b: row.b + d, c: row.c + d };
};

export const flangedLateral = (
  nps: number,
  cls: FlangeClass = '150',
  facing: FlangeFacing = 'raisedFace'
): FlangedLateral | undefined => {
  const row = LATERALS_BY_CLASS[cls]?.find((l) => l.nps === nps);
  if (!row || facing === 'raisedFace') return row;
  const d = ringJointAllowance(nps, cls);
  if (!Number.isFinite(d)) return undefined;
  // E and F are centre to face, one flange. G is face to face, so two.
  return { ...row, e: row.e + d, f: row.f + d, g: row.g + 2 * d };
};

export const flangedBase = (nps: number): (typeof BASES_150)[number] | undefined =>
  BASES_150.find((b) => b.nps === nps);

export const flangedSizes = (cls: FlangeClass = '150'): number[] =>
  (BY_CLASS[cls] ?? []).map((f) => f.nps);

export const flangedClasses = (): FlangeClass[] => Object.keys(BY_CLASS) as FlangeClass[];
