import {
  COPPER_DENSITY,
  COPPER_OD_OVER_NOMINAL,
  LARGEST_HAND_BENT_COPPER,
  TYPE_L_TWO_AND_A_HALF,
  CopperType,
  copperBends,
  copperOd,
  copperSizes,
  copperTempers,
  copperTube,
} from '../calc/copperTube';

// Printed on pages 5-13 to 5-16: size, bore, outside, circumference, weight.
const PRINTED: Record<string, [number, number, number, number][]> = {
  K: [
    [0.125, 0.186, 0.785, 0.085], [0.25, 0.311, 1.178, 0.134], [0.375, 0.402, 1.57, 0.269],
    [0.5, 0.527, 1.963, 0.344], [0.625, 0.652, 2.355, 0.418], [0.75, 0.745, 2.748, 0.641],
    [1, 0.995, 3.533, 0.839], [1.25, 1.245, 4.318, 1.04], [1.5, 1.481, 5.103, 1.36],
    [2, 1.959, 6.673, 2.06], [2.5, 2.435, 8.243, 2.93], [3, 2.907, 9.813, 4.0],
    [4, 3.857, 12.953, 6.51], [5, 4.805, 16.093, 9.67], [6, 5.741, 19.233, 13.9],
    [8, 7.583, 25.513, 25.9], [10, 9.449, 31.793, 40.3], [12, 11.315, 38.073, 57.8],
  ],
  L: [
    [0.125, 0.2, 0.785, 0.068], [0.25, 0.315, 1.178, 0.126], [0.375, 0.43, 1.57, 0.198],
    [0.5, 0.545, 1.963, 0.285], [0.625, 0.666, 2.355, 0.362], [0.75, 0.785, 2.748, 0.455],
    [1, 1.025, 3.533, 0.655], [1.25, 1.265, 4.318, 0.884], [1.5, 1.505, 5.103, 1.14],
    [2, 1.985, 6.673, 1.75], [2.5, 2.465, 8.243, 2.48], [3, 2.945, 9.813, 3.33],
    [4, 3.905, 12.953, 5.38], [5, 4.875, 16.093, 7.61], [6, 5.845, 19.233, 10.2],
    [8, 7.725, 25.513, 19.3], [10, 9.625, 31.793, 30.1], [12, 11.565, 38.073, 40.4],
  ],
  M: [
    [0.125, 0.2, 0.785, 0.068], [0.25, 0.325, 1.178, 0.107], [0.375, 0.45, 1.57, 0.145],
    [0.5, 0.569, 1.963, 0.204], [0.625, 0.69, 2.355, 0.263], [0.75, 0.811, 2.748, 0.328],
    [1, 1.055, 3.533, 0.465], [1.25, 1.291, 4.318, 0.682], [1.5, 1.527, 5.103, 0.94],
    [2, 2.009, 6.673, 1.46],
  ],
  DWV: [
    [1.25, 1.295, NaN, 0.65], [1.5, 1.541, NaN, 0.809], [2, 2.041, NaN, 1.07],
    [3, 3.035, NaN, 1.69], [4, 4.009, NaN, 2.87], [5, 4.981, NaN, 4.43],
    [6, 5.959, NaN, 6.1],
  ],
};

describe('copper tube', () => {
  test('sizes as printed', () => {
    expect(copperSizes('K').length).toBe(18);
    expect(copperSizes('L').length).toBe(18);
    expect(copperSizes('M').length).toBe(10);
    expect(copperSizes('DWV').length).toBe(7);
    expect(copperSizes('DWV')[0]).toBe(1.25);
  });

  // The one rule that carries all four pages.
  test('the outside diameter is the nominal size plus an eighth, on every type', () => {
    expect(COPPER_OD_OVER_NOMINAL).toBe(0.125);
    for (const type of ['K', 'L', 'M', 'DWV'] as const) {
      for (const nps of copperSizes(type)) {
        expect(copperTube(nps, type)!.od).toBeCloseTo(nps + 0.125, 12);
      }
    }
    expect(copperOd(2)).toBe(2.125);
    expect(Number.isNaN(copperOd(0))).toBe(true);
  });

  test('every printed bore reads back', () => {
    for (const [type, rows] of Object.entries(PRINTED)) {
      for (const [nps, id] of rows) {
        expect(copperTube(nps, type as CopperType)!.id).toBeCloseTo(id, 12);
      }
    }
  });

  // The printed circumferences are the outside diameter times 3.14, not times
  // pi: 0.785 on a quarter inch, 38.073 on a twelve. This project uses the
  // real thing, which runs a shade over the print in the big sizes — six
  // thousandths on a four inch tube.
  test('the printed circumference is the outside times 3.14, and ours is times pi', () => {
    for (const [type, rows] of Object.entries(PRINTED)) {
      for (const [nps, , circ] of rows) {
        if (!Number.isFinite(circ)) continue;
        expect(circ).toBeCloseTo(3.14 * (nps + 0.125), 2);
        expect(copperTube(nps, type as CopperType)!.circumference).toBeCloseTo(
          Math.PI * (nps + 0.125),
          12
        );
      }
    }
    expect(copperTube(4, 'K')!.circumference).toBeGreaterThan(12.953);
    expect(copperTube(4, 'K')!.circumference - 12.953).toBeLessThan(0.01);
  });

  // The weight is worked from the wall and copper's density, and lands on the
  // printed figure in every size on all four pages.
  test('every printed weight comes out of the wall and the density', () => {
    expect(COPPER_DENSITY).toBe(0.323);
    for (const [type, rows] of Object.entries(PRINTED)) {
      for (const [nps, , , weight] of rows) {
        const worked = copperTube(nps, type as CopperType)!.weightPerFoot;
        expect(Math.abs(worked - weight)).toBeLessThan(Math.max(0.005, weight * 0.006));
      }
    }
  });

  // The 2-1/2 inch type L bore as printed is smaller than the 2 inch above it,
  // which would put a wall of nearly six tenths on it. The printed weight works
  // back to eighty thousandths, which is a bore of 2.465.
  test('the type L two and a half inch bore is corrected, and the weight proves it', () => {
    expect(TYPE_L_TWO_AND_A_HALF.printed).toBe(1.465);
    expect(copperTube(2.5, 'L')!.id).toBe(TYPE_L_TWO_AND_A_HALF.held);
    expect(copperTube(2.5, 'L')!.wall).toBeCloseTo(0.08, 3);
    expect(copperTube(2.5, 'L')!.weightPerFoot).toBeCloseTo(2.48, 2);
    expect(copperTube(2.5, 'L')!.id).toBeGreaterThan(copperTube(2, 'L')!.id);
    expect(copperTube(2.5, 'L')!.id).toBeLessThan(copperTube(3, 'L')!.id);
  });

  // K is the heavy wall, L the medium, M the light, in every size all three
  // are made in.
  test('K is thicker than L, and L than M', () => {
    for (const nps of copperSizes('M')) {
      const k = copperTube(nps, 'K')!;
      const l = copperTube(nps, 'L')!;
      const m = copperTube(nps, 'M')!;
      if (nps !== 0.125) {
        expect(k.wall).toBeGreaterThan(l.wall);
        expect(l.wall).toBeGreaterThan(m.wall);
        expect(k.weightPerFoot).toBeGreaterThan(l.weightPerFoot);
      }
      expect(k.id).toBeLessThanOrEqual(l.id);
      expect(l.id).toBeLessThanOrEqual(m.id);
    }
    // The eighth inch is the one size where L and M are the same tube.
    expect(copperTube(0.125, 'L')!.id).toBe(copperTube(0.125, 'M')!.id);
  });

  test('drainage tube is the thinnest wall of all', () => {
    for (const nps of copperSizes('DWV')) {
      const dwv = copperTube(nps, 'DWV')!;
      const l = copperTube(nps, 'L');
      if (l) expect(dwv.wall).toBeLessThan(l.wall);
    }
  });

  test('the bore, its area and what it holds all grow with the size', () => {
    for (const type of ['K', 'L', 'M', 'DWV'] as const) {
      const sizes = copperSizes(type);
      for (let i = 1; i < sizes.length; i++) {
        const a = copperTube(sizes[i - 1]!, type)!;
        const b = copperTube(sizes[i]!, type)!;
        expect(b.id).toBeGreaterThan(a.id);
        expect(b.boreArea).toBeGreaterThan(a.boreArea);
        expect(b.gallonsPerFoot).toBeGreaterThan(a.gallonsPerFoot);
      }
    }
  });

  test('the wall is always positive and the bore always inside the outside', () => {
    for (const type of ['K', 'L', 'M', 'DWV'] as const) {
      for (const nps of copperSizes(type)) {
        const t = copperTube(nps, type)!;
        expect(t.wall).toBeGreaterThan(0);
        expect(t.id).toBeLessThan(t.od);
      }
    }
  });

  // Printed with the tables, and it decides whether a bender can be used.
  describe('temper and bending', () => {
    test('K and L come in both tempers, M and DWV in hard only', () => {
      expect(copperTempers('K')).toEqual(['hard', 'soft']);
      expect(copperTempers('L')).toEqual(['hard', 'soft']);
      expect(copperTempers('M')).toEqual(['hard']);
      expect(copperTempers('DWV')).toEqual(['hard']);
    });

    test('M and hard temper L are not to be bent', () => {
      expect(copperBends('K', 'hard')).toBe(true);
      expect(copperBends('K', 'soft')).toBe(true);
      expect(copperBends('L', 'soft')).toBe(true);
      expect(copperBends('L', 'hard')).toBe(false);
      expect(copperBends('M')).toBe(false);
      expect(copperBends('DWV')).toBe(false);
    });

    test('a portable bender goes to one inch', () => {
      expect(LARGEST_HAND_BENT_COPPER).toBe(1);
    });
  });

  test('a size or type not made gives nothing', () => {
    expect(copperTube(3, 'M')).toBeUndefined();
    expect(copperTube(1, 'DWV')).toBeUndefined();
    expect(copperTube(14, 'K')).toBeUndefined();
  });
});
