// Rigging a spool
// ---------------
// What the spool on the 3D page weighs and where its centre of gravity is,
// then a two-leg pick: the hook hangs straight over the centre of gravity, so
// each sling runs from its pick point up to a point above it.
//
// Weight: the pipe cut to length and the elbows (as the spool's own weight
// does), the water in them when it is lifted full, and anything else hung on
// it (a valve, a flange) at the weight on its tag or the drawing. No maker's
// table is guessed at: what isn't pipe is typed in.
//
// The pick: two slings to one hook can only hold the spool in the upright
// plane through the two pick points. A centre of gravity off that plane makes
// the spool roll about the line between the picks until it hangs under it;
// the tensions are the same either way, because they only see how far along
// that line it sits. A centre of gravity past either pick tips the spool off
// the shorter side. Each leg's tension comes from the hook being in balance:
// the two legs pull along themselves and together hold the weight up.
//
// Inches and pounds throughout: the screens convert. Pure.

import { findSize, elbowWeight, pipeWeightPerFoot, type ElbowRadius, type Schedule } from './pipe';
import { type SpoolResult, type Vec3, add, elbowCenterline, scale, sub } from './spool';
import { band, MIN_ANGLE, type Band } from './sling';

/** A place on the spool: on run `run`, `along` inches from its start corner, centre to centre. */
export type At = { run: number; along: number };
/** Something hung on the spool that isn't pipe: its name, what it weighs, where. */
export type Extra = { name: string; weight: number; at: At };

/** Pounds of water in a foot of pipe per square inch of bore: 62.4 lb a cubic foot. */
const WATER_LB_PER_FT_PER_SQIN = 62.4 / 144;
/** The sling angle the hook height is set for: 60 from horizontal, an angle factor of 1.155. */
export const GOOD_PICK_ANGLE = 60;

export type Piece = { kind: 'pipe' | 'elbow' | 'water' | 'extra'; name: string; weight: number; at: Vec3 };
export type SpoolWeight = { pieces: Piece[]; pipe: number; elbows: number; water: number; extras: number; total: number; cg: Vec3 };

/** Where a place on the spool is in space; null where there is no such run. */
export function pointAt(spool: SpoolResult, at: At): Vec3 | null {
  const r = spool.runs[at.run];
  if (!r) return null;
  const along = Math.max(0, Math.min(r.centerToCenter, at.along));
  return add(r.from, scale(r.direction, along));
}

/** The spool's weight, piece by piece, and its centre of gravity. */
export function spoolWeight(spool: SpoolResult, pipe: { nps: number; kind: ElbowRadius; schedule: Schedule }, opts: { water: boolean; extras: readonly Extra[] }): SpoolWeight | null {
  if (!spool.valid || !spool.runs.length) return null;
  const size = findSize(pipe.nps);
  const od = size.od;
  const wall = size.wall[pipe.schedule];
  const bore = od - 2 * wall;
  const perFt = pipeWeightPerFoot(od, wall);
  const waterPerFt = ((Math.PI / 4) * bore * bore) * WATER_LB_PER_FT_PER_SQIN;
  const pieces: Piece[] = [];
  spool.runs.forEach((r, i) => {
    if (r.cutLength <= 0) return;
    const mid = add(r.from, scale(r.direction, r.takeoffStart + r.cutLength / 2));
    pieces.push({ kind: 'pipe', name: `Leg ${i + 1}`, weight: (r.cutLength / 12) * perFt, at: mid });
    if (opts.water) pieces.push({ kind: 'water', name: `Water, leg ${i + 1}`, weight: (r.cutLength / 12) * waterPerFt, at: mid });
  });
  spool.elbows.forEach((e, i) => {
    const into = spool.runs[e.index - 1];
    const outOf = spool.runs[e.index];
    if (!into || !outOf) return;
    const arc = elbowCenterline(spool.points[e.index]!, into.direction, outOf.direction, e.takeoff);
    const mid = scale(arc.reduce((a, p) => add(a, p), { x: 0, y: 0, z: 0 }), 1 / arc.length);
    pieces.push({ kind: 'elbow', name: `Elbow ${i + 1}`, weight: elbowWeight(pipe.nps, pipe.kind, e.angle, od, wall), at: mid });
    if (opts.water) pieces.push({ kind: 'water', name: `Water, elbow ${i + 1}`, weight: (e.centerlineArc / 12) * waterPerFt, at: mid });
  });
  for (const x of opts.extras) {
    const p = pointAt(spool, x.at);
    if (p && Number.isFinite(x.weight) && x.weight > 0) pieces.push({ kind: 'extra', name: x.name, weight: x.weight, at: p });
  }
  const sum = (k: Piece['kind']) => pieces.filter((p) => p.kind === k).reduce((a, p) => a + p.weight, 0);
  const total = pieces.reduce((a, p) => a + p.weight, 0);
  if (!(total > 0)) return null;
  const cg = scale(pieces.reduce((a, p) => add(a, scale(p.at, p.weight)), { x: 0, y: 0, z: 0 }), 1 / total);
  return { pieces, pipe: sum('pipe'), elbows: sum('elbow'), water: sum('water'), extras: sum('extra'), total, cg };
}

export type RigLeg = { at: Vec3; /** Along the pick line from pick 1, and its height. */ s: number; y: number; length: number; angle: number; tension: number; share: number; sideways: number; band: Band };
export type Rig =
  | {
      ok: true;
      legs: [RigLeg, RigLeg];
      hook: { s: number; y: number };
      /** The centre of gravity along the pick line, and its height. */
      cg: { s: number; y: number };
      span: number;
      /** How far the centre of gravity is off the upright plane through the picks: it rolls by this much. */
      offPlane: number;
      /** The hook height above the higher pick that sets the steeper-needing leg at 60°. */
      hookFor60: number;
      warnings: RigWarning[];
    }
  | { ok: false; why: string };
export type RigWarning = { id: 'rolls' | 'overturns' | 'flat' | 'steep'; text: string };

const fmtIn = (n: number) => `${Math.round(n * 10) / 10}"`;

/** How far above the higher pick the hook goes for the flatter leg to sit at `angle` from horizontal (60 by default). Null when the picks are one above the other. */
export function hookHeightFor(p1: Vec3, p2: Vec3, cg: Vec3, angle = GOOD_PICK_ANGLE): number | null {
  const span = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  if (span < 1) return null;
  const s = ((cg.x - p1.x) * (p2.x - p1.x) + (cg.z - p1.z) * (p2.z - p1.z)) / span;
  const tan = Math.tan((angle * Math.PI) / 180);
  return Math.max(p1.y + tan * Math.abs(s), p2.y + tan * Math.abs(span - s)) - Math.max(p1.y, p2.y);
}

/** The pick: two pick points, the weight and its centre, and the hook `hookAbove` inches above the higher pick. */
export function rig(p1: Vec3, p2: Vec3, weight: number, cg: Vec3, hookAbove: number): Rig {
  if (!(weight > 0)) return { ok: false, why: 'Nothing to lift: the spool has no weight.' };
  const flat = { x: p2.x - p1.x, y: 0, z: p2.z - p1.z };
  const span = Math.hypot(flat.x, flat.z);
  if (span < 1) return { ok: false, why: 'The two picks are one above the other. Put them apart along the spool.' };
  const e = { x: flat.x / span, y: 0, z: flat.z / span };
  const rel = sub(cg, p1);
  const s = rel.x * e.x + rel.z * e.z;
  const offPlane = Math.hypot(rel.x - s * e.x, rel.z - s * e.z);
  const edge = Math.max(0.5, span * 0.01);
  if (s <= edge || s >= span - edge) {
    return { ok: false, why: `The centre of gravity is ${s <= edge ? 'outside pick 1' : 'outside pick 2'}: on two slings it tips off that end. Move that pick past the centre of gravity.` };
  }
  const top = Math.max(p1.y, p2.y);
  const hook = { s, y: top + Math.max(0, hookAbove) };
  const picks = [
    { at: p1, s: 0, y: p1.y },
    { at: p2, s: span, y: p2.y },
  ] as const;
  const geo = picks.map((p) => {
    const dx = hook.s - p.s;
    const dy = hook.y - p.y;
    const length = Math.hypot(dx, dy);
    return { ...p, dx, dy, length, ux: length ? dx / length : 0, uy: length ? dy / length : 0 };
  });
  const [a, b] = geo as [(typeof geo)[number], (typeof geo)[number]];
  if (!(a.dy > 0) || !(b.dy > 0)) return { ok: false, why: 'The hook has to be above both picks.' };
  const det = a.ux * b.uy - b.ux * a.uy;
  const ta = (-weight * b.ux) / det;
  const tb = (weight * a.ux) / det;
  const leg = (g: typeof a, t: number): RigLeg => {
    const angle = (Math.atan2(g.dy, Math.abs(g.dx)) * 180) / Math.PI;
    return { at: g.at, s: g.s, y: g.y, length: g.length, angle, tension: t, share: t * g.uy, sideways: t * Math.abs(g.ux), band: band(angle) };
  };
  const legs: [RigLeg, RigLeg] = [leg(a, ta), leg(b, tb)];
  const hookFor60 = hookHeightFor(p1, p2, cg)!;
  const warnings: RigWarning[] = [];
  // The height of the line between the picks right under the hook: a centre of gravity above it can roll over.
  const lineY = p1.y + ((p2.y - p1.y) * s) / span;
  const tol = Math.max(0.5, span * 0.02);
  if (offPlane > tol) warnings.push({ id: 'rolls', text: `The centre of gravity is ${fmtIn(offPlane)} off the line between the picks: the spool rolls about that line until it hangs under it. Add a third pick or a tag line, or move a pick.` });
  if (cg.y > lineY + tol) warnings.push({ id: 'overturns', text: `The centre of gravity is ${fmtIn(cg.y - lineY)} above the picks: the spool can roll over. Pick above it, or choke the slings to stop it turning.` });
  if (legs.some((l) => l.angle < MIN_ANGLE)) warnings.push({ id: 'flat', text: `A leg is under ${MIN_ANGLE}° from horizontal: never rig it that flat. Raise the hook or use longer slings.` });
  return { ok: true, legs, hook, cg: { s, y: cg.y }, span, offPlane, hookFor60, warnings };
}

/** Where a place on the spool can be picked: along each cut piece, clear of the fittings. */
export function pickCandidates(spool: SpoolResult): At[] {
  const out: At[] = [];
  spool.runs.forEach((r, i) => {
    if (r.cutLength <= 0) return;
    for (const f of [0.1, 0.25, 0.5, 0.75, 0.9]) out.push({ run: i, along: Math.round((r.takeoffStart + r.cutLength * f) * 4) / 4 });
  });
  return out;
}

/**
 * Two picks to start from: the pair that hangs the spool as it sits, as near
 * level as it can, the centre of gravity well inside them, as wide apart as
 * the spool allows. Null when no pair holds it without tipping.
 */
export function suggestPicks(spool: SpoolResult, cg: Vec3): [At, At] | null {
  const c = pickCandidates(spool);
  let best: { score: number; pair: [At, At] } | null = null;
  for (let i = 0; i < c.length; i += 1) {
    for (let j = i + 1; j < c.length; j += 1) {
      const a = pointAt(spool, c[i]!)!;
      const b = pointAt(spool, c[j]!)!;
      const span = Math.hypot(b.x - a.x, b.z - a.z);
      if (span < 6) continue;
      const e = { x: (b.x - a.x) / span, z: (b.z - a.z) / span };
      const rx = cg.x - a.x;
      const rz = cg.z - a.z;
      const s = rx * e.x + rz * e.z;
      if (s < span * 0.15 || s > span * 0.85) continue;
      const off = Math.hypot(rx - s * e.x, rz - s * e.z);
      const lineY = a.y + ((b.y - a.y) * s) / span;
      const above = Math.max(0, cg.y - lineY);
      // Hung as it sits first, then level picks, then centred, then wide.
      const score = off * 4 + above * 3 + Math.abs(a.y - b.y) + Math.abs(s - span / 2) * 0.2 - span * 0.05;
      if (!best || score < best.score) best = { score, pair: [c[i]!, c[j]!] };
    }
  }
  return best?.pair ?? null;
}
