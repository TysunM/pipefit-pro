import {
  LONGEST_SPAN,
  SUPPORT_CAVEAT,
  SUPPORT_GAS_OR_STEAM,
  SUPPORT_WATER,
  TOP_TEMPERATURE,
  gradeGoverns,
  horizontalSpacing,
  supportCount,
  supportRow,
  supportSizes,
  supportSpacing,
} from '../calc/support';
import { findRow } from '../calc/pipeData';

describe('pipe support spacing', () => {
  test('eighteen sizes in both tables, one inch to twenty four', () => {
    expect(SUPPORT_WATER.length).toBe(18);
    expect(SUPPORT_GAS_OR_STEAM.length).toBe(18);
    expect(supportSizes()).toEqual(supportSizes('gasOrSteam'));
    expect(supportSizes()[0]).toBe(1);
    expect(supportSizes()[17]).toBe(24);
  });

  test('rows read back as printed', () => {
    expect(supportRow(4)).toMatchObject({ atmospheric: 30, at200: 21, atTop: 18 });
    expect(supportRow(4, 'gasOrSteam')).toMatchObject({ atmospheric: 33, at200: 24, atTop: 16 });
    expect(supportRow(24)!.oneInTwenty).toBe(50);
  });

  test('the top temperature column is 400 for water and 800 for gas or steam', () => {
    expect(TOP_TEMPERATURE.water).toBe(400);
    expect(TOP_TEMPERATURE.gasOrSteam).toBe(800);
  });

  // Hotter pipe carries less, in every size, in both services.
  test('the span falls as the temperature rises', () => {
    for (const rows of [SUPPORT_WATER, SUPPORT_GAS_OR_STEAM]) {
      for (const r of rows) {
        expect(r.at200).toBeLessThanOrEqual(r.atmospheric);
        if (Number.isFinite(r.atTop)) expect(r.atTop).toBeLessThanOrEqual(r.at200);
      }
    }
  });

  test('a bigger pipe carries further, and nothing is spanned past fifty feet', () => {
    for (const rows of [SUPPORT_WATER, SUPPORT_GAS_OR_STEAM]) {
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i]!.atmospheric).toBeGreaterThanOrEqual(rows[i - 1]!.atmospheric);
      }
      for (const r of rows) {
        for (const v of [r.atmospheric, r.at200, r.atTop, r.oneInTen, r.oneInTwenty]) {
          if (!Number.isFinite(v)) continue;
          expect(v).toBeLessThanOrEqual(LONGEST_SPAN);
          expect(v).toBeGreaterThan(0);
        }
      }
    }
  });

  // Water is heavier than gas or steam, so a water line hangs shorter cold in
  // every size but the one inch, where the water table gives a foot more.
  test('a water line spans less than a gas or steam line, bar the one inch', () => {
    const longer: number[] = [];
    for (const r of SUPPORT_WATER) {
      const gas = supportRow(r.nps, 'gasOrSteam')!;
      if (r.atmospheric > gas.atmospheric) longer.push(r.nps);
    }
    expect(longer).toEqual([1]);
    expect(supportRow(1)!.atmospheric - supportRow(1, 'gasOrSteam')!.atmospheric).toBe(1);
  });

  test('a tighter grade always means a shorter span', () => {
    for (const rows of [SUPPORT_WATER, SUPPORT_GAS_OR_STEAM]) {
      for (const r of rows) {
        if (!Number.isFinite(r.oneInTwenty)) continue;
        expect(r.oneInTwenty).toBeLessThanOrEqual(r.oneInTen);
      }
    }
  });

  describe('picking a span', () => {
    test('the temperature picks the column', () => {
      expect(horizontalSpacing(4, 'water', 70)).toBe(30);
      expect(horizontalSpacing(4, 'water', 200)).toBe(21);
      expect(horizontalSpacing(4, 'water', 201)).toBe(18);
      expect(horizontalSpacing(4, 'water', 400)).toBe(18);
      expect(horizontalSpacing(4, 'water', 71)).toBe(21);
    });

    test('past the top of the table nothing is worked out', () => {
      expect(Number.isNaN(horizontalSpacing(4, 'water', 500))).toBe(true);
      expect(Number.isFinite(horizontalSpacing(4, 'gasOrSteam', 500))).toBe(true);
      expect(Number.isNaN(horizontalSpacing(4, 'gasOrSteam', 900))).toBe(true);
    });

    // The rule printed under both tables. Without it a graded run would be
    // given a longer span than the steel will carry.
    test('a grade never buys a longer span than the temperature allows', () => {
      // Cold, the grade is what governs a four inch water line.
      expect(supportSpacing(4, 'water', 70, 'oneInTen')).toBe(30);
      // Hot, the temperature cuts it back well inside the grade figure.
      expect(supportSpacing(4, 'water', 400, 'oneInTen')).toBe(18);
      expect(supportRow(4)!.oneInTen).toBe(30);
      for (const service of ['water', 'gasOrSteam'] as const) {
        for (const nps of supportSizes(service)) {
          for (const t of [70, 200, TOP_TEMPERATURE[service]]) {
            for (const g of ['oneInTen', 'oneInTwenty'] as const) {
              const span = supportSpacing(nps, service, t, g);
              if (!Number.isFinite(span)) continue;
              expect(span).toBeLessThanOrEqual(horizontalSpacing(nps, service, t));
            }
          }
        }
      }
    });

    test('it says which of the two is governing', () => {
      // Cold, a two inch water line is held back by the grade, not the steel.
      expect(gradeGoverns(2, 'water', 70, 'oneInTwenty')).toBe(true);
      expect(supportSpacing(2, 'water', 70, 'oneInTwenty')).toBe(14);
      // Hot, the steel is what holds it back.
      expect(gradeGoverns(2, 'water', 400, 'oneInTwenty')).toBe(false);
      expect(supportSpacing(2, 'water', 400, 'oneInTwenty')).toBe(13);
    });

    test('a size the table does not carry gives nothing', () => {
      expect(Number.isNaN(supportSpacing(0.5))).toBe(true);
      expect(Number.isNaN(supportSpacing(30))).toBe(true);
      expect(supportRow(7)).toBeUndefined();
    });

    test('the one inch row has no top temperature figure, and none is invented', () => {
      expect(Number.isNaN(supportRow(1)!.atTop)).toBe(true);
      expect(Number.isNaN(horizontalSpacing(1, 'water', 400))).toBe(true);
      expect(Number.isNaN(supportSpacing(1, 'water', 400, 'oneInTen'))).toBe(true);
    });
  });

  describe('counting supports', () => {
    test('a run needs one more support than it has spans', () => {
      expect(supportCount(60, 4)).toBe(3);
      expect(supportCount(30, 4)).toBe(2);
      expect(supportCount(1, 4)).toBe(2);
    });

    test('a hotter line needs more of them', () => {
      expect(supportCount(120, 4, 'water', 400)).toBeGreaterThan(supportCount(120, 4, 'water', 70));
    });

    test('a run that is not a run gives nothing', () => {
      expect(Number.isNaN(supportCount(0, 4))).toBe(true);
      expect(Number.isNaN(supportCount(60, 30))).toBe(true);
    });
  });

  test('every size is a real pipe size', () => {
    for (const r of SUPPORT_WATER) expect(findRow(r.nps)).toBeDefined();
  });

  test('what the table does not cover is carried with it', () => {
    expect(SUPPORT_CAVEAT).toContain('flanges, fittings or valves');
    expect(SUPPORT_CAVEAT).toContain('insulation');
  });
});
