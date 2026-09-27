import {
  LEVELS_VERSION,
  MAX_READINGS,
  TAG_MAX,
  addReading,
  deleteReading,
  emptyLog,
  parseLog,
  serialiseLog,
  validReading,
} from '../state/levelLog';

const T0 = 1_790_000_000_000;

describe('keeping a reading', () => {
  test('a reading is kept by the pipe it was taken on, with its fall worked out', () => {
    const log = addReading(emptyLog(), '  Line 12  ', 1, T0);
    expect(log.readings).toHaveLength(1);
    const r = log.readings[0]!;
    expect(r.tag).toBe('Line 12');
    expect(r.slope).toBe(1);
    // One degree is a little under a quarter inch per foot.
    expect(r.inPerFt).toBeCloseTo(0.2095, 3);
  });

  test('a reading with no name, or no figure, is not kept', () => {
    expect(addReading(emptyLog(), '   ', 1, T0).readings).toHaveLength(0);
    expect(addReading(emptyLog(), 'Line 12', Number.NaN, T0).readings).toHaveLength(0);
  });

  test('two readings in the same millisecond still get their own ids', () => {
    const log = addReading(addReading(emptyLog(), 'A', 0, T0), 'B', 0, T0);
    expect(new Set(log.readings.map((r) => r.id)).size).toBe(2);
  });

  test('newest first, and the oldest goes past the cap, never the new one', () => {
    let log = emptyLog();
    for (let i = 0; i < MAX_READINGS; i++) log = addReading(log, `P${i}`, 0, T0 + i);
    log = addReading(log, 'newest', 0.5, T0 + MAX_READINGS);
    expect(log.readings).toHaveLength(MAX_READINGS);
    expect(log.readings[0]!.tag).toBe('newest');
    expect(log.readings.some((r) => r.tag === 'P0')).toBe(false);
  });

  test('a long name is cut to fit', () => {
    const log = addReading(emptyLog(), 'X'.repeat(TAG_MAX + 20), 0, T0);
    expect(log.readings[0]!.tag).toHaveLength(TAG_MAX);
  });

  test('a reading can be taken back out', () => {
    const log = addReading(emptyLog(), 'A', 0, T0);
    const id = log.readings[0]!.id;
    expect(deleteReading(log, id).readings).toHaveLength(0);
    expect(deleteReading(log, 'nope')).toBe(log);
  });
});

describe('the store on the device', () => {
  test('what is written reads back the same', () => {
    const log = addReading(addReading(emptyLog(), 'A', -0.8, T0), 'B', 2.5, T0 + 5);
    expect(parseLog(serialiseLog(log))).toEqual(log);
  });

  test('nothing stored reads as an empty log', () => {
    expect(parseLog(null)).toEqual(emptyLog());
  });

  test('a store from a newer app is left alone', () => {
    const raw = JSON.stringify({ v: LEVELS_VERSION + 1, readings: [] });
    expect(parseLog(raw).foreign).toBe(true);
  });

  test('a broken reading is dropped and counted, the rest kept', () => {
    const good = addReading(emptyLog(), 'A', 1, T0).readings[0];
    const raw = JSON.stringify({ v: LEVELS_VERSION, readings: [good, { id: 'x', tag: '', slope: 1, inPerFt: 0, createdAt: T0 }, good] });
    const log = parseLog(raw);
    expect(log.readings).toHaveLength(1);
    expect(log.dropped).toBe(2);
  });

  test('garbage is not a reading', () => {
    expect(validReading(null)).toBeNull();
    expect(validReading({ id: 'a', tag: 'x', slope: 200, inPerFt: 0, createdAt: T0 })).toBeNull();
    expect(validReading({ id: 'a', tag: 'x', slope: 1, inPerFt: 0, createdAt: 1.5 })).toBeNull();
  });
});
