// The calibration register
// ------------------------
// Every instrument a figure on a record was read off — test gauges, torque
// wrenches, relief valves, recorders, the thermometer for preheat — with its
// tag, what it reads, when it was last calibrated, when it is due, and the
// certificate that says so. QC audits ask for exactly this list, and a gauge
// out of calibration on the day of a pressure test, or a wrench out of
// calibration on the day a flange was pulled up, voids the record.
//
// So the register is what the records are checked against: a test gauge or a
// bolt-up wrench is picked from it, its due date goes on the record as it was
// that day, and anything overdue is said on every page and alerted on the
// phone before it runs out. Kept once for every job.
//
// Pure; instruments.tsx binds it to the shared persistence.

import { dayKey, isDay } from '../calc/days';
import { addMonths } from './weldLog';

export const INSTRUMENTS_VERSION = 1;
export const MAX_INSTRUMENTS = 500;
const MAX_HISTORY = 12;
const MAX_TEXT = 60;

export type InstrumentKind = 'gauge' | 'torque' | 'relief' | 'recorder' | 'thermometer' | 'meter' | 'other';

export const INSTRUMENT_KINDS: readonly { id: InstrumentKind; label: string; months: number; unit: string }[] = [
  { id: 'gauge', label: 'Pressure gauge', months: 6, unit: 'psi' },
  { id: 'torque', label: 'Torque wrench', months: 12, unit: 'ft-lb' },
  { id: 'relief', label: 'Relief valve', months: 12, unit: 'psi' },
  { id: 'recorder', label: 'Chart recorder', months: 6, unit: 'psi' },
  { id: 'thermometer', label: 'Thermometer', months: 12, unit: '°F' },
  { id: 'meter', label: 'Meter / tester', months: 12, unit: '' },
  { id: 'other', label: 'Other', months: 12, unit: '' },
];
export const kindOf = (k: InstrumentKind) => INSTRUMENT_KINDS.find((x) => x.id === k)!;

/** One calibration: when, until when, by whom, and the certificate. */
export type Calibration = { on: string; due: string; cert: string; lab: string };

export type Instrument = {
  id: string;
  /** Asset tag or serial, as stamped on it: what a record names it by. */
  tag: string;
  kind: InstrumentKind;
  /** Make and model, or what it is. */
  name: string;
  /** Full scale, in the kind's unit: 300 psi, 600 ft-lb. Null when it does not apply. */
  max: number | null;
  /** Months between calibrations. */
  months: number;
  /** The calibrations, newest first. The first is the one in force. */
  history: Calibration[];
  /** Tagged out: damaged, lost, or sent away. Nothing is read off it until it comes back. */
  out: boolean;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type CalibrationRegister = { instruments: Instrument[]; foreign: boolean; dropped: number };
export const emptyInstruments = (): CalibrationRegister => ({ instruments: [], foreign: false, dropped: 0 });

// ------------------------------------------------------------ checking what is stored

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown, max = MAX_TEXT): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** A tag as compared: "PG-104" and "pg 104" are the same gauge. */
export const tagKey = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

function validCal(v: unknown): Calibration | null {
  if (!isRec(v) || !isDay(v.on) || !isDay(v.due) || (v.due as string) < (v.on as string)) return null;
  return { on: v.on as string, due: v.due as string, cert: text(v.cert, 40), lab: text(v.lab) };
}

export function validInstrument(v: unknown): Instrument | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  const tag = text(v.tag, 30).toUpperCase();
  if (!tagKey(tag)) return null;
  if (!isNum(v.createdAt) || v.createdAt <= 0) return null;
  const kind = INSTRUMENT_KINDS.some((k) => k.id === v.kind) ? (v.kind as InstrumentKind) : 'other';
  const history = (Array.isArray(v.history) ? v.history : [])
    .map(validCal)
    .filter((c): c is Calibration => c !== null)
    .sort((a, b) => b.on.localeCompare(a.on))
    .slice(0, MAX_HISTORY);
  return {
    id: v.id,
    tag,
    kind,
    name: text(v.name),
    max: isNum(v.max) && v.max > 0 && v.max < 1e6 ? v.max : null,
    months: isNum(v.months) && v.months >= 1 && v.months <= 60 ? Math.round(v.months) : kindOf(kind).months,
    history,
    out: v.out === true,
    note: text(v.note, 200),
    createdAt: v.createdAt,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : v.createdAt,
  };
}

export const serialiseInstruments = (r: CalibrationRegister): string => JSON.stringify({ v: INSTRUMENTS_VERSION, instruments: r.instruments });

export function parseInstruments(raw: string | null | undefined): CalibrationRegister {
  if (!raw) return emptyInstruments();
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ...emptyInstruments(), dropped: 1 };
  }
  if (!isRec(p) || typeof p.v !== 'number' || !Array.isArray(p.instruments)) return { ...emptyInstruments(), dropped: 1 };
  if (p.v > INSTRUMENTS_VERSION) return { ...emptyInstruments(), foreign: true };
  const out: Instrument[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const x of p.instruments) {
    const ok = validInstrument(x);
    if (!ok || seen.has(tagKey(ok.tag))) {
      dropped += 1;
      continue;
    }
    seen.add(tagKey(ok.tag));
    out.push(ok);
  }
  return { instruments: sortInstruments(out).slice(0, MAX_INSTRUMENTS), foreign: false, dropped };
}

const sortInstruments = (xs: Instrument[]) => xs.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true }));

// ------------------------------------------------------------ where each one stands

export type CalState = 'ok' | 'soon' | 'overdue' | 'never' | 'out';
/** How soon before it is due an instrument is called out. */
export const DUE_SOON_DAYS = 30;

const utc = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, dd);
};
const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86_400_000);

/** The calibration in force: the newest. */
export const current = (i: Instrument): Calibration | undefined => i.history[0];

export function calState(i: Instrument, today: string): { state: CalState; due: string; daysLeft: number | null } {
  const c = current(i);
  if (i.out) return { state: 'out', due: c?.due ?? '', daysLeft: null };
  if (!c) return { state: 'never', due: '', daysLeft: null };
  const daysLeft = daysBetween(today, c.due);
  return { state: daysLeft < 0 ? 'overdue' : daysLeft <= DUE_SOON_DAYS ? 'soon' : 'ok', due: c.due, daysLeft };
}

export const STATE_WORDS: Record<CalState, string> = { ok: 'In calibration', soon: 'Due soon', overdue: 'Overdue', never: 'Never calibrated', out: 'Out of service' };

/**
 * Whether an instrument was good to read off on a day: in service, with a
 * calibration on or before that day that had not run out. Worked from the
 * history, so a record made last spring is judged by last spring's cert.
 */
export function goodOn(i: Instrument, day: string): { ok: boolean; why: string } {
  if (i.out) return { ok: false, why: `${i.tag} is tagged out of service` };
  const c = i.history.find((x) => x.on <= day);
  if (!c) return { ok: false, why: `${i.tag} had no calibration on ${day}` };
  if (c.due < day) return { ok: false, why: `${i.tag} calibration ran out ${c.due}, before ${day}` };
  return { ok: true, why: `${i.tag} in calibration to ${c.due}` };
}

// ------------------------------------------------------------ changes

export const findInstrument = (r: CalibrationRegister, tag: string): Instrument | undefined => r.instruments.find((i) => tagKey(i.tag) === tagKey(tag));

export type NewInstrument = { tag: string; kind: InstrumentKind; name: string; max: number | null; months: number; note: string; id?: string; out?: boolean };

/** An instrument added or changed, keyed by its tag. */
export function putInstrument(r: CalibrationRegister, x: NewInstrument, now: number): { register: CalibrationRegister; ok: true; id: string } | { register: CalibrationRegister; ok: false; why: string } {
  const clash = findInstrument(r, x.tag);
  if (clash && clash.id !== x.id) return { register: r, ok: false, why: `Tag ${clash.tag} is already on the register.` };
  const had = x.id ? r.instruments.find((i) => i.id === x.id) : undefined;
  if (!had && r.instruments.length >= MAX_INSTRUMENTS) return { register: r, ok: false, why: 'The register is full.' };
  let id = had?.id ?? `in${now.toString(36)}`;
  for (let n = 2; !had && r.instruments.some((i) => i.id === id); n++) id = `in${now.toString(36)}-${n}`;
  const next = validInstrument({ ...had, ...x, id, history: had?.history ?? [], out: x.out ?? had?.out ?? false, createdAt: had?.createdAt ?? now, updatedAt: now });
  if (!next) return { register: r, ok: false, why: 'Give it its tag or serial number.' };
  const instruments = had ? r.instruments.map((i) => (i.id === had.id ? next : i)) : [...r.instruments, next];
  return { register: { ...r, instruments: sortInstruments(instruments) }, ok: true, id };
}

/** Calibrated: a new certificate in force, due the instrument's interval on unless a due day is given. */
export function calibrate(r: CalibrationRegister, id: string, cal: { on: string; due?: string; cert: string; lab: string }, now: number): CalibrationRegister {
  return {
    ...r,
    instruments: r.instruments.map((i) => {
      if (i.id !== id) return i;
      const c = validCal({ on: cal.on, due: cal.due || addMonths(cal.on, i.months), cert: cal.cert, lab: cal.lab });
      if (!c) return i;
      const history = [c, ...i.history.filter((h) => h.on !== c.on)].sort((a, b) => b.on.localeCompare(a.on)).slice(0, MAX_HISTORY);
      return { ...i, history, out: false, updatedAt: now };
    }),
  };
}

export const setOut = (r: CalibrationRegister, id: string, out: boolean, now: number): CalibrationRegister => ({
  ...r,
  instruments: r.instruments.map((i) => (i.id === id ? { ...i, out, updatedAt: now } : i)),
});

export const deleteInstrument = (r: CalibrationRegister, id: string): CalibrationRegister => ({ ...r, instruments: r.instruments.filter((i) => i.id !== id) });

/** The register, worst first: overdue, never calibrated, due soon, in calibration, then out of service. */
export function byUrgency(xs: readonly Instrument[], today: string): Instrument[] {
  const rank: Record<CalState, number> = { overdue: 0, never: 1, soon: 2, ok: 3, out: 4 };
  return [...xs].sort((a, b) => {
    const sa = calState(a, today);
    const sb = calState(b, today);
    return rank[sa.state] - rank[sb.state] || (sa.due || '9').localeCompare(sb.due || '9') || a.tag.localeCompare(b.tag, undefined, { numeric: true });
  });
}

/** What can be read off today, of a kind, soonest-due last so the longest-good is offered first. */
export const usable = (xs: readonly Instrument[], kind: InstrumentKind, today: string): Instrument[] =>
  byUrgency(xs.filter((i) => i.kind === kind && goodOn(i, today).ok), today).reverse();

export const todayKey = (now: number) => dayKey(now);
