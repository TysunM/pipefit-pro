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

export function fitSphere(points: Vec3[], cam: Camera, width: number, height: number, pad: number): Fitted {
  if (!points.length) return { map: () => ({ x: width / 2, y: height / 2, depth: 0 }), scale: 1 };
  const c: Vec3 = {
    x: (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2,
    y: (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2,
    z: (Math.min(...points.map((p) => p.z)) + Math.max(...points.map((p) => p.z))) / 2,
  };
  const radius = Math.max(
    1e-6,
    ...points.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z))
  );
  const scale = Math.min(width - pad * 2, height - pad * 2) / 2 / radius;
  const pc = project(c, cam);
  return {
    scale,
    map: (p: Vec3) => {
      const pr = project(p, cam);
      return {
        x: (pr.x - pc.x) * scale + width / 2,
        y: (pr.y - pc.y) * scale + height / 2,
        depth: (pr.depth - pc.depth) * scale,
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

// Keeping every leg in sight
// ---------------------------
// A leg vanishes when it points straight at the camera: it projects to nothing
// and hides inside its own elbows. That happens whenever the camera's view
// axis lines up with the leg.
//
// Two things cause it, and they need different answers.
//
// The first is the camera lying flat or pointing straight down. At dead level
// every horizontal leg on the view line collapses; straight down, every riser
// does. Holding the pitch in a band away from both ends fixes that outright:
// at 15 degrees a leg keeps at least a quarter of its length on screen, and
// nothing on a principal axis can ever disappear.
//
// The second is subtler and is what actually bites. A spool built with no roll
// lies entirely in one vertical plane, and yawing round it passes through that
// plane twice a turn. In the plane the whole spool is edge on: legs stack on
// top of each other and the ones along the view axis go. No tilt of the model
// fixes this — turning the model just moves where it happens — so the camera
// is steered out of the spool's own plane instead, by the smallest yaw that
// clears it. Dragging through reads as a small skip rather than a view where
// half the work is invisible.

/** Lowest the camera tilts: any flatter and horizontal legs start to collapse. */
export const MIN_PITCH = (15 * Math.PI) / 180;
/** Highest it tilts: any steeper and risers start to collapse. */
export const MAX_PITCH = (75 * Math.PI) / 180;
/** How far the view axis is kept off the plane of a flat spool. */
export const MIN_PLANE_ANGLE = (12 * Math.PI) / 180;

/** Where the view starts: tilted into the band, and off the spool's own plane. */
export const ISO_VIEW: Camera = { yaw: -Math.PI / 5, pitch: (25 * Math.PI) / 180 };

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

/** How much of a unit leg's length survives the projection, from 0 to 1. */
export function projectedFraction(dir: Vec3, cam: Camera): number {
  const l = Math.hypot(dir.x, dir.y, dir.z);
  if (l < 1e-12) return 0;
  const d = viewAxis(cam);
  const u = { x: dir.x / l, y: dir.y / l, z: dir.z / l };
  const along = u.x * d.x + u.y * d.y + u.z * d.z;
  return Math.sqrt(Math.max(0, 1 - along * along));
}

/**
 * The plane a spool lies in, if it lies in one.
 *
 * Returns the unit normal, or null when the legs do not share a plane closely
 * enough for an edge on view to matter.
 */
export function spoolPlane(points: Vec3[]): Vec3 | null {
  if (points.length < 3) return null;
  const legs: Vec3[] = [];
  for (let i = 1; i < points.length; i++) {
    const v = {
      x: points[i]!.x - points[i - 1]!.x,
      y: points[i]!.y - points[i - 1]!.y,
      z: points[i]!.z - points[i - 1]!.z,
    };
    const l = Math.hypot(v.x, v.y, v.z);
    if (l > 1e-9) legs.push({ x: v.x / l, y: v.y / l, z: v.z / l });
  }
  if (legs.length < 2) return null;

  // The widest pair of legs gives the steadiest normal.
  let best: Vec3 | null = null;
  let bestLen = 0;
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
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
    if (Math.abs(leg.x * best.x + leg.y * best.y + leg.z * best.z) > 0.08) return null;
  }
  return best;
}

/**
 * Move the camera the shortest way out of a flat spool's own plane.
 *
 * Only the yaw is touched: the pitch is already held in its band, and turning
 * is what carries the view into the plane in the first place.
 */
export function avoidEdgeOn(cam: Camera, normal: Vec3 | null, minAngle = MIN_PLANE_ANGLE): Camera {
  if (!normal) return cam;
  const d = viewAxis(cam);
  const along = d.x * normal.x + d.y * normal.y + d.z * normal.z;
  const want = Math.sin(minAngle);
  if (Math.abs(along) >= want) return cam;

  // d . n is cp*A*cos(yaw + phi) + sp*ny, so the yaws that just clear the
  // plane are the ones where that cosine takes the two needed values.
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const A = Math.hypot(normal.x, normal.z);
  if (A < 1e-9 || cp < 1e-9) return cam;

  const phi = Math.atan2(normal.x, normal.z);
  const candidates: number[] = [];
  for (const sign of [1, -1]) {
    const c = (sign * want - sp * normal.y) / (cp * A);
    if (Math.abs(c) > 1) continue;
    const base = Math.acos(c);
    candidates.push(base - phi, -base - phi);
  }
  if (!candidates.length) return cam;

  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  let bestYaw = cam.yaw;
  let bestTurn = Infinity;
  for (const c of candidates) {
    const turn = Math.abs(wrap(c - cam.yaw));
    if (turn < bestTurn) {
      bestTurn = turn;
      bestYaw = cam.yaw + wrap(c - cam.yaw);
    }
  }
  return { yaw: bestYaw, pitch: cam.pitch };
}
