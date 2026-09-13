import { takeout } from './takeout';

// Laying lengths of malleable iron street elbows.
//
// A street elbow has a female socket at one end and a male spigot at the other,
// so it screws straight into another fitting with no nipple between them.
//
// Dimension A, the 90 degree elbow, is the distance from the end of the pipe in
// the socket to the centreline of the spigot. It comes out exactly equal to the
// ordinary elbow takeout on all fourteen sizes the page prints, which is what
// you would expect: the socket end is the same socket, and the spigot end takes
// out nothing of its own. It is worked from that table here rather than held
// twice, with the printed figures pinned in the tests.
//
// Dimension C, the 45 degree elbow, is its own casting and does not match the
// ordinary 45 takeout. It runs a sixteenth or two shorter in every size but two
// inch, where the two meet. Street 45s are made to two inch and no further.

export const STREET_45_TAKEOUT: { nps: number; label: string; takeout: number }[] = [
  { nps: 0.25, label: '1/4"', takeout: 0.25 },
  { nps: 0.375, label: '3/8"', takeout: 0.3125 },
  { nps: 0.5, label: '1/2"', takeout: 0.3125 },
  { nps: 0.75, label: '3/4"', takeout: 0.375 },
  { nps: 1, label: '1"', takeout: 0.375 },
  { nps: 1.25, label: '1-1/4"', takeout: 0.5625 },
  { nps: 1.5, label: '1-1/2"', takeout: 0.6875 },
  { nps: 2, label: '2"', takeout: 0.9375 },
];

/** Sizes the page carries for the 90 degree street elbow. */
export const STREET_90_SIZES = [
  0.25, 0.375, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6,
] as const;

const BY_NPS_45 = new Map(STREET_45_TAKEOUT.map((s) => [s.nps, s.takeout]));

/** Takeout of a 90 degree street elbow: the ordinary elbow takeout. */
export const streetTakeout90 = (nps: number): number =>
  (STREET_90_SIZES as readonly number[]).includes(nps) ? takeout(nps) : NaN;

/** Takeout of a 45 degree street elbow. Made to two inch only. */
export const streetTakeout45 = (nps: number): number => BY_NPS_45.get(nps) ?? NaN;

/**
 * Pipe to cut for a run measured centre to centre with a street elbow at each
 * end. Pass one size for a run that does not change size.
 */
export function streetCut(
  centerToCenter: number,
  npsA: number,
  npsB: number = npsA,
  angle: 45 | 90 = 90
): number {
  const pick = angle === 45 ? streetTakeout45 : streetTakeout90;
  const a = pick(npsA);
  const b = pick(npsB);
  if (!Number.isFinite(centerToCenter) || !Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  const cut = centerToCenter - a - b;
  return cut > 0 ? cut : NaN;
}
