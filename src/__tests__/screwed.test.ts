import { SCREWED_FITTINGS, screwedCenterToEnd, screwedFitting, screwedSizes } from '../calc/screwedFitting';
import { NPT_TABLE } from '../calc/thread';
import { findRow } from '../calc/pipeData';

describe('screwed fitting dimensions', () => {
  test('all seventeen printed sizes, a quarter inch to twelve', () => {
    expect(SCREWED_FITTINGS.length).toBe(17);
    expect(SCREWED_FITTINGS[0]!.nps).toBe(0.25);
    expect(SCREWED_FITTINGS[16]!.nps).toBe(12);
  });

  test('rows read back as printed', () => {
    expect(screwedFitting(0.5)).toMatchObject({ centerToEnd: 1.12, centerToEnd45: 0.88, bandCastIron: 1.34 });
    expect(screwedFitting(2)).toMatchObject({ centerToEnd: 2.25, centerToEnd45: 1.68, bandCastIron: 3.28 });
    expect(screwedFitting(6)).toMatchObject({ centerToEnd: 5.13, centerToEnd45: 3.46, bandCastIron: 8.28 });
    expect(screwedFitting(12)).toMatchObject({ centerToEnd: 9.5, centerToEnd45: 5.97, bandCastIron: 15.47 });
  });

  test('a 45 always reaches less far than a 90', () => {
    for (const f of SCREWED_FITTINGS) expect(f.centerToEnd45).toBeLessThan(f.centerToEnd);
  });

  test('the band always clears the pipe it screws onto', () => {
    for (const f of SCREWED_FITTINGS) {
      const row = findRow(f.nps);
      if (!row) continue;
      expect(f.bandCastIron).toBeGreaterThan(row.od);
    }
  });

  test('malleable is always slimmer than cast iron', () => {
    for (const f of SCREWED_FITTINGS) {
      if (!Number.isFinite(f.bandMalleable)) continue;
      expect(f.bandMalleable).toBeLessThan(f.bandCastIron);
    }
  });

  test('malleable stops at six inch, as printed', () => {
    for (const f of SCREWED_FITTINGS) {
      expect(Number.isFinite(f.bandMalleable)).toBe(f.nps <= 6);
    }
  });

  test('every dimension grows with the size', () => {
    for (let i = 1; i < SCREWED_FITTINGS.length; i++) {
      const p = SCREWED_FITTINGS[i - 1]!;
      const q = SCREWED_FITTINGS[i]!;
      expect(q.nps).toBeGreaterThan(p.nps);
      expect(q.centerToEnd).toBeGreaterThan(p.centerToEnd);
      expect(q.centerToEnd45).toBeGreaterThan(p.centerToEnd45);
      expect(q.bandCastIron).toBeGreaterThan(p.bandCastIron);
    }
  });

  test('the turn decides which dimension comes back', () => {
    expect(screwedCenterToEnd(2, 90)).toBe(2.25);
    expect(screwedCenterToEnd(2, 45)).toBe(1.68);
  });

  test('a turn the table does not carry gives nothing', () => {
    for (const a of [22.5, 30, 60, 0]) expect(Number.isFinite(screwedCenterToEnd(2, a))).toBe(false);
    expect(Number.isFinite(screwedCenterToEnd(7, 90))).toBe(false);
  });

  test('every size is one the pipe tables also carry', () => {
    for (const f of SCREWED_FITTINGS) expect(findRow(f.nps)).toBeDefined();
  });

  test('every size also has a thread', () => {
    for (const f of SCREWED_FITTINGS) expect(NPT_TABLE.some((t) => t.nps === f.nps)).toBe(true);
  });

  test('the size list matches the table', () => expect(screwedSizes().length).toBe(17));
});
