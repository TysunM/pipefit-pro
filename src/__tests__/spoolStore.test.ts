import { solveSpool } from '../calc/spool';
import { solveDirections } from '../calc/direction';
import {
  MAX_SPOOLS,
  SPOOLS_VERSION,
  SavedSpool,
  SpoolShelf,
  deleteSpool,
  emptyShelf,
  freshSpoolId,
  getSpool,
  parseShelf,
  renameSpool,
  sameSpool,
  saveSpool,
  serialiseShelf,
  sortSpools,
  validSpool,
} from '../state/spoolStore';

const NOW = 1_760_000_000_000;

const spool = (over: Partial<SavedSpool> = {}): SavedSpool => ({
  id: 'riser1',
  name: 'Riser 1',
  place: 'Pump house east wall',
  nps: 2,
  kind: 'LR',
  schedule: '40',
  gap: 0.09375,
  legs: [
    { length: 36, bearing: 90, slope: 0 },
    { length: 24, bearing: 0, slope: 90 },
    { length: 30, bearing: 0, slope: 0 },
  ],
  createdAt: NOW - 60_000,
  updatedAt: NOW - 60_000,
  ...over,
});

const shelfOf = (...spools: SavedSpool[]): SpoolShelf => ({ spools, foreign: false, dropped: 0 });
const roundTrip = (s: SpoolShelf) => parseShelf(serialiseShelf(s));

describe('a spool survives the round trip through the store', () => {
  test('what goes in comes back, byte for byte where it matters', () => {
    const back = roundTrip(shelfOf(spool()));
    expect(back.dropped).toBe(0);
    expect(back.foreign).toBe(false);
    expect(back.spools).toEqual([spool()]);
  });

  test('several spools come back sorted, most recently touched first', () => {
    const a = spool({ id: 'a', updatedAt: NOW - 300 });
    const b = spool({ id: 'b', updatedAt: NOW - 100 });
    const c = spool({ id: 'c', updatedAt: NOW - 200 });
    expect(roundTrip(shelfOf(a, b, c)).spools.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  test('an empty store is an empty shelf, not an error', () => {
    expect(parseShelf(null)).toEqual(emptyShelf());
    expect(parseShelf('')).toEqual(emptyShelf());
    expect(parseShelf(undefined)).toEqual(emptyShelf());
  });

  test('a saved spool is enough to rebuild the exact cuts', () => {
    // The store keeps the input, not the answer, so the answer has to be
    // reproducible from what it keeps. This is the test that holds it to that.
    const s = roundTrip(shelfOf(spool())).spools[0]!;
    const solved = solveDirections(
      s.legs.map((l, i) => ({ id: `l${i}`, length: l.length, dir: { bearing: l.bearing, slope: l.slope } }))
    );
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    const result = solveSpool({
      legs: solved.legs,
      start: solved.start,
      nps: s.nps,
      kind: s.kind,
      schedule: s.schedule,
      gap: s.gap,
    });
    expect(result.valid).toBe(true);
    expect(result.runs.map((r) => r.cutLength.toFixed(4))).toEqual(['32.9063', '17.8125', '26.9063']);
  });
});

describe('nothing broken gets past the door', () => {
  test('garbage in the store is one dropped record, not a crash', () => {
    for (const raw of ['not json', '[]', '{}', '{"v":0,"spools":[]}', '{"v":1,"spools":"no"}', '{"v":"1"}']) {
      const s = parseShelf(raw);
      expect(s.spools).toEqual([]);
      expect(s.dropped).toBe(1);
    }
  });

  test('a store from a newer app is left alone and flagged, never parsed hopefully', () => {
    const s = parseShelf(JSON.stringify({ v: SPOOLS_VERSION + 1, spools: [spool()] }));
    expect(s.foreign).toBe(true);
    expect(s.spools).toEqual([]);
    expect(s.dropped).toBe(0);
  });

  test('a bad spool is dropped and counted while its neighbours load', () => {
    const bad = { ...spool({ id: 'bad' }), legs: [] };
    const s = parseShelf(JSON.stringify({ v: 1, spools: [spool({ id: 'good' }), bad] }));
    expect(s.spools.map((x) => x.id)).toEqual(['good']);
    expect(s.dropped).toBe(1);
  });

  test('two spools with one id is one spool and one dropped', () => {
    const s = parseShelf(JSON.stringify({ v: 1, spools: [spool(), spool()] }));
    expect(s.spools).toHaveLength(1);
    expect(s.dropped).toBe(1);
  });

  test('every field that must hold is held', () => {
    const cases: [string, Partial<SavedSpool> | Record<string, unknown>][] = [
      ['empty id', { id: '' }],
      ['blank name', { name: '   ' }],
      ['place not a string', { place: 7 as unknown as string }],
      ['zero size', { nps: 0 }],
      ['unknown radius', { kind: 'XL' as never }],
      ['unknown schedule', { schedule: '160' as never }],
      ['negative gap', { gap: -1 }],
      ['no legs', { legs: [] }],
      ['too many legs', { legs: Array.from({ length: 9 }, () => ({ length: 10, bearing: 0, slope: 0 })) }],
      ['zero length leg', { legs: [{ length: 0, bearing: 0, slope: 0 }] }],
      ['leg past vertical', { legs: [{ length: 10, bearing: 0, slope: 91 }] }],
      ['NaN bearing', { legs: [{ length: 10, bearing: NaN, slope: 0 }] }],
      ['no createdAt', { createdAt: undefined as never }],
      ['fractional timestamp', { updatedAt: 1.5 }],
    ];
    for (const [why, over] of cases) {
      expect(validSpool({ ...spool(), ...over })).toBeNull();
    }
    expect(validSpool(spool())).not.toBeNull();
  });

  test('an empty place is allowed — where it goes is optional, what it is called is not', () => {
    expect(validSpool(spool({ place: '' }))).not.toBeNull();
  });

  test('a name is trimmed on the way in, not stored ragged', () => {
    expect(validSpool(spool({ name: '  Riser 1  ' }))!.name).toBe('Riser 1');
  });
});

describe('the shelf operations', () => {
  test('saving a new spool puts it first', () => {
    const s = saveSpool(shelfOf(spool({ id: 'old', updatedAt: NOW - 500 })), spool({ id: 'new' }), NOW);
    expect(s.spools.map((x) => x.id)).toEqual(['new', 'old']);
    expect(getSpool(s, 'new')!.updatedAt).toBe(NOW);
  });

  test('saving over an id replaces it and keeps when it was first made', () => {
    const first = spool({ createdAt: NOW - 900_000, updatedAt: NOW - 900_000 });
    const edited = { ...first, legs: [{ length: 48, bearing: 180, slope: 0 }] };
    const s = saveSpool(shelfOf(first), edited, NOW);
    expect(s.spools).toHaveLength(1);
    expect(s.spools[0]!.legs[0]!.length).toBe(48);
    expect(s.spools[0]!.createdAt).toBe(NOW - 900_000);
    expect(s.spools[0]!.updatedAt).toBe(NOW);
  });

  test('past the cap the oldest goes, and never the one just saved', () => {
    let s = emptyShelf();
    for (let i = 0; i < MAX_SPOOLS; i += 1) s = saveSpool(s, spool({ id: `s${i}` }), NOW - MAX_SPOOLS + i);
    const full = saveSpool(s, spool({ id: 'newest' }), NOW);
    expect(full.spools).toHaveLength(MAX_SPOOLS);
    expect(getSpool(full, 'newest')).toBeDefined();
    expect(getSpool(full, 's0')).toBeUndefined();
  });

  test('rename changes the words and the touch time and nothing else', () => {
    const s = renameSpool(shelfOf(spool()), 'riser1', 'Riser 1B', 'Moved to west wall', NOW);
    const r = getSpool(s, 'riser1')!;
    expect(r.name).toBe('Riser 1B');
    expect(r.place).toBe('Moved to west wall');
    expect(r.updatedAt).toBe(NOW);
    expect(r.legs).toEqual(spool().legs);
  });

  test('a rename to nothing is refused, and a missing id is a no-op', () => {
    const shelf = shelfOf(spool());
    expect(renameSpool(shelf, 'riser1', '   ', '', NOW)).toBe(shelf);
    expect(renameSpool(shelf, 'ghost', 'X', '', NOW)).toBe(shelf);
  });

  test('delete takes exactly one spool, and deleting a ghost changes nothing', () => {
    const shelf = shelfOf(spool({ id: 'a' }), spool({ id: 'b' }));
    expect(deleteSpool(shelf, 'a').spools.map((x) => x.id)).toEqual(['b']);
    expect(deleteSpool(shelf, 'ghost')).toBe(shelf);
  });

  test('fresh ids come from the name and never collide', () => {
    const shelf = shelfOf(spool({ id: 'riser1' }));
    expect(freshSpoolId(shelf, 'Riser 1')).toBe('riser1-2');
    expect(freshSpoolId(shelf, '???')).toBe('spool');
    expect(freshSpoolId(emptyShelf(), '8-CWS-102')).toBe('8cws102');
  });

  test('sorting is stable for equal times, by id', () => {
    const t = sortSpools([spool({ id: 'b', updatedAt: NOW }), spool({ id: 'a', updatedAt: NOW })]);
    expect(t.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('knowing whether the screen matches the shelf', () => {
  const saved = spool();

  test('untouched is the same spool', () => {
    expect(sameSpool(saved, saved)).toBe(true);
  });

  test('any cut-changing edit reads as different', () => {
    expect(sameSpool(saved, { ...saved, gap: 0.125 })).toBe(false);
    expect(sameSpool(saved, { ...saved, nps: 3 })).toBe(false);
    expect(sameSpool(saved, { ...saved, schedule: '80' })).toBe(false);
    expect(sameSpool(saved, { ...saved, legs: saved.legs.slice(0, 2) })).toBe(false);
    expect(
      sameSpool(saved, { ...saved, legs: saved.legs.map((l, i) => (i === 1 ? { ...l, slope: -90 } : l)) })
    ).toBe(false);
  });

  test('an edit put back by hand reads as clean again', () => {
    const edited = { ...saved, legs: saved.legs.map((l, i) => (i === 0 ? { ...l, length: 40 } : l)) };
    expect(sameSpool(saved, edited)).toBe(false);
    const restored = { ...edited, legs: saved.legs.map((l) => ({ ...l })) };
    expect(sameSpool(saved, restored)).toBe(true);
  });
});
