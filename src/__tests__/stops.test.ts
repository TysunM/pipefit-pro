import { nearestStop } from '../calc/stops';

describe('nearestStop', () => {
  it('lands on the nearest of n evenly spaced stops', () => {
    expect(nearestStop(5, 0)).toBe(0);
    expect(nearestStop(5, 0.24)).toBe(1);
    expect(nearestStop(5, 0.26)).toBe(1);
    expect(nearestStop(5, 0.5)).toBe(2);
    expect(nearestStop(5, 1)).toBe(4);
  });

  it('clamps a tap past either end to that end', () => {
    expect(nearestStop(15, -0.4)).toBe(0);
    expect(nearestStop(15, 1.7)).toBe(14);
  });

  it('never leaves a bad fraction or a single stop off the scale', () => {
    expect(nearestStop(15, NaN)).toBe(0);
    expect(nearestStop(1, 0.9)).toBe(0);
    expect(nearestStop(0, 0.9)).toBe(0);
  });
});
