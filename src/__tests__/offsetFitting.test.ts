import { JOINT_ANGLES, jointHasGap, offsetElbow, offsetJoint } from '../calc/offsetFitting';
import { DEFAULT_TAKEOFF_OPTIONS, endTakeout } from '../calc/takeoffCatalog';
import { solveOffset } from '../calc/offset';
import { solveRolling } from '../calc/rolling';
import { takeoff } from '../calc/pipe';
import { solveCutLength } from '../calc/cutLength';

const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);
const BASE = { gap: 0, nps: 2, kind: 'LR' as const, schedule: '40' as const };
/** A fitting library holding a 2" PVC 45 at 1-3/4 and a 2" no-hub 1/16 bend at 2-1/2, and nothing else. */
const library = (id: string, nps: number) => (nps === 2 ? ({ sock45: 1.75, nh116: 2.5, nh18: 3 } as Record<string, number>)[id] : undefined);

describe('the joint an offset is made with follows the material', () => {
  test('steel and stainless butt weld, galvanised screwed, PVC and CPVC socket, soil pipe no-hub', () => {
    expect(offsetJoint('cs')).toBe('welded');
    expect(offsetJoint('ss316l')).toBe('welded');
    expect(offsetJoint('p91')).toBe('welded');
    expect(offsetJoint('galv')).toBe('screwed');
    expect(offsetJoint('pvc')).toBe('socket');
    expect(offsetJoint('cpvc')).toBe('socket');
    expect(offsetJoint('ci-soil')).toBe('nohub');
  });
  test('a gap comes off a weld and a no-hub stop, never a screwed or socket joint', () => {
    expect(jointHasGap('welded')).toBe(true);
    expect(jointHasGap('nohub')).toBe(true);
    expect(jointHasGap('screwed')).toBe(false);
    expect(jointHasGap('socket')).toBe(false);
  });
});

describe('what each elbow takes out', () => {
  test('butt weld: the handbook at 45, the bend radius when cut to 30', () => {
    expect(offsetElbow('welded', 2, 'LR', 45)).toMatchObject({ ok: true, value: 1.375, note: 'Handbook 2-42' });
    const cut = offsetElbow('welded', 2, 'LR', 30);
    expect(cut).toMatchObject({ ok: true, note: 'Cut elbow, bend radius' });
    if (cut.ok) near(cut.value, takeoff(2, 'LR', 30));
  });
  test('screwed: the handbook screwed elbow at 90 and 45, and no other angle', () => {
    const s90 = offsetElbow('screwed', 2, 'LR', 90);
    const s45 = offsetElbow('screwed', 2, 'LR', 45);
    expect(s90.ok && s90.value).toBe(endTakeout('screwed90', 2, DEFAULT_TAKEOFF_OPTIONS));
    expect(s45.ok && s45.value).toBe(endTakeout('screwed45', 2, DEFAULT_TAKEOFF_OPTIONS));
    expect(offsetElbow('screwed', 2, 'LR', 30)).toMatchObject({ ok: false, error: expect.stringMatching(/made at 45° and 90°/) });
  });
  test('socket and no-hub: the fitting library, and what to set when it holds nothing', () => {
    expect(offsetElbow('socket', 2, 'LR', 45, library)).toMatchObject({ ok: true, value: 1.75, note: 'Your fitting library: 45° elbow' });
    expect(offsetElbow('socket', 2, 'LR', 90, library)).toMatchObject({ ok: false, fitting: 'sock90', error: expect.stringMatching(/Set the 2" 90° elbow takeout/) });
    expect(offsetElbow('socket', 2, 'LR', 22.5, library)).toMatchObject({ ok: false, error: expect.stringMatching(/made at 45° and 90°/) });
    expect(offsetElbow('nohub', 2, 'LR', 22.5, library)).toMatchObject({ ok: true, value: 2.5 });
    expect(offsetElbow('nohub', 2, 'LR', 30, library)).toMatchObject({ ok: false });
    expect(JOINT_ANGLES.nohub).toEqual([22.5, 45, 90]);
  });
});

describe('the offset screens with each joint', () => {
  const pick = (material: string) => (angle: number) => offsetElbow(offsetJoint(material), 2, 'LR', angle, library);
  test('a 12 inch galvanised offset at 45: two screwed 45s, made up tight, as Cut Length', () => {
    const r = solveOffset({ ...BASE, offset: 12, fittingAngle: 45, lockRun: false, elbow: pick('galv') });
    const s45 = endTakeout('screwed45', 2, DEFAULT_TAKEOFF_OPTIONS);
    near(r.pipeCut, 12 * Math.SQRT2 - 2 * s45);
    expect(r.setbackNote).toBe('Screwed, handbook 4-39');
    const cut = solveCutLength({ centerToCenter: r.travel, endA: 'screwed45', endB: 'screwed45', customA: NaN, customB: NaN, ...BASE });
    near(cut.pipeCut, r.pipeCut);
  });
  test('a PVC offset at 45 takes the library\'s 45; at 90, with none set, it says to set one', () => {
    near(solveOffset({ ...BASE, offset: 12, fittingAngle: 45, lockRun: false, elbow: pick('pvc') }).pipeCut, 12 * Math.SQRT2 - 2 * 1.75);
    const none = solveOffset({ ...BASE, offset: 12, fittingAngle: 90, lockRun: false, elbow: pick('pvc') });
    expect(none.valid).toBe(false);
    expect(none.needsLibrary).toBe('sock90');
    expect(none.error).toMatch(/takeout below/);
  });
  test('a galvanised offset solved from a run lands on an angle no screwed elbow is made at, and says so', () => {
    const r = solveOffset({ ...BASE, offset: 12, run: 30, fittingAngle: NaN, lockRun: true, elbow: pick('galv') });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Set the angle/);
  });
  test('a no-hub rolling offset at 22.5 with its stop: the library bend and the stop at each coupling', () => {
    const r = solveRolling({ ...BASE, gap: 0.125, rise: 12, roll: 9, useFittingAngle: true, fittingAngle: 22.5, elbow: pick('ci-soil') });
    near(r.trueOffset, 15);
    near(r.pipeCut, r.travel - 2 * 2.5 - 2 * 0.125);
    expect(r.setbackNote).toBe('Your fitting library: 1/16 bend');
  });
  test('given no joint, a solver works butt weld elbows, as before', () => {
    near(solveOffset({ ...BASE, offset: 12, fittingAngle: 45, lockRun: false }).setback, 1.375);
  });
});
