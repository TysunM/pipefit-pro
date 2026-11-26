import { KNOTS, knotById, knotProblems, morphRopes, reachAfter, reachBefore, stepsOf } from '../calc/knots/knots';
import { draw, layout, lengthTo, pointAt, samples, upTo } from '../calc/knots/rope';
import { PULL_DRAG, TRACE, move, nearest, pulled, starsFor } from '../calc/knots/trace';
import { SAFETY, makeTest, seeded } from '../calc/knots/quiz';
import { emptyKnots, parseKnots, recordTest, recordTie, serialiseKnots } from '../state/knotProgress';

describe('every knot draws and ties right', () => {
  test.each(KNOTS.map((k) => [k.name, k] as const))('%s: its crossings are the ones it says, its steps run the rope to its end', (_, k) => {
    expect(knotProblems(k)).toEqual([]);
  });
  test('the knots asked for are here, each once', () => {
    expect(KNOTS.map((k) => k.id)).toEqual(expect.arrayContaining(['bowline', 'clove', 'slip', 'figure8']));
    expect(new Set(KNOTS.map((k) => k.id)).size).toBe(KNOTS.length);
    expect(knotById('bowline')?.name).toBe('Bowline');
  });
  test("a job on site is one knot's job, so the test has one right answer", () => {
    const jobs = KNOTS.flatMap((k) => k.jobs);
    expect(new Set(jobs).size).toBe(jobs.length);
  });
  test('the square knot says it is not for joining lines that take a load', () => {
    expect(knotById('square')!.watch).toMatch(/Never to join two lines/);
  });
  test('a crossing string that does not match the drawing is caught', () => {
    const k = knotById('figure8')!;
    expect(knotProblems({ ...k, cross: 'ouo' })).toContain('figure8: 4 crossings drawn, 3 said');
  });
});

describe('pulling it tight', () => {
  test("every knot ends with pulling it tight, saying which parts to pull: an end pulled is the rope's very end or its standing part", () => {
    for (const k of KNOTS) {
      for (const p of k.tight.pulls) expect([k.id, p.at === 0 || p.at === k.ropes[p.rope]!.pts.length - 1 || k.id === 'bowline' || k.id === 'slip']).toEqual([k.id, true]);
      const last = stepsOf(k).at(-1)!;
      expect(last).toMatchObject({ tighten: true, text: k.tight.text });
      expect(last.text).toMatch(/pull/i);
      expect(stepsOf(k)).toHaveLength(k.steps.length + 1);
    }
  });
  test('drawn up, a knot takes less room: its body draws in, its pulled ends go out the way they are pulled', () => {
    for (const k of KNOTS) {
      for (const pull of k.tight.pulls) {
        const loose = k.ropes[pull.rope]!.pts[pull.at]!;
        const tight = morphRopes(k, 1)[pull.rope]!.pts[pull.at]!;
        expect([k.id, (tight[0] - loose[0]) * pull.dir[0] + (tight[1] - loose[1]) * pull.dir[1] > 0]).toEqual([k.id, true]);
      }
    }
    expect(morphRopes(knotById('clove')!, 0)).toBe(knotById('clove')!.ropes);
  });
  test('a pull goes along the way it is pulled, never past tight or back past loose', () => {
    expect(pulled(0, PULL_DRAG / 2, 0, [1, 0])).toBeCloseTo(0.5);
    expect(pulled(0, 0, PULL_DRAG / 2, [1, 0])).toBe(0);
    expect(pulled(0.5, -PULL_DRAG, 0, [1, 0])).toBe(0);
    expect(pulled(0.5, PULL_DRAG * 3, 0, [1, 0])).toBe(1);
  });
});

describe('the rope', () => {
  const k = knotById('clove')!;
  const laid = layout(k.ropes, k.cross);
  const s = laid.samples[0]!;
  test('measured along its length, shown to any length, cut exactly there', () => {
    expect(s.every((p, i) => i === 0 || p.len >= s[i - 1]!.len)).toBe(true);
    const half = s[s.length - 1]!.len / 2;
    expect(upTo(s, half).at(-1)!.len).toBeCloseTo(half, 6);
    const p = pointAt(s, half);
    expect(Math.hypot(p.dx, p.dy)).toBeCloseTo(1, 6);
    expect(lengthTo(s, 0)).toBe(0);
  });
  test('the pipe is drawn after the rope behind it and before the rope in front', () => {
    const parts = draw(k.ropes, k.props, laid, [s.at(-1)!.len]);
    const pipe = parts.findIndex((p) => p.kind === 'prop');
    expect(pipe).toBeGreaterThan(0);
    expect(pipe).toBeLessThan(parts.length - 1);
  });
  test('the working end is taped only once it is shown', () => {
    const tape = (len: number) => draw(k.ropes, k.props, laid, [len]).filter((p) => p.kind === 'stroke' && p.color === '#2b2b2b').length;
    expect(tape(s.at(-1)!.len)).toBe(1);
    expect(tape(0)).toBe(0);
  });
  test('a step reaches further along its rope than the step before', () => {
    const b = knotById('bowline')!;
    expect(reachBefore(b, 0)).toEqual([3]);
    expect(reachAfter(b, b.steps.length - 1)).toEqual([b.ropes[0]!.pts.length - 1]);
  });
});

describe('tying it with a finger', () => {
  const k = knotById('figure8')!;
  const s = samples(k.ropes[0]!.pts);
  const end = s.at(-1)!.len;
  test('the end follows a finger on the path, forwards only, never jumping across the knot', () => {
    let t = { len: 0, off: false, slips: 0 };
    for (const p of s) t = move(t, s, end, p.x + 4, p.y - 3);
    expect(t).toEqual({ len: end, off: false, slips: 0 });
    // A finger dropped on a far part of the knot does not pull the end to it.
    expect(nearest(s, 0, end, s[s.length - 2]!.x, s[s.length - 2]!.y).len).toBeLessThanOrEqual(TRACE.ahead);
  });
  test('wandering off counts one slip until the finger comes back', () => {
    let t = { len: 10, off: false, slips: 0 };
    t = move(t, s, end, 290, 10);
    t = move(t, s, end, 292, 12);
    expect(t.slips).toBe(1);
    const back = s.find((p) => p.len >= 12)!;
    t = move(t, s, end, back.x, back.y);
    expect(t.off).toBe(false);
    expect([starsFor(0), starsFor(1), starsFor(3), starsFor(4)]).toEqual([3, 3, 2, 1]);
  });
});

describe('the knot test', () => {
  test('ten questions, each with one right answer among different options, the same for the same seed', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const qs = makeTest(seeded(seed));
      expect(qs).toHaveLength(10);
      for (const q of qs) {
        expect(q.options.filter((o) => o.id === q.answer)).toHaveLength(1);
        expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length);
        expect(q.why.trim()).not.toBe('');
        if (q.knot) expect(knotById(q.knot)).toBeDefined();
      }
      expect(qs.map((q) => q.kind).sort()).toEqual(['job', 'job', 'job', 'name', 'name', 'name', 'next', 'next', 'safe', 'safe']);
    }
    expect(makeTest(seeded(7))).toEqual(makeTest(seeded(7)));
  });
  test('the safety calls include the ones that hurt people: no knots in slings, none for fall protection', () => {
    expect(SAFETY.find((s) => /sling/.test(s.text))?.safe).toBe(false);
    expect(SAFETY.find((s) => /fall protection/.test(s.text))?.safe).toBe(false);
  });
});

describe('what has been tied', () => {
  test('ties are counted and the best kept; the test keeps its best and last', () => {
    let b = recordTie(emptyKnots(), 'bowline', 21_400, 2, 1);
    b = recordTie(b, 'bowline', 18_000, 3, 2);
    b = recordTie(b, 'bowline', 30_000, 1, 3);
    expect(b.tied.bowline).toEqual({ count: 3, bestMs: 18_000, bestStars: 3, at: 3 });
    expect(recordTie(b, 'not-a-knot', 1, 3, 4)).toBe(b);
    b = recordTest(recordTest(b, 8, 10), 6, 10);
    expect(b.test).toEqual({ best: 8, last: 6, of: 10, taken: 2 });
  });
  test('the store reads back what it wrote, and drops what it cannot use', () => {
    const b = recordTest(recordTie(emptyKnots(), 'clove', 9000, 3, 5), 9, 10);
    expect(parseKnots(serialiseKnots(b))).toEqual(b);
    const raw = JSON.parse(serialiseKnots(b));
    raw.tied.gone = { count: 1, bestMs: 1, bestStars: 1, at: 1 };
    raw.tied.clove.bestStars = 9;
    expect(parseKnots(JSON.stringify(raw))).toMatchObject({ tied: {}, dropped: 2 });
    expect(parseKnots(JSON.stringify({ v: 2 })).foreign).toBe(true);
  });
});
