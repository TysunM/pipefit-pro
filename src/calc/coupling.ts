import { NPT_TABLE } from './thread';

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

// Malleable iron straight couplings, dimension H: the gap left between the two
// pipe ends once both are made up tight. It is not the coupling's length, and
// it does not climb steadily with the size, because it is the length less two
// thread engagements and the engagement steps up faster than the casting does
// at the small end.
//
// Two sizes below a quarter inch and three above four are not listed.

export const MALLEABLE_COUPLING_GAP: { nps: number; label: string; gap: number }[] = [
  { nps: 0.125, label: '1/8"', gap: 0.4375 },
  { nps: 0.25, label: '1/4"', gap: 0.3125 },
  { nps: 0.375, label: '3/8"', gap: 0.4375 },
  { nps: 0.5, label: '1/2"', gap: 0.3125 },
  { nps: 0.75, label: '3/4"', gap: 0.375 },
  { nps: 1, label: '1"', gap: 0.3125 },
  { nps: 1.25, label: '1-1/4"', gap: 0.5625 },
  { nps: 1.5, label: '1-1/2"', gap: 0.75 },
  { nps: 2, label: '2"', gap: 1 },
  { nps: 2.5, label: '2-1/2"', gap: 1 },
  { nps: 3, label: '3"', gap: 1.1875 },
  { nps: 4, label: '4"', gap: 1.4375 },
];

const GAP_BY_NPS = new Map(MALLEABLE_COUPLING_GAP.map((c) => [c.nps, c.gap]));

/** Gap a malleable iron straight coupling leaves between the two pipe ends. */
export const malleableCouplingGap = (nps: number): number => GAP_BY_NPS.get(nps) ?? NaN;

/**
 * End to end of a malleable iron straight coupling: the gap it leaves plus the
 * two threads buried in it. The book prints the gap rather than the length,
 * and the lengths this gives climb cleanly with the size, which the gaps
 * themselves do not.
 */
export function malleableCouplingLength(nps: number): number {
  const gap = GAP_BY_NPS.get(nps);
  const t = NPT_TABLE.find((x) => x.nps === nps);
  if (gap === undefined || !t) return NaN;
  return gap + 2 * t.engagementWhenTight;
}

export const malleableCouplingSizes = (): number[] => MALLEABLE_COUPLING_GAP.map((c) => c.nps);
