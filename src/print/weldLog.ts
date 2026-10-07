// The weld log, on paper
// ----------------------
// What QC hands over with a package: every weld by line with its stamps,
// heats and every examination; each welder's record and continuity; and the
// NDE sampling by lot, with anything still owed said plainly at the top.
// Black on white, the same page as the other sheets.

import { NdeAsk, lotsOf, ndeAsks, repairsDue, summarise } from '../calc/ndeSampling';
import { usDate } from '../calc/days';
import type { Weld, Welder } from '../state/weldLog';
import { continuity, diameterInches, stampsIn, weldName, weldState, welderStats, STATE_LABEL } from '../state/weldLog';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

const fig = (n: number) => `${Math.round(n * 100) / 100}`;

/** The weld log tables, for this sheet and for the turnover package. */
export function weldTables(welds: readonly Weld[], welders: readonly Welder[], today: string, size: (nps: number) => string): string {
  if (!welds.length) return '';
  const lines = [...new Set(welds.map((w) => w.line))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const parts = lines.map((l) =>
    table({
      title: `${l || 'No line'} — ${welds.filter((w) => w.line === l).length} welds`,
      head: ['Weld', 'Date', 'Size', 'Joint', 'Process / WPS', 'Welders', 'Heats', 'NDE', 'State'],
      rows: welds
        .filter((w) => w.line === l)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
        .map((w) => [
          weldName(w),
          usDate(w.day),
          w.nps ? size(w.nps) : '—',
          w.type,
          [w.process, w.wps].filter(Boolean).join(' / '),
          w.welders.join(', ') || '—',
          w.heats.join(', ') || '—',
          w.exams.length ? w.exams.map((e) => `${e.method} ${e.result === 'pending' ? 'picked' : e.result}${e.report ? ` ${e.report}` : ''}`).join('; ') : w.pct ? `${w.pct}% ${w.method} lot` : 'Visual',
          STATE_LABEL[weldState(w)],
        ]),
    }),
  );
  const stamps = stampsIn(welds);
  parts.push(
    table({
      title: 'Welders',
      head: ['Stamp', 'Name', 'Welds', 'Dia-in', 'Shot', 'Rejected', 'Rate', 'Continuity'],
      right: [2, 3, 4, 5, 6],
      rows: stamps.map((s) => {
        const w = welders.find((x) => x.stamp.toUpperCase() === s);
        const st = welderStats(s, welds);
        const cont = w ? continuity(w, welds, today).map((c) => `${c.process} ${c.state === 'lapsed' ? 'LAPSED' : 'to'} ${usDate(c.until)}`).join('; ') || 'no quals' : 'not on roster';
        return [s, w?.name ?? '', String(st.welds), fig(st.diameterInches), String(st.examined), String(st.rejects), st.rate === null ? '—' : `${Math.round(st.rate * 100)}%`, cont];
      }),
    }),
  );
  const lots = lotsOf(welds);
  if (lots.length)
    parts.push(
      table({
        title: 'NDE sampling, ASME B31.3 341.4.1 and 341.3.4',
        head: ['Welder', 'Lot', 'Butt welds', 'Required', 'Picked', 'Shot', 'Rejected', 'Whole lot'],
        right: [2, 3, 4, 5, 6],
        rows: lots.map((lot) => {
          const s = summarise(lot);
          return [lot.stamp, `${lot.pct}% ${lot.method}`, String(lot.welds.length), String(s.required), String(s.picked), String(s.examined), String(s.rejects), s.full ? 'Yes' : 'No'];
        }),
        note: 'A weld made by two welders is in both their lots, and one examination serves both.',
      }),
    );
  return parts.join('');
}

/** What is still owed, worst first, as plain lines. */
export function weldOpenItems(welds: readonly Weld[]): string[] {
  const asks: NdeAsk[] = ndeAsks(welds);
  return [
    ...repairsDue(welds).map((w) => `${w.line ? `${w.line} ` : ''}weld ${weldName(w)}: rejected, to repair and re-examine`),
    ...asks.map((a) => a.text),
    ...welds.filter((w) => weldState(w) === 'picked').map((w) => `${w.line ? `${w.line} ` : ''}weld ${weldName(w)}: picked for ${w.exams[w.exams.length - 1]!.method}, result not in`),
  ];
}

export function weldLogHtml(i: { title: string; welds: readonly Weld[]; welders: readonly Welder[]; today: string; size: (nps: number) => string }): string {
  const open = weldOpenItems(i.welds);
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(i.title)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}</style></head><body>` +
    `<header><div class="titles"><div><h1>${esc(i.title)}</h1>` +
    `<p class="where">${esc(`${i.welds.length} welds · ${fig(diameterInches(i.welds))} diameter-inches`)}</p></div>` +
    `<div class="when">${esc(usDate(i.today))}</div></div>` +
    (open.length ? `<p class="problem">${open.map(esc).join('<br>')}</p>` : '') +
    '</header>' +
    `<main>${weldTables(i.welds, i.welders, i.today, i.size)}</main>` +
    '<footer>Made by PipeFit Pro from the weld log on the phone. Sampling follows ASME B31.3 normal fluid service unless a line is set otherwise; the job spec governs. Continuity per ASME IX QW-322.1, from the dates entered and the welds logged.</footer>' +
    '</body></html>'
  );
}
