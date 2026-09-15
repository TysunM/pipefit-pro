import { ElbowRadius, findSize, pipeWeight, Schedule } from './pipe';
import { FlangeClass } from './flangedFitting';
import {
  DEFAULT_TAKEOFF_OPTIONS,
  JointKind,
  TAKEOFF_FAMILIES,
  TAKEOFF_OPTIONS,
  TakeoffOptions,
  endHasGap,
  endTakeout,
  takeoffOption,
} from './takeoffCatalog';

// Turning a centre to centre dimension into a pipe cut.
//
// Every takeout comes from `takeoffCatalog`, which reads the handbook tables
// in this project. Nothing is held here twice.

export type EndFitting = string;

export const END_FITTINGS: { id: EndFitting; label: string; family: JointKind }[] =
  TAKEOFF_OPTIONS.map((o) => ({ id: o.id, label: o.label, family: o.family }));

export const FITTING_SOURCE: Record<string, string> = Object.fromEntries(
  TAKEOFF_OPTIONS.map((o) => [o.id, o.source])
);

export { TAKEOFF_FAMILIES, endHasGap };

/**
 * Inches off a centre to centre dimension for one end.
 *
 * The older four argument form is kept: it covers the welded fittings and the
 * two weld neck flanges, which is what this screen offered before the rest of
 * the handbook was in.
 */
export function endTakeoff(
  fitting: EndFitting,
  nps: number,
  kind: ElbowRadius,
  custom: number,
  flangeClass: FlangeClass = '150'
): number {
  const opts: TakeoffOptions = { radius: kind, flangeClass, custom };
  // The two legacy flange ids carry their own class.
  if (fitting === 'flange150') return endTakeout('weldNeck', nps, { ...opts, flangeClass: '150' });
  if (fitting === 'flange300') return endTakeout('weldNeck', nps, { ...opts, flangeClass: '300' });
  const legacy: Record<string, string> = {
    elbow90: 'weld90',
    elbow45: 'weld45',
    tee: 'weldTee',
  };
  return endTakeout(legacy[fitting] ?? fitting, nps, opts);
}

export type CutLengthInput = {
  centerToCenter: number;
  endA: EndFitting;
  endB: EndFitting;
  customA: number;
  customB: number;
  gap: number;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  flangeClass?: FlangeClass;
};

export type CutLengthResult = {
  valid: boolean;
  error?: string;
  takeoffA: number;
  takeoffB: number;
  /** How many ends leave a gap that comes off the cut as well. */
  gapEnds: number;
  totalDeduction: number;
  pipeCut: number;
  weight: number;
};

const LEGACY_GAP = new Set(['elbow90', 'elbow45', 'tee', 'flange150', 'flange300', 'custom']);
const leavesGap = (id: EndFitting): boolean =>
  takeoffOption(id) ? endHasGap(id) : LEGACY_GAP.has(id);

export function solveCutLength(input: CutLengthInput): CutLengthResult {
  const { centerToCenter, gap, nps, kind, schedule } = input;
  const flangeClass = input.flangeClass ?? DEFAULT_TAKEOFF_OPTIONS.flangeClass;

  const takeoffA = endTakeoff(input.endA, nps, kind, input.customA, flangeClass);
  const takeoffB = endTakeoff(input.endB, nps, kind, input.customB, flangeClass);
  const gapValue = Number.isFinite(gap) ? gap : 0;

  // A screwed or soldered end leaves no gap: the takeout already reaches the
  // end of the pipe. Only welded and flanged ends add one.
  const gapEnds = (leavesGap(input.endA) ? 1 : 0) + (leavesGap(input.endB) ? 1 : 0);
  const totalDeduction = takeoffA + takeoffB + gapValue * gapEnds;
  const base = { takeoffA, takeoffB, gapEnds, totalDeduction };

  if (!Number.isFinite(takeoffA) || !Number.isFinite(takeoffB)) {
    return {
      valid: false,
      error:
        'That fitting is not made in this size — pick another, or use Custom and enter the measured takeout.',
      ...base,
      pipeCut: NaN,
      weight: NaN,
    };
  }

  if (!Number.isFinite(centerToCenter) || centerToCenter <= 0) {
    return { valid: false, error: 'Enter a centre-to-centre dimension.', ...base, pipeCut: NaN, weight: NaN };
  }

  const pipeCut = centerToCenter - totalDeduction;
  const size = findSize(nps);
  return {
    valid: pipeCut > 0,
    error: pipeCut > 0 ? undefined : 'Deductions exceed the centre-to-centre dimension.',
    ...base,
    pipeCut,
    weight: pipeWeight(pipeCut, size.od, size.wall[schedule]),
  };
}
