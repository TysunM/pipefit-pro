// The joint register
// ------------------
// A flange bolt-up is four passes over every bolt, and on a real job you get
// called away in the middle of one. Losing your place means either starting the
// joint again or guessing which bolts you had already pulled down — and
// guessing is how a bolt gets taken to full torque twice while its neighbour
// never gets touched.
//
// So the register keeps every joint by name, and the working state with it. It
// is written through on every bolt rather than on leaving the screen, because
// the case it exists for is the phone being put in a pocket mid-pass.
//
// Everything here is pure. The provider in joints.tsx holds one Register and
// persists it; all the reasoning lives in these functions so it can be tested
// without a device.

import { CastIronFlangeClass, boltUp } from '../calc/boltUp';
import { SteelClass, isSteelClass, steelFlange, studLabel } from '../calc/steelFlange';
import { cleanProject } from './project';
import { cleanPerson } from './readSettings';
import {
  BoltUpState,
  Gasket,
  MethodId,
  boltUpProgress,
  currentRound,
  isAsked,
  isFinished,
  isMethodId,
  levelsAt,
  method,
  methodBar,
  plan,
  startBoltUp,
  withMethod as stateWithMethod,
} from '../calc/boltUpSequence';

/** Every class a joint can be: the cast iron pair from B16.1 and the steel run from B16.5. */
export type JointClass = CastIronFlangeClass | SteelClass;
export const isCastIron = (cls: JointClass): cls is CastIronFlangeClass => cls === '125' || cls === '250';

/** The unnamed joint the flange screen uses until it is given a tag. */
export const SCRATCH_ID = 'scratch';

/**
 * Bumped only when the stored shape changes in a way an older app would read
 * wrongly. A store written by a NEWER version is left untouched rather than
 * parsed optimistically or overwritten: the crew runs the web app and the APK
 * side by side, and one of them being a version behind must not wipe the other's
 * joints.
 */
export const REGISTER_VERSION = 3;

/**
 * Enough joints for any job, and small enough that the whole register stays a
 * few hundred kilobytes. Completed joints are dropped oldest first when it is
 * reached; a joint still part-way through is never dropped, even over the cap,
 * because unfinished work is the one thing here that cannot be reconstructed.
 */
export const MAX_JOINTS = 200;

/**
 * Re-torque checks kept per joint, oldest dropped first past the cap. Fifty is
 * far beyond any real joint: a flange that has been back to twice is unusual.
 */
export const MAX_CHECKS = 50;

/**
 * A re-torque check, after the joint has been through a thermal cycle.
 *
 * A bolted joint is a spring holding a gasket squashed. Take the line up to
 * temperature and three things happen at once: the gasket creeps, the flanges
 * and bolts grow at different rates, and the whole joint relaxes. So a joint
 * that was correct cold can be slack hot, and the bolting spec on most hot
 * service says to check it again once it has cycled.
 *
 * `moved` is the field that matters. Whether any bolt took up is the reading
 * that says whether the joint has settled or wants looking at again — a date
 * on its own only records that somebody went back, not what they found.
 */
export type ReCheck = {
  at: number;
  /** Did any bolt take up on this check. */
  moved: boolean;
  /** Torque used, when it was not the joint's own figure. */
  torque: number | null;
  note: string;
};

export type Joint = {
  id: string;
  /** What the fitter calls it — line number, spool mark, "pump suction". */
  tag: string;
  note: string;
  cls: JointClass;
  /** The table size, or null when the bolt count was set by hand. */
  nps: number | null;
  bolts: number;
  /** What is between the flanges. Decides which methods are offered, and goes on the record. */
  gasket: Gasket;
  /** Final torque from the job's bolting spec, or null when none was given. */
  torque: number | null;
  state: BoltUpState;
  createdAt: number;
  updatedAt: number;
  /** When the fourth pass closed, or null while it is still open. */
  completedAt: number | null;
  /**
   * Re-torque checks after the joint came up to temperature, oldest first.
   * Only a finished joint can have any: there is nothing to re-check on a
   * bolt-up that has not been finished once.
   */
  checks: ReCheck[];
  /**
   * The heat numbers welded or bolted into this joint, as entered.
   *
   * Numbers alone: the material, mill and cert reference live once in the heat
   * book, because one heat covers many pieces and thirty copies of a cert
   * reference is thirty places to correct when the cert is filed elsewhere.
   *
   * An absent list reads as an empty one, which is the whole migration from a
   * store written before this existed — and an empty list is a true statement
   * about that joint: no heat was recorded against it.
   */
  heats: string[];
  /** The Project ID active when the joint was first named; '' for none. See project.ts. */
  project: string;
  /**
   * Who pulled it up, and who watched it done. A turnover record names both:
   * a torque figure nobody put their name to is a figure nobody can be asked
   * about. Empty until entered; kept as typed and trimmed where it is read.
   */
  boltedBy: string;
  witnessedBy: string;
  /** The torque wrench it was pulled up with, by its tag in the calibration register; '' when not recorded. */
  wrench: string;
};

export type Register = {
  joints: Joint[];
  /** The store was written by a newer app and has been left alone. */
  foreign: boolean;
  /** Joints the store held that did not survive validation. */
  dropped: number;
};

export const emptyRegister = (): Register => ({ joints: [], foreign: false, dropped: 0 });

export const isScratch = (j: Joint): boolean => j.id === SCRATCH_ID;
export const isNamed = (j: Joint): boolean => !isScratch(j) && j.tag.trim() !== '';
export const isDone = (j: Joint): boolean => j.completedAt !== null;

/** The most recent re-torque check, or undefined if it has not been back. */
export const lastCheck = (j: Joint): ReCheck | undefined => j.checks[j.checks.length - 1];

/**
 * Finished, been back at least once, and nothing took up the last time.
 *
 * That last clause is the whole point: a joint checked once where bolts still
 * moved has told you it is still relaxing, and is not done relaxing yet.
 */
export function isSettled(j: Joint): boolean {
  const last = lastCheck(j);
  return isDone(j) && last !== undefined && !last.moved;
}

/** Finished, but either never checked or still taking up when it was. */
export const needsCheck = (j: Joint): boolean => isDone(j) && !isSettled(j);

// ---------------------------------------------------------------- validation

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * A bolt-up state, checked against itself rather than merely type-checked.
 *
 * The strong check is the last one. The levels are a pure function of the
 * position in the plan, so a stored level array either equals what the
 * position says or the store has been corrupted, hand-edited, or written by a
 * different version — and failing it is the point: a level array that
 * disagrees with the position would put the screen on the wrong bolt, which
 * is worse than losing the joint.
 *
 * A state written by version 2 (four fixed passes, no method) is read as the
 * Legacy method at the same place: pass p, step s is round p + 1, step s,
 * with the snug round taken as done.
 */
export function validState(v: unknown, bolts: number): BoltUpState | null {
  if (!isRec(v)) return null;
  if (!isInt(bolts) || bolts < 1) return null;
  if (v.bolts !== bolts) return null;
  const { lastWrong, wrongCount } = v;
  if (!isInt(wrongCount) || wrongCount < 0) return null;
  if (lastWrong !== null && (!isInt(lastWrong) || lastWrong < 1 || lastWrong > bolts)) return null;

  // Version 2: { pass, step, level } with no method.
  if (v.method === undefined && isInt(v.pass)) {
    const { pass, step } = v;
    if (pass < 0 || pass > 4 || !isInt(step) || step < 0 || step >= bolts) return null;
    const rounds = plan('legacy', bolts, 0);
    const finished = pass === 4;
    const round = finished ? rounds.length : pass + 1;
    return {
      bolts,
      method: 'legacy',
      round,
      step: finished ? 0 : step,
      extraChecks: 0,
      gapPending: false,
      level: levelsAt('legacy', bolts, 0, round, finished ? 0 : step),
      lastWrong: lastWrong as number | null,
      wrongCount,
    };
  }

  const { method: id, round, step, extraChecks, gapPending, level } = v;
  if (!isMethodId(id)) return null;
  if (!isInt(extraChecks) || extraChecks < 0 || extraChecks > 50) return null;
  const rounds = plan(id, bolts, extraChecks);
  if (!isInt(round) || round < 0 || round > rounds.length) return null;
  if (!isInt(step) || step < 0) return null;
  if (typeof gapPending !== 'boolean') return null;
  const finished = round === rounds.length;
  if (finished) {
    if (step !== 0 || gapPending) return null;
  } else {
    const r = rounds[round]!;
    // A step equal to the count is a closed check round waiting for its answer.
    if (step > r.steps.length || (step === r.steps.length && r.kind !== 'check')) return null;
    // A pending gap check belongs at the start of a round that follows one wanting it.
    if (gapPending && (step !== 0 || round === 0 || !rounds[round - 1]!.gapCheck)) return null;
  }
  // An added check round exists only because the one before it was answered "moved".
  if (extraChecks > 0 && round < rounds.length - extraChecks) return null;

  const want = levelsAt(id, bolts, extraChecks, round, step);
  if (!Array.isArray(level) || level.length !== bolts) return null;
  if (!level.every((l, i) => l === want[i])) return null;

  return {
    bolts,
    method: id,
    round,
    step,
    extraChecks,
    gapPending,
    level: want,
    lastWrong: lastWrong as number | null,
    wrongCount,
  };
}

const CLASSES: JointClass[] = ['125', '250', '150', '300', '600', '900', '1500', '2500'];
const GASKET_IDS: Gasket[] = ['unknown', 'soft', 'spiral', 'hard', 'rtj'];

/** One re-torque check, or null if it does not hold up. */
export function validCheck(v: unknown): ReCheck | null {
  if (!isRec(v)) return null;
  const { at, moved, torque, note } = v;
  if (!isInt(at) || at < 0) return null;
  if (typeof moved !== 'boolean') return null;
  if (torque !== null && (typeof torque !== 'number' || !Number.isFinite(torque) || torque <= 0)) return null;
  if (!isStr(note)) return null;
  return { at, moved, torque, note };
}

/** One joint, or null if anything about it does not hold up. */
export function validJoint(v: unknown): Joint | null {
  if (!isRec(v)) return null;
  const { id, tag, note, cls, nps, bolts, torque, createdAt, updatedAt, completedAt } = v;

  if (!isStr(id) || id === '') return null;
  if (!isStr(tag) || !isStr(note)) return null;
  if (!isStr(cls) || !CLASSES.includes(cls as JointClass)) return null;
  if (nps !== null && (typeof nps !== 'number' || !Number.isFinite(nps) || nps <= 0)) return null;
  if (!isInt(bolts) || bolts < 1) return null;
  if (torque !== null && (typeof torque !== 'number' || !Number.isFinite(torque) || torque <= 0)) return null;
  if (!isInt(createdAt) || createdAt < 0) return null;
  if (!isInt(updatedAt) || updatedAt < 0) return null;
  if (completedAt !== null && (!isInt(completedAt) || completedAt < 0)) return null;

  const state = validState(v.state, bolts);
  if (!state) return null;

  // A joint cannot be marked done unless its state says so, or the list would
  // show a finished joint the screen then reopens part-way through.
  if ((completedAt !== null) !== isFinished(state)) return null;

  // Version 1 stores have no checks at all, and that is the whole migration:
  // an absent list reads as an empty one. Anything present has to hold up.
  const rawChecks = v.checks === undefined ? [] : v.checks;
  if (!Array.isArray(rawChecks)) return null;
  const checks: ReCheck[] = [];
  for (const c of rawChecks) {
    const ok = validCheck(c);
    if (!ok) return null;
    checks.push(ok);
  }
  // Nothing to re-check on a joint that was never finished.
  if (checks.length && completedAt === null) return null;
  if (checks.length > MAX_CHECKS) return null;
  // Order is presentation, not a claim, so it is sorted rather than refused.
  checks.sort((a, b) => a.at - b.at);

  // Stores written before heats existed have no list, and an absent list is
  // an empty one. Blanks are dropped and spellings de-duplicated so a joint
  // cannot point at the same heat twice; a bad row does not fail the joint,
  // because losing a whole bolt-up over a stray heat entry would be worse
  // than losing the entry.
  const rawHeats = v.heats === undefined ? [] : v.heats;
  const heats: string[] = [];
  if (Array.isArray(rawHeats)) {
    const seenHeat = new Set<string>();
    for (const x of rawHeats) {
      if (!isStr(x)) continue;
      const trimmed = x.trim();
      const key = trimmed.toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (!key || seenHeat.has(key)) continue;
      seenHeat.add(key);
      heats.push(trimmed);
    }
  }

  return {
    id,
    tag,
    note,
    cls: cls as JointClass,
    nps: nps as number | null,
    bolts,
    // Stores written before the gasket was recorded have none: not set.
    gasket: GASKET_IDS.includes(v.gasket as Gasket) ? (v.gasket as Gasket) : 'unknown',
    torque: torque as number | null,
    state,
    createdAt,
    updatedAt,
    completedAt: completedAt as number | null,
    checks,
    heats,
    // Stores written before projects were tagged have none: "no project".
    project: cleanProject(v.project),
    // Stores written before these existed have none: nobody recorded.
    boltedBy: cleanPerson(v.boltedBy),
    witnessedBy: cleanPerson(v.witnessedBy),
    // Stores written before the calibration register have none: not recorded.
    wrench: typeof v.wrench === 'string' ? v.wrench.trim().toUpperCase().slice(0, 30) : '',
  };
}

// ------------------------------------------------------------- persistence

export function serialiseRegister(r: Register): string {
  return JSON.stringify({ v: REGISTER_VERSION, joints: r.joints });
}

/**
 * Read the store.
 *
 * Nothing here throws and nothing here guesses. A store from a newer app comes
 * back empty with `foreign` set, so the caller can say so and — importantly —
 * decline to write over it. Individual joints that fail validation are dropped
 * and counted rather than repaired, because a half-repaired bolt-up state is
 * indistinguishable from a real one on screen.
 */
export function parseRegister(raw: string | null | undefined): Register {
  if (!raw) return emptyRegister();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyRegister(), dropped: 1 };
  }

  if (!isRec(parsed)) return { ...emptyRegister(), dropped: 1 };
  if (!isInt(parsed.v) || parsed.v < 1) return { ...emptyRegister(), dropped: 1 };
  if (parsed.v > REGISTER_VERSION) return { ...emptyRegister(), foreign: true };
  if (!Array.isArray(parsed.joints)) return { ...emptyRegister(), dropped: 1 };

  const joints: Joint[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw2 of parsed.joints) {
    const j = validJoint(raw2);
    if (!j || seen.has(j.id)) {
      dropped += 1;
      continue;
    }
    seen.add(j.id);
    joints.push(j);
  }

  return { joints: sortJoints(joints), foreign: false, dropped };
}

// -------------------------------------------------------------- operations

/**
 * Live work first, most recently touched at the top; finished joints below it,
 * most recently finished first. The scratch joint never appears in a list, so
 * it is not special-cased here.
 */
export function sortJoints(joints: Joint[]): Joint[] {
  return joints.slice().sort((a, b) => {
    const ad = isDone(a) ? 1 : 0;
    const bd = isDone(b) ? 1 : 0;
    if (ad !== bd) return ad - bd;
    if (ad === 1) return (b.completedAt ?? 0) - (a.completedAt ?? 0) || a.id.localeCompare(b.id);
    return b.updatedAt - a.updatedAt || a.id.localeCompare(b.id);
  });
}

/**
 * Bring the register back under the cap.
 *
 * Finished joints go first, oldest finish first. If that is not enough, the
 * register is left over the cap: dropping a joint someone is part-way through
 * to make room for a new one would lose the only thing in here that cannot be
 * worked out again.
 */
export function pruneRegister(r: Register): Register {
  if (r.joints.length <= MAX_JOINTS) return r;

  const keep = r.joints.filter((j) => !isDone(j) || isScratch(j));
  const done = r.joints
    .filter((j) => isDone(j) && !isScratch(j))
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const room = Math.max(0, MAX_JOINTS - keep.length);
  return { ...r, joints: sortJoints([...keep, ...done.slice(0, room)]) };
}

export const getJoint = (r: Register, id: string): Joint | undefined => r.joints.find((j) => j.id === id);

/** Insert or replace a joint, then re-sort and prune. */
export function putJoint(r: Register, joint: Joint): Register {
  const without = r.joints.filter((j) => j.id !== joint.id);
  return pruneRegister({ ...r, joints: sortJoints([...without, joint]) });
}

export function removeJoint(r: Register, id: string): Register {
  return { ...r, joints: r.joints.filter((j) => j.id !== id) };
}

export type JointSpec = {
  tag?: string;
  note?: string;
  cls: JointClass;
  nps: number | null;
  bolts: number;
  torque?: number | null;
  project?: string;
  boltedBy?: string;
  method?: MethodId;
  gasket?: Gasket;
};

export function newJoint(id: string, spec: JointSpec, now: number): Joint {
  return {
    id,
    tag: spec.tag ?? '',
    note: spec.note ?? '',
    cls: spec.cls,
    nps: spec.nps,
    bolts: spec.bolts,
    gasket: spec.gasket ?? 'unknown',
    torque: spec.torque ?? null,
    state: startBoltUp(spec.bolts, spec.method ?? 'legacy'),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    checks: [],
    heats: [],
    project: cleanProject(spec.project),
    boltedBy: cleanPerson(spec.boltedBy),
    witnessedBy: '',
    wrench: '',
  };
}

/**
 * Write a worked state back onto a joint.
 *
 * `completedAt` is set from the state rather than passed in, so the flag and
 * the state can never disagree — which is the pair `validJoint` refuses to load.
 */
export function withState(joint: Joint, state: BoltUpState, now: number): Joint {
  const finished = isFinished(state);
  return {
    ...joint,
    state,
    updatedAt: now,
    completedAt: finished ? (joint.completedAt ?? now) : null,
    // Undo past the end reopens the bolt-up, and a re-torque check on a joint
    // that is being worked again is a check of something that no longer
    // exists. Keeping it would be a record of a joint nobody finished.
    checks: finished ? joint.checks : [],
  };
}

/**
 * Change the flange a joint is for. The bolt-up starts again, because a level
 * array for sixteen bolts means nothing on a flange with twelve.
 */
export function withFlange(joint: Joint, spec: JointSpec, now: number): Joint {
  const sameFlange = joint.bolts === spec.bolts && joint.cls === spec.cls && joint.nps === spec.nps;
  // The method carries over when the new flange allows it; otherwise the standard one.
  const id = methodBar(joint.state.method, spec.bolts, joint.gasket) === null ? joint.state.method : 'legacy';
  return {
    ...joint,
    cls: spec.cls,
    nps: spec.nps,
    bolts: spec.bolts,
    torque: spec.torque === undefined ? joint.torque : spec.torque,
    state: sameFlange ? joint.state : startBoltUp(spec.bolts, id),
    updatedAt: now,
    completedAt: sameFlange ? joint.completedAt : null,
    checks: sameFlange ? joint.checks : [],
  };
}

/**
 * Bolt the joint by another method. The bolt-up starts again, because the
 * rounds are different; the same method is a no-op.
 */
export function withMethod(joint: Joint, id: MethodId, now: number): Joint {
  if (id === joint.state.method) return joint;
  return { ...joint, state: stateWithMethod(joint.state, id), updatedAt: now, completedAt: null, checks: [] };
}

/** Record what is between the flanges. */
export const withGasket = (joint: Joint, gasket: Gasket, now: number): Joint => (gasket === joint.gasket ? joint : { ...joint, gasket, updatedAt: now });

/** The dwell PCC-1 asks for before the retightening round. */
export const RETIGHTEN_DWELL_MS = 4 * 60 * 60 * 1000;

/**
 * When the retightening round falls due: four hours after the joint closed,
 * for a finished joint that has not been retightened yet. Null otherwise.
 */
export function retightenDue(j: Joint): number | null {
  if (j.completedAt === null || j.checks.length) return null;
  return j.completedAt + RETIGHTEN_DWELL_MS;
}

/**
 * Record a re-torque check.
 *
 * Refused on a joint that is not finished: there is nothing to check again on
 * a bolt-up nobody has been through once. Past the cap the oldest check goes,
 * which on a flange that has been back fifty times is not the interesting one.
 */
export function addCheck(joint: Joint, check: Omit<ReCheck, 'at'>, now: number): Joint {
  if (!isDone(joint)) return joint;
  const torque = check.torque;
  const entry: ReCheck = {
    at: now,
    moved: check.moved,
    torque: torque !== null && Number.isFinite(torque) && torque > 0 ? torque : null,
    note: check.note,
  };
  const checks = [...joint.checks, entry].sort((a, b) => a.at - b.at);
  return { ...joint, checks: checks.slice(-MAX_CHECKS), updatedAt: now };
}

/** Take a check back off, by the time it was recorded. */
export function removeCheck(joint: Joint, at: number, now: number): Joint {
  const checks = joint.checks.filter((c) => c.at !== at);
  if (checks.length === joint.checks.length) return joint;
  return { ...joint, checks, updatedAt: now };
}

/** An id that is not already in the register, derived from a seed. */
export function freshId(r: Register, seed: string): string {
  const base = seed.replace(/[^a-zA-Z0-9]/g, '') || 'j';
  if (!getJoint(r, base) && base !== SCRATCH_ID) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!getJoint(r, id) && id !== SCRATCH_ID) return id;
  }
}

/**
 * How long ago something happened, at the resolution a shift cares about.
 *
 * Nobody reading a joint list wants a timestamp. They want to know whether
 * this is the joint they were on ten minutes ago or one from last week.
 */
export function sinceLabel(then: number, now: number): string {
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  const w = Math.round(d / 7);
  return w === 1 ? 'a week ago' : `${w} weeks ago`;
}

/** The flange in a line: size, class, bolt count and stud size where the table knows it. */
export function jointFlange(j: Joint): string {
  if (j.nps !== null && isCastIron(j.cls)) {
    const f = boltUp(j.nps, j.cls);
    if (f) return `${f.label} · class ${j.cls} cast iron · ${j.bolts} bolts`;
  }
  if (j.nps !== null && isSteelClass(j.cls)) {
    const f = steelFlange(j.nps, j.cls);
    if (f) return `${f.label} · class ${j.cls} · ${f.bolts} × ${studLabel(f.stud)} studs`;
  }
  return `${j.bolts} bolts · class ${j.cls}`;
}

/** The method the joint is bolted by, as it reads on a record. */
export const jointMethod = (j: Joint): string => method(j.state.method).name;

/** How far the bolt-up has got, in the words a foreman would use. */
export function jointProgress(j: Joint): string {
  if (isFinished(j.state)) {
    const last = lastCheck(j);
    if (!last) return 'Bolted up · not retightened';
    return last.moved ? 'Retightened · bolts took up' : 'Retightened · all tight';
  }
  const round = currentRound(j.state);
  if (boltUpProgress(j.state).done === 0) return 'Not started';
  if (isAsked(j.state)) return `${round?.label ?? ''} · did any nut turn?`;
  if (j.state.gapPending) return `${round?.label ?? ''} · gap check`;
  return `${round?.label ?? ''} · step ${j.state.step + 1} of ${round?.steps.length ?? 0}`;
}

/**
 * The names already used for a role on this phone, newest first, so the one
 * inspector who witnesses every joint on a job is one tap rather than a
 * spelling each time — and spelled the same on every record.
 */
export function recentNames(r: Register, role: 'boltedBy' | 'witnessedBy', max = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const j of r.joints.slice().sort((a, b) => b.updatedAt - a.updatedAt)) {
    const name = j[role].trim();
    const key = name.toUpperCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

/** Everything a list should show: the named joints, in order, scratch aside. */
export const listed = (r: Register): Joint[] => r.joints.filter((j) => !isScratch(j));
export const openJoints = (r: Register): Joint[] => listed(r).filter((j) => !isDone(j));
export const doneJoints = (r: Register): Joint[] => listed(r).filter(isDone);

/**
 * Finished joints that have not settled — never checked, or still taking up
 * the last time somebody looked. This is the list worth working from once the
 * line has been up to temperature.
 */
export const needsCheckJoints = (r: Register): Joint[] => listed(r).filter(needsCheck);

/** Finished, checked, and nothing moved the last time. */
export const settledJoints = (r: Register): Joint[] => listed(r).filter(isSettled);

/**
 * A joint with a heat recorded against it, or with one taken off.
 *
 * Spelling-insensitive on the way in, so a heat entered twice with different
 * dashes does not appear twice on one joint. `updatedAt` moves, because what
 * material went into a joint is part of the joint's record and a turnover
 * package is read by date.
 */
export function withHeat(joint: Joint, heat: string, now: number): Joint {
  const trimmed = heat.trim();
  const key = trimmed.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!key) return joint;
  if (joint.heats.some((h) => h.toUpperCase().replace(/[^0-9A-Z]/g, '') === key)) return joint;
  return { ...joint, heats: [...joint.heats, trimmed], updatedAt: now };
}

export function withoutHeat(joint: Joint, heat: string, now: number): Joint {
  const key = heat.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const heats = joint.heats.filter((h) => h.toUpperCase().replace(/[^0-9A-Z]/g, '') !== key);
  return heats.length === joint.heats.length ? joint : { ...joint, heats, updatedAt: now };
}
