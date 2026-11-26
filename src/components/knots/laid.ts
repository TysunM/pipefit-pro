import { VIEW, layout, type Laid } from '../../calc/knots/rope';
import { PULL_DRAG } from '../../calc/knots/trace';
import { morphRopes, type Knot } from '../../calc/knots/knots';

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
