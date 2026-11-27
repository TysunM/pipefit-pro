// The standard hand signals for cranes
// ------------------------------------
// The signals in OSHA's standard for cranes and derricks in construction
// (29 CFR 1926 Subpart CC, Appendix A), each with how it's given, what it
// tells the operator, the one it gets mixed up with, and the pose: where each
// hand goes through one beat of the signal (f from 0 to 1, looped).
//
// A one-hand signal is drawn with the person's right hand; given with the
// left it's the same signal (signals.mirror). Pure.

import { REST_L, SHOULDER_R, add, mul, type Arm, type Hand, type Pose, type V } from './figure';

export type SignalId =
  | 'stop'
  | 'estop'
  | 'dog'
  | 'hoist'
  | 'lower'
  | 'main'
  | 'whip'
  | 'slow'
  | 'raiseboom'
  | 'lowerboom'
  | 'raiselower'
  | 'lowerraise'
  | 'swing'
  | 'extend'
  | 'retract'
  | 'travel'
  | 'trackboth'
  | 'trackone'
  | 'trolley';

export type SignalGroup = 'stop' | 'hoist' | 'boom' | 'travel';
export const GROUPS: { id: SignalGroup; title: string }[] = [
  { id: 'stop', title: 'Stops' },
  { id: 'hoist', title: 'The hoist lines' },
  { id: 'boom', title: 'The boom' },
  { id: 'travel', title: 'Travel' },
];

export type Signal = {
  id: SignalId;
  name: string;
  group: SignalGroup;
  /** Only on some cranes. */
  crane?: 'Telescoping booms' | 'Crawler cranes' | 'Tower cranes';
  /** How it's given, as the standard describes it. */
  given: string;
  /** What it tells the operator to do. */
  does: string;
  /** The one it gets mistaken for, and how to tell. */
  tell: string;
  /** Signals it's mistaken for, the likeliest first. */
  near: SignalId[];
  /** Both hands give it (it reads the same either way round). */
  twoHands: boolean;
  /** Seconds for one beat; 0 for a signal held still. */
  period: number;
  pose: (f: number) => Pose;
};

const TAU = 2 * Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
const ease = (f: number) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);
/** 0 to 1 and back, smoothly. */
const swing = (f: number) => 0.5 - 0.5 * Math.cos(TAU * f);
/** Out fast, back slow: a push, a jerk. */
const shove = (f: number, out = 0.3) => (f < out ? ease(f / out) : 1 - ease((f - out) / (1 - out)));
const circle = (c: V, r: number, f: number, plane: 'xz' | 'yz'): V => (plane === 'xz' ? add(c, [r * Math.cos(TAU * f), 0, r * Math.sin(TAU * f)]) : add(c, [0, r * Math.cos(TAU * f), r * Math.sin(TAU * f)]));
const flip = (a: Arm): Arm => ({ at: [-a.at[0], a.at[1], a.at[2]], pole: [-a.pole[0], a.pole[1], a.pole[2]], hand: { ...a.hand, dir: a.hand.dir && [-a.hand.dir[0], a.hand.dir[1], a.hand.dir[2]], fingers: a.hand.fingers && [-a.hand.fingers[0], a.hand.fingers[1], a.hand.fingers[2]] } });
const right = (r: Arm, l: Arm = REST_L): Pose => ({ r, l });
const both = (r: Arm): Pose => ({ r, l: flip(r) });

const UP: V = [0, 1, 0];
const DOWN: V = [0, -1, 0];
const OUT: V = [-1, 0, 0];
const IN: V = [1, 0, 0];
/** The right arm straight out to the side, the hand at shoulder height. */
const ARM_OUT: V = [-75, 147, 5];
const ELBOW_OUT: V = [-47, 132, 2];
const outArm = (hand: Hand): Arm => ({ at: ARM_OUT, pole: ELBOW_OUT, hand });

/** Straight out at the shoulder, swung back and forth level with it, the palm down. */
const sweep = (f: number): Arm => {
  const a = rad(8 + 26 * Math.sin(TAU * f));
  const at = add(SHOULDER_R, mul([-Math.cos(a), 0, Math.sin(a)], 56));
  return { at, pole: add(at, [24, -18, -4]), hand: { kind: 'flat', dir: [-Math.cos(a), 0, Math.sin(a)] } };
};

export const SIGNALS: Signal[] = [
  {
    id: 'stop',
    name: 'Stop',
    group: 'stop',
    given: 'One arm out level to the side, palm down, swung back and forth.',
    does: 'Stop the motion that\'s running, and hold.',
    tell: 'One arm is Stop. Both arms is Emergency stop.',
    near: ['estop', 'swing', 'travel', 'dog'],
    twoHands: false,
    period: 1.2,
    pose: (f) => right(sweep(f)),
  },
  {
    id: 'estop',
    name: 'Emergency stop',
    group: 'stop',
    given: 'Both arms out level to the sides, palms down, swung back and forth.',
    does: 'Stop everything, now. Anyone on the job can give it, and the operator stops for it from anyone.',
    tell: 'Both arms. One arm is a plain Stop.',
    near: ['stop', 'dog', 'travel'],
    twoHands: true,
    period: 1.0,
    pose: (f) => both(sweep(f)),
  },
  {
    id: 'dog',
    name: 'Dog everything',
    group: 'stop',
    given: 'Hands held together at waist level.',
    does: 'Hold everything: every motion stopped and set, a pause in the work.',
    tell: 'Hands together and still. Fists apart with the thumbs out or in are the telescoping boom.',
    near: ['estop', 'extend', 'retract', 'stop'],
    twoHands: true,
    period: 0,
    pose: () => both({ at: [-3, 101, 17], pole: [-34, 112, -2], hand: { kind: 'fist' } }),
  },
  {
    id: 'hoist',
    name: 'Hoist',
    group: 'hoist',
    given: 'Upper arm out to the side, forearm and index finger pointing straight up, the hand making small circles.',
    does: 'The load goes up.',
    tell: 'Finger up and circling. Finger down and circling is Lower.',
    near: ['lower', 'slow', 'main', 'raiseboom'],
    twoHands: false,
    period: 1.0,
    pose: (f) => right({ at: circle([-49, 173, 3], 4.5, f, 'xz'), pole: [-49, 140, -2], hand: { kind: 'point', dir: UP } }),
  },
  {
    id: 'lower',
    name: 'Lower',
    group: 'hoist',
    given: 'Arm and index finger pointing down, the hand making small circles.',
    does: 'The load comes down.',
    tell: 'Finger down and circling. Thumb down with the arm out level is Lower boom.',
    near: ['hoist', 'lowerboom', 'slow'],
    twoHands: false,
    period: 1.0,
    pose: (f) => right({ at: circle([-40, 98, 14], 4.5, f, 'xz'), pole: [-36, 122, -6], hand: { kind: 'point', dir: DOWN } }),
  },
  {
    id: 'main',
    name: 'Use main hoist',
    group: 'hoist',
    given: 'A hand taps the top of the head. Then the regular signal says what to do.',
    does: 'The next signal is for the main hoist line.',
    tell: 'Tapping the head. Tapping the elbow is the whip line.',
    near: ['whip', 'hoist', 'trackone'],
    twoHands: false,
    period: 0.6,
    pose: (f) => right({ at: [-2, 183 + 6 * (0.5 + 0.5 * Math.cos(TAU * f)), 3], pole: [-42, 170, 0], hand: { kind: 'fist' } }),
  },
  {
    id: 'whip',
    name: 'Use whip line',
    group: 'hoist',
    given: 'Arm bent at the elbow, forearm straight up, the elbow tapped with the other hand. Then the regular signal says what to do.',
    does: 'The next signal is for the whip line, the auxiliary hoist.',
    tell: 'Tapping the elbow. Tapping the head is the main hoist.',
    near: ['main', 'hoist', 'slow'],
    twoHands: false,
    period: 0.6,
    pose: (f) => right({ at: [-22, 163, 28], pole: [-22, 136, 28], hand: { kind: 'fist' } }, { at: [-19, 123 + 4 * swing(f), 30], pole: [16, 116, 16], hand: { kind: 'flat', dir: [-1, 0.3, 0] } }),
  },
  {
    id: 'slow',
    name: 'Move slowly',
    group: 'hoist',
    given: 'One hand is placed in front of the hand giving the signal. Shown here: hoist slowly.',
    does: 'The motion the other hand is signalling, slowly.',
    tell: 'A flat hand held still over the signalling hand. Without it, it\'s the plain signal.',
    near: ['hoist', 'lower', 'whip'],
    twoHands: false,
    period: 1.6,
    pose: (f) => right({ at: circle([-12, 136, 28], 3, f, 'xz'), pole: [-42, 126, 10], hand: { kind: 'point', dir: UP } }, { at: [-12, 151, 30], pole: [30, 128, 18], hand: { kind: 'flat', dir: OUT } }),
  },
  {
    id: 'raiseboom',
    name: 'Raise boom',
    group: 'boom',
    given: 'Arm out level to the side, thumb up, the other fingers closed.',
    does: 'The boom comes up.',
    tell: 'Thumb up and still. Fingers opening and closing as well is Raise the boom and lower the load.',
    near: ['lowerboom', 'raiselower', 'swing'],
    twoHands: false,
    period: 0,
    pose: () => right(outArm({ kind: 'thumb', dir: UP })),
  },
  {
    id: 'lowerboom',
    name: 'Lower boom',
    group: 'boom',
    given: 'Arm out level to the side, thumb down, the other fingers closed.',
    does: 'The boom comes down.',
    tell: 'Thumb down and still. Fingers opening and closing as well is Lower the boom and raise the load.',
    near: ['raiseboom', 'lowerraise', 'lower'],
    twoHands: false,
    period: 0,
    pose: () => right(outArm({ kind: 'thumb', dir: DOWN })),
  },
  {
    id: 'raiselower',
    name: 'Raise the boom and lower the load',
    group: 'boom',
    given: 'Arm out level to the side, thumb up, the fingers opening and closing for as long as the load is to move.',
    does: 'Boom up and the load line down, together.',
    tell: 'Thumb up, fingers working. Thumb up and still is Raise boom.',
    near: ['raiseboom', 'lowerraise', 'lowerboom'],
    twoHands: false,
    period: 0.7,
    pose: (f) => right(outArm({ kind: 'flex', dir: UP, fingers: [-1, 0, 0.25], open: swing(f) })),
  },
  {
    id: 'lowerraise',
    name: 'Lower the boom and raise the load',
    group: 'boom',
    given: 'Arm out level to the side, thumb down, the fingers opening and closing for as long as the load is to move.',
    does: 'Boom down and the load line up, together.',
    tell: 'Thumb down, fingers working. Thumb down and still is Lower boom.',
    near: ['lowerboom', 'raiselower', 'raiseboom'],
    twoHands: false,
    period: 0.7,
    pose: (f) => right(outArm({ kind: 'flex', dir: DOWN, fingers: [-1, 0, 0.25], open: swing(f) })),
  },
  {
    id: 'swing',
    name: 'Swing',
    group: 'boom',
    given: 'Arm out level, the index finger pointing the way the boom is to swing.',
    does: 'The boom swings the way the finger points.',
    tell: 'A finger pointing, held still. A flat hand swung back and forth is Stop.',
    near: ['stop', 'raiseboom', 'travel'],
    twoHands: false,
    period: 0,
    pose: () => right(outArm({ kind: 'point', dir: OUT })),
  },
  {
    id: 'extend',
    name: 'Extend boom',
    group: 'boom',
    crane: 'Telescoping booms',
    given: 'Both fists in front at waist level, thumbs pointing outward.',
    does: 'The telescoping boom runs out.',
    tell: 'Thumbs pointing away from each other. Pointing at each other is Retract.',
    near: ['retract', 'dog', 'trackboth'],
    twoHands: true,
    period: 0,
    pose: () => both({ at: [-10, 104, 22], pole: [-36, 112, 0], hand: { kind: 'thumb', dir: OUT } }),
  },
  {
    id: 'retract',
    name: 'Retract boom',
    group: 'boom',
    crane: 'Telescoping booms',
    given: 'Both fists in front at waist level, thumbs pointing at each other.',
    does: 'The telescoping boom runs in.',
    tell: 'Thumbs pointing at each other. Pointing away is Extend.',
    near: ['extend', 'dog', 'trackboth'],
    twoHands: true,
    period: 0,
    pose: () => both({ at: [-17, 104, 22], pole: [-38, 112, 0], hand: { kind: 'thumb', dir: IN } }),
  },
  {
    id: 'travel',
    name: 'Travel',
    group: 'travel',
    given: 'All fingers pointing up, the arm pushed out level and back, pushing the way the crane is to travel.',
    does: 'The crane travels the way the hand pushes. On a tower crane, the tower travels.',
    tell: 'Fingers up, pushing out. A palm down swung back and forth is Stop.',
    near: ['stop', 'trolley', 'swing'],
    twoHands: false,
    period: 1.3,
    pose: (f) => right({ at: [-48 - 26 * shove(f), 150, 10], pole: [-40, 132, -2], hand: { kind: 'flat', dir: UP } }),
  },
  {
    id: 'trackboth',
    name: 'Travel, both tracks',
    group: 'travel',
    crane: 'Crawler cranes',
    given: 'Fists rotated round each other in front of the body: rolling away from the body, travel forward; toward the body, travel back.',
    does: 'Both tracks travel, the way the fists roll.',
    tell: 'Both fists rolling. One fist up while the other rolls is one track.',
    near: ['trackone', 'extend', 'retract'],
    twoHands: true,
    period: 1.1,
    pose: (f) => ({ r: { at: add(circle([0, 122, 22], 6, f, 'yz'), [-5, 0, 0]), pole: [-32, 118, 0], hand: { kind: 'fist' } }, l: { at: add(circle([0, 122, 22], 6, f + 0.5, 'yz'), [5, 0, 0]), pole: [32, 118, 0], hand: { kind: 'fist' } } }),
  },
  {
    id: 'trackone',
    name: 'Travel, one track',
    group: 'travel',
    crane: 'Crawler cranes',
    given: 'A fist raised on the side of the track to lock. The other fist rotated in front of the body, the way the other track is to travel.',
    does: 'The track on the raised fist\'s side stays locked; the other track travels.',
    tell: 'One fist up and still, the other rolling. Both rolling is both tracks.',
    near: ['trackboth', 'main', 'hoist'],
    twoHands: false,
    period: 1.1,
    pose: (f) => right({ at: [-25, 195, 5], pole: [-42, 170, 0], hand: { kind: 'fist' } }, { at: circle([8, 122, 24], 6, f, 'yz'), pole: [32, 118, 0], hand: { kind: 'fist' } }),
  },
  {
    id: 'trolley',
    name: 'Trolley travel',
    group: 'travel',
    crane: 'Tower cranes',
    given: 'Palm up, fingers closed, thumb pointing the way the trolley is to go, the hand jerked level that way.',
    does: 'The trolley runs along the jib the way the thumb points.',
    tell: 'Thumb sideways and jerking. Fingers up and pushing is Travel.',
    near: ['travel', 'swing', 'raiseboom'],
    twoHands: false,
    period: 1.2,
    pose: (f) => right({ at: [-34 - 9 * shove(f, 0.18), 128, 30], pole: [-40, 120, 4], hand: { kind: 'thumb', dir: OUT } }),
  },
];

export const signalById = (id: string) => SIGNALS.find((s) => s.id === id);
export const SIGNAL_IDS = SIGNALS.map((s) => s.id);
