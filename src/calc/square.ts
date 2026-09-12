import { deg, rad } from './units';

// Framing-square layout. The blade is the long leg, the tongue the short one.
// With the run set on the tongue at 12 inches, the rise read on the blade
// fixes the angle, and the hypotenuse it lays out is the travel of a piping
// offset at that angle.

export const SQUARE_RUN = 12;
export const FULL_PITCH_RISE = 24;

export type SquareSetting = {
  rise: number;
  run: number;
  angle: number;
  pitch: number;
  hypotenuseMultiplier: number;
  hypotenuse: number;
};

export function fromRise(rise: number, run: number = SQUARE_RUN): SquareSetting | undefined {
  if (!Number.isFinite(rise) || !Number.isFinite(run) || run <= 0 || rise < 0) return undefined;
  const angle = deg(Math.atan(rise / run));
  return {
    rise,
    run,
    angle,
    pitch: rise / FULL_PITCH_RISE,
    hypotenuseMultiplier: Math.hypot(rise, run) / run,
    hypotenuse: Math.hypot(rise, run),
  };
}

export function fromAngle(angleDeg: number, run: number = SQUARE_RUN): SquareSetting | undefined {
  if (!Number.isFinite(angleDeg) || angleDeg < 0 || angleDeg >= 90) return undefined;
  if (!Number.isFinite(run) || run <= 0) return undefined;
  return fromRise(run * Math.tan(rad(angleDeg)), run);
}

export function fromPitch(pitch: number, run: number = SQUARE_RUN): SquareSetting | undefined {
  if (!Number.isFinite(pitch) || pitch < 0) return undefined;
  return fromRise(pitch * FULL_PITCH_RISE, run);
}

// The pitch marks printed on a square, eighths of a full pitch.
export const PITCH_MARKS = [1 / 8, 1 / 4, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 7 / 8, 1];
