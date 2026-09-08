import { ElbowRadius, Schedule, backArc, centerlineArc, findSize, spoolWeight, takeoff, throatArc } from './pipe';
import { deg, rad } from './units';

export type OffsetInput = {
  offset: number;
  run?: number;
  fittingAngle: number;
  gap: number;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
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
    if (!Number.isFinite(locked) || locked <= 0) return { ...EMPTY, error: 'Enter a run greater than zero.' };
    run = locked;
    cutAngle = deg(Math.atan(offset / run));
  } else {
    if (!(cutAngle > 0 && cutAngle < 90)) return { ...EMPTY, error: 'Fitting angle must be between 0° and 90°.' };
    run = offset / Math.tan(rad(cutAngle));
  }

  if (!(cutAngle > 0 && cutAngle < 90)) return { ...EMPTY, error: 'Resulting angle is outside 0°–90°.' };

  const travel = Math.hypot(offset, run);
  const shrink = travel - run;
  const setback = takeoff(nps, kind, cutAngle);
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
    centerlineArc: centerlineArc(nps, kind, cutAngle),
    throatArc: throatArc(nps, kind, cutAngle, size.od),
    backArc: backArc(nps, kind, cutAngle, size.od),
    spoolPipe: spool.pipe,
    spoolElbows: spool.elbows,
    spoolWelds: spool.welds,
    spoolTotal: spool.total,
  };
}
