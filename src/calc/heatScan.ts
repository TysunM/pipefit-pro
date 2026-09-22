// Finding the heat number in what a camera read
// ---------------------------------------------
// OCR hands back a wall of strings. On a mill cert that wall holds the heat,
// the lot, the purchase order, the size, the yield, the tensile, the elongation
// and a date, and most of them are the same shape as each other. On a stencil
// it holds the spec, the size, the schedule, a mill mark and the heat, sprayed
// round a curve in the dark. So the reading is the easy half; deciding which
// string is the number that matters is the half worth writing down.
//
// Three things are used, in order of how much they are worth.
//
// A LABEL beats everything. A cert that says `HEAT NO. E7Z419` has told you
// outright, and no amount of shape-guessing is better than being told.
//
// THE BOOK is next. A token that is already a heat somebody entered is almost
// certainly that heat read again — and a token that only *shape*-matches one
// is the same O-for-zero slip a human makes, made by a camera instead. That is
// worth surfacing loudly, because it is the one case where the machine is
// about to write a number that looks right and is not.
//
// SHAPE is last and is only a tie-break: length, a mix of letters and digits,
// not a word anybody would print on a cert anyway.
//
// Nothing here guesses silently. Every candidate comes back with why it was
// picked, and the screen makes somebody tap the right one.

import { Heat, heatShape, normaliseHeat } from './heat';

/** Where a candidate came from, which is how much it is worth. */
export type Why =
  | { kind: 'labelled'; label: string }
  | { kind: 'inBook' }
  | { kind: 'looksLikeBook'; existing: string }
  | { kind: 'shape' };

export type Candidate = {
  /** The token as read, before anything is done to it. */
  text: string;
  why: Why;
  /** Higher is more likely to be the heat. */
  score: number;
};

/**
 * The words a mill puts in front of a heat number.
 *
 * `CAST` is the British and European habit, `HT` the abbreviation that fits in
 * a box on a form, and `HEAT/LOT` the one that means the next two tokens are
 * both worth having.
 */
const LABELS = ['HEATNO', 'HEATNUMBER', 'HEATLOT', 'HEAT', 'HTNO', 'HT', 'CASTNO', 'CAST'];

/** Words that are never a heat number, however heat-shaped they look. */
const NEVER = new Set([
  'HEAT', 'NO', 'LOT', 'PO', 'ITEM', 'QTY', 'SIZE', 'SCH', 'SCHEDULE', 'GRADE',
  'SPEC', 'ASTM', 'ASME', 'API', 'TYPE', 'REV', 'PAGE', 'DATE', 'CERT', 'MTR',
  'YIELD', 'TENSILE', 'ELONG', 'ELONGATION', 'HARDNESS', 'IMPACT', 'PSI', 'MPA',
  'KSI', 'MM', 'IN', 'NPS', 'DN', 'LBS', 'KG', 'MILL', 'CUSTOMER', 'ORDER',
  'DESCRIPTION', 'QUANTITY', 'PIPE', 'FITTING', 'FLANGE', 'SEAMLESS', 'ERW',
  'SMLS', 'WELDED', 'TEST', 'REPORT', 'MATERIAL', 'CARBON', 'MANGANESE',
]);

/**
 * Words that come glued to their own number, and are that word and not a heat.
 *
 * `SCH40`, `CL150`, `DN50`, `GR B`, `NPS4` — a size, a class, a schedule or a
 * grade with its figure attached. Every one of them is four to six characters
 * of mixed letters and digits, which is exactly the shape a heat number is, so
 * shape alone cannot tell them apart and the prefix has to.
 */
const GLUED = [
  'SCH', 'SCHED', 'DN', 'NPS', 'CL', 'CLASS', 'GR', 'GRADE', 'PN', 'REV', 'PG',
  'PAGE', 'QTY', 'PO', 'NO', 'ITEM', 'LB', 'LBS', 'KG', 'PSI', 'MPA', 'KSI',
];

/**
 * Material designations, which are marked down rather than thrown away.
 *
 * `A106`, `A312`, `TP316L`, `A105` are on nearly every cert and stencil and
 * are not heats. But a heat *could* be four characters starting with a letter,
 * and on a stencil where nothing else is readable the spec is still a better
 * offer than nothing — so these lose their shape bonus instead of vanishing.
 */
const looksLikeSpec = (n: string): boolean => /^A[0-9]{3}$/.test(n) || /^TP[0-9]{3}/.test(n) || /^F[0-9]{2,3}$/.test(n);

/** Splits a wall of OCR text into the tokens worth considering at all. */
export function tokens(text: string): string[] {
  return text
    .split(/[^0-9A-Za-z/-]+/)
    .map((t) => t.replace(/^[/-]+|[/-]+$/g, ''))
    .filter((t) => t.length > 0);
}

/** The label a token is, ignoring punctuation, or null. */
function labelOf(token: string): string | null {
  const k = token.toUpperCase().replace(/[^A-Z]/g, '');
  return LABELS.includes(k) ? k : null;
}

/**
 * Whether a token could be a heat number at all.
 *
 * Heat numbers run about four to twelve characters and almost always carry a
 * digit. A pure word is a label or a grade; a pure short number is a quantity
 * or a page. Anything on the never list is out whatever its shape, because
 * `SMLS` and `A106` are heat-shaped and are not heats.
 */
export function couldBeHeat(token: string): boolean {
  const n = normaliseHeat(token);
  if (n.length < 4 || n.length > 12) return false;
  if (NEVER.has(n)) return false;
  if (!/[0-9]/.test(n)) return false;
  // A size or a class with its own figure stuck to it. `SCH40` is the shape of
  // a heat number and is a schedule, and shape cannot tell the two apart.
  for (const g of GLUED) {
    if (n.startsWith(g) && /^[0-9]+$/.test(n.slice(g.length))) return false;
  }
  return true;
}

/**
 * How heat-shaped a token is, before anything else is known about it.
 *
 * A mix of letters and digits is the commonest mill habit and scores highest;
 * an all-digit run is a real heat format but is also what every quantity and
 * date on the page looks like, so it scores lower.
 */
export function shapeScore(token: string): number {
  const n = normaliseHeat(token);
  const digits = (n.match(/[0-9]/g) ?? []).length;
  const letters = n.length - digits;
  let s = 10;
  if (letters > 0 && digits > 0) s += 14;
  if (n.length >= 5 && n.length <= 8) s += 6;
  if (letters > 4) s -= 6;
  // A material designation is on every page and is not a heat, but it is a
  // better offer than nothing on a stencil where little else read.
  if (looksLikeSpec(n)) s -= 18;
  return s;
}

const SCORE = { labelled: 100, inBook: 80, looksLikeBook: 60 } as const;

/**
 * Every plausible heat in a page of OCR text, best first.
 *
 * `book` is what tips it from guessing to recognising: a token already in the
 * book is almost certainly that heat, and one that shape-matches an entry is
 * the camera making the same misread a person makes. Both beat any amount of
 * shape reasoning, so both are reported as what they are rather than folded
 * into one number.
 */
export function scanForHeats(text: string, book: readonly Heat[] = []): Candidate[] {
  const raw = tokens(text);
  const byKey = new Map<string, Candidate>();

  const inBook = new Map(book.map((h) => [normaliseHeat(h.heat), h.heat] as const));
  const byShape = new Map<string, string>();
  for (const h of book) if (!byShape.has(heatShape(h.heat))) byShape.set(heatShape(h.heat), h.heat);

  const offer = (token: string, why: Why, score: number) => {
    const key = normaliseHeat(token);
    if (!key) return;
    const had = byKey.get(key);
    if (!had || score > had.score) byKey.set(key, { text: token, why, score });
  };

  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i]!;
    const label = labelOf(token);

    // Told outright. The next token or two after a label, whichever could be
    // a heat — `HEAT NO. E7Z419` puts a `NO.` in the way, and `HEAT/LOT` means
    // both of the next two are worth having.
    if (label) {
      for (let j = i + 1; j <= Math.min(i + 3, raw.length - 1); j += 1) {
        const next = raw[j]!;
        if (labelOf(next)) continue;
        if (!couldBeHeat(next)) continue;
        offer(next, { kind: 'labelled', label }, SCORE.labelled - (j - i));
      }
      continue;
    }

    if (!couldBeHeat(token)) continue;

    const key = normaliseHeat(token);
    const known = inBook.get(key);
    if (known) {
      offer(token, { kind: 'inBook' }, SCORE.inBook);
      continue;
    }
    const near = byShape.get(heatShape(token));
    if (near) {
      offer(token, { kind: 'looksLikeBook', existing: near }, SCORE.looksLikeBook);
      continue;
    }
    offer(token, { kind: 'shape' }, shapeScore(token));
  }

  return [...byKey.values()].sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
}

/** What to say about why a candidate was offered. */
export function whyLabel(why: Why): string {
  switch (why.kind) {
    case 'labelled':
      return `Labelled ${why.label} on the page`;
    case 'inBook':
      return 'Already in your heat book';
    case 'looksLikeBook':
      return `Reads like ${why.existing}, which is in your book — check the steel`;
    case 'shape':
      return 'Shaped like a heat number';
  }
}
