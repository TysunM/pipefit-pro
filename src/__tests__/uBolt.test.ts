import {
  U_BOLTS,
  U_BOLT_DIAMETERS,
  U_BOLT_PLATE,
  U_BOLT_THREAD_PROUD,
  uBolt,
  uBoltDiameters,
  uBoltSizes,
} from '../calc/uBolt';
import { findRow } from '../calc/pipeData';

describe('U-bolts for pipe hangers', () => {
  test('fourteen printed sizes, half inch to ten', () => {
    expect(U_BOLTS.length).toBe(14);
    expect(uBoltSizes()[0]).toBe(0.5);
    expect(uBoltSizes()[13]).toBe(10);
  });

  test('rows read back as printed', () => {
    expect(uBolt(1, '1/4')).toBe(6.25);
    expect(uBolt(4, '5/8')).toBe(15.375);
    expect(uBolt(10, '1')).toBe(37.5);
  });

  // The page splits at four inch: the small bolts below, the large above.
  test('the small bolts stop at four inch and the large start at five', () => {
    for (const nps of [0.5, 1, 2, 4]) {
      expect(uBoltDiameters(nps)).not.toContain('3/4');
      expect(uBoltDiameters(nps)).toContain('1/4');
    }
    for (const nps of [5, 6, 8, 10]) {
      expect(uBoltDiameters(nps)).toEqual(['3/4', '7/8', '1']);
      expect(Number.isNaN(uBolt(nps, '1/4'))).toBe(true);
    }
  });

  test('the half and five eighths bolts start at two and a half inch', () => {
    for (const nps of [0.5, 0.75, 1, 1.25, 1.5, 2]) {
      expect(uBoltDiameters(nps)).toEqual(['1/4', '3/8']);
    }
    expect(uBoltDiameters(2.5)).toEqual(['1/4', '3/8', '1/2', '5/8']);
  });

  // Two bolt diameters often share one length, because the bend takes the
  // same stock: the quarter and three eighths from two and a half inch up, and
  // the three quarter and seven eighths throughout the large block.
  test('neighbouring bolt sizes share a length in the bigger pipe sizes', () => {
    for (const nps of [2.5, 3, 3.5, 4]) {
      expect(uBolt(nps, '1/4')).toBe(uBolt(nps, '3/8'));
      expect(uBolt(nps, '1/2')).toBe(uBolt(nps, '5/8'));
    }
    for (const nps of [5, 6, 8, 10]) {
      expect(uBolt(nps, '3/4')).toBe(uBolt(nps, '7/8'));
    }
    // Below two and a half the quarter and three eighths differ.
    for (const nps of [0.5, 1, 2]) {
      expect(uBolt(nps, '1/4')).toBeLessThan(uBolt(nps, '3/8'));
    }
  });

  // Every column grows with the size but one step: the three eighths bolt
  // comes back a quarter inch at two and a half, where it stops having its own
  // length and starts sharing the quarter inch bolt's.
  test('every length grows with the pipe size, bar the one merge step', () => {
    const dips: string[] = [];
    for (const d of U_BOLT_DIAMETERS) {
      let last = 0;
      for (const u of U_BOLTS) {
        const v = u.lengths[d];
        if (v === undefined) continue;
        if (v <= last) dips.push(`${d}@${u.nps}`);
        last = v;
      }
    }
    expect(dips).toEqual(['3/8@2.5']);
    expect(uBolt(2.5, '3/8')).toBeLessThan(uBolt(2, '3/8'));
    expect(uBolt(2.5, '3/8')).toBe(uBolt(2.5, '1/4'));
  });

  // A U-bolt has to reach round the pipe and through the plate twice over.
  test('the bolt is long enough to go round the pipe and through the plate', () => {
    for (const u of U_BOLTS) {
      const row = findRow(u.nps);
      if (!row) continue;
      const minimum = Math.PI * (row.od / 2) + 2 * (U_BOLT_PLATE + U_BOLT_THREAD_PROUD);
      for (const d of uBoltDiameters(u.nps)) {
        expect(uBolt(u.nps, d)).toBeGreaterThan(minimum);
      }
    }
  });

  test('a size or a bolt the page does not carry gives nothing', () => {
    expect(Number.isNaN(uBolt(12, '1'))).toBe(true);
    expect(Number.isNaN(uBolt(2, '1/2'))).toBe(true);
    expect(uBoltDiameters(12)).toEqual([]);
  });
});
