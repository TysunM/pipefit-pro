// The cut list
// ------------
// Cut Length works one cut at a time, and a fitter works a run: six, ten,
// twenty pieces worked off an iso before anybody goes near the saw. Written
// on cardboard, that list is where a 45 1/2 becomes a 41 1/2. So each cut
// worked can be added here with a mark to write on the pipe, and the list goes
// to the saw as it is: grouped by pipe, ticked off as cut, and packed onto
// sticks so the rack is pulled once.
//
// Kept on the phone and tagged by job like everything else (project.ts).
// Everything here is pure; cuts.tsx binds it to the shared store.

import { CutPiece, planCuts, type CutPlan } from '../calc/cutList';
import { cleanProject, sameProject } from './project';

export const CUTS_VERSION = 1;
/** A big job's list, and then some. Past it the oldest finished cut goes first. */
export const MAX_CUTS = 400;
export const MARK_MAX = 16;

export type Cut = {
  id: string;
  /** What is written on the pipe: "7", "L12-3". Never empty. */
  mark: string;
  /** Groups the list: the pipe as `${material}:${wall}|${nps}`. */
  pipeKey: string;
  /** The pipe as read: `2" CS SCH 40`. */
  pipe: string;
  /** Inches. */
  c2c: number;
  /** Inches: what the saw cuts. */
  cut: number;
  /** What is on each end, as read: "90° LR elbow × Open end". */
  ends: string;
  done: boolean;
  createdAt: number;
  /** The Project ID active when it was added; '' for none. */
  project: string;
};

export type CutLog = { cuts: Cut[]; foreign: boolean; dropped: number };

export const emptyCuts = (): CutLog => ({ cuts: [], foreign: false, dropped: 0 });

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export function validCut(v: unknown): Cut | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  const mark = text(v.mark, MARK_MAX);
  const pipeKey = text(v.pipeKey, 60);
  if (!mark || !pipeKey) return null;
  if (!isNum(v.cut) || v.cut <= 0 || v.cut > 10_000) return null;
  if (!isNum(v.c2c) || v.c2c <= 0) return null;
  if (!isNum(v.createdAt) || v.createdAt <= 0) return null;
  return {
    id: v.id,
    mark,
    pipeKey,
    pipe: text(v.pipe, 60) || pipeKey,
    c2c: v.c2c,
    cut: v.cut,
    ends: text(v.ends, 120),
    done: v.done === true,
    createdAt: v.createdAt,
    project: cleanProject(v.project),
  };
}

export const serialiseCuts = (l: CutLog): string => JSON.stringify({ v: CUTS_VERSION, cuts: l.cuts });

export function parseCuts(raw: string | null | undefined): CutLog {
  if (!raw) return emptyCuts();
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ...emptyCuts(), dropped: 1 };
  }
  if (!isRec(p) || typeof p.v !== 'number' || !Array.isArray(p.cuts)) return { ...emptyCuts(), dropped: 1 };
  if (p.v > CUTS_VERSION) return { ...emptyCuts(), foreign: true };
  const seen = new Set<string>();
  const cuts: Cut[] = [];
  let dropped = 0;
  for (const c of p.cuts) {
    const ok = validCut(c);
    if (!ok || seen.has(ok.id)) {
      dropped += 1;
      continue;
    }
    seen.add(ok.id);
    cuts.push(ok);
  }
  return { cuts, foreign: false, dropped };
}

/** The next mark on a job: one more than the highest plain number used on it. */
export function nextMark(l: CutLog, project: string): string {
  let top = 0;
  for (const c of l.cuts) if (sameProject(c.project, project) && /^\d+$/.test(c.mark)) top = Math.max(top, Number(c.mark));
  return String(top + 1);
}

export type NewCut = Pick<Cut, 'pipeKey' | 'pipe' | 'c2c' | 'cut' | 'ends'> & { mark?: string };

/** Add a cut to the end of the list. Past the cap, the oldest cut already cut goes; an uncut one never does. */
export function addCut(l: CutLog, c: NewCut, now: number, project = ''): CutLog {
  if (!Number.isFinite(c.cut) || c.cut <= 0 || !Number.isFinite(c.c2c) || c.c2c <= 0) return l;
  const mark = text(c.mark, MARK_MAX) || nextMark(l, project);
  let id = `ct${now.toString(36)}`;
  for (let n = 2; l.cuts.some((x) => x.id === id); n++) id = `ct${now.toString(36)}-${n}`;
  const cut = validCut({ ...c, id, mark, done: false, createdAt: now, project });
  if (!cut) return l;
  let cuts = [...l.cuts, cut];
  while (cuts.length > MAX_CUTS) {
    const i = cuts.findIndex((x) => x.done);
    if (i < 0) return l;
    cuts = [...cuts.slice(0, i), ...cuts.slice(i + 1)];
  }
  return { ...l, cuts };
}

export const toggleCut = (l: CutLog, id: string): CutLog => ({ ...l, cuts: l.cuts.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
export const deleteCut = (l: CutLog, id: string): CutLog => ({ ...l, cuts: l.cuts.filter((c) => c.id !== id) });
/** Take away what is shown: the cut ones, or all of them. */
export const clearCuts = (l: CutLog, shown: readonly Cut[], onlyDone: boolean): CutLog => {
  const gone = new Set(shown.filter((c) => !onlyDone || c.done).map((c) => c.id));
  return { ...l, cuts: l.cuts.filter((c) => !gone.has(c.id)) };
};

export type CutGroup = {
  pipeKey: string;
  pipe: string;
  cuts: Cut[];
  /** The ones still to cut, packed onto sticks. */
  plan: CutPlan;
  toGo: number;
};

/**
 * The list by pipe, in the order each pipe was first added, each with what is
 * still to cut packed onto sticks of the rack's length.
 */
export function cutGroups(cuts: readonly Cut[], stock: number, kerf: number): CutGroup[] {
  const by = new Map<string, Cut[]>();
  for (const c of cuts) by.set(c.pipeKey, [...(by.get(c.pipeKey) ?? []), c]);
  return [...by.entries()].map(([pipeKey, cs]) => {
    const open = cs.filter((c) => !c.done);
    const pieces: CutPiece[] = open.map((c) => ({ id: c.id, label: `Mark ${c.mark}`, tag: c.mark, length: c.cut }));
    return { pipeKey, pipe: cs[0]!.pipe, cuts: cs, plan: planCuts(pieces, stock, kerf), toGo: open.length };
  });
}

/** The list as text for the saw: one pipe to a paragraph, one cut to a line, what is cut marked so. */
export function cutListText(groups: readonly CutGroup[], opts: { title: string; length: (inches: number) => string }): string {
  const out = [opts.title];
  for (const g of groups) {
    const sticks = g.plan.ok && g.toGo ? ` — pull ${g.plan.count} stick${g.plan.count === 1 ? '' : 's'}` : '';
    out.push('', `${g.pipe}${sticks}`);
    for (const c of g.cuts) out.push(`${c.done ? '  ✓ ' : '  ☐ '}${c.mark}: ${opts.length(c.cut)}  (C-C ${opts.length(c.c2c)}${c.ends ? `, ${c.ends}` : ''})`);
  }
  return out.join('\n');
}
