import {
  MAX_SKETCHES,
  SKETCHES_VERSION,
  SavedSketch,
  Stroke,
  deleteSketch,
  emptyBook,
  newSketch,
  parseBook,
  place,
  renameSketch,
  runNodes,
  saveSketch,
  serialiseBook,
  sketchBounds,
  sketchToSvg,
  storedStroke,
  validStroke,
  withStrokes,
} from '../state/sketchStore';
import { lattice, toScreen } from '../calc/iso';

const strokes: Stroke[] = [
  { kind: 'run', from: [0, 0, 0], to: [3, 0, 0] },
  { kind: 'run', from: [3, 0, 0], to: [3, 0, 2] },
  { kind: 'pen', pts: [[5, 5], [9, 9], [12, 4]], anchor: [3, 0, 2] },
  { kind: 'note', at: [10, -10], text: '4\'-6"', anchor: [3, 0, 0] },
  { kind: 'pen', pts: [[100, 100], [120, 100]], anchor: null },
];

const sketch = (id: string, at: number, s: Stroke[] = strokes): SavedSketch => ({
  id,
  name: `Sketch ${id}`,
  place: '',
  strokes: s,
  createdAt: at,
  updatedAt: at,
});

describe('strokes', () => {
  test('a run goes somewhere, a pen has two points, a note has words and an anchor is whole', () => {
    expect(validStroke({ kind: 'run', from: [0, 0, 0], to: [0, 0, 0] })).toBeNull();
    expect(validStroke({ kind: 'run', from: [0, 0, 0], to: [1.5, 0, 0] })).toBeNull();
    expect(validStroke({ kind: 'pen', pts: [[0, 0]], anchor: null })).toBeNull();
    expect(validStroke({ kind: 'pen', pts: [[0, 0], [1, 1]], anchor: [1, 2] })).toBeNull();
    expect(validStroke({ kind: 'note', at: [0, 0], text: '   ', anchor: null })).toBeNull();
    for (const s of strokes) expect(validStroke(s)).toEqual(s);
  });

  test('stored coordinates are rounded to a tenth', () => {
    expect(storedStroke({ kind: 'pen', pts: [[1.23456, 2.98765], [3, 4]], anchor: null })).toEqual({ kind: 'pen', pts: [[1.2, 3], [3, 4]], anchor: null });
  });

  test('run nodes are every end of every run, once', () => {
    expect(runNodes(strokes)).toEqual([[0, 0, 0], [3, 0, 0], [3, 0, 2]]);
  });

  test('a pen mark rides with its anchor when the page turns; an unanchored one stays put', () => {
    const g = 20;
    const a = place(strokes[2]!, 'SW', g);
    const b = place(strokes[2]!, 'NE', g);
    const dSW = toScreen([3, 0, 2], 'SW', g);
    const dNE = toScreen([3, 0, 2], 'NE', g);
    expect(a.kind === 'pen' && a.pts[0]).toEqual([5 + dSW[0], 5 + dSW[1]]);
    expect(b.kind === 'pen' && b.pts[0]).toEqual([5 + dNE[0], 5 + dNE[1]]);
    expect(place(strokes[4]!, 'NW', g)).toEqual({ kind: 'pen', pts: [[100, 100], [120, 100]] });
  });

  test('the bounds cover every stroke and a note\'s words', () => {
    const b = sketchBounds(strokes, 'SW', 20)!;
    expect(b.minX).toBeLessThanOrEqual(0);
    expect(b.maxX).toBeGreaterThanOrEqual(120);
    expect(sketchBounds([], 'SW', 20)).toBeNull();
  });
});

describe('the book', () => {
  test('round-trips through the store', () => {
    const book = saveSketch(emptyBook(), sketch('a', 100), 100);
    expect(parseBook(serialiseBook(book))).toEqual(book);
  });

  test('a version-one page is lifted into the world, runs chained as they were drawn', () => {
    const g = 20;
    const e3 = lattice(3, 0, g);
    const up2 = lattice(5, 2, g); // three east then two up, on the old flat page
    const raw = JSON.stringify({
      v: 1,
      sketches: [
        {
          ...sketch('old', 5, []),
          strokes: [
            { kind: 'run', pts: [[0, 0], e3] },
            { kind: 'run', pts: [e3, up2] },
            { kind: 'pen', pts: [[1, 1], [2, 2]] },
            { kind: 'note', at: [4, 4], text: 'hi' },
          ],
        },
      ],
    });
    const b = parseBook(raw, g);
    expect(b.dropped).toBe(0);
    expect(b.sketches[0]!.strokes).toEqual([
      { kind: 'run', from: [0, 0, 0], to: [3, 0, 0] },
      { kind: 'run', from: [3, 0, 0], to: [3, 0, 2] },
      { kind: 'pen', pts: [[1, 1], [2, 2]], anchor: null },
      { kind: 'note', at: [4, 4], text: 'hi', anchor: null },
    ]);
    expect(JSON.parse(serialiseBook(b)).v).toBe(SKETCHES_VERSION);
  });

  test('a store from a newer app is left alone and marked foreign', () => {
    const b = parseBook(JSON.stringify({ v: SKETCHES_VERSION + 1, sketches: [] }));
    expect(b.foreign).toBe(true);
    expect(b.sketches).toEqual([]);
  });

  test('a broken sketch is dropped and counted, never repaired', () => {
    const raw = JSON.stringify({ v: SKETCHES_VERSION, sketches: [sketch('good', 5), { ...sketch('bad', 6), strokes: [{ kind: 'run', from: [0, 0, 0], to: [0, 0, 0] }] }] });
    const b = parseBook(raw);
    expect(b.sketches.map((s) => s.id)).toEqual(['good']);
    expect(b.dropped).toBe(1);
  });

  test('garbage reads as an empty book with one dropped', () => {
    expect(parseBook('{not json').dropped).toBe(1);
    expect(parseBook(null)).toEqual(emptyBook());
  });

  test('the newest touched is first, and the cap never drops the one just saved', () => {
    let book = emptyBook();
    for (let i = 0; i < MAX_SKETCHES + 5; i++) book = saveSketch(book, sketch(`s${i}`, i + 1), i + 1);
    expect(book.sketches.length).toBe(MAX_SKETCHES);
    expect(book.sketches[0]!.id).toBe(`s${MAX_SKETCHES + 4}`);
    expect(book.sketches.some((s) => s.id === 's0')).toBe(false);
  });

  test('a new sketch gets a fresh id and a name that says when', () => {
    const now = new Date(2026, 8, 25, 14, 7).getTime();
    const book = saveSketch(emptyBook(), newSketch(emptyBook(), now), now);
    const again = newSketch(book, now);
    expect(again.id).not.toBe(book.sketches[0]!.id);
    expect(again.name).toBe('Sketch 25 Sep 14:07');
  });

  test('strokes replace wholesale, and a rename keeps them', () => {
    let book = saveSketch(emptyBook(), sketch('a', 1, []), 1);
    book = withStrokes(book, 'a', strokes, 2);
    expect(book.sketches[0]!.strokes).toEqual(strokes);
    book = renameSketch(book, 'a', 'Rack 4 tie-in', 'Level 3', 3);
    expect(book.sketches[0]!.name).toBe('Rack 4 tie-in');
    expect(book.sketches[0]!.strokes).toEqual(strokes);
    expect(renameSketch(book, 'a', '  ', '', 4)).toBe(book);
    expect(deleteSketch(book, 'a').sketches).toEqual([]);
    expect(deleteSketch(book, 'zz')).toBe(book);
  });
});

describe('the printed page', () => {
  test('frames what was drawn, escapes the note, carries the dots and a compass', () => {
    const svg = sketchToSvg(sketch('a', 1, [...strokes, { kind: 'note', at: [50, 50], text: '<2" & up>', anchor: null }]), 20, 'NE');
    expect(svg).toContain('<polyline');
    expect(svg).toContain('&lt;2&quot; &amp; up&gt;');
    expect(svg).toContain('<pattern id="iso"');
    expect(svg).toContain('>N</text>');
    expect(svg).toMatch(/viewBox="-?\d+ -?\d+ \d+ \d+"/);
  });
  test('a blank sketch still prints a page', () => {
    expect(sketchToSvg(sketch('a', 1, []), 20)).toContain('<svg');
  });
});
