// The WPS ranges
// --------------
// A welding procedure spec sets the window a pass is made in: the amps and
// the volts, the travel speed and, where toughness was qualified, the heat
// input (ASME IX QW-409.1, a supplementary essential variable; AWS D1.1; EN
// ISO 15614-1). The inspector checks a welder's pass against it. This is that
// window, entered once per WPS, or per process and pass of one ("WPS-101
// GTAW root"), and the check the heat input screen runs against it.
//
// Limits are kept in amps, volts, mm/s and J/mm, so a change of units never
// moves one. Kept as records like the bolting specs, so a backup carries the
// QC phone's WPS list to every phone on the crew by the ordinary restore.
//
// The check is made on the figure shown, in the units shown: what the
// screen says is what is checked, and what the inspector reads off it.
//
// A saved heat input keeps a copy of the verdict (Verdict), the WPS name and
// each limit it missed, so a WPS revised or deleted later does not rewrite
// the record of what a pass was checked against.

import { PROCESSES, inHeatUnit, inSpeedUnit, processOf, type HeatUnit, type SpeedUnit } from '../calc/heatInput';

export const WPS_VERSION = 1;
export const MAX_WPS = 50;
export const WPS_NAME_MAX = 40;
export const WPS_NOTE_MAX = 200;

export type Range = { min: number | null; max: number | null };
/** How the WPS takes heat input: ASME IX and AWS D1.1 without a thermal efficiency, EN ISO 15614-1 with the process's k. */
export type Basis = 'asme' | 'iso';
export type Param = 'amps' | 'volts' | 'speed' | 'heat';
export const PARAMS: readonly Param[] = ['amps', 'volts', 'speed', 'heat'];

export type Wps = {
  id: string;
  /** As the document reads: "WPS-101 Rev 2", "WPS-101 GTAW root". */
  name: string;
  /** A process id from calc/heatInput.ts, never 'none'. */
  process: string;
  basis: Basis;
  amps: Range;
  volts: Range;
  /** mm/s. */
  speed: Range;
  /** J/mm, as the basis takes it. */
  heat: Range;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type WpsBook = {
  wps: Wps[];
  /** The WPS the heat input screen checks against, by id; null for none. */
  active: string | null;
  foreign: boolean;
  dropped: number;
};

/** The processes a WPS can name: every one the heat input screen knows, less "None". */
export const WPS_PROCESSES = PROCESSES.filter((p) => p.id !== 'none');
/** The short name: "SMAW", "GTAW". */
export const processShort = (id: string): string => (id === 'paw' ? 'PAW' : id.toUpperCase());

export const BASES: readonly { id: Basis; label: string }[] = [
  { id: 'asme', label: 'ASME IX / AWS, no k' },
  { id: 'iso', label: 'EN ISO, with k' },
];

export const emptyWpsBook = (): WpsBook => ({ wps: [], active: null, foreign: false, dropped: 0 });

const open = (): Range => ({ min: null, max: null });

export function newWps(now: number): Wps {
  return { id: 'new', name: '', process: 'smaw', basis: 'asme', amps: open(), volts: open(), speed: open(), heat: open(), note: '', createdAt: now, updatedAt: now };
}

/** An id a WPS keeps across every phone it is restored onto: its name, slugged, and the moment it was made. */
export function wpsId(name: string, now: number): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'wps';
  return `${slug}-${now.toString(36)}`;
}

// ---------------------------------------------------------------- validation

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isParam = (v: unknown): v is Param => PARAMS.includes(v as Param);
const isProcess = (v: unknown): v is string => WPS_PROCESSES.some((p) => p.id === v);

/** A limit pair: each one positive or open, and the low one no higher than the high one. */
export function validRange(v: unknown): Range | null {
  if (!isRec(v)) return null;
  const min = v.min === null || v.min === undefined ? null : isPos(v.min) ? v.min : undefined;
  const max = v.max === null || v.max === undefined ? null : isPos(v.max) ? v.max : undefined;
  if (min === undefined || max === undefined) return null;
  if (min !== null && max !== null && min > max) return null;
  return { min, max };
}

export function validWps(v: unknown): Wps | null {
  if (!isRec(v)) return null;
  const { id, name, process, basis, note, createdAt, updatedAt } = v;
  if (!isStr(id) || !id || !isStr(name) || !name.trim() || !isStr(note)) return null;
  if (!isProcess(process) || (basis !== 'asme' && basis !== 'iso')) return null;
  if (!Number.isInteger(createdAt) || (createdAt as number) < 0 || !Number.isInteger(updatedAt) || (updatedAt as number) < 0) return null;
  const amps = validRange(v.amps);
  const volts = validRange(v.volts);
  const speed = validRange(v.speed);
  const heat = validRange(v.heat);
  if (!amps || !volts || !speed || !heat) return null;
  return {
    id,
    name: name.trim().slice(0, WPS_NAME_MAX),
    process,
    basis,
    amps,
    volts,
    speed,
    heat,
    note: note.slice(0, WPS_NOTE_MAX),
    createdAt: createdAt as number,
    updatedAt: updatedAt as number,
  };
}

const hasLimit = (r: Range) => r.min !== null || r.max !== null;

/** Why a WPS cannot be saved as entered, or null when it can. */
export function wpsProblem(w: Wps): string | null {
  if (!w.name.trim()) return 'Give it the WPS number, and the pass if the WPS has more than one window.';
  for (const p of PARAMS) {
    const r = w[p];
    for (const x of [r.min, r.max]) if (x !== null && !isPos(x)) return `${PARAM_LABEL[p]}: a limit is more than zero.`;
    if (r.min !== null && r.max !== null && r.min > r.max) return `${PARAM_LABEL[p]}: the minimum is above the maximum.`;
  }
  if (!PARAMS.some((p) => hasLimit(w[p]))) return 'Put in at least one limit off the WPS: amps, volts, travel speed or heat input.';
  return null;
}

// ---------------------------------------------------------------- the book

export const serialiseWpsBook = (b: WpsBook): string => JSON.stringify({ v: WPS_VERSION, wps: b.wps, active: b.active });

const byName = (ws: Wps[]): Wps[] => ws.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || a.id.localeCompare(b.id));

export function parseWpsBook(raw: string | null | undefined): WpsBook {
  if (!raw) return emptyWpsBook();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyWpsBook(), dropped: 1 };
  }
  if (!isRec(parsed) || !Number.isInteger(parsed.v) || (parsed.v as number) < 1 || !Array.isArray(parsed.wps)) return { ...emptyWpsBook(), dropped: 1 };
  if ((parsed.v as number) > WPS_VERSION) return { ...emptyWpsBook(), foreign: true };
  const wps: Wps[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const x of parsed.wps) {
    const w = validWps(x);
    if (!w || seen.has(w.id)) {
      dropped += 1;
      continue;
    }
    seen.add(w.id);
    wps.push(w);
  }
  const kept = byName(wps).slice(0, MAX_WPS);
  const active = isStr(parsed.active) && kept.some((w) => w.id === parsed.active) ? parsed.active : null;
  return { wps: kept, active, foreign: false, dropped };
}

export const getWps = (b: WpsBook, id: string | null): Wps | undefined => (id === null ? undefined : b.wps.find((w) => w.id === id));
export const activeWps = (b: WpsBook): Wps | null => getWps(b, b.active) ?? null;

/** Save a WPS, new or changed. A full book takes no new one. */
export function putWps(b: WpsBook, w: Wps): { book: WpsBook; ok: boolean } {
  const known = b.wps.some((x) => x.id === w.id);
  if (!known && b.wps.length >= MAX_WPS) return { book: b, ok: false };
  return { book: { ...b, wps: byName([...b.wps.filter((x) => x.id !== w.id), w]) }, ok: true };
}

export const removeWps = (b: WpsBook, id: string): WpsBook => ({ ...b, wps: b.wps.filter((w) => w.id !== id), active: b.active === id ? null : b.active });
export const setActiveWps = (b: WpsBook, id: string | null): WpsBook => ({ ...b, active: getWps(b, id) ? id : null });

// ---------------------------------------------------------------- units

export type Units = { heat: HeatUnit; speed: SpeedUnit };

export const PARAM_LABEL: Record<Param, string> = { amps: 'Amps', volts: 'Volts', speed: 'Travel speed', heat: 'Heat input' };

export const unitOf = (p: Param, u: Units): string => (p === 'amps' ? 'A' : p === 'volts' ? 'V' : p === 'speed' ? u.speed : u.heat);

/** A kept figure (A, V, mm/s, J/mm) in the reader's units. */
export function inUnits(p: Param, v: number, u: Units): number {
  if (p === 'speed') return inSpeedUnit(v, u.speed);
  if (p === 'heat') return inHeatUnit(v, u.heat);
  return v;
}

/** A figure in the reader's units back to the kept one. */
export function fromUnits(p: Param, v: number, u: Units): number {
  if (p === 'speed') return v / inSpeedUnit(1, u.speed);
  if (p === 'heat') return v / inHeatUnit(1, u.heat);
  return v;
}

const commas = (s: string): string => {
  const [whole, frac] = s.split('.');
  return `${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac === undefined ? '' : `.${frac}`}`;
};

/** A limit as it was typed, in the reader's units: no rounding past what a WPS would print. */
export const limitFigure = (v: number): string => commas(String(Number(v.toPrecision(6))));

/** The figure a computed value shows as: three significant figures, or whole above a thousand. */
const asShown = (v: number): number => (Math.abs(v) >= 1000 ? Math.round(v) : Number(v.toPrecision(3)));

/** "150–190 A", "200 A max", "150 A min". */
export function rangeText(p: Param, r: Range, u: Units): string {
  const unit = unitOf(p, u);
  const f = (x: number) => limitFigure(inUnits(p, x, u));
  if (r.min !== null && r.max !== null) return `${f(r.min)}–${f(r.max)} ${unit}`;
  if (r.max !== null) return `${f(r.max)} ${unit} max`;
  if (r.min !== null) return `${f(r.min)} ${unit} min`;
  return '';
}

// ---------------------------------------------------------------- the check

/** The heat input as this WPS takes it: the arc energy, times the process's k where the WPS is to EN ISO. */
export const heatFor = (w: Pick<Wps, 'basis' | 'process'>, arcEnergy: number): number => arcEnergy * (w.basis === 'iso' ? processOf(w.process).k : 1);

/** What a pass measured: amps and volts as typed (null when not), travel mm/s, arc energy J/mm. */
export type Reading = { amps: number | null; volts: number | null; travel: number | null; arcEnergy: number };

/** A limit missed: the limit and the value, both kept figures. */
export type Miss = { param: Param; side: 'low' | 'high'; limit: number; value: number };
/** What a pass was checked against, and how it came out. */
export type Verdict = { name: string; checked: Param[]; out: Miss[] };

export function checkWps(w: Wps, r: Reading, u: Units): Verdict {
  const values: Record<Param, number | null> = { amps: r.amps, volts: r.volts, speed: r.travel, heat: heatFor(w, r.arcEnergy) };
  const checked: Param[] = [];
  const out: Miss[] = [];
  for (const p of PARAMS) {
    const v = values[p];
    const lim = w[p];
    if (v === null || !hasLimit(lim)) continue;
    checked.push(p);
    // Typed figures are checked as typed; worked ones as the screen shows them.
    const shown = p === 'amps' || p === 'volts' ? v : asShown(inUnits(p, v, u));
    const at = (x: number) => Number(inUnits(p, x, u).toPrecision(9));
    if (lim.min !== null && shown < at(lim.min)) out.push({ param: p, side: 'low', limit: lim.min, value: v });
    else if (lim.max !== null && shown > at(lim.max)) out.push({ param: p, side: 'high', limit: lim.max, value: v });
  }
  return { name: w.name, checked, out };
}

/** "Heat input 21.9 kJ/in, over the 20 max". */
export function missText(m: Miss, u: Units): string {
  const value = m.param === 'amps' || m.param === 'volts' ? limitFigure(m.value) : commas(String(asShown(inUnits(m.param, m.value, u))));
  return `${PARAM_LABEL[m.param]} ${value} ${unitOf(m.param, u)}, ${m.side === 'high' ? 'over the' : 'under the'} ${limitFigure(inUnits(m.param, m.limit, u))} ${m.side === 'high' ? 'max' : 'min'}`;
}

/** The verdict in one line: "In range", "Nothing on it to check", or each limit missed. */
export function verdictLine(v: Verdict, u: Units): string {
  if (!v.checked.length) return 'Nothing measured that it sets a limit on';
  if (!v.out.length) return `In range: ${v.checked.map((p) => PARAM_LABEL[p].toLowerCase()).join(', ')}`;
  return v.out.map((m) => missText(m, u)).join('; ');
}

/** A kept verdict, or null when there is none or it does not hold up. */
export function validVerdict(v: unknown): Verdict | null {
  if (!isRec(v) || !isStr(v.name) || !v.name.trim() || !Array.isArray(v.checked) || !Array.isArray(v.out)) return null;
  const checked = PARAMS.filter((p) => (v.checked as unknown[]).includes(p));
  const out: Miss[] = [];
  for (const m of v.out) {
    if (!isRec(m) || !isParam(m.param) || (m.side !== 'low' && m.side !== 'high') || !isPos(m.limit) || !isPos(m.value)) return null;
    if (!checked.includes(m.param) || out.some((o) => o.param === m.param)) return null;
    out.push({ param: m.param, side: m.side, limit: m.limit, value: m.value });
  }
  return { name: v.name.trim().slice(0, WPS_NAME_MAX), checked, out };
}
