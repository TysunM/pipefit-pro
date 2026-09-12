import {
  DimError, add, arcCosine, arcSine, arcTangent, cosine, dim, divide, findUnit, fromBase,
  kindLabel, multiply, negate, percentOf, power, reciprocal, sine, square, squareRoot,
  subtract, tangent, toBase, UNITS, unitsFor,
} from '../calc/dim';
import {
  emptyEntry, entryDisplay, entryValue, formatFeetInch, isEntryEmpty, parseFeetInch,
  pressBackspace, pressDigit, pressDot, pressFeet, pressInch, pressSign, pressSlash,
} from '../calc/ftin';

const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);
const digits = (e: ReturnType<typeof emptyEntry>, s: string) =>
  s.split('').reduce((acc, d) => pressDigit(acc, d), e);

describe('feet-inch-fraction formatting', () => {
  test('whole inches under a foot', () => expect(formatFeetInch(7)).toBe('7"'));
  test('zero reads as zero inches', () => expect(formatFeetInch(0)).toBe('0"'));
  test('exact feet drop the inch part', () => expect(formatFeetInch(24)).toBe("2'"));
  test('feet and inches', () => expect(formatFeetInch(30)).toBe(`2' 6"`));
  test('feet, inches and a fraction', () => expect(formatFeetInch(150.5)).toBe(`12' 6-1/2"`));
  test('a bare fraction keeps no whole part', () => expect(formatFeetInch(0.75)).toBe('3/4"'));
  test('fractions reduce', () => expect(formatFeetInch(0.5)).toBe('1/2"'));
  test('negatives keep their sign', () => expect(formatFeetInch(-30)).toBe(`-2' 6"`));

  test('rounding up a fraction carries into the inch', () => {
    expect(formatFeetInch(5 + 63.6 / 64, 64)).toBe('6"');
  });

  test('rounding up an inch carries into the foot', () => {
    expect(formatFeetInch(11 + 63.9 / 64, 64)).toBe(`1'`);
  });

  test('never prints a fraction equal to the denominator', () => {
    for (let i = 0; i < 4000; i++) {
      const s = formatFeetInch(i * 0.0173, 16);
      expect(s).not.toMatch(/16\/16/);
      expect(s).not.toMatch(/\b12"/);
    }
  });

  test('every denominator round-trips a value on its own grid', () => {
    for (const den of [2, 4, 8, 16, 32, 64] as const)
      for (let t = 0; t < den; t++) {
        const v = 3 + t / den;
        near(parseFeetInch(formatFeetInch(v, den)), v, 1e-12);
      }
  });
});

describe('feet-inch-fraction parsing', () => {
  test('plain inches', () => near(parseFeetInch('7'), 7));
  test('inch mark', () => near(parseFeetInch('7"'), 7));
  test('feet mark', () => near(parseFeetInch(`3'`), 36));
  test('feet and inches', () => near(parseFeetInch(`3' 6"`), 42));
  test('hyphenated fraction', () => near(parseFeetInch(`12' 6-1/2"`), 150.5));
  test('spaced fraction', () => near(parseFeetInch(`12' 6 1/2"`), 150.5));
  test('bare fraction', () => near(parseFeetInch('3/4'), 0.75));
  test('word forms', () => near(parseFeetInch('3 feet 6 inch'), 42));
  test('decimal inches', () => near(parseFeetInch('6.375'), 6.375));
  test('negative', () => near(parseFeetInch(`-2' 6"`), -30));
  test('a zero denominator is refused', () => expect(Number.isFinite(parseFeetInch('1/0'))).toBe(false));
  test('junk is refused', () => expect(Number.isFinite(parseFeetInch('abc'))).toBe(false));
  test('empty is refused', () => expect(Number.isFinite(parseFeetInch(''))).toBe(false));

  test('format and parse round-trip on the 16th grid', () => {
    for (let i = 0; i < 800; i++) {
      const v = i / 16;
      near(parseFeetInch(formatFeetInch(v, 16)), v, 1e-12);
    }
  });
});

describe('keypad entry', () => {
  test('a fresh entry is empty and has no value', () => {
    const e = emptyEntry();
    expect(isEntryEmpty(e)).toBe(true);
    expect(Number.isFinite(entryValue(e))).toBe(false);
  });

  test('digits alone read as inches', () => near(entryValue(digits(emptyEntry(), '18')), 18));

  test('twelve feet six and a half', () => {
    let e = pressFeet(digits(emptyEntry(), '12'));
    e = pressInch(digits(e, '6'));
    e = pressSlash(digits(e, '1'));
    e = digits(e, '2');
    near(entryValue(e), 150.5);
    expect(entryDisplay(e)).toBe(`12' 6" 1/2`);
  });

  test('an incomplete fraction has no value yet', () => {
    const e = pressSlash(digits(emptyEntry(), '1'));
    expect(Number.isFinite(entryValue(e))).toBe(false);
  });

  test('a zero denominator has no value', () => {
    const e = digits(pressSlash(digits(emptyEntry(), '1')), '0');
    expect(Number.isFinite(entryValue(e))).toBe(false);
  });

  test('a second slash is ignored', () => {
    const once = pressSlash(digits(emptyEntry(), '1'));
    expect(pressSlash(once)).toEqual(once);
  });

  test('feet with nothing typed is ignored', () => {
    const e = emptyEntry();
    expect(pressFeet(e)).toEqual(e);
    expect(pressInch(e)).toEqual(e);
  });

  test('a decimal point is taken once and not inside a denominator', () => {
    const e = pressDot(pressDot(digits(emptyEntry(), '6')));
    near(entryValue(digits(e, '5')), 6.5);
    const frac = pressSlash(digits(emptyEntry(), '1'));
    expect(pressDot(frac)).toEqual(frac);
  });

  test('sign toggles both ways', () => {
    const e = digits(emptyEntry(), '9');
    near(entryValue(pressSign(e)), -9);
    near(entryValue(pressSign(pressSign(e))), 9);
  });

  test('backspace unwinds one keypress at a time, digits then units', () => {
    let e = pressInch(digits(pressFeet(digits(emptyEntry(), '12')), '6'));
    near(entryValue(e), 150);

    e = digits(e, '7');
    near(entryValue(e), 157);

    e = pressBackspace(e);
    near(entryValue(e), 150);

    e = pressBackspace(e);
    near(entryValue(e), 150);

    e = pressBackspace(e);
    near(entryValue(e), 144);

    e = pressBackspace(e);
    near(entryValue(e), 12);

    e = pressBackspace(e);
    e = pressBackspace(e);
    expect(isEntryEmpty(e)).toBe(true);
  });

  test('backspace on an empty entry stays empty', () => {
    const e = emptyEntry();
    expect(pressBackspace(e)).toEqual(e);
  });

  test('backspace out of a denominator restores the numerator as digits', () => {
    const e = pressBackspace(pressSlash(digits(emptyEntry(), '3')));
    near(entryValue(e), 3);
  });

  test('a leading zero is replaced rather than appended', () => {
    near(entryValue(digits(emptyEntry(), '05')), 5);
  });
});

describe('dimensional algebra', () => {
  test('like kinds add', () => {
    const s = add(dim(10, 'linear'), dim(2.5, 'linear'));
    expect(s.kind).toBe('linear');
    near(s.value, 12.5);
  });

  test('a plain number adopts the other kind', () => {
    expect(add(dim(3, 'scalar'), dim(4, 'linear')).kind).toBe('linear');
    expect(subtract(dim(9, 'linear'), dim(4, 'scalar')).kind).toBe('linear');
  });

  test('unlike kinds refuse to add, and say so in trade words', () => {
    expect(() => add(dim(1, 'linear'), dim(1, 'weight'))).toThrow(DimError);
    expect(() => add(dim(1, 'linear'), dim(1, 'weight'))).toThrow(/length/);
  });

  test('length times length is area, times length again is volume', () => {
    const a = multiply(dim(12, 'linear'), dim(12, 'linear'));
    expect(a.kind).toBe('area');
    near(a.value, 144);
    expect(multiply(a, dim(12, 'linear')).kind).toBe('volume');
    expect(multiply(dim(12, 'linear'), a).kind).toBe('volume');
  });

  test('volume times length is refused rather than silently wrong', () => {
    expect(() => multiply(dim(1, 'volume'), dim(1, 'linear'))).toThrow(DimError);
  });

  test('dividing like kinds gives a plain ratio', () => {
    const r = divide(dim(30, 'linear'), dim(10, 'linear'));
    expect(r.kind).toBe('scalar');
    near(r.value, 3);
  });

  test('area over length is length, volume over area is length', () => {
    expect(divide(dim(144, 'area'), dim(12, 'linear')).kind).toBe('linear');
    expect(divide(dim(1728, 'volume'), dim(144, 'area')).kind).toBe('linear');
    expect(divide(dim(1728, 'volume'), dim(12, 'linear')).kind).toBe('area');
  });

  test('division by zero is refused', () => {
    expect(() => divide(dim(1, 'linear'), dim(0, 'scalar'))).toThrow(/zero/i);
  });

  test('squaring a length gives area and rooting it comes back', () => {
    const a = square(dim(9, 'linear'));
    expect(a.kind).toBe('area');
    near(a.value, 81);
    const back = squareRoot(a);
    expect(back.kind).toBe('linear');
    near(back.value, 9);
  });

  test('rooting a volume or a negative is refused', () => {
    expect(() => squareRoot(dim(8, 'volume'))).toThrow(DimError);
    expect(() => squareRoot(dim(-1, 'scalar'))).toThrow(/negative/i);
  });

  test('powers take plain numbers only', () => {
    near(power(dim(2, 'scalar'), dim(10, 'scalar')).value, 1024);
    expect(() => power(dim(2, 'linear'), dim(2, 'scalar'))).toThrow(DimError);
  });

  test('negate and reciprocal', () => {
    near(negate(dim(5, 'linear')).value, -5);
    near(reciprocal(dim(4, 'scalar')).value, 0.25);
  });

  test('percent of keeps the kind', () => {
    const p = percentOf(dim(200, 'linear'), dim(15, 'scalar'));
    expect(p.kind).toBe('linear');
    near(p.value, 30);
  });

  test('temperatures never multiply together', () => {
    expect(() => multiply(dim(70, 'temperature'), dim(2, 'temperature'))).toThrow(DimError);
    expect(multiply(dim(70, 'temperature'), dim(2, 'scalar')).kind).toBe('temperature');
  });

  test('every kind has a readable label', () => {
    for (const u of UNITS) expect(kindLabel(u.kind).length).toBeGreaterThan(0);
  });
});

describe('unit conversion', () => {
  test('a foot is twelve inches', () => near(toBase(1, 'ft').value, 12));
  test('an inch is 25.4 mm', () => near(fromBase(toBase(1, 'in'), 'mm'), 25.4));
  test('a metre is 39.3700787 inches', () => near(toBase(1, 'm').value, 1000 / 25.4));
  test('a square foot is 144 square inches', () => near(toBase(1, 'ft2').value, 144));
  test('a cubic foot is 1728 cubic inches', () => near(toBase(1, 'ft3').value, 1728));
  test('a US gallon is 231 cubic inches', () => near(toBase(1, 'gal').value, 231));
  test('a cubic foot is 7.48052 gallons', () => near(fromBase(toBase(1, 'ft3'), 'gal'), 7.480519480519, 1e-9));
  test('a litre is 61.0237441 cubic inches', () => near(toBase(1, 'l').value, 61.023744094732284, 1e-9));
  test('a gallon is 3.785411784 litres', () => near(fromBase(toBase(1, 'gal'), 'l'), 3.785411784, 1e-9));
  test('a barrel is 42 gallons', () => near(fromBase(toBase(1, 'bbl'), 'gal'), 42));
  test('a kilogram is 2.20462262 pounds', () => near(toBase(1, 'kg').value, 2.2046226218));
  test('a short ton is 2000 pounds', () => near(toBase(1, 'ton').value, 2000));
  test('one litre per second is 15.85032 gpm', () => near(toBase(1, 'lps').value, 15.850323141489, 1e-9));
  test('one cfm is 7.48052 gpm', () => near(toBase(1, 'cfm').value, 7.480519480519, 1e-9));
  test('a bar is 14.5037738 psi', () => near(toBase(1, 'bar').value, 14.503773773));
  test('a kilonewton is 224.809 lbf', () => near(toBase(1, 'kn').value, 224.8089431));
  test('a radian is 57.2957795 degrees', () => near(toBase(1, 'rad').value, 57.29577951308232, 1e-9));

  test('freezing and boiling water convert both ways', () => {
    near(toBase(0, 'c').value, 32);
    near(toBase(100, 'c').value, 212);
    near(fromBase(dim(32, 'temperature'), 'c'), 0);
    near(fromBase(dim(212, 'temperature'), 'c'), 100);
  });

  test('minus forty is the same in both scales', () => near(toBase(-40, 'c').value, -40));

  test('every unit round-trips through the base', () => {
    for (const u of UNITS)
      for (const v of [0.125, 1, 37.5, 1000]) near(fromBase(toBase(v, u.id), u.id), v, 1e-8);
  });

  test('reading a value as the wrong kind is refused', () => {
    expect(() => fromBase(dim(1, 'linear'), 'lb')).toThrow(DimError);
  });

  test('an unknown unit is refused', () => expect(() => findUnit('furlong')).toThrow(DimError));

  test('each kind on the keypad offers at least two units', () => {
    for (const k of ['linear', 'area', 'volume', 'weight', 'flow', 'velocity', 'pressure', 'force'] as const)
      expect(unitsFor(k).length).toBeGreaterThan(1);
  });
});

describe('trigonometry', () => {
  test('the familiar angles', () => {
    near(sine(dim(30, 'angle')).value, 0.5);
    near(cosine(dim(60, 'angle')).value, 0.5);
    near(tangent(dim(45, 'angle')).value, 1);
    near(sine(dim(0, 'angle')).value, 0);
    near(cosine(dim(0, 'angle')).value, 1);
  });

  test('tangent at 90 is refused rather than returning a huge number', () => {
    expect(() => tangent(dim(90, 'angle'))).toThrow(/undefined/i);
    expect(() => tangent(dim(270, 'angle'))).toThrow(/undefined/i);
    expect(() => tangent(dim(-90, 'angle'))).toThrow(/undefined/i);
  });

  test('inverses return angles and invert cleanly', () => {
    for (const a of [0, 10, 22.5, 30, 45, 60, 75, 89]) {
      expect(arcSine(sine(dim(a, 'angle'))).kind).toBe('angle');
      near(arcSine(sine(dim(a, 'angle'))).value, a, 1e-9);
      near(arcCosine(cosine(dim(a, 'angle'))).value, a, 1e-9);
      near(arcTangent(tangent(dim(a, 'angle'))).value, a, 1e-9);
    }
  });

  test('inverse trig outside its domain is refused', () => {
    expect(() => arcSine(dim(1.5, 'scalar'))).toThrow(/between/i);
    expect(() => arcCosine(dim(-2, 'scalar'))).toThrow(/between/i);
  });

  test('a length is not an angle', () => {
    expect(() => sine(dim(30, 'linear'))).toThrow(DimError);
    expect(() => arcSine(dim(0.5, 'linear'))).toThrow(/ratio/i);
  });

  test('the offset multiplier comes out of the keypad trig', () => {
    for (const a of [11.25, 22.5, 30, 45, 60]) {
      const mult = divide(dim(1, 'scalar'), sine(dim(a, 'angle')));
      near(mult.value, 1 / Math.sin((a * Math.PI) / 180), 1e-12);
    }
  });
});
