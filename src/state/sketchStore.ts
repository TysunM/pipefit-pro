// The sketch book
// ---------------
// A sketch is the strokes that made it, in the order they were made, so undo
// is a pop and a redraw is a replay. Nothing about it is solved: it is a
// drawing, kept as it was drawn, the way a page torn off an iso pad is.
//
// A run is kept in the world, as dot counts along east, north and up, so the
// page can be turned to another corner and the run is still the same run. Pen
// marks and notes are flat: they are kept beside the run node they were drawn
// nearest to, and go where it goes when the page turns.
//
// Everything here is pure; sketches.tsx binds it to the shared persistence.

import { Bounds, Corner, L3, Pt, bounds, lattice, nearestCounts, snapRun, tenth, toScreen } from '../calc/iso';

/**
 * Version 1 kept runs as page points, before the page could turn. It is read
 * and lifted into the world on the way in; the next write is version 2.
 */
export const SKETCHES_VERSION = 2;

export const MAX_SKETCHES = 100;
/** Strokes per sketch. A busy page is a few hundred; this is a runaway finger. */
export const MAX_STROKES = 3000;
/** Points per pen stroke. */
export const MAX_POINTS = 4000;
export const MAX_NOTE = 80;
export const MAX_NAME = 60;

export type Stroke =
  /** One straight piece of pipe, dot to dot, in the world. */
  | { kind: 'run'; from: L3; to: L3 }
  /** A pen line. Its points are offsets from the anchor's page position, or page points when unanchored. */
  | { kind: 'pen'; pts: Pt[]; anchor: L3 | null }
  /** Typed text, placed the same way. */
  | { kind: 'note'; at: Pt; text: string; anchor: L3 | null };

export type SavedSketch = {
  id: string;
  name: string;
  /** Where it is, or what it is for. May be empty. */
  place: string;
  strokes: Stroke[];
  createdAt: number;
  updatedAt: number;
};

export type SketchBook = {
  sketches: SavedSketch[];
  foreign: boolean;
  dropped: number;
};

export const emptyBook = (): SketchBook => ({ sketches: [], foreign: false, dropped: 0 });

// ------------------------------------------------------------- validation

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function validPt(v: unknown): Pt | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [x, y] = v;
  return isNum(x) && isNum(y) ? [x, y] : null;
}

function validL3(v: unknown): L3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [e, n, u] = v;
  return isInt(e) && isInt(n) && isInt(u) ? [e, n, u] : null;
}

function validAnchor(v: unknown): L3 | null | undefined {
  if (v === null || v === undefined) return null;
  return validL3(v) ?? undefined;
}

function validPts(v: unknown): Pt[] | null {
  if (!Array.isArray(v) || v.length < 2 || v.length > MAX_POINTS) return null;
  const pts: Pt[] = [];
  for (const p of v) {
    const q = validPt(p);
    if (!q) return null;
    pts.push(q);
  }
  return pts;
}

export function validStroke(v: unknown): Stroke | null {
  if (!isRec(v)) return null;
  if (v.kind === 'note') {
    const at = validPt(v.at);
    const anchor = validAnchor(v.anchor);
    if (!at || anchor === undefined || !isStr(v.text) || !v.text.trim() || v.text.length > MAX_NOTE) return null;
    return { kind: 'note', at, text: v.text, anchor };
  }
  if (v.kind === 'pen') {
    const pts = validPts(v.pts);
    const anchor = validAnchor(v.anchor);
    if (!pts || anchor === undefined) return null;
    return { kind: 'pen', pts, anchor };
  }
  if (v.kind === 'run') {
    const from = validL3(v.from);
    const to = validL3(v.to);
    if (!from || !to) return null;
    if (from[0] === to[0] && from[1] === to[1] && from[2] === to[2]) return null;
    return { kind: 'run', from, to };
  }
  return null;
}

/**
 * A version-one stroke lifted into the world.
 *
 * Runs were page points from the south west, so the direction each one went
 * says which axis it was on, and a run that started where an earlier one
 * ended starts from that end in the world too, the way it was drawn. Pen
 * marks and notes had no anchor; they stay where they were.
 */
function liftV1(v: unknown, known: Map<string, L3>, g: number): Stroke | null {
  if (!isRec(v)) return null;
  if (v.kind === 'note') {
    const at = validPt(v.at);
    if (!at || !isStr(v.text) || !v.text.trim() || v.text.length > MAX_NOTE) return null;
    return { kind: 'note', at, text: v.text, anchor: null };
  }
  if (v.kind === 'pen') {
    const pts = validPts(v.pts);
    return pts ? { kind: 'pen', pts, anchor: null } : null;
  }
  if (v.kind !== 'run') return null;
  const pts = validPts(v.pts);
  if (!pts || pts.length !== 2) return null;
  const key = (p: Pt) => `${Math.round(p[0])},${Math.round(p[1])}`;
  const [a, b] = nearestCounts(pts[0]!, g);
  const from: L3 = known.get(key(pts[0]!)) ?? [a, b, 0];
  const snap = snapRun(from, pts[1]!, 'SW', g);
  if (snap.steps < 1) return null;
  known.set(key(pts[1]!), snap.to);
  return { kind: 'run', from, to: snap.to };
}

export function validSketch(v: unknown, version: number, g: number): SavedSketch | null {
  if (!isRec(v)) return null;
  const { id, name, place, strokes, createdAt, updatedAt } = v;
  if (!isStr(id) || !id) return null;
  if (!isStr(name) || !name.trim() || name.length > MAX_NAME) return null;
  if (!isStr(place)) return null;
  if (!Array.isArray(strokes) || strokes.length > MAX_STROKES) return null;
  if (!isInt(createdAt) || createdAt <= 0) return null;
  if (!isInt(updatedAt) || updatedAt <= 0) return null;
  const ok: Stroke[] = [];
  const known = new Map<string, L3>();
  for (const s of strokes) {
    const st = version === 1 ? liftV1(s, known, g) : validStroke(s);
    if (!st) return null;
    ok.push(st);
  }
  return { id, name: name.trim(), place, strokes: ok, createdAt, updatedAt };
}

// ------------------------------------------------------------- persistence

export function serialiseBook(b: SketchBook): string {
  return JSON.stringify({ v: SKETCHES_VERSION, sketches: b.sketches });
}

/** `grid` is the dot spacing version-one pages were drawn on; only the lift needs it. */
export function parseBook(raw: string | null | undefined, grid = 20): SketchBook {
  if (!raw) return emptyBook();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyBook(), dropped: 1 };
  }
  if (!isRec(parsed)) return { ...emptyBook(), dropped: 1 };
  if (!isInt(parsed.v) || parsed.v < 1) return { ...emptyBook(), dropped: 1 };
  if (parsed.v > SKETCHES_VERSION) return { ...emptyBook(), foreign: true };
  if (!Array.isArray(parsed.sketches)) return { ...emptyBook(), dropped: 1 };

  const sketches: SavedSketch[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw2 of parsed.sketches) {
    const s = validSketch(raw2, parsed.v, grid);
    if (!s || seen.has(s.id)) {
      dropped += 1;
      continue;
    }
    seen.add(s.id);
    sketches.push(s);
  }
  return { sketches: sortSketches(sketches), foreign: false, dropped };
}

// -------------------------------------------------------------- operations

export function sortSketches(sketches: SavedSketch[]): SavedSketch[] {
  return sketches.slice().sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}

export function getSketch(b: SketchBook, id: string): SavedSketch | undefined {
  return b.sketches.find((s) => s.id === id);
}

export function freshSketchId(b: SketchBook, seed: string): string {
  const base = seed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'sketch';
  if (!getSketch(b, base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!getSketch(b, id)) return id;
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** What a sketch is called until somebody names it: when it was started. */
export function defaultName(now: number): string {
  const d = new Date(now);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Sketch ${d.getDate()} ${MONTHS[d.getMonth()]} ${hh}:${mm}`;
}

/** A sketch with nothing on it yet. */
export function newSketch(book: SketchBook, now: number): SavedSketch {
  const name = defaultName(now);
  return { id: freshSketchId(book, `${name}${now.toString(36)}`), name, place: '', strokes: [], createdAt: now, updatedAt: now };
}

/**
 * Put a sketch in the book, new or replacing the one with its id. Pruned back
 * under the cap oldest-touched first; the one just saved is never pruned.
 */
export function saveSketch(book: SketchBook, sketch: SavedSketch, now: number): SketchBook {
  const existing = getSketch(book, sketch.id);
  const next: SavedSketch = {
    ...sketch,
    name: sketch.name.trim() || existing?.name || defaultName(now),
    createdAt: existing?.createdAt ?? sketch.createdAt,
    updatedAt: now,
  };
  let sketches = sortSketches([...book.sketches.filter((s) => s.id !== sketch.id), next]);
  if (sketches.length > MAX_SKETCHES) {
    const keep = new Set(
      sortSketches(sketches.filter((s) => s.id !== next.id))
        .slice(0, MAX_SKETCHES - 1)
        .map((s) => s.id)
    );
    keep.add(next.id);
    sketches = sketches.filter((s) => keep.has(s.id));
  }
  return { ...book, sketches };
}

/** The strokes of one sketch replaced wholesale — what every edit on the canvas is. */
export function withStrokes(book: SketchBook, id: string, strokes: Stroke[], now: number): SketchBook {
  const s = getSketch(book, id);
  if (!s) return book;
  return saveSketch(book, { ...s, strokes: strokes.slice(0, MAX_STROKES) }, now);
}

export function renameSketch(book: SketchBook, id: string, name: string, place: string, now: number): SketchBook {
  const s = getSketch(book, id);
  if (!s || !name.trim()) return book;
  return { ...book, sketches: sortSketches(book.sketches.map((x) => (x.id === id ? { ...x, name: name.trim().slice(0, MAX_NAME), place, updatedAt: now } : x))) };
}

export function deleteSketch(book: SketchBook, id: string): SketchBook {
  const sketches = book.sketches.filter((s) => s.id !== id);
  return sketches.length === book.sketches.length ? book : { ...book, sketches };
}

/** A stroke as it is stored: coordinates to a tenth. */
export function storedStroke(s: Stroke): Stroke {
  if (s.kind === 'run') return s;
  if (s.kind === 'note') return { ...s, at: [tenth(s.at[0]), tenth(s.at[1])], text: s.text.trim().slice(0, MAX_NOTE) };
  return { ...s, pts: s.pts.map((p) => [tenth(p[0]), tenth(p[1])] as Pt) };
}

/** Every world point a run has been drawn to, each once: where the next one can start. */
export function runNodes(strokes: readonly Stroke[]): L3[] {
  const seen = new Set<string>();
  const out: L3[] = [];
  for (const s of strokes) {
    if (s.kind !== 'run') continue;
    for (const p of [s.from, s.to]) {
      const k = p.join(',');
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
  }
  return out;
}

// --------------------------------------------------------------- on the page

/** A stroke laid on the page, looked at from `c`: what to draw, in page points. */
export type Placed =
  | { kind: 'run'; pts: [Pt, Pt] }
  | { kind: 'pen'; pts: Pt[] }
  | { kind: 'note'; at: Pt; text: string };

const shift = (p: Pt, by: Pt): Pt => [p[0] + by[0], p[1] + by[1]];

export function place(s: Stroke, c: Corner, g: number): Placed {
  if (s.kind === 'run') return { kind: 'run', pts: [toScreen(s.from, c, g), toScreen(s.to, c, g)] };
  const base: Pt = s.anchor ? toScreen(s.anchor, c, g) : [0, 0];
  if (s.kind === 'pen') return { kind: 'pen', pts: s.pts.map((p) => shift(p, base)) };
  return { kind: 'note', at: shift(s.at, base), text: s.text };
}

/** The page rectangle everything drawn sits in, from `c`, or null for a blank page. */
export function sketchBounds(strokes: readonly Stroke[], c: Corner, g: number): Bounds | null {
  const pts: Pt[] = [];
  for (const s of strokes) {
    const p = place(s, c, g);
    if (p.kind === 'note') {
      pts.push(p.at, [p.at[0] + p.text.length * 7.5, p.at[1] - 14]);
    } else for (const q of p.pts) pts.push(q);
  }
  return bounds(pts);
}

// ------------------------------------------------------------------ export

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The sketch as a page of SVG, black on white, with the dots it was drawn on,
 * from the corner it was being looked at. Framed to what was drawn plus a
 * margin, so a small sketch does not print as a corner of a blank page.
 */
export function sketchToSvg(sketch: SavedSketch, grid: number, c: Corner = 'SW'): string {
  const b = sketchBounds(sketch.strokes, c, grid) ?? { minX: 0, minY: 0, maxX: grid * 10, maxY: grid * 10 };
  const m = grid * 2;
  const x0 = Math.floor((b.minX - m) / grid) * grid;
  const y0 = Math.floor((b.minY - m) / grid) * grid;
  const w = Math.ceil((b.maxX + m - x0) / grid) * grid;
  const h = Math.ceil((b.maxY + m - y0) / grid) * grid;
  const tw = grid * Math.sqrt(3);
  const body = sketch.strokes
    .map((s) => {
      const p = place(s, c, grid);
      if (p.kind === 'note')
        return `<text x="${p.at[0]}" y="${p.at[1]}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="#111">${esc(p.text)}</text>`;
      const d = p.pts.map((q) => `${q[0]},${q[1]}`).join(' ');
      return p.kind === 'run'
        ? `<polyline points="${d}" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"/>`
        : `<polyline points="${d}" fill="none" stroke="#333" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('\n');
  // The compass: north as it lies on this page.
  const n = toScreen([0, 1, 0], c, 1);
  const cx = x0 + w - grid * 1.6;
  const cy = y0 + grid * 1.6;
  const compass = `<line x1="${cx}" y1="${cy}" x2="${cx + n[0] * grid}" y2="${cy + n[1] * grid}" stroke="#111" stroke-width="1.5"/><text x="${cx + n[0] * grid * 1.45}" y="${cy + n[1] * grid * 1.45 + 4}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#111" text-anchor="middle">N</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}">
<defs><pattern id="iso" patternUnits="userSpaceOnUse" x="0" y="0" width="${tw}" height="${grid}">
<circle cx="0" cy="0" r="0.9" fill="#9aa"/><circle cx="${tw / 2}" cy="${grid / 2}" r="0.9" fill="#9aa"/><circle cx="0" cy="${grid}" r="0.9" fill="#9aa"/><circle cx="${tw}" cy="0" r="0.9" fill="#9aa"/><circle cx="${tw}" cy="${grid}" r="0.9" fill="#9aa"/>
</pattern></defs>
<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/>
<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#iso)"/>
${body}
${compass}
</svg>`;
}

// Kept for callers that only need the page point of a dot.
export { lattice };
