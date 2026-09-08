export type FractionDenominator = 0 | 8 | 16 | 32 | 64;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function toFraction(inches: number, denominator: FractionDenominator): string {
  if (!denominator || !Number.isFinite(inches)) return '';
  const sign = inches < 0 ? '-' : '';
  const abs = Math.abs(inches);
  const whole = Math.floor(abs);
  const ticks = Math.round((abs - whole) * denominator);
  if (ticks === denominator) return `${sign}${whole + 1}"`;
  if (ticks === 0) return `${sign}${whole}"`;
  const divisor = gcd(ticks, denominator);
  return `${sign}${whole ? `${whole} ` : ''}${ticks / divisor}/${denominator / divisor}"`;
}

export function decimal(value: number, places = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(places);
}

export function angle(degrees: number, places = 1): string {
  if (!Number.isFinite(degrees)) return '—';
  return `${degrees.toFixed(places)}°`;
}

export function parseNumber(raw: string): number {
  if (!raw) return NaN;
  const cleaned = raw.trim().replace(/["'in]/gi, '').replace(/\s+/g, ' ');
  const mixed = cleaned.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const w = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    if (!d) return NaN;
    return w < 0 ? w - n / d : w + n / d;
  }
  const simple = cleaned.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (simple) {
    const d = Number(simple[2]);
    return d ? Number(simple[1]) / d : NaN;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
}
