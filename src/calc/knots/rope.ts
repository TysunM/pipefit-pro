// Rope, drawn
// -----------
// A knot here is a rope's path, point by point, the way its working end
// travels when the knot is tied: so showing the rope up to a point is showing
// the knot tied that far, and moving that point along is the motion of tying it.
//
// The path runs smooth through its points (centripetal Catmull-Rom: no loops
// or cusps however the points are spaced). Points marked 'b' go behind the
// pipe or post. Every place the rope crosses itself, or the other rope, is
// found from the drawing; the knot says, in the order the working end gets
// there, whether it goes over or under: "o" and "u", as a rigger says it.
// The rope is drawn in runs, lowest first, each with a dark edge then its
// core: the strand on top covers the one below with its edge either side,
// which is what reads as over and under on a screen.
//
// Pure: the screens draw the parts this returns.

/** A point on a rope: x, y, and 'b' where the rope goes behind the pipe or post. */
export type P = readonly [number, number] | readonly [number, number, 'b'];
export type Rope = { pts: readonly P[]; color: 'a' | 'b'; /** Points shown before any step: the standing part. */ start: number };
export type Prop = { kind: 'pipe'; y: number; r: number } | { kind: 'post'; x: number; r: number };

export const VIEW = 300;
export const ROPE_W = 12;
const EDGE = 2.2;
const PER_SPAN = 12;

const BEHIND = -1;
const UNDER = 1;
const PLAIN = 2;
const OVER = 3;
/** How far either side of a crossing, along the rope, the strand is drawn over or under. */
const CROSS_REACH = ROPE_W * 1.1;
/** The pipe or post sits between the rope behind it and the rope in front. */
const PROP_LEVEL = 0;

export type Sample = { x: number; y: number; at: number; len: number };

type V = { x: number; y: number };
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);

/** Points along the smooth path, PER_SPAN to a span; `at` is the place along the points (2.5 = halfway from the third to the fourth). */
export function samples(pts: readonly P[]): Sample[] {
  const v = pts.map(([x, y]) => ({ x, y }));
  if (v.length < 2) return v.map((p) => ({ ...p, at: 0, len: 0 }));
  const first = { x: 2 * v[0]!.x - v[1]!.x, y: 2 * v[0]!.y - v[1]!.y };
  const n = v.length;
  const last = { x: 2 * v[n - 1]!.x - v[n - 2]!.x, y: 2 * v[n - 1]!.y - v[n - 2]!.y };
  const all = [first, ...v, last];
  const out: Sample[] = [];
  let len = 0;
  let prev: V | null = null;
  for (let i = 0; i < n - 1; i += 1) {
    const [p0, p1, p2, p3] = [all[i]!, all[i + 1]!, all[i + 2]!, all[i + 3]!];
    // Centripetal knots: the square root of the distances.
    const k = (a: V, b: V) => Math.max(Math.sqrt(dist(a, b)), 1e-4);
    const t0 = 0;
    const t1 = t0 + k(p0, p1);
    const t2 = t1 + k(p1, p2);
    const t3 = t2 + k(p2, p3);
    for (let s = 0; s < PER_SPAN || (i === n - 2 && s === PER_SPAN); s += 1) {
      const t = t1 + ((t2 - t1) * s) / PER_SPAN;
      const lerp = (a: V, b: V, ta: number, tb: number) => {
        const w = tb - ta < 1e-9 ? 0 : (t - ta) / (tb - ta);
        return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
      };
      const a1 = lerp(p0, p1, t0, t1);
      const a2 = lerp(p1, p2, t1, t2);
      const a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2);
      const b2 = lerp(a2, a3, t1, t3);
      const c = lerp(b1, b2, t1, t2);
      if (prev) len += dist(prev, c);
      out.push({ x: c.x, y: c.y, at: i + s / PER_SPAN, len });
      prev = c;
    }
  }
  return out;
}

/** How far along the rope, in drawing units, its point `i` is. */
export function lengthTo(s: readonly Sample[], i: number): number {
  const k = Math.min(s.length - 1, Math.max(0, Math.round(i * PER_SPAN)));
  return s[k]!.len;
}

/** The rope's samples up to a length along it, the last one cut to fall exactly there. */
export function upTo(s: readonly Sample[], length: number): Sample[] {
  if (!s.length) return [];
  if (length >= s[s.length - 1]!.len) return [...s];
  const out: Sample[] = [];
  for (let k = 0; k < s.length; k += 1) {
    const p = s[k]!;
    if (p.len <= length) {
      out.push(p);
      continue;
    }
    const q = out[out.length - 1];
    if (q) {
      const w = (length - q.len) / Math.max(p.len - q.len, 1e-9);
      out.push({ x: q.x + (p.x - q.x) * w, y: q.y + (p.y - q.y) * w, at: q.at + (p.at - q.at) * w, len: length });
    }
    break;
  }
  return out;
}

/** Where along the rope, and which way it runs, at a length along it. */
export function pointAt(s: readonly Sample[], length: number): { x: number; y: number; dx: number; dy: number } {
  const cut = upTo(s, length);
  const p = cut[cut.length - 1] ?? s[0]!;
  const q = cut[cut.length - 2] ?? s[1] ?? p;
  const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
  return cut.length >= 2 ? { x: p.x, y: p.y, dx: (p.x - q.x) / d, dy: (p.y - q.y) / d } : { x: p.x, y: p.y, dx: (q.x - p.x) / d, dy: (q.y - p.y) / d };
}

export type Crossing = { x: number; y: number; later: { rope: number; len: number }; earlier: { rope: number; len: number } };

/** Every place a strand crosses another in front of the pipe, in the order the working end gets there. */
export function findCrossings(ropes: readonly Rope[], all: readonly Sample[][]): Crossing[] {
  const behind = (r: number, at: number) => ropes[r]!.pts[Math.min(ropes[r]!.pts.length - 1, Math.round(at))]![2] === 'b';
  const segs: { a: Sample; b: Sample; rope: number; k: number }[] = [];
  all.forEach((s, r) => {
    for (let k = 1; k < s.length; k += 1) if (!behind(r, (s[k - 1]!.at + s[k]!.at) / 2)) segs.push({ a: s[k - 1]!, b: s[k]!, rope: r, k });
  });
  const out: Crossing[] = [];
  for (let i = 0; i < segs.length; i += 1) {
    for (let j = i + 1; j < segs.length; j += 1) {
      const p = segs[i]!;
      const q = segs[j]!;
      if (p.rope === q.rope && Math.abs(p.k - q.k) < 3) continue;
      const x = cross(p.a, p.b, q.a, q.b);
      if (!x) continue;
      const lp = p.a.len + Math.hypot(x.x - p.a.x, x.y - p.a.y);
      const lq = q.a.len + Math.hypot(x.x - q.a.x, x.y - q.a.y);
      const pLater = p.rope > q.rope || (p.rope === q.rope && lp > lq);
      const a = { rope: p.rope, len: lp };
      const b = { rope: q.rope, len: lq };
      out.push({ x: x.x, y: x.y, later: pLater ? a : b, earlier: pLater ? b : a });
    }
  }
  // Two strands crossing at a shallow angle can show as two hits a sample apart: one crossing.
  const merged: Crossing[] = [];
  for (const c of out) {
    if (!merged.some((m) => m.later.rope === c.later.rope && m.earlier.rope === c.earlier.rope && Math.abs(m.later.len - c.later.len) < 4 && Math.abs(m.earlier.len - c.earlier.len) < 4)) merged.push(c);
  }
  return merged.sort((a, b) => a.later.rope - b.later.rope || a.later.len - b.later.len);
}

/** A knot laid out once: its ropes sampled, every sample's height, and its crossings. */
export type Laid = { samples: Sample[][]; level: number[][]; crossings: Crossing[] };

/**
 * `cross` says, crossing by crossing in tying order, whether the later strand goes over ("o") or under ("u").
 * A knot whose string does not match its crossings is laid out with every crossing plain: the tests catch it.
 */
export function layout(ropes: readonly Rope[], cross: string): Laid {
  const all = ropes.map((r) => samples(r.pts));
  const crossings = findCrossings(ropes, all);
  const level: number[][] = all.map((s, r) => s.map((p): number => (ropes[r]!.pts[Math.min(ropes[r]!.pts.length - 1, Math.round(p.at))]![2] === 'b' ? BEHIND : PLAIN)));
  crossings.forEach((c, i) => {
    const over = cross[i] === 'o';
    const mark = (side: { rope: number; len: number }, lv: number) => {
      all[side.rope]!.forEach((p, k) => {
        if (Math.abs(p.len - side.len) <= CROSS_REACH && level[side.rope]![k] !== BEHIND) level[side.rope]![k] = lv;
      });
    };
    if (cross[i] !== 'o' && cross[i] !== 'u') return;
    mark(c.later, over ? OVER : UNDER);
    mark(c.earlier, over ? UNDER : OVER);
  });
  return { samples: all, level, crossings };
}

export type Run = { rope: number; level: number; pts: Sample[]; first: boolean; last: boolean };

/** A shown rope cut into runs at one height. */
export function runs(rope: number, shown: readonly Sample[], level: readonly number[]): Run[] {
  const out: Run[] = [];
  let cur: Run | null = null;
  shown.forEach((p, k) => {
    const lv = level[Math.min(level.length - 1, k)]!;
    if (!cur || cur.level !== lv) {
      const join: Sample | null = cur ? cur.pts[cur.pts.length - 1]! : null;
      cur = { rope, level: lv, pts: join ? [join, p] : [p], first: !join, last: false };
      out.push(cur);
    } else cur.pts.push(p);
  });
  if (out.length) out[out.length - 1]!.last = true;
  return out.filter((r) => r.pts.length >= 2);
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
export const pathOf = (pts: readonly V[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join('');

export type Ink = { edge: string; core: string; lay: string; tape: string };
export const ROPE_INK: Record<Rope['color'], Ink> = {
  a: { edge: '#3a2108', core: '#f2922e', lay: '#b8601a', tape: '#2b2b2b' },
  b: { edge: '#0d2547', core: '#3b86e6', lay: '#1f5cb0', tape: '#2b2b2b' },
};

/** One thing to draw, in order: a stroke along a path, or the pipe or post. */
export type Part =
  | { kind: 'stroke'; d: string; color: string; width: number; cap: 'butt' | 'round'; dash?: string; dashOffset?: number; opacity?: number }
  | { kind: 'prop'; prop: Prop };

/**
 * Everything to draw for ropes shown to the given lengths, lowest first.
 * The working end is taped (a dark band, as a rigger tapes an end) so it can be told from the standing part.
 */
export function draw(ropes: readonly Rope[], props: readonly Prop[], laid: Laid, shownLength: readonly number[]): Part[] {
  const all: Run[] = [];
  // A rope not shown at all draws nothing, not a dot where it would start.
  ropes.forEach((_, i) => (shownLength[i] ?? 0) > 0.5 && all.push(...runs(i, upTo(laid.samples[i]!, shownLength[i] ?? 0), laid.level[i]!)));
  const ordered = all.map((r, k) => ({ r, k })).sort((a, b) => a.r.level - b.r.level || a.k - b.k);
  const parts: Part[] = [];
  let propsDone = false;
  const putProps = () => {
    if (propsDone) return;
    propsDone = true;
    for (const p of props) parts.push({ kind: 'prop', prop: p });
  };
  for (const { r } of ordered) {
    if (r.level > PROP_LEVEL) putProps();
    const ink = ROPE_INK[ropes[r.rope]!.color];
    const d = pathOf(r.pts);
    // A run with a rope end is drawn round at that end only: its other end butts the next run cleanly.
    const ends = r.first || r.last ? capsOf(r) : '';
    parts.push({ kind: 'stroke', d, color: ink.edge, width: ROPE_W + 2 * EDGE, cap: 'butt' });
    if (ends) parts.push({ kind: 'stroke', d: ends, color: ink.edge, width: ROPE_W + 2 * EDGE, cap: 'round' });
    parts.push({ kind: 'stroke', d, color: ink.core, width: ROPE_W, cap: 'butt' });
    if (ends) parts.push({ kind: 'stroke', d: ends, color: ink.core, width: ROPE_W, cap: 'round' });
    // The lay of the rope: bands across it, carried on from run to run.
    parts.push({ kind: 'stroke', d, color: ink.lay, width: ROPE_W - 3, cap: 'butt', dash: '2.4 4.2', dashOffset: -r.pts[0]!.len, opacity: 0.55 });
    if (r.last) {
      const tape = tapeOf(r);
      if (tape) parts.push({ kind: 'stroke', d: tape, color: ink.tape, width: ROPE_W - 1, cap: 'round' });
    }
  }
  putProps();
  return parts;
}

/** A dot at each rope end of a run, drawn round: the end caps without rounding the joins between runs. */
function capsOf(r: Run): string {
  const out: string[] = [];
  if (r.first) {
    const p = r.pts[0]!;
    out.push(`M${fmt(p.x)} ${fmt(p.y)}l0.01 0`);
  }
  if (r.last) {
    const p = r.pts[r.pts.length - 1]!;
    out.push(`M${fmt(p.x)} ${fmt(p.y)}l0.01 0`);
  }
  return out.join('');
}

/** The last few units of the working end, taped. */
function tapeOf(r: Run): string | null {
  const end = r.pts[r.pts.length - 1]!.len;
  const pts = r.pts.filter((p) => p.len >= end - 7);
  return pts.length < 2 ? null : pathOf(pts);
}

function cross(a: V, b: V, c: V, d: V): V | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  return t >= 0 && t < 1 && u >= 0 && u < 1 ? { x: a.x + r.x * t, y: a.y + r.y * t } : null;
}
