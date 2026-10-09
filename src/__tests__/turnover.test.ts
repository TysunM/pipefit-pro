import { answerMoved, confirmGap, expectedBolt, isAsked, tapBolt } from '../calc/boltUpSequence';
import { newHeat, type Heat } from '../calc/heat';
import { day, heatsUsed, openItems, turnoverHtml, turnoverTotals, type TurnoverInput } from '../print/turnover';
import { addCheck, newJoint, withState, type Joint } from '../state/register';
import { newSketch, emptyBook } from '../state/sketchStore';

const T = Date.UTC(2026, 8, 20, 12);

/** A joint worked `taps` bolts into its sequence, signed off unless told otherwise. */
function joint(tag: string, taps: number, heats: string[] = [], sign: Partial<Pick<Joint, 'boltedBy' | 'witnessedBy'>> = {}): Joint {
  let j = newJoint(tag.toLowerCase(), { cls: '125', nps: 6, bolts: 8, torque: 60, project: 'BP-1' }, T);
  let s = j.state;
  for (let k = 0; k < taps; k++) {
    if (s.gapPending) s = confirmGap(s);
    s = tapBolt(s, expectedBolt(s)).state;
  }
  if (isAsked(s)) s = answerMoved(s, false);
  j = withState({ ...j, tag, heats, boltedBy: 'J. Smith', witnessedBy: 'R. Lee', ...sign }, s, T + 1000);
  return j;
}
const FULL = 33; // snug, three rounds of eight, and the check round

const heat = (n: string, over: Partial<Heat> = {}): Heat => ({ ...newHeat(n, T), material: 'A106 Gr B', mill: 'Tenaris', mtr: 'MTR-7', ...over });

const input = (over: Partial<TurnoverInput> = {}): TurnoverInput => ({
  job: 'BP-1',
  dateLine: 'Printed 27 Sep 2026',
  joints: [],
  heats: [],
  sketches: [],
  readings: [],
  spools: [],
  tests: [],
  grid: 20,
  ...over,
});

describe('the punch list', () => {
  test('a clean job has nothing open', () => {
    const j = addCheck(joint('A', FULL, ['H1']), { moved: false, torque: null, note: '' }, T + 5000);
    expect(openItems([j], [heat('H1', { certified: true })])).toEqual([]);
  });

  test('unfinished work, missing checks and missing paper are all named, in that order', () => {
    const items = openItems(
      [joint('Part', 5, ['H1']), joint('Done', FULL, ['H2']), joint('Bare', FULL)],
      [heat('H1', { certified: true }), heat('H2', { certified: false })],
    );
    expect(items.map((i) => i.what)).toEqual(['Part', 'Done', 'Bare', 'Bare', 'Heat H2']);
    expect(items[0]?.needs).toContain('Bolt-up not finished');
    expect(items[1]?.needs).toBe('Retightening round not recorded');
    expect(items[3]?.needs).toBe('No heat number recorded');
    expect(items[4]?.needs).toContain('MTR not in hand (filed as MTR-7) (Done)');
  });

  test('a finished joint nobody signed is open, and says who is missing', () => {
    const settled = (sign: Partial<Pick<Joint, 'boltedBy' | 'witnessedBy'>>) =>
      addCheck(joint('A', FULL, ['H1'], sign), { moved: false, torque: null, note: '' }, T + 5000);
    const certs = [heat('H1', { certified: true })];
    expect(openItems([settled({ witnessedBy: '' })], certs)).toEqual([{ what: 'A', needs: 'Sign-off: a witness not recorded' }]);
    expect(openItems([settled({ boltedBy: ' ', witnessedBy: '' })], certs)[0]?.needs).toBe('Sign-off: who bolted it and a witness not recorded');
  });

  test('an unfinished joint is not also chased for a signature', () => {
    expect(openItems([joint('Part', 5, ['H1'], { boltedBy: '', witnessedBy: '' })], [heat('H1', { certified: true })])).toHaveLength(1);
  });

  test('a re-check where bolts took up is still open', () => {
    const j = addCheck(joint('Moved', FULL, ['H1']), { moved: true, torque: null, note: '' }, T + 5000);
    expect(openItems([j], [heat('H1', { certified: true })])[0]?.needs).toContain('took up');
  });

  test('a heat nobody entered in the book is called out as such', () => {
    expect(openItems([joint('A', 5, ['ZZ9'])], []).some((i) => i.what === 'Heat ZZ9' && i.needs.startsWith('Not in the heat book'))).toBe(true);
  });
});

describe('the heats a job used', () => {
  test('one row per heat however it was typed, with every joint it went into', () => {
    const used = heatsUsed([joint('A', 0, ['e7z-419']), joint('B', 0, ['E7Z419', 'K1'])], [heat('E7Z419')]);
    expect(used.map((u) => [u.number, u.joints])).toEqual([
      ['E7Z419', ['A', 'B']],
      ['K1', ['B']],
    ]);
    expect(used[1]?.heat).toBeUndefined();
  });
});

describe('the figures on the front', () => {
  test('bolted up, re-checked, proved and open', () => {
    const a = addCheck(joint('A', FULL, ['H1']), { moved: false, torque: null, note: '' }, T + 5000);
    const b = joint('B', 3);
    expect(turnoverTotals(input({ joints: [a, b], heats: [heat('H1', { certified: true })] }))).toEqual([
      { label: 'Bolted up', value: '1 / 2' },
      { label: 'Re-checked', value: '1 / 1' },
      { label: 'Heats proved', value: '1 / 2' },
      { label: 'Open items', value: '2' },
    ]);
  });
});

describe('the page', () => {
  const sketch = { ...newSketch(emptyBook(), T, 'BP-1'), name: 'L-204 <iso>', strokes: [{ kind: 'run' as const, from: [0, 0, 0] as [number, number, number], to: [3, 0, 0] as [number, number, number] }] };
  const h = turnoverHtml(
    input({
      joints: [joint('L-204 & "B"', FULL, ['H1'])],
      heats: [heat('H1')],
      sketches: [sketch, newSketch(emptyBook(), T)],
      readings: [{ id: 'r', tag: 'DL-7', slope: -1.2, inPerFt: -0.251, createdAt: T, project: 'BP-1' }],
    }),
  );

  test('one self-contained document that fetches nothing', () => {
    expect(h.startsWith('<!doctype html>')).toBe(true);
    expect(h).not.toContain('<script');
    expect(h).not.toContain('<img');
    expect(h).not.toContain('<link');
  });

  test('names the job and leads with what is open', () => {
    expect(h).toContain('Job BP-1');
    expect(h.indexOf('Open items')).toBeLessThan(h.indexOf('Flange bolt-up record'));
    expect(h).toContain('OWED');
  });

  test('everything typed is escaped', () => {
    expect(h).not.toContain('L-204 & "B"');
    expect(h).toContain('L-204 &amp; &quot;B&quot;');
    expect(h).not.toContain('<iso>');
  });

  test('empty isos are left out; drawn ones get a page each', () => {
    expect(h.match(/class="iso"/g)).toHaveLength(1);
    expect(h).toContain('Iso 1 of 1');
  });

  test('the record names who bolted and who witnessed', () => {
    expect(h).toContain('<th>Bolted by</th>');
    expect(h).toContain('<td>J. Smith</td>');
    expect(h).toContain('<td>R. Lee</td>');
  });

  test('signed by QC and the supervisor', () => {
    expect(h).toContain('QC inspector');
    expect(h).toContain('Supervisor');
  });

  test('a reading is written with its sign and a real minus', () => {
    expect(h).toContain('−1.2°');
    expect(h).toContain('−0.251 in/ft');
  });

  test('an all-jobs package says so', () => {
    expect(turnoverHtml(input({ job: '' }))).toContain('Job All jobs');
  });

  test('a clean job says it has nothing open', () => {
    expect(turnoverHtml(input())).toContain('<td>None</td>');
  });
});

test('dates read as a form writes them', () => {
  expect(day(new Date(2026, 8, 7, 9).getTime())).toBe('7 Sep 2026');
});
