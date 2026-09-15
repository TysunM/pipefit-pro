import {
  REFERENCE_TABLES,
  referenceGroups,
  referenceTable,
  searchReference,
} from '../calc/reference';

describe('the handbook index', () => {
  test('every group is represented', () => {
    expect(referenceGroups()).toEqual([
      'Screwed fittings',
      'Flanged fittings',
      'Welded fittings',
      'Valves',
      'Pipe and tube',
      'Hanging and bending',
    ]);
  });

  test('there are tables in every group', () => {
    for (const g of referenceGroups()) {
      expect(REFERENCE_TABLES.filter((t) => t.group === g).length).toBeGreaterThan(2);
    }
    expect(REFERENCE_TABLES.length).toBeGreaterThan(40);
  });

  test('every id is unique and findable', () => {
    const ids = REFERENCE_TABLES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(referenceTable(id)).toBeDefined();
    expect(referenceTable('nothing-like-this')).toBeUndefined();
  });

  test('every table says where it came from and what it is', () => {
    for (const t of REFERENCE_TABLES) {
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.page).toMatch(/\d/);
      expect(t.columns.length).toBeGreaterThan(1);
      expect(t.columns[0]!.key).toBe('size');
    }
  });

  // The whole point: every table has to actually build, with no gaps and no
  // stray values the screen cannot print.
  test('every table builds rows, and every cell is a string', () => {
    for (const t of REFERENCE_TABLES) {
      const rows = t.rows();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        for (const c of t.columns) {
          expect(typeof row[c.key]).toBe('string');
        }
      }
    }
  });

  test('no cell is left as an unformatted NaN or undefined', () => {
    for (const t of REFERENCE_TABLES) {
      for (const row of t.rows()) {
        for (const c of t.columns) {
          const v = row[c.key]!;
          expect(v).not.toContain('NaN');
          expect(v).not.toContain('undefined');
          expect(v).not.toContain('Infinity');
        }
      }
    }
  });

  test('a table with no figure in a cell shows a dash, not a blank', () => {
    const wyes = referenceTable('wyes')!.rows();
    expect(wyes.some((r) => r.eci === '—')).toBe(true);
    const street = referenceTable('street-elbows')!.rows();
    expect(street.some((r) => r.c === '—')).toBe(true);
  });

  test('a few tables read back what the pages print', () => {
    const takeouts = referenceTable('takeout-90')!.rows();
    expect(takeouts.find((r) => r.size === '2"')!.a).toBe('1 1/2"');
    const flanged = referenceTable('flanged-150')!.rows();
    expect(flanged.find((r) => r.size === '6"')!.a).toBe('8"');
    const support = referenceTable('support-water')!.rows();
    expect(support.find((r) => r.size === '4"')!.a).toBe('30');
  });

  // The rules that were found behind the tables carry into the app: the
  // takeout tables answer past where the print stops.
  test('the takeout tables answer the sizes the print stops short of', () => {
    const rows = referenceTable('takeout-90')!.rows();
    expect(rows.find((r) => r.size === '12"')).toBeDefined();
    expect(rows.find((r) => r.size === '12"')!.a).not.toBe('—');
  });

  describe('searching', () => {
    test('an empty query gives everything', () => {
      expect(searchReference('').length).toBe(REFERENCE_TABLES.length);
      expect(searchReference('   ').length).toBe(REFERENCE_TABLES.length);
    });

    test('a word finds the tables that carry it', () => {
      expect(searchReference('takeout').map((t) => t.id)).toContain('takeout-90');
      expect(searchReference('bolt').map((t) => t.id)).toContain('bolt-up-125');
      expect(searchReference('copper').map((t) => t.id)).toContain('copper-tube');
      expect(searchReference('support').map((t) => t.id)).toContain('support-water');
    });

    test('a page number finds its table', () => {
      expect(searchReference('4-51').map((t) => t.id)).toContain('bolt-up-125');
      expect(searchReference('2-63').map((t) => t.id)).toContain('reducer-template');
    });

    test('every word has to match', () => {
      const both = searchReference('gate valves');
      expect(both.length).toBeGreaterThan(1);
      for (const t of both) expect(t.group === 'Valves' || t.title.toLowerCase().includes('gate')).toBe(true);
      expect(searchReference('gate copper')).toEqual([]);
    });

    test('it does not care about case', () => {
      expect(searchReference('COPPER').length).toBe(searchReference('copper').length);
    });
  });
});
