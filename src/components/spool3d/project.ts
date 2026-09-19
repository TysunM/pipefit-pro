import { Vec3 } from '../../calc/spool';
import { Pt } from '../diagram/primitives';

export type Camera = { yaw: number; pitch: number };

export type Projected = Pt & { depth: number };

// Which way round the page goes
// -----------------------------
// A camera is three vectors: what is to the right on the page, what is up on
// the page, and which way the viewer is. They are not free of one another. Fix
// any two and the third is settled, and getting the sign wrong on the odd one
// out does not tilt a drawing — it turns it into the mirror of itself while
// the near and far pieces stay where they were.
//
// That is not a cosmetic fault on a spool. A spool reflected is the other
// hand, and the other hand does not fit the job. So the three are derived from
// each other here rather than written out separately:
//
//   right = view x up,   up = what is left of vertical once the tilt is taken,
//   view  = up x right,  and the drawing checks out from the viewer it claims.
//
// The yaw and pitch that pick them keep their old meaning: yaw swings the
// viewer round the compass, pitch lifts them off level, and the view vector
// points back out of the page at them, so `depth` grows toward the front.

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * The world direction the camera looks from — out of the page, at the viewer.
 *
 * A leg parallel to it projects to nothing, which is what a riser does in a
 * plan and what any leg end-on to the viewer does in any view.
 */
export function viewAxis(cam: Camera): Vec3 {
  const cp = Math.cos(cam.pitch);
  return { x: -cp * Math.sin(cam.yaw), y: Math.sin(cam.pitch), z: cp * Math.cos(cam.yaw) };
}

/** Which way is up on the page: vertical, less whatever the tilt has taken. */
export function pageUp(cam: Camera): Vec3 {
  const sp = Math.sin(cam.pitch);
  return { x: sp * Math.sin(cam.yaw), y: Math.cos(cam.pitch), z: -sp * Math.cos(cam.yaw) };
}

/** Which way is right on the page. `view x up`, and nothing else. */
export function pageRight(cam: Camera): Vec3 {
  return { x: -Math.cos(cam.yaw), y: 0, z: -Math.sin(cam.yaw) };
}

/** A point in the camera's own frame: right, up, and toward the viewer. */
export function rotate(p: Vec3, cam: Camera): Vec3 {
  return { x: dot(p, pageRight(cam)), y: dot(p, pageUp(cam)), z: dot(p, viewAxis(cam)) };
}

/** The same, on the page, where y counts downward. */
export function project(p: Vec3, cam: Camera): Projected {
  const r = rotate(p, cam);
  return { x: r.x, y: -r.y, depth: r.z };
}

// The views a fitter actually reads
// ---------------------------------
// An isometric is the picture. A plan and an elevation are the drawing: they
// are where the dimensions live, because in them one whole axis is square to
// the page and a tape reads straight off it.
//
// The awkward part of a plan is that every riser lands on a single point, and
// of an elevation that every leg running at the viewer does the same. That is
// not a reason to forbid the view — it is the view, and the trade has always
// answered it the same way: the collapsed leg is drawn as what it is and its
// length is written beside it. So nothing here is blocked. What a view cannot
// show by its length, the drawing says in words.

/** The pitch at which the three axes project equal and 120° apart: 35.264°. */
export const ISO_PITCH = Math.atan(Math.SQRT1_2);

/** Straight down is as far as the camera goes; past it, up is upside down. */
export const MAX_PITCH = Math.PI / 2;

export const clampPitch = (v: number): number => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, v));

/** Where the view starts: true isometric, looking down from the north east. */
export const ISO_VIEW: Camera = { yaw: -Math.PI / 4, pitch: ISO_PITCH };

export type NamedView = {
  id: string;
  /** What the button says. */
  label: string;
  /** What the drawing is, said in full. */
  title: string;
  cam: Camera;
};

const Q = Math.PI / 2;

/**
 * The four isometric corners, named for the quarter the viewer stands in.
 *
 * The view vector points at the viewer, so its sign in x and z is the compass
 * corner: +x east, +z north.
 */
export const ISO_CORNERS: readonly NamedView[] = [
  { id: 'NE', label: 'NE', title: 'Isometric from the north east', cam: { yaw: -Q / 2, pitch: ISO_PITCH } },
  { id: 'NW', label: 'NW', title: 'Isometric from the north west', cam: { yaw: Q / 2, pitch: ISO_PITCH } },
  { id: 'SW', label: 'SW', title: 'Isometric from the south west', cam: { yaw: 3 * (Q / 2), pitch: ISO_PITCH } },
  { id: 'SE', label: 'SE', title: 'Isometric from the south east', cam: { yaw: -3 * (Q / 2), pitch: ISO_PITCH } },
];

/** Looking straight down, north up the page and east to the right. */
export const PLAN_VIEW: NamedView = {
  id: 'PLAN',
  label: 'Plan',
  title: 'Plan — looking down, north up the page',
  cam: { yaw: Math.PI, pitch: Q },
};

/** The four square-on elevations, named for the side the viewer stands on. */
export const ELEVATIONS: readonly NamedView[] = [
  { id: 'ELEV-S', label: 'S elev', title: 'Elevation from the south', cam: { yaw: Math.PI, pitch: 0 } },
  { id: 'ELEV-E', label: 'E elev', title: 'Elevation from the east', cam: { yaw: -Q, pitch: 0 } },
  { id: 'ELEV-N', label: 'N elev', title: 'Elevation from the north', cam: { yaw: 0, pitch: 0 } },
  { id: 'ELEV-W', label: 'W elev', title: 'Elevation from the west', cam: { yaw: Q, pitch: 0 } },
];

export const NAMED_VIEWS: readonly NamedView[] = [...ISO_CORNERS, PLAN_VIEW, ...ELEVATIONS];

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Whether the camera is sitting on one of the named views. */
export function viewAt(cam: Camera, tol = 0.02): NamedView | null {
  return (
    NAMED_VIEWS.find(
      (v) => Math.abs(wrap(cam.yaw - v.cam.yaw)) < tol && Math.abs(cam.pitch - v.cam.pitch) < tol
    ) ?? null
  );
}

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
    if (out.some((w) => Math.abs(dot(w, u)) > 1 - 1e-9)) continue;
    out.push(u);
  }
  return out;
}

// Filling the page
// ----------------
// A drawing scaled off the spool's bounding sphere never changes size as it
// turns, which is what an object on a bench does, and it costs a quarter of
// the page: the sphere has to hold the spool from its worst angle, and no
// angle you are looking from is the worst one.
//
// A quarter of the page is a quarter of every dimension, on a phone, in a
// shop. So the drawing is fitted to what is actually on the page instead — the
// projected box — and it fills the canvas in every view.
//
// The one place that reads badly is mid-drag, where a growing silhouette would
// have the picture breathing under the thumb. So a drag is handed the scale it
// started at as a ceiling: the drawing may shrink to stay inside the canvas
// while it turns and never swells, and it refits the moment the thumb lifts.

/**
 * The whole mapping from spool to page, in four numbers.
 *
 * Kept separate from the mapper so a caller can take one, hold on to it, and
 * hand it back later to get the identical drawing — which is what a drag that
 * must not rescale under a thumb needs.
 */
export type Transform = { scale: number; midX: number; midY: number; midDepth: number };

export type Fitted = { map: (p: Vec3) => Projected; scale: number; transform: Transform };

export function fitView(
  points: Vec3[],
  cam: Camera,
  width: number,
  height: number,
  pad: number,
  maxScale = Infinity,
  /**
   * A transform to use instead of working one out.
   *
   * Handed one, the drawing is pinned exactly where it was: same scale, same
   * centre. That is what a resize drag wants — a picture that rescales while a
   * finger is on it fights the finger, and can shrink a leg on the page at the
   * same moment its length is going up.
   */
  hold?: Transform | null
): Fitted {
  const cx = width / 2;
  const cy = height / 2;
  const mapper = (t: Transform): Fitted => ({
    scale: t.scale,
    transform: t,
    map: (p: Vec3) => {
      const pr = project(p, cam);
      return {
        x: (pr.x - t.midX) * t.scale + cx,
        y: (pr.y - t.midY) * t.scale + cy,
        depth: (pr.depth - t.midDepth) * t.scale,
      };
    },
  });

  if (hold) return mapper(hold);
  if (!points.length) return mapper({ scale: 1, midX: 0, midY: 0, midDepth: 0 });

  const flat = points.map((p) => project(p, cam));
  const xs = flat.map((p) => p.x);
  const ys = flat.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const room = { w: Math.max(1, width - pad * 2), h: Math.max(1, height - pad * 2) };
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  // A spool seen exactly end-on has no span at all. It still has a scale, and
  // it is the one the other axis asks for, not infinity.
  const byX = spanX > 1e-9 ? room.w / spanX : Infinity;
  const byY = spanY > 1e-9 ? room.h / spanY : Infinity;
  const want = Math.min(byX, byY);
  const scale = Math.min(Number.isFinite(want) ? want : 1, maxScale);

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const midDepth = project(
    {
      x: (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2,
      y: (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2,
      z: (Math.min(...points.map((p) => p.z)) + Math.max(...points.map((p) => p.z))) / 2,
    },
    cam
  ).depth;

  return mapper({ scale, midX, midY, midDepth });
}

// Which corner to open on
// -----------------------
// The four isometric corners are the same drawing from four sides, and they
// are not equally good. The same spool that reads as a clean L from the south
// east reads as a closed triangle from the north east, because from there two
// legs that never touch cross on the page. A man who has to work out which of
// those two lines is in front has been given a puzzle instead of a drawing.
//
// So the opening view is chosen rather than fixed. Crossings between legs that
// are not joined cost the most, because they are what makes a drawing
// ambiguous; a leg lost end-on costs next, because a figure has to carry it;
// and between two views that are equally clear the one that spreads the spool
// widest wins, because a wider drawing is a bigger figure on a phone.

/** Below this much of its length on the page, a leg is read off its figure. */
export const LOST = 0.16;

/** How badly a spool reads from one camera. Lower is better. */
export function viewScore(points: Vec3[], cam: Camera): number {
  if (points.length < 2) return 0;
  const flat = points.map((p) => project(p, cam));

  let crossings = 0;
  let lost = 0;
  for (let i = 1; i < flat.length; i += 1) {
    const a = flat[i - 1]!;
    const b = flat[i]!;
    const world = points[i]!;
    const from = points[i - 1]!;
    if (projectedFraction({ x: world.x - from.x, y: world.y - from.y, z: world.z - from.z }, cam) < LOST) lost += 1;
    // Only legs that do not share a corner: neighbours meet, they do not cross.
    for (let j = i + 2; j < flat.length; j += 1)
      crossings += polylineCrossings([a, b], [flat[j - 1]!, flat[j]!]).length;
  }

  const xs = flat.map((p) => p.x);
  const ys = flat.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const size = Math.max(1e-9, Math.max(...points.map((p) => Math.hypot(p.x, p.y, p.z))));
  // The squarer and bigger the drawing, the more of the canvas it will take.
  const fill = (Math.min(spanX, spanY) * Math.max(spanX, spanY)) / (size * size);

  return crossings * 1000 + lost * 100 - fill;
}

/** The isometric corner a spool reads best from, ties going to the north east. */
export function bestCorner(points: Vec3[]): NamedView {
  let best = ISO_CORNERS[0]!;
  let score = Infinity;
  for (const c of ISO_CORNERS) {
    const s = viewScore(points, c.cam);
    if (s < score - 1e-9) {
      score = s;
      best = c;
    }
  }
  return best;
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
