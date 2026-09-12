import {
  PIPE_TABLE, WATER_LB_PER_CUBIC_FOOT, findRow, pipeDims, schedulesFor, wallFor,
} from '../calc/pipeData';
import { FULL_PITCH_RISE, PITCH_MARKS, SQUARE_RUN, fromAngle, fromPitch, fromRise } from '../calc/square';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);
const within = (a: number, b: number, pct: number) => expect(Math.abs(a - b) / b).toBeLessThan(pct / 100);

// Inside diameter and weight per foot as they appear in the printed tables.
const PRINTED_40: [number, number, number][] = [
  [0.125, 0.269, 0.25], [0.25, 0.364, 0.43], [0.5, 0.622, 0.86], [0.75, 0.824, 1.14],
  [1, 1.049, 1.68], [1.5, 1.610, 2.72], [2, 2.067, 3.66], [2.5, 2.469, 5.8], [3, 3.068, 7.58],
  [4, 4.026, 10.8], [6, 6.065, 19.0], [8, 7.981, 28.6], [10, 10.020, 40.5], [12, 11.938, 53.6],
  [14, 13.126, 63.3], [16, 15.000, 82.8], [18, 16.876, 105], [20, 18.814, 123], [24, 22.626, 171],
];

const PRINTED_80: [number, number, number][] = [
  [0.125, 0.215, 0.314], [0.5, 0.546, 1.087], [1, 0.957, 2.171], [2, 1.939, 5.022],
  [3, 2.900, 10.252], [4, 3.826, 14.983], [6, 5.761, 28.573], [8, 7.625, 43.388],
  [10, 9.564, 64.4], [12, 11.376, 88.6], [14, 12.500, 107], [16, 14.314, 137],
  [18, 16.126, 171], [20, 17.938, 209],
];

// Schedule 120 also prints its internal area.
const PRINTED_120: [number, number, number, number][] = [
  [4, 3.626, 10.33, 19.0], [6, 5.501, 23.77, 36.4], [8, 7.189, 40.59, 60.7],
  [10, 9.064, 64.53, 89.2], [12, 10.750, 90.76, 126], [14, 11.876, 110.77, 147],
  [16, 13.564, 144.50, 193], [18, 15.314, 184.19, 239], [20, 17.000, 226.98, 297],
  [24, 20.500, 330.06, 416],
];

const PRINTED_STAINLESS: [number, number, number, number][] = [
  [0.125, 0.405, 0.068, 0.095], [0.5, 0.840, 0.109, 0.147], [1, 1.315, 0.133, 0.179],
  [2, 2.375, 0.154, 0.218], [3, 3.500, 0.216, 0.300], [4, 4.500, 0.237, 0.337],
  [6, 6.625, 0.280, 0.432], [8, 8.625, 0.322, 0.500], [10, 10.750, 0.365, 0.500],
  [12, 12.750, 0.375, 0.500],
];

describe('schedule 40 against the printed table', () => {
  test.each(PRINTED_40)('%s inch', (nps, id, weight) => {
    const d = pipeDims(nps, '40')!;
    expect(d).toBeDefined();
    near(d.id, id, 0.0011);
    // The printed weights are rounded; the eighth inch row prints 0.245 as 0.25.
    // Printed weights are rounded to two places, so the smallest sizes carry
    // the largest relative rounding: 0.245 prints as 0.25, 0.425 as 0.43.
    within(d.weightPerFoot, weight, nps <= 0.25 ? 2.5 : 1.2);
  });
});

describe('schedule 80 against the printed table', () => {
  test.each(PRINTED_80)('%s inch', (nps, id, weight) => {
    const d = pipeDims(nps, '80')!;
    near(d.id, id, 0.0011);
    within(d.weightPerFoot, weight, 1);
  });
});

describe('schedule 120 against the printed table, area included', () => {
  test.each(PRINTED_120)('%s inch', (nps, id, area, weight) => {
    const d = pipeDims(nps, '120')!;
    near(d.id, id, 0.0011);
    within(d.boreArea, area, 0.1);
    within(d.weightPerFoot, weight, 0.5);
  });
});

describe('stainless walls against the printed table', () => {
  test.each(PRINTED_STAINLESS)('%s inch', (nps, od, w40s, w80s) => {
    expect(findRow(nps)!.od).toBeCloseTo(od, 10);
    expect(wallFor(nps, '40S')).toBeCloseTo(w40s, 10);
    expect(wallFor(nps, '80S')).toBeCloseTo(w80s, 10);
  });
});

describe('the notes printed with the tables', () => {
  test('Standard Weight follows schedule 40 up to ten inch', () => {
    for (const nps of [0.5, 2, 6, 10]) expect(wallFor(nps, 'Std')).toBe(wallFor(nps, '40'));
  });

  test('Standard Weight holds a constant 0.375 wall from twelve inch up', () => {
    for (const nps of [12, 14, 16, 18, 20, 24]) expect(wallFor(nps, 'Std')).toBe(0.375);
  });

  test('Extra Strong follows schedule 80 up to eight inch', () => {
    for (const nps of [0.5, 2, 6, 8]) expect(wallFor(nps, 'XS')).toBe(wallFor(nps, '80'));
  });

  test('Extra Strong holds a constant 0.500 wall from ten inch up', () => {
    for (const nps of [10, 12, 14, 16, 18, 20]) expect(wallFor(nps, 'XS')).toBe(0.5);
  });

  test('Standard and schedule 40 part company only at twelve inch and above', () => {
    expect(wallFor(12, 'Std')).not.toBe(wallFor(12, '40'));
    expect(wallFor(10, 'Std')).toBe(wallFor(10, '40'));
  });
});

describe('derived values', () => {
  test('inside diameter is always the outside less two walls', () => {
    for (const row of PIPE_TABLE)
      for (const s of schedulesFor(row.nps)) {
        const d = pipeDims(row.nps, s);
        if (!d) continue;
        near(d.id, d.od - 2 * d.wall, 1e-12);
        expect(d.id).toBeGreaterThan(0);
      }
  });

  test('circumference is pi times the outside diameter', () => {
    for (const row of PIPE_TABLE) {
      const d = pipeDims(row.nps, schedulesFor(row.nps)[0]!)!;
      near(d.circumference, Math.PI * row.od, 1e-12);
    }
  });

  test('a heavier schedule always weighs more and holds less', () => {
    for (const row of PIPE_TABLE) {
      const light = pipeDims(row.nps, '40');
      const heavy = pipeDims(row.nps, '80');
      if (!light || !heavy) continue;
      expect(heavy.weightPerFoot).toBeGreaterThan(light.weightPerFoot);
      expect(heavy.boreArea).toBeLessThan(light.boreArea);
    }
  });

  test('filled weight is the pipe plus the water it holds', () => {
    const d = pipeDims(6, '40')!;
    const water = (d.boreArea / 144) * WATER_LB_PER_CUBIC_FOOT;
    near(d.filledWeightPerFoot, d.weightPerFoot + water, 1e-9);
    expect(d.filledWeightPerFoot).toBeGreaterThan(d.weightPerFoot);
  });

  test('a six inch schedule 40 line holds about 1.5 gallons a foot', () => {
    within(pipeDims(6, '40')!.capacityGallonsPerFoot, 1.5, 3);
  });

  test('water in a foot of two inch schedule 40 is about 1.45 pounds', () => {
    const d = pipeDims(2, '40')!;
    within(d.filledWeightPerFoot - d.weightPerFoot, 1.45, 3);
  });

  test('an unknown size or schedule gives nothing rather than a wrong answer', () => {
    expect(pipeDims(7, '40')).toBeUndefined();
    expect(pipeDims(24, '80')).toBeUndefined();
    expect(pipeDims(0.5, '120')).toBeUndefined();
    expect(Number.isFinite(wallFor(99, '40'))).toBe(false);
  });

  test('every listed size carries at least one schedule', () => {
    for (const row of PIPE_TABLE) expect(schedulesFor(row.nps).length).toBeGreaterThan(0);
  });
});

describe('framing square', () => {
  // Angles and hypotenuse multipliers as printed for a twelve inch run.
  const PRINTED: [number, number][] = [
    [5, 1.0038], [7.5, 1.0086], [10, 1.0154], [12.5, 1.0243], [15, 1.0353],
    [20, 1.0642], [22.5, 1.0824], [25, 1.1034], [27.5, 1.1274], [30, 1.1547], [32.5, 1.1857],
    [35, 1.2208], [40, 1.3054], [42.5, 1.3563], [45, 1.4142], [47.5, 1.4802],
    [50, 1.5557], [52.5, 1.6427], [55, 1.7434], [57.5, 1.8611], [60, 2.0], [62.5, 2.1657],
  ];

  test.each(PRINTED)('%s degrees gives the printed hypotenuse multiplier', (angle, mult) => {
    near(fromAngle(angle)!.hypotenuseMultiplier, mult, 0.0001);
  });

  // Two rows of the printed table are mislabelled. The rows headed 17-1/2 and
  // 37-1/2 degrees carry the multiplier AND the rise of 17 and 37 degrees, in
  // both columns, while all twenty-two other rows agree with their own angle
  // to four decimals. These tests hold the correct values, not the printed
  // ones, and pin the discrepancy so it is not silently "fixed" later.
  test('the row printed as 17-1/2 degrees is really 17 degrees', () => {
    near(fromAngle(17)!.hypotenuseMultiplier, 1.0457, 0.0001);
    near(fromAngle(17)!.rise, 3.6875, 0.02);
    expect(Math.abs(fromAngle(17.5)!.hypotenuseMultiplier - 1.0457)).toBeGreaterThan(0.0028);
  });

  test('the row printed as 37-1/2 degrees is really 37 degrees', () => {
    near(fromAngle(37)!.hypotenuseMultiplier, 1.2521, 0.0001);
    near(fromAngle(37)!.rise, 9.0625, 0.02);
    expect(Math.abs(fromAngle(37.5)!.hypotenuseMultiplier - 1.2521)).toBeGreaterThan(0.008);
  });

  test('the multiplier is the secant of the angle, at every half degree', () => {
    for (let a = 0.5; a < 90; a += 0.5) {
      near(fromAngle(a)!.hypotenuseMultiplier, 1 / Math.cos((a * Math.PI) / 180), 1e-12);
    }
  });

  test('the rise for each printed angle lands on the printed mark', () => {
    near(fromAngle(45)!.rise, 12, 1e-9);
    near(fromAngle(60)!.rise, 20.7846, 0.0001);
    near(fromAngle(30)!.rise, 6.9282, 0.0001);
  });

  test('a full pitch is twenty four on twelve', () => {
    const s = fromPitch(1)!;
    near(s.rise, FULL_PITCH_RISE, 1e-12);
    near(s.angle, 63.4349488, 1e-6);
  });

  test('a half pitch is twelve on twelve, which is forty five degrees', () => {
    const s = fromPitch(0.5)!;
    near(s.rise, 12, 1e-12);
    near(s.angle, 45, 1e-12);
  });

  test('every printed pitch mark round-trips through its angle', () => {
    for (const p of PITCH_MARKS) {
      const s = fromPitch(p)!;
      near(fromAngle(s.angle)!.pitch, p, 1e-9);
      near(fromRise(s.rise)!.angle, s.angle, 1e-9);
    }
  });

  test('the hypotenuse is the travel of an offset at that angle', () => {
    const s = fromAngle(45)!;
    near(s.hypotenuse, Math.hypot(12, 12), 1e-12);
    near(s.hypotenuseMultiplier, 1 / Math.cos(Math.PI / 4), 1e-12);
  });

  test('a run other than twelve still works', () => {
    const s = fromAngle(45, 10)!;
    near(s.rise, 10, 1e-9);
    near(s.hypotenuse, Math.hypot(10, 10), 1e-9);
  });

  test('the run is twelve inches unless told otherwise', () => expect(SQUARE_RUN).toBe(12));

  test('what cannot be laid out returns nothing', () => {
    expect(fromAngle(90)).toBeUndefined();
    expect(fromAngle(-5)).toBeUndefined();
    expect(fromRise(5, 0)).toBeUndefined();
    expect(fromRise(NaN)).toBeUndefined();
    expect(fromPitch(-1)).toBeUndefined();
  });
});
