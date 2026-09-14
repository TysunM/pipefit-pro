import {
  SHORT_RADIUS_SMALLEST,
  WELD_TEES,
  elbow45,
  elbowBendRadius,
  longRadiusElbow,
  shortRadiusElbow,
  weldCut,
  weldTee,
  weldTeeSizes,
} from '../calc/weldFitting';
import { findRow } from '../calc/pipeData';

// Read off page 2-42: nominal size, long radius A, short radius A, 45 B.
const PRINTED: [number, number, number, number][] = [
  [0.75, 1.125, NaN, 7 / 16],
  [1, 1.5, 1, 7 / 8],
  [1.25, 1.875, 1.25, 1],
  [1.5, 2.25, 1.5, 1.125],
  [2, 3, 2, 1.375],
  [2.5, 3.75, 2.5, 1.75],
  [3, 4.5, 3, 2],
  [3.5, 5.25, 3.5, 2.25],
  [4, 6, 4, 2.5],
  [5, 7.5, 5, 3.125],
  [6, 9, 6, 3.75],
  [8, 12, 8, 5],
  [10, 15, 10, 6.25],
  [12, 18, 12, 7.5],
  [14, 21, 14, 8.75],
  [16, 24, 16, 10],
  [18, 27, 18, 11.25],
  [20, 30, 20, 12.5],
  [24, 36, 24, 15],
];

describe('butt welding elbows', () => {
  test('nineteen printed sizes', () => expect(PRINTED.length).toBe(19));

  // The two 90 degree columns are the rule, exactly, on every printed row.
  test('a long radius elbow is one and a half times the size', () => {
    for (const [nps, lr] of PRINTED) expect(longRadiusElbow(nps)).toBeCloseTo(lr, 12);
  });

  test('a short radius elbow is the size itself', () => {
    for (const [nps, , sr] of PRINTED) {
      if (!Number.isFinite(sr)) continue;
      expect(shortRadiusElbow(nps)).toBeCloseTo(sr, 12);
    }
  });

  test('a short radius elbow is not made below one inch', () => {
    expect(Number.isNaN(PRINTED[0]![2])).toBe(true);
    expect(PRINTED[0]![0]).toBeLessThan(SHORT_RADIUS_SMALLEST);
  });

  test('the bend radius is what sets the centre to end', () => {
    expect(elbowBendRadius(6)).toBe(9);
    expect(elbowBendRadius(6, 'short')).toBe(6);
    expect(elbowBendRadius(6)).toBe(1.5 * elbowBendRadius(6, 'short'));
  });

  describe('the forty five', () => {
    test('every printed figure reads back', () => {
      for (const [nps, , , b] of PRINTED) expect(elbow45(nps)).toBeCloseTo(b, 12);
    });

    test('from four inch up it is five eighths of the size', () => {
      for (const [nps, , , b] of PRINTED) {
        if (nps < 4) continue;
        expect(b).toBeCloseTo(0.625 * nps, 12);
      }
    });

    // Below four inch the fitting is made to its own stock figures. From one
    // inch to three and a half they run larger than the rule; the three
    // quarter inch is the one that runs smaller.
    test('below four inch the printed figure departs from the rule', () => {
      for (const [nps, , , b] of PRINTED) {
        if (nps >= 4 || nps === 0.75) continue;
        expect(b).toBeGreaterThan(0.625 * nps);
      }
      expect(elbow45(0.75)).toBeLessThan(0.625 * 0.75);
      expect(elbow45(0.75)).toBe(7 / 16);
    });

    test('a 45 always takes out less than a 90 of the same size', () => {
      for (const [nps, lr, , b] of PRINTED) expect(b).toBeLessThan(lr);
    });

    test('a size below four inch the page does not print gives nothing', () => {
      expect(Number.isNaN(elbow45(0.5))).toBe(true);
      expect(Number.isNaN(elbow45(0.25))).toBe(true);
    });
  });

  // The rules carry past where the page stops, which is the point of holding
  // them rather than the table.
  test('the rules answer the sizes the page never prints', () => {
    expect(longRadiusElbow(30)).toBe(45);
    expect(shortRadiusElbow(36)).toBe(36);
    expect(elbow45(30)).toBe(18.75);
  });

  test('nothing is invented for a size that is not a size', () => {
    for (const v of [0, -4, NaN]) {
      expect(Number.isNaN(longRadiusElbow(v))).toBe(true);
      expect(Number.isNaN(shortRadiusElbow(v))).toBe(true);
      expect(Number.isNaN(elbow45(v))).toBe(true);
    }
  });
});

describe('butt welding straight tees', () => {
  test('nineteen printed sizes, matching the elbow page', () => {
    expect(WELD_TEES.length).toBe(19);
    expect(weldTeeSizes()).toEqual(PRINTED.map(([n]) => n));
  });

  test('rows read back as printed', () => {
    expect(weldTee(2)).toBe(2.5);
    expect(weldTee(8)).toBe(7);
    expect(weldTee(24)).toBe(17);
  });

  test('it grows with the size', () => {
    for (let i = 1; i < WELD_TEES.length; i++) {
      expect(WELD_TEES[i]!.c).toBeGreaterThan(WELD_TEES[i - 1]!.c);
    }
  });

  // The tee is the same casting as a long radius elbow in the small sizes and
  // then stops growing as fast, because a tee has no bend to carry.
  test('it matches the long radius elbow to an inch and a half, then falls behind', () => {
    for (const nps of [0.75, 1, 1.25, 1.5]) expect(weldTee(nps)).toBe(longRadiusElbow(nps));
    for (const t of WELD_TEES) {
      if (t.nps <= 1.5) continue;
      expect(t.c).toBeLessThan(longRadiusElbow(t.nps));
    }
  });

  // A tee reaches further than a short radius elbow only to four inch. Above
  // that the short radius elbow, being the nominal size itself, overtakes it.
  test('a tee reaches past a short radius elbow only to four inch', () => {
    for (const t of WELD_TEES) {
      if (t.nps > 4) continue;
      expect(t.c).toBeGreaterThan(shortRadiusElbow(t.nps));
    }
    for (const t of WELD_TEES) {
      if (t.nps <= 4) continue;
      expect(t.c).toBeLessThan(shortRadiusElbow(t.nps));
    }
  });

  test('every size is a real pipe size', () => {
    for (const t of WELD_TEES) expect(findRow(t.nps)).toBeDefined();
  });

  test('a size not listed gives nothing', () => {
    expect(Number.isNaN(weldTee(7))).toBe(true);
    expect(Number.isNaN(weldTee(30))).toBe(true);
  });
});

describe('cutting to a welded run', () => {
  test('the fittings come off a centre to centre measurement', () => {
    expect(weldCut(48, longRadiusElbow(6))).toBe(48 - 18);
    expect(weldCut(48, longRadiusElbow(6), weldTee(6))).toBeCloseTo(48 - 9 - 5.625, 12);
  });

  // A welded joint has no makeup, but it does have a root gap if one is left.
  test('a root gap comes off at each end', () => {
    expect(weldCut(48, 9, 9, 0.125)).toBe(48 - 18 - 0.25);
    expect(weldCut(48, 9, 9, 0)).toBeGreaterThan(weldCut(48, 9, 9, 0.125));
  });

  test('a run too short for its own fittings is refused', () => {
    expect(Number.isNaN(weldCut(10, 9, 9))).toBe(true);
    expect(Number.isNaN(weldCut(48, NaN))).toBe(true);
  });
});

import {
  RETURN_DISAGREEMENT,
  WELD_CAPS,
  returnHeight,
  returnSpacing,
  weldCap,
  weldCapSizes,
  weldReducer,
  weldReducerBranches,
  weldReducerLargeSizes,
  weldReducerMade,
} from '../calc/weldFitting';

describe('butt welding reducers', () => {
  // Read off pages 2-48 and 2-50: large size, H.
  const PRINTED: [number, number][] = [
    [1, 2], [1.25, 2], [1.5, 2.5], [2, 3], [2.5, 3.5], [3, 3.5], [3.5, 4], [4, 4],
    [5, 5], [6, 5.5], [8, 6], [10, 7], [12, 8], [14, 13], [16, 14], [18, 15],
    [20, 20], [24, 20],
  ];

  test('eighteen large sizes across the two pages', () => {
    expect(weldReducerLargeSizes()).toEqual(PRINTED.map(([n]) => n));
  });

  // Every combination sharing a large size prints the same H, and the
  // concentric and eccentric patterns share it too.
  test('the length depends only on the larger size', () => {
    for (const [big, h] of PRINTED) {
      for (const small of weldReducerBranches(big)) {
        expect(weldReducer(big, small)).toBe(h);
        expect(weldReducer(small, big)).toBe(h);
      }
    }
  });

  test('rows read back as printed', () => {
    expect(weldReducer(3, 1.25)).toBe(3.5);
    expect(weldReducer(8, 6)).toBe(6);
    expect(weldReducer(24, 20)).toBe(20);
  });

  test('it grows with the size, and jumps at fourteen inch', () => {
    for (let i = 1; i < PRINTED.length; i++) {
      expect(PRINTED[i]![1]).toBeGreaterThanOrEqual(PRINTED[i - 1]![1]);
    }
    expect(PRINTED.find(([n]) => n === 14)![1] - PRINTED.find(([n]) => n === 12)![1]).toBe(5);
  });

  test('a combination the pages do not list is marked as not made', () => {
    expect(weldReducerMade(6, 4)).toBe(true);
    expect(weldReducerMade(6, 2)).toBe(false);
    expect(weldReducerMade(24, 12)).toBe(false);
    expect(weldReducerBranches(7)).toEqual([]);
  });

  test('a reducer needs two different sizes', () => {
    expect(Number.isNaN(weldReducer(4, 4))).toBe(true);
    expect(Number.isNaN(weldReducer(30, 24))).toBe(true);
  });
});

describe('butt welding 180 degree returns', () => {
  // Read off page 2-51: nominal, long K, long O, short K, short O.
  const PRINTED: [number, number, number, number, number][] = [
    [0.75, 1 + 11 / 16, 2.25, NaN, NaN],
    [1, 2 + 3 / 16, 3, 1.625, 2],
    [1.25, 2.75, 3.75, 2 + 1 / 16, 2.5],
    [1.5, 3.25, 4.5, 2 + 7 / 16, 3],
    [2, 4 + 3 / 16, 6, 3 + 3 / 16, 4],
    [2.5, 5 + 3 / 16, 7.5, 3 + 15 / 16, 5],
    [3, 6.25, 9, 4.75, 6],
    [3.5, 7.25, 10.5, 5.5, 7],
    [4, 8.25, 12, 6.25, 8],
    [5, 10 + 5 / 16, 15, 7.75, 10],
    [6, 12 + 5 / 16, 18, 9 + 5 / 16, 12],
    [8, 16 + 5 / 16, 24, 12 + 5 / 16, 16],
    [10, 20.375, 30, 15.375, 20],
    [12, 24.375, 36, 18.375, 24],
    [14, 28, 42, 21, 28],
  ];

  test('the spacing is twice the bend radius on every printed row', () => {
    for (const [nps, , lo, , so] of PRINTED) {
      expect(returnSpacing(nps)).toBeCloseTo(lo, 12);
      if (Number.isFinite(so)) expect(returnSpacing(nps, 'short')).toBeCloseTo(so, 12);
    }
  });

  // The height is the bend radius plus half the pipe's outside diameter: the
  // back of the bend stands half a diameter proud of its own centre line.
  test('the height is the radius plus half the outside diameter', () => {
    for (const [nps, lk, , sk] of PRINTED) {
      expect(returnHeight(nps)).toBeCloseTo(lk, 1);
      if (Number.isFinite(sk)) expect(returnHeight(nps, 'short')).toBeCloseTo(sk, 1);
    }
  });

  test('it lands exactly on the printed figure wherever the size is a round one', () => {
    for (const nps of [2, 3, 4, 6, 12, 14]) {
      const row = PRINTED.find(([n]) => n === nps)!;
      expect(returnHeight(nps)).toBeCloseTo(row[1], 12);
      expect(returnHeight(nps, 'short')).toBeCloseTo(row[3], 12);
    }
  });

  test('a short radius return is always the tighter and the shorter', () => {
    for (const [nps, , , sk] of PRINTED) {
      if (!Number.isFinite(sk)) continue;
      expect(returnSpacing(nps, 'short')).toBeLessThan(returnSpacing(nps));
      expect(returnHeight(nps, 'short')).toBeLessThan(returnHeight(nps));
    }
  });

  // The one row that misses: it prints the one inch spacing against the half
  // inch size, and a height larger than the three quarter inch below it.
  test('the half inch row disagrees with the rule and is flagged, not followed', () => {
    expect(RETURN_DISAGREEMENT.nps).toBe(0.5);
    expect(RETURN_DISAGREEMENT.printedO).toBe(returnSpacing(1));
    expect(RETURN_DISAGREEMENT.printedK).toBeGreaterThan(returnHeight(0.75));
    expect(returnSpacing(0.5)).toBe(1.5);
    expect(returnHeight(0.5)).toBeLessThan(returnHeight(0.75));
  });

  test('a size that is not a size gives nothing', () => {
    expect(Number.isNaN(returnHeight(7))).toBe(true);
    expect(Number.isNaN(returnSpacing(0))).toBe(true);
  });
});

describe('butt welding caps', () => {
  test('eighteen printed sizes', () => {
    expect(WELD_CAPS.length).toBe(18);
    expect(weldCapSizes()[0]).toBe(1);
    expect(weldCapSizes()[17]).toBe(24);
  });

  test('rows read back as printed', () => {
    expect(weldCap(2)).toBe(1.5);
    expect(weldCap(6)).toBe(3.5);
    expect(weldCap(24)).toBe(10.5);
  });

  // The cap holds at an inch and a half through the small sizes and then
  // climbs, because below two and a half the dish is already as deep as the
  // pipe end needs.
  test('it holds level to two and a half inch, then never falls', () => {
    for (const nps of [1, 1.25, 1.5, 2, 2.5]) expect(weldCap(nps)).toBe(1.5);
    for (let i = 1; i < WELD_CAPS.length; i++) {
      expect(WELD_CAPS[i]!.e).toBeGreaterThanOrEqual(WELD_CAPS[i - 1]!.e);
    }
    expect(weldCap(24)).toBeGreaterThan(weldCap(2));
  });

  test('a cap always covers the pipe it goes on', () => {
    for (const c of WELD_CAPS) {
      const row = findRow(c.nps);
      if (!row) continue;
      expect(c.e).toBeGreaterThan(row.od / 4);
    }
  });

  test('every size is a real pipe size', () => {
    for (const c of WELD_CAPS) expect(findRow(c.nps)).toBeDefined();
  });

  test('a size not listed gives nothing', () => {
    expect(Number.isNaN(weldCap(0.75))).toBe(true);
    expect(Number.isNaN(weldCap(30))).toBe(true);
  });
});

import {
  REDUCING_WELD_TEES,
  reducingElbow,
  reducingElbowBranches,
  reducingElbowLargeSizes,
  reducingElbowMade,
  reducingWeldTeeOutlet,
  reducingWeldTeeOutlets,
  reducingWeldTeeRun,
  reducingWeldTeeRuns,
} from '../calc/weldFitting';

describe('butt welding reducing outlet tees', () => {
  test('fifty nine combinations across the three pages', () => {
    expect(REDUCING_WELD_TEES.length).toBe(59);
    expect(reducingWeldTeeRuns().length).toBe(15);
  });

  // The run never changes: a reducing tee runs the same as a plain one.
  test('the run keeps the straight tee figure', () => {
    for (const t of REDUCING_WELD_TEES) {
      if (t.run < 0.75) continue;
      expect(reducingWeldTeeRun(t.run)).toBe(weldTee(t.run));
    }
    // The half inch run is on the reducing pages only.
    expect(reducingWeldTeeRun(0.5)).toBe(1);
    expect(Number.isNaN(weldTee(0.5))).toBe(true);
  });

  test('rows read back as printed', () => {
    expect(reducingWeldTeeOutlet(2, 0.75)).toBe(1.75);
    expect(reducingWeldTeeOutlet(6, 2.5)).toBe(4.75);
    expect(reducingWeldTeeOutlet(12, 10)).toBe(9.5);
  });

  test('the outlet is always smaller than the run', () => {
    for (const t of REDUCING_WELD_TEES) expect(t.outlet).toBeLessThan(t.run);
  });

  // Up to an inch and a half the outlet keeps the run's figure; from two inch
  // up it comes back in, and further in the smaller the outlet.
  test('the outlet matches the run to an inch and a half, then comes in', () => {
    for (const t of REDUCING_WELD_TEES) {
      if (t.run > 1.5) continue;
      expect(t.m).toBe(reducingWeldTeeRun(t.run));
    }
    for (const t of REDUCING_WELD_TEES) {
      if (t.run <= 1.5) continue;
      expect(t.m).toBeLessThan(reducingWeldTeeRun(t.run));
    }
  });

  test('a bigger outlet reaches further, within a run size', () => {
    for (const run of reducingWeldTeeRuns()) {
      const outlets = reducingWeldTeeOutlets(run);
      for (let i = 1; i < outlets.length; i++) {
        const a = reducingWeldTeeOutlet(run, outlets[i - 1]!);
        const b = reducingWeldTeeOutlet(run, outlets[i]!);
        expect(b).toBeGreaterThanOrEqual(a);
      }
    }
  });

  // Printed on both 2-45 and 2-46, and the two readings agree.
  test('the six by two and a half is printed twice and reads the same', () => {
    expect(reducingWeldTeeOutlet(6, 2.5)).toBe(4.75);
    expect(REDUCING_WELD_TEES.filter((t) => t.run === 6 && t.outlet === 2.5).length).toBe(1);
  });

  test('a combination not printed gives nothing', () => {
    expect(Number.isNaN(reducingWeldTeeOutlet(6, 1))).toBe(true);
    expect(Number.isNaN(reducingWeldTeeOutlet(14, 8))).toBe(true);
    expect(reducingWeldTeeOutlets(14)).toEqual([]);
  });
});

describe('90 degree reducing elbows', () => {
  test('seven large sizes, two inch to six', () => {
    expect(reducingElbowLargeSizes()).toEqual([2, 2.5, 3, 3.5, 4, 5, 6]);
  });

  // Every printed figure is the long radius rule on the larger size.
  test('it is one and a half times the larger size', () => {
    const PRINTED: [number, number, number][] = [
      [2, 1.5, 3], [2, 1, 3], [2.5, 2, 3.75], [2.5, 1.25, 3.75],
      [3, 2.5, 4.5], [3, 2, 4.5], [3, 1.5, 4.5], [3.5, 3, 5.25], [3.5, 2, 5.25],
      [4, 3.5, 6], [4, 3, 6], [4, 2, 6], [5, 4, 7.5], [5, 3.5, 7.5],
      [5, 3, 7.5], [5, 2.5, 7.5], [6, 5, 9], [6, 4, 9], [6, 3.5, 9], [6, 3, 9],
    ];
    expect(PRINTED.length).toBe(20);
    for (const [big, small, a] of PRINTED) {
      expect(reducingElbow(big, small)).toBeCloseTo(a, 12);
      expect(a).toBeCloseTo(longRadiusElbow(big), 12);
      expect(reducingElbowMade(big, small)).toBe(true);
    }
  });

  test('the pair can be given either way round', () => {
    expect(reducingElbow(3, 2)).toBe(reducingElbow(2, 3));
  });

  test('a combination not printed is marked as not made', () => {
    expect(reducingElbowMade(6, 2)).toBe(false);
    expect(reducingElbowBranches(8)).toEqual([]);
    expect(Number.isNaN(reducingElbow(8, 6))).toBe(true);
    expect(Number.isNaN(reducingElbow(4, 4))).toBe(true);
  });
});

import { STUB_ENDS, stubEnd, stubEndSizes, stubEndThickness } from '../calc/weldFitting';
import { wallFor } from '../calc/pipeData';

describe('lap joint stub ends', () => {
  // Read off page 2-52: size, lap diameter P, length S, thickness T.
  const PRINTED: [number, number, number, number][] = [
    [0.5, 1.375, 3, 0.109], [0.75, 1.6875, 3, 0.113], [1, 2, 4, 0.133],
    [1.25, 2.5, 4, 0.14], [1.5, 2.875, 4, 0.145], [2, 3.625, 6, 0.154],
    [2.5, 4.125, 6, 0.203], [3, 5, 6, 0.216], [3.5, 5.5, 6, 0.226],
    [4, 6.1875, 6, 0.237], [5, 7.3125, 8, 0.258], [6, 8.5, 8, 0.28],
    [8, 10.625, 8, 0.322], [10, 12.75, 10, 0.365], [12, 15, 10, 0.375],
    [14, 16.25, 12, 0.375], [16, 18.5, 12, 0.375], [18, 21, 12, 0.375],
  ];

  test('eighteen printed sizes, half inch to eighteen', () => {
    expect(STUB_ENDS.length).toBe(18);
    expect(stubEndSizes()[0]).toBe(0.5);
    expect(stubEndSizes()[17]).toBe(18);
  });

  test('every printed lap diameter and length reads back', () => {
    for (const [nps, p, s] of PRINTED) {
      expect(stubEnd(nps)).toMatchObject({ lapDiameter: p, length: s });
    }
  });

  // The whole thickness column is the standard weight wall, so it is read
  // from the pipe table rather than held twice.
  test('the wall and lap thickness is the standard weight wall, every size', () => {
    for (const [nps, , , t] of PRINTED) {
      expect(stubEndThickness(nps)).toBeCloseTo(t, 3);
      expect(wallFor(nps, 'Std')).toBeCloseTo(t, 3);
    }
  });

  // The lap has to stand proud of the pipe for a flange to bear on it.
  test('the lap is wider than the pipe it is welded to', () => {
    for (const s of STUB_ENDS) {
      const row = findRow(s.nps);
      if (!row) continue;
      expect(s.lapDiameter).toBeGreaterThan(row.od);
    }
  });

  test('both columns grow with the size', () => {
    for (let i = 1; i < STUB_ENDS.length; i++) {
      expect(STUB_ENDS[i]!.lapDiameter).toBeGreaterThan(STUB_ENDS[i - 1]!.lapDiameter);
      expect(STUB_ENDS[i]!.length).toBeGreaterThanOrEqual(STUB_ENDS[i - 1]!.length);
    }
  });

  // Stocked in six whole-inch lengths, the smallest two sizes on a three.
  test('the length comes in whole inches from a short list', () => {
    const stocked = new Set(STUB_ENDS.map((s) => s.length));
    expect([...stocked].sort((a, b) => a - b)).toEqual([3, 4, 6, 8, 10, 12]);
    for (const s of STUB_ENDS) expect(Number.isInteger(s.length)).toBe(true);
  });

  test('a size not listed gives nothing', () => {
    expect(stubEnd(20)).toBeUndefined();
    expect(Number.isNaN(stubEndThickness(20))).toBe(true);
  });
});
