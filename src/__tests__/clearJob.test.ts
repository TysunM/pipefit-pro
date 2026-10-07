import { clearCounts, countsText, without } from '../state/clearJob';

describe('clearing a job', () => {
  test('says what goes, kind by kind, leaving out what has none', () => {
    const c = clearCounts([
      { label: 'pressure tests', items: [1] },
      { label: 'welds', items: [1, 2, 3] },
      { label: 'isos', items: [] },
      { label: 'joints', items: [1, 2] },
    ]);
    expect(countsText(c)).toBe('1 pressure test, 3 welds and 2 joints');
    expect(countsText([])).toBe('nothing');
  });

  test('takes off by id, and gives the same list back when nothing goes', () => {
    const xs = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }, { id: 'c', n: 3 }];
    expect(without(xs, [{ id: 'b' }])).toEqual([{ id: 'a', n: 1 }, { id: 'c', n: 3 }]);
    expect(without(xs, [])).toBe(xs);
    expect(without(xs, [{ id: 'zz' }])).toBe(xs);
  });
});
