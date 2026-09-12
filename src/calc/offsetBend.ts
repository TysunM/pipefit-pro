import { rad } from './units';

// A two-bend offset made by bending the pipe itself rather than by fittings.
// The bend has a radius, so each bend eats a setback off the straight either
// side of it and lays down an arc of material in between. The marks below run
// from one end of the stock, in the order a fitter would strike them.

export type OffsetBendInput = {
  offset: number;
  angle: number;
  radius: number;
  legA: number;
  legB: number;
};

export type OffsetMark = { label: string; position: number };

export type OffsetBendResult = {
  valid: boolean;
  error?: string;
  setback: number;
  arcLength: number;
  travel: number;
  run: number;
  straightBetween: number;
  straightA: number;
  straightB: number;
  totalLength: number;
  marks: OffsetMark[];
};

const EMPTY: OffsetBendResult = {
  valid: false,
  setback: NaN,
  arcLength: NaN,
  travel: NaN,
  run: NaN,
  straightBetween: NaN,
  straightA: NaN,
  straightB: NaN,
  totalLength: NaN,
  marks: [],
};

export function solveOffsetBend(input: OffsetBendInput): OffsetBendResult {
  const { offset, angle, radius, legA, legB } = input;

  if (!(angle > 0 && angle < 90)) return { ...EMPTY, error: 'Offset angle must be between 0° and 90°.' };
  if (!(radius > 0)) return { ...EMPTY, error: 'Enter a bend radius greater than zero.' };
  if (!(offset > 0)) return { ...EMPTY, error: 'Enter an offset greater than zero.' };

  const setback = radius * Math.tan(rad(angle) / 2);
  const arcLength = radius * rad(angle);
  const travel = offset / Math.sin(rad(angle));
  const run = offset / Math.tan(rad(angle));

  // Between the two bends the pipe runs along the travel, less the setback
  // each bend takes out of it.
  const straightBetween = travel - 2 * setback;
  if (straightBetween < 0) {
    return { ...EMPTY, error: 'The offset is too short for this radius — the bends overlap.' };
  }

  if (!(legA > 0) || !(legB > 0)) return { ...EMPTY, error: 'Enter both legs, measured to the point of intersection.' };

  const straightA = legA - setback;
  const straightB = legB - setback;
  if (straightA < 0 || straightB < 0) {
    return { ...EMPTY, error: `A leg is shorter than the ${setback.toFixed(2)} setback.` };
  }

  const m1 = straightA;
  const m2 = m1 + arcLength;
  const m3 = m2 + straightBetween;
  const m4 = m3 + arcLength;
  const totalLength = m4 + straightB;

  return {
    valid: true,
    setback,
    arcLength,
    travel,
    run,
    straightBetween,
    straightA,
    straightB,
    totalLength,
    marks: [
      { label: 'First bend starts', position: m1 },
      { label: 'First bend ends', position: m2 },
      { label: 'Second bend starts', position: m3 },
      { label: 'Second bend ends', position: m4 },
      { label: 'Cut end', position: totalLength },
    ],
  };
}

// Two or more pipes offsetting together, holding the same spread. The near
// pipe's bend is struck this far along the run from the far pipe's.
export function equalSpreadAdvance(spread: number, angleDeg: number): number {
  if (!Number.isFinite(spread) || spread < 0) return NaN;
  if (!(angleDeg > 0 && angleDeg < 180)) return NaN;
  return spread * Math.tan(rad(angleDeg) / 2);
}
