// The fitting library
// -------------------
// Socket (PVC, CPVC) and no-hub fittings take up a length that is the
// maker's, not a standard's: a Spears 2" Sch 40 ell and a Charlotte one are
// not the same, and Sch 80 is not Sch 40. So the takeout of each fitting is
// set once, per line and size — from the maker's sheet or the box, or
// measured off the fitting in hand — and from then on Cut Length uses it.
//
// A line is the material and wall the job is set to ("pvc:40", "ci-soil:CISPI"),
// so Sch 40 and Sch 80 figures never stand in for each other.

import { isRec } from './clean';

export const LIBRARY_VERSION = 1;
export const MAX_FITTINGS = 600;

export type FittingEntry = {
  /** `${line}|${fitting}|${nps}` */
  key: string;
  /** Inches off a centre to centre dimension at that end. */
  takeout: number;
  setAt: number;
};

export type FittingLibrary = { entries: FittingEntry[]; foreign: boolean; dropped: number };

export const emptyLibrary = (): FittingLibrary => ({ entries: [], foreign: false, dropped: 0 });

export const fittingKey = (line: string, fitting: string, nps: number): string => `${line}|${fitting}|${nps}`;

const validEntry = (v: unknown): FittingEntry | null =>
  isRec(v) &&
  typeof v.key === 'string' &&
  /^[a-z0-9-]+:[A-Za-z0-9]+\|[A-Za-z0-9]+\|[0-9.]+$/.test(v.key) &&
  typeof v.takeout === 'number' &&
  Number.isFinite(v.takeout) &&
  v.takeout >= 0 &&
  v.takeout < 100 &&
  typeof v.setAt === 'number'
    ? { key: v.key, takeout: v.takeout, setAt: v.setAt }
    : null;

export function parseLibrary(raw: string | null | undefined): FittingLibrary {
  if (!raw) return emptyLibrary();
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRec(v) || !Array.isArray(v.entries)) return { ...emptyLibrary(), dropped: 1 };
    if (typeof v.version === 'number' && v.version > LIBRARY_VERSION) return { ...emptyLibrary(), foreign: true };
    const entries = v.entries.map(validEntry);
    const kept = entries.filter((e): e is FittingEntry => e !== null);
    return { entries: kept.slice(0, MAX_FITTINGS), foreign: false, dropped: entries.length - kept.length };
  } catch {
    return { ...emptyLibrary(), dropped: 1 };
  }
}

export const serialiseLibrary = (l: FittingLibrary): string => JSON.stringify({ version: LIBRARY_VERSION, entries: l.entries });

export function lookup(l: FittingLibrary, line: string, fitting: string, nps: number): number | undefined {
  return l.entries.find((e) => e.key === fittingKey(line, fitting, nps))?.takeout;
}

/** Set a fitting's takeout. A figure set again replaces the old one; past the cap the oldest goes. */
export function setTakeout(l: FittingLibrary, line: string, fitting: string, nps: number, takeout: number, now: number): FittingLibrary {
  if (!Number.isFinite(takeout) || takeout < 0 || takeout >= 100) return l;
  const key = fittingKey(line, fitting, nps);
  const rest = l.entries.filter((e) => e.key !== key);
  const entries = [{ key, takeout, setAt: now }, ...rest].sort((a, b) => b.setAt - a.setAt).slice(0, MAX_FITTINGS);
  return { ...l, entries };
}

export function clearTakeout(l: FittingLibrary, line: string, fitting: string, nps: number): FittingLibrary {
  const key = fittingKey(line, fitting, nps);
  return { ...l, entries: l.entries.filter((e) => e.key !== key) };
}

// ------------------------------------------------------------ reading it back

export type KeyParts = { line: string; fitting: string; nps: number };

/** A key taken apart, or null if it is not one. */
export function parseKey(key: string): KeyParts | null {
  const m = /^([a-z0-9-]+:[A-Za-z0-9]+)\|([A-Za-z0-9]+)\|([0-9.]+)$/.exec(key);
  const nps = m ? Number(m[3]) : NaN;
  return m && Number.isFinite(nps) && nps > 0 ? { line: m[1]!, fitting: m[2]!, nps } : null;
}

/** Every line with something saved, with how many, most recently set first. */
export function linesIn(l: FittingLibrary): { line: string; count: number }[] {
  const by = new Map<string, { count: number; last: number }>();
  for (const e of l.entries) {
    const p = parseKey(e.key);
    if (!p) continue;
    const cur = by.get(p.line) ?? { count: 0, last: 0 };
    by.set(p.line, { count: cur.count + 1, last: Math.max(cur.last, e.setAt) });
  }
  return [...by.entries()].sort((a, b) => b[1].last - a[1].last).map(([line, v]) => ({ line, count: v.count }));
}

export type SavedTakeout = KeyParts & { takeout: number; setAt: number };

/** One line's figures, by fitting in the order given, then by size. */
export function entriesFor(l: FittingLibrary, line: string, fittingOrder: readonly string[]): SavedTakeout[] {
  const rank = (f: string) => {
    const i = fittingOrder.indexOf(f);
    return i < 0 ? fittingOrder.length : i;
  };
  return l.entries
    .map((e) => ({ p: parseKey(e.key), e }))
    .filter((x): x is { p: KeyParts; e: FittingEntry } => x.p !== null && x.p.line === line)
    .map(({ p, e }) => ({ ...p, takeout: e.takeout, setAt: e.setAt }))
    .sort((a, b) => rank(a.fitting) - rank(b.fitting) || a.fitting.localeCompare(b.fitting) || a.nps - b.nps);
}

/** Everything saved for a line, gone. */
export function clearLine(l: FittingLibrary, line: string): FittingLibrary {
  return { ...l, entries: l.entries.filter((e) => parseKey(e.key)?.line !== line) };
}

/**
 * A line's figures as plain text, to send to the foreman or another fitter:
 * one fitting to a paragraph, one size to a line.
 */
export function libraryText(
  rows: readonly SavedTakeout[],
  opts: { title: string; fittingName: (id: string) => string; size: (nps: number) => string; length: (inches: number) => string },
): string {
  const out = [`${opts.title} — takeouts`];
  let last = '';
  for (const r of rows) {
    if (r.fitting !== last) {
      out.push('', opts.fittingName(r.fitting));
      last = r.fitting;
    }
    out.push(`  ${opts.size(r.nps)}  ${opts.length(r.takeout)}`);
  }
  return out.join('\n');
}
