import {
  PE_MINIMUM_COVER_BEFORE_BACKFILL,
  PE_RATED_100,
  PE_RATED_75,
  PE_SCH40,
  PVC_A,
  PVC_SCH40,
  PVC_SCH80,
  PVC_SCH120,
  PVC_TEMPERATURES,
  THREADED_PRESSURE_FACTOR,
  pePressure,
  peRow,
  peSizes,
  peSlack,
  pvcOd,
  pvcPressure,
  pvcRow,
  pvcSizes,
  pvcWall,
  threadedPressure,
} from '../calc/plasticPipe';
import { findRow, pipeDims } from '../calc/pipeData';

describe('polyvinyl chloride pipe', () => {
  test('four schedules as printed', () => {
    expect(PVC_A.length).toBe(9);
    expect(PVC_SCH40.length).toBe(10);
    expect(PVC_SCH80.length).toBe(10);
    expect(PVC_SCH120.length).toBe(10);
    expect(pvcSizes('A')).not.toContain(6);
    expect(pvcSizes('40')).toContain(6);
  });

  test('rows read back as printed', () => {
    expect(pvcRow(2, '40')).toMatchObject({ id: 2.067, typeI75: 195, typeII130: 45 });
    expect(pvcRow(0.5, '120')).toMatchObject({ id: 0.5, typeI75: 680 });
  });

  // The page says so outright, and it is what makes the wall workable.
  test('the schedule 40 and 80 bores are the steel bores exactly', () => {
    for (const schedule of ['40', '80'] as const) {
      for (const r of PVC_BY(schedule)) {
        const steel = pipeDims(r.nps, schedule === '40' ? '40' : '80');
        if (!steel) continue;
        expect(r.id).toBeCloseTo(steel.id, 3);
      }
    }
  });

  test('the outside diameter is the iron pipe size', () => {
    for (const r of PVC_SCH40) expect(pvcOd(r.nps)).toBe(findRow(r.nps)!.od);
    expect(Number.isNaN(pvcOd(7))).toBe(true);
  });

  test('a heavier schedule has a thicker wall and a smaller bore', () => {
    for (const r of PVC_SCH120) {
      const eighty = pvcRow(r.nps, '80')!;
      const forty = pvcRow(r.nps, '40')!;
      expect(r.id).toBeLessThan(eighty.id);
      expect(eighty.id).toBeLessThan(forty.id);
      expect(pvcWall(r.nps, '120')).toBeGreaterThan(pvcWall(r.nps, '80'));
      expect(pvcWall(r.nps, '80')).toBeGreaterThan(pvcWall(r.nps, '40'));
    }
  });

  // Lightweight schedule A has the largest bore of all, and the lowest rating.
  test('schedule A is the thinnest wall and the weakest', () => {
    for (const r of PVC_A) {
      const forty = pvcRow(r.nps, '40');
      if (!forty) continue;
      expect(r.id).toBeGreaterThan(forty.id);
      expect(r.typeI75).toBeLessThan(forty.typeI75);
    }
  });

  test('type II always takes less pressure than type I, and heat takes more off', () => {
    for (const schedule of ['A', '40', '80', '120'] as const) {
      for (const r of PVC_BY(schedule)) {
        expect(r.typeII75).toBeLessThan(r.typeI75);
        expect(r.typeI150).toBeLessThan(r.typeI75);
        expect(r.typeII130).toBeLessThan(r.typeII75);
      }
    }
  });

  test('a heavier schedule takes more pressure in every size', () => {
    for (const r of PVC_SCH120) {
      expect(r.typeI75).toBeGreaterThan(pvcRow(r.nps, '80')!.typeI75);
      expect(pvcRow(r.nps, '80')!.typeI75).toBeGreaterThan(pvcRow(r.nps, '40')!.typeI75);
    }
  });

  describe('working out a pressure', () => {
    test('the printed temperatures read straight back', () => {
      expect(pvcPressure(2, '40', 'I', 75)).toBe(195);
      expect(pvcPressure(2, '40', 'I', 150)).toBe(110);
      expect(pvcPressure(2, '40', 'II', 130)).toBe(45);
      expect(PVC_TEMPERATURES.I).toEqual([75, 150]);
      expect(PVC_TEMPERATURES.II).toEqual([75, 130]);
    });

    // The page says intermediate values may be interpolated.
    test('a temperature between the two is interpolated', () => {
      const mid = pvcPressure(2, '40', 'I', 112.5);
      expect(mid).toBeCloseTo((195 + 110) / 2, 6);
      expect(mid).toBeLessThan(195);
      expect(mid).toBeGreaterThan(110);
    });

    // The note under the table, applied rather than left as prose.
    test('threading takes about forty five per cent off', () => {
      expect(THREADED_PRESSURE_FACTOR).toBe(0.55);
      expect(threadedPressure(200)).toBeCloseTo(110, 9);
      expect(pvcPressure(2, '40', 'I', 75, 'threaded')).toBeCloseTo(195 * 0.55, 9);
      expect(pvcPressure(2, '40', 'I', 75, 'threaded')).toBeLessThan(pvcPressure(2, '40', 'I', 75));
    });

    test('outside the table nothing is worked out', () => {
      expect(Number.isNaN(pvcPressure(2, '40', 'I', 200))).toBe(true);
      expect(Number.isNaN(pvcPressure(2, '40', 'II', 140))).toBe(true);
      expect(Number.isNaN(pvcPressure(2, '40', 'I', 60))).toBe(true);
      expect(Number.isNaN(pvcPressure(8, '40'))).toBe(true);
      expect(Number.isNaN(threadedPressure(NaN))).toBe(true);
    });
  });
});

describe('polyethylene pipe', () => {
  test('three series as printed', () => {
    expect(PE_RATED_75.length).toBe(8);
    expect(PE_SCH40.length).toBe(10);
    expect(PE_RATED_100.length).toBe(8);
    expect(peSizes('rated75')).not.toContain(2.5);
  });

  test('rows read back as printed', () => {
    expect(peRow(2, 'schedule40')).toMatchObject({ od: 2.375, id: 2.067, at75: 50 });
    expect(peRow(2, 'rated100')).toMatchObject({ od: 2.777, at75: 100 });
  });

  // The pressure-rated series hold one figure across every size, which is what
  // "pressure rated" means: the wall grows with the bore to keep it.
  test('a pressure rated series holds its rating in every size', () => {
    for (const r of PE_RATED_75) expect(r.at75).toBe(75);
    for (const r of PE_RATED_100) expect(r.at75).toBe(100);
    // Schedule 40 does not: the wall is set by the schedule, so it falls away.
    expect(PE_SCH40[0]!.at75).toBeGreaterThan(PE_SCH40[9]!.at75);
  });

  test('the schedule 40 outside diameter is the iron pipe size', () => {
    for (const r of PE_SCH40) expect(r.od).toBe(findRow(r.nps)!.od);
  });

  test('the bore is the steel schedule 40 bore in every series', () => {
    for (const series of ['rated75', 'schedule40', 'rated100'] as const) {
      for (const r of peSizes(series).map((n) => peRow(n, series)!)) {
        const steel = pipeDims(r.nps, '40');
        if (!steel) continue;
        expect(r.id).toBeCloseTo(steel.id, 2);
      }
    }
  });

  // A higher rating needs a thicker wall on the same bore, so a bigger outside.
  test('the higher rated series is the bigger pipe on the same bore', () => {
    for (const r of PE_RATED_100) {
      const lighter = peRow(r.nps, 'rated75');
      if (!lighter) continue;
      expect(r.id).toBe(lighter.id);
      expect(r.od).toBeGreaterThan(lighter.od);
    }
  });

  test('heat takes about a third off in every series', () => {
    for (const series of ['rated75', 'schedule40', 'rated100'] as const) {
      for (const n of peSizes(series)) {
        const r = peRow(n, series)!;
        expect(r.at120).toBeLessThan(r.at75);
        expect(r.at120 / r.at75).toBeGreaterThan(0.6);
        expect(r.at120 / r.at75).toBeLessThan(0.7);
      }
    }
  });

  test('a temperature between the two is interpolated', () => {
    expect(pePressure(2, 'schedule40', 75)).toBe(50);
    expect(pePressure(2, 'schedule40', 120)).toBe(32);
    expect(pePressure(2, 'schedule40', 97.5)).toBeCloseTo(41, 6);
    expect(Number.isNaN(pePressure(2, 'schedule40', 150))).toBe(true);
    expect(Number.isNaN(pePressure(8, 'schedule40'))).toBe(true);
  });

  // Laid in a ditch, the pipe is snaked so it has slack to contract.
  test('a run is snaked a foot in every hundred', () => {
    expect(peSlack(100)).toBe(1);
    expect(peSlack(250)).toBe(2.5);
    expect(Number.isNaN(peSlack(0))).toBe(true);
    expect(PE_MINIMUM_COVER_BEFORE_BACKFILL).toBe(6);
  });
});

function PVC_BY(schedule: 'A' | '40' | '80' | '120') {
  return schedule === 'A' ? PVC_A
    : schedule === '40' ? PVC_SCH40
    : schedule === '80' ? PVC_SCH80
    : PVC_SCH120;
}
