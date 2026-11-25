import { displayLabel, displayText, initialState, press, pressMany, type CalcState } from '../calc/engine';
import { ALL_KEYS, type KeyAction } from '../calc/keys';
import { elbowTakeout } from '../calc/takeoffCatalog';
import { backArc, centerlineArc, throatArc } from '../calc/pipe';
import { solveRolling } from '../calc/rolling';
import { DEFAULT_PIPE } from '../calc/pipeKeys';

type Step = [KeyAction, string?];
const near = (a: number | undefined, b: number, tol = 1e-6) => expect(Math.abs((a ?? NaN) - b)).toBeLessThan(tol);
/** Keys a figure as it would be typed: "12", "1/8", "2.5". */
const key = (fig: string): Step[] => [...fig].map((c): Step => (c === '/' ? ['slash'] : c === '.' ? ['dot'] : ['digit', c]));
const run = (steps: Step[], from: CalcState = initialState()) => pressMany(from, steps);
const value = (s: CalcState) => s.acc?.value;
const at6 = initialState(16, 'in', { ...DEFAULT_PIPE, nps: 6 });

describe('every key on the pad does something', () => {
  const actions = new Set<KeyAction>();
  for (const k of ALL_KEYS) {
    actions.add(k.action);
    if (k.shiftAction) actions.add(k.shiftAction);
  }
  test.each([...actions].filter((a) => a !== 'conv'))('%s', (a) => {
    const before = run([...key('5'), ['memoryPlus'], ...key('2'), ['offset'], ...key('45'), ['angleSlope'], ['equals'], ...key('3')]);
    const after = press(before, a, a === 'digit' ? '1' : undefined);
    expect(after).not.toEqual({ ...before, shift: false });
  });
});

describe('Pipe Size and Pipe', () => {
  test('a size keyed sets the pipe; nothing keyed reads it back', () => {
    const s = run([...key('6'), ['pipeSize']]);
    expect(s.pipe.nps).toBe(6);
    expect(displayText(s)).toBe('6"');
    expect(displayLabel(s)).toBe('PIPE SIZE · SCH 40');
    expect(displayText(press(initialState(), 'pipeSize'))).toBe('2"');
  });
  test('a size that is not made is refused and the pipe is left as it was', () => {
    const s = run([...key('7'), ['pipeSize']]);
    expect(s.error).toMatch(/No 7" CS/);
    expect(s.pipe.nps).toBe(2);
  });
  test('Pipe steps through the table figures of 2 inch schedule 40 steel', () => {
    const shown: string[] = [];
    let s = initialState();
    for (let i = 0; i < 7; i++) {
      s = press(s, 'pipe');
      shown.push(`${displayLabel(s).split(' · ')[0]} ${displayText(s)}`);
    }
    expect(shown).toEqual(['OD 2.375"', 'ID 2.067"', 'WALL 0.154"', 'LB/FT 3.653', 'LB/FT FULL 5.108', 'GAL/FT 0.1743', 'OD 2.375"']);
    expect(displayLabel(press(initialState(), 'pipe'))).toBe('OD · 2" SCH 40 CS');
  });
  test('the OD shown can be worked with: OD then Circle is the wrap', () => {
    const s = run([['pipe'], ['circle'], ['circle']]);
    near(value(s), Math.PI * 2.375);
    expect(displayLabel(s)).toMatch(/^CIRCUMFERENCE/);
  });
});

describe("Pipe Mat'l and Elbow", () => {
  test('the material, and the next at each press after the first', () => {
    const one = press(initialState(), 'pipeMaterial');
    expect(displayText(one)).toBe('Carbon steel');
    const two = press(one, 'pipeMaterial');
    expect(displayText(two)).toBe('Galvanized steel');
    expect(two.pipe.material).toBe('galv');
  });
  test('a wall keyed by its number', () => {
    expect(run([...key('80'), ['pipeMaterial']]).pipe.wall).toBe('80');
    const ss = initialState(16, 'in', { ...DEFAULT_PIPE, material: 'ss316l', wall: '10S' });
    expect(run([...key('40'), ['pipeMaterial']], ss).pipe.wall).toBe('40S');
    expect(run([...key('33'), ['pipeMaterial']]).error).toMatch(/comes in SCH/);
  });
  test('Elbow shows the radius and changes it on the next press', () => {
    const one = press(initialState(), 'elbow');
    expect(displayText(one)).toBe('Long radius');
    expect(one.pipe.radius).toBe('LR');
    const two = press(one, 'elbow');
    expect(displayText(two)).toBe('Short radius');
    expect(two.pipe.radius).toBe('SR');
  });
  test('galvanised elbows are screwed, and only at 90 and 45', () => {
    const galv = initialState(16, 'in', { ...DEFAULT_PIPE, material: 'galv' });
    expect(displayText(press(galv, 'elbow'))).toBe('Screwed');
    expect(run([...key('30'), ['takeoutArc']], galv).error).toMatch(/90 and 45 only/);
    const pvc = initialState(16, 'in', { ...DEFAULT_PIPE, material: 'pvc' });
    expect(press(pvc, 'takeoutArc').error).toMatch(/fitting library/);
  });
});

describe('T.O./Arc', () => {
  test('a 6 inch long radius 90: the handbook take-out, then the throat, centre and heel', () => {
    const steps: string[] = [];
    let s = at6;
    for (let i = 0; i < 5; i++) {
      s = press(s, 'takeoutArc');
      steps.push(displayLabel(s).split(' · ')[0]!);
      if (i === 0) near(value(s), 9);
      if (i === 1) near(value(s), throatArc(6, 'LR', 90, 6.625));
      if (i === 2) near(value(s), centerlineArc(6, 'LR', 90));
      if (i === 3) near(value(s), backArc(6, 'LR', 90, 6.625));
    }
    expect(steps).toEqual(['T.O.', 'ARC IN', 'ARC CTR', 'ARC OUT', 'T.O.']);
    expect(displayLabel(s)).toBe('T.O. · 6" LR 90°');
  });
  test('an angle keyed, or the triangle\'s', () => {
    near(value(run([...key('45'), ['takeoutArc']])), elbowTakeout(2, 'LR', 45).value);
    near(value(run([...key('45'), ['takeoutArc']])), 1.375);
    const tri = run([...key('12'), ['offset'], ...key('30'), ['angleSlope'], ['takeoutArc']]);
    near(value(tri), elbowTakeout(2, 'LR', 30).value);
    expect(displayLabel(tri)).toBe('T.O. · 2" LR 30°');
  });
  test('Conv on its own leaves the readout as it is', () => {
    const s = press(press(at6, 'takeoutArc'), 'conv');
    expect(displayLabel(s)).toBe('T.O. · 6" LR 90°');
    expect(s.shift).toBe(true);
  });
});

describe("Travel again: the cut, and Welder's Gap", () => {
  test('a 12 inch offset in 2 inch 45s: travel, then the pipe between the elbows', () => {
    const t = run([...key('12'), ['offset'], ...key('45'), ['angleSlope'], ['travel']]);
    near(value(t), 12 * Math.SQRT2);
    const cut = press(t, 'travel');
    near(value(cut), 12 * Math.SQRT2 - 2 * 1.375 - 2 * DEFAULT_PIPE.gap);
    expect(displayLabel(cut)).toBe('CUT · 2" LR 45°');
    near(value(press(cut, 'travel')), 12 * Math.SQRT2);
  });
  test("the gap is set by Welder's and taken at both welds", () => {
    const gap = run([...key('1/8'), ['welders']]);
    expect(gap.pipe.gap).toBe(0.125);
    expect(displayText(gap)).toBe('1/8"');
    expect(displayText(press(initialState(), 'welders'))).toBe('3/32"');
    const cut = run([...key('12'), ['offset'], ...key('45'), ['angleSlope'], ['travel'], ['travel']], gap);
    near(value(cut), 12 * Math.SQRT2 - 2 * 1.375 - 0.25);
    expect(run([...key('2'), ['welders']]).error).toMatch(/0 to 1\/2 inch/);
  });
  test('take-outs past the travel are said so', () => {
    expect(run([...key('2'), ['offset'], ...key('45'), ['angleSlope'], ['travel'], ['travel']], at6).error).toMatch(/no pipe between/);
  });
});

describe('Roll: a rolling offset on the triangle', () => {
  const rolling = (more: Step[], from = at6) => run([...key('12'), ['offset'], ...key('8'), ['roll'], ...key('45'), ['angleSlope'], ...more], from);
  test('rise 12, roll 8, at 45: the true offset, travel and run of the rolling offset screen', () => {
    const screen = solveRolling({ rise: 12, roll: 8, useFittingAngle: true, fittingAngle: 45, gap: DEFAULT_PIPE.gap, nps: 6, kind: 'LR', schedule: '40' });
    near(value(rolling([['travel']])), screen.travel);
    near(value(rolling([['run']])), screen.run);
    near(value(rolling([['roll']])), screen.trueOffset);
    expect(displayLabel(rolling([['roll']]))).toBe('TRUE OFFSET');
    near(value(rolling([['roll'], ['roll']])), screen.rollAngle);
    expect(displayLabel(rolling([['offset']]))).toBe('RISE');
    near(value(rolling([['offset']])), 12);
  });
  test('the cut takes the handbook 45 off each end', () => {
    near(value(rolling([['travel'], ['travel']])), Math.hypot(12, 8) * Math.SQRT2 - 2 * 3.75 - 2 * DEFAULT_PIPE.gap);
  });
  test('the reference rolling offset, rise 12 roll 5 run 36', () => {
    const s = run([...key('12'), ['offset'], ...key('5'), ['roll'], ...key('36'), ['run']]);
    const screen = solveRolling({ rise: 12, roll: 5, run: 36, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
    near(value(press(s, 'travel')), screen.travel);
    near(value(press(s, 'angleSlope')), screen.cutAngle);
  });
  test('a travel worked before the roll is worked again with it', () => {
    const simple = run([...key('12'), ['offset'], ...key('45'), ['angleSlope'], ['travel']]);
    near(value(simple), 12 * Math.SQRT2);
    near(value(run([...key('8'), ['roll'], ['travel']], simple)), Math.hypot(12, 8) * Math.SQRT2);
  });
  test('0 Roll lets it go, and a run and travel give the rise back', () => {
    const off = rolling([...key('0'), ['roll'], ['travel']]);
    expect(off.roll).toBeNull();
    near(value(off), 12 * Math.SQRT2);
    const back = run([...key('8'), ['roll'], ...key('30'), ['run'], ...key('40'), ['travel'], ['offset']]);
    near(value(back), Math.sqrt(40 * 40 - 30 * 30 - 64));
  });
  test('Roll with no roll held asks for one', () => {
    expect(press(initialState(), 'roll').error).toMatch(/Key the roll/);
  });
});

describe('Cutback', () => {
  test('pipes at a 6 inch spread turning a 45, and a 90 when no angle is held', () => {
    near(value(run([...key('45'), ['angleSlope'], ...key('6'), ['cutback']])), 6 * Math.tan(Math.PI / 8));
    near(value(run([...key('6'), ['cutback']])), 6);
    expect(press(initialState(), 'cutback').error).toMatch(/spread/);
  });
});

describe('Circle, Flow, Velocity, Pressure, Force and Area', () => {
  test('a 10 inch circle: area, then circumference', () => {
    const a = run([...key('10'), ['circle']]);
    near(value(a), 25 * Math.PI);
    expect(displayText(a)).toBe('78.539816 sq inch');
    expect(displayText(press(a, 'circle'))).toBe('31-7/16"');
  });
  test('10 gpm through 2 inch schedule 40 is just under a foot a second, and back', () => {
    const bore = (Math.PI * 2.067 * 2.067) / 4;
    const v = run([...key('10'), ['flow'], ['velocity']]);
    near(value(v), 10 / ((bore / 144) * 448.8311688), 1e-6);
    expect(value(v)!).toBeCloseTo(0.956, 3);
    near(value(run([...key('10'), ['velocity'], ['flow']])), 10 * (bore / 144) * 448.8311688);
  });
  test('the push on a 2 inch cap at 150 psi; any two of pressure, force and area give the third', () => {
    const bore = (Math.PI * 2.067 * 2.067) / 4;
    const f = run([...key('150'), ['pressure'], ['force']]);
    near(value(f), 150 * bore);
    expect(displayLabel(f)).toBe('FORCE · ON 2" BORE');
    near(value(run([...key('150'), ['pressure'], ...key('12'), ['area'], ['force']])), 1800);
    near(value(run([...key('1800'), ['force'], ...key('12'), ['area'], ['pressure']])), 150);
    near(value(run([...key('1800'), ['force'], ...key('150'), ['pressure'], ['area']])), 12);
  });
});

describe('Prefs and Tape', () => {
  test('Prefs shows the fraction and steps it on', () => {
    const one = press(initialState(), 'prefs');
    expect(displayText(one)).toBe('1/16');
    const two = press(one, 'prefs');
    expect(two.den).toBe(32);
    expect(displayText(two)).toBe('1/32');
  });
  test('Tape reads the answers back, newest first', () => {
    const s = run([['digit', '2'], ['add'], ['digit', '2'], ['equals'], ['digit', '3'], ['add'], ['digit', '3'], ['equals'], ['tape']]);
    expect(displayText(s)).toBe('6');
    expect(displayLabel(s)).toBe('TAPE 1 OF 2');
    expect(displayText(press(s, 'tape'))).toBe('4');
    expect(press(initialState(), 'tape').error).toMatch(/empty/);
  });
  test('Clear All keeps the pipe and lets the roll go', () => {
    const s = run([...key('6'), ['pipeSize'], ...key('8'), ['roll'], ['clearAll']]);
    expect(s.pipe.nps).toBe(6);
    expect(s.roll).toBeNull();
  });
});

describe('% as the keypad sends it', () => {
  test('200 + 10 % is 220, from the key Conv Clear sends', () => {
    const s = run([...key('200'), ['add'], ...key('10'), ['percent'], ['equals']]);
    expect(displayText(s)).toBe('220');
  });
});
