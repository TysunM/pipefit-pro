// The bolted joint assembly record
// --------------------------------
// The page ASME PCC-1 Appendix R describes: one joint, everything it was
// bolted with and to, how it was worked and when, and who did it and who
// watched, signatures and all. The turnover package lists every joint on a
// line each; this is the one a QC file holds per joint.
//
// It leads with the state of the joint. An unfinished bolt-up says so in a
// box under the title, and a finished one not yet retightened says that:
// nobody should have to read a record to the bottom to learn it is not done.
//
// The record is built as a body that stands on its own (jointRecordBody), so
// the turnover package can carry one page per joint after its sign-off, and
// as a page of its own (jointRecordHtml) for the joint's share button.
//
// Like the other sheets this lays out and does not decide. Every figure is
// the joint's own, as kept when it was bolted; every value is escaped on the
// way in.

import { clockLabel } from '../calc/days';
import { sigSvg } from '../calc/signature';
import { boltUpProgress, isAsked, isFinished, loadWords, method, planOf, type Round } from '../calc/boltUpSequence';
import { isSteelClass, steelFlange, studLabel, threadsPerInch } from '../calc/steelFlange';
import { isLargeClass, largeFlange, largeWords } from '../calc/largeFlange';
import { boltUp } from '../calc/boltUp';
import { classWords, isCastIron, isDone, jointFlange, jointProgress, type Joint, type SignRole } from '../state/register';
import { CSS, table } from './sheet';
import { esc } from './spoolSvg';

export type WrenchLine = {
  tag: string;
  /** Make and model, or what it is. */
  name: string;
  /** Full scale, ft-lb, where known. */
  max: number | null;
  /** The calibration register's word on it for the day the joint was pulled up. */
  verdict: { ok: boolean; why: string } | null;
};

export type JointRecordInput = {
  joint: Joint;
  /** When it was printed: "Printed 30 Sep 2026". */
  dateLine: string;
  /** The wrench the joint names, as the calibration register has it; null when none is named or it is not on the register. */
  wrench: WrenchLine | null;
  /** The moment it is printed. */
  now: number;
};

const ROLE_LABEL: Record<SignRole, string> = { boltedBy: 'Assembled by', witnessedBy: 'Witnessed by' };

const ORDER_WORDS: Record<Round['order'], string> = {
  across: 'Cross pattern',
  round: 'Round the flange',
  quadrant: 'By quadrant',
  together: 'Together',
};

/** 9/30/2026 9:05 am, the way a form has it. */
export function dayStamp(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${clockLabel(at)}`;
}

/** Rows of label and value, two pairs to a row: the top of a paper form. */
function facts(rows: readonly [string, string][]): string {
  const cells: string[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2);
    cells.push(`<tr>${pair.map(([k, v]) => `<th>${esc(k)}</th><td>${esc(v)}</td>`).join('')}${pair.length < 2 ? '<th></th><td></td>' : ''}</tr>`);
  }
  return `<table class="kv"><tbody>${cells.join('')}</tbody></table>`;
}

/** The bolts of a round in the order they were worked: "1 · 5 · 3 · 7", groups bracketed. */
export function sequenceWords(r: Round, bolts: number): string {
  return r.steps.map((s) => (s.bolts.length === bolts ? 'all' : s.bolts.length === 1 ? String(s.bolts[0]) : `[${s.bolts.join(' ')}]`)).join(' · ');
}

/** The load of a round as the record says it: the torque where there is one, else the percentage or the tensioner pressure. */
export function loadColumn(r: Round, torque: number | null): string {
  const first = r.steps[0];
  if (!first) return '—';
  if (first.pressure) return `Pressure ${[...new Set(r.steps.map((s) => s.pressure))].join('/')}`;
  if (r.kind === 'snug') return '10–20 ft-lb, under 20%';
  const pct = loadWords(first.load);
  return torque !== null ? `${pct} · ${Math.round(torque * first.load)} ft-lb` : pct;
}

/**
 * The rounds as worked: each with its load, its order, the bolts in sequence
 * and when it closed. A check round says how it ended: the only way a check
 * round is followed by another is that a nut turned on it.
 */
export function roundRows(j: Joint): string[][] {
  const rounds = planOf(j.state);
  const finished = isFinished(j.state);
  const lastCheck = rounds.length - 1;
  return rounds.map((r, i) => {
    const closedAt = j.roundsAt[i];
    const current = !finished && i === j.state.round;
    let result = '';
    if (r.kind === 'check') {
      if (closedAt !== undefined) result = i < lastCheck ? 'A nut turned: another round' : 'No nut turned';
      else if (current) result = isAsked(j.state) ? 'Done; answer pending' : 'In progress';
    } else if (current) result = `In progress, step ${j.state.step + 1} of ${r.steps.length}`;
    return [r.label, loadColumn(r, j.torque), ORDER_WORDS[r.order], sequenceWords(r, j.bolts), closedAt !== undefined ? dayStamp(closedAt) : current ? '—' : 'Not reached', result || (closedAt !== undefined ? (r.gapCheck ? 'Gap checked after' : 'Closed') : '—')];
  });
}

/** The flange in the record's words: the bolting and threads where the table knows them. */
function flangeFacts(j: Joint): [string, string][] {
  if (j.nps !== null && isSteelClass(j.cls)) {
    const f = steelFlange(j.nps, j.cls);
    if (f) return [['Flange', `${f.label} ASME B16.5 class ${j.cls}`], ['Studs', `${f.bolts} × ${studLabel(f.stud)}, ${threadsPerInch(f.stud)} threads per inch`]];
  }
  if (j.nps !== null && isLargeClass(j.cls)) {
    const f = largeFlange(j.nps, j.cls);
    if (f) return [['Flange', `${f.label} ASME ${largeWords(j.cls)}`], ['Studs', `${f.bolts} × ${studLabel(f.stud)}, ${threadsPerInch(f.stud)} threads per inch`]];
  }
  if (j.nps !== null && isCastIron(j.cls)) {
    const f = boltUp(j.nps, j.cls);
    if (f) return [['Flange', `${f.label} class ${j.cls} cast iron, flat face`], ['Bolts', `${f.bolts} × ${f.boltDiameter}" × ${f.boltLength}" on a ${f.boltCircle}" circle`]];
  }
  return [['Flange', `${classWords(j.cls).replace(/^class/, 'Class')}, not in the tables`], ['Bolts', `${j.bolts}, count set by hand`]];
}

/** The record, header to footer, as a block that can sit on a page of its own or in the turnover package. */
export function jointRecordBody(i: JointRecordInput): string {
  const j = i.joint;
  const m = method(j.state.method);
  const done = isDone(j);
  const progress = boltUpProgress(j.state);
  const b = j.bolting;
  const retightened = j.checks.length > 0;
  const last = j.checks[j.checks.length - 1];
  const status = done ? (retightened ? (last?.moved ? 'Bolted up and retightened; bolts took up' : 'Bolted up and retightened; all tight') : 'Bolted up; not yet retightened') : progress.done ? 'Bolt-up not finished' : 'Not started';

  const head = facts([
    ['Joint', j.tag || 'Unnamed'],
    ['Job', j.project || 'No project'],
    ...flangeFacts(j),
    ['Gasket', { unknown: 'Not recorded', soft: 'Soft sheet', spiral: 'Spiral wound', hard: 'Kammprofile or grooved metal', rtj: 'Ring joint' }[j.gasket]],
    ['Method', `${m.name} (${m.from})`],
    ['Bolting spec', b ? b.spec : 'None recorded'],
    ['Stud grade', b ? b.stud : '—'],
    ['Target bolt stress', b ? `${b.stressKsi} ksi on the root area` : '—'],
    ['Nut factor K', b ? `${b.nutFactor}` : '—'],
    ['Lubricant', b ? b.lubricant : '—'],
    ['Final torque', j.torque === null ? 'Not recorded' : `${j.torque} ft-lb`],
    ['Torque wrench', i.wrench ? `${i.wrench.tag}${i.wrench.name ? `, ${i.wrench.name}` : ''}${i.wrench.max ? `, ${i.wrench.max} ft-lb` : ''}` : j.wrench ? `${j.wrench} (not on the calibration register)` : 'Not recorded'],
    ['Calibration', i.wrench?.verdict ? `${i.wrench.verdict.ok ? 'In date' : 'NOT IN DATE'}: ${i.wrench.verdict.why}` : '—'],
    ['Started', j.startedAt !== null ? dayStamp(j.startedAt) : '—'],
    ['Finished', j.completedAt !== null ? dayStamp(j.completedAt) : '—'],
    ['Heats', j.heats.length ? j.heats.join(', ') : '—'],
    ['Note', j.note || '—'],
  ]);

  const rounds = table({
    title: 'Assembly',
    head: ['Round', 'Load', 'Order', 'Bolts in sequence', 'Closed', 'Result'],
    rows: roundRows(j),
    note: `${m.what} The app took each bolt only as the sequence asked for it, and refused any other; the times are when each round closed on the phone.`,
  });

  const checks = table({
    title: 'Retightening',
    head: ['Checked', 'Result', 'Torque', 'Note'],
    right: [2],
    rows: j.checks.length
      ? j.checks.map((c) => [dayStamp(c.at), c.moved ? 'Bolts took up' : 'All tight', c.torque !== null ? `${c.torque} ft-lb` : j.torque !== null ? `${j.torque} ft-lb` : '—', c.note || '—'])
      : [[done ? 'Not yet' : '—', done ? 'Retightening round due after the dwell' : 'Nothing to retighten until the bolt-up is finished', '—', '—']],
  });

  const sign = (['boltedBy', 'witnessedBy'] as const)
    .map((role) => {
      const s = j.signatures[role];
      const svg = sigSvg(s.sig);
      return (
        `<div><span>${esc(ROLE_LABEL[role])}</span>` +
        `<p class="who">${esc(j[role].trim() || ' ')}</p>` +
        `<div class="ink">${svg || ''}</div>` +
        `<em>${s.signedAt !== null ? esc(`Signed ${dayStamp(s.signedAt)}`) : 'Signature · date'}</em></div>`
      );
    })
    .join('');

  const problem = !done ? `OPEN. ${jointProgress(j)}.` : !retightened ? 'Bolted up. The retightening round is not yet recorded.' : last?.moved ? 'Retightened, and bolts took up: another retightening round is due.' : '';
  const name = j.tag || 'Unnamed joint';

  return (
    '<div class="rec">' +
    '<header><div class="titles"><div>' +
    '<h1>Bolted joint assembly record</h1>' +
    `<p class="where">${esc(`${name} · Job ${j.project || 'none'} · ASME PCC-1 Appendix R`)}</p>` +
    `</div><div class="when">${esc(i.dateLine)}</div></div>` +
    `<p class="spec">${esc(`${jointFlange(j)} · ${m.name}`)}</p>` +
    (problem ? `<p class="problem">${esc(problem)}</p>` : '') +
    '</header>' +
    `<div class="totals">${[
      ['Final torque', j.torque === null ? '—' : `${j.torque} ft-lb`],
      ['Target stress', b ? `${b.stressKsi} ksi` : '—'],
      ['Rounds', `${Math.min(j.state.round, planOf(j.state).length)} of ${planOf(j.state).length}`],
      ['Status', status],
    ]
      .map(([k, v]) => `<div><span>${esc(k!)}</span><strong>${esc(v!)}</strong></div>`)
      .join('')}</div>` +
    `<section class="tbl"><h2>Joint</h2>${head}</section>` +
    rounds +
    checks +
    `<section class="sign"><h2>Sign-off</h2><div class="rows">${sign}</div></section>` +
    `<footer>${esc(FOOTER)}</footer>` +
    '</div>'
  );
}

/** The record as a page of its own. */
export function jointRecordHtml(i: JointRecordInput): string {
  const name = i.joint.tag || 'Unnamed joint';
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(`Joint record ${name}`)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}${JOINT_RECORD_CSS}</style></head><body>` +
    jointRecordBody(i) +
    '</body></html>'
  );
}

const FOOTER =
  'Made by PipeFit Pro from the record on the phone that worked the joint. Times are the phone’s clock; signatures were drawn on its screen by the people named. ' +
  'The torque is the figure entered for the joint, worked from the bolting spec where one was on the phone; the app recorded the sequence and did not measure torque. ' +
  'Laid out to the content of ASME PCC-1 Appendix R: the joint, the gasket, the bolting and its lubricant, the target stress and torque, the tooling and its calibration, the pattern and rounds, the retightening, and who assembled and witnessed it.';

/** The record's own styles, scoped to its block so they hold inside the turnover package as on their own page. */
export const JOINT_RECORD_CSS = `
  .rec .kv th { width: 17%; text-transform: none; font-size: 8pt; letter-spacing: 0; background: #F2F2F2; }
  .rec .kv td { width: 33%; }
  .rec .kv tbody tr:nth-child(even) td { background: none; }
  .rec .sign { margin: 8pt 0; break-inside: avoid; }
  .rec .sign .rows { display: flex; gap: 8pt; }
  .rec .sign .rows > div { flex: 1; border: 0.7pt solid #000; padding: 4pt 6pt; }
  .rec .sign span { display: block; font-weight: 700; font-size: 8.5pt; margin: 0; }
  .rec .sign .who { margin: 2pt 0 0; font-size: 9pt; min-height: 11pt; }
  .rec .sign .ink { height: 34pt; border-bottom: 0.6pt solid #000; }
  .rec .sign .ink svg { height: 34pt; width: auto; display: block; }
  .rec .sign em { display: block; font-style: normal; font-size: 7pt; letter-spacing: 0.3pt; text-transform: uppercase; padding-top: 2pt; border-bottom: 0; }
`;
