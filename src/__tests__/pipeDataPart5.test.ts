import { findRow, pipeDims, wallFor } from '../calc/pipeData';

// A second, independent reading of the pipe tables, off part 5 of the handbook
// rather than the pages the project's own table was built from. Nothing here
// adds data: it checks what is already held against print it has not been
// checked against before.

describe('schedule 120, page 5-19', () => {
  // size, bore, outside, bore area, weight per foot
  const PRINTED: [number, number, number, number, number][] = [
    [4, 3.626, 4.5, 10.33, 19.0],
    [5, 4.563, 5.563, 16.35, 27.1],
    [6, 5.501, 6.625, 23.77, 36.4],
    [8, 7.189, 8.625, 40.59, 60.7],
    [10, 9.064, 10.75, 64.53, 89.2],
    [12, 10.75, 12.75, 90.76, 126.0],
    [14, 11.876, 14.0, 110.77, 147.0],
    [16, 13.564, 16.0, 144.5, 193.0],
    [18, 15.314, 18.0, 184.19, 239.0],
    [20, 17.0, 20.0, 226.98, 297.0],
    [24, 20.5, 24.0, 330.06, 416.0],
  ];

  test('every printed bore and outside reads back', () => {
    for (const [nps, id, od] of PRINTED) {
      const p = pipeDims(nps, '120');
      expect(p).toBeDefined();
      expect(p!.od).toBeCloseTo(od, 3);
      expect(p!.id).toBeCloseTo(id, 3);
    }
  });

  test('every printed bore area comes out of the bore', () => {
    for (const [nps, , , area] of PRINTED) {
      expect(pipeDims(nps, '120')!.boreArea).toBeCloseTo(area, 1);
    }
  });

  // The printed weights are rounded to the pound above about a hundred, so a
  // worked figure lands within half a per cent rather than on the nose: the
  // twelve inch works to 125.5 against a printed 126.
  test('every printed weight comes out of the wall, within the rounding', () => {
    for (const [nps, , , , weight] of PRINTED) {
      const worked = pipeDims(nps, '120')!.weightPerFoot;
      expect(Math.abs(worked - weight)).toBeLessThan(Math.max(0.1, weight * 0.005));
    }
    expect(pipeDims(12, '120')!.weightPerFoot).toBeCloseTo(125.5, 1);
  });
});

describe('stainless steel pipe, page 5-20', () => {
  // size, outside, 40S wall, 80S wall
  const PRINTED: [number, number, number, number][] = [
    [0.125, 0.405, 0.068, 0.095],
    [0.25, 0.54, 0.088, 0.119],
    [0.375, 0.675, 0.091, 0.126],
    [0.5, 0.84, 0.109, 0.147],
    [0.75, 1.05, 0.113, 0.154],
    [1, 1.315, 0.133, 0.179],
    [1.25, 1.66, 0.14, 0.191],
    [1.5, 1.9, 0.145, 0.2],
    [2, 2.375, 0.154, 0.218],
    [2.5, 2.875, 0.203, 0.276],
    [3, 3.5, 0.216, 0.3],
    [3.5, 4.0, 0.226, 0.318],
    [4, 4.5, 0.237, 0.337],
    [5, 5.563, 0.258, 0.375],
    [6, 6.625, 0.28, 0.432],
    [8, 8.625, 0.322, 0.5],
    [10, 10.75, 0.365, 0.5],
    [12, 12.75, 0.375, 0.5],
  ];

  test('eighteen sizes, and every outside diameter reads back', () => {
    expect(PRINTED.length).toBe(18);
    for (const [nps, od] of PRINTED) expect(findRow(nps)!.od).toBeCloseTo(od, 3);
  });

  test('every printed wall reads back', () => {
    for (const [nps, , s40, s80] of PRINTED) {
      expect(wallFor(nps, '40S')).toBeCloseTo(s40, 3);
      expect(wallFor(nps, '80S')).toBeCloseTo(s80, 3);
    }
  });

  // Stainless is rolled a shade thinner than carbon steel in the small sizes
  // and the same from two and a half inch up.
  test('the stainless wall never exceeds the carbon steel wall', () => {
    for (const [nps] of PRINTED) {
      const carbon40 = wallFor(nps, '40');
      const carbon80 = wallFor(nps, '80');
      if (Number.isFinite(carbon40)) expect(wallFor(nps, '40S')).toBeLessThanOrEqual(carbon40);
      if (Number.isFinite(carbon80)) expect(wallFor(nps, '80S')).toBeLessThanOrEqual(carbon80);
    }
  });

  // The top of the stainless table flattens: 80S holds at half an inch from
  // eight inch up, and 40S reaches 0.375 at twelve.
  test('the heavy stainless wall flattens at half an inch', () => {
    for (const nps of [8, 10, 12]) expect(wallFor(nps, '80S')).toBe(0.5);
    expect(wallFor(12, '40S')).toBe(0.375);
  });
});

// Printed as notes under page 5-19 and already held as rules in the project.
describe('what standard weight and extra strong correspond to', () => {
  test('standard weight follows schedule 40 to ten inch, then holds at 0.375', () => {
    for (const nps of [0.125, 0.5, 2, 6, 10]) {
      expect(wallFor(nps, 'Std')).toBe(wallFor(nps, '40'));
    }
    for (const nps of [12, 14, 16, 18, 20, 24]) {
      expect(wallFor(nps, 'Std')).toBe(0.375);
    }
    // At twelve inch the two part company, which is the whole point of the note.
    expect(wallFor(12, '40')).not.toBe(0.375);
  });

  test('extra strong follows schedule 80 to eight inch, then holds at 0.500', () => {
    for (const nps of [0.125, 0.5, 2, 6, 8]) {
      expect(wallFor(nps, 'XS')).toBe(wallFor(nps, '80'));
    }
    for (const nps of [10, 12, 14, 16, 18, 20, 24]) {
      expect(wallFor(nps, 'XS')).toBe(0.5);
    }
    expect(wallFor(10, '80')).not.toBe(0.5);
  });

  test('a heavier schedule always means a thicker wall and a smaller bore', () => {
    for (const nps of [4, 5, 6, 8, 10, 12]) {
      const forty = pipeDims(nps, '40')!;
      const eighty = pipeDims(nps, '80')!;
      const oneTwenty = pipeDims(nps, '120')!;
      expect(eighty.wall).toBeGreaterThan(forty.wall);
      expect(oneTwenty.wall).toBeGreaterThan(eighty.wall);
      expect(oneTwenty.id).toBeLessThan(eighty.id);
      expect(eighty.id).toBeLessThan(forty.id);
    }
  });
});
