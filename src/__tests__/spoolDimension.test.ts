import { Box, LabelWant, Seg, labelBox, placeLabels, segmentHitsBox } from '../components/spool3d/dimension';

const W = 360;
const H = 360;

const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const want = (over: Partial<LabelWant> & { key: string; ax: number; ay: number }): LabelWant => ({
  ux: 1,
  uy: 0,
  collapsed: false,
  lines: ['24"'],
  weight: 1,
  tone: 'leg',
  ...over,
});

describe('a figure knows how much room it takes', () => {
  test('a box is centred on where it is put', () => {
    const b = labelBox(100, 50, ['36"']);
    expect(b.x + b.w / 2).toBeCloseTo(100, 12);
    expect(b.y + b.h / 2).toBeCloseTo(50, 12);
  });

  test('a longer figure is a wider box and a second line is a taller one', () => {
    expect(labelBox(0, 0, ['1']).w).toBeLessThan(labelBox(0, 0, ['1234567']).w);
    expect(labelBox(0, 0, ['1']).h).toBeLessThan(labelBox(0, 0, ['1', '2']).h);
  });
});

describe('a line through a box is found', () => {
  const b: Box = { x: 10, y: 10, w: 20, h: 20 };

  test('straight through it, and either end inside it', () => {
    expect(segmentHitsBox({ ax: 0, ay: 20, bx: 100, by: 20 }, b)).toBe(true);
    expect(segmentHitsBox({ ax: 15, ay: 15, bx: 100, by: 100 }, b)).toBe(true);
    expect(segmentHitsBox({ ax: 100, ay: 100, bx: 15, by: 15 }, b)).toBe(true);
  });

  test('clear of it, past it, and stopping short of it', () => {
    expect(segmentHitsBox({ ax: 0, ay: 50, bx: 100, by: 50 }, b)).toBe(false);
    expect(segmentHitsBox({ ax: 0, ay: 0, bx: 5, by: 0 }, b)).toBe(false);
    expect(segmentHitsBox({ ax: 40, ay: 0, bx: 40, by: 100 }, b)).toBe(false);
  });

  test('a corner clipped is still a hit', () => {
    expect(segmentHitsBox({ ax: 0, ay: 20, bx: 20, by: 0 }, b)).toBe(true);
  });

  test('a line of no length is a point, and is only a hit when it is inside', () => {
    expect(segmentHitsBox({ ax: 20, ay: 20, bx: 20, by: 20 }, b)).toBe(true);
    expect(segmentHitsBox({ ax: 90, ay: 90, bx: 90, by: 90 }, b)).toBe(false);
  });
});

describe('the figures go somewhere they can be read', () => {
  /** A leg drawn across the page, and the figure that belongs to it. */
  const leg = (i: number, y: number): { w: LabelWant; s: Seg } => ({
    w: want({ key: `leg${i}`, ax: 180, ay: y, lines: [`${24 + i}"`, 'N'], weight: 100 - i }),
    s: { ax: 80, ay: y, bx: 280, by: y },
  });

  test('no two figures land on top of each other, however crowded', () => {
    const rows = [0, 1, 2, 3, 4, 5].map((i) => leg(i, 60 + i * 12));
    const placed = placeLabels(rows.map((r) => r.w), rows.map((r) => r.s), W, H);
    expect(placed).toHaveLength(6);
    for (let i = 0; i < placed.length; i += 1)
      for (let j = i + 1; j < placed.length; j += 1) expect(overlap(placed[i]!.box, placed[j]!.box)).toBe(false);
  });

  test('no figure sits on the pipe', () => {
    const rows = [0, 1, 2].map((i) => leg(i, 100 + i * 40));
    const pipes = rows.map((r) => r.s);
    for (const p of placeLabels(rows.map((r) => r.w), pipes, W, H))
      for (const s of pipes) expect(segmentHitsBox(s, p.box)).toBe(false);
  });

  test('no figure goes off the page, even one anchored in the corner', () => {
    const corners = [
      want({ key: 'a', ax: 2, ay: 2, lines: ['144 5/8"', 'NE'] }),
      want({ key: 'b', ax: W - 2, ay: H - 2, lines: ['144 5/8"', 'SW'] }),
      want({ key: 'c', ax: 2, ay: H - 2, lines: ['144 5/8"', 'NW'] }),
    ];
    for (const p of placeLabels(corners, [], W, H)) {
      expect(p.box.x).toBeGreaterThanOrEqual(0);
      expect(p.box.y).toBeGreaterThanOrEqual(0);
      expect(p.box.x + p.box.w).toBeLessThanOrEqual(W);
      expect(p.box.y + p.box.h).toBeLessThanOrEqual(H);
    }
  });

  test('every figure asked for is placed — a dimension is never dropped', () => {
    // Twelve figures all wanting the same square inch. Some of them will end
    // up somewhere awkward. None of them may go missing, because a dimension
    // that is not on the drawing is the one nobody notices is not there.
    const heap = Array.from({ length: 12 }, (_, i) => want({ key: `k${i}`, ax: 180, ay: 180, lines: [`${i}"`] }));
    const placed = placeLabels(heap, [{ ax: 0, ay: 180, bx: 360, by: 180 }], W, H);
    expect(placed.map((p) => p.key).sort()).toEqual(heap.map((h) => h.key).sort());
  });

  test('the figures come back in the order they were handed over', () => {
    const heap = [0, 1, 2, 3].map((i) => want({ key: `k${i}`, ax: 60 + i * 60, ay: 180, weight: i }));
    expect(placeLabels(heap, [], W, H).map((p) => p.key)).toEqual(['k0', 'k1', 'k2', 'k3']);
  });

  test('the long legs get the plain places, because they are what gets cut', () => {
    const long = want({ key: 'long', ax: 180, ay: 180, weight: 999, lines: ['96"'] });
    const short = want({ key: 'short', ax: 180, ay: 180, weight: 1, lines: ['4"'] });
    const placed = placeLabels([short, long], [], W, H);
    const at = (k: string) => placed.find((p) => p.key === k)!;
    const reach = (k: string) => Math.hypot(at(k).x - 180, at(k).y - 180);
    expect(reach('long')).toBeLessThanOrEqual(reach('short'));
  });

  test('a figure pushed well clear takes a leader back to what it belongs to', () => {
    const heap = Array.from({ length: 8 }, (_, i) => want({ key: `k${i}`, ax: 180, ay: 180, lines: [`${i}"`] }));
    const placed = placeLabels(heap, [], W, H);
    expect(placed.some((p) => p.leader)).toBe(true);
    // And one that found a place right beside its leg does not.
    expect(placeLabels([want({ key: 'solo', ax: 180, ay: 180 })], [], W, H)[0]!.leader).toBe(false);
  });

  test('a leg square on to the viewer takes the diagonals, having no side to take', () => {
    const flat = want({ key: 'riser', ax: 180, ay: 180, collapsed: true, lines: ['24"', 'UP'] });
    const p = placeLabels([flat], [], W, H)[0]!;
    // Off the point, and off it in both directions at once.
    expect(Math.abs(p.x - 180)).toBeGreaterThan(4);
    expect(Math.abs(p.y - 180)).toBeGreaterThan(4);
  });

  test('a figure beside a level leg goes above or below it, never along it', () => {
    const p = placeLabels([want({ key: 'a', ax: 180, ay: 180, ux: 1, uy: 0 })], [], W, H)[0]!;
    expect(Math.abs(p.x - 180)).toBeLessThan(1e-9);
    expect(Math.abs(p.y - 180)).toBeGreaterThan(10);
  });

  test('nothing to place is nothing placed', () => {
    expect(placeLabels([], [], W, H)).toEqual([]);
  });
});

describe('ground that is spoken for', () => {
  test('nothing is placed on a reserved corner, such as the compass', () => {
    const gizmo: Box = { x: 276, y: 276, w: 80, h: 80 };
    const heap = Array.from({ length: 6 }, (_, i) =>
      want({ key: `k${i}`, ax: 316, ay: 316, lines: [`${i}"`, 'UP'], collapsed: true })
    );
    for (const p of placeLabels(heap, [], W, H, 2, [gizmo])) expect(overlap(p.box, gizmo)).toBe(false);
  });
});
