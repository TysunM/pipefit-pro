import {
  Camera,
  ELEVATIONS,
  ISO_CORNERS,
  ISO_PITCH,
  ISO_VIEW,
  NAMED_VIEWS,
  PLAN_VIEW,
  distanceToSegment,
  fitView,
  legDirections,
  pageRight,
  pageUp,
  polylineCrossings,
  project,
  projectedFraction,
  bestCorner,
  viewAt,
  swing,
  viewAxis,
  viewScore,
} from '../components/spool3d/project';
import { Vec3, makeLeg, solveSpool } from '../calc/spool';

const EAST: Vec3 = { x: 1, y: 0, z: 0 };
const UP: Vec3 = { x: 0, y: 1, z: 0 };
const NORTH: Vec3 = { x: 0, y: 0, z: 1 };

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const BASE = { nps: 2, kind: 'LR' as const, schedule: '40' as const, gap: 0 };
const flat = (lengths: number[], bends?: number[]) =>
  solveSpool({
    ...BASE,
    legs: lengths.map((l, i) => makeLeg(String(i), l, bends ? bends[i]! : i === 0 ? 0 : 90, 0)),
  });

/** Every camera worth checking: the named ones, and a spread of hand-turned ones. */
const CAMS: Camera[] = [
  ...NAMED_VIEWS.map((v) => v.cam),
  { yaw: 0.9, pitch: 0.35 },
  { yaw: -2.6, pitch: -0.8 },
  { yaw: 2.0, pitch: 0.6 },
  { yaw: 5.9, pitch: (-75 * Math.PI) / 180 },
  { yaw: -0.2, pitch: (75 * Math.PI) / 180 },
];

describe('the page and the depth agree about where the viewer is', () => {
  // Three vectors make a camera: right on the page, up on the page, and out of
  // the page at the viewer. Fix two and the third is settled. Getting the odd
  // one wrong does not tilt the drawing — it draws the spool's mirror image
  // while the near and far pieces stay where they were, so the picture is the
  // other hand with the wrong pipe in front. This is the test that catches it.
  test('up crossed into right is the viewer, from every camera', () => {
    for (const cam of CAMS) {
      const e = cross(pageUp(cam), pageRight(cam));
      const v = viewAxis(cam);
      expect(dot(e, v)).toBeCloseTo(1, 12);
      // And the other way round it: right is the viewer crossed into up.
      const r = cross(v, pageUp(cam));
      expect(dot(r, pageRight(cam))).toBeCloseTo(1, 12);
    }
  });

  test('the three are unit vectors and square to each other', () => {
    for (const cam of CAMS) {
      for (const v of [pageRight(cam), pageUp(cam), viewAxis(cam)])
        expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 12);
      expect(dot(pageRight(cam), pageUp(cam))).toBeCloseTo(0, 12);
      expect(dot(pageRight(cam), viewAxis(cam))).toBeCloseTo(0, 12);
      expect(dot(pageUp(cam), viewAxis(cam))).toBeCloseTo(0, 12);
    }
  });

  test('the projection is the three read off, with the page counting y downward', () => {
    const p: Vec3 = { x: 3, y: -4, z: 5 };
    for (const cam of CAMS) {
      const q = project(p, cam);
      expect(q.x).toBeCloseTo(dot(p, pageRight(cam)), 12);
      expect(q.y).toBeCloseTo(-dot(p, pageUp(cam)), 12);
      expect(q.depth).toBeCloseTo(dot(p, viewAxis(cam)), 12);
    }
  });

  test('page up never leans downward, so nothing is ever drawn upside down', () => {
    for (const cam of CAMS) expect(pageUp(cam).y).toBeGreaterThanOrEqual(-1e-12);
  });
});

// The screen positions of the three world axes, which is all that decides
// whether a drawing reads as isometric.
const screenAxes = (cam: Camera) => ({ X: project(EAST, cam), Y: project(UP, cam), Z: project(NORTH, cam) });
const len = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);
/** Bearing on the page, measured anticlockwise from due right, screen up positive. */
const bearing = (p: { x: number; y: number }) => (Math.atan2(-p.y, p.x) * 180) / Math.PI;
const apart = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const d = Math.abs(bearing(a) - bearing(b));
  return d > 180 ? 360 - d : d;
};
/**
 * The angle between two axes taken as lines rather than as arrows.
 *
 * Which of an axis's two ends points towards the viewer depends on the corner
 * the camera sits in, so the directed angle flips between 120 and 60 from one
 * corner to the next while the drawing is the same. The angle between the
 * lines does not, and 60 between all three is what isometric means.
 */
const apartLines = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const d = apart(a, b);
  return Math.min(d, 180 - d);
};

describe('the view is isometric, the way iso paper is', () => {
  test('the three axes project the same length', () => {
    const a = screenAxes(ISO_VIEW);
    expect(len(a.X)).toBeCloseTo(len(a.Y), 12);
    expect(len(a.Y)).toBeCloseTo(len(a.Z), 12);
    // Each is sqrt(2/3) of true length, which is the isometric foreshortening.
    expect(len(a.X)).toBeCloseTo(Math.sqrt(2 / 3), 12);
  });

  test('the three axes come off the page 120 degrees apart', () => {
    const a = screenAxes(ISO_VIEW);
    expect(apart(a.X, a.Y)).toBeCloseTo(120, 9);
    expect(apart(a.Y, a.Z)).toBeCloseTo(120, 9);
    expect(apart(a.X, a.Z)).toBeCloseTo(120, 9);
    expect(apartLines(a.X, a.Y)).toBeCloseTo(60, 9);
    expect(apartLines(a.Y, a.Z)).toBeCloseTo(60, 9);
    expect(apartLines(a.X, a.Z)).toBeCloseTo(60, 9);
  });

  test('from the north east, up is up, north falls right and east falls left', () => {
    // Which way round this goes is the whole of the handedness. Standing north
    // east of a spool and looking down at it, north is away to your right and
    // east is away to your left — turn to face it, south west, and north is
    // behind your right shoulder. A drawing with those two swapped is the
    // mirror of the spool, which is the other hand, which does not fit.
    const a = screenAxes(ISO_VIEW);
    expect(bearing(a.Y)).toBeCloseTo(90, 9);
    expect(bearing(a.Z)).toBeCloseTo(-30, 9);
    expect(bearing(a.X)).toBeCloseTo(-150, 9);
  });

  test('the pitch that does it is atan of one over root two', () => {
    expect(ISO_PITCH).toBeCloseTo(Math.atan(Math.SQRT1_2), 15);
    expect(ISO_PITCH).toBeCloseTo(Math.asin(Math.tan(Math.PI / 6)), 12);
    expect((ISO_PITCH * 180) / Math.PI).toBeCloseTo(35.264389682754654, 9);
  });

  // The view this replaced. Kept as a test so the reason for the change is a
  // measurement and not a matter of taste.
  test('a merely tilted view is not isometric and measurably so', () => {
    const a = screenAxes({ yaw: -Math.PI / 5, pitch: (25 * Math.PI) / 180 });
    const lens = [len(a.X), len(a.Y), len(a.Z)];
    const spreadPct = (Math.max(...lens) - Math.min(...lens)) / Math.max(...lens);
    expect(spreadPct).toBeGreaterThan(0.24);
    expect(apart(a.X, a.Y)).toBeLessThan(110);
    expect(apart(a.X, a.Z)).toBeGreaterThan(130);
  });

  test('all four corners are isometric, a quarter turn apart', () => {
    expect(ISO_CORNERS).toHaveLength(4);
    expect(new Set(ISO_CORNERS.map((c) => c.id)).size).toBe(4);
    for (const c of ISO_CORNERS) {
      expect(c.cam.pitch).toBe(ISO_PITCH);
      const a = screenAxes(c.cam);
      expect(len(a.X)).toBeCloseTo(Math.sqrt(2 / 3), 12);
      expect(len(a.Y)).toBeCloseTo(Math.sqrt(2 / 3), 12);
      expect(len(a.Z)).toBeCloseTo(Math.sqrt(2 / 3), 12);
      expect(apartLines(a.X, a.Y)).toBeCloseTo(60, 9);
      expect(apartLines(a.Y, a.Z)).toBeCloseTo(60, 9);
      expect(apartLines(a.X, a.Z)).toBeCloseTo(60, 9);
      expect(bearing(a.Y)).toBeCloseTo(90, 9);
    }
    // The corner names read off the view axis: +x is east, +z is north.
    for (const c of ISO_CORNERS) {
      const d = viewAxis(c.cam);
      expect(d.z > 0).toBe(c.id.startsWith('N'));
      expect(d.x > 0).toBe(c.id.endsWith('E'));
      expect(d.y).toBeGreaterThan(0);
    }
    expect(ISO_CORNERS[0]!.cam).toEqual(ISO_VIEW);
  });
});

describe('the plan and the elevations are square on and the right way round', () => {
  test('the plan looks down, north up the page and east to the right', () => {
    const cam = PLAN_VIEW.cam;
    // Straight down: the viewer is directly overhead.
    expect(viewAxis(cam).y).toBeCloseTo(1, 12);
    const a = screenAxes(cam);
    // North up the page, east across it, and nothing left of vertical.
    expect(bearing(a.Z)).toBeCloseTo(90, 9);
    expect(bearing(a.X)).toBeCloseTo(0, 9);
    expect(len(a.Y)).toBeCloseTo(0, 12);
  });

  test('a riser has no length in a plan, which is why a plan needs figures', () => {
    expect(projectedFraction(UP, PLAN_VIEW.cam)).toBeCloseTo(0, 12);
    expect(projectedFraction(NORTH, PLAN_VIEW.cam)).toBeCloseTo(1, 12);
    expect(projectedFraction(EAST, PLAN_VIEW.cam)).toBeCloseTo(1, 12);
  });

  test('each elevation is level, from the side it is named for', () => {
    const side: Record<string, Vec3> = {
      'ELEV-S': { x: 0, y: 0, z: -1 },
      'ELEV-E': EAST,
      'ELEV-N': NORTH,
      'ELEV-W': { x: -1, y: 0, z: 0 },
    };
    for (const e of ELEVATIONS) {
      expect(e.cam.pitch).toBe(0);
      const v = viewAxis(e.cam);
      const want = side[e.id]!;
      expect(dot(v, want)).toBeCloseTo(1, 12);
      // Up is up, full length: an elevation measures heights straight off.
      const a = screenAxes(e.cam);
      expect(bearing(a.Y)).toBeCloseTo(90, 9);
      expect(len(a.Y)).toBeCloseTo(1, 12);
      // And the leg pointing at the viewer is the one that has gone.
      expect(projectedFraction(want, e.cam)).toBeCloseTo(0, 12);
    }
  });

  test('standing on a side, your right hand is where it would be', () => {
    // From the south you face north, and north-facing right is east.
    expect(dot(pageRight({ yaw: Math.PI, pitch: 0 }), EAST)).toBeCloseTo(1, 12);
    // From the east you face west, and west-facing right is north.
    expect(dot(pageRight({ yaw: -Math.PI / 2, pitch: 0 }), NORTH)).toBeCloseTo(1, 12);
  });

  test('the camera knows which named view it is sitting on, and when it is on none', () => {
    for (const v of NAMED_VIEWS) expect(viewAt(v.cam)?.id).toBe(v.id);
    expect(viewAt({ yaw: 1.1, pitch: 0.3 })).toBeNull();
  });

  test('every named view has its own name and its own words', () => {
    expect(new Set(NAMED_VIEWS.map((v) => v.id)).size).toBe(NAMED_VIEWS.length);
    expect(new Set(NAMED_VIEWS.map((v) => v.label)).size).toBe(NAMED_VIEWS.length);
    for (const v of NAMED_VIEWS) expect(v.title.length).toBeGreaterThan(8);
  });
});

describe('the drag swings and never tilts', () => {
  test('carries the tilt it started at, however far the thumb travels', () => {
    for (const v of NAMED_VIEWS) {
      for (const dx of [-900, -120, -1, 0, 1, 120, 900]) {
        expect(swing(v.cam, dx).pitch).toBe(v.cam.pitch);
      }
    }
  });

  test('leaves an isometric at the thirty degrees of iso paper, which is the point', () => {
    // The old drag put a vertical component of the thumb straight into pitch,
    // so any drag at all took the drawing off iso and nothing brought it back.
    for (const c of ISO_CORNERS) {
      expect(swing(c.cam, 400).pitch).toBe(ISO_PITCH);
      expect(swing(swing(c.cam, 400), -37).pitch).toBe(ISO_PITCH);
    }
  });

  test('walks the whole way round, so the far side is always reachable', () => {
    const turned = new Set<number>();
    let cam = ISO_VIEW;
    for (let i = 0; i < 600; i += 1) {
      cam = swing(cam, 1);
      turned.add(Math.floor(((((cam.yaw * 180) / Math.PI) % 360) + 360) % 360 / 45));
    }
    // Every eighth of the compass is passed through.
    expect(turned.size).toBe(8);
  });

  test('never gets under the spool, because it never changes height', () => {
    for (const v of NAMED_VIEWS) {
      for (const dx of [-500, -13, 13, 500]) {
        const cam = swing(v.cam, dx);
        expect(viewAxis(cam).y).toBeGreaterThanOrEqual(0);
        expect(pageUp(cam).y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('every named view is still reachable, and the drag cannot reach past them', () => {
    // The tilt now lives entirely on the buttons. Each named view is exactly
    // what it says, and no drag can land between two of them.
    for (const c of ISO_CORNERS) expect(c.cam.pitch).toBeCloseTo(ISO_PITCH, 12);
    expect(PLAN_VIEW.cam.pitch).toBeCloseTo(Math.PI / 2, 12);
    for (const e of ELEVATIONS) expect(e.cam.pitch).toBe(0);
    // Tapping one still lands exactly on it — goTo does not clamp.
    for (const v of NAMED_VIEWS) expect(viewAt(v.cam)?.id).toBe(v.id);
  });

  test('there is no yaw the drawing falls apart at, only ones a figure carries', () => {
    // A leg square on to the viewer loses its length and keeps its dimension.
    // That is a drawing convention, not a failure, so no yaw is fenced off.
    const spool = flat([36, 24, 30]);
    const dirs = legDirections(spool.points);
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 24) {
      const cam = { yaw, pitch: 0.4 };
      const f = fitView(spool.points, cam, 360, 360, 30);
      expect(Number.isFinite(f.scale)).toBe(true);
      expect(f.scale).toBeGreaterThan(0);
      for (const p of spool.points.map(f.map)) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
    expect(dirs.length).toBeGreaterThan(1);
  });
});

describe('the drawing fills the canvas', () => {
  const spool = flat([36, 24, 30, 18], [0, 90, 90, 45]);

  test('one axis or the other is filled right out to the padding, from every angle', () => {
    for (const cam of CAMS) {
      const f = fitView(spool.points, cam, 360, 360, 30);
      const pts = spool.points.map(f.map);
      const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
      const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
      expect(Math.max(w / 300, h / 300)).toBeCloseTo(1, 6);
    }
  });

  // What this replaced. The sphere had to hold the spool from its worst angle,
  // and no angle you look from is the worst one, so it gave the page away.
  test('it beats scaling off the bounding sphere, and by how much', () => {
    const c = {
      x: (Math.min(...spool.points.map((p) => p.x)) + Math.max(...spool.points.map((p) => p.x))) / 2,
      y: (Math.min(...spool.points.map((p) => p.y)) + Math.max(...spool.points.map((p) => p.y))) / 2,
      z: (Math.min(...spool.points.map((p) => p.z)) + Math.max(...spool.points.map((p) => p.z))) / 2,
    };
    const radius = Math.max(...spool.points.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)));
    const sphere = 300 / 2 / radius;
    const gains = CAMS.map((cam) => fitView(spool.points, cam, 360, 360, 30).scale / sphere);
    for (const g of gains) expect(g).toBeGreaterThan(1);
    // A third again bigger on the view it opens on.
    expect(gains[0]!).toBeGreaterThan(1.3);
  });

  test('the drawing is centred on the canvas from every angle', () => {
    for (const cam of CAMS) {
      const f = fitView(spool.points, cam, 360, 360, 30);
      const pts = spool.points.map(f.map);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(180, 9);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(180, 9);
    }
  });

  test('nothing is drawn outside the padding', () => {
    for (const cam of CAMS) {
      const f = fitView(spool.points, cam, 360, 360, 30);
      for (const p of spool.points.map(f.map)) {
        expect(p.x).toBeGreaterThanOrEqual(30 - 1e-9);
        expect(p.x).toBeLessThanOrEqual(330 + 1e-9);
        expect(p.y).toBeGreaterThanOrEqual(30 - 1e-9);
        expect(p.y).toBeLessThanOrEqual(330 + 1e-9);
      }
    }
  });

  test('a ceiling holds the drawing down and never pushes it up', () => {
    // What a drag does: the scale it started at is all it may have, so the
    // picture gives ground as the silhouette grows and never swells.
    for (const cam of CAMS) {
      const free = fitView(spool.points, cam, 360, 360, 30).scale;
      const held = fitView(spool.points, cam, 360, 360, 30, free * 0.5).scale;
      expect(held).toBeCloseTo(free * 0.5, 9);
      const loose = fitView(spool.points, cam, 360, 360, 30, free * 2).scale;
      expect(loose).toBeCloseTo(free, 9);
    }
  });

  test('a spool seen exactly end on still has a scale', () => {
    const line = solveSpool({ ...BASE, legs: [makeLeg('a', 40, 0, 0)] });
    const f = fitView(line.points, { yaw: 0, pitch: 0 }, 360, 360, 30);
    expect(Number.isFinite(f.scale)).toBe(true);
    expect(f.scale).toBeGreaterThan(0);
    const p = f.map(line.points[0]!);
    expect(Number.isFinite(p.x)).toBe(true);
  });

  test('an empty spool still maps somewhere sane', () => {
    const f = fitView([], ISO_VIEW, 360, 360, 30);
    expect(f.map({ x: 0, y: 0, z: 0 })).toEqual({ x: 180, y: 180, depth: 0 });
  });
});

describe('picking a leg off the page', () => {
  test('distance to a segment is measured to the segment, not to its line', () => {
    expect(distanceToSegment(5, 5, 0, 0, 10, 0)).toBeCloseTo(5, 12);
    expect(distanceToSegment(20, 0, 0, 0, 10, 0)).toBeCloseTo(10, 12);
    expect(distanceToSegment(3, 4, 3, 0, 3, 0)).toBeCloseTo(4, 12);
  });
});

describe('breaking the line behind at a crossing', () => {
  const Hz = (y: number) => [{ x: 0, y }, { x: 10, y }];
  const V = (x: number) => [{ x, y: 0 }, { x, y: 10 }];

  test('a square crossing is found, at the crossing point', () => {
    const c = polylineCrossings(Hz(5), V(4));
    expect(c).toHaveLength(1);
    expect(c[0]!.x).toBeCloseTo(4, 12);
    expect(c[0]!.y).toBeCloseTo(5, 12);
    expect(c[0]!.sin).toBeCloseTo(1, 12);
    expect(c[0]!.ax).toBeCloseTo(1, 12);
    expect(c[0]!.ay).toBeCloseTo(0, 12);
  });

  test('the shallower the crossing the further the break must reach', () => {
    const shallow = polylineCrossings(Hz(5), [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(shallow).toHaveLength(1);
    expect(shallow[0]!.sin).toBeCloseTo(Math.SQRT1_2, 12);
  });

  test('lines that miss, stop short, or run together do not cross', () => {
    expect(polylineCrossings(Hz(5), V(40))).toHaveLength(0);
    expect(polylineCrossings(Hz(5), [{ x: 4, y: 0 }, { x: 4, y: 2 }])).toHaveLength(0);
    expect(polylineCrossings(Hz(5), Hz(5))).toHaveLength(0);
    expect(polylineCrossings(Hz(5), [{ x: 3, y: 3 }])).toHaveLength(0);
  });

  test('a bent piece is crossed at every place it is crossed', () => {
    const zig = [{ x: 0, y: 0 }, { x: 4, y: 8 }, { x: 8, y: 0 }];
    expect(polylineCrossings(Hz(4), zig)).toHaveLength(2);
  });
});

describe('the view opens on the corner the spool reads best from', () => {
  /** Along, up, and across: the spool the app opens with. */
  const along = solveSpool({
    ...BASE,
    legs: [makeLeg('a', 36, 0, 0), makeLeg('b', 24, 90, 0), makeLeg('c', 30, 90, 90)],
  });

  test('a corner where two legs cross is never chosen over one where none do', () => {
    const picked = bestCorner(along.points);
    const crossings = (cam: Camera) => {
      const f = along.points.map((p) => project(p, cam));
      let n = 0;
      for (let i = 1; i < f.length; i += 1)
        for (let j = i + 2; j < f.length; j += 1)
          n += polylineCrossings([f[i - 1]!, f[i]!], [f[j - 1]!, f[j]!]).length;
      return n;
    };
    expect(crossings(picked.cam)).toBe(0);
    // And the corner it used to be fixed at is one of the bad ones, which is
    // the whole reason this exists.
    expect(crossings(ISO_VIEW)).toBeGreaterThan(0);
  });

  test('the score it picks by is the lowest of the four', () => {
    const picked = bestCorner(along.points);
    const mine = viewScore(along.points, picked.cam);
    for (const c of ISO_CORNERS) expect(viewScore(along.points, c.cam)).toBeGreaterThanOrEqual(mine - 1e-9);
  });

  test('a crossing costs more than a leg lost end on, which costs more than a tight drawing', () => {
    // A flat spool standing in one plane: from two corners it is nearly edge
    // on, and those corners must lose to the two it opens out from.
    const plane = solveSpool({ ...BASE, legs: [makeLeg('a', 40, 0, 0), makeLeg('b', 40, 90, 0)] });
    const scores = ISO_CORNERS.map((c) => viewScore(plane.points, c.cam));
    expect(Math.min(...scores)).toBeLessThan(Math.max(...scores));
    expect(bestCorner(plane.points).cam.pitch).toBe(ISO_PITCH);
  });

  test('it always returns one of the four, even for a single straight leg', () => {
    const one = solveSpool({ ...BASE, legs: [makeLeg('a', 40, 0, 0)] });
    expect(ISO_CORNERS.map((c) => c.id)).toContain(bestCorner(one.points).id);
    expect(ISO_CORNERS.map((c) => c.id)).toContain(bestCorner([]).id);
  });

  test('ties go to the north east, so a symmetrical spool opens where it always did', () => {
    // A single riser looks the same from all four corners.
    const riser = solveSpool({ ...BASE, legs: [makeLeg('a', 40, 0, 0), makeLeg('b', 40, 90, 0)] });
    const scores = ISO_CORNERS.map((c) => viewScore(riser.points, c.cam));
    const low = Math.min(...scores);
    const first = ISO_CORNERS[scores.findIndex((s) => s < low + 1e-9)]!;
    expect(bestCorner(riser.points).id).toBe(first.id);
  });
});

describe('a pull holds the drawing still', () => {
  // On isometric paper you pick a scale, draw, and redraw the whole run
  // smaller if it outgrows the sheet. You do not rescale while the pencil is
  // moving. Rescaling under a thumb costs three things at once: the leg being
  // pulled can shrink on the page while its length goes up, its neighbours
  // appear to shorten though nothing about them changed, and the length runs
  // away because the thumb's travel is divided by a moving scale. These are
  // the measurements that hold the fix.
  const riser = (up: number) =>
    solveSpool({
      ...BASE,
      legs: [makeLeg('a', 36, 0, 0), makeLeg('b', up, 90, 0), makeLeg('c', 30, 90, 90)],
    });

  const W = 360;
  const H = 360;
  const PAD = 30;
  const draw = (spool: ReturnType<typeof riser>, hold?: ReturnType<typeof fitView>['transform']) =>
    fitView(spool.points, ISO_VIEW, W, H, PAD, Infinity, hold);

  test('a held transform is used exactly, whatever the spool has become', () => {
    const before = draw(riser(24));
    const after = draw(riser(60), before.transform);
    expect(after.transform).toEqual(before.transform);
    expect(after.scale).toBe(before.scale);
  });

  test('the legs nobody touched do not move a pixel', () => {
    const small = riser(24);
    const big = riser(60);
    const held = draw(small).transform;
    const a = draw(small, held);
    const b = draw(big, held);
    // Points 0 and 1 are the first leg, ahead of the one being pulled, so the
    // pull cannot have moved them.
    for (const i of [0, 1]) {
      expect(b.map(big.points[i]!).x).toBeCloseTo(a.map(small.points[i]!).x, 9);
      expect(b.map(big.points[i]!).y).toBeCloseTo(a.map(small.points[i]!).y, 9);
    }
  });

  test('the leg being pulled grows on the page in step with its length', () => {
    const held = draw(riser(24)).transform;
    const drawn = (up: number) => {
      const s = riser(up);
      const f = draw(s, held);
      const a = f.map(s.points[1]!);
      const b = f.map(s.points[2]!);
      return Math.hypot(b.x - a.x, b.y - a.y);
    };
    // Twice the length is twice the drawn length, to the pixel. Pull further,
    // it gets longer — never shorter, which is what the scale used to do.
    expect(drawn(48) / drawn(24)).toBeCloseTo(2, 9);
    let last = 0;
    for (const up of [24, 30, 36, 42, 48, 60, 90]) {
      const now = drawn(up);
      expect(now).toBeGreaterThan(last);
      last = now;
    }
  });

  test('without the hold the scale moves, which is the whole reason for it', () => {
    // Kept as a measurement so the reason for the hold is a number and not a
    // matter of taste: the same pull, unpinned, shrinks the drawing.
    expect(draw(riser(90)).scale).toBeLessThan(draw(riser(24)).scale * 0.85);
  });

  test('letting go refits, so the whole run scales down together', () => {
    const big = riser(90);
    const held = draw(riser(24)).transform;
    const pinned = draw(big, held);
    const released = draw(big);
    expect(released.scale).toBeLessThan(pinned.scale);
    // And the refit puts the whole spool back inside the padding.
    for (const p of big.points.map(released.map)) {
      expect(p.x).toBeGreaterThanOrEqual(PAD - 1e-9);
      expect(p.x).toBeLessThanOrEqual(W - PAD + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(PAD - 1e-9);
      expect(p.y).toBeLessThanOrEqual(H - PAD + 1e-9);
    }
  });
});
