import { lengthAt, normalise, numberAt, tokens } from '../voice/words';
import { LISTEN_FOR, TOOL_WORDS, localIntent, readFigures, spokenValue } from '../voice/intent';
import { TOOLS } from '../navigation/groups';

const num = (s: string) => numberAt(tokens(s), 0)?.value;
const len = (s: string) => lengthAt(tokens(s), 0)?.inches;

describe('numbers as a recogniser writes them', () => {
  test('digits, decimals and fractions', () => {
    expect(num('12')).toBe(12);
    expect(num('12.5')).toBe(12.5);
    expect(num('12 1/2')).toBe(12.5);
    expect(num('12-1/2')).toBe(12.5);
    expect(num('3/8')).toBe(0.375);
  });

  test('words, and the parts said after them', () => {
    expect(num('twelve')).toBe(12);
    expect(num('twenty four')).toBe(24);
    expect(num('one hundred and twenty')).toBe(120);
    expect(num('12 and a half')).toBe(12.5);
    expect(num('six and three eighths')).toBe(6.375);
    expect(num('6 and 3/8')).toBe(6.375);
    expect(num('three quarters')).toBe(0.75);
    expect(num('a half')).toBe(0.5);
    expect(num('2 point 5')).toBe(2.5);
  });

  test('nothing that is not a number', () => {
    expect(numberAt(tokens('rise'), 0)).toBeNull();
    expect(numberAt([], 0)).toBeNull();
  });
});

describe('lengths, in inches', () => {
  test('feet and inches', () => {
    expect(len('3 foot 6')).toBe(42);
    expect(len("3' 6\"")).toBe(42);
    expect(len('4 feet')).toBe(48);
    expect(len('3 feet 6 and a half inches')).toBe(42.5);
    expect(len('30 inches')).toBe(30);
  });

  test('metric, with the unit said', () => {
    expect(len('350 millimetres')).toBeCloseTo(350 / 25.4, 9);
    expect(len('35 cm')).toBeCloseTo(35 / 2.54, 9);
    expect(lengthAt(tokens('2 meters'), 0)!.explicit).toBe(true);
    expect(lengthAt(tokens('42'), 0)!.explicit).toBe(false);
  });

  test('normalising keeps what matters', () => {
    expect(normalise('Open the Flange Bolt-Up, please!')).toBe('open the flange bolt up please');
  });
});

describe('a tool by name opens on the phone', () => {
  test('every tool has a name to call it by', () => {
    for (const t of TOOLS) expect(TOOL_WORDS[t.route].length).toBeGreaterThan(0);
  });

  test('plain names and the words round them', () => {
    expect(localIntent('bolt up', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp' });
    expect(localIntent('Open the flange bolt-up please', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp' });
    expect(localIntent('bring up the hydro test', null)).toEqual({ kind: 'open', route: 'PressureTests' });
    expect(localIntent('shift report', null)).toEqual({ kind: 'open', route: 'ShiftReport' });
    expect(localIntent('go to the level', null)).toEqual({ kind: 'open', route: 'Level' });
  });

  test('the longest name wins', () => {
    expect(localIntent('heat book', null)).toEqual({ kind: 'open', route: 'Heats' });
    expect(localIntent('handbook', null)).toEqual({ kind: 'open', route: 'Reference' });
    expect(localIntent('rolling offset', null)).toEqual({ kind: 'open', route: 'RollingOffset' });
    expect(localIntent('simple offset', null)).toEqual({ kind: 'open', route: 'SimpleOffset' });
  });

  const bare = (n: number) => ({ n, inches: false });
  const inch = (n: number) => ({ n, inches: true });

  test('a rolling offset takes its figures', () => {
    expect(localIntent('rolling offset rise 12 roll 8 and a half run 30', null)).toEqual({
      kind: 'open',
      route: 'RollingOffset',
      figures: { rise: bare(12), roll: bare(8.5), run: bare(30) },
    });
    expect(localIntent('rolling offset with a 2 foot rise', null)).toEqual({ kind: 'open', route: 'RollingOffset', figures: { rise: inch(24) } });
  });

  test('every bend and offset tool takes its figures', () => {
    expect(localIntent('simple offset 14 and a half at 22 and a half degrees', null)).toEqual({
      kind: 'open',
      route: 'SimpleOffset',
      figures: { offset: bare(14.5), angle: bare(22.5) },
    });
    expect(localIntent('cut length 4 foot 2', null)).toEqual({ kind: 'open', route: 'CutLength', figures: { c2c: inch(50) } });
    expect(localIntent('saddle 4 inch depth 30 to obstruction', null)).toEqual({
      kind: 'open',
      route: 'SaddleBend',
      figures: { depth: inch(4), distance: bare(30) },
    });
    expect(localIntent('miter 90 degrees 4 segments', null)).toEqual({ kind: 'open', route: 'MiterBend', figures: { angle: bare(90), segments: bare(4) } });
    expect(localIntent('pipe bend 90 degrees leg a 30 leg b 2 foot 6', null)).toEqual({
      kind: 'open',
      route: 'HandBender',
      figures: { angle: bare(90), legA: bare(30), legB: inch(30) },
    });
  });

  test('with a tool open, its figures alone fill it', () => {
    expect(localIntent('rise 12', 'RollingOffset')).toEqual({ kind: 'open', route: 'RollingOffset', figures: { rise: bare(12) } });
    expect(localIntent('set the run to 3 foot', 'RollingOffset')).toEqual({ kind: 'open', route: 'RollingOffset', figures: { run: inch(36) } });
    // On the saddle, "bend 45" is the saddle's angle, not the pipe bend tool.
    expect(localIntent('bend 45', 'SaddleBend')).toEqual({ kind: 'open', route: 'SaddleBend', figures: { angle: bare(45) } });
    // A bare number fills the first field.
    expect(localIntent('42 and 3/8', 'CutLength')).toEqual({ kind: 'open', route: 'CutLength', figures: { c2c: bare(42.375) } });
    // Another tool by name still opens it.
    expect(localIntent('rolling offset', 'SimpleOffset')).toEqual({ kind: 'open', route: 'RollingOffset' });
  });

  test('the bolt-up takes its bolt count, every one from 4 to 68', () => {
    for (let n = 4; n <= 68; n += 4) {
      expect(localIntent(`flange bolt up, ${n} bolt`, null)).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { bolts: bare(n) } });
    }
    expect(localIntent('flange bolt up twelve bolts', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { bolts: bare(12) } });
    expect(localIntent('sixty eight bolt flange', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { bolts: bare(68) } });
    expect(localIntent('12-bolt pattern', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { bolts: bare(12) } });
    expect(localIntent('bolt up 16', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { bolts: bare(16) } });
  });

  test('or its size and class, for the handbook flange', () => {
    expect(localIntent('6 inch flange class 250', null)).toEqual({
      kind: 'open',
      route: 'FlangeBoltUp',
      figures: { size: inch(6), cls: bare(250) },
    });
    expect(localIntent('bolt up 2 and a half inch', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { size: inch(2.5) } });
  });

  test('a bolt count no flange has goes to Claude, not into the pattern', () => {
    expect(localIntent('flange 10 bolts', null)).toBeNull();
    expect(localIntent('flange 72 bolts', null)).toBeNull();
    expect(localIntent('flange class 150', null)).toBeNull();
  });

  test('on the bolt-up, a count alone changes it, and done is still a bolt', () => {
    expect(localIntent('20 bolts', 'FlangeBoltUp')).toEqual({ kind: 'open', route: 'FlangeBoltUp', figures: { bolts: bare(20) } });
    expect(localIntent('done', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'done' });
  });

  test('a figure no field could hold is not taken', () => {
    expect(readFigures(tokens('miter 400 degrees'), 'MiterBend')).toBeNull();
    expect(localIntent('miter 3.5 segments', null)).toBeNull();
  });

  test('anything more than a name goes to Claude', () => {
    expect(localIntent('weld 14 rejected for porosity', null)).toBeNull();
    expect(localIntent("what's the takeout on a 2 inch 90", null)).toBeNull();
    expect(localIntent('add a safety note to the shift report', null)).toBeNull();
    expect(localIntent('hydro passed at 225', null)).toBeNull();
    expect(localIntent('', null)).toBeNull();
    expect(localIntent('the weather', null)).toBeNull();
  });
});

describe('the bolt-up, hands free', () => {
  test('done, undo and repeat, only on that screen', () => {
    expect(localIntent('done', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'done' });
    expect(localIntent('next', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'done' });
    expect(localIntent('got it', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'done' });
    expect(localIntent('undo', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'undo' });
    expect(localIntent('go back', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'undo' });
    expect(localIntent('say again', 'FlangeBoltUp')).toEqual({ kind: 'bolt', act: 'repeat' });
    expect(localIntent('done', 'Level')).toBeNull();
    expect(localIntent('go back', 'Level')).toEqual({ kind: 'back' });
  });

  test('a stop is a stop everywhere', () => {
    expect(localIntent('cancel', 'FlangeBoltUp')).toEqual({ kind: 'cancel' });
    expect(localIntent('never mind', null)).toEqual({ kind: 'cancel' });
  });
});

describe('one field, by its mic', () => {
  test('the first value of the right kind', () => {
    expect(spokenValue('3 foot 6 and a quarter', 'length')).toEqual({ n: 42.25, inches: true });
    expect(spokenValue('make it twelve and a half', 'length')).toEqual({ n: 12.5, inches: false });
    expect(spokenValue('22 and a half degrees', 'angle')).toEqual({ n: 22.5, inches: false });
    expect(spokenValue('no idea', 'length')).toBeNull();
    expect(spokenValue('500 degrees', 'angle')).toBeNull();
  });
});

test('the recogniser is told the tool names', () => {
  expect(LISTEN_FOR).toContain('rolling offset');
  expect(new Set(LISTEN_FOR).size).toBe(LISTEN_FOR.length);
});
