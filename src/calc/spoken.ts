// A figure the way a fitter says it
// ---------------------------------
// Read out so the eyes can stay on the tape: "four foot, three and
// five-eighths", not "fifty-one point six two five". Rounded to the tick the
// app is set to read (a sixteenth unless changed), and when the exact figure
// sits off that tick by a quarter of it or more, said so the way it is said on
// the job: "strong" when it runs a hair over the mark, "shy" when it falls a
// hair under.

import type { FractionDenominator } from './format';
import type { UnitSystem } from './units';
import { fromInches } from './units';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty'];

/** 1 to 63 in words: only ever a numerator of a fraction under an inch. */
function words(n: number): string {
  if (n < 20) return ONES[n]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t]!;
}

/** The fraction's name: [singular with its article, plural]. */
const PARTS: Record<number, [string, string]> = {
  2: ['a half', 'halves'],
  4: ['a quarter', 'quarters'],
  8: ['an eighth', 'eighths'],
  16: ['a sixteenth', 'sixteenths'],
  32: ['a thirty-second', 'thirty-seconds'],
  64: ['a sixty-fourth', 'sixty-fourths'],
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** "five-eighths", "a quarter", "three-quarters". */
export function fractionWords(ticks: number, denominator: number): string {
  const g = gcd(ticks, denominator);
  const n = ticks / g;
  const d = denominator / g;
  const part = PARTS[d];
  if (!part) return `${n} over ${d}`;
  return n === 1 ? part[0] : `${words(n)}-${part[1]}`;
}

/** Inches under a foot: "three and five-eighths", "a quarter", "seven". */
function inchWords(whole: number, ticks: number, den: number): string {
  if (!ticks) return `${whole}`;
  const f = fractionWords(ticks, den);
  return whole ? `${whole} and ${f}` : f;
}

/**
 * A length in words, for speaking.
 *
 * Imperial reads in feet and inches from a foot up, because that is how a tape
 * is read; under a foot it is inches. With fractions turned off it reads the
 * decimal the screen shows. Metric reads whole millimetres.
 */
export function spokenLength(inches: number, system: UnitSystem, denominator: FractionDenominator): string {
  if (!Number.isFinite(inches)) return '';
  if (system === 'metric') {
    const mm = Math.round(fromInches(inches, 'metric'));
    return `${mm} millimetres`;
  }
  const sign = inches < 0 ? 'minus ' : '';
  const abs = Math.abs(inches);
  if (!denominator) {
    return `${sign}${Number(abs.toFixed(2))} inches`;
  }
  const den = denominator;
  let ticks = Math.round(abs * den);
  const rounded = ticks / den;
  const off = abs - rounded;
  const feet = Math.floor(ticks / (12 * den));
  ticks -= feet * 12 * den;
  const whole = Math.floor(ticks / den);
  const frac = ticks - whole * den;

  let said: string;
  if (!feet) {
    said = frac || whole ? `${inchWords(whole, frac, den)} inches` : 'zero';
  } else {
    const ft = `${feet} foot`;
    if (!whole && !frac) said = `${ft} even`;
    else if (!whole) said = `${ft} and ${fractionWords(frac, den)}`;
    else said = `${ft}, ${inchWords(whole, frac, den)}`;
  }
  // A quarter of a tick or more off the mark is worth saying.
  const hair = 1 / (4 * den) - 1e-9;
  const lean = off >= hair ? ', strong' : off <= -hair ? ', shy' : '';
  return `${sign}${said}${lean}`;
}

/** An angle in words: "22.5 degrees", "45 degrees". */
export function spokenAngle(degrees: number): string {
  if (!Number.isFinite(degrees)) return '';
  return `${Number(degrees.toFixed(1))} degrees`;
}

/** What a result says aloud: its name, then its figure. Dashes and marks read badly, so they go. */
export function spokenResult(label: string, figure: string): string {
  const name = label.replace(/[—–-]+/g, ',').replace(/\s*,\s*/g, ', ').trim();
  return figure ? `${name}: ${figure}` : '';
}
