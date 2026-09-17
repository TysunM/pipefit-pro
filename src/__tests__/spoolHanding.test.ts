import { SpoolLeg, flipAll, flipLeg, makeLeg, mirrorLegs, solveSpool } from '../calc/spool';

const B = { nps: 2, kind: 'LR' as const, schedule: '40' as const, gap: 0.09375 };
const legs = (specs: [number, number, number][]): SpoolLeg[] =>
  specs.map(([l, b, r], i) => makeLeg(String(i), l, b, r));
const build = (ls: SpoolLeg[]) => solveSpool({ ...B, legs: ls });
const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

const ROLLED = legs([[36, 0, 0], [24, 90, 0], [30, 45, 35], [18, 60, 110], [22, 30, 250]]);
const FLAT = legs([[36, 0, 0], [24, 90, 0], [30, 90, 0]]);

/**
 * The property that matters most: turning a spool over is a change of hand,
 * never a change of cut. If any of these ever fail, the app is telling a fitter
 * to cut different pipe for the same job.
 */
const samePipe = (a: ReturnType<typeof build>, b: ReturnType<typeof build>) => {
  expect(a.valid).toBe(true);
  expect(b.valid).toBe(true);
  near(a.totalCut, b.totalCut);
  near(a.totalCenterToCenter, b.totalCenterToCenter);
  expect(b.runs.map((r) => +r.cutLength.toFixed(9))).toEqual(a.runs.map((r) => +r.cutLength.toFixed(9)));
  expect(b.elbows.map((e) => e.angle)).toEqual(a.elbows.map((e) => e.angle));
  expect(b.elbows.map((e) => +e.takeoff.toFixed(9))).toEqual(a.elbows.map((e) => +e.takeoff.toFixed(9)));
};

describe('mirroring a spool', () => {
  test('it is the original reflected, exactly', () => {
    const a = build(ROLLED);
    const m = build(mirrorLegs(ROLLED));
    // The start frame runs north and up, so the mirror plane is the one it
    // lies in and the reflection shows up as east becoming west.
    a.points.forEach((p, i) => {
      const q = m.points[i]!;
      near(q.x, -p.x, 1e-12);
      near(q.y, p.y, 1e-12);
      near(q.z, p.z, 1e-12);
    });
  });

  test('not one cut moves', () => samePipe(build(ROLLED), build(mirrorLegs(ROLLED))));

  test('mirroring twice is where you started', () => {
    expect(mirrorLegs(mirrorLegs(ROLLED))).toEqual(ROLLED.map((l) => ({ ...l, roll: ((l.roll % 360) + 360) % 360 })));
  });

  test('a flat spool is its own mirror, which is not a bug', () => {
    const m = mirrorLegs(FLAT);
    expect(m.map((l) => l.roll)).toEqual(FLAT.map((l) => l.roll));
    build(FLAT).points.forEach((p, i) => {
      const q = build(m).points[i]!;
      near(q.x, p.x);
      near(q.y, p.y);
      near(q.z, p.z);
    });
  });

  test('every roll comes back inside a turn', () => {
    for (const l of mirrorLegs(legs([[10, 0, 0], [10, 90, 35], [10, 90, 250], [10, 90, 0]]))) {
      expect(l.roll).toBeGreaterThanOrEqual(0);
      expect(l.roll).toBeLessThan(360);
    }
  });
});

describe('flipping one leg', () => {
  test('it turns that leg the other way', () => {
    const before = build(FLAT);
    const after = build(flipLeg(FLAT, 1));
    // Leg 2 ran up out of the first leg. Now it runs down.
    near(before.points[2]!.y, 24);
    near(after.points[2]!.y, -24);
  });

  test('the legs past it come with it', () => {
    const four = legs([[24, 0, 0], [18, 90, 0], [20, 45, 0], [16, 60, 0]]);
    const after = build(flipLeg(four, 2));
    const before = build(four);
    // The corner it turns at does not move; everything beyond it does.
    near(after.points[2]!.y, before.points[2]!.y);
    expect(Math.abs(after.points[4]!.z - before.points[4]!.z)).toBeGreaterThan(1);
  });

  test('not one cut moves', () => {
    const four = legs([[24, 0, 0], [18, 90, 0], [20, 45, 0], [16, 60, 0]]);
    samePipe(build(four), build(flipLeg(four, 2)));
  });

  test('flipping twice is where you started', () => {
    expect(flipLeg(flipLeg(ROLLED, 3), 3)[3]!.roll).toBe(ROLLED[3]!.roll);
  });

  test('the first leg has nothing to turn off, and is left alone', () => {
    expect(flipLeg(FLAT, 0)).toEqual(FLAT);
    expect(flipLeg(FLAT, 9)).toEqual(FLAT);
    expect(flipLeg(FLAT, -1)).toEqual(FLAT);
  });
});

describe('flipping the whole spool', () => {
  test('a flat spool folds the other way', () => {
    const after = build(flipAll(FLAT));
    near(after.points[2]!.y, -24);
    near(after.points[3]!.y, -24);
  });

  test('the first leg is untouched, so the spool starts where it started', () => {
    const after = flipAll(ROLLED);
    expect(after[0]).toEqual(ROLLED[0]);
    near(build(after).points[1]!.z, build(ROLLED).points[1]!.z);
  });

  test('not one cut moves', () => samePipe(build(ROLLED), build(flipAll(ROLLED))));

  test('flipping twice is where you started', () => {
    expect(flipAll(flipAll(ROLLED)).map((l) => l.roll)).toEqual(
      ROLLED.map((l) => ((l.roll % 360) + 360) % 360)
    );
  });
});

describe('what a fitter is promised', () => {
  // Say it once, plainly, across every operation and every shape.
  test('no way of turning a spool over ever changes the pipe you buy', () => {
    for (const shape of [ROLLED, FLAT, legs([[12, 0, 0], [40, 22.5, 90], [8, 60, 300]])]) {
      const original = build(shape);
      for (const turned of [mirrorLegs(shape), flipAll(shape), flipLeg(shape, 1), flipLeg(shape, 2)]) {
        samePipe(original, build(turned));
      }
    }
  });
});
