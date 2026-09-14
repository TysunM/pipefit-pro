import { Vec3, add, cross, dot, elbowCenterline, len, rotateAbout, scale, sub, unit } from '../calc/spool';
import { bendRadius, centerlineArc, takeoff } from '../calc/pipe';

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

const CORNER = V(0, 0, 0);
const IN = V(0, 0, 1);
/** The outgoing leg of a turn of this many degrees, swung about the east axis. */
const turned = (angleDeg: number): Vec3 => rotateAbout(IN, V(1, 0, 0), (angleDeg * Math.PI) / 180);

const CASES: [number, 'LR' | 'SR', number][] = [
  [2, 'LR', 90],
  [2, 'SR', 90],
  [6, 'LR', 45],
  [12, 'LR', 22.5],
  [4, 'LR', 120],
  [1, 'LR', 11.25],
];

// A corner is not what gets installed. These check that the arc drawn in its
// place is the fitting the takeoff tables describe, not a decoration.
describe('the centreline of an elbow', () => {
  test('it starts and ends exactly where the legs stop', () => {
    for (const [nps, kind, angle] of CASES) {
      const t = takeoff(nps, kind, angle);
      const arc = elbowCenterline(CORNER, IN, turned(angle), t);
      near(len(sub(arc[0]!, scale(IN, -t))), 0);
      near(len(sub(arc[arc.length - 1]!, scale(turned(angle), t))), 0);
    }
  });

  test('every point on it is one bend radius from the centre of the bend', () => {
    for (const [nps, kind, angle] of CASES) {
      const t = takeoff(nps, kind, angle);
      const r = bendRadius(nps, kind);
      const arc = elbowCenterline(CORNER, IN, turned(angle), t, 24);
      // The centre is on the bisector, radius over cos of the half angle out.
      const half = (angle * Math.PI) / 360;
      const centre = scale(unit(sub(turned(angle), IN)), r / Math.cos(half));
      for (const p of arc) near(len(sub(p, centre)), r, 1e-9);
    }
  });

  test('its length is the centreline arc the tables give', () => {
    for (const [nps, kind, angle] of CASES) {
      const arc = elbowCenterline(CORNER, IN, turned(angle), takeoff(nps, kind, angle), 400);
      let walked = 0;
      for (let i = 1; i < arc.length; i += 1) walked += len(sub(arc[i]!, arc[i - 1]!));
      // Sampled as straight hops it falls just short of the true arc, never over.
      const exact = centerlineArc(nps, kind, angle);
      expect(walked).toBeLessThanOrEqual(exact + 1e-9);
      expect(walked).toBeGreaterThan(exact - 1e-4);
    }
  });

  test('it leaves and arrives along the legs, so the pipe does not kink', () => {
    for (const [nps, kind, angle] of CASES) {
      const arc = elbowCenterline(CORNER, IN, turned(angle), takeoff(nps, kind, angle), 2000);
      const start = unit(sub(arc[1]!, arc[0]!));
      const end = unit(sub(arc[arc.length - 1]!, arc[arc.length - 2]!));
      expect(dot(start, IN)).toBeGreaterThan(1 - 1e-6);
      expect(dot(end, unit(turned(angle)))).toBeGreaterThan(1 - 1e-6);
    }
  });

  test('it stays in the plane of the two legs', () => {
    const a = unit(V(1, 0, 2));
    const b = unit(V(0, 1, 1));
    const n = unit(cross(a, b));
    const corner = V(3, -1, 2);
    for (const p of elbowCenterline(corner, a, b, 2.5, 16)) {
      near(dot(sub(p, corner), n), 0, 1e-9);
    }
  });

  test('it bulges away from the corner, never through it', () => {
    const angle = 90;
    const t = takeoff(2, 'LR', angle);
    const arc = elbowCenterline(CORNER, IN, turned(angle), t, 32);
    const bisector = unit(sub(turned(angle), IN));
    // Every point is further along the bisector than the corner is.
    for (const p of arc) expect(dot(p, bisector)).toBeGreaterThan(-1e-9);
    // And the middle of the arc is the throat side, short of the corner itself.
    const mid = arc[arc.length >> 1]!;
    expect(len(sub(mid, CORNER))).toBeLessThan(t);
  });

  test('a leg that does not turn is a straight hop, not an arc', () => {
    expect(elbowCenterline(CORNER, IN, IN, 3)).toHaveLength(2);
    expect(elbowCenterline(CORNER, IN, turned(90), 0)).toHaveLength(2);
    // Half a circle leaves no plane to swing in and is refused the same way.
    expect(elbowCenterline(CORNER, IN, scale(IN, -1), 3)).toHaveLength(2);
  });

  test('the arc a spool solver would draw matches the takeoff it reported', () => {
    // Ties the drawing back to the number on the screen: the leg stops exactly
    // one reported takeoff short of the corner.
    const angle = 45;
    const t = takeoff(3, 'LR', angle);
    const arc = elbowCenterline(add(CORNER, V(0, 0, 40)), IN, turned(angle), t, 8);
    near(len(sub(arc[0]!, V(0, 0, 40 - t))), 0);
  });
});
