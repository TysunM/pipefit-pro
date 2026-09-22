import { angleFromSlopes, nearestFitting } from '../calc/sight';
import { FITTING_ANGLES } from '../calc/pipe';

describe('the angle a fitting turns through', () => {
  it('is the travel slope when the run is level, which is the common case', () => {
    expect(angleFromSlopes(0, 45)).toBeCloseTo(45, 9);
    expect(angleFromSlopes(0, 22.5)).toBeCloseTo(22.5, 9);
    expect(angleFromSlopes(0, 90)).toBeCloseTo(90, 9);
  });

  it('is the size of the turn, not its direction: up 45 and down 45 are both 45', () => {
    expect(angleFromSlopes(0, 45)).toBeCloseTo(angleFromSlopes(0, -45), 9);
  });

  it('takes the difference when the run is sloped, not the travel slope alone', () => {
    // A line already falling 10, with a piece leaving it at 35 — the fitting
    // turns 25, not 35. Reading only the travel piece would buy the wrong elbow.
    expect(angleFromSlopes(-10, 35)).toBeCloseTo(45, 9);
    expect(angleFromSlopes(10, 55)).toBeCloseTo(45, 9);
  });

  it('is nothing when the two run the same way, because no fitting is needed', () => {
    expect(angleFromSlopes(17, 17)).toBeCloseTo(0, 9);
    expect(angleFromSlopes(-30, -30)).toBeCloseTo(0, 9);
  });

  it('is symmetric in its two readings, so the order you take them in cannot matter', () => {
    for (const [a, b] of [
      [0, 45],
      [-12, 30],
      [80, -80],
      [5.5, 5.5],
    ]) {
      expect(angleFromSlopes(a!, b!)).toBeCloseTo(angleFromSlopes(b!, a!), 9);
    }
  });

  it('never exceeds half a turn, which is the most any fitting turns', () => {
    expect(angleFromSlopes(90, -90)).toBeCloseTo(180, 9);
    expect(angleFromSlopes(-90, 90)).toBeCloseTo(180, 9);
  });

  it('handles the full range a slope can be read at without going out of bounds', () => {
    for (let a = -90; a <= 90; a += 7.5) {
      for (let b = -90; b <= 90; b += 7.5) {
        const x = angleFromSlopes(a, b);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('which fitting a measured angle is nearest', () => {
  it('lands exactly on a stock angle when the reading is one', () => {
    const { at, offBy } = nearestFitting(45, FITTING_ANGLES);
    expect(at).toBe(45);
    expect(offBy).toBeCloseTo(0, 9);
  });

  it('says how far off the nearest it is, signed, because that is what gets cut', () => {
    const over = nearestFitting(47.5, FITTING_ANGLES);
    expect(over.at).toBe(45);
    expect(over.offBy).toBeCloseTo(2.5, 9);
    const under = nearestFitting(42, FITTING_ANGLES);
    expect(under.at).toBe(45);
    expect(under.offBy).toBeCloseTo(-3, 9);
  });

  it('picks the nearer of two neighbours rather than the first it meets', () => {
    // 34 is nearer 30 than 45, whichever order the list is in.
    expect(nearestFitting(34, FITTING_ANGLES).at).toBe(30);
    expect(nearestFitting(40, FITTING_ANGLES).at).toBe(45);
  });

  it('survives an empty shelf without inventing a fitting', () => {
    expect(nearestFitting(45, []).at).toBe(0);
  });

  it('never reports an off-by bigger than the gap to the next fitting', () => {
    const sorted = [...FITTING_ANGLES].sort((a, b) => a - b);
    const widest = Math.max(...sorted.slice(1).map((v, i) => v - sorted[i]!));
    for (let a = sorted[0]!; a <= sorted[sorted.length - 1]!; a += 0.5) {
      expect(Math.abs(nearestFitting(a, FITTING_ANGLES).offBy)).toBeLessThanOrEqual(widest / 2 + 1e-9);
    }
  });
});
