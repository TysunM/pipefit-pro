import { rad } from './units';

export type RadiusRule = { id: string; label: string; multiple: number; note: string };

export const RADIUS_RULES: RadiusRule[] = [
  { id: '3d', label: '3D', multiple: 3, note: 'tight — check the spec allows it' },
  { id: '5d', label: '5D', multiple: 5, note: 'common field minimum' },
  { id: '10d', label: '10D', multiple: 10, note: 'long sweep' },
];

export function radiusFromRule(nps: number, multiple: number): number {
  if (!Number.isFinite(nps) || nps <= 0) return NaN;
  return nps * multiple;
}

export type BenderInput = {
  angle: number;
  radius: number;
  springback: number;
  legLength: number;
  legLengthB: number;
  stockLength: number;
};

export type BenderResult = {
  valid: boolean;
  error?: string;
  setback: number;
  arcLength: number;
  gain: number;
  tangentTotal: number;
  overbendAngle: number;
  markFromEnd: number;
  markFromEndB: number;
  markEndOfBend: number;
  pieceLength: number;
  legFromStock: number;
  legError?: string;
  stockError?: string;
};

const EMPTY: BenderResult = {
  valid: false,
  setback: NaN,
  arcLength: NaN,
  gain: NaN,
  tangentTotal: NaN,
  overbendAngle: NaN,
  markFromEnd: NaN,
  markFromEndB: NaN,
  markEndOfBend: NaN,
  pieceLength: NaN,
  legFromStock: NaN,
};

export function solveBender(input: BenderInput): BenderResult {
  const { angle, radius } = input;

  if (!(angle > 0 && angle < 180)) return { ...EMPTY, error: 'Bend angle must be between 0° and 180°.' };
  if (!Number.isFinite(radius) || radius <= 0) return { ...EMPTY, error: 'Enter a bend radius greater than zero.' };

  const setback = radius * Math.tan(rad(angle) / 2);
  const arcLength = radius * rad(angle);
  const tangentTotal = setback * 2;
  const gain = tangentTotal - arcLength;

  const springback = Number.isFinite(input.springback) ? input.springback : 0;
  const overbendAngle = springback < 0 ? NaN : angle + springback;

  // A leg is measured to the point of intersection, so the mark where the
  // bend starts sits one setback back from it.
  let legError: string | undefined;

  const markOf = (leg: number): number => {
    if (!Number.isFinite(leg)) return NaN;
    if (leg <= 0) {
      legError = legError ?? 'Leg length must be greater than zero.';
      return NaN;
    }
    if (leg < setback) {
      legError =
        legError ?? `Leg is shorter than the ${setback.toFixed(2)} setback — the bend will not fit in it.`;
      return NaN;
    }
    return leg - setback;
  };

  const markFromEnd = markOf(input.legLength);
  const markFromEndB = markOf(input.legLengthB);

  // The piece is both straight portions plus the material in the bend. With
  // only one leg given, the other is taken to match it.
  const a = Number.isFinite(markFromEnd) ? markFromEnd : NaN;
  const b = Number.isFinite(markFromEndB) ? markFromEndB : Number.isFinite(a) ? a : NaN;
  const pieceLength = Number.isFinite(a) && Number.isFinite(b) ? a + b + arcLength : NaN;

  // Working the other way: a piece of stock, bent once, with equal legs.
  let legFromStock = NaN;
  let stockError: string | undefined;
  const stock = input.stockLength;
  if (Number.isFinite(stock)) {
    if (stock <= arcLength) {
      stockError = `Stock must be longer than the ${arcLength.toFixed(2)} of material the bend uses.`;
    } else {
      legFromStock = (stock - arcLength) / 2;
    }
  }

  return {
    valid: true,
    setback,
    arcLength,
    gain,
    tangentTotal,
    overbendAngle,
    markFromEnd,
    markFromEndB,
    markEndOfBend: Number.isFinite(markFromEnd) ? markFromEnd + arcLength : NaN,
    pieceLength,
    legFromStock,
    legError,
    stockError,
  };
}
