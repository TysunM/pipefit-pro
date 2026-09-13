import {
  REDUCER_COUPLINGS,
  SHOULDER,
  reducerCoupling,
  reducerGap,
  reducerGapFromRule,
  reducerIsMade,
  reducerLargeSizes,
  reducerSmallSizes,
} from '../calc/reducerCoupling';
import { NPT_TABLE } from '../calc/thread';
import { findRow } from '../calc/pipeData';

const eng = (n: number) => NPT_TABLE.find((x) => x.nps === n)!.engagementWhenTight;

describe('reducer couplings', () => {
  test('both printed pages, forty two combinations', () => {
    expect(REDUCER_COUPLINGS.length).toBe(42);
  });

  test('rows read back as printed', () => {
    expect(reducerCoupling(2, 1)).toMatchObject({ j: 1, k: 1 });
    expect(reducerCoupling(3, 2)).toMatchObject({ j: 1.125, k: 1.1875 });
    expect(reducerCoupling(6, 2)!.k).toBe(2.3125);
    expect(reducerCoupling(8, 6)).toMatchObject({ j: 2.5, k: 2.5 });
  });

  test('the small end is always smaller than the large', () => {
    for (const r of REDUCER_COUPLINGS) expect(r.small).toBeLessThan(r.large);
  });

  test('every size is a real pipe size', () => {
    for (const r of REDUCER_COUPLINGS) {
      expect(findRow(r.large)).toBeDefined();
      expect(findRow(r.small)).toBeDefined();
    }
  });

  test('a combination not made carries no value rather than a zero', () => {
    expect(Number.isNaN(reducerCoupling(3.5, 2)!.j)).toBe(true);
    expect(Number.isNaN(reducerCoupling(0.75, 0.5)!.k)).toBe(true);
    expect(reducerIsMade(3.5, 2, 'j')).toBe(false);
    expect(reducerIsMade(3.5, 2, 'k')).toBe(true);
  });

  // The one rule that carries both pages.
  describe('the shoulder rule', () => {
    test('every printed K row fits it exactly, with no exception', () => {
      let checked = 0;
      for (const r of REDUCER_COUPLINGS) {
        if (!Number.isFinite(r.k)) continue;
        expect(r.k + eng(r.small)).toBeCloseTo(SHOULDER.k.get(r.large)!, 12);
        checked++;
      }
      expect(checked).toBe(39);
    });

    test('every printed J row fits it but the one inch by half', () => {
      const off: string[] = [];
      let checked = 0;
      for (const r of REDUCER_COUPLINGS) {
        if (!Number.isFinite(r.j)) continue;
        checked++;
        if (Math.abs(r.j + eng(r.small) - SHOULDER.j.get(r.large)!) > 1e-9) {
          off.push(`${r.large}x${r.small}`);
        }
      }
      expect(checked).toBe(17);
      expect(off).toEqual(['1x0.5']);
    });

    // The book prints 1/2 where its own rule wants 11/16. Pinned so it cannot
    // be quietly rounded into agreement later.
    test('the one inch by half row as printed, and what the rule wants', () => {
      expect(reducerCoupling(1, 0.5)!.j).toBe(0.5);
      expect(reducerGapFromRule(1, 0.5, 'j')).toBeCloseTo(0.6875, 12);
    });

    test('the J shoulder steps a clean quarter inch through one inch', () => {
      expect(SHOULDER.j.get(1)! - SHOULDER.j.get(0.75)!).toBeCloseTo(0.25, 12);
      expect(SHOULDER.j.get(1.25)! - SHOULDER.j.get(1)!).toBeCloseTo(0.25, 12);
    });

    // The two castings mostly share a shoulder, and where they differ it is by
    // a single sixteenth and the same way round.
    test('the two patterns agree except at two and a half and three inch', () => {
      const differ: number[] = [];
      for (const [big, j] of SHOULDER.j) {
        const k = SHOULDER.k.get(big);
        if (k === undefined) continue;
        if (Math.abs(j - k) > 1e-9) {
          differ.push(big);
          expect(k - j).toBeCloseTo(0.0625, 12);
        }
      }
      expect(differ).toEqual([2.5, 3]);
    });

    test('the shoulder grows with the large size', () => {
      for (const pattern of ['j', 'k'] as const) {
        const rows = [...SHOULDER[pattern]].sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i]![1]).toBeGreaterThanOrEqual(rows[i - 1]![1]);
        }
      }
    });
  });

  describe('the gap it leaves', () => {
    test('printed where printed, worked from the rule where not', () => {
      expect(reducerGap(3, 2, 'k')).toBe(1.1875);
      expect(reducerGap(4, 3, 'j')).toBe(1.25);
      // 6 x 3 is not made in the J pattern, but the rule still answers.
      expect(reducerIsMade(6, 3, 'j')).toBe(false);
      expect(reducerGap(6, 3, 'j')).toBeCloseTo(3.0625 - eng(3), 12);
    });

    // A bigger branch reaches further in, so less gap is left.
    test('it shrinks as the small end grows', () => {
      for (const big of reducerLargeSizes('k')) {
        const smalls = reducerSmallSizes(big, 'k');
        for (let i = 1; i < smalls.length; i++) {
          const a = reducerGap(big, smalls[i - 1]!, 'k');
          const b = reducerGap(big, smalls[i]!, 'k');
          expect(b).toBeLessThanOrEqual(a);
        }
      }
    });

    test('a reducer never swallows a pipe whole', () => {
      for (const r of REDUCER_COUPLINGS) {
        for (const p of ['j', 'k'] as const) {
          const g = r[p];
          if (!Number.isFinite(g)) continue;
          expect(g).toBeGreaterThan(0);
          expect(g).toBeLessThan(r.large);
        }
      }
    });

    test('every printed value lands on a clean sixteenth', () => {
      for (const r of REDUCER_COUPLINGS) {
        for (const v of [r.j, r.k]) {
          if (!Number.isFinite(v)) continue;
          expect(Math.abs(v * 16 - Math.round(v * 16))).toBeLessThan(1e-9);
        }
      }
    });

    test('nothing is invented for a pair no shoulder covers', () => {
      expect(Number.isFinite(reducerGap(10, 8, 'k'))).toBe(false);
      expect(Number.isFinite(reducerGap(1.5, 1, 'j'))).toBe(false);
      expect(Number.isFinite(reducerGap(2, 3, 'k'))).toBe(false);
      expect(Number.isFinite(reducerGap(2, 2, 'k'))).toBe(false);
      expect(reducerCoupling(10, 8)).toBeUndefined();
    });
  });

  describe('what is listed', () => {
    test('the K pattern is made in far more combinations than the J', () => {
      const jRows = REDUCER_COUPLINGS.filter((r) => Number.isFinite(r.j)).length;
      const kRows = REDUCER_COUPLINGS.filter((r) => Number.isFinite(r.k)).length;
      expect(kRows).toBeGreaterThan(2 * jRows);
    });

    test('sizes come back sorted and only where made', () => {
      expect(reducerLargeSizes('j')).toEqual([0.75, 1, 1.25, 2, 2.5, 3, 4, 5, 6, 8]);
      expect(reducerSmallSizes(4, 'k')).toEqual([1, 1.25, 1.5, 2, 2.5, 3]);
      expect(reducerSmallSizes(4, 'j')).toEqual([2, 2.5, 3]);
      expect(reducerSmallSizes(7, 'k')).toEqual([]);
    });

    test('every large size listed has a shoulder, and the other way about', () => {
      for (const p of ['j', 'k'] as const) {
        expect(reducerLargeSizes(p)).toEqual([...SHOULDER[p].keys()].sort((a, b) => a - b));
      }
    });
  });
});
