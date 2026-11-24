// The pipe the trade keys work on
// -------------------------------
// Pipe Size, Pipe Mat'l, Elbow and Welder's Gap on the keypad set the pipe the
// calculator's take-outs, arcs and cut lengths are worked for. It is the same
// pipe the rest of the app is set to (Settings: size, material, wall, elbow
// radius and gap), so setting it on the keypad sets it everywhere and the
// calculator never works a different pipe from the tool beside it.
//
// Every figure comes from the tables the rest of the app reads: the handbook
// take-outs (takeoffCatalog.ts), the walls by material (materials.ts) and the
// elbow arcs (pipe.ts). Nothing here is a new sum.

import { backArc, centerlineArc, findSize, throatArc, type ElbowRadius } from './pipe';
import { DEFAULT_TAKEOFF_OPTIONS, LIBRARY_FAMILY, elbowTakeout, endTakeout } from './takeoffCatalog';
import { MATERIALS, material, pipeSpec, resolveSpec, sizeLabel, sizesFor, wallLabel, wallsAt } from './materials';
import { WATER_LB_PER_CUBIC_FOOT } from './pipeData';

export type PipeContext = {
  /** A materials.ts id: "cs", "ss316l", "pvc". */
  material: string;
  nps: number;
  /** The wall in the material's own designation: "40", "40S", "DR11". */
  wall: string;
  radius: ElbowRadius;
  /** Welder's gap, inches: what each butt weld leaves between pipe and fitting. */
  gap: number;
};

/** The app's own defaults (state/settings.ts). */
export const DEFAULT_PIPE: PipeContext = { material: 'cs', nps: 2, wall: '40', radius: 'LR', gap: 0.09375 };

/** How a material's elbows are joined: plastic and soil pipe are the fitting library's, galvanised is screwed, the rest butt welded. */
export type PipeJoint = 'welded' | 'screwed' | 'library';
export const jointOf = (materialId: string): PipeJoint => (LIBRARY_FAMILY[materialId] ? 'library' : materialId === 'galv' ? 'screwed' : 'welded');

export const samePipe = (a: PipeContext, b: PipeContext): boolean =>
  a.material === b.material && a.nps === b.nps && a.wall === b.wall && a.radius === b.radius && a.gap === b.gap;

/** "2\" SCH 40 CS", the pipe as a card names it. */
export function pipeName(p: PipeContext): string {
  return `${sizeLabel(p.nps)} ${wallLabel(p.wall)} ${material(p.material).short}`;
}

const range = (sizes: number[]): string => `${sizeLabel(sizes[0]!).replace(/"$/, '')} to ${sizeLabel(sizes[sizes.length - 1]!)}`;

/** The pipe at another size, its wall kept where it comes that way. */
export function withSize(p: PipeContext, nps: number): PipeContext | string {
  const m = material(p.material);
  const sizes = sizesFor(m);
  if (!sizes.includes(nps)) return `No ${Number(nps.toFixed(3))}" ${m.short}. It comes ${range(sizes)}.`;
  const r = resolveSpec(p.material, nps, p.wall);
  return { ...p, nps: r.nps, wall: r.wall };
}

/**
 * The pipe in another wall, keyed as its number: 80 is SCH 80, 40 on stainless
 * is 40S, 11 on HDPE is DR 11.
 */
export function withWall(p: PipeContext, n: number): PipeContext | string {
  const at = wallsAt(p.material, p.nps);
  const asText = String(Number(n.toFixed(3)));
  const wall = [asText, `${asText}S`, `DR${asText}`].find((w) => at.includes(w));
  if (!wall) return `${sizeLabel(p.nps)} ${material(p.material).short} comes in ${at.map(wallLabel).join(', ')}.`;
  return { ...p, wall };
}

/** The next material in the list, the size and wall moved to the nearest it comes in. */
export function nextMaterial(p: PipeContext): PipeContext {
  const i = MATERIALS.findIndex((m) => m.id === p.material);
  const next = MATERIALS[(i + 1) % MATERIALS.length]!;
  const r = resolveSpec(next.id, p.nps, p.wall);
  // A wall that does not carry over goes to the new material's usual one.
  return { ...p, material: r.material, nps: r.nps, wall: r.wall };
}

export const materialName = (p: PipeContext): string => material(p.material).name;

/** What Pipe shows, press by press: the figures of the pipe set. */
export type PipeFact = { label: string; value: number; unit: 'in' | 'lbft' | 'galft' };

export function pipeFacts(p: PipeContext): PipeFact[] | string {
  const spec = pipeSpec(p.material, p.nps, p.wall);
  if (!spec) return `No ${pipeName(p)} in the tables.`;
  const bore = (Math.PI * spec.id * spec.id) / 4;
  return [
    { label: 'OD', value: spec.od, unit: 'in' },
    { label: 'ID', value: spec.id, unit: 'in' },
    { label: 'WALL', value: spec.wall, unit: 'in' },
    { label: 'LB/FT', value: spec.lbPerFt, unit: 'lbft' },
    { label: 'LB/FT FULL', value: spec.lbPerFt + (bore / 144) * WATER_LB_PER_CUBIC_FOOT, unit: 'lbft' },
    { label: 'GAL/FT', value: (bore * 12) / 231, unit: 'galft' },
  ];
}

/** Inside area of the pipe set, square inches; NaN when it is not in the tables. */
export function boreArea(p: PipeContext): number {
  const spec = pipeSpec(p.material, p.nps, p.wall);
  return spec ? (Math.PI * spec.id * spec.id) / 4 : NaN;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * The take-out of the pipe's elbow at an angle: the handbook figure at 90 and
 * 45, the bend radius at any other (an elbow cut down to it). Screwed elbows
 * are made at 90 and 45 only; plastic and soil pipe fittings are the maker's.
 */
export function takeoutAt(p: PipeContext, angle: number): { value: number; fromTable: boolean } | string {
  if (!(angle > 0 && angle <= 90)) return 'An elbow is more than 0° and no more than 90°.';
  const joint = jointOf(p.material);
  if (joint === 'library') return "Plastic and soil pipe fittings are the maker's: set the takeout in the fitting library.";
  if (joint === 'screwed') {
    const a = near(angle, 90) ? 90 : near(angle, 45) ? 45 : null;
    if (a === null) return 'A screwed elbow is made at 90 and 45 only.';
    const v = endTakeout(`screwed${a}`, p.nps, { ...DEFAULT_TAKEOFF_OPTIONS, radius: p.radius });
    return Number.isFinite(v) ? { value: v, fromTable: true } : `No ${sizeLabel(p.nps)} screwed ${a} in the handbook.`;
  }
  const r = elbowTakeout(p.nps, p.radius, angle);
  return Number.isFinite(r.value) ? r : `No ${sizeLabel(p.nps)} ${p.radius} butt weld figure at ${Number(angle.toFixed(2))}°.`;
}

/** Where to mark a butt weld elbow cut to an angle: the throat, the centre line and the heel, each from the end. */
export function arcsAt(p: PipeContext, angle: number): { inner: number; centre: number; outer: number } | string {
  if (jointOf(p.material) !== 'welded') return 'Only a butt weld elbow is cut to an angle.';
  if (!(angle > 0 && angle <= 90)) return 'An elbow is more than 0° and no more than 90°.';
  const od = pipeSpec(p.material, p.nps, p.wall)?.od ?? findSize(p.nps).od;
  return { inner: throatArc(p.nps, p.radius, angle, od), centre: centerlineArc(p.nps, p.radius, angle), outer: backArc(p.nps, p.radius, angle, od) };
}

/**
 * The pipe cut between two elbows: the travel less a take-out at each end and
 * a welder's gap at each weld. Null with the reason when nothing is left.
 */
export function cutBetween(p: PipeContext, travel: number, angle: number): { cut: number; takeout: number; gaps: number } | string {
  const t = takeoutAt(p, angle);
  if (typeof t === 'string') return t;
  const gaps = jointOf(p.material) === 'welded' ? 2 * p.gap : 0;
  const cut = travel - 2 * t.value - gaps;
  if (!(cut > 0)) return 'The take-outs are longer than the travel: no pipe between the elbows.';
  return { cut, takeout: t.value, gaps };
}

/** Elbow on the readout: the radius for a butt weld pipe, the joint for any other. */
export function elbowName(p: PipeContext): string {
  const joint = jointOf(p.material);
  if (joint === 'screwed') return 'Screwed';
  if (joint === 'library') return 'Fitting library';
  return p.radius === 'LR' ? 'Long radius' : 'Short radius';
}
