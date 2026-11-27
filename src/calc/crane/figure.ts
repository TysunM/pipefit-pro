// The signal person
// -----------------
// A person seen from in front and a little above, turned a touch to one side,
// so a hand pushed toward the crane or swung back and forth reads as well as
// one held out to the side. Each arm is placed by where its hand goes and
// which way its elbow points; the elbow is found from the arm's two lengths
// (two-bone reach), so an arm never stretches or shrinks as it moves.
//
// Figure space, in centimetres, the person facing you: x to your right (the
// person's left), y up from the ground, z toward you. Pure.

export type V = readonly [number, number, number];

export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V) => Math.sqrt(dot(a, a));
export const unit = (a: V): V => {
  const l = len(a);
  return l > 1e-9 ? mul(a, 1 / l) : [0, -1, 0];
};
export const flipX = (a: V): V => [-a[0], a[1], a[2]];

export const UPPER = 30;
export const FORE = 27;
export const REACH = UPPER + FORE;
/** The person's right shoulder is on your left. */
export const SHOULDER_R: V = [-19, 146, 0];
export const SHOULDER_L: V = [19, 146, 0];
export const HEAD: V = [0, 165, 0];
export const HEAD_R = 11;
export const HIP_R: V = [-10, 92, 0];
export const HIP_L: V = [10, 92, 0];
// Drawn short in the leg, as safety posters do: the signal is all in the arms.
export const FOOT_R: V = [-14, 36, 3];
export const FOOT_L: V = [14, 36, 3];
/** The body a hand must stay outside: the chest's front is at z 7. */
export const TORSO = { x: 17, y0: 92, y1: 146, z: 7 };

/**
 * How a hand is held. `dir` is the finger for a point, the thumb for a thumb
 * or a flex, the fingers for a flat hand. A flex also has its fingers, and how
 * open they are (0 shut, 1 straight).
 */
export type HandKind = 'fist' | 'point' | 'thumb' | 'flat' | 'flex';
export type Hand = { kind: HandKind; dir?: V; fingers?: V; open?: number };
/** Where the hand goes, a point the elbow bends toward, and the hand. */
export type Arm = { at: V; pole: V; hand: Hand };
export type Pose = { r: Arm; l: Arm };

export type Limb = { shoulder: V; elbow: V; hand: V; grip: Hand; /** How far the hand was asked to go from the shoulder. */ asked: number };
export type Body = { r: Limb; l: Limb };

/** The elbow, from the shoulder, where the hand is going, and the point the elbow bends toward. */
export function reach(shoulder: V, at: V, pole: V, a = UPPER, b = FORE): { elbow: V; hand: V; asked: number } {
  const to = sub(at, shoulder);
  const asked = len(to);
  const d = Math.min(a + b - 1e-6, Math.max(Math.abs(a - b) + 1e-6, asked));
  const u = unit(to);
  const hand = add(shoulder, mul(u, d));
  const cos = (a * a + d * d - b * b) / (2 * a * d);
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  const w = sub(pole, shoulder);
  let v = sub(w, mul(u, dot(w, u)));
  if (len(v) < 1e-6) v = Math.abs(u[1]) < 0.9 ? sub([0, -1, 0], mul(u, -u[1])) : sub([1, 0, 0], mul(u, u[0]));
  const elbow = add(shoulder, mul(add(mul(u, cos), mul(unit(v), sin)), a));
  return { elbow, hand, asked };
}

export function solve(p: Pose): Body {
  const limb = (shoulder: V, arm: Arm): Limb => {
    const { elbow, hand, asked } = reach(shoulder, arm.at, arm.pole);
    return { shoulder, elbow, hand, grip: arm.hand, asked };
  };
  return { r: limb(SHOULDER_R, p.r), l: limb(SHOULDER_L, p.l) };
}

const flipHand = (h: Hand): Hand => ({ ...h, dir: h.dir && flipX(h.dir), fingers: h.fingers && flipX(h.fingers) });
const flipArm = (a: Arm): Arm => ({ at: flipX(a.at), pole: flipX(a.pole), hand: flipHand(a.hand) });
/** The same signal given with the other hand. */
export const mirror = (p: Pose): Pose => ({ r: flipArm(p.l), l: flipArm(p.r) });

/** An arm hanging at the side, the hand loosely shut. */
export const REST_R: Arm = { at: [-23, 93, 7], pole: [-25, 120, -12], hand: { kind: 'fist' } };
export const REST_L: Arm = flipArm(REST_R);

/** Turned a little to one side, seen from a little above. */
export const YAW = (-25 * Math.PI) / 180;
export const PITCH = (18 * Math.PI) / 180;
export type P2 = { x: number; y: number; depth: number };
/** Onto the page, y up; depth is toward you. */
export function project(p: V, yaw = YAW, pitch = PITCH): P2 {
  const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw);
  const z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
  return { x, y: p[1] * Math.cos(pitch) - z * Math.sin(pitch), depth: z * Math.cos(pitch) + p[1] * Math.sin(pitch) };
}
/** A direction onto the page: how it looks drawn from a point. */
export function projectDir(at: V, dir: V, length: number): { x: number; y: number } {
  const a = project(at);
  const b = project(add(at, mul(unit(dir), length)));
  return { x: b.x - a.x, y: b.y - a.y };
}

/** Is a point inside the body (so a hand would be drawn through the chest)? */
export const inChest = (p: V) => Math.abs(p[0]) < TORSO.x && p[1] > TORSO.y0 && p[1] < TORSO.y1 && p[2] < TORSO.z + 1;
