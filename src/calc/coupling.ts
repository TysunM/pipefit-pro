// End to end of screwed reducing couplings, 300 lb malleable iron.
//
// The printed table lists every combination, but the length turns out to
// depend only on the larger of the two sizes: every 1-1/4 by anything is the
// same 2-3/8. It is held that way here, one length per size, which is both
// smaller and impossible to get internally inconsistent.

export type Coupling = {
  nps: number;
  label: string;
  /** End to end length, dimension W. */
  endToEnd: number;
};

export const COUPLINGS_HEAVY: Coupling[] = [
  { nps: 0.375, label: '3/8"', endToEnd: 1.4375 },
  { nps: 0.5, label: '1/2"', endToEnd: 1.6875 },
  { nps: 0.75, label: '3/4"', endToEnd: 1.75 },
  { nps: 1, label: '1"', endToEnd: 2.0 },
  { nps: 1.25, label: '1-1/4"', endToEnd: 2.375 },
  { nps: 1.5, label: '1-1/2"', endToEnd: 2.6875 },
  { nps: 2, label: '2"', endToEnd: 3.1875 },
  { nps: 2.5, label: '2-1/2"', endToEnd: 3.6875 },
  { nps: 3, label: '3"', endToEnd: 4.0625 },
];

const BY_NPS = new Map(COUPLINGS_HEAVY.map((c) => [c.nps, c]));

export const coupling = (nps: number): Coupling | undefined => BY_NPS.get(nps);

/** A reducing coupling is as long as a straight one in the larger size. */
export function reducingCoupling(a: number, b: number): number {
  const hit = BY_NPS.get(Math.max(a, b));
  return hit ? hit.endToEnd : NaN;
}

export const couplingSizes = (): number[] => COUPLINGS_HEAVY.map((c) => c.nps);
