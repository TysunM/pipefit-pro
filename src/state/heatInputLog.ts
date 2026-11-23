// The heat input log
// ------------------
// A heat input worked out at the bench is gone when the screen changes; the
// one on the PQR, or checked against the WPS range for a welder's pass, has
// to be kept. So a result can be saved, with every figure it came from, the
// process and its efficiency, and the job's own fields (WPS, welder, pass,
// joint: whatever the job names in Settings, up to four). Kept in the units
// it was worked in, millimetres, seconds and joules, so changing units later
// never changes a saved figure, only how it reads. Exported as a CSV.
//
// Pure; heatInputs.tsx binds it to the shared write-through store.

import { cleanProject } from './project';
import type { ArcMode } from '../calc/heatInput';

export const HEAT_INPUT_VERSION = 1;
/** Enough for a PQR's worth of passes many times over. Past it the oldest goes first. */
export const MAX_HEAT_INPUTS = 500;
/** Fields the job names, as many as fit across an export. */
export const MAX_WELD_FIELDS = 4;
export const FIELD_NAME_MAX = 24;
export const FIELD_VALUE_MAX = 40;

export type HeatInputEntry = {
  id: string;
  createdAt: number;
  project: string;
  mode: ArcMode;
  amps: number | null;
  volts: number | null;
  energyKJ: number | null;
  lengthMm: number;
  /** Whether the length was worked round a pipe from its diameter. */
  around: boolean;
  seconds: number | null;
  process: string;
  k: number;
  /** J/mm before and after the efficiency. */
  arcEnergy: number;
  heatInput: number;
  /** mm/s, or null with no arc time. */
  travel: number | null;
  /** The job's own fields, as named when it was saved. */
  fields: { name: string; value: string }[];
};

export type HeatInputLog = { entries: HeatInputEntry[]; foreign: boolean; dropped: number };

export const emptyHeatInputs = (): HeatInputLog => ({ entries: [], foreign: false, dropped: 0 });

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const posOrNull = (v: unknown): number | null | undefined => (v === null ? null : isPos(v) ? v : undefined);

/** The field names kept: trimmed, capped, no blanks, no repeats, at most four. */
export function cleanFieldNames(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const name = x.trim().slice(0, FIELD_NAME_MAX);
    if (name && !out.some((o) => o.toLowerCase() === name.toLowerCase())) out.push(name);
    if (out.length === MAX_WELD_FIELDS) break;
  }
  return out;
}

export function validEntry(v: unknown): HeatInputEntry | null {
  if (!isRec(v)) return null;
  const { id, createdAt, mode, lengthMm, k, arcEnergy, heatInput } = v;
  if (typeof id !== 'string' || !id) return null;
  if (!isInt(createdAt) || createdAt <= 0) return null;
  if (mode !== 'va' && mode !== 'energy') return null;
  if (!isPos(lengthMm) || !isPos(arcEnergy) || !isPos(heatInput)) return null;
  if (typeof k !== 'number' || !(k > 0 && k <= 1)) return null;
  const amps = posOrNull(v.amps);
  const volts = posOrNull(v.volts);
  const energyKJ = posOrNull(v.energyKJ);
  const seconds = posOrNull(v.seconds);
  const travel = posOrNull(v.travel);
  if (amps === undefined || volts === undefined || energyKJ === undefined || seconds === undefined || travel === undefined) return null;
  if (mode === 'va' && (amps === null || volts === null || seconds === null)) return null;
  if (mode === 'energy' && energyKJ === null) return null;
  const fields = Array.isArray(v.fields)
    ? v.fields
        .filter((f): f is { name: string; value: string } => isRec(f) && typeof f.name === 'string' && typeof f.value === 'string' && !!f.name.trim())
        .slice(0, MAX_WELD_FIELDS)
        .map((f) => ({ name: f.name.trim().slice(0, FIELD_NAME_MAX), value: f.value.slice(0, FIELD_VALUE_MAX) }))
    : [];
  return {
    id,
    createdAt,
    project: cleanProject(v.project),
    mode,
    amps,
    volts,
    energyKJ,
    lengthMm,
    around: v.around === true,
    seconds,
    process: typeof v.process === 'string' ? v.process.slice(0, 16) : 'none',
    k,
    arcEnergy,
    heatInput,
    travel,
    fields,
  };
}

export const serialiseHeatInputs = (l: HeatInputLog): string => JSON.stringify({ v: HEAT_INPUT_VERSION, entries: l.entries });

const newestFirst = (es: HeatInputEntry[]): HeatInputEntry[] => es.slice().sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));

export function parseHeatInputs(raw: string | null | undefined): HeatInputLog {
  if (!raw) return emptyHeatInputs();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyHeatInputs(), dropped: 1 };
  }
  if (!isRec(parsed) || !isInt(parsed.v) || parsed.v < 1 || !Array.isArray(parsed.entries)) return { ...emptyHeatInputs(), dropped: 1 };
  if (parsed.v > HEAT_INPUT_VERSION) return { ...emptyHeatInputs(), foreign: true };
  const entries: HeatInputEntry[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const e of parsed.entries) {
    const ok = validEntry(e);
    if (!ok || seen.has(ok.id)) {
      dropped += 1;
      continue;
    }
    seen.add(ok.id);
    entries.push(ok);
  }
  return { entries: newestFirst(entries), foreign: false, dropped };
}

/** Keep one. Past the cap the oldest goes, never the new one. */
export function addHeatInput(log: HeatInputLog, e: Omit<HeatInputEntry, 'id' | 'createdAt'>, now: number): HeatInputLog {
  let id = `hi${now.toString(36)}`;
  for (let n = 2; log.entries.some((x) => x.id === id); n++) id = `hi${now.toString(36)}-${n}`;
  const entry = validEntry({ ...e, id, createdAt: now });
  if (!entry) return log;
  return { ...log, entries: newestFirst([entry, ...log.entries]).slice(0, MAX_HEAT_INPUTS) };
}

export const deleteHeatInput = (log: HeatInputLog, id: string): HeatInputLog =>
  log.entries.some((e) => e.id === id) ? { ...log, entries: log.entries.filter((e) => e.id !== id) } : log;
