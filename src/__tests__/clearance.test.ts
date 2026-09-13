import { WALL_CLEARANCES, fittingWillTurn, sweptRadius, wallClearance } from '../calc/clearance';
import { screwedFitting } from '../calc/screwedFitting';
import { findRow } from '../calc/pipeData';

describe('wall clearance for turning a fitting', () => {
  test('all seventeen printed sizes', () => expect(WALL_CLEARANCES.length).toBe(17));

  test('rows read back as printed', () => {
    expect(wallClearance(0.5)).toBe(1.375);
    expect(wallClearance(2)).toBe(2.875);
    expect(wallClearance(6)).toBe(6.625);
    expect(wallClearance(12)).toBe(12.3125);
  });

  // The printed figure is the corner of the fitting band swung round on the
  // thread, which is the hypotenuse of the centre-to-end and half the band.
  // Checking it that way tests seventeen hand-read values against two other
  // hand-read tables.
  test('it matches the swept corner of the fitting', () => {
    for (const c of WALL_CLEARANCES) {
      const f = screwedFitting(c.nps)!;
      const swept = sweptRadius(f.centerToEnd, f.bandCastIron);
      expect(Math.abs(c.clearance - swept)).toBeLessThan(0.095);
    }
  });

  test('and sits at or just outside it, never well inside', () => {
    for (const c of WALL_CLEARANCES) {
      const f = screwedFitting(c.nps)!;
      expect(c.clearance).toBeGreaterThan(sweptRadius(f.centerToEnd, f.bandCastIron) - 0.04);
    }
  });

  test('it always clears half the pipe itself', () => {
    for (const c of WALL_CLEARANCES) {
      const row = findRow(c.nps);
      if (!row) continue;
      expect(c.clearance).toBeGreaterThan(row.od / 2);
    }
  });

  test('it grows with the size', () => {
    for (let i = 1; i < WALL_CLEARANCES.length; i++) {
      expect(WALL_CLEARANCES[i]!.clearance).toBeGreaterThan(WALL_CLEARANCES[i - 1]!.clearance);
    }
  });

  test('every value lands on a clean sixteenth', () => {
    for (const c of WALL_CLEARANCES) {
      expect(Math.abs(c.clearance * 16 - Math.round(c.clearance * 16))).toBeLessThan(1e-9);
    }
  });

  test('it answers whether a fitting will turn', () => {
    expect(fittingWillTurn(2, 3)).toBe(true);
    expect(fittingWillTurn(2, 2.875)).toBe(true);
    expect(fittingWillTurn(2, 2.8)).toBe(false);
  });

  test('a size not listed gives nothing rather than a guess', () => {
    expect(Number.isFinite(wallClearance(7))).toBe(false);
    expect(fittingWillTurn(7, 10)).toBeUndefined();
    expect(fittingWillTurn(2, NaN)).toBeUndefined();
  });

  test('the swept radius refuses nonsense', () => {
    expect(Number.isFinite(sweptRadius(NaN, 2))).toBe(false);
  });
});
