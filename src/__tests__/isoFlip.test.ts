import { Flip, ISO_GRID, NO_FLIP, Pt, flipPt, lattice, nearestCounts, snapRun, toPage, toScreen, toView, turnOver } from '../calc/iso';
import { Stroke, emptyBook, flipPlaced, flipWords, newSketch, parseBook, place, saveSketch, serialiseBook, sketchBounds, sketchToSvg, validFlip, withFlip } from '../state/sketchStore';

// Turning the sheet over
// ----------------------
// The complaint this answers: the arrows turned a man's sketch into a
// different drawing. Flipping is the paper turned over, so the picture must
// keep its shape line for line, two turns must give back exactly what was
// drawn, and a line drawn on a turned sheet must land where the finger went.

const g = ISO_GRID;
const FLIPS: Flip[] = [
  { mirror: false, upside: false },
  { mirror: true, upside: false },
  { mirror: false, upside: true },
  { mirror: true, upside: true },
];

/** A sketch like the one in the report: runs, a rolling offset, a pen mark and a note. */
const strokes: Stroke[] = [
  { kind: 'run', from: [0, 0, 0], to: [4, 0, 0] },
  { kind: 'run', from: [4, 0, 0], to: [4, 0, 3] },
  { kind: 'run', from: [4, 0, 3], to: [6, 0, 5] },
  { kind: 'run', from: [6, 0, 5], to: [6, 3, 5] },
  { kind: 'pen', pts: [[5, 5], [9, 9]], anchor: [4, 0, 0] },
  { kind: 'note', at: [10, -10], text: '4\'-6"', anchor: [4, 0, 3] },
];

const pts = (f: Flip) =>
  strokes.map((s) => {
    const p = place(s, 'SW', g, f);
    return p.kind === 'note' ? [p.at] : p.pts;
  });

describe('a flip is the same picture turned over', () => {
  test('every point is the reflection of where it was drawn, nothing re-worked', () => {
    const drawn = pts(NO_FLIP);
    for (const f of FLIPS) {
      const turned = pts(f);
      drawn.forEach((set, i) => set.forEach((q, j) => expect(turned[i]![j]).toEqual(flipPt(q, f))));
    }
  });

  test('lengths and angles between lines are kept: it is the same shape', () => {
    const d = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const runs = (f: Flip): [Pt, Pt][] =>
      strokes.flatMap((s) => {
        const p = place(s, 'SW', g, f);
        return p.kind === 'run' ? [p.pts] : [];
      });
    const base = runs(NO_FLIP);
    for (const f of FLIPS) {
      const r = runs(f);
      r.forEach((seg, i) => expect(d(seg[0], seg[1])).toBeCloseTo(d(base[i]![0], base[i]![1]), 9));
    }
  });

  test('turning over twice gives back exactly what was drawn', () => {
    for (const f of FLIPS) for (const set of pts(NO_FLIP)) for (const q of set) expect(flipPt(flipPt(q, f), f)).toEqual(q);
  });

  test('a dot on the paper is still a dot when the sheet is turned', () => {
    for (let a = -4; a <= 4; a++)
      for (let b = -4; b <= 4; b++)
        for (const f of FLIPS) {
          const p = flipPt(lattice(a, b, g), f);
          const [na, nb] = nearestCounts(p, g);
          const back = lattice(na, nb, g);
          expect(back[0]).toBeCloseTo(p[0], 9);
          expect(back[1]).toBeCloseTo(p[1], 9);
        }
  });

  test('a note keeps reading the right way up and stays on its side of the line', () => {
    const note = place(strokes[5]!, 'SW', g, { mirror: true, upside: true });
    expect(note).toMatchObject({ kind: 'note', mirror: true, upside: true });
    expect(flipPlaced(place(strokes[5]!, 'SW', g), NO_FLIP)).not.toHaveProperty('mirror');
  });
});

describe('drawing on a turned sheet', () => {
  test('a run dragged on the turned sheet ends under the finger', () => {
    for (const f of FLIPS) {
      // What the man sees: the run's end, and a point four dots up-right of it on the screen.
      const from: [number, number, number] = [4, 0, 3];
      const shownFrom = flipPt(toScreen(from, 'SW', g), f);
      const shownTo: Pt = [shownFrom[0] + 4 * g * Math.cos(Math.PI / 6), shownFrom[1] - 4 * g * 0.5];
      // What the canvas does with the finger: reflect it back onto the drawn page, then snap.
      const snap = snapRun(from, flipPt(shownTo, f), 'SW', g);
      const landed = flipPt(toScreen(snap.to, 'SW', g), f);
      expect(snap.steps).toBe(4);
      expect(landed[0]).toBeCloseTo(shownTo[0], 6);
      expect(landed[1]).toBeCloseTo(shownTo[1], 6);
    }
  });
});

describe('the window when the sheet turns', () => {
  test('whatever was in the middle of the screen stays in the middle', () => {
    const v = { scale: 1.7, tx: 90, ty: -40 };
    const w = 380;
    const h = 600;
    for (const from of FLIPS)
      for (const to of FLIPS) {
        const drawnAtCentre = flipPt(toPage([w / 2, h / 2], v), from);
        const next = turnOver(v, w, h, from, to);
        const onScreen = toView(flipPt(drawnAtCentre, to), next);
        expect(onScreen[0]).toBeCloseTo(w / 2, 9);
        expect(onScreen[1]).toBeCloseTo(h / 2, 9);
        expect(next.scale).toBe(v.scale);
      }
  });
});

describe('the flip is kept with the sketch', () => {
  const s = { ...newSketch(emptyBook(), 1_000), strokes };
  const book = saveSketch(emptyBook(), s, 1_000);

  test('set without counting as an edit, cleared when turned back', () => {
    const mirrored = withFlip(book, s.id, { mirror: true, upside: false });
    expect(mirrored.sketches[0]?.flip).toEqual({ mirror: true, upside: false });
    expect(mirrored.sketches[0]?.updatedAt).toBe(book.sketches[0]?.updatedAt);
    expect(withFlip(mirrored, s.id, NO_FLIP).sketches[0]).not.toHaveProperty('flip');
  });

  test('survives the store, and a bad value opens the sheet as drawn', () => {
    const back = parseBook(serialiseBook(withFlip(book, s.id, { mirror: false, upside: true })));
    expect(back.sketches[0]?.flip).toEqual({ mirror: false, upside: true });
    expect(validFlip({ mirror: 'yes', upside: false })).toBeUndefined();
    expect(validFlip(null)).toBeUndefined();
  });

  test('fitting the screen fits the turned picture', () => {
    const f = { mirror: true, upside: true };
    const plain = sketchBounds(strokes, 'SW', g)!;
    const turned = sketchBounds(strokes, 'SW', g, f)!;
    expect(turned.maxX - turned.minX).toBeCloseTo(plain.maxX - plain.minX, 6);
    expect(turned.maxY - turned.minY).toBeCloseTo(plain.maxY - plain.minY, 6);
  });
});

describe('a turned sheet says so on paper', () => {
  const s = { ...newSketch(emptyBook(), 1_000), strokes };

  test('a mirrored print is stamped, because it is the other hand of the run', () => {
    expect(sketchToSvg({ ...s, flip: { mirror: true, upside: false } }, g)).toContain('>MIRRORED</text>');
    expect(sketchToSvg({ ...s, flip: { mirror: true, upside: true } }, g)).toContain('MIRRORED, UPSIDE DOWN');
    expect(sketchToSvg(s, g)).not.toContain('MIRRORED');
  });

  test('a mirrored note is set to run back from its point, not over the line', () => {
    expect(sketchToSvg({ ...s, flip: { mirror: true, upside: false } }, g)).toContain('text-anchor="end"');
  });

  test('the words', () => {
    expect(flipWords(NO_FLIP)).toBe('');
    expect(flipWords({ mirror: false, upside: true })).toBe('Upside down');
  });
});
