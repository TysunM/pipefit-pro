import {
  COMPASS,
  DirLeg,
  LegDir,
  bearingLabel,
  compassPoint,
  dirLabel,
  dirOf,
  dirShort,
  dirVector,
  fittingFor,
  flipDirs,
  isLevel,
  isVertical,
  mirrorDirs,
  rotateDirs,
  solveDirections,
  startFrame,
  turnDeg,
  turnTo,
} from '../calc/direction';
import { START_FRAME, Vec3, advanceFrame, cross, dot, len, makeLeg, solveSpool, sub, unit } from '../calc/spool';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);
const BASE = { nps: 2, kind: 'LR' as const, schedule: '40' as const, gap: 0.09375 };

const dir = (bearing: number, slope = 0): LegDir => ({ bearing, slope });
let n = 0;
const leg = (length: number, d: LegDir): DirLeg => ({ id: `d${(n += 1)}`, length, dir: d });

/** Build a spool from directions, the way the screen does. */
function build(legs: DirLeg[]) {
  const solved = solveDirections(legs);
  if (!solved.ok) throw new Error(solved.error);
  return solveSpool({
    ...BASE,
    legs: solved.legs.map((l) => ({ id: l.id, length: l.length, bend: l.bend, roll: l.roll })),
    start: solved.start,
  });
}

/** Every combination worth trying, including the awkward ones. */
const SPREAD: LegDir[] = [];
for (const bearing of [0, 30, 45, 90, 137, 180, 225, 270, 311]) {
  for (const slope of [-90, -60, -45, -12, 0, 17, 30, 45, 90]) SPREAD.push({ bearing, slope });
}

describe('a direction is a bearing and a slope', () => {
  test('the compass points land on the axes the drawing uses', () => {
    near(len(sub(dirVector(dir(0)), { x: 0, y: 0, z: 1 })), 0);
    near(len(sub(dirVector(dir(90)), { x: 1, y: 0, z: 0 })), 0);
    near(len(sub(dirVector(dir(180)), { x: 0, y: 0, z: -1 })), 0);
    near(len(sub(dirVector(dir(270)), { x: -1, y: 0, z: 0 })), 0);
    near(len(sub(dirVector(dir(0, 90)), { x: 0, y: 1, z: 0 })), 0);
    near(len(sub(dirVector(dir(0, -90)), { x: 0, y: -1, z: 0 })), 0);
  });

  test('every direction is a unit vector', () => {
    for (const d of SPREAD) near(len(dirVector(d)), 1, 1e-12);
  });

  test('a direction survives the round trip through a vector', () => {
    for (const d of SPREAD) {
      const back = dirOf(dirVector(d));
      near(back.slope, d.slope, 1e-9);
      // A vertical leg has no bearing to come back with, and says so.
      if (!isVertical(d)) near(turnDeg(back.bearing), turnDeg(d.bearing), 1e-9);
      else near(back.bearing, 0);
    }
  });

  test('a slope of forty five splits the rise and the run evenly', () => {
    const v = dirVector(dir(90, 45));
    near(v.x, Math.SQRT1_2);
    near(v.y, Math.SQRT1_2);
    near(v.z, 0, 1e-12);
  });

  test('level and vertical are told apart', () => {
    expect(isLevel(dir(90, 0))).toBe(true);
    expect(isLevel(dir(90, 3))).toBe(false);
    expect(isVertical(dir(0, 90))).toBe(true);
    expect(isVertical(dir(0, -90))).toBe(true);
    expect(isVertical(dir(0, 80))).toBe(false);
  });
});

describe('directions read in plain words', () => {
  test('the eight points of the rose', () => {
    for (const c of COMPASS) {
      expect(compassPoint(c.bearing)?.id).toBe(c.id);
      expect(bearingLabel(c.bearing)).toBe(c.id);
      expect(dirLabel({ bearing: c.bearing, slope: 0 })).toBe(c.label);
    }
  });

  test('a bearing between two points is said as a bearing', () => {
    expect(compassPoint(23)).toBeNull();
    expect(bearingLabel(23)).toBe('23°');
    expect(dirLabel(dir(23))).toBe('23°');
  });

  test('straight up and straight down are said plainly', () => {
    expect(dirLabel(dir(0, 90))).toBe('straight up');
    expect(dirLabel(dir(140, -90))).toBe('straight down');
    expect(dirShort(dir(0, 90))).toBe('UP');
    expect(dirShort(dir(0, -90))).toBe('DN');
  });

  test('a run that rises and turns says both', () => {
    expect(dirLabel(dir(45, 30))).toBe('30° up to the north east');
    expect(dirLabel(dir(180, -22.5))).toBe('22.5° down to the south');
    expect(dirShort(dir(45, 30))).toBe('30°↑ NE');
  });

  test('a bearing is never said as three sixty', () => {
    expect(bearingLabel(360)).toBe('N');
    expect(bearingLabel(-90)).toBe('W');
  });
});

describe('the turn that gets from one leg to the next', () => {
  test('carrying on straight is no turn at all', () => {
    const t = turnTo(START_FRAME, START_FRAME.d);
    expect(t).toEqual({ bend: 0, roll: 0 });
  });

  test('doubling back has no answer, and says so rather than guessing', () => {
    expect(turnTo(START_FRAME, { x: 0, y: 0, z: -1 })).toBeNull();
  });

  test('the turn it returns is the turn that lands on the direction asked for', () => {
    for (const d of SPREAD) {
      const v = dirVector(d);
      const t = turnTo(START_FRAME, v);
      if (!t) continue;
      const after = advanceFrame(START_FRAME, t.bend, t.roll);
      near(len(sub(after.d, v)), 0, 1e-9);
    }
  });

  test('roll zero is up and roll ninety is the right hand', () => {
    const up = turnTo(START_FRAME, dirVector(dir(0, 45)));
    near(up!.bend, 45, 1e-9);
    near(up!.roll, 0, 1e-9);
    // Heading north, the right hand points east.
    const right = turnTo(START_FRAME, dirVector(dir(45, 0)));
    near(right!.bend, 45, 1e-9);
    near(right!.roll, 90, 1e-9);
    const left = turnTo(START_FRAME, dirVector(dir(315, 0)));
    near(left!.roll, 270, 1e-9);
    const down = turnTo(START_FRAME, dirVector(dir(0, -45)));
    near(down!.roll, 180, 1e-9);
  });

  test('the start frame aims the first leg and keeps up overhead', () => {
    for (const d of SPREAD) {
      const f = startFrame(d);
      near(len(sub(f.d, dirVector(d))), 0, 1e-9);
      near(len(f.n), 1, 1e-9);
      near(dot(f.d, f.n), 0, 1e-9);
      // Roll zero means up, so the normal leans upward wherever it can.
      if (!isVertical(d)) expect(f.n.y).toBeGreaterThan(0);
    }
  });

  test('the frame stays orthonormal and right handed down a long chain', () => {
    let f = startFrame(dir(30, 10));
    for (const d of SPREAD) {
      const t = turnTo(f, dirVector(d));
      if (!t) continue;
      f = advanceFrame(f, t.bend, t.roll);
      near(len(f.d), 1, 1e-9);
      near(len(f.n), 1, 1e-9);
      near(dot(f.d, f.n), 0, 1e-9);
      near(len(cross(f.d, f.n)), 1, 1e-9);
    }
  });
});

describe('a spool aimed at the compass comes out aimed at the compass', () => {
  test('every leg of the default spool runs where it was told', () => {
    const dirs = [dir(90), dir(0, 90), dir(0)];
    const spool = build([leg(36, dirs[0]!), leg(24, dirs[1]!), leg(30, dirs[2]!)]);
    expect(spool.valid).toBe(true);
    spool.runs.forEach((r, i) => near(len(sub(unit(r.direction), dirVector(dirs[i]!))), 0, 1e-9));
  });

  test('every chain of directions comes out exact, however awkward', () => {
    for (let i = 0; i + 4 < SPREAD.length; i += 7) {
      const dirs = [SPREAD[i]!, SPREAD[i + 2]!, SPREAD[i + 5]!];
      const solved = solveDirections(dirs.map((d, k) => leg(20 + k * 6, d)));
      if (!solved.ok) continue;
      const spool = solveSpool({
        ...BASE,
        legs: solved.legs.map((l) => ({ id: l.id, length: l.length, bend: l.bend, roll: l.roll })),
        start: solved.start,
      });
      if (!spool.valid) continue;
      spool.runs.forEach((r, k) => near(len(sub(unit(r.direction), dirVector(dirs[k]!))), 0, 1e-8));
    }
  });

  test('the points walk the distance that was asked for', () => {
    const spool = build([leg(36, dir(90)), leg(24, dir(0, 90)), leg(30, dir(0))]);
    near(spool.points[1]!.x, 36);
    near(spool.points[2]!.y, 24);
    near(spool.points[3]!.z, 30);
  });

  test('a leg pointed straight back at the last one is refused by name', () => {
    const solved = solveDirections([leg(20, dir(90)), leg(20, dir(270))]);
    expect(solved.ok).toBe(false);
    if (!solved.ok) expect(solved.error).toContain('Leg 2');
  });

  test('an empty spool is refused', () => {
    expect(solveDirections([])).toEqual({ ok: false, error: 'Add at least one leg to build a spool.' });
  });

  test('the derived bends are the turns between the directions', () => {
    const dirs = [dir(90), dir(0, 90), dir(0)];
    const solved = solveDirections(dirs.map((d, i) => leg(24, d)));
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    for (let i = 1; i < dirs.length; i += 1) {
      const want = (Math.acos(Math.max(-1, Math.min(1, dot(dirVector(dirs[i - 1]!), dirVector(dirs[i]!))))) * 180) / Math.PI;
      near(solved.legs[i]!.bend, want, 1e-9);
    }
  });
});

describe('turning a spool over changes no cut', () => {
  const dirs = [dir(90), dir(20, 35), dir(310, -18), dir(0, 90)];
  const lengths = [36, 22, 41, 19];
  const cuts = (ds: LegDir[]) => {
    const s = build(ds.map((d, i) => leg(lengths[i]!, d)));
    expect(s.valid).toBe(true);
    return { cut: s.runs.map((r) => r.cutLength), bend: s.elbows.map((e) => e.angle), total: s.totalCut };
  };

  test('a mirror keeps every length, every bend and every cut', () => {
    const a = cuts(dirs);
    const b = cuts(mirrorDirs(dirs));
    a.cut.forEach((c, i) => near(c, b.cut[i]!, 1e-9));
    a.bend.forEach((c, i) => near(c, b.bend[i]!, 1e-9));
    near(a.total, b.total, 1e-9);
  });

  test('a mirror leaves the first leg where it was and turns the rest over', () => {
    const m = mirrorDirs(dirs);
    near(turnDeg(m[0]!.bearing), turnDeg(dirs[0]!.bearing), 1e-9);
    expect(turnDeg(m[1]!.bearing)).not.toBeCloseTo(turnDeg(dirs[1]!.bearing), 6);
    m.forEach((d, i) => near(d.slope, dirs[i]!.slope, 1e-9));
  });

  test('mirroring twice is where you started', () => {
    mirrorDirs(mirrorDirs(dirs)).forEach((d, i) => {
      near(turnDeg(d.bearing), turnDeg(dirs[i]!.bearing), 1e-9);
      near(d.slope, dirs[i]!.slope, 1e-9);
    });
  });

  test('a flip keeps every cut and turns every rise into a drop', () => {
    const a = cuts(dirs);
    const f = flipDirs(dirs);
    const b = cuts(f);
    a.cut.forEach((c, i) => near(c, b.cut[i]!, 1e-9));
    a.bend.forEach((c, i) => near(c, b.bend[i]!, 1e-9));
    f.forEach((d, i) => near(d.slope, -dirs[i]!.slope, 1e-9));
  });

  test('swinging it round the compass keeps every cut', () => {
    const a = cuts(dirs);
    const b = cuts(rotateDirs(dirs, 137));
    a.cut.forEach((c, i) => near(c, b.cut[i]!, 1e-9));
    a.bend.forEach((c, i) => near(c, b.bend[i]!, 1e-9));
  });

  test('a flat spool is not its own mirror once it is aimed, because the aim moves', () => {
    const flat = [dir(0), dir(90), dir(180)];
    const m = mirrorDirs(flat);
    near(turnDeg(m[1]!.bearing), 270, 1e-9);
  });
});

describe('what a bend needs buying', () => {
  test('ninety and forty five come off a shelf', () => {
    expect(fittingFor(90)).toEqual({ stock: true, label: '90° elbow', nearest: 90 });
    expect(fittingFor(45)).toEqual({ stock: true, label: '45° elbow', nearest: 45 });
  });

  test('a preset that is not stock is named but not claimed', () => {
    const f = fittingFor(22.5);
    expect(f.stock).toBe(false);
    expect(f.label).toBe('22.5° elbow');
  });

  test('anything else is a cut, with the nearest stock angle said', () => {
    const f = fittingFor(37.4);
    expect(f.stock).toBe(false);
    expect(f.label).toContain('cut to suit');
    expect(f.nearest).toBe(45);
  });

  test('a hair off ninety is still a cut, because a hair off does not weld up', () => {
    expect(fittingFor(90.4).stock).toBe(false);
    expect(fittingFor(90.01).stock).toBe(true);
  });
});
