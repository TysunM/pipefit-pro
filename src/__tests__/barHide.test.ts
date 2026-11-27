import { BAR_START, BAR_TRAVEL, TUCK_PULL, barAfterScroll, barShown, handleShows, pullsDown, tucksAt, type BarScroll } from '../state/barHide';

// A page 2000 tall in a window 700 tall, scrolled through `ys` in turn.
const run = (ys: number[], content = 2000, view = 700): BarScroll[] => {
  const out: BarScroll[] = [];
  let s = BAR_START;
  for (const y of ys) {
    s = barAfterScroll(s, y, content, view);
    out.push(s);
  }
  return out;
};
const hidden = (ys: number[], content?: number, view?: number) => run(ys, content, view).map((s) => s.hidden);

describe('the tab bar while scrolling', () => {
  test('scrolling down a long page hides it once the page has gone far enough', () => {
    expect(hidden([10, 20, 24, 49, 120])).toEqual([false, false, false, true, true]);
  });

  test('a little way back up brings it back; a nudge does not', () => {
    const ys = [100, 300, 600, 590, 580, 570];
    expect(hidden(ys)).toEqual([true, true, true, true, true, false]);
    expect(600 - 570).toBeGreaterThan(BAR_TRAVEL);
  });

  test('down again after coming back hides it again, counted from where it turned', () => {
    expect(hidden([300, 600, 560, 570, 580, 590])).toEqual([true, true, false, false, false, true]);
  });

  test('at the top, and at the foot of the page, it is always there', () => {
    expect(hidden([400, 10])[1]).toBe(false);
    expect(hidden([400, 800, 1290])).toEqual([true, true, false]);
    expect(hidden([-30])).toEqual([false]);
  });

  test('a page that barely scrolls never loses it', () => {
    expect(hidden([10, 40, 60, 80], 780, 700)).toEqual([false, false, false, false]);
    expect(hidden([0, 200], 600, 700)).toEqual([false, false]);
  });

  test('shown on purpose, the page reporting where it already is does not hide it; a fresh stretch down does', () => {
    let s = run([300, 600]).pop()!;
    expect(s.hidden).toBe(true);
    s = barShown(s);
    s = barAfterScroll(s, 600, 2000, 700);
    expect(s.hidden).toBe(false);
    s = barAfterScroll(s, 615, 2000, 700);
    expect(s.hidden).toBe(false);
    s = barAfterScroll(s, 630, 2000, 700);
    expect(s.hidden).toBe(true);
  });
});

describe("tucking the Calculator's bar away", () => {
  test('a pull mostly down is the bar\'s; one along it, or a wobble, is not', () => {
    expect(pullsDown(2, 14)).toBe(true);
    expect(pullsDown(30, 14)).toBe(false);
    expect(pullsDown(0, 5)).toBe(false);
    expect(pullsDown(0, -20)).toBe(false);
  });
  test('pulled far enough, or flicked, it tucks; a short slow pull springs back', () => {
    expect(tucksAt(TUCK_PULL + 1, 0)).toBe(true);
    expect(tucksAt(10, 1.2)).toBe(true);
    expect(tucksAt(15, 0.1)).toBe(false);
  });
  test('the handle: a tap or a pull up brings it back; a drag across does not', () => {
    expect(handleShows(0, 0)).toBe(true);
    expect(handleShows(3, -30)).toBe(true);
    expect(handleShows(60, 2)).toBe(false);
    expect(handleShows(0, 30)).toBe(false);
  });
});
