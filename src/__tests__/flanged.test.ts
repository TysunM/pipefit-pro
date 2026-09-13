import { FLANGED_150, flangedFitting, flangedSizes } from '../calc/flangedFitting';
import { findRow } from '../calc/pipeData';

describe('150 lb flanged fitting laying lengths', () => {
  test('every printed row is present', () => expect(FLANGED_150.length).toBe(18));

  test('the rows read back', () => {
    expect(flangedFitting(2)).toMatchObject({ a: 4.5, b: 6.5, c: 2.5 });
    expect(flangedFitting(6)).toMatchObject({ a: 8, b: 11.5, c: 5 });
    expect(flangedFitting(12)).toMatchObject({ a: 12, b: 19, c: 7.5 });
    expect(flangedFitting(24)).toMatchObject({ a: 22, b: 34, c: 11 });
  });

  test('a long radius elbow always reaches further than a short one', () => {
    for (const f of FLANGED_150) expect(f.b).toBeGreaterThan(f.a);
  });

  test('a 45 is always shorter than a 90', () => {
    for (const f of FLANGED_150) expect(f.c).toBeLessThan(f.a);
  });

  test('every dimension grows with the size', () => {
    for (let i = 1; i < FLANGED_150.length; i++) {
      const p = FLANGED_150[i - 1]!;
      const q = FLANGED_150[i]!;
      expect(q.nps).toBeGreaterThan(p.nps);
      expect(q.a).toBeGreaterThanOrEqual(p.a);
      expect(q.b).toBeGreaterThan(p.b);
      expect(q.c).toBeGreaterThanOrEqual(p.c);
    }
  });

  test('every dimension is a clean sixteenth, as printed', () => {
    for (const f of FLANGED_150)
      for (const v of [f.a, f.b, f.c]) expect(Number.isInteger(v * 16)).toBe(true);
  });

  test('every size is one the pipe tables also carry', () => {
    for (const f of FLANGED_150) expect(findRow(f.nps)).toBeDefined();
  });

  test('an unlisted size gives nothing rather than a wrong answer', () => {
    expect(flangedFitting(0.5)).toBeUndefined();
    expect(flangedFitting(7)).toBeUndefined();
  });

  test('the size list matches the table', () => expect(flangedSizes().length).toBe(18));
});

import {
  BASES_150,
  LATERALS_150,
  flangedBase,
  flangedLateral,
  ringJointAllowance,
} from '../calc/flangedFitting';

describe('150 lb laterals and reducers', () => {
  test('eighteen sizes, matching the elbow table', () => {
    expect(LATERALS_150.length).toBe(18);
    expect(LATERALS_150.map((l) => l.nps)).toEqual(FLANGED_150.map((f) => f.nps));
  });

  test('rows read back as printed', () => {
    expect(flangedLateral(2)).toMatchObject({ e: 8, f: 2.5, g: 5 });
    expect(flangedLateral(12)).toMatchObject({ e: 24.5, f: 5.5, g: 14 });
    expect(flangedLateral(24)).toMatchObject({ e: 40.5, f: 9, g: 24 });
  });

  test('reducers are not made below two inch', () => {
    for (const nps of [1, 1.25, 1.5]) expect(Number.isNaN(flangedLateral(nps)!.g)).toBe(true);
    expect(Number.isFinite(flangedLateral(2)!.g)).toBe(true);
  });

  // A lateral opens at 45 degrees, so its run has to reach much further than
  // the square tee of the same size, and its short leg much less.
  test('a lateral runs longer than a tee and its short leg shorter', () => {
    for (const l of LATERALS_150) {
      const f = flangedFitting(l.nps)!;
      expect(l.e).toBeGreaterThan(f.a);
      expect(l.f).toBeLessThan(f.a);
    }
  });

  test('every column grows with the size', () => {
    for (let i = 1; i < LATERALS_150.length; i++) {
      const p = LATERALS_150[i - 1]!;
      const q = LATERALS_150[i]!;
      expect(q.e).toBeGreaterThan(p.e);
      expect(q.f).toBeGreaterThanOrEqual(p.f);
      if (Number.isFinite(p.g) && Number.isFinite(q.g)) expect(q.g).toBeGreaterThan(p.g);
    }
  });
});

describe('the ring joint rule', () => {
  test('a quarter inch from two inch up, seven thirty-seconds below', () => {
    expect(ringJointAllowance(1)).toBeCloseTo(7 / 32, 12);
    expect(ringJointAllowance(1.5)).toBeCloseTo(7 / 32, 12);
    expect(ringJointAllowance(2)).toBe(0.25);
    expect(ringJointAllowance(24)).toBe(0.25);
  });

  // Read off page 4-73 and checked against the rule, not against itself.
  test('every printed ring joint elbow figure comes out of the rule', () => {
    const PRINTED: [number, number, number, number][] = [
      [1, 3 + 23 / 32, 5 + 7 / 32, 1 + 31 / 32],
      [1.25, 3 + 31 / 32, 5 + 23 / 32, 2 + 7 / 32],
      [1.5, 4 + 7 / 32, 6 + 7 / 32, 2 + 15 / 32],
      [2, 4.75, 6.75, 2.75],
      [2.5, 5.25, 7.25, 3.25],
      [3, 5.75, 8, 3.25],
      [3.5, 6.25, 8.75, 3.75],
      [4, 6.75, 9.25, 4.25],
      [5, 7.75, 10.5, 4.75],
      [6, 8.25, 11.75, 5.25],
      [8, 9.25, 14.25, 5.75],
      [10, 11.25, 16.75, 6.75],
      [12, 12.25, 19.25, 7.75],
      [14, 14.25, 21.75, 7.75],
      [16, 15.25, 24.25, 8.25],
      [18, 16.75, 26.75, 8.75],
      [20, 18.25, 29.25, 9.75],
      [24, 22.25, 34.25, 11.25],
    ];
    expect(PRINTED.length).toBe(18);
    for (const [nps, a, b, c] of PRINTED) {
      const rj = flangedFitting(nps, '150', 'ringJoint')!;
      expect(rj.a).toBeCloseTo(a, 12);
      expect(rj.b).toBeCloseTo(b, 12);
      expect(rj.c).toBeCloseTo(c, 12);
    }
  });

  // Page 4-74. The reducer is face to face, so it takes the allowance twice.
  test('every printed ring joint lateral and reducer figure comes out of the rule', () => {
    const PRINTED: [number, number, number, number][] = [
      [1, 5 + 31 / 32, 1 + 31 / 32, NaN],
      [1.25, 6 + 15 / 32, 1 + 31 / 32, NaN],
      [1.5, 7 + 7 / 32, 2 + 7 / 32, NaN],
      [2, 8.25, 2.75, 5.5],
      [2.5, 9.75, 2.75, 6],
      [3, 10.25, 3.25, 6.5],
      [3.5, 11.75, 3.25, 7],
      [4, 12.25, 3.25, 7.5],
      [5, 13.75, 3.75, 8.5],
      [6, 14.75, 3.75, 9.5],
      [8, 17.75, 4.75, 11.5],
      [10, 20.75, 5.25, 12.5],
      [12, 24.75, 5.75, 14.5],
      [14, 27.25, 6.25, 16.5],
      [16, 30.25, 6.75, 18.5],
      [18, 32.25, 7.25, 19.5],
      [20, 35.25, 8.25, 20.5],
      [24, 40.75, 9.25, 24.5],
    ];
    for (const [nps, e, f, g] of PRINTED) {
      const rj = flangedLateral(nps, '150', 'ringJoint')!;
      expect(rj.e).toBeCloseTo(e, 12);
      expect(rj.f).toBeCloseTo(f, 12);
      if (Number.isFinite(g)) expect(rj.g).toBeCloseTo(g, 12);
      else expect(Number.isNaN(rj.g)).toBe(true);
    }
  });

  test('a ring joint fitting always reaches further than the raised face one', () => {
    for (const f of FLANGED_150) {
      const rj = flangedFitting(f.nps, '150', 'ringJoint')!;
      expect(rj.a).toBeGreaterThan(f.a);
      expect(rj.b).toBeGreaterThan(f.b);
      expect(rj.c).toBeGreaterThan(f.c);
    }
  });
});

describe('150 lb base elbows and tees', () => {
  test('fifteen sizes, two inch and up', () => {
    expect(BASES_150.length).toBe(15);
    expect(BASES_150[0]!.nps).toBe(2);
    expect(flangedBase(1)).toBeUndefined();
    expect(flangedBase(1.5)).toBeUndefined();
  });

  test('rows read back as printed', () => {
    expect(flangedBase(4)).toMatchObject({ centerToBase: 5.5, baseDiameter: 6 });
    expect(flangedBase(24)).toMatchObject({ centerToBase: 18.5, baseDiameter: 13.5 });
  });

  test('the centre to base grows with the size', () => {
    for (let i = 1; i < BASES_150.length; i++) {
      expect(BASES_150[i]!.centerToBase).toBeGreaterThan(BASES_150[i - 1]!.centerToBase);
    }
  });

  // The base is cast under the fitting, so it cannot sit closer to the centre
  // than the fitting's own body reaches.
  test('the base stands clear of the pipe it carries', () => {
    for (const b of BASES_150) {
      const row = findRow(b.nps);
      if (!row) continue;
      expect(b.centerToBase).toBeGreaterThan(row.od / 2);
      expect(b.baseDiameter).toBeGreaterThan(row.od / 2);
    }
  });

  test('the base diameter never shrinks as the size grows', () => {
    for (let i = 1; i < BASES_150.length; i++) {
      expect(BASES_150[i]!.baseDiameter).toBeGreaterThanOrEqual(BASES_150[i - 1]!.baseDiameter);
    }
  });
});

import {
  FLANGED_300,
  LATERALS_300,
  madeInRingJoint,
} from '../calc/flangedFitting';

describe('300 lb flanged fittings', () => {
  test('eighteen sizes in both tables', () => {
    expect(FLANGED_300.length).toBe(18);
    expect(LATERALS_300.length).toBe(18);
    expect(FLANGED_300.map((f) => f.nps)).toEqual(FLANGED_150.map((f) => f.nps));
  });

  test('rows read back as printed', () => {
    expect(flangedFitting(2, '300')).toMatchObject({ a: 5, b: 6.5, c: 3 });
    expect(flangedFitting(12, '300')).toMatchObject({ a: 13, b: 19, c: 8 });
    expect(flangedLateral(6, '300')).toMatchObject({ e: 17.5, f: 4, g: 9 });
  });

  // A heavier class is a heavier casting on the same centre lines: the long
  // radius elbow is the one dimension set by the bend radius alone, and it is
  // identical in both classes in every size.
  test('the long radius elbow is the same in both classes', () => {
    for (const f of FLANGED_300) {
      expect(f.b).toBe(flangedFitting(f.nps, '150')!.b);
    }
  });

  test('every other dimension reaches at least as far as the lighter class', () => {
    for (const f of FLANGED_300) {
      const light = flangedFitting(f.nps, '150')!;
      expect(f.a).toBeGreaterThan(light.a);
      expect(f.c).toBeGreaterThanOrEqual(light.c);
    }
    for (const l of LATERALS_300) {
      const light = flangedLateral(l.nps, '150')!;
      expect(l.e).toBeGreaterThan(light.e);
      expect(l.f).toBeGreaterThanOrEqual(light.f);
    }
  });

  // The reducer is a plain cone between two flanges, and from two inch up the
  // two classes give it the same face to face.
  test('the reducer matches the lighter class from two inch up', () => {
    for (const l of LATERALS_300) {
      if (l.nps < 2) continue;
      expect(l.g).toBe(flangedLateral(l.nps, '150')!.g);
    }
    expect(Number.isFinite(flangedLateral(1, '300')!.g)).toBe(true);
    expect(Number.isNaN(flangedLateral(1, '150')!.g)).toBe(true);
  });
});

describe('the 300 lb ring joint pages', () => {
  test('nothing below two inch is made with a ring joint face', () => {
    for (const nps of [1, 1.25, 1.5]) {
      expect(madeInRingJoint(nps, '300')).toBe(false);
      expect(flangedFitting(nps, '300', 'ringJoint')).toBeUndefined();
      expect(flangedLateral(nps, '300', 'ringJoint')).toBeUndefined();
    }
    expect(madeInRingJoint(1, '150')).toBe(true);
  });

  test('the allowance steps up at twenty and twenty four inch', () => {
    expect(ringJointAllowance(2, '300')).toBeCloseTo(5 / 16, 12);
    expect(ringJointAllowance(18, '300')).toBeCloseTo(5 / 16, 12);
    expect(ringJointAllowance(20, '300')).toBeCloseTo(3 / 8, 12);
    expect(ringJointAllowance(24, '300')).toBeCloseTo(7 / 16, 12);
  });

  // Read off page 4-79 and checked against the rule.
  test('every printed elbow figure comes out of the rule', () => {
    const PRINTED: [number, number, number, number][] = [
      [2, 5 + 5 / 16, 6 + 13 / 16, 3 + 5 / 16],
      [2.5, 5 + 13 / 16, 7 + 5 / 16, 3 + 13 / 16],
      [3, 6 + 5 / 16, 8 + 1 / 16, 3 + 13 / 16],
      [3.5, 6 + 13 / 16, 8 + 13 / 16, 4 + 5 / 16],
      [4, 7 + 5 / 16, 9 + 5 / 16, 4 + 13 / 16],
      [5, 8 + 5 / 16, 10 + 9 / 16, 5 + 5 / 16],
      [6, 8 + 13 / 16, 11 + 13 / 16, 5 + 13 / 16],
      [8, 10 + 5 / 16, 14 + 5 / 16, 6 + 5 / 16],
      [10, 11 + 13 / 16, 16 + 13 / 16, 7 + 5 / 16],
      [12, 13 + 5 / 16, 19 + 5 / 16, 8 + 5 / 16],
      [14, 15 + 5 / 16, 21 + 13 / 16, 8 + 13 / 16],
      [16, 16 + 13 / 16, 24 + 5 / 16, 9 + 13 / 16],
      [18, 18 + 5 / 16, 26 + 13 / 16, 10 + 5 / 16],
      [20, 19.875, 29.375, 10.875],
      [24, 22 + 15 / 16, 34 + 7 / 16, 12 + 7 / 16],
    ];
    expect(PRINTED.length).toBe(15);
    for (const [nps, a, b, c] of PRINTED) {
      const rj = flangedFitting(nps, '300', 'ringJoint')!;
      expect(rj.a).toBeCloseTo(a, 12);
      expect(rj.b).toBeCloseTo(b, 12);
      expect(rj.c).toBeCloseTo(c, 12);
    }
  });

  // Read off page 4-80. The reducer picks the allowance up twice.
  test('every printed lateral and reducer figure comes out of the rule', () => {
    const PRINTED: [number, number, number, number][] = [
      [2, 9 + 5 / 16, 2 + 13 / 16, 5.625],
      [2.5, 10 + 13 / 16, 2 + 13 / 16, 6.125],
      [3, 11 + 5 / 16, 3 + 5 / 16, 6.625],
      [3.5, 12 + 13 / 16, 3 + 5 / 16, 7.125],
      [4, 13 + 13 / 16, 3 + 5 / 16, 7.625],
      [5, 15 + 5 / 16, 3 + 13 / 16, 8.625],
      [6, 17 + 13 / 16, 4 + 5 / 16, 9.625],
      [8, 20 + 13 / 16, 5 + 5 / 16, 11.625],
      [10, 24 + 5 / 16, 5 + 13 / 16, 12.625],
      [12, 27 + 13 / 16, 6 + 5 / 16, 14.625],
      [14, 31 + 5 / 16, 6 + 13 / 16, 16.625],
      [16, 34 + 13 / 16, 7 + 13 / 16, 18.625],
      [18, 37 + 13 / 16, 8 + 5 / 16, 19.625],
      [20, 40.875, 8.875, 20.75],
      [24, 47 + 15 / 16, 10 + 7 / 16, 24.875],
    ];
    for (const [nps, e, f, g] of PRINTED) {
      const rj = flangedLateral(nps, '300', 'ringJoint')!;
      expect(rj.e).toBeCloseTo(e, 12);
      expect(rj.f).toBeCloseTo(f, 12);
      expect(rj.g).toBeCloseTo(g, 12);
    }
  });
});

import {
  FLANGED_400,
  FLANGED_600,
  FLANGED_900,
  FLANGED_1500,
  FLANGED_2500,
  LATERALS_400,
  flangedClasses,
  hasLongRadius,
} from '../calc/flangedFitting';

describe('the heavier steel classes', () => {
  test('all seven classes are carried', () => {
    expect(flangedClasses().sort()).toEqual(
      ['150', '300', '400', '600', '900', '1500', '2500'].sort()
    );
  });

  test('sizes as printed', () => {
    expect(FLANGED_400.length).toBe(20);
    expect(FLANGED_600.length).toBe(20);
    expect(FLANGED_900.length).toBe(19);
    expect(FLANGED_1500.length).toBe(19);
    expect(FLANGED_2500.length).toBe(14);
    expect(FLANGED_2500[13]!.nps).toBe(12);
  });

  test('rows read back as printed', () => {
    expect(flangedFitting(6, '600')).toMatchObject({ a: 11, c: 7.5 });
    expect(flangedFitting(24, '900')).toMatchObject({ a: 30.5, c: 18 });
    expect(flangedFitting(12, '1500')).toMatchObject({ a: 22.25, c: 13.25 });
    expect(flangedFitting(12, '2500')).toMatchObject({ a: 28, c: 17.75 });
  });

  test('only the two lightest classes carry a long radius elbow', () => {
    for (const cls of ['150', '300'] as const) expect(hasLongRadius(cls)).toBe(true);
    for (const cls of ['400', '600', '900', '1500', '2500'] as const) {
      expect(hasLongRadius(cls)).toBe(false);
      expect(Number.isNaN(flangedFitting(4, cls)!.b)).toBe(true);
    }
  });

  test('three and a half inch stops at 600 lb, and so does the lateral', () => {
    expect(flangedFitting(3.5, '600')).toBeDefined();
    expect(flangedFitting(3.5, '900')).toBeUndefined();
    expect(flangedLateral(4, '400')).toBeDefined();
    expect(flangedLateral(4, '600')).toBeUndefined();
    expect(LATERALS_400.length).toBe(20);
  });

  test('no 45 degree elbow below one inch in 2500 lb', () => {
    expect(Number.isNaN(flangedFitting(0.5, '2500')!.c)).toBe(true);
    expect(Number.isNaN(flangedFitting(0.75, '2500')!.c)).toBe(true);
    expect(flangedFitting(1, '2500')!.c).toBe(4);
  });

  // Heavier class, heavier casting, on the same centre lines.
  test('each class reaches at least as far as the one below it', () => {
    const order = ['400', '600', '900', '1500', '2500'] as const;
    for (let i = 1; i < order.length; i++) {
      for (const f of BY(order[i]!)) {
        const lighter = flangedFitting(f.nps, order[i - 1]!);
        if (!lighter) continue;
        // The one real exception, explained on the 900 lb table.
        if (order[i] === '900' && f.nps === 3) continue;
        expect(f.a).toBeGreaterThanOrEqual(lighter.a);
      }
    }
  });

  // Below three inch, 900 lb is made to the 1500 lb dimensions.
  test('900 and 1500 lb are the same casting below three inch', () => {
    for (const nps of [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5]) {
      expect(flangedFitting(nps, '900')).toMatchObject({
        a: flangedFitting(nps, '1500')!.a,
        c: flangedFitting(nps, '1500')!.c,
      });
    }
    expect(flangedFitting(3, '900')!.a).toBeLessThan(flangedFitting(3, '1500')!.a);
    expect(flangedFitting(3, '900')!.a).toBeLessThan(flangedFitting(2.5, '900')!.a);
  });
});

function BY(cls: Parameters<typeof flangedSizes>[0]) {
  return flangedSizes(cls).map((n) => flangedFitting(n, cls)!);
}

describe('the ring joint pages for the heavier classes', () => {
  // Each list is read off the printed ring joint page and checked against the
  // raised face table plus the allowance, never against itself.
  const PAGES: [Parameters<typeof flangedFitting>[1], [number, number, number][]][] = [
    ['400', [
      [0.5, 3 + 3 / 16, 1 + 15 / 16], [0.75, 3.75, 2.5], [1, 4.25, 2.5],
      [1.25, 4.5, 2.75], [1.5, 4.75, 3], [2, 5 + 13 / 16, 4 + 5 / 16],
      [2.5, 6 + 9 / 16, 4 + 9 / 16], [3, 7 + 1 / 16, 5 + 1 / 16],
      [3.5, 7 + 9 / 16, 5 + 9 / 16], [4, 8 + 1 / 16, 5 + 9 / 16],
      [5, 9 + 1 / 16, 6 + 1 / 16], [6, 9 + 13 / 16, 6 + 5 / 16],
      [8, 11 + 13 / 16, 6 + 13 / 16], [10, 13 + 5 / 16, 7 + 13 / 16],
      [12, 15 + 1 / 16, 8 + 13 / 16], [14, 16 + 5 / 16, 9 + 5 / 16],
      [16, 17 + 13 / 16, 10 + 5 / 16], [18, 19 + 5 / 16, 10 + 13 / 16],
      [20, 20.875, 11.375], [24, 24 + 7 / 16, 12 + 15 / 16],
    ]],
    ['600', [
      [0.5, 3 + 3 / 16, 1 + 15 / 16], [0.75, 3 + 23 / 32, 2 + 15 / 32],
      [1, 4 + 7 / 32, 2 + 15 / 32], [1.25, 4 + 15 / 32, 2 + 23 / 32],
      [1.5, 4 + 23 / 32, 2 + 31 / 32], [2, 5 + 13 / 16, 4 + 5 / 16],
      [2.5, 6 + 9 / 16, 4 + 9 / 16], [3, 7 + 1 / 16, 5 + 1 / 16],
      [3.5, 7 + 9 / 16, 5 + 9 / 16], [4, 8 + 9 / 16, 6 + 1 / 16],
      [5, 10 + 1 / 16, 7 + 1 / 16], [6, 11 + 1 / 16, 7 + 9 / 16],
      [8, 13 + 1 / 16, 8 + 9 / 16], [10, 15 + 9 / 16, 9 + 9 / 16],
      [12, 16 + 9 / 16, 10 + 1 / 16], [14, 17 + 9 / 16, 10 + 13 / 16],
      [16, 19 + 9 / 16, 11 + 13 / 16], [18, 21 + 9 / 16, 12 + 5 / 16],
      [20, 23.625, 13.125], [24, 27 + 11 / 16, 14 + 15 / 16],
    ]],
    ['900', [
      [1, 4 + 31 / 32, 3 + 15 / 32], [1.25, 5 + 15 / 32, 3 + 31 / 32],
      [1.5, 5 + 31 / 32, 4 + 7 / 32], [2, 7 + 5 / 16, 4 + 13 / 16],
      [2.5, 8 + 5 / 16, 5 + 5 / 16], [3, 7 + 9 / 16, 5 + 9 / 16],
      [4, 9 + 1 / 16, 6 + 9 / 16], [5, 11 + 1 / 16, 7 + 9 / 16],
      [6, 12 + 1 / 16, 8 + 1 / 16], [8, 14 + 9 / 16, 9 + 1 / 16],
      [10, 16 + 9 / 16, 10 + 1 / 16], [12, 19 + 1 / 16, 11 + 1 / 16],
      [14, 20 + 7 / 16, 11 + 11 / 16], [16, 22 + 7 / 16, 12 + 11 / 16],
      [18, 24.25, 13.5], [20, 26.25, 14.75], [24, 30.875, 18.375],
    ]],
    ['1500', [
      [1, 4 + 31 / 32, 3 + 15 / 32], [1.25, 5 + 15 / 32, 3 + 31 / 32],
      [1.5, 5 + 31 / 32, 4 + 7 / 32], [2, 7 + 5 / 16, 4 + 13 / 16],
      [2.5, 8 + 5 / 16, 5 + 5 / 16], [3, 9 + 5 / 16, 5 + 13 / 16],
      [4, 10 + 13 / 16, 7 + 5 / 16], [5, 13 + 5 / 16, 8 + 13 / 16],
      [6, 14, 9.5], [8, 16 + 9 / 16, 11 + 1 / 16],
      [10, 19 + 11 / 16, 12 + 3 / 16], [12, 22 + 9 / 16, 13 + 9 / 16],
      [14, 25.125, 14.625], [16, 27 + 11 / 16, 16 + 11 / 16],
      [18, 30 + 11 / 16, 18 + 3 / 16], [20, 33 + 3 / 16, 19 + 3 / 16],
      [24, 38 + 13 / 16, 21 + 5 / 16],
    ]],
    ['2500', [
      [0.5, 5 + 5 / 32, NaN], [0.75, 5 + 11 / 32, NaN], [1, 6 + 1 / 32, 3 + 31 / 32],
      [1.25, 6 + 15 / 16, 4 + 5 / 16], [1.5, 7.625, 4 + 13 / 16],
      [2, 8 + 15 / 16, 5 + 13 / 16], [2.5, 10.125, 6.375], [3, 11.5, 7.375],
      [4, 13 + 7 / 16, 8 + 11 / 16], [5, 15.875, 10.25], [6, 18.25, 11.75],
      [8, 20 + 7 / 16, 13 + 1 / 16], [10, 25 + 7 / 16, 16 + 7 / 16],
      [12, 28 + 7 / 16, 18 + 3 / 16],
    ]],
  ];

  for (const [cls, printed] of PAGES) {
    test(`every printed ${cls} lb figure comes out of the rule`, () => {
      expect(printed.length).toBeGreaterThan(13);
      for (const [nps, h, k] of printed) {
        const rj = flangedFitting(nps, cls, 'ringJoint');
        expect(rj).toBeDefined();
        expect(rj!.a).toBeCloseTo(h, 12);
        if (Number.isFinite(k)) expect(rj!.c).toBeCloseTo(k, 12);
        else expect(Number.isNaN(rj!.c)).toBe(true);
      }
    });
  }

  test('nothing below one inch is made with a ring joint face from 900 lb up', () => {
    for (const cls of ['900', '1500'] as const) {
      for (const nps of [0.5, 0.75]) {
        expect(flangedFitting(nps, cls, 'ringJoint')).toBeUndefined();
      }
      expect(flangedFitting(1, cls, 'ringJoint')).toBeDefined();
    }
    expect(flangedFitting(0.5, '2500', 'ringJoint')).toBeDefined();
  });

  // Where the raised face is a quarter inch rather than a sixteenth, the ring
  // groove face can come out shorter at the small end.
  test('the allowance goes negative at the small end of the heavy classes', () => {
    expect(ringJointAllowance(0.5, '400')).toBeLessThan(0);
    expect(ringJointAllowance(1, '900')).toBeLessThan(0);
    expect(ringJointAllowance(1, '150')).toBeGreaterThan(0);
    expect(Number.isNaN(ringJointAllowance(0.5, '150'))).toBe(true);
  });

  // Page 4-95 prints the 5 inch 45 degree elbow as 3-13/16, which is shorter
  // than the four inch above it and the six inch below it. The rule gives
  // 8-13/16, which is what the digit that would sit in front of it makes.
  test('the 1500 lb five inch forty five is 8-13/16, not the printed 3-13/16', () => {
    const k = flangedFitting(5, '1500', 'ringJoint')!.c;
    expect(k).toBeCloseTo(8 + 13 / 16, 12);
    expect(k).toBeGreaterThan(flangedFitting(4, '1500', 'ringJoint')!.c);
    expect(k).toBeLessThan(flangedFitting(6, '1500', 'ringJoint')!.c);
  });
});
