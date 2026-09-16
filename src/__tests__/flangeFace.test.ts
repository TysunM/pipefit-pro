import { MARKER_MAX, MARKER_MIN, MIN_PITCH, boltCentre, flangeFace } from '../components/flange/face';
import { BOLT_UP_125, BOLT_UP_250, boltHoleAngles } from '../calc/boltUp';

const FLANGES = [...BOLT_UP_125, ...BOLT_UP_250];
/** The widths a phone, a small tablet and a wide one actually give us. */
const WIDTHS = [300, 320, 360, 420, 600];

describe('no two bolt targets ever overlap', () => {
  it('holds for every flange in both classes, on every width', () => {
    for (const f of FLANGES) {
      for (const w of WIDTHS) {
        const L = flangeFace(f.bolts, w, f.boltCircle / f.flangeOd);
        // A target is the marker plus its touch slop, on both sides of the gap.
        const reach = L.marker + 2 * L.slop;
        expect(reach).toBeLessThanOrEqual(L.pitch + 1e-9);
      }
    }
  });

  it('is measured on the drawn positions, not only on the pitch', () => {
    for (const f of FLANGES) {
      const L = flangeFace(f.bolts, 360, f.boltCircle / f.flangeOd);
      const pts = boltHoleAngles(f.bolts).map((deg) => boltCentre(L, deg));
      const reach = L.marker + 2 * L.slop;
      let closest = Infinity;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          closest = Math.min(closest, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y));
        }
      }
      expect(closest).toBeGreaterThanOrEqual(reach - 1e-9);
    }
  });
});

describe('a bolt stays big enough to hit', () => {
  it('never draws a marker under the floor, at any count', () => {
    for (const f of FLANGES) {
      const L = flangeFace(f.bolts, 320, f.boltCircle / f.flangeOd);
      expect(L.marker).toBeGreaterThanOrEqual(MARKER_MIN);
      expect(L.marker).toBeLessThanOrEqual(MARKER_MAX);
      expect(L.pitch).toBeGreaterThanOrEqual(MIN_PITCH - 1e-9);
    }
  });

  it('grows the face instead of shrinking the bolts, and says so', () => {
    const small = flangeFace(8, 360, 0.86);
    expect(small.face).toBe(360);
    expect(small.scrolls).toBe(false);

    const big = flangeFace(68, 360, 0.95);
    expect(big.face).toBeGreaterThan(360);
    expect(big.scrolls).toBe(true);
    expect(big.pitch).toBeGreaterThanOrEqual(MIN_PITCH - 1e-9);
  });

  it('gives a 4 bolt flange the biggest marker there is', () => {
    expect(flangeFace(4, 360, 0.735).marker).toBe(MARKER_MAX);
  });
});

describe('everything stays inside the face', () => {
  it('keeps the whole marker within the square, for every flange', () => {
    for (const f of FLANGES) {
      const L = flangeFace(f.bolts, 360, f.boltCircle / f.flangeOd);
      for (const deg of boltHoleAngles(f.bolts)) {
        const { x, y } = boltCentre(L, deg);
        expect(x - L.marker / 2).toBeGreaterThanOrEqual(-1e-9);
        expect(y - L.marker / 2).toBeGreaterThanOrEqual(-1e-9);
        expect(x + L.marker / 2).toBeLessThanOrEqual(L.face + 1e-9);
        expect(y + L.marker / 2).toBeLessThanOrEqual(L.face + 1e-9);
      }
      expect(L.bcR).toBeLessThan(L.odR);
      expect(L.odR + MARKER_MAX / 2).toBeLessThanOrEqual(L.face / 2 + 1e-9);
    }
  });

  it('keeps the highlight ring off the next bolt', () => {
    for (const f of FLANGES) {
      const L = flangeFace(f.bolts, 320, f.boltCircle / f.flangeOd);
      expect(L.ring).toBeGreaterThanOrEqual(L.marker);
      expect(L.ring).toBeLessThanOrEqual(Math.max(L.pitch, L.marker) + 1e-9);
    }
  });
});

describe('bolt 1 is where the handbook drills it', () => {
  it('sits half a pitch off the centreline, not on it', () => {
    const L = flangeFace(8, 360, 0.86);
    const first = boltCentre(L, boltHoleAngles(8)[0]!);
    // Half a pitch clockwise of top dead centre: right of centre, above it.
    expect(first.x).toBeGreaterThan(L.c);
    expect(first.y).toBeLessThan(L.c);
    expect(Math.hypot(first.x - L.c, first.y - L.c)).toBeCloseTo(L.bcR, 9);
  });

  it('puts the bolts on the bolt circle and nowhere else', () => {
    const L = flangeFace(20, 360, 0.9);
    for (const deg of boltHoleAngles(20)) {
      const { x, y } = boltCentre(L, deg);
      expect(Math.hypot(x - L.c, y - L.c)).toBeCloseTo(L.bcR, 9);
    }
  });

  it('straddles the centreline, so a flange can be turned a quarter turn', () => {
    const L = flangeFace(8, 360, 0.86);
    const xs = boltHoleAngles(8).map((deg) => boltCentre(L, deg).x - L.c);
    expect(xs.some((x) => Math.abs(x) < 1e-9)).toBe(false);
  });
});

describe('nonsense in, nothing drawn', () => {
  it('has no bolts to place', () => {
    for (const bad of [0, -8, 2.5, NaN]) {
      const L = flangeFace(bad, 360, 0.86);
      expect(L.marker).toBe(0);
      expect(L.slop).toBe(0);
      expect(L.scrolls).toBe(false);
    }
  });

  it('falls back to a sensible bolt circle when the ratio is junk', () => {
    for (const bad of [0, -1, 1, 2, NaN]) {
      const L = flangeFace(8, 360, bad);
      expect(L.bcR).toBeCloseTo(L.odR * 0.85, 9);
    }
  });
});
