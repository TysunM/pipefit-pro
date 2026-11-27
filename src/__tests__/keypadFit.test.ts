import { COMPACT_BELOW, KEY_HEIGHT, MIN_KEY, ROW_EXTRA, fitKeys, padHeight } from '../components/keypad/fit';

const ROWS = 8;

describe('fitting the trade pad to the room', () => {
  test('with room, full-size keys with the second functions over them', () => {
    const f = fitKeys(1000, ROWS);
    expect(f).toEqual({ keyHeight: KEY_HEIGHT, compact: false, scrolls: false });
    expect(fitKeys(null, ROWS).keyHeight).toBe(KEY_HEIGHT);
  });

  test('a little short, the keys come down and the second functions stay over them', () => {
    const room = ROWS * (45 + ROW_EXTRA);
    const f = fitKeys(room, ROWS);
    expect(f.compact).toBe(false);
    expect(f.keyHeight).toBe(45);
    expect(padHeight(f, ROWS)).toBeLessThanOrEqual(room);
  });

  test('shorter, the second functions go inside the keys, and the keys are taller for it', () => {
    const room = ROWS * (COMPACT_BELOW - 1 + ROW_EXTRA);
    const f = fitKeys(room, ROWS);
    expect(f.compact).toBe(true);
    expect(f.keyHeight).toBeGreaterThan(COMPACT_BELOW);
    expect(f.scrolls).toBe(false);
    expect(padHeight(f, ROWS)).toBeLessThanOrEqual(room);
  });

  test('every room that fits at all, the pad fits it; past that it scrolls, never under the bar', () => {
    for (let room = 200; room <= 700; room += 1) {
      const f = fitKeys(room, ROWS);
      if (f.scrolls) expect(f.keyHeight).toBe(MIN_KEY);
      else expect([room, padHeight(f, ROWS) <= room]).toEqual([room, true]);
    }
    expect(fitKeys(250, ROWS).scrolls).toBe(true);
  });
});
