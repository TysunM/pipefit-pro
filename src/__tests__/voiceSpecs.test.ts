import { readSpecs, specPatch, wallFor } from '../voice/specs';
import { localIntent } from '../voice/intent';
import { readVoice } from '../ai/voice';

const cur = { material: 'cs' as const, defaultNps: 2, wall: '40', defaultKind: 'LR' as const };

describe('specs, as said', () => {
  test('size, material and wall in one breath', () => {
    expect(readSpecs('1/2 inch stainless steel 40S')).toEqual({ nps: 0.5, material: 'ss316l', wall: '40S' });
    expect(readSpecs('half inch stainless schedule 40')).toEqual({ nps: 0.5, material: 'ss316l', wall: '40' });
    expect(readSpecs('6 inch chrome moly p22 schedule 80 long radius')).toEqual({ nps: 6, material: 'p22', wall: '80', elbow: 'LR' });
    expect(readSpecs('inch and a half 304 stainless 10 s')).toEqual({ nps: 1.5, material: 'ss304l', wall: '10S' });
    expect(readSpecs('chrome molly 9')).toEqual({ material: 'p9' });
    expect(readSpecs('4 inch pvc')).toEqual({ nps: 4, material: 'pvc' });
    expect(readSpecs('two inch hdpe dr 11')).toEqual({ nps: 2, material: 'hdpe', wall: 'DR11' });
    expect(readSpecs('set the specs to 8 inch carbon steel extra strong')).toEqual({ nps: 8, material: 'cs', wall: 'XS' });
    expect(readSpecs('teflon lined 3 inch')).toEqual({ material: 'ptfe', nps: 3 });
    expect(readSpecs('pvcb')).toEqual({ material: 'cpvc' });
    expect(readSpecs('short radius')).toEqual({ elbow: 'SR' });
    expect(readSpecs('2 inch stainless 40')).toEqual({ nps: 2, material: 'ss316l', wall: '40' });
  });

  test('not specs: a size alone, a tool, or anything with more in it', () => {
    expect(readSpecs('6 inch')).toBeNull();
    expect(readSpecs('flange bolt up 12 bolt')).toBeNull();
    expect(readSpecs("what's the wall of 2 inch stainless 40s")).toBeNull();
  });

  test('a spec command beats a tool name, and tools still open', () => {
    expect(localIntent('2 inch p91 schedule 160', null)).toEqual({ kind: 'specs', nps: 2, material: 'p91', wall: '160' });
    expect(localIntent('bolt up', null)).toEqual({ kind: 'open', route: 'FlangeBoltUp' });
  });
});

describe('specs, as set', () => {
  test('a wall is put in the material’s own terms', () => {
    expect(wallFor(['5S', '10S', '40S', '80S'], '40')).toBe('40S');
    expect(wallFor(['10', '40', '80'], '40S')).toBe('40');
    expect(wallFor(['DR11'], '40')).toBeNull();
  });

  test('what was not said is kept', () => {
    const r = specPatch(cur, { material: 'ss316l', wall: '40' });
    expect(r.patch).toEqual({ material: 'ss316l', defaultNps: 2, wall: '40S', defaultKind: 'LR', defaultSchedule: '40' });
    expect(r.said).toBe('2" Stainless 316L, 40S, long radius');
    expect(r.moved).toEqual([]);
  });

  test('changing material keeps the wall where it can, else the material’s usual one', () => {
    expect(specPatch({ ...cur, wall: '80' }, { material: 'p11' }).patch.wall).toBe('80');
    expect(specPatch(cur, { material: 'hdpe' }).patch.wall).toBe('DR11');
  });

  test('what cannot be had is moved, and said', () => {
    const r = specPatch(cur, { material: 'ductile', nps: 2 });
    expect(r.patch.defaultNps).toBe(3);
    expect(r.said).toMatch(/does not come in 2"/);
    const w = specPatch(cur, { material: 'pvc', wall: 'XXS' });
    expect(w.patch.wall).toBe('40');
    expect(w.said).toMatch(/PVC has no XXS/);
  });
});

test('Claude can set specs too', () => {
  expect(readVoice({ action: 'specs', say: 'ok', specMaterial: 'p91', specNps: 6, specWall: 'sch 80', specElbow: 'LR' })).toEqual({
    action: 'specs',
    say: 'ok',
    material: 'p91',
    nps: 6,
    elbow: 'LR',
  });
  expect(readVoice({ action: 'specs', say: 'ok', specWall: '80' })).toEqual({ action: 'specs', say: 'ok', wall: '80' });
  expect(readVoice({ action: 'specs', say: 'x' })).toEqual({ action: 'none', say: 'x' });
});
