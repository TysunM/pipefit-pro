import {
  TAKEOUTS_45,
  WYE_LENGTHS,
  takeout45,
  takeout45FromTables,
  takeout45Sizes,
  screwedCut45,
  wyeLength,
  wyeSizes,
} from '../calc/takeout45';
import { screwedFitting } from '../calc/screwedFitting';
import { NPT_TABLE } from '../calc/thread';
import { takeout } from '../calc/takeout';
import { findRow } from '../calc/pipeData';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('forty five degree elbow takeout', () => {
  test('all fifteen printed sizes', () => expect(TAKEOUTS_45.length).toBe(15));

  test('rows read back as printed', () => {
    expect(takeout45(0.5)).toBe(0.375);
    expect(takeout45(2)).toBe(0.9375);
    expect(takeout45(4)).toBe(1.5);
    expect(takeout45(8)).toBe(2.8125);
  });

  // The printed takeout is the fitting's centre to end less the thread that
  // disappears into it. Three tables that were read off three different pages
  // agree here, which is what stands in for a second source.
  test('it is the centre to end less the engagement when tight', () => {
    for (const t of TAKEOUTS_45) {
      const derived = takeout45FromTables(t.nps);
      if (!Number.isFinite(derived)) continue;
      near(t.takeout, derived, 1 / 32 + 1e-9);
    }
  });

  test('every size is covered by both source tables', () => {
    for (const t of TAKEOUTS_45) {
      expect(screwedFitting(t.nps)).toBeDefined();
      expect(NPT_TABLE.find((x) => x.nps === t.nps)).toBeDefined();
      expect(findRow(t.nps)).toBeDefined();
    }
  });

  // A 45 turns half as far, so it always takes out less than a 90 of the same
  // size. Nothing in the table may break that.
  test('a forty five always takes out less than a ninety', () => {
    let compared = 0;
    for (const t of TAKEOUTS_45) {
      const ninety = takeout(t.nps);
      if (!Number.isFinite(ninety)) continue;
      expect(t.takeout).toBeLessThan(ninety);
      compared++;
    }
    expect(compared).toBeGreaterThan(12);
  });

  // Not monotonic at the small end: the engagement steps from 3/8 to 1/2
  // between 3/8" and 1/2" pipe, further than the casting grows, so the half
  // inch row comes back down. From 1/2" up it only ever grows.
  test('it grows with the size from a half inch up', () => {
    const rows = TAKEOUTS_45.filter((t) => t.nps >= 0.5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.takeout).toBeGreaterThanOrEqual(rows[i - 1]!.takeout);
    }
  });

  test('every value lands on a clean sixteenth', () => {
    for (const t of TAKEOUTS_45) {
      expect(Math.abs(t.takeout * 16 - Math.round(t.takeout * 16))).toBeLessThan(1e-9);
    }
  });

  test('a size no table carries gives nothing rather than a wrong answer', () => {
    expect(Number.isFinite(takeout45(7))).toBe(false);
    expect(Number.isFinite(takeout45FromTables(7))).toBe(false);
  });

  // Same as dimension A: the print stops at 8 inch, the fittings do not.
  test('ten and twelve inch are worked from the rule instead of refused', () => {
    for (const nps of [10, 12]) {
      expect(takeout45(nps)).toBeCloseTo(takeout45FromTables(nps), 12);
      expect(takeout45(nps)).toBeGreaterThan(takeout45(8));
      expect(takeout45(nps)).toBeLessThan(takeout(nps));
    }
  });

  test('a run turned by two forty fives cuts longer than by two nineties', () => {
    expect(screwedCut45(24, 2)).toBeGreaterThan(24 - 2 * takeout(2));
    expect(screwedCut45(24, 2)).toBeCloseTo(24 - 2 * takeout45(2), 12);
    expect(Number.isFinite(screwedCut45(1, 2))).toBe(false);
    expect(takeout45Sizes().length).toBe(15);
  });
});

describe('screwed wye laying lengths', () => {
  test('all ten printed sizes', () => expect(WYE_LENGTHS.length).toBe(10));

  test('rows read back as printed', () => {
    expect(wyeLength(1)).toMatchObject({ eCastIron: 2.0625, eMalleable: 1.75 });
    expect(wyeLength(2)).toMatchObject({ fCastIron: 0.5, fMalleable: 0.6875 });
    expect(wyeLength(4)).toMatchObject({ eCastIron: 6.5, eMalleable: 5.8125 });
  });

  // A dash in the print means the size is not made. Held as no value, so a
  // layout cannot quietly use zero and cut the pipe long.
  test('a size not made carries no value rather than a zero', () => {
    expect(Number.isNaN(wyeLength(0.375)!.eCastIron)).toBe(true);
    expect(Number.isNaN(wyeLength(0.5)!.fCastIron)).toBe(true);
    expect(wyeSizes('castIron')).toEqual([0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4]);
    expect(wyeSizes('malleable').length).toBe(10);
  });

  test('every listed length grows with the size', () => {
    for (const material of ['castIron', 'malleable'] as const) {
      const rows = WYE_LENGTHS.filter((w) =>
        Number.isFinite(material === 'castIron' ? w.eCastIron : w.eMalleable)
      );
      for (let i = 1; i < rows.length; i++) {
        const p = material === 'castIron' ? rows[i - 1]!.eCastIron : rows[i - 1]!.eMalleable;
        const q = material === 'castIron' ? rows[i]!.eCastIron : rows[i]!.eMalleable;
        expect(q).toBeGreaterThan(p);
      }
    }
  });

  // Malleable is forged thinner than cast iron, so the same size lays shorter.
  test('a malleable wye is shorter than the cast iron one', () => {
    for (const w of WYE_LENGTHS) {
      if (!Number.isFinite(w.eCastIron)) continue;
      expect(w.eMalleable).toBeLessThan(w.eCastIron);
    }
  });

  // The leg has to be long enough for the joint to make up tight.
  test('every leg clears a tight makeup', () => {
    for (const w of WYE_LENGTHS) {
      const t = NPT_TABLE.find((x) => x.nps === w.nps);
      if (!t) continue;
      for (const e of [w.eCastIron, w.eMalleable]) {
        if (!Number.isFinite(e)) continue;
        expect(e).toBeGreaterThan(t.engagementWhenTight);
      }
    }
  });

  test('the branch offset is small against the leg', () => {
    for (const w of WYE_LENGTHS) {
      for (const [e, f] of [[w.eCastIron, w.fCastIron], [w.eMalleable, w.fMalleable]] as const) {
        if (!Number.isFinite(e)) continue;
        expect(f).toBeGreaterThan(0);
        expect(f).toBeLessThan(e / 2);
      }
    }
  });

  test('every value lands on a clean sixteenth', () => {
    for (const w of WYE_LENGTHS) {
      for (const v of [w.eCastIron, w.eMalleable, w.fCastIron, w.fMalleable]) {
        if (!Number.isFinite(v)) continue;
        expect(Math.abs(v * 16 - Math.round(v * 16))).toBeLessThan(1e-9);
      }
    }
  });

  test('every size is a real pipe size', () => {
    for (const w of WYE_LENGTHS) expect(findRow(w.nps)).toBeDefined();
  });

  test('a size not listed gives nothing', () => {
    expect(wyeLength(6)).toBeUndefined();
    expect(wyeLength(3.5)).toBeUndefined();
  });
});
