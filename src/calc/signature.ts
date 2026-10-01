// A signature, kept small
// -----------------------
// A finger signature is a few strokes of a few hundred points each, and a test
// record carries three of them. Kept as JSON arrays that is kilobytes a
// signature, and the whole log lives in one stored value on the phone, which
// Android will not read back past a couple of megabytes. So a signature is
// thinned to the points that change its shape, and each point is written as
// three characters.
//
// The box is 300 by 100 — the shape of the line on a form. A point is x·128+y
// in base 64; a space separates strokes. Nothing else is in the string, so it
// is checked by reading it.

export const SIG_W = 300;
export const SIG_H = 100;
/** Points kept per signature, all strokes together. */
export const SIG_POINTS = 600;

export type Pt = readonly [number, number];

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const IDX = new Map([...B64].map((c, i) => [c, i]));

const clamp = (v: number, hi: number) => Math.min(hi, Math.max(0, Math.round(v)));

function enc([x, y]: Pt): string {
  const v = clamp(x, SIG_W) * 128 + clamp(y, SIG_H);
  return B64[v >> 12]! + B64[(v >> 6) & 63]! + B64[v & 63]!;
}

/** How far a point is off the line through two others. */
function offLine(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

/**
 * The points that make the shape: any point within `tolerance` of the line
 * between its neighbours goes (Ramer–Douglas–Peucker). The ends always stay.
 */
export function simplify(pts: readonly Pt[], tolerance = 0.7): Pt[] {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let far = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = offLine(pts[i]!, pts[a]!, pts[b]!);
      if (d > far) [far, at] = [d, i];
    }
    if (at !== -1 && far > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Strokes in box units to the kept string. Past the point cap the rest is left off. */
export function encodeSig(strokes: readonly (readonly Pt[])[]): string {
  const out: string[] = [];
  let left = SIG_POINTS;
  for (const s of strokes) {
    if (left <= 0) break;
    const kept = simplify(s.map(([x, y]) => [clamp(x, SIG_W), clamp(y, SIG_H)] as Pt)).slice(0, left);
    if (!kept.length) continue;
    left -= kept.length;
    out.push(kept.map(enc).join(''));
  }
  return out.join(' ');
}

/** The kept string back to strokes. A stroke that does not read is left out. */
export function decodeSig(sig: string): Pt[][] {
  const out: Pt[][] = [];
  for (const word of sig.split(' ')) {
    if (!word || word.length % 3) continue;
    const pts: Pt[] = [];
    for (let i = 0; i < word.length; i += 3) {
      const a = IDX.get(word[i]!);
      const b = IDX.get(word[i + 1]!);
      const c = IDX.get(word[i + 2]!);
      if (a === undefined || b === undefined || c === undefined) {
        pts.length = 0;
        break;
      }
      const v = (a << 12) | (b << 6) | c;
      const x = v >> 7;
      const y = v & 127;
      if (x > SIG_W || y > SIG_H) {
        pts.length = 0;
        break;
      }
      pts.push([x, y]);
    }
    if (pts.length) out.push(pts);
  }
  return out;
}

/** A stored signature, read and written again: whatever was not a signature is gone. */
export const cleanSig = (v: unknown): string => (typeof v === 'string' ? encodeSig(decodeSig(v)) : '');

/** Whether anything was drawn. */
export const hasSig = (sig: string): boolean => sig.trim().length > 0;

/** One stroke as an SVG path: a line through its points, or a dot when it is one point. */
export function strokePath(s: readonly Pt[]): string {
  if (s.length === 1) {
    const [x, y] = s[0]!;
    return `M${x} ${y}h0.01`;
  }
  return s.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
}

/** The signature as a self-contained SVG, for the printed record. Empty when nothing was drawn. */
export function sigSvg(sig: string): string {
  const strokes = decodeSig(sig);
  if (!strokes.length) return '';
  const d = strokes.map(strokePath).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIG_W} ${SIG_H}" preserveAspectRatio="xMidYMid meet">` +
    `<path d="${d}" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}
