// NDE sampling
// ------------
// ASME B31.3 341.4.1 has normal fluid service examined at random: at least
// five per cent of the circumferential butt welds, with the work of every
// welder in the sample. A line class can ask for more, up to all of them. So
// the welds are taken in lots — one welder's butt welds at one percentage and
// one method — and each lot is asked for its share.
//
// A reject is not the end of it (341.3.4, progressive sampling). Two more of
// that welder's welds from the same lot are examined, the tracers. If both
// pass, the reject is repaired and re-examined, and that is all. If a tracer
// fails, two more for each failed tracer. If one of those fails too, every
// weld in the lot is examined.
//
// Worked from the log alone: an examination remembers why it was picked and
// what it follows up, so what is still owed is always worked out fresh, and
// picking welds or entering results moves it on. Which weld to shoot is
// suggested, not chosen: the same scatter every time for the same lot, so the
// suggestion does not jump around while the inspector looks at it.
//
// Pure.

import type { ExamReason, NdeMethod, Weld } from '../state/weldLog';
import { stampKey, weldName, weldState } from '../state/weldLog';

export type Lot = { key: string; stamp: string; pct: number; method: NdeMethod; welds: Weld[] };

export type NdeAsk = {
  kind: 'random' | 'tracer' | 'lot';
  lot: Lot;
  /** Welds still to pick. */
  count: number;
  reason: ExamReason;
  /** A tracer's: the rejected weld it follows up, and the round. */
  forWeld?: Weld;
  round?: 1 | 2;
  /** Welds that would do, scattered: the first `count` of them are the suggestion. */
  candidates: Weld[];
  text: string;
};

export type LotSummary = { lot: Lot; required: number; picked: number; examined: number; rejects: number; full: boolean };

const initial = (r: ExamReason) => r === 'random' || r === 'spec' || r === 'lot';

/** The butt welds of a job in lots: by welder, percentage and method. A weld two welders made is in both their lots. */
export function lotsOf(welds: readonly Weld[]): Lot[] {
  const by = new Map<string, Lot>();
  for (const w of welds) {
    // Only what is made can be shot: a weld planned on the map is in no lot yet.
    if (w.type !== 'BW' || w.pct <= 0 || !w.day) continue;
    for (const s of w.welders) {
      const key = `${stampKey(s)}|${w.pct}|${w.method}`;
      const lot = by.get(key) ?? { key, stamp: s.toUpperCase(), pct: w.pct, method: w.method, welds: [] };
      lot.welds.push(w);
      by.set(key, lot);
    }
  }
  return [...by.values()].sort((a, b) => a.stamp.localeCompare(b.stamp, undefined, { numeric: true }) || a.pct - b.pct);
}

/** A stable scatter: the same lot always orders its welds the same way. */
function scatter(ws: readonly Weld[], seed: string): Weld[] {
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i += 1) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
    return x >>> 0;
  };
  return [...ws].sort((a, b) => h(seed + a.id) - h(seed + b.id) || a.id.localeCompare(b.id));
}

const fresh = (w: Weld) => w.exams.length === 0;
const tracersOf = (lot: Lot, forId: string, round: 1 | 2) => lot.welds.filter((w) => w.exams.some((e) => e.reason === 'tracer' && e.forWeld === forId && e.round === round));
const rejectedAs = (w: Weld, test: (reason: ExamReason, round: number, forWeld: string) => boolean) =>
  w.exams.some((e) => e.result === 'reject' && test(e.reason, e.round, e.forWeld));

/** How far a lot has got: how many it needs, how many are picked or shot, and whether it has gone to the whole lot. */
export function summarise(lot: Lot): LotSummary {
  const required = lot.pct >= 100 ? lot.welds.length : Math.ceil((lot.welds.length * lot.pct) / 100);
  const picked = lot.welds.filter((w) => w.exams.some((e) => initial(e.reason))).length;
  const examined = lot.welds.filter((w) => w.exams.some((e) => e.result !== 'pending' && e.reason !== 'repair')).length;
  const rejects = lot.welds.filter((w) => rejectedAs(w, (r) => r !== 'repair')).length;
  const full = lot.welds.some((w) => rejectedAs(w, (r, round) => r === 'tracer' && round === 2));
  return { lot, required, picked, examined, rejects, full };
}

const names = (ws: readonly Weld[]) => ws.map((w) => `${w.line ? `${w.line} ` : ''}${weldName(w)}`).join(', ');

/** What a lot still owes: its random share, tracers for every reject, or the whole lot. */
export function lotAsks(lot: Lot): NdeAsk[] {
  const s = summarise(lot);
  const asks: NdeAsk[] = [];
  const free = (except: Weld[] = []) => scatter(lot.welds.filter((w) => fresh(w) && !except.includes(w)), lot.key);
  const label = `${lot.stamp} · ${lot.pct}% ${lot.method}`;

  if (s.full) {
    const left = lot.welds.filter(fresh);
    if (left.length) asks.push({ kind: 'lot', lot, count: left.length, reason: 'lot', candidates: left, text: `${label}: a tracer failed twice over, so every weld in the lot is examined. ${left.length} still to pick.` });
    return asks;
  }

  const random = Math.max(0, s.required - s.picked);
  const c0 = free();
  if (random && c0.length) {
    const c = c0;
    asks.push({
      kind: 'random',
      lot,
      count: Math.min(random, c.length),
      reason: lot.pct >= 100 ? 'spec' : 'random',
      candidates: c,
      text: lot.pct >= 100 ? `${label}: every butt weld. ${random} still to pick.` : `${label}: ${s.required} of ${lot.welds.length} welds. ${random} still to pick.`,
    });
  }

  // Tracers: two for each first-time reject, then two for each failed first tracer.
  for (const w of lot.welds) {
    for (const round of [1, 2] as const) {
      const failed = round === 1 ? rejectedAs(w, (r) => r === 'random' || r === 'spec') : rejectedAs(w, (r, rd) => r === 'tracer' && rd === 1);
      if (!failed) continue;
      const have = tracersOf(lot, w.id, round).length;
      const need = 2 - have;
      if (need <= 0) continue;
      const c = free([w]);
      if (!c.length) continue;
      asks.push({
        kind: 'tracer',
        lot,
        count: Math.min(need, c.length),
        reason: 'tracer',
        forWeld: w,
        round,
        candidates: c,
        text: `Weld ${w.number}${w.line ? ` on ${w.line}` : ''} was rejected: ${round === 1 ? 'two more' : 'two more again'} of ${lot.stamp}'s welds${round === 2 ? ', a tracer having failed' : ''}. ${need} still to pick.`,
      });
    }
  }
  return asks;
}

/** Every ask on a job, worst first: whole lots, then tracers, then the random share. */
export function ndeAsks(welds: readonly Weld[]): NdeAsk[] {
  const order = { lot: 0, tracer: 1, random: 2 } as const;
  return lotsOf(welds)
    .flatMap(lotAsks)
    .sort((a, b) => order[a.kind] - order[b.kind]);
}

/** Welds waiting on a repair, any kind of joint. */
export const repairsDue = (welds: readonly Weld[]): Weld[] => welds.filter((w) => weldState(w) === 'repair');

/** Welds picked and waiting on a result. */
export const pendingExams = (welds: readonly Weld[]): Weld[] => welds.filter((w) => weldState(w) === 'picked');

const REASON_WORD: Record<ExamReason, string> = { random: 'random', tracer: 'tracer', lot: 'whole lot', spec: 'spec', repair: 'repair re-shoot' };

/** The request for the NDE crew: every weld picked and not yet shot, by method. */
export function ndeRequestText(welds: readonly Weld[], opts: { title: string; size: (nps: number) => string }): string {
  const pending = pendingExams(welds);
  const out = [opts.title];
  for (const method of ['RT', 'UT', 'MT', 'PT', 'VT'] as const) {
    const ws = pending.filter((w) => w.exams[w.exams.length - 1]!.method === method);
    if (!ws.length) continue;
    out.push('', `${method} — ${ws.length} weld${ws.length === 1 ? '' : 's'}`);
    for (const w of ws) {
      const e = w.exams[w.exams.length - 1]!;
      out.push(`  ${w.line || '—'}  weld ${weldName(w)}  ${w.nps ? `${opts.size(w.nps)} ` : ''}${w.type}  ${w.welders.join('/') || 'no stamp'}  (${REASON_WORD[e.reason]})`);
    }
  }
  if (out.length === 1) out.push('', 'Nothing picked for examination.');
  return out.join('\n');
}

export { names as weldNames };
