import { MATERIALS, calcSchedule, material, pipeSpec, resolveSpec, sizesFor, wallLabel, wallsAt } from '../calc/materials';
import { PIPE_SIZES, pipeWeightPerFoot } from '../calc/pipe';

const close = (a: number, b: number, d = 0.01) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('every material is complete', () => {
  test('its usual wall is one it has, and every size it comes in has a wall', () => {
    for (const m of MATERIALS) {
      expect(m.walls).toContain(m.defaultWall);
      for (const nps of sizesFor(m)) expect(wallsAt(m.id, nps).length).toBeGreaterThan(0);
      expect(m.words.length).toBeGreaterThan(0);
    }
  });

  test('welded materials carry a weld reference; the rest say how they join', () => {
    for (const m of MATERIALS) {
      if (m.joining === 'butt-weld') expect(m.weld?.filler).toBeTruthy();
      else expect(m.weld).toBeUndefined();
    }
  });

  test('no wall is ever half the OD or more', () => {
    for (const m of MATERIALS)
      for (const nps of sizesFor(m))
        for (const w of wallsAt(m.id, nps)) {
          const s = pipeSpec(m.id, nps, w)!;
          expect(s.wall).toBeLessThan(s.od / 2);
          expect(s.id).toBeGreaterThan(0);
        }
  });
});

describe('carbon steel, B36.10', () => {
  test('agrees with the steel table and its weights', () => {
    for (const p of PIPE_SIZES)
      for (const sch of ['10', '40', '80'] as const) {
        const s = pipeSpec('cs', p.nps, sch)!;
        close(s.wall, p.wall[sch], 1e-9);
        close(s.lbPerFt, pipeWeightPerFoot(p.od, p.wall[sch]), 0.01);
      }
    close(pipeSpec('cs', 2, '40')!.lbPerFt, 3.65);
    close(pipeSpec('cs', 4, '40')!.lbPerFt, 10.79, 0.02);
  });

  test('STD is Sch 40 to 10" and 3/8" above; XS is Sch 80 to 8" and 1/2" above', () => {
    for (const p of PIPE_SIZES) {
      const std = pipeSpec('cs', p.nps, 'STD')!.wall;
      const xs = pipeSpec('cs', p.nps, 'XS')!.wall;
      if (p.nps <= 10) close(std, p.wall['40'], 0.002);
      else close(std, 0.375, 1e-9);
      if (p.nps <= 8) close(xs, p.wall['80'], 0.002);
      else close(xs, 0.5, 1e-9);
    }
  });

  test('heavier schedules are thicker, bar the XXS that is lighter than 160 from 8" up', () => {
    for (const p of PIPE_SIZES) {
      const w = (id: string) => pipeSpec('cs', p.nps, id)?.wall ?? NaN;
      expect(w('80')).toBeGreaterThan(w('40'));
      if (Number.isFinite(w('160'))) expect(w('160')).toBeGreaterThan(w('80'));
      if (Number.isFinite(w('XXS')) && p.nps < 8) expect(w('XXS')).toBeGreaterThan(w('160'));
    }
    expect(pipeSpec('cs', 3.5, '160')).toBeNull();
  });
});

describe('stainless, B36.19', () => {
  test('40S is Sch 40 to 10" and 80S is Sch 80 to 8"; above that they part company', () => {
    for (const p of PIPE_SIZES) {
      const s40 = pipeSpec('ss316l', p.nps, '40S')!.wall;
      const s80 = pipeSpec('ss316l', p.nps, '80S')!.wall;
      if (p.nps <= 10) close(s40, p.wall['40'], 0.002);
      if (p.nps <= 8) close(s80, p.wall['80'], 0.002);
    }
    close(pipeSpec('ss316l', 12, '40S')!.wall, 0.375, 1e-9);
    close(pipeSpec('cs', 12, '40')!.wall, 0.406, 1e-9);
  });

  test('S schedules thicken in order, and stainless weighs a little more than steel', () => {
    for (const p of PIPE_SIZES) {
      const w = (id: string) => pipeSpec('ss304l', p.nps, id)!.wall;
      expect(w('5S')).toBeLessThan(w('10S'));
      expect(w('10S')).toBeLessThan(w('40S'));
      expect(w('40S')).toBeLessThan(w('80S'));
    }
    const ratio = pipeSpec('ss316l', 2, '40S')!.lbPerFt / pipeSpec('cs', 2, '40')!.lbPerFt;
    expect(ratio).toBeGreaterThan(1.01);
    expect(ratio).toBeLessThan(1.03);
  });

  test('carbon steel has no S schedules, stainless no plain 40', () => {
    expect(pipeSpec('cs', 2, '40S')).toBeNull();
    expect(pipeSpec('ss316l', 2, '40')).toBeNull();
  });
});

describe('iron is not on the steel OD', () => {
  test('cast iron soil (CISPI 301) and ductile (C151)', () => {
    close(pipeSpec('ci-soil', 4, 'CISPI')!.od, 4.38, 1e-9);
    close(pipeSpec('ductile', 4, 'PC')!.od, 4.8, 1e-9);
    close(pipeSpec('ductile', 6, 'TC52')!.wall, 0.34, 1e-9);
    expect(sizesFor(material('ci-soil'))).toContain(15);
    expect(pipeSpec('ductile', 2, 'PC')).toBeNull();
  });
});

describe('plastics', () => {
  test('PVC and CPVC are the steel 40 and 80 walls, a fifth of the weight', () => {
    const pvc = pipeSpec('pvc', 2, '40')!;
    close(pvc.wall, 0.154, 1e-9);
    expect(pvc.lbPerFt / pipeSpec('cs', 2, '40')!.lbPerFt).toBeLessThan(0.2);
  });

  test('HDPE wall is the OD over the DR', () => {
    close(pipeSpec('hdpe', 4, 'DR11')!.wall, 4.5 / 11, 1e-9);
  });

  test('plastics grow far more with heat than steel', () => {
    expect(material('hdpe').expansion).toBeGreaterThan(10 * material('cs').expansion);
    expect(material('pvc').expansion).toBeGreaterThan(4 * material('cs').expansion);
  });
});

describe('a spec that exists', () => {
  test('a size the material lacks moves to the nearest; a wall it lacks falls back', () => {
    expect(resolveSpec('ductile', 2, 'PC')).toEqual({ material: 'ductile', nps: 3, wall: 'PC' });
    expect(resolveSpec('ss316l', 2, '40')).toEqual({ material: 'ss316l', nps: 2, wall: '10S' });
    expect(resolveSpec('nonsense', 2, '40')).toEqual({ material: 'cs', nps: 2, wall: '40' });
    expect(resolveSpec('cs', 3.5, '160')).toEqual({ material: 'cs', nps: 3.5, wall: '40' });
  });

  test('the calculators get the nearest steel schedule', () => {
    expect(calcSchedule('40S')).toBe('40');
    expect(calcSchedule('10S')).toBe('10');
    expect(calcSchedule('XXS')).toBe('80');
    expect(wallLabel('DR11')).toBe('DR 11');
    expect(wallLabel('40')).toBe('SCH 40');
  });
});
