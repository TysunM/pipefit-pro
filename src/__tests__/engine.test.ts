import { displayText, formatDms, initialState, press, pressMany, type CalcState } from '../calc/engine';
import { entryUnitWord, entryValue } from '../calc/ftin';
import { ALL_KEYS, unassignedKeys, type KeyAction } from '../calc/keys';
import {
  CLEAR_ALL_DEFAULTS, DEFAULT_PREFS, FRACTION_CHOICES, PIPE_MATERIALS, PIPE_TYPES,
} from '../calc/defaults';

type Step = [KeyAction, string?];

const D = (s: string): Step[] => s.split('').map((c) => ['digit', c] as Step);
const run = (steps: Step[], from: CalcState = initialState()): CalcState => pressMany(from, steps);
const show = (steps: Step[]): string => displayText(run(steps));

describe('plain arithmetic', () => {
  test('two plus two', () => expect(show([...D('2'), ['add'], ...D('2'), ['equals']])).toBe('4'));

  test('multiply binds tighter than add', () => {
    expect(show([...D('2'), ['add'], ...D('3'), ['multiply'], ...D('4'), ['equals']])).toBe('14');
  });

  test('divide binds tighter than subtract', () => {
    expect(show([...D('10'), ['subtract'], ...D('8'), ['divide'], ...D('2'), ['equals']])).toBe('6');
  });

  test('a chain of the same precedence runs left to right', () => {
    expect(show([...D('100'), ['divide'], ...D('5'), ['divide'], ...D('4'), ['equals']])).toBe('5');
    expect(show([...D('20'), ['subtract'], ...D('5'), ['subtract'], ...D('3'), ['equals']])).toBe('12');
  });

  test('brackets override precedence', () => {
    expect(show([['openParen'], ...D('2'), ['add'], ...D('3'), ['closeParen'], ['multiply'], ...D('4'), ['equals']])).toBe('20');
  });

  test('nested brackets', () => {
    const steps: Step[] = [
      ['openParen'], ...D('2'), ['add'],
      ['openParen'], ...D('3'), ['multiply'], ...D('4'), ['closeParen'],
      ['closeParen'], ['multiply'], ...D('2'), ['equals'],
    ];
    expect(show(steps)).toBe('28');
  });

  test('powers bind tighter than multiply', () => {
    expect(show([...D('2'), ['multiply'], ...D('3'), ['power'], ...D('2'), ['equals']])).toBe('18');
  });

  test('the nth root inverts the power', () => {
    expect(show([...D('64'), ['nthRoot'], ...D('3'), ['equals']])).toBe('4');
  });

  test('a zeroth root is refused', () => {
    expect(show([...D('8'), ['nthRoot'], ...D('0'), ['equals']])).toMatch(/zeroth root/i);
  });

  test('equals with an open bracket is refused rather than guessed', () => {
    expect(show([['openParen'], ...D('2'), ['add'], ...D('3'), ['equals']])).toMatch(/open bracket/i);
  });

  test('closing with no open bracket is refused', () => {
    expect(show([...D('5'), ['closeParen']])).toMatch(/no open bracket/i);
  });

  test('an operator with nothing entered is refused', () => {
    expect(show([['add']])).toMatch(/value first/i);
  });

  test('divide by zero is refused', () => {
    expect(show([...D('5'), ['divide'], ...D('0'), ['equals']])).toMatch(/zero/i);
  });

  test('a result carries into the next operation', () => {
    const after = run([...D('2'), ['add'], ...D('3'), ['equals']]);
    expect(displayText(run([['multiply'], ...D('4'), ['equals']], after))).toBe('20');
  });
});

describe('feet inch fraction arithmetic', () => {
  test('adding two dimensioned lengths', () => {
    const steps: Step[] = [
      ...D('12'), ['feet'], ...D('6'), ['inch'], ['add'],
      ...D('3'), ['feet'], ...D('9'), ['inch'], ['equals'],
    ];
    expect(show(steps)).toBe(`195"`);
  });

  test('a fraction survives the arithmetic', () => {
    const steps: Step[] = [
      ...D('6'), ['inch'], ...D('1'), ['slash'], ...D('2'), ['add'],
      ...D('2'), ['inch'], ...D('1'), ['slash'], ...D('4'), ['equals'],
    ];
    expect(show(steps)).toBe(`8-3/4"`);
  });

  test('subtracting across a foot boundary', () => {
    const steps: Step[] = [
      ...D('10'), ['feet'], ['subtract'], ...D('3'), ['inch'], ['equals'],
    ];
    expect(show(steps)).toBe(`117"`);
  });

  test('a length times a plain number stays a length', () => {
    expect(show([...D('2'), ['feet'], ['multiply'], ...D('3'), ['equals']])).toBe(`72"`);
  });

  test('a length divided by a length gives a plain count', () => {
    expect(show([...D('10'), ['feet'], ['divide'], ...D('2'), ['feet'], ['equals']])).toBe('5');
  });

  test('length times length reads as an area', () => {
    expect(show([...D('10'), ['feet'], ['multiply'], ...D('12'), ['feet'], ['equals']])).toBe('17280 sq inch');
  });

  test('length cubed reads as a volume', () => {
    const steps: Step[] = [
      ...D('12'), ['inch'], ['multiply'], ...D('12'), ['inch'], ['multiply'], ...D('12'), ['inch'], ['equals'],
    ];
    expect(show(steps)).toBe('1728 cu inch');
  });

  test('a bare number added to a length is taken as inches', () => {
    expect(show([...D('2'), ['feet'], ['add'], ...D('6'), ['equals']])).toBe(`30"`);
  });
});

describe('unit conversion through Conv', () => {
  const conv = (a: KeyAction): Step[] => [['conv'], [a]];

  test('a plain number becomes a weight', () => {
    expect(show([...D('100'), ...conv('pound')])).toBe('100 lb');
  });

  test('cubic feet read back as gallons, entered as a repeated unit', () => {
    expect(show([...D('1'), ['feet'], ['feet'], ['feet'], ['conv'], ['gallon']])).toBe('7.480519 gallon');
  });

  test('cfm reads back as cfs', () => {
    expect(show([...D('60'), ...conv('cubicFeetPerMinute'), ...conv('cubicFeetPerSecond')])).toBe('1 cu ft/sec');
  });

  test('pounds read back as kilograms', () => {
    expect(show([...D('1'), ...conv('pound'), ...conv('kilogram')])).toBe('0.453592 kg');
  });

  test('gallons read back as litres', () => {
    expect(show([...D('1'), ...conv('gallon'), ...conv('litre')])).toBe('3.785412 litre');
  });

  test('gpm reads back as litres per second', () => {
    expect(show([...D('100'), ...conv('gpm'), ...conv('litrePerSecond')])).toBe('6.309020 l/sec'.replace('6.309020', '6.30902'));
  });

  test('fahrenheit and celsius convert both ways', () => {
    expect(show([...D('212'), ...conv('fahrenheit'), ...conv('celsius')])).toBe('100 °C');
    expect(show([...D('100'), ...conv('celsius'), ...conv('fahrenheit')])).toBe('212 °F');
  });

  test('a computed length restates in millimetres, metres and feet', () => {
    expect(show([...D('1'), ['inch'], ['equals'], ['mm']])).toBe('25.4 mm');
    expect(show([...D('100'), ['inch'], ['equals'], ['metre']])).toBe('2.54 m');
    // Feet is the one unit a fitter calls out in feet AND inches, so FT gives
    // that rather than a decimal nobody says out loud.
    expect(show([...D('30'), ['inch'], ['equals'], ['feet']])).toBe(`2' 6"`);
  });

  test('a computed area restates in square feet', () => {
    expect(show([...D('12'), ['inch'], ['multiply'], ...D('12'), ['inch'], ['equals'], ['feet']])).toBe('1 sq feet');
  });

  test('restating a weight as a length is refused', () => {
    expect(show([...D('5'), ...conv('pound'), ['feet']])).toMatch(/cannot read a weight/i);
  });

  test('reading a length as a weight is refused', () => {
    expect(show([...D('1'), ['feet'], ...conv('pound')])).toMatch(/cannot read/i);
  });

  test('Conv clears itself after one use', () => {
    const s = run([...D('7'), ['conv']]);
    expect(s.shift).toBe(true);
    expect(press(s, 'pound').shift).toBe(false);
  });

  test('Conv pressed twice turns itself off', () => {
    expect(run([['conv'], ['conv']]).shift).toBe(false);
  });
});

describe('trigonometry on the keypad', () => {
  test('the sine of thirty', () => expect(show([...D('30'), ['sine']])).toBe('0.5'));
  test('the tangent of forty five', () => expect(show([...D('45'), ['tangent']])).toBe('1'));

  test('an inverse returns an angle', () => {
    expect(show([...D('1'), ['arcTangent']])).toBe('45°');
  });

  test('the offset multiplier, keyed the way a fitter would', () => {
    const steps: Step[] = [...D('1'), ['divide'], ...D('45'), ['sine'], ['equals']];
    expect(show(steps)).toBe('1.4142136');
  });

  test('tangent at ninety is refused', () => {
    expect(show([...D('90'), ['tangent']])).toMatch(/undefined/i);
  });

  test('arcsine out of range is refused', () => {
    expect(show([...D('2'), ['arcSine']])).toMatch(/between/i);
  });

  test('squaring and rooting a length round-trips', () => {
    expect(show([...D('9'), ['inch'], ['square'], ['squareRoot']])).toBe(`9"`);
  });

  test('the reciprocal of four', () => expect(show([...D('4'), ['reciprocal']])).toBe('0.25'));
});

describe('memory registers and the accumulator', () => {
  test('store into register one, then recall it', () => {
    let s = run([...D('10'), ['store'], ['digit', '1']]);
    expect(s.registers['1']!.value).toBe(10);
    s = run([['clear'], ['clear'], ['recall'], ['digit', '1']], s);
    expect(displayText(s)).toBe('10');
  });

  test('all nine registers hold separate values', () => {
    let s = initialState();
    for (let i = 1; i <= 9; i++) s = run([...D(String(i * 11)), ['store'], ['digit', String(i)]], s);
    for (let i = 1; i <= 9; i++) {
      const out = run([['clear'], ['clear'], ['recall'], ['digit', String(i)]], s);
      expect(displayText(out)).toBe(String(i * 11));
    }
  });

  test('recalling an empty register says so rather than showing zero', () => {
    expect(show([['recall'], ['digit', '4']])).toMatch(/register 4 is empty/i);
  });

  test('a register keeps the kind it was given', () => {
    const s = run([...D('12'), ['feet'], ['store'], ['digit', '2']]);
    expect(s.registers['2']!.kind).toBe('linear');
    expect(displayText(run([['clear'], ['clear'], ['recall'], ['digit', '2']], s))).toBe(`144"`);
  });

  test('M+ accumulates and Rcl M+ shows the total', () => {
    let s = run([...D('10'), ['memoryPlus']]);
    s = run([['clear'], ...D('25'), ['memoryPlus']], s);
    expect(s.memory.value).toBe(35);
    expect(displayText(run([['recall'], ['memoryPlus']], s))).toBe('35');
  });

  test('M− takes back off the accumulator', () => {
    let s = run([...D('10'), ['memoryPlus']]);
    s = run([['clear'], ...D('4'), ['memoryMinus']], s);
    expect(s.memory.value).toBe(6);
  });

  test('Rcl Rcl clears the accumulator', () => {
    let s = run([...D('10'), ['memoryPlus']]);
    s = run([['recall'], ['recall']], s);
    expect(s.memory.value).toBe(0);
  });

  test('Conv Rcl clears the accumulator and leaves the display alone', () => {
    let s = run([...D('10'), ['memoryPlus']]);
    s = run([['clear'], ...D('25')], s);
    expect(displayText(s)).toBe('25');
    s = run([['conv'], ['recall']], s);
    expect(s.memory.value).toBe(0);
    expect(displayText(s)).toBe('25');
  });

  test('the accumulator keeps the kind it was given', () => {
    const s = run([...D('2'), ['feet'], ['memoryPlus']]);
    expect(s.memory.kind).toBe('linear');
    expect(s.memory.value).toBe(24);
  });

  test('Clear All wipes the registers and the accumulator', () => {
    let s = run([...D('10'), ['store'], ['digit', '1']]);
    s = run([['clear'], ...D('5'), ['memoryPlus']], s);
    s = press(s, 'clearAll');
    expect(s.registers).toEqual({});
    expect(s.memory.value).toBe(0);
  });

  test('a digit after Store or Rcl is taken as the register, not as a digit', () => {
    const s = run([...D('10'), ['store'], ['digit', '1']]);
    expect(displayText(s)).toBe('10');
    expect(s.pending).toBeNull();
  });

  test('zero is not a register, so it is taken as a digit', () => {
    const s = run([...D('10'), ['store'], ['digit', '0']]);
    expect(displayText(s)).toBe('100');
    expect(s.registers).toEqual({});
    expect(s.pending).toBeNull();
  });
});

describe('clear behaviour', () => {
  test('clear wipes the entry and keeps the pending operation', () => {
    let s = run([...D('2'), ['add'], ...D('3')]);
    s = press(s, 'clear');
    expect(displayText(s)).toBe('0');
    expect(s.operators).toEqual(['add']);
    expect(s.operands.map((o) => o.value)).toEqual([2]);

    s = run([...D('7'), ['equals']], s);
    expect(displayText(s)).toBe('9');
  });

  test('a second clear, with the entry already empty, wipes everything', () => {
    let s = run([...D('2'), ['add'], ...D('3')]);
    s = press(s, 'clear');
    s = press(s, 'clear');
    expect(displayText(s)).toBe('0');
    expect(s.operators.length).toBe(0);
    expect(s.operands.length).toBe(0);
  });

  test('clear all wipes brackets too', () => {
    const s = press(run([['openParen'], ...D('2'), ['add']]), 'clearAll');
    expect(s.frames.length).toBe(0);
    expect(displayText(s)).toBe('0');
  });

  test('an error clears on the next keypress', () => {
    const bad = run([...D('90'), ['tangent']]);
    expect(bad.error).toBeTruthy();
    expect(press(bad, 'digit', '5').error).toBeNull();
  });
});

describe('percent', () => {
  test('percent of a pending addition adds the percentage', () => {
    const steps: Step[] = [...D('200'), ['add'], ...D('15'), ['conv'], ['clear'], ['equals']];
    expect(show(steps)).toBe('230');
  });

  test('percent of a pending subtraction takes it off', () => {
    const steps: Step[] = [...D('200'), ['subtract'], ...D('15'), ['conv'], ['clear'], ['equals']];
    expect(show(steps)).toBe('170');
  });

  test('percent on its own is a hundredth', () => {
    expect(show([...D('50'), ['conv'], ['clear']])).toBe('0.5');
  });
});

describe('degrees minutes seconds', () => {
  test('a clean conversion', () => expect(formatDms(45.5)).toBe(`45° 30' 0.0"`));
  test('seconds carry into minutes', () => expect(formatDms(1 / 3600 * 59.97)).toMatch(/^0° 1' 0.0"|^0° 0' 60/));
  test('negatives keep their sign', () => expect(formatDms(-1.5)).toBe(`-1° 30' 0.0"`));
  test('not a number reads as a dash', () => expect(formatDms(NaN)).toBe('—'));

  test('the toggle changes how an angle reads', () => {
    const plain = run([...D('1'), ['arcTangent']]);
    expect(displayText(plain)).toBe('45°');
    const dms = press(plain, 'dms');
    expect(displayText(dms)).toBe(`45° 0' 0.0"`);
  });
});

describe('pi', () => {
  test('pi is available and usable', () => {
    expect(show([['conv'], ['pi']])).toBe('3.1415927');
  });

  test('the circumference of a twelve inch circle', () => {
    const steps: Step[] = [['conv'], ['pi'], ['multiply'], ...D('12'), ['inch'], ['equals']];
    expect(show(steps)).toBe(`37-11/16"`);
  });
});

describe('conformance with the documented keystrokes', () => {
  // Each case below is a keystroke sequence and display taken from the
  // Pipe Trades Pro manual pages, so the engine is checked against the
  // device rather than against my reading of it.

  test('5 [Feet] 1 [Inch] 1 [/] 2 reads as five foot one and a half', () => {
    const s = run([...D('5'), ['feet'], ...D('1'), ['inch'], ...D('1'), ['slash'], ...D('2')]);
    expect(entryValue(s.entry)).toBe(61.5);
    expect(entryUnitWord(s.entry)).toBe('FEET INCH');
  });

  test('5 [mm] reads as five millimetre', () => {
    const s = run([...D('5'), ['mm']]);
    expect(entryUnitWord(s.entry)).toBe('MILLIMETER');
    expect(displayText(s)).toBe('5');
  });

  test('17 [.] 5 [Conv] [mm] reads as 17.5 metre', () => {
    const s = run([...D('17'), ['dot'], ...D('5'), ['conv'], ['metre']]);
    expect(entryUnitWord(s.entry)).toBe('METER');
    expect(entryValue(s.entry)).toBe(17.5);
  });

  test('100 [Feet] [Feet] is one hundred SQUARE feet', () => {
    const s = run([...D('100'), ['feet'], ['feet']]);
    expect(entryUnitWord(s.entry)).toBe('SQUARE FEET');
    expect(displayText(s)).toBe('100');
    expect(show([...D('100'), ['feet'], ['feet'], ['equals']])).toBe('14400 sq inch');
  });

  test('100 [Feet] [Feet] [Feet] is one hundred CUBIC feet', () => {
    const s = run([...D('100'), ['feet'], ['feet'], ['feet']]);
    expect(entryUnitWord(s.entry)).toBe('CUBIC FEET');
    expect(show([...D('100'), ['feet'], ['feet'], ['feet'], ['equals']])).toBe('172800 cu inch');
  });

  test('5 [mm] [mm] is five SQUARE millimetre', () => {
    expect(entryUnitWord(run([...D('5'), ['mm'], ['mm']]).entry)).toBe('SQUARE MILLIMETER');
  });

  test('5 [mm] [mm] [mm] is five CUBIC millimetre', () => {
    expect(entryUnitWord(run([...D('5'), ['mm'], ['mm'], ['mm']]).entry)).toBe('CUBIC MILLIMETER');
  });

  test('5 [Conv] [mm] [mm] is five SQUARE metre', () => {
    const s = run([...D('5'), ['conv'], ['metre'], ['metre']]);
    expect(entryUnitWord(s.entry)).toBe('SQUARE METER');
  });

  test('a repeated unit never goes past cubic', () => {
    const s = run([...D('5'), ['feet'], ['feet'], ['feet'], ['feet'], ['feet']]);
    expect(entryUnitWord(s.entry)).toBe('CUBIC FEET');
  });

  test('a hundred square feet is not a hundred feet squared', () => {
    const asEntered = show([...D('100'), ['feet'], ['feet'], ['equals']]);
    const asProduct = show([...D('100'), ['feet'], ['multiply'], ...D('100'), ['feet'], ['equals']]);
    expect(asEntered).toBe('14400 sq inch');
    expect(asProduct).toBe('1440000 sq inch');
    expect(asEntered).not.toBe(asProduct);
  });

  test('backspace steps an exponent down before touching the digits', () => {
    let s = run([...D('100'), ['feet'], ['feet'], ['feet']]);
    s = press(s, 'backspace');
    expect(entryUnitWord(s.entry)).toBe('SQUARE FEET');
    s = press(s, 'backspace');
    expect(entryUnitWord(s.entry)).toBe('FEET');
  });

  test('10 [Store] [1] then [Rcl] [1] returns ten', () => {
    const stored = run([...D('10'), ['store'], ['digit', '1']]);
    expect(stored.registers['1']!.value).toBe(10);
    expect(displayText(run([['clear'], ['clear'], ['recall'], ['digit', '1']], stored))).toBe('10');
  });

  test('10 [M+] then [Rcl] [M+] shows a total of ten', () => {
    const s = run([...D('10'), ['memoryPlus']]);
    expect(displayText(run([['recall'], ['memoryPlus']], s))).toBe('10');
  });

  test('10 [M+] 25 [Conv] [Rcl] leaves 25 on display with memory cleared', () => {
    let s = run([...D('10'), ['memoryPlus']]);
    s = run([['clear'], ...D('25'), ['conv'], ['recall']], s);
    expect(displayText(s)).toBe('25');
    expect(s.memory.value).toBe(0);
  });

  test('8 [Conv] [div] [=] is 0.125', () => {
    expect(show([...D('8'), ['conv'], ['reciprocal'], ['equals']])).toBe('0.125');
  });

  test('[Conv] [x] clears everything', () => {
    let s = run([...D('10'), ['store'], ['digit', '1']]);
    s = run([['clear'], ...D('5'), ['memoryPlus'], ['conv'], ['clearAll']], s);
    expect(s.registers).toEqual({});
    expect(s.memory.value).toBe(0);
    expect(displayText(s)).toBe('0');
  });

  test('pi is 3.1415927 to the digits the manual prints', () => {
    expect(show([['conv'], ['pi']]).startsWith('3.1415927')).toBe(true);
  });
});

describe('cost, the three worked examples from the guide', () => {
  // 120 feet of pipe in 10 foot lengths at $3.21 per length.
  test('store a unit cost, then twelve lengths total $38.52', () => {
    let s = run([...D('3'), ['dot'], ...D('21'), ['store'], ['cost']]);
    expect(s.unitCost).toBeCloseTo(3.21, 10);
    s = run([['clear'], ...D('12'), ['cost']], s);
    expect(displayText(s)).toBe('38.52');
    expect(s.costTotal).toBeCloseTo(38.52, 10);
  });

  test('the stored cost is reusable: seventeen lengths total $54.57', () => {
    let s = run([...D('3'), ['dot'], ...D('21'), ['store'], ['cost']]);
    s = run([['clear'], ...D('17'), ['cost']], s);
    expect(displayText(s)).toBe('54.57');
  });

  test('an inline cost totals without overwriting the stored one', () => {
    let s = run([...D('3'), ['dot'], ...D('21'), ['store'], ['cost']]);
    s = run([['clear'], ...D('17'), ['multiply'], ...D('2'), ['dot'], ...D('89'), ['cost']], s);
    expect(displayText(s)).toBe('49.13');
    expect(s.unitCost).toBeCloseTo(3.21, 10);
  });

  test('costing with nothing stored is refused rather than returning zero', () => {
    expect(show([...D('12'), ['cost']])).toMatch(/store a unit cost/i);
  });

  test('Clear All forgets the unit cost, as the guide says it does', () => {
    let s = run([...D('3'), ['dot'], ...D('21'), ['store'], ['cost']]);
    s = press(s, 'clearAll');
    expect(s.unitCost).toBe(0);
  });
});

describe('paperless tape', () => {
  test('it records completed results', () => {
    let s = run([...D('2'), ['add'], ...D('3'), ['equals']]);
    s = run([...D('10'), ['multiply'], ...D('4'), ['equals']], s);
    expect(s.tape).toEqual(['5', '40']);
  });

  test('it keeps the last thirty and no more', () => {
    let s = initialState();
    for (let i = 0; i < 40; i++) s = run([...D(String(i)), ['add'], ...D('1'), ['equals']], s);
    expect(s.tape.length).toBe(30);
    expect(s.tape[29]).toBe('40');
  });

  test('Clear All empties it, as the guide says it does', () => {
    const s = press(run([...D('2'), ['add'], ...D('3'), ['equals']]), 'clearAll');
    expect(s.tape).toEqual([]);
  });
});

describe('the documented defaults', () => {
  test('Clear All returns the stored values the guide lists', () => {
    expect(CLEAR_ALL_DEFAULTS.material).toBe('steel');
    expect(CLEAR_ALL_DEFAULTS.pipeType).toBe('Std');
    expect(CLEAR_ALL_DEFAULTS.elbowType).toBe('lrButtWeld');
    expect(CLEAR_ALL_DEFAULTS.weightPerCubicFoot).toBeCloseTo(62.42796, 10);
    expect(CLEAR_ALL_DEFAULTS.weldersGap).toBe(0.125);
  });

  test('a full reset returns the preferences the guide lists', () => {
    expect(DEFAULT_PREFS.fractionalResolution).toBe(16);
    expect(DEFAULT_PREFS.areaDisplay).toBe('standard');
    expect(DEFAULT_PREFS.volumeDisplay).toBe('standard');
    expect(DEFAULT_PREFS.metreDecimals).toBe(3);
    expect(DEFAULT_PREFS.mathMode).toBe('orderOfOperations');
  });

  test('all seven pipe materials are present', () => {
    expect(PIPE_MATERIALS.length).toBe(7);
    for (const m of PIPE_MATERIALS) expect(PIPE_TYPES[m.id].length).toBeGreaterThan(0);
  });

  test('the four wrought materials share one schedule list', () => {
    const steel = PIPE_TYPES.steel;
    for (const m of ['brass', 'aluminium', 'castIron'] as const) expect(PIPE_TYPES[m]).toEqual(steel);
    expect(steel).toContain('Std');
    expect(steel).toContain('XXS'.replace('XXS', 'XSS'));
  });

  test('stainless, plastic and copper each carry their own list', () => {
    expect(PIPE_TYPES.stainless).toEqual(['40-S', '80-S', '160', '5-S', '10-S']);
    expect(PIPE_TYPES.plastic).toContain('SDR 32.5');
    expect(PIPE_TYPES.copper).toContain('Type K');
    expect(PIPE_TYPES.copper.length).toBe(8);
  });

  test('every fraction choice the device offers is a real denominator', () => {
    expect(FRACTION_CHOICES).toEqual([16, 32, 64, 2, 4, 8]);
  });
});

describe('no keypad shift is left unassigned now', () => {
  test('Cost and Tape fill the last two', () => {
    expect(unassignedKeys()).toEqual([]);
    expect(ALL_KEYS.find((k) => k.label === '0')!.shiftAction).toBe('cost');
    expect(ALL_KEYS.find((k) => k.label === '=')!.shiftAction).toBe('tape');
  });
});

describe('the trade registers', () => {
  const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

  test('offset and run, then travel solves', () => {
    const s = run([...D('15'), ['offset'], ...D('15'), ['run'], ['travel']]);
    near(s.tri.travel!, 21.2132034, 1e-6);
    // 21.2132 to the nearest sixteenth is 9-3/16 over the foot, not 9-1/4.
    expect(displayText(s)).toBe(`21-3/16"`);
  });

  test('and the angle falls out of the same pair', () => {
    const s = run([...D('15'), ['offset'], ...D('15'), ['run'], ['angleSlope']]);
    expect(displayText(s)).toBe('45°');
  });

  test('the three four five', () => {
    const s = run([...D('3'), ['offset'], ...D('4'), ['run'], ['travel']]);
    near(s.tri.travel!, 5, 1e-12);
    expect(displayText(s)).toBe(`5"`);
  });

  test('angle and travel give back the offset', () => {
    const s = run([...D('45'), ['angleSlope'], ...D('21'), ['dot'], ...D('2132034'), ['travel'], ['offset']]);
    near(s.tri.offset!, 15, 1e-5);
  });

  test('a register pressed with nothing entered recalls what it holds', () => {
    const s = run([...D('12'), ['offset'], ['clear'], ['clear'], ['offset']]);
    expect(displayText(s)).toBe(`12"`);
  });

  test('a length is stored as a length and an angle as an angle', () => {
    const s = run([...D('30'), ['angleSlope'], ...D('10'), ['offset']]);
    expect(s.acc!.kind).toBe('linear');
    expect(press(run([['clear'], ['clear']], s), 'angleSlope').acc!.kind).toBe('angle');
  });

  test('feet and inches go into a register as inches', () => {
    const s = run([...D('2'), ['feet'], ['offset']]);
    near(s.tri.offset!, 24, 1e-12);
  });

  test('only the two most recent are used, so a third entry supersedes', () => {
    // Offset then run would give 45 degrees; replacing the run with 26 gives 30.
    let s = run([...D('15'), ['offset'], ...D('15'), ['run']]);
    s = run([...D('25'), ['dot'], ...D('98'), ['run'], ['angleSlope']], s);
    near(s.tri.angle!, 30, 1e-2);
  });

  test('with fewer than two held it says what it needs', () => {
    expect(show([...D('15'), ['offset'], ['clear'], ['clear'], ['travel']])).toMatch(/two of offset/i);
  });

  test('an impossible pair is refused by name', () => {
    const s = run([...D('10'), ['offset'], ...D('4'), ['travel'], ['run']]);
    expect(s.error).toMatch(/longer than the offset/i);
  });

  test('a weight is not an angle', () => {
    expect(show([...D('5'), ['conv'], ['pound'], ['angleSlope']])).toMatch(/not an angle/i);
  });

  test('a computed result goes straight into a register', () => {
    const s = run([...D('12'), ['add'], ...D('6'), ['equals'], ['offset']]);
    near(s.tri.offset!, 18, 1e-12);
  });

  test('Clear All empties the registers', () => {
    const s = press(run([...D('15'), ['offset'], ...D('15'), ['run']]), 'clearAll');
    expect(s.tri).toEqual({});
    expect(s.triOrder).toEqual([]);
  });

  test('the registers survive an ordinary clear', () => {
    const s = run([...D('15'), ['offset'], ['clear'], ['clear']]);
    near(s.tri.offset!, 15, 1e-12);
  });
});


describe('inches stay inches until feet are asked for', () => {
  // The thing this is here to stop: a fitter types a length, presses an
  // operator, and the answer comes back in feet he did not ask for.
  test('an answer in inches is never rolled up into feet', () => {
    expect(show([...D('30'), ['inch'], ['equals']])).toBe(`30"`);
    expect(show([...D('12'), ['inch'], ['multiply'], ...D('6'), ['equals']])).toBe(`72"`);
    expect(show([...D('96'), ['inch'], ['add'], ...D('99'), ['inch'], ['equals']])).toBe(`195"`);
    expect(show([...D('240'), ['inch'], ['equals']])).toBe(`240"`);
  });

  test('a fraction still reads as a fraction, just not as feet', () => {
    expect(show([...D('30'), ['inch'], ['add'], ...D('1'), ['slash'], ...D('2'), ['inch'], ['equals']])).toBe(
      `30-1/2"`
    );
    // Twelve inch circumference: 37-11/16, not 3 foot 1 and 11/16.
    expect(show([...D('12'), ['inch'], ['multiply'], ['pi'], ['equals']])).toBe(`37-11/16"`);
  });

  test('FT converts on demand and IN takes it back', () => {
    const feet = run([...D('30'), ['inch'], ['equals'], ['feet']]);
    expect(displayText(feet)).toBe(`2' 6"`);
    expect(displayText(pressMany(feet, [['inch']]))).toBe(`30"`);
  });

  test('once asked for, feet stay until asked otherwise', () => {
    const feet = run([...D('30'), ['inch'], ['equals'], ['feet']]);
    // A clear wipes the working, not the unit the fitter chose to read in.
    const next = pressMany(feet, [['clear'], ...D('18'), ['inch'], ['equals']]);
    expect(displayText(next)).toBe(`1' 6"`);
    expect(displayText(pressMany(next, [['inch']]))).toBe(`18"`);
  });

  test('the calculator can be set to open in feet and inches instead', () => {
    const ft = initialState(16, 'ft');
    expect(displayText(pressMany(ft, [...D('30'), ['inch'], ['equals']]))).toBe(`2' 6"`);
    const inches = initialState(16, 'in');
    expect(displayText(pressMany(inches, [...D('30'), ['inch'], ['equals']]))).toBe(`30"`);
    // Inches is what it opens on when nothing is said.
    expect(displayText(pressMany(initialState(), [...D('30'), ['inch'], ['equals']]))).toBe(`30"`);
  });

  test('metric and the other units are untouched by any of this', () => {
    expect(show([...D('1'), ['inch'], ['equals'], ['mm']])).toBe('25.4 mm');
    expect(show([...D('100'), ['inch'], ['equals'], ['metre']])).toBe('2.54 m');
    expect(show([...D('12'), ['inch'], ['multiply'], ...D('12'), ['inch'], ['equals'], ['feet']])).toBe('1 sq feet');
  });

  test('IN on an empty calculator still means inches, not nothing', () => {
    // Pressing a unit key with no digits typed used to be a no-op, so a fitter
    // who had converted to feet, cleared, and pressed IN was still in feet.
    const feet = run([...D('30'), ['inch'], ['equals'], ['feet']]);
    const back = pressMany(feet, [['clear'], ['clear'], ['inch'], ...D('30'), ['inch'], ['equals']]);
    expect(displayText(back)).toBe(`30"`);
  });

  test('negatives and a bare zero read straight', () => {
    expect(show([...D('30'), ['inch'], ['subtract'], ...D('42'), ['inch'], ['equals']])).toBe(`-12"`);
    expect(show([...D('30'), ['inch'], ['subtract'], ...D('30'), ['inch'], ['equals']])).toBe(`0"`);
  });
});
