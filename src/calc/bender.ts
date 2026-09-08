import { rad } from './units';

export type BenderPreset = {
  id: string;
  label: string;
  radius: number;
  takeUp: number;
  note: string;
};

export const BENDER_PRESETS: BenderPreset[] = [
  { id: '15-16', label: '15/16"', radius: 4.0, takeUp: 5.0, note: '1/2" EMT hand bender' },
  { id: '1-1-2', label: '1 1/2"', radius: 5.25, takeUp: 6.0, note: '3/4" EMT hand bender' },
  { id: '2-1-2', label: '2 1/2"', radius: 7.0, takeUp: 8.0, note: '1" EMT hand bender' },
];

export type BenderInput = {
  angle: number;
  radius: number;
  takeUp: number;
  stubHeight: number;
};

export type BenderResult = {
  valid: boolean;
  error?: string;
  setback: number;
  arcLength: number;
  gain: number;
  tangentTotal: number;
  stubMark: number;
  developedLength: number;
};

export function solveBender(input: BenderInput): BenderResult {
  const { angle, radius } = input;
  const empty: BenderResult = {
    valid: false,
    setback: NaN,
    arcLength: NaN,
    gain: NaN,
    tangentTotal: NaN,
    stubMark: NaN,
    developedLength: NaN,
  };

  if (!(angle > 0 && angle < 180)) return { ...empty, error: 'Bend angle must be between 0° and 180°.' };
  if (!Number.isFinite(radius) || radius <= 0) return { ...empty, error: 'Enter a bend radius greater than zero.' };

  const setback = radius * Math.tan(rad(angle) / 2);
  const arcLength = radius * rad(angle);
  const tangentTotal = setback * 2;
  const gain = tangentTotal - arcLength;
  const stub = Number.isFinite(input.stubHeight) ? input.stubHeight : NaN;
  const takeUp = Number.isFinite(input.takeUp) ? input.takeUp : setback;

  return {
    valid: true,
    setback,
    arcLength,
    gain,
    tangentTotal,
    stubMark: Number.isFinite(stub) ? stub - takeUp : NaN,
    developedLength: arcLength,
  };
}
