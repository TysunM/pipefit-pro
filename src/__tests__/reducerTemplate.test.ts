import {
  EIGHT_BY_SIX_ARM,
  REDUCER_ARM_BEVEL,
  REDUCER_TEMPLATES,
  REDUCER_V_WELD,
  halfNotch,
  reducerTemplate,
  reducerTemplateSizes,
  templateCircumference,
  templateError,
} from '../calc/reducerTemplate';
import { findRow } from '../calc/pipeData';

describe('making a concentric reducer out of pipe', () => {
  test('seven printed combinations, three by two up to twelve by ten', () => {
    expect(REDUCER_TEMPLATES.length).toBe(7);
    expect(reducerTemplateSizes()[0]).toEqual([3, 2]);
    expect(reducerTemplateSizes()[6]).toEqual([12, 10]);
  });

  test('rows read back as printed', () => {
    expect(reducerTemplate(3, 2)).toMatchObject({ arms: 4, a: 1.875, b: 0.875, c: 3 });
    expect(reducerTemplate(12, 10)).toMatchObject({ arms: 8, c: 5, d: 1 });
  });

  test('every combination steps one pipe size', () => {
    for (const t of REDUCER_TEMPLATES) {
      expect(t.small).toBeLessThan(t.large);
      expect(findRow(t.large)).toBeDefined();
      expect(findRow(t.small)).toBeDefined();
    }
  });

  // The page prints the half notch rounded to something a rule will read: the
  // four by three notch of 25/32 is printed as 3/8 rather than 25/64.
  test('the half notch column is half the notch, to the nearest thirty second', () => {
    const PRINTED: [number, number, number][] = [
      [3, 2, 7 / 16], [4, 3, 0.375], [5, 4, 13 / 32], [6, 5, 13 / 32],
      [8, 6, 17 / 32], [10, 8, 9 / 16], [12, 10, 0.375],
    ];
    for (const [large, small, printed] of PRINTED) {
      expect(Math.abs(halfNotch(large, small) - printed)).toBeLessThanOrEqual(1 / 64 + 1e-9);
    }
    expect(halfNotch(3, 2)).toBeCloseTo(7 / 16, 12);
    expect(Number.isNaN(halfNotch(14, 12))).toBe(true);
  });

  // The arms and the notches between them go all the way round the pipe, so
  // together they have to come to its circumference.
  test('the arms and notches come to the circumference of the larger pipe', () => {
    for (const t of REDUCER_TEMPLATES) {
      const actual = Math.PI * findRow(t.large)!.od;
      // Within a tenth of an inch on every row, which is as close as figures
      // rounded to a thirty second will come.
      expect(Math.abs(templateCircumference(t.large, t.small) - actual)).toBeLessThan(0.11);
      expect(Math.abs(templateError(t.large, t.small))).toBeLessThan(0.11);
    }
  });

  // The page prints 3-15/16 for the eight by six arm. That would put thirty
  // inches of arm and notch round an eight inch pipe, which is twenty seven.
  test('the eight by six arm is held as 3-7/16, not the printed 3-15/16', () => {
    expect(EIGHT_BY_SIX_ARM.printed).toBe(3.9375);
    expect(reducerTemplate(8, 6)!.a).toBe(EIGHT_BY_SIX_ARM.held);
    expect(templateCircumference(8, 6)).toBeCloseTo(27, 1);
    // What the printed figure would have given.
    const printedWorked = 6 * (EIGHT_BY_SIX_ARM.printed + reducerTemplate(8, 6)!.b);
    expect(printedWorked).toBe(30);
    expect(printedWorked - Math.PI * findRow(8)!.od).toBeGreaterThan(2.8);
  });

  test('more arms on a bigger pipe, and longer ones', () => {
    for (let i = 1; i < REDUCER_TEMPLATES.length; i++) {
      expect(REDUCER_TEMPLATES[i]!.arms).toBeGreaterThanOrEqual(REDUCER_TEMPLATES[i - 1]!.arms);
      expect(REDUCER_TEMPLATES[i]!.c).toBeGreaterThanOrEqual(REDUCER_TEMPLATES[i - 1]!.c);
    }
    expect(REDUCER_TEMPLATES[0]!.arms).toBe(4);
    expect(REDUCER_TEMPLATES[6]!.arms).toBe(8);
  });

  test('the arm count is always even, so the notches sit opposite each other', () => {
    for (const t of REDUCER_TEMPLATES) expect(t.arms % 2).toBe(0);
  });

  // Two arms bevelled at 37-1/2 degrees close into a 75 degree V.
  test('two bevels make the V weld', () => {
    expect(REDUCER_ARM_BEVEL * 2).toBe(REDUCER_V_WELD);
    expect(REDUCER_ARM_BEVEL).toBe(37.5);
  });

  test('a combination the page does not carry gives nothing', () => {
    expect(reducerTemplate(14, 12)).toBeUndefined();
    expect(reducerTemplate(3, 1)).toBeUndefined();
    expect(Number.isNaN(templateCircumference(14, 12))).toBe(true);
  });
});
