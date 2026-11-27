import { FORE, REACH, SHOULDER_L, SHOULDER_R, UPPER, flipX, inChest, len, mirror, solve, sub, type Body, type V } from '../calc/crane/figure';
import { GROUPS, SIGNALS, signalById } from '../calc/crane/signals';
import { MISS_MS, TEST_OF, makeRun, makeTest, optionsFor, runTime, weight } from '../calc/crane/drill';
import { seeded } from '../calc/knots/quiz';
import { emptyCrane, parseCrane, quicker, recordCraneTest, recordQuick, recordSeen, serialiseCrane } from '../state/craneProgress';

const frames = (n = 24) => Array.from({ length: n }, (_, i) => i / n);
const dist = (a: V, b: V) => len(sub(a, b));

describe('the crane signals', () => {
  test('the nineteen standard signals, each named once, in a group, mistaken for real ones', () => {
    expect(SIGNALS).toHaveLength(19);
    expect(new Set(SIGNALS.map((s) => s.id)).size).toBe(19);
    expect(new Set(SIGNALS.map((s) => s.name.toLowerCase())).size).toBe(19);
    for (const s of SIGNALS) {
      expect(GROUPS.map((g) => g.id)).toContain(s.group);
      expect(s.near.length).toBeGreaterThanOrEqual(2);
      for (const n of s.near) {
        expect(n).not.toBe(s.id);
        expect(signalById(n)).toBeDefined();
      }
      for (const text of [s.given, s.does, s.tell]) expect(text.trim().length).toBeGreaterThan(10);
    }
  });

  test('every pose can be reached: no arm stretched past its length, the elbow where the bones say', () => {
    for (const s of SIGNALS)
      for (const f of frames()) {
        const b = solve(s.pose(f));
        for (const [limb, shoulder] of [
          [b.r, SHOULDER_R],
          [b.l, SHOULDER_L],
        ] as const) {
          expect([s.id, limb.asked <= REACH + 0.5]).toEqual([s.id, true]);
          expect(dist(limb.shoulder, shoulder)).toBe(0);
          expect(dist(limb.elbow, limb.shoulder)).toBeCloseTo(UPPER, 6);
          expect(dist(limb.hand, limb.elbow)).toBeCloseTo(FORE, 6);
        }
      }
  });

  test('no hand goes through the chest or into the ground', () => {
    for (const s of SIGNALS)
      for (const f of frames()) {
        const b = solve(s.pose(f));
        for (const limb of [b.r, b.l]) {
          expect([s.id, f, inChest(limb.hand)]).toEqual([s.id, f, false]);
          expect(limb.hand[1]).toBeGreaterThan(60);
        }
      }
  });

  test('a held signal holds still; a moving one moves', () => {
    for (const s of SIGNALS) {
      let most = 0;
      const a = solve(s.pose(0));
      for (const f of frames()) {
        const b = solve(s.pose(f));
        most = Math.max(most, dist(a.r.hand, b.r.hand), dist(a.l.hand, b.l.hand), (b.r.grip.open ?? 0) * 10);
      }
      if (s.period === 0) expect([s.id, most]).toEqual([s.id, 0]);
      else expect([s.id, most > 3]).toEqual([s.id, true]);
    }
  });

  test('given with the other hand, it is the same signal turned round', () => {
    for (const s of SIGNALS) {
      const a = solve(s.pose(0.3));
      const b = solve(mirror(s.pose(0.3)));
      expect(dist(b.l.hand, flipX(a.r.hand))).toBeCloseTo(0, 6);
      expect(dist(b.r.hand, flipX(a.l.hand))).toBeCloseTo(0, 6);
    }
  });

  test('no two signals look alike: hands, how they are held, where they go and how they move', () => {
    const look = (b: Body[]) => {
      const mean = (side: 'r' | 'l') => b.reduce<V>((m, x) => [m[0] + x[side].hand[0] / b.length, m[1] + x[side].hand[1] / b.length, m[2] + x[side].hand[2] / b.length], [0, 0, 0]);
      const spread = (side: 'r' | 'l', m: V) => Math.max(...b.map((x) => dist(x[side].hand, m)));
      const mr = mean('r');
      const ml = mean('l');
      const grip = (side: 'r' | 'l') => `${b[0]![side].grip.kind}:${(b[0]![side].grip.dir ?? [0, 0, 0]).map((v) => Math.round(v)).join(',')}`;
      return { mr, ml, sr: spread('r', mr), sl: spread('l', ml), grip: `${grip('r')}|${grip('l')}` };
    };
    const looks = SIGNALS.map((s) => ({ id: s.id, ...look(frames(12).map((f) => solve(s.pose(f)))) }));
    for (let i = 0; i < looks.length; i += 1)
      for (let j = i + 1; j < looks.length; j += 1) {
        const a = looks[i]!;
        const b = looks[j]!;
        const apart = dist(a.mr, b.mr) + dist(a.ml, b.ml) + 2 * Math.abs(a.sr - b.sr) + 2 * Math.abs(a.sl - b.sl);
        expect([a.id, b.id, a.grip !== b.grip || apart > 8]).toEqual([a.id, b.id, true]);
      }
  });
});

describe('the signals test and the quick read', () => {
  test('ten different signals, four choices each with the answer and the ones it is mistaken for', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const qs = makeTest(seeded(seed));
      expect(qs).toHaveLength(TEST_OF);
      expect(new Set(qs.map((q) => q.id)).size).toBe(TEST_OF);
      expect(qs.filter((q) => q.ask === 'read')).toHaveLength(TEST_OF / 2);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.id);
        const near = signalById(q.id)!.near.slice(0, 3);
        for (const n of near) expect(q.options).toContain(n);
        q.options.forEach((o, i) => {
          if (signalById(o)!.twoHands) expect(q.left[i]).toBe(false);
        });
      }
    }
  });

  test('the ones got wrong come up more', () => {
    expect(weight({ right: 0, wrong: 4 })).toBeGreaterThan(weight({ right: 4, wrong: 0 }));
    expect(weight(undefined)).toBeGreaterThan(weight({ right: 6, wrong: 0 }));
    let hits = 0;
    for (let seed = 1; seed <= 200; seed += 1) if (makeTest(seeded(seed), { trolley: { right: 0, wrong: 9 }, ...Object.fromEntries(SIGNALS.filter((s) => s.id !== 'trolley').map((s) => [s.id, { right: 9, wrong: 0 }])) }).some((q) => q.id === 'trolley')) hits += 1;
    expect(hits).toBeGreaterThan(160);
    expect(optionsFor('hoist', seeded(3))).toContain('lower');
  });

  test('the quick read: every signal once, none straight after one it is mistaken for', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const qs = makeRun(seeded(seed));
      expect(qs.map((q) => q.id).sort()).toEqual(SIGNALS.map((s) => s.id).sort());
      const clashes = qs.filter((q, i) => i > 0 && signalById(q.id)!.near.includes(qs[i - 1]!.id)).length;
      expect(clashes).toBe(0);
    }
    expect(runTime(30000, 2)).toBe(30000 + 2 * MISS_MS);
  });
});

describe('the crane signals progress', () => {
  test('kept and read back; a signal not in the app is dropped; a newer file is left alone', () => {
    let b = recordSeen(recordSeen(emptyCrane(), 'hoist', true), 'hoist', false);
    b = recordCraneTest(recordCraneTest(b, 7, 10), 5, 10);
    b = recordQuick(b, { ms: 40000, missed: 1, at: 1 });
    b = recordQuick(b, { ms: 50000, missed: 0, at: 2 });
    b = recordQuick(b, { ms: 30000, missed: 2, at: 3 });
    const back = parseCrane(serialiseCrane(b));
    expect(back.seen.hoist).toEqual({ right: 1, wrong: 1 });
    expect(back.test).toEqual({ best: 7, last: 5, of: 10, taken: 2 });
    expect(back.quick.best).toEqual({ ms: 50000, missed: 0, at: 2 });
    expect(back.quick.last?.ms).toBe(30000);
    expect(back.quick.runs).toBe(3);
    const raw = JSON.parse(serialiseCrane(b));
    raw.seen.semaphore = { right: 1, wrong: 0 };
    expect(parseCrane(JSON.stringify(raw)).dropped).toBe(1);
    expect(parseCrane(JSON.stringify({ ...raw, v: 99 })).foreign).toBe(true);
    expect(parseCrane('nonsense').dropped).toBe(1);
    expect(parseCrane(null)).toEqual(emptyCrane());
    expect(quicker({ ms: 60000, missed: 0, at: 0 }, { ms: 20000, missed: 1, at: 0 })).toBe(true);
  });
});
