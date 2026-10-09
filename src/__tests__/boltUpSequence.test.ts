import {
  BoltUpState,
  GASKETS,
  METHODS,
  MethodId,
  ROUND_LOADS,
  answerMoved,
  boltLevel,
  boltUpProgress,
  confirmGap,
  crossPattern,
  currentRound,
  currentStep,
  expectedBolt,
  expectedBolts,
  isAsked,
  isFinished,
  levelsAt,
  loadTorque,
  loadWords,
  methodBar,
  methodsFor,
  nextStep,
  pairs,
  plan,
  quadrantPattern,
  quads,
  resetBoltUp,
  rotationalPattern,
  starters,
  startBoltUp,
  stepWords,
  tapBolt,
  undoBolt,
  withMethod,
} from '../calc/boltUpSequence';
import { BOLT_UP_125, BOLT_UP_250, boltHoleAngles } from '../calc/boltUp';
import { STEEL_CLASSES, steelSizes, steelFlange } from '../calc/steelFlange';

// Every bolt count that any flange in the tables actually has.
const REAL_COUNTS = Array.from(
  new Set([
    ...[...BOLT_UP_125, ...BOLT_UP_250].map((b) => b.bolts),
    ...STEEL_CLASSES.flatMap((c) => steelSizes(c).map((n) => steelFlange(n, c)!.bolts)),
  ]),
).sort((a, b) => a - b);

/** Bolt to bolt separation in degrees, the short way round. */
function separation(a: number, b: number, bolts: number): number {
  const d = Math.abs(a - b) % bolts;
  return Math.min(d, bolts - d) * (360 / bolts);
}

/** Every state on the way to finished, following whatever the sequence asks for and answering "no nut turned". */
function walk(bolts: number, id: MethodId = 'legacy', moved: boolean[] = []): BoltUpState[] {
  const out = [startBoltUp(bolts, id)];
  let s = out[0]!;
  let answers = 0;
  let guard = 0;
  while (!isFinished(s) && guard++ < 5000) {
    if (isAsked(s)) {
      s = answerMoved(s, moved[answers++] ?? false);
    } else if (s.gapPending) {
      s = confirmGap(s);
    } else {
      s = tapBolt(s, expectedBolt(s)).state;
    }
    out.push(s);
  }
  return out;
}

const finish = (bolts: number, id: MethodId = 'legacy'): BoltUpState => walk(bolts, id).at(-1)!;

describe('the bolt counts under test are the real ones', () => {
  it('covers every flange in every class', () => {
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
  // These are tabulated in PCC-1, and cover 1/2" through 24" pipe, which is
  // nearly every flange a fitter touches. They are the outside check on a
  // generator that is otherwise only checking itself.
  const PUBLISHED: Record<number, number[]> = {
    4: [1, 3, 2, 4],
    8: [1, 5, 3, 7, 2, 6, 4, 8],
    12: [1, 7, 4, 10, 2, 8, 5, 11, 3, 9, 6, 12],
    16: [1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16],
    20: [1, 11, 6, 16, 2, 12, 7, 17, 3, 13, 8, 18, 4, 14, 9, 19, 5, 15, 10, 20],
    24: [1, 13, 7, 19, 4, 16, 10, 22, 2, 14, 8, 20, 5, 17, 11, 23, 3, 15, 9, 21, 6, 18, 12, 24],
  };
  for (const [n, order] of Object.entries(PUBLISHED)) {
    it(`matches the ${n} bolt table`, () => {
      expect(crossPattern(Number(n))).toEqual(order);
    });
  }
});

describe('the cross pattern does what a cross pattern is for', () => {
  it('follows every bolt with the one straight across it', () => {
    for (const n of REAL_COUNTS) {
      const order = crossPattern(n);
      for (let i = 0; i + 1 < order.length; i += 2) {
        expect(separation(order[i]!, order[i + 1]!, n)).toBe(180);
      }
    }
  });

  it('is a permutation, so every bolt is worked exactly once', () => {
    for (const n of REAL_COUNTS) {
      expect([...crossPattern(n)].sort((a, b) => a - b)).toEqual(rotationalPattern(n));
    }
  });

  it('never asks for the same bolt twice in a row', () => {
    for (const n of REAL_COUNTS) {
      const order = crossPattern(n);
      for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
    }
  });

  it('starts at bolt 1 and ends at the last bolt', () => {
    for (const n of REAL_COUNTS) {
      const order = crossPattern(n);
      expect(order[0]).toBe(1);
      expect(order[order.length - 1]).toBe(n);
    }
  });

  it('rejects counts that are not a positive whole number', () => {
    for (const bad of [0, -4, 2.5, NaN, Infinity]) expect(crossPattern(bad)).toEqual([]);
  });
});

describe('the quadrant pattern', () => {
  it('is the PCC-1 one for sixteen bolts: starters, then the next loose bolt in each quadrant', () => {
    expect(quadrantPattern(16)).toEqual([1, 9, 5, 13, 2, 10, 6, 14, 3, 11, 7, 15, 4, 12, 8, 16]);
  });

  it('starts with four bolts 90° apart in cross order, on every real count', () => {
    for (const n of REAL_COUNTS) {
      const four = starters(n);
      expect(four).toHaveLength(4);
      expect(separation(four[0]!, four[1]!, n)).toBe(180);
      expect(separation(four[0]!, four[2]!, n)).toBe(90);
      expect(separation(four[0]!, four[3]!, n)).toBe(90);
      expect(separation(four[2]!, four[3]!, n)).toBe(180);
    }
  });

  it('is a permutation, and only for counts in fours', () => {
    for (const n of REAL_COUNTS) expect([...quadrantPattern(n)].sort((a, b) => a - b)).toEqual(rotationalPattern(n));
    expect(quadrantPattern(6)).toEqual([]);
    expect(quadrantPattern(0)).toEqual([]);
  });
});

describe('groups for several tools', () => {
  it('pairs are 180° apart and cover every bolt once', () => {
    for (const n of REAL_COUNTS) {
      const ps = pairs(n);
      expect(ps).toHaveLength(n / 2);
      for (const [a, b] of ps) expect(separation(a!, b!, n)).toBe(180);
      expect(ps.flat().sort((a, b) => a - b)).toEqual(rotationalPattern(n));
    }
  });

  it('quads are 90° apart and cover every bolt once', () => {
    for (const n of REAL_COUNTS) {
      const qs = quads(n);
      expect(qs).toHaveLength(n / 4);
      for (const q of qs) {
        expect(separation(q[0]!, q[1]!, n)).toBe(90);
        expect(separation(q[0]!, q[2]!, n)).toBe(180);
        expect(separation(q[0]!, q[3]!, n)).toBe(90);
      }
      expect(qs.flat().sort((a, b) => a - b)).toEqual(rotationalPattern(n));
    }
  });
});

describe('which methods a flange may be bolted by', () => {
  it('always allows the Legacy method and full-coverage tensioning', () => {
    for (const n of REAL_COUNTS)
      for (const g of GASKETS) {
        expect(methodBar('legacy', n, g.id)).toBeNull();
        expect(methodBar('tension100', n, g.id)).toBeNull();
      }
  });

  it('keeps the Quadrant pattern for sixteen bolts and up, and the Modified for twelve', () => {
    expect(methodBar('quadrant', 12, 'spiral')).not.toBeNull();
    expect(methodBar('quadrant', 16, 'spiral')).toBeNull();
    expect(methodBar('modified', 8, 'spiral')).not.toBeNull();
    expect(methodBar('modified', 12, 'spiral')).toBeNull();
  });

  it('allows the Circular pattern on hard gaskets only', () => {
    for (const g of GASKETS) expect(methodBar('circular', 16, g.id) === null).toBe(g.id === 'hard');
    expect(methodBar('circular', 4, 'hard')).not.toBeNull();
  });

  it('offers every method on a 24 bolt kammprofile joint, and fewer on a 4 bolt sheet', () => {
    expect(methodsFor(24, 'hard').map((m) => m.id)).toEqual(METHODS.map((m) => m.id));
    expect(methodsFor(4, 'soft').map((m) => m.id)).toEqual(['legacy', 'twoTools', 'tension100', 'tension50', 'tension25']);
  });
});

describe('every method is a plan of rounds that covers every bolt', () => {
  const allowed = (n: number) => methodsFor(n, 'hard').map((m) => m.id);

  it('ends in a check round, and only check rounds are added', () => {
    for (const n of REAL_COUNTS)
      for (const id of allowed(n)) {
        const base = plan(id, n);
        expect(base.at(-1)!.kind).toBe('check');
        const more = plan(id, n, 2);
        expect(more).toHaveLength(base.length + 2);
        expect(more.slice(-3).every((r) => r.kind === 'check')).toBe(true);
        expect(more.slice(0, base.length - 1)).toEqual(base.slice(0, -1));
      }
  });

  it('never touches a bolt twice in a round, touches every bolt somewhere, and every bolt on a check round', () => {
    for (const n of REAL_COUNTS)
      for (const id of allowed(n)) {
        const seen = new Set<number>();
        for (const r of plan(id, n)) {
          const touched = r.steps.flatMap((s) => [...s.bolts]);
          expect(new Set(touched).size).toBe(touched.length);
          touched.forEach((b) => seen.add(b));
          if (r.kind === 'check' || r.kind === 'full' || r.kind === 'snug') expect([...touched].sort((a, b) => a - b)).toEqual(rotationalPattern(n));
        }
        expect([...seen].sort((a, b) => a - b)).toEqual(rotationalPattern(n));
      }
  });

  it('torque methods end every bolt at 100%, after a snug and rounds that only ever go up', () => {
    for (const n of REAL_COUNTS)
      for (const id of ['legacy', 'modified', 'quadrant', 'circular', 'twoTools', 'fourTools'] as MethodId[]) {
        if (methodBar(id, n, 'hard')) continue;
        const rounds = plan(id, n);
        expect(rounds[0]!.kind).toBe('snug');
        const last: Record<number, number> = {};
        for (const r of rounds)
          for (const s of r.steps)
            for (const b of s.bolts) {
              expect(s.load).toBeGreaterThanOrEqual(last[b] ?? 0);
              last[b] = s.load;
            }
        expect(Object.values(last).every((l) => l === 1)).toBe(true);
      }
  });

  it('the Legacy rounds are the PCC-1 ones: 20-30, 50-70, 100 across, then round at 100', () => {
    const rounds = plan('legacy', 8);
    expect(rounds.map((r) => r.label)).toEqual(['Snug', 'Round 1', 'Round 2', 'Round 3', 'Check round']);
    expect(rounds.slice(1, 4).map((r) => r.load)).toEqual([...ROUND_LOADS]);
    expect(rounds.slice(1, 4).every((r) => r.order === 'across' && r.gapCheck)).toBe(true);
    expect(rounds[1]!.steps.map((s) => s.bolts[0])).toEqual(crossPattern(8));
    expect(rounds[4]!.steps.map((s) => s.bolts[0])).toEqual(rotationalPattern(8));
    expect(rounds[4]!.order).toBe('round');
  });

  it('the Modified Legacy stages four, four, then the rest at 100 in cross order', () => {
    const r1 = plan('modified', 16)[1]!;
    expect(r1.kind).toBe('staged');
    expect(r1.steps.map((s) => s.bolts[0])).toEqual(crossPattern(16));
    expect(r1.steps.map((s) => s.load)).toEqual([0.3, 0.3, 0.3, 0.3, 0.6, 0.6, 0.6, 0.6, ...new Array<number>(8).fill(1)]);
    expect(plan('modified', 16)[2]!.kind).toBe('full');
  });

  it('the Quadrant pattern stages the quadrant order the same way', () => {
    const r1 = plan('quadrant', 16)[1]!;
    expect(r1.steps.map((s) => s.bolts[0])).toEqual(quadrantPattern(16));
    expect(r1.steps.slice(0, 4).every((s) => s.load === 0.3)).toBe(true);
    expect(r1.steps.slice(8).every((s) => s.load === 1)).toBe(true);
  });

  it('the Circular pattern seats four bolts at 20-30% then goes round', () => {
    const rounds = plan('circular', 12);
    expect(rounds[1]!.steps.map((s) => s.bolts[0])).toEqual(starters(12));
    expect(rounds[1]!.steps.every((s) => s.load === 0.3)).toBe(true);
    expect(rounds[2]!.steps.map((s) => s.bolts[0])).toEqual(rotationalPattern(12));
  });

  it('two and four tools work groups through the same three rounds', () => {
    const two = plan('twoTools', 8);
    expect(two[1]!.steps.map((s) => [...s.bolts])).toEqual(pairs(8));
    expect(two.slice(1, 4).map((r) => r.load)).toEqual([...ROUND_LOADS]);
    const four = plan('fourTools', 16);
    expect(four[1]!.steps.map((s) => [...s.bolts])).toEqual(quads(16));
    expect(four.at(-1)!.steps).toHaveLength(4);
  });

  it('tensioning passes are by coverage: all at once, odds and evens, or four groups', () => {
    const all = plan('tension100', 8);
    expect(all[1]!.steps).toEqual([{ bolts: rotationalPattern(8), load: 1, pressure: 'A' }]);
    const half = plan('tension50', 8);
    expect(half[1]!.steps[0]!.bolts).toEqual([1, 3, 5, 7]);
    expect(half[2]!.steps[0]!.bolts).toEqual([2, 4, 6, 8]);
    expect(half[2]!.steps[0]!.pressure).toBe('B');
    expect(half.at(-1)!.steps.map((s) => s.pressure)).toEqual(['A', 'B']);
    const quarter = plan('tension25', 16);
    expect(quarter.slice(1, 5).map((r) => r.steps[0]!.bolts[0])).toEqual([1, 2, 3, 4]);
    expect(quarter.at(-1)!.steps.map((s) => s.pressure)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('says the loads in the words PCC-1 uses', () => {
    expect(loadWords(0.2)).toMatch(/10–20 ft-lb/);
    expect(loadWords(0.3)).toBe('20–30%, set 30%');
    expect(loadWords(0.6)).toBe('50–70%, set 60%');
    expect(loadWords(1)).toBe('100%');
  });
});

describe('a wrong tap changes nothing', () => {
  it('refuses every bolt but the one asked for, on every step of a whole joint, for every method', () => {
    for (const id of METHODS.map((m) => m.id)) {
      let s = startBoltUp(16, id);
      let guard = 0;
      while (!isFinished(s) && guard++ < 2000) {
        if (isAsked(s) || s.gapPending) {
          const r = tapBolt(s, 1);
          expect(r.ok).toBe(false);
          expect(r.state.round).toBe(s.round);
          expect(r.state.step).toBe(s.step);
          s = isAsked(s) ? answerMoved(s, false) : confirmGap(s);
          continue;
        }
        const want = expectedBolts(s);
        for (let b = 1; b <= 16; b++) {
          if (want.includes(b)) continue;
          const r = tapBolt(s, b);
          expect(r.ok).toBe(false);
          expect(r.state.level).toEqual(s.level);
          expect(r.state.round).toBe(s.round);
          expect(r.state.step).toBe(s.step);
          expect(r.state.lastWrong).toBe(b);
        }
        s = tapBolt(s, want[0]!).state;
      }
    }
  });

  it('tells the screen which bolt was hit, and re-fires on a repeat', () => {
    const s0 = startBoltUp(8);
    const s1 = tapBolt(s0, 1).state; // snug
    const a = tapBolt(s1, 2);
    expect(a.ok).toBe(false);
    expect(a.state.lastWrong).toBe(2);
    expect(a.state.wrongCount).toBe(1);
    const b = tapBolt(a.state, 2);
    expect(b.state.wrongCount).toBe(2);
  });

  it('clears the flag as soon as the right bolt is worked', () => {
    const s1 = tapBolt(startBoltUp(8), 1).state;
    const wrong = tapBolt(s1, 3).state;
    const right = tapBolt(wrong, expectedBolt(wrong)).state;
    expect(right.lastWrong).toBeNull();
    expect(right.wrongCount).toBe(1);
  });

  it('any bolt of a group marks the group under several tools', () => {
    const s1 = tapBolt(startBoltUp(8, 'twoTools'), 1).state;
    expect(expectedBolts(s1)).toEqual([1, 5]);
    const r = tapBolt(s1, 5);
    expect(r.ok).toBe(true);
    expect(boltLevel(r.state, 1)).toBe(2);
    expect(boltLevel(r.state, 5)).toBe(2);
    expect(expectedBolts(r.state)).toEqual([3, 7]);
  });
});

describe('following the sequence finishes the joint', () => {
  it('works every step of every round once, for every real count and method', () => {
    for (const n of REAL_COUNTS)
      for (const m of methodsFor(n, 'hard')) {
        const end = finish(n, m.id);
        expect(isFinished(end)).toBe(true);
        const total = plan(m.id, n).reduce((a, r) => a + r.steps.length, 0);
        expect(boltUpProgress(end)).toEqual({ done: total, total });
        expect(end.level.every((l) => l === 5)).toBe(true);
      }
  });

  it('asks for a gap check after each cross round and will not go on until it is confirmed', () => {
    let s = startBoltUp(4);
    s = tapBolt(s, 1).state; // snug
    for (let i = 0; i < 4; i++) s = tapBolt(s, expectedBolt(s)).state;
    expect(s.round).toBe(2);
    expect(s.gapPending).toBe(true);
    expect(expectedBolts(s)).toEqual([]);
    expect(tapBolt(s, 1).ok).toBe(false);
    const on = confirmGap(s);
    expect(on.gapPending).toBe(false);
    expect(expectedBolt(on)).toBe(1);
  });

  it('closes a check round with a question, and a nut that turned means another round', () => {
    const walked = walk(4);
    const asked = walked.find((s) => isAsked(s))!;
    expect(currentRound(asked)!.kind).toBe('check');
    expect(expectedBolts(asked)).toEqual([]);
    expect(isFinished(asked)).toBe(false);
    const again = answerMoved(asked, true);
    expect(again.extraChecks).toBe(1);
    expect(isFinished(again)).toBe(false);
    expect(currentRound(again)!.label).toBe('Check round 2');
    expect(answerMoved(answerMoved(asked, false), false)).toEqual(answerMoved(asked, false));
    expect(finish(4).extraChecks).toBe(0);
    expect(walk(4, 'legacy', [true, true]).at(-1)!.extraChecks).toBe(2);
  });

  it('never lets one bolt get ahead of the round', () => {
    for (const n of [4, 8, 16]) {
      for (const s of walk(n, 'legacy')) {
        const levels = new Set(s.level);
        expect(levels.size).toBeLessThanOrEqual(2);
        if (levels.size === 2) {
          const [a, b] = [...levels].sort();
          expect(b! - a!).toBe(1);
        }
      }
    }
  });

  it('reports the round it is on until there is none left', () => {
    const walked = walk(4);
    expect(walked.map((s) => currentRound(s)?.label).filter((l, i, a) => a.indexOf(l) === i)).toEqual([
      'Snug',
      'Round 1',
      'Round 2',
      'Round 3',
      'Check round',
      undefined,
    ]);
  });

  it('locks once finished, so a stray tap cannot reopen it', () => {
    const end = finish(8);
    const r = tapBolt(end, 1);
    expect(r.ok).toBe(false);
    expect(isFinished(r.state)).toBe(true);
    expect(currentStep(end)).toBeUndefined();
    expect(nextStep(end)).toBeUndefined();
  });

  it('sends the eye ahead to the next step, across a round boundary', () => {
    const s1 = tapBolt(startBoltUp(8), 1).state;
    expect(nextStep(s1)!.bolts).toEqual([5]);
    let s = s1;
    for (let i = 0; i < 7; i++) s = tapBolt(s, expectedBolt(s)).state;
    expect(nextStep(s)!.bolts).toEqual([1]); // round 2 starts at bolt 1
  });
});

describe('undo is the exact inverse of a tap, an answer, or a gap check', () => {
  it('round-trips every step of a whole joint, round boundaries and answers included, for every method', () => {
    for (const n of [8, 16])
      for (const m of methodsFor(n, 'hard')) {
        const walked = walk(n, m.id, [true]);
        for (let i = walked.length - 1; i > 0; i--) {
          const back = undoBolt(walked[i]!);
          const want = walked[i - 1]!;
          // A gap confirmation is not a tap: undo steps over it to the bolt before.
          const expected = want.gapPending ? walked[i - 2]! : want;
          expect({ ...back, gapPending: false, wrongCount: 0 }).toEqual({ ...expected, gapPending: false, wrongCount: 0 });
        }
      }
  });

  it('reopens the previous round when undoing its first bolt', () => {
    let s = tapBolt(startBoltUp(4), 1).state;
    for (let i = 0; i < 4; i++) s = tapBolt(s, expectedBolt(s)).state;
    s = confirmGap(s);
    for (let i = 0; i < 4; i++) s = tapBolt(s, expectedBolt(s)).state;
    s = confirmGap(s);
    expect(s.round).toBe(3);
    expect(s.level).toEqual([3, 3, 3, 3]);
    const back = undoBolt(s);
    expect(back.round).toBe(2);
    expect(back.step).toBe(3);
    // Bolt 4 is the last in cross order: its 50-70% is taken back, its 20-30% stands.
    expect(boltLevel(back, 4)).toBe(2);
    expect(boltLevel(back, 1)).toBe(3);
  });

  it('unlocks a finished joint at its last answer', () => {
    const end = finish(4);
    const back = undoBolt(end);
    expect(isFinished(back)).toBe(false);
    expect(isAsked(back)).toBe(true);
  });

  it('takes back the answer that added a check round', () => {
    const asked = walk(4).find((s) => isAsked(s))!;
    const again = answerMoved(asked, true);
    const back = undoBolt(again);
    expect(back.extraChecks).toBe(0);
    expect(isAsked(back)).toBe(true);
    expect(back).toEqual({ ...asked, lastWrong: null });
  });

  it('does nothing at the very start', () => {
    const s = startBoltUp(8);
    expect(undoBolt(s)).toEqual(s);
  });

  it('undoes a whole joint back to the start', () => {
    let s = finish(16, 'quadrant');
    let guard = 0;
    while (boltUpProgress(s).done > 0 && guard++ < 500) s = undoBolt(s);
    expect(s).toEqual(startBoltUp(16, 'quadrant'));
  });

  it('clears a pending wrong-tap flash', () => {
    const s1 = tapBolt(startBoltUp(8), 1).state;
    const wrong = tapBolt(s1, 3).state;
    expect(undoBolt(wrong).lastWrong).toBeNull();
  });
});

describe('levels, progress and reset', () => {
  it('levels are a pure function of the position', () => {
    for (const m of methodsFor(16, 'hard')) {
      for (const s of walk(16, m.id, [true])) {
        expect(s.level).toEqual(levelsAt(m.id, 16, s.extraChecks, s.round, s.step));
      }
    }
  });

  it('colours a bolt by the furthest it has got: snug, mid, full, checked', () => {
    const walked = walk(4);
    const levels = walked.map((s) => boltLevel(s, 1));
    expect(levels[0]).toBe(0);
    expect(Math.max(...levels)).toBe(5);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]!);
    expect(new Set(levels)).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  it('counts up one for every step worked and never goes backwards on a tap', () => {
    let s = startBoltUp(8, 'fourTools');
    let last = 0;
    let guard = 0;
    while (!isFinished(s) && guard++ < 200) {
      if (isAsked(s)) s = answerMoved(s, false);
      else if (s.gapPending) s = confirmGap(s);
      else {
        s = tapBolt(s, expectedBolt(s)).state;
        const { done } = boltUpProgress(s);
        expect(done).toBe(last + 1);
        last = done;
      }
    }
    expect(boltUpProgress(s)).toEqual({ done: 1 + 2 + 2 + 2 + 2, total: 9 });
  });

  it('does not count a refused tap', () => {
    const s1 = tapBolt(startBoltUp(8), 1).state;
    expect(boltUpProgress(tapBolt(s1, 2).state).done).toBe(1);
  });

  it('puts a part-done joint back to untouched, keeping the method', () => {
    const s = tapBolt(tapBolt(startBoltUp(12, 'modified'), 1).state, 1).state;
    expect(resetBoltUp(s)).toEqual(startBoltUp(12, 'modified'));
  });

  it('another method is a fresh start; the same method is left alone', () => {
    const s = tapBolt(startBoltUp(16), 1).state;
    expect(withMethod(s, 'quadrant')).toEqual(startBoltUp(16, 'quadrant'));
    expect(withMethod(s, 'legacy')).toBe(s);
  });

  it('survives a nonsense bolt count without pretending to work', () => {
    for (const bad of [0, -1, 2.5, NaN]) {
      const s = startBoltUp(bad);
      expect(s.bolts).toBe(0);
      expect(isFinished(s)).toBe(true);
      expect(expectedBolt(s)).toBe(0);
      expect(tapBolt(s, 1).ok).toBe(false);
      expect(undoBolt(s)).toEqual(s);
    }
  });
});

describe('torque is split, never invented', () => {
  it('splits a spec figure by the step load', () => {
    expect(loadTorque(300, 0.3)).toBeCloseTo(90, 9);
    expect(loadTorque(300, 0.6)).toBeCloseTo(180, 9);
    expect(loadTorque(300, 1)).toBeCloseTo(300, 9);
  });

  it('has nothing to say without a figure from the job', () => {
    for (const bad of [0, -50, NaN, Infinity]) expect(loadTorque(bad, 0.3)).toBeNaN();
    expect(loadTorque(300, 0)).toBeNaN();
  });

  it('says a step the way a man would', () => {
    expect(stepWords({ bolts: [5], load: 1 }, 8)).toBe('Bolt 5');
    expect(stepWords({ bolts: [1, 5], load: 1 }, 8)).toBe('Bolts 1 and 5');
    expect(stepWords({ bolts: [1, 5, 3, 7], load: 1 }, 8)).toBe('Bolts 1, 5, 3 and 7');
    expect(stepWords({ bolts: rotationalPattern(8), load: 1 }, 8)).toBe('Every bolt');
    expect(stepWords({ bolts: rotationalPattern(8), load: 1, pressure: 'A' }, 8)).toBe('All studs, pressure A');
    expect(stepWords({ bolts: [1, 3, 5, 7, 9, 11], load: 1, pressure: 'B' }, 12)).toBe('Studs 1, 3 … 11, pressure B');
  });
});
