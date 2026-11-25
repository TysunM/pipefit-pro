import { ElbowRadius, Schedule, backArc, centerlineArc, findSize, spoolWeight, throatArc } from './pipe';
import { weldedElbow, type ElbowPick } from './offsetFitting';
import { offsetAngleError, offsetAngleFromRun, offsetRun } from './angle';
import { deg } from './units';

export type RollingInput = {
  rise: number;
  roll: number;
  run?: number;
  fittingAngle?: number;
  useFittingAngle: boolean;
  gap: number;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  /** What an elbow takes out at an angle, by the job's joint (offsetFitting.ts). A butt weld elbow when not given. */
  elbow?: (angleDeg: number) => ElbowPick;
};

export type RollingResult = {
  valid: boolean;
  error?: string;
  trueOffset: number;
  run: number;
  travel: number;
  rollAngle: number;
  cutAngle: number;
  pipeCut: number;
  setback: number;
  /** The setback is the handbook's figure for a bought elbow (90° and 45°), not one worked from the bend radius for an elbow cut to the angle. */
  setbackFromTable: boolean;
  /** Where the setback came from, as the screen says it: "Handbook 2-42", "Your fitting library: 45° elbow". */
  setbackNote: string;
  /** The fitting library entry the cut is waiting on, when the line holds no figure for it yet. */
  needsLibrary: string | null;
  shrink: number;
  centerlineArc: number;
  throatArc: number;
  backArc: number;
  spoolPipe: number;
  spoolElbows: number;
  spoolWelds: number;
  spoolTotal: number;
};

const EMPTY: RollingResult = {
  valid: false,
  trueOffset: NaN,
  run: NaN,
  travel: NaN,
  rollAngle: NaN,
  cutAngle: NaN,
  pipeCut: NaN,
  setback: NaN,
  setbackFromTable: false,
  setbackNote: '',
  needsLibrary: null,
  shrink: NaN,
  centerlineArc: NaN,
  throatArc: NaN,
  backArc: NaN,
  spoolPipe: NaN,
  spoolElbows: NaN,
  spoolWelds: NaN,
  spoolTotal: NaN,
};

export function solveRolling(input: RollingInput): RollingResult {
  const { rise, roll, gap, nps, kind, schedule } = input;
  if (!Number.isFinite(rise) || !Number.isFinite(roll)) return { ...EMPTY, error: 'Enter both rise and roll.' };

  const trueOffset = Math.hypot(rise, roll);
  if (trueOffset <= 0) return { ...EMPTY, error: 'Rise and roll cannot both be zero.' };

  const rollAngle = deg(Math.atan2(Math.abs(roll), Math.abs(rise)));

  let run: number;
  let cutAngle: number;

  if (input.useFittingAngle) {
    cutAngle = input.fittingAngle ?? NaN;
    const bad = offsetAngleError(cutAngle);
    if (bad) return { ...EMPTY, error: bad };
    run = offsetRun(trueOffset, cutAngle);
  } else {
    run = input.run ?? NaN;
    // A run of zero is the square jog: two 90s with a piece between them.
    if (!Number.isFinite(run) || run < 0) return { ...EMPTY, error: 'Enter a run of zero or more.' };
    cutAngle = offsetAngleFromRun(trueOffset, run);
  }

  const travel = Math.hypot(run, trueOffset);
  // The elbows are bought fittings, so they take out what the handbook (or,
  // for PVC and no-hub, the fitting library) says that fitting does: a butt
  // weld elbow its own figure at 90° and 45° and the bend radius when cut to
  // any other angle. The same figures Cut Length and the calculator use. (A
  // pipe that is bent, not jointed, is the Pipe bend tool's.)
  const elbow = (input.elbow ?? weldedElbow(nps, kind))(cutAngle);
  if (!elbow.ok) return { ...EMPTY, trueOffset, run, travel, rollAngle, cutAngle, error: elbow.error, needsLibrary: elbow.fitting ?? null };
  const setback = elbow.value;
  const pipeCut = travel - 2 * setback - 2 * (Number.isFinite(gap) ? gap : 0);
  const size = findSize(nps);
  const spool = spoolWeight({
    cutLength: pipeCut,
    nps,
    schedule,
    kind,
    elbowAngle: cutAngle,
    elbowCount: 2,
    weldCount: 2,
  });

  return {
    valid: pipeCut > 0,
    error: pipeCut > 0 ? undefined : 'Fitting takeoffs exceed travel — no pipe between elbows.',
    trueOffset,
    run,
    travel,
    rollAngle,
    cutAngle,
    pipeCut,
    setback,
    setbackFromTable: elbow.fromTable,
    setbackNote: elbow.note,
    needsLibrary: null,
    shrink: travel - run,
    centerlineArc: centerlineArc(nps, kind, cutAngle),
    throatArc: throatArc(nps, kind, cutAngle, size.od),
    backArc: backArc(nps, kind, cutAngle, size.od),
    spoolPipe: spool.pipe,
    spoolElbows: spool.elbows,
    spoolWelds: spool.welds,
    spoolTotal: spool.total,
  };
}
