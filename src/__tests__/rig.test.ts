import { makeLeg, solveSpool, type SpoolLeg } from '../calc/spool';
import { findSize, pipeWeightPerFoot } from '../calc/pipe';
import { GOOD_PICK_ANGLE, hookHeightFor, pointAt, rig, spoolWeight, suggestPicks, type Extra } from '../calc/rig';

const pipe = { nps: 2, kind: 'LR' as const, schedule: '40' as const };
const build = (legs: SpoolLeg[]) => solveSpool({ legs, ...pipe, gap: 0 });
const straight = build([makeLeg('a', 120)]);
const perFt = () => {
  const s = findSize(2);
  return pipeWeightPerFoot(s.od, s.wall['40']);
};

describe('what the spool weighs, and where', () => {
  test('a straight length weighs its feet of pipe, its centre of gravity halfway along', () => {
    const w = spoolWeight(straight, pipe, { water: false, extras: [] })!;
    expect(w.total).toBeCloseTo(10 * perFt(), 6);
    expect(w.elbows).toBe(0);
    expect(w.cg.z).toBeCloseTo(60, 6);
    expect(w.cg.y).toBeCloseTo(0, 6);
  });
  test('full of water it weighs more, by the water in the bore', () => {
    const dry = spoolWeight(straight, pipe, { water: false, extras: [] })!;
    const wet = spoolWeight(straight, pipe, { water: true, extras: [] })!;
    const s = findSize(2);
    const bore = s.od - 2 * s.wall['40'];
    expect(wet.water).toBeCloseTo(10 * (Math.PI / 4) * bore * bore * (62.4 / 144), 6);
    expect(wet.total).toBeCloseTo(dry.total + wet.water, 6);
  });
  test('an elbow adds its weight at its bend; a valve typed in moves the centre of gravity toward it', () => {
    const l = build([makeLeg('a', 60), makeLeg('b', 60, 90, 0)]);
    const w = spoolWeight(l, pipe, { water: false, extras: [] })!;
    expect(w.elbows).toBeGreaterThan(0);
    expect(w.total).toBeCloseTo(w.pipe + w.elbows, 6);
    const valve: Extra = { name: 'Valve', weight: 80, at: { run: 0, along: 10 } };
    const heavy = spoolWeight(straight, pipe, { water: false, extras: [valve] })!;
    expect(heavy.extras).toBe(80);
    expect(heavy.cg.z).toBeLessThan(60);
    expect(heavy.cg.z).toBeCloseTo((60 * 10 * perFt() + 10 * 80) / (10 * perFt() + 80), 6);
  });
  test('a spool that does not solve has no weight', () => {
    expect(spoolWeight(build([]), pipe, { water: false, extras: [] })).toBeNull();
  });
});

describe('the pick', () => {
  const w = spoolWeight(straight, pipe, { water: false, extras: [] })!;
  const at = (along: number) => pointAt(straight, { run: 0, along })!;
  test('balanced: two equal legs at 60°, each carrying half the weight times 1.155', () => {
    const h = hookHeightFor(at(30), at(90), w.cg)!;
    expect(h).toBeCloseTo(30 * Math.tan((GOOD_PICK_ANGLE * Math.PI) / 180), 6);
    expect(rig(at(30), at(90), w.total, w.cg, 0)).toMatchObject({ ok: false });
    const r = rig(at(30), at(90), w.total, w.cg, h);
    if (!r.ok) throw new Error(r.why);
    for (const l of r.legs) {
      expect(l.angle).toBeCloseTo(60, 6);
      expect(l.tension).toBeCloseTo(w.total / 2 / Math.sin(Math.PI / 3), 6);
      expect(l.band).toBe('good');
    }
    expect(r.legs[0].length).toBeCloseTo(60, 6);
    expect(r.warnings).toEqual([]);
  });
  test('off centre: the pick nearer the centre of gravity takes more, the shares hold the weight and balance about the hook', () => {
    const heavy = spoolWeight(straight, pipe, { water: false, extras: [{ name: 'Valve', weight: 60, at: { run: 0, along: 100 } }] })!;
    const r = rig(at(20), at(100), heavy.total, heavy.cg, 70);
    if (!r.ok) throw new Error(r.why);
    const [a, b] = r.legs;
    expect(b.share).toBeGreaterThan(a.share);
    expect(a.share + b.share).toBeCloseTo(heavy.total, 6);
    expect(a.share * r.cg.s).toBeCloseTo(b.share * (r.span - r.cg.s), 6);
    // Each leg pulls in as hard as the other: the hook is in balance sideways.
    expect(a.sideways).toBeCloseTo(b.sideways, 6);
  });
  test('picks at different heights: the two legs still hold the weight up and balance sideways', () => {
    const l = build([makeLeg('a', 72), makeLeg('b', 48, 90, 0)]);
    const lw = spoolWeight(l, pipe, { water: false, extras: [] })!;
    const p1 = pointAt(l, { run: 0, along: 12 })!;
    const p2 = pointAt(l, { run: 1, along: 40 })!;
    const r = rig(p1, p2, lw.total, lw.cg, 60);
    if (!r.ok) throw new Error(r.why);
    expect(r.legs[0].share + r.legs[1].share).toBeCloseTo(lw.total, 6);
    expect(r.legs[0].sideways).toBeCloseTo(r.legs[1].sideways, 6);
  });
  test('a centre of gravity outside the picks tips: no answer, and it says which end', () => {
    const r = rig(at(10), at(50), w.total, w.cg, 60);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.why).toMatch(/outside pick 2/);
  });
  test('one pick above the other, or a hook below a pick, is no pick', () => {
    expect(rig({ x: 0, y: 0, z: 0 }, { x: 0, y: 30, z: 0 }, 100, { x: 0, y: 10, z: 0 }, 20)).toMatchObject({ ok: false });
  });
  test('a centre of gravity off the line between the picks rolls; one above the picks can roll over', () => {
    // An L in plan: east, then north. Picked at the two far ends, the corner hangs off the line between them.
    const l = build([makeLeg('a', 60), makeLeg('b', 60, 90, 90)]);
    const lw = spoolWeight(l, pipe, { water: false, extras: [] })!;
    const r = rig(pointAt(l, { run: 0, along: 6 })!, pointAt(l, { run: 1, along: 54 })!, lw.total, lw.cg, 80);
    if (!r.ok) throw new Error(r.why);
    expect(r.offPlane).toBeGreaterThan(5);
    expect(r.warnings.map((x) => x.id)).toContain('rolls');
    // A U standing up, picked at the bottom of both legs: its weight is above the picks.
    const u = build([makeLeg('a', 60, 0, 0), makeLeg('b', 48, 90, 0), makeLeg('c', 60, 90, 0)]);
    const uw = spoolWeight(u, pipe, { water: false, extras: [] })!;
    const low = rig(pointAt(u, { run: 0, along: 2 })!, pointAt(u, { run: 2, along: 58 })!, uw.total, uw.cg, 80);
    if (low.ok) expect(low.warnings.map((x) => x.id)).toContain('overturns');
  });
  test('a flat leg is called out', () => {
    const r = rig(at(10), at(110), w.total, w.cg, 10);
    if (!r.ok) throw new Error(r.why);
    expect(r.legs[0].angle).toBeLessThan(30);
    expect(r.warnings.map((x) => x.id)).toContain('flat');
  });
  test('the suggested picks hang the spool as it sits, the centre of gravity inside them', () => {
    for (const spool of [straight, build([makeLeg('a', 60), makeLeg('b', 60, 90, 90)]), build([makeLeg('a', 36), makeLeg('b', 24, 90, 0), makeLeg('c', 30, 90, 180)])]) {
      const sw = spoolWeight(spool, pipe, { water: false, extras: [] })!;
      const pair = suggestPicks(spool, sw.cg);
      expect(pair).not.toBeNull();
      const r = rig(pointAt(spool, pair![0])!, pointAt(spool, pair![1])!, sw.total, sw.cg, 60);
      expect(r.ok).toBe(true);
    }
  });
});
