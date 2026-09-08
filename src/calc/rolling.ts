import { ElbowRadius, Schedule, backArc, centerlineArc, findSize, spoolWeight, takeoff, throatArc } from './pipe';
import { deg, rad } from './units';

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
    if (!(cutAngle > 0 && cutAngle < 90)) return { ...EMPTY, error: 'Fitting angle must be between 0° and 90°.' };
    run = trueOffset / Math.tan(rad(cutAngle));
  } else {
    run = input.run ?? NaN;
    if (!Number.isFinite(run) || run <= 0) return { ...EMPTY, error: 'Enter a run greater than zero.' };
    cutAngle = deg(Math.atan(trueOffset / run));
  }

  const travel = Math.hypot(run, trueOffset);
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
    trueOffset,
    run,
    travel,
    rollAngle,
    cutAngle,
    pipeCut,
    setback,
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
