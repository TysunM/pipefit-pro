// Iso paper
// ---------
// An isometric drawing is three axes on a flat sheet: vertical, and two at
// thirty degrees off horizontal for the two plan directions. Every fitter has
// drawn a run on the dotted paper that makes those axes easy to follow. This
// is that paper, and the rules that keep a finger on it and let the page be
// turned.
//
// The dots are a lattice. On the page there are two axes, up-right and
// up-left, each one dot apart; vertical is the sum of the two and lands on the
// same dots. A run, though, is kept in the world — counts along east, north
// and up — because a segment that snapped to an axis said which one, and that
// is what lets the page be turned to any corner and still be the same run.
//
// A rolling offset is a diagonal on iso paper, halfway between two axes, so
// the snap takes those too. Every thirty degrees is a direction a pipe can
// run, and nothing in between is.

export type Pt = [number, number];
/** A lattice point in the world: counts along east, north and up. */
export type L3 = [number, number, number];

/** Dot spacing in points at scale one. Coarse enough to hit in a glove, fine enough to draw a tee. */
export const ISO_GRID = 20;

const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;

/** The page point at up-right count `a`, up-left count `b`. */
export function lattice(a: number, b: number, g: number): Pt {
  return [(a - b) * C30 * g, -(a + b) * S30 * g];
}

const d2 = (p: Pt, q: Pt) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;

/** An integer without the negative zero that rounding a small negative leaves. */
const int = (n: number): number => Math.round(n) + 0;

export const distance = (p: Pt, q: Pt): number => Math.sqrt(d2(p, q));

/** The up-right and up-left counts of the dot nearest to `p`. */
export function nearestCounts(p: Pt, g: number): [number, number] {
  const X = p[0] / (C30 * g);
  const Y = -p[1] / (S30 * g);
  const a0 = (X + Y) / 2;
  const b0 = (Y - X) / 2;
  let best: [number, number] = [int(a0), int(b0)];
  let bd = d2(lattice(best[0], best[1], g), p);
  // Rounding the two counts separately can land one dot off on a triangular
  // lattice, so the four dots around the point are tried and the closest wins.
  for (const a of [Math.floor(a0), Math.ceil(a0)])
    for (const b of [Math.floor(b0), Math.ceil(b0)]) {
      const d = d2(lattice(a, b, g), p);
      if (d < bd) {
        bd = d;
        best = [a, b];
      }
    }
  return best;
}

/** The page point of the dot nearest to `p`. */
export function nearestLattice(p: Pt, g: number): Pt {
  const [a, b] = nearestCounts(p, g);
  return lattice(a, b, g);
}

// --------------------------------------------------------------- the corners

/**
 * Which corner the page is looked at from. The same four the spool builder
 * names, in the order the page turns through them.
 */
export type Corner = 'SW' | 'SE' | 'NE' | 'NW';
export const CORNERS: readonly Corner[] = ['SW', 'SE', 'NE', 'NW'];

export const CORNER_TITLE: Record<Corner, string> = {
  SW: 'From the south west',
  SE: 'From the south east',
  NE: 'From the north east',
  NW: 'From the north west',
};

export function turn(c: Corner, by: 1 | -1): Corner {
  const i = CORNERS.indexOf(c);
  return CORNERS[(i + by + 4) % 4]!;
}

/**
 * The world axis that runs up-right on the page and the one that runs
 * up-left, from each corner. Up is up from everywhere.
 */
const AXES: Record<Corner, { right: L3; left: L3 }> = {
  SW: { right: [1, 0, 0], left: [0, 1, 0] },
  SE: { right: [0, 1, 0], left: [-1, 0, 0] },
  NE: { right: [-1, 0, 0], left: [0, -1, 0] },
  NW: { right: [0, -1, 0], left: [1, 0, 0] },
};

const dot3 = (p: L3, q: L3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

/** Where a world lattice point sits on the page, looked at from `c`. */
export function toScreen(p: L3, c: Corner, g: number): Pt {
  const { right, left } = AXES[c];
  return lattice(dot3(p, right) + p[2], dot3(p, left) + p[2], g);
}

/** The world point, at ground level, of the dot nearest to a page point. */
export function screenToLattice(p: Pt, c: Corner, g: number): L3 {
  const [a, b] = nearestCounts(p, g);
  const { right, left } = AXES[c];
  return [int(a * right[0] + b * left[0]), int(a * right[1] + b * left[1]), 0];
}

/**
 * The page directions a segment can take, by thirty-degree sector, as counts
 * of up-right, up-left and up. Odd sectors are the three axes, one dot apart;
 * even ones are the diagonals, where the next dot is √3 further.
 */
const SECTOR: Record<number, [number, number, number]> = {
  [-1]: [1, 0, 0],
  [-3]: [0, 0, 1],
  [-5]: [0, 1, 0],
  5: [-1, 0, 0],
  3: [0, 0, -1],
  1: [0, -1, 0],
  0: [1, -1, 0],
  6: [-1, 1, 0],
  [-6]: [-1, 1, 0],
  [-2]: [1, 0, 1],
  4: [-1, 0, -1],
  [-4]: [0, 1, 1],
  2: [0, -1, -1],
};

export type Snap = {
  to: L3;
  /** How many dots the segment covers. Zero means too short to be a segment. */
  steps: number;
  axis: 'iso' | 'diagonal';
};

/**
 * Where a segment dragged from `from` towards the page point `to` ends.
 *
 * The direction is rounded to the nearest thirty degrees and the length to
 * the nearest dot along it, and the answer is a world point, so the run knows
 * which way it went when the page is turned.
 */
export function snapRun(from: L3, to: Pt, c: Corner, g: number): Snap {
  const f = toScreen(from, c, g);
  const vx = to[0] - f[0];
  const vy = to[1] - f[1];
  const len = Math.hypot(vx, vy);
  if (len < g * 0.45) return { to: from, steps: 0, axis: 'iso' };

  const sector = Math.round(Math.atan2(vy, vx) / (Math.PI / 6));
  const angle = (sector * Math.PI) / 6;
  const dir: Pt = [Math.cos(angle), Math.sin(angle)];
  const axis: Snap['axis'] = sector % 2 === 0 ? 'diagonal' : 'iso';
  const step = axis === 'iso' ? g : g * Math.sqrt(3);
  const steps = Math.round((vx * dir[0] + vy * dir[1]) / step);
  if (steps < 1) return { to: from, steps: 0, axis };

  const [dr, dl, du] = SECTOR[sector]!;
  const { right, left } = AXES[c];
  const end: L3 = [
    int(from[0] + steps * (dr * right[0] + dl * left[0])),
    int(from[1] + steps * (dr * right[1] + dl * left[1])),
    int(from[2] + steps * du),
  ];
  return { to: end, steps, axis };
}

/** The nearest of `items` within `radius` of `p`, or null. */
export function nearestOf<T>(p: Pt, items: readonly T[], at: (t: T) => Pt, radius: number): T | null {
  let best: T | null = null;
  let bd = radius * radius;
  for (const it of items) {
    const d = d2(at(it), p);
    if (d <= bd) {
      bd = d;
      best = it;
    }
  }
  return best;
}

/** A pen stroke with the points a finger dwelt on taken out. Keeps the shape, loses the noise. */
export function thinStroke(pts: readonly Pt[], tolerance = 1.5): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || distance(last, p) >= tolerance) out.push([p[0], p[1]]);
  }
  if (out.length === 1 && pts.length > 1) out.push([pts[pts.length - 1]![0], pts[pts.length - 1]![1]]);
  return out;
}

/** A coordinate as it is stored: a tenth of a point is finer than any finger. */
export const tenth = (n: number): number => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- the window

/** How the page sits in the screen: page units scaled, then shifted. */
export type Viewport = { scale: number; tx: number; ty: number };

export const MIN_SCALE = 0.15;
export const MAX_SCALE = 3;

export const clampScale = (s: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export function toPage(p: Pt, v: Viewport): Pt {
  return [(p[0] - v.tx) / v.scale, (p[1] - v.ty) / v.scale];
}

export function toView(p: Pt, v: Viewport): Pt {
  return [p[0] * v.scale + v.tx, p[1] * v.scale + v.ty];
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function bounds(pts: readonly Pt[]): Bounds | null {
  if (!pts.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * The window that shows all of `b` inside a `w` by `h` screen with `margin`
 * round it, centred, never larger than `maxScale`.
 */
export function fitViewport(b: Bounds, w: number, h: number, margin: number, maxScale = 1): Viewport {
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  const scale = clampScale(Math.min(maxScale, (w - 2 * margin) / bw, (h - 2 * margin) / bh));
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return { scale, tx: w / 2 - cx * scale, ty: h / 2 - cy * scale };
}

/** Whether all of `b` is on a `w` by `h` screen through `v`, with `margin` to spare. */
export function contained(b: Bounds, v: Viewport, w: number, h: number, margin: number): boolean {
  const [x0, y0] = toView([b.minX, b.minY], v);
  const [x1, y1] = toView([b.maxX, b.maxY], v);
  return x0 >= margin && y0 >= margin && x1 <= w - margin && y1 <= h - margin;
}

/** The window zoomed by `factor` about the screen point `about`. */
export function zoomAbout(v: Viewport, factor: number, about: Pt): Viewport {
  const scale = clampScale(v.scale * factor);
  const k = scale / v.scale;
  return { scale, tx: about[0] - (about[0] - v.tx) * k, ty: about[1] - (about[1] - v.ty) * k };
}

/**
 * A line cut to a rectangle (Liang–Barsky), or null when it misses. Done here
 * rather than with an SVG clip path, which needs an id and a <defs> that not
 * every renderer honours inside a group.
 */
export function clip(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: { x0: number; y0: number; x1: number; y1: number }
): [number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let a = 0;
  let b = 1;
  const edges: [number, number][] = [
    [-dx, x0 - r.x0],
    [dx, r.x1 - x0],
    [-dy, y0 - r.y0],
    [dy, r.y1 - y0],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const u = q / p;
    if (p < 0) a = Math.max(a, u);
    else b = Math.min(b, u);
    if (a > b) return null;
  }
  return [x0 + a * dx, y0 + a * dy, x0 + b * dx, y0 + b * dy];
}
