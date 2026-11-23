import { ELEMENTS, ceReading, equivalents, hasChemistry, outOfRange } from '../calc/weldability';

describe('the carbon equivalents', () => {
  // Worked by hand, element by element.
  const c = { C: 0.2, Mn: 1.2, Si: 0.3, Cr: 0.1, Ni: 0.1, Mo: 0.05, Cu: 0.15, V: 0.02, N: 0.008, B: 0.0005 };
  const e = equivalents(c);
  test('IIW: C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', () => expect(e.ceIIW).toBeCloseTo(0.450667, 6));
  test('CET: C + (Mn+Mo)/10 + (Cr+Cu)/20 + Ni/40', () => expect(e.cet).toBeCloseTo(0.34, 9));
  test('AWS: C + (Mn+Si)/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15', () => expect(e.ceAWS).toBeCloseTo(0.500667, 6));
  test('Pcm: C + Si/30 + (Mn+Cu+Cr)/20 + Ni/60 + Mo/15 + V/10 + 5B', () => expect(e.pcm).toBeCloseTo(0.292, 9));
  test('PREN: Cr + 3.3Mo + 16N', () => expect(e.pren).toBeCloseTo(0.393, 9));
  test('the stainless reference figures shown beside PREN hold', () => {
    expect(equivalents({ Cr: 17, Mo: 2.1, N: 0.05 }).pren).toBeCloseTo(24.7, 1);
    expect(equivalents({ Cr: 22, Mo: 3.1, N: 0.17 }).pren).toBeCloseTo(35, 0);
  });
  test('a blank, a minus or nonsense counts as nothing', () => {
    expect(equivalents({ C: 0.2, Mn: null, Si: -1, Cr: Number.NaN }).ceIIW).toBeCloseTo(0.2, 9);
  });
});

describe('reading it', () => {
  test.each([
    [0.3, 'Excellent'],
    [0.35, 'Excellent'],
    [0.38, 'Very good'],
    [0.43, 'Good'],
    [0.48, 'Fair'],
    [0.55, 'Poor'],
  ])('CE %d reads %s', (ce, start) => expect(ceReading(ce).startsWith(start)).toBe(true));
  test('whether anything is typed, and a percentage that cannot be', () => {
    expect(hasChemistry({})).toBe(false);
    expect(hasChemistry({ C: 0 })).toBe(false);
    expect(hasChemistry({ Mn: 1.1 })).toBe(true);
    expect([outOfRange(-0.1), outOfRange(101), outOfRange(0.2), outOfRange(null)]).toEqual([true, true, false, false]);
  });
  test('ten elements, each once, carbon first', () => {
    expect(ELEMENTS.map((x) => x.el)).toEqual(['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'Cu', 'V', 'N', 'B']);
  });
});
