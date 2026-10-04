import { clearTakeout, emptyLibrary, lookup, parseLibrary, serialiseLibrary, setTakeout } from '../state/fittingLibrary';
import { solveCutLength } from '../calc/cutLength';
import { LIBRARY_FITTINGS, TAKEOFF_FAMILIES, endHasGap, optionsForFamily } from '../calc/takeoffCatalog';

const T = 1_760_000_000_000;

describe('the fitting library', () => {
  test('a takeout set once is found again, for that line and size only', () => {
    let l = setTakeout(emptyLibrary(), 'pvc:40', 'sock90', 2, 1.125, T);
    l = setTakeout(l, 'pvc:80', 'sock90', 2, 1.25, T + 1);
    expect(lookup(l, 'pvc:40', 'sock90', 2)).toBe(1.125);
    expect(lookup(l, 'pvc:80', 'sock90', 2)).toBe(1.25);
    expect(lookup(l, 'pvc:40', 'sock90', 3)).toBeUndefined();
  });

  test('set again replaces; removed is gone; nonsense is refused', () => {
    let l = setTakeout(emptyLibrary(), 'ci-soil:CISPI', 'nh14', 4, 5.5, T);
    l = setTakeout(l, 'ci-soil:CISPI', 'nh14', 4, 5.625, T + 1);
    expect(l.entries).toHaveLength(1);
    expect(lookup(l, 'ci-soil:CISPI', 'nh14', 4)).toBe(5.625);
    expect(setTakeout(l, 'ci-soil:CISPI', 'nh14', 4, NaN, T)).toBe(l);
    expect(setTakeout(l, 'ci-soil:CISPI', 'nh14', 4, -1, T)).toBe(l);
    expect(lookup(clearTakeout(l, 'ci-soil:CISPI', 'nh14', 4), 'ci-soil:CISPI', 'nh14', 4)).toBeUndefined();
  });

  test('survives storage, and drops what does not read', () => {
    const l = setTakeout(emptyLibrary(), 'cpvc:80', 'sockTee', 1.5, 0.9375, T);
    expect(parseLibrary(serialiseLibrary(l)).entries).toEqual(l.entries);
    const bad = JSON.stringify({ version: 1, entries: [l.entries[0], { key: 'x', takeout: 1, setAt: T }, { key: 'pvc:40|sock90|2', takeout: 'a', setAt: T }] });
    expect(parseLibrary(bad)).toMatchObject({ dropped: 2 });
    expect(parseLibrary(JSON.stringify({ version: 9, entries: [] })).foreign).toBe(true);
    expect(parseLibrary('not json').dropped).toBe(1);
  });
});

describe('socket and no-hub in cut length', () => {
  const lib = setTakeout(setTakeout(emptyLibrary(), 'pvc:40', 'sock90', 2, 1.125, T), 'ci-soil:CISPI', 'nh18', 4, 3.125, T);
  const library = (line: string) => (id: string, nps: number) => lookup(lib, line, id, nps);
  const base = { customA: 0, customB: 0, kind: 'LR' as const, schedule: '40' as const };

  test('each family offers its fittings', () => {
    expect(TAKEOFF_FAMILIES.map((f) => f.id)).toEqual(expect.arrayContaining(['socket', 'nohub']));
    for (const f of LIBRARY_FITTINGS) expect(optionsForFamily(f.family).map((o) => o.id)).toContain(f.id);
  });

  test('a PVC socket run: pipe bottoms in the socket, nothing added', () => {
    const r = solveCutLength({ ...base, centerToCenter: 48, endA: 'sock90', endB: 'sock90', gap: 0.0625, nps: 2, library: library('pvc:40') });
    expect(r.valid).toBe(true);
    expect(r.gapEnds).toBe(0);
    expect(r.pipeCut).toBeCloseTo(48 - 2 * 1.125, 9);
  });

  test('a no-hub run takes the coupling centre stop at each end', () => {
    expect(endHasGap('nh18')).toBe(true);
    const r = solveCutLength({ ...base, centerToCenter: 60, endA: 'nh18', endB: 'nh18', gap: 0.125, nps: 4, library: library('ci-soil:CISPI') });
    expect(r.pipeCut).toBeCloseTo(60 - 2 * 3.125 - 2 * 0.125, 9);
  });

  test('a fitting not yet set says so, rather than guessing', () => {
    const r = solveCutLength({ ...base, centerToCenter: 48, endA: 'sock45', endB: 'sock90', gap: 0, nps: 2, library: library('pvc:40') });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Set this fitting/);
    // Sch 80 is its own line: the Sch 40 figure never stands in for it.
    expect(solveCutLength({ ...base, centerToCenter: 48, endA: 'sock90', endB: 'sock90', gap: 0, nps: 2, library: library('pvc:80') }).valid).toBe(false);
  });
});
