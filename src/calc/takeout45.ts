import { NPT_TABLE } from './thread';
import { screwedFitting } from './screwedFitting';

// Laying lengths of 45 degree screwed elbows: dimension B, centre of the
// fitting to the end of the pipe. The takeout for a 45, the same way
// dimension A is the takeout for a 90.
//
// It follows the same rule: the 45 elbow's centre to end, less the engagement
// when made up tight. That is why the three-eighths row is larger than the
// half inch row — the engagement steps up between them by more than the
// fitting grows.
//
// The printed table stops at 8 inch. Above that the same rule is worked from
// the fitting and thread tables, the same way dimension A is.

export type Takeout45 = { nps: number; label: string; takeout: number };

export const TAKEOUTS_45: Takeout45[] = [
  { nps: 0.25, label: '1/4"', takeout: 0.375 },
  { nps: 0.375, label: '3/8"', takeout: 0.4375 },
  { nps: 0.5, label: '1/2"', takeout: 0.375 },
  { nps: 0.75, label: '3/4"', takeout: 0.4375 },
  { nps: 1, label: '1"', takeout: 0.4375 },
  { nps: 1.25, label: '1-1/4"', takeout: 0.625 },
  { nps: 1.5, label: '1-1/2"', takeout: 0.75 },
  { nps: 2, label: '2"', takeout: 0.9375 },
  { nps: 2.5, label: '2-1/2"', takeout: 1.0 },
  { nps: 3, label: '3"', takeout: 1.1875 },
  { nps: 3.5, label: '3-1/2"', takeout: 1.3125 },
  { nps: 4, label: '4"', takeout: 1.5 },
  { nps: 5, label: '5"', takeout: 1.8125 },
  { nps: 6, label: '6"', takeout: 2.125 },
  { nps: 8, label: '8"', takeout: 2.8125 },
];

const BY_NPS = new Map(TAKEOUTS_45.map((t) => [t.nps, t]));

export const takeout45 = (nps: number): number => BY_NPS.get(nps)?.takeout ?? takeout45FromTables(nps);

export function takeout45FromTables(nps: number): number {
  const f = screwedFitting(nps);
  const t = NPT_TABLE.find((x) => x.nps === nps);
  if (!f || !t) return NaN;
  return f.centerToEnd45 - t.engagementWhenTight;
}

// Laying lengths of screwed Ys. E runs along each leg from the point where the
// centrelines cross; F is the offset of the branch centreline from that point.
// A dash in the printed table means the size is not made, and is held here as
// no value rather than a zero.

export type WyeLength = {
  nps: number;
  label: string;
  eCastIron: number;
  eMalleable: number;
  fCastIron: number;
  fMalleable: number;
};

export const WYE_LENGTHS: WyeLength[] = [
  { nps: 0.375, label: '3/8"', eCastIron: NaN, eMalleable: 1.0625, fCastIron: NaN, fMalleable: 0.3125 },
  { nps: 0.5, label: '1/2"', eCastIron: NaN, eMalleable: 1.1875, fCastIron: NaN, fMalleable: 0.25 },
  { nps: 0.75, label: '3/4"', eCastIron: 1.6875, eMalleable: 1.5, fCastIron: 0.1875, fMalleable: 0.1875 },
  { nps: 1, label: '1"', eCastIron: 2.0625, eMalleable: 1.75, fCastIron: 0.25, fMalleable: 0.25 },
  { nps: 1.25, label: '1-1/4"', eCastIron: 2.5625, eMalleable: 2.25, fCastIron: 0.3125, fMalleable: 0.4375 },
  { nps: 1.5, label: '1-1/2"', eCastIron: 3.125, eMalleable: 2.625, fCastIron: 0.375, fMalleable: 0.5 },
  { nps: 2, label: '2"', eCastIron: 3.75, eMalleable: 3.25, fCastIron: 0.5, fMalleable: 0.6875 },
  { nps: 2.5, label: '2-1/2"', eCastIron: 4.25, eMalleable: 3.75, fCastIron: 0.625, fMalleable: 0.625 },
  { nps: 3, label: '3"', eCastIron: 5.125, eMalleable: 4.5625, fCastIron: 0.75, fMalleable: 0.6875 },
  { nps: 4, label: '4"', eCastIron: 6.5, eMalleable: 5.8125, fCastIron: 1.0, fMalleable: 0.8125 },
];

const WYE_BY_NPS = new Map(WYE_LENGTHS.map((w) => [w.nps, w]));

export const wyeLength = (nps: number): WyeLength | undefined => WYE_BY_NPS.get(nps);

/** Pipe to cut for a centre to centre run turned by a 45 at each end. */
export function screwedCut45(centerToCenter: number, npsA: number, npsB: number = npsA): number {
  const a = takeout45(npsA);
  const b = takeout45(npsB);
  if (!Number.isFinite(centerToCenter) || !Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  const cut = centerToCenter - a - b;
  return cut > 0 ? cut : NaN;
}

export const takeout45Sizes = (): number[] => TAKEOUTS_45.map((t) => t.nps);

export const wyeSizes = (material: 'castIron' | 'malleable'): number[] =>
  WYE_LENGTHS.filter((w) => Number.isFinite(material === 'castIron' ? w.eCastIron : w.eMalleable)).map(
    (w) => w.nps
  );
