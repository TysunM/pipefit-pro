// What was said, as the app can use it
// -----------------------------------
// A phone's recogniser writes "twelve and a half" as "12 and a half", "12.5",
// "12 1/2" or "twelve and a half" depending on the phone, the accent and the
// noise. This turns all of them into one thing: lower case words, digits for
// numbers, and the figures found against the words that name them.
//
// Lengths are inches, the way every screen in the app takes them: "3 foot 6"
// is 42, "4 feet" is 48, "6 and 3/8" is 6.375.

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
/** "and a half", "and three eighths": the part after the whole number. */
const PARTS: Record<string, number> = {
  half: 2, halves: 2, quarter: 4, quarters: 4, third: 3, thirds: 3, eighth: 8, eighths: 8, sixteenth: 16, sixteenths: 16,
};
const FOOT = new Set(['foot', 'feet', 'ft', "'"]);
const INCH = new Set(['inch', 'inches', 'in', '"']);

/** Lower case, numbers and fractions kept, everything else a single space. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d)\s*-\s*(\d+\/\d+)/g, '$1 $2') // 12-1/2 is 12 1/2
    .replace(/(\d)(')/g, '$1 foot ')
    .replace(/(\d)(")/g, '$1 inch ')
    .replace(/[^a-z0-9./\s'-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const tokens = (text: string): string[] => (text ? normalise(text).split(' ').filter(Boolean) : []);

const isFraction = (w: string | undefined) => !!w && /^\d+\/\d+$/.test(w);
const fraction = (w: string): number => {
  const [n, d] = w.split('/').map(Number);
  return d ? n! / d : NaN;
};

/** A whole number written in words or digits at `i`, with where it ends. */
function whole(ws: readonly string[], i: number): { value: number; next: number } | null {
  const w = ws[i];
  if (w === undefined) return null;
  if (/^\d+(\.\d+)?$/.test(w)) return { value: Number(w), next: i + 1 };
  if (w in TENS) {
    const u = ws[i + 1];
    return u !== undefined && u in UNITS && UNITS[u]! > 0 && UNITS[u]! < 10
      ? { value: TENS[w]! + UNITS[u]!, next: i + 2 }
      : { value: TENS[w]!, next: i + 1 };
  }
  if (w in UNITS) {
    // "one hundred and twenty"
    if (ws[i + 1] === 'hundred') {
      const rest = ws[i + 2] === 'and' ? whole(ws, i + 3) : whole(ws, i + 2);
      return rest && rest.value < 100 ? { value: UNITS[w]! * 100 + rest.value, next: rest.next } : { value: UNITS[w]! * 100, next: i + 2 };
    }
    return { value: UNITS[w]!, next: i + 1 };
  }
  if (w === 'a' && ws[i + 1] === 'hundred') return { value: 100, next: i + 2 };
  return null;
}

/** "a half", "three quarters", "3/8", "5 sixteenths" at `i`: a part of one. */
function part(ws: readonly string[], i: number): { value: number; next: number } | null {
  const w = ws[i];
  if (isFraction(w)) return { value: fraction(w!), next: i + 1 };
  const n = w === 'a' || w === 'an' ? { value: 1, next: i + 1 } : whole(ws, i);
  const d = n ? ws[n.next] : undefined;
  if (n && d && d in PARTS) return { value: n.value / PARTS[d]!, next: n.next + 1 };
  return null;
}

/**
 * A number at `i`: digits, words, a fraction, and "and a half" or "point
 * five" after it. Null when there is no number there.
 */
export function numberAt(ws: readonly string[], i: number): { value: number; next: number } | null {
  if (isFraction(ws[i])) return { value: fraction(ws[i]!), next: i + 1 };
  // "a half" or "three quarters" on their own.
  const p = part(ws, i);
  if (p) return p;
  const n = whole(ws, i);
  if (!n) return null;
  let { value, next } = n;
  if (ws[next] === 'point' && ws[next + 1] !== undefined && /^\d+$/.test(ws[next + 1]!)) {
    value = Number(`${value}.${ws[next + 1]}`);
    next += 2;
  } else if (ws[next] === 'point' && ws[next + 1]! in UNITS) {
    value = Number(`${value}.${UNITS[ws[next + 1]!]}`);
    next += 2;
  } else if (isFraction(ws[next])) {
    value += fraction(ws[next]!);
    next += 1;
  } else if (ws[next] === 'and') {
    const q = part(ws, next + 1);
    if (q && q.value < 1) {
      value += q.value;
      next = q.next;
    }
  }
  return Number.isFinite(value) ? { value, next } : null;
}

const MM = new Set(['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres', 'mil', 'mils']);
const CM = new Set(['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres']);
const METRE = new Set(['meter', 'meters', 'metre', 'metres']);

/**
 * A length at `i`: "42", "3 foot 6", "3 feet 6 and a half inches", "350
 * millimetres". With a unit said, `explicit` is true and `inches` is the
 * length in inches; a bare number is not converted (`explicit` false), to go
 * into a field in that field's own units.
 */
export function lengthAt(ws: readonly string[], i: number): { inches: number; next: number; explicit: boolean } | null {
  const a = numberAt(ws, i);
  if (!a) return null;
  let next = a.next;
  const unit = ws[next] ?? '';
  if (FOOT.has(unit)) {
    next += 1;
    const b = numberAt(ws, next);
    let inches = a.value * 12;
    if (b) {
      inches += b.value;
      next = b.next;
    }
    if (INCH.has(ws[next] ?? '')) next += 1;
    return { inches, next, explicit: true };
  }
  if (INCH.has(unit)) return { inches: a.value, next: next + 1, explicit: true };
  if (MM.has(unit)) return { inches: a.value / 25.4, next: next + 1, explicit: true };
  if (CM.has(unit)) return { inches: a.value / 2.54, next: next + 1, explicit: true };
  if (METRE.has(unit)) return { inches: a.value / 0.0254, next: next + 1, explicit: true };
  return { inches: a.value, next, explicit: false };
}

/** Whether every word of `phrase` appears, in order and together, in `ws`. */
export function hasPhrase(ws: readonly string[], phrase: readonly string[]): number {
  outer: for (let i = 0; i + phrase.length <= ws.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (ws[i + j] !== phrase[j]) continue outer;
    return i;
  }
  return -1;
}
