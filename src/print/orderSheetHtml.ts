// The order sheet, on paper
// -------------------------
// What gets handed to whoever buys the pipe, and what goes to the saw with it.
// Those are two readers of one page, and they want different halves of it: the
// buyer needs the stick count per size and nothing else, the man cutting needs
// to know which piece belongs to which spool.
//
// So the page leads with the order — sizes and counts, the first table, the
// one a supplier can be read down a phone — and everything after it is the
// working: which spools are on the sheet and what each is marked, then every
// stick with the pieces that come off it.
//
// As with the spool sheet, everything arriving here is already a string. The
// units, the fractions and the wording belong to the screen that knows what
// the reader set. This file lays out; it does not compute.

import { OrderSheet } from '../calc/orderSheet';
import { SheetTable, spoolSheetHtml } from './sheet';

export type OrderSheetInput = {
  sheet: OrderSheet;
  /** The rack, as a phrase: `20 in`. */
  stock: string;
  /** What the saw takes. */
  kerf: string;
  dateLine: string;
  /** A length with its unit, for figures that are read. */
  length: (inches: number) => string;
  /** A length on its own, for figures that are only glanced at. */
  short: (inches: number) => string;
};

export function orderSheetHtml(i: OrderSheetInput): string {
  const { sheet, length, short } = i;
  const s = (n: number) => `${n} × ${i.stock}`;

  const tables: SheetTable[] = [];

  // The order itself. First on the page because it is the only table most
  // readers of this sheet will read.
  // Both a stick count and a total, because pipe is sold either way and the
  // sheet should not need arithmetic done to it at the counter.
  tables.push({
    title: 'To buy',
    head: ['Pipe', 'Sticks', 'Total length', 'One at a time', 'Saved'],
    right: [1, 2, 3, 4],
    rows: sheet.groups.map((g) => [
      g.label,
      g.plan.ok ? String(g.together) : '—',
      g.plan.ok ? length(g.together * g.plan.stockLength) : 'cannot be ordered',
      String(g.apart),
      g.saved > 0 ? String(g.saved) : '—',
    ]),
    note:
      sheet.saved > 0
        ? `Ordering these together buys ${sheet.sticks} stick${sheet.sticks === 1 ? '' : 's'} instead of ${sheet.apart}: ${sheet.saved} fewer. A stick does not care which spool its pieces belong to, only that the pipe matches.`
        : 'These spools already fill their own sticks, so ordering them together buys no fewer than ordering them one at a time.',
  });

  // Who is on the sheet, and what their pieces are stamped with. Without this
  // the marks on the sticks below mean nothing.
  tables.push({
    title: 'Spools on this order',
    head: ['Mark', 'Spool', 'Where', 'Pipe', 'Pieces', 'In the spool'],
    right: [4, 5],
    rows: sheet.groups.flatMap((g) =>
      g.lines.map((l) => [
        l.mark,
        l.name,
        l.place || '—',
        `${g.label} ${l.kind}`,
        String(l.pieces),
        length(l.total),
      ])
    ),
  });

  // The cutting. One table per kind of stick, because a stick of one size is
  // not a stick of another and a man at the saw should never have to notice.
  for (const g of sheet.groups) {
    if (!g.plan.ok) {
      tables.push({
        title: `${g.label} — cannot be ordered`,
        head: ['Problem'],
        rows: [[g.plan.error]],
      });
      continue;
    }
    tables.push({
      title: `${g.label} — cut from ${s(g.together)}`,
      head: ['Stick', 'Pieces off it', 'Used', 'Left'],
      right: [2, 3],
      rows: g.plan.sticks.map((stick) => [
        String(stick.number),
        stick.pieces.map((p) => `${p.tag ?? p.label} ${short(p.length)}`).join('   '),
        short(stick.used),
        stick.drop < 0.01 ? '—' : short(stick.drop),
      ]),
      note:
        g.plan.longestDrop >= 12
          ? `Longest drop ${length(g.plan.longestDrop)} — that one goes back on the rack.`
          : 'Nothing left over is long enough to keep.',
    });
  }

  // Anything left off, and why. A spool missing from an order without a line
  // saying so is a spool that turns up missing at the bench instead.
  if (sheet.skipped.length)
    tables.push({
      title: 'Left off',
      head: ['Spool', 'Why'],
      rows: sheet.skipped.map((k) => [k.name, k.why]),
    });

  return spoolSheetHtml({
    name: 'Order sheet',
    place: `${sheet.spools} spool${sheet.spools === 1 ? '' : 's'} · ${sheet.pieces} piece${sheet.pieces === 1 ? '' : 's'}`,
    spec: `Stock ${i.stock} · saw ${i.kerf} a cut`,
    dateLine: i.dateLine,
    totals: [
      { label: 'Sticks', value: String(sheet.sticks) },
      { label: 'One at a time', value: String(sheet.apart) },
      { label: 'Saved', value: sheet.saved > 0 ? String(sheet.saved) : '—' },
      { label: 'In the job', value: length(sheet.inTheJob) },
      { label: 'Bought', value: length(sheet.bought) },
    ],
    views: [],
    tables,
    footer:
      'Cut lengths are centre to centre less the fitting takeouts and the weld gaps, and every piece is charged a saw kerf. ' +
      'Marks are the spool letter and the leg number: A3 is leg three of spool A. Check one cut against the drawing before cutting the rest.',
    problem: sheet.groups.some((g) => !g.plan.ok)
      ? 'Some of this order cannot be filled as drawn — see the tables below.'
      : undefined,
  });
}
