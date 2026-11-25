// The elbows an offset is made with, by what the pipe is
// ------------------------------------------------------
// An offset in steel is two butt weld elbows; in galvanised, two screwed
// ones; in PVC, two socket elbows; in cast iron soil pipe, two no-hub bends.
// Each takes out its own figure and leaves its own joint, so the offset
// screens ask here, with the job's material, rather than assume a weld.
//
// The figures are the ones Cut Length reads: the handbook for butt weld and
// screwed, the fitting library for socket and no-hub (the maker's, set once
// per line and size). Nothing here is a new number.

import { DEFAULT_TAKEOFF_OPTIONS, LIBRARY_FAMILY, LIBRARY_FITTINGS, TAKEOFF_FAMILIES, elbowTakeout, endTakeout } from './takeoffCatalog';
import { sizeLabel } from './materials';
import type { ElbowRadius } from './pipe';

export type OffsetJoint = 'welded' | 'screwed' | 'socket' | 'nohub';

/** How a material's offsets are made: PVC and CPVC socket, cast iron soil no-hub, galvanised screwed, the rest butt welded. */
export const offsetJoint = (materialId: string): OffsetJoint => LIBRARY_FAMILY[materialId] ?? (materialId === 'galv' ? 'screwed' : 'welded');

/** Whether the joint leaves a gap that comes off the cut: a weld's root gap, a no-hub coupling's centre stop. */
export const jointHasGap = (j: OffsetJoint): boolean => TAKEOFF_FAMILIES.find((f) => f.id === j)?.hasGap ?? false;

/** The angles the joint's elbows are made in; any angle for a butt weld elbow, which is cut down to it. */
export const JOINT_ANGLES: Record<OffsetJoint, readonly number[] | null> = {
  welded: null,
  screwed: [45, 90],
  socket: [45, 90],
  nohub: [22.5, 45, 90],
};

/** The library fittings an offset is made with, by angle. */
const LIBRARY_ELBOW: Record<'socket' | 'nohub', Record<string, string>> = {
  socket: { '90': 'sock90', '45': 'sock45' },
  nohub: { '90': 'nh14', '45': 'nh18', '22.5': 'nh116' },
};

export const JOINT_NAME: Record<OffsetJoint, string> = { welded: 'Butt weld', screwed: 'Screwed', socket: 'PVC socket', nohub: 'No-hub' };

export type ElbowPick =
  | { ok: true; value: number; fromTable: boolean; note: string }
  /** `fitting` is set when the figure is the fitting library's to hold and it holds none yet. */
  | { ok: false; error: string; fitting?: string };

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const angleKey = (a: number): string | null => (near(a, 90) ? '90' : near(a, 45) ? '45' : near(a, 22.5) ? '22.5' : null);
const madeAt = (j: OffsetJoint) => JOINT_ANGLES[j]!.map((a) => `${a}°`).join(', ').replace(/, ([^,]*)$/, ' and $1');

/**
 * What one elbow of the offset takes out, at the angle it turns: the
 * handbook's figure for a bought butt weld elbow at 90° and 45° and the bend
 * radius for one cut to any other angle; the handbook's screwed elbow; or the
 * fitting library's socket elbow or no-hub bend for the line.
 */
export function offsetElbow(
  joint: OffsetJoint,
  nps: number,
  radius: ElbowRadius,
  angle: number,
  library?: (fitting: string, nps: number) => number | undefined,
): ElbowPick {
  if (joint === 'welded') {
    const r = elbowTakeout(nps, radius, angle);
    if (!Number.isFinite(r.value)) return { ok: false, error: `No ${sizeLabel(nps)} ${radius} elbow figure at ${Number(angle.toFixed(2))}°.` };
    return { ok: true, value: r.value, fromTable: r.fromTable, note: r.fromTable ? 'Handbook 2-42' : 'Cut elbow, bend radius' };
  }
  const key = angleKey(angle);
  if (key === null || !JOINT_ANGLES[joint]!.includes(Number(key)))
    return { ok: false, error: `${JOINT_NAME[joint]} elbows are made at ${madeAt(joint)}. Set the angle to one of them.` };
  if (joint === 'screwed') {
    const v = endTakeout(`screwed${key}`, nps, { ...DEFAULT_TAKEOFF_OPTIONS, radius });
    if (!Number.isFinite(v)) return { ok: false, error: `No ${sizeLabel(nps)} screwed ${key}° elbow in the handbook.` };
    return { ok: true, value: v, fromTable: true, note: `Screwed, handbook ${key === '90' ? '4-37' : '4-39'}` };
  }
  const id = LIBRARY_ELBOW[joint][key]!;
  const v = library?.(id, nps);
  const label = LIBRARY_FITTINGS.find((f) => f.id === id)?.label ?? id;
  if (v === undefined || !Number.isFinite(v))
    return { ok: false, fitting: id, error: `Set the ${sizeLabel(nps)} ${label} takeout below: it is the maker's figure.` };
  return { ok: true, value: v, fromTable: false, note: `Your fitting library: ${label}` };
}

/** The welded pick, for a solver given no other: what the offsets worked before the material was asked. */
export const weldedElbow = (nps: number, radius: ElbowRadius) => (angle: number): ElbowPick => offsetElbow('welded', nps, radius, angle);
