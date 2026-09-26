import { GROUPS, HOME, HOME_TOOLS, TOOLS, group, tool, type ToolRoute } from '../navigation/groups';

// The front page and the tabs, held honest
// ----------------------------------------
// Fifteen tools are cut two ways: into the sections of the front page, and
// into the three tabs. The thing that goes wrong with that is quiet — a tool
// is added to the list and forgotten in one cut, or moved and left in two
// places — and nobody notices because both screens still look right. Every
// one of those is a tool a man cannot reach, or finds twice.

/** Every route the app can open a tool at. Kept here so it is stated twice. */
const EXPECTED: ToolRoute[] = [
  'Calculator',
  'Level',
  'Reference',
  'SpoolBuilder',
  'OrderSheet',
  'IsoSketch',
  'FlangeBoltUp',
  'Joints',
  'Heats',
  'SimpleOffset',
  'RollingOffset',
  'CutLength',
  'SaddleBend',
  'MiterBend',
  'HandBender',
];

const routes = (xs: { route: ToolRoute }[]) => xs.map((x) => x.route);
const sorted = (xs: string[]) => [...xs].sort();

describe('every tool is listed once', () => {
  test('the list holds all fifteen and nothing else', () => {
    expect(sorted(routes(TOOLS))).toEqual(sorted(EXPECTED));
    expect(new Set(routes(TOOLS)).size).toBe(TOOLS.length);
  });

  test('thread engagement is gone from the app', () => {
    expect(TOOLS.some((t) => String(t.route) === 'ThreadEngagement')).toBe(false);
    expect(tool('ThreadEngagement')).toBeUndefined();
  });
});

describe('the front page reaches every tool, once', () => {
  test('its sections together are the whole list', () => {
    expect(sorted(routes(HOME_TOOLS))).toEqual(sorted(EXPECTED));
  });

  test('no tool is on it twice', () => {
    expect(new Set(routes(HOME_TOOLS)).size).toBe(HOME_TOOLS.length);
  });

  test('the two big columns pair up row for row', () => {
    expect(HOME.work).toHaveLength(HOME.records.length);
  });

  test('work tools down the left, records and look-ups down the right', () => {
    expect(routes(HOME.work)).toEqual(['Calculator', 'Level', 'SpoolBuilder', 'FlangeBoltUp']);
    expect(routes(HOME.records)).toEqual(['Reference', 'OrderSheet', 'Joints', 'Heats']);
  });

  test('the everyday calculations fill whole rows of small tiles', () => {
    expect(routes(HOME.calcs)).toEqual(['SimpleOffset', 'RollingOffset', 'CutLength', 'SaddleBend', 'MiterBend', 'HandBender']);
    expect(HOME.calcs.length % 2).toBe(0);
  });
});

describe('the tabs reach every tool, once', () => {
  test('together they are the whole list', () => {
    expect(sorted(GROUPS.flatMap((g) => routes(g.tools)))).toEqual(sorted(EXPECTED));
  });

  test('no tool is under two tabs', () => {
    const all = GROUPS.flatMap((g) => routes(g.tools));
    expect(new Set(all).size).toBe(all.length);
  });

  test('every tab id resolves, and none is empty', () => {
    for (const g of GROUPS) {
      expect(group(g.id)?.id).toBe(g.id);
      expect(g.tools.length).toBeGreaterThan(1);
    }
  });

  test('the records are one tab: the order, the joints, their heats and the isos', () => {
    expect(routes(group('projects')?.tools ?? [])).toEqual(['OrderSheet', 'Joints', 'Heats', 'IsoSketch']);
  });

  test('the calculations tab is the same set as the front page foot', () => {
    expect(routes(group('calcs')?.tools ?? [])).toEqual(routes(HOME.calcs));
  });
});

describe('every tile says what it is', () => {
  test('nothing is untitled or unexplained', () => {
    for (const t of TOOLS) {
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.subtitle.trim().length).toBeGreaterThan(0);
    }
    for (const g of GROUPS) {
      expect(g.title.trim().length).toBeGreaterThan(0);
      expect(g.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  test('two tiles never carry the same name', () => {
    const names = TOOLS.map((t) => t.title);
    expect(new Set(names).size).toBe(names.length);
  });

  test('no tab repeats a tool name as its own', () => {
    for (const g of GROUPS) for (const x of g.tools) expect(x.title).not.toBe(g.title);
  });

  test('a subtitle fits the two lines a tile gives it', () => {
    // About twenty-two characters a line at the tile width on a small phone.
    for (const t of TOOLS) expect(t.subtitle.length).toBeLessThanOrEqual(40);
  });
});
