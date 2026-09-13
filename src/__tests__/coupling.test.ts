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
  test('nineteen printed combinations', () => expect(REDUCING_FITTINGS_HEAVY.length).toBe(19));

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

  test('all of them are tees', () => {
    for (const h of REDUCING_FITTINGS_HEAVY) expect(h.kinds).toEqual(['tee']);
  });

  test('a combination the heavy table does not carry gives nothing', () => {
    expect(reducingFittingHeavy(8, 6)).toBeUndefined();
    expect(reducingFittingHeavy(2, 2)).toBeUndefined();
  });
});
