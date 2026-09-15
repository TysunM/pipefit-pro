import {
  Camera,
  ISO_CORNERS,
  ISO_PITCH,
  ISO_VIEW,
  MAX_PITCH,
  MIN_LEG_ANGLE,
  MIN_PITCH,
  MIN_PLANE_ANGLE,
  avoidEdgeOn,
  cameraMargin,
  clampPitch,
  legDirections,
  projectedFraction,
  project,
  allowedYaw,
  fitSphere,
  polylineCrossings,
  snapYaw,
  sweepOf,
  yawAt,
  settleCamera,
  spoolPlane,
  viewAxis,
  yawsWhereDot,
} from '../components/spool3d/project';
import { START_FRAME, Vec3, makeLeg, solveSpool } from '../calc/spool';

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

const BASE = { nps: 2, kind: 'LR' as const, schedule: '40' as const, gap: 0 };

/** A spool with no roll, which lies flat in the plane the start frame sets. */
const flat = (lengths: number[], bends?: number[]) =>
  solveSpool({
    ...BASE,
    legs: lengths.map((l, i) =>
      makeLeg(String(i), l, bends ? bends[i]! : i === 0 ? 0 : 90, 0)
    ),
  });

/** How big the spool is, so a drawn width can be read as a share of it. */
const spread = (pts: Vec3[]): number => {
  let m = 0;
  for (const a of pts) for (const b of pts) m = Math.max(m, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
  return m;
};

/**
 * How wide the spool draws across its thinnest direction.
 *
 * Edge on this goes to nothing: every leg lands on one line and they cover
 * each other, which is what disappearing actually looks like.
 */
const drawnWidth = (pts: Vec3[], cam: Camera): number => {
  const flatPts = pts.map((p) => project(p, cam));
  let widest = 0;
  let ax = 1;
  let ay = 0;
  for (const a of flatPts) {
    for (const b of flatPts) {
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l > widest) {
        widest = l;
        ax = (b.x - a.x) / l;
        ay = (b.y - a.y) / l;
      }
    }
  }
  if (widest < 1e-9) return 0;
  let thick = 0;
  for (const p of flatPts) {
    for (const q of flatPts) {
      thick = Math.max(thick, Math.abs((q.x - p.x) * ay - (q.y - p.y) * ax));
    }
  }
  return thick;
};

const EAST: Vec3 = { x: 1, y: 0, z: 0 };
const UP: Vec3 = { x: 0, y: 1, z: 0 };
const NORTH: Vec3 = { x: 0, y: 0, z: 1 };

describe('the camera never looks straight along a leg', () => {
  test('the view axis is the direction that projects to nothing', () => {
    for (const cam of [ISO_VIEW, { yaw: 0.7, pitch: 0.4 }, { yaw: -2.2, pitch: 1.1 }]) {
      const d = viewAxis(cam);
      expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 12);
      // A leg along the view axis projects to a point.
      const p = project(d, cam);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(0, 9);
      expect(projectedFraction(d, cam)).toBeCloseTo(0, 9);
    }
  });

  test('the pitch is held in a band away from level and away from straight down', () => {
    expect(clampPitch(0)).toBeCloseTo(MIN_PITCH, 12);
    expect(clampPitch(-3)).toBeCloseTo(MIN_PITCH, 12);
    expect(clampPitch(Math.PI / 2)).toBeCloseTo(MAX_PITCH, 12);
    expect(MIN_PITCH).toBeCloseTo((20 * Math.PI) / 180, 12);
    expect(MAX_PITCH).toBeCloseTo((55 * Math.PI) / 180, 12);
    // The band is not symmetric, and it should not be. The flat end is set by
    // horizontal legs collapsing; the steep end by the yaw running out of room
    // to clear a vertical plane, which bites a long way before straight down.
    expect(Math.sin(MIN_PLANE_ANGLE)).toBeLessThan(Math.cos(MAX_PITCH));
    expect(ISO_VIEW.pitch).toBeGreaterThanOrEqual(MIN_PITCH);
    expect(ISO_VIEW.pitch).toBeLessThanOrEqual(MAX_PITCH);
  });

  // This is what the pitch band buys: at any yaw at all, a leg on a principal
  // axis keeps at least a quarter of its length on screen.
  test('no leg on a principal axis can collapse, at any yaw in the band', () => {
    let worst = 1;
    for (let y = -Math.PI; y <= Math.PI; y += Math.PI / 180) {
      for (let p = MIN_PITCH; p <= MAX_PITCH; p += 0.02) {
        const cam: Camera = { yaw: y, pitch: p };
        for (const leg of [EAST, UP, NORTH]) {
          worst = Math.min(worst, projectedFraction(leg, cam));
        }
      }
    }
    // The flat end of the band is the floor: a level leg seen along it keeps
    // the cosine of the tilt, and the tilt never goes below twenty degrees.
    expect(worst).toBeGreaterThan(Math.sin(MIN_PITCH) - 1e-9);
    expect(worst).toBeGreaterThan(0.34);
  });

  test('a flatter or steeper camera is what would lose them', () => {
    // Dead level, a north leg viewed from the east is gone.
    expect(projectedFraction(NORTH, { yaw: 0, pitch: 0 })).toBeCloseTo(0, 9);
    // Straight down, every riser is gone.
    expect(projectedFraction(UP, { yaw: 0.3, pitch: Math.PI / 2 })).toBeCloseTo(0, 9);
    // Neither is reachable once the pitch is clamped.
    expect(clampPitch(0)).toBeGreaterThan(0);
    expect(clampPitch(Math.PI / 2)).toBeLessThan(Math.PI / 2);
  });
});

describe('the plane a flat spool lies in', () => {
  test('a spool built with no roll is flat, and the plane is found', () => {
    const spool = flat([24, 18, 30]);
    expect(spool.valid).toBe(true);
    const n = spoolPlane(spool.points);
    expect(n).not.toBeNull();
    // No roll keeps it in the plane the start frame sets up, which is the one
    // running north and up. Its normal points east.
    expect(Math.abs(n!.x)).toBeCloseTo(1, 6);
    expect(Math.abs(n!.y)).toBeLessThan(1e-6);
    expect(Math.abs(n!.z)).toBeLessThan(1e-6);
  });

  test('a rolled spool is not flat, and no plane is claimed', () => {
    const spool = solveSpool({
      ...BASE,
      legs: [makeLeg('a', 24, 0, 0), makeLeg('b', 18, 90, 0), makeLeg('c', 30, 45, 60)],
    });
    expect(spool.valid).toBe(true);
    expect(spoolPlane(spool.points)).toBeNull();
  });

  test('a straight run has no plane', () => {
    expect(spoolPlane([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }])).toBeNull();
    expect(spoolPlane([])).toBeNull();
  });

  test('the start frame is what puts a plain spool in a vertical plane', () => {
    expect(START_FRAME.d).toEqual(NORTH);
    expect(START_FRAME.n).toEqual(UP);
  });
});

describe('steering out of a flat spool plane', () => {
  const EAST_NORMAL = unit(EAST);

  // This is the bug the whole thing is for: yaw zero puts the camera inside
  // the plane a plain spool lies in, and the spool goes edge on.
  test('yaw zero looks straight into the plane of a plain spool', () => {
    const d = viewAxis({ yaw: 0, pitch: 0.4 });
    expect(Math.abs(d.x * EAST_NORMAL.x + d.y * EAST_NORMAL.y + d.z * EAST_NORMAL.z)).toBeCloseTo(
      0,
      9
    );
  });

  test('the camera is moved the shortest way out of it', () => {
    for (const pitch of [MIN_PITCH, 0.4, 0.9, MAX_PITCH]) {
      for (const yaw of [-Math.PI, -0.05, 0, 0.05, Math.PI]) {
        const out = avoidEdgeOn({ yaw, pitch }, EAST_NORMAL);
        const d = viewAxis(out);
        const along = Math.abs(d.x * EAST_NORMAL.x + d.y * EAST_NORMAL.y + d.z * EAST_NORMAL.z);
        expect(along).toBeGreaterThanOrEqual(Math.sin(MIN_PLANE_ANGLE) - 1e-9);
        expect(out.pitch).toBe(pitch);
      }
    }
  });

  test('a view already clear of the plane is left alone', () => {
    const cam = { yaw: -Math.PI / 5, pitch: 0.44 };
    expect(avoidEdgeOn(cam, EAST_NORMAL)).toEqual(cam);
    expect(avoidEdgeOn(cam, null)).toEqual(cam);
  });

  // The furthest it ever has to turn is set by the pitch: the flatter the
  // camera, the less a degree of yaw carries it out of the plane.
  test('it never turns further than the geometry requires', () => {
    for (const pitch of [MIN_PITCH, 0.44, 0.9, MAX_PITCH]) {
      const bound = Math.asin(Math.min(1, Math.sin(MIN_PLANE_ANGLE) / Math.cos(pitch)));
      for (let yaw = -Math.PI; yaw <= Math.PI; yaw += 0.01) {
        const out = avoidEdgeOn({ yaw, pitch }, EAST_NORMAL);
        expect(Math.abs(out.yaw - yaw)).toBeLessThan(bound + 1e-6);
      }
    }
    // Even at the steepest it is a small nudge, not a jump to a new view.
    const worst = Math.asin(Math.sin(MIN_PLANE_ANGLE) / Math.cos(MAX_PITCH));
    expect((worst * 180) / Math.PI).toBeLessThan(55);
  });

  // The whole point, end to end: sweep the camera all the way round a flat
  // spool and check that not one leg ever disappears.
  test('sweeping right round a flat spool, every leg stays on screen', () => {
    const spool = flat([24, 18, 30, 12], [0, 90, 90, 45]);
    expect(spool.valid).toBe(true);
    const plane = spoolPlane(spool.points);
    expect(plane).not.toBeNull();

    let worst = 1;
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 360) {
      for (const raw of [MIN_PITCH, 0.3, 0.6, 0.9, MAX_PITCH]) {
        const cam = avoidEdgeOn({ yaw, pitch: clampPitch(raw) }, plane);
        for (const run of spool.runs) worst = Math.min(worst, projectedFraction(run.direction, cam));
      }
    }
    // Every leg keeps a real share of its length from every angle.
    expect(worst).toBeGreaterThan(0.15);
  });

  // What actually goes wrong edge on is not that a leg shrinks to nothing but
  // that every leg lands on the same line, so they cover each other. The
  // measure for that is how wide the spool draws across its thinnest
  // direction: edge on it goes to nothing.
  test('edge on, the whole spool flattens onto one line', () => {
    const spool = flat([24, 18, 30]);
    const size = spread(spool.points);

    let thinnest = Infinity;
    let atYaw = 0;
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 360) {
      const w = drawnWidth(spool.points, { yaw, pitch: clampPitch(0.44) }) / size;
      if (w < thinnest) {
        thinnest = w;
        atYaw = yaw;
      }
    }
    expect(thinnest).toBeLessThan(0.01);
    // And it happens where the camera enters the plane, at yaw nought.
    expect(Math.abs(Math.sin(atYaw))).toBeLessThan(0.02);
  });

  test('with the steering, it never flattens from any angle', () => {
    const spool = flat([24, 18, 30, 12], [0, 90, 90, 45]);
    const plane = spoolPlane(spool.points);
    const size = spread(spool.points);

    let thinnest = Infinity;
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 360) {
      for (const raw of [MIN_PITCH, 0.3, 0.6, 0.9, MAX_PITCH]) {
        const cam = avoidEdgeOn({ yaw, pitch: clampPitch(raw) }, plane);
        thinnest = Math.min(thinnest, drawnWidth(spool.points, cam) / size);
      }
    }
    // It always draws with real width, never as a line. The worst of it is at
    // the steepest tilt, where looking down at a spool standing in a vertical
    // plane is inherently close to looking along that plane.
    expect(thinnest).toBeGreaterThan(0.1);

    let atWorking = Infinity;
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 360) {
      const cam = avoidEdgeOn({ yaw, pitch: clampPitch(0.44) }, plane);
      atWorking = Math.min(atWorking, drawnWidth(spool.points, cam) / size);
    }
    // At a normal working tilt it is far clear of flat.
    expect(atWorking).toBeGreaterThan(0.16);
  });

  // The deadband has to be one the yaw can actually reach at every tilt: at
  // the steepest pitch the camera is only cos(75) off a vertical plane to
  // begin with, so a band wider than that could never be cleared by turning.
  test('the deadband is one turning can always clear', () => {
    expect(Math.sin(MIN_PLANE_ANGLE)).toBeLessThan(Math.cos(MAX_PITCH));
  });
});


// The screen positions of the three world axes, which is all that decides
// whether a drawing reads as isometric.
const screenAxes = (cam: Camera) => ({
  X: project(EAST, cam),
  Y: project(UP, cam),
  Z: project(NORTH, cam),
});
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
  // Isometric means one thing exactly: the three axes come off the page 120
  // degrees apart and all three are foreshortened the same. Nothing else reads
  // as solid, which is why the drawing on paper beats a view that is merely
  // tilted.
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
    // As lines, which is the form that holds from every corner.
    expect(apartLines(a.X, a.Y)).toBeCloseTo(60, 9);
    expect(apartLines(a.Y, a.Z)).toBeCloseTo(60, 9);
    expect(apartLines(a.X, a.Z)).toBeCloseTo(60, 9);
  });

  test('up is up, and the two horizontals fall 30 degrees either side', () => {
    const a = screenAxes(ISO_VIEW);
    expect(bearing(a.Y)).toBeCloseTo(90, 9);
    expect(bearing(a.X)).toBeCloseTo(-30, 9);
    expect(bearing(a.Z)).toBeCloseTo(-150, 9);
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
    // A quarter of a difference between the axes, where isometric has none.
    expect(spreadPct).toBeGreaterThan(0.24);
    expect(apart(a.X, a.Y)).toBeLessThan(110);
    expect(apart(a.X, a.Z)).toBeGreaterThan(130);
  });

  test('all four corners are isometric, a quarter turn apart', () => {
    expect(ISO_CORNERS).toHaveLength(4);
    const ids = ISO_CORNERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(4);
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
    // The view opens on the north east corner.
    expect(ISO_CORNERS[0]!.cam).toEqual(ISO_VIEW);
  });
});

describe('solving for the yaws where something goes edge on', () => {
  test('every yaw it returns actually hits the target', () => {
    const vs: Vec3[] = [EAST, NORTH, unit({ x: 1, y: 1, z: 1 }), unit({ x: -2, y: 0.5, z: 3 })];
    for (const v of vs) {
      for (const pitch of [MIN_PITCH, ISO_PITCH, 0.9, MAX_PITCH]) {
        for (const target of [-0.6, -0.2, 0, 0.2, 0.6]) {
          for (const yaw of yawsWhereDot(pitch, v, target)) {
            const d = viewAxis({ yaw, pitch });
            expect(d.x * v.x + d.y * v.y + d.z * v.z).toBeCloseTo(target, 12);
          }
        }
      }
    }
  });

  test('a target out of reach at that pitch has no solution', () => {
    // A level leg can never be more than cos(pitch) along the view axis.
    expect(yawsWhereDot(ISO_PITCH, EAST, 0.99)).toHaveLength(0);
    // A vertical leg has no horizontal part to turn against.
    expect(yawsWhereDot(ISO_PITCH, UP, 0.2)).toHaveLength(0);
  });
});

describe('legs as constraints', () => {
  test('parallel and opposite legs are counted once', () => {
    const straightBack: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: 24 },
      { x: 0, y: 0, z: 4 },
    ];
    expect(legDirections(straightBack)).toHaveLength(1);
    expect(legDirections(flat([24, 18, 30]).points)).toHaveLength(2);
  });

  test('a repeated point adds no leg', () => {
    expect(legDirections([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }])).toHaveLength(0);
  });
});

describe('settling the camera so nothing is edge on', () => {
  const sweep = (dirs: Vec3[], plane: Vec3 | null) => {
    let worst = Infinity;
    let biggestTurn = 0;
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 360) {
      for (const raw of [MIN_PITCH, 0.35, ISO_PITCH, 0.9, MAX_PITCH]) {
        const out = settleCamera({ yaw, pitch: raw }, plane, dirs);
        worst = Math.min(worst, cameraMargin(out, plane, dirs));
        biggestTurn = Math.max(biggestTurn, Math.abs(out.yaw - yaw));
        expect(out.pitch).toBe(clampPitch(raw));
      }
    }
    return { worst, biggestTurn };
  };

  // The case the pitch band cannot answer: a leg on no principal axis, aimed
  // where the camera would look straight down it.
  test('a leg pointing along the view axis is steered off', () => {
    const leg = unit(viewAxis(ISO_VIEW));
    expect(projectedFraction(leg, ISO_VIEW)).toBeCloseTo(0, 12);
    const out = settleCamera(ISO_VIEW, null, [leg]);
    expect(projectedFraction(leg, out)).toBeGreaterThanOrEqual(Math.sin(MIN_LEG_ANGLE) - 1e-9);
  });

  test('every leg of a rolled spool stays on screen, right round', () => {
    const spool = solveSpool({
      ...BASE,
      legs: [
        makeLeg('a', 24, 0, 0),
        makeLeg('b', 18, 45, 30),
        makeLeg('c', 30, 60, 45),
        makeLeg('d', 16, 45, 70),
      ],
    });
    expect(spool.valid).toBe(true);
    const dirs = legDirections(spool.points);
    expect(dirs.length).toBeGreaterThan(2);
    const { worst } = sweep(dirs, spoolPlane(spool.points));
    expect(worst).toBeGreaterThanOrEqual(-1e-9);
  });

  test('a flat spool keeps both its plane and its legs clear', () => {
    const spool = flat([24, 18, 30, 12], [0, 90, 90, 45]);
    const plane = spoolPlane(spool.points);
    expect(plane).not.toBeNull();
    const { worst, biggestTurn } = sweep(legDirections(spool.points), plane);
    expect(worst).toBeGreaterThanOrEqual(-1e-9);
    // It is a nudge out of the way, never a jump to the other side of the spool.
    expect((biggestTurn * 180) / Math.PI).toBeLessThan(60);
  });

  test('a view with nothing edge on is left exactly alone', () => {
    const spool = solveSpool({
      ...BASE,
      legs: [makeLeg('a', 24, 0, 0), makeLeg('b', 18, 90, 0), makeLeg('c', 30, 45, 60)],
    });
    const dirs = legDirections(spool.points);
    const out = settleCamera(ISO_VIEW, spoolPlane(spool.points), dirs);
    expect(cameraMargin(ISO_VIEW, null, dirs)).toBeGreaterThan(0);
    expect(out).toEqual(ISO_VIEW);
  });

  test('the pitch is clamped whatever the drag asked for', () => {
    expect(settleCamera({ yaw: 0.3, pitch: -2 }, null, []).pitch).toBeCloseTo(MIN_PITCH, 12);
    expect(settleCamera({ yaw: 0.3, pitch: 9 }, null, []).pitch).toBeCloseTo(MAX_PITCH, 12);
  });

  // A spool with legs at every bearing cannot have all of them clear at once
  // in a single orthographic view. It must still answer, and answer with the
  // best of a bad set rather than whatever it was handed.
  test('when no yaw clears everything it settles on the least bad', () => {
    const dirs: Vec3[] = [];
    for (let a = 0; a < 360; a += 10) {
      const r = (a * Math.PI) / 180;
      dirs.push(unit({ x: Math.cos(r), y: Math.tan(ISO_PITCH), z: Math.sin(r) }));
    }
    for (let yaw = -Math.PI; yaw <= Math.PI; yaw += 0.2) {
      const out = settleCamera({ yaw, pitch: ISO_PITCH }, null, dirs);
      expect(Number.isFinite(out.yaw)).toBe(true);
      expect(cameraMargin(out, null, dirs)).toBeGreaterThanOrEqual(
        cameraMargin({ yaw, pitch: ISO_PITCH }, null, dirs) - 1e-9
      );
    }
  });

  test('the leg margin is the same fifteen degrees the pitch band holds', () => {
    expect(MIN_LEG_ANGLE).toBeCloseTo(MIN_PITCH, 12);
    expect(Math.sin(MIN_LEG_ANGLE)).toBeLessThan(Math.cos(MAX_PITCH) + 1e-12);
  });
});


describe('fitting the drawing to the canvas', () => {
  const spool = flat([36, 24, 30, 18], [0, 90, 90, 45]);
  const CAMS: Camera[] = [
    ISO_VIEW,
    ...ISO_CORNERS.map((c) => c.cam),
    { yaw: 0.9, pitch: MIN_PITCH },
    { yaw: -2.6, pitch: MAX_PITCH },
    { yaw: 2.0, pitch: 0.6 },
  ];

  test('turning the spool never resizes it', () => {
    const scales = CAMS.map((c) => fitSphere(spool.points, c, 340, 340, 18).scale);
    for (const s2 of scales) expect(s2).toBeCloseTo(scales[0]!, 12);
  });

  test('the drawing is centred on the canvas from every angle', () => {
    for (const cam of CAMS) {
      const f = fitSphere(spool.points, cam, 340, 340, 18);
      const pts = spool.points.map(f.map);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(170, 9);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(170, 9);
    }
  });

  test('nothing is drawn outside the padding', () => {
    for (const cam of CAMS) {
      const f = fitSphere(spool.points, cam, 340, 340, 18);
      for (const p of spool.points.map(f.map)) {
        expect(p.x).toBeGreaterThanOrEqual(18);
        expect(p.x).toBeLessThanOrEqual(322);
        expect(p.y).toBeGreaterThanOrEqual(18);
        expect(p.y).toBeLessThanOrEqual(322);
      }
    }
  });

  test('an empty spool still maps somewhere sane', () => {
    const f = fitSphere([], ISO_VIEW, 340, 340, 18);
    expect(f.map({ x: 0, y: 0, z: 0 })).toEqual({ x: 170, y: 170, depth: 0 });
  });
});

describe('breaking the line behind at a crossing', () => {
  const H = (y: number) => [{ x: 0, y }, { x: 10, y }];
  const V = (x: number) => [{ x, y: 0 }, { x, y: 10 }];

  test('a square crossing is found, at the crossing point', () => {
    const c = polylineCrossings(H(5), V(4));
    expect(c).toHaveLength(1);
    expect(c[0]!.x).toBeCloseTo(4, 12);
    expect(c[0]!.y).toBeCloseTo(5, 12);
    // Square on, the break only has to reach the other pipe's own width.
    expect(c[0]!.sin).toBeCloseTo(1, 12);
    // And it runs along the near piece.
    expect(c[0]!.ax).toBeCloseTo(1, 12);
    expect(c[0]!.ay).toBeCloseTo(0, 12);
  });

  test('the shallower the crossing the further the break must reach', () => {
    const shallow = polylineCrossings(H(5), [{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(shallow).toHaveLength(1);
    expect(shallow[0]!.sin).toBeCloseTo(Math.SQRT1_2, 12);
  });

  test('lines that miss, stop short, or run together do not cross', () => {
    expect(polylineCrossings(H(5), V(40))).toHaveLength(0);
    expect(polylineCrossings(H(5), [{ x: 4, y: 0 }, { x: 4, y: 2 }])).toHaveLength(0);
    expect(polylineCrossings(H(5), H(5))).toHaveLength(0);
    expect(polylineCrossings(H(5), [{ x: 3, y: 3 }])).toHaveLength(0);
  });

  test('a bent piece is crossed at every place it is crossed', () => {
    // A zig zag cut twice by one straight.
    const zig = [{ x: 0, y: 0 }, { x: 4, y: 8 }, { x: 8, y: 0 }];
    expect(polylineCrossings(H(4), zig)).toHaveLength(2);
  });
});


describe('rotation is a sweep, not a circle', () => {
  const deg = (r: number) => (r * 180) / Math.PI;
  const flatSpool = flat([36, 24, 30, 18], [0, 90, 90, 45]);
  const flatPlane = spoolPlane(flatSpool.points);
  const flatDirs = legDirections(flatSpool.points);

  // The whole point. Not "steered away from" and not "recovered from" — there
  // is no distance along the sweep that lands on a view where the spool is
  // edge on, so the drag cannot reach one.
  test('no distance along the sweep is ever an edge on view', () => {
    for (const pitch of [MIN_PITCH, 0.45, ISO_PITCH, 0.8, MAX_PITCH]) {
      const range = allowedYaw(pitch, flatPlane, flatDirs);
      for (let along = 0; along <= range.total; along += range.total / 2000) {
        const yaw = yawAt(range, along);
        expect(cameraMargin({ yaw, pitch }, flatPlane, flatDirs)).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  test('every leg keeps a third of its length, and the spool never flattens', () => {
    const range = allowedYaw(ISO_PITCH, flatPlane, flatDirs);
    const size = spread(flatSpool.points);
    let thinnestLeg = 1;
    let thinnestSpool = Infinity;
    for (let along = 0; along <= range.total; along += range.total / 720) {
      const cam: Camera = { yaw: yawAt(range, along), pitch: ISO_PITCH };
      for (const u of flatDirs) thinnestLeg = Math.min(thinnestLeg, projectedFraction(u, cam));
      thinnestSpool = Math.min(thinnestSpool, drawnWidth(flatSpool.points, cam) / size);
    }
    // Twenty degrees of clearance is the sine of twenty, a third of a leg.
    expect(thinnestLeg).toBeGreaterThan(Math.sin(MIN_LEG_ANGLE) - 1e-9);
    expect(thinnestLeg).toBeGreaterThan(0.34);
    // And the drawing keeps real width from every reachable angle.
    expect(thinnestSpool).toBeGreaterThan(0.2);
  });

  test('the sweep is the two hundred and sixty odd degrees the clearance leaves', () => {
    const at = (p: number) => deg(allowedYaw(p, flatPlane, flatDirs).total);
    expect(at(MIN_PITCH)).toBeGreaterThan(265);
    expect(at(ISO_PITCH)).toBeGreaterThan(255);
    expect(at(ISO_PITCH)).toBeLessThan(270);
    // Steeper costs more, because looking down at a vertical plane is already
    // close to looking along it. It still leaves most of a turn.
    expect(at(MAX_PITCH)).toBeGreaterThan(200);
    // Never the whole circle for a flat spool: the dead bands are real.
    for (const p of [MIN_PITCH, ISO_PITCH, MAX_PITCH]) expect(at(p)).toBeLessThan(359);
  });

  // A rolled spool has no plane to avoid, so it might look as though it should
  // keep the whole turn. It does not: each leg costs its own clearance, and a
  // spool with three bearings in it spends about as much that way as a flat one
  // spends on its plane. The sweep lands in the same place either way.
  test('a rolled spool pays in legs what a flat one pays in its plane', () => {
    const rolled = solveSpool({
      ...BASE,
      legs: [makeLeg('a', 24, 0, 0), makeLeg('b', 18, 45, 30), makeLeg('c', 30, 60, 45)],
    });
    expect(spoolPlane(rolled.points)).toBeNull();
    const range = allowedYaw(ISO_PITCH, null, legDirections(rolled.points));
    expect(deg(range.total)).toBeGreaterThan(255);
    expect(deg(range.total)).toBeLessThan(300);
  });

  test('a single straight length has nothing to lose and keeps the whole turn', () => {
    const straight = solveSpool({ ...BASE, legs: [makeLeg('a', 24, 0, 0)] });
    const range = allowedYaw(ISO_PITCH, spoolPlane(straight.points), legDirections(straight.points));
    expect(deg(range.total)).toBeCloseTo(360, 6);
  });

  test('walking the sweep turns the spool, and comes back where it started', () => {
    const range = allowedYaw(ISO_PITCH, flatPlane, flatDirs);
    expect(yawAt(range, 0)).toBeCloseTo(yawAt(range, range.total), 9);
    expect(yawAt(range, -range.total)).toBeCloseTo(yawAt(range, 0), 9);
    // Distance along maps back to itself.
    for (let along = 0; along < range.total; along += range.total / 37) {
      expect(sweepOf(range, yawAt(range, along))).toBeCloseTo(along, 9);
    }
  });

  test('a yaw inside a dead band snaps to the nearest wall of it', () => {
    const range = allowedYaw(ISO_PITCH, flatPlane, flatDirs);
    // Dead on the plane of the spool is the middle of a band.
    for (const bad of [0, Math.PI, -Math.PI]) {
      const snapped = snapYaw(range, bad);
      expect(cameraMargin({ yaw: snapped, pitch: ISO_PITCH }, flatPlane, flatDirs)).toBeGreaterThanOrEqual(-1e-9);
    }
    // A yaw already in the sweep is not moved.
    const inside = yawAt(range, range.total / 3);
    expect(snapYaw(range, inside)).toBeCloseTo(inside, 9);
  });

  test('a spool with nothing to avoid rotates freely', () => {
    const range = allowedYaw(ISO_PITCH, null, []);
    expect(range.total).toBeCloseTo(Math.PI * 2, 9);
    expect(range.arcs).toHaveLength(1);
  });

  test('a spool with legs at every bearing rotates freely rather than seizing', () => {
    const dirs: Vec3[] = [];
    for (let a = 0; a < 360; a += 5) {
      const r = (a * Math.PI) / 180;
      dirs.push(unit({ x: Math.cos(r), y: Math.tan(ISO_PITCH), z: Math.sin(r) }));
    }
    const range = allowedYaw(ISO_PITCH, null, dirs);
    expect(range.total).toBeCloseTo(Math.PI * 2, 9);
    expect(Number.isFinite(yawAt(range, 1.2))).toBe(true);
  });

  test('all four corners are inside the sweep of a plain spool', () => {
    const range = allowedYaw(ISO_PITCH, flatPlane, flatDirs);
    for (const c of ISO_CORNERS) {
      expect(snapYaw(range, c.cam.yaw)).toBeCloseTo(c.cam.yaw, 9);
    }
  });
});
