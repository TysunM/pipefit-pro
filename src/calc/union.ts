import { NPT_TABLE } from './thread';

// Malleable iron unions, and tees with a street elbow made up into them.
// Handbook pages 4-45 and 4-46.
//
// G is the gap a plain union leaves between the two pipe ends, the same kind
// of figure the coupling pages print. D is the takeout of a tee union or elbow
// union: centre of the fitting to the end of the pipe on the union side.
//
// M and L are for a tee with a street elbow screwed straight into its outlet,
// no nipple between them: centre of the tee to the centre of the street
// elbow's free end, with a 90 and with a 45.

export type Union = {
  nps: number;
  label: string;
  /** Gap a plain union leaves between the pipe ends, dimension G. */
  gap: number;
  /** Takeout of a tee or elbow union, dimension D, or no value where not made. */
  takeout: number;
};

const N = NaN;

export const UNIONS: Union[] = [
  { nps: 0.25, label: '1/4"', gap: 1, takeout: 1.3125 },
  { nps: 0.375, label: '3/8"', gap: 1.125, takeout: 1.5 },
  { nps: 0.5, label: '1/2"', gap: 1.1875, takeout: 1.625 },
  { nps: 0.75, label: '3/4"', gap: 1.3125, takeout: 1.875 },
  { nps: 1, label: '1"', gap: 1.5625, takeout: 2.1875 },
  { nps: 1.25, label: '1-1/4"', gap: 1.625, takeout: 2.5 },
  { nps: 1.5, label: '1-1/2"', gap: 1.6875, takeout: 2.6875 },
  { nps: 2, label: '2"', gap: 1.8125, takeout: 3.125 },
  { nps: 2.5, label: '2-1/2"', gap: 2.3125, takeout: N },
  { nps: 3, label: '3"', gap: 2.5625, takeout: N },
];

const UNION_BY_NPS = new Map(UNIONS.map((u) => [u.nps, u]));

export const union = (nps: number): Union | undefined => UNION_BY_NPS.get(nps);

/** Gap a plain union leaves between the two pipe ends. */
export const unionGap = (nps: number): number => UNION_BY_NPS.get(nps)?.gap ?? NaN;

/** Takeout of a tee union or elbow union. Not made past two inch. */
export const unionTakeout = (nps: number): number => UNION_BY_NPS.get(nps)?.takeout ?? NaN;

/**
 * End to end of a plain union: the gap it leaves plus the two threads buried
 * in it, the same way the coupling length is worked.
 */
export function unionLength(nps: number): number {
  const u = UNION_BY_NPS.get(nps);
  const t = NPT_TABLE.find((x) => x.nps === nps);
  if (!u || !t) return NaN;
  return u.gap + 2 * t.engagementWhenTight;
}

export type CombinedTee = {
  nps: number;
  label: string;
  /** Centre of the tee to the centre of a 90 street elbow in it, dimension M. */
  with90: number;
  /** The same with a 45 street elbow, dimension L, or no value where not made. */
  with45: number;
};

export const COMBINED_TEES: CombinedTee[] = [
  { nps: 0.125, label: '1/8"', with90: 1.4375, with45: 1.25 },
  { nps: 0.25, label: '1/4"', with90: 1.625, with45: 1.375 },
  { nps: 0.375, label: '3/8"', with90: 2, with45: 1.625 },
  { nps: 0.5, label: '1/2"', with90: 2.25, with45: 1.8125 },
  { nps: 0.75, label: '3/4"', with90: 2.625, with45: 2.0625 },
  { nps: 1, label: '1"', with90: 2.9375, with45: 2.3125 },
  { nps: 1.25, label: '1-1/4"', with90: 3.5, with45: 2.75 },
  { nps: 1.5, label: '1-1/2"', with90: 3.9375, with45: 3.125 },
  { nps: 2, label: '2"', with90: 4.75, with45: 3.75 },
  { nps: 2.5, label: '2-1/2"', with90: 5.3125, with45: N },
  { nps: 3, label: '3"', with90: 6.625, with45: N },
  { nps: 4, label: '4"', with90: 8.3125, with45: N },
];

const COMBINED_BY_NPS = new Map(COMBINED_TEES.map((c) => [c.nps, c]));

/**
 * Centre of a tee to the centre of a street elbow made up straight into it.
 *
 * The 1/8 and 1 inch figures print with the denominator inked over. Both are
 * read as sixteenths, which are the only readings that fall between the rows
 * either side of them.
 */
export const combinedTee = (nps: number, angle: 45 | 90 = 90): number => {
  const row = COMBINED_BY_NPS.get(nps);
  if (!row) return NaN;
  return angle === 45 ? row.with45 : row.with90;
};

export const unionSizes = (): number[] => UNIONS.map((u) => u.nps);
export const combinedTeeSizes = (): number[] => COMBINED_TEES.map((c) => c.nps);
