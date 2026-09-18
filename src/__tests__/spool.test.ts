import { KNOWN_ELBOWS } from '../calc/direction';
import {
  MAX_LEGS,
  START_FRAME,
  SpoolLeg,
  advanceFrame,
  cross,
  dot,
  len,
  makeLeg,
  rotateAbout,
  solveSpool,
  sub,
  unit,
} from '../calc/spool';
import { findSize, takeoff } from '../calc/pipe';
import { rad } from '../calc/units';

const near = (a: number, b: number, tol = 1e-6) => {
  if (!Number.isFinite(a)) throw new Error(`expected finite, got ${a}`);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
};
const base = { nps: 2, kind: 'LR' as const, schedule: '40' as const, gap: 0 };
let n = 0;
const leg = (length: number, bend = 0, roll = 0): SpoolLeg => makeLeg(`l${(n += 1)}`, length, bend, roll);

describe('rotateAbout', () => {
  test('rotating about an axis preserves length', () => {
    const v = { x: 3, y: -4, z: 5 };
    for (const a of [0.1, 1, 2.5, 4]) near(len(rotateAbout(v, { x: 0, y: 1, z: 0 }, a)), len(v), 1e-9);
  });
  test('rotating a vector about itself changes nothing', () => {
    const v = unit({ x: 1, y: 2, z: 3 });
    const r = rotateAbout(v, v, 1.2);
    near(len(sub(r, v)), 0, 1e-9);
  });
  test('quarter turn of X about Y gives Z', () => {
    const r = rotateAbout({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, Math.PI / 2);
    near(r.x, 0, 1e-9);
    near(r.z, -1, 1e-9);
  });
  test('a full turn returns the original', () => {
    const v = { x: 1, y: 2, z: -3 };
    const r = rotateAbout(v, { x: 1, y: 1, z: 0 }, Math.PI * 2);
    near(len(sub(r, v)), 0, 1e-9);
  });
});

describe('frame advance', () => {
  test('the start frame is orthonormal', () => {
    near(len(START_FRAME.d), 1);
    near(len(START_FRAME.n), 1);
    near(dot(START_FRAME.d, START_FRAME.n), 0);
  });

  test('a zero bend leaves the frame alone', () => {
    const f = advanceFrame(START_FRAME, 0, 137);
    near(len(sub(f.d, START_FRAME.d)), 0);
    near(len(sub(f.n, START_FRAME.n)), 0);
  });

  test('the frame stays orthonormal through any bend and roll', () => {
    let f = START_FRAME;
    for (const [b, r] of [[45, 0], [22.5, 90], [60, 217], [11.25, 300], [90, 45]] as [number, number][]) {
      f = advanceFrame(f, b, r);
      near(len(f.d), 1, 1e-9);
      near(len(f.n), 1, 1e-9);
      near(dot(f.d, f.n), 0, 1e-9);
    }
  });

  test('the bend angle really is the deflection', () => {
    for (const b of [11.25, 22.5, 30, 45, 60, 90, 120]) {
      for (const r of [0, 37, 90, 180, 271]) {
        const f = advanceFrame(START_FRAME, b, r);
        const d = Math.max(-1, Math.min(1, dot(START_FRAME.d, f.d)));
        near((Math.acos(d) * 180) / Math.PI, b, 1e-6);
      }
    }
  });

  test('roll 0 bends toward the frame normal, which is up', () => {
    const f = advanceFrame(START_FRAME, 45, 0);
    expect(f.d.y).toBeGreaterThan(0.7);
    near(f.d.x, 0, 1e-9);
  });

  test('roll 180 bends the opposite way', () => {
    const up = advanceFrame(START_FRAME, 45, 0);
    const down = advanceFrame(START_FRAME, 45, 180);
    near(up.d.y, -down.d.y, 1e-9);
    near(up.d.z, down.d.z, 1e-9);
  });

  test('roll 90 and 270 are mirror images', () => {
    const a = advanceFrame(START_FRAME, 45, 90);
    const b = advanceFrame(START_FRAME, 45, 270);
    near(a.d.x, -b.d.x, 1e-9);
    near(a.d.y, b.d.y, 1e-9);
  });

  test('roll ninety is the right hand of a man facing along the pipe', () => {
    // Handedness, and the only place it is decided. The start frame heads
    // north with up overhead; facing north, a man's right hand is east. A
    // frame that turned west here would build every rolled spool as its own
    // mirror, which is the other hand, which does not fit the job.
    const right = advanceFrame(START_FRAME, 45, 90);
    expect(right.d.x).toBeGreaterThan(0.7);
    near(right.d.y, 0, 1e-9);
    const left = advanceFrame(START_FRAME, 45, 270);
    expect(left.d.x).toBeLessThan(-0.7);
  });

  test('a start frame aims the first leg, and is left alone when none is given', () => {
    const east = solveSpool({ ...base, start: { d: { x: 1, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 } }, legs: [leg(36)] });
    near(east.points[1]!.x, 36);
    near(east.points[1]!.z, 0, 1e-9);
    const plain = solveSpool({ ...base, legs: [leg(36)] });
    near(plain.points[1]!.z, 36);
  });

  test('roll wraps around 360', () => {
    const a = advanceFrame(START_FRAME, 45, 30);
    const b = advanceFrame(START_FRAME, 45, 390);
    near(len(sub(a.d, b.d)), 0, 1e-9);
  });
});

describe('a two leg 90 spool', () => {
  const r = solveSpool({ ...base, legs: [leg(36), leg(24, 90, 0)] });

  test('solves', () => expect(r.valid).toBe(true));
  test('the first leg runs along the start direction', () => {
    near(r.points[1]!.z, 36);
    near(r.points[1]!.y, 0);
  });
  test('the second leg turns up', () => {
    near(r.points[2]!.z, 36, 1e-9);
    near(r.points[2]!.y, 24, 1e-9);
  });
  test('one elbow, 90 degrees', () => {
    expect(r.elbows).toHaveLength(1);
    near(r.elbows[0]!.angle, 90);
  });
  test('each leg loses one takeoff', () => {
    near(r.runs[0]!.cutLength, 36 - takeoff(2, 'LR', 90));
    near(r.runs[1]!.cutLength, 24 - takeoff(2, 'LR', 90));
  });
});

describe('bend and roll drive the shape', () => {
  test('a straight joint makes no elbow', () => {
    const r = solveSpool({ ...base, legs: [leg(20), leg(20, 0, 0)] });
    expect(r.elbows).toHaveLength(0);
    near(r.runs[0]!.cutLength, 20);
    near(r.points[2]!.z, 40);
  });

  test('any bend angle is accepted, not just the presets', () => {
    for (const b of [3.5, 17.25, 38, 52.75, 87.5, 118]) {
      const r = solveSpool({ ...base, legs: [leg(40), leg(40, b, 0)] });
      expect(r.valid).toBe(true);
      near(r.elbows[0]!.angle, b);
      near(r.elbows[0]!.takeoff, takeoff(2, 'LR', b));
    }
  });

  test('rolling a joint keeps the same bend and cut, only the direction moves', () => {
    const a = solveSpool({ ...base, legs: [leg(30), leg(30, 45, 0)] });
    const b = solveSpool({ ...base, legs: [leg(30), leg(30, 45, 137)] });
    near(a.runs[1]!.cutLength, b.runs[1]!.cutLength);
    near(a.elbows[0]!.angle, b.elbows[0]!.angle);
    expect(len(sub(a.points[2]!, b.points[2]!))).toBeGreaterThan(1);
  });

  test('two 45s rolled 180 apart return to the original direction', () => {
    const r = solveSpool({ ...base, legs: [leg(20), leg(20, 45, 0), leg(20, 45, 180)] });
    near(len(sub(unit(r.runs[2]!.direction), unit(r.runs[0]!.direction))), 0, 1e-9);
  });

  test('two 45s rolled the same way make a 90 total turn', () => {
    const r = solveSpool({ ...base, legs: [leg(20), leg(20, 45, 0), leg(20, 45, 0)] });
    const d = dot(unit(r.runs[0]!.direction), unit(r.runs[2]!.direction));
    near((Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI, 90, 1e-6);
  });

  test('a classic offset returns to the original line', () => {
    const r = solveSpool({ ...base, legs: [leg(24), leg(14.1421, 45, 0), leg(24, 45, 180)] });
    near(unit(r.runs[2]!.direction).y, 0, 1e-9);
    near(r.points[3]!.y, 10, 1e-4);
  });
});

describe('leg limits and guards', () => {
  test(`accepts ${MAX_LEGS} legs`, () => {
    const legs = Array.from({ length: MAX_LEGS }, (_, i) => leg(20, i === 0 ? 0 : 45, i * 30));
    expect(solveSpool({ ...base, legs }).valid).toBe(true);
  });
  test(`rejects more than ${MAX_LEGS}`, () => {
    const legs = Array.from({ length: MAX_LEGS + 1 }, (_, i) => leg(20, i === 0 ? 0 : 45, 0));
    const r = solveSpool({ ...base, legs });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/limited/i);
  });
  test('rejects an empty spool', () => expect(solveSpool({ ...base, legs: [] }).valid).toBe(false));
  test('rejects a zero length leg', () => expect(solveSpool({ ...base, legs: [leg(0)] }).valid).toBe(false));
  test('rejects a NaN length', () => expect(solveSpool({ ...base, legs: [leg(NaN)] }).valid).toBe(false));
  test('rejects a 180 degree bend', () =>
    expect(solveSpool({ ...base, legs: [leg(20), leg(20, 180, 0)] }).valid).toBe(false));
  test('rejects a negative bend', () =>
    expect(solveSpool({ ...base, legs: [leg(20), leg(20, -10, 0)] }).valid).toBe(false));
  test('rejects a NaN roll', () =>
    expect(solveSpool({ ...base, legs: [leg(20), leg(20, 45, NaN)] }).valid).toBe(false));
  test('rejects a leg too short for its fittings', () => {
    const r = solveSpool({ ...base, nps: 12, legs: [leg(40), leg(2, 90, 0), leg(40, 90, 0)] });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/too short/i);
  });
  test('the first leg ignores bend and roll', () => {
    const a = solveSpool({ ...base, legs: [leg(30, 0, 0), leg(30, 45, 0)] });
    const b = solveSpool({ ...base, legs: [leg(30, 137, 271), leg(30, 45, 0)] });
    near(a.totalCut, b.totalCut);
    expect(a.elbows).toHaveLength(1);
    expect(b.elbows).toHaveLength(1);
  });
});

describe('cut list arithmetic', () => {
  test('a weld gap comes off once per welded end', () => {
    const g = solveSpool({ ...base, gap: 0.125, legs: [leg(36), leg(24, 90, 0), leg(30, 90, 90)] });
    const t = takeoff(2, 'LR', 90);
    near(g.runs[0]!.cutLength, 36 - t - 0.125);
    near(g.runs[1]!.cutLength, 24 - 2 * t - 0.25);
    near(g.runs[2]!.cutLength, 30 - t - 0.125);
  });

  test('free ends deduct nothing', () => {
    const r = solveSpool({ ...base, legs: [leg(36), leg(24, 90, 0)] });
    near(r.runs[0]!.takeoffStart, 0);
    near(r.runs[1]!.takeoffEnd, 0);
  });

  test('total cut is the sum of the legs', () => {
    const r = solveSpool({ ...base, legs: [leg(36), leg(24, 90, 0), leg(30, 45, 90)] });
    near(r.totalCut, r.runs.reduce((a, x) => a + x.cutLength, 0));
  });

  test('centre to centre is the raw sum of lengths', () => {
    const r = solveSpool({ ...base, legs: [leg(36), leg(24, 90, 0), leg(30, 45, 90)] });
    near(r.totalCenterToCenter, 90);
  });

  test('a larger pipe removes more', () => {
    const small = solveSpool({ ...base, nps: 2, legs: [leg(40), leg(40, 90, 0)] });
    const large = solveSpool({ ...base, nps: 8, legs: [leg(40), leg(40, 90, 0)] });
    expect(large.totalCut).toBeLessThan(small.totalCut);
  });

  test('short radius removes less than long radius', () => {
    const lr = solveSpool({ ...base, kind: 'LR', legs: [leg(40), leg(40, 90, 0)] });
    const sr = solveSpool({ ...base, kind: 'SR', legs: [leg(40), leg(40, 90, 0)] });
    expect(sr.totalCut).toBeGreaterThan(lr.totalCut);
  });

  test('a rolling offset reproduces the rolling offset screen cut', () => {
    const rise = 12;
    const roll = 5;
    const run = 36;
    const trueOffset = Math.hypot(rise, roll);
    const travel = Math.hypot(run, trueOffset);
    const bend = (Math.atan(trueOffset / run) * 180) / Math.PI;
    const r = solveSpool({ ...base, legs: [leg(20), leg(travel, bend, 0), leg(20, bend, 180)] });
    near(r.runs[1]!.cutLength, 37.2249, 0.001);
    near(r.elbows[0]!.angle, 19.8558, 0.001);
  });
});

describe('elbow figures agree with the shared pipe module', () => {
  test('arcs match for every elbow', () => {
    const r = solveSpool({ ...base, nps: 6, legs: [leg(60), leg(60, 90, 0), leg(60, 45, 90)] });
    const od = findSize(6).od;
    for (const e of r.elbows) {
      near(e.centerlineArc, 1.5 * 6 * rad(e.angle), 1e-9);
      near(e.throatArc, (1.5 * 6 - od / 2) * rad(e.angle), 1e-9);
      near(e.backArc, (1.5 * 6 + od / 2) * rad(e.angle), 1e-9);
      near((e.throatArc + e.backArc) / 2, e.centerlineArc, 1e-9);
    }
  });

  test('elbow roll is normalised into 0 to 360', () => {
    const r = solveSpool({ ...base, legs: [leg(20), leg(20, 45, -90), leg(20, 45, 450)] });
    near(r.elbows[0]!.roll, 270);
    near(r.elbows[1]!.roll, 90);
  });

  test('every elbow the app knows about resolves', () => {
    for (const b of KNOWN_ELBOWS) {
      const r = solveSpool({ ...base, legs: [leg(40), leg(40, b, 0)] });
      expect(r.valid).toBe(true);
      near(r.elbows[0]!.angle, b);
    }
  });
});

describe('bounds and labels', () => {
  test('bounds cover the walk', () => {
    const r = solveSpool({ ...base, legs: [leg(36), leg(24, 90, 0)] });
    near(r.bounds.size.z, 36);
    near(r.bounds.size.y, 24);
  });


  test('a single leg spool is valid with no elbows', () => {
    const r = solveSpool({ ...base, legs: [leg(96)] });
    expect(r.valid).toBe(true);
    expect(r.elbows).toHaveLength(0);
    near(r.runs[0]!.cutLength, 96);
  });

  test('run directions stay unit length', () => {
    const r = solveSpool({ ...base, legs: [leg(20), leg(20, 37, 63), leg(20, 52, 199), leg(20, 12, 300)] });
    for (const run of r.runs) near(len(run.direction), 1, 1e-9);
  });

  test('consecutive run directions are perpendicular to their bend axis', () => {
    const r = solveSpool({ ...base, legs: [leg(20), leg(20, 45, 63)] });
    const axis = unit(cross(r.runs[0]!.direction, r.runs[1]!.direction));
    near(dot(axis, r.runs[0]!.direction), 0, 1e-9);
    near(dot(axis, r.runs[1]!.direction), 0, 1e-9);
  });
});
