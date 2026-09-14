import { rad } from './units';

/**
 * Offset angles.
 *
 * An offset is worked from the angle the fittings turn through, anywhere above
 * zero up to and including a square 90. At 90 the pipe goes straight across and
 * advances nothing: two 90s and a piece between them, which after 45 is the
 * most used offset on the job.
 *
 * Past 90 the travel points back the way it came and the run comes out
 * negative. That is a different piece of work, not an offset, so it is refused
 * with the reason rather than clamped to something the fitter did not ask for.
 */

/** True for an angle an offset can be worked at. */
export function isOffsetAngle(a: number): boolean {
  return Number.isFinite(a) && a > 0 && a <= 90;
}

/** Why an angle was refused, or undefined when it is fine. */
export function offsetAngleError(a: number, label = 'Fitting angle'): string | undefined {
  if (!Number.isFinite(a) || a <= 0) return 'Enter an angle greater than zero.';
  if (a > 90) return `${label} past 90° turns the run back on itself. Use 90° or less.`;
  return undefined;
}

/**
 * How far an offset advances along the original line.
 *
 * `tan(90°)` is 1.6e16 in floating point rather than infinite, so dividing by
 * it gives 3.7e-16 instead of a clean zero. A square turn advances nothing, and
 * it is written that way so the run reads 0 and not 0.0000000000000004.
 */
export function offsetRun(offset: number, angleDeg: number): number {
  if (Math.abs(angleDeg - 90) < 1e-9) return 0;
  return offset / Math.tan(rad(angleDeg));
}

/** The angle an offset makes when its run is fixed. A run of zero is square. */
export function offsetAngleFromRun(offset: number, run: number): number {
  if (run <= 0) return 90;
  return (Math.atan(offset / run) * 180) / Math.PI;
}
