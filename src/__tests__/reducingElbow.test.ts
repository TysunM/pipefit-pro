import {
  REDUCING_ELBOWS, reducingElbow, reducingElbowBranches, reducingElbowRuns,
} from '../calc/reducingElbow';
import { screwedFitting } from '../calc/screwedFitting';
import { findRow } from '../calc/pipeData';

describe('screwed reducing elbows', () => {
  test('all thirty-six printed rows', () => expect(REDUCING_ELBOWS.length).toBe(36));

  test('rows read back as printed', () => {
    expect(reducingElbow(2, 1)).toMatchObject({ x: 1.75, z: 2 });
    expect(reducingElbow(3, 2)).toMatchObject({ x: 2.5, z: 2.875 });
    expect(reducingElbow(5, 4)).toMatchObject({ x: 4, z: 4.4375 });
    expect(reducingElbow(8, 6)).toMatchObject({ x: 5.5625, z: 6.375 });
  });

  test('the branch is always the smaller of the pair', () => {
    for (const r of REDUCING_ELBOWS) expect(r.branch).toBeLessThan(r.run);
  });

  // The shape that catches a mis-read digit: a reducing elbow sits between the
  // two straight elbows it replaces. Its large end never reaches as far as a
  // full elbow of the run size, and its small end always reaches further than
  // a full elbow of the branch size.
  test('the large end stops short of a full elbow in the run size', () => {
    for (const r of REDUCING_ELBOWS) {
      const full = screwedFitting(r.run);
      if (!full) continue;
      expect(r.z).toBeLessThanOrEqual(full.centerToEnd);
    }
  });

  test('the small end reaches past a full elbow in the branch size', () => {
    for (const r of REDUCING_ELBOWS) {
      const full = screwedFitting(r.branch);
      if (!full) continue;
      expect(r.x).toBeGreaterThan(full.centerToEnd);
    }
  });

  // The large end reaches further than the small one on thirty-five of the
  // thirty-six printed rows. The half by three-eighths row inverts, by exactly
  // one sixteenth, which is what a transposed pair of figures looks like. The
  // printed values are kept rather than quietly swapped, and the exception is
  // named here so it cannot be mistaken for a transcription slip later.
  const INVERTED = REDUCING_ELBOWS.filter((r) => r.z < r.x);

  test('exactly one printed row has its large end shorter than its small end', () => {
    expect(INVERTED.length).toBe(1);
    expect(INVERTED[0]).toMatchObject({ run: 0.5, branch: 0.375, x: 1.0625, z: 1 });
  });

  test('every other row has the large end reaching at least as far', () => {
    for (const r of REDUCING_ELBOWS) {
      if (r === INVERTED[0]) continue;
      expect(r.z).toBeGreaterThanOrEqual(r.x);
    }
  });

  test('every value lands on a clean sixteenth, as printed', () => {
    for (const r of REDUCING_ELBOWS) {
      expect(Math.abs(r.x * 16 - Math.round(r.x * 16))).toBeLessThan(1e-9);
      expect(Math.abs(r.z * 16 - Math.round(r.z * 16))).toBeLessThan(1e-9);
    }
  });

  test('within one run size, a smaller branch gives a smaller X', () => {
    for (const run of reducingElbowRuns()) {
      const branches = reducingElbowBranches(run);
      for (let i = 1; i < branches.length; i++) {
        const lower = reducingElbow(run, branches[i - 1]!)!;
        const higher = reducingElbow(run, branches[i]!)!;
        expect(higher.x).toBeGreaterThanOrEqual(lower.x);
      }
    }
  });

  test('the pair can be given either way round', () => {
    expect(reducingElbow(1, 2)).toEqual(reducingElbow(2, 1));
    expect(reducingElbow(0.5, 1.5)).toEqual(reducingElbow(1.5, 0.5));
  });

  test('a combination the table does not carry gives nothing', () => {
    expect(reducingElbow(2, 2)).toBeUndefined();
    expect(reducingElbow(8, 1)).toBeUndefined();
    expect(reducingElbow(10, 8)).toBeUndefined();
  });

  test('every size in the table is a real pipe size', () => {
    for (const r of REDUCING_ELBOWS) {
      expect(findRow(r.run)).toBeDefined();
      expect(findRow(r.branch)).toBeDefined();
    }
  });

  test('no pair is listed twice', () => {
    const keys = REDUCING_ELBOWS.map((r) => `${r.run}x${r.branch}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
