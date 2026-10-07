// The weld log
// ------------
// Every weld on the job, the way QC keeps it on the weld map and the weld log
// sheet: the line, the weld number, the day, the size and kind of joint, the
// process and WPS, the stamps of the welders who made it, the heats either
// side, and every examination it has had — what, when, the report, the
// result — and every repair. From that the rest is worked, never typed twice:
// a weld's state, the diameter-inches put in a day, each welder's reject rate,
// and whether a welder is still in continuity on a process (ASME IX QW-322).
// The NDE sampling that sits on top of the log is in calc/ndeSampling.ts.
//
// Two stores, because a welder outlives any one job: the welds, tagged by job
// like everything else (project.ts), and the welders, kept once for every job.
//
// Pure; welds.tsx binds both to the shared persistence.

import { dayKey, isDay } from '../calc/days';
import { normaliseHeat } from '../calc/heat';
import { cleanProject, projectKey, sameProject } from './project';

export const WELDS_VERSION = 1;
export const WELDERS_VERSION = 1;

/**
 * Welds kept. A big job's log runs to a couple of thousand; past this the
 * store is near the size a phone writes in one go, so a new weld is refused
 * rather than an old record dropped. A QC record is never pruned on its own.
 */
export const MAX_WELDS = 3000;
export const MAX_WELDERS = 300;
const MAX_EXAMS = 20;
const MAX_TEXT = 60;

export type Process = 'GTAW' | 'SMAW' | 'GMAW' | 'FCAW' | 'SAW';
export const PROCESSES: readonly Process[] = ['GTAW', 'SMAW', 'GMAW', 'FCAW', 'SAW'];

/** Butt, socket, fillet, branch. Random sampling counts butt welds, as B31.3 does. */
export type JointType = 'BW' | 'SW' | 'FW' | 'BR';
export const JOINT_TYPES: readonly { id: JointType; label: string }[] = [
  { id: 'BW', label: 'Butt' },
  { id: 'SW', label: 'Socket' },
  { id: 'FW', label: 'Fillet' },
  { id: 'BR', label: 'Branch' },
];

export type NdeMethod = 'RT' | 'UT' | 'MT' | 'PT' | 'VT';
export const NDE_METHODS: readonly NdeMethod[] = ['RT', 'UT', 'MT', 'PT', 'VT'];

/** Why a weld was examined: the random sample, a tracer after a reject, the whole lot, the spec, or after a repair. */
export type ExamReason = 'random' | 'tracer' | 'lot' | 'spec' | 'repair';
export type ExamResult = 'pending' | 'accept' | 'reject';

export type Exam = {
  id: string;
  method: NdeMethod;
  reason: ExamReason;
  /** A tracer's: the weld whose reject it follows up, and which round (1, then 2). */
  forWeld: string;
  round: number;
  /** When it was picked. */
  day: string;
  result: ExamResult;
  /** When the result came back. */
  resultDay: string;
  report: string;
};

/** The examination percentages a line class calls for: 0 is visual only. */
export const NDE_PERCENTS: readonly number[] = [0, 5, 10, 20, 100];

export type Weld = {
  id: string;
  /** The Project ID active when it was logged; '' for none. */
  project: string;
  /** The line or iso number, as on the weld map. */
  line: string;
  /** The weld number on the map: "14", "FW-3". */
  number: string;
  /** The iso it is drawn on, by sketch id; '' for none. */
  sketchId: string;
  day: string;
  /** Nominal size, inches; null when not given. */
  nps: number | null;
  type: JointType;
  process: Process;
  wps: string;
  /** Welders' stamps, the root first. */
  welders: string[];
  heats: string[];
  /** The line class's examination percentage. */
  pct: number;
  method: NdeMethod;
  exams: Exam[];
  /** Repairs made, each after a reject: the weld is read as 14R1, 14R2. */
  repairs: number;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type Qual = { process: Process; /** The day continuity was last shown: the test, or a signed continuity record. */ since: string; note: string };

export type Welder = { id: string; stamp: string; name: string; quals: Qual[]; createdAt: number };

export type WeldLog = { welds: Weld[]; foreign: boolean; dropped: number };
export type WelderRoster = { welders: Welder[]; foreign: boolean; dropped: number };

export const emptyWelds = (): WeldLog => ({ welds: [], foreign: false, dropped: 0 });
export const emptyWelders = (): WelderRoster => ({ welders: [], foreign: false, dropped: 0 });

// ------------------------------------------------------------ checking what is stored

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown, max = MAX_TEXT): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, all: readonly T[], or: T): T => (all.includes(v as T) ? (v as T) : or);
const day = (v: unknown, or: string): string => (isDay(v) ? (v as string) : or);

/** A stamp as it is compared: "w-12" and "W12 " are the same welder. */
export const stampKey = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
/** A weld number as it is compared. */
export const numberKey = (s: string): string => s.toUpperCase().replace(/\s+/g, '');

function validExam(v: unknown, fallbackDay: string): Exam | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  return {
    id: v.id,
    method: oneOf(v.method, NDE_METHODS, 'RT'),
    reason: oneOf(v.reason, ['random', 'tracer', 'lot', 'spec', 'repair'] as const, 'spec'),
    forWeld: text(v.forWeld, 40),
    round: v.round === 2 ? 2 : v.round === 1 ? 1 : 0,
    day: day(v.day, fallbackDay),
    result: oneOf(v.result, ['pending', 'accept', 'reject'] as const, 'pending'),
    resultDay: day(v.resultDay, ''),
    report: text(v.report),
  };
}

export function validWeld(v: unknown): Weld | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  const number = text(v.number, 20);
  if (!number) return null;
  if (!isNum(v.createdAt) || v.createdAt <= 0) return null;
  const when = day(v.day, dayKey(v.createdAt));
  const list = (x: unknown, f: (s: string) => string, max: number) =>
    Array.isArray(x) ? [...new Set(x.map((s) => f(text(s, 30))).filter(Boolean))].slice(0, max) : [];
  return {
    id: v.id,
    project: cleanProject(v.project),
    line: text(v.line),
    number,
    sketchId: text(v.sketchId, 80),
    day: when,
    nps: isNum(v.nps) && v.nps > 0 && v.nps <= 120 ? v.nps : null,
    type: oneOf(v.type, ['BW', 'SW', 'FW', 'BR'] as const, 'BW'),
    process: oneOf(v.process, PROCESSES, 'GTAW'),
    wps: text(v.wps, 30),
    welders: list(v.welders, (s) => s.toUpperCase(), 6),
    heats: list(v.heats, normaliseHeat, 6),
    pct: isNum(v.pct) && NDE_PERCENTS.includes(v.pct) ? v.pct : 5,
    method: oneOf(v.method, NDE_METHODS, 'RT'),
    exams: (Array.isArray(v.exams) ? v.exams : []).map((e) => validExam(e, when)).filter((e): e is Exam => e !== null).slice(0, MAX_EXAMS),
    repairs: isNum(v.repairs) && v.repairs >= 0 ? Math.min(9, Math.floor(v.repairs)) : 0,
    note: text(v.note, 200),
    createdAt: v.createdAt,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : v.createdAt,
  };
}

export function validWelder(v: unknown): Welder | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  const stamp = text(v.stamp, 12).toUpperCase();
  if (!stampKey(stamp)) return null;
  const quals: Qual[] = [];
  for (const q of Array.isArray(v.quals) ? v.quals : []) {
    if (!isRec(q) || !PROCESSES.includes(q.process as Process) || !isDay(q.since)) continue;
    if (quals.some((x) => x.process === q.process)) continue;
    quals.push({ process: q.process as Process, since: q.since as string, note: text(q.note) });
  }
  return { id: v.id, stamp, name: text(v.name), quals, createdAt: isNum(v.createdAt) && v.createdAt > 0 ? v.createdAt : 1 };
}

function parse<T, K extends string>(raw: string | null | undefined, version: number, field: K, valid: (v: unknown) => T | null, key: (x: T) => string) {
  const empty = { [field]: [] as T[], foreign: false, dropped: 0 } as { [P in K]: T[] } & { foreign: boolean; dropped: number };
  if (!raw) return empty;
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ...empty, dropped: 1 };
  }
  if (!isRec(p) || typeof p.v !== 'number' || !Array.isArray(p[field])) return { ...empty, dropped: 1 };
  if (p.v > version) return { ...empty, foreign: true };
  const out: T[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const x of p[field] as unknown[]) {
    const ok = valid(x);
    if (!ok || seen.has(key(ok))) {
      dropped += 1;
      continue;
    }
    seen.add(key(ok));
    out.push(ok);
  }
  return { ...empty, [field]: out, dropped };
}

export const parseWelds = (raw: string | null | undefined): WeldLog => {
  const p = parse(raw, WELDS_VERSION, 'welds', validWeld, (w) => w.id);
  return { welds: p.welds.slice(0, MAX_WELDS), foreign: p.foreign, dropped: p.dropped };
};
export const serialiseWelds = (l: WeldLog): string => JSON.stringify({ v: WELDS_VERSION, welds: l.welds });
export const parseWelders = (raw: string | null | undefined): WelderRoster => {
  const p = parse(raw, WELDERS_VERSION, 'welders', validWelder, (w) => stampKey(w.stamp));
  return { welders: p.welders.slice(0, MAX_WELDERS), foreign: p.foreign, dropped: p.dropped };
};
export const serialiseWelders = (r: WelderRoster): string => JSON.stringify({ v: WELDERS_VERSION, welders: r.welders });

// ------------------------------------------------------------ welds

export type NewWeld = Omit<Weld, 'id' | 'exams' | 'repairs' | 'createdAt' | 'updatedAt'>;

/** The weld already logged on that job and line under that number, if any. */
export const findWeld = (l: WeldLog, project: string, line: string, number: string): Weld | undefined =>
  l.welds.find((w) => sameProject(w.project, project) && w.line.toUpperCase() === line.trim().toUpperCase() && numberKey(w.number) === numberKey(number));

export type WeldPut = { log: WeldLog; ok: true; id: string } | { log: WeldLog; ok: false; why: string };

/** A new weld on the log, or why not: a number taken on that line, or a full log. */
export function addWeld(l: WeldLog, w: NewWeld, now: number): WeldPut {
  if (l.welds.length >= MAX_WELDS) return { log: l, ok: false, why: `The weld log is full at ${MAX_WELDS}. Back it up, then clear a finished job.` };
  if (findWeld(l, w.project, w.line, w.number)) return { log: l, ok: false, why: `Weld ${w.number} is already on ${w.line || 'the log'} for this job.` };
  let id = `wd${now.toString(36)}`;
  for (let n = 2; l.welds.some((x) => x.id === id); n++) id = `wd${now.toString(36)}-${n}`;
  const weld = validWeld({ ...w, id, exams: [], repairs: 0, createdAt: now, updatedAt: now });
  if (!weld) return { log: l, ok: false, why: 'Give the weld a number.' };
  return { log: { ...l, welds: [weld, ...l.welds] }, ok: true, id };
}

/** A weld changed. Its number may not move onto another's. */
export function putWeld(l: WeldLog, w: Weld, now: number): WeldPut {
  const clash = findWeld(l, w.project, w.line, w.number);
  if (clash && clash.id !== w.id) return { log: l, ok: false, why: `Weld ${w.number} is already on ${w.line || 'the log'} for this job.` };
  const next = validWeld({ ...w, updatedAt: now });
  if (!next) return { log: l, ok: false, why: 'Give the weld a number.' };
  return { log: { ...l, welds: l.welds.map((x) => (x.id === w.id ? next : x)) }, ok: true, id: w.id };
}

export const deleteWeld = (l: WeldLog, id: string): WeldLog => ({ ...l, welds: l.welds.filter((w) => w.id !== id) });
export const getWeld = (l: WeldLog, id: string): Weld | undefined => l.welds.find((w) => w.id === id);

const edit = (l: WeldLog, id: string, f: (w: Weld) => Weld, now: number): WeldLog => ({ ...l, welds: l.welds.map((w) => (w.id === id ? { ...f(w), updatedAt: now } : w)) });

/** Picked for an examination. A weld with one pending already is left as it is. */
export function pickWeld(l: WeldLog, id: string, e: Pick<Exam, 'method' | 'reason'> & Partial<Pick<Exam, 'forWeld' | 'round'>>, now: number): WeldLog {
  const w = getWeld(l, id);
  if (!w || w.exams.some((x) => x.result === 'pending') || w.exams.length >= MAX_EXAMS) return l;
  const exam: Exam = { id: `ex${now.toString(36)}${w.exams.length}`, method: e.method, reason: e.reason, forWeld: e.forWeld ?? '', round: e.round ?? 0, day: dayKey(now), result: 'pending', resultDay: '', report: '' };
  return edit(l, id, (x) => ({ ...x, exams: [...x.exams, exam] }), now);
}

/** The result of an examination, with its report number. */
export function setResult(l: WeldLog, id: string, examId: string, result: ExamResult, report: string, now: number): WeldLog {
  return edit(l, id, (w) => ({ ...w, exams: w.exams.map((e) => (e.id === examId ? { ...e, result, report: text(report), resultDay: result === 'pending' ? '' : e.result === result && e.resultDay ? e.resultDay : dayKey(now) } : e)) }), now);
}

export const removeExam = (l: WeldLog, id: string, examId: string, now: number): WeldLog => edit(l, id, (w) => ({ ...w, exams: w.exams.filter((e) => e.id !== examId) }), now);

/** A rejected weld repaired: it is now 14R1, and wants the same examination again. */
export function logRepair(l: WeldLog, id: string, now: number): WeldLog {
  const w = getWeld(l, id);
  if (!w || weldState(w) !== 'repair') return l;
  const last = [...w.exams].reverse().find((e) => e.result === 'reject')!;
  const repaired = edit(l, id, (x) => ({ ...x, repairs: x.repairs + 1 }), now);
  return pickWeld(repaired, id, { method: last.method, reason: 'repair', forWeld: last.forWeld, round: last.round }, now + 1);
}

/** The weld as it is called: 14, or 14R1 after its first repair. */
export const weldName = (w: Pick<Weld, 'number' | 'repairs'>): string => (w.repairs ? `${w.number}R${w.repairs}` : w.number);

export type WeldState = 'welded' | 'picked' | 'accepted' | 'repair';

/** Where a weld stands, from its examinations. */
export function weldState(w: Weld): WeldState {
  const last = w.exams[w.exams.length - 1];
  if (!last) return 'welded';
  if (last.result === 'pending') return 'picked';
  return last.result === 'accept' ? 'accepted' : 'repair';
}

export const STATE_LABEL: Record<WeldState, string> = { welded: 'Welded', picked: 'Picked for NDE', accepted: 'Accepted', repair: 'Repair' };

/** The next weld number on a line: one past the highest plain number there. */
export function nextNumber(l: WeldLog, project: string, line: string): string {
  const key = line.trim().toUpperCase();
  let top = 0;
  for (const w of l.welds) {
    if (!sameProject(w.project, project) || w.line.toUpperCase() !== key) continue;
    const m = w.number.match(/(\d+)\s*$/);
    if (m) top = Math.max(top, Number(m[1]));
  }
  return String(top + 1);
}

/** The lines on a job, most recently welded first. */
export function linesOf(welds: readonly Weld[]): string[] {
  const seen = new Map<string, number>();
  for (const w of welds) if (w.line) seen.set(w.line, Math.max(seen.get(w.line) ?? 0, w.updatedAt));
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
}

/** Diameter-inches: the size of each weld added up, the count a foreman's production is measured in. */
export const diameterInches = (welds: readonly Weld[]): number => welds.reduce((s, w) => s + (w.nps ?? 0), 0);

// ------------------------------------------------------------ welders

/** The roster's entry for a stamp. */
export const findWelder = (r: WelderRoster, stamp: string): Welder | undefined => r.welders.find((w) => stampKey(w.stamp) === stampKey(stamp));

/** A welder added or changed, keyed by stamp. */
export function putWelder(r: WelderRoster, w: Omit<Welder, 'id' | 'createdAt'> & { id?: string }, now: number): { roster: WelderRoster; ok: boolean; why?: string } {
  const clash = findWelder(r, w.stamp);
  if (clash && clash.id !== w.id) return { roster: r, ok: false, why: `Stamp ${clash.stamp} is already ${clash.name || 'on the roster'}.` };
  const had = w.id ? r.welders.find((x) => x.id === w.id) : undefined;
  if (!had && r.welders.length >= MAX_WELDERS) return { roster: r, ok: false, why: 'The roster is full.' };
  const next = validWelder({ ...w, id: had?.id ?? `wr${now.toString(36)}`, createdAt: had?.createdAt ?? now });
  if (!next) return { roster: r, ok: false, why: 'Give the welder a stamp.' };
  const welders = had ? r.welders.map((x) => (x.id === had.id ? next : x)) : [...r.welders, next];
  return { roster: { ...r, welders: welders.sort((a, b) => a.stamp.localeCompare(b.stamp, undefined, { numeric: true })) }, ok: true };
}

export const deleteWelder = (r: WelderRoster, id: string): WelderRoster => ({ ...r, welders: r.welders.filter((w) => w.id !== id) });

// ------------------------------------------------------------ continuity, ASME IX QW-322.1

/** Six months without welding a process and a welder's qualification for it lapses. */
export const CONTINUITY_MONTHS = 6;
/** How soon before a lapse it is called out. */
export const CONTINUITY_WARN_DAYS = 30;

/** A day some months on, held to the end of a shorter month: 31 Aug + 6 is 28 or 29 Feb. */
export function addMonths(d: string, months: number): string {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(dd, last)).padStart(2, '0')}`;
}

const utc = (d: string): number => {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, dd);
};
const daysBetween = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / 86_400_000);

export type Continuity = {
  process: Process;
  /** The last day continuity was shown: qualified, a record signed, or a weld logged with the process. */
  last: string;
  /** The last day the qualification still holds. */
  until: string;
  state: 'ok' | 'soon' | 'lapsed';
  daysLeft: number;
};

/** A welder's continuity on each process qualified, from the qualification and every weld logged on any job. */
export function continuity(w: Welder, welds: readonly Weld[], today: string): Continuity[] {
  const key = stampKey(w.stamp);
  return w.quals.map((q) => {
    let last = q.since;
    for (const x of welds) if (x.process === q.process && x.day > last && x.day <= today && x.welders.some((s) => stampKey(s) === key)) last = x.day;
    const until = addMonths(last, CONTINUITY_MONTHS);
    const daysLeft = daysBetween(today, until);
    return { process: q.process, last, until, daysLeft, state: daysLeft < 0 ? 'lapsed' : daysLeft <= CONTINUITY_WARN_DAYS ? 'soon' : 'ok' };
  });
}

/** What is wrong with putting these stamps on a weld of this process today: not on the roster, not qualified, lapsed. */
export function stampProblems(r: WelderRoster, welds: readonly Weld[], stamps: readonly string[], process: Process, today: string): string[] {
  const out: string[] = [];
  for (const s of stamps) {
    const w = findWelder(r, s);
    if (!w) {
      out.push(`${s} is not on the welder roster.`);
      continue;
    }
    const c = continuity(w, welds, today).find((x) => x.process === process);
    if (!c) out.push(`${w.stamp} has no ${process} qualification on the roster.`);
    else if (c.state === 'lapsed') out.push(`${w.stamp} lapsed on ${process} after ${c.until}: no ${process} weld in six months.`);
  }
  return out;
}

export type WelderStats = { welds: number; butt: number; examined: number; rejects: number; rate: number | null; diameterInches: number };

/**
 * A welder's record over the welds given. A weld counts once however many
 * times it was shot; a reject is a weld with any rejected examination before
 * a repair, so a repair re-shot never makes a reject look like two.
 */
export function welderStats(stamp: string, welds: readonly Weld[]): WelderStats {
  const key = stampKey(stamp);
  const mine = welds.filter((w) => w.welders.some((s) => stampKey(s) === key));
  const examined = mine.filter((w) => w.exams.some((e) => e.result !== 'pending' && e.reason !== 'repair'));
  const rejects = examined.filter((w) => w.exams.some((e) => e.result === 'reject' && e.reason !== 'repair')).length;
  return {
    welds: mine.length,
    butt: mine.filter((w) => w.type === 'BW').length,
    examined: examined.length,
    rejects,
    rate: examined.length ? rejects / examined.length : null,
    diameterInches: diameterInches(mine),
  };
}

/** Every stamp on the welds given, roster or not, in order. */
export const stampsIn = (welds: readonly Weld[]): string[] => [...new Set(welds.flatMap((w) => w.welders.map((s) => s.toUpperCase())))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

/** The welds of one job. */
export const jobWelds = (welds: readonly Weld[], project: string): Weld[] => welds.filter((w) => projectKey(w.project) === projectKey(project));
