// One order for the whole job
// ---------------------------
// A cut list answers one spool. An order answers a job, and the two give
// different numbers for the same pipe.
//
// The reason is the rounding. Every spool ordered on its own rounds up to a
// whole stick, and the part of that last stick it does not use is bought and
// thrown away. Six spools ordered separately round up six times. Ordered
// together they round up once, because a stick does not care which spool its
// pieces belong to — it is the same pipe, and the saw does not know the
// difference.
//
// So every cut from every chosen spool goes into one pile, and the pile is
// packed. What comes back is fewer sticks than the spools asked for
// separately, and the difference is money that was going in a skip.
//
// Two things keep it honest.
//
// Pipe does not pool across sizes or schedules. Two inch schedule forty and
// two inch schedule eighty are different sticks on the rack, and a plan that
// mixed them would have somebody cutting a spool out of the wrong wall. So the
// pile is split by what you actually buy — size and schedule — and each one is
// packed on its own. Radius is left out of that split on purpose: long and
// short radius elbows change the takeouts and so the cut lengths, but the
// pipe the cuts come off is the same pipe.
//
// Every piece stays named. Pooling is only useful if the man at the saw can
// still tell what he is cutting, so each spool takes a mark — A, B, C — and
// every piece off it is that mark and its leg number. `C3` is leg three of the
// third spool on the sheet, and the sheet says which spool that is.

import { ElbowRadius, Schedule, findSize } from './pipe';
import { CutPiece, CutPlan, planCuts } from './cutList';

/** A saved spool, already solved to its cut lengths. */
export type OrderSpool = {
  id: string;
  /** What it is called out by. */
  name: string;
  /** Where it goes. May be empty. */
  place: string;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  /** Cut lengths in leg order. Empty when the spool will not build. */
  cuts: number[];
  /** Why there are no cuts, when there are none. */
  problem?: string;
};

/** One spool's line in a group: what it contributes and what it is marked. */
export type OrderLine = {
  spoolId: string;
  /** A, B, C — what its pieces are stamped with. */
  mark: string;
  name: string;
  place: string;
  kind: ElbowRadius;
  pieces: number;
  /** Length of pipe that ends up in this spool. */
  total: number;
  /** Sticks this spool alone would have needed. */
  alone: number;
};

/** Everything bought as one kind of stick. */
export type OrderGroup = {
  /** `2-40`. Stable, and what the groups are keyed by. */
  key: string;
  nps: number;
  schedule: Schedule;
  /** `2" SCH 40`. */
  label: string;
  lines: OrderLine[];
  plan: CutPlan;
  /** Sticks if every spool here were ordered on its own. */
  apart: number;
  /** Sticks ordered together. */
  together: number;
  /** What pooling saves. Never negative. */
  saved: number;
};

export type OrderSheet = {
  groups: OrderGroup[];
  /** Spools that contributed nothing, and why. Never silently dropped. */
  skipped: { id: string; name: string; why: string }[];
  /** How many spools are actually on the sheet. */
  spools: number;
  pieces: number;
  /** Sticks to buy, all sizes. */
  sticks: number;
  /** Sticks the same spools would have needed one at a time. */
  apart: number;
  /** Sticks saved by ordering together. */
  saved: number;
  /** Length that ends up in the job. */
  inTheJob: number;
  /** Length bought. */
  bought: number;
  /** Every group's packing is provably the fewest sticks. */
  best: boolean;
};

/**
 * The mark for the nth spool on a sheet: A, B, ... Z, AA, AB.
 *
 * Twenty-six is more spools than one order sheet has ever had, but the shelf
 * holds a hundred, and a mark that ran out would put two spools' pieces under
 * the same stamp — which is worse than an ugly mark.
 */
export function markFor(index: number): string {
  let n = Math.max(0, Math.floor(index));
  let out = '';
  for (;;) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
    if (n < 0) return out;
  }
}

/** What you buy it as: size and schedule. Radius changes cuts, not stock. */
const groupKey = (s: Pick<OrderSpool, 'nps' | 'schedule'>): string => `${s.nps}-${s.schedule}`;

const groupLabel = (nps: number, schedule: Schedule): string => `${findSize(nps).label} SCH ${schedule}`;

/**
 * The order for a set of spools.
 *
 * `stock` and `kerf` are the rack and the saw, the same two numbers the single
 * spool cut list uses, so a spool's share of this sheet and its own cut list
 * are the same arithmetic — which is what makes the saving believable rather
 * than a different method dressed up as a result.
 */
export function planOrder(spools: readonly OrderSpool[], stock: number, kerf: number): OrderSheet {
  const skipped: OrderSheet['skipped'] = [];
  const usable: { spool: OrderSpool; mark: string }[] = [];

  // Marks are handed out in the order the spools arrive and only to spools
  // that make it onto the sheet, so the letters on the page run A, B, C with
  // no gaps where something was dropped.
  for (const s of spools) {
    const real = s.cuts.filter((c) => Number.isFinite(c) && c > 0);
    if (s.problem) {
      skipped.push({ id: s.id, name: s.name, why: s.problem });
      continue;
    }
    if (!real.length) {
      skipped.push({ id: s.id, name: s.name, why: 'It has no cuts to order.' });
      continue;
    }
    usable.push({ spool: { ...s, cuts: real }, mark: markFor(usable.length) });
  }

  const byKey = new Map<string, { spool: OrderSpool; mark: string }[]>();
  for (const u of usable) {
    const k = groupKey(u.spool);
    const at = byKey.get(k);
    if (at) at.push(u);
    else byKey.set(k, [u]);
  }

  const groups: OrderGroup[] = [];
  for (const [key, members] of byKey) {
    const first = members[0]!.spool;

    const pieces: CutPiece[] = [];
    const lines: OrderLine[] = [];
    let apart = 0;

    for (const { spool, mark } of members) {
      const mine: CutPiece[] = spool.cuts.map((length, i) => ({
        id: `${spool.id}:${i}`,
        label: `${mark}${i + 1} · ${spool.name} leg ${i + 1}`,
        tag: `${mark}${i + 1}`,
        length,
      }));
      pieces.push(...mine);

      // What this spool alone would have cost. A spool with a piece longer
      // than a stick cannot be ordered at all, here or on its own, so it
      // counts as nothing rather than as a number that flatters the saving.
      const own = planCuts(mine, stock, kerf);
      const alone = own.ok ? own.count : 0;
      apart += alone;

      lines.push({
        spoolId: spool.id,
        mark,
        name: spool.name,
        place: spool.place,
        kind: spool.kind,
        pieces: mine.length,
        total: mine.reduce((t, p) => t + p.length, 0),
        alone,
      });
    }

    const plan = planCuts(pieces, stock, kerf);
    const together = plan.ok ? plan.count : 0;

    groups.push({
      key,
      nps: first.nps,
      schedule: first.schedule,
      label: groupLabel(first.nps, first.schedule),
      lines,
      plan,
      apart,
      together,
      // A failed packing saves nothing. Reporting apart-minus-zero there would
      // claim the whole order as a saving on a sheet that cannot be ordered.
      saved: plan.ok ? Math.max(0, apart - together) : 0,
    });
  }

  // Biggest pipe first: that is the order a rack is walked and the order the
  // money is in.
  groups.sort((a, b) => b.nps - a.nps || a.schedule.localeCompare(b.schedule));

  const ok = groups.filter((g) => g.plan.ok);
  const sum = (f: (g: OrderGroup) => number) => groups.reduce((t, g) => t + f(g), 0);

  return {
    groups,
    skipped,
    spools: usable.length,
    pieces: sum((g) => g.lines.reduce((t, l) => t + l.pieces, 0)),
    sticks: sum((g) => g.together),
    apart: sum((g) => g.apart),
    saved: sum((g) => g.saved),
    inTheJob: ok.reduce((t, g) => t + (g.plan.ok ? g.plan.inTheJob : 0), 0),
    bought: ok.reduce((t, g) => t + (g.plan.ok ? g.plan.bought : 0), 0),
    best: ok.length > 0 && ok.every((g) => g.plan.ok && g.plan.best),
  };
}
