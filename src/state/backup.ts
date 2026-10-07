// Backup and restore
// ------------------
// Everything a fitter keeps lives on the phone: the pressure tests and their
// signatures, the joint log, the heat book, spools, isos, level readings,
// shift reports, the fitting library and the cut list. A phone dropped off a
// rack takes all of it, and a turnover package with it. So the lot goes into
// one file that can be sent anywhere — email, Drive, a text to yourself — and
// read back into this phone or a new one.
//
// Reading one back only ever adds. A record already on the phone stays as it
// is; one that is not is added. So restoring an old backup over newer work
// loses nothing, and restoring the same file twice does nothing the second
// time. Every record goes through its own store's checks on the way in, the
// same as on the phone's own start-up, so a damaged or tampered file can add
// nothing a store would not have accepted from itself.
//
// Pure; the screen (BackupScreen) does the files and the stores' apply.

import { normaliseHeat } from '../calc/heat';
import { emptyCuts, parseCuts, serialiseCuts } from './cutLog';
import { emptyLibrary, parseLibrary, serialiseLibrary } from './fittingLibrary';
import { emptyBook as emptyHeats, parseBook as parseHeats, serialiseBook as serialiseHeats } from './heatBook';
import { emptyLog, parseLog, serialiseLog } from './levelLog';
import { emptyPressureLog, parsePressureLog, serialisePressureLog } from './pressureLog';
import { projectKey } from './project';
import { emptyRegister, parseRegister, serialiseRegister } from './register';
import { emptyShifts, parseShifts, serialiseShifts } from './shiftLog';
import { emptyBook as emptySketches, parseBook as parseSketches, serialiseBook as serialiseSketches } from './sketchStore';
import { emptyShelf, parseShelf, serialiseShelf } from './spoolStore';
import { emptyWelders, emptyWelds, numberKey, parseWelders, parseWelds, serialiseWelders, serialiseWelds, stampKey } from './weldLog';

export const BACKUP_VERSION = 1;
export const BACKUP_APP = 'PipeFit Pro';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Value = { foreign: boolean; dropped: number } & Record<string, any>;

type Spec = {
  key: string;
  /** What it is called on screen, in the plural. */
  label: string;
  /** The array that holds its records. */
  field: string;
  /** What makes two records the same record. */
  idOf: (x: any) => string;
  empty: () => Value;
  parse: (raw: string) => Value;
  serialise: (v: any) => string;
};

/** Every store the app keeps, in the order they are listed. Settings are separate. */
export const STORES: readonly Spec[] = [
  { key: 'pipefit.pressure.v1', label: 'pressure tests', field: 'tests', idOf: (x) => x.id, empty: emptyPressureLog, parse: parsePressureLog, serialise: serialisePressureLog },
  { key: 'pipefit.joints.v1', label: 'joints', field: 'joints', idOf: (x) => x.id, empty: emptyRegister, parse: parseRegister, serialise: serialiseRegister },
  { key: 'pipefit.heats.v1', label: 'heats', field: 'heats', idOf: (x) => normaliseHeat(String(x.heat ?? '')), empty: emptyHeats, parse: parseHeats, serialise: serialiseHeats },
  { key: 'pipefit.spools.v1', label: 'spools', field: 'spools', idOf: (x) => x.id, empty: emptyShelf, parse: parseShelf, serialise: serialiseShelf },
  { key: 'pipefit.sketches.v1', label: 'isos', field: 'sketches', idOf: (x) => x.id, empty: emptySketches, parse: parseSketches, serialise: serialiseSketches },
  { key: 'pipefit.levels.v1', label: 'level readings', field: 'readings', idOf: (x) => x.id, empty: emptyLog, parse: parseLog, serialise: serialiseLog },
  // One report per job per day: two for the same day are the same report, whatever their ids.
  { key: 'pipefit.shifts.v1', label: 'shift reports', field: 'reports', idOf: (x) => `${x.day}|${projectKey(String(x.project ?? ''))}`, empty: emptyShifts, parse: parseShifts, serialise: serialiseShifts },
  { key: 'pipefit.fittings.v1', label: 'fitting takeouts', field: 'entries', idOf: (x) => x.key, empty: emptyLibrary, parse: parseLibrary, serialise: serialiseLibrary },
  { key: 'pipefit.cuts.v1', label: 'cuts', field: 'cuts', idOf: (x) => x.id, empty: emptyCuts, parse: parseCuts, serialise: serialiseCuts },
  // One weld per number on a line on a job, whichever phone logged it.
  { key: 'pipefit.welds.v1', label: 'welds', field: 'welds', idOf: (x) => `${projectKey(String(x.project ?? ''))}|${String(x.line ?? '').toUpperCase()}|${numberKey(String(x.number ?? ''))}`, empty: emptyWelds, parse: parseWelds, serialise: serialiseWelds },
  { key: 'pipefit.welders.v1', label: 'welders', field: 'welders', idOf: (x) => stampKey(String(x.stamp ?? '')), empty: emptyWelders, parse: parseWelders, serialise: serialiseWelders },
];

export const specOf = (key: string): Spec | undefined => STORES.find((s) => s.key === key);

/** "1 spool", "3 spools". */
export const counted = (n: number, label: string): string => `${n} ${n === 1 ? label.replace(/s$/, '') : label}`;

const countOf = (spec: Spec, v: Value): number => (Array.isArray(v[spec.field]) ? v[spec.field].length : 0);

// ------------------------------------------------------------ making one

/**
 * The backup file: every store as it is saved on the phone, and the
 * settings. Readable JSON, so a man can see it is his and not a blob.
 */
export function makeBackup(values: Readonly<Record<string, Value>>, settings: unknown, now: Date): string {
  const stores: Record<string, unknown> = {};
  for (const s of STORES) stores[s.key] = JSON.parse(s.serialise(values[s.key] ?? s.empty()));
  return JSON.stringify({ app: BACKUP_APP, backup: BACKUP_VERSION, made: now.toISOString(), settings, stores }, null, 1);
}

/** What a backup holds, for the line under the button: "12 pressure tests, 40 joints…". */
export function backupSummary(values: Readonly<Record<string, Value>>): { label: string; count: number }[] {
  return STORES.map((s) => ({ label: s.label, count: countOf(s, values[s.key] ?? s.empty()) })).filter((x) => x.count > 0);
}

export const backupFileName = (now: Date, job: string): string => {
  const day = now.toISOString().slice(0, 10);
  const tag = job.trim().replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  return `pipefit-backup-${day}${tag ? `-${tag}` : ''}.json`;
};

// ------------------------------------------------------------ reading one

export type ReadBackup =
  | { ok: false; why: string }
  | {
      ok: true;
      made: string;
      /** Each store found, parsed by its own rules. */
      stores: Record<string, Value>;
      /** The settings as saved, untouched; the screen reads them with the settings' own reader. */
      settings: unknown;
      /** Stores written by a newer app than this one, left out. */
      newer: string[];
    };

/**
 * A backup off a file or out of a paste. Whatever came round it (an email
 * signature, a "Here you go:") is cut away; then every store is read by its
 * own parser, which keeps only the records it would accept from itself.
 */
export function readBackup(text: string): ReadBackup {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, why: 'That is not a PipeFit Pro backup: there is nothing in it to read.' };
  let v: any;
  try {
    v = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, why: 'That backup is damaged or cut short: it does not read. Send it again, whole.' };
  }
  if (!v || typeof v !== 'object' || v.app !== BACKUP_APP || typeof v.backup !== 'number') return { ok: false, why: 'That is not a PipeFit Pro backup.' };
  if (v.backup > BACKUP_VERSION) return { ok: false, why: 'That backup was made by a newer PipeFit Pro. Update the app, then read it again.' };
  const stores: Record<string, Value> = {};
  const newer: string[] = [];
  const raw = v.stores && typeof v.stores === 'object' ? v.stores : {};
  for (const s of STORES) {
    if (!(s.key in raw)) continue;
    const parsed = s.parse(JSON.stringify(raw[s.key]));
    if (parsed.foreign) newer.push(s.label);
    else stores[s.key] = parsed;
  }
  return { ok: true, made: typeof v.made === 'string' ? v.made : '', stores, settings: v.settings ?? null, newer };
}

/**
 * One store's records added to what the phone holds. A record the phone has
 * already — the same id, the same heat, the same job and day — is left as the
 * phone has it. The result goes back through the store's own parser, so its
 * caps and order hold exactly as if it had been saved on the phone.
 */
export function mergeStore(key: string, current: Value, incoming: Value): { value: Value; added: number } {
  const spec = specOf(key);
  if (!spec || current.foreign) return { value: current, added: 0 };
  const have: any[] = Array.isArray(current[spec.field]) ? current[spec.field] : [];
  const seen = new Set(have.map(spec.idOf));
  const extra = (Array.isArray(incoming[spec.field]) ? incoming[spec.field] : []).filter((x: any) => {
    const id = spec.idOf(x);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!extra.length) return { value: current, added: 0 };
  const merged = spec.parse(spec.serialise({ ...current, [spec.field]: [...have, ...extra] }));
  return { value: { ...merged, dropped: current.dropped }, added: Math.max(0, countOf(spec, merged) - have.length) };
}

/** What a restore would add, store by store, before anything is written. */
export function restorePlan(read: Extract<ReadBackup, { ok: true }>, current: Readonly<Record<string, Value>>): { key: string; label: string; inFile: number; adds: number }[] {
  return STORES.filter((s) => read.stores[s.key]).map((s) => {
    const inFile = countOf(s, read.stores[s.key]!);
    const { added } = mergeStore(s.key, current[s.key] ?? s.empty(), read.stores[s.key]!);
    return { key: s.key, label: s.label, inFile, adds: added };
  });
}

// ------------------------------------------------------------ the nudge

/** Days without a backup before Home asks for one. */
export const NUDGE_AFTER_DAYS = 7;

/**
 * Whether Home asks for a backup: there is something on the phone worth
 * keeping, the last backup is a week old or there never was one, and it was
 * not put off ("Not today") within the last day.
 */
export function shouldNudge(o: { lastAt: number | null; snoozedUntil: number | null; records: number; now: number }): { show: boolean; days: number | null } {
  const days = o.lastAt ? Math.floor((o.now - o.lastAt) / 86_400_000) : null;
  if (o.records <= 0) return { show: false, days };
  if (o.snoozedUntil && o.now < o.snoozedUntil) return { show: false, days };
  return { show: days === null || days >= NUDGE_AFTER_DAYS, days };
}
