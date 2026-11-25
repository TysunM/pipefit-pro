import { equationSet } from '../calc/orbitalEquations';
import { clockArcs, currentProfile, degreesCheck, levelAverage, levelSeconds, programFigures, programTimes, programWarnings, spreadDegrees } from '../calc/orbitalProgram';
import { FAULTS, INSPECT, runFigures, runProblem, runSteps } from '../calc/orbitalRun';
import {
  copyProgram,
  newGear,
  newProgram,
  newRun,
  parseGear,
  parsePrograms,
  parseRuns,
  programProblem,
  putProgram,
  putRun,
  emptyPrograms,
  emptyRuns,
  qualify,
  qualifyProblem,
  revise,
  serialiseGear,
  serialisePrograms,
  serialiseRuns,
  validGear,
  type Gear,
  type Program,
} from '../state/orbitalBook';

const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);
const EQS = equationSet([]);

const head: Gear = { ...newGear('closed', 1), id: 'head-m9', make: 'AMI', model: 'Model 9', odMin: 0.25, odMax: 1, rpmMax: 6, constant: 0.75 };
const supply: Gear = { ...newGear('precision', 1), id: 'ps-217', make: 'AMI', model: '217', ampsMax: 100, levelsMax: 4, calDue: '2026-12-31' };
/** A half-inch 316L tube, 0.065 wall, four pulsed levels stepping down, 15° of overlap. */
const prog = (p: Partial<Program> = {}): Program => ({
  ...newProgram(1),
  id: 'p-half',
  name: '316 1/2 .065',
  od: 0.5,
  wall: 0.065,
  headId: head.id,
  supplyId: supply.id,
  overlap: 15,
  volts: 9.5,
  tungsten: { dia: 0.04, kind: '2% ceriated', gap: 0.035 },
  gas: { shield: 'Argon', shieldCfh: 15, purge: 'Argon', purgeCfh: 20, o2Max: 50 },
  seq: { prepurge: 20, upslope: 0.5, delay: 2, downslope: 3, postpurge: 20 },
  levels: [
    { deg: 90, rpm: 4, ip: 70, ib: 20, tp: 0.1, tb: 0.1 },
    { deg: 90, rpm: 4, ip: 67, ib: 20, tp: 0.1, tb: 0.1 },
    { deg: 90, rpm: 4, ip: 64, ib: 20, tp: 0.1, tb: 0.1 },
    { deg: 105, rpm: 4, ip: 61, ib: 20, tp: 0.1, tb: 0.1 },
  ],
  ...p,
});

describe('a program worked out', () => {
  test('each level runs its share of the turn, and the run is gas on to gas off', () => {
    const p = prog();
    near(levelSeconds(p.levels[0]!)!, 3.75);
    const t = programTimes(p);
    near(t.weld!, (375 / 360) * 15);
    near(t.arc!, t.weld! + 0.5 + 2 + 3);
    near(t.total!, t.arc! + 40);
    expect(programTimes(prog({ levels: [{ deg: 360, rpm: 0, ip: 70, ib: 70, tp: 0, tb: 0 }] })).weld).toBeNull();
  });
  test('the current the joint feels: a pulse averaged, a flat level its own current', () => {
    near(levelAverage({ deg: 90, rpm: 4, ip: 70, ib: 20, tp: 0.1, tb: 0.1 })!, 45);
    near(levelAverage({ deg: 90, rpm: 4, ip: 70, ib: 20, tp: 0.15, tb: 0.05 })!, 57.5);
    expect(levelAverage({ deg: 90, rpm: 4, ip: 60, ib: 60, tp: 0, tb: 0 })).toBe(60);
  });
  test('the levels must cover the turn and the overlap; spread evenly, they do', () => {
    expect(degreesCheck(prog()).ok).toBe(true);
    const short = prog({ levels: prog().levels.slice(0, 3) });
    expect(degreesCheck(short)).toMatchObject({ ok: false, sum: 270, want: 375 });
    const spread = spreadDegrees(short);
    expect(spread.map((l) => l.deg)).toEqual([125, 125, 125]);
    expect(spread[0]!.ip).toBe(70);
    expect(spreadDegrees(prog({ overlap: 10, levels: prog().levels.slice(0, 3) })).reduce((a, l) => a + l.deg, 0)).toBeCloseTo(370, 6);
  });
  test('the equations on a program: the tube and head once, then what each level adds', () => {
    const f = programFigures(prog(), head, EQS);
    const prog1 = Object.fromEntries(f.program.map((x) => [x.key, x.value]));
    near(prog1.L!, 0.75 - 0.25 - 0.035);
    near(prog1.ID!, 0.37);
    near(prog1.Istart!, 65);
    const l1 = Object.fromEntries(f.levels[0]!.map((x) => [x.key, x.value]));
    near(l1.IPM!, 2 * Math.PI);
    near(l1.Iavg!, 45);
    near(l1.HI!, (9.5 * 45 * 60) / (2 * Math.PI));
    near(l1.Hz!, 5);
  });
  test('a qualified program shows no development starting points', () => {
    const f = programFigures(prog({ status: 'qualified' }), head, EQS);
    expect(f.program.map((x) => x.id)).not.toContain('start-amps');
    expect(f.levels[0]!.map((x) => x.id)).not.toContain('step-down');
  });
  test('a level that does not pulse gives no pulse figures, and its current is its average', () => {
    const flat = prog({ levels: [{ deg: 375, rpm: 4, ip: 50, ib: 50, tp: 0, tb: 0 }] });
    const f = programFigures(flat, head, EQS);
    const keys = f.levels[0]!.map((x) => x.key);
    expect(keys).not.toContain('Hz');
    expect(keys).toContain('HI');
  });
  test('the crew\'s own figure on a program feeds the crew\'s own equation', () => {
    const own = { ...EQS[0]!, id: 'own-bead', builtIn: false, name: 'Bead width', expr: 'k * wall', out: { key: 'bead', label: 'Bead width', unit: 'in' }, inputs: [{ key: 'k', label: 'Factor', unit: '', sample: 3 }, { key: 'wall', label: 'Wall', unit: 'in', sample: 0.065 }] };
    const f = programFigures(prog({ extras: [{ key: 'k', label: 'Factor', value: 3 }] }), head, [...EQS, own]);
    near(f.program.find((x) => x.key === 'bead')!.value, 0.195);
  });
  test('what the program asks that the gear may not do', () => {
    const w = programWarnings(prog({ od: 1.5, levels: [{ deg: 375, rpm: 8, ip: 120, ib: 20, tp: 0.1, tb: 0.1 }] }), { ...supply, calDue: '2026-01-01' }, head, '2026-11-25');
    expect(w.join('\n')).toMatch(/over the head's largest/);
    expect(w.join('\n')).toMatch(/faster than the head's 6 RPM/);
    expect(w.join('\n')).toMatch(/more than the power supply's 100 A/);
    expect(w.join('\n')).toMatch(/due for calibration on 2026-01-01/);
    expect(programWarnings(prog({ levels: [...prog().levels, prog().levels[0]!] }), supply, head, '2026-11-25').join('\n')).toMatch(/5 levels; the power supply holds 4/);
    expect(programWarnings(prog(), supply, head, '2026-11-25')).toEqual([]);
  });
  test('the drawings: the arcs run on from the top, and the current goes gas, ramp, levels, ramp, gas', () => {
    expect(clockArcs(prog()).map((a) => [a.from, a.to])).toEqual([[0, 90], [90, 180], [180, 270], [270, 375]]);
    const prof = currentProfile(prog());
    expect(prof.map((s) => s.kind)).toEqual(['prepurge', 'upslope', 'delay', 'level', 'level', 'level', 'level', 'downslope', 'postpurge']);
    near(prof[prof.length - 1]!.t1, programTimes(prog()).total!);
  });
});

describe('development, qualified, and the next version', () => {
  test('a program is kept while part filled, and qualified only when it is whole', () => {
    expect(programProblem({ ...newProgram(1), name: 'New' })).toBeNull();
    expect(qualifyProblem({ ...newProgram(1), name: 'New' })).toMatch(/OD and wall/);
    expect(qualifyProblem(prog())).toMatch(/Name the WPS/);
    expect(qualifyProblem(prog({ wps: 'WPS-OW-1' }))).toMatch(/coupon/);
    expect(qualifyProblem(prog({ wps: 'WPS-OW-1', coupon: 'C-3' }))).toBeNull();
    expect(programProblem(prog({ wall: 0.3 }))).toMatch(/too thick/);
    expect(programProblem(prog({ levels: [{ deg: 360, rpm: 4, ip: 50, ib: 60, tp: 0.1, tb: 0.1 }] }))).toMatch(/background current is above the peak/);
    expect(programProblem(prog({ levels: [{ deg: 360, rpm: 4, ip: 60, ib: 20, tp: 0, tb: 0.1 }] }))).toMatch(/pulsed level needs/);
  });
  test('a change to a qualified program is a new version; the qualified one is kept', () => {
    const q = qualify(prog({ wps: 'WPS-OW-1', coupon: 'C-3' }), 100);
    expect(q).toMatchObject({ status: 'qualified', qualifiedAt: 100 });
    const r = revise(q, 200);
    expect(r).toMatchObject({ status: 'dev', version: 2, qualifiedAt: null, coupon: '', wps: 'WPS-OW-1' });
    expect(r.history[0]).toMatchObject({ status: 'qualified', version: 1, coupon: 'C-3' });
    expect('history' in r.history[0]!).toBe(false);
    const c = copyProgram(r, 300);
    expect(c).toMatchObject({ id: 'new', version: 1, status: 'dev', history: [] });
  });
});

describe('kept on the phone', () => {
  test('gear, programs and runs go round the store and back whole', () => {
    const g = parseGear(serialiseGear({ gear: [head, supply], foreign: false, dropped: 0 }));
    expect(g.gear.map((x) => x.id).sort()).toEqual(['head-m9', 'ps-217']);
    const q = revise(qualify(prog({ wps: 'WPS-OW-1', coupon: 'C-3' }), 100), 200);
    const pb = parsePrograms(serialisePrograms(putProgram(emptyPrograms(), q).book));
    expect(pb.programs[0]).toEqual(q);
    const run = { ...newRun(q, 'coupon', 5), id: 'r1', weld: 'C-4', result: 'pass' as const, checks: ['prep', 'pen'] };
    expect(parseRuns(serialiseRuns(putRun(emptyRuns(), run))).runs[0]).toEqual(run);
  });
  test('a record that does not hold together is dropped and counted; a newer app\'s store is left alone', () => {
    const raw = JSON.stringify({ v: 1, gear: [head, { ...head, id: 'x', family: 'closed', kind: 'supply' }, { ...head, id: 'y', make: '', model: '' }, head] });
    expect(parseGear(raw)).toMatchObject({ dropped: 3, gear: [head] });
    expect(parsePrograms(JSON.stringify({ v: 2, programs: [] }))).toMatchObject({ foreign: true });
    expect(parsePrograms('not json')).toMatchObject({ dropped: 1, programs: [] });
    expect(validGear({ ...head, calDue: 'soon' })).toBeNull();
    expect(validGear({ ...head, odMin: -1 })).toBeNull();
  });
});

describe('the run sheet', () => {
  const run = { ...newRun(prog(), 'production' as const, 1), id: 'r', purgeLen: 240, changes: 7 };
  test("each step carries this weld's figures: the tungsten length and the purge time", () => {
    const f = runFigures(prog(), head, EQS, run);
    near(f.tungsten!, 0.465);
    near(f.purgeMin!, (7 * ((Math.PI / 4) * 0.37 ** 2 * 240 / 1728) * 60) / 20);
    const steps = runSteps(prog(), supply, head, EQS, run);
    expect(steps.map((s) => s.id)).toEqual(['gear', 'prep', 'tungsten', 'fitup', 'purge', 'shield', 'program', 'weld']);
    expect(steps.find((s) => s.id === 'tungsten')!.detail).toMatch(/Length 0\.465"/);
    expect(steps.find((s) => s.id === 'purge')!.detail).toMatch(/Under 50 ppm oxygen/);
    expect(steps.find((s) => s.id === 'program')!.detail).toMatch(/in development/);
  });
  test('a head that feeds wire adds its step; a head with no constant says where to put it', () => {
    expect(runSteps(prog(), supply, { ...head, wire: true }, EQS, run).map((s) => s.id)).toContain('wire');
    expect(runSteps(prog(), supply, { ...head, constant: null }, EQS, run).find((s) => s.id === 'tungsten')!.detail).toMatch(/electrode constant C in the equipment book/);
  });
  test('a run is saved with its number and how it came out; a fail says what failed', () => {
    expect(runProblem(run)).toMatch(/weld number/);
    expect(runProblem({ ...run, weld: 'W-12' })).toMatch(/pass or fail/);
    expect(runProblem({ ...run, weld: 'W-12', result: 'fail' })).toMatch(/what failed/);
    expect(runProblem({ ...run, weld: 'W-12', result: 'fail', faults: ['tint-id'] })).toBeNull();
    expect(new Set(FAULTS.map((f) => f.id)).size).toBe(FAULTS.length);
    expect(new Set(INSPECT.map((i) => i.id)).size).toBe(INSPECT.length);
  });
});
