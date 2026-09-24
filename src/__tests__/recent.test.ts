import { EMPTY, KEEP_RECENT, RECENT_VERSION, SHOW_RECENT, parseRecent, pushRecent, shown } from '../state/recent';

const known = (r: string) =>
  ['Calculator', 'Level', 'SimpleOffset', 'CutLength', 'Heats', 'Joints', 'Reference'].includes(r);

describe('putting a tool at the front', () => {
  test('the newest is first', () => {
    expect(pushRecent(['Level'], 'Calculator')).toEqual(['Calculator', 'Level']);
  });

  test('opening the same tool twice does not fill the strip with it', () => {
    let r = pushRecent([], 'Level');
    r = pushRecent(r, 'Level');
    r = pushRecent(r, 'Level');
    expect(r).toEqual(['Level']);
  });

  test('reopening one already held moves it up rather than adding it again', () => {
    const r = pushRecent(['Level', 'Calculator', 'Heats'], 'Heats');
    expect(r).toEqual(['Heats', 'Level', 'Calculator']);
  });

  test('the list is capped, and the oldest falls off the end', () => {
    let r: string[] = [];
    for (let i = 0; i < KEEP_RECENT + 5; i += 1) r = pushRecent(r, `T${i}`);
    expect(r).toHaveLength(KEEP_RECENT);
    expect(r[0]).toBe(`T${KEEP_RECENT + 4}`);
  });

  test('more is kept than is shown, so the strip still fills when one is dropped', () => {
    expect(KEEP_RECENT).toBeGreaterThan(SHOW_RECENT);
  });

  test('the strip shows the newest three', () => {
    expect(shown(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c']);
  });
});

describe('reading what was stored', () => {
  const store = (routes: string[]) => JSON.stringify({ version: RECENT_VERSION, routes });

  test('a first launch has nothing', () => {
    expect(parseRecent(null, known)).toEqual(EMPTY);
  });

  test('what was written comes back in order', () => {
    expect(parseRecent(store(['Heats', 'Level']), known).routes).toEqual(['Heats', 'Level']);
  });

  test('a tool taken out of the app is dropped rather than left to go nowhere', () => {
    // Thread engagement was on the home screen and is not any more. A phone
    // that had it open last must not show a card that navigates nowhere.
    expect(parseRecent(store(['ThreadEngagement', 'Level']), known).routes).toEqual(['Level']);
  });

  test('a store written by a newer app is read as empty, not half understood', () => {
    const newer = JSON.stringify({ version: RECENT_VERSION + 1, routes: ['Level'] });
    expect(parseRecent(newer, known)).toEqual(EMPTY);
  });

  test('rubbish falls back to nothing rather than failing the launch', () => {
    for (const raw of ['{not json', '[]', 'null', '42', '"text"', '{"version":1}']) {
      expect(parseRecent(raw, known)).toEqual(EMPTY);
    }
  });

  test('a duplicate or a non-string in the store is thrown away', () => {
    const messy = JSON.stringify({ version: RECENT_VERSION, routes: ['Level', 'Level', 7, null, 'Heats'] });
    expect(parseRecent(messy, known).routes).toEqual(['Level', 'Heats']);
  });

  test('a store longer than the cap is cut to it', () => {
    const many = Array.from({ length: KEEP_RECENT + 6 }, (_, i) => (i % 2 ? 'Level' : 'Heats'));
    expect(parseRecent(store(many), known).routes.length).toBeLessThanOrEqual(KEEP_RECENT);
  });
});
