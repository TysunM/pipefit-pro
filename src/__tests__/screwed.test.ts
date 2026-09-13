import {
  SCREWED_FITTINGS, SCREWED_HEAVY, SCREWED_STANDARD, screwedCenterToEnd, screwedFitting, screwedSizes,
} from '../calc/screwedFitting';
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

describe('the heavy class', () => {
  test('all seventeen sizes, matching the standard class', () => {
    expect(SCREWED_HEAVY.length).toBe(17);
    expect(SCREWED_HEAVY.map((f) => f.nps)).toEqual(SCREWED_STANDARD.map((f) => f.nps));
  });

  test('rows read back as printed', () => {
    expect(screwedFitting(0.5, 'heavy')).toMatchObject({ centerToEnd: 1.25, centerToEnd45: 1, bandCastIron: 1.59 });
    expect(screwedFitting(2, 'heavy')).toMatchObject({ centerToEnd: 2.5, centerToEnd45: 2, bandCastIron: 3.74 });
    expect(screwedFitting(12, 'heavy')).toMatchObject({ centerToEnd: 10, centerToEnd45: 6, bandCastIron: 16.84 });
  });

  test('a heavy fitting always reaches further and is always fatter', () => {
    for (const h of SCREWED_HEAVY) {
      const s = screwedFitting(h.nps)!;
      expect(h.centerToEnd).toBeGreaterThan(s.centerToEnd);
      expect(h.centerToEnd45).toBeGreaterThan(s.centerToEnd45);
      expect(h.bandCastIron).toBeGreaterThan(s.bandCastIron);
    }
  });

  // The two tables were read separately. The 300 lb malleable band is printed
  // as the same figure as the 125 lb cast iron band on every row they share,
  // which is a check that neither reading drifted.
  test('300 lb malleable matches 125 lb cast iron on every shared row', () => {
    let shared = 0;
    for (const h of SCREWED_HEAVY) {
      if (!Number.isFinite(h.bandMalleable)) continue;
      expect(h.bandMalleable).toBeCloseTo(screwedFitting(h.nps)!.bandCastIron, 10);
      shared++;
    }
    expect(shared).toBe(10);
  });

  test('300 lb malleable stops at three inch, as printed', () => {
    for (const h of SCREWED_HEAVY) expect(Number.isFinite(h.bandMalleable)).toBe(h.nps <= 3);
  });

  test('a 45 always reaches less far than a 90', () => {
    for (const h of SCREWED_HEAVY) expect(h.centerToEnd45).toBeLessThan(h.centerToEnd);
  });

  test('every dimension grows with the size', () => {
    for (let i = 1; i < SCREWED_HEAVY.length; i++) {
      const p = SCREWED_HEAVY[i - 1]!;
      const q = SCREWED_HEAVY[i]!;
      expect(q.centerToEnd).toBeGreaterThan(p.centerToEnd);
      expect(q.centerToEnd45).toBeGreaterThan(p.centerToEnd45);
      expect(q.bandCastIron).toBeGreaterThan(p.bandCastIron);
    }
  });

  test('the class picks which table answers', () => {
    expect(screwedCenterToEnd(2, 90, 'standard')).toBe(2.25);
    expect(screwedCenterToEnd(2, 90, 'heavy')).toBe(2.5);
    expect(screwedCenterToEnd(2, 45, 'heavy')).toBe(2);
    expect(screwedSizes('heavy').length).toBe(17);
  });

  test('the default class is the standard one', () => {
    expect(SCREWED_FITTINGS).toBe(SCREWED_STANDARD);
    expect(screwedCenterToEnd(2, 90)).toBe(screwedCenterToEnd(2, 90, 'standard'));
  });
});
