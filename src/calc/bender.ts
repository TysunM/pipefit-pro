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
  legError?: string;
};

const EMPTY: BenderResult = {
  valid: false,
  setback: NaN,
  arcLength: NaN,
  gain: NaN,
  tangentTotal: NaN,
  overbendAngle: NaN,
  markFromEnd: NaN,
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

  const leg = input.legLength;
  let markFromEnd = NaN;
  let legError: string | undefined;

  if (Number.isFinite(leg)) {
    if (leg <= 0) {
      legError = 'Leg length must be greater than zero.';
    } else if (leg < setback) {
      legError = `Leg is shorter than the ${setback.toFixed(2)} setback — the bend will not fit in it.`;
    } else {
      markFromEnd = leg - setback;
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
    legError,
  };
}
