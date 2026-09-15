import { findRow } from './pipeData';

// Making a concentric reducer out of pipe, page 2-63.
//
// Points A and B are centre punched alternately round the pipe, the arms are
// torch cut to length C, heated at the base line and pushed in to D. The arms
// are bevelled at 37-1/2 degrees, which closes into a 75 degree V weld.
//
// The A and B figures divide the larger pipe's circumference between them:
// arms x (A + B) is that circumference, on every row of the page but one.

export type ReducerTemplate = {
  large: number;
  small: number;
  arms: number;
  /** Width of the arm at the base line. */
  a: number;
  /** Width of the notch cut between two arms. */
  b: number;
  /** Length of the arms. */
  c: number;
  /** How far the arms are pushed in. */
  d: number;
};

/** Bevel on each arm. Two of them close into the V weld. */
export const REDUCER_ARM_BEVEL = 37.5;
export const REDUCER_V_WELD = 75;

export const REDUCER_TEMPLATES: ReducerTemplate[] = [
  { large: 3, small: 2, arms: 4, a: 1.875, b: 0.875, c: 3, d: 9 / 16 },
  { large: 4, small: 3, arms: 4, a: 2.75, b: 25 / 32, c: 3, d: 0.5 },
  { large: 5, small: 4, arms: 4, a: 3.5, b: 27 / 32, c: 3, d: 0.5 },
  { large: 6, small: 5, arms: 4, a: 4.375, b: 27 / 32, c: 3, d: 0.5 },
  // The page prints A as 3-15/16 here. Six arms of 3-15/16 plus 1-1/16 comes
  // to thirty inches round an eight inch pipe, which is twenty seven. At
  // 3-7/16 it comes to twenty seven, in line with every other row.
  { large: 8, small: 6, arms: 6, a: 3.4375, b: 1.0625, c: 4, d: 1 },
  { large: 10, small: 8, arms: 6, a: 4.5, b: 1.125, c: 4, d: 1 },
  { large: 12, small: 10, arms: 8, a: 4 + 7 / 32, b: 25 / 32, c: 5, d: 1 },
];

/** What page 2-63 prints for the eight by six arm width, against what is held. */
export const EIGHT_BY_SIX_ARM = { printed: 3.9375, held: 3.4375 };

const key = (large: number, small: number) => `${large}x${small}`;
const BY_PAIR = new Map(REDUCER_TEMPLATES.map((t) => [key(t.large, t.small), t]));

export const reducerTemplate = (large: number, small: number): ReducerTemplate | undefined =>
  BY_PAIR.get(key(large, small));

/**
 * Half the notch, which is what is marked either side of the seam so the
 * pattern closes on itself. The page prints it as its own column.
 */
export const halfNotch = (large: number, small: number): number => {
  const t = reducerTemplate(large, small);
  return t ? t.b / 2 : NaN;
};

/** The larger pipe's circumference, which the arms and notches divide up. */
export function templateCircumference(large: number, small: number): number {
  const t = reducerTemplate(large, small);
  if (!t) return NaN;
  return t.arms * (t.a + t.b);
}

export const reducerTemplateSizes = (): [number, number][] =>
  REDUCER_TEMPLATES.map((t) => [t.large, t.small]);

/** How far the worked circumference is from the pipe's actual one. */
export function templateError(large: number, small: number): number {
  const worked = templateCircumference(large, small);
  const row = findRow(large);
  if (!row || !Number.isFinite(worked)) return NaN;
  return worked - Math.PI * row.od;
}
