import { evaluate, parseFormula, workOut } from '../calc/orbitalFormula';
import { BUILT_IN, equationProblem, equationSet, inputsFor, newEquation, solveAll, tidyEquation, validEquation, type Equation } from '../calc/orbitalEquations';

const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);
const val = (src: string, values: Record<string, number> = {}) => {
  const r = workOut(src, values);
  if (!r.ok) throw new Error(r.why);
  return r.value;
};

describe('a formula is read as arithmetic, and nothing else', () => {
  test('the order a calculator works in', () => {
    expect(val('2 + 3 * 4')).toBe(14);
    expect(val('(2 + 3) * 4')).toBe(20);
    expect(val('2 ^ 3 ^ 2')).toBe(512);
    expect(val('-2 ^ 2')).toBe(-4);
    expect(val('2 ^ -1')).toBe(0.5);
    expect(val('10 / 4 - 1')).toBe(1.5);
    expect(val('--3')).toBe(3);
  });
  test('names in any case, pi, and the functions, angles in degrees', () => {
    near(val('pi * od * rpm', { OD: 0.5, RPM: 4 }), Math.PI * 2);
    near(val('sin(30) + cos(60)'), 1);
    near(val('atan(1)'), 45);
    expect(val('sqrt(16) + abs(-2) + min(3, 1, 2) + max(1, 5)')).toBe(12);
    expect(val('round(2.3456, 2)')).toBe(2.35);
    expect(val('log(1000) + ln(1)')).toBe(3);
  });
  test('what a phone keyboard types: × ÷ · and the long minus', () => {
    expect(val('6 × 2 ÷ 3 − 1')).toBe(3);
    expect(val('2 · 3')).toBe(6);
    near(val('π'), Math.PI);
  });
  test('the names it needs, as first written', () => {
    const p = parseFormula('(Ip * tp + Ib * tb) / (tp + tb)');
    expect(p.ok && p.vars).toEqual(['Ip', 'tp', 'Ib', 'tb']);
    const q = parseFormula('OD - 2 * wall + od');
    expect(q.ok && q.vars).toEqual(['OD', 'wall']);
  });
  test('a formula that does not read says why, in plain words', () => {
    const why = (s: string) => {
      const p = parseFormula(s);
      return p.ok ? '' : p.why;
    };
    expect(why('')).toMatch(/Type the formula/);
    expect(why('2 OD')).toMatch(/operator between/);
    expect(why('(2 + 3')).toMatch(/not closed/);
    expect(why('2 + 3)')).toMatch(/no \( to close/);
    expect(why('2 +')).toMatch(/missing/);
    expect(why('foo(2)')).toMatch(/no function called foo/);
    expect(why('sqrt 4')).toMatch(/is a function/);
    expect(why('min(1)')).toMatch(/takes 2 to 8/);
    expect(why('2 $ 3')).toMatch(/not something a formula can hold/);
    expect(why('x'.repeat(300))).toMatch(/240 characters/);
    expect(why('('.repeat(60) + '1' + ')'.repeat(60))).toMatch(/nested too deep/);
  });
  test('nothing in a formula can reach the phone: code is only names that have no value', () => {
    const p = parseFormula('constructor');
    expect(p.ok && p.vars).toEqual(['constructor']);
    expect(workOut('constructor', {})).toEqual({ ok: false, why: 'constructor has no value.' });
    expect(parseFormula('alert("x")').ok).toBe(false);
    expect(parseFormula('a.b').ok).toBe(false);
    expect(parseFormula('a[0]').ok).toBe(false);
    expect(parseFormula('constructor(1)').ok).toBe(false);
    expect(workOut('toString + 1', { toString: 2 })).toEqual({ ok: true, value: 3 });
    const { values } = solveAll(equationSet([]), { constructor: 1 });
    expect(values.constructor).toBe(1);
  });
  test('a missing value, a divide by zero and the root of a negative are said, never a number', () => {
    expect(workOut('a * b', { a: 2 })).toEqual({ ok: false, why: 'b has no value.' });
    expect(workOut('1 / x', { x: 0 })).toMatchObject({ ok: false, why: expect.stringMatching(/divide by zero/) });
    expect(workOut('sqrt(x)', { x: -1 })).toMatchObject({ ok: false });
    const p = parseFormula('a');
    if (p.ok) expect(evaluate(p.node, { a: Number.NaN })).toMatchObject({ ok: false });
  });
});

describe('the equations the app ships', () => {
  test('every one reads, and works out on its own sample values', () => {
    for (const e of BUILT_IN) {
      expect(validEquation(e)).toEqual(e);
      expect(equationProblem(e, BUILT_IN)).toBeNull();
    }
  });
  test('the travel speed of a 1/2 inch tube at 4 RPM, and the RPM back from it', () => {
    const set = equationSet([]);
    const { values } = solveAll(set, { OD: 0.5, RPM: 4 });
    near(values.ipm!, 2 * Math.PI);
    const back = solveAll(set, { OD: 0.5, IPM: 2 * Math.PI });
    near(back.values.rpm!, 4);
  });
  test('a pulsed level: 70 A peak and 20 A background, even times, is 45 A on average, 50% at peak, 5 pulses a second', () => {
    const { values } = solveAll(equationSet([]), { Ip: 70, Ib: 20, tp: 0.1, tb: 0.1 });
    near(values.iavg!, 45);
    near(values.peakpct!, 50);
    near(values.hz!, 5);
  });
  test('answers chain: the travel speed and the average current give the heat input', () => {
    const { values, figures } = solveAll(equationSet([]), { OD: 0.5, RPM: 4, Ip: 70, Ib: 20, tp: 0.1, tb: 0.1, V: 9.5 });
    near(values.hi!, (9.5 * 45 * 60) / (2 * Math.PI));
    expect(figures.map((f) => f.key)).toEqual(expect.arrayContaining(['IPM', 'Iavg', 'HI', 'spot']));
  });
  test('tungsten length off the head constant, and the purge time of a run', () => {
    const { values } = solveAll(equationSet([]), { C: 0.75, OD: 0.5, gap: 0.035, wall: 0.065, len: 240, N: 7, CFH: 20 });
    near(values.l!, 0.75 - 0.25 - 0.035);
    near(values.id!, 0.37);
    near(values.purgemin!, (7 * ((Math.PI / 4) * 0.37 ** 2 * 240 / 1728) * 60) / 20);
  });
  test('a figure given is never replaced by an answer, and what cannot be worked says what it wants', () => {
    const { values, unworked } = solveAll(equationSet([]), { OD: 0.5, RPM: 4, IPM: 7 });
    expect(values.ipm).toBe(7);
    expect(unworked.find((u) => u.id === 'tungsten-length')?.needs).toEqual(['C', 'gap']);
    expect(unworked.find((u) => u.id === 'travel-speed')).toBeUndefined();
  });
  test('an equation whose figures will not work says why', () => {
    const { unworked } = solveAll(equationSet([]), { tp: 0, tb: 0, Ip: 70, Ib: 20 });
    expect(unworked.find((u) => u.id === 'average-amps')?.why).toMatch(/not a number/);
  });
});

describe('anyone can write or change an equation, tested before it is kept', () => {
  const own = (p: Partial<Equation>): Equation => ({ ...newEquation(1), name: 'Bead width', expr: 'k * wall', out: { key: 'bead', label: 'Bead width', unit: 'in' }, ...p });
  test('the boxes follow the formula, keeping what was filled in', () => {
    const had = inputsFor('k * wall', []);
    expect(had.map((i) => i.key)).toEqual(['k', 'wall']);
    const next = inputsFor('k * wall + OD', [{ ...had[0]!, label: 'Factor', sample: 3 }, had[1]!]);
    expect(next.map((i) => [i.key, i.label, i.unit, i.sample])).toEqual([['k', 'Factor', '', 3], ['wall', 'Wall', 'in', null], ['OD', 'Tube OD', 'in', null]]);
    expect(inputsFor('constructor + k', []).map((i) => i.label)).toEqual(['', '']);
  });
  test('it is not kept until its sample values work it out', () => {
    const e = own({ inputs: inputsFor('k * wall', []) });
    expect(equationProblem(e, BUILT_IN)).toMatch(/Test it before saving: put a sample value in k, wall/);
    const tested = own({ inputs: [{ key: 'k', label: '', unit: '', sample: 3 }, { key: 'wall', label: '', unit: 'in', sample: 0.065 }] });
    expect(equationProblem(tested, BUILT_IN)).toBeNull();
    expect(equationProblem({ ...tested, expr: 'k / (wall - wall)' }, BUILT_IN)).toMatch(/With the sample values/);
  });
  test('names that cannot be: an answer that is its own input, a function name, a name taken', () => {
    const base = own({ inputs: [{ key: 'k', label: '', unit: '', sample: 3 }, { key: 'wall', label: '', unit: '', sample: 1 }] });
    expect(equationProblem({ ...base, out: { ...base.out, key: 'wall' } }, BUILT_IN)).toMatch(/cannot also be one of its own inputs/);
    expect(equationProblem({ ...base, out: { ...base.out, key: 'sqrt' } }, BUILT_IN)).toMatch(/function or a constant/);
    expect(equationProblem({ ...base, out: { ...base.out, key: '2x' } }, BUILT_IN)).toMatch(/starts with a letter/);
    expect(equationProblem({ ...base, name: 'travel speed' }, BUILT_IN)).toMatch(/already an equation called Travel speed/);
  });
  test('a changed built-in replaces the shipped one where it is used, and an own one is added', () => {
    const changed: Equation = { ...BUILT_IN.find((e) => e.id === 'start-amps')!, expr: '900 * wall', updatedAt: 5 };
    const mine = tidyEquation(own({ inputs: [{ key: 'k', label: '', unit: '', sample: 3 }, { key: 'wall', label: '', unit: '', sample: 1 }] }), 9);
    const set = equationSet([changed, { ...mine, id: 'own-bead-1' }]);
    expect(set.filter((e) => e.id === 'start-amps')).toHaveLength(1);
    const { values } = solveAll(set, { wall: 0.065, k: 3 });
    near(values.istart!, 58.5);
    near(values.bead!, 0.195);
  });
  test('a kept record that does not hold together is not loaded', () => {
    const e = BUILT_IN[0]!;
    expect(validEquation({ ...e, expr: 'pi * OD *' })).toBeNull();
    expect(validEquation({ ...e, inputs: e.inputs.slice(0, 1) })).toBeNull();
    expect(validEquation({ ...e, id: 'made-up', builtIn: true })).toBeNull();
    expect(validEquation({ ...e, out: { ...e.out, key: 'OD' } })).toBeNull();
  });
});
