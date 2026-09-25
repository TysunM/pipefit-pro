// Iso paper
// ---------
// An isometric drawing is three axes on a flat sheet: vertical, and two at
// thirty degrees off horizontal for the two plan directions. Every fitter has
// drawn a run on the dotted paper that makes those axes easy to follow. This
// is that paper, and the rule that keeps a finger on it.
//
// The dots are a lattice. Call the two plan axes E and N, each one dot apart:
// screen x runs along (E − N) and screen y along −(E + N), so vertical is
// E + N and lands on the same dots. Every snapped point is a lattice point, so
// a run can always be picked up again exactly where it was left.
//
// A rolling offset is a diagonal on iso paper — halfway between two axes — so
// the snap takes those too. Between the three axes and their diagonals every
// thirty degrees is a direction a pipe can run, and nothing in between is.

export type Pt = [number, number];

/** Dot spacing in points. Coarse enough to hit in a glove, fine enough to draw a tee. */
export const ISO_GRID = 20;

const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;

/** The lattice point at E-count `a`, N-count `b`. */
export function lattice(a: number, b: number, g: number): Pt {
  return [(a - b) * C30 * g, -(a + b) * S30 * g];
}

const d2 = (p: Pt, q: Pt) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;

export const distance = (p: Pt, q: Pt): number => Math.sqrt(d2(p, q));

/**
 * The lattice point nearest to `p`.
 *
 * Rounding the two lattice counts separately can land one dot off on a
 * triangular lattice, so the four dots around the point are tried and the
 * closest wins.
 */
export function nearestLattice(p: Pt, g: number): Pt {
  const X = p[0] / (C30 * g);
  const Y = -p[1] / (S30 * g);
  const a0 = (X + Y) / 2;
  const b0 = (Y - X) / 2;
  let best = lattice(Math.round(a0), Math.round(b0), g);
  let bd = d2(best, p);
  for (const a of [Math.floor(a0), Math.ceil(a0)])
    for (const b of [Math.floor(b0), Math.ceil(b0)]) {
      const q = lattice(a, b, g);
      const d = d2(q, p);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
  return best;
}

export type Snap = {
  end: Pt;
  /** How many dots the segment covers. Zero means too short to be a segment. */
  steps: number;
  /** One of the three iso axes, or a diagonal between two of them. */
  axis: 'iso' | 'diagonal';
};

/**
 * Where a segment dragged from `from` towards `to` actually ends.
 *
 * The direction is rounded to the nearest thirty degrees and the length to
 * the nearest dot along it. `from` is a lattice point, so the end is one too.
 */
export function snapSegment(from: Pt, to: Pt, g: number): Snap {
  const vx = to[0] - from[0];
  const vy = to[1] - from[1];
  const len = Math.hypot(vx, vy);
  if (len < g * 0.45) return { end: from, steps: 0, axis: 'iso' };

  const sector = Math.round(Math.atan2(vy, vx) / (Math.PI / 6));
  const angle = (sector * Math.PI) / 6;
  const dir: Pt = [Math.cos(angle), Math.sin(angle)];
  // Odd sectors are the three axes (±30°, ±90°, ±150°), one dot apart. Even
  // ones are the diagonals, where the next dot along is √3 further.
  const axis: Snap['axis'] = sector % 2 === 0 ? 'diagonal' : 'iso';
  const step = axis === 'iso' ? g : g * Math.sqrt(3);
  const steps = Math.round((vx * dir[0] + vy * dir[1]) / step);
  if (steps < 1) return { end: from, steps: 0, axis };

  const end = nearestLattice([from[0] + steps * step * dir[0], from[1] + steps * step * dir[1]], g);
  return { end, steps, axis };
}

/** The nearest of `nodes` within `radius` of `p`, or null. */
export function nearestNode(p: Pt, nodes: readonly Pt[], radius: number): Pt | null {
  let best: Pt | null = null;
  let bd = radius * radius;
  for (const n of nodes) {
    const d = d2(n, p);
    if (d <= bd) {
      bd = d;
      best = n;
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
