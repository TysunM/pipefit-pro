import { ISO_GRID, Pt, distance, lattice, nearestLattice, nearestNode, snapSegment, thinStroke } from '../calc/iso';

const g = ISO_GRID;
const close = (p: Pt, q: Pt) => expect(distance(p, q)).toBeLessThan(1e-6);

describe('the lattice', () => {
  test('the three axes land on dots one step apart', () => {
    close(lattice(1, 0, g), [Math.cos(Math.PI / 6) * g, -0.5 * g]); // E
    close(lattice(0, 1, g), [-Math.cos(Math.PI / 6) * g, -0.5 * g]); // N
    close(lattice(1, 1, g), [0, -g]); // up is E + N
  });

  test('every point snaps to the dot it is nearest to', () => {
    for (let a = -3; a <= 3; a++)
      for (let b = -3; b <= 3; b++) {
        const p = lattice(a, b, g);
        const nudged: Pt = [p[0] + 3, p[1] - 4];
        close(nearestLattice(nudged, g), p);
      }
  });
});

describe('snapping a run', () => {
  const o: Pt = [0, 0];

  test('a wobbly drag to the right lands on the E axis', () => {
    const s = snapSegment(o, [3 * Math.cos(Math.PI / 6) * g + 4, -1.5 * g + 6], g);
    expect(s.axis).toBe('iso');
    expect(s.steps).toBe(3);
    close(s.end, lattice(3, 0, g));
  });

  test('straight up is up, and lands on a dot', () => {
    const s = snapSegment(o, [2, -2 * g - 3], g);
    expect(s.axis).toBe('iso');
    expect(s.steps).toBe(2);
    close(s.end, lattice(2, 2, g));
  });

  test('a horizontal drag is a rolling-offset diagonal, still on the dots', () => {
    const s = snapSegment(o, [2 * Math.sqrt(3) * g + 5, 1], g);
    expect(s.axis).toBe('diagonal');
    expect(s.steps).toBe(2);
    close(s.end, lattice(2, -2, g));
  });

  test('a sixty-degree drag is the other diagonal', () => {
    const s = snapSegment(o, [0.5 * Math.sqrt(3) * g, -0.866 * Math.sqrt(3) * g], g);
    expect(s.axis).toBe('diagonal');
    expect(s.steps).toBe(1);
    close(s.end, lattice(2, 1, g));
  });

  test('too short a drag is no segment at all', () => {
    const s = snapSegment(o, [4, -3], g);
    expect(s.steps).toBe(0);
    close(s.end, o);
  });

  test('the end is always a lattice point, whatever the drag', () => {
    for (let k = 0; k < 360; k += 7) {
      const r = (k * Math.PI) / 180;
      const s = snapSegment(o, [Math.cos(r) * 97, Math.sin(r) * 97], g);
      if (s.steps > 0) close(s.end, nearestLattice(s.end, g));
    }
  });
});

describe('picking up a run', () => {
  test('the nearest node within reach wins, and nothing further does', () => {
    const nodes: Pt[] = [[0, 0], [40, 0], [100, 0]];
    expect(nearestNode([44, 3], nodes, 26)).toEqual([40, 0]);
    expect(nearestNode([70, 0], nodes, 26)).toBeNull();
  });
});

describe('a pen stroke', () => {
  test('dwelling drops the duplicate points but keeps the shape', () => {
    const pts: Pt[] = [[0, 0], [0.3, 0.2], [0.6, 0.1], [10, 10], [10.4, 10.2], [20, 0]];
    expect(thinStroke(pts)).toEqual([[0, 0], [10, 10], [20, 0]]);
  });
  test('a tap that barely moved still has two ends', () => {
    expect(thinStroke([[0, 0], [0.5, 0.5]])).toEqual([[0, 0], [0.5, 0.5]]);
  });
});
