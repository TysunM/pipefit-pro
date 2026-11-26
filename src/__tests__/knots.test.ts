import { KNOTS, SHORT_TAIL, checkMarks, faultDrawing, flipped, knotById, knotProblems, morphRopes, reachAfter, reachBefore, stepsOf, tightRopes } from '../calc/knots/knots';
import { ROPE_W, VIEW, draw, layout, lengthTo, pointAt, samples, upTo } from '../calc/knots/rope';
import { jones, polyText, type Closure } from '../calc/knots/jones';
import { laidFault, laidSet, pairFrame } from '../components/knots/laid';
import { HOLD, PULL_DRAG, TRACE, callsFor, missesFor, move, nearest, pulled, starsFor } from '../calc/knots/trace';
import { SAFETY, faultRound, makeTest, seeded } from '../calc/knots/quiz';
import { emptyKnots, parseKnots, recordCert, recordCheck, recordTest, recordTie, serialiseKnots } from '../state/knotProgress';
import { CERTIFIED_UP_TO, FINE_PRINT, QUITE_UP_TO, TIERS, beats, certOrder, certTotals, clock, tierOf, type CertKnot } from '../calc/knots/cert';

describe('every knot draws and ties right', () => {
  test.each(KNOTS.map((k) => [k.name, k] as const))('%s: its crossings are the ones it says, its steps run the rope to its end', (_, k) => {
    expect(knotProblems(k)).toEqual([]);
  });
  test('the knots asked for are here, each once', () => {
    expect(KNOTS.map((k) => k.id)).toEqual(expect.arrayContaining(['bowline', 'clove', 'slip', 'slipknot', 'figure8']));
    // The slip knot as the trade ties it: a sliding loop, wraps round both parts. The one that lets go with a pull is the quick-release knot.
    expect(knotById('slipknot')?.name).toBe('Slip knot');
    expect(knotById('slip')?.name).toBe('Quick-release knot');
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
  test('from memory the hidden line is held tighter: a finger off it by less than a slip with the line shown is off it', () => {
    const at = s.find((p) => p.len >= 30)!;
    const i = s.indexOf(at);
    // A step to the side of the path, square to it: further than the memory line allows, nearer than a slip.
    const dx = s[i + 1]!.x - s[i - 1]!.x;
    const dy = s[i + 1]!.y - s[i - 1]!.y;
    const n = Math.hypot(dx, dy);
    const off = (TRACE.buzz + TRACE.slip) / 2;
    const x = at.x - (dy / n) * off;
    const y = at.y + (dx / n) * off;
    const t0 = { len: at.len, off: false, slips: 0 };
    if (nearest(s, at.len, end, x, y).dist <= TRACE.buzz) throw new Error('the test point is not off the line');
    expect(move(t0, s, end, x, y).slips).toBe(0);
    expect(move(t0, s, end, x, y, TRACE.buzz)).toEqual({ len: at.len, off: true, slips: 1 });
    // Back on the line, it follows again and stops counting.
    expect(move(move(t0, s, end, x, y, TRACE.buzz), s, end, at.x, at.y, TRACE.buzz).off).toBe(false);
    expect(TRACE.buzz).toBeGreaterThan(TRACE.reach);
    expect(TRACE.buzz).toBeLessThan(TRACE.slip);
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
      expect(qs.map((q) => q.kind).sort()).toEqual(['fault', 'fault', 'job', 'job', 'name', 'name', 'next', 'next', 'safe', 'safe']);
      for (const q of qs.filter((x) => x.kind === 'fault')) {
        const k = knotById(q.knot!)!;
        expect(k.faults.map((f) => f.id)).toContain(q.fault);
        expect(q.answer).toBe(q.good === 0 ? 'left' : 'right');
      }
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
  test('tied from memory is kept apart from tied with the line shown', () => {
    let b = recordTie(emptyKnots(), 'bowline', 20_000, 3, 1);
    b = recordTie(b, 'bowline', 41_000, 1, 2, 'memory');
    b = recordTie(b, 'bowline', 35_000, 2, 3, 'memory');
    expect(b.tied.bowline).toEqual({ count: 1, bestMs: 20_000, bestStars: 3, at: 1 });
    expect(b.memory.bowline).toEqual({ count: 2, bestMs: 35_000, bestStars: 2, at: 3 });
    expect(parseKnots(serialiseKnots(b))).toEqual(b);
    // Saved before there was a memory mode: read the same, nothing dropped.
    const old = JSON.parse(serialiseKnots(b));
    delete old.memory;
    expect(parseKnots(JSON.stringify(old))).toMatchObject({ memory: {}, dropped: 0 });
    const bad = JSON.parse(serialiseKnots(b));
    bad.memory.bowline.bestStars = 7;
    expect(parseKnots(JSON.stringify(bad))).toMatchObject({ memory: {}, dropped: 1 });
  });
  test('spot the fault keeps the best round, started again when the knot has a different number of faults', () => {
    let b = recordCheck(emptyKnots(), 'clove', 2, 3, 1);
    b = recordCheck(b, 'clove', 3, 3, 2);
    b = recordCheck(b, 'clove', 1, 3, 3);
    expect(b.checked.clove).toEqual({ best: 3, of: 3, at: 3 });
    expect(recordCheck(b, 'clove', 1, 4, 4).checked.clove).toEqual({ best: 1, of: 4, at: 4 });
    expect(recordCheck(b, 'not-a-knot', 1, 3, 4)).toBe(b);
    expect(recordCheck(b, 'bowline', 9, 2, 5).checked.bowline!.best).toBe(2);
  });
  test('the store reads back what it wrote, and drops what it cannot use', () => {
    const b = recordCheck(recordTest(recordTie(emptyKnots(), 'clove', 9000, 3, 5), 9, 10), 'bowline', 2, 2, 6);
    expect(parseKnots(serialiseKnots(b))).toEqual(b);
    const bad = JSON.parse(serialiseKnots(b));
    bad.checked.bowline.best = 5;
    bad.checked.gone = { best: 1, of: 1, at: 1 };
    expect(parseKnots(JSON.stringify(bad))).toMatchObject({ checked: {}, dropped: 2 });
    // Saved before there was spot the fault: read the same, nothing dropped.
    const old = JSON.parse(serialiseKnots(b));
    delete old.checked;
    expect(parseKnots(JSON.stringify(old))).toMatchObject({ checked: {}, dropped: 0 });
    expect(parseKnots(serialiseKnots(b))).toEqual(b);
    const raw = JSON.parse(serialiseKnots(b));
    raw.tied.gone = { count: 1, bestMs: 1, bestStars: 1, at: 1 };
    raw.tied.clove.bestStars = 9;
    expect(parseKnots(JSON.stringify(raw))).toMatchObject({ tied: {}, dropped: 2 });
    expect(parseKnots(JSON.stringify({ v: 2 })).foreign).toBe(true);
  });
});

// Which knot a drawing is, proved: the Jones polynomial is the same for every
// drawing of a knot, so these hold however the knots are redrawn.
const UNKNOT = '1';
const FIGURE_EIGHT = 't^2 - t + 1 - t^-1 + t^-2';
// A square (reef) knot is a trefoil and its mirror; a granny, two trefoils the same way.
const REEF = '-t^3 + t^2 - t + 3 - t^-1 + t^-2 - t^-3';
const GRANNY = ['t^8 - 2t^7 + t^6 - 2t^5 + 2t^4 + t^2', 't^-2 + 2t^-4 - 2t^-5 + t^-6 - 2t^-7 + t^-8'];
const ONE: Closure = [{ rope: 0 }];
// The square knot as it binds: the two standing parts are one line round the bundle.
const BOUND: Closure = [{ rope: 0, back: true }, { rope: 1 }];
const fault = (id: string, f: string) => knotById(id)!.faults.find((x) => x.id === f)!;

describe('over or under, from memory', () => {
  // The moves as the game ties them: each step that moves the rope, from where it was to where it gets.
  const lengthsAt = (laid: ReturnType<typeof layout>, to: readonly number[]) => to.map((p, i) => lengthTo(laid.samples[i]!, p));
  const movesOf = (k: (typeof KNOTS)[number]) => {
    const laid = layout(k.ropes, k.cross);
    return {
      laid,
      moves: k.steps.map((st, i) => ({ rope: st.rope, from: lengthsAt(laid, reachBefore(k, i))[st.rope]!, to: lengthsAt(laid, reachAfter(k, i))[st.rope]! })).filter((m) => m.to - m.from > 1),
    };
  };
  test.each(KNOTS.map((k) => [k.name, k] as const))('%s: every crossing is asked once, the answer the knot says', (_, k) => {
    const { laid, moves } = movesOf(k);
    const asked = moves.flatMap((m) => callsFor(laid, k.cross, m.rope, m.from, m.to));
    expect(asked.map((c) => c.i).sort((a, b) => a - b)).toEqual(k.cross.split('').map((_, i) => i));
    for (const c of asked) expect(c.over).toBe(k.cross[c.i] === 'o');
  });
  test.each(KNOTS.map((k) => [k.name, k] as const))("%s: the end stops on its own rope short of each crossing, so the answer isn't drawn first", (_, k) => {
    const { laid, moves } = movesOf(k);
    for (const m of moves) {
      const calls = callsFor(laid, k.cross, m.rope, m.from, m.to);
      const s = laid.samples[m.rope]!;
      for (const c of calls) {
        expect(c.stop).toBeGreaterThanOrEqual(m.from);
        // Short of it by the hold; a crossing nearer the step's start than that is asked before the end moves at all.
        if (c.len - m.from >= HOLD) expect(c.len - c.stop).toBeGreaterThanOrEqual(HOLD - 1e-9);
        else expect(c.stop).toBe(m.from);
        // A point the rope has, so the end comes to rest on it exactly.
        if (c.stop > m.from) expect(s.some((p) => p.len === c.stop)).toBe(true);
        // The end resting there is clear of the strand it is about to cross.
        const tip = pointAt(s, c.stop);
        if (c.stop > m.from) expect(Math.hypot(tip.x - c.x, tip.y - c.y)).toBeGreaterThan(ROPE_W);
        // Traced right to it, the end stops there and goes no further.
        let tr = { len: m.from, off: false, slips: 0 };
        for (const p of s) if (p.len >= m.from && p.len <= c.len + 20) tr = move(tr, s, c.stop, p.x, p.y, TRACE.buzz);
        expect(tr.len).toBe(c.stop);
      }
    }
  });
  test('a wrong call counts as two slips', () => {
    expect(missesFor(0, 0)).toBe(0);
    expect(starsFor(missesFor(1, 0))).toBe(3);
    expect(starsFor(missesFor(0, 1))).toBe(2);
    expect(starsFor(missesFor(0, 2))).toBe(1);
  });
});

describe('dress and check', () => {
  test('the knot polynomial knows the knots: no crossings is no knot', () => {
    const k = knotById('figure8')!;
    expect(polyText(jones([{ pts: [[0, 150], [300, 150]], start: 0, color: 'a' }], '', ONE))).toBe(UNKNOT);
    // The same knot drawn as tied and pulled tight.
    expect(polyText(jones(tightRopes(k), k.cross, ONE))).toBe(polyText(jones(k.ropes, k.cross, ONE)));
  });
  test('the figure eight is a figure eight, the square knot a square knot and not a granny, the quick-release knot no knot at all', () => {
    const f8 = knotById('figure8')!;
    const sq = knotById('square')!;
    const slip = knotById('slip')!;
    expect(polyText(jones(f8.ropes, f8.cross, ONE))).toBe(FIGURE_EIGHT);
    expect(polyText(jones(sq.ropes, sq.cross, BOUND))).toBe(REEF);
    // One pull on the tail and it is gone: there is no knot in it.
    expect(polyText(jones(slip.ropes, slip.cross, ONE))).toBe(UNKNOT);
  });
  test("the faults drawn are the knots they say: the figure eight's last tuck over is no knot, the square knot's fault a granny", () => {
    const f8 = knotById('figure8')!;
    const sq = knotById('square')!;
    const tuck = fault('figure8', 'tuck');
    const granny = fault('square', 'granny');
    if (tuck.kind !== 'cross' || granny.kind !== 'cross') throw new Error('faults changed kind');
    expect(polyText(jones(f8.ropes, flipped(f8.cross, tuck.flip), ONE))).toBe(UNKNOT);
    expect(GRANNY).toContain(polyText(jones(sq.ropes, flipped(sq.cross, granny.flip), BOUND)));
    expect(tuck.why).toMatch(/falls straight out/);
  });
  test.each(KNOTS.map((k) => [k.name, k] as const))('%s: every fault draws, and differs from the knot tied right', (_, k) => {
    const right = layout(tightRopes(k), k.cross);
    for (const f of k.faults) {
      const d = faultDrawing(k, f);
      const laid = layout(d.ropes, d.cross);
      // The same crossings: a fault is the knot tied wrong, not another drawing.
      expect(laid.crossings).toHaveLength(k.cross.length);
      if (f.kind === 'cross') {
        expect(d.cross).not.toBe(k.cross);
        expect([...d.cross].filter((ch, i) => ch !== k.cross[i]).length).toBe(f.flip.length);
      }
      if (f.kind === 'loose') expect(d.ropes).toBe(k.ropes);
      if (f.kind === 'short') {
        for (const r of f.ropes) {
          const keep = d.keep[r]!;
          const whole = right.samples[r]!.at(-1)!.len;
          // Visibly short: well under the tail tied right.
          expect(keep).toBeLessThan(whole - SHORT_TAIL);
          // Never cut in the middle of a crossing: a pass shown is a rope width clear of the cut.
          for (const c of laid.crossings) for (const side of [c.later, c.earlier]) if (side.rope === r && side.len <= keep) expect(keep - side.len).toBeGreaterThanOrEqual(ROPE_W);
        }
      }
    }
  });
  test('the timber hitch cut to one twist keeps its turn and one twist: three crossings before, three twists dropped to one', () => {
    const k = knotById('timber')!;
    const f = fault('timber', 'twists');
    const d = faultDrawing(k, f);
    const laid = layout(d.ropes, d.cross);
    const shown = laid.crossings.filter((c) => c.later.len <= d.keep[0]!);
    expect(shown).toHaveLength(3);
    expect(k.checks.some((c) => /Three twists at least/.test(c.text))).toBe(true);
  });
  test('every check that points at the knot points inside the drawing, numbered in order', () => {
    for (const k of KNOTS) {
      const m = checkMarks(k);
      expect(m.length).toBeGreaterThan(0);
      for (const p of m) {
        expect(p.x).toBeGreaterThanOrEqual(5);
        expect(p.x).toBeLessThanOrEqual(VIEW - 5);
        expect(p.y).toBeGreaterThanOrEqual(5);
        expect(p.y).toBeLessThanOrEqual(VIEW - 5);
      }
      expect(m.map((p) => p.n)).toEqual([...m.map((p) => p.n)].sort((a, b) => a - b));
    }
  });
  test('a pair is zoomed on the knot, the same frame both sides, every crossing and a cut end in it', () => {
    for (const k of KNOTS) {
      for (const f of k.faults) {
        const fr = pairFrame(k, f);
        expect(fr.s).toBeGreaterThanOrEqual(150);
        expect(fr.x).toBeGreaterThanOrEqual(0);
        expect(fr.y).toBeGreaterThanOrEqual(0);
        expect(fr.x + fr.s).toBeLessThanOrEqual(VIEW + 1e-9);
        expect(fr.y + fr.s).toBeLessThanOrEqual(VIEW + 1e-9);
        const inside = (p: { x: number; y: number }) => p.x >= fr.x && p.x <= fr.x + fr.s && p.y >= fr.y && p.y <= fr.y + fr.s;
        for (const c of [...laidSet(k).laid.crossings, ...laidFault(k, f).laid.crossings]) expect(inside(c)).toBe(true);
        const w = laidFault(k, f);
        w.shown.forEach((len, r) => {
          if (len < w.laid.samples[r]!.at(-1)!.len) expect(inside(pointAt(w.laid.samples[r]!, len))).toBe(true);
        });
      }
    }
  });
  test('a round shows every fault once, the knot tied right on both sides over the rounds', () => {
    for (const k of KNOTS) {
      const sides = new Set<number>();
      for (let seed = 1; seed < 40; seed += 1) {
        const round = faultRound(k, seeded(seed));
        expect(round.map((r) => r.fault.id).sort()).toEqual(k.faults.map((f) => f.id).sort());
        round.forEach((r) => sides.add(r.good));
      }
      expect([...sides].sort()).toEqual([0, 1]);
    }
  });
  test('the safety that matters is in the faults: none is left unset, and every knot warns of a short tail, drawn or said', () => {
    for (const k of KNOTS) {
      expect(k.faults.some((f) => f.kind === 'loose')).toBe(true);
      expect(k.faults.some((f) => f.kind === 'short') || /tail/i.test(k.watch)).toBe(true);
    }
    // The sheet bend's tail is drawn inside the bight, too short to show cut shorter: its warning is said.
    expect(knotById('sheetbend')!.watch).toMatch(/Leave long tails/);
  });
});

describe('Knot Certified', () => {
  const clean = (ms = 20_000): CertKnot[] => KNOTS.map((k) => ({ id: k.id, ms, slips: 0, wrong: 0 }));
  test('every knot once, in an order that changes run to run, the same for the same seed', () => {
    const ids = KNOTS.map((k) => k.id).sort();
    const orders = new Set<string>();
    for (let seed = 1; seed < 30; seed += 1) {
      const o = certOrder(seeded(seed));
      expect([...o].sort()).toEqual(ids);
      orders.add(o.join());
    }
    expect(orders.size).toBeGreaterThan(20);
    expect(certOrder(seeded(5))).toEqual(certOrder(seeded(5)));
  });
  test('scored on misses, a wrong call as two; tying time only', () => {
    const run = clean();
    run[0] = { ...run[0]!, slips: 1, wrong: 1 };
    const t = certTotals(run);
    expect(t).toMatchObject({ ms: 20_000 * KNOTS.length, slips: 1, wrong: 1, misses: 3, tied: KNOTS.length, skipped: 0, of: KNOTS.length });
  });
  test('the tiers: clean is a grand master, a few misses certified, more knot quite, many or any skip knot yet', () => {
    const withMisses = (n: number) => {
      const run = clean();
      run[0] = { ...run[0]!, slips: n };
      return certTotals(run);
    };
    expect(tierOf(withMisses(0))).toBe('grand');
    expect(tierOf(withMisses(1))).toBe('certified');
    expect(tierOf(withMisses(CERTIFIED_UP_TO))).toBe('certified');
    expect(tierOf(withMisses(CERTIFIED_UP_TO + 1))).toBe('quite');
    expect(tierOf(withMisses(QUITE_UP_TO))).toBe('quite');
    expect(tierOf(withMisses(QUITE_UP_TO + 1))).toBe('yet');
    const skipped = clean();
    skipped[3] = { ...skipped[3]!, skipped: true };
    expect(tierOf(certTotals(skipped))).toBe('yet');
    // A skipped knot's time and misses don't count, and it can't hide behind them.
    expect(certTotals(skipped)).toMatchObject({ tied: KNOTS.length - 1, skipped: 1 });
    expect(tierOf(certTotals(clean().slice(0, 3)))).toBe('yet');
  });
  test("it's a joke, and says so: the stamps read KNOT, the fine print certifies nothing", () => {
    expect(TIERS.grand.stamp).toBe('KNOT CERTIFIED');
    expect(TIERS.quite.struck).toBe('CERTIFIED');
    expect(TIERS.yet.stamp).toBe('KNOT YET');
    expect(FINE_PRINT).toMatch(/certifies absolutely nothing/);
    expect(FINE_PRINT).toMatch(/fall protection/);
  });
  test('the best run is the better tier, then fewer misses, then faster', () => {
    const fast = certTotals(clean(10_000));
    const slow = certTotals(clean(30_000));
    const sloppy = certTotals(clean(5_000).map((r, i) => (i ? r : { ...r, slips: 2 })));
    expect(beats(fast, slow)).toBe(true);
    expect(beats(slow, fast)).toBe(false);
    expect(beats(slow, sloppy)).toBe(true);
    expect(clock(187_400)).toBe('3:07');
  });
  test('the store keeps the best and the last run, and how many', () => {
    const good = certTotals(clean(10_000));
    const worse = certTotals(clean(40_000).map((r, i) => (i ? r : { ...r, wrong: 3 })));
    let b = recordCert(emptyKnots(), worse, 1, beats);
    b = recordCert(b, good, 2, beats);
    b = recordCert(b, worse, 3, beats);
    expect(b.cert.runs).toBe(3);
    expect(b.cert.best).toEqual({ ...good, at: 2 });
    expect(b.cert.last).toEqual({ ...worse, at: 3 });
    expect(parseKnots(serialiseKnots(b))).toEqual(b);
    const bad = JSON.parse(serialiseKnots(b));
    bad.cert.best.misses = 99;
    expect(parseKnots(JSON.stringify(bad)).cert.best).toBeNull();
    const old = JSON.parse(serialiseKnots(b));
    delete old.cert;
    expect(parseKnots(JSON.stringify(old))).toMatchObject({ cert: { best: null, last: null, runs: 0 }, dropped: 0 });
  });
});
