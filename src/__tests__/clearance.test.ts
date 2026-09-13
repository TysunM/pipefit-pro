import {
  WALL_CLEARANCES, fittingWillTurn, parallelLineSpacing, sweptRadius, wallClearance,
} from '../calc/clearance';
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

describe('parallel line spacing', () => {
  // The handbook prints these as pairs over four pages and states the rule
  // behind them. Computing from the rule reproduces every printed pair, so the
  // pages do not need transcribing and every pair is covered, not just the
  // ones printed.
  const PRINTED: [number, number, number][] = [
    [5, 5, 9.3125], [5, 6, 10.1875], [5, 8, 12.0625], [5, 10, 13.875],
    [6, 6, 10.75], [6, 8, 12.625], [6, 10, 14.5],
    [8, 8, 13.8125], [8, 10, 15.6875], [10, 10, 16.9375],
    [12, 5, 15.875], [12, 6, 16.4375], [12, 8, 17.625], [12, 10, 18.875], [12, 12, 20],
  ];

  test.each(PRINTED)('%s and %s line up at the printed spacing', (a, b, printed) => {
    expect(Math.abs(parallelLineSpacing(a, b) - printed)).toBeLessThan(0.1);
  });

  test('the order of the pair does not matter', () => {
    for (const [a, b] of PRINTED) {
      expect(parallelLineSpacing(a, b)).toBeCloseTo(parallelLineSpacing(b, a), 12);
    }
  });

  test('two of the same size need more room than one of them off a wall', () => {
    for (const c of WALL_CLEARANCES) {
      if (c.nps < 0.5) continue;
      expect(parallelLineSpacing(c.nps, c.nps)).toBeGreaterThan(c.clearance);
    }
  });

  test('a bigger neighbour always needs more room', () => {
    const sizes = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12];
    for (let i = 1; i < sizes.length; i++) {
      expect(parallelLineSpacing(2, sizes[i]!)).toBeGreaterThan(parallelLineSpacing(2, sizes[i - 1]!));
    }
  });

  test('it always clears both pipes', () => {
    for (const a of [0.5, 1, 2, 4, 8, 12])
      for (const b of [0.5, 1, 2, 4, 8, 12]) {
        const ra = findRow(a)!.od / 2;
        const rb = findRow(b)!.od / 2;
        expect(parallelLineSpacing(a, b)).toBeGreaterThan(ra + rb);
      }
  });

  test('a size not listed gives nothing', () => {
    expect(Number.isFinite(parallelLineSpacing(7, 2))).toBe(false);
    expect(Number.isFinite(parallelLineSpacing(2, 0.125))).toBe(false);
  });
});
