// The cut list, on paper
// ---------------------
// For the saw: one table per pipe with a box to tick, the mark, the length
// to cut and what it was worked from, then the sticks to pull for what is
// still to cut. Black on white, the same page as the other sheets.

import type { CutGroup } from '../state/cutLog';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

export function cutSheetHtml(i: { title: string; groups: readonly CutGroup[]; length: (inches: number) => string; stock: number; kerf: number }): string {
  const parts: string[] = [];
  for (const g of i.groups) {
    parts.push(
      table({
        title: g.pipe,
        head: ['Cut', 'Mark', 'Cut length', 'C-C', 'Ends'],
        right: [2, 3],
        rows: g.cuts.map((c) => [c.done ? '✓' : '☐', c.mark, i.length(c.cut), i.length(c.c2c), c.ends || '—']),
      }),
    );
    if (g.toGo && g.plan.ok) {
      parts.push(
        table({
          title: `Pull for ${g.pipe}: ${g.plan.count} stick${g.plan.count === 1 ? '' : 's'} of ${i.length(i.stock)}`,
          head: ['Stick', 'Marks off it, longest first', 'Drop'],
          right: [2],
          rows: g.plan.sticks.map((s) => [String(s.number), s.pieces.map((p) => `${p.tag ?? p.label} (${i.length(p.length)})`).join(', '), i.length(s.drop)]),
          note: `Each cut allows ${i.length(i.kerf)} for the saw.`,
        }),
      );
    } else if (g.toGo && !g.plan.ok) {
      parts.push(`<p class="note">${esc(g.plan.error)}</p>`);
    }
  }
  const done = i.groups.reduce((n, g) => n + g.cuts.length - g.toGo, 0);
  const all = i.groups.reduce((n, g) => n + g.cuts.length, 0);
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(i.title)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}</style></head><body>` +
    `<header><div class="titles"><div><h1>${esc(i.title)}</h1>` +
    `<p class="where">${esc(`${all - done} to cut, ${done} cut`)}</p></div>` +
    `<div class="when">${esc(new Date().toLocaleDateString())}</div></div></header>` +
    `<main>${parts.join('')}</main>` +
    '<footer>Made by PipeFit Pro from the cut list on the phone. Every length is worked from the takeouts shown in Cut Length; check the fitting in hand before you cut.</footer>' +
    '</body></html>'
  );
}
