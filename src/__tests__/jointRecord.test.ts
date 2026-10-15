import { answerMoved, confirmGap, expectedBolt, isAsked, isFinished, planOf, tapBolt } from '../calc/boltUpSequence';
import { jointRecordHtml, loadColumn, roundRows, sequenceWords } from '../print/jointRecord';
import { addCheck, newJoint, signJoint, withPeople, withState, type Joint } from '../state/register';

// The joint record
// ----------------
// One page per joint, to the content of PCC-1 Appendix R. What goes wrong
// with a record is what it leaves out or says wrongly: a round with no time,
// a check round that does not say how it ended, a wrench with no calibration
// word, a signature line with a name under it that nobody signed. Each is
// held here, and so is the page's refusal to be broken by what is typed.

const T = Date.UTC(2026, 8, 20, 12);
const SIG = 'AAAAAB AACAAD';

const fresh = (over: Partial<Joint> = {}): Joint => ({ ...newJoint('l204', { cls: '150', nps: 6, bolts: 8, torque: 151, project: 'BP-1', tag: 'L-204 <F1>', bolting: { spec: 'BJ-01 Rev C', stud: 'ASTM A193 B7', stressKsi: 50, nutFactor: 0.16, lubricant: 'Moly paste' } }, T), ...over });

/** Every state the joint passes through: snug, gap checks confirmed, every check round answered "no nut turned". */
function states(): ReturnType<typeof tapBolt>['state'][] {
  const out = [fresh().state];
  let s = out[0]!;
  while (!isFinished(s)) {
    s = isAsked(s) ? answerMoved(s, false) : s.gapPending ? confirmGap(s) : tapBolt(s, expectedBolt(s)).state;
    out.push(s);
  }
  return out;
}

/** The joint worked up to a state: the first one `at` picks, or the finished one. */
function worked(at: ((s: ReturnType<typeof tapBolt>['state']) => boolean) | 'done', over: Partial<Joint> = {}): Joint {
  let j = fresh(over);
  const all = states();
  for (let i = 1; i < all.length; i += 1) {
    j = withState(j, all[i]!, T + i * 60_000);
    if (at !== 'done' && at(all[i]!)) return j;
  }
  return j;
}

const FULL = 'done' as const;

describe('the rounds on the record', () => {
  test('each round has its load, its order, the bolts in sequence and when it closed', () => {
    const j = worked(FULL);
    expect(isFinished(j.state)).toBe(true);
    const rows = roundRows(j);
    expect(rows).toHaveLength(planOf(j.state).length);
    expect(rows[0]![0]).toMatch(/Snug/);
    expect(rows[0]![1]).toBe('10–20 ft-lb, under 20%');
    expect(rows[1]![1]).toBe('20–30%, set 30% · 45 ft-lb');
    expect(rows[1]![2]).toBe('Cross pattern');
    expect(rows[1]![3]).toBe('1 · 5 · 3 · 7 · 2 · 6 · 4 · 8');
    for (const r of rows) expect(r[4]).toMatch(/^9\/20\/2026 /);
    expect(rows[rows.length - 1]![5]).toBe('No nut turned');
  });

  test('a check round that was followed by another says a nut turned on it', () => {
    let j = worked((s) => isAsked(s));
    expect(isAsked(j.state)).toBe(true);
    j = withState(j, answerMoved(j.state, true), T + 70 * 60_000);
    const rows = roundRows(j);
    const checks = rows.filter((r) => /Check/.test(r[0]!));
    expect(checks[0]![5]).toBe('A nut turned: another round');
    expect(checks[1]![5]).toBe('In progress');
    expect(checks[1]![4]).toBe('—');
  });

  test('an unfinished bolt-up says where it is, and rounds not reached say so', () => {
    const rows = roundRows(worked((s) => s.round === 1 && s.step === 1 && !s.gapPending));
    expect(rows[1]![5]).toBe('In progress, step 2 of 8');
    expect(rows[1]![4]).toBe('—');
    expect(rows[3]![4]).toBe('Not reached');
    expect(rows[0]![5]).toBe('Closed');
  });

  test('a tensioning round reads as pressures, a group as a bracket, everything as all', () => {
    const j = newJoint('t', { cls: '300', nps: 10, bolts: 16, method: 'tension50' }, T);
    const rounds = planOf(j.state);
    const tensioned = rounds.find((r) => r.steps[0]?.pressure);
    expect(tensioned && loadColumn(tensioned, 300)).toMatch(/^Pressure /);
    const two = newJoint('u', { cls: '300', nps: 10, bolts: 16, method: 'twoTools' }, T);
    const paired = planOf(two.state).find((r) => r.kind === 'round');
    expect(paired && sequenceWords(paired, 16)).toMatch(/^\[1 9\] · /);
    const all = planOf(newJoint('v', { cls: '300', nps: 10, bolts: 16, method: 'tension100' }, T).state).find((r) => r.steps[0]?.bolts.length === 16);
    expect(all && sequenceWords(all, 16)).toBe('all');
  });
});

describe('the page', () => {
  const html = (j: Joint, wrench: Parameters<typeof jointRecordHtml>[0]['wrench'] = null) => jointRecordHtml({ joint: j, dateLine: 'Printed 20 Sep 2026', wrench, now: T + 10 * 3600_000 });

  test('carries the spec, the figures, the flange, the heats and the people', () => {
    let j = worked(FULL, { heats: ['H1', 'H2'] });
    j = withPeople(j, { boltedBy: 'Tysun M 4471', witnessedBy: 'R. Ortiz QC', wrench: 'TW-7' }, T);
    j = signJoint(j, 'boltedBy', SIG, T + 2 * 3600_000);
    const h = html(j, { tag: 'TW-7', name: 'Norbar 400', max: 400, verdict: { ok: true, why: 'TW-7 in calibration to 2027-03-01' } });
    for (const s of ['Bolted joint assembly record', 'ASME PCC-1 Appendix R', 'BJ-01 Rev C', 'ASTM A193 B7', '50 ksi on the root area', '0.16', 'Moly paste', '151 ft-lb', '6&quot; ASME B16.5 class 150', '8 × 3/4&quot;, 10 threads per inch', 'TW-7, Norbar 400, 400 ft-lb', 'In date: TW-7 in calibration', 'H1, H2', 'Tysun M 4471', 'R. Ortiz QC', 'Assembled by', 'Witnessed by', 'Signed 9/20/2026', 'Signature · date', 'Legacy cross pattern'])
      expect(h).toContain(s);
    expect(h).toContain('<svg');
    expect(h).not.toContain('OPEN.');
    expect(h).toContain('The retightening round is not yet recorded');
  });

  test('says when the joint is open, retightened, or still taking up', () => {
    expect(html(worked((s) => s.round === 1 && s.step === 1 && !s.gapPending))).toContain('OPEN. Round 1 · step 2 of 8.');
    const done = worked(FULL);
    const tight = addCheck(done, { moved: false, torque: 151, note: 'After the hydro' }, T + 6 * 3600_000);
    const h = html(tight);
    expect(h).not.toContain('class="problem"');
    expect(h).toContain('All tight');
    expect(h).toContain('After the hydro');
    expect(h).toContain('Bolted up and retightened; all tight');
    expect(html(addCheck(done, { moved: true, torque: null, note: '' }, T + 6 * 3600_000))).toContain('another retightening round is due');
  });

  test('a wrench not on the register and a joint with no spec say so', () => {
    const j = { ...worked(FULL), bolting: null, wrench: 'TW-9' };
    const h = html(j);
    expect(h).toContain('TW-9 (not on the calibration register)');
    expect(h).toContain('None recorded');
    expect(h).toContain('Not recorded');
  });

  test('what is typed cannot break the page', () => {
    const h = html(worked((s) => s.round === 1, { tag: 'Riser <3" & up>', note: '<script>alert(1)</script>' }));
    expect(h).toContain('Riser &lt;3&quot; &amp; up&gt;');
    expect(h).not.toContain('<script>');
  });
});
