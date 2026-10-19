import { LARGE_CLASSES, gasketWords, isLargeClass, largeClassOf, largeFlange, largeNumber, largeSizes, largeStuds, largeWords, ringGasket, seriesFor, seriesOf } from '../calc/largeFlange';
import { referenceTorque, studLabel, threadsPerInch } from '../calc/steelFlange';
import { classWords, jointFlange, newJoint, parseRegister, serialiseRegister, putJoint, emptyRegister } from '../state/register';
import { fromSpec, newSpec, targetTorque } from '../state/boltingSpec';
import { jointRecordHtml } from '../print/jointRecord';

const T = Date.UTC(2026, 9, 18, 12);

describe('the B16.47 bolting tables', () => {
  it('run 26" to 60" in twos, to 48" in class 900', () => {
    for (const c of LARGE_CLASSES) {
      const sizes = largeSizes(c);
      expect(sizes[0]).toBe(26);
      expect(sizes.at(-1)).toBe(c === 'A900' || c === 'B900' ? 48 : 60);
      for (let i = 1; i < sizes.length; i++) expect(sizes[i]! - sizes[i - 1]!).toBe(2);
    }
  });

  it('always has a stud count in fours, twenty and up, on a stud 3/4" to 4"', () => {
    for (const c of LARGE_CLASSES) for (const n of largeSizes(c)) {
      const f = largeFlange(n, c)!;
      expect(f.bolts % 4).toBe(0);
      expect(f.bolts).toBeGreaterThanOrEqual(20);
      expect(f.stud).toBeGreaterThanOrEqual(0.75);
      expect(f.stud).toBeLessThanOrEqual(4);
      expect(f.series).toBe(seriesOf(c));
      expect(Number.isFinite(threadsPerInch(f.stud))).toBe(true);
    }
  });

  it('matches the published tables where they were checked against each other', () => {
    expect(largeFlange(26, 'A150')).toMatchObject({ bolts: 24, stud: 1.25 });
    expect(largeFlange(36, 'A150')).toMatchObject({ bolts: 32, stud: 1.5 });
    expect(largeFlange(60, 'A150')).toMatchObject({ bolts: 52, stud: 1.75 });
    expect(largeFlange(26, 'A300')).toMatchObject({ bolts: 28, stud: 1.625 });
    // From 38" the Series A class 300 drilling changes: more, smaller studs than 36".
    expect(largeFlange(36, 'A300')).toMatchObject({ bolts: 32, stud: 2 });
    expect(largeFlange(38, 'A300')).toMatchObject({ bolts: 32, stud: 1.5 });
    expect(largeFlange(60, 'A300')).toMatchObject({ bolts: 32, stud: 2.25 });
    expect(largeFlange(26, 'A600')).toMatchObject({ bolts: 28, stud: 1.875 });
    expect(largeFlange(48, 'A600')).toMatchObject({ bolts: 32, stud: 2.75 });
    expect(largeFlange(60, 'A600')).toMatchObject({ bolts: 28, stud: 3.5 });
    expect(largeFlange(26, 'A400')).toMatchObject({ bolts: 28, stud: 1.75 });
    expect(largeFlange(36, 'A400')).toMatchObject({ bolts: 32, stud: 2 });
    expect(largeFlange(60, 'A400')).toMatchObject({ bolts: 32, stud: 2.75 });
    expect(largeFlange(26, 'B400')).toMatchObject({ bolts: 28, stud: 1.375 });
    expect(largeFlange(28, 'B400')).toMatchObject({ bolts: 24, stud: 1.5 });
    expect(largeFlange(26, 'B600')).toMatchObject({ bolts: 28, stud: 1.625 });
    expect(largeFlange(34, 'B600')).toMatchObject({ bolts: 24, stud: 2.25 });
    expect(largeFlange(60, 'B600')).toMatchObject({ bolts: 28, stud: 3.5 });
    expect(largeFlange(26, 'B900')).toMatchObject({ bolts: 20, stud: 2.5 });
    expect(largeFlange(36, 'B900')).toMatchObject({ bolts: 24, stud: 3 });
    expect(largeFlange(48, 'B900')).toMatchObject({ bolts: 24, stud: 4 });
    expect(largeFlange(26, 'A900')).toMatchObject({ bolts: 20, stud: 2.75 });
    expect(largeFlange(48, 'A900')).toMatchObject({ bolts: 24, stud: 4 });
    expect(largeFlange(26, 'B150')).toMatchObject({ bolts: 36, stud: 0.75 });
    expect(largeFlange(36, 'B150')).toMatchObject({ bolts: 44, stud: 0.875 });
    expect(largeFlange(46, 'B150')).toMatchObject({ bolts: 40, stud: 1.125 });
    expect(largeFlange(60, 'B150')).toMatchObject({ bolts: 52, stud: 1.25 });
    expect(largeFlange(26, 'B300')).toMatchObject({ bolts: 32, stud: 1.25 });
    expect(largeFlange(36, 'B300')).toMatchObject({ bolts: 32, stud: 1.375 });
    expect(largeFlange(60, 'B300')).toMatchObject({ bolts: 40, stud: 2.25 });
  });

  it('the two series are two drillings of the same flange', () => {
    expect(largeFlange(36, 'A150')!.bolts).toBe(32);
    expect(largeFlange(36, 'B150')!.bolts).toBe(44);
    expect(largeFlange(36, 'A150')!.stud).toBeGreaterThan(largeFlange(36, 'B150')!.stud);
  });

  it('in classes 400, 600 and 900 the two series are drilled the same from 38" up, and differently below', () => {
    for (const n of ['400', '600', '900'] as const) {
      const a = largeSizes(`A${n}`).map((s) => largeFlange(s, `A${n}`)!);
      const b = largeSizes(`B${n}`).map((s) => largeFlange(s, `B${n}`)!);
      expect(a.map((f) => f.nps)).toEqual(b.map((f) => f.nps));
      const same = (i: number) => a[i]!.bolts === b[i]!.bolts && a[i]!.stud === b[i]!.stud;
      for (let i = 0; i < a.length; i += 1) if (a[i]!.nps >= 38) expect(same(i)).toBe(true);
      // Below 38" they are their own drillings; a size or two may coincide (30" class 900 does).
      expect(a.filter((f, i) => f.nps < 38 && !same(i)).length).toBeGreaterThanOrEqual(4);
    }
    for (const n of ['150', '300'] as const) {
      const [a, b] = [largeFlange(48, `A${n}`)!, largeFlange(48, `B${n}`)!];
      expect(a.bolts === b.bolts && a.stud === b.stud).toBe(false);
    }
  });

  it('names the gasket by its series, with figures where the table has them', () => {
    expect(ringGasket(36, 'A150')).toEqual({ id: 36, od: 41.25 });
    expect(ringGasket(60, 'A150')).toEqual({ id: 60, od: 67.5 });
    expect(ringGasket(36, 'B150')).toBeUndefined();
    expect(ringGasket(36, 'A300')).toBeUndefined();
    expect(gasketWords(36, 'A150')).toBe('Gasket to ASME B16.20 (spiral wound) or B16.21 (flat ring) for B16.47 Series A, NPS 36 class 150; a Series B gasket does not fit. Flat ring 36" bore × 41-1/4" outside.');
    expect(gasketWords(36, 'B300')).toBe('Gasket to ASME B16.20 (spiral wound) or B16.21 (flat ring) for B16.47 Series B, NPS 36 class 300; a Series A gasket does not fit.');
  });

  it('knows which series a class is tabled in, and nothing it was not asked for', () => {
    expect(seriesFor('150')).toEqual(['A', 'B']);
    expect(seriesFor('400')).toEqual(['A', 'B']);
    expect(seriesFor('1500')).toEqual([]);
    expect(seriesFor('125')).toEqual([]);
    expect(seriesFor('75')).toEqual([]);
    expect(largeClassOf('B', '75')).toBeUndefined();
    expect(largeClassOf('A', '300')).toBe('A300');
    expect(isLargeClass('A75')).toBe(false);
    expect(isLargeClass('B150')).toBe(true);
    expect(largeFlange(27, 'A150')).toBeUndefined();
    expect(largeFlange(50, 'A900')).toBeUndefined();
    expect(largeNumber('A900')).toBe('900');
    expect(largeWords('B300')).toBe('B16.47 Series B class 300');
    expect(largeStuds(largeFlange(36, 'A150')!)).toBe('32 × 1-1/2" studs');
    expect(studLabel(1.375)).toBe('1-3/8"');
    expect(studLabel(3.25)).toBe('3-1/4"');
  });
});

describe('a large flange on a joint', () => {
  const large = newJoint('j1', { cls: 'A150', nps: 36, bolts: 32, project: 'BP-1', tag: 'L-36' }, T);

  it('is described by its series and class, and survives the register', () => {
    expect(jointFlange(large)).toBe('36" OD · B16.47 Series A class 150 · 32 × 1-1/2" studs');
    expect(classWords('A150')).toBe('B16.47 Series A class 150');
    expect(classWords('150')).toBe('class 150');
    expect(classWords('125')).toBe('class 125 cast iron');
    const back = parseRegister(serialiseRegister(putJoint(emptyRegister(), large)));
    expect(back.dropped).toBe(0);
    expect(back.joints.find((j) => j.id === 'j1')?.cls).toBe('A150');
  });

  it('takes its torque from its own stud, and its class number\'s rule from the spec', () => {
    const spec = { ...newSpec('s1', T), stressKsi: 50, nutFactor: 0.16, byClass: { '150': { stressKsi: 40 } } };
    expect(targetTorque(spec, 'A150', 36)).toBe(Math.round(referenceTorque(1.5, 40_000, 0.16)));
    expect(targetTorque(spec, 'B150', 36)).toBe(Math.round(referenceTorque(0.875, 40_000, 0.16)));
    expect(targetTorque(spec, 'A900', 50)).toBeNull();
    // Class 600 has no rule of its own on this spec, so it is pulled to the spec's 50 ksi.
    expect(targetTorque(spec, 'A600', 50)).toBe(Math.round(referenceTorque(3, 50_000, 0.16)));
    expect(fromSpec(spec, 'A150', 36, 32).bolting.stressKsi).toBe(40);
  });

  it('is named with its studs on the joint record', () => {
    const html = jointRecordHtml({ joint: large, dateLine: 'Printed 18 Oct 2026', wrench: null, now: T });
    expect(html).toContain('36&quot; OD ASME B16.47 Series A class 150');
    expect(html).toContain('32 × 1-1/2&quot;, 8 threads per inch');
    expect(html).toContain('for B16.47 Series A, NPS 36 class 150; a Series B gasket does not fit. Flat ring 36&quot; bore × 41-1/4&quot; outside.');
  });
});
