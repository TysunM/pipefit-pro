// The sheet
// ---------
// What a man carries to the bench. One page: who it is, what pipe it is, the
// drawing in three views, and the figures — the cuts, the fittings, and what to
// pull off the rack.
//
// Everything arriving here is already a string. The units, the fractions and
// the wording belong to the screen that knows what the reader set, and a page
// that re-decided any of that could disagree with the app it came from. So this
// file lays out; it does not compute.
//
// Every value is escaped on the way in. A spool called `Riser <3" & up` is a
// perfectly reasonable thing to type and must not be able to break the page.

import { esc } from './spoolSvg';

export type SheetRow = readonly string[];

export type SheetTable = {
  title: string;
  /** Column headings, left to right. */
  head: SheetRow;
  rows: readonly SheetRow[];
  /** Columns to set right, by index — the figures. */
  right?: readonly number[];
  /** Said under the table, when there is something worth saying. */
  note?: string;
};

export type SheetView = {
  title: string;
  svg: string;
  /**
   * `main` is the big pictorial view; `side` views stack beside it.
   *
   * Three views down the page runs onto a second sheet, and a spool sheet that
   * is two sheets is a spool sheet somebody loses half of.
   */
  slot: 'main' | 'side';
};

export type SheetInput = {
  /** What it is called out by. */
  name: string;
  /** Where it goes. May be empty. */
  place: string;
  /** The pipe, in one line: size, radius, schedule, gap. */
  spec: string;
  /** When the sheet was made. */
  dateLine: string;
  /** The four or five figures worth reading before anything else. */
  totals: readonly { label: string; value: string }[];
  views: readonly SheetView[];
  tables: readonly SheetTable[];
  /** The standing warning about what the figures mean. */
  footer: string;
  /** Said under the title when the spool cannot be built as drawn. */
  problem?: string;
};

const cell = (v: string, tag: 'th' | 'td', right: boolean): string =>
  `<${tag}${right ? ' class="r"' : ''}>${esc(v)}</${tag}>`;

function table(t: SheetTable): string {
  const right = new Set(t.right ?? []);
  const head = t.head.map((h, i) => cell(h, 'th', right.has(i))).join('');
  const rows = t.rows
    .map((r) => `<tr>${r.map((v, i) => cell(v, 'td', right.has(i))).join('')}</tr>`)
    .join('');
  return (
    `<section class="tbl"><h2>${esc(t.title)}</h2>` +
    `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>` +
    (t.note ? `<p class="note">${esc(t.note)}</p>` : '') +
    '</section>'
  );
}

/**
 * The page style.
 *
 * A4, hairlines, and no colour: this gets printed on whatever is in the site
 * office. The drawing frames and the table rules are the only furniture,
 * because everything else on a spool sheet is a figure somebody needs.
 */
const CSS = `
  @page { size: A4; margin: 12mm 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font: 9.5pt/1.4 Helvetica, Arial, sans-serif; color: #000; margin: 0; }
  header { border-bottom: 1.4pt solid #000; padding-bottom: 3pt; margin-bottom: 5pt; }
  .titles { display: flex; align-items: baseline; justify-content: space-between; gap: 10pt; }
  h1 { font-size: 16pt; margin: 0; letter-spacing: -0.3pt; }
  .where { font-size: 9pt; margin: 1pt 0 0; }
  .when { font-size: 8pt; text-align: right; white-space: nowrap; }
  .spec { font-size: 9pt; font-weight: 700; margin: 2pt 0 0; letter-spacing: 0.2pt; }
  .problem { border: 1pt solid #000; padding: 3pt 5pt; margin: 4pt 0 0; font-weight: 700; }
  .totals { display: flex; gap: 0; margin: 0 0 5pt; border: 0.7pt solid #000; }
  .totals div { flex: 1; padding: 2.5pt 5pt; border-left: 0.7pt solid #000; }
  .totals div:first-child { border-left: 0; }
  .totals span { display: block; font-size: 6.5pt; letter-spacing: 0.4pt; text-transform: uppercase; }
  .totals strong { font-size: 11.5pt; }
  .views { display: flex; gap: 4pt; margin: 0 0 6pt; align-items: flex-start; }
  .views .main { flex: 0 0 60%; }
  .views .side { flex: 1; display: flex; flex-direction: column; gap: 4pt; min-width: 0; }
  .view { border: 0.7pt solid #000; }
  .view h3 { font-size: 7pt; letter-spacing: 0.5pt; text-transform: uppercase; margin: 0;
             padding: 1.5pt 4pt; border-bottom: 0.7pt solid #000; }
  .tbl { margin: 0 0 6pt; break-inside: avoid; }
  h2 { font-size: 9.5pt; margin: 0 0 2pt; letter-spacing: 0.2pt; }
  table { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
  th, td { border: 0.6pt solid #000; padding: 1.8pt 4pt; text-align: left; }
  th { font-weight: 700; font-size: 7.5pt; letter-spacing: 0.3pt; text-transform: uppercase; }
  td.r, th.r { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:nth-child(even) td { background: #F2F2F2; }
  .note { font-size: 7.5pt; margin: 1.5pt 0 0; }
  footer { border-top: 0.7pt solid #000; padding-top: 3pt; font-size: 7.5pt; }
`;

/** The whole sheet, as one self-contained page. */
export function spoolSheetHtml(i: SheetInput): string {
  const totals = i.totals
    .map((x) => `<div><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`)
    .join('');
  const one = (v: SheetView) => `<div class="view"><h3>${esc(v.title)}</h3>${v.svg}</div>`;
  const main = i.views.filter((v) => v.slot === 'main').map(one).join('');
  const side = i.views.filter((v) => v.slot === 'side').map(one).join('');
  const views = main || side ? `<div class="main">${main}</div><div class="side">${side}</div>` : '';

  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(i.name)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}</style></head><body>` +
    '<header><div class="titles"><div>' +
    `<h1>${esc(i.name)}</h1>` +
    (i.place ? `<p class="where">${esc(i.place)}</p>` : '') +
    `</div><div class="when">${esc(i.dateLine)}</div></div>` +
    `<p class="spec">${esc(i.spec)}</p>` +
    (i.problem ? `<p class="problem">${esc(i.problem)}</p>` : '') +
    '</header>' +
    (totals ? `<div class="totals">${totals}</div>` : '') +
    (views ? `<div class="views">${views}</div>` : '') +
    i.tables.map(table).join('') +
    `<footer>${esc(i.footer)}</footer>` +
    '</body></html>'
  );
}
