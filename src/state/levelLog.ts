// The level log
// -------------
// A reading off the level is gone the moment the phone comes off the pipe. On
// a job that is fine for "is this falling the right way", and no use at all
// for "what fall did we hang line 12 at" asked the next morning by the
// foreman, or by the inspector a week later.
//
// So a reading can be kept, by the name of the pipe it was taken on: the
// slope, the fall per foot worked from it, and when. That is all. It is a
// record of what the level said, not a survey, and it says so by keeping
// nothing it did not measure.
//
// Everything here is pure; levels.tsx binds it to the shared write-through
// store in persisted.tsx, the same machinery the spools and sketches ride.

import { inchesPerFoot } from '../calc/sight';

/** Bumped only when the stored shape changes in a way an older app would misread. */
export const LEVELS_VERSION = 1;

/** Enough for any job. Past it the oldest reading goes first. */
export const MAX_READINGS = 200;

/** Longest pipe name kept. A line number, a spool mark, a location. */
export const TAG_MAX = 40;

export type Reading = {
  id: string;
  /** The pipe it was taken on. Never empty. */
  tag: string;
  /** Degrees off level, signed as the level reads it. */
  slope: number;
  /** Inches of fall per foot of run, worked from the slope when it was taken. */
  inPerFt: number;
  createdAt: number;
};

export type LevelLog = {
  readings: Reading[];
  /** The store was written by a newer app; nothing is written this session. */
  foreign: boolean;
  /** Readings that failed to load. Counted, never repaired. */
  dropped: number;
};

export const emptyLog = (): LevelLog => ({ readings: [], foreign: false, dropped: 0 });

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** One reading off the wire, or null. Nothing is patched up. */
export function validReading(v: unknown): Reading | null {
  if (!isRec(v)) return null;
  const { id, tag, slope, inPerFt, createdAt } = v;
  if (typeof id !== 'string' || !id) return null;
  if (typeof tag !== 'string' || !tag.trim()) return null;
  if (!isNum(slope) || slope < -90 || slope > 90) return null;
  if (!isNum(inPerFt)) return null;
  if (!isInt(createdAt) || createdAt <= 0) return null;
  return { id, tag: tag.trim().slice(0, TAG_MAX), slope, inPerFt, createdAt };
}

export function serialiseLog(l: LevelLog): string {
  return JSON.stringify({ v: LEVELS_VERSION, readings: l.readings });
}

/** Read the store. A newer app's store comes back empty and marked foreign. */
export function parseLog(raw: string | null | undefined): LevelLog {
  if (!raw) return emptyLog();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyLog(), dropped: 1 };
  }
  if (!isRec(parsed)) return { ...emptyLog(), dropped: 1 };
  if (!isInt(parsed.v) || parsed.v < 1) return { ...emptyLog(), dropped: 1 };
  if (parsed.v > LEVELS_VERSION) return { ...emptyLog(), foreign: true };
  if (!Array.isArray(parsed.readings)) return { ...emptyLog(), dropped: 1 };

  const readings: Reading[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const r of parsed.readings) {
    const ok = validReading(r);
    if (!ok || seen.has(ok.id)) {
      dropped += 1;
      continue;
    }
    seen.add(ok.id);
    readings.push(ok);
  }
  return { readings: sortReadings(readings), foreign: false, dropped };
}

/** Newest first. */
export function sortReadings(rs: Reading[]): Reading[] {
  return rs.slice().sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

/**
 * Keep a reading. The fall per foot is worked here, from the slope, so the
 * two can never disagree. Past the cap the oldest goes, never the new one.
 */
export function addReading(log: LevelLog, tag: string, slope: number, now: number): LevelLog {
  const name = tag.trim().slice(0, TAG_MAX);
  if (!name || !Number.isFinite(slope)) return log;
  let id = `lv${now.toString(36)}`;
  for (let n = 2; log.readings.some((r) => r.id === id); n++) id = `lv${now.toString(36)}-${n}`;
  const reading: Reading = { id, tag: name, slope, inPerFt: inchesPerFoot(slope), createdAt: now };
  const readings = sortReadings([reading, ...log.readings]).slice(0, MAX_READINGS);
  if (!readings.some((r) => r.id === id)) return log;
  return { ...log, readings };
}

export function deleteReading(log: LevelLog, id: string): LevelLog {
  const readings = log.readings.filter((r) => r.id !== id);
  return readings.length === log.readings.length ? log : { ...log, readings };
}
