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

export type Entry = {
  digits: string;
  feet: number | null;
  inch: number | null;
  numerator: number | null;
  denominator: string | null;
  stage: 'whole' | 'denominator';
  negative: boolean;
};

export const emptyEntry = (): Entry => ({
  digits: '',
  feet: null,
  inch: null,
  numerator: null,
  denominator: null,
  stage: 'whole',
  negative: false,
});

export const isEntryEmpty = (e: Entry): boolean =>
  !e.digits && e.feet === null && e.inch === null && e.numerator === null && e.denominator === null;

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

export function pressFeet(e: Entry): Entry {
  if (e.stage === 'denominator' || !e.digits) return e;
  return { ...e, feet: (e.feet ?? 0) + Number(e.digits), digits: '' };
}

export function pressInch(e: Entry): Entry {
  if (e.stage === 'denominator' || !e.digits) return e;
  return { ...e, inch: (e.inch ?? 0) + Number(e.digits), digits: '' };
}

export function pressSign(e: Entry): Entry {
  return { ...e, negative: !e.negative };
}

export function pressBackspace(e: Entry): Entry {
  if (e.stage === 'denominator') {
    if (e.denominator) return { ...e, denominator: e.denominator.slice(0, -1) };
    return { ...e, stage: 'whole', digits: String(e.numerator ?? ''), numerator: null, denominator: null };
  }
  if (e.digits) return { ...e, digits: e.digits.slice(0, -1) };
  if (e.inch !== null) return { ...e, digits: String(e.inch), inch: null };
  if (e.feet !== null) return { ...e, digits: String(e.feet), feet: null };
  return e;
}

export function entryHasDimension(e: Entry): boolean {
  return e.feet !== null || e.inch !== null || e.numerator !== null;
}

export function entryValue(e: Entry): number {
  if (isEntryEmpty(e)) return NaN;

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

export function entryDisplay(e: Entry, den: FracDen = 16): string {
  if (isEntryEmpty(e)) return '0';

  const parts: string[] = [];
  if (e.feet !== null) parts.push(`${e.feet}'`);
  if (e.inch !== null) parts.push(`${e.inch}"`);

  if (e.numerator !== null) {
    parts.push(`${e.numerator}/${e.denominator ?? ''}`);
  } else if (e.digits) {
    parts.push(e.feet !== null || e.inch !== null ? `${e.digits}` : e.digits);
  }

  if (!parts.length) return formatFeetInch(entryValue(e), den);
  return (e.negative ? '-' : '') + parts.join(' ');
}
