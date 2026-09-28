import { EMPTY_ENTRY, Entry, GloveKey, entryLabel, entryValue, fieldValue, press, pushFigure } from '../calc/gloveEntry';
import { parseNumber } from '../calc/format';

// The glove keypad, key by key
// ----------------------------

const d = (x: string): GloveKey => ({ k: 'digit', d: x });
const FT: GloveKey = { k: 'feet' };
const DOT: GloveKey = { k: 'dot' };
const BACK: GloveKey = { k: 'back' };
const PLUS16: GloveKey = { k: 'sixteenth' };
const frac = (n: number, dd: number): GloveKey => ({ k: 'frac', n, d: dd });

const keys = (list: GloveKey[], tape = true): Entry => list.reduce((e, k) => press(e, k, tape), EMPTY_ENTRY);

describe('keying a tape figure', () => {
  test("4 ' 3 5/8 is 51 5/8 inches, shown as 4' 3 5/8\"", () => {
    const e = keys([d('4'), FT, d('3'), frac(5, 8)]);
    expect(entryLabel(e, true)).toBe(`4' 3 5/8"`);
    expect(entryValue(e)).toBe(51.625);
    expect(fieldValue(e)).toBe('51 5/8');
  });

  test('what the field is given reads back exactly through the parser every field uses', () => {
    for (const e of [
      keys([d('4'), FT, d('3'), frac(5, 8)]),
      keys([d('1'), d('1'), frac(3, 4), PLUS16]),
      keys([frac(1, 2)]),
      keys([d('2'), FT]),
      keys([d('1'), d('2'), DOT, d('5')]),
    ])
      expect(parseNumber(fieldValue(e))).toBeCloseTo(entryValue(e)!, 12);
  });

  test('+1/16 turns an eighth into the sixteenth above it, or starts at a sixteenth', () => {
    expect(fieldValue(keys([d('3'), frac(5, 8), PLUS16]))).toBe('3 11/16');
    expect(fieldValue(keys([d('3'), frac(1, 2), PLUS16]))).toBe('3 9/16');
    expect(fieldValue(keys([d('3'), PLUS16]))).toBe('3 1/16');
    // Already a sixteenth: a second press does nothing rather than walk on.
    expect(fieldValue(keys([d('3'), frac(5, 8), PLUS16, PLUS16]))).toBe('3 11/16');
  });

  test('feet alone, a fraction alone, and a leading zero', () => {
    expect(fieldValue(keys([d('6'), FT]))).toBe('72');
    expect(fieldValue(keys([frac(3, 8)]))).toBe('3/8');
    expect(fieldValue(keys([d('0'), d('7')]))).toBe('7');
  });

  test('backspace takes the last thing keyed, the foot mark included', () => {
    expect(entryLabel(keys([d('4'), FT, d('3'), frac(5, 8), BACK]), true)).toBe(`4' 3"`);
    expect(entryLabel(keys([d('4'), FT, BACK]), true)).toBe(`4"`);
    expect(keys([BACK])).toEqual(EMPTY_ENTRY);
  });

  test('presses that make no sense where they land do nothing', () => {
    // A digit after the fraction, a second foot mark, a fraction on a decimal, a second point.
    expect(fieldValue(keys([d('3'), frac(1, 2), d('4')]))).toBe('3 1/2');
    expect(fieldValue(keys([d('4'), FT, d('3'), FT]))).toBe('51');
    expect(fieldValue(keys([d('3'), DOT, d('5'), frac(1, 4)]))).toBe('3.5');
    expect(fieldValue(keys([d('3'), DOT, DOT, d('5')]))).toBe('3.5');
    // The foot mark needs a number in front of it.
    expect(keys([FT])).toEqual(EMPTY_ENTRY);
  });

  test('off a tape field there are no feet or fractions, just digits and a point', () => {
    const e = keys([d('2'), d('2'), DOT, d('5'), FT, frac(1, 2)], false);
    expect(fieldValue(e)).toBe('22.5');
    expect(entryLabel(e, false)).toBe('22.5');
  });

  test('nothing keyed is nothing', () => {
    expect(entryValue(EMPTY_ENTRY)).toBeNull();
    expect(fieldValue(EMPTY_ENTRY)).toBe('');
    expect(entryLabel(EMPTY_ENTRY, true)).toBe('');
  });
});

describe('recent figures', () => {
  test('newest first, no repeats, eight kept', () => {
    let list: string[] = [];
    for (const v of ['1', '2', '3', '2', '4', '5', '6', '7', '8', '9']) list = pushFigure(list, v);
    expect(list).toEqual(['9', '8', '7', '6', '5', '4', '2', '3']);
    expect(pushFigure(list, '  ')).toEqual(list);
  });
});
