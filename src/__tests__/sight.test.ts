import {
  EARTH_FIELD,
  Hold,
  Orientation,
  angleBetween,
  checkField,
  deviceToWorld,
  sightDir,
  sightVector,
  steadyDir,
} from '../calc/sight';
import { turnDeg } from '../calc/direction';
import { len } from '../calc/spool';

const rad = (d: number) => (d * Math.PI) / 180;
const o = (alpha: number, beta: number, gamma: number): Orientation => ({
  alpha: rad(alpha),
  beta: rad(beta),
  gamma: rad(gamma),
});

describe('the rotation the sensors describe', () => {
  it('is the identity for a phone flat on a bench with its top to the north', () => {
    const R = deviceToWorld(o(0, 0, 0));
    expect(R[0]![0]).toBeCloseTo(1, 12);
    expect(R[0]![1]).toBeCloseTo(0, 12);
    expect(R[0]![2]).toBeCloseTo(0, 12);
    expect(R[1]![0]).toBeCloseTo(0, 12);
    expect(R[1]![1]).toBeCloseTo(1, 12);
    expect(R[2]![2]).toBeCloseTo(1, 12);
  });

  it('stays a rotation at every attitude: unit rows, square to each other', () => {
    for (const a of [0, 37, 180, 300]) {
      for (const b of [-80, -20, 0, 45, 90]) {
        for (const g of [-89, -30, 0, 30, 89]) {
          const R = deviceToWorld(o(a, b, g));
          for (const row of R) expect(Math.hypot(row[0]!, row[1]!, row[2]!)).toBeCloseTo(1, 10);
          const dot = (i: number, j: number) =>
            R[i]![0]! * R[j]![0]! + R[i]![1]! * R[j]![1]! + R[i]![2]! * R[j]![2]!;
          expect(dot(0, 1)).toBeCloseTo(0, 10);
          expect(dot(0, 2)).toBeCloseTo(0, 10);
          expect(dot(1, 2)).toBeCloseTo(0, 10);
        }
      }
    }
  });
});

describe('laying the phone along the pipe', () => {
  const edge: Hold = 'edge';

  it('reads a level run to the north when the top edge points north', () => {
    const d = sightDir(o(0, 0, 0), edge);
    expect(turnDeg(d.bearing)).toBeCloseTo(0, 6);
    expect(d.slope).toBeCloseTo(0, 6);
  });

  it('follows the compass round: east, south and west each read as themselves', () => {
    // Alpha counts anticlockwise from north, the way the sensors report it, so
    // east is at 270 rather than 90.
    expect(turnDeg(sightDir(o(270, 0, 0), edge).bearing)).toBeCloseTo(90, 5);
    expect(turnDeg(sightDir(o(180, 0, 0), edge).bearing)).toBeCloseTo(180, 5);
    expect(turnDeg(sightDir(o(90, 0, 0), edge).bearing)).toBeCloseTo(270, 5);
  });

  it('reads a riser as straight up when the phone stands on end', () => {
    expect(sightDir(o(0, 90, 0), edge).slope).toBeCloseTo(90, 5);
  });

  it('reads a drop as straight down when it stands on its head', () => {
    expect(sightDir(o(0, -90, 0), edge).slope).toBeCloseTo(-90, 5);
  });

  it('reads the two stock elbow slopes as the angles they are', () => {
    expect(sightDir(o(0, 45, 0), edge).slope).toBeCloseTo(45, 5);
    expect(sightDir(o(0, -45, 0), edge).slope).toBeCloseTo(-45, 5);
    expect(sightDir(o(0, 30, 0), edge).slope).toBeCloseTo(30, 5);
  });

  it('keeps the slope when the phone is rolled about the pipe it lies on', () => {
    // Rolling the phone around the run does not move the run. A fitter will
    // not lay a phone perfectly square on a round pipe, so this has to hold.
    for (const g of [-40, -10, 0, 25, 60]) {
      expect(sightDir(o(0, 35, g), edge).slope).toBeCloseTo(35, 4);
    }
  });

  it('returns a unit direction, whatever the attitude', () => {
    for (const a of [0, 120, 250]) {
      for (const b of [-60, 0, 75]) {
        expect(len(sightVector(o(a, b, 20), edge))).toBeCloseTo(1, 10);
      }
    }
  });
});

describe('sighting down the back camera', () => {
  const sight: Hold = 'sight';

  it('reads level and north when the phone is held up facing north', () => {
    // Upright, screen to the viewer, so the camera looks away from them.
    const d = sightDir(o(0, 90, 0), sight);
    expect(turnDeg(d.bearing)).toBeCloseTo(0, 5);
    expect(d.slope).toBeCloseTo(0, 5);
  });

  it('reads straight down when the phone lies flat, screen up', () => {
    // The camera is against the bench, looking at the floor.
    expect(sightDir(o(0, 0, 0), sight).slope).toBeCloseTo(-90, 5);
  });

  it('reads straight up when the phone lies screen down', () => {
    expect(sightDir(o(0, 180, 0), sight).slope).toBeCloseTo(90, 5);
  });

  it('is square to the edge hold at every attitude, because the axes are', () => {
    for (const a of [0, 95, 210]) {
      for (const b of [-45, 10, 80]) {
        const e = sightVector(o(a, b, 15), 'edge');
        const s = sightVector(o(a, b, 15), 'sight');
        expect(angleBetween(e, s)).toBeCloseTo(90, 6);
      }
    }
  });
});

describe('a burst of readings rather than one', () => {
  const burst = (n: number, jitter: number) =>
    Array.from({ length: n }, (_, i) => ({
      o: o(0, 30 + Math.sin(i) * jitter, Math.cos(i) * jitter),
      hold: 'edge' as Hold,
    }));

  it('averages to the direction the hand was aiming at', () => {
    const s = steadyDir(burst(20, 1.5))!;
    expect(s.dir.slope).toBeCloseTo(30, 0);
    expect(s.samples).toBe(20);
  });

  it('reports a steady hand as a small spread and a shaking one as a big one', () => {
    expect(steadyDir(burst(20, 0.5))!.spreadDeg).toBeLessThan(1);
    expect(steadyDir(burst(20, 12))!.spreadDeg).toBeGreaterThan(5);
  });

  it('averages as vectors, so a wobble either side of north does not come out south', () => {
    // 359 and 1 average to 0, not to 180, which is what averaging the angles
    // themselves would give.
    const s = steadyDir([
      { o: o(1, 0, 0), hold: 'edge' },
      { o: o(359, 0, 0), hold: 'edge' },
    ])!;
    const b = turnDeg(s.dir.bearing);
    expect(Math.min(b, 360 - b)).toBeLessThan(0.5);
  });

  it('gives nothing for no readings rather than a made up direction', () => {
    expect(steadyDir([])).toBeNull();
  });

  it('gives nothing when the readings cancel out instead of returning noise', () => {
    expect(
      steadyDir([
        { o: o(0, 90, 0), hold: 'edge' },
        { o: o(0, -90, 0), hold: 'edge' },
      ]),
    ).toBeNull();
  });
});

describe('whether the compass is reading the earth or the rack', () => {
  const field = (t: number) => ({ x: t, y: 0, z: 0 });

  it('accepts a strength inside the earth’s range', () => {
    for (const t of [EARTH_FIELD.min + 1, 48, EARTH_FIELD.max - 1]) {
      expect(checkField(field(t)).disturbed).toBe(false);
    }
  });

  it('calls out a field too strong to be the earth, which is steel', () => {
    const c = checkField(field(180));
    expect(c.disturbed).toBe(true);
    expect(c.note).toMatch(/steel/i);
    expect(c.strength).toBeCloseTo(180, 9);
  });

  it('calls out a field too weak to be the earth, which is shielding', () => {
    expect(checkField(field(4)).disturbed).toBe(true);
  });

  it('never promises a clean field means a right bearing, because it does not', () => {
    // Steel can pull the direction without changing the strength, so the
    // clean note has to say so rather than giving an all clear.
    expect(checkField(field(48)).note).toMatch(/can still/i);
  });

  it('measures strength off all three axes, not one', () => {
    expect(checkField({ x: 30, y: 40, z: 0 }).strength).toBeCloseTo(50, 9);
  });
});
