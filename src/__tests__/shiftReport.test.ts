import { expectedBolt, tapBolt } from '../calc/boltUpSequence';
import { newHeat } from '../calc/heat';
import { hasWork, listed, logFacts, mustMention, plainReport, plainSummary, reportText, shiftFacts, type DayRecords } from '../calc/shiftReport';
import { endHold, newTest, startHold, type PressureTest } from '../state/pressureLog';
import { addCheck, newJoint, withState, type Joint } from '../state/register';
import { emptyBook, newSketch } from '../state/sketchStore';
import {
  MAX_REPORTS,
  SHIFTS_VERSION,
  deleteReport,
  diameterInches,
  emptyShifts,
  manHours,
  newReport,
  parseShifts,
  putReport,
  reportFor,
  serialiseShifts,
  sizeLabel,
  validReport,
  weldTotal,
  type ShiftReport,
} from '../state/shiftLog';

const DAY = '2026-09-30';
const at = (h: number, m = 0, d = 30) => new Date(2026, 8, d, h, m).getTime();
const MIN = 60_000;

/** A joint on a job, worked `taps` bolts in, created at `made`. */
function joint(tag: string, taps: number, made: number, project = 'BP-1'): Joint {
  let j = newJoint(tag.toLowerCase(), { cls: '125', nps: 6, bolts: 8, torque: 60, project }, made);
  let s = j.state;
  for (let k = 0; k < taps; k++) s = tapBolt(s, expectedBolt(s)).state;
  j = withState({ ...j, tag, boltedBy: 'J. Smith', witnessedBy: '' }, s, made + 1000);
  return j;
}
const FULL = 32;

const ptest = (pkg: string, over: Partial<PressureTest> = {}): PressureTest => ({ ...newTest('BP-1', at(7)), id: pkg, pkg, testPsi: 225, ...over });

function records(over: Partial<DayRecords> = {}): DayRecords {
  return { tests: [], joints: [], heats: [], readings: [], sketches: [], ...over };
}

const report = (over: Partial<ShiftReport> = {}): ShiftReport => ({ ...newReport(DAY, 'BP-1', at(6)), ...over });

describe('the shift log', () => {
  test('one report per job per day, found again whatever the case of the job', () => {
    let log = putReport(emptyShifts(), report(), at(6));
    log = putReport(log, { ...newReport(DAY, 'bp-1', at(7)), crew: 4 }, at(7));
    expect(log.reports).toHaveLength(1);
    expect(reportFor(log, DAY, 'BP-1 ')?.crew).toBe(4);
    log = putReport(log, newReport('2026-10-01', 'BP-1', at(8)), at(8));
    expect(log.reports.map((r) => r.day)).toEqual(['2026-10-01', DAY]);
    expect(deleteReport(log, log.reports[0]!.id).reports).toHaveLength(1);
  });

  test('welds are merged by size, largest first, and bad rows dropped', () => {
    const r = validReport({
      ...report(),
      welds: [
        { nps: 2, count: 3 },
        { nps: 6, count: 2 },
        { nps: 2, count: 1 },
        { nps: 7, count: 1 },
        { nps: 4, count: -1 },
      ],
      spools: ['SP-1', 'sp-1', ' SP-2 ', ''],
      rejects: [{ id: 'W-14', note: 'porosity' }, { id: '' }],
      crew: 4.5,
      hours: 10,
    });
    expect(r?.welds).toEqual([
      { nps: 6, count: 2 },
      { nps: 2, count: 4 },
    ]);
    expect(r?.spools).toEqual(['SP-1', 'SP-2']);
    expect(r?.rejects).toEqual([{ id: 'W-14', note: 'porosity' }]);
    expect(r?.crew).toBeNull();
    expect(weldTotal(r!.welds)).toBe(6);
    expect(diameterInches(r!.welds)).toBe(20);
    expect(manHours({ crew: 4, hours: 10 })).toBe(40);
    expect(manHours({ crew: null, hours: 10 })).toBeNull();
    expect(sizeLabel(1.5)).toBe('1-1/2"');
  });

  test('a store survives a save and a load; a newer one is left alone', () => {
    const log = putReport(emptyShifts(), report({ crew: 5, notes: { issues: 'Crane late', safety: '', tomorrow: '', notes: '' } }), at(9));
    expect(parseShifts(serialiseShifts(log)).reports).toEqual(log.reports);
    expect(parseShifts(JSON.stringify({ v: SHIFTS_VERSION + 1, reports: [] })).foreign).toBe(true);
  });

  test('a second report for the same slot in a store is a duplicate', () => {
    const raw = JSON.stringify({ v: 1, reports: [report(), { ...report(), id: 'other' }] });
    expect(parseShifts(raw)).toMatchObject({ dropped: 1 });
  });

  test('past the cap the oldest day goes, never the one just kept', () => {
    let log = emptyShifts();
    const start = new Date(2026, 0, 1, 12).getTime();
    for (let i = 0; i < MAX_REPORTS; i++) {
      const when = start + i * 24 * 60 * MIN;
      log = putReport(log, newReport(new Date(when).toISOString().slice(0, 10), 'BP-1', when), when);
    }
    const old = newReport('2025-06-01', 'BP-1', at(5));
    const after = putReport(log, old, at(5));
    expect(after.reports).toHaveLength(MAX_REPORTS);
    expect(after.reports.some((r) => r.day === '2025-06-01')).toBe(true);
  });
});

describe('reading the day off the records', () => {
  const recs = records({
    tests: [
      endHold(startHold(ptest('TP-14', { leaks: '' }), at(9), 226), at(9, 40), 226),
      { ...ptest('TP-15', { result: 'fail', leaks: 'W-22  weeping\nat the toe' }) },
      { ...ptest('TP-16'), day: '2026-09-29' },
      { ...ptest('TP-17'), project: 'OTHER' },
    ].map((t, i) => (t.pkg === 'TP-14' ? { ...t, result: 'pass' as const, people: { ...t.people, examiner: { name: 'J. Ruiz', sig: '', signedAt: null } } } : { ...t, createdAt: at(7) + i })),
    joints: [
      joint('F-1', FULL, at(8)),
      joint('F-2', 5, at(10)),
      joint('F-3', 5, at(10, 0, 29)),
      joint('F-9', FULL, at(8), 'OTHER'),
      addCheck(joint('F-4', FULL, at(8, 0, 28)), { moved: true, torque: null, note: '' }, at(11)),
    ],
    heats: [{ ...newHeat('E7Z419', at(12)), certified: false }, { ...newHeat('K1', at(12, 0, 29)) }],
    readings: [
      { id: 'r1', tag: 'L-1', slope: 1, inPerFt: 0.2, createdAt: at(13), project: 'BP-1' },
      { id: 'r2', tag: 'L-2', slope: 1, inPerFt: 0.2, createdAt: at(13), project: 'OTHER' },
    ],
    sketches: [{ ...newSketch(emptyBook(), at(14), 'BP-1'), name: 'ISO-3' }],
  });

  test('only this job, only this day', () => {
    const f = logFacts(recs, DAY, 'BP-1');
    expect(f.tests.map((x) => x.name)).toEqual(['TP-15', 'TP-14']);
    expect(f.tests[0]).toMatchObject({ result: 'fail', found: 'W-22 weeping at the toe', heldMin: null });
    expect(f.tests[1]).toMatchObject({ result: 'pass', heldMin: 40, examiner: 'J. Ruiz', psi: 225 });
    expect(f.jointsDone.map((j) => j.tag)).toEqual(['F-1']);
    expect(f.jointsOpen).toEqual(['F-2']);
    expect(f.checks).toEqual([{ tag: 'F-4', moved: true }]);
    expect(f.heats).toEqual([{ heat: 'E7Z419', certified: false }]);
    expect(f.readings).toBe(1);
    expect(f.isos).toEqual(['ISO-3']);
  });

  test('the facts count what the lists hold', () => {
    const f = shiftFacts(report({ crew: 4, hours: 10, spools: ['SP-1'], welds: [{ nps: 6, count: 8 }], rejects: [{ id: 'W-14', note: 'porosity' }] }), logFacts(recs, DAY, 'BP-1'));
    expect(f).toMatchObject({
      date: 'Wed 30 Sep 2026',
      job: 'BP-1',
      manHours: 40,
      welds: { total: 8, diameterInches: 48, rejectedCount: 1 },
      pressureTestsCount: 2,
      pressureTestsPassed: 1,
      pressureTestsFailed: 1,
      pressureTestsOpen: 0,
      flangeJointsBoltedUpCount: 1,
      boltUpsStillOpenCount: 1,
      retorqueChecksCount: 1,
      retorqueChecksTookUpCount: 1,
      heatsEnteredCount: 1,
      heatsWithoutCertCount: 1,
      isoSketchesCount: 1,
    });
    expect(mustMention(f)).toEqual(['W-14', 'TP-15', 'F-4', 'E7Z419']);
    expect(hasWork(f)).toBe(true);
  });

  test('the plain summary names the bad news in the sentence it belongs to', () => {
    const f = shiftFacts(report({ spools: ['SP-1', 'SP-2'], welds: [{ nps: 6, count: 8 }], rejects: [{ id: 'W-14', note: 'porosity' }] }), logFacts(recs, DAY, 'BP-1'));
    const s = plainSummary(f);
    expect(s).toContain('Completed 2 spools: SP-1 and SP-2.');
    expect(s).toContain('Made 8 welds, 48 diameter-inches; 1 weld rejected: W-14 (porosity).');
    expect(s).toContain('Ran 2 pressure tests: TP-15 hydrostatic failed, 225 psi (found: W-22 weeping at the toe); TP-14 hydrostatic passed, 225 psi, held 40 min, examined by J. Ruiz.');
    expect(s).toContain('Bolted up 1 flange joint: F-1.');
    expect(s).toContain('Bolt-up still open on F-2.');
    expect(s).toContain('Made 1 re-torque check; F-4 took up and needs checking again.');
    expect(s).toContain('Entered 1 heat in the heat book; no cert in hand yet for E7Z419.');
    for (const name of mustMention(f)) expect(s).toContain(name);
  });

  test('a day with nothing in it says so', () => {
    const f = shiftFacts(report(), logFacts(records(), DAY, 'BP-1'));
    expect(hasWork(f)).toBe(false);
    expect(plainSummary(f)).toBe('No work was logged for this shift.');
  });

  test('the report lays out the figures under the summary, and only the notes that were written', () => {
    const f = shiftFacts(report({ crew: 4, hours: 10, welds: [{ nps: 6, count: 8 }, { nps: 2, count: 3 }] }), logFacts(recs, DAY, 'BP-1'));
    const text = plainReport(f, { issues: 'Crane late 2 hrs', safety: '', tomorrow: 'Hydro TP-16', notes: '' });
    const lines = text.split('\n');
    expect(lines.slice(0, 4)).toEqual(['SHIFT REPORT · BP-1', 'Wed 30 Sep 2026 · Crew 4 · 10 h each · 40 man-hours', '', 'SUMMARY']);
    expect(lines).toEqual(expect.arrayContaining(['WELDS', '• 6": 8 welds, 48 DI', '• 2": 3 welds, 6 DI', '• Total: 11 welds, 54 DI', 'PRESSURE TESTS', 'ISSUES / DELAYS', 'Crane late 2 hrs', 'TOMORROW']));
    expect(lines).not.toContain('SAFETY');
    expect(reportText(f, '  ', { issues: '', safety: '', tomorrow: '', notes: '' })).toContain(plainSummary(f));
  });

  test('lists read as written', () => {
    expect(listed([])).toBe('');
    expect(listed(['A'])).toBe('A');
    expect(listed(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
