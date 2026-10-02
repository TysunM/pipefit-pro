// The shift report
// ----------------
// A foreman reads a shift report for three things: what got done, what failed
// or is still open, and what is holding the crew up. So the report leads with
// a few sentences that say exactly that, then gives the figures that back
// them, then the crew's own words.
//
// Every figure in it comes from a record: what the crew entered on the shift
// screen, and what the app already logged that day — the pressure tests, the
// bolt-ups, the re-torque checks, the heats, the level readings, the isos.
// Nothing here is
// estimated, and nothing is left out because it looks bad: a rejected weld or
// a failed test is named in the first paragraph, not found on page two.
//
// The summary can also be written by Claude (ai/shiftPolish.ts), but only from
// the facts built here, and only the summary and the crew's notes; the figures
// below them are always these. This file is the plain version that is always
// there, signal or not, and the yardstick the Claude version is checked
// against.

import type { Heat } from './heat';
import { dayBounds, dayLabel } from './days';
import type { Joint } from '../state/register';
import { isNamed } from '../state/register';
import type { Reading } from '../state/levelLog';
import type { SavedSketch } from '../state/sketchStore';
import type { PressureTest, TestKind, TestResult } from '../state/pressureLog';
import { heldMinutes, testName } from '../state/pressureLog';
import { sameProject } from '../state/project';
import { NOTE_KEYS, ShiftNotes, ShiftReport, diameterInches, manHours, sizeLabel, weldTotal } from '../state/shiftLog';

/** What the records already hold for a job on a day. */
export type LogFacts = {
  /** Pressure tests dated that day. */
  tests: { name: string; kind: TestKind; psi: number | null; heldMin: number | null; result: TestResult; examiner: string; witness: string; found: string }[];
  /** Bolt-ups whose fourth pass closed that day. */
  jointsDone: { tag: string; boltedBy: string; witnessedBy: string }[];
  /** Bolt-ups started that day and not finished. */
  jointsOpen: string[];
  /** Re-torque checks made that day, and whether any bolt took up. */
  checks: { tag: string; moved: boolean }[];
  /** Heats entered in the heat book that day, from any job: the book is not kept by job. */
  heats: { heat: string; certified: boolean }[];
  readings: number;
  /** Isos started or drawn on that day. */
  isos: string[];
};

export type DayRecords = {
  tests: readonly PressureTest[];
  joints: readonly Joint[];
  heats: readonly Heat[];
  readings: readonly Reading[];
  sketches: readonly SavedSketch[];
};

const inDay = (at: number | null | undefined, b: { start: number; end: number }) =>
  typeof at === 'number' && at >= b.start && at < b.end;

/** Read the day off the records, for one job. */
export function logFacts(records: DayRecords, day: string, project: string): LogFacts {
  const b = dayBounds(day);
  const joints = records.joints.filter((j) => isNamed(j) && sameProject(j.project, project));
  const checks: LogFacts['checks'] = [];
  for (const j of joints) for (const c of j.checks) if (inDay(c.at, b)) checks.push({ tag: j.tag, moved: c.moved });
  return {
    tests: records.tests
      .filter((t) => t.day === day && sameProject(t.project, project))
      .sort((x, y) => (x.hold.startAt ?? x.createdAt) - (y.hold.startAt ?? y.createdAt))
      .map((t) => {
        const held = heldMinutes(t);
        return {
          name: testName(t),
          kind: t.kind,
          psi: t.testPsi,
          heldMin: held === null ? null : Math.floor(held),
          result: t.result,
          examiner: t.people.examiner.name,
          witness: t.people.witness.name,
          found: t.leaks.replace(/\s+/g, ' ').trim().slice(0, FOUND_MAX),
        };
      }),
    jointsDone: joints
      .filter((j) => inDay(j.completedAt, b))
      .sort((x, y) => (x.completedAt ?? 0) - (y.completedAt ?? 0))
      .map((j) => ({ tag: j.tag, boltedBy: j.boltedBy.trim(), witnessedBy: j.witnessedBy.trim() })),
    jointsOpen: joints.filter((j) => j.completedAt === null && inDay(j.createdAt, b)).map((j) => j.tag),
    checks,
    heats: records.heats.filter((h) => inDay(h.createdAt, b)).map((h) => ({ heat: h.heat, certified: h.certified })),
    readings: records.readings.filter((r) => sameProject(r.project, project) && inDay(r.createdAt, b)).length,
    isos: records.sketches
      .filter((s) => sameProject(s.project, project) && (inDay(s.createdAt, b) || inDay(s.updatedAt, b)))
      .map((s) => s.name),
  };
}

const RESULT_WORD: Record<TestResult, 'passed' | 'failed' | 'open'> = { pass: 'passed', fail: 'failed', open: 'open' };
const KIND_WORD: Record<TestKind, 'hydrostatic' | 'pneumatic'> = { hydro: 'hydrostatic', pneumatic: 'pneumatic' };

/** Most of what a failed test found that goes in the report; the test record has the rest. */
export const FOUND_MAX = 120;

/**
 * The facts of the shift, in one shape: what the summary is written from,
 * what is sent to Claude, and what Claude's version is checked against. Every
 * count is spelled out rather than left to be counted, so a sentence that says
 * "2 joints" is checking a 2 that is really there.
 */
export type ShiftFacts = {
  date: string;
  job: string;
  crew: number | null;
  hoursEach: number | null;
  manHours: number | null;
  welds: {
    total: number;
    diameterInches: number;
    bySize: { size: string; count: number; diameterInches: number }[];
    rejectedCount: number;
    rejected: { weld: string; note: string }[];
  };
  spoolsCompletedCount: number;
  spoolsCompleted: string[];
  pressureTestsCount: number;
  pressureTestsPassed: number;
  pressureTestsFailed: number;
  pressureTestsOpen: number;
  pressureTests: {
    test: string;
    kind: 'hydrostatic' | 'pneumatic';
    psi: number | null;
    heldMinutes: number | null;
    result: 'passed' | 'failed' | 'open';
    examiner: string;
    witness: string;
    /** What it found: where it leaked. */
    found: string;
  }[];
  flangeJointsBoltedUpCount: number;
  flangeJointsBoltedUp: { joint: string; boltedBy: string; witnessedBy: string }[];
  boltUpsStillOpenCount: number;
  boltUpsStillOpen: string[];
  retorqueChecksCount: number;
  retorqueChecksTookUpCount: number;
  retorqueChecks: { joint: string; tookUp: boolean }[];
  heatsEnteredCount: number;
  heatsWithoutCertCount: number;
  heatsWithoutCert: string[];
  levelReadings: number;
  isoSketchesCount: number;
  isoSketches: string[];
};

/** Diameter-inches to one place where it needs it: 52, 4.5. */
export const di = (n: number): number => Math.round(n * 10) / 10;

export function shiftFacts(r: ShiftReport, log: LogFacts): ShiftFacts {
  return {
    date: dayLabel(r.day),
    job: r.project || 'No project',
    crew: r.crew,
    hoursEach: r.hours,
    manHours: manHours(r),
    welds: {
      total: weldTotal(r.welds),
      diameterInches: di(diameterInches(r.welds)),
      bySize: r.welds.map((w) => ({ size: sizeLabel(w.nps), count: w.count, diameterInches: di(w.nps * w.count) })),
      rejectedCount: r.rejects.length,
      rejected: r.rejects.map((x) => ({ weld: x.id, note: x.note })),
    },
    spoolsCompletedCount: r.spools.length,
    spoolsCompleted: r.spools.slice(),
    pressureTestsCount: log.tests.length,
    pressureTestsPassed: log.tests.filter((x) => x.result === 'pass').length,
    pressureTestsFailed: log.tests.filter((x) => x.result === 'fail').length,
    pressureTestsOpen: log.tests.filter((x) => x.result === 'open').length,
    pressureTests: log.tests.map((x) => ({
      test: x.name,
      kind: KIND_WORD[x.kind],
      psi: x.psi,
      heldMinutes: x.heldMin,
      result: RESULT_WORD[x.result],
      examiner: x.examiner,
      witness: x.witness,
      found: x.found,
    })),
    flangeJointsBoltedUpCount: log.jointsDone.length,
    flangeJointsBoltedUp: log.jointsDone.map((j) => ({ joint: j.tag, boltedBy: j.boltedBy, witnessedBy: j.witnessedBy })),
    boltUpsStillOpenCount: log.jointsOpen.length,
    boltUpsStillOpen: log.jointsOpen.slice(),
    retorqueChecksCount: log.checks.length,
    retorqueChecksTookUpCount: log.checks.filter((c) => c.moved).length,
    retorqueChecks: log.checks.map((c) => ({ joint: c.tag, tookUp: c.moved })),
    heatsEnteredCount: log.heats.length,
    heatsWithoutCertCount: log.heats.filter((h) => !h.certified).length,
    heatsWithoutCert: log.heats.filter((h) => !h.certified).map((h) => h.heat),
    levelReadings: log.readings,
    isoSketchesCount: log.isos.length,
    isoSketches: log.isos.slice(),
  };
}

/** Whether there is anything at all to report. */
export function hasWork(f: ShiftFacts): boolean {
  return (
    f.welds.total > 0 ||
    f.welds.rejectedCount > 0 ||
    f.spoolsCompletedCount > 0 ||
    f.pressureTests.length > 0 ||
    f.flangeJointsBoltedUpCount > 0 ||
    f.boltUpsStillOpen.length > 0 ||
    f.retorqueChecksCount > 0 ||
    f.heatsEnteredCount > 0 ||
    f.levelReadings > 0 ||
    f.isoSketches.length > 0
  );
}

/**
 * What a summary may never leave out: every weld rejected, every test that
 * failed or is still open, every joint that took up on a re-torque, and every
 * heat with no cert in hand. These are the lines a foreman acts on.
 */
export function mustMention(f: ShiftFacts): string[] {
  return [
    ...f.welds.rejected.map((x) => x.weld),
    ...f.pressureTests.filter((x) => x.result !== 'passed').map((x) => x.test),
    ...f.retorqueChecks.filter((x) => x.tookUp).map((x) => x.joint),
    ...f.heatsWithoutCert,
  ];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A list as written: A; A and B; A, B and C. */
export function listed(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

function testLine(x: ShiftFacts['pressureTests'][number]): string {
  const how = [x.psi !== null ? `${x.psi} psi` : '', x.heldMinutes !== null ? `held ${x.heldMinutes} min` : ''].filter(Boolean).join(', ');
  const who = [x.examiner && `examined by ${x.examiner}`, x.witness && `witnessed by ${x.witness}`].filter(Boolean).join(', ');
  const line = [`${x.test} ${x.kind} ${x.result}`, how, who].filter(Boolean).join(', ');
  return x.found ? `${line} (found: ${x.found})` : line;
}

/**
 * The summary, written from the facts by rule: one sentence per kind of work,
 * the bad news named in the sentence it belongs to. Always true, always
 * there, and the version Claude's must match.
 */
export function plainSummary(f: ShiftFacts): string {
  if (!hasWork(f)) return 'No work was logged for this shift.';
  const s: string[] = [];
  if (f.spoolsCompletedCount) s.push(`Completed ${plural(f.spoolsCompletedCount, 'spool')}: ${listed(f.spoolsCompleted)}.`);
  if (f.welds.total || f.welds.rejectedCount) {
    const made = f.welds.total ? `Made ${plural(f.welds.total, 'weld')}, ${f.welds.diameterInches} diameter-inches` : '';
    const bad = f.welds.rejectedCount
      ? `${plural(f.welds.rejectedCount, 'weld')} rejected: ${listed(f.welds.rejected.map((x) => (x.note ? `${x.weld} (${x.note})` : x.weld)))}`
      : f.welds.total
        ? 'none rejected'
        : '';
    s.push(`${[made, bad].filter(Boolean).join('; ')}.`.replace(/^./, (c) => c.toUpperCase()));
  }
  if (f.pressureTestsCount) s.push(`Ran ${plural(f.pressureTestsCount, 'pressure test')}: ${f.pressureTests.map(testLine).join('; ')}.`);
  if (f.flangeJointsBoltedUpCount) s.push(`Bolted up ${plural(f.flangeJointsBoltedUpCount, 'flange joint')}: ${listed(f.flangeJointsBoltedUp.map((j) => j.joint))}.`);
  if (f.boltUpsStillOpen.length) s.push(`Bolt-up still open on ${listed(f.boltUpsStillOpen)}.`);
  if (f.retorqueChecksCount) {
    const moved = f.retorqueChecks.filter((c) => c.tookUp).map((c) => c.joint);
    s.push(
      `Made ${plural(f.retorqueChecksCount, 're-torque check')}` +
        (moved.length ? `; ${listed(moved)} took up and ${moved.length === 1 ? 'needs' : 'need'} checking again.` : '; nothing took up.'),
    );
  }
  if (f.heatsEnteredCount) {
    s.push(
      `Entered ${plural(f.heatsEnteredCount, 'heat')} in the heat book` +
        (f.heatsWithoutCert.length ? `; no cert in hand yet for ${listed(f.heatsWithoutCert)}.` : '.'),
    );
  }
  return s.join(' ');
}

const NOTE_HEADINGS: Record<keyof ShiftNotes, string> = {
  issues: 'ISSUES / DELAYS',
  safety: 'SAFETY',
  tomorrow: 'TOMORROW',
  notes: 'NOTES',
};

/**
 * The whole report, as text: what is sent to the foreman, what the PDF is
 * made from, and what the crew edits before either. `summary` and `notes` are
 * the plain ones or Claude's; everything between them is the facts, laid out.
 */
export function reportText(f: ShiftFacts, summary: string, notes: ShiftNotes): string {
  const out: string[] = [];
  const head = [f.date];
  if (f.crew !== null) head.push(`Crew ${f.crew}`);
  if (f.hoursEach !== null) head.push(`${f.hoursEach} h each`);
  if (f.manHours !== null) head.push(`${f.manHours} man-hours`);
  out.push(`SHIFT REPORT · ${f.job}`, head.join(' · '), '', 'SUMMARY', summary.trim() || plainSummary(f));

  if (f.welds.total || f.welds.rejectedCount) {
    out.push('', 'WELDS');
    for (const w of f.welds.bySize) out.push(`• ${w.size}: ${plural(w.count, 'weld')}, ${w.diameterInches} DI`);
    if (f.welds.total) out.push(`• Total: ${plural(f.welds.total, 'weld')}, ${f.welds.diameterInches} DI`);
    for (const x of f.welds.rejected) out.push(`• Rejected: ${x.weld}${x.note ? ` (${x.note})` : ''}`);
  }
  if (f.spoolsCompletedCount) out.push('', 'SPOOLS COMPLETED', ...f.spoolsCompleted.map((s) => `• ${s}`));
  if (f.pressureTests.length) out.push('', 'PRESSURE TESTS', ...f.pressureTests.map((x) => `• ${testLine(x)}`));
  if (f.flangeJointsBoltedUpCount || f.boltUpsStillOpen.length || f.retorqueChecksCount) {
    out.push('', 'FLANGE BOLT-UPS');
    for (const j of f.flangeJointsBoltedUp) {
      const by = [j.boltedBy && `bolted by ${j.boltedBy}`, j.witnessedBy && `witnessed by ${j.witnessedBy}`].filter(Boolean).join(', ');
      out.push(`• ${j.joint} done${by ? `, ${by}` : ''}`);
    }
    for (const j of f.boltUpsStillOpen) out.push(`• ${j} still open`);
    for (const c of f.retorqueChecks) out.push(`• ${c.joint} re-torqued: ${c.tookUp ? 'took up, check again' : 'nothing moved'}`);
  }
  if (f.heatsEnteredCount) {
    out.push('', 'HEAT BOOK', `• ${plural(f.heatsEnteredCount, 'heat')} entered`);
    if (f.heatsWithoutCert.length) out.push(`• No cert in hand: ${f.heatsWithoutCert.join(', ')}`);
  }
  const also = [f.levelReadings ? plural(f.levelReadings, 'level reading') : '', f.isoSketches.length ? `${plural(f.isoSketches.length, 'iso')} (${f.isoSketches.join(', ')})` : '']
    .filter(Boolean)
    .join(' · ');
  if (also) out.push('', 'ALSO LOGGED', `• ${also}`);

  for (const k of NOTE_KEYS) {
    const text = notes[k].trim();
    if (text) out.push('', NOTE_HEADINGS[k], text);
  }
  return out.join('\n');
}

/** The report with the plain summary and the crew's notes as they typed them. */
export const plainReport = (f: ShiftFacts, notes: ShiftNotes): string => reportText(f, plainSummary(f), notes);
