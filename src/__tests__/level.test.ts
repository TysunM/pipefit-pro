import { inchesPerFoot, levelWord } from '../calc/sight';

describe('what a slope is called', () => {
  it('calls dead flat level, and says so exactly', () => {
    expect(levelWord(0)).toEqual({ word: 'Level', exact: true });
    expect(levelWord(0.3).exact).toBe(true);
    expect(levelWord(-0.3).exact).toBe(true);
  });

  it('stops calling it level once it is off by more than half a degree', () => {
    expect(levelWord(0.8).exact).toBe(false);
    expect(levelWord(-0.8).exact).toBe(false);
  });

  it('calls a riser plumb either way up', () => {
    expect(levelWord(90)).toEqual({ word: 'Plumb', exact: true });
    expect(levelWord(-90)).toEqual({ word: 'Plumb', exact: true });
    expect(levelWord(89.7).exact).toBe(true);
  });

  it('separates rising from falling, and says when it is barely either', () => {
    expect(levelWord(2).word).toBe('Rising, barely');
    expect(levelWord(-2).word).toBe('Falling, barely');
    expect(levelWord(30).word).toBe('Rising');
    expect(levelWord(-30).word).toBe('Falling');
  });

  it('never calls a real fall exact, which is what would let a wrong one through', () => {
    for (const s of [1, 5, 22.5, 45, 60, 80, -1, -45, -80]) expect(levelWord(s).exact).toBe(false);
  });
});

describe('fall said the way a spec sheet says it', () => {
  it('gives the plumbing rule back: a quarter inch to the foot', () => {
    // A quarter in twelve is atan(0.25/12) = 1.1936°.
    expect(inchesPerFoot(1.1936)).toBeCloseTo(0.25, 3);
  });

  it('gives an eighth to the foot for half that angle, near enough', () => {
    expect(inchesPerFoot(0.5968)).toBeCloseTo(0.125, 3);
  });

  it('is nothing at level and signed the way the slope is', () => {
    expect(inchesPerFoot(0)).toBeCloseTo(0, 12);
    expect(inchesPerFoot(-1.1936)).toBeCloseTo(-0.25, 3);
  });

  it('rises the way a tangent does, not the way a straight line would', () => {
    // Twice the angle is more than twice the fall, which is the whole reason
    // it is worth computing rather than scaling.
    expect(inchesPerFoot(60)).toBeGreaterThan(2 * inchesPerFoot(30));
  });

  it('matches a 45 exactly: twelve inches in twelve', () => {
    expect(inchesPerFoot(45)).toBeCloseTo(12, 9);
  });
});
