// Bolting a flange up
// -------------------
// A flange is not tightened by going round the circle. Pulling one bolt down
// hard cocks the flange and unloads the ones opposite it, so a gasket bolted
// round in order leaks. The cross pattern exists to keep the load even: every
// bolt is followed by the one most nearly opposite it, so the flange comes down
// flat and parallel.
//
// It is also done in passes rather than in one go, for the same reason. Each
// bolt is taken to about a third, then about two thirds, then full, in the
// cross pattern each time — because tightening any bolt relaxes its neighbours,
// so the first time round the circle is always uneven no matter how careful you
// are.
//
// The last pass is the one people get wrong. It is NOT the cross pattern: it
// goes round the flange in order, at full torque, and its job is to pick up the
// relaxation the cross passes left behind. ASME PCC-1, which is where the
// method comes from, calls it the rotational pass.

/** How the bolts are worked on a given pass. */
export type PassOrder = 'cross' | 'rotational';

export type BoltPass = {
  /** 1 based, as it reads on the screen. */
  number: number;
  label: string;
  /** Share of final torque for this pass, as a fraction. */
  target: number;
  order: PassOrder;
  note: string;
};

export const PASSES: readonly BoltPass[] = [
  {
    number: 1,
    label: 'Pass 1',
    target: 0.3,
    order: 'cross',
    note: 'Cross pattern at about a third of final torque. Snug the joint up square before any bolt is pulled down hard.',
  },
  {
    number: 2,
    label: 'Pass 2',
    target: 0.6,
    order: 'cross',
    note: 'Cross pattern again at about two thirds. The gasket is seating now, so bolts done early will have gone slack.',
  },
  {
    number: 3,
    label: 'Pass 3',
    target: 1,
    order: 'cross',
    note: 'Cross pattern at full torque.',
  },
  {
    number: 4,
    label: 'Final check',
    target: 1,
    order: 'rotational',
    note: 'Round the flange in order at full torque, not across it. This picks up the relaxation the cross passes left, and is the pass most often skipped.',
  },
];

/**
 * The cross pattern for a given number of bolts.
 *
 * Built by halving rather than looked up: take the pattern for half the bolts,
 * and follow each of its entries immediately with the bolt directly opposite.
 * That is the rule the tabulated sequences are built on, and it reproduces the
 * published 4, 8, 12 and 16 bolt orders exactly.
 *
 * An odd count has no opposite bolt to pair with, so it is the base case and
 * runs in order. Flange bolt holes are always a multiple of four, so that only
 * ever happens partway down the recursion, never at the top.
 */
export function crossPattern(bolts: number): number[] {
  if (!Number.isInteger(bolts) || bolts < 1) return [];
  if (bolts % 2 === 1) return Array.from({ length: bolts }, (_, i) => i + 1);
  const half = bolts / 2;
  return crossPattern(half).flatMap((b) => [b, b + half]);
}

/** Straight round the flange, which is what the final pass wants. */
export function rotationalPattern(bolts: number): number[] {
  if (!Number.isInteger(bolts) || bolts < 1) return [];
  return Array.from({ length: bolts }, (_, i) => i + 1);
}

/** The order the bolts are worked in on a given pass. */
export function passOrder(bolts: number, passIndex: number): number[] {
  const pass = PASSES[passIndex];
  if (!pass) return [];
  return pass.order === 'cross' ? crossPattern(bolts) : rotationalPattern(bolts);
}

// The check itself
// ----------------
// The point of doing this on a screen rather than off a card is that the screen
// can refuse. A bolt map that lets you tap anything is a picture; one that only
// accepts the bolt the sequence is asking for is a check. So `tapBolt` is a
// gate: the wrong bolt changes nothing, and the caller is told which bolt was
// wanted so it can point at it.

/** How far a single bolt has got: 0 untouched, then one per completed pass. */
export type BoltLevel = number;

export type BoltUpState = {
  bolts: number;
  /** Index into PASSES. Equal to PASSES.length once the joint is finished. */
  pass: number;
  /** Bolts done so far on this pass. */
  step: number;
  /** Passes completed per bolt, indexed from bolt 1 at [0]. */
  level: BoltLevel[];
  /** The last bolt tapped out of turn, for the screen to point at. */
  lastWrong: number | null;
  /** Bumped on every rejected tap, so a repeated wrong tap re-fires the flash. */
  wrongCount: number;
};

export type BoltUpTap = {
  state: BoltUpState;
  /** False when the tap was refused. Nothing but `lastWrong` moved. */
  ok: boolean;
  /** The bolt the sequence was asking for, or 0 when the joint is finished. */
  expected: number;
  /** This tap closed a pass and opened the next one. */
  advancedPass: boolean;
  /** This tap closed the last pass. */
  finished: boolean;
};

export const isFinished = (s: BoltUpState): boolean => s.pass >= PASSES.length;

/** The pass being worked, or undefined once the joint is finished. */
export const currentPass = (s: BoltUpState): BoltPass | undefined => PASSES[s.pass];

/** The bolt the sequence is asking for next, or 0 when the joint is finished. */
export function expectedBolt(s: BoltUpState): number {
  if (isFinished(s)) return 0;
  return passOrder(s.bolts, s.pass)[s.step] ?? 0;
}

/** Passes completed on one bolt, numbered from 1. */
export const boltLevel = (s: BoltUpState, bolt: number): BoltLevel => s.level[bolt - 1] ?? 0;

export function startBoltUp(bolts: number): BoltUpState {
  const n = Number.isInteger(bolts) && bolts > 0 ? bolts : 0;
  return { bolts: n, pass: 0, step: 0, level: new Array<number>(n).fill(0), lastWrong: null, wrongCount: 0 };
}

export const resetBoltUp = (s: BoltUpState): BoltUpState => startBoltUp(s.bolts);

/**
 * Work one bolt.
 *
 * The only tap that changes anything is the one the sequence asked for. Any
 * other tap comes back with `ok: false` and the same levels, pass and step it
 * went in with — the sequence cannot be skipped, only followed or undone.
 */
export function tapBolt(s: BoltUpState, bolt: number): BoltUpTap {
  const expected = expectedBolt(s);
  if (isFinished(s) || bolt !== expected || expected === 0) {
    return {
      state: { ...s, lastWrong: bolt, wrongCount: s.wrongCount + 1 },
      ok: false,
      expected,
      advancedPass: false,
      finished: false,
    };
  }

  const level = s.level.slice();
  level[bolt - 1] = s.pass + 1;

  const step = s.step + 1;
  const closed = step >= s.bolts;
  const next: BoltUpState = {
    ...s,
    level,
    pass: closed ? s.pass + 1 : s.pass,
    step: closed ? 0 : step,
    lastWrong: null,
  };

  return {
    state: next,
    ok: true,
    expected,
    advancedPass: closed && next.pass < PASSES.length,
    finished: closed && next.pass >= PASSES.length,
  };
}

/**
 * Take the last bolt back, across a pass boundary if that is where we are.
 *
 * Undoing the first bolt of a pass reopens the pass before it, because that is
 * what actually happened: the bolt that closed the previous pass is the one
 * being taken back.
 */
export function undoBolt(s: BoltUpState): BoltUpState {
  const cleared = { ...s, lastWrong: null };
  if (s.bolts < 1) return cleared;

  const pass = s.step > 0 ? s.pass : s.pass - 1;
  const step = s.step > 0 ? s.step - 1 : s.bolts - 1;
  if (pass < 0 || pass >= PASSES.length) return cleared;

  const bolt = passOrder(s.bolts, pass)[step];
  if (!bolt) return cleared;

  const level = s.level.slice();
  level[bolt - 1] = pass;
  return { ...cleared, pass, step, level };
}

/** Bolts worked out of the whole job, for a progress read-out. */
export function boltUpProgress(s: BoltUpState): { done: number; total: number } {
  const total = s.bolts * PASSES.length;
  const done = s.level.reduce((sum, l) => sum + l, 0);
  return { done, total };
}

/**
 * The torque for a pass, given the joint's final figure.
 *
 * The final figure is not in here on purpose. It is not a property of the
 * flange: it depends on the gasket, the stud material and whether the threads
 * are lubricated, and guessing it is how gaskets get crushed. It comes from the
 * job's bolting spec, and the app only splits it into passes.
 */
export function passTorque(finalTorque: number, passIndex: number): number {
  const pass = PASSES[passIndex];
  if (!pass || !Number.isFinite(finalTorque) || finalTorque <= 0) return NaN;
  return finalTorque * pass.target;
}
