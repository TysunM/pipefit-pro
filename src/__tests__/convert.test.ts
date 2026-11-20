import { CATEGORIES, categoryById, convert, formatConverted, inputText, inputValue, pressConv, unitIn } from '../calc/convert';
import { fromBase, toBase } from '../calc/dim';
import { defaultCalcPrefs, fromUnitOf, parseCalcPrefs, serialiseCalcPrefs } from '../state/calcPrefs';

const c = (cat: string, v: number, from: string, to: string) => {
  const k = categoryById(cat);
  return convert(v, unitIn(k, from), unitIn(k, to));
};

describe('the converter', () => {
  test.each([
    ['length', 1, 'in', 'mm', 25.4],
    ['length', 1, 'mi', 'ft', 5280],
    ['length', 1000, 'mil', 'in', 1],
    ['area', 1, 'ac', 'ft2', 43560],
    ['area', 1, 'ft2', 'in2', 144],
    ['volume', 1, 'gal', 'in3', 231],
    ['volume', 1, 'bbl', 'gal', 42],
    ['volume', 1, 'gal', 'l', 3.785411784],
    ['mass', 1, 'lb', 'kg', 0.45359237],
    ['mass', 1, 'ton', 'lb', 2000],
    ['temperature', 212, 'f', 'c', 100],
    ['temperature', -40, 'c', 'f', -40],
    ['temperature', 0, 'c', 'k', 273.15],
    ['temperature', 0, 'r', 'k', 0],
    ['speed', 60, 'mph', 'fps', 88],
    ['time', 1, 'wk', 'h', 168],
    ['data', 1, 'gib', 'mib', 1024],
    ['data', 1, 'gb', 'mb', 1000],
    ['pressure', 1, 'bar', 'kpa', 100],
    ['pressure', 1, 'atm', 'psi', 14.6959487755],
    ['pressure', 1, 'ksi', 'psi', 1000],
    ['flow', 1, 'gpm', 'gph', 60],
    ['torque', 1, 'ftlb', 'inlb', 12],
    ['torque', 1, 'ftlb', 'nm', 1.3558179483],
    ['force', 1, 'kip', 'lbf', 1000],
    ['power', 1, 'tr', 'btuh', 12000],
    ['power', 1, 'hp', 'w', 745.6998716],
    ['energy', 1, 'therm', 'btu', 100000],
    ['energy', 1, 'kwh', 'btu', 3412.141633],
    ['angle', 1, 'rev', 'deg', 360],
    ['angle', 1, 'deg', 'arcmin', 60],
  ])('%s: %d %s is %d %s', (cat, v, from, to, want) => expect(c(cat, v, from, to)).toBeCloseTo(want as number, 6));

  test('every unit goes there and back to the figure it started from', () => {
    for (const k of CATEGORIES)
      for (const a of k.units)
        for (const b of k.units) {
          const v = 37.25;
          expect(convert(convert(v, a, b), b, a)).toBeCloseTo(v, 8);
        }
  });

  test('agrees with the trade calculator wherever the two share a unit', () => {
    const pairs: [string, string, string][] = [
      ['length', 'ft', 'm'],
      ['area', 'ft2', 'm2'],
      ['volume', 'gal', 'l'],
      ['volume', 'bbl', 'ft3'],
      ['mass', 'lb', 'kg'],
      ['pressure', 'psi', 'kpa'],
      ['pressure', 'psi', 'bar'],
      ['pressure', 'fth2o', 'psi'],
      ['pressure', 'inhg', 'psi'],
      ['flow', 'gpm', 'lpm'],
      ['flow', 'cfm', 'gpm'],
      ['temperature', 'f', 'c'],
    ];
    const ID: Record<string, string> = { fth2o: 'fthd', lb: 'lb', kg: 'kg' };
    for (const [cat, a, b] of pairs) {
      const trade = fromBase(toBase(10, ID[a] ?? a), ID[b] ?? b);
      expect(c(cat, 10, a, b) / trade).toBeCloseTo(1, 5);
    }
  });

  test('ids are unique in a category, and each category opens on two of its own units', () => {
    for (const k of CATEGORIES) {
      expect(new Set(k.units.map((x) => x.id)).size).toBe(k.units.length);
      expect(k.units.some((x) => x.id === k.first[0])).toBe(true);
      expect(k.units.some((x) => x.id === k.first[1])).toBe(true);
    }
  });

  test('reads ten figures with commas, and an exponent where it must', () => {
    expect(formatConverted(25.4)).toBe('25.4');
    expect(formatConverted(1609344)).toBe('1,609,344');
    expect(formatConverted(-40)).toBe('−40');
    expect(formatConverted(1 / 3)).toBe('0.3333333333');
    expect(formatConverted(1e-9)).toBe('1E-9');
    expect(formatConverted(2.5e18)).toBe('2.5E+18');
    expect(formatConverted(1e-13)).toBe('0');
  });
});

describe('typing the figure', () => {
  const type = (seq: string) => [...seq].reduce((s, ch) => pressConv(s, ch === '.' ? { t: 'dot' } : ch === '<' ? { t: 'back' } : ch === '~' ? { t: 'sign' } : ch === 'C' ? { t: 'clear' } : { t: 'digit', d: ch }), '');
  test('digits, one point, a minus, backspace and clear', () => {
    expect(type('1234.5')).toBe('1234.5');
    expect(type('.5')).toBe('0.5');
    expect(type('1.2.3')).toBe('1.23');
    expect(type('007')).toBe('7');
    expect(type('40~')).toBe('-40');
    expect(type('40~~')).toBe('40');
    expect(type('40~<<')).toBe('');
    expect(type('12C')).toBe('');
    expect(type('9'.repeat(20))).toHaveLength(15);
  });
  test('reads as a number, and shows with commas', () => {
    expect(inputValue('')).toBe(0);
    expect(inputValue('-')).toBe(0);
    expect(inputValue('12.')).toBe(12);
    expect(inputValue('-40')).toBe(-40);
    expect(inputText('1234567.5')).toBe('1,234,567.5');
    expect(inputText('-40')).toBe('−40');
    expect(inputText('')).toBe('0');
  });
});

describe('what the calculator tab remembers', () => {
  test('goes round the store and back', () => {
    const p = { ...defaultCalcPrefs(), mode: 'standard' as const, panel: 'convert' as const, scientific: true, angle: 'rad' as const, category: 'pressure', from: { pressure: 'bar' }, history: [{ expr: '2+2', result: '4', value: 4 }] };
    expect(parseCalcPrefs(serialiseCalcPrefs(p))).toEqual(p);
  });
  test('anything damaged or unknown reads as the defaults, the trade calculator first', () => {
    expect(parseCalcPrefs(null)).toEqual(defaultCalcPrefs());
    expect(parseCalcPrefs('not json')).toEqual(defaultCalcPrefs());
    expect(parseCalcPrefs(JSON.stringify({ v: 99, mode: 'standard' }))).toEqual(defaultCalcPrefs());
    const odd = parseCalcPrefs(JSON.stringify({ v: 1, mode: 'x', panel: 'y', angle: 'grad', category: 'nope', from: { length: 'furlong', mass: 'kg', nope: 'x' }, history: [{ expr: '1+1', result: '2', value: 2 }, { expr: 3 }, null] }));
    expect(odd.mode).toBe('trade');
    expect(odd.panel).toBe('keys');
    expect(odd.angle).toBe('deg');
    expect(odd.category).toBe('length');
    expect(odd.from).toEqual({ mass: 'kg' });
    expect(odd.history).toEqual([{ expr: '1+1', result: '2', value: 2 }]);
  });
  test('the unit a category is typed in: as left, else its own first', () => {
    expect(fromUnitOf(defaultCalcPrefs(), 'length')).toBe('in');
    expect(fromUnitOf({ ...defaultCalcPrefs(), from: { length: 'mm' } }, 'length')).toBe('mm');
  });
});
