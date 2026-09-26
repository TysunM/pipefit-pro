import {
  clip,
  CORNERS,
  ISO_GRID,
  L3,
  Pt,
  bounds,
  contained,
  distance,
  fitViewport,
  lattice,
  nearestLattice,
  nearestOf,
  screenToLattice,
  snapRun,
  thinStroke,
  toPage,
  toScreen,
  toView,
  turn,
  zoomAbout,
} from '../calc/iso';

const g = ISO_GRID;
const close = (p: Pt, q: Pt) => expect(distance(p, q)).toBeLessThan(1e-6);
const o: L3 = [0, 0, 0];

describe('the lattice', () => {
  test('from the south west, east runs up-right, north up-left and up is up', () => {
    close(toScreen([1, 0, 0], 'SW', g), [Math.cos(Math.PI / 6) * g, -0.5 * g]);
    close(toScreen([0, 1, 0], 'SW', g), [-Math.cos(Math.PI / 6) * g, -0.5 * g]);
    close(toScreen([0, 0, 1], 'SW', g), [0, -g]);
  });

  test('every point snaps to the dot it is nearest to', () => {
    for (let a = -3; a <= 3; a++)
      for (let b = -3; b <= 3; b++) {
        const p = lattice(a, b, g);
        close(nearestLattice([p[0] + 3, p[1] - 4], g), p);
      }
  });

  test('a page point becomes a ground-level world point that projects back to it', () => {
    for (const c of CORNERS)
      for (const p of [lattice(2, 1, g), lattice(-3, 4, g), lattice(0, 0, g)]) {
        const w = screenToLattice(p, c, g);
        expect(w[2]).toBe(0);
        close(toScreen(w, c, g), p);
      }
  });
});

describe('snapping a run', () => {
  test('a wobbly drag to the right is three dots east', () => {
    const s = snapRun(o, [3 * Math.cos(Math.PI / 6) * g + 4, -1.5 * g + 6], 'SW', g);
    expect(s).toEqual({ to: [3, 0, 0], steps: 3, axis: 'iso' });
  });

  test('straight up is up', () => {
    expect(snapRun(o, [2, -2 * g - 3], 'SW', g)).toEqual({ to: [0, 0, 2], steps: 2, axis: 'iso' });
  });

  test('a horizontal drag is a rolling-offset diagonal, east and south together', () => {
    expect(snapRun(o, [2 * Math.sqrt(3) * g + 5, 1], 'SW', g)).toEqual({ to: [2, -2, 0], steps: 2, axis: 'diagonal' });
  });

  test('a sixty-degree drag climbs east and up together', () => {
    expect(snapRun(o, [0.5 * Math.sqrt(3) * g, -0.866 * Math.sqrt(3) * g], 'SW', g)).toEqual({ to: [1, 0, 1], steps: 1, axis: 'diagonal' });
  });

  test('too short a drag is no segment at all', () => {
    expect(snapRun(o, [4, -3], 'SW', g).steps).toBe(0);
  });

  test('from a lifted start the run stays lifted', () => {
    const s = snapRun([1, 1, 3], [toScreen([1, 1, 3], 'SW', g)[0] + 2 * Math.cos(Math.PI / 6) * g, toScreen([1, 1, 3], 'SW', g)[1] - g], 'SW', g);
    expect(s.to).toEqual([3, 1, 3]);
  });

  test('the same drag on the page means a different world direction from another corner', () => {
    const drag: Pt = [3 * Math.cos(Math.PI / 6) * g, -1.5 * g];
    expect(snapRun(o, drag, 'SW', g).to).toEqual([3, 0, 0]);
    expect(snapRun(o, drag, 'SE', g).to).toEqual([0, 3, 0]);
    expect(snapRun(o, drag, 'NE', g).to).toEqual([-3, 0, 0]);
    expect(snapRun(o, drag, 'NW', g).to).toEqual([0, -3, 0]);
  });

  test('whatever the drag and the corner, the end projects back onto a dot', () => {
    for (const c of CORNERS)
      for (let k = 0; k < 360; k += 7) {
        const r = (k * Math.PI) / 180;
        const s = snapRun(o, [Math.cos(r) * 97, Math.sin(r) * 97], c, g);
        if (s.steps > 0) close(toScreen(s.to, c, g), nearestLattice(toScreen(s.to, c, g), g));
      }
  });
});

describe('turning the page', () => {
  test('four quarter turns come back round', () => {
    let c = CORNERS[0]!;
    for (let i = 0; i < 4; i++) c = turn(c, 1);
    expect(c).toBe('SW');
    expect(turn('SW', -1)).toBe('NW');
  });

  test('an east leg turns with the page and up never moves', () => {
    const e = toScreen([4, 0, 0], 'SW', g);
    const eTurned = toScreen([4, 0, 0], 'NE', g);
    close(eTurned, [-e[0], -e[1]]);
    for (const c of CORNERS) close(toScreen([0, 0, 5], c, g), [0, -5 * g]);
  });
});

describe('picking up a run', () => {
  test('the nearest node within reach wins, and nothing further does', () => {
    const nodes: Pt[] = [[0, 0], [40, 0], [100, 0]];
    expect(nearestOf([44, 3], nodes, (p) => p, 26)).toEqual([40, 0]);
    expect(nearestOf([70, 0], nodes, (p) => p, 26)).toBeNull();
  });
});

describe('a pen stroke', () => {
  test('dwelling drops the duplicate points but keeps the shape', () => {
    const pts: Pt[] = [[0, 0], [0.3, 0.2], [0.6, 0.1], [10, 10], [10.4, 10.2], [20, 0]];
    expect(thinStroke(pts)).toEqual([[0, 0], [10, 10], [20, 0]]);
  });
});

describe('the window', () => {
  test('page and screen are inverses', () => {
    const v = { scale: 0.5, tx: 30, ty: -12 };
    close(toPage(toView([17, -9], v), v), [17, -9]);
  });

  test('fitting puts the drawing centred inside the margin and never larger than life', () => {
    const b = bounds([[0, 0], [400, 100]])!;
    const v = fitViewport(b, 300, 500, 20, 1);
    expect(v.scale).toBeCloseTo(260 / 400);
    expect(contained(b, v, 300, 500, 19)).toBe(true);
    const small = fitViewport(bounds([[0, 0], [50, 50]])!, 300, 500, 20, 1);
    expect(small.scale).toBe(1);
  });

  test('zooming about a point keeps that point still', () => {
    const v = { scale: 1, tx: 10, ty: 10 };
    const about: Pt = [100, 200];
    const before = toPage(about, v);
    const z = zoomAbout(v, 2, about);
    close(toPage(about, z), before);
    expect(z.scale).toBe(2);
  });
});


describe('cutting a grid line to the sheet', () => {
  const r = { x0: 0, y0: 0, x1: 10, y1: 10 };
  test('a line across the sheet is cut at both edges', () => {
    expect(clip(-5, 5, 15, 5, r)).toEqual([0, 5, 10, 5]);
  });
  test('a line inside is left as it is', () => {
    expect(clip(2, 2, 8, 8, r)).toEqual([2, 2, 8, 8]);
  });
  test('a line that misses is dropped', () => {
    expect(clip(-5, -5, -1, 20, r)).toBeNull();
    expect(clip(0, 12, 10, 14, r)).toBeNull();
  });
  test('a diagonal is cut where it crosses', () => {
    const s = clip(-10, 0, 20, 30, r);
    expect(s).not.toBeNull();
    expect(s![0]).toBeCloseTo(0);
    expect(s![1]).toBeCloseTo(10);
    expect(s![2]).toBeCloseTo(0);
    expect(s![3]).toBeCloseTo(10);
  });
});
