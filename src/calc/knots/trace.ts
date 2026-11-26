// Tying it with a finger
// ----------------------
// The game: the rope's end glows, and the fitter drags it along the path the
// knot takes, step by step. The end follows the finger only forwards, and only
// while the finger is on the path near where the end is now: a finger that
// wanders off counts one slip, once, until it comes back. Pure.

import type { Sample } from './rope';

/** In drawing units (the knot is 300 across). */
export const TRACE = {
  /** How near the path the finger must be for the end to follow it. */
  reach: 30,
  /** How far ahead along the path the end can jump in one move: no short cuts across the knot. */
  ahead: 48,
  /** How far off the path counts as a slip. */
  slip: 54,
  /** How near the glowing end a drag has to start. */
  start: 46,
} as const;

export type Trace = { len: number; off: boolean; slips: number };

/** The nearest point of the path to the finger, from where the end is now to a little ahead, not past the step's end. */
export function nearest(s: readonly Sample[], from: number, end: number, x: number, y: number): { len: number; dist: number } {
  let best = { len: from, dist: Infinity };
  const until = Math.min(end, from + TRACE.ahead);
  for (const p of s) {
    if (p.len < from - 1) continue;
    if (p.len > until) break;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < best.dist) best = { len: Math.min(p.len, end), dist: d };
  }
  return best;
}

/** The finger moved to (x, y): the end follows, or a slip is counted. */
export function move(t: Trace, s: readonly Sample[], end: number, x: number, y: number): Trace {
  const n = nearest(s, t.len, end, x, y);
  if (n.dist <= TRACE.reach) return { len: Math.max(t.len, n.len), off: false, slips: t.slips };
  if (n.dist > TRACE.slip && !t.off) return { ...t, off: true, slips: t.slips + 1 };
  return t;
}

/** Three stars for one slip or none, two for up to three. */
export const starsFor = (slips: number) => (slips <= 1 ? 3 : slips <= 3 ? 2 : 1);
