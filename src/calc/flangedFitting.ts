// Laying lengths of flanged fittings, from the handbook's tables.
//
// A is centre to face of a 90 degree elbow, a tee and a cross; B is centre to
// face of a long radius elbow; C is centre to face of a 45 degree elbow.

export type FlangeClass = '150';

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

// 150 lb steel flanged elbows, tees and crosses, 1/16 inch raised face.
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

const BY_CLASS: Record<FlangeClass, FlangedFitting[]> = { '150': FLANGED_150 };

export const flangedFitting = (nps: number, cls: FlangeClass = '150'): FlangedFitting | undefined =>
  BY_CLASS[cls].find((f) => f.nps === nps);

export const flangedSizes = (cls: FlangeClass = '150'): number[] => BY_CLASS[cls].map((f) => f.nps);
