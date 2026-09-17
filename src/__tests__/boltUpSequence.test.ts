import {
  BoltUpState,
  PASSES,
  boltLevel,
  boltUpProgress,
  crossPattern,
  currentPass,
  expectedBolt,
  isFinished,
  passOrder,
  passTorque,
  resetBoltUp,
  rotationalPattern,
  startBoltUp,
  tapBolt,
  undoBolt,
} from '../calc/boltUpSequence';
import { BOLT_UP_125, BOLT_UP_250, boltHoleAngles } from '../calc/boltUp';

// Every bolt count that any flange in the handbook actually has.
const REAL_COUNTS = Array.from(new Set([...BOLT_UP_125, ...BOLT_UP_250].map((b) => b.bolts))).sort(
  (a, b) => a - b,
);

/** Bolt to bolt separation in degrees, the short way round. */
function separation(a: number, b: number, bolts: number): number {
  const d = Math.abs(a - b) % bolts;
  return Math.min(d, bolts - d) * (360 / bolts);
}

/** Drive a whole joint by following whatever the sequence asks for. */
function runToEnd(bolts: number): { state: BoltUpState; taps: number } {
  let state = startBoltUp(bolts);
  let taps = 0;
  while (!isFinished(state) && taps <= bolts * PASSES.length + 1) {
    state = tapBolt(state, expectedBolt(state)).state;
    taps += 1;
  }
  return { state, taps };
}

describe('the bolt counts under test are the real ones', () => {
  it('covers every flange in both classes', () => {
    expect(REAL_COUNTS).toEqual([4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 52, 60, 64, 68]);
  });

  it('is always a multiple of four, which is what the drilling rule needs', () => {
    for (const n of REAL_COUNTS) {
      expect(n % 4).toBe(0);
      expect(boltHoleAngles(n)).toHaveLength(n);
    }
  });
});

describe('the cross pattern is the published one', () => {
  // These four are tabulated, and are the counts that cover 1" through 18"
  // pipe — which is nearly every flange a fitter touches. They are the outside
  // check on a generator that is otherwise only checking itself.
  const PUBLISHED: Record<number, number[]> = {
    4: [1, 3, 2, 4],
    8: [1, 5, 3, 7, 2, 6, 4, 8],
    12: [1, 7, 4, 10, 2, 8, 5, 11, 3, 9, 6, 12],
    16: [1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16],
  };

  for (const [bolts, order] of Object.entries(PUBLISHED)) {
    it(`matches the tabulated ${bolts} bolt sequence exactly`, () => {
      expect(crossPattern(Number(bolts))).toEqual(order);
    });
  }
});

describe('the cross pattern does what a cross pattern is for', () => {
  it('follows every bolt with the one straight across it', () => {
    // This is the whole point of the pattern and the reason it is built by
    // halving: pull a bolt down, then pull the one opposite, so the flange
    // comes down flat instead of cocked. Every pair in the sequence is 180°.
    for (const n of REAL_COUNTS) {
      const p = crossPattern(n);
      for (let i = 0; i + 1 < p.length; i += 2) {
        expect(separation(p[i]!, p[i + 1]!, n)).toBeCloseTo(180, 9);
      }
    }
  });

  it('is a permutation, so every bolt is worked exactly once', () => {
    for (const n of REAL_COUNTS) {
      const p = crossPattern(n);
      expect(p).toHaveLength(n);
      expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
  });

  it('never asks for the same bolt twice in a row', () => {
    for (const n of REAL_COUNTS) {
      const p = crossPattern(n);
      for (let i = 0; i + 1 < p.length; i++) expect(p[i]).not.toBe(p[i + 1]);
    }
  });

  it('starts at bolt 1 and ends at the last bolt', () => {
    for (const n of REAL_COUNTS) {
      const p = crossPattern(n);
      expect(p[0]).toBe(1);
      expect(p[n - 1]).toBe(n);
    }
  });

  it('rejects counts that are not a positive whole number', () => {
    for (const bad of [0, -4, 1.5, NaN, Infinity]) expect(crossPattern(bad)).toEqual([]);
  });
});

describe('the final pass goes round, not across', () => {
  it('runs the bolts in order', () => {
    for (const n of REAL_COUNTS) {
      expect(rotationalPattern(n)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
  });

  it('is the last pass and only the last pass', () => {
    expect(PASSES.map((p) => p.order)).toEqual(['cross', 'cross', 'cross', 'rotational']);
  });

  it('is at full torque, like the pass before it', () => {
    expect(PASSES.map((p) => p.target)).toEqual([0.3, 0.6, 1, 1]);
  });

  it('is what passOrder hands out for pass 4', () => {
    expect(passOrder(16, 3)).toEqual(rotationalPattern(16));
    expect(passOrder(16, 0)).toEqual(crossPattern(16));
    expect(passOrder(16, 9)).toEqual([]);
  });
});

describe('a wrong tap changes nothing', () => {
  it('refuses every bolt but the one asked for, on every step of a whole joint', () => {
    const n = 12;
    let state = startBoltUp(n);

    while (!isFinished(state)) {
      const want = expectedBolt(state);
      for (let bolt = 1; bolt <= n; bolt++) {
        if (bolt === want) continue;
        const r = tapBolt(state, bolt);
        expect(r.ok).toBe(false);
        expect(r.expected).toBe(want);
        // Everything that drives the sequence is untouched.
        expect(r.state.pass).toBe(state.pass);
        expect(r.state.step).toBe(state.step);
        expect(r.state.level).toEqual(state.level);
      }
      state = tapBolt(state, want).state;
    }
  });

  it('tells the screen which bolt was hit, and re-fires on a repeat', () => {
    const start = startBoltUp(8);
    const wrong = tapBolt(start, 4);
    expect(wrong.state.lastWrong).toBe(4);
    expect(wrong.state.wrongCount).toBe(1);

    const again = tapBolt(wrong.state, 4);
    expect(again.state.wrongCount).toBe(2);
  });

  it('clears the flag as soon as the right bolt is worked', () => {
    const wrong = tapBolt(startBoltUp(8), 4).state;
    const right = tapBolt(wrong, 1).state;
    expect(right.lastWrong).toBeNull();
  });

  it('refuses a bolt that is not on the flange at all', () => {
    const s = startBoltUp(8);
    for (const bad of [0, -1, 9, 1.5, NaN]) expect(tapBolt(s, bad).ok).toBe(false);
  });
});

describe('following the sequence finishes the joint', () => {
  it('takes exactly four passes over every bolt, for every real count', () => {
    for (const n of REAL_COUNTS) {
      const { state, taps } = runToEnd(n);
      expect(isFinished(state)).toBe(true);
      expect(taps).toBe(n * PASSES.length);
      expect(state.level).toEqual(new Array<number>(n).fill(PASSES.length));
      expect(boltUpProgress(state)).toEqual({ done: n * 4, total: n * 4 });
    }
  });

  it('never lets one bolt get ahead of the pass', () => {
    // A bolt at 100% while its neighbour is still loose is exactly the failure
    // the passes exist to prevent, so the state cannot represent it.
    const n = 16;
    let state = startBoltUp(n);
    while (!isFinished(state)) {
      for (let bolt = 1; bolt <= n; bolt++) {
        const lv = boltLevel(state, bolt);
        expect(lv).toBeGreaterThanOrEqual(state.pass);
        expect(lv).toBeLessThanOrEqual(state.pass + 1);
      }
      state = tapBolt(state, expectedBolt(state)).state;
    }
  });

  it('closes each pass with every bolt level and none skipped', () => {
    const n = 8;
    let state = startBoltUp(n);
    const closed: number[] = [];
    while (!isFinished(state)) {
      const r = tapBolt(state, expectedBolt(state));
      if (r.advancedPass || r.finished) {
        closed.push(r.state.pass);
        const want = r.state.pass;
        expect(r.state.level).toEqual(new Array<number>(n).fill(want));
      }
      state = r.state;
    }
    expect(closed).toEqual([1, 2, 3, 4]);
  });

  it('reports the pass it is on until there is none left', () => {
    let state = startBoltUp(4);
    expect(currentPass(state)?.number).toBe(1);
    for (let i = 0; i < 4; i++) state = tapBolt(state, expectedBolt(state)).state;
    expect(currentPass(state)?.number).toBe(2);
    const { state: end } = runToEnd(4);
    expect(currentPass(end)).toBeUndefined();
    expect(expectedBolt(end)).toBe(0);
  });

  it('locks once finished, so a stray tap cannot reopen it', () => {
    const { state } = runToEnd(8);
    for (let bolt = 1; bolt <= 8; bolt++) {
      const r = tapBolt(state, bolt);
      expect(r.ok).toBe(false);
      expect(r.state.level).toEqual(state.level);
      expect(isFinished(r.state)).toBe(true);
    }
  });
});

describe('undo is the exact inverse of a tap', () => {
  it('round-trips every step of a whole joint, pass boundaries included', () => {
    const n = 12;
    let state = startBoltUp(n);
    while (!isFinished(state)) {
      const before = state;
      const after = tapBolt(before, expectedBolt(before)).state;
      const back = undoBolt(after);
      expect(back.pass).toBe(before.pass);
      expect(back.step).toBe(before.step);
      expect(back.level).toEqual(before.level);
      state = after;
    }
  });

  it('reopens the previous pass when undoing its last bolt', () => {
    const n = 4;
    let state = startBoltUp(n);
    for (let i = 0; i < n; i++) state = tapBolt(state, expectedBolt(state)).state;
    expect(state.pass).toBe(1);
    expect(state.level).toEqual([1, 1, 1, 1]);

    const back = undoBolt(state);
    expect(back.pass).toBe(0);
    expect(back.step).toBe(n - 1);
    // The bolt taken back is the one that closed pass 1, which is bolt 4.
    expect(back.level).toEqual([1, 1, 1, 0]);
    expect(expectedBolt(back)).toBe(4);
  });

  it('unlocks a finished joint', () => {
    const { state } = runToEnd(8);
    const back = undoBolt(state);
    expect(isFinished(back)).toBe(false);
    expect(back.pass).toBe(3);
    expect(expectedBolt(back)).toBe(8);
  });

  it('does nothing at the very start', () => {
    const s = startBoltUp(16);
    expect(undoBolt(s)).toEqual(s);
  });

  it('undoes a whole joint back to the start', () => {
    const n = 8;
    const { state } = runToEnd(n);
    let back = state;
    for (let i = 0; i < n * PASSES.length; i++) back = undoBolt(back);
    expect(back).toEqual(startBoltUp(n));
    expect(undoBolt(back)).toEqual(back);
  });

  it('clears a pending wrong-tap flash', () => {
    const wrong = tapBolt(startBoltUp(8), 5).state;
    expect(undoBolt(wrong).lastWrong).toBeNull();
  });
});

describe('progress and reset', () => {
  it('counts up one for every bolt worked and never goes backwards on a tap', () => {
    const n = 16;
    let state = startBoltUp(n);
    let last = 0;
    while (!isFinished(state)) {
      const r = tapBolt(state, expectedBolt(state));
      const p = boltUpProgress(r.state);
      expect(p.done).toBe(last + 1);
      expect(p.total).toBe(n * 4);
      last = p.done;
      state = r.state;
    }
  });

  it('does not count a refused tap', () => {
    const s = tapBolt(startBoltUp(8), 1).state;
    expect(boltUpProgress(tapBolt(s, 1).state).done).toBe(1);
  });

  it('puts a part-done joint back to untouched', () => {
    let state = startBoltUp(16);
    for (let i = 0; i < 20; i++) state = tapBolt(state, expectedBolt(state)).state;
    expect(resetBoltUp(state)).toEqual(startBoltUp(16));
  });

  it('starts every bolt untouched', () => {
    const s = startBoltUp(20);
    expect(s.level).toEqual(new Array<number>(20).fill(0));
    expect(boltUpProgress(s)).toEqual({ done: 0, total: 80 });
    expect(expectedBolt(s)).toBe(1);
  });

  it('survives a nonsense bolt count without pretending to work', () => {
    for (const bad of [0, -8, 2.5, NaN]) {
      const s = startBoltUp(bad);
      expect(s.bolts).toBe(0);
      expect(expectedBolt(s)).toBe(0);
      expect(tapBolt(s, 1).ok).toBe(false);
      expect(undoBolt(s)).toEqual(s);
    }
  });
});

describe('torque is split, never invented', () => {
  it('splits a spec figure into the three pass targets', () => {
    expect(passTorque(300, 0)).toBeCloseTo(90, 9);
    expect(passTorque(300, 1)).toBeCloseTo(180, 9);
    expect(passTorque(300, 2)).toBeCloseTo(300, 9);
    expect(passTorque(300, 3)).toBeCloseTo(300, 9);
  });

  it('has nothing to say without a figure from the job', () => {
    for (const bad of [0, -50, NaN, Infinity]) expect(passTorque(bad, 0)).toBeNaN();
    expect(passTorque(300, 4)).toBeNaN();
  });
});
