import { OrderSpool, markFor, planOrder } from '../calc/orderSheet';

const STOCK = 240;
const KERF = 0.125;

const spool = (over: Partial<OrderSpool> & { id: string; cuts: number[] }): OrderSpool => ({
  name: over.id.toUpperCase(),
  place: '',
  nps: 2,
  kind: 'LR',
  schedule: '40',
  ...over,
});

const plan = (spools: OrderSpool[]) => planOrder(spools, STOCK, KERF);
const only = (spools: OrderSpool[]) => {
  const o = plan(spools);
  expect(o.groups).toHaveLength(1);
  return o.groups[0]!;
};

describe('marks run out of letters gracefully', () => {
  test('the first twenty six are single letters', () => {
    expect(markFor(0)).toBe('A');
    expect(markFor(25)).toBe('Z');
  });

  test('and then they double, rather than repeating', () => {
    expect(markFor(26)).toBe('AA');
    expect(markFor(27)).toBe('AB');
    expect(markFor(51)).toBe('AZ');
    expect(markFor(52)).toBe('BA');
  });

  test('every mark up to the shelf cap is different', () => {
    // Two spools under one stamp is worse than an ugly stamp.
    const seen = new Set(Array.from({ length: 100 }, (_, i) => markFor(i)));
    expect(seen.size).toBe(100);
  });
});

describe('pooling is the point', () => {
  test('two spools that each waste half a stick share one', () => {
    // 100 inches each: apart that is two sticks, together it is one.
    const o = only([spool({ id: 'a', cuts: [100] }), spool({ id: 'b', cuts: [100] })]);
    expect(o.apart).toBe(2);
    expect(o.together).toBe(1);
    expect(o.saved).toBe(1);
  });

  test('the sheet never claims to buy more than ordering apart would', () => {
    const o = plan([
      spool({ id: 'a', cuts: [140, 60] }),
      spool({ id: 'b', cuts: [90, 90, 40] }),
      spool({ id: 'c', cuts: [200] }),
    ]);
    expect(o.sticks).toBeLessThanOrEqual(o.apart);
    expect(o.saved).toBe(o.apart - o.sticks);
  });

  test('spools that already fill their sticks save nothing, and say so', () => {
    // Each of these is a stick to itself with nothing worth sharing.
    const o = plan([spool({ id: 'a', cuts: [239] }), spool({ id: 'b', cuts: [239] })]);
    expect(o.saved).toBe(0);
    expect(o.sticks).toBe(2);
  });
});

describe('pipe does not pool across what you buy', () => {
  test('two sizes are two groups', () => {
    const o = plan([spool({ id: 'a', nps: 2, cuts: [100] }), spool({ id: 'b', nps: 4, cuts: [100] })]);
    expect(o.groups).toHaveLength(2);
    expect(o.saved).toBe(0);
  });

  test('two schedules of one size are two groups', () => {
    const o = plan([
      spool({ id: 'a', schedule: '40', cuts: [100] }),
      spool({ id: 'b', schedule: '80', cuts: [100] }),
    ]);
    expect(o.groups).toHaveLength(2);
    expect(o.groups.every((g) => g.together === 1)).toBe(true);
  });

  test('but two radii of one size and schedule are one group', () => {
    // The elbow changes the takeout and so the cut. It does not change the
    // pipe the cut comes off.
    const o = plan([
      spool({ id: 'a', kind: 'LR', cuts: [100] }),
      spool({ id: 'b', kind: 'SR', cuts: [100] }),
    ]);
    expect(o.groups).toHaveLength(1);
    expect(o.saved).toBe(1);
  });

  test('the biggest pipe is listed first', () => {
    const o = plan([
      spool({ id: 'a', nps: 2, cuts: [50] }),
      spool({ id: 'b', nps: 8, cuts: [50] }),
      spool({ id: 'c', nps: 4, cuts: [50] }),
    ]);
    expect(o.groups.map((g) => g.nps)).toEqual([8, 4, 2]);
  });
});

describe('every piece stays findable', () => {
  test('each piece carries its spool mark and leg number', () => {
    const g = only([spool({ id: 'a', name: 'Ridge', cuts: [90, 80] }), spool({ id: 'b', name: 'Drop', cuts: [60] })]);
    const tags = g.plan.ok ? g.plan.sticks.flatMap((s) => s.pieces.map((p) => p.tag)) : [];
    expect(tags.sort()).toEqual(['A1', 'A2', 'B1']);
  });

  test('the long label names the spool, so the sheet reads without the key', () => {
    const g = only([spool({ id: 'a', name: 'Ridge', cuts: [90] })]);
    const labels = g.plan.ok ? g.plan.sticks.flatMap((s) => s.pieces.map((p) => p.label)) : [];
    expect(labels).toEqual(['A1 · Ridge leg 1']);
  });

  test('no piece is lost or duplicated in the pooling', () => {
    const spools = [
      spool({ id: 'a', cuts: [90, 80, 30] }),
      spool({ id: 'b', cuts: [60, 60] }),
      spool({ id: 'c', cuts: [120] }),
    ];
    const g = only(spools);
    const ids = g.plan.ok ? g.plan.sticks.flatMap((s) => s.pieces.map((p) => p.id)) : [];
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  test('marks are handed out in order, with no gaps where a spool was dropped', () => {
    const o = plan([
      spool({ id: 'a', cuts: [50] }),
      spool({ id: 'bad', cuts: [], problem: 'Leg 2 is too short for its fittings.' }),
      spool({ id: 'c', cuts: [50] }),
    ]);
    expect(o.groups[0]!.lines.map((l) => l.mark)).toEqual(['A', 'B']);
    expect(o.skipped.map((s) => s.id)).toEqual(['bad']);
  });
});

describe('what cannot be ordered is said, not hidden', () => {
  test('a spool that will not build is skipped with its reason', () => {
    const o = plan([spool({ id: 'bad', cuts: [], problem: 'Leg 1 is too short for its fittings.' })]);
    expect(o.spools).toBe(0);
    expect(o.skipped).toEqual([{ id: 'bad', name: 'BAD', why: 'Leg 1 is too short for its fittings.' }]);
  });

  test('a spool with no cuts is skipped too', () => {
    const o = plan([spool({ id: 'empty', cuts: [] })]);
    expect(o.skipped[0]!.why).toBe('It has no cuts to order.');
  });

  test('a piece longer than a stick fails the group rather than rounding it away', () => {
    const g = only([spool({ id: 'a', cuts: [300] })]);
    expect(g.plan.ok).toBe(false);
    expect(g.together).toBe(0);
  });

  test('and a failed group claims no saving', () => {
    // apart minus zero would report the whole order as money saved on a sheet
    // that cannot be ordered at all.
    const g = only([spool({ id: 'a', cuts: [300] }), spool({ id: 'b', cuts: [300] })]);
    expect(g.saved).toBe(0);
    expect(g.apart).toBe(0);
  });

  test('a good group is unaffected by a bad one beside it', () => {
    const o = plan([spool({ id: 'a', nps: 2, cuts: [100] }), spool({ id: 'b', nps: 4, cuts: [300] })]);
    const two = o.groups.find((g) => g.nps === 2)!;
    expect(two.plan.ok).toBe(true);
    expect(two.together).toBe(1);
    expect(o.sticks).toBe(1);
  });
});

describe('the totals are the groups added up', () => {
  test('sticks, pieces and spools all agree with the lines', () => {
    const o = plan([
      spool({ id: 'a', nps: 2, cuts: [90, 80] }),
      spool({ id: 'b', nps: 2, cuts: [60] }),
      spool({ id: 'c', nps: 6, cuts: [120, 40] }),
    ]);
    expect(o.spools).toBe(3);
    expect(o.pieces).toBe(5);
    expect(o.sticks).toBe(o.groups.reduce((t, g) => t + g.together, 0));
    expect(o.apart).toBe(o.groups.reduce((t, g) => t + g.apart, 0));
  });

  test('bought is the sticks times the stock, and never less than the job', () => {
    const o = plan([spool({ id: 'a', cuts: [90, 80] }), spool({ id: 'b', cuts: [60] })]);
    expect(o.bought).toBeCloseTo(o.sticks * STOCK, 9);
    expect(o.bought).toBeGreaterThanOrEqual(o.inTheJob);
  });

  test('an empty sheet is empty rather than an error', () => {
    const o = plan([]);
    expect(o.groups).toHaveLength(0);
    expect(o.sticks).toBe(0);
    expect(o.saved).toBe(0);
    expect(o.best).toBe(false);
  });
});

describe('the saving is real arithmetic, not a different method', () => {
  test('pooling six spools buys fewer sticks than ordering them one at a time', () => {
    const cuts = [[96, 84], [72, 66, 30], [120], [48, 48, 48], [110, 55], [90, 36]];
    const o = plan(cuts.map((c, i) => spool({ id: `s${i}`, cuts: c })));
    expect(o.apart).toBeGreaterThan(o.sticks);
    expect(o.saved).toBeGreaterThan(0);
  });

  test('a spool alone on the sheet is exactly its own cut list', () => {
    // If pooling one spool disagreed with that spool's own screen, one of the
    // two would be lying.
    const g = only([spool({ id: 'a', cuts: [96, 84, 40] })]);
    expect(g.together).toBe(g.lines[0]!.alone);
  });

  test('adding a spool never makes the order bigger than doing it separately', () => {
    const base = [spool({ id: 'a', cuts: [140, 60] }), spool({ id: 'b', cuts: [90, 90] })];
    for (let extra = 30; extra <= 210; extra += 15) {
      const o = plan([...base, spool({ id: 'x', cuts: [extra] })]);
      expect(o.sticks).toBeLessThanOrEqual(o.apart);
    }
  });
});

describe('a spool that cannot be cut is named, not just counted', () => {
  test('the error names the mark and the spool, so it can be found and taken off', () => {
    // One over-long piece fails the whole group it is in, which is honest —
    // but a group that just said "cannot be ordered" would leave a man
    // hunting. The mark in the message is what makes it a two-tap fix.
    const g = only([
      spool({ id: 'good', name: 'Header', cuts: [100] }),
      spool({ id: 'bad', name: 'Long run', cuts: [300] }),
    ]);
    expect(g.plan.ok).toBe(false);
    if (!g.plan.ok) {
      expect(g.plan.error).toContain('B1');
      expect(g.plan.error).toContain('Long run');
    }
  });

  test('and taking it off leaves the rest orderable', () => {
    const o = plan([spool({ id: 'good', cuts: [100] })]);
    expect(o.sticks).toBe(1);
  });
});

describe('it stays quick at the size of the whole shelf', () => {
  test('a hundred spools plan in well under a frame budget', () => {
    // Every tap on the pick list re-plans. A screen that stalls on the shelf
    // it was built for is a screen nobody uses twice.
    const spools: OrderSpool[] = Array.from({ length: 100 }, (_, i) => ({
      id: `s${i}`,
      name: `Spool ${i}`,
      place: '',
      nps: [2, 4, 6][i % 3]!,
      kind: 'LR' as const,
      schedule: (['40', '80'] as const)[i % 2]!,
      cuts: Array.from({ length: 2 + (i % 7) }, (_, j) => 24 + ((i * 13 + j * 29) % 110)),
    }));
    const started = Date.now();
    const o = planOrder(spools, STOCK, KERF);
    expect(Date.now() - started).toBeLessThan(500);
    expect(o.spools).toBe(100);
    expect(o.sticks).toBeLessThanOrEqual(o.apart);
  });
});
