import { localIntent } from '../voice/intent';

describe('"undo" by voice', () => {
  test('takes back the last thing voice wrote, said any of the usual ways', () => {
    for (const s of ['undo', 'undo that', 'take that back', 'take it back', 'scratch that', 'please undo'])
      expect([s, localIntent(s, 'Home')?.kind]).toEqual([s, 'undo']);
  });
  test('on the bolt-up it is still the last bolt', () => {
    expect(localIntent('undo', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'undo' });
  });
  test('a longer sentence with "undo" in it is not taken for it', () => {
    expect(localIntent('how do I undo a weld log entry', 'Home')?.kind).not.toBe('undo');
  });
});
