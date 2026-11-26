import qrcode from 'qrcode-generator';
import { BUILT_IN, inputsFor, newEquation, type Equation } from '../calc/orbitalEquations';
import { emptyEquations, emptyGear, emptyPrograms, newGear, newProgram, putEquation, putGear, putProgram, revise, qualify, type Gear, type Program } from '../state/orbitalBook';
import { MAX_QR_CODE, applyImport, checksum, ownEquationsFor, packShare, planImport, unpackShare } from '../state/orbitalShare';

const T = 1_700_000_000_000;
const head: Gear = { ...newGear('closed', T), id: 'gear-ami-m9', make: 'AMI', model: 'Model 9', odMin: 0.25, odMax: 1, rpmMax: 6, constant: 0.75, note: 'Inserts: 1/4, 3/8, 1/2' };
const supply: Gear = { ...newGear('precision', T), id: 'gear-ami-217', make: 'AMI', model: '217', ampsMax: 100, levelsMax: 4, calDue: '2027-03-01' };
const other: Gear = { ...newGear('open', T), id: 'gear-other', make: 'Axxair', model: 'SATO' };
const lv = (ip: number) => ({ deg: 93.75, rpm: 4, ip, ib: 20, tp: 0.1, tb: 0.1 });
const program: Program = qualify(
  {
    ...newProgram(T),
    id: 'program-316-050-065-abc',
    name: '316-050-065',
    od: 0.5,
    wall: 0.065,
    headId: head.id,
    supplyId: supply.id,
    overlap: 15,
    volts: 9.5,
    tungsten: { dia: 0.04, kind: '2% ceriated', gap: 0.035 },
    gas: { shield: 'Argon', shieldCfh: 15, purge: 'Argon', purgeCfh: 20, o2Max: 50 },
    seq: { prepurge: 20, upslope: 0.5, delay: 2, downslope: 3, postpurge: 20 },
    levels: [lv(70), lv(67), lv(64), lv(61)],
    extras: [{ key: 'k', label: '', value: 3 }],
    wps: 'WPS-OW-316-01',
    coupon: 'C-1',
    note: 'Heat lots matched',
  },
  T + 5,
);
const own = (name: string, expr: string, key: string, samples: Record<string, number>): Equation => ({
  ...newEquation(T),
  id: `own-${key}`,
  name,
  expr,
  out: { key, label: name, unit: '°' },
  inputs: inputsFor(expr, []).map((i) => ({ ...i, sample: samples[i.key] ?? 1 })),
});
const beadWidth = own('Bead width', 'k * wall', 'bead', { k: 3, wall: 0.065 });
const unrelated = own('Something else', 'zz * 2', 'zz2', { zz: 1 });

describe('a program packed into a code and back', () => {
  const code = packShare(program, [head, supply, other], [beadWidth, unrelated, ...BUILT_IN]);
  test('it comes back whole: the program, the head and supply it names, the crew\'s equation that works on it', () => {
    const out = unpackShare(code);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Everything but the created time, which does not travel: on the phone it lands on, it is the updated time.
    expect(out.share.program).toEqual({ ...program, history: [], createdAt: program.updatedAt });
    expect(out.share.gear).toEqual([head, supply]);
    expect(out.share.equations).toEqual([beadWidth]);
  });
  test('plain ASCII, small enough to read off a screen as a QR, and a QR it makes', () => {
    expect(/^[\x20-\x7e]+$/.test(code)).toBe(true);
    expect(code.length).toBeLessThan(MAX_QR_CODE);
    const qr = qrcode(0, 'L');
    qr.addData(code, 'Byte');
    qr.make();
    expect(qr.getModuleCount()).toBeLessThanOrEqual(121);
  });
  test('pasted with words round it, as a message carries it, it still reads', () => {
    expect(unpackShare(`PipeFit program 316-050-065:\n${code}\nSent from my phone`).ok).toBe(true);
  });
  test('a character misread, or the message cut short, is refused, not half taken', () => {
    const bad = code.replace('316-050-065', '316-050-066');
    expect(unpackShare(bad)).toEqual({ ok: false, why: expect.stringMatching(/did not come through whole/) });
    expect(unpackShare(code.slice(0, -20)).ok).toBe(false);
    expect(unpackShare('hello')).toEqual({ ok: false, why: 'That is not a PipeFit Pro program code.' });
    expect(unpackShare('PFP2:00000000:{}')).toEqual({ ok: false, why: expect.stringMatching(/newer PipeFit Pro/) });
  });
  test('a code that checks out but holds nothing the phone would take is refused', () => {
    const json = JSON.stringify({ p: { name: '', levels: 'x' } });
    expect(unpackShare(`PFP1:${checksum(json)}:${json}`)).toEqual({ ok: false, why: expect.stringMatching(/cannot take/) });
    const sneaky = JSON.stringify({ p: { ...program, history: [] }, e: [{ ...beadWidth, id: 'travel-speed', builtIn: true, expr: '999' }] });
    const out = unpackShare(`PFP1:${checksum(sneaky)}:${sneaky}`);
    expect(out.ok && out.share.equations).toEqual([]);
  });
  test('a "__proto__" field in a code is dropped, not made the record\'s prototype', () => {
    const json = JSON.stringify({ p: { ...JSON.parse(code.slice(14)).p } }).replace('{', '{"__proto__":{"wps":"FAKE","status":"qualified"},');
    const out = unpackShare(`PFP1:${checksum(json)}:${json}`);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(Object.getPrototypeOf(out.share.program)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).wps).toBeUndefined();
  });
  test('only the crew\'s own equations that give a figure on this program travel', () => {
    expect(ownEquationsFor(program, head, [beadWidth, unrelated]).map((e) => e.id)).toEqual(['own-bead']);
  });
});

describe('taking a code in', () => {
  const books = () => ({ programs: emptyPrograms(), gear: emptyGear(), equations: emptyEquations() });
  const share = () => {
    const out = unpackShare(packShare(program, [head, supply], [beadWidth]));
    if (!out.ok) throw new Error(out.why);
    return out.share;
  };
  test('a new program comes in with its equipment and equation', () => {
    const b = books();
    expect(planImport(share(), b)).toEqual({
      program: { state: 'new', have: null },
      gear: [{ id: head.id, name: 'AMI Model 9', state: 'new' }, { id: supply.id, name: 'AMI 217', state: 'new' }],
      equations: [{ id: 'own-bead', name: 'Bead width', state: 'new' }],
    });
    const after = applyImport(share(), b);
    expect(after.programs.programs).toHaveLength(1);
    expect(after.gear.gear).toHaveLength(2);
    expect(after.equations.equations).toHaveLength(1);
  });
  test('the same program again is left alone; an older version here is updated and kept in its history; a newer one here is not touched', () => {
    const same = { ...books(), programs: putProgram(emptyPrograms(), program).book };
    expect(planImport(share(), same).program.state).toBe('same');
    // Sent back to the phone it came from, its fields in another order: still the same program.
    const reordered = Object.fromEntries(Object.entries(share().program).reverse()) as Program;
    expect(planImport({ ...share(), program: reordered }, same).program.state).toBe('same');
    const older = { ...program, version: 1, updatedAt: T };
    const newer = revise(program, T + 50);
    const incoming = { ...share(), program: newer };
    const b = { ...books(), programs: putProgram(emptyPrograms(), older).book };
    expect(planImport(incoming, b).program).toEqual({ state: 'update', have: 1 });
    const after = applyImport(incoming, b);
    expect(after.programs.programs[0]!.version).toBe(2);
    expect(after.programs.programs[0]!.history.map((h) => h.version)).toContain(1);
    const ahead = { ...books(), programs: putProgram(emptyPrograms(), newer).book };
    expect(planImport(share(), ahead).program).toEqual({ state: 'older', have: 2 });
    expect(applyImport(share(), ahead).programs).toBe(ahead.programs);
  });
  test("equipment and equations already on the phone are kept as they are: the crew's own edits are never written over", () => {
    const mine = { ...head, note: 'Ours: insert set B' };
    const myEq = { ...beadWidth, expr: 'k * wall * 2' };
    const b = { programs: emptyPrograms(), gear: putGear(emptyGear(), mine).book, equations: putEquation(emptyEquations(), myEq).book };
    expect(planImport(share(), b).gear[0]!.state).toBe('have');
    const after = applyImport(share(), b);
    expect(after.gear.gear.find((g) => g.id === head.id)!.note).toBe('Ours: insert set B');
    expect(after.equations.equations[0]!.expr).toBe('k * wall * 2');
  });
});
