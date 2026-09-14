import {
  Camera,
  ISO_VIEW,
  MAX_PITCH,
  MIN_PITCH,
  MIN_PLANE_ANGLE,
  avoidEdgeOn,
  clampPitch,
  projectedFraction,
  project,
  spoolPlane,
  viewAxis,
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
    expect(MIN_PITCH).toBeCloseTo((15 * Math.PI) / 180, 12);
    expect(MAX_PITCH).toBeLessThan(Math.PI / 2);
    // The band is symmetric, so the floor is the same at both ends of it.
    expect(Math.sin(MIN_PITCH)).toBeCloseTo(Math.cos(MAX_PITCH), 12);
    expect(ISO_VIEW.pitch).toBeGreaterThanOrEqual(MIN_PITCH);
    expect(ISO_VIEW.pitch).toBeLessThanOrEqual(MAX_PITCH);
    // The view starts in the fifteen to thirty degree band.
    expect((ISO_VIEW.pitch * 180) / Math.PI).toBeGreaterThanOrEqual(15);
    expect((ISO_VIEW.pitch * 180) / Math.PI).toBeLessThanOrEqual(30);
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
    expect(worst).toBeGreaterThan(0.25);
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
