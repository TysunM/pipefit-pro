// Bolting a flange up
// -------------------
// A flange is not tightened by going round the circle. Pulling one bolt down
// hard cocks the flange and unloads the ones opposite it, so a gasket bolted
// round in order leaks. The cross pattern keeps the load even: every bolt is
// followed by the one most nearly opposite it, so the flange comes down flat.
//
// It is also done in rounds rather than in one go, because tightening any
// bolt relaxes its neighbours. ASME PCC-1 sets the rounds out: snug, then
// 20-30%, 50-70% and 100% of target in the cross pattern, with a gap check
// after each, then check rounds straight round the flange at 100% until no
// nut turns, then a retightening round after a dwell of at least four hours
// (that last one is the re-torque log in the register).
//
// That is the Legacy method. PCC-1 Appendix F accepts faster ones that reach
// the same gasket stress with fewer trips across the flange: the Modified
// Legacy, the Quadrant pattern for sixteen bolts and up, the Circular pattern
// for hard gaskets, and patterns for two or four tools working together.
// Hydraulic tensioning has its own passes, by tool coverage. All of them are
// written here as the same thing: a plan of rounds, each a list of steps, each
// step one bolt or one group of bolts at one load.
//
// The point of doing this on a screen rather than off a card is that the
// screen can refuse. A bolt map that lets you tap anything is a picture; one
// that only accepts the bolt the sequence is asking for is a check.

export type MethodId =
  | 'legacy'
  | 'modified'
  | 'quadrant'
  | 'circular'
  | 'twoTools'
  | 'fourTools'
  | 'tension100'
  | 'tension50'
  | 'tension25';

/** What is between the flanges. It decides which methods are allowed. */
export type Gasket = 'unknown' | 'soft' | 'spiral' | 'hard' | 'rtj';

export const GASKETS: readonly { id: Gasket; label: string; words: string }[] = [
  { id: 'unknown', label: 'Not set', words: 'The gasket is not recorded.' },
  { id: 'soft', label: 'Soft sheet', words: 'PTFE or fibre sheet. Low torque, relaxes most; retighten after the dwell.' },
  { id: 'spiral', label: 'Spiral wound', words: 'Spiral wound with inner ring. Never the Circular pattern.' },
  { id: 'hard', label: 'Kammprofile', words: 'Kammprofile or grooved metal. The only gasket the Circular pattern is allowed on.' },
  { id: 'rtj', label: 'Ring joint', words: 'Metal ring. A light first round seats the ring square; never the Circular pattern.' },
];

export type Method = {
  id: MethodId;
  name: string;
  /** Chip label. */
  short: string;
  /** Where it comes from. */
  from: string;
  what: string;
  tools: 1 | 2 | 4 | 'tension';
};

export const METHODS: readonly Method[] = [
  {
    id: 'legacy',
    name: 'Legacy cross pattern',
    short: 'Legacy',
    from: 'ASME PCC-1, the standard method',
    what: 'Snug, then three cross rounds at 20–30%, 50–70% and 100%, then round the flange at 100% until no nut turns.',
    tools: 1,
  },
  {
    id: 'modified',
    name: 'Modified Legacy',
    short: 'Modified',
    from: 'PCC-1 Appendix F, Alternative #1',
    what: 'The first four bolts to 20–30%, the next four to 50–70%, every bolt after that straight to 100%, all in cross order. Then round the flange at 100%.',
    tools: 1,
  },
  {
    id: 'quadrant',
    name: 'Quadrant pattern',
    short: 'Quadrant',
    from: 'PCC-1 Appendix F, Alternative #2',
    what: 'Four starter bolts 90° apart, then the next loose bolt in each quadrant in turn. Load steps up after every four bolts. For sixteen bolts and up.',
    tools: 1,
  },
  {
    id: 'circular',
    name: 'Circular pattern',
    short: 'Circular',
    from: 'PCC-1 Appendix F, Alternative #3',
    what: 'Four bolts 90° apart seat the joint at 20–30%, then straight round the flange at 100%. Hard gaskets only.',
    tools: 1,
  },
  {
    id: 'twoTools',
    name: 'Two tools together',
    short: '2 tools',
    from: 'PCC-1 Appendix F, Alternative #5',
    what: 'Two wrenches 180° apart on one pump, worked as one bolt through the cross rounds.',
    tools: 2,
  },
  {
    id: 'fourTools',
    name: 'Four tools together',
    short: '4 tools',
    from: 'PCC-1 Appendix F, Alternative #4',
    what: 'Four wrenches 90° apart on one pump, worked as one bolt through the cross rounds.',
    tools: 4,
  },
  {
    id: 'tension100',
    name: 'Tensioning, 100% coverage',
    short: 'Tension 100%',
    from: 'Hydraulic tensioning, a tool on every stud',
    what: 'Every stud pressurised at once, nuts run down, released. Then a check pass. The preferred way to tension.',
    tools: 'tension',
  },
  {
    id: 'tension50',
    name: 'Tensioning, 50% coverage',
    short: 'Tension 50%',
    from: 'Hydraulic tensioning, a tool on every second stud',
    what: 'Odd studs at pressure A, even studs at pressure B. A is set above B to pay for the load the first studs lose. Repeated until no nut turns.',
    tools: 'tension',
  },
  {
    id: 'tension25',
    name: 'Tensioning, 25% coverage',
    short: 'Tension 25%',
    from: 'Hydraulic tensioning, a tool on every fourth stud',
    what: 'Four groups, four pressures, A through D. Only where the tooling cannot cover more.',
    tools: 'tension',
  },
];

export const METHOD_IDS: readonly MethodId[] = METHODS.map((m) => m.id);

export const isMethodId = (v: unknown): v is MethodId => typeof v === 'string' && (METHOD_IDS as readonly string[]).includes(v);

export const method = (id: MethodId): Method => METHODS.find((m) => m.id === id) ?? METHODS[0]!;

/** Why a method cannot be used on this flange, or null when it can. */
export function methodBar(id: MethodId, bolts: number, gasket: Gasket): string | null {
  if (!Number.isInteger(bolts) || bolts < 4) return 'Needs at least four bolts.';
  const byFour = bolts % 4 === 0;
  switch (id) {
    case 'legacy':
    case 'tension100':
      return null;
    case 'modified':
      return bolts >= 12 ? null : 'For twelve bolts and up; below that the Legacy rounds are as quick.';
    case 'quadrant':
      return byFour && bolts >= 16 ? null : 'For sixteen bolts and up, in fours.';
    case 'circular':
      if (!byFour || bolts < 8) return 'Needs eight bolts or more, in fours.';
      return gasket === 'hard' ? null : 'Hard gaskets only: kammprofile or grooved metal. Set the gasket.';
    case 'twoTools':
    case 'tension50':
      return bolts % 2 === 0 ? null : 'Needs an even bolt count.';
    case 'fourTools':
      return byFour && bolts >= 8 ? null : 'Needs eight bolts or more, in fours.';
    case 'tension25':
      return byFour ? null : 'Needs a bolt count in fours.';
  }
}

/** The methods a flange can be bolted by, in the order they are offered. */
export const methodsFor = (bolts: number, gasket: Gasket): Method[] => METHODS.filter((m) => methodBar(m.id, bolts, gasket) === null);

// ------------------------------------------------------------------ patterns

/**
 * The cross pattern for a given number of bolts.
 *
 * Built by halving rather than looked up: take the pattern for half the bolts,
 * and follow each of its entries immediately with the bolt directly opposite.
 * That is the rule the tabulated sequences are built on, and it reproduces the
 * published 4, 8, 12, 16, 20 and 24 bolt orders exactly.
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

/** Straight round the flange, which is what a check round wants. */
export function rotationalPattern(bolts: number): number[] {
  if (!Number.isInteger(bolts) || bolts < 1) return [];
  return Array.from({ length: bolts }, (_, i) => i + 1);
}

/**
 * The quadrant pattern: four starter bolts 90° apart in cross order (1, then
 * opposite, then 90°, then 270°), after which the next bolt is always the next
 * loose bolt clockwise in the quadrant being worked, the quadrants taken in
 * that same cross order. Sixteen bolts: 1-9-5-13, 2-10-6-14, 3-11-7-15,
 * 4-12-8-16. Fewer trips across the flange than the Legacy order.
 */
export function quadrantPattern(bolts: number): number[] {
  if (!Number.isInteger(bolts) || bolts < 4 || bolts % 4 !== 0) return [];
  const q = bolts / 4;
  const out: number[] = [];
  for (let k = 0; k < q; k++) for (const quad of [0, 2, 1, 3]) out.push(1 + quad * q + k);
  return out;
}

/** The four bolts 90° apart that seat a joint, in cross order. */
export const starters = (bolts: number): number[] => quadrantPattern(bolts).slice(0, 4);

/** Pairs 180° apart, in cross order of the pairs. */
export function pairs(bolts: number): number[][] {
  if (!Number.isInteger(bolts) || bolts < 2 || bolts % 2 !== 0) return [];
  const half = bolts / 2;
  return crossPattern(half).map((b) => [b, b + half]);
}

/** Groups of four 90° apart, in cross order of the groups. */
export function quads(bolts: number): number[][] {
  if (!Number.isInteger(bolts) || bolts < 4 || bolts % 4 !== 0) return [];
  const q = bolts / 4;
  return crossPattern(q).map((b) => [b, b + q, b + 2 * q, b + 3 * q]);
}

/** Pairs and quads taken round the flange, for a check round with the tools still on. */
const pairsRound = (bolts: number): number[][] => rotationalPattern(bolts / 2).map((b) => [b, b + bolts / 2]);
const quadsRound = (bolts: number): number[][] => rotationalPattern(bolts / 4).map((b) => [b, b + bolts / 4, b + bolts / 2, b + (3 * bolts) / 4]);

/** Every n-th stud starting at `from`, 1-based: the groups a part-coverage tensioner works. */
const everyNth = (bolts: number, n: number, from: number): number[] => rotationalPattern(bolts).filter((b) => (b - from) % n === 0);

// --------------------------------------------------------------------- plans

/** The wrench settings inside PCC-1's ranges: 20-30%, 50-70%, 100%. */
export const SNUG = 0.2;
export const ROUND_LOADS = [0.3, 0.6, 1] as const;

export type Pressure = 'A' | 'B' | 'C' | 'D';

export type Step = {
  bolts: readonly number[];
  /** Share of final torque for this step, as a fraction. */
  load: number;
  /** Tensioning: which pressure, from the tensioner's table. */
  pressure?: Pressure;
};

export type RoundKind = 'snug' | 'round' | 'staged' | 'full' | 'check';

export type Round = {
  kind: RoundKind;
  label: string;
  /** The round's load, as a fraction; a staged round ends at 1. */
  load: number;
  /** How the bolts are taken: across the flange, round it, by quadrant, or together under several tools. */
  order: 'across' | 'round' | 'quadrant' | 'together';
  steps: readonly Step[];
  note: string;
  /** A feeler-gauge gap check is called for once this round closes. */
  gapCheck: boolean;
};

/** The load of a step, in the words PCC-1 uses. */
export function loadWords(load: number): string {
  if (load <= SNUG) return '10–20 ft-lb, never above 20%';
  if (load <= 0.3) return '20–30%, set 30%';
  if (load <= 0.7) return '50–70%, set 60%';
  return '100%';
}

const single = (order: readonly number[], load: number): Step[] => order.map((b) => ({ bolts: [b], load }));
const grouped = (groups: readonly (readonly number[])[], load: number, pressure?: Pressure): Step[] =>
  groups.map((bolts) => (pressure ? { bolts, load, pressure } : { bolts, load }));

/** First four at 20-30%, next four at 50-70%, the rest at 100%. */
const staged = (order: readonly number[]): Step[] => order.map((b, i) => ({ bolts: [b], load: i < 4 ? ROUND_LOADS[0] : i < 8 ? ROUND_LOADS[1] : 1 }));

function snug(bolts: number, tension: boolean): Round {
  return {
    kind: 'snug',
    label: 'Snug',
    load: SNUG,
    order: 'round',
    steps: [{ bolts: rotationalPattern(bolts), load: SNUG }],
    note: tension
      ? 'Nuts hand-tight, stud ends marked and all on one side, tensioners fitted and checked for thread engagement.'
      : 'Hand-tight, nuts all on one side, stud ends marked. Then 10 to 20 ft-lb round the flange, never above 20% of target. Feelers round the gap before the first round.',
    gapCheck: false,
  };
}

const crossRound = (n: number, i: number, groups?: readonly (readonly number[])[]): Round => ({
  kind: 'round',
  label: `Round ${i + 1}`,
  load: ROUND_LOADS[i]!,
  order: groups ? 'together' : 'across',
  steps: groups ? grouped(groups, ROUND_LOADS[i]!) : single(crossPattern(n), ROUND_LOADS[i]!),
  note:
    i === 0
      ? 'Cross pattern at 20–30% of target. Snug the joint up square before any bolt is pulled down hard.'
      : i === 1
        ? 'Cross pattern again at 50–70%. The gasket is seating now, so bolts done early will have gone slack.'
        : 'Cross pattern at 100%.',
  gapCheck: true,
});

const fullRound = (n: number, label: string): Round => ({
  kind: 'full',
  label,
  load: 1,
  order: 'round',
  steps: single(rotationalPattern(n), 1),
  note: 'Straight round the flange at 100%. Brings the bolts the staged round left short up to target, and takes up what the rest relaxed.',
  gapCheck: false,
});

const checkRound = (steps: Step[], k: number, order: Round['order']): Round => ({
  kind: 'check',
  label: k === 0 ? 'Check round' : `Check round ${k + 1}`,
  load: 1,
  order,
  steps,
  note: 'Round the flange, clockwise, at 100%. If any nut turns, there is another round; the joint is done when none does.',
  gapCheck: false,
});

/**
 * The rounds of a method on a flange, in order. `extraChecks` is how many
 * check rounds have been added because a nut turned on the one before: the
 * plan grows as the joint is worked, and every state carries that count so
 * the plan can always be rebuilt from it.
 */
export function plan(id: MethodId, bolts: number, extraChecks = 0): Round[] {
  const n = Number.isInteger(bolts) && bolts > 0 ? bolts : 0;
  if (!n) return [];
  const checks = (steps: () => Step[], order: Round['order'] = 'round') =>
    Array.from({ length: 1 + Math.max(0, extraChecks) }, (_, k) => checkRound(steps(), k, order));

  switch (id) {
    case 'legacy':
      return [snug(n, false), crossRound(n, 0), crossRound(n, 1), crossRound(n, 2), ...checks(() => single(rotationalPattern(n), 1))];
    case 'modified':
      return [
        snug(n, false),
        {
          kind: 'staged',
          label: 'Round 1',
          load: 1,
          order: 'across',
          steps: staged(crossPattern(n)),
          note: 'The first four bolts to 20–30%, the next four to 50–70%, and every bolt after that straight to 100%, all in cross order.',
          gapCheck: true,
        },
        fullRound(n, 'Round 2'),
        ...checks(() => single(rotationalPattern(n), 1)),
      ];
    case 'quadrant':
      return [
        snug(n, false),
        {
          kind: 'staged',
          label: 'Round 1',
          load: 1,
          order: 'quadrant',
          steps: staged(quadrantPattern(n)),
          note: 'Four starters 90° apart, then the next loose bolt in each quadrant in turn. The first four at 20–30%, the next four at 50–70%, the rest at 100%.',
          gapCheck: true,
        },
        fullRound(n, 'Round 2'),
        ...checks(() => single(rotationalPattern(n), 1)),
      ];
    case 'circular':
      return [
        snug(n, false),
        {
          kind: 'staged',
          label: 'Round 1',
          load: ROUND_LOADS[0],
          order: 'across',
          steps: single(starters(n), ROUND_LOADS[0]),
          note: 'Four bolts 90° apart at 20–30%, to seat the joint square.',
          gapCheck: true,
        },
        fullRound(n, 'Round 2'),
        ...checks(() => single(rotationalPattern(n), 1)),
      ];
    case 'twoTools':
      return [snug(n, false), crossRound(n, 0, pairs(n)), crossRound(n, 1, pairs(n)), crossRound(n, 2, pairs(n)), ...checks(() => grouped(pairsRound(n), 1), 'together')];
    case 'fourTools':
      return [snug(n, false), crossRound(n, 0, quads(n)), crossRound(n, 1, quads(n)), crossRound(n, 2, quads(n)), ...checks(() => grouped(quadsRound(n), 1), 'together')];
    case 'tension100':
      return [
        snug(n, true),
        {
          kind: 'round',
          label: 'Tension',
          load: 1,
          order: 'together',
          steps: [{ bolts: rotationalPattern(n), load: 1, pressure: 'A' }],
          note: 'One pressurisation of every tensioner at pressure A, nuts run down, pressure released.',
          gapCheck: false,
        },
        ...checks(() => [{ bolts: rotationalPattern(n), load: 1, pressure: 'A' }], 'together'),
      ];
    case 'tension50':
      return [
        snug(n, true),
        {
          kind: 'round',
          label: 'Pass A',
          load: 1,
          order: 'together',
          steps: [{ bolts: everyNth(n, 2, 1), load: 1, pressure: 'A' }],
          note: 'The odd studs at pressure A, set above B to pay for the load they lose when their neighbours are tensioned.',
          gapCheck: false,
        },
        {
          kind: 'round',
          label: 'Pass B',
          load: 1,
          order: 'together',
          steps: [{ bolts: everyNth(n, 2, 2), load: 1, pressure: 'B' }],
          note: 'The even studs at pressure B.',
          gapCheck: false,
        },
        ...checks(
          () => [
            { bolts: everyNth(n, 2, 1), load: 1, pressure: 'A' },
            { bolts: everyNth(n, 2, 2), load: 1, pressure: 'B' },
          ],
          'together',
        ),
      ];
    case 'tension25': {
      const letters: Pressure[] = ['A', 'B', 'C', 'D'];
      const passes: Round[] = letters.map((p, i) => ({
        kind: 'round',
        label: `Pass ${p}`,
        load: 1,
        order: 'together',
        steps: [{ bolts: everyNth(n, 4, i + 1), load: 1, pressure: p }],
        note: i === 0 ? 'Every fourth stud at pressure A, the highest of the four.' : `The next group at pressure ${p}.`,
        gapCheck: false,
      }));
      return [snug(n, true), ...passes, ...checks(() => letters.map((p, i) => ({ bolts: everyNth(n, 4, i + 1), load: 1, pressure: p })), 'together')];
    }
  }
}

// --------------------------------------------------------------------- state

/** How far a bolt has got: 0 untouched, 1 snugged, 2 at 20-30%, 3 at 50-70%, 4 at 100%, 5 checked. */
export type BoltLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const CHECKED: BoltLevel = 5;

const levelOf = (round: Round, step: Step): BoltLevel =>
  round.kind === 'check' ? 5 : step.load >= 0.9 ? 4 : step.load >= 0.4 ? 3 : step.load > SNUG ? 2 : 1;

export type BoltUpState = {
  bolts: number;
  method: MethodId;
  /** Index into the plan. Equal to its length once the joint is finished. */
  round: number;
  /** Steps done on this round. Equal to the round's step count on a check round that is waiting to be answered. */
  step: number;
  /** Check rounds added because a nut turned. */
  extraChecks: number;
  /** A round that wants a gap check has closed and the check has not been confirmed. */
  gapPending: boolean;
  /** The furthest each bolt has got, indexed from bolt 1 at [0]. Always `levelsAt` of the position. */
  level: BoltLevel[];
  /** The last bolt tapped out of turn, for the screen to point at. */
  lastWrong: number | null;
  /** Bumped on every rejected tap, so a repeated wrong tap re-fires the flash. */
  wrongCount: number;
};

export const planOf = (s: BoltUpState): Round[] => plan(s.method, s.bolts, s.extraChecks);

export const isFinished = (s: BoltUpState): boolean => s.round >= planOf(s).length;

/** The round being worked, or undefined once the joint is finished. */
export const currentRound = (s: BoltUpState): Round | undefined => planOf(s)[s.round];

/** A check round has closed and is waiting to hear whether any nut turned. */
export function isAsked(s: BoltUpState): boolean {
  const r = currentRound(s);
  return !!r && r.kind === 'check' && s.step >= r.steps.length;
}

/** The step being worked, or undefined when finished, waiting on the answer, or waiting on the gap check. */
export function currentStep(s: BoltUpState): Step | undefined {
  if (isAsked(s) || s.gapPending) return undefined;
  return currentRound(s)?.steps[s.step];
}

/** The bolts the sequence is asking for next: one, a group under several tools, or none while it waits on an answer. */
export const expectedBolts = (s: BoltUpState): readonly number[] => currentStep(s)?.bolts ?? [];

/** The first bolt asked for, or 0 when none is. */
export const expectedBolt = (s: BoltUpState): number => expectedBolts(s)[0] ?? 0;

/** The step after the one being worked, for the eye to be sent ahead. */
export function nextStep(s: BoltUpState): Step | undefined {
  const r = currentRound(s);
  if (!r || isAsked(s) || s.gapPending) return undefined;
  return r.steps[s.step + 1] ?? planOf(s)[s.round + 1]?.steps[0];
}

/**
 * The levels every bolt has reached at a position in the plan: every round
 * before this one in full, and this one up to the step. Levels are a pure
 * function of the position, which is what lets undo be exact and lets a
 * stored state be checked against itself.
 */
export function levelsAt(id: MethodId, bolts: number, extraChecks: number, round: number, step: number): BoltLevel[] {
  const level = new Array<BoltLevel>(Number.isInteger(bolts) && bolts > 0 ? bolts : 0).fill(0);
  const rounds = plan(id, bolts, extraChecks);
  rounds.forEach((r, ri) => {
    if (ri > round) return;
    const upTo = ri < round ? r.steps.length : Math.min(step, r.steps.length);
    for (let si = 0; si < upTo; si++) {
      const st = r.steps[si]!;
      const l = levelOf(r, st);
      for (const b of st.bolts) if (l > (level[b - 1] ?? 0)) level[b - 1] = l;
    }
  });
  return level;
}

export const boltLevel = (s: BoltUpState, bolt: number): BoltLevel => s.level[bolt - 1] ?? 0;

export function startBoltUp(bolts: number, id: MethodId = 'legacy'): BoltUpState {
  const n = Number.isInteger(bolts) && bolts > 0 ? bolts : 0;
  return { bolts: n, method: id, round: 0, step: 0, extraChecks: 0, gapPending: false, level: levelsAt(id, n, 0, 0, 0), lastWrong: null, wrongCount: 0 };
}

export const resetBoltUp = (s: BoltUpState): BoltUpState => startBoltUp(s.bolts, s.method);

/** The same joint by another method: a fresh start, because the rounds are different. */
export const withMethod = (s: BoltUpState, id: MethodId): BoltUpState => (id === s.method ? s : startBoltUp(s.bolts, id));

const at = (s: BoltUpState, round: number, step: number, extraChecks = s.extraChecks, gapPending = false): BoltUpState => ({
  ...s,
  round,
  step,
  extraChecks,
  gapPending,
  level: levelsAt(s.method, s.bolts, extraChecks, round, step),
  lastWrong: null,
});

export type BoltUpTap = {
  state: BoltUpState;
  /** False when the tap was refused. Nothing but `lastWrong` moved. */
  ok: boolean;
  /** The bolts the sequence was asking for, or none when it was not asking. */
  expected: readonly number[];
  /** This tap closed a round and opened the next one. */
  advancedRound: boolean;
  /** This tap closed a check round: the joint now waits to hear whether any nut turned. */
  asked: boolean;
  /** A gap check is now wanted before the next round. */
  gapCheck: boolean;
};

/**
 * Work one bolt, or one group of bolts under several tools (any bolt of the
 * group marks the whole group).
 *
 * The only tap that changes anything is the one the sequence asked for. Any
 * other tap, and any tap while the sequence is waiting on a gap check or on
 * the answer to a check round, comes back with `ok: false` and the same
 * position it went in with. The sequence cannot be skipped, only followed or
 * undone.
 */
export function tapBolt(s: BoltUpState, bolt: number): BoltUpTap {
  const expected = expectedBolts(s);
  const refused: BoltUpTap = {
    state: { ...s, lastWrong: bolt, wrongCount: s.wrongCount + 1 },
    ok: false,
    expected,
    advancedRound: false,
    asked: false,
    gapCheck: false,
  };
  if (!expected.includes(bolt)) return refused;

  const r = currentRound(s)!;
  const step = s.step + 1;
  const closed = step >= r.steps.length;
  if (!closed) return { state: at(s, s.round, step), ok: true, expected, advancedRound: false, asked: false, gapCheck: false };
  // A check round that closes waits for its answer; every other round opens the next.
  if (r.kind === 'check') return { state: at(s, s.round, step), ok: true, expected, advancedRound: false, asked: true, gapCheck: false };
  return { state: at(s, s.round + 1, 0, s.extraChecks, r.gapCheck), ok: true, expected, advancedRound: true, asked: false, gapCheck: r.gapCheck };
}

/** The gap has been checked round the flange and the low side brought up. */
export const confirmGap = (s: BoltUpState): BoltUpState => (s.gapPending ? { ...s, gapPending: false, lastWrong: null } : s);

/**
 * Answer a closed check round. A nut that turned means another check round;
 * none turning means the joint is finished.
 */
export function answerMoved(s: BoltUpState, moved: boolean): BoltUpState {
  if (!isAsked(s)) return s;
  return moved ? at(s, s.round + 1, 0, s.extraChecks + 1) : at(s, s.round + 1, 0);
}

/**
 * Take the last thing back: a bolt, the answer to a check round, or the
 * closing of a round, across a round boundary if that is where we are.
 */
export function undoBolt(s: BoltUpState): BoltUpState {
  const cleared = { ...s, lastWrong: null };
  if (s.bolts < 1) return cleared;
  const rounds = planOf(s);

  // Finished: reopen the last check round at its answer.
  if (s.round >= rounds.length) {
    const last = rounds.length - 1;
    return last < 0 ? cleared : at(s, last, rounds[last]!.steps.length);
  }
  if (s.step > 0) return at(s, s.round, s.step - 1);
  if (s.round === 0) return cleared;

  // At the start of a round: the thing before it was either the answer that
  // opened an added check round, or the last step of the round before.
  const prev = s.round - 1;
  const before = rounds[prev]!;
  if (rounds[s.round]!.kind === 'check' && before.kind === 'check') return at(s, prev, before.steps.length, s.extraChecks - 1);
  return at(s, prev, before.steps.length - 1);
}

/** Steps worked out of the whole plan, for a progress read-out. */
export function boltUpProgress(s: BoltUpState): { done: number; total: number } {
  const rounds = planOf(s);
  const total = rounds.reduce((sum, r) => sum + r.steps.length, 0);
  const done = rounds.reduce((sum, r, i) => sum + (i < s.round ? r.steps.length : i === s.round ? Math.min(s.step, r.steps.length) : 0), 0);
  return { done, total };
}

/**
 * The torque for a step, given the joint's final figure.
 *
 * The final figure is not in here on purpose. It is not a property of the
 * flange: it depends on the stud size and material, the lubricant and the
 * gasket, and guessing it is how gaskets get crushed. It comes from the job's
 * bolting spec, and the app only splits it into rounds.
 */
export function loadTorque(finalTorque: number, load: number): number {
  if (!Number.isFinite(finalTorque) || finalTorque <= 0 || !Number.isFinite(load) || load <= 0) return NaN;
  return finalTorque * load;
}

/** The bolts of a step the way they are said: "Bolt 5", "Bolts 1 and 9", "All studs, pressure A". */
export function stepWords(step: Step, bolts: number): string {
  if (step.bolts.length === bolts) return step.pressure ? `All studs, pressure ${step.pressure}` : 'Every bolt';
  if (step.bolts.length === 1) return `Bolt ${step.bolts[0]}`;
  const list = step.bolts.length <= 4 ? step.bolts.join(', ').replace(/, (\d+)$/, ' and $1') : `${step.bolts[0]}, ${step.bolts[1]} … ${step.bolts[step.bolts.length - 1]}`;
  return step.pressure ? `Studs ${list}, pressure ${step.pressure}` : `Bolts ${list}`;
}
