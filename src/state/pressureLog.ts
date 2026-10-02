// The pressure test log
// ---------------------
// A hydro or a pneumatic test is the last thing between a line and service,
// and the paper it leaves is what QC signs and the owner keeps. ASME B31.3
// asks for a record of every test — the date, the system, the test fluid, the
// pressure, and the examiner's word on the result — and every job asks for
// more: the gauges and when they were calibrated, the relief valve, the
// readings through the hold, the boundary drawn on the isos, and who signed.
//
// So this keeps one record per test. A test that fails is never edited into a
// pass: it stays failed, and the retest is a record of its own, numbered, so
// a package shows every attempt.
//
// Everything here is pure; pressureTests.tsx binds it to the shared store.

import { dayKey, isDay } from '../calc/days';
import { cleanSig, hasSig } from '../calc/signature';
import { cleanName, cleanNum, cleanText, cleanTime, isInt, isNum, isRec } from './clean';
import { cleanProject, sameProject } from './project';

/** Bumped only when the stored shape changes in a way an older app would misread. */
export const PRESSURE_VERSION = 1;

/**
 * Records kept. The log is one stored value and Android will not read one back
 * past a couple of megabytes, so it is capped — and at the cap a new test is
 * refused rather than an old one dropped, because a test record is not a thing
 * to lose quietly. A package that is turned over is shared as a PDF and then
 * deleted.
 */
export const MAX_TESTS = 300;
export const MAX_GAUGES = 4;
export const MAX_READINGS = 60;
/** Isos drawn on the phone that show the test boundary. */
export const MAX_ISOS = 12;
export const NAME_MAX = 60;
/** The lines, isos and system a test covers. */
export const SYSTEM_MAX = 400;
export const TEXT_MAX = 1000;
const PSI_MAX = 20000;
const GAUGE_MAX = 40000;
const TEMP_MIN = -325;
const TEMP_MAX = 1500;
/** A required hold, in minutes. A pipeline test runs a day; nothing on a job runs three. */
const HOLD_MAX = 72 * 60;
const ATTEMPT_MAX = 99;

export type TestKind = 'hydro' | 'pneumatic';
/** The code the test is run to, or the job's own spec when it is neither. */
export type TestCode = 'B31.3' | 'B31.1' | 'spec';
export type TestResult = 'pass' | 'fail' | 'open';

export const KINDS: readonly TestKind[] = ['hydro', 'pneumatic'];
export const CODES: readonly TestCode[] = ['B31.3', 'B31.1', 'spec'];
export const RESULTS: readonly TestResult[] = ['pass', 'fail', 'open'];

export const KIND_LABEL: Record<TestKind, string> = { hydro: 'Hydrostatic', pneumatic: 'Pneumatic' };
export const CODE_LABEL: Record<TestCode, string> = { 'B31.3': 'ASME B31.3', 'B31.1': 'ASME B31.1', spec: 'Job spec' };
export const RESULT_LABEL: Record<TestResult, string> = { pass: 'Passed', fail: 'Failed', open: 'Open' };

export type Gauge = {
  /** Its tag or serial number. */
  id: string;
  /** Full scale, psi. */
  range: number | null;
  /** Calibration due, YYYY-MM-DD, or ''. */
  calDue: string;
};

export type GaugeReading = { at: number; psi: number };

export type Hold = {
  /** When test pressure was reached and the hold began. */
  startAt: number | null;
  startPsi: number | null;
  /** When the hold ended. */
  endAt: number | null;
  endPsi: number | null;
};

export type Role = 'tester' | 'examiner' | 'witness';
export const ROLES: readonly Role[] = ['tester', 'examiner', 'witness'];
export const ROLE_LABEL: Record<Role, string> = { tester: 'Tested by', examiner: 'Examined by (QC)', witness: 'Witnessed by' };

export type Signer = {
  name: string;
  /** The signature, drawn on the phone. See calc/signature.ts. '' until signed. */
  sig: string;
  signedAt: number | null;
};

export type StepId =
  | 'boundary'
  | 'exposed'
  | 'isolated'
  | 'restrained'
  | 'supported'
  | 'vented'
  | 'gauges'
  | 'relief'
  | 'barricaded'
  | 'prelim'
  | 'released'
  | 'drained'
  | 'reinstated';

export type Step = { id: StepId; when: 'before' | 'after'; only?: TestKind; text: string };

/** The walk-down: what is checked before pressure goes on, and after it comes off. */
export const STEPS: readonly Step[] = [
  { id: 'boundary', when: 'before', text: 'Test boundary marked on the isos; every blind and spade tagged' },
  { id: 'exposed', when: 'before', text: 'Welds and joints bare to look at: not painted, insulated or buried' },
  { id: 'isolated', when: 'before', text: 'Equipment and instruments not in the test isolated, removed or blinded' },
  { id: 'restrained', when: 'before', text: 'Expansion joints restrained; spring hangers pinned' },
  { id: 'supported', when: 'before', only: 'hydro', text: 'Temporary supports where the weight of the water needs them' },
  { id: 'vented', when: 'before', only: 'hydro', text: 'Filled from the low point and vented at the high points; no air left in' },
  { id: 'gauges', when: 'before', text: 'Gauges in calibration and fitted where they read the test' },
  { id: 'relief', when: 'before', text: 'Relief valve fitted and set' },
  { id: 'barricaded', when: 'before', only: 'pneumatic', text: 'Area barricaded and cleared; everyone told before pressure goes on' },
  { id: 'prelim', when: 'before', only: 'pneumatic', text: 'Preliminary check made at low pressure, then up in steps' },
  { id: 'released', when: 'after', text: 'Pressure let down slowly and vented' },
  { id: 'drained', when: 'after', only: 'hydro', text: 'Drained from the low points with the vents open' },
  { id: 'reinstated', when: 'after', text: 'Test blinds and temporary supports out; system put back as drawn' },
];

export const stepsFor = (kind: TestKind): Step[] => STEPS.filter((s) => !s.only || s.only === kind);

export type PressureTest = {
  id: string;
  /** The job it is for; '' for none. See project.ts. */
  project: string;
  /** The day of the test, local, YYYY-MM-DD. */
  day: string;
  /** The test package or test number it is called out by. */
  pkg: string;
  /** 1 for the first test of a package, 2 for its first retest, and so on. */
  attempt: number;
  /** What is in the test: the system, the line numbers, the iso sheets. */
  system: string;
  code: TestCode;
  kind: TestKind;
  /** Water, air, nitrogen — whatever is in the pipe. */
  medium: string;
  designPsi: number | null;
  /** °F. */
  designTemp: number | null;
  /** The test pressure from the test package, psi. */
  testPsi: number | null;
  /** The temperature of the metal or the test fluid during the test, °F. */
  testTemp: number | null;
  /** The hold the job asks for, minutes; null when it is the code's. */
  holdReq: number | null;
  gauges: Gauge[];
  reliefTag: string;
  reliefPsi: number | null;
  hold: Hold;
  /** Gauge readings taken through the hold, oldest first. */
  readings: GaugeReading[];
  /** Walk-down steps ticked. */
  steps: StepId[];
  result: TestResult;
  /** Where it leaked, or what else was found. */
  leaks: string;
  notes: string;
  people: Record<Role, Signer>;
  /** Saved iso sketches that show the boundary, by id. */
  isos: string[];
  createdAt: number;
  updatedAt: number;
};

export type PressureLog = {
  tests: PressureTest[];
  /** The store was written by a newer app; nothing is written this session. */
  foreign: boolean;
  /** Records that failed to load. Counted, never repaired. */
  dropped: number;
};

export const emptyPressureLog = (): PressureLog => ({ tests: [], foreign: false, dropped: 0 });

const noHold = (): Hold => ({ startAt: null, startPsi: null, endAt: null, endPsi: null });
const unsigned = (name = ''): Signer => ({ name, sig: '', signedAt: null });

// ------------------------------------------------------------ validation

const psi = (v: unknown) => cleanNum(v, PSI_MAX);
const temp = (v: unknown) => cleanNum(v, TEMP_MAX, { min: TEMP_MIN });

function oneOf<T extends string>(v: unknown, all: readonly T[], fallback: T): T {
  return all.includes(v as T) ? (v as T) : fallback;
}

function cleanGauges(v: unknown): Gauge[] {
  if (!Array.isArray(v)) return [];
  const out: Gauge[] = [];
  for (const g of v) {
    if (!isRec(g)) continue;
    const gauge = { id: cleanName(g.id, NAME_MAX), range: cleanNum(g.range, GAUGE_MAX), calDue: isDay(g.calDue) ? g.calDue : '' };
    if (gauge.id || gauge.range !== null || gauge.calDue) out.push(gauge);
  }
  return out.slice(0, MAX_GAUGES);
}

function cleanHold(v: unknown): Hold {
  if (!isRec(v)) return noHold();
  const startAt = cleanTime(v.startAt);
  // An end with no start, or before it, is not a hold.
  const endAt = startAt !== null ? cleanTime(v.endAt) : null;
  const ended = endAt !== null && endAt >= (startAt as number);
  return {
    startAt,
    startPsi: startAt !== null ? psi(v.startPsi) : null,
    endAt: ended ? endAt : null,
    endPsi: ended ? psi(v.endPsi) : null,
  };
}

function cleanReadings(v: unknown): GaugeReading[] {
  if (!Array.isArray(v)) return [];
  const out: GaugeReading[] = [];
  for (const r of v) {
    if (!isRec(r)) continue;
    const at = cleanTime(r.at);
    const p = psi(r.psi);
    if (at !== null && p !== null) out.push({ at, psi: p });
  }
  return out.sort((a, b) => a.at - b.at).slice(-MAX_READINGS);
}

function cleanSteps(v: unknown): StepId[] {
  if (!Array.isArray(v)) return [];
  const known = new Set(STEPS.map((s) => s.id));
  return [...new Set(v.filter((x): x is StepId => known.has(x as StepId)))];
}

function cleanSigner(v: unknown): Signer {
  if (!isRec(v)) return unsigned();
  const sig = cleanSig(v.sig);
  return { name: cleanName(v.name, NAME_MAX), sig, signedAt: hasSig(sig) ? cleanTime(v.signedAt) : null };
}

function cleanIsos(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64))].slice(0, MAX_ISOS);
}

/** One test off the wire, or null. The parts are cleaned; with no id, day or times it is not a record. */
export function validTest(v: unknown): PressureTest | null {
  if (!isRec(v)) return null;
  const { id, day, createdAt, updatedAt } = v;
  if (typeof id !== 'string' || !id) return null;
  if (!isDay(day)) return null;
  if (!isInt(createdAt) || createdAt <= 0 || !isInt(updatedAt) || updatedAt <= 0) return null;
  const people = isRec(v.people) ? v.people : {};
  return {
    id,
    project: cleanProject(v.project),
    day,
    pkg: cleanName(v.pkg, NAME_MAX),
    attempt: isInt(v.attempt) && v.attempt >= 1 && v.attempt <= ATTEMPT_MAX ? v.attempt : 1,
    system: cleanText(v.system, SYSTEM_MAX),
    // A code that does not read is no code: nothing is checked against a code nobody chose.
    code: oneOf(v.code, CODES, 'spec'),
    kind: oneOf(v.kind, KINDS, 'hydro'),
    medium: cleanName(v.medium, NAME_MAX),
    designPsi: psi(v.designPsi),
    designTemp: temp(v.designTemp),
    testPsi: psi(v.testPsi),
    testTemp: temp(v.testTemp),
    holdReq: isNum(v.holdReq) && v.holdReq > 0 && v.holdReq <= HOLD_MAX ? v.holdReq : null,
    gauges: cleanGauges(v.gauges),
    reliefTag: cleanName(v.reliefTag, NAME_MAX),
    reliefPsi: psi(v.reliefPsi),
    hold: cleanHold(v.hold),
    readings: cleanReadings(v.readings),
    steps: cleanSteps(v.steps),
    result: oneOf(v.result, RESULTS, 'open'),
    leaks: cleanText(v.leaks, TEXT_MAX),
    notes: cleanText(v.notes, TEXT_MAX),
    people: { tester: cleanSigner(people.tester), examiner: cleanSigner(people.examiner), witness: cleanSigner(people.witness) },
    isos: cleanIsos(v.isos),
    createdAt,
    updatedAt,
  };
}

/** Newest day first; the same day, newest first. */
export function sortTests(ts: readonly PressureTest[]): PressureTest[] {
  return ts.slice().sort((a, b) => b.day.localeCompare(a.day) || b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

export function serialisePressureLog(l: PressureLog): string {
  return JSON.stringify({ v: PRESSURE_VERSION, tests: l.tests });
}

/** Read the store. A newer app's store comes back empty and marked foreign. */
export function parsePressureLog(raw: string | null | undefined): PressureLog {
  if (!raw) return emptyPressureLog();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyPressureLog(), dropped: 1 };
  }
  if (!isRec(parsed) || !isInt(parsed.v) || parsed.v < 1 || !Array.isArray(parsed.tests)) return { ...emptyPressureLog(), dropped: 1 };
  if (parsed.v > PRESSURE_VERSION) return { ...emptyPressureLog(), foreign: true };
  const tests: PressureTest[] = [];
  const ids = new Set<string>();
  let dropped = 0;
  for (const t of parsed.tests) {
    const ok = validTest(t);
    if (!ok || ids.has(ok.id)) {
      dropped += 1;
      continue;
    }
    ids.add(ok.id);
    tests.push(ok);
  }
  return { tests: sortTests(tests), foreign: false, dropped };
}

// -------------------------------------------------------------- changes

export const getTest = (log: PressureLog, id: string): PressureTest | undefined => log.tests.find((t) => t.id === id);

/** Whether another test fits. See MAX_TESTS. */
export const canAdd = (log: PressureLog): boolean => log.tests.length < MAX_TESTS;

/** A fresh test for a job: dated today, B31.3 hydro with water, nothing else in it. */
export function newTest(project: string, now: number): PressureTest {
  return {
    id: `pt${now.toString(36)}`,
    project: cleanProject(project),
    day: dayKey(now),
    pkg: '',
    attempt: 1,
    system: '',
    code: 'B31.3',
    kind: 'hydro',
    medium: 'Water',
    designPsi: null,
    designTemp: null,
    testPsi: null,
    testTemp: null,
    holdReq: null,
    gauges: [],
    reliefTag: '',
    reliefPsi: null,
    hold: noHold(),
    readings: [],
    steps: [],
    result: 'open',
    leaks: '',
    notes: '',
    people: { tester: unsigned(), examiner: unsigned(), witness: unsigned() },
    isos: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The next attempt at a package: the same system, figures, gauges, relief
 * valve, isos and people, and nothing that belonged to the attempt before —
 * no hold, no readings, no ticks, no result, no signatures.
 */
export function retest(prev: PressureTest, now: number): PressureTest {
  const fresh = newTest(prev.project, now);
  return {
    ...fresh,
    pkg: prev.pkg,
    attempt: Math.min(ATTEMPT_MAX, prev.attempt + 1),
    system: prev.system,
    code: prev.code,
    kind: prev.kind,
    medium: prev.medium,
    designPsi: prev.designPsi,
    designTemp: prev.designTemp,
    testPsi: prev.testPsi,
    testTemp: prev.testTemp,
    holdReq: prev.holdReq,
    gauges: prev.gauges.map((g) => ({ ...g })),
    reliefTag: prev.reliefTag,
    reliefPsi: prev.reliefPsi,
    people: { tester: unsigned(prev.people.tester.name), examiner: unsigned(prev.people.examiner.name), witness: unsigned(prev.people.witness.name) },
    isos: prev.isos.slice(),
  };
}

/**
 * Keep a test, cleaned. One already kept is replaced in place; a new one is
 * refused at the cap (see MAX_TESTS). An id that is taken by another test is
 * made unique.
 */
export function putTest(log: PressureLog, test: PressureTest, now: number): PressureLog {
  const clean = validTest({ ...test, updatedAt: now });
  if (!clean) return log;
  const known = log.tests.some((t) => t.id === clean.id);
  if (!known && !canAdd(log)) return log;
  const tests = known ? log.tests.map((t) => (t.id === clean.id ? clean : t)) : [...log.tests, clean];
  return { ...log, tests: sortTests(tests) };
}

export function deleteTest(log: PressureLog, id: string): PressureLog {
  const tests = log.tests.filter((t) => t.id !== id);
  return tests.length === log.tests.length ? log : { ...log, tests };
}

/** A unique id for a new test, even when two are made in the same millisecond. */
export function freshId(log: PressureLog, now: number): string {
  let id = `pt${now.toString(36)}`;
  for (let n = 2; log.tests.some((t) => t.id === id); n++) id = `pt${now.toString(36)}-${n}`;
  return id;
}

// ------------------------------------------------------------- the hold

/** Test pressure reached: the hold starts now, at the gauge reading given. Any earlier hold is gone. */
export function startHold(t: PressureTest, now: number, atPsi: number): PressureTest {
  return { ...t, day: dayKey(now), hold: { startAt: now, startPsi: atPsi, endAt: null, endPsi: null }, readings: [], updatedAt: now };
}

/** A gauge reading taken during the hold. */
export function logReading(t: PressureTest, now: number, atPsi: number): PressureTest {
  return { ...t, readings: [...t.readings, { at: now, psi: atPsi }].slice(-MAX_READINGS), updatedAt: now };
}

/** The hold ends now, at the gauge reading given. */
export function endHold(t: PressureTest, now: number, atPsi: number): PressureTest {
  if (t.hold.startAt === null) return t;
  return { ...t, hold: { ...t.hold, endAt: Math.max(now, t.hold.startAt), endPsi: atPsi }, updatedAt: now };
}

export const holding = (t: PressureTest): boolean => t.hold.startAt !== null && t.hold.endAt === null;

/** Minutes held, once the hold has ended. */
export const heldMinutes = (t: PressureTest): number | null =>
  t.hold.startAt !== null && t.hold.endAt !== null ? (t.hold.endAt - t.hold.startAt) / 60000 : null;

// ------------------------------------------------------------- reading it

/** What a test is called on a list or a page: the package, and which attempt. */
export function testName(t: Pick<PressureTest, 'pkg' | 'attempt'>): string {
  const name = t.pkg || 'Untitled test';
  return t.attempt > 1 ? `${name} retest ${t.attempt - 1}` : name;
}

/** Whether a failed test has a later attempt at the same package. */
export function retested(log: PressureLog, t: PressureTest): boolean {
  const key = t.pkg.toUpperCase();
  return log.tests.some((x) => x.id !== t.id && x.pkg.toUpperCase() === key && sameProject(x.project, t.project) && x.attempt > t.attempt);
}

/** Who signed, by role, in the order a form lists them. */
export const signers = (t: PressureTest): { role: Role; signer: Signer }[] => ROLES.map((role) => ({ role, signer: t.people[role] }));

export const isSigned = (s: Signer): boolean => hasSig(s.sig);
