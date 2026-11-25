// The orbital book
// ----------------
// Four things kept on the phone, each a store of its own so a backup carries
// them to the crew like the WPS ranges:
//
//   gear       the power supplies, weld heads and modules on the job, each
//              filled in from its own manual: the app ships no maker's
//              figures, only the boxes each kind of equipment needs.
//   programs   the weld schedules: a tube, a head, the levels round it, the
//              gas, the tungsten. Development until a coupon passes and the
//              WPS is named; then Qualified, and locked. A change after that
//              is a new version, the old one kept beside it.
//   equations  the crew's own, and any built-in they have changed
//              (calc/orbitalEquations.ts).
//   runs       each coupon and production weld made off a program, with the
//              checks ticked, the oxygen read and how it came out.
//
// Sizes are inches, times seconds, angles degrees, flows ft³/h: tube for
// high-purity work is sized and welded in inches, and the equations take
// the same units, so nothing is ever converted on the way through.

import { validEquation, MAX_EQUATIONS, type Equation } from '../calc/orbitalEquations';

export const ORBITAL_VERSION = 1;
export const MAX_GEAR = 60;
export const MAX_PROGRAMS = 100;
export const MAX_RUNS = 500;
export const MAX_LEVELS = 12;
export const MAX_HISTORY = 10;
export const MAX_EXTRAS = 12;
export const TEXT_MAX = 40;
export const NOTE_MAX = 300;

// ------------------------------------------------------------ the gear

export type GearKind = 'supply' | 'head' | 'module';
export type Family = 'precision' | 'heavy' | 'closed' | 'open' | 'track' | 'specialty' | 'cooler' | 'switch' | 'avcosc' | 'camera' | 'other';
export type GearNum = 'ampsMax' | 'levelsMax' | 'odMin' | 'odMax' | 'rpmMax' | 'ipmMax' | 'constant' | 'clearance';
export type GearFlag = 'wire' | 'osc' | 'avc' | 'cooled';

export type Gear = {
  id: string;
  kind: GearKind;
  family: Family;
  make: string;
  model: string;
  serial: string;
  ampsMax: number | null;
  levelsMax: number | null;
  /** Tube OD range the head takes, in. */
  odMin: number | null;
  odMax: number | null;
  rpmMax: number | null;
  /** A track head's carriage: its fastest travel, in/min. */
  ipmMax: number | null;
  /** The electrode constant C: tungsten length = C − OD ÷ 2 − gap. */
  constant: number | null;
  /** The room round the tube the head needs, in. */
  clearance: number | null;
  wire: boolean;
  osc: boolean;
  avc: boolean;
  cooled: boolean;
  /** Calibration due, YYYY-MM-DD, or blank. */
  calDue: string;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type FamilyInfo = { id: Family; kind: GearKind; label: string; blurb: string; examples: string; nums: GearNum[]; flags: GearFlag[]; cal: boolean };

/** Each kind of equipment and the boxes it needs. The examples are only to say which is which. */
export const FAMILIES: readonly FamilyInfo[] = [
  { id: 'precision', kind: 'supply', label: 'Precision tube power supply', blurb: 'Lower amps for repeatable fusion welds on small tube, with stored weld schedules.', examples: 'AMI 207, 217, M217P, 317; Axxair SAXX-200/201', nums: ['ampsMax', 'levelsMax'], flags: [], cal: true },
  { id: 'heavy', kind: 'supply', label: 'Filler-wire / heavy pipe system', blurb: 'Higher output for wire feeders, multi-pass welds and heavier walls.', examples: 'AMI 227; Liburdi Dimetrics Gold Track VII, GT400, GT200; Polysoude P-series', nums: ['ampsMax', 'levelsMax'], flags: ['wire'], cal: true },
  { id: 'closed', kind: 'head', label: 'Closed (cartridge / chamber) head', blurb: 'Encloses the joint and floods it with gas: autogenous fusion welds on thin-wall tube.', examples: 'AMI Model 9 series; Axxair SATFX, Microfit; Swagelok series', nums: ['odMin', 'odMax', 'rpmMax', 'constant'], flags: ['cooled'], cal: false },
  { id: 'open', kind: 'head', label: 'Open head', blurb: 'Arc in view and in reach: thicker walls, bigger tube, filler wire, oscillation, AVC.', examples: 'Axxair SATO, OX; AMI Model 81; MWG open frame', nums: ['odMin', 'odMax', 'rpmMax', 'constant'], flags: ['wire', 'osc', 'avc', 'cooled'], cal: false },
  { id: 'track', kind: 'head', label: 'Track-mounted head', blurb: 'A guide ring or track on big pipe, vessels or flat work, and a carriage that travels it.', examples: 'Liburdi Dimetrics H, V, K, G; GSI T-Head; AMI Model 15', nums: ['odMin', 'ipmMax'], flags: ['wire', 'osc', 'avc', 'cooled'], cal: false },
  { id: 'specialty', kind: 'head', label: 'Specialty / low-clearance head', blurb: 'Tight radial or axial room, tube-to-tubesheet, odd geometry.', examples: 'AMI Model 8; Axxair SATP-80X; Liburdi Dimetrics specialty', nums: ['odMin', 'odMax', 'rpmMax', 'constant', 'clearance'], flags: ['wire', 'cooled'], cal: false },
  { id: 'cooler', kind: 'module', label: 'Water cooler', blurb: 'For high duty cycles and wire-fed heads.', examples: '', nums: [], flags: [], cal: false },
  { id: 'switch', kind: 'module', label: 'Switch box', blurb: 'Runs more than one head off a power supply, in turn.', examples: '', nums: [], flags: [], cal: false },
  { id: 'avcosc', kind: 'module', label: 'AVC / OSC unit', blurb: 'Arc voltage control and torch oscillation.', examples: '', nums: [], flags: [], cal: false },
  { id: 'camera', kind: 'module', label: 'Camera / monitoring', blurb: 'Watching the arc and recording the weld.', examples: '', nums: [], flags: [], cal: true },
  { id: 'other', kind: 'module', label: 'Other module', blurb: 'Anything else the setup runs on.', examples: '', nums: [], flags: [], cal: true },
];

export const familyOf = (id: Family): FamilyInfo => FAMILIES.find((f) => f.id === id) ?? FAMILIES[FAMILIES.length - 1]!;
export const familiesOf = (kind: GearKind): FamilyInfo[] => FAMILIES.filter((f) => f.kind === kind);

export const GEAR_NUM: Record<GearNum, { label: string; unit: string; whole?: boolean }> = {
  ampsMax: { label: 'Most amps', unit: 'A' },
  levelsMax: { label: 'Levels it holds', unit: '', whole: true },
  odMin: { label: 'Smallest OD', unit: 'in' },
  odMax: { label: 'Largest OD', unit: 'in' },
  rpmMax: { label: 'Fastest rotor', unit: 'RPM' },
  ipmMax: { label: 'Fastest carriage', unit: 'in/min' },
  constant: { label: 'Electrode constant C', unit: 'in' },
  clearance: { label: 'Room it needs', unit: 'in' },
};
export const GEAR_FLAG: Record<GearFlag, string> = { wire: 'Filler wire', osc: 'Oscillation', avc: 'AVC', cooled: 'Water cooled' };
export const KIND_LABEL: Record<GearKind, string> = { supply: 'Power supplies', head: 'Weld heads', module: 'Modules' };

export function newGear(family: Family, now: number): Gear {
  const f = familyOf(family);
  return { id: 'new', kind: f.kind, family, make: '', model: '', serial: '', ampsMax: null, levelsMax: null, odMin: null, odMax: null, rpmMax: null, ipmMax: null, constant: null, clearance: null, wire: false, osc: false, avc: false, cooled: false, calDue: '', note: '', createdAt: now, updatedAt: now };
}

/** "AMI Model 9 · SN 1234", or the kind when nothing is filled in. */
export const gearName = (g: Gear): string => [g.make, g.model].map((s) => s.trim()).filter(Boolean).join(' ') || familyOf(g.family).label;

export function gearProblem(g: Gear): string | null {
  if (!g.make.trim() && !g.model.trim()) return 'Put in the make or the model, so the crew knows which one it is.';
  if (g.odMin !== null && g.odMax !== null && g.odMin > g.odMax) return 'The smallest OD is bigger than the largest.';
  if (g.calDue && !/^\d{4}-\d{2}-\d{2}$/.test(g.calDue)) return 'Calibration due is a date: 2026-12-31.';
  return null;
}

// ------------------------------------------------------------ programs

export type Level = { deg: number; rpm: number; ip: number; ib: number; tp: number; tb: number };
export type Extra = { key: string; label: string; value: number };
export type ProgramStatus = 'dev' | 'qualified';

export type ProgramBody = {
  id: string;
  name: string;
  material: string;
  od: number | null;
  wall: number | null;
  supplyId: string | null;
  headId: string | null;
  tungsten: { dia: number | null; kind: string; gap: number | null };
  gas: { shield: string; shieldCfh: number | null; purge: string; purgeCfh: number | null; o2Max: number | null };
  /** Seconds: gas before the arc, the ramp up, the head standing still once lit, the ramp down, gas after. */
  seq: { prepurge: number | null; upslope: number | null; delay: number | null; downslope: number | null; postpurge: number | null };
  /** Degrees past the start the last level runs on to, to tie in. */
  overlap: number | null;
  /** Arc volts read off the supply, for the heat input. */
  volts: number | null;
  levels: Level[];
  /** Figures of the program's own that the crew's equations ask for: a factor, a length. */
  extras: Extra[];
  status: ProgramStatus;
  wps: string;
  coupon: string;
  version: number;
  qualifiedAt: number | null;
  note: string;
  createdAt: number;
  updatedAt: number;
};
export type Program = ProgramBody & { history: ProgramBody[] };

export const MATERIALS = ['316L', '304L', 'AL-6XN', 'C-22', 'Ti Gr 2', 'Other'] as const;

export function newProgram(now: number): Program {
  return {
    id: 'new',
    name: '',
    material: '316L',
    od: null,
    wall: null,
    supplyId: null,
    headId: null,
    tungsten: { dia: null, kind: '2% ceriated', gap: null },
    gas: { shield: 'Argon', shieldCfh: null, purge: 'Argon', purgeCfh: null, o2Max: null },
    seq: { prepurge: null, upslope: null, delay: null, downslope: null, postpurge: null },
    overlap: null,
    volts: null,
    levels: [
      { deg: 90, rpm: 0, ip: 0, ib: 0, tp: 0.1, tb: 0.1 },
      { deg: 90, rpm: 0, ip: 0, ib: 0, tp: 0.1, tb: 0.1 },
      { deg: 90, rpm: 0, ip: 0, ib: 0, tp: 0.1, tb: 0.1 },
      { deg: 90, rpm: 0, ip: 0, ib: 0, tp: 0.1, tb: 0.1 },
    ],
    extras: [],
    status: 'dev',
    wps: '',
    coupon: '',
    version: 1,
    qualifiedAt: null,
    note: '',
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

export const idFor = (prefix: string, name: string, now: number): string => {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || prefix;
  return `${prefix}-${slug}-${now.toString(36)}`;
};

/** "316L 0.500 × 0.065", what a program is for. */
export const tubeLabel = (p: Pick<ProgramBody, 'material' | 'od' | 'wall'>): string =>
  [p.material, p.od !== null ? `${p.od.toFixed(3)}${p.wall !== null ? ` × ${p.wall.toFixed(3)}` : ''}` : ''].filter(Boolean).join(' ');

/** Why a program cannot be saved as it stands, or null. A program in development may be part filled; the tube and the levels must hold together. */
export function programProblem(p: ProgramBody): string | null {
  if (!p.name.trim()) return 'Give the program a name, the way it is stored on the power supply.';
  if (p.od !== null && p.od <= 0) return 'The OD is more than zero.';
  if (p.wall !== null && p.wall <= 0) return 'The wall is more than zero.';
  if (p.od !== null && p.wall !== null && p.wall * 2 >= p.od) return 'The wall is too thick for the OD: twice the wall is the whole tube.';
  if (!p.levels.length) return 'A program has at least one level.';
  if (p.levels.length > MAX_LEVELS) return `${MAX_LEVELS} levels at most.`;
  for (const [n, l] of p.levels.entries()) {
    const at = `Level ${n + 1}`;
    if (!(l.deg > 0)) return `${at}: its degrees are more than zero.`;
    if (l.ib > l.ip && l.ip > 0) return `${at}: the background current is above the peak.`;
    if (l.ib < l.ip && l.ip > 0 && (!(l.tp > 0) || !(l.tb > 0))) return `${at}: a pulsed level needs its time at peak and at background.`;
  }
  for (const x of p.extras) if (!/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(x.key)) return `${x.key || 'A figure'}: a name starts with a letter, 16 characters at most.`;
  return null;
}

/** What has to be true before a program is called qualified. */
export function qualifyProblem(p: ProgramBody): string | null {
  const base = programProblem(p);
  if (base) return base;
  if (p.od === null || p.wall === null) return 'Put in the tube OD and wall.';
  for (const [n, l] of p.levels.entries()) if (!(l.rpm > 0) || !(l.ip > 0)) return `Level ${n + 1}: its rotor speed and current.`;
  if (!p.headId) return 'Choose the weld head it was qualified on.';
  if (!p.wps.trim()) return 'Name the WPS it is qualified to.';
  if (!p.coupon.trim()) return 'Name the coupon that passed: its number or the date it was welded.';
  return null;
}

const bodyOf = (p: Program): ProgramBody => {
  const { history: _h, ...body } = p;
  void _h;
  return body;
};

export function qualify(p: Program, now: number): Program {
  return { ...p, status: 'qualified', qualifiedAt: now, updatedAt: now };
}

/** A qualified program opened for a change: the qualified one kept in its history, this one a new version in development. */
export function revise(p: Program, now: number): Program {
  const history = [bodyOf(p), ...p.history].slice(0, MAX_HISTORY);
  return { ...p, history, status: 'dev', version: p.version + 1, qualifiedAt: null, coupon: '', updatedAt: now };
}

/** A program copied to start another from: development, version 1, no history. */
export function copyProgram(p: Program, now: number): Program {
  return { ...p, id: 'new', name: `${p.name} copy`.slice(0, TEXT_MAX), status: 'dev', version: 1, qualifiedAt: null, coupon: '', history: [], createdAt: now, updatedAt: now };
}

// ------------------------------------------------------------ runs

export type RunKind = 'coupon' | 'production';
export type Run = {
  id: string;
  programId: string;
  programName: string;
  version: number;
  kind: RunKind;
  project: string;
  line: string;
  weld: string;
  heatA: string;
  heatB: string;
  operator: string;
  /** Oxygen read at the purge outlet before striking, ppm. */
  o2: number | null;
  /** Purge length and volume changes, for the purge time. */
  purgeLen: number | null;
  changes: number | null;
  checks: string[];
  result: 'pass' | 'fail' | null;
  faults: string[];
  note: string;
  at: number;
};

export function newRun(p: Program, kind: RunKind, now: number): Run {
  return { id: 'new', programId: p.id, programName: p.name, version: p.version, kind, project: '', line: '', weld: '', heatA: '', heatB: '', operator: '', o2: null, purgeLen: null, changes: null, checks: [], result: null, faults: [], note: '', at: now };
}

// ------------------------------------------------------------ keeping them

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isTime = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
/** A figure that may be blank: null, or a finite number not below zero. */
const opt = (v: unknown): number | null | undefined => (v === null || v === undefined ? null : typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);
const text = (v: unknown, max = TEXT_MAX): string | undefined => (isStr(v) ? v.slice(0, max) : undefined);

const FAMILY_IDS = FAMILIES.map((f) => f.id);
const NUMS: GearNum[] = ['ampsMax', 'levelsMax', 'odMin', 'odMax', 'rpmMax', 'ipmMax', 'constant', 'clearance'];
const FLAGS: GearFlag[] = ['wire', 'osc', 'avc', 'cooled'];

export function validGear(v: unknown): Gear | null {
  if (!isRec(v) || !isStr(v.id) || !v.id || !FAMILY_IDS.includes(v.family as Family)) return null;
  const f = familyOf(v.family as Family);
  if (v.kind !== f.kind || !isTime(v.createdAt) || !isTime(v.updatedAt)) return null;
  const out: Record<string, unknown> = { id: v.id, kind: f.kind, family: f.id, createdAt: v.createdAt, updatedAt: v.updatedAt };
  for (const k of ['make', 'model', 'serial'] as const) {
    const s = text(v[k]);
    if (s === undefined) return null;
    out[k] = s;
  }
  for (const k of NUMS) {
    const n = opt(v[k]);
    if (n === undefined) return null;
    out[k] = n;
  }
  for (const k of FLAGS) out[k] = v[k] === true;
  const note = text(v.note, NOTE_MAX);
  if (note === undefined || !isStr(v.calDue) || (v.calDue && !/^\d{4}-\d{2}-\d{2}$/.test(v.calDue))) return null;
  out.note = note;
  out.calDue = v.calDue;
  const g = out as Gear;
  return gearProblem(g) ? null : g;
}

function validLevel(v: unknown): Level | null {
  if (!isRec(v)) return null;
  const l: Partial<Level> = {};
  for (const k of ['deg', 'rpm', 'ip', 'ib', 'tp', 'tb'] as const) {
    const n = opt(v[k]);
    if (n === undefined || n === null) return null;
    l[k] = n;
  }
  return l as Level;
}

function validBody(v: unknown): ProgramBody | null {
  if (!isRec(v) || !isStr(v.id) || !v.id || !isTime(v.createdAt) || !isTime(v.updatedAt)) return null;
  const name = text(v.name);
  const material = text(v.material, 20);
  const wps = text(v.wps);
  const coupon = text(v.coupon);
  const note = text(v.note, NOTE_MAX);
  if (name === undefined || material === undefined || wps === undefined || coupon === undefined || note === undefined) return null;
  const od = opt(v.od);
  const wall = opt(v.wall);
  const overlap = opt(v.overlap);
  const volts = opt(v.volts);
  if (od === undefined || wall === undefined || overlap === undefined || volts === undefined) return null;
  const supplyId = v.supplyId === null || isStr(v.supplyId) ? (v.supplyId as string | null) : undefined;
  const headId = v.headId === null || isStr(v.headId) ? (v.headId as string | null) : undefined;
  if (supplyId === undefined || headId === undefined) return null;
  if (!isRec(v.tungsten) || !isRec(v.gas) || !isRec(v.seq)) return null;
  const tDia = opt(v.tungsten.dia);
  const tGap = opt(v.tungsten.gap);
  const tKind = text(v.tungsten.kind);
  if (tDia === undefined || tGap === undefined || tKind === undefined) return null;
  const shield = text(v.gas.shield);
  const purge = text(v.gas.purge);
  const shieldCfh = opt(v.gas.shieldCfh);
  const purgeCfh = opt(v.gas.purgeCfh);
  const o2Max = opt(v.gas.o2Max);
  if (shield === undefined || purge === undefined || shieldCfh === undefined || purgeCfh === undefined || o2Max === undefined) return null;
  const seq: Record<string, number | null> = {};
  for (const k of ['prepurge', 'upslope', 'delay', 'downslope', 'postpurge'] as const) {
    const n = opt(v.seq[k]);
    if (n === undefined) return null;
    seq[k] = n;
  }
  if (!Array.isArray(v.levels) || !Array.isArray(v.extras)) return null;
  const levels: Level[] = [];
  for (const x of v.levels) {
    const l = validLevel(x);
    if (!l) return null;
    levels.push(l);
  }
  const extras: Extra[] = [];
  for (const x of v.extras.slice(0, MAX_EXTRAS)) {
    if (!isRec(x) || !isStr(x.key) || !isStr(x.label) || typeof x.value !== 'number' || !Number.isFinite(x.value)) return null;
    extras.push({ key: x.key, label: x.label.slice(0, TEXT_MAX), value: x.value });
  }
  if (v.status !== 'dev' && v.status !== 'qualified') return null;
  if (!Number.isInteger(v.version) || (v.version as number) < 1) return null;
  if (v.qualifiedAt !== null && !isTime(v.qualifiedAt)) return null;
  const body: ProgramBody = {
    id: v.id,
    name,
    material,
    od,
    wall,
    supplyId,
    headId,
    tungsten: { dia: tDia, kind: tKind, gap: tGap },
    gas: { shield, shieldCfh, purge, purgeCfh, o2Max },
    seq: seq as ProgramBody['seq'],
    overlap,
    volts,
    levels,
    extras,
    status: v.status,
    wps,
    coupon,
    version: v.version as number,
    qualifiedAt: v.qualifiedAt as number | null,
    note,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
  return programProblem(body) ? null : body;
}

export function validProgram(v: unknown): Program | null {
  const body = validBody(v);
  if (!body || !isRec(v) || !Array.isArray(v.history)) return null;
  const history: ProgramBody[] = [];
  for (const h of v.history.slice(0, MAX_HISTORY)) {
    const b = validBody(h);
    if (b) history.push(b);
  }
  return { ...body, history };
}

export function validRun(v: unknown): Run | null {
  if (!isRec(v) || !isStr(v.id) || !v.id || !isStr(v.programId) || !isTime(v.at)) return null;
  if (v.kind !== 'coupon' && v.kind !== 'production') return null;
  if (!Number.isInteger(v.version) || (v.version as number) < 1) return null;
  const out: Record<string, unknown> = { id: v.id, programId: v.programId, kind: v.kind, version: v.version, at: v.at };
  for (const k of ['programName', 'project', 'line', 'weld', 'heatA', 'heatB', 'operator'] as const) {
    const s = text(v[k]);
    if (s === undefined) return null;
    out[k] = s;
  }
  for (const k of ['o2', 'purgeLen', 'changes'] as const) {
    const n = opt(v[k]);
    if (n === undefined) return null;
    out[k] = n;
  }
  if (!Array.isArray(v.checks) || !v.checks.every(isStr) || !Array.isArray(v.faults) || !v.faults.every(isStr)) return null;
  if (v.result !== null && v.result !== 'pass' && v.result !== 'fail') return null;
  const note = text(v.note, NOTE_MAX);
  if (note === undefined) return null;
  return { ...(out as Omit<Run, 'checks' | 'faults' | 'result' | 'note'>), checks: (v.checks as string[]).slice(0, 40), faults: (v.faults as string[]).slice(0, 20), result: v.result as Run['result'], note };
}

/** One store's records, read with the shared rules: a newer app's store is left alone, a bad record is counted and dropped, an id seen twice is kept once. */
function parseStore<T>(raw: string | null | undefined, field: string, valid: (v: unknown) => T | null, idOf: (x: T) => string, max: number) {
  const empty = { items: [] as T[], foreign: false, dropped: 0 };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...empty, dropped: 1 };
  }
  if (!isRec(parsed) || !Number.isInteger(parsed.v) || (parsed.v as number) < 1 || !Array.isArray(parsed[field])) return { ...empty, dropped: 1 };
  if ((parsed.v as number) > ORBITAL_VERSION) return { ...empty, foreign: true };
  const items: T[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const x of parsed[field] as unknown[]) {
    const r = valid(x);
    if (!r || seen.has(idOf(r))) {
      dropped += 1;
      continue;
    }
    seen.add(idOf(r));
    items.push(r);
  }
  return { items: items.slice(0, max), foreign: false, dropped };
}

export type GearBook = { gear: Gear[]; foreign: boolean; dropped: number };
export type ProgramBook = { programs: Program[]; foreign: boolean; dropped: number };
export type EquationBook = { equations: Equation[]; foreign: boolean; dropped: number };
export type RunBook = { runs: Run[]; foreign: boolean; dropped: number };

export const emptyGear = (): GearBook => ({ gear: [], foreign: false, dropped: 0 });
export const emptyPrograms = (): ProgramBook => ({ programs: [], foreign: false, dropped: 0 });
export const emptyEquations = (): EquationBook => ({ equations: [], foreign: false, dropped: 0 });
export const emptyRuns = (): RunBook => ({ runs: [], foreign: false, dropped: 0 });

const byName = <T extends { id: string }>(xs: T[], name: (x: T) => string): T[] => xs.slice().sort((a, b) => name(a).localeCompare(name(b), undefined, { numeric: true }) || a.id.localeCompare(b.id));
const sortGear = (gs: Gear[]) => byName(gs, (g) => `${g.kind}|${gearName(g)}`);
const sortPrograms = (ps: Program[]) => byName(ps, (p) => p.name);
const sortRuns = (rs: Run[]) => rs.slice().sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));

export function parseGear(raw: string | null | undefined): GearBook {
  const s = parseStore(raw, 'gear', validGear, (g) => g.id, MAX_GEAR);
  return { gear: sortGear(s.items), foreign: s.foreign, dropped: s.dropped };
}
export function parsePrograms(raw: string | null | undefined): ProgramBook {
  const s = parseStore(raw, 'programs', validProgram, (p) => p.id, MAX_PROGRAMS);
  return { programs: sortPrograms(s.items), foreign: s.foreign, dropped: s.dropped };
}
export function parseEquations(raw: string | null | undefined): EquationBook {
  const s = parseStore(raw, 'equations', validEquation, (e) => e.id, MAX_EQUATIONS);
  return { equations: s.items, foreign: s.foreign, dropped: s.dropped };
}
export function parseRuns(raw: string | null | undefined): RunBook {
  const s = parseStore(raw, 'runs', validRun, (r) => r.id, MAX_RUNS);
  return { runs: sortRuns(s.items), foreign: s.foreign, dropped: s.dropped };
}

export const serialiseGear = (b: GearBook): string => JSON.stringify({ v: ORBITAL_VERSION, gear: b.gear });
export const serialisePrograms = (b: ProgramBook): string => JSON.stringify({ v: ORBITAL_VERSION, programs: b.programs });
export const serialiseEquations = (b: EquationBook): string => JSON.stringify({ v: ORBITAL_VERSION, equations: b.equations });
export const serialiseRuns = (b: RunBook): string => JSON.stringify({ v: ORBITAL_VERSION, runs: b.runs });

// ------------------------------------------------------------ changing them

export function putGear(b: GearBook, g: Gear): { book: GearBook; ok: boolean } {
  const known = b.gear.some((x) => x.id === g.id);
  if (!known && b.gear.length >= MAX_GEAR) return { book: b, ok: false };
  return { book: { ...b, gear: sortGear([...b.gear.filter((x) => x.id !== g.id), g]) }, ok: true };
}
export const removeGear = (b: GearBook, id: string): GearBook => ({ ...b, gear: b.gear.filter((g) => g.id !== id) });

export function putProgram(b: ProgramBook, p: Program): { book: ProgramBook; ok: boolean } {
  const known = b.programs.some((x) => x.id === p.id);
  if (!known && b.programs.length >= MAX_PROGRAMS) return { book: b, ok: false };
  return { book: { ...b, programs: sortPrograms([...b.programs.filter((x) => x.id !== p.id), p]) }, ok: true };
}
export const removeProgram = (b: ProgramBook, id: string): ProgramBook => ({ ...b, programs: b.programs.filter((p) => p.id !== id) });

export function putEquation(b: EquationBook, e: Equation): { book: EquationBook; ok: boolean } {
  const known = b.equations.some((x) => x.id === e.id);
  if (!known && b.equations.length >= MAX_EQUATIONS) return { book: b, ok: false };
  return { book: { ...b, equations: [...b.equations.filter((x) => x.id !== e.id), e] }, ok: true };
}
/** An own equation deleted, or a built-in put back as it shipped. */
export const removeEquation = (b: EquationBook, id: string): EquationBook => ({ ...b, equations: b.equations.filter((e) => e.id !== id) });

/** A run saved; the oldest go once the book is full. */
export const putRun = (b: RunBook, r: Run): RunBook => ({ ...b, runs: sortRuns([...b.runs.filter((x) => x.id !== r.id), r]).slice(0, MAX_RUNS) });
export const removeRun = (b: RunBook, id: string): RunBook => ({ ...b, runs: b.runs.filter((r) => r.id !== id) });
