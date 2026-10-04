// Measuring with the camera
// -------------------------
// The phone's AR tracking hands back points in metres, in a space whose y
// axis points straight up (against gravity) and whose x and z lie level. That
// is the one fact that makes it useful to a fitter: rise is y, and run is the
// level distance in x and z, so a run, a rise, a slope and an offset all fall
// out of plain subtraction.
//
// Nothing here knows about the camera. It takes the points that were marked
// and says what they measure, the same way the offset screens take what was
// typed. The figures are only as good as the marks: phone AR is good to a
// centimetre or two on a textured surface at arm's length, worse on bare
// steel, a white wall or across a room. The screen says so; this does the sums.

export type V3 = readonly [number, number, number];

/** Metres to inches, exactly. */
export const M_TO_IN = 1 / 0.0254;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const level = (d: V3) => Math.hypot(d[0], d[2]);

/** One measured leg, in inches and degrees. */
export type Leg = {
  /** Straight-line distance: the travel. */
  length: number;
  /** Level distance. */
  run: number;
  /** Up is positive. */
  rise: number;
  /** Degrees above level; negative falls. */
  slope: number;
  /** Fall per foot of run, inches; positive falls. Null for a plumb leg. */
  fallPerFt: number | null;
};

/** A leg too close to plumb to carry a direction: an inch of level run. */
const PLUMB_RUN = 1;

export function leg(a: V3, b: V3): Leg {
  const d = sub(b, a);
  const run = level(d) * M_TO_IN;
  const rise = d[1] * M_TO_IN;
  return {
    length: Math.hypot(run, rise),
    run,
    rise,
    slope: (Math.atan2(rise, run) * 180) / Math.PI,
    fallPerFt: run >= PLUMB_RUN ? (-rise / run) * 12 : null,
  };
}

/**
 * Where a leg goes, measured against the run before it: along that run
 * (advance), across it on the level (roll, right of the run positive), and
 * up (rise). The true offset is the roll and the rise together — what a
 * rolling offset solves.
 */
export type Offset = { advance: number; roll: number; rise: number; trueOffset: number };

export function offsetFrom(runFrom: V3, runTo: V3, a: V3, b: V3): Offset | null {
  const r = sub(runTo, runFrom);
  const len = level(r);
  if (len * M_TO_IN < PLUMB_RUN) return null;
  const ux = r[0] / len;
  const uz = r[2] / len;
  const d = sub(b, a);
  const advance = (d[0] * ux + d[2] * uz) * M_TO_IN;
  // Right of the run, looking along it with y up, is run × up = (−uz, 0, ux).
  const roll = (-d[0] * uz + d[2] * ux) * M_TO_IN;
  const rise = d[1] * M_TO_IN;
  return { advance, roll, rise, trueOffset: Math.hypot(roll, rise) };
}

export type Traced = {
  legs: Leg[];
  /** For each leg after the first, where it goes against the leg before; null when that leg is plumb. */
  offsets: (Offset | null)[];
  /** Sum of the travels. */
  total: number;
};

export function trace(points: readonly V3[]): Traced {
  const legs: Leg[] = [];
  const offsets: (Offset | null)[] = [];
  for (let i = 1; i < points.length; i++) {
    legs.push(leg(points[i - 1]!, points[i]!));
    if (i >= 2) offsets.push(offsetFrom(points[i - 2]!, points[i - 1]!, points[i - 1]!, points[i]!));
  }
  return { legs, offsets, total: legs.reduce((s, l) => s + l.length, 0) };
}

/**
 * The steady point under the ring: the per-axis median of the last few hit
 * results. One frame's hit jumps by a centimetre or more on a pipe; the median
 * of a handful does not, and one wild frame cannot move it.
 */
export function steadyPoint(samples: readonly V3[]): V3 | null {
  if (!samples.length) return null;
  const mid = (k: 0 | 1 | 2) => {
    const v = samples.map((p) => p[k]).sort((a, b) => a - b);
    const n = v.length;
    return n % 2 ? v[(n - 1) / 2]! : (v[n / 2 - 1]! + v[n / 2]!) / 2;
  };
  return [mid(0), mid(1), mid(2)];
}

/** How far, in metres, the furthest sample sits from the steady point: the ring's wobble. */
export function wobble(samples: readonly V3[], centre: V3): number {
  return samples.reduce((m, p) => Math.max(m, Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2])), 0);
}

/** What one marked point can be off by on a phone, in metres: a centimetre at arm's length on a textured surface. */
export const POINT_ERROR_M = 0.01;

/**
 * How many degrees a leg's slope can be off by, given that each end can be
 * off by POINT_ERROR_M up or down. It is the honest band on the figure: 0.3°
 * over three metres of run, 1.6° over half a metre, which is why a short leg
 * never quite reads level and the level tool, laid on the pipe, is the one to
 * trust for fall.
 */
export function slopeBand(runInches: number): number {
  const runM = Math.abs(runInches) / M_TO_IN;
  return runM > 0 ? (Math.atan2(Math.SQRT2 * POINT_ERROR_M, runM) * 180) / Math.PI : 90;
}

/**
 * A point in the world to a point on the screen, or null when it is behind
 * the camera. `projection` and `view` are WebXR's column-major 4×4 matrices
 * (the view being the camera transform's inverse).
 */
export function project(p: V3, projection: ArrayLike<number>, view: ArrayLike<number>, width: number, height: number): [number, number] | null {
  const m = (M: ArrayLike<number>, v: readonly number[]) =>
    [0, 1, 2, 3].map((r) => M[r]! * v[0]! + M[4 + r]! * v[1]! + M[8 + r]! * v[2]! + M[12 + r]! * v[3]!);
  const c = m(projection, m(view, [p[0], p[1], p[2], 1]));
  const w = c[3]!;
  if (w <= 1e-6) return null;
  return [((c[0]! / w + 1) / 2) * width, ((1 - c[1]! / w) / 2) * height];
}
