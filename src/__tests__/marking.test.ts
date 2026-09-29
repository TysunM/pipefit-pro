import { WALLS, readDimensions, readMill, schedulesFor } from '../calc/marking';
import { PIPE_SIZES } from '../calc/pipe';

// Reading the numbers and the mill off a marking
// ----------------------------------------------

describe('the wall table', () => {
  test('agrees with the app’s own SCH 10, 40 and 80 walls on every size', () => {
    for (const s of PIPE_SIZES)
      for (const [sch, w] of Object.entries(s.wall)) expect(Math.abs(WALLS[s.nps]![sch]! - w)).toBeLessThanOrEqual(0.0015);
  });

  test('a wall names every schedule it is, and nothing else', () => {
    expect(schedulesFor(6, 0.28).sort()).toEqual(['40', '40S', 'STD']);
    expect(schedulesFor(12, 0.375).sort()).toEqual(['40S', 'STD']);
    expect(schedulesFor(12, 0.406)).toEqual(['40']);
    expect(schedulesFor(6, 0.3)).toEqual([]);
  });
});

describe('size and schedule from OD and wall', () => {
  test('the way mills print it', () => {
    expect(readDimensions('A106 GR B 6.625" X .280" SMLS')).toEqual({ nps: 6, schedules: ['40', 'STD', '40S'] });
    expect(readDimensions('ASTM A53 B ERW 2.375 X 0.218 XS')).toEqual({ nps: 2, schedules: ['80', 'XS', '80S'] });
    expect(readDimensions('8.625 OD X .500 WT')).toEqual({ nps: 8, schedules: ['80', 'XS', '80S'] });
    expect(readDimensions('10.750x.365')).toEqual({ nps: 10, schedules: ['40', 'STD', '40S'] });
  });

  test('fitters’ shorthand, fractions and millimetres', () => {
    expect(readDimensions('6" X .432"')?.nps).toBe(6);
    expect(readDimensions('6-5/8 X .280')?.nps).toBe(6);
    expect(readDimensions('168.3 X 7.11 MM')).toEqual({ nps: 6, schedules: ['40', 'STD', '40S'] });
    expect(readDimensions('12,750 X ,375')).toBeNull(); // a comma before a bare wall is not a decimal point we can trust
  });

  test('the wall decides between two sizes a first number could be', () => {
    // 4.000 is the OD of 3-1/2", but .237 is a 4" wall and no 3-1/2" one.
    expect(readDimensions('4 X .237')?.nps).toBe(4);
    expect(readDimensions('4.000 X .226')?.nps).toBe(3.5);
  });

  test('a wall no table has, two sizes on one read, or no pair at all: nothing', () => {
    expect(readDimensions('6.625 X .300')).toBeNull();
    expect(readDimensions('6.625 X .280 AND 4.500 X .237')).toBeNull();
    expect(readDimensions('HEAT E7Z419 A106 GR B 6" SCH 40')).toBeNull();
    expect(readDimensions('2 X 4 STUD')).toBeNull();
  });
});

describe('the mill', () => {
  test('named on the stencil, however it is spaced or cased', () => {
    expect(readMill('WHEATLAND TUBE A53 B ERW')).toBe('Wheatland Tube');
    expect(readMill('tenaris siderca smls a106b')).toBe('Tenaris');
    expect(readMill('V & M STAR  API 5L')).toBe('Vallourec');
    expect(readMill('U.S. STEEL A106')).toBe('U.S. Steel');
  });

  test('only a whole mark counts, and two mills on one read is none', () => {
    expect(readMill('SANDVIKEN')).toBeNull();
    expect(readMill('NUCOR / WHEATLAND')).toBeNull();
    expect(readMill('HEAT E7Z419 A106 GR B')).toBeNull();
  });
});
