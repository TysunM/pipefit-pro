import {
  FLANGES_150,
  FLANGES_300,
  FLANGES_400,
  FLANGES_600,
  FLANGES_900,
  FLANGES_1500,
  FLANGES_2500,
  blindFlangeThickness,
  flange,
  flangeSizes,
  lapAllowance,
  raisedFaceHeight,
} from '../calc/flange';
import { FlangeClass } from '../calc/flangedFitting';
import { findRow } from '../calc/pipeData';

const ALL: [FlangeClass, typeof FLANGES_150][] = [
  ['150', FLANGES_150],
  ['300', FLANGES_300],
  ['400', FLANGES_400],
  ['600', FLANGES_600],
  ['900', FLANGES_900],
  ['1500', FLANGES_1500],
  ['2500', FLANGES_2500],
];

describe('steel flanges', () => {
  test('sizes as printed', () => {
    for (const [, rows] of ALL.slice(0, 4)) expect(rows.length).toBe(20);
    expect(FLANGES_900.length).toBe(19);
    expect(FLANGES_1500.length).toBe(19);
    expect(FLANGES_2500.length).toBe(14);
    expect(flangeSizes('2500')[13]).toBe(12);
  });

  test('rows read back as printed', () => {
    expect(flange(2, '150')).toMatchObject({ q: 0.75, y: 1, z: 1 });
    expect(flange(24, '300')).toMatchObject({ q: 2.75, y: 4.1875, z: 6 });
    expect(flange(8, '600')).toMatchObject({ q: 2.1875, y: 3, z: 3 });
    expect(flange(12, '2500')).toMatchObject({ q: 7.25, y: 10, z: 10 });
  });

  test('three and a half inch stops at 600 lb, the same as the fittings', () => {
    for (const cls of ['150', '300', '400', '600'] as const) {
      expect(flange(3.5, cls)).toBeDefined();
    }
    for (const cls of ['900', '1500', '2500'] as const) {
      expect(flange(3.5, cls)).toBeUndefined();
    }
  });

  // A flange has to be thicker the harder it is squeezed.
  test('every class is thicker than the one below it', () => {
    for (let i = 1; i < ALL.length; i++) {
      for (const f of ALL[i]![1]) {
        const lighter = flange(f.nps, ALL[i - 1]![0]);
        if (!lighter) continue;
        // The one exception, the same place the fittings show it: below three
        // inch 900 lb is made to 1500 lb, so its three inch is the first true
        // 900 lb flange and comes back thinner than the 2-1/2.
        if (ALL[i]![0] === '900' && f.nps === 3) continue;
        expect(f.q).toBeGreaterThanOrEqual(lighter.q);
      }
    }
  });

  test('900 and 1500 lb are the same flange below three inch', () => {
    for (const nps of [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5]) {
      expect(flange(nps, '900')).toMatchObject({
        q: flange(nps, '1500')!.q,
        y: flange(nps, '1500')!.y,
      });
    }
    expect(flange(3, '900')!.q).toBeLessThan(flange(2.5, '900')!.q);
    expect(flange(3, '900')!.q).toBeLessThan(flange(3, '1500')!.q);
  });

  test('the overall length always exceeds the thickness', () => {
    for (const [, rows] of ALL) {
      for (const f of rows) {
        if (Number.isFinite(f.y)) expect(f.y).toBeGreaterThan(f.q);
        if (Number.isFinite(f.z)) expect(f.z).toBeGreaterThan(f.q);
      }
    }
  });

  // A lapped flange is never shorter than a screwed one: the lap can only add.
  test('a lapped flange is the screwed length or longer', () => {
    for (const [cls, rows] of ALL) {
      for (const f of rows) {
        if (!Number.isFinite(f.y) || !Number.isFinite(f.z)) continue;
        expect(f.z).toBeGreaterThanOrEqual(f.y);
        expect(lapAllowance(f.nps, cls)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('the lap only starts to add in the big sizes', () => {
    expect(lapAllowance(8, '150')).toBe(0);
    expect(lapAllowance(14, '150')).toBeGreaterThan(0);
    expect(lapAllowance(8, '300')).toBe(0);
    expect(lapAllowance(10, '300')).toBeGreaterThan(0);
    // The heaviest class never laps proud at all, in any size it is made in.
    for (const f of FLANGES_2500) expect(f.z).toBe(f.y);
  });

  test('1500 lb carries no screwed flange above twelve inch', () => {
    for (const nps of [14, 16, 18, 20, 24]) {
      expect(Number.isNaN(flange(nps, '1500')!.y)).toBe(true);
      expect(Number.isFinite(flange(nps, '1500')!.z)).toBe(true);
      expect(Number.isNaN(lapAllowance(nps, '1500'))).toBe(true);
    }
  });

  test('every column grows with the size, bar the one 900 lb step', () => {
    for (const [cls, rows] of ALL) {
      for (let i = 1; i < rows.length; i++) {
        if (cls === '900' && rows[i]!.nps === 3) continue;
        expect(rows[i]!.q).toBeGreaterThanOrEqual(rows[i - 1]!.q);
      }
    }
  });

  test('the raised face is a sixteenth in the light classes and a quarter above', () => {
    expect(raisedFaceHeight('150')).toBeCloseTo(1 / 16, 12);
    expect(raisedFaceHeight('300')).toBeCloseTo(1 / 16, 12);
    for (const cls of ['400', '600', '900', '1500', '2500'] as const) {
      expect(raisedFaceHeight(cls)).toBe(0.25);
    }
  });

  test('a blind flange is as thick as any other in its class', () => {
    expect(blindFlangeThickness(6, '300')).toBe(flange(6, '300')!.q);
    expect(Number.isNaN(blindFlangeThickness(30, '150'))).toBe(true);
  });

  test('every value lands on a clean sixteenth and every size is real', () => {
    for (const [, rows] of ALL) {
      for (const f of rows) {
        expect(findRow(f.nps)).toBeDefined();
        for (const v of [f.q, f.y, f.z]) {
          if (!Number.isFinite(v)) continue;
          expect(Math.abs(v * 16 - Math.round(v * 16))).toBeLessThan(1e-9);
        }
      }
    }
  });

  test('a size or class not carried gives nothing', () => {
    expect(flange(30, '150')).toBeUndefined();
    expect(flange(14, '2500')).toBeUndefined();
  });
});
