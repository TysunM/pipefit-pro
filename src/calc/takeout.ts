import { NPT_TABLE } from './thread';
import { screwedFitting } from './screwedFitting';

// Laying lengths of cast iron and malleable 90 degree elbows, tees and
// crosses: dimension A, the distance from the centre of the fitting to the end
// of the pipe screwed into it.
//
// This is the takeout — what comes off a centre to centre measurement for each
// fitting on the run. It is also exactly the fitting's centre to end less the
// engagement when made up tight, which is how the three tables check each
// other.
//
// The printed table stops at 8 inch, but 125 lb cast iron screwed fittings are
// made to 12. For those two sizes the same rule is worked from the fitting and
// thread tables rather than leaving a fitter with nothing.

export type Takeout = { nps: number; label: string; takeout: number };

export const TAKEOUTS: Takeout[] = [
  { nps: 0.25, label: '1/4"', takeout: 0.4375 },
  { nps: 0.375, label: '3/8"', takeout: 0.5625 },
  { nps: 0.5, label: '1/2"', takeout: 0.625 },
  { nps: 0.75, label: '3/4"', takeout: 0.75 },
  { nps: 1, label: '1"', takeout: 0.8125 },
  { nps: 1.25, label: '1-1/4"', takeout: 1.0625 },
  { nps: 1.5, label: '1-1/2"', takeout: 1.25 },
  { nps: 2, label: '2"', takeout: 1.5 },
  { nps: 2.5, label: '2-1/2"', takeout: 1.75 },
  { nps: 3, label: '3"', takeout: 2.125 },
  { nps: 3.5, label: '3-1/2"', takeout: 2.375 },
  { nps: 4, label: '4"', takeout: 2.625 },
  { nps: 5, label: '5"', takeout: 3.25 },
  { nps: 6, label: '6"', takeout: 3.8125 },
  { nps: 8, label: '8"', takeout: 5.125 },
];

const BY_NPS = new Map(TAKEOUTS.map((t) => [t.nps, t]));

export const takeout = (nps: number): number => BY_NPS.get(nps)?.takeout ?? takeoutFromTables(nps);

/** The same figure worked from the fitting and thread tables instead. */
export function takeoutFromTables(nps: number): number {
  const f = screwedFitting(nps);
  const t = NPT_TABLE.find((x) => x.nps === nps);
  if (!f || !t) return NaN;
  return f.centerToEnd - t.engagementWhenTight;
}

/**
 * Pipe to cut for a run measured centre to centre, with a fitting at each end.
 * Pass one takeout for a run into two different sizes.
 */
export function screwedCut(centerToCenter: number, npsA: number, npsB: number = npsA): number {
  const a = takeout(npsA);
  const b = takeout(npsB);
  if (!Number.isFinite(centerToCenter) || !Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  const cut = centerToCenter - a - b;
  return cut > 0 ? cut : NaN;
}

export const takeoutSizes = (): number[] => TAKEOUTS.map((t) => t.nps);
