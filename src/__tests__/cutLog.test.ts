import { MAX_CUTS, addCut, clearCuts, cutGroups, cutListText, deleteCut, emptyCuts, nextMark, parseCuts, serialiseCuts, toggleCut } from '../state/cutLog';

const T = 1_760_000_000_000;
const two = { pipeKey: 'cs:40|2', pipe: '2" CS SCH 40', c2c: 48, cut: 41.75, ends: '90° LR elbow × 90° LR elbow' };
const four = { pipeKey: 'cs:40|4', pipe: '4" CS SCH 40', c2c: 60, cut: 47.875, ends: '90° LR elbow × Open end' };

describe('adding cuts', () => {
  test('numbers them per job, and keeps a mark given', () => {
    let l = addCut(emptyCuts(), two, T, 'BP-1');
    l = addCut(l, two, T + 1, 'BP-1');
    l = addCut(l, { ...two, mark: 'L12-3' }, T + 2, 'BP-1');
    l = addCut(l, two, T + 3, 'OTHER');
    expect(l.cuts.map((c) => `${c.project}:${c.mark}`)).toEqual(['BP-1:1', 'BP-1:2', 'BP-1:L12-3', 'OTHER:1']);
    expect(nextMark(l, 'BP-1')).toBe('3');
  });

  test('refuses a cut that is not a length', () => {
    expect(addCut(emptyCuts(), { ...two, cut: NaN }, T).cuts).toHaveLength(0);
    expect(addCut(emptyCuts(), { ...two, cut: -2 }, T).cuts).toHaveLength(0);
  });

  test('past the cap the oldest cut one goes, and an uncut list is never cut short', () => {
    let l = emptyCuts();
    for (let i = 0; i < MAX_CUTS; i++) l = addCut(l, two, T + i);
    expect(addCut(l, two, T + MAX_CUTS).cuts).toHaveLength(MAX_CUTS);
    expect(addCut(l, two, T + MAX_CUTS)).toBe(l);
    const first = l.cuts[0]!.id;
    l = toggleCut(l, first);
    const more = addCut(l, two, T + MAX_CUTS);
    expect(more.cuts).toHaveLength(MAX_CUTS);
    expect(more.cuts.some((c) => c.id === first)).toBe(false);
  });
});

describe('the list', () => {
  let l = emptyCuts();
  l = addCut(l, two, T);
  l = addCut(l, four, T + 1);
  l = addCut(l, two, T + 2);
  l = toggleCut(l, l.cuts[0]!.id);

  test('by pipe, with only what is left packed onto sticks', () => {
    const g = cutGroups(l.cuts, 240, 0.125);
    expect(g.map((x) => [x.pipe, x.cuts.length, x.toGo])).toEqual([
      ['2" CS SCH 40', 2, 1],
      ['4" CS SCH 40', 1, 1],
    ]);
    expect(g[0]!.plan.ok && g[0]!.plan.count).toBe(1);
  });

  test('as text for the saw', () => {
    const text = cutListText(cutGroups(l.cuts, 240, 0.125), { title: 'Cut list · BP-1', length: (v) => `${v}"` });
    expect(text).toBe(
      [
        'Cut list · BP-1',
        '',
        '2" CS SCH 40 — pull 1 stick',
        '  ✓ 1: 41.75"  (C-C 48", 90° LR elbow × 90° LR elbow)',
        '  ☐ 3: 41.75"  (C-C 48", 90° LR elbow × 90° LR elbow)',
        '',
        '4" CS SCH 40 — pull 1 stick',
        '  ☐ 2: 47.875"  (C-C 60", 90° LR elbow × Open end)',
      ].join('\n'),
    );
  });

  test('clearing the cut ones, deleting one, and the store round trip', () => {
    expect(clearCuts(l, l.cuts, true).cuts.map((c) => c.mark)).toEqual(['2', '3']);
    expect(clearCuts(l, l.cuts, false).cuts).toHaveLength(0);
    expect(deleteCut(l, l.cuts[1]!.id).cuts.map((c) => c.mark)).toEqual(['1', '3']);
    expect(parseCuts(serialiseCuts(l)).cuts).toEqual(l.cuts);
    expect(parseCuts('{"v":99,"cuts":[]}').foreign).toBe(true);
    expect(parseCuts('not json').dropped).toBe(1);
  });
});
