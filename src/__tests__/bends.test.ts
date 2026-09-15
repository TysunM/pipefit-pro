import { solveBender } from '../calc/bender';
import { crossoverCentreAngle, equalSpreadAdvance, solveDoubleOffset, solveOffsetBend } from '../calc/offsetBend';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);
const bend = (angle: number, radius: number, legLength = NaN, legLengthB = NaN, stockLength = NaN) =>
  solveBender({ angle, radius, springback: 0, legLength, legLengthB, stockLength });

// The handbook prints setback as radius x tan(half the angle) and length of
// bend as radius x the angle in radians, and tabulates both at seven angles.
// These check the code against the printed multipliers, which cover every
// angle from a quarter of a degree to 180.
describe('the printed multipliers', () => {
  const M: [number, number, number][] = [
    [0.25, 0.0023, 0.0044], [1, 0.0087, 0.0175], [5, 0.0436, 0.0873], [10, 0.0875, 0.1745],
    [15, 0.1316, 0.2618], [20, 0.1763, 0.3491], [22.5, 0.199, 0.3927], [30, 0.2679, 0.5236],
    [40, 0.364, 0.6981], [45, 0.4141, 0.7854], [50, 0.4663, 0.8727], [60, 0.5774, 1.0472],
    [65, 0.637, 1.1345], [72, 0.7265, 1.2566], [80, 0.8391, 1.3963], [89, 0.9827, 1.5533],
    [90, 1.0, 1.5708], [100, 1.1918, 1.7453], [110, 1.4281, 1.9198], [112.5, 1.4966, 1.9635],
    [120, 1.7321, 2.0944], [130, 2.1445, 2.2689], [135, 2.4142, 2.3562], [150, 3.732, 2.618],
    [160, 5.6713, 2.7925], [170, 11.43, 2.967], [175, 22.904, 3.0543], [179, 114.59, 3.1241],
  ];

  test.each(M)('%s degrees', (angle, setbackPer, lengthPer) => {
    const r = bend(angle, 1);
    // Four printed decimals, so one unit in the last place is the floor.
    near(r.setback, setbackPer, Math.max(2e-4, Math.abs(setbackPer) * 2e-4));
    near(r.arcLength, lengthPer, 2e-4);
  });

  test('one minute of arc takes the radius times 0.00029', () => {
    near(bend(1 / 60, 1).arcLength, 0.00029, 1e-6);
    near(bend(60 / 60, 1).arcLength, 0.01745, 1e-5);
  });

  test('a 180 degree bend has no setback to speak of and half a circumference of material', () => {
    near(bend(179.999, 1).arcLength, Math.PI, 1e-4);
    expect(bend(180, 1).valid).toBe(false);
  });
});

// Every worked example the handbook prints for a single bend.
describe('the handbook single-bend examples', () => {
  test('45 degrees on a 9 inch radius, point of intersection 12 inches from the end', () => {
    const r = bend(45, 9, 12);
    near(r.setback, 3.7279, 1e-4);
    near(r.arcLength, 7.0686, 1e-4);
    near(r.markFromEnd, 8.2721, 1e-4);
    // The book totals 23-9/16 from values it has already rounded to sixteenths.
    near(r.pieceLength, 23.6127, 1e-4);
  });

  test('60 degrees on an 8 inch radius with legs of 12 and 8', () => {
    const r = bend(60, 8, 12, 8);
    near(r.setback, 4.6188, 1e-4);
    near(r.arcLength, 8.3776, 1e-4);
    near(r.markFromEnd, 7.3812, 1e-4);
    near(r.markFromEndB, 3.3812, 1e-4);
    near(r.pieceLength, 19.14, 1e-2);
  });

  test('72 degrees on a 10 inch radius out of 24 inches of stock, equal legs', () => {
    const r = bend(72, 10, NaN, NaN, 24);
    near(r.setback, 7.2654, 1e-4);
    near(r.arcLength, 12.5664, 1e-4);
    near(r.legFromStock, 5.7168, 1e-4);
  });

  test('90 degrees on an 8 inch radius, flange face 12 inches from the far centreline', () => {
    // The book works back from a 4 inch straight leg: S = 12 - 4 = 8, which
    // for a 90 degree bend is the radius.
    const r = bend(90, 8, 12, 12);
    near(r.setback, 8, 1e-12);
    near(r.arcLength, 12.5664, 1e-4);
    near(r.markFromEnd, 4, 1e-12);
    near(r.pieceLength, 20.5664, 1e-4);
  });

  test('112.5 degrees on an 8 inch radius, point of intersection 16 inches out', () => {
    const r = bend(112.5, 8, 16, 16);
    near(r.setback, 11.9728, 1e-4);
    near(r.arcLength, 15.708, 1e-4);
    near(r.markFromEnd, 4.0272, 1e-4);
    near(r.markEndOfBend, 19.7352, 1e-4);
    near(r.pieceLength, 23.76227, 1e-4);
  });

  test('120 degrees on an 11 inch radius, point of intersection 27 inches out', () => {
    const r = bend(120, 11, 27, 27);
    near(r.setback, 19.0526, 1e-4);
    near(r.arcLength, 23.0383, 1e-4);
    near(r.markFromEnd, 7.9474, 1e-4);
    near(r.pieceLength, 38.93323, 1e-4);
  });

  test('135 degrees on a 17 inch radius, point of intersection 52 inches out', () => {
    const r = bend(135, 17, 52, 52);
    near(r.setback, 41.0416, 1e-4);
    near(r.arcLength, 40.0553, 1e-4);
    near(r.markFromEnd, 10.9584, 1e-4);
    near(r.pieceLength, 61.9721, 1e-4);
  });

  test('a second leg left blank is taken to match the first', () => {
    near(bend(90, 8, 12).pieceLength, bend(90, 8, 12, 12).pieceLength, 1e-12);
  });

  test('stock no longer than the bend itself is refused', () => {
    const r = bend(90, 8, NaN, NaN, 10);
    expect(r.stockError).toMatch(/longer than/i);
    expect(Number.isFinite(r.legFromStock)).toBe(false);
  });
});

describe('offset bends', () => {
  // The handbook's 45 degree offset: 30 inch radius, 36 inch offset, with the
  // points of intersection 49 and 30 inches from the two ends.
  const r = solveOffsetBend({ offset: 36, angle: 45, radius: 30, legA: 49, legB: 30 });

  test('it solves', () => expect(r.valid).toBe(true));
  test('setback', () => near(r.setback, 12.4264, 1e-4));
  test('length of each bend', () => near(r.arcLength, 23.5619, 1e-4));
  test('travel is the offset over the sine', () => near(r.travel, 50.9117, 1e-4));
  test('run equals the offset at 45 degrees', () => near(r.run, 36, 1e-9));
  test('the straight between the bends is the travel less two setbacks', () => near(r.straightBetween, 26.0589, 1e-4));
  test('the straight at each end', () => {
    near(r.straightA, 36.5736, 1e-4);
    near(r.straightB, 17.5736, 1e-4);
  });
  test('total length of the piece', () => near(r.totalLength, 127.33, 1e-2));

  test('the marks run in order from one end', () => {
    expect(r.marks.map((m) => m.label)).toEqual([
      'First bend starts', 'First bend ends', 'Second bend starts', 'Second bend ends', 'Cut end',
    ]);
    for (let i = 1; i < r.marks.length; i++) {
      expect(r.marks[i]!.position).toBeGreaterThan(r.marks[i - 1]!.position);
    }
    near(r.marks[4]!.position, r.totalLength, 1e-12);
  });

  test('the marks add back up to the total', () => {
    near(r.straightA + r.arcLength + r.straightBetween + r.arcLength + r.straightB, r.totalLength, 1e-9);
  });

  test('the printed offset multipliers fall out of it', () => {
    for (const [angle, runPer, travelPer] of [[15, 3.732, 3.8637], [22.5, 2.4142, 2.6131], [30, 1.7321, 2.0]] as const) {
      const s = solveOffsetBend({ offset: 1, angle, radius: 1, legA: 10, legB: 10 });
      near(s.run, runPer, 1e-4);
      near(s.travel, travelPer, 1e-4);
    }
  });

  test('an offset too tight for the radius is refused rather than returning a negative straight', () => {
    const s = solveOffsetBend({ offset: 1, angle: 45, radius: 30, legA: 49, legB: 30 });
    expect(s.valid).toBe(false);
    expect(s.error).toMatch(/bends overlap/i);
  });

  test('a leg shorter than the setback is refused', () => {
    const s = solveOffsetBend({ offset: 36, angle: 45, radius: 30, legA: 5, legB: 30 });
    expect(s.error).toMatch(/shorter than/i);
  });

  test('bad inputs are refused', () => {
    expect(solveOffsetBend({ offset: 36, angle: 0, radius: 30, legA: 49, legB: 30 }).error).toMatch(/greater than zero/i);
    expect(solveOffsetBend({ offset: 36, angle: 91, radius: 30, legA: 49, legB: 30 }).error).toMatch(/back on itself/i);
    expect(solveOffsetBend({ offset: 36, angle: 45, radius: 0, legA: 49, legB: 30 }).error).toMatch(/radius/i);
    expect(solveOffsetBend({ offset: 0, angle: 45, radius: 30, legA: 49, legB: 30 }).error).toMatch(/offset/i);
    expect(solveOffsetBend({ offset: 36, angle: 45, radius: 30, legA: NaN, legB: 30 }).error).toMatch(/both legs/i);
  });

  // Two square bends and a piece between them. The pipe goes straight across
  // and advances nothing, so travel is the offset itself and the run is zero.
  test('a square offset is worked, not refused', () => {
    const s = solveOffsetBend({ offset: 36, angle: 90, radius: 6, legA: 20, legB: 20 });
    expect(s.valid).toBe(true);
    near(s.run, 0, 1e-9);
    near(s.travel, 36, 1e-9);
    near(s.setback, 6, 1e-9);
    near(s.straightBetween, 36 - 12, 1e-9);
  });

  // Nothing special happens at 90: it is the limit of the same formula.
  test('the run closes on zero as the angle approaches square', () => {
    const runs = [80, 85, 89, 89.9, 90].map(
      (a) => solveOffsetBend({ offset: 36, angle: a, radius: 6, legA: 20, legB: 20 }).run
    );
    for (let i = 1; i < runs.length; i += 1) expect(runs[i]!).toBeLessThan(runs[i - 1]!);
    near(runs[runs.length - 1]!, 0, 1e-12);
  });
});

describe('two or more pipes at an equal spread', () => {
  test('the printed C factors', () => {
    // Printed to three decimals for 15 degrees, four for the rest.
    near(equalSpreadAdvance(1, 15), 0.132, 1e-3);
    near(equalSpreadAdvance(1, 22.5), 0.1989, 1e-4);
    near(equalSpreadAdvance(1, 30), 0.2679, 1e-4);
    near(equalSpreadAdvance(1, 45), 0.4142, 1e-4);
  });

  test('C is the spread times the tangent of half the angle', () => {
    for (const spread of [3, 6, 12.5]) {
      near(equalSpreadAdvance(spread, 22.5), spread * Math.tan(Math.PI / 16), 1e-12);
    }
  });

  test('no spread means no advance', () => near(equalSpreadAdvance(0, 45), 0, 1e-12));

  test('nonsense gives nothing rather than a number', () => {
    expect(Number.isFinite(equalSpreadAdvance(-1, 45))).toBe(false);
    expect(Number.isFinite(equalSpreadAdvance(6, 0))).toBe(false);
    expect(Number.isFinite(equalSpreadAdvance(6, 180))).toBe(false);
  });
});

describe('double offset bends', () => {
  // The handbook's 60 degree double offset: 5 inch radii, a 10 inch first
  // offset and an 8 inch return, end legs of 12 and 10 to the points of
  // intersection, and 14 inches along the parallel section between them.
  const d = solveDoubleOffset({
    angle: 60, radius: 5, firstOffset: 10, returnOffset: 8, legA: 12, legB: 10, parallel: 14,
  });

  test('it solves', () => expect(d.valid).toBe(true));
  test('setback, printed as 2-7/8', () => near(d.setback, 2.8868, 1e-4));
  test('length of each bend, printed as 5-1/4', () => near(d.arcLength, 5.236, 1e-3));

  test('the printed 60 degree offset multipliers', () => {
    near(d.firstRun, 10 * 0.5774, 1e-3);
    near(d.firstTravel, 10 * 1.1547, 1e-3);
    near(d.returnRun, 8 * 0.5774, 1e-3);
    near(d.returnTravel, 8 * 1.1547, 1e-3);
  });

  test('the first mark, printed as 12 less the setback', () => near(d.straightA, 9.1132, 1e-4));
  test('the straight between the first pair, printed as 5-3/4', () => near(d.betweenFirstPair, 5.7735, 1e-4));
  test('the parallel straight, printed as 8-1/4', () => near(d.parallelStraight, 8.2265, 1e-4));
  test('the straight between the second pair', () => near(d.betweenSecondPair, 3.4641, 1e-4));
  test('the last straight', () => near(d.straightB, 7.1132, 1e-4));

  test('nine marks in order', () => {
    expect(d.marks.length).toBe(9);
    for (let i = 1; i < d.marks.length; i++) {
      expect(d.marks[i]!.position).toBeGreaterThan(d.marks[i - 1]!.position);
    }
    expect(d.marks[8]!.label).toBe('Cut end');
    near(d.marks[8]!.position, d.totalLength, 1e-12);
  });

  test('the straights and the four bends add up to the total', () => {
    const sum =
      d.straightA + d.betweenFirstPair + d.parallelStraight + d.betweenSecondPair + d.straightB + 4 * d.arcLength;
    near(sum, d.totalLength, 1e-9);
  });

  test('equal offsets give equal straights between each pair', () => {
    const e = solveDoubleOffset({
      angle: 45, radius: 6, firstOffset: 9, returnOffset: 9, legA: 20, legB: 20, parallel: 20,
    });
    near(e.betweenFirstPair, e.betweenSecondPair, 1e-12);
    near(e.straightA, e.straightB, 1e-12);
  });

  test('a straight too short for its bends is refused', () => {
    const e = solveDoubleOffset({
      angle: 60, radius: 30, firstOffset: 10, returnOffset: 8, legA: 12, legB: 10, parallel: 14,
    });
    expect(e.valid).toBe(false);
    expect(e.error).toMatch(/shorter than/i);
  });

  test('bad inputs are refused by name', () => {
    const base = { angle: 60, radius: 5, firstOffset: 10, returnOffset: 8, legA: 12, legB: 10, parallel: 14 };
    expect(solveDoubleOffset({ ...base, angle: 91 }).error).toMatch(/back on itself/i);
    expect(solveDoubleOffset({ ...base, angle: 0 }).error).toMatch(/greater than zero/i);
    expect(solveDoubleOffset({ ...base, radius: 0 }).error).toMatch(/radius/i);
    expect(solveDoubleOffset({ ...base, returnOffset: 0 }).error).toMatch(/both offsets/i);
    expect(solveDoubleOffset({ ...base, parallel: NaN }).error).toMatch(/parallel/i);
  });

  test('the centre bend of a crossover is the two offset angles added', () => {
    near(crossoverCentreAngle(30, 45), 75, 1e-12);
    near(crossoverCentreAngle(45, 30), 75, 1e-12);
    // The length multiplier confirms the centre bend is 75 degrees: 1.309 is
    // exactly 75 in radians. The setback belongs with it, and the handbook's
    // own universal table lists 75 degrees as .7673, which is tan 37.5. The
    // double offset page prints .763 instead, so the book disagrees with
    // itself and the code keeps the correct value.
    near(bend(75, 1).arcLength, 1.309, 1e-3);
    near(bend(75, 1).setback, 0.7673, 1e-4);
    expect(Math.abs(bend(75, 1).setback - 0.763)).toBeGreaterThan(0.004);
  });

  test('a crossover centre angle needs two real angles', () => {
    expect(Number.isFinite(crossoverCentreAngle(0, 45))).toBe(false);
    expect(Number.isFinite(crossoverCentreAngle(120, 90))).toBe(false);
  });
});
