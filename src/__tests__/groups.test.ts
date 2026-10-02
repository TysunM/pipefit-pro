import { GROUPS, PROJECT_TOOLS, RECORDABLE, START, TAB_TOOLS, TOOLS, group, groupTools, tool, type ToolRoute } from '../navigation/groups';

// The tabs, held honest
// ---------------------
// Seventeen tools are spread over the Tools tab, the Logs tab, the Projects page
// and the Calculator tab. The thing that goes wrong with that is quiet — a
// tool is added to the list and forgotten, or moved and left in two places —
// and nobody notices because every screen still looks right. Every one of
// those is a tool a man cannot reach, or finds twice.

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
  'PressureTests',
  'ShiftReport',
  'SimpleOffset',
  'RollingOffset',
  'CutLength',
  'SaddleBend',
  'MiterBend',
  'HandBender',
];

const routes = (xs: { route: ToolRoute }[]) => xs.map((x) => x.route);
const sorted = (xs: string[]) => [...xs].sort();
const reach = [...GROUPS.flatMap(groupTools), ...PROJECT_TOOLS, ...TAB_TOOLS];

describe('every tool is listed once', () => {
  test('the list holds all seventeen and nothing else', () => {
    expect(sorted(routes(TOOLS))).toEqual(sorted(EXPECTED));
    expect(new Set(routes(TOOLS)).size).toBe(TOOLS.length);
  });

  test('thread engagement is gone from the app', () => {
    expect(tool('ThreadEngagement')).toBeUndefined();
  });
});

describe('the tabs reach every tool, once', () => {
  test('tabs, the projects page and the calculator tab are the whole list', () => {
    expect(sorted(routes(reach))).toEqual(sorted(EXPECTED));
  });

  test('no tool is in two places', () => {
    expect(new Set(routes(reach)).size).toBe(reach.length);
  });

  test('every tab id resolves, and no section is empty', () => {
    for (const g of GROUPS) {
      expect(group(g.id)?.id).toBe(g.id);
      for (const s of g.sections) expect(s.tools.length).toBeGreaterThan(0);
    }
  });

  test('tools: the iso paper, the spool, the bolt-up and the level, then every bend and offset', () => {
    const g = group('tools');
    expect(routes(g?.sections[0]?.tools ?? [])).toEqual(['IsoSketch', 'SpoolBuilder', 'FlangeBoltUp', 'Level']);
    expect(routes(g?.sections[1]?.tools ?? [])).toEqual(['SimpleOffset', 'RollingOffset', 'CutLength', 'SaddleBend', 'MiterBend', 'HandBender']);
  });

  test('logs: the tests, the joint log, the heat book, the shift report and the handbook', () => {
    expect(sorted(routes(groupTools(group('logs')!)))).toEqual(sorted(['PressureTests', 'Joints', 'Heats', 'ShiftReport', 'Reference']));
  });

  test('small tiles come in whole rows', () => {
    for (const g of GROUPS) for (const s of g.sections) if (s.size === 'small') expect(s.tools.length % 2).toBe(0);
  });
});

describe('the home screen', () => {
  test('remembers every tool but the calculator, which is its own tab', () => {
    expect(RECORDABLE.has('Calculator')).toBe(false);
    for (const r of EXPECTED.filter((x) => x !== 'Calculator')) expect(RECORDABLE.has(r)).toBe(true);
  });

  test('never remembers a tab, settings or home', () => {
    for (const r of ['Home', 'Group', 'Projects', 'Settings', 'IsoDraw', 'ReferenceTable']) expect(RECORDABLE.has(r)).toBe(false);
  });

  test('starts with four tools it could also have remembered', () => {
    expect(START).toHaveLength(4);
    for (const x of START) expect(RECORDABLE.has(x.route)).toBe(true);
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

  test('the joint log is called the joint log', () => {
    expect(tool('Joints')?.title).toBe('Joint log');
  });

  test('a subtitle fits the two lines a tile gives it', () => {
    for (const t of TOOLS) expect(t.subtitle.length).toBeLessThanOrEqual(40);
  });
});
