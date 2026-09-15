import { solveOffset } from '../calc/offset';
import { solveRolling } from '../calc/rolling';
import { solveCutLength } from '../calc/cutLength';
import { takeoff } from '../calc/pipe';
import { TAKEOFF_OPTIONS, elbowTakeout } from '../calc/takeoffCatalog';

/**
 * The trade check.
 *
 * Every other test in this project checks the app against the handbook or
 * against itself. This one checks it against the numbers a fitter already
 * carries: the offset multipliers off the inside of a toolbox lid. If the app
 * ever disagrees with these, the app is wrong, whatever the rest of the suite
 * says.
 *
 * Travel is the offset over the sine, run is the offset over the tangent, and
 * shrink is the difference, which works out to the offset times the tangent of
 * half the angle.
 */

const BASE = { gap: 0, nps: 2, kind: 'LR' as const, schedule: '40' as const };
const CUT = { ...BASE, customA: NaN, customB: NaN };
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

// Angle, travel per inch of offset, run per inch, shrink per inch.
const MULTIPLIERS: [number, number, number, number][] = [
  [11.25, 5.126, 5.027, 0.098],
  [22.5, 2.613, 2.414, 0.199],
  [30, 2.0, 1.732, 0.268],
  [45, 1.414, 1.0, 0.414],
  [60, 1.155, 0.577, 0.577],
  [90, 1.0, 0.0, 1.0],
];

describe('the offset multipliers off the toolbox lid', () => {
  test.each(MULTIPLIERS)('%s degrees: travel %s, run %s, shrink %s', (angle, travel, run, shrink) => {
    for (const offset of [6, 10, 12, 18, 24, 36]) {
      const r = solveOffset({ ...BASE, offset, fittingAngle: angle, lockRun: false });
      expect(r.error).toBeUndefined();
      near(r.travel / offset, travel, 5e-4);
      near(r.run / offset, run, 5e-4);
      near(r.shrink / offset, shrink, 5e-4);
    }
  });

  test('travel over run over offset is a right triangle, every time', () => {
    for (const angle of [11.25, 22.5, 30, 45, 60, 75, 90]) {
      const r = solveOffset({ ...BASE, offset: 17.375, fittingAngle: angle, lockRun: false });
      near(r.travel ** 2, r.offset ** 2 + r.run ** 2, 1e-7);
      near(Math.sin((angle * Math.PI) / 180), r.offset / r.travel, 1e-9);
    }
  });

  test('setting the run instead of the angle gives the same triangle back', () => {
    for (const angle of [11.25, 22.5, 30, 45, 60]) {
      const byAngle = solveOffset({ ...BASE, offset: 14, fittingAngle: angle, lockRun: false });
      const byRun = solveOffset({ ...BASE, offset: 14, run: byAngle.run, fittingAngle: NaN, lockRun: true });
      near(byRun.cutAngle, angle, 1e-9);
      near(byRun.pipeCut, byAngle.pipeCut, 1e-9);
    }
  });
});

describe('the cut is the travel less what the fittings take out', () => {
  // 2 inch long radius is a 3 inch bend radius, so a 90 takes out 3 inch and a
  // 45 takes out 3 x tan 22.5 = 1.2426 if it is bent, or the fitting's own
  // 1-3/8 if it is bought.
  test('a bent 2 inch long radius takes out what the radius says', () => {
    near(takeoff(2, 'LR', 90), 3, 1e-9);
    near(takeoff(2, 'LR', 45), 1.2426, 5e-5);
    near(takeoff(2, 'SR', 90), 2, 1e-9);
  });

  test('a bought 2 inch 45 is not the same as a bend, and the app knows', () => {
    const bought = elbowTakeout(2, 'LR', 45);
    expect(bought.fromTable).toBe(true);
    near(bought.value, 1.375, 1e-9);
    // A run of fittings worked to the bend formula cuts every piece long.
    expect(bought.value - takeoff(2, 'LR', 45)).toBeGreaterThan(0.13);
  });

  test('a 45 offset of 12 inch on 2 inch pipe cuts to the inch it should', () => {
    const r = solveOffset({ ...BASE, offset: 12, fittingAngle: 45, lockRun: false, gap: 0 });
    near(r.travel, 16.9706, 1e-4);
    near(r.setback, 1.2426, 1e-4);
    near(r.pipeCut, 16.9706 - 2 * 1.2426, 2e-4);
  });

  test('two 90s on a 24 inch centre to centre leave 18 inch of pipe', () => {
    const r = solveCutLength({ ...CUT, centerToCenter: 24, endA: 'elbow90', endB: 'elbow90' });
    near(r.pipeCut, 18, 1e-9);
  });

  test('a weld gap comes off both ends, and only where a joint leaves one', () => {
    const welded = solveCutLength({ ...CUT, centerToCenter: 24, endA: 'elbow90', endB: 'elbow90', gap: 0.125 });
    near(welded.pipeCut, 18 - 0.25, 1e-9);
    // A screwed joint pulls up tight. No gap comes off it.
    const screwed = TAKEOFF_OPTIONS.find((o) => o.family === 'screwed');
    expect(screwed).toBeDefined();
    const tight = solveCutLength({ ...CUT, centerToCenter: 24, endA: screwed!.id, endB: screwed!.id, gap: 0.125 });
    const noGap = solveCutLength({ ...CUT, centerToCenter: 24, endA: screwed!.id, endB: screwed!.id, gap: 0 });
    near(tight.pipeCut, noGap.pipeCut, 1e-12);
  });
});

describe('a rolling offset is the same triangle twice', () => {
  // Rise and roll make the true offset; the true offset and the run make the
  // travel. Both are right triangles, so 3-4-5 twice over is the cleanest check.
  test('12 up and 9 over is a 15 inch true offset', () => {
    const r = solveRolling({ ...BASE, rise: 12, roll: 9, run: 20, useFittingAngle: false });
    near(r.trueOffset, 15, 1e-9);
    near(r.travel, 25, 1e-9);
    near(r.rollAngle, 36.8699, 1e-4);
    near(r.cutAngle, 36.8699, 1e-4);
  });

  test('the multipliers hold for a rolling offset too', () => {
    for (const [angle, travel, run] of MULTIPLIERS) {
      const r = solveRolling({ ...BASE, rise: 8, roll: 6, useFittingAngle: true, fittingAngle: angle });
      near(r.trueOffset, 10, 1e-9);
      near(r.travel / 10, travel, 5e-4);
      near(r.run / 10, run, 5e-4);
    }
  });

  test('no roll makes it a simple offset, exactly', () => {
    const rolling = solveRolling({ ...BASE, rise: 12, roll: 0, useFittingAngle: true, fittingAngle: 45 });
    const simple = solveOffset({ ...BASE, offset: 12, fittingAngle: 45, lockRun: false });
    near(rolling.pipeCut, simple.pipeCut, 1e-9);
    near(rolling.travel, simple.travel, 1e-9);
  });
});
