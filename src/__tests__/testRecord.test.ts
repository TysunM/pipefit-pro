import { encodeSig } from '../calc/signature';
import { holdChartSvg, testRecordHtml } from '../print/testRecord';
import { reportBody, shiftSheetHtml } from '../print/shiftSheet';
import { openItems, turnoverHtml, turnoverTotals } from '../print/turnover';
import { endHold, logReading, newTest, retest, startHold, type PressureTest } from '../state/pressureLog';
import { emptyBook, newSketch } from '../state/sketchStore';

const T = new Date(2026, 8, 30, 9, 0).getTime();
const MIN = 60_000;

const rec = (over: Partial<PressureTest> = {}): PressureTest => ({
  ...newTest('BP-1', T),
  id: 'pt1',
  pkg: 'TP-014 <b>',
  system: 'CW-1001 & CW-1002\nisos 3-114',
  designPsi: 150,
  testPsi: 225,
  gauges: [{ id: 'G-12', range: 400, calDue: '2026-12-31' }],
  reliefTag: 'PSV-3',
  reliefPsi: 240,
  ...over,
});

const signed = (name: string) => ({ name, sig: encodeSig([[[10, 60], [120, 30], [290, 70]]]), signedAt: T + 30 * MIN });

const passed = (): PressureTest => {
  let x = startHold(rec(), T, 226);
  x = logReading(x, T + 5 * MIN, 226);
  x = endHold(x, T + 15 * MIN, 225);
  return { ...x, result: 'pass', steps: ['boundary', 'gauges', 'relief'], people: { ...x.people, examiner: signed('J. Ruiz'), witness: { name: 'R. Lee', sig: '', signedAt: null } } };
};

const sketch = { ...newSketch(emptyBook(), T, 'BP-1'), id: 'iso1', name: 'ISO-3', strokes: [{ kind: 'run' as const, from: [0, 0, 0] as [number, number, number], to: [3, 0, 0] as [number, number, number] }] };
const html = (t: PressureTest, isos = [sketch]) => testRecordHtml({ test: t, dateLine: 'Printed 30 Sep 2026', isos, grid: 20, now: T + 60 * MIN });

describe('the pressure test record', () => {
  const h = html(passed());

  test('one self-contained document, everything typed escaped', () => {
    expect(h.startsWith('<!doctype html>')).toBe(true);
    expect(h).not.toContain('<script');
    expect(h).not.toContain('<b>');
    expect(h).toContain('TP-014 &lt;b&gt;');
    expect(h).toContain('CW-1001 &amp; CW-1002<br>isos 3-114');
  });

  test('says the figures, the limits, the hold and the result', () => {
    expect(h).toContain('225 psi');
    expect(h).toContain('at least 225 psi (1.5 × design)');
    expect(h).toContain('Hold started');
    expect(h).toContain('Hold ended');
    expect(h).toContain('Held: 15 min (needs 10 min: met)');
    expect(h).toContain('Pressure change over the hold: −1 psi');
    expect(h).toContain('PASSED');
    expect(h).toContain('No leaks');
    expect(h).toContain('12/31/2026');
  });

  test('draws the hold as a chart with the test pressure across it', () => {
    const svg = holdChartSvg(passed());
    expect(svg).toContain('<polyline');
    expect(svg).toContain('test 225 psi');
    expect(svg.match(/<circle/g)).toHaveLength(3);
    expect(holdChartSvg(rec())).toBe('');
    expect(h).toContain('Pressure through the hold');
  });

  test('prints the walk-down with ticks, and the checks the app made', () => {
    expect(h).toContain('Relief valve fitted and set</td><td>✓');
    expect(h).toContain('Filled from the low point');
    expect(h).toContain('Checked by the app');
    expect(h).toContain('>OK<');
  });

  test('prints each signature as drawn, and a line for one not yet given', () => {
    expect(h).toContain('J. Ruiz');
    expect(h.match(/<path d="M10 60L120 30L290 70"/g)).toHaveLength(1);
    expect(h).toContain('Signed 9/30/2026 9:30 am');
    expect(h).toContain('R. Lee');
    expect(h.match(/Signature · date/g)).toHaveLength(2);
  });

  test('a failed or open test says so under the title, and names what was found', () => {
    const f = html(rec({ result: 'fail', leaks: 'W-22 weeping at the toe', testPsi: 200 }));
    expect(f).toContain('class="problem">FAILED.');
    expect(f).toContain('W-22 weeping at the toe');
    expect(f).toContain('<td>FIX</td><td>200 psi is under the B31.3 minimum');
    expect(html(rec())).toContain('class="problem">OPEN.');
    expect(h).not.toContain('class="problem"');
  });

  test('the boundary isos go at the back, one to a page', () => {
    expect(h.match(/class="iso"/g)).toHaveLength(1);
    expect(h).toContain('Boundary iso 1 of 1: ISO-3');
    expect(html(passed(), [])).not.toContain('class="iso"');
  });

  test('a retest is named as one', () => {
    expect(html(retest(rec({ result: 'fail' }), T + 60 * MIN))).toContain('TP-014 &lt;b&gt; retest 1');
  });
});

describe('pressure tests in the turnover package', () => {
  const failed = rec({ id: 'a', result: 'fail', leaks: 'W-22' });
  const again = { ...retest(failed, T + 60 * MIN), id: 'b' };
  const ok = { ...passed(), id: 'c', pkg: 'TP-015' };

  test('a failed test with no retest, an open one, and an unsigned pass are open items, first', () => {
    expect(openItems([], [], [failed]).map((o) => o.needs)).toEqual(['Pressure test failed; no retest recorded']);
    expect(openItems([], [], [failed, again]).map((o) => [o.what, o.needs])).toEqual([['TP-014 <b> retest 1', 'Pressure test not signed off']]);
    const unsigned = { ...ok, people: { ...ok.people, examiner: { name: 'J. Ruiz', sig: '', signedAt: null } } };
    expect(openItems([], [], [unsigned])[0]?.needs).toBe('Examiner J. Ruiz has not signed the test record');
    expect(openItems([], [], [ok])).toEqual([]);
  });

  test('the package counts packages passed, lists every attempt, and escapes', () => {
    const i = { job: 'BP-1', dateLine: 'Printed 1 Oct 2026', joints: [], heats: [], sketches: [], readings: [], spools: [], tests: [failed, again, ok], grid: 20 };
    expect(turnoverTotals(i)[0]).toEqual({ label: 'Tests passed', value: '1 / 2' });
    const h = turnoverHtml(i);
    expect(h).toContain('3 pressure tests');
    expect(h).toContain('Pressure tests');
    expect(h).toContain('TP-014 &lt;b&gt; retest 1');
    expect(h).toContain('FAILED');
    expect(h).toContain('J. Ruiz');
    expect(h.indexOf('Pressure tests')).toBeLessThan(h.indexOf('Sign-off'));
  });
});

describe('the shift report on paper', () => {
  const text = ['SHIFT REPORT · BP-1', 'Wed 30 Sep 2026 · Crew 4', '', 'SUMMARY', 'Made 8 welds; W-14 <rejected>.', '', 'WELDS', '• 6": 8 welds, 48 DI', '• Total: 8 welds, 48 DI', '', 'ISSUES / DELAYS', 'Crane late 2 hrs'].join('\n');

  test('capital lines are headings, bullets are lists, the rest paragraphs, all escaped', () => {
    const b = reportBody(text.split('\n').slice(2).join('\n'));
    expect(b).toBe('<h2>SUMMARY</h2><p>Made 8 welds; W-14 &lt;rejected&gt;.</p><h2>WELDS</h2><ul><li>6&quot;: 8 welds, 48 DI</li><li>Total: 8 welds, 48 DI</li></ul><h2>ISSUES / DELAYS</h2><p>Crane late 2 hrs</p>');
  });

  test('the page heads with the job and the day, and says who wrote the words', () => {
    const plain = shiftSheetHtml({ title: 'Shift report', text, dateLine: 'Printed 30 Sep 2026', polished: false });
    expect(plain).toContain('<h1>Shift report · BP-1</h1>');
    expect(plain).toContain('Wed 30 Sep 2026 · Crew 4');
    expect(plain).not.toContain('Claude');
    const polished = shiftSheetHtml({ title: 'Shift report', text, dateLine: 'Printed 30 Sep 2026', polished: true });
    expect(polished).toContain('drafted by Claude');
    expect(polished).not.toContain('<script');
  });
});
