import {
  STREET_45_TAKEOUT,
  STREET_90_SIZES,
  streetCut,
  streetTakeout45,
  streetTakeout90,
} from '../calc/streetElbow';
import { takeout } from '../calc/takeout';
import { takeout45 } from '../calc/takeout45';
import { findRow } from '../calc/pipeData';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('street elbows', () => {
  describe('ninety degree, dimension A', () => {
    // Read off the page and held here so the claim that it matches the
    // ordinary elbow takeout is checked against print, not against itself.
    const PRINTED: [number, number][] = [
      [0.25, 7 / 16], [0.375, 9 / 16], [0.5, 5 / 8], [0.75, 3 / 4], [1, 13 / 16],
      [1.25, 1 + 1 / 16], [1.5, 1.25], [2, 1.5], [2.5, 1.75], [3, 2.125],
      [3.5, 2.375], [4, 2.625], [5, 3.25], [6, 3 + 13 / 16],
    ];

    test('fourteen printed sizes', () => {
      expect(PRINTED.length).toBe(14);
      expect(STREET_90_SIZES.length).toBe(14);
    });

    test('every printed figure is the ordinary elbow takeout, exactly', () => {
      for (const [nps, printed] of PRINTED) {
        near(printed, takeout(nps), 1e-12);
        near(streetTakeout90(nps), printed, 1e-12);
      }
    });

    test('it grows with the size', () => {
      for (let i = 1; i < PRINTED.length; i++) {
        expect(PRINTED[i]![1]).toBeGreaterThan(PRINTED[i - 1]![1]);
      }
    });

    test('street 90s stop at six inch even though the takeout table goes further', () => {
      expect(Number.isFinite(takeout(8))).toBe(true);
      expect(Number.isFinite(streetTakeout90(8))).toBe(false);
    });
  });

  describe('forty five degree, dimension C', () => {
    test('eight printed sizes, quarter inch to two', () => {
      expect(STREET_45_TAKEOUT.length).toBe(8);
      expect(STREET_45_TAKEOUT[0]!.nps).toBe(0.25);
      expect(STREET_45_TAKEOUT[7]!.nps).toBe(2);
    });

    test('rows read back as printed', () => {
      expect(streetTakeout45(0.5)).toBe(0.3125);
      expect(streetTakeout45(1.5)).toBe(0.6875);
      expect(streetTakeout45(2)).toBe(0.9375);
    });

    // A street 45 is a different casting from an ordinary one and takes out
    // less, closing the gap as the size grows until they meet at two inch.
    test('it never takes out more than an ordinary forty five', () => {
      let met = 0;
      for (const s of STREET_45_TAKEOUT) {
        const plain = takeout45(s.nps);
        expect(s.takeout).toBeLessThanOrEqual(plain);
        if (Math.abs(s.takeout - plain) < 1e-12) met++;
      }
      expect(met).toBe(1);
      near(streetTakeout45(2), takeout45(2), 1e-12);
    });

    test('a forty five always takes out less than a ninety of the same size', () => {
      for (const s of STREET_45_TAKEOUT) expect(s.takeout).toBeLessThan(streetTakeout90(s.nps));
    });

    test('it grows with the size, or holds', () => {
      for (let i = 1; i < STREET_45_TAKEOUT.length; i++) {
        expect(STREET_45_TAKEOUT[i]!.takeout).toBeGreaterThanOrEqual(
          STREET_45_TAKEOUT[i - 1]!.takeout
        );
      }
    });

    test('no street forty five is made past two inch', () => {
      for (const nps of [2.5, 3, 4, 6]) expect(Number.isFinite(streetTakeout45(nps))).toBe(false);
      expect(Number.isFinite(streetTakeout90(2.5))).toBe(true);
    });
  });

  test('every value lands on a clean sixteenth and every size is a real pipe size', () => {
    for (const s of STREET_45_TAKEOUT) {
      expect(Math.abs(s.takeout * 16 - Math.round(s.takeout * 16))).toBeLessThan(1e-9);
      expect(findRow(s.nps)).toBeDefined();
    }
    for (const nps of STREET_90_SIZES) expect(findRow(nps)).toBeDefined();
  });

  describe('cutting to it', () => {
    test('two street ninety takeouts come off a centre to centre run', () => {
      near(streetCut(24, 2), 24 - 2 * takeout(2), 1e-12);
      near(streetCut(30, 3, 1), 30 - takeout(3) - takeout(1), 1e-12);
    });

    test('a run turned by street forty fives cuts longer', () => {
      expect(streetCut(24, 1.5, 1.5, 45)).toBeGreaterThan(streetCut(24, 1.5, 1.5, 90));
    });

    test('a run too short for its own fittings is refused', () => {
      expect(Number.isFinite(streetCut(2, 6))).toBe(false);
    });

    test('a size not made is refused rather than guessed', () => {
      expect(Number.isFinite(streetCut(24, 3, 3, 45))).toBe(false);
      expect(Number.isFinite(streetCut(24, 8))).toBe(false);
    });
  });
});
