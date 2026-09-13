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
