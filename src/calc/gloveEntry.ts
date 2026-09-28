// Entering a figure with big keys
// -------------------------------
// The glove keypad builds a figure the way it is read off a tape: feet, then
// inches, then a fraction picked from a row of eighths, with a key that adds a
// sixteenth (five-eighths, then +1/16, is eleven-sixteenths). What it hands
// the field is plain inches — "51 5/8" for 4' 3 5/8" — the form every field in
// the app already reads, so no field's parsing changes.

export type Frac = { n: number; d: number };

/** A figure being keyed in. `feet` is set once the foot key is pressed. */
export type Entry = { feet: string | null; inches: string; frac: Frac | null };

export type GloveKey =
  | { k: 'digit'; d: string }
  | { k: 'dot' }
  | { k: 'feet' }
  | { k: 'frac'; n: number; d: number }
  | { k: 'sixteenth' }
  | { k: 'back' }
  | { k: 'clear' };

export const EMPTY_ENTRY: Entry = { feet: null, inches: '', frac: null };

/** Longest run of digits in one part: more than any pipe run needs, short enough to stay on one line. */
const MAX_DIGITS = 6;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const reduce = (n: number, d: number): Frac => {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};

/**
 * One key press. `tape` is true on an imperial length field, where feet and
 * fractions make sense; anywhere else the keypad is digits and a point.
 * A press that makes no sense where it lands does nothing rather than
 * guessing.
 */
export function press(e: Entry, key: GloveKey, tape: boolean): Entry {
  switch (key.k) {
    case 'clear':
      return EMPTY_ENTRY;
    case 'digit':
      if (e.frac) return e;
      if (e.inches.replace('.', '').length >= MAX_DIGITS) return e;
      // A leading zero is dropped: "07" is 7.
      return { ...e, inches: e.inches === '0' ? key.d : e.inches + key.d };
    case 'dot':
      if (e.frac || e.inches.includes('.')) return e;
      return { ...e, inches: (e.inches || '0') + '.' };
    case 'feet':
      if (!tape || e.feet !== null || e.frac || !e.inches || e.inches.includes('.')) return e;
      return { feet: e.inches, inches: '', frac: null };
    case 'frac':
      if (!tape || e.inches.includes('.')) return e;
      return { ...e, frac: reduce(key.n, key.d) };
    case 'sixteenth': {
      if (!tape || e.inches.includes('.')) return e;
      if (!e.frac) return { ...e, frac: { n: 1, d: 16 } };
      if (e.frac.d > 8) return e;
      return { ...e, frac: reduce(e.frac.n * (16 / e.frac.d) + 1, 16) };
    }
    case 'back':
      if (e.frac) return { ...e, frac: null };
      if (e.inches) return { ...e, inches: e.inches.slice(0, -1) };
      if (e.feet !== null) return { feet: null, inches: e.feet, frac: null };
      return e;
  }
}

export const isEmpty = (e: Entry): boolean => e.feet === null && !e.inches && !e.frac;

/** The figure in inches (or in the field's own unit off a tape field), or null when nothing is keyed. */
export function entryValue(e: Entry): number | null {
  if (isEmpty(e)) return null;
  const feet = e.feet ? Number(e.feet) : 0;
  const inches = e.inches && e.inches !== '.' ? Number(e.inches) : 0;
  const frac = e.frac ? e.frac.n / e.frac.d : 0;
  const v = feet * 12 + inches + frac;
  return Number.isFinite(v) ? v : null;
}

/** What the keypad shows while keying: 4' 3 5/8". */
export function entryLabel(e: Entry, tape: boolean): string {
  if (isEmpty(e)) return '';
  const ft = e.feet !== null ? `${e.feet}'` : '';
  const f = e.frac ? `${e.frac.n}/${e.frac.d}` : '';
  const inch = [e.inches, f].filter(Boolean).join(' ');
  if (!tape) return e.inches;
  return [ft, inch ? `${inch}"` : ''].filter(Boolean).join(' ');
}

/**
 * What the field is given: plain inches as a whole number and a fraction
 * ("51 5/8"), or the decimal as keyed. Exact: the fraction is carried as the
 * fraction that was keyed, never through a decimal.
 */
export function fieldValue(e: Entry): string {
  if (isEmpty(e)) return '';
  if (e.inches.includes('.')) {
    const v = entryValue(e);
    return v === null ? '' : String(Number(v.toFixed(4)));
  }
  const whole = (e.feet ? Number(e.feet) * 12 : 0) + (e.inches ? Number(e.inches) : 0);
  if (!e.frac) return String(whole);
  return whole ? `${whole} ${e.frac.n}/${e.frac.d}` : `${e.frac.n}/${e.frac.d}`;
}

/** Recent figures, newest first, no repeats, a handful kept. */
export const KEEP_FIGURES = 8;
export function pushFigure(list: readonly string[], value: string): string[] {
  const v = value.trim();
  if (!v) return [...list];
  return [v, ...list.filter((x) => x !== v)].slice(0, KEEP_FIGURES);
}
