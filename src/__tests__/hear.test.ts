import { editDistance, snapPhrases, snapWord, snapWords, soundKey, splitGlued } from '../voice/hear';

describe('what a word sounds like', () => {
  test('the consonants a recogniser swaps are folded together, vowels dropped', () => {
    expect(soundKey('volt')).toBe('BLT');
    expect(soundKey('bolt')).toBe('BLT');
    expect(soundKey('rice')).toBe(soundKey('rise'));
    expect(soundKey('hydra')).toBe(soundKey('hydro'));
    expect(soundKey('aeiouhwy')).toBe('');
    expect(soundKey('Cat')).toBe('KT');
  });

  test('edits between two words, a swap of two letters being one', () => {
    expect(editDistance('bolt', 'bolt')).toBe(0);
    expect(editDistance('volt', 'bolt')).toBe(1);
    expect(editDistance('cuont', 'count')).toBe(1);
    expect(editDistance('', 'ab')).toBe(2);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('a word heard as the nearest one the app knows', () => {
  const vocab = new Set(['bolt', 'bolts', 'holes', 'hydro', 'level', 'rise', 'rose', 'cut', 'not', 'up']);

  test('a letter off', () => {
    expect(snapWord('volt', vocab)).toBe('bolt');
    expect(snapWord('rize', vocab)).toBe('rise');
  });

  test('two off when it sounds the same, or belongs to the tool in play', () => {
    expect(snapWord('hydra', vocab)).toBe('hydro');
    expect(snapWord('bowls', vocab)).toBeNull();
    expect(snapWord('bowls', vocab, new Set(['bolts']))).toBe('bolts');
  });

  test('a short word only when it sounds the same: "hot" is not "not"', () => {
    expect(snapWord('hot', vocab)).toBeNull();
    expect(snapWord('cat', vocab)).toBe('cut');
  });

  test('never a known word, a number, a two-letter word, or a word as near to two things', () => {
    expect(snapWord('rise', vocab)).toBeNull();
    expect(snapWord('12', vocab)).toBeNull();
    expect(snapWord('40s', vocab)).toBeNull();
    expect(snapWord('ri', vocab)).toBeNull();
    expect(snapWord('rase', vocab)).toBeNull();
    expect(snapWord('giraffe', vocab)).toBeNull();
  });

  test('the words come back one for one, the unknown ones left as said', () => {
    expect(snapWords(['volt', '12', 'giraffe', 'rise'], vocab)).toEqual(['bolt', '12', 'giraffe', 'rise']);
  });

  test('a number run into a word is split off it', () => {
    expect(splitGlued(['12volt', '12in', '40s', '3ft', 'bolt', '2x4'], new Set(['bolt', 'in', 'ft']))).toEqual(['12', 'volt', '12', 'in', '40s', '3', 'ft', 'bolt', '2x4']);
  });
});

describe('a run of words heard as the phrase it nearly is', () => {
  const phrases = [['bolt', 'up'], ['back', 'up'], ['backup'], ['iso'], ['cut', 'list'], ['cut', 'lift'], ['heat', 'book'], ['flange']];
  const vocab = new Set(phrases.flat().concat(['i', '12', 'the']));

  test('a word a letter or two off, broken in two, or run together', () => {
    expect(snapPhrases(['bold', 'cup'], phrases, vocab)).toEqual(['bolt', 'up']);
    expect(snapPhrases(['i', 'so'], phrases, vocab)).toEqual(['iso']);
    expect(snapPhrases(['the', 'heat', 'books'], phrases, vocab)).toEqual(['the', 'heat', 'book']);
  });

  test('a run that already is a phrase is left alone, whatever else it is near', () => {
    expect(snapPhrases(['back', 'up'], phrases, vocab)).toEqual(['back', 'up']);
    expect(snapPhrases(['cut', 'list'], phrases, vocab)).toEqual(['cut', 'list']);
  });

  test('numbers are never in a run, and a run as near to two phrases is left as said', () => {
    expect(snapPhrases(['12', 'bolt'], phrases, vocab)).toEqual(['12', 'bolt']);
    expect(snapPhrases(['cut', 'lint'], phrases, vocab)).toEqual(['cut', 'lint']);
    expect(snapPhrases(['hand', 'me', 'the', 'grinder'], phrases, vocab)).toEqual(['hand', 'me', 'the', 'grinder']);
  });
});
