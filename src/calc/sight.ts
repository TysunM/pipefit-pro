// Sighting a leg instead of guessing at it
// ----------------------------------------
// Point the phone along the pipe and the leg's direction is read off the
// sensors. What comes back is a bearing and a slope — exactly what a leg is
// already made of — so a sighted leg is not a special kind of leg, it is a
// leg somebody did not have to type.
//
// What this does not do is measure how long anything is. That was asked for
// and it is the one thing the hardware cannot honestly give: the published
// figures for phone AR distance run from one per cent to seven and a half,
// which on a ten foot run is between an inch and nine inches, against a cut
// tolerance of a sixteenth. A number that looks certain and is four inches
// out is worse than no number, because a tape gets pulled either way and only
// one of the two costs a stick of pipe.
//
// Direction is a different instrument. Slope is read off gravity, which is
// not affected by light, by shiny galvanised pipe, by a dark plant, or by all
// the steel in a rack — the three things that wreck a camera's idea of where
// it is. Bearing is read off the earth's magnetic field, which is affected by
// steel, badly. So the two are not treated as one number:
//
//   * slope is reported and trusted,
//   * bearing is reported with the field strength that produced it, and the
//     screen says plainly when that field is not the earth's.
//
// Which is the whole design. The instrument that works is used, the one that
// does not is not hidden, and the length still comes off a tape.

import { LegDir, dirOf } from './direction';
import { Vec3, len, unit } from './spool';

/**
 * A device's orientation as the sensors give it, in radians.
 *
 * The three angles of the browser and Expo convention: `alpha` about the
 * vertical, `beta` front to back, `gamma` side to side.
 */
export type Orientation = { alpha: number; beta: number; gamma: number };

/**
 * Which way the phone is being held against the pipe.
 *
 * `edge` is the phone laid along the run — its top edge pointing the way the
 * pipe goes. It is the accurate one, because the pipe itself holds the phone
 * still; a hand does not.
 *
 * `sight` is the back camera aimed down the run, the way you would photograph
 * along it. Less steady, and the only one available for pipe that is over
 * your head or behind a rack.
 */
export type Hold = 'edge' | 'sight';

/** The device axis each hold points along: the top edge, or out of the back. */
const AXIS: Record<Hold, Vec3> = {
  edge: { x: 0, y: 1, z: 0 },
  sight: { x: 0, y: 0, z: -1 },
};

/**
 * The rotation that carries device coordinates into the world's.
 *
 * Z then X then Y, intrinsic, which is the order the angles are defined in.
 * The world it lands in is the sensors' own: x east, y north, z up.
 */
export function deviceToWorld(o: Orientation): number[][] {
  const cA = Math.cos(o.alpha);
  const sA = Math.sin(o.alpha);
  const cB = Math.cos(o.beta);
  const sB = Math.sin(o.beta);
  const cG = Math.cos(o.gamma);
  const sG = Math.sin(o.gamma);
  return [
    [cA * cG - sA * sB * sG, -sA * cB, cA * sG + sA * sB * cG],
    [sA * cG + cA * sB * sG, cA * cB, sA * sG - cA * sB * cG],
    [-cB * sG, sB, cB * cG],
  ];
}

/**
 * The way the pipe runs, in the drawing's own axes.
 *
 * The sensors put north on y and up on z; the spool engine puts up on y and
 * north on z. Converting here rather than anywhere else means every other
 * file keeps one idea of which way is up.
 */
export function sightVector(o: Orientation, hold: Hold): Vec3 {
  const R = deviceToWorld(o);
  const a = AXIS[hold];
  const east = R[0]![0]! * a.x + R[0]![1]! * a.y + R[0]![2]! * a.z;
  const north = R[1]![0]! * a.x + R[1]![1]! * a.y + R[1]![2]! * a.z;
  const up = R[2]![0]! * a.x + R[2]![1]! * a.y + R[2]![2]! * a.z;
  return { x: east, y: up, z: north };
}

/** The bearing and slope of a single reading. */
export function sightDir(o: Orientation, hold: Hold): LegDir {
  return dirOf(sightVector(o, hold));
}

// Steadiness, and what it is worth
// --------------------------------
// One reading is a hand at one instant. A burst of them, averaged, is the
// direction; how far they spread is how still the hand was. Both are worth
// having: the average is the answer and the spread is whether to believe it.

export type Steadiness = {
  /** The averaged direction. */
  dir: LegDir;
  /** The widest a single reading strayed from it, in degrees. */
  spreadDeg: number;
  /** How many readings went into it. */
  samples: number;
};

/** Degrees between two directions. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const la = len(a);
  const lb = len(b);
  if (la < 1e-12 || lb < 1e-12) return 0;
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/**
 * A burst of readings boiled down to one direction and how much it wandered.
 *
 * Averaged as vectors rather than as angles, because angles wrap: a hand
 * wobbling either side of due north reads 359 and 1, and their mean is south.
 */
export function steadyDir(readings: readonly { o: Orientation; hold: Hold }[]): Steadiness | null {
  if (!readings.length) return null;
  const vs = readings.map((r) => unit(sightVector(r.o, r.hold)));
  const sum = vs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y, z: a.z + v.z }), { x: 0, y: 0, z: 0 });
  if (len(sum) < 1e-9) return null;
  const mean = unit(sum);
  const spreadDeg = vs.reduce((m, v) => Math.max(m, angleBetween(mean, v)), 0);
  return { dir: dirOf(mean), spreadDeg, samples: vs.length };
}

/** Steadier than this and the reading is as good as the instrument. */
export const STEADY_DEG = 2;

// Whether the compass is reading the earth or the rack
// ----------------------------------------------------
// The earth's field runs between about 25 and 65 microtesla depending where
// you stand. Structural steel and a rack of pipe distort it, and a phone has
// no way to tell a distorted field from a real one — it just reports a
// heading, confidently, that can be tens of degrees out.
//
// It can tell you the strength though, and a strength outside the earth's
// range is proof that something else is in the way. That is not a complete
// test: steel can distort the direction while leaving the strength inside the
// band. So this is never used to promise a bearing is right, only to say when
// it is certainly wrong.

/** The earth's own field, in microtesla, at the extremes of the surface. */
export const EARTH_FIELD = { min: 25, max: 65 } as const;

export type FieldCheck = {
  /** The measured strength, microtesla. */
  strength: number;
  /** True when the strength alone proves something other than the earth. */
  disturbed: boolean;
  /** What to say about it. */
  note: string;
};

/** What the magnetometer's reading says about whether a bearing can be trusted. */
export function checkField(m: Vec3): FieldCheck {
  const strength = len(m);
  if (strength < EARTH_FIELD.min)
    return {
      strength,
      disturbed: true,
      note: 'Field too weak for the earth’s — the bearing here is not reliable. Slope still is.',
    };
  if (strength > EARTH_FIELD.max)
    return {
      strength,
      disturbed: true,
      note: 'Steel near the phone is bending the compass — the bearing is not reliable. Slope still is.',
    };
  return {
    strength,
    disturbed: false,
    note: 'Field reads like the earth’s. Steel can still pull a bearing without changing its strength.',
  };
}

// Saying a slope out loud
// -----------------------
// A level reads a number, but nobody on a job says "one point one nine
// degrees". They say a quarter to the foot, or they say it is level, or they
// say it is falling the wrong way. These two turn the angle into both.

/** Within this of level or plumb, a run is called it. */
export const CLOSE_DEG = 0.5;

/**
 * What a slope is, said the way it would be said on the job.
 *
 * `exact` is the claim that a run is truly level or truly plumb, and it is the
 * one worth being careful with: it lights the screen up and buzzes the phone,
 * so it has to mean within half a degree and nothing looser.
 */
export function levelWord(slope: number): { word: string; exact: boolean } {
  const a = Math.abs(slope);
  if (a < CLOSE_DEG) return { word: 'Level', exact: true };
  if (a > 90 - CLOSE_DEG) return { word: 'Plumb', exact: true };
  if (a < 5) return { word: slope > 0 ? 'Rising, barely' : 'Falling, barely', exact: false };
  return { word: slope > 0 ? 'Rising' : 'Falling', exact: false };
}

/**
 * Fall over a run, the way a drain is specified.
 *
 * A quarter inch to the foot is the rule everybody knows, and it is checked
 * against a spec sheet far more often than an angle is. Tangent rather than a
 * scaled angle, because the two part company well before any slope a line is
 * actually hung at.
 */
export function inchesPerFoot(slope: number): number {
  return Math.tan((slope * Math.PI) / 180) * 12;
}
