import { CRITICAL, GEAR_KINDS, HEAVY, checkGear, isCritical, itemLabel, legTensions, type GearItem } from '../calc/gear';

const sling = (rated: number | null, hitch: GearItem['hitch'] = 'vertical'): GearItem => ({ id: `s${hitch}`, kind: 'sling', hitch, rated });

describe('the gear check', () => {
  test('two legs at 60°: each leg is half the load times 1.155', () => {
    const legs = legTensions(2000, 2, 60);
    expect(legs).toHaveLength(2);
    for (const l of legs) expect(l).toBeCloseTo(1000 / Math.sin(Math.PI / 3), 6);
    expect(legTensions(0, 2, 60)).toEqual([]);
    expect(legTensions(1000, 2, 0)).toEqual([]);
  });
  test('a piece on each leg carries the heaviest leg; a piece in line carries the load and the rigging', () => {
    const r = checkGear({ load: 2000, rigging: 100, legs: [900, 1300], items: [sling(2000), { id: 'h', kind: 'hook', rated: 4000 }] });
    expect(r.hookLoad).toBe(2100);
    expect(r.lines[0]!.force).toBe(1300);
    expect(r.lines[1]!.force).toBe(2100);
    expect(r.lines[0]!.pct).toBeCloseTo(0.65, 6);
  });
  test('a basket carries two legs, against the basket rating', () => {
    const r = checkGear({ load: 1000, rigging: 0, legs: [600, 600], items: [sling(3000, 'basket')] });
    expect(r.lines[0]!.force).toBe(1200);
    expect(r.lines[0]!.pct).toBeCloseTo(0.4, 6);
    expect(r.lines[0]!.notes.join(' ')).toMatch(/two legs/);
  });
  test('the weakest piece is the one working hardest; over its tag is called out; heavy at 90%', () => {
    const r = checkGear({
      load: 2000,
      rigging: 0,
      legs: [1155, 1155],
      items: [sling(2000), { id: 'sh', kind: 'shackle', rated: 1200 }, { id: 'h', kind: 'hook', rated: 6000 }, { id: 'e', kind: 'eyebolt', rated: null }],
    });
    expect(r.weakest).toBe(1);
    expect(r.lines[1]!.status).toBe('heavy');
    expect(r.lines[1]!.pct!).toBeGreaterThanOrEqual(HEAVY);
    expect(r.over).toBe(false);
    expect(r.unrated).toBe(1);
    expect(r.lines[3]!.status).toBe('unrated');
    const over = checkGear({ load: 2000, rigging: 0, legs: [1155, 1155], items: [{ id: 'sh', kind: 'shackle', rated: 1000 }] });
    expect(over.over).toBe(true);
    expect(over.lines[0]!.status).toBe('over');
  });
  test('a tight choke and an eyebolt say why their rating comes down', () => {
    const r = checkGear({ load: 500, rigging: 0, legs: [500], items: [{ id: 'c', kind: 'sling', hitch: 'choker', rated: 1000, tightChoke: true }, { id: 'e', kind: 'eyebolt', rated: 1000 }] });
    expect(r.lines[0]!.notes.join(' ')).toMatch(/tighter than 120°/);
    expect(r.lines[1]!.notes.join(' ')).toMatch(/angle/);
    expect(itemLabel(r.lines[0]!.item)).toBe('Sling, choker hitch');
  });
  test('every kind says where it sits; a lift with any critical answer is critical', () => {
    for (const k of Object.values(GEAR_KINDS)) expect(['leg', 'hook']).toContain(k.where);
    expect(isCritical({})).toBe(false);
    expect(isCritical({ capacity: true })).toBe(true);
    expect(CRITICAL.some((q) => /people/i.test(q.text))).toBe(true);
  });
});
