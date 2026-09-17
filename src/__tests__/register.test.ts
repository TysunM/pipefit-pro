import {
  Joint,
  MAX_JOINTS,
  REGISTER_VERSION,
  Register,
  SCRATCH_ID,
  doneJoints,
  emptyRegister,
  freshId,
  getJoint,
  isDone,
  listed,
  newJoint,
  openJoints,
  parseRegister,
  pruneRegister,
  putJoint,
  removeJoint,
  serialiseRegister,
  sinceLabel,
  sortJoints,
  validJoint,
  validState,
  withFlange,
  withState,
} from '../state/register';
import { PASSES, expectedBolt, isFinished, startBoltUp, tapBolt } from '../calc/boltUpSequence';
import { BOLT_UP_125, BOLT_UP_250 } from '../calc/boltUp';

const REAL_COUNTS = Array.from(new Set([...BOLT_UP_125, ...BOLT_UP_250].map((b) => b.bolts))).sort(
  (a, b) => a - b,
);

const T0 = 1_700_000_000_000;

const spec = (bolts: number) => ({ cls: '125' as const, nps: null, bolts });

/** Every state a joint passes through on the way to finished. */
function walk(bolts: number): ReturnType<typeof startBoltUp>[] {
  const out = [startBoltUp(bolts)];
  let s = out[0]!;
  while (!isFinished(s)) {
    s = tapBolt(s, expectedBolt(s)).state;
    out.push(s);
  }
  return out;
}

describe('a state survives being written down and read back', () => {
  it('round-trips every state of a whole joint, for every real bolt count', () => {
    for (const bolts of REAL_COUNTS) {
      for (const state of walk(bolts)) {
        const j = withState(newJoint('j1', spec(bolts), T0), state, T0 + 1);
        const back = parseRegister(serialiseRegister({ ...emptyRegister(), joints: [j] }));
        expect(back.dropped).toBe(0);
        expect(back.foreign).toBe(false);
        expect(back.joints).toHaveLength(1);
        expect(back.joints[0]!.state).toEqual(state);
      }
    }
  });

  it('round-trips the whole joint, not only its state', () => {
    const j: Joint = {
      ...newJoint('8-cws-102', { cls: '250', nps: 6, bolts: 8, tag: '8-CWS-102 FL3', note: 'pump suction' }, T0),
      torque: 275,
    };
    const worked = withState(j, tapBolt(j.state, 1).state, T0 + 5000);
    const back = parseRegister(serialiseRegister({ ...emptyRegister(), joints: [worked] }));
    expect(back.joints[0]).toEqual(worked);
  });

  it('keeps a wrong-tap flag, because it is what the screen points at', () => {
    const j = newJoint('j1', spec(8), T0);
    const wrong = withState(j, tapBolt(j.state, 5).state, T0 + 1);
    const back = parseRegister(serialiseRegister({ ...emptyRegister(), joints: [wrong] }));
    expect(back.joints[0]!.state.lastWrong).toBe(5);
    expect(back.joints[0]!.state.wrongCount).toBe(1);
  });

  it('reads an empty or missing store as an empty register', () => {
    for (const raw of [null, undefined, '']) {
      expect(parseRegister(raw)).toEqual(emptyRegister());
    }
  });
});

describe('a store that does not hold up is dropped, never repaired', () => {
  const holding = (state: unknown, bolts = 8) => ({
    v: REGISTER_VERSION,
    joints: [{ ...newJoint('j1', spec(bolts), T0), state }],
  });

  it('refuses a level array that disagrees with the step', () => {
    // Three bolts coloured in, but the step says one. Loading this would put
    // the screen on the wrong bolt, which is worse than losing the joint.
    const bad = { bolts: 8, pass: 0, step: 1, level: [1, 1, 1, 0, 0, 0, 0, 0], lastWrong: null, wrongCount: 0 };
    expect(validState(bad, 8)).toBeNull();
    expect(parseRegister(JSON.stringify(holding(bad)))).toEqual({ joints: [], foreign: false, dropped: 1 });
  });

  it('refuses a bolt that has run ahead of the pass', () => {
    const bad = { bolts: 8, pass: 0, step: 1, level: [3, 0, 0, 0, 0, 0, 0, 0], lastWrong: null, wrongCount: 0 };
    expect(validState(bad, 8)).toBeNull();
  });

  it('refuses a level array of the wrong length', () => {
    const bad = { bolts: 8, pass: 0, step: 0, level: [0, 0, 0, 0], lastWrong: null, wrongCount: 0 };
    expect(validState(bad, 8)).toBeNull();
  });

  it('refuses a finished state with a bolt still short', () => {
    const bad = { bolts: 4, pass: 4, step: 0, level: [4, 4, 4, 3], lastWrong: null, wrongCount: 0 };
    expect(validState(bad, 4)).toBeNull();
  });

  it('refuses a step at or past the bolt count, and a pass past the last one', () => {
    expect(validState({ bolts: 4, pass: 0, step: 4, level: [1, 1, 1, 1], lastWrong: null, wrongCount: 0 }, 4)).toBeNull();
    expect(validState({ bolts: 4, pass: 5, step: 0, level: [4, 4, 4, 4], lastWrong: null, wrongCount: 0 }, 4)).toBeNull();
    expect(validState({ bolts: 4, pass: -1, step: 0, level: [0, 0, 0, 0], lastWrong: null, wrongCount: 0 }, 4)).toBeNull();
  });

  it('refuses a state whose bolt count is not the joint’s', () => {
    const s = startBoltUp(8);
    expect(validState(s, 12)).toBeNull();
    expect(validState(s, 8)).toEqual(s);
  });

  it('refuses a wrong-tap flag pointing off the flange', () => {
    for (const lastWrong of [0, 9, 1.5, 'x', -1]) {
      expect(validState({ ...startBoltUp(8), lastWrong }, 8)).toBeNull();
    }
    expect(validState({ ...startBoltUp(8), wrongCount: -1 }, 8)).toBeNull();
  });

  it('refuses junk in place of a state', () => {
    for (const bad of [null, 4, 'x', [], undefined]) expect(validState(bad, 8)).toBeNull();
  });

  it('refuses a joint whose done flag and state disagree', () => {
    const open = newJoint('j1', spec(4), T0);
    expect(validJoint({ ...open, completedAt: T0 })).toBeNull();

    const walked = walk(4);
    const finished = withState(open, walked[walked.length - 1]!, T0 + 1);
    expect(validJoint({ ...finished, completedAt: null })).toBeNull();
    expect(validJoint(finished)).toEqual(finished);
  });

  it('refuses a joint with a bad class, size, torque, count or id', () => {
    const ok = newJoint('j1', { cls: '125', nps: 6, bolts: 8 }, T0);
    expect(validJoint(ok)).toEqual(ok);
    expect(validJoint({ ...ok, id: '' })).toBeNull();
    expect(validJoint({ ...ok, cls: '300' })).toBeNull();
    expect(validJoint({ ...ok, nps: 0 })).toBeNull();
    expect(validJoint({ ...ok, nps: 'six' })).toBeNull();
    expect(validJoint({ ...ok, bolts: 2.5 })).toBeNull();
    expect(validJoint({ ...ok, torque: -10 })).toBeNull();
    expect(validJoint({ ...ok, torque: Infinity })).toBeNull();
    expect(validJoint({ ...ok, tag: 7 })).toBeNull();
    expect(validJoint({ ...ok, note: null })).toBeNull();
    expect(validJoint({ ...ok, createdAt: -1 })).toBeNull();
    expect(validJoint({ ...ok, updatedAt: 'now' })).toBeNull();
    // A null size is legitimate: the bolt count was set by hand.
    expect(validJoint({ ...ok, nps: null })).not.toBeNull();
    // As is no torque figure.
    expect(validJoint({ ...ok, torque: null })).not.toBeNull();
  });

  it('drops only the joints that fail, and counts them', () => {
    const good = newJoint('good', spec(8), T0);
    const store = JSON.stringify({
      v: REGISTER_VERSION,
      joints: [good, { ...newJoint('bad', spec(8), T0), state: { nonsense: true } }, 42, null],
    });
    const r = parseRegister(store);
    expect(r.joints.map((j) => j.id)).toEqual(['good']);
    expect(r.dropped).toBe(3);
  });

  it('drops a duplicated id rather than letting two joints share one', () => {
    const j = newJoint('dup', spec(8), T0);
    const r = parseRegister(JSON.stringify({ v: REGISTER_VERSION, joints: [j, j] }));
    expect(r.joints).toHaveLength(1);
    expect(r.dropped).toBe(1);
  });

  it('survives text that is not JSON at all', () => {
    const r = parseRegister('{not json');
    expect(r.joints).toEqual([]);
    expect(r.dropped).toBe(1);
  });

  it('survives a store that is the wrong shape entirely', () => {
    for (const raw of ['[]', '"hello"', '4', '{"v":1}', '{"joints":[]}', '{"v":0,"joints":[]}']) {
      const r = parseRegister(raw);
      expect(r.joints).toEqual([]);
      expect(r.foreign).toBe(false);
    }
  });
});

describe('a store from a newer app is left alone', () => {
  it('comes back empty and flagged, not half-read', () => {
    const j = newJoint('j1', spec(8), T0);
    const r = parseRegister(JSON.stringify({ v: REGISTER_VERSION + 1, joints: [j], somethingNew: 1 }));
    expect(r.foreign).toBe(true);
    expect(r.joints).toEqual([]);
    expect(r.dropped).toBe(0);
  });

  it('is told apart from a store that is merely broken', () => {
    expect(parseRegister('{broken').foreign).toBe(false);
    expect(parseRegister(JSON.stringify({ v: 99, joints: [] })).foreign).toBe(true);
  });

  it('writes the version it can read', () => {
    expect(JSON.parse(serialiseRegister(emptyRegister())).v).toBe(REGISTER_VERSION);
  });
});

describe('working a joint keeps the record honest', () => {
  it('sets the finish time from the state, so the two cannot disagree', () => {
    let j = newJoint('j1', spec(4), T0);
    for (const [i, state] of walk(4).entries()) {
      j = withState(j, state, T0 + i);
      expect(isDone(j)).toBe(isFinished(state));
      expect(validJoint(j)).not.toBeNull();
    }
    expect(j.completedAt).toBe(T0 + 16);
  });

  it('keeps the first finish time when a finished joint is written again', () => {
    const walked = walk(4);
    const end = walked[walked.length - 1]!;
    const first = withState(newJoint('j1', spec(4), T0), end, T0 + 100);
    const again = withState(first, end, T0 + 999);
    expect(again.completedAt).toBe(T0 + 100);
    expect(again.updatedAt).toBe(T0 + 999);
  });

  it('reopens a joint that is undone back past the end', () => {
    const walked = walk(4);
    const done = withState(newJoint('j1', spec(4), T0), walked[walked.length - 1]!, T0 + 1);
    const back = withState(done, walked[walked.length - 2]!, T0 + 2);
    expect(back.completedAt).toBeNull();
    expect(isDone(back)).toBe(false);
  });

  it('starts the bolt-up again when the flange changes', () => {
    const j = withState(newJoint('j1', spec(8), T0), tapBolt(startBoltUp(8), 1).state, T0 + 1);
    const moved = withFlange(j, { cls: '125', nps: 12, bolts: 12 }, T0 + 2);
    expect(moved.bolts).toBe(12);
    expect(moved.state).toEqual(startBoltUp(12));
    expect(validJoint(moved)).not.toBeNull();
  });

  it('leaves the work alone when the flange has not actually changed', () => {
    const j = withState(newJoint('j1', { cls: '125', nps: 6, bolts: 8 }, T0), tapBolt(startBoltUp(8), 1).state, T0 + 1);
    const same = withFlange(j, { cls: '125', nps: 6, bolts: 8 }, T0 + 2);
    expect(same.state).toEqual(j.state);
  });

  it('keeps the torque figure across a flange change unless a new one is given', () => {
    const j = { ...newJoint('j1', spec(8), T0), torque: 300 };
    expect(withFlange(j, spec(8), T0 + 1).torque).toBe(300);
    expect(withFlange(j, { ...spec(8), torque: 450 }, T0 + 1).torque).toBe(450);
    expect(withFlange(j, { ...spec(8), torque: null }, T0 + 1).torque).toBeNull();
  });
});

describe('the list puts live work first', () => {
  const at = (id: string, updated: number, done: number | null): Joint => {
    const walked = walk(4);
    const base = newJoint(id, spec(4), T0);
    const j = done === null ? base : withState(base, walked[walked.length - 1]!, updated);
    return { ...j, updatedAt: updated, completedAt: done };
  };

  it('sorts unfinished by last touched, then finished by last finished', () => {
    const r = sortJoints([
      at('doneOld', T0 + 1, T0 + 1),
      at('openOld', T0 + 2, null),
      at('doneNew', T0 + 3, T0 + 3),
      at('openNew', T0 + 4, null),
    ]);
    expect(r.map((j) => j.id)).toEqual(['openNew', 'openOld', 'doneNew', 'doneOld']);
  });

  it('breaks a tie on id rather than leaving the order to chance', () => {
    const a = sortJoints([at('b', T0, null), at('a', T0, null)]);
    const b = sortJoints([at('a', T0, null), at('b', T0, null)]);
    expect(a.map((j) => j.id)).toEqual(['a', 'b']);
    expect(b.map((j) => j.id)).toEqual(['a', 'b']);
  });

  it('keeps the scratch joint out of every list', () => {
    const r: Register = { ...emptyRegister(), joints: [at(SCRATCH_ID, T0 + 9, null), at('named', T0, null)] };
    expect(listed(r).map((j) => j.id)).toEqual(['named']);
    expect(openJoints(r).map((j) => j.id)).toEqual(['named']);
    expect(getJoint(r, SCRATCH_ID)).toBeDefined();
  });

  it('splits open from done', () => {
    const r: Register = { ...emptyRegister(), joints: sortJoints([at('a', T0, null), at('b', T0, T0)]) };
    expect(openJoints(r).map((j) => j.id)).toEqual(['a']);
    expect(doneJoints(r).map((j) => j.id)).toEqual(['b']);
  });
});

describe('putting and removing', () => {
  it('replaces on the same id instead of adding a second', () => {
    let r = putJoint(emptyRegister(), newJoint('j1', spec(8), T0));
    r = putJoint(r, { ...newJoint('j1', spec(8), T0), tag: 'renamed', updatedAt: T0 + 1 });
    expect(r.joints).toHaveLength(1);
    expect(r.joints[0]!.tag).toBe('renamed');
  });

  it('takes a joint out and leaves the rest', () => {
    let r = putJoint(emptyRegister(), newJoint('a', spec(8), T0));
    r = putJoint(r, newJoint('b', spec(8), T0 + 1));
    expect(removeJoint(r, 'a').joints.map((j) => j.id)).toEqual(['b']);
    expect(removeJoint(r, 'nope').joints).toHaveLength(2);
  });

  it('hands out an id nothing else is using', () => {
    let r = emptyRegister();
    expect(freshId(r, '8-CWS-102')).toBe('8CWS102');
    r = putJoint(r, newJoint('8CWS102', spec(8), T0));
    expect(freshId(r, '8-CWS-102')).toBe('8CWS102-2');
    r = putJoint(r, newJoint('8CWS102-2', spec(8), T0));
    expect(freshId(r, '8-CWS-102')).toBe('8CWS102-3');
  });

  it('never hands out the scratch id, whatever the tag', () => {
    expect(freshId(emptyRegister(), 'scratch')).toBe('scratch-2');
    expect(freshId(emptyRegister(), '!!!')).toBe('j');
  });
});

describe('the cap never costs anyone unfinished work', () => {
  const done = (id: string, finishedAt: number): Joint => {
    const walked = walk(4);
    return withState(newJoint(id, spec(4), T0), walked[walked.length - 1]!, finishedAt);
  };

  it('drops finished joints oldest first', () => {
    const joints = Array.from({ length: MAX_JOINTS + 10 }, (_, i) => done(`d${i}`, T0 + i));
    const r = pruneRegister({ ...emptyRegister(), joints: sortJoints(joints) });
    expect(r.joints).toHaveLength(MAX_JOINTS);
    // The ten oldest finishes are the ten that went.
    for (let i = 0; i < 10; i++) expect(getJoint(r, `d${i}`)).toBeUndefined();
    expect(getJoint(r, `d${MAX_JOINTS + 9}`)).toBeDefined();
  });

  it('keeps every part-done joint even over the cap', () => {
    const joints = Array.from({ length: MAX_JOINTS + 10 }, (_, i) => ({
      ...newJoint(`o${i}`, spec(4), T0),
      updatedAt: T0 + i,
    }));
    const r = pruneRegister({ ...emptyRegister(), joints: sortJoints(joints) });
    expect(r.joints).toHaveLength(MAX_JOINTS + 10);
    expect(r.joints.every((j) => !isDone(j))).toBe(true);
  });

  it('keeps the scratch joint, finished or not', () => {
    const joints = [done(SCRATCH_ID, T0), ...Array.from({ length: MAX_JOINTS + 5 }, (_, i) => done(`d${i}`, T0 + 1 + i))];
    const r = pruneRegister({ ...emptyRegister(), joints: sortJoints(joints) });
    expect(getJoint(r, SCRATCH_ID)).toBeDefined();
    expect(r.joints).toHaveLength(MAX_JOINTS);
  });

  it('leaves a register under the cap exactly as it was', () => {
    const r: Register = { ...emptyRegister(), joints: sortJoints([done('a', T0), done('b', T0 + 1)]) };
    expect(pruneRegister(r)).toBe(r);
  });

  it('stays small enough to store, at the cap and the biggest flange', () => {
    // AsyncStorage on Android is a SQLite store with a few megabytes to play
    // with, so the whole register has to stay well inside that.
    const joints = Array.from({ length: MAX_JOINTS }, (_, i) => ({
      ...newJoint(`joint-${i}`, { cls: '125' as const, nps: 96, bolts: 68, tag: `12-ABC-10${i} FL-4`, note: 'north rack, behind the pump' }, T0),
      updatedAt: T0 + i,
    }));
    const bytes = serialiseRegister({ ...emptyRegister(), joints }).length;
    expect(bytes).toBeLessThan(600_000);
  });
});

describe('every state a joint can reach is a state that loads', () => {
  it('holds for a whole joint, at every bolt count, through the store', () => {
    for (const bolts of REAL_COUNTS) {
      let j = newJoint('j1', spec(bolts), T0);
      let r = putJoint(emptyRegister(), j);
      let n = 0;
      while (!isFinished(j.state)) {
        j = withState(j, tapBolt(j.state, expectedBolt(j.state)).state, T0 + ++n);
        r = putJoint(r, j);
        const back = parseRegister(serialiseRegister(r));
        expect(back.dropped).toBe(0);
        expect(getJoint(back, 'j1')).toEqual(j);
      }
      expect(n).toBe(bolts * PASSES.length);
    }
  });
});

describe('how long ago', () => {
  const MIN = 60_000;
  const HR = 60 * MIN;
  const DAY = 24 * HR;

  it('reads the way a fitter would say it', () => {
    const cases: [number, string][] = [
      [0, 'just now'],
      [30_000, 'just now'],
      [2 * MIN, '2 min ago'],
      [45 * MIN, '45 min ago'],
      [3 * HR, '3 hr ago'],
      [DAY, 'yesterday'],
      [3 * DAY, '3 days ago'],
      [8 * DAY, 'a week ago'],
      [30 * DAY, '4 weeks ago'],
    ];
    for (const [delta, want] of cases) {
      expect(sinceLabel(T0 - delta, T0)).toBe(want);
    }
  });

  it('never reads as the future, however the clock has moved', () => {
    expect(sinceLabel(T0 + 60 * MIN, T0)).toBe('just now');
  });

  it('only ever moves forwards as time passes', () => {
    let last = '';
    let changes = 0;
    for (let s = 0; s < 60 * DAY; s += 37_000) {
      const label = sinceLabel(T0, T0 + s);
      expect(label).not.toContain('NaN');
      expect(label).not.toContain('-');
      if (label !== last) changes += 1;
      last = label;
    }
    expect(changes).toBeGreaterThan(5);
  });
});
