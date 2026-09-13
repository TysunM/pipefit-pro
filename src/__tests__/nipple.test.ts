import { LONGEST_LONG_NIPPLE, NIPPLES, longNippleLengths, nipple, nippleFor } from '../calc/nipple';
import { NPT_TABLE } from '../calc/thread';
import { findRow } from '../calc/pipeData';

describe('pipe nipples', () => {
  test('all eighteen printed sizes', () => expect(NIPPLES.length).toBe(18));

  test('rows read back as printed', () => {
    expect(nipple(0.5)).toMatchObject({ longestShortestLong: 2, short: 1.5, close: 1.125 });
    expect(nipple(2)).toMatchObject({ longestShortestLong: 3, short: 2.5, close: 2 });
    expect(nipple(6)).toMatchObject({ longestShortestLong: 5, short: 4.5, close: 3.125 });
    expect(nipple(12)).toMatchObject({ longestShortestLong: 8, short: 6, close: 4.5 });
  });

  test('close is shorter than short, which is shorter than the shortest long', () => {
    for (const n of NIPPLES) {
      expect(n.close).toBeLessThan(n.short);
      expect(n.short).toBeLessThan(n.longestShortestLong);
    }
  });

  test('every length grows with the size, or holds', () => {
    for (let i = 1; i < NIPPLES.length; i++) {
      const p = NIPPLES[i - 1]!;
      const q = NIPPLES[i]!;
      expect(q.nps).toBeGreaterThan(p.nps);
      expect(q.close).toBeGreaterThan(p.close);
      expect(q.short).toBeGreaterThanOrEqual(p.short);
      expect(q.longestShortestLong).toBeGreaterThanOrEqual(p.longestShortestLong);
    }
  });

  // A close nipple is threaded its whole length, so it has to be long enough
  // for two joints to make up on it.
  test('a close nipple clears two tight makeups', () => {
    for (const n of NIPPLES) {
      const t = NPT_TABLE.find((x) => x.nps === n.nps);
      if (!t) continue;
      expect(n.close).toBeGreaterThanOrEqual(2 * t.engagementWhenTight - 1e-9);
    }
  });

  test('every size is a real pipe size', () => {
    for (const n of NIPPLES) expect(findRow(n.nps)).toBeDefined();
  });

  describe('the lengths stocked', () => {
    test('a half inch line runs from two to twelve', () => {
      const l = longNippleLengths(0.5);
      expect(l[0]).toBe(2);
      expect(l[l.length - 1]).toBe(LONGEST_LONG_NIPPLE);
    });

    test('half inch steps to six, then whole inches', () => {
      const l = longNippleLengths(0.5);
      expect(l.filter((v) => v <= 6)).toEqual([2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]);
      expect(l.filter((v) => v > 6)).toEqual([7, 8, 9, 10, 11, 12]);
    });

    test('bigger sizes start further up the list', () => {
      expect(longNippleLengths(3)[0]).toBe(3.5);
      expect(longNippleLengths(8)[0]).toBe(5.5);
      expect(longNippleLengths(12)[0]).toBe(8);
    });

    test('nothing is stocked past twelve', () => {
      for (const n of NIPPLES) {
        for (const v of longNippleLengths(n.nps)) expect(v).toBeLessThanOrEqual(LONGEST_LONG_NIPPLE);
      }
    });

    test('a size not listed stocks nothing', () => expect(longNippleLengths(7)).toEqual([]));
  });

  describe('picking one', () => {
    test('a short reach takes a close nipple', () => {
      expect(nippleFor(2, 1.5)).toEqual({ kind: 'close', length: 2 });
      expect(nippleFor(0.5, 1)).toEqual({ kind: 'close', length: 1.125 });
    });

    test('a middling reach takes a short nipple', () => {
      expect(nippleFor(0.5, 1.4)).toEqual({ kind: 'short', length: 1.5 });
      expect(nippleFor(2, 2.2)).toEqual({ kind: 'short', length: 2.5 });
    });

    test('a longer reach takes the shortest long nipple that covers it', () => {
      expect(nippleFor(0.5, 3.2)).toEqual({ kind: 'long', length: 3.5 });
      expect(nippleFor(0.5, 6.5)).toEqual({ kind: 'long', length: 7 });
      expect(nippleFor(2, 12)).toEqual({ kind: 'long', length: 12 });
    });

    test('what is never picked is always at least as long as wanted', () => {
      for (const n of NIPPLES) {
        for (let w = 0.5; w <= 12; w += 0.25) {
          const pick = nippleFor(n.nps, w);
          if (!pick) continue;
          expect(pick.length).toBeGreaterThanOrEqual(w - 1e-9);
        }
      }
    });

    test('past twelve inches nothing is stocked and none is invented', () => {
      expect(nippleFor(2, 13)).toBeUndefined();
      expect(nippleFor(2, 0)).toBeUndefined();
      expect(nippleFor(7, 4)).toBeUndefined();
    });
  });
});
