import {
  AREAS,
  SKILLS,
  attest,
  emptyPassport,
  evidence,
  parsePassport,
  recordCode,
  revoke,
  serialisePassport,
  skill,
  standingOf,
  standingSummary,
  standings,
  type Records,
} from '../state/passport';
import { passportHtml } from '../print/passport';
import { encodeSig } from '../calc/signature';
import { newJoint, addCheck } from '../state/register';
import { endHold, newTest, startHold, type PressureTest } from '../state/pressureLog';
import { emptyCuts, addCut } from '../state/cutLog';
import { emptyBook, newSketch, type SavedSketch } from '../state/sketchStore';
import { STORES } from '../state/backup';

const T = new Date(2026, 9, 6, 9).getTime();
const SIG = encodeSig([
  [
    [10, 50],
    [60, 20],
    [120, 70],
  ],
]);

function records(): Records {
  let cuts = emptyCuts();
  for (let i = 0; i < 3; i++) cuts = addCut(cuts, { pipeKey: 'cs|40|6', pipe: '6" SCH 40', c2c: 100 + i, cut: 90 + i, ends: ['BW', 'BW'] } as never, T + i, 'BP-1');
  const strokes = [1, 2, 3].map(() => ({ kind: 'run', from: [0, 0, 0], to: [1, 0, 0] })) as unknown as SavedSketch['strokes'];
  const one: SavedSketch = { ...newSketch(emptyBook(), T, 'BP-1'), name: 'ISO-1', strokes };
  const thin: SavedSketch = { ...one, id: 'sk2', name: 'ISO-2', strokes: strokes.slice(0, 1) };
  const j = newJoint('j1', { tag: 'F-1', cls: '125', nps: 6, bolts: 8, torque: 60, project: 'BP-1' }, T);
  const done = addCheck({ ...j, completedAt: T + 3600_000, witnessedBy: 'B. Lee' }, { moved: false, torque: null, note: '' }, T + 7200_000);
  let test: PressureTest = { ...newTest('BP-1', T), pkg: 'TP-7', testPsi: 225 };
  test = endHold(startHold(test, T + 10, 225), T + 40 * 60_000, 225);
  const signed = { ...test, result: 'pass' as const, updatedAt: T + 5000, people: { ...test.people, tester: { name: 'A. Hand', sig: SIG, signedAt: T + 5000 } } };
  const unsigned = { ...signed, id: 'pt2', pkg: 'TP-8', people: { ...test.people } };
  return {
    cuts: cuts.cuts,
    sketches: [one, thin],
    joints: [done, j],
    tests: [signed, unsigned],
    heats: [{ heat: 'A1234', material: 'A106 Gr B', form: 'pipe', size: null, schedule: '', certified: true, createdAt: T } as never],
    readings: [],
    reports: [{ id: 'r1', day: '2026-10-06', project: 'BP-1', crew: 4, hours: 10, welds: [{ nps: 6, count: 3 }], rejects: [], spools: [], notes: {} as never, text: '', polished: false, createdAt: T, updatedAt: T }],
  };
}

describe('the skill catalogue', () => {
  test('every skill is unique, in an area, with a module and a level', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    for (const s of SKILLS) {
      expect(AREAS).toContain(s.area);
      expect(s.nccer).not.toBe('');
      expect([1, 2, 3, 4]).toContain(s.level);
    }
    expect(skill('boltup')?.needs).toBe(10);
    expect(skill('nothing')).toBeUndefined();
  });
});

describe('evidence off the records', () => {
  test('each record kind counts for its skill, newest first, with what it was', () => {
    const ev = evidence(records());
    const of = (id: string) => ev.filter((e) => e.skill === id);
    expect(of('offsets')).toHaveLength(3);
    expect(of('isos').map((e) => e.what)).toEqual(['ISO-1']);
    expect(of('boltup').map((e) => e.what)).toEqual(['F-1, witnessed by B. Lee']);
    expect(of('retorque').map((e) => e.what)).toEqual(['F-1, held']);
    expect(of('hydro').map((e) => e.what)).toEqual(['TP-7 passed, 225 psi']);
    expect(of('heats')[0]).toMatchObject({ what: 'A1234 A106 Gr B', project: '' });
    expect(of('shift')).toHaveLength(1);
    expect(of('level')).toHaveLength(0);
    for (let i = 1; i < ev.length; i++) expect(ev[i - 1]!.at).toBeGreaterThanOrEqual(ev[i]!.at);
  });

  test('a skill stands on the sign-off first, then on the count', () => {
    const s = skill('boltup')!;
    const ev = Array.from({ length: 10 }, (_, i) => ({ skill: 'boltup' as const, at: T + i, what: 'F', project: '' }));
    expect(standingOf(s, [], [])).toBe('none');
    expect(standingOf(s, ev.slice(0, 3), [])).toBe('started');
    expect(standingOf(s, ev, [])).toBe('practised');
    const a = attest(emptyPassport(), { skill: 'boltup', by: 'J. Ruiz', role: 'Foreman', sig: SIG, project: '', note: '' }, T);
    expect(a.ok).toBe(true);
    expect(standingOf(s, [], a.passport.attestations)).toBe('competent');
    // Only a sign-off can show a skill the phone keeps no record of.
    expect(standingOf(skill('rigging')!, [], [])).toBe('none');
    expect(standingOf(skill('rigging')!, [], a.passport.attestations)).toBe('competent');
  });

  test('the summary counts each standing', () => {
    const p = attest(emptyPassport(), { skill: 'orientation', by: 'J. Ruiz', role: 'Instructor', sig: SIG, project: '', note: '' }, T).passport;
    const xs = standings(records(), p);
    expect(standingSummary(xs)).toBe(`1 signed off · 7 started of ${SKILLS.length}`);
    expect(standingSummary(standings({}, emptyPassport()))).toBe(`Nothing yet of ${SKILLS.length} skills`);
  });
});

describe('sign-offs', () => {
  test('need a name and a signature; stored and read back; damage dropped', () => {
    expect(attest(emptyPassport(), { skill: 'boltup', by: ' ', role: 'Foreman', sig: SIG, project: '', note: '' }, T).ok).toBe(false);
    expect(attest(emptyPassport(), { skill: 'boltup', by: 'J. Ruiz', role: 'Foreman', sig: '', project: '', note: '' }, T).ok).toBe(false);
    const a = attest(emptyPassport(), { skill: 'boltup', by: '  J.  Ruiz ', role: 'QC', sig: SIG, project: ' bp-1 ', note: 'Clean pull-up on L-200' }, T);
    if (!a.ok) throw new Error(a.why);
    const b = attest(a.passport, { skill: 'hydro', by: 'K. Diaz', role: 'Foreman', sig: SIG, project: '', note: '' }, T + 1);
    if (!b.ok) throw new Error(b.why);
    expect(b.passport.attestations.map((x) => x.skill)).toEqual(['hydro', 'boltup']);
    expect(b.passport.attestations[1]).toMatchObject({ by: 'J. Ruiz', role: 'QC', project: 'bp-1', note: 'Clean pull-up on L-200' });
    const raw = JSON.parse(serialisePassport(b.passport));
    raw.attestations.push({ id: 'x', skill: 'flying', by: 'A', sig: SIG, at: T }, { ...raw.attestations[0], sig: '' }, { ...raw.attestations[0] });
    const back = parsePassport(JSON.stringify(raw));
    expect(back.attestations).toEqual(b.passport.attestations);
    expect(back.dropped).toBe(3);
    expect(parsePassport(JSON.stringify({ v: 9, attestations: [] })).foreign).toBe(true);
    expect(revoke(b.passport, b.id).attestations.map((x) => x.skill)).toEqual(['boltup']);
  });

  test('the record code is the same for the same sign-off and holder, and not otherwise', () => {
    const a = attest(emptyPassport(), { skill: 'boltup', by: 'J. Ruiz', role: 'Foreman', sig: SIG, project: '', note: '' }, T);
    if (!a.ok) throw new Error(a.why);
    const x = a.passport.attestations[0]!;
    expect(recordCode(x, 'A. Hand')).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(recordCode(x, 'A. Hand')).toBe(recordCode({ ...x, note: 'changed' }, 'a. hand'));
    expect(recordCode(x, 'A. Hand')).not.toBe(recordCode(x, 'B. Hand'));
    expect(recordCode(x, 'A. Hand')).not.toBe(recordCode({ ...x, at: x.at + 1 }, 'A. Hand'));
  });

  test('the passport is backed up with everything else, by sign-off id', () => {
    const spec = STORES.find((s) => s.key === 'pipefit.passport.v1');
    expect(spec?.field).toBe('attestations');
    expect(spec?.idOf({ id: 'at1' })).toBe('at1');
  });
});

describe('on paper', () => {
  test('the page leads with the holder and carries every sign-off with its code', () => {
    const p = attest(emptyPassport(), { skill: 'boltup', by: 'J. Ruiz', role: 'Foreman', sig: SIG, project: 'BP-1', note: 'Good' }, T).passport;
    const html = passportHtml({ holder: 'A. Hand', standings: standings(records(), p), today: '2026-10-07' });
    expect(html).toContain('Skills passport — A. Hand');
    expect(html).toContain(`1 of ${SKILLS.length} skills signed off · 1 sign-offs`);
    expect(html).toContain('<td>J. Ruiz</td><td>Foreman</td><td>10/6/2026</td><td>BP-1</td>');
    expect(html).toContain(recordCode(p.attestations[0]!, 'A. Hand'));
    expect(html).toContain('<svg');
    expect(html).toContain('<td>Flange bolt-up to pattern and torque</td><td>Introduction to Aboveground Pipe Installation</td><td class="r">3</td><td>Signed off</td><td class="r">1 of 10</td>');
  });
});
