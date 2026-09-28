import { fractionWords, spokenAngle, spokenLength, spokenResult } from '../calc/spoken';

// Said the way it is read off a tape
// ----------------------------------

const say = (inches: number, den: 0 | 8 | 16 | 32 | 64 = 16) => spokenLength(inches, 'imperial', den);

describe('lengths, imperial', () => {
  test('feet and inches from a foot up, the way a tape reads', () => {
    expect(say(51.625)).toBe('4 foot, 3 and five-eighths');
    expect(say(48)).toBe('4 foot even');
    expect(say(48.625)).toBe('4 foot and five-eighths');
    expect(say(12.5)).toBe('1 foot and a half');
    expect(say(59)).toBe('4 foot, 11');
  });

  test('under a foot it is inches', () => {
    expect(say(8.25)).toBe('8 and a quarter inches');
    expect(say(0.375)).toBe('three-eighths inches');
    expect(say(7)).toBe('7 inches');
    expect(say(0)).toBe('zero');
  });

  test('every fraction is named, reduced, with the right article', () => {
    expect(fractionWords(1, 2)).toBe('a half');
    expect(fractionWords(12, 16)).toBe('three-quarters');
    expect(fractionWords(2, 16)).toBe('an eighth');
    expect(fractionWords(11, 16)).toBe('eleven-sixteenths');
    expect(fractionWords(1, 16)).toBe('a sixteenth');
    expect(fractionWords(21, 32)).toBe('twenty-one-thirty-seconds');
    expect(fractionWords(1, 64)).toBe('a sixty-fourth');
  });

  test('off the mark by a quarter tick or more it says strong or shy', () => {
    // 51.645 is 0.02" over 51 5/8: not enough to round up to 11/16, more than a quarter tick over the mark.
    expect(say(51.645)).toBe('4 foot, 3 and five-eighths, strong');
    expect(say(51.605)).toBe('4 foot, 3 and five-eighths, shy');
    // Within a quarter tick it is simply the mark.
    expect(say(51.63)).toBe('4 foot, 3 and five-eighths');
  });

  test('rounding carries into the next inch and the next foot', () => {
    expect(say(47.98)).toBe('4 foot even, shy');
    expect(say(47.99)).toBe('4 foot even');
    expect(say(11.98)).toBe('1 foot even, shy');
  });

  test('the tick follows the setting; fractions off reads the decimal', () => {
    expect(say(51.6875, 8)).toBe('4 foot, 3 and three-quarters, shy');
    expect(say(51.6875, 32)).toBe('4 foot, 3 and eleven-sixteenths');
    expect(say(51.625, 0)).toBe('51.63 inches');
  });

  test('negative and non-finite', () => {
    expect(say(-2.5)).toBe('minus 2 and a half inches');
    expect(say(NaN)).toBe('');
  });
});

describe('metric, angles and the whole phrase', () => {
  test('metric reads whole millimetres', () => {
    expect(spokenLength(51.625, 'metric', 16)).toBe('1311 millimetres');
  });

  test('angles read to a tenth, without a trailing zero', () => {
    expect(spokenAngle(22.5)).toBe('22.5 degrees');
    expect(spokenAngle(45.0)).toBe('45 degrees');
    expect(spokenAngle(NaN)).toBe('');
  });

  test('the result is named first, and dashes do not get read out', () => {
    expect(spokenResult('Pipe cut', '4 foot, 3 and five-eighths')).toBe('Pipe cut: 4 foot, 3 and five-eighths');
    expect(spokenResult('Elbow cut — throat arc', '9 inches')).toBe('Elbow cut, throat arc: 9 inches');
    expect(spokenResult('Pipe cut', '')).toBe('');
  });
});
