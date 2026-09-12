export type FracDen = 2 | 4 | 8 | 16 | 32 | 64;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function formatFeetInch(inches: number, den: FracDen = 16): string {
  if (!Number.isFinite(inches)) return '—';
  const sign = inches < 0 ? '-' : '';
  const abs = Math.abs(inches);

  let feet = Math.floor(abs / 12);
  let rest = abs - feet * 12;
  let whole = Math.floor(rest);
  let ticks = Math.round((rest - whole) * den);

  if (ticks === den) {
    ticks = 0;
    whole += 1;
  }
  if (whole === 12) {
    whole = 0;
    feet += 1;
  }

  const parts: string[] = [];
  if (feet) parts.push(`${feet}'`);

  if (ticks) {
    const g = gcd(ticks, den);
    const frac = `${ticks / g}/${den / g}`;
    parts.push(whole ? `${whole}-${frac}"` : `${frac}"`);
  } else if (whole || !feet) {
    parts.push(`${whole}"`);
  }

  return sign + parts.join(' ');
}

export function parseFeetInch(raw: string): number {
  if (!raw) return NaN;
  const text = raw.trim().toLowerCase();
  if (!text) return NaN;

  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;

  let total = 0;
  let matched = false;
  let remainder = body;

  const feetMatch = remainder.match(/^\s*(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)/);
  if (feetMatch) {
    total += Number(feetMatch[1]) * 12;
    remainder = remainder.slice(feetMatch[0].length);
    matched = true;
  }

  remainder = remainder.replace(/(?:"|in|inch|inches)\s*$/, '').trim().replace(/^-/, ' ');

  if (remainder) {
    const mixed = remainder.match(/^\s*(\d+(?:\.\d+)?)[\s-]+(\d+)\s*\/\s*(\d+)\s*$/);
    const bare = remainder.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    const plain = remainder.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (mixed) {
      const d = Number(mixed[3]);
      if (!d) return NaN;
      total += Number(mixed[1]) + Number(mixed[2]) / d;
      matched = true;
    } else if (bare) {
      const d = Number(bare[2]);
      if (!d) return NaN;
      total += Number(bare[1]) / d;
      matched = true;
    } else if (plain) {
      total += Number(plain[1]);
      matched = true;
    } else {
      return NaN;
    }
  }

  if (!matched) return NaN;
  return negative ? -total : total;
}

export type EntryUnit = 'in' | 'ft' | 'mm' | 'm';

export type Entry = {
  digits: string;
  feet: number | null;
  inch: number | null;
  numerator: number | null;
  denominator: string | null;
  stage: 'whole' | 'denominator';
  negative: boolean;
  unit: EntryUnit | null;
  magnitude: number | null;
  exponent: 1 | 2 | 3;
};

export const emptyEntry = (): Entry => ({
  digits: '',
  feet: null,
  inch: null,
  numerator: null,
  denominator: null,
  stage: 'whole',
  negative: false,
  unit: null,
  magnitude: null,
  exponent: 1,
});

export const isEntryEmpty = (e: Entry): boolean =>
  !e.digits &&
  e.feet === null &&
  e.inch === null &&
  e.numerator === null &&
  e.denominator === null &&
  e.magnitude === null;

export function pressDigit(e: Entry, d: string): Entry {
  if (e.stage === 'denominator') return { ...e, denominator: (e.denominator ?? '') + d };
  if (e.digits === '0' && d !== '.') return { ...e, digits: d };
  return { ...e, digits: e.digits + d };
}

export function pressDot(e: Entry): Entry {
  if (e.stage === 'denominator') return e;
  if (e.digits.includes('.')) return e;
  return { ...e, digits: (e.digits || '0') + '.' };
}

export function pressSlash(e: Entry): Entry {
  if (e.stage === 'denominator') return e;
  if (!e.digits) return e;
  return { ...e, numerator: Number(e.digits), digits: '', denominator: '', stage: 'denominator' };
}

function applyUnit(e: Entry, unit: EntryUnit): Entry {
  if (e.stage === 'denominator') return e;

  if (!e.digits) {
    if (e.unit === unit && e.magnitude !== null && e.exponent < 3) {
      return { ...e, exponent: (e.exponent + 1) as 1 | 2 | 3 };
    }
    return e;
  }

  const n = Number(e.digits);
  if (!Number.isFinite(n)) return e;

  if (unit === 'ft') return { ...e, feet: (e.feet ?? 0) + n, digits: '', unit, magnitude: n, exponent: 1 };
  if (unit === 'in') return { ...e, inch: (e.inch ?? 0) + n, digits: '', unit, magnitude: n, exponent: 1 };
  return { ...e, inch: null, feet: null, digits: '', unit, magnitude: n, exponent: 1 };
}

export const pressFeet = (e: Entry): Entry => applyUnit(e, 'ft');
export const pressInch = (e: Entry): Entry => applyUnit(e, 'in');
export const pressMillimetre = (e: Entry): Entry => applyUnit(e, 'mm');
export const pressMetre = (e: Entry): Entry => applyUnit(e, 'm');

export function pressSign(e: Entry): Entry {
  return { ...e, negative: !e.negative };
}

export function pressBackspace(e: Entry): Entry {
  if (e.stage === 'denominator') {
    if (e.denominator) return { ...e, denominator: e.denominator.slice(0, -1) };
    return { ...e, stage: 'whole', digits: String(e.numerator ?? ''), numerator: null, denominator: null };
  }
  if (e.exponent > 1) return { ...e, exponent: (e.exponent - 1) as 1 | 2 | 3 };
  if (e.digits) return { ...e, digits: e.digits.slice(0, -1) };
  if (e.inch !== null) {
    return { ...e, digits: String(e.inch), inch: null, magnitude: null, unit: e.feet !== null ? 'ft' : null };
  }
  if (e.feet !== null) return { ...e, digits: String(e.feet), feet: null, magnitude: null, unit: null };
  if (e.magnitude !== null) return { ...e, digits: String(e.magnitude), magnitude: null, unit: null };
  return e;
}

export const entryHasDimension = (e: Entry): boolean => e.unit !== null;

export const entryExponent = (e: Entry): 1 | 2 | 3 => e.exponent;

export function entryUnit(e: Entry): EntryUnit | null {
  if (e.unit === null) return null;
  if (e.exponent > 1) return e.unit;
  if (e.unit === 'ft' || e.unit === 'in') return 'in';
  return e.unit;
}

export function entryValue(e: Entry): number {
  if (isEntryEmpty(e)) return NaN;

  if (e.exponent > 1) {
    if (e.magnitude === null) return NaN;
    return e.negative ? -e.magnitude : e.magnitude;
  }

  if (e.unit === 'mm' || e.unit === 'm') {
    const base = e.magnitude ?? 0;
    let total = base;
    if (e.numerator !== null) {
      const den = Number(e.denominator);
      if (!e.denominator || !Number.isFinite(den) || den === 0) return NaN;
      total += e.numerator / den;
    } else if (e.digits) {
      const n = Number(e.digits);
      if (!Number.isFinite(n)) return NaN;
      total += n;
    }
    return e.negative ? -total : total;
  }

  let total = (e.feet ?? 0) * 12 + (e.inch ?? 0);

  if (e.numerator !== null) {
    const den = Number(e.denominator);
    if (!e.denominator || !Number.isFinite(den) || den === 0) return NaN;
    total += e.numerator / den;
  } else if (e.digits) {
    const n = Number(e.digits);
    if (!Number.isFinite(n)) return NaN;
    total += n;
  }

  return e.negative ? -total : total;
}

const UNIT_WORD: Record<EntryUnit, string> = { in: 'INCH', ft: 'FEET', mm: 'MILLIMETER', m: 'METER' };
const EXPONENT_WORD: Record<1 | 2 | 3, string> = { 1: '', 2: 'SQUARE ', 3: 'CUBIC ' };

export function entryUnitWord(e: Entry): string {
  if (e.unit === null) return '';
  if (e.exponent > 1) return `${EXPONENT_WORD[e.exponent]}${UNIT_WORD[e.unit]}`;
  if (e.feet !== null && e.inch !== null) return 'FEET INCH';
  return UNIT_WORD[e.unit];
}

export function entryDisplay(e: Entry, den: FracDen = 16): string {
  if (isEntryEmpty(e)) return '0';

  const sign = e.negative ? '-' : '';

  if (e.exponent > 1) return `${sign}${e.magnitude ?? ''}`;

  if (e.unit === 'mm' || e.unit === 'm') {
    const parts = [String(e.magnitude ?? '')];
    if (e.numerator !== null) parts.push(`${e.numerator}/${e.denominator ?? ''}`);
    else if (e.digits) parts.push(e.digits);
    return sign + parts.filter(Boolean).join(' ');
  }

  const parts: string[] = [];
  if (e.feet !== null) parts.push(`${e.feet}'`);
  if (e.inch !== null) parts.push(`${e.inch}"`);

  if (e.numerator !== null) parts.push(`${e.numerator}/${e.denominator ?? ''}`);
  else if (e.digits) parts.push(e.digits);

  if (!parts.length) return formatFeetInch(entryValue(e), den);
  return sign + parts.join(' ');
}
