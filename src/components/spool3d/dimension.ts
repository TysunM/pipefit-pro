// Putting the dimensions on the drawing
// -------------------------------------
// A spool drawing with no figures on it is a picture. A spool drawing with a
// figure against every leg and an angle at every fitting is a drawing, and a
// drawing is the thing a man can take to a bench and build from.
//
// The whole difficulty is where to put them. A figure on top of the pipe is
// unreadable, a figure on top of another figure is worse, and a figure off the
// edge of the page is not there at all. Numbers are also the one thing on the
// drawing that cannot be inferred from what is around it, so they never
// overlap and they never leave the canvas — everything else gives way first.
//
// So each one is offered a short list of places, in the order a draughtsman
// would try them, and takes the first that is clear of the pipe, clear of
// every figure already down, and inside the page. If it has had to travel to
// get there it takes a leader line back to what it belongs to, the same as on
// paper.

export type Box = { x: number; y: number; w: number; h: number };
export type Seg = { ax: number; ay: number; bx: number; by: number };

export type LabelWant = {
  key: string;
  /** What it labels, on the page. */
  ax: number;
  ay: number;
  /** The way the thing it labels runs, if it runs anywhere on the page. */
  ux: number;
  uy: number;
  /** Nothing on the page: a leg square on to the viewer, drawn as a disc. */
  collapsed: boolean;
  lines: string[];
  /** Bigger goes down first and gets the better place. */
  weight: number;
  tone: 'leg' | 'elbow';
};

export type Placed = LabelWant & {
  x: number;
  y: number;
  box: Box;
  /** Set when it ended up far enough away to need pointing at. */
  leader: boolean;
};

/** A bold 10px sans, measured wide enough that a tight fit is still a fit. */
const CHAR = 5.6;
const LINE = 11;
const PAD_X = 3;
const PAD_Y = 2;

export function labelBox(x: number, y: number, lines: string[]): Box {
  const w = Math.max(...lines.map((l) => l.length)) * CHAR + PAD_X * 2;
  const h = lines.length * LINE + PAD_Y * 2;
  return { x: x - w / 2, y: y - h / 2, w, h };
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Whether a line on the page passes through a box. Liang–Barsky, clipped. */
export function segmentHitsBox(s: Seg, b: Box): boolean {
  const inside = (x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  if (inside(s.ax, s.ay) || inside(s.bx, s.by)) return true;

  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, s.ax - b.x],
    [dx, b.x + b.w - s.ax],
    [-dy, s.ay - b.y],
    [dy, b.y + b.h - s.ay],
  ];
  for (const [p, q] of edges) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return t0 <= t1;
}

const within = (b: Box, w: number, h: number, edge: number): boolean =>
  b.x >= edge && b.y >= edge && b.x + b.w <= w - edge && b.y + b.h <= h - edge;

/** How far out the first try sits: clear of the pipe and clear of the line. */
const FIRST = 15;
const STEP = 12;
const TRIES = 4;
/** How far along its own leg a figure will slide to find room, as a share of the offset. */
const SLIDES = [0, -1.6, 1.6, -3.2, 3.2];
/** The coarseness of the last-resort sweep of the page. */
const GRID = 9;
/** Past this the figure no longer reads as belonging to the leg, so it gets a leader. */
const LEADER_AT = 30;

/** Where a figure would rather go, best first. */
function candidates(want: LabelWant): { x: number; y: number }[] {
  // Off the side of what it labels, both sides, then further out. A leg that
  // has collapsed to a point has no side, so it takes the diagonals.
  const dirs: [number, number][] = want.collapsed
    ? [
        [0.71, -0.71],
        [0.71, 0.71],
        [-0.71, -0.71],
        [-0.71, 0.71],
        [0, -1],
        [1, 0],
      ]
    : [
        [-want.uy, want.ux],
        [want.uy, -want.ux],
      ];

  const out: { x: number; y: number }[] = [];
  for (let step = 0; step < TRIES; step += 1) {
    const reach = FIRST + step * STEP;
    for (const slide of SLIDES) {
      // Sliding is along the leg, which is only a direction when there is one.
      const sx = want.collapsed ? 0 : want.ux * slide * FIRST;
      const sy = want.collapsed ? 0 : want.uy * slide * FIRST;
      for (const [nx, ny] of dirs) out.push({ x: want.ax + nx * reach + sx, y: want.ay + ny * reach + sy });
    }
  }
  return out;
}

/**
 * Place every figure so none of them covers the pipe, another figure, or the
 * edge of the page.
 *
 * Offered in weight order, so on a crowded drawing the long legs — the ones
 * somebody is going to cut — get the obvious places and the short ones take
 * what is left. Each one tries the places a draughtsman would try first: off
 * either side of what it labels, sliding along it, then further out.
 *
 * When the obvious places are all taken it sweeps the page for the nearest
 * clear spot rather than giving up, because a figure somewhere awkward can be
 * read and a figure under another figure cannot. Only when the page itself has
 * no room left does it settle for overlapping, and then it takes a leader line
 * so it is at least clear what it belongs to. A dimension missing off a
 * drawing is worse than a dimension in a poor place: only one of the two can
 * be noticed.
 */
export function placeLabels(
  wants: LabelWant[],
  pipes: Seg[],
  width: number,
  height: number,
  edge = 2,
  /** Corners of the canvas already spoken for, such as the compass. */
  reserved: Box[] = []
): Placed[] {
  const order = [...wants].sort((a, b) => b.weight - a.weight);
  // Reserved ground counts as taken from the start, so nothing is ever placed
  // where something else will later be drawn over the top of it.
  const taken: Box[] = [...reserved];
  const out: Placed[] = [];

  for (const want of order) {
    const clear = (x: number, y: number): Box | null => {
      const box = labelBox(x, y, want.lines);
      if (!within(box, width, height, edge)) return null;
      if (taken.some((t) => overlaps(t, box))) return null;
      if (pipes.some((s) => segmentHitsBox(s, box))) return null;
      return box;
    };

    let at: { x: number; y: number; box: Box } | null = null;
    for (const c of candidates(want)) {
      const box = clear(c.x, c.y);
      if (box) {
        at = { ...c, box };
        break;
      }
    }

    // Nowhere obvious. Sweep the page and take the nearest place that is free,
    // pipe and all — and if even that fails, free of the other figures alone.
    if (!at) at = sweep(want, clear, width, height, edge) ?? sweepClearOfFigures(want, taken, width, height, edge);

    // The page is full. Sit it at the first place it wanted, inside the edges.
    const fallback = candidates(want)[0] ?? { x: want.ax, y: want.ay };
    const raw = at?.box ?? labelBox(fallback.x, fallback.y, want.lines);
    const box = {
      ...raw,
      x: Math.max(edge, Math.min(width - edge - raw.w, raw.x)),
      y: Math.max(edge, Math.min(height - edge - raw.h, raw.y)),
    };
    const x = box.x + box.w / 2;
    const y = box.y + box.h / 2;

    taken.push(box);
    out.push({ ...want, x, y, box, leader: Math.hypot(x - want.ax, y - want.ay) > LEADER_AT });
  }

  // Back into the order they were handed over, so the drawing is stable.
  const rank = new Map(wants.map((w, i) => [w.key, i]));
  return out.sort((a, b) => (rank.get(a.key) ?? 0) - (rank.get(b.key) ?? 0));
}

/** The nearest place on a coarse grid where a figure is wholly clear. */
function sweep(
  want: LabelWant,
  clear: (x: number, y: number) => Box | null,
  width: number,
  height: number,
  edge: number
): { x: number; y: number; box: Box } | null {
  let best: { x: number; y: number; box: Box } | null = null;
  let bestD = Infinity;
  for (let y = edge; y <= height - edge; y += GRID) {
    for (let x = edge; x <= width - edge; x += GRID) {
      const d = Math.hypot(x - want.ax, y - want.ay);
      if (d >= bestD) continue;
      const box = clear(x, y);
      if (!box) continue;
      best = { x, y, box };
      bestD = d;
    }
  }
  return best;
}

/**
 * The same sweep, ignoring the pipe.
 *
 * A drawing dense enough that no figure can avoid the iron is still a drawing
 * that has to carry its figures, and a figure on the pipe can be read while a
 * figure under another figure cannot. So the pipe gives way before they do.
 */
function sweepClearOfFigures(
  want: LabelWant,
  taken: Box[],
  width: number,
  height: number,
  edge: number
): { x: number; y: number; box: Box } | null {
  return sweep(
    want,
    (x, y) => {
      const box = labelBox(x, y, want.lines);
      if (!within(box, width, height, edge)) return null;
      return taken.some((t) => overlaps(t, box)) ? null : box;
    },
    width,
    height,
    edge
  );
}
