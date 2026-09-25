import {
  MAX_SKETCHES,
  SKETCHES_VERSION,
  SavedSketch,
  Stroke,
  deleteSketch,
  emptyBook,
  newSketch,
  parseBook,
  renameSketch,
  runNodes,
  saveSketch,
  serialiseBook,
  sketchToSvg,
  storedStroke,
  validStroke,
  withStrokes,
} from '../state/sketchStore';

const strokes: Stroke[] = [
  { kind: 'run', pts: [[0, 0], [17.3, -10]] },
  { kind: 'pen', pts: [[5, 5], [9, 9], [12, 4]] },
  { kind: 'note', at: [30, 30], text: '4\'-6"' },
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
  test('a run has exactly two points, a pen at least two, a note some text', () => {
    expect(validStroke({ kind: 'run', pts: [[0, 0], [1, 1], [2, 2]] })).toBeNull();
    expect(validStroke({ kind: 'pen', pts: [[0, 0]] })).toBeNull();
    expect(validStroke({ kind: 'note', at: [0, 0], text: '   ' })).toBeNull();
    expect(validStroke({ kind: 'note', at: [0, 'x'], text: 'ok' })).toBeNull();
    for (const s of strokes) expect(validStroke(s)).toEqual(s);
  });

  test('stored coordinates are rounded to a tenth', () => {
    expect(storedStroke({ kind: 'pen', pts: [[1.23456, 2.98765], [3, 4]] })).toEqual({ kind: 'pen', pts: [[1.2, 3], [3, 4]] });
  });

  test('run nodes are every end of every run', () => {
    expect(runNodes(strokes)).toEqual([[0, 0], [17.3, -10]]);
  });
});

describe('the book', () => {
  test('round-trips through the store', () => {
    const book = saveSketch(emptyBook(), sketch('a', 100), 100);
    expect(parseBook(serialiseBook(book))).toEqual(book);
  });

  test('a store from a newer app is left alone and marked foreign', () => {
    const b = parseBook(JSON.stringify({ v: SKETCHES_VERSION + 1, sketches: [] }));
    expect(b.foreign).toBe(true);
    expect(b.sketches).toEqual([]);
  });

  test('a broken sketch is dropped and counted, never repaired', () => {
    const raw = JSON.stringify({ v: SKETCHES_VERSION, sketches: [sketch('good', 5), { ...sketch('bad', 6), strokes: [{ kind: 'run', pts: [[0, 0]] }] }] });
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
  test('frames what was drawn, escapes the note, and carries the dots', () => {
    const svg = sketchToSvg(sketch('a', 1, [...strokes, { kind: 'note', at: [50, 50], text: '<2" & up>' }]), 20);
    expect(svg).toContain('<polyline');
    expect(svg).toContain('&lt;2&quot; &amp; up&gt;');
    expect(svg).toContain('<pattern id="iso"');
    expect(svg).toMatch(/viewBox="-?\d+ -?\d+ \d+ \d+"/);
  });
  test('a blank sketch still prints a page', () => {
    expect(sketchToSvg(sketch('a', 1, []), 20)).toContain('<svg');
  });
});
