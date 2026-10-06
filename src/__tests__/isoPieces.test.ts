import { IsoCutOptions, IsoRun, isoCuts, jointFor, notedDims, pieceKey, readIso } from '../calc/isoPieces';
import { L3 } from '../calc/iso';
import { cutDifferently, emptyCuts, isoPieceCuts, putCuts, setCutDone } from '../state/cutLog';
import { emptyBook, parseBook, saveSketch, serialiseBook, newSketch, withDim, dimSpot, sketchToSvg } from '../state/sketchStore';

const run = (from: L3, to: L3): IsoRun => ({ from, to });
const opts = (o: Partial<IsoCutOptions> = {}): IsoCutOptions => ({
  joint: 'welded',
  nps: 2,
  radius: 'LR',
  gap: 0.125,
  size: '2"',
  length: (v) => `${v}`,
  ...o,
});

describe('reading a sketch as pipe', () => {
  test('one line is one piece, open both ends', () => {
    const r = readIso([run([0, 0, 0], [3, 0, 0])]);
    expect(r.pieces).toHaveLength(1);
    expect(r.pieces[0]).toMatchObject({ n: 1, from: [0, 0, 0], to: [3, 0, 0], dots: 3 });
    const [c] = isoCuts(r, { [r.pieces[0]!.key]: 30 }, opts());
    expect(c!.ends.map((e) => e.label)).toEqual(['Open end', 'Open end']);
    expect(c!.cut).toBe(30);
  });

  test('a line drawn in two goes, dead in line, is one piece', () => {
    const r = readIso([run([0, 0, 0], [2, 0, 0]), run([2, 0, 0], [5, 0, 0])]);
    expect(r.pieces).toHaveLength(1);
    expect(r.pieces[0]!.dots).toBe(5);
  });

  test('the same stretch drawn twice is one stretch', () => {
    const r = readIso([run([0, 0, 0], [4, 0, 0]), run([4, 0, 0], [1, 0, 0])]);
    expect(r.pieces).toHaveLength(1);
    expect(r.pieces[0]!.dots).toBe(4);
  });

  test('a turn is a 90 and takes its takeout and a root gap off both pieces', () => {
    const r = readIso([run([0, 0, 0], [3, 0, 0]), run([3, 0, 0], [3, 2, 0])]);
    expect(r.pieces.map((p) => p.n)).toEqual([1, 2]);
    expect(r.nodes.get('3,0,0')).toMatchObject({ kind: 'elbow', angle: 90 });
    const cuts = isoCuts(r, { [r.pieces[0]!.key]: 30, [r.pieces[1]!.key]: 24 }, opts());
    // 2" LR 90 is 3" centre to end.
    expect(cuts[0]!.ends[1]).toMatchObject({ label: '90° LR elbow', takeout: 3, gap: 0.125 });
    expect(cuts[0]!.cut).toBeCloseTo(30 - 3 - 0.125);
    expect(cuts[1]!.cut).toBeCloseTo(24 - 3 - 0.125);
  });

  test('a diagonal off an axis is a 45', () => {
    const r = readIso([run([0, 0, 0], [2, 0, 0]), run([2, 0, 0], [3, 1, 0])]);
    expect(r.nodes.get('2,0,0')).toMatchObject({ kind: 'elbow', angle: 45 });
    const [a] = isoCuts(r, { [r.pieces[0]!.key]: 20, [r.pieces[1]!.key]: 20 }, opts());
    expect(a!.ends[1]).toMatchObject({ label: '45° LR elbow', takeout: 1.375 });
  });

  test('a fold back past square is not a fitting', () => {
    const r = readIso([run([0, 0, 0], [2, 0, 0]), run([2, 0, 0], [1, 1, 0])]);
    expect(r.nodes.get('2,0,0')).toMatchObject({ kind: 'elbow', angle: 135 });
    const [a] = isoCuts(r, { [r.pieces[0]!.key]: 20, [r.pieces[1]!.key]: 20 }, opts());
    expect(a!.problem).toMatch(/135° turn is not a stock fitting/);
    expect(a!.cut).toBeNaN();
  });

  test('a branch off the middle of a line splits it at a tee', () => {
    const r = readIso([run([0, 0, 0], [4, 0, 0]), run([2, 0, 0], [2, 0, 3])]);
    expect(r.pieces.map((p) => [p.n, p.from, p.to])).toEqual([
      [1, [0, 0, 0], [2, 0, 0]],
      [2, [2, 0, 0], [4, 0, 0]],
      [3, [2, 0, 0], [2, 0, 3]],
    ]);
    expect(r.nodes.get('2,0,0')).toMatchObject({ kind: 'tee', branch: [0, 0, 1] });
    const dims = Object.fromEntries(r.pieces.map((p) => [p.key, 20]));
    const cuts = isoCuts(r, dims, opts());
    expect(cuts[0]!.ends[1].label).toBe('Tee, run');
    expect(cuts[2]!.ends[0].label).toBe('Tee, branch');
    // 2" butt weld tee is 2-1/2" centre to end.
    expect(cuts[2]!.ends[0].takeout).toBe(2.5);
  });

  test('no-hub works a san tee by run and branch, from the fitting library', () => {
    const r = readIso([run([0, 0, 0], [4, 0, 0]), run([2, 0, 0], [2, 0, 3])]);
    const dims = Object.fromEntries(r.pieces.map((p) => [p.key, 20]));
    const lib = (id: string) => ({ nhSanRun: 4, nhSanBranch: 5 } as Record<string, number>)[id];
    const cuts = isoCuts(r, dims, opts({ joint: 'nohub', gap: 0, library: lib }));
    expect(cuts[0]!.ends[1]).toMatchObject({ takeout: 4, gap: 0 });
    expect(cuts[2]!.ends[0]).toMatchObject({ takeout: 5 });
    const unset = isoCuts(r, dims, opts({ joint: 'nohub', gap: 0, library: () => undefined }));
    expect(unset[0]!.problem).toMatch(/fitting library/);
  });

  test('a 45 lateral is a wye in no-hub and a problem in steel', () => {
    const r = readIso([run([0, 0, 0], [4, 0, 0]), run([2, 0, 0], [3, 1, 0])]);
    expect(r.nodes.get('2,0,0')).toMatchObject({ kind: 'lateral', angle: 45 });
    const dims = Object.fromEntries(r.pieces.map((p) => [p.key, 20]));
    const nh = isoCuts(r, dims, opts({ joint: 'nohub', gap: 0, library: () => 3 }));
    expect(nh.map((c) => c.problem)).toEqual([null, null, null]);
    expect(isoCuts(r, dims, opts())[0]!.problem).toMatch(/lateral/);
  });

  test('two lines crossing that were never joined are no fitting', () => {
    const r = readIso([run([0, 0, 0], [4, 0, 0]), run([2, -2, 0], [2, 2, 0])]);
    expect(r.pieces).toHaveLength(2);
    expect(r.nodes.has('2,0,0')).toBe(false);
  });

  test('a cross drawn to a point is a cross', () => {
    const r = readIso([run([0, 0, 0], [2, 0, 0]), run([2, 0, 0], [4, 0, 0]), run([2, -2, 0], [2, 0, 0]), run([2, 0, 0], [2, 2, 0])]);
    expect(r.nodes.get('2,0,0')).toMatchObject({ kind: 'cross' });
    expect(r.pieces).toHaveLength(4);
  });

  test('pieces too short for their fittings say how much comes off', () => {
    const r = readIso([run([0, 0, 0], [3, 0, 0]), run([3, 0, 0], [3, 2, 0])]);
    const [a] = isoCuts(r, { [r.pieces[0]!.key]: 3 }, opts());
    expect(a!.problem).toBe('Too short for its fittings: 3.125 comes off.');
  });

  test('a piece without a dimension says so', () => {
    const r = readIso([run([0, 0, 0], [3, 0, 0])]);
    expect(isoCuts(r, {}, opts())[0]!.problem).toBe('No dimension yet.');
  });

  test('a piece is keyed the same whichever way it was drawn', () => {
    expect(pieceKey([3, 0, 0], [0, 0, 0])).toBe(pieceKey([0, 0, 0], [3, 0, 0]));
    const a = readIso([run([0, 0, 0], [3, 0, 0])]);
    const b = readIso([run([3, 0, 0], [0, 0, 0])]);
    expect(a.pieces[0]!.key).toBe(b.pieces[0]!.key);
    expect(b.pieces[0]!.from).toEqual([3, 0, 0]);
  });

  test('a runaway sketch is refused, not read', () => {
    expect(readIso([run([0, 0, 0], [30_000, 0, 0])]).error).toMatch(/too much pipe/);
  });

  test('the joint follows the material', () => {
    expect(jointFor('cs', undefined)).toBe('welded');
    expect(jointFor('galv', undefined)).toBe('screwed');
    expect(jointFor('pvc', 'socket')).toBe('socket');
  });
});

describe('dimensions already written as notes', () => {
  const r = readIso([run([0, 0, 0], [4, 0, 0]), run([4, 0, 0], [4, 3, 0])]);
  const mid = (p: (typeof r.pieces)[number]): [number, number] => [(p.from[0] + p.to[0]) * 10, (p.from[1] + p.to[1]) * 10];
  const read = (t: string) => Number(t.replace(/"$/, ''));

  test('a figure by a piece is offered for it, the nearest one only', () => {
    const got = notedDims(r.pieces, [{ at: [41, 2], text: '48"' }, { at: [45, 2], text: '50"' }, { at: [80, 30], text: '36' }], mid, 30, read);
    expect(got.get(r.pieces[0]!.key)).toEqual({ value: 48, text: '48"' });
    expect(got.get(r.pieces[1]!.key)).toEqual({ value: 36, text: '36' });
  });

  test('words and far-off figures are not dimensions', () => {
    const got = notedDims(r.pieces, [{ at: [40, 0], text: '2" GV' }, { at: [500, 500], text: '12' }], mid, 30, read);
    expect(got.size).toBe(0);
  });
});

describe('dimensions kept on the sketch', () => {
  const key = pieceKey([0, 0, 0], [3, 0, 0]);
  const start = () => {
    const s = newSketch(emptyBook(), 1000);
    return { book: saveSketch(emptyBook(), s, 1000), id: s.id };
  };

  test('set, changed, taken off, and kept through a save', () => {
    const { book, id } = start();
    let b = withDim(book, id, key, 54.5, 2000);
    expect(b.sketches[0]!.dims).toEqual({ [key]: 54.5 });
    expect(b.sketches[0]!.updatedAt).toBe(2000);
    b = withDim(b, id, key, 60, 3000);
    expect(parseBook(serialiseBook(b)).sketches[0]!.dims).toEqual({ [key]: 60 });
    b = withDim(b, id, key, null, 4000);
    expect(b.sketches[0]!.dims).toBeUndefined();
  });

  test('nothing silly is kept', () => {
    const { book, id } = start();
    expect(withDim(book, id, key, 0, 2)).toBe(book);
    expect(withDim(book, id, key, NaN, 2)).toBe(book);
    expect(withDim(book, id, 'not a key', 5, 2)).toBe(book);
    const raw = JSON.parse(serialiseBook(withDim(book, id, key, 10, 2)));
    raw.sketches[0].dims['1,2~3'] = 5;
    raw.sketches[0].dims[pieceKey([0, 0, 0], [0, 4, 0])] = -1;
    expect(parseBook(JSON.stringify(raw)).sketches[0]!.dims).toEqual({ [key]: 10 });
  });

  test('a dimension is written off its line, above it', () => {
    const [x, y] = dimSpot([0, 0], [20, 0], 9);
    expect([x, y]).toEqual([10, -9]);
    const [ux] = dimSpot([0, 0], [0, 20], 9);
    expect(ux).toBe(9);
  });

  test('the shared sheet carries the dimensions', () => {
    const { book, id } = start();
    const svg = sketchToSvg(book.sketches.find((s) => s.id === id)!, 20, 'SW', undefined, [{ a: [0, 0], b: [40, 0], text: `4' 6"` }]);
    expect(svg).toContain(`>4' 6&quot;</text>`);
  });
});

describe('an iso on the cut list', () => {
  const pieces = [
    { n: 1, c2c: 30, cut: 26.875, ends: 'Open end × 90° LR elbow' },
    { n: 12, c2c: 24, cut: 20.875, ends: '90° LR elbow × Open end' },
  ];
  test('marked by the sketch, the number never cut off', () => {
    const cuts = isoPieceCuts(pieces, { sketch: 'Line 2210-CW-4', pipeKey: 'cs:40|2', pipe: '2" CS SCH 40' });
    expect(cuts.map((c) => c.mark)).toEqual(['Line 2210-CW-4-1', 'Line 2210-CW-12']);
  });

  test('a mark already cut that the sketch now cuts differently is called out', () => {
    let cuts = isoPieceCuts(pieces, { sketch: 'L7', pipeKey: 'cs:40|2', pipe: '2"' });
    let log = putCuts(emptyCuts(), cuts, 100, 'J1').log;
    log = setCutDone(log, log.cuts[0]!.id, true);
    expect(cutDifferently(log, cuts, 'J1')).toEqual([]);
    cuts = isoPieceCuts([{ ...pieces[0]!, cut: 22 }, pieces[1]!], { sketch: 'L7', pipeKey: 'cs:40|2', pipe: '2"' });
    expect(cutDifferently(log, cuts, 'J1')).toEqual(['L7-1']);
    expect(cutDifferently(log, cuts, 'J2')).toEqual([]);
  });
});
