import {
  GALLONS_PER_CUBIC_FOOT,
  horizontalTankDepth,
  horizontalTankGallons,
  tankGallons,
  tankGallonsPerFoot,
  verticalTankGallons,
} from '../calc/tank';

describe('contents of cylindrical tanks', () => {
  // The whole of page 5-26: lengths 5 to 20 feet against diameters 5 to 9.
  const DIAMETERS = [5, 6, 7, 8, 9];
  const PRINTED: [number, number[]][] = [
    [5, [734, 1058, 1439, 1880, 2379]],
    [6, [881, 1269, 1727, 2256, 2855]],
    [7, [1028, 1481, 2015, 2632, 3331]],
    [8, [1175, 1692, 2303, 3008, 3807]],
    [9, [1322, 1904, 2591, 3384, 4283]],
    [10, [1469, 2115, 2879, 3760, 4759]],
    [11, [1616, 2327, 3167, 4136, 5235]],
    [12, [1763, 2538, 3455, 4512, 5711]],
    [13, [1909, 2750, 3742, 4888, 6187]],
    [14, [2056, 2961, 4030, 5264, 6662]],
    [15, [2203, 3173, 4318, 5640, 7138]],
    [16, [2350, 3384, 4606, 6016, 7614]],
    [17, [2497, 3596, 4894, 6392, 8090]],
    [18, [2644, 3807, 5182, 6768, 8566]],
    // The 7 foot column at 19 feet prints 5480. Every other step in that
    // column is 288 gallons a foot; that one makes 18 to 19 step 298 and 19 to
    // 20 step 278. The geometry gives 5470, which puts both back on 288.
    [19, [2791, 4019, 5470, 7144, 9042]],
    [20, [2938, 4230, 5758, 7520, 9518]],
  ];

  // Eighty printed figures, all out of one formula.
  test('every figure on the page comes out of the geometry', () => {
    let checked = 0;
    for (const [length, row] of PRINTED) {
      row.forEach((gallons, i) => {
        const worked = tankGallons(DIAMETERS[i]!, length);
        expect(Math.abs(worked - gallons)).toBeLessThan(Math.max(1, gallons * 0.0005));
        checked++;
      });
    }
    expect(checked).toBe(80);
  });

  test('the one printed figure the geometry does not give', () => {
    const PRINTED_19_BY_7 = 5480;
    expect(tankGallons(7, 19)).toBeCloseTo(5470, 0);
    expect(PRINTED_19_BY_7 - tankGallons(7, 19)).toBeGreaterThan(9);
    // Its neighbours in that column step a steady 288 gallons a foot.
    expect(tankGallons(7, 19) - tankGallons(7, 18)).toBeCloseTo(288, 0);
    expect(tankGallons(7, 20) - tankGallons(7, 19)).toBeCloseTo(288, 0);
    // The printed figure would make those two steps 298 and 278.
    expect(PRINTED_19_BY_7 - 5182).toBe(298);
    expect(5758 - PRINTED_19_BY_7).toBe(278);
  });

  test('a gallon is 7.48 of a cubic foot', () => {
    expect(GALLONS_PER_CUBIC_FOOT).toBeCloseTo(7.4805, 4);
    expect(tankGallons(2, 1) / GALLONS_PER_CUBIC_FOOT).toBeCloseTo(Math.PI, 6);
  });

  // The point of holding the rule: it answers past the edges of the grid.
  test('it answers diameters and lengths the page never prints', () => {
    expect(tankGallons(12, 30)).toBeCloseTo((Math.PI / 4) * 144 * 30 * GALLONS_PER_CUBIC_FOOT, 6);
    expect(tankGallons(3.5, 7.25)).toBeGreaterThan(0);
  });

  test('contents go as the square of the diameter and straight with the length', () => {
    expect(tankGallons(10, 5) / tankGallons(5, 5)).toBeCloseTo(4, 9);
    expect(tankGallons(5, 10) / tankGallons(5, 5)).toBeCloseTo(2, 9);
  });

  test('a foot of tank is the whole thing over its length', () => {
    expect(tankGallonsPerFoot(8) * 20).toBeCloseTo(tankGallons(8, 20), 6);
  });

  test('a tank that is not a tank gives nothing', () => {
    for (const [d, l] of [[0, 5], [5, 0], [-3, 5], [NaN, 5]]) {
      expect(Number.isNaN(tankGallons(d!, l!))).toBe(true);
    }
  });
});

describe('a tank that is only part full', () => {
  test('empty is nothing and brim full is the whole tank', () => {
    expect(horizontalTankGallons(8, 20, 0)).toBe(0);
    expect(horizontalTankGallons(8, 20, 8)).toBeCloseTo(tankGallons(8, 20), 9);
  });

  // Lying on its side, half full is exactly half, because the circle is
  // symmetric about its own centre.
  test('half way up a horizontal tank is half its contents', () => {
    for (const d of [5, 6, 8, 12]) {
      expect(horizontalTankGallons(d, 20, d / 2)).toBeCloseTo(tankGallons(d, 20) / 2, 6);
    }
  });

  // The bottom foot of a round tank holds far less than the middle foot does,
  // which is the whole reason a dipstick on a horizontal tank is not linear.
  test('the bottom of a horizontal tank holds less than the middle', () => {
    const bottom = horizontalTankGallons(8, 20, 1);
    const middle = horizontalTankGallons(8, 20, 5) - horizontalTankGallons(8, 20, 4);
    expect(bottom).toBeLessThan(middle);
    // And a quarter of the way up holds well under a quarter of the tank.
    expect(horizontalTankGallons(8, 20, 2)).toBeLessThan(tankGallons(8, 20) * 0.25);
  });

  test('it only ever fills as the depth grows', () => {
    let last = -1;
    for (let depth = 0; depth <= 8; depth += 0.25) {
      const v = horizontalTankGallons(8, 20, depth);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  test('standing on end it fills straight with the depth', () => {
    expect(verticalTankGallons(8, 5, 20)).toBeCloseTo(tankGallons(8, 20) * 0.25, 6);
    expect(verticalTankGallons(8, 20, 20)).toBeCloseTo(tankGallons(8, 20), 9);
    expect(verticalTankGallons(8, 0, 20)).toBe(0);
  });

  describe('reading it back the other way', () => {
    test('the depth for a wanted amount comes back to that amount', () => {
      for (const want of [100, 1000, 3760, 7000]) {
        const depth = horizontalTankDepth(8, 20, want);
        expect(horizontalTankGallons(8, 20, depth)).toBeCloseTo(want, 4);
      }
    });

    test('half the contents is half way up', () => {
      expect(horizontalTankDepth(8, 20, tankGallons(8, 20) / 2)).toBeCloseTo(4, 6);
    });

    test('empty and full come back to nothing and the diameter', () => {
      expect(horizontalTankDepth(8, 20, 0)).toBeCloseTo(0, 6);
      expect(horizontalTankDepth(8, 20, tankGallons(8, 20))).toBeCloseTo(8, 6);
    });

    test('more than the tank holds is refused rather than guessed', () => {
      expect(Number.isNaN(horizontalTankDepth(8, 20, 999999))).toBe(true);
      expect(Number.isNaN(horizontalTankDepth(8, 20, -5))).toBe(true);
      expect(Number.isNaN(horizontalTankGallons(8, 20, 9))).toBe(true);
      expect(Number.isNaN(verticalTankGallons(8, 25, 20))).toBe(true);
    });
  });
});
