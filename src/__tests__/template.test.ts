import { branchTemplate, holeTemplate, miterTemplate, segmentLength } from '../calc/template';
import { pipeDims } from '../calc/pipeData';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('dividing the circumference', () => {
  test('the length of a segment is the circumference over the count', () => {
    // The handbook works from actual outside diameter, not nominal.
    const od = 8.625;
    near(segmentLength(od, 4), (Math.PI * od) / 4, 1e-12);
    near(segmentLength(od, 4), 6.7741, 1e-4);
    near(segmentLength(od, 8), 3.387, 1e-3);
    near(segmentLength(od, 16), 1.6935, 1e-4);
  });

  test('a ten inch line, whose printed circumference is 33.77', () => {
    const od = pipeDims(10, '40')!.od;
    near(Math.PI * od, 33.7721, 1e-4);
    near(segmentLength(od, 12), 33.7721 / 12, 1e-4);
  });

  test('segments always add back to the circumference', () => {
    for (const n of [4, 6, 8, 12, 16, 24, 32]) near(segmentLength(6.625, n) * n, Math.PI * 6.625, 1e-9);
  });

  test('nonsense gives nothing', () => {
    for (const bad of [0, -2, NaN]) expect(Number.isFinite(segmentLength(bad, 8))).toBe(false);
    expect(Number.isFinite(segmentLength(6.625, 0))).toBe(false);
    expect(Number.isFinite(segmentLength(6.625, 8.5))).toBe(false);
  });
});

describe('miter template', () => {
  const t = miterTemplate(8.625, 22.5, 16);

  test('it solves', () => expect(t.valid).toBe(true));

  test('the band is the pipe circumference long', () => near(t.circumference, Math.PI * 8.625, 1e-9));

  test('one ordinate per division, plus the closing one', () => expect(t.ordinates.length).toBe(17));

  test('the total rise is the diameter times the tangent of the cut', () => {
    near(t.totalRise, 8.625 * Math.tan(Math.PI / 8), 1e-9);
    near(t.totalRise, 3.57259, 1e-4);
  });

  test('it starts at nothing and peaks at the far side', () => {
    near(t.ordinates[0]!.rise, 0, 1e-12);
    near(t.ordinates[8]!.rise, t.totalRise, 1e-9);
    near(t.ordinates[16]!.rise, 0, 1e-12);
  });

  test('it is symmetric about the halfway point', () => {
    for (let i = 1; i < 8; i++) near(t.ordinates[i]!.rise, t.ordinates[16 - i]!.rise, 1e-12);
  });

  test('the quarter points sit at half the rise', () => {
    near(t.ordinates[4]!.rise, t.totalRise / 2, 1e-12);
    near(t.ordinates[12]!.rise, t.totalRise / 2, 1e-12);
  });

  test('a 45 degree cut rises by a whole diameter', () => {
    near(miterTemplate(6.625, 45, 16).totalRise, 6.625, 1e-9);
  });

  test('two cuts of half the turn make the turn', () => {
    // A 90 degree turn is two 45 degree cuts; a 45 is two 22.5s.
    for (const turn of [30, 45, 60, 90]) {
      const cut = miterTemplate(4.5, turn / 2, 16);
      near(cut.totalRise, 4.5 * Math.tan(Math.PI * (turn / 2) / 180), 1e-9);
    }
  });

  test('more segments sample the same curve, they do not move it', () => {
    const coarse = miterTemplate(8.625, 22.5, 8);
    const fine = miterTemplate(8.625, 22.5, 32);
    near(coarse.totalRise, fine.totalRise, 1e-12);
    // Every coarse point coincides with a fine one.
    for (let i = 0; i <= 8; i++) near(coarse.ordinates[i]!.rise, fine.ordinates[i * 4]!.rise, 1e-12);
  });

  test('what cannot be cut is refused', () => {
    expect(miterTemplate(0, 22.5).error).toMatch(/outside diameter/i);
    expect(miterTemplate(6.625, 0).error).toMatch(/cut angle/i);
    expect(miterTemplate(6.625, 90).error).toMatch(/cut angle/i);
    expect(miterTemplate(6.625, 22.5, 3).error).toMatch(/four segments/i);
    expect(miterTemplate(6.625, 22.5, 128).error).toMatch(/sixty-four/i);
  });
});

describe('branch template', () => {
  test('a tee of equal pipes reaches the header axis on the centreline', () => {
    const t = branchTemplate(6.625, 6.625, 90, 16);
    expect(t.valid).toBe(true);
    // At the sides of the branch the cut runs right down to the header axis.
    near(t.ordinates[4]!.rise, 0, 1e-9);
    near(t.ordinates[12]!.rise, 0, 1e-9);
    // At the crown it stops a radius short, so the fish mouth is one radius deep.
    near(t.totalRise, 6.625 / 2, 1e-9);
  });

  test('a small branch on a big header is nearly a square cut', () => {
    const t = branchTemplate(24, 1, 90, 16);
    expect(t.totalRise).toBeLessThan(0.03);
  });

  test('the fish mouth deepens as the branch approaches the header size', () => {
    let last = -1;
    for (const b of [2, 4, 6, 8, 12]) {
      const depth = branchTemplate(12.75, b, 90, 16).totalRise;
      expect(depth).toBeGreaterThan(last);
      last = depth;
    }
  });

  test('both are symmetric across the plane the two axes share', () => {
    // Points either side of that plane mirror each other, at any branch angle.
    for (const a of [90, 60, 45, 30]) {
      const t = branchTemplate(8.625, 4.5, a, 16);
      for (let i = 1; i < 8; i++) near(t.ordinates[i]!.rise, t.ordinates[16 - i]!.rise, 1e-9);
    }
  });

  test('a tee has equal heel and throat; a lateral does not', () => {
    const tee = branchTemplate(8.625, 4.5, 90, 16);
    near(tee.ordinates[0]!.rise, tee.ordinates[8]!.rise, 1e-9);

    const lateral = branchTemplate(8.625, 4.5, 45, 16);
    expect(Math.abs(lateral.ordinates[0]!.rise - lateral.ordinates[8]!.rise)).toBeGreaterThan(1);
  });

  test('a shallower lateral needs a longer cut', () => {
    let last = 0;
    for (const a of [90, 60, 45, 30]) {
      const rise = branchTemplate(8.625, 4.5, a, 16).totalRise;
      expect(rise).toBeGreaterThan(last);
      last = rise;
    }
  });

  test('the band is the branch circumference long', () => {
    near(branchTemplate(8.625, 4.5, 45, 16).circumference, Math.PI * 4.5, 1e-9);
  });

  test('every ordinate is at or above the datum', () => {
    for (const a of [90, 60, 45, 30]) {
      for (const o of branchTemplate(12.75, 6.625, a, 24).ordinates) expect(o.rise).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  test('what cannot be fitted is refused', () => {
    expect(branchTemplate(4, 6, 90).error).toMatch(/larger than the header/i);
    expect(branchTemplate(0, 4, 90).error).toMatch(/header diameter/i);
    expect(branchTemplate(8, 4, 0).error).toMatch(/branch angle/i);
    expect(branchTemplate(8, 4, 120).error).toMatch(/branch angle/i);
  });
});

describe('hole template', () => {
  test('a tee cuts a hole as wide as the branch', () => {
    const h = holeTemplate(12.75, 6.625, 90, 16);
    expect(h.valid).toBe(true);
    // Squared across, the hole is symmetric about the branch centreline.
    near(h.totalRise, 6.625, 1e-9);
  });

  test('a lateral cuts a longer hole than a tee', () => {
    expect(holeTemplate(12.75, 6.625, 45, 16).totalRise).toBeGreaterThan(
      holeTemplate(12.75, 6.625, 90, 16).totalRise
    );
  });

  test('the band is the header circumference long', () => {
    near(holeTemplate(12.75, 6.625, 90, 16).circumference, Math.PI * 12.75, 1e-9);
  });

  test('what cannot be cut is refused', () => {
    expect(holeTemplate(4, 6, 90).error).toMatch(/larger than the header/i);
    expect(holeTemplate(8, 0, 90).error).toMatch(/branch diameter/i);
  });
});
