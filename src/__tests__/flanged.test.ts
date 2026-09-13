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
