import {
  SOLDER_ELBOWS,
  SOLDER_ENDS,
  SOLDER_END_STEP,
  SOLDER_STREET_STEP,
  socketDepth,
  solderCenterToFace,
  solderCouplingStop,
  solderCut,
  solderElbow,
  solderEnd,
  solderReducer,
  solderReducerLargeSizes,
  solderReducerMade,
  solderReducerSmalls,
  solderSizes,
  solderTakeout,
} from '../calc/solderFitting';
import { copperTube } from '../calc/copperTube';

describe('solder joint ends', () => {
  test('fifteen printed sizes', () => {
    expect(SOLDER_ENDS.length).toBe(15);
    expect(solderSizes()).toEqual(SOLDER_ENDS.map((e) => e.nps));
  });

  test('rows read back as printed', () => {
    expect(solderEnd(1)).toMatchObject({ male: 1, female: 0.9375 });
    expect(solderEnd(8)).toMatchObject({ male: 4.0625, female: 4 });
  });

  // The page says both are given to the nearest larger sixteenth, and that is
  // exactly the gap between them in every size.
  test('the male end is the female plus a sixteenth, on every size', () => {
    for (const e of SOLDER_ENDS) {
      expect(e.male - e.female).toBeCloseTo(SOLDER_END_STEP, 12);
    }
    expect(SOLDER_END_STEP).toBeCloseTo(1 / 16, 12);
  });

  test('both grow with the size', () => {
    for (let i = 1; i < SOLDER_ENDS.length; i++) {
      expect(SOLDER_ENDS[i]!.male).toBeGreaterThan(SOLDER_ENDS[i - 1]!.male);
      expect(SOLDER_ENDS[i]!.female).toBeGreaterThan(SOLDER_ENDS[i - 1]!.female);
    }
  });

  // The socket has to take the tube and no more than the tube is round.
  // Three and a half inch is the one fitting size copper tube is not made in.
  test('the socket is in proportion to the tube it takes', () => {
    let checked = 0;
    for (const e of SOLDER_ENDS) {
      const tube = copperTube(e.nps, 'L');
      if (!tube) continue;
      expect(e.female).toBeGreaterThan(tube.od / 4);
      expect(e.female).toBeLessThan(tube.od);
      checked++;
    }
    expect(checked).toBe(14);
    expect(copperTube(3.5, 'L')).toBeUndefined();
  });

  test('a size not listed gives nothing', () => {
    expect(solderEnd(10)).toBeUndefined();
    expect(Number.isNaN(socketDepth(10))).toBe(true);
  });
});

describe('solder elbows and tees', () => {
  test('fifteen printed sizes', () => expect(SOLDER_ELBOWS.length).toBe(15));

  test('rows read back as printed', () => {
    expect(solderElbow(1)).toMatchObject({ h: 0.75, street90: 0.875, j: 0.3125 });
    expect(solderElbow(8)!.h).toBe(4.875);
    expect(solderElbow(4)!.j).toBe(0.9375);
  });

  // A street elbow carries its own spigot, and at 90 degrees that is an eighth
  // on every size both are made in.
  test('a street 90 is an eighth longer than a plain one, every time', () => {
    let compared = 0;
    for (const e of SOLDER_ELBOWS) {
      if (!Number.isFinite(e.street90)) continue;
      expect(e.street90 - e.h).toBeCloseTo(SOLDER_STREET_STEP, 12);
      compared++;
    }
    expect(compared).toBe(11);
  });

  // At 45 it holds on six of seven. The two inch runs three sixteenths.
  test('a street 45 is an eighth longer but for the two inch', () => {
    const off: number[] = [];
    for (const e of SOLDER_ELBOWS) {
      if (!Number.isFinite(e.street45)) continue;
      if (Math.abs(e.street45 - e.j - SOLDER_STREET_STEP) > 1e-9) off.push(e.nps);
    }
    expect(off).toEqual([2]);
    expect(solderElbow(2)!.street45 - solderElbow(2)!.j).toBeCloseTo(0.1875, 12);
  });

  // A 45 turns half as far, so it takes out less than a 90 of the same size.
  test('a 45 always takes out less than a 90', () => {
    for (const e of SOLDER_ELBOWS) {
      if (!Number.isFinite(e.j)) continue;
      expect(e.j).toBeLessThan(e.h);
    }
  });

  // The 45 columns hold level from three eighths to half inch, where the same
  // casting serves both, then climb. Nothing ever comes back down.
  test('every column climbs with the size and never falls', () => {
    for (const key of ['h', 'street90', 'j', 'street45'] as const) {
      let last = 0;
      for (const e of SOLDER_ELBOWS) {
        const v = e[key];
        if (!Number.isFinite(v)) continue;
        expect(v).toBeGreaterThanOrEqual(last);
        last = v;
      }
    }
    expect(solderElbow(0.375)!.j).toBe(solderElbow(0.5)!.j);
    expect(solderElbow(0.375)!.h).toBeLessThan(solderElbow(0.5)!.h);
  });

  test('a quarter inch 45 and the big street elbows are not made', () => {
    expect(Number.isNaN(solderElbow(0.25)!.j)).toBe(true);
    expect(Number.isNaN(solderElbow(5)!.street90)).toBe(true);
    expect(Number.isNaN(solderElbow(2.5)!.street45)).toBe(true);
  });

  describe('working to it', () => {
    test('the takeout is what a tube end comes back to', () => {
      expect(solderTakeout(1)).toBe(0.75);
      expect(solderTakeout(1, 'tee')).toBe(0.75);
      expect(solderTakeout(1, 'street90')).toBe(0.875);
      expect(solderTakeout(1, 'elbow45')).toBe(0.3125);
    });

    // Centre to face is the takeout plus the socket the tube sits in.
    test('centre to face is the takeout plus the socket', () => {
      expect(solderCenterToFace(1)).toBeCloseTo(0.75 + 0.9375, 12);
      expect(solderCenterToFace(2, 'elbow45')).toBeCloseTo(0.5625 + 1.375, 12);
      for (const e of SOLDER_ELBOWS) {
        expect(solderCenterToFace(e.nps)).toBeGreaterThan(solderTakeout(e.nps));
      }
    });

    test('two takeouts come off a centre to centre run', () => {
      expect(solderCut(24, solderTakeout(1))).toBeCloseTo(24 - 1.5, 12);
      expect(solderCut(24, solderTakeout(1), solderTakeout(1, 'elbow45'))).toBeCloseTo(
        24 - 0.75 - 0.3125,
        12
      );
    });

    test('a run too short for its own fittings is refused', () => {
      expect(Number.isNaN(solderCut(1, 0.75, 0.75))).toBe(true);
      expect(Number.isNaN(solderCut(24, NaN))).toBe(true);
      expect(Number.isNaN(solderTakeout(10))).toBe(true);
    });
  });
});

describe('solder couplings and reducers', () => {
  test('the coupling stop reads back as printed', () => {
    expect(solderCouplingStop(0.5)).toBe(0.125);
    expect(solderCouplingStop(2)).toBe(0.1875);
    expect(solderCouplingStop(8)).toBe(0.625);
    expect(Number.isNaN(solderCouplingStop(10))).toBe(true);
  });

  test('the stop never shrinks as the size grows', () => {
    let last = 0;
    for (const nps of solderSizes()) {
      const v = solderCouplingStop(nps);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  // Every reducer in this book behaves the same way.
  test('the reducer length depends only on the larger size', () => {
    for (const big of solderReducerLargeSizes()) {
      const smalls = solderReducerSmalls(big);
      expect(smalls.length).toBeGreaterThan(0);
      const first = solderReducer(big, smalls[0]!);
      for (const small of smalls) {
        expect(solderReducer(big, small)).toBe(first);
        expect(solderReducer(small, big)).toBe(first);
      }
    }
  });

  test('rows read back as printed', () => {
    expect(solderReducer(0.5, 0.375)).toBe(0.9375);
    expect(solderReducer(2, 1)).toBe(2.125);
    expect(solderReducer(4, 2)).toBe(3.4375);
  });

  test('it grows with the size', () => {
    const sizes = solderReducerLargeSizes();
    for (let i = 1; i < sizes.length; i++) {
      expect(solderReducer(sizes[i]!, sizes[i]! / 2)).toBeGreaterThan(
        solderReducer(sizes[i - 1]!, sizes[i - 1]! / 2)
      );
    }
  });

  test('a combination the page does not list is marked as not made', () => {
    expect(solderReducerMade(2, 1.5)).toBe(true);
    expect(solderReducerMade(2, 0.5)).toBe(false);
    expect(solderReducerSmalls(6)).toEqual([]);
  });

  test('a reducer needs two different sizes', () => {
    expect(Number.isNaN(solderReducer(2, 2))).toBe(true);
    expect(Number.isNaN(solderReducer(6, 4))).toBe(true);
  });
});
