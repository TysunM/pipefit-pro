import { findSize, Schedule } from './pipe';
import { rad } from './units';

export type MiterInput = {
  totalAngle: number;
  segments: number;
  nps: number;
  schedule: Schedule;
  centerlineRadius: number;
};

export type MiterResult = {
  valid: boolean;
  error?: string;
  cutAngle: number;
  cuts: number;
  endSegmentAngle: number;
  midSegmentAngle: number;
  cutbackMax: number;
  throatLength: number;
  backLength: number;
  centerlineArc: number;
  codeWarning?: string;
};

export function solveMiter(input: MiterInput): MiterResult {
  const { totalAngle, segments, nps, centerlineRadius } = input;
  const empty: MiterResult = {
    valid: false,
    cutAngle: NaN,
    cuts: NaN,
    endSegmentAngle: NaN,
    midSegmentAngle: NaN,
    cutbackMax: NaN,
    throatLength: NaN,
    backLength: NaN,
    centerlineArc: NaN,
  };

  if (!(totalAngle > 0 && totalAngle <= 90)) return { ...empty, error: 'Total bend angle must be between 0° and 90°.' };
  if (!Number.isInteger(segments) || segments < 2) return { ...empty, error: 'Use at least two segments.' };
  if (!Number.isFinite(centerlineRadius) || centerlineRadius <= 0)
    return { ...empty, error: 'Enter a centreline radius greater than zero.' };

  const size = findSize(nps);
  const cuts = segments - 1;
  const cutAngle = totalAngle / (2 * cuts);
  const endSegmentAngle = cutAngle;
  const midSegmentAngle = cutAngle * 2;

  if (centerlineRadius <= size.od / 2) return { ...empty, error: 'Centreline radius must exceed half the pipe OD.' };

  const throatLength = 2 * (centerlineRadius - size.od / 2) * Math.tan(rad(cutAngle));
  const backLength = 2 * (centerlineRadius + size.od / 2) * Math.tan(rad(cutAngle));
  const cutbackMax = (size.od / 2) * Math.tan(rad(cutAngle)) * 2;

  const codeWarning =
    cutAngle > 22.5
      ? 'Cut angle exceeds 22.5°. ASME B31.3 §304.2.3 requires design verification for miter angles above 22.5°.'
      : cuts < 2 && totalAngle > 45
        ? 'A single-cut miter above 45° is a widely-spaced miter — verify against ASME B31.3 §304.2.3 before fabrication.'
        : undefined;

  return {
    valid: true,
    cutAngle,
    cuts,
    endSegmentAngle,
    midSegmentAngle,
    cutbackMax,
    throatLength,
    backLength,
    centerlineArc: centerlineRadius * rad(totalAngle),
    codeWarning,
  };
}
