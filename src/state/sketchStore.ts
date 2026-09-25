// The sketch book
// ---------------
// A sketch is the strokes that made it, in the order they were made, so undo
// is a pop and a redraw is a replay. Nothing about it is solved: it is a
// drawing, kept exactly as it was drawn, the way a page torn off an iso pad is.
//
// Everything here is pure; sketches.tsx binds it to the shared persistence.

import { Pt, tenth } from '../calc/iso';

export const SKETCHES_VERSION = 1;

export const MAX_SKETCHES = 100;
/** Strokes per sketch. A busy page is a few hundred; this is a runaway finger. */
export const MAX_STROKES = 3000;
/** Points per pen stroke. */
export const MAX_POINTS = 4000;
export const MAX_NOTE = 80;
export const MAX_NAME = 60;

export type Stroke =
  /** A run segment or a pen line: the points in order. A run has exactly two. */
  | { kind: 'run' | 'pen'; pts: Pt[] }
  /** Typed text anchored at a point. */
  | { kind: 'note'; at: Pt; text: string };

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

export function validStroke(v: unknown): Stroke | null {
  if (!isRec(v)) return null;
  if (v.kind === 'note') {
    const at = validPt(v.at);
    if (!at || !isStr(v.text) || !v.text.trim() || v.text.length > MAX_NOTE) return null;
    return { kind: 'note', at, text: v.text };
  }
  if (v.kind !== 'run' && v.kind !== 'pen') return null;
  if (!Array.isArray(v.pts) || v.pts.length < 2 || v.pts.length > MAX_POINTS) return null;
  if (v.kind === 'run' && v.pts.length !== 2) return null;
  const pts: Pt[] = [];
  for (const p of v.pts) {
    const q = validPt(p);
    if (!q) return null;
    pts.push(q);
  }
  return { kind: v.kind, pts };
}

export function validSketch(v: unknown): SavedSketch | null {
  if (!isRec(v)) return null;
  const { id, name, place, strokes, createdAt, updatedAt } = v;
  if (!isStr(id) || !id) return null;
  if (!isStr(name) || !name.trim() || name.length > MAX_NAME) return null;
  if (!isStr(place)) return null;
  if (!Array.isArray(strokes) || strokes.length > MAX_STROKES) return null;
  if (!isInt(createdAt) || createdAt <= 0) return null;
  if (!isInt(updatedAt) || updatedAt <= 0) return null;
  const ok: Stroke[] = [];
  for (const s of strokes) {
    const st = validStroke(s);
    if (!st) return null;
    ok.push(st);
  }
  return { id, name: name.trim(), place, strokes: ok, createdAt, updatedAt };
}

// ------------------------------------------------------------- persistence

export function serialiseBook(b: SketchBook): string {
  return JSON.stringify({ v: SKETCHES_VERSION, sketches: b.sketches });
}

export function parseBook(raw: string | null | undefined): SketchBook {
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
    const s = validSketch(raw2);
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
  if (s.kind === 'note') return { kind: 'note', at: [tenth(s.at[0]), tenth(s.at[1])], text: s.text.trim().slice(0, MAX_NOTE) };
  return { kind: s.kind, pts: s.pts.map((p) => [tenth(p[0]), tenth(p[1])] as Pt) };
}

/** Every lattice point a run has been drawn to: where the next one can start. */
export function runNodes(strokes: readonly Stroke[]): Pt[] {
  const out: Pt[] = [];
  for (const s of strokes) if (s.kind === 'run') for (const p of s.pts) out.push(p);
  return out;
}

// ------------------------------------------------------------------ export

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The sketch as a page of SVG, black on white, with the dots it was drawn on.
 *
 * Framed to what was drawn plus a margin, so a small sketch does not print as
 * a corner of a blank page.
 */
export function sketchToSvg(sketch: SavedSketch, grid: number): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const take = (p: Pt) => {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
  };
  for (const s of sketch.strokes) {
    if (s.kind === 'note') { take(s.at); take([s.at[0] + s.text.length * 7, s.at[1] - 14]); }
    else for (const p of s.pts) take(p);
  }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = grid * 10; maxY = grid * 10; }
  const m = grid * 2;
  const x0 = Math.floor((minX - m) / grid) * grid;
  const y0 = Math.floor((minY - m) / grid) * grid;
  const w = Math.ceil((maxX + m - x0) / grid) * grid;
  const h = Math.ceil((maxY + m - y0) / grid) * grid;
  const tw = grid * Math.sqrt(3);
  const body = sketch.strokes
    .map((s) => {
      if (s.kind === 'note')
        return `<text x="${s.at[0]}" y="${s.at[1]}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="#111">${esc(s.text)}</text>`;
      const d = s.pts.map((p) => `${p[0]},${p[1]}`).join(' ');
      return s.kind === 'run'
        ? `<polyline points="${d}" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"/>`
        : `<polyline points="${d}" fill="none" stroke="#333" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}">
<defs><pattern id="iso" patternUnits="userSpaceOnUse" x="0" y="0" width="${tw}" height="${grid}">
<circle cx="0" cy="0" r="0.9" fill="#9aa"/><circle cx="${tw / 2}" cy="${grid / 2}" r="0.9" fill="#9aa"/><circle cx="0" cy="${grid}" r="0.9" fill="#9aa"/><circle cx="${tw}" cy="0" r="0.9" fill="#9aa"/><circle cx="${tw}" cy="${grid}" r="0.9" fill="#9aa"/>
</pattern></defs>
<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/>
<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#iso)"/>
${body}
</svg>`;
}
