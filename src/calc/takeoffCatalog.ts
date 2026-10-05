import { ElbowRadius, takeoff as bendTakeoff } from './pipe';
import { takeout } from './takeout';
import { takeout45 } from './takeout45';
import { streetTakeout45, streetTakeout90 } from './streetElbow';
import { union } from './union';
import {
  longRadiusElbow,
  shortRadiusElbow,
  elbow45,
  weldTee,
  weldCap,
  stubEnd,
  reducingWeldTeeRun,
} from './weldFitting';
import { weldingNeck } from './weldingNeck';
import { flangedFitting, FlangeClass } from './flangedFitting';
import { solderTakeout } from './solderFitting';

// What comes off a centre to centre measurement at each end of a run.
//
// Every figure here is read from the handbook tables in this project rather
// than held again: the screwed takeouts from 4-37 and 4-39, the welded ones
// from 2-42 and 2-43, the flanges from 4-68 and 4-69, the flanged fittings
// from 4-71 onward, the solder fittings from 3-6 and 3-7.
//
// How the joint is made decides whether anything else comes off as well. A
// screwed takeout is already measured to the end of the pipe, so nothing is
// added; a welded joint has a root gap at each end; a soldered tube bottoms
// in its socket. Getting that wrong is worth more than any rounding.

export type JointKind = 'screwed' | 'welded' | 'flanged' | 'soldered' | 'socket' | 'nohub';

export type TakeoffFamily = {
  id: JointKind;
  label: string;
  /** Whether a gap is left at the joint, and so comes off the cut. */
  hasGap: boolean;
  gapLabel: string;
};

export const TAKEOFF_FAMILIES: TakeoffFamily[] = [
  { id: 'screwed', label: 'Screwed', hasGap: false, gapLabel: 'Made up tight — nothing added' },
  { id: 'welded', label: 'Butt weld', hasGap: true, gapLabel: 'Root gap at each weld' },
  { id: 'flanged', label: 'Flanged', hasGap: true, gapLabel: 'Gasket at each flange' },
  { id: 'soldered', label: 'Solder', hasGap: false, gapLabel: 'Tube bottoms in the socket' },
  { id: 'socket', label: 'PVC socket', hasGap: false, gapLabel: 'Pipe bottoms in the socket' },
  { id: 'nohub', label: 'No-hub', hasGap: true, gapLabel: 'Coupling centre stop at each joint' },
];

export type TakeoffOption = {
  id: string;
  family: JointKind;
  label: string;
  /** Where the figure comes from, shown under the result. */
  source: string;
  /** Inches off a centre to centre dimension at this end. */
  takeout: (nps: number, opts: TakeoffOptions) => number;
};

export type TakeoffOptions = {
  /** Long or short radius, for a welded elbow. */
  radius: ElbowRadius;
  /** Pressure class, for anything flanged. */
  flangeClass: FlangeClass;
  /** A measured figure, for the custom option. */
  custom: number;
  /**
   * The fitting library's figure for a socket or no-hub fitting at a size, or
   * undefined when none has been set (state/fittingLibrary.ts). Those makeups
   * are the maker's, so they are set once by the fitter, never assumed here.
   */
  library?: (fitting: string, nps: number) => number | undefined;
};

export const DEFAULT_TAKEOFF_OPTIONS: TakeoffOptions = {
  radius: 'LR',
  flangeClass: '150',
  custom: 0,
};

/**
 * Takeout of a butt welding elbow, from the table where the table has it.
 *
 * A bend and a bought fitting are not the same thing and do not take out the
 * same amount. One and a half diameters times the tangent of half the angle is
 * what a pipe does when it is bent, and it is what the offset and bender
 * screens work to. A bought elbow is made to its own published figures: a two
 * inch long radius 45 takes out 1-3/8 where the bend takes out 1.2426. Working
 * a run of fittings to the bend figure cuts every piece a quarter of an inch
 * long.
 *
 * At 90 degrees the two agree exactly, because the tangent of 45 is one, which
 * is why this only ever shows up on a 45.
 */
export function elbowTakeout(
  nps: number,
  kind: ElbowRadius,
  angleDeg: number
): { value: number; fromTable: boolean } {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  if (near(angleDeg, 90)) {
    const v = kind === 'LR' ? longRadiusElbow(nps) : shortRadiusElbow(nps);
    if (Number.isFinite(v)) return { value: v, fromTable: true };
  }
  if (near(angleDeg, 45) && kind === 'LR') {
    const v = elbow45(nps);
    if (Number.isFinite(v)) return { value: v, fromTable: true };
  }
  return { value: bendTakeoff(nps, kind, angleDeg), fromTable: false };
}

const flangedCenterToFace = (nps: number, cls: FlangeClass, key: 'a' | 'b' | 'c'): number => {
  const f = flangedFitting(nps, cls);
  return f ? f[key] : NaN;
};

/** Fittings whose takeout comes from the fitting library, set once per line and size. */
export const LIBRARY_FITTINGS: { id: string; family: 'socket' | 'nohub'; label: string; how: string }[] = [
  { id: 'sock90', family: 'socket', label: '90° elbow', how: 'centre to the bottom of the socket' },
  { id: 'sock45', family: 'socket', label: '45° elbow', how: 'centre to the bottom of the socket' },
  { id: 'sockTee', family: 'socket', label: 'Tee', how: 'centre to the bottom of the socket' },
  { id: 'sockStreet90', family: 'socket', label: '90° street elbow', how: 'centre to the end of the spigot' },
  { id: 'nh14', family: 'nohub', label: '1/4 bend', how: 'centre to the end of the fitting' },
  { id: 'nh18', family: 'nohub', label: '1/8 bend', how: 'centre to the end of the fitting' },
  { id: 'nh116', family: 'nohub', label: '1/16 bend', how: 'centre to the end of the fitting' },
  { id: 'nhLong14', family: 'nohub', label: 'Long sweep 1/4', how: 'centre to the end of the fitting' },
  { id: 'nhSanRun', family: 'nohub', label: 'San tee, run', how: 'centre of the branch to the end of the run' },
  { id: 'nhSanBranch', family: 'nohub', label: 'San tee, branch', how: 'centre of the run to the end of the branch' },
  { id: 'nhWyeRun', family: 'nohub', label: 'Wye, run', how: 'branch centreline crossing to the end of the run' },
  { id: 'nhWyeBranch', family: 'nohub', label: 'Wye, branch', how: 'branch centreline crossing to the end of the branch' },
];

/** Which library family a material's fittings are: PVC and CPVC socket, cast iron soil no-hub. */
export const LIBRARY_FAMILY: Readonly<Record<string, 'socket' | 'nohub'>> = { pvc: 'socket', cpvc: 'socket', 'ci-soil': 'nohub' };

/**
 * When the job's material changes under an open Cut Length, the joint family
 * it should move to — or null to leave the fitter's choice alone. Only a move
 * between kinds of joining (steel to PVC, PVC to cast iron) changes it: steel
 * to stainless keeps the flanged or screwed joint the fitter picked.
 */
export function familyAfterMaterial(before: string, after: string): 'socket' | 'nohub' | 'welded' | null {
  const a = LIBRARY_FAMILY[before] ?? null;
  const b = LIBRARY_FAMILY[after] ?? null;
  return a === b ? null : (b ?? 'welded');
}

export const isLibraryFitting = (id: string): boolean => LIBRARY_FITTINGS.some((f) => f.id === id);

export const TAKEOFF_OPTIONS: TakeoffOption[] = [
  {
    id: 'none',
    family: 'welded',
    label: 'Open end',
    source: 'No fitting — nothing comes off',
    takeout: () => 0,
  },

  // Screwed. The takeout already reaches the end of the pipe, so a joint made
  // up tight adds nothing to it.
  {
    id: 'screwed90',
    family: 'screwed',
    label: '90° elbow or tee',
    source: 'Handbook 4-37 — centre to the end of the pipe, made up tight',
    takeout: (nps) => takeout(nps),
  },
  {
    id: 'screwed45',
    family: 'screwed',
    label: '45° elbow',
    source: 'Handbook 4-39 — centre to the end of the pipe, made up tight',
    takeout: (nps) => takeout45(nps),
  },
  {
    id: 'street90',
    family: 'screwed',
    label: '90° street elbow',
    source: 'Handbook 4-43 — the same as an ordinary elbow',
    takeout: (nps) => streetTakeout90(nps),
  },
  {
    id: 'street45',
    family: 'screwed',
    label: '45° street elbow',
    source: 'Handbook 4-43 — its own casting, made to 2 inch',
    takeout: (nps) => streetTakeout45(nps),
  },
  {
    id: 'union',
    family: 'screwed',
    label: 'Tee or elbow union',
    source: 'Handbook 4-45 — centre to the end of the pipe',
    takeout: (nps) => union(nps)?.takeout ?? NaN,
  },

  // Butt welded.
  {
    id: 'weld90',
    family: 'welded',
    label: '90° elbow',
    source: 'Handbook 2-42 — one and a half times the size long radius, the size itself short',
    takeout: (nps, o) => elbowTakeout(nps, o.radius, 90).value,
  },
  {
    id: 'weld45',
    family: 'welded',
    label: '45° elbow',
    source: 'Handbook 2-42 — five eighths of the size from four inch up',
    // Below four inch the printed figures are nothing like five eighths of the
    // size — the one inch is forty per cent over it — so a size the page does
    // not carry has nothing safe to extrapolate from and gives no answer. The
    // page has no short radius column, and a short radius 45 is a bend.
    takeout: (nps, o) => (o.radius === 'LR' ? elbow45(nps) : bendTakeoff(nps, 'SR', 45)),
  },
  {
    id: 'bend45',
    family: 'welded',
    label: '45° bend in the pipe',
    source: 'One and a half diameters times the tangent of half the angle — a bend, not a fitting',
    takeout: (nps, o) => bendTakeoff(nps, o.radius, 45),
  },
  {
    id: 'bend90',
    family: 'welded',
    label: '90° bend in the pipe',
    source: 'One and a half diameters times the tangent of half the angle — a bend, not a fitting',
    takeout: (nps, o) => bendTakeoff(nps, o.radius, 90),
  },
  {
    id: 'weldTee',
    family: 'welded',
    label: 'Tee, run or outlet',
    source: 'Handbook 2-43 — centre to end',
    // The straight tee page starts at three quarter inch; the reducing tee
    // pages carry the half inch run.
    takeout: (nps) => {
      const t = weldTee(nps);
      return Number.isFinite(t) ? t : reducingWeldTeeRun(nps);
    },
  },
  {
    id: 'weldCap',
    family: 'welded',
    label: 'Cap',
    source: 'Handbook 2-53 — what it adds to the end',
    takeout: (nps) => weldCap(nps),
  },
  {
    id: 'stubEnd',
    family: 'welded',
    label: 'Lap joint stub end',
    source: 'Handbook 2-52 — overall length',
    takeout: (nps) => stubEnd(nps)?.length ?? NaN,
  },

  // Flanged.
  {
    id: 'weldNeck',
    family: 'flanged',
    label: 'Weld neck flange',
    source: 'Handbook 4-68, 4-69 — length through the hub',
    takeout: (nps, o) => weldingNeck(nps, o.flangeClass),
  },
  {
    id: 'flanged90',
    family: 'flanged',
    label: '90° elbow, tee or cross',
    source: 'Handbook 4-71 onward — centre to face',
    takeout: (nps, o) => flangedCenterToFace(nps, o.flangeClass, 'a'),
  },
  {
    id: 'flangedLR',
    family: 'flanged',
    label: 'Long radius elbow',
    source: 'Handbook 4-71, 4-77 — centre to face, 150 and 300 lb only',
    takeout: (nps, o) => flangedCenterToFace(nps, o.flangeClass, 'b'),
  },
  {
    id: 'flanged45',
    family: 'flanged',
    label: '45° elbow',
    source: 'Handbook 4-71 onward — centre to face',
    takeout: (nps, o) => flangedCenterToFace(nps, o.flangeClass, 'c'),
  },

  // Soldered.
  {
    id: 'solder90',
    family: 'soldered',
    label: '90° elbow or tee',
    source: 'Handbook 3-6 — centre to the bottom of the socket',
    takeout: (nps) => solderTakeout(nps, 'elbow90'),
  },
  {
    id: 'solder45',
    family: 'soldered',
    label: '45° elbow',
    source: 'Handbook 3-7 — centre to the bottom of the socket',
    takeout: (nps) => solderTakeout(nps, 'elbow45'),
  },
  {
    id: 'solderStreet90',
    family: 'soldered',
    label: '90° street elbow',
    source: 'Handbook 3-6 — an eighth over a plain elbow',
    takeout: (nps) => solderTakeout(nps, 'street90'),
  },

  // Socket (PVC, CPVC) and no-hub: the maker's figures, from the fitting library.
  ...LIBRARY_FITTINGS.map(
    (f): TakeoffOption => ({
      id: f.id,
      family: f.family,
      label: f.label,
      source: f.family === 'socket' ? 'Your fitting library — centre to the bottom of the socket' : 'Your fitting library — centre to the end of the fitting',
      takeout: (nps, o) => o.library?.(f.id, nps) ?? NaN,
    }),
  ),

  {
    id: 'custom',
    family: 'welded',
    label: 'Custom',
    source: 'Your measured dimension',
    takeout: (_nps, o) => (Number.isFinite(o.custom) ? o.custom : 0),
  },
];

const BY_ID = new Map(TAKEOFF_OPTIONS.map((o) => [o.id, o]));

export const takeoffOption = (id: string): TakeoffOption | undefined => BY_ID.get(id);

/** The fittings offered for a way of joining pipe. */
export const optionsForFamily = (family: JointKind): TakeoffOption[] =>
  TAKEOFF_OPTIONS.filter((o) => o.family === family || o.id === 'none' || o.id === 'custom');

/** Inches off a centre to centre dimension for one end. */
export function endTakeout(id: string, nps: number, opts: TakeoffOptions): number {
  const o = BY_ID.get(id);
  return o ? o.takeout(nps, opts) : NaN;
}

/** Whether a gap is left at this end, and so comes off the cut as well. */
export function endHasGap(id: string): boolean {
  const o = BY_ID.get(id);
  if (!o || o.id === 'none') return false;
  return TAKEOFF_FAMILIES.find((f) => f.id === o.family)?.hasGap ?? false;
}

/** The sizes a fitting is actually made in, so a picker can say so. */
export function sizesFor(id: string, sizes: number[], opts: TakeoffOptions): number[] {
  return sizes.filter((nps) => Number.isFinite(endTakeout(id, nps, opts)));
}
