import { referenceTorque, steelFlange, isSteelClass } from '../calc/steelFlange';
import { isLargeClass, largeFlange } from '../calc/largeFlange';
import { classNumber } from './register';
import { GASKETS, METHODS, isMethodId, methodBar, type Gasket, type MethodId } from '../calc/boltUpSequence';
import type { JointBolting, JointClass } from './register';

// The company's bolting spec
// --------------------------
// On a real job nobody picks the torque at the flange. The owner or the
// contractor issues a bolted-joint specification: the stud material and the
// stress it is pulled to, the lubricant and its nut factor, the gasket, the
// assembly method, the retightening dwell. Every joint on the job is bolted
// to it, and the record says so.
//
// This is that spec, entered once and inherited by every joint: the figures
// that set the torque (stud grade, target stress on the root area, nut
// factor and lubricant), the gasket and method that every joint starts with,
// and a rule per flange class where a class is bolted differently (class 900
// tensioned, say, or class 150 on soft sheet). A joint takes the spec's
// figures when it is made, and keeps a copy of them (register.ts
// JointBolting), so a spec revised later does not rewrite the record of what
// an earlier joint was bolted to.
//
// Kept as records, like the joint register, so a backup carries the spec from
// the QC phone to every phone on the crew by the ordinary restore, and each
// spec keeps its id across phones. A phone with one spec uses it; with more
// than one, it is told which.

export const SPEC_VERSION = 1;
export const MAX_SPECS = 20;
export const NAME_MAX = 60;
export const STUD_MAX = 30;
export const LUBE_MAX = 40;
export const NOTE_MAX = 400;

/** Target bolt stress on the root area, ksi: the bounds anything reasonable sits inside. */
export const STRESS_MIN = 5;
export const STRESS_MAX = 120;
/** Nut factor: below 0.08 only PTFE-coated studs tested wet; above 0.4 is dry thread, which no spec allows. */
export const K_MIN = 0.05;
export const K_MAX = 0.5;
export const DWELL_MAX_HOURS = 24 * 14;

export const CLASSES: readonly JointClass[] = ['150', '300', '600', '900', '1500', '2500', '125', '250'];
export const isJointClass = (v: unknown): v is JointClass => typeof v === 'string' && (CLASSES as readonly string[]).includes(v);

/** How a class is bolted when it is not bolted the spec's usual way. */
export type ClassRule = { method?: MethodId; gasket?: Gasket; stressKsi?: number };

export type BoltingSpec = {
  id: string;
  /** What the document is called: "BJ-01 Rev C", "ACME piping spec section 9". */
  name: string;
  /** Stud grade as it reads on the record: "ASTM A193 B7". */
  stud: string;
  /** Target bolt stress on the root area, ksi. */
  stressKsi: number;
  /** Nut factor K for the lubricant actually on the job. */
  nutFactor: number;
  /** The lubricant, by name, as it goes on the record. */
  lubricant: string;
  gasket: Gasket;
  method: MethodId;
  /** The dwell before the retightening round, hours; 0 when the spec does not ask for one. */
  retightenHours: number;
  byClass: Partial<Record<JointClass, ClassRule>>;
  /** Anything else the crew must know: "hydraulic torque above 1-1/8 in.", "no retorque on RTJ". */
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type SpecBook = {
  specs: BoltingSpec[];
  /** The spec joints are bolted to, by id, when there is more than one on the phone. */
  active: string | null;
  foreign: boolean;
  dropped: number;
};

export const emptySpecBook = (): SpecBook => ({ specs: [], active: null, foreign: false, dropped: 0 });

/** The figures PCC-1's own reference table is built on: B7 studs at 50 ksi, a moly-type lubricant at K 0.16. */
export const DEFAULT_STRESS_KSI = 50;
export const DEFAULT_K = 0.16;
export const DEFAULT_DWELL_HOURS = 4;

/** Stud grades as chips; the stress is the spec's, these only fill the name. */
export const STUD_GRADES: readonly { label: string; stud: string; words: string }[] = [
  { label: 'B7', stud: 'ASTM A193 B7', words: 'The usual carbon-steel stud. 50 ksi is the common owner figure, about 48% of yield through 2-1/2 in.' },
  { label: 'B16', stud: 'ASTM A193 B16', words: 'Chrome-moly-vanadium for hot service. The same stress as B7.' },
  { label: 'L7', stud: 'ASTM A320 L7', words: 'Low-temperature carbon steel. The same stress as B7.' },
  { label: 'B8 Cl.2', stud: 'ASTM A193 B8 Cl.2', words: 'Strain-hardened 304. Yield falls with diameter: set the stress your spec gives for the stud size.' },
  { label: 'B8M Cl.2', stud: 'ASTM A193 B8M Cl.2', words: 'Strain-hardened 316. Yield falls with diameter: set the stress your spec gives for the stud size.' },
];

/**
 * Nut factors by lubricant, the ranges PCC-1 Appendix J gives. A chip fills
 * the name and a K; the K the spec gives, tested for the lubricant on the
 * job, is the one that goes in the box.
 */
export const LUBRICANTS: readonly { id: string; label: string; lubricant: string; k: number }[] = [
  { id: 'moly', label: 'Moly paste · K 0.16', lubricant: 'Moly-based anti-seize', k: 0.16 },
  { id: 'nickel', label: 'Nickel or copper · K 0.18', lubricant: 'Nickel or copper anti-seize', k: 0.18 },
  { id: 'oil', label: 'Machine oil · K 0.20', lubricant: 'Machine oil', k: 0.2 },
];

export function newSpec(id: string, now: number): BoltingSpec {
  return {
    id,
    name: '',
    stud: STUD_GRADES[0]!.stud,
    stressKsi: DEFAULT_STRESS_KSI,
    nutFactor: DEFAULT_K,
    lubricant: LUBRICANTS[0]!.lubricant,
    gasket: 'unknown',
    method: 'legacy',
    retightenHours: DEFAULT_DWELL_HOURS,
    byClass: {},
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

/** An id a spec keeps across every phone it is restored onto: its name, slugged, and the moment it was made. */
export function specId(name: string, now: number): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'spec';
  return `${slug}-${now.toString(36)}`;
}

// ---------------------------------------------------------------- validation

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isGasket = (v: unknown): v is Gasket => GASKETS.some((g) => g.id === v);

const cleanStress = (v: unknown): number | null => (isNum(v) && v >= STRESS_MIN && v <= STRESS_MAX ? Math.round(v * 10) / 10 : null);
const cleanK = (v: unknown): number | null => (isNum(v) && v >= K_MIN && v <= K_MAX ? Math.round(v * 1000) / 1000 : null);

export function validRule(v: unknown): ClassRule | null {
  if (!isRec(v)) return null;
  const out: ClassRule = {};
  if (v.method !== undefined) {
    if (!isMethodId(v.method)) return null;
    out.method = v.method;
  }
  if (v.gasket !== undefined) {
    if (!isGasket(v.gasket)) return null;
    out.gasket = v.gasket;
  }
  if (v.stressKsi !== undefined) {
    const s = cleanStress(v.stressKsi);
    if (s === null) return null;
    out.stressKsi = s;
  }
  return out;
}

/** One spec, or null if anything about it does not hold up. */
export function validSpec(v: unknown): BoltingSpec | null {
  if (!isRec(v)) return null;
  const { id, name, stud, stressKsi, nutFactor, lubricant, gasket, method: m, retightenHours, byClass, note, createdAt, updatedAt } = v;
  if (!isStr(id) || id === '') return null;
  if (!isStr(name) || !isStr(stud) || !isStr(lubricant) || !isStr(note)) return null;
  const stress = cleanStress(stressKsi);
  const k = cleanK(nutFactor);
  if (stress === null || k === null) return null;
  if (!isGasket(gasket) || !isMethodId(m)) return null;
  if (!isNum(retightenHours) || retightenHours < 0 || retightenHours > DWELL_MAX_HOURS) return null;
  if (!Number.isInteger(createdAt) || (createdAt as number) < 0 || !Number.isInteger(updatedAt) || (updatedAt as number) < 0) return null;
  const rules: Partial<Record<JointClass, ClassRule>> = {};
  if (byClass !== undefined) {
    if (!isRec(byClass)) return null;
    for (const [cls, rule] of Object.entries(byClass)) {
      if (!isJointClass(cls)) continue;
      const r = validRule(rule);
      if (!r) return null;
      if (Object.keys(r).length) rules[cls] = r;
    }
  }
  return {
    id,
    name: name.slice(0, NAME_MAX),
    stud: stud.slice(0, STUD_MAX),
    stressKsi: stress,
    nutFactor: k,
    lubricant: lubricant.slice(0, LUBE_MAX),
    gasket,
    method: m,
    retightenHours: Math.round(retightenHours * 10) / 10,
    byClass: rules,
    note: note.slice(0, NOTE_MAX),
    createdAt: createdAt as number,
    updatedAt: updatedAt as number,
  };
}

/** Why a spec cannot be saved as entered, or null when it can. */
export function specProblem(s: BoltingSpec): string | null {
  if (!s.name.trim()) return 'Give the spec a name: the document and its revision.';
  if (!s.stud.trim()) return 'Say the stud grade: it goes on every record.';
  if (!(s.stressKsi >= STRESS_MIN && s.stressKsi <= STRESS_MAX)) return `Target stress runs ${STRESS_MIN} to ${STRESS_MAX} ksi.`;
  if (!(s.nutFactor >= K_MIN && s.nutFactor <= K_MAX)) return `Nut factor runs ${K_MIN} to ${K_MAX}. Dry threads are not a lubricant.`;
  if (!s.lubricant.trim()) return 'Name the lubricant: K means nothing without it.';
  if (!(s.retightenHours >= 0 && s.retightenHours <= DWELL_MAX_HOURS)) return 'The retightening dwell is in hours, 0 for none.';
  return null;
}

// ---------------------------------------------------------------- the book

export function serialiseSpecBook(b: SpecBook): string {
  return JSON.stringify({ v: SPEC_VERSION, specs: b.specs, active: b.active });
}

export function parseSpecBook(raw: string | null | undefined): SpecBook {
  if (!raw) return emptySpecBook();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptySpecBook(), dropped: 1 };
  }
  if (!isRec(parsed) || !Number.isInteger(parsed.v) || (parsed.v as number) < 1) return { ...emptySpecBook(), dropped: 1 };
  if ((parsed.v as number) > SPEC_VERSION) return { ...emptySpecBook(), foreign: true };
  if (!Array.isArray(parsed.specs)) return { ...emptySpecBook(), dropped: 1 };
  const specs: BoltingSpec[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw2 of parsed.specs) {
    const s = validSpec(raw2);
    if (!s || seen.has(s.id)) {
      dropped += 1;
      continue;
    }
    seen.add(s.id);
    specs.push(s);
  }
  const active = isStr(parsed.active) && seen.has(parsed.active) ? parsed.active : null;
  return { specs: sortSpecs(specs).slice(0, MAX_SPECS), active, foreign: false, dropped };
}

export const sortSpecs = (specs: BoltingSpec[]): BoltingSpec[] => specs.slice().sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));

export const getSpec = (b: SpecBook, id: string): BoltingSpec | undefined => b.specs.find((s) => s.id === id);

/** Save a spec, new or changed; the newest is kept when the book is full. */
export function putSpec(b: SpecBook, spec: BoltingSpec): SpecBook {
  const without = b.specs.filter((s) => s.id !== spec.id);
  const specs = sortSpecs([...without, spec]).slice(0, MAX_SPECS);
  return { ...b, specs, active: b.active && specs.some((s) => s.id === b.active) ? b.active : null };
}

export function removeSpec(b: SpecBook, id: string): SpecBook {
  const specs = b.specs.filter((s) => s.id !== id);
  return { ...b, specs, active: b.active === id ? null : b.active };
}

export const setActive = (b: SpecBook, id: string | null): SpecBook => ({ ...b, active: id !== null && getSpec(b, id) ? id : null });

/**
 * The spec joints are bolted to: the one chosen, or the only one there is. A
 * phone with two and no choice made has none, and the screen says so, rather
 * than guessing which company's figures to put on a record.
 */
export function activeSpec(b: SpecBook): BoltingSpec | null {
  if (b.active) return getSpec(b, b.active) ?? null;
  return b.specs.length === 1 ? (b.specs[0] as BoltingSpec) : null;
}

// ---------------------------------------------------------------- applying it

/** How a class is bolted: its own rule where it has one, else the spec's usual way. */
export function ruleFor(spec: BoltingSpec, cls: JointClass): Required<ClassRule> {
  // A B16.47 flange is bolted by its class number's rule: an A150 is a class 150.
  const r = spec.byClass[classNumber(cls) as JointClass] ?? {};
  return { method: r.method ?? spec.method, gasket: r.gasket ?? spec.gasket, stressKsi: r.stressKsi ?? spec.stressKsi };
}

/**
 * The method a flange is bolted by under the spec: the class's, where the
 * flange can take it; else the spec's usual one; else the Legacy pattern,
 * which every flange can take.
 */
export function methodFor(spec: BoltingSpec, cls: JointClass, bolts: number, gasket: Gasket): MethodId {
  for (const id of [ruleFor(spec, cls).method, spec.method]) if (methodBar(id, bolts, gasket) === null) return id;
  return 'legacy';
}

/**
 * The spec's torque for a steel flange's studs, foot-pounds, by the PCC-1
 * Appendix K formula on the root area at the class's target stress. Null
 * where there is no stud size to work from: a cast iron flange, or a bolt
 * count set by hand.
 */
export function targetTorque(spec: BoltingSpec, cls: JointClass, nps: number | null): number | null {
  if (nps === null) return null;
  const f = isSteelClass(cls) ? steelFlange(nps, cls) : isLargeClass(cls) ? largeFlange(nps, cls) : undefined;
  if (!f) return null;
  const tq = referenceTorque(f.stud, ruleFor(spec, cls).stressKsi * 1000, spec.nutFactor);
  return Number.isFinite(tq) ? Math.round(tq) : null;
}

/** What a new joint on this flange takes from the spec, and the copy of the spec it keeps. */
export function fromSpec(spec: BoltingSpec, cls: JointClass, nps: number | null, bolts: number, gasket?: Gasket): { method: MethodId; gasket: Gasket; torque: number | null; bolting: JointBolting } {
  const rule = ruleFor(spec, cls);
  const g = gasket && gasket !== 'unknown' ? gasket : rule.gasket;
  return {
    method: methodFor(spec, cls, bolts, g),
    gasket: g,
    torque: targetTorque(spec, cls, nps),
    bolting: { spec: spec.name.trim(), stud: spec.stud.trim(), stressKsi: rule.stressKsi, nutFactor: spec.nutFactor, lubricant: spec.lubricant.trim() },
  };
}

/** The spec's figures in one line, for a caption or a record: "BJ-01 Rev C · ASTM A193 B7 at 50 ksi · K 0.16, moly-based anti-seize". */
export function boltingLine(b: JointBolting): string {
  return `${b.spec} · ${b.stud} at ${b.stressKsi} ksi · K ${b.nutFactor}, ${b.lubricant}`;
}

/** The gasket's chip label. */
export const gasketLabel = (g: Gasket): string => GASKETS.find((x) => x.id === g)?.label ?? g;
/** The method's chip label. */
export const methodLabel = (m: MethodId): string => METHODS.find((x) => x.id === m)?.short ?? m;
