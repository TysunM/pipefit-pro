import { barSettings, readBar } from '../voice/barWords';
import { localIntent } from '../voice/intent';

const act = (said: string) => {
  const c = localIntent(said, null);
  return c?.kind === 'bar' ? c.act : c ? `not the bar: ${c.kind}` : null;
};

describe('the tab bar by voice', () => {
  test('auto-hide, said every way', () => {
    for (const s of ['auto hide the tab bar', 'auto-hide the tab bar', 'autohide tab bar', 'turn on auto hide', 'hide the tab bar on every tab', 'always hide the tab bar', 'set the tab bar to auto hide', 'tab bar auto hide please'])
      expect([s, act(s)]).toEqual([s, 'auto']);
  });

  test('hiding as you scroll', () => {
    for (const s of ['hide the tab bar as I scroll', 'tab bar hides when I scroll', 'hide the tabs when scrolling', 'set the tab bar to scroll mode'])
      expect([s, act(s)]).toEqual([s, 'scroll']);
  });

  test('stop hiding it: it stays put', () => {
    for (const s of ['stop hiding the tab bar', 'turn off auto hide', 'turn auto hide off', "don't hide the tab bar", 'keep the tab bar', 'tab bar only when I tuck it', 'never hide the bottom bar'])
      expect([s, act(s)]).toEqual([s, 'stay']);
  });

  test('tucked away and brought back', () => {
    for (const s of ['hide the tab bar', 'tuck the tab bar away', 'get rid of the tab bar', 'hide the tabs', 'keep the tab bar hidden']) expect([s, act(s)]).toEqual([s, 'hide']);
    for (const s of ['show the tab bar', 'bring back the tab bar', 'bring the tabs back', 'unhide the nav bar', 'tab bar back please']) expect([s, act(s)]).toEqual([s, 'show']);
  });

  test('never the bar unless the bar is named, and nothing else is taken for it', () => {
    expect(readBar(['hide', 'it'])).toBeNull();
    expect(readBar(['10', 'bar', 'to', 'psi'])).toBeNull();
    expect(act('convert 10 bar to psi')).not.toBe('hide');
    expect(act('weld tab')).toBe('not the bar: open');
    expect(act('show me the rigging tab')).toBe('not the bar: open');
    expect(act('tools tab')).toBe('not the bar: open');
    expect(readBar(['tab', 'bar'])).toBeNull();
  });

  test('what each sets, and says', () => {
    const cur = { barMode: 'scroll' as const, barTucked: false };
    expect(barSettings('auto', cur).patch).toEqual({ barMode: 'auto', barTucked: true });
    expect(barSettings('scroll', { barMode: 'auto', barTucked: true }).patch).toEqual({ barMode: 'scroll', barTucked: false });
    expect(barSettings('stay', cur).patch).toEqual({ barMode: 'stay', barTucked: false });
    expect(barSettings('hide', cur).patch).toEqual({ barTucked: true });
    expect(barSettings('hide', { ...cur, barTucked: true }).reply).toMatch(/already/);
    expect(barSettings('show', { barMode: 'auto', barTucked: true }).reply).toMatch(/next tab/);
    expect(barSettings('show', cur).reply).toMatch(/already/);
  });
});
