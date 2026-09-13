// Centre to end of screwed reducing fittings.
//
// X is the dimension on the smaller outlet, Z on the larger, both from the
// centre of the fitting to the face of that end. On a reducing outlet tee the
// handbook calls them Run C and Outlet M; they are the same two numbers.
//
// The handbook prints four separate tables — cast iron reducing elbows,
// reducing crosses, reducing outlet tees, and malleable reducing elbows — and
// every combination any two of them share carries identical figures. They are
// therefore held once here, with a note of which fittings each combination is
// made as. Four small sizes appear only in the malleable table.

export type ReducingKind = 'elbow' | 'cross' | 'tee';

export type ReducingFitting = {
  run: number;
  branch: number;
  label: string;
  /** Centre to end on the smaller outlet. The tee tables call this Run C. */
  x: number;
  /** Centre to end on the larger outlet. The tee tables call this Outlet M. */
  z: number;
  kinds: ReducingKind[];
  /** Listed only in the malleable table, not the cast iron one. */
  malleableOnly?: boolean;
};

export const REDUCING_FITTINGS: ReducingFitting[] = [
  { run: 0.375, branch: 0.125, label: '3/8" x 1/8"', x: 0.8125, z: 0.875, kinds: ['elbow'], malleableOnly: true },
  { run: 0.375, branch: 0.25, label: '3/8" x 1/4"', x: 0.875, z: 0.875, kinds: ['elbow'], malleableOnly: true },
  { run: 0.5, branch: 0.25, label: '1/2" x 1/4"', x: 1.0, z: 1.0, kinds: ['elbow'], malleableOnly: true },
  { run: 0.75, branch: 0.25, label: '3/4" x 1/4"', x: 1.0625, z: 1.0625, kinds: ['elbow'], malleableOnly: true },
  { run: 0.5, branch: 0.375, label: '1/2" x 3/8"', x: 1.0625, z: 1.0, kinds: ['elbow'] },
  { run: 0.75, branch: 0.375, label: '3/4" x 3/8"', x: 1.125, z: 1.125, kinds: ['elbow', 'tee'] },
  { run: 0.75, branch: 0.5, label: '3/4" x 1/2"', x: 1.1875, z: 1.25, kinds: ['elbow', 'cross', 'tee'] },
  { run: 1, branch: 0.375, label: '1" x 3/8"', x: 1.1875, z: 1.25, kinds: ['elbow', 'tee'] },
  { run: 1, branch: 0.5, label: '1" x 1/2"', x: 1.25, z: 1.375, kinds: ['elbow', 'tee'] },
  { run: 1, branch: 0.75, label: '1" x 3/4"', x: 1.375, z: 1.4375, kinds: ['elbow', 'cross', 'tee'] },
  { run: 1.25, branch: 0.5, label: '1-1/4" x 1/2"', x: 1.3125, z: 1.5, kinds: ['elbow', 'tee'] },
  { run: 1.25, branch: 0.75, label: '1-1/4" x 3/4"', x: 1.4375, z: 1.625, kinds: ['elbow', 'cross', 'tee'] },
  { run: 1.25, branch: 1, label: '1-1/4" x 1"', x: 1.5625, z: 1.6875, kinds: ['elbow', 'cross', 'tee'] },
  { run: 1.5, branch: 0.5, label: '1-1/2" x 1/2"', x: 1.4375, z: 1.6875, kinds: ['elbow', 'tee'] },
  { run: 1.5, branch: 0.75, label: '1-1/2" x 3/4"', x: 1.5, z: 1.75, kinds: ['elbow', 'cross', 'tee'] },
  { run: 1.5, branch: 1, label: '1-1/2" x 1"', x: 1.625, z: 1.8125, kinds: ['elbow', 'cross', 'tee'] },
  { run: 1.5, branch: 1.25, label: '1-1/2" x 1-1/4"', x: 1.8125, z: 1.875, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2, branch: 0.5, label: '2" x 1/2"', x: 1.5, z: 1.875, kinds: ['elbow', 'tee'] },
  { run: 2, branch: 0.75, label: '2" x 3/4"', x: 1.625, z: 2.0, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2, branch: 1, label: '2" x 1"', x: 1.75, z: 2.0, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2, branch: 1.25, label: '2" x 1-1/4"', x: 1.875, z: 2.125, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2, branch: 1.5, label: '2" x 1-1/2"', x: 2.0, z: 2.1875, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2.5, branch: 0.75, label: '2-1/2" x 3/4"', x: 1.75, z: 2.3125, kinds: ['tee'] },
  { run: 2.5, branch: 1, label: '2-1/2" x 1"', x: 1.875, z: 2.375, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2.5, branch: 1.25, label: '2-1/2" x 1-1/4"', x: 2.0625, z: 2.4375, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2.5, branch: 1.5, label: '2-1/2" x 1-1/2"', x: 2.1875, z: 2.5, kinds: ['elbow', 'cross', 'tee'] },
  { run: 2.5, branch: 2, label: '2-1/2" x 2"', x: 2.375, z: 2.625, kinds: ['elbow', 'cross', 'tee'] },
  { run: 3, branch: 0.75, label: '3" x 3/4"', x: 1.875, z: 2.625, kinds: ['tee'] },
  { run: 3, branch: 1, label: '3" x 1"', x: 2.0, z: 2.6875, kinds: ['cross', 'tee'] },
  { run: 3, branch: 1.25, label: '3" x 1-1/4"', x: 2.1875, z: 2.75, kinds: ['elbow', 'cross', 'tee'] },
  { run: 3, branch: 1.5, label: '3" x 1-1/2"', x: 2.3125, z: 2.8125, kinds: ['elbow', 'cross', 'tee'] },
  { run: 3, branch: 2, label: '3" x 2"', x: 2.5, z: 2.875, kinds: ['elbow', 'cross', 'tee'] },
  { run: 3, branch: 2.5, label: '3" x 2-1/2"', x: 2.8125, z: 3.0, kinds: ['elbow', 'tee'] },
  { run: 3.5, branch: 1.25, label: '3-1/2" x 1-1/4"', x: 2.25, z: 3.0, kinds: ['tee'] },
  { run: 3.5, branch: 1.5, label: '3-1/2" x 1-1/2"', x: 2.375, z: 3.0625, kinds: ['cross', 'tee'] },
  { run: 3.5, branch: 2, label: '3-1/2" x 2"', x: 2.625, z: 3.125, kinds: ['cross', 'tee'] },
  { run: 3.5, branch: 2.5, label: '3-1/2" x 2-1/2"', x: 2.9375, z: 3.25, kinds: ['cross', 'tee'] },
  { run: 3.5, branch: 3, label: '3-1/2" x 3"', x: 3.1875, z: 3.3125, kinds: ['elbow', 'tee'] },
  { run: 4, branch: 1, label: '4" x 1"', x: 2.25, z: 3.1875, kinds: ['tee'] },
  { run: 4, branch: 1.5, label: '4" x 1-1/2"', x: 2.5, z: 3.3125, kinds: ['cross', 'tee'] },
  { run: 4, branch: 2, label: '4" x 2"', x: 2.75, z: 3.4375, kinds: ['elbow', 'cross', 'tee'] },
  { run: 4, branch: 2.5, label: '4" x 2-1/2"', x: 3.0625, z: 3.5, kinds: ['elbow', 'cross', 'tee'] },
  { run: 4, branch: 3, label: '4" x 3"', x: 3.3125, z: 3.625, kinds: ['elbow', 'cross', 'tee'] },
  { run: 4, branch: 3.5, label: '4" x 3-1/2"', x: 3.5625, z: 3.6875, kinds: ['elbow'] },
  { run: 5, branch: 1, label: '5" x 1"', x: 2.4375, z: 3.8125, kinds: ['tee'] },
  { run: 5, branch: 1.25, label: '5" x 1-1/4"', x: 2.625, z: 3.875, kinds: ['tee'] },
  { run: 5, branch: 1.5, label: '5" x 1-1/2"', x: 2.75, z: 3.9375, kinds: ['tee'] },
  { run: 5, branch: 2, label: '5" x 2"', x: 2.9375, z: 4.0, kinds: ['cross', 'tee'] },
  { run: 5, branch: 2.5, label: '5" x 2-1/2"', x: 3.25, z: 4.125, kinds: ['elbow', 'tee'] },
  { run: 5, branch: 3, label: '5" x 3"', x: 3.5, z: 4.25, kinds: ['elbow', 'cross', 'tee'] },
  { run: 5, branch: 4, label: '5" x 4"', x: 4.0, z: 4.4375, kinds: ['elbow', 'cross', 'tee'] },
  { run: 6, branch: 1.5, label: '6" x 1-1/2"', x: 2.875, z: 4.5, kinds: ['tee'] },
  { run: 6, branch: 2, label: '6" x 2"', x: 3.0625, z: 4.5625, kinds: ['cross', 'tee'] },
  { run: 6, branch: 2.5, label: '6" x 2-1/2"', x: 3.375, z: 4.6875, kinds: ['cross', 'tee'] },
  { run: 6, branch: 3, label: '6" x 3"', x: 3.625, z: 4.75, kinds: ['elbow', 'cross', 'tee'] },
  { run: 6, branch: 4, label: '6" x 4"', x: 4.125, z: 4.9375, kinds: ['elbow', 'cross', 'tee'] },
  { run: 6, branch: 5, label: '6" x 5"', x: 4.625, z: 5.0, kinds: ['elbow', 'tee'] },
  { run: 8, branch: 2, label: '8" x 2"', x: 3.4375, z: 5.8125, kinds: ['tee'] },
  { run: 8, branch: 2.5, label: '8" x 2-1/2"', x: 3.6875, z: 6.0, kinds: ['tee'] },
  { run: 8, branch: 3, label: '8" x 3"', x: 4.0, z: 6.0625, kinds: ['tee'] },
  { run: 8, branch: 4, label: '8" x 4"', x: 4.5, z: 6.1875, kinds: ['cross', 'tee'] },
  { run: 8, branch: 5, label: '8" x 5"', x: 5.0, z: 6.25, kinds: ['tee'] },
  { run: 8, branch: 6, label: '8" x 6"', x: 5.5625, z: 6.375, kinds: ['elbow', 'cross', 'tee'] },
];

export function reducingFitting(run: number, branch: number, kind?: ReducingKind): ReducingFitting | undefined {
  const big = Math.max(run, branch);
  const small = Math.min(run, branch);
  const hit = REDUCING_FITTINGS.find((r) => r.run === big && r.branch === small);
  if (!hit) return undefined;
  if (kind && !hit.kinds.includes(kind)) return undefined;
  return hit;
}

export const reducingRuns = (kind?: ReducingKind): number[] =>
  [...new Set(REDUCING_FITTINGS.filter((r) => !kind || r.kinds.includes(kind)).map((r) => r.run))].sort(
    (a, b) => a - b
  );

export const reducingBranches = (run: number, kind?: ReducingKind): number[] =>
  REDUCING_FITTINGS.filter((r) => r.run === run && (!kind || r.kinds.includes(kind)))
    .map((r) => r.branch)
    .sort((a, b) => a - b);

export const REDUCING_ELBOWS = REDUCING_FITTINGS.filter((r) => r.kinds.includes('elbow'));

export const reducingElbow = (run: number, branch: number): ReducingFitting | undefined =>
  reducingFitting(run, branch, 'elbow');

/** A reducing outlet tee, named the way the handbook names it. */
export function reducingOutletTee(run: number, outlet: number): { runC: number; outletM: number } | undefined {
  const f = reducingFitting(run, outlet, 'tee');
  return f ? { runC: f.x, outletM: f.z } : undefined;
}
