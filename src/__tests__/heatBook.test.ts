import { newHeat } from '../calc/heat';
import {
  HEAT_BOOK_VERSION,
  MAX_HEATS,
  emptyBook,
  findHeat,
  parseBook,
  putHeat,
  removeHeat,
  serialiseBook,
  sortHeats,
  validHeat,
} from '../state/heatBook';

const h = (n: string, certified = false, updatedAt = 0) => ({
  ...newHeat(n, updatedAt),
  certified,
  updatedAt,
});

describe('reading a stored heat', () => {
  it('needs a number and nothing else, because a blank material is a real note', () => {
    expect(validHeat({ heat: 'E7Z419' })?.heat).toBe('E7Z419');
    expect(validHeat({ heat: 'E7Z419' })?.material).toBe('');
    expect(validHeat({ heat: 'E7Z419' })?.certified).toBe(false);
  });

  it('refuses an entry with no number, which is not a heat at all', () => {
    expect(validHeat({ heat: '' })).toBeNull();
    expect(validHeat({ heat: '   ' })).toBeNull();
    expect(validHeat({ heat: '---' })).toBeNull();
    expect(validHeat({})).toBeNull();
    expect(validHeat(null)).toBeNull();
    expect(validHeat([1, 2])).toBeNull();
  });

  it('falls back rather than throwing on a field of the wrong type', () => {
    const v = validHeat({ heat: 'A1', material: 7, form: 'sideways', nps: -3, certified: 'yes' })!;
    expect(v.material).toBe('');
    expect(v.form).toBe('other');
    expect(v.nps).toBeNull();
    // Only a real boolean true certifies. A truthy string does not.
    expect(v.certified).toBe(false);
  });

  it('dates an entry with no timestamps rather than leaving them undefined', () => {
    const v = validHeat({ heat: 'A1' })!;
    expect(v.createdAt).toBe(0);
    expect(v.updatedAt).toBe(0);
  });
});

describe('reading the book', () => {
  it('round-trips what it wrote', () => {
    const b = putHeat(emptyBook(), h('E7Z419', true, 5));
    const back = parseBook(serialiseBook(b));
    expect(back.heats).toHaveLength(1);
    expect(back.heats[0]!.heat).toBe('E7Z419');
    expect(back.foreign).toBe(false);
    expect(back.dropped).toBe(0);
  });

  it('comes back empty for nothing at all', () => {
    expect(parseBook(null)).toEqual(emptyBook());
    expect(parseBook(undefined)).toEqual(emptyBook());
    expect(parseBook('')).toEqual(emptyBook());
  });

  it('never throws on rubbish, and says it dropped something', () => {
    for (const bad of ['{', 'null', '[]', '{"v":0}', '{"v":1}', '{"v":1,"heats":3}']) {
      const b = parseBook(bad);
      expect(b.heats).toEqual([]);
      expect(b.dropped).toBeGreaterThan(0);
    }
  });

  it('leaves a book from a newer app alone rather than reading it optimistically', () => {
    const b = parseBook(JSON.stringify({ v: HEAT_BOOK_VERSION + 1, heats: [{ heat: 'A1' }] }));
    expect(b.foreign).toBe(true);
    expect(b.heats).toEqual([]);
    expect(b.dropped).toBe(0);
  });

  it('folds two spellings of one heat into one row, because two rows is the bug', () => {
    // Holding both means a joint pointing at one is proved and a joint
    // pointing at the other is not, for the same steel.
    const b = parseBook(JSON.stringify({ v: 1, heats: [{ heat: 'E7Z419' }, { heat: 'e7z-419' }] }));
    expect(b.heats).toHaveLength(1);
    expect(b.dropped).toBe(1);
  });

  it('counts the rows it could not read', () => {
    const b = parseBook(JSON.stringify({ v: 1, heats: [{ heat: 'A1' }, {}, null, { heat: '' }] }));
    expect(b.heats).toHaveLength(1);
    expect(b.dropped).toBe(3);
  });
});

describe('the order the book is read in', () => {
  it('puts certs still to chase at the top, because those are the rows to act on', () => {
    const s = sortHeats([h('DONE', true, 9), h('OPEN', false, 1)]);
    expect(s.map((x) => x.heat)).toEqual(['OPEN', 'DONE']);
  });

  it('breaks ties by most recently touched, then by number so it never wobbles', () => {
    const s = sortHeats([h('B', false, 1), h('A', false, 2), h('C', false, 2)]);
    expect(s.map((x) => x.heat)).toEqual(['A', 'C', 'B']);
  });
});

describe('storing and finding', () => {
  it('finds a heat through spelling', () => {
    const b = putHeat(emptyBook(), h('E7Z419'));
    expect(findHeat(b, 'e7z-419')?.heat).toBe('E7Z419');
    expect(findHeat(b, 'E72419')).toBeUndefined();
  });

  it('replaces a heat rather than holding it twice, however it is spelled', () => {
    let b = putHeat(emptyBook(), h('E7Z419'));
    b = putHeat(b, { ...h('e7z-419', true), material: 'A106 Gr B' });
    expect(b.heats).toHaveLength(1);
    expect(b.heats[0]!.material).toBe('A106 Gr B');
    expect(b.heats[0]!.certified).toBe(true);
  });

  it('removes through spelling too', () => {
    const b = removeHeat(putHeat(emptyBook(), h('E7Z419')), 'e7z-419');
    expect(b.heats).toEqual([]);
  });

  it('drops the certs that are done before the ones still owed, at the cap', () => {
    let b = emptyBook();
    for (let i = 0; i < MAX_HEATS; i += 1) {
      b = putHeat(b, h(`C${i}`, i < MAX_HEATS - 5, i));
    }
    expect(b.heats).toHaveLength(MAX_HEATS);
    b = putHeat(b, h('NEW', false, MAX_HEATS));
    expect(b.heats).toHaveLength(MAX_HEATS);
    // The new row survived, and so did every row still waiting on a cert.
    expect(findHeat(b, 'NEW')).toBeDefined();
    expect(b.heats.filter((x) => !x.certified)).toHaveLength(6);
    // The oldest finished one is what went.
    expect(findHeat(b, 'C0')).toBeUndefined();
  });

  it('never drops the heat being stored, even when the book is full of open ones', () => {
    let b = emptyBook();
    for (let i = 0; i < MAX_HEATS; i += 1) b = putHeat(b, h(`O${i}`, false, i));
    b = putHeat(b, h('NEW', false, MAX_HEATS));
    expect(findHeat(b, 'NEW')).toBeDefined();
  });
});
