// The pressure test record
// ------------------------
// The page QC signs and the owner keeps, laid out the way a test package's
// own form is: what was tested and to what, on which gauges, the hold and its
// readings, the walk-down, what was found, and who says so — signatures and
// all — with the boundary isos at the back.
//
// It leads with the result, and a failed or open test says so in a box under
// the title: nobody should have to read to the bottom of a test record to
// find out it failed. The code checks are printed too, the ones that passed
// as well as the ones that did not, so the page shows what was checked.
//
// Like the other sheets this lays out and does not decide. Every value is
// escaped on the way in.

import { clockLabel, dayLabel, usDate } from '../calc/days';
import { HoldState, TestCheck, checkTest, codeRule, holdState, prelimPsi, reliefMax, requiredHold } from '../calc/pressureTest';
import { sigSvg } from '../calc/signature';
import type { PressureTest } from '../state/pressureLog';
import { CODE_LABEL, KIND_LABEL, RESULT_LABEL, ROLE_LABEL, heldMinutes, signers, stepsFor, testName } from '../state/pressureLog';
import type { SavedSketch } from '../state/sketchStore';
import { sketchToSvg } from '../state/sketchStore';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

export type TestRecordInput = {
  test: PressureTest;
  /** When it was printed: "Printed 30 Sep 2026". */
  dateLine: string;
  /** The isos the test names, as saved; ones since deleted are simply not here. */
  isos: readonly SavedSketch[];
  /** Dot spacing the isos are drawn at. */
  grid: number;
  /** The moment it is printed, for a hold still running. */
  now: number;
};

const psi = (v: number | null) => (v === null ? '—' : `${v} psi`);
const deg = (v: number | null) => (v === null ? '—' : `${v}°F`);
const mins = (v: number) => `${Math.round(v * 10) / 10} min`;
const LEVEL_WORD: Record<TestCheck['level'], string> = { stop: 'FIX', warn: 'CHECK', ok: 'OK' };

/** Rows of label and value, two pairs to a row: the top of a paper form. */
function facts(rows: readonly [string, string][]): string {
  const cells: string[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2);
    cells.push(
      `<tr>${pair.map(([k, v]) => `<th>${esc(k)}</th><td>${esc(v)}</td>`).join('')}${pair.length < 2 ? '<th></th><td></td>' : ''}</tr>`,
    );
  }
  return `<table class="kv"><tbody>${cells.join('')}</tbody></table>`;
}

/** The hold, drawn: pressure against time, with the test pressure dashed across it. */
export function holdChartSvg(t: PressureTest): string {
  const pts: { at: number; psi: number }[] = [];
  if (t.hold.startAt !== null && t.hold.startPsi !== null) pts.push({ at: t.hold.startAt, psi: t.hold.startPsi });
  pts.push(...t.readings);
  if (t.hold.endAt !== null && t.hold.endPsi !== null) pts.push({ at: t.hold.endAt, psi: t.hold.endPsi });
  if (pts.length < 2) return '';
  const W = 520;
  const H = 150;
  const L = 52;
  const B = 22;
  const t0 = pts[0]!.at;
  const t1 = Math.max(pts[pts.length - 1]!.at, t0 + 60_000);
  const vals = [...pts.map((p) => p.psi), ...(t.testPsi !== null ? [t.testPsi] : [])];
  const pad = Math.max(2, (Math.max(...vals) - Math.min(...vals)) * 0.25);
  const lo = Math.max(0, Math.floor(Math.min(...vals) - pad));
  const hi = Math.ceil(Math.max(...vals) + pad);
  const x = (at: number) => L + ((at - t0) / (t1 - t0)) * (W - L - 8);
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (H - B - 8);
  const line = pts.map((p) => `${x(p.at).toFixed(1)},${y(p.psi).toFixed(1)}`).join(' ');
  const dots = pts.map((p) => `<circle cx="${x(p.at).toFixed(1)}" cy="${y(p.psi).toFixed(1)}" r="2.2" fill="#000"/>`).join('');
  const test =
    t.testPsi !== null
      ? `<line x1="${L}" x2="${W - 8}" y1="${y(t.testPsi).toFixed(1)}" y2="${y(t.testPsi).toFixed(1)}" stroke="#000" stroke-width="0.8" stroke-dasharray="4 3"/>` +
        `<text x="${W - 10}" y="${(y(t.testPsi) - 3).toFixed(1)}" text-anchor="end" font-size="8">test ${t.testPsi} psi</text>`
      : '';
  const font = 'font-family="Helvetica, Arial, sans-serif"';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" ${font}>` +
    `<rect x="${L}" y="8" width="${W - L - 8}" height="${H - B - 8}" fill="none" stroke="#000" stroke-width="0.7"/>` +
    `<text x="${L - 4}" y="12" text-anchor="end" font-size="8">${hi}</text>` +
    `<text x="${L - 4}" y="${H - B}" text-anchor="end" font-size="8">${lo}</text>` +
    `<text x="10" y="${(H - B) / 2 + 4}" font-size="8" transform="rotate(-90 10 ${(H - B) / 2 + 4})" text-anchor="middle">psi</text>` +
    `<text x="${L}" y="${H - 6}" font-size="8">${esc(clockLabel(t0))}</text>` +
    `<text x="${W - 8}" y="${H - 6}" text-anchor="end" font-size="8">${esc(clockLabel(t1))} · ${esc(mins((t1 - t0) / 60000))}</text>` +
    test +
    `<polyline points="${line}" fill="none" stroke="#000" stroke-width="1.4"/>${dots}</svg>`
  );
}

function holdLine(s: HoldState, need: number | null): string {
  if (s.phase === 'ready') return 'Not started';
  const held = mins(s.elapsedMs / 60000);
  if (s.phase === 'holding') return `Running at printing: ${held}${need !== null ? ` of ${need} min` : ''}`;
  return `${held}${need !== null ? (s.met ? ` (needs ${need} min: met)` : ` (needs ${need} min: SHORT)`) : ''}`;
}

export function testRecordHtml(i: TestRecordInput): string {
  const t = i.test;
  const rule = codeRule(t.code, t.kind, t.designPsi);
  const need = requiredHold(t);
  const checks = checkTest(t);
  const held = heldMinutes(t);
  const top = reliefMax(t);
  const prelim = prelimPsi(t);
  const name = testName(t);

  const limits =
    rule.min !== null
      ? rule.max !== null
        ? `${rule.min}–${rule.max} psi (${rule.minWhy} to ${rule.maxWhy})`
        : `at least ${rule.min} psi (${rule.minWhy})`
      : t.code === 'spec'
        ? 'Per the job spec'
        : 'No design pressure entered';

  const head = facts([
    ['Package', name],
    ['Job', t.project || 'No project'],
    ['Test date', dayLabel(t.day)],
    ['Code', CODE_LABEL[t.code]],
    ['Test', KIND_LABEL[t.kind]],
    ['Medium', t.medium || '—'],
    ['Design pressure', psi(t.designPsi)],
    ['Design temperature', deg(t.designTemp)],
    ['Test pressure', psi(t.testPsi)],
    ['Code limits', limits],
    ['Test temperature', deg(t.testTemp)],
    ['Hold required', need === null ? '—' : `${need} min`],
    ['Relief valve', t.reliefPsi === null ? (t.reliefTag || '—') : `${t.reliefTag ? `${t.reliefTag}, ` : ''}set ${t.reliefPsi} psi`],
    ['Relief limit', top === null ? '—' : `${top} psi (B31.3 pneumatic)`],
    ...(prelim !== null ? ([['Preliminary check', `${Math.round(prelim * 10) / 10} psi, then up in steps`], ['Examine at', psi(t.designPsi)]] as [string, string][]) : []),
  ]);

  const system = t.system
    ? `<section class="tbl"><h2>What is in the test</h2><p class="system">${esc(t.system).replace(/\n/g, '<br>')}</p></section>`
    : '';

  const gauges = table({
    title: 'Test gauges',
    head: ['Gauge', 'Range', 'Calibration due'],
    right: [1],
    rows: t.gauges.length ? t.gauges.map((g, n) => [g.id || `Gauge ${n + 1}`, psi(g.range), g.calDue ? usDate(g.calDue) : '—']) : [['None recorded', '—', '—']],
  });

  const events: string[][] = [];
  if (t.hold.startAt !== null) events.push(['Hold started', clockLabel(t.hold.startAt), psi(t.hold.startPsi)]);
  for (const r of t.readings) events.push(['Reading', clockLabel(r.at), psi(r.psi)]);
  if (t.hold.endAt !== null) events.push(['Hold ended', clockLabel(t.hold.endAt), psi(t.hold.endPsi)]);
  const change =
    t.hold.startPsi !== null && t.hold.endPsi !== null
      ? ` Pressure change over the hold: ${t.hold.endPsi - t.hold.startPsi >= 0 ? '+' : '−'}${Math.abs(Math.round((t.hold.endPsi - t.hold.startPsi) * 10) / 10)} psi.`
      : '';
  const hold = table({
    title: 'Hold',
    head: ['Event', 'Time', 'Gauge'],
    right: [2],
    rows: events.length ? events : [['Not started', '—', '—']],
    note: `Held: ${holdLine(holdState(t, i.now), need)}.${change}`,
  });
  const chart = holdChartSvg(t);

  const walk = table({
    title: 'Walk-down',
    head: ['', 'Step', 'Done'],
    rows: stepsFor(t.kind).map((s) => [s.when === 'before' ? 'Before' : 'After', s.text, t.steps.includes(s.id) ? '✓' : '—']),
  });

  const found = table({
    title: 'Result',
    head: ['Result', 'Found', 'Notes'],
    rows: [[RESULT_LABEL[t.result].toUpperCase(), t.leaks || (t.result === 'pass' ? 'No leaks' : '—'), t.notes || '—']],
  });

  const checked = table({
    title: 'Checked by the app',
    head: ['', 'Check'],
    rows: checks.length ? checks.map((c) => [LEVEL_WORD[c.level], c.text]) : [['—', 'Nothing to check yet.']],
    note: 'Code figures are the ASME minimums as built into PipeFit Pro. The test package, the engineer and the inspector govern.',
  });

  const sign = signers(t)
    .map(({ role, signer }) => {
      const svg = sigSvg(signer.sig);
      return (
        `<div><span>${esc(ROLE_LABEL[role])}</span>` +
        `<p class="who">${esc(signer.name || ' ')}</p>` +
        `<div class="ink">${svg || ''}</div>` +
        `<em>${signer.signedAt !== null ? esc(`Signed ${dayStamp(signer.signedAt)}`) : 'Signature · date'}</em></div>`
      );
    })
    .join('');

  const result = t.result === 'fail' ? 'FAILED. A retest is needed before this package can be signed.' : t.result === 'open' ? 'OPEN. Not yet signed off.' : '';
  const isos = i.isos.filter((s) => s.strokes.length > 0);
  const drawings = isos
    .map(
      (s, n) =>
        `<section class="iso"><h2>Boundary iso ${n + 1} of ${isos.length}: ${esc(s.name)}${s.place ? ` · ${esc(s.place)}` : ''}</h2>` +
        `<div class="frame">${sketchToSvg(s, i.grid)}</div></section>`,
    )
    .join('');

  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(`Pressure test record ${name}`)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}${EXTRA}</style></head><body>` +
    '<header><div class="titles"><div>' +
    '<h1>Pressure test record</h1>' +
    `<p class="where">${esc(`${name} · Job ${t.project || 'none'}`)}</p>` +
    `</div><div class="when">${esc(i.dateLine)}</div></div>` +
    `<p class="spec">${esc(`${KIND_LABEL[t.kind]} test · ${CODE_LABEL[t.code]} · ${t.medium || 'medium not recorded'}`)}</p>` +
    (result ? `<p class="problem">${esc(result)}</p>` : '') +
    '</header>' +
    `<div class="totals">${[
      ['Test pressure', psi(t.testPsi)],
      ['Design pressure', psi(t.designPsi)],
      ['Held', held === null ? '—' : mins(held)],
      ['Result', RESULT_LABEL[t.result]],
    ]
      .map(([k, v]) => `<div><span>${esc(k!)}</span><strong>${esc(v!)}</strong></div>`)
      .join('')}</div>` +
    `<section class="tbl"><h2>Test</h2>${head}</section>` +
    system +
    gauges +
    hold +
    (chart ? `<section class="tbl chart"><h2>Pressure through the hold</h2>${chart}</section>` : '') +
    walk +
    found +
    checked +
    `<section class="sign"><h2>Sign-off</h2><div class="rows">${sign}</div></section>` +
    `<footer>${esc(FOOTER)}</footer>` +
    drawings +
    '</body></html>'
  );
}

/** When it was signed, the way a form has it: 9/30/2026 9:05 am. */
function dayStamp(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${clockLabel(at)}`;
}

const FOOTER =
  'Made by PipeFit Pro from the record on the phone that ran the test. Times are the phone’s clock; signatures were drawn on its screen by the people named. ' +
  'ASME B31.3 asks that the record of a test give its date, the piping tested, the test fluid, the test pressure and the examiner’s certification of the result.';

const EXTRA = `
  .kv th { width: 17%; text-transform: none; font-size: 8pt; letter-spacing: 0; background: #F2F2F2; }
  .kv td { width: 33%; }
  .kv tbody tr:nth-child(even) td { background: none; }
  .system { margin: 0; border: 0.6pt solid #000; padding: 3pt 5pt; font-size: 8.5pt; }
  .chart svg { display: block; border: 0.6pt solid #000; }
  .sign { margin: 8pt 0; break-inside: avoid; }
  .sign .rows { display: flex; gap: 8pt; }
  .sign .rows > div { flex: 1; border: 0.7pt solid #000; padding: 4pt 6pt; }
  .sign span { display: block; font-weight: 700; font-size: 8.5pt; }
  .sign .who { margin: 2pt 0 0; font-size: 9pt; min-height: 11pt; }
  .sign .ink { height: 34pt; border-bottom: 0.6pt solid #000; }
  .sign .ink svg { height: 34pt; width: auto; display: block; }
  .sign em { display: block; font-style: normal; font-size: 7pt; letter-spacing: 0.3pt; text-transform: uppercase; padding-top: 2pt; }
  .iso { break-before: page; }
  .iso .frame { border: 0.7pt solid #000; }
  .iso svg { display: block; width: 100%; height: auto; max-height: 235mm; }
`;
