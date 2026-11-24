import { displayText, initialState, press, pressMany, type CalcState } from '../calc/engine';
import { DEFAULT_TAKEOFF_OPTIONS, elbowTakeout, endTakeout } from '../calc/takeoffCatalog';
import { backArc, findSize, throatArc } from '../calc/pipe';
import { elbowAnswer, memorySteps, readElbow, readMemory, readShow, readTrade, readTriangle, registerKey, triangleSteps, unknowns } from '../voice/tradeSpeech';

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

/** Said to the trade calculator: the two figures held, then the asked one solved by the engine's own triangle. */
function solve(said: string): { s: CalcState; asked: string } {
  const t = readTriangle(said);
  if (!t) throw new Error(`not a triangle: ${said}`);
  const first = unknowns(t)[0]!;
  const s = press(pressMany(initialState(), triangleSteps(t)), registerKey(first));
  return { s, asked: first };
}

describe('the triangle, said', () => {
  test('offset and run said, travel asked: the engine solves it', () => {
    const { s, asked } = solve('offset 15 run 15 what\'s the travel');
    expect(asked).toBe('travel');
    near(s.tri.travel!, 21.2132034);
  });
  test('the same, said every way a fitter says it', () => {
    for (const said of ['offset 3 run 4 travel', 'offset of 3, run of 4, travel?', '3 inch offset 4 inch run find the travel', 'what is the travel for an offset of 3 and a run of 4'])
      near(solve(said).s.tri.travel!, 5, 1e-12);
  });
  test('an angle in degrees, named or not', () => {
    near(solve('travel for a 12 inch offset at 45 degrees').s.tri.travel!, 12 * Math.SQRT2);
    near(solve('angle 30 offset 10 run').s.tri.run!, 10 / Math.tan(Math.PI / 6));
    expect(solve('offset 15 run 15 angle').s.tri.angle).toBeCloseTo(45, 9);
  });
  test('feet and inches go in as lengths', () => {
    near(solve('offset 2 foot run 2 foot travel').s.tri.travel!, 24 * Math.SQRT2);
    near(solve('offset 1 foot 6 and a half run 18.5 travel').s.tri.travel!, 18.5 * Math.SQRT2);
  });
  test('a second triangle is solved fresh, not read back from the last one', () => {
    const first = solve('offset 12 run 30 travel').s;
    const t = readTriangle('travel for a 12 inch offset at 45 degrees')!;
    const second = press(pressMany(first, triangleSteps(t)), registerKey(unknowns(t)[0]!));
    near(second.tri.travel!, 12 * Math.SQRT2);
  });
  test('nothing asked: the others are worked, travel first', () => {
    const t = readTriangle('offset 12 run 30')!;
    expect(t.ask).toBeNull();
    expect(unknowns(t)).toEqual(['travel', 'angle']);
  });
  test('not the triangle: one figure, three, a length for an angle, or a word it does not know', () => {
    expect(readTriangle('offset 12')).toBeNull();
    expect(readTriangle('offset 12 run 30 travel 32 angle')).toBeNull();
    expect(readTriangle('angle 3 foot run 12 travel')).toBeNull();
    expect(readTriangle('rolling offset rise 12 roll 8')).toBeNull();
    expect(readTriangle('12 plus 30')).toBeNull();
  });
});

describe('memory and the readout', () => {
  test('store and recall a register, by the engine\'s own keys', () => {
    const answer = pressMany(initialState(), [['digit', '4'], ['digit', '2'], ['inch']]);
    const stored = pressMany(press(answer, 'equals'), memorySteps(readMemory('store that in 3')!));
    expect(stored.registers['3']?.value).toBeDefined();
    const recalled = pressMany({ ...initialState(), registers: stored.registers }, memorySteps(readMemory('recall 3')!));
    expect(displayText(recalled)).toBe('42"');
  });
  test('the other memory keys', () => {
    expect(readMemory('memory plus')).toEqual({ kind: 'memory', op: 'plus' });
    expect(readMemory('add it to memory')).toEqual({ kind: 'memory', op: 'plus' });
    expect(readMemory('recall memory')).toEqual({ kind: 'memory', op: 'recallMemory' });
    expect(readMemory('clear memory')).toEqual({ kind: 'memory', op: 'clear' });
    expect(readMemory('recall register three')).toEqual({ kind: 'memory', op: 'recall', register: '3' });
    expect(readMemory('store 12')).toBeNull();
  });
  test('the readout in another unit', () => {
    expect(readShow('in feet')).toEqual({ kind: 'show', unit: 'feet' });
    expect(readShow('show it in millimetres')).toEqual({ kind: 'show', unit: 'mm' });
    expect(readShow('convert that to inches')).toEqual({ kind: 'show', unit: 'inch' });
    expect(readShow('in feet and inches')).toEqual({ kind: 'show', unit: 'feet' });
    expect(readShow('feet')).toBeNull();
  });
});

describe('elbows', () => {
  type Opts = Parameters<typeof elbowAnswer>[1];
  const o: Opts = { radius: 'LR', jobFamily: 'welded', den: 16, system: 'imperial' };
  const ask = (said: string, over: Partial<Opts> = {}) => {
    const e = readElbow(said);
    if (!e) throw new Error(`not an elbow: ${said}`);
    return elbowAnswer(e, { ...o, ...over });
  };

  test('a butt weld takeout: the handbook at 90 and 45, the same figure Cut Length uses', () => {
    const a = ask("what's the takeout on a 6 inch 90");
    expect(a.ok && a.takeout).toBe(elbowTakeout(6, 'LR', 90).value);
    expect(a.reply).toBe('6" LR 90° butt weld elbow: takeout 9" (handbook 2-42).');
    const b = ask('takeout 6 inch 45');
    expect(b.ok && b.takeout).toBe(3.75);
    expect(b.say).toBe('6 inch long radius 45: takeout 3 and three-quarters inches.');
    const sr = ask('6 inch short radius 90 takeout');
    expect(sr.ok && sr.takeout).toBe(6);
  });
  test('an odd angle is the bend figure, said to be so', () => {
    const a = ask('takeout on a 6 inch elbow at 30 degrees');
    expect(a.ok && a.takeout).toBeCloseTo(9 * Math.tan(Math.PI / 12), 12);
    expect(a.reply).toMatch(/from the bend radius/);
  });
  test('screwed, flanged with its class, solder and street: the catalogue\'s own figures', () => {
    const s = ask('screwed 2 inch 90 takeout');
    expect(s.ok && s.takeout).toBe(endTakeout('screwed90', 2, DEFAULT_TAKEOFF_OPTIONS));
    const f = ask('flanged class 300 4 inch 90 takeout');
    expect(f.ok && f.takeout).toBe(endTakeout('flanged90', 4, { ...DEFAULT_TAKEOFF_OPTIONS, flangeClass: '300' }));
    expect(f.reply).toMatch(/class 300 flanged/);
    expect(ask('threaded 2 inch 30 takeout').ok).toBe(false);
  });
  test('the job\'s joint when none is said; plastic is the fitting library\'s', () => {
    const g = ask('2 inch 90 takeout', { jobFamily: 'screwed' });
    expect(g.ok && g.takeout).toBe(endTakeout('screwed90', 2, DEFAULT_TAKEOFF_OPTIONS));
    const p = ask('2 inch 90 takeout', { jobFamily: 'library' });
    expect(p.ok).toBe(false);
    expect(p.reply).toMatch(/fitting library/);
  });
  test('cutting an elbow to an angle: heel and throat marks and the takeout of what is left', () => {
    const a = ask('cut a 6 inch 90 to 30 degrees');
    const od = findSize(6).od;
    expect(a.ok && a.takeout).toBeCloseTo(9 * Math.tan(Math.PI / 12), 12);
    expect(a.reply).toContain(`heel at ${'6-7/16"'}`);
    near(backArc(6, 'LR', 30, od), 6.4462, 1e-3);
    near(throatArc(6, 'LR', 30, od), 2.9779, 1e-3);
    expect(a.reply).toContain('throat at 3"');
    expect(readElbow('cutback 6 inch 30')).toMatchObject({ cut: true, angle: 30, from: 90 });
    expect(readElbow('cut a 6 inch 45 to 22 and a half')).toMatchObject({ cut: true, angle: 22.5, from: 45 });
    expect(readElbow('cut a 6 inch 90 to 120')).toBeNull();
  });
  test('metric reads in millimetres', () => {
    const a = ask('takeout on a 6 inch 90', { system: 'metric' });
    expect(a.reply).toContain('229 mm');
  });
  test('not an elbow', () => {
    for (const s of ['takeout', 'cut length', '7 inch 90 takeout', 'takeout on a 6 inch 90 and a beer']) expect(readElbow(s)).toBeNull();
  });
});

describe('which reads first', () => {
  test('an elbow before a triangle, memory before a sum', () => {
    expect(readTrade('takeout on a 6 inch 45')?.kind).toBe('elbow');
    expect(readTrade('store that in 2')?.kind).toBe('memory');
    expect(readTrade('offset 12 run 30 travel')?.kind).toBe('triangle');
    expect(readTrade('12 plus 30')).toBeNull();
  });
});
