// The orbital program and run sheets
// ----------------------------------
// A program on one page, to sit by the power supply: the tube and the head,
// every level, the sequence, the tungsten and the gas, and the figures the
// equations give on it. And a weld's run sheet: the steps as they were done,
// the oxygen read, the look at the weld and how it came out.

import type { Equation } from '../calc/orbitalEquations';
import { clock, levelAverage, levelSeconds, programFigures, programTimes, programWarnings } from '../calc/orbitalProgram';
import { INSPECT, faultOf, runSteps } from '../calc/orbitalRun';
import type { ReportCheck } from '../calc/orbitalReport';
import type { WeldReportRead } from '../ai/weldReport';
import { usDate, dayKey } from '../calc/days';
import { gearName, tubeLabel, type Gear, type Program, type Run } from '../state/orbitalBook';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

const f3 = (v: number | null | undefined, unit = ''): string => (v === null || v === undefined ? '—' : `${Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 10 ? v.toFixed(2) : v.toFixed(3)}${unit ? ` ${unit}` : ''}`);
const plain = (v: number | null | undefined, unit = ''): string => (v === null || v === undefined ? '—' : `${v}${unit ? ` ${unit}` : ''}`);

function page(title: string, where: string, when: string, problems: string[], body: string, foot: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(title)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}</style></head><body>` +
    `<header><div class="titles"><div><h1>${esc(title)}</h1>` +
    `<p class="where">${esc(where)}</p></div>` +
    `<div class="when">${esc(when)}</div></div>` +
    (problems.length ? `<p class="problem">${problems.map(esc).join('<br>')}</p>` : '') +
    '</header>' +
    `<main>${body}</main>` +
    `<footer>${esc(foot)}</footer>` +
    '</body></html>'
  );
}

export function programHtml(p: Program, head: Gear | undefined, supply: Gear | undefined, equations: readonly Equation[], today: string, signedBy?: string): string {
  const t = programTimes(p);
  const figs = programFigures(p, head, equations);
  const levels = p.levels.map((l, i) => [`L${i + 1}`, plain(l.deg, '°'), plain(l.rpm), plain(l.ip, 'A'), l.ib < l.ip ? plain(l.ib, 'A') : '—', l.ib < l.ip ? `${l.tp} / ${l.tb} s` : '—', f3(levelAverage(l), 'A'), clock(levelSeconds(l))]);
  const setup = [
    ['Tube', tubeLabel(p) || '—'],
    ['Weld head', head ? `${gearName(head)}${head.serial ? `, SN ${head.serial}` : ''}` : '—'],
    ['Power supply', supply ? `${gearName(supply)}${supply.serial ? `, SN ${supply.serial}` : ''}` : '—'],
    ['Tungsten', `${f3(p.tungsten.dia, 'in')} ${p.tungsten.kind}, gap ${f3(p.tungsten.gap, 'in')}`],
    ['Shield gas', `${p.gas.shield || '—'} ${plain(p.gas.shieldCfh, 'CFH')}`],
    ['ID purge', `${p.gas.purge || '—'} ${plain(p.gas.purgeCfh, 'CFH')}, oxygen under ${plain(p.gas.o2Max, 'ppm')}`],
    ['Sequence', `prepurge ${plain(p.seq.prepurge, 's')}, upslope ${plain(p.seq.upslope, 's')}, rotation delay ${plain(p.seq.delay, 's')}, downslope ${plain(p.seq.downslope, 's')}, postpurge ${plain(p.seq.postpurge, 's')}`],
    ['Overlap', plain(p.overlap, '°')],
    ['Times', `round ${clock(t.weld)}, arc on ${clock(t.arc)}, gas on to off ${clock(t.total)}`],
    ['Status', p.status === 'qualified' ? `Qualified to ${p.wps}${p.coupon ? `, coupon ${p.coupon}` : ''}${p.qualifiedAt ? `, ${usDate(dayKey(p.qualifiedAt))}` : ''}` : 'In development: coupons only'],
    ...(signedBy ? [['Signed', signedBy]] : []),
  ];
  const worked = [
    ...figs.program.map((f) => [f.label, f3(f.value, f.unit), f.name]),
    ...figs.levels.flatMap((fs, i) => fs.map((f) => [`L${i + 1} ${f.label}`, f3(f.value, f.unit), f.name])),
  ];
  const body =
    table({ title: 'Setup', head: ['', ''], rows: setup }) +
    table({ title: 'Levels', head: ['Level', 'Degrees', 'RPM', 'Peak', 'Background', 'Peak / bkg time', 'Average', 'Time'], rows: levels }) +
    (worked.length ? table({ title: 'Worked out', head: ['Figure', 'Value', 'Equation'], rows: worked }) : '') +
    (p.note ? `<p>${esc(p.note)}</p>` : '');
  return page(
    p.name,
    `${tubeLabel(p)} · version ${p.version}`,
    usDate(today),
    programWarnings(p, supply, head, today),
    body,
    'Made by PipeFit Pro from the orbital program on the phone. Check every level on the power supply against this sheet before welding; the qualified WPS is the record.',
  );
}

/** The power supply's report beside the program, level by level, and what is worth a look. */
function reportTable(rep: WeldReportRead, c: ReportCheck): string {
  const both = (x: { read: number; program: number; pct: number } | null, places = 0) => (x ? `${x.read.toFixed(places)} (${x.program.toFixed(places)}, ${x.pct > 0 ? '+' : ''}${x.pct.toFixed(0)}%)` : '—');
  const rows = c.levels.map((l) => [`L${l.level}`, both(l.ip), both(l.ib), both(l.rpm, 1), l.volts !== null ? l.volts.toFixed(1) : '—', l.heat !== null ? `${Math.round(l.heat)}${l.wps ? ` (${l.wps === 'in' ? 'in WPS' : l.wps === 'low' ? 'under WPS' : 'over WPS'})` : ''}` : '—']);
  const title = `Weld report${rep.figures === 'programmed' ? ' (set figures)' : rep.figures === 'actual' ? ' (as welded)' : ''}${rep.program ? `: program ${rep.program}` : ''}${rep.weldNo ? `, weld ${rep.weldNo}` : ''}`;
  return table({ title, head: ['Level', 'Peak A (program)', 'Bkg A (program)', 'RPM (program)', 'Volts', 'Heat input J/in'], rows }) + (c.notes.length ? `<p class="problem">${c.notes.map(esc).join('<br>')}</p>` : '');
}

export function runHtml(r: Run, p: Program, head: Gear | undefined, supply: Gear | undefined, equations: readonly Equation[], sulphur?: string, report?: ReportCheck, signedBy?: string): string {
  const steps = runSteps(p, supply, head, equations, r);
  const done = new Set(r.checks);
  const rows = steps.map((s) => [done.has(s.id) ? '✓' : '☐', s.title, s.detail]);
  const look = INSPECT.map((i) => [done.has(i.id) ? '✓' : '☐', i.text]);
  const facts = [
    ['Program', `${r.programName}, version ${r.version}`],
    ...(signedBy ? [['Program signed', signedBy]] : []),
    ['Weld', `${r.kind === 'coupon' ? 'Coupon' : 'Production weld'} ${r.weld || '—'}`],
    ['Job / line', [r.project, r.line].filter(Boolean).join(' / ') || '—'],
    ['Heats', [r.heatA, r.heatB].filter(Boolean).join(' to ') || '—'],
    ...(sulphur ? [['Sulphur', sulphur]] : []),
    ['Operator', r.operator || '—'],
    ['Oxygen read', plain(r.o2, 'ppm')],
    ['Result', r.result ? r.result.toUpperCase() : 'Not recorded'],
  ];
  const faults = r.faults.map((id) => faultOf(id)).filter((f): f is NonNullable<typeof f> => !!f);
  const body =
    table({ title: 'The weld', head: ['', ''], rows: facts }) +
    table({ title: 'Steps', head: ['', 'Step', 'For this weld'], rows }) +
    table({ title: 'Inspection', head: ['', 'Looked at'], rows: look }) +
    (faults.length ? table({ title: 'What it showed', head: ['Fault', 'First moves'], rows: faults.map((f) => [f.label, f.moves.join(' ')]) }) : '') +
    (r.report && report ? reportTable(r.report, report) : '') +
    (r.note ? `<p>${esc(r.note)}</p>` : '');
  return page(
    `${r.kind === 'coupon' ? 'Coupon' : 'Weld'} ${r.weld || ''}`.trim(),
    `${r.programName} v${r.version}`,
    usDate(dayKey(r.at)),
    [],
    body,
    "Made by PipeFit Pro from the orbital run sheet on the phone. Acceptance is to the job's spec; this sheet records what was looked at, not the limits.",
  );
}
