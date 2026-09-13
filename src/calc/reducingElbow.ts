// Centre to end of screwed reducing elbows, 125 lb cast iron.
//
// X is the dimension on the smaller outlet, Z on the larger. Both are
// measured from the centre of the fitting to the face of that end.

export type ReducingElbow = {
  run: number;
  branch: number;
  label: string;
  /** Centre to end on the smaller outlet. */
  x: number;
  /** Centre to end on the larger outlet. */
  z: number;
};

export const REDUCING_ELBOWS: ReducingElbow[] = [
  { run: 0.5, branch: 0.375, label: '1/2" x 3/8"', x: 1.0625, z: 1.0 },
  { run: 0.75, branch: 0.5, label: '3/4" x 1/2"', x: 1.1875, z: 1.25 },
  { run: 1, branch: 0.75, label: '1" x 3/4"', x: 1.375, z: 1.4375 },
  { run: 1, branch: 0.5, label: '1" x 1/2"', x: 1.25, z: 1.375 },
  { run: 1.25, branch: 1, label: '1-1/4" x 1"', x: 1.5625, z: 1.6875 },
  { run: 1.25, branch: 0.75, label: '1-1/4" x 3/4"', x: 1.4375, z: 1.625 },
  { run: 1.25, branch: 0.5, label: '1-1/4" x 1/2"', x: 1.3125, z: 1.5 },
  { run: 1.5, branch: 1.25, label: '1-1/2" x 1-1/4"', x: 1.8125, z: 1.875 },
  { run: 1.5, branch: 1, label: '1-1/2" x 1"', x: 1.625, z: 1.8125 },
  { run: 1.5, branch: 0.75, label: '1-1/2" x 3/4"', x: 1.5, z: 1.75 },
  { run: 1.5, branch: 0.5, label: '1-1/2" x 1/2"', x: 1.4375, z: 1.6875 },
  { run: 2, branch: 1.5, label: '2" x 1-1/2"', x: 2.0, z: 2.1875 },
  { run: 2, branch: 1.25, label: '2" x 1-1/4"', x: 1.875, z: 2.125 },
  { run: 2, branch: 1, label: '2" x 1"', x: 1.75, z: 2.0 },
  { run: 2, branch: 0.75, label: '2" x 3/4"', x: 1.625, z: 2.0 },
  { run: 2, branch: 0.5, label: '2" x 1/2"', x: 1.5, z: 1.875 },
  { run: 2.5, branch: 2, label: '2-1/2" x 2"', x: 2.375, z: 2.625 },
  { run: 2.5, branch: 1.5, label: '2-1/2" x 1-1/2"', x: 2.1875, z: 2.5 },
  { run: 2.5, branch: 1.25, label: '2-1/2" x 1-1/4"', x: 2.0625, z: 2.4375 },
  { run: 2.5, branch: 1, label: '2-1/2" x 1"', x: 1.875, z: 2.375 },
  { run: 3, branch: 2.5, label: '3" x 2-1/2"', x: 2.8125, z: 3.0 },
  { run: 3, branch: 2, label: '3" x 2"', x: 2.5, z: 2.875 },
  { run: 3, branch: 1.5, label: '3" x 1-1/2"', x: 2.3125, z: 2.8125 },
  { run: 3, branch: 1.25, label: '3" x 1-1/4"', x: 2.1875, z: 2.75 },
  { run: 3.5, branch: 3, label: '3-1/2" x 3"', x: 3.1875, z: 3.3125 },
  { run: 4, branch: 3.5, label: '4" x 3-1/2"', x: 3.5625, z: 3.6875 },
  { run: 4, branch: 3, label: '4" x 3"', x: 3.3125, z: 3.625 },
  { run: 4, branch: 2.5, label: '4" x 2-1/2"', x: 3.0625, z: 3.5 },
  { run: 4, branch: 2, label: '4" x 2"', x: 2.75, z: 3.4375 },
  { run: 5, branch: 4, label: '5" x 4"', x: 4.0, z: 4.4375 },
  { run: 5, branch: 3, label: '5" x 3"', x: 3.5, z: 4.25 },
  { run: 5, branch: 2.5, label: '5" x 2-1/2"', x: 3.25, z: 4.125 },
  { run: 6, branch: 5, label: '6" x 5"', x: 4.625, z: 5.0 },
  { run: 6, branch: 4, label: '6" x 4"', x: 4.125, z: 4.9375 },
  { run: 6, branch: 3, label: '6" x 3"', x: 3.625, z: 4.75 },
  { run: 8, branch: 6, label: '8" x 6"', x: 5.5625, z: 6.375 },
];

export function reducingElbow(run: number, branch: number): ReducingElbow | undefined {
  const big = Math.max(run, branch);
  const small = Math.min(run, branch);
  return REDUCING_ELBOWS.find((r) => r.run === big && r.branch === small);
}

export const reducingElbowRuns = (): number[] =>
  [...new Set(REDUCING_ELBOWS.map((r) => r.run))].sort((a, b) => a - b);

export const reducingElbowBranches = (run: number): number[] =>
  REDUCING_ELBOWS.filter((r) => r.run === run).map((r) => r.branch).sort((a, b) => a - b);
