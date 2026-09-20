// Describing a leg the way a fitter describes it
// ----------------------------------------------
// The geometry engine walks a spool by turning each leg off the one before it:
// a bend angle for how far, a roll angle for which way round the pipe. That is
// the right parameterisation for a machine and the wrong one for a man. Nobody
// on a job says "twenty four inches at ninety degrees rolled two seventy". They
// say "twenty four up", "thirty north", "eighteen up on a forty five to the
// north east".
//
// So a leg is entered as where it goes and how far: a bearing off the compass,
// a slope off level, and a length. The bend and the roll are then worked out
// from consecutive directions rather than typed in, which means:
//
//   * roll never appears in front of anyone, and
//   * a bend is a result you read off the drawing, not a number you guess.
//
// Nothing about the pipe changes. The same bends come out, so the same
// takeouts come out, so the same cuts come out — this is a change of language,
// not of geometry, and the tests hold it to that.

import { Frame, Vec3, advanceFrame, cross, dot, len, scale, sub, unit } from './spool';
import { deg, rad } from './units';

/**
 * Where a leg runs.
 *
 * `bearing` is degrees clockwise off north, the way a compass reads: 0 north,
 * 90 east, 180 south, 270 west. `slope` is degrees off level, up positive, so
 * 0 is a flat run, +90 straight up and -90 straight down.
 */
export type LegDir = { bearing: number; slope: number };

/** A leg as it is entered: where it goes, and how far. */
export type DirLeg = { id: string; length: number; dir: LegDir };

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const NORTH: Vec3 = { x: 0, y: 0, z: 1 };

/** Degrees folded into 0 up to 360. */
export const turnDeg = (a: number): number => ((a % 360) + 360) % 360;

/** Within half a degree, which is finer than anything on a compass rose. */
const TIGHT = 0.5;

/** The world axes the drawing uses: +x east, +y up, +z north. */
export function dirVector(d: LegDir): Vec3 {
  const s = rad(d.slope);
  const b = rad(d.bearing);
  const flat = Math.cos(s);
  return { x: flat * Math.sin(b), y: Math.sin(s), z: flat * Math.cos(b) };
}

/**
 * The bearing and slope of a vector.
 *
 * A leg running dead vertical has no bearing — every bearing points the same
 * way once the slope is ninety — so it reports north, the arbitrary choice the
 * rest of the file is consistent about.
 */
export function dirOf(v: Vec3): LegDir {
  const l = len(v);
  if (l < 1e-12) return { bearing: 0, slope: 0 };
  const slope = deg(Math.asin(Math.max(-1, Math.min(1, v.y / l))));
  const flat = Math.hypot(v.x, v.z);
  if (flat < 1e-9) return { bearing: 0, slope };
  return { bearing: turnDeg(deg(Math.atan2(v.x, v.z))), slope };
}

export const isVertical = (d: LegDir): boolean => Math.abs(d.slope) > 90 - TIGHT;
export const isLevel = (d: LegDir): boolean => Math.abs(d.slope) < TIGHT;

/** The eight points of the rose, as a fitter calls them. */
export const COMPASS: readonly { bearing: number; id: string; label: string }[] = [
  { bearing: 0, id: 'N', label: 'north' },
  { bearing: 45, id: 'NE', label: 'north east' },
  { bearing: 90, id: 'E', label: 'east' },
  { bearing: 135, id: 'SE', label: 'south east' },
  { bearing: 180, id: 'S', label: 'south' },
  { bearing: 225, id: 'SW', label: 'south west' },
  { bearing: 270, id: 'W', label: 'west' },
  { bearing: 315, id: 'NW', label: 'north west' },
];

/** The slopes worth a button: level, the two stock elbow angles, and vertical. */
export const SLOPE_PRESETS: readonly { slope: number; label: string }[] = [
  { slope: 0, label: 'Level' },
  { slope: 45, label: '45° up' },
  { slope: 90, label: 'Straight up' },
  { slope: -45, label: '45° down' },
  { slope: -90, label: 'Straight down' },
];

/** The point of the rose a bearing sits on, or null when it is between two. */
export function compassPoint(bearing: number): (typeof COMPASS)[number] | null {
  const b = turnDeg(bearing);
  return COMPASS.find((c) => Math.abs(((b - c.bearing + 540) % 360) - 180) < TIGHT) ?? null;
}

/** The compass in short form: `NE`, or the bearing itself when it is between points. */
export function bearingLabel(bearing: number): string {
  return compassPoint(bearing)?.id ?? `${turnDeg(bearing).toFixed(0)}°`;
}

const tidy = (n: number): string => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

/**
 * A direction in words.
 *
 * Straight up and straight down are said plainly, a level run is just its
 * compass word, and anything in between is read the way it is said on a job:
 * the slope first, then where it heads.
 */
export function dirLabel(d: LegDir): string {
  if (d.slope > 90 - TIGHT) return 'straight up';
  if (d.slope < TIGHT - 90) return 'straight down';
  const where = compassPoint(d.bearing)?.label ?? `${turnDeg(d.bearing).toFixed(0)}°`;
  if (isLevel(d)) return where;
  return `${tidy(Math.abs(d.slope))}° ${d.slope > 0 ? 'up' : 'down'} to the ${where}`;
}

/** The same, short enough to sit on a drawing: `N`, `UP`, `45°↑ NE`. */
export function dirShort(d: LegDir): string {
  if (d.slope > 90 - TIGHT) return 'UP';
  if (d.slope < TIGHT - 90) return 'DN';
  const where = bearingLabel(d.bearing);
  if (isLevel(d)) return where;
  return `${tidy(Math.abs(d.slope))}°${d.slope > 0 ? '↑' : '↓'} ${where}`;
}

/**
 * The frame a spool starts in, for a first leg that runs a given way.
 *
 * The engine turns each leg off the frame the last one left, so the first leg
 * sets the whole chain. Its normal is the one place there is a free choice,
 * and it is spent on making roll 0 mean up — which is what every later roll is
 * then measured from, and what makes a derived roll readable if it ever has to
 * be shown.
 */
export function startFrame(d: LegDir): Frame {
  const dir = unit(dirVector(d));
  // A leg running dead vertical has no "up" across it, so north stands in.
  const ref = Math.abs(dir.y) > 1 - 1e-9 ? NORTH : UP;
  const n = unit(sub(ref, scale(dir, dot(ref, dir))));
  return { d: dir, n };
}

export type Turn = { bend: number; roll: number };

/**
 * The bend and roll that carry a frame onto a given direction.
 *
 * Rotating the frame's own direction by `bend` about the axis the roll picks
 * lands on `d·cos θ + p·sin θ`, so the direction wanted gives `p` back
 * directly, and the roll is that vector read off in the frame's own normal and
 * binormal. It is solved, not searched: one call, exact to the last place.
 *
 * Returns null for a leg that doubles straight back on the one before it.
 * There is no fitting for that turn and no plane it happens in, so there is
 * nothing honest to return.
 */
export function turnTo(frame: Frame, to: Vec3): Turn | null {
  const v = unit(to);
  if (len(v) < 0.5) return null;
  const c = Math.max(-1, Math.min(1, dot(frame.d, v)));
  const bend = deg(Math.acos(c));
  if (bend < 1e-7) return { bend: 0, roll: 0 };
  if (bend > 180 - 1e-4) return null;

  const p = unit(sub(v, scale(frame.d, c)));
  const b = cross(frame.n, frame.d);
  return { bend, roll: turnDeg(deg(Math.atan2(dot(p, b), dot(p, frame.n)))) };
}

export type DirSolve =
  | { ok: true; legs: { id: string; length: number; bend: number; roll: number }[]; start: Frame }
  | { ok: false; error: string };

/**
 * Turn a list of directions into the bends and rolls the engine walks.
 *
 * Each leg is aimed absolutely, so the frame is advanced by whatever turn gets
 * there rather than by a number anyone typed. That is the whole trick: the
 * chain stays exactly as valid as it was, and nobody has to hold a rolling
 * frame in their head to use it.
 */
export function solveDirections(legs: DirLeg[]): DirSolve {
  if (!legs.length) return { ok: false, error: 'Add at least one leg to build a spool.' };
  const first = legs[0]!;
  const start = startFrame(first.dir);

  const out: { id: string; length: number; bend: number; roll: number }[] = [
    { id: first.id, length: first.length, bend: 0, roll: 0 },
  ];

  let frame = start;
  for (let i = 1; i < legs.length; i += 1) {
    const leg = legs[i]!;
    const turn = turnTo(frame, dirVector(leg.dir));
    if (!turn)
      return {
        ok: false,
        error: `Leg ${i + 1} runs straight back along leg ${i}. Point it somewhere else.`,
      };
    out.push({ id: leg.id, length: leg.length, bend: turn.bend, roll: turn.roll });
    frame = advanceFrame(frame, turn.bend, turn.roll);
  }

  return { ok: true, legs: out, start };
}


// Turning a spool over
// --------------------
// Both of these are reflections, and a reflection keeps every angle it finds.
// So the bends are the same bends, the takeouts are the same takeouts, and the
// cuts are the same cuts — turning a spool over never changes the pipe you buy.

/**
 * The opposite hand.
 *
 * Reflected in the vertical plane the first leg runs in, so the spool still
 * starts where it started and heads where it headed, and everything after it
 * comes off the other side.
 */
export function mirrorDirs(dirs: LegDir[]): LegDir[] {
  const base = dirs[0]?.bearing ?? 0;
  return dirs.map((d) => ({ bearing: turnDeg(2 * base - d.bearing), slope: d.slope }));
}

/** Turned upside down: what ran up now runs down, and the plan is untouched. */
export function flipDirs(dirs: LegDir[]): LegDir[] {
  return dirs.map((d) => ({ bearing: turnDeg(d.bearing), slope: -d.slope }));
}

/** Swung round the compass, bodily. The shape is untouched; it just faces elsewhere. */
export function rotateDirs(dirs: LegDir[], byDeg: number): LegDir[] {
  return dirs.map((d) => ({ bearing: turnDeg(d.bearing + byDeg), slope: d.slope }));
}

/**
 * Part of the way from one set of directions to another.
 *
 * Mirror, turn over and swing all rearrange a spool without changing a single
 * cut, which is exactly what makes them hard to trust: the numbers do not
 * move, so the only evidence anything happened is the picture. A picture that
 * changes between one frame and the next is not evidence — it is a thing you
 * have to remember the old state of. Swept through instead, it is watched.
 *
 * Bearings take the short way round, so a leg going from 350 to 10 sweeps
 * twenty degrees rather than three hundred and forty. Half a turn has no short
 * way, and those go clockwise by convention — a choice, but a consistent one,
 * so mirroring twice sweeps out and back rather than wandering.
 */
export function lerpDirs(from: LegDir[], to: LegDir[], t: number): LegDir[] {
  const k = Math.max(0, Math.min(1, t));
  return from.map((a, i) => {
    const b = to[i] ?? a;
    let d = turnDeg(b.bearing - a.bearing);
    if (d > 180) d -= 360;
    return { bearing: turnDeg(a.bearing + d * k), slope: a.slope + (b.slope - a.slope) * k };
  });
}

// What you have to buy for a turn
// -------------------------------
// Ninety and forty five come out of a box. Everything else is a cut, a mitre
// or a pair of fittings, and the difference is the difference between a spool
// that goes together on Tuesday and one that waits on a fabricator. So the
// angle is checked the moment it is derived, and said plainly.

/** Angles that come off a shelf, in the order a fitter reaches for them. */
export const STOCK_ELBOWS = [90, 45] as const;
/** Angles the rest of the app offers as presets, stock or not. */
export const KNOWN_ELBOWS = [90, 60, 45, 30, 22.5, 11.25] as const;

export type FittingCheck = {
  /** True only for an angle that comes out of a box and welds up as bought. */
  stock: boolean;
  /** What to say about it. */
  label: string;
  /** The angle the label names: the fitting when there is one, the nearest stock when there is not. */
  nearest: number;
};

const closest = (bend: number, xs: readonly number[]): number =>
  xs.reduce((a, b) => (Math.abs(b - bend) < Math.abs(a - bend) ? b : a), xs[0]!);

/** What fitting a derived bend needs, and whether anyone has one on the truck. */
export function fittingFor(bend: number): FittingCheck {
  const known = closest(bend, KNOWN_ELBOWS);
  if (Math.abs(known - bend) < 0.05)
    return { stock: (STOCK_ELBOWS as readonly number[]).includes(known), label: `${tidy(known)}° elbow`, nearest: known };
  const stock = closest(bend, STOCK_ELBOWS);
  return { stock: false, label: `${tidy(bend)}° — cut to suit, nearest stock ${tidy(stock)}°`, nearest: stock };
}
