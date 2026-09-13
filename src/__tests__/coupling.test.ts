import { COUPLINGS_HEAVY, coupling, couplingSizes, reducingCoupling } from '../calc/coupling';
import { REDUCING_FITTINGS_HEAVY, reducingFittingHeavy, reducingFitting } from '../calc/reducingFitting';
import { screwedFitting } from '../calc/screwedFitting';
import { NPT_TABLE } from '../calc/thread';
import { findRow } from '../calc/pipeData';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('reducing couplings', () => {
  test('nine sizes, three-eighths to three inch', () => {
    expect(COUPLINGS_HEAVY.length).toBe(9);
    expect(couplingSizes()).toEqual([0.375, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]);
  });

  test('rows read back as printed', () => {
    expect(coupling(0.5)!.endToEnd).toBe(1.6875);
    expect(coupling(1.25)!.endToEnd).toBe(2.375);
    expect(coupling(2)!.endToEnd).toBe(3.1875);
    expect(coupling(3)!.endToEnd).toBe(4.0625);
  });

  // The printed table repeats one length across every combination sharing a
  // larger size, which is why it is held once per size here.
  test('the length depends only on the larger size', () => {
    for (const small of [0.25, 0.375, 0.5, 0.75, 1]) {
      if (small >= 1.25) continue;
      near(reducingCoupling(1.25, small), 2.375, 1e-12);
    }
    for (const small of [0.5, 0.75, 1, 1.25, 1.5]) near(reducingCoupling(2, small), 3.1875, 1e-12);
  });

  test('the pair can be given either way round', () => {
    near(reducingCoupling(0.5, 2), reducingCoupling(2, 0.5), 1e-12);
  });

  test('it grows with the size', () => {
    for (let i = 1; i < COUPLINGS_HEAVY.length; i++) {
      expect(COUPLINGS_HEAVY[i]!.endToEnd).toBeGreaterThan(COUPLINGS_HEAVY[i - 1]!.endToEnd);
    }
  });

  // A coupling has to be long enough for a joint to make up tight at each end.
  test('a coupling clears two tight makeups', () => {
    for (const c of COUPLINGS_HEAVY) {
      const t = NPT_TABLE.find((x) => x.nps === c.nps);
      if (!t) continue;
      expect(c.endToEnd).toBeGreaterThan(2 * t.engagementWhenTight);
    }
  });

  test('every size is a real pipe size', () => {
    for (const c of COUPLINGS_HEAVY) expect(findRow(c.nps)).toBeDefined();
  });

  test('a size not listed gives nothing rather than a wrong answer', () => {
    expect(coupling(4)).toBeUndefined();
    expect(Number.isFinite(reducingCoupling(8, 6))).toBe(false);
  });
});

describe('heavy class reducing fittings', () => {
  test('twenty one combinations across the two heavy tables', () => {
    expect(REDUCING_FITTINGS_HEAVY.length).toBe(21);
    expect(REDUCING_FITTINGS_HEAVY.filter((h) => h.kinds.includes('tee')).length).toBe(19);
    expect(REDUCING_FITTINGS_HEAVY.filter((h) => h.kinds.includes('elbow')).length).toBe(8);
  });

  // Six combinations appear in both heavy tables, and the elbow figures are
  // the tee figures exactly, which is how the two readings check each other.
  test('the heavy elbow and tee tables agree wherever they overlap', () => {
    const both = REDUCING_FITTINGS_HEAVY.filter(
      (h) => h.kinds.includes('elbow') && h.kinds.includes('tee')
    );
    expect(both.length).toBe(6);
    expect(both.map((h) => `${h.run}x${h.branch}`)).toEqual([
      '1x0.75', '1.25x1', '1.5x1.25', '2x1.5', '2.5x2', '3x2.5',
    ]);
  });

  test('the two the elbow table adds are made as elbows only', () => {
    expect(reducingFittingHeavy(0.5, 0.375)).toMatchObject({ x: 1.1875, z: 1.1875, kinds: ['elbow'] });
    expect(reducingFittingHeavy(0.75, 0.5)).toMatchObject({ x: 1.3125, z: 1.375, kinds: ['elbow'] });
    expect(reducingFittingHeavy(0.5, 0.375, 'tee')).toBeUndefined();
  });

  test('rows read back as printed', () => {
    expect(reducingFittingHeavy(2, 1)).toMatchObject({ x: 2, z: 2.25 });
    expect(reducingFittingHeavy(1.5, 1.25)).toMatchObject({ x: 2, z: 2.0625 });
    expect(reducingFittingHeavy(3, 2)).toMatchObject({ x: 2.8125, z: 3.125 });
  });

  // The heavy class is genuinely a different casting, not the standard one
  // relabelled, so its reducing figures differ from the standard class.
  test('a heavy reducing fitting always reaches further than the standard one', () => {
    let compared = 0;
    for (const h of REDUCING_FITTINGS_HEAVY) {
      const s = reducingFitting(h.run, h.branch);
      if (!s) continue;
      expect(h.x).toBeGreaterThan(s.x);
      expect(h.z).toBeGreaterThan(s.z);
      compared++;
    }
    expect(compared).toBeGreaterThan(15);
  });

  test('the large end stops short of a full heavy fitting in the run size', () => {
    for (const h of REDUCING_FITTINGS_HEAVY) {
      const full = screwedFitting(h.run, 'heavy');
      if (!full) continue;
      expect(h.z).toBeLessThanOrEqual(full.centerToEnd);
    }
  });

  test('the small end reaches past a full heavy fitting in the branch size', () => {
    for (const h of REDUCING_FITTINGS_HEAVY) {
      const full = screwedFitting(h.branch, 'heavy');
      if (!full) continue;
      expect(h.x).toBeGreaterThan(full.centerToEnd);
    }
  });

  test('the large end always reaches at least as far as the small one', () => {
    for (const h of REDUCING_FITTINGS_HEAVY) expect(h.z).toBeGreaterThanOrEqual(h.x);
  });

  test('every value lands on a clean sixteenth', () => {
    for (const h of REDUCING_FITTINGS_HEAVY) {
      expect(Math.abs(h.x * 16 - Math.round(h.x * 16))).toBeLessThan(1e-9);
      expect(Math.abs(h.z * 16 - Math.round(h.z * 16))).toBeLessThan(1e-9);
    }
  });

  test('every row is a tee, an elbow, or both', () => {
    for (const h of REDUCING_FITTINGS_HEAVY) {
      expect(h.kinds.length).toBeGreaterThan(0);
      for (const k of h.kinds) expect(['elbow', 'tee']).toContain(k);
    }
    expect(REDUCING_FITTINGS_HEAVY.some((h) => h.kinds.includes('cross'))).toBe(false);
  });

  test('a combination the heavy table does not carry gives nothing', () => {
    expect(reducingFittingHeavy(8, 6)).toBeUndefined();
    expect(reducingFittingHeavy(2, 2)).toBeUndefined();
  });
});

import {
  MALLEABLE_COUPLING_GAP,
  malleableCouplingGap,
  malleableCouplingLength,
  malleableCouplingSizes,
} from '../calc/coupling';
import { NIPPLES, closeNippleGap, nipple } from '../calc/nipple';

const eng = (n: number) => NPT_TABLE.find((x) => x.nps === n)!.engagementWhenTight;

describe('malleable straight couplings', () => {
  test('twelve printed sizes', () => {
    expect(MALLEABLE_COUPLING_GAP.length).toBe(12);
    expect(malleableCouplingSizes()).toEqual([
      0.125, 0.25, 0.375, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4,
    ]);
  });

  test('rows read back as printed', () => {
    expect(malleableCouplingGap(0.5)).toBe(0.3125);
    expect(malleableCouplingGap(2)).toBe(1);
    expect(malleableCouplingGap(4)).toBe(1.4375);
  });

  // The gap dips and rises at the small end. That is the table being right,
  // not a misreading: the thread engagement steps up faster than the casting.
  test('the gap is not monotonic, but the length it works back to is', () => {
    expect(malleableCouplingGap(0.375)).toBeGreaterThan(malleableCouplingGap(0.5));
    let last = 0;
    for (const c of MALLEABLE_COUPLING_GAP) {
      const len = malleableCouplingLength(c.nps);
      expect(len).toBeGreaterThan(last);
      last = len;
    }
  });

  test('the length is the gap plus the two buried threads', () => {
    for (const c of MALLEABLE_COUPLING_GAP) {
      near(malleableCouplingLength(c.nps), c.gap + 2 * eng(c.nps), 1e-12);
    }
  });

  // Malleable is a lighter casting than 300 lb cast iron, so it lays shorter
  // in every size both tables carry.
  test('it is shorter than the heavy cast iron coupling', () => {
    let compared = 0;
    for (const c of MALLEABLE_COUPLING_GAP) {
      const heavy = coupling(c.nps);
      if (!heavy) continue;
      expect(malleableCouplingLength(c.nps)).toBeLessThan(heavy.endToEnd);
      compared++;
    }
    expect(compared).toBeGreaterThan(6);
  });

  test('a size not listed gives nothing', () => {
    expect(Number.isFinite(malleableCouplingGap(5))).toBe(false);
    expect(Number.isFinite(malleableCouplingLength(5))).toBe(false);
  });
});

// The same page prints the gap a close nipple leaves, under the name short
// nipple. It is an independent reading of the close nipple column.
describe('the gap a close nipple leaves', () => {
  const PRINTED: [number, number][] = [
    [0.125, 0.25], [0.25, 0.125], [0.375, 0.25], [0.5, 0.125], [0.75, 0.25],
    [1, 0.125], [1.25, 0.25], [1.5, 0.375], [2, 0.5], [2.5, 0.625],
    [3, 0.625], [3.5, 0.625], [4, 0.625], [5, 0.5], [6, 0.5],
  ];

  test('all fifteen printed sizes work back to the close nipple length', () => {
    for (const [nps, gap] of PRINTED) {
      near(closeNippleGap(nps), gap, 1e-12);
      near(gap + 2 * eng(nps), nipple(nps)!.close, 1e-12);
    }
  });

  test('a close nipple always leaves some bare pipe', () => {
    for (const n of NIPPLES) expect(closeNippleGap(n.nps)).toBeGreaterThan(0);
  });

  test('a size not listed gives nothing', () => {
    expect(Number.isFinite(closeNippleGap(7))).toBe(false);
  });
});
