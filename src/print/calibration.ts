// The calibration register, on paper
// ----------------------------------
// What an auditor asks to see: every instrument, its range, the calibration in
// force with its certificate, when it is due, and anything overdue or never
// calibrated said at the top. Black on white, the same page as the others.

import { STATE_WORDS, byUrgency, calState, current, kindOf, type Instrument } from '../state/calibration';
import { usDate } from '../calc/days';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

export function calibrationHtml(i: { title: string; instruments: readonly Instrument[]; today: string }): string {
  const xs = byUrgency(i.instruments, i.today);
  const bad = xs.filter((x) => ['overdue', 'never'].includes(calState(x, i.today).state));
  const rows = xs.map((x) => {
    const c = current(x);
    const k = kindOf(x.kind);
    return [x.tag, k.label, x.name || '—', x.max ? `${x.max} ${k.unit}`.trim() : '—', c ? usDate(c.on) : '—', c ? usDate(c.due) : '—', c?.cert || '—', c?.lab || '—', STATE_WORDS[calState(x, i.today).state]];
  });
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(i.title)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}</style></head><body>` +
    `<header><div class="titles"><div><h1>${esc(i.title)}</h1>` +
    `<p class="where">${esc(`${xs.length} instruments`)}</p></div>` +
    `<div class="when">${esc(usDate(i.today))}</div></div>` +
    (bad.length ? `<p class="problem">${bad.map((x) => esc(`${x.tag}: ${STATE_WORDS[calState(x, i.today).state].toLowerCase()}`)).join('<br>')}</p>` : '') +
    '</header>' +
    `<main>${table({ title: 'Instruments', head: ['Tag', 'Kind', 'Make / model', 'Range', 'Calibrated', 'Due', 'Certificate', 'Lab', 'State'], rows })}</main>` +
    '<footer>Made by PipeFit Pro from the calibration register on the phone. Dates are as entered from each certificate; the certificate itself is the record.</footer>' +
    '</body></html>'
  );
}
