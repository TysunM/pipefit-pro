import {
  COMBINED_TEES,
  UNIONS,
  combinedTee,
  combinedTeeSizes,
  union,
  unionGap,
  unionLength,
  unionSizes,
  unionTakeout,
} from '../calc/union';
import { NPT_TABLE } from '../calc/thread';
import { screwedFitting } from '../calc/screwedFitting';
import { streetTakeout90 } from '../calc/streetElbow';
import { malleableCouplingLength } from '../calc/coupling';
import { findRow } from '../calc/pipeData';

const eng = (n: number) => NPT_TABLE.find((x) => x.nps === n)!.engagementWhenTight;
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('unions', () => {
  test('ten printed sizes, quarter inch to three', () => {
    expect(UNIONS.length).toBe(10);
    expect(unionSizes()).toEqual([0.25, 0.375, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]);
  });

  test('rows read back as printed', () => {
    expect(unionGap(0.5)).toBe(1.1875);
    expect(unionTakeout(0.5)).toBe(1.625);
    expect(unionGap(3)).toBe(2.5625);
    expect(union(2)).toMatchObject({ gap: 1.8125, takeout: 3.125 });
  });

  test('both columns grow with the size', () => {
    for (let i = 1; i < UNIONS.length; i++) {
      expect(UNIONS[i]!.gap).toBeGreaterThan(UNIONS[i - 1]!.gap);
      const a = UNIONS[i - 1]!.takeout;
      const b = UNIONS[i]!.takeout;
      if (Number.isFinite(a) && Number.isFinite(b)) expect(b).toBeGreaterThan(a);
    }
  });

  test('a tee or elbow union is not made past two inch', () => {
    expect(Number.isNaN(unionTakeout(2.5))).toBe(true);
    expect(Number.isNaN(unionTakeout(3))).toBe(true);
    expect(Number.isFinite(unionGap(3))).toBe(true);
  });

  // A union is a longer fitting than a coupling in the same size: it carries a
  // seat, a nut and two threads rather than one straight bore.
  test('a union is longer than a coupling in the same size', () => {
    let compared = 0;
    for (const u of UNIONS) {
      const c = malleableCouplingLength(u.nps);
      if (!Number.isFinite(c)) continue;
      expect(unionLength(u.nps)).toBeGreaterThan(c);
      compared++;
    }
    expect(compared).toBeGreaterThan(7);
  });

  test('the length is the gap plus the two buried threads, and it climbs', () => {
    let last = 0;
    for (const u of UNIONS) {
      near(unionLength(u.nps), u.gap + 2 * eng(u.nps), 1e-12);
      expect(unionLength(u.nps)).toBeGreaterThan(last);
      last = unionLength(u.nps);
    }
  });

  // A tee union carries the union's seat outboard of where a plain tee ends,
  // so its takeout has to reach past the plain fitting's centre to end.
  test('a union takeout reaches past the plain fitting it replaces', () => {
    for (const u of UNIONS) {
      if (!Number.isFinite(u.takeout)) continue;
      const plain = screwedFitting(u.nps);
      if (!plain) continue;
      expect(u.takeout).toBeGreaterThan(plain.centerToEnd);
    }
  });

  test('every value lands on a clean sixteenth and every size is real', () => {
    for (const u of UNIONS) {
      for (const v of [u.gap, u.takeout]) {
        if (!Number.isFinite(v)) continue;
        expect(Math.abs(v * 16 - Math.round(v * 16))).toBeLessThan(1e-9);
      }
      expect(findRow(u.nps)).toBeDefined();
    }
  });

  test('a size not listed gives nothing', () => {
    expect(union(4)).toBeUndefined();
    expect(Number.isFinite(unionGap(4))).toBe(false);
    expect(Number.isFinite(unionLength(0.125))).toBe(false);
  });
});

describe('a tee with a street elbow made up into it', () => {
  test('twelve printed sizes, an eighth to four', () => {
    expect(COMBINED_TEES.length).toBe(12);
    expect(combinedTeeSizes()[0]).toBe(0.125);
    expect(combinedTeeSizes()[11]).toBe(4);
  });

  test('rows read back as printed', () => {
    expect(combinedTee(0.5)).toBe(2.25);
    expect(combinedTee(0.5, 45)).toBe(1.8125);
    expect(combinedTee(4)).toBe(8.3125);
  });

  // The two cells whose denominator is inked over on the page. Sixteenths are
  // the only reading that falls between the rows either side.
  test('the two damaged cells are read as sixteenths and sit in order', () => {
    expect(combinedTee(0.125)).toBe(1.4375);
    expect(combinedTee(0.125)).toBeLessThan(combinedTee(0.25));
    expect(combinedTee(1)).toBe(2.9375);
    expect(combinedTee(1)).toBeGreaterThan(combinedTee(0.75));
    expect(combinedTee(1)).toBeLessThan(combinedTee(1.25));
  });

  test('both columns grow with the size', () => {
    for (let i = 1; i < COMBINED_TEES.length; i++) {
      expect(COMBINED_TEES[i]!.with90).toBeGreaterThan(COMBINED_TEES[i - 1]!.with90);
      const a = COMBINED_TEES[i - 1]!.with45;
      const b = COMBINED_TEES[i]!.with45;
      if (Number.isFinite(a) && Number.isFinite(b)) expect(b).toBeGreaterThan(a);
    }
  });

  // A 45 turns half as far, so its free end comes back closer to the tee.
  test('a forty five always sits closer in than a ninety', () => {
    for (const c of COMBINED_TEES) {
      if (!Number.isFinite(c.with45)) continue;
      expect(c.with45).toBeLessThan(c.with90);
    }
  });

  test('street forty fives stop at two inch here too', () => {
    for (const nps of [2.5, 3, 4]) expect(Number.isNaN(combinedTee(nps, 45))).toBe(true);
    expect(Number.isFinite(combinedTee(2, 45))).toBe(true);
  });

  // Two fittings in series have to reach further than either one alone.
  test('it reaches past the tee and the street elbow taken separately', () => {
    for (const c of COMBINED_TEES) {
      const tee = screwedFitting(c.nps);
      const ell = streetTakeout90(c.nps);
      if (!tee || !Number.isFinite(ell)) continue;
      expect(c.with90).toBeGreaterThan(tee.centerToEnd);
      expect(c.with90).toBeGreaterThan(ell);
      expect(c.with90).toBeLessThan(tee.centerToEnd + ell + 2 * eng(c.nps));
    }
  });

  test('every value lands on a clean sixteenth and every size is real', () => {
    for (const c of COMBINED_TEES) {
      for (const v of [c.with90, c.with45]) {
        if (!Number.isFinite(v)) continue;
        expect(Math.abs(v * 16 - Math.round(v * 16))).toBeLessThan(1e-9);
      }
      expect(findRow(c.nps)).toBeDefined();
    }
  });

  test('three and a half is not made, and is not invented', () => {
    expect(Number.isFinite(combinedTee(3.5))).toBe(false);
    expect(Number.isFinite(combinedTee(6))).toBe(false);
  });
});
