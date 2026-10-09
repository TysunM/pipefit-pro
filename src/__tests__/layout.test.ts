import { GROUPS, PROJECT_CARDS, START } from '../navigation/groups';
import { TAB_ORDER } from '../navigation/tabs';
import {
  EMPTY_LAYOUT,
  HOME_ZONE,
  LAYOUT_VERSION,
  PROJECTS_ZONE,
  TABS_ZONE,
  ZONES,
  applyOrder,
  edgeScroll,
  isCustomised,
  isZone,
  moveId,
  moveItem,
  nearestSlot,
  normaliseOrder,
  orderOf,
  parseLayout,
  previewFrames,
  sectionZone,
  serialiseLayout,
  shippedOrder,
  stackGap,
  withOrder,
  type Layout,
  type Rect,
} from '../state/layout';

// Where things stand
// ------------------
// A man drags a tab along the bar or a tile along its section and expects to
// find it there tomorrow, on every screen, and after an update that added a
// tool. What goes wrong with that is quiet: a saved order that names a tool
// that is gone, or misses one that is new, or a zone whose id changed, and a
// tile that is nowhere or twice.

const store = (zones: Record<string, unknown>) => JSON.stringify({ version: LAYOUT_VERSION, zones });

describe('the zones', () => {
  test('the tabs, the home page, the projects cards and every section are zones', () => {
    expect(isZone(TABS_ZONE)).toBe(true);
    expect(isZone(HOME_ZONE)).toBe(true);
    expect(isZone(PROJECTS_ZONE)).toBe(true);
    for (const g of GROUPS) for (const s of g.sections) expect(isZone(sectionZone(g.id, s.id))).toBe(true);
    expect(isZone('tools')).toBe(false);
    expect(isZone('tools.nothing')).toBe(false);
  });

  test('each zone ships with the order its own list gives, every id once', () => {
    expect(shippedOrder(TABS_ZONE)).toEqual(TAB_ORDER);
    expect(shippedOrder(HOME_ZONE)).toEqual(START.map((t) => t.route));
    expect(shippedOrder(PROJECTS_ZONE)).toEqual(PROJECT_CARDS);
    for (const g of GROUPS) for (const s of g.sections) expect(shippedOrder(sectionZone(g.id, s.id))).toEqual(s.tools.map((t) => t.route));
    for (const order of Object.values(ZONES)) expect(new Set(order).size).toBe(order.length);
    expect(shippedOrder('nowhere')).toEqual([]);
  });

  test('a zone holds at least two things, or there is nothing to move', () => {
    for (const order of Object.values(ZONES)) expect(order.length).toBeGreaterThanOrEqual(2);
  });
});

describe('a stored order made good', () => {
  const shipped = ['a', 'b', 'c', 'd'];

  test('kept as stored when it is whole', () => {
    expect(normaliseOrder(['d', 'c', 'b', 'a'], shipped)).toEqual(['d', 'c', 'b', 'a']);
  });

  test('an id the zone does not hold is dropped, and a repeat with it', () => {
    expect(normaliseOrder(['c', 'x', 'a', 'c', 'b', 'd'], shipped)).toEqual(['c', 'a', 'b', 'd']);
  });

  test('what was left out comes after, in shipped order', () => {
    expect(normaliseOrder(['d', 'b'], shipped)).toEqual(['d', 'b', 'a', 'c']);
  });

  test('anything that is not an id is skipped', () => {
    expect(normaliseOrder([3, null, 'b', {}, 'a'], shipped)).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('putting items in a stored order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const idOf = (x: { id: string }) => x.id;

  test('follows the order', () => {
    expect(applyOrder(items, idOf, ['c', 'a', 'd', 'b']).map(idOf)).toEqual(['c', 'a', 'd', 'b']);
  });

  test('only part of a zone on screen still follows it', () => {
    expect(applyOrder(items.slice(1, 3), idOf, ['c', 'a', 'd', 'b']).map(idOf)).toEqual(['c', 'b']);
  });

  test('an item the order does not name keeps its place after the named ones', () => {
    expect(applyOrder([...items, { id: 'z' }, { id: 'y' }], idOf, ['b', 'a', 'c', 'd']).map(idOf)).toEqual(['b', 'a', 'c', 'd', 'z', 'y']);
  });
});

describe('moving one', () => {
  const list = ['a', 'b', 'c', 'd', 'e'];

  test('forward, and the ones between step back', () => {
    expect(moveItem(list, 1, 3)).toEqual(['a', 'c', 'd', 'b', 'e']);
  });

  test('back, and the ones between step forward', () => {
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c', 'e']);
  });

  test('to the ends', () => {
    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b', 'd', 'e']);
    expect(moveItem(list, 2, 4)).toEqual(['a', 'b', 'd', 'e', 'c']);
  });

  test('past the ends lands at the end; nowhere is nothing', () => {
    expect(moveItem(list, 0, 99)).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(moveItem(list, 4, -5)).toEqual(['e', 'a', 'b', 'c', 'd']);
    expect(moveItem(list, 2, 2)).toEqual(list);
    expect(moveItem(list, 9, 0)).toEqual(list);
    expect(moveItem(list, 9, 0)).not.toBe(list);
  });

  test('by id: a to where b stands', () => {
    expect(moveId(list, 'a', 'd')).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(moveId(list, 'e', 'b')).toEqual(['a', 'e', 'b', 'c', 'd']);
    expect(moveId(list, 'a', 'x')).toEqual(list);
    expect(moveId(list, 'x', 'a')).toEqual(list);
  });

  test('a move said on the part of a zone on screen lands in the whole order', () => {
    // The Home page shows the field tools not yet used: say b and d of a, b, c, d.
    const whole = ['a', 'b', 'c', 'd'];
    const shown = ['b', 'd'];
    const next = moveId(whole, shown[0] as string, shown[1] as string);
    expect(next).toEqual(['a', 'c', 'd', 'b']);
    expect(next.filter((x) => shown.includes(x))).toEqual(['d', 'b']);
  });
});

describe('the layout', () => {
  test('a zone is stored only while its order is not the shipped one', () => {
    const shipped = shippedOrder(TABS_ZONE);
    const moved = moveId(shipped, 'calc', 'edu');
    const l = withOrder(EMPTY_LAYOUT, TABS_ZONE, moved);
    expect(l.zones[TABS_ZONE]).toEqual(moved);
    expect(isCustomised(l)).toBe(true);
    const back = withOrder(l, TABS_ZONE, shipped);
    expect(back.zones[TABS_ZONE]).toBeUndefined();
    expect(isCustomised(back)).toBe(false);
  });

  test('setting what is already there changes nothing', () => {
    const l = withOrder(EMPTY_LAYOUT, PROJECTS_ZONE, [...PROJECT_CARDS].reverse());
    expect(withOrder(l, PROJECTS_ZONE, [...PROJECT_CARDS].reverse())).toBe(l);
    expect(withOrder(EMPTY_LAYOUT, PROJECTS_ZONE, PROJECT_CARDS)).toBe(EMPTY_LAYOUT);
    expect(withOrder(EMPTY_LAYOUT, 'no.such.zone', ['a'])).toBe(EMPTY_LAYOUT);
  });

  test('the order of a zone is the stored one made good, else the shipped one', () => {
    expect(orderOf(EMPTY_LAYOUT, HOME_ZONE)).toEqual(shippedOrder(HOME_ZONE));
    const l: Layout = { version: LAYOUT_VERSION, zones: { [HOME_ZONE]: ['Level', 'Gone', 'IsoSketch'] } };
    expect(orderOf(l, HOME_ZONE)).toEqual(['Level', 'IsoSketch', 'FlangeBoltUp', 'SpoolBuilder']);
  });

  test('the shipped tab order is Home, Calculator, Tools, Projects, Logs, Edu', () => {
    expect(orderOf(EMPTY_LAYOUT, TABS_ZONE)).toEqual(['home', 'calc', 'tools', 'projects', 'logs', 'edu']);
  });
});

describe('reading what was stored', () => {
  test('nothing, rubbish, a list, or another version is empty', () => {
    expect(parseLayout(null)).toEqual(EMPTY_LAYOUT);
    expect(parseLayout('')).toEqual(EMPTY_LAYOUT);
    expect(parseLayout('{nope')).toEqual(EMPTY_LAYOUT);
    expect(parseLayout('[]')).toEqual(EMPTY_LAYOUT);
    expect(parseLayout(JSON.stringify({ version: LAYOUT_VERSION + 1, zones: {} }))).toEqual(EMPTY_LAYOUT);
    expect(parseLayout(JSON.stringify({ version: LAYOUT_VERSION, zones: [] }))).toEqual(EMPTY_LAYOUT);
  });

  test('round trip', () => {
    const l = withOrder(withOrder(EMPTY_LAYOUT, TABS_ZONE, [...TAB_ORDER].reverse()), PROJECTS_ZONE, moveId(PROJECT_CARDS, 'Level', 'FlangeBoltUp'));
    expect(parseLayout(serialiseLayout(l))).toEqual(l);
  });

  test('a zone that is gone, or that is not a list, is dropped; the rest is kept', () => {
    const l = parseLayout(store({ 'tools.nothing': ['IsoSketch'], [HOME_ZONE]: 'IsoSketch', [TABS_ZONE]: ['edu', 'home'] }));
    expect(Object.keys(l.zones)).toEqual([TABS_ZONE]);
    expect(l.zones[TABS_ZONE]).toEqual(['edu', 'home', 'calc', 'tools', 'projects', 'logs']);
  });

  test('a stored order that comes to the shipped one is not kept as a change', () => {
    const l = parseLayout(store({ [TABS_ZONE]: ['home', 'calc', 'Gone', 'tools', 'projects', 'logs', 'edu'] }));
    expect(isCustomised(l)).toBe(false);
  });

  test('a tool added to a section in an update shows up at the end of a saved order', () => {
    const zone = sectionZone('tools', 'fitup');
    const was = shippedOrder(zone).filter((r) => r !== 'Measure').reverse();
    const l = parseLayout(store({ [zone]: was }));
    expect(l.zones[zone]).toEqual([...was, 'Measure']);
  });
});

describe('where a carried tile is', () => {
  const r = (x: number, y: number, width = 100, height = 100): Rect => ({ x, y, width, height });
  const row = [r(0, 0), r(100, 0), r(200, 0), r(300, 0)];
  const grid = [r(0, 0), r(110, 0), r(0, 110), r(110, 110), r(0, 220)];

  test('the nearest slot along a row, inside one or in the gap, and past either end', () => {
    expect(nearestSlot(row, { x: 50, y: 50 })).toBe(0);
    expect(nearestSlot(row, { x: 99, y: 50 })).toBe(0);
    expect(nearestSlot(row, { x: 101, y: 50 })).toBe(1);
    expect(nearestSlot(row, { x: 250, y: -300 })).toBe(2);
    expect(nearestSlot(row, { x: 900, y: 50 })).toBe(3);
    expect(nearestSlot(row, { x: -900, y: 50 })).toBe(0);
    const gapped = [r(0, 0), r(120, 0), r(240, 0)];
    expect(nearestSlot(gapped, { x: 109, y: 50 })).toBe(0);
    expect(nearestSlot(gapped, { x: 111, y: 50 })).toBe(1);
  });

  test('in a grid, the row first: the empty half of an odd last row lands on its one tile', () => {
    expect(nearestSlot(grid, { x: 160, y: 270 })).toBe(4);
    expect(nearestSlot(grid, { x: 160, y: 225 })).toBe(4);
    expect(nearestSlot(grid, { x: 160, y: 160 })).toBe(3);
    expect(nearestSlot(grid, { x: 20, y: 130 })).toBe(2);
    // In the gap between rows, the nearer row.
    expect(nearestSlot(grid, { x: 160, y: 103 })).toBe(1);
    expect(nearestSlot(grid, { x: 160, y: 107 })).toBe(3);
  });

  test('a tie goes to the earlier slot; no slots, no answer', () => {
    expect(nearestSlot(row, { x: 100, y: 50 })).toBe(0);
    expect(nearestSlot(grid, { x: 105, y: 105 })).toBe(0);
    expect(nearestSlot([], { x: 0, y: 0 })).toBe(-1);
  });

  test('in a row of slots, the others step into each other\'s places', () => {
    const f = previewFrames(row, 0, 2, 'slots');
    expect(f[0]).toEqual(row[2]);
    expect(f[1]).toEqual(row[0]);
    expect(f[2]).toEqual(row[1]);
    expect(f[3]).toEqual(row[3]);
    const b = previewFrames(row, 3, 1, 'slots');
    expect(b.map((x) => x.x)).toEqual([0, 200, 300, 100]);
  });

  const cards = [r(0, 0, 300, 100), r(0, 116, 300, 200), r(0, 332, 300, 50)];

  test('nothing moves when the tile is over its own slot', () => {
    expect(previewFrames(grid, 2, 2, 'slots')).toEqual(grid);
    expect(previewFrames(cards, 1, 1, 'stack')).toEqual(cards);
  });

  test('a stack of cards of their own heights is re-stacked from the top', () => {
    expect(stackGap(cards)).toBe(16);
    const f = previewFrames(cards, 2, 0, 'stack');
    expect(f[2]).toEqual({ x: 0, y: 0, width: 300, height: 50 });
    expect(f[0]).toEqual({ x: 0, y: 66, width: 300, height: 100 });
    expect(f[1]).toEqual({ x: 0, y: 182, width: 300, height: 200 });
    const g = previewFrames(cards, 0, 2, 'stack');
    expect(g.map((x) => x.y)).toEqual([282, 0, 216]);
  });

  test('the gap between stacked cards is read off where they were, and never negative', () => {
    expect(stackGap([])).toBe(0);
    expect(stackGap([r(0, 0)])).toBe(0);
    expect(stackGap([r(0, 0), r(0, 90)])).toBe(0);
    expect(stackGap([r(0, 0), r(0, 110), r(0, 230), r(0, 340)])).toBe(10);
  });

  test('the page scrolls under a finger in the edge band, gently just inside it and fastest at the edge, and not otherwise', () => {
    expect(edgeScroll(300, 800, 96, 14)).toBe(0);
    expect(edgeScroll(96, 800, 96, 14)).toBe(0);
    expect(edgeScroll(48, 800, 96, 14)).toBeCloseTo(-3.5);
    expect(edgeScroll(0, 800, 96, 14)).toBe(-14);
    expect(edgeScroll(-50, 800, 96, 14)).toBe(-14);
    expect(edgeScroll(752, 800, 96, 14)).toBeCloseTo(3.5);
    expect(edgeScroll(900, 800, 96, 14)).toBe(14);
    expect(edgeScroll(10, 0, 96, 14)).toBe(0);
  });
});
