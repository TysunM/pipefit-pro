// Tying it with a finger
// ----------------------
// The game: the rope's end glows, and the fitter drags it along the path the
// knot takes, step by step. The end follows the finger only forwards, and only
// while the finger is on the path near where the end is now: a finger that
// wanders off counts one slip, once, until it comes back. From memory there
// is no line to see: the end still follows only the knot's path, and the phone
// buzzes as soon as the finger is off it. And at every crossing the end
// stops short and asks: over or under? Pure.

import { ROPE_W, type Laid } from './rope';
import type { Sample } from './rope';

/** In drawing units (the knot is 300 across). */
export const TRACE = {
  /** How near the path the finger must be for the end to follow it. */
  reach: 30,
  /** How far ahead along the path the end can jump in one move: no short cuts across the knot. */
  ahead: 48,
  /** How far off the path counts as a slip. */
  slip: 54,
  /** From memory, with no line to see: how far off the path buzzes, and counts. */
  buzz: 40,
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

/** The finger moved to (x, y): the end follows, or a slip is counted once it is further off than `slipAt`. */
export function move(t: Trace, s: readonly Sample[], end: number, x: number, y: number, slipAt: number = TRACE.slip): Trace {
  const n = nearest(s, t.len, end, x, y);
  if (n.dist <= TRACE.reach) return { len: Math.max(t.len, n.len), off: false, slips: t.slips };
  if (n.dist > slipAt && !t.off) return { ...t, off: true, slips: t.slips + 1 };
  return t;
}

/** How often, at most, the phone buzzes while a finger stays off the line. */
export const BUZZ_EVERY_MS = 300;

/** How far a pulled end is dragged, in drawing units, to pull it all the way tight. */
export const PULL_DRAG = 60;

/** How far one pull has gone, from where the drag started: along the way to pull it, never past tight or back past loose. */
export function pulled(from: number, dx: number, dy: number, dir: readonly [number, number]): number {
  return Math.max(0, Math.min(1, from + (dx * dir[0] + dy * dir[1]) / PULL_DRAG));
}

/** From memory: how far short of a crossing the end stops to ask over or under, so the answer isn't drawn before it is given. */
export const HOLD = ROPE_W * 1.6;

/** A crossing the end comes to: where along its rope, where the end stops to ask (a point the rope has), where on the drawing, and whether it goes over. */
export type Call = { i: number; len: number; stop: number; x: number; y: number; over: boolean };

/**
 * The crossings the end makes as it goes from `from` to `to` along `rope`, in
 * order: those where it is the strand laid later, so over or under is its to
 * choose. The strand laid first has nothing to cross yet.
 */
export function callsFor(laid: Laid, cross: string, rope: number, from: number, to: number): Call[] {
  const s = laid.samples[rope]!;
  // The end only ever rests on the rope's own points: stop on the last one short of the hold.
  const stopAt = (len: number) => s.reduce((best, p) => (p.len <= len - HOLD && p.len > best ? p.len : best), from);
  return laid.crossings
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.later.rope === rope && c.later.len > from + 0.5 && c.later.len <= to + 0.5)
    .map(({ c, i }) => ({ i, len: c.later.len, stop: stopAt(c.later.len), x: c.x, y: c.y, over: cross[i] === 'o' }))
    .sort((a, b) => a.len - b.len);
}

/** A wrong over-or-under call counts as two slips. */
export const missesFor = (slips: number, wrongCalls: number) => slips + 2 * wrongCalls;

/** Three stars for one slip or none, two for up to three. */
export const starsFor = (slips: number) => (slips <= 1 ? 3 : slips <= 3 ? 2 : 1);
