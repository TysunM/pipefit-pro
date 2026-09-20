import { CutPiece, EXACT_UP_TO, fewestPossible, planCuts } from '../calc/cutList';

const piece = (label: string, length: number): CutPiece => ({ id: label, label, length });
const pieces = (lengths: number[]): CutPiece[] => lengths.map((l, i) => piece(`Leg ${i + 1}`, l));
const plan = (lengths: number[], stock = 240, kerf = 0) => planCuts(pieces(lengths), stock, kerf);

const ok = (p: ReturnType<typeof plan>) => {
  if (!p.ok) throw new Error(p.error);
  return p;
};

describe('a plan is refused rather than guessed at', () => {
  test('no stock length', () => {
    expect(plan([40], 0)).toEqual({ ok: false, error: 'Set a stock length in Settings.' });
    expect(plan([40], NaN)).toEqual({ ok: false, error: 'Set a stock length in Settings.' });
  });

  test('nothing to cut', () => {
    expect(plan([])).toEqual({ ok: false, error: 'Nothing to cut yet.' });
    expect(plan([0, -4, NaN])).toEqual({ ok: false, error: 'Nothing to cut yet.' });
  });

  test('a piece longer than a stick is named, with both figures', () => {
    const p = plan([253], 240);
    expect(p.ok).toBe(false);
    if (!p.ok) {
      expect(p.error).toContain('Leg 1');
      expect(p.error).toContain('253.00');
      expect(p.error).toContain('240.00');
    }
  });

  test('a piece that only fails once the saw is counted still fails', () => {
    expect(plan([240], 240, 0).ok).toBe(true);
    expect(plan([240], 240, 0.125).ok).toBe(false);
  });

  test('a piece too short to be a piece is dropped, not counted', () => {
    const p = ok(plan([40, 0, 60]));
    expect(p.sticks.flatMap((s) => s.pieces)).toHaveLength(2);
  });
});

describe('the count is the fewest sticks, not merely a good one', () => {
  test('what fits on one stick takes one stick', () => {
    const p = ok(plan([36, 24, 30]));
    expect(p.count).toBe(1);
    expect(p.sticks[0]!.drop).toBeCloseTo(150, 9);
  });

  test('a piece over the line takes a second', () => {
    const p = ok(plan([150, 150]));
    expect(p.count).toBe(2);
  });

  test('the case first fit gets wrong', () => {
    // Biggest first into the first stick that takes it puts 7 and 2 together
    // and 5, 4 apart, and calls for three sticks. Two is enough: 7+4 and 5+2+2.
    const p = ok(plan([7, 5, 4, 2, 2], 11));
    expect(p.count).toBe(2);
    expect(p.best).toBe(true);
  });

  test('an exact fill leaves nothing over and needs no extra stick', () => {
    const p = ok(plan([60, 60, 60, 60], 240));
    expect(p.count).toBe(1);
    expect(p.sticks[0]!.drop).toBeCloseTo(0, 9);
  });

  test('the same four with a saw in the way need two, which is the point of the kerf', () => {
    const p = ok(plan([60, 60, 60, 60], 240, 0.125));
    expect(p.count).toBe(2);
  });

  test('it never uses fewer sticks than the pipe requires', () => {
    for (const lengths of [[90, 90, 90], [200, 100, 100], [70, 70, 70, 70]]) {
      const p = ok(plan(lengths, 240));
      const floor = Math.ceil(lengths.reduce((a, b) => a + b, 0) / 240 - 1e-9);
      expect(p.count).toBeGreaterThanOrEqual(floor);
    }
  });
});

describe('the leftovers are pipe, not scrap, when they can be', () => {
  test('of two packings that use the same sticks, the one with the long drop wins', () => {
    // 100 + 100 + 140 needs two 240s whichever way it goes. Put the two
    // hundreds together and the drops are 40 and 100, four foot and eight.
    // Put a hundred with the one forty and one stick keeps 140 whole, which
    // is a piece of pipe and not an offcut.
    const p = ok(plan([100, 100, 140], 240));
    expect(p.count).toBe(2);
    expect(p.longestDrop).toBeCloseTo(140, 9);
  });

  test('the drops are reported longest first and add up to what was not used', () => {
    const p = ok(plan([100, 100, 140], 240));
    expect(p.drops).toEqual([...p.drops].sort((a, b) => b - a));
    expect(p.drops.reduce((a, b) => a + b, 0)).toBeCloseTo(p.offcut, 9);
  });

  test('what is bought is what is cut, plus the saw, plus the drops', () => {
    const p = ok(plan([36, 24, 30, 91], 240, 0.125));
    expect(p.inTheJob + p.kerfLoss + p.drops.reduce((a, b) => a + b, 0)).toBeCloseTo(p.bought, 9);
  });

  test('offcut is what was bought and not used, as a share of it', () => {
    const p = ok(plan([120], 240));
    expect(p.offcut).toBeCloseTo(120, 9);
    expect(p.offcutPct).toBeCloseTo(50, 9);
  });
});

describe('the sticks read the way they are called out', () => {
  test('numbered from one, fullest first', () => {
    const p = ok(plan([200, 100], 240));
    expect(p.sticks.map((s) => s.number)).toEqual([1, 2]);
    expect(p.sticks[0]!.used).toBeGreaterThanOrEqual(p.sticks[1]!.used);
  });

  test('the longest cut comes off each stick first', () => {
    const p = ok(plan([30, 90, 60], 240));
    for (const s of p.sticks)
      expect(s.pieces.map((x) => x.length)).toEqual([...s.pieces.map((x) => x.length)].sort((a, b) => b - a));
  });

  test('every piece is on exactly one stick, and none is lost', () => {
    const lengths = [36, 24, 30, 91, 140, 60];
    const p = ok(plan(lengths, 240, 0.125));
    const placed = p.sticks.flatMap((s) => s.pieces);
    expect(placed).toHaveLength(lengths.length);
    expect(new Set(placed.map((x) => x.id)).size).toBe(lengths.length);
    expect(placed.reduce((t, x) => t + x.length, 0)).toBeCloseTo(p.inTheJob, 9);
  });

  test('no stick is over-filled, saw and all', () => {
    const p = ok(plan([36, 24, 30, 91, 140, 60, 44, 22], 240, 0.125));
    for (const s of p.sticks) {
      expect(s.used).toBeLessThanOrEqual(240 + 1e-9);
      expect(s.drop).toBeGreaterThanOrEqual(-1e-9);
      expect(s.used).toBeCloseTo(s.pieces.reduce((t, x) => t + x.length + 0.125, 0), 9);
    }
  });
});

describe('the search stays inside its budget', () => {
  test('a full spool is solved outright, not approximated', () => {
    // Eight legs is the most a spool can have, so a spool is always exact.
    const eight = Array.from({ length: 8 }, (_, i) => 40 + i * 7);
    const p = ok(plan(eight, 240, 0.125));
    expect(p.best).toBe(true);
    expect(EXACT_UP_TO).toBeGreaterThanOrEqual(8);
  });

  test('a longer list still comes back, and comes back sound', () => {
    const many = Array.from({ length: 40 }, (_, i) => 20 + ((i * 13) % 90));
    const started = Date.now();
    const p = ok(plan(many, 240, 0.125));
    expect(Date.now() - started).toBeLessThan(2000);
    expect(p.sticks.flatMap((s) => s.pieces)).toHaveLength(40);
    for (const s of p.sticks) expect(s.used).toBeLessThanOrEqual(240 + 1e-9);
    // This one lands a stick above the floor, so it cannot be called best.
    // That is a fact about these lengths, not about the list being long.
    expect(p.count).toBeGreaterThan(p.fewestPossible);
    expect(p.best).toBe(false);
  });

  test('it is quick enough to sit in a screen', () => {
    const started = Date.now();
    for (let i = 0; i < 40; i += 1) plan([36, 24, 30, 91, 140, 60, 44, 22], 240, 0.125);
    expect(Date.now() - started).toBeLessThan(1500);
  });
});

describe('the floor proves what the search cannot reach', () => {
  test('the floor is the pieces and their kerfs over a stick, rounded up', () => {
    // Four 59s and their kerfs are 236.5, which is one stick and a bit under.
    expect(fewestPossible(pieces([59, 59, 59, 59]), 240, 0.125)).toBe(1);
    // Five will not go: 295.625 needs two.
    expect(fewestPossible(pieces([59, 59, 59, 59, 59]), 240, 0.125)).toBe(2);
  });

  test('pieces that exactly fill sticks give a floor of exactly that many', () => {
    expect(fewestPossible(pieces([120, 120, 120, 120]), 240, 0)).toBe(2);
  });

  test('no packing ever comes back under the floor', () => {
    for (let n = 1; n <= 30; n += 1) {
      const ls = Array.from({ length: n }, (_, i) => 20 + ((i * 17) % 100));
      const p = ok(plan(ls, 240, 0.125));
      expect(p.count).toBeGreaterThanOrEqual(p.fewestPossible);
      expect(p.fewestPossible).toBe(fewestPossible(pieces(ls), 240, 0.125));
    }
  });

  test('a long list that reaches the floor is called best, though nothing searched it', () => {
    // Twenty 47s: each stick takes five (235.625), so four sticks is the floor
    // and first fit finds it. Before the floor existed this said "good enough"
    // about a packing that could not be improved on.
    const twenty = Array.from({ length: 20 }, () => 47);
    const p = ok(plan(twenty, 240, 0.125));
    expect(twenty.length).toBeGreaterThan(EXACT_UP_TO);
    expect(p.count).toBe(4);
    expect(p.count).toBe(p.fewestPossible);
    expect(p.best).toBe(true);
  });

  test('a searched list is best whether or not it reaches the floor', () => {
    // Three 130s: no two share a 240 stick, so it is three sticks however it
    // is packed. The floor says two, because 390 of pipe is under two sticks
    // of it — which is exactly what a floor cannot know. The search does, so
    // this is called best while sitting a stick above the floor.
    const p = ok(plan([130, 130, 130], 240, 0.125));
    expect(p.count).toBe(3);
    expect(p.fewestPossible).toBe(2);
    expect(p.best).toBe(true);
  });
});
