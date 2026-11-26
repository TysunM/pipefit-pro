import { VIEW, layout, pointAt, type Laid } from '../../calc/knots/rope';
import { PULL_DRAG } from '../../calc/knots/trace';
import { checkMarks, faultDrawing, morphRopes, type Fault, type Knot } from '../../calc/knots/knots';

// A knot is laid out once (its crossings found, its rope measured) and kept: the hub draws them all.
const cache = new Map<string, Laid>();
export function laidOf(k: Knot): Laid {
  let l = cache.get(k.id);
  if (!l) {
    l = layout(k.ropes, k.cross);
    cache.set(k.id, l);
  }
  return l;
}

/** Steps from as tied to pulled tight: each laid out the first time it is drawn, then kept. */
export const FRAMES = 24;
const frames = new Map<string, Laid>();
export function laidAt(k: Knot, t: number): Laid {
  const f = Math.max(0, Math.min(FRAMES, Math.round(t * FRAMES)));
  if (f === 0) return laidOf(k);
  const key = `${k.id}:${f}`;
  let l = frames.get(key);
  if (!l) {
    l = layout(morphRopes(k, f / FRAMES), k.cross);
    frames.set(key, l);
  }
  return l;
}

const EDGE = 10;

/**
 * Where to grab each pulled part, part way to tight, and which way to pull it.
 * An end at the edge of the drawing is grabbed further in along its line, far
 * enough that a whole pull stays on the drawing, not off the side of the screen.
 */
export function pullsAt(k: Knot, t: number): { x: number; y: number; dx: number; dy: number }[] {
  const ropes = morphRopes(k, t);
  return k.tight.pulls.map((p) => {
    const q = ropes[p.rope]!.pts[p.at]!;
    const [dx, dy] = p.dir;
    let back = 0;
    for (const [v, d] of [
      [q[0], dx],
      [q[1], dy],
    ] as const) {
      const to = v + d * PULL_DRAG;
      if (d !== 0 && (to < EDGE || to > VIEW - EDGE)) back = Math.max(back, (to < EDGE ? EDGE - to : to - (VIEW - EDGE)) / Math.abs(d));
    }
    return { x: q[0] - dx * back, y: q[1] - dy * back, dx, dy };
  });
}

const full = (l: Laid) => l.samples.map((s) => s[s.length - 1]?.len ?? 0);

/** A fault drawn, laid out once and kept, with how far each rope is shown. */
const faults = new Map<string, { laid: Laid; shown: number[] }>();
export function laidFault(k: Knot, f: Fault): { laid: Laid; shown: number[] } {
  const key = `${k.id}:${f.id}`;
  let v = faults.get(key);
  if (!v) {
    const d = faultDrawing(k, f);
    const laid = f.kind === 'loose' ? laidOf(k) : layout(d.ropes, d.cross);
    v = { laid, shown: full(laid).map((len, r) => Math.min(len, d.keep[r] ?? len)) };
    faults.set(key, v);
  }
  return v;
}

/** The knot tied right and pulled tight, shown whole. */
export function laidSet(k: Knot): { laid: Laid; shown: number[] } {
  const laid = laidAt(k, 1);
  return { laid, shown: full(laid) };
}

const marks = new Map<string, ReturnType<typeof checkMarks>>();
/** The numbered rings on the knot pulled tight, one for each place a check points. */
export function marksOf(k: Knot) {
  let m = marks.get(k.id);
  if (!m) {
    m = checkMarks(k);
    marks.set(k.id, m);
  }
  return m;
}

export type Frame = { x: number; y: number; s: number };
const frames2 = new Map<string, Frame>();
/**
 * One frame for a fault and the knot tied right, side by side: zoomed in on
 * where they cross, with a cut tail's end in it, the same for both so they
 * compare like for like.
 */
export function pairFrame(k: Knot, f: Fault): Frame {
  const key = `${k.id}:${f.id}`;
  let v = frames2.get(key);
  if (!v) {
    const right = laidSet(k);
    const wrong = laidFault(k, f);
    const pts: { x: number; y: number }[] = [...right.laid.crossings, ...wrong.laid.crossings];
    wrong.shown.forEach((len, r) => {
      if (len < (wrong.laid.samples[r]!.at(-1)?.len ?? 0)) pts.push(pointAt(wrong.laid.samples[r]!, len));
    });
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 46;
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
    const side = Math.min(VIEW, Math.max(150, Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0));
    const cx = (x0 + Math.max(...xs) + pad) / 2;
    const cy = (y0 + Math.max(...ys) + pad) / 2;
    const clamp = (c: number) => Math.max(0, Math.min(VIEW - side, c - side / 2));
    v = { x: clamp(cx), y: clamp(cy), s: side };
    frames2.set(key, v);
  }
  return v;
}
