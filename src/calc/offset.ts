import { ElbowRadius, Schedule, backArc, centerlineArc, findSize, spoolWeight, throatArc } from './pipe';
import { weldedElbow, type ElbowPick } from './offsetFitting';
import { offsetAngleError, offsetAngleFromRun, offsetRun } from './angle';

export type OffsetInput = {
  offset: number;
  run?: number;
  fittingAngle: number;
  gap: number;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  /** What an elbow takes out at an angle, by the job's joint (offsetFitting.ts). A butt weld elbow when not given. */
  elbow?: (angleDeg: number) => ElbowPick;
  lockRun: boolean;
};

export type OffsetResult = {
  valid: boolean;
  error?: string;
  offset: number;
  run: number;
  travel: number;
  shrink: number;
  cutAngle: number;
  pipeCut: number;
  setback: number;
  /** The setback is the handbook's figure for a bought elbow (90° and 45°), not one worked from the bend radius for an elbow cut to the angle. */
  setbackFromTable: boolean;
  /** Where the setback came from, as the screen says it: "Handbook 2-42", "Your fitting library: 45° elbow". */
  setbackNote: string;
  /** The fitting library entry the cut is waiting on, when the line holds no figure for it yet. */
  needsLibrary: string | null;
  centerlineArc: number;
  throatArc: number;
  backArc: number;
  spoolPipe: number;
  spoolElbows: number;
  spoolWelds: number;
  spoolTotal: number;
};

const EMPTY: OffsetResult = {
  valid: false,
  offset: NaN,
  run: NaN,
  travel: NaN,
  shrink: NaN,
  cutAngle: NaN,
  pipeCut: NaN,
  setback: NaN,
  setbackFromTable: false,
  setbackNote: '',
  needsLibrary: null,
  centerlineArc: NaN,
  throatArc: NaN,
  backArc: NaN,
  spoolPipe: NaN,
  spoolElbows: NaN,
  spoolWelds: NaN,
  spoolTotal: NaN,
};

export function solveOffset(input: OffsetInput): OffsetResult {
  const { offset, gap, nps, kind, schedule } = input;
  if (!Number.isFinite(offset) || offset <= 0) return { ...EMPTY, error: 'Enter an offset greater than zero.' };

  let cutAngle = input.fittingAngle;
  let run: number;

  if (input.lockRun) {
    const locked = input.run ?? NaN;
    // A run of zero is the square jog: two 90s with a piece between them.
    if (!Number.isFinite(locked) || locked < 0) return { ...EMPTY, error: 'Enter a run of zero or more.' };
    run = locked;
    cutAngle = offsetAngleFromRun(offset, run);
  } else {
    const bad = offsetAngleError(cutAngle);
    if (bad) return { ...EMPTY, error: bad };
    run = offsetRun(offset, cutAngle);
  }

  const travel = Math.hypot(offset, run);
  const shrink = travel - run;
  // The elbows are bought fittings, so they take out what the handbook (or,
  // for PVC and no-hub, the fitting library) says that fitting does: a butt
  // weld elbow its own figure at 90° and 45° and the bend radius when cut to
  // any other angle. The same figures Cut Length and the calculator use. (A
  // pipe that is bent, not jointed, is the Pipe bend tool's.)
  const elbow = (input.elbow ?? weldedElbow(nps, kind))(cutAngle);
  if (!elbow.ok) return { ...EMPTY, offset, run, travel, shrink, cutAngle, error: elbow.error, needsLibrary: elbow.fitting ?? null };
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
    offset,
    run,
    travel,
    shrink,
    cutAngle,
    pipeCut,
    setback,
    setbackFromTable: elbow.fromTable,
    setbackNote: elbow.note,
    needsLibrary: null,
    centerlineArc: centerlineArc(nps, kind, cutAngle),
    throatArc: throatArc(nps, kind, cutAngle, size.od),
    backArc: backArc(nps, kind, cutAngle, size.od),
    spoolPipe: spool.pipe,
    spoolElbows: spool.elbows,
    spoolWelds: spool.welds,
    spoolTotal: spool.total,
  };
}
