import { HOME, RECORDABLE, TOOLS, group, tool, type ToolRoute } from '../navigation/groups';

// The home screen, held honest
// ----------------------------
// Fourteen tools sit behind six cards, and the thing that goes wrong with that
// is quiet: a tool is added to the list and forgotten in a group, or moved to
// one group and left in another, and nobody notices because the home screen
// still looks right. Every one of those is a tool a man cannot reach.

/** Every route the app can open a tool at. Kept here so it is stated twice. */
const EXPECTED: ToolRoute[] = [
  'Calculator',
  'Level',
  'Reference',
  'SpoolBuilder',
  'OrderSheet',
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

describe('every tool is reachable', () => {
  test('the home screen leads to all fourteen, and to nothing else', () => {
    expect([...TOOLS.map((t) => t.route)].sort()).toEqual([...EXPECTED].sort());
  });

  test('no tool is in two places at once', () => {
    const routes = TOOLS.map((t) => t.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  test('a group card leads somewhere — none is empty', () => {
    for (const e of HOME) if (e.kind === 'group') expect(e.tools.length).toBeGreaterThan(1);
  });

  test('every group id on the home screen resolves', () => {
    for (const e of HOME) if (e.kind === 'group') expect(group(e.id)?.id).toBe(e.id);
  });

  test('a group wears the drawing of a tool it actually contains', () => {
    for (const e of HOME) {
      if (e.kind !== 'group') continue;
      expect(e.tools.map((x) => x.route)).toContain(e.art);
    }
  });
});

describe('the grouping follows the work', () => {
  test('offsets, bends and the cut length are one card', () => {
    expect(group('offsets')?.tools.map((t) => t.route)).toEqual([
      'SimpleOffset',
      'RollingOffset',
      'CutLength',
      'SaddleBend',
      'MiterBend',
      'HandBender',
    ]);
  });

  test('the bolt-up keeps the joints it made and the heats in them', () => {
    // The heat book counts traceability against the joint register, so it is
    // no use on a card away from it.
    expect(group('flanges')?.tools.map((t) => t.route)).toEqual(['FlangeBoltUp', 'Joints', 'Heats']);
  });

  test('the spool keeps the order sheet built from it', () => {
    expect(group('spool')?.tools.map((t) => t.route)).toEqual(['SpoolBuilder', 'OrderSheet']);
  });

  test('thread engagement is gone from the app', () => {
    expect(TOOLS.some((t) => String(t.route) === 'ThreadEngagement')).toBe(false);
  });
});

describe('every card says what it is', () => {
  test('nothing is untitled or unexplained', () => {
    for (const t of TOOLS) {
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.subtitle.trim().length).toBeGreaterThan(0);
    }
    for (const e of HOME) {
      if (e.kind !== 'group') continue;
      expect(e.title.trim().length).toBeGreaterThan(0);
      expect(e.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  test('no row inside a group repeats the heading above it', () => {
    for (const e of HOME) {
      if (e.kind !== 'group') continue;
      for (const x of e.tools) expect(x.title).not.toBe(e.title);
    }
  });

  test('two cards on one screen never carry the same name', () => {
    const top = HOME.map((e) => (e.kind === 'tool' ? e.tool.title : e.title));
    expect(new Set(top).size).toBe(top.length);
    for (const e of HOME) {
      if (e.kind !== 'group') continue;
      const inner = e.tools.map((x) => x.title);
      expect(new Set(inner).size).toBe(inner.length);
    }
  });
});

describe('what the last-used strip will record', () => {
  test('it records exactly the tools, so a tool added later counts on its own', () => {
    expect([...RECORDABLE].sort()).toEqual([...EXPECTED].sort());
  });

  test('a screen that is not a tool never takes a slot', () => {
    for (const r of ['Home', 'Group', 'Settings', 'ReferenceTable']) expect(RECORDABLE.has(r)).toBe(false);
  });

  test('a route can be looked up by name, and an unknown one is not invented', () => {
    expect(tool('Calculator')?.title).toBe('Calculator');
    expect(tool('ThreadEngagement')).toBeUndefined();
  });
});
