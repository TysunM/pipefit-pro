// The turnover package
// --------------------
// What a job hands over at the end: every pressure test and how it went, every
// flange bolted up and how, every heat that went into them and whether its
// cert is in hand, the isos, the level readings and the spools — for one job,
// on paper, with a line for QC and the supervisor to sign.
//
// It leads with what is still open, because the question a turnover answers
// is not "what was done" but "what can we prove, and what is missing". A page
// of green ticks that buries one uncertified heat on page four is worse than
// no package at all.
//
// Like the other sheets this lays out and does not decide: the records arrive
// already filtered to the job, and every value is escaped on the way in.

import type { Heat } from '../calc/heat';
import { HEAT_FORMS, normaliseHeat, traceability } from '../calc/heat';
import { findSize } from '../calc/pipe';
import type { Reading } from '../state/levelLog';
import type { Joint } from '../state/register';
import { isDone, isSettled, jointFlange, jointProgress, lastCheck } from '../state/register';
import type { SavedSketch } from '../state/sketchStore';
import { sketchToSvg } from '../state/sketchStore';
import type { SavedSpool } from '../state/spoolStore';
import type { PressureTest } from '../state/pressureLog';
import { KIND_LABEL, RESULT_LABEL, heldMinutes, isSigned, testName } from '../state/pressureLog';
import { dayLabel } from '../calc/days';
import { CSS, SheetTable, table } from './sheet';
import type { Weld, Welder } from '../state/weldLog';
import { weldName } from '../state/weldLog';
import { weldOpenItems, weldTables } from './weldLog';
import { type Instrument, findInstrument, goodOn } from '../state/calibration';
import { dayKey } from '../calc/days';
import { toScreen } from '../calc/iso';
import { esc } from './spoolSvg';

export type TurnoverInput = {
  /** The job it is for; '' when it covers every job on the phone. */
  job: string;
  dateLine: string;
  /** Named joints only — never the scratch slot. */
  joints: readonly Joint[];
  /** The whole heat book: a heat is looked up here, not filtered by job. */
  heats: readonly Heat[];
  sketches: readonly SavedSketch[];
  readings: readonly Reading[];
  spools: readonly SavedSpool[];
  /** Every pressure test on the job, every attempt. */
  tests: readonly PressureTest[];
  /** Dot spacing the isos are drawn at. */
  grid: number;
  /** The job's welds, and the roster their stamps are read against. */
  welds?: readonly Weld[];
  welders?: readonly Welder[];
  /** The calibration register: each joint's wrench is judged against it on the day it was finished. */
  instruments?: readonly Instrument[];
};

export type OpenItem = { what: string; needs: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A date the way it is written on a form: 27 Sep 2026. */
export const day = (at: number): string => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const name = (j: Joint) => j.tag || 'Untitled joint';

/** Every heat the job's joints name, found in the book or not, with the joints it went into. */
export function heatsUsed(joints: readonly Joint[], book: readonly Heat[]): { number: string; heat: Heat | undefined; joints: string[] }[] {
  const byKey = new Map<string, { number: string; heat: Heat | undefined; joints: string[] }>();
  for (const j of joints)
    for (const h of j.heats) {
      const k = normaliseHeat(h);
      const hit = byKey.get(k);
      if (hit) {
        if (!hit.joints.includes(name(j))) hit.joints.push(name(j));
        continue;
      }
      const heat = book.find((x) => normaliseHeat(x.heat) === k);
      byKey.set(k, { number: heat?.heat ?? h, heat, joints: [name(j)] });
    }
  return [...byKey.values()].sort((a, b) => a.number.localeCompare(b.number));
}

/** Whether a failed test has a later attempt at the same package. */
const retestOf = (t: PressureTest, all: readonly PressureTest[]) => all.find((x) => x.id !== t.id && x.pkg.toUpperCase() === t.pkg.toUpperCase() && x.attempt > t.attempt);

/**
 * The punch list: everything that stops the package being signed, in the
 * order it gets chased — tests not passed, work not finished, then checks not
 * done, then records nobody signed, then paper not in hand.
 */
export function openItems(joints: readonly Joint[], book: readonly Heat[], tests: readonly PressureTest[] = [], welds: readonly Weld[] = [], instruments: readonly Instrument[] = []): OpenItem[] {
  const out: OpenItem[] = [];
  for (const t of tests) {
    if (t.result === 'fail' && !retestOf(t, tests)) out.push({ what: testName(t), needs: 'Pressure test failed; no retest recorded' });
    else if (t.result === 'open') out.push({ what: testName(t), needs: 'Pressure test not signed off' });
    else if (t.result === 'pass' && !isSigned(t.people.examiner)) out.push({ what: testName(t), needs: `Examiner${t.people.examiner.name ? ` ${t.people.examiner.name}` : ''} has not signed the test record` });
  }
  for (const j of joints) if (!isDone(j)) out.push({ what: name(j), needs: `Bolt-up not finished: ${jointProgress(j)}` });
  for (const j of joints)
    if (isDone(j) && !isSettled(j)) {
      const last = lastCheck(j);
      out.push({ what: name(j), needs: last?.moved ? 'Bolts took up on the last re-check; check again' : 'Re-check at temperature not recorded' });
    }
  for (const j of joints) {
    if (!isDone(j)) continue;
    const missing = [!j.boltedBy.trim() && 'who bolted it', !j.witnessedBy.trim() && 'a witness'].filter(Boolean);
    if (missing.length) out.push({ what: name(j), needs: `Sign-off: ${missing.join(' and ')} not recorded` });
  }
  for (const j of joints) if (!j.heats.length) out.push({ what: name(j), needs: 'No heat number recorded' });
  // A wrench out of calibration on the day voids the torque on the record.
  for (const j of joints) {
    if (!isDone(j) || !j.wrench) continue;
    const w = findInstrument({ instruments: [...instruments], foreign: false, dropped: 0 }, j.wrench);
    if (!w) continue;
    const good = goodOn(w, dayKey(j.completedAt!));
    if (!good.ok) out.push({ what: name(j), needs: `Torque wrench: ${good.why}` });
  }
  for (const u of heatsUsed(joints, book)) {
    if (!u.heat) out.push({ what: `Heat ${u.number}`, needs: `Not in the heat book; no cert on file (${u.joints.join(', ')})` });
    else if (!u.heat.certified) out.push({ what: `Heat ${u.number}`, needs: `MTR not in hand${u.heat.mtr ? ` (filed as ${u.heat.mtr})` : ''} (${u.joints.join(', ')})` });
  }
  for (const needs of weldOpenItems(welds)) out.push({ what: 'Weld log', needs });
  // Heats welded in that the joints did not already account for.
  const counted = new Set(heatsUsed(joints, book).map((u) => normaliseHeat(u.number)));
  const weldHeats = new Map<string, string[]>();
  for (const w of welds) for (const h of w.heats) if (!counted.has(normaliseHeat(h))) weldHeats.set(normaliseHeat(h), [...(weldHeats.get(normaliseHeat(h)) ?? []), `weld ${weldName(w)}`]);
  for (const [h, unsorted] of weldHeats) {
    const where = [...unsorted].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const heat = book.find((x) => normaliseHeat(x.heat) === h);
    if (!heat) out.push({ what: `Heat ${h}`, needs: `Not in the heat book; no cert on file (${where.join(', ')})` });
    else if (!heat.certified) out.push({ what: `Heat ${h}`, needs: `MTR not in hand (${where.join(', ')})` });
  }
  return out;
}

/** The figures across the top of the first page. */
export function turnoverTotals(i: TurnoverInput): { label: string; value: string }[] {
  const done = i.joints.filter(isDone).length;
  const settled = i.joints.filter(isSettled).length;
  const trace = traceability(i.joints, i.heats);
  const packages = new Set(i.tests.map((t) => t.pkg.toUpperCase()));
  const passed = new Set(i.tests.filter((t) => t.result === 'pass').map((t) => t.pkg.toUpperCase()));
  return [
    ...(i.tests.length ? [{ label: 'Tests passed', value: `${passed.size} / ${packages.size}` }] : []),
    { label: 'Bolted up', value: `${done} / ${i.joints.length}` },
    { label: 'Re-checked', value: `${settled} / ${done}` },
    { label: 'Heats proved', value: `${trace.proved.length} / ${i.joints.length}` },
    ...(i.welds?.length ? [{ label: 'Welds', value: String(i.welds.length) }] : []),
    { label: 'Open items', value: String(openItems(i.joints, i.heats, i.tests, i.welds, i.instruments).length) },
  ];
}

function status(j: Joint): string {
  if (isSettled(j)) return 'Complete, re-checked';
  return jointProgress(j);
}

export function turnoverHtml(i: TurnoverInput): string {
  const job = i.job || 'All jobs';
  const open = openItems(i.joints, i.heats, i.tests, i.welds, i.instruments);
  const used = heatsUsed(i.joints, i.heats);
  const isos = i.sketches.filter((s) => s.strokes.length > 0);
  const tables: SheetTable[] = [];

  tables.push({
    title: 'Open items',
    head: ['Item', 'Needed before sign-off'],
    rows: open.length ? open.map((o) => [o.what, o.needs]) : [['None', 'Every test is passed and signed, every joint is bolted up and re-checked, and every heat has its cert in hand.']],
  });

  if (i.tests.length)
    tables.push({
      title: 'Pressure tests',
      head: ['Package', 'Test', 'Pressure', 'Held', 'Date', 'Result', 'Examined by', 'Witnessed by'],
      right: [2, 3],
      rows: i.tests.map((t) => {
        const held = heldMinutes(t);
        return [
          testName(t),
          `${KIND_LABEL[t.kind]}${t.medium ? `, ${t.medium.toLowerCase()}` : ''}`,
          t.testPsi === null ? '—' : `${t.testPsi} psi`,
          held === null ? '—' : `${Math.floor(held)} min`,
          dayLabel(t.day),
          RESULT_LABEL[t.result].toUpperCase(),
          t.people.examiner.name ? `${t.people.examiner.name}${isSigned(t.people.examiner) ? '' : ' (unsigned)'}` : '—',
          t.people.witness.name || '—',
        ];
      }),
      note: 'Each test has a record of its own, with the gauges, the hold readings, the walk-down and the signatures. Every attempt is listed; a failed test stays in the record beside its retest.',
    });

  if (i.joints.length)
    tables.push({
      title: 'Flange bolt-up record',
      head: ['Joint', 'Flange', 'Final torque', 'Wrench', 'Status', 'Finished', 'Bolted by', 'Witnessed by', 'Heats'],
      right: [2],
      rows: i.joints.map((j) => [
        name(j),
        jointFlange(j),
        j.torque === null ? '—' : `${j.torque} ft-lb`,
        j.wrench || '—',
        status(j),
        j.completedAt === null ? '—' : day(j.completedAt),
        j.boltedBy.trim() || '—',
        j.witnessedBy.trim() || '—',
        j.heats.length ? j.heats.join(', ') : '—',
      ]),
      note: 'Four passes in the cross pattern: 30%, 60% and 100% of final torque, then a check pass round the circle at 100%.',
    });

  const checks = i.joints.flatMap((j) => j.checks.map((c) => ({ j, c })));
  if (checks.length)
    tables.push({
      title: 'Re-torque checks',
      head: ['Joint', 'Checked', 'Result', 'Torque', 'Note'],
      right: [3],
      rows: checks
        .sort((a, b) => a.c.at - b.c.at)
        .map(({ j, c }) => [
          name(j),
          day(c.at),
          c.moved ? 'Bolts took up' : 'All tight',
          c.torque !== null ? `${c.torque} ft-lb` : j.torque !== null ? `${j.torque} ft-lb` : '—',
          c.note || '—',
        ]),
    });

  if (used.length)
    tables.push({
      title: 'Material traceability',
      head: ['Heat', 'Material', 'Form', 'Size', 'Mill', 'MTR', 'Cert', 'Joints'],
      rows: used.map(({ number, heat, joints }) => [
        number,
        heat?.material || '—',
        heat ? (HEAT_FORMS.find((f) => f.id === heat.form)?.label ?? heat.form) : '—',
        heat?.nps != null ? `${findSize(heat.nps).label}${heat.schedule ? ` SCH ${heat.schedule}` : ''}` : '—',
        heat?.mill || '—',
        heat?.mtr || '—',
        heat ? (heat.certified ? 'In hand' : 'OWED') : 'NOT IN BOOK',
        joints.join(', '),
      ]),
    });

  if (i.readings.length)
    tables.push({
      title: 'Level readings',
      head: ['Pipe', 'Slope', 'Fall', 'Taken'],
      right: [1, 2],
      rows: i.readings.map((r) => [
        r.tag,
        `${r.slope < 0 ? '−' : ''}${Math.abs(r.slope).toFixed(1)}°`,
        `${r.inPerFt < 0 ? '−' : ''}${Math.abs(r.inPerFt).toFixed(3)} in/ft`,
        day(r.createdAt),
      ]),
    });

  if (i.spools.length)
    tables.push({
      title: 'Spools',
      head: ['Mark', 'Location', 'Pipe', 'Legs', 'Saved'],
      right: [3],
      rows: i.spools.map((s) => [s.name, s.place || '—', `${findSize(s.nps).label} ${s.kind} SCH ${s.schedule}`, String(s.legs.length), day(s.updatedAt)]),
    });

  const totals = turnoverTotals(i)
    .map((x) => `<div><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`)
    .join('');

  const drawings = isos
    .map(
      (s, n) =>
        `<section class="iso"><h2>Iso ${n + 1} of ${isos.length}: ${esc(s.name)}${s.place ? ` · ${esc(s.place)}` : ''}</h2>` +
        `<p class="note">Last changed ${esc(day(s.updatedAt))}</p><div class="frame">${sketchToSvg(s, i.grid, 'SW', undefined, [], (i.welds ?? []).filter((w) => w.sketchId === s.id && w.mapAt).map((w) => ({ at: toScreen(w.mapAt!, 'SW', i.grid), text: weldName(w) })))}</div></section>`
    )
    .join('');

  const sign = ['QC inspector', 'Supervisor']
    .map((who) => `<div><span>${who}</span><em>Name</em><em>Signature</em><em>Date</em></div>`)
    .join('');

  const contents = [
    ...(i.tests.length ? [plural(i.tests.length, 'pressure test')] : []),
    ...(i.welds?.length ? [plural(i.welds.length, 'weld')] : []),
    plural(i.joints.length, 'joint'),
    plural(used.length, 'heat'),
    plural(isos.length, 'iso'),
    plural(i.readings.length, 'level reading'),
    plural(i.spools.length, 'spool'),
  ].join(' · ');

  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<title>${esc(`Turnover package: ${job}`)}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<style>${CSS}${EXTRA}</style></head><body>` +
    '<header><div class="titles"><div>' +
    '<h1>Turnover package</h1>' +
    `<p class="where">Job ${esc(job)}</p>` +
    `</div><div class="when">${esc(i.dateLine)}</div></div>` +
    `<p class="spec">${esc(contents)}</p>` +
    (open.length ? `<p class="problem">${esc(`${plural(open.length, 'open item')} to clear before sign-off. Listed first.`)}</p>` : '') +
    '</header>' +
    `<div class="totals">${totals}</div>` +
    tables.map(table).join('') +
    (i.welds?.length ? `<section class="welds"><h2>Weld log</h2>${weldTables(i.welds, i.welders ?? [], dayKey(Date.now()), (n) => findSize(n).label)}</section>` : '') +
    `<section class="sign"><h2>Sign-off</h2><div class="rows">${sign}</div></section>` +
    `<footer>${esc(FOOTER)}</footer>` +
    drawings +
    '</body></html>'
  );
}

const FOOTER =
  'Made by PipeFit Pro from the records on this phone. Torque is as entered on the joint; heats and cert status are as held in the heat book on the day this was printed. ' +
  'A heat marked OWED or NOT IN BOOK has no mill cert on file and the joints it went into cannot be called traceable until it does.';

/** Long tables break across pages and repeat their headings; each iso gets a page of its own. */
const EXTRA = `
  .tbl { break-inside: auto; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .sign { margin: 8pt 0; break-inside: avoid; }
  .sign .rows { display: flex; gap: 10pt; }
  .sign .rows div { flex: 1; border: 0.7pt solid #000; padding: 4pt 6pt; }
  .sign span { display: block; font-weight: 700; font-size: 8.5pt; margin-bottom: 4pt; }
  .sign em { display: block; font-style: normal; font-size: 7pt; letter-spacing: 0.4pt; text-transform: uppercase;
             border-bottom: 0.6pt solid #000; padding-top: 14pt; margin-bottom: 2pt; }
  .iso { break-before: page; }
  .iso .frame { border: 0.7pt solid #000; }
  .iso svg { display: block; width: 100%; height: auto; max-height: 235mm; }
`;
