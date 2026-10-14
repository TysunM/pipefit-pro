import {
  CLASSES,
  DEFAULT_K,
  DEFAULT_STRESS_KSI,
  LUBRICANTS,
  MAX_SPECS,
  SPEC_VERSION,
  STUD_GRADES,
  activeSpec,
  boltingLine,
  emptySpecBook,
  fromSpec,
  getSpec,
  methodFor,
  newSpec,
  parseSpecBook,
  putSpec,
  removeSpec,
  ruleFor,
  serialiseSpecBook,
  setActive,
  specId,
  specProblem,
  targetTorque,
  validSpec,
  type BoltingSpec,
} from '../state/boltingSpec';
import { referenceTorque, steelFlange } from '../calc/steelFlange';
import { methodBar } from '../calc/boltUpSequence';
import { STORES } from '../state/backup';
import { newJoint, validJoint, withFlange } from '../state/register';

// The company's bolting spec
// --------------------------
// What goes wrong with a spec is quiet. A figure typed in wrong is bolted to
// on every joint for a month; a spec revised after the fact rewrites what an
// earlier joint was pulled up to; a class bolted differently is bolted the
// usual way because the flange could not take the method and nobody said.
// Each of those is held here.

const T0 = 1_700_000_000_000;

const spec = (over: Partial<BoltingSpec> = {}): BoltingSpec => ({ ...newSpec('bj-01-x', T0), name: 'BJ-01 Rev C', ...over });

describe('a new spec', () => {
  test("starts on PCC-1's own table figures: B7 at 50 ksi, K 0.16, four hours", () => {
    const s = newSpec('x', T0);
    expect(s.stud).toBe('ASTM A193 B7');
    expect(s.stressKsi).toBe(DEFAULT_STRESS_KSI);
    expect(s.nutFactor).toBe(DEFAULT_K);
    expect(s.lubricant).toBe(LUBRICANTS[0]!.lubricant);
    expect(s.method).toBe('legacy');
    expect(s.gasket).toBe('unknown');
    expect(s.retightenHours).toBe(4);
    expect(s.byClass).toEqual({});
  });

  test('cannot be saved without a name, a stud, a lubricant or figures in range', () => {
    expect(specProblem(spec())).toBeNull();
    expect(specProblem(spec({ name: '  ' }))).toMatch(/name/);
    expect(specProblem(spec({ stud: '' }))).toMatch(/stud/i);
    expect(specProblem(spec({ lubricant: '' }))).toMatch(/lubricant/i);
    expect(specProblem(spec({ stressKsi: 0 }))).toMatch(/stress/);
    expect(specProblem(spec({ stressKsi: 500 }))).toMatch(/stress/);
    expect(specProblem(spec({ nutFactor: 0.6 }))).toMatch(/Nut factor/);
    expect(specProblem(spec({ retightenHours: -1 }))).toMatch(/dwell/);
  });

  test('the id carries the name and the moment, so it is the same spec on every phone it is restored to', () => {
    expect(specId('ACME BJ-01 Rev C', T0)).toBe(`acme-bj-01-rev-c-${T0.toString(36)}`);
    expect(specId('', T0)).toBe(`spec-${T0.toString(36)}`);
    expect(specId('a'.repeat(80), T0)).toHaveLength(24 + 1 + T0.toString(36).length);
  });

  test('every stud grade chip and lubricant chip is a real figure', () => {
    for (const g of STUD_GRADES) expect(g.stud.length).toBeGreaterThan(0);
    for (const l of LUBRICANTS) expect(l.k).toBeGreaterThanOrEqual(0.1);
    for (const l of LUBRICANTS) expect(l.k).toBeLessThanOrEqual(0.25);
    expect(new Set(CLASSES).size).toBe(8);
  });
});

describe('reading what was stored', () => {
  const store = (specs: unknown[], active: unknown = null, v = SPEC_VERSION) => JSON.stringify({ v, specs, active });

  test('round trip, active and all', () => {
    const a = spec({ byClass: { '900': { method: 'tension100', stressKsi: 45 }, '150': { gasket: 'soft' } } });
    const b = spec({ id: 'other', name: 'Other', updatedAt: T0 - 1 });
    const book = setActive(putSpec(putSpec(emptySpecBook(), a), b), 'other');
    const back = parseSpecBook(serialiseSpecBook(book));
    expect(back.specs).toEqual(book.specs);
    expect(back.active).toBe('other');
    expect(back.foreign).toBe(false);
    expect(back.dropped).toBe(0);
  });

  test('nothing, rubbish, a newer app', () => {
    expect(parseSpecBook(null)).toEqual(emptySpecBook());
    expect(parseSpecBook('{nope').dropped).toBe(1);
    expect(parseSpecBook('[]').dropped).toBe(1);
    expect(parseSpecBook(store([], null, SPEC_VERSION + 1)).foreign).toBe(true);
  });

  test('a spec with a bad figure is dropped and counted; the rest are kept', () => {
    const read = parseSpecBook(store([spec(), { ...spec({ id: 'bad' }), nutFactor: 2 }, { ...spec({ id: 'bad2' }), method: 'star' }]));
    expect(read.specs.map((s) => s.id)).toEqual(['bj-01-x']);
    expect(read.dropped).toBe(2);
  });

  test('an active id that names no spec is no choice', () => {
    expect(parseSpecBook(store([spec()], 'gone')).active).toBeNull();
  });

  test('a class rule names a real class and a real method, or the spec is refused; an unknown class is skipped', () => {
    expect(validSpec({ ...spec(), byClass: { '300': { method: 'nothing' } } })).toBeNull();
    expect(validSpec({ ...spec(), byClass: { '300': { stressKsi: 999 } } })).toBeNull();
    expect(validSpec({ ...spec(), byClass: { '400': { method: 'quadrant' }, '300': {} } })?.byClass).toEqual({});
  });

  test('strings are capped, figures rounded', () => {
    const v = validSpec({ ...spec(), name: 'n'.repeat(100), stressKsi: 50.04, nutFactor: 0.1604 });
    expect(v?.name).toHaveLength(60);
    expect(v?.stressKsi).toBe(50);
    expect(v?.nutFactor).toBe(0.16);
  });

  test('the book is capped, newest kept', () => {
    let book = emptySpecBook();
    for (let i = 0; i < MAX_SPECS + 3; i += 1) book = putSpec(book, spec({ id: `s${i}`, updatedAt: T0 + i }));
    expect(book.specs).toHaveLength(MAX_SPECS);
    expect(book.specs[0]!.id).toBe(`s${MAX_SPECS + 2}`);
  });
});

describe('the book', () => {
  test('one spec on the phone is the one it bolts to; two need a choice', () => {
    const one = putSpec(emptySpecBook(), spec());
    expect(activeSpec(one)?.id).toBe('bj-01-x');
    const two = putSpec(one, spec({ id: 'other', name: 'Other' }));
    expect(activeSpec(two)).toBeNull();
    expect(activeSpec(setActive(two, 'other'))?.id).toBe('other');
    expect(activeSpec(setActive(two, 'nope'))).toBeNull();
  });

  test('removing the active spec leaves no choice; saving over a spec keeps the choice', () => {
    const two = setActive(putSpec(putSpec(emptySpecBook(), spec()), spec({ id: 'other', name: 'Other' })), 'other');
    expect(removeSpec(two, 'other').active).toBeNull();
    expect(removeSpec(two, 'bj-01-x').active).toBe('other');
    expect(putSpec(two, { ...getSpec(two, 'other')!, nutFactor: 0.2 }).active).toBe('other');
  });
});

describe('what a joint takes from the spec', () => {
  test('a class bolted differently takes its own rule, the rest the spec', () => {
    const s = spec({ method: 'modified', gasket: 'spiral', byClass: { '900': { method: 'tension100', gasket: 'rtj', stressKsi: 40 }, '150': { gasket: 'soft' } } });
    expect(ruleFor(s, '900')).toEqual({ method: 'tension100', gasket: 'rtj', stressKsi: 40 });
    expect(ruleFor(s, '150')).toEqual({ method: 'modified', gasket: 'soft', stressKsi: 50 });
    expect(ruleFor(s, '300')).toEqual({ method: 'modified', gasket: 'spiral', stressKsi: 50 });
  });

  test("the method falls back when the flange cannot take it: the class's, then the spec's, then Legacy", () => {
    const s = spec({ method: 'modified', byClass: { '300': { method: 'quadrant' } } });
    expect(methodBar('quadrant', 8, 'spiral')).not.toBeNull();
    expect(methodFor(s, '300', 16, 'spiral')).toBe('quadrant');
    expect(methodFor(s, '300', 12, 'spiral')).toBe('modified');
    expect(methodFor(s, '300', 8, 'spiral')).toBe('legacy');
    expect(methodFor(spec({ method: 'circular' }), '150', 8, 'spiral')).toBe('legacy');
    expect(methodFor(spec({ method: 'circular' }), '150', 8, 'hard')).toBe('circular');
  });

  test('the torque is the Appendix K figure for the stud at the class stress, and none without a stud size', () => {
    const s = spec({ stressKsi: 50, nutFactor: 0.16, byClass: { '600': { stressKsi: 40 } } });
    const stud = steelFlange(6, '150')!.stud;
    expect(targetTorque(s, '150', 6)).toBe(Math.round(referenceTorque(stud, 50_000, 0.16)));
    expect(targetTorque(s, '600', 6)).toBe(Math.round(referenceTorque(steelFlange(6, '600')!.stud, 40_000, 0.16)));
    // 3/4" stud, root area 0.302 sq in, 15.1 kip at 50 ksi: 151 ft-lb at K 0.16. Tables on the tensile stress area read about a tenth higher.
    expect(targetTorque(s, '150', 6)).toBe(151);
    expect(targetTorque(s, '125', 6)).toBeNull();
    expect(targetTorque(s, '150', null)).toBeNull();
    expect(targetTorque(s, '150', 99)).toBeNull();
  });

  test('a new joint takes gasket, method and torque, and keeps a copy of the figures', () => {
    const s = spec({ gasket: 'spiral', method: 'modified', lubricant: ' Moly paste ' });
    const got = fromSpec(s, '300', 6, 12);
    expect(got.gasket).toBe('spiral');
    expect(got.method).toBe('modified');
    expect(got.torque).toBe(targetTorque(s, '300', 6));
    expect(got.bolting).toEqual({ spec: 'BJ-01 Rev C', stud: 'ASTM A193 B7', stressKsi: 50, nutFactor: 0.16, lubricant: 'Moly paste' });
    // A gasket already set on the joint stays; one not set takes the spec's.
    expect(fromSpec(s, '300', 6, 12, 'rtj').gasket).toBe('rtj');
    expect(fromSpec(s, '300', 6, 12, 'unknown').gasket).toBe('spiral');
    expect(boltingLine(got.bolting)).toBe('BJ-01 Rev C · ASTM A193 B7 at 50 ksi · K 0.16, Moly paste');
  });

  test('the copy on the joint survives the register and a later change to the spec', () => {
    const s = spec();
    const j = newJoint('j1', { cls: '150', nps: 6, bolts: 8, ...fromSpec(s, '150', 6, 8) }, T0);
    expect(j.bolting?.spec).toBe('BJ-01 Rev C');
    expect(j.torque).toBe(targetTorque(s, '150', 6));
    const back = validJoint(JSON.parse(JSON.stringify(j)));
    expect(back?.bolting).toEqual(j.bolting);
    expect(validJoint({ ...j, bolting: undefined })?.bolting).toBeNull();
    expect(validJoint({ ...j, bolting: { spec: 'x' } })?.bolting).toBeNull();
    // Revised later: the joint still says what it was bolted to.
    const revised = spec({ nutFactor: 0.2, updatedAt: T0 + 1 });
    expect(fromSpec(revised, '150', 6, 8).bolting.nutFactor).toBe(0.2);
    expect(j.bolting?.nutFactor).toBe(0.16);
  });

  test('a flange change under the spec re-takes the figures for the new class', () => {
    const s = spec({ byClass: { '600': { method: 'quadrant', stressKsi: 40 } } });
    const j = newJoint('j1', { cls: '150', nps: 6, bolts: 8, ...fromSpec(s, '150', 6, 8) }, T0);
    const moved = withFlange(j, { cls: '600', nps: 10, bolts: 16, ...fromSpec(s, '600', 10, 16, j.gasket) }, T0 + 1);
    expect(moved.state.method).toBe('quadrant');
    expect(moved.torque).toBe(targetTorque(s, '600', 10));
    expect(moved.bolting?.stressKsi).toBe(40);
    expect(moved.state.round).toBe(0);
  });
});

describe('in the backup', () => {
  test('the specs are a store of their own, merged by id', () => {
    const entry = STORES.find((s) => s.key === 'pipefit.boltspecs.v1');
    expect(entry?.field).toBe('specs');
    expect(entry?.idOf(spec())).toBe('bj-01-x');
    expect(entry?.parse(serialiseSpecBook(putSpec(emptySpecBook(), spec()))).specs).toHaveLength(1);
  });
});
