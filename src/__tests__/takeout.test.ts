import { TAKEOUTS, screwedCut, takeout, takeoutFromTables, takeoutSizes } from '../calc/takeout';
import { NPT_TABLE } from '../calc/thread';
import { screwedFitting } from '../calc/screwedFitting';

describe('screwed fitting takeout', () => {
  test('all fifteen printed sizes', () => {
    expect(TAKEOUTS.length).toBe(15);
    expect(takeoutSizes()[0]).toBe(0.25);
    expect(takeoutSizes()[14]).toBe(8);
  });

  test('rows read back as printed', () => {
    expect(takeout(0.5)).toBe(0.625);
    expect(takeout(1)).toBe(0.8125);
    expect(takeout(2)).toBe(1.5);
    expect(takeout(6)).toBe(3.8125);
    expect(takeout(8)).toBe(5.125);
  });

  // Three tables, read off three different pages, agreeing: the printed
  // takeout is the fitting's centre to end less the engagement when tight.
  test('it is the centre to end less a tight makeup, on every size', () => {
    for (const t of TAKEOUTS) {
      expect(Math.abs(t.takeout - takeoutFromTables(t.nps))).toBeLessThan(0.05);
    }
  });

  test('half the sizes agree to a thousandth', () => {
    const close = TAKEOUTS.filter((t) => Math.abs(t.takeout - takeoutFromTables(t.nps)) < 0.005);
    expect(close.length).toBeGreaterThanOrEqual(7);
  });

  test('a takeout is always less than the fitting it comes from', () => {
    for (const t of TAKEOUTS) expect(t.takeout).toBeLessThan(screwedFitting(t.nps)!.centerToEnd);
  });

  test('and always more than nothing', () => {
    for (const t of TAKEOUTS) expect(t.takeout).toBeGreaterThan(0);
  });

  test('it grows with the size', () => {
    for (let i = 1; i < TAKEOUTS.length; i++) {
      expect(TAKEOUTS[i]!.takeout).toBeGreaterThan(TAKEOUTS[i - 1]!.takeout);
    }
  });

  test('every value lands on a clean sixteenth', () => {
    for (const t of TAKEOUTS) expect(Math.abs(t.takeout * 16 - Math.round(t.takeout * 16))).toBeLessThan(1e-9);
  });

  test('every size has a thread', () => {
    for (const t of TAKEOUTS) expect(NPT_TABLE.some((x) => x.nps === t.nps)).toBe(true);
  });

  describe('cutting to a centre to centre', () => {
    test('a two inch run between two elbows', () => {
      // 24 centre to centre, 1-1/2 off each end.
      expect(screwedCut(24, 2)).toBe(21);
    });

    test('a run between two different sizes', () => {
      expect(screwedCut(24, 2, 1)).toBeCloseTo(24 - 1.5 - 0.8125, 10);
    });

    test('the order of the two sizes does not matter', () => {
      expect(screwedCut(30, 3, 1)).toBeCloseTo(screwedCut(30, 1, 3), 12);
    });

    test('a centre to centre shorter than the two takeouts is refused', () => {
      expect(Number.isFinite(screwedCut(2, 6))).toBe(false);
      expect(Number.isFinite(screwedCut(7.625, 8))).toBe(false);
    });

    test('a size not listed is refused rather than guessed', () => {
      expect(Number.isFinite(screwedCut(24, 10))).toBe(false);
      expect(Number.isFinite(takeout(10))).toBe(false);
      expect(Number.isFinite(takeoutFromTables(7))).toBe(false);
    });

    test('cutting then adding the takeouts back gives the centre to centre', () => {
      for (const t of TAKEOUTS) {
        const c2c = 40;
        expect(screwedCut(c2c, t.nps) + 2 * t.takeout).toBeCloseTo(c2c, 10);
      }
    });
  });
});
