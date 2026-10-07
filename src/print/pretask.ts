// The pre-task plan, on paper
// ---------------------------
// The sheet the safety office files and an auditor reads: the task, the
// hazards and the control for each, the permits and the PPE, where to run to,
// the toolbox talk, and every signature. Black on white like the others.

import { Plan, isClosed, planGaps } from '../state/pretask';
import { dayLabel, usDate, dayKey } from '../calc/days';
import { sigSvg } from '../calc/signature';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

const CSS_MORE = `
  .sig svg { width: 60pt; height: 20pt; vertical-align: middle; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4pt 10pt; margin: 0 0 6pt; }
  .grid div { border: 0.7pt solid #000; padding: 3pt 5pt; }
  .grid span { display: block; font-size: 6.5pt; letter-spacing: 0.4pt; text-transform: uppercase; }
  .talk { border: 0.7pt solid #000; padding: 3pt 5pt; margin: 0 0 6pt; white-space: pre-wrap; }
`;

const when = (at: number) => `${usDate(dayKey(at))} ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

export function pretaskHtml(i: { plan: Plan; printedAt: number }): string {
  const p = i.plan;
  const gaps = planGaps(p);
  const title = `Pre-task plan · ${dayLabel(p.day)}${p.project ? ` · ${p.project}` : ''}`;
  const cell = (label: string, value: string) => `<div><span>${esc(label)}</span>${esc(value || '—')}</div>`;
  const crewRows = p.crew.map((c) => `<tr><td>${esc(c.name)}</td><td class="sig">${c.sig ? sigSvg(c.sig) : 'not signed'}</td><td>${c.at ? esc(when(c.at)) : '—'}</td></tr>`).join('');
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(title)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}${CSS_MORE}</style></head><body>` +
    `<header><div class="titles"><div><h1>${esc(title)}</h1>` +
    `<p class="where">${esc(isClosed(p) ? `Closed by ${p.foreman.name}, ${when(p.foreman.signedAt!)}` : 'Open: not yet signed by the foreman')}</p></div>` +
    `<div class="when">${esc(`Printed ${usDate(dayKey(i.printedAt))}`)}</div></div>` +
    (gaps.length ? `<p class="problem">${esc(`Still wanted: ${gaps.join('; ')}`)}</p>` : '') +
    '</header><main>' +
    `<div class="grid">${cell('Task', p.task)}${cell('Area', p.area)}${cell('Permits', p.permits.join(', '))}${cell('PPE beyond the basics', p.ppe.join(', '))}${cell('Muster point', p.muster)}${cell('Emergency: eyewash, extinguisher, first aid, rescue', p.emergency)}</div>` +
    (p.hazards.length ? table({ title: 'Hazards and controls', head: ['Hazard', 'Control'], rows: p.hazards.map((h) => [h.label, h.control || '—']) }) : '') +
    `<section class="tbl"><h2>${esc(`Toolbox talk${p.talk.topic ? `: ${p.talk.topic}` : ''}`)}</h2><div class="talk">${esc(p.talk.notes || 'No notes.')}</div></section>` +
    `<section class="tbl"><h2>Crew sign-in: I was at the talk and understand the plan</h2><table><thead><tr><th>Name</th><th>Signature</th><th>When</th></tr></thead><tbody>${crewRows || '<tr><td colspan="3">Nobody signed in.</td></tr>'}</tbody></table></section>` +
    `<section class="tbl"><h2>Foreman</h2><table><tbody><tr><td>${esc(p.foreman.name || '—')}</td><td class="sig">${p.foreman.sig ? sigSvg(p.foreman.sig) : 'not signed'}</td><td>${p.foreman.signedAt ? esc(when(p.foreman.signedAt)) : '—'}</td></tr></tbody></table></section>` +
    '</main><footer>Made by PipeFit Pro from the pre-task plan on the foreman\'s phone. Signatures were drawn on the phone at the times shown. Stop-work authority: anyone on this crew can stop the work.</footer>' +
    '</body></html>'
  );
}
