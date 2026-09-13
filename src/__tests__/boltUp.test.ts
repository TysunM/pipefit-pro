import {
  BOLT_UP_125,
  BOLT_UP_250,
  boltHoleAngles,
  boltHoleClearance,
  boltHoleDiameter,
  boltSpacing,
  boltUp,
  boltUpSizes,
} from '../calc/boltUp';
import { flange } from '../calc/flange';
import { findRow } from '../calc/pipeData';

describe('drilling templates for cast iron flanges', () => {
  test('sizes as printed', () => {
    expect(BOLT_UP_125.length).toBe(27);
    expect(BOLT_UP_250.length).toBe(22);
    expect(boltUpSizes('125')[26]).toBe(96);
    expect(boltUpSizes('250')[21]).toBe(48);
  });

  test('rows read back as printed', () => {
    expect(boltUp(4)).toMatchObject({ flangeOd: 9, boltCircle: 7.5, bolts: 8, boltDiameter: 0.625 });
    expect(boltUp(12)).toMatchObject({ boltCircle: 17, bolts: 12, boltLength: 3.75 });
    expect(boltUp(4, '250')).toMatchObject({ flangeOd: 10, boltCircle: 7.875, bolts: 8 });
    expect(boltUp(24, '250')).toMatchObject({ boltDiameter: 1.6875, bolts: 24 });
  });

  // The book's own rule, printed under the table.
  test('the bolt count is always a multiple of four', () => {
    for (const rows of [BOLT_UP_125, BOLT_UP_250]) {
      for (const b of rows) expect(b.bolts % 4).toBe(0);
    }
  });

  test('the bolt circle sits inside the flange and outside the pipe', () => {
    for (const cls of ['125', '250'] as const) {
      for (const b of (cls === '125' ? BOLT_UP_125 : BOLT_UP_250)) {
        expect(b.boltCircle).toBeLessThan(b.flangeOd);
        const row = findRow(b.nps);
        if (row) expect(b.boltCircle).toBeGreaterThan(row.od);
      }
    }
  });

  test('the gasket sits inside the bolt circle and over the bore', () => {
    for (const rows of [BOLT_UP_125, BOLT_UP_250]) {
      for (const b of rows) {
        expect(b.gasketOd).toBeLessThan(b.boltCircle);
        expect(b.gasketId).toBeLessThan(b.gasketOd);
      }
    }
  });

  test('the flange, the circle, the thickness and the bolt count all grow', () => {
    for (const rows of [BOLT_UP_125, BOLT_UP_250]) {
      for (let i = 1; i < rows.length; i++) {
        const p = rows[i - 1]!;
        const q = rows[i]!;
        expect(q.flangeOd).toBeGreaterThan(p.flangeOd);
        expect(q.boltCircle).toBeGreaterThan(p.boltCircle);
        expect(q.thickness).toBeGreaterThanOrEqual(p.thickness);
        expect(q.bolts).toBeGreaterThanOrEqual(p.bolts);
      }
    }
  });

  // The bolt itself can step down a size when the count steps up: a 250 lb
  // 1-1/2 takes four 7/8 bolts and the 2 inch takes eight 3/4. What cannot
  // fall is how much bolt there is altogether.
  test('the bolt can get smaller, but never the steel holding the joint', () => {
    expect(boltUp(1.5, '250')!.boltDiameter).toBeGreaterThan(boltUp(2, '250')!.boltDiameter);
    expect(boltUp(1.5, '250')!.bolts).toBeLessThan(boltUp(2, '250')!.bolts);
    // It holds level across a run of sizes and then steps up; it never falls.
    const steel = (b: { bolts: number; boltDiameter: number }) => b.bolts * b.boltDiameter ** 2;
    for (const rows of [BOLT_UP_125, BOLT_UP_250]) {
      for (let i = 1; i < rows.length; i++) {
        expect(steel(rows[i]!)).toBeGreaterThanOrEqual(steel(rows[i - 1]!));
      }
      expect(steel(rows[rows.length - 1]!)).toBeGreaterThan(10 * steel(rows[0]!));
    }
  });

  // The heavier class is the bigger flange in every size both carry. It can
  // carry fewer bolts than the lighter one at the top of the range, because
  // the bolts themselves are so much larger: the 48 inch takes forty 2-1/4
  // bolts where the 125 lb takes forty four 1-1/2.
  test('250 lb is the heavier flange throughout, though not always more bolts', () => {
    let fewer = 0;
    for (const b of BOLT_UP_250) {
      const light = boltUp(b.nps, '125')!;
      expect(b.flangeOd).toBeGreaterThan(light.flangeOd);
      expect(b.thickness).toBeGreaterThan(light.thickness);
      expect(b.boltCircle).toBeGreaterThan(light.boltCircle);
      expect(b.bolts * b.boltDiameter ** 2).toBeGreaterThan(light.bolts * light.boltDiameter ** 2);
      if (b.bolts < light.bolts) fewer++;
    }
    expect(fewer).toBe(1);
    expect(boltUp(48, '250')!.bolts).toBeLessThan(boltUp(48, '125')!.bolts);
    expect(boltUp(48, '250')!.boltDiameter).toBeGreaterThan(boltUp(48, '125')!.boltDiameter);
  });

  // Two independently read page pairs agreeing: the cast iron thickness is the
  // steel flange thickness in the matching class, once the sizes are big
  // enough that the steel raised face no longer makes the difference.
  test('the cast iron thickness matches the steel flange above the small sizes', () => {
    for (const b of BOLT_UP_125) {
      if (b.nps < 4) continue;
      const steel = flange(b.nps, '150');
      if (!steel) continue;
      expect(b.thickness).toBe(steel.q);
    }
    for (const b of BOLT_UP_250) {
      const steel = flange(b.nps, '300');
      if (!steel) continue;
      expect(b.thickness).toBe(steel.q);
    }
  });

  describe('drilling the holes', () => {
    test('the hole is an eighth over the bolt, and more in the big sizes', () => {
      expect(boltHoleClearance(4)).toBe(0.125);
      expect(boltHoleClearance(48)).toBe(0.125);
      expect(boltHoleClearance(54)).toBe(0.25);
      expect(boltHoleClearance(20, '250')).toBe(0.125);
      expect(boltHoleClearance(24, '250')).toBe(0.1875);
      expect(boltHoleClearance(30, '250')).toBe(0.25);
    });

    test('the hole diameter follows the bolt', () => {
      expect(boltHoleDiameter(4)).toBe(0.75);
      expect(boltHoleDiameter(24, '250')).toBe(1.6875 + 0.1875);
      expect(Number.isNaN(boltHoleDiameter(7))).toBe(true);
    });

    // Holes straddle the centreline, so none sits on it. That is what lets a
    // fitting be turned a quarter turn and still bolt up.
    test('the holes straddle the centreline', () => {
      expect(boltHoleAngles(4)).toEqual([45, 135, 225, 315]);
      expect(boltHoleAngles(8)[0]).toBe(22.5);
      for (const n of [4, 8, 12, 16, 20, 24, 28, 32]) {
        const a = boltHoleAngles(n);
        expect(a.length).toBe(n);
        for (const deg of a) {
          expect(deg % 90).not.toBe(0);
          expect(deg).toBeGreaterThan(0);
          expect(deg).toBeLessThan(360);
        }
      }
    });

    test('a hole pattern turned a quarter turn lands on itself', () => {
      for (const n of [4, 8, 12, 16, 20]) {
        const a = boltHoleAngles(n);
        const turned = a.map((d) => (d + 90) % 360).sort((x, y) => x - y);
        expect(turned).toEqual(a);
      }
    });

    test('a count that is not a multiple of four is refused', () => {
      expect(boltHoleAngles(6)).toEqual([]);
      expect(boltHoleAngles(0)).toEqual([]);
      expect(boltHoleAngles(4.5)).toEqual([]);
    });

    // Stepping a bolt circle off with a rule rather than a protractor.
    test('the chord between holes is the bolt circle times the sine of half the pitch', () => {
      const b = boltUp(12)!;
      expect(boltSpacing(12)).toBeCloseTo(b.boltCircle * Math.sin(Math.PI / b.bolts), 12);
      // Twelve bolts on a 17 inch circle is a shade over four and a third.
      expect(boltSpacing(12)).toBeCloseTo(4.4, 1);
      expect(Number.isNaN(boltSpacing(7))).toBe(true);
    });

    test('the holes fit on the circle without running into each other', () => {
      for (const cls of ['125', '250'] as const) {
        for (const b of (cls === '125' ? BOLT_UP_125 : BOLT_UP_250)) {
          expect(boltSpacing(b.nps, cls)).toBeGreaterThan(boltHoleDiameter(b.nps, cls));
        }
      }
    });
  });

  test('a size not listed gives nothing', () => {
    expect(boltUp(0.5)).toBeUndefined();
    expect(boltUp(54, '250')).toBeUndefined();
    expect(Number.isNaN(boltHoleClearance(0.5))).toBe(true);
  });
});
