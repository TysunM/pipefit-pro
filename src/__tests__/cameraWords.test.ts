import { cameraWord } from '../voice/cameraWords';
import { localIntent } from '../voice/intent';

describe('"read this box"', () => {
  test('opens the reader from anywhere', () => {
    for (const s of ['read this box', 'scan the label', 'photograph the maker sheet', 'read the box label please', 'scan this sheet'])
      expect(localIntent(s, null)).toEqual({ kind: 'readBox' });
  });

  test('and is not mistaken for the handbook or the fitting library', () => {
    expect(localIntent('read the handbook', null)).not.toEqual({ kind: 'readBox' });
    expect(localIntent('fitting library', null)).toEqual({ kind: 'open', route: 'FittingLibrary' });
    expect(localIntent('read this', null)).not.toEqual({ kind: 'readBox' });
  });
});

describe('words to the camera', () => {
  test('each command, said plainly or politely', () => {
    expect(cameraWord('take it')).toBe('shoot');
    expect(cameraWord('ok take the picture')).toBe('shoot');
    expect(cameraWord('snap')).toBe('shoot');
    expect(cameraWord('again')).toBe('retake');
    expect(cameraWord('try again')).toBe('retake');
    expect(cameraWord('save them')).toBe('save');
    expect(cameraWord('yeah looks good')).toBe('save');
    expect(cameraWord('cancel')).toBe('close');
  });

  test("anything else is ignored — including the phone's own voice", () => {
    expect(cameraWord('6 figures read, 4 ticked. Check them against the paper.')).toBeNull();
    expect(cameraWord('4 takeouts kept.')).toBeNull();
    expect(cameraWord('Camera up.')).toBeNull();
    expect(cameraWord('take it to the truck')).toBeNull();
    expect(cameraWord('')).toBeNull();
  });
});
