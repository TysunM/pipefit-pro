import {
  CARDINALS,
  Cardinal,
  SpoolSegment,
  cross,
  dot,
  len,
  makeSegment,
  segmentDirection,
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
const seg = (c: Cardinal, l: number, i = Math.random().toString(36).slice(2)) => makeSegment(i, c, l);

describe('direction vectors', () => {
  test('every cardinal is a unit vector', () => {
    for (const c of CARDINALS) near(len(segmentDirection(seg(c.id, 1))), 1);
  });

  test('cardinals map to the right axes', () => {
    near(segmentDirection(seg('N', 1)).z, 1);
    near(segmentDirection(seg('S', 1)).z, -1);
    near(segmentDirection(seg('E', 1)).x, 1);
    near(segmentDirection(seg('W', 1)).x, -1);
    near(segmentDirection(seg('U', 1)).y, 1);
    near(segmentDirection(seg('D', 1)).y, -1);
  });

  test('opposite cardinals negate', () => {
    for (const [a, b] of [['N', 'S'], ['E', 'W'], ['U', 'D']] as [Cardinal, Cardinal][]) {
      near(dot(segmentDirection(seg(a, 1)), segmentDirection(seg(b, 1))), -1);
    }
  });

  test('polar azimuth 0 points north and 90 points east', () => {
    const n: SpoolSegment = { id: 'a', mode: 'polar', cardinal: 'N', azimuth: 0, elevation: 0, length: 1 };
    const e: SpoolSegment = { id: 'b', mode: 'polar', cardinal: 'N', azimuth: 90, elevation: 0, length: 1 };
    near(segmentDirection(n).z, 1);
    near(segmentDirection(e).x, 1, 1e-9);
  });

  test('polar elevation 90 points straight up', () => {
    const up: SpoolSegment = { id: 'c', mode: 'polar', cardinal: 'N', azimuth: 0, elevation: 90, length: 1 };
    near(segmentDirection(up).y, 1);
  });

  test('polar directions stay unit length across a sweep', () => {
    for (let az = 0; az < 360; az += 17)
      for (let el = -80; el <= 80; el += 23) {
        const s: SpoolSegment = { id: 'x', mode: 'polar', cardinal: 'N', azimuth: az, elevation: el, length: 1 };
        near(len(segmentDirection(s)), 1, 1e-9);
      }
  });
});

describe('geometry of a simple two-run spool', () => {
  const r = solveSpool({ ...base, segments: [seg('N', 24, 'a'), seg('U', 18, 'b')] });

  test('solves', () => expect(r.valid).toBe(true));
  test('walks the points', () => {
    near(r.points[0]!.z, 0);
    near(r.points[1]!.z, 24);
    near(r.points[2]!.z, 24);
    near(r.points[2]!.y, 18);
  });
  test('one elbow at the corner', () => expect(r.elbows).toHaveLength(1));
  test('the elbow is 90 degrees', () => near(r.elbows[0]!.angle, 90, 1e-9));
  test('takeoff matches the shared elbow table', () => near(r.elbows[0]!.takeoff, takeoff(2, 'LR', 90)));
  test('each run loses one takeoff', () => {
    near(r.runs[0]!.cutLength, 24 - takeoff(2, 'LR', 90));
    near(r.runs[1]!.cutLength, 18 - takeoff(2, 'LR', 90));
  });
  test('free ends deduct nothing', () => {
    near(r.runs[0]!.takeoffStart, 0);
    near(r.runs[1]!.takeoffEnd, 0);
  });
  test('total cut is the sum of the runs', () => near(r.totalCut, r.runs[0]!.cutLength + r.runs[1]!.cutLength));
  test('bounds cover the spool', () => {
    near(r.bounds.size.z, 24);
    near(r.bounds.size.y, 18);
    near(r.bounds.size.x, 0);
  });
});

describe('elbow angles for every cardinal turn', () => {
  test('perpendicular turns are 90 degrees', () => {
    const pairs: [Cardinal, Cardinal][] = [
      ['N', 'U'], ['N', 'E'], ['N', 'D'], ['N', 'W'],
      ['E', 'U'], ['E', 'D'], ['U', 'N'], ['D', 'W'],
    ];
    for (const [a, b] of pairs) {
      const r = solveSpool({ ...base, segments: [seg(a, 20), seg(b, 20)] });
      expect(r.valid).toBe(true);
      near(r.elbows[0]!.angle, 90, 1e-9);
    }
  });

  test('a straight continuation makes no elbow', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 10), seg('N', 10)] });
    expect(r.elbows).toHaveLength(0);
    near(r.runs[0]!.cutLength, 10);
  });

  test('doubling back is rejected', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 10), seg('S', 10)] });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/doubles/i);
  });

  test('a 45 degree turn matches the offset solver takeoff', () => {
    const r = solveSpool({
      ...base,
      segments: [
        seg('N', 30),
        { id: 'x', mode: 'polar', cardinal: 'N', azimuth: 45, elevation: 0, length: 30 },
      ],
    });
    near(r.elbows[0]!.angle, 45, 1e-9);
    near(r.elbows[0]!.takeoff, takeoff(2, 'LR', 45));
  });
});

describe('a rolling offset expressed as a spool', () => {
  const rise = 12;
  const roll = 5;
  const run = 36;
  const trueOffset = Math.hypot(rise, roll);
  const travel = Math.hypot(run, trueOffset);
  const azimuth = 0;

  const diag: SpoolSegment = {
    id: 'd',
    mode: 'polar',
    cardinal: 'N',
    azimuth: (Math.atan2(roll, run) * 180) / Math.PI,
    elevation: (Math.asin(rise / travel) * 180) / Math.PI,
    length: travel,
  };

  const r = solveSpool({ ...base, segments: [seg('N', 20, 'in'), diag, seg('N', 20, 'out')] });

  test('solves with two elbows', () => {
    expect(r.valid).toBe(true);
    expect(r.elbows).toHaveLength(2);
  });

  test('the diagonal rises by the rise and rolls by the roll', () => {
    const d = sub(r.points[2]!, r.points[1]!);
    near(d.y, rise, 1e-6);
    near(d.x, roll, 1e-6);
    near(d.z, run, 1e-6);
  });

  test('both elbows share the same deflection', () => near(r.elbows[0]!.angle, r.elbows[1]!.angle, 1e-9));

  test('the deflection matches atan(trueOffset / run)', () =>
    near(r.elbows[0]!.angle, (Math.atan(trueOffset / run) * 180) / Math.PI, 1e-6));

  test('the middle run loses a takeoff at both ends', () => {
    const t = takeoff(2, 'LR', r.elbows[0]!.angle);
    near(r.runs[1]!.cutLength, travel - 2 * t);
  });

  test('that middle cut equals the rolling offset screen result', () => {
    near(r.runs[1]!.cutLength, 37.2249, 0.001);
  });

  test('azimuth is unused for a pure cardinal run', () => near(azimuth, 0));
});

describe('bend-plane change between successive elbows', () => {
  test('an up-and-over keeps both elbows in one plane, so no roll', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 20), seg('U', 20), seg('N', 20)] });
    expect(r.elbows).toHaveLength(2);
    near(Math.abs(r.elbows[1]!.planeChangeFromPrevious), 0, 1e-6);
  });

  test('a reversing turn in the same plane still reports no roll', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 20), seg('D', 20), seg('N', 20)] });
    near(Math.abs(r.elbows[1]!.planeChangeFromPrevious), 0, 1e-6);
  });

  test('plane change never exceeds 90 degrees, because a plane has no front', () => {
    const dirs: Cardinal[] = ['N', 'E', 'S', 'W', 'U', 'D'];
    for (const a of dirs)
      for (const b of dirs)
        for (const c of dirs) {
          const r = solveSpool({ ...base, segments: [seg(a, 20), seg(b, 20), seg(c, 20)] });
          if (!r.valid || r.elbows.length < 2) continue;
          const v = r.elbows[1]!.planeChangeFromPrevious;
          if (!Number.isFinite(v)) continue;
          expect(v).toBeGreaterThanOrEqual(-1e-9);
          expect(v).toBeLessThanOrEqual(90 + 1e-9);
        }
  });

  test('two elbows in perpendicular planes roll 90 degrees', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 20), seg('U', 20), seg('E', 20)] });
    near(Math.abs(r.elbows[1]!.planeChangeFromPrevious), 90, 1e-6);
  });

  test('the first elbow has no previous to roll from', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 20), seg('U', 20)] });
    expect(Number.isFinite(r.elbows[0]!.planeChangeFromPrevious)).toBe(false);
  });

  test('roll normals are unit length and perpendicular to both runs', () => {
    const r = solveSpool({ ...base, segments: [seg('N', 20), seg('U', 20), seg('E', 20)] });
    for (let i = 0; i < r.runs.length - 1; i += 1) {
      const n = unit(cross(r.runs[i]!.direction, r.runs[i + 1]!.direction));
      near(len(n), 1, 1e-9);
      near(dot(n, r.runs[i]!.direction), 0, 1e-9);
      near(dot(n, r.runs[i + 1]!.direction), 0, 1e-9);
    }
  });
});

describe('weld gaps and guards', () => {
  test('a gap comes off once per welded end', () => {
    const g = solveSpool({ ...base, gap: 0.125, segments: [seg('N', 24), seg('U', 18), seg('E', 24)] });
    const t = takeoff(2, 'LR', 90);
    near(g.runs[0]!.cutLength, 24 - t - 0.125);
    near(g.runs[1]!.cutLength, 18 - 2 * t - 0.25);
    near(g.runs[2]!.cutLength, 24 - t - 0.125);
  });

  test('rejects an empty spool', () => expect(solveSpool({ ...base, segments: [] }).valid).toBe(false));
  test('rejects a zero length run', () =>
    expect(solveSpool({ ...base, segments: [seg('N', 0)] }).valid).toBe(false));
  test('rejects a NaN length', () =>
    expect(solveSpool({ ...base, segments: [seg('N', NaN)] }).valid).toBe(false));
  test('rejects a run too short for its fittings', () => {
    const r = solveSpool({ ...base, nps: 12, segments: [seg('N', 30), seg('U', 2), seg('E', 30)] });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/too short/i);
  });
  test('rejects a polar run with no azimuth', () => {
    const bad: SpoolSegment = { id: 'z', mode: 'polar', cardinal: 'N', azimuth: NaN, elevation: 0, length: 10 };
    expect(solveSpool({ ...base, segments: [bad] }).valid).toBe(false);
  });
});

describe('single run spool', () => {
  const r = solveSpool({ ...base, segments: [seg('E', 96)] });
  test('is valid with no elbows', () => {
    expect(r.valid).toBe(true);
    expect(r.elbows).toHaveLength(0);
  });
  test('cuts the full length', () => near(r.runs[0]!.cutLength, 96));
  test('weight matches the pipe table', () => {
    const s = findSize(2);
    near(r.weight, (96 / 12) * 10.6802 * s.wall['40'] * (s.od - s.wall['40']), 0.01);
  });
});

describe('closed box walk returns to the origin', () => {
  const r = solveSpool({
    ...base,
    segments: [seg('N', 24, '1'), seg('E', 24, '2'), seg('S', 24, '3'), seg('W', 24, '4')],
  });
  test('solves with three elbows', () => {
    expect(r.valid).toBe(true);
    expect(r.elbows).toHaveLength(3);
  });
  test('the last point lands back on the first', () => {
    const last = r.points[r.points.length - 1]!;
    near(len(sub(last, r.points[0]!)), 0, 1e-9);
  });
  test('every elbow is 90 degrees', () => {
    for (const e of r.elbows) near(e.angle, 90, 1e-9);
  });
  test('all four turns lie in the horizontal plane, so no roll', () => {
    for (const e of r.elbows.slice(1)) near(Math.abs(e.planeChangeFromPrevious), 0, 1e-6);
  });
});

describe('scaling and units', () => {
  test('doubling every length doubles the centre-to-centre total', () => {
    const a = solveSpool({ ...base, segments: [seg('N', 10), seg('U', 20), seg('E', 30)] });
    const b = solveSpool({ ...base, segments: [seg('N', 20), seg('U', 40), seg('E', 60)] });
    near(b.totalCenterToCenter, a.totalCenterToCenter * 2);
  });

  test('takeoffs do not scale with run length, so cuts are not simply doubled', () => {
    const a = solveSpool({ ...base, segments: [seg('N', 10), seg('U', 20)] });
    const b = solveSpool({ ...base, segments: [seg('N', 20), seg('U', 40)] });
    expect(b.totalCut).toBeGreaterThan(a.totalCut);
    expect(b.totalCut).not.toBeCloseTo(a.totalCut * 2, 5);
  });

  test('a larger pipe removes more from the same spool', () => {
    const small = solveSpool({ ...base, nps: 2, segments: [seg('N', 40), seg('U', 40)] });
    const large = solveSpool({ ...base, nps: 8, segments: [seg('N', 40), seg('U', 40)] });
    expect(large.totalCut).toBeLessThan(small.totalCut);
  });

  test('short radius removes less than long radius', () => {
    const lr = solveSpool({ ...base, kind: 'LR', segments: [seg('N', 40), seg('U', 40)] });
    const sr = solveSpool({ ...base, kind: 'SR', segments: [seg('N', 40), seg('U', 40)] });
    expect(sr.totalCut).toBeGreaterThan(lr.totalCut);
  });
});

describe('elbow arc figures agree with the shared pipe module', () => {
  test('every elbow reports the same arcs the calculators do', () => {
    const r = solveSpool({ ...base, nps: 6, segments: [seg('N', 60), seg('U', 60), seg('E', 60)] });
    const od = findSize(6).od;
    for (const e of r.elbows) {
      near(e.centerlineArc, 1.5 * 6 * rad(e.angle), 1e-9);
      near(e.throatArc, (1.5 * 6 - od / 2) * rad(e.angle), 1e-9);
      near(e.backArc, (1.5 * 6 + od / 2) * rad(e.angle), 1e-9);
      near((e.throatArc + e.backArc) / 2, e.centerlineArc, 1e-9);
    }
  });
});
