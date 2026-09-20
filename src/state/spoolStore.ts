// The spool shelf
// ---------------
// A spool takes twenty minutes to lay out and a phone restart to lose. That
// asymmetry is the whole reason this file exists: what somebody built on the
// spool screen is kept by name, on the device, and comes back exactly as it
// was left.
//
// What is saved is the input, not the answer. A spool is its legs — where each
// one runs and how far — plus the pipe it is in and the weld gap, and the
// solver is deterministic, so the cuts are always reproducible from that. It
// also means a saved spool picks up any future fix to the solver instead of
// freezing a wrong answer into the store.
//
// Everything here is pure. The provider in spools.tsx holds one shelf and
// persists it through the shared machinery in persisted.tsx; all the reasoning
// lives in these functions so it can be tested without a device.

import { ElbowRadius, Schedule } from '../calc/pipe';
import { MAX_LEGS, solveSpool } from '../calc/spool';
import { solveDirections } from '../calc/direction';
import { OrderSpool } from '../calc/orderSheet';

/**
 * Bumped only when the stored shape changes in a way an older app would read
 * wrongly. A store written by a NEWER version is left untouched rather than
 * parsed optimistically or overwritten — the same rule as the joint register,
 * for the same reason: the crew runs the web app and the APK side by side.
 */
export const SPOOLS_VERSION = 1;

/**
 * Enough spools for any job, and small enough the shelf stays a few dozen
 * kilobytes. Past the cap the oldest-touched spool goes first — every saved
 * spool is a finished thought, so unlike the joint register there is nothing
 * here too precious to drop, but the one just saved is never the one dropped.
 */
export const MAX_SPOOLS = 100;

/** A leg as it was entered: where it runs, and how far. */
export type SavedLeg = { length: number; bearing: number; slope: number };

export type SavedSpool = {
  id: string;
  /** What it is called out by: a spool mark, a line number. Never empty. */
  name: string;
  /** Where it goes, or anything worth remembering. May be empty. */
  place: string;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  gap: number;
  legs: SavedLeg[];
  createdAt: number;
  updatedAt: number;
};

export type SpoolShelf = {
  spools: SavedSpool[];
  /** The store was written by a newer app; nothing is written this session. */
  foreign: boolean;
  /** Spools that failed to load. Counted, never silently repaired. */
  dropped: number;
};

export const emptyShelf = (): SpoolShelf => ({ spools: [], foreign: false, dropped: 0 });

// ------------------------------------------------------------- validation

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

const KINDS: readonly string[] = ['LR', 'SR'];
const SCHEDULES: readonly string[] = ['10', '40', '80'];

function validLeg(v: unknown): SavedLeg | null {
  if (!isRec(v)) return null;
  const { length, bearing, slope } = v;
  if (!isNum(length) || length <= 0) return null;
  if (!isNum(bearing)) return null;
  if (!isNum(slope) || slope < -90 || slope > 90) return null;
  return { length, bearing, slope };
}

/**
 * One spool off the wire, or null.
 *
 * Nothing is repaired. A spool with a leg missing is not the spool somebody
 * saved, and handing it back patched up would put wrong cuts on a screen that
 * looks exactly like a right one.
 */
export function validSpool(v: unknown): SavedSpool | null {
  if (!isRec(v)) return null;
  const { id, name, place, nps, kind, schedule, gap, legs, createdAt, updatedAt } = v;
  if (!isStr(id) || !id) return null;
  if (!isStr(name) || !name.trim()) return null;
  if (!isStr(place)) return null;
  if (!isNum(nps) || nps <= 0) return null;
  if (!isStr(kind) || !KINDS.includes(kind)) return null;
  if (!isStr(schedule) || !SCHEDULES.includes(schedule)) return null;
  if (!isNum(gap) || gap < 0) return null;
  if (!Array.isArray(legs) || legs.length < 1 || legs.length > MAX_LEGS) return null;
  if (!isInt(createdAt) || createdAt <= 0) return null;
  if (!isInt(updatedAt) || updatedAt <= 0) return null;

  const okLegs: SavedLeg[] = [];
  for (const leg of legs) {
    const l = validLeg(leg);
    if (!l) return null;
    okLegs.push(l);
  }

  return {
    id,
    name: name.trim(),
    place,
    nps,
    kind: kind as ElbowRadius,
    schedule: schedule as Schedule,
    gap,
    legs: okLegs,
    createdAt,
    updatedAt,
  };
}

// ------------------------------------------------------------- persistence

export function serialiseShelf(s: SpoolShelf): string {
  return JSON.stringify({ v: SPOOLS_VERSION, spools: s.spools });
}

/**
 * Read the store.
 *
 * Nothing here throws and nothing here guesses. A store from a newer app comes
 * back empty with `foreign` set, so the caller can say so and — importantly —
 * decline to write over it. Individual spools that fail validation are dropped
 * and counted rather than repaired.
 */
export function parseShelf(raw: string | null | undefined): SpoolShelf {
  if (!raw) return emptyShelf();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyShelf(), dropped: 1 };
  }

  if (!isRec(parsed)) return { ...emptyShelf(), dropped: 1 };
  if (!isInt(parsed.v) || parsed.v < 1) return { ...emptyShelf(), dropped: 1 };
  if (parsed.v > SPOOLS_VERSION) return { ...emptyShelf(), foreign: true };
  if (!Array.isArray(parsed.spools)) return { ...emptyShelf(), dropped: 1 };

  const spools: SavedSpool[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw2 of parsed.spools) {
    const s = validSpool(raw2);
    if (!s || seen.has(s.id)) {
      dropped += 1;
      continue;
    }
    seen.add(s.id);
    spools.push(s);
  }

  return { spools: sortSpools(spools), foreign: false, dropped };
}

// -------------------------------------------------------------- operations

/** Most recently touched first, which is the one somebody is coming back for. */
export function sortSpools(spools: SavedSpool[]): SavedSpool[] {
  return spools.slice().sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}

export function getSpool(s: SpoolShelf, id: string): SavedSpool | undefined {
  return s.spools.find((x) => x.id === id);
}

/** An id that is not already on the shelf, derived from the name. */
export function freshSpoolId(s: SpoolShelf, seed: string): string {
  const base = seed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'spool';
  if (!getSpool(s, base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!getSpool(s, id)) return id;
  }
}

/**
 * Put a spool on the shelf: new if the id is new, replacing what held the id
 * otherwise. The shelf is pruned back under its cap oldest-touched first, and
 * the spool just saved is never the one pruned — saving must never be the act
 * that loses the thing being saved.
 */
export function saveSpool(shelf: SpoolShelf, spool: SavedSpool, now: number): SpoolShelf {
  const existing = getSpool(shelf, spool.id);
  const next: SavedSpool = {
    ...spool,
    name: spool.name.trim(),
    createdAt: existing?.createdAt ?? spool.createdAt,
    updatedAt: now,
  };
  let spools = sortSpools([...shelf.spools.filter((x) => x.id !== spool.id), next]);
  if (spools.length > MAX_SPOOLS) {
    const keep = new Set(
      sortSpools(spools.filter((x) => x.id !== next.id))
        .slice(0, MAX_SPOOLS - 1)
        .map((x) => x.id)
    );
    keep.add(next.id);
    spools = spools.filter((x) => keep.has(x.id));
  }
  return { ...shelf, spools };
}

export function renameSpool(shelf: SpoolShelf, id: string, name: string, place: string, now: number): SpoolShelf {
  const spool = getSpool(shelf, id);
  if (!spool || !name.trim()) return shelf;
  return {
    ...shelf,
    spools: sortSpools(
      shelf.spools.map((x) => (x.id === id ? { ...x, name: name.trim(), place, updatedAt: now } : x))
    ),
  };
}

export function deleteSpool(shelf: SpoolShelf, id: string): SpoolShelf {
  const spools = shelf.spools.filter((x) => x.id !== id);
  return spools.length === shelf.spools.length ? shelf : { ...shelf, spools };
}

/**
 * Whether what is on screen is what the shelf holds.
 *
 * Compared on what a save would write — the legs, the pipe, the gap — so an
 * edit undone by hand reads as clean again, which is what it is.
 */
export function sameSpool(a: SavedSpool, b: Pick<SavedSpool, 'nps' | 'kind' | 'schedule' | 'gap' | 'legs'>): boolean {
  if (a.nps !== b.nps || a.kind !== b.kind || a.schedule !== b.schedule) return false;
  // The gap crosses the unit conversion on its way to the screen and back, so
  // it is compared to a hair rather than to the bit — a metric round trip a
  // millionth of a millimetre out is not an edit.
  if (Math.abs(a.gap - b.gap) > 1e-9) return false;
  if (a.legs.length !== b.legs.length) return false;
  return a.legs.every(
    (l, i) => l.length === b.legs[i]!.length && l.bearing === b.legs[i]!.bearing && l.slope === b.legs[i]!.slope
  );
}

// ------------------------------------------------------------- ordering

/**
 * A saved spool, solved to the cut lengths an order is built from.
 *
 * The shelf keeps the input rather than the answer, so this runs the same two
 * solvers the spool screen runs — the directions to turns, the turns to a
 * spool — and takes the cuts off the result. Anything that stops it solving
 * comes back as a reason rather than as an empty list, because a spool left
 * off an order silently is a spool that turns up missing at the bench.
 */
export function spoolToOrder(s: SavedSpool): OrderSpool {
  const base = {
    id: s.id,
    name: s.name,
    place: s.place,
    nps: s.nps,
    kind: s.kind,
    schedule: s.schedule,
  };

  const turns = solveDirections(s.legs.map((l, i) => ({ id: `${s.id}:${i}`, length: l.length, dir: { bearing: l.bearing, slope: l.slope } })));
  if (!turns.ok) return { ...base, cuts: [], problem: turns.error };

  const solved = solveSpool({
    legs: turns.legs,
    start: turns.start,
    nps: s.nps,
    kind: s.kind,
    schedule: s.schedule,
    gap: s.gap,
  });
  if (!solved.valid) return { ...base, cuts: [], problem: solved.error ?? 'It will not build as saved.' };

  return { ...base, cuts: solved.runs.map((r) => r.cutLength) };
}
