// Pointing a leg without naming an angle
// --------------------------------------
// A leg is stored as a bearing and a slope, which is how a survey describes a
// direction and how the engine needs it. It is not how anybody points. Asked
// to send a leg up, a fitter does not think "slope ninety, bearing stops
// mattering" — he thinks up, and up is a direction on the drawing in front of
// him.
//
// So this is the other half of direction.ts. That file turned bends and rolls
// into bearings and slopes, because bearings and slopes are sayable. This one
// turns bearings and slopes into the six ways pipe actually runs, because six
// buttons are pressable and two angle fields are not.
//
// Six, not four. A d-pad has four and pipe has six — up, down, and four round
// the compass — and a control that offers four of six does not simplify the
// space, it hides a third of it. Which is the fault being fixed: the app had
// the compass on one row and the slope on another, and a leg that needed to
// go up needed you to know that the second row existed.
//
// The exception is a run held to one plane, where there genuinely are four,
// and then there is room for the four forty fives between them as well. Both
// stock elbows, eight buttons, and every one of them a fitting off the shelf.

import { LegDir, dirOf, dirVector, turnDeg } from './direction';
import { Vec3, cross, dot, len, scale, sub, unit } from './spool';

/** One direction a pad can send a leg, and what to call it. */
export type Axis = {
  id: string;
  /** What it says on the button. */
  label: string;
  /** Where it goes. */
  dir: LegDir;
};

const UP_ID = 'UP';
const DOWN_ID = 'DN';

/** Up and down, which are the same whichever way the drawing faces. */
export const VERTICAL_AXES: readonly Axis[] = [
  { id: UP_ID, label: 'Up', dir: { bearing: 0, slope: 90 } },
  { id: DOWN_ID, label: 'Down', dir: { bearing: 0, slope: -90 } },
];

/** The four round the compass, level. */
export const LEVEL_AXES: readonly Axis[] = [
  { id: 'N', label: 'N', dir: { bearing: 0, slope: 0 } },
  { id: 'E', label: 'E', dir: { bearing: 90, slope: 0 } },
  { id: 'S', label: 'S', dir: { bearing: 180, slope: 0 } },
  { id: 'W', label: 'W', dir: { bearing: 270, slope: 0 } },
];

/** Every way a leg runs square: the six axes of the world. */
export const AXES: readonly Axis[] = [...VERTICAL_AXES, ...LEVEL_AXES];

/** Whether two directions are the same way, to within half a degree of arc. */
export function sameAim(a: LegDir, b: LegDir): boolean {
  return dot(unit(dirVector(a)), unit(dirVector(b))) > Math.cos((0.5 * Math.PI) / 180);
}

/** Which axis a leg is on, or null when it runs between them. */
export function axisOf(d: LegDir, axes: readonly Axis[] = AXES): Axis | null {
  return axes.find((a) => sameAim(a.dir, d)) ?? null;
}

// Holding a run to one plane
// --------------------------
// A plane here is vertical and named by a bearing: the bearing it runs along.
// Everything in it is that bearing, its opposite, straight up, straight down,
// or a forty five between two of those — which is the whole of a flat spool
// and most of a real one.

/** The horizontal unit vector a bearing points along. */
const along = (bearing: number): Vec3 => dirVector({ bearing, slope: 0 });

/** The normal of the vertical plane a bearing runs in. */
export function planeNormal(bearing: number): Vec3 {
  return unit(cross(along(bearing), { x: 0, y: 1, z: 0 }));
}

/**
 * The plane a run is already mostly in: the bearing of its first level leg.
 *
 * A first leg that runs dead vertical has no bearing to give, so the search
 * carries on down the run, and a run that is vertical the whole way gets
 * north — an arbitrary choice, but the same arbitrary choice every time, so
 * flattening twice does not walk the plane round the compass.
 */
export function planeOf(dirs: readonly LegDir[]): number {
  for (const d of dirs) {
    if (Math.abs(d.slope) < 90 - 0.5) return turnDeg(d.bearing);
  }
  return 0;
}

/**
 * A direction pressed flat into a vertical plane.
 *
 * Returns null for a leg running square out of the plane. There is nothing in
 * the plane for it to become — its whole length is the part being removed —
 * and picking a side for it would be inventing a direction nobody asked for.
 * The caller says what to do about that; it is not decided here.
 */
export function flattenDir(d: LegDir, bearing: number): LegDir | null {
  const v = unit(dirVector(d));
  const n = planeNormal(bearing);
  const inPlane = sub(v, scale(n, dot(v, n)));
  if (len(inPlane) < 1e-6) return null;
  return dirOf(unit(inPlane));
}

/**
 * A whole run pressed flat, and how many legs had to be given a direction.
 *
 * A leg square out of the plane is sent along the plane's own bearing rather
 * than dropped, because a spool with a leg missing is not a spool. The count
 * comes back so the screen can say it out loud instead of quietly changing
 * pipe under somebody.
 */
export function flattenDirs(
  dirs: readonly LegDir[],
  bearing: number,
): { dirs: LegDir[]; guessed: number } {
  let guessed = 0;
  const out = dirs.map((d) => {
    const flat = flattenDir(d, bearing);
    if (flat) return flat;
    guessed += 1;
    return { bearing: turnDeg(bearing), slope: 0 };
  });
  return { dirs: out, guessed };
}

/** Whether every leg already lies in the plane, so flattening would change nothing. */
export function isFlat(dirs: readonly LegDir[], bearing: number): boolean {
  const n = planeNormal(bearing);
  return dirs.every((d) => Math.abs(dot(unit(dirVector(d)), n)) < 1e-6);
}

/**
 * The eight ways a leg runs inside one vertical plane.
 *
 * Forward, back, up, down, and the four forty fives between them. Every one is
 * a ninety or a forty five off its neighbours, so every turn the pad can make
 * in this mode comes out of a box.
 */
export function flatAxes(bearing: number): Axis[] {
  const fwd = turnDeg(bearing);
  const back = turnDeg(bearing + 180);
  return [
    { id: 'F', label: 'Fwd', dir: { bearing: fwd, slope: 0 } },
    { id: 'FU', label: '45° up', dir: { bearing: fwd, slope: 45 } },
    { id: UP_ID, label: 'Up', dir: { bearing: fwd, slope: 90 } },
    { id: 'BU', label: '45° up', dir: { bearing: back, slope: 45 } },
    { id: 'B', label: 'Back', dir: { bearing: back, slope: 0 } },
    { id: 'BD', label: '45° down', dir: { bearing: back, slope: -45 } },
    { id: DOWN_ID, label: 'Down', dir: { bearing: fwd, slope: -90 } },
    { id: 'FD', label: '45° down', dir: { bearing: fwd, slope: -45 } },
  ];
}

// Pointing the whole run
// ----------------------
// Swinging a spool round the compass is what `rotateDirs` does, and it is not
// enough: it can send a run north or west but it cannot stand one on end. A
// run aimed up has to turn about a level axis, which no change of bearing
// describes.
//
// So the whole thing is turned rigidly instead — the one rotation that takes
// the first leg onto the direction pressed, applied to every leg. Rigid is the
// point: a rotation preserves every angle between every pair of legs, so the
// bends do not move, so the takeouts do not move, so the cuts do not move. The
// spool faces somewhere else and is otherwise the spool it was.

/** Rodrigues: `v` turned about the unit axis `k` by `angle` radians. */
export function rotateAbout(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: v.x * c + (k.y * v.z - k.z * v.y) * s + k.x * dot(k, v) * (1 - c),
    y: v.y * c + (k.z * v.x - k.x * v.z) * s + k.y * dot(k, v) * (1 - c),
    z: v.z * c + (k.x * v.y - k.y * v.x) * s + k.z * dot(k, v) * (1 - c),
  };
}

/** Any unit vector square to `v`, chosen the same way every time. */
function anyPerpendicular(v: Vec3): Vec3 {
  // Cross with whichever axis `v` leans on least, so the product is never the
  // near-zero vector that would come of crossing with something parallel.
  const away: Vec3 =
    Math.abs(v.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  return unit(cross(v, away));
}

/**
 * The whole run turned so its first leg runs the way asked.
 *
 * Every leg turns by the same rotation, so the shape is untouched and only its
 * attitude changes. A run already pointing that way comes back unchanged; one
 * pointing dead the other way turns half a circle about a square axis, which
 * is a choice — there are infinitely many half turns that do it — but the same
 * choice every time, so pressing the opposite button twice returns the run it
 * started as rather than walking it somewhere new.
 */
export function aimRun(dirs: readonly LegDir[], to: LegDir): LegDir[] {
  if (!dirs.length) return [];
  const from = unit(dirVector(dirs[0]!));
  const target = unit(dirVector(to));
  const c = Math.max(-1, Math.min(1, dot(from, target)));
  if (c > 1 - 1e-12) return dirs.map((d) => ({ ...d }));

  const axis = c < -1 + 1e-12 ? anyPerpendicular(from) : unit(cross(from, target));
  const angle = Math.acos(c);
  return dirs.map((d) => dirOf(rotateAbout(unit(dirVector(d)), axis, angle)));
}
