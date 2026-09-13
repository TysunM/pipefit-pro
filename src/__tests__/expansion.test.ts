import {
  EXPANSION,
  HIGHEST_TEMPERATURE,
  STEEL_AT_1100,
  expansion,
  expansionPerHundredFeet,
  expansionTemperatures,
  growthFromZero,
} from '../calc/expansion';

describe('expansion of pipe', () => {
  test('twenty nine printed temperatures, nought to twelve hundred', () => {
    expect(EXPANSION.length).toBe(29);
    expect(expansionTemperatures()[0]).toBe(0);
    expect(expansionTemperatures()[28]).toBe(HIGHEST_TEMPERATURE);
  });

  test('rows read back as printed', () => {
    expect(growthFromZero(400, 'steel')).toBe(3.245);
    expect(growthFromZero(60, 'steel')).toBe(0.449);
    expect(growthFromZero(1200, 'copper')).toBe(15.397);
  });

  // The book's own worked example, on page 5-25.
  test('the worked example comes out at 20.69 inches', () => {
    expect(expansionPerHundredFeet(60, 400, 'steel')).toBeCloseTo(2.796, 3);
    expect(expansion(740, 60, 400, 'steel')).toBeCloseTo(20.69, 2);
  });

  test('nothing grows at nought degrees', () => {
    for (const m of ['steel', 'wroughtIron', 'copper'] as const) {
      expect(growthFromZero(0, m)).toBe(0);
    }
  });

  // Copper moves most, wrought iron a little more than steel.
  test('copper moves most and steel least, at every temperature', () => {
    for (const r of EXPANSION) {
      if (r.temperatureF === 0) continue;
      expect(r.copper).toBeGreaterThan(r.wroughtIron);
      expect(r.wroughtIron).toBeGreaterThan(r.steel);
    }
  });

  test('every column grows with the temperature', () => {
    for (const m of ['steel', 'wroughtIron', 'copper'] as const) {
      for (let i = 1; i < EXPANSION.length; i++) {
        expect(EXPANSION[i]![m]).toBeGreaterThan(EXPANSION[i - 1]![m]);
      }
    }
  });

  // The page prints 10.042 for steel at 1100, which puts a step of 0.767 next
  // to one of 1.556 in a column whose other hundred degree steps all run
  // between one and one and a quarter. The two digits after the point have been
  // swapped. The wrought iron and copper columns are regular in the same place.
  test('the steel figure at 1100 degrees is held as 10.402, not the printed 10.042', () => {
    expect(STEEL_AT_1100.printed).toBe(10.042);
    expect(growthFromZero(1100, 'steel')).toBe(10.402);

    const step = (a: number, b: number, m: 'steel' | 'wroughtIron' | 'copper') =>
      growthFromZero(b, m) - growthFromZero(a, m);
    for (const m of ['steel', 'wroughtIron', 'copper'] as const) {
      const before = step(1000, 1100, m);
      const after = step(1100, 1200, m);
      expect(Math.abs(after - before)).toBeLessThan(0.3);
    }
    // What the printed figure would have done to those two steps.
    expect(STEEL_AT_1100.printed - 9.275).toBeCloseTo(0.767, 3);
    expect(11.598 - STEEL_AT_1100.printed).toBeCloseTo(1.556, 3);
  });

  describe('working out a run', () => {
    test('a temperature between two rows is interpolated', () => {
      expect(growthFromZero(50, 'steel')).toBeCloseTo((0.299 + 0.449) / 2, 9);
      expect(growthFromZero(450, 'steel')).toBeCloseTo((3.245 + 4.148) / 2, 9);
    });

    test('the growth scales with the length of the run', () => {
      const per100 = expansionPerHundredFeet(60, 400, 'steel');
      expect(expansion(200, 60, 400, 'steel')).toBeCloseTo(2 * per100, 9);
      expect(expansion(50, 60, 400, 'steel')).toBeCloseTo(per100 / 2, 9);
    });

    test('cooling gives a negative figure, which is the pipe pulling in', () => {
      expect(expansion(100, 400, 60, 'steel')).toBeCloseTo(-2.796, 3);
    });

    test('copper on the same run moves half as much again as steel', () => {
      const steel = expansion(100, 60, 400, 'steel');
      const copper = expansion(100, 60, 400, 'copper');
      expect(copper / steel).toBeGreaterThan(1.4);
      expect(copper / steel).toBeLessThan(1.5);
    });

    test('outside the table nothing is worked out', () => {
      expect(Number.isNaN(growthFromZero(-20, 'steel'))).toBe(true);
      expect(Number.isNaN(growthFromZero(1300, 'steel'))).toBe(true);
      expect(Number.isNaN(expansion(0, 60, 400))).toBe(true);
      expect(Number.isNaN(expansion(100, 60, 1300))).toBe(true);
    });
  });
});
