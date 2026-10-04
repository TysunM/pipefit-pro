import { M_TO_IN, leg, offsetFrom, project, trace, type V3 } from '../calc/spatial';

const IN = 1 / M_TO_IN; // one inch, in metres
const at = (x: number, y: number, z: number): V3 => [x * IN, y * IN, z * IN];
const close = (a: number, b: number, d = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('a leg', () => {
  test('a level run is all run, no rise', () => {
    const l = leg(at(0, 0, 0), at(30, 0, 40));
    close(l.length, 50);
    close(l.run, 50);
    close(l.rise, 0);
    close(l.slope, 0);
    close(l.fallPerFt!, 0);
  });

  test('a falling line reads its slope and fall per foot', () => {
    const l = leg(at(0, 0, 0), at(0, -3, -144));
    close(l.run, 144);
    close(l.rise, -3);
    close(l.fallPerFt!, 0.25);
    expect(l.slope).toBeLessThan(0);
  });

  test('a plumb leg has no fall per foot', () => {
    const l = leg(at(0, 0, 0), at(0, 96, 0));
    close(l.slope, 90);
    expect(l.fallPerFt).toBeNull();
  });
});

describe('an offset against the run before it', () => {
  // The run goes away from the phone: −z.
  const runFrom = at(0, 0, 0);
  const runTo = at(0, 0, -100);

  test('splits into advance, roll and rise', () => {
    const o = offsetFrom(runFrom, runTo, runTo, at(12, 9, -124))!;
    close(o.advance, 24);
    close(o.roll, 12); // to the right of the run
    close(o.rise, 9);
    close(o.trueOffset, 15);
  });

  test('to the left is a negative roll', () => {
    close(offsetFrom(runFrom, runTo, runTo, at(-6, 0, -100))!.roll, -6);
  });

  test('a plumb run gives no direction to measure against', () => {
    expect(offsetFrom(at(0, 0, 0), at(0, 50, 0), at(0, 50, 0), at(10, 60, 0))).toBeNull();
  });
});

describe('a traced route', () => {
  test('every leg, an offset for each after the first, and the total', () => {
    const t = trace([at(0, 0, 0), at(0, 0, -100), at(12, 9, -124), at(12, 9, -224)]);
    expect(t.legs).toHaveLength(3);
    expect(t.offsets).toHaveLength(2);
    close(t.offsets[0]!.trueOffset, 15);
    close(t.total, 100 + Math.hypot(12, 9, 24) + 100);
  });

  test('one point measures nothing', () => {
    expect(trace([at(1, 2, 3)])).toEqual({ legs: [], offsets: [], total: 0 });
  });
});

describe('from the world to the screen', () => {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  // A plain perspective: 90° field of view, near 0.1, far 100, column-major.
  const n = 0.1;
  const f = 100;
  const persp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, (-2 * f * n) / (f - n), 0];

  test('straight ahead is the middle of the screen', () => {
    const p = project([0, 0, -2], persp, identity, 400, 800)!;
    close(p[0], 200, 1e-6);
    close(p[1], 400, 1e-6);
  });

  test('up and right land up and right', () => {
    const p = project([1, 1, -2], persp, identity, 400, 800)!;
    expect(p[0]).toBeGreaterThan(200);
    expect(p[1]).toBeLessThan(400);
  });

  test('behind the camera is nowhere', () => {
    expect(project([0, 0, 2], persp, identity, 400, 800)).toBeNull();
  });
});
