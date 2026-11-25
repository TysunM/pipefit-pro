// A program worked out
// --------------------
// What a weld schedule comes to: how long each level runs and what current
// the joint feels through it, the time from the gas coming on to it going
// off, whether the levels cover the turn and its overlap, what the program
// asks of its head and power supply, and the figures every equation gives
// on it (orbitalEquations.ts). Then the shapes the screens draw: the levels
// as arcs round the tube, and the current against time.
//
// Pure. Inches, seconds, degrees, amps.

import { solveAll, type Equation, type Figure, type Unworked } from './orbitalEquations';
import type { Gear, Level, ProgramBody } from '../state/orbitalBook';

/** Equations that give a starting point for a development weld. A qualified program's figures come off its WPS and coupon, so these are not shown on one. */
export const DEV_ONLY = new Set(['start-amps', 'step-down']);

export const pulsed = (l: Level): boolean => l.ib < l.ip && l.tp > 0 && l.tb > 0;

/** The seconds a level runs: its share of the turn at its rotor speed. */
export const levelSeconds = (l: Level): number | null => (l.rpm > 0 && l.deg > 0 ? (l.deg / 360) * (60 / l.rpm) : null);

/** The current the joint feels over a level: the pulse averaged, or the peak when it does not pulse. */
export function levelAverage(l: Level): number | null {
  if (!(l.ip > 0)) return null;
  return pulsed(l) ? (l.ip * l.tp + l.ib * l.tb) / (l.tp + l.tb) : l.ip;
}

export type Times = { arc: number | null; total: number | null; weld: number | null };

/**
 * The weld time round (the levels), the arc time (with the slopes and the
 * standing start), and the whole run from gas on to gas off. Null while a
 * level has no rotor speed. A blank step is no time.
 */
export function programTimes(p: ProgramBody): Times {
  const each = p.levels.map(levelSeconds);
  if (!each.length || each.some((s) => s === null)) return { weld: null, arc: null, total: null };
  const s = p.seq;
  const weld = (each as number[]).reduce((a, b) => a + b, 0);
  const arc = weld + (s.upslope ?? 0) + (s.delay ?? 0) + (s.downslope ?? 0);
  return { weld, arc, total: arc + (s.prepurge ?? 0) + (s.postpurge ?? 0) };
}

/** Whether the levels cover the turn and the overlap past the start. */
export function degreesCheck(p: ProgramBody): { sum: number; want: number; ok: boolean } {
  const sum = p.levels.reduce((a, l) => a + l.deg, 0);
  const want = 360 + (p.overlap ?? 0);
  return { sum, want, ok: Math.abs(sum - want) < 0.05 };
}

/** The levels spread evenly over the turn and the overlap, keeping everything else each level holds. */
export function spreadDegrees(p: ProgramBody): Level[] {
  const n = p.levels.length;
  if (!n) return [];
  const want = 360 + (p.overlap ?? 0);
  const each = Math.floor((want / n) * 10) / 10;
  return p.levels.map((l, i) => ({ ...l, deg: i === n - 1 ? Math.round((want - each * (n - 1)) * 10) / 10 : each }));
}

/** The figures a program offers the equations, by the names they ask for. */
export function programScope(p: ProgramBody, head: Gear | undefined): Record<string, number | null> {
  const scope: Record<string, number | null> = {
    OD: p.od,
    wall: p.wall,
    C: head?.constant ?? null,
    gap: p.tungsten.gap,
    overlap: p.overlap,
    V: p.volts,
    CFH: p.gas.purgeCfh,
  };
  for (const x of p.extras) scope[x.key] = x.value;
  return scope;
}

/**
 * A level's own figures, by the names the equations ask for. A level that
 * does not pulse offers its current as the average, and no pulse times, so
 * nothing is worked out about a pulse it does not have.
 */
export function levelScope(l: Level): Record<string, number | null> {
  const base = { deg: l.deg, RPM: l.rpm > 0 ? l.rpm : null, Ip: l.ip > 0 ? l.ip : null };
  return pulsed(l) ? { ...base, Ib: l.ib, tp: l.tp, tb: l.tb } : { ...base, Iavg: l.ip > 0 ? l.ip : null };
}

export type ProgramFigures = { program: Figure[]; levels: Figure[][]; unworked: Unworked[] };

/**
 * Every figure the equations give on a program: those that hang on the
 * program alone, then those each level adds. What no level could work is
 * listed once, with what it still wants.
 */
export function programFigures(p: ProgramBody, head: Gear | undefined, equations: readonly Equation[], extra: Record<string, number | null> = {}): ProgramFigures {
  const eqs = p.status === 'qualified' ? equations.filter((e) => !DEV_ONLY.has(e.id)) : equations;
  const scope = { ...programScope(p, head), ...extra };
  const whole = solveAll(eqs, scope);
  const shown = new Set(whole.figures.map((f) => f.id));
  const worked = new Set(shown);
  const levels = p.levels.map((l) => {
    const r = solveAll(eqs, { ...scope, ...levelScope(l) });
    const own = r.figures.filter((f) => !shown.has(f.id));
    for (const f of own) worked.add(f.id);
    return own;
  });
  const unworked = whole.unworked.filter((u) => !worked.has(u.id));
  return { program: whole.figures, levels, unworked };
}

/** What the program asks that its gear may not do, and anything else worth a look before it is welded. */
export function programWarnings(p: ProgramBody, supply: Gear | undefined, head: Gear | undefined, today: string): string[] {
  const out: string[] = [];
  const deg = degreesCheck(p);
  if (!deg.ok) out.push(`The levels add to ${round1(deg.sum)}°; the turn and the overlap are ${round1(deg.want)}°.`);
  if (p.headId && !head) out.push('The head this program names is not in the equipment book any more.');
  if (p.supplyId && !supply) out.push('The power supply this program names is not in the equipment book any more.');
  if (head && p.od !== null) {
    if (head.odMin !== null && p.od < head.odMin) out.push(`${p.od.toFixed(3)}" OD is under the head's smallest, ${head.odMin}".`);
    if (head.odMax !== null && p.od > head.odMax) out.push(`${p.od.toFixed(3)}" OD is over the head's largest, ${head.odMax}".`);
  }
  if (head?.rpmMax != null) {
    const fast = p.levels.findIndex((l) => l.rpm > head.rpmMax!);
    if (fast >= 0) out.push(`Level ${fast + 1} turns faster than the head's ${head.rpmMax} RPM.`);
  }
  if (supply?.ampsMax != null) {
    const hot = p.levels.findIndex((l) => l.ip > supply.ampsMax!);
    if (hot >= 0) out.push(`Level ${hot + 1} asks more than the power supply's ${supply.ampsMax} A.`);
  }
  if (supply?.levelsMax != null && p.levels.length > supply.levelsMax) out.push(`${p.levels.length} levels; the power supply holds ${supply.levelsMax}.`);
  for (const g of [supply, head]) if (g?.calDue && g.calDue < today) out.push(`${g.make || g.model || 'The power supply'} ${g.model && g.make ? g.model : ''} was due for calibration on ${g.calDue}.`.replace(/\s+/g, ' '));
  if (head && p.tungsten.gap !== null && head.constant !== null && p.od !== null) {
    const len = head.constant - p.od / 2 - p.tungsten.gap;
    if (len <= 0) out.push("The tungsten length comes out at nothing: check the head's constant, the OD and the gap.");
  }
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ------------------------------------------------------------ what is drawn

export type Arc = { level: number; from: number; to: number };

/** Each level as an arc round the tube, from the start at the top, clockwise; the overlap runs on past 360. */
export function clockArcs(p: ProgramBody): Arc[] {
  let at = 0;
  return p.levels.map((l, i) => {
    const a = { level: i, from: at, to: at + l.deg };
    at += l.deg;
    return a;
  });
}

export type Segment =
  | { kind: 'prepurge' | 'postpurge'; t0: number; t1: number }
  | { kind: 'upslope' | 'downslope'; t0: number; t1: number; from: number; to: number }
  | { kind: 'delay'; t0: number; t1: number; amps: number }
  | { kind: 'level'; t0: number; t1: number; level: number; ip: number; ib: number; avg: number; pulsed: boolean };

/**
 * The current against time, gas on to gas off: the prepurge, the ramp up to
 * the first level, the head standing while the puddle forms, each level, the
 * ramp down, the postpurge. A level with no rotor speed yet is drawn a
 * nominal second so the shape still shows.
 */
export function currentProfile(p: ProgramBody): Segment[] {
  const out: Segment[] = [];
  let t = 0;
  const s = p.seq;
  const first = p.levels[0];
  const last = p.levels[p.levels.length - 1];
  const push = (seg: Segment) => {
    out.push(seg);
    t = seg.t1;
  };
  if (s.prepurge) push({ kind: 'prepurge', t0: t, t1: t + s.prepurge });
  if (s.upslope && first) push({ kind: 'upslope', t0: t, t1: t + s.upslope, from: 0, to: levelAverage(first) ?? 0 });
  if (s.delay && first) push({ kind: 'delay', t0: t, t1: t + s.delay, amps: levelAverage(first) ?? 0 });
  p.levels.forEach((l, i) => {
    const secs = levelSeconds(l) ?? 1;
    push({ kind: 'level', t0: t, t1: t + secs, level: i, ip: l.ip, ib: pulsed(l) ? l.ib : l.ip, avg: levelAverage(l) ?? 0, pulsed: pulsed(l) });
  });
  if (s.downslope && last) push({ kind: 'downslope', t0: t, t1: t + s.downslope, from: levelAverage(last) ?? 0, to: 0 });
  if (s.postpurge) push({ kind: 'postpurge', t0: t, t1: t + s.postpurge });
  return out;
}

/** "1:05.2", "12.0 s". */
export function clock(secs: number | null): string {
  if (secs === null || !Number.isFinite(secs)) return '—';
  if (secs < 60) return `${secs.toFixed(1)} s`;
  const m = Math.floor(secs / 60);
  const r = secs - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}
