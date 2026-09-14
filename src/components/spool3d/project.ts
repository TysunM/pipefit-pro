import { Vec3 } from '../../calc/spool';
import { Pt } from '../diagram/primitives';

export type Camera = { yaw: number; pitch: number };

export type Projected = Pt & { depth: number };

export function rotate(p: Vec3, cam: Camera): Vec3 {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;

  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;

  return { x: x1, y: y2, z: z2 };
}

export function project(p: Vec3, cam: Camera): Projected {
  const r = rotate(p, cam);
  return { x: r.x, y: -r.y, depth: r.z };
}

export type Fitted = { map: (p: Vec3) => Projected; scale: number };

/**
 * Fit a spool to the canvas.
 *
 * The scale comes from the bounding sphere, which is the same from every
 * angle, so turning the spool never resizes it — a drawing that swells and
 * shrinks as it turns is unreadable and unmeasurable by eye.
 *
 * The centring does not: it comes from where the drawing actually lands on the
 * page. Projecting the middle of the model is not the middle of the picture of
 * it, and using the one for the other leaves the work pushed into a corner
 * with half the canvas empty.
 */
export function fitSphere(points: Vec3[], cam: Camera, width: number, height: number, pad: number): Fitted {
  if (!points.length) return { map: () => ({ x: width / 2, y: height / 2, depth: 0 }), scale: 1 };
  const c: Vec3 = {
    x: (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2,
    y: (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2,
    z: (Math.min(...points.map((p) => p.z)) + Math.max(...points.map((p) => p.z))) / 2,
  };
  const radius = Math.max(1e-6, ...points.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)));
  const scale = Math.min(width - pad * 2, height - pad * 2) / 2 / radius;

  const flat = points.map((p) => project(p, cam));
  const midX = (Math.min(...flat.map((p) => p.x)) + Math.max(...flat.map((p) => p.x))) / 2;
  const midY = (Math.min(...flat.map((p) => p.y)) + Math.max(...flat.map((p) => p.y))) / 2;
  const midDepth = project(c, cam).depth;

  return {
    scale,
    map: (p: Vec3) => {
      const pr = project(p, cam);
      return {
        x: (pr.x - midX) * scale + width / 2,
        y: (pr.y - midY) * scale + height / 2,
        depth: (pr.depth - midDepth) * scale,
      };
    },
  };
}

export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function fitProjection(
  points: Projected[],
  width: number,
  height: number,
  pad: number
): (p: Projected) => Projected {
  if (!points.length) return (p) => p;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = pad + (width - pad * 2 - spanX * scale) / 2 - minX * scale;
  const offY = pad + (height - pad * 2 - spanY * scale) / 2 - minY * scale;
  return (p) => ({ x: p.x * scale + offX, y: p.y * scale + offY, depth: p.depth * scale });
}

// Drawing it the way a fitter draws it
// ------------------------------------
// A spool on iso paper reads as solid because the paper enforces one thing:
// the three axes come off the page at 30, 90 and 150 degrees, all three
// foreshortened by exactly the same amount. That is isometric, and it is the
// only orientation where a cube's three visible faces are equal.
//
// The camera reaches it at yaw -45 and pitch atan(1/sqrt 2), which is 35.264
// degrees. Nothing else does. At 25 degrees the three axes come out 0.85,
// 0.91 and 0.68 long and separated by 107, 120 and 133 degrees, and the eye
// reads that as a flat drawing that has been tipped, because that is what it
// is.
//
// Keeping every leg in sight
// --------------------------
// A leg vanishes when it points straight at the camera: it projects to nothing
// and hides inside its own elbows. Three things cause it, and they need
// different answers.
//
// The camera lying flat or pointing straight down. At dead level every
// horizontal leg on the view line collapses; straight down, every riser does.
// Holding the pitch in a band away from both ends fixes that outright.
//
// A spool built with no roll lies entirely in one vertical plane, and yawing
// round it passes through that plane twice a turn. In the plane the whole
// spool is edge on. No tilt of the model fixes this, so the camera is steered
// out of the spool's own plane instead, by the smallest yaw that clears it.
//
// A single rolled leg pointing along the view axis. The pitch band cannot help
// here because the leg is on no principal axis, and the spool need not be
// planar for it to happen. So each leg is held off the view axis by the same
// margin, by the same closed form.
//
// All three reduce to one question: for a given pitch, which yaws solve
// d(yaw) . v = t? That has a closed form, so the camera is never searched for,
// only solved and snapped to the nearest answer.

/** The pitch at which the three axes project equal and 120° apart: 35.264°. */
export const ISO_PITCH = Math.atan(Math.SQRT1_2);

/** Lowest the camera tilts: any flatter and horizontal legs start to collapse. */
export const MIN_PITCH = (20 * Math.PI) / 180;
/**
 * Highest it tilts.
 *
 * Looking down steeply at a spool standing in a vertical plane is inherently
 * close to looking along that plane, so the steeper the tilt the less yaw is
 * left that clears it. At 70 degrees nothing does. 55 keeps a sweep of better
 * than two hundred degrees at the worst tilt the drag allows.
 */
export const MAX_PITCH = (55 * Math.PI) / 180;
/** How far the view axis is kept off the plane of a flat spool. */
export const MIN_PLANE_ANGLE = (20 * Math.PI) / 180;
/** How far the view axis is kept off any one leg. */
export const MIN_LEG_ANGLE = (20 * Math.PI) / 180;

/** Where the view starts: true isometric, looking down from the north east. */
export const ISO_VIEW: Camera = { yaw: -Math.PI / 4, pitch: ISO_PITCH };

/**
 * The four isometric corners, named for the quarter the camera sits in.
 *
 * The view axis points towards the viewer, so its sign in x and z is the
 * compass corner: +x is east and +z is north, matching the axis triad.
 */
export const ISO_CORNERS: readonly { id: string; cam: Camera }[] = [
  { id: 'NE', cam: { yaw: -Math.PI / 4, pitch: ISO_PITCH } },
  { id: 'NW', cam: { yaw: Math.PI / 4, pitch: ISO_PITCH } },
  { id: 'SW', cam: { yaw: (3 * Math.PI) / 4, pitch: ISO_PITCH } },
  { id: 'SE', cam: { yaw: (-3 * Math.PI) / 4, pitch: ISO_PITCH } },
];

export const clampPitch = (v: number): number => Math.max(MIN_PITCH, Math.min(MAX_PITCH, v));

/**
 * The world direction the camera looks along.
 *
 * It is the vector that `rotate` sends to pure depth, so a leg parallel to it
 * projects to nothing.
 */
export function viewAxis(cam: Camera): Vec3 {
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  return { x: -cp * Math.sin(cam.yaw), y: sp, z: cp * Math.cos(cam.yaw) };
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/** How much of a unit leg's length survives the projection, from 0 to 1. */
export function projectedFraction(dir: Vec3, cam: Camera): number {
  const l = Math.hypot(dir.x, dir.y, dir.z);
  if (l < 1e-12) return 0;
  const along = dot({ x: dir.x / l, y: dir.y / l, z: dir.z / l }, viewAxis(cam));
  return Math.sqrt(Math.max(0, 1 - along * along));
}

/** Every leg of a spool as a unit vector, with parallel repeats dropped. */
export function legDirections(points: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const v = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const l = Math.hypot(v.x, v.y, v.z);
    if (l < 1e-9) continue;
    const u = { x: v.x / l, y: v.y / l, z: v.z / l };
    // A leg parallel to one already held vanishes at the same yaw, so it adds
    // no constraint and only more candidates to weigh.
    if (out.some((w) => Math.abs(dot(w, u)) > 1 - 1e-9)) continue;
    out.push(u);
  }
  return out;
}

/**
 * The plane a spool lies in, if it lies in one.
 *
 * Returns the unit normal, or null when the legs do not share a plane closely
 * enough for an edge on view to matter.
 */
export function spoolPlane(points: Vec3[]): Vec3 | null {
  const legs = legDirections(points);
  if (legs.length < 2) return null;

  // The widest pair of legs gives the steadiest normal.
  let best: Vec3 | null = null;
  let bestLen = 0;
  for (let i = 0; i < legs.length; i += 1) {
    for (let j = i + 1; j < legs.length; j += 1) {
      const a = legs[i]!;
      const b = legs[j]!;
      const n = {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
      };
      const l = Math.hypot(n.x, n.y, n.z);
      if (l > bestLen) {
        bestLen = l;
        best = { x: n.x / l, y: n.y / l, z: n.z / l };
      }
    }
  }
  if (!best || bestLen < 1e-6) return null;

  // Only a plane every leg sits in counts. One leg out of it and an edge on
  // view is no longer a view that loses the whole spool.
  for (const leg of legs) {
    if (Math.abs(dot(leg, best)) > 0.08) return null;
  }
  return best;
}

/**
 * The yaws at which the view axis makes a given dot product with a vector.
 *
 * `d . v` is `cos(pitch) * A * cos(yaw + phi) + sin(pitch) * v.y`, where A is
 * the length of v in the horizontal plane and phi its bearing. Inverting that
 * cosine gives the two yaws, or none when the target is out of reach at this
 * pitch.
 */
export function yawsWhereDot(pitch: number, v: Vec3, target: number): number[] {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const A = Math.hypot(v.x, v.z);
  if (A < 1e-9 || cp < 1e-9) return [];
  const c = (target - sp * v.y) / (cp * A);
  if (Math.abs(c) > 1) return [];
  const phi = Math.atan2(v.x, v.z);
  const base = Math.acos(c);
  return [base - phi, -base - phi];
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * How much room the camera has before something goes edge on.
 *
 * Zero is exactly on a limit and negative is past it, so one number covers
 * both the flat spool's plane and every individual leg.
 */
export function cameraMargin(cam: Camera, normal: Vec3 | null, dirs: Vec3[]): number {
  let m = Infinity;
  if (normal) m = Math.min(m, Math.abs(dot(viewAxis(cam), normal)) - Math.sin(MIN_PLANE_ANGLE));
  for (const u of dirs) m = Math.min(m, projectedFraction(u, cam) - Math.sin(MIN_LEG_ANGLE));
  return m;
}

/**
 * Move the camera the shortest way out of a flat spool's own plane.
 *
 * Only the yaw is touched: the pitch is already held in its band, and turning
 * is what carries the view into the plane in the first place.
 */
export function avoidEdgeOn(cam: Camera, normal: Vec3 | null, minAngle = MIN_PLANE_ANGLE): Camera {
  if (!normal) return cam;
  const want = Math.sin(minAngle);
  if (Math.abs(dot(viewAxis(cam), normal)) >= want) return cam;

  const candidates = [
    ...yawsWhereDot(cam.pitch, normal, want),
    ...yawsWhereDot(cam.pitch, normal, -want),
  ];
  return { yaw: nearestYaw(cam.yaw, candidates), pitch: cam.pitch };
}

function nearestYaw(from: number, candidates: number[]): number {
  let best = from;
  let bestTurn = Infinity;
  for (const c of candidates) {
    const turn = Math.abs(wrap(c - from));
    if (turn < bestTurn) {
      bestTurn = turn;
      best = from + wrap(c - from);
    }
  }
  return best;
}

/**
 * Settle a camera so nothing in the spool is edge on.
 *
 * The pitch is clamped into its band, then the yaw is moved the shortest way
 * to a place where the spool's plane and every leg clear their margins. The
 * yaws worth trying are exactly the ones where some constraint is met with
 * nothing to spare, so they are solved rather than searched: at most two per
 * leg plus two for the plane.
 *
 * When no yaw clears everything — a spool with legs at every bearing — it
 * settles on the one that leaves the worst offender best off, which is the
 * most that can be shown in a single orthographic view.
 */
export function settleCamera(cam: Camera, normal: Vec3 | null, dirs: Vec3[]): Camera {
  const pitch = clampPitch(cam.pitch);
  const at = { yaw: cam.yaw, pitch };
  if (cameraMargin(at, normal, dirs) >= 0) return at;

  const plane = Math.sin(MIN_PLANE_ANGLE);
  const leg = Math.cos(MIN_LEG_ANGLE);
  const candidates: number[] = [];
  if (normal) candidates.push(...yawsWhereDot(pitch, normal, plane), ...yawsWhereDot(pitch, normal, -plane));
  for (const u of dirs) candidates.push(...yawsWhereDot(pitch, u, leg), ...yawsWhereDot(pitch, u, -leg));
  if (!candidates.length) return at;

  const TOL = 1e-9;
  let clear: number | null = null;
  let clearTurn = Infinity;
  let fallback = at.yaw;
  let fallbackMargin = cameraMargin(at, normal, dirs);
  let fallbackTurn = 0;

  for (const c of candidates) {
    const yaw = at.yaw + wrap(c - at.yaw);
    const turn = Math.abs(yaw - at.yaw);
    const m = cameraMargin({ yaw, pitch }, normal, dirs);
    if (m >= -TOL && turn < clearTurn) {
      clear = yaw;
      clearTurn = turn;
    }
    if (m > fallbackMargin + TOL || (Math.abs(m - fallbackMargin) <= TOL && turn < fallbackTurn)) {
      fallback = yaw;
      fallbackMargin = m;
      fallbackTurn = turn;
    }
  }

  return { yaw: clear ?? fallback, pitch };
}

// Breaking the far line at a crossing
// -----------------------------------
// A draughtsman shows which pipe is in front by breaking the one behind where
// they cross. Doing it with a wide stroke of the page colour under every piece
// works, but it also eats the fitting on the end of the piece's own neighbour,
// which reads as a gap in a run that has none.
//
// So the break is put only where two pieces that are not joined actually cross,
// and only across the width of the one behind.

export type Crossing = {
  /** Where they cross, on the page. */
  x: number;
  y: number;
  /** The direction of the near piece there, so the break can run along it. */
  ax: number;
  ay: number;
  /** Sine of the angle between them: how far the break has to reach. */
  sin: number;
};

/** Where two open polylines cross on the page. */
export function polylineCrossings(a: Pt[], b: Pt[]): Crossing[] {
  const out: Crossing[] = [];
  for (let i = 1; i < a.length; i += 1) {
    const p = a[i - 1]!;
    const q = a[i]!;
    const rx = q.x - p.x;
    const ry = q.y - p.y;
    for (let j = 1; j < b.length; j += 1) {
      const u = b[j - 1]!;
      const v = b[j]!;
      const sx = v.x - u.x;
      const sy = v.y - u.y;
      const denom = rx * sy - ry * sx;
      if (Math.abs(denom) < 1e-12) continue; // parallel, or a zero length hop
      const t = ((u.x - p.x) * sy - (u.y - p.y) * sx) / denom;
      const w = ((u.x - p.x) * ry - (u.y - p.y) * rx) / denom;
      if (t < 0 || t > 1 || w < 0 || w > 1) continue;
      const la = Math.hypot(rx, ry);
      const lb = Math.hypot(sx, sy);
      if (la < 1e-9 || lb < 1e-9) continue;
      out.push({
        x: p.x + rx * t,
        y: p.y + ry * t,
        ax: rx / la,
        ay: ry / la,
        sin: Math.abs(denom) / (la * lb),
      });
    }
  }
  return out;
}


// Rotation as a sweep, not a circle
// ---------------------------------
// Steering the camera the shortest way out of a bad view works, but the view
// it steers to is only just clear, and only just clear still reads as a leg
// that has gone. The margin is what matters, and a margin of twenty degrees
// leaves a leg a third of its length on screen instead of a fifth.
//
// Twenty degrees of clearance is not free. On a flat spool it costs about
// fifty degrees of yaw either side of the two places the camera looks along
// the plane, so a full turn is no longer available: what is left is around
// 260 to 275 degrees depending on the tilt, in two arcs.
//
// So rotation is that sweep rather than a circle. The dead bands are taken out
// of the range and the drag runs along what remains, which means there is no
// yaw the drag can reach where the spool is edge on — not steered away from,
// not recovered from, simply not there.

export type YawArc = { start: number; end: number };
export type YawRange = { arcs: YawArc[]; total: number };

const TWO_PI = Math.PI * 2;
const turn = (a: number): number => ((a % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * The yaws at this tilt where nothing in the spool is edge on.
 *
 * Every constraint changes sign only where it is met exactly, and those yaws
 * are solved in closed form, so cutting the circle at all of them leaves
 * sectors that are wholly good or wholly bad. Testing one yaw in each sector
 * settles it — no sampling, and no band narrower than the step.
 */
export function allowedYaw(pitch: number, normal: Vec3 | null, dirs: Vec3[]): YawRange {
  const whole: YawRange = { arcs: [{ start: 0, end: TWO_PI }], total: TWO_PI };

  const cuts: number[] = [];
  if (normal) {
    const m = Math.sin(MIN_PLANE_ANGLE);
    cuts.push(...yawsWhereDot(pitch, normal, m), ...yawsWhereDot(pitch, normal, -m));
  }
  const c = Math.cos(MIN_LEG_ANGLE);
  for (const u of dirs) cuts.push(...yawsWhereDot(pitch, u, c), ...yawsWhereDot(pitch, u, -c));

  const edges = [...new Set(cuts.map((a) => turn(a).toFixed(9)))].map(Number).sort((a, b) => a - b);
  if (!edges.length) return cameraMargin({ yaw: 0, pitch }, normal, dirs) >= 0 ? whole : { arcs: [], total: 0 };

  const arcs: YawArc[] = [];
  for (let i = 0; i < edges.length; i += 1) {
    const a = edges[i]!;
    const b = i + 1 < edges.length ? edges[i + 1]! : edges[0]! + TWO_PI;
    if (b - a < 1e-9) continue;
    if (cameraMargin({ yaw: (a + b) / 2, pitch }, normal, dirs) < 0) continue;
    const last = arcs[arcs.length - 1];
    // A yaw where a constraint is met exactly but never crossed is not a wall.
    if (last && Math.abs(last.end - a) < 1e-9) last.end = b;
    else arcs.push({ start: a, end: b });
  }

  // A sweep that closes on itself is a whole circle, not a wall at the seam.
  const first = arcs[0];
  const last = arcs[arcs.length - 1];
  if (arcs.length > 1 && first && last && Math.abs(last.end - (first.start + TWO_PI)) < 1e-9) {
    first.start = last.start - TWO_PI;
    arcs.pop();
  }

  const total = arcs.reduce((t, a) => t + (a.end - a.start), 0);
  // Nothing clears — a spool with legs at every bearing. Free rotation beats a
  // drag that cannot move at all.
  return total < 1e-9 ? whole : { arcs, total };
}

/** The yaw a given distance along the sweep, wrapping at its ends. */
export function yawAt(range: YawRange, along: number): number {
  if (!range.arcs.length || range.total < 1e-12) return 0;
  let t = ((along % range.total) + range.total) % range.total;
  for (const a of range.arcs) {
    const w = a.end - a.start;
    if (t <= w) return wrap(a.start + t);
    t -= w;
  }
  return wrap(range.arcs[range.arcs.length - 1]!.end);
}

/** How far along the sweep a yaw sits, snapping to the nearest wall if outside. */
export function sweepOf(range: YawRange, yaw: number): number {
  if (!range.arcs.length || range.total < 1e-12) return 0;
  let acc = 0;
  let bestAlong = 0;
  let bestGap = Infinity;
  for (const a of range.arcs) {
    const w = a.end - a.start;
    for (const y of [turn(yaw), turn(yaw) + TWO_PI, turn(yaw) - TWO_PI]) {
      if (y >= a.start - 1e-12 && y <= a.end + 1e-12) return acc + Math.max(0, Math.min(w, y - a.start));
      const gap = Math.min(Math.abs(y - a.start), Math.abs(y - a.end));
      if (gap < bestGap) {
        bestGap = gap;
        bestAlong = acc + (Math.abs(y - a.start) <= Math.abs(y - a.end) ? 0 : w);
      }
    }
    acc += w;
  }
  return bestAlong;
}

/** The nearest yaw in the sweep to the one asked for. */
export function snapYaw(range: YawRange, yaw: number): number {
  return yawAt(range, sweepOf(range, yaw));
}
