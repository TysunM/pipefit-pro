import {
  GATE_CAST_IRON,
  GATE_STEEL,
  castIronGate,
  castIronGateMade,
  gateCastIronSizes,
  gateSteelSizes,
  steelGate,
} from '../calc/valve';
import { findRow } from '../calc/pipeData';

describe('cast iron flanged gate valves', () => {
  test('fifteen printed sizes, two inch and up', () => {
    expect(GATE_CAST_IRON.length).toBe(15);
    expect(gateCastIronSizes()[0]).toBe(2);
    expect(gateCastIronSizes()[14]).toBe(24);
  });

  test('rows read back as printed', () => {
    expect(castIronGate(4, '125')).toBe(9);
    expect(castIronGate(6, '250')).toBe(15.875);
    expect(castIronGate(12, '175')).toBe(17.5);
  });

  test('the heavier class is always the longer valve', () => {
    for (const r of GATE_CAST_IRON) {
      const a = r.faceToFace['125']!;
      const b = r.faceToFace['175'];
      const c = r.faceToFace['250']!;
      if (b !== undefined) expect(b).toBeGreaterThan(a);
      expect(c).toBeGreaterThan(a);
      if (b !== undefined) expect(c).toBeGreaterThan(b);
    }
  });

  test('175 lb stops at twelve inch', () => {
    for (const nps of [14, 16, 18, 20, 24]) {
      expect(Number.isNaN(castIronGate(nps, '175'))).toBe(true);
      expect(Number.isFinite(castIronGate(nps, '125'))).toBe(true);
    }
  });

  // The wedge and double disc tables print the same figures. What differs is
  // which sizes each pattern is made in.
  test('a double disc is made in fewer sizes than a wedge', () => {
    expect(castIronGateMade(3.5, '125', 'doubleDisc')).toBe(true);
    expect(castIronGateMade(3.5, '250', 'doubleDisc')).toBe(false);
    expect(castIronGateMade(3.5, '250', 'wedge')).toBe(true);
    expect(castIronGateMade(5, '175', 'doubleDisc')).toBe(false);
    expect(castIronGateMade(24, '125', 'doubleDisc')).toBe(false);
    expect(castIronGateMade(24, '250', 'doubleDisc')).toBe(true);
    expect(castIronGateMade(1, '125')).toBe(false);
  });

  test('every column grows with the size', () => {
    for (const cls of ['125', '175', '250'] as const) {
      let last = 0;
      for (const r of GATE_CAST_IRON) {
        const v = r.faceToFace[cls];
        if (v === undefined) continue;
        expect(v).toBeGreaterThan(last);
        last = v;
      }
    }
  });

  // A light valve in a big size really is shorter than it is wide: the 18
  // inch 125 lb valve is 17 face to face. What cannot happen is a figure a
  // whole digit out, so the band is checked rather than a floor at the bore.
  test('every size is a real pipe size and every figure is in proportion to it', () => {
    for (const r of GATE_CAST_IRON) {
      const row = findRow(r.nps);
      expect(row).toBeDefined();
      for (const cls of ['125', '175', '250'] as const) {
        const v = r.faceToFace[cls];
        if (v === undefined) continue;
        expect(v).toBeGreaterThan(0.8 * row!.od);
        expect(v).toBeLessThan(4 * row!.od);
      }
    }
    expect(castIronGate(18, '125')).toBeLessThan(findRow(18)!.od);
  });
});

describe('steel flanged gate valves', () => {
  test('eighteen printed sizes', () => {
    expect(GATE_STEEL.length).toBe(18);
    expect(gateSteelSizes()[0]).toBe(1);
  });

  test('rows read back as printed', () => {
    expect(steelGate(4, '150')).toBe(9);
    expect(steelGate(12, '600')).toBe(33);
    expect(steelGate(24, '1500')).toBe(76.5);
    expect(steelGate(1, '2500')).toBe(12.125);
  });

  // The same valve body carries both ratings up to twelve inch.
  test('150 lb steel is the 125 lb cast iron valve, and 300 lb is the 250', () => {
    for (const r of GATE_CAST_IRON) {
      if (r.nps > 12) continue;
      if (r.nps === 3.5) continue;
      expect(steelGate(r.nps, '150')).toBe(r.faceToFace['125']);
      expect(steelGate(r.nps, '300')).toBe(r.faceToFace['250']);
    }
    // Above twelve inch the steel valve is much the longer of the two.
    expect(steelGate(24, '300')).toBeGreaterThan(castIronGate(24, '250'));
  });

  // Below three inch this class is made to the 1500 lb dimensions, the same
  // way the fittings are, so the three inch valve is shorter than the 2-1/2.
  test('900 and 1500 lb are the same valve below three inch', () => {
    for (const nps of [1, 1.25, 1.5, 2, 2.5]) {
      expect(steelGate(nps, '900')).toBe(steelGate(nps, '1500'));
    }
    expect(steelGate(3, '900')).toBeLessThan(steelGate(2.5, '900'));
    expect(steelGate(3, '900')).toBeLessThan(steelGate(3, '1500'));
  });

  test('three and a half inch is made in the two light classes only', () => {
    expect(steelGate(3.5, '150')).toBe(8.5);
    expect(steelGate(3.5, '300')).toBe(11.875);
    for (const cls of ['400', '600', '900', '1500', '2500'] as const) {
      expect(Number.isNaN(steelGate(3.5, cls))).toBe(true);
    }
  });

  test('2500 lb stops at twelve inch', () => {
    for (const nps of [14, 16, 18, 20, 24]) expect(Number.isNaN(steelGate(nps, '2500'))).toBe(true);
    expect(steelGate(12, '2500')).toBe(56);
  });

  describe('the ring joint pages', () => {
    // Read off pages 4-103 and 4-104 and checked against the raised face
    // tables plus twice the class allowance.
    const PRINTED: [number, Record<string, number>][] = [
      [2, { '150': 7.5, '300': 9.125, '400': 11.625, '600': 11.625, '900': 14.625, '1500': 14.625, '2500': 17.875 }],
      [2.5, { '150': 8, '300': 10.125, '400': 13.125, '600': 13.125, '900': 16.625, '1500': 16.625, '2500': 20.25 }],
      [3, { '150': 8.5, '300': 11.75, '400': 14.125, '600': 14.125, '900': 15.125, '1500': 18.625, '2500': 23 }],
      [4, { '150': 9.5, '300': 12.625, '400': 16.125, '600': 17.125, '900': 18.125, '1500': 21.625, '2500': 26.875 }],
      [5, { '150': 10.5, '300': 15.625, '400': 18.125, '600': 20.125, '900': 22.125, '1500': 26.625, '2500': 31.75 }],
      [6, { '150': 11, '300': 16.5, '400': 19.625, '600': 22.125, '900': 24.125, '1500': 28, '2500': 36.5 }],
      [8, { '150': 12, '300': 17.125, '400': 23.625, '600': 26.125, '900': 29.125, '1500': 33.125, '2500': 40.875 }],
      [10, { '150': 13.5, '300': 18.625, '400': 26.625, '600': 31.125, '900': 33.125, '1500': 39.375, '2500': 50.875 }],
      [12, { '150': 14.5, '300': 20.375, '400': 30.125, '600': 33.125, '900': 38.125, '1500': 45.125, '2500': 56.875 }],
      [14, { '150': 15.5, '300': 30.625, '400': 32.625, '600': 35.125, '900': 40.875, '1500': 50.25 }],
      [16, { '150': 16.5, '300': 33.625, '400': 35.625, '600': 39.125, '900': 44.875, '1500': 55.375 }],
      [18, { '150': 17.5, '300': 36.625, '400': 38.625, '600': 43.125, '900': 48.5, '1500': 61.375 }],
      [20, { '150': 18.5, '300': 39.75, '400': 41.75, '600': 47.25, '900': 52.5, '1500': 66.375 }],
      [24, { '150': 20.5, '300': 45.875, '400': 48.875, '600': 55.375, '900': 61.75, '1500': 77.625 }],
    ];

    test('every printed figure from two inch up comes out of the rule', () => {
      let checked = 0;
      for (const [nps, byClass] of PRINTED) {
        for (const [cls, want] of Object.entries(byClass)) {
          expect(steelGate(nps, cls as never, 'ringJoint')).toBeCloseTo(want, 12);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(90);
    });

    // Below two inch the valve tables round their own way, so those rows are
    // held rather than worked out.
    test('the small sizes are held as printed', () => {
      expect(steelGate(1, '150', 'ringJoint')).toBe(5.5);
      expect(Number.isNaN(steelGate(1, '150'))).toBe(true);
      expect(steelGate(1.5, '300', 'ringJoint')).toBe(8);
      expect(steelGate(1, '600', 'ringJoint')).toBe(steelGate(1, '600'));
      expect(steelGate(1, '2500', 'ringJoint')).toBe(steelGate(1, '2500'));
      expect(steelGate(1.25, '2500', 'ringJoint')).toBe(13.875);
    });

    test('a ring joint valve is never shorter than the raised face one', () => {
      for (const r of GATE_STEEL) {
        for (const cls of ['150', '300', '400', '600', '900', '1500', '2500'] as const) {
          const rf = steelGate(r.nps, cls);
          const rj = steelGate(r.nps, cls, 'ringJoint');
          if (!Number.isFinite(rf) || !Number.isFinite(rj)) continue;
          expect(rj).toBeGreaterThanOrEqual(rf);
        }
      }
    });

    test('a size or class not made gives nothing', () => {
      expect(Number.isNaN(steelGate(3.5, '400', 'ringJoint'))).toBe(true);
      expect(Number.isNaN(steelGate(30, '150', 'ringJoint'))).toBe(true);
      expect(Number.isNaN(steelGate(1, '300', 'ringJoint'))).toBe(true);
    });
  });
});

import {
  CHECK_STEEL_LIGHT,
  CHECK_VALVE_CAVEAT,
  GLOBE_CAST_IRON,
  GLOBE_STEEL_LIGHT,
  castIronAngle,
  castIronGlobe,
  steelAngle,
  steelCheck,
  steelGlobe,
} from '../calc/valve';

describe('globe and angle valves', () => {
  test('cast iron rows read back as printed', () => {
    expect(GLOBE_CAST_IRON.length).toBe(8);
    expect(castIronGlobe(4, '125')).toBe(11.5);
    expect(castIronGlobe(8, '250')).toBe(21);
  });

  // The book draws the globe as 2 x A and the angle as A: one casting opened
  // out, so the angle valve reaches half as far along the run.
  test('an angle valve is half the globe valve', () => {
    for (const r of GLOBE_CAST_IRON) {
      expect(castIronAngle(r.nps, '125')).toBe(r.faceToFace['125']! / 2);
    }
    expect(steelAngle(4, '150')).toBe(steelGlobe(4, '150') / 2);
  });

  test('steel light class rows read back as printed', () => {
    expect(GLOBE_STEEL_LIGHT.length).toBe(12);
    expect(steelGlobe(2, '150')).toBe(8);
    expect(steelGlobe(6, '600')).toBe(22);
    expect(steelGlobe(0.75, '400')).toBe(7.5);
  });

  // Nothing below two inch is made in the two lightest classes, and the
  // light class table stops at eight inch.
  test('what the light class table does not carry', () => {
    for (const nps of [0.75, 1, 1.25, 1.5]) {
      expect(Number.isNaN(steelGlobe(nps, '150'))).toBe(true);
      expect(Number.isNaN(steelGlobe(nps, '300'))).toBe(true);
    }
    expect(Number.isNaN(steelGlobe(10, '150'))).toBe(true);
    expect(Number.isNaN(steelGlobe(3.5, '400'))).toBe(true);
  });

  // In the heavy classes one table serves the gate, the globe and the check.
  test('the heavy class globe valve is the gate valve figure', () => {
    for (const cls of ['900', '1500', '2500'] as const) {
      for (const nps of [1, 2, 3, 6, 12, 14]) {
        const gate = steelGate(nps, cls);
        if (!Number.isFinite(gate)) continue;
        expect(steelGlobe(nps, cls)).toBe(gate);
        expect(steelCheck(nps, cls)).toBe(gate);
      }
    }
  });

  test('the heavy globe and check tables add the small sizes and stop at fourteen', () => {
    expect(steelGlobe(0.75, '900')).toBe(9);
    expect(steelGlobe(0.5, '2500')).toBe(10.375);
    expect(Number.isNaN(steelGate(0.75, '900'))).toBe(true);
    expect(Number.isNaN(steelGlobe(16, '900'))).toBe(true);
    expect(Number.isFinite(steelGate(16, '900'))).toBe(true);
  });

  test('the heavier class is always the longer valve', () => {
    for (const r of GLOBE_CAST_IRON) {
      expect(r.faceToFace['250']!).toBeGreaterThan(r.faceToFace['125']!);
    }
    for (const r of GLOBE_STEEL_LIGHT) {
      const a = r.faceToFace['150'];
      const b = r.faceToFace['300'];
      if (a !== undefined && b !== undefined) expect(b).toBeGreaterThanOrEqual(a);
    }
  });

  test('every column grows with the size', () => {
    for (const cls of ['150', '300', '400', '600'] as const) {
      let last = 0;
      for (const r of GLOBE_STEEL_LIGHT) {
        const v = r.faceToFace[cls];
        if (v === undefined) continue;
        expect(v).toBeGreaterThan(last);
        last = v;
      }
    }
  });
});

describe('swing check valves', () => {
  test('ten printed sizes in the light classes', () => {
    expect(CHECK_STEEL_LIGHT.length).toBe(10);
    expect(steelCheck(2, '150')).toBe(8);
    expect(steelCheck(12, '600')).toBe(33);
  });

  // A 150 lb check is made to six inch only; above that the page dashes it.
  test('150 lb stops at six inch', () => {
    expect(steelCheck(6, '150')).toBe(14);
    for (const nps of [8, 10, 12]) expect(Number.isNaN(steelCheck(nps, '150'))).toBe(true);
    expect(Number.isFinite(steelCheck(8, '300'))).toBe(true);
  });

  // Where both are made in the light classes, a check valve is the same body
  // as the globe valve on all but three rows, and on those it is the shorter.
  test('a light class check matches the globe valve but for three rows', () => {
    const off: string[] = [];
    for (const r of CHECK_STEEL_LIGHT) {
      for (const cls of ['150', '300', '400', '600'] as const) {
        const c = steelCheck(r.nps, cls);
        const g = steelGlobe(r.nps, cls);
        if (!Number.isFinite(c) || !Number.isFinite(g)) continue;
        if (c !== g) off.push(`${r.nps}-${cls}`);
      }
    }
    expect(off).toEqual(['5-150', '6-150', '8-300']);
    expect(steelCheck(5, '150')).toBeLessThan(steelGlobe(5, '150'));
    expect(steelCheck(6, '150')).toBeLessThan(steelGlobe(6, '150'));
    expect(steelCheck(8, '300')).toBeLessThan(steelGlobe(8, '300'));
  });

  test('the warning that came with the table is kept with it', () => {
    expect(CHECK_VALVE_CAVEAT).toContain('45 degrees');
    expect(CHECK_VALVE_CAVEAT).toContain('large clearances');
  });

  test('a size or class not made gives nothing', () => {
    expect(Number.isNaN(steelCheck(1, '150'))).toBe(true);
    expect(Number.isNaN(steelCheck(24, '600'))).toBe(true);
    expect(Number.isNaN(steelGlobe(24, '2500'))).toBe(true);
  });
});
