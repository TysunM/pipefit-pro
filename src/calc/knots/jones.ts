// Which knot a drawing is
// -----------------------
// The Jones polynomial of a knot drawing, from the crossings the rope engine
// finds and the over/under the knot says. Two drawings of the same knot give
// the same polynomial, so the tests use it to prove a drawing is the knot it is
// named for: a figure eight is a figure eight, a square knot isn't a granny,
// and a fault drawn with one crossing wrong is the knot (or no knot) it says.
//
// The rope's ends are closed outside the drawing, so they must lie on its
// outside edge. Used by the tests only: nothing in the app imports it.

import { layout, type Rope } from './rope';

/** A Laurent polynomial, exponent to coefficient. */
export type Poly = Map<number, number>;

const add = (a: Poly, e: number, c: number) => {
  const v = (a.get(e) ?? 0) + c;
  if (v) a.set(e, v);
  else a.delete(e);
};
const mul = (a: Poly, b: Poly): Poly => {
  const out: Poly = new Map();
  a.forEach((ca, ea) => b.forEach((cb, eb) => add(out, ea + eb, ca * cb)));
  return out;
};

/**
 * One closed loop through the ropes: each rope run forwards or backwards, in
 * order, each run's end joined to the next run's start outside the drawing.
 */
export type Closure = readonly { rope: number; back?: boolean }[];

type Pass = { c: number; over: boolean; dx: number; dy: number };

/** The Jones polynomial in t, as exponents of t^(1/4) (so 4 is t, -8 is t^-2). */
export function jones(ropes: readonly Rope[], cross: string, closure: Closure): Poly {
  const laid = layout(ropes, cross);
  const passes: Pass[] = [];
  for (const run of closure) {
    const s = laid.samples[run.rope]!;
    const here: (Pass & { len: number })[] = [];
    laid.crossings.forEach((c, i) => {
      for (const side of [c.later, c.earlier]) {
        if (side.rope !== run.rope) continue;
        const over = (cross[i] === 'o') === (side === c.later);
        // The rope's way at the crossing, in the direction this run travels it (y up).
        let k = s.findIndex((p) => p.len >= side.len);
        k = Math.min(s.length - 1, Math.max(1, k));
        const sign = run.back ? -1 : 1;
        here.push({ c: i, over, dx: (s[k]!.x - s[k - 1]!.x) * sign, dy: -(s[k]!.y - s[k - 1]!.y) * sign, len: side.len });
      }
    });
    here.sort((a, b) => (run.back ? b.len - a.len : a.len - b.len));
    passes.push(...here);
  }
  const n = laid.crossings.length;
  if (passes.length !== 2 * n) throw new Error('a crossing is on no rope in the closure');
  if (!n) return new Map([[0, 1]]);

  // Edge e runs from pass e to pass e+1 (round the loop). At crossing c, PD order:
  // the under strand's edge in, then anticlockwise.
  const pd: [number, number, number, number][] = [];
  let writhe = 0;
  for (let c = 0; c < n; c += 1) {
    const ui = passes.findIndex((p) => p.c === c && !p.over);
    const oi = passes.findIndex((p) => p.c === c && p.over);
    const u = passes[ui]!;
    const o = passes[oi]!;
    const m = passes.length;
    const uIn = (ui - 1 + m) % m;
    const uOut = ui;
    const oIn = (oi - 1 + m) % m;
    const oOut = oi;
    // A right-handed (positive) crossing: the over strand crosses from the under strand's right to its left.
    const positive = u.dx * o.dy - u.dy * o.dx < 0;
    pd[c] = positive ? [uIn, oOut, uOut, oIn] : [uIn, oIn, uOut, oOut];
    writhe += positive ? 1 : -1;
  }

  // Kauffman bracket over every state: A-smoothing joins (a,b)(c,d), B joins (a,d)(b,c).
  const bracket: Poly = new Map();
  const m = 2 * n;
  for (let state = 0; state < 1 << n; state += 1) {
    const parent = Array.from({ length: m }, (_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
    const join = (x: number, y: number) => (parent[find(x)] = find(y));
    let as = 0;
    pd.forEach(([a, b, c, d], i) => {
      if (state & (1 << i)) {
        join(a, d);
        join(b, c);
      } else {
        as += 1;
        join(a, b);
        join(c, d);
      }
    });
    let loops = 0;
    for (let i = 0; i < m; i += 1) if (find(i) === i) loops += 1;
    // A^(#A - #B) * (-A^2 - A^-2)^(loops - 1)
    let term: Poly = new Map([[as - (n - as), 1]]);
    for (let l = 1; l < loops; l += 1) term = mul(term, new Map([[2, -1], [-2, -1]]));
    term.forEach((c, e) => add(bracket, e, c));
  }
  // V(t) = (-A^3)^(-w) <K>, A = t^(-1/4): an exponent of A, negated, is one of t^(1/4).
  const out: Poly = new Map();
  const f = writhe % 2 === 0 ? 1 : -1;
  bracket.forEach((c, e) => add(out, -(e - 3 * writhe), c * f));
  return out;
}

/** The polynomial written out, highest power first: `t^2 - t + 1 - t^-1 + t^-2`. */
export function polyText(p: Poly): string {
  const terms = [...p.entries()].sort((a, b) => b[0] - a[0]);
  if (!terms.length) return '0';
  return terms
    .map(([e, c], i) => {
      const pow = e % 4 === 0 ? e / 4 : `${e}/4`;
      const v = e === 0 ? '' : pow === 1 ? 't' : `t^${pow}`;
      const mag = Math.abs(c) === 1 && v ? '' : String(Math.abs(c));
      return `${i === 0 ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + '}${mag}${v}`;
    })
    .join('');
}
