import {
  REDUCING_ELBOWS, REDUCING_FITTINGS, reducingBranches, reducingElbow, reducingFitting,
  reducingOutletTee, reducingRuns,
} from '../calc/reducingFitting';
import { screwedFitting } from '../calc/screwedFitting';
import { findRow } from '../calc/pipeData';

describe('screwed reducing fittings', () => {
  test('sixty-five combinations across the five printed tables', () => {
    expect(REDUCING_FITTINGS.length).toBe(65);
    expect(REDUCING_FITTINGS.filter((r) => r.kinds.includes('elbow')).length).toBe(42);
    expect(REDUCING_FITTINGS.filter((r) => r.kinds.includes('cross')).length).toBe(36);
    expect(REDUCING_FITTINGS.filter((r) => r.kinds.includes('tee')).length).toBe(60);
  });

  test('four small sizes come only from the malleable table', () => {
    const only = REDUCING_FITTINGS.filter((r) => r.malleableOnly);
    expect(only.map((r) => `${r.run}x${r.branch}`)).toEqual(['0.375x0.125', '0.375x0.25', '0.5x0.25', '0.75x0.25']);
    for (const r of only) expect(r.kinds).toContain('elbow');
  });

  test('a reducing outlet tee answers in the handbook\'s own names', () => {
    expect(reducingOutletTee(2, 1)).toEqual({ runC: 1.75, outletM: 2 });
    expect(reducingOutletTee(8, 6)).toEqual({ runC: 5.5625, outletM: 6.375 });
    expect(reducingOutletTee(4, 3.5)).toBeUndefined();
  });

  test('every combination is made as at least one fitting', () => {
    for (const r of REDUCING_FITTINGS) expect(r.kinds.length).toBeGreaterThan(0);
  });

  test('most combinations are made as more than one fitting', () => {
    expect(REDUCING_FITTINGS.filter((r) => r.kinds.length >= 2).length).toBeGreaterThan(40);
  });

  test('rows read back as printed', () => {
    expect(reducingFitting(2, 1)).toMatchObject({ x: 1.75, z: 2 });
    expect(reducingFitting(3, 2)).toMatchObject({ x: 2.5, z: 2.875 });
    expect(reducingFitting(5, 4)).toMatchObject({ x: 4, z: 4.4375 });
    expect(reducingFitting(8, 6)).toMatchObject({ x: 5.5625, z: 6.375 });
    expect(reducingFitting(8, 4)).toMatchObject({ x: 4.5, z: 6.1875 });
  });

  test('the kind filters what comes back', () => {
    // Made only as an elbow.
    expect(reducingFitting(6, 5, 'elbow')).toBeDefined();
    expect(reducingFitting(6, 5, 'cross')).toBeUndefined();
    // Made only as a cross.
    expect(reducingFitting(8, 4, 'cross')).toBeDefined();
    expect(reducingFitting(8, 4, 'elbow')).toBeUndefined();
    // Made as both.
    expect(reducingFitting(5, 4, 'elbow')).toBeDefined();
    expect(reducingFitting(5, 4, 'cross')).toBeDefined();
  });

  test('the branch is always the smaller of the pair', () => {
    for (const r of REDUCING_FITTINGS) expect(r.branch).toBeLessThan(r.run);
  });

  // A reducing fitting sits between the two straight fittings it replaces: its
  // large end never reaches as far as a full fitting in the run size, and its
  // small end always reaches further than a full one in the branch size.
  test('the large end stops short of a full fitting in the run size', () => {
    for (const r of REDUCING_FITTINGS) {
      const full = screwedFitting(r.run);
      if (!full) continue;
      expect(r.z).toBeLessThanOrEqual(full.centerToEnd);
    }
  });

  test('the small end reaches past a full fitting in the branch size', () => {
    for (const r of REDUCING_FITTINGS) {
      const full = screwedFitting(r.branch);
      if (!full) continue;
      expect(r.x).toBeGreaterThan(full.centerToEnd);
    }
  });

  // Thirty-five of the thirty-six printed elbow rows have the large end
  // reaching at least as far as the small one. Half by three-eighths inverts,
  // by exactly one sixteenth, which is what transposed figures look like. The
  // page was re-read at magnification; the values are kept as printed.
  const INVERTED = REDUCING_FITTINGS.filter((r) => r.z < r.x);

  test('exactly one printed row has its large end shorter than its small end', () => {
    expect(INVERTED.length).toBe(1);
    expect(INVERTED[0]).toMatchObject({ run: 0.5, branch: 0.375, x: 1.0625, z: 1 });
  });

  test('every other row has the large end reaching at least as far', () => {
    for (const r of REDUCING_FITTINGS) {
      if (r === INVERTED[0]) continue;
      expect(r.z).toBeGreaterThanOrEqual(r.x);
    }
  });

  test('every value lands on a clean sixteenth, as printed', () => {
    for (const r of REDUCING_FITTINGS) {
      expect(Math.abs(r.x * 16 - Math.round(r.x * 16))).toBeLessThan(1e-9);
      expect(Math.abs(r.z * 16 - Math.round(r.z * 16))).toBeLessThan(1e-9);
    }
  });

  test('within one run size, a smaller branch never gives a larger X', () => {
    for (const run of reducingRuns()) {
      const branches = reducingBranches(run);
      for (let i = 1; i < branches.length; i++) {
        expect(reducingFitting(run, branches[i]!)!.x).toBeGreaterThanOrEqual(
          reducingFitting(run, branches[i - 1]!)!.x
        );
      }
    }
  });

  test('the pair can be given either way round', () => {
    expect(reducingFitting(1, 2)).toEqual(reducingFitting(2, 1));
    expect(reducingFitting(0.5, 1.5)).toEqual(reducingFitting(1.5, 0.5));
  });

  test('a combination the table does not carry gives nothing', () => {
    expect(reducingFitting(2, 2)).toBeUndefined();
    expect(reducingFitting(8, 1)).toBeUndefined();
    expect(reducingFitting(10, 8)).toBeUndefined();
  });

  test('every size in the table is a real pipe size', () => {
    for (const r of REDUCING_FITTINGS) {
      expect(findRow(r.run)).toBeDefined();
      expect(findRow(r.branch)).toBeDefined();
    }
  });

  test('no pair is listed twice', () => {
    const keys = REDUCING_FITTINGS.map((r) => `${r.run}x${r.branch}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('the elbow-only view still works', () => {
    expect(REDUCING_ELBOWS.length).toBe(42);
    expect(reducingElbow(2, 1)).toMatchObject({ x: 1.75, z: 2 });
    expect(reducingElbow(8, 4)).toBeUndefined();
  });

  test('branch lists narrow when a kind is given', () => {
    expect(reducingBranches(6)).toEqual([1.5, 2, 2.5, 3, 4, 5]);
    expect(reducingBranches(6, 'elbow')).toEqual([3, 4, 5]);
    expect(reducingBranches(6, 'cross')).toEqual([2, 2.5, 3, 4]);
    expect(reducingBranches(6, 'tee')).toEqual([1.5, 2, 2.5, 3, 4, 5]);
  });

  test('a tee takes the smallest outlets, an elbow the largest', () => {
    // Tees are made down to much smaller outlets than elbows or crosses.
    expect(Math.min(...reducingBranches(8, 'tee'))).toBeLessThan(Math.min(...reducingBranches(8, 'cross')));
  });
});
