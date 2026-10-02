// The shift log
// -------------
// What a crew did today, written down once and handed up: to the foreman at
// the end of the shift, or to the general contractor with the day's paper.
//
// Some of it the app already knows, because it was logged as it happened —
// the pressure tests, the bolt-ups, the re-torque checks, the heats, the level
// readings, the isos. That part is read off the records when the report is
// made (calc/shiftReport) and is never typed twice. What the app does not keep
// anywhere else is kept here: the welds made and rejected, the spools
// finished, the crew, and the crew's own words about delays, safety and
// tomorrow.
//
// One report per job per day. Opening the same day again opens the same
// report, so a report started at lunch is finished at the end of the shift
// rather than started over.
//
// Everything here is pure; shifts.tsx binds it to the shared write-through
// store in persisted.tsx, the same machinery the joints and spools ride.

import { PIPE_SIZES } from '../calc/pipe';
import { isDay } from '../calc/days';
import { cleanName as name, cleanNum, cleanText as text, isInt, isRec } from './clean';
import { cleanProject, sameProject } from './project';

/** Bumped only when the stored shape changes in a way an older app would misread. */
export const SHIFTS_VERSION = 1;

/** A season of daily reports. Past it the oldest day goes first. */
export const MAX_REPORTS = 180;

/** Longest crew note kept, per heading. A few paragraphs; a report is read on a phone. */
export const TEXT_MAX = 2000;
/** Longest name kept: a spool mark, a weld number, a test, a witness. */
export const NAME_MAX = 60;
/** Most rows in any one list: weld sizes, rejects, spools. */
export const MAX_ROWS = 40;
/** The whole report as sent, after it has been built and edited. */
export const REPORT_MAX = 12000;
/** No crew is this big and no single weld count this high; past it the number is a typo. */
const COUNT_MAX = 999;
const CREW_MAX = 500;
const HOURS_MAX = 24;

/** Welds of one size made this shift. */
export type WeldCount = { nps: number; count: number };

/** A weld that failed visual or NDE, by the number it is called out by. */
export type WeldReject = { id: string; note: string };

/** The crew's own words, by heading. Any of them may be empty. */
export type ShiftNotes = { issues: string; safety: string; tomorrow: string; notes: string };

export const NOTE_KEYS: readonly (keyof ShiftNotes)[] = ['issues', 'safety', 'tomorrow', 'notes'];

export type ShiftReport = {
  id: string;
  /** The day the shift started, local, as YYYY-MM-DD. */
  day: string;
  /** The job it is for; '' for none. See project.ts. */
  project: string;
  /** People on the crew, or null when not given. */
  crew: number | null;
  /** Hours worked, each, or null when not given. */
  hours: number | null;
  welds: WeldCount[];
  rejects: WeldReject[];
  /** Spool marks finished this shift. */
  spools: string[];
  notes: ShiftNotes;
  /**
   * The report as it was last built or edited, exactly as it will be sent.
   * Empty until it is built. Kept, so what went to the foreman can be shown
   * again word for word.
   */
  text: string;
  /** Whether the summary in `text` was written by Claude from the facts. */
  polished: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ShiftLog = {
  reports: ShiftReport[];
  /** The store was written by a newer app; nothing is written this session. */
  foreign: boolean;
  /** Reports that failed to load. Counted, never repaired. */
  dropped: number;
};

export const emptyShifts = (): ShiftLog => ({ reports: [], foreign: false, dropped: 0 });

// --------------------------------------------------------------- figures

/** Welds made, all sizes. */
export const weldTotal = (ws: readonly WeldCount[]): number => ws.reduce((s, w) => s + w.count, 0);

/**
 * Diameter-inches: each weld counted at its nominal size, so a 6" weld is six
 * and a 1/2" weld half of one. It is how pipe welding is measured and paid for,
 * because a count of welds says nothing on its own about how much welding it was.
 */
export const diameterInches = (ws: readonly WeldCount[]): number => ws.reduce((s, w) => s + w.nps * w.count, 0);

/** Crew times hours, when both are given. */
export const manHours = (r: Pick<ShiftReport, 'crew' | 'hours'>): number | null =>
  r.crew !== null && r.hours !== null ? r.crew * r.hours : null;

/** The sizes a weld can be logged at: the app's own pipe table. */
export const WELD_SIZES: readonly number[] = PIPE_SIZES.map((s) => s.nps);

/** A size the way a fitter writes it: 6", 1-1/2". */
export const sizeLabel = (nps: number): string => PIPE_SIZES.find((s) => s.nps === nps)?.label ?? `${nps}"`;

// ------------------------------------------------------------ validation

/** A short name as kept: one line, trimmed, capped. */
export const cleanName = (v: unknown): string => name(v, NAME_MAX);

/** Crew words as kept: trimmed at the ends, capped, line breaks allowed. */
export const cleanText = (v: unknown, max = TEXT_MAX): string => text(v, max);

function cleanWelds(v: unknown): WeldCount[] {
  if (!Array.isArray(v)) return [];
  const bySize = new Map<number, number>();
  for (const w of v) {
    if (!isRec(w) || !WELD_SIZES.includes(w.nps as number) || !isInt(w.count) || w.count <= 0 || w.count > COUNT_MAX) continue;
    const nps = w.nps as number;
    bySize.set(nps, Math.min(COUNT_MAX, (bySize.get(nps) ?? 0) + (w.count as number)));
  }
  // Largest first: it is the order a fitter reads a weld map in.
  return [...bySize.entries()].sort((a, b) => b[0] - a[0]).slice(0, MAX_ROWS).map(([nps, count]) => ({ nps, count }));
}

function cleanRejects(v: unknown): WeldReject[] {
  if (!Array.isArray(v)) return [];
  const out: WeldReject[] = [];
  for (const r of v) {
    if (!isRec(r)) continue;
    const id = cleanName(r.id);
    if (!id) continue;
    out.push({ id, note: cleanName(r.note) });
  }
  return out.slice(0, MAX_ROWS);
}

function cleanSpools(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of v) {
    const name = cleanName(s);
    const key = name.toUpperCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, MAX_ROWS);
}

function cleanNotes(v: unknown): ShiftNotes {
  const n = isRec(v) ? v : {};
  return { issues: cleanText(n.issues), safety: cleanText(n.safety), tomorrow: cleanText(n.tomorrow), notes: cleanText(n.notes) };
}

/** One report off the wire, or null. The parts are cleaned; a report with no id or no day is not a report. */
export function validReport(v: unknown): ShiftReport | null {
  if (!isRec(v)) return null;
  const { id, day, createdAt, updatedAt } = v;
  if (typeof id !== 'string' || !id) return null;
  if (!isDay(day)) return null;
  if (!isInt(createdAt) || createdAt <= 0 || !isInt(updatedAt) || updatedAt <= 0) return null;
  return {
    id,
    day,
    project: cleanProject(v.project),
    crew: cleanNum(v.crew, CREW_MAX, { integer: true }),
    hours: cleanNum(v.hours, HOURS_MAX),
    welds: cleanWelds(v.welds),
    rejects: cleanRejects(v.rejects),
    spools: cleanSpools(v.spools),
    notes: cleanNotes(v.notes),
    text: cleanText(v.text, REPORT_MAX),
    polished: v.polished === true,
    createdAt,
    updatedAt,
  };
}

/** A report with every part put through the same cleaning a stored one gets. */
export function cleanReport(r: ShiftReport): ShiftReport {
  return validReport(r) ?? r;
}

/** Newest day first; the same day by job. */
export function sortReports(rs: ShiftReport[]): ShiftReport[] {
  return rs.slice().sort((a, b) => b.day.localeCompare(a.day) || a.project.localeCompare(b.project) || a.id.localeCompare(b.id));
}

export function serialiseShifts(l: ShiftLog): string {
  return JSON.stringify({ v: SHIFTS_VERSION, reports: l.reports });
}

/** Read the store. A newer app's store comes back empty and marked foreign. */
export function parseShifts(raw: string | null | undefined): ShiftLog {
  if (!raw) return emptyShifts();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyShifts(), dropped: 1 };
  }
  if (!isRec(parsed)) return { ...emptyShifts(), dropped: 1 };
  if (!isInt(parsed.v) || parsed.v < 1) return { ...emptyShifts(), dropped: 1 };
  if (parsed.v > SHIFTS_VERSION) return { ...emptyShifts(), foreign: true };
  if (!Array.isArray(parsed.reports)) return { ...emptyShifts(), dropped: 1 };

  const reports: ShiftReport[] = [];
  const ids = new Set<string>();
  const slots = new Set<string>();
  let dropped = 0;
  for (const r of parsed.reports) {
    const ok = validReport(r);
    // One report per job per day: a second one for the same slot is a duplicate, not a second report.
    const slot = ok ? slotKey(ok.day, ok.project) : '';
    if (!ok || ids.has(ok.id) || slots.has(slot)) {
      dropped += 1;
      continue;
    }
    ids.add(ok.id);
    slots.add(slot);
    reports.push(ok);
  }
  return { reports: sortReports(reports), foreign: false, dropped };
}

// -------------------------------------------------------------- changes

const slotKey = (day: string, project: string) => `${day}|${cleanProject(project).toUpperCase()}`;

/** The report for a job on a day, if one has been started. */
export function reportFor(log: ShiftLog, day: string, project: string): ShiftReport | undefined {
  return log.reports.find((r) => r.day === day && sameProject(r.project, project));
}

/** A fresh report for a job on a day: nothing in it yet. */
export function newReport(day: string, project: string, now: number): ShiftReport {
  return {
    id: `sh${now.toString(36)}`,
    day,
    project: cleanProject(project),
    crew: null,
    hours: null,
    welds: [],
    rejects: [],
    spools: [],
    notes: { issues: '', safety: '', tomorrow: '', notes: '' },
    text: '',
    polished: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Keep a report, cleaned. A report for a slot that already has one replaces
 * it, so there is only ever one per job per day. Past the cap the oldest day
 * goes, never the one just kept.
 */
export function putReport(log: ShiftLog, report: ShiftReport, now: number): ShiftLog {
  if (!isDay(report.day)) return log;
  const clean = cleanReport({ ...report, updatedAt: now });
  const slot = slotKey(clean.day, clean.project);
  let id = clean.id || `sh${now.toString(36)}`;
  const others = log.reports.filter((r) => r.id !== clean.id && slotKey(r.day, r.project) !== slot);
  for (let n = 2; others.some((r) => r.id === id); n++) id = `sh${now.toString(36)}-${n}`;
  const kept = { ...clean, id };
  let reports = sortReports([kept, ...others]);
  // Newest first, so the oldest day is last; the report just kept is skipped over.
  while (reports.length > MAX_REPORTS) {
    const oldest = reports.reduce<ShiftReport | null>((o, r) => (r.id !== id ? r : o), null);
    if (!oldest) break;
    reports = reports.filter((r) => r.id !== oldest.id);
  }
  return { ...log, reports };
}

export function deleteReport(log: ShiftLog, id: string): ShiftLog {
  const reports = log.reports.filter((r) => r.id !== id);
  return reports.length === log.reports.length ? log : { ...log, reports };
}
